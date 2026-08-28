import { describe, expect, it } from 'vitest';
// @ts-expect-error — moduł .mjs jest współdzielony z CLI release.
import { buildEnvironmentFingerprint, buildReleaseCandidateManifest, compareReleaseCandidateManifests, requiredReleaseInputPaths, selectReleaseInputPaths, validateReleaseCandidateManifest } from '../../scripts/release-candidate-manifest-helpers.mjs';

describe('release candidate manifest', () => {
  it('obejmuje źródła aplikacji, Functions i natywne, ale pomija buildy i prywatne artefakty', () => {
    expect(selectReleaseInputPaths([
      'src/main.tsx',
      'functions/src/index.ts',
      'ios/App/App/AppDelegate.swift',
      'ios/App/App/public/index.html',
      'android/app/src/main/java/app/MainActivity.kt',
      'android/app/src/main/assets/public/index.html',
      'android/capacitor.settings.gradle',
      'android/variables.gradle',
      'android/gradlew',
      'android/gradle/wrapper/gradle-wrapper.jar',
      'scripts/release-ios.sh',
      'private-audits/health.json',
      'node_modules/pkg/index.js',
      'dist/index.html',
      '../outside',
    ])).toEqual([
      'android/app/src/main/java/app/MainActivity.kt',
      'android/capacitor.settings.gradle',
      'android/gradle/wrapper/gradle-wrapper.jar',
      'android/gradlew',
      'android/variables.gradle',
      'functions/src/index.ts',
      'ios/App/App/AppDelegate.swift',
      'scripts/release-ios.sh',
      'src/main.tsx',
    ]);
  });

  it('jawnie zwraca ignorowane dokumenty release, aby generator nie zależał od git ls-files', () => {
    expect(requiredReleaseInputPaths()).toEqual(expect.arrayContaining([
      'AGENTS.md',
      'CLAUDE.md',
      'START.md',
      'DOCUMENTATION.md',
      'DECYZJE.md',
      'PLAN.md',
    ]));
  });

  it('wiąże efektywne VITE_* bez zapisywania wartości i niezależnie od kolejności', () => {
    const first = buildEnvironmentFingerprint('mobile', {
      VITE_PUBLIC_B: 'two',
      SECRET_NOT_EXPOSED: 'ignore-me',
      VITE_PUBLIC_A: 'one',
    });
    const second = buildEnvironmentFingerprint('mobile', {
      VITE_PUBLIC_A: 'one',
      VITE_PUBLIC_B: 'two',
    });

    expect(first).toEqual(second);
    expect(first.name).toBe('effective-vite-mobile');
    expect(first.sha256).toMatch(/^[0-9a-f]{64}$/);
    expect(JSON.stringify(first)).not.toContain('one');
    expect(JSON.stringify(first)).not.toContain('two');
    expect(buildEnvironmentFingerprint('mobile', { VITE_PUBLIC_A: 'changed' }).sha256)
      .not.toBe(first.sha256);
  });

  it('buduje deterministyczny hash niezależnie od kolejności plików i czasu', () => {
    const input = {
      baseCommit: 'a'.repeat(40),
      versions: { package: '1.0.0', iosMarketing: '1.0.0', iosBuild: '130', androidName: '1.0.0', androidCode: '42' },
      sourceFiles: [
        { path: 'src/b.ts', size: 2, mode: 0o644, sha256: 'b'.repeat(64), status: ' M' },
        { path: 'src/a.ts', size: 1, mode: 0o755, sha256: 'a'.repeat(64), status: '??' },
      ],
      environmentFingerprints: [{ name: '.env.mobile', sha256: 'c'.repeat(64) }],
      artifacts: [{ name: 'dist/index.html', size: 3, sha256: 'd'.repeat(64) }],
      evidence: { auditSha256: 'e'.repeat(64) },
    };

    const first = buildReleaseCandidateManifest({ ...input, generatedAt: '2026-08-28T10:00:00.000Z' });
    const second = buildReleaseCandidateManifest({
      ...input,
      generatedAt: '2026-08-29T10:00:00.000Z',
      sourceFiles: [...input.sourceFiles].reverse(),
    });

    expect(first.sourceFiles.map((file: { path: string }) => file.path)).toEqual(['src/a.ts', 'src/b.ts']);
    expect(first.candidateSha256).toBe(second.candidateSha256);
    expect(first.generatedAt).not.toBe(second.generatedAt);
    expect(validateReleaseCandidateManifest(first)).toEqual({ ok: true, reason: 'valid' });
  });

  it('odrzuca zmianę którejkolwiek wersji marketingowej z 1.0.0 oraz duplikaty ścieżek', () => {
    const base = buildReleaseCandidateManifest({
      generatedAt: '2026-08-28T10:00:00.000Z',
      baseCommit: 'a'.repeat(40),
      versions: { package: '1.0.0', iosMarketing: '1.0.0', iosBuild: '130', androidName: '1.0.0', androidCode: '42' },
      sourceFiles: [{ path: 'src/a.ts', size: 1, mode: 0o644, sha256: 'a'.repeat(64), status: ' M' }],
      environmentFingerprints: [],
      artifacts: [],
      evidence: { auditSha256: 'e'.repeat(64) },
    });

    expect(validateReleaseCandidateManifest({
      ...base,
      versions: { ...base.versions, androidName: '1.0.1' },
    })).toEqual({ ok: false, reason: 'marketing-version-must-remain-1.0.0' });

    expect(validateReleaseCandidateManifest({
      ...base,
      sourceFiles: [...base.sourceFiles, base.sourceFiles[0]],
    })).toEqual({ ok: false, reason: 'duplicate-source-path' });
  });

  it('odrzuca manifest po ręcznej zmianie hasha pliku lub candidateSha256', () => {
    const manifest = buildReleaseCandidateManifest({
      generatedAt: '2026-08-28T10:00:00.000Z',
      baseCommit: 'a'.repeat(40),
      versions: { package: '1.0.0', iosMarketing: '1.0.0', iosBuild: '130', androidName: '1.0.0', androidCode: '42' },
      sourceFiles: [{ path: 'src/a.ts', size: 1, mode: 0o644, sha256: 'a'.repeat(64), status: ' M' }],
      environmentFingerprints: [],
      artifacts: [],
      evidence: { auditSha256: 'e'.repeat(64) },
    });

    expect(validateReleaseCandidateManifest({
      ...manifest,
      sourceFiles: [{ ...manifest.sourceFiles[0], sha256: 'bad' }],
    })).toEqual({ ok: false, reason: 'invalid-source-hash' });

    expect(validateReleaseCandidateManifest({ ...manifest, candidateSha256: 'f'.repeat(64) }))
      .toEqual({ ok: false, reason: 'candidate-hash-mismatch' });
  });

  it('wiąże hash kandydata także z trybem wykonywalności pliku', () => {
    const input = {
      generatedAt: '2026-08-28T10:00:00.000Z',
      baseCommit: 'a'.repeat(40),
      versions: { package: '1.0.0', iosMarketing: '1.0.0', iosBuild: '130', androidName: '1.0.0', androidCode: '42' },
      sourceFiles: [{ path: 'scripts/release-ios.sh', size: 1, mode: 0o644, sha256: 'a'.repeat(64), status: 'modified' }],
      environmentFingerprints: [],
      artifacts: [],
      evidence: { auditSha256: 'e'.repeat(64) },
    };
    const nonExecutable = buildReleaseCandidateManifest(input);
    const executable = buildReleaseCandidateManifest({
      ...input,
      sourceFiles: [{ ...input.sourceFiles[0], mode: 0o755 }],
    });

    expect(nonExecutable.candidateSha256).not.toBe(executable.candidateSha256);
    expect(validateReleaseCandidateManifest(executable)).toEqual({ ok: true, reason: 'valid' });
  });

  it('weryfikator odrzuca zmienione źródło i artefakt bez zapisywania nowego manifestu', () => {
    const input = {
      baseCommit: 'a'.repeat(40),
      versions: { package: '1.0.0', iosMarketing: '1.0.0', iosBuild: '130', androidName: '1.0.0', androidCode: '42' },
      sourceFiles: [{ path: 'src/a.ts', size: 1, mode: 0o644, sha256: 'a'.repeat(64), status: 'modified' }],
      environmentFingerprints: [{ name: 'effective-vite-mobile', sha256: 'b'.repeat(64) }],
      artifacts: [{ name: 'dist/index.html', size: 3, sha256: 'c'.repeat(64) }],
      evidence: { auditSha256: 'd'.repeat(64) },
    };
    const expected = buildReleaseCandidateManifest({
      ...input,
      generatedAt: '2026-08-28T10:00:00.000Z',
    });
    const unchanged = buildReleaseCandidateManifest({
      ...input,
      generatedAt: '2026-08-29T10:00:00.000Z',
    });
    const changed = buildReleaseCandidateManifest({
      ...input,
      generatedAt: '2026-08-29T10:00:00.000Z',
      sourceFiles: [{ ...input.sourceFiles[0], size: 2, sha256: 'e'.repeat(64) }],
      artifacts: [{ ...input.artifacts[0], sha256: 'f'.repeat(64) }],
    });

    expect(compareReleaseCandidateManifests(expected, unchanged)).toEqual({ ok: true, mismatches: [] });
    expect(compareReleaseCandidateManifests(expected, changed)).toEqual({
      ok: false,
      mismatches: [
        'source:changed:src/a.ts',
        'artifact:changed:dist/index.html',
        'candidate-sha256',
      ],
    });
  });

  it('weryfikator wykrywa nowe i usunięte wejścia release', () => {
    const base = {
      generatedAt: '2026-08-28T10:00:00.000Z',
      baseCommit: 'a'.repeat(40),
      versions: { package: '1.0.0', iosMarketing: '1.0.0', iosBuild: '130', androidName: '1.0.0', androidCode: '42' },
      environmentFingerprints: [],
      artifacts: [],
      evidence: { auditSha256: 'd'.repeat(64) },
    };
    const expected = buildReleaseCandidateManifest({
      ...base,
      sourceFiles: [{ path: 'src/old.ts', size: 1, mode: 0o644, sha256: 'a'.repeat(64), status: 'tracked' }],
    });
    const current = buildReleaseCandidateManifest({
      ...base,
      sourceFiles: [{ path: 'src/new.ts', size: 1, mode: 0o644, sha256: 'b'.repeat(64), status: 'untracked' }],
    });

    expect(compareReleaseCandidateManifests(expected, current)).toEqual({
      ok: false,
      mismatches: [
        'source:missing:src/old.ts',
        'source:unexpected:src/new.ts',
        'candidate-sha256',
      ],
    });
  });
});
