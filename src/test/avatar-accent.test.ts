// X29 WP-H: automatyczny kolor akcentu z avatara. Kontrakt lib:
// - dominantColorFromImageData: srednia RGB wazona saturacja^2, piksele
//   przezroczyste pominiete, avatar szary/neutralny = null,
// - nearestAccentId: najblizszy akcent palety (hue circular *2 + sat + lum),
//   NIGDY slate/gray (automat proponuje kolor, nie brak koloru),
// - deriveAccentFromAvatar: kazdy problem = cichy null (zasada 5),
// - shouldAutoDeriveAccent: automat TYLKO gdy user nie ma zadnego wyboru.
// X33 WP-8: kandydaci kolorow ze zdjecia (do 3 skupisk odcienia, 12 sektorow
// kola barw, waga = liczba pikseli) -> accentIdsFromImageData (dedup, bez
// slate/gray) -> deriveAccentCandidatesFromAvatar; deriveAccentFromAvatar = [0].
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  accentCandidatesFromImageData,
  accentIdsFromImageData,
  dominantColorFromImageData,
  nearestAccentId,
  deriveAccentCandidatesFromAvatar,
  deriveAccentFromAvatar,
  isTrustedAvatarPhotoUrl,
  shouldAutoDeriveAccent,
} from '@/lib/avatar-accent';

describe('bezpieczeństwo URL avatara', () => {
  it('dopuszcza tylko HTTPS z hostów Google Photos używanych przez logowanie', () => {
    expect(isTrustedAvatarPhotoUrl('https://lh3.googleusercontent.com/a/photo')).toBe(true);
    expect(isTrustedAvatarPhotoUrl('https://sub.googleusercontent.com/photo')).toBe(true);
    expect(isTrustedAvatarPhotoUrl('http://lh3.googleusercontent.com/a/photo')).toBe(false);
    expect(isTrustedAvatarPhotoUrl('https://googleusercontent.com.evil.test/photo')).toBe(false);
    expect(isTrustedAvatarPhotoUrl('https://127.0.0.1/photo')).toBe(false);
    expect(isTrustedAvatarPhotoUrl('not-a-url')).toBe(false);
  });

  it('nie wykonuje requestu dla niezaufanego URL', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    await expect(deriveAccentCandidatesFromAvatar('https://evil.test/avatar.jpg')).resolves.toEqual([]);
    expect(fetchMock).not.toHaveBeenCalled();
    vi.unstubAllGlobals();
  });

  it('odrzuca odpowiedź inną niż image/* przed dekodowaniem', async () => {
    const bitmap = vi.fn();
    vi.stubGlobal('fetch', vi.fn(async () => ({
      ok: true,
      blob: async () => new Blob(['text'], { type: 'text/plain' }),
    })));
    vi.stubGlobal('createImageBitmap', bitmap);
    await expect(deriveAccentCandidatesFromAvatar('https://lh3.googleusercontent.com/avatar')).resolves.toEqual([]);
    expect(bitmap).not.toHaveBeenCalled();
    vi.unstubAllGlobals();
  });
});

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

// X33 WP-8: skupiska odcienia z bufora 24x24 (bez canvasu, czysta funkcja).
describe('accentCandidatesFromImageData', () => {
  const blue: [number, number, number] = [30, 144, 255];
  const red: [number, number, number] = [230, 40, 60];
  const green: [number, number, number] = [40, 200, 90];

  const mixed = (counts: Array<[[number, number, number], number]>): Uint8ClampedArray =>
    pixels(...counts.flatMap(([rgb, n]) => Array.from({ length: n }, () => rgb)));

  it('3 wyrazne barwy -> 3 kandydaci w kolejnosci liczby pikseli (waga)', () => {
    const data = mixed([[red, 3], [blue, 9], [green, 5]]);
    const result = accentCandidatesFromImageData(data);
    expect(result).toHaveLength(3);
    // Najliczniejszy niebieski pierwszy, potem zielony, na koncu czerwony.
    expect(result[0].b).toBeGreaterThan(result[0].r);
    expect(result[1].g).toBeGreaterThan(result[1].r);
    expect(result[2].r).toBeGreaterThan(result[2].b);
  });

  it('srednia barwa skupiska: dwa odcienie tego samego sektora daja jednego kandydata', () => {
    // 200deg i 210deg = ten sam sektor (180-210 / 210-240?) -> sprawdzamy tylko,
    // ze bardzo bliskie odcienie (roznica 5deg) nie rozbijaja sie na dwa wpisy.
    const data = mixed([[[30, 144, 255], 6], [[35, 150, 255], 6]]);
    expect(accentCandidatesFromImageData(data)).toHaveLength(1);
  });

  it('wiecej niz 3 barwy -> tylko 3 najliczniejsze', () => {
    const data = mixed([[red, 4], [blue, 8], [green, 6], [[250, 200, 30], 2]]);
    expect(accentCandidatesFromImageData(data)).toHaveLength(3);
  });

  it('avatar szary = pusta lista (zero komunikatow, domyslna paleta)', () => {
    expect(accentCandidatesFromImageData(solid(128, 128, 128))).toEqual([]);
    expect(accentCandidatesFromImageData(solid(120, 125, 130))).toEqual([]);
    expect(accentCandidatesFromImageData(new Uint8ClampedArray(0))).toEqual([]);
  });

  it('piksele przezroczyste i szare tlo nie licza sie do wagi', () => {
    const data = pixels([255, 0, 0, 0], [255, 0, 0, 10], [128, 128, 128], [128, 128, 128], [30, 144, 255]);
    const result = accentCandidatesFromImageData(data);
    expect(result).toHaveLength(1);
    expect(result[0].b).toBeGreaterThan(200);
  });

  it('niemal czarne piksele (szum cieni) nie tworza skupiska', () => {
    // HSL daje im wysoka "saturacje", ale to nie jest kolor do zaproponowania.
    expect(accentCandidatesFromImageData(solid(12, 3, 3))).toEqual([]);
  });
});

describe('accentIdsFromImageData (dedup, nigdy slate/gray)', () => {
  it('niebieski + czerwony -> [sky, rose]', () => {
    const data = pixels(
      [30, 144, 255], [30, 144, 255], [30, 144, 255],
      [244, 63, 94], [244, 63, 94],
    );
    expect(accentIdsFromImageData(data)).toEqual(['sky', 'rose']);
  });

  it('dwa skupiska mapujace na ten sam akcent = jeden wpis', () => {
    // 199deg (sektor 180-210) i 211deg (sektor 210-240): rozne skupiska, oba
    // najblizej sky -> jeden wpis, bez duplikatu.
    const data = pixels(
      [41, 182, 246], [41, 182, 246], [41, 182, 246],
      [41, 140, 246], [41, 140, 246],
    );
    expect(accentIdsFromImageData(data)).toEqual(['sky']);
  });

  it('nigdy nie zawiera slate ani gray', () => {
    const data = pixels([100, 116, 139], [100, 116, 139], [142, 142, 147], [30, 144, 255]);
    const ids = accentIdsFromImageData(data);
    expect(ids).not.toContain('slate');
    expect(ids).not.toContain('gray');
  });

  it('szary bufor = []', () => {
    expect(accentIdsFromImageData(solid(128, 128, 128))).toEqual([]);
  });
});

describe('deriveAccentCandidatesFromAvatar (cichy fail = pusta lista)', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it('fetch rzuca = [] bez wyjatku', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('CORS'); }));
    await expect(deriveAccentCandidatesFromAvatar('https://lh3.googleusercontent.com/avatar.jpg')).resolves.toEqual([]);
  });

  it('brak createImageBitmap w srodowisku = []', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, blob: async () => new Blob() })));
    await expect(deriveAccentCandidatesFromAvatar('https://lh3.googleusercontent.com/avatar.jpg')).resolves.toEqual([]);
  });

  it('twardy timeout 5 s: wiszaca siec = []', async () => {
    vi.useFakeTimers();
    vi.stubGlobal('fetch', vi.fn(() => new Promise(() => { /* nigdy */ })));
    const pending = deriveAccentCandidatesFromAvatar('https://lh3.googleusercontent.com/avatar.jpg');
    await vi.advanceTimersByTimeAsync(5000);
    await expect(pending).resolves.toEqual([]);
  });
});

describe('deriveAccentFromAvatar (cichy fail, zasada 5)', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it('fetch rzuca (siec/CORS) = null, bez wyjatku', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('CORS'); }));
    await expect(deriveAccentFromAvatar('https://lh3.googleusercontent.com/avatar.jpg')).resolves.toBeNull();
  });

  it('odpowiedz nie-ok = null', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false, status: 404 })));
    await expect(deriveAccentFromAvatar('https://lh3.googleusercontent.com/avatar.jpg')).resolves.toBeNull();
  });

  it('brak createImageBitmap w srodowisku = null (nie wyjatek)', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, blob: async () => new Blob() })));
    await expect(deriveAccentFromAvatar('https://lh3.googleusercontent.com/avatar.jpg')).resolves.toBeNull();
  });

  it('twardy timeout 5 s: wisząca siec = null', async () => {
    vi.useFakeTimers();
    vi.stubGlobal('fetch', vi.fn(() => new Promise(() => { /* nigdy */ })));
    const pending = deriveAccentFromAvatar('https://lh3.googleusercontent.com/avatar.jpg');
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
