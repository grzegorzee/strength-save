import { ChevronRight } from 'lucide-react';

interface ExerciseListRowProps {
  name: string;
  /** Zlokalizowany typ (Wielostawowe / Izolacja / Masa ciala). */
  typeLabel: string;
  /** Brak = wiersz informacyjny bez nawigacji (custom exercise nie ma /exercise/:slug). */
  onOpen?: () => void;
}

/**
 * X27 WP-E: wiersz listy cwiczen w widoku grupy (poziom 2). Nazwa + typ w mono,
 * chevron tylko gdy wiersz prowadzi do szczegolow (design-exercises-tab.md).
 * BEST/PR swiadomie pominiete: brak taniego agregatu per cwiczenie, a ladowanie
 * pelnej historii na tej stronie to koszt Firestore (plan WP-E, spec pkt 4).
 */
export const ExerciseListRow = ({ name, typeLabel, onOpen }: ExerciseListRowProps) => {
  const inner = (
    <>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium">{name}</span>
        <span className="eyebrow-mono mt-0.5 block text-muted-foreground">{typeLabel}</span>
      </span>
      {onOpen && <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground/50" />}
    </>
  );

  const className = 'flex min-h-[56px] w-full items-center gap-3 px-4 py-2.5';

  if (!onOpen) {
    return (
      <div data-testid="group-exercise-row" className={className}>
        {inner}
      </div>
    );
  }

  return (
    <button
      type="button"
      data-testid="group-exercise-row"
      onClick={onOpen}
      className={`${className} text-left transition-colors hover:bg-surface-high`}
    >
      {inner}
    </button>
  );
};
