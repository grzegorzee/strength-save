import { useEffect, useMemo, useState } from 'react';
import { Loader2, ArrowRight, ArrowLeft, ArrowUpRight, Dumbbell, Weight, Flame, Zap, Link2, Check, Pencil, ListChecks, SlidersHorizontal } from 'lucide-react';
import { useTranslation } from '@/contexts/LanguageContext';
import { useUnit } from '@/contexts/UnitContext';
import { dateLocale, type TranslationKey } from '@/i18n';
import { localizeFocus, localizeWeekdayShort, localizePlanName, localizePlanDescription } from '@/lib/plan-i18n';
import { PlanBuilder } from '@/components/PlanBuilder';
import { PlanDurationPicker } from '@/components/PlanDaysEditor';
import { planTemplates, type PlanTemplate, type PlanObjective } from '@/data/planTemplates';
import { scoreTemplates, selectTemplatesForDays } from '@/lib/plan-recommendation';
import { getPlanTemplateImageUrl } from '@/lib/exercise-media';
import type { TrainingDay, Weekday } from '@/data/trainingPlan';
import { cn, formatLocalDate, parseLocalDate } from '@/lib/utils';
import { getStartOfPlanWeek } from '@/lib/plan-schedule';
import { ConsentCheckboxes } from '@/components/ConsentCheckboxes';
import { ACCENTS, applyAccent, getAccentById, hasStoredAccent, readStoredAccentId, storeAccentId } from '@/lib/accent-theme';
import { deriveAccentFromAvatar } from '@/lib/avatar-accent';
import { EMPTY_CONSENT_SELECTION, hasRequiredConsents, type ConsentSelection } from '@/lib/consent-selection';
import { applyWeekdaysToPlanDays, getCycleStartPreview, hasExactWeekdaySelection, planDaysMismatch, WEEKDAYS } from '@/lib/plan-cycle-utils';

// 'elite' usunięte (Z72): mapowało się na advanced — iluzoryczny wybór. Legacy wartości
// zapisane w trainingProfile sanityzuje sanitizeWizardLevel.
export type WizardLevel = 'beginner' | 'intermediate' | 'advanced';

const sanitizeWizardLevel = (level?: string): WizardLevel | undefined => {
  if (level === 'elite') return 'advanced';
  return level === 'beginner' || level === 'intermediate' || level === 'advanced' ? level : undefined;
};

/** Wynik wizarda: gotowy plan + metadane profilu (dni z weekdayami już przypisanymi). */
export interface PlanWizardChoice {
  days: TrainingDay[];
  durationWeeks: number;
  startDate: string;        // surowa data (rodzic snapuje do poniedziałku)
  level: WizardLevel;
  objective: PlanObjective;
  daysPerWeek: number;
  templateId?: string;      // undefined = plan własny (PlanBuilder)
  name?: string;            // imię z kroku Welcome (tylko onboarding, askName)
  /** WP-PLANS-2 (X27): nazwa planu z kroku 5 (default = nazwa szablonu). */
  planName?: string;
  /** WP-O (X30): dni tygodnia wybrane w kroku 4 (jawna odpowiedź onboardingu). */
  trainingDays?: Weekday[];
  /** WP-O (X30): co rekomendował silnik w chwili zatwierdzenia. */
  recommendedTemplateId?: string;
  /** WP-O (X30): skąd wziął się plan — rekomendacja / Browse plans / własny. */
  planSource?: 'recommended' | 'browsed' | 'custom';
}

const DEFAULT_DAYS: Record<number, Weekday[]> = {
  2: ['monday', 'thursday'],
  3: ['monday', 'wednesday', 'friday'],
  4: ['monday', 'tuesday', 'thursday', 'friday'],
  5: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
  6: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'],
};

const LEVELS: { value: WizardLevel; labelKey: TranslationKey; descKey: TranslationKey; icon: typeof Dumbbell }[] = [
  { value: 'beginner', labelKey: 'ob.level.beginner', descKey: 'ob.level.beginner.desc', icon: ArrowUpRight },
  { value: 'intermediate', labelKey: 'ob.level.intermediate', descKey: 'ob.level.intermediate.desc', icon: Link2 },
  { value: 'advanced', labelKey: 'ob.level.advanced', descKey: 'ob.level.advanced.desc', icon: Weight },
];

const OBJECTIVES: { value: PlanObjective; labelKey: TranslationKey; descKey: TranslationKey; icon: typeof Dumbbell }[] = [
  { value: 'build_muscle', labelKey: 'ob.obj.muscle', descKey: 'ob.obj.muscle.desc', icon: Dumbbell },
  { value: 'peak_strength', labelKey: 'ob.obj.strength', descKey: 'ob.obj.strength.desc', icon: Weight },
  { value: 'fat_loss', labelKey: 'ob.obj.fatloss', descKey: 'ob.obj.fatloss.desc', icon: Flame },
  { value: 'athletic', labelKey: 'ob.obj.athletic', descKey: 'ob.obj.athletic.desc', icon: Zap },
];

// X31 H2: etykiety odpowiedzi z kroków 2-3 do podsumowania w kroku 5.
const LEVEL_LABEL_KEY: Record<WizardLevel, TranslationKey> = {
  beginner: 'ob.level.beginner', intermediate: 'ob.level.intermediate', advanced: 'ob.level.advanced',
};
const OBJECTIVE_LABEL_KEY: Record<PlanObjective, TranslationKey> = {
  build_muscle: 'ob.obj.muscle', peak_strength: 'ob.obj.strength', fat_loss: 'ob.obj.fatloss', athletic: 'ob.obj.athletic',
};

const OBJECTIVE_TAGS: Record<PlanObjective, TranslationKey[]> = {
  build_muscle: ['ob.tag.hypertrophy'],
  peak_strength: ['ob.tag.strength', 'ob.tag.power'],
  fat_loss: ['ob.tag.conditioning'],
  athletic: ['ob.tag.power', 'ob.tag.conditioning'],
};

const estimateMonthlyVolume = (tpl: { days: TrainingDay[] }): number => {
  let weeklySets = 0;
  tpl.days.forEach(d => d.exercises.forEach(e => {
    const m = e.sets.match(/^(\d+)/);
    weeklySets += m ? parseInt(m[1], 10) : 3;
  }));
  return Math.round((weeklySets * 10 * 35 * 4.3) / 500) * 500;
};

const StepHeader = ({ step, total, onBack }: { step: number; total: number; onBack?: () => void }) => {
  const { t } = useTranslation();
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        {onBack ? (
          <button onClick={onBack} aria-label={t('common.back')} className="text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="h-5 w-5" />
          </button>
        ) : <span />}
        <span className="font-heading font-bold uppercase tracking-widest text-xs text-primary">{t('ob.brand')}</span>
        <span />
      </div>
      <div className="flex items-center gap-2">
        <div className="flex-1 flex gap-1.5">
          {Array.from({ length: total }).map((_, i) => (
            <span key={i} className={cn('h-1 flex-1 rounded-full transition-colors', i < step ? 'bg-primary' : 'bg-surface-highest')} />
          ))}
        </div>
        <span className="text-[11px] font-medium tracking-widest text-muted-foreground tabular-nums">
          {String(step).padStart(2, '0')} / {String(total).padStart(2, '0')}
        </span>
      </div>
    </div>
  );
};

/** WP-F (X28): hero karty szablonu w Browse plans (pro-look dark-gym-v1).
 *  Obraz dekoracyjny: alt="" + lazy; brak/błąd pliku = karta jak dotąd. */
const TemplateHero = ({ templateId }: { templateId: string }) => {
  const [failed, setFailed] = useState(false);
  if (failed) return null;
  return (
    <img
      src={getPlanTemplateImageUrl(templateId)}
      alt=""
      aria-hidden="true"
      loading="lazy"
      className="h-20 w-full object-cover"
      onError={() => setFailed(true)}
    />
  );
};

const OptionCard = ({ icon: Icon, title, desc, selected, onClick }: { icon: typeof Dumbbell; title: string; desc: string; selected: boolean; onClick: () => void }) => (
  <button
    onClick={onClick}
    aria-pressed={selected}
    className={cn(
      'w-full text-left rounded-2xl p-4 transition-all flex items-start gap-3',
      selected ? 'bg-surface-high ring-2 ring-primary' : 'bg-surface-low hover:bg-surface-container',
    )}
  >
    <span className={cn('h-10 w-10 rounded-xl flex items-center justify-center shrink-0', selected ? 'bg-primary/15 text-primary' : 'bg-surface-highest text-primary')}>
      <Icon className="h-5 w-5" />
    </span>
    <span className="min-w-0 flex-1">
      <span className="block font-heading font-bold text-[17px] leading-tight">{title}</span>
      <span className="block text-[13px] text-muted-foreground mt-0.5 leading-snug">{desc}</span>
    </span>
    <span className={cn('mt-1 h-5 w-5 rounded-full shrink-0 flex items-center justify-center', selected ? 'bg-primary text-primary-foreground' : 'border-2 border-surface-highest')}>
      {selected && <Check className="h-3 w-3" />}
    </span>
  </button>
);

const PrimaryButton = ({ onClick, disabled, children }: { onClick: () => void; disabled?: boolean; children: React.ReactNode }) => (
  <button
    onClick={onClick}
    disabled={disabled}
    className="w-full rounded-2xl py-4 font-heading font-bold uppercase tracking-wide text-primary-foreground bg-gradient-to-br from-primary-light to-primary disabled:opacity-50 flex items-center justify-center gap-2 transition-opacity"
  >
    {children}
  </button>
);

interface PlanWizardProps {
  showWelcome?: boolean;
  socialProof?: boolean;
  /** Dyskretna zapowiedź trialu na ekranie Welcome (tylko onboarding na iOS — nie replan, nie web). */
  trialNotice?: boolean;
  /** Rozdzielone checkboxy zgód na Welcome (pakiet prawny v2); obowiązkowe blokują Dalej (tylko onboarding). */
  legalConsent?: boolean;
  /**
   * Zapis zgód przy przejściu z kroku 1 (wywoływane raz, przed setStep(2)).
   * Odrzucenie promisa zatrzymuje przejście — zgody muszą trafić do logu.
   */
  onLegalConsent?: (selection: ConsentSelection) => Promise<void>;
  /** Pole imienia na Welcome (tylko onboarding); wynik trafia do PlanWizardChoice.name. */
  askName?: boolean;
  initialName?: string;
  /**
   * X29 WP-H: avatar konta (photoURL) do auto-doboru akcentu na Welcome.
   * Preselekcja odpala się TYLKO bez zapisanego wyboru (hasStoredAccent).
   */
  avatarPhotoURL?: string;
  initial?: { level?: WizardLevel; objective?: PlanObjective; daysPerWeek?: number };
  /** Poprzedni wybór (powrót z preview) — przywraca selekcje, datę startu i własny plan zamiast zaczynać od zera. */
  resume?: PlanWizardChoice | null;
  /** Krok startowy przy powrocie z podglądu (Z232) — bez tego remount wizarda cofa na krok 1. */
  resumeStep?: number;
  /** Klucz localStorage dla szkicu PlanBuildera (tryb "własny plan"). */
  builderDraftKey?: string;
  confirmLabelKey: TranslationKey;
  onConfirm: (choice: PlanWizardChoice) => void;
  isSaving?: boolean;
  error?: string | null;
  onExitBack?: () => void;
}

export const PlanWizard = ({ showWelcome, socialProof, trialNotice, legalConsent, onLegalConsent, askName, initialName, avatarPhotoURL, initial, resume, resumeStep, builderDraftKey, confirmLabelKey, onConfirm, isSaving, error, onExitBack }: PlanWizardProps) => {
  const { t, lang } = useTranslation();
  const { unit, toDisplay } = useUnit();

  const initialDays = resume?.daysPerWeek ?? initial?.daysPerWeek ?? 4;
  const resumedCustomPlan = resume && !resume.templateId ? resume : null;
  // X32: bez Welcome kreator ZAWSZE startuje od kroku 2 (poziom) z wartosciami
  // z `initial` wstepnie zaznaczonymi; replan nie skacze juz na krok 5
  // (startAtPrecision usuniete), user potwierdza poziom/cel/dni klikajac Dalej.
  const [step, setStep] = useState(resumeStep ?? (showWelcome ? 1 : 2));
  const [level, setLevel] = useState<WizardLevel>(sanitizeWizardLevel(resume?.level ?? initial?.level) ?? 'beginner');
  const [objective, setObjective] = useState<PlanObjective>(resume?.objective ?? initial?.objective ?? 'build_muscle');
  const [daysPerWeek, setDaysPerWeek] = useState(initialDays);
  const [trainingDays, setTrainingDays] = useState<Weekday[]>(() => {
    const fromResume = resume?.days.map((d) => d.weekday).filter(Boolean);
    return fromResume && fromResume.length ? fromResume : (DEFAULT_DAYS[initialDays] ?? DEFAULT_DAYS[4]);
  });
  const [startDate, setStartDate] = useState(() => resume?.startDate ?? formatLocalDate(new Date()));
  const [mode, setMode] = useState<'recommend' | 'browse' | 'own'>(resumedCustomPlan ? 'own' : 'recommend');
  const [picked, setPicked] = useState<PlanTemplate | null>(() =>
    resume?.templateId ? planTemplates.find((p) => p.id === resume.templateId) ?? null : null);
  // WP-O (X30): rekomendacja vs wybór z Browse plans (do planSource w snapshocie
  // odpowiedzi). Resume zachowuje oryginał; stary szkic bez planSource, ale
  // z templateId = traktuj jak wybór z przeglądarki (nie da się odtworzyć).
  const [pickedViaBrowse, setPickedViaBrowse] = useState(() =>
    resume?.planSource ? resume.planSource === 'browsed' : Boolean(resume?.templateId));
  const [userName, setUserName] = useState(resume?.name ?? initialName ?? '');
  // Plan I: wybór koloru aplikacji na Welcome (tylko askName = onboarding).
  // getAccentById normalizuje stare aliasy; live preview = applyAccent od razu.
  const [accentId, setAccentId] = useState(() => getAccentById(readStoredAccentId()).id);
  const pickAccent = (id: string) => {
    applyAccent(id);
    storeAccentId(id);
    setAccentId(id);
  };
  // X29 WP-H: preselekcja akcentu z avatara na Welcome — user od razu widzi
  // "swój" kolor zaznaczony i może zmienić. Odpala się TYLKO bez zapisanego
  // wyboru (zasada 5); każdy problem = cichy fail, zostaje limonka.
  useEffect(() => {
    if (!askName || !avatarPhotoURL || hasStoredAccent()) return;
    let cancelled = false;
    deriveAccentFromAvatar(avatarPhotoURL)
      .then((derived) => {
        // Re-check: user mógł kliknąć swatch, zanim avatar się pobrał.
        if (!derived || cancelled || hasStoredAccent()) return;
        applyAccent(derived);
        storeAccentId(derived);
        setAccentId(derived);
      })
      .catch(() => {
        // Cichy fail — zostaje limonka.
      });
    return () => { cancelled = true; };
  }, [askName, avatarPhotoURL]);
  // Powrót z podglądu (resume) = zgody były już zaznaczone (i zapisane) przy pierwszym przejściu kroku 1.
  const [consents, setConsents] = useState<ConsentSelection>(
    resume ? { terms: true, privacy: true, health: true, marketing: false } : EMPTY_CONSENT_SELECTION,
  );
  const [consentsRecorded, setConsentsRecorded] = useState(Boolean(resume));
  const [consentSaving, setConsentSaving] = useState(false);
  const [consentError, setConsentError] = useState(false);

  const advanceFromWelcome = async () => {
    if (legalConsent && onLegalConsent && !consentsRecorded) {
      setConsentSaving(true);
      setConsentError(false);
      try {
        await onLegalConsent(consents);
        setConsentsRecorded(true);
      } catch {
        setConsentError(true);
        return;
      } finally {
        setConsentSaving(false);
      }
    }
    setStep(2);
  };

  // X32: krok 5 i Browse plans widzą WYŁĄCZNIE szablony o liczbie dni z kroku 4
  // (zgłoszenie właściciela: "wybrałem 3 dni, a dostałem 4 dni w tygodniu").
  // Pusta pula = szablony o +-1 dnia z jawną etykietą (exactDays=false).
  const dayPool = useMemo(() => selectTemplatesForDays(daysPerWeek, planTemplates), [daysPerWeek]);
  // WP-O (X30): jeden scoring dla rekomendacji (element [0]) i sortowania Browse
  // plans (ta sama lista, malejąco po dopasowaniu do odpowiedzi usera).
  const scoredTemplates = useMemo(() => scoreTemplates({ objective, level, daysPerWeek }, dayPool.templates), [objective, level, daysPerWeek, dayPool]);
  const recommended = scoredTemplates[0].template;
  const chosen = picked ?? recommended;
  // WP-PLANS-1 (X27, Task P5): kontrola długości w kroku potwierdzenia szablonu;
  // null = default z szablonu (zmiana szablonu resetuje wybór).
  const [templateWeeks, setTemplateWeeks] = useState<number | null>(null);
  const effectiveWeeks = templateWeeks ?? chosen.durationWeeks;
  const weekdaySelectionValid = hasExactWeekdaySelection(trainingDays, daysPerWeek);

  // WP-PLANS-2 (X27, Task O3): nazwa planu edytowalna w kroku 5; null = default
  // z aktualnego szablonu/rekomendacji (zmiana szablonu wraca do defaultu).
  const [planNameInput, setPlanNameInput] = useState<string | null>(resume?.planName ?? null);
  const defaultPlanName = localizePlanName(chosen.id, chosen.name, lang);
  // Start planu = wybór z 8 najbliższych poniedziałków (Edge 3); selekcja liczona
  // z poniedziałku tygodnia startDate, więc resume ze starą (surową) datą działa.
  const startMondays = useMemo(() => Array.from({ length: 8 }, (_, weekAhead) => {
    const monday = getStartOfPlanWeek(new Date());
    monday.setDate(monday.getDate() + weekAhead * 7);
    return formatLocalDate(monday);
  }), []);
  const selectedMonday = getCycleStartPreview(startDate).cycleStartDate;

  const setDays = (n: number) => { setDaysPerWeek(n); setTrainingDays(DEFAULT_DAYS[n] ?? DEFAULT_DAYS[4]); };
  const toggleDay = (d: Weekday) => setTrainingDays(prev => prev.includes(d) ? prev.filter(x => x !== d) : [...prev, d]);

  const fire = (days: TrainingDay[], durationWeeks: number, templateId?: string, planName?: string) =>
    onConfirm({
      days, durationWeeks, startDate, level, objective, daysPerWeek: days.length, templateId,
      name: userName.trim() || undefined, planName,
      // WP-O (X30): jawne odpowiedzi do snapshotu onboardingAnswers.
      trainingDays,
      recommendedTemplateId: recommended.id,
      planSource: templateId === undefined ? 'custom' : pickedViaBrowse ? 'browsed' : 'recommended',
    });

  // Edge 4: pusta nazwa spada do nazwy szablonu (fallback, nie pusty string).
  const confirmTemplate = () => fire(
    applyWeekdaysToPlanDays(chosen.days, trainingDays),
    effectiveWeeks,
    chosen.id,
    planNameInput?.trim() || defaultPlanName,
  );

  // ── Tryb: ułóż własny plan ──
  if (mode === 'own') {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-lg mx-auto">
          <PlanBuilder
            initialDays={resumedCustomPlan?.days}
            initialDurationWeeks={resumedCustomPlan?.durationWeeks ?? 12}
            draftStorageKey={builderDraftKey}
            onSubmit={(days, weeks) => fire(days, weeks, undefined)}
            onCancel={() => setMode('recommend')}
          />
          {error && <p className="text-sm text-destructive text-center mt-3">{error}</p>}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="flex-1 max-w-lg w-full mx-auto px-6 pt-10 pb-6 flex flex-col">
        {step === 1 && (
          <>
            <StepHeader step={1} total={5} onBack={onExitBack} />
            <div className="flex-1 flex flex-col justify-center py-6">
              <h1 className="font-heading font-bold text-5xl leading-[1.05] tracking-tight">
                {t('ob.welcome.title1')}<br />
                <span className="text-primary">{t('ob.welcome.title2')}</span>
              </h1>
              <p className="text-muted-foreground mt-5 leading-relaxed">{t('ob.welcome.desc')}</p>
              {trialNotice && (
                <p className="mt-4 text-[13px] text-primary">{t('ob.welcome.trialNotice')}</p>
              )}
              {askName && (
                <div className="mt-7">
                  <label htmlFor="ob-name" className="block text-xs font-medium uppercase tracking-widest text-muted-foreground mb-2">{t('ob.welcome.nameQ')}</label>
                  <input
                    id="ob-name"
                    data-testid="ob-name-input"
                    type="text"
                    value={userName}
                    maxLength={60}
                    onChange={e => setUserName(e.target.value)}
                    placeholder={t('ob.welcome.namePlaceholder')}
                    className="w-full rounded-2xl bg-surface-low px-4 py-3.5 text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-primary"
                  />
                  {/* Plan I: kolor aplikacji przy pytaniu o imię — tylko paleta
                      (custom hex zostaje w Profilu), klik = live preview. */}
                  <p className="mt-5 mb-2 block text-xs font-medium uppercase tracking-widest text-muted-foreground">{t('ob.welcome.colorQ')}</p>
                  <div className="flex flex-wrap gap-2" role="radiogroup" aria-label={t('ob.welcome.colorQ')} data-testid="ob-accent-swatches">
                    {ACCENTS.map((a) => (
                      <button
                        key={a.id}
                        type="button"
                        role="radio"
                        aria-checked={accentId === a.id}
                        aria-label={t(`accent.${a.id}` as Parameters<typeof t>[0])}
                        data-testid={`ob-accent-${a.id}`}
                        onClick={() => pickAccent(a.id)}
                        className={`h-8 w-8 rounded-full transition-transform active:scale-95 ${accentId === a.id ? 'ring-2 ring-white ring-offset-2 ring-offset-background' : ''}`}
                        style={{ backgroundColor: a.hex }}
                      />
                    ))}
                  </div>
                </div>
              )}
              {legalConsent && (
                <div className="mt-5">
                  <p className="text-[13px] text-muted-foreground mb-2">{t('ob.welcome.legalIntro')}</p>
                  {/* Krok 9 (spec 2026-08-11): marketing zszedł z Welcome na dedykowany
                      krok onboardingu — tu zostają 3 obowiązkowe oświadczenia. */}
                  <ConsentCheckboxes value={consents} onChange={setConsents} showMarketing={false} />
                  {consentError && (
                    <p className="mt-2 text-[13px] text-destructive" data-testid="consent-error">{t('consent.saveError')}</p>
                  )}
                </div>
              )}
            </div>
            <PrimaryButton
              onClick={advanceFromWelcome}
              disabled={(legalConsent && !hasRequiredConsents(consents)) || consentSaving}
            >
              {consentSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <>{t('ob.next')} <ArrowRight className="h-4 w-4" /></>}
            </PrimaryButton>
            {socialProof && <p className="text-center text-[11px] font-medium tracking-widest uppercase text-muted-foreground mt-4">{t('ob.social')}</p>}
          </>
        )}

        {step === 2 && (
          <>
            <StepHeader step={2} total={5} onBack={() => (showWelcome ? setStep(1) : onExitBack?.())} />
            <div className="mt-7 mb-5">
              <h1 className="font-heading font-bold text-4xl leading-tight tracking-tight">
                {t('ob.baseline.title1')} <span className="text-primary italic">{t('ob.baseline.title2')}</span>
              </h1>
              <p className="text-muted-foreground mt-2">{t('ob.baseline.desc')}</p>
            </div>
            <div className="flex-1 space-y-3">
              {LEVELS.map(l => (
                <OptionCard key={l.value} icon={l.icon} title={t(l.labelKey)} desc={t(l.descKey)} selected={level === l.value} onClick={() => setLevel(l.value)} />
              ))}
            </div>
            <div className="pt-5"><PrimaryButton onClick={() => setStep(3)}>{t('ob.nextStep')} <ArrowRight className="h-4 w-4" /></PrimaryButton></div>
          </>
        )}

        {step === 3 && (
          <>
            <StepHeader step={3} total={5} onBack={() => setStep(2)} />
            <div className="mt-7 mb-5">
              <h1 className="font-heading font-bold text-4xl leading-tight tracking-tight">
                {t('ob.obj.title1')} <span className="text-primary">{t('ob.obj.title2')}</span>
              </h1>
              <p className="text-muted-foreground mt-2">{t('ob.obj.desc')}</p>
            </div>
            <div className="flex-1 space-y-3">
              {OBJECTIVES.map(o => (
                <OptionCard key={o.value} icon={o.icon} title={t(o.labelKey)} desc={t(o.descKey)} selected={objective === o.value} onClick={() => setObjective(o.value)} />
              ))}
            </div>
            <div className="pt-5"><PrimaryButton onClick={() => setStep(4)}>{t('ob.continue')} <ArrowRight className="h-4 w-4" /></PrimaryButton></div>
          </>
        )}

        {step === 4 && (
          <>
            <StepHeader step={4} total={5} onBack={() => setStep(3)} />
            <div className="mt-7 mb-5">
              <h1 className="font-heading font-bold text-4xl leading-tight tracking-tight italic">
                {t('ob.protocol.title1')} <span className="text-primary">{t('ob.protocol.title2')}</span>
              </h1>
              <p className="text-muted-foreground mt-2">{t('ob.protocol.desc')}</p>
            </div>
            <div className="flex-1 space-y-4">
              <div className="rounded-2xl bg-surface-low p-4">
                <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground mb-3">{t('ob.protocol.daysQ')}</p>
                {/* Z233: te same kółka co wybór dni tygodnia niżej — jedna geometria kontrolek. */}
                <div className="flex justify-between gap-1.5">
                  {[2, 3, 4, 5, 6].map(n => (
                    <button key={n} onClick={() => setDays(n)} className={cn('h-11 w-11 rounded-full font-heading font-bold transition-colors', daysPerWeek === n ? 'bg-primary text-primary-foreground' : 'bg-surface-highest text-foreground')}>{n}</button>
                  ))}
                </div>
                {/* T1 (feedback 2026-08-20): user bał się, że wybór dni jest wiążący. */}
                <p className="text-[11px] text-muted-foreground mt-3">{t('ob.protocol.flexNote')}</p>
              </div>
              <div className="rounded-2xl bg-surface-low p-4">
                <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground mb-3">{t('ob.protocol.daysSelect')}</p>
                <div className="flex justify-between gap-1.5">
                  {WEEKDAYS.map(w => {
                    const on = trainingDays.includes(w.value);
                    return (
                      <button key={w.value} onClick={() => toggleDay(w.value)} className={cn('h-10 w-10 rounded-full font-bold text-sm transition-colors', on ? 'bg-primary text-background' : 'bg-surface-highest text-muted-foreground')}>
                        {localizeWeekdayShort(w.short, lang).slice(0, 1)}
                      </button>
                    );
                  })}
                </div>
                <p className="text-[11px] text-muted-foreground mt-2">{t('ob.protocol.daysHint', { picked: trainingDays.length, target: daysPerWeek })}</p>
              </div>
            </div>
            {/* WP-PLANS-2 (X27, Edge 7): data startu przeniesiona do kroku 5 —
                krok protokołu zostaje z dniami treningowymi. */}
            <div className="pt-5"><PrimaryButton disabled={!weekdaySelectionValid} onClick={() => { setPicked(null); setPickedViaBrowse(false); setTemplateWeeks(null); setPlanNameInput(null); setStep(5); }}>{t('ob.continue')} <ArrowRight className="h-4 w-4" /></PrimaryButton></div>
          </>
        )}

        {step === 5 && mode === 'recommend' && (
          <>
            <StepHeader step={5} total={5} onBack={() => setStep(4)} />
            {/* Z234: kompaktowy układ — CTA "Podgląd planu" ma się mieścić bez scrolla na iPhone. */}
            <div className="mt-5 mb-4">
              <p className="text-xs font-medium uppercase tracking-widest text-primary mb-1.5">{t('ob.precision.kicker')}</p>
              <h1 className="font-heading font-bold text-3xl leading-tight tracking-tight">{t('ob.precision.title')}</h1>
              <p className="text-muted-foreground text-[14px] mt-1.5">{picked ? t('ob.precision.chosen') : t('ob.precision.recommended', { name: localizePlanName(chosen.id, chosen.name, lang) })}</p>
              {/* X31 H2: podsumowanie odpowiedzi z kroków 2-4 — user widzi, że
                  liczba dni, cel i poziom zostały uwzględnione w rekomendacji. */}
              <p data-testid="ob-precision-answers" className="text-[12px] text-muted-foreground mt-1">
                {t('ob.precision.answers', { days: daysPerWeek, objective: t(OBJECTIVE_LABEL_KEY[objective]), level: t(LEVEL_LABEL_KEY[level]) })}
              </p>
              <button onClick={() => setStep(2)} className="mt-2 inline-flex items-center gap-1.5 text-[13px] text-primary font-medium">
                <SlidersHorizontal className="h-3.5 w-3.5" />{t('ob.precision.change')}
              </button>
            </div>
            <div className="flex-1 space-y-2.5">
              <div className="rounded-2xl bg-surface-low p-4">
                {/* WP-PLANS-2 (X27, Task O3): nazwa planu edytowalna (default z szablonu). */}
                <label htmlFor="ob-plan-name" className="block text-[11px] font-medium uppercase tracking-widest text-muted-foreground">{t('ob.precision.planName')}</label>
                <div className="flex items-center justify-between gap-2 mt-0.5">
                  <input
                    id="ob-plan-name"
                    data-testid="ob-plan-name"
                    type="text"
                    maxLength={60}
                    value={planNameInput ?? defaultPlanName}
                    onChange={e => setPlanNameInput(e.target.value)}
                    className="min-w-0 flex-1 bg-transparent font-heading font-bold text-xl text-primary leading-tight outline-none border-b border-transparent focus:border-primary/40"
                  />
                  <div className="flex flex-wrap gap-1.5 justify-end">
                    {OBJECTIVE_TAGS[chosen.objective].map(tag => (
                      <span key={tag} className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide bg-surface-highest text-muted-foreground">{t(tag)}</span>
                    ))}
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div className="rounded-2xl bg-surface-low p-3">
                  <p className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground">{t('ob.precision.duration')}</p>
                  <p className="font-heading font-bold text-lg mt-0.5"><span className="text-primary">{effectiveWeeks}</span> <span className="text-[11px] text-muted-foreground font-sans font-medium">{t('ob.precision.weeks')}</span></p>
                </div>
                <div className="rounded-2xl bg-surface-low p-3">
                  <p className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground">{t('ob.precision.frequency')}</p>
                  <p className="font-heading font-bold text-lg mt-0.5"><span className="text-primary">{chosen.daysPerWeek}</span> <span className="text-[11px] text-muted-foreground font-sans font-medium">{t('ob.precision.daysWk')}</span></p>
                </div>
                <div className="rounded-2xl bg-surface-low p-3">
                  <p className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground">{t('ob.precision.volume')}</p>
                  <p className="font-heading font-bold text-lg mt-0.5">{Math.round(toDisplay(estimateMonthlyVolume(chosen))).toLocaleString(dateLocale(lang))} <span className="text-[11px] text-muted-foreground font-sans font-medium">{t('ob.precision.kgMonth', { unit })}</span></p>
                </div>
              </div>
              <div className="rounded-2xl bg-surface-low p-3 space-y-1">
                {chosen.days.map((d, i) => (
                  <div key={d.id} className="text-[12px] flex gap-2">
                    <span className="text-primary font-bold tabular-nums">{String(i + 1).padStart(2, '0')}</span>
                    <span className="text-muted-foreground">{localizeFocus(d.focus, lang)} · {d.exercises.length} {t('ob.precision.exercises')}</span>
                  </div>
                ))}
              </div>
              {/* WP-PLANS-1 (X27, Task P5): długość planu nadpisywalna także dla
                  szablonów (default z szablonu, zakres 2-36 + własna liczba). */}
              <div className="rounded-2xl bg-surface-low p-3" data-testid="template-duration-picker">
                <p className="mb-2 text-[10px] font-medium uppercase tracking-widest text-muted-foreground">{t('planbuilder.planDuration')}</p>
                <PlanDurationPicker value={effectiveWeeks} onChange={setTemplateWeeks} />
              </div>
              {/* WP-PLANS-2 (X27, Task O3): start planu = wybór z 8 najbliższych
                  poniedziałków (przeniesione z kroku 4; default bieżący tydzień). */}
              <div className="rounded-2xl bg-surface-low p-3">
                <p className="mb-2 text-[10px] font-medium uppercase tracking-widest text-muted-foreground">{t('ob.startWeek')}</p>
                <div className="flex gap-2 overflow-x-auto pb-1" data-testid="ob-start-week-chips">
                  {startMondays.map((iso) => {
                    const monday = parseLocalDate(iso);
                    const on = iso === selectedMonday;
                    return (
                      <button
                        key={iso}
                        type="button"
                        aria-pressed={on}
                        onClick={() => setStartDate(iso)}
                        className={cn('shrink-0 w-16 rounded-full py-2 flex flex-col items-center transition-colors', on ? 'bg-primary text-primary-foreground' : 'bg-surface-highest')}
                      >
                        <span className="text-[10px] font-medium uppercase">{monday.toLocaleDateString(dateLocale(lang), { weekday: 'short' })}</span>
                        <span className="font-heading font-bold text-lg leading-none mt-0.5">{monday.getDate()}</span>
                        <span className="text-[9px] uppercase opacity-70 mt-0.5">{monday.toLocaleDateString(dateLocale(lang), { month: 'short' })}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
              {(() => {
                // Z72: user widzi prawdę zamiast cichej degradacji (slice w applyWeekdaysToPlanDays).
                const mismatch = planDaysMismatch(chosen, daysPerWeek);
                return mismatch ? (
                  <p className="rounded-2xl border border-fitness-warning/30 bg-fitness-warning/10 p-3 text-[13px] text-fitness-warning">
                    {t('wizard.daysMismatch', { n: mismatch.planDays, m: mismatch.selectedDays })}
                  </p>
                ) : null;
              })()}
              <div className="flex gap-2">
                <button onClick={() => setMode('browse')} className="flex-1 rounded-2xl py-2.5 bg-surface-high text-sm font-medium flex items-center justify-center gap-2"><ListChecks className="h-4 w-4 text-primary" />{t('ob.precision.browse')}<span className="text-muted-foreground tabular-nums">({scoredTemplates.length})</span></button>
                <button onClick={() => setMode('own')} className="flex-1 rounded-2xl py-2.5 bg-surface-high text-sm font-medium flex items-center justify-center gap-2"><Pencil className="h-4 w-4 text-primary" />{t('ob.precision.own')}</button>
              </div>
            </div>
            <div className="pt-4">
              <PrimaryButton onClick={confirmTemplate} disabled={isSaving}>
                {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                {t(confirmLabelKey)}
              </PrimaryButton>
              {error && <p className="text-sm text-destructive text-center mt-3">{error}</p>}
            </div>
          </>
        )}

        {step === 5 && mode === 'browse' && (
          <>
            <StepHeader step={5} total={5} onBack={() => setMode('recommend')} />
            <div className="mt-7 mb-4">
              {/* X32: nagłówek z liczbą dni z kroku 4 + licznik puli; pula zastępcza
                  (+-1 dnia) jest jawnie oznaczona zamiast cichej podmiany. */}
              <h1 className="font-heading font-bold text-3xl tracking-tight uppercase">
                {dayPool.exactDays
                  ? t('ob.browse.titleDays', { days: daysPerWeek, count: scoredTemplates.length })
                  : t('ob.browse.nearestTitle', { count: scoredTemplates.length })}
              </h1>
              {!dayPool.exactDays && (
                <p data-testid="browse-nearest-note" className="mt-1 text-[13px] text-fitness-warning">{t('ob.browse.nearestNote', { days: daysPerWeek })}</p>
              )}
              <p className="text-muted-foreground mt-1">{t('ob.browse.desc')}</p>
            </div>
            <div className="flex-1 space-y-3 overflow-y-auto">
              {/* WP-O (X30): lista posortowana wg dopasowania (scoreTemplates);
                  najlepszy dostaje badge "Polecany". X32: ta sama liczba dni =
                  dni tygodnia z kroku 4 zostają (setDays resetuje do domyślnych
                  tylko przy realnej zmianie liczby dni, pula zastępcza). */}
              {scoredTemplates.map(({ template: tpl }, idx) => (
                <button key={tpl.id} onClick={() => { setPicked(tpl); setPickedViaBrowse(true); if (tpl.daysPerWeek !== daysPerWeek) setDays(tpl.daysPerWeek); setTemplateWeeks(null); setPlanNameInput(null); setMode('recommend'); }} className="w-full text-left rounded-2xl bg-surface-low hover:bg-surface-container overflow-hidden transition-colors">
                  {/* WP-F (X28): hero na górze karty (rounded-t przez overflow-hidden rodzica) */}
                  <TemplateHero templateId={tpl.id} />
                  <div className="p-4">
                    <div className="flex items-center justify-between gap-2">
                      <span className="flex min-w-0 items-center gap-2">
                        <h3 className="truncate font-heading font-bold text-lg text-primary">{localizePlanName(tpl.id, tpl.name, lang)}</h3>
                        {idx === 0 && (
                          <span data-testid="browse-recommended-badge" className="shrink-0 rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-primary">
                            {t('ob.browse.recommendedBadge')}
                          </span>
                        )}
                      </span>
                      <span className="shrink-0 text-[11px] text-muted-foreground tabular-nums">{tpl.daysPerWeek}× · {tpl.durationWeeks}{t('ob.browse.wk')}</span>
                    </div>
                    <p className="text-[13px] text-muted-foreground mt-1 leading-snug">{localizePlanDescription(tpl.id, tpl.description, lang)}</p>
                  </div>
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
};
