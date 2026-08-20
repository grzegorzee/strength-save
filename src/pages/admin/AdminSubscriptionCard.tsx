import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { Loader2, Sparkles, XCircle } from 'lucide-react';
import { adminGrantSubscription, adminRevokeSubscription } from '@/lib/registration-api';
import { logAdminAction } from '@/lib/admin-audit';
import { isSubscriptionActive, type SubscriptionState } from '@/lib/user-profile';
import { useCurrentUser } from '@/contexts/UserContext';
import { useToast } from '@/hooks/use-toast';
import { useTranslation } from '@/contexts/LanguageContext';
import { dateLocale, type TranslationKey } from '@/i18n';

// 2026-08-20: zarządzanie PRO z panelu admina (decyzja właściciela). Jedna
// samodzielna karta używana w tabeli userów i w szczególe usera: pokazuje stan,
// nadaje grant (zawsze comp; dni doliczane do końca obecnego dostępu) i odbiera
// grant. Płatną subskrypcją rządzi sklep — revoke działa tylko na tier 'comp'.

const PLAN_KEY: Partial<Record<SubscriptionState['tier'], TranslationKey>> = {
  monthly: 'subscription.plan.monthly',
  yearly: 'subscription.plan.yearly',
  trial: 'subscription.plan.trial',
  comp: 'subscription.comp',
};

const GRANT_PRESETS = [30, 90, 365] as const;

type GrantChoice = 30 | 90 | 365 | 'infinite' | 'custom';

/** Lustrzana logika buildGrantedSubscription (functions/src/security.ts) do optymistycznego odświeżenia UI. */
export const buildNextGrantState = (
  current: SubscriptionState | null | undefined,
  days: number | null,
  now = Date.now(),
): SubscriptionState => {
  if (days === null) return { tier: 'comp', status: 'active', startedAt: null, expiresAt: null };
  const cur = current?.expiresAt ? Date.parse(current.expiresAt) : NaN;
  const base = Number.isFinite(cur) && cur > now ? cur : now;
  return {
    tier: 'comp',
    status: 'active',
    startedAt: null,
    expiresAt: new Date(base + days * 24 * 60 * 60 * 1000).toISOString(),
  };
};

interface AdminSubscriptionCardProps {
  uid: string;
  name: string;
  subscription: SubscriptionState | null | undefined;
  /** Optymistyczna aktualizacja stanu w hoście (Dashboard i tak odświeży się z onSnapshot). */
  onChanged?: (next: SubscriptionState) => void;
}

export const AdminSubscriptionCard = ({ uid, name, subscription, onChanged }: AdminSubscriptionCardProps) => {
  const { uid: adminUid } = useCurrentUser();
  const { toast } = useToast();
  const { t, lang } = useTranslation();
  const [grantOpen, setGrantOpen] = useState(false);
  const [choice, setChoice] = useState<GrantChoice>(30);
  const [customDays, setCustomDays] = useState('');
  const [revokeOpen, setRevokeOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const active = isSubscriptionActive(subscription ?? null);
  const isGrant = subscription?.tier === 'comp';
  const isStore = active && (subscription?.tier === 'monthly' || subscription?.tier === 'yearly');
  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString(dateLocale(lang), { day: 'numeric', month: 'long', year: 'numeric' });

  const statusLine = (() => {
    if (!active) return t('subscription.none');
    if (isGrant) {
      return subscription?.expiresAt
        ? t('subscription.expires', { date: formatDate(subscription.expiresAt) })
        : t('subscription.compDesc');
    }
    if (!subscription?.expiresAt) return t('subscription.none');
    if (subscription.status === 'billing_issue') return t('subscription.grace', { date: formatDate(subscription.expiresAt) });
    if (subscription.tier === 'trial' || subscription.willRenew === false) {
      return t('subscription.expires', { date: formatDate(subscription.expiresAt) });
    }
    return t('subscription.renews', { date: formatDate(subscription.expiresAt) });
  })();

  const resolveDays = (): number | null | 'invalid' => {
    if (choice === 'infinite') return null;
    if (choice === 'custom') {
      const parsed = Number(customDays.trim());
      return Number.isFinite(parsed) && parsed > 0 ? Math.round(parsed) : 'invalid';
    }
    return choice;
  };

  const submitGrant = async () => {
    const days = resolveDays();
    if (days === 'invalid') return;
    setBusy(true);
    try {
      await adminGrantSubscription(uid, days);
      void logAdminAction(adminUid, {
        action: 'grantSubscription',
        targetUid: uid,
        detail: days === null ? 'comp' : `comp +${days}d`,
      });
      const next = buildNextGrantState(subscription, days);
      onChanged?.(next);
      toast({
        title: t('admin.grantDoneTitle'),
        description: days === null
          ? t('admin.grantDoneComp')
          : t('admin.sub.grantDoneUntil', { date: formatDate(next.expiresAt as string) }),
      });
      setGrantOpen(false);
    } catch (e) {
      toast({
        title: t('admin.error'),
        description: e instanceof Error ? e.message : t('admin.grantFailed'),
        variant: 'destructive',
      });
    } finally {
      setBusy(false);
    }
  };

  const submitRevoke = async () => {
    setBusy(true);
    try {
      await adminRevokeSubscription(uid);
      void logAdminAction(adminUid, { action: 'revokeSubscription', targetUid: uid });
      onChanged?.({ tier: 'none', status: 'none', startedAt: null, expiresAt: null });
      toast({ title: t('admin.sub.revokeDone'), description: name });
    } catch (e) {
      toast({
        title: t('admin.error'),
        description: e instanceof Error ? e.message : t('admin.sub.revokeFailed'),
        variant: 'destructive',
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium">
            {active && subscription ? t(PLAN_KEY[subscription.tier] ?? 'subscription.none') : t('subscription.none')}
          </p>
          <p className="text-xs text-muted-foreground">{statusLine}</p>
          {isStore && (
            <p className="text-xs text-muted-foreground">{t('admin.sub.storeNote')}</p>
          )}
        </div>
        {active && (
          <span className="rounded-full border border-primary/40 bg-primary/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-primary shrink-0">
            PRO
          </span>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        <Button variant="outline" size="sm" onClick={() => { setChoice(30); setCustomDays(''); setGrantOpen(true); }}>
          <Sparkles className="h-4 w-4 mr-1.5" />
          {t('admin.sub.grantExtend')}
        </Button>
        {isGrant && (
          <Button variant="outline" size="sm" onClick={() => setRevokeOpen(true)} disabled={busy}>
            <XCircle className="h-4 w-4 mr-1.5" />
            {t('admin.sub.revoke')}
          </Button>
        )}
      </div>

      <Dialog open={grantOpen} onOpenChange={(open) => { if (!open) setGrantOpen(false); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('admin.grantDialogTitle')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">{name}</p>
            <p className="text-xs text-muted-foreground">
              {t('admin.sub.currentLabel')}: {statusLine}
            </p>
            <p className="text-xs text-muted-foreground">{t('admin.grantDialogDesc')}</p>
            <div className="grid grid-cols-2 gap-2">
              {GRANT_PRESETS.map((days) => (
                <Button
                  key={days}
                  type="button"
                  variant={choice === days ? 'default' : 'outline'}
                  onClick={() => setChoice(days)}
                >
                  {t('admin.sub.grantPreset', { days })}
                </Button>
              ))}
              <Button
                type="button"
                variant={choice === 'infinite' ? 'default' : 'outline'}
                onClick={() => setChoice('infinite')}
              >
                {t('admin.sub.grantInfinite')}
              </Button>
            </div>
            <div className="space-y-1">
              <label htmlFor="admin-grant-custom-days" className="text-xs font-medium text-muted-foreground">
                {t('admin.sub.grantCustom')}
              </label>
              <Input
                id="admin-grant-custom-days"
                type="number"
                min={1}
                value={customDays}
                onFocus={() => setChoice('custom')}
                onChange={(event) => { setChoice('custom'); setCustomDays(event.target.value); }}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setGrantOpen(false)}>{t('common.cancel')}</Button>
            <Button onClick={() => void submitGrant()} disabled={busy || resolveDays() === 'invalid'}>
              {busy ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              {t('admin.grantSubmit')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={revokeOpen}
        onOpenChange={setRevokeOpen}
        title={t('admin.sub.revokeConfirmTitle')}
        description={t('admin.sub.revokeConfirmDesc', { name })}
        confirmLabel={t('admin.sub.revoke')}
        destructive
        onConfirm={() => void submitRevoke()}
      />
    </div>
  );
};
