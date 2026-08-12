import { useRef } from 'react';
import { ArrowRightLeft } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { useTranslation } from '@/contexts/LanguageContext';
import { dateLocale } from '@/i18n';
import type { TrainingDay } from '@/data/trainingPlan';
import { resolvePlannedDay, type ScheduleOverrides } from '@/lib/plan-schedule';
import { localizeDayName } from '@/lib/plan-i18n';
import { cn, formatLocalDate, parseLocalDate } from '@/lib/utils';

/** Horyzont wyboru nowej daty (spec 2026-08-11: tylko dziś i do przodu, 14 dni). */
export const RESCHEDULE_HORIZON_DAYS = 14;

interface RescheduleSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Data źródłowa przełożenia (YYYY-MM-DD); null gdy sheet bez kontekstu. */
  fromDateISO: string | null;
  planDays: TrainingDay[];
  overrides: ScheduleOverrides;
  onSelect: (toDateISO: string) => void;
  /** Stabilne "dziś" dla testów; domyślnie bieżąca data lokalna. */
  todayISO?: string;
}

/**
 * Bottom sheet przełożenia treningu (spec 2026-08-11, punkt wejścia 1):
 * lista najbliższych 14 dni z zajętością — "wolne" albo nazwa treningu, który
 * tam siedzi, z zapowiedzią swapu. Bez undo-toastu: cofnięcie = ponowne
 * przełożenie (mniej stanów).
 */
export const RescheduleSheet = ({
  open,
  onOpenChange,
  fromDateISO,
  planDays,
  overrides,
  onSelect,
  todayISO,
}: RescheduleSheetProps) => {
  const { t, lang } = useTranslation();
  const today = todayISO ?? formatLocalDate(new Date());

  // Regresja builda 92 (zwiecha po wyborze daty): zapis przełożenia ustawia
  // optymistycznie nowe overrides (data źródłowa -> null) ZANIM rodzic zamknie
  // sheet — resolver przestaje widzieć dzień źródłowy. Twardy `return null`
  // odmontowywał wtedy OTWARTY Radix Sheet bez przejścia open=false i body
  // zostawało ze scroll-lockiem (apka nie reagowała na taps). Dlatego kontekst
  // widoku ZAMRAŻAMY, dopóki jest kompletny; przy zamykaniu renderujemy ostatni
  // dobry stan i Radix domyka się kontrolowanie.
  const frozenRef = useRef<{ fromDateISO: string; fromDay: TrainingDay; overrides: ScheduleOverrides } | null>(null);
  if (fromDateISO) {
    const resolvedFromDay = resolvePlannedDay(fromDateISO, planDays, overrides);
    if (resolvedFromDay) frozenRef.current = { fromDateISO, fromDay: resolvedFromDay, overrides };
  }
  const frozen = frozenRef.current;
  if (!frozen) return null;
  const { fromDateISO: fromISO, fromDay } = frozen;

  const options: Array<{ dateISO: string; label: string; occupant: TrainingDay | null }> = [];
  const start = parseLocalDate(today);
  for (let offset = 0; offset < RESCHEDULE_HORIZON_DAYS; offset += 1) {
    const date = new Date(start);
    date.setDate(start.getDate() + offset);
    const dateISO = formatLocalDate(date);
    if (dateISO === fromISO) continue;
    options.push({
      dateISO,
      label: date.toLocaleDateString(dateLocale(lang), { weekday: 'long', day: 'numeric', month: 'short' }),
      occupant: resolvePlannedDay(dateISO, planDays, frozen.overrides),
    });
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="max-h-[92vh] overflow-y-auto rounded-t-2xl">
        <SheetHeader className="text-left">
          <SheetTitle>{t('reschedule.sheetTitle')}</SheetTitle>
          <SheetDescription>
            {t('reschedule.sheetDesc', {
              name: localizeDayName(fromDay.dayName, lang),
              date: parseLocalDate(fromISO).toLocaleDateString(dateLocale(lang), { day: 'numeric', month: 'short' }),
            })}
          </SheetDescription>
        </SheetHeader>
        <div className="mt-3 grid gap-2 pb-4">
          {options.map(({ dateISO, label, occupant }) => (
            <button
              key={dateISO}
              type="button"
              className={cn(
                'w-full rounded-xl border-0 bg-surface-low p-3 text-left transition-colors',
                'hover:bg-primary/[0.06] active:bg-primary/10',
              )}
              onClick={() => onSelect(dateISO)}
            >
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm font-medium capitalize">
                  {label}
                  {dateISO === today && (
                    <span className="ml-2 text-[11px] font-bold uppercase tracking-wide text-primary">
                      {t('reschedule.today')}
                    </span>
                  )}
                </span>
                {occupant ? (
                  <span className="flex items-center gap-1.5 text-xs text-fitness-warning">
                    <ArrowRightLeft className="h-3.5 w-3.5 shrink-0" />
                    <span className="truncate">
                      {localizeDayName(occupant.dayName, lang)} · {t('reschedule.swapNote')}
                    </span>
                  </span>
                ) : (
                  <span className="text-xs text-muted-foreground">{t('reschedule.free')}</span>
                )}
              </div>
            </button>
          ))}
        </div>
      </SheetContent>
    </Sheet>
  );
};
