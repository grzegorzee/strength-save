import { useEffect, useState } from 'react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Timer, Volume2 } from 'lucide-react';
import { useCurrentUser } from '@/contexts/UserContext';
import { useTranslation } from '@/contexts/LanguageContext';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { SettingRow } from '@/components/kinetic/SettingRow';
import { Switch } from '@/components/ui/switch';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { FEATURE_FLAGS } from '@/lib/feature-flags';
import { setWorkoutTimersEnabled } from '@/lib/workout-timers-setting';
import { SOUND_KEY, REST_OPTIONS } from '@/lib/workout-preferences';
import { loadRestSettings } from '@/lib/rest-timer';
import { persistRestSettings } from '@/lib/rest-preferences';

interface WorkoutSettingsSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Faza 2 redesignu Profilu (spec 2026-08-11): skrót do ustawień treningowych
 * z ekranu treningu (zębatka przy RestBar). TE SAME klucze zapisu co Profil
 * (localStorage + preferences.* w Firestore) — nowy punkt wejścia, zero zmian
 * w istniejącej logice zapisu (zasada #5).
 *
 * X35b: przerwa robocza czyta/pisze JEDNO źródło prawdy (preferences.rest przez
 * persistRestSettings, cache localStorage) — to samo co RestSettingsCard.
 * Ręczna zmiana tutaj = `custom: true` (start cyklu nie nadpisze).
 */
export const WorkoutSettingsSheet = ({ open, onOpenChange }: WorkoutSettingsSheetProps) => {
  const { uid } = useCurrentUser();
  const { t } = useTranslation();

  const [restTimer, setRestTimer] = useState(() => String(loadRestSettings().workingSeconds));
  const [sound, setSound] = useState(() => {
    try { return localStorage.getItem(SOUND_KEY) !== 'false'; } catch { return true; }
  });
  const [timersOn, setTimersOn] = useState<boolean>(() => FEATURE_FLAGS.workoutTimers);

  // Wartości mogły się zmienić w Profilu, gdy sheet był zamknięty — odczyt przy
  // każdym otwarciu, żeby oba punkty wejścia zawsze pokazywały ten sam stan.
  useEffect(() => {
    if (!open) return;
    setRestTimer(String(loadRestSettings().workingSeconds));
    try { setSound(localStorage.getItem(SOUND_KEY) !== 'false'); } catch { /* zostaje stan */ }
    setTimersOn(FEATURE_FLAGS.workoutTimers);
  }, [open]);

  const persist = (key: string, value: string) => {
    try { localStorage.setItem(key, value); } catch { /* ignore */ }
  };
  // Jak w Profilu: mirror do users/{uid}.preferences, offline wystarcza localStorage.
  const persistPreference = (patch: Record<string, number | boolean>) => {
    updateDoc(doc(db, 'users', uid), patch).catch(() => { /* offline — localStorage wystarczy */ });
  };
  const handleTimersToggle = (value: boolean) => {
    setWorkoutTimersEnabled(value);
    setTimersOn(value);
  };
  const handleRestChange = (v: string) => {
    const seconds = parseInt(v, 10);
    if (!Number.isFinite(seconds) || seconds <= 0) return;
    setRestTimer(v);
    void persistRestSettings(uid, { ...loadRestSettings(), workingSeconds: seconds, custom: true });
  };
  const handleSound = (v: boolean) => {
    setSound(v);
    persist(SOUND_KEY, String(v));
    persistPreference({ 'preferences.timerSound': v });
  };

  // Wartość spoza siatki (np. 75 s z celu "atletyka") musi być widoczna w Select.
  const restOptions = REST_OPTIONS.includes(restTimer)
    ? REST_OPTIONS
    : [...REST_OPTIONS, restTimer].sort((a, b) => Number(a) - Number(b));

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-2xl border-0 bg-surface-low">
        <SheetHeader>
          <SheetTitle className="font-heading uppercase">{t('workout.settingsSheet.title')}</SheetTitle>
        </SheetHeader>
        <SettingRow
          icon={Timer}
          label={t('profile.restTimerToggle')}
          description={t('profile.restTimerToggleDesc')}
          right={<Switch checked={timersOn} onCheckedChange={handleTimersToggle} aria-label={t('profile.restTimerToggle')} />}
        />
        {timersOn && (
          <SettingRow
            icon={Timer}
            label={t('profile.pref.restTimer')}
            right={(
              <Select value={restTimer} onValueChange={handleRestChange}>
                <SelectTrigger className="w-24 border-0 bg-surface-highest" aria-label={t('profile.pref.restTimer')}><SelectValue /></SelectTrigger>
                <SelectContent>
                  {restOptions.map((s) => <SelectItem key={s} value={s}>{s}s</SelectItem>)}
                </SelectContent>
              </Select>
            )}
          />
        )}
        <SettingRow
          icon={Volume2}
          label={t('profile.app.sound')}
          right={<Switch checked={sound} onCheckedChange={handleSound} aria-label={t('profile.app.sound')} />}
        />
      </SheetContent>
    </Sheet>
  );
};
