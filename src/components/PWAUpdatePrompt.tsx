import { useEffect, useState } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { CloudOff } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { isPwaUpdateBlocked, subscribeToPwaUpdateBlock } from '@/lib/pwa-update-guard';

export const PWAUpdatePrompt = () => {
  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_swUrl, r) {
      if (r) {
        // Check for updates every 10 minutes
        setInterval(() => r.update(), 10 * 60 * 1000);
      }
    },
  });
  const [isBlocked, setIsBlocked] = useState(() => isPwaUpdateBlocked());

  useEffect(() => subscribeToPwaUpdateBlock(setIsBlocked), []);

  useEffect(() => {
    if (needRefresh && !isBlocked) {
      void updateServiceWorker(true);
    }
  }, [isBlocked, needRefresh, updateServiceWorker]);

  if (!needRefresh || !isBlocked) {
    return null;
  }

  return (
    <Card className="fixed bottom-4 right-4 z-[60] w-[min(26rem,calc(100vw-2rem))] border-amber-400/60 bg-amber-50 shadow-lg dark:bg-amber-950/80">
      <CardContent className="flex items-start gap-3 p-4">
        <CloudOff className="mt-0.5 h-5 w-5 shrink-0 text-amber-700 dark:text-amber-300" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-amber-900 dark:text-amber-100">Aktualizacja czeka</p>
          <p className="mt-1 text-xs text-amber-800 dark:text-amber-200">
            Wykryto nową wersję aplikacji, ale aktywny trening blokuje automatyczne odświeżenie. Zastosujemy update po zakończeniu synchronizacji.
          </p>
        </div>
      </CardContent>
    </Card>
  );
};
