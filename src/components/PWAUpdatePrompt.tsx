import { useEffect, useState } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { CloudOff } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { isPwaUpdateBlocked, subscribeToPwaUpdateBlock } from '@/lib/pwa-update-guard';
import { useTranslation } from '@/contexts/LanguageContext';

export const PWAUpdatePrompt = () => {
  const { t } = useTranslation();
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
    <Card className="fixed bottom-4 right-4 z-[60] w-[min(26rem,calc(100vw-2rem))] border-fitness-warning/60 bg-fitness-warning shadow-lg dark:bg-fitness-warning/10">
      <CardContent className="flex items-start gap-3 p-4">
        <CloudOff className="mt-0.5 h-5 w-5 shrink-0 text-fitness-warning dark:text-fitness-warning" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-fitness-warning dark:text-fitness-warning">{t('comp.pwa.updateWaitingTitle')}</p>
          <p className="mt-1 text-xs text-fitness-warning dark:text-fitness-warning">
            {t('comp.pwa.updateWaitingDesc')}
          </p>
        </div>
      </CardContent>
    </Card>
  );
};
