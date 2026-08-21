import { useEffect, useState } from 'react';
import { collection, getDocs, limit, orderBy, query } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, ShieldCheck } from 'lucide-react';
import { useTranslation } from '@/contexts/LanguageContext';
import { dateLocale } from '@/i18n';
import { useToast } from '@/hooks/use-toast';
import { formatLocalDate } from '@/lib/utils';
import { buildConsentsCsv, toConsentRow, type ConsentRow } from '@/lib/consents-csv';

// Pakiet prawny v2: log zgód (kolekcja consents, pisze tylko recordConsent).
// Widok ostatnich wpisów + eksport CSV całego logu z datą, godziną (UTC) i IP
// (wymóg usera 2026-08-11: każda zgoda wyciągalna do CSV).

const CSV_EXPORT_LIMIT = 10000;
const RECENT_LIMIT = 50;

export const AdminConsentsLog = ({ userEmailByUid }: { userEmailByUid: Record<string, string> }) => {
  const { t, lang } = useTranslation();
  const { toast } = useToast();
  const [rows, setRows] = useState<ConsentRow[]>([]);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const snap = await getDocs(query(
          collection(db, 'consents'),
          orderBy('createdAt', 'desc'),
          limit(RECENT_LIMIT),
        ));
        setRows(snap.docs.map((docSnap) => toConsentRow(docSnap.id, docSnap.data())));
      } catch {
        // Brak wpisów albo brak uprawnień — sekcja zostaje pusta, bez crashowania panelu.
      }
    };
    void load();
  }, []);

  const exportCsv = async () => {
    setExporting(true);
    try {
      const snap = await getDocs(query(
        collection(db, 'consents'),
        orderBy('createdAt', 'desc'),
        limit(CSV_EXPORT_LIMIT),
      ));
      const all = snap.docs.map((docSnap) => toConsentRow(docSnap.id, docSnap.data()));
      const csv = buildConsentsCsv(all, userEmailByUid);
      // BOM, żeby Excel poprawnie otwierał UTF-8 (polskie znaki w treści oświadczeń).
      const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `strength-save-consents-${formatLocalDate(new Date())}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast({ title: t('admin.consents.exportDone', { count: all.length }) });
    } catch {
      toast({ title: t('admin.consents.exportError'), variant: 'destructive' });
    } finally {
      setExporting(false);
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3 flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-base flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-primary" />
          {t('admin.consents.title')}
        </CardTitle>
        <Button size="sm" variant="outline" onClick={() => void exportCsv()} disabled={exporting} data-testid="admin-consents-export">
          <Download className="h-3.5 w-3.5 mr-1.5" />
          {t('admin.consents.exportCsv')}
        </Button>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t('admin.consents.empty')}</p>
        ) : (
          <div className="space-y-1.5 max-h-80 overflow-y-auto">
            {rows.map((row) => (
              <div key={row.id} className="text-xs flex flex-wrap items-baseline gap-x-2 gap-y-0.5 border-b border-border/50 pb-1.5">
                <span className="text-muted-foreground tabular-nums">
                  {row.createdAt ? row.createdAt.toLocaleString(dateLocale(lang)) : '-'}
                </span>
                <span className="font-medium">{userEmailByUid[row.uid] ?? row.uid}</span>
                <span className="uppercase tracking-wide">{row.type}</span>
                <span className={row.action === 'granted' ? 'text-fitness-success' : 'text-fitness-warning'}>{row.action}</span>
                <span className="text-muted-foreground">v{row.docVersion} · {row.channel} · {row.ip}</span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
