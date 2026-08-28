import { cn } from '@/lib/utils';

// WP-H (X28), design 2a (design-history-tiles.md): kafel cyklu na poziomie 1
// Historii. Góra: tag (aktywny: "Aktywny · tydz. n" w akcencie; przeszły:
// "{n} tyg." muted) + liczba PR po prawej, pod spodem sparkline tonażu
// tygodniowego. Dół: nazwa, meta "{sesje} · {tonaż}", zakres dat.
// color-mix z designu mapowany na klasy /10 /15 /30 /40 (zakaz color-mix).

interface CycleTileProps {
  name: string;
  /** Tag w wierszu górnym (np. "Aktywny · tydz. 4" / "8 tyg."); null = bez tagu. */
  tag: string | null;
  /** Tag w akcencie (aktywny cykl). */
  tagAccent?: boolean;
  prCount: number;
  prLabel: string;
  /** Tonaż kg per tydzień (indeks 0 = tydzień 1); null = brak danych (bez słupków). */
  sparkline: number[] | null;
  /** Numer bieżącego tygodnia (pełny akcent słupka) — tylko cykl aktywny. */
  currentWeekNo?: number | null;
  /** Meta "{sesje} · {tonaż}". */
  metaLabel: string;
  /** Zakres dat (aktywny cykl: z "teraz" — guard E-8UE4S); null = bez zakresu. */
  rangeLabel: string | null;
  variant: 'active' | 'past' | 'outside';
  onOpen: () => void;
}

export const CycleTile = ({
  name, tag, tagAccent, prCount, prLabel, sparkline, currentWeekNo,
  metaLabel, rangeLabel, variant, onOpen,
}: CycleTileProps) => {
  const sparkMax = sparkline ? Math.max(...sparkline) : 0;

  return (
    <button
      type="button"
      data-testid="cycle-tile"
      data-variant={variant}
      onClick={onOpen}
      className={cn(
        'flex min-w-0 flex-col gap-3 rounded-[20px] p-3.5 text-left',
        variant === 'active' && 'bg-primary/10',
        variant === 'past' && 'bg-surface-high',
        variant === 'outside' && 'bg-surface-low',
      )}
    >
      <div className="flex w-full items-baseline justify-between gap-2">
        {tag !== null && (
          <span className={cn(
            'truncate font-mono text-[11px] font-bold uppercase tracking-[0.12em]',
            tagAccent ? 'text-primary' : 'text-muted-foreground',
          )}
          >
            {tag}
          </span>
        )}
        {prCount > 0 && (
          <span className="ml-auto shrink-0 font-mono text-[11px] font-semibold text-primary tabular-nums">
            {prLabel}
          </span>
        )}
      </div>

      {sparkline && sparkMax > 0 && (
        <div className="flex h-8 w-full items-end gap-[2.5px]">
          {sparkline.map((value, index) => (
            <div
              key={index}
              className={cn(
                'flex-1 rounded-[2px]',
                // Tydzień bez tonażu = neutralny ślad toru, nie akcent.
                value <= 0
                  ? 'bg-surface-highest'
                  : index + 1 === currentWeekNo
                    ? 'bg-primary'
                    : variant === 'active' ? 'bg-primary/40' : 'bg-primary/30',
              )}
              style={{ height: value <= 0 ? '3px' : `${Math.max(12, Math.round((value / sparkMax) * 100))}%` }}
            />
          ))}
        </div>
      )}

      <div className="min-w-0 w-full">
        <p className="truncate font-heading text-[15px] font-bold">{name}</p>
        <p className="mt-0.5 truncate font-mono text-[11px] uppercase tracking-[0.08em] text-muted-foreground tabular-nums">
          {metaLabel}
        </p>
        {rangeLabel && (
          <p className="mt-0.5 truncate text-[11px] text-muted-foreground">{rangeLabel}</p>
        )}
      </div>
    </button>
  );
};
