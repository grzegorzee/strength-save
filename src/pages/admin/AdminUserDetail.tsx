import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  collection, doc, getDoc, getDocs, limit, orderBy, query, where,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { ArrowLeft, BarChart3, Bug, Dumbbell, Loader2, MousePointerClick, Wrench } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { EmptyState } from '@/components/EmptyState';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { httpsCallable } from 'firebase/functions';
import { functions } from '@/lib/firebase';
import { formatRepairOperations, type RepairOperationLike } from '@/lib/admin-audit';
import { useTranslation } from '@/contexts/LanguageContext';
import { dateLocale, type TranslationKey } from '@/i18n';
import { buildDailyActivitySeries, activityBadge } from '@/lib/admin-activity';
import { useAdminUserActions } from './useAdminUserActions';
import { AVAILABLE_FEATURES } from './admin-user-types';
import type { ActivitySummary } from '@/lib/user-profile';

// Z99: szczegół usera w panelu admina. Dane on-demand po wejściu:
// users/{uid} (1 odczyt) + app_telemetry_daily 30 dni (query userId+date, <=31)
// + training_plans/{uid} (1) + client_errors (10). Razem ~43 odczyty max.
// Treningi WYŁĄCZNIE z liczników telemetrii (zero odczytów kolekcji workouts).

interface DetailUser {
  uid: string;
  email: string;
  displayName: string;
  role: string;
  accessEnabled: boolean;
  status: string;
  features: Record<string, boolean>;
  activitySummary?: ActivitySummary;
}

interface TelemetryDailyDoc {
  userId: string;
  date: string;
  counters?: Record<string, number>;
}

interface ClientErrorRow {
  id: string;
  code: string;
  phase: string;
  detail: string;
  createdAt: number;
  platform?: string;
  appVersion?: string;
}

const COUNTER_LABEL_KEYS: Record<string, TranslationKey> = {
  screen_dashboard: 'nav.dashboard',
  screen_plan: 'nav.plan',
  screen_analytics: 'nav.analytics',
  screen_exercises: 'nav.exercises',
  screen_profile: 'nav.profile',
  screen_history: 'nav.history',
  screen_measurements: 'nav.measurements',
  screen_achievements: 'nav.achievements',
  screen_cycles: 'nav.cycles',
  screen_settings: 'nav.settings',
  screen_workout: 'admin.counter.screenWorkout',
  action_workout_started: 'admin.counter.workoutStarted',
  action_workout_completed: 'admin.counter.workoutCompleted',
  action_set_checked: 'admin.counter.setChecked',
  action_plan_edited: 'admin.counter.planEdited',
  action_replan_completed: 'admin.counter.replanCompleted',
  action_export_data: 'admin.counter.exportData',
  action_strava_opened: 'admin.counter.stravaOpened',
};

const sumCounters = (docs: TelemetryDailyDoc[], prefix: string): Array<{ key: string; count: number }> => {
  const totals = new Map<string, number>();
  for (const dailyDoc of docs) {
    for (const [key, value] of Object.entries(dailyDoc.counters ?? {})) {
      if (!key.startsWith(prefix) || typeof value !== 'number') continue;
      totals.set(key, (totals.get(key) ?? 0) + value);
    }
  }
  return [...totals.entries()]
    .map(([key, count]) => ({ key, count }))
    .sort((a, b) => b.count - a.count || a.key.localeCompare(b.key))
    .slice(0, 8);
};

const AdminUserDetail = () => {
  const { userId = '' } = useParams();
  const navigate = useNavigate();
  const { t, lang } = useTranslation();
  const [user, setUser] = useState<DetailUser | null>(null);
  const [telemetryDocs, setTelemetryDocs] = useState<TelemetryDailyDoc[] | null>(null);
  const [plan, setPlan] = useState<{ dayCount: number; durationWeeks: number; startDate: string | null } | null | 'missing'>(null);
  const [errors, setErrors] = useState<ClientErrorRow[] | null>(null);
  const [loading, setLoading] = useState(true);
  // Z102: naprawy z dry-run; Wykonaj aktywne dopiero po świeżym dry-run tej akcji.
  const [repairBusy, setRepairBusy] = useState<string | null>(null);
  const [dryRunResults, setDryRunResults] = useState<Record<string, RepairOperationLike[]>>({});
  const [confirmRepair, setConfirmRepair] = useState<string | null>(null);

  const actions = useAdminUserActions({
    getUserMeta: () => user ?? undefined,
    onPatched: (_uid, patch) => {
      setUser((prev) => prev && ({
        ...prev,
        ...(patch.accessEnabled !== undefined ? { accessEnabled: patch.accessEnabled } : {}),
        ...(patch.status !== undefined ? { status: patch.status } : {}),
        ...(patch.feature ? { features: { ...prev.features, [patch.feature.key]: patch.feature.enabled } } : {}),
      }));
    },
  });

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    setLoading(true);
    (async () => {
      try {
        const floor = new Date();
        floor.setDate(floor.getDate() - 31);
        const floorKey = `${floor.getFullYear()}-${String(floor.getMonth() + 1).padStart(2, '0')}-${String(floor.getDate()).padStart(2, '0')}`;
        const [userSnap, telemetrySnap, planSnap, errorsSnap] = await Promise.all([
          getDoc(doc(db, 'users', userId)),
          getDocs(query(
            collection(db, 'app_telemetry_daily'),
            where('userId', '==', userId),
            where('date', '>=', floorKey),
          )),
          getDoc(doc(db, 'training_plans', userId)),
          getDocs(query(
            collection(db, 'client_errors'),
            where('userId', '==', userId),
            orderBy('createdAt', 'desc'),
            limit(10),
          )),
        ]);
        if (cancelled) return;

        const u = userSnap.data();
        setUser(userSnap.exists() && u ? {
          uid: userId,
          email: String(u.email ?? ''),
          displayName: String(u.displayName ?? ''),
          role: String(u.role ?? 'user'),
          accessEnabled: u.access?.enabled !== false,
          status: String(u.status ?? 'active'),
          features: (u.features ?? {}) as Record<string, boolean>,
          activitySummary: u.activitySummary as ActivitySummary | undefined,
        } : null);
        setTelemetryDocs(telemetrySnap.docs.map((d) => d.data() as TelemetryDailyDoc));
        setPlan(planSnap.exists()
          ? {
            dayCount: Array.isArray(planSnap.data().days) ? planSnap.data().days.length : 0,
            durationWeeks: Number(planSnap.data().durationWeeks || 0),
            startDate: typeof planSnap.data().startDate === 'string' ? planSnap.data().startDate : null,
          }
          : 'missing');
        setErrors(errorsSnap.docs.map((d) => ({
          id: d.id,
          code: String(d.get('code') ?? ''),
          phase: String(d.get('phase') ?? ''),
          detail: String(d.get('detail') ?? ''),
          createdAt: Number(d.get('createdAt') ?? 0),
          platform: d.get('platform') as string | undefined,
          appVersion: d.get('appVersion') as string | undefined,
        })));
      } catch (error) {
        console.error('[AdminUserDetail] load failed', error);
        if (!cancelled) {
          setTelemetryDocs([]);
          setErrors([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [userId]);

  const series = useMemo(
    () => buildDailyActivitySeries(telemetryDocs ?? [], 30, new Date()),
    [telemetryDocs],
  );
  const hasTelemetry = (telemetryDocs?.length ?? 0) > 0;
  const topScreens = useMemo(() => sumCounters(telemetryDocs ?? [], 'screen_'), [telemetryDocs]);
  const topActions = useMemo(() => sumCounters(telemetryDocs ?? [], 'action_'), [telemetryDocs]);
  const summary = user?.activitySummary;
  const badge = activityBadge(summary?.lastActiveAt, new Date());

  const counterLabel = (key: string): string => {
    const labelKey = COUNTER_LABEL_KEYS[key];
    return labelKey ? t(labelKey) : key;
  };

  const REPAIR_ACTIONS: Array<{ action: string; titleKey: TranslationKey; descKey: TranslationKey }> = [
    { action: 'mergeCycles', titleKey: 'settings.repairCycles.title', descKey: 'settings.repairCycles.description' },
    { action: 'repairHistory', titleKey: 'admin.repair.historyTitle', descKey: 'admin.repair.historyDesc' },
    { action: 'dedupeWorkouts', titleKey: 'admin.repair.dedupeTitle', descKey: 'admin.repair.dedupeDesc' },
    { action: 'resetOnboarding', titleKey: 'settings.resetPlan.title', descKey: 'settings.resetPlan.description' },
  ];

  const callRepair = async (action: string, dryRun: boolean) => {
    setRepairBusy(action);
    try {
      const callable = httpsCallable<
        { targetUid: string; action: string; dryRun: boolean },
        { dryRun: boolean; operations?: RepairOperationLike[]; applied?: number; backupId?: string }
      >(functions, 'adminUserRepair');
      const { data } = await callable({ targetUid: userId, action, dryRun });
      if (dryRun) {
        setDryRunResults((prev) => ({ ...prev, [action]: data.operations ?? [] }));
      } else {
        toastRepair(t('admin.repair.applied', { n: data.applied ?? 0, backupId: data.backupId ?? '—' }));
        setDryRunResults((prev) => ({ ...prev, [action]: [] }));
        void callRepair(action, true);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      toastRepair(`${t('admin.repair.error')}: ${message}`);
    } finally {
      setRepairBusy(null);
    }
  };

  const [repairToast, setRepairToast] = useState<string | null>(null);
  const toastRepair = (message: string) => setRepairToast(message);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="space-y-4">
        <Button variant="outline" size="sm" onClick={() => navigate('/admin')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          {t('admin.detail.back')}
        </Button>
        <EmptyState icon={Bug} title={t('admin.detail.notFound')} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Nagłówek */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="truncate font-heading text-2xl font-bold uppercase italic tracking-tight">
              {user.displayName || user.email}
            </h1>
            <Badge variant={user.role === 'admin' ? 'default' : 'secondary'}>{user.role}</Badge>
            <Badge variant={user.status === 'suspended' ? 'destructive' : 'secondary'}>{user.status}</Badge>
          </div>
          <p className="text-sm text-muted-foreground">{user.email}</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => navigate('/admin')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          {t('admin.detail.back')}
        </Button>
      </div>

      {/* AKTYWNOŚĆ 30 DNI */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base font-heading font-bold uppercase italic tracking-tight">
            <BarChart3 className="h-4 w-4 text-primary" />
            {t('admin.detail.activity30')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {!hasTelemetry ? (
            <EmptyState icon={BarChart3} title={t('admin.detail.noTelemetry')} hint={t('admin.detail.noTelemetryHint')} />
          ) : (
            <>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={series}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-muted" />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 10 }}
                    className="fill-muted-foreground"
                    tickFormatter={(value: string) => value.slice(5)}
                    interval={4}
                  />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11 }} width={24} className="fill-muted-foreground" />
                  <Tooltip cursor={{ fill: 'hsl(var(--primary) / 0.08)' }} contentStyle={{ background: 'hsl(var(--card))', border: 'none', borderRadius: 8 }} />
                  <Bar dataKey="screens" name={t('admin.detail.screens')} fill="hsl(var(--primary) / 0.35)" stroke="hsl(var(--primary))" strokeWidth={1} radius={[4, 4, 0, 0]} />
                  <Bar dataKey="workouts" name={t('admin.detail.workouts')} fill="hsl(var(--chart-2))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <div><p className="text-xl font-bold tabular-nums">{summary?.activeDays7 ?? '—'}</p><p className="text-xs text-muted-foreground">{t('admin.detail.days7')}</p></div>
                <div><p className="text-xl font-bold tabular-nums">{summary?.activeDays30 ?? '—'}</p><p className="text-xs text-muted-foreground">{t('admin.detail.days30')}</p></div>
                <div><p className="text-xl font-bold tabular-nums">{summary?.workouts7 ?? '—'}</p><p className="text-xs text-muted-foreground">{t('admin.detail.workouts7')}</p></div>
                <div><p className="text-xl font-bold tabular-nums">{summary?.workouts30 ?? '—'}</p><p className="text-xs text-muted-foreground">{t('admin.detail.workouts30')}</p></div>
              </div>
              <p className="text-xs text-muted-foreground">
                {t('admin.detail.lastActive', { date: summary?.lastActiveAt || '—' })} · {t(`admin.activity.${badge}` as TranslationKey)}
              </p>
            </>
          )}
        </CardContent>
      </Card>

      {/* CO KLIKA */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base font-heading font-bold uppercase italic tracking-tight">
            <MousePointerClick className="h-4 w-4 text-primary" />
            {t('admin.detail.whatClicks')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!hasTelemetry ? (
            <EmptyState icon={MousePointerClick} title={t('admin.detail.noTelemetry')} />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <p className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">{t('admin.detail.topScreens')}</p>
                <div className="space-y-1.5">
                  {topScreens.map((entry) => (
                    <div key={entry.key} className="flex items-center justify-between text-sm">
                      <span>{counterLabel(entry.key)}</span>
                      <span className="font-bold tabular-nums">{entry.count}</span>
                    </div>
                  ))}
                  {topScreens.length === 0 && <p className="text-xs text-muted-foreground">—</p>}
                </div>
              </div>
              <div>
                <p className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">{t('admin.detail.topActions')}</p>
                <div className="space-y-1.5">
                  {topActions.map((entry) => (
                    <div key={entry.key} className="flex items-center justify-between text-sm">
                      <span>{counterLabel(entry.key)}</span>
                      <span className="font-bold tabular-nums">{entry.count}</span>
                    </div>
                  ))}
                  {topActions.length === 0 && <p className="text-xs text-muted-foreground">—</p>}
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* PLAN TRENINGOWY */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base font-heading font-bold uppercase italic tracking-tight">
            <Dumbbell className="h-4 w-4 text-primary" />
            {t('admin.plan')}
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium">
              {plan && plan !== 'missing'
                ? t('admin.planDays', { days: plan.dayCount, weeks: plan.durationWeeks || '--' })
                : t('admin.noPlan')}
            </p>
            <p className="text-xs text-muted-foreground">
              {t('admin.start', { date: (plan && plan !== 'missing' && plan.startDate) || t('admin.none') })}
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={() => navigate(`/admin/plans/${user.uid}`)}>
            <Dumbbell className="mr-1.5 h-4 w-4" />
            {t('admin.editPlan')}
          </Button>
        </CardContent>
      </Card>

      {/* UPRAWNIENIA */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-heading font-bold uppercase italic tracking-tight">
            {t('admin.detail.permissions')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">{user.accessEnabled ? t('admin.accessActive') : t('admin.accessDisabled')}</p>
              <p className="text-xs text-muted-foreground">{t('admin.accessBackendNote', { status: user.status })}</p>
            </div>
            <Switch
              checked={user.accessEnabled}
              onCheckedChange={(checked) => void actions.toggleAccess(user.uid, checked)}
              disabled={user.role === 'admin'}
            />
          </div>
          {AVAILABLE_FEATURES.map((feat) => (
            <div key={feat.key} className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">{feat.label}</p>
                <p className="text-xs text-muted-foreground">{feat.key === 'strava' ? t('admin.featStravaDesc') : feat.description}</p>
              </div>
              <Switch
                checked={user.features[feat.key] ?? user.role === 'admin'}
                onCheckedChange={(checked) => void actions.toggleFeature(user.uid, feat.key, checked)}
                disabled={user.role === 'admin'}
              />
            </div>
          ))}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">{t('admin.detail.suspend')}</p>
              <p className="text-xs text-muted-foreground">{t('admin.detail.suspendHint')}</p>
            </div>
            <Switch
              checked={user.status === 'suspended'}
              onCheckedChange={(checked) => void actions.applySuspended(user.uid, checked)}
              disabled={user.role === 'admin'}
            />
          </div>
        </CardContent>
      </Card>

      {/* NAPRAWY KONTA (Z102): dry-run -> apply z backupem po stronie Functions. */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base font-heading font-bold uppercase italic tracking-tight">
            <Wrench className="h-4 w-4 text-primary" />
            {t('admin.repair.title')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {repairToast && <p className="rounded-lg bg-muted/30 p-2 text-xs">{repairToast}</p>}
          {REPAIR_ACTIONS.map(({ action, titleKey, descKey }) => {
            const preview = dryRunResults[action];
            return (
              <div key={action} className="rounded-lg bg-muted/20 p-3 space-y-2">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium">{t(titleKey)}</p>
                    <p className="text-xs text-muted-foreground">{t(descKey)}</p>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <Button variant="outline" size="sm" disabled={repairBusy !== null} onClick={() => void callRepair(action, true)}>
                      {repairBusy === action ? <Loader2 className="h-4 w-4 animate-spin" /> : t('admin.repair.dryRun')}
                    </Button>
                    <Button
                      size="sm"
                      disabled={repairBusy !== null || !preview || preview.length === 0}
                      onClick={() => setConfirmRepair(action)}
                    >
                      {t('admin.repair.apply')}
                    </Button>
                  </div>
                </div>
                {preview && (
                  preview.length === 0
                    ? <p className="text-xs text-fitness-success">{t('admin.repair.nothing')}</p>
                    : (
                      <ul className="space-y-0.5 text-xs text-muted-foreground">
                        {formatRepairOperations(preview).slice(0, 20).map((line, index) => (
                          <li key={index} className="break-all">{line}</li>
                        ))}
                        {preview.length > 20 && <li>… +{preview.length - 20}</li>}
                      </ul>
                    )
                )}
              </div>
            );
          })}
          <ConfirmDialog
            open={confirmRepair !== null}
            onOpenChange={(open) => { if (!open) setConfirmRepair(null); }}
            title={t('admin.repair.confirmTitle')}
            description={t('admin.repair.confirmDesc', { n: confirmRepair ? (dryRunResults[confirmRepair]?.length ?? 0) : 0 })}
            confirmLabel={t('admin.repair.apply')}
            onConfirm={() => {
              const action = confirmRepair;
              setConfirmRepair(null);
              if (action) void callRepair(action, false);
            }}
          />
        </CardContent>
      </Card>

      {/* BŁĘDY KLIENTA */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base font-heading font-bold uppercase italic tracking-tight">
            <Bug className="h-4 w-4 text-primary" />
            {t('admin.detail.clientErrors')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {(errors ?? []).map((row) => (
            <div key={row.id} className="rounded-lg bg-muted/20 p-3 text-sm">
              <div className="flex items-center justify-between gap-3">
                <p className="font-medium">{row.code} · {row.phase}</p>
                <span className="text-xs text-muted-foreground">
                  {row.createdAt ? new Date(row.createdAt).toLocaleString(dateLocale(lang)) : '—'}
                </span>
              </div>
              {row.detail && <p className="mt-1 break-all text-xs text-muted-foreground">{row.detail}</p>}
              <p className="mt-0.5 text-xs text-muted-foreground">{row.platform ?? '—'} · v{row.appVersion ?? '—'}</p>
            </div>
          ))}
          {(errors ?? []).length === 0 && (
            <p className="text-sm text-muted-foreground">{t('admin.detail.noErrors')}</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminUserDetail;
