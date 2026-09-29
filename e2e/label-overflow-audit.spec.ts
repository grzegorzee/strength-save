import { expect, test, type Page } from '@playwright/test';
import { blockFirebase, navigateAndWait, openProfileSection, setE2EAuthScenario } from './helpers';

const routes = [
  '/',
  '/day',
  '/plan',
  '/history',
  '/history?all=1',
  '/achievements',
  '/achievements?view=analytics&tab=charts',
  '/achievements?view=records',
  '/achievements?view=records&section=badges',
  '/measurements',
  '/cycles',
  '/exercises',
  '/exercises?group=chest',
  '/exercise/wyciskanie-hantli-lekki-skos',
  '/workout/day-1',
  '/plan/edit',
  '/new-plan',
  '/paywall',
  '/profile',
] as const;

type LabelIssue = {
  route: string;
  language: string;
  text: string;
  reason: string;
  tag: string;
};

// Test świadomie odcina Firebase. Błędy tego stubowanego transportu nie są
// błędami runtime aplikacji; wszystkie pozostałe console.error nadal failują audyt.
const isExpectedBlockedNetworkError = (text: string) =>
  text === 'Failed to load resource: net::ERR_FAILED'
  // WebKit reports route.abort() for this explicitly blocked Firestore
  // transport as an access-control error, instead of Chromium's ERR_FAILED.
  || /^\/firestore\.googleapis\.com\/google\.firestore\.v1\.Firestore\/(Listen|Write)\/channel\?.* due to access control checks\.$/.test(text)
  || (text.includes('@firebase/firestore') && text.includes('Could not reach Cloud Firestore backend'));

const inspectInteractiveLabels = async (page: Page, route: string, language: string): Promise<LabelIssue[]> =>
  page.evaluate(({ currentRoute, currentLanguage }) => {
    const issues: LabelIssue[] = [];
    const selector = 'button, a, [role="tab"], [role="menuitem"], [role="button"]';
    const candidates = Array.from(document.querySelectorAll<HTMLElement>(selector));

    for (const candidate of candidates) {
      if (candidate.offsetParent === null || candidate.dataset.allowLabelTruncate === 'true') continue;
      const text = (candidate.innerText || candidate.getAttribute('aria-label') || '').replace(/\s+/g, ' ').trim();
      if (!text) continue;
      const rect = candidate.getBoundingClientRect();
      if (rect.left < -1 || rect.right > window.innerWidth + 1) {
        issues.push({ route: currentRoute, language: currentLanguage, text, reason: 'outside-viewport', tag: candidate.tagName });
      }

      const textNodes = [candidate, ...Array.from(candidate.querySelectorAll<HTMLElement>('span, p'))];
      for (const node of textNodes) {
        const nodeText = (node.innerText || '').replace(/\s+/g, ' ').trim();
        if (!nodeText || node.offsetParent === null || node.classList.contains('sr-only')) continue;
        const style = getComputedStyle(node);
        const clipped = node.scrollWidth > node.clientWidth + 1
          && (style.overflowX === 'hidden' || style.textOverflow === 'ellipsis');
        if (clipped) {
          issues.push({ route: currentRoute, language: currentLanguage, text: nodeText, reason: 'clipped-label', tag: node.tagName });
          break;
        }
        if (/…$/.test(nodeText) || /\p{L}\.{3}$/u.test(nodeText)) {
          issues.push({ route: currentRoute, language: currentLanguage, text: nodeText, reason: 'abbreviated-descendant', tag: node.tagName });
          break;
        }
      }

      if (/[\p{L}]…$/u.test(text) || /[\p{L}]\.\.\.$/u.test(text)) {
        issues.push({ route: currentRoute, language: currentLanguage, text, reason: 'abbreviated-label', tag: candidate.tagName });
      }

      // F1 (2026-09-29): słowo etykiety nie może łamać się w środku
      // („Rozgrzewk / a" przy `overflow-wrap:anywhere`). Każde słowo (rozdzielone
      // spacją lub łącznikiem) musi leżeć w jednej linii: Range.getClientRects.
      const walker = document.createTreeWalker(candidate, NodeFilter.SHOW_TEXT);
      let brokenWord: string | null = null;
      for (let node = walker.nextNode(); node && !brokenWord; node = walker.nextNode()) {
        const parent = node.parentElement;
        if (!parent || parent.offsetParent === null || parent.closest('.sr-only')) continue;
        const data = node.textContent ?? '';
        for (const match of data.matchAll(/[^\s\-‐]+/gu)) {
          const range = document.createRange();
          range.setStart(node, match.index ?? 0);
          range.setEnd(node, (match.index ?? 0) + match[0].length);
          const tops = new Set([...range.getClientRects()].map((rect) => Math.round(rect.top)));
          if (tops.size > 1) {
            brokenWord = match[0];
            break;
          }
        }
      }
      if (brokenWord) {
        issues.push({ route: currentRoute, language: currentLanguage, text: `${text} [${brokenWord}]`, reason: 'word-broken-mid-word', tag: candidate.tagName });
      }
    }

    if (document.documentElement.scrollWidth > window.innerWidth + 1) {
      issues.push({
        route: currentRoute,
        language: currentLanguage,
        text: `${document.documentElement.scrollWidth}px > ${window.innerWidth}px`,
        reason: 'page-horizontal-overflow',
        tag: 'HTML',
      });
    }
    return issues;
  }, { currentRoute: route, currentLanguage: language });

for (const language of ['pl', 'en'] as const) {
  test(`statyczne etykiety nie są ucięte — ${language.toUpperCase()}`, async ({ page }) => {
    const runtimeErrors: string[] = [];
    page.on('pageerror', (error) => runtimeErrors.push(error.message));
    page.on('console', (message) => {
      if (message.type() === 'error' && !isExpectedBlockedNetworkError(message.text())) runtimeErrors.push(message.text());
    });
    await page.setViewportSize({ width: 320, height: 844 });
    await blockFirebase(page);
    await setE2EAuthScenario(page, 'active-user');
    await page.addInitScript((lang) => window.localStorage.setItem('app-language', lang), language);

    const issues: LabelIssue[] = [];
    for (const route of routes) {
      await navigateAndWait(page, route);
      issues.push(...await inspectInteractiveLabels(page, route, language));
    }

    expect(issues, JSON.stringify(issues, null, 2)).toEqual([]);
    expect(runtimeErrors, JSON.stringify(runtimeErrors, null, 2)).toEqual([]);
  });

  test(`menu, dialogi i rozwinięte ustawienia nie ucinają etykiet — ${language.toUpperCase()}`, async ({ page }) => {
    const runtimeErrors: string[] = [];
    page.on('pageerror', (error) => runtimeErrors.push(error.message));
    page.on('console', (message) => {
      if (message.type() === 'error' && !isExpectedBlockedNetworkError(message.text())) runtimeErrors.push(message.text());
    });
    await page.setViewportSize({ width: 320, height: 844 });
    await blockFirebase(page);
    await setE2EAuthScenario(page, 'active-user');
    await page.addInitScript((lang) => window.localStorage.setItem('app-language', lang), language);
    const issues: LabelIssue[] = [];

    await navigateAndWait(page, '/achievements');
    await page.getByTestId('analytics-actions-trigger').click();
    issues.push(...await inspectInteractiveLabels(page, '/achievements#actions', language));

    await navigateAndWait(page, '/plan');
    await page.getByTestId('plan-manage-trigger').click();
    issues.push(...await inspectInteractiveLabels(page, '/plan#manage', language));
    await navigateAndWait(page, '/');
    await navigateAndWait(page, '/plan');
    await page.reload();
    await page.waitForLoadState('domcontentloaded');
    await page.getByTestId('plan-reduced-open').click();
    issues.push(...await inspectInteractiveLabels(page, '/plan#reduced-mode', language));
    await navigateAndWait(page, '/');
    await navigateAndWait(page, '/plan');
    await page.reload();
    await page.waitForLoadState('domcontentloaded');
    await page.getByTestId('plan-vacation-open').click();
    issues.push(...await inspectInteractiveLabels(page, '/plan#vacation', language));

    await navigateAndWait(page, '/history');
    await page.getByTestId('history-export').click();
    issues.push(...await inspectInteractiveLabels(page, '/history#export', language));

    await navigateAndWait(page, '/profile');
    for (const section of ['training', 'timer', 'devices', 'notifications', 'subscription', 'data', 'account']) {
      await openProfileSection(page, section);
      issues.push(...await inspectInteractiveLabels(page, `/profile#${section}`, language));
    }

    expect(issues, JSON.stringify(issues, null, 2)).toEqual([]);
    expect(runtimeErrors, JSON.stringify(runtimeErrors, null, 2)).toEqual([]);
  });

  test(`logowanie, rejestracja i onboarding nie ucinają etykiet — ${language.toUpperCase()}`, async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 844 });
    await blockFirebase(page);
    await page.addInitScript((lang) => window.localStorage.setItem('app-language', lang), language);
    const issues: LabelIssue[] = [];

    await setE2EAuthScenario(page, 'unauthenticated');
    for (const route of ['/login', '/register']) {
      await navigateAndWait(page, route);
      issues.push(...await inspectInteractiveLabels(page, route, language));
    }

    await setE2EAuthScenario(page, 'new-user');
    await navigateAndWait(page, '/onboarding');
    issues.push(...await inspectInteractiveLabels(page, '/onboarding', language));

    expect(issues, JSON.stringify(issues, null, 2)).toEqual([]);
  });

  // 2026-09-29: dolna nawigacja web. 305 px = 320 px minus desktopowy pasek
  // przewijania (tak zwężał pasek w audycie); 5 zakładek musi zmieścić każde
  // słowo etykiety w jednej linii („PROGRESS" potrzebuje ~62 px).
  for (const width of [305, 320]) {
    test(`dolna nawigacja nie łamie słów przy ${width} px — ${language.toUpperCase()}`, async ({ page }) => {
      await page.setViewportSize({ width, height: 844 });
      await blockFirebase(page);
      await setE2EAuthScenario(page, 'active-user');
      await page.addInitScript((lang) => window.localStorage.setItem('app-language', lang), language);
      await navigateAndWait(page, '/');
      const labels = page.locator('nav .mobile-nav-label');
      await expect(labels).toHaveCount(5);
      const lines = await labels.evaluateAll((elements) => elements.map((element) => {
        const range = document.createRange();
        range.selectNodeContents(element);
        const tops = new Set([...range.getClientRects()].map((rect) => Math.round(rect.top)));
        return { text: element.textContent, lines: tops.size };
      }));
      expect(lines.filter(({ lines: count }) => count !== 1), JSON.stringify(lines)).toEqual([]);
    });
  }

  test(`panel administracyjny nie ucina etykiet — ${language.toUpperCase()}`, async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 844 });
    await blockFirebase(page);
    await setE2EAuthScenario(page, 'active-admin');
    await page.addInitScript((lang) => window.localStorage.setItem('app-language', lang), language);
    const issues: LabelIssue[] = [];

    for (const route of ['/admin', '/admin/users/e2e-test-user']) {
      await navigateAndWait(page, route);
      issues.push(...await inspectInteractiveLabels(page, route, language));
    }

    expect(issues, JSON.stringify(issues, null, 2)).toEqual([]);
  });
}
