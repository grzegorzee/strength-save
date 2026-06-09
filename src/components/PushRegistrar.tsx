import { useEffect } from 'react';
import { useCurrentUser } from '@/contexts/UserContext';
import { registerPushForUser, listenForegroundPush, listenPushTokenRefresh } from '@/lib/push-notifications';
import { useToast } from '@/hooks/use-toast';

// Rejestruje token push użytkownika (native) gdy ma dostęp do aplikacji.
export const PushRegistrar = () => {
  const { uid, hasAppAccess } = useCurrentUser();
  const { toast } = useToast();

  useEffect(() => {
    if (!uid || !hasAppAccess) return;
    void registerPushForUser(uid).then((result) => {
      if (result.status === 'error') {
        console.warn('[push] registration failed', result.error);
      }
    });

    const stopTokenRefresh = listenPushTokenRefresh(uid);
    const stopForegroundPush = listenForegroundPush((notification) => {
      toast({
        title: notification.title || 'Strength Save',
        description: notification.body,
      });
    });

    return () => {
      stopTokenRefresh();
      stopForegroundPush();
    };
  }, [uid, hasAppAccess, toast]);
  return null;
};
