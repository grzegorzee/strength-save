import { useState, useEffect, useRef, memo, useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Dumbbell, Flame, StickyNote, Play, Plus, Sparkles, Loader2 } from 'lucide-react';
import { Exercise } from '@/data/trainingPlan';
import type { SetData } from '@/types';
import { cn } from '@/lib/utils';
import { parseSetCount, sanitizeSets, parseRepRange, getProgressionAdvice, getExerciseInstructions } from '@/lib/exercise-utils';
import { getExerciseAnimationUrl } from '@/lib/exercise-media';
import { useUnit } from '@/contexts/UnitContext';
import { useTranslation } from '@/contexts/LanguageContext';
import type { NextSetAdvice } from '@/lib/next-set-advice';

// ── Progression Badge sub-component ──
const ProgressionBadge = ({ advice }: { advice: { type: 'increase' | 'repeat' | 'maintain'; label: string } }) => {
  const styles = {
    increase: 'border-green-500/30 text-green-400 bg-green-500/10 dark:text-green-400 dark:border-green-500/30',
    repeat: 'border-yellow-500/30 text-yellow-400 bg-yellow-500/10 dark:text-yellow-400 dark:border-yellow-500/30',
    maintain: 'border-red-500/30 text-red-400 bg-red-500/10 dark:text-red-400 dark:border-red-500/30',
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
  const styles: Record<NextSetAdvice['kind'], string> = {
    progress: 'border-green-500/30 text-green-400 bg-green-500/10',
    hold: 'border-yellow-500/30 text-yellow-400 bg-yellow-500/10',
    deload: 'border-orange-500/40 text-orange-400 bg-orange-500/10',
  };
  const labels: Record<NextSetAdvice['kind'], string> = {
    progress: t('card.target'),
    hold: t('card.target'),
    deload: t('card.deload'),
  };
  const target = advice.isBodyweight
    ? t('card.repsValue', { n: advice.targetReps })
    : `${advice.targetWeight} kg × ${advice.targetReps}`;
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

// ── Props ──
interface ExerciseCardProps {
  exercise: Exercise;
  index: number;
  savedSets?: SetData[];
  savedNotes?: string;
  previousSets?: SetData[];
  onSetsChange?: (sets: SetData[], notes?: string) => void;
  isEditable?: boolean;
  isBodyweight?: boolean;
  nextAdvice?: NextSetAdvice | null;
  onAskCoach?: () => void;
  coachBusy?: boolean;
}

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
  onAskCoach,
  coachBusy = false,
}: ExerciseCardProps) => {
  const { t } = useTranslation();
  const setCount = useMemo(() => parseSetCount(exercise.sets), [exercise.sets]);
  const [showVideo, setShowVideo] = useState(false);
  const [sets, setSets] = useState<SetData[]>(() => sanitizeSets(savedSets, setCount));
  const [notes, setNotes] = useState(savedNotes || '');
  const [showNotes, setShowNotes] = useState(!!savedNotes);

  const hasLocalChanges = useRef(false);
  const isInitialized = useRef(false);

  useEffect(() => {
    if (!isInitialized.current || !hasLocalChanges.current) {
      setSets(sanitizeSets(savedSets, setCount));
      setNotes(savedNotes || '');
      setShowNotes(!!savedNotes);
      isInitialized.current = true;
    }
  }, [savedSets, savedNotes, setCount]);

  // ── Edit a set value (no auto-completion — completion is confirmed via the checkmark) ──
  const handleSetChange = (setIndex: number, field: 'reps' | 'weight', value: number) => {
    if (isBodyweight && field === 'weight') return;
    hasLocalChanges.current = true;

    const updatedSet = {
      ...sets[setIndex],
      [field]: value,
      ...(isBodyweight && { weight: 0 }),
    };

    const newSets = sets.map((set, i) => (i === setIndex ? updatedSet : set));
    setSets(newSets);
    onSetsChange?.(newSets, notes);
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

    const updatedSet: SetData = {
      ...currentSet,
      reps,
      weight: isBodyweight ? 0 : weight,
      completed: turningOn,
    };
    const newSets = sets.map((set, i) => (i === setIndex ? updatedSet : set));
    setSets(newSets);
    onSetsChange?.(newSets, notes);
  };

  const handleNotesChange = (value: string) => {
    hasLocalChanges.current = true;
    setNotes(value);
    onSetsChange?.(sets, value);
  };

  const handleAddSet = () => {
    hasLocalChanges.current = true;
    const lastWorking = [...sets].reverse().find(s => !s.isWarmup);
    const newSet: SetData = {
      reps: lastWorking?.reps ?? 0,
      weight: isBodyweight ? 0 : (lastWorking?.weight ?? 0),
      completed: false,
    };
    const newSets = [...sets, newSet];
    setSets(newSets);
    onSetsChange?.(newSets, notes);
  };

  const handleRemoveSet = (setIndex: number) => {
    hasLocalChanges.current = true;
    const newSets = sets.filter((_, idx) => idx !== setIndex);
    setSets(newSets);
    onSetsChange?.(newSets, notes);
  };

  // ── Computed ──
  const warmupSets = sets.filter(s => s.isWarmup);
  const workingSets = sets.filter(s => !s.isWarmup);
  const completedSets = workingSets.filter(s => s.completed).length;
  const allCompleted = workingSets.length > 0 && completedSets === workingSets.length;
  const animationUrl = getExerciseAnimationUrl(exercise.name);
  const { unit, toDisplay, fromInput } = useUnit();

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
    return getProgressionAdvice(repRange, prevWorking, index - 1, exercise.isSuperset, isBodyweight);
  }, [previousSets, exercise.sets, index, exercise.isSuperset, isBodyweight]);

  const getPreviousHint = (setIndex: number): string | null => {
    if (!previousSets || previousSets.length === 0) return null;
    const prevSet = previousSets[setIndex];
    if (!prevSet || (prevSet.weight === 0 && prevSet.reps === 0)) return null;
    if (isBodyweight) return t('card.repsValue', { n: prevSet.reps });
    return `${prevSet.reps}×${prevSet.weight}kg`;
  };

  // Grid: SET | PREVIOUS | [KG] | REPS | ✓ | × (mockup [17])
  const gridCols = isBodyweight
    ? 'grid-cols-[26px_minmax(0,1fr)_1fr_40px_22px]'
    : 'grid-cols-[26px_minmax(0,1fr)_1fr_1fr_40px_22px]';

  // ── Render set row ──
  const renderSetRow = (set: SetData, globalIndex: number, label: React.ReactNode, isWarmupRow: boolean) => {
    const prevHint = !isWarmupRow ? getPreviousHint(globalIndex) : null;
    const isActive = !isWarmupRow && globalIndex === activeSetIndex;
    const displayWeight = set.weight
      ? (unit === 'lbs' ? Number(toDisplay(set.weight).toFixed(1)) : set.weight)
      : '';

    return (
      <div
        key={globalIndex}
        className={cn(
          'grid items-center gap-2 rounded-xl px-2 py-1.5 transition-colors',
          gridCols,
          isActive && 'bg-primary/[0.04] ring-2 ring-primary',
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

        {/* PREVIOUS */}
        <span className="truncate text-center text-xs tabular-nums text-muted-foreground">
          {isWarmupRow ? '—' : (prevHint || '—')}
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
              set.completed ? 'bg-accent text-accent-foreground' : 'bg-surface-highest text-transparent hover:text-accent/40',
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
          <button
            type="button"
            onClick={() => animationUrl && setShowVideo(true)}
            disabled={!animationUrl}
            className="relative h-[72px] w-[92px] rounded-2xl overflow-hidden shrink-0 bg-background/70 disabled:cursor-default"
            aria-label={animationUrl ? t('card.showAnimation', { name: exercise.name }) : undefined}
          >
            {animationUrl ? (
              <>
                <video src={animationUrl} className="h-full w-full object-cover opacity-80" autoPlay loop muted playsInline />
                <span className="absolute inset-0 flex items-center justify-center bg-black/10">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-black/55 text-white backdrop-blur-sm">
                    <Play className="h-3.5 w-3.5 fill-current" />
                  </span>
                </span>
              </>
            ) : (
              <Dumbbell className="absolute inset-0 m-auto h-7 w-7 text-muted-foreground/40" />
            )}
          </button>

          <div className="min-w-0">
            <h3 className="font-bold text-[16px] leading-tight">{exercise.name}</h3>
            <div className="flex items-center gap-2.5 mt-1.5 flex-wrap">
              <span className="text-sm font-medium text-muted-foreground">
                {t('card.setsCount', { n: workingSets.length })}
              </span>
              {nextAdvice ? <NextTargetBadge advice={nextAdvice} /> : progressionAdvice && <ProgressionBadge advice={progressionAdvice} />}
              {completedSets > 0 && (
                <span className="text-[11px] font-bold text-emerald-400 flex items-center gap-1">
                  <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
                    <path d="M3 8.5l3.5 3.5 6.5-7" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  {completedSets}/{workingSets.length}
                </span>
              )}
            </div>
            {nextAdvice && completedSets === 0 && (
              <p className="text-[11px] text-muted-foreground/80 mt-1.5 leading-snug">{nextAdvice.reason}</p>
            )}
          </div>
        </div>

        <span className="w-2 shrink-0" aria-hidden="true" />
      </div>

      {/* ── Divider ── */}
      <div className="exercise-card-divider" />

      {/* ── Instructions (always visible, with library fallback) ── */}
      {(() => {
        const displayInstructions = exercise.instructions.length > 0
          ? exercise.instructions
          : getExerciseInstructions(exercise.name);
        if (displayInstructions.length === 0) return null;
        return (
          <div className="mx-5 mt-4 text-sm text-muted-foreground/80 leading-relaxed font-medium">
            {displayInstructions.map(inst => inst.content).join(' ')}
          </div>
        );
      })()}

      {/* ── Warmup section ── */}
      {warmupSets.length > 0 && (
        <div className="px-5 pt-3">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-widest mb-2.5 text-[hsl(var(--ec-warmup-gold))] border border-[hsl(var(--ec-warmup-gold-border))] bg-[hsl(var(--ec-warmup-gold-bg))]">
            <Flame className="h-3 w-3" />
            {t('comp.warmup.title')}
          </div>
          {warmupSets.map((set, wi) => {
            const globalIndex = sets.indexOf(set);
            return renderSetRow(set, globalIndex, 'W', true);
          })}
          <div className="exercise-card-divider mt-2" />
        </div>
      )}

      {/* ── Working sets grid ── */}
      <div className="px-4 sm:px-5 pt-4 pb-2">
        {/* Grid header: SET | PREVIOUS | [unit] | REPS | ✓ | × */}
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

        {/* Set rows */}
        {workingSets.map((set, wi) => {
          const globalIndex = sets.indexOf(set);
          return renderSetRow(set, globalIndex, wi + 1, false);
        })}
      </div>

      {/* ── Footer ── */}
      {isEditable && (
        <div className="px-5 pb-5">
          <div className="exercise-card-divider mb-3" />
          <div className="flex items-center justify-between">
            <button
              onClick={handleAddSet}
              disabled={workingSets.length >= 10}
              className="inline-flex items-center gap-2 py-2 text-xs font-bold uppercase tracking-[0.14em] text-foreground hover:text-primary transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            >
              {t('card.addSet')}
              <Plus className="h-5 w-5" />
            </button>
            <div className="flex items-center gap-1">
              {onAskCoach && (
                <button
                  onClick={onAskCoach}
                  disabled={coachBusy}
                  className="inline-flex items-center gap-1.5 text-[11px] text-primary/70 hover:text-primary transition-colors px-3 py-2 disabled:opacity-50"
                >
                  {coachBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                  {t('card.coachAi')}
                </button>
              )}
              {!showNotes && (
                <button
                  onClick={() => setShowNotes(true)}
                  className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground/40 hover:text-muted-foreground transition-colors px-3 py-2"
                >
                  <StickyNote className="h-3.5 w-3.5" />
                  {t('card.note')}
                </button>
              )}
            </div>
          </div>
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

      {/* ── Animation Dialog ── */}
      {animationUrl && (
        <Dialog open={showVideo} onOpenChange={setShowVideo}>
          <DialogContent className="max-w-[95vw] w-full sm:max-w-lg p-3 sm:p-6">
            <DialogHeader>
              <DialogTitle className="text-sm pr-6">{exercise.name}</DialogTitle>
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
    </div>
  );
};

export const ExerciseCard = memo(ExerciseCardInner);
