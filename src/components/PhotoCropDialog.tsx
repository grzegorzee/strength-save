import { useCallback, useEffect, useState } from 'react';
import Cropper, { type Area } from 'react-easy-crop';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { normalizeToJpegDataUrl } from '@/lib/image-compress';
import { useTranslation } from '@/contexts/LanguageContext';

// WP-D D3: kadrowanie zdjęcia sylwetki przed uploadem. Dialog na istniejącym
// prymitywie (ma X), zawsze zamontowany u rodzica, zamykany WYŁĄCZNIE przez
// open=false (lekcja builda 92). Źródło croppera to JPEG dataURL z istniejącej
// normalizacji (HEIC z iPhone'a nie idzie surowy do <img> w WKWebView).

interface PhotoCropDialogProps {
  open: boolean;
  file: File | null;
  onCancel: () => void;
  onCropped: (blob: Blob) => void;
  /** Domyślnie 3/4 — portret sylwetki (spójny z BodyPhotoCompare aspect-[3/4]). */
  aspect?: number;
}

const CROP_JPEG_QUALITY = 0.92;

/** Canvas crop z pixelCrop croppera; JPEG (spójnie z resztą ścieżki zdjęć). */
const getCroppedImg = (imageSrc: string, pixelCrop: Area): Promise<Blob> =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.round(pixelCrop.width));
        canvas.height = Math.max(1, Math.round(pixelCrop.height));
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error('no-2d-context');
        ctx.drawImage(
          image,
          pixelCrop.x, pixelCrop.y, pixelCrop.width, pixelCrop.height,
          0, 0, canvas.width, canvas.height,
        );
        canvas.toBlob(
          (blob) => (blob ? resolve(blob) : reject(new Error('to-blob-failed'))),
          'image/jpeg',
          CROP_JPEG_QUALITY,
        );
      } catch (error) {
        reject(error instanceof Error ? error : new Error('crop-failed'));
      }
    };
    image.onerror = () => reject(new Error('image-load-failed'));
    image.src = imageSrc;
  });

export const PhotoCropDialog = ({ open, file, onCancel, onCropped, aspect = 3 / 4 }: PhotoCropDialogProps) => {
  const { t } = useTranslation();
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [pixelCrop, setPixelCrop] = useState<Area | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open || !file) {
      setImageSrc(null);
      setCrop({ x: 0, y: 0 });
      setZoom(1);
      setPixelCrop(null);
      setBusy(false);
      return;
    }
    let cancelled = false;
    normalizeToJpegDataUrl(file)
      .then((dataUrl) => {
        if (!cancelled) setImageSrc(dataUrl);
      })
      .catch(() => {
        // Wyjście ze stanu błędu (zasada 6): normalizacja padła (egzotyczny
        // format) → zdjęcie idzie dalej BEZ kadrowania, jak przed tą funkcją.
        if (!cancelled) onCropped(file);
      });
    return () => {
      cancelled = true;
    };
    // onCropped celowo poza deps: fallback ma strzelić raz per plik.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, file]);

  const onCropComplete = useCallback((_area: Area, areaPixels: Area) => {
    setPixelCrop(areaPixels);
  }, []);

  const handleConfirm = async () => {
    if (!imageSrc || !pixelCrop || busy) return;
    setBusy(true);
    try {
      const blob = await getCroppedImg(imageSrc, pixelCrop);
      onCropped(blob);
    } catch {
      // Kadrowanie padło (canvas) — zdjęcie idzie dalej bez kadru, nie przepada.
      if (file) onCropped(file);
      else onCancel();
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!next) onCancel(); }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{t('measurements.photo.cropTitle')}</DialogTitle>
        </DialogHeader>
        <div className="relative h-[55vh] min-h-[240px] w-full overflow-hidden rounded-lg bg-black/80" data-testid="photo-crop-area">
          {imageSrc && (
            <Cropper
              image={imageSrc}
              crop={crop}
              zoom={zoom}
              aspect={aspect}
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onCropComplete={onCropComplete}
            />
          )}
        </div>
        <p className="text-xs text-muted-foreground">{t('measurements.photo.cropHint')}</p>
        <DialogFooter className="gap-2">
          <Button type="button" variant="outline" onClick={onCancel}>
            {t('common.cancel')}
          </Button>
          <Button
            type="button"
            onClick={() => void handleConfirm()}
            disabled={!imageSrc || !pixelCrop || busy}
            data-testid="photo-crop-confirm"
          >
            {t('measurements.photo.cropConfirm')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
