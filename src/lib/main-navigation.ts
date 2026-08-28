import type { TranslationKey } from '@/i18n';

export const MAIN_DESTINATIONS = [
  { id: 'today', path: '/', labelKey: 'nav.today' },
  { id: 'plan', path: '/plan', labelKey: 'nav.plan' },
  { id: 'history', path: '/history', labelKey: 'nav.history' },
  { id: 'progress', path: '/achievements', labelKey: 'nav.progress' },
  { id: 'profile', path: '/profile', labelKey: 'nav.profile' },
] as const satisfies ReadonlyArray<{
  id: string;
  path: string;
  labelKey: TranslationKey;
}>;

export type MainDestinationId = (typeof MAIN_DESTINATIONS)[number]['id'];

export const MAIN_DESTINATION_PATHS: ReadonlySet<string> = new Set(
  MAIN_DESTINATIONS.map((item) => item.path),
);

// Analytics zachowuje dotychczasowy chrome głównego ekranu i deep link,
// choć nie zajmuje miejsca w pięcioelementowym bottom navie.
export const APP_CHROME_ROOT_PATHS: ReadonlySet<string> = new Set([
  ...MAIN_DESTINATION_PATHS,
  '/analytics',
]);

export const isMainDestinationPath = (path: string): boolean =>
  MAIN_DESTINATION_PATHS.has(path);
