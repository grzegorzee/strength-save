// Gratulacja „+1" po zapisaniu treningu (X17D Z140).
//
// PUŁAPKA, dla której to w ogóle istnieje: `AppHeader` jest UKRYTY na trasach
// `/workout/*` (`Layout.tsx`, isFocusedFlow). W momencie kliknięcia „Zakończ
// trening" komponent z animacją nie jest zamontowany, więc nie ma czego animować.
// Zamiast liczyć na obecność komponentu, zapamiętujemy ostatnio POKAZANY licznik;
// nagłówek po powrocie na Dashboard porównuje go z aktualnym i dopiero wtedy świętuje.

export const CELEBRATION_STORAGE_KEY = 'fittracker_last_celebrated_workouts_v1';

const readLastSeen = (): number | null => {
  try {
    const raw = window.localStorage.getItem(CELEBRATION_STORAGE_KEY);
    if (raw === null) return null;
    const parsed = parseInt(raw, 10);
    return Number.isFinite(parsed) ? parsed : null;
  } catch {
    return null;
  }
};

const writeLastSeen = (count: number): void => {
  try {
    window.localStorage.setItem(CELEBRATION_STORAGE_KEY, String(count));
  } catch { /* localStorage niedostępne — pomijamy gratulację */ }
};

/**
 * Ile treningów doszło od ostatniego pokazania gratulacji. Zwraca 0, gdy nie ma
 * czego świętować. Wywołanie ZUŻYWA gratulację (drugi odczyt zwróci 0), więc
 * animacja nie powtórzy się przy każdym re-renderze nagłówka.
 *
 * Pierwsze uruchomienie zapisuje stan bez świętowania — user z historią 40
 * treningów nie ma dostać „+40" przy pierwszym otwarciu apki.
 */
export const consumeCelebration = (currentCount: number): number => {
  const lastSeen = readLastSeen();
  writeLastSeen(currentCount);
  if (lastSeen === null) return 0;
  return currentCount > lastSeen ? currentCount - lastSeen : 0;
};
