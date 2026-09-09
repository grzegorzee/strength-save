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
  /** Z129.2: otwarcie z menu ⋯ — pusta notatka startuje od razu w edycji. */
  startInEdit?: boolean;
}

/**
 * Przypięta notatka per ćwiczenie (Z103): trwała, widoczna w każdej sesji z tym
 * ćwiczeniem, niezależnie od planu. Zapis dopiero po zatwierdzeniu (nie per znak).
 */
export const PinnedNoteSection = ({ exerciseName, pinnedNote, onSave, className, startInEdit = false }: PinnedNoteSectionProps) => {
  const { t } = useTranslation();
  const [isEditing, setIsEditing] = useState(startInEdit);
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
    <div className={cn('rounded-lg bg-surface-lowest px-3 py-1', className)} data-testid="pinned-note-section" aria-label={t('notes.pinnedTitle')}>
      <div className="flex min-h-11 items-center gap-2">
        <Pin className="h-3.5 w-3.5 shrink-0 text-primary/80" aria-hidden />
        <div className="min-w-0 flex-1 py-1.5">
          {isEditing || !hasNote ? (
            <span className="text-xs font-medium text-muted-foreground">{t('notes.pinnedTitle')}</span>
          ) : (
            <div className="space-y-0.5">
              {pinnedNote?.note && (
                <p className="break-words text-sm leading-snug whitespace-pre-wrap" data-testid="pinned-note-text">{pinnedNote.note}</p>
              )}
              {pinnedNote?.machineSettings && (
                <p className="break-words whitespace-pre-wrap text-xs leading-snug text-muted-foreground" data-testid="pinned-note-machine">
                  {t('notes.machineLabel')}: {pinnedNote.machineSettings}
                </p>
              )}
            </div>
          )}
        </div>
        {onSave && !isEditing && (
          <button
            type="button"
            onClick={() => setIsEditing(true)}
            className="-mr-2 inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center self-start px-2 text-xs font-medium text-muted-foreground hover:text-primary transition-colors"
            data-testid="pinned-note-edit"
          >
            {hasNote ? t('common.edit') : t('notes.pinnedAdd')}
          </button>
        )}
      </div>

      {isEditing && (
        <div className="space-y-2 pb-2">
          <p className="text-xs leading-snug text-muted-foreground">{t('notes.pinnedAlways')}</p>
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
            className="h-11 text-sm exercise-card-input !text-left"
            data-testid="pinned-note-machine-input"
          />
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={handleCancel}
              className="min-h-11 min-w-11 rounded-lg px-3 py-2 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
            >
              {t('common.cancel')}
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="min-h-11 min-w-11 rounded-lg border border-primary/40 bg-primary/10 px-3 py-2 text-xs font-semibold text-primary transition-colors hover:bg-primary/20"
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
