import { useState, useRef, useEffect, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, Send, MessageCircle, Trash2, FileText, Dumbbell, CalendarDays } from 'lucide-react';
import { useFirebaseWorkouts } from '@/hooks/useFirebaseWorkouts';
import { useTrainingPlan } from '@/hooks/useTrainingPlan';
import { useStrava } from '@/hooks/useStrava';
import { useCurrentUser } from '@/contexts/UserContext';
import { callOpenAI, prepareCoachData } from '@/lib/ai-coach';
import { cn } from '@/lib/utils';

const CHAT_CACHE_KEY = 'fittracker-ai-chat';
const CHAT_MAX_MESSAGES = 50;

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

function loadChatHistory(): ChatMessage[] {
  try {
    const raw = localStorage.getItem(CHAT_CACHE_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

function saveChatHistory(messages: ChatMessage[]) {
  const trimmed = messages.slice(-CHAT_MAX_MESSAGES);
  localStorage.setItem(CHAT_CACHE_KEY, JSON.stringify(trimmed));
}

const LoadingCard = ({ text }: { text: string }) => (
  <Card>
    <CardContent className="py-12">
      <div className="flex flex-col items-center gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">{text}</p>
      </div>
    </CardContent>
  </Card>
);

const AIChat = () => {
  const { uid, canUseStrava } = useCurrentUser();
  const { workouts, measurements, isLoaded: workoutsLoaded } = useFirebaseWorkouts(uid);
  const { plan, isLoaded: planLoaded } = useTrainingPlan(uid);
  const { activities: stravaActivities } = useStrava(uid, canUseStrava);

  const [messages, setMessages] = useState<ChatMessage[]>(loadChatHistory);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const isReady = workoutsLoaded && planLoaded;

  const systemPrompt = useMemo(() => {
    if (!isReady) return '';
    const data = prepareCoachData(workouts, measurements, plan);
    return `Jesteś osobistym trenerem siłowym i doradcą fitness. Masz dostęp do PEŁNYCH danych treningowych użytkownika.
Odpowiadaj po polsku, krótko i konkretnie. Bądź bezpośredni. Nie lej wody.

DANE UŻYTKOWNIKA:
- Ukończone treningi łącznie: ${data.stats.completedTotal}
- Seria (streak): ${data.stats.streak} treningów z rzędu
- Średnio ${data.stats.avgWorkoutsPerWeek} treningów/tydzień
${data.bodyWeight.length > 0 ? `- Ostatnia waga: ${data.bodyWeight[data.bodyWeight.length - 1].weight} kg (${data.bodyWeight[data.bodyWeight.length - 1].date})` : ''}

PLAN TRENINGOWY (3 dni/tydzień):
${data.trainingPlan.map(day =>
  `${day.dayName}: ${day.exercises.map(ex => `${ex.name} (${ex.sets})`).join(', ')}`
).join('\n')}

OSTATNIE TRENINGI (max 8 tygodni):
${data.recentWorkouts.length > 0 ? data.recentWorkouts.slice(-6).map(w => {
  const notePart = w.notes ? ` [Notatka: ${w.notes}]` : '';
  return `${w.date} (${w.dayId}): ${w.exercises.map(ex =>
    `${ex.name}: ${ex.sets.map(s => `${s.reps}×${s.weight}kg`).join(', ')}`
  ).join(' | ')}${notePart}`;
}).join('\n') : 'Brak danych'}

ZASADY:
- Gdy pytanie dotyczy danych użytkownika — korzystaj z powyższych danych, podawaj konkretne liczby
- Gdy pytanie ogólne (dieta, technika, regeneracja) — odpowiadaj z wiedzą ekspercką
- Nie wymyślaj danych których nie masz
- Formatuj czytelnie — używaj punktów i emoji gdzie pasują`;
  }, [isReady, workouts, measurements, plan]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (messages.length > 0) {
      saveChatHistory(messages);
    }
  }, [messages]);

  const buildWeekSummaryPrompt = () => {
    const now = new Date();
    const dayOfWeek = now.getDay();
    const daysSinceMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    const monday = new Date(now);
    monday.setDate(now.getDate() - daysSinceMonday);
    monday.setHours(0, 0, 0, 0);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    const fmt = (d: Date) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
    const mondayStr = fmt(monday);
    const sundayStr = fmt(sunday);

    const weekWorkouts = workouts.filter(w => w.completed && w.date >= mondayStr && w.date <= sundayStr);
    const weekStrava = stravaActivities.filter(a => a.date >= mondayStr && a.date <= sundayStr);

    let prompt = `Podsumuj mój tydzień treningowy (${mondayStr} – ${sundayStr}).\n\n`;

    if (weekWorkouts.length > 0) {
      prompt += `TRENINGI SIŁOWE (${weekWorkouts.length}):\n`;
      weekWorkouts.forEach(w => {
        prompt += `- ${w.date}: ${w.exercises.map(ex =>
          `${ex.exerciseId}: ${ex.sets.filter(s => s.completed).map(s => `${s.reps}×${s.weight}kg`).join(', ')}`
        ).join(' | ')}\n`;
      });
    } else {
      prompt += 'TRENINGI SIŁOWE: brak w tym tygodniu\n';
    }

    if (weekStrava.length > 0) {
      prompt += `\nAKTYWNOŚCI STRAVA (${weekStrava.length}):\n`;
      weekStrava.forEach(a => {
        const dist = a.distance ? `${(a.distance/1000).toFixed(1)}km` : '';
        const time = a.movingTime ? `${Math.floor(a.movingTime/60)}min` : '';
        prompt += `- ${a.date}: ${a.type} "${a.name}" ${dist} ${time}\n`;
      });
    }

    prompt += '\nDaj podsumowanie: headline, wyróżnienia, porady na następny tydzień, motywację.';
    return prompt;
  };

  const handleSend = async (text?: string) => {
    const messageText = (text || input).trim();
    if (!messageText || isLoading || !isReady) return;

    const userMessage: ChatMessage = { role: 'user', content: messageText, timestamp: Date.now() };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput('');
    setIsLoading(true);

    try {
      const apiMessages: { role: 'system' | 'user' | 'assistant'; content: string }[] = [
        { role: 'system', content: systemPrompt },
        ...newMessages.slice(-20).map(m => ({ role: m.role as 'user' | 'assistant', content: m.content })),
      ];
      const response = await callOpenAI(apiMessages);
      const assistantMessage: ChatMessage = { role: 'assistant', content: response, timestamp: Date.now() };
      setMessages(prev => [...prev, assistantMessage]);
    } catch (err) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: `❌ ${err instanceof Error ? err.message : 'Nieznany błąd'}`,
        timestamp: Date.now(),
      }]);
    } finally {
      setIsLoading(false);
      inputRef.current?.focus();
    }
  };

  const handleClearHistory = () => {
    setMessages([]);
    localStorage.removeItem(CHAT_CACHE_KEY);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (!isReady) {
    return <LoadingCard text="Ładuję dane treningowe..." />;
  }

  return (
    <div className="flex flex-col h-[calc(100vh-10rem)]">
      {/* Header */}
      {messages.length > 0 && (
        <div className="flex items-center justify-between pb-3">
          <p className="text-xs text-muted-foreground">{messages.length} wiadomości</p>
          <Button variant="ghost" size="sm" className="text-xs text-muted-foreground gap-1" onClick={handleClearHistory}>
            <Trash2 className="h-3 w-3" />Wyczyść
          </Button>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-3 pb-4">
        {messages.length === 0 && (
          <Card>
            <CardContent className="py-12">
              <div className="flex flex-col items-center gap-3 text-center">
                <MessageCircle className="h-10 w-10 text-muted-foreground/50" />
                <p className="font-medium text-sm">AI Chat Treningowy</p>
                <p className="text-sm text-muted-foreground">
                  Znam Twój plan, historię treningów i pomiary. Zapytaj o cokolwiek.
                </p>
                <div className="flex flex-wrap gap-2 mt-2 justify-center">
                  {['Jak idą moje postępy?', 'Co poprawić w technice?', 'Ile białka jeść?'].map(q => (
                    <Button key={q} variant="outline" size="sm" className="text-xs" onClick={() => { setInput(q); inputRef.current?.focus(); }}>
                      {q}
                    </Button>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {messages.map((msg, i) => (
          <div key={i} className={cn('flex', msg.role === 'user' ? 'justify-end' : 'justify-start')}>
            <div className={cn(
              'max-w-[85%] rounded-2xl px-4 py-2.5 text-sm whitespace-pre-wrap',
              msg.role === 'user' ? 'bg-primary text-primary-foreground rounded-br-md' : 'bg-muted rounded-bl-md'
            )}>
              {msg.content}
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-muted rounded-2xl rounded-bl-md px-4 py-2.5">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Quick Actions + Input */}
      <div className="border-t pt-3 space-y-2">
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="text-xs gap-1"
            onClick={() => handleSend(buildWeekSummaryPrompt())}
            disabled={isLoading}
          >
            <CalendarDays className="h-3.5 w-3.5" />Podsumuj tydzień
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="text-xs gap-1"
            onClick={() => handleSend('Przeanalizuj mój plan treningowy. Oceń go i zasugeruj max 3-5 konkretnych zmian z uzasadnieniem.')}
            disabled={isLoading}
          >
            <Dumbbell className="h-3.5 w-3.5" />Analizuj plan
          </Button>
        </div>
        <div className="flex gap-2">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Napisz wiadomość..."
            disabled={isLoading}
            className="flex-1 rounded-xl border border-input bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
          <Button size="icon" onClick={() => handleSend()} disabled={!input.trim() || isLoading} className="rounded-xl h-10 w-10 shrink-0">
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default AIChat;
