import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, MailCheck, AlertCircle } from 'lucide-react';
import { requestEmailVerificationCode, verifyEmailCode } from '@/lib/registration-api';
import { useToast } from '@/hooks/use-toast';
import { signOut } from 'firebase/auth';
import { auth } from '@/lib/firebase';

interface EmailVerificationGateProps {
  email: string;
}

export const EmailVerificationGate = ({ email }: EmailVerificationGateProps) => {
  const { toast } = useToast();
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const sendInitialCode = async () => {
      setResending(true);
      setError(null);
      try {
        await requestEmailVerificationCode();
        if (!cancelled) {
          toast({
            title: 'Kod wysłany',
            description: 'Sprawdź skrzynkę mailową i wpisz kod, aby aktywować konto.',
          });
        }
      } catch (requestError) {
        if (!cancelled) {
          setError(requestError instanceof Error ? requestError.message : 'Nie udało się wysłać kodu.');
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
  }, [toast]);

  const handleVerify = async () => {
    if (!code.trim()) return;
    setLoading(true);
    setError(null);
    try {
      await verifyEmailCode(code.trim());
      toast({
        title: 'Email potwierdzony',
        description: 'Konto jest aktywne. Możesz przejść dalej do aplikacji.',
      });
    } catch (verifyError) {
      setError(verifyError instanceof Error ? verifyError.message : 'Nie udało się potwierdzić kodu.');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setResending(true);
    setError(null);
    try {
      await requestEmailVerificationCode();
      toast({
        title: 'Wysłano nowy kod',
        description: 'Sprawdź skrzynkę mailową i wpisz najnowszy kod.',
      });
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Nie udało się wysłać nowego kodu.');
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-6">
      <Card className="w-full max-w-md">
        <CardContent className="p-6 space-y-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <MailCheck className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-heading font-bold tracking-tight">Potwierdź adres email</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Wysłaliśmy kod na <span className="font-medium text-foreground">{email}</span>. Wpisz go poniżej, aby aktywować konto.
            </p>
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <Input
            value={code}
            onChange={(event) => setCode(event.target.value.replace(/\D/g, '').slice(0, 6))}
            placeholder="Kod 6-cyfrowy"
            inputMode="numeric"
            autoComplete="one-time-code"
          />

          <div className="flex gap-2">
            <Button className="flex-1" onClick={handleVerify} disabled={loading || code.length < 6}>
              {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              Potwierdź kod
            </Button>
            <Button variant="outline" onClick={handleResend} disabled={resending}>
              {resending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Wyślij ponownie'}
            </Button>
          </div>

          <div className="flex gap-2">
            <Button variant="secondary" className="w-full" onClick={() => void signOut(auth)}>
              Wyloguj
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
