import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';
import { loadRestSound } from '@/lib/rest-sound';
import { addAppStateListener } from '@/lib/app-lifecycle';

// Powiadomienie lokalne "koniec przerwy" (iOS/Android). JS w WKWebView jest wstrzymywany
// po zgaszeniu ekranu, więc haptic/dźwięk z setInterval NIE odpali się w tle — system musi
// dostarczyć alert sam.
//
// Bug 8 (X30): notyfikacja NIE jest już planowana od razu przy starcie przerwy.
// Cancel przy końcu w foregroundzie matematycznie nie zdąży przed deadlinem
// (tick 250 ms + bridge), więc naturalny koniec przy włączonym ekranie dawał
// PODWÓJNY dźwięk (system + gong apki) i banner nad UI sesji co przerwę.
// Model: RestBar UZBRAJA przerwę (armRestEndNotification), a schedule leci
// dopiero przy przejściu apki w tło; powrót na pierwszy plan anuluje pending
// i sprząta dostarczone wpisy z Centrum Powiadomień.
//
// WP-C (X37): ten sam mechanizm obsługuje DRUGI kanał: odliczanie serii na czas
// (plank, hollow hold). Kanały są niezależne (osobny id i osobny slot uzbrojenia):
// start odliczania w trakcie przerwy nie rozbraja przerwy, a koniec przerwy
// (cancel z RestBar) nie rozbraja odliczania. Zasada #5 CLAUDE.md.

const REST_NOTIFICATION_ID = 90001;
const SET_COUNTDOWN_NOTIFICATION_ID = 90002;

// DŹWIĘK POWIADOMIENIA: nazwa PLIKU w bundlu aplikacji, nigdy alias.
//
// Plugin robi wprost: content.sound = UNNotificationSound(named: UNNotificationSoundName(sound)).
// Czyli iOS szuka PLIKU o podanej nazwie. Wcześniej leciało tu 'default' — iOS
// szukał pliku „default", nie znajdował go i powiadomienie było NIEME (user zgłosił
// po treningu: sama cicha wibracja, zero dźwięku). Pominięcie pola też daje ciszę,
// bo plugin nie ustawia wtedy content.sound w ogóle.
//
// Pliki: ios/App/App/rest_{bell,horn,alarm}.wav, dodane do zasobów targetu App.
// Wybór usera z Ustawień; nazwa pliku jest identyczna po stronie web i natywnej.

// Cache TYLKO wyniku pozytywnego (R2-24): user może włączyć uprawnienia w Ustawieniach
// systemu w trakcie życia appki — odmowa weryfikowana ponownie przy każdej próbie.
let permissionGranted: boolean | null = null;

const ensurePermission = async (): Promise<boolean> => {
  if (permissionGranted === true) return true;
  try {
    let status = await LocalNotifications.checkPermissions();
    if (status.display === 'prompt' || status.display === 'prompt-with-rationale') {
      status = await LocalNotifications.requestPermissions();
    }
    permissionGranted = status.display === 'granted' ? true : null;
  } catch {
    permissionGranted = null;
  }
  return permissionGranted === true;
};

interface ArmedEnd {
  deadlineAt: number;
  title: string;
  body: string;
}

// Kanał = jeden id powiadomienia + jeden slot uzbrojenia + własny token generacji.
// Wyścig schedule vs cancel (R2-25): schedule ma w środku awaity (uprawnienia, cancel
// poprzedniego) — pauza w tym oknie nie może przegrać z dokończeniem schedule.
// Token generacji unieważnia trwający schedule TEGO kanału; wspólny chain
// serializuje operacje na pluginie.
interface NotificationChannel {
  id: number;
  armed: ArmedEnd | null;
  generation: number;
}

const restChannel: NotificationChannel = { id: REST_NOTIFICATION_ID, armed: null, generation: 0 };
const setCountdownChannel: NotificationChannel = { id: SET_COUNTDOWN_NOTIFICATION_ID, armed: null, generation: 0 };
const CHANNELS: NotificationChannel[] = [restChannel, setCountdownChannel];

let operationChain: Promise<void> = Promise.resolve();

const scheduleEndNotification = async (
  channel: NotificationChannel,
  seconds: number,
  title: string,
  body: string,
): Promise<void> => {
  if (!Capacitor.isNativePlatform() || seconds <= 0) return;
  channel.generation += 1;
  const myGeneration = channel.generation;

  operationChain = operationChain.then(async () => {
    if (myGeneration !== channel.generation) return;
    if (!(await ensurePermission())) return;
    if (myGeneration !== channel.generation) return;

    try {
      // Nadpisz ewentualne wcześniejsze (jeden aktywny timer na kanał naraz).
      await LocalNotifications.cancel({ notifications: [{ id: channel.id }] });
      if (myGeneration !== channel.generation) return;
      await LocalNotifications.schedule({
        notifications: [{
          id: channel.id,
          title,
          body,
          schedule: { at: new Date(Date.now() + seconds * 1000), allowWhileIdle: true },
          sound: loadRestSound().file,
        }],
      });
    } catch {
      // Brak local notifications: koniec zasygnalizuje tylko in-app dźwięk/haptic.
    }
  });
  await operationChain;
};

/** Zaplanuj systemowe powiadomienie (dźwięk + wibracja) na koniec przerwy za `seconds` sekund. */
export const scheduleRestEndNotification = (seconds: number, title: string, body: string): Promise<void> =>
  scheduleEndNotification(restChannel, seconds, title, body);

// ---- Bug 8 (X30): uzbrajanie + planowanie dopiero w tle ----

let lifecycleListenerRegistered = false;

// Anuluj pending + sprzątnij DOSTARCZONE wpisy (bug 8: stare "Koniec przerwy"
// kumulowały się w Centrum Powiadomień — plugin cancel usuwa tylko pending).
const cancelSystemNotification = async (channel: NotificationChannel): Promise<void> => {
  // Unieważnij trwający schedule i dołącz do chaina (cancel czeka na jego zakończenie).
  channel.generation += 1;
  operationChain = operationChain.then(async () => {
    try {
      await LocalNotifications.cancel({ notifications: [{ id: channel.id }] });
      await LocalNotifications.removeDeliveredNotifications({
        notifications: [{ id: channel.id, title: '', body: '' }],
      });
    } catch {
      // Nic do anulowania.
    }
  });
  await operationChain;
};

const disarmChannel = async (channel: NotificationChannel): Promise<void> => {
  if (!Capacitor.isNativePlatform()) return;
  // Rozbrojenie: po skip/finish/unmount przejście w tło NIE ma prawa zaplanować
  // notyfikacji dla przerwy/odliczania, których już nie ma.
  channel.armed = null;
  await cancelSystemNotification(channel);
};

/** Anuluj powiadomienie końca przerwy (pauza/reset/zamknięcie/koniec w foreground). Rozbraja przerwę. */
export const cancelRestEndNotification = (): Promise<void> => disarmChannel(restChannel);

/** WP-C (X37): anuluj powiadomienie końca odliczania serii (stop/koniec w foreground/unmount). */
export const cancelSetCountdownNotification = (): Promise<void> => disarmChannel(setCountdownChannel);

const handleAppActiveChange = (isActive: boolean): void => {
  for (const channel of CHANNELS) {
    // Nieuzbrojony kanał nie ma nic pending (schedule leci tylko z uzbrojenia,
    // rozbrojenie samo anuluje), więc nie zaśmiecamy chaina pustymi cancelami.
    const armed = channel.armed;
    if (!armed) continue;
    if (isActive) {
      // Powrót na pierwszy plan: odliczanie przejmuje UI, pending nie ma prawa
      // wystrzelić drugi raz, dostarczone wpisy sprzątamy. Kanał ZOSTAJE
      // uzbrojony (kolejne zejście w tło planuje od nowa).
      void cancelSystemNotification(channel);
      continue;
    }
    const msLeft = armed.deadlineAt - Date.now();
    // Deadline za nami = sygnał już poszedł (albo zaraz pójdzie z UI w foregroundzie).
    if (msLeft <= 0) continue;
    // Zaokrąglenie W GÓRĘ: ułamek sekundy przed deadline nie ma prawa zgubić sygnału.
    void scheduleEndNotification(channel, Math.max(1, Math.ceil(msLeft / 1000)), armed.title, armed.body);
  }
};

/**
 * Bug 53 (X30): tap w powiadomienie "Koniec przerwy". Plugin sam nie nawiguje,
 * a auto-resume (dirty || provisional) odmawia po checkpoincie online — bez
 * listenera cold start lądował na Dashboardzie. Zdarzenie jest retencjonowane
 * przez plugin do pierwszego listenera (retainUntilConsumed), więc rejestracja
 * po starcie apki łapie też tap, który ją uruchomił.
 * WP-C (X37): tap w "Koniec serii" (odliczanie) wraca do treningu tą samą drogą.
 */
export const addRestNotificationTapListener = (onTap: () => void): (() => void) => {
  if (!Capacitor.isNativePlatform()) return () => {};
  let removed = false;
  let removeNative: (() => void) | null = null;
  LocalNotifications.addListener('localNotificationActionPerformed', (event) => {
    const id = Number(event.notification?.id);
    if (id !== REST_NOTIFICATION_ID && id !== SET_COUNTDOWN_NOTIFICATION_ID) return;
    onTap();
  })
    .then((handle) => {
      if (removed) {
        void handle.remove();
        return;
      }
      removeNative = () => { void handle.remove(); };
    })
    .catch(() => {
      // Brak pluginu (build bez cap sync) — tap w powiadomienie otwiera samą apkę.
    });
  return () => {
    removed = true;
    removeNative?.();
  };
};

const armChannel = (channel: NotificationChannel, deadlineAt: number, title: string, body: string): void => {
  if (!Capacitor.isNativePlatform()) return;
  channel.armed = { deadlineAt, title, body };
  // Prompt o uprawnienia ma paść w foregroundzie przy starcie (jak dotąd przy
  // natychmiastowym schedule), nie w oknie przejścia w tło.
  void ensurePermission();
  if (!lifecycleListenerRegistered) {
    lifecycleListenerRegistered = true;
    addAppStateListener(handleAppActiveChange);
  }
};

/**
 * Uzbrój systemowy sygnał końca przerwy: zapamiętaj deadline i treść, zaplanuj
 * DOPIERO gdy apka zejdzie w tło (appStateChange/visibilitychange). W foregroundzie
 * koniec sygnalizuje wyłącznie apka (gong + haptyka w RestBar).
 */
export const armRestEndNotification = (deadlineAt: number, title: string, body: string): void =>
  armChannel(restChannel, deadlineAt, title, body);

/**
 * WP-C (X37): uzbrój systemowy sygnał końca odliczania serii na czas. Ten sam
 * model co przerwa (schedule dopiero w tle, sprzątanie po powrocie), osobny kanał.
 */
export const armSetCountdownNotification = (deadlineAt: number, title: string, body: string): void =>
  armChannel(setCountdownChannel, deadlineAt, title, body);
