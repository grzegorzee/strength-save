import type { ComponentType, ReactNode } from 'react';
import { ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SettingRowProps {
  icon?: ComponentType<{ className?: string }>;
  label: string;
  /** Opcjonalny opis pod labelem (np. wyjaśnienie przełącznika). */
  description?: string;
  value?: ReactNode;
  right?: ReactNode;
  onClick?: () => void;
  danger?: boolean;
  /** Fala 2 (Profil): zwarty wiersz grupy (min 46px, mniejsza typografia, wartość mono). */
  compact?: boolean;
  /** Wartość w akcencie (statusy pozytywne: PRO, Połączono). */
  valueAccent?: boolean;
}

/**
 * Wiersz ustawień wg mockupu Profilu: ikona + label + (wartość | własny element | chevron).
 * Bez dividerów — wiersze rozdzielone spacingiem wewnątrz SectionCard.
 * Wariant compact (addytywny, fala 2): domyślny wygląd bez zmian (WorkoutSettingsSheet).
 */
export const SettingRow = ({
  icon: Icon, label, description, value, right, onClick, danger, compact, valueAccent,
}: SettingRowProps) => {
  const content = (
    <>
      {Icon && <Icon className={cn(compact ? 'h-4 w-4' : 'h-5 w-5', 'shrink-0', danger ? 'text-destructive' : 'text-muted-foreground')} />}
      <div className="min-w-0 flex-1">
        <p className={cn(compact ? 'truncate text-[13.5px] leading-snug' : 'font-medium', danger && 'text-destructive')}>{label}</p>
        {description && <p className="text-xs text-muted-foreground">{description}</p>}
      </div>
      {right ?? (value != null && (
        <span
          className={cn(
            compact ? 'shrink-0 font-mono text-[10.5px]' : 'text-sm font-semibold',
            valueAccent ? 'text-primary' : 'text-muted-foreground',
          )}
        >
          {value}
        </span>
      ))}
      {onClick && !right && <ChevronRight className={cn('shrink-0 text-muted-foreground/60', compact ? 'h-3.5 w-3.5' : 'h-4 w-4')} />}
    </>
  );

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={cn('flex w-full items-center gap-3 text-left transition-colors hover:opacity-80', compact ? 'min-h-[46px] py-2' : 'py-3')}
      >
        {content}
      </button>
    );
  }
  return <div className={cn('flex items-center gap-3', compact ? 'min-h-[46px] py-2' : 'py-3')}>{content}</div>;
};
