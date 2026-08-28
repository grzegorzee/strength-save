import { Check } from 'lucide-react';
import { useTranslation } from '@/contexts/LanguageContext';
import {
  PALETTE_THEMES,
  applyPaletteTheme,
  storePaletteTheme,
  type PaletteThemeV2,
} from '@/lib/palette-theme';
import { cn } from '@/lib/utils';

interface PaletteThemePickerProps {
  /** Zachowany dla zgodności wywołań; wybór palety nie czyta już legacy id. */
  currentAccentId?: string;
  currentPalette: PaletteThemeV2 | null;
  onConfirm: (palette: PaletteThemeV2) => void;
  className?: string;
  compact?: boolean;
}

// A2 (X70, decyzja właściciela): tap na kartę ZAPISUJE od razu — w Profilu tak
// samo jak w onboardingu. Bez trybu preview/cancel/confirm, więc wyjście z
// sekcji niczego nie cofa. `compact` steruje wyłącznie układem kart.
export const PaletteThemePicker = ({
  currentPalette,
  onConfirm,
  className,
  compact = false,
}: PaletteThemePickerProps) => {
  const { t } = useTranslation();

  const selectPalette = (palette: PaletteThemeV2) => {
    const stored = storePaletteTheme(palette);
    if (!stored) return;
    applyPaletteTheme(stored);
    onConfirm(stored);
  };

  const selectedId = currentPalette?.id ?? null;

  return (
    <div className={cn('space-y-3', className)} data-testid="palette-theme-picker">
      <div className={cn('grid gap-2', compact ? 'grid-cols-3' : 'sm:grid-cols-3')} role="radiogroup" aria-label={t('palette.title')}>
        {PALETTE_THEMES.map((palette, index) => {
          const selected = selectedId === palette.id;
          const label = t(`palette.${palette.id}.name`);
          // A3: Pulse to domyślny wygląd aplikacji — mówimy to wprost w opisie.
          const description = palette.id === 'pulse'
            ? `${t('palette.pulse.description')} ${t('palette.defaultHint')}`
            : t(`palette.${palette.id}.description`);
          return (
            <button
              key={palette.id}
              type="button"
              role="radio"
              aria-checked={selected}
              tabIndex={selected || (!selectedId && index === 0) ? 0 : -1}
              aria-label={`${label}. ${description}`}
              onClick={() => selectPalette(palette)}
              onKeyDown={(event) => {
                if (!['ArrowRight', 'ArrowDown', 'ArrowLeft', 'ArrowUp', 'Home', 'End'].includes(event.key)) return;
                event.preventDefault();
                const buttons = Array.from(event.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>('[role="radio"]') ?? []);
                if (!buttons.length) return;
                const current = buttons.indexOf(event.currentTarget);
                const next = event.key === 'Home'
                  ? 0
                  : event.key === 'End'
                    ? buttons.length - 1
                    : (current + (event.key === 'ArrowRight' || event.key === 'ArrowDown' ? 1 : -1) + buttons.length) % buttons.length;
                buttons[next]?.focus();
                buttons[next]?.click();
              }}
              className={cn(
                'relative min-h-12 rounded-xl border-2 bg-background/60 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                compact ? 'min-h-16 p-2 text-center' : 'p-3',
                selected ? 'border-primary ring-1 ring-primary' : 'border-muted-foreground hover:border-primary',
              )}
            >
              <span className={cn('flex items-center gap-1.5', compact ? 'mb-1 justify-center' : 'mb-2')} aria-hidden>
                {[palette.primary, palette.supportA, palette.supportB].map((hex, index) => (
                  <span
                    key={hex}
                    className={cn('rounded-full border border-black/20', compact ? 'h-4 w-4' : cn('h-5', index === 0 ? 'w-8' : 'w-5'))}
                    style={{ backgroundColor: hex }}
                  />
                ))}
              </span>
              <span className={cn('block font-heading font-bold', compact ? 'text-xs' : 'text-sm')}>{label}</span>
              <span className={cn('mt-0.5 text-xs leading-snug text-muted-foreground', compact ? 'sr-only' : 'block')}>
                {description}
              </span>
              {selected && (
                // A3: jawny stan aktywnej palety — nie sama ikona, także tekst.
                <span
                  data-testid={`palette-${palette.id}-selected`}
                  className={cn(
                    'absolute flex items-center justify-center rounded-full bg-primary text-primary-foreground',
                    compact ? 'right-1 top-1 h-4 w-4' : 'right-2 top-2 gap-1 px-2 py-0.5 text-[11px] font-semibold',
                  )}
                >
                  <Check className="h-3.5 w-3.5" aria-hidden />
                  <span className={compact ? 'sr-only' : undefined}>{t('palette.activeBadge')}</span>
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};
