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
