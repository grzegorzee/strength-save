import { useEffect, useState } from 'react';
import { addAppStateListener } from '@/lib/app-lifecycle';
import { formatLocalDate } from '@/lib/utils';

const startOfToday = (): Date => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
};

/**
 * Z173: "dzisiaj" odporne na rollover doby. WKWebView żyje DNIAMI, a
 * `useMemo(() => new Date(), [])` zamrażał datę z momentu mountu — środa
 * pokazywała "Pominięte", zanim nadeszła. Referencja jest STABILNA w obrębie
 * dnia (update stanu tylko przy zmianie daty), więc hook nie generuje
 * zbędnych re-renderów.
 *
 * Sygnały odświeżenia: powrót z tła (appStateChange natywnie /
 * visibilitychange na webie — addAppStateListener), focus okna oraz timer
 * ustawiony na najbliższą północ (foreground przez noc; w tle iOS wstrzymuje
 * timery, wtedy łapie to powrót z tła).
 */
export const useToday = (): Date => {
  const [today, setToday] = useState<Date>(() => startOfToday());

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;

    const armMidnightTimer = () => {
      if (timer !== null) clearTimeout(timer);
      const now = new Date();
      const nextMidnight = new Date(now);
      nextMidnight.setHours(24, 0, 1, 0); // 00:00:01 następnego dnia
      timer = setTimeout(refresh, nextMidnight.getTime() - now.getTime());
    };

    const refresh = () => {
      const next = startOfToday();
      setToday((prev) => (formatLocalDate(prev) === formatLocalDate(next) ? prev : next));
      armMidnightTimer();
    };

    const removeAppState = addAppStateListener((isActive) => {
      if (isActive) refresh();
    });
    const onFocus = () => refresh();
    window.addEventListener('focus', onFocus);
    armMidnightTimer();

    return () => {
      removeAppState();
      window.removeEventListener('focus', onFocus);
      if (timer !== null) clearTimeout(timer);
    };
  }, []);

  return today;
};
