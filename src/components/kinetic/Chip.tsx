import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface ChipProps {
  active?: boolean;
  onClick?: () => void;
  children: ReactNode;
  className?: string;
}

/**
 * Chip wg DESIGN.md §5: surface-highest dla nieaktywnego, secondary (cyan) dla aktywnego.
 */
export const Chip = ({ active, onClick, children, className }: ChipProps) => {
  const classes = cn(
    'whitespace-nowrap rounded-full px-4 py-2 text-xs font-bold uppercase tracking-[0.08em] transition-colors',
    active ? 'bg-accent text-accent-foreground' : 'bg-surface-highest text-muted-foreground',
    className,
  );
  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={classes}>
        {children}
      </button>
    );
  }
  return <span className={classes}>{children}</span>;
};
