import { useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { AppHeader } from './AppHeader';
import { AppNavigation } from './AppNavigation';
import { useTranslation } from '@/contexts/LanguageContext';
import type { TranslationKey } from '@/i18n';

const pageTitleKeys: Record<string, TranslationKey> = {
  '/': 'layout.title.dashboard',
  '/plan': 'layout.title.plan',
  '/history': 'layout.title.history',
  '/day': 'layout.title.day',
  '/analytics': 'layout.title.analytics',
  '/achievements': 'layout.title.achievements',
  '/plan/edit': 'layout.title.planEdit',
  '/settings': 'layout.title.settings',
  '/profile': 'layout.title.profile',
  '/measurements': 'layout.title.measurements',
  '/admin': 'layout.title.admin',
  '/cycles': 'layout.title.cycles',
  '/exercises': 'layout.title.exercises',
};

// Trasy najwyższego poziomu (bottom nav) — bez strzałki wstecz.
const rootPaths = new Set(['/', '/plan', '/history', '/exercises', '/profile']);

export const Layout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const isFocusedFlow = location.pathname.startsWith('/workout/') || location.pathname.startsWith('/exercise/');
  // Replan (/new-plan) i paywall są pełnoekranowe (jak onboarding) — bez nawigacji i nagłówka appki.
  const isFullScreenFlow = location.pathname === '/new-plan' || location.pathname === '/paywall';
  const isRootPage = rootPaths.has(location.pathname);
  const titleKey = pageTitleKeys[location.pathname];
  const title = titleKey ? t(titleKey) : 'Strength Save';

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
    <div className="min-h-screen md:h-[100dvh] flex w-full bg-background overflow-x-hidden md:overflow-hidden">
      <AppNavigation isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} hideMobileNav={isFocusedFlow} />

      <div className="flex-1 flex flex-col min-w-0 overflow-x-hidden md:h-[100dvh] md:overflow-hidden">
        {!isFocusedFlow && (
          <AppHeader
            title={title}
            onBack={isRootPage ? undefined : handleBack}
          />
        )}

        <main className="flex-1 p-5 pb-[calc(7.5rem+env(safe-area-inset-bottom))] md:p-6 overflow-x-hidden md:overflow-y-auto">
          <div className="max-w-4xl mx-auto">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};
