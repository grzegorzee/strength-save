import { Preferences } from '@capacitor/preferences';
import type { Weekday } from '@/data/trainingPlan';

export const ONBOARDING_DRAFT_VERSION = 1 as const;
export const ONBOARDING_DRAFT_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export type OnboardingDraftPhase = 'wizard' | 'marketing' | 'preview';
export type OnboardingDraftLevel = 'beginner' | 'intermediate' | 'advanced';
export type OnboardingDraftObjective = 'build_muscle' | 'peak_strength' | 'fat_loss' | 'athletic';
export type OnboardingDraftPlanSource = 'recommended' | 'browsed' | 'custom';

/**
 * Wyłącznie odtwarzalny stan UX kreatora. Zgody prawne nie są częścią szkicu:
 * ich jedynym źródłem prawdy pozostaje serwerowy recordConsent z timestampem.
 */
export interface OnboardingDraftV1 {
  version: typeof ONBOARDING_DRAFT_VERSION;
  updatedAt: number;
  phase: OnboardingDraftPhase;
  wizardStep?: number;
  name?: string;
  accentId?: string;
  level?: OnboardingDraftLevel;
  objective?: OnboardingDraftObjective;
  daysPerWeek?: number;
  trainingDays?: Weekday[];
  templateId?: string;
  recommendedTemplateId?: string;
  planSource?: OnboardingDraftPlanSource;
  durationWeeks?: number;
  startDate?: string;
  firstWorkoutDate?: string;
  planName?: string;
}

export type OnboardingDraftInput = Omit<OnboardingDraftV1, 'version' | 'updatedAt'>;

/** Minimalny kontrakt zgodny z @capacitor/preferences i prosty do mockowania. */
export interface OnboardingDraftStorage {
  get(options: { key: string }): Promise<{ value: string | null }>;
  set(options: { key: string; value: string }): Promise<void>;
  remove(options: { key: string }): Promise<void>;
}

interface DraftOptions {
  storage?: OnboardingDraftStorage;
  /** Milisekundy epoch; wstrzykiwane w testach, aby TTL był deterministyczny. */
  now?: number;
}

const PHASES = new Set<OnboardingDraftPhase>(['wizard', 'marketing', 'preview']);
const LEVELS = new Set<OnboardingDraftLevel>(['beginner', 'intermediate', 'advanced']);
const OBJECTIVES = new Set<OnboardingDraftObjective>(['build_muscle', 'peak_strength', 'fat_loss', 'athletic']);
const PLAN_SOURCES = new Set<OnboardingDraftPlanSource>(['recommended', 'browsed', 'custom']);
const WEEKDAYS = new Set<Weekday>([
  'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday',
]);
const ID_RE = /^[a-z0-9][a-z0-9._:-]*$/i;
const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

const keyFor = (uid: string): string | null => {
  const normalized = uid.trim();
  if (!normalized || normalized.length > 256) return null;
  return `strength-save:onboarding-draft:v1:${encodeURIComponent(normalized)}`;
};

const finiteIntegerInRange = (value: unknown, min: number, max: number): number | undefined => (
  typeof value === 'number' && Number.isInteger(value) && value >= min && value <= max
    ? value
    : undefined
);

const trimmed = (value: unknown, maxLength: number): string | undefined => {
  if (typeof value !== 'string') return undefined;
  const result = value.trim().slice(0, maxLength);
  return result || undefined;
};

const identifier = (value: unknown, maxLength: number): string | undefined => {
  const result = trimmed(value, maxLength);
  return result && ID_RE.test(result) ? result : undefined;
};

const isoDate = (value: unknown): string | undefined => {
  if (typeof value !== 'string' || !ISO_DATE_RE.test(value)) return undefined;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value
    ? value
    : undefined;
};

const sanitizeTrainingDays = (value: unknown): Weekday[] | undefined => {
  if (!Array.isArray(value)) return undefined;
  const unique = value.filter((day): day is Weekday => typeof day === 'string' && WEEKDAYS.has(day as Weekday));
  const result = [...new Set(unique)].slice(0, 7);
  return result.length ? result : undefined;
};

const sanitizeInput = (value: unknown): OnboardingDraftInput | null => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const candidate = value as Record<string, unknown>;
  if (typeof candidate.phase !== 'string' || !PHASES.has(candidate.phase as OnboardingDraftPhase)) return null;

  const phase = candidate.phase as OnboardingDraftPhase;
  const wizardStep = finiteIntegerInRange(candidate.wizardStep, 1, 6);
  const name = trimmed(candidate.name, 80);
  const accentId = identifier(candidate.accentId, 64);
  const level = typeof candidate.level === 'string' && LEVELS.has(candidate.level as OnboardingDraftLevel)
    ? candidate.level as OnboardingDraftLevel
    : undefined;
  const objective = typeof candidate.objective === 'string' && OBJECTIVES.has(candidate.objective as OnboardingDraftObjective)
    ? candidate.objective as OnboardingDraftObjective
    : undefined;
  const daysPerWeek = finiteIntegerInRange(candidate.daysPerWeek, 2, 6);
  const trainingDays = sanitizeTrainingDays(candidate.trainingDays);
  const templateId = identifier(candidate.templateId, 120);
  const recommendedTemplateId = identifier(candidate.recommendedTemplateId, 120);
  const planSource = typeof candidate.planSource === 'string' && PLAN_SOURCES.has(candidate.planSource as OnboardingDraftPlanSource)
    ? candidate.planSource as OnboardingDraftPlanSource
    : undefined;
  const durationWeeks = finiteIntegerInRange(candidate.durationWeeks, 2, 36);
  const startDate = isoDate(candidate.startDate);
  const firstWorkoutDate = isoDate(candidate.firstWorkoutDate);
  const planName = trimmed(candidate.planName, 60);

  return {
    phase,
    ...(wizardStep !== undefined ? { wizardStep } : {}),
    ...(name ? { name } : {}),
    ...(accentId ? { accentId } : {}),
    ...(level ? { level } : {}),
    ...(objective ? { objective } : {}),
    ...(daysPerWeek !== undefined ? { daysPerWeek } : {}),
    ...(trainingDays ? { trainingDays } : {}),
    ...(templateId ? { templateId } : {}),
    ...(recommendedTemplateId ? { recommendedTemplateId } : {}),
    ...(planSource ? { planSource } : {}),
    ...(durationWeeks !== undefined ? { durationWeeks } : {}),
    ...(startDate ? { startDate } : {}),
    ...(firstWorkoutDate ? { firstWorkoutDate } : {}),
    ...(planName ? { planName } : {}),
  };
};

const adapter = (storage?: OnboardingDraftStorage): OnboardingDraftStorage => storage ?? Preferences;

const parseDraftValue = (value: string | null, now: number): OnboardingDraftV1 | null => {
  if (!value) return null;
  const parsed: unknown = JSON.parse(value);
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null;
  const candidate = parsed as Record<string, unknown>;
  const updatedAt = candidate.updatedAt;
  const input = sanitizeInput(candidate);
  const valid = candidate.version === ONBOARDING_DRAFT_VERSION
    && typeof updatedAt === 'number'
    && Number.isFinite(updatedAt)
    && Number.isInteger(updatedAt)
    && updatedAt >= 0
    && updatedAt <= now
    && input !== null;
  if (!valid || now - (updatedAt as number) > ONBOARDING_DRAFT_TTL_MS) return null;
  return { version: ONBOARDING_DRAFT_VERSION, updatedAt: updatedAt as number, ...input };
};

/** Synchroniczny boot wyłącznie dla webowego fallbacku oficjalnego pluginu. */
export function readOnboardingDraftFromWebStorage(uid: string, now = Date.now()): OnboardingDraftV1 | null {
  const key = keyFor(uid);
  if (!key || typeof window === 'undefined') return null;
  try {
    return parseDraftValue(window.localStorage.getItem(`CapacitorStorage.${key}`), now);
  } catch {
    return null;
  }
}

export async function readOnboardingDraft(uid: string, options: DraftOptions = {}): Promise<OnboardingDraftV1 | null> {
  const key = keyFor(uid);
  if (!key) return null;
  const storage = adapter(options.storage);
  const now = options.now ?? Date.now();

  try {
    const { value } = await storage.get({ key });
    const draft = parseDraftValue(value, now);
    if (value && !draft) {
      await storage.remove({ key });
      return null;
    }
    return draft;
  } catch {
    // Preferences/JSON może zawieść w trybie privacy lub przy uszkodzonym wpisie.
    // Onboarding pozostaje używalny; brak draftu oznacza bezpieczny start od UI.
    return null;
  }
}

export async function writeOnboardingDraft(
  uid: string,
  value: unknown,
  options: DraftOptions = {},
): Promise<OnboardingDraftV1 | null> {
  const key = keyFor(uid);
  const input = sanitizeInput(value);
  if (!key || !input) return null;

  const draft: OnboardingDraftV1 = {
    version: ONBOARDING_DRAFT_VERSION,
    updatedAt: options.now ?? Date.now(),
    ...input,
  };
  try {
    await adapter(options.storage).set({ key, value: JSON.stringify(draft) });
    return draft;
  } catch {
    // Best-effort: awaria storage nie może zablokować kreatora ani zapisu planu.
    return null;
  }
}

export async function clearOnboardingDraft(
  uid: string,
  options: Pick<DraftOptions, 'storage'> = {},
): Promise<void> {
  const key = keyFor(uid);
  if (!key) return;
  try {
    await adapter(options.storage).remove({ key });
  } catch {
    // Best-effort. TTL nadal gwarantuje, że osierocony szkic nie jest trwały.
  }
}
