import { useEffect, useState } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Loader2, ShieldCheck } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useTranslation } from '@/contexts/LanguageContext';
import { adminSetCostGuard } from '@/lib/registration-api';

// Bezpiecznik kosztów (docs/COST-GUARDS.md). Stan w config/cost_guard pisze
// wyłącznie backend (listener budżetu, callable adminSetCostGuard z audytem);
// admin czyta go tutaj i przełącza przez callable.

interface CostGuardView {
  paused: boolean;
  reason: string | null;
  costAmount: number | null;
  budgetAmount: number | null;
  currencyCode: string | null;
  ratio: number | null;
  at: string | null;
}

const num = (value: unknown): number | null => (typeof value === 'number' && Number.isFinite(value) ? value : null);
const str = (value: unknown): string | null => (typeof value === 'string' ? value : null);

const toView = (data: Record<string, unknown> | undefined): CostGuardView => ({
  paused: data?.paused === true,
  reason: str(data?.reason),
  costAmount: num(data?.costAmount),
  budgetAmount: num(data?.budgetAmount),
  currencyCode: str(data?.currencyCode),
  ratio: num(data?.ratio),
  at: str(data?.at),
});

const money = (amount: number | null, currency: string | null) => (
  amount === null ? '?' : `${amount.toFixed(2)} ${currency ?? ''}`.trim()
);

const COST_GUARD_DOC = doc(db, 'config', 'cost_guard');

export const AdminCostGuardCard = () => {
  const { toast } = useToast();
  const { t } = useTranslation();
  const [view, setView] = useState<CostGuardView | null>(null);
  const [readFailed, setReadFailed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getDoc(COST_GUARD_DOC)
      .then((snap) => setView(toView(snap.exists() ? (snap.data() as Record<string, unknown>) : undefined)))
      .catch(() => setReadFailed(true))
      .finally(() => setLoading(false));
  }, []);

  const setPaused = async (paused: boolean) => {
    setSaving(true);
    try {
      await adminSetCostGuard(paused);
      setReadFailed(false);
      setView((prev) => ({
        ...(prev ?? toView(undefined)),
        paused,
        reason: paused ? 'admin-pause' : 'admin-resume',
        at: new Date().toISOString(),
      }));
    } catch (e) {
      toast({
        title: t('admin.errorTitle'),
        description: e instanceof Error ? e.message : t('admin.costGuard.saveFailed'),
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const reasonLabel = (reason: string | null) => {
    if (reason === 'budget-threshold') return t('admin.costGuard.reasonBudget');
    if (reason === 'admin-pause') return t('admin.costGuard.reasonAdmin');
    return t('admin.costGuard.reasonOther');
  };

  const percent = view?.ratio === null || view?.ratio === undefined ? '?' : `${Math.round(view.ratio * 100)}%`;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base font-heading font-bold uppercase tracking-tight">
          <ShieldCheck className="h-4 w-4 text-primary" /> {t('admin.costGuard.title')}
        </CardTitle>
        <CardDescription>{t('admin.costGuard.desc')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {loading ? (
          <div className="flex justify-center py-4"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
        ) : readFailed ? (
          <div className="space-y-2">
            <p className="text-sm text-fitness-warning">{t('admin.costGuard.readFailed')}</p>
            <Button variant="outline" size="sm" disabled={saving} onClick={() => setPaused(false)}>
              {t('admin.costGuard.forceResume')}
            </Button>
          </div>
        ) : (
          <>
            {view?.paused && (
              <div
                role="alert"
                className="flex gap-2 rounded-lg border border-fitness-warning bg-fitness-warning/10 p-3 text-sm text-fitness-warning"
              >
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                <div className="min-w-0 space-y-1">
                  <p className="font-medium">{t('admin.costGuard.pausedBanner')}</p>
                  <p>{reasonLabel(view.reason)}</p>
                  {view.costAmount !== null && (
                    <p>
                      {t('admin.costGuard.costLine', {
                        cost: money(view.costAmount, view.currencyCode),
                        budget: money(view.budgetAmount, view.currencyCode),
                        percent,
                      })}
                    </p>
                  )}
                  {view.at && <p className="text-xs opacity-80">{t('admin.costGuard.since', { at: view.at.slice(0, 16).replace('T', ' ') })}</p>}
                </div>
              </div>
            )}
            <div className="flex items-center justify-between gap-3 rounded-lg bg-surface-low p-3">
              <div className="min-w-0">
                <p className="text-sm font-medium">{t('admin.costGuard.switchLabel')}</p>
                <p className="text-xs text-muted-foreground">{t('admin.costGuard.switchDesc')}</p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                {saving && <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />}
                <Switch
                  checked={!view?.paused}
                  disabled={saving}
                  onCheckedChange={(active) => setPaused(!active)}
                  aria-label={t('admin.costGuard.switchLabel')}
                />
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};
