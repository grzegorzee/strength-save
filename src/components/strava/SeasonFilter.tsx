import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useTranslation } from '@/contexts/LanguageContext';

interface SeasonFilterProps {
  selectedYear: number;
  selectedMonth: number | 'all';
  onYearChange: (year: number) => void;
  onMonthChange: (month: number | 'all') => void;
  availableYears: number[];
}

const MONTH_KEYS = [
  'strava.monthJan', 'strava.monthFeb', 'strava.monthMar', 'strava.monthApr',
  'strava.monthMay', 'strava.monthJun', 'strava.monthJul', 'strava.monthAug',
  'strava.monthSep', 'strava.monthOct', 'strava.monthNov', 'strava.monthDec',
] as const;

export const SeasonFilter = ({
  selectedYear,
  selectedMonth,
  onYearChange,
  onMonthChange,
  availableYears,
}: SeasonFilterProps) => {
  const { t } = useTranslation();
  return (
  <div className="flex gap-2">
    <Select value={String(selectedYear)} onValueChange={(v) => onYearChange(Number(v))}>
      <SelectTrigger className="w-[100px] h-9">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {availableYears.map((y) => (
          <SelectItem key={y} value={String(y)}>{y}</SelectItem>
        ))}
      </SelectContent>
    </Select>
    <Select value={String(selectedMonth)} onValueChange={(v) => onMonthChange(v === 'all' ? 'all' : Number(v))}>
      <SelectTrigger className="w-[140px] h-9">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">{t('strava.wholeYear')}</SelectItem>
        {MONTH_KEYS.map((key, i) => (
          <SelectItem key={i} value={String(i + 1)}>{t(key)}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  </div>
  );
};
