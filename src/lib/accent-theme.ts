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

// Rozszerzenie (2026-08-20): dowolny kolor po #RRGGBB oprócz palety.
export const isCustomAccentHex = (value: string | null | undefined): boolean =>
  typeof value === 'string' && /^#[0-9a-f]{6}$/i.test(value);

const hexChannels = (hex: string): [number, number, number] => {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};

const hexToHslParts = (hex: string): { h: number; s: number; l: number } => {
  const [r8, g8, b8] = hexChannels(hex);
  const r = r8 / 255; const g = g8 / 255; const b = b8 / 255;
  const max = Math.max(r, g, b); const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return { h: 0, s: 0, l: Math.round(l * 100) };
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h = 0;
  if (max === r) h = ((g - b) / d + (g < b ? 6 : 0));
  else if (max === g) h = (b - r) / d + 2;
  else h = (r - g) / d + 4;
  return { h: Math.round(h * 60), s: Math.round(s * 100), l: Math.round(l * 100) };
};

const relativeLuminance = (hex: string): number => {
  const lin = (c: number): number => {
    const v = c / 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  };
  const [r, g, b] = hexChannels(hex);
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
};

const lightenHex = (hex: string, amount = 0.65): string => {
  const [r, g, b] = hexChannels(hex).map((c) => Math.round(c + (255 - c) * amount));
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
};

const customAccent = (hex: string): AccentTheme => {
  const normalized = hex.toLowerCase();
  const { h, s, l } = hexToHslParts(normalized);
  return {
    id: 'custom',
    hex: normalized,
    hsl: `${h} ${s}% ${l}%`,
    lightHsl: `${h} ${Math.max(s, 40)}% ${Math.min(93, l + 28)}%`,
    lightHex: lightenHex(normalized),
  };
};

export const getAccentById = (id: string | null | undefined): AccentTheme => {
  if (typeof id === 'string' && isCustomAccentHex(id)) return customAccent(id);
  return ACCENTS.find((a) => a.id === id) ?? ACCENTS[0];
};

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
    root.style.removeProperty('--primary-foreground');
    delete root.dataset.accent;
  } else {
    root.style.setProperty('--primary', accent.hsl);
    root.style.setProperty('--primary-light', accent.lightHsl);
    root.style.setProperty('--ring', accent.hsl);
    // Ciemny własny kolor potrzebuje jasnego tekstu na akcencie (AA);
    // paleta jest jasna, więc dziedziczy domyślny ciemny foreground.
    if (accent.id === 'custom' && relativeLuminance(accent.hex) < 0.3) {
      root.style.setProperty('--primary-foreground', '0 0% 98%');
    } else {
      root.style.removeProperty('--primary-foreground');
    }
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
