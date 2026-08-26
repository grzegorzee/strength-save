// X37 WP-B: "Proponuj rozgrzewkę przed treningiem" (users/{uid}.preferences.warmupPrompt).
// Domyślnie WŁĄCZONE; brak pola = włączone. Cache w localStorage czytany
// synchronicznie przy klikaniu "Rozpocznij trening" (wzorzec keep-awake.ts),
// mirror w chmurze między web i iOS (PreferenceSync: chmura -> cache,
// persistWarmupPrompt w warmup-prompt-sync.ts: cache -> chmura).
// Wyłączenie zabiera TYLKO arkusz przed startem: płomyk w pasku sesji i
// "Dodaj serie rozgrzewkowe" zostają zawsze (niezmiennik planu X37).
// Czysty moduł, zero Firebase (czytają go testy logiki startu).

export const WARMUP_PROMPT_KEY = 'fittracker_warmup_prompt_v1';

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
  } catch { /* localStorage niedostępne: zostaje domyślka */ }
};
