import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { BodyMeasurement } from '@/types';
import { Save, User } from 'lucide-react';
import { formatLocalDate, parseLocalDate } from '@/lib/utils';
import { useTranslation } from '@/contexts/LanguageContext';

interface MeasurementsFormProps {
  latestMeasurement?: BodyMeasurement;
  onSave: (measurement: Omit<BodyMeasurement, 'id' | 'userId'>) => void;
}

export const MeasurementsForm = ({ latestMeasurement, onSave }: MeasurementsFormProps) => {
  const { t } = useTranslation();
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
      date: formatLocalDate(new Date()),
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
    { key: 'weight', label: t('measurements.field.weight'), description: t('measurements.hint.fasting') },
    { key: 'armLeft', label: t('measurements.field.armLeft'), description: t('measurements.hint.bicepsPeak') },
    { key: 'armRight', label: t('measurements.field.armRight'), description: t('measurements.hint.bicepsPeak') },
    { key: 'chest', label: t('measurements.field.chest'), description: t('measurements.hint.aboveNipples') },
    { key: 'waist', label: t('measurements.field.waist'), description: t('measurements.hint.narrowest') },
    { key: 'hips', label: t('measurements.field.hips'), description: t('measurements.hint.widest') },
    { key: 'thighLeft', label: t('measurements.field.thighLeft'), description: t('measurements.hint.widest') },
    { key: 'thighRight', label: t('measurements.field.thighRight'), description: t('measurements.hint.widest') },
    { key: 'calfLeft', label: t('measurements.field.calfLeft'), description: t('measurements.hint.widest') },
    { key: 'calfRight', label: t('measurements.field.calfRight'), description: t('measurements.hint.widest') },
  ];

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
            <User className="h-6 w-6 text-primary" />
          </div>
          <div>
            <CardTitle>{t('nav.measurements')}</CardTitle>
            <CardDescription>
              {latestMeasurement ? (
                <>{t('measurements.lastMeasurement', { date: parseLocalDate(latestMeasurement.date).toLocaleDateString('pl-PL', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric'
                }) })}</>
              ) : (
                t('measurements.noMeasurements')
              )}
            </CardDescription>
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
            {t('measurements.saveButton')}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};
