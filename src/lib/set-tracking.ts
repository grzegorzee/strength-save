// Typy śledzenia serii (Z105): jedno źródło prawdy o tym, JAK loguje się ćwiczenie.
// Brak pola = weight_reps (spójne z dotychczasowym zachowaniem), isBodyweight => bodyweight_reps.

export type TrackingType =
  | 'weight_reps'
  | 'bodyweight_reps'
  | 'duration'
  | 'weight_distance_duration'
  | 'assisted_bodyweight';

export type SetField = 'weight' | 'reps' | 'duration' | 'distance' | 'assist';

export const TRACKING_TYPES: TrackingType[] = [
  'weight_reps',
  'bodyweight_reps',
  'duration',
  'weight_distance_duration',
  'assisted_bodyweight',
];

export const isTrackingType = (value: unknown): value is TrackingType =>
  typeof value === 'string' && (TRACKING_TYPES as string[]).includes(value);

export interface TrackingSource {
  tracking?: TrackingType;
  isBodyweight?: boolean;
}

export const getTrackingType = (exercise: TrackingSource): TrackingType => {
  if (exercise.tracking) return exercise.tracking;
  return exercise.isBodyweight ? 'bodyweight_reps' : 'weight_reps';
};

const FIELDS_BY_TRACKING: Record<TrackingType, SetField[]> = {
  weight_reps: ['weight', 'reps'],
  bodyweight_reps: ['reps'],
  duration: ['duration'],
  weight_distance_duration: ['weight', 'distance', 'duration'],
  assisted_bodyweight: ['assist', 'reps'],
};

export const visibleSetFields = (tracking: TrackingType): SetField[] =>
  FIELDS_BY_TRACKING[tracking];

/** Sekundy -> "m:ss" (input czasu serii). 0/brak -> pusty string (pusty input). */
export const formatDurationSec = (sec?: number): string => {
  if (!sec || sec <= 0) return '';
  const minutes = Math.floor(sec / 60);
  const seconds = Math.round(sec % 60);
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
};

/** "m:ss" albo gołe sekundy -> sekundy. Śmieci/ujemne -> 0. */
export const parseDurationInput = (raw: string): number => {
  const trimmed = raw.trim();
  if (!trimmed) return 0;
  if (trimmed.includes(':')) {
    const [minPart, secPart] = trimmed.split(':');
    const minutes = parseInt(minPart, 10);
    const seconds = parseInt(secPart, 10);
    if (Number.isNaN(minutes) || Number.isNaN(seconds) || minutes < 0 || seconds < 0) return 0;
    return minutes * 60 + seconds;
  }
  const seconds = parseInt(trimmed, 10);
  return Number.isNaN(seconds) || seconds < 0 ? 0 : seconds;
};

/** Metry -> "400 m" albo "1.25 km" (wyświetlanie). 0/brak -> pusty string. */
export const formatDistanceM = (m?: number): string => {
  if (!m || m <= 0) return '';
  if (m < 1000) return `${Math.round(m)} m`;
  const km = Math.round((m / 1000) * 100) / 100;
  return `${km} km`;
};

/**
 * Etykieta serii w historii (Z105) — z ZAWARTOŚCI serii, nie z typu ćwiczenia
 * (historyczne dane nie znają trackingu). Domyślny format reps×weight bez zmian.
 */
export const formatHistorySetLabel = (
  set: { reps: number; weight: number; completed?: boolean; isWarmup?: boolean; durationSec?: number; distanceM?: number; assistWeight?: number },
  fmtWeight: (kg: number) => string,
  bodyweightLabel: string,
): string => {
  if ((set.assistWeight ?? 0) > 0) return `${set.reps}×-${fmtWeight(set.assistWeight!)}`;
  if ((set.durationSec ?? 0) > 0 || (set.distanceM ?? 0) > 0) {
    const parts = [
      set.weight > 0 ? fmtWeight(set.weight) : '',
      formatDistanceM(set.distanceM),
      formatDurationSec(set.durationSec),
    ].filter(Boolean);
    if (parts.length > 0) return parts.join(' · ');
  }
  return `${set.reps}×${set.weight > 0 ? fmtWeight(set.weight) : bodyweightLabel}`;
};
