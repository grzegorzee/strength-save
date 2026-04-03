import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Link2, Unlink, RefreshCw, Loader2, Clock, Shield, Users } from 'lucide-react';
import { useCurrentUser } from '@/contexts/UserContext';
import { useStrava } from '@/hooks/useStrava';
import { useToast } from '@/hooks/use-toast';
import { doc, updateDoc, collection, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { SyncCenterCard } from '@/components/SyncCenterCard';
import { DataManagement } from '@/components/DataManagement';
import { useFirebaseWorkouts } from '@/hooks/useFirebaseWorkouts';

const SUMMARY_HOUR_KEY = 'summary-hour';

const AVAILABLE_FEATURES = [
  { key: 'strava', label: 'Strava', description: 'Integracja ze Stravą (aktywności, wykresy, analityka)' },
] as const;

type FeatureKey = typeof AVAILABLE_FEATURES[number]['key'];

interface UserFeatureRow {
  uid: string;
  displayName: string;
  email: string;
  role: string;
  features: Record<string, boolean>;
}

const FeatureFlagsPanel = () => {
  const [users, setUsers] = useState<UserFeatureRow[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const loadUsers = useCallback(async () => {
    setLoading(true);
    try {
      const snap = await getDocs(collection(db, 'users'));
      const rows: UserFeatureRow[] = [];
      snap.forEach((d) => {
        const data = d.data();
        rows.push({
          uid: d.id,
          displayName: data.displayName || data.email || d.id,
          email: data.email || '',
          role: data.role || 'user',
          features: data.features || {},
        });
      });
      rows.sort((a, b) => (a.role === 'admin' ? -1 : 1) - (b.role === 'admin' ? -1 : 1));
      setUsers(rows);
    } catch (err) {
      console.error('Failed to load users:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadUsers(); }, [loadUsers]);

  const toggleFeature = async (uid: string, feature: FeatureKey, enabled: boolean) => {
    try {
      const userRef = doc(db, 'users', uid);
      await updateDoc(userRef, { [`features.${feature}`]: enabled });
      setUsers(prev => prev.map(u =>
        u.uid === uid ? { ...u, features: { ...u.features, [feature]: enabled } } : u
      ));
      toast({ title: enabled ? 'Włączono' : 'Wyłączono', description: `${feature} dla ${users.find(u => u.uid === uid)?.displayName}` });
    } catch (err) {
      toast({ title: 'Błąd', description: 'Nie udało się zapisać.', variant: 'destructive' });
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8 flex justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-primary" />
          Zarządzanie funkcjami
        </CardTitle>
        <CardDescription>
          Włączaj/wyłączaj funkcje dla poszczególnych użytkowników
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 px-3 sm:px-6">
        {users.map(user => (
          <div key={user.uid} className="flex items-center justify-between gap-3 p-3 rounded-lg bg-muted/30">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium truncate">{user.displayName}</p>
                {user.role === 'admin' && (
                  <Badge variant="default" className="text-[10px] h-5 shrink-0">admin</Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground truncate">{user.email}</p>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              {AVAILABLE_FEATURES.map(feat => (
                <div key={feat.key} className="flex items-center gap-1.5">
                  <span className="text-xs text-muted-foreground hidden sm:inline">{feat.label}</span>
                  <Switch
                    checked={user.features[feat.key] ?? user.role === 'admin'}
                    onCheckedChange={(checked) => toggleFeature(user.uid, feat.key, checked)}
                  />
                </div>
              ))}
            </div>
          </div>
        ))}
        {users.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-4">Brak użytkowników</p>
        )}
      </CardContent>
    </Card>
  );
};

const Settings = () => {
  const navigate = useNavigate();
  const { uid, profile, isAdmin, canUseStrava } = useCurrentUser();
  const { exportData, importData, cleanupEmptyWorkouts } = useFirebaseWorkouts(uid);
  const { connection, isSyncing, error, connectStrava, syncActivities, disconnectStrava } = useStrava(uid, canUseStrava);
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

  const [maxHRInput, setMaxHRInput] = useState('');
  const [maxHRSaving, setMaxHRSaving] = useState(false);

  const handleSaveMaxHR = async () => {
    const value = parseInt(maxHRInput);
    if (isNaN(value) || value < 100 || value > 230) {
      toast({ title: 'Nieprawidłowa wartość', description: 'Max HR musi być między 100 a 230 bpm.', variant: 'destructive' });
      return;
    }
    setMaxHRSaving(true);
    try {
      await updateDoc(doc(db, 'users', uid), { estimatedMaxHR: value, maxHRManualOverride: true });
      toast({ title: 'Zapisano', description: `Max HR ustawione na ${value} bpm.` });
    } catch {
      toast({ title: 'Błąd', description: 'Nie udało się zapisać.', variant: 'destructive' });
    } finally {
      setMaxHRSaving(false);
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

      <DataManagement
        onExport={exportData}
        onImport={importData}
        onCleanup={cleanupEmptyWorkouts}
        title="Backup i przywracanie"
        description="Pobierz kopię swoich treningów i pomiarów albo odtwórz dane z pliku JSON."
        exportLabel="Eksportuj kopię"
        importLabel="Importuj kopię"
        cleanupLabel="Wyczyść duplikaty treningów"
      />

      {/* Strava integration — feature flag */}
      {canUseStrava && <Card>
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

              {/* Max HR setting */}
              <div className="border-t pt-4">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <p className="text-sm font-medium">Max HR</p>
                    <p className="text-xs text-muted-foreground">
                      {connection.estimatedMaxHR
                        ? `${connection.estimatedMaxHR} bpm ${connection.maxHRManualOverride ? '(Ręcznie ustawione)' : '(Automatycznie z danych)'}`
                        : 'Brak danych — ustaw ręcznie lub zsynchronizuj aktywności z tętnem'
                      }
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Input
                    type="number"
                    placeholder={connection.estimatedMaxHR?.toString() || '185'}
                    min={100}
                    max={230}
                    value={maxHRInput}
                    onChange={(e) => setMaxHRInput(e.target.value)}
                    className="w-24"
                  />
                  <Button variant="outline" size="sm" onClick={handleSaveMaxHR} disabled={maxHRSaving || !maxHRInput}>
                    {maxHRSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Zapisz'}
                  </Button>
                </div>
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

      {/* Sync Center */}
      <SyncCenterCard uid={uid} />

      {/* Feature Flags — admin only */}
      {isAdmin && <FeatureFlagsPanel />}
    </div>
  );
};

export default Settings;
