// X37 WP-B: "Proponuj rozgrzewkę przed treningiem" (users/{uid}.preferences.warmupPrompt).
// Domyślnie WŁĄCZONE; brak pola = włączone. Cache w localStorage czytany
// synchronicznie przy klikaniu "Rozpocznij trening" (wzorzec keep-awake.ts),
// mirror w chmurze między web i iOS (PreferenceSync: chmura -> cache,
// persistWarmupPrompt w warmup-prompt-sync.ts: cache -> chmura).
// Wyłączenie zabiera TYLKO arkusz przed startem: płomyk w pasku sesji i
// "Dodaj serie rozgrzewkowe" zostają zawsze (niezmiennik planu X37).
// Czysty moduł, zero Firebase (czytają go testy logiki startu).

export const WARMUP_PROMPT_KEY = 'fittracker_warmup_prompt_v1';
export const WARMUP_PROMPT_OWNER_KEY = 'fittracker_warmup_prompt_owner_v1';

const ownerPreferenceKey = (uid: string): string => `${WARMUP_PROMPT_KEY}:${encodeURIComponent(uid)}`;

export const claimWarmupPromptOwner = (uid: string): void => {
  try {
    const previousOwner = window.localStorage.getItem(WARMUP_PROMPT_OWNER_KEY);
    if (previousOwner === uid) return;
    const previousValue = window.localStorage.getItem(WARMUP_PROMPT_KEY);
    if (previousOwner && (previousValue === 'true' || previousValue === 'false')) {
      window.localStorage.setItem(ownerPreferenceKey(previousOwner), previousValue);
    }
    const nextValue = window.localStorage.getItem(ownerPreferenceKey(uid));
    window.localStorage.setItem(WARMUP_PROMPT_OWNER_KEY, uid);
    if (nextValue === 'true' || nextValue === 'false') {
      window.localStorage.setItem(WARMUP_PROMPT_KEY, nextValue);
    } else {
      // Nie przypisujemy legacy cache o nieznanym właścicielu nowemu kontu.
      // Brak zapisanej preferencji tego konta oznacza domyślne włączenie.
      window.localStorage.removeItem(WARMUP_PROMPT_KEY);
    }
  } catch { /* localStorage niedostępne: odczyt zachowuje domyślne włączenie */ }
};

export const isWarmupPromptEnabled = (): boolean => {
  try {
    return window.localStorage.getItem(WARMUP_PROMPT_KEY) !== 'false';
  } catch {
    return true;
  }
};

export const setWarmupPromptEnabled = (enabled: boolean): void => {
  try {
    window.localStorage.setItem(WARMUP_PROMPT_KEY, enabled ? 'true' : 'false');
    const owner = window.localStorage.getItem(WARMUP_PROMPT_OWNER_KEY);
    if (owner) window.localStorage.setItem(ownerPreferenceKey(owner), enabled ? 'true' : 'false');
  } catch { /* localStorage niedostępne: zostaje domyślka */ }
};
