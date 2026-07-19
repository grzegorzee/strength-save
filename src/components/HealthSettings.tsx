import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { HeartPulse } from 'lucide-react';
import { useTranslation } from '@/contexts/LanguageContext';
import { getHealthBridge, loadHealthSettings, saveHealthSettings, type HealthSettings as HealthSettingsShape } from '@/lib/health-bridge';
import { dateLocale } from '@/i18n';

/**
 * Ustawienia zdrowia (Z118): sekcja widoczna TYLKO gdy platforma ma Health
 * (iOS HealthKit / Android Health Connect). Web = no-op bridge = sekcja ukryta.
 * Stan per urządzenie (localStorage) — zgodny z naturą uprawnień systemowych.
 */
export const HealthSettings = () => {
  const { t, lang } = useTranslation();
  const [available, setAvailable] = useState(false);
  const [settings, setSettings] = useState<HealthSettingsShape>(() => loadHealthSettings());
  const [requesting, setRequesting] = useState(false);

  useEffect(() => {
    void getHealthBridge().isAvailable().then(setAvailable);
  }, []);

  if (!available) return null;

  const toggleSyncWorkouts = async (next: boolean) => {
    if (next) {
      // Zgody systemowe dopiero przy pierwszym włączeniu (nie przy starcie apki).
      setRequesting(true);
      const granted = await getHealthBridge().requestPermissions();
      setRequesting(false);
      if (!granted) return;
    }
    const updated = { ...settings, syncWorkouts: next };
    setSettings(updated);
    saveHealthSettings(updated);
  };

  const toggleSuggestWeight = async (next: boolean) => {
    if (next) {
      setRequesting(true);
      const granted = await getHealthBridge().requestPermissions();
      setRequesting(false);
      if (!granted) return;
    }
    const updated = { ...settings, suggestWeight: next };
    setSettings(updated);
    saveHealthSettings(updated);
  };

  return (
    <Card data-testid="health-settings">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <HeartPulse className="h-5 w-5 text-primary" />
          {t('health.title')}
        </CardTitle>
        <CardDescription>{t('health.description')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium">{t('health.syncWorkouts')}</p>
            <p className="text-xs text-muted-foreground">{t('health.syncWorkoutsDesc')}</p>
          </div>
          <Switch
            checked={settings.syncWorkouts}
            disabled={requesting}
            onCheckedChange={(next) => void toggleSyncWorkouts(next)}
          />
        </div>
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium">{t('health.suggestWeight')}</p>
            <p className="text-xs text-muted-foreground">{t('health.suggestWeightDesc')}</p>
          </div>
          <Switch
            checked={settings.suggestWeight}
            disabled={requesting}
            onCheckedChange={(next) => void toggleSuggestWeight(next)}
          />
        </div>
        {settings.lastSyncAt && (
          <p className="text-xs text-muted-foreground">
            {t('health.lastSync', {
              date: new Date(settings.lastSyncAt).toLocaleString(dateLocale(lang), { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }),
            })}
          </p>
        )}
      </CardContent>
    </Card>
  );
};
