import { useState, useEffect, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { toggleButtonClasses } from '@/components/ui/chip-button';
import { Loader2, Download, Share2, Camera, Check, X } from 'lucide-react';
import { downscalePhoto, generateWorkoutImage, type ShareData, type ShareHero, type ShareTemplate } from '@/lib/share-utils';
import { shareOrDownloadFile } from '@/lib/share-export';
import { hapticSuccess } from '@/lib/haptics';
import { useTranslation } from '@/contexts/LanguageContext';
import { useUnit } from '@/contexts/UnitContext';
import { cn } from '@/lib/utils';

interface Props {
  data: ShareData;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// Z180: wybór szablonu zapamiętany między sesjami.
const TEMPLATE_STORAGE_KEY = 'fittracker_share_template_v1';

const loadStoredTemplate = (): ShareTemplate => {
  try {
    const raw = localStorage.getItem(TEMPLATE_STORAGE_KEY);
    // 'photo' bez zdjęcia nie ma sensu na starcie — degraduje do domyślnego.
    // Runna p.1 (spec A4): nowy domyślny szablon 'story'; jawnie zapisany wybór
    // gradient/minimal zostaje uszanowany.
    if (raw === 'minimal' || raw === 'gradient') return raw;
    return 'story';
  } catch {
    return 'story';
  }
};

export const ShareWorkoutDialog = ({ data, open, onOpenChange }: Props) => {
  const { t, lang } = useTranslation();
  const { unit } = useUnit();
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [blob, setBlob] = useState<Blob | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [photoDataUrl, setPhotoDataUrl] = useState<string | null>(null);
  const [template, setTemplate] = useState<ShareTemplate>(() => loadStoredTemplate());
  // Runna p.1 (spec A4): hero-statystyka szablonu story wybierana przez usera.
  const [hero, setHero] = useState<ShareHero>('tonnage');
  // Z198: który przycisk pokazuje "Zapisano ✓" (null = żaden).
  const [savedAction, setSavedAction] = useState<'download' | 'share' | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  // Bug 30 (X30): licznik generacji — starszy, wolniejszy run (pierwszy płaci
  // lazy import html2canvas) kończył OSTATNI i cicho podmieniał podgląd/blob
  // na obraz niezgodny z zaznaczonymi chipami. Wynik nieaktualnego runa jest
  // odrzucany (wzorzec: BodyCompareShareDialog cancelled).
  const generationRef = useRef(0);

  const generate = async (photo: string | null, tpl: ShareTemplate, heroSel: ShareHero = hero) => {
    const runId = ++generationRef.current;
    setIsGenerating(true);
    setError(null);
    try {
      const result = await generateWorkoutImage(data, photo || undefined, lang, unit, tpl, heroSel);
      if (generationRef.current !== runId) return;
      setBlob(result);
      // Revoke wyłącznie URL-a realnie zastępowanego — przegrany run nie tworzy URL-a.
      setImageUrl((prev) => { if (prev) URL.revokeObjectURL(prev); return URL.createObjectURL(result); });
    } catch {
      if (generationRef.current !== runId) return;
      setError(t('comp.share.generateError'));
    } finally {
      if (generationRef.current === runId) setIsGenerating(false);
    }
  };

  const selectTemplate = (tpl: ShareTemplate) => {
    if (tpl === 'photo' && !photoDataUrl) {
      // Reguła 6: chip "Zdjęcie" bez zdjęcia otwiera picker zamiast robić no-op.
      fileInputRef.current?.click();
      return;
    }
    setTemplate(tpl);
    try { localStorage.setItem(TEMPLATE_STORAGE_KEY, tpl); } catch { /* zostaje default */ }
    void generate(photoDataUrl, tpl);
  };

  const selectHero = (heroSel: ShareHero) => {
    setHero(heroSel);
    void generate(photoDataUrl, template, heroSel);
  };

  useEffect(() => {
    if (!open) {
      // Zamknięcie unieważnia wiszące runy (wynik po zamknięciu nie tworzy URL-a).
      generationRef.current += 1;
      if (imageUrl) URL.revokeObjectURL(imageUrl);
      setImageUrl(null);
      setBlob(null);
      setError(null);
      setPhotoDataUrl(null);
      setTemplate(loadStoredTemplate());
      setHero('tonnage');
      return;
    }

    void generate(null, loadStoredTemplate(), 'tonnage');
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const handlePhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsGenerating(true);
    try {
      // Z179: 12 MP z aparatu bez downscale = crash WKWebView (kopie base64 w pamięci).
      const dataUrl = await downscalePhoto(file);
      setPhotoDataUrl(dataUrl);
      setTemplate('photo');
      try { localStorage.setItem(TEMPLATE_STORAGE_KEY, 'photo'); } catch { /* noop */ }
      await generate(dataUrl, 'photo');
    } catch {
      setIsGenerating(false);
      setError(t('comp.share.generateError'));
    }
  };

  const handleRemovePhoto = () => {
    setPhotoDataUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    setTemplate('gradient');
    try { localStorage.setItem(TEMPLATE_STORAGE_KEY, 'gradient'); } catch { /* noop */ }
    void generate(null, 'gradient');
  };

  const shareFile = (): File | null =>
    blob ? new File([blob], `trening-${data.date}.jpg`, { type: 'image/jpeg' }) : null;

  // Z198: widoczny sukces — "Zapisano ✓" + haptyka na ~1.8 s (wzorzec ApiKeysCard).
  const markSaved = (action: 'download' | 'share') => {
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
      title: t('comp.share.shareTitle', { dayName: data.dayName }),
      preferShare: action === 'share',
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

  const templates: Array<{ id: ShareTemplate; label: string }> = [
    { id: 'story', label: t('comp.share.tplStory') },
    { id: 'gradient', label: t('comp.share.tplGradient') },
    { id: 'photo', label: t('comp.share.tplPhoto') },
    { id: 'minimal', label: t('comp.share.tplMinimal') },
  ];

  // Hero tylko dla story; opcje bez danych znikają (brak PR = zostaje tonaż).
  const heroOptions: Array<{ id: ShareHero; label: string }> = [
    { id: 'tonnage', label: t('comp.share.heroTonnage') },
    ...(data.duration ? [{ id: 'duration' as const, label: t('comp.share.heroDuration') }] : []),
    ...(data.prs.length > 0 ? [{ id: 'pr' as const, label: t('comp.share.heroPR') }] : []),
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{t('comp.share.title')}</DialogTitle>
          <DialogDescription>{t('comp.share.subtitle')}</DialogDescription>
        </DialogHeader>

        {/* Z180: przełączniki szablonu */}
        <div className="flex gap-1.5" data-testid="share-template-chips">
          {templates.map(({ id, label }) => (
            <button
              key={id}
              type="button"
              onClick={() => selectTemplate(id)}
              aria-pressed={template === id}
              className={cn(
                'flex-1 rounded-full px-3 py-1.5 text-xs font-bold uppercase tracking-wide transition-colors',
                toggleButtonClasses(template === id),
                template === id ? 'bg-primary text-primary-foreground' : 'bg-surface-highest text-muted-foreground',
              )}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Runna p.1 (spec A4): wybór hero-statystyki dla szablonu story */}
        {template === 'story' && heroOptions.length > 1 && (
          <div className="flex gap-1.5" data-testid="share-hero-chips">
            {heroOptions.map(({ id, label }) => (
              <button
                key={id}
                type="button"
                onClick={() => selectHero(id)}
                aria-pressed={hero === id}
                className={cn(
                  'flex-1 rounded-full px-3 py-1.5 text-xs font-bold uppercase tracking-wide transition-colors',
                  toggleButtonClasses(hero === id),
                  hero === id ? 'bg-primary text-background' : 'bg-surface-highest text-muted-foreground',
                )}
              >
                {label}
              </button>
            ))}
          </div>
        )}

        {/* Photo toggle */}
        <div className="flex items-center gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handlePhotoSelect}
          />
          {photoDataUrl ? (
            <Button
              variant="outline"
              size="sm"
              className="flex-1 text-xs"
              onClick={handleRemovePhoto}
            >
              <X className="h-3.5 w-3.5 mr-1" />
              {t('comp.share.removePhoto')}
            </Button>
          ) : (
            <Button
              variant="outline"
              size="sm"
              className="flex-1 text-xs"
              onClick={() => fileInputRef.current?.click()}
            >
              <Camera className="h-3.5 w-3.5 mr-1" />
              {t('comp.share.addPhoto')}
            </Button>
          )}
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
              // E-T2: podgląd ograniczony wysokością — nagłówek, chipsy, podgląd
              // i przyciski Pobierz/Udostępnij mieszczą się razem na ekranie telefonu.
              className="mx-auto max-h-[42vh] w-auto rounded-lg border"
            />
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={handleDownload}>
                {savedAction === 'download' ? (
                  <Check className="h-4 w-4 mr-2 text-fitness-success" />
                ) : (
                  <Download className="h-4 w-4 mr-2" />
                )}
                {savedAction === 'download' ? t('comp.share.saved') : t('comp.share.download')}
              </Button>
              <Button className="flex-1" onClick={handleShare}>
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
