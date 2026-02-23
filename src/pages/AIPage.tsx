import { useSearchParams } from 'react-router-dom';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sparkles, RefreshCw, AlertCircle, Loader2 } from 'lucide-react';
import { useAICoach } from '@/hooks/useAICoach';
import type { CoachInsight } from '@/lib/ai-coach';
import { cn } from '@/lib/utils';

// --- Insight card config ---

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
              <h3 className={cn('font-semibold text-sm', config.color)}>
                {insight.title}
              </h3>
              {insight.exerciseId && (
                <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                  {insight.exerciseId}
                </Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
              {insight.message}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

// --- Time ago helper ---

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

// --- Coach Tab ---

const CoachTab = () => {
  const { insights, isLoading, error, analyze, lastAnalyzedAt, isReady, hasCache } = useAICoach();

  const hasInsights = insights.length > 0;
  const showInitial = !hasInsights && !isLoading && !error;

  return (
    <div className="space-y-4">
      {/* Header */}
      <Card>
        <CardContent className="pt-4 pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              <div>
                <h2 className="font-semibold text-sm">AI Coach</h2>
                {lastAnalyzedAt && (
                  <p className="text-[11px] text-muted-foreground">
                    Ostatnia analiza: {timeAgo(lastAnalyzedAt)}
                    {hasCache && ' (cache)'}
                  </p>
                )}
              </div>
            </div>
            <Button
              size="sm"
              variant={showInitial ? 'default' : 'outline'}
              onClick={() => analyze(true)}
              disabled={isLoading || !isReady}
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin mr-1" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-1" />
              )}
              {showInitial ? 'Rozpocznij analizę' : 'Analizuj ponownie'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Loading state */}
      {isLoading && (
        <Card>
          <CardContent className="py-12">
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Analizuję Twoje treningi...</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Error state */}
      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-red-500 mt-0.5" />
              <div>
                <p className="font-medium text-sm text-red-700">Błąd analizy</p>
                <p className="text-sm text-red-600 mt-1">{error}</p>
                <Button
                  size="sm"
                  variant="outline"
                  className="mt-3"
                  onClick={() => analyze(true)}
                >
                  Spróbuj ponownie
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Initial state */}
      {showInitial && !isLoading && (
        <Card>
          <CardContent className="py-12">
            <div className="flex flex-col items-center gap-3 text-center">
              <Sparkles className="h-10 w-10 text-muted-foreground/50" />
              <div>
                <p className="font-medium text-sm">Gotowy do analizy</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Kliknij "Rozpocznij analizę" — AI przeanalizuje Twoje treningi
                  z ostatnich 8 tygodni i da konkretne sugestie.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Insights list */}
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

// --- Main AI Page ---

type AITab = 'coach';
const VALID_TABS: AITab[] = ['coach'];

const AIPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get('tab') as AITab | null;
  const defaultTab: AITab = tabParam && VALID_TABS.includes(tabParam) ? tabParam : 'coach';

  return (
    <div className="space-y-4">
      <Tabs
        defaultValue={defaultTab}
        onValueChange={(value) => setSearchParams({ tab: value })}
      >
        <TabsList className="w-full">
          <TabsTrigger value="coach" className="flex-1 text-xs">
            <Sparkles className="h-3.5 w-3.5 mr-1" />
            AI Coach
          </TabsTrigger>
        </TabsList>

        <TabsContent value="coach">
          <CoachTab />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AIPage;
