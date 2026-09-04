import { expect, test, type Page } from '@playwright/test';
import { blockFirebase, localDaysAgo, setE2EAuthScenario } from './helpers';

// Arkusz "Udostepnij porownanie" (BodyCompareShareDialog). Zrzut wlasciciela
// 2026-09-04 (iPhone 390 px): "KLASYCZNY" uciety przy prawej krawedzi pigulki,
// a audyt tego nie wykryl, bo oceniano na oko. Tu wylacznie POMIAR:
// - szerokosc tekstu (Range.getBoundingClientRect) <= wnetrze chipa,
// - scrollWidth <= clientWidth, jedna linia, cel dotykowy >= 44 px,
// - chip w obrysie arkusza, arkusz bez scrolla poziomego (przy 320 px rzad
//   Pobierz/Udostepnij wypychal grid DialogContent poza tresc),
// - geometria strzalki PRZED → PO w builderze HTML (tylko szablon classic).

test.use({ isMobile: true, hasTouch: true, deviceScaleFactor: 2, colorScheme: 'dark' });

const CONSENTS = {
  termsVersion: '2.0',
  privacyVersion: '2.0',
  healthGranted: true,
  healthVersion: '1.0',
  healthEpoch: 1,
  healthGrantId: 'grant-1',
  marketingGranted: false,
  marketingVersion: '1.0',
};

// Dwa pomiary ze zdjeciami jako male JPEG dataURL rysowane w canvasie (nigdy
// URL Storage: fetch → downscale → html2canvas ida realna sciezka web).
const seedPhotoMeasurements = async (page: Page) => {
  await page.addInitScript(({ beforeDate, afterDate }) => {
    const photo = (label: string, color: string) => {
      const canvas = document.createElement('canvas');
      canvas.width = 300;
      canvas.height = 400;
      const ctx = canvas.getContext('2d')!;
      ctx.fillStyle = color;
      ctx.fillRect(0, 0, 300, 400);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 48px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(label, 150, 215);
      return canvas.toDataURL('image/jpeg', 0.8);
    };
    window.localStorage.setItem('fittracker_e2e_measurements', JSON.stringify([
      { id: 'm-before', userId: 'e2e-user', date: beforeDate, weight: 84, photoUrl: photo('PRZED', '#3b5bdb'), recordedAt: Date.now() - 60 * 86_400_000 },
      { id: 'm-after', userId: 'e2e-user', date: afterDate, weight: 80.5, photoUrl: photo('PO', '#2b8a3e'), recordedAt: Date.now() - 86_400_000 },
    ]));
  }, { beforeDate: localDaysAgo(60), afterDate: localDaysAgo(1) });
};

type ButtonFit = {
  text: string;
  width: number;
  height: number;
  innerWidth: number;
  textWidth: number;
  lines: number;
  fitsScroll: boolean;
  fitsText: boolean;
  minHeightOk: boolean;
  insideDialog: boolean;
};

const measureDialog = async (page: Page) => page.evaluate(() => {
  const dialog = document.querySelector<HTMLElement>('[role="dialog"]')!;
  const dialogRect = dialog.getBoundingClientRect();
  const dialogInnerRight = dialogRect.right - parseFloat(getComputedStyle(dialog).paddingRight);
  const measure = (button: HTMLElement) => {
    const style = getComputedStyle(button);
    const textNode = Array.from(button.childNodes).reverse().find((n) => n.nodeType === Node.TEXT_NODE && n.textContent?.trim());
    const range = document.createRange();
    if (textNode) range.selectNodeContents(textNode); else range.selectNodeContents(button);
    const textRect = range.getBoundingClientRect();
    const innerWidth = button.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight);
    const rect = button.getBoundingClientRect();
    return {
      text: (button.innerText || '').trim(),
      width: Math.round(rect.width * 100) / 100,
      height: Math.round(rect.height * 100) / 100,
      innerWidth: Math.round(innerWidth * 100) / 100,
      textWidth: Math.round(textRect.width * 100) / 100,
      lines: range.getClientRects().length,
      fitsScroll: button.scrollWidth <= button.clientWidth,
      fitsText: textRect.width <= innerWidth + 0.5,
      minHeightOk: rect.height >= 44,
      insideDialog: rect.right <= dialogInnerRight + 0.5 && rect.left >= dialogRect.left,
    };
  };
  const chips = ['body-share-format-chips', 'body-share-template-chips'].flatMap((id) =>
    Array.from(document.querySelectorAll<HTMLElement>(`[data-testid="${id}"] button`)).map(measure));
  const actions = Array.from(dialog.querySelectorAll<HTMLElement>('button'))
    .filter((b) => /Pobierz|Udostępnij|Download|Share/.test(b.innerText))
    .map(measure);
  const title = dialog.querySelector<HTMLElement>('h2')!;
  return {
    chips,
    actions,
    titleFits: title.scrollWidth <= title.clientWidth,
    dialogHScroll: dialog.scrollWidth > dialog.clientWidth,
    dialogInViewport: dialogRect.left >= 0 && dialogRect.right <= window.innerWidth + 0.5,
    pageHScroll: document.documentElement.scrollWidth > window.innerWidth + 1,
  };
});

const openShareDialog = async (page: Page, lang: 'pl' | 'en', width: number) => {
  await page.setViewportSize({ width, height: width === 320 ? 568 : 844 });
  await blockFirebase(page);
  await setE2EAuthScenario(page, 'active-user', { hasWorkouts: true, consents: CONSENTS });
  await page.addInitScript((value) => window.localStorage.setItem('app-language', value), lang);
  await seedPhotoMeasurements(page);
  await page.goto('./#/measurements');
  await page.getByTestId('body-photo-share').click();
  await expect(page.getByTestId('body-share-template-chips')).toBeVisible();
  // Podglad = realny html2canvas; dopiero wtedy rzad Pobierz/Udostepnij jest w DOM.
  await expect(page.locator('[role="dialog"] img[src^="blob:"]')).toBeVisible({ timeout: 20000 });
};

const EXPECTED_LABELS: Record<'pl' | 'en', string[]> = {
  pl: ['1:1', '9:16', 'KLASYCZNY', 'AKCENT', 'FOTO'],
  en: ['1:1', '9:16', 'CLASSIC', 'ACCENT', 'PHOTO'],
};

for (const lang of ['pl', 'en'] as const) {
  for (const width of [390, 320] as const) {
    test(`chipy formatu i szablonu mieszcza pelna etykiete, ${lang.toUpperCase()} ${width} px`, async ({ page }) => {
      await openShareDialog(page, lang, width);
      const m = await measureDialog(page);

      expect(m.chips.map((c) => c.text)).toEqual(EXPECTED_LABELS[lang]);
      const failing = (list: ButtonFit[]) => list.filter((c) => !(c.fitsScroll && c.fitsText && c.lines === 1 && c.minHeightOk && c.insideDialog));
      expect(failing(m.chips), JSON.stringify(m.chips, null, 2)).toEqual([]);
      expect(m.actions.map((c) => c.text).length, 'Pobierz + Udostepnij').toBe(2);
      expect(failing(m.actions), JSON.stringify(m.actions, null, 2)).toEqual([]);
      expect(m.titleFits).toBe(true);
      expect(m.dialogHScroll, 'arkusz bez scrolla poziomego').toBe(false);
      expect(m.dialogInViewport).toBe(true);
      expect(m.pageHScroll).toBe(false);
    });
  }
}

// Builder HTML importowany z dev servera Vite i renderowany do DOM: strzalka
// tylko w classic, miedzy zdjeciami, wysrodkowana wzgledem PUDELKA zdjecia,
// oba zdjecia w rozmiarze PHOTO_BOX wewnatrz kontenera, stopka w kontenerze.
test('builder obrazu: strzalka PRZED → PO tylko w classic, zdjecia i stopka w kontenerze', async ({ page }) => {
  await blockFirebase(page);
  await setE2EAuthScenario(page, 'unauthenticated');
  await page.goto('./#/login');
  await page.waitForLoadState('domcontentloaded');

  const cases = [
    { template: 'classic', format: 'square' }, { template: 'classic', format: 'story' },
    { template: 'accent', format: 'square' }, { template: 'accent', format: 'story' },
    { template: 'photo', format: 'square' }, { template: 'photo', format: 'story' },
  ] as const;
  for (const { template, format } of cases) {
    const m = await page.evaluate(async ({ template, format }) => {
      const mod = await import('/src/components/BodyCompareShareDialog.tsx');
      const photo = (color: string) => {
        const canvas = document.createElement('canvas');
        canvas.width = 300;
        canvas.height = 400;
        const ctx = canvas.getContext('2d')!;
        ctx.fillStyle = color;
        ctx.fillRect(0, 0, 300, 400);
        return canvas.toDataURL('image/jpeg', 0.8);
      };
      const html: string = mod.buildBodyCompareHtml({
        before: { dataUrl: photo('#3b5bdb'), date: '2026-06-01', weightKg: 84 },
        after: { dataUrl: photo('#2b8a3e'), date: '2026-08-20', weightKg: 80.5 },
        template, format, lang: 'pl', accentHex: '#cefc22',
        fmtWeight: (kg: number) => `${kg.toFixed(1)} kg`, bgUrl: '/share/bg.webp',
      });
      let host = document.getElementById('share-proof-host');
      if (!host) {
        host = document.createElement('div');
        host.id = 'share-proof-host';
        host.style.cssText = 'position:fixed;left:0;top:0;z-index:99999;';
        document.body.appendChild(host);
      }
      host.innerHTML = html;
      const root = host.firstElementChild as HTMLElement;
      await Promise.all(Array.from(root.querySelectorAll('img')).map((img) => (img.complete ? null : new Promise((r) => { img.onload = r; img.onerror = r; }))));
      const rootRect = root.getBoundingClientRect();
      const photos = Array.from(root.querySelectorAll('img'))
        .filter((img) => img.getAttribute('src')!.startsWith('data:image/jpeg'))
        .map((img) => img.getBoundingClientRect());
      const svg = root.querySelector('svg');
      const svgRect = svg?.getBoundingClientRect() ?? null;
      const footer = Array.from(root.querySelectorAll('div')).find((d) => d.textContent?.trim() === 'strengthsave.app')!;
      const footerRect = footer.getBoundingClientRect();
      const inside = (r: DOMRect) => r.left >= rootRect.left - 0.01 && r.right <= rootRect.right + 0.01 && r.top >= rootRect.top - 0.01 && r.bottom <= rootRect.bottom + 0.01;
      const center = (a: number, b: number) => (a + b) / 2;
      return {
        svgCount: root.querySelectorAll('svg').length,
        photos: photos.map((r) => ({ w: r.width, h: r.height, inside: inside(r) })),
        arrow: svgRect ? {
          inside: inside(svgRect),
          between: format === 'square'
            ? svgRect.left >= photos[0].right && svgRect.right <= photos[1].left
            : svgRect.top >= photos[0].bottom && svgRect.bottom <= photos[1].top,
          centeredOnPhoto: format === 'square'
            ? Math.abs(center(svgRect.top, svgRect.bottom) - center(photos[0].top, photos[0].bottom)) <= 0.5
            : Math.abs(center(svgRect.left, svgRect.right) - center(photos[0].left, photos[0].right)) <= 0.5,
        } : null,
        footerInside: inside(footerRect),
        contentFits: root.scrollHeight <= rootRect.height + 0.5 && root.scrollWidth <= rootRect.width + 0.5,
        size: { w: rootRect.width, h: rootRect.height },
      };
    }, { template, format });

    const label = `${template}/${format}`;
    const box = format === 'square' ? { w: 226, h: 301 } : { w: 250, h: 333 };
    expect(m.size, label).toEqual(format === 'square' ? { w: 540, h: 540 } : { w: 540, h: 960 });
    expect(m.photos, label).toEqual([{ ...box, inside: true }, { ...box, inside: true }]);
    expect(m.footerInside, label).toBe(true);
    expect(m.contentFits, `${label}: tresc miesci sie w kontenerze`).toBe(true);
    if (template === 'classic') {
      expect(m.svgCount, label).toBe(1);
      expect(m.arrow, label).toEqual({ inside: true, between: true, centeredOnPhoto: true });
    } else {
      expect(m.svgCount, `${label}: bez strzalki`).toBe(0);
    }
  }
});
