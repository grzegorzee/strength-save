// F-T3: dialog wysyłki podsumowania treningu (lub całej historii) mailem,
// np. do trenera. Adres zapamiętywany w preferences.trainerEmail.
import { useEffect, useState } from 'react';
import { doc, updateDoc } from 'firebase/firestore';
import { Loader2, Mail } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { db } from '@/lib/firebase';
import { emailErrorKey, sendHistoryEmail, sendWorkoutEmail } from '@/lib/email-workout';
import { useTranslation } from '@/contexts/LanguageContext';
import { toast } from '@/hooks/use-toast';

interface EmailWorkoutDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: 'workout' | 'history';
  uid: string;
  workoutId?: string;
  initialEmail?: string;
}

export const EmailWorkoutDialog = ({ open, onOpenChange, mode, uid, workoutId, initialEmail }: EmailWorkoutDialogProps) => {
  const { t, lang } = useTranslation();
  const [email, setEmail] = useState(initialEmail ?? '');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setEmail((prev) => prev || initialEmail || '');
      setError(null);
    }
  }, [open, initialEmail]);

  const handleSend = async () => {
    const to = email.trim();
    if (!to) return;
    setSending(true);
    setError(null);
    try {
      if (mode === 'workout') {
        if (!workoutId) throw new Error('missing-workout');
        await sendWorkoutEmail(workoutId, to, lang);
      } else {
        await sendHistoryEmail(to, lang);
      }
      // Zapamiętaj adres na następny raz (offline: localnie i tak wysłaliśmy).
      updateDoc(doc(db, 'users', uid), { 'preferences.trainerEmail': to }).catch(() => {});
      toast({ title: t('email.sentTitle'), description: t('email.sentDesc', { email: to }) });
      onOpenChange(false);
    } catch (err) {
      setError(t(emailErrorKey(err)));
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-xl border-0 bg-surface-low" data-testid="email-workout-dialog">
        <DialogHeader>
          <DialogTitle className="font-heading uppercase">
            {t(mode === 'workout' ? 'email.dialogTitleWorkout' : 'email.dialogTitleHistory')}
          </DialogTitle>
          <DialogDescription>{t('email.dialogDesc')}</DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <label htmlFor="email-workout-to" className="text-label-md font-bold uppercase tracking-[0.12em] text-muted-foreground">
            {t('email.addressLabel')}
          </label>
          <Input
            id="email-workout-to"
            type="email"
            inputMode="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="trener@example.com"
          />
          {error && <p className="text-sm text-destructive" data-testid="email-workout-error">{error}</p>}
        </div>
        <DialogFooter>
          <Button
            onClick={handleSend}
            disabled={sending || !email.trim()}
            className="kinetic-primary-button"
            data-testid="email-workout-send"
          >
            {sending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Mail className="mr-2 h-4 w-4" />}
            {t(sending ? 'email.sending' : 'email.send')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
