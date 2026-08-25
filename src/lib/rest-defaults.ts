import type { PlanObjective } from '@/data/planTemplates';
import { DEFAULT_REST_SETTINGS, type RestSettings } from '@/lib/rest-timer';

// X35b: przerwy domyślne WG CELU PLANU (decyzja właściciela 2026-08-25):
// peak_strength 180 s, build_muscle 120 s, fat_loss 60 s (maksimum), athletic 75 s
// dla przerw roboczych. Pozostałe dwa czasy proporcjonalnie, na siatce presetów
// RestSettingsCard: między ćwiczeniami ≈ 1,5 × robocza (siła przycięta do 240 s,
// największego presetu), po rozgrzewce = połowa roboczej. Czysty moduł, zero
// Firebase — zapis robi caller (rest-preferences.ts).

export interface RestDefaults {
  workingSeconds: number;
  betweenExercisesSeconds: number;
  warmupSeconds: number;
}

const BY_OBJECTIVE: Record<PlanObjective, RestDefaults> = {
  peak_strength: { workingSeconds: 180, betweenExercisesSeconds: 240, warmupSeconds: 90 },
  build_muscle: { workingSeconds: 120, betweenExercisesSeconds: 180, warmupSeconds: 60 },
  fat_loss: { workingSeconds: 60, betweenExercisesSeconds: 90, warmupSeconds: 30 },
  athletic: { workingSeconds: 75, betweenExercisesSeconds: 120, warmupSeconds: 45 },
};

const isObjective = (value: unknown): value is PlanObjective =>
  typeof value === 'string' && value in BY_OBJECTIVE;

/** Nieznany / brak celu = dotychczasowe domyślne (90 / 150 / 45). */
export const restDefaultsForObjective = (objective: string | null | undefined): RestDefaults => {
  if (isObjective(objective)) return { ...BY_OBJECTIVE[objective] };
  return {
    workingSeconds: DEFAULT_REST_SETTINGS.workingSeconds,
    betweenExercisesSeconds: DEFAULT_REST_SETTINGS.betweenExercisesSeconds,
    warmupSeconds: DEFAULT_REST_SETTINGS.warmupSeconds,
  };
};

/**
 * Ustawienia przerw PO udanym starcie cyklu. `null` = nie ruszać: user ustawił
 * własne (`custom: true`). W innym wypadku polecane dla celu; nadpisania per
 * ćwiczenie zostają (to osobna decyzja usera, nie "czas domyślny").
 */
export const restSettingsAfterCycleStart = (
  current: RestSettings | undefined,
  objective: string | null | undefined,
): RestSettings | null => {
  if (current?.custom === true) return null;
  return {
    ...restDefaultsForObjective(objective),
    perExercise: current?.perExercise ?? {},
    custom: false,
  };
};

/** Czy trzy czasy domyślne równają się polecanym dla celu (przycisk "Przywróć polecane"). */
export const isRecommendedRest = (settings: RestSettings, objective: string | null | undefined): boolean => {
  const rec = restDefaultsForObjective(objective);
  return settings.workingSeconds === rec.workingSeconds
    && settings.betweenExercisesSeconds === rec.betweenExercisesSeconds
    && settings.warmupSeconds === rec.warmupSeconds;
};
