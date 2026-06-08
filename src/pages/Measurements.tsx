import { useCurrentUser } from '@/contexts/UserContext';
import { useFirebaseWorkouts } from '@/hooks/useFirebaseWorkouts';
import { useToast } from '@/hooks/use-toast';
import { MeasurementsForm } from '@/components/MeasurementsForm';
import { DataManagement } from '@/components/DataManagement';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { parseLocalDate } from '@/lib/utils';
import { useTranslation } from '@/contexts/LanguageContext';
import { useUnit } from '@/contexts/UnitContext';

// Osobny ekran „Pomiary ciała" (przeniesiony z zakładki w Analityce do menu).
const Measurements = () => {
  const { uid } = useCurrentUser();
  const { measurements, addMeasurement, getLatestMeasurement, exportData, importData, cleanupEmptyWorkouts } = useFirebaseWorkouts(uid);
  const { toast } = useToast();
  const { t } = useTranslation();
  const { fmt } = useUnit();

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

  return (
    <div className="space-y-6">
      <MeasurementsForm latestMeasurement={latestMeasurement} onSave={handleSave} />
      <DataManagement onExport={exportData} onImport={importData} onCleanup={cleanupEmptyWorkouts} />

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
                <div key={m.id} className="flex items-center justify-between rounded-lg bg-muted/50 p-3">
                  <span className="text-sm font-medium">
                    {parseLocalDate(m.date).toLocaleDateString('pl-PL', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </span>
                  <div className="flex items-center gap-4 text-sm">
                    {m.weight && <span>{t('measurements.weightShort')}: <strong>{fmt(m.weight)}</strong></span>}
                    {m.chest && <span className="hidden sm:inline">{t('measurements.chestShort')}: <strong>{m.chest} cm</strong></span>}
                    {m.waist && <span className="hidden sm:inline">{t('measurements.waistShort')}: <strong>{m.waist} cm</strong></span>}
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
