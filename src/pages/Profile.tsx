import { useState, useRef, useEffect, type ReactNode } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { deleteField, doc, updateDoc } from 'firebase/firestore';
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
import { ProfileAccordionSection } from '@/components/profile/ProfileAccordionSection';
import { cn } from '@/lib/utils';
import { FEATURE_FLAGS } from '@/lib/feature-flags';
import { TERMS_URL, PRIVACY_URL } from '@/lib/legal-links';
import { setWorkoutTimersEnabled } from '@/lib/workout-timers-setting';
import { useWorkoutAggregate } from '@/hooks/useWorkoutAggregate';
import {
  Lock, Globe, HelpCircle, Mail, Info, LogOut, Plus, Loader2,
  ScrollText, Ruler, Trophy, Shield, Gem, CreditCard, Medal,
  Dumbbell, ChevronRight, Watch, Eye, EyeOff, Timer, Weight,
  UserRound, Bell, Database, DatabaseBackup, ShieldCheck, UserCog,
} from 'lucide-react';
import { maskEmail, readEmailVisible, storeEmailVisible } from '@/lib/mask-email';
import { AchievementBadge } from '@/components/kinetic/AchievementBadge';
import { computeMilestones, tierForIndex } from '@/lib/achievements-utils';
import { calculateTonnage, calculateStreakDetails, countWorkoutCompletedWorkingSets, streakDetailsFromDates } from '@/lib/summary-utils';
import { formatTonnage } from '@/lib/units';
import { PR_BACKFILL_LIFTS, PR_BACKFILL_SOFT_WARN_KG, sanitizePRBackfill, type PRBackfillLift } from '@/lib/pr-backfill';
import { ReducedModeDialog } from '@/components/ReducedModeDialog';
import { buildReducedMode, isReducedModeActive, type ReducedModeLevel } from '@/lib/reduced-mode';
import { VacationDialog } from '@/components/VacationDialog';
import { buildVacationMode, isVacationActive, type VacationActivity } from '@/lib/vacation-mode';
import { useTrainingPlan } from '@/hooks/useTrainingPlan';
import { formatLocalDate, formatLocalDateLabel } from '@/lib/utils';
import { NotificationSettings } from '@/components/NotificationSettings';
import { HealthSettings } from '@/components/HealthSettings';
import { GarminSettings } from '@/components/GarminSettings';
import { RestSettingsCard } from '@/components/RestSettingsCard';
import { PlateInventorySettings } from '@/components/PlateCalculatorSheet';
import { StravaConnectionCard } from '@/components/StravaConnectionCard';
import { BackupSettings } from '@/components/BackupSettings';
import { ConsentSettings } from '@/components/ConsentSettings';
import { SyncCenterCard } from '@/components/SyncCenterCard';
import { useSyncCenterEntries } from '@/hooks/useSyncCenterEntries';
import { loadRestSettings } from '@/lib/rest-timer';
import { isKeepAwakeEnabled, setKeepAwakeEnabled } from '@/lib/keep-awake';

import { SOUND_KEY } from '@/lib/workout-preferences';

// X36 (głosówka właściciela po buildzie 124): Profil = tożsamość + kafle dumy
// (zawsze otwarte) i lista ZWIJANYCH sekcji (ProfileAccordionSection), każda
// z kotwicą id="profile-<sekcja>" dla deep linków ?section=. Stare kotwice
// (Połączenia, Przerwy) mapowane na nowe sekcje.
const SECTION_ALIASES: Record<string, string> = {
  connections: 'devices',
  strava: 'devices',
  rest: 'timer',
  preferences: 'training',
};
const resolveSection = (section: string): string => SECTION_ALIASES[section] ?? section;

const TRAINER_EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const Profile = () => {
  const navigate = useNavigate();
  const { uid, profile, isAdmin, canUseStrava } = useCurrentUser();
  const { unit, setUnit, toDisplay, fromInput } = useUnit();
  const { logout, logoutAfterAccountDeletion, resetPassword } = useAuth();
  const { workouts } = useFirebaseWorkouts(uid, { measurements: 'none', workouts: 'recent' });
  const { toast } = useToast();
  const { t, lang, setLang } = useTranslation();
  const [searchParams] = useSearchParams();
  const syncEntries = useSyncCenterEntries(uid);

  // X36: stan zwinięcia sekcji (domyślnie wszystkie zwinięte — jedna linia
  // na sekcję, jak chciał właściciel).
  const [openSections, setOpenSections] = useState<Set<string>>(() => new Set());
  const isSectionOpen = (id: string) => openSections.has(id);
  const setSectionOpen = (id: string, open: boolean) => setOpenSections((prev) => {
    const next = new Set(prev);
    if (open) next.add(id); else next.delete(id);
    return next;
  });

  // X35b: deep linki ?section=<kotwica> (dawne /settings?section=, powiadomienia,
  // karty Pomiarów). X36: sekcja docelowa najpierw się ROZWIJA, potem przewijamy;
  // sekcje wyżej dociągają dane asynchronicznie i przesuwają layout, więc
  // przewinięcie powtarzamy.
  useEffect(() => {
    const raw = searchParams.get('section');
    if (!raw) return;
    const section = resolveSection(raw);
    setOpenSections((prev) => (prev.has(section) ? prev : new Set(prev).add(section)));
    const scroll = () => {
      document.getElementById(`profile-${section}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };
    scroll();
    const timers = [300, 900].map((ms) => window.setTimeout(scroll, ms));
    return () => timers.forEach((id) => window.clearTimeout(id));
  }, [searchParams]);

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

  // Fala 2: kafle TWOJA DUMA — same realne dane. Streak z pełnej historii
  // agregatu (okno recent przycinałoby długie serie), serie z totals;
  // fallback okna = dotychczasowa semantyka completedCount.
  const streak = (aggregate
    ? streakDetailsFromDates(aggregate.completedDates)
    : calculateStreakDetails(workouts)).streak;
  const totalSets = aggregate?.totals.totalSets
    ?? workouts.filter((w) => w.completed).reduce((sum, w) => sum + countWorkoutCompletedWorkingSets(w), 0);
  const prideTiles = [
    { key: 'workouts', value: String(completedCount), label: t('profile.pride.tile.workouts'), accent: false },
    { key: 'streak', value: t('profile.pride.tile.streakValue', { n: streak }), label: t('profile.pride.tile.streak'), accent: true },
    { key: 'tonnage', value: formatTonnage(totalTonnage, unit), label: t('profile.pride.tile.tonnage'), accent: false },
    { key: 'sets', value: String(totalSets), label: t('profile.pride.tile.sets'), accent: false },
  ];
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
  // 2026-08-20: daty i detailKey mogą współistnieć (grant comp: "aktywna od X · Bezterminowo").
  const subDescription = [
    subSummary.fromIso && t('subscription.activeFrom', { date: formatSubDate(subSummary.fromIso) }),
    subSummary.untilIso && subSummary.untilKind
      && t(({ renews: 'subscription.renews', expires: 'subscription.expires', grace: 'subscription.grace', trialEnds: 'subscription.trialEnds' } as const)[subSummary.untilKind], { date: formatSubDate(subSummary.untilIso) }),
    subSummary.detailKey && t(subSummary.detailKey),
  ].filter(Boolean).join(' · ');

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
  // X35b → X36: wiersz sekcji "Timer i przerwy" pokazuje bieżącą przerwę między
  // seriami. Wartość odczytywana na nowo przy każdym zwinięciu/rozwinięciu
  // (RestSettingsCard zapisuje sama, bez callbacku — WP-C scala magazyny).
  const [restWorkingSeconds, setRestWorkingSeconds] = useState(() => loadRestSettings().workingSeconds);
  const handleTimerSectionOpenChange = (open: boolean) => {
    setSectionOpen('timer', open);
    setRestWorkingSeconds(loadRestSettings().workingSeconds);
  };
  // X36: blokada wygaszania ekranu przeszła z karty przerw do sekcji Trening
  // (per urządzenie, localStorage — jak keep-awake od zawsze).
  const [keepAwake, setKeepAwake] = useState<boolean>(() => isKeepAwakeEnabled());
  const handleKeepAwake = (value: boolean) => {
    setKeepAwakeEnabled(value);
    setKeepAwake(value);
  };
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
  // WP-G (X29): email domyślnie zamaskowany; wybór usera trwały (localStorage),
  // czytany też przez sidebar desktop (AppNavigation).
  const [emailVisible, setEmailVisible] = useState(readEmailVisible);
  const toggleEmailVisible = () => {
    setEmailVisible((prev) => {
      storeEmailVisible(!prev);
      return !prev;
    });
  };

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

  // Dźwięk leci też do users/{uid}.preferences — spójne między web i iOS.
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
  const handleSound = (v: boolean) => {
    setSound(v);
    persist(SOUND_KEY, String(v));
    persistPreference({ 'preferences.timerSound': v });
  };
  const handleLanguage = (v: string) => {
    setLang(v as LanguageCode);
    toast({ title: t('profile.langSaved') });
  };

  // WP-I (X29): sekcja Trener — zapisany odbiorca maili z podsumowaniem.
  // Imię edytowane inline; usunięcie czyści oba pola (odwracalne: następna
  // wysyłka znów zaproponuje zapis, więc bez dialogu potwierdzenia).
  // X35b: sekcja ZAWSZE widoczna; bez adresu pusty stan z formularzem
  // "Dodaj trenera" (ten sam zapis co EmailWorkoutDialog.handleSaveTrainer).
  const trainerEmail = profile?.preferences?.trainerEmail;
  const trainerName = profile?.preferences?.trainerName;
  const [trainerNameEditing, setTrainerNameEditing] = useState(false);
  const [trainerNameInput, setTrainerNameInput] = useState('');
  const [trainerAdding, setTrainerAdding] = useState(false);
  const [trainerEmailInput, setTrainerEmailInput] = useState('');
  const [trainerEmailError, setTrainerEmailError] = useState(false);
  const saveTrainerName = () => {
    const name = trainerNameInput.trim();
    updateDoc(doc(db, 'users', uid), { 'preferences.trainerName': name || deleteField() })
      .catch(() => { /* offline — snapshot profilu dogoni po powrocie sieci */ });
    setTrainerNameEditing(false);
  };
  const removeTrainer = () => {
    setTrainerNameEditing(false);
    updateDoc(doc(db, 'users', uid), {
      'preferences.trainerEmail': deleteField(),
      'preferences.trainerName': deleteField(),
    }).catch(() => { /* jw. */ });
  };
  const openTrainerForm = () => {
    setTrainerNameInput('');
    setTrainerEmailInput('');
    setTrainerEmailError(false);
    setTrainerAdding(true);
  };
  const saveNewTrainer = () => {
    // Bug 49 (X30): adres znormalizowany, jak przy zapisie z dialogu maila.
    const email = trainerEmailInput.trim().toLowerCase();
    if (!TRAINER_EMAIL_RE.test(email)) {
      setTrainerEmailError(true);
      return;
    }
    const name = trainerNameInput.trim();
    updateDoc(doc(db, 'users', uid), {
      'preferences.trainerEmail': email,
      'preferences.trainerName': name || deleteField(),
    }).catch(() => { /* offline — snapshot profilu dogoni po powrocie sieci */ });
    setTrainerAdding(false);
  };

  // Tryby C3/C4 (Runna p.1): wejście z sekcji TRENING; jeden tryb naraz.
  const { reducedMode, setReducedMode, vacation, setVacation } = useTrainingPlan(uid);
  const [rmodeOpen, setRmodeOpen] = useState(false);
  const todayISO = formatLocalDate(new Date());
  const rmodeActive = isReducedModeActive(reducedMode, todayISO);
  const rmodeEndLabel = reducedMode
    ? formatLocalDateLabel(reducedMode.endDate, dateLocale(lang), { day: 'numeric', month: 'long' })
    : '';
  const handleRmodeEnable = (level: ReducedModeLevel, days: number) => {
    setRmodeOpen(false);
    const mode = buildReducedMode(level, days, todayISO);
    void (async () => {
      const result = await setReducedMode(mode);
      if (result.success) {
        const endLabel = formatLocalDateLabel(mode.endDate, dateLocale(lang), { day: 'numeric', month: 'long' });
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
    formatLocalDateLabel(iso, dateLocale(lang), { day: 'numeric', month: 'long' });
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
    <div className="mx-auto max-w-xl space-y-4">
      {/* 1. TOŻSAMOŚĆ (fala 2, artboard 1a): poziomy rząd zamiast wycentrowanego
          hero. X35b: jedyne wejście do edycji imienia/avatara (wiersz "Imię i
          avatar" z sekcji Konto usunięty jako duplikat). */}
      <section id="profile-identity" className="scroll-mt-20 space-y-4">
        <div className="flex items-center gap-3.5 pt-1">
          <div className="relative shrink-0">
            <Avatar className="h-16 w-16">
              <AvatarImage src={profile?.photoURL || undefined} alt={profile?.displayName || ''} />
              <AvatarFallback className="bg-primary/20 font-heading text-xl font-bold text-primary">{initials}</AvatarFallback>
            </Avatar>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingAvatar}
              className="absolute -bottom-0.5 -right-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground disabled:opacity-60"
              aria-label={t('profile.aria.changeAvatar')}
            >
              {uploadingAvatar ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
            </button>
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarFile} />
          </div>
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            {/* F-T1: imię edytowalne — tap otwiera istniejący dialog. */}
            <button
              type="button"
              data-testid="profile-name-edit"
              onClick={() => { setNameInput(profile?.displayName || ''); setEditOpen(true); }}
              className="w-fit max-w-full truncate text-left font-heading text-[22px] font-bold leading-tight tracking-tight"
              aria-label={t('profile.account.edit')}
            >
              {profile?.displayName || t('profile.title')}
            </button>
            {profile?.email && (
              <div className="flex min-w-0 items-center gap-0.5">
                <p className="min-w-0 truncate text-xs text-muted-foreground">
                  {emailVisible ? profile.email : maskEmail(profile.email)}
                </p>
                {/* Tap target 44px (h-11 w-11), ujemne marginesy trzymają zwartość wiersza. */}
                <button
                  type="button"
                  onClick={toggleEmailVisible}
                  className="-my-3 flex h-11 w-11 shrink-0 items-center justify-center text-muted-foreground transition-colors hover:text-foreground"
                  aria-label={t('profile.emailToggle')}
                >
                  {emailVisible ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                </button>
              </div>
            )}
            <div className="mt-0.5 flex flex-wrap items-center gap-2">
              <ProfileHeaderChips showPro={hasProPlan(subSummary.planKey)} tierLabel={tier.label} className="justify-start" />
              <span className="font-mono text-[9.5px] uppercase tracking-[0.06em] text-muted-foreground">
                {t('profile.identity.workouts', { count: completedCount })}
                {tier.next && tier.remaining != null ? ` · ${t('profile.identity.toNext', { n: tier.remaining, next: tier.next })}` : ''}
              </span>
            </div>
          </div>
        </div>

        {/* PRO-D T3: postęp do następnego poziomu; elite (next=null) bez paska. */}
        {tier.next && (
          <div data-testid="tier-progress" className="h-1.5 w-full overflow-hidden rounded-full bg-surface-highest">
            <div
              className="h-full rounded-full bg-primary transition-[width]"
              style={{ width: `${Math.round(tier.progress * 100)}%` }}
            />
          </div>
        )}
      </section>

      {/* PRO-D T6 + fala 2: kafle statystyk all-time (zera są prawdziwe, więc
          renderują się zawsze); rząd odznak tylko przy zdobytych. */}
      <section id="profile-pride" className="scroll-mt-20 space-y-2.5">
        <div className="flex items-baseline justify-between">
          <h2 className="eyebrow-mono text-muted-foreground">{t('profile.pride.label')}</h2>
          <button
            type="button"
            onClick={() => navigate('/achievements?view=records')}
            className="flex items-center gap-0.5 text-xs font-semibold text-primary"
          >
            {t('profile.pride.all')} <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>
        <div className="flex gap-2">
          {prideTiles.map((tile) => (
            <div
              key={tile.key}
              className={cn(
                'flex min-w-0 flex-1 flex-col items-center gap-1 rounded-2xl px-1.5 py-3',
                tile.accent ? 'bg-primary/15' : 'bg-surface-container',
              )}
            >
              <span className={cn('font-heading text-lg font-bold leading-none', tile.accent && 'text-primary')}>
                {tile.value}
              </span>
              <span className="text-center font-mono text-[8px] uppercase tracking-[0.08em] text-muted-foreground">
                {tile.label}
              </span>
            </div>
          ))}
        </div>
        {recentBadges.length > 0 && (
          <div className="flex gap-3 pt-1">
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
        )}
      </section>

      {/* Sync Center — tylko przy zaległościach (Z52); zdrowy user nie widzi pustej
          karty. X36: NAD listą zwijanych sekcji — to alert o niezsynchronizowanych
          sesjach, nie ustawienie, więc nie może chować się w zwiniętej sekcji. */}
      {syncEntries.listedEntries.length > 0 && (
        <div id="profile-sync" className="scroll-mt-20">
          <SyncCenterCard uid={uid} />
        </div>
      )}

      {/* 3. KOLOR PRZEWODNI (F-T2 + fala 2): grid 12 swatchy + hex. X37 (uwaga
          właściciela po 125): ZAWSZE rozwinięty, jak przed X36 — wybór koloru
          ma być widoczny od razu, nie za ptaszkiem. */}
      <section id="profile-accent" className="scroll-mt-20 rounded-xl bg-surface-container px-4 py-4">
        <h2 className="eyebrow-mono pb-3 text-muted-foreground">{t('profile.appearance.accent')}</h2>
        <div className="grid grid-cols-6 gap-2" role="radiogroup" aria-label={t('profile.appearance.accent')} data-testid="accent-swatches">
          {ACCENTS.map((a) => (
            <button
              key={a.id}
              type="button"
              role="radio"
              aria-checked={accentId === a.id}
              aria-label={t(`accent.${a.id}` as Parameters<typeof t>[0])}
              data-testid={`accent-${a.id}`}
              onClick={() => handleAccent(a.id)}
              className={cn(
                'aspect-square w-full rounded-lg transition-transform active:scale-95',
                accentId === a.id && 'ring-2 ring-white ring-offset-2 ring-offset-background',
              )}
              style={{ backgroundColor: a.hex }}
            />
          ))}
          {/* Dowolny kolor: systemowy picker (na iOS ma też wpis po #). */}
          <label
            aria-label={t('accent.custom')}
            data-testid="accent-custom"
            className={cn(
              'relative aspect-square w-full cursor-pointer rounded-lg transition-transform active:scale-95',
              isCustomAccentHex(accentId) && 'ring-2 ring-white ring-offset-2 ring-offset-background',
            )}
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
            className="h-10 flex-1 rounded-lg border-0 bg-surface-highest font-mono text-sm"
            aria-label={t('profile.appearance.hexLabel')}
            data-testid="accent-hex-input"
          />
          <Button
            variant="outline"
            disabled={!isCustomAccentHex(hexInput)}
            onClick={() => handleAccent(hexInput.toLowerCase())}
            data-testid="accent-hex-apply"
            className="h-10 rounded-lg border-0 bg-surface-highest px-4"
          >
            {t('profile.appearance.hexApply')}
          </Button>
        </div>
      </section>

      {/* 4. TRENING (fala 2 → X36): to, co user rusza poza timerem — jednostki,
          blokada wygaszania ekranu (z karty przerw), tryby. */}
      <ProfileAccordionSection
        id="training"
        icon={Dumbbell}
        label={t('profile.section.preferences')}
        value={unit.toUpperCase()}
        open={isSectionOpen('training')}
        onOpenChange={(open) => setSectionOpen('training', open)}
        rows
      >
        <SettingRow
          compact
          label={t('profile.pref.units')}
          right={(
            <div className="flex gap-1 rounded-lg bg-surface-highest p-1">
              {(['kg', 'lbs'] as const).map((u) => (
                <button
                  key={u}
                  type="button"
                  onClick={() => setUnit(u)}
                  aria-pressed={unit === u}
                  aria-label={`${t('profile.pref.units')}: ${u}`}
                  className={cn(
                    'rounded-md px-3 py-1.5 font-mono text-[10px] font-bold uppercase tracking-[0.06em] transition-colors',
                    unit === u ? 'bg-primary text-primary-foreground' : 'text-muted-foreground',
                  )}
                >
                  {u}
                </button>
              ))}
            </div>
          )}
        />
        <SettingRow
          compact
          label={t('rest.keepAwake')}
          description={t('rest.keepAwakeHint')}
          right={<Switch checked={keepAwake} onCheckedChange={handleKeepAwake} aria-label={t('rest.keepAwake')} data-testid="profile-keep-awake" />}
        />
        {/* Tryb "nie na 100%" (Runna p.1, spec C3) */}
        <SettingRow
          compact
          label={t('rmode.title')}
          value={rmodeActive ? t('rmode.activeUntil', { date: rmodeEndLabel }) : undefined}
          onClick={() => setRmodeOpen(true)}
        />
        {/* Tryb urlopu (Runna p.1, spec C4): akcja żyje w Planie, tu skrót. */}
        <SettingRow
          compact
          label={t('vac.title')}
          value={vacation
            ? (isVacationActive(vacation, todayISO)
              ? t('vac.badge', { date: fmtVacDate(vacation.endDate) })
              : t('vac.range', { from: fmtVacDate(vacation.startDate), to: fmtVacDate(vacation.endDate) }))
            : undefined}
          onClick={() => setVacOpen(true)}
        />
      </ProfileAccordionSection>

      {/* 5. TIMER I PRZERWY (X36): przełączniki timera i dźwięku (dawniej w
          Treningu) + długości przerw, dźwięk, głośność (RestSettingsCard). */}
      <ProfileAccordionSection
        id="timer"
        icon={Timer}
        label={t('profile.section.timer')}
        value={timersOn ? t('profile.rest.current', { n: restWorkingSeconds }) : t('profile.timer.off')}
        open={isSectionOpen('timer')}
        onOpenChange={handleTimerSectionOpenChange}
      >
        <div className="rounded-2xl bg-surface-container px-3.5 py-1">
          <SettingRow
            compact
            label={t('profile.restTimerToggle')}
            description={t('profile.restTimerToggleDesc')}
            right={<Switch checked={timersOn} onCheckedChange={handleTimersToggle} aria-label={t('profile.restTimerToggle')} />}
          />
          {/* Z177 (reguła 6): wiersz Dźwięk ZAWSZE widoczny — schowany za przełącznikiem
              „Timer przerwy" (Z157) robił pułapkę: wyłączony timer + wyłączony dźwięk
              = brak drogi powrotu do ustawienia dźwięku. Dźwięk dotyczy też
              zakończenia ćwiczenia, nie tylko timera przerwy. */}
          <SettingRow compact label={t('profile.app.sound')} right={<Switch checked={sound} onCheckedChange={handleSound} aria-label={t('profile.app.sound')} />} />
        </div>
        <RestSettingsCard hideTitle />
      </ProfileAccordionSection>

      {/* 6. KALKULATOR TALERZY (Z107): inwentarz per urządzenie. */}
      <ProfileAccordionSection
        id="plates"
        icon={Weight}
        label={t('plates.settingsTitle')}
        open={isSectionOpen('plates')}
        onOpenChange={(open) => setSectionOpen('plates', open)}
      >
        <PlateInventorySettings />
      </ProfileAccordionSection>

      {/* 7. TRENER (WP-I + X35b + X36): wiersz pokazuje imię / zamaskowany adres /
          "Nie ustawiono"; w środku zapisany adres albo formularz "Dodaj trenera".
          Popup "Zapisać jako trenera?" po pierwszej wysyłce żyje w EmailWorkoutDialog. */}
      <ProfileAccordionSection
        id="trainer"
        icon={UserRound}
        label={t('profile.trainer.title')}
        value={trainerEmail ? (trainerName || maskEmail(trainerEmail)) : t('profile.trainer.notSet')}
        valueAccent={!!trainerEmail}
        open={isSectionOpen('trainer')}
        onOpenChange={(open) => setSectionOpen('trainer', open)}
        rows
      >
        {trainerEmail ? (
          <>
            <SettingRow
              compact
              icon={Mail}
              label={trainerName || maskEmail(trainerEmail)}
              value={trainerName ? maskEmail(trainerEmail) : undefined}
            />
            {trainerNameEditing ? (
              <div className="flex items-center gap-2 py-2">
                <Input
                  value={trainerNameInput}
                  onChange={(e) => setTrainerNameInput(e.target.value)}
                  maxLength={80}
                  aria-label={t('profile.trainer.nameLabel')}
                  placeholder={t('profile.trainer.nameLabel')}
                  className="h-10 flex-1 rounded-lg border-0 bg-surface-highest"
                />
                <Button onClick={saveTrainerName} className="h-10 rounded-lg px-4">
                  {t('common.save')}
                </Button>
              </div>
            ) : (
              <SettingRow
                compact
                label={t('profile.trainer.changeName')}
                onClick={() => { setTrainerNameInput(trainerName ?? ''); setTrainerNameEditing(true); }}
              />
            )}
            <SettingRow compact danger label={t('profile.trainer.remove')} onClick={removeTrainer} />
          </>
        ) : trainerAdding ? (
          <div className="space-y-2 py-2" data-testid="trainer-add-form">
            <Input
              value={trainerNameInput}
              onChange={(e) => setTrainerNameInput(e.target.value)}
              maxLength={80}
              aria-label={t('profile.trainer.nameLabel')}
              placeholder={t('profile.trainer.nameLabel')}
              className="h-10 rounded-lg border-0 bg-surface-highest"
            />
            <Input
              type="email"
              inputMode="email"
              autoCapitalize="none"
              autoComplete="email"
              value={trainerEmailInput}
              onChange={(e) => { setTrainerEmailInput(e.target.value); setTrainerEmailError(false); }}
              aria-label={t('profile.trainer.emailLabel')}
              aria-invalid={trainerEmailError || undefined}
              placeholder={t('profile.trainer.emailLabel')}
              className={cn('h-10 rounded-lg border-0 bg-surface-highest', trainerEmailError && 'ring-1 ring-destructive')}
            />
            {trainerEmailError && (
              <p className="text-xs text-destructive" role="alert">{t('profile.trainer.emailInvalid')}</p>
            )}
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setTrainerAdding(false)} className="h-10 flex-1 rounded-lg border-0 bg-surface-highest">
                {t('common.cancel')}
              </Button>
              <Button onClick={saveNewTrainer} className="h-10 flex-1 rounded-lg" disabled={!trainerEmailInput.trim()}>
                {t('common.save')}
              </Button>
            </div>
          </div>
        ) : (
          <>
            <p className="pt-2.5 text-xs text-muted-foreground" data-testid="trainer-empty">{t('profile.trainer.emptyHint')}</p>
            <SettingRow compact icon={Mail} label={t('profile.trainer.add')} onClick={openTrainerForm} />
          </>
        )}
      </ProfileAccordionSection>

      {/* 8. URZĄDZENIA I POŁĄCZENIA (X36: Z118 Zdrowie + Z227 Garmin/Apple Watch
          + Strava w JEDNEJ sekcji — user nie zgaduje, gdzie szukać zegarka). */}
      <ProfileAccordionSection
        id="devices"
        icon={Watch}
        label={t('profile.section.devicesConnections')}
        open={isSectionOpen('devices')}
        onOpenChange={(open) => setSectionOpen('devices', open)}
      >
        <HealthSettings />
        <GarminSettings hideTitle />
        {canUseStrava && <StravaConnectionCard />}
      </ProfileAccordionSection>

      {/* 9. POWIADOMIENIA (X35b/X35c → X36 niżej: nie są najważniejsze). */}
      <ProfileAccordionSection
        id="notifications"
        icon={Bell}
        label={t('profile.app.notifications')}
        open={isSectionOpen('notifications')}
        onOpenChange={(open) => setSectionOpen('notifications', open)}
      >
        <NotificationSettings hideTitle />
      </ProfileAccordionSection>

      {/* 10. SUBSKRYPCJA — tylko odczyt stanu; zarządzanie i zakup wyłącznie na platformie paywalla (natywny iOS) */}
      <ProfileAccordionSection
        id="subscription"
        icon={Gem}
        label={t('subscription.section')}
        value={t(subSummary.planKey)}
        valueAccent={hasProPlan(subSummary.planKey)}
        open={isSectionOpen('subscription')}
        onOpenChange={(open) => setSectionOpen('subscription', open)}
        rows
      >
        <SettingRow compact icon={Gem} label={t(subSummary.planKey)} description={subDescription || undefined} />
        {isPaywallPlatform() && subSummary.hasStoreSubscription && (
          <SettingRow
            compact
            icon={CreditCard}
            label={t('subscription.manage')}
            onClick={() => window.open('https://apps.apple.com/account/subscriptions', '_blank')}
          />
        )}
        {isPaywallPlatform() && !subscriptionInfo.isPro && (
          <SettingRow compact icon={CreditCard} label={t('subscription.upgrade')} onClick={() => navigate('/paywall')} />
        )}
      </ProfileAccordionSection>

      {/* 11. TWOJE DANE (Z90 + fala 2 + X35b): dojścia do danych + Sync Center przy zaległościach. */}
      <ProfileAccordionSection
        id="data"
        icon={Database}
        label={t('profile.section.data')}
        open={isSectionOpen('data')}
        onOpenChange={(open) => setSectionOpen('data', open)}
      >
        <div className="rounded-2xl bg-surface-container px-3.5 py-1">
          <SettingRow compact icon={ScrollText} label={t('nav.history')} onClick={() => navigate('/history')} />
          <SettingRow compact icon={Ruler} label={t('nav.measurements')} onClick={() => navigate('/measurements')} />
          <SettingRow compact icon={Trophy} label={t('nav.progress')} onClick={() => navigate('/achievements')} />
          <SettingRow
            compact
            icon={Medal}
            label={t('profile.backfill.title')}
            value={profile?.prBackfill ? t('profile.backfill.set') : undefined}
            onClick={openBackfill}
          />
          {isAdmin && <SettingRow compact icon={Shield} label={t('nav.admin')} onClick={() => navigate('/admin')} />}
        </div>
      </ProfileAccordionSection>

      {/* 12. BACKUP I PRZYWRACANIE (X35b → X36 własna sekcja). */}
      <ProfileAccordionSection
        id="backup"
        icon={DatabaseBackup}
        label={t('settings.backup.title')}
        open={isSectionOpen('backup')}
        onOpenChange={(open) => setSectionOpen('backup', open)}
      >
        <BackupSettings />
      </ProfileAccordionSection>

      {/* 13. ZGODY I PRYWATNOŚĆ (pakiet prawny v2): marketing + dane zdrowotne, art. 7 ust. 3 RODO */}
      <ProfileAccordionSection
        id="consents"
        icon={ShieldCheck}
        label={t('consent.settingsTitle')}
        open={isSectionOpen('consents')}
        onOpenChange={(open) => setSectionOpen('consents', open)}
      >
        <ConsentSettings hideTitle />
      </ProfileAccordionSection>

      {/* 14. KONTO I POMOC (X35b: język przeszedł tu z dawnej sekcji Aplikacja). */}
      <ProfileAccordionSection
        id="account"
        icon={UserCog}
        label={t('profile.section.accountSupport')}
        open={isSectionOpen('account')}
        onOpenChange={(open) => setSectionOpen('account', open)}
        rows
      >
        <SettingRow
          compact
          icon={Globe}
          label={t('profile.app.language')}
          right={(
            <Select value={lang} onValueChange={handleLanguage}>
              <SelectTrigger className="h-9 w-fit gap-1.5 rounded-lg border-0 bg-surface-highest px-2.5 font-mono text-[11px]" aria-label={t('profile.app.language')}><SelectValue /></SelectTrigger>
              <SelectContent>
                {LANGUAGES.map((language) => (
                  <SelectItem key={language.code} value={language.code}>{language.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
        <SettingRow compact icon={Lock} label={t('profile.account.password')} onClick={() => { if (profile?.email) setResetConfirmOpen(true); }} />
        {/* Z241: help prowadził do samej apki (app.strengthsave.app) — teraz landing z FAQ. */}
        <SettingRow compact icon={HelpCircle} label={t('profile.support.help')} onClick={() => window.open('https://strengthsave.app/', '_blank')} />
        <SettingRow compact icon={Mail} label={t('profile.support.contact')} onClick={() => { window.location.href = 'mailto:contact@strengthsave.app'; }} />
        <SettingRow compact icon={Info} label={t('profile.support.about')} value={__APP_VERSION__} onClick={() => setAboutOpen(true)} />
      </ProfileAccordionSection>

      {/* Stopka (fala 2): neutralny Wyloguj wg mockupu (dialog potwierdzenia Z237
          bez zmian), Usuń konto tekstowo, wersja aplikacji. */}
      <div className="space-y-3 pt-1">
        <button
          type="button"
          onClick={() => setLogoutConfirmOpen(true)}
          className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-surface-container text-sm font-medium text-foreground/80 transition-colors hover:opacity-80"
        >
          <LogOut className="h-4 w-4" /> {t('profile.logout')}
        </button>
        <button
          type="button"
          onClick={() => { setDeleteConfirmInput(''); setDeleteAccountOpen(true); }}
          className="w-full text-center text-xs text-muted-foreground underline-offset-2 hover:text-destructive hover:underline"
        >
          {t('profile.deleteAccount')}
        </button>
        <p className="pb-1 text-center font-mono text-[9.5px] uppercase tracking-[0.1em] text-muted-foreground/60">
          {t('profile.footer.version', { version: __APP_VERSION__ })}
        </p>
      </div>

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
              className="underline underline-offset-2 text-primary"
            >
              {t('paywall.terms')}
            </a>
            <a
              href={PRIVACY_URL}
              target="_blank" rel="noopener noreferrer"
              className="underline underline-offset-2 text-primary"
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
