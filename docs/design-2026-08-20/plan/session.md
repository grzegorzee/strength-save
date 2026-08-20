# PLAN: Redesign ekranu sesji treningowej (WorkoutDay + ExerciseCard + szybki trening)

> Fala 2, design 2a z `dc/exercise-card.dc.html` + `quick-workout-compact.png` + `exercise-card-full.png`.
> Zasada nadrzędna: RESTYLING istniejących komponentów, ZERO przepisywania logiki
> (draft autosave, sync, rest controller, watch sync, PR, background/resume zostają nietknięte).
> Zakres: widok AKTYWNEGO treningu + pre-start + karta ćwiczenia (tryb edycji dziedziczy restyle karty).
> Widok ukończony (summary) = osobny plan (brief #4), NIE ruszamy go tutaj poza tym,
> że ExerciseCard w trybie edycji dostaje nowy wygląd automatycznie.

---

## 1) INWENTARZ FUNKCJI DO ZACHOWANIA

Źródło: `src/pages/WorkoutDay.tsx` (3132 linie, widok aktywny + pre-start + edit) i
`src/components/ExerciseCard.tsx` (1468 linii) + `RestBar.tsx` + `WorkoutSettingsSheet.tsx`.
Każdy wiersz MUSI być odhaczalny po implementacji.

| # | Funkcja (stan obecny) | Miejsce w nowym designie |
|---|---|---|
| 1 | Przycisk wstecz `navigate(-1)` | Header: kwadrat 40px `rounded-2xl bg-surface-container`, ta sama akcja |
| 2 | Tytuł dnia (`localizeDayName`) + focus (`localizeFocus`) | Header: tytuł `font-heading` uppercase `tracking-[0.16em]`; focus zostaje jako mniejsza linia pod tytułem (mockup jej nie ma, funkcja zostaje) |
| 3 | Przycisk rozgrzewki (Flame) otwierający `WarmupRoutineDialog` | Ikona w prawym slocie headera obok badge Saved (nie znika) |
| 4 | `WarmupRoutineDialog` + odhaczanie pozycji (`warmup-item`, `warmupChecked` w drafcie) | Bez zmian (dialog) |
| 5 | `AutoSaveIndicator`: stany local-saved / cloud-saved HH:MM / error (tappable) | Badge "Saved" w headerze: pigułka `bg-surface-container` z ikoną telefonu/chmury; error = wariant `bg-destructive/20 text-destructive`, nadal klikalny (przywraca saveError). Koniec z `fixed top-4 right-4` |
| 6 | Pasek statystyk TIME/TONNAGE/SETS (`data-testid="session-stats"`, `SessionClock` live) | Sekcja pod headerem: karta `rounded-2xl bg-surface-container`, etykiety `font-mono` 9px `tracking-[0.12em] text-muted-foreground`, wartości `font-heading` 19px, czas `text-primary` |
| 7 | `WorkoutDraftStatusNotice` final-sync-pending (Ponów / Odrzuć / Zamknij) | Pod paskiem statystyk, bez zmian funkcjonalnych |
| 8 | `WorkoutErrorNotice` + wariant save-error (Ponów zapis / Odrzuć / Zamknij) | j.w. |
| 9 | Dialog pre-start (`prestart-sheet`, `prestart-yes`, `prestart-skip`) | Bez zmian |
| 10 | Karta "brak zapisanego treningu" dla daty przeszłej + link do planu | Bez zmian (tokeny surface) |
| 11 | `WorkoutDayNoteSection` (notatka przypięta do DNIA, przyszłe daty, T10) | Bez zmian, pozycja jak dziś |
| 12 | CTA startu treningu (fixed dół; stany loading / timeout 8 s / reload, Z244) | Bez zmian: `kinetic-primary-button` fixed (stan pre-start nie koliduje ze sticky REST, bo przerwa nie istnieje przed startem) |
| 13 | Autostart `?autostart=true` + scroll do pierwszego ćwiczenia | Bez zmian (logika) |
| 14 | Paywall redirect przy starcie (iOS bez PRO) | Bez zmian |
| 15 | FINISH WORKOUT (`data-testid="finish-workout"`) + potwierdzenie inline (Anuluj / Potwierdź) | Duży akcentowy przycisk `kinetic-primary-button` h-14 W PRZEPŁYWIE po notatce treningu (jak mockup); potwierdzenie inline zostaje (podmiana na 2 przyciski w tym samym miejscu) |
| 16 | Guard pustego treningu (toast emptyWorkout, incydent 2026-07-20) | Bez zmian |
| 17 | Notatka treningu (dayNotes textarea, autozapis do draftu) | Sekcja "Workout note" jak mockup: ikona + label, textarea `bg-surface-low rounded-2xl` |
| 18 | "Edytuj plan dnia" (nie ad-hoc) → `/plan/edit` | Zostaje: neutralny przycisk nad sekcją notatki (mockup go nie pokazuje, funkcja MUSI być) |
| 19 | Dodaj ćwiczenie w locie (ad-hoc, `adhoc-add-exercise`) + `ExercisePicker` | Przycisk pełnej szerokości `bg-surface-low rounded-2xl` z plusem `text-primary` (mockup "Add exercise"); nadal TYLKO ad-hoc |
| 20 | Swap ćwiczenia z zakresem "tylko dziś" / "na stałe" (ExercisePicker + footer) | Bez zmian |
| 21 | Pomiń ćwiczenie (menu ⋯) + filtrowanie skipniętych z listy | Bez zmian |
| 22 | `LivePRCelebration` (pełnoekranowy overlay, zawsze zamontowany) | Bez zmian |
| 23 | Badge live PR w karcie (`live-pr-badge`, fitness-success) | Zostaje w nagłówku karty obok meta linii (kolor semantyczny success) |
| 24 | Watch sync (serie z zegarka, finish, discard + toasty) | Bez zmian (logika) |
| 25 | Scroll restore po resume/remount + scroll do lastTouched | Bez zmian |
| 26 | Draft autosave: persistDraftSnapshot, checkpointy 5 min, flush przy tle/pagehide/unmount | NIE DOTYKAĆ |
| 27 | Rest controller (`useRestTimerController`): deadline, persist localStorage, resume po kill | NIE DOTYKAĆ; zmienia się wyłącznie miejsce RENDERU paska |
| 28 | RestBar: countdown z deadline, pasek postępu, przyciski -15 / +15 / SKIP | Sticky pasek na dole ekranu (nowy slot w WorkoutDay): `REST` mono + czas `font-heading text-primary` + progress `bg-primary` + chip SKIP; -15/+15 w rozwinięciu (rząd controls jak dziś) |
| 29 | RestBar fullscreen (`rest-bar-expand`, `rest-fullscreen`) | Zostaje: osobna ikona expand na pasku (testid bez zmian) |
| 30 | Zębatka ustawień przy pasku (`rest-bar-settings` → `WorkoutSettingsSheet`) | WYMÓG WŁAŚCICIELA: tap w korpus paska (label REST + czas + progress) otwiera `WorkoutSettingsSheet`; testid `rest-bar-settings` przechodzi na ten tap-obszar |
| 31 | `WorkoutSettingsSheet`: toggle timerów (auto-start przerwy), długość przerwy, dźwięk | Bez zmian (reuse 1:1, pokrywa wymaganie "długość, dźwięk, auto-start") |
| 32 | Notyfikacja lokalna końca przerwy (schedule przy starcie/korekcie, cancel przy skip/unmount) | Bez zmian (logika w RestBar przenosi się razem z komponentem) |
| 33 | Koniec przerwy w foregroundzie: dźwięk finish + `hapticRestEnd` + `onFinished` zeruje stan | Bez zmian |
| 34 | Miniatura ćwiczenia = poster JPEG + plakietka play (Z195; fallback ikona Dumbbell; brak animacji = brak miniatury Z128.2) | Miniatura 46px `rounded-xl` z centralnym play (mockup); reszta zachowania bez zmian |
| 35 | Dialog animacji (twardy play, fallback controls przy blokadzie autoplay) | Bez zmian |
| 36 | Nazwa ćwiczenia (localized) | `font-heading text-lg font-bold leading-tight` |
| 37 | Liczba serii + Szac. 1RM + Max (`card.setsCount`, `buildRecordBadges`, `formatEst1RMBadge`, `formatMaxLiftBadge`) | Jedna mono linia pod nazwą: `N SERII · SZAC. 1RM x · MAX y` (`font-mono` ~10px uppercase `text-muted-foreground`); dane te same, brak 1RM/Max = segment znika |
| 38 | Menu ⋯: Instrukcje / Zamień / Pomiń / Notatka / Przypnij notatkę (kontrolowany open, Z191) | Bez zmian (trigger jak w mockupie) |
| 39 | Dialog instrukcji + link "Szczegóły" do `/exercise/:slug` | Bez zmian |
| 40 | Licznik done ćwiczenia (x/y, dziś w nagłówku karty) | Ostatnia kolumna nagłówka tabeli serii (mono `1/3`, jak mockup); informacja nie znika |
| 41 | Kaskada celu: RzaAdvice > WeeklyTarget > NextAdvice > ProgressionAdvice | TARGET BOX: `rounded-xl bg-primary/10`, ikona Target `text-primary`, wartość `font-heading font-bold text-primary` ("Cel: 92.5 kg × 5"), ta sama kaskada priorytetów |
| 42 | Uzasadnienie celu (reason, tylko gdy completedSets === 0) | Druga linia target boxa `text-muted-foreground` (mockup "You hit 6 reps - add 2.5 kg") |
| 43 | Semantyka deload / pain / hold (warning, destructive) | Etykieta rodzaju celu w target boxie w kolorze semantycznym (np. "Deload" `text-fitness-warning`); box zawsze `bg-primary/10` |
| 44 | Ostatnia notatka z poprzedniej sesji (`notes.lastNote`) | Pod target boxem, jak dziś (restyle typografii) |
| 45 | Chip interwału EMOM/AMRAP + `IntervalTimer` (flaga) | Zostaje przy meta linii nagłówka karty |
| 46 | `PinnedNoteSection` (`pinned-note-slot`) nad tabelą + edycja z menu | Bez zmian |
| 47 | Nagłówki tabeli SET / POPRZ. / [kg\|lbs] / POWT. / ✓ / × we WSZYSTKICH wariantach gridCols (weight_reps, bodyweight, duration, wdd, assisted) | Restyle typografii nagłówka (mono ~9px `tracking-[0.1em]`); definicje `gridCols` BEZ ZMIAN (Z196!) |
| 48 | Seria rozgrzewkowa "W" (złoto `--ec-warmup-gold`, obie ścieżki renderu) | "W" w kolumnie SET; zostaje ZŁOTO (świadome odejście od mockupu: akcent na W myliłby się z aktywną serią; gold = istniejąca semantyka rozgrzewki) |
| 49 | Aktywna seria: `ring-2 ring-primary` + tint; ukończona: `bg-primary/[0.06]` | Bez zmian (mockup pokazuje dokładnie to: obrys akcentu na aktywnej, tint na done) |
| 50 | Inputy: `DecimalInput` wagi (przecinek i kropka, Z178), reps, `DurationInput` mm:ss, dystans, asysta | Bez zmian logiki; wygląd przez istniejącą klasę `.exercise-card-input` (już: ciemne tło, radius 12, focus primary) |
| 51 | Checkmark ✓: adopcja wartości z poprzedniej sesji, haptic, telemetria, start przerwy, dźwięk complete przy ostatniej | Przycisk 40px `rounded-lg`; done = `bg-primary text-primary-foreground` (dziś bg-accent = ten sam kolor); logika bez zmian |
| 52 | Usuwanie serii × + dialog potwierdzenia dla serii z danymi (`remove-set-confirm` / `remove-set-cancel`, usuwanie po referencji Z171) | Bez zmian |
| 53 | ADD SET + limit 10 serii z komunikatem | Pełna szerokość `bg-surface-low rounded-xl` mono uppercase `tracking-[0.12em]` (mockup) |
| 54 | Chip generatora rozgrzewki (`warmup-generate`, warunki Z108) | Rząd chipów pod ADD SET: `bg-surface-low` h-10, obok Plates/Metrics (`exercise-card-chips` zostaje) |
| 55 | Chip Talerze (`plate-calculator-open`) + `PlateCalculatorSheet` + "Ustaw w serii" | Jak mockup "Plates" (ikona + label), logika bez zmian |
| 56 | Chip Metryki + panel RPE/ból/jakość (tylko z healthConsent) | Jak mockup "Metrics", logika bez zmian |
| 57 | Notatka ćwiczenia (textarea po przełączeniu z menu ⋯) | Bez zmian |
| 58 | Hint POPRZ. `60×6` / "pierwszy raz" (+ warianty duration/assisted) | Mono `text-muted-foreground/60` (mockup PREV) |
| 59 | Placeholder powtórzeń z zakresu planu (`8-12`) | Bez zmian |
| 60 | Tint supersety `bg-primary/[0.04]` | Bez zmian |
| 61 | Przygaszenie ukończonej karty po końcu przerwy (Z145, `restActive`) | Bez zmian; `restActive` liczone z `restState` rodzica (prop `restRun` zostaje w karcie mimo przeniesienia renderu paska) |
| 62 | Tryb edycji (isCompleted && isEditing): karty editable + notatka + "Zapisz zmiany" | Dziedziczy restyle karty; układ ekranu edycji bez zmian |

**RAZEM: 62 funkcje.** Checklist po implementacji: każdy wiersz odhaczony ręcznie na
viewport 390 (e2e mock) + na realnym urządzeniu dla 26, 27, 28, 31, 32, 33.

---

## 2) STRUKTURA NOWEGO EKRANU (sekcja po sekcji, mapowanie stylów)

Mapowanie neutralnych hexów mockupu na tokeny (dark; light rozwiązuje się samo przez tokeny):

| Hex mockupu | Token / klasa apki |
|---|---|
| `#0e0e0e` (tło strony) | `bg-background` (`--background 0 0% 5.5%`) |
| `#131313` (wewnętrzne przyciski, inputy, sekcje) | `bg-surface-low` (`0 0% 7.5%`); inputy przez `.exercise-card-input` |
| `#1c1c1c` (karty, pigułki) | `bg-surface-container` (`0 0% 10%`); karta ćwiczenia przez istniejącą klasę `.exercise-card` (dark #171717, zostaje) |
| `#262626` (chip SKIP, tor progressu) | `bg-surface-highest` (`0 0% 15%`) |
| `#f2f1ee` (tekst główny) | `text-foreground` |
| `#dedcd6` (tekst wtórny) | `text-foreground/80` |
| `#9a9892` (etykiety) | `text-muted-foreground` |
| `#767469` / `#5c5a55` (przygaszone) | `text-muted-foreground/60` |
| `#FF8B3D` (akcent) | `primary`/`accent`: `text-primary`, `bg-primary`, `bg-primary/10`, `ring-primary`, `kinetic-primary-button` |
| `color-mix(acc 12%)` | `bg-primary/10` |
| `#141005` (tekst na akcencie) | `text-primary-foreground` |

Fonty: mockup `Space Grotesk` (disp) → `font-heading` (JEST w tailwind.config);
`Inter` → `font-body` (default body); `ui-monospace` → `font-mono` (default Tailwind).
ZERO nowych `<link>` do Google Fonts (index.html już ładuje Inter + Space Grotesk; PWA offline bez zmian).
ZERO nowych hexów w kodzie ekranu (strażnik: `src/test/accent-hardcode-scan.test.ts`).

### 2.1 Header (WorkoutDay, widok aktywny)

Grid `[40px_1fr_auto]`, `pt-[env(safe-area-inset-top)]`:
- Wstecz: 40px `rounded-2xl bg-surface-container`, ikona ArrowLeft.
- Tytuł: `font-heading text-sm font-bold uppercase tracking-[0.16em] truncate text-center`; focus pod spodem `text-[11px] text-muted-foreground` (zostaje).
- Prawy slot: Flame (rozgrzewka) + badge Saved (`AutoSaveIndicator` przeniesiony z fixed):
  pigułka `rounded-full bg-surface-container px-3 py-2 text-[11px] text-muted-foreground`,
  ikona Smartphone/Cloud (`text-fitness-success` gdy cloud-current), error = `bg-destructive/20 text-destructive` (klik jak dziś).

### 2.2 Pasek statystyk sesji

Karta `rounded-2xl bg-surface-container px-4 py-3`, 3 kolumny (testid `session-stats` zostaje):
- etykieta: `font-mono text-[9px] tracking-[0.12em] uppercase text-muted-foreground` (CZAS / TONAŻ / SERIE),
- wartość: `font-heading text-[19px] font-bold tabular-nums`; TIME `text-primary`, reszta `text-foreground`.
- Dane bez zmian: `SessionClock` (osobny komponent, R2-07!), `sessionVolumeKg` przez `fmt`, `sessionCompletedSets`.

### 2.3 Karta ćwiczenia (ExerciseCard)

Kontener: istniejąca klasa `.exercise-card` (radius 24, dark #171717) + `p-3.5`, wewnętrzny `gap-3`:
1. **Nagłówek**: miniatura 46px (`rounded-xl`, poster + play) · kolumna: nazwa `font-heading text-lg font-bold`
   + mono meta linia (serie · szac. 1RM · max) + badge live PR / chip interwału · przycisk ⋯.
2. **Target box** (gdy jest kaskada celu): `flex items-center gap-2.5 rounded-xl bg-primary/10 px-3 py-2.5`,
   ikona Target `text-primary`, linia 1: `font-heading font-bold text-primary` z etykietą rodzaju
   (Cel / Cel tygodnia / Deload w kolorze semantycznym gdy warning/destructive), linia 2: reason.
   Fallback: brak celu = brak boxa (jak dziś brak badge).
3. **Pinned note** (slot bez zmian).
4. **Tabela serii**: nagłówek mono 9px z licznikiem done w ostatniej kolumnie; wiersze bez zmian
   logiki (gridCols per tracking NIETKNIĘTE, Z196); pola `.exercise-card-input`; ✓ 40px; × jak dziś.
5. **ADD SET**: pełna szerokość `bg-surface-low rounded-xl py-3 font-mono uppercase`.
6. **Rząd chipów**: Rozgrzewka / Talerze / Metryki, `bg-surface-low rounded-xl h-10 text-xs` (testid `exercise-card-chips`).
7. Panel metryk / notatka: bez zmian układu, tylko tokeny.

WAŻNE: karta jest `memo()` (R2-07). Restyle NIE dodaje żadnych nowych propsów ani lambd inline z rodzica.

### 2.4 Pod listą kart

Kolejność w przepływie (jak mockup):
1. "Dodaj ćwiczenie" (ad-hoc): `bg-surface-low rounded-2xl h-12`, plus `text-primary`.
2. "Edytuj plan dnia" (nie ad-hoc): neutralny `bg-surface-low` (funkcja zostaje).
3. "Notatka treningu": ikona + label + textarea `bg-surface-low rounded-2xl min-h-[74px]`.
4. **FINISH WORKOUT**: `kinetic-primary-button w-full h-14` + ikona ✓ (testid `finish-workout`);
   potwierdzenie inline (Anuluj / Potwierdź) podmienia ten przycisk w miejscu (bez fixed baru).
   Padding dolny listy: `pb-[calc(5rem+env(safe-area-inset-bottom))]` (miejsce na sticky REST).

### 2.5 Sticky pasek REST (dół ekranu)

Nowy slot w WorkoutDay renderowany TYLKO gdy `restState !== null` (i sesja aktywna):
`fixed bottom-0 inset-x-0 z-50 bg-surface-low rounded-t-2xl px-4 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]`.
Zawartość (przeniesiony `RestBar`, wariant sticky):
- korpus (tap-obszar, testid `rest-bar-settings`, aria-label z `workout.settingsSheet.title`):
  `REST` mono `text-muted-foreground` · czas `font-heading text-primary font-bold tabular-nums` ·
  progress: tor `bg-surface-highest h-1 rounded-full`, wypełnienie `bg-primary` → **tap otwiera `WorkoutSettingsSheet`** (wymóg właściciela),
- chip SKIP: `rounded-full bg-surface-highest px-3 py-2 font-mono text-[10px]` (akcja `onSkip` = cancel notyfikacji + stop),
- ikona expand (testid `rest-bar-expand`) → fullscreen `rest-fullscreen` (bez zmian, tam też -15/+15/SKIP),
- rząd -15 / +15 / SKIP: zostaje w wariancie rozwiniętym i fullscreen (jak dziś `controls`).
Cała logika z RestBar (deadline, tick 250 ms, schedule/cancel notyfikacji, dźwięk finish, `onFinished`) przenosi się 1:1.
`nextSetLabel` liczy WorkoutDay z `exerciseSets[restState.exerciseId]` (pierwsza nieodhaczona robocza).
Stan `done` ("Koniec przerwy"): pasek w `bg-fitness-success/15`, czas `text-fitness-success` (semantyka jak dziś).

---

## 3) LISTA ZMIAN W PLIKACH

| Plik | Zmiana |
|---|---|
| `src/pages/WorkoutDay.tsx` | Restyle headera (badge Saved zamiast fixed AutoSaveIndicator), restyle paska statystyk, FINISH w przepływie zamiast fixed, render sticky REST z `restState` (+ `nextSetLabel`), przyciski Add exercise / Edytuj plan / notatka w nowych klasach. ZERO zmian w hookach, handlerach, effectach |
| `src/components/ExerciseCard.tsx` | Restyle nagłówka (mono meta linia z istniejących `buildRecordBadges`), target box zamiast rzędu badge, licznik done do nagłówka tabeli, ADD SET / chipy w tokenach surface; USUNIĘCIE inline renderu `<RestBar>` z tabeli (render przejmuje WorkoutDay); prop `restRun` zostaje (przygaszenie Z145) |
| `src/components/RestBar.tsx` | Wariant sticky (prop `variant?: 'inline' \| 'sticky'` albo docelowo tylko sticky): tap w korpus otwiera `WorkoutSettingsSheet` (już zaimportowany), layout wg 2.5; logika deadline/notyfikacji/dźwięku NIETKNIĘTA; testidy `rest-bar`, `rest-bar-expand`, `rest-bar-hero`, `rest-bar-settings`, `rest-fullscreen` zostają |
| `src/components/WorkoutSettingsSheet.tsx` | BEZ ZMIAN (reuse; pokrywa długość przerwy, dźwięk, auto-start = toggle timerów) |
| `src/i18n/locales/pl.ts` + `en.ts` | Nowe klucze z sekcji 4 (OBA pliki, inaczej typecheck padnie) |
| `src/test/rest-bar.test.tsx` | Aktualizacja pod sticky wariant + nowy test tapu w korpus (otwiera sheet) |
| `src/test/exercise-card-layout.test.tsx` | Aktualizacja asercji layoutu (meta linia, target box, licznik w nagłówku tabeli) |
| NOWY `src/test/workout-day-redesign.test.tsx` | Testy niezmienników z sekcji 5 |
| `e2e/exercise-card-v3.spec.ts` (tylko jeśli asercje padną) | Patrz sekcja 5; celem jest NIE zmieniać speców |

NIE dotykamy: `useRestTimerController`, `rest-notification.ts`, `workout-draft-db.ts`,
`workout-sync-engine.ts`, `workout-day-view.ts`, `timer-sound.ts`, `index.css` (tokeny wystarczają),
`tailwind.config.ts` (fonty i kolory już są).

---

## 4) NOWE KLUCZE I18N (pl.ts + en.ts)

Teksty mockupu są EN; wszystko przez klucze. Maksymalny reuse istniejących:
`workout.finishWorkout` (Zakończ trening / Finish workout), `card.addSet`, `plates.chip`,
`card.metrics`, `adhoc.addExercise`, `workout.dayNoteLabel`, `workout.dayNotePlaceholder`,
`card.target`, `card.weekTarget`, `card.deload`, `card.est1rm`, `card.maxLift`, `card.setsCount`,
`rest.bar.title`, `rest.bar.skip`, `rest.bar.next`, `rest.bar.done`, `workout.settingsSheet.title`,
`workout.statTime`, `dash.stat.tonnage`, `workout.statSets`, `workout.status.localSaved`, `workout.status.cloudSaved`.

Nowe (tylko 3):

| Klucz | PL | EN |
|---|---|---|
| `workout.status.savedShort` | `Zapisano` | `Saved` |
| `workout.status.savedCloudShort` | `W chmurze` | `Synced` |
| `rest.bar.openSettings` | `Ustawienia przerwy: długość, dźwięk, auto-start` | `Rest settings: length, sound, auto-start` |

(`rest.bar.openSettings` = aria-label tap-obszaru; wizualnie pasek pokazuje tylko REST + czas + SKIP.)

---

## 5) TESTY

### Istniejące, które MUSZĄ zostać zielone (bez modyfikacji speców jako cel):

- **vitest**: `rest-bar.test.tsx` (countdown z deadline, korekty, expand, notyfikacje),
  `rest-timer-controller.test.tsx`, `rest-notification.test.ts`, `rest-settings.test.tsx`,
  `exercise-card-layout.test.tsx`, `exercise-card-decimal-input.test.tsx`, `workout-day-view.test.ts`,
  `workout-day-notes.test.tsx`, `workout-draft-*.test.ts`, `warmup-*.test`, `timer-sound.test.ts`,
  `accent-hardcode-scan.test.ts` (strażnik limonki), `accent-theme.test.ts`.
- **e2e** (selektory dotykające ekranu): `exercise-card-v3.spec.ts` (getByText: `Powt.`, `kg`, `W`,
  `Dodaj serię`, `Notatka`, `Talerze`, `Rozgrzewka`, `Metryki`; getByRole: `Więcej akcji`,
  `Zaznacz serię jako zrobioną`, `Odznacz serię`, `Rozpocznij trening`; getByLabel `Set 1, kg`;
  testid `rest-timer` toHaveCount(0)), `warmup-persistence.spec.ts` (`warmup-item`),
  `workout-delete-from-day.spec.ts` (`workout-delete*`), `resume-after-kill.spec.ts`,
  `continue-workout.spec.ts`, `batch-save.spec.ts`, `plan-edit-during-workout.spec.ts`,
  `full-app.spec.ts`, `critical.spec.ts`, `edge-cases.spec.ts`, `ui-improvements.spec.ts`,
  `reschedule.spec.ts`, `session-prs-remount.spec.ts`, `email-coach-button.spec.ts`,
  `exercise-video.spec.ts`, `language-switch.spec.ts`, `plan-cycle-day-ids.spec.ts`.

**Kontrakt testidów do zachowania**: `session-stats`, `finish-workout`, `adhoc-add-exercise`,
`exercise-card-chips`, `plate-calculator-open`, `warmup-generate`, `remove-set-confirm`,
`remove-set-cancel`, `pinned-note-slot` (+ `pinned-note-*`), `live-pr-badge`, `prestart-sheet/yes/skip`,
`rest-bar`, `rest-bar-hero`, `rest-bar-expand`, `rest-bar-settings`, `rest-fullscreen`,
`workout-delete`, `workout-delete-confirm`, `workout-delete-dialog`, `workout-email`.
Klucze i18n używane przez e2e (`card.colReps` = "Powt.", `card.addSet` = "Dodaj serię",
`card.moreActions` = "Więcej akcji" itd.) NIE zmieniają wartości.

**Konieczna aktualizacja speców** (jedyna przewidywana): jeśli `rest-bar` przenosi się poza kartę,
asercje w `exercise-card-v3.spec.ts` / `full-app.spec.ts` szukające paska WEWNĄTRZ `firstCard` trzeba
przełączyć na `page.getByTestId('rest-bar')`. Sprawdzić grepem przed startem; zmiana czysto lokatorowa.

### Nowe testy (`workout-day-redesign.test.tsx` + rozszerzenia):

1. **Niezmiennik listy ćwiczeń**: render aktywnej sesji z planu (6 ćwiczeń) po redesignie pokazuje
   6 kart (wzór `workout-day-view.test.ts`; źródła danych nietknięte, test pilnuje regresji renderu).
2. **Sticky REST**: `restState` aktywny → pasek widoczny; tap w korpus (`rest-bar-settings`) otwiera
   `WorkoutSettingsSheet` (sheet w DOM, tytuł `workout.settingsSheet.title`); tap w SKIP woła `onSkip`
   i NIE otwiera sheeta; `restState === null` → paska nie ma.
3. **Notyfikacja przerwy po relokacji**: mount sticky RestBar planuje notyfikację, unmount/skip ją
   anuluje (rozszerzenie `rest-bar.test.tsx` o wariant sticky).
4. **FINISH w przepływie**: aktywna sesja renderuje `finish-workout`; klik pokazuje potwierdzenie
   inline; potwierdzenie woła handleCompleteWorkout (mock).
5. **Badge Saved**: stany local / cloud / error renderują właściwe klucze; error klikalny.
6. **Target box**: kaskada priorytetów (RZA > weekly > next > progression) daje jeden box;
   deload pokazuje etykietę semantyczną; brak danych = brak boxa.
7. **Meta linia**: brak `historicalBest` → linia tylko z liczbą serii (zero zmyślonych wartości).
8. **Strażnik akcentu**: `accent-hardcode-scan` zielony; DODATKOWO rozszerzyć skan o hexy mockupu
   (`#FF8B3D`, `#0e0e0e`, `#131313`, `#1c1c1c`, `#262626`, `#f2f1ee`, `#dedcd6`, `#9a9892`, `#767469`)
   w plikach ekranu (tani grep-test, ten sam wzorzec).
9. **Bramka 3 akcentów** (brief): screenshot e2e viewport 390 na limonce, amber, sky; zero
   pozostałości innego akcentu (ręczna weryfikacja w pętli designu).

### Scenariusze ręczne na urządzeniu (checklist CLAUDE.md):
- background/resume: start przerwy → zgaś ekran → notyfikacja przychodzi, po powrocie sticky pasek
  pokazuje realny czas z deadline;
- sekwencja przerwania: plan → wyjście → szybki trening → powrót do planu (wszystkie ćwiczenia!) →
  zakończenie → sync;
- tap w pasek REST przy biegnącej przerwie → zmiana długości w sheecie → NOWA przerwa używa nowej
  wartości (bieżąca się nie restartuje);
- PR celebration + swap + notatki: bez regresji.

---

## 6) RYZYKA I EDGE-CASE'Y

1. **Relokacja RestBar = najwyższe ryzyko ekranu.** Pasek niesie schedule/cancel notyfikacji
   lokalnej i sygnał końca. Mitygacja: komponent przenosi się w CAŁOŚCI (żadnego rozdzielania
   logiki), zmienia się tylko rodzic renderujący i layout; testy 2-3 + scenariusz urządzeniowy.
2. **FINISH z fixed do przepływu**: przy długiej liście user musi doscrollować. Mitygacja: sticky
   REST i tak prowadzi rytm sesji; potwierdzenie inline zostaje (ochrona przed misclickiem);
   jeśli właściciel zgłosi regresję wygody, fallback = przywrócić fixed (1 commit).
3. **Memo karty (R2-07)**: nowe elementy nagłówka nie mogą dostawać niestabilnych propsów.
   Restyle używa WYŁĄCZNIE istniejących propsów.
4. **Radix Sheet przy sticky pasku (lekcja b.92)**: `WorkoutSettingsSheet` może być otwarty, gdy
   przerwa się kończy i pasek znika. Sheet renderować NIEZALEŻNIE od `restState` (stan `settingsOpen`
   w WorkoutDay lub w RestBar utrzymywanym w drzewie), nigdy unmount przy open.
5. **Stany puste**: brak celu = brak target boxa; brak 1RM/Max = krótsza meta linia; brak PREV =
   "pierwszy raz"; brak animacji = brak miniatury; pusta sesja = guard emptyWorkout bez zmian.
6. **Długie teksty**: nazwy ćwiczeń PL (np. "Wyciskanie sztangi na ławce skośnej") - nazwa
   `line-clamp-2`, meta linia `truncate`; reason w target boxie do 2 linii; tytuł headera `truncate`.
7. **Offline**: badge Saved pokazuje stan lokalny (Smartphone), final-sync-pending banner bez zmian;
   provisional sesja = "Zapisano" lokalne, bez udawania chmury.
8. **Warianty tracking**: duration / wdd / assisted mają inne gridCols - restyle nagłówka tabeli
   przez wspólne klasy, definicji gridów NIE ruszać (regresja Z196 = ucięte "122.5" na 390 px).
9. **Safe-area**: sticky REST `pb-[env(safe-area-inset-bottom)]`; padding listy powiększony, żeby
   FINISH nie chował się pod paskiem przy aktywnej przerwie.
10. **Mockupowe dane**: "EST. 1RM 117" itp. pochodzą WYŁĄCZNIE z `historicalBest`; target z realnej
    kaskady; nic nie jest zmyślane.
11. **Dark/light**: mapowanie przez tokeny; light mode zweryfikować wizualnie (mockup jest dark).
12. **e2e vitalność**: przed uznaniem czerwonych e2e restart dev servera (`pkill -f vite`, zasada #9).

---

## 7) KOLEJNOŚĆ KROKÓW IMPLEMENTACJI

Każdy krok = osobny commit, po każdym: `npm run test` + `typecheck` + `lint`, kroki 4-5 dodatkowo e2e ekranu.

1. **i18n**: 3 nowe klucze do `pl.ts` + `en.ts` (typecheck zielony od razu).
2. **Header + pasek statystyk** (WorkoutDay): badge Saved w headerze (usunięcie fixed), restyle
   statystyk; weryfikacja `session-stats` + testy badge (nowy test 5).
3. **ExerciseCard restyle**: nagłówek (miniatura, font-heading, mono meta), target box, licznik
   done w nagłówku tabeli, ADD SET + chipy; `exercise-card-layout.test` + e2e `exercise-card-v3`.
4. **Sticky REST**: wariant sticky RestBar, render w WorkoutDay, usunięcie renderu inline z karty,
   `nextSetLabel` z rodzica, tap → WorkoutSettingsSheet; testy 2-3 + `rest-bar.test` aktualizacja;
   scenariusz urządzeniowy background/resume.
5. **FINISH w przepływie** + sekcje Add exercise / Edytuj plan / notatka; test 4 + e2e finish flow.
6. **Strażnik hexów mockupu** (rozszerzenie skanu) + test niezmiennika listy (test 1, 8).
7. **Pętla weryfikacji designu**: screenshot e2e viewport 390 vs mockup, 3 akcenty (limonka, amber,
   sky), dark + light; iteracja do zgodności strukturalnej.
8. **Checklist wdrożeniowy CLAUDE.md**: scenariusz przerwania (plan → wyjście → szybki → powrót),
   background/resume na realnym urządzeniu, potem dopiero deploy web / bump iOS.
