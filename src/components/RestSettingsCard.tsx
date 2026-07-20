import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useTranslation } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import { loadRestSettings, saveRestSettings, type RestSettings } from '@/lib/rest-timer';

type Field = 'workingSeconds' | 'betweenExercisesSeconds' | 'warmupSeconds';

const PRESETS: Record<Field, number[]> = {
  workingSeconds: [60, 90, 120, 180],
  betweenExercisesSeconds: [120, 150, 180, 240],
  warmupSeconds: [30, 45, 60, 90],
};

const KEY_PREFIX: Record<Field, string> = {
  workingSeconds: 'working',
  betweenExercisesSeconds: 'exercises',
  warmupSeconds: 'warmup',
};

/**
 * Ustawienia długości przerw (zgłoszenie usera po treningu 2026-07-20).
 *
 * Trzy niezależne czasy, bo to trzy różne sytuacje na siłowni:
 * między seriami (najkrótsza), po rozgrzewce (jeszcze krótsza — to nie jest praca),
 * między ćwiczeniami (najdłuższa, dochodzi zmiana stanowiska i sprzętu).
 */
export const RestSettingsCard = () => {
  const { t } = useTranslation();
  const [settings, setSettings] = useState<RestSettings>(() => loadRestSettings());

  const update = (field: Field, rawValue: number) => {
    // Zakres pilnuje sensu: 5 s to minimum, na jakim odliczanie ma sens,
    // 10 minut to sufit (dłuższa przerwa = raczej koniec treningu).
    const value = Math.min(600, Math.max(5, Math.round(rawValue)));
    if (!Number.isFinite(value)) return;
    const next = { ...settings, [field]: value };
    setSettings(next);
    saveRestSettings(next);
  };

  const rows: Array<{ field: Field; label: string }> = [
    { field: 'workingSeconds', label: t('rest.settings.betweenSets') },
    { field: 'betweenExercisesSeconds', label: t('rest.settings.betweenExercises') },
    { field: 'warmupSeconds', label: t('rest.settings.afterWarmup') },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">{t('rest.settings.title')}</CardTitle>
        <CardDescription>{t('rest.settings.desc')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {rows.map(({ field, label }) => (
          <div key={field} className="space-y-2">
            <label htmlFor={`rest-${field}`} className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
              {label}
            </label>
            <div className="flex items-center gap-2">
              <Input
                id={`rest-${field}`}
                type="number"
                inputMode="numeric"
                min={5}
                max={600}
                step={5}
                value={settings[field]}
                aria-label={label}
                onChange={(e) => {
                  const parsed = parseInt(e.target.value, 10);
                  if (Number.isFinite(parsed)) update(field, parsed);
                }}
                className="h-11 w-28 text-base font-bold"
              />
              <span className="text-sm text-muted-foreground">{t('rest.settings.seconds')}</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {PRESETS[field].map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => update(field, preset)}
                  data-testid={`rest-preset-${KEY_PREFIX[field]}-${preset}`}
                  className={cn(
                    'rounded-full px-3 py-1.5 text-xs font-bold tabular-nums transition-colors',
                    settings[field] === preset
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-surface-highest text-muted-foreground hover:text-foreground',
                  )}
                >
                  {preset >= 60 ? `${Math.floor(preset / 60)}:${String(preset % 60).padStart(2, '0')}` : `${preset}s`}
                </button>
              ))}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
};
