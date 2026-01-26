import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dumbbell, LogIn, AlertCircle, Loader2 } from 'lucide-react';

const Login = () => {
  const { signInWithGoogle, error, loading } = useAuth();

  const handleLogin = async () => {
    await signInWithGoogle();
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
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
            <Dumbbell className="h-8 w-8 text-primary" />
          </div>
          <CardTitle className="text-2xl">FitTracker</CardTitle>
          <CardDescription>
            Zaloguj się, aby kontynuować
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <Button
            onClick={handleLogin}
            className="w-full py-6 text-lg"
            size="lg"
          >
            <LogIn className="h-5 w-5 mr-2" />
            Zaloguj przez Google
          </Button>

          <p className="text-xs text-center text-muted-foreground">
            Dostęp tylko dla autoryzowanych użytkowników
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default Login;
