# WP-C (X28): Zakładka Plan — fix "current week" na każdym tygodniu + czytelniejsza lista dni

> **For agentic workers:** TDD, przeczytaj `docs/plans/x28/00-OVERVIEW.md` + global constraints x27.

**Goal:** (1) zielona strzałka "← Bieżący tydzień" i badge "Następny" przestają pojawiać się na każdym tygodniu; (2) lista dni tygodnia czytelniejsza: wyraźne "dziś", spójna chronologia.

**Root cause (rozpoznanie 2026-08-21):**
- (a) Link "← Bieżący tydzień": `TrainingPlan.tsx:531-538`, warunek `displayWeek !== actualCurrentWeek`; przy planie niewystartowanym `planStarted=false` → `actualCurrentWeek=0` (:326), a `displayWeek >= 1` → link na KAŻDYM tygodniu. Do tego semantyka myląca: to przycisk powrotu, wygląda jak znacznik.
- (b) Badge "Następny" (Play, zielony): `TrainingPlan.tsx:406-410` liczy `findNextPlannedDate` z dat TYLKO wyświetlanego tygodnia (`selectedWeekTrainingDates` :349-355) → każdy przyszły tydzień ma "następny" na pierwszym dniu. Render badge: `TrainingDayCard.tsx:38, :91-96, :51, :131`.
- Lista dni: IIFE `TrainingPlan.tsx:570-711`; sort chronologiczny :600; "dziś na górze" tylko gdy `weekContainsToday` przez `orderTimelineDayKeys` (plan-schedule.ts:221-225); nagłówek dnia :634-637 BEZ stanu "today"; brak dni pustych w liście.

**Files:**
- Modify: `src/pages/TrainingPlan.tsx`, ewentualnie `src/components/TrainingDayCard.tsx` (tylko jeśli trzeba propa), `src/i18n/locales/*` (anchor `trainingplan.*`)
- Test: `src/test/` — znajdź istniejące testy TrainingPlan (grep `TrainingPlan` w src/test) i rozszerz; jeśli brak testu pagera, nowy `src/test/trainingplan-week-pager.test.tsx`

## Decyzje projektowe

1. **Link powrotu:** renderuj TYLKO gdy plan wystartował ORAZ `displayWeek !== actualCurrentWeek`; copy zmień na jawną akcję: PL "Wróć do bieżącego tygodnia" / EN "Back to current week" (klucz `trainingplan.currentWeek` — ZMIANA WARTOŚCI istniejącego klucza, bez strzałki-znaku); styl linku (podkreślenie/ghost), nie znacznika. Przy planie niewystartowanym: zamiast linku pokaż neutralną informację "Start planu: {data}" (klucz `trainingplan.startsOn`, PL "Start planu: {date}", EN "Plan starts: {date}") na tygodniu 1.
2. **Badge "Następny":** licz `nextPlannedDate` GLOBALNIE z pełnego `schedule` (:298-301), raz, poza zależnością od wyświetlanego tygodnia; dokładnie jedna data w całym planie ma badge. Przy planie niewystartowanym next = pierwszy dzień od startu (poprawny wynik globalnego liczenia).
3. **"Dziś" w liście:** nagłówek dnia z dzisiejszą datą dostaje wyróżnienie (kolor `text-primary` + label PL "Dziś" / EN "Today" obok daty — klucz `trainingplan.today`, sprawdź czy nie istnieje podobny). Kolejność: bieżący tydzień jak dotąd (dziś na górze przez orderTimelineDayKeys), pozostałe tygodnie czysta chronologia — BEZ zmiany silnika sortowania (user zaakceptował chronologię, problem był z fałszywymi znacznikami; wyróżnienie "dziś" domyka czytelność).

## Edge cases (testy)

1. Plan niewystartowany (start w przyszłości): żaden tydzień nie ma linku "wróć", tydzień 1 pokazuje "Start planu: {data}", badge "Następny" tylko na pierwszym dniu od startu (na ŻADNYM dniu innych tygodni).
2. Plan wystartowany, przeglądanie tygodnia 3 z bieżącym 2: link powrotu widoczny na tygodniu 3, NIE na 2; badge "Następny" tylko na realnie następnym dniu (może być w tygodniu 2).
3. Wszystkie dni tygodnia ukończone → badge w kolejnym tygodniu (globalne liczenie to załatwia) — asercja.
4. Dziś = dzień treningowy bieżącego tygodnia → nagłówek dnia wyróżniony; inne dni bez wyróżnienia.

## Tasks

- [ ] **C1 (TDD):** testy Edge 1-3 (fixtures przez canonical-states; wariant plan z przyszłym startem już istnieje po WP-B — jeśli WP-B doda go równolegle, skoordynuj przez WŁASNY wariant w canonical-states z unikalną nazwą, np. rozszerzasz mapę o nowy id zamiast edytować cudzy). Run → FAIL na (a) i (b).
- [ ] **C2:** implementacja Decyzji 1-2. Run → PASS.
- [ ] **C3 (TDD):** test Edge 4 → implementacja Decyzji 3 → PASS.
- [ ] **C4:** `npx vitest run` + typecheck + lint → zielone; e2e specy planu (grep `trainingplan|/plan` w e2e/) zaktualizuj selektory jeśli zmieniasz teksty (bez uruchamiania). Raport.

## Pułapki

- `trainingplan.currentWeek` zmienia WARTOŚĆ w pl.ts i en.ts — oba, i sprawdź asercje testów/e2e na stary tekst "← Bieżący tydzień" (grep!).
- WP-B równolegle edytuje `Dashboard.tsx` i `plan-schedule.ts` — NIE dotykaj tych plików (globalny nextPlannedDate licz w TrainingPlan.tsx z istniejących danych `schedule`, bez zmian w lib).
- canonical-states: obaj z WP-B rozszerzacie moduł — dodawaj NOWE id wariantów na końcu mapy (unikalny anchor), nie modyfikuj istniejących.
