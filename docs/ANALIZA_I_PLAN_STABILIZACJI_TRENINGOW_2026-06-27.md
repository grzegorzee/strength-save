# Analiza i plan stabilizacji treningów — 2026-06-27

## Cel

Ustabilizować zapis i statystyki treningów przed wpuszczeniem kolejnych osób.
Analiza dotyczy konta `g.jasionowicz@gmail.com` i została wykonana na
produkcyjnym projekcie Firebase `fittracker-workouts` w trybie tylko do odczytu.

Podejście jest zgodne z zasadami Karpathy:

- najpierw dowód i odtworzenie przepływu danych;
- osobne traktowanie naprawy kodu, naprawy istniejących danych i release'u;
- najmniejsza zmiana usuwająca potwierdzoną przyczynę;
- każde działanie ma mierzalne kryterium akceptacji.

## Wniosek wykonawczy

Komunikat „Ustabilizuj realizację planu” jest fałszywy. Nie wynika z opuszczania
treningów, tylko z dwóch defektów danych:

1. sześć ukończonych treningów od 16 czerwca nie ma `cycleId`, więc statystyki
   aktywnego cyklu ich nie liczą;
2. trening z 19 czerwca ma w chmurze 13 zaliczonych serii, ale nadal
   `completed=false`.

W efekcie aplikacja widzi 9 zaliczonych sesji zamiast 16. Stary build liczył
całe cztery tygodnie jako 16 oczekiwanych sesji, stąd dokładnie:

`9 / 16 = 56%` oraz `16 - 9 = 7 opuszczonych`.

## Dowody z produkcji

Aktywny plan:

- start: `2026-06-01`;
- długość: 12 tygodni;
- dni: poniedziałek, wtorek, czwartek, piątek;
- aktywny cykl: `otL65epGl1lQ9eyKIZrO`.

Sesje błędnie nieprzypisane do cyklu:

| Data | Dzień | Stan chmury | Problem |
|---|---|---:|---|
| 2026-06-16 | day-2 | completed | brak `cycleId` |
| 2026-06-18 | day-3 | completed | brak `cycleId` |
| 2026-06-22 | day-1 | completed | brak `cycleId` |
| 2026-06-23 | day-2 | completed | brak `cycleId` |
| 2026-06-25 | day-3 | completed | brak `cycleId` |
| 2026-06-26 | day-4 | completed | brak `cycleId` |

Dodatkowa sesja:

| Data | Dzień | Stan chmury | Dane |
|---|---|---:|---|
| 2026-06-19 | day-4 | `completed=false` | 5 ćwiczeń, 13 zaliczonych serii, poprawny `cycleId` |

Po prawidłowym przypisaniu sześciu sesji i bezpiecznym domknięciu 19 czerwca
wynik bieżącego cyklu powinien wynosić `16/16`, czyli `100%` i `0`
opuszczonych treningów na koniec 26 czerwca.

## Potwierdzone przyczyny

### P0. Start treningu wyprzedza załadowanie planu i cyklu

`WorkoutDay` czeka przed autostartem tylko na `isLoaded` z listy treningów.
Nie czeka na:

- `isLoaded` z `useTrainingPlan`;
- `isLoaded` z `usePlanCycles`;
- ostateczny snapshot aktywnego cyklu.

Skutki:

- `getActiveCycle()` może zwrócić `null`, a sesja zostaje trwale utworzona bez
  `cycleId`;
- strona może rozpocząć trening na domyślnym planie, zanim wczyta się plan
  użytkownika.

Ścieżki: `src/pages/WorkoutDay.tsx`, `src/hooks/useTrainingPlan.ts`,
`src/hooks/usePlanCycles.ts`.

### P0. Mieszanie ćwiczeń planu domyślnego z właściwym planem

Pięć sesji ma zapisane po siedem pustych ćwiczeń domyślnego planu bez nazw,
a następnie ćwiczenia właściwego planu:

| Data | Oczekiwana liczba ćwiczeń | Zapisana liczba | Puste obce wpisy |
|---|---:|---:|---:|
| 2026-06-16 | 5 | 12 | 7 |
| 2026-06-18 | 7 | 14 | 7 |
| 2026-06-22 | 6 | 10 | 7 |
| 2026-06-23 | 5 | 10 | 7 |
| 2026-06-25 | 7 | 14 | 7 |

To wyjaśnia podsumowanie z 14 ćwiczeniami, gdzie pierwsze pozycje mają `0/4`,
a dalsze pozycje są wykonane. Poprzednia poprawka blokująca cross-day fallback
nie usuwa tego wyścigu inicjalizacji.

### P0. Stary trening utknął pomiędzy draftem lokalnym i chmurą

Telemetria 19 czerwca pokazuje:

- 2 przejścia do `final_sync_pending`;
- 2 wpisy do kolejki;
- 4 ręczne próby ponowienia;
- 5 odzyskań draftu.

Chmura nadal ma `completed=false`. Aktualny Sync Center ponawia zapis z
`expectedRevision`, ale dla starego draftu brak lub nieaktualna rewizja prowadzi
do `WORKOUT_CONFLICT`. Sync Center nie oferuje rozwiązania konfliktu, więc samo
„Ponów” może powtarzać ten sam błąd bez końca.

Ścieżki: `src/components/SyncCenterCard.tsx`,
`src/components/AutoSyncOnReconnect.tsx`,
`src/lib/sync-center-payload.ts`, `src/lib/workout-final-sync.ts`.

### P1. Algorytm rekomendacji myli błąd integralności z zachowaniem użytkownika

`buildCycleRecommendation()` pokazuje ostrzeżenie po pierwszym tygodniu, jeśli
`completionRate < 60`. Nie sprawdza wcześniej:

- treningów ukończonych bez `cycleId`;
- lokalnych sesji oczekujących na finalizację;
- konfliktów synchronizacji;
- niespójności `completed` względem zapisanych serii.

W takiej sytuacji aplikacja powinna najpierw pokazać problem danych, a nie
zalecenie treningowe.

### P1. Fałszywy sezon 0%

W produkcji istnieje zakończony cykl `lkjSbPbc3suvlhEBtFYK`:

- zakres `2026-05-25`–`2026-05-29`;
- 0 treningów;
- 0% frekwencji;
- nakłada się na końcówkę wcześniejszego cyklu.

To jest pozycja „Sezon ukończony — 0%” ze zrzutu. Pusty techniczny cykl nie
powinien trafiać na półkę medali.

### P1. Telemetria zapisuje liczniki pod literalnymi nazwami z kropką

Dokumenty mają pola typu `counters.sync_failure`, a panel administracyjny
oczekuje mapy `counters`. Przez to istniejące błędy synchronizacji nie są
widoczne w agregacie administracyjnym.

Ścieżka: `src/lib/app-telemetry.ts`.

## Plan naprawy krok po kroku

### Faza 0 — zabezpieczenie danych

1. Wykonać eksport dokumentów konta: `training_plans`, `plan_cycles`,
   `workouts`, `app_telemetry_daily`.
2. Na urządzeniu wyeksportować lub sfotografować pełną zawartość Sync Center,
   w tym `sessionId`, datę i `lastError` starego draftu.
3. Zapisać checksum eksportu i nie wykonywać testowych zapisów na tym koncie.

Kryterium: istnieje możliwy do odtworzenia snapshot chmury i dowód stanu
lokalnego sprzed migracji.

### Faza 1 — jednorazowa naprawa konta

1. Dopisać aktywny `cycleId=otL65epGl1lQ9eyKIZrO` do sześciu ukończonych sesji
   z 16, 18, 22, 23, 25 i 26 czerwca.
2. Porównać lokalny draft 19 czerwca z dokumentem chmurowym.
3. Jeżeli lokalny draft jest pełniejszy, zapisać go jako wersję rozstrzygającą;
   w przeciwnym razie zachować dane chmurowe. Dopiero potem ustawić
   `completed=true`, `completedAt`, `durationSec` i podbić `revision`.
4. Z pięciu zanieczyszczonych sesji usunąć wyłącznie siedem wpisów `ex-*`,
   które jednocześnie nie mają nazwy, zaliczonych serii, notatek ani metryk.
5. Po backupie usunąć albo oznaczyć jako techniczny pusty cykl
   `lkjSbPbc3suvlhEBtFYK`.
6. Po potwierdzeniu identycznej treści w chmurze usunąć z urządzenia wyłącznie
   odpowiadające jej stare wpisy draftu/kolejki.

Kryteria:

- aktywny cykl pokazuje 16/16, 100%, 0 opuszczonych;
- 19 czerwca jest ukończony i otwiera poprawne serie;
- sesje mają odpowiednio 5/7/6/5/7 ćwiczeń;
- znika pusty sezon 0%;
- Sync Center nie pokazuje starego treningu.

### Faza 2 — usunięcie wyścigu startowego w kodzie

1. W `WorkoutDay` pobrać osobno `workoutsLoaded`, `planLoaded` i `cyclesLoaded`.
2. Zablokować autostart i przycisk startu do czasu załadowania wszystkich trzech
   źródeł oraz draftu.
3. Utworzyć jeden snapshot startowy: `day`, `activeCycleId`, ćwiczenia i data.
4. Nie pozwolić utworzyć sesji bez `cycleId`, jeżeli aktywny plan ma aktywny
   cykl, ale listener cykli jeszcze nie odpowiedział.
5. Przy znalezieniu istniejącej sesji bez `cycleId` bezpiecznie dopisać cykl,
   jeżeli dokładnie jeden cykl pasuje do daty.
6. Finalizacja ma ponownie walidować, że sesja ma oczekiwany `cycleId`.

Testy regresyjne:

- workouts ładuje się przed planem;
- plan ładuje się przed cyklami;
- cykle ładują się przed workouts;
- autostart z Dashboardu i start z Watch;
- start offline przed/po załadowaniu listenerów;
- w każdej permutacji sesja ma tylko ćwiczenia właściwego dnia i poprawny
  `cycleId`.

### Faza 3 — domknięcie Sync Center

1. Rozróżnić błędy: offline, brak dokumentu, konflikt rewizji, niepełna
   walidacja i błąd uprawnień.
2. Dla starego draftu bez `cloudRevision` najpierw pobrać aktualny dokument
   serwera; nie wysyłać w ciemno `expectedRevision=0`.
3. Dla konfliktu pokazać dwie jawne akcje: „zachowaj lokalny trening” oraz
   „zachowaj wersję z chmury”, z porównaniem liczby ćwiczeń i zaliczonych serii.
4. Nie ponawiać automatycznie konfliktu bez zmiany precondition.
5. Po udanym zapisie potwierdzić treść z serwera, a dopiero później skasować
   draft i kolejkę.
6. Pokazać datę i kod ostatniego błędu bezpośrednio na Dashboardzie/Sync Center.

Test obowiązkowy: zdalny trening `revision=14`, lokalny ukończony draft ze starą
rewizją, ręczne wybranie lokalnej wersji, reload i brak ponownego pojawienia się
draftu.

### Faza 4 — odporne statystyki i rekomendacje

1. Liczyć frekwencję względem konkretnych slotów kalendarza, nie wyłącznie przez
   `liczba treningów / liczba oczekiwanych`.
2. Wykrywać osierocone treningi w zakresie aktywnego cyklu.
3. Jeżeli istnieje osierocony lub pending-final trening, nie pokazywać
   „Ustabilizuj plan”; pokazać neutralne „Statystyki wymagają synchronizacji”.
4. Ograniczyć frekwencję do 100% i zabezpieczyć się przed duplikatami.
5. Nie publikować ukończonego sezonu z 0 treningów, chyba że użytkownik jawnie
   go zachował.

Kryteria:

- brak `cycleId` nie zamienia automatycznie obecności w nieobecność;
- przyszłe dni nie są liczone;
- duplikat nie podnosi frekwencji;
- problem synchronizacji ma komunikat techniczny, nie coachingowy.

### Faza 5 — obserwowalność i bezpieczna migracja

1. Zapisywać telemetrię jako prawdziwą mapę `counters`.
2. Dodać metryki: orphan workout, final sync age, revision conflict,
   mixed-plan exercise set.
3. Dodać idempotentne narzędzie administracyjne „audit → preview → apply” do
   naprawy powiązań cyklu i pustych ćwiczeń.
4. Narzędzie musi przed zapisem wypisać dokładne dokumenty i zmiany oraz
   utworzyć backup.

### Faza 6 — release gate

1. Pełne `typecheck`, `lint`, testy, build web/mobile, emulator Rules i E2E.
2. Test na fizycznym iPhonie: online, słaby zasięg, ekran zgaszony, resume,
   finalizacja, ponowny start aplikacji.
3. Test na Watch: start, serie offline, powrót telefonu, finish i ACK.
4. Test konta produkcyjnego dopiero po snapshotach i migracji.
5. Wpuścić następną osobę dopiero po dwóch kolejnych treningach właściciela bez
   orphanów, pending sync i mieszania ćwiczeń.

## Feature flag timerów

Timer został pozostawiony w kodzie, ale domyślnie wyłączony globalną flagą:

`VITE_FEATURE_WORKOUT_TIMERS=false`

Flaga wyłącza:

- automatyczny timer odpoczynku;
- timery EMOM/AMRAP;
- timer rozgrzewki;
- ustawienia timera i jego dźwięku;
- timer odpoczynku na Apple Watch.

Pomiar czasu całej sesji pozostaje aktywny, ponieważ jest daną podsumowania, a
nie interaktywnym timerem odpoczynku.

## Warunek „gotowe”

Nie uznawać problemu za zamknięty po samym zniknięciu bannera. Gotowe oznacza
jednocześnie:

- poprawione dane historyczne;
- usunięty wyścig inicjalizacji;
- rozwiązywalny konflikt Sync Center;
- 0 fałszywie opuszczonych sesji;
- brak mieszania planów;
- zielone bramki automatyczne i dwa rzeczywiste treningi bez regresji.
