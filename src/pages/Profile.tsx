import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { doc, updateDoc } from 'firebase/firestore';
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '@/lib/firebase';
import { useCurrentUser } from '@/contexts/UserContext';
import { useUnit } from '@/contexts/UnitContext';
import { useAuth } from '@/hooks/useAuth';
import { useFirebaseWorkouts } from '@/hooks/useFirebaseWorkouts';
import { useToast } from '@/hooks/use-toast';
import { useTheme } from 'next-themes';
import { useTranslation } from '@/contexts/LanguageContext';
import type { LanguageCode } from '@/i18n';
import { computeTier } from '@/lib/tier';
import { SectionCard } from '@/components/kinetic/SectionCard';
import { SettingRow } from '@/components/kinetic/SettingRow';
import { TierBadge } from '@/components/kinetic/TierBadge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import {
  User, Lock, ShieldCheck, Timer, Scale, Bell, Moon, Globe,
  HelpCircle, Mail, Info, LogOut, Pencil, SlidersHorizontal, Loader2,
} from 'lucide-react';

const REST_TIMER_KEY = 'rest-timer-default';
const NOTIFICATIONS_KEY = 'notifications-enabled';
const REST_OPTIONS = ['30', '45', '60', '90', '120', '180'];

const Profile = () => {
  const navigate = useNavigate();
  const { uid, profile } = useCurrentUser();
  const { unit, setUnit } = useUnit();
  const { theme, setTheme } = useTheme();
  const { logout, resetPassword } = useAuth();
  const { workouts } = useFirebaseWorkouts(uid);
  const { toast } = useToast();
  const { t, lang, setLang } = useTranslation();

  const completedCount = workouts.filter((w) => w.completed).length;
  const tier = computeTier(completedCount, 0, lang);

  const [restTimer, setRestTimer] = useState(() => {
    try { return localStorage.getItem(REST_TIMER_KEY) || '90'; } catch { return '90'; }
  });
  const [notifications, setNotifications] = useState(() => {
    try { return localStorage.getItem(NOTIFICATIONS_KEY) !== 'false'; } catch { return true; }
  });
  const [editOpen, setEditOpen] = useState(false);
  const [nameInput, setNameInput] = useState(profile?.displayName || '');
  const [savingName, setSavingName] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleAvatarFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setUploadingAvatar(true);
    try {
      const r = storageRef(storage, `avatars/${uid}/${Date.now()}-${file.name}`);
      await uploadBytes(r, file);
      const url = await getDownloadURL(r);
      await updateDoc(doc(db, 'users', uid), { photoURL: url });
      toast({ title: t('profile.toast.avatarUpdated') });
    } catch {
      toast({ title: t('profile.toast.error'), description: t('profile.toast.avatarFailed'), variant: 'destructive' });
    } finally {
      setUploadingAvatar(false);
    }
  };

  const persist = (key: string, value: string) => {
    try { localStorage.setItem(key, value); } catch { /* ignore */ }
  };

  const handleRestChange = (v: string) => { setRestTimer(v); persist(REST_TIMER_KEY, v); };
  const handleNotifications = (v: boolean) => { setNotifications(v); persist(NOTIFICATIONS_KEY, String(v)); };
  const handleLanguage = (v: string) => {
    setLang(v as LanguageCode);
    toast({ title: t('profile.langSaved') });
  };

  const handleSaveName = async () => {
    const trimmed = nameInput.trim();
    if (!trimmed) return;
    setSavingName(true);
    try {
      await updateDoc(doc(db, 'users', uid), { displayName: trimmed });
      toast({ title: t('profile.toast.saved'), description: t('profile.toast.nameUpdated') });
      setEditOpen(false);
    } catch {
      toast({ title: t('profile.toast.error'), description: t('profile.toast.saveFailed'), variant: 'destructive' });
    } finally {
      setSavingName(false);
    }
  };

  const handleChangePassword = async () => {
    if (!profile?.email) return;
    const ok = await resetPassword(profile.email);
    toast(ok
      ? { title: t('profile.toast.sent'), description: t('profile.toast.passwordLink', { email: profile.email }) }
      : { title: t('profile.toast.error'), description: t('profile.toast.linkFailed'), variant: 'destructive' });
  };

  const initials = (profile?.displayName || profile?.email || '?').slice(0, 2).toUpperCase();

  return (
    <div className="mx-auto max-w-xl space-y-8">
      {/* Avatar + nick + tier */}
      <div className="flex flex-col items-center gap-3 pt-2 text-center">
        <div className="relative">
          <Avatar className="h-28 w-28 ring-2 ring-primary/60">
            <AvatarImage src={profile?.photoURL || undefined} alt={profile?.displayName || ''} />
            <AvatarFallback className="bg-surface-highest text-2xl font-heading font-bold">{initials}</AvatarFallback>
          </Avatar>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploadingAvatar}
            className="absolute -bottom-1 -right-1 flex h-9 w-9 items-center justify-center rounded-full bg-primary text-primary-foreground disabled:opacity-60"
            aria-label={t('profile.aria.changeAvatar')}
          >
            {uploadingAvatar ? <Loader2 className="h-4 w-4 animate-spin" /> : <Pencil className="h-4 w-4" />}
          </button>
          <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarFile} />
        </div>
        <h1 className="font-heading text-3xl font-bold uppercase italic tracking-tight">{profile?.displayName || t('profile.title')}</h1>
        <TierBadge label={tier.label} />
      </div>

      {/* ACCOUNT */}
      <SectionCard label={t('profile.section.account')}>
        <SettingRow icon={User} label={t('profile.account.edit')} onClick={() => { setNameInput(profile?.displayName || ''); setEditOpen(true); }} />
        <SettingRow icon={Lock} label={t('profile.account.password')} onClick={handleChangePassword} />
        <SettingRow icon={ShieldCheck} label={t('profile.account.privacy')} onClick={() => navigate('/settings')} />
      </SectionCard>

      {/* WORKOUT PREFERENCES */}
      <SectionCard label={t('profile.section.preferences')} labelAccent="secondary">
        <SettingRow
          icon={Timer}
          label={t('profile.pref.restTimer')}
          right={(
            <Select value={restTimer} onValueChange={handleRestChange}>
              <SelectTrigger className="h-9 w-24 border-0 bg-surface-highest"><SelectValue /></SelectTrigger>
              <SelectContent>
                {REST_OPTIONS.map((s) => <SelectItem key={s} value={s}>{s}s</SelectItem>)}
              </SelectContent>
            </Select>
          )}
        />
        <SettingRow
          icon={Scale}
          label={t('profile.pref.units')}
          right={(
            <div className="flex gap-1 rounded-full bg-surface-highest p-1">
              {(['kg', 'lbs'] as const).map((u) => (
                <button
                  key={u}
                  type="button"
                  onClick={() => setUnit(u)}
                  className={cn(
                    'rounded-full px-3 py-1 text-xs font-bold uppercase transition-colors',
                    unit === u ? 'bg-primary text-primary-foreground' : 'text-muted-foreground',
                  )}
                >
                  {u}
                </button>
              ))}
            </div>
          )}
        />
      </SectionCard>

      {/* APP SETTINGS */}
      <SectionCard label={t('profile.section.app')}>
        <SettingRow icon={Bell} label={t('profile.app.notifications')} right={<Switch checked={notifications} onCheckedChange={handleNotifications} />} />
        <SettingRow icon={Moon} label={t('profile.app.darkMode')} right={<Switch checked={theme === 'dark'} onCheckedChange={(v) => setTheme(v ? 'dark' : 'light')} />} />
        <SettingRow
          icon={Globe}
          label={t('profile.app.language')}
          right={(
            <Select value={lang} onValueChange={handleLanguage}>
              <SelectTrigger className="h-9 w-28 border-0 bg-surface-highest"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="pl">Polski</SelectItem>
                <SelectItem value="en">English</SelectItem>
              </SelectContent>
            </Select>
          )}
        />
      </SectionCard>

      {/* SUPPORT */}
      <SectionCard label={t('profile.section.support')}>
        <SettingRow icon={SlidersHorizontal} label={t('profile.support.advanced')} onClick={() => navigate('/settings')} />
        <SettingRow icon={HelpCircle} label={t('profile.support.help')} onClick={() => window.open('https://grzegorzee.github.io/strength-save/', '_blank')} />
        <SettingRow icon={Mail} label={t('profile.support.contact')} onClick={() => { window.location.href = 'mailto:kontakt@gjasionowicz.pl'; }} />
        <SettingRow icon={Info} label={t('profile.support.about')} onClick={() => toast({ title: t('profile.about.title'), description: t('profile.about.desc') })} />
      </SectionCard>

      <Button
        variant="outline"
        onClick={logout}
        className="h-12 w-full rounded-xl border-destructive/30 bg-destructive/5 font-bold uppercase tracking-[0.12em] text-destructive hover:bg-destructive/10"
      >
        <LogOut className="mr-2 h-4 w-4" /> {t('profile.logout')}
      </Button>

      {/* Edit profile dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="rounded-xl border-0 bg-surface-low">
          <DialogHeader>
            <DialogTitle className="font-heading uppercase">{t('profile.editTitle')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <label className="text-label-md font-bold uppercase tracking-[0.12em] text-muted-foreground">{t('profile.nameLabel')}</label>
            <Input value={nameInput} onChange={(e) => setNameInput(e.target.value)} placeholder={t('profile.namePlaceholder')} />
          </div>
          <DialogFooter>
            <Button onClick={handleSaveName} disabled={savingName || !nameInput.trim()} className="kinetic-primary-button">
              {savingName ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null} {t('common.save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Profile;
