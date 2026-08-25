import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
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
import { Mail, Bell, Loader2, Send } from 'lucide-react';
import { adminBroadcastEmail, adminSendPush } from '@/lib/registration-api';
import { useToast } from '@/hooks/use-toast';
import { useTranslation } from '@/contexts/LanguageContext';
import type { TranslationKey } from '@/i18n';

type CommsTemplate = 'release' | 'week' | 'free';

// X35c (WP-E, pkt 4): szablony wypelniaja pola (tresc edytowalna), "free" czysci.
const TEMPLATES: Array<{ id: CommsTemplate; labelKey: TranslationKey; titleKey?: TranslationKey; bodyKey?: TranslationKey }> = [
  { id: 'release', labelKey: 'admin.commsTplRelease', titleKey: 'admin.commsTplReleaseTitle', bodyKey: 'admin.commsTplReleaseBody' },
  { id: 'week', labelKey: 'admin.commsTplWeek', titleKey: 'admin.commsTplWeekTitle', bodyKey: 'admin.commsTplWeekBody' },
  { id: 'free', labelKey: 'admin.commsTplFree' },
];

interface AdminCommsCardProps {
  cohorts: string[];
  /** X35c: liczba kont per target ('all' + kohorty) do podgladu; brak = bez liczby. */
  recipientCounts?: Record<string, number>;
}

// Komunikacja: broadcast mailowy + powiadomienia push do wszystkich lub do cohorty.
export const AdminCommsCard = ({ cohorts, recipientCounts }: AdminCommsCardProps) => {
  const { toast } = useToast();
  const { t } = useTranslation();
  const [channel, setChannel] = useState<'email' | 'push'>('push');
  const [target, setTarget] = useState('all');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [template, setTemplate] = useState<CommsTemplate>('free');
  // T15: mirror pusha do dzwonka (inbox user_events); dotyczy tylko kanału push.
  const [inbox, setInbox] = useState(true);
  const [sending, setSending] = useState(false);
  const [lastResult, setLastResult] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const targets = ['all', ...cohorts];
  const targetLabel = target === 'all' ? t('admin.commsTargetAll') : target;
  const recipientCount = recipientCounts?.[target];

  const applyTemplate = (id: CommsTemplate) => {
    setTemplate(id);
    const tpl = TEMPLATES.find((entry) => entry.id === id);
    setSubject(tpl?.titleKey ? t(tpl.titleKey) : '');
    setBody(tpl?.bodyKey ? t(tpl.bodyKey) : '');
  };

  const validateBeforeSend = () => {
    if (!body.trim() || (channel === 'email' && !subject.trim()) || (channel === 'push' && !subject.trim())) {
      toast({
        title: t('admin.commsMissingTitle'),
        description: channel === 'email' ? t('admin.commsMissingEmail') : t('admin.commsMissingPush'),
        variant: 'destructive',
      });
      return false;
    }
    setConfirmOpen(true);
    return true;
  };

  const send = async () => {
    setSending(true);
    try {
      let resultText: string;
      if (channel === 'email') {
        const res = await adminBroadcastEmail({ target, subject, body });
        resultText = t('admin.commsDeliveredShort', { sent: res.sent, total: res.total });
      } else {
        const res = await adminSendPush({ target, title: subject, body, inbox });
        resultText = t('admin.commsDelivered', {
          sent: res.sent, total: res.total, failed: res.failed, invalid: res.invalidTokens,
        });
        // T15: stara funkcja bez mirrora nie zwraca inboxWritten — wtedy bez dopisku.
        if (typeof res.inboxWritten === 'number') {
          resultText += ` ${t('admin.commsInboxWritten', { n: res.inboxWritten })}`;
        }
      }
      setLastResult(resultText);
      toast({ title: t('admin.commsSentTitle'), description: resultText });
      setSubject(''); setBody(''); setTemplate('free');
    } catch (e) {
      toast({
        title: t('admin.errorTitle'),
        description: e instanceof Error ? e.message : t('admin.commsSendFailed'),
        variant: 'destructive',
      });
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base font-heading font-bold uppercase tracking-tight">
            <Send className="h-4 w-4 text-primary" /> {t('admin.commsTitle')}
          </CardTitle>
          <CardDescription>{t('admin.commsDesc')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2">
            <button onClick={() => setChannel('push')} className={`flex-1 rounded-xl py-2 text-sm font-bold uppercase tracking-wide flex items-center justify-center gap-2 ${channel === 'push' ? 'bg-fitness-cyan text-background' : 'bg-surface-highest text-muted-foreground'}`}>
              <Bell className="h-4 w-4" /> Push
            </button>
            <button onClick={() => setChannel('email')} className={`flex-1 rounded-xl py-2 text-sm font-bold uppercase tracking-wide flex items-center justify-center gap-2 ${channel === 'email' ? 'bg-fitness-cyan text-background' : 'bg-surface-highest text-muted-foreground'}`}>
              <Mail className="h-4 w-4" /> Email
            </button>
          </div>

          <div>
            <p className="text-xs text-muted-foreground mb-1.5">{t('admin.commsRecipients')}</p>
            <div className="flex flex-wrap gap-1.5">
              {targets.map((tg) => (
                <button key={tg} onClick={() => setTarget(tg)} className={`rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wide ${target === tg ? 'bg-primary text-primary-foreground' : 'bg-surface-highest text-muted-foreground'}`}>
                  {tg === 'all' ? t('admin.filterAll') : tg}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="text-xs text-muted-foreground mb-1.5">{t('admin.commsTemplates')}</p>
            <div className="flex flex-wrap gap-1.5">
              {TEMPLATES.map((tpl) => (
                <button
                  key={tpl.id}
                  type="button"
                  onClick={() => applyTemplate(tpl.id)}
                  className={`rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wide ${template === tpl.id ? 'bg-primary text-primary-foreground' : 'bg-surface-highest text-muted-foreground'}`}
                >
                  {t(tpl.labelKey)}
                </button>
              ))}
            </div>
          </div>

          <Input
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder={channel === 'email' ? t('admin.commsSubjectEmail') : t('admin.commsSubjectPush')}
          />
          <Textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder={channel === 'email' ? t('admin.commsBodyEmail') : t('admin.commsBodyPush')}
            rows={4}
          />

          {channel === 'push' && (
            <label className="flex items-center justify-between gap-3 rounded-xl bg-surface-low px-3 py-2">
              <span className="text-sm text-muted-foreground">{t('admin.commsInboxToggle')}</span>
              <Switch checked={inbox} onCheckedChange={setInbox} />
            </label>
          )}

          <Button className="w-full" onClick={validateBeforeSend} disabled={sending}>
            {sending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
            {channel === 'email' ? t('admin.commsSendEmail') : t('admin.commsSendPush')}
          </Button>

          {lastResult && (
            <p className="rounded-lg bg-surface-low px-3 py-2 text-xs text-muted-foreground" data-testid="admin-comms-result">
              {lastResult}
            </p>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('admin.commsConfirmTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {channel === 'email'
                ? t('admin.commsConfirmEmail', { target: targetLabel })
                : t('admin.commsConfirmPush', { target: targetLabel })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          {/* X35c: podglad przed wysylka — kanal, odbiorcy (z liczba, gdy znana), tytul, tresc. */}
          <div data-testid="admin-comms-preview" className="space-y-2 rounded-xl bg-surface-low p-3 text-sm">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">{t('admin.commsPreviewTitle')}</p>
            <p className="text-xs text-muted-foreground">
              {t('admin.commsPreviewChannel', { channel: channel === 'email' ? 'E-mail' : 'Push' })}
              {' / '}
              {t('admin.commsPreviewRecipients', { target: targetLabel })}
              {typeof recipientCount === 'number' && ` (${t('admin.commsPreviewCount', { n: recipientCount })})`}
            </p>
            <p className="font-semibold">{subject}</p>
            <p className="whitespace-pre-wrap text-muted-foreground">{body}</p>
            {channel === 'push' && (
              <p className="text-xs text-muted-foreground">
                {t('admin.commsPreviewPushNote')}
                {inbox ? ` ${t('admin.commsPreviewInboxOn')}` : ''}
              </p>
            )}
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={sending}>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={(event) => { event.preventDefault(); setConfirmOpen(false); void send(); }} disabled={sending}>
              {t('admin.commsSend')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
