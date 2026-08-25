import { Navigate, useSearchParams } from 'react-router-dom';
import { legacySettingsPath } from '@/lib/settings-redirect';

// X35b (WP-B): /settings zniknęło — sekcje żyją w Profilu; stare ?section=
// mapowane na kotwice Profilu (deep linki z powiadomień i Pomiarów działają).
export const SettingsRedirect = () => {
  const [params] = useSearchParams();
  return <Navigate to={legacySettingsPath(params.get('section'))} replace />;
};
