export const BUG_REPORT_CATEGORIES = ['crash', 'sync', 'workout', 'ui', 'account', 'other'] as const;
export type BugReportCategory = typeof BUG_REPORT_CATEGORIES[number];

export interface BugReportDraft {
  reportId: string;
  message: string;
  category: BugReportCategory;
}

const keyFor = (uid: string) => `strength-save:bug-report-draft:v1:${uid}`;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const isDraft = (value: unknown): value is BugReportDraft => {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<BugReportDraft>;
  return typeof candidate.reportId === 'string'
    && UUID_RE.test(candidate.reportId)
    && typeof candidate.message === 'string'
    && candidate.message.length <= 4000
    && BUG_REPORT_CATEGORIES.includes(candidate.category as BugReportCategory);
};

export function readBugReportDraft(uid: string): BugReportDraft | null {
  try {
    const raw = localStorage.getItem(keyFor(uid));
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    return isDraft(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function writeBugReportDraft(uid: string, draft: BugReportDraft): void {
  try {
    localStorage.setItem(keyFor(uid), JSON.stringify(draft));
  } catch {
    // Draft w pamięci komponentu nadal działa; quota/privacy mode nie może
    // zablokować zgłoszenia ani treningu.
  }
}

export function clearBugReportDraft(uid: string): void {
  try {
    localStorage.removeItem(keyFor(uid));
  } catch {
    // Best-effort: idempotencja reportId zapobiega duplikatom także po restarcie.
  }
}
