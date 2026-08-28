# Granica danych zdrowotnych w treningach — 2026-08-28

> **Aktualizacja X64/X65:** opis „obecnego kodu” poniżej dokumentuje stan sprzed
> domknięcia. Aktualny klient używa `syncWorkoutV2`, fence i pending queue;
> istnieją read-join, owner export/delete, backup v3 i atomowy restore v3. Lokalna
> implementacja oraz Rules są zielone. Publiczny rollout nadal wymaga kolejności
> backend-first i syntetycznego canary; migracja realnych danych pozostaje
> zablokowana bez jawnej aktualnej zgody i zatwierdzonego schematu.

## Niezmiennik

- Plan, serie, ciężary, notatki i bazowy trening działają bez zgody zdrowotnej.
- `rpe`, `pain` i `quality` nie mogą powstać ani zostać zmienione w chmurze bez
  aktywnej zgody `health=1.1` oraz aktualnego `healthEpoch` i `healthGrantId`.
- Historyczne treningi pozostają czytelne i usuwalne po wycofaniu zgody.
- Draft lokalny, kolejka synchronizacji, promocja sesji provisional oraz
  idempotencja `revision/writeId` nie mogą zostać osłabione.
- Ten etap nie migruje ani nie modyfikuje danych realnych użytkowników.

## Stan historyczny przed X64

Główna ścieżka to `workout-sync-engine.ts` → `batchSaveWorkout` →
`saveWorkoutBatchWithRevision`. Zapis jest transakcją klienta bezpośrednio do
`workouts/{id}`. RPE, ból i jakość są zagnieżdżone w elementach tablicy
`exercises[]`. Osobne bezpośrednie zapisy istnieją również dla importu JSON i CSV.

Firestore Rules potrafią sprawdzić zmianę pola `exercises` jako całości, ale nie
potrafią bezpiecznie przeiterować po tablicy dowolnej długości i rozpoznać, czy
którykolwiek element zawiera pola zdrowotne. Dlatego:

- wymaganie zgody przy każdej zmianie `exercises` zablokowałoby zwykły trening;
- pole deklaratywne typu `containsHealthData=false` byłoby możliwe do podrobienia;
- sprawdzanie ręcznie indeksów miałoby limit, złożoność i możliwość obejścia;
- trigger po zapisie usuwałby dane dopiero po ich bezprawnym utrwaleniu i nie jest
  granicą bezpieczeństwa.

## Historyczny etap foundation

`functions/src/workout-health-boundary.ts` zawiera fail-closed sanitizer do
przyszłej serwerowej ścieżki zapisu. Bez aktywnego grantu usuwa wyłącznie trzy
pola zdrowotne i zachowuje trening bazowy. Z aktywnym grantem przepuszcza jedynie
metryki o poprawnych zakresach i zwraca fence `healthEpoch/healthGrantId`.

Test `functions/src/workout-health-boundary.test.ts` pokrywa:

1. tryb podstawowy bez zgody i zachowanie serii/notatek/nazwy;
2. odrzucenie zgody legacy `1.0` oraz niepełnego fence;
3. zachowanie starego przepływu przy aktywnej zgodzie `1.1`;
4. odrzucenie niepoprawnych wartości mimo aktywnej zgody;
5. brak mutacji payloadu wejściowego.

Helper nie jest jeszcze podpięty do produkcyjnego zapisu. To świadome: samo
podpięcie po stronie klienta nie tworzy backendowej gwarancji, a pochopne
przełączenie zapisu grozi utratą draftu lub brakiem synchronizacji starych buildów.

## Historyczna checklista implementacji i aktualny rollout

1. Dodać callable `syncWorkoutV2`, który w jednej transakcji:
   - czyta `users/{uid}.consents`;
   - uruchamia sanitizer;
   - zachowuje aktualny kontrakt `expectedRevision/writeId`;
   - zapisuje ten sam dokument `workouts/{id}` i zwraca `revision/updatedAt`.
2. Dodać emulatorowe testy sekwencji: plan → wyjście → szybki trening → powrót →
   zakończenie → sync, w wariantach zgoda aktywna, brak zgody i withdraw w trakcie.
3. Wdrożyć callable bez przełączania klienta i wykonać syntetyczny canary na
   sztucznym koncie. Żadnych zapisów na kontach realnych użytkowników.
4. Przełączyć wszystkie zapisy zawartości treningu: checkpoint/final, import JSON,
   import CSV i naprawę historii. Draft IndexedDB + fallback localStorage pozostają
   źródłem retry; callable jest tylko granicą chmurowego commitu.
5. Dopiero po wymuszeniu minimalnej wersji aplikacji zamknąć Rules:
   - klient może utworzyć wyłącznie pustą sesję bazową;
   - klient nie może tworzyć ani zmieniać `exercises`;
   - callable przez Admin SDK jest jedyną ścieżką zapisu zawartości;
   - owner nadal może czytać i usuwać legacy dokumenty.
6. Bramki urządzeniowe: słaby internet, zgaszony ekran, suspend WKWebView, lost ACK,
   powrót z tła i ręczne wycofanie zgody podczas oczekującego final syncu.

Punkty implementacyjne 1–5 są ukończone lokalnie w X64. Publiczny release
pozostaje zablokowany do backend-first deployu, syntetycznego canary oraz punktu 6
na fizycznych urządzeniach. Żaden krok nie upoważnia do automatycznej migracji
danych realnych użytkowników.
