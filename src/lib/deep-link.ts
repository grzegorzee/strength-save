// Link "Otwórz aplikację" z maili (2026-09-30). Mail prowadzi na
// https://strengthsave.app/open[?to=/trasa]. Od 1.0.2 iOS (Universal Links)
// i Android (App Links) otwierają nim apkę; starsze buildy i Android bez
// weryfikacji dostają strengthsave://open z intentu landingu.
//
// ?to= wyłącznie z białej listy. Ta sama lista żyje na landingu
// (strength_save_landing/api/_lib/open-target.ts): zmiana tu = zmiana tam.

export const DEEP_LINK_ROUTES: readonly string[] = [
  '/',
  '/day',
  '/plan',
  '/history',
  '/progress',
  '/profile',
  '/measurements',
  '/exercises',
  '/achievements',
  '/cycles',
];

const WORKOUT_ROUTE = /^\/workout\/[A-Za-z0-9_-]{1,64}$/;
const LINK_HOST = 'strengthsave.app';
const LINK_SCHEME = 'strengthsave:';

export const sanitizeDeepLinkRoute = (value: string | null | undefined): string | null => {
  if (typeof value !== 'string') return null;
  return DEEP_LINK_ROUTES.includes(value) || WORKOUT_ROUTE.test(value) ? value : null;
};

/**
 * null = to nie nasz link (np. OAuth redirect), nic nie robimy.
 * { to: null } = nasz link bez celu: apka się otwiera, ekran zostaje.
 */
export const parseAppOpenUrl = (raw: string): { to: string | null } | null => {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return null;
  }
  const isUniversal =
    url.protocol === 'https:' &&
    url.hostname === LINK_HOST &&
    (url.pathname === '/open' || url.pathname.startsWith('/open/'));
  const isScheme = url.protocol === LINK_SCHEME;
  if (!isUniversal && !isScheme) return null;
  return { to: sanitizeDeepLinkRoute(url.searchParams.get('to')) };
};
