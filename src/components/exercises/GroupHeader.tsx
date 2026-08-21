import { useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';

interface GroupHeaderProps {
  title: string;
  /** Np. "28 cwiczen" — zlokalizowany przez strone. */
  countLabel: string;
  /** null = grupa bez zdjecia (np. Wlasne) — gradient zamiast fotki. */
  imageUrl: string | null;
  onBack: () => void;
  /** Zlokalizowany aria-label przycisku wstecz. */
  backLabel: string;
  /** X28 WP-D: 'contain' dla medalionow webp — hero na ciemnym gradiencie,
   *  medalion object-contain po prawej; domyslnie 'cover' (bez zmian /exercises). */
  imageFit?: 'cover' | 'contain';
}

/**
 * X27 WP-E: naglowek poziomu 2 zakladki Cwiczenia — hero 150 px ze zdjeciem
 * grupy, glass-przycisk wstecz i tytul grupy (design-exercises-tab.md, ekran 2).
 * Hero bez loading=lazy (LCP widoku grupy); blad pliku → gradient (edge case 5).
 * Full-bleed przez -mx-5 -mt-5 (wzorzec ExerciseDetail).
 * X28 WP-D: reuzywany przez sekcje Postepow (imageFit="contain").
 */
export const GroupHeader = ({ title, countLabel, imageUrl, onBack, backLabel, imageFit = 'cover' }: GroupHeaderProps) => {
  const [imgFailed, setImgFailed] = useState(false);
  const showImage = Boolean(imageUrl) && !imgFailed;

  return (
    <div className="-mx-5 -mt-5" data-testid="group-hero">
      <div className={cn(
        'relative h-[150px] w-full overflow-hidden',
        // Ciemny gradient tokenami (guard: zero hexow mockupu; #131313 = surface-low).
        imageFit === 'contain' ? 'bg-gradient-to-br from-surface-low to-surface-lowest' : 'bg-surface-low',
      )}
      >
        {showImage ? (
          <img
            src={imageUrl ?? undefined}
            alt=""
            className={imageFit === 'contain' ? 'ml-auto h-full object-contain p-3' : 'h-full w-full object-cover'}
            onError={() => setImgFailed(true)}
          />
        ) : (
          <div aria-hidden="true" className="h-full w-full bg-gradient-to-br from-surface-highest to-surface-lowest" />
        )}
        <button
          type="button"
          onClick={onBack}
          aria-label={backLabel}
          className="absolute left-4 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-black/60 text-white backdrop-blur"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
      </div>
      <div className="px-5 pt-4">
        <p className="eyebrow-mono font-bold text-primary">{countLabel}</p>
        <h1 className="mt-1 font-heading text-3xl font-bold uppercase tracking-tight">{title}</h1>
      </div>
    </div>
  );
};
