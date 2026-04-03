import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Dumbbell, LogIn, AlertCircle, Loader2, Mail, UserPlus, Send } from 'lucide-react';
import { createWaitlistEntry } from '@/lib/registration-api';
import { setPendingInviteCode } from '@/lib/pending-invite';
import { useToast } from '@/hooks/use-toast';

const Login = () => {
  const { signInWithGoogle, registerWithEmail, loginWithEmail, resetPassword, error, loading } = useAuth();
  const { toast } = useToast();
  const [authTab, setAuthTab] = useState<'google' | 'email'>('google');
  const [emailMode, setEmailMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [waitlistEmail, setWaitlistEmail] = useState('');
  const [waitlistName, setWaitlistName] = useState('');
  const [waitlistNote, setWaitlistNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isWaitlistSubmitting, setIsWaitlistSubmitting] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [inviteCode, setInviteCode] = useState<string | null>(null);

  useEffect(() => {
    const directSearch = new URLSearchParams(window.location.search);
    const hash = window.location.hash || '';
    const hashQuery = hash.includes('?') ? hash.slice(hash.indexOf('?')) : '';
    const hashSearch = new URLSearchParams(hashQuery);
    const code = directSearch.get('invite') || hashSearch.get('invite');
    if (code) {
      const normalized = code.trim().toUpperCase();
      setInviteCode(normalized);
      setPendingInviteCode(normalized);
    }
  }, []);

  const activeError = localError || error;
  const canSubmitEmail = useMemo(() => {
    if (!email.trim() || !password.trim()) return false;
    if (emailMode === 'register' && password !== confirmPassword) return false;
    return true;
  }, [confirmPassword, email, emailMode, password]);

  const handleGoogleLogin = async () => {
    setLocalError(null);
    setIsSubmitting(true);
    try {
      await signInWithGoogle();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEmailSubmit = async () => {
    setLocalError(null);
    if (emailMode === 'register' && password !== confirmPassword) {
      setLocalError('Hasła muszą być identyczne.');
      return;
    }

    setIsSubmitting(true);
    try {
      const success = emailMode === 'register'
        ? await registerWithEmail(email, password)
        : await loginWithEmail(email, password);
      if (success && emailMode === 'register') {
        toast({
          title: 'Konto utworzone',
          description: 'Zaraz zobaczysz ekran wpisania kodu potwierdzającego wysłanego na email.',
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetPassword = async () => {
    setLocalError(null);
    if (!email.trim()) {
      setLocalError('Podaj email, aby wysłać link do resetu hasła.');
      return;
    }
    setIsSubmitting(true);
    try {
      const success = await resetPassword(email);
      if (success) {
        toast({
          title: 'Link wysłany',
          description: 'Sprawdź skrzynkę mailową, aby zresetować hasło.',
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleWaitlistSubmit = async () => {
    setLocalError(null);
    setIsWaitlistSubmitting(true);
    try {
      await createWaitlistEntry({
        email: waitlistEmail,
        displayName: waitlistName || undefined,
        note: waitlistNote || undefined,
        source: 'login-screen',
      });
      toast({
        title: 'Dodano do listy',
        description: 'Twoje zgłoszenie zostało zapisane. Admin będzie mógł wysłać invite lub nadać cohortę.',
      });
      setWaitlistEmail('');
      setWaitlistName('');
      setWaitlistNote('');
    } catch (waitlistError) {
      setLocalError(waitlistError instanceof Error ? waitlistError.message : 'Nie udało się zapisać na listę.');
    } finally {
      setIsWaitlistSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted p-4">
      <Card className="w-full max-w-xl">
        <CardHeader className="text-center">
          <div className="mx-auto h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
            <Dumbbell className="h-8 w-8 text-primary" />
          </div>
          <CardTitle className="text-2xl">FitTracker</CardTitle>
          <CardDescription>
            Wejdź przez Google albo załóż konto przez email i hasło
          </CardDescription>
          {inviteCode && (
            <p className="text-xs text-primary">
              Wykryto kod zaproszenia: <span className="font-semibold">{inviteCode}</span>. Zostanie przypięty po zalogowaniu.
            </p>
          )}
        </CardHeader>
        <CardContent className="space-y-6">
          {activeError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{activeError}</AlertDescription>
            </Alert>
          )}

          <Tabs value={authTab} onValueChange={(value) => setAuthTab(value as 'google' | 'email')}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="google">Google</TabsTrigger>
              <TabsTrigger value="email">Email + hasło</TabsTrigger>
            </TabsList>

            <TabsContent value="google" className="pt-4">
              <Button onClick={handleGoogleLogin} className="w-full py-6 text-lg" size="lg" disabled={isSubmitting}>
                {isSubmitting ? <Loader2 className="h-5 w-5 mr-2 animate-spin" /> : <LogIn className="h-5 w-5 mr-2" />}
                Zaloguj przez Google
              </Button>
              <p className="mt-3 text-xs text-center text-muted-foreground">
                Google daje od razu aktywne konto i uruchamia onboarding przy pierwszym wejściu.
              </p>
            </TabsContent>

            <TabsContent value="email" className="pt-4 space-y-4">
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant={emailMode === 'login' ? 'default' : 'outline'}
                  className="flex-1"
                  onClick={() => setEmailMode('login')}
                >
                  Logowanie
                </Button>
                <Button
                  type="button"
                  variant={emailMode === 'register' ? 'default' : 'outline'}
                  className="flex-1"
                  onClick={() => setEmailMode('register')}
                >
                  Rejestracja
                </Button>
              </div>

              <div className="space-y-3">
                <Input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="Email"
                />
                <Input
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Hasło"
                />
                {emailMode === 'register' && (
                  <Input
                    type="password"
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    placeholder="Powtórz hasło"
                  />
                )}
              </div>

              <Button className="w-full" onClick={handleEmailSubmit} disabled={!canSubmitEmail || isSubmitting}>
                {isSubmitting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : emailMode === 'register' ? <UserPlus className="h-4 w-4 mr-2" /> : <Mail className="h-4 w-4 mr-2" />}
                {emailMode === 'register' ? 'Załóż konto i wyślij kod' : 'Zaloguj przez email'}
              </Button>

              <Button type="button" variant="ghost" className="w-full text-xs" onClick={handleResetPassword} disabled={isSubmitting}>
                Reset hasła
              </Button>
            </TabsContent>
          </Tabs>

          <div className="rounded-lg border border-dashed p-4 space-y-3">
            <div>
              <p className="text-sm font-medium">Chcesz trafić na waitlistę lub dostać invite?</p>
              <p className="text-xs text-muted-foreground">
                Zostaw email. Admin będzie mógł przypisać Ci invite, cohortę albo specjalne flagi konta.
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <Input
                type="email"
                value={waitlistEmail}
                onChange={(event) => setWaitlistEmail(event.target.value)}
                placeholder="Email"
              />
              <Input
                value={waitlistName}
                onChange={(event) => setWaitlistName(event.target.value)}
                placeholder="Imię / nazwa"
              />
            </div>
            <Input
              value={waitlistNote}
              onChange={(event) => setWaitlistNote(event.target.value)}
              placeholder="Notatka lub kontekst"
            />
            <Button variant="outline" className="w-full" onClick={handleWaitlistSubmit} disabled={!waitlistEmail.trim() || isWaitlistSubmitting}>
              {isWaitlistSubmitting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
              Zapisz na waitlistę
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Login;
