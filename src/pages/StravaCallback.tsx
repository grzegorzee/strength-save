import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCurrentUser } from '@/contexts/UserContext';

const StravaCallback = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { uid } = useCurrentUser();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState('');
  const [syncedCount, setSyncedCount] = useState(0);

  useEffect(() => {
    const code = searchParams.get('code');
    const callbackError = searchParams.get('error');

    if (callbackError) {
      console.error('[Strava] OAuth denied:', callbackError);
      setStatus('error');
      setErrorMessage('Autoryzacja została odrzucona.');
      return;
    }

    if (!code) {
      console.error('[Strava] No code in callback URL');
      setStatus('error');
      setErrorMessage('Brak kodu autoryzacji.');
      return;
    }

    const exchangeCode = async () => {
      console.log('[Strava] Exchanging OAuth code for tokens...');
      try {
        const functions = getFunctions();
        const callback = httpsCallable(functions, 'stravaCallback');
        const result = await callback({ code, userId: uid });
        const data = result.data as { synced?: number; totalFetched?: number; lookbackDays?: number };
        console.log(`[Strava] Callback OK: synced=${data.synced}, fetched=${data.totalFetched}, lookback=${data.lookbackDays}d`);
        setSyncedCount(data.synced || 0);
        setStatus('success');

        // Auto-redirect after 3s
        setTimeout(() => navigate('/settings'), 3000);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Błąd wymiany kodu';
        console.error('[Strava] Callback failed:', message);
        setStatus('error');
        setErrorMessage(message);
      }
    };

    exchangeCode();
  }, [searchParams, uid, navigate]);

  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <Card className="max-w-md w-full">
        <CardContent className="py-12">
          <div className="flex flex-col items-center gap-4 text-center">
            {status === 'loading' && (
              <>
                <Loader2 className="h-12 w-12 animate-spin text-[#FC4C02]" />
                <p className="font-medium">Łączenie ze Stravą...</p>
                <p className="text-sm text-muted-foreground">To zajmie chwilę</p>
              </>
            )}

            {status === 'success' && (
              <>
                <CheckCircle className="h-12 w-12 text-green-500" />
                <p className="font-medium">Połączono ze Stravą!</p>
                <p className="text-sm text-muted-foreground">
                  {syncedCount > 0
                    ? `Zsynchronizowano ${syncedCount} aktywności. Przekierowuję...`
                    : 'Przekierowuję do ustawień...'}
                </p>
              </>
            )}

            {status === 'error' && (
              <>
                <XCircle className="h-12 w-12 text-destructive" />
                <p className="font-medium">Błąd połączenia</p>
                <p className="text-sm text-muted-foreground">{errorMessage}</p>
                <Button variant="outline" onClick={() => navigate('/settings')} className="mt-2">
                  Wróć do ustawień
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
