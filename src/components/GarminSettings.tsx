import { useCallback, useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Watch, Loader2, Unlink } from 'lucide-react';
import { useTranslation } from '@/contexts/LanguageContext';
import {
  listGarminDevices,
  revokeGarminDevice,
  startGarminPairing,
  type GarminDevice,
  type GarminPairCode,
} from '@/lib/garmin-api';
import { dateLocale } from '@/i18n';

/**
 * Z125: parowanie zegarka Garmin (Connect IQ). User generuje 6-cyfrowy kod
 * (TTL 10 min), wpisuje go na zegarku; sparowane urządzenia można odłączyć
 * (revoke tokenu po stronie functions).
 */
export const GarminSettings = () => {
  const { t, lang } = useTranslation();
  const [devices, setDevices] = useState<GarminDevice[]>([]);
  const [pairCode, setPairCode] = useState<GarminPairCode | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [busy, setBusy] = useState(false);

  const refreshDevices = useCallback(async () => {
    try {
      setDevices(await listGarminDevices());
    } catch { /* offline/nieskonfigurowane — sekcja zostaje pusta */ }
  }, []);

  useEffect(() => {
    void refreshDevices();
  }, [refreshDevices]);

  // Odliczanie TTL kodu.
  useEffect(() => {
    if (!pairCode) return;
    const tick = () => {
      const left = Math.max(0, Math.round((pairCode.expiresAt - Date.now()) / 1000));
      setSecondsLeft(left);
      if (left === 0) setPairCode(null);
    };
    tick();
    const timer = window.setInterval(tick, 1000);
    return () => window.clearInterval(timer);
  }, [pairCode]);

  const handlePair = async () => {
    setBusy(true);
    try {
      setPairCode(await startGarminPairing('Garmin'));
    } finally {
      setBusy(false);
    }
  };

  const handleRevoke = async (deviceId: string) => {
    setBusy(true);
    try {
      await revokeGarminDevice(deviceId);
      await refreshDevices();
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card data-testid="garmin-settings">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Watch className="h-5 w-5 text-primary" />
          {t('garmin.title')}
        </CardTitle>
        <CardDescription>{t('garmin.description')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {pairCode ? (
          <div className="text-center space-y-1" data-testid="garmin-pair-code">
            <p className="text-3xl font-bold tracking-[0.3em]">{pairCode.code}</p>
            <p className="text-xs text-muted-foreground">
              {t('garmin.codeHint', { seconds: secondsLeft })}
            </p>
          </div>
        ) : (
          <Button onClick={handlePair} disabled={busy} data-testid="garmin-pair-start">
            {busy ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Watch className="h-4 w-4 mr-2" />}
            {t('garmin.pairButton')}
          </Button>
        )}

        {devices.length > 0 && (
          <div className="space-y-2">
            {devices.map((device) => (
              <div
                key={device.deviceId}
                className="flex items-center justify-between rounded-lg border border-border px-3 py-2"
                data-testid="garmin-device-row"
              >
                <div>
                  <p className="text-sm font-medium">{device.label}</p>
                  <p className="text-xs text-muted-foreground">
                    {t('garmin.lastUsed', {
                      date: new Date(device.lastUsedAt).toLocaleDateString(dateLocale(lang)),
                    })}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={busy}
                  onClick={() => handleRevoke(device.deviceId)}
                  data-testid="garmin-device-revoke"
                >
                  <Unlink className="h-4 w-4 mr-1" />
                  {t('garmin.unlink')}
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
