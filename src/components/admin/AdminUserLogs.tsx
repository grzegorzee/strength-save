import { useEffect, useState } from 'react';
import { Loader2, Mail, ShieldCheck } from 'lucide-react';
import { adminGetUserLogs, type AdminLogEntry } from '@/lib/registration-api';
import { dateLocale } from '@/i18n';
import { useTranslation } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';

// Logi per-użytkownik: maile (notification_logs) + zdarzenia auth (auth_audit_logs).
export const AdminUserLogs = ({ uid }: { uid: string }) => {
  const { lang } = useTranslation();
  const [tab, setTab] = useState<'mail' | 'auth'>('mail');
  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState<AdminLogEntry[]>([]);
  const [authLogs, setAuthLogs] = useState<AdminLogEntry[]>([]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    adminGetUserLogs(uid)
      .then((res) => { if (!cancelled) { setNotifications(res.notifications); setAuthLogs(res.authLogs); } })
      .catch(() => { if (!cancelled) { setNotifications([]); setAuthLogs([]); } })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [uid]);

  const fmt = (iso?: string) => iso ? new Date(iso).toLocaleString(dateLocale(lang), { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—';

  return (
    <div className="rounded-lg bg-surface-lowest p-3 space-y-2">
      <div className="flex gap-1.5">
        <button onClick={() => setTab('mail')} className={cn('flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wide', tab === 'mail' ? 'bg-fitness-cyan text-background' : 'bg-surface-highest text-muted-foreground')}>
          <Mail className="h-3 w-3" /> Maile ({notifications.length})
        </button>
        <button onClick={() => setTab('auth')} className={cn('flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wide', tab === 'auth' ? 'bg-fitness-cyan text-background' : 'bg-surface-highest text-muted-foreground')}>
          <ShieldCheck className="h-3 w-3" /> Logowania ({authLogs.length})
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-4"><Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /></div>
      ) : tab === 'mail' ? (
        notifications.length === 0 ? <p className="text-xs text-muted-foreground py-2 text-center">Brak maili.</p> : (
          <div className="space-y-1 max-h-56 overflow-y-auto">
            {notifications.map((n) => (
              <div key={n.id} className="text-xs flex items-center justify-between gap-2 py-1.5 border-b border-surface-high/40 last:border-0">
                <span className="font-medium truncate">{String(n.type ?? '—')}</span>
                <span className={cn('shrink-0', n.error ? 'text-destructive' : 'text-fitness-success')}>{n.error ? 'błąd' : 'ok'}</span>
                <span className="shrink-0 text-muted-foreground tabular-nums">{fmt(n.createdAt)}</span>
              </div>
            ))}
          </div>
        )
      ) : (
        authLogs.length === 0 ? <p className="text-xs text-muted-foreground py-2 text-center">Brak zdarzeń.</p> : (
          <div className="space-y-1 max-h-56 overflow-y-auto">
            {authLogs.map((l) => (
              <div key={l.id} className="text-xs flex items-center justify-between gap-2 py-1.5 border-b border-surface-high/40 last:border-0">
                <span className="font-medium truncate">{String(l.eventType ?? '—')}</span>
                <span className="shrink-0 text-muted-foreground tabular-nums">{fmt(l.createdAt)}</span>
              </div>
            ))}
          </div>
        )
      )}
    </div>
  );
};
