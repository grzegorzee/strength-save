import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { RefreshCw, Loader2, Wrench, ChevronDown } from 'lucide-react';
import { useCurrentUser } from '@/contexts/UserContext';
import { useFirebaseWorkouts } from '@/hooks/useFirebaseWorkouts';
import { usePlanCycles } from '@/hooks/usePlanCycles';
import { useToast } from '@/hooks/use-toast';
import { useTranslation } from '@/contexts/LanguageContext';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { DataRepairTools } from '@/components/DataManagement';

/**
 * X35b (WP-B): narzędzia naprawcze (Z52/Z90.4) przeniesione z dawnej strony
 * /settings do panelu admina. Operują na KONCIE ZALOGOWANEGO ADMINA (jak dotąd),
 * nie na cudzych danych: merge cykli + czyszczenie duplikatów + backfill nazw.
 */
export const AdminRepairToolsCard = () => {
  const { uid } = useCurrentUser();
  const { workouts, isLoaded: workoutsLoaded, cleanupEmptyWorkouts, backfillHistoricalWorkouts } = useFirebaseWorkouts(uid);
  const { cycles, mergeContinuousCycles } = usePlanCycles(uid);
  const { toast } = useToast();
  const { t } = useTranslation();
  const [mergingCycles, setMergingCycles] = useState(false);
  const [mergeConfirmOpen, setMergeConfirmOpen] = useState(false);

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

  return (
    <Card data-testid="admin-repair-tools">
      <Collapsible>
        <CollapsibleTrigger asChild>
          <button type="button" className="w-full text-left">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center justify-between gap-2 text-base font-heading font-bold uppercase tracking-tight">
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
            {/* disabled do zaladowania workouts: merge na pustej liscie remapowalby zero treningow, a cykle i tak by skasowal */}
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
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
};
