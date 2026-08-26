import { Cloud } from 'lucide-react';
import { useTranslation } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';

// WP-C (X38): pasywny wskaźnik "czeka na zapis w chmurze". Zastępuje toasty
// i baner z CTA dla zwykłego stanu "brak sieci": user nie ma nic do zrobienia,
// sync idzie sam (AutoSyncOnReconnect). Chmurka z kropką w kolorze akcentu.
// `compact` = sama ikona (wiersz Historii), domyślnie ikona + krótka etykieta.

interface CloudPendingIndicatorProps {
  compact?: boolean;
  className?: string;
}

export const CloudPendingIndicator = ({ compact = false, className }: CloudPendingIndicatorProps) => {
  const { t } = useTranslation();
  const label = t('sync.pendingIndicator');
  return (
    <span
      data-testid="cloud-pending-indicator"
      role="status"
      aria-label={label}
      title={label}
      className={cn(
        'inline-flex items-center gap-1.5 text-[11px] text-muted-foreground',
        !compact && 'rounded-full bg-surface-container px-3 py-1.5',
        className,
      )}
    >
      <span className="relative inline-flex shrink-0">
        <Cloud className="h-4 w-4" aria-hidden="true" />
        <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-primary" aria-hidden="true" />
      </span>
      {!compact && <span>{t('sync.pendingShort')}</span>}
    </span>
  );
};
