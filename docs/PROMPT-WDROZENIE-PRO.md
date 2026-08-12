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
- [ ] WYDANIE A: pełny checklist z CLAUDE.md → web deploy + iOS (z Watch) TestFlight
      + Android AAB + wpis DECYZJE.md

### Plan B — Header, powiadomienia, Postępy (docs/PLAN-PRO-B-2026-08-12.md)
- [ ] B-T1: moduł inboxa `notification-inbox.ts`
- [ ] B-T2: dzwonek + sheet powiadomień w headerze
- [ ] B-T3: avatar w headerze + Postępy w bottom nav
- [ ] B-T4: emisja zdarzeń PR do inboxa
- [ ] WYDANIE B: jak wyżej

### Plan C — Moment WOW po treningu (docs/PLAN-PRO-C-2026-08-12.md) [wymaga A]
- [ ] C-T1: delta w liście PR podsumowania
- [ ] C-T2: hero-tonaż + likwidacja duplikatu metryk
- [ ] C-T3: polityka confetti (rzadkie momenty)
- [ ] C-T4: haptyka + delta przy live PR
- [ ] WYDANIE C: jak wyżej

### Plan D — Gamifikacja progresu (docs/PLAN-PRO-D-2026-08-12.md) [wymaga B]
- [ ] D-T1: komponent `AchievementBadge`
- [ ] D-T2: Postępy na nowych odznakach
- [ ] D-T3: pasek postępu poziomu w Profilu
- [ ] D-T4: heatmapa konsekwencji w Postępach
- [ ] D-T5: powiadomienie o kamieniu milowym
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
