import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Mail, Bell, Loader2, Send } from 'lucide-react';
import { adminBroadcastEmail, adminSendPush } from '@/lib/registration-api';
import { useToast } from '@/hooks/use-toast';

// Komunikacja: broadcast mailowy + powiadomienia push do wszystkich lub do cohorty.
export const AdminCommsCard = ({ cohorts }: { cohorts: string[] }) => {
  const { toast } = useToast();
  const [channel, setChannel] = useState<'email' | 'push'>('push');
  const [target, setTarget] = useState('all');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  const [lastResult, setLastResult] = useState<string | null>(null);

  const targets = ['all', ...cohorts];

  const send = async () => {
    if (!body.trim() || (channel === 'email' && !subject.trim()) || (channel === 'push' && !subject.trim())) {
      toast({ title: 'Uzupełnij treść', description: channel === 'email' ? 'Temat i treść maila.' : 'Tytuł i treść powiadomienia.', variant: 'destructive' });
      return;
    }
    if (!confirm(`Wysłać ${channel === 'email' ? 'maila' : 'push'} do: ${target === 'all' ? 'WSZYSTKICH' : target}?`)) return;
    setSending(true);
    try {
      let resultText: string;
      if (channel === 'email') {
        const res = await adminBroadcastEmail({ target, subject, body });
        resultText = `Dostarczono do ${res.sent}/${res.total}.`;
      } else {
        const res = await adminSendPush({ target, title: subject, body });
        resultText = `Dostarczono do ${res.sent}/${res.total}. Błędy: ${res.failed}. Martwe tokeny: ${res.invalidTokens}.`;
      }
      setLastResult(resultText);
      toast({ title: 'Wysłano', description: resultText });
      setSubject(''); setBody('');
    } catch (e) {
      toast({ title: 'Błąd', description: e instanceof Error ? e.message : 'Nie udało się wysłać.', variant: 'destructive' });
    } finally {
      setSending(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base font-heading font-bold uppercase tracking-tight">
          <Send className="h-4 w-4 text-primary" /> Komunikacja
        </CardTitle>
        <CardDescription>Broadcast mailowy lub push do wszystkich / wybranej grupy.</CardDescription>
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
          <p className="text-xs text-muted-foreground mb-1.5">Odbiorcy</p>
          <div className="flex flex-wrap gap-1.5">
            {targets.map((tg) => (
              <button key={tg} onClick={() => setTarget(tg)} className={`rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wide ${target === tg ? 'bg-primary text-primary-foreground' : 'bg-surface-highest text-muted-foreground'}`}>
                {tg === 'all' ? 'Wszyscy' : tg}
              </button>
            ))}
          </div>
        </div>

        <Input
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          placeholder={channel === 'email' ? 'Temat maila' : 'Tytuł powiadomienia'}
        />
        <Textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder={channel === 'email' ? 'Treść maila' : 'Treść powiadomienia'}
          rows={4}
        />

        <Button className="w-full" onClick={send} disabled={sending}>
          {sending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
          Wyślij {channel === 'email' ? 'mail' : 'push'}
        </Button>

        {lastResult && (
          <p className="rounded-lg bg-surface-low px-3 py-2 text-xs text-muted-foreground" data-testid="admin-comms-result">
            {lastResult}
          </p>
        )}
      </CardContent>
    </Card>
  );
};
