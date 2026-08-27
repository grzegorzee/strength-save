import { useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { Home, Calendar, Trophy, Library, History, ScrollText, ChevronLeft, ChevronRight, LogOut, Settings, Shield, User, Ruler } from 'lucide-react';
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
import { maskEmail, readEmailVisible } from '@/lib/mask-email';
import { useCurrentUser } from '@/contexts/UserContext';
import { useAuth } from '@/hooks/useAuth';
import { useTranslation } from '@/contexts/LanguageContext';
import appIcon from '@/assets/app-icon.png';

interface AppNavigationProps {
  hideMobileNav?: boolean;
}

const navItems = [
  // D-T1: pierwsze 5 = mobilny bottom nav (Dzisiaj / Plan / Historia / Postępy /
  // Ćwiczenia). Profil przez avatar w headerze; Analytics w sidebarze do czasu
  // scalenia z Postępami (D-T4) — deep linki i trasy bez zmian.
  { to: '/', icon: Home, labelKey: 'nav.today' as const },
  { to: '/plan', icon: Calendar, labelKey: 'nav.plan' as const },
  { to: '/history', icon: ScrollText, labelKey: 'nav.history' as const },
  { to: '/achievements', icon: Trophy, labelKey: 'nav.progress' as const },
  { to: '/exercises', icon: Library, labelKey: 'nav.exercises' as const },
  // Pozostałe — sidebar (desktop)
  { to: '/measurements', icon: Ruler, labelKey: 'nav.measurements' as const },
  { to: '/cycles', icon: History, labelKey: 'nav.cycles' as const },
  { to: '/profile', icon: User, labelKey: 'nav.profile' as const },
];

// Boczne menu pogrupowane w sekcje (mniej przytłaczające niż płaska lista 9 pozycji).
const NAV_GROUPS = [
  { titleKey: 'nav.group.main' as const, paths: ['/', '/plan', '/history', '/exercises'] },
  { titleKey: 'nav.group.progress' as const, paths: ['/measurements', '/achievements', '/cycles'] },
  { titleKey: 'nav.group.account' as const, paths: ['/profile'] },
];

const STORAGE_KEY = 'sidebar-collapsed';

export const AppNavigation = ({ hideMobileNav = false }: AppNavigationProps) => {
  const navigate = useNavigate();
  const { profile, isAdmin } = useCurrentUser();
  const { logout } = useAuth();
  const { t } = useTranslation();

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

  const displayName = profile?.displayName || t('dash.defaultName');
  const photoURL = profile?.photoURL || '';
  const initials = displayName
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  // Pojedynczy link sidebara (z obsługą trybu zwiniętego = tooltip na desktopie).
  const renderLink = (item: typeof navItems[number]) => {
    const link = (
      <NavLink
        key={item.to}
        to={item.to}
        className={({ isActive }) => cn(
          "flex items-center gap-3 rounded-lg transition-all duration-200 text-sm font-medium",
          collapsed ? "desktop-shell:justify-center desktop-shell:px-0 desktop-shell:py-2.5 px-3 py-2.5" : "px-3 py-2.5",
          isActive
            ? "bg-primary/15 text-primary"
            : "text-muted-foreground hover:bg-muted hover:text-foreground"
        )}
      >
        <item.icon className="h-4.5 w-4.5 shrink-0" />
        <span className={cn(collapsed && "desktop-shell:hidden")}>{t(item.labelKey)}</span>
      </NavLink>
    );

    if (collapsed) {
      return (
        <Tooltip key={item.to}>
          <TooltipTrigger asChild className="hidden desktop-shell:flex">
            {link}
          </TooltipTrigger>
          <TooltipContent side="right" className="hidden desktop-shell:block">
            {t(item.labelKey)}
          </TooltipContent>
        </Tooltip>
      );
    }

    return link;
  };

  const sidebarBody = (
    <nav aria-label={t('nav.ariaMain')} className="h-full bg-sidebar">
        <div className="flex flex-col h-full pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]">
          {/* Logo + collapse toggle */}
          <div className="flex items-center justify-between h-16 px-5 border-b border-sidebar-border">
            {collapsed ? (
              <div className="hidden desktop-shell:flex items-center justify-center w-full">
                <img src={appIcon} alt="Strength Save" className="h-8 w-8 rounded-lg" />
              </div>
            ) : (
              <div className="flex items-center gap-2.5">
                <img src={appIcon} alt="" className="h-8 w-8 rounded-lg" />
                <span className="font-heading font-bold text-lg text-foreground">Strength Save</span>
              </div>
            )}
            {/* Mobile: full logo + close. Desktop collapsed: just SS icon shown above */}
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setCollapsed(prev => !prev)}
                className="hidden desktop-shell:flex h-8 w-8"
                aria-label={collapsed ? t('nav.expand') : t('nav.collapse')}
              >
                {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
              </Button>
            </div>
          </div>

          {/* Nav items — pogrupowane w sekcje */}
          <div className="flex-1 px-3 py-4 space-y-5 overflow-y-auto">
            {NAV_GROUPS.map((group) => (
              <div key={group.titleKey} className="space-y-1">
                {!collapsed && (
                  <p className="px-3 pb-1 text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
                    {t(group.titleKey)}
                  </p>
                )}
                {group.paths.map((path) => {
                  const item = navItems.find((i) => i.to === path);
                  return item ? renderLink(item) : null;
                })}
              </div>
            ))}
          </div>

          {/* Bottom section — user dropdown */}
          <div className="px-3 pb-4">
            <div className="pt-3 border-t border-sidebar-border">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className={cn(
                    "flex items-center gap-3 w-full rounded-lg px-3 py-2 hover:bg-muted transition-colors cursor-pointer",
                    collapsed && "desktop-shell:justify-center desktop-shell:px-0"
                  )}>
                    {photoURL ? (
                      <img src={photoURL} alt={displayName} className="h-9 w-9 rounded-full shrink-0 object-cover" referrerPolicy="no-referrer" />
                    ) : (
                      <div className="h-9 w-9 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white text-xs font-bold shrink-0">
                        {initials}
                      </div>
                    )}
                    <div className={cn("flex-1 min-w-0 text-left", collapsed && "desktop-shell:hidden")}>
                      <p className="text-sm font-medium text-foreground truncate">{displayName}</p>
                      <p className="text-[10px] text-muted-foreground">v{__APP_VERSION__}</p>
                    </div>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent side="top" align="start" className="w-52 mb-2">
                  <div className="px-2 py-1.5 border-b mb-1">
                    <p className="text-sm font-medium">{displayName}</p>
                    {profile?.email && (
                      // WP-G (X29): ta sama maska co w Profilu; toggle żyje tylko
                      // w Profilu, bez title z pełnym adresem (to obejście maski).
                      <p className="text-xs text-muted-foreground truncate">
                        {readEmailVisible() ? profile.email : maskEmail(profile.email)}
                      </p>
                    )}
                    <p className="text-[10px] text-muted-foreground mt-0.5">v{__APP_VERSION__}</p>
                  </div>
                  {/* X35b: /settings zniknęło — wszystkie ustawienia żyją w Profilu. */}
                  <DropdownMenuItem onClick={() => navigate('/profile')} className="cursor-pointer">
                    <Settings className="h-4 w-4 mr-2" />
                    {t('nav.profile')}
                  </DropdownMenuItem>
                  {isAdmin && (
                    <DropdownMenuItem onClick={() => navigate('/admin')} className="cursor-pointer">
                      <Shield className="h-4 w-4 mr-2" />
                      {t('nav.admin')}
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={logout} className="cursor-pointer">
                    <LogOut className="h-4 w-4 mr-2" />
                    {t('nav.logout')}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </nav>
  );

  return (
    <>
      <aside
        className={cn(
          "hidden bg-sidebar border-r border-sidebar-border transition-all duration-300 desktop-shell:sticky desktop-shell:top-0 desktop-shell:block desktop-shell:h-[100dvh] desktop-shell:self-start",
          collapsed ? "desktop-shell:w-16" : "desktop-shell:w-64",
        )}
      >
        {sidebarBody}
      </aside>

      {/* Tło wypełniające dół ekranu pod floating navem — żeby treść nie prześwitywała w szczelinie nad home indicatorem.
          WP-F: gradient zamiast pełnego krycia — pełny kolor tylko przy samej krawędzi,
          wyżej treść prześwituje pod glassem paska (inaczej filler dusił efekt tafli). */}
      {!hideMobileNav && <div aria-hidden className="fixed inset-x-0 bottom-0 z-30 h-[calc(1.5rem+env(safe-area-inset-bottom))] bg-gradient-to-t from-background to-background/0 desktop-shell:hidden" />}

      {!hideMobileNav && (
        <nav aria-label={t('nav.ariaMobile')} className="kinetic-glass fixed bottom-[calc(0.75rem+env(safe-area-inset-bottom))] left-3 right-3 z-40 flex items-center justify-around rounded-3xl px-2 py-2 shadow-[0_20px_40px_rgba(0,0,0,0.45)] desktop-shell:hidden">
          {navItems.slice(0, 5).map((item) => (
            <NavLink
              key={`mobile-${item.to}`}
              to={item.to}
              className="flex flex-1 flex-col items-center gap-1 py-1"
            >
              {({ isActive }) => (
                <>
                  {/* Pigułka stałej szerokości tylko pod ikoną — każda pozycja podświetla się tak samo. */}
                  <span className={cn(
                    "flex h-9 w-14 items-center justify-center rounded-full transition-colors",
                    isActive ? "bg-primary text-primary-foreground" : "text-muted-foreground"
                  )}>
                    <item.icon className="h-5 w-5" />
                  </span>
                  <span className={cn(
                    "text-[11px] font-bold uppercase tracking-wide transition-colors",
                    isActive ? "text-foreground" : "text-muted-foreground"
                  )}>
                    {t(item.labelKey).split(' ')[0]}
                  </span>
                </>
              )}
            </NavLink>
          ))}
        </nav>
      )}
    </>
  );
};
