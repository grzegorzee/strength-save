import { Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { HashRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { Layout } from "./components/Layout";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { AdminRoute } from "./components/AdminRoute";
import { useAuth } from "./hooks/useAuth";
import { UserProvider, useCurrentUser } from "./contexts/UserContext";
import { PWAUpdatePrompt } from "./components/PWAUpdatePrompt";
import { Loader2 } from "lucide-react";
import { lazyWithRetry } from "./lib/lazy-with-retry";

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
const StravaCallback = lazyWithRetry(() => import("./pages/StravaCallback"), "lazy-retry:strava-callback");
const AdminDashboard = lazyWithRetry(() => import("./pages/admin/AdminDashboard"), "lazy-retry:admin-dashboard");
const UserPlanEditor = lazyWithRetry(() => import("./pages/admin/UserPlanEditor"), "lazy-retry:user-plan-editor");
const NotFound = lazyWithRetry(() => import("./pages/NotFound"), "lazy-retry:not-found");
const Login = lazyWithRetry(() => import("./pages/Login"), "lazy-retry:login");

const AppLoader = () => (
  <div className="min-h-screen flex items-center justify-center">
    <Loader2 className="h-8 w-8 animate-spin text-primary" />
  </div>
);

const AppRoutes = () => {
  const { isNewUser, profileLoaded } = useCurrentUser();

  if (!profileLoaded) {
    return <AppLoader />;
  }

  return (
    <HashRouter>
      <Suspense fallback={<AppLoader />}>
        <Routes>
          {isNewUser ? (
            <>
              <Route path="/onboarding" element={<Onboarding />} />
              <Route path="*" element={<Onboarding />} />
            </>
          ) : (
            <>
              <Route element={<Layout />}>
                <Route path="/" element={<Dashboard />} />
                <Route path="/day" element={<DayPlan />} />
                <Route path="/plan" element={<TrainingPlan />} />
                <Route path="/workout/:dayId" element={<WorkoutDay />} />
                <Route path="/achievements" element={<Achievements />} />
                <Route path="/plan/edit" element={<PlanEditor />} />
                <Route path="/analytics" element={<Analytics />} />
                <Route path="/exercises" element={<ExerciseLibrary />} />
                <Route path="/settings" element={<Settings />} />
                <Route path="/new-plan" element={<NewPlan />} />
                <Route path="/cycles" element={<Cycles />} />
                <Route path="/strava/callback" element={<StravaCallback />} />
                <Route path="/admin" element={<AdminRoute><AdminDashboard /></AdminRoute>} />
                <Route path="/admin/plans/:userId" element={<AdminRoute><UserPlanEditor /></AdminRoute>} />
                {/* Redirects from old routes */}
                <Route path="/stats" element={<Analytics />} />
                <Route path="/summary" element={<Analytics />} />
                <Route path="/progress" element={<Analytics />} />
                <Route path="/measurements" element={<Analytics />} />
              </Route>
              <Route path="*" element={<NotFound />} />
            </>
          )}
        </Routes>
      </Suspense>
    </HashRouter>
  );
};

const AuthenticatedApp = () => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return <AppLoader />;
  }

  if (!isAuthenticated) {
    return (
      <Suspense fallback={<AppLoader />}>
        <Login />
      </Suspense>
    );
  }

  return (
    <UserProvider>
      <AppRoutes />
    </UserProvider>
  );
};

const App = () => (
  <ErrorBoundary>
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <PWAUpdatePrompt />
          <AuthenticatedApp />
        </TooltipProvider>
      </QueryClientProvider>
    </ThemeProvider>
  </ErrorBoundary>
);

export default App;
