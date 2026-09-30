import { Capacitor } from '@capacitor/core';
import { useTranslation } from '@/contexts/LanguageContext';
import { getLiveUpdateController } from '@/lib/live-update';

// Wersja w oknie „O aplikacji” + informacja o kanale aktualizacji OTA (tylko natywnie).
// Kanał `internal` przypisuje wyłącznie admin w panelu (karta użytkownika);
// na urządzeniu nie ma żadnego przełącznika ani ukrytego gestu (Apple 2.3.1(a)).
export const AboutVersionLine = ({ label }: { label: string }) => {
  const { t } = useTranslation();
  const controller = Capacitor.isNativePlatform() ? getLiveUpdateController() : null;
  const text = t('profile.about.version', { version: label });
  if (!controller) return <p className="text-xs text-muted-foreground">{text}</p>;

  return (
    <div className="space-y-1">
      <p className="text-xs text-muted-foreground">{text}</p>
      <p className="text-xs text-muted-foreground">
        {t(controller.getChannel() === 'internal' ? 'liveUpdate.channel.internal' : 'liveUpdate.channel.production')}
      </p>
    </div>
  );
};
