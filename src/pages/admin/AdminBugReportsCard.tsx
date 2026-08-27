import { useCallback, useEffect, useMemo, useState } from 'react';
import { collection, getDocs, limit, orderBy, query } from 'firebase/firestore';
import { Bug, Image, Loader2 } from 'lucide-react';
import { db } from '@/lib/firebase';
import { callProtectedFunction } from '@/lib/protected-callable';
import { useTranslation } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const REPORT_LIMIT = 100;

const STATUSES = [
  'new',
  'triaged',
  'in_progress',
  'resolved',
  'closed',
  'duplicate',
] as const;
const FILTER_STATUSES = ['awaiting_upload', ...STATUSES] as const;
const CATEGORIES = ['crash', 'sync', 'workout', 'ui', 'account', 'other'] as const;

type BugReportStatus = (typeof STATUSES)[number];
type BugReportFilterStatus = (typeof FILTER_STATUSES)[number];
type BugReportCategory = (typeof CATEGORIES)[number];

interface BugReportRow {
  id: string;
  reporterEmail?: string;
  userEmailSnapshot?: string;
  message?: string;
  description?: string;
  category: string;
  status: string;
  platform?: string;
  appVersion?: string;
  context?: {
    platform?: string;
    appVersion?: string;
  };
  screenshot?: { path?: string } | null;
  screenshotPath?: string;
}

interface ScreenshotUrlResponse {
  url: string;
}

const isKnownStatus = (value: string): value is BugReportStatus => (
  (STATUSES as readonly string[]).includes(value)
);

export const AdminBugReportsCard = () => {
  const { t } = useTranslation();
  const [rows, setRows] = useState<BugReportRow[] | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [statusFilter, setStatusFilter] = useState<'all' | BugReportFilterStatus>('all');
  const [categoryFilter, setCategoryFilter] = useState<'all' | BugReportCategory>('all');
  const [statusBusy, setStatusBusy] = useState<Record<string, boolean>>({});
  const [statusErrors, setStatusErrors] = useState<Record<string, BugReportStatus | undefined>>({});
  const [screenshotBusy, setScreenshotBusy] = useState<Record<string, boolean>>({});
  const [screenshotErrors, setScreenshotErrors] = useState<Record<string, boolean>>({});

  useEffect(() => {
    let cancelled = false;
    setRows(null);
    (async () => {
      try {
        const snapshot = await getDocs(query(
          collection(db, 'bug_reports'),
          orderBy('createdAt', 'desc'),
          limit(REPORT_LIMIT),
        ));
        if (cancelled) return;
        setRows(snapshot.docs.map((document) => ({
          ...(document.data() as Omit<BugReportRow, 'id'>),
          id: document.id,
        })));
        setLoadError(false);
      } catch {
        if (cancelled) return;
        setRows(null);
        setLoadError(true);
      }
    })();
    return () => { cancelled = true; };
  }, [reloadKey]);

  const retryLoad = useCallback(() => {
    setLoadError(false);
    setRows(null);
    setReloadKey((key) => key + 1);
  }, []);

  const updateStatus = useCallback(async (reportId: string, status: BugReportStatus) => {
    setStatusBusy((current) => ({ ...current, [reportId]: true }));
    setStatusErrors((current) => ({ ...current, [reportId]: undefined }));
    try {
      await callProtectedFunction('adminUpdateBugReport', { reportId, status });
      setRows((current) => current?.map((row) => (
        row.id === reportId ? { ...row, status } : row
      )) ?? null);
    } catch {
      setStatusErrors((current) => ({ ...current, [reportId]: status }));
    } finally {
      setStatusBusy((current) => ({ ...current, [reportId]: false }));
    }
  }, []);

  const openScreenshot = useCallback(async (reportId: string) => {
    setScreenshotBusy((current) => ({ ...current, [reportId]: true }));
    setScreenshotErrors((current) => ({ ...current, [reportId]: false }));
    try {
      const result = await callProtectedFunction<{ reportId: string }, ScreenshotUrlResponse>(
        'adminGetBugReportScreenshotUrl',
        { reportId },
      );
      if (!result.url) throw new Error('missing-screenshot-url');
      window.open(result.url, '_blank', 'noopener,noreferrer');
    } catch {
      setScreenshotErrors((current) => ({ ...current, [reportId]: true }));
    } finally {
      setScreenshotBusy((current) => ({ ...current, [reportId]: false }));
    }
  }, []);

  const filteredRows = useMemo(() => (rows ?? []).filter((row) => (
    (statusFilter === 'all' || row.status === statusFilter)
    && (categoryFilter === 'all' || row.category === categoryFilter)
  )), [categoryFilter, rows, statusFilter]);

  const statusLabel = (status: string): string => {
    if (status === 'awaiting_upload') return t('admin.bugReports.status.awaiting_upload');
    const known = isKnownStatus(status) ? status : 'new';
    return t(`admin.bugReports.status.${known}`);
  };

  const categoryLabel = (category: string): string => {
    const known = (CATEGORIES as readonly string[]).includes(category)
      ? category as BugReportCategory
      : 'other';
    return t(`admin.bugReports.category.${known}`);
  };

  return (
    <Card data-testid="admin-bug-reports-card">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base font-heading font-bold uppercase tracking-tight">
          <Bug className="h-5 w-5" />
          {t('admin.bugReports.title')}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {loadError && (
          <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm">
            <p className="text-destructive">{t('admin.bugReports.error')}</p>
            <Button variant="outline" size="sm" className="mt-2" onClick={retryLoad}>
              {t('admin.bugReports.retry')}
            </Button>
          </div>
        )}

        {!loadError && rows === null && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground" role="status">
            <Loader2 className="h-4 w-4 animate-spin" />
            {t('admin.bugReports.loading')}
          </div>
        )}

        {rows !== null && (
          <>
            <div className="grid gap-2 sm:grid-cols-2">
              <label className="space-y-1 text-xs text-muted-foreground">
                <span>{t('admin.bugReports.filterStatus')}</span>
                <select
                  aria-label={t('admin.bugReports.filterStatus')}
                  className="h-10 w-full rounded-lg border border-border bg-surface-highest px-3 text-sm text-foreground"
                  value={statusFilter}
                  onChange={(event) => setStatusFilter(event.target.value as 'all' | BugReportFilterStatus)}
                >
                  <option value="all">{t('admin.bugReports.filterAll')}</option>
                  {FILTER_STATUSES.map((status) => (
                    <option key={status} value={status}>{statusLabel(status)}</option>
                  ))}
                </select>
              </label>
              <label className="space-y-1 text-xs text-muted-foreground">
                <span>{t('admin.bugReports.filterCategory')}</span>
                <select
                  aria-label={t('admin.bugReports.filterCategory')}
                  className="h-10 w-full rounded-lg border border-border bg-surface-highest px-3 text-sm text-foreground"
                  value={categoryFilter}
                  onChange={(event) => setCategoryFilter(event.target.value as 'all' | BugReportCategory)}
                >
                  <option value="all">{t('admin.bugReports.filterAll')}</option>
                  {CATEGORIES.map((category) => (
                    <option key={category} value={category}>{categoryLabel(category)}</option>
                  ))}
                </select>
              </label>
            </div>

            {rows.length === 0 && (
              <p className="text-sm text-muted-foreground">{t('admin.bugReports.empty')}</p>
            )}
            {rows.length > 0 && filteredRows.length === 0 && (
              <p className="text-sm text-muted-foreground">{t('admin.bugReports.noMatches')}</p>
            )}

            <div className="space-y-3">
              {filteredRows.map((row) => {
                const email = row.reporterEmail || row.userEmailSnapshot || t('admin.bugReports.anonymous');
                const platform = row.context?.platform || row.platform || t('admin.bugReports.unknownPlatform');
                const version = row.context?.appVersion || row.appVersion || t('admin.bugReports.unknownVersion');
                const hasScreenshot = !!(row.screenshot?.path || row.screenshotPath);
                const currentStatus = isKnownStatus(row.status) ? row.status : 'new';
                const awaitingUpload = row.status === 'awaiting_upload';
                const message = row.message || row.description || t('admin.bugReports.missingDescription');
                const pendingStatus = statusErrors[row.id];
                return (
                  <article key={row.id} className="rounded-xl border border-border bg-surface-low p-3">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="break-words text-sm font-medium text-foreground">{message}</p>
                        <p className="mt-1 break-all text-xs text-muted-foreground">{email}</p>
                        <p className="mt-1 text-xs text-muted-foreground">{platform} · {version}</p>
                      </div>
                      <span className="rounded-full border border-fitness-cyan/40 bg-fitness-cyan/10 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-fitness-cyan">
                        {categoryLabel(row.category)}
                      </span>
                    </div>

                    <div className="mt-3 grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
                      <label className="space-y-1 text-xs text-muted-foreground">
                        <span>{t('admin.bugReports.statusLabel')}</span>
                        <select
                          aria-label={t('admin.bugReports.statusFor', { email })}
                          className="h-9 w-full rounded-lg border border-border bg-surface-highest px-2 text-sm text-foreground disabled:opacity-60"
                          value={awaitingUpload ? 'awaiting_upload' : currentStatus}
                          disabled={awaitingUpload || !!statusBusy[row.id]}
                          onChange={(event) => void updateStatus(row.id, event.target.value as BugReportStatus)}
                        >
                          {awaitingUpload && (
                            <option value="awaiting_upload">{statusLabel('awaiting_upload')}</option>
                          )}
                          {STATUSES.map((status) => (
                            <option key={status} value={status}>{statusLabel(status)}</option>
                          ))}
                        </select>
                      </label>
                      {hasScreenshot && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={!!screenshotBusy[row.id]}
                          onClick={() => void openScreenshot(row.id)}
                        >
                          {screenshotBusy[row.id]
                            ? <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            : <Image className="mr-2 h-4 w-4" />}
                          {t('admin.bugReports.openScreenshot')}
                        </Button>
                      )}
                    </div>

                    {pendingStatus && (
                      <div className="mt-2 rounded-lg border border-destructive/40 bg-destructive/10 p-2 text-xs">
                        <p className="text-destructive">{t('admin.bugReports.statusError')}</p>
                        <Button
                          variant="outline"
                          size="sm"
                          className="mt-2"
                          disabled={!!statusBusy[row.id]}
                          onClick={() => void updateStatus(row.id, pendingStatus)}
                        >
                          {t('admin.bugReports.retryStatus')}
                        </Button>
                      </div>
                    )}

                    {screenshotErrors[row.id] && (
                      <div className="mt-2 rounded-lg border border-destructive/40 bg-destructive/10 p-2 text-xs">
                        <p className="text-destructive">{t('admin.bugReports.screenshotError')}</p>
                        <Button
                          variant="outline"
                          size="sm"
                          className="mt-2"
                          disabled={!!screenshotBusy[row.id]}
                          onClick={() => void openScreenshot(row.id)}
                        >
                          {t('admin.bugReports.retryScreenshot')}
                        </Button>
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};
