import { useEffect, useState } from 'react';
import { Pin } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useTranslation } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import type { ExerciseNote } from '@/lib/exercise-notes';

export interface PinnedNoteSaveInput {
  note?: string;
  machineSettings?: string;
}

interface PinnedNoteSectionProps {
  exerciseName: string;
  pinnedNote?: ExerciseNote;
  /** Brak = tylko podgląd (widoki historyczne). */
  onSave?: (exerciseName: string, input: PinnedNoteSaveInput) => Promise<void> | void;
  className?: string;
}

/**
 * Przypięta notatka per ćwiczenie (Z103): trwała, widoczna w każdej sesji z tym
 * ćwiczeniem, niezależnie od planu. Zapis dopiero po zatwierdzeniu (nie per znak).
 */
export const PinnedNoteSection = ({ exerciseName, pinnedNote, onSave, className }: PinnedNoteSectionProps) => {
  const { t } = useTranslation();
  const [isEditing, setIsEditing] = useState(false);
  const [noteDraft, setNoteDraft] = useState(pinnedNote?.note ?? '');
  const [machineDraft, setMachineDraft] = useState(pinnedNote?.machineSettings ?? '');

  // Sync draftu, gdy notatka doleci z subskrypcji po pierwszym renderze.
  useEffect(() => {
    if (isEditing) return;
    setNoteDraft(pinnedNote?.note ?? '');
    setMachineDraft(pinnedNote?.machineSettings ?? '');
  }, [pinnedNote, isEditing]);

  const hasNote = Boolean(pinnedNote?.note || pinnedNote?.machineSettings);
  if (!hasNote && !onSave) return null;

  const handleSave = () => {
    setIsEditing(false);
    void onSave?.(exerciseName, { note: noteDraft, machineSettings: machineDraft });
  };

  const handleCancel = () => {
    setIsEditing(false);
    setNoteDraft(pinnedNote?.note ?? '');
    setMachineDraft(pinnedNote?.machineSettings ?? '');
  };

  return (
    <div className={cn('rounded-lg bg-surface-lowest px-3 py-2.5', className)} data-testid="pinned-note-section">
      <div className="flex items-center justify-between gap-2">
        <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-primary">
          <Pin className="h-3 w-3" />
          {t('notes.pinnedTitle')}
          <span className="font-semibold normal-case tracking-normal text-muted-foreground/60">{t('notes.pinnedAlways')}</span>
        </span>
        {onSave && !isEditing && (
          <button
            type="button"
            onClick={() => setIsEditing(true)}
            className="text-[11px] font-semibold text-muted-foreground hover:text-primary transition-colors"
            data-testid="pinned-note-edit"
          >
            {hasNote ? t('common.edit') : t('notes.pinnedAdd')}
          </button>
        )}
      </div>

      {!isEditing && hasNote && (
        <div className="mt-1.5 space-y-1">
          {pinnedNote?.note && (
            <p className="text-sm leading-snug whitespace-pre-wrap" data-testid="pinned-note-text">{pinnedNote.note}</p>
          )}
          {pinnedNote?.machineSettings && (
            <p className="text-xs text-fitness-cyan/90" data-testid="pinned-note-machine">
              {t('notes.machineLabel')}: {pinnedNote.machineSettings}
            </p>
          )}
        </div>
      )}

      {isEditing && (
        <div className="mt-2 space-y-2">
          <Textarea
            value={noteDraft}
            onChange={(e) => setNoteDraft(e.target.value)}
            placeholder={t('notes.pinnedPlaceholder')}
            maxLength={500}
            className="min-h-[60px] text-sm exercise-card-input !text-left"
            data-testid="pinned-note-input"
          />
          <Input
            value={machineDraft}
            onChange={(e) => setMachineDraft(e.target.value)}
            placeholder={t('notes.machinePlaceholder')}
            maxLength={200}
            className="h-10 text-sm exercise-card-input !text-left"
            data-testid="pinned-note-machine-input"
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
              data-testid="pinned-note-save"
            >
              {t('common.save')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
