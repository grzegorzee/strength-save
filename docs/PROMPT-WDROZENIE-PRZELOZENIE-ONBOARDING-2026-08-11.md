# PROMPT: przełożenie treningu + krok marketingowy onboardingu (do /loop)

> Odpalany w nowym oknie przez `/loop`. Każda iteracja robi JEDEN nieodhaczony
> krok ze STANU poniżej, weryfikuje, odhacza, commituje. Wszystkie kroki
> odhaczone = zakończ pętlę (stop) i podsumuj.

## Kontekst

Spec zatwierdzony przez usera:
`docs/superpowers/specs/2026-08-11-przelozenie-treningu-onboarding-marketing-design.md`.
Czytaj go W CAŁOŚCI przed pierwszym krokiem każdej iteracji. Obowiązuje
CLAUDE.md projektu (zasady Karpathy, checklist wdrożeniowy, i18n w OBU plikach,
scenariusze sekwencji, dane usera święte).

## Twarde zasady

1. **Fakty z kodu, nie z pamięci.** Przed krokiem dotykającym planu/zgód
   przeczytaj realne pliki (resolver dnia: `src/data/trainingPlan.ts` i
   `functions/src/garmin-day.ts`; zgody: `ConsentCheckboxes`, `Onboarding.tsx`,
   `recordConsent`). Spec podaje intencje, kod podaje prawdę.
2. **Chirurgicznie**: jeden krok = jeden commit z opisem. Żadnych poprawek
   "przy okazji".
3. **Niezmienniki (zasada #5)**: przełożenie nie zmienia historii, draftów,
   ćwiczeń dnia, progresji, cykli ani id dni (X19). Gate/Settings zgód nie
   zmieniają zachowania. Do KAŻDEJ nowej ścieżki dopisz test, że stara ścieżka
   nadal ma wszystko.
4. **Test przed fixem** (vitest; rules przez `test:rules`, functions przez ich
   runner). Bramki przed odhaczeniem kroku: `npm run test`, `typecheck`, `lint`
   (+ testy functions/rules gdy krok ich dotyka).
5. **Sekwencje, nie ekrany**: kroki 5 i 8 mają obowiązkowe testy sekwencji
   opisane w specu (przerwania + granica tygodnia).
6. **Zapis zgody = przez istniejący `recordConsent`**, odmowa też do logu.
   Zero dark patterns (obie opcje widoczne, brak pre-selekcji).
7. **Deploy (krok 12) jest PRE-AUTORYZOWANY** przez usera w sesji planowania
   2026-08-11 ("razem z testami i wdrożeniem na wszystkie serwisy"). Wykonuj
   bez pytania, ale z bezpiecznikami: `pgrep -fl "xcodebuild|release-ios"`
   przed release, numery wersji ODCZYTANE z repo (nie zakładaj), po web-deployu
   weryfikacja hash na live. Wyjątek: jeżeli bramki NIE są w komplecie zielone,
   STOP i pytanie do usera.

## STAN (odhaczaj [x] po weryfikacji, commituj ten plik razem z krokiem)

- [x] **1. Resolver + model.** Czysta funkcja `resolvePlannedDay(dateISO,
  planDays, scheduleOverrides)` w jednym module web; reguły ze specu
  (override → weekday fallback, null = wolne, osierocony dayId ignorowany).
  Wspólny fixture przypadków (do parity z functions). Testy jednostkowe
  wszystkich reguł.
- [x] **2. Rules.** `scheduleOverrides` w hasOnly dokumentu planu + walidacja
  kształtu (mapa, klucze YYYY-MM-DD, wartości string|null). Testy rules
  czerwone → zielone (`test:rules`, JDK21).
- [x] **3. Zapis/odczyt.** `useTrainingPlan` (albo właściwy właściciel zapisu
  planu): zapis atomowy przeniesienia ({A: null, B: dayId} / swap), pruning
  >28 dni, czyszczenie przy zmianie/resecie planu, offline jak reszta planu.
  Testy: atomowość, pruning, czyszczenie, LWW.
- [x] **4. UI przełożenia.** Bottom sheet (14 dni, zajętość, komunikat swap)
  + akcja na karcie dnia + baner niezrobionego treningu ([Zrób dziś] /
  [Przełóż] / odrzucenie z pamięcią). Blokady: żywy draft dnia, dzień
  ukończony, tylko dziś-i-przód. Testy komponentów + i18n PL/EN.
- [x] **5. Test sekwencji przełożenia.** Scenariusz 8 ze specu (przełóż →
  start → wyjście → szybki trening → powrót → dokończenie → sync) + granica
  tygodnia (przypadek 5). Dashboard/WorkoutDay spójne po każdym kroku.
- [x] **6. garminDay.** Mirror resolvera w `functions/src/garmin-day.ts`
  (czyta scheduleOverrides), testy w `garmin-day.test.ts` + test parity
  web↔functions na wspólnym fixture (wzorzec cross-platform-contract).
- [x] **7. Watch preview + e2e.** Test w `watch-plan-preview.test.tsx`
  (przełożony dzień widoczny w preview). Hak e2e-mock seeduje overrides;
  `e2e:mock` zielone (przy failach NAJPIERW świeży dev server, zasada #9).
- [x] **8. Krok marketingowy.** Komponent kroku (nagłówek, korzyści, mock
  powiadomienia w HTML/CSS, [Jasne, wchodzę!] / [Nie, dzięki]), pozycja wg
  specu (przedostatni przed zgodami prawnymi; potwierdź strukturą
  `Onboarding.tsx`), i18n PL/EN. Testy: granted/declined/wstecz-bez-zapisu,
  onboarding kończy się w obu ścieżkach, awaria zapisu nie wywraca flow.
- [x] **9. Checkboxy 4→3.** Wariant onboardingu `ConsentCheckboxes` bez
  marketingu (parametryzacja, NIE zmiana globalna). Testy: onboarding ma 3,
  ConsentGate i ConsentSettings bez regresu (ich istniejące testy zielone
  bez zmiany asercji), parity wersji dokumentów bez zmian.
- [x] **10. Bramki całości.** `npm run test` + `typecheck` + `lint` +
  `npm run build` + `build:mobile` + `check:dist-smoke` + testy functions +
  `test:rules` + `e2e:mock`. Wszystko zielone.
- [x] **11. DECYZJE.md.** Wpis: co, dlaczego, spec, weryfikacja, commity.
- [x] **12. Deploy wszystkie serwisy (pre-autoryzowany, zasada 7).**
  Kolejność: rules → functions (garminDay) → web `npm run deploy` +
  weryfikacja hash live → iOS: pgrep, bump CURRENT_PROJECT_VERSION z repo
  (+1, 6 wystąpień), `scripts/release-ios.sh "<co testować>"` (auto
  dystrybucja obu grup w skrypcie; potwierdź w outputcie HTTP 204/204/200
  i betaReviewState, inaczej dogoń `testflight_external.py`) → Android:
  bump versionCode (+1), `build:mobile` + `cap sync android` +
  `gradlew bundleRelease`, weryfikacja `jar verified` + SHA-256 do DECYZJE.
  Upload do Play POZA zakresem (weryfikacja konta u Google).
- [x] **13. Zamknięcie.** Aktualizacja DECYZJE.md o dowody deployu
  (hash weba, nr builda iOS, SHA AAB), push, podsumowanie dla usera:
  co zmienione, jakie testy, co zostało po jego stronie (testy urządzeniowe:
  scenariusz przełożenia + onboarding na TestFlight; Play po weryfikacji).

## Koniec pętli

Wszystkie kroki odhaczone = stop pętli i podsumowanie (co zmienione, jakie
testy, dowody deployu, co czeka po stronie usera).
