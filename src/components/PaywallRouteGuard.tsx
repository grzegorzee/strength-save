import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useHardPaywall } from '@/hooks/useHardPaywall';
import { BootScreen } from '@/components/BootScreen';

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
    return <BootScreen />;
  }

  return <Navigate to="/paywall" replace />;
};
