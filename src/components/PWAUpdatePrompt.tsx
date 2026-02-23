import { useRegisterSW } from 'virtual:pwa-register/react';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';

export const PWAUpdatePrompt = () => {
  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW();

  if (!needRefresh) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 z-[100] md:left-auto md:right-4 md:w-80">
      <div className="bg-primary text-primary-foreground rounded-xl p-4 shadow-lg flex items-center gap-3">
        <RefreshCw className="h-5 w-5 shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium">Nowa wersja dostępna</p>
        </div>
        <Button
          size="sm"
          variant="secondary"
          onClick={() => updateServiceWorker(true)}
        >
          Aktualizuj
        </Button>
      </div>
    </div>
  );
};
