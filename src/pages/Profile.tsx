import { useState, useRef, useEffect, type ReactNode } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { deleteField, doc, updateDoc, type DocumentData, type UpdateData } from 'firebase/firestore';
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '@/lib/firebase';
import { ACCENTS, isCustomAccentHex, readStoredAccentId } from '@/lib/accent-theme';
import { PaletteThemePicker } from '@/components/PaletteThemePicker';
import {
  applyPaletteTheme,
  normalizePaletteThemeV2,
  readStoredPaletteTheme,
  selectLegacyAccent,
  storePaletteTheme,
  type PaletteThemeV2,
} from '@/lib/palette-theme';
import {
  discardPalettePreferenceOutbox,
  enqueuePresetPalettePreference,
  flushPalettePreferenceOutbox,
  readPalettePreferenceOutbox,
} from '@/lib/palette-preference-outbox';
import { resolvePalettePreference } from '@/lib/palette-preference-resolver';
import { writePalettePreference } from '@/lib/palette-preference-cloud';
import { useCurrentUser } from '@/contexts/UserContext';
import { cacheAvatarBlob } from '@/lib/avatar-cache';
import { useUnit } from '@/contexts/UnitContext';
import { useAuth } from '@/hooks/useAuth';
import { useFirebaseWorkouts } from '@/hooks/useFirebaseWorkouts';
import { useToast } from '@/hooks/use-toast';
import { useTranslation } from '@/contexts/LanguageContext';
import { LANGUAGES, type LanguageCode } from '@/i18n';
import { deleteOwnAccount } from '@/lib/registration-api';
import { useSubscription, isPaywallPlatform } from '@/hooks/useSubscription';
import { summarizeSubscription, hasProPlan } from '@/lib/subscription-summary';
import { dateLocale } from '@/i18n';
import { SettingRow } from '@/components/kinetic/SettingRow';
import { ProfileHeaderChips } from '@/components/kinetic/ProfileHeaderChips';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { toggleButtonClasses } from '@/components/ui/chip-button';
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
  Lock, Globe, HelpCircle, Mail, Bug, Info, LogOut, Plus, Loader2,
  Ruler, Shield, Gem, CreditCard, Medal,
  Dumbbell, Watch, Eye, EyeOff, Timer,
  Bell, Database, UserCog,
  Palette, ChevronDown,
} from 'lucide-react';
import { maskEmail, readEmailVisible, storeEmailVisible } from '@/lib/mask-email';
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
import { BugReportDialog } from '@/components/BugReportDialog';
import { SyncCenterCard } from '@/components/SyncCenterCard';
import { useSyncCenterEntries } from '@/hooks/useSyncCenterEntries';
import { loadRestSettings } from '@/lib/rest-timer';
import { isKeepAwakeEnabled, setKeepAwakeEnabled } from '@/lib/keep-awake';
import { isWarmupPromptEnabled, setWarmupPromptEnabled } from '@/lib/warmup-prompt';

import { SOUND_KEY } from '@/lib/workout-preferences';
import { POST_PLAN_GUIDE_REPLAY_PATH } from '@/lib/post-plan-guide';

// Profil = tożsamość i lista ZWIJANYCH sekcji (ProfileAccordionSection), każda
// z kotwicą id="profile-<sekcja>" dla deep linków ?section=. Stare kotwice
// (Połączenia, Przerwy) mapowane na nowe sekcje.
const SECTION_PARENTS: Record<string, string> = {
  connections: 'devices',
  strava: 'devices',
  rest: 'timer',
  preferences: 'training',
  plates: 'training',
  trainer: 'devices',
  backup: 'data',
  consents: 'data',
};
const SECTION_TARGETS: Record<string, string> = {
  connections: 'devices',
  strava: 'devices',
  rest: 'timer',
  preferences: 'training',
};
const resolveSection = (section: string): string => SECTION_PARENTS[section] ?? section;
const resolveSectionTarget = (section: string): string => SECTION_TARGETS[section] ?? section;

const TRAINER_EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const Profile = () => {
  const navigate = useNavigate();
  const { uid, profile, avatarSrc, isAdmin, canUseStrava } = useCurrentUser();
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
    const target = resolveSectionTarget(raw);
    setOpenSections((prev) => (prev.has(section) ? prev : new Set(prev).add(section)));
    const scroll = () => {
      document.getElementById(`profile-${target}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };
    scroll();
    const timers = [300, 900].map((ms) => window.setTimeout(scroll, ms));
    return () => timers.forEach((id) => window.clearTimeout(id));
  }, [searchParams]);

  // Z216/Z217: licznik all-time z agregatu; okno recent tylko fallbackiem.
  const aggregate = useWorkoutAggregate(uid);
  const completedCount = aggregate?.totals.workoutCount ?? workouts.filter((w) => w.completed).length;

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
  // X37 WP-B: proponowanie rozgrzewki przed treningiem: cache localStorage
  // (arkusz czyta synchronicznie) + mirror preferences.warmupPrompt (jak dźwięk).
  const [warmupPrompt, setWarmupPrompt] = useState<boolean>(() => isWarmupPromptEnabled());
  const handleWarmupPrompt = (value: boolean) => {
    setWarmupPromptEnabled(value);
    setWarmupPrompt(value);
    persistPreference({ 'preferences.warmupPrompt': value });
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
  const [bugReportOpen, setBugReportOpen] = useState(false);
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
      await cacheAvatarBlob(uid, url, file).catch(() => undefined);
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
  const persistPreference = (patch: UpdateData<DocumentData>) => {
    updateDoc(doc(db, 'users', uid), patch).catch(() => { /* offline — localStorage wystarczy do następnej sesji */ });
  };
  // F-T2: kolor przewodni — lokalnie od splashu, mirror w profilu (cross-device).
  const [accentId, setAccentId] = useState(readStoredAccentId());
  const [paletteTheme, setPaletteTheme] = useState<PaletteThemeV2 | null>(readStoredPaletteTheme());
  const [hexInput, setHexInput] = useState('');
  // D1 (X70): legacy siatka 11 kolorów + własny hex za poziomem "Więcej
  // kolorów" — domyślnie zwinięty, treść zwinięta NIE jest montowana.
  const [moreColorsOpen, setMoreColorsOpen] = useState(false);
  const profileAccent = profile?.preferences?.accentColor;
  const profilePalette = profile?.preferences?.paletteTheme;
  // A1 (X70): listener profilu (includeMetadataChanges) emituje przy każdym
  // acku ŚWIEŻY obiekt palety o tej samej treści. Dep na sygnaturze
  // prymitywnej zamiast tożsamości obiektu — stary ack z niezmienioną paletą
  // nie odpala efektu i nie cofa świeżo zapisanego wyboru.
  const normalizedProfilePalette = normalizePaletteThemeV2(profilePalette);
  const profilePaletteSignature = normalizedProfilePalette ? JSON.stringify(normalizedProfilePalette) : '';
  useEffect(() => {
    const pendingPalette = readPalettePreferenceOutbox(uid)?.palette;
    if (pendingPalette) {
      applyPaletteTheme(pendingPalette);
      storePaletteTheme(pendingPalette);
      setPaletteTheme(pendingPalette);
      setAccentId(pendingPalette.primary);
      return;
    }
    const resolvedTheme = resolvePalettePreference(
      null,
      profilePaletteSignature ? JSON.parse(profilePaletteSignature) : null,
      profileAccent,
    );
    if (resolvedTheme.kind === 'palette') {
      const palette = resolvedTheme.palette;
      // Ack własnego zapisu: paleta z chmury identyczna ze stanem lokalnym —
      // pomiń re-apply. Realna zmiana z innego urządzenia różni się od
      // readStoredPaletteTheme() i nadal się aplikuje.
      const stored = readStoredPaletteTheme();
      if (stored && JSON.stringify(stored) === profilePaletteSignature) return;
      applyPaletteTheme(palette);
      storePaletteTheme(palette);
      setPaletteTheme(palette);
      setAccentId(palette.primary);
    } else if (resolvedTheme.kind === 'legacy'
      && (resolvedTheme.accent !== readStoredAccentId() || readStoredPaletteTheme())) {
      selectLegacyAccent(resolvedTheme.accent);
      setPaletteTheme(null);
      setAccentId(resolvedTheme.accent);
    }
  }, [profileAccent, profilePaletteSignature, uid]);
  const handleAccent = (id: string) => {
    discardPalettePreferenceOutbox(uid);
    selectLegacyAccent(id);
    setPaletteTheme(null);
    setAccentId(id);
    persistPreference({
      'preferences.accentColor': id,
      'preferences.paletteTheme': deleteField(),
      'preferences.paletteRevision': (profile?.preferences?.paletteRevision ?? 0) + 1,
      'preferences.paletteMutationId': `legacy-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    });
  };
  const handlePalette = (palette: PaletteThemeV2) => {
    setPaletteTheme(palette);
    setAccentId(palette.primary);
    const queued = enqueuePresetPalettePreference(uid, palette, profile?.preferences?.paletteRevision ?? 0);
    if (!queued) {
      persistPreference({
        'preferences.accentColor': palette.primary,
        'preferences.paletteTheme': palette,
      });
      return;
    }
    void flushPalettePreferenceOutbox(uid, (patch, entry) => writePalettePreference(uid, patch, entry))
      .then((result) => {
        if (result !== 'stale') return;
        const cloudTheme = resolvePalettePreference(null, profilePalette, profileAccent);
        if (cloudTheme.kind === 'palette') {
          applyPaletteTheme(cloudTheme.palette);
          storePaletteTheme(cloudTheme.palette);
          setPaletteTheme(cloudTheme.palette);
          setAccentId(cloudTheme.palette.primary);
        } else if (cloudTheme.kind === 'legacy') {
          selectLegacyAccent(cloudTheme.accent);
          setPaletteTheme(null);
          setAccentId(cloudTheme.accent);
        }
      });
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
  const accentPreviewColors = paletteTheme
    ? [paletteTheme.primary, paletteTheme.supportA, paletteTheme.supportB]
    : [isCustomAccentHex(accentId)
        ? accentId
        : (ACCENTS.find((accent) => accent.id === accentId)?.hex ?? ACCENTS[0].hex)];

  return (
    <div className="mx-auto max-w-xl space-y-4">
      {/* 1. TOŻSAMOŚĆ (fala 2, artboard 1a): poziomy rząd zamiast wycentrowanego
          hero. X35b: jedyne wejście do edycji imienia/avatara (wiersz "Imię i
          avatar" z sekcji Konto usunięty jako duplikat). */}
      <section id="profile-identity" className="scroll-mt-20 space-y-4">
        <div className="flex items-center gap-3.5 pt-1">
          <div className="relative shrink-0">
            <Avatar className="h-16 w-16">
              <AvatarImage src={avatarSrc || undefined} alt={profile?.displayName || ''} />
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
              <ProfileHeaderChips showPro={hasProPlan(subSummary.planKey)} className="justify-start" />
              <span className="font-mono text-[11px] uppercase tracking-[0.06em] text-muted-foreground">
                {t('profile.identity.workouts', { count: completedCount })}
              </span>
            </div>
          </div>
        </div>

      </section>

      {/* Sync Center — tylko przy zaległościach (Z52); zdrowy user nie widzi pustej
          karty. X36: NAD listą zwijanych sekcji — to alert o niezsynchronizowanych
          sesjach, nie ustawienie, więc nie może chować się w zwiniętej sekcji.
          WP-C (X38): WYŁĄCZNIE wpisy trwałe/konflikty; zwykłe "czeka na sieć"
          domyka AutoSync po cichu (wskaźnik chmurki na Dashboardzie/Historii). */}
      {syncEntries.attentionEntries.length > 0 && (
        <div id="profile-sync" className="scroll-mt-20">
          <SyncCenterCard uid={uid} />
        </div>
      )}

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
                    'rounded-md px-3 py-1.5 font-mono text-[11px] font-bold uppercase tracking-[0.06em] transition-colors',
                    toggleButtonClasses(unit === u),
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
        {/* X37 WP-B: arkusz rozgrzewki przed startem (płomyk w sesji zostaje zawsze). */}
        <SettingRow
          compact
          label={t('profile.warmupPrompt')}
          description={t('profile.warmupPromptHint')}
          right={<Switch checked={warmupPrompt} onCheckedChange={handleWarmupPrompt} aria-label={t('profile.warmupPrompt')} data-testid="profile-warmup-prompt" />}
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
        <section id="profile-plates" data-testid="profile-subsection-plates" className="scroll-mt-20 border-t border-border/60 pt-4">
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            {t('plates.settingsTitle')}
          </h3>
          <PlateInventorySettings />
        </section>
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

      {/* 6. TRENER + URZĄDZENIA: jedna grupa połączeń zamiast dwóch
          równorzędnych decyzji. Stara kotwica profile-trainer zostaje. */}
      <ProfileAccordionSection
        id="devices"
        icon={Watch}
        label={t('profile.section.devicesConnections')}
        value={trainerEmail ? (trainerName || maskEmail(trainerEmail)) : undefined}
        valueAccent={!!trainerEmail}
        open={isSectionOpen('devices')}
        onOpenChange={(open) => setSectionOpen('devices', open)}
      >
        <section id="profile-trainer" data-testid="profile-subsection-trainer" className="scroll-mt-20 rounded-2xl bg-surface-container px-3.5 py-1">
          <h3 className="py-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            {t('profile.trainer.title')}
          </h3>
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
        </section>
        <section data-testid="profile-subsection-devices" className="space-y-3">
        <HealthSettings />
        <GarminSettings hideTitle />
        {canUseStrava && <StravaConnectionCard />}
        </section>
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

      {/* 9. TWOJE DANE: pomiary, backup i zgody w jednej grupie danych.
          Stare kotwice profile-backup/profile-consents zostają dla deep linków. */}
      <ProfileAccordionSection
        id="data"
        icon={Database}
        label={t('profile.section.data')}
        value={t('settings.backup.title')}
        open={isSectionOpen('data')}
        onOpenChange={(open) => setSectionOpen('data', open)}
      >
        <div className="rounded-2xl bg-surface-container px-3.5 py-1">
          <SettingRow compact icon={Ruler} label={t('nav.measurements')} onClick={() => navigate('/measurements')} />
          <SettingRow
            compact
            icon={Medal}
            label={t('profile.backfill.title')}
            value={profile?.prBackfill ? t('profile.backfill.set') : undefined}
            onClick={openBackfill}
          />
          {isAdmin && <SettingRow compact icon={Shield} label={t('nav.admin')} onClick={() => navigate('/admin')} />}
        </div>
        <section id="profile-backup" data-testid="profile-subsection-backup" className="scroll-mt-20 space-y-3">
          <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            {t('settings.backup.title')}
          </h3>
          <BackupSettings />
        </section>
        <section id="profile-consents" data-testid="profile-subsection-consents" className="scroll-mt-20 space-y-3">
          <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            {t('consent.settingsTitle')}
          </h3>
          <ConsentSettings hideTitle />
        </section>
      </ProfileAccordionSection>

      {/* 10. KONTO I POMOC (X35b: język przeszedł tu z dawnej sekcji Aplikacja). */}
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
        <SettingRow
          compact
          icon={Dumbbell}
          label={t('profile.support.appGuide')}
          description={t('profile.support.appGuideDesc')}
          onClick={() => navigate(POST_PLAN_GUIDE_REPLAY_PATH)}
        />
        <SettingRow compact icon={Bug} label={t('profile.support.reportBug')} onClick={() => setBugReportOpen(true)} />
        <SettingRow compact icon={Mail} label={t('profile.support.contact')} onClick={() => { window.location.href = 'mailto:contact@strengthsave.app'; }} />
        <SettingRow compact icon={Info} label={t('profile.support.about')} value={__APP_VERSION__} onClick={() => setAboutOpen(true)} />
      </ProfileAccordionSection>

      {/* Stopka (fala 2): neutralny Wyloguj wg mockupu (dialog potwierdzenia Z237
          bez zmian), Usuń konto tekstowo, wersja aplikacji. */}
      <div className="space-y-3 pt-1">
        <button
          type="button"
          onClick={() => setLogoutConfirmOpen(true)}
          className="flex h-12 w-full touch-manipulation items-center justify-center gap-2 rounded-2xl bg-surface-container text-sm font-medium text-foreground/80 transition-colors hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
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
        <p className="pb-1 text-center font-mono text-[11px] uppercase tracking-[0.1em] text-muted-foreground">
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

      <BugReportDialog open={bugReportOpen} uid={uid} onOpenChange={setBugReportOpen} />

      {/* About dialog (Z241): wersja + linki prawne zamiast znikającego toastu */}
      <Dialog open={aboutOpen} onOpenChange={setAboutOpen}>
        <DialogContent className="rounded-xl border-0 bg-surface-low">
          <DialogHeader>
            <DialogTitle className="font-heading uppercase">{t('profile.about.title')}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">{t('profile.about.desc')}</p>
          <p className="text-xs text-muted-foreground">{t('profile.about.version', { version: __APP_VERSION__ })}</p>
          <p className="text-xs text-muted-foreground">{t('profile.about.copyright')}</p>
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
