// X29 WP-H: automatyczny kolor akcentu z avatara. Kontrakt lib:
// - dominantColorFromImageData: srednia RGB wazona saturacja^2, piksele
//   przezroczyste pominiete, avatar szary/neutralny = null,
// - nearestAccentId: najblizszy akcent palety (hue circular *2 + sat + lum),
//   NIGDY slate/gray (automat proponuje kolor, nie brak koloru),
// - deriveAccentFromAvatar: kazdy problem = cichy null (zasada 5),
// - shouldAutoDeriveAccent: automat TYLKO gdy user nie ma zadnego wyboru.
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  dominantColorFromImageData,
  nearestAccentId,
  deriveAccentFromAvatar,
  shouldAutoDeriveAccent,
} from '@/lib/avatar-accent';

/** Bufor pikseli RGBA: lista [r,g,b,a?] powtorzona w kolejnosci. */
const pixels = (...px: Array<[number, number, number, number?]>): Uint8ClampedArray => {
  const data = new Uint8ClampedArray(px.length * 4);
  px.forEach(([r, g, b, a], i) => {
    data[i * 4] = r;
    data[i * 4 + 1] = g;
    data[i * 4 + 2] = b;
    data[i * 4 + 3] = a ?? 255;
  });
  return data;
};

const solid = (r: number, g: number, b: number, count = 16): Uint8ClampedArray =>
  pixels(...Array.from({ length: count }, () => [r, g, b] as [number, number, number]));

describe('dominantColorFromImageData', () => {
  it('jednolity niebieski: zwraca kolor z dominujacym kanalem B i saturacja > progu', () => {
    const result = dominantColorFromImageData(solid(30, 144, 255));
    expect(result).not.toBeNull();
    expect(result!.b).toBeGreaterThan(result!.r);
    expect(result!.b).toBeGreaterThan(result!.g);
    expect(result!.sat).toBeGreaterThanOrEqual(0.18);
  });

  it('avatar szary (saturacja 0) = null', () => {
    expect(dominantColorFromImageData(solid(128, 128, 128))).toBeNull();
  });

  it('avatar niemal szary (saturacja < 0.18) = null', () => {
    expect(dominantColorFromImageData(solid(120, 125, 130))).toBeNull();
  });

  it('pusty bufor = null', () => {
    expect(dominantColorFromImageData(new Uint8ClampedArray(0))).toBeNull();
  });

  it('piksele przezroczyste (alpha < 128) sa pomijane', () => {
    // Czerwony jest w pelni przezroczysty — dominanta ma byc niebieska.
    const data = pixels([255, 0, 0, 0], [255, 0, 0, 10], [30, 144, 255], [30, 144, 255]);
    const result = dominantColorFromImageData(data);
    expect(result).not.toBeNull();
    expect(result!.b).toBeGreaterThan(result!.r);
  });

  it('szare tlo nie rozciencza koloru (waga saturacja^2, szary ma wage 0)', () => {
    const data = pixels(
      [128, 128, 128], [128, 128, 128], [128, 128, 128], [128, 128, 128],
      [30, 144, 255],
    );
    const result = dominantColorFromImageData(data);
    expect(result).not.toBeNull();
    // Srednia arytmetyczna dalaby ~(108,131,153); wazona zostaje przy niebieskim.
    expect(result!.b).toBeGreaterThan(200);
  });
});

describe('nearestAccentId', () => {
  it('niebieski -> sky', () => {
    expect(nearestAccentId({ r: 30, g: 144, b: 255 })).toBe('sky');
    // Dokladny hex akcentu sky (#29b6f6).
    expect(nearestAccentId({ r: 41, g: 182, b: 246 })).toBe('sky');
  });

  it('fioletowy -> deterministycznie jeden z rodziny fioletow', () => {
    const id = nearestAccentId({ r: 128, g: 0, b: 128 });
    expect(['violet', 'lavender', 'indigo', 'magenta']).toContain(id);
    // Wynik metryki (hue*2 + sat + lum) dla purpury 300deg: magenta.
    expect(id).toBe('magenta');
  });

  it('nigdy nie zwraca slate ani gray (nawet dla ich wlasnych hexow)', () => {
    const neutralInputs = [
      { r: 100, g: 116, b: 139 }, // slate #64748b
      { r: 142, g: 142, b: 147 }, // gray #8e8e93
    ];
    // Przekroj kola barw + neutralne: automat zawsze proponuje KOLOR.
    for (let hue = 0; hue < 360; hue += 15) {
      const c = (1 - Math.abs(((hue / 60) % 2) - 1));
      const [r, g, b] = hue < 60 ? [1, c, 0] : hue < 120 ? [c, 1, 0] : hue < 180 ? [0, 1, c]
        : hue < 240 ? [0, c, 1] : hue < 300 ? [c, 0, 1] : [1, 0, c];
      neutralInputs.push({ r: Math.round(r * 255), g: Math.round(g * 255), b: Math.round(b * 255) });
    }
    for (const rgb of neutralInputs) {
      expect(['slate', 'gray']).not.toContain(nearestAccentId(rgb));
    }
  });
});

describe('deriveAccentFromAvatar (cichy fail, zasada 5)', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it('fetch rzuca (siec/CORS) = null, bez wyjatku', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('CORS'); }));
    await expect(deriveAccentFromAvatar('https://lh3.example/avatar.jpg')).resolves.toBeNull();
  });

  it('odpowiedz nie-ok = null', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false, status: 404 })));
    await expect(deriveAccentFromAvatar('https://lh3.example/avatar.jpg')).resolves.toBeNull();
  });

  it('brak createImageBitmap w srodowisku = null (nie wyjatek)', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, blob: async () => new Blob() })));
    await expect(deriveAccentFromAvatar('https://lh3.example/avatar.jpg')).resolves.toBeNull();
  });

  it('twardy timeout 5 s: wisząca siec = null', async () => {
    vi.useFakeTimers();
    vi.stubGlobal('fetch', vi.fn(() => new Promise(() => { /* nigdy */ })));
    const pending = deriveAccentFromAvatar('https://lh3.example/avatar.jpg');
    await vi.advanceTimersByTimeAsync(5000);
    await expect(pending).resolves.toBeNull();
  });
});

describe('shouldAutoDeriveAccent (zasada nadrzedna: nigdy nie nadpisuje wyboru)', () => {
  const photoURL = 'https://lh3.example/avatar.jpg';

  it('true tylko gdy brak mirroru, brak wpisu localStorage i jest photoURL', () => {
    expect(shouldAutoDeriveAccent(undefined, false, photoURL)).toBe(true);
    expect(shouldAutoDeriveAccent({}, false, photoURL)).toBe(true);
  });

  it('accentColor w profilu blokuje automat (takze domyslna limonka)', () => {
    expect(shouldAutoDeriveAccent({ accentColor: 'indigo' }, false, photoURL)).toBe(false);
    expect(shouldAutoDeriveAccent({ accentColor: 'lime' }, false, photoURL)).toBe(false);
  });

  it('wpis w localStorage blokuje automat', () => {
    expect(shouldAutoDeriveAccent(undefined, true, photoURL)).toBe(false);
  });

  it('brak photoURL blokuje automat', () => {
    expect(shouldAutoDeriveAccent(undefined, false, '')).toBe(false);
    expect(shouldAutoDeriveAccent(undefined, false, undefined)).toBe(false);
  });
});
