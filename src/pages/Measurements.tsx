import { Suspense, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '@/lib/firebase';
import { useCurrentUser } from '@/contexts/UserContext';
import { useFirebaseWorkouts } from '@/hooks/useFirebaseWorkouts';
import { useToast } from '@/hooks/use-toast';
import { MeasurementsForm } from '@/components/MeasurementsForm';
import { useHealthConsent } from '@/hooks/useHealthConsent';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { compressImage } from '@/lib/image-compress';
import { BodyPhotoCompare } from '@/components/BodyPhotoCompare';
import { PhotoCropDialog } from '@/components/PhotoCropDialog';
import { EditMeasurementDialog, type MeasurementEditValues, type MeasurementPhotoChange } from '@/components/EditMeasurementDialog';
import { TrendingUp, TrendingDown, Minus, Camera, ChevronRight, Database, Pencil, Ruler } from 'lucide-react';
import { EmptyState } from '@/components/EmptyState';
import { getEmptyStateImageUrl } from '@/lib/exercise-media';
import type { BodyMeasurement } from '@/types';
import { cn, formatLocalDate, formatLocalDateLabel } from '@/lib/utils';
import { buildMeasurementSeries, compareMeasurementsAsc, MEASUREMENT_FIELDS, MEASUREMENT_FIELD_GOALS, MEASUREMENT_FIELD_LABEL_KEYS, weightDeltaTone, type DeltaTone, type MeasurementField } from '@/lib/measurement-stats';
import { useTranslation } from '@/contexts/LanguageContext';
import { HealthWeightSuggestion } from '@/components/HealthWeightSuggestion';
import { useUnit } from '@/contexts/UnitContext';
import { dateLocale } from '@/i18n';
import { lazyWithRetry } from '@/lib/lazy-with-retry';

const MeasurementTrendChart = lazyWithRetry(() => import('@/components/MeasurementTrendChart'), 'lazy-retry:measurement-trend');

// Zasada 8 CLAUDE.md: tekst w pełnym kolorze, tło statusowe tylko z /10.
const TONE_TEXT_CLASS: Record<DeltaTone, string> = {
  success: 'text-fitness-success',
  destructive: 'text-destructive',
  neutral: 'text-muted-foreground',
};
const TONE_BADGE_CLASS: Record<DeltaTone, string> = {
  success: 'border-fitness-success bg-fitness-success/10 text-fitness-success',
  destructive: 'border-destructive bg-destructive/10 text-destructive',
  neutral: 'text-muted-foreground',
};

// Ton delty (Z77 + WP-G X35a): obwody wg celu POLA (talia w dół = zielona, ramię
// w górę = zielone); waga wg celu USERA (weightDeltaTone, ten sam w badge'u trendu).
const deltaTone = (field: MeasurementField, delta: number, objective: string | undefined): DeltaTone => {
  if (field === 'weight') return weightDeltaTone(delta, objective);
  const goal = MEASUREMENT_FIELD_GOALS[field];
  if (goal === 'neutral' || delta === 0) return 'neutral';
  const isGood = goal === 'up' ? delta > 0 : delta < 0;
  return isGood ? 'success' : 'destructive';
};

// Osobny ekran „Pomiary ciała" (przeniesiony z zakładki w Analityce do menu).
const Measurements = () => {
  const { uid, canUseBodyPhotos, profile } = useCurrentUser();
  // WP-G: cel usera steruje tonem delty wagi (brak celu = neutralnie).
  const objective = profile?.trainingProfile?.objective;
  const navigate = useNavigate();
  // Tier pomiarów: domyślny 'full' (365) — lista "Pokaż wszystkie" czyta pełne okno.
  const { measurements, addMeasurement, updateMeasurement, deleteMeasurement, getLatestMeasurement } = useFirebaseWorkouts(uid);
  const { toast } = useToast();
  const { t, lang } = useTranslation();
  const { fmt, fmtLength } = useUnit();
  const healthConsent = useHealthConsent();

  const latestMeasurement = getLatestMeasurement();
  // T13a: pełny podgląd zdjęcia z historii (Dialog kontrolowany — zamykanie
  // wyłącznie przez open=false, lekcja builda 92).
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  // WP-D D5: niezależny przycisk "Dodaj zdjęcie" — bezpośrednia ścieżka
  // picker → crop → zapis wpisu tylko-zdjęcie z dzisiejszą datą.
  const photoOnlyInputRef = useRef<HTMLInputElement>(null);
  const [photoOnlyCropFile, setPhotoOnlyCropFile] = useState<File | null>(null);
  const photoCount = measurements.filter((m) => typeof m.photoUrl === 'string' && m.photoUrl.length > 0).length;
  // WP-M: edytowany wpis = zamrożony snapshot z chwili tapnięcia (dialog nie
  // liczy widoku z listy, więc mutacja danych przy otwartym dialogu go nie
  // wywraca); zamykanie wyłącznie przez open=false. Lista: "Pokaż wszystkie"
  // zamiast twardego slice(0,5).
  const [editMeasurement, setEditMeasurement] = useState<BodyMeasurement | null>(null);
  const [showAllHistory, setShowAllHistory] = useState(false);

  const handleSave = async (measurement: Parameters<typeof addMeasurement>[0], photoFile?: File | null) => {
    // T13a: NIEZMIENNIK — pomiar nigdy nie przepada przez zdjęcie. Upload jest
    // opcjonalnym krokiem PRZED zapisem; jego błąd degraduje do zapisu bez fotki.
    let photoFields: { photoUrl: string; photoPath: string } | null = null;
    if (photoFile && canUseBodyPhotos) {
      try {
        const blob = await compressImage(photoFile);
        const photoPath = `body-photos/${uid}/${measurement.date}-${Date.now()}.jpg`;
        const fileRef = storageRef(storage, photoPath);
        await uploadBytes(fileRef, blob);
        const photoUrl = await getDownloadURL(fileRef);
        photoFields = { photoUrl, photoPath };
      } catch {
        toast({ title: t('measurements.saveErrorTitle'), description: t('measurements.photo.uploadFailed'), variant: 'destructive' });
        // WP-D D2: wpis TYLKO-zdjęcie bez udanego uploadu nie ma treści —
        // koniec (toast wyżej mówi co się stało), user ponawia dodanie.
        const hasNumericContent = Object.values(measurement).some((value) => typeof value === 'number');
        if (!hasNumericContent) return;
      }
    }
    const result = await addMeasurement(photoFields ? { ...measurement, ...photoFields } : measurement);
    if (result.error || !result.measurement) {
      toast({ title: t('measurements.saveErrorTitle'), description: result.error || t('measurements.saveErrorDesc'), variant: 'destructive' });
      return;
    }
    toast({ title: t('measurements.saveSuccessTitle'), description: t('measurements.saveSuccessDesc', { date: measurement.date }) });
  };

  // WP-D D5: zapis wpisu tylko-zdjęcie (bez otwierania formularza pomiarów).
  const handlePhotoOnlySave = async (blob: Blob) => {
    setPhotoOnlyCropFile(null);
    const file = new File([blob], 'sylwetka.jpg', { type: 'image/jpeg' });
    await handleSave({ date: formatLocalDate(new Date()) }, file);
  };

  // WP-M: edycja wpisu — upload nowego zdjęcia PRZED zapisem dokumentu; błąd
  // uploadu = wpis nietknięty (komunikat wraca do dialogu). Stare zdjęcie
  // sprząta updateMeasurement (best-effort) po udanym zapisie.
  const handleUpdate = async (
    id: string,
    values: MeasurementEditValues,
    photo: MeasurementPhotoChange,
  ): Promise<{ ok: boolean; error?: string }> => {
    const existing = measurements.find((m) => m.id === id);
    let photoFields: { photoUrl?: string; photoPath?: string } = {};
    if (photo.kind === 'keep' && existing?.photoUrl) {
      photoFields = { photoUrl: existing.photoUrl, photoPath: existing.photoPath };
    } else if (photo.kind === 'replace' && canUseBodyPhotos) {
      try {
        const blob = await compressImage(photo.file);
        const photoPath = `body-photos/${uid}/${values.date}-${Date.now()}.jpg`;
        const fileRef = storageRef(storage, photoPath);
        await uploadBytes(fileRef, blob);
        const photoUrl = await getDownloadURL(fileRef);
        photoFields = { photoUrl, photoPath };
      } catch {
        return { ok: false, error: t('measurements.photo.updateUploadFailed') };
      }
    }
    const result = await updateMeasurement(id, { ...values, ...photoFields });
    if (result.error || !result.measurement) {
      return { ok: false, error: result.error || t('measurements.saveErrorDesc') };
    }
    toast({ title: t('measurements.saveSuccessTitle'), description: t('measurements.saveSuccessDesc', { date: values.date }) });
    return { ok: true };
  };

  const handleDelete = async (id: string): Promise<{ ok: boolean; error?: string }> => {
    const result = await deleteMeasurement(id);
    if (!result.ok) return { ok: false, error: result.error || t('measurements.deleteErrorDesc') };
    toast({ title: t('measurements.deleteSuccessTitle') });
    return { ok: true };
  };

  // WP-M: porządek date + recordedAt (fallback id) — po edycji godziny dwa
  // wpisy tego samego dnia mają stabilną kolejność; najnowszy na górze.
  const sortedMeasurements = useMemo(
    () => [...measurements].sort((a, b) => compareMeasurementsAsc(b, a)),
    [measurements],
  );

  const getWeightTrend = () => {
    const sorted = sortedMeasurements.filter((m) => m.weight);
    if (sorted.length < 2) return null;
    const diff = (sorted[0].weight || 0) - (sorted[1].weight || 0);
    // WP-G: ton wg celu usera (nie zaszyte "wzrost = źle").
    const tone = weightDeltaTone(diff, objective);
    if (diff > 0) return { direction: 'up' as const, value: diff, tone };
    if (diff < 0) return { direction: 'down' as const, value: Math.abs(diff), tone };
    return { direction: 'same' as const, value: 0, tone };
  };

  const weightTrend = getWeightTrend();
  const HISTORY_PREVIEW_COUNT = 5;
  const visibleMeasurements = showAllHistory ? sortedMeasurements : sortedMeasurements.slice(0, HISTORY_PREVIEW_COUNT);

  // Delta per pole per WPIS (Z77 + WP-M: klucz po id, bo dwa wpisy mogą dzielić
  // dzień) — z serii, żeby "poprzedni" znaczyło poprzedni pomiar POLA.
  const deltaByFieldId = useMemo(() => {
    const map = new Map<string, number | null>();
    MEASUREMENT_FIELDS.forEach((field) => {
      buildMeasurementSeries(measurements, field).forEach((point) => {
        map.set(`${field}:${point.id}`, point.delta);
      });
    });
    return map;
  }, [measurements]);

  return (
    <div className="space-y-6">
      {/* Wycofana zgoda zdrowotna (art. 9 RODO) blokuje NOWE zapisy pomiarów;
          historia zostaje widoczna, ponowna zgoda w Ustawieniach. */}
      {!healthConsent && (
        <div className="rounded-2xl border border-fitness-warning bg-fitness-warning/10 p-4" data-testid="health-consent-banner">
          <p className="text-sm text-fitness-warning">{t('consent.healthBlockedBanner')}</p>
          <Button variant="outline" size="sm" className="mt-3" onClick={() => navigate('/profile?section=consents')}>
            {t('consent.healthBlockedCta')}
          </Button>
        </div>
      )}

      {healthConsent && (
        <>
          {/* Z118: propozycja wagi ze Zdrowia (istniejąca ścieżka zapisu, zawsze za zgodą) */}
          <HealthWeightSuggestion
            measurements={measurements}
            onAccept={async (sample) => {
              await handleSave({ date: sample.date, weight: Math.round(sample.kg * 10) / 10 });
            }}
          />

          <MeasurementsForm latestMeasurement={latestMeasurement} onSave={handleSave} photosEnabled={canUseBodyPhotos} />
        </>
      )}

      {/* Backup mieszka w Profilu (Z81, X35b: sekcja Dane) — tu tylko drogowskaz, koniec zdublowanej sekcji. */}
      <Button
        variant="outline"
        className="w-full justify-between"
        onClick={() => navigate('/profile?section=backup')}
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
          imageUrl={getEmptyStateImageUrl('measurements')}
          title={t('measurements.emptyTitle')}
          hint={t('measurements.emptyHint')}
          ctaLabel={t('measurements.emptyCta')}
          onCta={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        />
      )}

      {measurements.length > 0 && (
        <Suspense fallback={<div className="h-[220px]" />}>
          <MeasurementTrendChart measurements={measurements} />
        </Suspense>
      )}

      {/* WP-D D5: niezależne dodanie zdjęcia sylwetki + zachęty do porównania. */}
      {healthConsent && canUseBodyPhotos && (
        <div className="space-y-2">
          <input
            ref={photoOnlyInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            data-testid="measurements-add-photo-input"
            onChange={(e) => {
              const file = e.target.files?.[0] ?? null;
              e.target.value = '';
              if (file) setPhotoOnlyCropFile(file);
            }}
          />
          <Button
            variant="outline"
            className="w-full"
            data-testid="measurements-add-photo"
            onClick={() => photoOnlyInputRef.current?.click()}
          >
            <Camera className="h-4 w-4 mr-2 text-primary" />
            {t('measurements.photo.addButton')}
          </Button>
          {photoCount === 0 && (
            <p className="text-sm text-muted-foreground">{t('measurements.compareEmpty')}</p>
          )}
          {photoCount === 1 && (
            <p className="text-sm text-muted-foreground">{t('measurements.compareOne')}</p>
          )}
        </div>
      )}

      {/* T13b: porównanie sylwetki przed/po — tylko przy włączonym feature bodyPhotos */}
      {canUseBodyPhotos && measurements.length > 0 && (
        <BodyPhotoCompare measurements={measurements} />
      )}

      {measurements.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              {t('measurements.historyTitle')}
              {weightTrend && (
                <Badge
                  variant="outline"
                  className={cn('font-normal', TONE_BADGE_CLASS[weightTrend.tone])}
                  data-testid="measurement-weight-trend"
                  data-tone={weightTrend.tone}
                >
                  {weightTrend.direction === 'up' && <TrendingUp className="mr-1 h-4 w-4" />}
                  {weightTrend.direction === 'down' && <TrendingDown className="mr-1 h-4 w-4" />}
                  {weightTrend.direction === 'same' && <Minus className="mr-1 h-4 w-4" />}
                  {weightTrend.value > 0 && fmt(weightTrend.value, { decimals: 1 })}
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {visibleMeasurements.map((m) => (
                // WP-M: wiersz otwiera edycję (za zgodą zdrowotną, jak dodawanie).
                // Miniatura zdjęcia zatrzymuje propagację — nadal otwiera podgląd.
                <div
                  key={m.id}
                  data-testid={`measurement-row-${m.id}`}
                  role={healthConsent ? 'button' : undefined}
                  tabIndex={healthConsent ? 0 : undefined}
                  aria-label={healthConsent ? t('measurements.editEntry') : undefined}
                  className={cn('rounded-lg bg-muted/50 p-3 space-y-2', healthConsent && 'cursor-pointer')}
                  onClick={healthConsent ? () => setEditMeasurement(m) : undefined}
                  onKeyDown={healthConsent ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setEditMeasurement(m); } } : undefined}
                >
                  <span className="flex items-center justify-between text-sm font-medium">
                    <span>
                      {formatLocalDateLabel(m.date, dateLocale(lang), { day: 'numeric', month: 'long', year: 'numeric' })}
                      {/* FIX-B T7: godzina wykonania (pomiary sprzed recordedAt jej nie mają) */}
                      {m.recordedAt && (
                        <span className="ml-1 text-xs text-muted-foreground tabular-nums">
                          {new Date(m.recordedAt).toLocaleTimeString(dateLocale(lang), { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      )}
                    </span>
                    {healthConsent && <Pencil className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />}
                  </span>
                  {/* T13a: miniatura zdjęcia sylwetki (klik = pełny podgląd) */}
                  {m.photoUrl && (
                    <button type="button" className="block" onClick={(e) => { e.stopPropagation(); setPhotoPreview(m.photoUrl ?? null); }}>
                      <img
                        src={m.photoUrl}
                        alt={t('measurements.photo.preview')}
                        loading="lazy"
                        className="h-16 w-16 rounded-lg object-cover"
                      />
                    </button>
                  )}
                  {/* Wszystkie wypełnione pola wpisu + delta vs poprzedni pomiar pola (Z77) */}
                  <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-sm">
                    {MEASUREMENT_FIELDS.filter((field) => typeof m[field] === 'number').map((field) => {
                      const value = m[field] as number;
                      const delta = deltaByFieldId.get(`${field}:${m.id}`) ?? null;
                      return (
                        <span key={field} className="whitespace-nowrap">
                          {t(MEASUREMENT_FIELD_LABEL_KEYS[field])}:{' '}
                          <strong>{field === 'weight' ? fmt(value) : fmtLength(value)}</strong>
                          {delta !== null && delta !== 0 && (
                            <span
                              className={cn('ml-1 text-xs tabular-nums', TONE_TEXT_CLASS[deltaTone(field, delta, objective)])}
                              data-testid={`measurement-delta-${field}`}
                              data-tone={deltaTone(field, delta, objective)}
                            >
                              {delta > 0 ? '+' : ''}{field === 'weight' ? fmt(delta, { decimals: 1 }) : fmtLength(delta, { decimals: 1 })}
                            </span>
                          )}
                        </span>
                      );
                    })}
                  </div>
                </div>
              ))}
              {sortedMeasurements.length > HISTORY_PREVIEW_COUNT && (
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => setShowAllHistory((prev) => !prev)}
                >
                  {showAllHistory ? t('measurements.showLess') : t('measurements.showAll', { n: sortedMeasurements.length })}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* WP-M: edycja/usuwanie wpisu — zawsze zamontowany, open=false zamyka. */}
      <EditMeasurementDialog
        open={editMeasurement !== null}
        onOpenChange={(open) => { if (!open) setEditMeasurement(null); }}
        measurement={editMeasurement}
        photosEnabled={canUseBodyPhotos}
        onUpdate={handleUpdate}
        onDelete={handleDelete}
      />

      {/* WP-D D5: kadrowanie bezpośredniej ścieżki — zawsze zamontowany, open=false zamyka. */}
      <PhotoCropDialog
        open={photoOnlyCropFile !== null}
        file={photoOnlyCropFile}
        onCancel={() => setPhotoOnlyCropFile(null)}
        onCropped={(blob) => void handlePhotoOnlySave(blob)}
      />

      {/* T13a: pełny podgląd zdjęcia — Dialog zawsze zamontowany, zamykanie przez open=false */}
      <Dialog open={photoPreview !== null} onOpenChange={(open) => { if (!open) setPhotoPreview(null); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{t('measurements.photo.preview')}</DialogTitle>
          </DialogHeader>
          {photoPreview && (
            <img
              src={photoPreview}
              alt={t('measurements.photo.preview')}
              className="max-h-[70vh] w-full rounded-lg object-contain"
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Measurements;
