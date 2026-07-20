import { useState, useEffect, useRef, memo, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Flame, Info, StickyNote, Play, Plus, Sparkles, Loader2, Star, Activity, Timer, Disc, MoreHorizontal, ArrowRightLeft, SkipForward, Pin } from 'lucide-react';
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
import { parseSetCount, sanitizeSets, parseRepRange, getProgressionAdvice, getExerciseInstructions, previousWorkingSet } from '@/lib/exercise-utils';
import { getExerciseAnimationUrl, slugifyExercise } from '@/lib/exercise-media';
import { resolveExerciseInterval } from '@/lib/interval-timer';
import { RestBar } from '@/components/RestBar';
import { loadRestSettings, resolveRestSeconds } from '@/lib/rest-timer';
import { IntervalTimer } from './IntervalTimer';
import { Haptics, NotificationType } from '@capacitor/haptics';
import { Capacitor } from '@capacitor/core';
import { playTimerSound, unlockTimerSound } from '@/lib/timer-sound';
import { hapticImpactLight } from '@/lib/haptics';
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
import { PinnedNoteSection, type PinnedNoteSaveInput } from '@/components/PinnedNoteSection';
import type { ExerciseNote } from '@/lib/exercise-notes';
import { formatDistanceM, formatDurationSec, parseDurationInput, type TrackingType } from '@/lib/set-tracking';
import { PlateCalculatorSheet } from '@/components/PlateCalculatorSheet';
import { generateWarmupSets } from '@/lib/warmup-generator';
import { loadPlateInventory } from '@/lib/plate-calculator';

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
const chipClass = 'inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-2.5 text-[11px] font-semibold transition-colors';

// ── Progression Badge sub-component ──
const ProgressionBadge = ({ advice }: { advice: { type: 'increase' | 'repeat' | 'maintain'; label: string } }) => {
  const styles = {
    increase: 'border-fitness-success/30 text-fitness-success bg-fitness-success/10 dark:text-fitness-success dark:border-fitness-success/30',
    repeat: 'border-fitness-warning/30 text-fitness-warning bg-fitness-warning/10 dark:text-fitness-warning dark:border-fitness-warning/30',
    maintain: 'border-destructive/30 text-destructive bg-destructive/10',
  };
  const arrows = {
    increase: (
      <svg width="10" height="10" viewBox="0 0 16 16" fill="none" className="shrink-0">
        <path d="M8 12V4m0 0L4 8m4-4l4 4" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
    repeat: (
      <svg width="10" height="10" viewBox="0 0 16 16" fill="none" className="shrink-0">
        <path d="M4 8h8M12 8l-3-3m3 3l-3 3" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
    maintain: (
      <svg width="10" height="10" viewBox="0 0 16 16" fill="none" className="shrink-0">
        <path d="M3 8h10" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
      </svg>
    ),
  };

  return (
    <span className={cn(
      "inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide border",
      styles[advice.type]
    )}>
      {arrows[advice.type]}
      {advice.label}
    </span>
  );
};

// ── Next-set target badge (konkretny cel z trendu historii) ──
const NextTargetBadge = ({ advice }: { advice: NextSetAdvice }) => {
  const { t } = useTranslation();
  const { unit, toDisplay } = useUnit();
  const styles: Record<NextSetAdvice['kind'], string> = {
    progress: 'border-fitness-success/30 text-fitness-success bg-fitness-success/10',
    hold: 'border-fitness-warning/30 text-fitness-warning bg-fitness-warning/10',
    deload: 'border-fitness-warning/40 text-fitness-warning bg-fitness-warning/10',
  };
  const labels: Record<NextSetAdvice['kind'], string> = {
    progress: t('card.target'),
    hold: t('card.target'),
    deload: t('card.deload'),
  };
  const target = advice.isBodyweight
    ? t('card.repsValue', { n: advice.targetReps })
    : `${Math.round(toDisplay(advice.targetWeight) * 10) / 10} ${unit} × ${advice.targetReps}`;
  return (
    <span
      title={advice.reason}
      className={cn(
        'inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide border',
        styles[advice.kind],
      )}
    >
      🎯 {labels[advice.kind]}: {target}
    </span>
  );
};

// ── Weekly target badge (Z120: silnik progresji programowej) ──
const WeeklyTargetBadge = ({ target }: { target: WeeklyTarget }) => {
  const { t } = useTranslation();
  const { unit, toDisplay } = useUnit();
  const styles: Record<WeeklyTarget['kind'], string> = {
    start: 'border-muted-foreground/30 text-muted-foreground bg-muted/30',
    progress: 'border-fitness-success/30 text-fitness-success bg-fitness-success/10',
    hold: 'border-fitness-warning/30 text-fitness-warning bg-fitness-warning/10',
    deload: 'border-fitness-warning/40 text-fitness-warning bg-fitness-warning/10',
    pain: 'border-destructive/40 text-destructive bg-destructive/10',
    'deload-week': 'border-fitness-cyan/40 text-fitness-cyan bg-fitness-cyan/10',
  };
  const labels: Record<WeeklyTarget['kind'], string> = {
    start: t('card.weekTarget'),
    progress: t('card.weekTarget'),
    hold: t('card.weekTarget'),
    deload: t('card.deload'),
    pain: t('card.weekPain'),
    'deload-week': t('card.weekDeload'),
  };
  const disp = (kg: number) => `${Math.round(toDisplay(kg) * 10) / 10} ${unit}`;
  const head = target.targetSets != null && target.targetReps != null
    ? `${target.targetSets}×${target.targetReps}`
    : target.targetReps != null ? `×${target.targetReps}` : '';
  const value = [
    head,
    target.targetWeight != null && target.targetWeight > 0 ? disp(target.targetWeight) : null,
    target.targetDurationSec != null ? formatDurationSec(target.targetDurationSec) : null,
  ].filter(Boolean).join(' · ');
  if (!value) return null;
  return (
    <span
      title={t(target.reasonKey as TranslationKey)}
      className={cn(
        'inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide border',
        styles[target.kind],
      )}
    >
      📅 {labels[target.kind]}: {value}
    </span>
  );
};

// ── RZA autoregulation badge (next weight from RPE/ból/jakość) ──
const RzaAdviceBadge = ({ advice }: { advice: RzaAdvice }) => {
  const { t } = useTranslation();
  const { unit, toDisplay } = useUnit();
  const styles: Record<RzaAdvice['decision'], string> = {
    progress: 'border-fitness-success/30 text-fitness-success bg-fitness-success/10',
    deload: 'border-fitness-warning/40 text-fitness-warning bg-fitness-warning/10',
    repeat: 'border-fitness-warning/30 text-fitness-warning bg-fitness-warning/10',
  };
  const labels: Record<RzaAdvice['decision'], string> = {
    progress: t('card.rzaProgress'),
    deload: t('card.rzaDeload'),
    repeat: t('card.rzaRepeat'),
  };
  const icon = advice.decision === 'progress' ? '⬆' : advice.decision === 'deload' ? '⬇' : '↺';
  const next = `${Math.round(toDisplay(advice.nextKg) * 10) / 10} ${unit}`;
  return (
    <span
      title={t('card.rzaReason', { last: `${Math.round(toDisplay(advice.lastKg) * 10) / 10} ${unit}` })}
      className={cn(
        'inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide border',
        styles[advice.decision],
      )}
    >
      {icon} {labels[advice.decision]}: {next}
    </span>
  );
};

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
}

// Input czasu mm:ss (Z105): lokalny draft, parse dopiero na blur/Enter —
// parsowanie per znak psułoby edycję ("1:3" -> 63 -> "1:03").
const DurationInput = ({ valueSec, onCommit, disabled, ariaLabel, placeholder, className }: {
  valueSec?: number;
  onCommit: (sec: number) => void;
  disabled?: boolean;
  ariaLabel: string;
  placeholder?: string;
  className?: string;
}) => {
  const [draft, setDraft] = useState<string | null>(null);
  return (
    <Input
      type="text"
      inputMode="numeric"
      value={draft ?? formatDurationSec(valueSec)}
      onChange={(e) => setDraft(e.target.value)}
      onFocus={() => setDraft(formatDurationSec(valueSec))}
      onBlur={() => {
        if (draft !== null) onCommit(parseDurationInput(draft));
        setDraft(null);
      }}
      onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
      placeholder={placeholder ?? '1:30'}
      disabled={disabled}
      aria-label={ariaLabel}
      className={cn('exercise-card-input h-12 text-base font-bold focus-visible:ring-0 focus-visible:ring-offset-0', className)}
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
  metrics,
  onMetricsChange,
  defaultMetricsVisible = false,
  rzaAdvice,
  pinnedNote,
  onPinnedNoteSave,
  trackingType,
  onRequestSwap,
  onSkip,
}: ExerciseCardProps) => {
  const { t, lang } = useTranslation();
  const navigate = useNavigate();
  const { uid } = useCurrentUser();
  // Link do instrukcji tylko dla ćwiczeń z biblioteki (custom/nieznane nie mają strony szczegółów).
  const detailSlug = useMemo(() => {
    const slug = slugifyExercise(exercise.name);
    return slug && exerciseLibrary.some((e) => slugifyExercise(e.name) === slug) ? slug : null;
  }, [exercise.name]);
  // Timer interwałowy (EMOM/AMRAP) — tylko gdy ćwiczenie ma rozpoznany zapis interwału.
  const intervalSpec = useMemo(
    () => FEATURE_FLAGS.workoutTimers ? resolveExerciseInterval(exercise) : null,
    [exercise],
  );
  const [intervalRun, setIntervalRun] = useState<{ open: boolean; runId: number }>({ open: false, runId: 0 });
  // Kalkulator talerzy (Z107): tylko weight_reps, ciężar z aktywnej/ostatniej serii roboczej.
  const [showPlates, setShowPlates] = useState(false);
  const localizedName = localizeExerciseName(exercise.name, lang);
  const setCount = useMemo(() => parseSetCount(exercise.sets), [exercise.sets]);
  const [showVideo, setShowVideo] = useState(false);
  // Z129.2: instrukcje wyprowadzone z karty do menu ⋯ (dialog na żądanie).
  const [showInstructions, setShowInstructions] = useState(false);
  // Z129.2: pusty stan przypiętej notatki żyje w menu, nie w karcie.
  const [pinnedNoteOpen, setPinnedNoteOpen] = useState(false);
  // Z130: indeks serii czekającej na potwierdzenie usunięcia (null = brak dialogu).
  const [pendingRemoveIndex, setPendingRemoveIndex] = useState<number | null>(null);
  // X17C Z136: aktywna przerwa tej karty. runId 0 = jeszcze żadnej nie było.
  const [restRun, setRestRun] = useState<{ seconds: number; runId: number }>({ seconds: 0, runId: 0 });
  const [sets, setSets] = useState<SetData[]>(() => sanitizeSets(savedSets, setCount));
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
    }
  }, [savedSets, savedNotes, setCount, metrics, defaultMetricsVisible]);

  // Zmiana metryki: pusty input => pole usunięte (undefined), inaczej liczba w zakresie.
  const handleMetricChange = (field: keyof ExerciseMetrics, raw: string) => {
    hasLocalChanges.current = true;
    const next: ExerciseMetrics = { ...metricsState };
    if (raw === '') {
      delete next[field];
    } else {
      next[field] = parseFloat(raw);
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

    const updatedSet = {
      ...sets[setIndex],
      [field]: value,
      ...(isBodyweight && { weight: 0 }),
    };

    const newSets = sets.map((set, i) => (i === setIndex ? updatedSet : set));
    setSets(newSets);
    onSetsChange?.(exercise.id, newSets, notes);
  };

  // ── Toggle a set as done. Confirms the (pre-filled) value without retyping. ──
  const handleToggleComplete = (setIndex: number) => {
    if (!isEditable) return;
    hasLocalChanges.current = true;

    const currentSet = sets[setIndex];
    const turningOn = !currentSet.completed;

    // If confirming an empty set and we have last time's value, adopt it.
    let reps = currentSet.reps;
    let weight = currentSet.weight;
    if (turningOn && reps === 0 && previousSets && previousSets[setIndex]) {
      reps = previousSets[setIndex].reps;
      if (!isBodyweight) weight = previousSets[setIndex].weight;
    }

    // Z105: adopcja pustych pól nowych typów z poprzedniej sesji przy odhaczaniu.
    const prevForAdopt = turningOn ? previousSets?.[setIndex] : undefined;
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
    const newSets = sets.map((set, i) => (i === setIndex ? updatedSet : set));
    setSets(newSets);
    onSetsChange?.(exercise.id, newSets, notes);

    // Z82: lekki impact przy każdym odhaczeniu (natywnie; web no-op).
    if (turningOn) void hapticImpactLight();
    if (turningOn && uid) trackTelemetryEvent(uid, 'action_set_checked');

    if (turningOn && !currentSet.isWarmup) {
      const workingAfter = newSets.filter(s => !s.isWarmup);
      const allDone = workingAfter.length > 0 && workingAfter.every(s => s.completed);
      // Timer przerwy startuje w OBU przypadkach, różni się tylko długością:
      // po ostatniej serii to przerwa na przejście do następnego ćwiczenia
      // (dłuższa — dochodzi zmiana stanowiska i sprzętu).
      if (allDone) {
        unlockTimerSound();
        exerciseCompleteHaptic();
        playTimerSound('complete');
      }
      if (FEATURE_FLAGS.workoutTimers && !intervalSpec) {
        // Dla ćwiczeń interwałowych (EMOM/AMRAP) pomijamy — rytm prowadzi timer interwałowy.
        const seconds = resolveRestSeconds(loadRestSettings(), {
          isWarmup: currentSet.isWarmup,
          exerciseKey: exercise.name,
          exerciseFinished: allDone,
        });
        unlockTimerSound();
        setRestRun((r) => ({ seconds, runId: r.runId + 1 }));
      }
    }
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

  const removeSetAt = (setIndex: number) => {
    hasLocalChanges.current = true;
    const newSets = sets.filter((_, idx) => idx !== setIndex);
    setSets(newSets);
    onSetsChange?.(exercise.id, newSets, notes);
  };

  // Z130: `×` kasowało natychmiast, bez pytania — jeden przypadkowy tap na siłowni
  // i seria z ciężarem przepadała. Pusta seria nadal leci bez dialogu (nie ma czego stracić).
  const setHasData = (set?: SetData): boolean => Boolean(
    set && (set.reps > 0 || set.weight > 0 || set.completed
      || (set.durationSec ?? 0) > 0 || (set.distanceM ?? 0) > 0 || (set.assistWeight ?? 0) > 0),
  );

  const handleRemoveSet = (setIndex: number) => {
    if (setHasData(sets[setIndex])) {
      setPendingRemoveIndex(setIndex);
      return;
    }
    removeSetAt(setIndex);
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

  // Z108: generator rozgrzewki %1RM — zastępuje pustą serię rozgrzewkową schematem
  // gryf x10 / 50% x8 / 70% x5 / 90% x2 od pierwszego ciężaru roboczego.
  const handleGenerateWarmup = () => {
    const workingWeight = sets.find((s) => !s.isWarmup && s.weight > 0)?.weight ?? 0;
    // Z134.2: inwentarz idzie do generatora, żeby nie proponował ciężarów,
    // których na tej siłowni nie da się złożyć.
    const inventory = loadPlateInventory();
    const generated = generateWarmupSets(workingWeight, tracking, inventory.barKg, inventory.plates);
    if (!generated) return;
    hasLocalChanges.current = true;
    const newSets = [...generated, ...sets.filter((s) => !s.isWarmup)];
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
  const { unit, fmt, toDisplay, fromInput } = useUnit();

  // Indeks pierwszej nieukończonej serii roboczej (podświetlana jako aktywna — mockup [17]).
  const activeSetIndex = sets.findIndex((s) => !s.isWarmup && !s.completed);

  // Docelowe powtórzenia z planu (np. "3 x 8-12" → placeholder "8-12").
  const repsPlaceholder = useMemo(() => {
    const range = parseRepRange(exercise.sets);
    if (!range) return '—';
    const { min, max } = range;
    return min === max ? String(min) : `${min}-${max}`;
  }, [exercise.sets]);

  const progressionAdvice = useMemo(() => {
    if (!previousSets) return null;
    const repRange = parseRepRange(exercise.sets);
    const prevWorking = previousSets.filter(s => !s.isWarmup);
    return getProgressionAdvice(repRange, prevWorking, index - 1, exercise.isSuperset, isBodyweight, lang, unit);
  }, [previousSets, exercise.sets, index, exercise.isSuperset, isBodyweight, lang, unit]);

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
  const gridCols = tracking === 'duration'
    ? 'grid-cols-[26px_minmax(0,1fr)_1fr_40px_22px]'
    : tracking === 'weight_distance_duration'
      ? 'grid-cols-[26px_1fr_1fr_1fr_40px_22px]'
      : tracking === 'assisted_bodyweight'
        ? 'grid-cols-[26px_minmax(0,1fr)_1fr_1fr_40px_22px]'
        : isBodyweight
          ? 'grid-cols-[26px_minmax(0,1fr)_1fr_40px_22px]'
          : 'grid-cols-[26px_minmax(0,1fr)_1fr_1fr_40px_22px]';

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

  // Wiersz serii dla nowych typów śledzenia (Z105) — osobna gałąź, ścieżka
  // weight_reps/bodyweight_reps renderuje się dokładnie jak dotąd.
  const renderTrackedSetRow = (set: SetData, globalIndex: number, label: React.ReactNode, isWarmupRow: boolean, workingIndex = -1) => {
    const isActive = !isWarmupRow && globalIndex === activeSetIndex;
    // Z128.1: złoto rozgrzewki było tylko na starej ścieżce — teraz na obu.
    const warmupInputClass = isWarmupRow ? '!border-[hsl(var(--ec-warmup-gold-border))]' : undefined;
    const setLabel = isWarmupRow ? `${t('comp.warmup.title')} ${label}` : `${t('card.colSet')} ${label}`;
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
        className={cn(
          'grid items-center gap-2 rounded-xl px-2 py-1.5 transition-colors',
          gridCols,
          // Z128.1: ukończona seria = wypełnione tło (widoczne z odległości ręki),
          // aktywna = obrys. Wykluczają się: aktywna to pierwsza NIEukończona.
          set.completed ? 'bg-primary/[0.06]' : isActive && 'bg-primary/[0.04] ring-2 ring-primary',
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

        {/* PREV — nie renderowana dla weight_distance_duration (brak miejsca na 3 inputy) */}
        {tracking !== 'weight_distance_duration' && (
          <span className={cn(
            'truncate text-center text-xs tabular-nums text-muted-foreground',
            !isWarmupRow && !prevHint && 'text-[10px] tabular-nums-none text-muted-foreground/60',
          )}>
            {isWarmupRow ? '—' : (prevHint || t('card.firstTime'))}
          </span>
        )}

        {tracking === 'weight_distance_duration' && (
          <Input
            type="number"
            inputMode="decimal"
            min={0}
            step={0.5}
            value={displayWeight}
            onChange={(e) => handleSetChange(globalIndex, 'weight', fromInput(parseFloat(e.target.value) || 0))}
            placeholder={unit}
            disabled={!isEditable}
            aria-label={`${localizedName}, ${setLabel}, ${unit}`}
            className={cn('exercise-card-input h-12 text-base font-bold focus-visible:ring-0 focus-visible:ring-offset-0', warmupInputClass)}
          />
        )}

        {tracking === 'weight_distance_duration' && (
          <Input
            type="number"
            inputMode="numeric"
            min={0}
            value={set.distanceM || ''}
            onChange={(e) => handleSetChange(globalIndex, 'distanceM', parseFloat(e.target.value) || 0)}
            placeholder="m"
            disabled={!isEditable}
            aria-label={`${localizedName}, ${setLabel}, ${t('card.colDistance')}`}
            className={cn('exercise-card-input h-12 text-base font-bold focus-visible:ring-0 focus-visible:ring-offset-0', warmupInputClass)}
          />
        )}

        {tracking === 'assisted_bodyweight' && (
          <Input
            type="number"
            inputMode="decimal"
            min={0}
            step={0.5}
            value={displayAssist}
            onChange={(e) => handleSetChange(globalIndex, 'assistWeight', fromInput(parseFloat(e.target.value) || 0))}
            placeholder={`-${unit}`}
            disabled={!isEditable}
            aria-label={`${localizedName}, ${setLabel}, ${t('card.colAssist')}`}
            className={cn('exercise-card-input h-12 text-base font-bold focus-visible:ring-0 focus-visible:ring-offset-0', warmupInputClass)}
          />
        )}

        {tracking === 'assisted_bodyweight' && (
          <Input
            type="number"
            inputMode="numeric"
            min={0}
            value={set.reps || ''}
            onChange={(e) => handleSetChange(globalIndex, 'reps', parseInt(e.target.value) || 0)}
            placeholder={isWarmupRow ? '—' : repsPlaceholder}
            disabled={!isEditable}
            aria-label={`${localizedName}, ${setLabel}, ${t('card.colReps')}`}
            className={cn('exercise-card-input h-12 text-base font-bold focus-visible:ring-0 focus-visible:ring-offset-0', warmupInputClass)}
          />
        )}

        {(tracking === 'duration' || tracking === 'weight_distance_duration') && (
          <DurationInput
            valueSec={set.durationSec}
            onCommit={(sec) => handleSetChange(globalIndex, 'durationSec', sec)}
            disabled={!isEditable}
            ariaLabel={`${localizedName}, ${setLabel}, ${t('card.colDuration')}`}
            className={warmupInputClass}
          />
        )}

        <div className="flex justify-center">
          <button
            onClick={() => handleToggleComplete(globalIndex)}
            disabled={!isEditable}
            aria-label={set.completed ? t('card.uncheckSet') : t('card.checkSet')}
            className={cn(
              'flex h-10 w-10 items-center justify-center rounded-lg transition-colors disabled:opacity-40',
              set.completed
                ? 'bg-accent text-accent-foreground'
                : 'border-2 border-muted-foreground/40 text-muted-foreground/50 hover:border-accent hover:text-accent',
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
              onClick={() => handleRemoveSet(globalIndex)}
              aria-label={t('card.removeSet')}
              className="flex h-8 w-6 items-center justify-center text-lg leading-none text-[hsl(var(--ec-delete))] hover:text-destructive"
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
    if (isNewTrackingUi) return renderTrackedSetRow(set, globalIndex, label, isWarmupRow, workingIndex);
    const prevHint = !isWarmupRow ? getPreviousHint(workingIndex) : null;
    const isActive = !isWarmupRow && globalIndex === activeSetIndex;
    const displayWeight = set.weight
      ? (unit === 'lbs' ? Number(toDisplay(set.weight).toFixed(1)) : set.weight)
      : '';
    const setLabel = isWarmupRow ? `${t('comp.warmup.title')} ${label}` : `${t('card.colSet')} ${label}`;

    return (
      <div
        key={globalIndex}
        className={cn(
          'grid items-center gap-2 rounded-xl px-2 py-1.5 transition-colors',
          gridCols,
          // Z128.1: patrz renderTrackedSetRow — ta sama reguła tła na obu ścieżkach.
          set.completed ? 'bg-primary/[0.06]' : isActive && 'bg-primary/[0.04] ring-2 ring-primary',
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

        {/* PREVIOUS — Z130: brak historii mówi „pierwszy raz", nie „—" */}
        <span className={cn(
          'truncate text-center text-xs tabular-nums text-muted-foreground',
          !isWarmupRow && !prevHint && 'text-[10px] tabular-nums-none text-muted-foreground/60',
        )}>
          {isWarmupRow ? '—' : (prevHint || t('card.firstTime'))}
        </span>

        {/* KG (non-bodyweight) */}
        {!isBodyweight && (
          <Input
            type="number"
            inputMode="decimal"
            min={0}
            step={0.5}
            value={displayWeight}
            onChange={(e) => handleSetChange(globalIndex, 'weight', fromInput(parseFloat(e.target.value) || 0))}
            placeholder="0"
            disabled={!isEditable}
            aria-label={`${localizedName}, ${setLabel}, ${unit}`}
            className={cn(
              'exercise-card-input h-12 text-base font-bold focus-visible:ring-0 focus-visible:ring-offset-0',
              isWarmupRow && '!border-[hsl(var(--ec-warmup-gold-border))]',
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
          placeholder={isWarmupRow ? '—' : repsPlaceholder}
          disabled={!isEditable}
          aria-label={`${localizedName}, ${setLabel}, ${t('card.colReps')}`}
          className={cn(
            'exercise-card-input h-12 text-base font-bold focus-visible:ring-0 focus-visible:ring-offset-0',
            isWarmupRow && '!border-[hsl(var(--ec-warmup-gold-border))]',
          )}
        />

        {/* Done checkmark */}
        <div className="flex justify-center">
          <button
            onClick={() => handleToggleComplete(globalIndex)}
            disabled={!isEditable}
            aria-label={set.completed ? t('card.uncheckSet') : t('card.checkSet')}
            className={cn(
              'flex h-10 w-10 items-center justify-center rounded-lg transition-colors disabled:opacity-40',
              set.completed
                ? 'bg-accent text-accent-foreground'
                : 'border-2 border-muted-foreground/40 text-muted-foreground/50 hover:border-accent hover:text-accent',
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
              onClick={() => handleRemoveSet(globalIndex)}
              aria-label={t('card.removeSet')}
              className="flex h-8 w-6 items-center justify-center text-lg leading-none text-[hsl(var(--ec-delete))] hover:text-destructive"
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

  return (
    <div className={cn(
      "exercise-card",
      exercise.isSuperset && "bg-primary/[0.04]",
      allCompleted && "opacity-50"
    )}>
      {/* ── Header ── */}
      <div className="flex items-center justify-between gap-3 p-3 pr-4 exercise-card-header">
        <div className="flex items-center gap-3 min-w-0">
          {/* Z128.2: miniatura tylko gdy JEST animacja. Pusty kwadrat 92×72 z ikoną
              hantla zabierał szerokość tytułowi, nie niosąc żadnej informacji. */}
          {animationUrl && (
            <button
              type="button"
              onClick={() => setShowVideo(true)}
              className="relative h-[72px] w-[92px] rounded-2xl overflow-hidden shrink-0 bg-background/70"
              aria-label={t('card.showAnimation', { name: localizedName })}
            >
              <video src={animationUrl} className="h-full w-full object-cover opacity-80" autoPlay loop muted playsInline />
              <span className="absolute inset-0 flex items-center justify-center bg-black/10">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-black/55 text-white backdrop-blur-sm">
                  <Play className="h-3.5 w-3.5 fill-current" />
                </span>
              </span>
            </button>
          )}

          <div className="min-w-0">
            <div className="flex items-center gap-1.5 min-w-0">
              <h3 className="font-bold text-[16px] leading-tight">{localizedName}</h3>
            </div>
            <div className="flex items-center gap-2.5 mt-1.5 flex-wrap">
              <span className="text-sm font-medium text-muted-foreground">
                {t('card.setsCount', { n: workingSets.length })}
              </span>
              {historicalBest && historicalBest.best1RM > 0 && (
                <span
                  title={`${Math.round(toDisplay(historicalBest.best1RMWeight))} ${unit} × ${historicalBest.best1RMReps}`}
                  className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide border border-fitness-cyan/30 text-fitness-cyan bg-fitness-cyan/10"
                >
                  <Star className="h-3 w-3 fill-current" />
                  {t('card.best')} {Math.round(toDisplay(historicalBest.best1RM))} {unit}
                </span>
              )}
              {rzaAdvice ? <RzaAdviceBadge advice={rzaAdvice} />
                : weeklyTarget && weeklyTarget.kind !== 'start' ? <WeeklyTargetBadge target={weeklyTarget} />
                : nextAdvice ? <NextTargetBadge advice={nextAdvice} />
                : progressionAdvice && <ProgressionBadge advice={progressionAdvice} />}
              {FEATURE_FLAGS.workoutTimers && intervalSpec && (
                <button
                  onClick={() => setIntervalRun(r => ({ open: true, runId: r.runId + 1 }))}
                  className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide border border-primary/30 text-primary bg-primary/10 hover:bg-primary/20 transition-colors"
                >
                  <Timer className="h-3 w-3" />
                  {intervalSpec.label}
                </button>
              )}
              {completedSets > 0 && (
                <span className="text-[11px] font-bold text-fitness-success flex items-center gap-1">
                  <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
                    <path d="M3 8.5l3.5 3.5 6.5-7" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  {completedSets}/{workingSets.length}
                </span>
              )}
            </div>
            {/* Z128.2: jeden zwarty blok metadanych (uzasadnienie celu + ostatnia
                notatka). Instrukcje wypadły z karty — idą do menu ⋯ (Z129). */}
            <div className="mt-1.5 space-y-1 empty:mt-0">
              {weeklyTarget && weeklyTarget.kind !== 'start' && completedSets === 0 ? (
                <p className="text-[11px] text-muted-foreground/80 leading-snug">{t(weeklyTarget.reasonKey as TranslationKey)}</p>
              ) : nextAdvice && completedSets === 0 && (
                <p className="text-[11px] text-muted-foreground/80 leading-snug">{nextAdvice.reason}</p>
              )}
              {lastNote && (
                <p className="text-[11px] text-fitness-cyan/90 leading-snug flex items-start gap-1">
                  <StickyNote className="h-3 w-3 shrink-0 mt-0.5" />
                  {t('notes.lastNote', { note: lastNote })}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Z129.2: rzadkie akcje ćwiczenia w jednym menu, zamiast ikon rozsianych
            po nagłówku, pasku chipów i przyciskach pod kartą. */}
        {/* UWAGA przy testach: po zamknięciu dialogu otwartego Z TEGO menu Radix
            sprząta blokadę interakcji dopiero w następnym ticku. Okno jest
            milisekundowe (człowiek go nie trafi), ale automat klikający natychmiast
            po Escape owszem — dlatego e2e czeka na ZNIKNIĘCIE dialogu, a nie na sam
            klawisz. `modal={false}` to naprawia, ale rozwala obsługę menu w jsdom,
            więc zostaje domyślna modalność. */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              aria-label={t('card.moreActions')}
              className="shrink-0 self-start rounded-lg p-2 -mr-1 text-muted-foreground/70 transition-colors hover:text-foreground"
            >
              <MoreHorizontal className="h-5 w-5" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuItem onClick={() => setShowInstructions(true)} className="cursor-pointer">
              <Info className="h-4 w-4 mr-2" />
              {t('card.instructions')}
            </DropdownMenuItem>
            {onRequestSwap && (
              <DropdownMenuItem onClick={() => onRequestSwap(exercise.id)} className="cursor-pointer">
                <ArrowRightLeft className="h-4 w-4 mr-2" />
                {t('card.swapExercise')}
              </DropdownMenuItem>
            )}
            {onSkip && (
              <DropdownMenuItem onClick={() => onSkip(exercise.id)} className="cursor-pointer">
                <SkipForward className="h-4 w-4 mr-2" />
                {t('workout.skip')}
              </DropdownMenuItem>
            )}
            {isEditable && (
              <DropdownMenuItem onClick={() => setShowNotes(v => !v)} className="cursor-pointer">
                <StickyNote className="h-4 w-4 mr-2" />
                {t('card.note')}
              </DropdownMenuItem>
            )}
            {isEditable && onPinnedNoteSave && (
              <DropdownMenuItem onClick={() => setPinnedNoteOpen(true)} className="cursor-pointer">
                <Pin className="h-4 w-4 mr-2" />
                {t('notes.pinnedAdd')}
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* ── Set table: nagłówki kolumn → rozgrzewka (badge W) → serie robocze ── */}
      <div className="px-4 sm:px-5 pt-4 pb-2">
        {/* Grid header: SET | PREVIOUS | [unit] | REPS | ✓ | × */}
        {isNewTrackingUi ? (
          <div className={cn("grid gap-2 px-2 pb-2 mb-1", gridCols)}>
            <span className="text-center text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50">{t('card.colSet')}</span>
            {tracking !== 'weight_distance_duration' && (
              <span className="text-center text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50">{t('card.colPrevious')}</span>
            )}
            {tracking === 'weight_distance_duration' && (
              <span className="text-center text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50">{unit}</span>
            )}
            {tracking === 'weight_distance_duration' && (
              <span className="text-center text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50">{t('card.colDistance')}</span>
            )}
            {tracking === 'assisted_bodyweight' && (
              <span className="text-center text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50">{t('card.colAssist')}</span>
            )}
            {tracking === 'assisted_bodyweight' && (
              <span className="text-center text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50">{t('card.colReps')}</span>
            )}
            {(tracking === 'duration' || tracking === 'weight_distance_duration') && (
              <span className="text-center text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50">{t('card.colDuration')}</span>
            )}
            <span className="text-center text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50">✓</span>
            <span />
          </div>
        ) : (
        <div className={cn("grid gap-2 px-2 pb-2 mb-1", gridCols)}>
          <span className="text-center text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50">{t('card.colSet')}</span>
          <span className="text-center text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50">{t('card.colPrevious')}</span>
          {!isBodyweight && (
            <span className="text-center text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50">{unit}</span>
          )}
          <span className="text-center text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50">{t('card.colReps')}</span>
          <span className="text-center text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50">✓</span>
          <span />
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

        {/* X17C Z136.1: pasek przerwy w kontekście serii, nie jako modal kradnący
            ekran (wzorzec Strong). Tyka sam — karta się przez niego nie re-renderuje. */}
        {FEATURE_FLAGS.workoutTimers && isEditable && restRun.runId > 0 && (
          <RestBar
            seconds={restRun.seconds}
            runId={restRun.runId}
            exerciseLabel={localizedName}
            onSkip={() => setRestRun((r) => ({ ...r, runId: 0 }))}
          />
        )}

        {/* Z129.1: „Dodaj serię" pełną szerokością bezpośrednio pod ostatnią serią —
            tam, gdzie user go szuka (wzorzec Hevy/Strong), nie w pasku akcji na dole. */}
        {isEditable && (
          <>
            <button
              onClick={handleAddSet}
              disabled={atSetLimit}
              className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-muted/40 py-3 text-xs font-bold uppercase tracking-[0.14em] text-foreground transition-colors hover:bg-muted/70 hover:text-primary disabled:cursor-not-allowed disabled:opacity-30"
            >
              <Plus className="h-4 w-4" />
              {t('card.addSet')}
            </button>
            {/* Z129.1: nieme `disabled` nie mówiło userowi, dlaczego nie da się kliknąć. */}
            {atSetLimit && (
              <p className="mt-1.5 text-center text-[11px] text-muted-foreground/70">{t('card.addSetLimit')}</p>
            )}
          </>
        )}
      </div>

      {/* ── Pinned note (Z103): trwała notatka nad notatką sesyjną ──
          Z129.2: w karcie TYLKO gdy notatka istnieje. Pusty stan siedzi w menu ⋯
          i dopiero stamtąd otwiera edycję (pinnedNoteOpen). */}
      {(hasPinnedNote || pinnedNoteOpen) && (
        <div className={cn('px-5', !isEditable && 'pb-5')}>
          <PinnedNoteSection
            exerciseName={exercise.name}
            pinnedNote={pinnedNote}
            onSave={isEditable ? onPinnedNoteSave : undefined}
            startInEdit={pinnedNoteOpen && !hasPinnedNote}
          />
        </div>
      )}

      {/* ── Footer ── */}
      {isEditable && (
        <div className="px-5 pb-5 pt-3">
          {/* Z129.2: trzy chipy tej samej wielkości, każdy z etykietą. Dotąd rząd
              mieszał nagie ikony (%, dysk) z etykietowanymi, bez flex-wrap — po
              ikonie nie było widać, że dysk to kalkulator talerzy. */}
          <div className="flex items-stretch gap-1.5" data-testid="exercise-card-chips">
            {(() => {
              // Z108: generator rozgrzewki — tylko weight_reps z ciężarem roboczym,
              // gdy nie ma jeszcze wypełnionych serii rozgrzewkowych (bez duplikacji).
              const hasFilledWarmup = warmupSets.some((s) => s.weight > 0 || s.reps > 0 || s.completed);
              const hasWorkingWeight = workingSets.some((s) => s.weight > 0);
              return tracking === 'weight_reps' && hasWorkingWeight && !hasFilledWarmup ? (
                <button
                  onClick={handleGenerateWarmup}
                  aria-label={t('warmupgen.button')}
                  data-testid="warmup-generate"
                  className={cn(chipClass, 'bg-muted/40 text-foreground/80 hover:text-foreground')}
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
                className={cn(chipClass, 'bg-muted/40 text-foreground/80 hover:text-foreground')}
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
                  showMetrics
                    ? 'bg-primary/10 text-primary'
                    : 'bg-muted/40 text-foreground/80 hover:text-foreground',
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
              ]).map(({ field, label, min, max, step, ph }) => (
                <div key={field} className="flex flex-col gap-1">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50 text-center">{label}</span>
                  <Input
                    type="number"
                    inputMode="decimal"
                    min={min}
                    max={max}
                    step={step}
                    value={metricsState[field] ?? ''}
                    onChange={(e) => handleMetricChange(field, e.target.value)}
                    placeholder={ph}
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

      {/* ── Potwierdzenie usunięcia serii z danymi (Z130) ── */}
      <Dialog open={pendingRemoveIndex !== null} onOpenChange={(open) => { if (!open) setPendingRemoveIndex(null); }}>
        <DialogContent className="max-w-[95vw] w-full sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-base pr-6">{t('card.removeSetConfirmTitle')}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">{t('card.removeSetConfirmDesc')}</p>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setPendingRemoveIndex(null)}
              className="rounded-lg px-3 py-2.5 text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground transition-colors hover:text-foreground"
            >
              {t('common.cancel')}
            </button>
            <button
              type="button"
              onClick={() => {
                if (pendingRemoveIndex !== null) removeSetAt(pendingRemoveIndex);
                setPendingRemoveIndex(null);
              }}
              className="rounded-lg bg-destructive/15 px-3 py-2.5 text-xs font-bold uppercase tracking-[0.14em] text-destructive transition-colors hover:bg-destructive/25"
            >
              {t('common.delete')}
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Instructions Dialog (Z129.2: treść wyprowadzona z karty do menu ⋯) ── */}
      <Dialog open={showInstructions} onOpenChange={setShowInstructions}>
        <DialogContent className="max-w-[95vw] w-full sm:max-w-lg">
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
              onClick={() => navigate(`/exercise/${detailSlug}`)}
              className="mt-1 w-full rounded-lg border border-primary/40 bg-primary/10 px-3 py-2.5 text-xs font-bold uppercase tracking-[0.14em] text-primary transition-colors hover:bg-primary/20"
            >
              {t('card.details')}
            </button>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Animation Dialog ── */}
      {animationUrl && (
        <Dialog open={showVideo} onOpenChange={setShowVideo}>
          <DialogContent className="max-w-[95vw] w-full sm:max-w-lg p-3 sm:p-6">
            <DialogHeader>
              <DialogTitle className="text-sm pr-6">{localizedName}</DialogTitle>
            </DialogHeader>
            <div className="relative w-full overflow-hidden rounded-lg" style={{ paddingBottom: '56.25%' }}>
              {showVideo && (
                <video
                  className="absolute inset-0 w-full h-full object-cover"
                  src={animationUrl}
                  autoPlay
                  loop
                  muted
                  playsInline
                />
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}

      {FEATURE_FLAGS.workoutTimers && intervalSpec && intervalRun.open && (
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
