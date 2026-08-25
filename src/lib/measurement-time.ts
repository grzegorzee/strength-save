import { parseLocalDateSafe } from '@/lib/utils';

// WP-M: mapowanie data + godzina (input type="time", "HH:MM") <-> recordedAt
// (epoch ms w czasie LOKALNYM). Jedno miejsce, żeby edycja daty i godziny
// dawała ten sam epoch, który zapisałby addMeasurement o tej porze.

const TIME_RE = /^(\d{2}):(\d{2})$/;

/** Epoch ms -> "HH:MM" w czasie lokalnym (wartość dla input type="time"). */
export const recordedAtToTimeInput = (recordedAt: number): string => {
  const d = new Date(recordedAt);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};

/**
 * Data ISO + "HH:MM" -> epoch ms tego dnia (lokalnie). Pusta / zła godzina
 * albo zła data = undefined: wpis zostaje bez recordedAt (legacy), nigdy nie
 * fabrykujemy zegara przy edycji.
 */
export const composeRecordedAt = (date: string, time: string): number | undefined => {
  const match = TIME_RE.exec(time);
  const day = parseLocalDateSafe(date);
  if (!match || !day) return undefined;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 23 || minutes > 59) return undefined;
  return new Date(day.getFullYear(), day.getMonth(), day.getDate(), hours, minutes).getTime();
};
