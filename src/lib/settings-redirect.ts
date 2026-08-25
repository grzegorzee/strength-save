// X35b (WP-B): strona /settings zniknęła, jej sekcje mieszkają w Profilu.
// Stare deep linki (/settings?section=...) z powiadomień, kart Pomiarów i
// zewnętrznych wejść lądują na kotwicach Profilu (id="profile-<sekcja>").
const LEGACY_SETTINGS_SECTIONS: Record<string, string> = {
  notifications: 'notifications',
  connections: 'devices',
  strava: 'connections',
  consents: 'consents',
  data: 'backup',
  account: 'account',
};

/** Ścieżka Profilu dla dawnego `?section=` Ustawień; bez sekcji = sam Profil. */
export const legacySettingsPath = (section: string | null): string => {
  const target = section ? LEGACY_SETTINGS_SECTIONS[section] : undefined;
  return target ? `/profile?section=${target}` : '/profile';
};
