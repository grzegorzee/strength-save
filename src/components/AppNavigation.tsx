import { NavLink } from 'react-router-dom';
import { Home, Calendar, CalendarDays, Ruler, Trophy, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface AppNavigationProps {
  isOpen?: boolean;
  onClose?: () => void;
}

const navItems = [
  { to: '/', icon: Home, label: 'Dashboard' },
  { to: '/day', icon: CalendarDays, label: 'Plan dnia' },
  { to: '/plan', icon: Calendar, label: 'Plan tygodniowy' },
  { to: '/measurements', icon: Ruler, label: 'Pomiary' },
  { to: '/achievements', icon: Trophy, label: 'Osiągnięcia' },
];

export const AppNavigation = ({ isOpen, onClose }: AppNavigationProps) => {
  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40 md:hidden"
          onClick={onClose}
        />
      )}
      
      {/* Sidebar */}
      <nav className={cn(
        "fixed inset-y-0 left-0 z-50 w-64 bg-card border-r transform transition-transform duration-200 md:translate-x-0 md:static",
        isOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="flex flex-col h-full">
          <div className="flex items-center justify-between h-16 px-4 border-b">
            <span className="font-bold text-lg text-primary">FitTracker</span>
            <Button variant="ghost" size="icon" onClick={onClose} className="md:hidden">
              <X className="h-5 w-5" />
            </Button>
          </div>
          
          <div className="flex-1 p-4 space-y-2">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={onClose}
                className={({ isActive }) => cn(
                  "flex items-center gap-3 px-4 py-3 rounded-xl transition-colors font-medium",
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <item.icon className="h-5 w-5" />
                {item.label}
              </NavLink>
            ))}
          </div>

          <div className="p-4 border-t">
            <div className="bg-muted/50 rounded-xl p-4">
              <p className="text-sm font-medium">Aktywny plan</p>
              <p className="text-xs text-muted-foreground mt-1">
                Plan Treningowy 2026
              </p>
              <p className="text-[10px] text-muted-foreground/50 mt-2">
                Wersja: v2.2.0
              </p>
            </div>
          </div>
        </div>
      </nav>
    </>
  );
};
