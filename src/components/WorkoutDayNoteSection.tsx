import { useEffect, useState } from 'react';
import { StickyNote } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { useTranslation } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import { WORKOUT_DAY_NOTE_MAX_LENGTH, type WorkoutDayNote } from '@/lib/workout-day-notes';

interface WorkoutDayNoteSectionProps {
  dateISO: string;
  dayNote?: WorkoutDayNote;
  /** Brak = tylko podgląd. */
  onSave?: (dateISO: string, note: string) => Promise<void> | void;
  /** Przyszła data: dopisek "zobaczysz ją przy starcie". */
  showFutureHint?: boolean;
  className?: string;
}

/**
 * Notatka przypięta do DNIA treningu (T10, feedback 2026-08-20): planowanie
 * przyszłego treningu z Planu ("wziąć pas", "spróbować 80 kg"), widoczna też
 * przed startem i w trakcie sesji. Zapis dopiero po zatwierdzeniu (wzorzec
 * PinnedNoteSection). OSOBNY byt od dayNotes draftu sesji.
 */
export const WorkoutDayNoteSection = ({ dateISO, dayNote, onSave, showFutureHint = false, className }: WorkoutDayNoteSectionProps) => {
  const { t } = useTranslation();
  const [isEditing, setIsEditing] = useState(false);
  const [noteDraft, setNoteDraft] = useState(dayNote?.note ?? '');

  // Sync draftu, gdy notatka doleci z subskrypcji po pierwszym renderze.
  useEffect(() => {
    if (isEditing) return;
    setNoteDraft(dayNote?.note ?? '');
  }, [dayNote, isEditing]);

  const hasNote = Boolean(dayNote?.note);
  if (!hasNote && !onSave) return null;

  const handleSave = () => {
    setIsEditing(false);
    void onSave?.(dateISO, noteDraft);
  };

  const handleCancel = () => {
    setIsEditing(false);
    setNoteDraft(dayNote?.note ?? '');
  };

  return (
    <div className={cn('rounded-lg bg-surface-lowest px-3 py-2.5', className)} data-testid="workout-day-note-section">
      <div className="flex items-center justify-between gap-2">
        <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-primary">
          <StickyNote className="h-3 w-3" />
          {t('daynote.title')}
          {showFutureHint && (
            <span className="font-semibold normal-case tracking-normal text-muted-foreground/60">{t('daynote.futureHint')}</span>
          )}
        </span>
        {onSave && !isEditing && (
          <button
            type="button"
            onClick={() => setIsEditing(true)}
            className="text-[11px] font-semibold text-muted-foreground hover:text-primary transition-colors"
            data-testid="workout-day-note-edit"
          >
            {hasNote ? t('common.edit') : t('daynote.add')}
          </button>
        )}
      </div>

      {!isEditing && hasNote && (
        <p className="mt-1.5 text-sm leading-snug whitespace-pre-wrap" data-testid="workout-day-note-text">{dayNote?.note}</p>
      )}

      {isEditing && (
        <div className="mt-2 space-y-2">
          <Textarea
            value={noteDraft}
            onChange={(e) => setNoteDraft(e.target.value)}
            placeholder={t('daynote.placeholder')}
            maxLength={WORKOUT_DAY_NOTE_MAX_LENGTH}
            className="min-h-[60px] text-sm exercise-card-input !text-left"
            data-testid="workout-day-note-input"
          />
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={handleCancel}
              className="rounded-lg px-3 py-2 text-[11px] font-semibold text-muted-foreground hover:text-foreground transition-colors"
            >
              {t('common.cancel')}
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="rounded-lg border border-primary/40 bg-primary/10 px-3 py-2 text-[11px] font-semibold text-primary transition-colors hover:bg-primary/20"
              data-testid="workout-day-note-save"
            >
              {t('common.save')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
