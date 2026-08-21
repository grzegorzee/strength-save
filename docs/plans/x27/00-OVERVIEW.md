# Fala X27 — plan przeglądowy (2026-08-21)

> **For agentic workers:** każdy pakiet WP-* w tym katalogu to samodzielny plan wdrożeniowy.
> Wykonuj TYLKO swój pakiet, w jego granicach plików. Kolejność batchy jest wiążąca.

**Goal:** naprawa bugów z TestFlight 113 + pakiet funkcji (Ćwiczenia redesign, pomiary/foto, Strava, cykl życia planu, UI polish) — spójnie, bez regresji, gotowe do wydania web + iOS 114 + AAB 29.

**Spec:** żądania usera z 2026-08-21 (zrzuty TestFlight) + design `docs/plans/x27/design-exercises-tab.md`.

## Stan wyjściowy

- **P0 (crash Historii E-8UE4S) już NAPRAWIONY** w commicie `e4b6afc0` (main loop, przed startem agentów). Nie ruszać.
- Baza: `main` od `e4b6afc0`. iOS build następny = **114**, Android versionCode następny = **29** (bumpuje orkiestrator na końcu, NIE agenci).

## Batche (twarda kolejność, brak nakładania plików w ramach batcha)

| Batch | Pakiety | Uwagi |
|---|---|---|
| 1 | WP-A (dashboard: reschedule guard, baner, data next session), WP-B (profil/konto), WP-C (Strava), WP-IMG (zdjęcia grup) | WP-IMG nie dotyka src/ poza odczytem |
| 2 | WP-D (pomiary/foto), WP-E (zakładka Ćwiczenia), linia planów: WP-PLANS-1 → WP-PLANS-2 (SEKWENCYJNIE) | WP-D i linia planów dotykają `firestore.rules` — różne bloki, trzymać się anchorów |
| 3 | WP-F (UI polish: liquid glass, X w popupach, plate calculator, sweep pauz — em/en-dash) | solo, bo dotyka współdzielonych prymitywów i i18n globalnie |
| 4 | Release train (orkiestrator, main loop) | testy, e2e, build, deploy web+functions+rules, iOS 114, AAB 29 |

Dodatkowe wymagania usera z 2026-08-21 (test end-plan/replan na urządzeniu) wcielone do pakietów:
3 opcje dialogu kończenia planu, auto-koniec planu, znikający baner closeout, stan "brak planu",
data startu w replanie + BUG respektowania daty startu, krok 5 onboardingu (nazwa planu, data startu,
liczba tygodni), szablon "Full Body Workout", closeout z czasem na siłowni + share, data przy
NEXT SESSION, zero długich pauz w copy.

## Global constraints (obowiązują KAŻDY pakiet)

1. **Karpathy + CLAUDE.md projektu** — przeczytaj `CLAUDE.md` w repo przed startem. Zmiany chirurgiczne, tylko własny obszar.
2. **TDD**: najpierw test odtwarzający wymaganie/bug (vitest), potem implementacja, potem zielone. Komendy: `npx vitest run <plik>` (celowane), na końcu pakietu pełne `npx vitest run` + `npm run typecheck` + `npm run lint`.
3. **i18n**: każdy nowy klucz do OBU plików `src/i18n/locales/pl.ts` i `en.ts` (pl.ts = source of truth typu). **Anchor insertions** (żeby batch się nie gryzł): WP-A kotwiczy przy istniejących kluczach `dash.*` / `reschedule.*`, WP-B przy `profile.*`, WP-C przy `strava.*`, WP-D przy `measurements.*`, WP-E przy `exercises.*` / `library.*`, WP-PLANS przy `cycles.*` / `planbuilder.*`, WP-F przy `a11y.*` / `settings.*`. Wstawiaj NOWE klucze bezpośrednio po ostatnim istniejącym kluczu swojego namespace'u, nigdy na końcu pliku.
4. **Zakazy designowe**: zero `color-mix()` w src/ (guard test), tła statusów zawsze z `/10`, hover gated. Radix Sheet/Dialog NIGDY nie unmountować w stanie open.
5. **Firestore**: kg/cm kanoniczne, zamknięte schematy w rules (`hasOnly`) — nowe pole = update listy w rules + sanitizer (`firestore-doc-guards.ts`) + testy rules jeśli dotyczy.
6. **Żadnych commitów przez agentów batcha.** Agent zostawia working tree z przechodzącymi testami. Commity per pakiet robi orkiestrator po weryfikacji batcha (rollback punktowy per pakiet).
7. **Środowisko siłowni**: ekran gaśnie → JS wstrzymany. Nic krytycznego na setTimeout/setInterval. Sygnały w tle = local notifications / push.
8. **Nie odpalaj e2e (playwright) w batchu** — e2e biegnie raz, w release train (stary dev server = znane flaki). Wyjątek: nie dotyczy.
9. **Nie ruszaj**: `ios/`, `android/`, `package.json` wersje, `CURRENT_PROJECT_VERSION`, deploy skrypty. Nowe zależności npm: TYLKO tam, gdzie plan pakietu jawnie na to pozwala (WP-D: react-easy-crop).
10. Teksty UI: PL pełne znaki, bez em/en-dash w nowych stringach (poza istniejącym wzorcem separatora `·` i zakresów dat, który już jest w apce).

## Granice plików (kto czego NIE dotyka)

- `src/pages/Dashboard.tsx`: tylko WP-A (batch 1) i WP-PLANS (batch 2 — inne linie, stan "brak aktywnego planu").
- `src/hooks/useTrainingPlan.ts`: WP-A (moveScheduledDay guard) w batchu 1, WP-PLANS w batchu 2.
- `functions/src/index.ts`: WP-C (komunikat cooldown, jeśli trzeba) i WP-D (eksport nowej funkcji) — różne linie, różne batche.
- `firestore.rules`: WP-D (blok measurements) i WP-PLANS (blok training_plans) — ten sam batch, RÓŻNE bloki; edytuj przez unikalne anchory swojego bloku.
- `src/index.css` + `src/components/ui/*` + `AppNavigation.tsx` + `AppHeader.tsx`: tylko WP-F.
- `src/pages/ExerciseLibrary.tsx` + `src/lib/exercise-media.ts` + `public/exercise-groups/`: WP-E (WP-IMG tylko zapisuje pliki do `public/exercise-groups/`).
- `src/i18n/locales/*`: wszyscy, ale wyłącznie przez anchory namespace'ów (pkt 3).

## Protokół zakończenia pakietu (każdy agent)

1. `npx vitest run` całość — zielone (jeśli padają testy SPOZA twojego obszaru, sprawdź czy to nie twoja wina; jeśli nie twoja, zaraportuj, nie naprawiaj cudzych).
2. `npm run typecheck` i `npm run lint` — zielone.
3. Raport końcowy: lista zmienionych plików, co zrobione per zadanie planu, odstępstwa od planu z uzasadnieniem, znane ograniczenia, co wymaga testu na urządzeniu.
