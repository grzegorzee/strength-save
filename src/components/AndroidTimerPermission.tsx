import { useCallback, useEffect, useRef, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';
import { Button } from '@/components/ui/button';
import { useTranslation } from '@/contexts/LanguageContext';
import { addAppStateListener } from '@/lib/app-lifecycle';

type AlarmAccess = 'checking' | 'granted' | 'denied' | 'unavailable';

/** A settings-only, user-initiated OS permission. It never interrupts a workout. */
export const AndroidTimerPermission = () => {
  const { t } = useTranslation();
  const android = Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android';
  const [access, setAccess] = useState<AlarmAccess>('checking');
  const [opening, setOpening] = useState(false);
  const generation = useRef(0);
  const refresh = useCallback(async () => {
    const request = ++generation.current;
    let next: AlarmAccess;
    try {
      const result = await LocalNotifications.checkExactNotificationSetting();
      next = result.exact_alarm === 'granted' ? 'granted' : 'denied';
    } catch {
      next = 'unavailable';
    }
    if (request === generation.current) setAccess(next);
  }, []);

  useEffect(() => {
    if (!android) return;
    void refresh();
    const remove = addAppStateListener(active => { if (active) void refresh(); });
    return () => { generation.current += 1; remove(); };
  }, [android, refresh]);

  const openSettings = async () => {
    setOpening(true);
    try { await LocalNotifications.changeExactNotificationSetting(); }
    catch { /* Keep the retry available when the OS settings screen cannot open. */ }
    await refresh();
    setOpening(false);
  };

  if (!android || access === 'checking' || access === 'granted') return null;
  return (
    <div className="rounded-xl border border-fitness-warning/30 bg-fitness-warning/10 p-3">
      <p className="text-sm text-foreground">
        {t(access === 'unavailable' ? 'rest.exactAlarm.unavailable' : 'rest.exactAlarm.needed')}
      </p>
      <Button type="button" variant="outline" size="sm" className="mt-2" disabled={opening} onClick={() => void openSettings()}>
        {t('rest.exactAlarm.openSettings')}
      </Button>
    </div>
  );
};
