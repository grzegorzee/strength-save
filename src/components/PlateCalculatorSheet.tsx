import { useMemo, useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { useTranslation } from '@/contexts/LanguageContext';
import { useUnit } from '@/contexts/UnitContext';
import { cn } from '@/lib/utils';
import {
  BAR_OPTIONS_KG,
  DEFAULT_PLATE_INVENTORY,
  computePlates,
  loadPlateInventory,
  savePlateInventory,
} from '@/lib/plate-calculator';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

interface PlateCalculatorSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Ciężar docelowy w kg (kanonicznie). */
  targetKg: number;
}

// Wysokość paska talerza proporcjonalna do wagi (min czytelna).
const plateHeight = (weightKg: number): number => Math.max(28, Math.min(88, weightKg * 3.2));

/** Kalkulator talerzy (Z107): wizualizacja rozkładu na stronę gryfu. */
export const PlateCalculatorSheet = ({ open, onOpenChange, targetKg }: PlateCalculatorSheetProps) => {
  const { t } = useTranslation();
  const { fmt } = useUnit();
  const [{ barKg, plates }, setInventory] = useState(() => loadPlateInventory());

  const result = useMemo(() => computePlates(targetKg, barKg, plates), [targetKg, barKg, plates]);

  const handleBarChange = (nextBar: number) => {
    setInventory((prev) => {
      savePlateInventory(nextBar, prev.plates);
      return { ...prev, barKg: nextBar };
    });
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-2xl pb-[calc(1.5rem+env(safe-area-inset-bottom))]">
        <SheetHeader className="text-left">
          <SheetTitle className="font-heading uppercase tracking-tight">{t('plates.title')}</SheetTitle>
          <SheetDescription>
            {t('plates.target')}: <strong className="text-foreground">{fmt(targetKg)}</strong>
          </SheetDescription>
        </SheetHeader>

        {/* Wybór gryfu */}
        <div className="mt-4 flex items-center gap-2">
          <span className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">{t('plates.bar')}</span>
          {BAR_OPTIONS_KG.map((bar) => (
            <button
              key={bar}
              type="button"
              onClick={() => handleBarChange(bar)}
              className={cn(
                'rounded-full px-3 py-1.5 text-xs font-bold uppercase tracking-wide transition-colors',
                barKg === bar ? 'bg-primary text-primary-foreground' : 'bg-surface-highest text-muted-foreground',
              )}
            >
              {bar} kg
            </button>
          ))}
        </div>

        {result.belowBar ? (
          <p className="mt-6 text-sm text-muted-foreground" data-testid="plates-below-bar">
            {t('plates.belowBar', { bar: barKg })}
          </p>
        ) : (
          <>
            {/* Wizualizacja: gryf + talerze na stronę */}
            <div className="mt-6 flex items-center gap-1.5" data-testid="plates-visual">
              <div className="h-3 w-10 rounded-sm bg-muted-foreground/40" aria-hidden="true" />
              {result.perSide.flatMap((p) =>
                Array.from({ length: p.count }, (_, i) => (
                  <div
                    key={`${p.weightKg}-${i}`}
                    className="flex w-7 items-center justify-center rounded-md bg-primary/15 text-[10px] font-bold text-primary ring-1 ring-primary/30"
                    style={{ height: plateHeight(p.weightKg) }}
                  >
                    {p.weightKg}
                  </div>
                )),
              )}
              {result.perSide.length === 0 && (
                <span className="text-sm text-muted-foreground">{t('plates.emptyBar')}</span>
              )}
            </div>

            <p className="mt-4 text-sm" data-testid="plates-summary">
              {t('plates.perSide')}:{' '}
              <strong>
                {result.perSide.length > 0
                  ? result.perSide.map((p) => `${p.count}×${p.weightKg}`).join(' + ')
                  : '—'}
              </strong>
            </p>
            {!result.exact && (
              <p className="mt-1 text-xs text-fitness-warning" data-testid="plates-inexact">
                {t('plates.closest', { weight: fmt(result.achievedKg) })}
              </p>
            )}
          </>
        )}
      </SheetContent>
    </Sheet>
  );
};

/** Ustawienia inwentarza (Z107): gryf + dostępne talerze; zapis w localStorage per urządzenie. */
export const PlateInventorySettings = () => {
  const { t } = useTranslation();
  const [{ barKg, plates }, setInventory] = useState(() => loadPlateInventory());

  const togglePlate = (weightKg: number) => {
    setInventory((prev) => {
      const has = prev.plates.some((p) => p.weightKg === weightKg && p.count > 0);
      const nextPlates = DEFAULT_PLATE_INVENTORY.map((def) => {
        const enabled = def.weightKg === weightKg
          ? !has
          : prev.plates.some((p) => p.weightKg === def.weightKg && p.count > 0);
        return { weightKg: def.weightKg, count: enabled ? def.count : 0 };
      });
      savePlateInventory(prev.barKg, nextPlates);
      return { ...prev, plates: nextPlates };
    });
  };

  const setBar = (nextBar: number) => {
    setInventory((prev) => {
      savePlateInventory(nextBar, prev.plates);
      return { ...prev, barKg: nextBar };
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">{t('plates.settingsTitle')}</CardTitle>
        <CardDescription>{t('plates.settingsDesc')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">{t('plates.bar')}</span>
          {BAR_OPTIONS_KG.map((bar) => (
            <button
              key={bar}
              type="button"
              onClick={() => setBar(bar)}
              className={cn(
                'rounded-full px-3 py-1.5 text-xs font-bold uppercase tracking-wide transition-colors',
                barKg === bar ? 'bg-primary text-primary-foreground' : 'bg-surface-highest text-muted-foreground',
              )}
            >
              {bar} kg
            </button>
          ))}
        </div>
        <div className="space-y-1.5">
          <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">{t('plates.availablePlates')}</p>
          <div className="flex flex-wrap gap-1.5">
            {DEFAULT_PLATE_INVENTORY.map((def) => {
              const enabled = plates.some((p) => p.weightKg === def.weightKg && p.count > 0);
              return (
                <button
                  key={def.weightKg}
                  type="button"
                  onClick={() => togglePlate(def.weightKg)}
                  aria-pressed={enabled}
                  className={cn(
                    'rounded-full px-3 py-1.5 text-xs font-bold uppercase tracking-wide transition-colors',
                    enabled ? 'bg-fitness-cyan text-background' : 'bg-surface-highest text-muted-foreground',
                  )}
                >
                  {def.weightKg}
                </button>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
