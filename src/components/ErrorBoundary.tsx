import { Component, ReactNode } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { reportClientError } from '@/lib/error-telemetry';

/**
 * Krótki kod błędu do zgłoszenia przez usera.
 *
 * User zgłosił „nieznany błąd" bez żadnego punktu zaczepienia — nie dało się
 * powiązać zrzutu ekranu z konkretnym miejscem w kodzie. Kod jest deterministyczny
 * (ten sam błąd = ten sam kod), więc powtórki widać od razu.
 */
const buildErrorCode = (error: Error): string => {
  const seed = `${error.name}:${error.message}`;
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) | 0;
  }
  return `E-${Math.abs(hash).toString(36).toUpperCase().slice(0, 5)}`;
};

interface Props {
  children: ReactNode;
  /** Crashe renderu raportują do client_errors tylko z uid (telemetria go wymaga). */
  uid?: string;
  /** Własny fallback (np. karta per trasa); reset czyści stan błędu boundary.
   *  Dostaje też błąd i krótki KOD, żeby user miał co zgłosić zamiast „nieznany błąd". */
  fallback?: (reset: () => void, error: Error | null, code: string) => ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  /** Krótki, rozpoznawalny identyfikator tego wystąpienia (do zgłoszenia). */
  code: string;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, code: '' };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, code: buildErrorCode(error) };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo);
    if (this.props.uid) {
      const stackFirstLine = (error.stack ?? '').split('\n').find(line => line.includes('at ')) ?? '';
      void reportClientError(this.props.uid, {
        code: 'render-crash',
        phase: 'other',
        detail: `[${this.state.code}] ${error.message} ${stackFirstLine}`.trim(),
      });
    }
  }

  reset = () => {
    this.setState({ hasError: false, error: null, code: '' });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback(this.reset, this.state.error, this.state.code);
      }
      // Klasa zywie poza LanguageProvider, wiec jezyk czytamy bezposrednio z localStorage.
      let isEN = false;
      try {
        isEN = localStorage.getItem('app-language') === 'en';
      } catch {
        isEN = false;
      }
      const txt = isEN
        ? {
            title: 'Something went wrong',
            desc: 'The app hit an unexpected error. Try refreshing the page.',
            refresh: 'Refresh page',
          }
        : {
            title: 'Coś poszło nie tak',
            desc: 'Aplikacja napotkała nieoczekiwany błąd. Spróbuj odświeżyć stronę.',
            refresh: 'Odśwież stronę',
          };

      return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-background">
          <Card className="w-full max-w-md">
            <CardHeader className="text-center">
              <div className="mx-auto h-16 w-16 rounded-2xl bg-destructive/10 flex items-center justify-center mb-4">
                <AlertTriangle className="h-8 w-8 text-destructive" />
              </div>
              <CardTitle>{txt.title}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-center">
              <p className="text-sm text-muted-foreground">
                {txt.desc}
              </p>
              {this.state.error && (
                <p className="text-xs text-muted-foreground/70 font-mono bg-muted p-2 rounded">
                  {this.state.error.message}
                </p>
              )}
              <Button
                onClick={() => window.location.reload()}
                className="w-full"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                {txt.refresh}
              </Button>
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}
