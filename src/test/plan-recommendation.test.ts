import { describe, expect, it } from 'vitest';
import { scoreTemplates } from '@/lib/plan-recommendation';
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

  it('WŁASNOŚĆ: dla KAŻDEJ kombinacji cel × poziom × dni(2..6) rekomendacja ma dokładnie wybraną liczbę dni', () => {
    for (const objective of OBJECTIVES) {
      for (const level of LEVELS) {
        for (const daysPerWeek of DAYS) {
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
          const scored = scoreTemplates({ objective, level, daysPerWeek }, planTemplates);
          for (let i = 1; i < scored.length; i++) {
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
    // fat_loss/3: brak fat_loss w 3 dniach → pierwszy 3-dniowy intermediate z katalogu.
    const top = scoreTemplates({ objective: 'fat_loss', level: 'intermediate', daysPerWeek: 3 }, planTemplates)[0];
    expect(top.template.id).toBe('tpl-fullbody-3');
    expect(top.reasons).toEqual(['exact-days', 'level-match']);
  });

  it('Δ1 dnia wygrywa tylko przy BRAKU szablonu z dokładną liczbą dni (katalog bez 3-dniowych)', () => {
    const noThreeDay = planTemplates.filter((t) => t.daysPerWeek !== 3);
    const top = scoreTemplates({ objective: 'fat_loss', level: 'intermediate', daysPerWeek: 3 }, noThreeDay)[0];
    expect(top.template.id).toBe('tpl-lean-engine-4');
    expect(top.reasons).toContain('close-days');
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
