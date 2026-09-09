import { CloudUpload, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTranslation } from '@/contexts/LanguageContext';
import { useDashboardWorkoutSync } from '@/hooks/useDashboardWorkoutSync';

export const DashboardSyncBanner = ({ uid, onOpenSyncCenter }: {
  uid: string;
  onOpenSyncCenter: () => void;
}) => {
  const { t } = useTranslation();
  const { pending, busy, failed, needsAttention, retry } = useDashboardWorkoutSync(uid);
  if (!pending) return null;

  const message = busy ? 'dash.sync.compact.syncing'
    : needsAttention ? 'dash.sync.compact.attention'
      : failed ? 'dash.sync.compact.failed' : 'dash.sync.compact.saved';

  return (
    <div data-testid="dashboard-sync-banner" className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl border border-primary/20 bg-primary/5 px-3 py-2">
      <div role="status" aria-live="polite" className="flex min-w-0 flex-1 basis-36 items-center gap-2 text-xs text-muted-foreground">
        {busy ? <Loader2 className="h-4 w-4 shrink-0 animate-spin text-primary" aria-hidden="true" />
          : <CloudUpload className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />}
        <span>{t(message)}</span>
      </div>
      <Button variant="ghost" size="sm" className="min-h-11 shrink-0 px-2 text-xs text-primary" disabled={busy} onClick={() => void retry()}>
        {t('dash.sync.compact.retry')}
      </Button>
      {needsAttention && (
        <Button variant="link" size="sm" className="ml-auto min-h-11 px-2 text-xs" onClick={onOpenSyncCenter}>
          {t('dash.sync.compact.resolve')}
        </Button>
      )}
    </div>
  );
};
