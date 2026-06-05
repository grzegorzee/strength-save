import { cn } from '@/lib/utils';

interface TierBadgeProps {
  label: string;
  className?: string;
}

/**
 * Pigułka poziomu (np. "Elite Tier") wg mockupu Profilu — lime na półprzezroczystym
 * tle, ghost-ring zamiast twardego bordera.
 */
export const TierBadge = ({ label, className }: TierBadgeProps) => (
  <span
    className={cn(
      'inline-flex items-center rounded-full bg-primary/15 px-4 py-1.5 text-xs font-bold uppercase tracking-[0.16em] text-primary ring-1 ring-primary/25',
      className,
    )}
  >
    {label}
  </span>
);
