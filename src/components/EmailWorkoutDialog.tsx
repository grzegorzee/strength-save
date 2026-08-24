// F-T3: dialog wysyłki podsumowania treningu (lub całej historii) mailem,
// np. do trenera. WP-I (X29): koniec bezwarunkowego zapisu adresu — po
// udanej wysyłce na NOWY adres popup "Zapisać jako trenera?" z opcjonalnym
// imieniem; znany adres leci bez popupu, ale z imieniem w payload (powitanie).
import { useEffect, useState } from 'react';
import { deleteField, doc, updateDoc } from 'firebase/firestore';
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
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { db } from '@/lib/firebase';
import { emailErrorKey, sendHistoryEmail, sendWorkoutEmail, type HistoryEmailRange } from '@/lib/email-workout';
import { useTranslation } from '@/contexts/LanguageContext';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface EmailWorkoutDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: 'workout' | 'history';
  uid: string;
  workoutId?: string;
  initialEmail?: string;
  /** WP-I: zapisany adres trenera z profilu — wysyłka na inny adres proponuje zapis. */
  savedTrainerEmail?: string;
  /** WP-I: zapisane imię trenera — idzie w payload jako powitanie w mailu. */
  savedTrainerName?: string;
}

export const EmailWorkoutDialog = ({
  open, onOpenChange, mode, uid, workoutId, initialEmail, savedTrainerEmail, savedTrainerName,
}: EmailWorkoutDialogProps) => {
  const { t, lang } = useTranslation();
  const [email, setEmail] = useState(initialEmail ?? '');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // H-T1: zakres historii (domyślnie ostatni tydzień).
  const [range, setRange] = useState<HistoryEmailRange>('week');
  // WP-I: popup zapisu po wysyłce (adres do zapisania) + input imienia.
  // Zapis z popupu nadpisuje props do końca sesji komponentu (profil dojdzie
  // ze snapshotem później; bez tego druga wysyłka znów pytałaby o zapis).
  const [savePromptFor, setSavePromptFor] = useState<string | null>(null);
  const [nameInput, setNameInput] = useState('');
  const [localSaved, setLocalSaved] = useState<{ email: string; name?: string } | null>(null);

  const knownEmail = localSaved?.email ?? savedTrainerEmail;
  const knownName = localSaved ? localSaved.name : savedTrainerName;

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
      // Imię tylko dla ZAPISANEGO adresu — cudze imię nie trafia w obcy mail.
      const trainerName = to === knownEmail ? knownName : undefined;
      if (mode === 'workout') {
        if (!workoutId) throw new Error('missing-workout');
        await sendWorkoutEmail(workoutId, to, lang, trainerName);
      } else {
        await sendHistoryEmail(to, lang, range, trainerName);
      }
      toast({ title: t('email.sentTitle'), description: t('email.sentDesc', { email: to }) });
      onOpenChange(false);
      // WP-I: nowy adres -> pytamy o zapis DOPIERO po udanej wysyłce.
      if (to !== knownEmail) {
        setNameInput('');
        setSavePromptFor(to);
      }
    } catch (err) {
      setError(t(emailErrorKey(err)));
    } finally {
      setSending(false);
    }
  };

  const handleSaveTrainer = () => {
    if (!savePromptFor) return;
    const name = nameInput.trim();
    // Offline: lokalnie i tak zadziała (localSaved), mirror dojdzie po powrocie sieci.
    updateDoc(doc(db, 'users', uid), {
      'preferences.trainerEmail': savePromptFor,
      'preferences.trainerName': name || deleteField(),
    }).catch(() => {});
    setLocalSaved({ email: savePromptFor, ...(name ? { name } : {}) });
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="rounded-xl border-0 bg-surface-low" data-testid="email-workout-dialog">
          <DialogHeader>
            <DialogTitle className="font-heading uppercase">
              {t(mode === 'workout' ? 'email.dialogTitleWorkout' : 'email.dialogTitleHistory')}
            </DialogTitle>
            <DialogDescription>{t('email.dialogDesc')}</DialogDescription>
          </DialogHeader>
          {mode === 'history' && (
            <div className="space-y-2">
              <p className="text-label-md font-bold uppercase tracking-[0.12em] text-muted-foreground">
                {t('email.rangeLabel')}
              </p>
              <div className="flex gap-2" role="radiogroup" aria-label={t('email.rangeLabel')}>
                {([
                  { value: 'week', label: t('email.rangeWeek'), testId: 'email-range-week' },
                  { value: 'last30', label: t('email.rangeLast30'), testId: 'email-range-last30' },
                ] as const).map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    role="radio"
                    aria-checked={range === option.value}
                    data-testid={option.testId}
                    onClick={() => setRange(option.value)}
                    className={cn(
                      'flex-1 rounded-lg border px-3 py-2 text-sm transition-colors',
                      range === option.value
                        ? 'border-primary bg-primary/10 font-semibold text-foreground'
                        : 'border-border text-muted-foreground',
                    )}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
          )}
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

      {/* WP-I: popup zapisu trenera — zawsze zamontowany, sterowany open (zasada Radix). */}
      <ConfirmDialog
        open={savePromptFor !== null}
        onOpenChange={(o) => { if (!o) setSavePromptFor(null); }}
        title={t('email.saveTrainer.title', { email: savePromptFor ?? '' })}
        description={t('email.saveTrainer.desc')}
        confirmLabel={t('email.saveTrainer.save')}
        cancelLabel={t('email.saveTrainer.skip')}
        onConfirm={handleSaveTrainer}
      >
        <Input
          value={nameInput}
          onChange={(e) => setNameInput(e.target.value)}
          maxLength={80}
          placeholder={t('email.saveTrainer.nameLabel')}
          aria-label={t('email.saveTrainer.nameLabel')}
          data-testid="save-trainer-name"
        />
      </ConfirmDialog>
    </>
  );
};
