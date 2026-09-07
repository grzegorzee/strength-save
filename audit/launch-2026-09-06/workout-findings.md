# Audyt launch 2026-09-06 — trening i trwałość danych

Stan wejściowy: `33df6dbd`. Audyt źródeł aktualnego checkoutu; historyczne audyty nie są dowodem. Żadne dane realnego konta ani usługi produkcyjne nie zostały zmodyfikowane.

Środowisko docelowe: iOS/Android, trening z telefonem w kieszeni, suspend JS, słaba sieć, restart WebView. Niezmiennik: lokalna niezapisana treść zostaje aż do potwierdzenia tej samej treści w chmurze; plan pozostaje kompletną bazą; retry nie zmienia wyniku ani nie usuwa świadomych zmian.

## Plan naprawczy — potwierdzone źródłowo

### W1 / P1 — hydracja może skasować nowszą notatkę ćwiczenia

- `src/lib/workout-final-sync.ts:112-123`: `buildDraftFinalExpectation` buduje ćwiczenia wyłącznie z id/serii, bez `exerciseNotes` i `exerciseNames`.
- `src/pages/WorkoutDay.tsx:1241-1259`: pozytywne porównanie przekazywane do hydracji; `clearActiveDraft` usuwa cały draft.
- `src/lib/workout-hydration.ts:33-34`: usuwa również dirty draft, jeżeli cloud jest ukończony, finalSyncPending=false i walidacja treści przeszła.
- Osiągalna sekwencja: zapis finalny jest w toku; użytkownik zmienia notatkę ćwiczenia; silnik zachowuje nowszą wersję (`draftRetained`); ukończony snapshot chmury uruchamia hydrację, która ignoruje zmianę notatki, uznaje treść za identyczną i kasuje ją.
- Naprawa: pełna bazowa ekspektacja hydracji obejmująca notatki/nazwy i faktycznie wysyłane ćwiczenia; prywatnych metryk nie porównywać ze zwykłym bazowym dokumentem. Draft z oczekującym zapisem health nie może zostać skasowany przez bazowe porównanie.
- Regression: ta sama seria w cloud/drafcie, nowa exerciseNotes w dirty drafcie -> `clearDraft=false`, `useDraft=true`; identyczna treść -> dotychczasowy cleanup nadal działa.

### W2 / P2 — walidator gubi czas, dystans i ciężar asysty

- `src/lib/workout-final-sync.ts:40-45,95`: normalizeSet odrzuca `durationSec`, `distanceM`, `assistWeight`, a buildWorkoutWriteExpectation używa go do stworzenia ekspektacji.
- Ten sam plik `setsMatch:47-61` porównuje te pola actual z już obciętym expected, dlatego identyczny poprawnie zapisany plank/farmer walk/podciąganie z asystą daje `set-mismatch`.
- Osiągalna sekwencja: dokończ trening zawierający takie ćwiczenie -> final-save jest poprawny, confirm-read daje zawsze fałszywe `cloudUnconfirmed`. Retry po utracie ACK także nie rozpoznaje identycznej finalnej treści, wchodząc ponownie w zapis.
- Naprawa: wspólna normalizacja zachowująca pełny kształt wspieranej serii i zgodność z sanitizerem zapisu; pola techniczne LWW nie stanowią wyniku treningu.
- Regression: identyczne wszystkie trzy typy przechodzą walidację i alreadyFinalized; zmiana każdej wartości nadal jest odrzucana.

### W3 / P1 — skasowana notatka dnia i cofnięty ostatni skip wracają z chmury

- `src/lib/workout-sync-engine.ts:323-324`: puste `dayNotes` oraz `skippedExercises=[]` są zamieniane na undefined.
- `functions/src/workout-sync-v2.ts:143-146,319-320`: backend obsługuje pusty string/tablicę, lecz nieobecne pola nie zastępują poprzednich wartości.
- `src/pages/WorkoutDay.tsx:2555-2556`: edycja ukończonej sesji powtarza brak pustej tablicy skipów.
- Osiągalna sekwencja: dodaj notatkę i pomiń ćwiczenie -> checkpoint -> wyczyść notatkę i przywróć ćwiczenie -> checkpoint/final -> restart. Notatka wraca, a przywrócone ćwiczenie pozostaje oznaczone jako pominięte w chmurze mimo zapisanych serii.
- Naprawa: pełny snapshot wysyła świadome wartości `notes: ''` i `skippedExercises: []`; walidacja też porównuje te wartości.
- Regression: sekwencja dwóch zapisów z stateful atrapą chmury; po drugim pusty string i [] muszą zastąpić stare pola. Zachowanie niepustych metadanych nadal działa.

### W4 / P1 — porównanie uznaje usunięte serie za już zapisane

- `src/lib/workout-final-sync.ts:173`: sprawdzenie długości wyłącznie actual < expected. Nadmiarowe serie/ćwiczenia w chmurze są dozwolone.
- `src/lib/workout-sync-engine.ts:346-352`: alreadyFinalized omija zapis i przechodzi do usunięcia draftu.
- Osiągalna sekwencja: final zapisany, odpowiedź opóźniona/zgubiona; lokalnie usunięta ostatnia seria; ponowiony final z tą samą resztą treści. Dłuższy stary workout jest uznany za równoważny i krótszy draft znika. Analogicznie hydracja nowszego draftu po usunięciu serii.
- Naprawa: osobno jawna semantyka pełnego snapshotu w porównaniu wykorzystywanym do alreadyFinalized i destrukcyjnego cleanupu; dokładna liczba serii/ćwiczeń, zgodna z filtrem skipped. Nie usuwać lokalnego draftu na podstawie samego faktu, że cloud zawiera jego podzbiór.
- Regression: 2 serie w cloud / 1 w final drafcie -> zapis wykonany; 1 cloud / 1 final identyczna -> no-op; wznowienie z częściowego draftu nie usuwa ćwiczeń planu.

## Zakres sprawdzeń i ograniczenia

### W5 / P2 — eksport CSV gubi wynik serii czasowej/dystansowej/asystowanej

`src/lib/workout-csv.ts` eksportuje reps/weight oraz czas CAŁEGO treningu, ale nie durationSec/distanceM/assistWeight serii. Plank 60 s zamienia się w wiersz z samymi zerami. Plan: dopisać na końcu trzy jawne kolumny (set_duration_sec, distance_m, assist_weight_kg), zachowując kolejność i jednostki obecnych kolumn. Test wyniku i nazw PL/EN z różnymi typami oraz braków opcjonalnych. Własny CSV jest eksportem analitycznym, aplikacja nie ma importera tego formatu; pełny powrót danych realizuje backup JSON v3.

### W6 / P1 — import Strong/Hevy omija zgodę i sidecar health

`useFirebaseWorkouts.ts:577-609` zapisuje CSV bezpośrednio w workouts; `workout-import/mapper.ts` niesie osadzone RPE. Aktualne rules NIE iterują po ćwiczeniach, więc ten zapis może przejść także bez zgody health. To naruszenie granicy danych (początkowa hipoteza PERMISSION_DENIED została odrzucona po odczycie rules). Plan: pełny preflight wsadu przed pierwszą mutacją, wydzielenie health przez istniejący backup v3 i atomowy restore callable; bez zgody zwrócić czytelny komunikat o RPE i ustawieniach, zachować plik i nie zapisać częściowo. Test Strong/Hevy z RPE, bez RPE, ze zgodą/bez zgody, błąd po pierwszym workoutcie, brak bezpośrednich zapisów oraz zmiana konta podczas importu.

### W7 / P1 — dokumenty CSV kolidują między użytkownikami

`workout-import/mapper.ts:154` identyfikator `imported-${batchId}-${n}` zależy wyłącznie od pliku, a kolekcja workouts jest wspólna. Drugi użytkownik importujący ten sam plik dostaje kolizję z cudzym dokumentem. Plan: namespace UID w identyfikatorze nowych sesji; idempotencja dla tego samego UID/pliku; obsługa istniejących legacy importów przez odczyt własnych wpisów batchId, bez ich nadpisania ani tworzenia duplikatów. Nowy import używa restore v3, które chroni istniejący dokument przed nadpisaniem. Test dwóch kont, retry i istniejącego legacy importu.

### W8 / P2 — legalna wieloliniowa notatka CSV rozbija rekord

`workout-import/parser.ts` rozdziela tekst na fizyczne linie, zanim przetworzy cudzysłowy CSV. Nowa linia wewnątrz cytowanej notatki Strong/Hevy ucina notatkę i późniejsze pola (w tym RPE); dalszą część traktuje jako osobny uszkodzony wiersz. Plan: iterować po logicznych rekordach CSV, z obsługą CRLF/LF, escaped quotes i końcowego niedomkniętego rekordu. Test obu formatów i zachowania notatki, RPE oraz kolejnych poprawnych rekordów.

### W9 / P2 — historia importów i mock Undo nie mają właściciela

`workout-import/batch.ts` przechowuje nazwy plików pod globalnym kluczem. Po zmianie konta wizard pokazuje historię poprzedniej osoby. Mock Undo usuwa wszystkie treningi o batchId, niezależnie od userId; produkcyjny callback nie sprawdza zmiany konta po oczekującym odczycie. Plan: obowiązkowy UID w API historii, izolowane klucze v2, brak automatycznego przypisania starej historii bez informacji o właścicielu (pozostaje nietknięta). UI zamyka i resetuje import po zmianie UID; wyniki starych awaitów nie aktualizują nowej sesji. Undo sprawdza właściciela danych i bieżącą tożsamość przed mutacją. Test A→B→A, brak adopcji legacy nazw, owner-only Undo i zmiana konta po odczycie.

Przeczytano przepływy: hydratacja/start/finish/edit WorkoutDay, generowanie snapshotu, silnik syncu i kolejka referencyjna, retry/markery/promocja/fallback IndexedDB, podstawowy kontroler timera oraz systemowe powiadomienia.

W1–W9 zostały naprawione po potwierdzeniu czerwonymi regresjami. W1–W4: 11 RED -> 65 GREEN w 4 test suites. W6/W7: 8 nowych RED -> 35 GREEN w mapper/restore. W5: 1 RED -> green eksport wartości/nazw. W8/W9: 9 RED -> 65 GREEN w 5 suites import/export. Łączny pakiet przed ostatnimi W8/W9: 136 GREEN w 11 suites; główne repo checki i e2e prowadzi agent nadrzędny.

Końcowa walidacja po W8/W9: **145/145 testów w 12 suites**, targeted ESLint dla wszystkich zmienionych plików tego strumienia bez ostrzeżeń i błędów. Nie rozszerzano uprawnień natywnych w tym strumieniu; NAT-05 jest oddzielną zmianą agenta native.

Zmiany nie dotykały kont produkcyjnych, wdrożeń ani wersji aplikacji. Dla lifecycle/timerów nadal wymagany rzeczywisty background/resume z urządzeniem; test jsdom nie potwierdza dźwięku ani dostarczenia notyfikacji przy suspendzie. W8/W9 zamykają discovery tego strumienia; następny etap to ograniczony adversarial review poprawek drugiego agenta.

Istotna zgodność migracyjna: globalna historia importów v1 nie zawiera UID, więc jej nazw plików nie przypisujemy automatycznie nowemu kontu. Stary klucz i istniejące treningi pozostają nietknięte. Ponowny import tego samego pliku odtworzy wpis historii dla bieżącego konta bez duplikowania jego legacy sesji.
