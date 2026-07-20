import { useEffect, useMemo, useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Input } from '@/components/ui/input';
import { useTranslation } from '@/contexts/LanguageContext';
import { useUnit } from '@/contexts/UnitContext';
import { cn } from '@/lib/utils';
import {
  BAR_OPTIONS_KG,
  DEFAULT_PLATE_INVENTORY,
  DEFAULT_PLATE_INVENTORY_LB,
  computePlates,
  suggestAchievable,
  loadPlateInventory,
  savePlateInventory,
  type PlateInventoryItem,
} from '@/lib/plate-calculator';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

interface PlateCalculatorSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Ciężar docelowy w kg (kanonicznie). Wartość STARTOWA — dalej user ją zmienia. */
  targetKg: number;
  /** Z133: przepisanie policzonej wagi z powrotem do serii. Sygnatura z exerciseId
   *  i `useCallback` w rodzicu — kontrakt memo() z X17A. */
  exerciseId?: string;
  onApplyWeight?: (exerciseId: string, weightKg: number) => void;
}

// Wysokość paska talerza proporcjonalna do wagi (min czytelna).
const plateHeight = (weightKg: number): number => Math.max(28, Math.min(88, weightKg * 3.2));

/**
 * Z133: kolory talerzy. Domyślnie NEUTRALNE — komercyjne siłownie nie trzymają
 * standardu, więc liczba na talerzu jest ważniejsza niż kolor (research: Stronger).
 * Presety IWF/IPF opcjonalne, liczba widoczna zawsze w każdym z nich.
 */
type ColorPreset = 'neutral' | 'IWF' | 'IPF';

const PLATE_COLORS: Record<Exclude<ColorPreset, 'neutral'>, Record<number, string>> = {
  IWF: {
    25: 'bg-red-600/80 text-white', 20: 'bg-blue-600/80 text-white', 15: 'bg-yellow-400/80 text-black',
    10: 'bg-green-600/80 text-white', 5: 'bg-white/85 text-black', 2.5: 'bg-red-500/70 text-white',
    1.25: 'bg-zinc-300/80 text-black',
  },
  IPF: {
    25: 'bg-red-600/80 text-white', 20: 'bg-blue-600/80 text-white', 15: 'bg-yellow-400/80 text-black',
    10: 'bg-green-600/80 text-white', 5: 'bg-white/85 text-black', 2.5: 'bg-black/70 text-white',
    1.25: 'bg-zinc-300/80 text-black',
  },
};

const plateClass = (weightKg: number, preset: ColorPreset): string => {
  if (preset === 'neutral') return 'bg-primary/15 text-primary';
  return PLATE_COLORS[preset][weightKg] ?? 'bg-primary/15 text-primary';
};

/** Zaokrąglenie do 3 miejsc — chroni przed 62.50000000000001 po sumowaniu kroków. */
const round3 = (n: number): number => Math.round(n * 1000) / 1000;

/** Kalkulator talerzy (Z107 + X17B Z133): edytowalna waga, sztanga wizualna, ustaw w serii. */
export const PlateCalculatorSheet = ({ open, onOpenChange, targetKg, exerciseId, onApplyWeight }: PlateCalculatorSheetProps) => {
  const { t } = useTranslation();
  const { fmt, unit, toDisplay, fromInput } = useUnit();
  const [{ barKg, plates }, setInventory] = useState(() => loadPlateInventory());
  const [noBar, setNoBar] = useState(false);
  const [colors, setColors] = useState<ColorPreset>('neutral');

  // Z133: waga to STAN arkusza, nie prop na sztywno. Prop daje tylko wartość
  // startową — to był główny zarzut usera („miałem na stałe przypisane 60 kg").
  const [weightKg, setWeightKg] = useState(targetKg);
  const [draft, setDraft] = useState<string | null>(null);
  useEffect(() => {
    if (open) { setWeightKg(targetKg); setDraft(null); }
  }, [open, targetKg]);

  const opts = useMemo(() => ({ noBar }), [noBar]);
  const suggestion = useMemo(
    () => suggestAchievable(weightKg, barKg, plates, opts),
    [weightKg, barKg, plates, opts],
  );
  const result = suggestion.down;

  // Krok szybkich przycisków w JEDNOSTCE UI (kg kanonicznie w modelu).
  const steps = unit === 'lbs' ? [2.5, 5, 10] : [1.25, 2.5, 5];

  const setWeight = (kg: number) => { setWeightKg(Math.max(0, round3(kg))); setDraft(null); };
  const bump = (deltaDisplay: number) => setWeight(fromInput(toDisplay(weightKg) + deltaDisplay));

  const handleBarChange = (nextBar: number) => {
    setInventory((prev) => {
      savePlateInventory(nextBar, prev.plates);
      return { ...prev, barKg: nextBar };
    });
  };

  const displayWeight = draft ?? String(round3(toDisplay(weightKg)));

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="max-h-[92vh] overflow-y-auto rounded-t-2xl pb-[calc(1.5rem+env(safe-area-inset-bottom))]">
        <SheetHeader className="text-left">
          <SheetTitle className="font-heading uppercase tracking-tight">{t('plates.title')}</SheetTitle>
          <SheetDescription>{t('plates.settingsDesc')}</SheetDescription>
        </SheetHeader>

        {/* Z133 Krok 1: edytowalne pole wagi + steppery */}
        <div className="mt-4 space-y-2">
          <label htmlFor="plate-weight" className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
            {t('plates.weightLabel')}
          </label>
          <div className="flex items-center gap-2">
            <Input
              id="plate-weight"
              type="number"
              inputMode="decimal"
              min={0}
              step={0.5}
              value={displayWeight}
              aria-label={`${t('plates.weightLabel')} (${unit})`}
              onChange={(e) => {
                setDraft(e.target.value);
                const parsed = parseFloat(e.target.value);
                if (Number.isFinite(parsed)) setWeightKg(Math.max(0, fromInput(parsed)));
              }}
              onBlur={() => setDraft(null)}
              className="exercise-card-input h-14 text-xl font-bold"
            />
            <span className="text-sm font-bold uppercase text-muted-foreground">{unit}</span>
          </div>
          <div className="flex flex-wrap gap-1.5" data-testid="plates-steppers">
            {steps.flatMap((s) => [-s, s]).map((delta) => (
              <button
                key={delta}
                type="button"
                onClick={() => bump(delta)}
                className="flex-1 rounded-lg bg-muted/50 px-2 py-2 text-xs font-bold tabular-nums transition-colors hover:bg-muted"
              >
                {delta > 0 ? `+${delta}` : delta} {unit}
              </button>
            ))}
          </div>
        </div>

        {/* Gryf + tryb bez gryfu (Z133 Krok 5) */}
        <div className="mt-4 flex flex-wrap items-center gap-1.5">
          <span className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">{t('plates.bar')}</span>
          {BAR_OPTIONS_KG.map((bar) => (
            <button
              key={bar}
              type="button"
              onClick={() => { setNoBar(false); handleBarChange(bar); }}
              className={cn(
                'rounded-full px-3 py-1.5 text-xs font-bold uppercase tracking-wide transition-colors',
                !noBar && barKg === bar ? 'bg-primary text-primary-foreground' : 'bg-surface-highest text-muted-foreground',
              )}
            >
              {bar} kg
            </button>
          ))}
          <button
            type="button"
            onClick={() => setNoBar((v) => !v)}
            aria-pressed={noBar}
            title={t('plates.noBarHint')}
            className={cn(
              'rounded-full px-3 py-1.5 text-xs font-bold uppercase tracking-wide transition-colors',
              noBar ? 'bg-primary text-primary-foreground' : 'bg-surface-highest text-muted-foreground',
            )}
          >
            {t('plates.noBar')}
          </button>
        </div>

        {result.belowBar ? (
          <p className="mt-6 text-sm text-muted-foreground" data-testid="plates-below-bar">
            {t('plates.belowBar', { bar: barKg })}
          </p>
        ) : (
          <>
            {/* Z133 Krok 3: sztanga wizualna, talerze na JEDNĄ stronę */}
            <div className="mt-6 flex min-h-[92px] items-center gap-1.5" data-testid="plates-visual">
              {!noBar && <div className="h-3 w-10 shrink-0 rounded-sm bg-muted-foreground/40" aria-hidden="true" />}
              {result.perSide.flatMap((p) =>
                Array.from({ length: p.count }, (_, i) => (
                  <div
                    key={`${p.weightKg}-${i}`}
                    className={cn(
                      'flex w-9 shrink-0 items-center justify-center rounded-md text-xs font-extrabold tabular-nums',
                      plateClass(p.weightKg, colors),
                    )}
                    style={{ height: plateHeight(p.weightKg) }}
                  >
                    {round3(toDisplay(p.weightKg))}
                  </div>
                )),
              )}
              {result.perSide.length === 0 && (
                <span className="text-sm text-muted-foreground">{t('plates.emptyBar')}</span>
              )}
            </div>

            <p className="mt-4 text-sm" data-testid="plates-summary">
              {noBar ? t('plates.noBar') : t('plates.perSide')}:{' '}
              <strong>
                {result.perSide.length > 0
                  ? result.perSide.map((p) => `${p.count}×${round3(toDisplay(p.weightKg))}`).join(' + ')
                  : '—'}
              </strong>
            </p>

            {/* Z133 Krok 4: para propozycji zamiast samego „nie da się dokładnie" */}
            {!suggestion.exact && (
              <div className="mt-3 space-y-2" data-testid="plates-suggestions">
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setWeight(result.achievedKg)}
                    data-testid="plates-suggest-down"
                    className="rounded-xl bg-muted/50 px-3 py-2.5 text-left transition-colors hover:bg-muted"
                  >
                    <span className="block text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{t('plates.suggestDown')}</span>
                    <span className="block text-base font-bold tabular-nums">{fmt(result.achievedKg)}</span>
                  </button>
                  {suggestion.up ? (
                    <button
                      type="button"
                      onClick={() => setWeight(suggestion.up!.achievedKg)}
                      data-testid="plates-suggest-up"
                      className="rounded-xl bg-muted/50 px-3 py-2.5 text-left transition-colors hover:bg-muted"
                    >
                      <span className="block text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{t('plates.suggestUp')}</span>
                      <span className="block text-base font-bold tabular-nums">{fmt(suggestion.up.achievedKg)}</span>
                    </button>
                  ) : (
                    <p className="self-center text-xs text-muted-foreground">{t('plates.unreachableUp')}</p>
                  )}
                </div>
                {suggestion.missingPlateKg !== undefined && (
                  <p className="text-xs text-fitness-warning" data-testid="plates-missing">
                    {t('plates.missingPlate', { weight: fmt(suggestion.missingPlateKg) })}
                  </p>
                )}
              </div>
            )}
          </>
        )}

        {/* Preset kolorów — liczba na talerzu widoczna w każdym */}
        <div className="mt-4 flex items-center gap-1.5">
          <span className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">{t('plates.colors')}</span>
          {(['neutral', 'IWF', 'IPF'] as ColorPreset[]).map((preset) => (
            <button
              key={preset}
              type="button"
              onClick={() => setColors(preset)}
              aria-pressed={colors === preset}
              className={cn(
                'rounded-full px-3 py-1.5 text-xs font-bold uppercase tracking-wide transition-colors',
                colors === preset ? 'bg-primary text-primary-foreground' : 'bg-surface-highest text-muted-foreground',
              )}
            >
              {preset === 'neutral' ? t('plates.colorsNeutral') : preset}
            </button>
          ))}
        </div>

        {/* Z133 Krok 2: domknięcie pętli — waga wraca do serii */}
        {exerciseId && onApplyWeight && (
          <button
            type="button"
            onClick={() => { onApplyWeight(exerciseId, weightKg); onOpenChange(false); }}
            className="mt-5 w-full rounded-xl bg-primary py-3.5 text-sm font-bold uppercase tracking-[0.14em] text-primary-foreground transition-opacity hover:opacity-90"
          >
            {t('plates.setInSet')}
          </button>
        )}
      </SheetContent>
    </Sheet>
  );
};

/**
 * Ustawienia inwentarza (Z107 + X17B Z134.1): gryf (presety + własny), liczba sztuk
 * per rozmiar, własne talerze, preset jednostki. Zapis w localStorage per urządzenie.
 * Toggle on/off zastąpiony liczbą sztuk — „mam / nie mam" nie oddaje realnej siłowni.
 */
export const PlateInventorySettings = () => {
  const { t } = useTranslation();
  const { unit, toDisplay } = useUnit();
  const [{ barKg, plates }, setInventory] = useState(() => loadPlateInventory());
  const [customPlate, setCustomPlate] = useState('');
  const [customBar, setCustomBar] = useState('');

  const persist = (nextBar: number, nextPlates: PlateInventoryItem[]) => {
    savePlateInventory(nextBar, nextPlates);
    setInventory({ barKg: nextBar, plates: nextPlates });
  };

  const setCount = (weightKg: number, raw: string) => {
    const parsed = parseInt(raw, 10);
    const count = Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
    persist(barKg, plates.map((p) => (p.weightKg === weightKg ? { ...p, count } : p)));
  };

  const addPlate = () => {
    const kg = parseFloat(customPlate);
    if (!Number.isFinite(kg) || kg <= 0) return;
    if (plates.some((p) => Math.abs(p.weightKg - kg) < 0.001)) return;
    persist(barKg, [...plates, { weightKg: kg, count: 4 }].sort((a, b) => b.weightKg - a.weightKg));
    setCustomPlate('');
  };

  const removePlate = (weightKg: number) => {
    persist(barKg, plates.filter((p) => p.weightKg !== weightKg));
  };

  const applyUnitPreset = (target: 'kg' | 'lbs') => {
    persist(barKg, target === 'lbs' ? DEFAULT_PLATE_INVENTORY_LB : DEFAULT_PLATE_INVENTORY);
  };

  const setBar = (nextBar: number) => persist(nextBar, plates);

  const label = (kg: number) => round3(toDisplay(kg));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">{t('plates.settingsTitle')}</CardTitle>
        <CardDescription>{t('plates.settingsDesc')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Gryf: presety + własny */}
        <div className="space-y-2">
          <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">{t('plates.bar')}</p>
          <div className="flex flex-wrap items-center gap-1.5">
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
            <Input
              type="number"
              inputMode="decimal"
              min={0}
              step={0.5}
              value={customBar}
              aria-label={t('plates.customBar')}
              placeholder={t('plates.customBar')}
              onChange={(e) => {
                setCustomBar(e.target.value);
                const kg = parseFloat(e.target.value);
                if (Number.isFinite(kg) && kg >= 0 && kg <= 100) setBar(kg);
              }}
              className="h-9 w-28 text-sm"
            />
          </div>
        </div>

        {/* Preset jednostki inwentarza */}
        <div className="space-y-2">
          <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">{t('plates.unitPreset')}</p>
          <div className="flex gap-1.5">
            {(['kg', 'lbs'] as const).map((u) => (
              <button
                key={u}
                type="button"
                onClick={() => applyUnitPreset(u)}
                className="rounded-full bg-surface-highest px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-muted-foreground transition-colors hover:text-foreground"
              >
                {u}
              </button>
            ))}
          </div>
        </div>

        {/* Talerze: liczba sztuk per rozmiar */}
        <div className="space-y-2">
          <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">{t('plates.availablePlates')}</p>
          <p className="text-[11px] text-muted-foreground/70">{t('plates.countHint')}</p>
          <div className="space-y-1.5">
            {plates.map((p) => (
              <div key={p.weightKg} className="flex items-center gap-2" data-testid={`plate-row-${round3(p.weightKg)}`}>
                <span className="w-20 text-sm font-bold tabular-nums">{label(p.weightKg)} {unit}</span>
                <Input
                  type="number"
                  inputMode="numeric"
                  min={0}
                  value={p.count}
                  aria-label={t('plates.countLabel', { weight: String(round3(p.weightKg)) })}
                  onChange={(e) => setCount(p.weightKg, e.target.value)}
                  className="h-9 w-20 text-sm"
                />
                <button
                  type="button"
                  onClick={() => removePlate(p.weightKg)}
                  className="rounded-lg px-2 py-1 text-xs font-semibold text-muted-foreground transition-colors hover:text-destructive"
                >
                  {t('plates.removePlate')}
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Własny rozmiar */}
        <div className="flex items-end gap-2">
          <div className="flex-1 space-y-1">
            <label htmlFor="custom-plate" className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
              {t('plates.customPlate')}
            </label>
            <Input
              id="custom-plate"
              type="number"
              inputMode="decimal"
              min={0}
              step={0.25}
              value={customPlate}
              aria-label={t('plates.customPlate')}
              onChange={(e) => setCustomPlate(e.target.value)}
              className="h-9 text-sm"
            />
          </div>
          <button
            type="button"
            onClick={addPlate}
            className="h-9 rounded-lg bg-primary px-3 text-xs font-bold uppercase tracking-wide text-primary-foreground transition-opacity hover:opacity-90"
          >
            {t('plates.addPlate')}
          </button>
        </div>
      </CardContent>
    </Card>
  );
};
