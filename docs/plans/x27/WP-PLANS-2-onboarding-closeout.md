# WP-PLANS-2: Onboarding krok 5 (nazwa, data startu, tygodnie) + data startu w replanie + bogatszy closeout z udostępnianiem

> **For agentic workers:** wykonuj task-by-task, TDD. Przeczytaj `00-OVERVIEW.md` i `WP-PLANS-1-lifecycle.md` (Interfaces — `planStatus`, `MIN/MAX_PLAN_WEEKS`, `endPlan`). Ten pakiet startuje PO zakończeniu WP-PLANS-1 w tej samej linii.

**Goal:** (1) finalny krok onboardingu (05/05, "Your Personalized Training Plan") zawiera: edytowalną NAZWĘ planu, wybór DATY STARTU (przeniesiony z kroku 4) i wybór LICZBY TYGODNI; (2) replan (`/new-plan` po zakończeniu planu) też ma wybór daty startu — i wybrana data jest FAKTYCZNIE respektowana (bug usera: wybrał 7 września, sesje pojawiły się od 24 sierpnia); (3) ekran closeout ("Phase complete") pokazuje dodatkowo łączny czas na siłowni i ma przycisk udostępniania (obraz z podsumowaniem).

**Architecture:** start planu przechodzi przez `startCycleWithPlan` (`cycle-actions.ts:80-130`), który dziś PRZYCIĄGA start do poniedziałku bieżącego tygodnia (`:85-87`) — to źródło buga z datą. Rozszerzamy o jawny parametr `startDateISO` (przyszły poniedziałek wybrany przez usera). Nazwa planu = nowe pole `name` na `training_plans` (rules hasOnly — blok już rozszerzany przez WP-PLANS-1 o `status`; dodaj `name` analogicznie). Share: wzorem istniejącego share'a treningu (grep `ShareWorkoutDialog` — html2canvas-pro/navigator.share).

**Tech stack:** React + TS, vitest.

**Spec / kontekst (ustalone rozpoznaniem + zrzuty usera):**
- Onboarding: `src/pages/Onboarding.tsx:83-118` → `completeOnboardingPlan` (`cycle-actions.ts:132-164`). Krok 4 = data startu (guard przyszłego startu istnieje od v6.9.4 — grep `futureStart`/`planStarted`). Krok 5 = podsumowanie planu (zrzut: PLAN NAME, DURATION, FREQUENCY, ESTIMATED VOLUME, lista dni, Browse plans / Build your own, REVIEW PLAN).
- Replan: `src/pages/NewPlan.tsx:143` (`startCycleWithPlan(reviewDays, chosen.durationWeeks, …)`) — BEZ daty startu w UI.
- `startCycleWithPlan:85-87`: „new start snapped to Monday" — snapowanie do poniedziałku BIEŻĄCEGO tygodnia niezależnie od intencji usera.
- Closeout ("Phase complete"): zrzut usera pokazuje GOLD SEASON + 4 kafle (46/48 workouts, 287.3 t, 96% attendance, 24 PRs) + CTA "CHOOSE A NEW PLAN". Komponent: grep w src/ po `Phase complete`/`CYCLE SUMMARY`/`closeout` (prawdopodobnie strona/komponent Closeout, z `canCloseout` w `cycle-insights.ts:235`).
- `WorkoutSession.durationSec` istnieje (`src/types/index.ts`, test fixture `durationSec: 4320`).
- `PlanCycleStats` = `{ totalWorkouts, totalTonnage, prs, completionRate }` (`src/types/cycles.ts:3-14`) — bez czasu.

**Files:**
- Modify: `src/pages/Onboarding.tsx`, `src/pages/NewPlan.tsx`, `src/lib/cycle-actions.ts` (parametr startDateISO + pole name), `src/lib/plan-schedule.ts` (TYLKO jeśli potrzebny guard przed startDate — najpierw sprawdź istniejący guard przyszłego startu), `firestore.rules` (blok training_plans: + `name`), `src/lib/firestore-doc-guards.ts` (+ name), `src/lib/training-plan-save.ts` (+ name przez transakcję), komponent closeout (znajdź wg Spec), `src/components/RescheduleSheet.tsx` NIE ruszaj (WP-A batch 1) — respektowanie startu MUSI wyjść z `resolvePlannedDay`/danych, nie z łatki w sheecie
- Create: `src/components/CycleShareCard.tsx` (obraz podsumowania do share) — TYLKO jeśli istniejący share nie da się sparametryzować
- Test: `src/test/cycle-actions.test.ts` (rozszerz), nowy `src/test/plan-start-date.test.tsx`, nowy/rozszerzony test closeout, test onboardingu (grep istniejące `onboarding` testy)
- i18n: anchory `ob.*` / `newplan.*` / `cycles.*`

**Interfaces:**
- Produces: `startCycleWithPlan(days, durationWeeks, opts: { …dotychczasowe, startDateISO?: string, planName?: string })` — `startDateISO` (poniedziałek, walidowany: >= poniedziałek bieżącego tygodnia, <= +8 tygodni) zastępuje snap „na dziś"; brak = dotychczasowe zachowanie. `planName` zapisywane na training_plans.
- Produces: `training_plans.name?: string` (≤60 znaków, sanityzowane), hydracja w guards, wyświetlane w: krok 5 onboardingu, review replanu, `/plan` (nagłówek jeśli jest miejsce), closeout.

## Edge cases

1. **Respektowanie daty startu (bug usera):** po starcie z `startDateISO` = przyszły poniedziałek — (a) Dashboard hero pokazuje pierwszą sesję od tej daty (z datą — WP-A A4b już to renderuje), (b) `/plan` nie pokazuje sesji przed startem, (c) RescheduleSheet nie pokazuje occupantów przed startem (wynika z `resolvePlannedDay` — jeśli resolver zwraca dni przed startDate, TO jest miejsce fixu: dzień planowy istnieje dopiero od startDate). Test sekwencji obowiązkowy (patrz O2).
2. Data startu w przeszłości → odrzucona walidacją UI (min = poniedziałek bieżącego tygodnia).
3. Wybór daty = wybór z listy najbliższych poniedziałków (np. 8 opcji) — spójnie z krokiem 4 onboardingu (sprawdź jak krok 4 to robi i przenieś ten sam komponent/wzorzec).
4. Nazwa planu: pusta → fallback do nazwy szablonu/"Mój plan" (i18n); trim; max 60 znaków; bez walidacji znaków (user może po polsku).
5. Closeout czas łączny: suma `durationSec` ukończonych sesji cyklu; sesje bez `durationSec` liczą się jako 0; format "42 h 15 m" (PL "42 godz. 15 min" — użyj istniejącego formattera czasu jeśli jest, grep `durationSec` formatery).
6. Share: obraz 1080x1350 (4:5) z: nazwa planu/cyklu, zakres dat, 4 metryki + czas łączny, branding "Strength Save"; przez `navigator.share` (native) z fallbackiem do pobrania/przekazania — DOKŁADNIE wzorem istniejącego share treningu (nie wymyślaj nowego mechanizmu). Zero danych wrażliwych poza statystykami.
7. Onboarding: przeniesienie daty startu z kroku 4 do 5 — jeśli krok 4 zawiera TYLKO datę startu, usuń krok i zaktualizuj progres (04/04→05/05 wg tego co zostanie; pasek kroków musi się zgadzać); jeśli krok 4 ma też inne ustawienia, przenieś samą datę. Wybory z kroku 5 (nazwa, data, tygodnie) trafiają do `completeOnboardingPlan` → `startCycleWithPlan`.
8. Stary flow bez zmian dla usera, który nic nie zmienia: defaulty = dzisiejszy tydzień, nazwa z szablonu, duration z rekomendacji — ZERO dodatkowych wymaganych kliknięć (niezmiennik: nowa funkcja nie zabiera nic istniejącemu przepływowi).

## Tasks

### Task O1: pole `name` + parametr `startDateISO` w silniku (TDD)

- [ ] Testy w `src/test/cycle-actions.test.ts`: (a) `startCycleWithPlan(..., { startDateISO: <przyszły poniedziałek> })` → plan.startDate == podana data, cykl.startDate == podana data, day ids mintowane z tej daty; (b) `planName` zapisany; (c) bez opts — zachowanie identyczne jak dziś (snapshot istniejących asercji). Run → FAIL.
- [ ] Implementacja `cycle-actions.ts` (+ walidacja poniedziałku — reuse `getStartOfPlanWeek` z plan-schedule). Rules: `name` w hasOnly bloku training_plans + `is string && size() <= 60`. Guards + training-plan-save przepuszczają pole.
- [ ] `npm run test:rules` + vitest → PASS.

### Task O2: respektowanie przyszłego startu w harmonogramie (TDD, test SEKWENCJI)

- [ ] Test `src/test/plan-start-date.test.tsx` (sekwencja, nie pojedynczy ekran): start planu z datą +2 tygodnie → (1) `resolvePlannedDay` zwraca null dla dat przed startDate, (2) `getNextScheduledTraining` zwraca pierwszą sesję >= startDate, (3) Dashboard hero renderuje tę datę, (4) RescheduleSheet (render z tym planem) nie pokazuje occupantów przed startDate. Run → sprawdź co faktycznie failuje (guard przyszłego startu z v6.9.4 może już część załatwiać — fix TYLKO tego, co czerwone).
- [ ] Implementacja w `plan-schedule.ts` (guard `dateISO < startDate → null` w `resolvePlannedDay`) — UWAGA: mirror w `functions/src/garmin-day.ts` + fixture `fixtures/cross-platform/schedule-overrides-v1.json` (parytet! jeśli zmieniasz resolver, zaktualizuj mirror i fixture oraz odpal test parytetu — grep `cross-platform`).
- [ ] Run → PASS.

### Task O3: UI daty startu + nazwy + tygodni w kroku 5 i replanie

- [ ] Test onboardingu: krok 5 zawiera pole nazwy (default z rekomendacji), selektor daty startu (default: bieżący tydzień) i kontrolę tygodni (chipsy+custom z WP-PLANS-1, import `MIN/MAX_PLAN_WEEKS`); zmiany trafiają do wywołania `completeOnboardingPlan`/`startCycleWithPlan` (mock, asercja argumentów).
- [ ] Implementacja `Onboarding.tsx` (+ przeniesienie/usunięcie kroku 4 wg Edge 7) i `NewPlan.tsx` (te same 3 kontrolki w kroku review; data startu default = najbliższy rozsądny poniedziałek).
- [ ] i18n: `ob.planName` (PL "Nazwa planu"/EN "Plan name"), `ob.startWeek` (PL "Start planu"/EN "Plan start"), reuse kluczy tygodni z WP-PLANS-1; anchory `ob.*`/`newplan.*`.
- [ ] Run → PASS.

### Task O4: closeout — czas łączny + udostępnianie

- [ ] Znajdź komponent closeout (Spec). Test: przy cyklu z sesjami durationSec 3600+5400 renderuje kafel/wiersz "TIME AT GYM"/"CZAS NA SIŁOWNI" = "2 h 30 m"; przycisk share widoczny.
- [ ] Implementacja: 5. metryka (czas, licz z workoutów cyklu — te same dane co pozostałe kafle) + przycisk "Udostępnij" uruchamiający istniejący mechanizm share z kartą podsumowania (nazwa planu jeśli jest, zakres, 5 metryk). i18n `cycles.timeAtGym`, `cycles.shareSummary`.
- [ ] Run → PASS.

### Task O5: finał pakietu

- [ ] `npx vitest run` + `npm run typecheck` + `npm run lint` + `npm run test:rules` → zielone.
- [ ] Raport: co przeniesione w krokach onboardingu, czy guard startu wymagał zmiany resolvera (i czy mirror Garmin zaktualizowany), decyzja share (reuse czego).

## Pułapki

- Resolver `resolvePlannedDay` ma MIRROR w functions (Garmin) + fixture parytetu — niezsynchronizowana zmiana = rozjazd zegarka z apką.
- Zmiana liczby kroków onboardingu → sprawdź testy e2e onboardingu (selektory kroków) i zaktualizuj specy (bez uruchamiania).
- Nie ruszaj `RescheduleSheet.tsx` (WP-A go zmienił w batchu 1) — poprawność ma wyjść z danych/resolvera.
- Share: żadnych zewnętrznych hostów (obraz lokalnie, navigator.share).
