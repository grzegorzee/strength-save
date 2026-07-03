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
import { useTranslation } from '@/contexts/LanguageContext';
import type { LanguageCode } from '@/i18n';
import { computeTier } from '@/lib/tier';
import { deleteOwnAccount } from '@/lib/registration-api';
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
import { FEATURE_FLAGS } from '@/lib/feature-flags';
import {
  User, Lock, ShieldCheck, Timer, Scale, Bell, Globe, Volume2,
  HelpCircle, Mail, Info, LogOut, Pencil, SlidersHorizontal, Loader2,
} from 'lucide-react';

const REST_TIMER_KEY = 'rest-timer-default';
const SOUND_KEY = 'timer-sound-enabled';
const REST_OPTIONS = ['30', '45', '60', '90', '120', '180'];

const Profile = () => {
  const navigate = useNavigate();
  const { uid, profile } = useCurrentUser();
  const { unit, setUnit } = useUnit();
  const { logout, resetPassword } = useAuth();
  const { workouts } = useFirebaseWorkouts(uid);
  const { toast } = useToast();
  const { t, lang, setLang } = useTranslation();

  const completedCount = workouts.filter((w) => w.completed).length;
  const tier = computeTier(completedCount, 0, lang);

  const [restTimer, setRestTimer] = useState(() => {
    try { return localStorage.getItem(REST_TIMER_KEY) || '90'; } catch { return '90'; }
  });
  const [sound, setSound] = useState(() => {
    try { return localStorage.getItem(SOUND_KEY) !== 'false'; } catch { return true; }
  });
  const [editOpen, setEditOpen] = useState(false);
  const [nameInput, setNameInput] = useState(profile?.displayName || '');
  const [savingName, setSavingName] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [deleteAccountOpen, setDeleteAccountOpen] = useState(false);
  const [deleteConfirmInput, setDeleteConfirmInput] = useState('');
  const [deletingAccount, setDeletingAccount] = useState(false);
  const deleteConfirmWord = lang === 'pl' ? 'USUŃ' : 'DELETE';

  const handleDeleteAccount = async () => {
    setDeletingAccount(true);
    try {
      await deleteOwnAccount();
      // Konto Auth już nie istnieje — lokalny logout domyka sesję, gate przejmuje resztę.
      await logout();
    } catch (err) {
      setDeletingAccount(false);
      toast({
        title: t('profile.deleteAccount.error'),
        description: err instanceof Error ? err.message : '',
        variant: 'destructive',
      });
    }
  };
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleAvatarFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setUploadingAvatar(true);
    try {
      // Stała ścieżka = nadpisywanie: bez osieroconych plików po każdej zmianie (R2-29).
      // Nowy upload generuje nowy download token, więc URL i tak się zmienia (brak stale cache).
      const r = storageRef(storage, `avatars/${uid}/avatar`);
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

  // Timer i dźwięk lecą też do users/{uid}.preferences — spójne między web i iOS.
  const persistPreference = (patch: Record<string, number | boolean>) => {
    updateDoc(doc(db, 'users', uid), patch).catch(() => { /* offline — localStorage wystarczy do następnej sesji */ });
  };
  const handleRestChange = (v: string) => {
    setRestTimer(v);
    persist(REST_TIMER_KEY, v);
    persistPreference({ 'preferences.restTimerSec': parseInt(v, 10) || 90 });
  };
  const handleSound = (v: boolean) => {
    setSound(v);
    persist(SOUND_KEY, String(v));
    persistPreference({ 'preferences.timerSound': v });
  };
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
        {profile?.email && <p className="text-sm text-muted-foreground">{profile.email}</p>}
        <TierBadge label={tier.label} />
      </div>

      {/* ACCOUNT */}
      <SectionCard label={t('profile.section.account')}>
        <SettingRow icon={User} label={t('profile.account.edit')} onClick={() => { setNameInput(profile?.displayName || ''); setEditOpen(true); }} />
        <SettingRow icon={Lock} label={t('profile.account.password')} onClick={handleChangePassword} />
        <SettingRow icon={ShieldCheck} label={t('profile.account.privacy')} onClick={() => navigate('/settings?section=data')} />
      </SectionCard>

      {/* WORKOUT PREFERENCES */}
      <SectionCard label={t('profile.section.preferences')} labelAccent="secondary">
        {FEATURE_FLAGS.workoutTimers && (
          <SettingRow
            icon={Timer}
            label={t('profile.pref.restTimer')}
            right={(
              <Select value={restTimer} onValueChange={handleRestChange}>
                <SelectTrigger className="h-9 w-24 border-0 bg-surface-highest" aria-label={t('profile.pref.restTimer')}><SelectValue /></SelectTrigger>
                <SelectContent>
                  {REST_OPTIONS.map((s) => <SelectItem key={s} value={s}>{s}s</SelectItem>)}
                </SelectContent>
              </Select>
            )}
          />
        )}
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
                  aria-pressed={unit === u}
                  aria-label={`${t('profile.pref.units')}: ${u}`}
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
        <SettingRow icon={Bell} label={t('profile.app.notifications')} onClick={() => navigate('/settings?section=notifications')} />
        {FEATURE_FLAGS.workoutTimers && (
          <SettingRow icon={Volume2} label={t('profile.app.sound')} right={<Switch checked={sound} onCheckedChange={handleSound} aria-label={t('profile.app.sound')} />} />
        )}
        <SettingRow
          icon={Globe}
          label={t('profile.app.language')}
          right={(
            <Select value={lang} onValueChange={handleLanguage}>
              <SelectTrigger className="h-9 w-28 border-0 bg-surface-highest" aria-label={t('profile.app.language')}><SelectValue /></SelectTrigger>
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

      <button
        onClick={() => { setDeleteConfirmInput(''); setDeleteAccountOpen(true); }}
        className="w-full text-center text-xs text-muted-foreground underline-offset-2 hover:text-destructive hover:underline"
      >
        {t('profile.deleteAccount')}
      </button>

      {/* Delete account dialog (Apple 5.1.1(v): self-service usunięcie konta) */}
      <Dialog open={deleteAccountOpen} onOpenChange={(open) => { if (!deletingAccount) setDeleteAccountOpen(open); }}>
        <DialogContent className="rounded-xl border-0 bg-surface-low">
          <DialogHeader>
            <DialogTitle className="font-heading uppercase text-destructive">{t('profile.deleteAccount')}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">{t('profile.deleteAccount.desc')}</p>
          <div className="space-y-2">
            <label htmlFor="delete-account-confirm" className="text-label-md font-bold uppercase tracking-[0.12em] text-muted-foreground">
              {t('profile.deleteAccount.typeToConfirm', { word: deleteConfirmWord })}
            </label>
            <Input
              id="delete-account-confirm"
              value={deleteConfirmInput}
              onChange={(e) => setDeleteConfirmInput(e.target.value)}
              autoComplete="off"
            />
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDeleteAccountOpen(false)} disabled={deletingAccount}>
              {t('common.cancel')}
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteAccount}
              disabled={deletingAccount || deleteConfirmInput.trim().toUpperCase() !== deleteConfirmWord}
            >
              {deletingAccount ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {t('profile.deleteAccount.confirm')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit profile dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="rounded-xl border-0 bg-surface-low">
          <DialogHeader>
            <DialogTitle className="font-heading uppercase">{t('profile.editTitle')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <label htmlFor="profile-display-name" className="text-label-md font-bold uppercase tracking-[0.12em] text-muted-foreground">{t('profile.nameLabel')}</label>
            <Input id="profile-display-name" value={nameInput} onChange={(e) => setNameInput(e.target.value)} placeholder={t('profile.namePlaceholder')} />
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
