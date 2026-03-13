import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, onSnapshot, query, where, doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { ArrowLeft, Users, Dumbbell, ChevronDown, ChevronUp, DollarSign } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

const AVAILABLE_FEATURES = [
  { key: 'strava', label: 'Strava', description: 'Integracja ze Stravą' },
] as const;

type FeatureKey = typeof AVAILABLE_FEATURES[number]['key'];

interface AdminUser {
  uid: string;
  email: string;
  displayName: string;
  role: string;
  stravaConnected: boolean;
  features: Record<string, boolean>;
  onboardingCompleted: boolean;
  lastLogin?: string;
}

interface AIUsageDoc {
  userId: string;
  month: string;
  promptTokens: number;
  completionTokens: number;
  estimatedCostUsd: number;
  callCount: number;
}

const AdminDashboard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [expandedUid, setExpandedUid] = useState<string | null>(null);
  const [aiUsage, setAiUsage] = useState<AIUsageDoc[]>([]);

  // Current month key for AI usage query
  const currentMonth = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;

  // Subscribe to AI usage for current month
  useEffect(() => {
    const q = query(
      collection(db, 'ai_usage'),
      where('month', '==', currentMonth),
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data: AIUsageDoc[] = [];
      snapshot.forEach((d) => {
        const u = d.data();
        data.push({
          userId: u.userId,
          month: u.month,
          promptTokens: u.promptTokens || 0,
          completionTokens: u.completionTokens || 0,
          estimatedCostUsd: u.estimatedCostUsd || 0,
          callCount: u.callCount || 0,
        });
      });
      setAiUsage(data);
    });
    return () => unsubscribe();
  }, [currentMonth]);

  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, 'users'),
      (snapshot) => {
        const data: AdminUser[] = [];
        snapshot.forEach((d) => {
          const u = d.data();
          data.push({
            uid: d.id,
            email: u.email || '',
            displayName: u.displayName || '',
            role: u.role || 'user',
            stravaConnected: u.stravaConnected || false,
            features: u.features || {},
            onboardingCompleted: u.onboardingCompleted || false,
            lastLogin: u.lastLogin,
          });
        });
        data.sort((a, b) => (a.role === 'admin' ? -1 : 1) - (b.role === 'admin' ? -1 : 1));
        setUsers(data);
      },
    );
    return () => unsubscribe();
  }, []);

  const toggleFeature = async (uid: string, feature: FeatureKey, enabled: boolean) => {
    try {
      await updateDoc(doc(db, 'users', uid), { [`features.${feature}`]: enabled });
      setUsers(prev => prev.map(u =>
        u.uid === uid ? { ...u, features: { ...u.features, [feature]: enabled } } : u
      ));
      const userName = users.find(u => u.uid === uid)?.displayName || uid;
      toast({ title: enabled ? 'Włączono' : 'Wyłączono', description: `${feature} — ${userName}` });
    } catch {
      toast({ title: 'Błąd', description: 'Nie udało się zapisać.', variant: 'destructive' });
    }
  };

  const getInitials = (name: string) =>
    name ? name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) : '?';

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Panel admina</h1>
          <p className="text-muted-foreground text-sm">Zarządzaj użytkownikami i funkcjami</p>
        </div>
      </div>

      {/* AI Cost Summary */}
      {(() => {
        const totalCost = aiUsage.reduce((sum, u) => sum + u.estimatedCostUsd, 0);
        const totalCalls = aiUsage.reduce((sum, u) => sum + u.callCount, 0);
        const costColor = totalCost < 2 ? 'text-green-600' : totalCost < 4 ? 'text-yellow-600' : 'text-red-600';
        return totalCalls > 0 ? (
          <Card>
            <CardContent className="py-4">
              <div className="flex items-center gap-3">
                <DollarSign className={cn('h-5 w-5', costColor)} />
                <div>
                  <p className={cn('font-semibold text-sm', costColor)}>
                    AI koszty ({currentMonth}): ${totalCost.toFixed(2)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {totalCalls} wywołań, {aiUsage.length} użytkowników
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : null;
      })()}

      <Card className="overflow-hidden">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Users className="h-5 w-5" />
            Użytkownicy ({users.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {users.map((user) => {
            const isExpanded = expandedUid === user.uid;
            return (
              <div key={user.uid} className="border-t first:border-t-0">
                {/* User row — clickable */}
                <button
                  onClick={() => setExpandedUid(isExpanded ? null : user.uid)}
                  className="w-full flex items-center gap-3 p-4 text-left hover:bg-muted/30 transition-colors"
                >
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm shrink-0">
                    {getInitials(user.displayName)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-sm truncate">{user.displayName || 'Bez nazwy'}</p>
                      <Badge
                        variant={user.role === 'admin' ? 'default' : 'secondary'}
                        className="text-[10px] h-5 shrink-0"
                      >
                        {user.role}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                  </div>
                  {isExpanded
                    ? <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0" />
                    : <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
                  }
                </button>

                {/* Expanded panel */}
                {isExpanded && (
                  <div className="px-4 pb-4 space-y-4">
                    {/* Feature flags */}
                    <div className="rounded-lg bg-muted/20 p-3 space-y-3">
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Funkcje</p>
                      {AVAILABLE_FEATURES.map(feat => (
                        <div key={feat.key} className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium">{feat.label}</p>
                            <p className="text-xs text-muted-foreground">{feat.description}</p>
                          </div>
                          <Switch
                            checked={user.features[feat.key] ?? user.role === 'admin'}
                            onCheckedChange={(checked) => toggleFeature(user.uid, feat.key, checked)}
                          />
                        </div>
                      ))}
                    </div>

                    {/* AI Usage */}
                    {(() => {
                      const usage = aiUsage.find(u => u.userId === user.uid);
                      if (!usage || usage.callCount === 0) return null;
                      const totalTokens = usage.promptTokens + usage.completionTokens;
                      const tokenStr = totalTokens >= 1000 ? `${(totalTokens / 1000).toFixed(1)}K` : `${totalTokens}`;
                      const costColor = usage.estimatedCostUsd < 2 ? 'text-green-600' : usage.estimatedCostUsd < 4 ? 'text-yellow-600' : 'text-red-600';
                      return (
                        <div className="rounded-lg bg-muted/20 p-3">
                          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">AI Usage ({currentMonth})</p>
                          <p className={cn('text-sm font-semibold', costColor)}>
                            ${usage.estimatedCostUsd.toFixed(2)} / $5.00
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {usage.callCount} wywołań, {tokenStr} tokenów
                          </p>
                        </div>
                      );
                    })()}

                    {/* Actions */}
                    <div className="flex flex-wrap gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => navigate(`/admin/plans/${user.uid}`)}
                      >
                        <Dumbbell className="h-4 w-4 mr-1.5" />
                        Edytuj plan
                      </Button>
                    </div>

                    {/* Info */}
                    <div className="text-xs text-muted-foreground space-y-0.5">
                      {user.lastLogin && (
                        <p>Ostatnie logowanie: {new Date(user.lastLogin).toLocaleString('pl-PL')}</p>
                      )}
                      <p>Onboarding: {user.onboardingCompleted ? 'ukończony' : 'nie ukończony'}</p>
                      <p>Strava: {user.stravaConnected ? 'połączona' : 'niepołączona'}</p>
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          {users.length === 0 && (
            <p className="text-center text-muted-foreground py-8">
              Brak zarejestrowanych użytkowników
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminDashboard;
