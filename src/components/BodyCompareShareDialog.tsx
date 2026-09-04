import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { toggleButtonClasses } from '@/components/ui/chip-button';
import { Loader2, Download, Share2, Check } from 'lucide-react';
import { Capacitor } from '@capacitor/core';
import { hapticSuccess } from '@/lib/haptics';
import { nativeHttpBlob } from '@/lib/native-photo-fetch';
import { reportClientErrorWithCurrentUid } from '@/lib/global-error-telemetry';
import { useTranslation } from '@/contexts/LanguageContext';
import { useUnit } from '@/contexts/UnitContext';
import { getCurrentAccent } from '@/lib/accent-theme';
import { escapeHtml } from '@/lib/share-html';
import { shareOrDownloadFile } from '@/lib/share-export';
import { downscalePhoto } from '@/lib/share-utils';
import { cn, formatLocalDateLabel } from '@/lib/utils';
import { translate, dateLocale, type LanguageCode } from '@/i18n';
import appIcon from '@/assets/app-icon.png';

// WP-E (X28): eksport porownania sylwetki before/after do obrazu.
// Mechanizm DOKLADNIE wzorem CycleShareCard: build HTML string → offscreen div
// → lazy html2canvas-pro (scale 2) → toBlob(jpeg 0.85); dialog z podgladem,
// Pobierz/Udostepnij, "Zapisano" + haptyka; AbortError ignorowany; na natywnym
// iOS "Pobierz" tez idzie przez share sheet (WKWebView ignoruje <a download>).
// KRYTYCZNE (tainted canvas): do HTML wchodza WYLACZNIE dataURL-e po
// downscalePhoto — nigdy surowe photoUrl ze Storage.

export type BodyCompareTemplate = 'classic' | 'accent' | 'photo';
export type BodyCompareFormat = 'square' | 'story';

export interface BodyCompareEntry {
  /** JPEG dataURL po downscalePhoto (nigdy photoUrl — tainted canvas). */
  dataUrl: string;
  /** Data pomiaru ISO YYYY-MM-DD. */
  date: string;
  /** Waga w kg (kanonicznie); brak = wiersz wagi pomijany. */
  weightKg?: number;
}

export interface BodyCompareShareInput {
  before: BodyCompareEntry;
  after: BodyCompareEntry;
  template: BodyCompareTemplate;
  format: BodyCompareFormat;
  lang: LanguageCode;
  accentHex: string;
  /** Formatuje kg do jednostki usera (useUnit().fmt — kg/lb). */
  fmtWeight: (kg: number) => string;
  /** Tlo szablonu photo (BASE_URL + 'share/bg.webp'); bez niego photo degraduje do classic. */
  bgUrl?: string;
}

/** Wymiary kontenera per format; scale 2 daje 1080x1080 / 1080x1920. */
const FORMAT_SIZE: Record<BodyCompareFormat, { width: number; height: number }> = {
  square: { width: 540, height: 540 },
  story: { width: 540, height: 960 },
};

/** Stale pudelko zdjecia (aspect 3:4, object-cover) — spojna kompozycja
 *  niezaleznie od proporcji zrodla (edge case 2 planu). */
const PHOTO_BOX: Record<BodyCompareFormat, { width: number; height: number }> = {
  square: { width: 226, height: 301 },
  story: { width: 250, height: 333 },
};

const accentRgbOf = (accentHex: string): string => {
  const m = /^#?([0-9a-f]{6})$/i.exec(accentHex);
  if (!m) return '206,252,34';
  const n = parseInt(m[1], 16);
  return `${(n >> 16) & 255},${(n >> 8) & 255},${n & 255}`;
};

export function buildBodyCompareHtml(input: BodyCompareShareInput): string {
  const { before, after, template, format, lang, accentHex, fmtWeight } = input;
  const { width, height } = FORMAT_SIZE[format];
  const photoBox = PHOTO_BOX[format];
  const fmtDate = (iso: string) =>
    formatLocalDateLabel(iso, dateLocale(lang), { day: 'numeric', month: 'short', year: 'numeric' });

  const cell = (entry: BodyCompareEntry, labelKey: 'measurements.photo.before' | 'measurements.photo.after'): string => `
    <div style="display:flex;flex-direction:column;align-items:center;">
      <img src="${entry.dataUrl}" style="width:${photoBox.width}px;height:${photoBox.height}px;object-fit:cover;border-radius:14px;border:2px solid ${accentHex};" />
      <div style="margin-top:8px;font-size:11px;color:#8b93a1;text-transform:uppercase;letter-spacing:2px;font-weight:700;">${escapeHtml(translate(lang, labelKey))} · ${escapeHtml(fmtDate(entry.date))}</div>
      ${entry.weightKg != null
        ? `<div style="margin-top:2px;font-size:18px;font-weight:800;color:#fff;">${escapeHtml(fmtWeight(entry.weightKg))}</div>`
        : ''}
    </div>`;

  // Strzalka PRZED → PO wylacznie w szablonie classic (wariant do oceny
  // wlasciciela; accent i photo bez zmian, zeby mial porownanie). Inline SVG,
  // zero rastrow: html2canvas-pro serializuje <svg> przez XMLSerializer do
  // data:image/svg+xml i rysuje jak obraz (SVGElementContainer,
  // node_modules/html2canvas-pro/dist/html2canvas-pro.esm.js:5874-5885).
  // Budzet square: 2 x 226 + 36 + 2 x 6 = 500 px, wiec padding boczny 20 px
  // zamiast 28. Story: kolumna (2 komorki + delta) ma 875 px przy 880 px
  // tresci, strzalka z gapami 4 px dodaje 30 px, wiec padding pionowy 24 px
  // zamiast 40 (zapas 6 px). PHOTO_BOX bez zmian, zdjecia w kontenerze; dowod
  // geometrii (pomiar DOM) w e2e body-share-dialog.spec.
  const withArrow = template === 'classic';
  const ARROW_LENGTH = 36;
  const ARROW_GAP = format === 'square' ? 6 : 4;
  const arrowStyle = `fill="none" stroke="${accentHex}" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"`;
  const arrowRight = `<div style="flex:0 0 ${ARROW_LENGTH}px;height:${photoBox.height}px;display:flex;align-items:center;justify-content:center;"><svg xmlns="http://www.w3.org/2000/svg" width="${ARROW_LENGTH}" height="24" viewBox="0 0 36 24" ${arrowStyle}><path d="M3 12h29"/><path d="M23 4l9 8-9 8"/></svg></div>`;
  const arrowDown = `<div style="height:${ARROW_LENGTH}px;display:flex;align-items:center;justify-content:center;"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="${ARROW_LENGTH}" viewBox="0 0 24 36" ${arrowStyle}><path d="M12 3v29"/><path d="M4 23l8 9 8-9"/></svg></div>`;

  const photos = format === 'square'
    ? `<div style="display:flex;justify-content:center;align-items:flex-start;gap:${withArrow ? ARROW_GAP : 16}px;">${cell(before, 'measurements.photo.before')}${withArrow ? arrowRight : ''}${cell(after, 'measurements.photo.after')}</div>`
    : `<div style="display:flex;flex-direction:column;align-items:center;gap:${withArrow ? ARROW_GAP : 14}px;">${cell(before, 'measurements.photo.before')}${withArrow ? arrowDown : ''}${cell(after, 'measurements.photo.after')}</div>`;

  // Delta tylko gdy OBIE wagi (edge case 1 planu).
  const delta = before.weightKg != null && after.weightKg != null ? after.weightKg - before.weightKg : null;
  const deltaBlock = delta !== null
    ? `
      <div style="text-align:center;margin-top:${format === 'square' ? 12 : 18}px;">
        <span style="font-size:11px;color:#8b93a1;text-transform:uppercase;letter-spacing:2px;">${escapeHtml(translate(lang, 'measurements.photo.weightDelta'))}</span>
        <span style="font-size:20px;font-weight:800;color:${accentHex};margin-left:8px;">${delta > 0 ? '+' : ''}${escapeHtml(fmtWeight(delta))}</span>
      </div>`
    : '';

  const accentRgb = accentRgbOf(accentHex);
  const background = template === 'accent'
    ? `background:radial-gradient(circle at 50% 0%, rgba(${accentRgb},0.28) 0%, rgba(${accentRgb},0) 55%), #07080a;`
    : template === 'photo' && input.bgUrl
      ? `background:#07080a url('${input.bgUrl}') center/cover no-repeat;`
      : 'background:#07080a;';
  const cardBorder = template === 'accent' ? `border:6px solid ${accentHex};` : '';

  return `
    <div style="
      width:${width}px;height:${height}px;position:relative;overflow:hidden;box-sizing:border-box;
      ${background}${cardBorder}
      color:#fff;font-family:system-ui,-apple-system,sans-serif;
      padding:${format === 'square' ? `22px ${withArrow ? 20 : 28}px` : `${withArrow ? 24 : 40}px 32px`};display:flex;flex-direction:column;
    ">
      <div style="display:flex;align-items:center;justify-content:center;gap:8px;">
        <img src="${appIcon}" style="width:24px;height:24px;border-radius:6px;" />
        <span style="font-size:12px;color:#e2e8f0;text-transform:uppercase;letter-spacing:3px;font-weight:700;">Strength Save</span>
      </div>
      <div style="margin:auto 0;">
        ${photos}
        ${deltaBlock}
      </div>
      <div style="text-align:center;font-size:11px;color:#8b93a1;letter-spacing:1px;">strengthsave.app</div>
    </div>
  `;
}

export async function generateBodyCompareImage(input: BodyCompareShareInput): Promise<Blob> {
  // Lazy import jak w share-utils — html2canvas-pro laduje sie przy pierwszym share.
  const { default: html2canvas } = await import('html2canvas-pro');
  const { width, height } = FORMAT_SIZE[input.format];

  const container = document.createElement('div');
  container.style.cssText = `position:fixed;left:-9999px;top:0;width:${width}px;height:${height}px;`;
  container.innerHTML = buildBodyCompareHtml(input);
  document.body.appendChild(container);

  try {
    const canvas = await html2canvas(container.firstElementChild as HTMLElement, {
      scale: 2,
      useCORS: true,
      backgroundColor: '#07080a',
    });
    return new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        blob => blob ? resolve(blob) : reject(new Error('Failed to create blob')),
        'image/jpeg',
        0.85,
      );
    });
  } finally {
    document.body.removeChild(container);
  }
}

/** Twardy limit czasu na KAZDY krok przygotowania zdjecia. Zgloszenie iOS
 *  build 115: fetch w WKWebView potrafi wisiec do systemowego timeoutu, a
 *  getBlob SDK retry'uje network error az do maxOperationRetryTime (2 min,
 *  retry-limit-exceeded) — bez wlasnego limitu spinner wisial minutami. */
const PREPARE_STEP_TIMEOUT_MS = 8_000;

async function withStepTimeout<T>(run: () => Promise<T>, label: string): Promise<T> {
  let timer: number | undefined;
  try {
    return await Promise.race([
      run(),
      new Promise<never>((_, reject) => {
        timer = window.setTimeout(() => reject(new Error(`${label}-timeout`)), PREPARE_STEP_TIMEOUT_MS);
      }),
    ]);
  } finally {
    if (timer !== undefined) window.clearTimeout(timer);
  }
}

const fetchPhotoBlob = async (photoUrl: string): Promise<Blob> => {
  // fetch NIE rzuca na 4xx/5xx — !res.ok musi jawnie isc do fallbacku.
  const res = await fetch(photoUrl);
  if (!res.ok) throw new Error(`photo-fetch-${res.status}`);
  return res.blob();
};

const sdkPhotoBlob = async (photoPath: string): Promise<Blob> => {
  // Importy firebase dynamiczne — modul nie ciagnie @/lib/firebase w testach
  // komponentow, dopoki ten krok realnie nie biezy.
  const [{ getBlob, ref }, { storage }] = await Promise.all([
    import('firebase/storage'),
    import('@/lib/firebase'),
  ]);
  return getBlob(ref(storage, photoPath));
};

/**
 * Zdjecie Storage → JPEG dataURL bezpieczny dla html2canvas (edge case 3).
 * Kolejnosc kanalow per platforma: na natywnym iOS pierwszy jest nativeHttp
 * (CapacitorHttp) — telemetria produkcyjna 2026-08-22 (build 116) pokazala
 * "photo-load-failed getBlob=getBlob-timeout fetch=Load failed": OBA kanaly JS
 * (SDK getBlob i fetch) padaja na urzadzeniu, bo oba ida przez warstwe
 * sieciowa WKWebView z originu capacitor://localhost. Natywny stos HTTP nie
 * podlega WKWebView; getBlob i fetch zostaja jako fallbacki. nativeHttp dziala
 * tez dla wpisow bez photoPath (uzywa photoUrl). Web zostaje przy fetch-first.
 * Kazda porazka konczy sie odrzuceniem z opisem krokow (telemetria u rodzica).
 */
export async function preparePhotoDataUrl(photoUrl: string, photoPath?: string): Promise<string> {
  const fetchStep = { label: 'fetch', run: () => fetchPhotoBlob(photoUrl) };
  const sdkStep = photoPath ? { label: 'getBlob', run: () => sdkPhotoBlob(photoPath) } : null;
  const nativeHttpStep = { label: 'nativeHttp', run: () => nativeHttpBlob(photoUrl) };
  const steps = Capacitor.isNativePlatform()
    ? [nativeHttpStep, ...(sdkStep ? [sdkStep] : []), fetchStep]
    : sdkStep ? [fetchStep, sdkStep] : [fetchStep];

  const failures: string[] = [];
  let blob: Blob | null = null;
  for (const step of steps) {
    try {
      blob = await withStepTimeout(step.run, step.label);
      break;
    } catch (err) {
      failures.push(`${step.label}=${err instanceof Error ? err.message : String(err)}`);
    }
  }
  if (!blob) throw new Error(`photo-load-failed ${failures.join(' ')}`.trim());

  const loaded = blob;
  // Z179: downscale chroni pamiec WKWebView (12 MP → ≤1080x1920 dataURL).
  // Ten sam twardy limit: zepsute dekodowanie nie moze zawiesic spinnera.
  return withStepTimeout(() => downscalePhoto(loaded), 'downscale');
}

interface BodyCompareShareDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  before: BodyCompareEntry;
  after: BodyCompareEntry;
}

export const BodyCompareShareDialog = ({ open, onOpenChange, before, after }: BodyCompareShareDialogProps) => {
  const { t, lang } = useTranslation();
  const { fmt } = useUnit();
  const [template, setTemplate] = useState<BodyCompareTemplate>('classic');
  const [format, setFormat] = useState<BodyCompareFormat>('square');
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [blob, setBlob] = useState<Blob | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedAction, setSavedAction] = useState<'download' | 'share' | null>(null);

  useEffect(() => {
    if (!open) {
      setImageUrl((prev) => { if (prev) URL.revokeObjectURL(prev); return null; });
      setBlob(null);
      setError(null);
      return;
    }
    let cancelled = false;
    setIsGenerating(true);
    setError(null);
    generateBodyCompareImage({
      before,
      after,
      template,
      format,
      lang,
      accentHex: getCurrentAccent().hex,
      fmtWeight: (kg) => fmt(kg, { decimals: 1 }),
      // E4: tlo lokalne (same-origin, bez CORS); BASE_URL respektuje podkatalog.
      bgUrl: `${import.meta.env.BASE_URL ?? '/'}share/bg.webp`,
    })
      .then((result) => {
        if (cancelled) return;
        setBlob(result);
        setImageUrl((prev) => { if (prev) URL.revokeObjectURL(prev); return URL.createObjectURL(result); });
      })
      .catch((err) => {
        if (cancelled) return;
        // X29: telemetria brakujacych faz — dotad client_errors widzialo tylko
        // faze load (u rodzica). Podzial wg planu X29: render html2canvas =
        // generate; serializacja canvas.toBlob do pliku = share.
        const detail = err instanceof Error ? err.message : String(err);
        reportClientErrorWithCurrentUid({
          code: detail === 'Failed to create blob'
            ? 'body-compare-export-share'
            : 'body-compare-export-generate',
          phase: 'other',
          detail,
        });
        setError(t('comp.share.generateError'));
      })
      .finally(() => { if (!cancelled) setIsGenerating(false); });
    return () => { cancelled = true; };
  }, [open, template, format]); // eslint-disable-line react-hooks/exhaustive-deps

  const shareFile = (): File | null =>
    blob ? new File([blob], `sylwetka-${before.date}-${after.date}.jpg`, { type: 'image/jpeg' }) : null;

  const markSaved = (action: 'download' | 'share') => {
    // X29: udany zapis/share kasuje wczesniejszy komunikat bledu.
    setError(null);
    setSavedAction(action);
    void hapticSuccess();
    window.setTimeout(() => setSavedAction(null), 1800);
  };

  // WP-L (X29): wspólna ścieżka share/download w lib/share-export (Z179+Z198:
  // natywnie "Pobierz" idzie przez share sheet, AbortError bez fałszywego sukcesu).
  const runShareExport = async (action: 'download' | 'share') => {
    const file = shareFile();
    if (!file) return;
    const result = await shareOrDownloadFile(file, {
      title: t('measurements.shareTitle'),
      preferShare: action === 'share',
      // X29 (WP-E): porazka systemowego share laduje w telemetrii (faza share).
      onShareError: (err) => reportClientErrorWithCurrentUid({
        code: 'body-compare-export-share',
        phase: 'other',
        detail: err instanceof Error ? err.message : String(err),
      }),
    });
    if (result === 'failed') setError(t('comp.share.generateError'));
    if (result === 'downloaded') markSaved('download');
    if (result === 'shared') markSaved(action);
  };

  const handleDownload = async () => {
    if (!imageUrl) return;
    await runShareExport('download');
  };

  const handleShare = async () => {
    await runShareExport('share');
  };

  const formats: Array<{ id: BodyCompareFormat; label: string }> = [
    { id: 'square', label: t('measurements.shareFormat11') },
    { id: 'story', label: t('measurements.shareFormat916') },
  ];
  const templates: Array<{ id: BodyCompareTemplate; label: string }> = [
    { id: 'classic', label: t('measurements.shareTemplate.classic') },
    { id: 'accent', label: t('measurements.shareTemplate.accent') },
    { id: 'photo', label: t('measurements.shareTemplate.photo') },
  ];

  // Zrzut wlasciciela 2026-09-04 (iPhone 390 px): "KLASYCZNY" uciety przy prawej
  // krawedzi pigulki. flex-1 (basis 0) = rowne trzecie po 98.7 px, a etykieta w
  // 12 px + tracking-wide potrzebowala 104 px; min-w-11 z toggleButtonClasses
  // wylacza ochrone min-content, wiec chip kurczyl sie pod tekst. flex-auto =
  // basis z tresci (11 px bez trackingu + px-2: 87 px), wolne miejsce dzielone po
  // rowno; flex-wrap na rzedzie zawija dopiero, gdy tresc naprawde sie nie miesci
  // (skalowanie czcionki). Kontrakt: e2e body-share-dialog.spec (pomiar Range vs
  // wnetrze chipa przy 390/320, PL i EN).
  const chip = (active: boolean) => cn(
    'flex-auto whitespace-nowrap rounded-full px-2 py-1.5 text-[11px] font-bold uppercase transition-colors',
    toggleButtonClasses(active),
    active ? 'bg-primary text-primary-foreground' : 'bg-surface-highest text-muted-foreground',
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{t('measurements.shareTitle')}</DialogTitle>
          <DialogDescription>{t('comp.share.subtitle')}</DialogDescription>
        </DialogHeader>

        <div className="flex flex-wrap gap-1.5" data-testid="body-share-format-chips">
          {formats.map(({ id, label }) => (
            <button
              key={id}
              type="button"
              onClick={() => setFormat(id)}
              aria-pressed={format === id}
              className={chip(format === id)}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap gap-1.5" data-testid="body-share-template-chips">
          {templates.map(({ id, label }) => (
            <button
              key={id}
              type="button"
              onClick={() => setTemplate(id)}
              aria-pressed={template === id}
              className={chip(template === id)}
            >
              {label}
            </button>
          ))}
        </div>

        {isGenerating && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        )}

        {error && <p className="text-sm text-destructive text-center py-4">{error}</p>}

        {imageUrl && !isGenerating && (
          <div className="space-y-4">
            <img
              src={imageUrl}
              alt={t('comp.share.imageAlt')}
              className="mx-auto max-h-[42vh] w-auto rounded-lg border"
            />
            {/* Przy 320 px min-content obu przyciskow (nowrap, ikona) = 261 px > 240 px
                tresci arkusza; grid DialogContent rozszerzal tor i arkusz dostawal
                scroll poziomy tnacy prawe chipy. basis 8rem: jedna linia dopiero od
                264 px tresci (min-content obu = 261 px, wiec bez ucinania), czyli
                rowne polowy od 360 px; ponizej stos zamiast poza krawedz. */}
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" className="flex-1 basis-32" onClick={handleDownload}>
                {savedAction === 'download' ? (
                  <Check className="h-4 w-4 mr-2 text-fitness-success" />
                ) : (
                  <Download className="h-4 w-4 mr-2" />
                )}
                {savedAction === 'download' ? t('comp.share.saved') : t('comp.share.download')}
              </Button>
              <Button className="flex-1 basis-32" onClick={handleShare}>
                {savedAction === 'share' ? (
                  <Check className="h-4 w-4 mr-2" />
                ) : (
                  <Share2 className="h-4 w-4 mr-2" />
                )}
                {savedAction === 'share' ? t('comp.share.saved') : t('comp.share.share')}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
