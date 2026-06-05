import type { ComponentType, ReactNode } from 'react';
import { ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SettingRowProps {
  icon?: ComponentType<{ className?: string }>;
  label: string;
  value?: ReactNode;
  right?: ReactNode;
  onClick?: () => void;
  danger?: boolean;
}

/**
 * Wiersz ustawień wg mockupu Profilu: ikona + label + (wartość | własny element | chevron).
 * Bez dividerów — wiersze rozdzielone spacingiem wewnątrz SectionCard.
 */
export const SettingRow = ({ icon: Icon, label, value, right, onClick, danger }: SettingRowProps) => {
  const content = (
    <>
      {Icon && <Icon className={cn('h-5 w-5 shrink-0', danger ? 'text-destructive' : 'text-muted-foreground')} />}
      <span className={cn('flex-1 font-medium', danger && 'text-destructive')}>{label}</span>
      {right ?? (value != null && <span className="text-sm font-semibold text-muted-foreground">{value}</span>)}
      {onClick && !right && <ChevronRight className="h-4 w-4 text-muted-foreground/60" />}
    </>
  );

  if (onClick) {
    return (
      <button type="button" onClick={onClick} className="flex w-full items-center gap-3 py-3 text-left transition-colors hover:opacity-80">
        {content}
      </button>
    );
  }
  return <div className="flex items-center gap-3 py-3">{content}</div>;
};
