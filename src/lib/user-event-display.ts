// B-T6: serwerowe zdarzenia niosą SEMANTYKĘ (type + payload), nie gotowe
// stringi — każde urządzenie renderuje we własnym języku i jednostkach.
import { formatPRValue, type PRComparison } from '@/lib/pr-utils';
import type { TranslationKey } from '@/i18n';
import type { UserEvent } from '@/lib/user-events';

export interface UserEventDisplayCtx {
  t: (key: TranslationKey, params?: Record<string, string | number>) => string;
  localizeExerciseName: (name: string) => string;
  /** kg -> string w jednostce usera, np. "105 kg" / "231 lbs". */
  fmtWeight: (kg: number) => string;
  fmtDuration: (sec: number) => string;
  toDisplay: (kg: number) => number;
  unit: string;
}

export interface UserEventDisplay {
  title: string;
  body?: string;
}

const num = (value: unknown): number => (typeof value === 'number' && Number.isFinite(value) ? value : 0);
const str = (value: unknown): string => (typeof value === 'string' ? value : '');

export const describeUserEvent = (event: UserEvent, ctx: UserEventDisplayCtx): UserEventDisplay => {
  const p = event.payload ?? {};
  switch (event.type) {
    case 'pr': {
      const name = ctx.localizeExerciseName(str(p.name));
      const value = formatPRValue(
        {
          exerciseId: '',
          exerciseName: name,
          type: (str(p.prType) || 'weight') as PRComparison['type'],
          newValue: num(p.newValue),
          oldValue: 0,
        },
        {
          prReps: (n) => ctx.t('workout.completion.prReps', { n }),
          weight: ctx.fmtWeight,
          duration: ctx.fmtDuration,
          est1RM: (kg) => ctx.t('pr.est1rmValue', { value: ctx.fmtWeight(kg) }),
        },
      );
      return {
        title: ctx.t('inbox.pr.title', { name }),
        body: ctx.t('inbox.pr.body', { value }),
      };
    }
    case 'badge': {
      const threshold = num(p.threshold);
      const body = str(p.category) === 'tonnage'
        ? ctx.t('achievements.ms.tonnage', {
          n: Number((ctx.toDisplay(threshold) / 1000).toFixed(1)),
          unit: ctx.unit === 'lbs' ? ' k lbs' : 't',
        })
        : ctx.t('achievements.ms.workouts', { n: threshold });
      return { title: ctx.t('inbox.badge.title'), body };
    }
    case 'week':
      return {
        title: ctx.t('inbox.week.title'),
        body: ctx.t('inbox.week.body', {
          n: num(p.workouts),
          tonnage: ctx.fmtWeight(num(p.tonnageKg)),
        }),
      };
    case 'plan': {
      const action = str(p.action);
      const params = { days: num(p.days), weeks: num(p.weeks) };
      return {
        title: ctx.t('inbox.plan.title'),
        body: action === 'ended'
          ? ctx.t('inbox.plan.ended')
          : action === 'started'
            ? ctx.t('inbox.plan.started', params)
            : ctx.t('inbox.plan.changed', params),
      };
    }
    default:
      return { title: str(p.title) || event.type };
  }
};
