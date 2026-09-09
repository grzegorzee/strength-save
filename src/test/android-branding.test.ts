import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { inflateSync } from 'node:zlib';
import { describe, expect, it } from 'vitest';

const res = 'android/app/src/main/res';

// Read actual PNG pixels, including PNG row filters, without an image/CLI dependency in CI.
const png = (path: string) => {
  const file = readFileSync(path);
  const width = file.readUInt32BE(16);
  const height = file.readUInt32BE(20);
  expect(file[24]).toBe(8);
  expect([2, 6]).toContain(file[25]);
  const channels = file[25] === 6 ? 4 : 3;
  const chunks: Buffer[] = [];
  for (let offset = 8; offset < file.length;) {
    const size = file.readUInt32BE(offset);
    if (file.toString('ascii', offset + 4, offset + 8) === 'IDAT') chunks.push(file.subarray(offset + 8, offset + 8 + size));
    offset += size + 12;
  }
  const data = inflateSync(Buffer.concat(chunks));
  const stride = width * channels;
  const pixels = Buffer.alloc(height * stride);
  for (let row = 0; row < height; row += 1) {
    const start = row * (stride + 1);
    const filter = data[start];
    for (let column = 0; column < stride; column += 1) {
      const left = column >= channels ? pixels[row * stride + column - channels] : 0;
      const up = row ? pixels[(row - 1) * stride + column] : 0;
      const diagonal = row && column >= channels ? pixels[(row - 1) * stride + column - channels] : 0;
      const prediction = left + up - diagonal;
      const distances = [Math.abs(prediction - left), Math.abs(prediction - up), Math.abs(prediction - diagonal)];
      const paeth = distances[0] <= distances[1] && distances[0] <= distances[2] ? left : distances[1] <= distances[2] ? up : diagonal;
      const predictor = [0, left, up, Math.floor((left + up) / 2), paeth][filter];
      pixels[row * stride + column] = (data[start + column + 1] + predictor) & 255;
    }
  }
  return {
    width, height,
    at: (x: number, y: number) => [...pixels.subarray((y * width + x) * channels, (y * width + x) * channels + channels)],
  };
};

const densities = [['ldpi', 0.75], ['mdpi', 1], ['hdpi', 1.5], ['xhdpi', 2], ['xxhdpi', 3], ['xxxhdpi', 4]] as const;

describe('Android launcher branding across OEM masks and densities', () => {
  it('uses the current lime artwork background in every launcher fallback, not the old dark shield', () => {
    const canonical = png('src/assets/app-icon.png').at(128, 0);
    for (const [density, factor] of densities) {
      const icon = png(`${res}/mipmap-${density}/ic_launcher.png`);
      expect([icon.width, icon.height]).toEqual([48 * factor, 48 * factor]);
      const top = icon.at(Math.floor(icon.width / 2), 0);
      expect(top.slice(0, 3).every((value, channel) => Math.abs(value - canonical[channel]) < 12), density).toBe(true);
      const round = png(`${res}/mipmap-${density}/ic_launcher_round.png`);
      expect(round.at(0, 0)[3], density).toBe(0);
      expect(round.at(Math.floor(round.width / 2), Math.floor(round.height / 2))[3], density).toBe(255);
    }
  });

  it('keeps the actual foreground and monochrome silhouette inside the adaptive safe area', () => {
    for (const [density, factor] of densities) {
      const icon = png(`${res}/mipmap-${density}/ic_launcher_foreground.png`);
      expect([icon.width, icon.height]).toEqual([108 * factor, 108 * factor]);
      expect(icon.at(0, 0)[3], density).toBe(0);
      const mono = png(`${res}/mipmap-${density}/ic_launcher_monochrome.png`);
      let visible = 0;
      let mismatchedAlpha = 0;
      let outsideSafeArea = 0;
      let coloredMonochrome = 0;
      for (let y = 0; y < icon.height; y += 1) for (let x = 0; x < icon.width; x += 1) {
        const color = icon.at(x, y);
        const mask = mono.at(x, y);
        if (mask[3] !== color[3]) mismatchedAlpha += 1;
        if (color[3] > 4) {
          visible += 1;
          if (!(x >= Math.floor(21 * factor) && x < Math.ceil(87 * factor) && y >= Math.floor(21 * factor) && y < Math.ceil(87 * factor))) outsideSafeArea += 1;
          if (mask.slice(0, 3).some(channel => channel !== 255)) coloredMonochrome += 1;
        }
      }
      expect({ mismatchedAlpha, outsideSafeArea, coloredMonochrome }, density).toEqual({ mismatchedAlpha: 0, outsideSafeArea: 0, coloredMonochrome: 0 });
      // A silhouette must have detail, not be an opaque square/tile.
      expect(visible).toBeGreaterThan(icon.width * icon.height * 0.05);
      expect(visible).toBeLessThan(icon.width * icon.height * 0.35);
    }
  });

  it('routes round and normal launchers to the same artwork, including optional themed icons', () => {
    for (const name of ['ic_launcher', 'ic_launcher_round']) {
      const xml = readFileSync(`${res}/mipmap-anydpi-v26/${name}.xml`, 'utf8');
      expect(xml).toContain('@mipmap/ic_launcher_foreground');
      expect(xml).toContain('@color/ic_launcher_background');
      expect(xml).toContain('@mipmap/ic_launcher_monochrome');
    }
  });

  it('has no density/night splash override that can restore the old shield', () => {
    const stale = readdirSync(res).filter(name => name.startsWith('drawable')).filter(name => existsSync(`${res}/${name}/splash.png`));
    expect(stale).toEqual([]);
    expect(readFileSync(`${res}/drawable/splash.xml`, 'utf8')).toContain('@drawable/boot_splash');
    const style = readFileSync(`${res}/values/styles.xml`, 'utf8');
    expect(style).toContain('name="windowSplashScreenAnimatedIcon">@drawable/boot_launch_icon');
    expect(style).toContain('name="windowSplashScreenBackground">#0E0E0E');
  });
});
