export type SeasonMedal = 'gold' | 'silver' | 'bronze';

// Medal sezonu (ukończonego cyklu) wg frekwencji (completionRate, 0-100).
// Progi: złoto >= 85%, srebro >= 65%, brąz >= 40%, poniżej — bez medalu.
export const medalForCompletionRate = (completionRate: number): SeasonMedal | null => {
  if (completionRate >= 85) return 'gold';
  if (completionRate >= 65) return 'silver';
  if (completionRate >= 40) return 'bronze';
  return null;
};
