import { useEffect, useMemo, useState } from 'react';
import { Loader2, ArrowRight, ArrowLeft, ArrowUpRight, Dumbbell, Weight, Flame, Zap, Link2, Check, Pencil, ListChecks, User } from 'lucide-react';
import { useTranslation } from '@/contexts/LanguageContext';
import type { TranslationKey } from '@/i18n';
import { localizeWeekdayShort, localizePlanName, localizePlanDescription } from '@/lib/plan-i18n';
import { PlanBuilder } from '@/components/PlanBuilder';
import { PlanChoiceCard, PlanTemplateHero, type PlanChoiceBadge } from '@/components/PlanChoiceCard';
import { PlanStartStep } from '@/components/PlanStartStep';
import { planTemplates, type PlanTemplate, type PlanObjective } from '@/data/planTemplates';
import { scoreTemplates, selectTemplatesForDays } from '@/lib/plan-recommendation';
import type { TrainingDay, Weekday } from '@/data/trainingPlan';
import { cn, formatLocalDate } from '@/lib/utils';
import { getStartOfPlanWeek } from '@/lib/plan-schedule';
import { ConsentCheckboxes } from '@/components/ConsentCheckboxes';
import { ACCENTS, applyAccent, getAccentById, hasStoredAccent, readStoredAccentId, storeAccentId, type AccentTheme } from '@/lib/accent-theme';
import { deriveAccentCandidatesFromAvatar } from '@/lib/avatar-accent';
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

// X33 WP-2: chipy celu w bibliotece (filtr objective w obrębie puli dni).
const BROWSE_CHIPS: { value: PlanObjective | 'all'; labelKey: TranslationKey }[] = [
  { value: 'all', labelKey: 'ob.browse.chipAll' },
  { value: 'build_muscle', labelKey: 'ob.browse.chipMuscle' },
  { value: 'peak_strength', labelKey: 'ob.browse.chipStrength' },
  { value: 'fat_loss', labelKey: 'ob.browse.chipFatLoss' },
  { value: 'athletic', labelKey: 'ob.browse.chipAthletic' },
];

// X33 WP-1: czas przerywnika "Dobieram plany" po Dalej w kroku 4.
export const MATCHING_INTERSTITIAL_MS = 900;

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

const PrimaryButton = ({ onClick, disabled, testId, children }: { onClick: () => void; disabled?: boolean; testId?: string; children: React.ReactNode }) => (
  <button
    onClick={onClick}
    disabled={disabled}
    data-testid={testId}
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
  /** X33 WP-8: e-mail konta — litera w kółku avatara, gdy nie ma ani zdjęcia, ani imienia. */
  accountEmail?: string;
  initial?: { level?: WizardLevel; objective?: PlanObjective; daysPerWeek?: number };
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

export const PlanWizard = ({ showWelcome, socialProof, trialNotice, legalConsent, onLegalConsent, askName, initialName, avatarPhotoURL, accountEmail, initial, resume, resumeStep, builderDraftKey, confirmLabelKey, onConfirm, isSaving, error, onExitBack }: PlanWizardProps) => {
  const { t, lang } = useTranslation();

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
  // X34: wznowienie na konkretnym kroku (6/6 albo 5A po "Wybierz inny plan")
  // ląduje w trybie wyboru; bez resumeStep własny plan otwiera się w builderze jak dotąd.
  const [mode, setMode] = useState<'recommend' | 'browse' | 'own'>(resumedCustomPlan && resumeStep === undefined ? 'own' : 'recommend');
  // X34: własny plan z PlanBuildera czeka na ekran 6/6 (nazwa / długość / start)
  // zamiast trafiać od razu do hosta; null = ścieżka szablonu (karty 5A).
  const [customPlan, setCustomPlan] = useState<{ days: TrainingDay[]; durationWeeks: number } | null>(
    resumedCustomPlan ? { days: resumedCustomPlan.days, durationWeeks: resumedCustomPlan.durationWeeks } : null,
  );
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
  // X33 WP-8: do 3 kolorów ze zdjęcia jako pierwsze kropki ("Z Twojego zdjęcia");
  // pusta lista = dokładnie dotychczasowa paleta. Zdjęcie po błędzie ładowania
  // ustępuje inicjałom (Apple Sign-In nie daje zdjęcia, więc to wariant równorzędny).
  const [photoAccentIds, setPhotoAccentIds] = useState<string[]>([]);
  const [avatarBroken, setAvatarBroken] = useState(false);
  const orderedAccents = useMemo(() => [
    ...photoAccentIds.map((id) => getAccentById(id)),
    ...ACCENTS.filter((a) => !photoAccentIds.includes(a.id)),
  ], [photoAccentIds]);
  // X29 WP-H: preselekcja akcentu z avatara na Welcome — user od razu widzi
  // "swój" kolor zaznaczony i może zmienić. Odpala się TYLKO bez zapisanego
  // wyboru (zasada 5); każdy problem = cichy fail, zostaje limonka.
  // X33 WP-8: kandydaci liczą się zawsze (kropki), preselekcja = pierwszy z nich.
  useEffect(() => {
    if (!askName || !avatarPhotoURL) return;
    let cancelled = false;
    deriveAccentCandidatesFromAvatar(avatarPhotoURL)
      .then((candidates) => {
        if (cancelled) return;
        setPhotoAccentIds(candidates);
        const derived = candidates[0];
        // Re-check: user mógł kliknąć swatch, zanim avatar się pobrał.
        if (!derived || hasStoredAccent()) return;
        applyAccent(derived);
        storeAccentId(derived);
        setAccentId(derived);
      })
      .catch(() => {
        // Cichy fail — zostaje limonka.
      });
    return () => { cancelled = true; };
  }, [askName, avatarPhotoURL]);
  const greetingName = userName.trim();
  const avatarInitial = (greetingName || accountEmail?.trim() || '').charAt(0).toUpperCase();
  const renderAccentSwatch = (a: AccentTheme) => (
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
  );
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
  // X33 WP-1: przerywnik po Dalej w kroku 4, raz na przejście kreatora (powrót
  // przez "Zmień ustawienia"/strzałkę i wznowienie szkicu go pomijają).
  const [matching, setMatching] = useState(false);
  const [matchingShown, setMatchingShown] = useState(Boolean(resume));
  useEffect(() => {
    if (!matching) return;
    const id = window.setTimeout(() => setMatching(false), MATCHING_INTERSTITIAL_MS);
    return () => window.clearTimeout(id);
  }, [matching]);
  // X33 WP-5: zmiana kroku/trybu = scroll na górę (zgłoszenie właściciela:
  // krok 5 otwierał się przewinięty w dół po długim kroku 4).
  useEffect(() => {
    if (typeof window !== 'undefined' && typeof window.scrollTo === 'function') window.scrollTo(0, 0);
  }, [step, mode]);
  const [browseObjective, setBrowseObjective] = useState<PlanObjective | 'all'>('all');
  const browseTemplates = browseObjective === 'all'
    ? scoredTemplates
    : scoredTemplates.filter((s) => s.template.objective === browseObjective);
  // WP-PLANS-1 (X27, Task P5): kontrola długości na ekranie 6/6; null = default
  // z szablonu / buildera (zmiana szablonu resetuje wybór). X34: wznowienie
  // szablonu wraca 1:1 z zapisaną długością (nie z domyślną szablonu).
  const [templateWeeks, setTemplateWeeks] = useState<number | null>(resume?.templateId ? resume.durationWeeks : null);
  const effectiveWeeks = templateWeeks ?? customPlan?.durationWeeks ?? chosen.durationWeeks;
  const weekdaySelectionValid = hasExactWeekdaySelection(trainingDays, daysPerWeek);

  // WP-PLANS-2 (X27, Task O3): nazwa planu edytowalna na ekranie 6/6; null = default
  // z aktualnego szablonu / "Własny plan" (zmiana szablonu wraca do defaultu).
  const [planNameInput, setPlanNameInput] = useState<string | null>(resume?.planName ?? null);
  const defaultPlanName = customPlan ? t('newplan.customPlan') : localizePlanName(chosen.id, chosen.name, lang);
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

  const fire = (days: TrainingDay[], durationWeeks: number, templateId?: string, planName?: string, opts?: PlanWizardConfirmOptions) =>
    onConfirm({
      days, durationWeeks, startDate, level, objective, daysPerWeek: days.length, templateId,
      name: userName.trim() || undefined, planName,
      // WP-O (X30): jawne odpowiedzi do snapshotu onboardingAnswers.
      trainingDays,
      recommendedTemplateId: recommended.id,
      planSource: templateId === undefined ? 'custom' : pickedViaBrowse ? 'browsed' : 'recommended',
    }, opts);

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
      <div className="min-h-screen bg-background p-6">
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
    <div className="min-h-screen bg-background flex flex-col">
      <div className="flex-1 max-w-lg w-full mx-auto px-6 pt-10 pb-6 flex flex-col">
        {step === 1 && (
          <>
            <StepHeader step={1} total={6} onBack={onExitBack} />
            <div className="flex-1 flex flex-col justify-center py-6">
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
                    <h1 className="min-w-0 break-words font-heading font-bold text-4xl leading-[1.05] tracking-tight">
                      {t('ob.welcome.hello', { name: greetingName })}
                    </h1>
                  ) : (
                    <h1 className="font-heading font-bold text-5xl leading-[1.05] tracking-tight">
                      {t('ob.welcome.title1')}<br />
                      <span className="text-primary">{t('ob.welcome.title2')}</span>
                    </h1>
                  )}
                </div>
              ) : (
                <h1 className="font-heading font-bold text-5xl leading-[1.05] tracking-tight">
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
                    value={userName}
                    maxLength={60}
                    onChange={e => setUserName(e.target.value)}
                    placeholder={t('ob.welcome.namePlaceholder')}
                    className="w-full rounded-2xl bg-surface-low px-4 py-3.5 text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-primary"
                  />
                  {/* Plan I: kolor aplikacji przy pytaniu o imię — tylko paleta
                      (custom hex zostaje w Profilu), klik = live preview. */}
                  <p className="mt-5 mb-2 block text-xs font-medium uppercase tracking-widest text-muted-foreground">{t('ob.welcome.colorQ')}</p>
                  {/* X33 WP-8: kandydaci ze zdjęcia jako pierwsze kropki (własny
                      wiersz z etykietą), reszta palety po nich; bez kandydatów
                      DOM jest dokładnie dotychczasowy. */}
                  <div className="flex flex-wrap gap-2" role="radiogroup" aria-label={t('ob.welcome.colorQ')} data-testid="ob-accent-swatches">
                    {photoAccentIds.length > 0 && (
                      <div className="flex w-full items-center gap-2">
                        {orderedAccents.slice(0, photoAccentIds.length).map(renderAccentSwatch)}
                        <span data-testid="ob-accent-from-photo" className="ml-1 text-[11px] text-muted-foreground">{t('ob.welcome.fromPhoto')}</span>
                      </div>
                    )}
                    {orderedAccents.slice(photoAccentIds.length).map(renderAccentSwatch)}
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
            <StepHeader step={2} total={6} onBack={() => (showWelcome ? setStep(1) : onExitBack?.())} />
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
            <StepHeader step={3} total={6} onBack={() => setStep(2)} />
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
            <StepHeader step={4} total={6} onBack={() => setStep(3)} />
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
            <div className="pt-5"><PrimaryButton disabled={!weekdaySelectionValid} onClick={() => { setPicked(null); setPickedViaBrowse(false); setTemplateWeeks(null); setPlanNameInput(null); if (!matchingShown) { setMatchingShown(true); setMatching(true); } setStep(5); }}>{t('ob.continue')} <ArrowRight className="h-4 w-4" /></PrimaryButton></div>
          </>
        )}

        {step === 5 && mode === 'recommend' && (
          <>
            <StepHeader step={5} total={6} onBack={() => setStep(4)} />
            {/* X33 WP-1: przerywnik "Dobieram plany" (ok. 900 ms) jako nakładka nad
                gotowym ekranem 5A; pasek = istniejąca animacja boot-progress. */}
            {matching && (
              <div data-testid="ob-matching" role="status" aria-live="polite" className="fixed inset-0 z-50 flex select-none items-center justify-center bg-background px-6">
                <div className="w-full max-w-sm rounded-2xl bg-surface-low p-6">
                  <p className="font-heading text-2xl font-bold">{t('ob.matching.title')}</p>
                  <dl className="mt-4 space-y-2 text-[14px]">
                    <div className="flex justify-between gap-3"><dt className="text-muted-foreground">{t('ob.matching.level')}</dt><dd className="font-medium">{t(LEVEL_LABEL_KEY[level])}</dd></div>
                    <div className="flex justify-between gap-3"><dt className="text-muted-foreground">{t('ob.matching.objective')}</dt><dd className="font-medium">{t(OBJECTIVE_LABEL_KEY[objective])}</dd></div>
                    <div className="flex justify-between gap-3"><dt className="text-muted-foreground">{t('ob.precision.frequency')}</dt><dd className="font-medium">{daysPerWeek} {t('ob.precision.daysWk')}</dd></div>
                  </dl>
                  <div className="mt-5 h-1 overflow-hidden rounded-full bg-surface-highest">
                    <span className="boot-progress-indicator block h-full w-1/3 rounded-full bg-primary" />
                  </div>
                </div>
              </div>
            )}
            {/* X34: 5A to wyłącznie WYBÓR (nagłówek + dwie karty + Ułóż własny +
                biblioteka). Podsumowanie odpowiedzi, "Zmień ustawienia" (wstecz =
                strzałka) i ustawienia planu zniknęły; nazwa / długość / start żyją
                na ekranie 6/6. */}
            <div className="mt-5 mb-4">
              <p className="text-xs font-medium uppercase tracking-widest text-primary mb-1.5">{t('ob.precision.kicker')}</p>
              <h1 className="font-heading font-bold text-3xl leading-tight tracking-tight">{t('ob.match.title', { days: daysPerWeek })}</h1>
            </div>
            <div className="flex-1 space-y-2.5">
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
              <button onClick={() => setMode('own')} className="w-full touch-manipulation rounded-2xl py-2.5 bg-surface-high text-sm font-medium flex items-center justify-center gap-2"><Pencil className="h-4 w-4 text-primary" />{t('ob.precision.own')}</button>
              <button onClick={() => setMode('browse')} className="w-full touch-manipulation py-1 text-[13px] text-primary font-medium inline-flex items-center justify-center gap-1.5"><ListChecks className="h-4 w-4" />{t('ob.match.library', { n: scoredTemplates.length, days: daysPerWeek })}</button>
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
            <div className="pt-4">
              <PrimaryButton testId="ob-match-next" onClick={goToStartStep}>
                {t('ob.match.next')} <ArrowRight className="h-4 w-4" />
              </PrimaryButton>
            </div>
          </>
        )}

        {step === 6 && (
          <>
            {/* X34: ekran 6/6 "Start planu": nazwa, długość, start, główny CTA celu
                (zapis od razu, skipPreview) i "Podgląd planu". Wstecz = 5A. */}
            <StepHeader step={6} total={6} onBack={() => setStep(5)} />
            <PlanStartStep
              name={planNameInput ?? defaultPlanName}
              onNameChange={setPlanNameInput}
              weeks={effectiveWeeks}
              templateWeeks={customPlan ? undefined : chosen.durationWeeks}
              onWeeksChange={setTemplateWeeks}
              startDate={selectedMonday}
              startMondays={startMondays}
              onStartDateChange={setStartDate}
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
              <h1 className="font-heading font-bold text-3xl tracking-tight uppercase">
                {dayPool.exactDays
                  ? t('ob.browse.titleDays', { days: daysPerWeek, count: scoredTemplates.length })
                  : t('ob.browse.nearestTitle', { count: scoredTemplates.length })}
              </h1>
              {!dayPool.exactDays && (
                <p data-testid="browse-nearest-note" className="mt-1 text-[13px] text-fitness-warning">{t('ob.browse.nearestNote', { days: daysPerWeek })}</p>
              )}
              <p className="text-muted-foreground mt-1">{t('ob.browse.desc')}</p>
              {/* X33 WP-2: chipy celu (filtr w obrębie puli dni; "Wszystkie" domyślnie). */}
              <div className="mt-3 flex gap-2 overflow-x-auto pb-1" data-testid="browse-objective-chips">
                {BROWSE_CHIPS.map((chip) => {
                  const on = browseObjective === chip.value;
                  return (
                    <button
                      key={chip.value}
                      type="button"
                      aria-pressed={on}
                      onClick={() => setBrowseObjective(chip.value)}
                      className={cn('shrink-0 touch-manipulation select-none rounded-full px-3 py-1.5 text-[11px] font-bold uppercase tracking-wide transition-colors', on ? 'bg-primary text-primary-foreground' : 'bg-surface-highest text-muted-foreground')}
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
