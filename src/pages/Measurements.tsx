import { Suspense, lazy, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCurrentUser } from '@/contexts/UserContext';
import { useFirebaseWorkouts } from '@/hooks/useFirebaseWorkouts';
import { useToast } from '@/hooks/use-toast';
import { MeasurementsForm } from '@/components/MeasurementsForm';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, Minus, ChevronRight, Database, Ruler } from 'lucide-react';
import { EmptyState } from '@/components/EmptyState';
import { cn, parseLocalDate } from '@/lib/utils';
import { buildMeasurementSeries, MEASUREMENT_FIELDS, MEASUREMENT_FIELD_GOALS, MEASUREMENT_FIELD_LABEL_KEYS, type MeasurementField } from '@/lib/measurement-stats';
import { useTranslation } from '@/contexts/LanguageContext';
import { HealthWeightSuggestion } from '@/components/HealthWeightSuggestion';
import { useUnit } from '@/contexts/UnitContext';
import { dateLocale } from '@/i18n';

const MeasurementTrendChart = lazy(() => import('@/components/MeasurementTrendChart'));

// Kolor delty wg celu pola (Z77): talia w dół = zielona, ramię w górę = zielone, waga neutralna.
const deltaClass = (field: MeasurementField, delta: number): string => {
  const goal = MEASUREMENT_FIELD_GOALS[field];
  if (goal === 'neutral' || delta === 0) return 'text-muted-foreground';
  const isGood = goal === 'up' ? delta > 0 : delta < 0;
  return isGood ? 'text-fitness-success' : 'text-destructive';
};

// Osobny ekran „Pomiary ciała" (przeniesiony z zakładki w Analityce do menu).
const Measurements = () => {
  const { uid } = useCurrentUser();
  const navigate = useNavigate();
  const { measurements, addMeasurement, getLatestMeasurement } = useFirebaseWorkouts(uid);
  const { toast } = useToast();
  const { t, lang } = useTranslation();
  const { fmt, fmtLength } = useUnit();

  const latestMeasurement = getLatestMeasurement();

  const handleSave = async (measurement: Parameters<typeof addMeasurement>[0]) => {
    const result = await addMeasurement(measurement);
    if (result.error || !result.measurement) {
      toast({ title: t('measurements.saveErrorTitle'), description: result.error || t('measurements.saveErrorDesc'), variant: 'destructive' });
      return;
    }
    toast({ title: t('measurements.saveSuccessTitle'), description: t('measurements.saveSuccessDesc', { date: measurement.date }) });
  };

  const getWeightTrend = () => {
    const sorted = [...measurements].filter((m) => m.weight).sort((a, b) => parseLocalDate(b.date).getTime() - parseLocalDate(a.date).getTime());
    if (sorted.length < 2) return null;
    const diff = (sorted[0].weight || 0) - (sorted[1].weight || 0);
    if (diff > 0) return { direction: 'up' as const, value: diff };
    if (diff < 0) return { direction: 'down' as const, value: Math.abs(diff) };
    return { direction: 'same' as const, value: 0 };
  };

  const weightTrend = getWeightTrend();
  const recentMeasurements = [...measurements]
    .sort((a, b) => parseLocalDate(b.date).getTime() - parseLocalDate(a.date).getTime())
    .slice(0, 5);

  // Delta per pole per data (Z77) — z serii, żeby "poprzedni" znaczyło poprzedni pomiar POLA.
  const deltaByFieldDate = useMemo(() => {
    const map = new Map<string, number | null>();
    MEASUREMENT_FIELDS.forEach((field) => {
      buildMeasurementSeries(measurements, field).forEach((point) => {
        map.set(`${field}:${point.date}`, point.delta);
      });
    });
    return map;
  }, [measurements]);

  return (
    <div className="space-y-6">
      {/* Z118: propozycja wagi ze Zdrowia (istniejąca ścieżka zapisu, zawsze za zgodą) */}
      <HealthWeightSuggestion
        measurements={measurements}
        onAccept={async (sample) => {
          await handleSave({ date: sample.date, weight: Math.round(sample.kg * 10) / 10 });
        }}
      />

      <MeasurementsForm latestMeasurement={latestMeasurement} onSave={handleSave} />

      {/* Backup mieszka w Ustawieniach (Z81) — tu tylko drogowskaz, koniec zdublowanej sekcji. */}
      <Button
        variant="outline"
        className="w-full justify-between"
        onClick={() => navigate('/settings?section=data')}
      >
        <span className="flex items-center gap-2">
          <Database className="h-4 w-4 text-primary" />
          {t('measurements.backupLink')}
        </span>
        <ChevronRight className="h-4 w-4 text-muted-foreground" />
      </Button>

      {/* Z82: bez pomiarów strona kończyła się po formularzu bez słowa — zaproszenie. */}
      {measurements.length === 0 && (
        <EmptyState
          icon={Ruler}
          title={t('measurements.emptyTitle')}
          hint={t('measurements.emptyHint')}
          ctaLabel={t('measurements.emptyCta')}
          onCta={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        />
      )}

      {measurements.length > 0 && (
        <Suspense fallback={null}>
          <MeasurementTrendChart measurements={measurements} />
        </Suspense>
      )}

      {measurements.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              {t('measurements.historyTitle')}
              {weightTrend && (
                <Badge variant="outline" className="font-normal">
                  {weightTrend.direction === 'up' && <TrendingUp className="mr-1 h-4 w-4 text-destructive" />}
                  {weightTrend.direction === 'down' && <TrendingDown className="mr-1 h-4 w-4 text-fitness-success" />}
                  {weightTrend.direction === 'same' && <Minus className="mr-1 h-4 w-4" />}
                  {weightTrend.value > 0 && fmt(weightTrend.value, { decimals: 1 })}
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentMeasurements.map((m) => (
                <div key={m.id} className="rounded-lg bg-muted/50 p-3 space-y-2">
                  <span className="text-sm font-medium">
                    {parseLocalDate(m.date).toLocaleDateString(dateLocale(lang), { day: 'numeric', month: 'long', year: 'numeric' })}
                  </span>
                  {/* Wszystkie wypełnione pola wpisu + delta vs poprzedni pomiar pola (Z77) */}
                  <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-sm">
                    {MEASUREMENT_FIELDS.filter((field) => typeof m[field] === 'number').map((field) => {
                      const value = m[field] as number;
                      const delta = deltaByFieldDate.get(`${field}:${m.date}`) ?? null;
                      return (
                        <span key={field} className="whitespace-nowrap">
                          {t(MEASUREMENT_FIELD_LABEL_KEYS[field])}:{' '}
                          <strong>{field === 'weight' ? fmt(value) : fmtLength(value)}</strong>
                          {delta !== null && delta !== 0 && (
                            <span className={cn('ml-1 text-xs tabular-nums', deltaClass(field, delta))}>
                              {delta > 0 ? '+' : ''}{field === 'weight' ? fmt(delta, { decimals: 1 }) : fmtLength(delta, { decimals: 1 })}
                            </span>
                          )}
                        </span>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default Measurements;
