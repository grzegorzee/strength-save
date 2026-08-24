// X29 WP-H: automatyczny kolor akcentu z avatara (photoURL z Google/Apple).
// Zasada nadrzędna (5): automat działa TYLKO gdy user nie ma ŻADNEGO wyboru
// (brak preferences.accentColor w profilu ORAZ brak wpisu w localStorage
// ss-accent-color) i NIGDY nie nadpisuje wyboru. Każdy problem — brak
// avatara, sieć, CORS, szary avatar — to cichy fail: zostaje limonka.
import { Capacitor } from '@capacitor/core';
import { ACCENTS } from '@/lib/accent-theme';
import { nativeHttpBlob } from '@/lib/native-photo-fetch';

interface Rgb { r: number; g: number; b: number }

/** Poniżej tej saturacji avatar uznajemy za szary/neutralny — brak koloru. */
const MIN_SATURATION = 0.18;
/** Downsample avatara do 24x24 — wystarcza na dominantę, tanie w getImageData. */
const SAMPLE_SIZE = 24;
/** Twardy limit na cały pipeline (sieć + dekodowanie) — avatar to bonus, nie blokada. */
const DERIVE_TIMEOUT_MS = 5000;
// Neutralne akcenty wykluczone z auto-doboru: każdy kolor ma jakąś "najbliższą"
// szarość, a automat ma proponować KOLOR, nie brak koloru.
const NEUTRAL_ACCENT_IDS = new Set(['slate', 'gray']);

const rgbToHsl = ({ r, g, b }: Rgb): { h: number; s: number; l: number } => {
  const rn = r / 255; const gn = g / 255; const bn = b / 255;
  const max = Math.max(rn, gn, bn); const min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;
  if (max === min) return { h: 0, s: 0, l };
  const d = max - min;
  const s = d / (1 - Math.abs(2 * l - 1));
  let h: number;
  if (max === rn) h = (gn - bn) / d + (gn < bn ? 6 : 0);
  else if (max === gn) h = (bn - rn) / d + 2;
  else h = (rn - gn) / d + 4;
  return { h: h * 60, s, l };
};

const hexToRgb = (hex: string): Rgb => {
  const n = parseInt(hex.slice(1), 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
};

/**
 * Dominujący kolor bufora RGBA: średnia RGB ważona saturacją^2 (piksele
 * nasycone decydują, tło/skóra o niskiej saturacji prawie nie waży),
 * piksele przezroczyste (alpha < 128) pominięte. Avatar szary/neutralny
 * (maksymalna lub wynikowa saturacja < progu) = null.
 */
export const dominantColorFromImageData = (
  data: Uint8ClampedArray,
): { r: number; g: number; b: number; sat: number } | null => {
  let wr = 0; let wg = 0; let wb = 0; let weight = 0; let maxSat = 0;
  for (let i = 0; i + 3 < data.length; i += 4) {
    if (data[i + 3] < 128) continue;
    const px = { r: data[i], g: data[i + 1], b: data[i + 2] };
    const { s } = rgbToHsl(px);
    if (s > maxSat) maxSat = s;
    const w = s * s;
    wr += px.r * w; wg += px.g * w; wb += px.b * w; weight += w;
  }
  if (weight <= 0 || maxSat < MIN_SATURATION) return null;
  const mean = { r: Math.round(wr / weight), g: Math.round(wg / weight), b: Math.round(wb / weight) };
  const sat = rgbToHsl(mean).s;
  if (sat < MIN_SATURATION) return null;
  return { ...mean, sat };
};

/**
 * Najbliższy akcent palety (bez neutralnych slate/gray) w przestrzeni HSL:
 * różnica hue (circular, waga 2) + różnica saturacji + różnica jasności.
 */
export const nearestAccentId = (rgb: Rgb): string => {
  const px = rgbToHsl(rgb);
  let bestId = ACCENTS[0].id;
  let bestDist = Infinity;
  for (const accent of ACCENTS) {
    if (NEUTRAL_ACCENT_IDS.has(accent.id)) continue;
    const a = rgbToHsl(hexToRgb(accent.hex));
    const hueDelta = Math.abs(px.h - a.h);
    const hueDist = Math.min(hueDelta, 360 - hueDelta) / 180;
    const dist = hueDist * 2 + Math.abs(px.s - a.s) + Math.abs(px.l - a.l);
    if (dist < bestDist) { bestDist = dist; bestId = accent.id; }
  }
  return bestId;
};

/**
 * Automat wolno odpalić TYLKO przy kompletnym braku wyboru usera: bez mirroru
 * w profilu (nawet zapisana limonka = wybór), bez wpisu w localStorage
 * (hasStoredAccent, nie readStoredAccentId — ten zwraca default) i z avatarem.
 */
export const shouldAutoDeriveAccent = (
  prefs: { accentColor?: string } | null | undefined,
  hasStored: boolean,
  photoURL: string | null | undefined,
): boolean => !prefs?.accentColor && !hasStored && Boolean(photoURL);

const loadAvatarBlob = async (photoURL: string): Promise<Blob> => {
  // Native: CapacitorHttp poza siecią WKWebView (lekcja WP-E: fetch z originu
  // capacitor://localhost potrafi wisieć/paść na CORS dla lh3.googleusercontent).
  if (Capacitor.isNativePlatform()) return nativeHttpBlob(photoURL);
  const res = await fetch(photoURL);
  if (!res.ok) throw new Error(`avatar-fetch-${res.status}`);
  return res.blob();
};

/**
 * photoURL -> id akcentu z palety albo null (cichy fail). Pipeline: blob ->
 * createImageBitmap -> canvas 24x24 -> getImageData -> dominanta -> najbliższy
 * akcent. Twardy timeout 5 s przez Promise.race — nigdy nie blokuje startu.
 */
export const deriveAccentFromAvatar = async (photoURL: string): Promise<string | null> => {
  const attempt = (async (): Promise<string | null> => {
    const blob = await loadAvatarBlob(photoURL);
    const bitmap = await createImageBitmap(blob);
    try {
      const canvas = document.createElement('canvas');
      canvas.width = SAMPLE_SIZE;
      canvas.height = SAMPLE_SIZE;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (!ctx) return null;
      ctx.drawImage(bitmap, 0, 0, SAMPLE_SIZE, SAMPLE_SIZE);
      const { data } = ctx.getImageData(0, 0, SAMPLE_SIZE, SAMPLE_SIZE);
      const dominant = dominantColorFromImageData(data);
      return dominant ? nearestAccentId(dominant) : null;
    } finally {
      bitmap.close?.();
    }
  })().catch(() => null);
  const timeout = new Promise<null>((resolve) => {
    setTimeout(() => resolve(null), DERIVE_TIMEOUT_MS);
  });
  return Promise.race([attempt, timeout]);
};
