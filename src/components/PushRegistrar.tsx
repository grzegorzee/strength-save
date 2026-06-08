import { useEffect } from 'react';
import { useCurrentUser } from '@/contexts/UserContext';
import { registerPushForUser, listenPushTokenRefresh } from '@/lib/push-notifications';

// Rejestruje token push użytkownika (native) gdy ma dostęp do aplikacji.
export const PushRegistrar = () => {
  const { uid, hasAppAccess } = useCurrentUser();
  useEffect(() => {
    if (!uid || !hasAppAccess) return;
    void registerPushForUser(uid);
    return listenPushTokenRefresh(uid);
  }, [uid, hasAppAccess]);
  return null;
};
