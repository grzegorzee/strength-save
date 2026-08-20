// F-T2: kolor przewodni aplikacji. Jedno źródło prawdy dla CSS vars (UI),
// wykresów (hex, bo stop-color w defs nie łyka var()), share/pdf i confetti.
// Persistencja: localStorage (działa od splashu i offline) + mirror
// users/{uid}.preferences.accentColor (cross-device).

export interface AccentTheme {
  id: string;
  /** Pełny hex akcentu (wykresy, share, confetti). */
  hex: string;
  /** Triplet HSL dla --primary (format tokenów index.css: "H S% L%"). */
  hsl: string;
  /** Jaśniejszy wariant dla --primary-light (gradient "forged"). */
  lightHsl: string;
  lightHex: string;
}

// Wszystkie akcenty jasne (L ~60-70%) — ciemny tekst na akcencie trzyma AA,
// --primary-foreground zostaje wspólny. Kolory statusów (success/warning/
// destructive) NIE zmieniają się z akcentem.
export const ACCENTS: AccentTheme[] = [
  { id: 'lime', hex: '#cefc22', hsl: '73 97% 56%', lightHsl: '73 100% 89%', lightHex: '#f4ffc9' },
  { id: 'cyan', hex: '#22d3ee', hsl: '187 86% 53%', lightHsl: '187 92% 88%', lightHex: '#c5f5fc' },
  { id: 'orange', hex: '#fb923c', hsl: '27 96% 61%', lightHsl: '27 100% 90%', lightHex: '#ffe4cc' },
  { id: 'pink', hex: '#f472b6', hsl: '330 86% 70%', lightHsl: '330 90% 92%', lightHex: '#fcd9ec' },
  { id: 'purple', hex: '#c4b5fd', hsl: '252 95% 85%', lightHsl: '252 100% 95%', lightHex: '#ede9fe' },
  { id: 'blue', hex: '#60a5fa', hsl: '213 94% 68%', lightHsl: '213 97% 90%', lightHex: '#cfe3fd' },
  { id: 'red', hex: '#f87171', hsl: '0 91% 71%', lightHsl: '0 93% 92%', lightHex: '#fdd8d8' },
  { id: 'gold', hex: '#facc15', hsl: '48 96% 53%', lightHsl: '48 100% 88%', lightHex: '#fdf3c2' },
];

export const DEFAULT_ACCENT_ID = 'lime';
const STORAGE_KEY = 'ss-accent-color';

export const getAccentById = (id: string | null | undefined): AccentTheme =>
  ACCENTS.find((a) => a.id === id) ?? ACCENTS[0];

export const readStoredAccentId = (): string => {
  try {
    return localStorage.getItem(STORAGE_KEY) ?? DEFAULT_ACCENT_ID;
  } catch {
    return DEFAULT_ACCENT_ID;
  }
};

export const storeAccentId = (id: string): void => {
  try {
    localStorage.setItem(STORAGE_KEY, id);
  } catch { /* prywatny tryb — zostaje mirror w profilu */ }
};

/** Nakłada akcent na tokeny CSS. Domyślna limonka = czyste tokeny z index.css. */
export const applyAccent = (id: string): AccentTheme => {
  const accent = getAccentById(id);
  const root = document.documentElement;
  if (accent.id === DEFAULT_ACCENT_ID) {
    root.style.removeProperty('--primary');
    root.style.removeProperty('--primary-light');
    root.style.removeProperty('--ring');
    delete root.dataset.accent;
  } else {
    root.style.setProperty('--primary', accent.hsl);
    root.style.setProperty('--primary-light', accent.lightHsl);
    root.style.setProperty('--ring', accent.hsl);
    root.dataset.accent = accent.id;
  }
  return accent;
};

/** Akcent do użycia poza Reactem (share, pdf, confetti). */
export const getCurrentAccent = (): AccentTheme => getAccentById(readStoredAccentId());

/** Boot: nałóż zapamiętany akcent zanim wyrenderuje się aplikacja. */
export const applyStoredAccent = (): void => {
  applyAccent(readStoredAccentId());
};
