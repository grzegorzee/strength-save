import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Loader2, Download, Share2 } from 'lucide-react';
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

  useEffect(() => {
    if (!open) {
      if (imageUrl) URL.revokeObjectURL(imageUrl);
      setImageUrl(null);
      setBlob(null);
      setError(null);
      return;
    }

    const generate = async () => {
      setIsGenerating(true);
      setError(null);
      try {
        const result = await generateWorkoutImage(data);
        setBlob(result);
        setImageUrl(URL.createObjectURL(result));
      } catch (e) {
        setError('Nie udało się wygenerować obrazu');
      } finally {
        setIsGenerating(false);
      }
    };

    generate();
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

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

        {isGenerating && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        )}

        {error && <p className="text-sm text-destructive text-center py-4">{error}</p>}

        {imageUrl && (
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
