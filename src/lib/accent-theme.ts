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

// Paleta wg wzoru właściciela (plan I, 2026-08-20): limonka brandowa + 10
// popularnych kolorów. HSL policzone z hexów (algorytm jak hexToHslParts
// niżej). Foreground per akcent liczy applyAccent z luminancji — paleta
// zawiera też ciemne kolory (indigo, slate). Kolory statusów (success/
// warning/destructive) NIE zmieniają się z akcentem.
export const ACCENTS: AccentTheme[] = [
  { id: 'lime', hex: '#cefc22', hsl: '73 97% 56%', lightHsl: '73 100% 89%', lightHex: '#f4ffc9' },
  { id: 'sky', hex: '#29b6f6', hsl: '199 92% 56%', lightHsl: '199 92% 84%', lightHex: '#b4e5fc' },
  { id: 'indigo', hex: '#5865f2', hsl: '235 86% 65%', lightHsl: '235 86% 93%', lightHex: '#c5c9fa' },
  { id: 'violet', hex: '#8b5cf6', hsl: '258 90% 66%', lightHsl: '258 90% 93%', lightHex: '#d6c6fc' },
  { id: 'lavender', hex: '#b478f1', hsl: '270 81% 71%', lightHsl: '270 81% 93%', lightHex: '#e5d0fa' },
  { id: 'magenta', hex: '#d946ef', hsl: '292 84% 61%', lightHsl: '292 84% 89%', lightHex: '#f2bef9' },
  { id: 'rose', hex: '#f43f5e', hsl: '350 89% 60%', lightHsl: '350 89% 88%', lightHex: '#fbbcc7' },
  { id: 'amber', hex: '#f5a623', hsl: '37 91% 55%', lightHsl: '37 91% 83%', lightHex: '#fce0b2' },
  { id: 'emerald', hex: '#10b981', hsl: '160 84% 39%', lightHsl: '160 84% 67%', lightHex: '#abe7d3' },
  { id: 'slate', hex: '#64748b', hsl: '215 16% 47%', lightHsl: '215 40% 75%', lightHex: '#c9ced6' },
  { id: 'gray', hex: '#8e8e93', hsl: '240 2% 57%', lightHsl: '240 40% 85%', lightHex: '#d7d7d9' },
];

export const DEFAULT_ACCENT_ID = 'lime';
const STORAGE_KEY = 'ss-accent-color';

// Wsteczna kompatybilność (plan I): stare id zapisane u userów (localStorage
// + users/{uid}.preferences.accentColor) mapują na najbliższy nowy kolor.
const LEGACY_ACCENT_ALIASES: Record<string, string> = {
  cyan: 'sky',
  blue: 'sky',
  purple: 'lavender',
  pink: 'magenta',
  red: 'rose',
  orange: 'amber',
  gold: 'amber',
};

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

const FOREGROUND_LUMINANCE_THRESHOLD = 0.28;

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
  const resolved = typeof id === 'string' ? (LEGACY_ACCENT_ALIASES[id] ?? id) : id;
  return ACCENTS.find((a) => a.id === resolved) ?? ACCENTS[0];
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
    root.style.removeProperty('--accent');
    root.style.removeProperty('--accent-foreground');
    delete root.dataset.accent;
  } else {
    root.style.setProperty('--primary', accent.hsl);
    root.style.setProperty('--primary-light', accent.lightHsl);
    root.style.setProperty('--ring', accent.hsl);
    // Audyt akcentu (2026-08-20): --accent to w tej apce drugi zapis TEGO SAMEGO
    // akcentu (chipy filtrów Kinetic, badge secondary, nagłówki text-accent,
    // hover ghost/outline). Bez nadpisania zostawał limonkowy.
    root.style.setProperty('--accent', accent.hsl);
    // Plan I: foreground per luminancja dla WSZYSTKICH akcentów (paleta ma
    // teraz też ciemne kolory). Próg skorygowany globalnie 0.3 → 0.28:
    // lavender (lum 0.29) z białym tekstem miał 2.9:1, z ciemnym ma 6.1:1;
    // emerald (0.36) analogicznie zostaje przy ciemnym (7.3:1 vs 2.4:1).
    if (relativeLuminance(accent.hex) < FOREGROUND_LUMINANCE_THRESHOLD) {
      root.style.setProperty('--primary-foreground', '0 0% 98%');
      root.style.setProperty('--accent-foreground', '0 0% 98%');
    } else {
      root.style.removeProperty('--primary-foreground');
      root.style.removeProperty('--accent-foreground');
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
