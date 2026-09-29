import type { PlanObjective, PlanTemplate } from '@/data/planTemplates';
import { findLibraryExercise } from '@/data/exerciseLibrary';

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
// T6 (2026-09-29): LEVEL_WEIGHT 10 -> 60. Różnica poziomów o 2 (beginner vs
// advanced) przeważa nad zgodnością celu (2L = 120 > O = 100), o 1 nie (60 < 100).
// Nadal D > O + 2L (1000 > 220), więc liczba dni zostaje twardym priorytetem.
// F7: szablon z ćwiczeniem requiresBodyweightSupport jest dla beginnera
// niedozwolony: kara większa niż każda odległość dni (lista nadal zawiera
// wszystkie szablony, ale takie lądują na końcu i nigdy nie są rekomendacją,
// dopóki katalog ma jakikolwiek dozwolony szablon).
const DAY_WEIGHT = 1000;
const OBJECTIVE_BONUS = 100;
const LEVEL_WEIGHT = 60;
const NOT_ALLOWED_PENALTY = 1_000_000;

/** T6 (F7): szablon zawiera ćwiczenie z ciałem podpartym na rękach/przedramionach
 *  albo podnoszonym masą ciała (flaga biblioteki, także przez aliasy nazw planu). */
export const templateRequiresBodyweightSupport = (template: PlanTemplate): boolean =>
  template.days.some((day) => day.exercises.some((exercise) =>
    findLibraryExercise(exercise.name)?.requiresBodyweightSupport === true));

export interface TemplateEligibilityCriteria {
  level?: PlanTemplate['level'];
}

/** T6: czy szablon wolno pokazać/rekomendować profilowi (twarde filtry przed scoringiem). */
export const isTemplateAllowed = (template: PlanTemplate, criteria: TemplateEligibilityCriteria): boolean =>
  !(criteria.level === 'beginner' && templateRequiresBodyweightSupport(template));

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
      - levelDelta * LEVEL_WEIGHT
      - (isTemplateAllowed(template, criteria) ? 0 : NOT_ALLOWED_PENALTY);
    const reasons: RecommendationReason[] = [];
    if (dayDelta === 0) reasons.push('exact-days');
    else if (dayDelta === 1) reasons.push('close-days');
    if (objectiveMatch) reasons.push('objective-match');
    if (levelDelta === 0) reasons.push('level-match');
    return { template, score, reasons };
  });
  return scored.sort((a, b) => b.score - a.score);
};

export interface TemplatesForDays {
  templates: PlanTemplate[];
  /** true = kazdy szablon ma dokladnie `daysPerWeek` dni; false = pula zastepcza (+-1 dnia albo caly katalog). */
  exactDays: boolean;
}

/**
 * X32: pula szablonow dla kroku 5 i Browse plans = WYLACZNIE szablony o liczbie
 * dni z kroku 4 (user wybral 3 dni, dostaje tylko plany 3-dniowe). Guard na
 * katalog bez tej liczby dni (dzis niemozliwe, katalog pokrywa 2..6): szablony
 * o +-1 dnia, a gdy i tych brak, caly katalog; caller pokazuje wtedy jawna
 * etykiete (exactDays=false). Kolejnosc w puli = kolejnosc katalogu (scoring
 * robi scoreTemplates).
 */
export const selectTemplatesForDays = (
  daysPerWeek: number,
  catalog: readonly PlanTemplate[],
  /** T6: twarde filtry profilu (F7 dla beginnera) PRZED doborem po dniach. */
  criteria: TemplateEligibilityCriteria = {},
): TemplatesForDays => {
  const templates = catalog.filter((t) => isTemplateAllowed(t, criteria));
  const exact = templates.filter((t) => t.daysPerWeek === daysPerWeek);
  if (exact.length) return { templates: exact, exactDays: true };
  const near = templates.filter((t) => Math.abs(t.daysPerWeek - daysPerWeek) === 1);
  return { templates: near.length ? near : [...templates], exactDays: false };
};
