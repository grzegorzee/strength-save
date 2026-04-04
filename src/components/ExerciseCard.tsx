import { useState, useEffect, useRef, memo, useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Info, Flame, StickyNote, Play, Plus } from 'lucide-react';
import { Exercise } from '@/data/trainingPlan';
import type { SetData } from '@/types';
import { cn } from '@/lib/utils';
import { parseSetCount, sanitizeSets, parseRepRange, getProgressionAdvice } from '@/lib/exercise-utils';

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

// ── Props ──
interface ExerciseCardProps {
  exercise: Exercise;
  index: number;
  savedSets?: SetData[];
  savedNotes?: string;
  previousSets?: SetData[];
  onSetsChange?: (sets: SetData[], notes?: string) => void;
  onSetCompleted?: (lastWeight?: number) => void;
  isEditable?: boolean;
  isBodyweight?: boolean;
}

// ── Main Component ──
const ExerciseCardInner = ({
  exercise,
  index,
  savedSets,
  savedNotes,
  previousSets,
  onSetsChange,
  onSetCompleted,
  isEditable = true,
  isBodyweight = false,
}: ExerciseCardProps) => {
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

  // ── Auto-completion: mark set as completed when reps (+ weight) filled ──
  const handleSetChange = (setIndex: number, field: 'reps' | 'weight', value: number) => {
    if (isBodyweight && field === 'weight') return;
    hasLocalChanges.current = true;

    const currentSet = sets[setIndex];
    const updatedSet = {
      ...currentSet,
      [field]: value,
      ...(isBodyweight && { weight: 0 }),
    };

    // Auto-complete when reps > 0 and (bodyweight or weight > 0)
    const meetsCompletion = updatedSet.reps > 0 && (isBodyweight || updatedSet.weight > 0);
    const wasCompleted = currentSet.completed;
    updatedSet.completed = meetsCompletion;

    const newSets = sets.map((set, i) => (i === setIndex ? updatedSet : set));
    setSets(newSets);
    onSetsChange?.(newSets, notes);

    // Fire rest timer on first transition to complete (not for warmups)
    if (meetsCompletion && !wasCompleted && !currentSet.isWarmup) {
      onSetCompleted?.(updatedSet.weight);
    }
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
  const exerciseLabel = exercise.isSuperset
    ? `${index}${exercise.id.endsWith('a') ? 'a' : 'b'}`
    : `${index}`;

  const progressionAdvice = useMemo(() => {
    if (!previousSets) return null;
    const repRange = parseRepRange(exercise.sets);
    const prevWorking = previousSets.filter(s => !s.isWarmup);
    return getProgressionAdvice(repRange, prevWorking, index - 1, exercise.isSuperset, isBodyweight);
  }, [previousSets, exercise.sets, index, exercise.isSuperset, isBodyweight]);

  const getYouTubeEmbedUrl = (url: string): string | null => {
    const match = url.match(/(?:v=|\/)([\w-]{11})(?:\?|&|$)/);
    return match ? `https://www.youtube.com/embed/${match[1]}?rel=0&modestbranding=1` : null;
  };

  const getPreviousHint = (setIndex: number): string | null => {
    if (!previousSets || previousSets.length === 0) return null;
    const prevSet = previousSets[setIndex];
    if (!prevSet || (prevSet.weight === 0 && prevSet.reps === 0)) return null;
    if (isBodyweight) return `${prevSet.reps} powt.`;
    return `${prevSet.reps}×${prevSet.weight}kg`;
  };

  // Grid columns helper
  const gridCols = isBodyweight ? 'grid-cols-[36px_1fr_36px]' : 'grid-cols-[36px_1fr_1fr_36px]';

  // ── Render set row ──
  const renderSetRow = (set: SetData, globalIndex: number, label: React.ReactNode, isWarmupRow: boolean) => {
    const prevHint = !isWarmupRow ? getPreviousHint(globalIndex) : null;

    return (
      <div key={globalIndex}>
        <div className={cn("grid gap-2 items-center py-1.5 px-1 rounded-lg", gridCols)}>
          {/* Set number / label */}
          <span className={cn(
            "text-sm font-extrabold text-center select-none",
            isWarmupRow ? "text-[hsl(var(--ec-warmup-gold))]" : "text-[hsl(var(--ec-set-number))]"
          )}>
            {label}
          </span>

          {/* Reps */}
          <Input
            type="number"
            inputMode="numeric"
            min={0}
            value={set.reps || ''}
            onChange={(e) => handleSetChange(globalIndex, 'reps', parseInt(e.target.value) || 0)}
            placeholder="—"
            disabled={!isEditable}
            className={cn(
              "exercise-card-input h-10 font-semibold text-[15px] focus-visible:ring-0 focus-visible:ring-offset-0",
              isWarmupRow && "!border-[hsl(var(--ec-warmup-gold-border))]",
              allCompleted && "text-muted-foreground"
            )}
          />

          {/* Weight (non-bodyweight) */}
          {!isBodyweight && (
            <Input
              type="number"
              inputMode="decimal"
              min={0}
              step={0.5}
              value={set.weight || ''}
              onChange={(e) => handleSetChange(globalIndex, 'weight', parseFloat(e.target.value) || 0)}
              placeholder="—"
              disabled={!isEditable}
              className={cn(
                "exercise-card-input h-10 font-semibold text-[15px] focus-visible:ring-0 focus-visible:ring-offset-0",
                isWarmupRow && "!border-[hsl(var(--ec-warmup-gold-border))]",
                allCompleted && "text-muted-foreground"
              )}
            />
          )}

          {/* Delete button */}
          <div className="flex justify-center">
            {isEditable && !allCompleted && !isWarmupRow && workingSets.length > 1 ? (
              <button
                onClick={() => handleRemoveSet(globalIndex)}
                className="h-9 w-9 rounded-lg flex items-center justify-center text-[22px] leading-none text-[hsl(var(--ec-delete))] hover:text-destructive hover:bg-destructive/10 transition-colors"
              >
                &times;
              </button>
            ) : (
              <span className="w-9" />
            )}
          </div>
        </div>

        {/* Previous workout hint */}
        {prevHint && !set.completed && (
          <div className="flex items-center gap-1.5 pl-[44px] pb-1 text-[11px]">
            <span className="text-muted-foreground">↳ Poprzednio:</span>
            <span className="font-semibold px-1.5 py-0.5 rounded bg-primary/10 text-primary">
              {prevHint}
            </span>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className={cn(
      "exercise-card",
      exercise.isSuperset && "border-l-[3px] !border-l-primary",
      allCompleted && "opacity-50"
    )}>
      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-3 p-5 pb-3">
        <div className="flex items-start gap-3 min-w-0">
          {/* Number badge */}
          <div className={cn(
            "h-[42px] w-[42px] rounded-xl flex items-center justify-center text-[17px] font-extrabold text-white shrink-0",
            allCompleted
              ? "bg-gradient-to-br from-emerald-500 to-emerald-400"
              : "bg-gradient-to-br from-indigo-500 to-indigo-400"
          )}>
            {exerciseLabel}
          </div>

          <div className="min-w-0 pt-0.5">
            <h3 className="font-bold text-[15px] leading-tight">{exercise.name}</h3>
            <div className="flex items-center gap-2.5 mt-1.5 flex-wrap">
              <span className="font-mono text-xs text-muted-foreground tracking-wide">
                {exercise.sets}
              </span>
              {progressionAdvice && <ProgressionBadge advice={progressionAdvice} />}
              {completedSets > 0 && (
                <span className="text-[11px] font-bold text-emerald-400 flex items-center gap-1">
                  <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
                    <path d="M3 8.5l3.5 3.5 6.5-7" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  {completedSets}/{workingSets.length}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Video button */}
        {exercise.videoUrl && (
          <button
            onClick={() => setShowVideo(true)}
            className="h-[34px] w-[34px] rounded-[10px] flex items-center justify-center text-muted-foreground hover:text-primary hover:bg-primary/5 transition-colors shrink-0 mt-1"
          >
            <Play className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* ── Divider ── */}
      <div className="exercise-card-divider mx-5" />

      {/* ── Instructions (always visible) ── */}
      {exercise.instructions.length > 0 && (
        <div className="mx-5 mt-3 py-2.5 px-3.5 rounded-r-lg border-l-2 border-primary/20 bg-primary/[0.03] space-y-2">
          {exercise.instructions.map((inst, i) => (
            <div key={i} className="flex gap-2">
              <Info className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-medium text-primary">{inst.title}</p>
                <p className="text-xs text-muted-foreground leading-relaxed">{inst.content}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Warmup section ── */}
      {warmupSets.length > 0 && (
        <div className="px-5 pt-3">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-widest mb-2.5 text-[hsl(var(--ec-warmup-gold))] border border-[hsl(var(--ec-warmup-gold-border))] bg-[hsl(var(--ec-warmup-gold-bg))]">
            <Flame className="h-3 w-3" />
            Rozgrzewka
          </div>
          {warmupSets.map((set, wi) => {
            const globalIndex = sets.indexOf(set);
            return renderSetRow(set, globalIndex, 'W', true);
          })}
          <div className="exercise-card-divider mt-2" />
        </div>
      )}

      {/* ── Working sets grid ── */}
      <div className="px-5 pt-3 pb-2">
        {/* Grid header */}
        <div className={cn("grid gap-2 px-1 pb-2 mb-1 border-b border-border/30", gridCols)}>
          <span />
          <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">
            Powtórzenia
          </span>
          {!isBodyweight && (
            <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">
              Ciężar (kg)
            </span>
          )}
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
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-[11px] font-bold uppercase tracking-wider text-primary border border-primary/15 hover:bg-primary/5 hover:border-primary/30 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <Plus className="h-3.5 w-3.5" />
              Dodaj serię
            </button>
            {!showNotes && (
              <button
                onClick={() => setShowNotes(true)}
                className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground/40 hover:text-muted-foreground transition-colors px-3 py-2"
              >
                <StickyNote className="h-3.5 w-3.5" />
                Notatka
              </button>
            )}
          </div>
          {showNotes && (
            <Textarea
              placeholder="Notatki do ćwiczenia..."
              value={notes}
              onChange={(e) => handleNotesChange(e.target.value)}
              className="mt-3 min-h-[60px] text-sm exercise-card-input !text-left"
            />
          )}
        </div>
      )}

      {/* ── Video Dialog ── */}
      {exercise.videoUrl && (
        <Dialog open={showVideo} onOpenChange={setShowVideo}>
          <DialogContent className="max-w-[95vw] w-full sm:max-w-lg p-3 sm:p-6">
            <DialogHeader>
              <DialogTitle className="text-sm pr-6">{exercise.name}</DialogTitle>
            </DialogHeader>
            <div className="relative w-full" style={{ paddingBottom: '56.25%' }}>
              {showVideo && (
                <iframe
                  className="absolute inset-0 w-full h-full rounded-lg"
                  src={getYouTubeEmbedUrl(exercise.videoUrl) || ''}
                  title={exercise.name}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
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
