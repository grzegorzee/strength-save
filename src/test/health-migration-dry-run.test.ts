import { describe, expect, it } from 'vitest';
// @ts-expect-error — moduł .mjs bez typów; testujemy czystą logikę skryptu operacyjnego.
import { buildHealthMigrationManifest, hasExplicitActiveHealthConsent, parseHealthDryRunArgs, pseudonymizeUid, validateHealthMigrationManifest } from '../../scripts/health-migration-dry-run-helpers.mjs';

const CURRENT_CONSENT = {
  healthGranted: true,
  healthVersion: '1.1',
  healthEpoch: 3,
  healthGrantId: 'grant-secret',
};

const subjects = [
  {
    uid: 'real-user-b',
    consent: CURRENT_CONSENT,
    documents: [
      {
        collection: 'strava_activities',
        path: 'strava_activities/real-activity-id',
        data: { userId: 'real-user-b', averageHeartrate: 151, calories: 540 },
      },
      {
        collection: 'workouts',
        path: 'workouts/private-workout-id',
        data: {
          userId: 'real-user-b',
          exercises: [
            { exerciseId: 'private-exercise', rpe: 8, pain: 2 },
            { exerciseId: 'base-only', sets: [{ reps: 5, weight: 100 }] },
          ],
        },
      },
    ],
  },
  {
    uid: 'real-user-a',
    consent: { healthGranted: true, healthVersion: '1.0' },
    documents: [
      {
        collection: 'measurements',
        path: 'measurements/private-date-id',
        data: {
          userId: 'real-user-a',
          weight: 81.2,
          photoPath: 'body-photos/real-user-a/private-photo.jpg',
          photoUrl: 'https://storage.invalid/private-token',
        },
      },
      {
        collection: 'users',
        path: 'users/real-user-a',
        data: { email: 'person@example.com', estimatedMaxHR: 191 },
      },
    ],
  },
];

describe('health migration dry-run — consent boundary', () => {
  it('kwalifikuje wyłącznie jawny, aktywny grant 1.1 z bezpieczną epoką i grantId', () => {
    expect(hasExplicitActiveHealthConsent(CURRENT_CONSENT)).toBe(true);
    expect(hasExplicitActiveHealthConsent({ ...CURRENT_CONSENT, healthVersion: '1.0' })).toBe(false);
    expect(hasExplicitActiveHealthConsent({ ...CURRENT_CONSENT, healthGranted: false })).toBe(false);
    expect(hasExplicitActiveHealthConsent({ ...CURRENT_CONSENT, healthEpoch: 0 })).toBe(false);
    expect(hasExplicitActiveHealthConsent({ ...CURRENT_CONSENT, healthEpoch: 1.5 })).toBe(false);
    expect(hasExplicitActiveHealthConsent({ ...CURRENT_CONSENT, healthGrantId: '' })).toBe(false);
  });

  it('tworzy stabilny pseudonim bez ujawnienia uid', () => {
    const ref = pseudonymizeUid('real-user-a');
    expect(ref).toMatch(/^subject-[a-f0-9]{16}$/);
    expect(ref).toBe(pseudonymizeUid('real-user-a'));
    expect(ref).not.toContain('real-user-a');
    expect(ref).not.toBe(pseudonymizeUid('real-user-b'));
  });
});

describe('health migration dry-run — manifest bez zapisu', () => {
  it('liczy health rekordy, ale nie emituje danych, tożsamości ani planu mutacji', () => {
    const manifest = buildHealthMigrationManifest({
      projectId: 'fittracker-workouts',
      generatedAt: '2026-08-28T10:00:00.000Z',
      subjects,
    });

    expect(manifest.mode).toBe('read-only');
    expect(manifest.mutationCount).toBe(0);
    expect(manifest.mutationPlan).toEqual([]);
    expect(manifest.blockers).toEqual([
      'EXPLICIT_CURRENT_CONSENT_REQUIRED',
      'TARGET_SCHEMA_NOT_APPROVED',
    ]);
    expect(manifest.totals).toMatchObject({
      subjects: 2,
      eligibleSubjects: 1,
      measurements: 1,
      workoutMetricItems: 1,
      activityHealthDocuments: 1,
      userHealthProfiles: 1,
      bodyPhotoReferences: 1,
      plannedTransformations: 4,
      blockedTransformations: 4,
    });

    const serialized = JSON.stringify(manifest);
    for (const secret of [
      'real-user-a',
      'real-user-b',
      'person@example.com',
      'private-workout-id',
      'private-exercise',
      'private-photo.jpg',
      'private-token',
      'grant-secret',
      '81.2',
      '151',
      '540',
      '191',
    ]) {
      expect(serialized).not.toContain(secret);
    }

    expect(validateHealthMigrationManifest(manifest)).toEqual({ ok: true });
  });

  it('nie auto-upgrade\u2019uje consent 1.0 i blokuje transformacje także dla 1.1 bez schematu docelowego', () => {
    const manifest = buildHealthMigrationManifest({
      projectId: 'fittracker-workouts',
      generatedAt: '2026-08-28T10:00:00.000Z',
      subjects,
    });
    const legacy = manifest.subjects.find((subject: { consentState: string }) => (
      subject.consentState === 'legacy-version'
    ));
    const active = manifest.subjects.find((subject: { consentState: string }) => (
      subject.consentState === 'active-current'
    ));

    expect(legacy.eligibleForFutureMigration).toBe(false);
    expect(legacy.transformations.every((item: { blocker: string }) => (
      item.blocker === 'EXPLICIT_CURRENT_CONSENT_REQUIRED'
    ))).toBe(true);
    expect(active.eligibleForFutureMigration).toBe(true);
    expect(active.transformations.every((item: { blocker: string }) => (
      item.blocker === 'TARGET_SCHEMA_NOT_APPROVED'
    ))).toBe(true);
  });

  it('ma deterministyczny checkpoint niezależny od kolejności wejścia i generatedAt', () => {
    const first = buildHealthMigrationManifest({
      projectId: 'fittracker-workouts',
      generatedAt: '2026-08-28T10:00:00.000Z',
      subjects,
    });
    const second = buildHealthMigrationManifest({
      projectId: 'fittracker-workouts',
      generatedAt: '2026-08-29T12:00:00.000Z',
      subjects: [...subjects].reverse().map((subject) => ({
        ...subject,
        documents: [...subject.documents].reverse(),
      })),
    });

    expect(second.checkpoint).toEqual(first.checkpoint);
    expect(second.manifestSha256).toEqual(first.manifestSha256);
  });

  it('wykrywa zmianę checkpointu oraz pola mogące ujawnić tożsamość', () => {
    const manifest = buildHealthMigrationManifest({
      projectId: 'fittracker-workouts',
      generatedAt: '2026-08-28T10:00:00.000Z',
      subjects,
    });
    const tampered = structuredClone(manifest);
    tampered.checkpoint.sha256 = '0'.repeat(64);
    expect(validateHealthMigrationManifest(tampered)).toEqual({
      ok: false,
      reason: 'CHECKPOINT_MISMATCH',
    });

    const leaking = structuredClone(manifest);
    leaking.subjects[0].email = 'person@example.com';
    expect(validateHealthMigrationManifest(leaking)).toEqual({
      ok: false,
      reason: 'SENSITIVE_FIELD_IN_MANIFEST:email',
    });
  });
});

describe('health migration dry-run — powierzchnia CLI', () => {
  it('akceptuje tylko lokalny output i nie ma trybu apply/write', () => {
    expect(parseHealthDryRunArgs([])).toEqual({ output: null });
    expect(parseHealthDryRunArgs(['--output', 'private-audits/test.json'])).toEqual({
      output: 'private-audits/test.json',
    });
    expect(() => parseHealthDryRunArgs(['apply'])).toThrow('INVALID_ARGUMENT:apply');
    expect(() => parseHealthDryRunArgs(['--write', 'true'])).toThrow('INVALID_ARGUMENT:--write');
  });
});
