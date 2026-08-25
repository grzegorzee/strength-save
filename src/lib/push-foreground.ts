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
  // X35c: push o rekordzie (serwer) dociera chwilę po zakończeniu treningu na
  // telefonie, gdy ekran treningu już pokazał toast PR — drugi toast to spam.
  // Poza ekranem treningu (rekord z Watcha/Garmina) toast ma sens.
  if (input.type === 'pr' && input.onWorkoutRoute) return false;
  return true;
};
