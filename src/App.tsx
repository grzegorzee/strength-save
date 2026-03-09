import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { HashRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { Layout } from "./components/Layout";
import { ErrorBoundary } from "./components/ErrorBoundary";
import Dashboard from "./pages/Dashboard";
import DayPlan from "./pages/DayPlan";
import TrainingPlan from "./pages/TrainingPlan";
import WorkoutDay from "./pages/WorkoutDay";
import Achievements from "./pages/Achievements";
import PlanEditor from "./pages/PlanEditor";
import Analytics from "./pages/Analytics";
import AIChat from "./pages/AIChat";
import Onboarding from "./pages/Onboarding";
import ExerciseLibrary from "./pages/ExerciseLibrary";
import Settings from "./pages/Settings";
import NewPlan from "./pages/NewPlan";
import StravaCallback from "./pages/StravaCallback";
import AdminDashboard from "./pages/admin/AdminDashboard";
import UserPlanEditor from "./pages/admin/UserPlanEditor";
import NotFound from "./pages/NotFound";
import Login from "./pages/Login";
import { AdminRoute } from "./components/AdminRoute";
import { useAuth } from "./hooks/useAuth";
import { UserProvider, useCurrentUser } from "./contexts/UserContext";
import { PWAUpdatePrompt } from "./components/PWAUpdatePrompt";
import { Loader2 } from "lucide-react";

const queryClient = new QueryClient();

const AppRoutes = () => {
  const { isNewUser, profileLoaded } = useCurrentUser();

  if (!profileLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <HashRouter>
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
              <Route path="/ai" element={<AIChat />} />
              <Route path="/exercises" element={<ExerciseLibrary />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/new-plan" element={<NewPlan />} />
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
    </HashRouter>
  );
};

const AuthenticatedApp = () => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Login />;
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
