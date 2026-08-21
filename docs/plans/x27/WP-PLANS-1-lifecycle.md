# WP-PLANS-1: Cykl życia planu — kończenie (3 opcje), auto-koniec, stan "brak planu", długość 2-36 tyg., szablon FBW

> **For agentic workers:** wykonuj task-by-task, TDD. Przeczytaj `00-OVERVIEW.md`. Po tym pakiecie w tej samej linii rusza WP-PLANS-2 (onboarding/replan/closeout) — trzymaj kontrakty z sekcji Interfaces.

**Goal:** (1) plan można zakończyć w trakcie — dialog z TRZEMA opcjami: "Zakończ i wybierz nowy" / "Zakończ plan" (bez wybierania nowego) / "Anuluj"; (2) plan kończy się AUTOMATYCZNIE po upływie `durationWeeks` (archiwizacja + ekran closeout); (3) po zakończeniu apka ma prawdziwy stan "brak aktywnego planu" (dashboard/plan/day nie planują z martwego planu, baner "cycle ending / decide what's next" znika); (4) długość planu wybieralna 2-36 tygodni + własna liczba, także dla szablonów; (5) w "Browse plans" jest szablon o nazwie "Full Body Workout" (FBW).

**Architecture:** silnik zmiany planu istnieje (`startCycleWithPlan`), archiwizacja istnieje (`archiveCurrentPlan` — ustawia `status:'completed'`, `endDate`, przycina `durationWeeks` do przepracowanych tygodni). Brakuje: stanu "ended" na dokumencie planu, opcji "zakończ bez nowego", auto-endu i kontroli długości. Wprowadzamy pole `status: 'active' | 'ended'` na `training_plans/{uid}` (default 'active' dla istniejących docków bez pola).

**Tech stack:** React + TS, Firestore rules, vitest.

**Spec / kontekst (ustalone rozpoznaniem):**
- Plan doc: `training_plans/{userId}`, zamknięty schemat `firestore.rules:188-191` (`hasOnly([days, durationWeeks, startDate, updatedAt, revision, progression, scheduleOverrides, skippedDates, reducedMode, vacation])`), write gate `:262`. Hook `src/hooks/useTrainingPlan.ts` (default 12 tyg. `:42`, `currentWeek/isPlanExpired/weeksRemaining` `:186-200`, E2E localStorage mirror `:71-92, 212-245`).
- End plan UI istnieje: `src/pages/Cycles.tsx:79-103` (`handleEndPlan` → `archiveCurrentPlan` + `backfillHistoricalWorkouts` + `navigate('/new-plan?fromCycle=…')`), przycisk `:343-348` (gated `!isPlanExpired && trainingPlan.length>0 && activeCycle`), dialog `:353-367`; i18n `cycles.endPlan*` pl.ts:485-490.
- `handleEndPlan` NIE dotyka `training_plans` — po zakończeniu `/plan`, `/day`, Dashboard hero i Watch preview dalej planują z doca. Jedyny sygnał "ended" = derywat `currentPlanArchived`/`planEnded` w `Dashboard.tsx:229-233` (lokalny!).
- Zmiana planu: `startCycleWithPlan` `src/lib/cycle-actions.ts:80-130` (start przyciągany do poniedziałku `:85-87`, `assignCycleDayIds`, archive+backfill starego, inbox event). "Zmień plan" na `/cycles` gated przez `canCloseout` (`Cycles.tsx:246-254`, gate `cycle-insights.ts:235`).
- Durations: JEDYNY selektor `DURATIONS = [8,10,12,16]` `src/components/PlanDaysEditor.tsx:42` (chipsy `:281-299`); szablony mają sztywne `durationWeeks` w `src/data/planTemplates.ts` i ZERO kontroli w `PlanWizard.tsx:227` (`confirmTemplate`). Brak stałych min/max, rules sprawdzają tylko `is number`.
- Sanitizer: `firestore-doc-guards.ts:188` (fallback 12), clampy save: `useTrainingPlan.ts:202-270` (`savePlan`), `training-plan-save.ts:45` + transakcja `:62-104` (align X19 — NIE ruszaj mechaniki align/revision).
- Baner "cycle ending / decide what's next": rekomendacja z `cycle-insights.ts` renderowana w `Cycles.tsx` (grep `recommendation`), pokazuje się też po decyzji — do wygaszenia.
- Auto-rozszerzanie: klucz `cycles.autoExtended` pl.ts:493 — sprawdź semantykę (grep `autoExtended` w src/); jeśli dziś plan po terminie jest auto-przedłużany, ta logika USTĘPUJE auto-końcowi.

**Files:**
- Modify: `src/pages/Cycles.tsx`, `src/hooks/useTrainingPlan.ts`, `src/lib/training-plan-save.ts`, `src/lib/firestore-doc-guards.ts`, `src/lib/cycle-actions.ts`, `src/components/PlanDaysEditor.tsx`, `src/components/PlanWizard.tsx`, `src/data/planTemplates.ts`, `src/pages/Dashboard.tsx` (stan "brak planu" + auto-end trigger), `src/pages/TrainingPlan.tsx` (stan "brak planu"), `firestore.rules` (TYLKO blok training_plans :188-262 — anchor listy `hasOnly`), `src/lib/plan-next-step.ts` (jeśli decyduje o CTA)
- Test: `src/test/cycle-actions.test.ts`, `src/test/training-plan-save.test.ts`, nowy `src/test/plan-ended-state.test.tsx`, nowy/rozszerzony test PlanDaysEditor, `npm run test:rules` po zmianie rules
- i18n: anchory `cycles.*` i `planbuilder.*`

**Interfaces (dla WP-PLANS-2 i reszty apki):**
- Produces: `useTrainingPlan()` zwraca dodatkowo `planStatus: 'active' | 'ended' | 'none'` (`'none'` = brak doca/dni). Pole doc: `status?: 'active' | 'ended'` (brak pola = 'active' — kompatybilność wsteczna). `endPlan(opts: { chooseNew: boolean })` w `src/lib/cycle-actions.ts` — archiwizuje cykl + backfill + ustawia `status:'ended'` na planie + event inbox; przy `chooseNew` caller nawiguję do `/new-plan`.
- Produces: stałe `MIN_PLAN_WEEKS = 2`, `MAX_PLAN_WEEKS = 36` eksportowane z `src/lib/training-plan-save.ts` (jedno źródło; UI i sanitizer importują stamtąd).

## Edge cases

1. Istniejące dokumenty bez `status` → traktowane jako 'active' (sanitizer default), rules akceptują dokument bez pola (pole opcjonalne w hasOnly).
2. "Zakończ plan" (bez nowego): po operacji Dashboard pokazuje stan "brak aktywnego planu" z CTA "Wybierz plan" (→ `/new-plan`); `/plan` pokazuje pusty stan z tym samym CTA; szybki trening (ad-hoc) i historia działają nadal (niezmiennik: zakończenie planu NICZEGO nie zabiera istniejącym przepływom — historia, statystyki, eksport).
3. Auto-end: wyzwalany client-side przy załadowaniu apki, gdy `elapsedWeeks >= durationWeeks` i cykl wciąż 'active' — wykonuje TĘ SAMĄ ścieżkę co ręczne "Zakończ plan" (archive + backfill + status 'ended'), po czym pokazuje closeout. Idempotentny (drugi load nic nie robi). NIE odpalaj w trakcie aktywnej sesji treningowej (draft continuable) — poczekaj do następnego wejścia.
4. Otwarty draft treningu przy końcu/zmianie planu: zachowanie jak w `e2e/plan-edit-during-workout.spec.ts` — draft nie może zniknąć; end plan przy aktywnym drafcie dnia z planu → zablokuj z komunikatem "dokończ lub odrzuć trening" (guard + i18n).
5. Duration: custom input clampowany 2-36; wartości spoza → komunikat, nie cichy clamp przy wpisywaniu (clamp na save). Sanitizer: wartości z Firestore poza zakresem → clamp do zakresu (stare dane).
6. Szablony: wybór szablonu pozwala nadpisać `durationWeeks` (default z szablonu) — kontrola w kroku potwierdzenia szablonu.
7. Baner rekomendacji ("plan ending, decide what's next"): znika gdy `planStatus !== 'active'` LUB decyzja podjęta (nowy cykl wystartował). Przycisk "Zakończ plan" przestaje być gated przez `!isPlanExpired` (plan po terminie tym bardziej można zamknąć) — ale przy auto-endzie zwykle już będzie zamknięty.
8. Watch/Garmin preview: czyta plan z doca — sprawdź `functions/src/garmin-day.ts` mirror `resolvePlannedDay`; dzień z planu 'ended' nie może być serwowany (guard po stronie klienta wysyłającego preview lub w resolverze — znajdź miejsce, minimalny diff).

## Tasks

### Task P1: pole `status` na training_plans (model + rules + sanitizer, TDD)

- [ ] Test w `src/test/training-plan-save.test.ts`: zapis planu ze `status:'ended'` przechodzi walidację/serializację; doc bez pola → sanitizer zwraca 'active'. Run → FAIL.
- [ ] `firestore.rules`: do listy `hasOnly` bloku training_plans dodaj `'status'` + walidacja `(!('status' in ...) || data.status in ['active','ended'])` wzorem sąsiednich pól. UWAGA: edytuj przez unikalny anchor bloku training_plans (WP-D w tym samym batchu edytuje blok measurements).
- [ ] `firestore-doc-guards.ts`: hydracja pola z defaultem 'active'.
- [ ] `training-plan-save.ts`: przepuszczanie pola przez transakcję zapisu (align X19 bez zmian). Eksport `MIN_PLAN_WEEKS`/`MAX_PLAN_WEEKS` + clamp `durationWeeks` w save.
- [ ] `npm run test:rules` (JDK21) + vitest → PASS.

### Task P2: `endPlan` w cycle-actions + 3 opcje w dialogu (TDD)

- [ ] Test w `src/test/cycle-actions.test.ts`: `endPlan({chooseNew:false})` — archiwizuje aktywny cykl, robi backfill, ustawia `status:'ended'` na planie, emituje event; NIE tworzy nowego cyklu. Kolejność: archive+backfill PRZED mutacją planu (bezpieczeństwo historii). Run → FAIL → implementacja w `cycle-actions.ts` (reuse `archiveCurrentPlan`; sygnatura z Interfaces) → PASS.
- [ ] `Cycles.tsx`: dialog end-plan dostaje 3 akcje: "Zakończ i wybierz nowy" (endPlan → navigate `/new-plan?fromCycle=…` jak dziś), "Zakończ plan" (endPlan, zostań na `/cycles` z closeout), "Anuluj". Przycisk "Zakończ plan" przenieś WYŻEJ w layoucie zakładki (obok/nad kartą aktywnego cyklu, nie na dnie strony) i usuń gate `!isPlanExpired`.
- [ ] i18n: `cycles.endPlanOnly` (PL "Zakończ plan", EN "End plan"), `cycles.endPlanAndChoose` (PL "Zakończ i wybierz nowy", EN "End and choose new") przy anchorze `cycles.*` (klucze `endPlan*` już istnieją — rozszerz spójnie, nie duplikuj).
- [ ] Test UI dialogu (nowy lub rozszerzony istniejący test Cycles): 3 przyciski widoczne; wariant "bez nowego" nie nawiguję do /new-plan.
- [ ] Guard draftu (Edge 4): przy aktywnym drafcie dnia planowego end-plan pokazuje toast/komunikat i nie wykonuje operacji + test.

### Task P3: stan "brak aktywnego planu" w całej apce (TDD)

- [ ] `useTrainingPlan`: wystaw `planStatus` (Interfaces). E2E localStorage mirror (`:71-92, 212-245`) musi przenosić pole.
- [ ] Test `src/test/plan-ended-state.test.tsx`: przy `status:'ended'` — (a) Dashboard nie renderuje hero NEXT SESSION z martwego planu, renderuje CTA "Wybierz nowy plan" (→ /new-plan); (b) `/plan` pokazuje pusty stan z CTA; (c) baner rekomendacji na `/cycles` nieobecny. Run → FAIL → implementacja (`Dashboard.tsx` — podmień lokalny derywat `:229-233` na `planStatus` z hooka; `TrainingPlan.tsx`; `Cycles.tsx` gate banera; `plan-next-step.ts` jeśli steruje CTA) → PASS.
- [ ] `startCycleWithPlan` (`cycle-actions.ts`): przy starcie nowego planu ustawiaj `status:'active'` (reaktywacja po ended).
- [ ] Garmin/Watch guard (Edge 8): znajdź ścieżkę preview i zabezpiecz + krótki test jeśli istnieje harness (jeśli nie ma taniego testu — implementacja + notatka w raporcie).

### Task P4: auto-koniec planu (TDD)

- [ ] Sprawdź semantykę `autoExtended` (grep). Jeśli istnieje auto-przedłużanie — wyłącz je na rzecz auto-endu (zachowaj klucz i18n, usuń wywołanie; odnotuj).
- [ ] Test w `src/test/plan-ended-state.test.tsx` (lub cycle-actions): stan elapsed >= durationWeeks + cykl 'active' + brak draftu → wywołanie auto-endu raz (idempotencja: drugi render nic nie robi); z draftem continuable → nic.
- [ ] Implementacja: hook/efekt w miejscu ładowania planu (wzorem `runCycleAutoRepair` w `cycle-actions.ts:169-177` — ta sama warstwa), wywołujący `endPlan({chooseNew:false})`-ścieżkę bez nawigacji + flaga sesyjna przeciw podwójnemu odpaleniu. Po auto-endzie user widzi closeout/CTA (stan z P3).
- [ ] Run → PASS.

### Task P5: długość planu 2-36 + custom (TDD)

- [ ] Test PlanDaysEditor: chipsy [8,10,12,16] nadal działają + pole "własna liczba" przyjmuje 2-36; 1 i 37 → komunikat walidacji, brak zapisu. Run → FAIL.
- [ ] Implementacja `PlanDaysEditor.tsx`: obok chipów input numeryczny (inputMode="numeric", label i18n `planbuilder.customWeeks` PL "Własna liczba tygodni (2-36)" / EN "Custom weeks (2-36)"), walidacja z `MIN/MAX_PLAN_WEEKS`.
- [ ] `PlanWizard.tsx` (`confirmTemplate:227`): przed `fire(...)` kontrola duration (te same chipsy+input, default z szablonu) — minimalny diff: sekcja w istniejącym kroku potwierdzenia.
- [ ] Zaktualizuj `START.md:357` (8-16 → 2-36).
- [ ] Run → PASS.

### Task P6: szablon "Full Body Workout" (FBW)

- [ ] W `src/data/planTemplates.ts` dodaj szablon o nazwie dokładnie "Full Body Workout (FBW)" — 3 dni/tydz., struktura Full Body A/B/C (możesz oprzeć dobór ćwiczeń na istniejącym szablonie full-body "Balance Builder", ale z klasycznym doborem FBW: przysiad, wyciskanie leżąc, wiosłowanie / martwy ciąg, OHP, podciąganie / hip thrust, dipy, akcesoria); `durationWeeks` default 12. Nazwy ćwiczeń MUSZĄ istnieć w `exerciseLibrary.ts` (zweryfikuj każdą!). i18n opisu wzorem innych szablonów.
- [ ] Test: szablon obecny na liście, dni mają komplet ćwiczeń, wszystkie nazwy rozwiązywalne w bibliotece (test automatyczny iterujący po ćwiczeniach szablonu).
- [ ] Run → PASS.

### Task P7: finał pakietu

- [ ] `npx vitest run` + `npm run typecheck` + `npm run lint` + `npm run test:rules` → zielone.
- [ ] Raport wg protokołu (w tym decyzja o autoExtended i miejsca, gdzie 'ended' jest konsumowane).

## Pułapki

- X19: NIE zmieniaj mechaniki `alignPlanDaysWithCycleIds` ani revision transaction — `status` tylko przepływa obok.
- Kolejność przy end/change: archive + backfill PRZED mutacją training_plans (historia!).
- Radix: dialog end-plan zamykaj przez `open=false` PRZED nawigacją/mutacją (lekcja build 92).
- E2E mirror w useTrainingPlan — pominięcie pola w mirrorze = zielone unit testy i czerwone e2e.
