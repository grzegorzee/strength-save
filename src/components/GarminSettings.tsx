import { useCallback, useEffect, useMemo, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Watch, Loader2, Unlink, RefreshCw, Smartphone } from 'lucide-react';
import { useTranslation } from '@/contexts/LanguageContext';
import {
  listLinkedDevices,
  reportAppleWatchStatus,
  startGarminPairing,
  unlinkLinkedDevice,
  type AppleWatchStatusReport,
  type GarminPairCode,
  type LinkedDevice,
} from '@/lib/garmin-api';
import { getWatchAvailability } from '@/lib/watch-bridge';
import { useSubscription } from '@/hooks/useSubscription';
import { dateLocale } from '@/i18n';
import { mobileStoreDestinations, saveAppleWatchLinkedState } from '@/lib/device-management';

const nativePlatform = (): 'web' | 'ios' | 'android' => {
  if (!Capacitor.isNativePlatform()) return 'web';
  return Capacitor.getPlatform() === 'ios' ? 'ios' : 'android';
};

/** Z227: one device/access panel rendered by the same React client on web/iOS/Android.
 *  X36: `hideTitle` — karta w zwijanej sekcji Profilu "Urządzenia i połączenia"
 *  (tytuł dawał dwie linie obok "Odśwież" na 393 px). */
export const GarminSettings = ({ hideTitle = false }: { hideTitle?: boolean } = {}) => {
  const { t, lang } = useTranslation();
  const subscription = useSubscription();
  const [devices, setDevices] = useState<LinkedDevice[]>([]);
  const [pairCode, setPairCode] = useState<GarminPairCode | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [localWatchReport, setLocalWatchReport] = useState<AppleWatchStatusReport | null>(null);
  const platform = nativePlatform();
  const stores = useMemo(() => mobileStoreDestinations(platform), [platform]);

  const readLocalWatch = useCallback(async (): Promise<AppleWatchStatusReport | null> => {
    if (platform !== 'ios') return null;
    const status = await getWatchAvailability();
    if (!status?.paired || !status.watchAppInstalled || !status.deviceId) return null;
    return {
      deviceId: status.deviceId,
      label: status.label || 'Apple Watch',
      paired: status.paired,
      watchAppInstalled: status.watchAppInstalled,
      reachable: status.reachable,
      pendingEvents: Math.max(0, Math.floor(status.pendingEvents ?? 0)),
      healthStatus: status.healthStatus ?? 'unknown',
      lastSyncAt: status.lastSyncAt ?? null,
    };
  }, [platform]);

  const refreshDevices = useCallback(async (relinkWatch = false) => {
    setLoading(true);
    setError(false);
    try {
      const localWatch = await readLocalWatch();
      setLocalWatchReport(localWatch);
      if (localWatch) {
        const result = await reportAppleWatchStatus(localWatch, relinkWatch);
        saveAppleWatchLinkedState(result.linked);
      }
      setDevices(await listLinkedDevices());
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [readLocalWatch]);

  useEffect(() => {
    void refreshDevices();
  }, [refreshDevices]);

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
    setError(false);
    try {
      setPairCode(await startGarminPairing('Garmin'));
    } catch {
      setError(true);
    } finally {
      setBusy(false);
    }
  };

  const handleUnlink = async (device: LinkedDevice) => {
    setBusy(true);
    setError(false);
    try {
      await unlinkLinkedDevice(device.platform, device.deviceId);
      if (device.platform === 'apple_watch') saveAppleWatchLinkedState(false);
      await refreshDevices();
    } catch {
      setError(true);
    } finally {
      setBusy(false);
    }
  };

  const formatDate = (value: number | null) => value
    ? new Date(value).toLocaleString(dateLocale(lang), { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
    : t('devices.never');
  const hasReportedWatch = devices.some((device) => device.platform === 'apple_watch');

  return (
    <Card data-testid="device-settings">
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div>
            {!hideTitle && (
              <CardTitle className="flex items-center gap-2 text-lg">
                <Watch className="h-5 w-5 text-primary" />
                {t('devices.title')}
              </CardTitle>
            )}
            <CardDescription>{t('devices.description')}</CardDescription>
          </div>
          <Button
            variant="ghost"
            size="sm"
            disabled={busy || loading}
            onClick={() => void refreshDevices()}
            data-testid="devices-refresh"
          >
            <RefreshCw className={`h-4 w-4 mr-1 ${loading ? 'animate-spin' : ''}`} />
            {t('devices.refresh')}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between rounded-lg border border-border px-3 py-2">
          <div>
            <p className="text-sm font-medium">{t('devices.access')}</p>
            <p className="text-xs text-muted-foreground">{t('devices.onePro')}</p>
          </div>
          <Badge variant={subscription.isPro ? 'default' : 'secondary'}>
            {subscription.loading ? t('devices.checking') : subscription.isPro ? `PRO · ${subscription.tier}` : t('devices.inactive')}
          </Badge>
        </div>

        {platform === 'web' && (
          <div className="space-y-2 rounded-lg bg-muted/40 p-3" data-testid="devices-mobile-store-links">
            <p className="text-xs text-muted-foreground">{t('devices.webPurchase')}</p>
            <div className="flex flex-wrap gap-2">
              {stores.map((store) => (
                <Button key={store.platform} variant="outline" size="sm" asChild>
                  <a href={store.url} target="_blank" rel="noreferrer">
                    <Smartphone className="h-4 w-4 mr-1" />
                    {store.platform === 'ios' ? t('devices.openIos') : t('devices.openAndroid')}
                  </a>
                </Button>
              ))}
            </div>
          </div>
        )}

        {error && <p className="text-sm text-destructive" role="alert">{t('devices.error')}</p>}

        {loading && devices.length === 0 ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> {t('devices.loading')}
          </div>
        ) : devices.length > 0 ? (
          <div className="space-y-2">
            {devices.map((device) => (
              <div
                key={`${device.platform}:${device.deviceId}`}
                className="rounded-lg border border-border px-3 py-2 space-y-2"
                data-testid="linked-device-row"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium">{device.label}</p>
                    <p className="text-xs text-muted-foreground">
                      {device.platform === 'apple_watch' ? 'Apple Watch' : 'Garmin'} · {t(`devices.sync.${device.syncStatus}`)}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={busy}
                    onClick={() => void handleUnlink(device)}
                    data-testid="linked-device-unlink"
                  >
                    <Unlink className="h-4 w-4 mr-1" />
                    {t('devices.unlink')}
                  </Button>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                  <span>{t('devices.lastSync')}: {formatDate(device.lastSyncAt)}</span>
                  <span>{t('devices.pending')}: {device.pendingEvents ?? t('devices.unknown')}</span>
                  <span>{device.integration === 'healthkit' ? 'HealthKit' : 'FIT'}: {t(`devices.integration.${device.integrationStatus}`)}</span>
                  <span>{t('devices.lastSeen')}: {formatDate(device.lastSeenAt)}</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">{t('devices.none')}</p>
        )}

        {localWatchReport && !hasReportedWatch && (
          <Button variant="outline" disabled={busy} onClick={() => void refreshDevices(true)}>
            <Watch className="h-4 w-4 mr-2" /> {t('devices.relinkWatch')}
          </Button>
        )}

        {subscription.isPro && (pairCode ? (
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
        ))}
      </CardContent>
    </Card>
  );
};
