import { NavLink } from 'react-router-dom';
import { Home, Calendar, CalendarDays, Trophy, BarChart3, MessageCircle, X, Library, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useCurrentUser } from '@/contexts/UserContext';

interface AppNavigationProps {
  isOpen?: boolean;
  onClose?: () => void;
}

const navItems = [
  { to: '/', icon: Home, label: 'Dashboard' },
  { to: '/day', icon: CalendarDays, label: 'Plan dnia' },
  { to: '/plan', icon: Calendar, label: 'Plan treningowy' },
  { to: '/exercises', icon: Library, label: 'Ćwiczenia' },
  { to: '/analytics', icon: BarChart3, label: 'Analityka' },
  { to: '/achievements', icon: Trophy, label: 'Osiągnięcia' },
  { to: '/ai', icon: MessageCircle, label: 'AI Coach' },
];

const NavItem = ({ to, icon: Icon, label, onClick }: { to: string; icon: React.ElementType; label: string; onClick?: () => void }) => (
  <NavLink
    to={to}
    onClick={onClick}
    className={({ isActive }) => cn(
      "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 text-sm font-medium",
      isActive
        ? "bg-primary/15 text-primary"
        : "text-muted-foreground hover:bg-muted hover:text-foreground"
    )}
  >
    <Icon className="h-4.5 w-4.5" />
    {label}
  </NavLink>
);

export const AppNavigation = ({ isOpen, onClose }: AppNavigationProps) => {
  const { profile } = useCurrentUser();

  const displayName = profile?.displayName || 'Trener';
  const initials = displayName
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

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
        "fixed inset-y-0 left-0 z-50 w-64 bg-sidebar border-r border-sidebar-border transform transition-transform duration-200 md:translate-x-0 md:static",
        isOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center justify-between h-16 px-5 border-b border-sidebar-border">
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-lg bg-primary/15 flex items-center justify-center">
                <span className="text-primary font-heading font-bold text-sm">SS</span>
              </div>
              <span className="font-heading font-bold text-lg text-foreground">FitTracker</span>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose} className="md:hidden h-8 w-8">
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Nav items */}
          <div className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
            {navItems.map((item) => (
              <NavItem key={item.to} {...item} onClick={onClose} />
            ))}
          </div>

          {/* Bottom section */}
          <div className="px-3 pb-4 space-y-1">
            {/* Settings */}
            <NavItem to="/settings" icon={Settings} label="Ustawienia" onClick={onClose} />

            {/* User info */}
            <div className="mt-3 pt-3 border-t border-sidebar-border">
              <div className="flex items-center gap-3 px-3 py-2">
                <div className="h-9 w-9 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white text-xs font-bold shrink-0">
                  {initials}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{displayName}</p>
                  <p className="text-[10px] text-muted-foreground">v{__APP_VERSION__}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </nav>
    </>
  );
};
