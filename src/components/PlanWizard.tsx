import { useEffect, useMemo, useRef, useState } from 'react';
import { Loader2, ArrowRight, ArrowLeft, ArrowUpRight, Dumbbell, Weight, Flame, Zap, Link2, Check, Pencil, ListChecks, User } from 'lucide-react';
import { useTranslation } from '@/contexts/LanguageContext';
import type { TranslationKey } from '@/i18n';
import { localizeDayName, localizeWeekdayShort, localizePlanName, localizePlanDescription } from '@/lib/plan-i18n';
import { PlanBuilder } from '@/components/PlanBuilder';
import { PlanChoiceCard, PlanTemplateHero, type PlanChoiceBadge } from '@/components/PlanChoiceCard';
import { PlanStartStep } from '@/components/PlanStartStep';
import { toggleButtonClasses } from '@/components/ui/chip-button';
import { planTemplates, type PlanTemplate, type PlanObjective } from '@/data/planTemplates';
import { scoreTemplates, selectTemplatesForDays } from '@/lib/plan-recommendation';
import type { TrainingDay, Weekday } from '@/data/trainingPlan';
import { cn, formatLocalDate } from '@/lib/utils';
import { buildFirstWorkoutSchedule, listFirstWorkoutOptions } from '@/lib/first-workout-schedule';
import { ConsentCheckboxes } from '@/components/ConsentCheckboxes';
import { EMPTY_CONSENT_SELECTION, hasRequiredConsents, type ConsentSelection } from '@/lib/consent-selection';
import { applyWeekdaysToPlanDays, hasExactWeekdaySelection, planDaysMismatch, uniqueSortedWeekdays, WEEKDAYS } from '@/lib/plan-cycle-utils';
import type { OnboardingDraftInput, OnboardingDraftV1 } from '@/lib/onboarding-draft';
import { ANDROID_BACK_EVENT } from '@/components/AndroidBackHandler';

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
  /** Poniedziałek tygodnia pierwszego treningu (X34b); rodzic i tak snapuje do poniedziałku. */
  startDate: string;
  /** X34b: konkretny dzień pierwszego treningu wybrany na 6/6 (ISO); brak = stary szkic. */
  firstWorkoutDate?: string;
  /** X34b: dni treningowe tygodnia startu przed pierwszym treningiem (do training_plans.skippedDates). */
  skippedDates?: string[];
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

// X33 WP-2: chipy celu w bibliotece (filtr objective w obrębie puli dni).
const BROWSE_CHIPS: { value: PlanObjective | 'all'; labelKey: TranslationKey }[] = [
  { value: 'all', labelKey: 'ob.browse.chipAll' },
  { value: 'build_muscle', labelKey: 'ob.browse.chipMuscle' },
  { value: 'peak_strength', labelKey: 'ob.browse.chipStrength' },
  { value: 'fat_loss', labelKey: 'ob.browse.chipFatLoss' },
  { value: 'athletic', labelKey: 'ob.browse.chipAthletic' },
];

const StepHeader = ({ step, total, onBack, backDisabled = false }: { step: number; total: number; onBack?: () => void; backDisabled?: boolean }) => {
  const { t } = useTranslation();
  return (
    <div className="shrink-0 space-y-5">
      <div className="flex items-center justify-between">
        {onBack ? (
          <button
            type="button"
            onClick={onBack}
            disabled={backDisabled}
            aria-label={t('common.back')}
            className="-ml-3 inline-flex min-h-12 min-w-12 touch-manipulation items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-surface-low hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:pointer-events-none disabled:opacity-50"
          >
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
        <span
          role="status"
          aria-live="polite"
          aria-atomic="true"
          className="text-[11px] font-medium tracking-widest text-muted-foreground tabular-nums"
        >
          {String(step).padStart(2, '0')} / {String(total).padStart(2, '0')}
        </span>
      </div>
    </div>
  );
};

const OptionCard = ({ icon: Icon, title, desc, selected, onClick }: { icon: typeof Dumbbell; title: string; desc: string; selected: boolean; onClick: () => void }) => (
  <button
    onClick={onClick}
    aria-pressed={selected}
    className={cn(
      'w-full text-left rounded-2xl p-4 transition-all flex items-start gap-3',
      toggleButtonClasses(selected),
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

const PrimaryButton = ({ onClick, disabled, testId, ariaLabel, busy, children }: { onClick: () => void; disabled?: boolean; testId?: string; ariaLabel?: string; busy?: boolean; children: React.ReactNode }) => (
  <button
    onClick={onClick}
    disabled={disabled}
    data-testid={testId}
    aria-label={ariaLabel}
    aria-busy={busy || undefined}
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
  /** Opcjonalna zgoda marketingowa w tym samym widoku; brak zaznaczenia nigdy nie blokuje przejścia. */
  showMarketingConsent?: boolean;
  /**
   * Zapis zgód przy przejściu z kroku 1 (wywoływane raz, przed setStep(2)).
   * Odrzucenie promisa zatrzymuje przejście — zgody muszą trafić do logu.
   */
  onLegalConsent?: (selection: ConsentSelection) => Promise<void>;
  /** Pole imienia na Welcome (tylko onboarding); wynik trafia do PlanWizardChoice.name. */
  askName?: boolean;
  initialName?: string;
  /**
   * Avatar konta do lokalnego dopasowania kandydatów koloru na Welcome.
   * Pierwszy kandydat jest wybierany tylko bez wcześniejszego wyboru usera.
   */
  avatarPhotoURL?: string;
  /** X33 WP-8: e-mail konta — litera w kółku avatara, gdy nie ma ani zdjęcia, ani imienia. */
  accountEmail?: string;
  initial?: { level?: WizardLevel; objective?: PlanObjective; daysPerWeek?: number };
  /** Zweryfikowany, nieprzeterminowany szkic UX. Nie jest dowodem zgód. */
  initialDraft?: OnboardingDraftV1 | null;
  /** Prawda wyłącznie z aktualnego serwerowego mirrora zgód. */
  legalConsentAlreadyRecorded?: boolean;
  /** Best-effort checkpoint po jawnych zmianach; awaria nie blokuje kreatora. */
  onDraftChange?: (draft: OnboardingDraftInput) => void;
  /** Poprzedni wybór (powrót z preview) — przywraca selekcje, datę startu i własny plan zamiast zaczynać od zera. */
  resume?: PlanWizardChoice | null;
  /** Krok startowy przy powrocie z podglądu (Z232) — bez tego remount wizarda cofa na krok 1. */
  resumeStep?: number;
  /** Klucz localStorage dla szkicu PlanBuildera (tryb "własny plan"). */
  builderDraftKey?: string;
  /** Etykieta drugorzędnego CTA ekranu 6/6 (ścieżka z podglądem: "Podgląd planu"). */
  confirmLabelKey: TranslationKey;
  onConfirm: (choice: PlanWizardChoice, opts?: PlanWizardConfirmOptions) => void;
  isSaving?: boolean;
  error?: string | null;
  onExitBack?: () => void;
}

/** X33 WP-4: skipPreview = host zapisuje plan od razu ("Zaczynam ten plan"), bez ekranu PlanPreview. */
export interface PlanWizardConfirmOptions {
  skipPreview?: boolean;
}

export const PlanWizard = ({ showWelcome, socialProof, trialNotice, legalConsent, showMarketingConsent = false, onLegalConsent, askName, initialName, avatarPhotoURL, accountEmail, initial, initialDraft, legalConsentAlreadyRecorded = false, onDraftChange, resume, resumeStep, builderDraftKey, confirmLabelKey, onConfirm, isSaving, error, onExitBack }: PlanWizardProps) => {
  const { t, lang } = useTranslation();
  const wizardRootRef = useRef<HTMLDivElement>(null);
  const previousViewRef = useRef<string | null>(null);

  const initialDays = resume?.daysPerWeek ?? initialDraft?.daysPerWeek ?? initial?.daysPerWeek ?? 4;
  const resumedCustomPlan = resume && !resume.templateId ? resume : null;
  // Szkic głównego wizarda nie zawiera ćwiczeń własnego planu (te zapisuje
  // osobno PlanBuilder). Po restarcie wracamy więc do buildera, zamiast
  // przedstawiać rekomendowany szablon jako wcześniejszy wybór użytkownika.
  const resumedCustomDraft = !resume && initialDraft?.planSource === 'custom';
  // X32: bez Welcome kreator ZAWSZE startuje od kroku 2 (poziom) z wartosciami
  // z `initial` wstepnie zaznaczonymi; replan nie skacze juz na krok 5
  // (startAtPrecision usuniete), user potwierdza poziom/cel/dni klikajac Dalej.
  const [step, setStep] = useState(resumeStep ?? (resumedCustomDraft ? 5 : initialDraft?.wizardStep) ?? (showWelcome ? 1 : 2));
  const [level, setLevel] = useState<WizardLevel>(sanitizeWizardLevel(resume?.level ?? initialDraft?.level ?? initial?.level) ?? 'beginner');
  const [objective, setObjective] = useState<PlanObjective>(resume?.objective ?? initialDraft?.objective ?? initial?.objective ?? 'build_muscle');
  const [daysPerWeek, setDaysPerWeek] = useState(initialDays);
  const [trainingDays, setTrainingDays] = useState<Weekday[]>(() => {
    const fromResume = resume?.days.map((d) => d.weekday).filter(Boolean);
    if (fromResume && fromResume.length) return fromResume;
    return initialDraft?.trainingDays?.length ? initialDraft.trainingDays : (DEFAULT_DAYS[initialDays] ?? DEFAULT_DAYS[4]);
  });
  // X34b: konkretny dzień pierwszego treningu (ISO) z 6/6; null = pierwszy
  // dostępny chip. Stary szkic bez firstWorkoutDate (tylko poniedziałek) spada
  // na pierwszy dzień treningowy >= jego startDate (defaultFirstWorkout niżej).
  const [firstWorkoutInput, setFirstWorkoutInput] = useState<string | null>(() => resume?.firstWorkoutDate ?? initialDraft?.firstWorkoutDate ?? null);
  // X34: wznowienie na konkretnym kroku (6/6 albo 5A po "Wybierz inny plan")
  // ląduje w trybie wyboru; bez resumeStep własny plan otwiera się w builderze jak dotąd.
  const [mode, setMode] = useState<'recommend' | 'browse' | 'own'>((resumedCustomPlan && resumeStep === undefined) || resumedCustomDraft ? 'own' : 'recommend');
  // X34: własny plan z PlanBuildera czeka na ekran 6/6 (nazwa / długość / start)
  // zamiast trafiać od razu do hosta; null = ścieżka szablonu (karty 5A).
  const [customPlan, setCustomPlan] = useState<{ days: TrainingDay[]; durationWeeks: number } | null>(
    resumedCustomPlan ? { days: resumedCustomPlan.days, durationWeeks: resumedCustomPlan.durationWeeks } : null,
  );
  const [picked, setPicked] = useState<PlanTemplate | null>(() => {
    const templateId = resume?.templateId ?? initialDraft?.templateId;
    return templateId ? planTemplates.find((p) => p.id === templateId) ?? null : null;
  });
  // WP-O (X30): rekomendacja vs wybór z Browse plans (do planSource w snapshocie
  // odpowiedzi). Resume zachowuje oryginał; stary szkic bez planSource, ale
  // z templateId = traktuj jak wybór z przeglądarki (nie da się odtworzyć).
  const [pickedViaBrowse, setPickedViaBrowse] = useState(() =>
    resume?.planSource ? resume.planSource === 'browsed'
      : initialDraft?.planSource ? initialDraft.planSource === 'browsed'
        : Boolean(resume?.templateId ?? initialDraft?.templateId));
  const [userName, setUserName] = useState(resume?.name ?? initialDraft?.name ?? initialName ?? '');
  // Wersja 1.0: jeden rozpoznawalny motyw, bez ustawień palet. Pole pozostaje
  // w szkicu tylko dla zgodności danych ze starszymi, niedokończonymi wizardami.
  const accentId = 'lime';
  const [avatarBroken, setAvatarBroken] = useState(false);
  const greetingName = userName.trim();
  const avatarInitial = (greetingName || accountEmail?.trim() || '').charAt(0).toUpperCase();
  // Powrót z podglądu (resume) = zgody były już zaznaczone (i zapisane) przy pierwszym przejściu kroku 1.
  const [consents, setConsents] = useState<ConsentSelection>(
    resume || legalConsentAlreadyRecorded ? { terms: true, privacy: true, health: true, marketing: false } : EMPTY_CONSENT_SELECTION,
  );
  const [consentsRecorded, setConsentsRecorded] = useState(Boolean(resume) || legalConsentAlreadyRecorded);
  const [consentSaving, setConsentSaving] = useState(false);
  const [consentError, setConsentError] = useState(false);
  // Krok 01/06 ma dwa lekkie podwidoki, ale pozostaje jednym krokiem danych.
  // Nie zapisujemy tego stanu ani checkboxów w szkicu: po restarcie formalności
  // można ominąć wyłącznie na podstawie aktualnego mirrora serwerowego.
  const [welcomeView, setWelcomeView] = useState<'personalization' | 'legal'>('personalization');

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
    setWelcomeView('personalization');
    setStep(2);
  };

  const advanceFromPersonalization = () => {
    if (legalConsent && !consentsRecorded) {
      setConsentError(false);
      setWelcomeView('legal');
      return;
    }
    void advanceFromWelcome();
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
  // X33 WP-2: karta 2 "Alternatywa" = najlepiej punktowany szablon puli o INNYM
  // celu niż Polecany; bez takiego = drugi element puli; pula 1-elementowa = brak.
  const alternative = useMemo(
    () => scoredTemplates.slice(1).find((s) => s.template.objective !== recommended.objective)?.template
      ?? scoredTemplates[1]?.template ?? null,
    [scoredTemplates, recommended],
  );
  // Szablon z biblioteki spoza dwóch kart podmienia kartę 2 (badge "Wybrany").
  const secondCard: { template: PlanTemplate; badge: PlanChoiceBadge } | null =
    picked && picked.id !== recommended.id && picked.id !== alternative?.id
      ? { template: picked, badge: 'chosen' }
      : alternative ? { template: alternative, badge: 'alternative' } : null;
  // X33 WP-5: zmiana kroku/trybu = scroll na górę (zgłoszenie właściciela:
  // krok 5 otwierał się przewinięty w dół po długim kroku 4).
  useEffect(() => {
    if (typeof window !== 'undefined' && typeof window.scrollTo === 'function') window.scrollTo(0, 0);

    // Zmiana kroku jest zmianą ekranu, ale SPA nie przenosi fokusu automatycznie.
    // Programowy fokus na h1 daje VoiceOver/TalkBack kontekst bez włączania
    // nagłówka do zwykłej kolejności Tab.
    const view = `${step}:${mode}:${step === 1 ? welcomeView : ''}`;
    const heading = wizardRootRef.current?.querySelector<HTMLHeadingElement>('h1');
    if (heading) {
      heading.tabIndex = -1;
      if (previousViewRef.current !== null && previousViewRef.current !== view) {
        heading.focus({ preventScroll: true });
      }
    }
    previousViewRef.current = view;
  }, [step, mode, welcomeView]);

  // Centralny AndroidBackHandler najpierw zamyka overlay, a potem wysyła ten
  // anulowalny event. Wizard przejmuje go, żeby cofać lokalny krok zamiast trasy.
  // Ref eliminuje przeinstalowywanie listenera przy każdym kroku.
  const backStateRef = useRef({ step, mode, showWelcome, welcomeView, consentSaving, onExitBack });
  backStateRef.current = { step, mode, showWelcome, welcomeView, consentSaving, onExitBack };
  useEffect(() => {
    const onAndroidBack = (event: Event) => {
      event.preventDefault();
      const state = backStateRef.current;
      if (state.consentSaving) return;
      if (state.mode === 'browse' || state.mode === 'own') {
        setMode('recommend');
        return;
      }

      if (state.step === 1 && state.welcomeView === 'legal') {
        setWelcomeView('personalization');
        return;
      }

      const firstLocalStep = state.showWelcome ? 1 : 2;
      if (state.step > firstLocalStep) {
        setStep(state.step - 1);
        return;
      }
      state.onExitBack?.();
    };
    window.addEventListener(ANDROID_BACK_EVENT, onAndroidBack);

    return () => {
      window.removeEventListener(ANDROID_BACK_EVENT, onAndroidBack);
    };
  }, []);
  const [browseObjective, setBrowseObjective] = useState<PlanObjective | 'all'>('all');
  const browseTemplates = browseObjective === 'all'
    ? scoredTemplates
    : scoredTemplates.filter((s) => s.template.objective === browseObjective);
  // WP-PLANS-1 (X27, Task P5): kontrola długości na ekranie 6/6; null = default
  // z szablonu / buildera (zmiana szablonu resetuje wybór). X34: wznowienie
  // szablonu wraca 1:1 z zapisaną długością (nie z domyślną szablonu).
  const [templateWeeks, setTemplateWeeks] = useState<number | null>(
    resume?.templateId ? resume.durationWeeks : initialDraft?.durationWeeks ?? null,
  );
  const effectiveWeeks = templateWeeks ?? customPlan?.durationWeeks ?? chosen.durationWeeks;
  const weekdaySelectionValid = hasExactWeekdaySelection(trainingDays, daysPerWeek);

  // WP-PLANS-2 (X27, Task O3): nazwa planu edytowalna na ekranie 6/6; null = default
  // z aktualnego szablonu / "Własny plan" (zmiana szablonu wraca do defaultu).
  const [planNameInput, setPlanNameInput] = useState<string | null>(resume?.planName ?? initialDraft?.planName ?? null);
  const defaultPlanName = customPlan ? t('newplan.customPlan') : localizePlanName(chosen.id, chosen.name, lang);
  // X34b: chipy 6/6 = kolejne dni treningowe od dziś (do 8) wg dni ZAPISYWANEGO
  // planu (szablon po applyWeekdaysToPlanDays = dni z kroku 4 przycięte do liczby
  // dni szablonu; własny plan = dni z buildera). Wybór spoza listy (zmiana dni
  // w kroku 4, stary szkic) spada na pierwszy chip — zawsze ważna opcja, zero
  // pułapki z niezaznaczonym startem.
  const todayISO = formatLocalDate(new Date());
  const scheduleWeekdays = useMemo(
    () => uniqueSortedWeekdays((customPlan ? customPlan.days : applyWeekdaysToPlanDays(chosen.days, trainingDays)).map((d) => d.weekday)),
    [customPlan, chosen, trainingDays],
  );
  const firstWorkoutOptions = useMemo(() => listFirstWorkoutOptions(scheduleWeekdays, todayISO), [scheduleWeekdays, todayISO]);
  const defaultFirstWorkout = firstWorkoutOptions.find((iso) => iso >= (resume?.startDate ?? '')) ?? firstWorkoutOptions[0];
  const firstWorkoutDate = firstWorkoutInput && firstWorkoutOptions.includes(firstWorkoutInput) ? firstWorkoutInput : defaultFirstWorkout;

  useEffect(() => {
    if (!onDraftChange) return;
    onDraftChange({
      phase: 'wizard',
      wizardStep: step,
      name: userName,
      accentId,
      level,
      objective,
      daysPerWeek,
      trainingDays,
      ...(mode !== 'own' && !customPlan ? { templateId: chosen.id } : {}),
      recommendedTemplateId: recommended.id,
      planSource: customPlan || mode === 'own' ? 'custom' : pickedViaBrowse ? 'browsed' : 'recommended',
      durationWeeks: effectiveWeeks,
      firstWorkoutDate,
      planName: planNameInput ?? undefined,
    });
  }, [accentId, chosen.id, customPlan, daysPerWeek, effectiveWeeks, firstWorkoutDate, level, mode, objective, onDraftChange, pickedViaBrowse, planNameInput, recommended.id, step, trainingDays, userName]);

  const setDays = (n: number) => { setDaysPerWeek(n); setTrainingDays(DEFAULT_DAYS[n] ?? DEFAULT_DAYS[4]); };
  const toggleDay = (d: Weekday) => setTrainingDays(prev => prev.includes(d) ? prev.filter(x => x !== d) : [...prev, d]);

  // X34b: plan zakotwiczony w poniedziałku tygodnia pierwszego treningu; dni
  // treningowe tego tygodnia sprzed wybranej daty (i sprzed dziś) = skippedDates.
  // Dni tygodnia liczone z ZAPISYWANYCH dni (szablon po applyWeekdaysToPlanDays
  // albo własny plan), nie z surowego wyboru kroku 4.
  const fire = (days: TrainingDay[], durationWeeks: number, templateId?: string, planName?: string, opts?: PlanWizardConfirmOptions) => {
    const schedule = buildFirstWorkoutSchedule(firstWorkoutDate, days.map((d) => d.weekday), todayISO);
    onConfirm({
      days, durationWeeks, startDate: schedule.startDate, firstWorkoutDate, skippedDates: schedule.skippedDates,
      level, objective, daysPerWeek: days.length, templateId,
      name: userName.trim() || undefined, planName,
      // WP-O (X30): jawne odpowiedzi do snapshotu onboardingAnswers.
      trainingDays,
      recommendedTemplateId: recommended.id,
      planSource: templateId === undefined ? 'custom' : pickedViaBrowse ? 'browsed' : 'recommended',
    }, opts);
  };

  // X34: zatwierdzenie z ekranu 6/6 (główny CTA = skipPreview, "Podgląd planu" = false).
  // Edge 4: pusta nazwa spada do nazwy szablonu / "Własny plan" (fallback, nie pusty string).
  const confirmPlan = (opts: PlanWizardConfirmOptions) => {
    const planName = planNameInput?.trim() || defaultPlanName;
    if (customPlan) fire(customPlan.days, effectiveWeeks, undefined, planName, opts);
    else fire(applyWeekdaysToPlanDays(chosen.days, trainingDays), effectiveWeeks, chosen.id, planName, opts);
  };

  // X33 WP-2: zaznaczenie karty / wybór z biblioteki = nowy szablon, więc nazwa
  // i długość wracają do defaultów szablonu (jak dotąd przy wyborze z Browse).
  // planSource: karta 1 = recommended, karta 2 i biblioteka = browsed.
  const pickTemplate = (tpl: PlanTemplate, viaBrowse: boolean) => {
    if (tpl.id === chosen.id) return;
    setPicked(tpl);
    setPickedViaBrowse(viaBrowse);
    setTemplateWeeks(null);
    setPlanNameInput(null);
  };

  // X34: 5A "Wybierz start planu" = ścieżka szablonu (zaznaczona karta); własny
  // plan z poprzedniego przejścia zostaje tylko jako szkic buildera.
  const goToStartStep = () => {
    if (customPlan) {
      setCustomPlan(null);
      setTemplateWeeks(null);
      setPlanNameInput(null);
    }
    setStep(6);
  };
  const whyFor = (tpl: PlanTemplate) =>
    t('ob.match.why', { objective: t(OBJECTIVE_LABEL_KEY[tpl.objective]), level: t(LEVEL_LABEL_KEY[tpl.level]) });

  // ── Tryb: ułóż własny plan ──
  if (mode === 'own') {
    return (
      <div
        ref={wizardRootRef}
        data-testid="plan-wizard-root"
        className="min-h-[calc(100dvh-var(--keyboard-inset,0px))] bg-background pt-[calc(2.5rem+env(safe-area-inset-top))] pb-[calc(1.5rem+env(safe-area-inset-bottom))] pl-[max(1.5rem,env(safe-area-inset-left))] pr-[max(1.5rem,env(safe-area-inset-right))]"
      >
        <div className="max-w-lg mx-auto">
          {/* X34: submit buildera nie zapisuje; własny plan idzie na ekran 6/6
              (nazwa / długość / start) jak szablon. Powrót do buildera z 6/6
              (wstecz -> 5A -> Ułóż własny) dostaje dni z poprzedniego przejścia. */}
          <PlanBuilder
            initialDays={customPlan?.days}
            initialDurationWeeks={customPlan?.durationWeeks ?? 12}
            draftStorageKey={builderDraftKey}
            onSubmit={(days, weeks) => {
              setCustomPlan({ days, durationWeeks: weeks });
              setTemplateWeeks(null);
              setPlanNameInput(null);
              setMode('recommend');
              setStep(6);
            }}
            onCancel={() => setMode('recommend')}
          />
          {error && <p className="text-sm text-destructive text-center mt-3">{error}</p>}
        </div>
      </div>
    );
  }

  return (
    <div
      ref={wizardRootRef}
      data-testid="plan-wizard-root"
      className={cn(
        'min-h-[calc(100dvh-var(--keyboard-inset,0px))] bg-background flex flex-col pt-[calc(2.5rem+env(safe-area-inset-top))] pb-[calc(1.5rem+env(safe-area-inset-bottom))] pl-[max(1.5rem,env(safe-area-inset-left))] pr-[max(1.5rem,env(safe-area-inset-right))]',
        step <= 5 && 'h-[calc(100dvh-var(--keyboard-inset,0px))] overflow-hidden',
      )}
    >
      <div className="min-h-0 flex-1 max-w-lg w-full mx-auto flex flex-col">
        {step === 1 && (
          <>
            <StepHeader
              step={1}
              total={6}
              onBack={welcomeView === 'legal' ? () => setWelcomeView('personalization') : onExitBack}
              backDisabled={welcomeView === 'legal' && consentSaving}
            />
            {welcomeView === 'personalization' ? (
              <>
                <div data-testid="ob-step-scroll" className="min-h-0 flex-1 overflow-y-auto overscroll-contain py-4 pr-1">
              {/* X33 WP-8: kółko avatara (zdjęcie / inicjał / ikona na tle akcentu)
                  obok "Cześć, {imię}"; bez imienia zostaje dotychczasowy tytuł.
                  Tylko onboarding (askName). Zasada 7: nic tu nie jest zaznaczalne
                  ani przeciągalne. */}
              {askName ? (
                <div className="flex items-center gap-4 select-none">
                  <div
                    data-testid="ob-avatar"
                    className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary font-heading text-2xl font-bold text-primary-foreground"
                  >
                    {avatarPhotoURL && !avatarBroken ? (
                      <img
                        data-testid="ob-avatar-img"
                        src={avatarPhotoURL}
                        alt=""
                        draggable={false}
                        referrerPolicy="no-referrer"
                        onError={() => setAvatarBroken(true)}
                        className="pointer-events-none h-full w-full object-cover"
                      />
                    ) : avatarInitial ? (
                      <span data-testid="ob-avatar-initials">{avatarInitial}</span>
                    ) : (
                      <User data-testid="ob-avatar-icon" className="h-7 w-7" aria-hidden="true" />
                    )}
                  </div>
                  {greetingName ? (
                    <h1 tabIndex={-1} className="min-w-0 break-words font-heading font-bold text-4xl leading-[1.05] tracking-tight">
                      {t('ob.welcome.hello', { name: greetingName })}
                    </h1>
                  ) : (
                    <h1 tabIndex={-1} className="font-heading font-bold text-5xl leading-[1.05] tracking-tight">
                      {t('ob.welcome.title1')}<br />
                      <span className="text-primary">{t('ob.welcome.title2')}</span>
                    </h1>
                  )}
                </div>
              ) : (
                <h1 tabIndex={-1} className="font-heading font-bold text-5xl leading-[1.05] tracking-tight">
                  {t('ob.welcome.title1')}<br />
                  <span className="text-primary">{t('ob.welcome.title2')}</span>
                </h1>
              )}
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
                    autoComplete="given-name"
                    enterKeyHint="done"
                    value={userName}
                    maxLength={60}
                    onChange={e => setUserName(e.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') event.currentTarget.blur();
                    }}
                    placeholder={t('ob.welcome.namePlaceholder')}
                    className="w-full rounded-2xl bg-surface-low px-4 py-3.5 text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              )}
                </div>
                <div className="shrink-0 bg-background pt-3">
                  <PrimaryButton onClick={advanceFromPersonalization} testId="ob-personalization-next">
                    {t('ob.next')} <ArrowRight className="h-4 w-4" />
                  </PrimaryButton>
                  {socialProof && <p className="text-center text-[11px] font-medium tracking-widest uppercase text-muted-foreground mt-3">{t('ob.social')}</p>}
                </div>
              </>
            ) : (
              <>
                <div data-testid="ob-step-scroll" className="min-h-0 flex-1 overflow-y-auto overscroll-contain py-4 pr-1">
                  <h1 tabIndex={-1} className="font-heading text-4xl font-bold leading-tight tracking-tight">
                    {t('ob.legal.title')}
                  </h1>
                  <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{t('ob.legal.desc')}</p>
                  <div className="mt-6">
                    <ConsentCheckboxes value={consents} onChange={setConsents} showMarketing={showMarketingConsent} disabled={consentSaving} />
                    {consentError && (
                      <p role="alert" aria-live="assertive" className="mt-3 text-[13px] text-destructive" data-testid="consent-error">{t('consent.saveError')}</p>
                    )}
                  </div>
                </div>
                <div className="shrink-0 bg-background pt-3">
                  <PrimaryButton
                    onClick={() => void advanceFromWelcome()}
                    testId="ob-legal-submit"
                    disabled={!hasRequiredConsents(consents) || consentSaving}
                    busy={consentSaving}
                    ariaLabel={consentSaving ? t('ob.legal.saving') : undefined}
                  >
                    {consentSaving
                      ? <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />
                      : <>{t('ob.legal.submit')} <ArrowRight className="h-4 w-4" /></>}
                  </PrimaryButton>
                </div>
              </>
            )}
          </>
        )}

        {step === 2 && (
          <>
            <StepHeader step={2} total={6} onBack={() => (showWelcome ? setStep(1) : onExitBack?.())} />
            <div data-testid="ob-step-scroll" className="min-h-0 flex-1 overflow-y-auto overscroll-contain pb-4 pr-1">
              <div className="mt-7 mb-5">
                <h1 tabIndex={-1} className="font-heading font-bold text-4xl leading-tight tracking-tight">
                  {t('ob.baseline.title1')} <span className="text-primary">{t('ob.baseline.title2')}</span>
                </h1>
                <p className="text-muted-foreground mt-2">{t('ob.baseline.desc')}</p>
              </div>
              <div className="space-y-3">
                {LEVELS.map(l => (
                  <OptionCard key={l.value} icon={l.icon} title={t(l.labelKey)} desc={t(l.descKey)} selected={level === l.value} onClick={() => setLevel(l.value)} />
                ))}
              </div>
            </div>
            <div className="shrink-0 bg-background pt-3"><PrimaryButton onClick={() => setStep(3)}>{t('ob.nextStep')} <ArrowRight className="h-4 w-4" /></PrimaryButton></div>
          </>
        )}

        {step === 3 && (
          <>
            <StepHeader step={3} total={6} onBack={() => setStep(2)} />
            <div data-testid="ob-step-scroll" className="min-h-0 flex-1 overflow-y-auto overscroll-contain pb-4 pr-1">
              <div className="mt-7 mb-5">
                <h1 tabIndex={-1} className="font-heading font-bold text-4xl leading-tight tracking-tight">
                  {t('ob.obj.title1')} <span className="text-primary">{t('ob.obj.title2')}</span>
                </h1>
                <p className="text-muted-foreground mt-2">{t('ob.obj.desc')}</p>
              </div>
              <div className="space-y-3">
                {OBJECTIVES.map(o => (
                  <OptionCard key={o.value} icon={o.icon} title={t(o.labelKey)} desc={t(o.descKey)} selected={objective === o.value} onClick={() => setObjective(o.value)} />
                ))}
              </div>
            </div>
            <div className="shrink-0 bg-background pt-3"><PrimaryButton onClick={() => setStep(4)}>{t('ob.continue')} <ArrowRight className="h-4 w-4" /></PrimaryButton></div>
          </>
        )}

        {step === 4 && (
          <>
            <StepHeader step={4} total={6} onBack={() => setStep(3)} />
            <div data-testid="ob-step-scroll" className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain pb-4 pr-1">
              <div className="mt-7 mb-5">
                <h1 tabIndex={-1} className="font-heading font-bold text-4xl leading-tight tracking-tight">
                  {t('ob.protocol.title1')} <span className="text-primary">{t('ob.protocol.title2')}</span>
                </h1>
                <p className="text-muted-foreground mt-2">{t('ob.protocol.desc')}</p>
              </div>
              <div className="rounded-2xl bg-surface-low p-4">
                <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground mb-3">{t('ob.protocol.daysQ')}</p>
                {/* Z233: te same kółka co wybór dni tygodnia niżej — jedna geometria kontrolek. */}
                <div className="grid grid-cols-5 gap-1">
                  {[2, 3, 4, 5, 6].map(n => (
                    <button type="button" key={n} aria-pressed={daysPerWeek === n} onClick={() => setDays(n)} className={cn('h-11 min-w-0 w-full rounded-full font-heading font-bold transition-colors', daysPerWeek === n ? 'bg-primary text-primary-foreground' : 'bg-surface-highest text-foreground')}>{n}</button>
                  ))}
                </div>
                {/* T1 (feedback 2026-08-20): user bał się, że wybór dni jest wiążący. */}
                <p className="text-[11px] text-muted-foreground mt-3">{t('ob.protocol.flexNote')}</p>
              </div>
              <div className="rounded-2xl bg-surface-low p-4">
                <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground mb-3">{t('ob.protocol.daysSelect')}</p>
                <div className="grid grid-cols-4 gap-2">
                  {WEEKDAYS.map(w => {
                    const on = trainingDays.includes(w.value);
                    return (
                      <button
                        type="button"
                        key={w.value}
                        aria-label={localizeDayName(w.long, lang)}
                        aria-pressed={on}
                        onClick={() => toggleDay(w.value)}
                        className={cn('h-11 min-w-0 w-full rounded-xl font-bold text-sm transition-colors', on ? 'bg-primary text-background' : 'bg-surface-highest text-muted-foreground')}
                      >
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
            <div className="shrink-0 bg-background pt-3"><PrimaryButton disabled={!weekdaySelectionValid} onClick={() => { setPicked(null); setPickedViaBrowse(false); setTemplateWeeks(null); setPlanNameInput(null); setStep(5); }}>{t('ob.continue')} <ArrowRight className="h-4 w-4" /></PrimaryButton></div>
          </>
        )}

        {step === 5 && mode === 'recommend' && (
          <>
            <StepHeader step={5} total={6} onBack={() => setStep(4)} />
            {/* Rekomendacja jest wyliczona synchronicznie przed renderem. Karty są
                dostępne natychmiast — bez sztucznego timera zależnego od pracy JS
                w foregroundzie. Nagłówek „Dopasowane do Ciebie” potwierdza wynik. */}
            {/* X34: 5A to wyłącznie WYBÓR (nagłówek + dwie karty + Ułóż własny +
                biblioteka). Podsumowanie odpowiedzi, "Zmień ustawienia" (wstecz =
                strzałka) i ustawienia planu zniknęły; nazwa / długość / start żyją
                na ekranie 6/6. */}
            <div data-testid="ob-step-scroll" className="min-h-0 flex-1 space-y-2.5 overflow-y-auto overscroll-contain pb-4 pr-1">
              <div className="mt-5 mb-4">
                <p className="text-xs font-medium uppercase tracking-widest text-primary mb-1.5">{t('ob.precision.kicker')}</p>
                <h1 tabIndex={-1} className="font-heading font-bold text-3xl leading-tight tracking-tight">{t('ob.match.title', { days: daysPerWeek })}</h1>
              </div>
              {/* X33 WP-2: dwie karty (Polecany / Alternatywa albo Wybrany z biblioteki);
                  tap = zaznaczenie, domyślnie karta 1. */}
              <div className="space-y-3" data-testid="ob-plan-choices">
                <PlanChoiceCard
                  testId="plan-choice-recommended"
                  template={recommended}
                  badge="recommended"
                  why={whyFor(recommended)}
                  selected={chosen.id === recommended.id}
                  onSelect={() => pickTemplate(recommended, false)}
                />
                {secondCard && (
                  <PlanChoiceCard
                    testId="plan-choice-alternative"
                    template={secondCard.template}
                    badge={secondCard.badge}
                    why={whyFor(secondCard.template)}
                    selected={chosen.id === secondCard.template.id}
                    onSelect={() => pickTemplate(secondCard.template, true)}
                  />
                )}
              </div>
              <button onClick={() => setMode('own')} className="w-full min-h-12 touch-manipulation rounded-2xl bg-surface-high text-sm font-medium flex items-center justify-center gap-2"><Pencil className="h-4 w-4 text-primary" />{t('ob.precision.own')}</button>
              <button onClick={() => setMode('browse')} className="w-full min-h-12 touch-manipulation rounded-xl text-[13px] text-primary font-medium inline-flex items-center justify-center gap-1.5"><ListChecks className="h-4 w-4" />{t('ob.match.library', { n: scoredTemplates.length, days: daysPerWeek })}</button>
              {(() => {
                // Z72: user widzi prawdę zamiast cichej degradacji (slice w applyWeekdaysToPlanDays).
                const mismatch = planDaysMismatch(chosen, daysPerWeek);
                return mismatch ? (
                  <p className="rounded-2xl border border-fitness-warning/30 bg-fitness-warning/10 p-3 text-[13px] text-fitness-warning">
                    {t('wizard.daysMismatch', { n: mismatch.planDays, m: mismatch.selectedDays })}
                  </p>
                ) : null;
              })()}
            </div>
            {/* X34: jedno CTA prowadzi do ekranu 6/6 "Start planu". */}
            <div className="shrink-0 bg-background pt-3">
              <PrimaryButton testId="ob-match-next" onClick={goToStartStep}>
                {t('ob.match.next')} <ArrowRight className="h-4 w-4" />
              </PrimaryButton>
            </div>
          </>
        )}

        {step === 6 && (
          <>
            {/* X34 / X34b: ekran 6/6 "Start planu": data pierwszego treningu, długość,
                nazwa, główny CTA celu (zapis od razu, skipPreview) i "Podgląd planu".
                Wstecz = 5A. */}
            <StepHeader step={6} total={6} onBack={() => setStep(5)} />
            <PlanStartStep
              name={planNameInput ?? defaultPlanName}
              onNameChange={setPlanNameInput}
              weeks={effectiveWeeks}
              templateWeeks={customPlan ? undefined : chosen.durationWeeks}
              onWeeksChange={setTemplateWeeks}
              firstWorkoutDate={firstWorkoutDate}
              firstWorkoutOptions={firstWorkoutOptions}
              onFirstWorkoutChange={setFirstWorkoutInput}
              todayISO={todayISO}
              objective={objective}
              previewLabel={t(confirmLabelKey)}
              onStart={() => confirmPlan({ skipPreview: true })}
              onPreview={() => confirmPlan({ skipPreview: false })}
              isSaving={isSaving}
              error={error}
            />
          </>
        )}

        {step === 5 && mode === 'browse' && (
          <>
            <StepHeader step={5} total={6} onBack={() => setMode('recommend')} />
            <div className="mt-7 mb-4">
              {/* X32: nagłówek z liczbą dni z kroku 4 + licznik puli; pula zastępcza
                  (+-1 dnia) jest jawnie oznaczona zamiast cichej podmiany. */}
              <h1 tabIndex={-1} className="font-heading font-bold text-3xl tracking-tight uppercase">
                {dayPool.exactDays
                  ? t('ob.browse.titleDays', { days: daysPerWeek, count: scoredTemplates.length })
                  : t('ob.browse.nearestTitle', { count: scoredTemplates.length })}
              </h1>
              {!dayPool.exactDays && (
                <p data-testid="browse-nearest-note" className="mt-1 text-[13px] text-fitness-warning">{t('ob.browse.nearestNote', { days: daysPerWeek })}</p>
              )}
              <p className="text-muted-foreground mt-1">{t('ob.browse.desc')}</p>
              {/* X33 WP-2: chipy celu (filtr w obrębie puli dni; "Wszystkie" domyślnie).
                  X35a WP-A: zawijane, bez przewijania w bok. */}
              <div className="mt-3 flex flex-wrap gap-2" data-testid="browse-objective-chips">
                {BROWSE_CHIPS.map((chip) => {
                  const on = browseObjective === chip.value;
                  return (
                    <button
                      key={chip.value}
                      type="button"
                      aria-pressed={on}
                      onClick={() => setBrowseObjective(chip.value)}
                      className={cn(
                        'touch-manipulation select-none rounded-full px-3 py-1.5 text-[11px] font-bold uppercase tracking-wide transition-colors',
                        toggleButtonClasses(on),
                        on ? 'bg-primary text-primary-foreground' : 'bg-surface-highest text-muted-foreground',
                      )}
                    >
                      {t(chip.labelKey)}
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="flex-1 space-y-3 overflow-y-auto">
              {/* WP-O (X30): lista posortowana wg dopasowania (scoreTemplates);
                  rekomendacja dostaje badge "Polecany". X32: ta sama liczba dni =
                  dni tygodnia z kroku 4 zostają (setDays resetuje do domyślnych
                  tylko przy realnej zmianie liczby dni, pula zastępcza). Wybór
                  wraca do 5A z zaznaczoną kartą (X33 WP-2). */}
              {browseTemplates.length === 0 && (
                <p data-testid="browse-empty-objective" className="rounded-2xl bg-surface-low p-4 text-[13px] text-muted-foreground">{t('ob.browse.emptyObjective', { days: daysPerWeek })}</p>
              )}
              {browseTemplates.map(({ template: tpl }) => (
                <button key={tpl.id} onClick={() => { setPicked(tpl); setPickedViaBrowse(true); if (tpl.daysPerWeek !== daysPerWeek) setDays(tpl.daysPerWeek); setTemplateWeeks(null); setPlanNameInput(null); setMode('recommend'); }} className="w-full touch-manipulation select-none text-left rounded-2xl bg-surface-low hover:bg-surface-container overflow-hidden transition-colors">
                  {/* WP-F (X28): hero na górze karty (rounded-t przez overflow-hidden rodzica) */}
                  <PlanTemplateHero templateId={tpl.id} className="h-20" />
                  <div className="p-4">
                    <div className="flex items-center justify-between gap-2">
                      <span className="flex min-w-0 items-center gap-2">
                        <h3 className="truncate font-heading font-bold text-lg text-primary">{localizePlanName(tpl.id, tpl.name, lang)}</h3>
                        {tpl.id === recommended.id && (
                          <span data-testid="browse-recommended-badge" className="shrink-0 rounded-full bg-primary/15 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-primary">
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
