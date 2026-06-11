import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Capacitor } from '@capacitor/core';
import { Purchases, type PurchasesPackage } from '@revenuecat/purchases-capacitor';
import { ArrowLeft, Check, Crown, Loader2, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useTranslation } from '@/contexts/LanguageContext';
import { useSubscription } from '@/hooks/useSubscription';
import { PRO_ENTITLEMENT } from '@/lib/purchases';
import { useToast } from '@/hooks/use-toast';

// Paywall PRO. Wymogi App Review 3.1.2: widoczna cena i okres, długość trialu,
// informacja o automatycznym odnowieniu, restore purchases, linki do Terms i Privacy.
// Ceny zawsze z RC Offerings (lokalizowane przez App Store) — zero cen na sztywno.

const LEGAL_BASE = 'https://strengthsave.app/legal';

type PlanKey = 'yearly' | 'monthly';

export default function Paywall() {
  const { t, lang } = useTranslation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { isPro, refresh } = useSubscription();
  const isNative = Capacitor.isNativePlatform();

  const [packages, setPackages] = useState<Record<PlanKey, PurchasesPackage | null>>({ yearly: null, monthly: null });
  const [loading, setLoading] = useState(isNative);
  const [loadError, setLoadError] = useState(false);
  const [selected, setSelected] = useState<PlanKey>('yearly');
  const [busy, setBusy] = useState(false);

  const loadOfferings = useCallback(async () => {
    if (!isNative) return;
    setLoading(true);
    setLoadError(false);
    try {
      const { current } = await Purchases.getOfferings();
      const all = current?.availablePackages ?? [];
      const yearly = all.find(p => p.packageType === 'ANNUAL' || p.product.identifier.includes('yearly')) ?? null;
      const monthly = all.find(p => p.packageType === 'MONTHLY' || p.product.identifier.includes('monthly')) ?? null;
      setPackages({ yearly, monthly });
      if (!yearly && !monthly) setLoadError(true);
    } catch {
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, [isNative]);

  useEffect(() => { void loadOfferings(); }, [loadOfferings]);

  // PRO aktywne (zakup/restore/comp) — paywall nie ma już nic do sprzedania.
  useEffect(() => {
    if (isPro) navigate('/', { replace: true });
  }, [isPro, navigate]);

  const trialDays: Record<PlanKey, number> = { yearly: 30, monthly: 14 };

  const handlePurchase = async () => {
    const pkg = packages[selected];
    if (!pkg || busy) return;
    setBusy(true);
    try {
      const { customerInfo } = await Purchases.purchasePackage({ aPackage: pkg });
      if (customerInfo.entitlements.active[PRO_ENTITLEMENT]) {
        await refresh();
        navigate('/', { replace: true });
      }
    } catch (error) {
      const cancelled = typeof error === 'object' && error !== null
        && 'userCancelled' in error && (error as { userCancelled?: boolean }).userCancelled;
      if (!cancelled) {
        toast({ title: t('paywall.purchaseError'), variant: 'destructive' });
      }
    } finally {
      setBusy(false);
    }
  };

  const handleRestore = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const { customerInfo } = await Purchases.restorePurchases();
      if (customerInfo.entitlements.active[PRO_ENTITLEMENT]) {
        await refresh();
        toast({ title: t('paywall.restored') });
        navigate('/', { replace: true });
      } else {
        toast({ title: t('paywall.restoreNone') });
      }
    } catch {
      toast({ title: t('paywall.purchaseError'), variant: 'destructive' });
    } finally {
      setBusy(false);
    }
  };

  const features = useMemo(() => ([
    t('paywall.feature1'),
    t('paywall.feature2'),
    t('paywall.feature3'),
    t('paywall.feature4'),
  ]), [t]);

  const selectedPkg = packages[selected];
  const legalLang = lang === 'pl' ? '-pl' : '';

  const PlanCard = ({ plan }: { plan: PlanKey }) => {
    const pkg = packages[plan];
    const isSelected = selected === plan;
    return (
      <button
        type="button"
        onClick={() => setSelected(plan)}
        aria-pressed={isSelected}
        className={cn(
          'w-full rounded-2xl border-2 p-4 text-left transition-colors',
          isSelected ? 'border-primary bg-primary/[0.06]' : 'border-border bg-card'
        )}
      >
        <div className="flex items-center justify-between gap-2">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-heading text-sm font-bold uppercase tracking-wide">
                {t(plan === 'yearly' ? 'paywall.yearly' : 'paywall.monthly')}
              </span>
              {plan === 'yearly' && (
                <span className="rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-primary-foreground">
                  {t('paywall.badgeBestValue')}
                </span>
              )}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {t('paywall.trialLine', { days: trialDays[plan] })}
            </p>
          </div>
          <div className="text-right">
            <div className="font-heading text-lg font-bold">
              {pkg ? pkg.product.priceString : '—'}
            </div>
            <div className="text-[11px] text-muted-foreground">
              {t(plan === 'yearly' ? 'paywall.perYear' : 'paywall.perMonth')}
            </div>
          </div>
        </div>
      </button>
    );
  };

  return (
    <div className="min-h-screen bg-background pb-[calc(2rem+env(safe-area-inset-bottom))]">
      <div className="mx-auto max-w-md px-5 pt-[calc(1rem+env(safe-area-inset-top))]">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="rounded-2xl bg-muted/60" aria-label={t('workout.close')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>

        <div className="mt-4 flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/15 text-primary">
            <Crown className="h-6 w-6" />
          </div>
          <div>
            <h1 className="font-heading text-2xl font-black uppercase tracking-tight">{t('paywall.title')}</h1>
            <p className="text-sm text-muted-foreground">{t('paywall.subtitle')}</p>
          </div>
        </div>

        <ul className="mt-6 space-y-2.5">
          {features.map(f => (
            <li key={f} className="flex items-start gap-2.5 text-sm">
              <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <span>{f}</span>
            </li>
          ))}
        </ul>

        {!isNative ? (
          <div className="mt-8 rounded-2xl border bg-card p-4 text-sm text-muted-foreground">
            {t('paywall.webNote')}
          </div>
        ) : loading ? (
          <div className="mt-10 flex justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
        ) : loadError ? (
          <div className="mt-8 rounded-2xl border bg-card p-4 text-center">
            <p className="text-sm text-muted-foreground">{t('paywall.loadError')}</p>
            <Button variant="outline" size="sm" className="mt-3" onClick={() => void loadOfferings()}>
              <RefreshCw className="mr-1.5 h-3.5 w-3.5" />{t('paywall.retry')}
            </Button>
          </div>
        ) : (
          <>
            <div className="mt-7 space-y-3">
              <PlanCard plan="yearly" />
              <PlanCard plan="monthly" />
            </div>

            <Button
              className="mt-5 h-14 w-full rounded-2xl py-4 font-heading font-bold uppercase tracking-wide"
              disabled={!selectedPkg || busy}
              onClick={() => void handlePurchase()}
            >
              {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : t('paywall.cta', { days: trialDays[selected] })}
            </Button>

            {/* Wymóg App Review: jasne warunki odnowienia przy CTA. */}
            <p className="mt-3 text-center text-[11px] leading-relaxed text-muted-foreground">
              {selectedPkg && t('paywall.renewalNote', {
                days: trialDays[selected],
                price: selectedPkg.product.priceString,
                period: t(selected === 'yearly' ? 'paywall.periodYear' : 'paywall.periodMonth'),
              })}
            </p>
          </>
        )}

        <div className="mt-6 flex items-center justify-center gap-4 text-xs text-muted-foreground">
          {isNative && (
            <button onClick={() => void handleRestore()} disabled={busy} className="underline underline-offset-2">
              {t('paywall.restore')}
            </button>
          )}
          <a href={`${LEGAL_BASE}/terms${legalLang}.html`} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">
            {t('paywall.terms')}
          </a>
          <a href={`${LEGAL_BASE}/privacy${legalLang}.html`} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">
            {t('paywall.privacy')}
          </a>
        </div>
      </div>
    </div>
  );
}
