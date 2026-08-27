import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Unlink, RefreshCw, Loader2 } from 'lucide-react';
import { useCurrentUser } from '@/contexts/UserContext';
import { useStrava } from '@/hooks/useStrava';
import { useToast } from '@/hooks/use-toast';
import { formatNextSyncTime } from '@/lib/strava-utils';
import { useTranslation } from '@/contexts/LanguageContext';
import { dateLocale } from '@/i18n';
import { PoweredByStrava, StravaConnectButton } from '@/components/strava/StravaBranding';

/**
 * X35b (WP-B): pełny panel Strava (połącz / sync / rozłącz / max HR) wyjęty 1:1
 * z dawnej strony /settings. Mieszka w sekcji Połączenia Profilu; renderuje się
 * wyłącznie przy fladze canUseStrava (rodzic i tak nie montuje bez niej).
 */
export const StravaConnectionCard = () => {
  const { uid, canUseStrava } = useCurrentUser();
  const { connection, isSyncing, error, connectStrava, syncActivities, saveMaxHR, disconnectStrava, nextSyncAvailableAt } = useStrava(uid, canUseStrava);
  const { toast } = useToast();
  const { t, lang } = useTranslation();
  const [maxHRInput, setMaxHRInput] = useState('');
  const [maxHRSaving, setMaxHRSaving] = useState(false);

  const handleSaveMaxHR = async () => {
    const value = parseInt(maxHRInput);
    if (isNaN(value) || value < 100 || value > 230) {
      toast({ title: t('settings.maxHR.invalid'), description: t('settings.maxHR.invalidDesc'), variant: 'destructive' });
      return;
    }
    setMaxHRSaving(true);
    try {
      // Rules blokują estimatedMaxHR/maxHRManualOverride w bezpośrednim update
      // profilu — zapis idzie przez callable saveMaxHR (admin SDK).
      const result = await saveMaxHR(value);
      if (!result.ok) {
        throw new Error(result.message);
      }
      toast({ title: t('settings.toast.saved'), description: t('settings.maxHR.saved', { value }) });
    } catch {
      toast({ title: t('settings.toast.error'), description: t('settings.toast.saveFailed'), variant: 'destructive' });
    } finally {
      setMaxHRSaving(false);
    }
  };

  const handleSync = async () => {
    const result = await syncActivities();
    if (!result.ok) {
      toast({ title: t('settings.sync.error'), description: result.message, variant: 'destructive' });
      return;
    }
    if (result.synced > 0) {
      toast({ title: t('settings.sync.done'), description: t('settings.sync.doneDesc', { synced: result.synced, total: result.totalFetched }) });
    } else if (result.totalFetched > 0) {
      toast({ title: t('settings.sync.noNew'), description: t('settings.sync.noNewDesc', { total: result.totalFetched }) });
    } else {
      toast({ title: t('settings.sync.empty'), description: t('settings.sync.emptyDesc', { days: result.lookbackDays }) });
    }
  };

  const handleDisconnect = async () => {
    await disconnectStrava();
    toast({ title: t('settings.strava.disconnected'), description: t('settings.strava.disconnectedDesc') });
  };

  if (!canUseStrava) return null;

  return (
    <Card data-testid="strava-connection-card">
      <CardHeader>
        <CardTitle>Strava</CardTitle>
        <CardDescription>
          {t('settings.strava.description')}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {connection.connected ? (
          <>
            <div className="flex items-center justify-between">
              <div>
                <Badge className="bg-fitness-success/10 text-fitness-success border-fitness-success/30">
                  {t('settings.strava.connected')}
                </Badge>
                {connection.athleteName && (
                  <p className="text-sm text-muted-foreground mt-1">{connection.athleteName}</p>
                )}
                {connection.lastSync && (
                  <p className="text-xs text-muted-foreground">
                    {t('settings.strava.lastSync', { date: new Date(connection.lastSync).toLocaleString(dateLocale(lang)) })}
                  </p>
                )}
              </div>
            </div>
            <div className="flex gap-2">
              {/* X27/WP-C: ręczny sync maks. raz na dobę — disabled do końca cooldownu,
                  z podpisem KIEDY będzie dostępny (serwer i tak egzekwuje limit). */}
              <Button variant="outline" onClick={handleSync} disabled={isSyncing || nextSyncAvailableAt !== null}>
                {isSyncing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
                {t('settings.strava.sync')}
              </Button>
              <Button variant="outline" className="text-destructive" onClick={handleDisconnect}>
                <Unlink className="h-4 w-4 mr-2" />
                {t('settings.strava.disconnect')}
              </Button>
            </div>
            {nextSyncAvailableAt && (
              <p className="text-xs text-muted-foreground">
                {t('strava.syncAvailableAt', { time: formatNextSyncTime(nextSyncAvailableAt, lang) })}
              </p>
            )}

            {/* Max HR setting */}
            <div className="border-t pt-4">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <p className="text-sm font-medium">{t('settings.maxHrLabel')}</p>
                  <p className="text-xs text-muted-foreground">
                    {connection.estimatedMaxHR
                      ? t('settings.maxHR.value', { value: connection.estimatedMaxHR, source: connection.maxHRManualOverride ? t('settings.maxHR.manual') : t('settings.maxHR.auto') })
                      : t('settings.maxHR.noData')
                    }
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <Input
                  type="number"
                  aria-label={t('settings.maxHrLabel')}
                  placeholder={connection.estimatedMaxHR?.toString() || '185'}
                  min={100}
                  max={230}
                  value={maxHRInput}
                  onChange={(e) => setMaxHRInput(e.target.value)}
                  className="w-24"
                />
                <Button variant="outline" size="sm" onClick={handleSaveMaxHR} disabled={maxHRSaving || !maxHRInput}>
                  {maxHRSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : t('common.save')}
                </Button>
              </div>
            </div>
            <PoweredByStrava className="mt-1" />
          </>
        ) : (
          <StravaConnectButton onConnect={connectStrava} />
        )}

        {error && (
          <p className="text-sm text-destructive">{error}</p>
        )}
      </CardContent>
    </Card>
  );
};
