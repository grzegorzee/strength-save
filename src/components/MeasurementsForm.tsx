import { useEffect, useRef, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { BodyMeasurement } from '@/types';
import { Camera, Save, User, X } from 'lucide-react';
import { formatLocalDate, parseLocalDate } from '@/lib/utils';
import { useTranslation } from '@/contexts/LanguageContext';
import { useUnit } from '@/contexts/UnitContext';
import { dateLocale } from '@/i18n';
import { validateMeasurement } from '@/lib/measurement-validation';
import { parseDecimalInput } from '@/lib/decimal-input';
import { PhotoCropDialog } from '@/components/PhotoCropDialog';

interface MeasurementsFormProps {
  latestMeasurement?: BodyMeasurement;
  onSave: (measurement: Omit<BodyMeasurement, 'id' | 'userId'>, photoFile?: File | null) => void;
  /** T13a: sekcja zdjęcia sylwetki — tylko przy włączonym feature bodyPhotos (default: wyłączona). */
  photosEnabled?: boolean;
}

export const MeasurementsForm = ({ latestMeasurement, onSave, photosEnabled = false }: MeasurementsFormProps) => {
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
  const [validationError, setValidationError] = useState(false);
  // T13a: opcjonalne zdjęcie sylwetki — zwykły input file (w WKWebView natywny
  // sheet Aparat/Biblioteka, bez pluginu Capacitor). Upload robi rodzic.
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreviewUrl, setPhotoPreviewUrl] = useState<string | null>(null);
  // WP-D D3: wybrany plik idzie najpierw do kadrowania; photoFile ustawia
  // dopiero potwierdzony kadr. Anulowanie = powrót bez zdjęcia.
  const [cropFile, setCropFile] = useState<File | null>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!photoFile) {
      setPhotoPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(photoFile);
    setPhotoPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [photoFile]);

  const handleChange = (field: string, value: string) => {
    setValidationError(false);
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Z178: przecinek legalny (Number("82,4")=NaN blokował zapis pomiarów).
    // Pole nieparsowalne → NaN, które walidacja odrzuca jako błąd (nie trafia do danych).
    const parseField = (raw: string, convert: (n: number) => number): number | undefined => {
      if (!raw) return undefined;
      const n = parseDecimalInput(raw);
      return n === null ? Number.NaN : convert(n);
    };
    const measurement = {
      date: formatLocalDate(new Date()),
      weight: parseField(formData.weight, fromInput),
      armLeft: parseField(formData.armLeft, fromInputLength),
      armRight: parseField(formData.armRight, fromInputLength),
      chest: parseField(formData.chest, fromInputLength),
      waist: parseField(formData.waist, fromInputLength),
      hips: parseField(formData.hips, fromInputLength),
      thighLeft: parseField(formData.thighLeft, fromInputLength),
      thighRight: parseField(formData.thighRight, fromInputLength),
      calfLeft: parseField(formData.calfLeft, fromInputLength),
      calfRight: parseField(formData.calfRight, fromInputLength),
    };
    // WP-D D2: zdjęcie jest pełnoprawną treścią wpisu — zapis bez pól
    // liczbowych przechodzi, gdy jest fotka (wpis tylko-zdjęcie).
    if (!validateMeasurement(measurement, { hasPhoto: photoFile !== null }).valid) {
      setValidationError(true);
      return;
    }
    onSave(measurement, photoFile ?? undefined);
    setPhotoFile(null);
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
                  type="text"
                  inputMode="decimal"
                  placeholder={field.description}
                  value={formData[field.key as keyof typeof formData]}
                  onChange={(e) => handleChange(field.key, e.target.value)}
                  className="h-11"
                />
              </div>
            ))}
          </div>
          {photosEnabled && (
            <div className="space-y-2">
              <Label className="text-sm font-medium">{t('measurements.photo.addLabel')}</Label>
              <p className="text-xs text-muted-foreground">{t('measurements.photo.hint')}</p>
              <input
                ref={photoInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                data-testid="measurement-photo-input"
                onChange={(e) => {
                  const file = e.target.files?.[0] ?? null;
                  e.target.value = '';
                  // WP-D D3: najpierw kadrowanie, photoFile ustawia dopiero kadr.
                  if (file) setCropFile(file);
                }}
              />
              {photoFile ? (
                <div className="flex items-center gap-3">
                  {photoPreviewUrl && (
                    <img
                      src={photoPreviewUrl}
                      alt={t('measurements.photo.preview')}
                      className="h-24 w-24 rounded-lg object-cover"
                    />
                  )}
                  <Button type="button" variant="outline" size="sm" onClick={() => setPhotoFile(null)}>
                    <X className="h-4 w-4 mr-2" />
                    {t('measurements.photo.remove')}
                  </Button>
                </div>
              ) : (
                <Button type="button" variant="outline" onClick={() => photoInputRef.current?.click()}>
                  <Camera className="h-4 w-4 mr-2" />
                  {t('measurements.photo.addButton')}
                </Button>
              )}
            </div>
          )}
          {validationError && <p role="alert" className="text-sm text-destructive">{t('measurements.saveErrorDesc')}</p>}
          <Button type="submit" className="w-full" size="lg">
            <Save className="h-4 w-4 mr-2" />
            {t('measurements.saveButton')}
          </Button>
        </form>
        {/* WP-D D3: kadrowanie przed uploadem — zawsze zamontowany, sterowany open. */}
        <PhotoCropDialog
          open={cropFile !== null}
          file={cropFile}
          onCancel={() => setCropFile(null)}
          onCropped={(blob) => {
            setPhotoFile(new File([blob], 'sylwetka.jpg', { type: 'image/jpeg' }));
            setCropFile(null);
          }}
        />
      </CardContent>
    </Card>
  );
};
