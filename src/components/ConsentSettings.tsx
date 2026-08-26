import { useState } from 'react';
import { ShieldCheck, Mail } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useTranslation } from '@/contexts/LanguageContext';
import { useCurrentUser } from '@/contexts/UserContext';
import { useToast } from '@/hooks/use-toast';
import { getConsentMirror } from '@/lib/consent-selection';
import { recordConsents } from '@/lib/consents-api';

// Zarządzanie zgodami (pakiet prawny v2): wycofanie ma być tak łatwe jak
// udzielenie (art. 7 ust. 3 RODO). Każda zmiana idzie przez recordConsent
// (log z IP i timestampem serwerowym); stan UI napędza mirror
// users/{uid}.consents przez onSnapshot, lokalny stan jest tylko optymistyczny.

// X36: `hideTitle` — karta w zwijanej sekcji Profilu (wiersz sekcji = tytuł).
export const ConsentSettings = ({ hideTitle = false }: { hideTitle?: boolean } = {}) => {
  const { t, lang } = useTranslation();
  const { profile } = useCurrentUser();
  const { toast } = useToast();
  const mirror = getConsentMirror(profile);

  const [marketingLocal, setMarketingLocal] = useState<boolean | null>(null);
  const [healthLocal, setHealthLocal] = useState<boolean | null>(null);
  const [confirmWithdraw, setConfirmWithdraw] = useState(false);
  const [busy, setBusy] = useState(false);

  const marketingOn = marketingLocal ?? mirror?.marketingGranted === true;
  const healthOn = healthLocal ?? mirror?.healthGranted !== false;

  const toggleMarketing = async (value: boolean) => {
    setMarketingLocal(value);
    try {
      await recordConsents([
        { type: 'marketing', action: value ? 'granted' : 'withdrawn', statementText: t('consent.marketing') },
      ], lang);
    } catch {
      setMarketingLocal(!value);
      toast({ title: t('consent.saveError'), variant: 'destructive' });
    }
  };

  const setHealth = async (value: boolean) => {
    setBusy(true);
    setHealthLocal(value);
    try {
      await recordConsents([
        {
          type: 'health',
          action: value ? 'granted' : 'withdrawn',
          statementText: value ? t('consent.health') : t('consent.healthWithdrawStatement'),
        },
      ], lang);
    } catch {
      setHealthLocal(!value);
      toast({ title: t('consent.saveError'), variant: 'destructive' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card>
      {!hideTitle && (
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <ShieldCheck className="h-4 w-4 text-primary" />
            {t('consent.settingsTitle')}
          </CardTitle>
        </CardHeader>
      )}
      <CardContent className={hideTitle ? 'space-y-5 pt-6' : 'space-y-5'}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-medium flex items-center gap-1.5"><Mail className="h-3.5 w-3.5" />{t('consent.settingsMarketing')}</p>
            <p className="text-xs text-muted-foreground mt-1">{t('consent.settingsMarketingDesc')}</p>
          </div>
          <Switch
            checked={marketingOn}
            onCheckedChange={toggleMarketing}
            aria-label={t('consent.settingsMarketing')}
            data-testid="consent-marketing-toggle"
          />
        </div>

        <div className="border-t border-border pt-4">
          <p className="text-sm font-medium">{t('consent.settingsHealth')}</p>
          {healthOn ? (
            <>
              <p className="text-xs text-muted-foreground mt-1">{t('consent.settingsHealthGrantedDesc')}</p>
              <Button
                variant="outline"
                size="sm"
                className="mt-3 text-destructive border-destructive/40 hover:bg-destructive/10"
                disabled={busy}
                onClick={() => setConfirmWithdraw(true)}
                data-testid="consent-health-withdraw"
              >
                {t('consent.settingsHealthWithdraw')}
              </Button>
            </>
          ) : (
            <>
              <div className="mt-2 rounded-xl border border-fitness-warning bg-fitness-warning/10 p-3">
                <p className="text-xs text-fitness-warning">{t('consent.settingsHealthWithdrawnBanner')}</p>
              </div>
              <Button
                size="sm"
                className="mt-3"
                disabled={busy}
                onClick={() => setHealth(true)}
                data-testid="consent-health-grant"
              >
                {t('consent.settingsHealthGrantAgain')}
              </Button>
            </>
          )}
        </div>

        <AlertDialog open={confirmWithdraw} onOpenChange={setConfirmWithdraw}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t('consent.settingsHealthWithdrawConfirmTitle')}</AlertDialogTitle>
              <AlertDialogDescription>{t('consent.settingsHealthWithdrawConfirmDesc')}</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => { setConfirmWithdraw(false); void setHealth(false); }}
                data-testid="consent-health-withdraw-confirm"
              >
                {t('consent.settingsHealthWithdraw')}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  );
};
