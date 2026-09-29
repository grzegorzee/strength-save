import { expect, test, type Page } from '@playwright/test';
import { blockFirebase, navigateAndWait, setE2EAuthScenario, skipPreStartWarmupIfShown } from './helpers';

// F1 (2026-09-29): chip „Rozgrzewka" łamał się w środku słowa („Rozgrzewk / a")
// na iPhonie przy Dynamic Type 112%. Siatka chipów miała minimum kolumny w rem,
// a iOS skaluje tekst od body (src/styles/ios.css), więc rem NIE rośnie z tekstem:
// przy 393 px i 112% trzy chipy dostawały po ~75 px na słowo, które potrzebuje ~79 px,
// a `[overflow-wrap:anywhere]` łamał je w środku.
//
// Proxy Dynamic Type: iOS `text-size-adjust` na body powiększa COMPUTED font-size
// całego poddrzewa (dlatego em w ios.css „follows actual text size"). Desktopowe
// silniki Playwright tego nie robią, więc mnożymy computed font-size KAŻDEGO
// elementu body (także kontenerów bez własnego tekstu). Wartości bazowe liczone raz,
// kolejne skale nie kumulują się.

const WIDTHS = [320, 375, 393, 430] as const;
const SCALES = [100, 112, 135] as const;
const CHIP_LABELS = ['Rozgrzewka', 'Talerze', 'Metryki'];

const applyBodyTextScale = async (page: Page, percentage: number) => {
  await page.evaluate((scale) => {
    const w = window as unknown as { __baseFontSizes?: Map<HTMLElement, number> };
    if (!w.__baseFontSizes) {
      w.__baseFontSizes = new Map(
        [document.body, ...document.body.querySelectorAll<HTMLElement>('*')]
          .map((element) => [element, Number.parseFloat(getComputedStyle(element).fontSize)]),
      );
    }
    w.__baseFontSizes.forEach((size, element) => {
      if (Number.isFinite(size)) element.style.fontSize = `${size * (scale / 100)}px`;
    });
  }, percentage);
};

// Liczba linii, na których leży tekst chipa (Range.getClientRects węzła tekstu).
const chipTextLines = (page: Page) => page.getByTestId('exercise-card-chips').first().evaluate((grid) => (
  [...grid.children].map((chip) => {
    const textNode = [...chip.childNodes].find((node) => (
      node.nodeType === Node.TEXT_NODE && Boolean(node.textContent?.trim())
    ));
    if (!textNode) return { text: chip.textContent?.trim() ?? '', lines: -1 };
    const range = document.createRange();
    range.selectNodeContents(textNode);
    const tops = new Set([...range.getClientRects()].map((rect) => Math.round(rect.top)));
    return { text: textNode.textContent?.trim() ?? '', lines: tops.size };
  })
));

test.describe('F1: chipy karty ćwiczenia nie łamią słów przy Dynamic Type', () => {
  for (const width of WIDTHS) {
    test(`${width}px × ${SCALES.join('/')}%: każda etykieta chipa w jednej linii`, async ({ page }) => {
      await page.setViewportSize({ width, height: 844 });
      await blockFirebase(page);
      // Zgoda zdrowotna = trzeci chip „Metryki" (najciaśniejszy wariant paska).
      await setE2EAuthScenario(page, 'active-user', {
        consents: {
          termsVersion: '2.0',
          privacyVersion: '2.1',
          healthGranted: true,
          healthVersion: '1.1',
          healthEpoch: 1,
          healthGrantId: 'e2e-chips-text-scale-health-grant',
        },
      });
      await navigateAndWait(page, '/workout/day-1');
      await page.getByRole('button', { name: /Rozpocznij trening/i }).click();
      await skipPreStartWarmupIfShown(page);

      const chips = page.getByTestId('exercise-card-chips').first();
      await expect(chips).toBeVisible();
      await expect.poll(async () => (await chipTextLines(page)).map(({ text }) => text)).toEqual(CHIP_LABELS);

      const results: Array<{ scale: number; text: string; lines: number }> = [];
      for (const scale of SCALES) {
        await applyBodyTextScale(page, scale);
        for (const chip of await chipTextLines(page)) results.push({ scale, ...chip });
      }

      const broken = results.filter(({ lines }) => lines !== 1);
      expect(broken, JSON.stringify(results)).toEqual([]);
    });
  }
});
