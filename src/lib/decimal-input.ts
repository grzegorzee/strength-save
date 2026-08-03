// Z178: wspólny parser pól dziesiętnych. Klawiatura numeryczna PL podaje
// PRZECINEK; input type="number" + `parseFloat(...) || 0` robił z tego cichą
// utratę danych (zapis 0 kg) albo NaN blokujący zapis pomiarów.
//
// Kontrakt: null = "nie zmieniaj stanu". NIGDY nie zamieniaj nieparsowalnego
// wejścia na 0 — to jest sedno fixu.

export const parseDecimalInput = (raw: string): number | null => {
  const s = raw.trim().replace(/\s/g, '').replace(',', '.');
  if (!s) return null;
  // Stan pośredni "47," / "47." — user jeszcze pisze; Number('47.') dałoby 47,
  // a chwilowy commit skoków wartości myli (i psuje kursor przy kontrolowanym polu).
  if (s.endsWith('.')) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
};

/** Wyświetlanie w polach: kanonicznie z kropką, bez ogona zer (47, 47.3). */
export const formatDecimalInput = (n: number, decimals = 1): string =>
  String(Number(n.toFixed(decimals)));
