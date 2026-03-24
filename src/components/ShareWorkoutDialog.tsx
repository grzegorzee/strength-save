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
import { generateWorkoutImage, type ShareData } from '@/lib/share-utils';

interface Props {
  data: ShareData;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const ShareWorkoutDialog = ({ data, open, onOpenChange }: Props) => {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [blob, setBlob] = useState<Blob | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [photoDataUrl, setPhotoDataUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const generate = async (photo?: string | null) => {
    setIsGenerating(true);
    setError(null);
    if (imageUrl) URL.revokeObjectURL(imageUrl);
    try {
      const result = await generateWorkoutImage(data, photo || undefined);
      setBlob(result);
      setImageUrl(URL.createObjectURL(result));
    } catch {
      setError('Nie udało się wygenerować obrazu');
    } finally {
      setIsGenerating(false);
    }
  };

  useEffect(() => {
    if (!open) {
      if (imageUrl) URL.revokeObjectURL(imageUrl);
      setImageUrl(null);
      setBlob(null);
      setError(null);
      setPhotoDataUrl(null);
      return;
    }

    generate(null);
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      setPhotoDataUrl(dataUrl);
      generate(dataUrl);
    };
    reader.readAsDataURL(file);
  };

  const handleRemovePhoto = () => {
    setPhotoDataUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    generate(null);
  };

  const handleDownload = () => {
    if (!imageUrl) return;
    const a = document.createElement('a');
    a.href = imageUrl;
    a.download = `trening-${data.date}.png`;
    a.click();
  };

  const handleShare = async () => {
    if (!blob) return;
    const file = new File([blob], `trening-${data.date}.png`, { type: 'image/png' });
    if (navigator.share && navigator.canShare?.({ files: [file] })) {
      await navigator.share({
        title: `Trening: ${data.dayName}`,
        files: [file],
      });
    } else {
      handleDownload();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Udostępnij trening</DialogTitle>
          <DialogDescription>Wygenerowany obraz podsumowania</DialogDescription>
        </DialogHeader>

        {/* Photo toggle */}
        <div className="flex items-center gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
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
              Usuń zdjęcie
            </Button>
          ) : (
            <Button
              variant="outline"
              size="sm"
              className="flex-1 text-xs"
              onClick={() => fileInputRef.current?.click()}
            >
              <Camera className="h-3.5 w-3.5 mr-1" />
              Dodaj zdjęcie
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
              alt="Podsumowanie treningu"
              className="w-full rounded-lg border"
            />
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={handleDownload}>
                <Download className="h-4 w-4 mr-2" />
                Pobierz
              </Button>
              <Button className="flex-1" onClick={handleShare}>
                <Share2 className="h-4 w-4 mr-2" />
                Udostępnij
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
