// Wybór dźwięku końca przerwy (zgłoszenie usera 2026-07-20: „coś głośniejszego
// i bardziej charakterystycznego, co pasuje na siłownię").
//
// Pliki żyją w DWÓCH miejscach i to nie jest duplikacja przez pomyłkę:
//  - root bundla iOS  → dla powiadomienia systemowego (UNNotificationSound szuka
//    PLIKU po nazwie; alias 'default' nie działa, patrz rest-notification.ts),
//  - web assets       → dla odtworzenia w apce na wierzchu (HTMLAudioElement).

export type RestSoundId = 'bell' | 'horn' | 'alarm';

export interface RestSoundOption {
  id: RestSoundId;
  /** Nazwa pliku — identyczna w bundlu iOS i w web assets. */
  file: string;
  labelKey: 'rest.sound.bell' | 'rest.sound.horn' | 'rest.sound.alarm';
}

export const REST_SOUNDS: RestSoundOption[] = [
  { id: 'bell', file: 'rest_bell.wav', labelKey: 'rest.sound.bell' },
  { id: 'horn', file: 'rest_horn.wav', labelKey: 'rest.sound.horn' },
  { id: 'alarm', file: 'rest_alarm.wav', labelKey: 'rest.sound.alarm' },
];

const KEY = 'fittracker_rest_sound_v1';
/** Dzwon bokserski: klasyk siłowni, przebija hałas i nie brzmi jak alarm medyczny. */
export const DEFAULT_REST_SOUND: RestSoundId = 'bell';

export const loadRestSound = (): RestSoundOption => {
  try {
    const raw = window.localStorage.getItem(KEY);
    return REST_SOUNDS.find((s) => s.id === raw) ?? REST_SOUNDS[0];
  } catch {
    return REST_SOUNDS[0];
  }
};

export const saveRestSound = (id: RestSoundId): void => {
  try {
    window.localStorage.setItem(KEY, id);
  } catch { /* localStorage niedostępne — zostaje domyślny */ }
};

/** URL pliku w web assets (BASE_URL bierze pod uwagę podkatalog gh-pages). */
export const restSoundUrl = (file: string): string =>
  `${import.meta.env.BASE_URL ?? '/'}${file}`;
