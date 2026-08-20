import { useCallback, useEffect, useState } from 'react';
import { collection, getDocs, limit, orderBy, query } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Mail } from 'lucide-react';
import { useTranslation } from '@/contexts/LanguageContext';
import { dateLocale } from '@/i18n';
import {
  emailDisplayStatus,
  emailStats,
  type EmailDisplayStatus,
  type EmailLogRow,
  type EmailStats,
} from '@/lib/admin-email-stats';

// G-T4: sekcja Maile — rejestr wysyłek (email_log) + kafle dostarczalności.
// Statystyki liczone po stronie klienta z ostatnich EMAIL_LOG_LIMIT wpisów
// (ograniczenie zaznaczone w UI). Zdarzenia SES aktualizują email_log
// server-side (webhook), tu tylko odczyt.

const EMAIL_LOG_LIMIT = 100;

const STATUS_CLASSES: Record<EmailDisplayStatus, string> = {
  sent: 'border-muted-foreground/40 bg-muted/40 text-muted-foreground',
  delivered: 'border-fitness-success bg-fitness-success/10 text-fitness-success',
  opened: 'border-sky-500 bg-sky-500/10 text-sky-600',
  bounced: 'border-destructive bg-destructive/10 text-destructive',
  complaint: 'border-destructive bg-destructive/10 text-destructive',
  failed: 'border-destructive bg-destructive/10 text-destructive',
};

const pctLabel = (value: number | null): string => (value === null ? '—' : `${value}%`);

export const AdminEmailsCard = () => {
  const { t, lang } = useTranslation();
  const [rows, setRows] = useState<EmailLogRow[] | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const snapshot = await getDocs(query(
          collection(db, 'email_log'),
          orderBy('sentAt', 'desc'),
          limit(EMAIL_LOG_LIMIT),
        ));
        if (cancelled) return;
        setLoadError(false);
        setRows(snapshot.docs.map((docSnap) => ({
          ...(docSnap.data() as Omit<EmailLogRow, 'id'>),
          id: docSnap.id,
        })));
      } catch {
        if (!cancelled) {
          setRows(null);
          setLoadError(true);
        }
      }
    })();
    return () => { cancelled = true; };
  }, [reloadKey]);

  const retry = useCallback(() => {
    setLoadError(false);
    setRows(null);
    setReloadKey((key) => key + 1);
  }, []);

  const statusLabel = (status: EmailDisplayStatus): string => ({
    sent: t('admin.emails.statusSent'),
    delivered: t('admin.emails.statusDelivered'),
    opened: t('admin.emails.statusOpened'),
    bounced: t('admin.emails.statusBounced'),
    complaint: t('admin.emails.statusComplaint'),
    failed: t('admin.emails.statusFailed'),
  }[status]);

  const fmtDate = (iso: string | undefined): string | null => {
    if (!iso) return null;
    const parsed = new Date(iso);
    return Number.isNaN(parsed.getTime()) ? null : parsed.toLocaleString(dateLocale(lang));
  };

  const statsBlock = (label: string, stats: EmailStats) => (
    <div>
      <p className="text-xs uppercase tracking-wide text-muted-foreground mb-2">{label}</p>
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {[
          { label: t('admin.emails.statSent'), value: String(stats.sent) },
          { label: t('admin.emails.statDelivered'), value: pctLabel(stats.deliveredPct) },
          { label: t('admin.emails.statOpened'), value: pctLabel(stats.openedPct) },
          { label: t('admin.emails.statBounced'), value: pctLabel(stats.bouncePct) },
          { label: t('admin.emails.statComplaints'), value: String(stats.complaints) },
        ].map((stat) => (
          <div key={stat.label} className="rounded-xl bg-surface-low p-3">
            <p className="font-heading font-bold text-2xl tabular-nums leading-none">{stat.value}</p>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground mt-1">{stat.label}</p>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base font-heading font-bold uppercase tracking-tight">
          <Mail className="h-5 w-5" />
          {t('admin.emails.title')}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {loadError && (
          <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm">
            <p className="text-destructive">{t('admin.emails.error')}</p>
            <Button variant="outline" size="sm" className="mt-2" onClick={retry}>
              {t('admin.emails.retry')}
            </Button>
          </div>
        )}
        {rows !== null && (
          <>
            {statsBlock(t('admin.emails.days7'), emailStats(rows, 7))}
            {statsBlock(t('admin.emails.days30'), emailStats(rows, 30))}
            <p className="text-xs text-muted-foreground">
              {t('admin.emails.limitNote', { n: EMAIL_LOG_LIMIT })}
            </p>
            <div className="space-y-2">
              {rows.map((row) => {
                const status = emailDisplayStatus(row);
                const times = [
                  { label: t('admin.emails.timeSent'), value: fmtDate(row.sentAt) },
                  { label: t('admin.emails.timeDelivered'), value: fmtDate(row.deliveredAt) },
                  { label: t('admin.emails.timeOpened'), value: fmtDate(row.openedAt) },
                ].filter((entry) => entry.value !== null);
                return (
                  <div key={row.id} className="rounded-lg border p-3 text-sm">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`rounded-full border px-2 py-0.5 text-xs font-medium ${STATUS_CLASSES[status]}`}>
                        {statusLabel(status)}
                      </span>
                      <span className="text-xs uppercase tracking-wide text-muted-foreground">
                        {row.type === 'history' ? t('admin.emails.typeHistory') : t('admin.emails.typeWorkout')}
                      </span>
                      <span className="text-xs text-muted-foreground">{row.transport ?? '—'}</span>
                      {typeof row.openCount === 'number' && row.openCount > 0 && (
                        <span className="text-xs text-muted-foreground">
                          {t('admin.emails.opens', { n: row.openCount })}
                        </span>
                      )}
                    </div>
                    <p className="mt-1 font-medium break-words">{row.subject}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground break-words">
                      {row.uid} → <span className="text-foreground">{row.to}</span>
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {times.map((entry) => `${entry.label}: ${entry.value}`).join(' · ')}
                    </p>
                    {row.error && (
                      <p className="mt-0.5 text-xs text-destructive break-words">{row.error}</p>
                    )}
                  </div>
                );
              })}
            </div>
            {rows.length === 0 && (
              <p className="text-sm text-muted-foreground">{t('admin.emails.empty')}</p>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
};
