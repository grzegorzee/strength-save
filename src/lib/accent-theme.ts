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

export type PaletteThemeId = 'pulse' | 'forge' | 'glacier' | 'avatar-custom' | 'legacy';
export type PaletteThemeSource = 'preset' | 'avatar' | 'legacy';

export interface PaletteThemeV2 {
  version: 2;
  id: PaletteThemeId;
  source: PaletteThemeSource;
  primary: string;
  supportA: string;
  supportB: string;
}

// Role supportA/supportB są celowo osobnymi tokenami. Nie mapujemy ich na
// --secondary/--tertiary, bo te nazwy należą do neutralnych powierzchni UI.
export const PALETTE_THEMES = [
  { version: 2, id: 'pulse', source: 'preset', primary: '#c6ff00', supportA: '#22d3ee', supportB: '#a78bfa' },
  { version: 2, id: 'forge', source: 'preset', primary: '#ff6b35', supportA: '#fbbf24', supportB: '#fb7185' },
  { version: 2, id: 'glacier', source: 'preset', primary: '#38bdf8', supportA: '#818cf8', supportB: '#2dd4bf' },
] as const satisfies readonly PaletteThemeV2[];

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
const PALETTE_STORAGE_KEY = 'ss-palette-theme-v2';
const THEME_OWNER_KEY = 'ss-theme-owner-v1';

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
export const isCustomAccentHex = (value: string | null | undefined): value is string =>
  typeof value === 'string' && /^#[0-9a-f]{6}$/i.test(value);

const PRESET_PALETTE_IDS: PaletteThemeId[] = ['pulse', 'forge', 'glacier'];

export const isPaletteThemeV2 = (value: unknown): value is PaletteThemeV2 => {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<PaletteThemeV2>;
  if (!(candidate.version === 2
    && typeof candidate.id === 'string'
    && typeof candidate.source === 'string'
    && isCustomAccentHex(candidate.primary)
    && isCustomAccentHex(candidate.supportA)
    && isCustomAccentHex(candidate.supportB)
    && new Set([candidate.primary.toLowerCase(), candidate.supportA.toLowerCase(), candidate.supportB.toLowerCase()]).size === 3)) {
    return false;
  }

  if (PRESET_PALETTE_IDS.includes(candidate.id as PaletteThemeId) && candidate.source === 'preset') {
    const preset = PALETTE_THEMES.find((theme) => theme.id === candidate.id);
    return preset !== undefined
      && candidate.primary.toLowerCase() === preset.primary
      && candidate.supportA.toLowerCase() === preset.supportA
      && candidate.supportB.toLowerCase() === preset.supportB;
  }

  return (candidate.id === 'avatar-custom' && candidate.source === 'avatar')
    || (candidate.id === 'legacy' && candidate.source === 'legacy');
};

export const normalizePaletteThemeV2 = (value: unknown): PaletteThemeV2 | null => {
  if (!isPaletteThemeV2(value)) return null;
  return {
    version: 2,
    id: value.id,
    source: value.source,
    primary: value.primary.toLowerCase(),
    supportA: value.supportA.toLowerCase(),
    supportB: value.supportB.toLowerCase(),
  };
};

export const readStoredPaletteTheme = (): PaletteThemeV2 | null => {
  try {
    const raw = localStorage.getItem(PALETTE_STORAGE_KEY);
    return raw ? normalizePaletteThemeV2(JSON.parse(raw)) : null;
  } catch {
    return null;
  }
};

export const clearStoredPaletteTheme = (): void => {
  try {
    localStorage.removeItem(PALETTE_STORAGE_KEY);
  } catch { /* prywatny tryb — runtime nadal można bezpiecznie zmienić */ }
};

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

const channelsLuminance = ([r, g, b]: [number, number, number]): number => {
  const lin = (c: number): number => {
    const v = c / 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
};

const relativeLuminance = (hex: string): number => channelsLuminance(hexChannels(hex));

// Dla dowolnego koloru jeden z dwóch skrajnych foregroundów (#000/#fff) ma
// kontrast co najmniej 4.58:1. Poprzedni próg 0.28 oraz prawie-biel/czerń
// zostawiały lukę: m.in. indigo, violet, magenta, rose i gray spadały poniżej
// WCAG AA na CTA. Wybieramy wariant o faktycznie wyższym kontraście.
const shouldUseLightForeground = (hex: string): boolean => {
  const background = relativeLuminance(hex);
  const contrastWithWhite = 1.05 / (background + 0.05);
  const contrastWithBlack = (background + 0.05) / 0.05;
  return contrastWithWhite >= contrastWithBlack;
};

// Naprawa r1 (2026-08-21, sędzia "jeden akcent"): przy ciemnych akcentach
// (indigo, slate, ciemny custom) dwa problemy kontrastu:
// 1. gradient "forged" CTA startował od bardzo jasnego lightHsl — biały tekst
//    na lewym krańcu miał 1.5-2.2:1; ciemny akcent dostaje wariant PRZYCIEMNIONY,
// 2. akcent jako TEKST (text-primary) na ciemnych powierzchniach i tintach /15
//    spadał do 3.5-4.4:1; --primary-text podbija jasność HSL aż do >= 4.5:1
//    na najjaśniejszym takim tle (pigułka bg-primary/15 nad --surface-low).
const hslPartsToChannels = (h: number, s: number, l: number): [number, number, number] => {
  const sat = s / 100;
  const light = l / 100;
  const c = (1 - Math.abs(2 * light - 1)) * sat;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = light - c / 2;
  const [r, g, b] = h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x]
    : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x];
  return [Math.round((r + m) * 255), Math.round((g + m) * 255), Math.round((b + m) * 255)];
};

// --surface-low w dark (0 0% 7.5%) = kanał 19; kompozycja alfy /15 w sRGB,
// dokładnie jak przeglądarka składa bg-primary/15 nad powierzchnią.
const SURFACE_LOW_CHANNEL = 19;

const ringHslForDarkSurface = (hex: string): string => {
  const { h, s, l } = hexToHslParts(hex);
  const backgroundLum = channelsLuminance([SURFACE_LOW_CHANNEL, SURFACE_LOW_CHANNEL, SURFACE_LOW_CHANNEL]);
  const hasNonTextContrast = (lightness: number): boolean => {
    const ringLum = channelsLuminance(hslPartsToChannels(h, s, lightness));
    const [lighter, darker] = [ringLum, backgroundLum].sort((a, b) => b - a);
    return (lighter + 0.05) / (darker + 0.05) >= 3.1;
  };
  if (hasNonTextContrast(l)) return `${h} ${s}% ${l}%`;
  let lightness = l;
  while (lightness < 92 && !hasNonTextContrast(lightness)) lightness += 1;
  return `${h} ${s}% ${lightness}%`;
};

const readableTextHsl = (hex: string): string => {
  const { h, s, l } = hexToHslParts(hex);
  const accent = hexChannels(hex);
  const tintBg = accent.map((c) => Math.round(0.15 * c + 0.85 * SURFACE_LOW_CHANNEL)) as [number, number, number];
  const bgLum = channelsLuminance(tintBg);
  let lightness = l;
  while (lightness < 92) {
    const lum = channelsLuminance(hslPartsToChannels(h, s, lightness));
    if ((lum + 0.05) / (bgLum + 0.05) >= 4.6) break;
    lightness += 1;
  }
  return `${h} ${s}% ${lightness}%`;
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

// X29 WP-H: automat akcentu z avatara musi odróżnić "brak wpisu" od "user
// świadomie zapisał limonkę" — readStoredAccentId zwraca default w obu
// przypadkach. Błąd storage = false (mirror w profilu i tak pilnuje wyboru).
export const hasStoredAccent = (): boolean => {
  try {
    return localStorage.getItem(STORAGE_KEY) !== null;
  } catch {
    return false;
  }
};

export const storeAccentId = (id: string): void => {
  try {
    localStorage.setItem(STORAGE_KEY, id);
  } catch { /* prywatny tryb — zostaje mirror w profilu */ }
};

export const storePaletteTheme = (value: PaletteThemeV2): PaletteThemeV2 | null => {
  const palette = normalizePaletteThemeV2(value);
  if (!palette) return null;
  try {
    localStorage.setItem(PALETTE_STORAGE_KEY, JSON.stringify(palette));
  } catch { /* cache jest optymalizacją; chmura pozostaje mirrorem */ }
  // Stary klient zna tylko accentColor. Primary pełnej palety jest jego
  // bezstratnym fallbackiem również przy cold starcie offline.
  storeAccentId(palette.primary);
  return palette;
};

/**
 * Przypisuje lokalny cache motywu do konta. Przy zmianie UID stary wygląd nie
 * może przejść na kolejną osobę korzystającą z tego samego telefonu. Brak
 * ownera oznacza jednorazową migrację istniejącego cache bez utraty preferencji.
 */
export const claimStoredThemeOwner = (uid: string): 'claimed' | 'same' | 'reset' => {
  const normalizedUid = uid.trim();
  if (!normalizedUid) return 'claimed';
  try {
    const owner = localStorage.getItem(THEME_OWNER_KEY);
    if (owner && owner !== normalizedUid) {
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(PALETTE_STORAGE_KEY);
      localStorage.setItem(THEME_OWNER_KEY, normalizedUid);
      applyAccent(DEFAULT_ACCENT_ID);
      return 'reset';
    }
    localStorage.setItem(THEME_OWNER_KEY, normalizedUid);
    return owner === normalizedUid ? 'same' : 'claimed';
  } catch {
    return 'claimed';
  }
};

const clearAppliedPaletteRuntime = (): void => {
  const root = document.documentElement;
  [
    '--palette-primary',
    '--palette-support-a',
    '--palette-support-b',
    '--palette-support-a-foreground',
    '--palette-support-b-foreground',
    '--chart-1',
    '--chart-2',
    '--chart-3',
  ].forEach((token) => root.style.removeProperty(token));
  delete root.dataset.palette;
  delete root.dataset.paletteVersion;
};

/** Nakłada akcent na tokeny CSS. Domyślna limonka = czyste tokeny z index.css. */
export const applyAccent = (id: string): AccentTheme => {
  const accent = getAccentById(id);
  const root = document.documentElement;
  clearAppliedPaletteRuntime();
  if (accent.id === DEFAULT_ACCENT_ID) {
    root.style.removeProperty('--primary');
    root.style.removeProperty('--primary-light');
    root.style.removeProperty('--primary-text');
    root.style.removeProperty('--ring');
    root.style.removeProperty('--primary-foreground');
    root.style.removeProperty('--accent');
    root.style.removeProperty('--accent-foreground');
    delete root.dataset.accent;
  } else {
    root.style.setProperty('--primary', accent.hsl);
    // Dowolny custom HEX może zlać się z ciemną powierzchnią. Fill pozostaje
    // wyborem usera, ale focus ring dostaje wariant tego samego hue >= 3:1.
    root.style.setProperty('--ring', ringHslForDarkSurface(accent.hex));
    // Audyt akcentu (2026-08-20): --accent to w tej apce drugi zapis TEGO SAMEGO
    // akcentu (chipy filtrów Kinetic, badge secondary, nagłówki text-accent,
    // hover ghost/outline). Bez nadpisania zostawał limonkowy.
    root.style.setProperty('--accent', accent.hsl);
    // CTA/badge dostają czystą biel albo czerń — wariant o wyższym kontraście.
    // Dzięki temu również dowolny custom hex nie wpada w martwą strefę między
    // prawie-bielą i prawie-czernią.
    if (shouldUseLightForeground(accent.hex)) {
      root.style.setProperty('--primary-foreground', '0 0% 100%');
      root.style.setProperty('--accent-foreground', '0 0% 100%');
      // Naprawa r1: gradient CTA bez jasnego krańca pod białym tekstem —
      // ciemny akcent schodzi w dół (primary → primary ciemniejszy o 8 p.p.).
      const { h, s, l } = hexToHslParts(accent.hex);
      root.style.setProperty('--primary-light', `${h} ${s}% ${Math.max(10, l - 8)}%`);
      root.style.setProperty('--primary-text', readableTextHsl(accent.hex));
    } else {
      root.style.setProperty('--primary-foreground', '0 0% 0%');
      root.style.setProperty('--accent-foreground', '0 0% 0%');
      root.style.setProperty('--primary-light', accent.lightHsl);
      root.style.removeProperty('--primary-text');
    }
    root.dataset.accent = accent.id;
  }
  return accent;
};

const foregroundForHex = (hex: string): '0 0% 0%' | '0 0% 100%' =>
  shouldUseLightForeground(hex) ? '0 0% 100%' : '0 0% 0%';

export const applyPaletteTheme = (value: PaletteThemeV2): PaletteThemeV2 | null => {
  const palette = normalizePaletteThemeV2(value);
  if (!palette) return null;
  const root = document.documentElement;
  const primary = applyAccent(palette.primary);
  const supportA = getAccentById(palette.supportA);
  const supportB = getAccentById(palette.supportB);
  root.style.setProperty('--palette-primary', primary.hsl);
  root.style.setProperty('--palette-support-a', supportA.hsl);
  root.style.setProperty('--palette-support-b', supportB.hsl);
  root.style.setProperty('--palette-support-a-foreground', foregroundForHex(palette.supportA));
  root.style.setProperty('--palette-support-b-foreground', foregroundForHex(palette.supportB));
  // Trzy role motywu mają realny, ograniczony zakres: serie danych. Statusy
  // success/warning/error pozostają semantyczne i nigdy nie dziedziczą palety.
  root.style.setProperty('--chart-1', primary.hsl);
  root.style.setProperty('--chart-2', supportA.hsl);
  root.style.setProperty('--chart-3', supportB.hsl);
  root.dataset.palette = palette.id;
  root.dataset.paletteVersion = '2';
  return palette;
};

export const selectLegacyAccent = (id: string): AccentTheme => {
  clearStoredPaletteTheme();
  const accent = applyAccent(id);
  storeAccentId(id);
  return accent;
};

/** Akcent do użycia poza Reactem (share, pdf, confetti). */
export const getCurrentAccent = (): AccentTheme => getAccentById(readStoredAccentId());

/** Boot: nałóż zapamiętany akcent zanim wyrenderuje się aplikacja. */
export const applyStoredAccent = (): void => {
  // 1.0: jeden spójny akcent marki. Stare preferencje zostają w chmurze dla
  // kompatybilności danych, ale nie sterują już wyglądem ani cold startem.
  selectLegacyAccent(DEFAULT_ACCENT_ID);
};
