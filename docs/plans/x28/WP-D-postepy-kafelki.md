# WP-D (X28): Postępy kafelkowo — sekcje jako kafle, wykresy jako kafle (jeden na raz), weekly w nowym stylu, graficzne odznaki

> **For agentic workers:** TDD, przeczytaj `docs/plans/x28/00-OVERVIEW.md` + `docs/plans/x27/00-OVERVIEW.md` (global constraints). Rozpoznanie poniżej jest świeże i dokładne — ufaj file:line stamtąd, ale weryfikuj greppem.

**Goal:** zakładka Postępy (/achievements) przestaje być jednym długim scrollem 10 sekcji: poziom 1 = szybki rzut oka (staty, Life PRs, heatmapa) + KAFLE sekcji w stylu /exercises; poziom 2 = zawartość sekcji. W Analityce zakładka Wykresy dostaje menu kafli (jeden wykres na raz, deep-link). Weekly summaries w nowym, zwartym stylu. Odznaki-medaliony webp z pro-look jako obrazy kafli.

**Spec / kontekst (rozpoznanie 2026-08-21):**
- `Achievements.tsx` (670 linii): ProgressHeader :84-121; sekcje w kolejności: 3xStatsCard :299-319, Life PRs :322-354, TonnageTrendChart :357-374, TrainingHeatmap :378, Milestones :381-409, Special badges :412-436, półka medali sezonów :439-477, plateau :480-512, wszystkie rekordy :515-554, rekordy 1RM :557-605, dialogi :608-665. `?view=analytics` → embedded `Analytics` :262-277 (lazy import :39, prop `embedded`).
- `/analytics` = redirect na `/achievements?view=analytics&tab=` (AuthenticatedApp.tsx:36-40). Radix Tabs poziomu analityki: `summary|charts|strava|weekly` sterowane `?tab=` (Analytics.tsx:470-525).
- Wykresy: `AnalyticsChartsTab.tsx` — chipsy `subTab` LOKALNY stan :113, rejestr chipów :265-282, bloki warunkowe per wykres (workouts :286-343, tonnage :345-383, weight :385-410, streak :412-450, progression :452-521), `RzaMetricsCard` zawsze nad wykresem :284.
- Weekly: `AnalyticsWeeklyTab.tsx` (99 linii), dane `buildLocalWeeklySummaries` (`src/lib/weekly-summary.ts`), render = 12 Cardów z 4 mikro-kaflami + chipsy PR.
- Odznaki: `kinetic/AchievementBadge.tsx` (heksagon, ikona lucide, kontrakt testowy `badge-hex`/`data-tier`/`data-earned` w `achievement-badge.test.tsx`). 18 odznak (milestones/special/sezony) vs 6 webp — webp NIE zastępują heksów 1:1, służą jako OBRAZY KAFLI poziomu 1.
- Wzorce do reużycia 1:1: `src/components/exercises/GroupTile.tsx` (generyczny: label/count/imageUrl/onClick, fallback gradient), `GroupHeader.tsx` (hero + glass back), wzorzec searchParam `ExerciseLibrary.tsx:147-156` (walidacja + reset + scrollTo(0,0)), test-wzorzec `exercise-library-groups.test.tsx`.
- Assety: `media-staging/pro-look/badges/{pr,streak-4,streak-12,tonnage-100t,first-workout,season-gold}.webp` (512x512, medaliony na czerni).
- Ryzyka testowe: `achievements-heatmap.test.tsx` renderuje CAŁĄ stronę i oczekuje heatmapy w domyślnym widoku; `dashboard-quick-actions.test.tsx:163` asertuje URL `?view=analytics&tab=summary`; e2e `nav-analytics.spec.ts` (domyślny summary, `/analytics?tab=charts`); route sweep obejmuje `/achievements`.

**Files:**
- Modify: `src/pages/Achievements.tsx`, `src/components/analytics/AnalyticsChartsTab.tsx`, `src/components/analytics/AnalyticsWeeklyTab.tsx`
- Create: `src/lib/progress-media.ts` (`getProgressTileImageUrl(id)`), `public/badges/*.webp` (kopie z media-staging), `src/test/achievements-tiles.test.tsx`
- Test: aktualizacje `achievements-heatmap.test.tsx` TYLKO jeśli konieczne (preferuj zostawienie heatmapy na poziomie 1 = test bez zmian), `src/test/analytics-charts-menu.test.tsx` (nowy)
- i18n: anchory `progress.*` / `analytics.*` / `achievements.*`

## Architektura docelowa

**Poziom 1 `/achievements` (bez paramów):**
1. ProgressHeader (bez zmian).
2. 3x StatsCard (bez zmian).
3. Life PRs top3 (bez zmian).
4. TrainingHeatmap (ZOSTAJE na poziomie 1 — konsekwencja to serce zakładki; test heatmapy przechodzi bez zmian).
5. GRID KAFLI 2 kolumny (GroupTile, obrazy = medaliony webp renderowane `object-contain` na tle `#131313` z paddingiem — medalion NIE może być croppowany cover'em):
   - "Rekordy" (`pr.webp`, licznik = liczba ćwiczeń z rekordem) → `?section=records`
   - "Odznaki i sezony" (`season-gold.webp`, licznik = zdobyte/wszystkie) → `?section=badges`
   - "Analityka" (`tonnage-100t.webp`) → istniejące `?view=analytics` (bez zmian mechanizmu)
   - "Tygodnie" (`streak-4.webp`) → `?view=analytics&tab=weekly` (skrót do istniejącego taba)
6. Sekcje przeniesione POD kafle (znikają z poziomu 1): TonnageTrendChart → do `?view=analytics&tab=charts` NIE przenosimy (zostaje osobny) — DECYZJA: TonnageTrendChart USUWAMY z poziomu 1 i włączamy jego zakres 6-mies. jako wariant istniejącego wykresu tonażu w ChartsTab (zakres "6M" obok 8w/12w/all). Milestones + Special + półka sezonów → `?section=badges`. Plateau + wszystkie rekordy + rekordy 1RM → `?section=records`.

**Poziom 2 `?section=records|badges`:** GroupHeader (hero: dla records `pr.webp`, dla badges `season-gold.webp` — jako tło hero na ciemnym gradiencie, object-contain po prawej) + dotychczasowe sekcje przeniesione żywcem (te same komponenty inline — wytnij/wklej z minimalnym refaktorem). Back → `setSearchParams({})` + scrollTo(0,0). Walidacja paramu wzorem ExerciseLibrary.tsx:147-156.

**Wykresy jako kafle (`AnalyticsChartsTab`):** stan `subTab` podniesiony do searchParams `?chart=workouts|tonnage|weight|streak|progression`; BEZ `?chart` renderuje się MENU: grid kafli 2 kolumny (GroupTile; obrazy: na razie fallback gradient + ikona — NIE generujemy nowych grafik w tym pakiecie; tytuł + jednozdaniowy opis wykresu), plus `RzaMetricsCard` nad menu (przypisany do poziomu menu, znika w widoku pojedynczego wykresu). Z `?chart=X` renderuje się TYLKO ten wykres + przycisk wstecz (glass, wzorem GroupHeader) + chipsy pozostałych wykresów NA DOLE jako szybkie przełączenie (opcjonalnie: zostaw istniejące chipsy na górze — wybierz czytelniejsze, opisz w raporcie). Deep-link `/analytics?tab=charts` bez `?chart` = menu (kompatybilne z e2e).

**Weekly restyle (`AnalyticsWeeklyTab`):** zamiast 12 dużych Cardów — zwarta lista wierszy w jednym kontenerze `bg-surface-low rounded-[20px]` (wzorem listy grupy w /exercises): wiersz = zakres dat (mono eyebrow) + 4 wartości inline (treningi · tonaż · km · PR) + chipy PR tylko po rozwinięciu wiersza (tap = expand/collapse, bez Radix — prosty stan). Tydzień bieżący wyróżniony `accent-ring`.

## Edge cases

1. Param `?section=` nieznany → traktuj jak brak (poziom 1). Kombinacja `?view=analytics` ma PIERWSZEŃSTWO przed `?section` (istniejący mechanizm nietknięty).
2. Licznik kafla "Odznaki i sezony" = zdobyte/(milestones+special+sezony); przy 0 treningów kafle renderują się z licznikami 0 (pusty stan strony :280-292 działa jak dotąd — kafle tylko gdy nie-pusty stan, sprawdź warunek).
3. Medaliony webp: `loading="lazy"`, `onError` → istniejący fallback GroupTile.
4. `?chart=` nieznany → menu. Powrót z wykresu zachowuje `?tab=charts`.
5. Przeniesienie sekcji NIE może zmienić ich logiki (te same komponenty/dane; czysty przepływ JSX). Dialogi (`ExerciseProgressionDialog`, historia ćwiczenia) montowane tam, gdzie ich triggery (sekcja records) — Radix: nigdy unmount przy open (przenoszenie sekcji przy otwartym dialogu niemożliwe, bo zmiana searchParams zamyka najpierw — upewnij się, że nawigacja wstecz przy otwartym dialogu najpierw zamyka dialog; najprościej: przycisk back disabled gdy dialog open albo zamknięcie dialogu przed setSearchParams).
6. TonnageTrendChart: usunięcie z poziomu 1 + zakres 6M w ChartsTab — jeżeli dodanie zakresu 6M do istniejącego AreaChart tonażu wymaga > 30 linii, ZANIECHAJ zakresu (samo usunięcie z poziomu 1 wystarczy, wykres tonażu w chartach już jest) i odnotuj.

## Tasks

### Task D1: helper obrazów + kopiowanie assetów (TDD)

- [ ] Skopiuj 6 webp z `media-staging/pro-look/badges/` do `public/badges/`.
- [ ] Test w `src/test/achievements-tiles.test.tsx`: `getProgressTileImageUrl('records')` → `/badges/pr.webp` (mapa sekcja→plik w `src/lib/progress-media.ts`). Run → FAIL → implementacja → PASS.

### Task D2: poziom 1 z kaflami + przeniesienie sekcji (TDD)

- [ ] Testy w `achievements-tiles.test.tsx` (scaffolding mocków skopiuj z `achievements-heatmap.test.tsx`, fixtures przez canonical-states gdzie dotyczą dokumentów): (a) poziom 1 renderuje 4 kafle z licznikami, NIE renderuje listy wszystkich rekordów ani siatki odznak; (b) klik "Rekordy" → `?section=records` → widoczne sekcje rekordów/1RM/plateau, niewidoczna heatmapa; (c) klik back → poziom 1; (d) `?section=badges` → milestones + special + sezony; (e) kafel "Analityka" ustawia `?view=analytics` (istniejący embed), kafel "Tygodnie" → `?view=analytics&tab=weekly`.
- [ ] Run → FAIL → implementacja w `Achievements.tsx` wg Architektury (reuse GroupTile/GroupHeader przez import z `components/exercises/` — komponenty są generyczne; NIE kopiuj plików) → PASS.
- [ ] `npx vitest run src/test/achievements-heatmap.test.tsx src/test/route-smoke.test.tsx` → PASS (heatmapa została na poziomie 1).
- [ ] i18n: `progress.tile.records`, `progress.tile.badges`, `progress.tile.analytics`, `progress.tile.weeks` (PL: Rekordy / Odznaki i sezony / Analityka / Tygodnie; EN: Records / Badges and seasons / Analytics / Weeks) przy anchorze `progress.*`.

### Task D3: wykresy jako kafle z deep-linkiem (TDD)

- [ ] Testy w `src/test/analytics-charts-menu.test.tsx`: (a) tab charts bez `?chart` → 5 kafli menu + RzaMetricsCard, ŻADEN wykres nie renderuje się; (b) klik kafla "Tonaż" → `?chart=tonnage` → tylko wykres tonażu, Rza niewidoczny; (c) back → menu; (d) nieznany `?chart=xyz` → menu.
- [ ] Run → FAIL → implementacja w `AnalyticsChartsTab.tsx` (subTab → useSearchParams; menu z GroupTile fallback-gradient; opisy wykresów i18n `analytics.chart.desc.*`) → PASS.
- [ ] TonnageTrendChart wg Edge 6 (usunięcie z Achievements + ewentualny zakres 6M).
- [ ] E2e specy dotykające charts (`nav-analytics.spec.ts`, `full-app.spec.ts` linie z analytics): zaktualizuj kroki (wejście w konkretny wykres przez kafel), BEZ uruchamiania playwrighta.

### Task D4: weekly restyle (TDD)

- [ ] Test: AnalyticsWeeklyTab renderuje zwartą listę (jeden kontener, wiersze z 4 wartościami inline), chipy PR pojawiają się po kliku wiersza; bieżący tydzień ma `accent-ring`.
- [ ] Run → FAIL → implementacja → PASS.

### Task D5: finał pakietu

- [ ] `npx vitest run` (NODE_OPTIONS=--max-old-space-size=6144 przy OOM) + `npm run typecheck` + `npm run lint` → zielone.
- [ ] Raport wg protokołu X27 + decyzje (chipsy w widoku wykresu, zakres 6M, wygląd kafli z medalionami).

## Pułapki

- NIE zmieniaj `AchievementBadge` (kontrakt badge-hex) — heksy zostają wewnątrz sekcji badges.
- NIE ruszaj `AnalyticsRedirect` ani schematu `?view=`/`?tab=` (deep-linki + testy).
- GroupTile importowany z `components/exercises/` — jeśli potrzebuje nowego propa (np. `imageFit: 'contain'`), dodaj go OPCJONALNIE bez zmiany zachowania w /exercises (test exercise-library-groups musi zostać zielony).
- Achievements.tsx po przebudowie będzie mniejszy na poziomie 1 — sekcje przenoś, nie przepisuj.
