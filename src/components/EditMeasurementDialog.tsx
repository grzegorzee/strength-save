import { useEffect, useRef, useState } from 'react';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { LocalizedDateInput } from '@/components/LocalizedDateInput';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { PhotoCropDialog } from '@/components/PhotoCropDialog';
import { Camera, Loader2, Trash2, X } from 'lucide-react';
import { useTranslation } from '@/contexts/LanguageContext';
import { useUnit } from '@/contexts/UnitContext';
import type { BodyMeasurement } from '@/types';
import { MEASUREMENT_FIELDS, type MeasurementField } from '@/lib/measurement-stats';
import { validateMeasurement } from '@/lib/measurement-validation';
import { parseDecimalInput } from '@/lib/decimal-input';
import { composeRecordedAt, recordedAtToTimeInput } from '@/lib/measurement-time';

/** WP-M: co zrobić ze zdjęciem wpisu przy zapisie edycji. Upload robi rodzic. */
export type MeasurementPhotoChange =
  | { kind: 'keep' }
  | { kind: 'remove' }
  | { kind: 'replace'; file: File };

/** Wartości wpisu z formularza (bez zdjęcia — o nim decyduje MeasurementPhotoChange). */
export type MeasurementEditValues = Omit<BodyMeasurement, 'id' | 'userId' | 'photoUrl' | 'photoPath'>;

interface EditMeasurementDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Edytowany wpis (zamrożony snapshot z chwili otwarcia; null gdy zamknięty). */
  measurement: BodyMeasurement | null;
  /** T13a: sekcja zdjęcia tylko przy włączonym feature bodyPhotos. */
  photosEnabled?: boolean;
  onUpdate: (id: string, values: MeasurementEditValues, photo: MeasurementPhotoChange) => Promise<{ ok: boolean; error?: string }>;
  onDelete: (id: string) => Promise<{ ok: boolean; error?: string }>;
}

type FormValues = Record<MeasurementField, string>;

const emptyForm = (): FormValues =>
  Object.fromEntries(MEASUREMENT_FIELDS.map((field) => [field, ''])) as FormValues;

/**
 * WP-M: edycja istniejącego wpisu pomiaru ciała.
 * Data + godzina (-> recordedAt), 10 pól w jednostkach UI, zdjęcie
 * (zachowaj / zmień / usuń), "Usuń wpis" za ConfirmDialog. Zawsze zamontowany,
 * zamykanie wyłącznie przez open=false (lekcja builda 92).
 *
 * WP-G (X35a): Sheet od dołu (wzorzec HistoryExportSheet) zamiast Dialogu, bo
 * natywne date/time w dwóch kolumnach po 152 px rozpychały treść w poziomie
 * ("dialog lata na boki"). Data i godzina w OSOBNYCH wierszach, overflow-x-hidden,
 * min-w-0 na komórkach. Pierwszy focus na polu wagi (Radix brał pole daty i iOS
 * od razu podnosił picker).
 */
export const EditMeasurementDialog = ({ open, onOpenChange, measurement, photosEnabled = false, onUpdate, onDelete }: EditMeasurementDialogProps) => {
  const { t, lang } = useTranslation();
  const { unit, lengthUnit, toDisplay, fromInput, toDisplayLength, fromInputLength } = useUnit();
  const [formData, setFormData] = useState<FormValues>(emptyForm);
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [photo, setPhoto] = useState<MeasurementPhotoChange>({ kind: 'keep' });
  const [cropFile, setCropFile] = useState<File | null>(null);
  const [newPhotoPreviewUrl, setNewPhotoPreviewUrl] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const fieldRefs = useRef<Partial<Record<MeasurementField, HTMLInputElement | null>>>({});

  // WP-G: focus na wadze; wpis bez wagi -> pierwsze wypełnione pole liczbowe;
  // wpis bez liczb (tylko zdjęcie) -> waga. Nigdy pole daty.
  const focusFirstNumericField = () => {
    const target = measurement && typeof measurement.weight !== 'number'
      ? MEASUREMENT_FIELDS.find((field) => typeof measurement[field] === 'number') ?? 'weight'
      : 'weight';
    fieldRefs.current[target]?.focus();
  };

  // Hydracja formularza przy otwarciu (wartości kg/cm -> jednostki UI, jak MeasurementsForm).
  useEffect(() => {
    if (!open || !measurement) return;
    const next = emptyForm();
    MEASUREMENT_FIELDS.forEach((field) => {
      const value = measurement[field];
      if (typeof value !== 'number') return;
      const display = field === 'weight' ? toDisplay(value) : toDisplayLength(value);
      next[field] = String(Number(display.toFixed(1)));
    });
    setFormData(next);
    setDate(measurement.date);
    setTime(typeof measurement.recordedAt === 'number' ? recordedAtToTimeInput(measurement.recordedAt) : '');
    setPhoto({ kind: 'keep' });
    setCropFile(null);
    setError(null);
    setDeleteConfirmOpen(false);
    // Hydracja tylko na otwarcie/zmianę wpisu; konwertery jednostek są stabilne w czasie edycji.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, measurement]);

  useEffect(() => {
    if (photo.kind !== 'replace') {
      setNewPhotoPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(photo.file);
    setNewPhotoPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [photo]);

  const handleChange = (field: MeasurementField, value: string) => {
    setError(null);
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  // Z178: przecinek legalny; nieparsowalne pole -> NaN, które walidacja odrzuca.
  const parseField = (raw: string, convert: (n: number) => number): number | undefined => {
    if (!raw) return undefined;
    const n = parseDecimalInput(raw);
    return n === null ? Number.NaN : convert(n);
  };

  const buildValues = (): MeasurementEditValues => {
    const values: MeasurementEditValues = { date };
    MEASUREMENT_FIELDS.forEach((field) => {
      values[field] = parseField(formData[field], field === 'weight' ? fromInput : fromInputLength);
    });
    const recordedAt = composeRecordedAt(date, time);
    if (recordedAt !== undefined) values.recordedAt = recordedAt;
    return values;
  };

  const currentPhotoUrl = photo.kind === 'replace'
    ? newPhotoPreviewUrl
    : photo.kind === 'keep' && measurement?.photoUrl ? measurement.photoUrl : null;
  const hasPhoto = photo.kind === 'replace' || (photo.kind === 'keep' && Boolean(measurement?.photoUrl));

  const handleSave = async () => {
    if (!measurement) return;
    const values = buildValues();
    if (!validateMeasurement(values, { hasPhoto }).valid) {
      setError(t('measurements.saveErrorDesc'));
      return;
    }
    setSaving(true);
    setError(null);
    const result = await onUpdate(measurement.id, values, photo);
    setSaving(false);
    if (!result.ok) {
      setError(result.error || t('measurements.saveErrorDesc'));
      return;
    }
    onOpenChange(false);
  };

  const handleDelete = async () => {
    if (!measurement) return;
    setSaving(true);
    const result = await onDelete(measurement.id);
    setSaving(false);
    if (!result.ok) {
      setError(result.error || t('measurements.deleteErrorDesc'));
      return;
    }
    onOpenChange(false);
  };

  const fieldLabel = (field: MeasurementField): string =>
    t(`measurements.field.${field}` as Parameters<typeof t>[0], { unit: field === 'weight' ? unit : lengthUnit });

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="bottom-[var(--keyboard-inset,0px)] flex max-h-[calc(100dvh-var(--keyboard-inset,0px))] flex-col gap-4 overflow-y-auto overflow-x-hidden rounded-t-2xl pb-[calc(1.5rem+env(safe-area-inset-bottom))]"
        data-testid="measurement-edit-sheet"
        onOpenAutoFocus={(e) => { e.preventDefault(); focusFirstNumericField(); }}
      >
        <SheetHeader className="text-left">
          <SheetTitle className="font-heading uppercase tracking-tight">{t('measurements.editTitle')}</SheetTitle>
          <SheetDescription>{t('measurements.editSubtitle')}</SheetDescription>
        </SheetHeader>

        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}

        <div className="grid min-w-0 grid-cols-2 gap-3">
          {MEASUREMENT_FIELDS.map((field) => (
            <div key={field} className="min-w-0 space-y-1">
              <Label htmlFor={`measurement-edit-${field}`} className="block text-xs font-medium">{fieldLabel(field)}</Label>
              <Input
                id={`measurement-edit-${field}`}
                ref={(el) => { fieldRefs.current[field] = el; }}
                type="text"
                inputMode="decimal"
                className="w-full min-w-0"
                value={formData[field]}
                onChange={(e) => handleChange(field, e.target.value)}
                data-testid={`measurement-edit-${field}`}
              />
            </div>
          ))}
        </div>

        {/* Data + godzina -> recordedAt: osobne wiersze na pełną szerokość (WP-G). */}
        <div className="w-full min-w-0" data-testid="measurement-edit-date-row">
          <p className="mb-1 text-[11px] font-bold uppercase tracking-widest text-muted-foreground">{t('measurements.date')}</p>
          <LocalizedDateInput className="w-full min-w-0" value={date} onChange={(e) => setDate(e.target.value)} data-testid="measurement-edit-date" />
        </div>
        <div className="w-full min-w-0" data-testid="measurement-edit-time-row">
          <p className="mb-1 text-[11px] font-bold uppercase tracking-widest text-muted-foreground">{t('measurements.time')}</p>
          <Input
            type="time"
            lang={lang}
            className="w-full min-w-0"
            value={time}
            onChange={(e) => setTime(e.target.value)}
            data-testid="measurement-edit-time"
          />
        </div>

        {photosEnabled && (
          <div className="space-y-2">
            <Label className="text-sm font-medium">{t('measurements.photo.preview')}</Label>
            <input
              ref={photoInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              data-testid="measurement-edit-photo-input"
              onChange={(e) => {
                const file = e.target.files?.[0] ?? null;
                e.target.value = '';
                if (file) setCropFile(file);
              }}
            />
            {currentPhotoUrl ? (
              <div className="flex items-center gap-3">
                <img src={currentPhotoUrl} alt={t('measurements.photo.preview')} className="h-24 w-24 rounded-lg object-cover" />
                <div className="flex flex-col gap-2">
                  <Button type="button" variant="outline" size="sm" onClick={() => photoInputRef.current?.click()}>
                    <Camera className="h-4 w-4 mr-2" />
                    {t('measurements.photo.change')}
                  </Button>
                  <Button type="button" variant="outline" size="sm" onClick={() => setPhoto({ kind: 'remove' })} data-testid="measurement-edit-photo-remove">
                    <X className="h-4 w-4 mr-2" />
                    {t('measurements.photo.remove')}
                  </Button>
                </div>
              </div>
            ) : (
              <Button type="button" variant="outline" onClick={() => photoInputRef.current?.click()}>
                <Camera className="h-4 w-4 mr-2" />
                {t('measurements.photo.addButton')}
              </Button>
            )}
          </div>
        )}

        <div className="flex gap-2">
          <Button
            variant="outline"
            className="gap-1.5 text-destructive"
            disabled={saving}
            onClick={() => setDeleteConfirmOpen(true)}
            data-testid="measurement-edit-delete"
          >
            <Trash2 className="h-4 w-4" />
            {t('measurements.delete')}
          </Button>
          <Button className="flex-1" disabled={saving} onClick={() => void handleSave()} data-testid="measurement-edit-save">
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {t('common.save')}
          </Button>
        </div>

        <ConfirmDialog
          open={deleteConfirmOpen}
          onOpenChange={setDeleteConfirmOpen}
          title={t('measurements.deleteConfirmTitle')}
          description={t('measurements.deleteConfirmDesc')}
          confirmLabel={t('measurements.delete')}
          destructive
          onConfirm={() => void handleDelete()}
        />

        {/* Kadrowanie nowego zdjęcia — zawsze zamontowany, sterowany open. */}
        <PhotoCropDialog
          open={cropFile !== null}
          file={cropFile}
          onCancel={() => setCropFile(null)}
          onCropped={(blob) => {
            setPhoto({ kind: 'replace', file: new File([blob], 'sylwetka.jpg', { type: 'image/jpeg' }) });
            setCropFile(null);
          }}
        />
      </SheetContent>
    </Sheet>
  );
};
