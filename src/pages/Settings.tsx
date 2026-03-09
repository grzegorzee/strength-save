import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Link2, Unlink, RefreshCw, Loader2, Clock } from 'lucide-react';
import { useCurrentUser } from '@/contexts/UserContext';
import { useStrava } from '@/hooks/useStrava';
import { useToast } from '@/hooks/use-toast';

const SUMMARY_HOUR_KEY = 'summary-hour';

const Settings = () => {
  const navigate = useNavigate();
  const { uid, profile, isAdmin } = useCurrentUser();
  const { connection, isSyncing, error, connectStrava, syncActivities, disconnectStrava } = useStrava(uid, isAdmin);
  const { toast } = useToast();

  const [summaryHour, setSummaryHour] = useState(() => {
    try {
      return localStorage.getItem(SUMMARY_HOUR_KEY) || '20';
    } catch {
      return '20';
    }
  });

  const handleSummaryHourChange = (value: string) => {
    setSummaryHour(value);
    try {
      localStorage.setItem(SUMMARY_HOUR_KEY, value);
    } catch {
      // ignore
    }
  };

  const handleSync = async () => {
    const result = await syncActivities();
    if (!result.ok) {
      toast({ title: 'Błąd synchronizacji', description: result.message, variant: 'destructive' });
      return;
    }
    if (result.synced > 0) {
      toast({ title: 'Zsynchronizowano!', description: `${result.synced} nowych aktywności (${result.totalFetched} znalezionych w Strava).` });
    } else if (result.totalFetched > 0) {
      toast({ title: 'Brak nowych aktywności', description: `${result.totalFetched} aktywności ze Strava, wszystkie już zsynchronizowane.` });
    } else {
      toast({ title: 'Brak aktywności', description: `Strava nie zwróciła aktywności (lookback: ${result.lookbackDays} dni).` });
    }
  };

  const handleDisconnect = async () => {
    await disconnectStrava();
    toast({ title: 'Rozłączono', description: 'Konto Strava zostało odłączone.' });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Ustawienia</h1>
          <p className="text-muted-foreground text-sm">{profile?.email}</p>
        </div>
      </div>

      {/* Account info */}
      <Card>
        <CardHeader>
          <CardTitle>Konto</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm">Nazwa</span>
            <span className="font-medium">{profile?.displayName}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm">Email</span>
            <span className="font-medium">{profile?.email}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm">Rola</span>
            <Badge variant={profile?.role === 'admin' ? 'default' : 'secondary'}>
              {profile?.role || 'user'}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Weekly summary preference */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-primary" />
            Podsumowanie tygodniowe
          </CardTitle>
          <CardDescription>
            Preferowana godzina generowania podsumowania tygodnia (niedziele)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <span className="text-sm">Godzina</span>
            <Select value={summaryHour} onValueChange={handleSummaryHourChange}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Array.from({ length: 8 }, (_, i) => i + 16).map(h => (
                  <SelectItem key={h} value={String(h)}>
                    {String(h).padStart(2, '0')}:00
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Strava integration — admin only */}
      {isAdmin && <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="#FC4C02">
              <path d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066m-7.008-5.599l2.836 5.598h4.172L10.463 0l-7 13.828h4.169" />
            </svg>
            Strava
          </CardTitle>
          <CardDescription>
            Połącz konto Strava, aby importować aktywności (bieganie, rower, etc.)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {connection.connected ? (
            <>
              <div className="flex items-center justify-between">
                <div>
                  <Badge className="bg-green-500/10 text-green-600 border-green-500/30">
                    Połączono
                  </Badge>
                  {connection.athleteName && (
                    <p className="text-sm text-muted-foreground mt-1">{connection.athleteName}</p>
                  )}
                  {connection.lastSync && (
                    <p className="text-xs text-muted-foreground">
                      Ostatni sync: {new Date(connection.lastSync).toLocaleString('pl-PL')}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={handleSync} disabled={isSyncing}>
                  {isSyncing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
                  Synchronizuj
                </Button>
                <Button variant="outline" className="text-destructive" onClick={handleDisconnect}>
                  <Unlink className="h-4 w-4 mr-2" />
                  Rozłącz
                </Button>
              </div>
            </>
          ) : (
            <Button onClick={connectStrava} className="bg-[#FC4C02] hover:bg-[#FC4C02]/90">
              <Link2 className="h-4 w-4 mr-2" />
              Połącz ze Stravą
            </Button>
          )}

          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}
        </CardContent>
      </Card>}
    </div>
  );
};

export default Settings;
