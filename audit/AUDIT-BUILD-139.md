# Product audit — Strength Save 1.0.0 (iOS build 139) — 2026-09-04

Read-only audyt wykonany przez Claude przez `product-audit`; główny operator zastosował
następnie `design-critique`, `frontend-design` i `ios-hig-design` do priorytetyzacji oraz
weryfikacji poprawek. Środowisko Claude nie udostępniało własnej kopii `design-critique`.
Żadnych zmian w `src/`, `e2e/`, `functions/`, `ios/`,
konfiguracji ani wersji. Dirty worktree (106 wpisów, m.in. poprawki z 3 września) zachowany
bez stashowania; audyt ocenia dokładnie ten stan.

## 1. Snapshot i metoda

| Element | Wartość |
|---|---|
| Kod | `12a2ce0f` + lokalne zmiany (106 wpisów `git status`), `CURRENT_PROJECT_VERSION = 139` (6 wystąpień), `MARKETING_VERSION = 1.0.0` |
| Serwer | świeży `VITE_E2E_MODE=true npx vite --port 8096` (bez starego HMR), zgaszony po biegu |
| Przeglądarka | Chromium (Playwright 1.59.1), viewport 390x844, DPR 2, `isMobile`, `hasTouch`, `colorScheme: dark`; warianty 844x390 (landscape) i 320x568 (SE) |
| Motyw runtime | **dark wymuszony** (`forcedTheme="dark"`), light oceniony wyłącznie z tokenów CSS (kontrakt `design-token-guard`) |
| Seed | deterministyczny `e2e-test-user`: plan 12 tyg. od 2026-07-27 (tydzień 6/12, dziś piątek = dzień planu), 17 ukończonych sesji, cykl aktywny + zakończony, 3 pomiary, zgody zdrowotne; scenariusze `active-user` PL/EN, `active-user` pusty, `new-user` (onboarding), `unauthenticated` (login), cofnięta zgoda zdrowotna |
| Zakres | 70 kroków + 4 dogrywki; 103 zrzuty w `audit/shots/2026-09-04-build139/`; metryki DOM per trasa: scroll poziomy, elementy poza 390 px, cele dotykowe, klasy statusów, kontrast WCAG (tło komponowane po przodkach), fonty formularzy, nazwy dostępne, nagłówki/landmarki, konsola |
| Konsola | **0** `pageerror`, **0** `error/warning` poza szumem zablokowanego Firebase (mock) |
| Scroll poziomy | **0/66** tras (także 320 px i landscape); 0 elementów poza krawędzią |
| Statusy | 0 teł statusowych bez przezroczystości (zasada 8) |
| Native-feel | `user-select: none`, tap-highlight przezroczysty, `touch-action: manipulation`, `viewport-fit=cover`, `env(safe-area-inset-bottom)` w navie (urządzenie do potwierdzenia) |

Ograniczenie mocka: finalny zapis treningu nie odświeża listy (po "Tak, zakończ" ekran wraca
do stanu startowego, licznik nie rośnie; `c12-workout-finished-full.png`), onboarding kończy
się spinnerem. Obie ścieżki wymagają konta QA na wdrożonym webie i iOS.

## 2. Wynik

**product-audit: 5.5 / 10** (brak 🔴; P ≈ 4.4 harmonicznie z 5×🟠 i 13×🟡; wczoraj 5.0).
Dwie poprawki systemowe (cele dotykowe, i18n) dałyby ~7.5.

**iOS HIG: 6.5 / 10.** Diagnostyka: safe area i layout ✓ (web-weryfikowalne), cele
dotykowe 44 pt ✗, typografia/Dynamic Type ✗ (stałe px, 11-16), nawigacja ✓ z uwagą
(podwójny back), kolor/kontrast ✓ po rozdzieleniu tokenów (wyjątek eyebrow), stany
loading/empty/error ✓; idiom: kolory semantyczne +1, spójne kontrolki systemowe (sheety,
menu, dialogi) +1, ruch/reduced motion +0.5 (CSS `prefers-reduced-motion` obecne, brak
dowodu w mocku), tryb jasny brak.

## 3. Naprawione od audytu 2026-09-03 (regresje zamknięte, zweryfikowane dziś)

- Tokeny destructive rozdzielone: delta wagi 6.27:1, badge trendu 6.10:1, chip POMINIĘTE
  5.67:1 (iteracje KP 1 i recheck); `TrainingDayCard` bez `opacity` na wrapperze.
- `ui/Input` 44 px na dotyku, 40 px w desktop-shell, spójnie z `Button` (`min-h-11`).
- Dialog cardio: dwie kolumny, pola 48 px, font 18/16 px, sticky CTA nad klawiaturą
  (`b04-plan-add-cardio.png`).
- Chipy filtrów Historii 44 px wysokości (były 32).
- Chronologia Planu: dziś jako hero, potem przyszłość rosnąco, historia malejąco
  (`b01`: 04.09, 02.09, 31.08).
- Semantyka licznika treningów (completed + seria robocza) w nagłówku, Profilu, Historii,
  Dashboardzie, cyklach, eksporcie, analityce miesięcznej, weekly digest; streak Dashboardu z
  agregatu (kod + testy; mock E2E nie ma agregatu).
- Z diffu, bez ponownego zrzutu dziś: dialog rozgrzewki nie zamyka się tapem w overlay,
  chip Rozgrzewka = pusty slot W, kolumna kg min 56 px, chip Metryki bez obrysu, edytor dni
  planu z paskiem akcji.

## 4. Potwierdzone problemy

### P1

**B139-1 Cele dotykowe poniżej 44 px na kontrolkach krytycznych (systemowy).**
Ekran/flow: trening, pasek przerwy, Historia, menu kontekstowe, Plan, Profil.
Dowód (rect z DOM, `results.json`; zrzuty `c03-workout-active.png`, `c04-workout-rest.png`,
`c05-workout-rest-expanded.png`, `d01-history.png`, `d02-history-row-menu.png`):
odhaczenie serii **40x40** (41 wystąpień, `button[aria-label^="Zaznacz serię"]`),
"Więcej akcji" **36x36**, "DODAJ SERIĘ" **318x41**, pasek przerwy: POMIŃ **62x33**,
rozwiń **30x30**, ustawienia **218x31**; przerwa rozwinięta: −15/+15 **39x32**, Pomiń
**53x32**; menu wiersza Historii **28x44** (`history-row-menu`), pozycje menu Radix
**32 px** wysokości (Historia 151x32, Plan 198x32, ćwiczenie 214x32), chipy cyklu **32 px**,
`history-list-back` i "Filtry" **36x36**, "Szczegóły" **68x20** i "Przełóż trening"
**100x20** pod CTA, notatka treningu **74x17**, "Wróć do bieżącego tygodnia" **151x17**,
"Zmień zdjęcie profilowe" **24x24**, "Usuń konto" **350x16**, combobox "Język" **82x36**,
linki Regulamin/Polityka **59-128x15-16**, link 404 **179x20**, `ob-plan-name` **310x25**,
"Szczegóły ćwiczenia" **24x24**, sticky "Wstecz" **99x40**.
Oczekiwane: ≥ 44x44 pt na dotyku (HIG), własna zasada projektu `min-h-11`.
Minimalna rekomendacja: jedna klasa hit-area (padding/pseudo-element bez zmiany wyglądu)
w `ExerciseCard` (check, "…"), `RestBar`, `Button size="icon"`, `DropdownMenuItem`
(`min-h-11`), chipach cyklu i linkach wtórnych; test DOM w vitest: rect ≥ 44 dla
`button[aria-label^="Zaznacz serię"]`, `history-row-menu`, `rest-bar-*`.
Kryterium: ponowny bieg `results.json` bez wpisów `small` dla wymienionych selektorów.

**B139-2 Wiersz Historii ucina to, co odróżnia sesje, a meta zapada się do "…".**
Dowód: `d01-history.png`, `l03-en-history.png`: "Środa · Szeroki…", "Poniedziałek · …",
"3 ćw. · … · 1h 6m" (DOM ma pełny tekst "3 ćw. · 9 serii · 1h 6m", CSS `truncate` ucina
środkowy segment). Oczekiwane: focus widoczny jako tytuł, liczba serii nie znika.
Rekomendacja: focus jako tytuł, dzień tygodnia w kolumnie daty, meta bez zapadającego się
segmentu (skrót "9 s." albo `min-width`). Kryterium: w 390 px wiersz pokazuje focus i
liczbę serii dla nazw 3-segmentowych z seedu.

**B139-3 Mieszanka PL/EN i żargon (systemowy).**
Dowód EN: `l01-en-dashboard.png` "Shoulders / Jednonóż / Detale"; `l02-en-plan.png`
"Szerokie Back / Posterior Uda / Chest Płasko"; `l06-en-cycles.png` "Środek Pleców,
Płasko" (tokeny focusów domyślnego planu poza słownikiem `plan-i18n`). Dowód PL:
`d05-history-list-all.png` chip **"DRAFTY"**, `h05-se-history-all.png` badge "DRAFT";
`b06-cycles-full.png` **"MISSED"** ("MISSED 2 zaplanowanych sesji nie weszło"),
"Closeout i progres cyklu", "MONITORING", "Onboarding od nowa"; `c09` "Otwórz Sync
Center". Oczekiwane: jeden język na ekran, polskie nazwy statusów. Rekomendacja: uzupełnić
`plan-i18n` (Jednonóż, Detale, Płasko, Środek Pleców, Tył Uda, Szerokie Plecy), klucze
`history.drafts`/`history.badgeDraft` → "Szkice"/"szkic", "MISSED" → "Opuszczone",
`cycles.closeoutProgress` → "Domknięcie cyklu", `dash.sync.openCenter` → "Otwórz centrum
synchronizacji", `cycles.resetOnboarding` → "Ustaw plan od nowa". Kryterium: skan
diakrytyków na EN i lista słów na PL pusta na trasach `/`, `/plan`, `/history`, `/cycles`.

**B139-4 Metryka "ŚR. TRENINGI/TYDZ." dzieli przez pełną długość planu.**
Dowód: `b06-cycles-full.png` "ŚR. TRENINGI/TYDZ. **1.3**" przy 16 sesjach w 6
przepracowanych tygodniach (2.7/tydz.); obok "FREKWENCJA 89% 16/18" liczona po tygodniach
minionych, dwie karty sobie przeczą. Oczekiwane: średnia po tygodniach minionych (min 1).
Rekomendacja: dzielnik = tygodnie od startu do dziś w `cycle-insights`; test na aktywnym
cyklu w połowie. Kryterium: dla seedu wartość 2.7 (16/6).

**B139-5 Kontrolki tekstowe z fontem < 16 px (zoom Safari/WebKit przy fokusie, web).**
Dowód: `results.json` `formFonts`: `textarea` notatki treningu **14 px** (`text-sm`,
`c08-workout-bottom` extra), baza `src/components/ui/textarea.tsx` `text-sm`; Profil:
kalkulator talerzy "Własny gryf (kg)", "Sztuk 25…1.25", "Własny talerz", `accent-hex-input`
**14 px**; combobox "Język" **11 px**. Na natywnym buildzie zoom blokuje
`zoomEnabled: false`, na publicznym webie (meta bez `maximum-scale`, zoom celowo dozwolony)
fokus w tych polach powiększa stronę. Oczekiwane: 16 px w polach edycyjnych.
Rekomendacja: `text-base` w `ui/textarea.tsx`, w polach kalkulatora i hex; trigger Select
≥ 16 px albo `min-h-11`. Kryterium: `formFonts` pusty na `/workout/*` i `/profile`.

### P2

**B139-6 Kontrast małych etykiet.** `b01-plan.png`, `i02-empty-plan-full.png`,
`l02-en-plan.png`: nagłówki dni "Śr., 2 WRZ" 11 px bold `text-muted-foreground/70`
**3.55:1** (próg 4.5); `e07-exercise-detail-full.png` "(zawsze przy tym ćwiczeniu)"
**2.92:1**; `c12-workout-finished-full.png` podpowiedź celu "Dowiozłeś 8 powt…" 11.5 px
**4.45:1**. Rekomendacja: usunąć `/70` z eyebrow 11 px (pełny `muted-foreground` = 5.5:1),
12 px dla podpowiedzi. Kryterium: `contrastIssues` puste na `/plan`.

**B139-7 Ściana chipów w `?list=all`.** `d05-history-list-all.png`: wyszukiwarka + 8 chipów
w 5 rzędach + PORÓWNAJ; pierwszy wiersz sesji na **y = 546 px** z 844 (65% viewportu
zajęte przez filtry), placeholder ucięty i z żargonem "focusie". Rekomendacja: chipy statusu
w jednym przewijanym rzędzie, dni i porównanie za przyciskiem Filtry. Kryterium: pierwszy
wiersz ≤ 40% wysokości viewportu.

**B139-8 404 poza powłoką.** `f03-404.png` + DOM: `main 0, nav 0, header 0`, jaśniejsze tło,
jedyne wyjście link **179x20**. Rekomendacja: render w `Layout` z navem i przyciskiem.
Kryterium: nav obecny na `#/__missing__`.

**B139-9 Tydzień przyszły w Planie od końca.** `b02-plan-next-week.png`, DOM order
`[2026-09-11, 2026-09-09, 2026-09-07]`. Bieżący i miniony tydzień są poprawne. Decyzja
produktowa: dla tygodni przyszłych porządek rosnący czyta się naturalnie. Rekomendacja:
`orderTimelineDayKeys` rosnąco, gdy cały tydzień jest po dziś. Kryterium: test jednostkowy.

**B139-10 Semantyka dostępności.** DOM (`aria`): na każdym ekranie treningu jeden przycisk
ikonowy bez nazwy dostępnej (klasa bazowa `Button`, brak `aria-label`, bez tekstu);
Dashboard/Plan/Historia mają **dwa `h1`** (tytuł w nagłówku + nagłówek strony); przeskoki
poziomów nagłówków (h1 → h3) na treningu, Postępach, Pomiarach, Planie dnia i w onboardingu.
Rekomendacja: `aria-label` na przycisku, tytuł nagłówka jako `p`/`div` z `aria-hidden` albo
strona bez drugiego h1, `h2` między poziomami. Kryterium: `namelessCount 0`, `h1 = 1`,
`headingSkips 0`.

### P3

**B139-11 Fokus klawiatury niespójny.** `g01`: pozycje dolnego navu dostają domyślny
outline UA (`auto 1px rgb(229,151,0)`), avatar i pola własny ring akcentu. Rekomendacja:
`focus-visible:ring` w navie (web/klawiatura zewnętrzna).

**B139-12 Copy w Cyklach.** `b06-cycles-full.png`: "3 dni/tydzień ·" z wiszącym
separatorem, glif "%" jako ikona nad "89%", "top rekordy w cyklu". Rekomendacja: warunkowy
separator, ikona zamiast glifu, "najlepsze rekordy w cyklu".

**B139-13 Podwójny "Wstecz" na trasach spoza navu.** `e05-measurements-full.png`,
`e06-exercises.png`, `f04-day.png`: strzałka w nagłówku + pływający pasek "← Wstecz" +
dolny nav (~150 px chrome). Świadoma decyzja X35b; na iOS jeden back w nagłówku i gest
krawędzi wystarczą. Rekomendacja: pasek tylko tam, gdzie nagłówek jest ukryty.

## 5. Hipotezy (nie potwierdzone, do sprawdzenia)

- Widok Rekordów: heurystyka DOM zgłasza 9 przycisków bez nazwy dostępnej
  (`e02-progress-records`); mogą to być karty z tekstem w elementach potomnych. Sprawdzić
  VoiceOverem.
- Przerwa rozwinięta (`c05-workout-rest-expanded.png`): eyebrow "PRZERWA · …" dotyka lewej
  krawędzi, a toast startu wystaje poza prawą krawędź; zrzut mógł trafić w animację
  wejścia. Powtórzyć po 1,5 s i na urządzeniu.
- Widok ukończonego treningu, celebracja "+1", PR-y po zakończeniu: mock nie domyka syncu.
  Konto QA (web + iOS).
- Z audytu 2026-09-03, nie zweryfikowane ponownie dziś: chipy dni "P W Ś C P S N" w
  onboardingu, liczebniki "1 treningów"/"1 rekordów", etykiety CTA "NASTĘPNY KROK" vs
  "DALEJ", CTA "Dodaj pierwszy pomiar" przy cofniętej zgodzie, chipy kalkulatora "-1.25 kg"
  łamane na dwie linie.
- Skeletony ładowania tras nieobserwowalne w mocku (dane synchroniczne); zimny start
  pokazuje splash z ikoną po białej klatce pre-paint (`loading-000ms.png`,
  `loading-080ms.png`), na natywnej apce zakrywa to splash Capacitora.

## 6. Nie objęte audytem web (urządzenie)

safe area / Dynamic Island / home indicator (nav ma `env(safe-area-inset-bottom)`),
background/resume i force-quit w trakcie przerwy, haptyka i dźwięk końca przerwy,
klawiatura natywna (`inputmode`, przesuwanie aktywnej serii), bounce/overscroll
(`overscroll-behavior: auto`), Dynamic Type 200%, push, splash, status bar, tryb jasny
(nie istnieje w runtime).

## 7. Poprawki do wdrożenia dzisiaj (kolejność ROI)

1. Hit-area 44 px: check serii, "…", DODAJ SERIĘ, pasek przerwy (zwinięty i rozwinięty),
   `history-row-menu` (szerokość), `DropdownMenuItem min-h-11`, chipy cyklu, `Filtry` i
   `history-list-back`, linki "Szczegóły"/"Przełóż trening"/"Wróć do bieżącego tygodnia",
   notatka treningu, "Zmień zdjęcie", "Usuń konto", Regulamin/Polityka, link 404,
   `ob-plan-name`, "Szczegóły ćwiczenia", combobox Język, sticky Wstecz (B139-1).
2. i18n: słownik focusów planu w EN; "Szkice"/"szkic", "Opuszczone", "Domknięcie cyklu",
   "Otwórz centrum synchronizacji", "Ustaw plan od nowa" (B139-3).
3. Wiersz Historii: focus jako tytuł, meta bez zapadającego się segmentu (B139-2).
4. `cycle-insights`: średnia po tygodniach minionych + test (B139-4).
5. `ui/textarea.tsx` `text-base`; 16 px w polach kalkulatora talerzy i hex; trigger
   Select ≥ 16 px (B139-5).
6. Eyebrow dni Planu bez `/70`; podpowiedź celu 12 px; "(zawsze przy tym ćwiczeniu)" pełny
   muted (B139-6).
7. 404 w `Layout` (B139-8).
8. `aria-label` na przycisku ikonowym w nagłówku sesji; jeden `h1` na stronę; poziomy
   nagłówków (B139-10).
9. Filtry Historii: jeden rząd chipów, reszta za "Filtry" (B139-7).
10. `focus-visible:ring` na pozycjach navu (B139-11).
11. Cykle: separator, ikona zamiast "%", copy (B139-12).
12. Decyzja: tydzień przyszły rosnąco (B139-9); pasek "Wstecz" tylko bez nagłówka (B139-13).

## 8. Artefakty

- `audit/AUDIT-BUILD-139.md` (ten plik), `audit/audit-2026-09-04-build139.json`;
  `audit/latest.json` zachowuje osobny kontrakt release-readiness, aby nie podmienić go
  niezgodnym schematem product-audit
- `audit/shots/2026-09-04-build139/*.png` (103 zrzuty; nazwy kroków jak w dowodach)
- dane surowe poza repo: `/tmp/strength-save-audit-build139/results.json`, `results-b.json`
