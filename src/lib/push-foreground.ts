// Z146 (X18C): decyzja o toaście dla pusha w foregroundzie. Osobny moduł BEZ
// importów Firebase — czysta funkcja testowalna w jsdom (push-notifications.ts
// inicjalizuje Firebase przy imporcie).
//
// Poranny reminder (data.type='daily-reminder') nie pokazuje toastu, gdy user
// właśnie jest na ekranie treningu — przypominanie o czymś, co już robi, to spam.
// Systemowy banner w foregroundzie wyłączony osobno (presentationOptions bez
// 'alert' w capacitor.config.ts) — prezentację przejmuje w całości ten toast.

export const shouldShowForegroundPushToast = (input: {
  type?: string;
  onWorkoutRoute: boolean;
}): boolean => {
  if (input.type === 'daily-reminder' && input.onWorkoutRoute) return false;
  return true;
};
