import { useState } from 'react';

interface GroupTileProps {
  label: string;
  count: number;
  /** null = grupa bez zdjecia (np. Wlasne) — od razu gradient. */
  imageUrl: string | null;
  onClick: () => void;
}

/**
 * X27 WP-E: kafel grupy miesniowej na poziomie 1 zakladki Cwiczenia.
 * Zdjecie 78 px object-cover + nazwa + licznik w akcencie (design-exercises-tab.md).
 * Brak/blad pliku (WP-IMG moze jeszcze nie dostarczyc) → gradient surface, zero
 * zepsutych imgow (edge case 5).
 */
export const GroupTile = ({ label, count, imageUrl, onClick }: GroupTileProps) => {
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
          className="h-[78px] w-full object-cover"
          onError={() => setImgFailed(true)}
        />
      ) : (
        <div
          data-testid="group-tile-fallback"
          aria-hidden="true"
          className="h-[78px] w-full bg-gradient-to-br from-surface-highest to-surface-lowest"
        />
      )}
      <span className="flex items-center justify-between gap-2 px-3 pb-2.5 pt-2">
        <span className="truncate font-heading text-[15px] font-bold uppercase leading-tight tracking-tight">
          {label}
        </span>
        <span className="eyebrow-mono shrink-0 font-bold text-primary">{count}</span>
      </span>
    </button>
  );
};
