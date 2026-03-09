import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { LucideIcon, ChevronRight } from 'lucide-react';

interface StatsCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  variant?: 'default' | 'primary' | 'success' | 'warning';
  onClick?: () => void;
}

export const StatsCard = ({
  title,
  value,
  subtitle,
  icon: Icon,
  variant = 'default',
  onClick,
}: StatsCardProps) => {
  const iconColors = {
    default: 'bg-secondary text-secondary-foreground',
    primary: 'bg-primary text-primary-foreground',
    success: 'bg-fitness-success text-white',
    warning: 'bg-fitness-warning text-white',
  };

  const valueColors = {
    default: 'text-foreground',
    primary: 'text-primary',
    success: 'text-fitness-success',
    warning: 'text-fitness-warning',
  };

  return (
    <Card
      className={cn(
        onClick && 'cursor-pointer hover:border-primary/30 transition-all duration-200'
      )}
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className={cn(
            "h-10 w-10 rounded-xl flex items-center justify-center shrink-0",
            iconColors[variant]
          )}>
            <Icon className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs text-muted-foreground leading-tight">{title}</p>
            <p className={cn(
              "text-xl font-heading font-bold leading-tight tracking-tight",
              valueColors[variant]
            )}>
              {value}
            </p>
            {subtitle && (
              <p className="text-[10px] text-muted-foreground mt-0.5 leading-tight">{subtitle}</p>
            )}
          </div>
          {onClick && (
            <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0 mt-1" />
          )}
        </div>
      </CardContent>
    </Card>
  );
};
