import { useState } from 'react';
import { RotateCcw, Volume2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useTranslation } from '@/contexts/LanguageContext';
import { useCurrentUser } from '@/contexts/UserContext';
import { cn } from '@/lib/utils';
import { loadRestSettings, type RestSettings } from '@/lib/rest-timer';
import { persistRestSettings } from '@/lib/rest-preferences';
import { isRecommendedRest, restDefaultsForObjective } from '@/lib/rest-defaults';
import { REST_SOUNDS, loadRestSound, saveRestSound, type RestSoundId } from '@/lib/rest-sound';
import { loadTimerVolume, saveTimerVolume } from '@/lib/timer-volume';
import { previewRestSound } from '@/lib/timer-sound';

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
 *
 * X35b: jedno źródło prawdy = users/{uid}.preferences.rest (persistRestSettings,
 * cache localStorage). Nagłówek pokazuje bieżącą przerwę roboczą i "Polecane dla
 * Twojego planu" (rest-defaults wg celu z trainingProfile); ręczna zmiana =
 * `custom: true` (start cyklu nie nadpisze), "Przywróć polecane" czyści flagę.
 *
 * X36: blokada wygaszania ekranu przeszła do sekcji Trening Profilu (decyzja
 * właściciela); `hideTitle` — karta w zwijanej sekcji "Timer i przerwy".
 */
export const RestSettingsCard = ({ hideTitle = false }: { hideTitle?: boolean } = {}) => {
  const { t } = useTranslation();
  const { uid, profile } = useCurrentUser();
  const [settings, setSettings] = useState<RestSettings>(() => loadRestSettings());
  const [sound, setSound] = useState<RestSoundId>(() => loadRestSound().id);
  const [volumePct, setVolumePct] = useState<number>(() => Math.round(loadTimerVolume() * 100));

  const objective = profile?.trainingProfile?.objective;
  const recommended = restDefaultsForObjective(objective);
  const onRecommended = settings.custom !== true && isRecommendedRest(settings, objective);

  const commit = (next: RestSettings) => {
    setSettings(next);
    void persistRestSettings(uid, next);
  };

  const update = (field: Field, rawValue: number) => {
    // Zakres: od 10 s (krótsza przerwa nie zdąży się nawet wyświetlić) do 10 minut
    // (dłuższa to raczej koniec treningu niż przerwa).
    const value = Math.min(600, Math.max(10, Math.round(rawValue)));
    if (!Number.isFinite(value)) return;
    commit({ ...settings, [field]: value, custom: true });
  };

  const restoreRecommended = () => {
    commit({ ...settings, ...recommended, custom: false });
  };

  const formatSeconds = (s: number) => (s >= 60 ? `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}` : `${s}s`);

  const rows: Array<{ field: Field; label: string }> = [
    { field: 'workingSeconds', label: t('rest.settings.betweenSets') },
    { field: 'betweenExercisesSeconds', label: t('rest.settings.betweenExercises') },
    { field: 'warmupSeconds', label: t('rest.settings.afterWarmup') },
  ];

  return (
    <Card>
      <CardHeader>
        {!hideTitle && <CardTitle className="text-lg">{t('rest.settings.title')}</CardTitle>}
        <CardDescription>{t('rest.settings.desc')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* X35b: bieżąca wartość + polecane dla celu planu + powrót do polecanych. */}
        <div
          data-testid="rest-recommended-summary"
          className={cn(
            'space-y-2 rounded-xl px-3 py-3',
            onRecommended ? 'bg-primary/10' : 'bg-muted/40',
          )}
        >
          <div className="flex items-center justify-between gap-3">
            <p className="min-w-0 text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
              {t('rest.settings.currentLabel')}
              {settings.custom === true && (
                <span className="ml-2 rounded-full bg-surface-highest px-2 py-0.5 text-[10px] normal-case tracking-normal text-foreground">
                  {t('rest.settings.customBadge')}
                </span>
              )}
            </p>
            <p className="shrink-0 font-heading text-2xl font-bold tabular-nums" data-testid="rest-current-working">
              {formatSeconds(settings.workingSeconds)}
            </p>
          </div>
          {objective && (
            <p className="text-[11px] text-muted-foreground/80" data-testid="rest-recommended-hint">
              {onRecommended
                ? t('rest.settings.recommendedActive')
                : t('rest.settings.recommended', { seconds: recommended.workingSeconds })}
            </p>
          )}
          {objective && !onRecommended && (
            <button
              type="button"
              onClick={restoreRecommended}
              data-testid="rest-restore-recommended"
              className="inline-flex items-center gap-1.5 rounded-full bg-primary px-3 py-2 text-xs font-bold text-primary-foreground transition-transform active:scale-95"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              {t('rest.settings.restoreRecommended')}
            </button>
          )}
        </div>

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

        {/* Regulacja głośności (Z201, zgłoszenie usera 2026-08-06: „głośność na full,
            a ledwo słychać"). Odsłuch przy puszczeniu suwaka — ocena głośności bez
            realnego dźwięku to zgadywanie. Nie dotyczy powiadomień przy zgaszonym
            ekranie (systemowa głośność dzwonka), stąd hint. */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label htmlFor="rest-volume" className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
              {t('rest.volume.title')}
            </label>
            <span className="text-sm font-bold tabular-nums">{volumePct}%</span>
          </div>
          <input
            id="rest-volume"
            type="range"
            min={20}
            max={100}
            step={5}
            value={volumePct}
            data-testid="rest-volume-slider"
            aria-label={t('rest.volume.title')}
            onChange={(e) => {
              const pct = parseInt(e.target.value, 10);
              if (!Number.isFinite(pct)) return;
              setVolumePct(pct);
              saveTimerVolume(pct / 100);
            }}
            onPointerUp={() => previewRestSound(loadRestSound().file)}
            onKeyUp={() => previewRestSound(loadRestSound().file)}
            className="h-2 w-full cursor-pointer appearance-none rounded-full bg-surface-highest accent-primary"
          />
          <p className="text-[11px] text-muted-foreground/70">{t('rest.volume.hint')}</p>
        </div>
      </CardContent>
    </Card>
  );
};
