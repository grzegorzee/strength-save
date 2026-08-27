import { useEffect, useRef, useState } from 'react';
import { ImagePlus, Loader2, Mail, Send, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useTranslation } from '@/contexts/LanguageContext';
import {
  clearBugReportDraft,
  readBugReportDraft,
  writeBugReportDraft,
  type BugReportCategory,
} from '@/lib/bug-report-draft';
import { pickSingleNativeImage } from '@/lib/native-image-picker';
import { submitBugReport } from '@/lib/bug-reports';
import {
  clearPendingBugReportCameraRecovery,
  consumeRecoveredBugReportAttachment,
  prepareBugReportCameraRecovery,
  readRecoveredBugReportAttachment,
} from '@/lib/bug-report-camera-restore';

interface BugReportDialogProps {
  open: boolean;
  uid: string;
  onOpenChange: (open: boolean) => void;
}

const newReportId = () => crypto.randomUUID();

export const BugReportDialog = ({ open, uid, onOpenChange }: BugReportDialogProps) => {
  const { t } = useTranslation();
  const fileInputRef = useRef<HTMLInputElement>(null);
  // Explicit `string`: crypto.randomUUID() is typed as a UUID template literal,
  // while a restored, already-validated draft crosses the storage boundary as a string.
  const [reportId, setReportId] = useState<string>(newReportId);
  const [message, setMessage] = useState('');
  const [category, setCategory] = useState<BugReportCategory>('other');
  const [attachment, setAttachment] = useState<File | null>(null);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(false);
  const [hasAttempted, setHasAttempted] = useState(false);

  useEffect(() => {
    if (!open) return;
    const draft = readBugReportDraft(uid);
    const nextReportId = draft?.reportId ?? newReportId();
    if (draft) {
      setReportId(draft.reportId);
      setMessage(draft.message);
      setCategory(draft.category);
    } else {
      setReportId(nextReportId);
      setMessage('');
      setCategory('other');
    }
    setAttachment(null);
    setError(false);
    setHasAttempted(false);

    let cancelled = false;
    const binding = { uid, clientRequestId: nextReportId };
    void readRecoveredBugReportAttachment(binding).then((recovery) => {
      if (cancelled || recovery.status === 'none') return;
      if (recovery.status === 'ready') {
        setAttachment(recovery.file);
        return;
      }
      setError(true);
      // Sam kod błędu nie zawiera danych usera; po pokazaniu ścieżki wyjścia
      // nie ma sensu przypominać go przy każdym kolejnym otwarciu.
      void consumeRecoveredBugReportAttachment(binding);
    });
    return () => { cancelled = true; };
  }, [open, uid]);

  useEffect(() => {
    if (!open) return;
    writeBugReportDraft(uid, { reportId, message, category });
  }, [category, message, open, reportId, uid]);

  const pickScreenshot = async () => {
    // Zapis przed opuszczeniem WebView: Android może ubić Activity pickera.
    writeBugReportDraft(uid, { reportId, message, category });
    setError(false);
    const binding = { uid, clientRequestId: reportId };
    try {
      await prepareBugReportCameraRecovery(binding);
      const result = await pickSingleNativeImage();
      // Normalny powrót nie przechodzi przez appRestoredResult — zdejmujemy
      // dokładnie własny pending marker, nie marker nowszego pickera.
      await clearPendingBugReportCameraRecovery(binding);
      if (result.status === 'picked') setAttachment(result.file);
      if (result.status === 'unsupported') fileInputRef.current?.click();
    } catch {
      await clearPendingBugReportCameraRecovery(binding);
      setError(true);
    }
  };

  const send = async () => {
    setHasAttempted(true);
    if (message.trim().length < 20 || message.trim().length > 4000) return;
    setSending(true);
    setError(false);
    writeBugReportDraft(uid, { reportId, message, category });
    try {
      await submitBugReport(uid, { reportId, message, category, ...(attachment ? { attachment } : {}) });
      await consumeRecoveredBugReportAttachment({ uid, clientRequestId: reportId });
      clearBugReportDraft(uid);
      onOpenChange(false);
    } catch {
      setError(true);
    } finally {
      setSending(false);
    }
  };

  const emailHref = `mailto:contact@strengthsave.app?subject=${encodeURIComponent(t('bugReport.emailSubject'))}`;
  const invalid = hasAttempted && message.trim().length < 20;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md grid-rows-[auto_minmax(0,1fr)_auto] overflow-hidden" data-testid="bug-report-dialog">
        <DialogHeader>
          <DialogTitle className="font-heading uppercase tracking-tight">{t('bugReport.title')}</DialogTitle>
          <DialogDescription>{t('bugReport.description')}</DialogDescription>
        </DialogHeader>

        <div
          className="min-h-0 space-y-4 overflow-y-auto px-1"
          data-testid="bug-report-scroll-region"
        >
          <div className="space-y-1.5">
            <Label htmlFor="bug-report-category">{t('bugReport.category')}</Label>
            <Select value={category} onValueChange={(value) => setCategory(value as BugReportCategory)}>
              <SelectTrigger
                id="bug-report-category"
                aria-label={t('bugReport.category')}
                className="focus:ring-inset focus:ring-offset-0"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(['workout', 'sync', 'ui', 'crash', 'account', 'other'] as const).map((value) => (
                  <SelectItem key={value} value={value}>{t(`bugReport.category.${value}`)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="bug-report-message">{t('bugReport.message')}</Label>
            <Textarea
              id="bug-report-message"
              value={message}
              onChange={(event) => setMessage(event.target.value.slice(0, 4000))}
              placeholder={t('bugReport.messagePlaceholder')}
              maxLength={4000}
              className="min-h-32 resize-y"
              aria-invalid={invalid}
            />
            <div className="flex justify-between gap-3 text-xs text-muted-foreground">
              <span className={invalid ? 'text-destructive' : undefined}>{t('bugReport.messageHint')}</span>
              <span className="font-mono tabular-nums">{message.length}/4000</span>
            </div>
          </div>

          <input
            ref={fileInputRef}
            data-testid="bug-report-file-input"
            className="hidden"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={(event) => {
              const file = event.target.files?.[0] ?? null;
              event.target.value = '';
              if (file) {
                setAttachment(file);
                void consumeRecoveredBugReportAttachment({ uid, clientRequestId: reportId });
              }
            }}
          />
          {attachment ? (
            <div className="flex items-center justify-between gap-3 rounded-xl border border-border bg-surface-container p-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{attachment.name}</p>
                <p className="text-xs text-muted-foreground">{t('bugReport.screenshotReady')}</p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setAttachment(null);
                  void consumeRecoveredBugReportAttachment({ uid, clientRequestId: reportId });
                }}
              >
                <Trash2 className="mr-1.5 h-4 w-4" />{t('bugReport.removeScreenshot')}
              </Button>
            </div>
          ) : (
            <Button type="button" variant="outline" className="w-full" onClick={() => void pickScreenshot()}>
              <ImagePlus className="mr-2 h-4 w-4" />{t('bugReport.addScreenshot')}
            </Button>
          )}

          <p className="text-xs text-muted-foreground">{t('bugReport.privacy')}</p>
          {error && (
            <div role="alert" className="rounded-xl border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
              <p>{t('bugReport.error')}</p>
              <a className="mt-2 inline-flex items-center underline underline-offset-2" href={emailHref}>
                <Mail className="mr-1.5 h-4 w-4" />{t('bugReport.emailFallback')}
              </a>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>{t('common.cancel')}</Button>
          <Button type="button" disabled={sending} onClick={() => void send()}>
            {sending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
            {error ? t('bugReport.retry') : t('bugReport.send')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
