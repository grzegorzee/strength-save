import { Suspense } from 'react';
import { HashRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from 'next-themes';
import { Toaster } from '@/components/ui/toaster';
import { Toaster as Sonner } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { PWAUpdatePrompt } from '@/components/PWAUpdatePrompt';
import { LanguageProvider } from '@/contexts/LanguageContext';
import { useAuth } from '@/hooks/useAuth';
import { lazyWithRetry } from '@/lib/lazy-with-retry';
import appIcon from '@/assets/app-icon.png';

const queryClient = new QueryClient();
const Login = lazyWithRetry(() => import('@/pages/Login'), 'lazy-retry:login');
const AuthenticatedApp = lazyWithRetry(
  () => import('@/components/AuthenticatedApp'),
  'lazy-retry:authenticated-app',
);

const AuthRedirect = () => {
  const location = useLocation();
  return <Navigate to={`/login${location.search || ''}`} replace />;
};

// FIX-B T4: logo z pulsem zamiast gołego kółka — user widzi, że ładuje się
// WŁAŚNIE ta apka.
const AppLoader = () => (
  <div className="min-h-[50vh] flex flex-col items-center justify-center gap-4">
    <img
      src={appIcon}
      alt="Strength Save"
      className="h-16 w-16 rounded-2xl animate-pulse"
    />
    <span className="text-[11px] font-bold uppercase tracking-[0.24em] text-muted-foreground animate-pulse">
      Strength Save
    </span>
  </div>
);

const AuthenticationGate = () => {
  const { isAuthenticated, loading, logout } = useAuth();

  if (loading) return <AppLoader />;

  if (!isAuthenticated) {
    return (
      <HashRouter>
        <Suspense fallback={<AppLoader />}>
          <Routes>
            <Route path="/login" element={<Login mode="login" />} />
            <Route path="/register" element={<Login mode="register" />} />
            <Route path="*" element={<AuthRedirect />} />
          </Routes>
        </Suspense>
      </HashRouter>
    );
  }

  return (
    <Suspense fallback={<AppLoader />}>
      <AuthenticatedApp onLogout={logout} />
    </Suspense>
  );
};

const App = () => (
  <ErrorBoundary>
    <ThemeProvider attribute="class" defaultTheme="dark" forcedTheme="dark">
      <LanguageProvider>
        <QueryClientProvider client={queryClient}>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <PWAUpdatePrompt />
            <AuthenticationGate />
          </TooltipProvider>
        </QueryClientProvider>
      </LanguageProvider>
    </ThemeProvider>
  </ErrorBoundary>
);

export default App;
