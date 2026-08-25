import type { ReactNode } from 'react';
import { useTranslation } from '@/contexts/LanguageContext';
import { dateLocale, type LanguageCode, type TranslationKey } from '@/i18n';
import { getAccentById } from '@/lib/accent-theme';
import { localizePlanName, localizeWeekdayShort } from '@/lib/plan-i18n';
import { uniqueSortedWeekdays, WEEKDAYS } from '@/lib/plan-cycle-utils';
import { planTemplates } from '@/data/planTemplates';
import type { Weekday } from '@/data/trainingPlan';

// WP-A (X30): karta "Onboarding" w szczegole usera panelu admina — co user
// zaznaczal krok po kroku. Dane z props (host AdminUserDetail juz laduje caly
// dokument users/{uid}, zero dodatkowych odczytow). Ksztalt onboardingAnswers
// = kontrakt v2 pakietu P11 (zapis markOnboardingComplete); NIE zmieniac tutaj.
// Wzorzec karty 1:1 z AdminSubscriptionCard: eksport nazwany, bez wlasnego
// <Card> (host owija), 100% t(...) — guard admin-i18n-scan.

export interface AdminOnboardingAnswers {
  version: number;
  completedAt: string;
  name?: string;
  accentColor: string;
  level: string;
  objective: string;
  daysPerWeek: number;
  trainingDays: string[];
  planSource: string;
  templateId?: string;
  recommendedTemplateId?: string;
  durationWeeks: number;
  startDate: string;
  planName?: string;
}

/** Dane fallbacku dla kont sprzed zapisu onboardingAnswers (P11). */
export interface AdminOnboardingFallback {
  trainingProfile: { level?: string; objective?: string; daysPerWeek?: number } | null;
  accentColor: string | null;
  onboardingState: string | null;
  onboardingVersion: number | null;
}

const str = (value: unknown): string | undefined =>
  typeof value === 'string' && value ? value : undefined;

const num = (value: unknown): number | undefined =>
  typeof value === 'number' && Number.isFinite(value) ? value : undefined;

/** Defensywny parser pola users/{uid}.onboardingAnswers (dane z Firestore = niezaufane). */
export const mapOnboardingAnswers = (raw: unknown): AdminOnboardingAnswers | null => {
  if (typeof raw !== 'object' || raw === null) return null;
  const r = raw as Record<string, unknown>;
  const version = num(r.version);
  if (version === undefined) return null;
  return {
    version,
    completedAt: str(r.completedAt) ?? '',
    name: str(r.name),
    accentColor: str(r.accentColor) ?? '',
    level: str(r.level) ?? '',
    objective: str(r.objective) ?? '',
    daysPerWeek: num(r.daysPerWeek) ?? 0,
    trainingDays: Array.isArray(r.trainingDays)
      ? r.trainingDays.filter((d): d is string => typeof d === 'string')
      : [],
    planSource: str(r.planSource) ?? '',
    templateId: str(r.templateId),
    recommendedTemplateId: str(r.recommendedTemplateId),
    durationWeeks: num(r.durationWeeks) ?? 0,
    startDate: str(r.startDate) ?? '',
    planName: str(r.planName),
  };
};

const LEVEL_KEY: Record<string, TranslationKey> = {
  beginner: 'ob.level.beginner',
  intermediate: 'ob.level.intermediate',
  advanced: 'ob.level.advanced',
};

const OBJECTIVE_KEY: Record<string, TranslationKey> = {
  build_muscle: 'ob.obj.muscle',
  peak_strength: 'ob.obj.strength',
  fat_loss: 'ob.obj.fatloss',
  athletic: 'ob.obj.athletic',
};

const SOURCE_KEY: Record<string, TranslationKey> = {
  recommended: 'admin.onb.source.recommended',
  browsed: 'admin.onb.source.browsed',
  custom: 'admin.onb.source.custom',
};

const weekdayShorts = (days: string[], lang: LanguageCode): string => {
  const valid = days.filter((d): d is Weekday => WEEKDAYS.some((w) => w.value === d));
  return uniqueSortedWeekdays(valid)
    .map((d) => localizeWeekdayShort(WEEKDAYS.find((w) => w.value === d)?.short ?? d, lang))
    .join(' · ');
};

/** Nazwa szablonu w jezyku UI; nieznane id degraduje do samego id (etykieta nie rzuca). */
const templateName = (id: string, lang: LanguageCode): string =>
  localizePlanName(id, planTemplates.find((p) => p.id === id)?.name ?? id, lang);

const AccentValue = ({ accentId }: { accentId: string }) => {
  const { t } = useTranslation();
  const accent = getAccentById(accentId);
  return (
    <span className="inline-flex items-center gap-1.5">
      <span
        className="inline-block h-3 w-3 shrink-0 rounded-full border border-border"
        style={{ backgroundColor: accent.hex }}
        aria-hidden
      />
      <span>{t(`accent.${accent.id}` as TranslationKey)}</span>
    </span>
  );
};

const Row = ({ label, children }: { label: string; children: ReactNode }) => (
  <div className="flex items-baseline justify-between gap-3">
    <span className="shrink-0 text-xs text-muted-foreground">{label}</span>
    <span className="text-right text-sm font-medium">{children}</span>
  </div>
);

const Step = ({ n, titleKey, children }: { n: number; titleKey: TranslationKey; children: ReactNode }) => {
  const { t } = useTranslation();
  return (
    <div className="space-y-1.5 rounded-lg bg-muted/20 p-3">
      <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
        <span className="mr-1.5 text-primary">{n}.</span>
        <span>{t(titleKey)}</span>
      </p>
      {children}
    </div>
  );
};

const AnswersView = ({ answers }: { answers: AdminOnboardingAnswers }) => {
  const { t, lang } = useTranslation();
  const completedTs = Date.parse(answers.completedAt);
  const completedLabel = Number.isFinite(completedTs)
    ? new Date(completedTs).toLocaleString(dateLocale(lang))
    : answers.completedAt || '-';
  const levelKey = LEVEL_KEY[answers.level];
  const objectiveKey = OBJECTIVE_KEY[answers.objective];
  const sourceKey = SOURCE_KEY[answers.planSource];
  return (
    <div className="space-y-3">
      <Step n={1} titleKey="admin.onb.stepName">
        <p className="text-sm font-medium">{answers.name || '-'}</p>
        <p className="text-sm"><AccentValue accentId={answers.accentColor} /></p>
      </Step>
      <Step n={2} titleKey="admin.onb.stepLevel">
        <p className="text-sm font-medium">{levelKey ? t(levelKey) : answers.level || '-'}</p>
      </Step>
      <Step n={3} titleKey="admin.onb.stepObjective">
        <p className="text-sm font-medium">{objectiveKey ? t(objectiveKey) : answers.objective || '-'}</p>
      </Step>
      <Step n={4} titleKey="admin.onb.stepSchedule">
        <p className="text-sm font-medium">
          <span>{answers.daysPerWeek} {t('ob.precision.daysWk')}</span>
          {answers.trainingDays.length > 0 && (
            <span className="text-muted-foreground"> · {weekdayShorts(answers.trainingDays, lang)}</span>
          )}
        </p>
      </Step>
      <Step n={5} titleKey="admin.onb.stepPlan">
        <div className="space-y-1">
          <Row label={t('admin.onb.source')}>{sourceKey ? t(sourceKey) : answers.planSource || '-'}</Row>
          {answers.templateId && (
            <Row label={t('admin.onb.template')}>{templateName(answers.templateId, lang)}</Row>
          )}
          {answers.recommendedTemplateId && (
            <Row label={t('admin.onb.recommendedTemplate')}>{templateName(answers.recommendedTemplateId, lang)}</Row>
          )}
          <Row label={t('admin.onb.duration')}>{answers.durationWeeks} {t('ob.precision.weeks')}</Row>
          <Row label={t('ob.protocol.startDate')}>{answers.startDate || '-'}</Row>
          <Row label={t('ob.precision.planName')}>{answers.planName || '-'}</Row>
        </div>
      </Step>
      <p className="text-xs text-muted-foreground">{t('admin.onb.completedAt', { date: completedLabel })}</p>
    </div>
  );
};

const FallbackView = ({ fallback }: { fallback: AdminOnboardingFallback }) => {
  const { t } = useTranslation();
  const profile = fallback.trainingProfile;
  const levelKey = profile?.level ? LEVEL_KEY[profile.level] : undefined;
  const objectiveKey = profile?.objective ? OBJECTIVE_KEY[profile.objective] : undefined;
  const hasAnything = Boolean(profile || fallback.accentColor || fallback.onboardingState);
  if (!hasAnything) {
    return <p className="text-sm text-muted-foreground">{t('admin.onb.empty')}</p>;
  }
  return (
    <div className="space-y-3">
      <p className="rounded-lg bg-muted/20 p-3 text-xs text-muted-foreground">{t('admin.onb.noAnswers')}</p>
      <div className="space-y-1">
        {profile?.level && (
          <Row label={t('admin.onb.stepLevel')}>{levelKey ? t(levelKey) : profile.level}</Row>
        )}
        {profile?.objective && (
          <Row label={t('admin.onb.stepObjective')}>{objectiveKey ? t(objectiveKey) : profile.objective}</Row>
        )}
        {typeof profile?.daysPerWeek === 'number' && (
          <Row label={t('admin.onb.stepSchedule')}>{profile.daysPerWeek} {t('ob.precision.daysWk')}</Row>
        )}
        {fallback.accentColor && (
          <Row label={t('admin.onb.accent')}><AccentValue accentId={fallback.accentColor} /></Row>
        )}
        {fallback.onboardingState && (
          <Row label={t('admin.onb.state')}>
            {fallback.onboardingState}
            {fallback.onboardingVersion != null ? ` · v${fallback.onboardingVersion}` : ''}
          </Row>
        )}
      </div>
    </div>
  );
};

interface AdminOnboardingCardProps {
  answers: AdminOnboardingAnswers | null;
  fallback: AdminOnboardingFallback;
}

export const AdminOnboardingCard = ({ answers, fallback }: AdminOnboardingCardProps) => (
  answers ? <AnswersView answers={answers} /> : <FallbackView fallback={fallback} />
);
