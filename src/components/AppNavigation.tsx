import { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { Home, Calendar, CalendarDays, Ruler, Trophy, TrendingUp, BarChart3, PieChart, Sparkles, ChevronDown, Brain, ArrowRightLeft, FileText, Dumbbell, X } from 'lucide-react';
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
  { to: '/stats', icon: PieChart, label: 'Statystyki' },
];

const aiSubItems = [
  { tab: 'coach', icon: Brain, label: 'AI Coach' },
  { tab: 'swap', icon: ArrowRightLeft, label: 'AI Zamiennik' },
  { tab: 'summary', icon: FileText, label: 'AI Podsumowanie' },
  { tab: 'plan', icon: Dumbbell, label: 'AI Plan' },
];

const navItemsAfterAI = [
  { to: '/progress', icon: TrendingUp, label: 'Postępy' },
  { to: '/summary', icon: BarChart3, label: 'Podsumowanie' },
  { to: '/measurements', icon: Ruler, label: 'Pomiary' },
  { to: '/achievements', icon: Trophy, label: 'Osiągnięcia' },
];

const NavItem = ({ to, icon: Icon, label, onClick }: { to: string; icon: React.ElementType; label: string; onClick?: () => void }) => (
  <NavLink
    to={to}
    onClick={onClick}
    className={({ isActive }) => cn(
      "flex items-center gap-3 px-4 py-3 rounded-xl transition-colors font-medium",
      isActive
        ? "bg-primary text-primary-foreground"
        : "text-muted-foreground hover:bg-muted hover:text-foreground"
    )}
  >
    <Icon className="h-5 w-5" />
    {label}
  </NavLink>
);

export const AppNavigation = ({ isOpen, onClose }: AppNavigationProps) => {
  const location = useLocation();
  const isAIPage = location.pathname === '/ai';
  const [aiExpanded, setAIExpanded] = useState(isAIPage);

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

          <div className="flex-1 p-4 space-y-2 overflow-y-auto">
            {navItems.map((item) => (
              <NavItem key={item.to} {...item} onClick={onClose} />
            ))}

            {/* FitTracker AI — expandable */}
            <button
              onClick={() => setAIExpanded(prev => !prev)}
              className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-xl transition-colors font-medium w-full text-left",
                isAIPage
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <Sparkles className="h-5 w-5" />
              <span className="flex-1">FitTracker AI</span>
              <ChevronDown className={cn(
                "h-4 w-4 transition-transform",
                aiExpanded && "rotate-180"
              )} />
            </button>

            {aiExpanded && (
              <div className="ml-4 space-y-1">
                {aiSubItems.map((item) => {
                  const to = `/ai?tab=${item.tab}`;
                  const searchParams = new URLSearchParams(location.search);
                  const currentTab = searchParams.get('tab') || 'coach';
                  const isActive = isAIPage && currentTab === item.tab;

                  return (
                    <NavLink
                      key={item.tab}
                      to={to}
                      onClick={onClose}
                      className={cn(
                        "flex items-center gap-3 px-4 py-2.5 rounded-xl transition-colors font-medium text-sm",
                        isActive
                          ? "bg-primary text-primary-foreground"
                          : "text-muted-foreground hover:bg-muted hover:text-foreground"
                      )}
                    >
                      <item.icon className="h-4 w-4" />
                      {item.label}
                    </NavLink>
                  );
                })}
              </div>
            )}

            {navItemsAfterAI.map((item) => (
              <NavItem key={item.to} {...item} onClick={onClose} />
            ))}
          </div>

          <div className="p-4 border-t">
            <div className="bg-muted/50 rounded-xl p-4">
              <p className="text-sm font-medium">Aktywny plan</p>
              <p className="text-xs text-muted-foreground mt-1">
                Plan Treningowy 2026
              </p>
              <p className="text-[10px] text-muted-foreground/50 mt-2">
                Wersja: v3.2.0
              </p>
            </div>
          </div>
        </div>
      </nav>
    </>
  );
};
