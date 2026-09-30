// Link "Otwórz aplikację" z maili (2026-09-30): Universal Links (iOS),
// App Links (Android) i strengthsave://open (intent z landingu). Parser
// i biała lista tras: src/lib/deep-link.ts.
//
// @capacitor/app trzyma appUrlOpen do pierwszego listenera (iOS
// AppPlugin.swift:55,63 retainUntilConsumed, Android AppPlugin.java:156,
// zimny start przez BridgeActivity.java:51), więc zimny start też trafia tutaj.
//
// Niezmiennik: link NIGDY nie przełącza ekranu, gdy trening trwa (ekran
// treningu, trening próbny albo żywy draft dnia; wtedy auto-resume ma
// pierwszeństwo). Zamiast tego dyskretny toast.
import { useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { App } from '@capacitor/app';
import type { PluginListenerHandle } from '@capacitor/core';
import { Capacitor } from '@capacitor/core';
import { useCurrentUser } from '@/contexts/UserContext';
import { useTranslation } from '@/contexts/LanguageContext';
import { toast } from '@/hooks/use-toast';
import { parseAppOpenUrl } from '@/lib/deep-link';
import { workoutDraftDb } from '@/lib/workout-draft-db';
import { isDraftContinuableToday } from '@/lib/workout-resume';
import { formatLocalDate } from '@/lib/utils';

const isTrainingScreen = (pathname: string): boolean =>
  pathname.startsWith('/workout/') || pathname === '/practice';

export const DeepLinkRouter = ({ enabled }: { enabled: boolean }) => {
  const { uid } = useCurrentUser();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const live = useRef({ navigate, location, uid, enabled, t });
  live.current = { navigate, location, uid, enabled, t };

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    const handle = async (url: string) => {
      const link = parseAppOpenUrl(url);
      if (!link?.to) return;
      const current = live.current;
      if (!current.enabled) return;
      if (current.location.pathname === link.to) return;

      let trainingActive = isTrainingScreen(current.location.pathname);
      if (!trainingActive && current.uid) {
        try {
          const draft = await workoutDraftDb.loadActiveDraft(current.uid);
          trainingActive = isDraftContinuableToday(draft, formatLocalDate(new Date()));
        } catch {
          // Fail-closed: nie wiemy, czy trening trwa, więc nie przełączamy ekranu.
          trainingActive = true;
        }
      }
      // Stan mógł się zmienić w trakcie odczytu draftu (np. auto-resume).
      if (isTrainingScreen(live.current.location.pathname)) trainingActive = true;

      if (trainingActive) {
        toast({ title: live.current.t('deepLink.workoutInProgress') });
        return;
      }
      live.current.navigate(link.to);
    };

    let listener: PluginListenerHandle | null = null;
    let disposed = false;
    void App.addListener('appUrlOpen', (event) => {
      void handle(event.url);
    }).then((h) => {
      if (disposed) void h.remove();
      else listener = h;
    });

    return () => {
      disposed = true;
      void listener?.remove();
    };
  }, []);

  return null;
};
