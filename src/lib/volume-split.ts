import type { PrimaryMuscle } from '@/data/exercise-details';

// Fala 2 (2026-08-20, plan/summary.md par. 2.4): "Gdzie poszedł tonaż" —
// agregacja tonażu sesji po kategoriach mięśniowych biblioteki. Czysta funkcja
// bez Reacta; resolver kategorii wstrzykiwany (biblioteka → własne ćwiczenia →
// fallback primaryMuscle), żeby nie zmyślać grup dla nierozpoznanych nazw.

/** Kubełek "Inne": nierozpoznane kategorie + udziały <5% + nadmiar ponad limit. */
export const VOLUME_SPLIT_OTHER = 'other' as const;

/** Maksymalna liczba kubełków akcentowych (skala odcieni z tokens.md par. 2.3). */
export const VOLUME_SPLIT_MAX_BUCKETS = 5;

const MIN_SHARE_PCT = 5;

/** Fallback primaryMuscle (exercise-details) → kategoria biblioteki. */
export const primaryMuscleToCategory: Record<PrimaryMuscle, string> = {
  chest: 'chest',
  back: 'back',
  shoulders: 'shoulders',
  biceps: 'arms',
  triceps: 'arms',
  forearms: 'arms',
  quads: 'legs',
  hamstrings: 'legs',
  glutes: 'glutes',
  calves: 'calves',
  core: 'core',
  fullbody: VOLUME_SPLIT_OTHER,
};

export interface VolumeSplitItem {
  name: string;
  tonnageKg: number;
}

export interface VolumeSplitBucket {
  /** Kanoniczny klucz kategorii ('chest', 'back', ...) albo VOLUME_SPLIT_OTHER. */
  key: string;
  tonnageKg: number;
  /** Udział w tonażu sesji, 0-100 (nieokrąglony — szerokość segmentu). */
  pct: number;
}

export const computeVolumeSplit = (
  items: VolumeSplitItem[],
  resolveCategory: (name: string) => string | null,
): VolumeSplitBucket[] => {
  const withVolume = items.filter((item) => item.tonnageKg > 0);
  const total = withVolume.reduce((sum, item) => sum + item.tonnageKg, 0);
  if (total <= 0) return [];

  const byCategory = new Map<string, number>();
  withVolume.forEach((item) => {
    const key = resolveCategory(item.name) ?? VOLUME_SPLIT_OTHER;
    byCategory.set(key, (byCategory.get(key) ?? 0) + item.tonnageKg);
  });

  let otherKg = byCategory.get(VOLUME_SPLIT_OTHER) ?? 0;
  byCategory.delete(VOLUME_SPLIT_OTHER);

  const sorted = [...byCategory.entries()].sort((a, b) => b[1] - a[1]);
  const kept: VolumeSplitBucket[] = [];
  sorted.forEach(([key, tonnageKg], index) => {
    const pct = (tonnageKg / total) * 100;
    // Ogon (<5% albo ponad limit odcieni) spada do "Inne" — zero mikrosegmentów.
    if (index >= VOLUME_SPLIT_MAX_BUCKETS || pct < MIN_SHARE_PCT) {
      otherKg += tonnageKg;
      return;
    }
    kept.push({ key, tonnageKg, pct });
  });

  if (otherKg > 0) {
    kept.push({ key: VOLUME_SPLIT_OTHER, tonnageKg: otherKg, pct: (otherKg / total) * 100 });
  }
  return kept;
};
