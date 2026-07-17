// Z98/Z99: czyste funkcje listy i szczegółu aktywności userów w panelu admina.
// Dane WYŁĄCZNIE z users.activitySummary (rollup X13A) i app_telemetry_daily —
// zero odczytów kolekcji workouts.

export interface ActivityUserLike {
  activitySummary?: { lastActiveAt?: string };
  lastLogin?: string;
}

const lastActivityKey = (user: ActivityUserLike): string => {
  const fromSummary = user.activitySummary?.lastActiveAt ?? '';
  if (fromSummary) return fromSummary;
  // lastLogin bywa ISO z czasem — prefiks YYYY-MM-DD porównuje się leksykalnie z datami rollupu.
  return (user.lastLogin ?? '').slice(0, 10);
};

export const sortUsersByActivity = <T extends ActivityUserLike>(users: T[]): T[] =>
  [...users].sort((a, b) => lastActivityKey(b).localeCompare(lastActivityKey(a)));

export type ActivityBadge = 'active' | 'idle' | 'dormant';

export const activityBadge = (lastActiveAt: string | undefined, now: Date): ActivityBadge => {
  if (!lastActiveAt) return 'dormant';
  const last = new Date(`${lastActiveAt.slice(0, 10)}T12:00:00`);
  const days = Math.floor((now.getTime() - last.getTime()) / (24 * 60 * 60 * 1000));
  if (days <= 7) return 'active';
  if (days <= 30) return 'idle';
  return 'dormant';
};

export interface DailyActivityPoint {
  date: string;
  sessions: number;
  workouts: number;
  screens: number;
}

interface TelemetryDailyLike {
  userId: string;
  date: string;
  counters?: Record<string, number>;
}

// Wykres 30 dni w szczególe usera: dni bez dokumentu dostają zera (ciągła oś).
export const buildDailyActivitySeries = (
  dailyDocs: TelemetryDailyLike[],
  days: number,
  now: Date,
): DailyActivityPoint[] => {
  const byDate = new Map(dailyDocs.map((docLike) => [docLike.date, docLike.counters ?? {}]));
  const series: DailyActivityPoint[] = [];
  for (let i = days - 1; i >= 0; i -= 1) {
    const day = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
    const key = `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, '0')}-${String(day.getDate()).padStart(2, '0')}`;
    const counters = byDate.get(key) ?? {};
    const screens = Object.entries(counters)
      .filter(([name]) => name.startsWith('screen_'))
      .reduce((total, [, value]) => total + (typeof value === 'number' ? value : 0), 0);
    series.push({
      date: key,
      sessions: typeof counters.session_active === 'number' ? counters.session_active : 0,
      workouts: typeof counters.action_workout_completed === 'number' ? counters.action_workout_completed : 0,
      screens,
    });
  }
  return series;
};
