/**
 * X28 WP-D: obrazy kafli zakładki Postępy (poziom 1) — medaliony webp z pakietu
 * pro-look (512x512, na czerni). Statyczne assety w public/badges/ (kopie z
 * media-staging/pro-look/badges/); brak/błąd pliku obsługuje UI fallbackiem
 * GroupTile (onError → gradient). BASE_URL jak w exercise-media.getGroupImageUrl.
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
