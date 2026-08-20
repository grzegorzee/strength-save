# PLAN H — poprawki UX i treści maili do trenera (2026-08-20, feedback po teście)

> Feedback właściciela po realnym teście wysyłki z buildu 109 (screenshot maila).
> Wykonywać PO ukończeniu planu G (te same pliki: email-workout.ts, index.ts).
> Tracker pętli. TDD: RED → implementacja → GREEN → bramki → commit
> stage-per-plik → odhaczenie z dowodem. Obowiązują "Twarde zasady" z planu G
> (sekrety, tylko g.jasionowicz@gmail.com do testów, zero emoji/AI-slopu,
> rtk/npx, i18n do OBU locales).

## Zgłoszenia właściciela (dosłownie)

1. "Sama ikona wysyłania jest za mało widoczna — 'Wyślij do trenera' powinien
   być button."
2. "Maile po EN lub PL w zależności od tego, jaki język ma ustawiony dany
   użytkownik."
3. "Dajmy możliwość wysłania też treningów z ostatniego całego tygodnia."
4. "W mailu brakuje tonażu, czasu, podsumowania setów, nowych rekordów oraz
   serii rozgrzewkowych. Biedny ten mail." (screenshot: gołe listy serii)
5. "Tytuł maila mi się nie podoba: 'Workout 2026-08-20 — Czwartek (Strength
   Save)' — szczególnie em-dash oraz brak chociażby nicku użytkownika."
6. "Nie wysyłajmy 200 treningów naraz, bo to nie ma sensu."

## H-T1 — klient: widoczny button + wybór zakresu

- [x] Ukończony trening (WorkoutDay, completed view): zamiast samej ikony
  koperty PEŁNY przycisk z tekstem `Wyślij do trenera` (PL) / `Send to coach`
  (EN), ikona Mail + label; układ rzędu akcji ma się mieścić na 390px
  (Udostępnij + Wyślij do trenera + Wróć — jeśli ciasno, przenieś „Wróć do
  dashboardu" pod spód albo ułóż 2+1; sprawdzić zrzutem 390x844).
- [x] Historia: przycisk `Wyślij do trenera` otwiera dialog z WYBOREM ZAKRESU
  (radio/chipy): `Ostatni tydzień` (7 ostatnich dni włącznie z dziś) /
  `Ostatnie 30 treningów`. Żadnej opcji „wszystko/200".
- [x] EmailWorkoutDialog: tryb 'workout' bez zmian logiki (tylko copy),
  tryb 'history' dostaje selektor zakresu (domyślnie: ostatni tydzień);
  wysyłka przekazuje `range: 'week' | 'last30'` do callable.
- [x] i18n PL+EN dla wszystkich nowych stringów. E2e: przycisk widoczny
  z tekstem na ukończonym treningu (rozszerzyć session-prs-remount.spec albo
  dedykowany spec), dialog historii ma dwie opcje zakresu.
  DOWÓD H-T1 (cała sekcja): commit 27824943 — układ 2+1 zweryfikowany
  zrzutem 390x844 (rząd Udostępnij+Wyślij do trenera mieści się, Wróć pod
  spodem); chipy radio week/last30 (aria-checked, default week);
  sendHistoryEmail(to, lang, range); vitest dialogu 7/7 (RED: default week
  + wybór last30), e2e email-coach-button.spec 2/2 (completed view bez
  selektora, historia z dwiema opcjami), typecheck/lint/no-emoji OK.

## H-T2 — functions: zakresy historii i twarde limity

- [x] Deps: `listWorkouts` zastąpić/rozszerzyć o zakres:
  `listWorkoutsInRange(uid, { sinceDate? , limit })` — tryb 'week' = completed
  z date >= (dziś - 6 dni), limit bezpieczeństwa 14; tryb 'last30' = 30
  najnowszych completed. HISTORY_EMAIL_MAX_WORKOUTS obniżyć do 30 (200 out).
- [x] Callable `emailWorkoutHistory` przyjmuje `range` ('week' | 'last30',
  default 'week'), walidacja wartości; testy: tydzień filtruje po dacie,
  last30 tnie do 30, nieznany range = invalid-argument.
  DOWÓD (oba): commit a80c0666 — listWorkoutsInRange w deps i index.ts
  (where date >= sinceDate na polu orderBy = istniejący indeks), invalid-range
  → HttpsError invalid-argument; vitest pliku 27/27 (+4 nowe RED→GREEN).
- [x] Tytuł maila historii: bez liczby wysłanych „(N)" jako głównego członu —
  patrz H-T4 (robione w H-T4).
  DOWÓD: commit cb919ca6 — historyEmailSubject(workouts, lang, displayName)
  z zakresem dat zamiast liczby.

## H-T3 — język maila z ustawień USERA (server-side)

- [x] Źródło prawdy: `users/{uid}.preferences.language` (albo pole language
  usera — sprawdzić mapper/model users w functions: registration/weekly-digest
  już czytają language per user — użyć tego samego pola co digest!).
  Klientowy parametr `lang` zostaje TYLKO jako fallback, gdy profil nie ma
  języka. Deps: `getUserContext(uid)` → `{ language, displayName }` (jedno
  czytanie users doc — displayName potrzebny do H-T4).
- [x] Testy: user z language 'en' dostaje mail EN nawet gdy klient przysłał
  'pl' (i odwrotnie); brak w profilu → fallback na parametr; brak wszystkiego
  → 'pl'.
  DOWÓD (oba): commit e696f707 — pole TOP-LEVEL users.language (to samo co
  weekly-digest .select i registration userData.language); resolveUserContext
  z odpornością na awarię odczytu profilu; email_log.lang = finalny język;
  +7 testów, plik 34/34, functions 281 passed, typecheck OK.

## H-T4 — treść i tytuł maila (pojedynczy ORAZ historia)

- [x] TYTUŁ bez em-dash i z imieniem/nickiem usera (displayName z users doc;
  fallback: bez imienia, nigdy "undefined"):
  - pojedynczy PL: `Trening Grega: Czwartek, 20.08.2026 (Strength Save)` —
    format: `Trening {imię w dopełniaczu? NIE — bez odmiany: }` UWAGA na
    odmianę: bezpiecznie `Strength Save: trening {displayName}, {dzień}
    {DD.MM.RRRR}` (bez odmiany imienia). EN:
    `Strength Save: {displayName}'s workout, {Weekday}, {Mon D, YYYY}`.
  - historia PL: `Strength Save: treningi {displayName}, {zakres dat}` /
    EN analogicznie. Datę formatować per język (pl: DD.MM.RRRR, en: Mon D).
  - Test: zero znaków em-dash (—) i en-dash (–) w tytule i całym HTML
    (poza treścią notatek usera).
- [x] TREŚĆ pojedynczego treningu — sekcje OBOWIĄZKOWE (test na każdą):
  1. Nagłówek: dzień tygodnia + data + nazwa dnia (focus).
  2. Kafle podsumowania: TONAŻ, CZAS, SERIE zrobione/planowane (np. „21/24"),
     ĆWICZENIA (n), NOWE REKORDY (n; kafel tylko gdy > 0).
  3. NOWE REKORDY (PR-y) — osobna sekcja z listą: ćwiczenie + wartość
     (ciężar/powtórzenia/e1RM). Liczone SERVER-SIDE względem WCZEŚNIEJSZYCH
     treningów usera (deps: listWorkouts przed datą sesji; logika = port
     detekcji z `src/lib/pr-utils.ts` detectNewPRs — przenieść minimalny
     odpowiednik do functions z testami: nowy max kg, nowy max powt. przy tym
     samym/większym ciężarze; bez backfill komplikacji — jeśli brak wcześniej
     treningów danego ćwiczenia, oznacz „pierwszy zapis", nie PR).
  4. Tabela ćwiczeń: serie z wyraźnym oznaczeniem ROZGRZEWKOWYCH (osobny
     styl/etykieta), zrobione/pominięte; per ćwiczenie: najlepsza seria
     wyróżniona, notatka, RPE, ból.
  5. Podsumowanie setów per ćwiczenie w nagłówku wiersza (np. „3/3 serie
     robocze + 1 rozgrzewkowa").
  6. Notatka dnia, ocena sesji.
- [x] TREŚĆ historii: nagłówek zbiorczy (zakres dat, liczba treningów, suma
  tonażu, łączny czas, suma serii roboczych) + sekcje per trening (te same
  komponenty co pojedynczy, kompaktowo, Z rozgrzewkowymi i PR-ami per sesja).
- [x] Utrzymać szablon marki z G-T3 (jasny, tabelki, inline CSS, zero emoji,
  zero AI-slopu) — to ROZSZERZENIE treści, nie nowy wygląd.
  DOWÓD H-T4 (tytuł + treść + historia + szablon): commit cb919ca6 —
  email-prs.ts (port detectNewPRs: weight/reps przy tym samym ciężarze/e1rm,
  pierwszy zapis nie-PR, 9 testów), kafle z seriami zrobione/planowane
  i kaflem Rekordy, sekcja NOWE REKORDY z poprzednią wartością, badge
  rozgrzewkowej + wyróżnienie najlepszej serii + podsumowanie setów per
  ćwiczenie, historia z sumą serii roboczych i PR per sesja (baseline
  narastający); test zero em/en-dash w tytułach i HTML; 55/55 GREEN
  (functions total 302), stare kontrakty G-T3 utrzymane.
- [ ] Po wdrożeniu: REALNY test na g.jasionowicz@gmail.com — jeden mail
  pojedynczego treningu (fixture z PR-em i rozgrzewką przez bezpośrednie
  wywołanie buildera + wysyłkę SES kluczem z _secrets; NIE przez konta
  realnych userów) i jeden historii 'week'; w raporcie MessageId obu.

## H-RELEASE

- [ ] Bramki repo (vitest web+functions, typecheck, lint, build, check:*,
  test:rules jeśli rules tknięte) + pełne e2e po świeżym vite.
- [ ] Deploy: functions (emailWorkoutSummary, emailWorkoutHistory) → web
  (npm run deploy) + weryfikacja markera (np. 'Wyślij do trenera') na
  origin/gh-pages + curl live.
- [ ] BEZ bumpów mobilnych (przycisk wejdzie do bundli przy następnym wydaniu
  mobilnym — odnotować w raporcie; treść maili działa od razu wszędzie,
  bo server-side).
- [ ] DECYZJE.md + odhaczenie tego planu z dowodami + pamięć projektu.
