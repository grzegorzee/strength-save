import { expect, test, type Page } from '@playwright/test';
import { blockFirebase, setE2EAuthScenario } from './helpers';

type Locale = 'pl' | 'en';
type Scale = 100 | 150 | 200;
type Surface = 'onboarding' | 'profile' | 'pre-start';
type ViewportName = '320x568' | '390x844' | '844x390';

type ProxyCoverage = {
  locale: Locale;
  scale: Scale;
  surface: Surface;
  viewport: ViewportName;
};

const VIEWPORTS: Record<ViewportName, { width: number; height: number }> = {
  '320x568': { width: 320, height: 568 },
  '390x844': { width: 390, height: 844 },
  '844x390': { width: 844, height: 390 },
};

// Pairwise zamiast pełnego iloczynu 3 ekrany × 2 języki × 3 viewporty × 3 skale.
// Każdy krytyczny ekran nadal przechodzi wszystkie trzy skale, a całość pokrywa
// oba języki, kompaktowy telefon, standardowy telefon i landscape.
const PROXY_COVERAGE: ProxyCoverage[] = [
  { surface: 'onboarding', locale: 'pl', viewport: '320x568', scale: 100 },
  { surface: 'onboarding', locale: 'en', viewport: '390x844', scale: 150 },
  { surface: 'onboarding', locale: 'pl', viewport: '844x390', scale: 200 },
  { surface: 'profile', locale: 'en', viewport: '844x390', scale: 100 },
  { surface: 'profile', locale: 'pl', viewport: '320x568', scale: 150 },
  { surface: 'profile', locale: 'en', viewport: '390x844', scale: 200 },
  { surface: 'pre-start', locale: 'pl', viewport: '390x844', scale: 100 },
  { surface: 'pre-start', locale: 'en', viewport: '844x390', scale: 150 },
  { surface: 'pre-start', locale: 'pl', viewport: '320x568', scale: 200 },
];

test('proxy coverage matrix includes both locales, compact/standard/landscape and every scale per surface', () => {
  expect(new Set(PROXY_COVERAGE.map(({ locale }) => locale))).toEqual(new Set(['pl', 'en']));
  expect(new Set(PROXY_COVERAGE.map(({ viewport }) => viewport))).toEqual(
    new Set(['320x568', '390x844', '844x390']),
  );
  for (const surface of ['onboarding', 'profile', 'pre-start'] satisfies Surface[]) {
    expect(new Set(
      PROXY_COVERAGE.filter((entry) => entry.surface === surface).map(({ scale }) => scale),
    )).toEqual(new Set([100, 150, 200]));
  }
});

const setLanguage = async (page: Page, locale: Locale) => {
  await page.addInitScript((value) => localStorage.setItem('app-language', value), locale);
};

const enableTextScaleProxy = async (page: Page, scale: Scale) => {
  await page.evaluate((percentage) => {
    document.documentElement.style.setProperty('--app-text-scale', `${percentage}%`);
    document.documentElement.dataset.textScale = String(percentage);

    // Desktopowe silniki Playwright nie rasteryzują text-size-adjust tak jak
    // natywny WKWebView/WebSettings. Skalujemy wyłącznie elementy z własnym
    // tekstem, zachowując spacing/layout, aby zasymulować presję font scale.
    const elements = [...document.body.querySelectorAll<HTMLElement>('*')]
      .filter((element) => [...element.childNodes].some((node) => (
        node.nodeType === Node.TEXT_NODE && Boolean(node.textContent?.trim())
      )));
    const factor = percentage / 100;
    const sizes = elements.map((element) => Number.parseFloat(getComputedStyle(element).fontSize));
    elements.forEach((element, index) => {
      if (Number.isFinite(sizes[index])) {
        element.style.fontSize = `${sizes[index] * factor}px`;
      }
    });
  }, scale);
};

const expectReflowWithoutHorizontalScroll = async (page: Page) => {
  await expect.poll(() => page.locator('#root > *').count()).toBeGreaterThan(0);
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(1);
};

const expectTextNotClipped = async (locator: import('@playwright/test').Locator) => {
  const clipped = await locator.evaluateAll((roots) => {
    const textElements = roots.flatMap((root) => [
      root,
      ...root.querySelectorAll<HTMLElement>('*'),
    ]).filter((element): element is HTMLElement => (
      element instanceof HTMLElement
      && [...element.childNodes].some((node) => (
        node.nodeType === Node.TEXT_NODE && Boolean(node.textContent?.trim())
      ))
    ));

    return textElements.flatMap((element) => {
      const rect = element.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return [];
      const horizontalOverflow = element.scrollWidth - element.clientWidth;
      const verticalOverflow = element.scrollHeight - element.clientHeight;
      if (horizontalOverflow <= 1 && verticalOverflow <= 1) return [];
      return [{
        horizontalOverflow,
        text: element.textContent?.trim().replace(/\s+/g, ' ').slice(0, 80),
        verticalOverflow,
      }];
    });
  });

  expect(clipped).toEqual([]);
};

const expectElementsNotToOverlap = async (locator: import('@playwright/test').Locator) => {
  const overlaps = await locator.evaluateAll((elements) => {
    const visible = elements.map((element) => ({
      rect: element.getBoundingClientRect(),
      text: element.textContent?.trim().replace(/\s+/g, ' ').slice(0, 50),
    })).filter(({ rect }) => rect.width > 0 && rect.height > 0);
    const collisions: Array<{ first?: string; second?: string }> = [];

    for (let firstIndex = 0; firstIndex < visible.length; firstIndex += 1) {
      for (let secondIndex = firstIndex + 1; secondIndex < visible.length; secondIndex += 1) {
        const first = visible[firstIndex];
        const second = visible[secondIndex];
        const overlapWidth = Math.min(first.rect.right, second.rect.right)
          - Math.max(first.rect.left, second.rect.left);
        const overlapHeight = Math.min(first.rect.bottom, second.rect.bottom)
          - Math.max(first.rect.top, second.rect.top);
        if (overlapWidth > 1 && overlapHeight > 1) {
          collisions.push({ first: first.text, second: second.text });
        }
      }
    }
    return collisions;
  });

  expect(overlaps).toEqual([]);
};

const prepareScenario = async (page: Page, coverage: ProxyCoverage) => {
  await page.setViewportSize(VIEWPORTS[coverage.viewport]);
  await blockFirebase(page);
  await setE2EAuthScenario(
    page,
    coverage.surface === 'onboarding' ? 'new-user' : 'active-user',
  );
  await setLanguage(page, coverage.locale);
};

test.describe('mobile font-scale proxy', () => {
  test('publiczny web pozwala użytkownikowi powiększyć stronę', async ({ page }) => {
    await blockFirebase(page);
    await setE2EAuthScenario(page, 'new-user');

    await page.goto('./#/onboarding');
    const viewport = await page.locator('meta[name="viewport"]').getAttribute('content');

    expect(viewport).toContain('width=device-width');
    expect(viewport).toContain('viewport-fit=cover');
    expect(viewport).not.toContain('maximum-scale');
    expect(viewport).not.toContain('user-scalable');
  });

  for (const coverage of PROXY_COVERAGE) {
    test(`${coverage.surface} ${coverage.locale} ${coverage.viewport} at ${coverage.scale}%`, async ({ page }) => {
      await prepareScenario(page, coverage);

      if (coverage.surface === 'onboarding') {
        await page.goto('./#/onboarding');
        const next = page.getByTestId('ob-personalization-next');
        await expect(next).toBeVisible();
        await enableTextScaleProxy(page, coverage.scale);
        await next.scrollIntoViewIfNeeded();
        await expect(next).toBeInViewport();
        await expectTextNotClipped(next);
      }

      if (coverage.surface === 'profile') {
        await page.goto('./#/profile');
        const accentLabel = page.getByText(
          coverage.locale === 'pl' ? 'Kolor przewodni aplikacji' : 'App accent color',
        );
        await expect(accentLabel).toBeVisible();
        await enableTextScaleProxy(page, coverage.scale);
        const navigation = page.getByRole('navigation', {
          name: coverage.locale === 'pl' ? 'Nawigacja mobilna' : 'Mobile navigation',
        });
        const navigationLabels = navigation.locator('a > span:last-child');
        await expect(navigation).toBeVisible();
        await expectTextNotClipped(accentLabel);
        await expectTextNotClipped(navigationLabels);
        await expectElementsNotToOverlap(navigationLabels);
      }

      if (coverage.surface === 'pre-start') {
        await page.goto('./#/workout/day-1');
        const start = page.getByRole('button', {
          name: coverage.locale === 'pl' ? /rozpocznij trening/i : /start workout/i,
        });
        await expect(start).toBeVisible();
        await enableTextScaleProxy(page, coverage.scale);
        await start.scrollIntoViewIfNeeded();
        await expect(start).toBeInViewport();
        await expectTextNotClipped(start);

        const navigation = page.getByRole('navigation', {
          name: coverage.locale === 'pl' ? 'Nawigacja mobilna' : 'Mobile navigation',
        });
        await expectElementsNotToOverlap(start.or(navigation));
      }

      await expectReflowWithoutHorizontalScroll(page);
    });
  }
});
