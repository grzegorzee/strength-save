import { useEffect, useRef, useState } from 'react';
import { Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTranslation } from '@/contexts/LanguageContext';
import {
  PALETTE_THEMES,
  applyPaletteTheme,
  storePaletteTheme,
  type PaletteThemeV2,
} from '@/lib/palette-theme';
import { applyAccent } from '@/lib/accent-theme';
import { cn } from '@/lib/utils';

interface PaletteThemePickerProps {
  currentAccentId: string;
  currentPalette: PaletteThemeV2 | null;
  onConfirm: (palette: PaletteThemeV2) => void;
  className?: string;
  compact?: boolean;
}

export const PaletteThemePicker = ({
  currentAccentId,
  currentPalette,
  onConfirm,
  className,
  compact = false,
}: PaletteThemePickerProps) => {
  const { t } = useTranslation();
  const [preview, setPreview] = useState<PaletteThemeV2 | null>(null);
  const baseRef = useRef<{ accentId: string; palette: PaletteThemeV2 | null }>({
    accentId: currentAccentId,
    palette: currentPalette,
  });

  const restoreBase = () => {
    const base = baseRef.current;
    if (base.palette) applyPaletteTheme(base.palette);
    else applyAccent(base.accentId);
  };

  // Preview nie może wyciec na inny ekran, jeśli user wyjdzie bez decyzji.
  useEffect(() => () => restoreBase(), []);
  useEffect(() => {
    // Zmiana propsów oznacza zatwierdzony wybór spoza pickera (np. legacy
    // swatch w Profilu). Musi zastąpić bazę także podczas otwartego preview,
    // inaczej cancel/unmount cofałby świeży wybór usera.
    baseRef.current = { accentId: currentAccentId, palette: currentPalette };
  }, [currentAccentId, currentPalette]);

  const previewPalette = (palette: PaletteThemeV2) => {
    applyPaletteTheme(palette);
    setPreview(palette);
  };
  const selectPalette = (palette: PaletteThemeV2) => {
    if (!compact) {
      previewPalette(palette);
      return;
    }
    const stored = storePaletteTheme(palette);
    if (!stored) return;
    applyPaletteTheme(stored);
    baseRef.current = { accentId: stored.primary, palette: stored };
    setPreview(null);
    onConfirm(stored);
  };
  const cancelPreview = () => {
    restoreBase();
    setPreview(null);
  };
  const confirmPreview = () => {
    if (!preview) return;
    const stored = storePaletteTheme(preview);
    if (!stored) return;
    applyPaletteTheme(stored);
    baseRef.current = { accentId: stored.primary, palette: stored };
    setPreview(null);
    onConfirm(stored);
  };

  const selectedId = preview?.id ?? currentPalette?.id ?? null;

  return (
    <div className={cn('space-y-3', className)} data-testid="palette-theme-picker">
      <div className={cn('grid gap-2', compact ? 'grid-cols-3' : 'sm:grid-cols-3')} role="radiogroup" aria-label={t('palette.title')}>
        {PALETTE_THEMES.map((palette, index) => {
          const selected = selectedId === palette.id;
          const label = t(`palette.${palette.id}.name`);
          return (
            <button
              key={palette.id}
              type="button"
              role="radio"
              aria-checked={selected}
              tabIndex={selected || (!selectedId && index === 0) ? 0 : -1}
              aria-label={`${label}. ${t(`palette.${palette.id}.description`)}`}
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
                {t(`palette.${palette.id}.description`)}
              </span>
              {selected && (
                <span
                  data-testid={`palette-${palette.id}-selected`}
                  className={cn('absolute flex items-center justify-center rounded-full bg-primary text-primary-foreground', compact ? 'right-1 top-1 h-4 w-4' : 'right-2 top-2 h-5 w-5')}
                >
                  <Check className="h-3.5 w-3.5" aria-hidden />
                </span>
              )}
            </button>
          );
        })}
      </div>

      {preview && (
        <div className="grid grid-cols-2 gap-2" data-testid="palette-preview-actions">
          <Button variant="outline" className="min-h-12" onClick={cancelPreview}>
            {t('palette.cancelPreview')}
          </Button>
          <Button className="min-h-12" onClick={confirmPreview}>
            {t('palette.confirm')}
          </Button>
        </div>
      )}
    </div>
  );
};
