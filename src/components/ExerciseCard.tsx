import { useState, useEffect, useRef, memo, useMemo, Fragment } from 'react';
import { useNavigate } from 'react-router-dom';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Flame, Info, StickyNote, Play, Plus, Sparkles, Loader2, Activity, Timer, Disc, MoreHorizontal, ArrowRightLeft, SkipForward, Pin, Dumbbell, Target, Trophy, Check } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Exercise } from '@/data/trainingPlan';
import { exerciseLibrary } from '@/data/exerciseLibrary';
import type { SetData, ExerciseMetrics } from '@/types';
import { cn } from '@/lib/utils';
import {
  parseSetCount,
  sanitizeSets,
  parseRepRange,
  parseDurationRange,
  getProgressionAdvice,
  getExerciseInstructions,
  previousWorkingSet,
  supportsZeroWeight,
  isPerSideRepTarget,
} from '@/lib/exercise-utils';
import { getExerciseAnimationUrl, getExercisePosterUrl, slugifyExercise } from '@/lib/exercise-media';
import { resolveExerciseInterval } from '@/lib/interval-timer';
import { buildRecordBadges, formatEst1RMBadge, formatMaxLiftBadge } from '@/lib/record-labels';
import { loadRestSettings, resolveRestSeconds } from '@/lib/rest-timer';
import { IntervalTimer } from './IntervalTimer';
import { Haptics, NotificationType } from '@capacitor/haptics';
import { Capacitor } from '@capacitor/core';
import { playTimerSound, unlockTimerSound } from '@/lib/timer-sound';
import { hapticImpactLight, hapticRestEnd } from '@/lib/haptics';
import { useUnit } from '@/contexts/UnitContext';
import { useTranslation } from '@/contexts/LanguageContext';
import { localizeExerciseName, localizeExerciseInstruction } from '@/data/exercise-i18n';
import type { NextSetAdvice } from '@/lib/next-set-advice';
import type { WeeklyTarget } from '@/lib/progression-engine';
import type { TranslationKey } from '@/i18n';
import type { ExerciseBest } from '@/lib/pr-utils';
import type { RzaAdvice } from '@/lib/rza-progression';
import { FEATURE_FLAGS } from '@/lib/feature-flags';
import { useCurrentUser } from '@/contexts/UserContext';
import { trackTelemetryEvent } from '@/lib/app-telemetry';
import { reportClientError } from '@/lib/error-telemetry';
import { PinnedNoteSection, type PinnedNoteSaveInput } from '@/components/PinnedNoteSection';
import type { ExerciseNote } from '@/lib/exercise-notes';
import {
  formatDistanceM,
  formatDurationSec,
  hasCompleteSetData,
  parseDurationInput,
  resolveCompletionTracking,
  type TrackingType,
} from '@/lib/set-tracking';
import { formatDecimalInput, parseDecimalInput } from '@/lib/decimal-input';
import { PlateCalculatorSheet } from '@/components/PlateCalculatorSheet';
import { SetCountdown } from '@/components/SetCountdown';
import { createSetCountdown, resolveSetCountdownTarget, type SetCountdownRun } from '@/lib/set-countdown';

// Wibracja po ukończeniu całego ćwiczenia (sygnał „przejdź do następnego").
// Natywnie Capacitor Haptics (iOS/Android); w przeglądarce fallback do Vibration API.
async function exerciseCompleteHaptic() {
  try {
    if (Capacitor.isNativePlatform()) {
      await Haptics.notification({ type: NotificationType.Success });
    } else if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate([120, 60, 120, 60, 200]);
    }
  } catch {
    // Haptyka niedostępna — pomijamy.
  }
}

// Z129.2: jeden rozmiar chipa dla całego paska. flex-1 wyrównuje szerokości,
// zero ramek 1px — granicę robi tło (No-Line Rule, docs/DESIGN.md).
// Minimum 44 pt: kontrolki są używane jedną ręką w ruchu na siłowni.
const chipClass = 'inline-flex min-h-11 flex-1 items-center justify-center gap-1.5 rounded-xl px-3 text-xs font-semibold transition-colors';

const incompleteSetMessageKey = (tracking: TrackingType): TranslationKey => {
  switch (tracking) {
    case 'weight_reps': return 'card.incompleteSetWeightReps';
    case 'bodyweight_reps':
    case 'assisted_bodyweight': return 'card.incompleteSetReps';
    case 'duration': return 'card.incompleteSetDuration';
    case 'weight_distance_duration': return 'card.incompleteSetDistanceDuration';
  }
};

// Fala 2 (2026-08-20): dawne badge celu (Progression/NextTarget/WeeklyTarget/Rza)
// zastapil jeden TARGET BOX w karcie — kaskada i dane bez zmian (targetBox nizej).

// ── Props ──
interface ExerciseCardProps {
  exercise: Exercise;
  index: number;
  savedSets?: SetData[];
  savedNotes?: string;
  previousSets?: SetData[];
  // exerciseId w callbackach: stabilna tożsamość funkcji w rodzicu (useCallback bez
  // lambd inline per karta) — warunek działania memo() przy ticku zegara sesji (Z35).
  onSetsChange?: (exerciseId: string, sets: SetData[], notes?: string) => void;
  isEditable?: boolean;
  isBodyweight?: boolean;
  nextAdvice?: NextSetAdvice | null;
  /** Cel tygodnia z silnika progresji (Z120) — priorytet nad nextAdvice, poniżej RZA. */
  weeklyTarget?: WeeklyTarget | null;
  /** Ostatnia notatka z poprzedniej sesji tego ćwiczenia (Z74). */
  lastNote?: string;
  /** Najlepszy historyczny wynik (1RM) tego ćwiczenia — badge BEST w nagłówku. */
  historicalBest?: ExerciseBest;
  /** PR na żywo w tej sesji (Runna p.1, spec A4) — badge PR przy nazwie. */
  livePRWeight?: number | null;
  /** Metryki autoregulacji (RPE/ból/jakość) zapisane dla tego ćwiczenia. */
  metrics?: ExerciseMetrics;
  onMetricsChange?: (exerciseId: string, metrics: ExerciseMetrics) => void;
  /** Pokaż wiersz metryk domyślnie (plany sterowane RPE, np. RZA). */
  defaultMetricsVisible?: boolean;
  /** Rekomendacja ciężaru z reguły RZA (ma priorytet nad nextAdvice gdy obecna). */
  rzaAdvice?: RzaAdvice | null;
  /** Przypięta notatka per ćwiczenie (Z103) — trwała, niezależna od planu i sesji. */
  pinnedNote?: ExerciseNote;
  onPinnedNoteSave?: (exerciseName: string, input: PinnedNoteSaveInput) => Promise<void> | void;
  /** Typ śledzenia serii (Z105). Brak = dotychczasowe zachowanie (weight_reps / bodyweight_reps). */
  trackingType?: TrackingType;
  // Z129: rzadkie akcje z menu ⋯. Sygnatura z exerciseId i useCallback w rodzicu —
  // lambda inline per karta zabiłaby memo() (re-render bomba R2-07).
  onRequestSwap?: (exerciseId: string) => void;
  onSkip?: (exerciseId: string) => void;
  // Z143 (X18B): stan przerwy podniesiony do WorkoutDay — jeden timer na sesję.
  // restRun przychodzi TYLKO gdy przerwa należy do tej karty; callbacki stabilne
  // (useCallback w rodzicu), inaczej memo() padnie.
  // Fala 2 (2026-08-20): pasek renderuje WorkoutDay (sticky); restRun steruje
  // już tylko przygaszeniem ukończonej karty (Z145).
  restRun?: { deadlineAt: number; totalSeconds: number; runId: number } | null;
  onRestStart?: (exerciseId: string, seconds: number) => void;
}

// Czas jako dwa pola numeryczne z trwałym separatorem. iOS-owa klawiatura
// numeryczna nie ma dwukropka, więc pojedynczy input mm:ss blokował wpisanie 1:15.
const DurationInput = ({ valueSec, onCommit, disabled, ariaLabel, minuteLabel, secondLabel, placeholder, className }: {
  valueSec?: number;
  onCommit: (sec: number) => void;
  disabled?: boolean;
  ariaLabel: string;
  minuteLabel: string;
  secondLabel: string;
  placeholder?: string;
  className?: string;
}) => {
  const fallbackSec = parseDurationInput(placeholder ?? '') || 0;
  const currentSec = valueSec ?? fallbackSec;
  const [minutesDraft, setMinutesDraft] = useState<string | null>(null);
  const [secondsDraft, setSecondsDraft] = useState<string | null>(null);
  const minutes = Math.floor(currentSec / 60);
  const seconds = currentSec % 60;
  const commit = (nextMinutes: number, nextSeconds: number) => {
    const safeMinutes = Math.max(0, Math.min(99, Math.floor(nextMinutes || 0)));
    const safeSeconds = Math.max(0, Math.min(59, Math.floor(nextSeconds || 0)));
    onCommit(safeMinutes * 60 + safeSeconds);
  };
  return (
    <div
      role="group"
      aria-label={ariaLabel}
      className={cn('exercise-card-input flex h-12 min-w-0 items-center justify-center gap-0.5 overflow-hidden px-1', className)}
    >
      <input
        type="text"
        inputMode="numeric"
        enterKeyHint="next"
        value={minutesDraft ?? String(minutes)}
        onChange={(event) => {
          const raw = event.target.value.replace(/\D/g, '').slice(0, 2);
          setMinutesDraft(raw);
          commit(Number(raw), Number(secondsDraft ?? seconds));
        }}
        onBlur={() => setMinutesDraft(null)}
        disabled={disabled}
        aria-label={minuteLabel}
        className="h-10 min-w-0 w-[2.2ch] rounded-md bg-transparent text-right text-base font-bold tabular-nums outline-none focus-visible:ring-2 focus-visible:ring-ring"
      />
      <span aria-hidden="true" className="shrink-0 text-base font-bold tabular-nums">:</span>
      <input
        type="text"
        inputMode="numeric"
        enterKeyHint="done"
        value={secondsDraft ?? String(seconds).padStart(2, '0')}
        onChange={(event) => {
          const raw = event.target.value.replace(/\D/g, '').slice(0, 2);
          setSecondsDraft(raw);
          commit(Number(minutesDraft ?? minutes), Number(raw));
        }}
        onBlur={() => setSecondsDraft(null)}
        onKeyDown={(event) => { if (event.key === 'Enter') event.currentTarget.blur(); }}
        disabled={disabled}
        aria-label={secondLabel}
        className="h-10 min-w-0 w-[2.2ch] rounded-md bg-transparent text-left text-base font-bold tabular-nums outline-none focus-visible:ring-2 focus-visible:ring-ring"
      />
    </div>
  );
};

// Z178: pole dziesiętne przyjmujące przecinek I kropkę (wzorzec DurationInput).
// type="number" z przecinkiem = tekst, którego React nie nadpisze, a wariant
// WebKit sanituje do "" i `parseFloat||0` robił ZAPIS 0 (cicha utrata wagi).
// Draft lokalny: stan pośredni ("47,") nie commituje; wartość parsowalna
// commituje na bieżąco; puste pole = jawny onClear; blur wraca do kanonicznej
// postaci z kropką.
const DecimalInput = ({
  value,
  onCommit,
  onClear,
  disabled,
  ariaLabel,
  placeholder,
  className,
}: {
  value: number | '';
  onCommit: (n: number) => void;
  onClear?: () => void;
  disabled?: boolean;
  ariaLabel?: string;
  placeholder?: string;
  className?: string;
}) => {
  const [draft, setDraft] = useState<string | null>(null);
  return (
    <Input
      type="text"
      inputMode="decimal"
      value={draft ?? (value === '' ? '' : formatDecimalInput(value))}
      onChange={(e) => {
        const raw = e.target.value;
        setDraft(raw);
        if (raw.trim() === '') {
          onClear?.();
          return;
        }
        const parsed = parseDecimalInput(raw);
        if (parsed !== null) onCommit(parsed);
      }}
      onBlur={() => setDraft(null)}
      onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
      placeholder={placeholder}
      disabled={disabled}
      aria-label={ariaLabel}
      className={className}
    />
  );
};

// ── Main Component ──
const ExerciseCardInner = ({
  exercise,
  index,
  savedSets,
  savedNotes,
  previousSets,
  onSetsChange,
  isEditable = true,
  isBodyweight = false,
  nextAdvice,
  weeklyTarget,
  lastNote,
  historicalBest,
  livePRWeight,
  metrics,
  onMetricsChange,
  defaultMetricsVisible = false,
  rzaAdvice,
  pinnedNote,
  onPinnedNoteSave,
  trackingType,
  onRequestSwap,
  onSkip,
  restRun,
  onRestStart,
}: ExerciseCardProps) => {
  const { t, lang } = useTranslation();
  const navigate = useNavigate();
  const { uid, profile } = useCurrentUser();
  // Link do instrukcji tylko dla ćwiczeń z biblioteki (custom/nieznane nie mają strony szczegółów).
  const detailSlug = useMemo(() => {
    const slug = slugifyExercise(exercise.name);
    return slug && exerciseLibrary.some((e) => slugifyExercise(e.name) === slug) ? slug : null;
  }, [exercise.name]);
  // Timer interwałowy (EMOM/AMRAP) — tylko gdy ćwiczenie ma rozpoznany zapis interwału.
  // Z157: osobna flaga buildowa (setInterval milknie przy zgaszonym ekranie, dług Z10).
  const intervalSpec = useMemo(
    () => FEATURE_FLAGS.intervalTimers ? resolveExerciseInterval(exercise) : null,
    [exercise],
  );
  const [intervalRun, setIntervalRun] = useState<{ open: boolean; runId: number }>({ open: false, runId: 0 });
  // Kalkulator talerzy (Z107): tylko weight_reps, ciężar z aktywnej/ostatniej serii roboczej.
  const [showPlates, setShowPlates] = useState(false);
  const localizedName = localizeExerciseName(exercise.name, lang);
  const setCount = useMemo(() => parseSetCount(exercise.sets), [exercise.sets]);
  const [showVideo, setShowVideo] = useState(false);
  // Z176 → Z195: miniatura to POSTER JPEG (WebKit przy preload=metadata nie maluje
  // żadnej klatki wideo — kafle były czarne); błąd ładowania → ikona + ślad
  // w client_errors. Zero dekoderów wideo na liście treningu.
  const [thumbFailed, setThumbFailed] = useState(false);
  // Z176: dialog startuje wideo twardo (play() w onLoadedMetadata); odmowa
  // autoplay (np. Low Power Mode) → natywne controls, user ma przycisk (reguła 6).
  const [videoControls, setVideoControls] = useState(false);
  // Słaby internet / tryb samolotowy nie może zostawić czarnego modala.
  // Filmy pozostają strumieniowane, ale opis techniki jest częścią bundla.
  const [videoFailed, setVideoFailed] = useState(false);
  // Z129.2: instrukcje wyprowadzone z karty do menu ⋯ (dialog na żądanie).
  const [showInstructions, setShowInstructions] = useState(false);
  // Z191: kontrolowany stan menu ⋯ — dialog wolno otworzyć dopiero PO zamknięciu
  // modalnej warstwy menu, inaczej body zostaje z pointer-events: none.
  const [menuOpen, setMenuOpen] = useState(false);
  const selectFromMenu = (action: () => void) => (event: Event) => {
    event.preventDefault();
    setMenuOpen(false);
    requestAnimationFrame(action);
  };
  // Z129.2: pusty stan przypiętej notatki żyje w menu, nie w karcie.
  const [pinnedNoteOpen, setPinnedNoteOpen] = useState(false);
  // Z130 → Z171: REFERENCJA serii czekającej na potwierdzenie usunięcia (null = brak
  // dialogu). Indeks był kruchy: sets potrafią się podmienić (hydracja draftu) między
  // otwarciem dialogu a potwierdzeniem i USUŃ kasował złą serię.
  const [pendingRemove, setPendingRemove] = useState<SetData | null>(null);
  // Z171: serie DOTKNIĘTE w tym mount (wpisana wartość) — tylko takie i odhaczone
  // zasługują na dialog; prefill z "Dodaj serię" kasuje się bez pytania.
  const touchedSets = useRef(new WeakSet<SetData>());
  // X17C Z136 → Z143: stan przerwy przeniesiony do rodzica (jeden timer na sesję);
  // karta dostaje restRun propsem tylko, gdy przerwa należy do niej.
  const [sets, setSets] = useState<SetData[]>(() => sanitizeSets(savedSets, setCount));
  const [completionError, setCompletionError] = useState<{ setIndex: number; key: TranslationKey } | null>(null);
  // WP-C (X37): odliczanie serii na czas, jedno naraz w karcie. Stan tu (karta
  // jest właścicielem serii), SetCountdown tylko tyka i uzbraja notyfikację.
  const [countdown, setCountdown] = useState<(SetCountdownRun & { setIndex: number }) | null>(null);
  const [notes, setNotes] = useState(savedNotes || '');
  const [showNotes, setShowNotes] = useState(!!savedNotes);
  const hasMetricValue = (m?: ExerciseMetrics) => m?.rpe !== undefined || m?.pain !== undefined || m?.quality !== undefined;
  const [metricsState, setMetricsState] = useState<ExerciseMetrics>(metrics || {});
  const [showMetrics, setShowMetrics] = useState(hasMetricValue(metrics) || defaultMetricsVisible);

  const hasLocalChanges = useRef(false);
  const isInitialized = useRef(false);

  useEffect(() => {
    if (!isInitialized.current || !hasLocalChanges.current) {
      setSets(sanitizeSets(savedSets, setCount));
      setNotes(savedNotes || '');
      setShowNotes(!!savedNotes);
      setMetricsState(metrics || {});
      setShowMetrics(hasMetricValue(metrics) || defaultMetricsVisible);
      isInitialized.current = true;
      // Z171: otwarty dialog usuwania nie przeżywa podmiany sets — jego referencja
      // wskazywałaby obiekt, którego już nie ma w tablicy.
      setPendingRemove(null);
      setCompletionError(null);
    }
  }, [savedSets, savedNotes, setCount, metrics, defaultMetricsVisible]);

  // Zmiana metryki: null => pole usunięte (undefined), inaczej liczba.
  // Z178: wartość przychodzi już SPARSOWANA z DecimalInput — koniec NaN z
  // przecinka, które znikało po powrocie do ekranu.
  const handleMetricChange = (field: keyof ExerciseMetrics, value: number | null) => {
    hasLocalChanges.current = true;
    const next: ExerciseMetrics = { ...metricsState };
    if (value === null) {
      delete next[field];
    } else {
      next[field] = value;
    }
    setMetricsState(next);
    onMetricsChange?.(exercise.id, next);
  };

  // Typ śledzenia serii (Z105). Brak propa = dokładnie dotychczasowe zachowanie.
  const tracking: TrackingType = trackingType ?? (isBodyweight ? 'bodyweight_reps' : 'weight_reps');
  // Nowe typy mają WŁASNĄ gałąź renderu wiersza — ścieżka weight_reps/bodyweight_reps nietknięta.
  const isNewTrackingUi = tracking === 'duration' || tracking === 'weight_distance_duration' || tracking === 'assisted_bodyweight';

  // ── Edit a set value (no auto-completion — completion is confirmed via the checkmark) ──
  const handleSetChange = (setIndex: number, field: 'reps' | 'weight' | 'durationSec' | 'distanceM' | 'assistWeight', value: number) => {
    if (isBodyweight && field === 'weight') return;
    hasLocalChanges.current = true;
    setCompletionError((current) => current?.setIndex === setIndex ? null : current);

    const updatedSet = {
      ...sets[setIndex],
      [field]: value,
      ...(isBodyweight && { weight: 0 }),
    };

    // Z171: seria dotknięta ręcznie = realne dane (dialog przy usuwaniu).
    touchedSets.current.add(updatedSet);
    const newSets = sets.map((set, i) => (i === setIndex ? updatedSet : set));
    setSets(newSets);
    onSetsChange?.(exercise.id, newSets, notes);
  };

  // ── Toggle a set as done. Confirms the (pre-filled) value without retyping. ──
  // WP-C (X37): `override` = dane dopisywane w tym samym kroku co odhaczenie
  // (koniec odliczania: durationSec = cel). Jedna ścieżka dla ręcznego
  // i automatycznego odhaczenia: przerwa, PR-y, telemetria spójne.
  const handleToggleComplete = (setIndex: number, override?: Partial<SetData>) => {
    if (!isEditable) return;
    hasLocalChanges.current = true;

    const currentSet: SetData = { ...sets[setIndex], ...override };
    const turningOn = !currentSet.completed;

    // If confirming an empty set and we have last time's value, adopt it.
    // Indeks serii roboczej pomija rozgrzewkę po obu stronach.
    const workingIndex = sets.slice(0, setIndex).filter((set) => !set.isWarmup).length;
    // Rozgrzewka jest świadomie pustym slotem 0/0: user wpisuje ją sam.
    // Nie wolno mapować jej po indeksie na poprzednią serię, bo poprzednia
    // sesja mogła nie mieć W i wtedy skopiowalibyśmy serię roboczą.
    const prevForAdopt = turningOn && !currentSet.isWarmup
      ? previousWorkingSet(previousSets, workingIndex)
      : undefined;
    let reps = currentSet.reps;
    let weight = currentSet.weight;
    if (turningOn && reps === 0 && prevForAdopt) {
      reps = prevForAdopt.reps;
      if (!isBodyweight) weight = prevForAdopt.weight;
    }

    // Z105: adopcja pustych pól nowych typów z poprzedniej sesji przy odhaczaniu.
    const adoptedExtras = prevForAdopt
      ? {
        ...(!(currentSet.durationSec ?? 0) && prevForAdopt.durationSec !== undefined && { durationSec: prevForAdopt.durationSec }),
        ...(!(currentSet.distanceM ?? 0) && prevForAdopt.distanceM !== undefined && { distanceM: prevForAdopt.distanceM }),
        ...(!(currentSet.assistWeight ?? 0) && prevForAdopt.assistWeight !== undefined && { assistWeight: prevForAdopt.assistWeight }),
      }
      : {};

    const updatedSet: SetData = {
      ...currentSet,
      reps,
      weight: isBodyweight ? 0 : weight,
      ...adoptedExtras,
      completed: turningOn,
    };
    const completionTracking = resolveCompletionTracking(
      tracking,
      isBodyweight,
      supportsZeroWeight(exercise.name),
    );
    if (turningOn && !hasCompleteSetData(updatedSet, completionTracking)) {
      setCompletionError({ setIndex, key: incompleteSetMessageKey(completionTracking) });
      return;
    }
    // Dopiero prawidłowe ręczne odhaczenie kończy odliczanie. Błędny tap nie
    // niszczy trwającego pomiaru — user może zaczekać albo użyć Stop.
    if (countdown?.setIndex === setIndex) setCountdown(null);
    setCompletionError(null);
    // Z171: odznaczona seria dalej niesie realne dane — bez tego X po odznaczeniu
    // kasowałby ją bez pytania.
    touchedSets.current.add(updatedSet);
    const newSets = sets.map((set, i) => (i === setIndex ? updatedSet : set));
    setSets(newSets);
    onSetsChange?.(exercise.id, newSets, notes);

    // Z82: lekki impact przy każdym odhaczeniu (natywnie; web no-op).
    if (turningOn) void hapticImpactLight();
    if (turningOn && uid) trackTelemetryEvent(uid, 'action_set_checked');

    // Z187: przerwa startuje po KAŻDEJ odhaczonej serii — także rozgrzewkowej
    // (45 s z warmupSeconds; gałąź w resolveRestSeconds była martwa od X17C).
    // Rozgrzewka nie wlicza się do allDone i nie gra dźwięku "complete".
    if (turningOn && FEATURE_FLAGS.workoutTimers && !intervalSpec) {
      // Dla ćwiczeń interwałowych (EMOM/AMRAP) pomijamy — rytm prowadzi timer interwałowy.
      const workingAfter = newSets.filter(s => !s.isWarmup);
      const allDone = !currentSet.isWarmup
        && workingAfter.length > 0 && workingAfter.every(s => s.completed);
      const seconds = resolveRestSeconds(loadRestSettings(), {
        isWarmup: currentSet.isWarmup,
        exerciseKey: exercise.name,
        exerciseFinished: allDone,
      });
      unlockTimerSound();
      // Z143: decyzja i stan u rodzica (jeden timer na sesję, przejmowanie przez
      // ostatnią odhaczoną serię). Warunki startu zostają w karcie.
      onRestStart?.(exercise.id, seconds);
    }
    if (turningOn && !currentSet.isWarmup) {
      const workingAfter = newSets.filter(s => !s.isWarmup);
      const allDone = workingAfter.length > 0 && workingAfter.every(s => s.completed);
      // Sygnał ukończenia ćwiczenia: dłuższa przerwa "przejście dalej" wychodzi
      // z resolveRestSeconds powyżej, tu zostaje dźwięk + haptyka.
      if (allDone) {
        unlockTimerSound();
        exerciseCompleteHaptic();
        playTimerSound('complete');
      }
    }
  };

  // ── WP-C (X37): odliczanie serii na czas ──
  const startSetCountdown = (setIndex: number, targetSec: number) => {
    if (!isEditable || targetSec <= 0 || countdown) return;
    // Gest usera: odblokowanie audio (koniec odliczania gra jak koniec przerwy).
    unlockTimerSound();
    setCountdown({ setIndex, ...createSetCountdown(targetSec) });
  };

  // Stop w trakcie: zapis upłyniętego czasu do pola, bez odhaczenia.
  const stopSetCountdown = (elapsedSec: number) => {
    if (!countdown) return;
    setCountdown(null);
    handleSetChange(countdown.setIndex, 'durationSec', elapsedSec);
  };

  // Zero: sygnały jak koniec przerwy (chyba że JS był wstrzymany i sygnał
  // dostarczyła notyfikacja systemowa), zapis celu + odhaczenie tą samą
  // ścieżką co ręczne (przerwa startuje z handleToggleComplete).
  const finishSetCountdown = ({ late }: { late: boolean }) => {
    if (!countdown) return;
    const { setIndex, totalSeconds } = countdown;
    setCountdown(null);
    const target = sets[setIndex];
    if (!target || target.completed) return;
    if (!late) {
      void hapticRestEnd();
      // Ostatnia seria robocza gra "complete" z handleToggleComplete, więc bez
      // nakładania dwóch sygnałów naraz.
      const willBeAllDone = !target.isWarmup
        && sets.every((s, i) => s.isWarmup || s.completed || i === setIndex);
      if (!willBeAllDone) playTimerSound('finish');
    }
    handleToggleComplete(setIndex, { durationSec: totalSeconds });
  };

  const handleNotesChange = (value: string) => {
    hasLocalChanges.current = true;
    setNotes(value);
    onSetsChange?.(exercise.id, sets, value);
  };

  const handleAddSet = () => {
    hasLocalChanges.current = true;
    const lastWorking = [...sets].reverse().find(s => !s.isWarmup);
    const newSet: SetData = {
      reps: lastWorking?.reps ?? 0,
      weight: isBodyweight ? 0 : (lastWorking?.weight ?? 0),
      completed: false,
      // Z105: nowa seria dziedziczy czas/dystans/asystę z ostatniej roboczej.
      ...(lastWorking?.durationSec !== undefined && { durationSec: lastWorking.durationSec }),
      ...(lastWorking?.distanceM !== undefined && { distanceM: lastWorking.distanceM }),
      ...(lastWorking?.assistWeight !== undefined && { assistWeight: lastWorking.assistWeight }),
    };
    const newSets = [...sets, newSet];
    setSets(newSets);
    onSetsChange?.(exercise.id, newSets, notes);
  };

  // Z171: usuwanie po REFERENCJI — index potrafił wskazać złą serię po podmianie
  // sets (hydracja draftu) między otwarciem dialogu a potwierdzeniem.
  const removeSet = (target: SetData) => {
    const newSets = sets.filter((s) => s !== target);
    if (newSets.length === sets.length) {
      // Referencja nieaktualna: nic nie kasujemy (żadna "podobna" seria nie może
      // oberwać rykoszetem), ślad do client_errors zamiast cichego no-opa.
      void reportClientError(uid ?? '', { code: 'remove-set-stale-ref', phase: 'other', detail: exercise.id });
      setPendingRemove(null);
      return;
    }
    hasLocalChanges.current = true;
    // WP-C: indeksy serii się przesuwają, biegnące odliczanie traci adresata.
    if (countdown) setCountdown(null);
    setSets(newSets);
    onSetsChange?.(exercise.id, newSets, notes);
  };

  // Z130 → Z171: dialog TYLKO dla realnych danych — seria odhaczona albo dotknięta
  // w tej sesji. Prefill z "Dodaj serię" (kopia reps/weight ostatniej) kasuje się
  // bez pytania: user nic w niej nie wpisał, nie ma czego stracić.
  const setHasData = (set?: SetData): boolean => Boolean(
    set && (set.completed === true || touchedSets.current.has(set)),
  );

  const handleRemoveSet = (set: SetData) => {
    if (setHasData(set)) {
      setPendingRemove(set);
      return;
    }
    removeSet(set);
  };

  // X17B Z133.2: waga policzona w kalkulatorze wraca do AKTYWNEJ serii roboczej.
  // Bez tego arkusz był ślepą uliczką: user liczył, zamykał i przepisywał ręcznie.
  const handleApplyPlateWeight = (_exerciseId: string, weight: number) => {
    const targetIndex = activeSetIndex >= 0
      ? activeSetIndex
      : sets.findIndex((s) => !s.isWarmup);
    if (targetIndex < 0) return;
    handleSetChange(targetIndex, 'weight', weight);
  };

  // Rozgrzewka w karcie jest intencjonalnym, pustym slotem. Nie zgaduje ciężaru
  // ani liczby serii na podstawie roboczych: user wpisuje 0/0 po swojemu, a stare
  // serie robocze pozostają dokładnie bez zmian.
  const handleGenerateWarmup = () => {
    const warmupRow: SetData = { reps: 0, weight: 0, completed: false, isWarmup: true };
    hasLocalChanges.current = true;
    const newSets = [warmupRow, ...sets.filter((s) => !s.isWarmup)];
    setSets(newSets);
    onSetsChange?.(exercise.id, newSets, notes);
  };

  // ── Computed ──
  const warmupSets = sets.filter(s => s.isWarmup);
  const workingSets = sets.filter(s => !s.isWarmup);
  const completedSets = workingSets.filter(s => s.completed).length;
  const atSetLimit = workingSets.length >= 10;
  const hasPinnedNote = Boolean(pinnedNote?.note || pinnedNote?.machineSettings);
  const allCompleted = workingSets.length > 0 && completedSets === workingSets.length;
  const animationUrl = getExerciseAnimationUrl(exercise.name);
  const posterUrl = getExercisePosterUrl(exercise.name);
  const { unit, fmt, toDisplay, fromInput } = useUnit();

  // Indeks pierwszej nieukończonej serii roboczej (podświetlana jako aktywna — mockup [17]).
  const activeSetIndex = sets.findIndex((s) => !s.isWarmup && !s.completed);

  // Naprawa r1 (2026-08-21): ćwiczenie bez żadnej historii — komunikat
  // "pierwszy raz" raz nad tabelą, komórki POPRZ. pokazują "—".
  const isFirstTime = !previousSets || previousSets.filter((s) => !s.isWarmup).length === 0;

  // Docelowe powtórzenia z planu (np. "3 x 8-12" → placeholder "8-12").
  const repsPlaceholder = useMemo(() => {
    const range = parseRepRange(exercise.sets);
    if (!range) return '-';
    const { min, max } = range;
    return min === max ? String(min) : `${min}-${max}`;
  }, [exercise.sets]);
  const zeroWeightAllowed = !isBodyweight && tracking === 'weight_reps' && supportsZeroWeight(exercise.name);
  const perSideTarget = isPerSideRepTarget(exercise.sets);

  // WP-C (X37): sekundy z zapisu planu ("3 x 45s" → 45) jako fallback celu odliczania.
  const planDurationSec = useMemo(() => parseDurationRange(exercise.sets)?.min ?? null, [exercise.sets]);

  const progressionAdvice = useMemo(() => {
    if (!previousSets) return null;
    const repRange = parseRepRange(exercise.sets);
    const prevWorking = previousSets.filter(s => !s.isWarmup);
    return getProgressionAdvice(repRange, prevWorking, index - 1, exercise.isSuperset, isBodyweight, lang, unit);
  }, [previousSets, exercise.sets, index, exercise.isSuperset, isBodyweight, lang, unit]);

  // Fala 2 (2026-08-20, mockup 2a): kaskada celu w JEDNYM target boxie zamiast
  // rzędu badge. Priorytety i dane identyczne jak dawny łańcuch badge'ów:
  // RZA > cel tygodnia (Z120, kind !== 'start') > cel z trendu > progresja.
  // X38 WP-A: cały wiersz (ikona, etykieta, wartość) w JEDNYM kolorze wg tonu:
  // progress/maintain/repeat = primary, deload = warning, pain = destructive;
  // tło zawsze z przezroczystością /10 (CLAUDE.md #8).
  type TargetTone = 'primary' | 'warning' | 'destructive';
  const targetBox = ((): { label: string; tone: TargetTone; value: string; reason?: string } | null => {
    const disp = (kg: number) => `${Math.round(toDisplay(kg) * 10) / 10} ${unit}`;
    if (rzaAdvice) {
      const labels: Record<RzaAdvice['decision'], string> = {
        progress: t('card.rzaProgress'), deload: t('card.rzaDeload'), repeat: t('card.rzaRepeat'),
      };
      return {
        label: labels[rzaAdvice.decision],
        tone: rzaAdvice.decision === 'deload' ? 'warning' : 'primary',
        value: disp(rzaAdvice.nextKg),
        reason: t('card.rzaReason', { last: disp(rzaAdvice.lastKg) }),
      };
    }
    if (weeklyTarget && weeklyTarget.kind !== 'start') {
      const labels: Record<WeeklyTarget['kind'], string> = {
        start: t('card.weekTarget'), progress: t('card.weekTarget'), hold: t('card.weekTarget'),
        deload: t('card.deload'), pain: t('card.weekPain'), 'deload-week': t('card.weekDeload'),
      };
      const tones: Partial<Record<WeeklyTarget['kind'], TargetTone>> = {
        deload: 'warning', pain: 'destructive',
      };
      const head = weeklyTarget.targetSets != null && weeklyTarget.targetReps != null
        ? `${weeklyTarget.targetSets}×${weeklyTarget.targetReps}`
        : weeklyTarget.targetReps != null ? `×${weeklyTarget.targetReps}` : '';
      const value = [
        head,
        weeklyTarget.targetWeight != null && weeklyTarget.targetWeight > 0 ? disp(weeklyTarget.targetWeight) : null,
        weeklyTarget.targetDurationSec != null ? formatDurationSec(weeklyTarget.targetDurationSec) : null,
      ].filter(Boolean).join(' · ');
      // Jak dawny WeeklyTargetBadge: pusta wartość = brak elementu (bez fallbacku niżej).
      if (!value) return null;
      return {
        label: labels[weeklyTarget.kind],
        tone: tones[weeklyTarget.kind] ?? 'primary',
        value,
        reason: t(weeklyTarget.reasonKey as TranslationKey),
      };
    }
    if (nextAdvice) {
      return {
        label: nextAdvice.kind === 'deload' ? t('card.deload') : t('card.target'),
        tone: nextAdvice.kind === 'deload' ? 'warning' : 'primary',
        value: nextAdvice.isBodyweight
          ? t('card.repsValue', { n: nextAdvice.targetReps })
          : `${disp(nextAdvice.targetWeight)} × ${nextAdvice.targetReps}`,
        reason: nextAdvice.reason,
      };
    }
    if (progressionAdvice) {
      return { label: t('card.target'), tone: 'primary', value: progressionAdvice.label };
    }
    return null;
  })();
  const targetToneClass: Record<TargetTone, string> = {
    primary: 'bg-primary/10 text-primary',
    warning: 'bg-fitness-warning/10 text-fitness-warning',
    destructive: 'bg-destructive/10 text-destructive',
  };

  // Hint kolumny POPRZ. dla N-tej serii ROBOCZEJ (workingIndex), nie globalnej —
  // inaczej różna liczba rozgrzewek między sesjami rozjeżdża wartości.
  const getPreviousHint = (workingIndex: number): string | null => {
    const prevSet = previousWorkingSet(previousSets, workingIndex);
    if (!prevSet || (prevSet.weight === 0 && prevSet.reps === 0)) return null;
    if (isBodyweight) return t('card.repsValue', { n: prevSet.reps });
    // Z130: format „60×6" (ciężar × powtórzenia) — tak zapisuje się serię na
    // kartce i tak czytają to Hevy/Strong. Wcześniej było odwrotnie („6×60kg").
    return `${fmt(prevSet.weight, { withUnit: false })}×${prevSet.reps}`;
  };

  // Grid: SET | PREVIOUS | [KG] | REPS | ✓ | × (mockup [17])
  // Z105: nowe typy mają własny układ kolumn (duration: czas; wdd: kg+dystans+czas bez PREV;
  // assisted: asysta+powt.). Stare typy — układ nietknięty.
  // Z170: ostatnia kolumna 44px — X ma pełny tap target 44px (h-11 w-11),
  // węższa kolumna kładła go NA checkmarku i tap w ✓ potrafił trafić w usuwanie.
  // KG ma jawne minimum 56 px: na iPhonie wartości 31.5/122.5 pozostają czytelne,
  // a elastyczna kolumna POPRZ. oddaje miejsce jako pierwsza. POWT. zachowuje
  // minimum 44 px na zakresy planu. Nagłówek i wiersze używają tego samego gridu.
  // WP-C (X37): duration dostaje kolumnę 44px na przycisk odliczania obok pola
  // czasu; POPRZ. węższe (0.8fr), pole czasu szersze (1.2fr): na 393 px zostaje
  // ~44/67 px, "1:30" bold 16px mieści się bez przewijania. wdd (3 pola liczbowe)
  // nie ma miejsca na kolejną kolumnę: odliczanie idzie w pasku pod aktywną serią.
  const gridCols = tracking === 'duration'
    ? 'grid-cols-[26px_minmax(0,0.8fr)_minmax(0,1.2fr)_44px_44px_44px]'
    : tracking === 'weight_distance_duration'
      ? 'grid-cols-[26px_1.1fr_1.1fr_0.8fr_44px_44px]'
      : tracking === 'assisted_bodyweight'
        ? 'grid-cols-[26px_minmax(0,0.9fr)_1.1fr_1fr_44px_44px]'
        : isBodyweight
          ? 'grid-cols-[26px_minmax(0,1fr)_1fr_44px_44px]'
          : 'grid-cols-[24px_minmax(28px,1fr)_minmax(56px,1.1fr)_minmax(44px,1fr)_44px_44px]';

  // Hint POPRZ. dla nowych typów (Z105): czas dla duration, powt.×(-asysta) dla assisted.
  const getTrackedPreviousHint = (workingIndex: number): string | null => {
    const prevSet = previousWorkingSet(previousSets, workingIndex);
    if (!prevSet) return null;
    if (tracking === 'duration') return formatDurationSec(prevSet.durationSec) || null;
    if (tracking === 'assisted_bodyweight') {
      if (!prevSet.reps && !(prevSet.assistWeight ?? 0)) return null;
      return `${prevSet.reps}×-${fmt(prevSet.assistWeight ?? 0, { withUnit: false })}${unit}`;
    }
    return null;
  };

  // WP-C (X37): cel odliczania serii czasowej. Kaskada: wartość w polu > cel
  // tygodnia (silnik progresji) > ostatni wynik tej serii roboczej > sekundy
  // z planu > poziom z onboardingu (30/45/60 s). Cel jest też placeholderem pola.
  const countdownTargetFor = (set: SetData, workingIndex: number): number => resolveSetCountdownTarget({
    valueSec: set.durationSec,
    weeklyTargetSec: weeklyTarget?.targetDurationSec,
    previousSec: workingIndex >= 0 ? previousWorkingSet(previousSets, workingIndex)?.durationSec : undefined,
    planSec: planDurationSec,
    level: profile?.trainingProfile?.level,
  });

  // Wiersz serii dla nowych typów śledzenia (Z105) — osobna gałąź, ścieżka
  // weight_reps/bodyweight_reps renderuje się dokładnie jak dotąd.
  const renderTrackedSetRow = (set: SetData, globalIndex: number, label: React.ReactNode, isWarmupRow: boolean, workingIndex = -1) => {
    const isActive = !isWarmupRow && globalIndex === activeSetIndex;
    // Z128.1: złoto rozgrzewki było tylko na starej ścieżce — teraz na obu.
    // Naprawa r2 (2026-08-21, sędzia struktury): obrys akcentowy aktywnej serii
    // siedzi na INPUTACH (mockup exercise-card-full), nie na całym wierszu.
    const warmupInputClass = isWarmupRow ? '!border-[hsl(var(--ec-warmup-gold-border))]' : undefined;
    const activeInputClass = isActive ? 'accent-ring' : undefined;
    // setAria (nie colSet): aria-labels "Set 1, kg" to kontrakt e2e, a widoczny
    // nagłówek kolumny jest po polsku ("Ser.") — naprawa r2 (2026-08-21).
    const setLabel = isWarmupRow ? `${t('comp.warmup.title')} ${label}` : `${t('card.setAria')} ${label}`;
    const prevHint = !isWarmupRow ? getTrackedPreviousHint(workingIndex) : null;
    const displayWeight = set.weight
      ? (unit === 'lbs' ? Number(toDisplay(set.weight).toFixed(1)) : set.weight)
      : '';
    const displayAssist = (set.assistWeight ?? 0) > 0
      ? (unit === 'lbs' ? Number(toDisplay(set.assistWeight!).toFixed(1)) : set.assistWeight!)
      : '';

    return (
      <div
        key={globalIndex}
        // WP-E (X37): cel spotlightu toura pierwszego treningu (tylko aktywna seria).
        data-tour={isActive ? 'set-inputs' : undefined}
        className={cn(
          'grid items-center gap-2 rounded-xl px-2 py-1.5 transition-colors',
          gridCols,
          // Z128.1: ukończona seria = wypełnione tło (widoczne z odległości ręki),
          // aktywna = tint tła + obrys na inputach. Wykluczają się: aktywna to
          // pierwsza NIEukończona.
          set.completed ? 'bg-primary/[0.06]' : isActive && 'bg-primary/[0.08]',
          // WP-D (X37): aktywna seria = wyróżnienie CAŁEGO wiersza (obrys), nie sam
          // ring na inputach. X38 WP-A: bez lewego paska akcentu.
          isActive && 'ring-1 ring-primary/70',
        )}
      >
        <span className={cn(
          'select-none text-center text-sm font-extrabold',
          isWarmupRow
            ? 'text-[11px] tracking-wide text-[hsl(var(--ec-warmup-gold))]'
            : isActive ? 'text-primary' : 'text-[hsl(var(--ec-set-number))]',
        )}>
          {label}
        </span>

        {/* PREV — nie renderowana dla weight_distance_duration (brak miejsca na 3 inputy).
            Naprawa r1 (2026-08-21): brak historii = "—" w komórce (ucinane
            "pierws..." w każdym wierszu wyglądało jak błąd renderowania);
            informacja "pierwszy raz" idzie raz, nad tabelą. */}
        {tracking !== 'weight_distance_duration' && (
          <span className="truncate text-center text-xs tabular-nums text-muted-foreground">
            {isWarmupRow ? '-' : (prevHint || '-')}
          </span>
        )}

        {tracking === 'weight_distance_duration' && (
          <DecimalInput
            value={displayWeight}
            onCommit={(n) => handleSetChange(globalIndex, 'weight', fromInput(n))}
            onClear={() => handleSetChange(globalIndex, 'weight', 0)}
            placeholder={unit}
            disabled={!isEditable}
            ariaLabel={`${localizedName}, ${setLabel}, ${unit}`}
            className={cn('exercise-card-input h-12 px-1 text-base font-bold focus-visible:ring-0 focus-visible:ring-offset-0', warmupInputClass, activeInputClass)}
          />
        )}

        {/* Bug 6 (X30): dystans przez DecimalInput jak waga wyżej — type="number"
            + parseFloat||0 robiło z "20,5" cichy zapis 0 m (ta sama klasa co Z178).
            Dystans kanonicznie w metrach — commit bez fromInput. */}
        {tracking === 'weight_distance_duration' && (
          <DecimalInput
            value={set.distanceM || ''}
            onCommit={(n) => handleSetChange(globalIndex, 'distanceM', n)}
            onClear={() => handleSetChange(globalIndex, 'distanceM', 0)}
            placeholder="m"
            disabled={!isEditable}
            ariaLabel={`${localizedName}, ${setLabel}, ${t('card.colDistance')}`}
            className={cn('exercise-card-input h-12 px-1 text-base font-bold focus-visible:ring-0 focus-visible:ring-offset-0', warmupInputClass, activeInputClass)}
          />
        )}

        {tracking === 'assisted_bodyweight' && (
          <DecimalInput
            value={displayAssist}
            onCommit={(n) => handleSetChange(globalIndex, 'assistWeight', fromInput(n))}
            onClear={() => handleSetChange(globalIndex, 'assistWeight', 0)}
            placeholder={`-${unit}`}
            disabled={!isEditable}
            ariaLabel={`${localizedName}, ${setLabel}, ${t('card.colAssist')}`}
            className={cn('exercise-card-input h-12 px-1 text-base font-bold focus-visible:ring-0 focus-visible:ring-offset-0', warmupInputClass, activeInputClass)}
          />
        )}

        {tracking === 'assisted_bodyweight' && (
          <Input
            type="number"
            inputMode="numeric"
            min={0}
            value={set.reps || ''}
            onChange={(e) => handleSetChange(globalIndex, 'reps', parseInt(e.target.value) || 0)}
            placeholder={isWarmupRow ? '-' : repsPlaceholder}
            disabled={!isEditable}
            aria-label={`${localizedName}, ${setLabel}, ${t('card.colReps')}`}
            className={cn('exercise-card-input h-12 px-1 text-base font-bold placeholder:text-[13px] focus-visible:ring-0 focus-visible:ring-offset-0', warmupInputClass, activeInputClass)}
          />
        )}

        {(tracking === 'duration' || tracking === 'weight_distance_duration') && (() => {
          // WP-C (X37): placeholder pola = cel odliczania. Dla duration obok pola
          // stoi przycisk odliczania (44 px); w trakcie biegu SetCountdown pokazuje
          // licznik zamiast pola. wdd: samo pole (odliczanie w pasku pod wierszem).
          const targetSec = countdownTargetFor(set, workingIndex);
          const durationInput = (
            <DurationInput
              valueSec={set.durationSec}
              onCommit={(sec) => handleSetChange(globalIndex, 'durationSec', sec)}
              disabled={!isEditable}
              ariaLabel={`${localizedName}, ${setLabel}, ${t('card.colDuration')}`}
              minuteLabel={t('card.minutes')}
              secondLabel={t('card.seconds')}
              placeholder={formatDurationSec(targetSec)}
              className={cn(warmupInputClass, activeInputClass)}
            />
          );
          if (tracking !== 'duration') return durationInput;
          return (
            <SetCountdown
              run={countdown?.setIndex === globalIndex ? countdown : null}
              targetSec={targetSec}
              disabled={!isEditable || set.completed || countdown !== null}
              setLabel={setLabel}
              exerciseLabel={localizedName}
              onStart={() => startSetCountdown(globalIndex, targetSec)}
              onStop={stopSetCountdown}
              onFinished={finishSetCountdown}
            >
              {durationInput}
            </SetCountdown>
          );
        })()}

        <div className="flex justify-center">
          <button
            onClick={() => handleToggleComplete(globalIndex)}
            disabled={!isEditable}
            data-tour={isActive ? 'set-check' : undefined}
            aria-label={set.completed ? t('card.uncheckSet') : isActive ? `${t('card.checkSet')} ${t('card.activeSetSuffix')}` : t('card.checkSet')}
            className={cn(
              'flex h-11 w-11 items-center justify-center rounded-lg transition-colors disabled:opacity-40',
              set.completed
                ? 'bg-primary text-primary-foreground'
                : 'bg-surface-low text-muted-foreground/40 hover:text-primary',
              // WP-D (X37): checkmark aktywnej serii z obrysem akcentu.
              isActive && 'ring-1 ring-primary',
            )}
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
              <path d="M3 8.5l3.5 3.5 6.5-7" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>

        <div className="flex justify-center">
          {isEditable ? (
            <button
              onClick={() => handleRemoveSet(set)}
              aria-label={t('card.removeSet')}
              className="flex h-11 w-11 items-center justify-center text-lg leading-none text-[hsl(var(--ec-delete))] hover:text-destructive"
            >
              &times;
            </button>
          ) : (
            <span className="w-6" />
          )}
        </div>
      </div>
    );
  };

  // ── Render set row ──
  const renderSetRow = (set: SetData, globalIndex: number, label: React.ReactNode, isWarmupRow: boolean, workingIndex = -1) => {
    if (isNewTrackingUi) {
      const row = renderTrackedSetRow(set, globalIndex, label, isWarmupRow, workingIndex);
      if (tracking !== 'weight_distance_duration') return row;
      // WP-C (X37): wdd ma trzy pola liczbowe i na 393 px nie zmieści kolumny
      // 44 px: odliczanie jako pasek pełnej szerokości pod AKTYWNĄ serią roboczą
      // (albo pod tą, która właśnie biegnie). Wiersz zawsze we Fragmencie, żeby
      // pojawienie się paska nie remountowało pól.
      const running = countdown?.setIndex === globalIndex;
      const showStrip = countdown
        ? running
        : isEditable && !isWarmupRow && !set.completed && globalIndex === activeSetIndex;
      const targetSec = showStrip ? countdownTargetFor(set, workingIndex) : 0;
      return (
        <Fragment key={globalIndex}>
          {row}
          {showStrip && (
            <SetCountdown
              variant="strip"
              run={running ? countdown : null}
              targetSec={targetSec}
              disabled={!isEditable || countdown !== null}
              setLabel={`${t('card.setAria')} ${label}`}
              exerciseLabel={localizedName}
              onStart={() => startSetCountdown(globalIndex, targetSec)}
              onStop={stopSetCountdown}
              onFinished={finishSetCountdown}
            />
          )}
        </Fragment>
      );
    }
    const prevHint = !isWarmupRow ? getPreviousHint(workingIndex) : null;
    const isActive = !isWarmupRow && globalIndex === activeSetIndex;
    // Naprawa r2 (2026-08-21): obrys akcentowy na inputach KG/POWT., nie na wierszu.
    const activeInputClass = isActive ? 'accent-ring' : undefined;
    const displayWeight = set.weight
      ? (unit === 'lbs' ? Number(toDisplay(set.weight).toFixed(1)) : set.weight)
      : '';
    // setAria (nie colSet): aria-labels "Set 1, kg" to kontrakt e2e, a widoczny
    // nagłówek kolumny jest po polsku ("Ser.") — naprawa r2 (2026-08-21).
    const setLabel = isWarmupRow ? `${t('comp.warmup.title')} ${label}` : `${t('card.setAria')} ${label}`;

    return (
      <div
        key={globalIndex}
        // WP-E (X37): cel spotlightu toura pierwszego treningu (tylko aktywna seria).
        data-tour={isActive ? 'set-inputs' : undefined}
        className={cn(
          'grid items-center gap-2 rounded-xl px-2 py-1.5 transition-colors',
          gridCols,
          // Z128.1: patrz renderTrackedSetRow — ta sama reguła tła na obu ścieżkach.
          set.completed ? 'bg-primary/[0.06]' : isActive && 'bg-primary/[0.08]',
          // WP-D (X37): wyróżnienie całego aktywnego wiersza, jak w renderTrackedSetRow.
          isActive && 'ring-1 ring-primary/70',
        )}
      >
        {/* SET */}
        <span className={cn(
          'select-none text-center text-sm font-extrabold',
          isWarmupRow
            ? 'text-[11px] tracking-wide text-[hsl(var(--ec-warmup-gold))]'
            : isActive ? 'text-primary' : 'text-[hsl(var(--ec-set-number))]',
        )}>
          {label}
        </span>

        {/* PREVIOUS — naprawa r1 (2026-08-21): brak historii = "—" w komórce
            (ucinane "pierws..." per wiersz wyglądało jak błąd renderowania);
            komunikat "pierwszy raz" z Z130 przenosi się raz, nad tabelę. */}
        <span className="truncate text-center text-xs tabular-nums text-muted-foreground">
          {isWarmupRow ? '-' : (prevHint || '-')}
        </span>

        {/* KG (non-bodyweight) */}
        {!isBodyweight && (
          <DecimalInput
            value={displayWeight}
            onCommit={(n) => handleSetChange(globalIndex, 'weight', fromInput(n))}
            onClear={() => handleSetChange(globalIndex, 'weight', 0)}
            placeholder="0"
            disabled={!isEditable}
            ariaLabel={`${localizedName}, ${setLabel}, ${unit}`}
            className={cn(
              'exercise-card-input h-12 min-w-0 px-1 text-base font-bold tracking-[-0.02em] focus-visible:ring-0 focus-visible:ring-offset-0',
              isWarmupRow && '!border-[hsl(var(--ec-warmup-gold-border))]',
              activeInputClass,
            )}
          />
        )}

        {/* REPS */}
        <Input
          type="number"
          inputMode="numeric"
          min={0}
          value={set.reps || ''}
          onChange={(e) => handleSetChange(globalIndex, 'reps', parseInt(e.target.value) || 0)}
          placeholder={isWarmupRow ? '0' : repsPlaceholder}
          disabled={!isEditable}
          aria-label={`${localizedName}, ${setLabel}, ${t('card.colReps')}`}
          className={cn(
            // Naprawa r1 (2026-08-21): placeholder zakresu ("6-8") mniejszym
            // stopniem — 16px bold klipowało górny kres na 390px.
            'exercise-card-input h-12 min-w-0 px-1 text-base font-bold placeholder:text-[13px] focus-visible:ring-0 focus-visible:ring-offset-0',
            isWarmupRow && '!border-[hsl(var(--ec-warmup-gold-border))]',
            activeInputClass,
          )}
        />

        {/* Done checkmark */}
        <div className="flex justify-center">
          <button
            onClick={() => handleToggleComplete(globalIndex)}
            disabled={!isEditable}
            data-tour={isActive ? 'set-check' : undefined}
            aria-label={set.completed ? t('card.uncheckSet') : isActive ? `${t('card.checkSet')} ${t('card.activeSetSuffix')}` : t('card.checkSet')}
            className={cn(
              'flex h-11 w-11 items-center justify-center rounded-lg transition-colors disabled:opacity-40',
              set.completed
                ? 'bg-primary text-primary-foreground'
                : 'bg-surface-low text-muted-foreground/40 hover:text-primary',
              // WP-D (X37): checkmark aktywnej serii z obrysem akcentu.
              isActive && 'ring-1 ring-primary',
            )}
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
              <path d="M3 8.5l3.5 3.5 6.5-7" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>

        {/* Delete */}
        <div className="flex justify-center">
          {isEditable ? (
            <button
              onClick={() => handleRemoveSet(set)}
              aria-label={t('card.removeSet')}
              className="flex h-11 w-11 items-center justify-center text-lg leading-none text-[hsl(var(--ec-delete))] hover:text-destructive"
            >
              &times;
            </button>
          ) : (
            <span className="w-6" />
          )}
        </div>
      </div>
    );
  };

  // Z145: przygaszenie ukończonej karty dopiero, gdy przerwa się skończy albo
  // zostanie pominięta — opacity rodzica jest multiplikatywne i wyszarzało pasek
  // przerwy dokładnie wtedy, gdy był najbardziej potrzebny (przejście do
  // następnego ćwiczenia).
  const restActive = !!restRun && restRun.runId > 0;

  return (
    <div className={cn(
      "exercise-card",
      exercise.isSuperset && "bg-primary/[0.04]",
      allCompleted && !restActive && "opacity-50"
    )}>
      {/* ── Header ── */}
      <div className="flex items-center justify-between gap-3 p-3 pr-4 exercise-card-header">
        <div className="flex items-center gap-3 min-w-0">
          {/* Z128.2: miniatura tylko gdy JEST animacja. Pusty kwadrat 92×72 z ikoną
              hantla zabierał szerokość tytułowi, nie niosąc żadnej informacji. */}
          {animationUrl && (
            <button
              type="button"
              onClick={() => {
                // Z191: tap w miniaturę przy otwartym menu NAJPIERW zamyka menu —
                // dialog wideo nie może wjechać pod modalną warstwę menu.
                if (menuOpen) {
                  setMenuOpen(false);
                  requestAnimationFrame(() => {
                    setVideoFailed(false);
                    setShowVideo(true);
                  });
                } else {
                  setVideoFailed(false);
                  setShowVideo(true);
                }
              }}
              // Fala 2 (2026-08-20, mockup 2a): zwarta miniatura 46px z centralnym play.
              // Naprawa r2 (2026-08-21): rounded-lg (12px) — rounded-xl to w tej skali
              // 24px, co przy 46px robiło kolo zamiast kwadratu z mockupu (tokens.md 2.6).
              className="relative h-[46px] w-[46px] rounded-lg overflow-hidden shrink-0 bg-background/70"
              aria-label={t('card.showAnimation', { name: localizedName })}
            >
              {/* Z195: miniatura = poster JPEG z CDN, NIE <video> — WebKit przy
                  preload=metadata nie maluje żadnej klatki (czarne kafle z builda 81);
                  zero dekoderów wideo na liście. Wideo gra dopiero w dialogu. */}
              {thumbFailed || !posterUrl ? (
                <span className="flex h-full w-full items-center justify-center">
                  <Dumbbell className="h-5 w-5 text-muted-foreground/50" />
                </span>
              ) : (
                <img
                  src={posterUrl}
                  alt=""
                  loading="lazy"
                  decoding="async"
                  className="h-full w-full object-cover"
                  onError={() => {
                    setThumbFailed(true);
                    void reportClientError(uid ?? '', {
                      code: 'exercise-poster-error',
                      phase: 'other',
                      detail: exercise.name,
                    });
                  }}
                />
              )}
              {/* Poster jest jaśniejszy niż wideo — lżejsze przyciemnienie, play i tak
                  siedzi na plakietce bg-black/55. */}
              <span className="absolute inset-0 flex items-center justify-center bg-black/15">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-black/55 text-white">
                  <Play className="h-3 w-3 fill-current" />
                </span>
              </span>
            </button>
          )}

          <div className="min-w-0">
            <h2 className="break-words font-heading text-lg font-bold leading-tight">{localizedName}</h2>
            {/* Fala 2 (2026-08-20, mockup 2a): jedna mono linia metadanych.
                B-T2 bez zmian: estymacja zawsze z widocznym źródłem (formatEst1RMBadge). */}
            <p className="mt-1 font-mono text-[11px] uppercase leading-snug tracking-[0.06em] text-muted-foreground" title={t('card.maxLiftTitle')}>
              {(() => {
                const badges = buildRecordBadges(historicalBest);
                // Naprawa r3 (2026-08-21, sędzia struktury): jednostka wagi RAZ,
                // przy pierwszej wartości ("3 SERII · 1RM 79 KG · 63×8 · MAX 63") —
                // powtarzana przy każdej liczbie łamała mono linię na dwie
                // z zawinięciem w środku członu ("63 / KG×8") na 390 px.
                // Iteracja 3 pętli wizualnej: zwarty stopień mono 11px mieści
                // standardowy przypadek w JEDNEJ linii, a NBSP
                // wewnątrz członów gwarantuje, że dłuższe dane łamią się wyłącznie
                // na separatorach między członami, nigdy w środku członu.
                // B-T2 bez zmian: źródło estymacji nadal widoczne (formatEst1RMBadge).
                let unitShown = false;
                const fmtWeight = (kg: number) => {
                  const value = Math.round(toDisplay(kg));
                  if (unitShown) return String(value);
                  unitShown = true;
                  return `${value} ${unit}`;
                };
                return [
                  t('card.setsCount', { n: workingSets.length }),
                  badges.est1RM ? formatEst1RMBadge(badges.est1RM, t('card.est1rm'), fmtWeight) : null,
                  badges.maxLift ? formatMaxLiftBadge(badges.maxLift, t('card.maxLift'), fmtWeight) : null,
                ].filter((segment): segment is string => Boolean(segment))
                  .map((segment) => segment.replace(/ /g, '\u00A0'))
                  .join(' · ');
              })()}
            </p>
            {(livePRWeight != null || (FEATURE_FLAGS.intervalTimers && intervalSpec)) && (
              <div className="mt-1.5 flex flex-wrap items-center gap-2">
                {livePRWeight != null && (
                  <span
                    data-testid="live-pr-badge"
                    className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wide border border-fitness-success bg-fitness-success/10 text-fitness-success"
                  >
                    <Trophy className="h-3 w-3" aria-hidden /> PR {Math.round(toDisplay(livePRWeight))} {unit}
                  </span>
                )}
                {FEATURE_FLAGS.intervalTimers && intervalSpec && (
                  <button
                    onClick={() => setIntervalRun(r => ({ open: true, runId: r.runId + 1 }))}
                    className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wide border border-primary/30 text-primary bg-primary/10 hover:bg-primary/20 transition-colors"
                  >
                    <Timer className="h-3 w-3" />
                    {intervalSpec.label}
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Z129.2: rzadkie akcje ćwiczenia w jednym menu, zamiast ikon rozsianych
            po nagłówku, pasku chipów i przyciskach pod kartą. */}
        {/* Z191: menu jest MODALNE (Radix zdejmuje pointer-events z body na czas
            życia warstwy, także przez animację zamykania). Dialog otwarty w tym
            samym ticku lądował POD tą blokadą: X i overlay martwe, na iOS bez
            Escape dialog był niezamykalny NICZYM (force-quit z realnego treningu).
            Dlatego każda pozycja NAJPIERW zamyka menu (kontrolowany open), a akcję
            odpala w następnej klatce (requestAnimationFrame). */}
        <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              aria-label={t('card.moreActions')}
              className="-mr-2 grid h-11 w-11 shrink-0 place-items-center self-start rounded-lg text-muted-foreground/70 transition-colors hover:text-foreground"
            >
              <MoreHorizontal className="h-5 w-5" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuItem onSelect={selectFromMenu(() => setShowInstructions(true))} className="cursor-pointer">
              <Info className="h-4 w-4 mr-2" />
              {t('card.instructions')}
            </DropdownMenuItem>
            {onRequestSwap && (
              <DropdownMenuItem onSelect={selectFromMenu(() => onRequestSwap(exercise.id))} className="cursor-pointer">
                <ArrowRightLeft className="h-4 w-4 mr-2" />
                {t('card.swapExercise')}
              </DropdownMenuItem>
            )}
            {onSkip && (
              <DropdownMenuItem onSelect={selectFromMenu(() => onSkip(exercise.id))} className="cursor-pointer">
                <SkipForward className="h-4 w-4 mr-2" />
                {t('workout.skip')}
              </DropdownMenuItem>
            )}
            {isEditable && (
              <DropdownMenuItem onSelect={selectFromMenu(() => setShowNotes(v => !v))} className="cursor-pointer">
                <StickyNote className="h-4 w-4 mr-2" />
                {t('card.note')}
              </DropdownMenuItem>
            )}
            {isEditable && onPinnedNoteSave && (
              <DropdownMenuItem onSelect={selectFromMenu(() => setPinnedNoteOpen(true))} className="cursor-pointer">
                <Pin className="h-4 w-4 mr-2" />
                {t('notes.pinnedAdd')}
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* ── Fala 2 (2026-08-20): TARGET BOX (kaskada celu) + ostatnia notatka
          z poprzedniej sesji. Uzasadnienie celu tylko przed pierwszą odhaczoną
          serią (jak dawny blok metadanych w nagłówku). ── */}
      {(targetBox || lastNote) && (
        <div className="space-y-2 px-4 pt-3.5 sm:px-5">
          {targetBox && (
            <div
              data-testid="exercise-card-target"
              className={cn('flex items-start gap-2.5 rounded-xl px-3 py-2.5', targetToneClass[targetBox.tone])}
            >
              <Target className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
              <div className="min-w-0">
                <p className="font-heading text-[15px] font-bold leading-tight">
                  <span>{targetBox.label}</span>: {targetBox.value}
                </p>
                {targetBox.reason && completedSets === 0 && (
                  <p className="mt-0.5 text-xs leading-snug text-muted-foreground">{targetBox.reason}</p>
                )}
              </div>
            </div>
          )}
          {lastNote && (
            <p className="flex items-start gap-1 text-[11px] leading-snug text-primary/90">
              <StickyNote className="mt-0.5 h-3 w-3 shrink-0" />
              {t('notes.lastNote', { note: lastNote })}
            </p>
          )}
        </div>
      )}

      {/* ── Pinned note (Z103/B-T4): trwała notatka NAD seriami — user ma ją
          przeczytać PRZED pierwszą serią (ustawienia maszyny, wskazówki), nie
          odkrywać po treningu pod Add set. Edycja nadal wyłącznie z menu ⋯. */}
      {(hasPinnedNote || pinnedNoteOpen) && (
        <div className="px-5 pt-4" data-testid="pinned-note-slot">
          <PinnedNoteSection
            exerciseName={exercise.name}
            pinnedNote={pinnedNote}
            onSave={isEditable ? onPinnedNoteSave : undefined}
            startInEdit={pinnedNoteOpen && !hasPinnedNote}
          />
        </div>
      )}

      {/* ── Set table: nagłówki kolumn → rozgrzewka (badge W) → serie robocze ── */}
      <div
        className="px-2 pt-4 pb-2 phone:px-4 sm:px-5"
        data-testid="set-table"
      >
        {/* Naprawa r1 (2026-08-21): "pierwszy raz" RAZ nad tabelą zamiast
            klipowanego powtórzenia w każdej komórce POPRZ. (Z130 zachowane:
            informacja o braku historii nie znika). */}
        {isFirstTime && (
          <p className="px-2 pb-2 text-[11px] font-medium uppercase tracking-widest text-muted-foreground">
            {t('card.firstTime')}
          </p>
        )}
        {/* Grid header: SET | PREVIOUS | [unit] | REPS | ✓ | × */}
        {isNewTrackingUi ? (
          <div
            className={cn("grid gap-1 px-1 pb-2 mb-1 phone:gap-2 phone:px-2", gridCols)}
            data-testid="set-grid-header"
          >
            <span className="text-center text-[11px] font-bold uppercase tracking-widest text-muted-foreground">{t('card.colSet')}</span>
            {tracking !== 'weight_distance_duration' && (
              <span className="text-center text-[11px] font-bold uppercase tracking-widest text-muted-foreground">{t('card.colPrevious')}</span>
            )}
            {tracking === 'weight_distance_duration' && (
              <span className="text-center text-[11px] font-bold uppercase tracking-widest text-muted-foreground">{unit}</span>
            )}
            {tracking === 'weight_distance_duration' && (
              <span className="text-center text-[11px] font-bold uppercase tracking-widest text-muted-foreground">{t('card.colDistance')}</span>
            )}
            {tracking === 'assisted_bodyweight' && (
              <span className="text-center text-[11px] font-bold uppercase tracking-widest text-muted-foreground">{t('card.colAssist')}</span>
            )}
            {tracking === 'assisted_bodyweight' && (
              <span className="text-center text-[11px] font-bold uppercase tracking-widest text-muted-foreground">{t('card.colReps')}</span>
            )}
            {(tracking === 'duration' || tracking === 'weight_distance_duration') && (
              <span className="text-center text-[11px] font-bold uppercase tracking-widest text-muted-foreground">{t('card.colDuration')}</span>
            )}
            {/* WP-C (X37): pusta komórka nad kolumną przycisku odliczania. */}
            {tracking === 'duration' && <span aria-hidden />}
            <span className="flex items-center justify-center"><Check className="h-3 w-3 text-muted-foreground/50" aria-hidden /></span>
            {/* Fala 2 (mockup 2a): licznik odhaczonych serii w ostatniej kolumnie nagłówka. */}
            <span className="self-center text-center font-mono text-[11px] font-bold tabular-nums text-muted-foreground">
              {completedSets}/{workingSets.length}
            </span>
          </div>
        ) : (
        <div
          className={cn("grid gap-1 px-1 pb-2 mb-1 phone:gap-2 phone:px-2", gridCols)}
          data-testid="set-grid-header"
        >
          <span className="text-center text-[11px] font-bold uppercase tracking-widest text-muted-foreground">{t('card.colSet')}</span>
          <span className="text-center text-[11px] font-bold uppercase tracking-widest text-muted-foreground">{t('card.colPrevious')}</span>
          {!isBodyweight && (
            <span className="text-center text-[11px] font-bold uppercase tracking-widest text-muted-foreground">{unit}</span>
          )}
          <span className="text-center text-[11px] font-bold uppercase tracking-widest text-muted-foreground">{t('card.colReps')}</span>
          <span className="flex items-center justify-center"><Check className="h-3 w-3 text-muted-foreground/50" aria-hidden /></span>
          {/* Fala 2 (mockup 2a): licznik odhaczonych serii w ostatniej kolumnie nagłówka. */}
          <span className="self-center text-center font-mono text-[11px] font-bold tabular-nums text-muted-foreground">
            {completedSets}/{workingSets.length}
          </span>
        </div>
        )}

        {/* Z128.1: rozgrzewka w tej samej tabeli, oznaczona badge „W" w kolumnie SET —
            bez osobnego nagłówka sekcji, który wypychał serie robocze pod zgięcie. */}
        {warmupSets.map((set) => {
          const globalIndex = sets.indexOf(set);
          return renderSetRow(set, globalIndex, 'W', true);
        })}

        {/* Set rows */}
        {workingSets.map((set, wi) => {
          const globalIndex = sets.indexOf(set);
          return renderSetRow(set, globalIndex, wi + 1, false, wi);
        })}

        {completionError && (
          <p
            role="alert"
            aria-live="polite"
            className="mt-2 rounded-lg bg-destructive/10 px-3 py-2 text-sm font-medium text-destructive"
          >
            {t(completionError.key)}
          </p>
        )}

        {(zeroWeightAllowed || perSideTarget) && (
          <p className="mt-2 px-2 text-[11px] leading-relaxed text-muted-foreground" data-testid="zero-weight-rep-hint">
            {zeroWeightAllowed && <span>{t('card.zeroWeightHint')}</span>}
            {zeroWeightAllowed && perSideTarget && <span aria-hidden> · </span>}
            {perSideTarget && <span>{t('card.perSideTargetHint', { n: repsPlaceholder })}</span>}
          </p>
        )}

        {/* Fala 2 (2026-08-20): pasek przerwy przeniesiony z karty do STICKY slotu
            na dole ekranu (renderuje WorkoutDay). Prop restRun zostaje — steruje
            przygaszeniem ukończonej karty (Z145). */}

        {/* Z129.1: „Dodaj serię" pełną szerokością bezpośrednio pod ostatnią serią —
            tam, gdzie user go szuka (wzorzec Hevy/Strong), nie w pasku akcji na dole. */}
        {isEditable && (
          <>
            <button
              onClick={handleAddSet}
              disabled={atSetLimit}
              className="mt-2 flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-surface-low px-3 py-3 font-mono text-[11px] font-bold uppercase tracking-[0.12em] text-foreground transition-colors hover:bg-surface-high hover:text-primary disabled:cursor-not-allowed disabled:opacity-30"
            >
              <Plus className="h-4 w-4" />
              {t('card.addSet')}
            </button>
            {/* Z129.1: nieme `disabled` nie mówiło userowi, dlaczego nie da się kliknąć. */}
            {atSetLimit && (
              <p className="mt-1.5 text-center text-[11px] text-muted-foreground">{t('card.addSetLimit')}</p>
            )}
          </>
        )}
      </div>

      {/* ── Footer ── */}
      {isEditable && (
        <div className="px-5 pb-5 pt-3">
          {/* Z129.2: trzy chipy tej samej wielkości, każdy z etykietą. Dotąd rząd
              mieszał nagie ikony (%, dysk) z etykietowanymi, bez flex-wrap — po
              ikonie nie było widać, że dysk to kalkulator talerzy. */}
          <div className="flex items-stretch gap-1.5" data-testid="exercise-card-chips">
            {(() => {
              // Z108 / X38 WP-A: chip „Rozgrzewka" pierwszy od lewej, dla weight_reps
              // gdy w karcie NIE MA żadnej serii W. Zawsze dodaje jeden pusty
              // wiersz W; po dodaniu znika, usunięcie wszystkich W przywraca go.
              const hasWarmupRows = warmupSets.length > 0;
              return tracking === 'weight_reps' && !hasWarmupRows ? (
                <button
                  onClick={handleGenerateWarmup}
                  aria-label={t('warmupgen.addEmpty')}
                  data-testid="warmup-generate"
                  className={cn(chipClass, 'bg-surface-low text-foreground/80 hover:text-foreground')}
                >
                  <Flame className="h-3.5 w-3.5 shrink-0 text-[hsl(var(--ec-warmup-gold))]" />
                  {t('comp.warmup.title')}
                </button>
              ) : null;
            })()}
            {/* X17B Z134.3: chip widoczny dla weight_reps NIEZALEŻNIE od tego, czy
                w serii jest już ciężar. Warunek `plateWeight > 0` chował kalkulator
                dokładnie w momencie, w którym jest najbardziej potrzebny. */}
            {tracking === 'weight_reps' && (
              <button
                onClick={() => setShowPlates(true)}
                aria-label={t('plates.openCalculator')}
                data-testid="plate-calculator-open"
                className={cn(chipClass, 'bg-surface-low text-foreground/80 hover:text-foreground')}
              >
                <Disc className="h-3.5 w-3.5 shrink-0" />
                {t('plates.chip')}
              </button>
            )}
            {onMetricsChange && (
              <button
                onClick={() => setShowMetrics(v => !v)}
                aria-pressed={showMetrics}
                className={cn(
                  chipClass,
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
                  showMetrics
                    ? 'bg-primary/10 text-primary'
                    : 'bg-surface-low text-foreground/80 hover:text-foreground',
                )}
              >
                <Activity className="h-3.5 w-3.5 shrink-0" />
                {t('card.metrics')}
              </button>
            )}
          </div>
          {onMetricsChange && showMetrics && (
            <div className="mt-3 grid grid-cols-3 gap-2">
              {([
                { field: 'rpe' as const, label: t('card.rpe'), min: 0, max: 10, step: 0.5, ph: '8' },
                { field: 'pain' as const, label: t('card.pain'), min: 0, max: 10, step: 1, ph: '0' },
                { field: 'quality' as const, label: t('card.quality'), min: 1, max: 5, step: 1, ph: '5' },
              ]).map(({ field, label, ph }) => (
                <div key={field} className="flex flex-col gap-1">
                  <span className="text-center text-[11px] font-bold uppercase tracking-widest text-muted-foreground">{label}</span>
                  <DecimalInput
                    value={metricsState[field] ?? ''}
                    onCommit={(n) => handleMetricChange(field, n)}
                    onClear={() => handleMetricChange(field, null)}
                    placeholder={ph}
                    ariaLabel={label}
                    className="exercise-card-input h-11 text-base font-bold text-center focus-visible:ring-0 focus-visible:ring-offset-0"
                  />
                </div>
              ))}
            </div>
          )}
          {showNotes && (
            <Textarea
              placeholder={t('card.notePlaceholder')}
              value={notes}
              onChange={(e) => handleNotesChange(e.target.value)}
              className="mt-3 min-h-[60px] text-sm exercise-card-input !text-left"
            />
          )}
        </div>
      )}

      {/* ── Potwierdzenie usunięcia serii z danymi (Z130/Z171) ── */}
      <Dialog open={pendingRemove !== null} onOpenChange={(open) => { if (!open) setPendingRemove(null); }}>
        {/* Z170: destrukcyjne potwierdzenie zamyka się TYLKO przez ANULUJ / X —
            tap w overlay (np. gdy dialog przeskoczył po schowaniu klawiatury) nie może go zdjąć. */}
        <DialogContent className="max-w-[95vw] w-full sm:max-w-sm" onInteractOutside={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle className="text-base pr-6">{t('card.removeSetConfirmTitle')}</DialogTitle>
          </DialogHeader>
          {/* Z220: DialogDescription (te same klasy co <p>) — poprawne aria-describedby. */}
          <DialogDescription>{t('card.removeSetConfirmDesc')}</DialogDescription>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              data-testid="remove-set-cancel"
              onClick={() => setPendingRemove(null)}
              className="min-h-[44px] min-w-[88px] rounded-lg px-3 py-2.5 text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground transition-colors hover:text-foreground"
            >
              {t('common.cancel')}
            </button>
            <button
              type="button"
              data-testid="remove-set-confirm"
              onClick={() => {
                if (pendingRemove !== null) removeSet(pendingRemove);
                setPendingRemove(null);
              }}
              className="min-h-[44px] min-w-[88px] rounded-lg bg-destructive/15 px-3 py-2.5 text-xs font-bold uppercase tracking-[0.14em] text-destructive transition-colors hover:bg-destructive/25"
            >
              {t('common.delete')}
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Instructions Dialog (Z129.2: treść wyprowadzona z karty do menu ⋯) ── */}
      <Dialog open={showInstructions} onOpenChange={setShowInstructions}>
        {/* Z220: treść instrukcji to nie "opis" — jawnie bez aria-describedby. */}
        <DialogContent className="max-w-[95vw] w-full sm:max-w-lg" aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle className="text-base pr-6">{localizedName}</DialogTitle>
          </DialogHeader>
          {(() => {
            const displayInstructions = exercise.instructions.length > 0
              ? exercise.instructions
              : getExerciseInstructions(exercise.name);
            if (displayInstructions.length === 0) {
              return <p className="text-sm text-muted-foreground">{t('card.noInstructions')}</p>;
            }
            return (
              <p className="text-sm leading-relaxed text-muted-foreground">
                {displayInstructions.map(inst => localizeExerciseInstruction(exercise.name, inst.content, lang)).join(' ')}
              </p>
            );
          })()}
          {detailSlug && (
            <button
              type="button"
              onClick={() => {
                // Blackout WKWebView: nawigacja w tym samym ticku twardo
                // unmountowała OTWARTY portal Radixa. Najpierw przeprowadzamy
                // Root przez open=false, a trasę zmieniamy w następnej klatce.
                setShowInstructions(false);
                window.requestAnimationFrame(() => navigate(`/exercise/${detailSlug}`));
              }}
              className="mt-1 w-full rounded-lg border border-primary/40 bg-primary/10 px-3 py-2.5 text-xs font-bold uppercase tracking-[0.14em] text-primary transition-colors hover:bg-primary/20"
            >
              {t('card.details')}
            </button>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Animation Dialog ── */}
      {animationUrl && (
        <Dialog open={showVideo} onOpenChange={(open) => {
          setShowVideo(open);
          if (!open) {
            setVideoControls(false);
            setVideoFailed(false);
          }
        }}>
          <DialogContent className="max-w-[95vw] w-full sm:max-w-lg p-3 sm:p-6" aria-describedby={undefined}>
            <DialogHeader>
              <DialogTitle className="text-sm pr-6">{localizedName}</DialogTitle>
            </DialogHeader>
            {/* 75% = 4:3, zgodnie z proporcją animacji ćwiczeń. Wcześniej było
                56.25% (16:9), przez co object-cover ucinał 25% wysokości, czyli
                głowę i stopy ćwiczącego. */}
            <div className="relative w-full overflow-hidden rounded-lg" style={{ paddingBottom: '75%' }}>
              {showVideo && !videoFailed && (
                <video
                  className="absolute inset-0 w-full h-full object-cover"
                  src={animationUrl}
                  loop
                  muted
                  playsInline
                  controls={videoControls}
                  onError={() => {
                    setVideoFailed(true);
                    void reportClientError(uid ?? '', {
                      code: 'exercise-video-load-error',
                      phase: 'other',
                      detail: exercise.name,
                    });
                  }}
                  // Z176: twardy start zamiast atrybutu autoplay — odmowę widać
                  // (rejection) i dajemy controls; sam atrybut milczał (Low Power Mode).
                  onLoadedMetadata={(e) => {
                    const v = e.currentTarget;
                    v.muted = true;
                    v.play().catch(() => {
                      setVideoControls(true);
                      void reportClientError(uid ?? '', {
                        code: 'exercise-video-play-blocked',
                        phase: 'other',
                        detail: exercise.name,
                      });
                    });
                  }}
                />
              )}
              {videoFailed && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-surface-low p-5 text-center">
                  <Dumbbell className="h-10 w-10 text-muted-foreground" aria-hidden />
                  <div>
                    <p className="text-sm font-semibold">{t('card.animationUnavailable')}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{t('card.animationFallbackHint')}</p>
                  </div>
                  {(() => {
                    const instructions = exercise.instructions.length > 0
                      ? exercise.instructions
                      : getExerciseInstructions(exercise.name);
                    return instructions.length > 0 ? (
                      <p className="max-h-28 overflow-y-auto text-sm leading-relaxed text-muted-foreground">
                        {instructions.map((instruction) => localizeExerciseInstruction(exercise.name, instruction.content, lang)).join(' ')}
                      </p>
                    ) : null;
                  })()}
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}

      {FEATURE_FLAGS.intervalTimers && intervalSpec && intervalRun.open && (
        <IntervalTimer
          key={intervalRun.runId}
          spec={intervalSpec}
          exerciseLabel={localizedName}
          onClose={() => setIntervalRun(r => ({ ...r, open: false }))}
        />
      )}

      {showPlates && (
        <PlateCalculatorSheet
          open={showPlates}
          onOpenChange={setShowPlates}
          targetKg={sets[activeSetIndex]?.weight || [...sets].reverse().find((s) => !s.isWarmup && s.weight > 0)?.weight || 0}
          exerciseId={exercise.id}
          onApplyWeight={handleApplyPlateWeight}
        />
      )}
    </div>
  );
};

export const ExerciseCard = memo(ExerciseCardInner);
