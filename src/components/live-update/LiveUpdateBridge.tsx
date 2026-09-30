import { useEffect } from 'react';
import { markLiveUpdateReady, setLiveUpdateUser } from '@/lib/live-update';

// Sygnał gotowości dla OTA: montowany dopiero wewnątrz wyrenderowanej powłoki
// (Login, AuthenticatedApp albo ekran startu w trybie „wolno”). Jeśli pakiet
// OTA wysypie się przed tym commitem (błąd składni, brak chunka, crash renderu
// pod ErrorBoundary), sygnał nie padnie i natywny plugin wróci do bundla
// wbudowanego po readyTimeout (capacitor.config.ts).

export const LiveUpdateReadySignal = () => {
  useEffect(() => {
    markLiveUpdateReady();
  }, []);
  return null;
};

interface LiveUpdateBridgeProps {
  /** undefined = profil jeszcze się ładuje (kanał nieznany), null = wylogowany. */
  user: { uid: string; isAdmin: boolean; channel?: 'internal' | 'production' } | null | undefined;
}

export const LiveUpdateBridge = ({ user }: LiveUpdateBridgeProps) => {
  const known = user !== undefined;
  const uid = user?.uid ?? null;
  const isAdmin = !!user?.isAdmin;
  // Kanał przypisany przez admina w panelu (users/{uid}.liveUpdateChannel).
  const channel = user?.channel === 'internal' ? 'internal' : 'production';
  useEffect(() => {
    if (!known) return;
    setLiveUpdateUser(uid ? { uid, isAdmin, channel } : null);
  }, [known, uid, isAdmin, channel]);
  return <LiveUpdateReadySignal />;
};
