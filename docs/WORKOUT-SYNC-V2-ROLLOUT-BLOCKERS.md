# syncWorkoutV2 — bezpieczna granica rollout

Status 2026-08-28 (X64/X65): foundation jest podłączony do produkcyjnego hooka i
zielony lokalnie. Dokument zachowuje historię blockerów implementacyjnych; sekcje
twierdzące, że adapter, read-join, eksport lub delete nie istnieją, są
supersedowane. Otwarty jest wyłącznie rollout backend-first: Functions + Rules →
syntetyczny save/read/restore → klient → ewentualna migracja tylko po aktualnej
jawnej zgodzie. Bez deployu w ramach tej fali.

`syncWorkoutV2` zapisuje bazowy trening niezależnie od zgody zdrowotnej, a nowe
RPE/ból/jakość dopuszcza wyłącznie przy zgodnym `healthEpoch + healthGrantId`.
Metryki trafiają do `workout_health_v2`; istniejące pola health osadzone w legacy
`workouts` pozostają nietknięte. Retry z tym samym `writeId` zachowuje rewizję i
może ponowić sam side-write health. Callable wymaga auth i App Check.

`useFirebaseWorkouts.batchSaveWorkout` korzysta już z v2 lokalnie; poniższa lista
jest zachowaną checklistą, którą implementacja X64 domknęła przed przełączeniem.

## Checklista implementacyjna domknięta w X64 (stan historyczny)

1. **Fence w drafcie z chwili wpisania metryk.** `ActiveWorkoutDraft`, fallback
   localStorage, merge po promocji oraz snapshot muszą utrwalać opcjonalne
   `healthEpoch` i `healthGrantId` dokładnie wtedy, gdy użytkownik wpisuje pierwszą
   metrykę. Stary draft bez fence synchronizuje bazę, a health jest stripowane.
   Retry nigdy nie może pobrać bieżącego grantu z profilu.

2. **Fence w kolejce referencyjnej.** `WorkoutSyncQueueEntry` musi kopiować fence
   z draftu wyłącznie jako barierę audytową/recovery. Źródłem treści nadal pozostaje
   draft; kolejka nie może dostać kopii ćwiczeń ani metryk.

3. **Semantyka `health: pending`.** Silnik musi pozostawić draft i wpis kolejki z
   tym samym `pendingWriteId`. Kolejny retry ma dostać `alreadyApplied` dla bazy i
   ponowić health. Dopiero `written`, `stripped` albo brak pól health pozwala
   wyczyścić draft. Błąd health nie może zgłosić porażki bazowego treningu ani
   stworzyć konfliktu rewizji.

4. **Read-join historii.** `workout_health_v2` jest obecnie zamknięte dla klienta
   przez domyślny deny w `firestore.rules`, a `workout-read-store.ts` czyta tylko
   `workouts`. Potrzebny jest owner-only callable read-join albo owner-only rules +
   kontrolowany join. Po withdraw właściciel nadal musi móc odczytać, wyeksportować
   i usunąć własne już zapisane dane; withdraw blokuje nowe zapisy, nie prawa osoby.

5. **Eksport.** Lokalny backup (`useFirebaseWorkouts.exportData`) i API eksportu
   (`functions/src/index.ts` / `admin-api.ts`) zwracają dziś tylko `workouts`.
   Muszą dołączyć health v2 po właścicielu i zachować jednoznaczny schema version.

6. **Self-delete/GDPR.** `GDPR_USER_ID_COLLECTIONS` w `functions/src/security.ts`
   nie zawiera `workout_health_v2`. Kolekcja musi wejść do purge i testu integracyjnego
   usunięcia konta przed pierwszym produkcyjnym zapisem v2.

7. **Bezpieczny rollout klienta.** Callable jest addytywny, ale produkcyjny hook
   nadal używa transakcji legacy. Potrzebna jest jawna flaga/minimalny build klienta,
   tak aby read-join, eksport, delete i obsługa pending były dostępne przed pierwszym
   zapisem do nowej kolekcji. Nie należy wykonywać dual-write health.

8. **Regresje przepływu.** Przed przełączeniem wymagane są testy health on/off dla:
   starego checkpoint/final flow, E2E cloud mock oraz sekwencji
   `plan → wyjście → szybki trening → powrót do planu → zakończenie → sync`, w tym
   lost-ACK po zatwierdzeniu bazy i restart aplikacji przed side-write health.

## Dowód granicy sprzed X64 (stan historyczny)

- `functions/src/workout-sync-v2.test.ts`: brak zgody, aktywny grant,
  stale/withdraw, lost-ACK, konflikt, legacy preserved, invalid strip, wrong owner
  i niezależna awaria side-write.
- `src/test/workout-sync-v2-adapter.test.ts`: protokół/fence, base-only bez grantu
  oraz jawny wynik pending.
- `firestore.rules`: brak match dla `workout_health_v2`, więc końcowy default deny
  nie daje klientowi bezpośredniego odczytu ani zapisu.
- `src/hooks/useFirebaseWorkouts.ts`: produkcyjny `batchSaveWorkout` nadal używa
  `saveWorkoutBatchWithRevision`; E2E mock pozostaje na dotychczasowej ścieżce.

## Aktualne kryterium rollout

Testy draft/fallback/promotion, queue, pending/lost-ACK, read-join/history, export,
self-delete, E2E mock i pełna sekwencja są zielone lokalnie. Rollout jest
dopuszczalny dopiero w kolejności: Functions + Rules, syntetyczny
save/read/restore bez danych realnego użytkownika, a następnie klient. Migracja
legacy wymaga osobnej zgody, backupu i zaakceptowanego schematu.
