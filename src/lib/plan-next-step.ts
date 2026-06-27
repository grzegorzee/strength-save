import type { PlanCycle } from '@/types/cycles';
import { buildCycleRecommendation } from '@/lib/cycle-insights';
import { translate, type LanguageCode } from '@/i18n';

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
  lang?: LanguageCode;
  hasPendingFinalSync?: boolean;
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
  lang = 'pl',
  hasPendingFinalSync = false,
}: BuildPlanNextStepParams): PlanNextStepAction | null => {
  const tr = (key: Parameters<typeof translate>[1], params?: Record<string, string | number>) => translate(lang, key, params);

  if (!hasPlan) {
    return {
      title: tr('plannext.noPlan.title'),
      description: tr('plannext.noPlan.desc'),
      badges: [tr('plannext.badge.startScratch')],
      primaryLabel: tr('plannext.btn.createPlan'),
      primaryPath: '/new-plan',
      secondaryLabel: tr('plannext.btn.viewCycles'),
      secondaryPath: '/cycles',
      tone: 'primary',
    };
  }

  if (!activeCycle) {
    if (isPlanExpired) {
      return {
        title: tr('plannext.ended.title'),
        description: tr('plannext.ended.desc'),
        badges: [tr('plannext.badge.planDone')],
        primaryLabel: tr('plannext.btn.newPlan'),
        primaryPath: '/new-plan',
        secondaryLabel: tr('plannext.btn.viewCycles'),
        secondaryPath: '/cycles',
        tone: 'primary',
      };
    }

    if (weeksRemaining <= 0) {
      return {
        title: tr('plannext.endingSoon.title'),
        description: tr('plannext.endingSoon.desc'),
        badges: [weeksRemaining === 0 ? tr('plannext.badge.lastWeek') : tr('plannext.badge.weeksLeft', { n: weeksRemaining })],
        primaryLabel: tr('plannext.btn.prepNext'),
        primaryPath: '/new-plan',
        secondaryLabel: tr('plannext.btn.viewPlan'),
        secondaryPath: '/plan',
        tone: 'warning',
      };
    }

    return null;
  }

  const recommendation = buildCycleRecommendation(
    activeCycle,
    previousCompletedCycle,
    today,
    lang,
    { hasPendingFinalSync },
  );

  // Świeży cykl tuż po onboardingu → pozytywna karta startowa bez metryk frekwencji
  // (żeby nie straszyć "0% frekwencji / 0 ominiętych" zanim user w ogóle zacznie).
  if (recommendation.isKickoff) {
    return null;
  }

  const badges = [
    tr('plannext.badge.week', { current: Math.min(currentWeek, planDurationWeeks), total: planDurationWeeks }),
    tr('plannext.badge.attendance', { pct: activeCycle.stats.completionRate }),
    tr('plannext.badge.prs', { n: activeCycle.stats.prs.length }),
  ];

  if (typeof activeCycle.stats.missedWorkouts === 'number') {
    badges.push(tr('plannext.badge.missed', { n: activeCycle.stats.missedWorkouts }));
  }

  if (isPlanExpired) {
    return {
      title: tr('plannext.closeout.title'),
      description: recommendation.description,
      badges,
      primaryLabel: tr('plannext.btn.prepNext'),
      primaryPath: `/new-plan?fromCycle=${activeCycle.id}`,
      secondaryLabel: tr('plannext.btn.viewCycles'),
      secondaryPath: '/cycles',
      tone: 'primary',
    };
  }

  if (weeksRemaining <= 0) {
    return {
      title: tr('plannext.endingDecide.title'),
      description: recommendation.description,
      badges,
      primaryLabel: tr('plannext.btn.prepNext'),
      primaryPath: `/new-plan?fromCycle=${activeCycle.id}`,
      secondaryLabel: tr('plannext.btn.closeout'),
      secondaryPath: '/cycles',
      tone: recommendation.tone === 'warning' ? 'warning' : 'primary',
    };
  }

  // Niska frekwencja w trakcie — ostrzeżenie, ale bez akcji closeoutu.
  if (recommendation.tone === 'warning') {
    return {
      title: recommendation.title,
      description: recommendation.description,
      badges,
      primaryLabel: tr('plannext.btn.viewPlan'),
      primaryPath: '/plan',
      secondaryLabel: tr('plannext.btn.history'),
      secondaryPath: '/history',
      tone: 'warning',
    };
  }

  // Cykl w trakcie bez problemów: nie pokazujemy karty "co dalej" przed ostatnim tygodniem.
  return null;
};
