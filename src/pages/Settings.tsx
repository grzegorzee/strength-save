import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
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
import { Link2, Unlink, RefreshCw, Loader2, RotateCcw, Wrench, ChevronDown } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useSyncCenterEntries } from '@/hooks/useSyncCenterEntries';
import { useCurrentUser } from '@/contexts/UserContext';
import { trackTelemetryEvent } from '@/lib/app-telemetry';
import { NotificationSettings } from '@/components/NotificationSettings';
import { PlateInventorySettings } from '@/components/PlateCalculatorSheet';
import { useStrava } from '@/hooks/useStrava';
import { useToast } from '@/hooks/use-toast';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { SyncCenterCard } from '@/components/SyncCenterCard';
import { DataManagement, DataRepairTools } from '@/components/DataManagement';
import { useFirebaseWorkouts } from '@/hooks/useFirebaseWorkouts';
import { usePlanCycles } from '@/hooks/usePlanCycles';
import { useTrainingPlan } from '@/hooks/useTrainingPlan';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { useSearchParams } from 'react-router-dom';
import { formatLocalDate } from '@/lib/utils';
import { useTranslation } from '@/contexts/LanguageContext';
import { dateLocale } from '@/i18n';

const Settings = () => {
  const { uid, canUseStrava, isAdmin } = useCurrentUser();
  const { workouts, isLoaded: workoutsLoaded, exportData, importData, cleanupEmptyWorkouts, backfillHistoricalWorkouts } = useFirebaseWorkouts(uid);
  const { plan, isCustom, planDurationWeeks, planStartDate } = useTrainingPlan(uid);
  const { cycles, mergeContinuousCycles } = usePlanCycles(uid);
  const { connection, isSyncing, error, connectStrava, syncActivities, saveMaxHR, disconnectStrava } = useStrava(uid, canUseStrava);
  const { toast } = useToast();
  const { t, lang } = useTranslation();
  const syncEntries = useSyncCenterEntries(uid);

  const [maxHRInput, setMaxHRInput] = useState('');
  const [maxHRSaving, setMaxHRSaving] = useState(false);
  const [isResettingOnboarding, setIsResettingOnboarding] = useState(false);
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false);
  const [mergingCycles, setMergingCycles] = useState(false);
  const [mergeConfirmOpen, setMergeConfirmOpen] = useState(false);
  const [searchParams] = useSearchParams();

  // Linki z Profilu (?section=notifications|account|data) przewijają do właściwej sekcji.
  useEffect(() => {
    const section = searchParams.get('section');
    if (!section) return;
    const el = document.getElementById(`settings-${section}`);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [searchParams]);

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
      // Rules blokują estimatedMaxHR/maxHRManualOverride w bezpośrednim update
      // profilu — zapis idzie przez callable saveMaxHR (admin SDK).
      const result = await saveMaxHR(value);
      if (!result.ok) {
        throw new Error(result.message);
      }
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
      <div>
        <h1 className="text-2xl font-heading font-bold uppercase italic tracking-tight">{t('nav.settings')}</h1>
        {/* Kryterium podziału (Z81): Ustawienia = dane i integracje; kim jestem i jak apka
            się zachowuje mieszka w Profilu. Karta "Konto" read-only usunięta (duplikat Profilu). */}
        <p className="text-muted-foreground text-sm">{t('settings.subtitle')}</p>
      </div>

      <div id="settings-notifications" className="scroll-mt-20">
        <NotificationSettings />
      </div>

      {/* Kalkulator talerzy (Z107): inwentarz per urządzenie */}
      <PlateInventorySettings />

      <div id="settings-data" className="scroll-mt-20">
      <DataManagement
        onExport={() => {
          trackTelemetryEvent(uid, 'action_export_data');
          return exportData({
          trainingPlan: isCustom
            ? { days: plan, durationWeeks: planDurationWeeks, ...(planStartDate ? { startDate: planStartDate } : {}) }
            : undefined,
          planCycles: cycles,
          });
        }}
        onImport={importData}
        existingWorkoutIds={workouts.map((w) => w.id)}
        disabled={!workoutsLoaded}
        title={t('settings.backup.title')}
        description={t('settings.backup.description')}
        exportLabel={t('settings.backup.export')}
        importLabel={t('settings.backup.import')}
      />
      </div>

      {/* Narzędzia naprawcze (Z52): domyślnie zwinięte. Z90.4: widzi je tylko admin —
          przyciski destrukcyjne to sygnał "apka się psuje"; po X12A potrzeba napraw spada
          do zera. Eksport/Import (wyżej) zostaje dla wszystkich. */}
      {isAdmin && (
      <Card>
        <Collapsible>
          <CollapsibleTrigger asChild>
            <button type="button" className="w-full text-left">
              <CardHeader>
                <CardTitle className="text-lg flex items-center justify-between gap-2">
                  <span className="flex items-center gap-2">
                    <Wrench className="h-5 w-5 text-primary" />
                    {t('settings.tools.title')}
                  </span>
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                </CardTitle>
                <CardDescription>
                  {t('settings.tools.hint')}
                </CardDescription>
              </CardHeader>
            </button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="space-y-3">
              {/* disabled do załadowania workouts: merge na pustej liście remapowałby zero treningów, a cykle i tak by skasował */}
              <div>
                <p className="text-sm font-medium mb-1">{t('settings.repairCycles.title')}</p>
                <p className="text-xs text-muted-foreground mb-2">{t('settings.repairCycles.description')}</p>
                <Button variant="outline" className="w-full" onClick={() => setMergeConfirmOpen(true)} disabled={mergingCycles || !workoutsLoaded}>
                  {mergingCycles ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
                  {t('settings.repairCycles.button')}
                </Button>
                <ConfirmDialog
                  open={mergeConfirmOpen}
                  onOpenChange={setMergeConfirmOpen}
                  title={t('settings.repairCycles.title')}
                  description={t('settings.merge.confirmDesc')}
                  confirmLabel={t('settings.repairCycles.button')}
                  onConfirm={() => void handleMergeCycles()}
                />
              </div>

              <DataRepairTools
                onCleanup={cleanupEmptyWorkouts}
                onRepair={() => backfillHistoricalWorkouts(cycles)}
                cleanupLabel={t('settings.backup.cleanup')}
                disabled={!workoutsLoaded}
              />

              <div>
                <p className="text-sm font-medium mb-1">{t('settings.resetPlan.title')}</p>
                <p className="text-xs text-muted-foreground mb-2">{t('settings.resetPlan.description')}</p>
                <Button
                  variant="outline"
                  className="w-full border-fitness-warning text-fitness-warning hover:bg-fitness-warning/10"
                  onClick={() => setResetConfirmOpen(true)}
                  disabled={isResettingOnboarding}
                >
                  {isResettingOnboarding ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <RotateCcw className="h-4 w-4 mr-2" />
                  )}
                  {t('settings.resetPlan.button')}
                </Button>
              </div>
            </CardContent>
          </CollapsibleContent>
        </Collapsible>
      </Card>
      )}

      <AlertDialog open={resetConfirmOpen} onOpenChange={setResetConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('settings.resetPlan.title')}</AlertDialogTitle>
            <AlertDialogDescription>{t('settings.reset.confirm')}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isResettingOnboarding}>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={(event) => { event.preventDefault(); setResetConfirmOpen(false); void handleResetOnboarding(); }} disabled={isResettingOnboarding}>
              {t('settings.resetPlan.button')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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
                  <Badge className="bg-fitness-success/10 text-green-600 border-fitness-success/30">
                    {t('settings.strava.connected')}
                  </Badge>
                  {connection.athleteName && (
                    <p className="text-sm text-muted-foreground mt-1">{connection.athleteName}</p>
                  )}
                  {connection.lastSync && (
                    <p className="text-xs text-muted-foreground">
                      {t('settings.strava.lastSync', { date: new Date(connection.lastSync).toLocaleString(dateLocale(lang)) })}
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
                    aria-label="Max HR"
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

      {/* Sync Center — tylko przy zaległościach (Z52); zdrowy user nie widzi pustej karty. */}
      {syncEntries.listedEntries.length > 0 && <SyncCenterCard uid={uid} />}

    </div>
  );
};

export default Settings;
