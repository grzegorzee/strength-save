import { Calendar, Dumbbell, Trophy, TrendingUp } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { PlanCycle } from '@/types/cycles';
import { cn } from '@/lib/utils';

interface Props {
  cycle: PlanCycle;
  onClick: () => void;
}

const formatDateRange = (startDate: string, endDate: string): string => {
  const fmt = (d: string) => {
    const date = new Date(d);
    return date.toLocaleDateString('pl-PL', { month: 'short', year: 'numeric' });
  };
  if (!endDate) return `${fmt(startDate)} — teraz`;
  return `${fmt(startDate)} — ${fmt(endDate)}`;
};

export const CycleCard = ({ cycle, onClick }: Props) => {
  const isActive = cycle.status === 'active';
  const tonnageT = (cycle.stats.totalTonnage / 1000).toFixed(1);

  return (
    <Card
      className={cn(
        'cursor-pointer hover:border-primary/30 transition-all duration-200',
        isActive && 'border-primary/40 bg-primary/5',
      )}
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">
              {formatDateRange(cycle.startDate, cycle.endDate)}
            </span>
          </div>
          <Badge variant={isActive ? 'default' : 'secondary'} className="text-xs">
            {isActive ? 'Aktywny' : `${cycle.durationWeeks} tyg.`}
          </Badge>
        </div>

        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-3 flex-wrap">
          <span>{cycle.days.length} dni/tydzień</span>
          <span>·</span>
          <span>{cycle.days.map(d => d.focus).join(', ')}</span>
        </div>

        <div className="grid grid-cols-4 gap-2">
          <div className="text-center">
            <div className="flex items-center justify-center mb-1">
              <Dumbbell className="h-3.5 w-3.5 text-primary" />
            </div>
            <p className="text-sm font-bold">{cycle.stats.totalWorkouts}</p>
            <p className="text-[10px] text-muted-foreground">Treningi</p>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center mb-1">
              <TrendingUp className="h-3.5 w-3.5 text-emerald-500" />
            </div>
            <p className="text-sm font-bold">{tonnageT}t</p>
            <p className="text-[10px] text-muted-foreground">Tonaż</p>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center mb-1">
              <Trophy className="h-3.5 w-3.5 text-amber-500" />
            </div>
            <p className="text-sm font-bold">{cycle.stats.prs.length}</p>
            <p className="text-[10px] text-muted-foreground">PRy</p>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center mb-1">
              <span className="text-xs">%</span>
            </div>
            <p className="text-sm font-bold">{cycle.stats.completionRate}%</p>
            <p className="text-[10px] text-muted-foreground">Frekwencja</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
