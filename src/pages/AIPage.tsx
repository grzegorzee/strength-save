import { useState, useRef, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Tabs, TabsContent } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Sparkles, RefreshCw, AlertCircle, Loader2, Brain, ArrowRightLeft, FileText, Dumbbell, ChevronRight, Send, MessageCircle, Trash2 } from 'lucide-react';
import { useAICoach } from '@/hooks/useAICoach';
import { useAISwap } from '@/hooks/useAISwap';
import { useAISummary } from '@/hooks/useAISummary';
import { useAIPlan } from '@/hooks/useAIPlan';
import { useTrainingPlan } from '@/hooks/useTrainingPlan';
import { useFirebaseWorkouts } from '@/hooks/useFirebaseWorkouts';
import { useCurrentUser } from '@/contexts/UserContext';
import type { CoachInsight } from '@/lib/ai-coach';
import { callOpenAI, prepareCoachData } from '@/lib/ai-coach';
import { cn } from '@/lib/utils';

// --- Shared components ---

function timeAgo(timestamp: number): string {
  const diff = Date.now() - timestamp;
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'przed chwilą';
  if (minutes < 60) return `${minutes} min temu`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h temu`;
  const days = Math.floor(hours / 24);
  return `${days}d temu`;
}

const ErrorCard = ({ error, onRetry }: { error: string; onRetry: () => void }) => (
  <Card className="border-red-200 bg-red-50">
    <CardContent className="pt-4 pb-4">
      <div className="flex items-start gap-3">
        <AlertCircle className="h-5 w-5 text-red-500 mt-0.5" />
        <div>
          <p className="font-medium text-sm text-red-700">Błąd analizy</p>
          <p className="text-sm text-red-600 mt-1">{error}</p>
          <Button size="sm" variant="outline" className="mt-3" onClick={onRetry}>
            Spróbuj ponownie
          </Button>
        </div>
      </div>
    </CardContent>
  </Card>
);

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

// --- Insight Card (Coach) ---

const insightConfig: Record<CoachInsight['type'], { emoji: string; color: string; bgColor: string }> = {
  plateau: { emoji: '🔴', color: 'text-red-600', bgColor: 'bg-red-50 border-red-200' },
  warning: { emoji: '🔴', color: 'text-red-600', bgColor: 'bg-red-50 border-red-200' },
  progress: { emoji: '🟢', color: 'text-green-600', bgColor: 'bg-green-50 border-green-200' },
  suggestion: { emoji: '🟡', color: 'text-amber-600', bgColor: 'bg-amber-50 border-amber-200' },
  consistency: { emoji: '🟡', color: 'text-amber-600', bgColor: 'bg-amber-50 border-amber-200' },
};

const InsightCard = ({ insight }: { insight: CoachInsight }) => {
  const config = insightConfig[insight.type];
  return (
    <Card className={cn('border', config.bgColor)}>
      <CardContent className="pt-4 pb-4">
        <div className="flex items-start gap-3">
          <span className="text-xl mt-0.5">{config.emoji}</span>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className={cn('font-semibold text-sm', config.color)}>{insight.title}</h3>
              {insight.exerciseId && (
                <Badge variant="outline" className="text-[10px] px-1.5 py-0">{insight.exerciseId}</Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground mt-1 leading-relaxed">{insight.message}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

// ============================
// TAB: AI Coach
// ============================

const CoachTab = () => {
  const { uid } = useCurrentUser();
  const { insights, isLoading, error, analyze, lastAnalyzedAt, isReady, hasCache } = useAICoach(uid);
  const hasInsights = insights.length > 0;
  const showInitial = !hasInsights && !isLoading && !error;

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="pt-4 pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Brain className="h-5 w-5 text-primary" />
              <div>
                <h2 className="font-semibold text-sm">AI Coach</h2>
                {lastAnalyzedAt && (
                  <p className="text-[11px] text-muted-foreground">
                    Ostatnia analiza: {timeAgo(lastAnalyzedAt)}{hasCache && ' (cache)'}
                  </p>
                )}
              </div>
            </div>
            <Button size="sm" variant={showInitial ? 'default' : 'outline'} onClick={() => analyze(true)} disabled={isLoading || !isReady}>
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <RefreshCw className="h-4 w-4 mr-1" />}
              {showInitial ? 'Rozpocznij analizę' : 'Analizuj ponownie'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {isLoading && <LoadingCard text="Analizuję Twoje treningi..." />}
      {error && <ErrorCard error={error} onRetry={() => analyze(true)} />}

      {showInitial && !isLoading && (
        <Card>
          <CardContent className="py-12">
            <div className="flex flex-col items-center gap-3 text-center">
              <Brain className="h-10 w-10 text-muted-foreground/50" />
              <p className="font-medium text-sm">Gotowy do analizy</p>
              <p className="text-sm text-muted-foreground mt-1">
                AI przeanalizuje Twoje treningi z ostatnich 8 tygodni i da konkretne sugestie.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {hasInsights && !isLoading && (
        <div className="space-y-3">
          {insights.map((insight, i) => (
            <InsightCard key={`${insight.type}-${i}`} insight={insight} />
          ))}
        </div>
      )}
    </div>
  );
};

// ============================
// TAB: AI Zamiennik
// ============================

const SwapTab = () => {
  const { uid } = useCurrentUser();
  const { plan } = useTrainingPlan(uid);
  const { result, isLoading, error, findSwap, reset } = useAISwap(uid);
  const [selectedExercise, setSelectedExercise] = useState('');
  const [reason, setReason] = useState('');

  const allExercises = plan.flatMap(day =>
    day.exercises.map(ex => ({ id: ex.id, name: ex.name, day: day.dayName }))
  );

  const handleSubmit = () => {
    if (!selectedExercise) return;
    const exercise = allExercises.find(e => e.id === selectedExercise);
    if (exercise) findSwap(exercise.name, reason);
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="pt-4 pb-4">
          <div className="flex items-center gap-2 mb-4">
            <ArrowRightLeft className="h-5 w-5 text-primary" />
            <h2 className="font-semibold text-sm">AI Zamiennik</h2>
          </div>

          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                Którego ćwiczenia nie możesz zrobić?
              </label>
              <Select value={selectedExercise} onValueChange={(v) => { setSelectedExercise(v); reset(); }}>
                <SelectTrigger>
                  <SelectValue placeholder="Wybierz ćwiczenie..." />
                </SelectTrigger>
                <SelectContent>
                  {allExercises.map(ex => (
                    <SelectItem key={ex.id} value={ex.id}>
                      {ex.name} <span className="text-muted-foreground">({ex.day})</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                Powód (opcjonalnie)
              </label>
              <input
                type="text"
                value={reason}
                onChange={e => setReason(e.target.value)}
                placeholder="np. brak sprzętu, kontuzja barku..."
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
            </div>

            <Button onClick={handleSubmit} disabled={!selectedExercise || isLoading} className="w-full">
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <ArrowRightLeft className="h-4 w-4 mr-1" />}
              Znajdź zamiennik
            </Button>
          </div>
        </CardContent>
      </Card>

      {isLoading && <LoadingCard text="Szukam zamienników..." />}
      {error && <ErrorCard error={error} onRetry={handleSubmit} />}

      {result && !isLoading && (
        <div className="space-y-3">
          {result.alternatives.map((alt, i) => (
            <Card key={i} className="border-blue-100 bg-blue-50/50">
              <CardContent className="pt-4 pb-4">
                <div className="flex items-start gap-3">
                  <div className="flex items-center justify-center h-7 w-7 rounded-full bg-primary text-primary-foreground text-sm font-bold shrink-0">
                    {i + 1}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold text-sm">{alt.name}</h3>
                      <Badge variant="outline" className="text-[10px]">{alt.setsScheme}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">{alt.reason}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {!result && !isLoading && !error && (
        <Card>
          <CardContent className="py-12">
            <div className="flex flex-col items-center gap-3 text-center">
              <ArrowRightLeft className="h-10 w-10 text-muted-foreground/50" />
              <p className="font-medium text-sm">Znajdź zamiennik ćwiczenia</p>
              <p className="text-sm text-muted-foreground">
                Wybierz ćwiczenie, którego nie możesz wykonać — AI zaproponuje 3 alternatywy.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

// ============================
// TAB: AI Podsumowanie
// ============================

const SummaryTab = () => {
  const { uid } = useCurrentUser();
  const { summary, isLoading, error, analyze, lastWorkout, completedWorkouts } = useAISummary(uid);
  const [selectedWorkout, setSelectedWorkout] = useState('');

  const handleAnalyze = () => {
    analyze(selectedWorkout || undefined);
  };

  const formatDate = (date: string) =>
    new Date(date).toLocaleDateString('pl-PL', { weekday: 'short', day: 'numeric', month: 'short' });

  const recentWorkouts = completedWorkouts.slice(0, 10);

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="pt-4 pb-4">
          <div className="flex items-center gap-2 mb-4">
            <FileText className="h-5 w-5 text-primary" />
            <h2 className="font-semibold text-sm">AI Podsumowanie</h2>
          </div>

          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                Który trening podsumować?
              </label>
              <Select value={selectedWorkout} onValueChange={setSelectedWorkout}>
                <SelectTrigger>
                  <SelectValue placeholder={lastWorkout ? `Ostatni: ${formatDate(lastWorkout.date)}` : 'Brak treningów'} />
                </SelectTrigger>
                <SelectContent>
                  {recentWorkouts.map(w => (
                    <SelectItem key={w.id} value={w.id}>
                      {formatDate(w.date)} — {w.dayId.replace('day-', 'Dzień ')}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button onClick={handleAnalyze} disabled={!lastWorkout || isLoading} className="w-full">
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <FileText className="h-4 w-4 mr-1" />}
              Podsumuj trening
            </Button>
          </div>
        </CardContent>
      </Card>

      {isLoading && <LoadingCard text="Generuję podsumowanie..." />}
      {error && <ErrorCard error={error} onRetry={handleAnalyze} />}

      {summary && !isLoading && (
        <div className="space-y-3">
          {/* Headline */}
          <Card className="border-primary/20 bg-primary/5">
            <CardContent className="pt-4 pb-4">
              <p className="font-semibold text-sm text-primary">{summary.headline}</p>
            </CardContent>
          </Card>

          {/* Highlights */}
          <Card>
            <CardContent className="pt-4 pb-4">
              <h3 className="font-semibold text-xs text-muted-foreground mb-2">WYRÓŻNIENIA</h3>
              <div className="space-y-2">
                {summary.highlights.map((h, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <ChevronRight className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                    <p className="text-sm">{h}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Comparison */}
          <Card>
            <CardContent className="pt-4 pb-4">
              <h3 className="font-semibold text-xs text-muted-foreground mb-2">PORÓWNANIE</h3>
              <p className="text-sm">{summary.comparison}</p>
            </CardContent>
          </Card>

          {/* Motivation */}
          <Card className="border-green-200 bg-green-50">
            <CardContent className="pt-4 pb-4">
              <p className="text-sm font-medium text-green-700">💪 {summary.motivation}</p>
            </CardContent>
          </Card>
        </div>
      )}

      {!summary && !isLoading && !error && (
        <Card>
          <CardContent className="py-12">
            <div className="flex flex-col items-center gap-3 text-center">
              <FileText className="h-10 w-10 text-muted-foreground/50" />
              <p className="font-medium text-sm">Podsumuj swój trening</p>
              <p className="text-sm text-muted-foreground">
                AI wygeneruje podsumowanie z wyróżnieniami, porównaniem i motywacją.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

// ============================
// TAB: AI Plan
// ============================

const PlanTab = () => {
  const { uid } = useCurrentUser();
  const { suggestion, isLoading, error, analyze, lastAnalyzedAt, isReady } = useAIPlan(uid);
  const hasSuggestion = !!suggestion;
  const showInitial = !hasSuggestion && !isLoading && !error;

  const actionLabels: Record<string, { label: string; color: string }> = {
    add: { label: 'DODAJ', color: 'bg-green-100 text-green-700' },
    remove: { label: 'USUŃ', color: 'bg-red-100 text-red-700' },
    swap: { label: 'ZAMIEŃ', color: 'bg-blue-100 text-blue-700' },
    modify: { label: 'MODYFIKUJ', color: 'bg-amber-100 text-amber-700' },
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="pt-4 pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Dumbbell className="h-5 w-5 text-primary" />
              <div>
                <h2 className="font-semibold text-sm">AI Plan</h2>
                {lastAnalyzedAt && (
                  <p className="text-[11px] text-muted-foreground">
                    Ostatnia analiza: {timeAgo(lastAnalyzedAt)}
                  </p>
                )}
              </div>
            </div>
            <Button size="sm" variant={showInitial ? 'default' : 'outline'} onClick={() => analyze(true)} disabled={isLoading || !isReady}>
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <RefreshCw className="h-4 w-4 mr-1" />}
              {showInitial ? 'Analizuj plan' : 'Analizuj ponownie'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {isLoading && <LoadingCard text="Analizuję Twój plan treningowy..." />}
      {error && <ErrorCard error={error} onRetry={() => analyze(true)} />}

      {hasSuggestion && !isLoading && (
        <div className="space-y-3">
          {/* Overview */}
          <Card className="border-primary/20 bg-primary/5">
            <CardContent className="pt-4 pb-4">
              <h3 className="font-semibold text-xs text-muted-foreground mb-2">OCENA PLANU</h3>
              <p className="text-sm">{suggestion.overview}</p>
            </CardContent>
          </Card>

          {/* Changes */}
          {suggestion.changes.length > 0 && (
            <div className="space-y-2">
              {suggestion.changes.map((change, i) => {
                const action = actionLabels[change.action] || actionLabels.modify;
                return (
                  <Card key={i}>
                    <CardContent className="pt-4 pb-4">
                      <div className="flex items-start gap-3">
                        <Badge className={cn('text-[10px] shrink-0', action.color)}>
                          {action.label}
                        </Badge>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-semibold text-sm">{change.exercise}</h3>
                            <span className="text-[10px] text-muted-foreground">{change.dayName}</span>
                          </div>
                          <p className="text-sm text-muted-foreground mt-1">{change.detail}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}

          {/* Reasoning */}
          <Card>
            <CardContent className="pt-4 pb-4">
              <h3 className="font-semibold text-xs text-muted-foreground mb-2">UZASADNIENIE</h3>
              <p className="text-sm">{suggestion.reasoning}</p>
            </CardContent>
          </Card>
        </div>
      )}

      {showInitial && !isLoading && (
        <Card>
          <CardContent className="py-12">
            <div className="flex flex-col items-center gap-3 text-center">
              <Dumbbell className="h-10 w-10 text-muted-foreground/50" />
              <p className="font-medium text-sm">Optymalizuj swój plan</p>
              <p className="text-sm text-muted-foreground">
                AI przeanalizuje Twój plan i historię treningów, a potem zasugeruje konkretne zmiany.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

// ============================
// TAB: AI Chat
// ============================

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

const ChatTab = () => {
  const { uid } = useCurrentUser();
  const { workouts, measurements, isLoaded: workoutsLoaded } = useFirebaseWorkouts(uid);
  const { plan, isLoaded: planLoaded } = useTrainingPlan(uid);

  const [messages, setMessages] = useState<ChatMessage[]>(loadChatHistory);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const isReady = workoutsLoaded && planLoaded;

  // Build system prompt with user's training data
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

  // Persist messages
  useEffect(() => {
    if (messages.length > 0) {
      saveChatHistory(messages);
    }
  }, [messages]);

  const handleSend = async () => {
    const text = input.trim();
    if (!text || isLoading || !isReady) return;

    const userMessage: ChatMessage = { role: 'user', content: text, timestamp: Date.now() };
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
            <Trash2 className="h-3 w-3" />
            Wyczyść
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
                    <Button
                      key={q}
                      variant="outline"
                      size="sm"
                      className="text-xs"
                      onClick={() => { setInput(q); inputRef.current?.focus(); }}
                    >
                      {q}
                    </Button>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {messages.map((msg, i) => (
          <div
            key={i}
            className={cn(
              'flex',
              msg.role === 'user' ? 'justify-end' : 'justify-start'
            )}
          >
            <div
              className={cn(
                'max-w-[85%] rounded-2xl px-4 py-2.5 text-sm whitespace-pre-wrap',
                msg.role === 'user'
                  ? 'bg-primary text-primary-foreground rounded-br-md'
                  : 'bg-muted rounded-bl-md'
              )}
            >
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

      {/* Input */}
      <div className="border-t pt-3 flex gap-2">
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
        <Button
          size="icon"
          onClick={handleSend}
          disabled={!input.trim() || isLoading}
          className="rounded-xl h-10 w-10 shrink-0"
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};

// ============================
// MAIN PAGE
// ============================

type AITab = 'coach' | 'swap' | 'summary' | 'plan' | 'chat';
const VALID_TABS: AITab[] = ['coach', 'swap', 'summary', 'plan', 'chat'];

const AIPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get('tab') as AITab | null;
  const currentTab: AITab = tabParam && VALID_TABS.includes(tabParam) ? tabParam : 'coach';

  return (
    <Tabs
      value={currentTab}
      onValueChange={(value) => setSearchParams({ tab: value })}
    >
      <TabsContent value="coach"><CoachTab /></TabsContent>
      <TabsContent value="swap"><SwapTab /></TabsContent>
      <TabsContent value="summary"><SummaryTab /></TabsContent>
      <TabsContent value="plan"><PlanTab /></TabsContent>
      <TabsContent value="chat"><ChatTab /></TabsContent>
    </Tabs>
  );
};

export default AIPage;
