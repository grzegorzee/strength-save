import { describe, expect, it } from 'vitest';
import { scoreTemplates } from '@/lib/plan-recommendation';
import { getRecommendedPlan, planTemplates } from '@/data/planTemplates';

// WP-O (X30): scoring rekomendacji wydzielony do lib/plan-recommendation.
// Nowy kontrakt wag: częstotliwość wygrywa, ale cel może przesunąć rekomendację
// o ±1 dzień (stare wagi 1000/100/10 ignorowały cel przy braku szablonu
// z dokładną liczbą dni — fat_loss/3 dni dostawał plan na masę zamiast
// 4-dniowego planu redukcyjnego).

describe('scoreTemplates (WP-O)', () => {
  it('zwraca WSZYSTKIE szablony posortowane po score malejąco', () => {
    const scored = scoreTemplates({ objective: 'build_muscle', level: 'intermediate', daysPerWeek: 4 }, planTemplates);
    expect(scored).toHaveLength(planTemplates.length);
    for (let i = 1; i < scored.length; i++) {
      expect(scored[i - 1].score).toBeGreaterThanOrEqual(scored[i].score);
    }
  });

  it('dokładna liczba dni + cel + poziom = najlepszy wynik (stary sensowny przypadek bez degradacji)', () => {
    const top = scoreTemplates({ objective: 'build_muscle', level: 'intermediate', daysPerWeek: 4 }, planTemplates)[0];
    expect(top.template.daysPerWeek).toBe(4);
    expect(top.template.objective).toBe('build_muscle');
    expect(top.reasons).toContain('exact-days');
    expect(top.reasons).toContain('objective-match');
  });

  it('cel nie jest ignorowany: fat_loss przy 3 dniach rekomenduje 4-dniowy Lean Engine (±1 dzień)', () => {
    // Katalog ma JEDEN szablon fat_loss (tpl-lean-engine-4, 4 dni). Stare wagi
    // dawały tu 3-dniowy plan na masę; nowy kontrakt: zgodny cel w tolerancji
    // ±1 dnia wygrywa z dokładną liczbą dni przy złym celu.
    const top = scoreTemplates({ objective: 'fat_loss', level: 'intermediate', daysPerWeek: 3 }, planTemplates)[0];
    expect(top.template.id).toBe('tpl-lean-engine-4');
    expect(top.reasons).toContain('objective-match');
    expect(top.reasons).toContain('close-days');
  });

  it('fat_loss przy 5 dniach: również Lean Engine (±1 dzień w dół)', () => {
    const top = scoreTemplates({ objective: 'fat_loss', level: 'intermediate', daysPerWeek: 5 }, planTemplates)[0];
    expect(top.template.id).toBe('tpl-lean-engine-4');
  });

  it('tolerancja jest twarda: Δ2 dni NIE wygrywa mimo zgodnego celu', () => {
    // fat_loss przy 2 dniach: Lean Engine (4 dni, Δ2) musi przegrać
    // z dokładnym 2-dniowym szablonem innego celu.
    const top = scoreTemplates({ objective: 'fat_loss', level: 'beginner', daysPerWeek: 2 }, planTemplates)[0];
    expect(top.template.daysPerWeek).toBe(2);
  });

  it('przy tej samej liczbie dni i celu poziom rozstrzyga', () => {
    // 5 dni build_muscle: hybrid-5 (intermediate) przed split-5/phat-5 (advanced).
    const top = scoreTemplates({ objective: 'build_muscle', level: 'intermediate', daysPerWeek: 5 }, planTemplates)[0];
    expect(top.template.id).toBe('tpl-hybrid-5');
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
