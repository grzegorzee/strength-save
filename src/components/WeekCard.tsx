import { Check } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { useTranslation } from '@/contexts/LanguageContext';
import { useUnit } from '@/contexts/UnitContext';
import { cn, parseLocalDate } from '@/lib/utils';
import { dateLocale } from '@/i18n';
import type { WeekCardModel } from '@/lib/week-card';

// Karta tygodnia (Runna pakiet 1, spec B1): checkmarki dni + pasek sesji +
// tonaż tygodnia. Limonka wyłącznie dla sukcesu (ukończone/checkmark/fill),
// statusowe tła z przezroczystością (reguła #8).

interface WeekCardProps {
  model: WeekCardModel;
  isDeloadWeek?: boolean;
}

export const WeekCard = ({ model, isDeloadWeek }: WeekCardProps) => {
  const { t, lang } = useTranslation();
  const { fmtTonnage } = useUnit();

  if (!model.week) return null;

  const pct = model.sessionsPlanned > 0
    ? Math.min(100, Math.round((model.sessionsDone / model.sessionsPlanned) * 100))
    : 0;

  return (
    <Card data-testid="week-card">
      <CardContent className="px-5 py-4">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <p className="font-heading text-sm font-bold uppercase tracking-wide">
              {t('dash.week.title', { current: model.week.current, total: model.week.total })}
            </p>
            {isDeloadWeek && (
              <span className="rounded-full border border-fitness-warning bg-fitness-warning/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-fitness-warning">
                {t('dash.week.deload')}
              </span>
            )}
          </div>
          {model.tonnageKg > 0 && (
            <p className="text-sm font-bold tabular-nums text-muted-foreground">{fmtTonnage(model.tonnageKg)}</p>
          )}
        </div>

        <div className="mt-3 flex gap-1.5">
          {model.days.map((day) => {
            const label = parseLocalDate(day.date).toLocaleDateString(dateLocale(lang), { weekday: 'short' });
            return (
              <div key={day.date} className="flex flex-1 flex-col items-center gap-1" data-testid={`week-day-${day.date}`}>
                <div
                  className={cn(
                    'flex h-7 w-7 items-center justify-center rounded-full border text-[10px]',
                    day.status === 'done' && 'border-fitness-success bg-fitness-success/15 text-fitness-success',
                    day.status === 'planned' && 'border-primary/50 bg-primary/10',
                    day.status === 'skipped' && 'border-dashed border-muted-foreground/40 bg-transparent opacity-60',
                    day.status === 'rest' && 'border-transparent bg-surface-low',
                    day.isToday && 'ring-1 ring-primary/60',
                  )}
                >
                  {day.status === 'done' && <Check className="h-3.5 w-3.5" />}
                  {day.status === 'planned' && <span className="h-1.5 w-1.5 rounded-full bg-primary" />}
                </div>
                <span className="text-[9px] font-bold uppercase text-muted-foreground/60">{label}</span>
              </div>
            );
          })}
        </div>

        {model.sessionsPlanned > 0 && (
          <div className="mt-3">
            <div className="h-1.5 overflow-hidden rounded-full bg-surface-highest">
              <div className="h-full bg-fitness-success" style={{ width: `${pct}%` }} />
            </div>
            <p className="mt-1.5 text-xs text-muted-foreground">
              {t('dash.week.sessions', { done: model.sessionsDone, total: model.sessionsPlanned })}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
