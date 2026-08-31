import { useState } from 'react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface GroupTileProps {
  label: string;
  /** X28 WP-D: string dopuszczony (np. "5/18" na kaflu odznak, "" = bez licznika). */
  count: number | string;
  /** null = grupa bez zdjecia (np. Wlasne) — od razu gradient. */
  imageUrl: string | null;
  onClick: () => void;
  /** X28 WP-D: 'contain' dla medalionow webp (nie moga byc croppowane coverem);
   *  domyslnie 'cover' — zachowanie /exercises bez zmian. */
  imageFit?: 'cover' | 'contain';
  /** X28 WP-D: ikona na gradiencie fallbacku (menu wykresow bez grafik). */
  icon?: LucideIcon;
  /** X28 WP-D: jednozdaniowy opis pod tytulem (kafle wykresow). */
  description?: string;
}

/**
 * X27 WP-E: kafel grupy miesniowej na poziomie 1 zakladki Cwiczenia.
 * Zdjecie 78 px object-cover + nazwa + licznik w akcencie (design-exercises-tab.md).
 * Brak/blad pliku (WP-IMG moze jeszcze nie dostarczyc) → gradient surface, zero
 * zepsutych imgow (edge case 5).
 * X28 WP-D: reuzywany przez Postepy (medaliony object-contain na #131313) i menu
 * wykresow (fallback gradient + ikona + opis) — nowe propsy opcjonalne.
 */
export const GroupTile = ({ label, count, imageUrl, onClick, imageFit = 'cover', icon: Icon, description }: GroupTileProps) => {
  const [imgFailed, setImgFailed] = useState(false);
  const showImage = Boolean(imageUrl) && !imgFailed;

  return (
    <button
      type="button"
      data-testid="exercise-group-tile"
      onClick={onClick}
      className="overflow-hidden rounded-[20px] bg-surface-low text-left transition-colors hover:bg-surface-high"
    >
      {showImage ? (
        <img
          src={imageUrl ?? undefined}
          alt=""
          loading="lazy"
          className={cn(
            'h-[78px] w-full',
            // #131313 z planu = token surface-low (guard: zero hexow mockupu).
            imageFit === 'contain' ? 'bg-surface-low object-contain p-2' : 'object-cover',
          )}
          onError={() => setImgFailed(true)}
        />
      ) : (
        <span
          data-testid="group-tile-fallback"
          aria-hidden="true"
          className="flex h-[78px] w-full items-center justify-center bg-gradient-to-br from-surface-highest to-surface-lowest"
        >
          {Icon && <Icon className="h-6 w-6 text-primary" />}
        </span>
      )}
      <span className="flex min-h-[48px] items-start justify-between gap-2 px-3 pb-2.5 pt-2">
        <span className="min-w-0 break-words font-heading text-[15px] font-bold uppercase leading-tight tracking-tight">
          {label}
        </span>
        <span className="eyebrow-mono shrink-0 font-bold text-primary">{count}</span>
      </span>
      {description && (
        <span className="-mt-1.5 block px-3 pb-2.5 text-xs leading-snug text-muted-foreground">
          {description}
        </span>
      )}
    </button>
  );
};
