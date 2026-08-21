import { CalendarRange } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { RangeCalendar } from '@/components/ui/range-calendar';
import { dateLocale } from '@/i18n';
import { useTranslation } from '@/contexts/LanguageContext';
import { cn, formatLocalDateLabel } from '@/lib/utils';
import type { DateRangeValue } from '@/lib/date-range-select';

// T20.2 (feedback 2026-08-20): pole zakresu dat dla miejsc bez miejsca na
// kalendarz inline (filtr Historii). Trigger pokazuje zakres w języku APKI
// (dateLocale, pułapka T18), popover mieści RangeCalendar + Wyczyść (zasada 6:
// stan filtra zawsze ma wyjście). NIE zagnieżdżać w Radix Dialog (WKWebView).

interface DateRangeFieldProps {
  value: DateRangeValue;
  onChange: (value: DateRangeValue) => void;
  minDate?: string;
  maxDate?: string;
  testId?: string;
}

export const DateRangeField = ({
  value, onChange, minDate, maxDate, testId = 'date-range-field',
}: DateRangeFieldProps) => {
  const { t, lang } = useTranslation();
  const fmt = (iso: string) =>
    formatLocalDateLabel(iso, dateLocale(lang), { day: 'numeric', month: 'short', year: 'numeric' });
  const label = value.from && value.to
    ? `${fmt(value.from)} → ${fmt(value.to)}`
    : value.from
      ? fmt(value.from)
      : t('range.pick');

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          data-testid={`${testId}-trigger`}
          className={cn('w-full justify-start font-normal', !value.from && 'text-muted-foreground')}
        >
          <CalendarRange className="mr-2 h-4 w-4" />
          {label}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-3" align="start">
        <RangeCalendar
          value={value}
          onChange={onChange}
          minDate={minDate}
          maxDate={maxDate}
          testId={`${testId}-calendar`}
        />
        <Button
          variant="ghost"
          size="sm"
          data-testid={`${testId}-clear`}
          className="mt-1 w-full"
          onClick={() => onChange({ from: null, to: null })}
        >
          {t('range.clear')}
        </Button>
      </PopoverContent>
    </Popover>
  );
};
