import appIcon from '@/assets/app-icon.png';
import { Button } from '@/components/ui/button';
import { useTranslation } from '@/contexts/LanguageContext';

interface BootScreenProps {
  slow?: boolean;
  onRetry?: () => void;
}

export const BootScreen = ({ slow = false, onRetry }: BootScreenProps) => {
  const { t } = useTranslation();
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-5 bg-background px-6 text-center">
      <img
        src={appIcon}
        alt="Strength Save"
        className="h-16 w-16 rounded-2xl"
      />
      <div
        role="progressbar"
        aria-label="Strength Save"
        aria-valuetext={t('common.loading')}
        className="h-0.5 w-24 overflow-hidden rounded-full bg-muted"
      >
        <div className="boot-progress-indicator h-full w-1/3 rounded-full bg-primary" />
      </div>
      {slow && (
        <div className="max-w-xs space-y-3" role="status">
          <p className="text-sm font-medium">{t('boot.slow.title')}</p>
          <p className="text-xs text-muted-foreground">{t('boot.slow.desc')}</p>
          {onRetry && <Button variant="outline" onClick={onRetry}>{t('boot.retry')}</Button>}
        </div>
      )}
    </div>
  );
};
