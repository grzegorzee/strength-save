import { Check } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { useTranslation } from '@/contexts/LanguageContext';
import { useUnit } from '@/contexts/UnitContext';
import { cn, parseLocalDate } from '@/lib/utils';
import { dateLocale } from '@/i18n';
import type { WeekCardModel } from '@/lib/week-card';

// Karta tygodnia (Runna pakiet 1, spec B1; redesign fala 2 2026-08-20):
// nagłówek "N z M sesji" + tonaż i "TYDZ. x/y" mono, 7 POZIOMYCH segmentów
// (wypełniony = akcent primary), stopka "Dzisiaj zrobione · {dzień}".
// Statusy semantyczne (deload/warning) bez zmian, tła z przezroczystością
// (reguła #8). Pasek % zniknął — duplikat segmentów.

interface WeekCardProps {
  model: WeekCardModel;
  isDeloadWeek?: boolean;
  /** Nazwa dzisiejszego ukończonego dnia (stopka "Dzisiaj zrobione · {day}"). */
  todayDoneDayName?: string;
}

export const WeekCard = ({ model, isDeloadWeek, todayDoneDayName }: WeekCardProps) => {
  const { t, lang } = useTranslation();
  const { fmtTonnage } = useUnit();

  if (!model.week) return null;

  const todayDone = model.days.some((d) => d.isToday && d.status === 'done');

  return (
    <Card data-testid="week-card">
      <CardContent className="px-5 py-4">
        <div className="flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2">
            <p className="truncate text-[13px] font-medium text-foreground/90">
              {model.sessionsPlanned > 0
                ? t('dash.week.sessions', { done: model.sessionsDone, total: model.sessionsPlanned })
                : t('dash.week.title', { current: model.week.current, total: model.week.total })}
            </p>
            {isDeloadWeek && (
              <span className="shrink-0 rounded-full border border-fitness-warning bg-fitness-warning/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-fitness-warning">
                {t('dash.week.deload')}
              </span>
            )}
          </div>
          <p className="shrink-0 font-mono text-xs uppercase tracking-[0.08em] tabular-nums text-muted-foreground">
            {model.tonnageKg > 0 && `${fmtTonnage(model.tonnageKg)} · `}
            {t('dash.week.short', { current: model.week.current, total: model.week.total })}
          </p>
        </div>

        <div className="mt-3 flex gap-1.5">
          {model.days.map((day) => {
            const label = parseLocalDate(day.date).toLocaleDateString(dateLocale(lang), {
              weekday: 'long', day: 'numeric', month: 'long',
            });
            return (
              <div
                key={day.date}
                data-testid={`week-day-${day.date}`}
                role="img"
                aria-label={`${label}: ${t(`dash.week.day.${day.status}` as Parameters<typeof t>[0])}`}
                title={label}
                className={cn(
                  'h-1.5 flex-1 rounded-full',
                  day.status === 'done' && 'bg-primary',
                  day.status === 'planned' && 'bg-primary/25',
                  day.status === 'skipped' && 'bg-muted-foreground/20 opacity-60',
                  day.status === 'rest' && 'bg-surface-highest',
                  day.isToday && 'ring-1 ring-primary/60',
                )}
              />
            );
          })}
        </div>

        {todayDone && todayDoneDayName && (
          <p className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
            <Check className="h-3 w-3 shrink-0" aria-hidden />
            {t('dash.week.doneToday', { day: todayDoneDayName })}
          </p>
        )}
      </CardContent>
    </Card>
  );
};
