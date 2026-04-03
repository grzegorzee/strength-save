import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, onSnapshot, query, where, doc, updateDoc, getDoc, getDocs, limit } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { ArrowLeft, Users, Dumbbell, ChevronDown, ChevronUp, DollarSign, ShieldCheck, ShieldOff, Loader2, MailPlus, Ticket, ClipboardList, History, Mail, Ban } from 'lucide-react';
import { ApiKeysCard } from '@/components/admin/ApiKeysCard';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import {
  createInvite,
  listAuthAuditLogs,
  listInvites,
  listWaitlistEntries,
  revokeInvite,
  updateUserAccess,
  type AuthAuditLogRecord,
  type InviteRecord,
  type WaitlistEntryRecord,
} from '@/lib/registration-api';

const AVAILABLE_FEATURES = [
  { key: 'strava', label: 'Strava', description: 'Integracja ze Stravą' },
] as const;

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
  primaryProvider: 'google' | 'password';
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

interface AIUsageDoc {
  userId: string;
  month: string;
  promptTokens: number;
  completionTokens: number;
  estimatedCostUsd: number;
  callCount: number;
}

interface TelemetryDoc {
  userId: string;
  date: string;
  counters?: Record<string, number>;
}

const AdminDashboard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [expandedUid, setExpandedUid] = useState<string | null>(null);
  const [aiUsage, setAiUsage] = useState<AIUsageDoc[]>([]);
  const [detailsByUser, setDetailsByUser] = useState<Record<string, AdminUserDetails | null>>({});
  const [loadingDetails, setLoadingDetails] = useState<Record<string, boolean>>({});
  const [telemetry, setTelemetry] = useState<TelemetryDoc[]>([]);
  const [invites, setInvites] = useState<InviteRecord[]>([]);
  const [waitlistEntries, setWaitlistEntries] = useState<WaitlistEntryRecord[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuthAuditLogRecord[]>([]);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteNote, setInviteNote] = useState('');
  const [inviteCohorts, setInviteCohorts] = useState('');
  const [creatingInvite, setCreatingInvite] = useState(false);
  const [adminDataLoading, setAdminDataLoading] = useState(false);

  // Current month key for AI usage query
  const currentMonth = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;

  // Subscribe to AI usage for current month
  useEffect(() => {
    const q = query(
      collection(db, 'ai_usage'),
      where('month', '==', currentMonth),
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data: AIUsageDoc[] = [];
      snapshot.forEach((d) => {
        const u = d.data();
        data.push({
          userId: u.userId,
          month: u.month,
          promptTokens: u.promptTokens || 0,
          completionTokens: u.completionTokens || 0,
          estimatedCostUsd: u.estimatedCostUsd || 0,
          callCount: u.callCount || 0,
        });
      });
      setAiUsage(data);
    });
    return () => unsubscribe();
  }, [currentMonth]);

  useEffect(() => {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
    const dateKey = `${sevenDaysAgo.getFullYear()}-${String(sevenDaysAgo.getMonth() + 1).padStart(2, '0')}-${String(sevenDaysAgo.getDate()).padStart(2, '0')}`;

    const q = query(
      collection(db, 'app_telemetry_daily'),
      where('date', '>=', dateKey),
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
      collection(db, 'users'),
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
      toast({ title: 'Błąd', description: 'Nie udało się wczytać invite, waitlisty lub audytu.', variant: 'destructive' });
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
      toast({ title: enabled ? 'Włączono' : 'Wyłączono', description: `${feature} — ${userName}` });
    } catch {
      toast({ title: 'Błąd', description: 'Nie udało się zapisać.', variant: 'destructive' });
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
        title: enabled ? 'Dostęp włączony' : 'Dostęp wyłączony',
        description: `${userName}`,
      });
    } catch {
      toast({ title: 'Błąd', description: 'Nie udało się zmienić dostępu.', variant: 'destructive' });
    }
  };

  const toggleSuspended = async (uid: string, suspended: boolean) => {
    try {
      const currentUser = users.find((user) => user.uid === uid);
      await updateUserAccess({
        uid,
        accessEnabled: suspended ? false : (currentUser?.accessEnabled ?? true),
        suspended,
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
        title: suspended ? 'Konto zawieszone' : 'Konto przywrócone',
        description: userName,
      });
    } catch {
      toast({ title: 'Błąd', description: 'Nie udało się zmienić statusu konta.', variant: 'destructive' });
    }
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
        title: 'Invite utworzony',
        description: result.invite.email
          ? `Wysłano zaproszenie do ${result.invite.email}.`
          : `Kod ${result.invite.code} jest gotowy do użycia.`,
      });
      setInviteEmail('');
      setInviteNote('');
      setInviteCohorts('');
      await loadAdminOpsData();
    } catch (error) {
      console.error('[AdminDashboard] Failed to create invite', error);
      toast({ title: 'Błąd', description: 'Nie udało się utworzyć invite.', variant: 'destructive' });
    } finally {
      setCreatingInvite(false);
    }
  };

  const handleRevokeInvite = async (inviteId: string) => {
    try {
      await revokeInvite(inviteId);
      toast({ title: 'Invite unieważniony', description: inviteId });
      await loadAdminOpsData();
    } catch {
      toast({ title: 'Błąd', description: 'Nie udało się unieważnić invite.', variant: 'destructive' });
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
          .map((cycleDoc) => ({ id: cycleDoc.id, ...cycleDoc.data() }))
          .sort((a, b) => String(b.startDate || '').localeCompare(String(a.startDate || '')));
        const activeCycleDoc = cycles.find((cycle) => cycle.status === 'active') ?? null;

        const recentWorkouts = workoutsSnap.docs
          .map((workoutDoc) => ({ id: workoutDoc.id, ...workoutDoc.data() }))
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

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Panel admina</h1>
          <p className="text-muted-foreground text-sm">Zarządzaj użytkownikami i funkcjami</p>
        </div>
      </div>

      {/* AI Cost Summary */}
      {(() => {
        const totalCost = aiUsage.reduce((sum, u) => sum + u.estimatedCostUsd, 0);
        const totalCalls = aiUsage.reduce((sum, u) => sum + u.callCount, 0);
        const costColor = totalCost < 2 ? 'text-green-600' : totalCost < 4 ? 'text-yellow-600' : 'text-red-600';
        return totalCalls > 0 ? (
          <Card>
            <CardContent className="py-4">
              <div className="flex items-center gap-3">
                <DollarSign className={cn('h-5 w-5', costColor)} />
                <div>
                  <p className={cn('font-semibold text-sm', costColor)}>
                    AI koszty ({currentMonth}): ${totalCost.toFixed(2)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {totalCalls} wywołań, {aiUsage.length} użytkowników
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : null;
      })()}

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
              <CardTitle className="text-base">Health telemetry (7 dni)</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 md:grid-cols-4">
              <div className="rounded-lg border bg-muted/20 p-3">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Sync failures</p>
                <p className="mt-1 text-2xl font-bold">{aggregate.sync_failure || 0}</p>
              </div>
              <div className="rounded-lg border bg-muted/20 p-3">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Retry manual</p>
                <p className="mt-1 text-2xl font-bold">{aggregate.sync_retry_manual || 0}</p>
              </div>
              <div className="rounded-lg border bg-muted/20 p-3">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Draft recovered</p>
                <p className="mt-1 text-2xl font-bold">{aggregate.draft_recovered || 0}</p>
              </div>
              <div className="rounded-lg border bg-muted/20 p-3">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Offline starts</p>
                <p className="mt-1 text-2xl font-bold">{aggregate.provisional_session_started || 0}</p>
              </div>
            </CardContent>
          </Card>
        );
      })()}

      <ApiKeysCard />

      <div className="grid gap-6 xl:grid-cols-3">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <MailPlus className="h-5 w-5" />
              Invite
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Input
              value={inviteEmail}
              onChange={(event) => setInviteEmail(event.target.value)}
              placeholder="Email (opcjonalnie)"
            />
            <Input
              value={inviteCohorts}
              onChange={(event) => setInviteCohorts(event.target.value)}
              placeholder="Cohorty, np. beta,launch"
            />
            <Input
              value={inviteNote}
              onChange={(event) => setInviteNote(event.target.value)}
              placeholder="Notatka / kontekst invite"
            />
            <Button className="w-full" onClick={() => void handleCreateInvite()} disabled={creatingInvite}>
              {creatingInvite ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Mail className="h-4 w-4 mr-2" />}
              Utwórz invite
            </Button>
            <div className="space-y-2">
              {invites.slice(0, 6).map((invite) => (
                <div key={invite.id} className="rounded-lg border p-3 text-sm">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-medium truncate">{invite.email || invite.code}</p>
                      <p className="text-xs text-muted-foreground">
                        {invite.status} · {invite.cohorts.join(', ') || 'brak cohort'}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Badge variant={invite.status === 'active' ? 'default' : 'secondary'}>{invite.status}</Badge>
                      {invite.status === 'active' && (
                        <Button variant="outline" size="sm" onClick={() => void handleRevokeInvite(invite.id)}>
                          Revoke
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              {invites.length === 0 && !adminDataLoading && (
                <p className="text-sm text-muted-foreground">Brak invite.</p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <ClipboardList className="h-5 w-5" />
              Waitlista
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {waitlistEntries.slice(0, 8).map((entry) => (
              <div key={entry.id} className="rounded-lg border p-3 text-sm space-y-2">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-medium truncate">{entry.email}</p>
                    <p className="text-xs text-muted-foreground">
                      {entry.displayName || 'bez nazwy'} · {entry.status}
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
                    Zamień na invite
                  </Button>
                )}
              </div>
            ))}
            {waitlistEntries.length === 0 && !adminDataLoading && (
              <p className="text-sm text-muted-foreground">Brak wpisów na waitliście.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <History className="h-5 w-5" />
              Audit auth
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {auditLogs.slice(0, 10).map((log) => (
              <div key={log.id} className="rounded-lg border p-3 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-medium">{log.eventType}</p>
                  <span className="text-xs text-muted-foreground">
                    {new Date(log.createdAt).toLocaleString('pl-PL')}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {log.email || log.uid || 'anonymous'}
                  {log.actorUid ? ` · actor ${log.actorUid}` : ''}
                </p>
              </div>
            ))}
            {auditLogs.length === 0 && !adminDataLoading && (
              <p className="text-sm text-muted-foreground">Brak logów audytowych.</p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="overflow-hidden">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Users className="h-5 w-5" />
            Użytkownicy ({users.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {users.map((user) => {
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
                      <p className="font-medium text-sm truncate">{user.displayName || 'Bez nazwy'}</p>
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
                        {user.accessEnabled ? 'dostęp on' : 'dostęp off'}
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
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Dostęp</p>
                      <div className="flex items-center justify-between">
                        <div className="flex items-start gap-2">
                          {user.accessEnabled ? (
                            <ShieldCheck className="mt-0.5 h-4 w-4 text-emerald-600" />
                          ) : (
                            <ShieldOff className="mt-0.5 h-4 w-4 text-destructive" />
                          )}
                          <div>
                            <p className="text-sm font-medium">
                              {user.accessEnabled ? 'Dostęp aktywny' : 'Dostęp wyłączony'}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Backend egzekwuje ten stan dla danych treningowych i funkcji. Status konta: {user.status}.
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
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Funkcje</p>
                      {AVAILABLE_FEATURES.map(feat => (
                        <div key={feat.key} className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium">{feat.label}</p>
                            <p className="text-xs text-muted-foreground">{feat.description}</p>
                          </div>
                          <Switch
                            checked={user.features[feat.key] ?? user.role === 'admin'}
                            onCheckedChange={(checked) => toggleFeature(user.uid, feat.key, checked)}
                            disabled={user.role === 'admin'}
                          />
                        </div>
                      ))}
                    </div>

                    <div className="rounded-lg bg-muted/20 p-3 space-y-3">
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Podgląd użytkownika</p>
                      {detailsLoading && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Ładowanie szczegółów...
                        </div>
                      )}
                      {!detailsLoading && details && (
                        <div className="space-y-3 text-sm">
                          <div className="grid gap-2 sm:grid-cols-2">
                            <div className="rounded-md border bg-background/60 p-3">
                              <p className="text-xs uppercase tracking-wide text-muted-foreground">Plan</p>
                              <p className="mt-1 font-medium">
                                {details.plan ? `${details.plan.dayCount} dni / ${details.plan.durationWeeks || '--'} tyg.` : 'Brak planu'}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                Start: {details.plan?.startDate || 'brak'}
                              </p>
                            </div>
                            <div className="rounded-md border bg-background/60 p-3">
                              <p className="text-xs uppercase tracking-wide text-muted-foreground">Aktywny cykl</p>
                              <p className="mt-1 font-medium">
                                {details.activeCycle ? `${details.activeCycle.durationWeeks} tyg.` : 'Brak aktywnego cyklu'}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {details.activeCycle
                                  ? `Start ${details.activeCycle.startDate} · completion ${details.activeCycle.completionRate}%`
                                  : 'Brak danych'}
                              </p>
                            </div>
                            <div className="rounded-md border bg-background/60 p-3">
                              <p className="text-xs uppercase tracking-wide text-muted-foreground">Rejestracja</p>
                              <p className="mt-1 font-medium">{user.registrationSource}</p>
                              <p className="text-xs text-muted-foreground">
                                Provider: {user.primaryProvider} · {user.emailVerifiedAt ? 'email verified' : 'email not verified'}
                              </p>
                            </div>
                          </div>

                          <div>
                            <p className="mb-2 text-xs uppercase tracking-wide text-muted-foreground">Ostatnie treningi</p>
                            <div className="space-y-2">
                              {details.recentWorkouts.length > 0 ? details.recentWorkouts.map((workout) => (
                                <div key={workout.id} className="rounded-md border bg-background/60 p-3">
                                  <div className="flex items-center justify-between gap-3">
                                    <div>
                                      <p className="font-medium">{workout.date}</p>
                                      <p className="text-xs text-muted-foreground">
                                        {workout.dayId} · {workout.exerciseCount} ćwiczeń
                                        {workout.cycleId ? ` · cycle ${workout.cycleId}` : ' · bez cycleId'}
                                      </p>
                                    </div>
                                    <Badge variant={workout.completed ? 'default' : 'secondary'}>
                                      {workout.completed ? 'completed' : 'draft'}
                                    </Badge>
                                  </div>
                                </div>
                              )) : (
                                <p className="text-xs text-muted-foreground">Brak treningów.</p>
                              )}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* AI Usage */}
                    {(() => {
                      const usage = aiUsage.find(u => u.userId === user.uid);
                      if (!usage || usage.callCount === 0) return null;
                      const totalTokens = usage.promptTokens + usage.completionTokens;
                      const tokenStr = totalTokens >= 1000 ? `${(totalTokens / 1000).toFixed(1)}K` : `${totalTokens}`;
                      const costColor = usage.estimatedCostUsd < 2 ? 'text-green-600' : usage.estimatedCostUsd < 4 ? 'text-yellow-600' : 'text-red-600';
                      return (
                        <div className="rounded-lg bg-muted/20 p-3">
                          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">AI Usage ({currentMonth})</p>
                          <p className={cn('text-sm font-semibold', costColor)}>
                            ${usage.estimatedCostUsd.toFixed(2)} / $5.00
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {usage.callCount} wywołań, {tokenStr} tokenów
                          </p>
                        </div>
                      );
                    })()}

                    {/* Actions */}
                    <div className="flex flex-wrap gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => navigate(`/admin/plans/${user.uid}`)}
                      >
                        <Dumbbell className="h-4 w-4 mr-1.5" />
                        Edytuj plan
                      </Button>
                      <Button
                        variant={user.status === 'suspended' ? 'outline' : 'destructive'}
                        size="sm"
                        onClick={() => void toggleSuspended(user.uid, user.status !== 'suspended')}
                        disabled={user.role === 'admin'}
                      >
                        {user.status === 'suspended' ? <ShieldCheck className="h-4 w-4 mr-1.5" /> : <Ban className="h-4 w-4 mr-1.5" />}
                        {user.status === 'suspended' ? 'Przywróć konto' : 'Zawieś konto'}
                      </Button>
                    </div>

                    {/* Info */}
                    <div className="text-xs text-muted-foreground space-y-0.5">
                      {user.lastLogin && (
                        <p>Ostatnie logowanie: {new Date(user.lastLogin).toLocaleString('pl-PL')}</p>
                      )}
                      <p>Onboarding: {user.onboardingCompleted ? 'ukończony' : 'nie ukończony'}</p>
                      <p>Strava: {user.stravaConnected ? 'połączona' : 'niepołączona'}</p>
                      {user.cohorts.length > 0 && (
                        <p>Cohorty: {user.cohorts.join(', ')}</p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          {users.length === 0 && (
            <p className="text-center text-muted-foreground py-8">
              Brak zarejestrowanych użytkowników
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminDashboard;
