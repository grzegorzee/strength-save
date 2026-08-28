import { useCallback, useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, MailCheck, AlertCircle, ExternalLink } from 'lucide-react';
import { requestEmailVerificationCode, verifyEmailCode } from '@/lib/registration-api';
import { trackTelemetryEvent } from '@/lib/app-telemetry';
import { useCurrentUser } from '@/contexts/UserContext';
import { getInboxProviders } from '@/lib/inbox-links';
import { useToast } from '@/hooks/use-toast';
import { useTranslation } from '@/contexts/LanguageContext';

interface EmailVerificationGateProps {
  email: string;
  onLogout: () => Promise<void>;
}

// Po wysłaniu kodu blokujemy ponowne wysłanie na 60 s.
const RESEND_COOLDOWN_SEC = 60;

// Bug 9 (X30), wzorzec ConsentGate/zasada 6: po udanym verifyEmailCode bramkę
// zamyka dopiero snapshot users/{uid} (status active). Czekamy z zablokowanym
// przyciskiem, a po timeoucie oddajemy sterowanie (komunikat + Odśwież),
// zamiast pozwalać na retry kończący się sprzecznym "Kod nie jest już aktywny"
// obok toastu o sukcesie.
const SNAPSHOT_TIMEOUT_MS = 12_000;

type AwaitingState = 'idle' | 'waiting' | 'timeout';

export const EmailVerificationGate = ({ email, onLogout }: EmailVerificationGateProps) => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { uid } = useCurrentUser();
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);
  const [awaiting, setAwaiting] = useState<AwaitingState>('idle');
  const [alreadyVerifiedInfo, setAlreadyVerifiedInfo] = useState(false);
  const awaitingTimeoutRef = useRef<number | null>(null);

  const beginAwaitingRefresh = useCallback(() => {
    setAwaiting('waiting');
    setError(null);
    if (awaitingTimeoutRef.current !== null) window.clearTimeout(awaitingTimeoutRef.current);
    awaitingTimeoutRef.current = window.setTimeout(() => setAwaiting('timeout'), SNAPSHOT_TIMEOUT_MS);
  }, []);

  useEffect(() => () => {
    if (awaitingTimeoutRef.current !== null) window.clearTimeout(awaitingTimeoutRef.current);
  }, []);

  const inboxProviders = getInboxProviders(email);

  // Odliczanie cooldownu do ponownego wysłania.
  useEffect(() => {
    if (cooldown <= 0) return;
    const id = setInterval(() => setCooldown((prev) => (prev <= 1 ? 0 : prev - 1)), 1000);
    return () => clearInterval(id);
  }, [cooldown]);

  useEffect(() => {
    let cancelled = false;
    const sendInitialCode = async () => {
      setResending(true);
      setError(null);
      try {
        const result = await requestEmailVerificationCode();
        if (!cancelled) {
          if (result.alreadyVerified) {
            // Bug 9: konto już active (snapshot się spóźnia) — nic nie poszło,
            // więc bez toastu "wysłano" i bez cooldownu; czekamy na odświeżenie.
            setAlreadyVerifiedInfo(true);
            beginAwaitingRefresh();
          } else {
            setCooldown(RESEND_COOLDOWN_SEC);
            toast({
              title: t('comp.emailGate.codeSentTitle'),
              description: t('comp.emailGate.codeSentDesc'),
            });
          }
        }
      } catch (requestError) {
        if (!cancelled) {
          setError(requestError instanceof Error ? requestError.message : t('comp.emailGate.sendError'));
        }
      } finally {
        if (!cancelled) {
          setResending(false);
        }
      }
    };

    void sendInitialCode();
    return () => {
      cancelled = true;
    };
  }, [toast, t, beginAwaitingRefresh]);

  const handleVerify = async () => {
    if (!code.trim() || awaiting !== 'idle') return;
    setLoading(true);
    setError(null);
    try {
      await verifyEmailCode(code.trim());
      // Z222: funnel — konto właśnie przeszło na active, flush dostarczy licznik.
      if (uid) trackTelemetryEvent(uid, 'email_verified');
      toast({
        title: t('comp.emailGate.verifiedTitle'),
        description: t('comp.emailGate.verifiedDesc'),
      });
      beginAwaitingRefresh();
    } catch (verifyError) {
      setError(verifyError instanceof Error ? verifyError.message : t('comp.emailGate.verifyError'));
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (cooldown > 0 || resending || awaiting !== 'idle') return;
    setResending(true);
    setError(null);
    try {
      const result = await requestEmailVerificationCode();
      if (result.alreadyVerified) {
        // Bug 9: backend nic nie wysłał (konto już zweryfikowane) — bez
        // fałszywego toastu i cooldownu, czekamy na snapshot profilu.
        setAlreadyVerifiedInfo(true);
        beginAwaitingRefresh();
      } else {
        setCooldown(RESEND_COOLDOWN_SEC);
        toast({
          title: t('comp.emailGate.resentTitle'),
          description: t('comp.emailGate.resentDesc'),
        });
      }
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : t('comp.emailGate.resendError'));
    } finally {
      setResending(false);
    }
  };

  const openInbox = (url: string) => {
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="flex min-h-[100dvh] justify-center overflow-y-auto bg-background pl-[max(1.5rem,env(safe-area-inset-left))] pr-[max(1.5rem,env(safe-area-inset-right))] pt-[max(1.5rem,env(safe-area-inset-top))] pb-[max(1.5rem,env(safe-area-inset-bottom))]">
      <Card className="my-auto w-full max-w-md">
        <CardContent className="p-6 space-y-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <MailCheck className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-heading font-bold tracking-tight">{t('comp.emailGate.heading')}</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              {t('comp.emailGate.sentToPrefix')} <span className="font-medium text-foreground">{email}</span>{t('comp.emailGate.sentToSuffix')}
            </p>
          </div>

          {error && awaiting === 'idle' && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {awaiting !== 'idle' && (
            <Alert data-testid="email-gate-awaiting">
              {awaiting === 'waiting'
                ? <Loader2 className="h-4 w-4 animate-spin" />
                : <AlertCircle className="h-4 w-4" />}
              <AlertDescription>
                {awaiting === 'timeout'
                  ? t('comp.emailGate.awaitingTimeout')
                  : alreadyVerifiedInfo
                    ? t('comp.emailGate.alreadyVerified')
                    : t('comp.emailGate.awaitingRefresh')}
              </AlertDescription>
            </Alert>
          )}

          {awaiting === 'timeout' && (
            <Button
              variant="outline"
              className="w-full"
              onClick={() => window.location.reload()}
              data-testid="email-gate-refresh"
            >
              {t('gate.refresh')}
            </Button>
          )}

          <Input
            value={code}
            onChange={(event) => setCode(event.target.value.replace(/\D/g, '').slice(0, 6))}
            placeholder={t('comp.emailGate.codePlaceholder')}
            inputMode="numeric"
            autoComplete="one-time-code"
          />

          {/* Szybkie otwarcie skrzynki — dopasowane do domeny maila */}
          <div className="flex flex-wrap gap-2">
            {inboxProviders.map((p) => (
              <Button
                key={p.provider}
                type="button"
                variant="outline"
                className="flex-1"
                onClick={() => openInbox(p.url)}
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                {t('comp.emailGate.openInbox', { provider: p.provider })}
              </Button>
            ))}
          </div>

          <div className="flex gap-2">
            <Button className="flex-1" onClick={handleVerify} disabled={loading || code.length < 6 || awaiting !== 'idle'}>
              {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              {t('comp.emailGate.verifyButton')}
            </Button>
            <Button variant="outline" onClick={handleResend} disabled={resending || cooldown > 0 || awaiting !== 'idle'}>
              {resending
                ? <Loader2 className="h-4 w-4 animate-spin" />
                : cooldown > 0
                  ? t('comp.emailGate.resendIn', { s: cooldown })
                  : t('comp.emailGate.resendButton')}
            </Button>
          </div>

          <div className="flex gap-2">
            <Button variant="secondary" className="w-full" onClick={() => void onLogout()}>
              {t('profile.logout')}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
