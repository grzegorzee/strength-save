import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useTranslation } from '@/contexts/LanguageContext';
import { useToast } from '@/hooks/use-toast';
import { deleteOwnAccount } from '@/lib/registration-api';
import { cn } from '@/lib/utils';

// Apple 5.1.1(v): self-service usunięcie konta. Jeden dialog (word gate
// USUŃ/DELETE) dla Profilu, paywalla i bramek (B1, 2026-09-29): przed zakupem
// user nie dociera do Profilu, więc ścieżka musi być też tam, gdzie utknął.

export const DeleteAccountDialog = ({ open, onOpenChange, onDeleted }: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Konto Auth już nie istnieje: lokalne domknięcie sesji (logout bez cleanupu urządzeń). */
  onDeleted: () => Promise<void>;
}) => {
  const { t, lang } = useTranslation();
  const { toast } = useToast();
  const [confirmInput, setConfirmInput] = useState('');
  const [deleting, setDeleting] = useState(false);
  const confirmWord = lang === 'pl' ? 'USUŃ' : 'DELETE';

  useEffect(() => {
    if (open) setConfirmInput('');
  }, [open]);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await deleteOwnAccount();
      // Konto Auth już nie istnieje — lokalny logout domyka sesję, gate przejmuje resztę.
      await onDeleted();
    } catch (err) {
      setDeleting(false);
      toast({
        title: t('profile.deleteAccount.error'),
        description: err instanceof Error ? err.message : '',
        variant: 'destructive',
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!deleting) onOpenChange(next); }}>
      <DialogContent className="rounded-xl border-0 bg-surface-low">
        <DialogHeader>
          <DialogTitle className="font-heading uppercase text-destructive">{t('profile.deleteAccount')}</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">{t('profile.deleteAccount.desc')}</p>
        <div className="space-y-2">
          <label htmlFor="delete-account-confirm" className="text-label-md font-bold uppercase tracking-[0.12em] text-muted-foreground">
            {t('profile.deleteAccount.typeToConfirm', { word: confirmWord })}
          </label>
          <Input
            id="delete-account-confirm"
            value={confirmInput}
            onChange={(e) => setConfirmInput(e.target.value)}
            autoComplete="off"
          />
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={deleting}>
            {t('common.cancel')}
          </Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={deleting || confirmInput.trim().toUpperCase() !== confirmWord}
          >
            {deleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            {t('profile.deleteAccount.confirm')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

/** Tekstowy link "Usuń konto" + dialog, dla ekranów bez dostępu do Profilu. */
export const DeleteAccountLink = ({ onDeleted, className }: {
  onDeleted: () => Promise<void>;
  className?: string;
}) => {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        data-testid="delete-account-link"
        className={cn(
          'min-h-11 touch-manipulation text-center text-xs text-muted-foreground underline underline-offset-2 hover:text-destructive',
          className,
        )}
      >
        {t('profile.deleteAccount')}
      </button>
      <DeleteAccountDialog open={open} onOpenChange={setOpen} onDeleted={onDeleted} />
    </>
  );
};
