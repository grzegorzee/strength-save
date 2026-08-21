# WP-A: Dashboard — blokada reschedule ukończonych treningów + kompaktowy baner "Workout completed"

> **For agentic workers:** wykonuj task-by-task, TDD. Przeczytaj najpierw `00-OVERVIEW.md` (global constraints).

**Goal:** (1) ukończonego treningu nie da się przełożyć ani nie można przełożyć innego treningu NA datę z ukończonym treningiem; (2) baner "Workout completed!" jest kompaktowy (jeden wiersz) z wyraźnym odstępem od karty NEXT SESSION.

**Architecture:** completion pochodzi z kolekcji workouts (`WorkoutSession.completed`, lookup po dacie). Wprowadzamy zbiór `completedDates: Set<string>` przekazywany do sheeta i do buildera mutacji — guard na obu poziomach (UI + silnik), wzorem gate'a z `TrainingPlan.tsx:648`.

**Tech stack:** React + TS, vitest + testing-library.

**Spec / kontekst (ustalone rozpoznaniem):**
- Wejścia reschedule bez gate'a completion: `src/pages/Dashboard.tsx:882-888` (hero TRAINING) i `:409-439` (`renderNextSessionHero`, link `:430-436`, `openReschedule` w `:399-405`).
- Jedyny gate completion dziś: `src/pages/TrainingPlan.tsx:648` — `!workoutForDate?.completed && trainingDateStr >= formatLocalDate(new Date())`.
- Sheet: `src/components/RescheduleSheet.tsx` — pętla targetów `:62-72` zaczyna od offset 0 (dziś), wyklucza tylko `fromISO`, NIE filtruje dat z ukończoną sesją. To jest bug ze zgłoszenia: po ukończeniu dzisiejszej sesji user otwiera reschedule z hero NEXT SESSION i może zrobić swap Z/NA dzisiaj.
- Mutacja: `moveScheduledDay` `src/hooks/useTrainingPlan.ts:279-310` → `buildScheduleMove` `src/lib/schedule-overrides.ts:61-82`; builder nie dostaje żadnych danych o workouts.
- Baner: `src/pages/Dashboard.tsx:894-918` (`today-completed-card`), wrapper `data-testid="dash-hero"` na `:842` BEZ klasy odstępu (karty stykają się). NEXT SESSION hero: `:409-439`.
- Istniejące testy: `src/test/dashboard-hero-reschedule.test.tsx`, `src/test/reschedule-ui.test.tsx`, `src/test/reschedule-sequence.test.ts`, `src/test/dashboard-completion-highlight.test.tsx:165-184`, `src/test/dashboard-prestart.test.tsx:215`, `src/test/dashboard-order.test.tsx`.

**Files:**
- Modify: `src/lib/schedule-overrides.ts` (buildScheduleMove — nowy opcjonalny parametr), `src/components/RescheduleSheet.tsx`, `src/hooks/useTrainingPlan.ts` (moveScheduledDay), `src/pages/Dashboard.tsx`
- Test: `src/test/reschedule-sequence.test.ts`, `src/test/reschedule-ui.test.tsx`, `src/test/dashboard-hero-reschedule.test.tsx`, `src/test/dashboard-completion-highlight.test.tsx`
- i18n: `src/i18n/locales/pl.ts` + `en.ts` (anchory `reschedule.*` i `dash.*`)

**Interfaces (kontrakt dla innych pakietów):**
- Produces: `buildScheduleMove(fromISO, toISO, planDays, overrides, opts?: { completedDates?: ReadonlySet<string> })` — zwraca `{ ok: false, reason: 'completed-source' | 'completed-target' }` gdy data źródłowa/docelowa ma ukończony trening. Dotychczasowe wywołania bez opts działają bez zmian.
- `RescheduleSheet` przyjmuje nowy prop `completedDates?: ReadonlySet<string>` — daty z ukończonym treningiem są w liście targetów wyszarzone (disabled) z dopiskiem, NIE znikają (użytkownik rozumie czemu nie może wybrać).

## Edge cases (obowiązkowe w testach)

1. Ukończony trening DZIŚ + reschedule z hero NEXT SESSION: dziś nie może być targetem (dokładny scenariusz z buga usera).
2. Źródło = data z ukończonym treningiem (np. wejście z /plan w innym stanie): builder zwraca `{ ok:false, reason:'completed-source' }`, UI pokazuje toast, overrides NIEZMIENIONE.
3. Swap: target zajęty przez inny dzień planu, ale trening targetu ukończony → zablokowane (swap przestawiłby ukończony dzień).
4. Trening nieukończony (draft, `completed: false`) NIE blokuje — draft-guard działa jak dotąd (`Dashboard.tsx:399-405` zostaje).
5. `completedDates` liczone TYLKO z sesji `completed === true` (lookup wzorem `findWorkoutForRoute` / `workout-lookup.ts`).
6. Przeszłe daty: MissedWorkoutBanner/LapseTray działają jak dotąd (źródła filtrowane po completed już u źródła — nie ruszać).

## Tasks

### Task A1: guard w buildScheduleMove (silnik)

- [ ] Test w `src/test/reschedule-sequence.test.ts`: dwa nowe przypadki — completed-source i completed-target (w tym wariant swap). Wzoruj się na istniejących testach move/swap w tym pliku; `completedDates = new Set([fromISO])` / `new Set([toISO])`.
- [ ] Run: `npx vitest run src/test/reschedule-sequence.test.ts` → FAIL.
- [ ] Implementacja w `src/lib/schedule-overrides.ts:61-82`: opcjonalny czwarty/piąty parametr wg sygnatury z Interfaces; guard PRZED obliczeniem swapa.
- [ ] Run → PASS.

### Task A2: RescheduleSheet — targety z ukończonym treningiem disabled

- [ ] Test w `src/test/reschedule-ui.test.tsx`: sheet z `completedDates` zawierającym jedną datę horyzontu → ten wiersz ma `disabled`/`aria-disabled` i dopisek (klucz i18n `reschedule.completedDay`, PL: "trening ukończony", EN: "workout completed"); klik nie wywołuje onSelect.
- [ ] Implementacja w `RescheduleSheet.tsx` (pętla `:62-72` + render opcji): opcja disabled, styl `opacity-50` + tekst muted; NIE usuwaj daty z listy.
- [ ] i18n: dodaj `reschedule.completedDay` po ostatnim istniejącym kluczu `reschedule.*` w pl.ts i en.ts.
- [ ] Run testu → PASS.

### Task A3: gate na wejściach Dashboardu + przekazanie completedDates

- [ ] Test w `src/test/dashboard-hero-reschedule.test.tsx`: gdy dzisiejszy trening completed, link "Reschedule workout" w hero NEXT SESSION otwiera sheet, ale dzisiejsza data jest disabled; oraz: dla hero TRAINING (dzień nieukończony) link działa jak dotąd.
- [ ] Implementacja w `Dashboard.tsx`: zbuduj memo `completedDates` z załadowanych workouts (`completed===true`), przekaż do `RescheduleSheet` (mount `:1082`) i do `moveScheduledDay`; w `useTrainingPlan.ts:279-310` przepuść `completedDates` do `buildScheduleMove` i obsłuż `ok:false` toastem (istniejący wzorzec toastu z draft-guarda; komunikat: nowy klucz `reschedule.completedBlocked`, PL: "Nie można przełożyć ukończonego treningu", EN: "A completed workout can't be rescheduled").
- [ ] `TrainingPlan.tsx`: przekaż `completedDates` do swojego mounta sheeta (`:863`) — gate na ikonie już jest, ale targety też muszą być filtrowane.
- [ ] Run: `npx vitest run src/test/dashboard-hero-reschedule.test.tsx src/test/reschedule-ui.test.tsx` → PASS.

### Task A4: kompaktowy baner + odstęp

- [ ] Test w `src/test/dashboard-completion-highlight.test.tsx`: zaktualizuj asercje layoutu — baner (`today-completed-card`) NIE zawiera już nagłówka `text-[27px]`; nazwa dnia renderowana inline w wierszu banera; wrapper `dash-hero` ma klasę odstępu (`space-y-3`).
- [ ] Implementacja w `Dashboard.tsx:894-918`: jeden wiersz — `CheckCircle h-4 w-4` + `{t('dash.workoutCompleted')} · {nazwa dnia}` (text-sm font-semibold, kolor `text-fitness-success`), po prawej link "View" (`Button variant="ghost" size="sm"`). Kontener: `rounded-xl border border-fitness-success/40 bg-fitness-success/10 px-4 py-2.5` (zasada: tło statusowe z przezroczystością). Usuń `gap-2 p-5` i osobny `<h2>`.
- [ ] `Dashboard.tsx:842`: `data-testid="dash-hero"` dostaje `className="space-y-3"`.
- [ ] Run: `npx vitest run src/test/dashboard-completion-highlight.test.tsx src/test/dashboard-prestart.test.tsx src/test/dashboard-order.test.tsx` → PASS (dashboard-prestart:215 może wymagać aktualizacji asercji do nowego layoutu — aktualizuj świadomie, nie na ślepo).

### Task A4b: data w hero NEXT SESSION

Kontekst (zgłoszenie usera z 2026-08-21): po starcie planu z przyszłą datą hero pokazuje "NEXT SESSION · MONDAY" bez daty — user nie wie, że to dopiero 7 września, myśli że jutro.

- [ ] Test w `src/test/dashboard-completion-highlight.test.tsx` (lub dedykowany): gdy najbliższa sesja jest dalej niż jutro, eyebrow/hero zawiera sformatowaną datę (np. "MONDAY · 7 SEP" / PL "PONIEDZIAŁEK · 7 WRZ"); gdy sesja jest dziś/jutro, pokazuj jak dotąd ("TODAY"/"TOMORROW" jeśli takie stany istnieją, albo sam dzień tygodnia).
- [ ] Implementacja w `renderNextSessionHero` (`Dashboard.tsx:409-439`): do eyebrow (`:411`) dodaj datę przez `parseLocalDate(dateISO).toLocaleDateString(dateLocale(lang), { day: 'numeric', month: 'short' })` gdy `dateISO` > jutro. Użyj istniejących utili dat (`formatLocalDate`, `parseLocalDate`); ZERO stringów z pauzami (separator `·`).
- [ ] Run → PASS.

### Task A5: finał pakietu

- [ ] `npx vitest run` + `npm run typecheck` + `npm run lint` → zielone.
- [ ] Raport wg protokołu z 00-OVERVIEW.

## Pułapki

- Nie zmieniaj zachowania `getNextScheduledTraining` (rozbieżność z `findNextPlannedDate` to znany dług — POZA zakresem tego pakietu; odnotuj w raporcie, nie ruszaj).
- Nie unmountuj sheeta w stanie open (lekcja build 92) — disabled opcje zamiast znikających.
- `dash-hero` wrapper renderuje też inne stany (rest/preStart) — `space-y-3` nie może zepsuć ich layoutu; sprawdź snapshoty testów dashboard-order.
