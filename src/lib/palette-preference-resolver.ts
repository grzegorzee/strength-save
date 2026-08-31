import { normalizePaletteThemeV2, type PaletteThemeV2 } from '@/lib/palette-theme';

export type ResolvedPalettePreference =
  | { kind: 'palette'; palette: PaletteThemeV2 }
  | { kind: 'legacy'; accent: string }
  | { kind: 'none' };

/** Jeden resolver dla startu aplikacji i Profilu. Pełna paleta jest nowszym
 * kontraktem i wygrywa z pomocniczym legacy accentColor. */
export const resolvePalettePreference = (
  pendingPalette: unknown,
  cloudPalette: unknown,
  cloudAccent: unknown,
): ResolvedPalettePreference => {
  const pending = normalizePaletteThemeV2(pendingPalette);
  if (pending) return { kind: 'palette', palette: pending };

  const palette = normalizePaletteThemeV2(cloudPalette);
  if (palette) return { kind: 'palette', palette };

  const accent = typeof cloudAccent === 'string' ? cloudAccent.trim() : '';
  return accent ? { kind: 'legacy', accent } : { kind: 'none' };
};
