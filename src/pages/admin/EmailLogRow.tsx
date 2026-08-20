// T22a: wspólny wiersz rejestru maili + dialog podglądu treści — używane przez
// AdminEmailsCard (lista globalna) i AdminUserDetail (maile jednego usera).
// Wyekstrahowane 1:1 z AdminEmailsCard (T21c) — zero zmian zachowania.
import { useCallback, useState } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Loader2 } from 'lucide-react';
import { useTranslation } from '@/contexts/LanguageContext';
import { dateLocale } from '@/i18n';
import {
  emailDisplayStatus,
  emailTypeLabelKey,
  type EmailDisplayStatus,
  type EmailLogRow,
} from '@/lib/admin-email-stats';

const STATUS_CLASSES: Record<EmailDisplayStatus, string> = {
  sent: 'border-muted-foreground/40 bg-muted/40 text-muted-foreground',
  delivered: 'border-fitness-success bg-fitness-success/10 text-fitness-success',
  opened: 'border-sky-500 bg-sky-500/10 text-sky-600',
  bounced: 'border-destructive bg-destructive/10 text-destructive',
  complaint: 'border-destructive bg-destructive/10 text-destructive',
  failed: 'border-destructive bg-destructive/10 text-destructive',
};

// T21c: podgląd treści maila — html z podkolekcji content/body; wpisy sprzed
// włączenia zapisu treści nie mają dokumentu → stan 'unavailable' z komunikatem.
export interface EmailPreview {
  row: EmailLogRow;
  html: string | 'loading' | 'unavailable';
}

export const useEmailPreview = () => {
  const [preview, setPreview] = useState<EmailPreview | null>(null);

  const openPreview = useCallback(async (row: EmailLogRow) => {
    setPreview({ row, html: 'loading' });
    try {
      const snap = await getDoc(doc(db, 'email_log', row.id, 'content', 'body'));
      const html = snap.exists() ? String(snap.data()?.html ?? '') : '';
      setPreview((prev) => (prev?.row.id === row.id ? { row, html: html || 'unavailable' } : prev));
    } catch {
      setPreview((prev) => (prev?.row.id === row.id ? { row, html: 'unavailable' } : prev));
    }
  }, []);

  const closePreview = useCallback(() => setPreview(null), []);
  return { preview, openPreview, closePreview };
};

const useFmtDate = () => {
  const { lang } = useTranslation();
  return (iso: string | undefined): string | null => {
    if (!iso) return null;
    const parsed = new Date(iso);
    return Number.isNaN(parsed.getTime()) ? null : parsed.toLocaleString(dateLocale(lang));
  };
};

export const EmailLogRowItem = ({ row, onPreview }: {
  row: EmailLogRow;
  onPreview: (row: EmailLogRow) => void;
}) => {
  const { t } = useTranslation();
  const fmtDate = useFmtDate();

  const statusLabel = (status: EmailDisplayStatus): string => ({
    sent: t('admin.emails.statusSent'),
    delivered: t('admin.emails.statusDelivered'),
    opened: t('admin.emails.statusOpened'),
    bounced: t('admin.emails.statusBounced'),
    complaint: t('admin.emails.statusComplaint'),
    failed: t('admin.emails.statusFailed'),
  }[status]);

  const status = emailDisplayStatus(row);
  const typeKey = emailTypeLabelKey(row.type);
  const times = [
    { label: t('admin.emails.timeSent'), value: fmtDate(row.sentAt) },
    { label: t('admin.emails.timeDelivered'), value: fmtDate(row.deliveredAt) },
    { label: t('admin.emails.timeOpened'), value: fmtDate(row.openedAt) },
  ].filter((entry) => entry.value !== null);

  return (
    <div className="rounded-lg border p-3 text-sm">
      <div className="flex flex-wrap items-center gap-2">
        <span className={`rounded-full border px-2 py-0.5 text-xs font-medium ${STATUS_CLASSES[status]}`}>
          {statusLabel(status)}
        </span>
        <span className="text-xs uppercase tracking-wide text-muted-foreground">
          {typeKey ? t(typeKey) : row.type}
        </span>
        <span className="text-xs text-muted-foreground">{row.transport ?? '—'}</span>
        {typeof row.openCount === 'number' && row.openCount > 0 && (
          <span className="text-xs text-muted-foreground">
            {t('admin.emails.opens', { n: row.openCount })}
          </span>
        )}
        <Button
          variant="ghost"
          size="sm"
          className="ml-auto h-6 px-2 text-xs"
          onClick={() => onPreview(row)}
        >
          {t('admin.emails.viewContent')}
        </Button>
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
};

// T21c: dialog kontrolowany — zamykanie WYŁĄCZNIE przez onOpenChange,
// nigdy warunkowy unmount (pułapka Radix z CLAUDE.md).
export const EmailPreviewDialog = ({ preview, onClose }: {
  preview: EmailPreview | null;
  onClose: () => void;
}) => {
  const { t } = useTranslation();
  const fmtDate = useFmtDate();

  return (
    <Dialog open={preview !== null} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>{t('admin.emails.contentTitle')}</DialogTitle>
        </DialogHeader>
        {preview && (
          <div className="space-y-2">
            <p className="break-words text-sm font-medium">{preview.row.subject}</p>
            <p className="break-words text-xs text-muted-foreground">
              {preview.row.to} · {fmtDate(preview.row.sentAt) ?? '—'}
            </p>
            {preview.html === 'loading' && (
              <div className="flex h-24 items-center justify-center">
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
              </div>
            )}
            {preview.html === 'unavailable' && (
              <p className="text-sm text-muted-foreground">{t('admin.emails.contentUnavailable')}</p>
            )}
            {preview.html !== 'loading' && preview.html !== 'unavailable' && (
              // Pusty sandbox: izoluje style maila od panelu i nie wykonuje skryptów.
              <iframe
                sandbox=""
                srcDoc={preview.html}
                title={preview.row.subject}
                className="h-[60vh] w-full rounded-lg border bg-white"
              />
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
