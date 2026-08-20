import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn, formatLocalDate, parseLocalDate } from '@/lib/utils';
import { dateLocale } from '@/i18n';
import { useTranslation } from '@/contexts/LanguageContext';
import { nextRangeSelection, type DateRangeValue } from '@/lib/date-range-select';

// T20.1 (feedback 2026-08-20): własny lekki kalendarz zakresów w stylu Booking
// (zero nowych zależności — decyzja w DECYZJE.md). Klik = początek, drugi klik
// = koniec, dni pomiędzy podświetlone tokenem akcentu (bg-primary/15, zasada 8).
// Tydzień ZAWSZE od poniedziałku (spójnie z logiką tygodni w apce, także przy
// en). Nazwy miesięcy/dni przez Intl.DateTimeFormat(dateLocale(lang)) — język
// APKI, nie systemu (pułapka T18). Daty tylko przez parseLocalDate/
// formatLocalDate (nigdy new Date(iso) na stringu).

interface RangeCalendarProps {
  value: DateRangeValue;
  onChange: (value: DateRangeValue) => void;
  /** ISO YYYY-MM-DD; dni wcześniejsze są wyłączone. */
  minDate?: string;
  /** ISO YYYY-MM-DD; dni późniejsze są wyłączone. */
  maxDate?: string;
  /** Miesiąc startowy (ISO dowolnego dnia); domyślnie from albo dziś. */
  initialMonth?: string;
  testId?: string;
}

/** Pierwszy dzień miesiąca dla dowolnej daty ISO. */
const monthStartISO = (iso: string): string => `${iso.slice(0, 7)}-01`;

/** 2024-01-01 to poniedziałek — baza do etykiet dni tygodnia przez Intl. */
const WEEKDAY_BASE = new Date(2024, 0, 1);

export const RangeCalendar = ({
  value, onChange, minDate, maxDate, initialMonth, testId = 'range-calendar',
}: RangeCalendarProps) => {
  const { t, lang } = useTranslation();
  const [monthISO, setMonthISO] = useState(() =>
    monthStartISO(value.from ?? initialMonth ?? formatLocalDate(new Date())));

  const locale = dateLocale(lang);
  const first = parseLocalDate(monthISO);
  const year = first.getFullYear();
  const month = first.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const leadingBlanks = (first.getDay() + 6) % 7; // poniedziałek = 0
  const todayISO = formatLocalDate(new Date());

  const monthLabel = new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric' }).format(first);
  const weekdayFmt = new Intl.DateTimeFormat(locale, { weekday: 'short' });
  const dayFmt = new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'long', year: 'numeric' });

  const shiftMonth = (delta: number) =>
    setMonthISO(formatLocalDate(new Date(year, month + delta, 1)));

  const hasFullRange = value.from !== null && value.to !== null;

  return (
    <div data-testid={testId}>
      <div className="flex items-center justify-between">
        <button
          type="button"
          aria-label={t('range.prevMonth')}
          data-testid={`${testId}-prev`}
          onClick={() => shiftMonth(-1)}
          className="flex h-10 w-10 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <p
          data-testid={`${testId}-month`}
          className="text-sm font-semibold capitalize text-foreground"
          aria-live="polite"
        >
          {monthLabel}
        </p>
        <button
          type="button"
          aria-label={t('range.nextMonth')}
          data-testid={`${testId}-next`}
          onClick={() => shiftMonth(1)}
          className="flex h-10 w-10 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>
      <div className="mt-1 grid grid-cols-7">
        {Array.from({ length: 7 }, (_, i) => (
          <p key={i} className="py-1 text-center text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
            {weekdayFmt.format(new Date(WEEKDAY_BASE.getFullYear(), WEEKDAY_BASE.getMonth(), WEEKDAY_BASE.getDate() + i))}
          </p>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-y-0.5">
        {Array.from({ length: leadingBlanks }, (_, i) => (
          <div key={`blank-${i}`} />
        ))}
        {Array.from({ length: daysInMonth }, (_, i) => {
          const date = new Date(year, month, i + 1);
          const iso = formatLocalDate(date);
          const isFrom = iso === value.from;
          const isTo = iso === value.to;
          const selected = isFrom || isTo;
          const inRange = hasFullRange && value.from !== null && value.to !== null
            && iso > value.from && iso < value.to;
          const inBand = hasFullRange && value.from !== null && value.to !== null
            && iso >= value.from && iso <= value.to;
          const disabled = (!!minDate && iso < minDate) || (!!maxDate && iso > maxDate);
          return (
            <div
              key={iso}
              className={cn(
                // Pasek ciągły: tło zakresu na komórce (bez gap-x), zaokrąglenia
                // tylko na krańcach — zasada 8: tło z przezroczystością.
                inBand && 'bg-primary/15',
                isFrom && 'rounded-l-full',
                isTo && 'rounded-r-full',
              )}
            >
              <button
                type="button"
                data-day={iso}
                {...(selected ? { 'data-selected': 'true' } : {})}
                {...(inRange ? { 'data-in-range': 'true' } : {})}
                aria-label={dayFmt.format(date)}
                aria-pressed={selected}
                disabled={disabled}
                onClick={() => onChange(nextRangeSelection(value, iso))}
                className={cn(
                  'flex h-10 w-full items-center justify-center rounded-full text-sm tabular-nums transition-colors',
                  selected
                    ? 'bg-primary font-semibold text-primary-foreground'
                    : inRange
                      ? 'text-foreground'
                      : 'text-foreground hover:bg-muted',
                  disabled && 'text-muted-foreground/40 hover:bg-transparent',
                  iso === todayISO && !selected && 'ring-1 ring-primary/50',
                )}
              >
                {i + 1}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};
