import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { BodyMeasurement } from '@/types';
import { Save, User } from 'lucide-react';
import { formatLocalDate, parseLocalDate } from '@/lib/utils';
import { useTranslation } from '@/contexts/LanguageContext';
import { useUnit } from '@/contexts/UnitContext';
import { dateLocale } from '@/i18n';

interface MeasurementsFormProps {
  latestMeasurement?: BodyMeasurement;
  onSave: (measurement: Omit<BodyMeasurement, 'id' | 'userId'>) => void;
}

export const MeasurementsForm = ({ latestMeasurement, onSave }: MeasurementsFormProps) => {
  const { t, lang } = useTranslation();
  const { unit, lengthUnit, toDisplay, fromInput, toDisplayLength, fromInputLength } = useUnit();
  const [formData, setFormData] = useState({
    weight: latestMeasurement?.weight != null
      ? String(Number(toDisplay(latestMeasurement.weight).toFixed(1)))
      : '',
    armLeft: latestMeasurement?.armLeft != null ? String(Number(toDisplayLength(latestMeasurement.armLeft).toFixed(1))) : '',
    armRight: latestMeasurement?.armRight != null ? String(Number(toDisplayLength(latestMeasurement.armRight).toFixed(1))) : '',
    chest: latestMeasurement?.chest != null ? String(Number(toDisplayLength(latestMeasurement.chest).toFixed(1))) : '',
    waist: latestMeasurement?.waist != null ? String(Number(toDisplayLength(latestMeasurement.waist).toFixed(1))) : '',
    hips: latestMeasurement?.hips != null ? String(Number(toDisplayLength(latestMeasurement.hips).toFixed(1))) : '',
    thighLeft: latestMeasurement?.thighLeft != null ? String(Number(toDisplayLength(latestMeasurement.thighLeft).toFixed(1))) : '',
    thighRight: latestMeasurement?.thighRight != null ? String(Number(toDisplayLength(latestMeasurement.thighRight).toFixed(1))) : '',
    calfLeft: latestMeasurement?.calfLeft != null ? String(Number(toDisplayLength(latestMeasurement.calfLeft).toFixed(1))) : '',
    calfRight: latestMeasurement?.calfRight != null ? String(Number(toDisplayLength(latestMeasurement.calfRight).toFixed(1))) : '',
  });

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      date: formatLocalDate(new Date()),
      weight: formData.weight ? fromInput(Number(formData.weight)) : undefined,
      armLeft: formData.armLeft ? fromInputLength(Number(formData.armLeft)) : undefined,
      armRight: formData.armRight ? fromInputLength(Number(formData.armRight)) : undefined,
      chest: formData.chest ? fromInputLength(Number(formData.chest)) : undefined,
      waist: formData.waist ? fromInputLength(Number(formData.waist)) : undefined,
      hips: formData.hips ? fromInputLength(Number(formData.hips)) : undefined,
      thighLeft: formData.thighLeft ? fromInputLength(Number(formData.thighLeft)) : undefined,
      thighRight: formData.thighRight ? fromInputLength(Number(formData.thighRight)) : undefined,
      calfLeft: formData.calfLeft ? fromInputLength(Number(formData.calfLeft)) : undefined,
      calfRight: formData.calfRight ? fromInputLength(Number(formData.calfRight)) : undefined,
    });
  };

  const measurementFields = [
    { key: 'weight', label: t('measurements.field.weight', { unit }), description: t('measurements.hint.fasting') },
    { key: 'armLeft', label: t('measurements.field.armLeft', { unit: lengthUnit }), description: t('measurements.hint.bicepsPeak') },
    { key: 'armRight', label: t('measurements.field.armRight', { unit: lengthUnit }), description: t('measurements.hint.bicepsPeak') },
    { key: 'chest', label: t('measurements.field.chest', { unit: lengthUnit }), description: t('measurements.hint.aboveNipples') },
    { key: 'waist', label: t('measurements.field.waist', { unit: lengthUnit }), description: t('measurements.hint.narrowest') },
    { key: 'hips', label: t('measurements.field.hips', { unit: lengthUnit }), description: t('measurements.hint.widest') },
    { key: 'thighLeft', label: t('measurements.field.thighLeft', { unit: lengthUnit }), description: t('measurements.hint.widest') },
    { key: 'thighRight', label: t('measurements.field.thighRight', { unit: lengthUnit }), description: t('measurements.hint.widest') },
    { key: 'calfLeft', label: t('measurements.field.calfLeft', { unit: lengthUnit }), description: t('measurements.hint.widest') },
    { key: 'calfRight', label: t('measurements.field.calfRight', { unit: lengthUnit }), description: t('measurements.hint.widest') },
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
                <>{t('measurements.lastMeasurement', { date: parseLocalDate(latestMeasurement.date).toLocaleDateString(dateLocale(lang), {
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
