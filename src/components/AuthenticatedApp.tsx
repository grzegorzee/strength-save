import { Suspense, useEffect } from 'react';
import { HashRouter, Navigate, Route, Routes, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { ShieldOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Layout } from '@/components/Layout';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { AdminRoute } from '@/components/AdminRoute';
import { PaywallRouteGuard } from '@/components/PaywallRouteGuard';
import { UserProvider, useCurrentUser } from '@/contexts/UserContext';
import { UnitProvider } from '@/contexts/UnitContext';
import { useTranslation } from '@/contexts/LanguageContext';
import { WatchEventRouter } from '@/components/WatchEventRouter';
import { ActiveWorkoutResume } from '@/components/ActiveWorkoutResume';
import { TelemetryHeartbeat } from '@/components/TelemetryHeartbeat';
import { ProductTelemetry } from '@/components/ProductTelemetry';
import { AutoSyncOnReconnect } from '@/components/AutoSyncOnReconnect';
import { PreferenceSync } from '@/components/PreferenceSync';
import { PushRegistrar } from '@/components/PushRegistrar';
import { IosSwipeBack } from '@/components/IosSwipeBack';
import { EmailVerificationGate } from '@/components/EmailVerificationGate';
import { ConsentGate } from '@/components/ConsentGate';
import { needsConsentRefresh } from '@/lib/consent-selection';
import { lazyWithRetry } from '@/lib/lazy-with-retry';
import { initGlobalErrorTelemetry, setGlobalErrorTelemetryUid } from '@/lib/global-error-telemetry';
import { isFirestoreInternalAssertion } from '@/lib/firestore-crash-guard';
import { BootScreen } from '@/components/BootScreen';

const Dashboard = lazyWithRetry(() => import('@/pages/Dashboard'), 'lazy-retry:dashboard');
const DayPlan = lazyWithRetry(() => import('@/pages/DayPlan'), 'lazy-retry:day-plan');
const TrainingPlan = lazyWithRetry(() => import('@/pages/TrainingPlan'), 'lazy-retry:training-plan');
const WorkoutDay = lazyWithRetry(() => import('@/pages/WorkoutDay'), 'lazy-retry:workout-day');
const Achievements = lazyWithRetry(() => import('@/pages/Achievements'), 'lazy-retry:achievements');
const PlanEditor = lazyWithRetry(() => import('@/pages/PlanEditor'), 'lazy-retry:plan-editor');
// D-T4: Analityka scalona z Postępami — /analytics zostaje jako redirect
// (kompatybilność deep-linków i zdarzeń inboxa) z zachowaniem ?tab=.
const AnalyticsRedirect = () => {
  const [params] = useSearchParams();
  const tab = params.get('tab');
  return <Navigate to={`/achievements?view=analytics${tab ? `&tab=${tab}` : ''}`} replace />;
};
const Onboarding = lazyWithRetry(() => import('@/pages/Onboarding'), 'lazy-retry:onboarding');
const ExerciseLibrary = lazyWithRetry(() => import('@/pages/ExerciseLibrary'), 'lazy-retry:exercise-library');
const Settings = lazyWithRetry(() => import('@/pages/Settings'), 'lazy-retry:settings');
const NewPlan = lazyWithRetry(() => import('@/pages/NewPlan'), 'lazy-retry:new-plan');
const Cycles = lazyWithRetry(() => import('@/pages/Cycles'), 'lazy-retry:cycles');
const WorkoutHistory = lazyWithRetry(() => import('@/pages/WorkoutHistory'), 'lazy-retry:history');
const StravaCallback = lazyWithRetry(() => import('@/pages/StravaCallback'), 'lazy-retry:strava-callback');
const AdminDashboard = lazyWithRetry(() => import('@/pages/admin/AdminDashboard'), 'lazy-retry:admin-dashboard');
const UserPlanEditor = lazyWithRetry(() => import('@/pages/admin/UserPlanEditor'), 'lazy-retry:user-plan-editor');
const AdminUserDetail = lazyWithRetry(() => import('@/pages/admin/AdminUserDetail'), 'lazy-retry:admin-user-detail');
const NotFound = lazyWithRetry(() => import('@/pages/NotFound'), 'lazy-retry:not-found');
const Profile = lazyWithRetry(() => import('@/pages/Profile'), 'lazy-retry:profile');
const ExerciseDetail = lazyWithRetry(() => import('@/pages/ExerciseDetail'), 'lazy-retry:exercise-detail');
const Measurements = lazyWithRetry(() => import('@/pages/Measurements'), 'lazy-retry:measurements');
const Paywall = lazyWithRetry(() => import('@/pages/Paywall'), 'lazy-retry:paywall');

const RouteCrashFallback = ({ onReset, error, code }: { onReset: () => void; error: Error | null; code: string }) => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  // Po asercji Firestore SDK jest martwe do końca życia strony — nawigacja SPA
  // niczego nie naprawia, potrzebny pełny reload (draft przeżywa w IDB/localStorage).
  const isFirestoreCrash = isFirestoreInternalAssertion(error);
  return (
    <div className="flex min-h-[60vh] items-center justify-center p-4">
      <div className="w-full max-w-md rounded-2xl border bg-card p-8 text-center">
        <h1 className="text-lg font-semibold">{t('errors.routeCrashTitle')}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{t('errors.routeCrashDesc')}</p>
        {code && (
          <p className="mt-4 select-text font-mono text-xs font-bold text-destructive" data-testid="route-crash-code">
            {code}
          </p>
        )}
        {error?.message && (
          <p className="mt-1 select-text break-words rounded bg-muted p-2 font-mono text-[11px] text-muted-foreground/80">
            {error.message}
          </p>
        )}
        <Button
          className="mt-6"
          onClick={() => {
            if (isFirestoreCrash) {
              window.location.reload();
              return;
            }
            onReset();
            navigate('/');
          }}
        >
          {isFirestoreCrash ? t('errors.restartApp') : t('errors.backToDashboard')}
        </Button>
      </div>
    </div>
  );
};

const AuthenticatedRouteRedirect = ({ isNewUser }: { isNewUser: boolean }) => {
  const location = useLocation();
  const isAuthRoute = location.pathname === '/login' || location.pathname === '/register';
  if (!isAuthRoute) return null;
  return <Navigate to={isNewUser ? '/onboarding' : '/'} replace />;
};

const AccessRestrictedView = ({
  email,
  accessEnabled,
  suspended,
  loadError,
  onLogout,
}: {
  email: string;
  accessEnabled: boolean;
  suspended?: boolean;
  loadError?: boolean;
  onLogout: () => Promise<void>;
}) => {
  const { t } = useTranslation();
  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-6">
      <div className="w-full max-w-md rounded-2xl border bg-card p-6 shadow-sm">
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-fitness-warning/10 text-fitness-warning">
          <ShieldOff className="h-6 w-6" />
        </div>
        <h1 className="text-2xl font-heading font-bold tracking-tight">
          {loadError
            ? t('gate.profileLoadError.title')
            : suspended
              ? t('gate.suspended.title')
              : accessEnabled
                ? t('gate.loading.title')
                : t('gate.disabled.title')}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {loadError
            ? t('gate.profileLoadError.desc')
            : suspended
              ? t('gate.suspended.desc')
              : accessEnabled
                ? t('gate.loading.desc')
                : t('gate.disabled.desc')}
        </p>
        <p className="mt-4 text-xs text-muted-foreground">
          {t('gate.account', { email: email || t('gate.noEmail') })}
        </p>
        <div className="mt-6 flex gap-2">
          <Button variant="outline" onClick={() => window.location.reload()}>{t('gate.refresh')}</Button>
          <Button variant="secondary" onClick={() => void onLogout()}>{t('profile.logout')}</Button>
        </div>
      </div>
    </div>
  );
};

const AppRoutes = ({ onLogout }: { onLogout: () => Promise<void> }) => {
  const {
    uid,
    isNewUser,
    profileLoaded,
    hasAppAccess,
    profile,
    needsEmailVerification,
    isSuspended,
    profileLoadError,
  } = useCurrentUser();

  useEffect(() => {
    initGlobalErrorTelemetry();
    setGlobalErrorTelemetryUid(uid);
    return () => setGlobalErrorTelemetryUid(undefined);
  }, [uid]);

  if (!profileLoaded) return <BootScreen />;
  if (needsEmailVerification) {
    return <EmailVerificationGate email={profile?.email || ''} onLogout={onLogout} />;
  }
  if (!hasAppAccess) {
    return (
      <AccessRestrictedView
        email={profile?.email || ''}
        accessEnabled={profile?.accessEnabled ?? false}
        suspended={isSuspended}
        loadError={!!profileLoadError && !profile}
        onLogout={onLogout}
      />
    );
  }
  // Re-consent (pakiet prawny v2): komplet aktualnych zgód wymagany przed
  // trasami. Nowi userzy zbierają zgody w onboardingu (krok Welcome).
  if (!isNewUser && needsConsentRefresh(profile)) {
    return <ConsentGate profile={profile} onLogout={onLogout} />;
  }

  return (
    <HashRouter>
      <AuthenticatedRouteRedirect isNewUser={isNewUser} />
      <ProductTelemetry />
      {/* Z232: gest krawędziowy w onboardingu wyrzucałby z kreatora (kroki nie są trasami) i kasował wybory. */}
      {!isNewUser && <IosSwipeBack />}
      {!isNewUser && <WatchEventRouter />}
      {!isNewUser && <ActiveWorkoutResume />}
      <ErrorBoundary uid={uid} fallback={(reset, error, code) => <RouteCrashFallback onReset={reset} error={error} code={code} />}>
        <Suspense fallback={<BootScreen />}>
          <Routes>
            {isNewUser ? (
              <>
                <Route path="/login" element={<Navigate to="/onboarding" replace />} />
                <Route path="/register" element={<Navigate to="/onboarding" replace />} />
                <Route path="/onboarding" element={<Onboarding />} />
                <Route path="*" element={<Onboarding />} />
              </>
            ) : (
              <Route element={<PaywallRouteGuard />}>
                <Route element={<Layout />}>
                  <Route path="/login" element={<Navigate to="/" replace />} />
                  <Route path="/register" element={<Navigate to="/" replace />} />
                  <Route path="/onboarding" element={<Navigate to="/?welcome=1" replace />} />
                  <Route path="/" element={<Dashboard />} />
                  <Route path="/day" element={<DayPlan />} />
                  <Route path="/plan" element={<TrainingPlan />} />
                  <Route path="/workout/:dayId" element={<WorkoutDay />} />
                  <Route path="/achievements" element={<Achievements />} />
                  <Route path="/plan/edit" element={<PlanEditor />} />
                  <Route path="/analytics" element={<AnalyticsRedirect />} />
                  <Route path="/exercises" element={<ExerciseLibrary />} />
                  <Route path="/settings" element={<Settings />} />
                  <Route path="/profile" element={<Profile />} />
                  <Route path="/exercise/:slug" element={<ExerciseDetail />} />
                  <Route path="/measurements" element={<Measurements />} />
                  <Route path="/new-plan" element={<NewPlan />} />
                  <Route path="/paywall" element={<Paywall onLogout={onLogout} />} />
                  <Route path="/cycles" element={<Cycles />} />
                  <Route path="/history" element={<WorkoutHistory />} />
                  <Route path="/strava/callback" element={<StravaCallback />} />
                  <Route path="/admin" element={<AdminRoute><AdminDashboard /></AdminRoute>} />
                  <Route path="/admin/users/:userId" element={<AdminRoute><AdminUserDetail /></AdminRoute>} />
                  <Route path="/admin/plans/:userId" element={<AdminRoute><UserPlanEditor /></AdminRoute>} />
                </Route>
                <Route path="*" element={<NotFound />} />
              </Route>
            )}
          </Routes>
        </Suspense>
      </ErrorBoundary>
    </HashRouter>
  );
};

export default function AuthenticatedApp({ onLogout }: { onLogout: () => Promise<void> }) {
  return (
    <UnitProvider>
      <UserProvider>
        <TelemetryHeartbeat />
        <PushRegistrar />
        <AutoSyncOnReconnect />
        <PreferenceSync />
        <AppRoutes onLogout={onLogout} />
      </UserProvider>
    </UnitProvider>
  );
}
