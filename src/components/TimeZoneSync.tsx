import { useEffect, useRef } from 'react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useCurrentUser } from '@/contexts/UserContext';
import { readDeviceTimeZone } from '@/lib/device-time-zone';

// Bug 11 (X30): backend (poranny push, digest tygodnia) liczył porę i dzień
// z zegara serwera w Europe/Warsaw — user w Ameryce dostawał push o 22:00
// z planem JUTRZEJSZEGO dnia. Klient zapisuje strefę IANA urządzenia do
// users/{uid}.timeZone; functions liczą z niej "lokalne teraz" per user.
// Jeden zapis per sesja i tylko przy różnicy (podróż, zmiana strefy).

export const TimeZoneSync = () => {
  const { uid, profile } = useCurrentUser();
  const syncedRef = useRef(false);

  useEffect(() => {
    if (!uid || !profile || syncedRef.current) return;
    syncedRef.current = true;
    const timeZone = readDeviceTimeZone();
    if (!timeZone || profile.timeZone === timeZone) return;
    updateDoc(doc(db, 'users', uid), { timeZone }).catch(() => {
      // Brak sieci / uprawnień — backend zostaje przy Warszawie do następnej sesji.
    });
  }, [uid, profile]);

  return null;
};
