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
import { getPushPermission, registerPushForUser, requestPushPermission, type PushPermission } from '@/lib/push-notifications';

// Ustawienia powiadomień: zgoda na push + przełącznik porannego przypomnienia o treningu.
export const NotificationSettings = () => {
  const { uid, profile } = useCurrentUser();
  const { toast } = useToast();
  const { t } = useTranslation();
  const isNative = Capacitor.isNativePlatform();
  const [perm, setPerm] = useState<PushPermission>('prompt');
  const [requesting, setRequesting] = useState(false);
  const [registrationFailed, setRegistrationFailed] = useState(false);
  const prefs = (profile as { notificationPrefs?: { dailyReminder?: boolean; weeklyDigest?: boolean } } | null)?.notificationPrefs;
  const [dailyReminder, setDailyReminder] = useState(prefs?.dailyReminder ?? true);
  const [weeklyDigest, setWeeklyDigest] = useState(prefs?.weeklyDigest ?? true);

  useEffect(() => {
    let cancelled = false;
    void getPushPermission().then(async (permission) => {
      if (cancelled) return;
      setPerm(permission);
      if (permission !== 'granted') return;
      const result = await registerPushForUser(uid);
      if (!cancelled) setRegistrationFailed(result.status !== 'registered');
    });
    return () => { cancelled = true; };
  }, [uid]);

  const enable = async () => {
    setRequesting(true);
    const ok = await requestPushPermission(uid);
    const permission = await getPushPermission();
    setPerm(permission);
    setRegistrationFailed(!ok && permission === 'granted');
    setRequesting(false);
    toast(ok
      ? { title: t('settings.notif.enabled') }
      : permission === 'granted'
        ? { title: t('settings.notif.registrationFailed'), description: t('settings.notif.registrationFailedDesc'), variant: 'destructive' }
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

  const toggleWeeklyDigest = async (value: boolean) => {
    setWeeklyDigest(value);
    try {
      await updateDoc(doc(db, 'users', uid), { 'notificationPrefs.weeklyDigest': value });
    } catch {
      setWeeklyDigest(!value);
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
        {/* Digest e-mail nie wymaga push: dostępny też na webie. */}
        <div className="flex items-center justify-between gap-3 rounded-lg bg-surface-low p-3">
          <div>
            <p className="text-sm font-medium">{t('settings.notif.weeklyDigest')}</p>
            <p className="text-xs text-muted-foreground">{t('settings.notif.weeklyDigestDesc')}</p>
          </div>
          <Switch checked={weeklyDigest} onCheckedChange={toggleWeeklyDigest} aria-label={t('settings.notif.weeklyDigest')} />
        </div>
        {!isNative ? (
          <p className="text-sm text-muted-foreground">{t('settings.notif.mobileOnly')}</p>
        ) : perm === 'granted' ? (
          <>
            {registrationFailed ? (
              <div className="space-y-2 rounded-lg border border-destructive/30 bg-destructive/5 p-3">
                <p className="text-sm text-destructive">{t('settings.notif.registrationFailed')}</p>
                <Button variant="outline" size="sm" onClick={enable} disabled={requesting}>
                  {t('settings.notif.enableBtn')}
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-sm text-fitness-success">
                <Bell className="h-4 w-4" />{t('settings.notif.on')}
              </div>
            )}
            <div className="flex items-center justify-between gap-3 rounded-lg bg-surface-low p-3">
              <div>
                <p className="text-sm font-medium">{t('settings.notif.daily')}</p>
                <p className="text-xs text-muted-foreground">{t('settings.notif.dailyDesc')}</p>
              </div>
              <Switch checked={dailyReminder} onCheckedChange={toggleDaily} aria-label={t('settings.notif.daily')} />
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
