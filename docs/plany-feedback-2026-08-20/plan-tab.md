# Plan obszaru: plan-tab

## Obszar
Zakładka Plan (TrainingPlan) + widok przyszłego treningu (WorkoutDay): kolejność sekcji, notatka do przyszłego treningu, design nagłówka, bug procentu postępu

## Stan istniejący
GŁÓWNE PLIKI: src/pages/TrainingPlan.tsx (cała zakładka Plan, ~850 linii: nagłówek z przyciskami Cykle/Edytuj + badge "Tydzień X/Y", progress bar, rules tip, PlanNextStepCard, HybridWeekStrip, DeloadBanner, przyciski trybów urlop/reduced, nawigacja tygodnia, timeline treningów, stats strip, kalendarz lg). Logika: src/hooks/useTrainingPlan.ts (currentWeek liczony z tygodni kalendarzowych, linie 186-200), src/lib/plan-schedule.ts (buildTrainingSchedule, countRemainingWorkouts, resolvePlannedDay), src/lib/plan-next-step.ts (maszyna stanów końca planu, karta "Plan ending").

T17 CZĘŚCIOWO ZROBIONE: kafel "Pozostało" już liczy TRENINGI a nie tygodnie (fix E-T4 z buildu 107, countRemainingWorkouts + test src/test/count-remaining-workouts.test.ts z dokładnie scenariuszem właściciela: piątek tygodnia 12 czeka = 1). ŻYWY BUG: progress bar w TrainingPlan.tsx:360: progressPercent = round(actualCurrentWeek / planDurationWeeks * 100), więc w trakcie tygodnia 12/12 pokazuje 100% mimo niezrobionego piątku. Badge "Tydzień 12/12" (trainingplan.weekOf) jest semantycznie poprawny (jesteś W tygodniu 12), problem to procent. Baner "Plan ending" (ending-decide przy weeksRemaining=0) to celowa decyzyjna karta ostatniego tygodnia, nie ruszać.

T10 NIE ZROBIONE na poziomie dnia. Istnieje wzór 1:1: notatki przypięte per ĆWICZENIE: src/lib/exercise-notes.ts (sanityzacja, docId `${uid}_${slug}`), src/hooks/useExerciseNotes.ts (onSnapshot po userId + limit, seam E2E localStorage), src/components/PinnedNoteSection.tsx (UI), firestore.rules linie ~600-643 (validExerciseNoteShape + match /exercise_notes), testy reguł w scripts/test-firestore-rules.mjs:452-461, vitest src/test/exercise-notes.test.ts. W widoku przyszłego treningu (WorkoutDay, targetDate z query param, isViewingPastWorkout = targetDate !== today) karty ćwiczeń renderują się nieedytowalne (tylko instrukcje), przycisk dodania pinned note jest bramkowany isEditable (ExerciseCard.tsx:1134), a nad listą pojawia się MYLĄCA karta "Brak zapisanego treningu dla tej daty" (WorkoutDay.tsx:2886, warunek łapie też PRZYSZŁE daty). dayNotes (notatka sesji) dostępna tylko w trakcie treningu (WorkoutDay.tsx:3007).

T9 NIE ZROBIONE: timeline treningów jest głęboko w karcie (po rules tip, PlanNextStepCard, HybridWeekStrip, DeloadBanner i przyciskach trybów), a w obrębie tygodnia sortowany chronologicznie pon-nd (przy czwartku dni minione wiszą nad dzisiejszym).

T16: nagłówek ma przyciski Cykle (ikona History, myląca) i Edytuj z martwymi klasami (border-0 + hover:border-primary/30 nic nie robi), inne paddingi niż gradient badge, flex-wrap łamie układ na wąskich ekranach.

Wzory testów: dashboard-order.test.tsx (test kolejności sekcji strony z mockami hooków), reschedule-ui.test.tsx (komponenty Planu z LanguageProvider), count-remaining-workouts.test.ts (czyste funkcje plan-schedule), plan-next-step.test.ts.

## Zadania

### T17: Fix procentu postępu planu: procent z treningów, nie z numeru tygodnia (effort: S)
**Pliki:** src/lib/plan-schedule.ts, src/pages/TrainingPlan.tsx, src/test/plan-progress.test.ts

**Podejście:**
1) Do src/lib/plan-schedule.ts dodać czystą funkcję computePlanProgressPercent({completedCount, remainingCount, planStarted}): !planStarted → 0; mianownik = completedCount + remainingCount; mianownik 0 → 0; wynik = round(completed/mianownik*100) (z natury nigdy >100). 2) W TrainingPlan.tsx wynieść do useMemo dwie wartości liczone dziś inline w stats strip: completedInPlan (workouts.filter(w => w.completed && (!planStartDate || w.date >= planStartDate)).length, linia 687) i remainingWorkouts (wywołanie countRemainingWorkouts z linii 694-703, z tymi samymi parametrami: skippedDates, vacation, scheduleOverrides). 3) Podmienić linię 360: progressPercent = computePlanProgressPercent(...) zamiast actualCurrentWeek/planDurationWeeks. Stats strip używa tych samych zmiennych (deduplikacja bez zmiany zachowania kafli). 4) Badge trainingplan.weekOf zostaje bez zmian (semantycznie poprawny). Baner ending-decide/'Plan ending' zostaje bez zmian (celowa karta decyzyjna ostatniego tygodnia).

**Testy:**
Nowy src/test/plan-progress.test.ts na wzór count-remaining-workouts.test.ts (ten sam fixture planu 4x/tydz., 12 tygodni od 2026-06-01): scenariusz zgłoszenia: 47 z 48 zrobionych, 1 pozostały → 98 (nie 100); wszystko zrobione → 100; plan przed startem (planStarted=false) → 0; dzień skipnięty zmniejsza mianownik; pusty plan → 0. Uruchomić też istniejący count-remaining-workouts.test.ts (bez zmian). npm run test + typecheck + lint.

**Ryzyka:**
Ukończone treningi ad-hoc w oknie planu wliczają się do licznika (procent rośnie szybciej), ale konstrukcja completed/(completed+remaining) nigdy nie przekroczy 100, więc bug '100% przy pozostałym treningu' znika. Niezmiennik (zasada 5): kafle Ukończone/Pozostało muszą pokazywać dokładnie te same liczby co przed refaktorem (tylko hoisting, zero zmiany parametrów countRemainingWorkouts). Nie dotykać useTrainingPlan.currentWeek ani plan-next-step (weeksRemaining=0 w ostatnim tygodniu napędza kartę decyzyjną, zmiana zepsułaby Dashboard i Cykle).

### T9: Treningi na samej górze zakładki Plan, od najbliższego (effort: M)
**Pliki:** src/pages/TrainingPlan.tsx, src/lib/plan-schedule.ts, src/test/plan-timeline-order.test.ts

**Podejście:**
1) Przestawienie bloków JSX wewnątrz karty exercise-card (czysta zamiana kolejności, żaden blok nie znika): nagłówek + progress bar → PlanNextStepCard (renderuje się tylko w stanach brzegowych) → DeloadBanner (tylko gdy decyzja) → nawigacja tygodnia + content grid (timeline + kalendarz lg) → HybridWeekStrip → przyciski trybów (urlop/reduced) → rules tip na końcu. W typowym dniu pierwszą treścią pod paskiem postępu jest lista treningów. 2) Sortowanie 'od najbliższego': dodać do src/lib/plan-schedule.ts czystą funkcję orderTimelineDayKeys(dayKeys: string[], todayISO: string): string[]: klucze >= todayISO rosnąco (dziś pierwszy), potem klucze < todayISO rosnąco na dole. 3) W IIFE timeline (linia 591) posortować Array.from(groupedByDate.entries()) tą funkcją TYLKO gdy wyświetlany tydzień zawiera dziś (selectedWeekStartMs <= today <= selectedWeekEndMs); tygodnie przyszłe i historyczne zostają chronologicznie (tam kolejność rosnąca JEST od najbliższego).

**Testy:**
Nowy src/test/plan-timeline-order.test.ts na orderTimelineDayKeys: czwartek w środku tygodnia → [czw, pt, pon, wt]; wszystko przyszłe → rosnąco; wszystko przeszłe → rosnąco; dzień dzisiejszy zawsze pierwszy. Opcjonalnie test kolejności sekcji na wzór dashboard-order.test.tsx (mock useTrainingPlan/useFirebaseWorkouts/usePlanCycles/useActivities, assert że karta treningu jest w DOM przed data-testid plan-reduced-open i przed rules tip). Ręcznie: sekwencja plan → wyjście → szybki trening → powrót (checklist CLAUDE.md).

**Ryzyka:**
Zasada 5: przestawiamy, niczego nie usuwamy; wszystkie testid-y (plan-cycles-link, plan-reduced-open, plan-vacation-open, add-cardio-day-*, day-skip-toggle) i handlery zostają identyczne. RescheduleSheet/VacationDialog/ReducedModeDialog są sibling-ami na końcu komponentu, reorder ich nie unmountuje (lekcja Radix b.92). Pułapka sortowania: sortować WPISY zgrupowanej mapy (data → itemy), nie itemy między datami, żeby cardio i trening tego samego dnia zostały razem. Zepsucie widoczności DeloadBanner/PlanNextStepCard: świadomie zostają NAD timeline, bo to karty decyzyjne renderowane rzadko; zwykłe dni ich nie mają.

### T16: Spójny design nagłówka Planu (Cykle / Edytuj / badge tygodnia) (effort: S)
**Pliki:** src/pages/TrainingPlan.tsx

**Podejście:**
Tylko klasy i ikona, zero logiki: 1) Cykle i Edytuj: jedna wysokość (h-9), identyczny padding (px-3), rounded-lg, bg-surface-low, text-xs font-semibold; usunąć martwe hover:border-primary/30 (element ma border-0), zastąpić hover:bg-surface-high hover:text-foreground. To samo w drugim wystąpieniu (linie 379-392). 2) Ikona Cykli: History myli się z Historią; zamienić na Repeat/RefreshCw z lucide-react (ta sama ikona co na stronie Cycles dla spójności, sprawdzić import w src/pages/Cycles.tsx). 3) Badge Tydzień X/Y: ta sama wysokość h-9, whitespace-nowrap zostaje. 4) Mobile: zamiast flex-wrap na całym wierszu ułożyć kontrolki w osobny rząd pod tytułem na wąskich ekranach (flex-col sm:flex-row albo kontrolki w shrink-0 z overflow kontrolowanym), żeby badge nie łamał się pod przyciski. 5) Przy okazji wyrównać przyciski nawigacji tygodnia ‹ › (w-8 h-8) do tej samej rodziny stylów. Reguła 8 z CLAUDE.md (tła statusowe z /10) już spełniona, nie ruszać kolorów semantycznych.

**Testy:**
Bez nowych testów jednostkowych (zmiany czysto wizualne); npm run test musi zostać zielony (żaden test nie asercjonuje klas nagłówka), typecheck, lint. Ręcznie: iPhone SE szerokość 375 px (przyciski nie wypadają poza kartę, nic nie łamie wiersza brzydko), tryb jasny i ciemny.

**Ryzyka:**
Zachować data-testid plan-cycles-link (e2e/FIX-B T5). Nie zmieniać nawigacji (navigate('/cycles'), navigate('/plan/edit')). Robić PO T9 w tym samym pliku (albo w jednym commicie za T9), żeby uniknąć konfliktów. Nie cofać baseline'u apki natywnej (zasada 7): żadnych nowych user-select/touch-action.

### T10: Notatka przypięta do przyszłego treningu (dzień z planu) (effort: M)
**Pliki:** src/lib/workout-day-notes.ts, src/hooks/useWorkoutDayNotes.ts, src/components/WorkoutDayNoteSection.tsx, src/pages/WorkoutDay.tsx, firestore.rules, scripts/test-firestore-rules.mjs, src/i18n/locales/pl.ts, src/i18n/locales/en.ts, src/test/workout-day-notes.test.ts

**Podejście:**
Wzór 1:1 z notatek per ćwiczenie. 1) src/lib/workout-day-notes.ts: typ WorkoutDayNote {userId, date (YYYY-MM-DD), note, updatedAt}, workoutDayNoteDocId = `${userId}_${dateISO}` (idempotentny), sanitizeWorkoutDayNote (trim, max 500). 2) src/hooks/useWorkoutDayNotes.ts skopiowany strukturalnie z useExerciseNotes.ts: kolekcja 'workout_day_notes', onSnapshot query(where userId, limit ~100), pusta notatka = deleteDoc, seam E2E localStorage 'fittracker_e2e_workout_day_notes'. 3) src/components/WorkoutDayNoteSection.tsx na wzór PinnedNoteSection (Pin/StickyNote, edycja po zatwierdzeniu, bez pola machineSettings). 4) WorkoutDay.tsx: dodać const isFutureDate = targetDate > today (porównanie stringów ISO działa); sekcję notatki renderować nad listą ćwiczeń gdy !isCompleted (przyszła data: pełna edycja 'przypnij coś do tego treningu'; dziś przed startem i w trakcie: notatka widoczna i edytowalna, żeby realnie pomogła na siłowni). Kartę 'Brak zapisanego treningu dla tej daty' (linia 2886) zawęzić do dat PRZESZŁYCH: warunek isViewingPastWorkout && !isFutureDate (dla przyszłej daty była myląca). 5) firestore.rules: validWorkoutDayNoteShape (keys().hasOnly(['userId','date','note','updatedAt']), date.size()==10, note.size()<=500, updatedAt is int) + match /workout_day_notes/{noteId} skopiowany z bloku exercise_notes (read self/admin/resource==null, create userIdMatchesAuth+hasSelfAccess, update keepsOwner, delete owner). 6) i18n: nowe klucze (np. daynote.title 'Notatka do tego treningu', daynote.add, daynote.placeholder, daynote.futureHint) OBOWIĄZKOWO do pl.ts I en.ts. 7) Opcjonalne rozszerzenie (osobny commit, tylko jeśli tanie): ikonka notatki na TrainingDayCard gdy notatka istnieje dla danej daty.

**Testy:**
1) src/test/workout-day-notes.test.ts (wzór exercise-notes.test.ts): sanityzacja (trim, obcięcie 500), docId deterministyczny, pusta notatka → delete. 2) Test komponentu WorkoutDayNoteSection (wzór testów PinnedNoteSection w exercise-card-layout.test.tsx): render pustej z onSave pokazuje 'dodaj', zapis woła onSave, cancel przywraca draft. 3) Reguły: dopisać do scripts/test-firestore-rules.mjs blok jak linie 452-461 (create własnej ALLOWED, cudzy userId DENIED, pole spoza schematu DENIED, note 501 znaków DENIED, read cudzej DENIED) i odpalić npm run test:rules (JDK21). 4) Test niezmiennika (zasada 5): widok przyszłej daty nadal renderuje WSZYSTKIE ćwiczenia dnia z instrukcjami, a przeszła data bez treningu nadal dostaje kartę noWorkoutForDate. Ręcznie na urządzeniu: dodaj notatkę do piątku z Planu → wróć → wejdź w piątek w dniu treningu → notatka widoczna przed startem i w trakcie; sekwencja background/resume bez utraty draftu.

**Ryzyka:**
NAJWIĘKSZE: nie dotykać maszynerii draftu sesji (dayNotes/exerciseNotes w draftach); notatka dnia to OSOBNY byt w osobnej kolekcji, nie prefill dayNotes (mieszanie grozi nadpisaniem notatek sesji przy promocji provisional→remote). Deploy reguł Firestore PRZED webem/buildem (inaczej PERMISSION_DENIED na produkcji). Wpis do rules musi mieć zamknięty schemat (hasOnly), inaczej test 'pole spoza schematu DENIED' padnie. Zmiana warunku karty noWorkoutForDate dotyka istniejącego przepływu przeszłych dat: warunek zawężać wyłącznie o przyszłość (targetDate > today), przeszłość bez zmian. Klucz notatki = data ISO: przełożenie treningu (scheduleOverrides) przenosi dzień na inną datę, notatka zostaje na starej dacie; zaakceptować w v1 i odnotować w DECYZJE.md (alternatywa dayId+data komplikuje bez wyraźnej potrzeby). E2E: nowy seam localStorage, nie Firestore. Dane usera święte: żadnych testów zapisu na realnym koncie.

## Notatki
Sugerowana kolejność wdrożenia: T17 (bug, najmniejszy) → T9 → T16 (ten sam plik co T9, robić zaraz po) → T10 (nowa kolekcja + reguły). T9+T16 najlepiej jako dwa osobne commity w jednej sesji, żeby nie konfliktować edycji TrainingPlan.tsx. Checklist przed wdrożeniem z CLAUDE.md obowiązuje w całości (test/typecheck/lint/build, deploy = npm run deploy, rules deploy przed webem dla T10, wpis do DECYZJE.md). Uwaga na zwietrzały dev server przy e2e (zasada 9: pkill -f vite). Wszystkie ścieżki plików zweryfikowane w repo; jedyny nowy kod to lib/hook/komponent notatek dnia oraz dwie czyste funkcje w plan-schedule.ts.
