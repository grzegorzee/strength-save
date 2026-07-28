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
