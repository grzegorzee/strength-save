import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Capacitor } from '@capacitor/core';
import { Purchases, type PurchasesPackage } from '@revenuecat/purchases-capacitor';
import { signOut } from 'firebase/auth';
import { ArrowLeft, Check, Crown, Loader2, RefreshCw, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { auth } from '@/lib/firebase';
import { useTranslation } from '@/contexts/LanguageContext';
import { useCurrentUser } from '@/contexts/UserContext';
import { useSubscription } from '@/hooks/useSubscription';
import { useHardPaywall } from '@/hooks/useHardPaywall';
import { useTrainingPlan } from '@/hooks/useTrainingPlan';
import { localizeFocus } from '@/lib/plan-i18n';
import { PRO_ENTITLEMENT } from '@/lib/purchases';
import { useToast } from '@/hooks/use-toast';

// Paywall PRO. Wymogi App Review 3.1.2: widoczna cena i okres, długość trialu,
// informacja o automatycznym odnowieniu, restore purchases, linki do Terms i Privacy.
// Ceny zawsze z RC Offerings (lokalizowane przez App Store) — zero cen na sztywno.
//
// Tryb hard (onboarding, wariant B): świeży user bez PRO i bez treningów trafia tu
// zaraz po wizardzie — najpierw teaser "Twój plan jest gotowy" (zamglone ćwiczenia),
// potem cennik BEZ strzałki wstecz; jedyna ucieczka to "Wyloguj". Po zakupie/trialu
// dashboard z confetti (/?welcome=1).

const LEGAL_BASE = 'https://strengthsave.app/legal';

type PlanKey = 'yearly' | 'monthly';

export default function Paywall() {
  const { t, lang } = useTranslation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { uid } = useCurrentUser();
  const { isPro, refresh } = useSubscription();
  const hardStatus = useHardPaywall();
  const hard = hardStatus === 'enforced';
  // Zakup zmienia hardStatus na 'off' zanim odpali się redirect — zapamiętaj tryb,
  // żeby świeży user dostał confetti (/?welcome=1), a nie goły dashboard.
  const wasHard = useRef(false);
  if (hard) wasHard.current = true;
  const successRoute = () => (wasHard.current ? '/?welcome=1' : '/');
  const { plan, planDurationWeeks } = useTrainingPlan(uid);
  const isNative = Capacitor.isNativePlatform();

  const [packages, setPackages] = useState<Record<PlanKey, PurchasesPackage | null>>({ yearly: null, monthly: null });
  const [loading, setLoading] = useState(isNative);
  const [loadError, setLoadError] = useState(false);
  const [selected, setSelected] = useState<PlanKey>('yearly');
  const [busy, setBusy] = useState(false);
  const [teaserDismissed, setTeaserDismissed] = useState(false);

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
    if (isPro) navigate(wasHard.current ? '/?welcome=1' : '/', { replace: true });
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
        navigate(successRoute(), { replace: true });
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
        navigate(successRoute(), { replace: true });
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

  // Guard jeszcze ustala stan (subskrypcja / treningi) — nie migaj cennikiem ani teaserem.
  if (hardStatus === 'pending') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Onboarding (hard mode), krok 1: teaser świeżo ułożonego planu z zamglonymi ćwiczeniami.
  if (hard && !teaserDismissed) {
    return (
      <div className="min-h-screen bg-background">
        <div className="mx-auto flex min-h-screen max-w-md flex-col px-5 pb-[calc(1.5rem+env(safe-area-inset-bottom))] pt-[calc(2.5rem+env(safe-area-inset-top))]">
          <p className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-widest text-primary">
            <Sparkles className="h-3.5 w-3.5" />{t('paywall.teaser.kicker')}
          </p>
          <h1 className="mt-2 font-heading text-4xl font-black leading-tight tracking-tight">{t('paywall.teaser.title')}</h1>
          <p className="mt-2 text-sm text-muted-foreground">{t('paywall.teaser.subtitle')}</p>

          <div className="mt-5 grid grid-cols-2 gap-3">
            <div className="rounded-2xl bg-surface-low p-4">
              <p className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground">{t('ob.precision.duration')}</p>
              <p className="mt-1 font-heading text-2xl font-bold">
                <span className="text-fitness-cyan">{planDurationWeeks}</span>{' '}
                <span className="font-sans text-sm font-medium text-muted-foreground">{t('ob.precision.weeks')}</span>
              </p>
            </div>
            <div className="rounded-2xl bg-surface-low p-4">
              <p className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground">{t('ob.precision.frequency')}</p>
              <p className="mt-1 font-heading text-2xl font-bold">
                <span className="text-primary">{plan.length}</span>{' '}
                <span className="font-sans text-sm font-medium text-muted-foreground">{t('ob.precision.daysWk')}</span>
              </p>
            </div>
          </div>

          <div className="relative mt-3 flex-1 overflow-hidden rounded-2xl bg-surface-low p-4">
            <div className="space-y-3.5">
              {plan.map((d, i) => (
                <div key={d.id}>
                  <div className="flex gap-2 text-[13px]">
                    <span className="font-bold tabular-nums text-fitness-cyan">{String(i + 1).padStart(2, '0')}</span>
                    <span className="font-medium">{localizeFocus(d.focus, lang)}</span>
                    <span className="text-muted-foreground">· {d.exercises.length} {t('ob.precision.exercises')}</span>
                  </div>
                  {/* Ćwiczenia celowo zamglone — pełną treść odsłania trial. */}
                  <div className="mt-1 select-none space-y-0.5 pl-7 blur-[5px]" aria-hidden>
                    {d.exercises.slice(0, 3).map(e => (
                      <p key={e.id} className="text-[12px] text-muted-foreground">{e.name}</p>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-background to-transparent" />
          </div>

          <Button
            className="mt-5 h-14 w-full rounded-2xl py-4 font-heading font-bold uppercase tracking-wide"
            onClick={() => setTeaserDismissed(true)}
          >
            {t('paywall.teaser.cta')}
          </Button>
          <button onClick={() => void signOut(auth)} className="mt-4 text-center text-xs text-muted-foreground underline underline-offset-2">
            {t('paywall.logout')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-[calc(2rem+env(safe-area-inset-bottom))]">
      <div className="mx-auto max-w-md px-5 pt-[calc(1rem+env(safe-area-inset-top))]">
        {/* Hard mode (onboarding): bez strzałki wstecz — nie ma "obejrzę sobie apkę bez trialu". */}
        {!hard && (
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="rounded-2xl bg-muted/60" aria-label={t('workout.close')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
        )}

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

        {/* Hard mode: jedyna ucieczka z paywalla to wylogowanie. */}
        {hard && (
          <div className="mt-5 text-center">
            <button onClick={() => void signOut(auth)} className="text-xs text-muted-foreground underline underline-offset-2">
              {t('paywall.logout')}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
