# WP-B (X28): Dashboard — respektowanie daty startu planu wszędzie + zamykany baner ukończenia

> **For agentic workers:** TDD, przeczytaj `docs/plans/x28/00-OVERVIEW.md` + global constraints x27.

**Goal:** (1) przy planie startującym w przyszłości Dashboard NIGDY nie pokazuje sesji sprzed startu (zgłoszenie: "NEXT SESSION · MONDAY · AUG 24" przy starcie 7 września) — guard przestaje być opt-in per call-site; (2) baner "Workout completed" ma X i po zamknięciu nie wraca do końca dnia.

**Root cause (rozpoznanie 2026-08-21, dokładne file:line):**
- `resolvePlannedDay/getScheduledTrainingForDate/getNextScheduledTraining` przyjmują `startDateISO` jako OPCJONALNY argument (plan-schedule.ts:75-89/:91-110/:145-163); Dashboard NIE podaje go w 4 miejscach: `Dashboard.tsx:363, :374, :381, :401` + `getScheduledTrainingForDate` :378.
- Kolejność branchy memo `todayTraining` (:344-405): branch `completed` (:355) jest PRZED guardem pre-start (:371). `findWorkoutForRoute(..., allowDateFallback: true)` na :351 nie dostaje `today` (w przeciwieństwie do :392) i łapie dzisiejszy ukończony trening → branch completed omija pre-start i liczy next czystą regułą weekday → 24.08.
- Test X27 `plan-start-date.test.tsx:175-200` sprawdzał pre-start BEZ ukończonego dziś treningu — stąd zielony.
- Inni nieszczelni konsumenci: `DayPlan.tsx:40-41` (bez overrides I bez startu), `MissedWorkoutBanner.tsx:61` (`resolvePlannedDay` bez startu, mimo że prop `planStartDate` wchodzi w :48), `lib/missed-workout.ts:39`, `lib/schedule-overrides.ts:77-79`, wewnętrzny call `plan-schedule.ts:101`, `getScheduledTrainingWeek:127` i `countRemainingWorkouts:208` (brak parametru startu).
- Dane usera NIE są rozjechane (obie zakładki czytają `training_plans.startDate` = 2026-09-07); samonaprawa niepotrzebna.
- Baner: `Dashboard.tsx:961-992` (`today-completed-card`), zero dismissu. Najlepszy wzorzec: signature per data — `fittracker_nextstep_dismissed` (Dashboard.tsx:304-313) + przycisk X wzorem `MissedWorkoutBanner.tsx:85-92`.

**Files:**
- Modify: `src/lib/plan-schedule.ts`, `src/pages/Dashboard.tsx`, `src/pages/DayPlan.tsx`, `src/components/MissedWorkoutBanner.tsx`, `src/lib/missed-workout.ts`, `src/lib/schedule-overrides.ts`
- Mirror: `functions/src/garmin-day.ts` + fixture `fixtures/cross-platform/schedule-overrides-v1.json` TYLKO jeśli zmieniasz semantykę resolvera (dodanie przekazywania startu w getScheduledTrainingWeek/countRemainingWorkouts = zmiana sygnatur, mirror sprawdź greppem czy ma odpowiedniki)
- Test: `src/test/plan-start-date.test.tsx` (rozszerzenie o scenariusz z buga), `src/test/dashboard-completed-dismiss.test.tsx` (nowy)
- i18n: anchor `dash.*` (klucz `dash.dismissCompleted` aria-label, PL "Zamknij", EN "Dismiss" — sprawdź czy `a11y.close` nie wystarczy: preferuj reuse)

## Architektura fixu (strukturalna, nie łatka)

1. **Kolejność branchy:** guard pre-start (`today < parseLocalDate(planStartDate)`) przesunięty PRZED branch `completed` w `todayTraining` — przy planie w przyszłości zawsze preStart, niezależnie od dzisiejszych treningów. (Dzisiejszy ukończony trening przy przyszłym planie = trening ad-hoc/stary plan; hero preStart z datą startu jest poprawne.)
2. **Domknięcie w węźle:** w `Dashboard.tsx` wszystkie wywołania `getNextScheduledTraining`/`getScheduledTrainingForDate` dostają `startDateISO: planStartDate`. Analogicznie DayPlan (dodaj też brakujące `overrides`!), MissedWorkoutBanner (:61), `missed-workout.ts:39` (dodaj parametr przewleczony od konsumentów), `schedule-overrides.ts:77-79` (buildScheduleMove — dodaj OPCJONALNE `planStartDateISO` w opts i przekaż z call-site'u w Dashboard). **`TrainingPlan.tsx` to własność WP-C — NIE dotykaj**; jego call-site buildScheduleMove/moveScheduledDay zostaje bez parametru (parametr opcjonalny = zero regresji) i odnotuj w raporcie do domknięcia w batchu 2.
3. **Wewnętrzna spójność biblioteki:** `plan-schedule.ts:101` przekazuje startDateISO do wewnętrznego `resolvePlannedDay`; `getScheduledTrainingWeek` i `countRemainingWorkouts` dostają opcjonalny `startDateISO` i filtrują dni sprzed startu; przejrzyj ich konsumentów greppem i przekaż start tam, gdzie plan/hook go ma (chirurgicznie; konsument bez dostępu do startu = zostaw, odnotuj).
4. **Dismiss banera:** `fittracker_completed_dismissed_v1` w localStorage = ostatnio zamknięta data (`todayKey`); warunek renderu banera + X (44 px tap target). Hero NEXT SESSION (:990) renderuje się DALEJ po dismissie (dismiss obejmuje tylko div :965-986).

## Edge cases (testy obowiązkowe)

1. **Scenariusz buga 1:1:** plan ze startem +2 tygodnie (poniedziałek), DZIŚ ukończony trening (data dzisiejsza, completed) → hero = preStart z datą startu; ŻADNE "next session" przed startem. (To jest dokładnie luka testu X27 — dopisz do plan-start-date.test.tsx.)
2. Plan wystartowany (start w przeszłości) + ukończony dziś → branch completed jak dotąd, next uwzględnia start (bez zmian obserwowalnych).
3. Dismiss: X chowa baner; re-render tego samego dnia → nadal schowany; zmiana daty (mock jutro) → baner wraca przy nowym ukończonym treningu; localStorage niedostępny (throw) → baner działa bez dismissu (try/catch jak we wzorcu).
4. buildScheduleMove z planStartDateISO: target przed startem niedozwolony (reason 'before-start' lub reuse istniejącego kształtu — spójnie z completedDates z X27).
5. DayPlan: dzień sprzed startu nie pokazuje treningu planowego.

## Tasks

- [ ] **B1 (TDD scenariusz buga):** rozszerz `plan-start-date.test.tsx` o Edge 1 (fixture przez canonical-states: stan active-plan z przyszłym startem + dzisiejszy completed workout — rozszerz moduł canonical-states o wariant, nie klep ręcznie). Run → FAIL (reprodukcja!).
- [ ] **B2:** kolejność branchy + startDateISO w Dashboard (Architektura 1-2). Run → PASS.
- [ ] **B3 (TDD):** testy Edge 4-5 → implementacja Architektura 2-3 (DayPlan, MissedWorkoutBanner, missed-workout, schedule-overrides, plan-schedule wewnętrznie; mirror Garmin jeśli dotyczy) → PASS. Test parytetu cross-platform → zielony.
- [ ] **B4 (TDD):** `dashboard-completed-dismiss.test.tsx` wg Edge 3 → implementacja dismissu → PASS.
- [ ] **B5:** `npx vitest run` + typecheck + lint + route sweep zielone; raport (w tym: które wywołania świadomie zostawione bez startu).

## Pułapki

- `findWorkoutForRoute` na :351: NIE zmieniaj jego semantyki globalnie (inne call-site'y polegają na fallbacku) — fix przez kolejność branchy, nie przez grzebanie w lookupie.
- Mirror Garmin + fixture parytetu przy KAŻDEJ zmianie semantyki resolvera.
- Radix nie dotyczy (baner to div, nie dialog).
