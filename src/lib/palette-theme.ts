// Publiczny kontrakt PaletteThemeV2. Implementacja mieszka obok legacy
// accent-theme, dzięki czemu boot przed Reactem wybiera jedną spójną ścieżkę
// bez cyklicznych importów i bez flasha kolorów.
export {
  PALETTE_THEMES,
  applyPaletteTheme,
  clearStoredPaletteTheme,
  isPaletteThemeV2,
  normalizePaletteThemeV2,
  readStoredPaletteTheme,
  selectLegacyAccent,
  storePaletteTheme,
  type PaletteThemeId,
  type PaletteThemeSource,
  type PaletteThemeV2,
} from '@/lib/accent-theme';

export { applyStoredAccent } from '@/lib/accent-theme';
