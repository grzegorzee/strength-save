import { useCallback, useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertTriangle, CreditCard, Loader2 } from 'lucide-react';
import { useTranslation } from '@/contexts/LanguageContext';
import { dateLocale, type TranslationKey } from '@/i18n';
import { adminSubscriptionMetrics, type SubscriptionMetricsResponse, type SubscriptionMetricsView } from '@/lib/registration-api';

// 2026-09-30: karta „Subskrypcje” w panelu admina. Liczby liczy RevenueCat
// (API v2 overview metrics), backend trzyma je w cache max 1 h, więc wejście do
// panelu nie odpytuje RC za każdym razem. Zasada 6: każdy błąd ma „Spróbuj ponownie”.

type MetricKey = 'activeTrials' | 'activeSubscriptions' | 'mrr' | 'revenue28d' | 'newCustomers28d';

const ROWS: Array<{ key: MetricKey; label: TranslationKey; money: boolean }> = [
  { key: 'activeTrials', label: 'admin.subs.activeTrials', money: false },
  { key: 'activeSubscriptions', label: 'admin.subs.activeSubscriptions', money: false },
  { key: 'mrr', label: 'admin.subs.mrr', money: true },
  { key: 'revenue28d', label: 'admin.subs.revenue28d', money: true },
  { key: 'newCustomers28d', label: 'admin.subs.newCustomers28d', money: false },
];

export const AdminSubscriptionMetricsCard = () => {
  const { t, lang } = useTranslation();
  const [data, setData] = useState<SubscriptionMetricsResponse | null>(null);
  const [failed, setFailed] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setData(await adminSubscriptionMetrics());
      setFailed(false);
    } catch {
      setFailed(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const locale = dateLocale(lang);
  const format = (metrics: SubscriptionMetricsView, key: MetricKey, money: boolean) => {
    const value = metrics[key];
    if (value === null || value === undefined) return t('admin.subs.noValue');
    if (!money) return value.toLocaleString(locale);
    return new Intl.NumberFormat(locale, { style: 'currency', currency: metrics.currency || 'PLN' }).format(value);
  };

  const metrics = data?.metrics ?? null;
  const errorCode = failed ? 'callable' : data?.error ?? null;
  const retry = (
    <Button variant="outline" size="sm" disabled={loading} onClick={() => void load()}>
      {t('admin.subs.retry')}
    </Button>
  );

  return (
    <Card data-testid="admin-subscription-metrics">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base font-heading font-bold uppercase tracking-tight">
          <CreditCard className="h-4 w-4 text-primary" /> {t('admin.subs.title')}
        </CardTitle>
        <CardDescription>{t('admin.subs.desc')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {loading && !data && !failed ? (
          <div className="flex justify-center py-4"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
        ) : (
          <>
            {errorCode && (
              <div
                role="alert"
                className="flex gap-2 rounded-lg border border-fitness-warning bg-fitness-warning/10 p-3 text-sm text-fitness-warning"
              >
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                <p className="min-w-0">
                  {metrics
                    ? t('admin.subs.staleError', { code: errorCode })
                    : t('admin.subs.error', { code: errorCode })}
                </p>
              </div>
            )}
            {metrics ? (
              <dl className="grid grid-cols-2 gap-2">
                {ROWS.map((row) => (
                  <div key={row.key} data-testid={`subs-metric-${row.key}`} className="min-w-0 rounded-lg bg-surface-low p-3">
                    <dt className="text-xs text-muted-foreground">{t(row.label)}</dt>
                    <dd className="text-lg font-bold tabular-nums">{format(metrics, row.key, row.money)}</dd>
                  </div>
                ))}
              </dl>
            ) : !errorCode ? (
              <p className="text-sm text-muted-foreground">{t('admin.subs.noData')}</p>
            ) : null}
            {data?.fetchedAt && metrics && (
              <p className="text-xs text-muted-foreground">
                {t('admin.subs.asOf', { at: new Date(data.fetchedAt).toLocaleString(locale, { dateStyle: 'short', timeStyle: 'short' }) })}
              </p>
            )}
            {(errorCode || !metrics) && retry}
          </>
        )}
      </CardContent>
    </Card>
  );
};
