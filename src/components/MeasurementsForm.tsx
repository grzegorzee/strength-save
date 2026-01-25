import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { BodyMeasurement } from '@/hooks/useWorkoutProgress';
import { Save, User } from 'lucide-react';

interface MeasurementsFormProps {
  latestMeasurement?: BodyMeasurement;
  onSave: (measurement: Omit<BodyMeasurement, 'id'>) => void;
}

export const MeasurementsForm = ({ latestMeasurement, onSave }: MeasurementsFormProps) => {
  const [formData, setFormData] = useState({
    weight: latestMeasurement?.weight || '',
    armLeft: latestMeasurement?.armLeft || '',
    armRight: latestMeasurement?.armRight || '',
    chest: latestMeasurement?.chest || '',
    waist: latestMeasurement?.waist || '',
    hips: latestMeasurement?.hips || '',
    thighLeft: latestMeasurement?.thighLeft || '',
    thighRight: latestMeasurement?.thighRight || '',
    calfLeft: latestMeasurement?.calfLeft || '',
    calfRight: latestMeasurement?.calfRight || '',
  });

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      date: new Date().toISOString().split('T')[0],
      weight: formData.weight ? Number(formData.weight) : undefined,
      armLeft: formData.armLeft ? Number(formData.armLeft) : undefined,
      armRight: formData.armRight ? Number(formData.armRight) : undefined,
      chest: formData.chest ? Number(formData.chest) : undefined,
      waist: formData.waist ? Number(formData.waist) : undefined,
      hips: formData.hips ? Number(formData.hips) : undefined,
      thighLeft: formData.thighLeft ? Number(formData.thighLeft) : undefined,
      thighRight: formData.thighRight ? Number(formData.thighRight) : undefined,
      calfLeft: formData.calfLeft ? Number(formData.calfLeft) : undefined,
      calfRight: formData.calfRight ? Number(formData.calfRight) : undefined,
    });
  };

  const measurementFields = [
    { key: 'weight', label: 'Waga (kg)', description: 'Rano, na czczo' },
    { key: 'armLeft', label: 'Ramię lewe (cm)', description: 'Na szczycie bicepsa' },
    { key: 'armRight', label: 'Ramię prawe (cm)', description: 'Na szczycie bicepsa' },
    { key: 'chest', label: 'Klatka piersiowa (cm)', description: '1cm powyżej linii sutków' },
    { key: 'waist', label: 'Talia (cm)', description: 'W najwęższym miejscu' },
    { key: 'hips', label: 'Biodra (cm)', description: 'W najszerszym miejscu' },
    { key: 'thighLeft', label: 'Udo lewe (cm)', description: 'W najszerszym miejscu' },
    { key: 'thighRight', label: 'Udo prawe (cm)', description: 'W najszerszym miejscu' },
    { key: 'calfLeft', label: 'Łydka lewa (cm)', description: 'W najszerszym miejscu' },
    { key: 'calfRight', label: 'Łydka prawa (cm)', description: 'W najszerszym miejscu' },
  ];

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
            <User className="h-6 w-6 text-primary" />
          </div>
          <div>
            <CardTitle>Pomiary ciała</CardTitle>
            <CardDescription>Uzupełnij pola pomiarowe</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {measurementFields.map((field) => (
              <div key={field.key} className="space-y-2">
                <Label htmlFor={field.key} className="text-sm font-medium">
                  {field.label}
                </Label>
                <Input
                  id={field.key}
                  type="number"
                  step="0.1"
                  placeholder={field.description}
                  value={formData[field.key as keyof typeof formData]}
                  onChange={(e) => handleChange(field.key, e.target.value)}
                  className="h-11"
                />
              </div>
            ))}
          </div>
          <Button type="submit" className="w-full" size="lg">
            <Save className="h-4 w-4 mr-2" />
            Zapisz pomiary
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};
