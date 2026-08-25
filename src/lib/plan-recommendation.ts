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

// Wagi (X31 H2, hotfix regresji WP-O): LICZBA DNI = TWARDY PRIORYTET. Liczba dni
// to jawna decyzja usera (krok 4 wybiera też konkretne dni tygodnia); cel i poziom
// są wtórne. Porządek jest leksykograficzny (D=dzień, O=cel, L=poziom):
//  1. Δ1 dnia NIGDY nie wygrywa z dokładnymi dniami, nawet przy zgodnym celu
//     i poziomie (najgorszy przypadek dokładnych dni = zły cel, zły poziom):  D > O + 2L
//  2. Przy tych samych dniach cel bije poziom:                                O > 2L
// Inna liczba dni może wygrać TYLKO, gdy katalog nie ma żadnego szablonu
// z dokładną liczbą dni (dziś katalog pokrywa 2-6 dni, więc praktycznie nigdy).
// Wagi X30 (100/150/10) pozwalały celowi przesunąć rekomendację o ±1 dzień:
// user na realnym koncie wybrał redukcję + 3 dni i dostał 4-dniowy Lean Engine.
const DAY_WEIGHT = 1000;
const OBJECTIVE_BONUS = 100;
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
