import { expect, test } from '@playwright/test';
import { blockFirebase, navigateAndWait, setE2EAuthScenario, setE2EMeasurements } from './helpers';

// Zgłoszenie z iPhone'a 390 px: selektory PRZED / PO w porównaniu sylwetki
// ucinały datę ("21 sie… ⌄"). Wybrana wartość ma krótki format numeryczny
// i MUSI mieścić się w triggerze bez ucięcia na 390, 360 i 320 px (PL i EN).
// Pomiar: jedna linia (Range), naturalna szerokość tekstu <= box, brak „…".

const UID = 'e2e-test-user';
// 1x1 PNG — zdjęcie nie wpływa na szerokość triggera.
const PNG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';
// Aktualne wersje dokumentów jak w full-app.spec (zgoda zdrowotna aktywna).
const consents = {
  termsVersion: '2.0',
  privacyVersion: '2.1',
  healthGranted: true,
  healthVersion: '1.1',
  healthEpoch: 1,
  healthGrantId: 'grant-1',
  marketingGranted: false,
  marketingVersion: '1.0',
};
const measurements = [
  { id: 'm-before', userId: UID, date: '2026-05-12', weight: 84, waist: 90, recordedAt: Date.parse('2026-05-12T08:00:00'), photoUrl: PNG, photoPath: 'body-photos/x/1.jpg' },
  { id: 'm-mid', userId: UID, date: '2026-07-01', weight: 83.1, waist: 89, recordedAt: Date.parse('2026-07-01T08:00:00') },
  { id: 'm-after', userId: UID, date: '2026-08-21', weight: 82.5, waist: 88, recordedAt: Date.parse('2026-08-21T08:00:00'), photoUrl: PNG, photoPath: 'body-photos/x/2.jpg' },
];

type Fit = { key: string; text: string; naturalWidth: number; clientWidth: number; lines: number; fits: boolean };

const measureTriggers = (): Fit[] => ['before', 'after'].map((key) => {
  const trigger = document.querySelector<HTMLElement>(`[data-testid="body-photo-select-${key}"]`);
  const span = trigger?.querySelector<HTMLElement>(':scope > span');
  if (!trigger || !span) return { key, text: '', naturalWidth: -1, clientWidth: 0, lines: 0, fits: false };
  const text = (span.textContent || '').trim();
  const cs = getComputedStyle(span);
  const probe = document.createElement('span');
  probe.textContent = text;
  probe.style.cssText = `position:absolute;left:-9999px;top:0;white-space:nowrap;font:${cs.font};letter-spacing:${cs.letterSpacing};`;
  document.body.appendChild(probe);
  const naturalWidth = probe.getBoundingClientRect().width;
  probe.remove();
  const range = document.createRange();
  range.selectNodeContents(span);
  const lines = range.getClientRects().length;
  const fits = lines === 1
    && span.scrollWidth <= span.clientWidth
    && span.scrollHeight <= span.clientHeight + 1
    && naturalWidth <= span.clientWidth + 0.5
    && !text.includes('…');
  return { key, text, naturalWidth: Math.round(naturalWidth * 10) / 10, clientWidth: span.clientWidth, lines, fits };
});

const expectedShort: Record<'pl' | 'en', { before: string; after: string }> = {
  pl: { before: '12.05.2026', after: '21.08.2026' },
  en: { before: '05/12/2026', after: '08/21/2026' },
};

for (const language of ['pl', 'en'] as const) {
  for (const width of [390, 360, 320] as const) {
    test(`selektory PRZED / PO: krótka data mieści się w triggerze — ${language.toUpperCase()} ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 844 });
      await blockFirebase(page);
      await setE2EAuthScenario(page, 'active-user', { hasWorkouts: true, consents });
      await setE2EMeasurements(page, measurements);
      await page.addInitScript((lang) => window.localStorage.setItem('app-language', lang), language);

      await navigateAndWait(page, '/measurements');
      await expect(page.getByTestId('body-photo-select-before')).toBeVisible();
      await page.evaluate(() => document.fonts.ready);

      const fits = await page.evaluate(measureTriggers);
      const byKey = Object.fromEntries(fits.map((f) => [f.key, f]));
      expect(byKey.before.text).toBe(expectedShort[language].before);
      expect(byKey.after.text).toBe(expectedShort[language].after);
      expect(fits.filter((f) => !f.fits), JSON.stringify(fits, null, 2)).toEqual([]);
    });
  }
}
