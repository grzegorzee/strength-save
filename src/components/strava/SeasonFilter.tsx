import { Badge } from '@/components/ui/badge';
import type { SeasonYear } from '@/lib/strava-utils';

interface SeasonFilterProps {
  selectedYear: SeasonYear;
  onYearChange: (year: SeasonYear) => void;
  availableYears: number[];
}

export const SeasonFilter = ({ selectedYear, onYearChange, availableYears }: SeasonFilterProps) => (
  <div className="flex flex-wrap gap-2">
    <Badge
      variant={selectedYear === 'all' ? 'default' : 'outline'}
      className="cursor-pointer"
      onClick={() => onYearChange('all')}
    >
      Wszystko
    </Badge>
    {availableYears.map((y) => (
      <Badge
        key={y}
        variant={selectedYear === y ? 'default' : 'outline'}
        className="cursor-pointer"
        onClick={() => onYearChange(y)}
      >
        {y}
      </Badge>
    ))}
  </div>
);
