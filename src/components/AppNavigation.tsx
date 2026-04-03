import { useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { Home, Calendar, Trophy, BarChart3, X, Library, History, ScrollText, ChevronLeft, ChevronRight, LogOut, Settings, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { useCurrentUser } from '@/contexts/UserContext';
import { useAuth } from '@/hooks/useAuth';

interface AppNavigationProps {
  isOpen?: boolean;
  onClose?: () => void;
}

const navItems = [
  { to: '/', icon: Home, label: 'Dashboard' },
  { to: '/plan', icon: Calendar, label: 'Plan treningowy' },
  { to: '/history', icon: ScrollText, label: 'Historia' },
  { to: '/exercises', icon: Library, label: 'Ćwiczenia' },
  { to: '/analytics', icon: BarChart3, label: 'Analityka' },
  { to: '/achievements', icon: Trophy, label: 'Osiągnięcia' },
  { to: '/cycles', icon: History, label: 'Cykle' },
];

const STORAGE_KEY = 'sidebar-collapsed';

export const AppNavigation = ({ isOpen, onClose }: AppNavigationProps) => {
  const navigate = useNavigate();
  const { profile, isAdmin } = useCurrentUser();
  const { logout } = useAuth();

  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) === 'true';
    } catch {
      return false;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, String(collapsed));
    } catch {
      // ignore
    }
  }, [collapsed]);

  const displayName = profile?.displayName || 'Trener';
  const photoURL = profile?.photoURL || '';
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
        "fixed inset-y-0 left-0 z-50 bg-sidebar border-r border-sidebar-border transform transition-all duration-300 md:translate-x-0 md:sticky md:top-0 md:h-[100dvh] md:self-start",
        collapsed ? "md:w-16" : "md:w-64",
        "w-64", // mobile always full width
        isOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="flex flex-col h-full">
          {/* Logo + collapse toggle */}
          <div className="flex items-center justify-between h-16 px-5 border-b border-sidebar-border">
            {collapsed ? (
              <div className="hidden md:flex items-center justify-center w-full">
                <div className="h-8 w-8 rounded-lg bg-primary/15 flex items-center justify-center">
                  <span className="text-primary font-heading font-bold text-sm">SS</span>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-lg bg-primary/15 flex items-center justify-center">
                  <span className="text-primary font-heading font-bold text-sm">SS</span>
                </div>
                <span className="font-heading font-bold text-lg text-foreground">FitTracker</span>
              </div>
            )}
            {/* Mobile: full logo + close. Desktop collapsed: just SS icon shown above */}
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setCollapsed(prev => !prev)}
                className="hidden md:flex h-8 w-8"
              >
                {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
              </Button>
              <Button variant="ghost" size="icon" onClick={onClose} className="md:hidden h-8 w-8">
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Nav items */}
          <div className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
            {navItems.map((item) => {
              const link = (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={onClose}
                  className={({ isActive }) => cn(
                    "flex items-center gap-3 rounded-lg transition-all duration-200 text-sm font-medium",
                    collapsed ? "md:justify-center md:px-0 md:py-2.5 px-3 py-2.5" : "px-3 py-2.5",
                    isActive
                      ? "bg-primary/15 text-primary"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  <item.icon className="h-4.5 w-4.5 shrink-0" />
                  <span className={cn(collapsed && "md:hidden")}>{item.label}</span>
                </NavLink>
              );

              if (collapsed) {
                return (
                  <Tooltip key={item.to}>
                    <TooltipTrigger asChild className="hidden md:flex">
                      {link}
                    </TooltipTrigger>
                    <TooltipContent side="right" className="hidden md:block">
                      {item.label}
                    </TooltipContent>
                  </Tooltip>
                );
              }

              return link;
            })}
          </div>

          {/* Bottom section — user dropdown */}
          <div className="px-3 pb-4">
            <div className="pt-3 border-t border-sidebar-border">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className={cn(
                    "flex items-center gap-3 w-full rounded-lg px-3 py-2 hover:bg-muted transition-colors cursor-pointer",
                    collapsed && "md:justify-center md:px-0"
                  )}>
                    {photoURL ? (
                      <img src={photoURL} alt={displayName} className="h-9 w-9 rounded-full shrink-0 object-cover" referrerPolicy="no-referrer" />
                    ) : (
                      <div className="h-9 w-9 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white text-xs font-bold shrink-0">
                        {initials}
                      </div>
                    )}
                    <div className={cn("flex-1 min-w-0 text-left", collapsed && "md:hidden")}>
                      <p className="text-sm font-medium text-foreground truncate">{displayName}</p>
                      <p className="text-[10px] text-muted-foreground">v{__APP_VERSION__}</p>
                    </div>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent side="top" align="start" className="w-52 mb-2">
                  <div className="px-2 py-1.5 border-b mb-1">
                    <p className="text-sm font-medium">{displayName}</p>
                    {profile?.email && (
                      <p className="text-xs text-muted-foreground truncate">{profile.email}</p>
                    )}
                    <p className="text-[10px] text-muted-foreground mt-0.5">v{__APP_VERSION__}</p>
                  </div>
                  <DropdownMenuItem onClick={() => { onClose?.(); navigate('/settings'); }} className="cursor-pointer">
                    <Settings className="h-4 w-4 mr-2" />
                    Ustawienia
                  </DropdownMenuItem>
                  {isAdmin && (
                    <DropdownMenuItem onClick={() => { onClose?.(); navigate('/admin'); }} className="cursor-pointer">
                      <Shield className="h-4 w-4 mr-2" />
                      Admin
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={logout} className="cursor-pointer">
                    <LogOut className="h-4 w-4 mr-2" />
                    Wyloguj się
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </nav>
    </>
  );
};
