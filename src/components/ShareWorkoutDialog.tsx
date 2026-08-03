import { useState, useEffect, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Loader2, Download, Share2, Camera, X } from 'lucide-react';
import { Capacitor } from '@capacitor/core';
import { downscalePhoto, generateWorkoutImage, type ShareData, type ShareTemplate } from '@/lib/share-utils';
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
    // 'photo' bez zdjęcia nie ma sensu na starcie — degraduje do gradientu.
    return raw === 'minimal' ? 'minimal' : 'gradient';
  } catch {
    return 'gradient';
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
  const fileInputRef = useRef<HTMLInputElement>(null);

  const generate = async (photo: string | null, tpl: ShareTemplate) => {
    setIsGenerating(true);
    setError(null);
    if (imageUrl) URL.revokeObjectURL(imageUrl);
    try {
      const result = await generateWorkoutImage(data, photo || undefined, lang, unit, tpl);
      setBlob(result);
      setImageUrl(URL.createObjectURL(result));
    } catch {
      setError(t('comp.share.generateError'));
    } finally {
      setIsGenerating(false);
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

  useEffect(() => {
    if (!open) {
      if (imageUrl) URL.revokeObjectURL(imageUrl);
      setImageUrl(null);
      setBlob(null);
      setError(null);
      setPhotoDataUrl(null);
      setTemplate(loadStoredTemplate());
      return;
    }

    void generate(null, loadStoredTemplate());
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

  const systemShare = async (file: File) => {
    try {
      await navigator.share({
        title: t('comp.share.shareTitle', { dayName: data.dayName }),
        files: [file],
      });
    } catch (err) {
      // Zamknięcie sheeta (AbortError) to nie błąd — wzorzec Analytics.tsx.
      if (err instanceof Error && err.name === 'AbortError') return;
      setError(t('comp.share.generateError'));
    }
  };

  const handleDownload = async () => {
    if (!imageUrl) return;
    const file = shareFile();
    // Z179: WKWebView ignoruje <a download> — natywnie "Pobierz" idzie przez
    // share sheet (iOS ma tam "Zapisz obraz"), bez nowych pluginów.
    if (Capacitor.isNativePlatform() && file && navigator.canShare?.({ files: [file] })) {
      await systemShare(file);
      return;
    }
    const a = document.createElement('a');
    a.href = imageUrl;
    a.download = `trening-${data.date}.jpg`;
    a.click();
  };

  const handleShare = async () => {
    const file = shareFile();
    if (!file) return;
    if (navigator.canShare?.({ files: [file] })) {
      await systemShare(file);
    } else {
      await handleDownload();
    }
  };

  const templates: Array<{ id: ShareTemplate; label: string }> = [
    { id: 'gradient', label: t('comp.share.tplGradient') },
    { id: 'photo', label: t('comp.share.tplPhoto') },
    { id: 'minimal', label: t('comp.share.tplMinimal') },
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
                template === id ? 'bg-primary text-primary-foreground' : 'bg-surface-highest text-muted-foreground',
              )}
            >
              {label}
            </button>
          ))}
        </div>

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
              className="w-full rounded-lg border"
            />
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={handleDownload}>
                <Download className="h-4 w-4 mr-2" />
                {t('comp.share.download')}
              </Button>
              <Button className="flex-1" onClick={handleShare}>
                <Share2 className="h-4 w-4 mr-2" />
                {t('comp.share.share')}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
