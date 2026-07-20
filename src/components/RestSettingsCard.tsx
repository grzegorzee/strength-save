import { useState } from 'react';
import { Volume2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useTranslation } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import { loadRestSettings, saveRestSettings, type RestSettings } from '@/lib/rest-timer';
import { REST_SOUNDS, loadRestSound, saveRestSound, type RestSoundId } from '@/lib/rest-sound';
import { previewRestSound } from '@/lib/timer-sound';
import { isKeepAwakeEnabled, setKeepAwakeEnabled } from '@/lib/keep-awake';

type Field = 'workingSeconds' | 'betweenExercisesSeconds' | 'warmupSeconds';

// Presety zaczynają się od 15 s — krótkie przerwy są realne (obwody, serie
// wykończeniowe, rozgrzewka), a zaczynanie od minuty zmuszało do ręcznego wpisywania.
const PRESETS: Record<Field, number[]> = {
  workingSeconds: [15, 30, 45, 60, 90, 120, 180],
  betweenExercisesSeconds: [15, 30, 60, 90, 120, 150, 240],
  warmupSeconds: [15, 30, 45, 60, 90],
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
  const [sound, setSound] = useState<RestSoundId>(() => loadRestSound().id);
  const [keepAwake, setKeepAwake] = useState<boolean>(() => isKeepAwakeEnabled());

  const update = (field: Field, rawValue: number) => {
    // Zakres: od 10 s (krótsza przerwa nie zdąży się nawet wyświetlić) do 10 minut
    // (dłuższa to raczej koniec treningu niż przerwa).
    const value = Math.min(600, Math.max(10, Math.round(rawValue)));
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
                min={10}
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

        {/* Wybór dźwięku z ODSŁUCHEM — jedyny sposób, żeby ocenić go w realnych
            warunkach siłowni. Ten sam plik gra w apce i w powiadomieniu. */}
        <div className="space-y-2">
          <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
            {t('rest.sound.title')}
          </p>
          <div className="flex flex-wrap gap-1.5">
            {REST_SOUNDS.map((option) => (
              <button
                key={option.id}
                type="button"
                onClick={() => { saveRestSound(option.id); setSound(option.id); previewRestSound(option.file); }}
                aria-pressed={sound === option.id}
                data-testid={`rest-sound-${option.id}`}
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-xs font-bold transition-colors',
                  sound === option.id
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-surface-highest text-muted-foreground hover:text-foreground',
                )}
              >
                <Volume2 className="h-3.5 w-3.5" />
                {t(option.labelKey)}
              </button>
            ))}
          </div>
          <p className="text-[11px] text-muted-foreground/70">{t('rest.sound.hint')}</p>
        </div>

        {/* Blokada wygaszania: przy włączonym ekranie dźwięk gra zawsze, bo robi to
            sama apka. Kosztuje baterię, więc to wybór usera, nie narzucone. */}
        <div className="space-y-2">
          <button
            type="button"
            onClick={() => { const next = !keepAwake; setKeepAwakeEnabled(next); setKeepAwake(next); }}
            aria-pressed={keepAwake}
            data-testid="rest-keep-awake"
            className={cn(
              'flex w-full items-center justify-between gap-3 rounded-xl px-3 py-3 text-left transition-colors',
              keepAwake ? 'bg-primary/10' : 'bg-muted/40',
            )}
          >
            <span className="text-sm font-semibold">{t('rest.keepAwake')}</span>
            <span className={cn(
              'shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase',
              keepAwake ? 'bg-primary text-primary-foreground' : 'bg-surface-highest text-muted-foreground',
            )}>
              {keepAwake ? 'ON' : 'OFF'}
            </span>
          </button>
          <p className="text-[11px] text-muted-foreground/70">{t('rest.keepAwakeHint')}</p>
        </div>
      </CardContent>
    </Card>
  );
};
