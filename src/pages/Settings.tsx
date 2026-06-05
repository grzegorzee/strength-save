import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Link2, Unlink, RefreshCw, Loader2, Clock, Shield, Users, RotateCcw } from 'lucide-react';
import { useCurrentUser } from '@/contexts/UserContext';
import { useStrava } from '@/hooks/useStrava';
import { useToast } from '@/hooks/use-toast';
import { doc, updateDoc, collection, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { SyncCenterCard } from '@/components/SyncCenterCard';
import { DataManagement } from '@/components/DataManagement';
import { useFirebaseWorkouts } from '@/hooks/useFirebaseWorkouts';
import { usePlanCycles } from '@/hooks/usePlanCycles';
import { formatLocalDate } from '@/lib/utils';
import { useTranslation } from '@/contexts/LanguageContext';

const SUMMARY_HOUR_KEY = 'summary-hour';

const AVAILABLE_FEATURES = [
  { key: 'strava', label: 'Strava', description: 'Integracja ze Stravą (aktywności, wykresy, analityka)' },
] as const;

type FeatureKey = typeof AVAILABLE_FEATURES[number]['key'];

interface UserFeatureRow {
  uid: string;
  displayName: string;
  email: string;
  role: string;
  features: Record<string, boolean>;
}

const FeatureFlagsPanel = () => {
  const [users, setUsers] = useState<UserFeatureRow[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const { t } = useTranslation();

  const loadUsers = useCallback(async () => {
    setLoading(true);
    try {
      const snap = await getDocs(collection(db, 'users'));
      const rows: UserFeatureRow[] = [];
      snap.forEach((d) => {
        const data = d.data();
        rows.push({
          uid: d.id,
          displayName: data.displayName || data.email || d.id,
          email: data.email || '',
          role: data.role || 'user',
          features: data.features || {},
        });
      });
      rows.sort((a, b) => (a.role === 'admin' ? -1 : 1) - (b.role === 'admin' ? -1 : 1));
      setUsers(rows);
    } catch (err) {
      console.error('Failed to load users:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadUsers(); }, [loadUsers]);

  const toggleFeature = async (uid: string, feature: FeatureKey, enabled: boolean) => {
    try {
      const userRef = doc(db, 'users', uid);
      await updateDoc(userRef, { [`features.${feature}`]: enabled });
      setUsers(prev => prev.map(u =>
        u.uid === uid ? { ...u, features: { ...u.features, [feature]: enabled } } : u
      ));
      toast({ title: enabled ? t('settings.feature.enabled') : t('settings.feature.disabled'), description: t('settings.feature.forUser', { feature, user: users.find(u => u.uid === uid)?.displayName ?? uid }) });
    } catch (err) {
      toast({ title: t('settings.toast.error'), description: t('settings.toast.saveFailed'), variant: 'destructive' });
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8 flex justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-primary" />
          {t('settings.features.title')}
        </CardTitle>
        <CardDescription>
          {t('settings.features.description')}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 px-3 sm:px-6">
        {users.map(user => (
          <div key={user.uid} className="flex items-center justify-between gap-3 p-3 rounded-lg bg-muted/30">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium truncate">{user.displayName}</p>
                {user.role === 'admin' && (
                  <Badge variant="default" className="text-[10px] h-5 shrink-0">admin</Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground truncate">{user.email}</p>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              {AVAILABLE_FEATURES.map(feat => (
                <div key={feat.key} className="flex items-center gap-1.5">
                  <span className="text-xs text-muted-foreground hidden sm:inline">{feat.label}</span>
                  <Switch
                    checked={user.features[feat.key] ?? user.role === 'admin'}
                    onCheckedChange={(checked) => toggleFeature(user.uid, feat.key, checked)}
                  />
                </div>
              ))}
            </div>
          </div>
        ))}
        {users.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-4">{t('settings.features.noUsers')}</p>
        )}
      </CardContent>
    </Card>
  );
};

const Settings = () => {
  const navigate = useNavigate();
  const { uid, profile, isAdmin, canUseStrava } = useCurrentUser();
  const { workouts, exportData, importData, cleanupEmptyWorkouts, backfillHistoricalWorkouts } = useFirebaseWorkouts(uid);
  const { cycles, mergeContinuousCycles } = usePlanCycles(uid);
  const { connection, isSyncing, error, connectStrava, syncActivities, disconnectStrava } = useStrava(uid, canUseStrava);
  const { toast } = useToast();
  const { t } = useTranslation();

  const [summaryHour, setSummaryHour] = useState(() => {
    try {
      return localStorage.getItem(SUMMARY_HOUR_KEY) || '20';
    } catch {
      return '20';
    }
  });

  const handleSummaryHourChange = (value: string) => {
    setSummaryHour(value);
    try {
      localStorage.setItem(SUMMARY_HOUR_KEY, value);
    } catch {
      // ignore
    }
  };

  const [maxHRInput, setMaxHRInput] = useState('');
  const [maxHRSaving, setMaxHRSaving] = useState(false);
  const [isResettingOnboarding, setIsResettingOnboarding] = useState(false);
  const [mergingCycles, setMergingCycles] = useState(false);

  const handleMergeCycles = async () => {
    setMergingCycles(true);
    try {
      const n = await mergeContinuousCycles(workouts);
      toast(n > 0
        ? { title: t('settings.merge.done', { n }), description: t('settings.merge.doneDesc') }
        : { title: t('settings.merge.none'), description: t('settings.merge.noneDesc') });
    } catch {
      toast({ title: t('settings.toast.error'), description: t('settings.merge.error'), variant: 'destructive' });
    } finally {
      setMergingCycles(false);
    }
  };

  const handleSaveMaxHR = async () => {
    const value = parseInt(maxHRInput);
    if (isNaN(value) || value < 100 || value > 230) {
      toast({ title: t('settings.maxHR.invalid'), description: t('settings.maxHR.invalidDesc'), variant: 'destructive' });
      return;
    }
    setMaxHRSaving(true);
    try {
      await updateDoc(doc(db, 'users', uid), { estimatedMaxHR: value, maxHRManualOverride: true });
      toast({ title: t('settings.toast.saved'), description: t('settings.maxHR.saved', { value }) });
    } catch {
      toast({ title: t('settings.toast.error'), description: t('settings.toast.saveFailed'), variant: 'destructive' });
    } finally {
      setMaxHRSaving(false);
    }
  };

  const handleSync = async () => {
    const result = await syncActivities();
    if (!result.ok) {
      toast({ title: t('settings.sync.error'), description: result.message, variant: 'destructive' });
      return;
    }
    if (result.synced > 0) {
      toast({ title: t('settings.sync.done'), description: t('settings.sync.doneDesc', { synced: result.synced, total: result.totalFetched }) });
    } else if (result.totalFetched > 0) {
      toast({ title: t('settings.sync.noNew'), description: t('settings.sync.noNewDesc', { total: result.totalFetched }) });
    } else {
      toast({ title: t('settings.sync.empty'), description: t('settings.sync.emptyDesc', { days: result.lookbackDays }) });
    }
  };

  const handleDisconnect = async () => {
    await disconnectStrava();
    toast({ title: t('settings.strava.disconnected'), description: t('settings.strava.disconnectedDesc') });
  };

  const handleResetOnboarding = async () => {
    const confirmed = window.confirm(t('settings.reset.confirm'));
    if (!confirmed) return;

    setIsResettingOnboarding(true);
    try {
      const today = formatLocalDate(new Date());
      await Promise.all(
        cycles
          .filter(cycle => cycle.status === 'active')
          .map(cycle => updateDoc(doc(db, 'plan_cycles', cycle.id), {
            status: 'completed',
            endDate: today,
          })),
      );
      await updateDoc(doc(db, 'users', uid), {
        onboardingCompleted: false,
        onboarding: {
          state: 'in_progress',
          version: 2,
          resetAt: new Date().toISOString(),
        },
      });
      toast({
        title: t('settings.reset.done'),
        description: t('settings.reset.doneDesc'),
      });
    } catch (err) {
      toast({
        title: t('settings.reset.error'),
        description: err instanceof Error ? err.message : t('settings.toast.tryAgain'),
        variant: 'destructive',
      });
    } finally {
      setIsResettingOnboarding(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">{t('nav.settings')}</h1>
          <p className="text-muted-foreground text-sm">{profile?.email}</p>
        </div>
      </div>

      {/* Account info */}
      <Card>
        <CardHeader>
          <CardTitle>{t('profile.section.account')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm">{t('profile.nameLabel')}</span>
            <span className="font-medium">{profile?.displayName}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm">{t('login.email')}</span>
            <span className="font-medium">{profile?.email}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm">{t('settings.account.role')}</span>
            <Badge variant={profile?.role === 'admin' ? 'default' : 'secondary'}>
              {profile?.role || 'user'}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Weekly summary preference */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-primary" />
            {t('settings.summary.title')}
          </CardTitle>
          <CardDescription>
            {t('settings.summary.description')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <span className="text-sm">{t('settings.summary.hour')}</span>
            <Select value={summaryHour} onValueChange={handleSummaryHourChange}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Array.from({ length: 8 }, (_, i) => i + 16).map(h => (
                  <SelectItem key={h} value={String(h)}>
                    {String(h).padStart(2, '0')}:00
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <DataManagement
        onExport={exportData}
        onImport={importData}
        onCleanup={cleanupEmptyWorkouts}
        onRepair={() => backfillHistoricalWorkouts(cycles)}
        title={t('settings.backup.title')}
        description={t('settings.backup.description')}
        exportLabel={t('settings.backup.export')}
        importLabel={t('settings.backup.import')}
        cleanupLabel={t('settings.backup.cleanup')}
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <RefreshCw className="h-5 w-5 text-primary" />
            {t('settings.repairCycles.title')}
          </CardTitle>
          <CardDescription>
            {t('settings.repairCycles.description')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="outline" className="w-full" onClick={handleMergeCycles} disabled={mergingCycles}>
            {mergingCycles ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
            {t('settings.repairCycles.button')}
          </Button>
        </CardContent>
      </Card>

      <Card className="border-amber-500/30">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <RotateCcw className="h-5 w-5 text-amber-600" />
            {t('settings.resetPlan.title')}
          </CardTitle>
          <CardDescription>
            {t('settings.resetPlan.description')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            variant="outline"
            className="w-full border-amber-300 text-amber-700 hover:bg-amber-50"
            onClick={handleResetOnboarding}
            disabled={isResettingOnboarding}
          >
            {isResettingOnboarding ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <RotateCcw className="h-4 w-4 mr-2" />
            )}
            {t('settings.resetPlan.button')}
          </Button>
        </CardContent>
      </Card>

      {/* Strava integration — feature flag */}
      {canUseStrava && <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="#FC4C02">
              <path d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066m-7.008-5.599l2.836 5.598h4.172L10.463 0l-7 13.828h4.169" />
            </svg>
            Strava
          </CardTitle>
          <CardDescription>
            {t('settings.strava.description')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {connection.connected ? (
            <>
              <div className="flex items-center justify-between">
                <div>
                  <Badge className="bg-green-500/10 text-green-600 border-green-500/30">
                    {t('settings.strava.connected')}
                  </Badge>
                  {connection.athleteName && (
                    <p className="text-sm text-muted-foreground mt-1">{connection.athleteName}</p>
                  )}
                  {connection.lastSync && (
                    <p className="text-xs text-muted-foreground">
                      {t('settings.strava.lastSync', { date: new Date(connection.lastSync).toLocaleString('pl-PL') })}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={handleSync} disabled={isSyncing}>
                  {isSyncing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
                  {t('settings.strava.sync')}
                </Button>
                <Button variant="outline" className="text-destructive" onClick={handleDisconnect}>
                  <Unlink className="h-4 w-4 mr-2" />
                  {t('settings.strava.disconnect')}
                </Button>
              </div>

              {/* Max HR setting */}
              <div className="border-t pt-4">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <p className="text-sm font-medium">Max HR</p>
                    <p className="text-xs text-muted-foreground">
                      {connection.estimatedMaxHR
                        ? t('settings.maxHR.value', { value: connection.estimatedMaxHR, source: connection.maxHRManualOverride ? t('settings.maxHR.manual') : t('settings.maxHR.auto') })
                        : t('settings.maxHR.noData')
                      }
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Input
                    type="number"
                    placeholder={connection.estimatedMaxHR?.toString() || '185'}
                    min={100}
                    max={230}
                    value={maxHRInput}
                    onChange={(e) => setMaxHRInput(e.target.value)}
                    className="w-24"
                  />
                  <Button variant="outline" size="sm" onClick={handleSaveMaxHR} disabled={maxHRSaving || !maxHRInput}>
                    {maxHRSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : t('common.save')}
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <Button onClick={connectStrava} className="bg-[#FC4C02] hover:bg-[#FC4C02]/90">
              <Link2 className="h-4 w-4 mr-2" />
              {t('settings.strava.connect')}
            </Button>
          )}

          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}
        </CardContent>
      </Card>}

      {/* Sync Center */}
      <SyncCenterCard uid={uid} />

      {/* Feature Flags — admin only */}
      {isAdmin && <FeatureFlagsPanel />}
    </div>
  );
};

export default Settings;
