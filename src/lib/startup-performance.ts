export type StartupMark =
  | 'root-painted'
  | 'auth-restored'
  | 'profile-cache-ready'
  | 'dashboard-interactive';

export type StartupMode = 'warm' | 'cold-online' | 'cold-offline' | 'weak-network';

export interface StartupReport {
  mode: StartupMode;
  durationMs: number;
  marks: Partial<Record<StartupMark, number>>;
  profileSource?: string;
}

const marks = new Map<StartupMark, number>();
let profileSource: string | undefined;

const connectionType = (): string | undefined => (
  navigator as Navigator & { connection?: { effectiveType?: string } }
).connection?.effectiveType;

const startupMode = (): StartupMode => {
  if (!navigator.onLine) return 'cold-offline';
  if (['slow-2g', '2g'].includes(connectionType() ?? '')) return 'weak-network';
  const navigation = performance.getEntriesByType?.('navigation')[0] as PerformanceNavigationTiming | undefined;
  return navigation?.type === 'reload' ? 'warm' : 'cold-online';
};

export const readStartupReport = (): StartupReport | null => {
  if (marks.size === 0) return null;
  return {
    mode: startupMode(),
    durationMs: Math.round(marks.get('dashboard-interactive') ?? performance.now()),
    marks: Object.fromEntries(marks),
    ...(profileSource ? { profileSource } : {}),
  };
};

const publishStartupReport = () => {
  const report = readStartupReport();
  if (!report) return;
  try {
    sessionStorage.setItem('strength-save:last-startup-report', JSON.stringify(report));
  } catch { /* pomiar nie może blokować startu */ }
  if (import.meta.env.MODE !== 'test') console.info('[startup]', report);
};

export const markStartup = (name: StartupMark, detail?: string) => {
  if (marks.has(name)) return;
  const timestamp = Math.round(performance.now());
  marks.set(name, timestamp);
  if (name === 'profile-cache-ready') profileSource = detail;
  try { performance.mark(name, detail ? { detail } : undefined); } catch { /* starszy WebView */ }
  if (name === 'dashboard-interactive') publishStartupReport();
};

export const resetStartupMarksForTest = () => {
  marks.clear();
  profileSource = undefined;
  try { performance.clearMarks(); } catch { /* jsdom / starszy WebView */ }
};
