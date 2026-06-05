import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useCurrentUser } from '@/contexts/UserContext';
import { useUnit } from '@/contexts/UnitContext';
import { useAuth } from '@/hooks/useAuth';
import { useFirebaseWorkouts } from '@/hooks/useFirebaseWorkouts';
import { useToast } from '@/hooks/use-toast';
import { useTheme } from 'next-themes';
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
const LANGUAGE_KEY = 'app-language';
const REST_OPTIONS = ['30', '45', '60', '90', '120', '180'];

const Profile = () => {
  const navigate = useNavigate();
  const { uid, profile } = useCurrentUser();
  const { unit, setUnit } = useUnit();
  const { theme, setTheme } = useTheme();
  const { logout, resetPassword } = useAuth();
  const { workouts } = useFirebaseWorkouts(uid);
  const { toast } = useToast();

  const completedCount = workouts.filter((w) => w.completed).length;
  const tier = computeTier(completedCount);

  const [restTimer, setRestTimer] = useState(() => {
    try { return localStorage.getItem(REST_TIMER_KEY) || '90'; } catch { return '90'; }
  });
  const [notifications, setNotifications] = useState(() => {
    try { return localStorage.getItem(NOTIFICATIONS_KEY) !== 'false'; } catch { return true; }
  });
  const [language, setLanguage] = useState(() => {
    try { return localStorage.getItem(LANGUAGE_KEY) || 'pl'; } catch { return 'pl'; }
  });

  const [editOpen, setEditOpen] = useState(false);
  const [nameInput, setNameInput] = useState(profile?.displayName || '');
  const [savingName, setSavingName] = useState(false);

  const persist = (key: string, value: string) => {
    try { localStorage.setItem(key, value); } catch { /* ignore */ }
  };

  const handleRestChange = (v: string) => { setRestTimer(v); persist(REST_TIMER_KEY, v); };
  const handleNotifications = (v: boolean) => { setNotifications(v); persist(NOTIFICATIONS_KEY, String(v)); };
  const handleLanguage = (v: string) => {
    setLanguage(v);
    persist(LANGUAGE_KEY, v);
    toast({ title: 'Język zapisany', description: 'Pełne tłumaczenie interfejsu pojawi się wkrótce.' });
  };

  const handleSaveName = async () => {
    const trimmed = nameInput.trim();
    if (!trimmed) return;
    setSavingName(true);
    try {
      await updateDoc(doc(db, 'users', uid), { displayName: trimmed });
      toast({ title: 'Zapisano', description: 'Nazwa profilu zaktualizowana.' });
      setEditOpen(false);
    } catch {
      toast({ title: 'Błąd', description: 'Nie udało się zapisać.', variant: 'destructive' });
    } finally {
      setSavingName(false);
    }
  };

  const handleChangePassword = async () => {
    if (!profile?.email) return;
    const ok = await resetPassword(profile.email);
    toast(ok
      ? { title: 'Wysłano', description: `Link do zmiany hasła wysłany na ${profile.email}.` }
      : { title: 'Błąd', description: 'Nie udało się wysłać linku.', variant: 'destructive' });
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
            onClick={() => { setNameInput(profile?.displayName || ''); setEditOpen(true); }}
            className="absolute -bottom-1 -right-1 flex h-9 w-9 items-center justify-center rounded-full bg-primary text-primary-foreground"
            aria-label="Edytuj profil"
          >
            <Pencil className="h-4 w-4" />
          </button>
        </div>
        <h1 className="font-heading text-3xl font-bold uppercase tracking-tight">{profile?.displayName || 'Profil'}</h1>
        <TierBadge label={tier.label} />
      </div>

      {/* ACCOUNT */}
      <SectionCard label="Konto">
        <SettingRow icon={User} label="Edytuj profil" onClick={() => { setNameInput(profile?.displayName || ''); setEditOpen(true); }} />
        <SettingRow icon={Lock} label="Zmień hasło" onClick={handleChangePassword} />
        <SettingRow icon={ShieldCheck} label="Prywatność" onClick={() => navigate('/settings')} />
      </SectionCard>

      {/* WORKOUT PREFERENCES */}
      <SectionCard label="Preferencje treningu" labelAccent="secondary">
        <SettingRow
          icon={Timer}
          label="Domyślny czas odpoczynku"
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
          label="Jednostki"
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
      <SectionCard label="Aplikacja">
        <SettingRow icon={Bell} label="Powiadomienia" right={<Switch checked={notifications} onCheckedChange={handleNotifications} />} />
        <SettingRow icon={Moon} label="Tryb ciemny" right={<Switch checked={theme === 'dark'} onCheckedChange={(v) => setTheme(v ? 'dark' : 'light')} />} />
        <SettingRow
          icon={Globe}
          label="Język"
          right={(
            <Select value={language} onValueChange={handleLanguage}>
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
      <SectionCard label="Wsparcie">
        <SettingRow icon={SlidersHorizontal} label="Ustawienia zaawansowane" onClick={() => navigate('/settings')} />
        <SettingRow icon={HelpCircle} label="Centrum pomocy" onClick={() => window.open('https://grzegorzee.github.io/strength-save/', '_blank')} />
        <SettingRow icon={Mail} label="Kontakt" onClick={() => { window.location.href = 'mailto:kontakt@gjasionowicz.pl'; }} />
        <SettingRow icon={Info} label="O aplikacji" onClick={() => toast({ title: 'FitTracker', description: 'Aplikacja do śledzenia treningów siłowych.' })} />
      </SectionCard>

      <Button
        variant="outline"
        onClick={logout}
        className="h-12 w-full rounded-xl border-destructive/30 bg-destructive/5 font-bold uppercase tracking-[0.12em] text-destructive hover:bg-destructive/10"
      >
        <LogOut className="mr-2 h-4 w-4" /> Wyloguj
      </Button>

      {/* Edit profile dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="rounded-xl border-0 bg-surface-low">
          <DialogHeader>
            <DialogTitle className="font-heading uppercase">Edytuj profil</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <label className="text-label-md font-bold uppercase tracking-[0.12em] text-muted-foreground">Nazwa</label>
            <Input value={nameInput} onChange={(e) => setNameInput(e.target.value)} placeholder="Twoja nazwa" />
          </div>
          <DialogFooter>
            <Button onClick={handleSaveName} disabled={savingName || !nameInput.trim()} className="kinetic-primary-button">
              {savingName ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null} Zapisz
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Profile;
