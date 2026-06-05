import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface StatCardProps {
  label: string;
  value: ReactNode;
  accent?: 'primary' | 'secondary';
  className?: string;
}

/**
 * Karta statystyki wg DESIGN.md (ekstremalna skala): mały label + wielka liczba.
 * Tło surface-low, bez borderów.
 */
export const StatCard = ({ label, value, accent = 'secondary', className }: StatCardProps) => (
  <div className={cn('rounded-xl bg-surface-low p-4', className)}>
    <p
      className={cn(
        'text-label-md font-bold uppercase tracking-[0.12em]',
        accent === 'primary' ? 'text-primary' : 'text-accent',
      )}
    >
      {label}
    </p>
    <p className="mt-1 font-heading text-3xl font-bold tabular-nums leading-none">{value}</p>
  </div>
);
