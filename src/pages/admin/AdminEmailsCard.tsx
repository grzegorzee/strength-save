import { useCallback, useEffect, useState } from 'react';
import { collection, getDocs, limit, orderBy, query } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toggleButtonClasses } from '@/components/ui/chip-button';
import { Input } from '@/components/ui/input';
import { Mail } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTranslation } from '@/contexts/LanguageContext';
import {
  emailStats,
  filterEmailRows,
  type EmailDisplayStatus,
  type EmailLogRow,
  type EmailStats,
} from '@/lib/admin-email-stats';
import { EmailLogRowItem, EmailPreviewDialog, useEmailPreview } from './EmailLogRow';

// G-T4: sekcja Maile — rejestr wysyłek (email_log) + kafle dostarczalności.
// Statystyki liczone po stronie klienta z ostatnich EMAIL_LOG_LIMIT wpisów
// (ograniczenie zaznaczone w UI). Zdarzenia SES aktualizują email_log
// server-side (webhook), tu tylko odczyt.
// T22a: wiersz i dialog podglądu współdzielone z AdminUserDetail (EmailLogRow.tsx).

const EMAIL_LOG_LIMIT = 100;

// T22b: chipy filtra statusu (klucze etykiet = istniejące admin.emails.status*).
const STATUS_FILTERS = ['all', 'sent', 'delivered', 'opened', 'bounced', 'complaint', 'failed'] as const;

const pctLabel = (value: number | null): string => (value === null ? '-' : `${value}%`);

export const AdminEmailsCard = () => {
  const { t } = useTranslation();
  const [rows, setRows] = useState<EmailLogRow[] | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  // T22b: filtr działa TYLKO na listę; kafle 7/30 dni zawsze z pełnych rows.
  const [statusFilter, setStatusFilter] = useState<EmailDisplayStatus | 'all'>('all');
  const [search, setSearch] = useState('');
  const { preview, openPreview, closePreview } = useEmailPreview();

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
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground mt-1">{stat.label}</p>
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
        {rows !== null && (() => {
          const filteredRows = filterEmailRows(rows, { status: statusFilter, search });
          const filterLabel = (key: typeof STATUS_FILTERS[number]): string => ({
            all: t('admin.emails.filterAll'),
            sent: t('admin.emails.statusSent'),
            delivered: t('admin.emails.statusDelivered'),
            opened: t('admin.emails.statusOpened'),
            bounced: t('admin.emails.statusBounced'),
            complaint: t('admin.emails.statusComplaint'),
            failed: t('admin.emails.statusFailed'),
          }[key]);
          return (
            <>
              {statsBlock(t('admin.emails.days7'), emailStats(rows, 7))}
              {statsBlock(t('admin.emails.days30'), emailStats(rows, 30))}
              <p className="text-xs text-muted-foreground">
                {t('admin.emails.limitNote', { n: EMAIL_LOG_LIMIT })}
              </p>
              {/* T22b: szukajka + chipy statusu (wzorzec sekcji userów) */}
              <div className="space-y-2">
                <Input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder={t('admin.emails.searchPlaceholder')}
                />
                <div className="flex flex-wrap gap-1.5">
                  {STATUS_FILTERS.map((key) => (
                    <button
                      key={key}
                      type="button"
                      aria-pressed={statusFilter === key}
                      onClick={() => setStatusFilter(key)}
                      className={cn(
                        'rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wide',
                        toggleButtonClasses(statusFilter === key),
                        statusFilter === key
                          ? 'bg-fitness-cyan text-background'
                          : 'bg-surface-highest text-muted-foreground',
                      )}
                    >
                      {filterLabel(key)}
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                {filteredRows.map((row) => (
                  <EmailLogRowItem key={row.id} row={row} onPreview={(r) => void openPreview(r)} />
                ))}
              </div>
              {rows.length === 0 && (
                <p className="text-sm text-muted-foreground">{t('admin.emails.empty')}</p>
              )}
              {rows.length > 0 && filteredRows.length === 0 && (
                <p className="text-sm text-muted-foreground">{t('admin.emails.noMatches')}</p>
              )}
            </>
          );
        })()}
        <EmailPreviewDialog preview={preview} onClose={closePreview} />
      </CardContent>
    </Card>
  );
};
