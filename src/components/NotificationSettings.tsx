import { useEffect, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Bell, BellOff, Loader2 } from 'lucide-react';
import { useCurrentUser } from '@/contexts/UserContext';
import { useToast } from '@/hooks/use-toast';
import { useTranslation } from '@/contexts/LanguageContext';
import { getPushPermission, requestPushPermission, type PushPermission } from '@/lib/push-notifications';

// Ustawienia powiadomień: zgoda na push + przełącznik porannego przypomnienia o treningu.
export const NotificationSettings = () => {
  const { uid, profile } = useCurrentUser();
  const { toast } = useToast();
  const { t } = useTranslation();
  const isNative = Capacitor.isNativePlatform();
  const [perm, setPerm] = useState<PushPermission>('prompt');
  const [requesting, setRequesting] = useState(false);
  const prefs = (profile as { notificationPrefs?: { dailyReminder?: boolean } } | null)?.notificationPrefs;
  const [dailyReminder, setDailyReminder] = useState(prefs?.dailyReminder ?? true);

  useEffect(() => { void getPushPermission().then(setPerm); }, []);

  const enable = async () => {
    setRequesting(true);
    const ok = await requestPushPermission(uid);
    setPerm(await getPushPermission());
    setRequesting(false);
    toast(ok
      ? { title: t('settings.notif.enabled') }
      : { title: t('settings.notif.denied'), description: t('settings.notif.deniedDesc'), variant: 'destructive' });
  };

  const toggleDaily = async (value: boolean) => {
    setDailyReminder(value);
    try {
      await updateDoc(doc(db, 'users', uid), { 'notificationPrefs.dailyReminder': value });
    } catch {
      setDailyReminder(!value);
      toast({ title: t('admin.error'), variant: 'destructive' });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 font-heading font-bold uppercase tracking-tight">
          <Bell className="h-5 w-5 text-primary" />{t('settings.notif.title')}
        </CardTitle>
        <CardDescription>{t('settings.notif.desc')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!isNative ? (
          <p className="text-sm text-muted-foreground">{t('settings.notif.mobileOnly')}</p>
        ) : perm === 'granted' ? (
          <>
            <div className="flex items-center gap-2 text-sm text-fitness-success">
              <Bell className="h-4 w-4" />{t('settings.notif.on')}
            </div>
            <div className="flex items-center justify-between gap-3 rounded-lg bg-surface-low p-3">
              <div>
                <p className="text-sm font-medium">{t('settings.notif.daily')}</p>
                <p className="text-xs text-muted-foreground">{t('settings.notif.dailyDesc')}</p>
              </div>
              <Switch checked={dailyReminder} onCheckedChange={toggleDaily} />
            </div>
          </>
        ) : perm === 'denied' ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <BellOff className="h-4 w-4" />{t('settings.notif.deniedSettings')}
          </div>
        ) : (
          <Button onClick={enable} disabled={requesting} className="w-full">
            {requesting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Bell className="h-4 w-4 mr-2" />}
            {t('settings.notif.enableBtn')}
          </Button>
        )}
      </CardContent>
    </Card>
  );
};
