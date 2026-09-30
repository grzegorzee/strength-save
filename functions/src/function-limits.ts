// Limity instancji (bez efektów ubocznych: importują je moduły funkcji).
// Uzasadnienie wartości: docs/COST-GUARDS.md, sekcja 1.

export const DEFAULT_MAX_INSTANCES = 10;

/**
 * Jawne wyjątki: ścieżki, których odrzucenie (429) kosztuje usera dane albo
 * pieniądze, i których ruch rośnie liniowo z liczbą aktywnych userów.
 */
export const MAX_INSTANCES_OVERRIDES = {
  // Zapis treningu: każdy koniec serii na siłowni, dane święte.
  syncWorkoutV2: 30,
  // Każde otwarcie apki na każdym urządzeniu.
  syncUserProfile: 30,
  // Rejestracja tokenu push przy otwarciu apki.
  registerPushToken: 20,
  // Triggery Firestore 1:1 z zapisami workouts (Eventarc ponawia 429, ale opóźnia agregat i push).
  onWorkoutWrittenAggregate: 20,
  onWorkoutCompletedPrPush: 20,
  // Płatności: odrzucony webhook = opóźnione PRO u płacącego usera.
  revenuecatWebhook: 20,
} as const;

export const MAX_INSTANCES_CEILING = 30;
