import { useState } from 'react';
import { Check } from 'lucide-react';
import { useTranslation } from '@/contexts/LanguageContext';
import type { TranslationKey } from '@/i18n';
import { localizeExerciseName } from '@/data/exercise-i18n';
import { localizeFocus, localizePlanName } from '@/lib/plan-i18n';
import { getPlanTemplateImageUrl } from '@/lib/exercise-media';
import type { PlanTemplate } from '@/data/planTemplates';
import { cn } from '@/lib/utils';

/** WP-F (X28): hero szablonu (pro-look dark-gym-v1). Obraz dekoracyjny: alt=""
 *  + lazy; brak/błąd pliku = karta bez obrazka (żaden ekran nie pada od webp). */
export const PlanTemplateHero = ({ templateId, className }: { templateId: string; className?: string }) => {
  const [failed, setFailed] = useState(false);
  if (failed) return null;
  return (
    <img
      src={getPlanTemplateImageUrl(templateId)}
      alt=""
      aria-hidden="true"
      loading="lazy"
      draggable={false}
      className={cn('w-full object-cover', className)}
      onError={() => setFailed(true)}
    />
  );
};

export type PlanChoiceBadge = 'recommended' | 'alternative' | 'chosen';

const BADGE_KEY: Record<PlanChoiceBadge, TranslationKey> = {
  recommended: 'ob.match.badgeRecommended',
  alternative: 'ob.match.badgeAlternative',
  chosen: 'ob.match.badgeChosen',
};

/** Średnia liczba ćwiczeń na trening (meta karty). */
const averageExercisesPerDay = (tpl: Pick<PlanTemplate, 'days'>): number => {
  if (!tpl.days.length) return 0;
  return Math.round(tpl.days.reduce((sum, d) => sum + d.exercises.length, 0) / tpl.days.length);
};

interface PlanChoiceCardProps {
  template: PlanTemplate;
  badge: PlanChoiceBadge;
  /** Jedno zdanie "dlaczego" (etykiety celu i poziomu szablonu), liczone przez hosta. */
  why: string;
  selected: boolean;
  onSelect: () => void;
  testId?: string;
}

/**
 * X33 WP-2: karta planu w kroku 5A ("Dopasowane do Ciebie"). Tap = zaznaczenie
 * (aria-pressed, ramka w akcencie). Zasada 7: nic tu nie jest zaznaczalne,
 * touch-action: manipulation.
 */
export const PlanChoiceCard = ({ template, badge, why, selected, onSelect, testId }: PlanChoiceCardProps) => {
  const { t, lang } = useTranslation();
  const first = template.days[0];
  const firstExercises = first
    ? first.exercises.slice(0, 3).map((e) => localizeExerciseName(e.name, lang)).join(', ')
      + (first.exercises.length > 3 ? '…' : '')
    : '';
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onSelect}
      data-testid={testId}
      className={cn(
        'w-full select-none touch-manipulation overflow-hidden rounded-2xl text-left transition-all',
        selected ? 'bg-surface-high ring-2 ring-primary' : 'bg-surface-low hover:bg-surface-container',
      )}
    >
      <PlanTemplateHero templateId={template.id} className="h-24" />
      <div className="p-4">
        <div className="flex items-center justify-between gap-2">
          <span
            data-testid="plan-choice-badge"
            className={cn(
              'rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide',
              badge === 'recommended' ? 'bg-primary/15 text-primary' : 'bg-surface-highest text-muted-foreground',
            )}
          >
            {t(BADGE_KEY[badge])}
          </span>
          <span className={cn('flex h-5 w-5 shrink-0 items-center justify-center rounded-full', selected ? 'bg-primary text-primary-foreground' : 'border-2 border-surface-highest')}>
            {selected && <Check className="h-3 w-3" />}
          </span>
        </div>
        <h3 data-testid="plan-choice-name" className="mt-2 font-heading text-lg font-bold leading-tight text-primary">
          {localizePlanName(template.id, template.name, lang)}
        </h3>
        <p className="mt-0.5 text-[13px] text-muted-foreground">{why}</p>
        <p data-testid="plan-choice-meta" className="mt-2 text-[12px] tabular-nums text-muted-foreground">
          {t('ob.match.meta', { weeks: template.durationWeeks, days: template.daysPerWeek, exercises: averageExercisesPerDay(template) })}
        </p>
        {first && (
          <p data-testid="plan-choice-first" className="mt-1 text-[12px] leading-snug">
            {t('ob.match.firstWorkout', { day: localizeFocus(first.focus, lang), exercises: firstExercises })}
          </p>
        )}
      </div>
    </button>
  );
};
