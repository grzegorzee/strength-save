import type { PlanObjective, PlanTemplate } from '@/data/planTemplates';

// WP-O (X30): scoring rekomendacji planu wydzielony z planTemplates.ts.
// Moduł jest czysty (tylko typy z data/) — katalog szablonów podaje caller,
// dzięki czemu nie ma cyklu importów planTemplates <-> plan-recommendation.

export interface PlanRecommendationCriteria {
  objective: PlanObjective;
  level: PlanTemplate['level'];
  daysPerWeek: number;
}

export type RecommendationReason = 'exact-days' | 'close-days' | 'objective-match' | 'level-match';

export interface ScoredPlanTemplate {
  template: PlanTemplate;
  score: number;
  reasons: RecommendationReason[];
}

const LEVEL_RANK: Record<PlanTemplate['level'], number> = { beginner: 0, intermediate: 1, advanced: 2 };

// Wagi (WP-O): częstotliwość nadal wygrywa, ale cel może przesunąć rekomendację
// o ±1 dzień. Niezmienniki, które te liczby MUSZĄ spełniać (D=dzień, O=cel, L=poziom):
//  1. Δ1 dnia + zgodny cel (najgorszy poziom) > dokładne dni + zły cel:  O > D + 2L
//  2. Δ2 dni NIGDY nie wygrywa z dokładnymi dniami:                      O < 2D - 2L
//  3. Przy tych samych dniach cel bije poziom:                           O > 2L
// Stare wagi 1000/100/10 łamały (1): jedyny szablon fat_loss (4 dni) przegrywał
// z 3-dniowym planem na masę, gdy user wybrał redukcję i 3 dni.
const DAY_WEIGHT = 100;
const OBJECTIVE_BONUS = 150;
const LEVEL_WEIGHT = 10;

/**
 * Punktuje i sortuje szablony pod odpowiedzi usera (cel × poziom × dni/tydz).
 * Zwraca POSORTOWANĄ malejąco listę (remis rozstrzyga pozycja w katalogu —
 * Array.prototype.sort jest stabilny). Element [0] to rekomendacja.
 */
export const scoreTemplates = (
  criteria: PlanRecommendationCriteria,
  templates: readonly PlanTemplate[],
): ScoredPlanTemplate[] => {
  const scored = templates.map((template): ScoredPlanTemplate => {
    const dayDelta = Math.abs(template.daysPerWeek - criteria.daysPerWeek);
    const levelDelta = Math.abs(LEVEL_RANK[template.level] - LEVEL_RANK[criteria.level]);
    const objectiveMatch = template.objective === criteria.objective;
    const score = -dayDelta * DAY_WEIGHT
      + (objectiveMatch ? OBJECTIVE_BONUS : 0)
      - levelDelta * LEVEL_WEIGHT;
    const reasons: RecommendationReason[] = [];
    if (dayDelta === 0) reasons.push('exact-days');
    else if (dayDelta === 1) reasons.push('close-days');
    if (objectiveMatch) reasons.push('objective-match');
    if (levelDelta === 0) reasons.push('level-match');
    return { template, score, reasons };
  });
  return scored.sort((a, b) => b.score - a.score);
};
