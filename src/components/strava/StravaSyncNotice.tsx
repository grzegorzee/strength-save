import { AlertTriangle, Loader2, RefreshCw, Link2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTranslation } from '@/contexts/LanguageContext';
import { dateLocale } from '@/i18n';
import { stravaSyncHealth } from '@/lib/strava-sync-status';
import type { StravaConnection } from '@/types/strava';

interface StravaSyncNoticeProps {
  connection: StravaConnection;
  onReconnect: () => void;
  /** Brak = ekran bez ręcznego syncu (zakładka Strava, T7): wskazujemy Profil. */
  onRetry?: () => void;
  retrying?: boolean;
  retryDisabled?: boolean;
}

/**
 * F5b (2026-09-29): sync Stravy stał od 22.08 (403 Application Inactive, job
 * wstrzymany), a UI mówiło „Połączono". Zasada 6: każdy stan błędu ma wyjście.
 * Cofnięty dostęp = ponowne połączenie (dane zostają, callback kasuje je tylko
 * przy zmianie konta Strava); pozostałe = ponowienie tam, gdzie jest ręczny sync.
 */
export const StravaSyncNotice = ({ connection, onReconnect, onRetry, retrying, retryDisabled }: StravaSyncNoticeProps) => {
  const { t, lang } = useTranslation();
  if (!connection.connected) return null;
  const health = stravaSyncHealth(connection.lastSync, connection.syncError, Date.now());
  if (health.state === 'ok') return null;

  const lastSyncMs = connection.lastSync ? new Date(connection.lastSync).getTime() : NaN;
  const lastSyncLabel = Number.isFinite(lastSyncMs)
    ? new Date(lastSyncMs).toLocaleDateString(dateLocale(lang), { day: 'numeric', month: 'short', year: 'numeric' })
    : null;
  const body = health.state === 'stale'
    ? t('strava.syncNotice.stale', { days: String(health.days) })
    : health.kind === 'app_inactive'
      ? t('strava.syncNotice.appInactive')
      : health.kind === 'reauth_required'
        ? t('strava.syncNotice.reauth')
        : t('strava.syncNotice.unavailable');
  const needsReconnect = health.state === 'error' && health.kind === 'reauth_required';

  return (
    <div
      role="status"
      data-testid="strava-sync-notice"
      className="space-y-2 rounded-xl border border-fitness-warning/30 bg-fitness-warning/10 px-3 py-3 text-sm"
    >
      <p className="flex items-center gap-2 font-semibold text-fitness-warning">
        <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden />
        {t('strava.syncNotice.title')}
      </p>
      <p>{body}</p>
      {lastSyncLabel && <p className="text-xs text-muted-foreground">{t('strava.syncNotice.lastSync', { date: lastSyncLabel })}</p>}
      {needsReconnect ? (
        <Button variant="outline" size="sm" className="min-h-11" onClick={onReconnect}>
          <Link2 className="mr-2 h-4 w-4" aria-hidden />
          {t('strava.syncNotice.reconnect')}
        </Button>
      ) : onRetry ? (
        <Button variant="outline" size="sm" className="min-h-11" onClick={onRetry} disabled={retrying || retryDisabled}>
          {retrying ? <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden /> : <RefreshCw className="mr-2 h-4 w-4" aria-hidden />}
          {t('strava.syncNotice.retry')}
        </Button>
      ) : (
        <p className="text-xs text-muted-foreground">{t('strava.syncNotice.where')}</p>
      )}
    </div>
  );
};
