# PLAN: Redesign ekranu Workout Summary (podsumowanie treningu)

> Artboard: `docs/design-2026-08-20/dc/workout-summary.dc.html` (wariant 1a) + screenshoty
> `workout-summary-top.png` / `workout-summary-bottom.png`.
> Kod źródłowy ekranu: `src/pages/WorkoutDay.tsx` (COMPLETED VIEW, linie ~2453-2737,
> EDIT MODE ~2741-2799) + `src/components/WorkoutCompletionSequence.tsx` (stage machine:
> celebration → rating → done; "done" = hero podsumowania).
> Logika: `src/lib/workout-completion-summary.ts` (computeCompletionSummary),
> `src/lib/pr-utils.ts` (computeSessionPRs, formatPRValue/Delta), `src/lib/summary-utils.ts`.
> Fundament stylów: `docs/design-2026-08-20/plan/tokens.md` (klasy `.eyebrow-mono`,
> `.chip-mono`, `.accent-wash`, `.accent-ring`; zakaz color-mix; tinty /10 /15 /20 + /40 /60).
> Plan sesji (`plan/session.md`) definiuje FINISH WORKOUT jako
> `kinetic-primary-button w-full h-14` - BACK TO DASHBOARD kopiuje te klasy 1:1 (wymóg właściciela).

---

## 1. Inwentarz funkcji do zachowania (33 pozycje)

Zakres = completed view + sekwencja completion + tryb edycji (wejścia z tego ekranu).

| # | Funkcja (stan obecny) | Miejsce w nowym designie |
|---|---|---|
| 1 | Przycisk wstecz (`navigate(-1)`) | Header, kwadratowa ikonka `bg-surface-highest rounded-lg` (jak mockup) |
| 2 | Tytuł dnia `localizeDayName(day.dayName)` | Header, `font-heading text-xl font-bold` |
| 3 | Focus dnia `localizeFocus(day.focus)` | Header, subtitle `text-sm text-muted-foreground`: `focus · data` |
| 4 | Przycisk Edit (`handleEditFromSummary`; ukryty gdy `isFinalSyncPending`) | Header, pigułka `.chip-mono` z ikoną Pencil (warunek bez zmian) |
| 5 | Baner final-sync-pending (`WorkoutDraftStatusNotice`: Synchronizuj teraz / Usuń szkic / Zamknij) | Bez zmian, pod headerem (komponent nietykany; e2e batch-save) |
| 6 | Baner save-error + `WorkoutErrorNotice` (retry / discard / dismiss) | Bez zmian, pod headerem |
| 7 | `AutoSaveIndicator` (fixed top-right, stan error klikalny) | Bez zmian |
| 8 | Celebracja (overlay, confetti przy PR/bigMoment, przycisk X, auto-advance, `useExclusiveOverlay`) | Bez zmian (stage `celebration` nietykany) |
| 9 | Ocena: kciuk w górę (`onRate('up')`) | Bez zmian (stage `rating` nietykany) |
| 10 | Ocena: kciuk w dół → chipsy powodów (too_heavy / too_long / weak_day) + Zapisz ocenę | Bez zmian |
| 11 | Pominięcie oceny (X) bez zapisu | Bez zmian |
| 12 | Podziękowanie po ocenie (`rateThanks`) | Bez zmian, nad hero kartą |
| 13 | Hero: tonaż `fmtTonnage(summary.volumeKg)` | Hero karta, wielka liczba w akcencie (`font-heading text-display-lg text-primary`), jednostka osobnym spanem |
| 14 | Hero: czas trwania (`sessionDurationSec`, fallback `—`) | Rząd statów TIME w hero karcie |
| 15 | Hero: liczba serii roboczych (`completedSets`) | Rząd statów SETS; przy planie wartość `done/planned` (np. `10/12`) |
| 16 | Plan serii done/planned + % planu (`planSets`, `planPct`; tylko gdy plan) | SETS jako `done/planned` + trzeci stat `% planu` = `planPct`; ukryte gdy null |
| 17 | Delta wolumenu vs poprzednia sesja tego dnia (`volumeDeltaPct`) | Hero, badge `+14%`/`-24%` w prawym górnym rogu + label `vs {data poprzedniej}` + DWA paski porównania (nowa wizualizacja tych samych danych) |
| 18 | Przycisk Popraw serie (`onEditSets`; ukryty przy final sync pending) | Pigułka "Fix sets" w hero karcie, ten sam handler i warunek, ta sama etykieta `workout.completion.editSets` |
| 19 | Sekcja PR: lista rekordów (nazwa, wartość wg typu reps/duration/weight/est1RM z podpisem estymacji, delta) | Sekcja "Nowe rekordy ({n})": nagłówek eyebrow w akcencie + kafle `.accent-wash` (grid 2 kolumny) |
| 20 | Notatka dnia (`dayNotes`, karta ze StickyNote; tylko gdy jest) | Karta `bg-surface-low rounded-xl` między hero a listą ćwiczeń (jak obecnie) |
| 21 | Nagłówek listy ćwiczeń z licznikiem (`workout.completion.exercisesCount`) | Nagłówek sekcji `.eyebrow-mono` + kolumna "Tonaż" po prawej |
| 22 | Wiersz ćwiczenia: nazwa (localized) + status pominięte (opacity + `dayplan.badgeMissed`) | Wiersz listy; skipped: `opacity-50` + badge zamiast licznika serii |
| 23 | Wiersz ćwiczenia: postęp serii `done/total` (`workout.setsProgress`) | Prawa strona nazwy, `font-mono text-[10px]`; niepełne (`done < total`): `text-fitness-warning` |
| 24 | Wiersz ćwiczenia: tonaż ćwiczenia w jednostce usera | Kolumna wartości `font-mono font-semibold` (max = `text-primary`) + NOWY pasek rankingowy pod nazwą |
| 25 | Rozwijanie szczegółów ćwiczenia (chevron, `expandedSummaryIds`, disabled gdy brak serii) | Bez zmian logicznie; chevron na końcu wiersza |
| 26 | Szczegóły: lista serii (rozgrzewka: płomień + `warmupShort` w `--ec-warmup-gold`; numer serii; `reps × weight` albo same reps; nieodhaczone wyszarzone) | Bez zmian, panel rozwijany `border-t border-surface-high` |
| 27 | Share → `ShareWorkoutDialog` (tonaż, czas, PR-y, streak, tydzień N z M dla dnia z planu) | Rząd dwóch przycisków `h-12` (Share2 + label); dialog i payload bez zmian |
| 28 | Wyślij do trenera (`data-testid="workout-email"`) → `EmailWorkoutDialog mode="workout"` (initialEmail z profilu) | Drugi przycisk rzędu (Mail + label); testid i dialog bez zmian |
| 29 | Wróć do dashboardu → `navigate('/?celebrate=1')` (confetti na Dashboardzie) | Duży akcentowy CTA `kinetic-primary-button w-full h-14` z ikoną Home; TA SAMA wielkość co FINISH WORKOUT (wymóg właściciela); handler bez zmian |
| 30 | Usuń trening (`workout-delete`) → AlertDialog (`workout-delete-dialog`, `workout-delete-confirm`) → `deleteWorkoutEverywhere` → toast + `/history`; renderowany tylko gdy `sessionId` | Tekstowy przycisk pod CTA (ghost, `text-destructive`); testidy i dialog bez zmian |
| 31 | Tryb edycji (`isEditing`): pełne `ExerciseCard` editable, textarea notatki dnia, Zapisz zmiany, wyjście strzałką | Bez zmian (EDIT MODE poza zakresem mockupu; wejścia z pkt 4 i 18 zachowane) |
| 32 | Wejście z historii (`justCompleted=false`): podsumowanie od razu, zero celebracji i oceny | Bez zmian (stage machine nietykana; test `workout-completion-sequence.test.tsx`) |
| 33 | Jednostki kg/lbs (`useUnit`: fmt, toDisplay, fmtTonnage) + locale dat (`dateLocale(lang)`) | Bez zmian; hero dzieli wynik `fmtTonnage` na wartość + jednostkę po pierwszej spacji (`5.6`+`t`, `12.3`+`k lbs`) |

`feature_inventory_count = 33`.

---

## 2. Struktura nowego ekranu sekcja po sekcji (mapowanie stylów na tokeny)

Neutralne hexy mockupu wg kontraktu `plan/tokens.md`:
`#0e0e0e→bg-background/--surface`, `#131313→surface-low`, `#1c1c1c→surface-container`,
`#262626→surface-highest`, `#f2f1ee→foreground`, `#dedcd6→text-foreground/80`,
`#9a9892→muted-foreground`, `#767469/#5c5a55→muted-foreground/70`, `#3a3833→outline-variant`,
`var(--acc)→primary`, `color-mix 13%→bg-primary/10` (`.accent-wash`). ZERO nowych hexów,
zero `color-mix` (WKWebView iOS 15/16.0). Fonty: `.disp`→`font-heading` (Space Grotesk,
już ładowany w index.html), `.mono`→`font-mono` (systemowy stack, zero pobrań), Inter = `font-body`.

### 2.1 Header
- Wstecz: przycisk 40x40 `rounded-lg bg-surface-highest` z ArrowLeft (obecny handler).
- Kolumna: tytuł `font-heading text-xl font-bold leading-none` = dayName;
  subtitle `text-sm text-muted-foreground` = `focus · {data}` (data z `targetDate`,
  `toLocaleDateString(dateLocale(lang), { day: 'numeric', month: 'short' })`; NOWE w headerze,
  dane już są). Mockupowe "Thursday" jako tytuł odrzucone: dayName apki ("Upper Body A")
  jest realną tożsamością dnia, weekday bywa mylący przy treningu przełożonym.
- Edit: pigułka `.chip-mono` (Pencil 13px + `dash.edit`); ukryta gdy `isFinalSyncPending` (bez zmian).

### 2.2 Hero karta (`bg-surface-container rounded-xl p-5`, gap wewnętrzny 14px)
- Rząd 1: tonaż `font-heading font-bold text-display-lg text-primary leading-[0.85]`
  + jednostka `font-heading text-2xl font-semibold text-primary`.
  Po prawej (tylko gdy `volumeDeltaPct !== null`): delta `font-mono text-[15px] font-bold
  text-foreground/80 tabular-nums` + pod nią `.eyebrow-mono text-muted-foreground`
  `t('workout.summary.vsPrev', { date })` (data z NOWEGO pola `prevDate`, patrz §3).
- Rząd 2 (paski porównania; render tylko gdy `prevVolumeKg !== null`):
  dwa wiersze `label | tor | wartość`:
  - label `.eyebrow-mono w-11` = `workout.summary.today` / sformatowana `prevDate`,
  - tor `h-3 rounded-full bg-surface-highest overflow-hidden`,
    wypełnienie dziś = `bg-primary`, poprzedni = `bg-outline-variant`;
    szerokości = `volume / max(volumeKg, prevVolumeKg) * 100%`,
  - wartość `font-mono text-[10.5px] tabular-nums` = `fmtTonnage` obu.
- Rząd 3 (staty + Fix sets): TIME (`fmtDuration`, `—` gdy null), SETS
  (`done/planned` przy planie, samo `done` bez planu), `% planu` (`planPct`, ukryty gdy null).
  Wartość `font-heading text-[17px] font-bold tabular-nums`, label `.eyebrow-mono
  text-muted-foreground` (`workout.statTime`, `workout.statSets`, NOWY `workout.summary.statPlanned`).
  Po prawej pigułka `.chip-mono` (Pencil + `workout.completion.editSets`) = obecny
  `onEditSets` (ukryta gdy brak handlera; testy sekwencji: rola button, name "Popraw serie" zostaje).

### 2.3 Sekcja rekordów (tylko gdy `prs.length > 0`)
- Nagłówek: ikona Trophy `text-primary` + `.eyebrow-mono text-primary`
  = `workout.summary.recordsTitle` z `{n}` (substring "Nowe rekordy" zachowany dla e2e
  `session-prs-remount.spec.ts`).
- Kafle: `grid grid-cols-2 gap-2.5`; kafel `.accent-wash rounded-xl p-4`:
  nazwa `text-xs text-foreground/80 truncate`, wartość `font-heading text-2xl font-bold
  text-primary` (est1RM: `text-lg`, pełny podpis `pr.est1rmValue` zostaje),
  delta `font-mono text-[11px] font-bold text-primary` (z `formatPRDelta`).
  Nieparzysta liczba PR: grid sam łamie wiersze.

### 2.4 WHERE THE VOLUME WENT (NOWA sekcja; render tylko gdy `volumeKg > 0` i >=2 kubełki)
- Nagłówek `.eyebrow-mono text-muted-foreground` = `workout.summary.volumeSplitTitle`.
- Pasek `flex h-3.5 rounded-full overflow-hidden gap-[2px]`; segment o szerokości `%` udziału.
- Odcienie JEDNEGO akcentu wg malejącego udziału (skala z tokens.md §2.3):
  `bg-primary`, `bg-primary/75`, `bg-primary/55`, `bg-primary/35`, `bg-primary/20`;
  kubełek "Inne" zawsze `bg-surface-highest`. Max 5 kubełków akcentowych, reszta
  agregowana do "Inne".
- Legenda `flex flex-wrap gap-x-4 gap-y-2.5`: kwadracik 8px `rounded-[2px]` w kolorze
  segmentu + label `text-xs text-foreground/80` + procent `font-mono text-[11px]
  text-muted-foreground`.
- Dane: NOWY `src/lib/volume-split.ts` (§3). Etykiety kubełków przez ISTNIEJĄCE
  `localizeCategory` (kategorie biblioteki: chest/back/shoulders/legs/arms/core/glutes/calves);
  jedyny nowy klucz: `workout.summary.volumeSplitOther`.

### 2.5 Lista EXERCISES (restyle istniejącej listy, te same dane i stany)
- Nagłówek: `.eyebrow-mono` `workout.completion.exercisesCount` (lewa) +
  `workout.completion.statTonnage` (prawa).
- Wiersz (button, obecny toggle expand): kolumna lewa `min-w-0 flex-1`:
  - linia 1: nazwa `text-[13.5px] font-medium truncate` + po prawej licznik
    `font-mono text-[10px]` `workout.setsProgress` (`text-fitness-warning` gdy
    `done < total`, inaczej `text-muted-foreground/70`); skipped: `dayplan.badgeMissed`;
  - linia 2: pasek rankingowy `h-1.5 rounded-full bg-surface-low` z wypełnieniem
    `width = tonaż / max(tonaż) * 100%`; max = `bg-primary`, pozostałe `bg-primary/40`
    (NOWA wizualizacja istniejącej wartości tonażu);
  - kolumna wartości: `w-[52px] text-right font-mono text-xs font-semibold tabular-nums`
    = `Math.round(toDisplay(totalWeight))` (max = `text-primary`, reszta `text-foreground/80`);
  - chevron (rotacja przy expand) bez zmian.
  Chip numeru ćwiczenia znika (prezentacja; kolejność listy = ta sama informacja).
  Akcentowy chip tonażu znika (wartość przenosi się do kolumny; zero utraty danych).
- Panel rozwinięty: bez zmian logicznych (serie, W z płomieniem w `--ec-warmup-gold`,
  nieodhaczone `opacity-40`).

### 2.6 SESSION SHAPE - POMINIĘTE (fallback: sekcja nie istnieje)
`SetData` nie ma `recordedAt`; jedyny znacznik `updatedAt` to LWW (zmienia się przy
każdej edycji, także po treningu) i nie ma czasów przerw. Rysowanie kształtu sesji
z tych danych = zmyślone dane. Sekcji NIE budujemy; rekomendacja backlogowa w §6.

### 2.7 Akcje końcowe
- Rząd: Share + Wyślij do trenera, dwa przyciski `flex-1 h-12 rounded-2xl` variant
  `secondary` (`bg-surface-container`), ikony Share2 / Mail; handlery, dialogi
  i `data-testid="workout-email"` bez zmian.
- CTA: `Button className="kinetic-primary-button w-full h-14"` + ikona Home +
  `workout.backToDashboard`; `onClick={() => navigate('/?celebrate=1')}` (bez zmian).
  Klasy IDENTYCZNE z FINISH WORKOUT z planu sesji (wymóg właściciela). Klasa sama robi
  uppercase/tracking; tekst na gradiencie = `text-primary-foreground` z klasy (kontrast
  per luminancja akcentu, mechanizm `applyAccent`).
- Delete: obecny ghost `text-destructive` wyśrodkowany pod CTA; testidy + AlertDialog bez zmian.

---

## 3. Lista zmian w plikach

| Plik | Zmiana |
|---|---|
| `src/lib/workout-completion-summary.ts` | `CompletionSummary` + pole `prevDate: string \| null` (z `previous.date`; już wyliczane, tylko zwrócić) |
| `src/lib/volume-split.ts` | NOWY: `computeVolumeSplit(items: { name: string; tonnageKg: number }[], resolveCategory)` → posortowane kubełki `{ key, tonnageKg, pct }`; agregacja: kategoria z `exerciseLibrary` → custom exercises (`useCustomExercises` ma `category`) → `getExerciseDetails(name,'pl').primaryMuscle` zmapowane na kategorię (biceps/triceps/forearms→arms, quads/hamstrings→legs, core→core, fullbody→other) → `other`; kubełki <5% oraz powyżej limitu 5 → `other`; czysta funkcja bez Reacta |
| `src/components/WorkoutCompletionSequence.tsx` | Redesign WYŁĄCZNIE stage `done`: hero karta (§2.2) + sekcja rekordów (§2.3); stages celebration/rating nietykane; props bez zmian (summary niesie nowe `prevDate`) |
| `src/components/WorkoutVolumeSplit.tsx` | NOWY komponent prezentacyjny (§2.4): props `buckets`, mapa odcieni indeks→klasa (STATYCZNA lista klas, nie template string, żeby Tailwind je zbudował) |
| `src/pages/WorkoutDay.tsx` | COMPLETED VIEW: header z datą (§2.1), wpięcie `WorkoutVolumeSplit` (dane: nazwa + totalWeight per ćwiczenie), restyle listy ćwiczeń (§2.5: max tonaż liczony raz przed mapą), rząd Share/Send (§2.7), CTA `kinetic-primary-button w-full h-14`, delete pod CTA; ZERO zmian w handlerach, dialogach, testidach, EDIT MODE |
| `src/i18n/locales/pl.ts` + `en.ts` | Nowe klucze §4 (oba pliki, inaczej typecheck padnie) |
| `src/test/workout-completion-summary.test.ts` | + przypadki `prevDate` |
| `src/test/volume-split.test.ts` | NOWY (§5) |
| `src/test/workout-completion-sequence.test.tsx` | Aktualizacja 1 testu (§5) + nowe asercje pasków porównania |

Poza zakresem (świadomie): `WorkoutDraftStatusNotice`, `ShareWorkoutDialog`,
`EmailWorkoutDialog`, `ExerciseCard` (edit mode), `ConfettiBurst`, stage rating/celebration,
`tailwind.config.ts`, `index.html`.

Zależność: klasy `.eyebrow-mono` / `.chip-mono` / `.accent-wash` z `plan/tokens.md`
muszą być wdrożone PRZED tym ekranem (albo w tym samym PR).

## 4. Nowe klucze i18n (pl.ts + en.ts)

| Klucz | PL | EN |
|---|---|---|
| `workout.summary.today` | `Dziś` | `Today` |
| `workout.summary.vsPrev` | `vs {date}` | `vs {date}` |
| `workout.summary.statPlanned` | `% planu` | `% planned` |
| `workout.summary.recordsTitle` | `Nowe rekordy ({n})` | `New records ({n})` |
| `workout.summary.volumeSplitTitle` | `Gdzie poszedł tonaż` | `Where the volume went` |
| `workout.summary.volumeSplitOther` | `Inne` | `Other` |

Reużywane bez zmian: `workout.completion.editSets` (Fix sets), `workout.completion.statTonnage`
(kolumna Tonaż), `workout.statTime`, `workout.statSets`, `workout.setsProgress`,
`workout.completion.exercisesCount`, `workout.backToDashboard`, `comp.share.share`,
`email.sendToCoach`, `history.delete*`, `dash.edit`, `dayplan.badgeMissed`,
`workout.warmupShort`, `workout.setLabel`, `card.repsValue`, `pr.est1rmValue`,
`workout.completion.prReps`, `localizeCategory` (etykiety kubełków).
`workout.completion.prTitle`, `planSets`, `volumeVsPrev` przestają być renderowane
(informacja przenosi się do statów/badge); klucze zostają w locales (zero ryzyka,
sprzątanie osobnym krokiem).

## 5. Testy

Istniejące, MUSZĄ zostać zielone bez zmian (niezmienniki):
- e2e `session-prs-remount.spec.ts`: `getByText('Nowe rekordy')` (substring w
  `Nowe rekordy (2)` przechodzi) + nazwa ćwiczenia w kaflu PR; PR-y po remount.
- e2e `email-coach-button.spec.ts`: `workout-email` → `email-workout-dialog`, bez zakresów.
- e2e `workout-delete-from-day.spec.ts`: `workout-delete`, `workout-delete-dialog`,
  `workout-delete-confirm`, brak przycisku przy aktywnym treningu.
- e2e `batch-save.spec.ts`: teksty `WorkoutDraftStatusNotice` (komponent nietykany).
- unit `workout-completion-sequence-pr.test.tsx`, `-confetti.test.tsx`,
  `session-prs.test.ts`, `workout-day-view.test.ts` (źródło listy dnia nietykane),
  `accent-hardcode-scan.test.ts` (strażnik limonki: zero klas lime-*, zero hexów)
  + nowy `design-token-guard.test.ts` z tokens.md (zero hexów mockupu, zero color-mix).

Do aktualizacji:
- `workout-completion-sequence.test.tsx`, test "plan vs wykonanie...": zdanie
  `10 z 12 zaplanowanych serii` znika z UI → asercja na stat `10/12` + `% planu` `83`;
  `+14%` (badge) i `Nowe rekordy` zostają. Testy "Popraw serie" przechodzą bez zmian
  (rola i nazwa przycisku zachowane).

Nowe:
- `volume-split.test.ts`: kategoria z biblioteki; custom exercise z kategorią;
  fallback primaryMuscle→kategoria (biceps→arms, quads→legs); nierozpoznane→other;
  agregacja <5% i >5 kubełków do other; sortowanie malejąco; sumowanie pct; tonaż 0 → pusta lista.
- `workout-completion-summary.test.ts`: `prevDate` = data ostatniej ukończonej sesji
  tego dayId; `null` bez historii; bieżąca sesja wykluczona.
- `workout-completion-sequence.test.tsx`: paski porównania widoczne przy
  `prevVolumeKg`, NIEwidoczne przy `prevVolumeKg: null` (pierwszy trening dnia);
  label `vs {date}`.
- Niezmiennik funkcji ekranu (nowy test RTL albo rozszerzenie istniejącego):
  completed view renderuje jednocześnie Edit, Popraw serie, Share, Wyślij do trenera,
  Wróć do dashboardu, Usuń trening (wzorzec `workout-day-view.test.ts`: "stary
  przepływ nadal ma wszystko").
- Bramka wizualna (proces briefu): screenshot e2e-mock viewport 390 vs mockup na
  3 akcentach (limonka, amber, sky) - zero pozostałości pomarańczu/limonki.

## 6. Ryzyka i edge-case'y

- **Brak poprzedniej sesji dnia** (pierwsze wykonanie, ad-hoc, dzień po replan ze
  zmianą dayId): `prevVolumeKg/prevDate/volumeDeltaPct = null` → bez badge i bez
  pasków, hero degraduje do samego tonażu + statów (jak dziś). Nic nie zmyślamy.
- **Ad-hoc / brak planu**: `plannedSets/planPct = null` → SETS pokazuje samo `done`,
  stat `% planu` ukryty.
- **Tonaż 0** (trening bodyweight bez obciążenia, same duration): hero pokazuje `0.0 t`
  (obecne zachowanie, bez regresji); paski rankingowe i volume split UKRYTE
  (`volumeKg === 0` → sekcje nie renderują się; brak pasków = brak fałszywego rankingu).
- **lbs**: `fmtTonnage` daje `12.3 k lbs` → split po PIERWSZEJ spacji: wartość `12.3`,
  jednostka `k lbs` (split po ostatniej spacji by zawiódł).
- **Długie nazwy ćwiczeń** (własne, PL): `min-w-0 truncate` w wierszu i kaflu PR.
- **Dużo PR-ów** (>4): grid 2 kolumny łamie wiersze; wartości est1RM z podpisem
  `(szac. 1RM)` mniejszym fontem.
- **Delta ekstremalna** (`+300%`): tabular-nums, kontener auto; pasek "dziś" przy
  wolumenie > poprzedniego ma 100%, poprzedni proporcjonalnie (dzielnik = max obu).
- **Skipped exercises**: tonaż 0 → nie zaburzają rankingu ani splitu; w liście
  `opacity-50` + badge (bez zmian).
- **Final sync pending**: Edit i Popraw serie ukryte (obecna logika `isFinalSyncPending`),
  banery statusu nad hero działają jak dziś (reguła #6: stan błędu ma wyjście).
- **Offline**: wszystko liczone lokalnie z `workouts` + draft; brak fetchy. Share/email
  otwierają dialogi jak dziś (własna obsługa błędów).
- **e2e mock**: fixture'y mogą nie mieć drugiej sesji tego samego dayId → paski
  porównania niewidoczne w e2e; nowe asercje pisać na unit/RTL, w e2e nie assertować pasków.
- **WKWebView iOS 15/16.0-16.1**: zakaz `color-mix` (cała deklaracja odrzucana);
  wyłącznie `bg-primary/NN` (alfa HSL, wspierana od Safari 12.1).
- **Strażnik akcentu**: odcienie splitu jako STATYCZNA lista klas
  (`['bg-primary','bg-primary/75',...]`), nie interpolacja stringów (Tailwind purge).
- **SESSION SHAPE**: pominięte (brak `recordedAt` per seria; `updatedAt` to LWW
  przepisywany przy edycji). Backlog: zapisywać `recordedAt` przy odhaczeniu serii
  (epoch ms, wzorzec pomiarów), po zebraniu danych sekcję da się włączyć uczciwie.
- **Radix/overlaye**: bez nowych sheetów; AlertDialog delete bez zmian (zero ryzyka
  regresji buildu 92).

## 7. Kolejność kroków implementacji

1. **Prereq**: klasy pomocnicze z `plan/tokens.md` w `src/index.css` (`.eyebrow-mono`,
   `.chip-mono`, `.accent-wash`) + strażnik `design-token-guard` (jeśli jeszcze nie wdrożone).
2. `workout-completion-summary.ts`: pole `prevDate` → testy (TDD: najpierw czerwone przypadki).
3. `volume-split.ts` + `volume-split.test.ts` (czysta logika, bez UI).
4. `WorkoutCompletionSequence.tsx` stage `done`: hero (tonaż w akcencie, badge delty,
   paski porównania, staty, pigułka Popraw serie) + sekcja rekordów; aktualizacja
   `workout-completion-sequence.test.tsx` + nowe asercje.
5. i18n: 6 kluczy do `pl.ts` i `en.ts` (razem, inaczej typecheck padnie).
6. `WorkoutVolumeSplit.tsx` + wpięcie w COMPLETED VIEW WorkoutDay.
7. WorkoutDay COMPLETED VIEW: header z datą, restyle listy ćwiczeń (paski rankingowe,
   warning niepełnych), rząd Share/Send, CTA `kinetic-primary-button w-full h-14`, delete.
8. Test niezmiennika funkcji (wszystkie akcje ekranu widoczne jednocześnie).
9. Bramki: `npm run test`, `npm run typecheck`, `npm run lint`, `npm run build`;
   e2e: `session-prs-remount`, `email-coach-button`, `workout-delete-from-day`,
   `batch-save` (świeży dev server: `pkill -f vite` + czyszczenie `node_modules/.vite`).
10. Pętla wizualna: screenshot 390px (e2e mock) vs `workout-summary-top/bottom.png`
    na akcentach limonka/amber/sky; iteracja do zgodności strukturalnej.
11. Scenariusz sekwencji na urządzeniu (checklist CLAUDE.md): plan → trening → zakończ →
    podsumowanie → Popraw serie → powrót → Share/email → Wróć do dashboardu (confetti) →
    wejście w ten trening z Historii (podsumowanie bez celebracji) → usuń testowy trening.
