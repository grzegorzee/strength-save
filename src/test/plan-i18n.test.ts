import { describe, it, expect } from 'vitest';
import { localizePlanName, localizePlanDescription, localizeFocus, localizeDayName, FOCUS_TOKEN_EN } from '@/lib/plan-i18n';
import { planTemplates } from '@/data/planTemplates';

// Z164: każdy gotowy plan ma opis EN — inaczej user EN dostaje polski akapit.

describe('opisy i nazwy gotowych planów po EN (Z164)', () => {
  it('T6: focus każdego dnia nowych szablonów ma EN bez polskich znaków (Moc/Objętość)', () => {
    const polish = /[ąćęłńóśźż]/i;
    // Kontrakt dla szablonów T6. Znany dług sprzed T6 (poza zakresem, zgłoszony):
    // RZA "tył uda + barki", 531-bbb "... + objętość", nsuns "Martwy ciąg", "wąsko".
    const T6_IDS = new Set(planTemplates.slice(planTemplates.findIndex((t) => t.id === 'tpl-fatloss-3')).map((t) => t.id));
    expect(T6_IDS.size).toBe(17); // 16 planów T6 + plan bez sprzętu T6b
    for (const tpl of planTemplates.filter((t) => T6_IDS.has(t.id))) {
      for (const d of tpl.days) expect(localizeFocus(d.focus ?? '', 'en'), `${tpl.id} ${d.id}: ${d.focus}`).not.toMatch(polish);
    }
    expect(localizeFocus('Moc Góra', 'en')).toBe('Power Upper');
    expect(localizeFocus('Objętość B', 'en')).toBe('Volume B');
  });

  it('każdy szablon ma nazwę i opis EN bez polskich znaków', () => {
    const polish = /[ąćęłńóśźż]/i;
    for (const tpl of planTemplates) {
      expect(localizePlanName(tpl.id, tpl.name, 'en'), `${tpl.id} name`).not.toMatch(polish);
      expect(localizePlanDescription(tpl.id, tpl.description, 'en'), `${tpl.id} desc`).not.toMatch(polish);
    }
  });

  it('PL zwraca kanoniczne teksty źródłowe (niezmiennik)', () => {
    for (const tpl of planTemplates) {
      expect(localizePlanDescription(tpl.id, tpl.description, 'pl').length).toBeGreaterThan(0);
    }
    const rza = planTemplates.find(t => t.id === 'tpl-rza-3');
    expect(rza).toBeTruthy();
    expect(localizePlanDescription('tpl-rza-3', rza!.description, 'pl')).toBe(rza!.description);
  });
});

// 2026-09-29 (audyt R1, ryzyko prawne): płatna apka nie używa cudzych marek,
// nazw programów ani nazwisk autorów w nazwach i opisach szablonów. ID planów
// zostają bez zmian (aktywne plany userów się do nich odwołują).
describe('nazwy i opisy planów bez cudzych marek (2026-09-29)', () => {
  const foreignBrands = /wendler|5\/3\/1|boring but big|\bbbb\b|nsuns|531lp|gzcl|built with science|strong curves|contreras|renaissance periodization|layne norton|\bphat\b|\bphul\b|nippard|starting strength|stronglifts|arnold split|recommended routine|bodyweightfitness|\br\/\w+/i;

  it('żaden szablon (PL/EN, dane i i18n) nie zawiera cudzych marek', () => {
    for (const tpl of planTemplates) {
      for (const lang of ['pl', 'en'] as const) {
        expect(localizePlanName(tpl.id, tpl.name, lang), `${tpl.id} name ${lang}`).not.toMatch(foreignBrands);
        expect(localizePlanDescription(tpl.id, tpl.description, lang), `${tpl.id} desc ${lang}`).not.toMatch(foreignBrands);
      }
      expect(tpl.name, `${tpl.id} data name`).not.toMatch(foreignBrands);
      expect(tpl.description, `${tpl.id} data desc`).not.toMatch(foreignBrands);
    }
  });

  it('NIEZMIENNIK: ID szablonów bez zmian', () => {
    expect(planTemplates.map((tpl) => tpl.id)).toEqual([
      'tpl-fullbody-2', 'tpl-fullbody-3', 'tpl-fbw-3', 'tpl-ppl-3', 'tpl-upper-lower-4', 'tpl-split-5',
      'tpl-ppl-6', 'tpl-push-pull-4', 'tpl-strength-5x5', 'tpl-powerbuilding-4', 'tpl-lean-engine-4',
      'tpl-athletic-4', 'tpl-rza-3', 'tpl-minimalist-2', 'tpl-six-lifts-3', 'tpl-gzclp-3',
      'tpl-calisthenics-3', 'tpl-glutes-3', 'tpl-phul-4', 'tpl-531-bbb-4', 'tpl-meso-4', 'tpl-phat-5',
      'tpl-hybrid-5', 'tpl-nsuns-5', 'tpl-arnold-6',
      // T6 (2026-09-29): nowe szablony dopisane na końcu katalogu (istniejące id i kolejność bez zmian).
      'tpl-fatloss-3', 'tpl-home-db-3', 'tpl-glutes-4', 'tpl-strength-2', 'tpl-beginner-ul-4', 'tpl-athletic-3',
      'tpl-home-db-4', 'tpl-fatloss-2', 'tpl-fatloss-5', 'tpl-strength-ul-4', 'tpl-strength-6', 'tpl-glutes-2',
      'tpl-health-50-2', 'tpl-kettlebell-3', 'tpl-express-3', 'tpl-travel-2',
      // T6b: plan bez sprzętu dla początkujących (beginner + masa ciała).
      'tpl-bodyweight-home-3',
    ]);
  });

  it('PL w danych szablonu = PL w i18n (jedno źródło tekstu kanonicznego)', () => {
    for (const tpl of planTemplates) {
      expect(localizePlanDescription(tpl.id, tpl.description, 'pl'), tpl.id).toBe(tpl.description);
    }
  });
});

// T6b (2026-09-29): KAŻDY tekst EN szablonu (nazwa, opis, nazwa dnia, focus)
// bez polskich znaków i bez polskich słów focusu. Wcześniej RZA ("tył uda +
// barki"), 531-bbb ("+ objętość"), nsuns ("Martwy ciąg", "wąsko") przeciekały.
describe('kontrakt EN wszystkich szablonów (T6b)', () => {
  const polishChars = /[ąćęłńóśźż]/i;
  const polishWords = new Set([
    ...Object.keys(FOCUS_TOKEN_EN).map((w) => w.toLowerCase()),
    'martwy', 'ciąg', 'wyciskanie', 'wąsko', 'objętość', 'tył', 'uda', 'barki', 'dzień', 'przysiad', 'i', 'oraz',
  ]);
  const leaks = (text: string) => text.toLowerCase().split(/[^a-ząćęłńóśźż]+/i).filter((w) => polishWords.has(w));

  it('focus, nazwa dnia, nazwa i opis po EN: zero polskich znaków i słów', () => {
    const problems: string[] = [];
    for (const tpl of planTemplates) {
      const texts = [
        ['name', localizePlanName(tpl.id, tpl.name, 'en')],
        ['desc', localizePlanDescription(tpl.id, tpl.description, 'en')],
        ...tpl.days.flatMap((d) => [
          [`${d.id} dayName`, localizeDayName(d.dayName, 'en')],
          [`${d.id} focus`, localizeFocus(d.focus ?? '', 'en')],
        ]),
      ];
      for (const [where, text] of texts) {
        if (polishChars.test(text) || leaks(text).length) problems.push(`${tpl.id} ${where}: ${text}`);
      }
    }
    expect(problems).toEqual([]);
  });

  it('"Dzień A" -> "Day A"; własne nazwy dni usera i PL bez zmian', () => {
    expect(localizeDayName('Dzień A', 'en')).toBe('Day A');
    expect(localizeDayName('Dzień A', 'pl')).toBe('Dzień A');
    expect(localizeDayName('Klatka i plecy', 'en')).toBe('Klatka i plecy');
    expect(localizeDayName('Poniedziałek', 'en')).toBe('Monday');
  });
});

