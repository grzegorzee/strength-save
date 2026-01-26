import { MeasurementsForm } from '@/components/MeasurementsForm';
import { DataManagement } from '@/components/DataManagement';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useFirebaseWorkouts } from '@/hooks/useFirebaseWorkouts';
import { useToast } from '@/hooks/use-toast';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

const Measurements = () => {
  const { measurements, addMeasurement, getLatestMeasurement, exportData, importData } = useFirebaseWorkouts();
  const { toast } = useToast();
  
  const latestMeasurement = getLatestMeasurement();

  const handleSave = async (measurement: Parameters<typeof addMeasurement>[0]) => {
    await addMeasurement(measurement);
    toast({
      title: "Pomiary zapisane!",
      description: `Dane z dnia ${measurement.date} zostały zapisane.`,
    });
  };

  // Calculate trend for weight
  const getWeightTrend = () => {
    if (measurements.length < 2) return null;
    const sorted = [...measurements]
      .filter(m => m.weight)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    
    if (sorted.length < 2) return null;
    
    const diff = (sorted[0].weight || 0) - (sorted[1].weight || 0);
    if (diff > 0) return { direction: 'up', value: diff };
    if (diff < 0) return { direction: 'down', value: Math.abs(diff) };
    return { direction: 'same', value: 0 };
  };

  const weightTrend = getWeightTrend();

  return (
    <div className="space-y-6">
      <MeasurementsForm 
        latestMeasurement={latestMeasurement}
        onSave={handleSave}
      />

      {/* Data Management */}
      <DataManagement onExport={exportData} onImport={importData} />

      {/* History */}
      {measurements.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              Historia pomiarów
              {weightTrend && (
                <Badge variant="outline" className="font-normal">
                  {weightTrend.direction === 'up' && <TrendingUp className="h-4 w-4 text-destructive mr-1" />}
                  {weightTrend.direction === 'down' && <TrendingDown className="h-4 w-4 text-fitness-success mr-1" />}
                  {weightTrend.direction === 'same' && <Minus className="h-4 w-4 mr-1" />}
                  {weightTrend.value > 0 && `${weightTrend.value.toFixed(1)} kg`}
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {measurements
                .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                .slice(0, 5)
                .map((m) => (
                  <div key={m.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <span className="text-sm font-medium">
                      {new Date(m.date).toLocaleDateString('pl-PL', { 
                        day: 'numeric', 
                        month: 'long', 
                        year: 'numeric' 
                      })}
                    </span>
                    <div className="flex items-center gap-4 text-sm">
                      {m.weight && <span>Waga: <strong>{m.weight} kg</strong></span>}
                      {m.chest && <span className="hidden sm:inline">Klatka: <strong>{m.chest} cm</strong></span>}
                      {m.waist && <span className="hidden sm:inline">Talia: <strong>{m.waist} cm</strong></span>}
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
