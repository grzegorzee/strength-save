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

  useEffect(() => {
    const code = searchParams.get('code');
    const callbackError = searchParams.get('error');

    if (callbackError) {
      setStatus('error');
      setErrorMessage('Autoryzacja została odrzucona.');
      return;
    }

    if (!code) {
      setStatus('error');
      setErrorMessage('Brak kodu autoryzacji.');
      return;
    }

    const exchangeCode = async () => {
      try {
        const functions = getFunctions();
        const callback = httpsCallable(functions, 'stravaCallback');
        await callback({ code, userId: uid });
        setStatus('success');

        // Auto-redirect after 2s
        setTimeout(() => navigate('/settings'), 2000);
      } catch (err) {
        setStatus('error');
        setErrorMessage(err instanceof Error ? err.message : 'Błąd wymiany kodu');
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
                <p className="text-sm text-muted-foreground">Przekierowuję do ustawień...</p>
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
