# PLAN REDESIGNU: Dashboard (Dzisiaj) - fala 2, 2026-08-20

Artboard obowiązujący: `docs/design-2026-08-20/dc/dashboard-simplified.dc.html` (wariant 2a).
Screenshot: `docs/design-2026-08-20/dashboard-simplified.png`.
Kod bazowy: `src/pages/Dashboard.tsx` (stan po fali T1-T24), `src/components/AppHeader.tsx`,
`src/components/WeekCard.tsx`, `src/components/PlanNextStepCard.tsx`.

Zasada nadrzędna: mockup jest POMARAŃCZOWY (`--acc #FF8B3D`), wdrożenie używa TOKENU
akcentu apki (`--primary` z palety 11). Zero nowych hexów; strażnik
`src/test/accent-hardcode-scan.test.ts` musi przechodzić bez zmian w allowlistach.

---

## 1. INWENTARZ FUNKCJI DO ZACHOWANIA (44 pozycje)

Każda pozycja MUSI być dostępna po redesignie. Kolumna "Miejsce w nowym designie"
= gdzie ląduje.

### AppHeader (współdzielony; na Dashboardzie pełni rolę "identity row" z mockupu)

| # | Funkcja (stan obecny) | Miejsce w nowym designie |
|---|---|---|
| 1 | Avatar-inicjał/zdjęcie → nawigacja `/profile` (`header-avatar`) | Bez zmian; styl już zgodny (kółko, inicjały w `text-primary` na `bg-surface-highest`) |
| 2 | Tytuł ekranu "Dashboard" (`layout.title.dashboard`, font-heading uppercase) | Bez zmian funkcjonalnie; tracking `tracking-[0.08em]` zostaje (mockupowe .14em NIE wymuszamy globalnie) |
| 3 | Dzwonek powiadomień (`NotificationBell`) | Bez zmian (mockupowy bell = istniejący komponent) |
| 4 | Wskaźnik offline (WifiOff + licznik pendingOps) | Bez zmian; conditional, zostaje między dzwonkiem a licznikiem |
| 5 | Badge licznika treningów all-time (`header-workout-count`) → otwiera AllTimeStatsSheet | Zostaje; dochodzi sufiks "ŁĄCZNIE/TOTAL" w `font-mono` (mockup "82 TOTAL") |
| 6 | Animacja "+1" po treningu (`header-plus-one`, respektuje reduced-motion) | Bez zmian |

### Dashboard.tsx

| # | Funkcja (stan obecny) | Miejsce w nowym designie |
|---|---|---|
| 7 | Confetti po onboardingu (`?welcome=1`, ConfettiBurst) | Bez zmian |
| 8 | Highlight ukończenia (`?celebrate=1` → ring na karcie completed) + czyszczenie URL | Bez zmian (ring `ring-fitness-success/50` na restylowanej karcie) |
| 9 | Popup pomiarów startowych T4 (ConfirmDialog → `/measurements`, tylko user bez pomiaru, zawsze zamontowany) | Bez zmian; NIE odmontowywać (pułapka Radix) |
| 10 | AllTimeStatsSheet zamontowany na Dashboardzie (`statsOpen`) | Zostaje; dostaje wreszcie lokalny trigger (poz. 35b, kafel "Twoje liczby") |
| 11 | Powitanie: tekst wg godziny (morning/day/evening), ikona Sun/Moon, imię w `text-primary`, data (`dash-greeting`) | Sekcja 2 nowego layoutu; ikona zmienia kolor z `text-fitness-warning` na `text-primary` (reguła "jeden akcent": warning był ozdobny, nie semantyczny) |
| 12 | Stan ładowania (spinner `common.loading`) | Bez zmian |
| 13 | Stan błędu (`dash.error`) | Bez zmian |
| 14 | Hero `training`: nazwa dnia + focus + liczba ćwiczeń (`dash-hero`) | Karta NEXT SESSION (sekcja 4a): eyebrow mono w akcencie, duży tytuł font-heading, meta |
| 15 | Hero `training` z żywym draftem: "Odhaczone serie: {n}" + CTA "Kontynuuj trening" → draft target (wspólne memo `todayContinueDraft`, Z174) | Karta NEXT SESSION: meta podmienia się na licznik serii, duży CTA = Kontynuuj |
| 16 | CTA "Rozpocznij trening" → `/workout/:dayId?date=...&autostart=true` | Duży akcentowy przycisk karty NEXT SESSION ("Open session" z mockupu) |
| 17 | Przycisk "Szczegóły" → `/day` | Tekstowy link w stopce karty NEXT SESSION (obok "Przełóż trening") |
| 18 | Hero `completed` (`today-completed-card`): status ✓, nazwa dnia, zapowiedź następnego treningu, przycisk "Zobacz" → trasa treningu | Karta sukcesu w tokenach semantycznych (`border-fitness-success/40 bg-fitness-success/10`), pod nią wiersz "✓ Dzisiaj zrobione · {dzień}" dubluje się w stopce paska tygodnia (poz. 29) |
| 19 | Hero `preStart` (`prestart-card`, T3): data startu + pierwszy trening + "Zobacz plan" → `/plan` | Restyl w języku karty NEXT SESSION (eyebrow "PLAN STARTUJE · {data}"), CTA neutralny |
| 20 | Hero `rest` (`recovery-card`): tipy regeneracji wg wczorajszej partii + następny trening | Neutralna karta `bg-surface-low`; następny trening jako eyebrow "NASTĘPNA SESJA · {dzień}" |
| 21 | Slot statusów z priorytetami + zwijanie (`dash-status-slot`, `status-slot-toggle`) | Bez zmian logiki; pozycja: pod hero (jak dziś) |
| 22 | Baner offline-sync (4 warianty tekstu; CTA Kontynuuj/Otwórz Sync Center; degradacja przy `todayContinueDraft`, Z174) | Bez zmian; już na tokenach `border-primary/30 bg-primary/5` |
| 23 | LapseStatusCard → otwiera LapseTray; dismiss zapamiętany (localStorage, max 50) | Bez zmian (warning = semantyczny, zostaje) |
| 24 | LapseTray: Pomiń / Przełóż / Kontynuuj od dziś (skipPastDates) / Tryb obniżony | Bez zmian |
| 25 | Badge urlopu (`vacation-badge`) → VacationDialog + "anuluj" | Bez zmian |
| 26 | Badge trybu obniżonego (`rmode-badge`) → ReducedModeDialog + "wyłącz" | Bez zmian |
| 27 | Karta przedłużenia planu (extendOffer ≥7 dni po końcu): Przedłuż (spinner), Nowy plan → `/new-plan`, X (guard localStorage) | Bez zmian; zostaje w slocie statusów (priorytet 60) - to INNY mechanizm niż baner "Plan się kończy" (poz. 32) |
| 28 | MissedWorkoutBanner: "Zrób dziś" / "Przełóż" / X per data | Bez zmian; pod slotem statusów |
| 29 | WeekCard (`week-card`): "Tydzień {x} z {y}", badge Deload, tonaż tygodnia, 7 dni ze statusami done/planned/skipped/rest + ring "dziś", pasek postępu, licznik sesji | Pasek tygodnia z mockupu (sekcja 6): 7 POZIOMYCH segmentów zamiast kółek; licznik sesji idzie do nagłówka, tonaż + "TYDZ. x/y" mono po prawej; pasek postępu ZNIKA (zastępują go segmenty); stopka "✓ Dzisiaj zrobione · {dzień}" gdy dziś done |
| 30 | WeekCardioCard (`dash-week-cardio`, T5): cardio tygodnia (Strava+manual, widoczne też przed startem planu), edycja manualnych | Zostaje pod paskiem tygodnia; nagłówek sekcji restylowany na mono-eyebrow; StravaActivityCard bez zmian |
| 31 | AddCardioDialog: dodaj / edytuj / usuń manualne cardio | Bez zmian, zawsze zamontowany |
| 32 | PlanNextStepCard (`dash-next-step`): tytuł/opis/badges, akcje primary/secondary/"Powtórz plan", X (dismiss per plan-signature), idempotentna emisja eventu plan-ended | Baner "Plan ends / Decide" z mockupu (sekcja 3): kompaktowy wiersz z obrysem `border-primary/40` + przycisk "Zdecyduj" ROZWIJA pełny zestaw akcji inline; przenosi się NAD hero (między powitanie a kartę sesji); effect emisji zostaje niezależny od zwinięcia |
| 33 | ProUpsellBanner → `/paywall` (native iOS bez PRO) | Bez zmian; pozycja po gridzie akcji |
| 34 | Kafel "Szybki trening" (`quick-workout-start`) → adhoc autostart | Grid 2x2 (sekcja 7), kafel 1 |
| 35 | Kafel "Dodaj cardio" (`add-cardio-open`) → AddCardioDialog | Grid 2x2, kafel 2 |
| 35b | Wejście w "Twoje liczby" z Dashboardu (X17D Z139.4; obecnie stan `statsOpen` ISTNIEJE, ale trigger wypadł - sheet otwiera tylko badge w headerze) | Grid 2x2, kafel 3 (`dash-your-numbers`) → `setStatsOpen(true)`; przywraca drugie wejście |
| 36 | Przycisk "Zobacz analitykę" → `/achievements?view=analytics&tab=summary` | Grid 2x2, kafel 4 (`dash-analytics`); pełnowymiarowy przycisk znika, funkcja przenosi się do grida |
| 37 | WeekReportCard (planStarted): raport tygodnia target vs actual | Bez zmian; pod gridem akcji |
| 38 | RescheduleSheet: wybór daty, zamknięcie sheeta PRZED mutacją (regresja b.92), toasty moved/swapped/failed | Bez zmian |
| 39 | Guard żywego draftu przy przełożeniu (`openReschedule` → toast `reschedule.draftBlocked`) - obecnie zdefiniowany, nieużywany w JSX | PODPIĄĆ pod link "Przełóż trening" na karcie NEXT SESSION (stan `training`): `openReschedule(dateStr, dayId)` |
| 40 | Pomiń/Przywróć dzień (`handleToggleSkip` + toasty) - wejście z LapseTray | Bez zmian |
| 41 | ReducedModeDialog: włącz (poziom+dni) / wyłącz; blokada gdy urlop | Bez zmian |
| 42 | VacationDialog: włącz / anuluj | Bez zmian |
| 43 | useWatchPlanPreview (podgląd dnia na Apple Watch, zależny od `todayTraining`) | Bez zmian - NIE ruszać kształtu `todayTraining` |
| 44 | Streak tygodniowy (`calculateStreakDetails` z agregatu Z216, z tarczą-freeze) - liczony w Dashboardzie, dziś NIEWYŚWIETLANY | Chip "{n} tygodni" przy dacie w powitaniu (mockupowe "14 WEEKS"); ukryty gdy `streak === 0` |

Po implementacji: odhaczyć każdą pozycję z tej tabeli na realnym buildzie (bramka fali 2).

---

## 2. STRUKTURA NOWEGO EKRANU (sekcja po sekcji) + MAPOWANIE STYLÓW

Kolejność pionowa (zachowuje kontrakt e2e `dashboard-order.spec.ts`:
`dash-greeting` → `dash-hero` → `week-card` → `dash-actions`):

```
[AppHeader - poza Dashboard.tsx, wspólny]
1. dash-greeting        (powitanie + data + chip streak)
2. dash-next-step       (baner decyzji planu; warunkowy)
3. dash-hero            (karta NEXT SESSION; 4 stany)
4. dash-status-slot     (bez zmian)
5. MissedWorkoutBanner  (bez zmian)
6. week-card            (pasek tygodnia - segmenty)
7. dash-week-cardio     (T5, bez zmian logiki)
8. dash-actions         (grid 2x2)
9. ProUpsellBanner
10. WeekReportCard
[sheety/dialogi zamontowane na końcu: AddCardio, Reschedule, LapseTray,
 ReducedMode, Vacation, ConfirmDialog pomiarów, AllTimeStatsSheet]
```

### Mapa neutralnych hexów mockupu → tokeny apki (dark; light załatwiają tokeny)

| Mockup | Token / klasa |
|---|---|
| `#0e0e0e` (tło ekranu) | `bg-background` (dark: 0 0% 5.5%) |
| `#131313` (baner, pasek tygodnia, kafle, nav) | `bg-surface-low` (0 0% 7.5%) |
| `#1c1c1c` (karta NEXT SESSION; pusty segment tygodnia) | karta: `bg-surface-container` (0 0% 10%) lub `Card`; pusty segment: `bg-surface-highest` |
| `#262626` | `bg-surface-highest` (0 0% 15%) |
| `#3a3833` (segment "zaliczony wcześniej") | patrz sekcja 6 - semantyka statusów, nie kopiujemy 1:1 |
| `#f2f1ee` (tekst główny) | `text-foreground` |
| `#dedcd6`, `#c9c7c1` | `text-foreground` / `text-foreground/90` |
| `#9a9892`, `#8d8b85` | `text-muted-foreground` |
| `#767469` | `text-muted-foreground/70` |
| `var(--acc)` (pomarańcz) | `text-primary` / `bg-primary` / `border-primary` |
| `color-mix(var(--acc) 13-16%, transparent)` | `bg-primary/10` (chipy) / `bg-primary/15` (avatar, mocniejsze) |
| `color-mix(var(--acc) 20%, #131313)` (avatar) | `bg-primary/15` + `text-primary` (istniejący wzorzec AppHeader) |
| `inset 0 0 0 1.5px color-mix(var(--acc) 45%,transparent)` (obrys banera) | `border border-primary/40` |
| przycisk `background:var(--acc); color:#141005` | `Button` domyślny (`bg-primary text-primary-foreground`), `size="lg"`, `rounded-2xl`, pełna szerokość |
| `#141005`/`#171204` (tekst na akcencie) | `text-primary-foreground` (kontrast per luminancja liczy system akcentów) |

### Mapa typografii mockupu → istniejące klasy

| Mockup | Apka |
|---|---|
| `'Space Grotesk'` (`.disp`, letter-spacing -.02em) | `font-heading tracking-tight` (Space Grotesk już w `tailwind.config` i `index.html`; NIE dodajemy nowych linków Google Fonts) |
| `Inter` | `font-body` / domyślny body |
| `ui-monospace` (`.mono`, eyebrow/liczniki) | `font-mono` (domyślny stack Tailwind; apka nie ma custom mono i NIE dodajemy fontu) |
| eyebrow 10.5px letter-spacing .16em | `font-mono text-[10px] uppercase tracking-[0.16em]` |
| tytuł karty 27px/1.02 700 | `font-heading text-[27px] leading-none font-bold` (blisko `headline-lg`; dobrać przy weryfikacji screenshotem) |

### Sekcja 1: AppHeader (identity row)

Zmiana chirurgiczna, bo header jest globalny: w badge licznika po liczbie dochodzi
`<span className="font-mono text-[9px] uppercase tracking-[0.1em] opacity-75">{t('header.totalSuffix')}</span>`.
Nic więcej. Avatar, dzwonek, offline, "+1" - bez zmian.

### Sekcja 2: Powitanie (`dash-greeting`)

- Wiersz 1: `GreetingIcon` w `text-primary` (zmiana z `text-fitness-warning`) +
  obecny `h1` (już jest: uppercase italic font-heading, imię w `text-primary`).
- Wiersz 2: data (bez zmian) + NOWY chip streak:
  `flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-primary`
  z ikoną `Flame` (już importowana) i `font-mono text-[10px] uppercase tracking-[0.1em]`
  tekstem `t('dash.streakChip', { n: streak })`. Render tylko gdy `streak > 0`.
  Wiersz z `flex flex-wrap items-center gap-2` (długa polska data + chip nie może
  łamać layoutu na 390px).

### Sekcja 3: Baner decyzji planu (`dash-next-step`)

`PlanNextStepCard` dostaje prop `variant?: 'card' | 'banner'` (default `card`,
Plan/Cykle bez zmian). Wariant `banner` (Dashboard):

- Zwinske: wiersz `rounded-2xl border border-primary/40 bg-surface-low p-3 pl-4`
  z `step.title` (`text-foreground font-medium`), `step.description`
  (`text-xs text-muted-foreground`, `line-clamp-2`) i pigułką "Zdecyduj"
  (`rounded-full bg-primary/15 text-primary px-4 h-11`).
- "Zdecyduj" NIE nawiguję ślepo: rozwija (stan lokalny) pełny blok akcji
  (primary, secondary, "Powtórz plan" ze spinnerem) - dokładnie te same przyciski
  co dziś. X (dismiss) zostaje w rogu banera.
- Effect `emitUserEvent` bez zmian (mount niezależny od rozwinięcia).
- Pozycja na Dashboardzie: między `dash-greeting` a `dash-hero`.

### Sekcja 4: Karta NEXT SESSION (`dash-hero`, 4 stany - wrapper i testidy zostają)

Wspólna skorupa: `rounded-3xl bg-surface-container p-5 flex flex-col gap-3`
(mockup `border-radius:24px` = `rounded-3xl`/24px; użyć `rounded-[24px]` jeśli
`xl=1.5rem` nie pasuje - bez nowych tokenów, to wartość arbitralna Tailwinda, nie kolor).

a) `training`:
- eyebrow: `font-mono text-[10px] uppercase tracking-[0.16em] text-primary` =
  `t('dash.hero.today')` + ` · ` + dzień tygodnia z `formattedDate`/`toLocaleDateString`.
- tytuł: `localizeDayName(...)` w `font-heading text-[27px] font-bold leading-none`.
- meta: `text-sm text-muted-foreground` = focus · `dash.exercisesCount` (BEZ "45 min",
  patrz new_features). Z draftem: `dash.today.continueSets`.
- CTA: `Button size="lg" className="h-13 w-full rounded-2xl text-base font-semibold"`,
  label `dash.startWorkout` lub `dash.today.continue`; nawigacja jak dziś (autostart / draft target).
- stopka: dwa tekstowe przyciski w jednym wierszu, `text-sm text-muted-foreground`:
  `dash.details` → `/day` oraz `reschedule.title` ("Przełóż trening") →
  `openReschedule(todayTraining.dateStr, todayTraining.dayId)` (guard draftu, poz. 39).

b) `completed` (`today-completed-card`):
- restyl w skorupie hero, tokeny semantyczne: `border border-fitness-success/40
  bg-fitness-success/10`, ikona i tytuł `text-fitness-success` (reguła #8: tło /10, tekst pełny).
- treść jak dziś: "Trening ukończony!", nazwa dnia, "Następny trening: ...", przycisk "Zobacz".
- `completionHighlight` → `ring-2 ring-fitness-success/50` (bez zmian).
- następny trening prezentowany jako eyebrow-owa linia "NASTĘPNA SESJA · {dzień}"
  (`dash.hero.next` + localizeDayName), CTA startu przyszłej sesji NIE dodajemy (new_features #3).

c) `preStart` (`prestart-card`): skorupa hero, eyebrow `dash.hero.planStarts`
   w `text-primary`, tytuł = nazwa pierwszego dnia, meta = data startu + focus,
   CTA neutralny (`variant="outline"`) `dash.preStart.viewPlan` → `/plan`.
   Teksty `dash.preStart.*` bez zmian (unit test `dashboard-prestart` sprawdza treść).

d) `rest` (`recovery-card`): `bg-surface-low` (neutralny), tytuł + tipy jak dziś,
   stopka "NASTĘPNA SESJA · {dzień}" analogicznie do (b).

### Sekcja 5: Slot statusów + MissedWorkoutBanner

Bez zmian logiki i treści. Kosmetyka opcjonalna: ujednolicić radius na `rounded-2xl`.
Nie ruszać testidów (`dash-status-slot`, `status-slot-toggle`, `vacation-badge`,
`rmode-badge`, `lapse-status-card`).

### Sekcja 6: Pasek tygodnia (`WeekCard`)

- Nagłówek: lewa `t('dash.week.sessions', {done,total})` w `text-[13px] text-foreground/90`;
  prawa `font-mono text-xs text-muted-foreground` = `fmtTonnage(...)` + ` · ` +
  `t('dash.week.short', {current,total})` ("TYDZ. 12/12" / "WK 12/12").
  Tonaż tylko gdy `tonnageKg > 0` (jak dziś). Badge Deload zostaje przy nagłówku
  (`border-fitness-warning bg-fitness-warning/10 text-fitness-warning`).
- Segmenty: `flex gap-1.5`, każdy `flex-1 h-1.5 rounded-full` + `data-testid`
  `week-day-{date}` (kontrakt testów zostaje na segmencie):
  - `done` → `bg-primary`
  - `planned` → `bg-primary/25`
  - `skipped` → `bg-muted-foreground/20` + `opacity-60`
  - `rest` → `bg-surface-highest`
  - `isToday` → dodatkowo `ring-1 ring-primary/60`
  - a11y: `title`/`aria-label` = data + status (etykiety literowe dni znikają,
    znaczenie przenosi się do title; do decyzji przy screenshot-weryfikacji:
    jeśli czytelność cierpi, zostawić mikro-podpisy `text-[9px]` pod segmentami - mockup ich nie ma).
- Pasek postępu procentowego znika (duplikat segmentów); licznik sesji przeżywa w nagłówku.
- Stopka (tylko gdy dzisiejszy dzień ma status `done`): `flex items-center gap-2
  text-xs text-muted-foreground` z ikoną `Check` i `t('dash.week.doneToday', {day})`;
  nazwa dnia z `weekCardModel` (dane już są w modelu dni). Bez nowych obliczeń.

### Sekcja 7: Grid szybkich akcji (`dash-actions`)

`grid grid-cols-2 gap-2.5`; kafel = `button` `bg-surface-low rounded-2xl px-3.5 py-3
flex items-center gap-2.5 text-[13px] font-medium min-h-11 text-left`:

1. `Zap` + `t('adhoc.start')` - `data-testid="quick-workout-start"` (handler bez zmian)
2. `HeartPulse` + `t('cardio.addButton')` - `data-testid="add-cardio-open"` (bez zmian)
3. `Weight` (już importowany) + `t('stats.title')` ("Twoje liczby") -
   `data-testid="dash-your-numbers"` → `setStatsOpen(true)`
4. `BarChart3` + `t('layout.title.analytics')` ("Analityka") -
   `data-testid="dash-analytics"` → `navigate('/achievements?view=analytics&tab=summary')`

Ikony w `text-muted-foreground` (mockup: neutralne), NIE w akcencie (reguła #2).
Pełnowymiarowy przycisk "Zobacz analitykę" znika (funkcja w kaflu 4).

### Sekcja 8-10: WeekCardioCard, ProUpsellBanner, WeekReportCard

Logika bez zmian. WeekCardioCard: nagłówek `t('dash.weekCardio.title')` restyl na
`font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground`.
ProUpsell i WeekReport już na tokenach - najwyżej wyrównanie radiusów.

### Dolna nawigacja

Poza zakresem (brief: "bez zmian funkcjonalnie"). Mockupowe 5 tabów = istniejące
`AppNavigation` (TODAY/PLAN/HISTORY/PROGRESS/EXERCISES już się zgadzają).

---

## 3. LISTA ZMIAN W PLIKACH

| Plik | Zakres |
|---|---|
| `src/pages/Dashboard.tsx` | Restrukturyzacja JSX sekcji 2-8; chip streak; hero w skorupie NEXT SESSION (4 stany); podpięcie `openReschedule` pod link "Przełóż trening"; grid 2x2 z kaflami 3-4 (`setStatsOpen`, nawigacja do analityki); przeniesienie `PlanNextStepCard` nad hero z `variant="banner"`; usunięcie pełnowymiarowego przycisku analityki; ikona powitania `text-primary` |
| `src/components/WeekCard.tsx` | Segmenty poziome zamiast kółek; nagłówek/stopka wg sekcji 6; usunięcie paska %; zachowanie `week-card` i `week-day-{date}` |
| `src/components/PlanNextStepCard.tsx` | Nowy prop `variant` + stan rozwinięcia; wariant `card` bajt w bajt jak dziś (Plan/Cykle nietknięte); effect emisji bez zmian |
| `src/components/AppHeader.tsx` | Sufiks `header.totalSuffix` w badge licznika (jedna linia) |
| `src/i18n/locales/pl.ts` + `src/i18n/locales/en.ts` | Nowe klucze z sekcji 4 (OBA pliki, inaczej typecheck padnie) |
| `src/test/week-card-component.test.tsx` | Aktualizacja asercji (segmenty, nagłówek, brak paska %) |
| `src/test/dashboard-order.test.tsx` | Weryfikacja/aktualizacja kolejności sekcji (baner nad hero) |
| `src/test/dashboard-quick-actions.test.tsx` (NOWY) | 4 kafle, kafel "Twoje liczby" otwiera AllTimeStatsSheet, kafel analityki nawiguję |
| `src/test/dashboard-hero-reschedule.test.tsx` (NOWY) | Link "Przełóż trening" otwiera sheet; z żywym draftem = toast `reschedule.draftBlocked`, sheet zamknięty |
| `src/test/plan-next-step-banner.test.tsx` (NOWY) | Wariant banner: zwinięty pokazuje Zdecyduj, rozwinięcie ujawnia WSZYSTKIE akcje (primary/secondary/repeat/dismiss); wariant card niezmieniony |
| `src/test/dashboard-streak-chip.test.tsx` (NOWY) | Chip przy `streak>0`, brak przy 0 |

ZAKAZ zmian w: `e2e/*.spec.ts` (plan ich nie wymaga - patrz sekcja 5),
`src/lib/*` (zero zmian w logice danych), `index.css`/`tailwind.config.ts`
(wszystko idzie na istniejących tokenach).

---

## 4. NOWE KLUCZE i18n (pl.ts + en.ts)

| Klucz | PL | EN |
|---|---|---|
| `header.totalSuffix` | `ŁĄCZNIE` | `TOTAL` |
| `dash.streakChip` | `{n} tyg. serii` | `{n}-week streak` |
| `dash.hero.today` | `DZISIEJSZA SESJA` | `TODAY'S SESSION` |
| `dash.hero.next` | `NASTĘPNA SESJA` | `NEXT SESSION` |
| `dash.hero.planStarts` | `PLAN STARTUJE` | `PLAN STARTS` |
| `dash.nextStep.decide` | `Zdecyduj` | `Decide` |
| `dash.week.short` | `TYDZ. {current}/{total}` | `WK {current}/{total}` |
| `dash.week.doneToday` | `Dzisiaj zrobione · {day}` | `Today done · {day}` |

Reużywane istniejące (NIE dublować): `dash.details`, `dash.startWorkout`,
`dash.today.continue`, `dash.today.continueSets`, `dash.exercisesCount`,
`dash.week.sessions`, `dash.week.deload`, `dash.weekCardio.title`, `adhoc.start`,
`cardio.addButton`, `stats.title` ("Twoje liczby"/"Your numbers"),
`layout.title.analytics`, `reschedule.title` ("Przełóż trening"),
`dash.preStart.*`, `dash.recovery.*`, `dash.workoutCompleted`, `dash.nextTraining`,
`dash.view`, `dash.greeting.*`, `dash.whatNext`.

---

## 5. TESTY

### E2E - selektory dotykające Dashboardu (MUSZĄ przejść bez edycji speców)

| Spec | Selektor | Status w planie |
|---|---|---|
| `dashboard-order.spec.ts` | kolejność `dash-greeting` → `dash-hero` → `week-card` → `dash-actions` | ZACHOWANA (baner decyzji siedzi między greeting a hero, nie ma testidu z listy) |
| `critical.spec.ts` | heading "Dashboard", tekst `/Rozpocznij trening\|Dzisiaj wolne\|Trening ukończony\|Dzień regeneracji/`, `week-card` | ZACHOWANE (teksty CTA/kart bez zmian treści) |
| `full-app.spec.ts` | `week-card`, `quick-workout-start` (3x klik), `add-cardio-open`, `dash-hero`, `dash-stats`=0, `dash-week-section`=0 | ZACHOWANE (testidy i handlery bez zmian; nowych `dash-stats` nie wprowadzamy) |
| `all-time-stats.spec.ts` | `header-workout-count` klik → sheet | ZACHOWANE (sufiks TOTAL nie zmienia testidu; asercje na licznik = liczba w `tabular-nums`, sprawdzić że spec nie robi exact-text na całym badge - jeśli robi, poprawić SPEC świadomie) |
| `mobile-nav-reachability.spec.ts` | `header-avatar` | ZACHOWANE |
| `reschedule-flow.spec.ts` / `reschedule.spec.ts` | "Przełóż trening" na `/plan` | NIE koliduje (nowy link jest na `/`, spec działa na `/plan`) |
| `accent-color.spec.ts`, `onboarding-accent.spec.ts` | akcent per tokeny | nowy kod wyłącznie na tokenach → przechodzi |

Jedyna dopuszczalna aktualizacja speca: gdyby `all-time-stats.spec.ts` asertował
pełny tekst badge (do zweryfikowania w kroku 1 implementacji).

### Unit (vitest) - istniejące do przejrzenia/aktualizacji

- `week-card-component.test.tsx` - aktualizacja (segmenty).
- `dashboard-order.test.tsx` - aktualizacja pozycji banera.
- `dashboard-active-session.test.tsx`, `dashboard-completion-highlight.test.tsx`,
  `dashboard-plan-source.test.tsx`, `dashboard-prestart.test.tsx`,
  `dashboard-status-slot.test.tsx`, `dashboard-week-cardio.test.tsx`,
  `dashboard-welcome-measurements.test.tsx` - muszą przejść BEZ zmian
  (asertują treści i testidy, które zachowujemy). Jeśli któryś pada, to sygnał
  złamania inwentarza, nie powód do edycji testu.
- `accent-hardcode-scan.test.ts` (strażnik limonki) - bez zmian allowlist.
- `a11y-i18n.test.tsx` / skan i18n - nowe klucze w obu językach.

### Nowe testy (sekcja 3) + NIEZMIENNIKI do zakodowania

1. Niezmiennik hero: dla każdego z 4 typów `todayTraining` wrapper `dash-hero`
   renderuje kartę z kompletem akcji tego stanu (training: start/kontynuuj +
   szczegóły + przełóż; completed: zobacz; preStart: zobacz plan; rest: tipy).
2. Niezmiennik akcji: grid ma DOKŁADNIE 4 kafle i wszystkie 4 działają.
3. Niezmiennik decyzji planu: rozwinięcie banera pokazuje te same akcje co
   wariant card (snapshot listy labeli przycisków card vs banner).
4. Sekwencja (reguła #5 CLAUDE.md, ręcznie + istniejące e2e `continue-workout`):
   plan → start → wyjście → szybki trening → powrót → hero pokazuje Kontynuuj
   z licznikiem serii.

---

## 6. RYZYKA I EDGE-CASE'Y

1. **Radix (regresja b.92)**: wszystkie dialogi/sheety zostają ZAWSZE zamontowane,
   widoczność tylko przez `open`. Przenosiny JSX nie mogą wsadzić żadnego sheeta
   pod warunek renderu. RescheduleSheet: zamknięcie przed mutacją - nie dotykać.
2. **Mockup jest dark-only, apka ma light mode**: cała stylistyka przez tokeny
   surface/foreground, więc light dostaje swoje wartości automatycznie; bramka:
   screenshot w OBU motywach, kontrola kontrastu chipów `bg-primary/10 text-primary`
   w light przy jasnych akcentach palety 11 (kontrast per luminancja już jest w systemie akcentów).
3. **3 akcenty (limonka/amber/sky)**: zero pozostałości pomarańczu z mockupu;
   test-strażnik + ręczny przegląd zrzutów.
4. **Długie teksty PL**: "Dobry wieczór, GRZEGORZ!" + data + chip na 390px -
   `flex-wrap`, `truncate` na tytule dnia w hero (`min-w-0`), `line-clamp-2` na
   opisie banera decyzji. Nazwy dni z kreatora planu bywają długie ("Lower Body Power B"
   to krótki przykład) - tytuł hero łamie się do 2 linii, potem truncate.
5. **Stany puste**: brak planu → `todayTraining='rest'` z `nextDay=null` (stopka
   NEXT SESSION się nie renderuje), `WeekCard` zwraca `null` gdy `model.week` null -
   kolejność e2e `dashboard-order` wymaga week-card w mocku e2e (mock ma plan, OK);
   `streak=0` → brak chipu; brak cardio → `WeekCardioCard` null; `planNextStep` null → brak banera.
6. **Offline / suspend**: bez zmian w logice draftu i synców; jedyny nowy handler
   (kafel Twoje liczby) jest czysto lokalny. Baner offline-sync i degradacja Z174
   nietknięte - test `dashboard-active-session` pilnuje.
7. **`.first()` w e2e**: nowy przycisk "Przełóż trening" na Dashboardzie nie
   koliduje (specy reschedule działają na `/plan`), ale sprawdzić `grep 'Przełóż trening' e2e/`
   po implementacji jeszcze raz.
8. **AppHeader jest globalny**: sufiks TOTAL pojawi się na KAŻDYM ekranie - zmiana
   świadoma i minimalna; jeżeli na wąskich ekranach z długim tytułem badge się
   łamie, sufiks dostaje `hidden min-[360px]:inline`.
9. **Watch preview**: kształt `todayTraining` bez zmian (poz. 43) - żadnych zmian
   typu/`dateStr`.
10. **Nie pokazujemy zmyślonych danych**: bez "45 min", bez "1 more update",
    bez autostartu przyszłej sesji (sekcja new_features).

---

## 7. KOLEJNOŚĆ KROKÓW IMPLEMENTACJI

1. **Pre-check**: `grep 'Przełóż trening' e2e/`, przegląd `all-time-stats.spec.ts`
   pod exact-text badge; `npm run test` na zielono jako baseline.
2. **i18n**: klucze z sekcji 4 do `pl.ts` + `en.ts` → `npm run typecheck`.
3. **WeekCard**: segmenty + nagłówek + stopka; aktualizacja
   `week-card-component.test.tsx`; testy zielone.
4. **PlanNextStepCard**: wariant `banner` + nowy test wariantu; wariant `card`
   snapshotowo niezmieniony (Plan/Cykle).
5. **Dashboard.tsx**: greeting (ikona → primary, chip streak), hero 4 stany,
   podpięcie `openReschedule`, grid 2x2, przeniesienie banera decyzji, usunięcie
   przycisku analityki; nowe testy (quick-actions, hero-reschedule, streak-chip);
   aktualizacja `dashboard-order.test.tsx`.
6. **AppHeader**: sufiks TOTAL.
7. **Bramki automatyczne**: `npm run test`, `npm run typecheck`, `npm run lint`,
   `npm run build`, e2e subset: `dashboard-order`, `critical`, `full-app`
   (sekcje dashboardowe), `all-time-stats`, `continue-workout`, `reschedule-flow`.
   Przy failach e2e najpierw `pkill -f vite` + czyszczenie `node_modules/.vite` (reguła #9).
8. **Pętla weryfikacji designu**: screenshot e2e-mock viewport 390 vs
   `dashboard-simplified.png`; iteracja do zgodności strukturalnej; 3 akcenty
   (limonka/amber/sky) × 2 motywy (dark/light) - zero obcych kolorów.
9. **Checklist inwentarza**: odhaczyć wszystkie 44 pozycje z sekcji 1.
10. **Scenariusz przerwania na urządzeniu** (checklist CLAUDE.md): plan → wyjście →
    szybki trening → powrót → dokończenie → sync; plus background/resume
    (hero i chip streak liczą się z `useToday` - rollover doby).
