import { Suspense, useEffect } from 'react';
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
import { hideNativeSplashWhenReady } from '@/lib/native-splash';
import { BootScreen } from '@/components/BootScreen';

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

const AuthenticationGate = () => {
  const { isAuthenticated, loading, slow, logout } = useAuth();

  if (loading) return <BootScreen slow={slow} onRetry={() => window.location.reload()} />;

  if (!isAuthenticated) {
    return (
      <HashRouter useTransitions={false}>
        <Suspense fallback={<BootScreen />}>
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
    <Suspense fallback={<BootScreen />}>
      <AuthenticatedApp onLogout={logout} />
    </Suspense>
  );
};

const App = () => {
  // X29 WP-F: hide natywnego splasha dopiero po PIERWSZYM COMMICIE Reacta
  // (useEffect), nie po render() w main.tsx — render w React 18 jest async,
  // więc splash potrafił zgasnąć przed pierwszą klatką (czarna szczelina).
  // Podwójny rAF wewnątrz hideNativeSplashWhenReady czeka na pierwszy paint.
  useEffect(() => {
    hideNativeSplashWhenReady();
  }, []);

  return (
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
};

export default App;
