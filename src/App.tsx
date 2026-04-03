import { Suspense, lazy } from "react";
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

const queryClient = new QueryClient();
const Dashboard = lazy(() => import("./pages/Dashboard"));
const DayPlan = lazy(() => import("./pages/DayPlan"));
const TrainingPlan = lazy(() => import("./pages/TrainingPlan"));
const WorkoutDay = lazy(() => import("./pages/WorkoutDay"));
const Achievements = lazy(() => import("./pages/Achievements"));
const PlanEditor = lazy(() => import("./pages/PlanEditor"));
const Analytics = lazy(() => import("./pages/Analytics"));
const Onboarding = lazy(() => import("./pages/Onboarding"));
const ExerciseLibrary = lazy(() => import("./pages/ExerciseLibrary"));
const Settings = lazy(() => import("./pages/Settings"));
const NewPlan = lazy(() => import("./pages/NewPlan"));
const Cycles = lazy(() => import("./pages/Cycles"));
const StravaCallback = lazy(() => import("./pages/StravaCallback"));
const AdminDashboard = lazy(() => import("./pages/admin/AdminDashboard"));
const UserPlanEditor = lazy(() => import("./pages/admin/UserPlanEditor"));
const NotFound = lazy(() => import("./pages/NotFound"));
const Login = lazy(() => import("./pages/Login"));

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
