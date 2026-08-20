import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { doc, updateDoc } from 'firebase/firestore';
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '@/lib/firebase';
import { ACCENTS, applyAccent, isCustomAccentHex, readStoredAccentId, storeAccentId } from '@/lib/accent-theme';
import { useCurrentUser } from '@/contexts/UserContext';
import { useUnit } from '@/contexts/UnitContext';
import { useAuth } from '@/hooks/useAuth';
import { useFirebaseWorkouts } from '@/hooks/useFirebaseWorkouts';
import { useToast } from '@/hooks/use-toast';
import { useTranslation } from '@/contexts/LanguageContext';
import { LANGUAGES, type LanguageCode } from '@/i18n';
import { computeTier } from '@/lib/tier';
import { deleteOwnAccount } from '@/lib/registration-api';
import { useSubscription, isPaywallPlatform } from '@/hooks/useSubscription';
import { summarizeSubscription, hasProPlan } from '@/lib/subscription-summary';
import { dateLocale } from '@/i18n';
import { SectionCard } from '@/components/kinetic/SectionCard';
import { SettingRow } from '@/components/kinetic/SettingRow';
import { ProfileHeaderChips } from '@/components/kinetic/ProfileHeaderChips';
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
import { TERMS_URL, PRIVACY_URL } from '@/lib/legal-links';
import { setWorkoutTimersEnabled } from '@/lib/workout-timers-setting';
import { getPushPermission } from '@/lib/push-notifications';
import { useWorkoutAggregate } from '@/hooks/useWorkoutAggregate';
import {
  User, Lock, ShieldCheck, Timer, Scale, Bell, Globe, Volume2,
  HelpCircle, Mail, Info, LogOut, Pencil, SlidersHorizontal, Loader2,
  ScrollText, Ruler, Trophy, Shield, Gem, CreditCard, Medal,
  Dumbbell, ChevronRight,
} from 'lucide-react';
import { AchievementBadge } from '@/components/kinetic/AchievementBadge';
import { computeMilestones, tierForIndex } from '@/lib/achievements-utils';
import { calculateTonnage } from '@/lib/summary-utils';
import { PR_BACKFILL_LIFTS, PR_BACKFILL_SOFT_WARN_KG, sanitizePRBackfill, type PRBackfillLift } from '@/lib/pr-backfill';
import { ReducedModeDialog } from '@/components/ReducedModeDialog';
import { buildReducedMode, isReducedModeActive, type ReducedModeLevel } from '@/lib/reduced-mode';
import { VacationDialog } from '@/components/VacationDialog';
import { buildVacationMode, isVacationActive, type VacationActivity } from '@/lib/vacation-mode';
import { Plane } from 'lucide-react';
import { useTrainingPlan } from '@/hooks/useTrainingPlan';
import { formatLocalDate, parseLocalDate } from '@/lib/utils';
import { BatteryLow } from 'lucide-react';

import { REST_TIMER_KEY, SOUND_KEY, REST_OPTIONS } from '@/lib/workout-preferences';

const Profile = () => {
  const navigate = useNavigate();
  const { uid, profile, isAdmin } = useCurrentUser();
  const { unit, setUnit, toDisplay, fromInput } = useUnit();
  const { logout, logoutAfterAccountDeletion, resetPassword } = useAuth();
  const { workouts } = useFirebaseWorkouts(uid, { measurements: 'none', workouts: 'recent' });
  const { toast } = useToast();
  const { t, lang, setLang } = useTranslation();

  // Z216/Z217: licznik all-time z agregatu; okno recent tylko fallbackiem.
  const aggregate = useWorkoutAggregate(uid);
  const completedCount = aggregate?.totals.workoutCount ?? workouts.filter((w) => w.completed).length;
  const tier = computeTier(completedCount, 0, lang);

  // PRO-D T6: sekcja dumy — 3 najwyższe zdobyte odznaki. Dane z agregatu (fallback:
  // okno recent), więc tylko kategorie workouts+tonnage (records wymaga pełnej historii).
  const totalTonnage = aggregate?.totals.totalTonnageKg
    ?? calculateTonnage(workouts.filter((w) => w.completed));
  const prideMilestones = computeMilestones({
    completedWorkouts: completedCount,
    totalTonnage,
    exercisesWithRecord: 0,
  }).filter((m) => m.category !== 'records');
  const PRIDE_ICONS = { workouts: Trophy, tonnage: Dumbbell } as const;
  const recentBadges = prideMilestones
    .filter((m) => m.achieved)
    .sort((a, b) => b.threshold - a.threshold)
    .slice(0, 3)
    .map((m) => {
      const catItems = prideMilestones.filter((x) => x.category === m.category);
      return {
        ...m,
        tier: tierForIndex(catItems.indexOf(m), catItems.length),
        icon: PRIDE_ICONS[m.category as 'workouts' | 'tonnage'],
      };
    });
  const prideLabel = (m: { category: string; threshold: number }) => m.category === 'tonnage'
    ? t('achievements.ms.tonnage', { n: Number((toDisplay(m.threshold) / 1000).toFixed(1)), unit: unit === 'lbs' ? ' k lbs' : 't' })
    : t('achievements.ms.workouts', { n: m.threshold });

  const subscriptionInfo = useSubscription();
  const subSummary = summarizeSubscription({
    isAdmin,
    isPro: subscriptionInfo.isPro,
    tier: subscriptionInfo.tier,
    startedAt: subscriptionInfo.startedAt,
    expiresAt: subscriptionInfo.expiresAt,
    subscription: subscriptionInfo.subscription,
  });
  const formatSubDate = (iso: string) =>
    new Date(iso).toLocaleDateString(dateLocale(lang), { day: 'numeric', month: 'long', year: 'numeric' });
  const subDescription = subSummary.detailKey
    ? t(subSummary.detailKey)
    : [
        subSummary.fromIso && t('subscription.activeFrom', { date: formatSubDate(subSummary.fromIso) }),
        subSummary.untilIso && subSummary.untilKind
          && t(({ renews: 'subscription.renews', expires: 'subscription.expires', grace: 'subscription.grace', trialEnds: 'subscription.trialEnds' } as const)[subSummary.untilKind], { date: formatSubDate(subSummary.untilIso) }),
      ].filter(Boolean).join(' · ');

  const [restTimer, setRestTimer] = useState(() => {
    try { return localStorage.getItem(REST_TIMER_KEY) || '90'; } catch { return '90'; }
  });
  const [sound, setSound] = useState(() => {
    try { return localStorage.getItem(SOUND_KEY) !== 'false'; } catch { return true; }
  });
  // Z157: przełącznik timera przerwy — persystencja per urządzenie (localStorage,
  // świadomie bez mirrora do Firestore, jak keep-awake). State wymusza re-render,
  // dzięki czemu wiersze warunkowane FEATURE_FLAGS.workoutTimers chowają się od razu.
  const [timersOn, setTimersOn] = useState<boolean>(() => FEATURE_FLAGS.workoutTimers);
  const handleTimersToggle = (value: boolean) => {
    setWorkoutTimersEnabled(value);
    setTimersOn(value);
  };
  // Krok 4 (spec 2026-08-11): stan zgody push widoczny w wierszu Powiadomienia
  // bez wchodzenia głębiej. Źródło prawdy: uprawnienie na urządzeniu, jak
  // w NotificationSettings. null = jeszcze nie odczytano (bez tekstu).
  const [pushEnabled, setPushEnabled] = useState<boolean | null>(null);
  useEffect(() => {
    let cancelled = false;
    void getPushPermission().then((permission) => {
      if (!cancelled) setPushEnabled(permission === 'granted');
    });
    return () => { cancelled = true; };
  }, []);
  const [editOpen, setEditOpen] = useState(false);
  const [nameInput, setNameInput] = useState(profile?.displayName || '');
  const [savingName, setSavingName] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [deleteAccountOpen, setDeleteAccountOpen] = useState(false);
  const [deleteConfirmInput, setDeleteConfirmInput] = useState('');
  const [deletingAccount, setDeletingAccount] = useState(false);
  const deleteConfirmWord = lang === 'pl' ? 'USUŃ' : 'DELETE';
  // Z237: wylogowanie z potwierdzeniem i widocznym stanem — bez tego przycisk
  // wyglądał na martwy przez czas cleanupu urządzeń.
  const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [aboutOpen, setAboutOpen] = useState(false);
  // Krok 5 (spec 2026-08-11): reset hasła za potwierdzeniem — jedno tapnięcie
  // w wiersz nie wysyła już maila od razu.
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false);

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await logout();
    } finally {
      setLoggingOut(false);
      setLogoutConfirmOpen(false);
    }
  };

  const handleDeleteAccount = async () => {
    setDeletingAccount(true);
    try {
      await deleteOwnAccount();
      // Konto Auth już nie istnieje — lokalny logout domyka sesję, gate przejmuje resztę.
      await logoutAfterAccountDeletion();
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
  const persistPreference = (patch: Record<string, number | boolean | string>) => {
    updateDoc(doc(db, 'users', uid), patch).catch(() => { /* offline — localStorage wystarczy do następnej sesji */ });
  };
  // F-T2: kolor przewodni — lokalnie od splashu, mirror w profilu (cross-device).
  const [accentId, setAccentId] = useState(readStoredAccentId());
  const [hexInput, setHexInput] = useState('');
  const profileAccent = profile?.preferences?.accentColor;
  useEffect(() => {
    if (profileAccent && profileAccent !== readStoredAccentId()) {
      applyAccent(profileAccent);
      storeAccentId(profileAccent);
      setAccentId(profileAccent);
    }
  }, [profileAccent]);
  const handleAccent = (id: string) => {
    applyAccent(id);
    storeAccentId(id);
    setAccentId(id);
    persistPreference({ 'preferences.accentColor': id });
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

  // Tryby C3/C4 (Runna p.1): wejście z sekcji TRENING; jeden tryb naraz.
  const { reducedMode, setReducedMode, vacation, setVacation } = useTrainingPlan(uid);
  const [rmodeOpen, setRmodeOpen] = useState(false);
  const todayISO = formatLocalDate(new Date());
  const rmodeActive = isReducedModeActive(reducedMode, todayISO);
  const rmodeEndLabel = reducedMode
    ? parseLocalDate(reducedMode.endDate).toLocaleDateString(dateLocale(lang), { day: 'numeric', month: 'long' })
    : '';
  const handleRmodeEnable = (level: ReducedModeLevel, days: number) => {
    setRmodeOpen(false);
    const mode = buildReducedMode(level, days, todayISO);
    void (async () => {
      const result = await setReducedMode(mode);
      if (result.success) {
        const endLabel = parseLocalDate(mode.endDate).toLocaleDateString(dateLocale(lang), { day: 'numeric', month: 'long' });
        toast({ title: t('rmode.toastOn', { date: endLabel }) });
      }
    })();
  };
  const handleRmodeDisable = () => {
    setRmodeOpen(false);
    void (async () => {
      const result = await setReducedMode(null);
      if (result.success) toast({ title: t('rmode.toastOff') });
    })();
  };

  // Tryb urlopu (Runna p.1, spec C4).
  const [vacOpen, setVacOpen] = useState(false);
  const fmtVacDate = (iso: string) =>
    parseLocalDate(iso).toLocaleDateString(dateLocale(lang), { day: 'numeric', month: 'long' });
  const handleVacEnable = (startISO: string, days: number, activity: VacationActivity) => {
    setVacOpen(false);
    const mode = buildVacationMode(startISO, days, activity);
    void (async () => {
      const result = await setVacation(mode);
      if (result.success) {
        toast({ title: t('vac.toastOn', { from: fmtVacDate(mode.startDate), to: fmtVacDate(mode.endDate), weeks: mode.extendedWeeks }) });
      }
    })();
  };
  const handleVacCancel = () => {
    setVacOpen(false);
    void (async () => {
      const result = await setVacation(null);
      if (result.success) toast({ title: t('vac.toastOff') });
    })();
  };

  // Backfill rekordów sprzed instalacji (Runna p.1, spec A5). Inputy w jednostce
  // usera, zapis w kg kanonicznych; pusty formularz = wyczyszczenie backfillu.
  const emptyBackfillInputs: Record<PRBackfillLift, string> = { squat: '', bench: '', deadlift: '' };
  const backfillLabelKeys = {
    squat: 'profile.backfill.squat',
    bench: 'profile.backfill.bench',
    deadlift: 'profile.backfill.deadlift',
  } as const;
  const [backfillOpen, setBackfillOpen] = useState(false);
  const [backfillInputs, setBackfillInputs] = useState(emptyBackfillInputs);
  const [savingBackfill, setSavingBackfill] = useState(false);

  const openBackfill = () => {
    const stored = profile?.prBackfill;
    setBackfillInputs({
      squat: stored?.squat ? String(Math.round(toDisplay(stored.squat) * 2) / 2) : '',
      bench: stored?.bench ? String(Math.round(toDisplay(stored.bench) * 2) / 2) : '',
      deadlift: stored?.deadlift ? String(Math.round(toDisplay(stored.deadlift) * 2) / 2) : '',
    });
    setBackfillOpen(true);
  };

  const backfillKg = (lift: PRBackfillLift): number | null => {
    const value = parseFloat(backfillInputs[lift].replace(',', '.'));
    return Number.isFinite(value) && value > 0 ? fromInput(value) : null;
  };

  const handleSaveBackfill = async () => {
    const parsed: Record<string, number> = {};
    for (const lift of PR_BACKFILL_LIFTS) {
      const kg = backfillKg(lift);
      if (kg !== null) parsed[lift] = kg;
    }
    setSavingBackfill(true);
    try {
      // Pusta mapa = user świadomie czyści backfill (stan ma wyjście, reguła #6).
      await updateDoc(doc(db, 'users', uid), { prBackfill: sanitizePRBackfill(parsed) ?? {} });
      toast({ title: t('profile.toast.saved'), description: t('profile.backfill.saved') });
      setBackfillOpen(false);
    } catch {
      toast({ title: t('profile.toast.error'), description: t('profile.toast.saveFailed'), variant: 'destructive' });
    } finally {
      setSavingBackfill(false);
    }
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
    setResetConfirmOpen(false);
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
        {/* F-T1: imię edytowalne wprost pod zdjęciem — tap otwiera istniejący dialog. */}
        <button
          type="button"
          data-testid="profile-name-edit"
          onClick={() => { setNameInput(profile?.displayName || ''); setEditOpen(true); }}
          className="group inline-flex items-center gap-2"
          aria-label={t('profile.account.edit')}
        >
          <h1 className="font-heading text-3xl font-bold uppercase italic tracking-tight">{profile?.displayName || t('profile.title')}</h1>
          <Pencil className="h-4 w-4 text-muted-foreground transition-colors group-active:text-primary" />
        </button>
        {profile?.email && <p className="text-sm text-muted-foreground">{profile.email}</p>}
        <ProfileHeaderChips showPro={hasProPlan(subSummary.planKey)} tierLabel={tier.label} />
        {/* PRO-D T3: postęp do następnego poziomu; elite (next=null) bez paska. */}
        {tier.next && (
          <div className="mx-auto mt-1 w-full max-w-[240px]" data-testid="tier-progress">
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-highest">
              <div
                className="h-full rounded-full bg-primary transition-[width]"
                style={{ width: `${Math.round(tier.progress * 100)}%` }}
              />
            </div>
            <p className="mt-1.5 text-center text-[11px] text-muted-foreground">
              {t('profile.tier.next', { next: tier.next })}
            </p>
          </div>
        )}
      </div>

      {/* PRO-D T6: sekcja dumy — przy zeru zdobytych odznak nie renderuje się wcale. */}
      {recentBadges.length > 0 && (
        <SectionCard label={t('profile.pride.label')}>
          <div className="flex items-center justify-between">
            <div className="flex gap-3">
              {recentBadges.map((b) => (
                <AchievementBadge
                  key={`${b.category}-${b.threshold}`}
                  size="sm"
                  label={prideLabel(b)}
                  earned
                  tier={b.tier}
                  icon={b.icon}
                />
              ))}
            </div>
            <button
              type="button"
              onClick={() => navigate('/achievements')}
              className="flex items-center gap-1 text-xs font-bold uppercase tracking-wide text-primary"
            >
              {t('profile.pride.all')} <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </SectionCard>
      )}

      {/* TRENING (spec 2026-08-11): wszystko, co user rusza często, w jednej sekcji wysoko */}
      <SectionCard label={t('profile.section.preferences')} labelAccent="secondary">
        <SettingRow
          icon={Timer}
          label={t('profile.restTimerToggle')}
          description={t('profile.restTimerToggleDesc')}
          right={<Switch checked={timersOn} onCheckedChange={handleTimersToggle} aria-label={t('profile.restTimerToggle')} />}
        />
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
        {/* Z177 (reguła 6): wiersz Dźwięk ZAWSZE widoczny — schowany za przełącznikiem
            „Timer przerwy" (Z157) robił pułapkę: wyłączony timer + wyłączony dźwięk
            = brak drogi powrotu do ustawienia dźwięku. Dźwięk dotyczy też
            zakończenia ćwiczenia, nie tylko timera przerwy. */}
        <SettingRow icon={Volume2} label={t('profile.app.sound')} right={<Switch checked={sound} onCheckedChange={handleSound} aria-label={t('profile.app.sound')} />} />
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
        {/* Tryb "nie na 100%" (Runna p.1, spec C3) */}
        <SettingRow
          icon={BatteryLow}
          label={t('rmode.title')}
          value={rmodeActive ? t('rmode.activeUntil', { date: rmodeEndLabel }) : undefined}
          onClick={() => setRmodeOpen(true)}
        />
        {/* Tryb urlopu (Runna p.1, spec C4) */}
        <SettingRow
          icon={Plane}
          label={t('vac.title')}
          value={vacation
            ? (isVacationActive(vacation, todayISO)
              ? t('vac.badge', { date: fmtVacDate(vacation.endDate) })
              : t('vac.range', { from: fmtVacDate(vacation.startDate), to: fmtVacDate(vacation.endDate) }))
            : undefined}
          onClick={() => setVacOpen(true)}
        />
      </SectionCard>

      {/* TWOJE DANE (Z90): dojścia do sekcji sprzed wycinki mobilnego drawera */}
      <SectionCard label={t('profile.section.data')}>
        <SettingRow icon={ScrollText} label={t('nav.history')} onClick={() => navigate('/history')} />
        <SettingRow icon={Ruler} label={t('nav.measurements')} onClick={() => navigate('/measurements')} />
        <SettingRow icon={Trophy} label={t('nav.progress')} onClick={() => navigate('/achievements')} />
        <SettingRow
          icon={Medal}
          label={t('profile.backfill.title')}
          value={profile?.prBackfill ? t('profile.backfill.set') : undefined}
          onClick={openBackfill}
        />
      </SectionCard>

      {/* SUBSKRYPCJA — tylko odczyt stanu; zarządzanie i zakup wyłącznie na platformie paywalla (natywny iOS) */}
      <SectionCard label={t('subscription.section')}>
        <SettingRow icon={Gem} label={t(subSummary.planKey)} description={subDescription || undefined} />
        {isPaywallPlatform() && subSummary.hasStoreSubscription && (
          <SettingRow
            icon={CreditCard}
            label={t('subscription.manage')}
            onClick={() => window.open('https://apps.apple.com/account/subscriptions', '_blank')}
          />
        )}
        {isPaywallPlatform() && !subscriptionInfo.isPro && (
          <SettingRow icon={CreditCard} label={t('subscription.upgrade')} onClick={() => navigate('/paywall')} />
        )}
      </SectionCard>

      {/* KONTO */}
      <SectionCard label={t('profile.section.account')}>
        <SettingRow icon={User} label={t('profile.account.edit')} onClick={() => { setNameInput(profile?.displayName || ''); setEditOpen(true); }} />
        <SettingRow icon={Lock} label={t('profile.account.password')} onClick={() => { if (profile?.email) setResetConfirmOpen(true); }} />
        <SettingRow icon={ShieldCheck} label={t('profile.account.privacy')} onClick={() => navigate('/settings?section=data')} />
      </SectionCard>

      {/* WYGLĄD (F-T2): kolor przewodni całej aplikacji (paleta + dowolny hex). */}
      <SectionCard label={t('profile.section.appearance')}>
        <div className="px-1 py-2">
          <p className="mb-3 text-sm text-muted-foreground">{t('profile.appearance.accent')}</p>
          <div className="flex flex-wrap gap-2" role="radiogroup" aria-label={t('profile.appearance.accent')} data-testid="accent-swatches">
            {ACCENTS.map((a) => (
              <button
                key={a.id}
                type="button"
                role="radio"
                aria-checked={accentId === a.id}
                aria-label={t(`accent.${a.id}` as Parameters<typeof t>[0])}
                data-testid={`accent-${a.id}`}
                onClick={() => handleAccent(a.id)}
                className={`h-9 w-9 rounded-full transition-transform active:scale-95 ${accentId === a.id ? 'ring-2 ring-white ring-offset-2 ring-offset-background' : ''}`}
                style={{ backgroundColor: a.hex }}
              />
            ))}
            {/* Dowolny kolor: systemowy picker (na iOS ma też wpis po #). */}
            <label
              aria-label={t('accent.custom')}
              data-testid="accent-custom"
              className={`relative h-9 w-9 cursor-pointer rounded-full transition-transform active:scale-95 ${isCustomAccentHex(accentId) ? 'ring-2 ring-white ring-offset-2 ring-offset-background' : ''}`}
              style={{
                background: isCustomAccentHex(accentId)
                  ? accentId
                  : 'conic-gradient(#f87171, #facc15, #4ade80, #22d3ee, #a78bfa, #f472b6, #f87171)',
              }}
            >
              <input
                type="color"
                className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                value={isCustomAccentHex(accentId) ? accentId : '#cefc22'}
                onChange={(e) => handleAccent(e.target.value.toLowerCase())}
                data-testid="accent-custom-input"
              />
            </label>
          </div>
          {/* Wpis po # dla tych, którzy znają swój kolor. */}
          <div className="mt-3 flex items-center gap-2">
            <Input
              value={hexInput}
              onChange={(e) => setHexInput(e.target.value.trim())}
              placeholder="#1e90ff"
              inputMode="text"
              autoCapitalize="none"
              className="h-9 max-w-[140px] font-mono text-sm"
              aria-label={t('profile.appearance.hexLabel')}
              data-testid="accent-hex-input"
            />
            <Button
              variant="outline"
              size="sm"
              disabled={!isCustomAccentHex(hexInput)}
              onClick={() => handleAccent(hexInput.toLowerCase())}
              data-testid="accent-hex-apply"
            >
              {t('profile.appearance.hexApply')}
            </Button>
          </div>
        </div>
      </SectionCard>

      {/* APLIKACJA */}
      <SectionCard label={t('profile.section.app')}>
        <SettingRow
          icon={Bell}
          label={t('profile.app.notifications')}
          value={pushEnabled == null ? undefined : t(pushEnabled ? 'profile.app.notificationsOn' : 'profile.app.notificationsOff')}
          onClick={() => navigate('/settings?section=notifications')}
        />
        <SettingRow
          icon={Globe}
          label={t('profile.app.language')}
          right={(
            <Select value={lang} onValueChange={handleLanguage}>
              <SelectTrigger className="h-9 w-28 border-0 bg-surface-highest" aria-label={t('profile.app.language')}><SelectValue /></SelectTrigger>
              <SelectContent>
                {LANGUAGES.map((language) => (
                  <SelectItem key={language.code} value={language.code}>{language.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
      </SectionCard>

      {/* POMOC */}
      <SectionCard label={t('profile.section.support')}>
        {/* Z241: help prowadził do samej apki (app.strengthsave.app) — teraz landing z FAQ. */}
        <SettingRow icon={HelpCircle} label={t('profile.support.help')} onClick={() => window.open('https://strengthsave.app/', '_blank')} />
        <SettingRow icon={Mail} label={t('profile.support.contact')} onClick={() => { window.location.href = 'mailto:kontakt@gjasionowicz.pl'; }} />
        <SettingRow icon={Info} label={t('profile.support.about')} onClick={() => setAboutOpen(true)} />
      </SectionCard>

      {/* SYSTEM (spec 2026-08-11): Zaawansowane i Admin przestają udawać "Wsparcie" */}
      <SectionCard label={t('profile.section.system')}>
        <SettingRow icon={SlidersHorizontal} label={t('profile.support.advanced')} onClick={() => navigate('/settings')} />
        {isAdmin && <SettingRow icon={Shield} label={t('nav.admin')} onClick={() => navigate('/admin')} />}
      </SectionCard>

      <Button
        variant="outline"
        onClick={() => setLogoutConfirmOpen(true)}
        className="h-12 w-full rounded-xl border-destructive/30 bg-destructive/5 font-bold uppercase tracking-[0.12em] text-destructive hover:bg-destructive/10"
      >
        <LogOut className="mr-2 h-4 w-4" /> {t('profile.logout')}
      </Button>

      {/* Reset password confirm dialog (krok 5, spec 2026-08-11) */}
      <Dialog open={resetConfirmOpen} onOpenChange={setResetConfirmOpen}>
        <DialogContent className="rounded-xl border-0 bg-surface-low">
          <DialogHeader>
            <DialogTitle className="font-heading uppercase">{t('profile.account.password')}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">{t('profile.resetConfirm.desc', { email: profile?.email ?? '' })}</p>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setResetConfirmOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button onClick={handleChangePassword} className="kinetic-primary-button">
              {t('profile.resetConfirm.send')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Logout confirm dialog (Z237) */}
      <Dialog open={logoutConfirmOpen} onOpenChange={(open) => { if (!loggingOut) setLogoutConfirmOpen(open); }}>
        <DialogContent className="rounded-xl border-0 bg-surface-low">
          <DialogHeader>
            <DialogTitle className="font-heading uppercase">{t('profile.logoutConfirm.title')}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">{t('profile.logoutConfirm.desc')}</p>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setLogoutConfirmOpen(false)} disabled={loggingOut}>
              {t('common.cancel')}
            </Button>
            <Button variant="destructive" onClick={handleLogout} disabled={loggingOut} data-testid="logout-confirm">
              {loggingOut ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <LogOut className="mr-2 h-4 w-4" />}
              {t('profile.logout')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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

      {/* About dialog (Z241): wersja + linki prawne zamiast znikającego toastu */}
      <Dialog open={aboutOpen} onOpenChange={setAboutOpen}>
        <DialogContent className="rounded-xl border-0 bg-surface-low">
          <DialogHeader>
            <DialogTitle className="font-heading uppercase">{t('profile.about.title')}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">{t('profile.about.desc')}</p>
          <p className="text-xs text-muted-foreground">{t('profile.about.version', { version: __APP_VERSION__ })}</p>
          <div className="flex gap-4 text-sm">
            <a
              href={TERMS_URL}
              target="_blank" rel="noopener noreferrer"
              className="underline underline-offset-2 text-fitness-cyan"
            >
              {t('paywall.terms')}
            </a>
            <a
              href={PRIVACY_URL}
              target="_blank" rel="noopener noreferrer"
              className="underline underline-offset-2 text-fitness-cyan"
            >
              {t('paywall.privacy')}
            </a>
          </div>
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

      {/* Tryb "nie na 100%" (Runna p.1, spec C3) */}
      <ReducedModeDialog
        open={rmodeOpen}
        onOpenChange={setRmodeOpen}
        mode={reducedMode}
        todayISO={todayISO}
        onEnable={handleRmodeEnable}
        onDisable={handleRmodeDisable}
        blockedLabel={vacation ? t('rmode.blockedByVacation') : undefined}
      />

      {/* Tryb urlopu (Runna p.1, spec C4) */}
      <VacationDialog
        open={vacOpen}
        onOpenChange={setVacOpen}
        vacation={vacation}
        reducedModeActive={rmodeActive}
        todayISO={todayISO}
        onEnable={handleVacEnable}
        onCancel={handleVacCancel}
      />

      {/* Backfill rekordów sprzed instalacji (Runna p.1, spec A5) */}
      <Dialog open={backfillOpen} onOpenChange={setBackfillOpen}>
        <DialogContent className="rounded-xl border-0 bg-surface-low" data-testid="backfill-dialog">
          <DialogHeader>
            <DialogTitle className="font-heading uppercase">{t('profile.backfill.title')}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">{t('profile.backfill.desc')}</p>
          <div className="space-y-3">
            {PR_BACKFILL_LIFTS.map((lift) => {
              const kg = backfillKg(lift);
              return (
                <div key={lift} className="space-y-1">
                  <label htmlFor={`backfill-${lift}`} className="text-label-md font-bold uppercase tracking-[0.12em] text-muted-foreground">
                    {t(backfillLabelKeys[lift])} ({unit})
                  </label>
                  <Input
                    id={`backfill-${lift}`}
                    inputMode="decimal"
                    value={backfillInputs[lift]}
                    onChange={(e) => setBackfillInputs((prev) => ({ ...prev, [lift]: e.target.value }))}
                    placeholder="0"
                  />
                  {kg !== null && kg > PR_BACKFILL_SOFT_WARN_KG && (
                    <p className="text-xs text-fitness-warning">{t('profile.backfill.softWarn')}</p>
                  )}
                </div>
              );
            })}
          </div>
          <DialogFooter>
            <Button onClick={handleSaveBackfill} disabled={savingBackfill} className="kinetic-primary-button">
              {savingBackfill ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null} {t('common.save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Profile;
