/** Krótki opis toastu startu; bez osieroconego separatora przy pustym focusie. */
export const formatWorkoutStartedDescription = (dayName: string, focus: string): string =>
  [dayName.trim(), focus.trim()].filter(Boolean).join(' · ');
