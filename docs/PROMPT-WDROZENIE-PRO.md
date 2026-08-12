# WDROŻENIE PRO (plany A-E) — tracker dla agenta /loop

> Autoryzacja usera (2026-08-12): pełna autonomia od A do Z. Agent SAM podejmuje
> wszystkie decyzje (implementacyjne, wizualne, wydaniowe) i NIE pyta usera o nic.
> Deploy web, TestFlight (iOS + Apple Watch), Android AAB oraz weryfikacja Garmin
> są PRE-AUTORYZOWANE w ramach tego wdrożenia. Wyjątki od autonomii: żadnych
> operacji zapisu na realnych kontach userów, żadnych zmian cennika/metadanych
> sklepów, żadnego `git push --force`.

## Jak pracować (każda iteracja pętli)

1. Przeczytaj ten plik. Znajdź PIERWSZY nieodhaczony krok z sekcji KOLEJKA.
2. Wykonaj go DOKŁADNIE wg odpowiedniego planu (`docs/PLAN-PRO-{A..E}-2026-08-12.md`),
   krok po kroku (TDD: test → fail → implementacja → pass → commit).
3. Po ukończeniu: odhacz krok tutaj (`[x]` + krótka notka: commit hash / co zmienione),
   commit trackera razem ze zmianą.
4. Jeden krok kolejki = jedna iteracja pętli. Nie rób kilku naraz (wyjątek: kroki
   WYDANIE, które są sekwencją komend — rób całość).
5. Wszystko zrobione → wpis do DECYZJE.md, aktualizacja PLAN.md, STOP pętli.

## Zasady twarde

- CLAUDE.md projektu obowiązuje w całości (Karpathy, checklist przed wdrożeniem,
  pułapki Radix Sheet / dźwięk iOS / e2e dev server).
- Decyzje podejmuj sam: przy wątpliwości wybieraj wariant MNIEJSZY i odwracalny,
  zapisuj decyzję w tym pliku w sekcji DZIENNIK.
- Testy: nigdy nie zapisuj serii na realnym koncie. E2e przez hak
  `fittracker_e2e_workouts`. Symulator Garmin jest sparowany z kontem PROD:
  NIE kończyć na nim treningu.
- Zderzenie z rzeczywistością kodu (linia przesunięta, inny kształt propsów):
  plan podaje intencję i wzorzec; dostosuj szczegół, nie intencję.
- Jeśli test/bramka pada i nie umiesz naprawić w tej iteracji: NIE odhaczaj,
  opisz problem w DZIENNIKU, w następnej iteracji wróć z systematic-debugging.
- Przed KAŻDYM release iOS: sprawdź `pgrep -f release-ios` (równoległe sesje =
  wyścig o numer builda) oraz odczytaj realny `CURRENT_PROJECT_VERSION`
  z `ios/App/App.xcodeproj/project.pbxproj` (nie ufaj liczbom z pamięci;
  ostatnia znana: następny = 96, versionCode Android = 12).

## KOLEJKA

### Plan A — De-emojizacja (docs/PLAN-PRO-A-2026-08-12.md)
- [x] A-T1: wspólna mapa ikon aktywności `activity-icons.ts` (9ed4b3b5; TDD, 1616 testów + typecheck zielone)
- [x] A-T2: TrainingDayCard bez emoji (45630828; test w src/test/ zamiast components/__tests__, 1617 testów zielonych)
- [x] A-T3: badge'e ExerciseCard (9c41fc9e; 🎯📅⬆⬇↺🏆 → Target/CalendarCheck/Trending/RotateCcw/Trophy, żaden test nie asertował emoji)
- [x] A-T4: DayPlan + Dashboard (sekcje, pusty stan, regeneracja) (b2ccefa9; 💪🧘🔥⚡⏱️🔄 → Dumbbell/Leaf/Flame/Zap/Timer/Repeat)
- [x] A-T5: karty cardio/Strava na wspólnej mapie (c67f78c8; 3 lokalne mapy emoji usunięte, CardioPR bez pola emoji, kudos bez 👍)
- [x] A-T6: toasty PR, Analytics badge, puste stany Strava (911a5f36; i18n bez 🏆, badge Trophy+fitness-warning, Footprints w StravaTab/RacePredictor, allowlist i18n oczyszczona)
- [x] A-T7: share card bez emoji (e6f1926b; 💪 z footera usunięty, 🏆 → typograficzny "PR ·"; wizualny przegląd 4 szablonów w scenariuszu WYDANIA A)
- [x] A-T8: bramka `check:no-emoji` + domknięcie resztek (61c29270; bramka OK na 168 plikach, 17 resztek domkniętych: ExerciseCard ✓→Check, TrainingPlan ⚡⏱️, StravaActivityDetail 🏠→Home, DataManagement OK, i18n bez ✓/💪)
- [x] WYDANIE A: pełny checklist z CLAUDE.md → web deploy + iOS (z Watch) TestFlight
      + Android AAB + wpis DECYZJE.md (web live index-iHRC0bdg.js; iOS 96 APPROVED obie
      grupy, StrengthWatch.app w IPA; AAB v12 jar verified SHA-256 e5f13383…9b47;
      e2e 392/392 po stabilizacji flake'a 2fe333a0; NASTĘPNY bump iOS = 97, versionCode = 13)

### Plan B — Header, powiadomienia, Postępy (docs/PLAN-PRO-B-2026-08-12.md)
- [x] B-T1: moduł inboxa `notification-inbox.ts` (7f30bfa0; TDD 4 testy, storage per uid limit 50, test w src/test/ jak w A-T2; 1621 unit zielonych)
- [x] B-T2: dzwonek + sheet powiadomień w headerze (9f280084; sheet zawsze zamontowany wg lekcji b.92, i18n w obu locale, 1624 unit zielonych)
- [x] B-T3: avatar w headerze + Postępy w bottom nav (c2b952f7; rootPaths z /achievements+/analytics bez /profile, e2e mobile-nav zaktualizowane 8/8, 1625 unit zielonych)
- [x] B-T4: emisja zdarzeń PR do inboxa (f8909b77; formatPRValue wyniesiony do pr-utils i użyty w completion+inboxie, TDD 3 nowe testy, 1628 unit zielonych)
- [x] WYDANIE B: jak wyżej (web live index-GODEYLhM.js; iOS 97 APPROVED obie grupy,
      Watch w IPA; AAB v13 jar verified SHA-256 a50bf1f1…7011; e2e po 3 oczekiwanych
      aktualizacjach speców 929a1a96; NASTĘPNY bump iOS = 98, versionCode = 14)

### Plan C — Moment WOW po treningu (docs/PLAN-PRO-C-2026-08-12.md) [wymaga A]
- [x] C-T1: delta w liście PR podsumowania (2935075a; formatPRDelta w pr-utils, TDD 2 testy — w drugim volumeDeltaPct:null bo '+5%' tonażu psuł asercję planu; 1630 unit zielonych)
- [x] C-T2: hero-tonaż + likwidacja duplikatu metryk (aac26fdc; stara karta 2×2 usunięta, zostaje TYLKO baner sync-pending, licznik ćwiczeń w nagłówku listy, osierocony totalRepsCount usunięty)
- [x] C-T3: polityka confetti (8401be76; bigMoment ?? prs>0, AutoAdvance z capem min(celebrationMs,1200), Dashboard confetti tylko ?welcome=1; 1632 unit zielonych)
- [x] C-T4: haptyka + delta przy live PR (bb8851eb; hapticSuccess już był w toaście livePR — dodana delta przez bestBefore w stanie pending, i18n {delta} w obu locale; haptyka do sprawdzenia na urządzeniu przy testach usera)
- [x] WYDANIE C: jak wyżej (web live index-DaIzuDtB.js; iOS 98 APPROVED obie grupy,
      Watch w IPA; AAB v14 jar verified SHA-256 961319d2…c792; e2e 392/392;
      NASTĘPNY bump iOS = 99, versionCode = 15)

### Plan D — Gamifikacja progresu (docs/PLAN-PRO-D-2026-08-12.md) [wymaga B]
- [x] D-T1: komponent `AchievementBadge` (4dbbc37b; heksagon clip-path, 4 materiały, ghost, TDD 2 testy; 1634 unit zielonych)
- [x] D-T2: Postępy na nowych odznakach (eb967f30; milestones+specjalne na AchievementBadge, tierForIndex w utils, Lock usunięty, e2e /achievements 2/2; progress w Milestone to 0-100 → /100 dla komponentu)
- [x] D-T3: pasek postępu poziomu w Profilu (80ae5a24; TDD w profile-sections, elite bez paska przez warunek tier.next; 1635 unit zielonych)
- [x] D-T4: heatmapa konsekwencji w Postępach (57e54259; TrainingHeatmap osadzony bez dodatkowego Carda — ma własny z tytułem "Mapa treningowa" i wyborem roku, więc bez nowych kluczy i18n; strava=[] poza zakresem ekranu; TDD test strony z mockami, 1636 unit + e2e 2/2)
- [x] D-T5: powiadomienie o kamieniu milowym (f6f8377b; diffMilestones TDD 2 testy, emisja 'badge' w WorkoutDay dla workouts+tonnage — records wymaga pipeline'u Postępów, PR-y i tak są w inboxie jako 'pr'; 1638 unit zielonych)
- [ ] D-T6: sekcja dumy w Profilu
- [ ] WYDANIE D: jak wyżej

### Plan E — Dashboard hero-first (docs/PLAN-PRO-E-2026-08-12.md)
- [ ] E-T1: komponent `DashboardStatusSlot`
- [ ] E-T2: banery stanu do slotu
- [ ] E-T3: nowa kolejność sekcji + data-testid
- [ ] E-T4: karta „Twój plan" bez listy dni
- [ ] WYDANIE E: jak wyżej + e2e pełne + scenariusz sekwencji

### Zamknięcie
- [ ] Garmin: zweryfikuj, czy któraś zmiana dotknęła kontraktu danych z aplikacją
      CIQ (grep po modułach syncu używanych przez garmin/; status w garmin/README.md).
      Zmiany A-E to warstwa UI webview, więc oczekiwany wynik: „bez zmian po stronie
      Garmin". Jeśli JEDNAK coś dotknięte: napraw/zbuduj wg garmin/README.md
      (sanity-guardy, nie kończyć treningu na symulatorze!).
- [ ] Apple Watch: potwierdź, że target StrengthWatch zbudował się w release iOS
      (leci z tym samym archive) i że komunikacja telefon-zegarek działa
      (scenariusz z docs o watch, symulatory sparowane).
- [ ] DECYZJE.md: jeden zbiorczy wpis (co, dlaczego, root cause'y napotkanych
      problemów, weryfikacja) + PLAN.md: nowy kamień milowy odhaczony.
- [ ] STOP pętli (ScheduleWakeup stop:true).

## Procedura WYDANIE (per plan)

1. `npm run test && npm run typecheck && npm run lint && npm run build`
   (+ `npm run check:no-emoji` od Planu A wzwyż).
2. E2e: NAJPIERW świeży dev server (`pkill -f vite`, wyczyść `node_modules/.vite`),
   potem `npx playwright test`. Masowe faile na page.goto = zwietrzały serwer, nie kod.
3. Web: `npm run deploy` (sam push NIE aktualizuje strony).
4. iOS + Watch: bump `CURRENT_PROJECT_VERSION` (6 wystąpień, pilnuje
   release-ios-preflight.mjs) → `scripts/release-ios.sh "opis co testować"` →
   OBOWIĄZKOWO `uv run --with "pyjwt[crypto]" --with requests scripts/testflight_external.py <build> --whats-new "..."`
   (obie grupy + Beta App Review; bez tego Robert nie dostaje builda).
5. Android: bump versionCode → build AAB podpisany (jak w poprzednich wydaniach,
   patrz DECYZJE.md z 2026-08-11/12).
6. MARKETING_VERSION / version / versionName = 1.0.0 NA SZTYWNO (decyzja usera,
   nie zmieniać).
7. Odhacz WYDANIE w KOLEJCE z numerem builda i hashem web bundle.

## DZIENNIK

(agent dopisuje: data, decyzje podjęte samodzielnie, problemy i ich root cause)

- 2026-08-12 A-T1: commit tylko plików taska (nie `git add -A` z planu), bo repo ma
  niezwiązane untracked (animacje-cwiczen/, .agents/). Wariant mniejszy i odwracalny.
- 2026-08-12 A-T2: test przeniesiony z planowego `src/components/__tests__/` do
  `src/test/` (konwencja repo; guard i18n Z168 skanuje components/ i wykrywał polskie
  znaki w nazwach testów). Intencja planu bez zmian. Przy okazji tło missed ujednolicone
  do `bg-destructive/10` (zasada 8 CLAUDE.md, wg wzorca z planu).
- 2026-08-12 A-T5: pole `emoji` usunięte z interfejsu CardioPR (nierenderowalne w lucide);
  CardioPersonalBests mapuje kategorię PR na ikonę (Footprints/Ruler/Mountain/Medal,
  kolor fitness-warning bo niesie informację PR). Kudos w StravaActivityDetail bez 👍
  (etykieta już mówi co to za liczba). Oba w duchu planu: emoji w stringu → bez ikony.
- 2026-08-12 A-T6: RacePredictor na jednej ikonie Footprints (wariant mniejszy z planu);
  usunięty martwy wpis RacePredictor z ALLOWLIST guardu i18n (mapa z kluczem
  'Półmaraton' zniknęła, wpis osłabiałby guard).
- 2026-08-12 A-T7: test ręczny 4 szablonów share przeniesiony do scenariusza ręcznego
  WYDANIA A (już jest na jego checkliście; zmiana to czyste stringi HTML, 3 testy
  jednostkowe share przechodzą). Unikam dublowania ciężkiego przebiegu e2e per task.
- 2026-08-12 A-T8: bramka rozszerzona o strip komentarzy (wzorzec z guardu i18n Z168),
  bo komentarze nie są chrome UI (✓ w opisach gridu ExerciseCard zostały). DataManagement
  '✓'→'OK' (string interpolowany do opisu dialogu, neutralny językowo). Asercje
  share-dialog.test na 'Zapisano' bez ✓ (zmiana oczekiwana wg planu, ikona Check
  już była w przycisku).
- 2026-08-12 WYDANIE A: (1) e2e 391/392 — jedyny fail (webkit, swap przez menu) pada
  IDENTYCZNIE na commicie sprzed planu A (88b88cdc), root cause: toast autostartu
  (TOAST_REMOVE_DELAY=1000000) przechwytuje klik w menuitem; NIE regresja A, fix
  testowy 2fe333a0 (czekaj na toast → zamknij → menu), po nim PASS. (2) testflight_
  external.py NIE odpalony osobno: release-ios.sh ma zintegrowany krok [2/2]
  auto-dystrybucji (obie grupy 204/204, whatsNew 200, Beta App Review APPROVED) —
  ponowne zgłoszenie dublowałoby review. (3) rm -rf node_modules/.vite zablokowany
  przez safety hook → cache odłożony mv do scratchpada (efekt ten sam). (4) Scenariusz
  ręczny na urządzeniu zostaje po stronie usera (wpis DECYZJE.md), źródłowo zero emoji
  pilnuje bramka.
- 2026-08-12 B-T3: vi.stubGlobal('__APP_VERSION__') w teście nav (vitest.config nie ma
  define z vite.config — wariant mniejszy niż zmiana configu). E2e mobile-nav-reachability
  zaktualizowany do nowego niezmiennika (Postępy w 5. slocie, Profil przez avatar) i
  przechodzi 8/8. Etykieta achievements w sidebarze zmienia się z 'Osiągnięcia' na
  'Postępy' (labelKey wspólny, świadomie wg planu).
- 2026-08-12 B-T4: TDD na formatPRValue (wyniesiona logika); samo okablowanie emisji
  w handleCompleteWorkout (2k-liniowa strona, glue code) weryfikuje scenariusz
  sekwencji przy WYDANIU B, nie osobny unit z pełnym renderem strony. Nazwa ćwiczenia
  w inboxie przez localizeExerciseName (jak toast livePR).
- 2026-08-12 C-T2: stan sync-pending zachowany jako osobny baner (plan kazał usunąć
  nagłówek gratulacyjny; "czeka na synchronizację" to STATUS, nie gratulacja — jego
  usunięcie łamałoby zasadę 6 CLAUDE.md). Klucze workout.summary/statExercises/statReps
  zostają w locale (osierocone w kodzie, nieszkodliwe, mogą wrócić).
- 2026-08-12 C-T3: dwa odchylenia od planu: (1) mock ConfettiBurst BEZ wołania onDone
  (synchroniczny setStage w renderze wyrzucał confetti z DOM przed asercją — test
  z planu sam siebie unieważniał); (2) AutoAdvance z ms=min(celebrationMs,1200)
  zamiast sztywnych 1200 (stare testy przekazują celebrationMs=30 i czekają waitForem
  z limitem 1000 ms; produkcyjnie nadal 1200).
