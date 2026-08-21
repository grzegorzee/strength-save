import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { LucideIcon } from 'lucide-react';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  hint?: string;
  ctaLabel?: string;
  onCta?: () => void;
  /** X28 WP-F: dekoracyjna ilustracja pro-look nad tekstem (zastępuje ikonę,
   *  dopóki plik się ładuje; onError wraca do ikony — zero zepsutych imgów). */
  imageUrl?: string;
}

/**
 * X28 WP-F: samodzielna ilustracja pustego stanu — dla ekranów, które mają
 * własny układ zamiast komponentu EmptyState (np. Strava, /plan po końcu
 * planu). Obraz czysto dekoracyjny: alt="" + aria-hidden + lazy; błąd pliku
 * = komponent znika i ekran wygląda jak dotąd.
 */
export const EmptyStateIllustration = ({ src, className }: { src: string; className?: string }) => {
  const [failed, setFailed] = useState(false);
  if (failed) return null;
  return (
    <img
      src={src}
      alt=""
      aria-hidden="true"
      loading="lazy"
      className={cn('mx-auto mb-5 h-40 w-full max-w-sm rounded-2xl object-cover', className)}
      onError={() => setFailed(true)}
    />
  );
};

// Pusty stan z zaproszeniem (Z82) — wzorzec z Cycles: ikona, 1 zdanie, CTA.
export const EmptyState = ({ icon: Icon, title, hint, ctaLabel, onCta, imageUrl }: EmptyStateProps) => {
  const [imgFailed, setImgFailed] = useState(false);
  const showImage = Boolean(imageUrl) && !imgFailed;
  return (
    <div className="text-center py-14 text-muted-foreground">
      {showImage ? (
        <img
          src={imageUrl}
          alt=""
          aria-hidden="true"
          loading="lazy"
          className="mx-auto mb-5 h-40 w-full max-w-sm rounded-2xl object-cover"
          onError={() => setImgFailed(true)}
        />
      ) : (
        <Icon className="h-12 w-12 mx-auto mb-4 opacity-30" />
      )}
      <p className="text-sm">{title}</p>
      {hint && <p className="text-xs mt-1">{hint}</p>}
      {ctaLabel && onCta && (
        <Button variant="outline" size="sm" className="mt-4" onClick={onCta}>
          {ctaLabel}
        </Button>
      )}
    </div>
  );
};
