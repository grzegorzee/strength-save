import { describe, it, expect } from 'vitest';
import { localizePlanName, localizePlanDescription } from '@/lib/plan-i18n';
import { planTemplates } from '@/data/planTemplates';

// Z164: każdy gotowy plan ma opis EN — inaczej user EN dostaje polski akapit.

describe('opisy i nazwy gotowych planów po EN (Z164)', () => {
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
    ]);
  });

  it('PL w danych szablonu = PL w i18n (jedno źródło tekstu kanonicznego)', () => {
    for (const tpl of planTemplates) {
      expect(localizePlanDescription(tpl.id, tpl.description, 'pl'), tpl.id).toBe(tpl.description);
    }
  });
});
