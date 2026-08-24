import type { ReactNode } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useTranslation } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';

interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmLabel: string;
  /** Etykieta odrzucenia; domyślnie common.cancel (T4: "Nie teraz" w popupie pomiarów). */
  cancelLabel?: string;
  destructive?: boolean;
  onConfirm: () => void;
  /** WP-I: opcjonalna treść między opisem a przyciskami (np. input imienia). */
  children?: ReactNode;
}

// Wspólny dialog potwierdzenia dla akcji destrukcyjnych (kasowanie, reset, merge).
// Jeden wzorzec zamiast trzech różnych (AlertDialog inline / brak potwierdzenia).
export const ConfirmDialog = ({ open, onOpenChange, title, description, confirmLabel, cancelLabel, destructive, onConfirm, children }: ConfirmDialogProps) => {
  const { t } = useTranslation();
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        {children}
        <AlertDialogFooter>
          <AlertDialogCancel>{cancelLabel ?? t('common.cancel')}</AlertDialogCancel>
          <AlertDialogAction
            className={cn(destructive && 'bg-destructive text-destructive-foreground hover:bg-destructive/90')}
            onClick={() => { onOpenChange(false); onConfirm(); }}
          >
            {confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
