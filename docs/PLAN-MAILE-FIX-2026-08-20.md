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

- [ ] W rozwiniętym wierszu treningu w Historii (obok Otwórz/Porównaj/Usuń)
  akcja `Wyślij do trenera` (ikona Mail + tekst) → EmailWorkoutDialog
  mode='workout' z workoutId TEGO wiersza (initialEmail z preferences).
- [ ] i18n OBA locales (reużyj email.sendWorkout jeśli pasuje). E2e: wiersz
  historii ma akcję, klik otwiera dialog bez selektora zakresu.

## J-T3 — mail w 100% jednym języku

**Zgłoszenie:** mail EN miał polskie nazwy ćwiczeń, "Czwartek", "Góra B".

- [ ] Functions mają gotowe słowniki digestu: `localizeExerciseNameEn`
  (exercise-name-en.ts) i `localizeFocusEn` (focus-en.ts). Przy lang=en
  email-workout przepuszcza przez nie: nazwy ćwiczeń, dayFocus; dayName typu
  "Czwartek/Poniedziałek..." tłumaczyć słownikiem dni tygodnia (7 wpisów PL→EN
  w email-workout), a custom dayName (np. "Góra B" jako nazwa dnia) przez
  localizeFocusEn — jeśli słownik nie zna, zostaje oryginał (nazwa własna
  usera; NIE wymyślać tłumaczeń). Przy lang=pl nic nie ruszać (kanonicznie PL).
- [ ] Test: workout z polskimi nazwami przy lang=en → HTML bez "Czwartek",
  z "Incline Barbell Press"/odpowiednikami ze słownika; nieznana nazwa
  zostaje; lang=pl bez zmian. Data już jest formatowana per język (jest OK).

## J-T4 — last30 czytelnie: mail-przegląd + załącznik CSV (moja decyzja
na "zdecyduj co lepsze i wdróż")

**Problem:** 30 pełnych sekcji treningów w HTML to ściana; właściciel sugeruje
CSV. DECYZJA: hybryda.

- [ ] Mail `last30` (i każdy > 7 treningów): zamiast pełnych sekcji per trening
  — nagłówek zbiorczy (jak dotąd) + TABELA-przegląd: wiersz na trening (data,
  dzień, tonaż, czas, serie robocze, liczba PR) + ZAŁĄCZNIK CSV z pełnym
  detalem serii. Mail `week` (typowo 2-5 treningów) zostaje z pełnymi sekcjami
  + też dostaje załącznik CSV (spójnie).
- [ ] CSV (jeden format, moduł `functions/src/workout-csv.ts` z testami):
  nagłówki EN techniczne (date, day, focus, exercise, set_no, set_type
  [warmup/working], weight_kg, reps, completed, rpe, pain, exercise_note,
  day_note, session_rating, tonnage_kg, duration_sec, prs). Escapowanie CSV
  (przecinki/cudzysłowy/nowe linie), UTF-8 z BOM (Excel), separator przecinek.
- [ ] Załączniki wymagają RAW MIME: SES `SendEmailCommand` z `Content.Raw`
  (zbudować multipart/mixed: HTML + text/csv attachment; bez nowych zależności
  — składanie MIME ręcznie w module z testami granicznymi) ; fallback Resend
  wspiera `attachments` w API — dodać. Transport zachowuje metadane
  (sesMessageId) i email_log/eventy jak dotąd.
- [ ] Test realny: wysyłka week i last30 na g.jasionowicz@gmail.com z
  załącznikami (fixtures syntetyczne, nie realne konta) — MessageId do raportu.

## J-T5 — eksport treningów CSV w aplikacji (Ustawienia → Dane)

- [ ] Sprawdzić `DataManagement` (settings?section=data): jest eksport danych
  (data.export.*) — jeśli to JSON/inny format, DODAĆ przycisk "Eksport
  treningów (CSV)" generujący klientsko ten sam format co J-T4 (współdzielić
  definicję kolumn: lekki moduł w src/lib/workout-csv.ts, funkcje czyste;
  duplikacja z functions dopuszczalna, ale format MUSI być identyczny — test
  na zgodność nagłówków). Pobranie pliku lokalnie (Blob; na natywnym iOS
  Share sheet przez istniejące wzorce share/eksportu, sprawdzić jak robi to
  obecny eksport).
- [ ] i18n, testy generatora, e2e przycisku (plik się generuje — w e2e wystarczy
  że akcja nie rzuca i tworzy blob URL / trigger download).

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
