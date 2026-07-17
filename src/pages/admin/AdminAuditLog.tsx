import { useEffect, useState } from 'react';
import { collection, getDocs, limit, orderBy, query } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollText } from 'lucide-react';
import { useTranslation } from '@/contexts/LanguageContext';
import { dateLocale } from '@/i18n';

// Z101: dziennik akcji administracyjnych (ostatnie 50; wpisy create-only).

interface AuditRow {
  id: string;
  action: string;
  targetUid: string;
  detail?: string;
  createdAt: string;
}

export const AdminAuditLog = ({ userEmailByUid }: { userEmailByUid: Record<string, string> }) => {
  const { t, lang } = useTranslation();
  const [rows, setRows] = useState<AuditRow[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const snapshot = await getDocs(query(
          collection(db, 'admin_audit_log'),
          orderBy('createdAt', 'desc'),
          limit(50),
        ));
        if (cancelled) return;
        setRows(snapshot.docs.map((doc) => ({
          id: doc.id,
          action: String(doc.get('action') ?? ''),
          targetUid: String(doc.get('targetUid') ?? ''),
          detail: doc.get('detail') as string | undefined,
          createdAt: String(doc.get('createdAt') ?? ''),
        })));
      } catch {
        if (!cancelled) setRows([]);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base font-heading font-bold uppercase tracking-tight">
          <ScrollText className="h-5 w-5" />
          {t('admin.audit.title')}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {(rows ?? []).map((row) => (
          <div key={row.id} className="rounded-lg border p-3 text-sm">
            <div className="flex items-center justify-between gap-3">
              <p className="font-medium">{row.action}</p>
              <span className="text-xs text-muted-foreground">
                {row.createdAt ? new Date(row.createdAt).toLocaleString(dateLocale(lang)) : '—'}
              </span>
            </div>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {userEmailByUid[row.targetUid] || row.targetUid}
              {row.detail ? ` · ${row.detail}` : ''}
            </p>
          </div>
        ))}
        {(rows ?? []).length === 0 && rows !== null && (
          <p className="text-sm text-muted-foreground">{t('admin.audit.empty')}</p>
        )}
      </CardContent>
    </Card>
  );
};
