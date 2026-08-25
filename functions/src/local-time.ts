// Bug 11 (X30): funkcje harmonogramowe liczyły dzień tygodnia, datę i porę
// z zegara serwera (schedule w Europe/Warsaw). User w Ameryce dostawał poranny
// push o 22:00-02:00 z treścią JUTRZEJSZEGO dnia planu, a digest tygodnia
// przychodził w niedzielę wieczorem, przed końcem jego weekendu.
// Ten moduł liczy "lokalne teraz" usera z jego strefy (users/{uid}.timeZone,
// pisane przez klienta z Intl); brak/nieznana strefa = dotychczasowa Warszawa.

export const DEFAULT_TIME_ZONE = "Europe/Warsaw";

export interface LocalDayParts {
  /** Dzień tygodnia po angielsku, małymi literami (jak PlanDay.weekday). */
  weekday: string;
  /** Data lokalna YYYY-MM-DD (format pola workouts.date pisanego przez klienta). */
  dateStr: string;
  /** Godzina lokalna 0-23. */
  hour: number;
}

const isValidTimeZone = (timeZone: string): boolean => {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone });
    return true;
  } catch {
    return false;
  }
};

/** Strefa usera albo Warszawa, gdy pola brak lub Intl jej nie zna. */
export const resolveTimeZone = (timeZone: string | undefined | null): string => (
  typeof timeZone === "string" && timeZone.length > 0 && isValidTimeZone(timeZone)
    ? timeZone
    : DEFAULT_TIME_ZONE
);

export const localDayParts = (now: Date, timeZone: string | undefined | null): LocalDayParts => {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: resolveTimeZone(timeZone),
    hourCycle: "h23",
    weekday: "long",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
  }).formatToParts(now);
  const get = (type: Intl.DateTimeFormatPartTypes): string =>
    parts.find((part) => part.type === type)?.value ?? "";
  return {
    weekday: get("weekday").toLowerCase(),
    dateStr: `${get("year")}-${get("month")}-${get("day")}`,
    hour: Number(get("hour")) % 24,
  };
};

/** Przesunięcie daty YYYY-MM-DD o n dni (arytmetyka w UTC, bez wpływu strefy serwera). */
export const shiftDateStr = (dateStr: string, days: number): string => {
  const [year, month, day] = dateStr.split("-").map(Number);
  const shifted = new Date(Date.UTC(year, month - 1, day + days));
  return shifted.toISOString().slice(0, 10);
};
