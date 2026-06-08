// Parser zapisów timera interwałowego z planów (RZA). Rozpoznaje:
//   EMOM n        → co minutę, n rund (np. "EMOM 8" = 8 rund po 60 s)
//   E{k}MOM x{n}  → co k minut, n rund (np. "E4MOM x5" = 5 rund po 240 s)
//   AMRAP n       → pojedynczy blok n minut (rób ile zdążysz)
// Sufiksy typu "alt" są ignorowane. Zwraca null gdy zapis nie jest interwałem —
// wtedy karta ćwiczenia używa zwykłego timera przerwy.

export type IntervalKind = 'emom' | 'amrap';

export interface IntervalSpec {
  kind: IntervalKind;
  /** Długość jednej rundy w sekundach (dla AMRAP = cały blok). */
  intervalSec: number;
  /** Liczba rund (AMRAP = 1). */
  rounds: number;
  /** Łączny czas w sekundach. */
  totalSec: number;
  /** Znormalizowana etykieta do wyświetlenia. */
  label: string;
}

export const parseIntervalTimer = (spec?: string): IntervalSpec | null => {
  if (!spec) return null;
  const s = spec.trim();

  // AMRAP n
  const amrap = /AMRAP\s*(\d+)/i.exec(s);
  if (amrap) {
    const min = Number(amrap[1]);
    if (min > 0) {
      const total = min * 60;
      return { kind: 'amrap', intervalSec: total, rounds: 1, totalSec: total, label: `AMRAP ${min}` };
    }
  }

  // E{k}MOM x{n}  (k = minuty interwału, n = rundy)
  const exmom = /E\s*(\d+)\s*MOM\s*[x×]\s*(\d+)/i.exec(s);
  if (exmom) {
    const k = Number(exmom[1]);
    const n = Number(exmom[2]);
    if (k > 0 && n > 0) {
      const iv = k * 60;
      return { kind: 'emom', intervalSec: iv, rounds: n, totalSec: iv * n, label: `E${k}MOM × ${n}` };
    }
  }

  // EMOM n  (interwał 1 min, n rund)
  const emom = /\bEMOM\s*(\d+)/i.exec(s);
  if (emom) {
    const n = Number(emom[1]);
    if (n > 0) {
      return { kind: 'emom', intervalSec: 60, rounds: n, totalSec: 60 * n, label: `EMOM ${n}` };
    }
  }

  return null;
};
