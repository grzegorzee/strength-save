/**
 * X28 WP-D: medaliony webp z pakietu pro-look (512x512, na czerni) dla zakładki
 * Postępy. Statyczne assety w public/badges/ (kopie z media-staging/pro-look/
 * badges/); brak/błąd pliku obsługuje UI fallbackiem (onError → gradient).
 * BASE_URL jak w exercise-media.getGroupImageUrl.
 * Fix 2026-08-21: kafle poziomu 1 przeszły na ikony lucide (medaliony odcinały
 * się od tła) — helper żyje dalej w hero sekcji poziomu 2 (GroupHeader,
 * ?section=records|badges), a 'analytics'/'weeks' zostają dla kompletu typu.
 */

export type ProgressTileId = 'records' | 'badges' | 'analytics' | 'weeks';

const TILE_FILES: Record<ProgressTileId, string> = {
  records: 'pr.webp',
  badges: 'season-gold.webp',
  analytics: 'tonnage-100t.webp',
  weeks: 'streak-4.webp',
};

/** URL medalionu kafla Postępów (webp w public/badges/). */
export const getProgressTileImageUrl = (id: ProgressTileId): string =>
  `${import.meta.env.BASE_URL ?? '/'}badges/${TILE_FILES[id]}`;
