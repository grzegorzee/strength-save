import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, onSnapshot, query, where, doc, updateDoc, getDoc, getDocs, getCountFromServer, limit, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Users, Dumbbell, ChevronDown, ChevronUp, DollarSign, ShieldCheck, ShieldOff, Loader2, MailPlus, Ticket, ClipboardList, History, Mail, Ban, Search, Trash2, RotateCcw, Send } from 'lucide-react';
import { ApiKeysCard } from '@/components/admin/ApiKeysCard';
import { AdminUserLogs } from '@/components/admin/AdminUserLogs';
import { AdminCommsCard } from '@/components/admin/AdminCommsCard';
import { AdminFeatureFlagsCard } from '@/components/admin/AdminFeatureFlagsCard';
import { useToast } from '@/hooks/use-toast';
import { useTranslation } from '@/contexts/LanguageContext';
import { dateLocale } from '@/i18n';
import { cn } from '@/lib/utils';
import {
  createInvite,
  listAuthAuditLogs,
  listInvites,
  listWaitlistEntries,
  revokeInvite,
  updateUserAccess,
  adminSendUserEmail,
  adminResendVerification,
  adminDeleteUser,
  type AuthAuditLogRecord,
  type InviteRecord,
  type WaitlistEntryRecord,
} from '@/lib/registration-api';

const AVAILABLE_FEATURES = [
  { key: 'strava', label: 'Strava', description: 'Integracja ze Stravą', defaultOn: false },
] as const;
const ADMIN_USERS_LISTENER_LIMIT = 200;
const ADMIN_TELEMETRY_LIMIT = 1000;

type UserFilter = 'all' | 'active' | 'suspended' | 'no-access' | 'unverified';
type UserSort = 'recent' | 'name';
type ConfirmDialogState = {
  title: string;
  description: string;
  confirmLabel: string;
  destructive?: boolean;
  onConfirm: () => Promise<void>;
} | null;

type FeatureKey = typeof AVAILABLE_FEATURES[number]['key'];

interface AdminUser {
  uid: string;
  email: string;
  displayName: string;
  role: string;
  accessEnabled: boolean;
  status: 'pending_verification' | 'active' | 'suspended' | 'deleted';
  stravaConnected: boolean;
  features: Record<string, boolean>;
  onboardingCompleted: boolean;
  primaryProvider: 'google' | 'password' | 'apple';
  registrationSource: string;
  emailVerifiedAt: string | null;
  cohorts: string[];
  lastLogin?: string;
}

interface AdminUserDetails {
  plan: {
    dayCount: number;
    durationWeeks: number;
    startDate: string | null;
  } | null;
  activeCycle: {
    id: string;
    startDate: string;
    durationWeeks: number;
    completionRate: number;
  } | null;
  recentWorkouts: Array<{
    id: string;
    date: string;
    dayId: string;
    completed: boolean;
    exerciseCount: number;
    cycleId?: string;
  }>;
}


interface TelemetryDoc {
  userId: string;
  date: string;
  counters?: Record<string, number>;
}

interface ClientErrorDoc {
  id: string;
  userId: string;
  code: string;
  phase: string;
  detail: string;
  sessionHash?: string;
  appVersion?: string;
  platform?: string;
  createdAt: number;
}

// Loose shapes for raw Firestore docs (spreading an index-signature-only type
// drops its properties, so we cast data() to an explicit named shape).
interface CycleDocData {
  startDate?: string;
  status?: string;
  durationWeeks?: number;
  stats?: { completionRate?: number };
}

interface WorkoutDocData {
  date?: string;
  dayId?: string;
  completed?: boolean;
  exercises?: unknown[];
  cycleId?: string;
}

const AdminDashboard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t, lang } = useTranslation();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [expandedUid, setExpandedUid] = useState<string | null>(null);
  const [detailsByUser, setDetailsByUser] = useState<Record<string, AdminUserDetails | null>>({});
  const [loadingDetails, setLoadingDetails] = useState<Record<string, boolean>>({});
  const [telemetry, setTelemetry] = useState<TelemetryDoc[]>([]);
  const [clientErrors, setClientErrors] = useState<ClientErrorDoc[]>([]);
  const [invites, setInvites] = useState<InviteRecord[]>([]);
  const [waitlistEntries, setWaitlistEntries] = useState<WaitlistEntryRecord[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuthAuditLogRecord[]>([]);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteNote, setInviteNote] = useState('');
  const [inviteCohorts, setInviteCohorts] = useState('');
  const [creatingInvite, setCreatingInvite] = useState(false);
  const [adminDataLoading, setAdminDataLoading] = useState(false);
  const [userSearch, setUserSearch] = useState('');
  const [userFilter, setUserFilter] = useState<UserFilter>('all');
  const [userSort, setUserSort] = useState<UserSort>('recent');
  const [counts, setCounts] = useState<{ workouts: number; activeCycles: number } | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<ConfirmDialogState>(null);
  const [confirmBusy, setConfirmBusy] = useState(false);
  const [suspendDialog, setSuspendDialog] = useState<{ uid: string; name: string } | null>(null);
  const [suspendReason, setSuspendReason] = useState('');
  const [emailDialog, setEmailDialog] = useState<{ uid: string; subject: string; body: string } | null>(null);
  const [cohortsDialog, setCohortsDialog] = useState<{ uid: string; cohorts: string } | null>(null);

  useEffect(() => {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
    const dateKey = `${sevenDaysAgo.getFullYear()}-${String(sevenDaysAgo.getMonth() + 1).padStart(2, '0')}-${String(sevenDaysAgo.getDate()).padStart(2, '0')}`;

    const q = query(
      collection(db, 'app_telemetry_daily'),
      where('date', '>=', dateKey),
      limit(ADMIN_TELEMETRY_LIMIT),
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const rows: TelemetryDoc[] = [];
      snapshot.forEach((d) => {
        const data = d.data();
        rows.push({
          userId: data.userId || '',
          date: data.date || '',
          counters: data.counters || {},
        });
      });
      setTelemetry(rows);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const unsubscribe = onSnapshot(
      query(collection(db, 'client_errors'), orderBy('createdAt', 'desc'), limit(50)),
      (snapshot) => {
        const rows: ClientErrorDoc[] = [];
        snapshot.forEach((d) => {
          const data = d.data();
          rows.push({
            id: d.id,
            userId: data.userId || '',
            code: data.code || '',
            phase: data.phase || '',
            detail: data.detail || '',
            sessionHash: data.sessionHash,
            appVersion: data.appVersion,
            platform: data.platform,
            createdAt: Number(data.createdAt) || 0,
          });
        });
        setClientErrors(rows);
      },
      () => setClientErrors([]),
    );
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const unsubscribe = onSnapshot(
      query(collection(db, 'users'), limit(ADMIN_USERS_LISTENER_LIMIT)),
      (snapshot) => {
        const data: AdminUser[] = [];
        snapshot.forEach((d) => {
          const u = d.data();
          data.push({
            uid: d.id,
            email: u.email || '',
            displayName: u.displayName || '',
            role: u.role || 'user',
            accessEnabled: u.access?.enabled !== false,
            status: u.status || 'active',
            stravaConnected: u.stravaConnected || false,
            features: u.features || {},
            onboardingCompleted: u.onboardingCompleted || false,
            primaryProvider: u.auth?.primaryProvider || 'google',
            registrationSource: u.registration?.source || u.auth?.primaryProvider || 'google',
            emailVerifiedAt: u.verification?.emailVerifiedAt || null,
            cohorts: u.cohorts || [],
            lastLogin: u.registration?.lastLoginAt || u.lastLogin,
          });
        });
        data.sort((a, b) =>
          Number(b.role === 'admin') - Number(a.role === 'admin')
          || (a.displayName || a.email).localeCompare(b.displayName || b.email, 'pl')
        );
        setUsers(data);
      },
    );
    return () => unsubscribe();
  }, []);

  const loadAdminOpsData = async () => {
    setAdminDataLoading(true);
    try {
      const [inviteRows, waitlistRows, auditRows] = await Promise.all([
        listInvites(),
        listWaitlistEntries(),
        listAuthAuditLogs(),
      ]);
      setInvites(inviteRows);
      setWaitlistEntries(waitlistRows);
      setAuditLogs(auditRows);
    } catch (error) {
      console.error('[AdminDashboard] Failed to load invites/waitlist/audit', error);
      toast({ title: t('admin.error'), description: t('admin.loadOpsFailed'), variant: 'destructive' });
    } finally {
      setAdminDataLoading(false);
    }
  };

  useEffect(() => {
    void loadAdminOpsData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggleFeature = async (uid: string, feature: FeatureKey, enabled: boolean) => {
    try {
      await updateDoc(doc(db, 'users', uid), { [`features.${feature}`]: enabled });
      setUsers(prev => prev.map(u =>
        u.uid === uid ? { ...u, features: { ...u.features, [feature]: enabled } } : u
      ));
      const userName = users.find(u => u.uid === uid)?.displayName || uid;
      toast({ title: enabled ? t('admin.toggleEnabled') : t('admin.toggleDisabled'), description: `${feature} — ${userName}` });
    } catch {
      toast({ title: t('admin.error'), description: t('admin.saveFailed'), variant: 'destructive' });
    }
  };

  const toggleAccess = async (uid: string, enabled: boolean) => {
    try {
      const currentUser = users.find((user) => user.uid === uid);
      await updateUserAccess({
        uid,
        accessEnabled: enabled,
        suspended: currentUser?.status === 'suspended',
      });
      setUsers(prev => prev.map(u =>
        u.uid === uid ? { ...u, accessEnabled: enabled } : u
      ));
      const userName = users.find(u => u.uid === uid)?.displayName || uid;
      toast({
        title: enabled ? t('admin.accessEnabledTitle') : t('admin.accessDisabledTitle'),
        description: `${userName}`,
      });
    } catch {
      toast({ title: t('admin.error'), description: t('admin.accessChangeFailed'), variant: 'destructive' });
    }
  };

  const applySuspended = async (uid: string, suspended: boolean, reason?: string) => {
    try {
      const currentUser = users.find((user) => user.uid === uid);
      await updateUserAccess({
        uid,
        accessEnabled: suspended ? false : (currentUser?.accessEnabled ?? true),
        suspended,
        reason,
      });
      setUsers(prev => prev.map(user => (
        user.uid === uid
          ? {
            ...user,
            status: suspended ? 'suspended' : 'active',
            accessEnabled: suspended ? false : user.accessEnabled,
          }
          : user
      )));
      const userName = users.find(u => u.uid === uid)?.displayName || uid;
      toast({
        title: suspended ? t('admin.accountSuspended') : t('admin.accountRestored'),
        description: userName,
      });
    } catch {
      toast({ title: t('admin.error'), description: t('admin.statusChangeFailed'), variant: 'destructive' });
    }
  };

  const toggleSuspended = async (uid: string, suspended: boolean) => {
    if (suspended) {
      const userName = users.find(u => u.uid === uid)?.displayName || uid;
      setSuspendReason('');
      setSuspendDialog({ uid, name: userName });
      return;
    }
    await applySuspended(uid, false);
  };

  const handleCreateInvite = async (waitlistEntryId?: string, waitlistEmail?: string, waitlistEntryNote?: string | null) => {
    setCreatingInvite(true);
    try {
      const result = await createInvite({
        email: waitlistEmail || inviteEmail || undefined,
        note: waitlistEntryNote || inviteNote || undefined,
        cohorts: inviteCohorts.split(',').map((value) => value.trim()).filter(Boolean),
        waitlistEntryId,
      });
      toast({
        title: t('admin.inviteCreated'),
        description: result.invite.email
          ? t('admin.inviteSent', { email: result.invite.email })
          : t('admin.inviteCodeReady', { code: result.invite.code }),
      });
      setInviteEmail('');
      setInviteNote('');
      setInviteCohorts('');
      await loadAdminOpsData();
    } catch (error) {
      console.error('[AdminDashboard] Failed to create invite', error);
      toast({ title: t('admin.error'), description: t('admin.createInviteFailed'), variant: 'destructive' });
    } finally {
      setCreatingInvite(false);
    }
  };

  const handleRevokeInvite = async (inviteId: string) => {
    try {
      await revokeInvite(inviteId);
      toast({ title: t('admin.inviteRevoked'), description: inviteId });
      await loadAdminOpsData();
    } catch {
      toast({ title: t('admin.error'), description: t('admin.revokeInviteFailed'), variant: 'destructive' });
    }
  };

  useEffect(() => {
    if (!expandedUid || detailsByUser[expandedUid] !== undefined || loadingDetails[expandedUid]) return;

    const loadDetails = async () => {
      setLoadingDetails(prev => ({ ...prev, [expandedUid]: true }));
      try {
        const [planSnap, cyclesSnap, workoutsSnap] = await Promise.all([
          getDoc(doc(db, 'training_plans', expandedUid)),
          getDocs(query(collection(db, 'plan_cycles'), where('userId', '==', expandedUid), limit(10))),
          getDocs(query(collection(db, 'workouts'), where('userId', '==', expandedUid), limit(25))),
        ]);

        const planData = planSnap.exists()
          ? {
            dayCount: Array.isArray(planSnap.data().days) ? planSnap.data().days.length : 0,
            durationWeeks: Number(planSnap.data().durationWeeks || 0),
            startDate: typeof planSnap.data().startDate === 'string' ? planSnap.data().startDate : null,
          }
          : null;

        const cycles = cyclesSnap.docs
          .map((cycleDoc) => ({ id: cycleDoc.id, ...(cycleDoc.data() as CycleDocData) }))
          .sort((a, b) => String(b.startDate || '').localeCompare(String(a.startDate || '')));
        const activeCycleDoc = cycles.find((cycle) => cycle.status === 'active') ?? null;

        const recentWorkouts = workoutsSnap.docs
          .map((workoutDoc) => ({ id: workoutDoc.id, ...(workoutDoc.data() as WorkoutDocData) }))
          .sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')))
          .slice(0, 5)
          .map((workout) => ({
            id: workout.id as string,
            date: String(workout.date || ''),
            dayId: String(workout.dayId || ''),
            completed: Boolean(workout.completed),
            exerciseCount: Array.isArray(workout.exercises) ? workout.exercises.length : 0,
            ...(typeof workout.cycleId === 'string' ? { cycleId: workout.cycleId } : {}),
          }));

        setDetailsByUser(prev => ({
          ...prev,
          [expandedUid]: {
            plan: planData,
            activeCycle: activeCycleDoc
              ? {
                id: String(activeCycleDoc.id),
                startDate: String(activeCycleDoc.startDate || ''),
                durationWeeks: Number(activeCycleDoc.durationWeeks || 0),
                completionRate: Number(activeCycleDoc.stats?.completionRate || 0),
              }
              : null,
            recentWorkouts,
          },
        }));
      } catch (error) {
        console.error('[AdminDashboard] Failed to load user details', error);
        setDetailsByUser(prev => ({ ...prev, [expandedUid]: null }));
      } finally {
        setLoadingDetails(prev => ({ ...prev, [expandedUid]: false }));
      }
    };

    void loadDetails();
  }, [detailsByUser, expandedUid, loadingDetails]);

  const getInitials = (name: string) =>
    name ? name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) : '?';

  // Liczniki ogólne (puls): treningi + aktywne cykle (efektywne zapytania count).
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [w, c] = await Promise.all([
          getCountFromServer(collection(db, 'workouts')),
          getCountFromServer(query(collection(db, 'plan_cycles'), where('status', '==', 'active'))),
        ]);
        if (!cancelled) setCounts({ workouts: w.data().count, activeCycles: c.data().count });
      } catch {
        if (!cancelled) setCounts(null);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // Unikalne cohorty (do broadcastu i filtrów).
  const allCohorts = useMemo(
    () => Array.from(new Set(users.flatMap(u => u.cohorts))).sort(),
    [users],
  );

  // Aktywni w ostatnich 7 dniach (po lastLogin).
  const activeLast7 = useMemo(() => {
    const cutoff = Date.now() - 7 * 86_400_000;
    return users.filter(u => u.lastLogin && new Date(u.lastLogin).getTime() >= cutoff).length;
  }, [users]);

  const filteredUsers = useMemo(() => {
    const q = userSearch.trim().toLowerCase();
    const matchesFilter = (u: AdminUser) => {
      switch (userFilter) {
        case 'active': return u.status === 'active' && u.accessEnabled;
        case 'suspended': return u.status === 'suspended';
        case 'no-access': return !u.accessEnabled && u.status !== 'suspended';
        case 'unverified': return !u.emailVerifiedAt;
        default: return true;
      }
    };
    return users
      .filter(u => matchesFilter(u) && (!q || u.email.toLowerCase().includes(q) || u.displayName.toLowerCase().includes(q)))
      .sort((a, b) => userSort === 'name'
        ? (a.displayName || a.email).localeCompare(b.displayName || b.email)
        : (b.lastLogin || '').localeCompare(a.lastLogin || ''));
  }, [users, userSearch, userFilter, userSort]);

  const handleResetOnboarding = async (uid: string) => {
    setConfirmDialog({
      title: 'Reset onboardingu',
      description: 'Zresetować onboarding tego użytkownika? Przejdzie kreator od nowa.',
      confirmLabel: 'Resetuj onboarding',
      onConfirm: async () => {
        try {
          await updateDoc(doc(db, 'users', uid), { onboardingCompleted: false, 'onboarding.state': 'not_started' });
          toast({ title: 'Onboarding zresetowany' });
        } catch {
          toast({ title: t('admin.error'), description: t('admin.saveFailed'), variant: 'destructive' });
        }
      },
    });
  };

  const handleResendCode = async (uid: string) => {
    setConfirmDialog({
      title: 'Ponowne wysłanie kodu',
      description: 'Wysłać ponownie kod weryfikacyjny do tego użytkownika?',
      confirmLabel: 'Wyślij kod',
      onConfirm: async () => {
        try {
          await adminResendVerification(uid);
          toast({ title: 'Kod wysłany' });
        } catch (e) {
          toast({ title: t('admin.error'), description: e instanceof Error ? e.message : t('admin.saveFailed'), variant: 'destructive' });
        }
      },
    });
  };

  const handleSendEmail = async (uid: string) => {
    setEmailDialog({ uid, subject: '', body: '' });
  };

  const handleEditCohorts = async (uid: string, current: string[]) => {
    setCohortsDialog({ uid, cohorts: current.join(', ') });
  };

  const handleDeleteUser = async (uid: string, name: string) => {
    setConfirmDialog({
      title: 'Usunąć konto użytkownika?',
      description: `Usunąć konto i WSZYSTKIE dane użytkownika "${name}"? Tego nie da się cofnąć.`,
      confirmLabel: 'Usuń konto',
      destructive: true,
      onConfirm: async () => {
        try {
          await adminDeleteUser(uid);
          setUsers(prev => prev.filter(u => u.uid !== uid));
          setExpandedUid(null);
          toast({ title: 'Konto usunięte', description: name });
        } catch (e) {
          toast({ title: t('admin.error'), description: e instanceof Error ? e.message : t('admin.saveFailed'), variant: 'destructive' });
        }
      },
    });
  };

  const runConfirmDialog = async () => {
    if (!confirmDialog) return;
    setConfirmBusy(true);
    try {
      await confirmDialog.onConfirm();
      setConfirmDialog(null);
    } finally {
      setConfirmBusy(false);
    }
  };

  const submitSuspendDialog = async () => {
    if (!suspendDialog) return;
    const target = suspendDialog;
    setSuspendDialog(null);
    await applySuspended(target.uid, true, suspendReason.trim() || undefined);
  };

  const submitEmailDialog = async () => {
    if (!emailDialog || !emailDialog.subject.trim() || !emailDialog.body.trim()) return;
    const payload = emailDialog;
    setEmailDialog(null);
    try {
      await adminSendUserEmail({ uid: payload.uid, subject: payload.subject.trim(), body: payload.body.trim() });
      toast({ title: 'Mail wysłany' });
    } catch (e) {
      toast({ title: t('admin.error'), description: e instanceof Error ? e.message : t('admin.saveFailed'), variant: 'destructive' });
    }
  };

  const submitCohortsDialog = async () => {
    if (!cohortsDialog) return;
    const payload = cohortsDialog;
    const cohorts = payload.cohorts.split(',').map(c => c.trim()).filter(Boolean);
    setCohortsDialog(null);
    try {
      await updateDoc(doc(db, 'users', payload.uid), { cohorts });
      setUsers(prev => prev.map(u => u.uid === payload.uid ? { ...u, cohorts } : u));
      toast({ title: 'Cohorty zapisane', description: cohorts.join(', ') || 'brak' });
    } catch {
      toast({ title: t('admin.error'), description: t('admin.saveFailed'), variant: 'destructive' });
    }
  };

  return (
    <>
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-heading font-bold uppercase italic tracking-tight">{t('admin.title')}</h1>
        <p className="text-muted-foreground text-sm">{t('admin.subtitle')}</p>
      </div>

      {/* Puls aplikacji */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-heading font-bold uppercase tracking-tight">Puls aplikacji</CardTitle>
        </CardHeader>
        <CardContent>
          {(() => {
            const suspended = users.filter(u => u.status === 'suspended').length;
            const noAccess = users.filter(u => !u.accessEnabled && u.status !== 'suspended').length;
            const unverified = users.filter(u => !u.emailVerifiedAt).length;
            const activeInvites = invites.filter(i => i.status === 'active').length;
            const stats: { label: string; value: string | number }[] = [
              { label: 'Użytkownicy', value: users.length },
              { label: 'Aktywni 7 dni', value: activeLast7 },
              { label: 'Treningi', value: counts ? counts.workouts : '—' },
              { label: 'Aktywne cykle', value: counts ? counts.activeCycles : '—' },
              { label: 'Zawieszeni', value: suspended },
              { label: 'Bez dostępu', value: noAccess },
              { label: 'Niezweryfikowani', value: unverified },
              { label: 'Waitlista', value: waitlistEntries.length },
              { label: 'Zaproszenia akt.', value: activeInvites },
            ];
            return (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                {stats.map(s => (
                  <div key={s.label} className="rounded-xl bg-surface-low p-3">
                    <p className="font-heading font-bold text-2xl tabular-nums leading-none">{s.value}</p>
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground mt-1">{s.label}</p>
                  </div>
                ))}
              </div>
            );
          })()}
        </CardContent>
      </Card>

      {telemetry.length > 0 && (() => {
        const aggregate = telemetry.reduce<Record<string, number>>((acc, doc) => {
          Object.entries(doc.counters || {}).forEach(([key, value]) => {
            acc[key] = (acc[key] || 0) + Number(value || 0);
          });
          return acc;
        }, {});

        return (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">{t('admin.healthTelemetry')}</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 md:grid-cols-4">
              <div className="rounded-lg border bg-muted/20 p-3">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">{t('admin.syncFailures')}</p>
                <p className="mt-1 text-2xl font-bold">{aggregate.sync_failure || 0}</p>
              </div>
              <div className="rounded-lg border bg-muted/20 p-3">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">{t('admin.retryManual')}</p>
                <p className="mt-1 text-2xl font-bold">{aggregate.sync_retry_manual || 0}</p>
              </div>
              <div className="rounded-lg border bg-muted/20 p-3">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">{t('admin.draftRecovered')}</p>
                <p className="mt-1 text-2xl font-bold">{aggregate.draft_recovered || 0}</p>
              </div>
              <div className="rounded-lg border bg-muted/20 p-3">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">{t('admin.offlineStarts')}</p>
                <p className="mt-1 text-2xl font-bold">{aggregate.provisional_session_started || 0}</p>
              </div>
            </CardContent>
          </Card>
        );
      })()}

      {clientErrors.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">{t('admin.clientErrors')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="max-h-96 space-y-2 overflow-y-auto">
              {clientErrors.map((entry) => (
                <div key={entry.id} className="rounded-lg border bg-muted/20 p-3 text-xs">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="destructive">{entry.code}</Badge>
                    <Badge variant="secondary">{entry.phase}</Badge>
                    {entry.platform && <Badge variant="outline">{entry.platform} {entry.appVersion}</Badge>}
                    <span className="text-muted-foreground">
                      {entry.createdAt ? new Date(entry.createdAt).toLocaleString(dateLocale(lang)) : ''}
                    </span>
                  </div>
                  <p className="mt-1 break-all font-mono text-muted-foreground">
                    {entry.userId.slice(0, 8)}… {entry.sessionHash ? `sesja ${entry.sessionHash}` : ''}
                  </p>
                  {entry.detail && <p className="mt-1 break-all">{entry.detail}</p>}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <ApiKeysCard />

      <div className="grid gap-6 xl:grid-cols-3">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <MailPlus className="h-5 w-5" />
              {t('admin.invite')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Input
              value={inviteEmail}
              onChange={(event) => setInviteEmail(event.target.value)}
              placeholder={t('admin.emailOptional')}
            />
            <Input
              value={inviteCohorts}
              onChange={(event) => setInviteCohorts(event.target.value)}
              placeholder={t('admin.cohortsPlaceholder')}
            />
            <Input
              value={inviteNote}
              onChange={(event) => setInviteNote(event.target.value)}
              placeholder={t('admin.notePlaceholder')}
            />
            <Button className="w-full" onClick={() => void handleCreateInvite()} disabled={creatingInvite}>
              {creatingInvite ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Mail className="h-4 w-4 mr-2" />}
              {t('admin.createInvite')}
            </Button>
            <div className="space-y-2">
              {invites.slice(0, 6).map((invite) => (
                <div key={invite.id} className="rounded-lg border p-3 text-sm">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-medium truncate">{invite.email || invite.code}</p>
                      <p className="text-xs text-muted-foreground">
                        {invite.status} · {invite.cohorts.join(', ') || t('admin.noCohort')}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Badge variant={invite.status === 'active' ? 'default' : 'secondary'}>{invite.status}</Badge>
                      {invite.status === 'active' && (
                        <Button variant="outline" size="sm" onClick={() => void handleRevokeInvite(invite.id)}>
                          {t('admin.revoke')}
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              {invites.length === 0 && !adminDataLoading && (
                <p className="text-sm text-muted-foreground">{t('admin.noInvites')}</p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <ClipboardList className="h-5 w-5" />
              {t('admin.waitlist')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {waitlistEntries.slice(0, 8).map((entry) => (
              <div key={entry.id} className="rounded-lg border p-3 text-sm space-y-2">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-medium truncate">{entry.email}</p>
                    <p className="text-xs text-muted-foreground">
                      {entry.displayName || t('admin.noName')} · {entry.status}
                    </p>
                  </div>
                  <Badge variant="secondary">{entry.status}</Badge>
                </div>
                {entry.note && (
                  <p className="text-xs text-muted-foreground">{entry.note}</p>
                )}
                {entry.status === 'waiting' && (
                  <Button variant="outline" size="sm" onClick={() => void handleCreateInvite(entry.id, entry.email, entry.note)}>
                    <Ticket className="h-4 w-4 mr-1.5" />
                    {t('admin.convertToInvite')}
                  </Button>
                )}
              </div>
            ))}
            {waitlistEntries.length === 0 && !adminDataLoading && (
              <p className="text-sm text-muted-foreground">{t('admin.noWaitlist')}</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <History className="h-5 w-5" />
              {t('admin.auditAuth')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {auditLogs.slice(0, 10).map((log) => (
              <div key={log.id} className="rounded-lg border p-3 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-medium">{log.eventType}</p>
                  <span className="text-xs text-muted-foreground">
                    {new Date(log.createdAt).toLocaleString(dateLocale(lang))}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {log.email || log.uid || t('admin.anonymous')}
                  {log.actorUid ? ` · actor ${log.actorUid}` : ''}
                </p>
              </div>
            ))}
            {auditLogs.length === 0 && !adminDataLoading && (
              <p className="text-sm text-muted-foreground">{t('admin.noAuditLogs')}</p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="overflow-hidden">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base font-heading font-bold uppercase tracking-tight">
            <Users className="h-5 w-5" />
            {t('admin.users', { count: filteredUsers.length })}
          </CardTitle>
          <div className="pt-3 space-y-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input value={userSearch} onChange={(e) => setUserSearch(e.target.value)} placeholder="Szukaj po nazwie lub mailu" className="pl-9" />
            </div>
            <div className="flex flex-wrap gap-1.5">
              {([['all', 'Wszyscy'], ['active', 'Aktywni'], ['suspended', 'Zawieszeni'], ['no-access', 'Bez dostępu'], ['unverified', 'Niezweryf.']] as [UserFilter, string][]).map(([key, label]) => (
                <button key={key} onClick={() => setUserFilter(key)} className={cn('rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wide', userFilter === key ? 'bg-fitness-cyan text-background' : 'bg-surface-highest text-muted-foreground')}>{label}</button>
              ))}
              <span className="mx-1 w-px self-stretch bg-surface-high" />
              {([['recent', 'Ostatni'], ['name', 'Nazwa']] as [UserSort, string][]).map(([key, label]) => (
                <button key={key} onClick={() => setUserSort(key)} className={cn('rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wide', userSort === key ? 'bg-primary text-primary-foreground' : 'bg-surface-highest text-muted-foreground')}>{label}</button>
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {filteredUsers.map((user) => {
            const isExpanded = expandedUid === user.uid;
            const details = detailsByUser[user.uid];
            const detailsLoading = !!loadingDetails[user.uid];
            return (
              <div key={user.uid} className="border-t first:border-t-0">
                {/* User row — clickable */}
                <button
                  onClick={() => setExpandedUid(isExpanded ? null : user.uid)}
                  className="w-full flex items-center gap-3 p-4 text-left hover:bg-muted/30 transition-colors"
                >
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm shrink-0">
                    {getInitials(user.displayName)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-sm truncate">{user.displayName || t('admin.noNameShort')}</p>
                      <Badge
                        variant={user.role === 'admin' ? 'default' : 'secondary'}
                        className="text-[10px] h-5 shrink-0"
                      >
                        {user.role}
                      </Badge>
                      <Badge
                        variant={user.accessEnabled ? 'outline' : 'destructive'}
                        className="text-[10px] h-5 shrink-0"
                      >
                        {user.accessEnabled ? t('admin.accessOn') : t('admin.accessOff')}
                      </Badge>
                      <Badge
                        variant={user.status === 'suspended' ? 'destructive' : 'secondary'}
                        className="text-[10px] h-5 shrink-0"
                      >
                        {user.status}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                  </div>
                  {isExpanded
                    ? <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0" />
                    : <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
                  }
                </button>

                {/* Expanded panel */}
                {isExpanded && (
                  <div className="px-4 pb-4 space-y-4">
                    <div className="rounded-lg bg-muted/20 p-3 space-y-3">
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{t('admin.access')}</p>
                      <div className="flex items-center justify-between">
                        <div className="flex items-start gap-2">
                          {user.accessEnabled ? (
                            <ShieldCheck className="mt-0.5 h-4 w-4 text-fitness-success" />
                          ) : (
                            <ShieldOff className="mt-0.5 h-4 w-4 text-destructive" />
                          )}
                          <div>
                            <p className="text-sm font-medium">
                              {user.accessEnabled ? t('admin.accessActive') : t('admin.accessDisabled')}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {t('admin.accessBackendNote', { status: user.status })}
                            </p>
                          </div>
                        </div>
                        <Switch
                          checked={user.accessEnabled}
                          onCheckedChange={(checked) => toggleAccess(user.uid, checked)}
                          disabled={user.role === 'admin'}
                        />
                      </div>
                    </div>

                    {/* Feature flags */}
                    <div className="rounded-lg bg-muted/20 p-3 space-y-3">
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{t('admin.features')}</p>
                      {AVAILABLE_FEATURES.map(feat => (
                        <div key={feat.key} className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium">{feat.label}</p>
                            <p className="text-xs text-muted-foreground">{feat.key === 'strava' ? t('admin.featStravaDesc') : feat.description}</p>
                          </div>
                          <Switch
                            checked={user.features[feat.key] ?? (feat.defaultOn || user.role === 'admin')}
                            onCheckedChange={(checked) => toggleFeature(user.uid, feat.key, checked)}
                            disabled={user.role === 'admin'}
                          />
                        </div>
                      ))}
                    </div>

                    <div className="rounded-lg bg-muted/20 p-3 space-y-3">
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{t('admin.userPreview')}</p>
                      {detailsLoading && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          {t('admin.loadingDetails')}
                        </div>
                      )}
                      {!detailsLoading && details && (
                        <div className="space-y-3 text-sm">
                          <div className="grid gap-2 sm:grid-cols-2">
                            <div className="rounded-md border bg-background/60 p-3">
                              <p className="text-xs uppercase tracking-wide text-muted-foreground">{t('admin.plan')}</p>
                              <p className="mt-1 font-medium">
                                {details.plan ? t('admin.planDays', { days: details.plan.dayCount, weeks: details.plan.durationWeeks || '--' }) : t('admin.noPlan')}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {t('admin.start', { date: details.plan?.startDate || t('admin.none') })}
                              </p>
                            </div>
                            <div className="rounded-md border bg-background/60 p-3">
                              <p className="text-xs uppercase tracking-wide text-muted-foreground">{t('admin.activeCycle')}</p>
                              <p className="mt-1 font-medium">
                                {details.activeCycle ? t('admin.cycleWeeks', { weeks: details.activeCycle.durationWeeks }) : t('admin.noActiveCycle')}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {details.activeCycle
                                  ? t('admin.cycleDetail', { date: details.activeCycle.startDate, rate: details.activeCycle.completionRate })
                                  : t('admin.noData')}
                              </p>
                            </div>
                            <div className="rounded-md border bg-background/60 p-3">
                              <p className="text-xs uppercase tracking-wide text-muted-foreground">{t('admin.registration')}</p>
                              <p className="mt-1 font-medium">{user.registrationSource}</p>
                              <p className="text-xs text-muted-foreground">
                                {t('admin.providerInfo', { provider: user.primaryProvider, verified: user.emailVerifiedAt ? t('admin.emailVerified') : t('admin.emailNotVerified') })}
                              </p>
                            </div>
                          </div>

                          <div>
                            <p className="mb-2 text-xs uppercase tracking-wide text-muted-foreground">{t('admin.recentWorkouts')}</p>
                            <div className="space-y-2">
                              {details.recentWorkouts.length > 0 ? details.recentWorkouts.map((workout) => (
                                <div key={workout.id} className="rounded-md border bg-background/60 p-3">
                                  <div className="flex items-center justify-between gap-3">
                                    <div>
                                      <p className="font-medium">{workout.date}</p>
                                      <p className="text-xs text-muted-foreground">
                                        {t('admin.workoutDetail', { dayId: workout.dayId, count: workout.exerciseCount })}
                                        {workout.cycleId ? t('admin.withCycle', { cycleId: workout.cycleId }) : t('admin.noCycleId')}
                                      </p>
                                    </div>
                                    <Badge variant={workout.completed ? 'default' : 'secondary'}>
                                      {workout.completed ? t('admin.completed') : t('admin.draft')}
                                    </Badge>
                                  </div>
                                </div>
                              )) : (
                                <p className="text-xs text-muted-foreground">{t('admin.noWorkouts')}</p>
                              )}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Logi per-użytkownik */}
                    <div className="space-y-2">
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Logi</p>
                      <AdminUserLogs uid={user.uid} />
                    </div>

                    {/* Actions */}
                    <div className="flex flex-wrap gap-2">
                      <Button variant="outline" size="sm" onClick={() => navigate(`/admin/plans/${user.uid}`)}>
                        <Dumbbell className="h-4 w-4 mr-1.5" />
                        {t('admin.editPlan')}
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => void handleSendEmail(user.uid)}>
                        <Mail className="h-4 w-4 mr-1.5" /> Wyślij mail
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => void handleResendCode(user.uid)}>
                        <Send className="h-4 w-4 mr-1.5" /> Wyślij kod
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => void handleResetOnboarding(user.uid)}>
                        <RotateCcw className="h-4 w-4 mr-1.5" /> Reset onboardingu
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => void handleEditCohorts(user.uid, user.cohorts)}>
                        <Ticket className="h-4 w-4 mr-1.5" /> Cohorty
                      </Button>
                      <Button
                        variant={user.status === 'suspended' ? 'outline' : 'destructive'}
                        size="sm"
                        onClick={() => void toggleSuspended(user.uid, user.status !== 'suspended')}
                        disabled={user.role === 'admin'}
                      >
                        {user.status === 'suspended' ? <ShieldCheck className="h-4 w-4 mr-1.5" /> : <Ban className="h-4 w-4 mr-1.5" />}
                        {user.status === 'suspended' ? t('admin.restoreAccount') : t('admin.suspendAccount')}
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => void handleDeleteUser(user.uid, user.displayName || user.email)}
                        disabled={user.role === 'admin'}
                      >
                        <Trash2 className="h-4 w-4 mr-1.5" /> Usuń konto
                      </Button>
                    </div>

                    {/* Info */}
                    <div className="text-xs text-muted-foreground space-y-0.5">
                      {user.lastLogin && (
                        <p>{t('admin.lastLogin', { date: new Date(user.lastLogin).toLocaleString(dateLocale(lang)) })}</p>
                      )}
                      <p>{t('admin.onboarding', { status: user.onboardingCompleted ? t('admin.onboardingDone') : t('admin.onboardingNotDone') })}</p>
                      <p>{t('admin.strava', { status: user.stravaConnected ? t('admin.stravaConnected') : t('admin.stravaNotConnected') })}</p>
                      {user.cohorts.length > 0 && (
                        <p>{t('admin.cohorts', { cohorts: user.cohorts.join(', ') })}</p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          {filteredUsers.length === 0 && (
            <p className="text-center text-muted-foreground py-8">
              {t('admin.noUsers')}
            </p>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <AdminCommsCard cohorts={allCohorts} />
        <AdminFeatureFlagsCard />
      </div>
    </div>
    <AlertDialog open={!!confirmDialog} onOpenChange={(open) => { if (!open) setConfirmDialog(null); }}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{confirmDialog?.title}</AlertDialogTitle>
          <AlertDialogDescription>{confirmDialog?.description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={confirmBusy}>{t('common.cancel')}</AlertDialogCancel>
          <AlertDialogAction
            disabled={confirmBusy}
            className={confirmDialog?.destructive ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90' : undefined}
            onClick={(event) => { event.preventDefault(); void runConfirmDialog(); }}
          >
            {confirmBusy ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
            {confirmDialog?.confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>

    <Dialog open={!!suspendDialog} onOpenChange={(open) => { if (!open) setSuspendDialog(null); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Zawieś konto</DialogTitle>
        </DialogHeader>
        <div className="space-y-2">
          <label htmlFor="admin-suspend-reason" className="text-sm font-medium">
            Powód zawieszenia {suspendDialog ? `- ${suspendDialog.name}` : ''}
          </label>
          <Textarea
            id="admin-suspend-reason"
            value={suspendReason}
            onChange={(event) => setSuspendReason(event.target.value)}
            placeholder="Np. naruszenie regulaminu"
            rows={3}
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setSuspendDialog(null)}>{t('common.cancel')}</Button>
          <Button variant="destructive" onClick={() => void submitSuspendDialog()}>Zawieś konto</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <Dialog open={!!emailDialog} onOpenChange={(open) => { if (!open) setEmailDialog(null); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Wyślij mail</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <Input
            value={emailDialog?.subject ?? ''}
            onChange={(event) => setEmailDialog(prev => prev ? { ...prev, subject: event.target.value } : prev)}
            placeholder="Temat maila"
            aria-label="Temat maila"
          />
          <Textarea
            value={emailDialog?.body ?? ''}
            onChange={(event) => setEmailDialog(prev => prev ? { ...prev, body: event.target.value } : prev)}
            placeholder="Treść maila"
            aria-label="Treść maila"
            rows={5}
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setEmailDialog(null)}>{t('common.cancel')}</Button>
          <Button onClick={() => void submitEmailDialog()} disabled={!emailDialog?.subject.trim() || !emailDialog?.body.trim()}>Wyślij mail</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <Dialog open={!!cohortsDialog} onOpenChange={(open) => { if (!open) setCohortsDialog(null); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edytuj cohorty</DialogTitle>
        </DialogHeader>
        <div className="space-y-2">
          <label htmlFor="admin-user-cohorts" className="text-sm font-medium">Cohorty po przecinku</label>
          <Input
            id="admin-user-cohorts"
            value={cohortsDialog?.cohorts ?? ''}
            onChange={(event) => setCohortsDialog(prev => prev ? { ...prev, cohorts: event.target.value } : prev)}
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setCohortsDialog(null)}>{t('common.cancel')}</Button>
          <Button onClick={() => void submitCohortsDialog()}>Zapisz cohorty</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    </>
  );
};

export default AdminDashboard;
