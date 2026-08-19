import { useState } from 'react';
import { AlertCircle, Cloud, Loader2, RotateCcw, Trash2, X } from 'lucide-react';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { Button } from '@/components/ui/button';
import { useTranslation } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';

type WorkoutDraftStatusNoticeProps = {
  kind: 'final-sync-pending' | 'save-error';
  message?: string;
  busy?: boolean;
  onRetry: () => void;
  onDiscard: () => void;
  onDismiss: () => void;
};

type WorkoutErrorNoticeProps = {
  message: string;
  onDismiss: () => void;
};

export const WorkoutErrorNotice = ({ message, onDismiss }: WorkoutErrorNoticeProps) => {
  const { t } = useTranslation();
  return (
    <section role="alert" className="rounded-xl border border-destructive bg-destructive/10 p-3 text-destructive">
      <div className="flex items-center gap-2">
        <AlertCircle className="h-5 w-5 shrink-0" />
        <span className="min-w-0 flex-1 text-sm">{message}</span>
        <button
          type="button"
          aria-label={t('workout.close')}
          onClick={onDismiss}
          className="flex min-h-11 min-w-11 shrink-0 touch-manipulation items-center justify-center rounded-lg transition-colors hover:bg-destructive/15"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </section>
  );
};

export const WorkoutDraftStatusNotice = ({
  kind,
  message,
  busy = false,
  onRetry,
  onDiscard,
  onDismiss,
}: WorkoutDraftStatusNoticeProps) => {
  const { t } = useTranslation();
  const [discardConfirmOpen, setDiscardConfirmOpen] = useState(false);
  const pending = kind === 'final-sync-pending';

  return (
    <>
      <section
        role="status"
        className={cn(
          'rounded-xl border p-3',
          pending
            ? 'border-fitness-warning bg-fitness-warning/10 text-fitness-warning'
            : 'border-destructive bg-destructive/10 text-destructive',
        )}
      >
        <div className="flex items-start gap-2">
          {pending
            ? <Cloud className="mt-0.5 h-5 w-5 shrink-0" />
            : <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />}
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium">
              {pending ? t('workout.finishedLocally.title') : t('workout.toast.localSaveErrorTitle')}
            </p>
            <p className="mt-0.5 text-xs opacity-90">
              {message ?? (pending ? t('workout.finishedLocally.desc') : t('workout.err.localSaveFailed'))}
            </p>
          </div>
          <button
            type="button"
            aria-label={t('workout.close')}
            onClick={onDismiss}
            className="flex min-h-11 min-w-11 shrink-0 touch-manipulation items-center justify-center rounded-lg transition-colors hover:bg-current/10"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="mt-2 flex flex-wrap gap-2 pl-7">
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="min-h-11 touch-manipulation border-current text-current hover:bg-current/10"
            onClick={onRetry}
            disabled={busy}
          >
            {busy
              ? <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              : pending
                ? <Cloud className="mr-2 h-4 w-4" />
                : <RotateCcw className="mr-2 h-4 w-4" />}
            {pending ? t('strava.syncNow') : t('workout.retryLocalSave')}
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="min-h-11 touch-manipulation text-current hover:bg-current/10 hover:text-current"
            onClick={() => setDiscardConfirmOpen(true)}
            disabled={busy}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            {t('strava.deleteDraft')}
          </Button>
        </div>
      </section>

      <ConfirmDialog
        open={discardConfirmOpen}
        onOpenChange={setDiscardConfirmOpen}
        title={t('workout.discardDraftConfirmTitle')}
        description={t('workout.discardDraftConfirmDesc')}
        confirmLabel={t('strava.deleteDraft')}
        destructive
        onConfirm={onDiscard}
      />
    </>
  );
};
