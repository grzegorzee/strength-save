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

const REST_NOTIFICATION_ID = 90001;

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

// Wyścig schedule vs cancel (R2-25): schedule ma w środku awaity (uprawnienia, cancel
// poprzedniego) — pauza w tym oknie nie może przegrać z dokończeniem schedule.
// Token generacji unieważnia trwający schedule, wspólny chain serializuje operacje.
let operationGeneration = 0;
let operationChain: Promise<void> = Promise.resolve();

/** Zaplanuj systemowe powiadomienie (dźwięk + wibracja) na koniec przerwy za `seconds` sekund. */
export const scheduleRestEndNotification = async (
  seconds: number,
  title: string,
  body: string
): Promise<void> => {
  if (!Capacitor.isNativePlatform() || seconds <= 0) return;
  operationGeneration += 1;
  const myGeneration = operationGeneration;

  operationChain = operationChain.then(async () => {
    if (myGeneration !== operationGeneration) return;
    if (!(await ensurePermission())) return;
    if (myGeneration !== operationGeneration) return;

    try {
      // Nadpisz ewentualne wcześniejsze (jeden aktywny timer przerwy naraz).
      await LocalNotifications.cancel({ notifications: [{ id: REST_NOTIFICATION_ID }] });
      if (myGeneration !== operationGeneration) return;
      await LocalNotifications.schedule({
        notifications: [{
          id: REST_NOTIFICATION_ID,
          title,
          body,
          schedule: { at: new Date(Date.now() + seconds * 1000), allowWhileIdle: true },
          sound: loadRestSound().file,
        }],
      });
    } catch {
      // Brak local notifications — koniec przerwy zasygnalizuje tylko in-app dźwięk/haptic.
    }
  });
  await operationChain;
};

// ---- Bug 8 (X30): uzbrajanie przerwy + planowanie dopiero w tle ----

interface ArmedRestEnd {
  deadlineAt: number;
  title: string;
  body: string;
}

let armedRestEnd: ArmedRestEnd | null = null;
let lifecycleListenerRegistered = false;

// Anuluj pending + sprzątnij DOSTARCZONE wpisy (bug 8: stare "Koniec przerwy"
// kumulowały się w Centrum Powiadomień — plugin cancel usuwa tylko pending).
const cancelSystemNotification = async (): Promise<void> => {
  // Unieważnij trwający schedule i dołącz do chaina (cancel czeka na jego zakończenie).
  operationGeneration += 1;
  operationChain = operationChain.then(async () => {
    try {
      await LocalNotifications.cancel({ notifications: [{ id: REST_NOTIFICATION_ID }] });
      await LocalNotifications.removeDeliveredNotifications({
        notifications: [{ id: REST_NOTIFICATION_ID, title: '', body: '' }],
      });
    } catch {
      // Nic do anulowania.
    }
  });
  await operationChain;
};

/** Anuluj powiadomienie końca przerwy (pauza/reset/zamknięcie/koniec w foreground). Rozbraja przerwę. */
export const cancelRestEndNotification = async (): Promise<void> => {
  if (!Capacitor.isNativePlatform()) return;
  // Rozbrojenie: po skip/finish/unmount przejście w tło NIE ma prawa zaplanować
  // notyfikacji dla przerwy, której już nie ma.
  armedRestEnd = null;
  await cancelSystemNotification();
};

const handleAppActiveChange = (isActive: boolean): void => {
  if (isActive) {
    // Powrót na pierwszy plan: odliczanie przejmuje UI — pending nie ma prawa
    // wystrzelić drugi raz, dostarczone wpisy sprzątamy. Przerwa ZOSTAJE
    // uzbrojona (kolejne zejście w tło planuje od nowa).
    void cancelSystemNotification();
    return;
  }
  const armed = armedRestEnd;
  if (!armed) return;
  const msLeft = armed.deadlineAt - Date.now();
  // Deadline za nami = sygnał już poszedł (albo zaraz pójdzie z RestBar w foregroundzie).
  if (msLeft <= 0) return;
  // Zaokrąglenie W GÓRĘ: ułamek sekundy przed deadline nie ma prawa zgubić sygnału.
  void scheduleRestEndNotification(Math.max(1, Math.ceil(msLeft / 1000)), armed.title, armed.body);
};

/**
 * Uzbrój systemowy sygnał końca przerwy: zapamiętaj deadline i treść, zaplanuj
 * DOPIERO gdy apka zejdzie w tło (appStateChange/visibilitychange). W foregroundzie
 * koniec sygnalizuje wyłącznie apka (gong + haptyka w RestBar).
 */
export const armRestEndNotification = (deadlineAt: number, title: string, body: string): void => {
  if (!Capacitor.isNativePlatform()) return;
  armedRestEnd = { deadlineAt, title, body };
  // Prompt o uprawnienia ma paść w foregroundzie przy starcie przerwy (jak
  // dotąd przy natychmiastowym schedule), nie w oknie przejścia w tło.
  void ensurePermission();
  if (!lifecycleListenerRegistered) {
    lifecycleListenerRegistered = true;
    addAppStateListener(handleAppActiveChange);
  }
};
