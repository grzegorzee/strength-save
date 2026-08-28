import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { AppHeader } from './AppHeader';
import { HeaderActionsProvider } from './HeaderActions';
import { AppNavigation } from './AppNavigation';
import { BackBar } from './BackBar';
import { useTranslation } from '@/contexts/LanguageContext';
import type { TranslationKey } from '@/i18n';
import { APP_CHROME_ROOT_PATHS } from '@/lib/main-navigation';

const pageTitleKeys: Record<string, TranslationKey> = {
  '/': 'layout.title.dashboard',
  '/plan': 'layout.title.plan',
  '/history': 'layout.title.history',
  '/day': 'layout.title.day',
  '/analytics': 'layout.title.analytics',
  '/achievements': 'layout.title.achievements',
  '/plan/edit': 'layout.title.planEdit',
  '/profile': 'layout.title.profile',
  '/measurements': 'layout.title.measurements',
  '/admin': 'layout.title.admin',
  '/cycles': 'layout.title.cycles',
  '/exercises': 'layout.title.exercises',
};

// Chrome rootów pochodzi ze wspólnego kontraktu pięciu zakładek. /analytics
// zachowuje dotychczasowy brak strzałki jako jawny wyjątek poza bottom navem.
export const Layout = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const isFocusedFlow = location.pathname.startsWith('/workout/') || location.pathname.startsWith('/exercise/');
  // Replan (/new-plan) i paywall są pełnoekranowe (jak onboarding) — bez nawigacji i nagłówka appki.
  const isFullScreenFlow = location.pathname === '/new-plan' || location.pathname === '/paywall';
  const isRootPage = APP_CHROME_ROOT_PATHS.has(location.pathname);
  const titleKey = pageTitleKeys[location.pathname];
  const title = titleKey ? t(titleKey) : 'Strength Save';
  // WP-C (X35b): pasek "Wstecz" nad dolnym navem na trasach spoza niego. W sesji
  // treningowej (/workout/*) NIE: ten sam slot 6rem zajmują RestBar i CTA startu,
  // a ekran ma własny przycisk wstecz w nagłówku sesji. /exercise/* dostaje pasek,
  // bo bez AppHeader po przewinięciu nie ma tam żadnego powrotu.
  const showBackBar = !isRootPage && !location.pathname.startsWith('/workout/');

  const handleBack = () => {
    // React Router v6 trzyma indeks historii w window.history.state.idx.
    // Gdy wchodzimy z deep linka (idx 0) wracamy na dashboard, w innym wypadku cofamy.
    const idx = (window.history.state as { idx?: number } | null)?.idx ?? 0;
    if (idx > 0) {
      navigate(-1);
    } else {
      navigate('/');
    }
  };

  if (isFullScreenFlow) {
    return (
      <div className="min-h-screen bg-background">
        <Outlet />
      </div>
    );
  }

  return (
    // WP-C (X35b): `overflow-x-clip` zamiast `overflow-x-hidden` na przodkach
    // nagłówka. `hidden` robi z elementu scrollport (overflow-y liczy się jako
    // auto), a przewija się window — `sticky top-0` nagłówka nie działał na
    // mobile (Playwright 393x852, /profile po 2000 px: header y = -1475).
    // `clip` przycina tak samo, ale scrollportu nie tworzy; iOS < 16 (bez clip)
    // ma i tak html/body overflow-x: hidden z index.css.
    <div className="min-h-screen desktop-shell:h-[100dvh] flex w-full bg-background overflow-x-clip desktop-shell:overflow-hidden">
      {/* WP-D (X29): bottom nav widoczny na WSZYSTKICH trasach w Layout, także
          w focused flow (/workout/*, /exercise/*) — user ma zawsze wyjście do
          Dashboardu/Planu/Profilu. Paski sesji (start/RestBar) pozycjonują się
          NAD navem. Header w focused flow pozostaje ukryty (własny wstecz). */}
      <AppNavigation />

      {/* Naprawa r2 (2026-08-21): provider slotu akcji headera — ekrany portalują
          swoje przyciski (History: lupa + filtry) do rzędu headera jak w artboardach. */}
      <HeaderActionsProvider>
        <div className="flex-1 flex flex-col min-w-0 overflow-x-clip desktop-shell:h-[100dvh] desktop-shell:overflow-hidden">
          {!isFocusedFlow && (
            <AppHeader
              title={title}
              onBack={isRootPage ? undefined : handleBack}
            />
          )}

          {/* Rezerwa dolna: 7.5rem nad navem; z paskiem Wstecz (top ≈ 6rem + 3.25rem)
              10.75rem, żeby ostatnie CTA strony nie chowało się pod paskiem. */}
          <main className={showBackBar
            ? 'flex-1 p-5 pb-[calc(10.75rem+env(safe-area-inset-bottom))] desktop-shell:p-6 desktop-shell:pb-6 overflow-x-hidden desktop-shell:overflow-y-auto'
            : 'flex-1 p-5 pb-[calc(7.5rem+env(safe-area-inset-bottom))] desktop-shell:p-6 overflow-x-hidden desktop-shell:overflow-y-auto'}
          >
            <div className="max-w-4xl mx-auto">
              <Outlet />
            </div>
          </main>
        </div>
      </HeaderActionsProvider>

      {showBackBar && <BackBar onBack={handleBack} title={titleKey ? title : undefined} />}
    </div>
  );
};
