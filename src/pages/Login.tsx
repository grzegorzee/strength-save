import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
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
import { useTranslation } from '@/contexts/LanguageContext';

interface LoginProps {
  mode?: 'login' | 'register';
}

const Login = ({ mode = 'login' }: LoginProps) => {
  // Google działa na obu platformach: web przez popup, native przez plugin.
  const supportsGoogle = true;
  const { signInWithGoogle, registerWithEmail, loginWithEmail, resetPassword, error, loading } = useAuth();
  const { toast } = useToast();
  const { t } = useTranslation();
  const [authTab, setAuthTab] = useState<'google' | 'email'>(
    mode === 'register' || !supportsGoogle ? 'email' : 'google'
  );
  const [emailMode, setEmailMode] = useState<'login' | 'register'>(mode);
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
    setAuthTab(mode === 'register' || !supportsGoogle ? 'email' : 'google');
    setEmailMode(mode);
  }, [mode, supportsGoogle]);

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
  const isRegisterMode = emailMode === 'register';
  const canSubmitEmail = useMemo(() => {
    if (!email.trim() || !password.trim()) return false;
    if (isRegisterMode && password !== confirmPassword) return false;
    return true;
  }, [confirmPassword, email, isRegisterMode, password]);

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
    if (isRegisterMode && password !== confirmPassword) {
      setLocalError(t('login.error.passwordMismatch'));
      return;
    }

    setIsSubmitting(true);
    try {
      const success = isRegisterMode
        ? await registerWithEmail(email, password)
        : await loginWithEmail(email, password);
      if (success && isRegisterMode) {
        toast({
          title: t('login.toast.accountCreated.title'),
          description: t('login.toast.accountCreated.desc'),
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetPassword = async () => {
    setLocalError(null);
    if (!email.trim()) {
      setLocalError(t('login.error.emailForReset'));
      return;
    }
    setIsSubmitting(true);
    try {
      const success = await resetPassword(email);
      if (success) {
        toast({
          title: t('login.toast.linkSent.title'),
          description: t('login.toast.linkSent.desc'),
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
        title: t('login.toast.waitlistAdded.title'),
        description: t('login.toast.waitlistAdded.desc'),
      });
      setWaitlistEmail('');
      setWaitlistName('');
      setWaitlistNote('');
    } catch (waitlistError) {
      setLocalError(waitlistError instanceof Error ? waitlistError.message : t('login.error.waitlistFailed'));
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
            {supportsGoogle
              ? isRegisterMode
                ? t('login.subtitle.registerGoogle')
                : t('login.subtitle')
              : isRegisterMode
                ? t('login.subtitle.registerEmail')
                : t('login.subtitle.loginEmail')}
          </CardDescription>
          {inviteCode && (
            <p className="text-xs text-primary">
              {t('login.inviteDetected')} <span className="font-semibold">{inviteCode}</span>. {t('login.inviteWillAttach')}
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
            <TabsList className={`grid w-full ${supportsGoogle ? 'grid-cols-2' : 'grid-cols-1'}`}>
              {supportsGoogle && <TabsTrigger value="google">{t('login.tab.google')}</TabsTrigger>}
              <TabsTrigger value="email">{t('login.tab.email')}</TabsTrigger>
            </TabsList>

            {supportsGoogle && (
              <TabsContent value="google" className="pt-4">
                <Button onClick={handleGoogleLogin} className="w-full py-6 text-lg" size="lg" disabled={isSubmitting}>
                  {isSubmitting ? <Loader2 className="h-5 w-5 mr-2 animate-spin" /> : isRegisterMode ? <UserPlus className="h-5 w-5 mr-2" /> : <LogIn className="h-5 w-5 mr-2" />}
                  {isRegisterMode ? t('login.googleRegister') : t('login.google')}
                </Button>
                <p className="mt-3 text-xs text-center text-muted-foreground">
                  {t('login.googleHint')}
                </p>
              </TabsContent>
            )}

            <TabsContent value="email" className="pt-4 space-y-4">
              <div className="space-y-3">
                <Input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder={t('login.email')}
                />
                <Input
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder={t('login.password')}
                />
                {isRegisterMode && (
                  <Input
                    type="password"
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    placeholder={t('login.confirmPassword')}
                  />
                )}
              </div>

              <Button className="w-full" onClick={handleEmailSubmit} disabled={!canSubmitEmail || isSubmitting}>
                {isSubmitting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : isRegisterMode ? <UserPlus className="h-4 w-4 mr-2" /> : <Mail className="h-4 w-4 mr-2" />}
                {isRegisterMode ? t('login.registerSubmit') : t('login.submit')}
              </Button>

              {!isRegisterMode && (
                <Button type="button" variant="ghost" className="w-full text-xs" onClick={handleResetPassword} disabled={isSubmitting}>
                  {t('login.resetPassword')}
                </Button>
              )}
            </TabsContent>
          </Tabs>

          <div className="rounded-lg border bg-muted/20 p-4 text-sm">
            <p className="font-medium">
              {isRegisterMode ? t('login.haveAccount') : t('login.noAccount')}
            </p>
            <p className="mt-1 text-muted-foreground">
              {isRegisterMode
                ? t('login.toLoginHint')
                : t('login.toRegisterHint')}
            </p>
            <Button asChild variant="outline" className="mt-3 w-full">
              <Link to={isRegisterMode ? '/login' : '/register'}>
                {isRegisterMode ? t('login.toLogin') : t('login.toRegister')}
              </Link>
            </Button>
          </div>

          <div className="rounded-lg border border-dashed p-4 space-y-3">
            <div>
              <p className="text-sm font-medium">{t('login.waitlist.title')}</p>
              <p className="text-xs text-muted-foreground">
                {t('login.waitlist.desc')}
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <Input
                type="email"
                value={waitlistEmail}
                onChange={(event) => setWaitlistEmail(event.target.value)}
                placeholder={t('login.email')}
              />
              <Input
                value={waitlistName}
                onChange={(event) => setWaitlistName(event.target.value)}
                placeholder={t('login.waitlist.namePlaceholder')}
              />
            </div>
            <Input
              value={waitlistNote}
              onChange={(event) => setWaitlistNote(event.target.value)}
              placeholder={t('login.waitlist.notePlaceholder')}
            />
            <Button variant="outline" className="w-full" onClick={handleWaitlistSubmit} disabled={!waitlistEmail.trim() || isWaitlistSubmitting}>
              {isWaitlistSubmitting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
              {t('login.waitlist.submit')}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Login;
