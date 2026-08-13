# WDROŻENIE FIX (plany A-B, zgłoszenia z treningu 2026-08-13) — tracker dla agenta /loop

> Autoryzacja usera (2026-08-13): pełna autonomia od A do Z, cel = apka w pełni
> funkcjonalna przed launchem. Agent SAM podejmuje wszystkie decyzje
> (implementacyjne, wizualne, wydaniowe) i NIE pyta usera o nic. Deploy web,
> rules, TestFlight (iOS + Apple Watch), Android AAB oraz weryfikacja Garmin
> są PRE-AUTORYZOWANE. Wyjątki od autonomii: żadnych operacji zapisu na
> realnych kontach userów, żadnych zmian cennika/metadanych sklepów,
> żadnego `git push --force`.

## Jak pracować (każda iteracja pętli)

1. Przeczytaj ten plik. Znajdź PIERWSZY nieodhaczony krok z sekcji KOLEJKA.
2. Wykonaj go DOKŁADNIE wg odpowiedniego planu (`docs/PLAN-FIX-{A,B}-2026-08-13.md`),
   krok po kroku (TDD: test → fail → implementacja → pass → commit).
3. Po ukończeniu: odhacz krok tutaj (`[x]` + notka: commit hash / co zmienione),
   commit trackera razem ze zmianą.
4. Jeden krok kolejki = jedna iteracja pętli (wyjątek: kroki WYDANIE — sekwencja
   komend, rób całość).
5. CHECKPOINT po każdym kroku: pełne `npm run test` + `npm run typecheck`;
   przy krokach dotykających e2e — celowane specy; przy WYDANIU — komplet bramek.
6. Wszystko zrobione → wpis do DECYZJE.md, aktualizacja PLAN.md (M56), STOP pętli.

## Zasady twarde

- CLAUDE.md projektu obowiązuje w całości (Karpathy, checklist przed wdrożeniem,
  pułapki: Radix Sheet, dźwięk iOS, e2e = najpierw świeży dev server).
- Decyzje podejmuj sam: przy wątpliwości wariant MNIEJSZY i odwracalny,
  decyzja do sekcji DZIENNIK.
- Testy: nigdy nie zapisuj serii na realnym koncie. E2e przez hak
  `fittracker_e2e_workouts`. Symulator Garmin sparowany z PROD — NIE kończyć
  na nim treningu.
- Zderzenie z rzeczywistością kodu (linia przesunięta, inny kształt propsów):
  plan podaje intencję i wzorzec; dostosuj szczegół, nie intencję.
- Test/bramka pada i nie umiesz naprawić w tej iteracji: NIE odhaczaj, opisz
  w DZIENNIKU, wróć w następnej iteracji z systematic-debugging.
- Testy komponentów z polskimi diakrytykami w nazwach → `src/test/`
  (guard i18n Z168 skanuje components/).
- Przed KAŻDYM release iOS: `pgrep -f release-ios` (wyścig równoległych sesji)
  + odczytaj realny `CURRENT_PROJECT_VERSION` z pbxproj (ostatnia znana:
  następny = 101, versionCode Android = 17).
- E2e mają 3 wzorce datozależne naprawione 2026-08-13 („Dzień regeneracji") —
  nowy fail e2e NAJPIERW sprawdź pod kątem daty/mocka, potem szukaj w kodzie.
- Safety hook blokuje `rm -rf`: cache vite czyść przez `mv` do scratchpada.

## KOLEJKA

### Plan FIX-A — Stabilność (docs/PLAN-FIX-A-2026-08-13.md)
- [x] A-T1: crash-guard Firestore (INTERNAL ASSERTION → kontrolowany reload; ErrorBoundary z restartem) — commit c357bbeb; guard + anti-loop 2 min w main.tsx, restart w ErrorBoundary ORAZ RouteCrashFallback (tam realnie była nawigacja SPA)
- [x] A-T2: releaseBodyLocks w ErrorBoundary (czarny ekran po awarii sheeta) — commit 8d7d3dc8; lib + wywołanie w componentDidCatch + test integracyjny niezmiennika (1649 testów PASS)
- [ ] A-T3: Zakończ trening zwykłym przyciskiem + potwierdzenie (usunięcie HoldToFinishButton)
- [ ] A-T4: „Błąd zapisu" tylko po totalnym failu (DraftSaveTotalFailure, retry 3 s, telemetria stage)
- [ ] WYDANIE FIX-A: pełny checklist z CLAUDE.md → web deploy + iOS 101 (z Watch)
      TestFlight + Android AAB v17 + wpis DECYZJE.md

### Plan FIX-B — UX i porządki (docs/PLAN-FIX-B-2026-08-13.md)
- [ ] B-T1: „Zakończ rozgrzewkę" w WarmupRoutineDialog (decyzja: bez animacji ćwiczeń w rozgrzewce)
- [ ] B-T2: celebracja live PR — overlay z ConfettiBurst zamiast toastu
- [ ] B-T3: chudszy pasek przerwy (hero text-5xl → text-3xl)
- [ ] B-T4: loader z logo Strength Save zamiast kółka
- [ ] B-T5: Dashboard bez karty planu i ostatniego PR (Cykle → /plan, PR → Analityka; e2e zaktualizowane)
- [ ] B-T6: Analityka domyślnie na bieżącym podsumowaniu (summary, nie weekly)
- [ ] B-T7: pomiary z recordedAt (types + zapis + rules hasOnly + test:rules + godzina w historii)
- [ ] WYDANIE FIX-B: rules deploy PRZED webem → pełny checklist → web + iOS 102
      + Android AAB v18 + wpis DECYZJE.md

### Zamknięcie
- [ ] Garmin: git diff zakresu FIX pod kątem kontraktu CIQ (functions/, garmin/,
      plan-schedule, workout-protocol, garmin-api). Oczekiwane: bez zmian
      (FIX to UI + rules pomiarów, których Garmin nie czyta — POTWIERDŹ greppem,
      że garmin-day/ingest nie dotykają measurements). Adnotacja w garmin/README.md.
- [ ] Apple Watch: StrengthWatch.app w IPA obu wydań (unzip -l) + komplet testów
      kontraktu watch zielony + zero plików watch w diffie.
- [ ] DECYZJE.md: zbiorczy wpis FIX A-B (co, dlaczego, root cause'y, weryfikacja)
      + PLAN.md: kamień M56 odhaczony (PLAN.md jest w .gitignore — edytuj lokalnie).
- [ ] STOP pętli (ScheduleWakeup stop:true).

## Procedura WYDANIE (per plan)

1. `npm run test && npm run typecheck && npm run lint && npm run build
   && npm run check:no-emoji` (+ przy FIX-B: `JAVA_HOME=/opt/homebrew/opt/openjdk@21
   npm run test:rules`).
2. E2e: NAJPIERW świeży dev server (`pkill -f vite`, cache `node_modules/.vite`
   przez mv do scratchpada), potem `npx playwright test`. Masowe faile na
   page.goto = zwietrzały serwer, nie kod.
3. FIX-B: `firebase deploy --only firestore:rules` PRZED deployem weba.
4. Web: `npm run deploy` (sam push NIE aktualizuje strony) + weryfikacja hasha
   bundla na app.strengthsave.app (czekacz curl w tle).
5. iOS + Watch: bump `CURRENT_PROJECT_VERSION` (6 wystąpień) →
   `scripts/release-ios.sh "co testować"` — krok [2/2] skryptu robi dystrybucję
   (obie grupy + whatsNew + Beta App Review); potwierdź w logu 204/204/200/APPROVED
   oraz `Watch/StrengthWatch.app` w IPA (unzip -l).
6. Android: bump versionCode → `npm run build:mobile && ./node_modules/.bin/cap
   sync android && (cd android && ./gradlew bundleRelease)` → `jarsigner -verify`
   + SHA-256.
7. MARKETING_VERSION / version / versionName = 1.0.0 NA SZTYWNO (decyzja usera).
8. Odhacz WYDANIE w KOLEJCE z numerem builda i hashem web bundle.

## DZIENNIK

(agent dopisuje: data, decyzje podjęte samodzielnie, problemy i ich root cause)

- 2026-08-13 (A-T1): Plan wskazywał przycisk „Wróć na Dashboard" w ErrorBoundary.tsx,
  realnie nawigacja SPA jest w RouteCrashFallback (AuthenticatedApp.tsx:55), a domyślny
  fallback ErrorBoundary od zawsze robił reload. Dostosowany szczegół, nie intencja:
  przy asercji Firestore OBA fallbacki robią hard reload z etykietą „Uruchom ponownie"
  (ErrorBoundary z mini-słownika, RouteCrashFallback z i18n errors.restartApp).
  Test unhandledrejection zbudowany ręcznie (jsdom nie ma PromiseRejectionEvent,
  wariant przewidziany w planie). Checkpoint: 1646 testów PASS, typecheck OK.
