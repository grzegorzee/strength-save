import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import appIcon from '@/assets/app-icon.png';
import type { ShareData } from '@/lib/share-utils';

// Z179: zdjęcie 12 MP bez downscale = kilka kopii base64 w pamięci WKWebView →
// crash "Dodaj zdjęcie". Z180: stopka z realnym logo zamiast tekstowego "SS".

const shareData: ShareData = {
  dayName: 'Poniedziałek',
  date: '2026-08-03',
  exercises: [{ name: 'Przysiad', sets: '3 x 5' }],
  tonnage: 4200,
  duration: '1:02',
  prs: ['Przysiad 100 kg'],
  streak: 4,
};

const drawImage = vi.fn();
const toDataURL = vi.fn(() => 'data:image/jpeg;base64,ZZZ');
let createdCanvas: { width: number; height: number } | null = null;

beforeEach(() => {
  createdCanvas = null;
  drawImage.mockClear();
  toDataURL.mockClear();
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('downscalePhoto (Z179)', () => {
  it('12 MP wejście → JPEG dataURL ≤1080×1920, bitmapa zamknięta', async () => {
    const close = vi.fn();
    vi.stubGlobal('createImageBitmap', vi.fn(async () => ({ width: 3024, height: 4032, close })));
    const origCreate = document.createElement.bind(document);
    vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
      if (tag === 'canvas') {
        const canvas = {
          width: 0,
          height: 0,
          getContext: () => ({ drawImage }),
          toDataURL,
        } as unknown as HTMLCanvasElement;
        createdCanvas = canvas as unknown as { width: number; height: number };
        return canvas;
      }
      return origCreate(tag);
    });

    const { downscalePhoto } = await import('@/lib/share-utils');
    const out = await downscalePhoto(new Blob(['x'], { type: 'image/jpeg' }));

    expect(out.startsWith('data:image/jpeg')).toBe(true);
    expect(createdCanvas).not.toBeNull();
    expect(createdCanvas!.width).toBeLessThanOrEqual(1080);
    expect(createdCanvas!.height).toBeLessThanOrEqual(1920);
    expect(toDataURL).toHaveBeenCalledWith('image/jpeg', 0.8);
    expect(close).toHaveBeenCalled();
  });
});

describe('szablony share z logo (Z180)', () => {
  it('gradient i photo zawierają <img z logo i NIE zawierają tekstowego "SS"', async () => {
    const { buildShareHtml, buildShareHtmlWithPhoto } = await import('@/lib/share-utils');
    const gradient = buildShareHtml(shareData, 'pl', 'kg');
    const photo = buildShareHtmlWithPhoto(shareData, 'data:image/jpeg;base64,AAA', 'pl', 'kg');

    for (const html of [gradient, photo]) {
      expect(html).toContain(`<img src="${appIcon}"`);
      expect(html).not.toMatch(/>\s*SS\s*</);
    }
  });

  it('szablon minimal to inny wariant HTML (też z logo)', async () => {
    const { buildShareHtml } = await import('@/lib/share-utils');
    const gradient = buildShareHtml(shareData, 'pl', 'kg', 'gradient');
    const minimal = buildShareHtml(shareData, 'pl', 'kg', 'minimal');

    expect(minimal).not.toBe(gradient);
    expect(minimal).toContain(`<img src="${appIcon}"`);
    expect(minimal).toContain('#0b0b0f');
  });
});

// Z197: "na zdjęciu liczby nachodzą mi na nos" — dwa auto-marginesy w jednym
// flex-column centrowały statystyki w pionie (pas 35-70% wysokości = twarz na
// selfie), a liniowy scrim + dim 0.6 zabijały całe zdjęcie.
describe('szablon photo: treść w dolnej 1/3, twarz czysta (Z197)', () => {
  const manyExercises: ShareData = {
    ...shareData,
    exercises: [
      { name: 'Przysiad', sets: '3 x 5' },
      { name: 'RDL', sets: '3 x 6' },
      { name: 'Prasa', sets: '3 x 10' },
      { name: 'Uginanie nóg', sets: '4 x 12' },
      { name: 'Wspięcia', sets: '3 x 15' },
    ],
  };

  it('nagłówek bez margin-bottom:auto + JEDEN spacer flex:1 po nagłówku', async () => {
    const { buildShareHtmlWithPhoto } = await import('@/lib/share-utils');
    const html = buildShareHtmlWithPhoto(manyExercises, 'data:image/jpeg;base64,AAA', 'pl', 'kg');

    expect(html).not.toContain('margin-bottom:auto');
    expect(html).toContain('flex:1');
  });

  it('scrim jest strefowy (przezroczysty do ~45% wysokości), dim default 0.35', async () => {
    const { buildShareHtmlWithPhoto } = await import('@/lib/share-utils');
    const html = buildShareHtmlWithPhoto(manyExercises, 'data:image/jpeg;base64,AAA', 'pl', 'kg');

    expect(html).toContain('rgba(0,0,0,0) 0%');
    expect(html).toContain('rgba(0,0,0,0.15) 45%');
    // dim 0.35 → brightness(0.65): twarz przestaje być zabita.
    expect(html).toContain('brightness(0.65)');
  });

  it('lista ćwiczeń max 3 pozycje + "+N więcej"', async () => {
    const { buildShareHtmlWithPhoto } = await import('@/lib/share-utils');
    const html = buildShareHtmlWithPhoto(manyExercises, 'data:image/jpeg;base64,AAA', 'pl', 'kg');

    expect(html).toContain('Przysiad');
    expect(html).toContain('RDL');
    expect(html).toContain('Prasa');
    expect(html).not.toContain('Uginanie nóg');
    // 5 ćwiczeń - 3 pokazane = "+2 więcej".
    expect(html).toMatch(/\+\s*2/);
  });
});
