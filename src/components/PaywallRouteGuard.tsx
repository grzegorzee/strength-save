import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useHardPaywall } from '@/hooks/useHardPaywall';

// Domknięcie dziury z buildu 37: świeży user na iOS bez PRO mógł wyjść z paywalla
// strzałką wstecz i przeglądać apkę (bramki łapały tylko akcje). Ten guard owija
// całe drzewo tras zalogowanego usera — przy statusie 'enforced' każda trasa poza
// /paywall przekierowuje na paywall, a 'pending' pokazuje loader zamiast mignięcia
// dashboardem. Web i userzy z danymi (expired, read-only) przechodzą bez zmian.
export const PaywallRouteGuard = () => {
  const status = useHardPaywall();
  const location = useLocation();

  if (location.pathname === '/paywall' || status === 'off') {
    return <Outlet />;
  }

  if (status === 'pending') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return <Navigate to="/paywall" replace />;
};
