import { CalendarClock, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useTranslation } from '@/contexts/LanguageContext';
import { dateLocale } from '@/i18n';
import { displayDayNameForDateISO } from '@/lib/plan-i18n';
import { formatLocalDateLabel } from '@/lib/utils';
import type { Lapse } from '@/lib/lapse-detection';

export const LapseStatusCard = ({
  lapse,
  onOpen,
  onDismiss,
}: {
  lapse: Lapse;
  onOpen: () => void;
  onDismiss: () => void;
}) => {
  const { t, lang } = useTranslation();
  // B3 (X70): data krotka, bez nazwy dnia — "z poniedziałek, 24 sierpnia"
  // lamalo fleksje; dzien tygodnia niesie {day} w mianowniku.
  const dateLabel = formatLocalDateLabel(lapse.dateISO, dateLocale(lang), {
    day: 'numeric', month: 'long',
  });
  // WP-L (X30): domyslna nazwa weekday podaza za date zaleglosci.
  const description = lapse.kind === 'stale-session' && lapse.day
    ? t('lapse.staleDesc', { day: displayDayNameForDateISO(lapse.day.dayName, lapse.day.weekday, lapse.dateISO, lang), date: dateLabel })
    : t('lapse.weekDesc');

  return (
    <Card data-testid="lapse-status-card" className="border-fitness-warning bg-fitness-warning/10">
      <CardContent className="flex items-start gap-3 p-4">
        <CalendarClock className="mt-0.5 h-5 w-5 shrink-0 text-fitness-warning" />
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-fitness-warning">{t('lapse.title')}</p>
          <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>
          <Button type="button" size="sm" variant="outline" className="mt-3 min-h-11" onClick={onOpen}>
            {t('lapse.viewOptions')}
          </Button>
        </div>
        <button
          type="button"
          aria-label={t('a11y.close')}
          onClick={onDismiss}
          className="flex h-11 w-11 shrink-0 touch-manipulation items-center justify-center rounded-lg text-muted-foreground hover:bg-fitness-warning/10"
        >
          <X className="h-4 w-4" />
        </button>
      </CardContent>
    </Card>
  );
};
