import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface SeasonFilterProps {
  selectedYear: number;
  selectedMonth: number | 'all';
  onYearChange: (year: number) => void;
  onMonthChange: (month: number | 'all') => void;
  availableYears: number[];
}

const MONTHS = [
  'Styczeń', 'Luty', 'Marzec', 'Kwiecień', 'Maj', 'Czerwiec',
  'Lipiec', 'Sierpień', 'Wrzesień', 'Październik', 'Listopad', 'Grudzień',
];

export const SeasonFilter = ({
  selectedYear,
  selectedMonth,
  onYearChange,
  onMonthChange,
  availableYears,
}: SeasonFilterProps) => (
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
        <SelectItem value="all">Cały rok</SelectItem>
        {MONTHS.map((name, i) => (
          <SelectItem key={i} value={String(i + 1)}>{name}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  </div>
);
