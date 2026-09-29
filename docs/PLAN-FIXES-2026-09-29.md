# Plan poprawek 2026-09-29 (zgłoszenia właściciela po treningach 22-28.09)

Diagnoza tylko do odczytu: kod na main 23c7ce59 + produkcja (konto właściciela
uid `U6GDdfg7GmP1k1xJuISIsK9uSUE2`, Firestore i logi Functions, bez zapisów).
Stan sklepów w dniu diagnozy: iOS 150 zatwierdzony (publikacja MANUAL),
Google Play produkcja = 54 (`completed`), internal = 55.

## F1. Chip „Rozgrzewka” łamie się („Rozgrzewk / a”)

- Root cause: `src/components/ExerciseCard.tsx:1478` siatka chipów
  `minmax(min(100%,6rem),1fr)`; rem nie rośnie z Dynamic Type (iOS skaluje body),
  plus `[overflow-wrap:anywhere]` w `chipClass` (:81). Przy 390/393 px i 112%
  trzy chipy (Rozgrzewka, Talerze, Metryki przy zgodzie zdrowotnej) mają po 75 px
  na tekst, słowo potrzebuje 79 px.
- Fix: `minmax(min(100%,8em),1fr)` (przy 100% bez zmian = 96 px).
- Test: e2e chipów 320/375/393/430 px × 100/112/135%, Range.getClientRects = 1 linia
  (dziś czerwony przy 393/112). Dopisać warunek do `label-overflow-audit.spec.ts`.
- Urządzenie: potwierdzić na iPhonie przy 112% i 135%.

## F2. Urlop: pushe „idź na trening” i widok treningu w trakcie przerwy

- Dane: urlop 22-27.09; `dailyTrainingReminder` wysłał 22, 23, 25.09 (3 tokeny).
- Root cause: `functions/src/daily-reminder.ts:127` guard bez `vacation`
  (loader :226-243 nie przepisuje pola). Klient: `Dashboard.tsx:349-411`
  (`todayTraining`, `getNextScheduledTraining`, `weekCardModel`) i
  `TrainingPlan.tsx:464-468` ignorują urlop.
- Niezmiennik: dzień w `[vacation.startDate, vacation.endDate]` nie jest dniem
  treningowym nigdzie (push, hero, WeekCard, „następny”).
- Fix: jeden resolver `isPlannedDateBlocked(date, {vacation, skippedDates})`
  współdzielony klient/functions; stan Dashboardu `vacation` z kartą „Przerwa do …”.
- Wdrożenie: backend-first (functions), potem klient.

## F3. Deload po urlopie nie trafia do prefillu

- Dane: push 27.09 „~85%, potem ~92%”; 28.09 prefill 40 kg (skos hantle,
  poprzednio 40x8), powinno ~34 kg.
- Root cause: rampa urlopowa (`reduced-mode.ts:75-95`) trafia tylko do `nextAdvice`;
  prefill (`WorkoutDay.tsx:1763-1770`) bierze `weeklyTargets`, które znają deload
  wyłącznie z `deloadDecisions` (`progression-engine.ts:385`). `ExerciseCard.tsx:672-705`
  przykrywa poradę targetem. `DeloadBanner.tsx:47` używa `isDeloadWeek` (bez urlopu),
  WeekCard `resolveDeloadWeek` (z urlopem).
- Niezmiennik: to, co obiecuje komunikat, wpisuje prefill. Jedna funkcja decyzyjna.
- Fix: okno urlopu/trybu do `computeWeeklyTargets`; faza active/ramp daje target
  `baseline × factor`, kind `deload`, pierwszeństwo przed progress. Baner na
  `resolveDeloadWeek`.

## F4. Zamiana ćwiczenia w trakcie treningu

- Dane: sesja 28.09 d1, zamiana „Na stałe” na pozycji 3; w sesji nowe ćwiczenie
  na końcu, stare (`tpl-ex-13`) w `skippedExercises`. Plan poprawny. Dane całe.
- Root cause: `WorkoutDay.tsx:587-588` gałąź „Na stałe” zmienia tylko plan, draft
  zostaje ze starym kluczem; `workout-day-view.ts:40-77` wrzuca go do extras
  (koniec, stara nazwa). Payload (`workout-sync-engine.ts:146-155`,
  `workout-final-sync.ts:114`) sortuje po kolejności kluczy draftu, więc także
  „tylko dziś” zapisuje nowe na końcu historii.
- Fix: gałąź „Na stałe” najpierw migruje sesję jak „tylko dziś” (serie, notatki,
  `sessionSwaps`), potem zmienia plan; `buildDayFromDraft` stosuje `sessionSwaps`
  i odwrotne dopasowanie `${key}__swap-*`; payload w kolejności dnia, extras na końcu.
  Stare ćwiczenie z odhaczonymi seriami nie znika (zasada 6).
- Testy: niezmiennik 6 ćwiczeń + pozycja, payload w kolejności planu (oba zakresy),
  sekwencja start → zamiana → wyjście → powrót → dokończenie → sync, podwójny swap.

## F5. Licznik „270 aktywności / 176 cardio”

- Dane: 176 = Strava 169 (Run 116, Hike 42, Walk 6, Swim 2, Rowing 2, Yoga 1;
  od 2025-04-04) + ręczne 7 (Swim). Siłowe 94 od 2026-01-26. Duplikatów 0.
  116 z 169 aktywności Stravy jest sprzed pierwszego treningu w apce.
- Werdykt: liczby poprawne, brak wyjaśnienia i miks okresów. Strava importuje
  365 dni wstecz od pierwszego połączenia (`functions/src/index.ts:1011-1110`).
- Fix UI: rozbicie na źródła, „od {data}”, przypis o imporcie, ostatnia synchronizacja.
- Decyzja właściciela: A (liczyć od pierwszego treningu w apce: 154) albo B (całość z „od …”).
- F5b: `stravaLastSync` = 2026-08-22, ostatni import 2026-08-16. Sync prawdopodobnie
  nie działa od ~5 tygodni: przeczytać logi funkcji i naprawić osobno.

## F6. Ćwiczenia z masą ciała (podciąganie itd.)

- Root cause: Podciąganie (`exerciseLibrary.ts:32`) = `weight_reps`, zaliczenie wymaga
  `weight > 0` (`set-tracking.ts:65`). Właściciel wpisuje masę ciała (74/72 kg),
  co zawyża tonaż, PR/1RM i daje progresję „+2,5 kg”. Ćwiczenia `isBodyweight`
  nie mają pola kg, choć w historii są dociążenia (Reverse Crunch 12,5-15, Ab Rollout 25-45).
  `Dipy na maszynie` (:272) to `weight_reps` zamiast `assisted_bodyweight`.
  `progression-engine.ts:402` gubi `assisted_bodyweight` bez `trackingByName`.
  `selectLatestMeasurement` może zwrócić pomiar bez wagi.
- Model: nowy typ `bodyweight_loaded` (pole „+kg” opcjonalne, `weight` = dociążenie,
  zaliczenie przy reps > 0, etykieta „MC” / „MC +10 kg”); progresja najpierw
  powtórzenia, potem dociążenie. Lista ~35 ćwiczeń do przestawienia w raporcie
  diagnozy (tabela w odpowiedzi 2026-09-29).
- Migracja bez zapisów: normalizacja przy odczycie (weight ≈ masa ciała ±3 kg =
  dociążenie 0). Watch/Garmin muszą znać nowy typ.
- Decyzje właściciela: tonaż klasyczny bez zmian vs tonaż efektywny; co oznaczały
  25-45 kg w Ab Rollout.

## Kolejność

0. Baseline: restart vite (na 8080 wisi stary serwer), pełny suite na czystym main.
1. Fala A (przed premierą, build iOS 151 / Android 56): F1, F4, F2, F3, F5 UI, F5b.
2. Fala B (osobno, większa zmiana modelu danych + zegarki): F6.
3. Każda pozycja: test czerwony → fix → osobny commit; wpis w DECYZJE.md.
4. Bramki z CLAUDE.md, konto QA, scenariusze urządzeniowe: urlop (brak pushy),
   pierwszy trening po urlopie (prefill 85%), zamiana w trakcie + powrót, Dynamic Type 112/135%.
5. Wydanie: functions → web → iOS 151 (TestFlight, App Review jako aktualizacja)
   → Android 56 produkcja.

## F7. Plank (i pompki z podłogi) w planach dla początkujących

- Zgłoszenie właściciela: początkujący z dużą masą ciała (np. 150 kg) nie zrobi planka;
  nie ma sensu proponować go na start. Przykład z produkcji: użytkowniczka dostała
  plank w FBW (`tpl-fullbody-2` „Iron Foundation”, level beginner, dzień A).
- Stan: plank w szablonach beginner w `src/data/planTemplates.ts` (linie ~125, 459,
  750, 761, 772, 795), pompki z podłogi w beginner (~749, 760, 771).
- Reguła: szablony `level: 'beginner'` nie zawierają ćwiczeń, w których ciało jest
  podparte na rękach/przedramionach albo podnoszone masą ciała (plank i warianty,
  pompki z podłogi, podciąganie bez asysty, dipy). Core dla początkujących: w leżeniu
  na plecach lub na maszynie (np. Dead Bug, Reverse Crunch, Modlitewnik na wyciągu);
  klatka: maszyna / hantle na ławce.
- Test: kontrakt na szablonach (żaden beginner nie zawiera ćwiczeń z listy zakazanej).
- Istniejących planów użytkowników NIE zmieniamy (dane usera); nowe plany i ponowny
  wybór szablonu już bez planka. Realizacja w fali planów (po T4/T5).
