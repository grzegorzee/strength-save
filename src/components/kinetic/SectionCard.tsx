import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface SectionCardProps {
  label?: string;
  labelAccent?: 'primary' | 'secondary';
  children: ReactNode;
  className?: string;
}

/**
 * Sekcja wg DESIGN.md: tło surface-low (bez borderów/dividerów — No-Line),
 * radius xl, label uppercase. Granice przez surface shift, nie linie.
 */
export const SectionCard = ({ label, labelAccent = 'primary', children, className }: SectionCardProps) => (
  <section className={cn('rounded-xl bg-surface-low p-5', className)}>
    {label && (
      <h2
        className={cn(
          'mb-4 text-label-md font-bold uppercase tracking-[0.12em]',
          labelAccent === 'secondary' ? 'text-accent' : 'text-primary',
        )}
      >
        {label}
      </h2>
    )}
    {children}
  </section>
);
