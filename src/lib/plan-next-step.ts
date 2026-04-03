import type { PlanCycle } from '@/types/cycles';
import { buildCycleRecommendation } from '@/lib/cycle-insights';

export interface PlanNextStepAction {
  title: string;
  description: string;
  badges: string[];
  primaryLabel: string;
  primaryPath: string;
  secondaryLabel?: string;
  secondaryPath?: string;
  tone: 'primary' | 'warning' | 'success' | 'info';
}

interface BuildPlanNextStepParams {
  hasPlan: boolean;
  isPlanExpired: boolean;
  weeksRemaining: number;
  currentWeek: number;
  planDurationWeeks: number;
  activeCycle: PlanCycle | null;
  previousCompletedCycle: PlanCycle | null;
  today?: Date;
}

export const buildPlanNextStep = ({
  hasPlan,
  isPlanExpired,
  weeksRemaining,
  currentWeek,
  planDurationWeeks,
  activeCycle,
  previousCompletedCycle,
  today = new Date(),
}: BuildPlanNextStepParams): PlanNextStepAction => {
  if (!hasPlan) {
    return {
      title: 'Brakuje aktywnego planu',
      description: 'Ułóż pierwszy plan, żeby aplikacja mogła prowadzić trening, cykle i progres.',
      badges: ['Start od zera'],
      primaryLabel: 'Stwórz plan',
      primaryPath: '/new-plan',
      secondaryLabel: 'Zobacz cykle',
      secondaryPath: '/cycles',
      tone: 'primary',
    };
  }

  if (!activeCycle) {
    if (isPlanExpired) {
      return {
        title: 'Plan się zakończył i czeka na kolejny krok',
        description: 'Wygeneruj nowy plan albo wróć do cykli, żeby podsumować ostatni blok treningowy.',
        badges: ['Plan zakończony'],
        primaryLabel: 'Nowy plan',
        primaryPath: '/new-plan',
        secondaryLabel: 'Zobacz cykle',
        secondaryPath: '/cycles',
        tone: 'primary',
      };
    }

    if (weeksRemaining <= 2) {
      return {
        title: 'Końcówka planu: przygotuj kolejny blok',
        description: 'Do końca obecnego planu zostało niewiele czasu. To dobry moment, żeby zaplanować kolejny cykl.',
        badges: [`${weeksRemaining === 0 ? 'ostatni tydzień' : `${weeksRemaining} tyg. do końca`}`],
        primaryLabel: 'Przygotuj kolejny plan',
        primaryPath: '/new-plan',
        secondaryLabel: 'Zobacz plan',
        secondaryPath: '/plan',
        tone: 'warning',
      };
    }

    return {
      title: 'Trzymaj kurs i monitoruj plan',
      description: 'Masz aktywny plan. Sprawdzaj regularnie historię i cykle, żeby odpowiednio wcześnie zauważyć stagnację.',
      badges: [`Tydzień ${Math.min(currentWeek, planDurationWeeks)}/${planDurationWeeks}`],
      primaryLabel: 'Zobacz cykle',
      primaryPath: '/cycles',
      secondaryLabel: 'Historia treningów',
      secondaryPath: '/history',
      tone: 'info',
    };
  }

  const recommendation = buildCycleRecommendation(activeCycle, previousCompletedCycle, today);
  const badges = [
    `Tydzień ${Math.min(currentWeek, planDurationWeeks)}/${planDurationWeeks}`,
    `${activeCycle.stats.completionRate}% frekwencji`,
    `${activeCycle.stats.prs.length} PR`,
  ];

  if (typeof activeCycle.stats.missedWorkouts === 'number') {
    badges.push(`${activeCycle.stats.missedWorkouts} opuszczonych`);
  }

  if (isPlanExpired) {
    return {
      title: 'Cykl jest gotowy do zamknięcia',
      description: recommendation.description,
      badges,
      primaryLabel: 'Przygotuj kolejny plan',
      primaryPath: `/new-plan?fromCycle=${activeCycle.id}`,
      secondaryLabel: 'Zobacz cykle',
      secondaryPath: '/cycles',
      tone: 'primary',
    };
  }

  if (weeksRemaining <= 2) {
    return {
      title: 'Końcówka planu: zdecyduj, co dalej',
      description: recommendation.description,
      badges,
      primaryLabel: 'Przygotuj kolejny plan',
      primaryPath: `/new-plan?fromCycle=${activeCycle.id}`,
      secondaryLabel: 'Zobacz closeout',
      secondaryPath: '/cycles',
      tone: recommendation.tone === 'warning' ? 'warning' : 'primary',
    };
  }

  if (recommendation.tone === 'warning') {
    return {
      title: recommendation.title,
      description: recommendation.description,
      badges,
      primaryLabel: 'Zobacz closeout',
      primaryPath: '/cycles',
      secondaryLabel: 'Historia treningów',
      secondaryPath: '/history',
      tone: 'warning',
    };
  }

  if (recommendation.tone === 'success') {
    return {
      title: recommendation.title,
      description: recommendation.description,
      badges,
      primaryLabel: 'Zobacz closeout',
      primaryPath: '/cycles',
      secondaryLabel: 'Przygotuj kolejny plan',
      secondaryPath: `/new-plan?fromCycle=${activeCycle.id}`,
      tone: 'success',
    };
  }

  return {
    title: recommendation.title,
    description: recommendation.description,
    badges,
    primaryLabel: 'Zobacz closeout',
    primaryPath: '/cycles',
    secondaryLabel: 'Historia treningów',
    secondaryPath: '/history',
    tone: 'info',
  };
};
