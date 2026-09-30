import { useRef, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { useTranslation } from '@/contexts/LanguageContext';
import { useToast } from '@/hooks/use-toast';
import { getLiveUpdateController } from '@/lib/live-update';

// Wersja w oknie „O aplikacji” + kanał aktualizacji OTA (tylko natywnie).
// Testerzy bez roli admina włączają kanał `internal` siedmioma dotknięciami
// wersji (jak opcje programisty w Androidzie); admin ma go domyślnie.

const TAPS_TO_TOGGLE = 7;
const TAP_WINDOW_MS = 3_000;

export const AboutVersionLine = ({ label }: { label: string }) => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const taps = useRef<number[]>([]);
  const [, setVersion] = useState(0);
  const controller = Capacitor.isNativePlatform() ? getLiveUpdateController() : null;

  const text = t('profile.about.version', { version: label });
  if (!controller) return <p className="text-xs text-muted-foreground">{text}</p>;

  const onTap = () => {
    const now = Date.now();
    taps.current = [...taps.current.filter((at) => now - at < TAP_WINDOW_MS), now];
    if (taps.current.length < TAPS_TO_TOGGLE) return;
    taps.current = [];
    const enable = !controller.isTesterChannel();
    controller.setTesterChannel(enable);
    setVersion((value) => value + 1);
    toast({ title: t(enable ? 'liveUpdate.tester.enabled' : 'liveUpdate.tester.disabled') });
  };

  return (
    <div className="space-y-1">
      <button type="button" onClick={onTap} className="block text-left text-xs text-muted-foreground">
        {text}
      </button>
      <p className="text-xs text-muted-foreground">
        {t(controller.getChannel() === 'internal' ? 'liveUpdate.channel.internal' : 'liveUpdate.channel.production')}
      </p>
    </div>
  );
};
