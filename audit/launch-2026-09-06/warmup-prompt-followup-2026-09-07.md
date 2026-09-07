# Propozycja rozgrzewki — follow-up 2026-09-07

Zakres: brak propozycji na świeżej sesji, wznowienie i preferencja użytkownika.
Generator i powtarzające się ruchy naprawia osobno agent workout. Nie zmieniano
numerów wersji, backendu, natywnych źródeł ani danych prawdziwych kont.

## Potwierdzone przyczyny i naprawy

1. **Świeży trening z planu na Dashboardzie pomijał propozycję.** Główny przycisk
   prowadzi do `?autostart=true`; `shouldOfferPreStartWarmup` odrzucał wszystkie
   takie starty poza ad-hoc. Start na telefonie był nierozróżnialny od zegarka.
   Bramka rozpoznaje teraz rzeczywisty Watch start przez `watchEventId` lub
   `quickExercise`. Telefon proponuje rozgrzewkę dla planu i ad-hoc. Dialog
   otwiera się po trwałym utworzeniu nowego draftu, wewnątrz gałęzi nowej sesji;
   błąd zapisu, istniejąca sesja i adopcja żywego draftu nie otwierają go później.
2. **Sama odhaczona rozgrzewka nie chroniła draftu przed ponownym startem.**
   `draftHasLiveContent` uwzględniał serie, notatki i pominięcia, ale nie
   `warmupChecked`. Przy pustym szybkim treningu cold autostart mógł wybrać
   `start`, a brak adopcji zerował fazy. Odhaczone pozycje są teraz treścią
   żywego draftu; cold resume wybiera `resume`, bez zerowania istniejących kluczy.
3. **Globalne wyłączenie mogło przejść z konta A na konto B.** Cache miał jeden
   klucz, a brak pola w profilu pozostawiał go nietkniętym. Dodano właściciela
   i lokalny zapis per UID. B bez preferencji dostaje domyślne włączenie, powrót
   do A zachowuje jego jawne wyłączenie. Osobny efekt w `PreferenceSync` zmienia
   właściciela już podczas ładowania profilu i stosuje wartość chmurową wyłącznie
   z profilu o zgodnym UID. Reszta synchronizacji preferencji pozostała bez zmian.

Legacy cache bez znanego właściciela nie jest automatycznie przypisywany kontu.
Jawne `preferences.warmupPrompt=false` zgodnego profilu oraz wyłączenie zapisane
dla danego UID pozostają respektowane. Brak preferencji tego konta oznacza on.
Nie zapisuje się domyślnych wartości do chmury w ramach tej migracji.

## Dowody

- `warmup-prompt-followup-red.log`: 3 RED / 31 PASS (planned autostart i draft
  z samą rozgrzewką); `warmup-planned-cta-red.log`: rzeczywiste kliknięcie
  Dashboard CTA kończyło się brakiem `prestart-sheet`.
- `warmup-owner-cache-red.log`: 2 RED / 4 PASS. Sekwencja A.off → auth B ze
  spóźnionym profilem A → profil B bez pola ujawniała dziedziczenie off.
- `warmup-prompt-unit-final.log`: **69/69 PASS**, 7 plików. Obejmuje bramkę,
  autostart, konto/preferencje, pozostałe preferencje oraz istniejący dialog.
- `warmup-owner-cache-green.log`: także regresje Profilu — **75 PASS / 9
  wcześniejszych skip**, 3 pliki (wyniki częściowo pokrywają powyższy zestaw).
- `warmup-prompt-typecheck-final.log` i `warmup-prompt-lint-final.log`: PASS;
  celowany `git diff --check`: PASS.
- Pierwszy Chromium checkpoint przed owner cache: `warmup-prompt-e2e-chromium.log`,
  **11/11 PASS**. Końcowy checkpoint po wszystkich zmianach:
  `warmup-prompt-e2e-chromium-final-2.log`, **12/12 PASS (1.1 min)**, dwa specy.
  Obejmuje planned Dashboard CTA → skip → cold resume → nowa sesja oraz
  ad-hoc → sama rozgrzewka → cold resume z zachowaniem odhaczeń.
- Screenshot rzeczywistej propozycji po planned CTA:
  `warmup-followup-shots/chromium-planned-prompt.png`, dane syntetyczne.

Przejściowy bieg E2E wymagał poprawy dwóch nowych fixtures: checkbox jest samym
elementem `warmup-item`, nie jego dzieckiem; nawigacja zmieniająca tylko hash
nie jest cold restartem i wymaga zaczekania na odmontowanie poprzedniego ekranu.
Końcowe scenariusze jawnie czekają na wyjście z sesji i robią `page.reload()`.
Nie zmieniano produktu, aby dopasować go do tych błędnych kroków testu.

## Niezmienniki i granice

- Pomiń dziś nie wyłącza następnej sesji; resume nie ponawia propozycji.
- Jawne wyłączenie w Profilu i „Nie proponuj więcej” nadal działa; ręczny płomyk
  pozostaje dostępny. Watch autostart nadal nie uruchamia dialogu na telefonie.
- Nowa sesja nie dziedziczy odhaczeń; wznowiona zachowuje także legacy klucze.
- Brak nowego popupu w połowie treningu, background joba, zmiany timerów lub
  migracji/usuwania zapisanych treningów.
- Test cold reload w Chromium weryfikuje odbudowę z trwałych warstw przeglądarki;
  nie jest dowodem fizycznego suspend/resume telefonu. Root prowadzi końcowe
  pełne QA obu silników i native build po source freeze.

Zmodyfikowane źródła: końcowy interfejs/bramka `src/lib/prestart-warmup.ts`,
`src/lib/workout-autostart.ts`, `src/lib/warmup-prompt.ts`, wyłącznie warmup effect
w `src/components/PreferenceSync.tsx`, lokalny blok autostart/start
w `src/pages/WorkoutDay.tsx`. Bezpośrednie testy: `prestart-warmup.test.ts`,
`workout-autostart.test.ts`, `preference-sync-warmup-prompt.test.tsx` i
`e2e/warmup-prompt-preference.spec.ts`. Źródła zamrożone; dalsze zmiany tylko
w dowodach/test fixtures. Pozostałe E2E wymagają jawnego pominięcia nowej propozycji
przy fresh planned start; globalnego wyłączenia w seedzie nie dodano.

## Końcowy WebKit failure — potwierdzona korekta fixture

Pełna macierz root: 659/660 PASS. Jedyny failure dotyczył testu nowej sesji
w `warmup-persistence.spec.ts`: po `/plan` → sleep250ms → raw clear IDB/LS → reload
ekran pokazywał już aktywną sesję (czas00:13 i płomyk), więc nie istniał przycisk
Start/Continue. Ten cleanup omijał mechanizm świadomego discardu i nie czekał
na zakończenie zapisów JS aplikacji.

Mechanizm odtworzono deterministycznie na świeżym Vite: testowy gate zatrzymał
rzeczywisty `workoutDraftDb.saveActiveDraft` wywołany po opuszczeniu sesji.
Raw clear i natychmiastowy odczyt IDB dawały `null`. Zwolnienie zaległego zapisu
odtworzyło ten sam provisional draft z `warmupChecked=['warmup.v3.cardioEasy']`,
więc druga asercja `null` zakończyła się RED. Dowody:
`warmup-cleanup-delayed-flush-red.log` i archiwalny fragment próby
`warmup-cleanup-delayed-flush-probe.ts.txt`. Oryginalny bieg pełnej macierzy nie
instrumentował momentu zapisu; kontrolowana próba potwierdza mechanizm wyścigu,
a nie przypisuje nieobserwowanego czasu konkretnemu callbackowi z tego biegu.

Poprawka dotyka tylko istniejącego testu. Przed cleanupem wykonuje pełną nawigację
do pustego dokumentu HTML tego samego origin, dostarczonego przez `page.route`.
Dokument nie uruchamia aplikacji ani jej callbacków, lecz test zachowuje dostęp
do IDB/localStorage. Potem usuwa szkic, wymaga `IDB=null` i uruchamia aplikację
od nowa. Nie ma sleep250ms. Nowa sesja wymaga dokładnego CTA „Rozpocznij trening”
i jawnego pominięcia propozycji; końcowe `warmup0` pozostaje. Normalny draft nie
ma akcji discard w UI (jest ona dostępna dla błędu/final-sync-pending), dlatego
test nie wytwarza sztucznego błędu aplikacji tylko po to, aby uzyskać tę kontrolkę.

Cały spec po zmianie: **6/6 PASS — Chromium3 i WebKit3**, 22.8s, w tym istniejące
przypadki zachowania odhaczeń. Log: `warmup-cleanup-both-engines-green.log`.
Celowany ESLint i diff-check PASS. Testowy gate usunięto ze speca; produkcyjne
źródła pozostały zamrożone. Root wykonuje ponownie pełny WebKit.

## Finalne domknięcie koordynatora — 7 IX

Pełny WebKit po naprawie fixture i skróceniu pierwszego opisu: **330/330 PASS**,
`final-e2e-webkit.log` (6,8 min). Pełny Chromium już wcześniej przeszedł 330/330
w `final-e2e.log`; historyczny pojedynczy RED WebKit zachowano.

Ten sam helper `clearWorkoutDraftAfterAppUnload` w `e2e/helpers.ts` obsługuje
teraz oryginalny test persistence i dwa analogiczne przygotowania nowej sesji
w testach preferencji. Usunięto oba arbitralne 250 ms. Zwykłe testy wznowienia
nadal zachowują szkic. Kontrolka „Nie proponuj więcej”, przełącznik Profilu,
nowy start, nowa rozgrzewka 0 i cold resume z odhaczeniami nadal mają asercje.
Po ekstrakcji helpera oba pełne specy przeszły **24/24** w Chromium i WebKit
(`final-warmup-e2e.log`, 1,1 min); lint PASS. Bez zmiany produkcyjnego autozapisu.

Pierwszorazowy opis jest teraz krótszy w PL/EN, a czas rozgrzewki pojawia się
tylko w dynamicznym opisie zestawu. Po tej końcowej zmianie copy: **69/69**
unit PASS (`final-warmup-copy-tests.log`); pełne 4084 PASS poprzedzało wyłącznie
tę edycję dwóch tekstów. Końcowe screenshoty `warmup-followup-shots/` odświeżone
i obejrzane. Buildy i granice fizycznego QA są w głównym raporcie.
