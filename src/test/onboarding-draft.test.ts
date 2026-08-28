import { describe, expect, it, vi } from 'vitest';
import {
  ONBOARDING_DRAFT_TTL_MS,
  clearOnboardingDraft,
  readOnboardingDraft,
  writeOnboardingDraft,
  type OnboardingDraftStorage,
} from '@/lib/onboarding-draft';

const NOW = Date.UTC(2026, 7, 27, 12);

const memoryStorage = () => {
  const values = new Map<string, string>();
  const storage: OnboardingDraftStorage = {
    get: vi.fn(async ({ key }) => ({ value: values.get(key) ?? null })),
    set: vi.fn(async ({ key, value }) => { values.set(key, value); }),
    remove: vi.fn(async ({ key }) => { values.delete(key); }),
  };
  return { storage, values };
};

describe('onboarding draft', () => {
  it('przywraca wersjonowany szkic tylko dla właściwego UID', async () => {
    const { storage } = memoryStorage();
    const stored = await writeOnboardingDraft('u1', {
      phase: 'wizard',
      wizardStep: 4,
      name: '  Grzegorz  ',
      accentId: 'pulse',
      level: 'intermediate',
      objective: 'build_muscle',
      daysPerWeek: 4,
      trainingDays: ['friday', 'monday', 'friday', 'wednesday'],
    }, { storage, now: NOW });

    expect(stored).toEqual({
      version: 1,
      updatedAt: NOW,
      phase: 'wizard',
      wizardStep: 4,
      name: 'Grzegorz',
      accentId: 'pulse',
      level: 'intermediate',
      objective: 'build_muscle',
      daysPerWeek: 4,
      trainingDays: ['friday', 'monday', 'wednesday'],
    });
    await expect(readOnboardingDraft('u1', { storage, now: NOW + 1 })).resolves.toEqual(stored);
    await expect(readOnboardingDraft('u2', { storage, now: NOW + 1 })).resolves.toBeNull();
  });

  it('po 7 dniach usuwa przeterminowany szkic zamiast wskrzeszać stary wybór', async () => {
    const { storage } = memoryStorage();
    await writeOnboardingDraft('u1', { phase: 'preview', wizardStep: 6 }, { storage, now: NOW });

    await expect(readOnboardingDraft('u1', { storage, now: NOW + ONBOARDING_DRAFT_TTL_MS })).resolves.not.toBeNull();
    await expect(readOnboardingDraft('u1', { storage, now: NOW + ONBOARDING_DRAFT_TTL_MS + 1 })).resolves.toBeNull();
    await expect(readOnboardingDraft('u1', { storage, now: NOW + ONBOARDING_DRAFT_TTL_MS + 2 })).resolves.toBeNull();
  });

  it('sanityzuje niezaufany JSON i nigdy nie utrwala checkboxów ani dowodu zgód', async () => {
    const { storage, values } = memoryStorage();
    const raw = {
      phase: 'marketing',
      wizardStep: 99,
      name: `  ${'A'.repeat(100)}  `,
      accentId: '<script>',
      level: 'elite',
      objective: 'not-a-goal',
      daysPerWeek: 40,
      trainingDays: ['monday', 'invalid', 'monday'],
      templateId: ` ${'t'.repeat(150)} `,
      planName: ` ${'P'.repeat(80)} `,
      termsAccepted: true,
      privacyAccepted: true,
      healthConsent: true,
      consentSubmissionId: 'must-not-be-persisted',
    };

    const stored = await writeOnboardingDraft('u1', raw, { storage, now: NOW });
    expect(stored).toEqual({
      version: 1,
      updatedAt: NOW,
      phase: 'marketing',
      name: 'A'.repeat(80),
      trainingDays: ['monday'],
      templateId: 't'.repeat(120),
      planName: 'P'.repeat(60),
    });

    const serialized = values.get('strength-save:onboarding-draft:v1:u1') ?? '';
    expect(serialized).not.toMatch(/consent|accepted|privacy|health/i);
  });

  it('odrzuca nieznaną wersję, zły timestamp i uszkodzony JSON', async () => {
    const { storage, values } = memoryStorage();
    const key = 'strength-save:onboarding-draft:v1:u1';

    values.set(key, JSON.stringify({ version: 2, updatedAt: NOW, phase: 'wizard' }));
    await expect(readOnboardingDraft('u1', { storage, now: NOW })).resolves.toBeNull();

    values.set(key, JSON.stringify({ version: 1, updatedAt: NOW + 60_000, phase: 'wizard' }));
    await expect(readOnboardingDraft('u1', { storage, now: NOW })).resolves.toBeNull();

    values.set(key, '{broken');
    await expect(readOnboardingDraft('u1', { storage, now: NOW })).resolves.toBeNull();
  });

  it('awaria storage jest bezpieczna, a clear usuwa tylko szkic danego usera', async () => {
    const { storage } = memoryStorage();
    await writeOnboardingDraft('u1', { phase: 'wizard', wizardStep: 2 }, { storage, now: NOW });
    await writeOnboardingDraft('u2', { phase: 'wizard', wizardStep: 3 }, { storage, now: NOW });
    await clearOnboardingDraft('u1', { storage });
    await expect(readOnboardingDraft('u1', { storage, now: NOW })).resolves.toBeNull();
    await expect(readOnboardingDraft('u2', { storage, now: NOW })).resolves.not.toBeNull();

    const brokenStorage: OnboardingDraftStorage = {
      get: vi.fn(async () => { throw new DOMException('privacy mode'); }),
      set: vi.fn(async () => { throw new DOMException('quota'); }),
      remove: vi.fn(async () => { throw new DOMException('privacy mode'); }),
    };
    await expect(writeOnboardingDraft('u3', { phase: 'wizard' }, { storage: brokenStorage, now: NOW })).resolves.toBeNull();
    await expect(readOnboardingDraft('u3', { storage: brokenStorage, now: NOW })).resolves.toBeNull();
    await expect(clearOnboardingDraft('u3', { storage: brokenStorage })).resolves.toBeUndefined();
  });

  it('pusty UID nie tworzy współdzielonego szkicu', async () => {
    const { storage, values } = memoryStorage();
    await expect(writeOnboardingDraft('  ', { phase: 'wizard' }, { storage, now: NOW })).resolves.toBeNull();
    await expect(readOnboardingDraft('', { storage, now: NOW })).resolves.toBeNull();
    expect(values.size).toBe(0);
  });
});
