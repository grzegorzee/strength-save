import { describe, expect, it } from 'vitest';
import { scoreTemplates, selectTemplatesForDays, templateRequiresBodyweightSupport } from '@/lib/plan-recommendation';
import { getRecommendedPlan, planTemplates, type PlanObjective, type PlanTemplate } from '@/data/planTemplates';

// X31 H2 (hotfix regresji WP-O): liczba dni to JAWNA decyzja usera (krok 4
// wybiera też konkretne dni tygodnia), więc jest twardym priorytetem scoringu.
// Wagi X30 (100/150/10) pozwalały celowi przesunąć rekomendację o ±1 dzień:
// user z realnego konta wybrał redukcję + 3 dni i dostał 4-dniowy Lean Engine.
// Kontrakt: szablon z dokładną liczbą dni ZAWSZE przed każdym o innej liczbie;
// wśród dokładnych cel, potem poziom.

const OBJECTIVES: PlanObjective[] = ['build_muscle', 'peak_strength', 'fat_loss', 'athletic'];
const LEVELS: PlanTemplate['level'][] = ['beginner', 'intermediate', 'advanced'];
const DAYS = [2, 3, 4, 5, 6];

describe('scoreTemplates: liczba dni twardym priorytetem (X31 H2)', () => {
  it('zwraca WSZYSTKIE szablony posortowane po score malejąco', () => {
    const scored = scoreTemplates({ objective: 'build_muscle', level: 'intermediate', daysPerWeek: 4 }, planTemplates);
    expect(scored).toHaveLength(planTemplates.length);
    for (let i = 1; i < scored.length; i++) {
      expect(scored[i - 1].score).toBeGreaterThanOrEqual(scored[i].score);
    }
  });

  it('REGRESJA 1:1 (realne konto): fat_loss / intermediate / 3 dni → szablon 3-dniowy, NIE tpl-lean-engine-4', () => {
    const top = scoreTemplates({ objective: 'fat_loss', level: 'intermediate', daysPerWeek: 3 }, planTemplates)[0];
    expect(top.template.id).not.toBe('tpl-lean-engine-4');
    expect(top.template.daysPerWeek).toBe(3);
    expect(top.reasons).toContain('exact-days');
  });

  it('WŁASNOŚĆ: dla KAŻDEJ kombinacji cel × poziom × dni(2..6) rekomendacja ma dokładnie wybraną liczbę dni (jeśli istnieje dozwolony szablon)', () => {
    for (const objective of OBJECTIVES) {
      for (const level of LEVELS) {
        for (const daysPerWeek of DAYS) {
          // T6 (F7): beginner nie dostaje szablonu z requiresBodyweightSupport, nawet
          // kosztem liczby dni. Wyjątek dotyczy tylko liczby dni bez dozwolonego szablonu.
          const allowedExact = planTemplates.some((t) => t.daysPerWeek === daysPerWeek
            && (level !== 'beginner' || !templateRequiresBodyweightSupport(t)));
          if (!allowedExact) continue;
          const top = scoreTemplates({ objective, level, daysPerWeek }, planTemplates)[0];
          expect(top.template.daysPerWeek, `${objective}/${level}/${daysPerWeek} → ${top.template.id}`).toBe(daysPerWeek);
        }
      }
    }
  });

  it('WŁASNOŚĆ: cała lista jest posortowana najpierw po odległości dni (Browse plans pokazuje dokładne dni na górze)', () => {
    for (const objective of OBJECTIVES) {
      for (const level of LEVELS) {
        for (const daysPerWeek of DAYS) {
          // T6 (F7): dla beginnera szablony z podporem na rękach idą na sam koniec
          // listy; porządek po dniach obowiązuje w obrębie każdej z dwóch grup.
          const all = scoreTemplates({ objective, level, daysPerWeek }, planTemplates);
          const flagged = (s: typeof all[number]) => level === 'beginner' && templateRequiresBodyweightSupport(s.template);
          const firstFlagged = all.findIndex(flagged);
          if (firstFlagged >= 0) expect(all.slice(firstFlagged).every(flagged), `${objective}/${level}/${daysPerWeek}`).toBe(true);
          for (const scored of [all.filter((s) => !flagged(s)), all.filter(flagged)]) for (let i = 1; i < scored.length; i++) {
            const prev = Math.abs(scored[i - 1].template.daysPerWeek - daysPerWeek);
            const cur = Math.abs(scored[i].template.daysPerWeek - daysPerWeek);
            expect(prev, `${objective}/${level}/${daysPerWeek} pozycja ${i}`).toBeLessThanOrEqual(cur);
          }
        }
      }
    }
  });

  it('wśród dokładnych dni cel wygrywa z poziomem: peak_strength / intermediate / 3 dni → szablon peak_strength (beginner)', () => {
    // 3-dniowe peak_strength są tylko beginner (5x5, GZCLP); 3-dniowe intermediate
    // są build_muscle. Cel ma bić poziom.
    const top = scoreTemplates({ objective: 'peak_strength', level: 'intermediate', daysPerWeek: 3 }, planTemplates)[0];
    expect(top.template.daysPerWeek).toBe(3);
    expect(top.template.objective).toBe('peak_strength');
    expect(top.reasons).toContain('objective-match');
  });

  it('przy tej samej liczbie dni i celu poziom rozstrzyga', () => {
    // 5 dni build_muscle: hybrid-5 (intermediate) przed split-5/phat-5 (advanced).
    const top = scoreTemplates({ objective: 'build_muscle', level: 'intermediate', daysPerWeek: 5 }, planTemplates)[0];
    expect(top.template.id).toBe('tpl-hybrid-5');
  });

  it('brak szablonu celu przy wybranych dniach: dokładne dni + najbliższy poziom (cel wtórny)', () => {
    // fat_loss/6: brak fat_loss w 6 dniach → pierwszy 6-dniowy intermediate z katalogu.
    // (T6: fat_loss/3 ma już własny szablon tpl-express-3, więc przypadek przeniesiony na 6 dni.)
    const top = scoreTemplates({ objective: 'fat_loss', level: 'intermediate', daysPerWeek: 6 }, planTemplates)[0];
    expect(top.template.id).toBe('tpl-ppl-6');
    expect(top.reasons).toEqual(['exact-days', 'level-match']);
  });

  it('Δ1 dnia wygrywa tylko przy BRAKU szablonu z dokładną liczbą dni (katalog bez 3-dniowych)', () => {
    const noThreeDay = planTemplates.filter((t) => t.daysPerWeek !== 3);
    const top = scoreTemplates({ objective: 'fat_loss', level: 'intermediate', daysPerWeek: 3 }, noThreeDay)[0];
    expect(top.template.id).toBe('tpl-lean-engine-4');
    expect(top.reasons).toContain('close-days');
  });

  it('X32: rekomendacja z puli przefiltrowanej po dniach = rekomendacja z całego katalogu (kontrakt getRecommendedPlan bez zmian)', () => {
    for (const objective of OBJECTIVES) {
      for (const level of LEVELS) {
        for (const daysPerWeek of DAYS) {
          // T6: pula z twardymi filtrami profilu (F7 dla beginnera), jak w kreatorze.
          const pool = selectTemplatesForDays(daysPerWeek, planTemplates, { level }).templates;
          expect(scoreTemplates({ objective, level, daysPerWeek }, pool)[0].template.id)
            .toBe(getRecommendedPlan(objective, level, daysPerWeek).id);
        }
      }
    }
  });

  it('getRecommendedPlan deleguje do scoreTemplates (ten sam zwycięzca)', () => {
    const cases = [
      { objective: 'build_muscle', level: 'intermediate', daysPerWeek: 3 },
      { objective: 'peak_strength', level: 'advanced', daysPerWeek: 4 },
      { objective: 'fat_loss', level: 'intermediate', daysPerWeek: 3 },
      { objective: 'athletic', level: 'beginner', daysPerWeek: 3 },
    ] as const;
    for (const c of cases) {
      expect(getRecommendedPlan(c.objective, c.level, c.daysPerWeek).id)
        .toBe(scoreTemplates(c, planTemplates)[0].template.id);
    }
  });
});

// T6 (2026-09-29): F7 w rekomendacji + większa kara za różnicę poziomów.
// Uzasadnienie zmian kontraktu X31 H2: liczba dni pozostaje twardym priorytetem
// WŚRÓD szablonów dozwolonych dla profilu. Dla beginnera szablon z ćwiczeniem
// wymagającym podporu na rękach/podnoszenia masy ciała (plank, pompki z podłogi,
// podciąganie bez asysty, dipy, zwisy) nie jest dozwolony NIGDY; przy 5-6 dniach
// katalog nie ma takiego szablonu, więc beginner dostaje najbliższą liczbę dni
// z jawną etykietą (exactDays=false), zamiast planu z plankiem i podciąganiem.
describe('T6: F7 i kara za różnicę poziomów', () => {
  it('WŁASNOŚĆ: beginner NIGDY nie dostaje rekomendacji z requiresBodyweightSupport (każdy cel × dni)', () => {
    for (const objective of OBJECTIVES) {
      for (const daysPerWeek of DAYS) {
        const viaCatalog = scoreTemplates({ objective, level: 'beginner', daysPerWeek }, planTemplates)[0].template;
        const viaPool = scoreTemplates({ objective, level: 'beginner', daysPerWeek },
          selectTemplatesForDays(daysPerWeek, planTemplates, { level: 'beginner' }).templates)[0].template;
        const viaApi = getRecommendedPlan(objective, 'beginner', daysPerWeek);
        for (const tpl of [viaCatalog, viaPool, viaApi]) {
          expect(templateRequiresBodyweightSupport(tpl), `${objective}/beginner/${daysPerWeek} → ${tpl.id}`).toBe(false);
        }
      }
    }
  });

  it('pula kroku 5 dla beginnera nie zawiera szablonów z F7; inne poziomy widzą cały katalog dni', () => {
    for (const daysPerWeek of DAYS) {
      const beginnerPool = selectTemplatesForDays(daysPerWeek, planTemplates, { level: 'beginner' });
      expect(beginnerPool.templates.length, `${daysPerWeek}`).toBeGreaterThan(0);
      for (const tpl of beginnerPool.templates) expect(templateRequiresBodyweightSupport(tpl), tpl.id).toBe(false);
      expect(selectTemplatesForDays(daysPerWeek, planTemplates, { level: 'intermediate' }))
        .toEqual(selectTemplatesForDays(daysPerWeek, planTemplates));
    }
  });

  it('beginner + dni bez dozwolonego szablonu: najbliższa liczba dni z jawną etykietą', () => {
    const exactAllowed = (d: number) => planTemplates.some((t) => t.daysPerWeek === d && !templateRequiresBodyweightSupport(t));
    for (const daysPerWeek of DAYS.filter((d) => !exactAllowed(d))) {
      const pool = selectTemplatesForDays(daysPerWeek, planTemplates, { level: 'beginner' });
      expect(pool.exactDays).toBe(false);
      const top = getRecommendedPlan('build_muscle', 'beginner', daysPerWeek);
      expect(top.daysPerWeek).not.toBe(daysPerWeek);
    }
  });

  it('różnica poziomów o 2 przeważa nad zgodnością celu; o 1 nie', () => {
    const tpl = (id: string, level: PlanTemplate['level'], objective: PlanObjective): PlanTemplate => ({
      id, name: id, description: '', goal: 'muscle', objective, level, daysPerWeek: 3, durationWeeks: 8, days: [],
    });
    const catalog = [tpl('beg-strength', 'beginner', 'peak_strength'), tpl('adv-muscle', 'advanced', 'build_muscle')];
    expect(scoreTemplates({ objective: 'peak_strength', level: 'advanced', daysPerWeek: 3 }, catalog)[0].template.id).toBe('adv-muscle');
    const catalog1 = [tpl('int-strength', 'intermediate', 'peak_strength'), tpl('adv-muscle', 'advanced', 'build_muscle')];
    expect(scoreTemplates({ objective: 'peak_strength', level: 'advanced', daysPerWeek: 3 }, catalog1)[0].template.id).toBe('int-strength');
  });
});

// X32: krok 5 i Browse plans widzą TYLKO szablony o liczbie dni z kroku 4
// (user wybrał 3 dni = dostaje wyłącznie plany 3-dniowe). Pusta pula (katalog
// bez tej liczby dni) = szablony o +-1 dnia z jawną etykietą; brak i tych =
// cały katalog (scoreTemplates i tak sortuje po odległości dni).
describe('selectTemplatesForDays: pula szablonów pod liczbę dni z kroku 4 (X32)', () => {
  it('WŁASNOŚĆ: dla każdej liczby dni 2..6 pula jest niepusta i zawiera WYŁĄCZNIE szablony o tej liczbie dni', () => {
    for (const daysPerWeek of DAYS) {
      const pool = selectTemplatesForDays(daysPerWeek, planTemplates);
      expect(pool.exactDays, `${daysPerWeek} dni`).toBe(true);
      expect(pool.templates.length, `${daysPerWeek} dni`).toBe(planTemplates.filter((t) => t.daysPerWeek === daysPerWeek).length);
      for (const tpl of pool.templates) expect(tpl.daysPerWeek, tpl.id).toBe(daysPerWeek);
    }
  });

  it('pula pusta: katalog bez 3-dniowych → szablony o 2 i 4 dniach, exactDays=false', () => {
    const noThreeDay = planTemplates.filter((t) => t.daysPerWeek !== 3);
    const pool = selectTemplatesForDays(3, noThreeDay);
    expect(pool.exactDays).toBe(false);
    expect(pool.templates.length).toBeGreaterThan(0);
    for (const tpl of pool.templates) expect([2, 4]).toContain(tpl.daysPerWeek);
    expect(pool.templates.length).toBe(noThreeDay.filter((t) => t.daysPerWeek === 2 || t.daysPerWeek === 4).length);
  });

  it('pula pusta także dla +-1: zostaje cały katalog (nie pusty ekran)', () => {
    const onlySixDay = planTemplates.filter((t) => t.daysPerWeek === 6);
    const pool = selectTemplatesForDays(2, onlySixDay);
    expect(pool.exactDays).toBe(false);
    expect(pool.templates).toEqual(onlySixDay);
  });
});
