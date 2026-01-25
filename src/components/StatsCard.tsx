import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';

interface StatsCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  variant?: 'default' | 'primary' | 'success' | 'warning';
}

export const StatsCard = ({ 
  title, 
  value, 
  subtitle, 
  icon: Icon,
  variant = 'default' 
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
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-start gap-4">
          <div className={cn(
            "h-12 w-12 rounded-xl flex items-center justify-center shrink-0",
            iconColors[variant]
          )}>
            <Icon className="h-6 w-6" />
          </div>
          <div className="min-w-0">
            <p className="text-sm text-muted-foreground truncate">{title}</p>
            <p className={cn(
              "text-2xl font-bold",
              valueColors[variant]
            )}>
              {value}
            </p>
            {subtitle && (
              <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
