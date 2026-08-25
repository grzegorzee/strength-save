import { useRef } from 'react';
import { ArrowRightLeft } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { useTranslation } from '@/contexts/LanguageContext';
import { dateLocale } from '@/i18n';
import type { TrainingDay } from '@/data/trainingPlan';
import { resolvePlannedDay, type ScheduleOverrides } from '@/lib/plan-schedule';
import { displayDayNameForDateISO } from '@/lib/plan-i18n';
import { cn, formatLocalDate, formatLocalDateLabel, parseLocalDate } from '@/lib/utils';

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
  /**
   * WP-A (X27): daty z ukończoną sesją (`completed === true`). Takie targety
   * zostają na liście, ale są disabled z dopiskiem — nie znikają.
   */
  completedDates?: ReadonlySet<string>;
  /**
   * WP-PLANS-2 (X27): start planu — dzień planowy istnieje dopiero od tej daty,
   * więc occupanci sprzed startu nie są pokazywani (guard siedzi w resolverze).
   */
  planStartDateISO?: string | null;
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
  completedDates,
  planStartDateISO,
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
  // WP-A (X29): świeże otwarcie (open false -> true) zeruje zamrożony kontekst,
  // żeby fallback poniżej nie odgrzewał danych z POPRZEDNIEGO cyklu otwarcia.
  const prevOpenRef = useRef(false);
  if (open && !prevOpenRef.current) frozenRef.current = null;
  prevOpenRef.current = open;
  if (fromDateISO) {
    const resolvedFromDay = resolvePlannedDay(fromDateISO, planDays, overrides, planStartDateISO);
    if (resolvedFromDay) frozenRef.current = { fromDateISO, fromDay: resolvedFromDay, overrides };
  }
  const frozen = frozenRef.current;
  if (!frozen) {
    // WP-A (X29): resolver nie widzi klikniętej daty (override null / data przed
    // startem planu) — dotychczasowy `return null` przy open=true dawał martwy
    // klik bez żadnej reakcji (zasada 6: każdy stan musi mieć wyjście). Sheet
    // zostaje ZAMONTOWANY i sterowany `open` (lekcja builda 92), a treść to
    // komunikat z przyciskiem zamknięcia.
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="bottom" className="max-h-[92vh] overflow-y-auto rounded-t-2xl">
          <SheetHeader className="text-left">
            <SheetTitle>{t('reschedule.sheetTitle')}</SheetTitle>
            <SheetDescription>{t('reschedule.unavailable')}</SheetDescription>
          </SheetHeader>
          <div className="mt-3 pb-4">
            <button
              type="button"
              className="w-full rounded-xl border-0 bg-surface-low p-3 text-center text-sm font-medium transition-colors hover:bg-primary/[0.06] active:bg-primary/10"
              onClick={() => onOpenChange(false)}
            >
              {t('common.close')}
            </button>
          </div>
        </SheetContent>
      </Sheet>
    );
  }
  const { fromDateISO: fromISO, fromDay } = frozen;

  const options: Array<{ dateISO: string; label: string; occupant: TrainingDay | null; completed: boolean }> = [];
  const start = parseLocalDate(today);
  for (let offset = 0; offset < RESCHEDULE_HORIZON_DAYS; offset += 1) {
    const date = new Date(start);
    date.setDate(start.getDate() + offset);
    const dateISO = formatLocalDate(date);
    if (dateISO === fromISO) continue;
    options.push({
      dateISO,
      label: date.toLocaleDateString(dateLocale(lang), { weekday: 'long', day: 'numeric', month: 'short' }),
      occupant: resolvePlannedDay(dateISO, planDays, frozen.overrides, planStartDateISO),
      completed: completedDates?.has(dateISO) ?? false,
    });
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="max-h-[92vh] overflow-y-auto rounded-t-2xl">
        <SheetHeader className="text-left">
          <SheetTitle>{t('reschedule.sheetTitle')}</SheetTitle>
          <SheetDescription>
            {/* WP-L (X30): domyslna nazwa weekday podaza za data zrodlowa. */}
            {t('reschedule.sheetDesc', {
              name: displayDayNameForDateISO(fromDay.dayName, fromDay.weekday, fromISO, lang),
              date: formatLocalDateLabel(fromISO, dateLocale(lang), { day: 'numeric', month: 'short' }),
            })}
          </SheetDescription>
        </SheetHeader>
        <div className="mt-3 grid gap-2 pb-4">
          {options.map(({ dateISO, label, occupant, completed }) => (
            <button
              key={dateISO}
              type="button"
              disabled={completed}
              aria-disabled={completed || undefined}
              className={cn(
                'w-full rounded-xl border-0 bg-surface-low p-3 text-left transition-colors',
                completed ? 'opacity-50' : 'hover:bg-primary/[0.06] active:bg-primary/10',
              )}
              onClick={() => { if (!completed) onSelect(dateISO); }}
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
                {completed ? (
                  <span className="text-xs text-muted-foreground">{t('reschedule.completedDay')}</span>
                ) : occupant ? (
                  <span className="flex items-center gap-1.5 text-xs text-fitness-warning">
                    <ArrowRightLeft className="h-3.5 w-3.5 shrink-0" />
                    <span className="truncate">
                      {displayDayNameForDateISO(occupant.dayName, occupant.weekday, dateISO, lang)} · {t('reschedule.swapNote')}
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
