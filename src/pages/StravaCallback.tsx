import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCurrentUser } from '@/contexts/UserContext';
import { useTranslation } from '@/contexts/LanguageContext';

const StravaCallback = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { uid } = useCurrentUser();
  const { t } = useTranslation();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState('');
  const [syncedCount, setSyncedCount] = useState(0);

  useEffect(() => {
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const callbackError = searchParams.get('error');

    if (callbackError) {
      console.error('[Strava] OAuth denied:', callbackError);
      setStatus('error');
      setErrorMessage(t('strava.callback.denied'));
      return;
    }

    if (!code) {
      console.error('[Strava] No code in callback URL');
      setStatus('error');
      setErrorMessage(t('strava.callback.noCode'));
      return;
    }

    if (!state) {
      console.error('[Strava] No OAuth state in callback URL');
      setStatus('error');
      setErrorMessage(t('strava.callback.noState'));
      return;
    }

    const exchangeCode = async () => {
      console.log('[Strava] Exchanging OAuth code for tokens...');
      try {
        const functions = getFunctions();
        const callback = httpsCallable(functions, 'stravaCallback');
        const result = await callback({ code, state });
        const data = result.data as { synced?: number; totalFetched?: number; lookbackDays?: number };
        console.log(`[Strava] Callback OK: synced=${data.synced}, fetched=${data.totalFetched}, lookback=${data.lookbackDays}d`);
        setSyncedCount(data.synced || 0);
        setStatus('success');

        // Auto-redirect after 3s
        setTimeout(() => navigate('/settings'), 3000);
      } catch (err) {
        const message = err instanceof Error ? err.message : t('strava.callback.exchangeError');
        console.error('[Strava] Callback failed:', message);
        setStatus('error');
        setErrorMessage(message);
      }
    };

    exchangeCode();
  }, [searchParams, uid, navigate, t]);

  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <Card className="max-w-md w-full">
        <CardContent className="py-12">
          <div className="flex flex-col items-center gap-4 text-center">
            {status === 'loading' && (
              <>
                <Loader2 className="h-12 w-12 animate-spin text-[#FC4C02]" />
                <p className="font-medium">{t('strava.callback.connecting')}</p>
                <p className="text-sm text-muted-foreground">{t('strava.callback.wait')}</p>
              </>
            )}

            {status === 'success' && (
              <>
                <CheckCircle className="h-12 w-12 text-fitness-success" />
                <p className="font-medium">{t('strava.callback.connected')}</p>
                <p className="text-sm text-muted-foreground">
                  {syncedCount > 0
                    ? t('strava.callback.syncedRedirect', { n: syncedCount })
                    : t('strava.callback.redirect')}
                </p>
              </>
            )}

            {status === 'error' && (
              <>
                <XCircle className="h-12 w-12 text-destructive" />
                <p className="font-medium">{t('strava.callback.error')}</p>
                <p className="text-sm text-muted-foreground">{errorMessage}</p>
                <Button variant="outline" onClick={() => navigate('/settings')} className="mt-2">
                  {t('strava.callback.backToSettings')}
                </Button>
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default StravaCallback;
