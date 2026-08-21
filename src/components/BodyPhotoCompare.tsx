import { useMemo, useState } from 'react';
import { Images, Loader2, Share2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { BodyMeasurement } from '@/types';
import { formatLocalDateLabel, parseLocalDate } from '@/lib/utils';
import { useTranslation } from '@/contexts/LanguageContext';
import { useUnit } from '@/contexts/UnitContext';
import { useToast } from '@/hooks/use-toast';
import { dateLocale } from '@/i18n';
import {
  BodyCompareShareDialog,
  preparePhotoDataUrl,
  type BodyCompareEntry,
} from '@/components/BodyCompareShareDialog';

// T13b: porównanie sylwetki przed/po. Domyślnie najstarsze zdjęcie (przed)
// vs najnowsze (po); selecty nad kolumnami pozwalają porównać dowolne dwa.
// Przy jednym zdjęciu: zachęta, żeby wrócić po cyklu po zdjęcie "po".
// WP-E (X28): przycisk "Pobierz / udostępnij" — rodzic przygotowuje dataURL-e
// (fetch → fallback SDK → downscale) PRZED otwarciem dialogu eksportu.

interface BodyPhotoCompareProps {
  measurements: BodyMeasurement[];
}

type PhotoEntry = BodyMeasurement & { photoUrl: string };

export const BodyPhotoCompare = ({ measurements }: BodyPhotoCompareProps) => {
  const { t, lang } = useTranslation();
  const { fmt } = useUnit();
  const { toast } = useToast();
  const [beforeId, setBeforeId] = useState<string | null>(null);
  const [afterId, setAfterId] = useState<string | null>(null);
  const [shareOpen, setShareOpen] = useState(false);
  const [sharePreparing, setSharePreparing] = useState(false);
  const [shareEntries, setShareEntries] = useState<{ before: BodyCompareEntry; after: BodyCompareEntry } | null>(null);

  const withPhotos = useMemo(
    () => measurements
      .filter((m): m is PhotoEntry => typeof m.photoUrl === 'string' && m.photoUrl.length > 0)
      .sort((a, b) => parseLocalDate(a.date).getTime() - parseLocalDate(b.date).getTime()),
    [measurements],
  );

  if (withPhotos.length === 0) return null;

  const formatDate = (date: string) =>
    formatLocalDateLabel(date, dateLocale(lang), { day: 'numeric', month: 'short', year: 'numeric' });

  if (withPhotos.length === 1) {
    const only = withPhotos[0];
    return (
      <Card data-testid="body-photo-compare">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Images className="h-5 w-5 text-primary" />
            {t('measurements.photo.compareTitle')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <img
            src={only.photoUrl}
            alt={t('measurements.photo.before')}
            loading="lazy"
            className="h-40 max-w-full rounded-lg object-cover"
          />
          <p className="text-sm text-muted-foreground">{formatDate(only.date)}</p>
          <p className="text-sm text-muted-foreground">{t('measurements.photo.onlyOneHint')}</p>
        </CardContent>
      </Card>
    );
  }

  // Wybrany wpis mógł zniknąć (usunięty pomiar) — fallback do domyślnych skrajnych.
  const before = withPhotos.find((m) => m.id === beforeId) ?? withPhotos[0];
  const after = withPhotos.find((m) => m.id === afterId) ?? withPhotos[withPhotos.length - 1];
  const weightDelta = before.weight != null && after.weight != null ? after.weight - before.weight : null;

  const columns = [
    { key: 'before' as const, labelKey: 'measurements.photo.before' as const, entry: before, onChange: setBeforeId },
    { key: 'after' as const, labelKey: 'measurements.photo.after' as const, entry: after, onChange: setAfterId },
  ];

  // WP-E: dataURL-e gotowe PRZED otwarciem dialogu (spinner na przycisku),
  // dialog dostaje gotowe dane — zero async fetchy w dialogu.
  const handleOpenShare = async () => {
    if (sharePreparing) return;
    setSharePreparing(true);
    try {
      // Sekwencyjnie, nie Promise.all: jedno zdjecie 12 MP w locie naraz
      // (pamiec WKWebView, lekcja Z179).
      const beforeUrl = await preparePhotoDataUrl(before.photoUrl, before.photoPath);
      const afterUrl = await preparePhotoDataUrl(after.photoUrl, after.photoPath);
      setShareEntries({
        before: { dataUrl: beforeUrl, date: before.date, weightKg: before.weight },
        after: { dataUrl: afterUrl, date: after.date, weightKg: after.weight },
      });
      setShareOpen(true);
    } catch {
      toast({ title: t('measurements.sharePrepareError'), variant: 'destructive' });
    } finally {
      setSharePreparing(false);
    }
  };

  return (
    <Card data-testid="body-photo-compare">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Images className="h-5 w-5 text-primary" />
          {t('measurements.photo.compareTitle')}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-4">
          {columns.map((col) => (
            <div key={col.key} className="space-y-2">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">{t(col.labelKey)}</p>
              <Select value={col.entry.id} onValueChange={(value) => col.onChange(value)}>
                <SelectTrigger className="h-9" data-testid={`body-photo-select-${col.key}`}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {withPhotos.map((m) => (
                    <SelectItem key={m.id} value={m.id}>{formatDate(m.date)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <img
                src={col.entry.photoUrl}
                alt={t(col.labelKey)}
                loading="lazy"
                className="aspect-[3/4] w-full max-w-full rounded-lg object-cover"
              />
              <p className="text-sm">
                {formatDate(col.entry.date)}
                {col.entry.weight != null && (
                  <span className="ml-2 font-semibold">{fmt(col.entry.weight, { decimals: 1 })}</span>
                )}
              </p>
            </div>
          ))}
        </div>
        {weightDelta !== null && (
          <p className="text-sm text-muted-foreground">
            {t('measurements.photo.weightDelta')}{' '}
            <span className="font-semibold tabular-nums">
              {weightDelta > 0 ? '+' : ''}{fmt(weightDelta, { decimals: 1 })}
            </span>
          </p>
        )}
        <Button
          variant="outline"
          className="w-full"
          data-testid="body-photo-share"
          disabled={sharePreparing}
          onClick={handleOpenShare}
        >
          {sharePreparing ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Share2 className="h-4 w-4 mr-2 text-primary" />
          )}
          {t('measurements.sharePhoto')}
        </Button>
      </CardContent>
      {/* Radix: dialog NIGDY nie jest unmountowany w stanie open — entries
          zostają po zamknięciu, znikają dopiero z całą kartą. */}
      {shareEntries && (
        <BodyCompareShareDialog
          open={shareOpen}
          onOpenChange={setShareOpen}
          before={shareEntries.before}
          after={shareEntries.after}
        />
      )}
    </Card>
  );
};
