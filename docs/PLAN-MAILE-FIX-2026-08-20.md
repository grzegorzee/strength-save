# PLAN J — maile: fix wysyłki zakresów, spójny język, wyślij-z-Historii, CSV (2026-08-20)

> Zgłoszenia właściciela po testach na koncie admin + decyzje podjęte przeze
> mnie tam, gdzie właściciel kazał zdecydować. Tracker pętli agenta (główne
> repo). TDD, stage-per-plik, push po tasku, pętla aż skończysz, przetestujesz
> i WDROŻYSZ. Obowiązują twarde zasady z planów G/H (sekrety poza outputem,
> testy wysyłek TYLKO na g.jasionowicz@gmail.com, zero emoji/AI-slopu,
> rtk psuje npx, i18n do OBU locales, wersje 1.0.0, bez bumpów mobilnych).

## J-T1 — BUG (pilny): "Sending failed" przy wysyłce week/last30

**Root cause (ZDIAGNOZOWANY, nie szukaj od nowa):** `listWorkoutsInRange`
(functions/src/index.ts ~1270) robi `where userId == AND completed == AND
date >= ORDER BY date desc` — wymaga composite indeksu
`workouts(userId ASC, completed ASC, date DESC)`, którego NIE MA w
firestore.indexes.json (są tylko userId+date, userId+importBatchId,
completed+date). Firestore rzuca failed-precondition (missing index),
callable oddaje 'internal', klient pokazuje generyczne
"Sending failed, check your connection".

- [x] Dodać indeks do firestore.indexes.json + `firebase deploy --only
  firestore:indexes` + poczekać aż zbudowany (poll: `gcloud firestore indexes
  composite list --project fittracker-workouts` albo firebase CLI; stan READY).
  DOWÓD: commit e6b65886, deploy OK, poll gcloud (konto g.jasionowicz) —
  workouts(userId ASC, completed ASC, date DESC) stan READY 2026-08-20.
- [x] W callable emailWorkoutHistory/emailWorkoutSummary: try/catch wokół
  odczytów z `logger.error` z detalami (przyszłe diagnozy w minutę, nie przez
  zgadywanie) — bez zmiany kodów błędów dla klienta.
  DOWÓD: commit e6b65886 (getWorkout + listWorkoutsInRange logują i rethrow);
  bonus 154f2705: adapter honoruje beforeDate (baseline PR był bez górnej
  granicy — kontrakt deps i testy czystej logiki już jej wymagały).
- [x] Weryfikacja realna: node script (admin SDK, READ-ONLY) odtwarza dokładnie
  to zapytanie dla uid admina (konto właściciela) — przechodzi bez błędu po
  zbudowaniu indeksu. ŻADNYCH zapisów na realnym koncie.
  DOWÓD: scripts/verify-email-range-index.mjs — RED przed zbudowaniem
  (FAILED_PRECONDITION "query requires an index"), GREEN po READY:
  week OK (4), last30 OK (30), baseline beforeDate OK (81). Zero zapisów.

## J-T2 — akcja "Wyślij ten trening" w wierszu Historii

- [x] W rozwiniętym wierszu treningu w Historii (obok Otwórz/Porównaj/Usuń)
  akcja `Wyślij do trenera` (ikona Mail + tekst) → EmailWorkoutDialog
  mode='workout' z workoutId TEGO wiersza (initialEmail z preferences).
  DOWÓD: commit 53b392f8 (WorkoutHistory.tsx: history-row-email + drugi
  zawsze zamontowany dialog mode='workout').
- [x] i18n OBA locales (reużyj email.sendWorkout jeśli pasuje). E2e: wiersz
  historii ma akcję, klik otwiera dialog bez selektora zakresu.
  DOWÓD: reużyty istniejący klucz email.sendToCoach (PL "Wyślij do trenera" /
  EN "Send to coach", oba locales od H-T1 — zero nowych kluczy); e2e
  email-coach-button.spec.ts 6/6 passed (chromium+webkit), tsc 0, eslint 0.

## J-T3 — mail w 100% jednym języku

**Zgłoszenie:** mail EN miał polskie nazwy ćwiczeń, "Czwartek", "Góra B".

- [x] Functions mają gotowe słowniki digestu: `localizeExerciseNameEn`
  (exercise-name-en.ts) i `localizeFocusEn` (focus-en.ts). Przy lang=en
  email-workout przepuszcza przez nie: nazwy ćwiczeń, dayFocus; dayName typu
  "Czwartek/Poniedziałek..." tłumaczyć słownikiem dni tygodnia (7 wpisów PL→EN
  w email-workout), a custom dayName (np. "Góra B" jako nazwa dnia) przez
  localizeFocusEn — jeśli słownik nie zna, zostaje oryginał (nazwa własna
  usera; NIE wymyślać tłumaczeń). Przy lang=pl nic nie ruszać (kanonicznie PL).
  DOWÓD: commit 885c9383 (localizeEmailWorkout + DAY_NAME_EN; tłumaczenie
  przed detekcją PR, więc sekcje rekordów też EN).
- [x] Test: workout z polskimi nazwami przy lang=en → HTML bez "Czwartek",
  z "Incline Barbell Press"/odpowiednikami ze słownika; nieznana nazwa
  zostaje; lang=pl bez zmian. Data już jest formatowana per język (jest OK).
  DOWÓD: 4 nowe testy w email-workout.test.ts (RED 3 -> GREEN), suite
  50/50 passed, tsc functions 0.

## J-T4 — last30 czytelnie: mail-przegląd (decyzja właściciela 2026-08-20:
BEZ załączników w mailach)

**Problem:** 30 pełnych sekcji treningów w HTML to ściana.
**Decyzja właściciela 2026-08-20:** żadnych załączników CSV w mailach —
last30 dostaje tabelę-przegląd w HTML, week zostaje z pełnymi sekcjami,
a CSV żyje wyłącznie jako klientski eksport w aplikacji (J-T5).
(Pierwotna hybryda przegląd+załącznik była wdrożona i wycofana: RAW MIME,
attachments w SES/Resend i functions/src/workout-csv.ts usunięte bez śladu
martwego kodu.)

- [x] Mail `last30` (i każdy > 7 treningów): zamiast pełnych sekcji per trening
  — nagłówek zbiorczy (jak dotąd) + TABELA-przegląd: wiersz na trening (data,
  dzień, tonaż, czas, serie robocze, liczba PR). Mail `week` (typowo 2-5
  treningów) zostaje z pełnymi sekcjami. BEZ załączników.
  DOWÓD: commit a197c2e6 (HISTORY_FULL_SECTIONS_MAX=7, historyOverviewTableHtml)
  + commit reverta załączników (usunięte: email-mime.ts, workout-csv.ts
  w functions, attachments w transporcie SES/Resend, nota CSV w mailu).
  Testy: email-workout.test.ts 53/53, tsc functions 0.
- [x] Test realny: wysyłka week i last30 na g.jasionowicz@gmail.com BEZ
  załączników (fixtures syntetyczne, nie realne konta) — MessageId do raportu.
  DOWÓD: scripts/send-test-history-email.mjs (SES Simple, jak produkcyjny
  transport); week lang=en (pełne sekcje) MessageId
  010701a01f338efc-228b2eff-fc5f-459c-b53b-46cc33a57141-000000, last30
  lang=pl (8 sesji, tabela-przegląd) MessageId
  010701a01f338fdc-618ff24d-711e-4930-92e3-e100feb1f2dd-000000.

## J-T5 — eksport treningów CSV w aplikacji (doprecyzowanie właściciela
2026-08-20: dialog z wyborem zakresu + 2 punkty wejścia)

**Doprecyzowanie właściciela 2026-08-20:** zamiast jednego przycisku
"eksportuj wszystko" — dialog `ExportWorkoutsDialog` z wyborem zakresu
(chipy: Ostatni tydzień [domyślnie] / Ostatni miesiąc / Ostatnie 10 /
Ostatnie 30 treningów; select cyklu z plan_cycles; własny zakres od-do),
podgląd liczby treningów przed eksportem (Eksportuj disabled przy 0),
dwa punkty wejścia (Historia obok "Wyślij do trenera" + Ustawienia → Dane),
w całości klientsko, plik `strengthsave-treningi-<od>-<do>.csv`.

- [x] Generator CSV klientski (src/lib/workout-csv.ts, funkcje czyste):
  nagłówki EN techniczne wg specyfikacji planu (date..prs), escapowanie,
  UTF-8 z BOM, CRLF; logika zakresów w src/lib/workout-export-range.ts
  (niekompletny wybór = null = disabled).
  DOWÓD: commit 6f7188dd; unit 12/12 (workout-csv 5, workout-export-range 7).
- [x] Dialog z wyborem zakresu + punkty wejścia Historia i Ustawienia → Dane
  (oba otwierają ten sam dialog); dane przez fetchWorkoutHistoryPage
  (completed; działa też w mock e2e), pobranie pliku Blob flow — ten sam
  wzorzec co istniejący eksport JSON w DataManagement (działa w natywnym
  WKWebView).
  DOWÓD: commit ccdb1d97 (ExportWorkoutsDialog, history-export-csv,
  data-export-csv otwiera dialog).
- [x] i18n OBA locales (exportCsv.* + data.exportCsvLabel), testy generatora
  i zakresów, e2e: dialog z Historii, wybór "Ostatnie 10", eksport nie rzuca
  i tworzy blob URL text/csv; wejście z Ustawień otwiera dialog.
  DOWÓD: e2e export-csv-dialog.spec.ts 4/4 (chromium+webkit), regresja
  email-coach-button 6/6, tsc 0, eslint 0, vitest okoliczne 30/30.

## J-RELEASE

- [ ] Bramki: vitest web+functions, typecheck, lint, build, check:*, pełne e2e
  po świeżym vite. UWAGA: NIE odpalać `pkill -f vite`, gdy w tle trwa
  jakikolwiek `vite build`.
- [ ] Deploy kolejność: firestore indexes (już w J-T1) → functions
  (emailWorkoutSummary, emailWorkoutHistory) → web (npm run deploy) +
  weryfikacja markera na origin/gh-pages + curl live.
- [ ] BEZ bumpów mobilnych (wydanie zbiorcze z planem I robi sesja główna).
- [ ] DECYZJE.md + odhaczenie planu z dowodami + pamięć projektu + raport
  (osobno: bug fix z potwierdzeniem, że week/last30 działa; językowa
  spójność; CSV; MessageId testów).

## Koordynacja

Równolegle w WORKTREE pracuje agent planu I (onboarding + paleta kolorów):
nie dotykaj `src/lib/accent-theme.ts`, `PlanWizard`, `Onboarding.tsx`,
`Profile.tsx` (sekcja Wygląd) ani palety. Konflikty locales rozwiąże sesja
główna przy merge.
