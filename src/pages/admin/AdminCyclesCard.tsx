import { useMemo, useState, type ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';
import { useTranslation } from '@/contexts/LanguageContext';
import { dateLocale, type TranslationKey } from '@/i18n';
import { cn, formatLocalDateLabel } from '@/lib/utils';
import { WEEKDAYS } from '@/lib/plan-cycle-utils';
import type { Weekday } from '@/data/trainingPlan';
import type { PlanCycle, PlanCycleChoice } from '@/types/cycles';
import { LEVEL_KEY, OBJECTIVE_KEY, SOURCE_KEY, templateName, weekdayShorts } from './AdminOnboardingCard';

// WP-7 (X33): karta "Cykle" w szczegole usera panelu admina — lista cykli
// z plan_cycles + odpowiedzi z kreatora zapisane na cyklu (`choice`, kontrakt
// sekcji 3 planu X33). Wzorzec 1:1 z AdminOnboardingCard: eksport nazwany,
// props z gory (host laduje dokumenty), bez wlasnego <Card>, 100% t(...)
// (guard admin-i18n-scan). Etykiety dat przez wariant safe (zasada 11):
// aktywny cykl ma endDate '' az do archiwizacji.

const CHOICE_LEVELS = new Set<string>(['beginner', 'intermediate', 'advanced']);
const CHOICE_OBJECTIVES = new Set<string>(['build_muscle', 'peak_strength', 'fat_loss', 'athletic']);
const CHOICE_SOURCES = new Set<string>(['recommended', 'browsed', 'custom']);
const CHOICE_ENTRIES = new Set<string>(['onboarding', 'replan']);

const str = (value: unknown): string | undefined =>
  typeof value === 'string' && value ? value : undefined;

const isWeekday = (value: unknown): value is Weekday =>
  typeof value === 'string' && WEEKDAYS.some((w) => w.value === value);

/** Defensywny parser pola plan_cycles.choice (dane z Firestore = niezaufane).
 *  Uszkodzony / nieznany ksztalt = null; cykl bez choice jest poprawny. */
export const parseCycleChoice = (raw: unknown): PlanCycleChoice | null => {
  if (typeof raw !== 'object' || raw === null) return null;
  const r = raw as Record<string, unknown>;
  const chosenAt = str(r.chosenAt);
  const level = str(r.level);
  const objective = str(r.objective);
  const planSource = str(r.planSource);
  const entry = str(r.entry);
  if (
    r.version !== 1
    || chosenAt === undefined
    || level === undefined || !CHOICE_LEVELS.has(level)
    || objective === undefined || !CHOICE_OBJECTIVES.has(objective)
    || planSource === undefined || !CHOICE_SOURCES.has(planSource)
    || entry === undefined || !CHOICE_ENTRIES.has(entry)
    || typeof r.daysPerWeek !== 'number' || !Number.isFinite(r.daysPerWeek)
    || !Array.isArray(r.trainingDays)
  ) return null;
  const choice: PlanCycleChoice = {
    version: 1,
    chosenAt,
    level: level as PlanCycleChoice['level'],
    objective: objective as PlanCycleChoice['objective'],
    daysPerWeek: r.daysPerWeek,
    trainingDays: r.trainingDays.filter(isWeekday),
    planSource: planSource as PlanCycleChoice['planSource'],
    entry: entry as PlanCycleChoice['entry'],
  };
  const templateId = str(r.templateId);
  const recommendedTemplateId = str(r.recommendedTemplateId);
  const planName = str(r.planName);
  if (templateId) choice.templateId = templateId;
  if (recommendedTemplateId) choice.recommendedTemplateId = recommendedTemplateId;
  if (planName) choice.planName = planName;
  return choice;
};

const ENTRY_KEY: Record<PlanCycleChoice['entry'], TranslationKey> = {
  onboarding: 'admin.cycles.entry.onboarding',
  replan: 'admin.cycles.entry.replan',
};

const DATE_OPTIONS: Intl.DateTimeFormatOptions = { day: '2-digit', month: '2-digit', year: 'numeric' };

const Row = ({ label, children }: { label: string; children: ReactNode }) => (
  <div className="flex items-baseline justify-between gap-3">
    <span className="shrink-0 text-xs text-muted-foreground">{label}</span>
    <span className="text-right text-sm font-medium">{children}</span>
  </div>
);

const ChoiceView = ({ choice }: { choice: PlanCycleChoice }) => {
  const { t, lang } = useTranslation();
  const chosenTs = Date.parse(choice.chosenAt);
  const chosenLabel = Number.isFinite(chosenTs)
    ? new Date(chosenTs).toLocaleString(dateLocale(lang))
    : choice.chosenAt || '-';
  const levelKey = LEVEL_KEY[choice.level];
  const objectiveKey = OBJECTIVE_KEY[choice.objective];
  const sourceKey = SOURCE_KEY[choice.planSource];
  return (
    <div className="space-y-1 border-t border-border/50 pt-2">
      <Row label={t('admin.onb.stepLevel')}>{levelKey ? t(levelKey) : choice.level}</Row>
      <Row label={t('admin.onb.stepObjective')}>{objectiveKey ? t(objectiveKey) : choice.objective}</Row>
      <Row label={t('admin.onb.stepSchedule')}>
        <span>{choice.daysPerWeek} {t('ob.precision.daysWk')}</span>
        {choice.trainingDays.length > 0 && (
          <span className="text-muted-foreground"> · {weekdayShorts(choice.trainingDays, lang)}</span>
        )}
      </Row>
      <Row label={t('admin.onb.source')}>{sourceKey ? t(sourceKey) : choice.planSource}</Row>
      {choice.templateId && (
        <Row label={t('admin.onb.template')}>{templateName(choice.templateId, lang)}</Row>
      )}
      {choice.recommendedTemplateId && (
        <Row label={t('admin.onb.recommendedTemplate')}>{templateName(choice.recommendedTemplateId, lang)}</Row>
      )}
      <Row label={t('admin.cycles.entry')}>{t(ENTRY_KEY[choice.entry])}</Row>
      <p className="pt-1 text-xs text-muted-foreground">{t('admin.cycles.chosenAt', { date: chosenLabel })}</p>
    </div>
  );
};

const CycleRow = ({ cycle }: { cycle: PlanCycle }) => {
  const { t, lang } = useTranslation();
  const [expanded, setExpanded] = useState(false);
  const locale = dateLocale(lang);
  const choice = cycle.choice;
  const isActive = cycle.status === 'active';
  const planLabel = choice
    ? (choice.planName
      ?? (choice.templateId ? templateName(choice.templateId, lang) : undefined)
      ?? t('admin.cycles.customPlan'))
    : t('admin.cycles.unnamed');
  const startLabel = formatLocalDateLabel(cycle.startDate, locale, DATE_OPTIONS);
  const endLabel = cycle.endDate
    ? formatLocalDateLabel(cycle.endDate, locale, DATE_OPTIONS)
    : t('admin.cycles.ongoing');
  const weekdays = weekdayShorts(cycle.days.map((day) => day.weekday), lang);

  return (
    <div data-testid="admin-cycle-row" className="space-y-2 rounded-lg bg-muted/20 p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{planLabel}</p>
          <p className="text-xs text-muted-foreground">{startLabel} - {endLabel}</p>
        </div>
        <span
          className={cn(
            'shrink-0 rounded-full border px-2 py-0.5 text-[11px] font-medium',
            isActive
              ? 'border-fitness-success bg-fitness-success/10 text-fitness-success'
              : 'border-border bg-muted/40 text-muted-foreground',
          )}
        >
          {isActive ? t('cycles.active') : t('cycles.completed')}
        </span>
      </div>
      <p className="text-xs text-muted-foreground">
        {weekdays && <span>{weekdays}</span>}
        {weekdays && ' · '}
        <span>{t('admin.cycleWeeks', { weeks: cycle.durationWeeks })}</span>
        {' · '}
        <span>{t('admin.cycles.completion')}: {Math.round(cycle.stats.completionRate)}%</span>
        {' · '}
        <span>{t('cycles.workoutsLabel')}: {cycle.stats.totalWorkouts}</span>
      </p>
      <button
        type="button"
        aria-expanded={expanded}
        onClick={() => setExpanded((prev) => !prev)}
        className="flex items-center gap-1 text-xs font-medium text-primary"
      >
        <ChevronDown className={cn('h-3.5 w-3.5 transition-transform', expanded && 'rotate-180')} aria-hidden />
        {t('admin.cycles.answers')}
      </button>
      {expanded && (
        choice
          ? <ChoiceView choice={choice} />
          : <p className="text-xs text-muted-foreground">{t('admin.cycles.noChoice')}</p>
      )}
    </div>
  );
};

interface AdminCyclesCardProps {
  cycles: PlanCycle[];
}

export const AdminCyclesCard = ({ cycles }: AdminCyclesCardProps) => {
  const { t } = useTranslation();
  const sorted = useMemo(
    () => [...cycles].sort((a, b) =>
      b.startDate.localeCompare(a.startDate) || b.createdAt.localeCompare(a.createdAt)),
    [cycles],
  );
  if (sorted.length === 0) {
    return <p className="text-sm text-muted-foreground">{t('admin.cycles.empty')}</p>;
  }
  return (
    <div className="space-y-2">
      {sorted.map((cycle) => <CycleRow key={cycle.id} cycle={cycle} />)}
    </div>
  );
};
