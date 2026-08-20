// T20.1 (feedback 2026-08-20): semantyka wyboru zakresu jak na Booking.com.
// Czysta logika bez DOM-u: pierwszy klik ustawia początek, drugi (>= początku)
// ustawia koniec, klik przed początkiem restartuje początek, klik przy pełnym
// zakresie zaczyna nowy wybór. Daty jako ISO YYYY-MM-DD (porównania
// leksykograficzne = chronologiczne).

export interface DateRangeValue {
  from: string | null;
  to: string | null;
}

export const nextRangeSelection = (
  current: DateRangeValue,
  clickedISO: string,
): DateRangeValue => {
  if (!current.from || current.to) return { from: clickedISO, to: null };
  if (clickedISO < current.from) return { from: clickedISO, to: null };
  return { from: current.from, to: clickedISO };
};
