import { Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { HashRouter, Routes, Route, Navigate, useLocation, useNavigate } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { Layout } from "./components/Layout";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { AdminRoute } from "./components/AdminRoute";
import { PaywallRouteGuard } from "./components/PaywallRouteGuard";
import { useAuth } from "./hooks/useAuth";
import { UserProvider, useCurrentUser } from "./contexts/UserContext";
import { UnitProvider } from "./contexts/UnitContext";
import { LanguageProvider, useTranslation } from "./contexts/LanguageContext";
import { PWAUpdatePrompt } from "./components/PWAUpdatePrompt";
import { WatchEventRouter } from "./components/WatchEventRouter";
import { ActiveWorkoutResume } from "./components/ActiveWorkoutResume";
import { TelemetryHeartbeat } from "./components/TelemetryHeartbeat";
import { AutoSyncOnReconnect } from "./components/AutoSyncOnReconnect";
import { PreferenceSync } from "./components/PreferenceSync";
import { PushRegistrar } from "./components/PushRegistrar";
import { IosSwipeBack } from "./components/IosSwipeBack";
import { Loader2, ShieldOff } from "lucide-react";
import { lazyWithRetry } from "./lib/lazy-with-retry";
import { EmailVerificationGate } from "./components/EmailVerificationGate";

const queryClient = new QueryClient();
const Dashboard = lazyWithRetry(() => import("./pages/Dashboard"), "lazy-retry:dashboard");
const DayPlan = lazyWithRetry(() => import("./pages/DayPlan"), "lazy-retry:day-plan");
const TrainingPlan = lazyWithRetry(() => import("./pages/TrainingPlan"), "lazy-retry:training-plan");
const WorkoutDay = lazyWithRetry(() => import("./pages/WorkoutDay"), "lazy-retry:workout-day");
const Achievements = lazyWithRetry(() => import("./pages/Achievements"), "lazy-retry:achievements");
const PlanEditor = lazyWithRetry(() => import("./pages/PlanEditor"), "lazy-retry:plan-editor");
const Analytics = lazyWithRetry(() => import("./pages/Analytics"), "lazy-retry:analytics");
const Onboarding = lazyWithRetry(() => import("./pages/Onboarding"), "lazy-retry:onboarding");
const ExerciseLibrary = lazyWithRetry(() => import("./pages/ExerciseLibrary"), "lazy-retry:exercise-library");
const Settings = lazyWithRetry(() => import("./pages/Settings"), "lazy-retry:settings");
const NewPlan = lazyWithRetry(() => import("./pages/NewPlan"), "lazy-retry:new-plan");
const Cycles = lazyWithRetry(() => import("./pages/Cycles"), "lazy-retry:cycles");
const WorkoutHistory = lazyWithRetry(() => import("./pages/WorkoutHistory"), "lazy-retry:history");
const StravaCallback = lazyWithRetry(() => import("./pages/StravaCallback"), "lazy-retry:strava-callback");
const AdminDashboard = lazyWithRetry(() => import("./pages/admin/AdminDashboard"), "lazy-retry:admin-dashboard");
const UserPlanEditor = lazyWithRetry(() => import("./pages/admin/UserPlanEditor"), "lazy-retry:user-plan-editor");
const NotFound = lazyWithRetry(() => import("./pages/NotFound"), "lazy-retry:not-found");
const Login = lazyWithRetry(() => import("./pages/Login"), "lazy-retry:login");
const Profile = lazyWithRetry(() => import("./pages/Profile"), "lazy-retry:profile");
const ExerciseDetail = lazyWithRetry(() => import("./pages/ExerciseDetail"), "lazy-retry:exercise-detail");
const Measurements = lazyWithRetry(() => import("./pages/Measurements"), "lazy-retry:measurements");
const Paywall = lazyWithRetry(() => import("./pages/Paywall"), "lazy-retry:paywall");

const AuthRedirect = () => {
  const location = useLocation();
  return <Navigate to={`/login${location.search || ''}`} replace />;
};

// Fallback boundary per trasa (Z56): crash jednej strony nie wywala całej apki —
// user wraca na Dashboard, a boundary topowy zostaje ostatnią linią obrony.
const RouteCrashFallback = ({ onReset }: { onReset: () => void }) => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  return (
    <div className="flex min-h-[60vh] items-center justify-center p-4">
      <div className="w-full max-w-md rounded-2xl border bg-card p-8 text-center">
        <h1 className="text-lg font-semibold">{t('errors.routeCrashTitle')}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{t('errors.routeCrashDesc')}</p>
        <Button
          className="mt-6"
          onClick={() => {
            onReset();
            navigate('/');
          }}
        >
          {t('errors.backToDashboard')}
        </Button>
      </div>
    </div>
  );
};

const AuthenticatedRouteRedirect = ({ isNewUser }: { isNewUser: boolean }) => {
  const location = useLocation();
  const isAuthRoute = location.pathname === "/login" || location.pathname === "/register";

  if (!isAuthRoute) {
    return null;
  }

  return <Navigate to={isNewUser ? "/onboarding" : "/"} replace />;
};

const AppLoader = () => (
  <div className="min-h-screen flex items-center justify-center">
    <Loader2 className="h-8 w-8 animate-spin text-primary" />
  </div>
);

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
        <Button variant="outline" onClick={() => window.location.reload()}>
          {t('gate.refresh')}
        </Button>
        <Button variant="secondary" onClick={() => void onLogout()}>
          {t('profile.logout')}
        </Button>
      </div>
    </div>
  </div>
  );
};

const AppRoutes = ({ onLogout }: { onLogout: () => Promise<void> }) => {
  const { uid, isNewUser, profileLoaded, hasAppAccess, profile, needsEmailVerification, isSuspended, profileLoadError } = useCurrentUser();

  if (!profileLoaded) {
    return <AppLoader />;
  }

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

  return (
    <HashRouter>
      <AuthenticatedRouteRedirect isNewUser={isNewUser} />
      <IosSwipeBack />
      {!isNewUser && <WatchEventRouter />}
      {!isNewUser && <ActiveWorkoutResume />}
      <ErrorBoundary uid={uid} fallback={(reset) => <RouteCrashFallback onReset={reset} />}>
      <Suspense fallback={<AppLoader />}>
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
                {/* Po ukończeniu onboardingu URL zostaje #/onboarding — bez tego redirectu
                    drzewo tras nie-new-user nie ma tej trasy i wpada w 404. */}
                <Route path="/onboarding" element={<Navigate to="/?welcome=1" replace />} />
                <Route path="/" element={<Dashboard />} />
                <Route path="/day" element={<DayPlan />} />
                <Route path="/plan" element={<TrainingPlan />} />
                <Route path="/workout/:dayId" element={<WorkoutDay />} />
                <Route path="/achievements" element={<Achievements />} />
                <Route path="/plan/edit" element={<PlanEditor />} />
                <Route path="/analytics" element={<Analytics />} />
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
                <Route path="/admin/plans/:userId" element={<AdminRoute><UserPlanEditor /></AdminRoute>} />
                {/* Redirects from old routes */}
                <Route path="/stats" element={<Analytics />} />
                <Route path="/summary" element={<Analytics />} />
                <Route path="/progress" element={<Analytics />} />
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

const AuthenticatedApp = () => {
  const { isAuthenticated, loading, logout } = useAuth();

  if (loading) {
    return <AppLoader />;
  }

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
    <UserProvider>
      <TelemetryHeartbeat />
      <PushRegistrar />
      <AutoSyncOnReconnect />
      <PreferenceSync />
      <AppRoutes onLogout={logout} />
    </UserProvider>
  );
};

const App = () => (
  <ErrorBoundary>
    <ThemeProvider attribute="class" defaultTheme="dark" forcedTheme="dark">
      <LanguageProvider>
       <UnitProvider>
        <QueryClientProvider client={queryClient}>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <PWAUpdatePrompt />
            <AuthenticatedApp />
          </TooltipProvider>
        </QueryClientProvider>
       </UnitProvider>
      </LanguageProvider>
    </ThemeProvider>
  </ErrorBoundary>
);

export default App;
