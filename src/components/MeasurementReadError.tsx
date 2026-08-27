import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTranslation } from '@/contexts/LanguageContext';

export const MeasurementReadError = ({ error, onRetry }: {
  error: string | null | undefined;
  onRetry: () => void;
}) => {
  const { t } = useTranslation();
  if (!error) return null;

  return (
    <div
      role="alert"
      className="rounded-2xl border border-destructive bg-destructive/10 p-4 text-destructive"
      data-testid="measurement-read-error"
    >
      <div className="flex items-start gap-3">
        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
        <div className="min-w-0 flex-1">
          <p className="font-semibold">{t('measurements.loadErrorTitle')}</p>
          <p className="mt-1 text-sm">{t('measurements.loadErrorDesc')}</p>
          <Button type="button" variant="outline" size="sm" className="mt-3" onClick={onRetry}>
            {t('measurements.loadErrorRetry')}
          </Button>
        </div>
      </div>
    </div>
  );
};
