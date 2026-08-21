# Design reference: History Tab v2 "tiles" (import z Claude Design, projekt c194f585, turn 2, opcje 2a+2b+2c)

Źródło: https://claude.ai/design/p/c194f585-f0ef-45be-abb9-83c87fe02686?file=History+Tab.dc.html
Akcent designu = AKCENT APKI (nie hardkoduj). Design używa `color-mix` — w apce ZAKAZANE: mapuj `color-mix(acc 15%, transparent)` → `bg-primary/15`, `color-mix(acc 11%, #0e0e0e)` → `bg-primary/10` na ciemnym tle itd. Fonty/tokeny apki (font-heading = display, mono eyebrow).

## 2a — poziom 1: kafle cykli

- Header: `HISTORY` (display 15.5 bold ls .14em) + `150 SESSIONS` (mono 9.5 muted) po prawej. (Licznik = realna liczba sesji.)
- Pasek pod headerem, 2 elementy w rzędzie:
  - **Przycisk PERIOD** (flex-1, h-46, radius 14, tło #1c1c1c): ikona kalendarza w akcencie, kolumna: eyebrow `PERIOD` (mono 8 ls .14em muted) + zakres "1 Jun – 23 Aug" (13px, ellipsis), chevron-down po prawej. Otwiera wybór zakresu dat (istniejący DateRangeField/kalendarz w sheecie/popoverze).
  - **Przycisk Export** (h-46, radius 14, tło akcent/14): ikona download w akcencie + "Export" (13px semibold akcent). Otwiera sheet 2c.
- Grid kafli cykli 2 kolumny, gap 10:
  - Kafel (radius 20): góra 78px z paddingiem: wiersz tag (mono 8 ls .12em; ACTIVE cykl: `ACTIVE · WK 12` w akcencie; przeszłe: `12 WEEKS` muted) + `24 PRs` (mono 9, akcent) po prawej; pod spodem SPARKLINE: 12 słupków tonażu tygodniowego (flex, gap 2.5, radius 2; aktywny cykl: ostatni słupek pełny akcent, reszta akcent/40; przeszłe: akcent/30).
  - Dół kafla: nazwa cyklu (display 15 bold, ellipsis), meta `45 · 227 t` (mono 8.5 muted), zakres `1 Jun – 23 Aug` (10.5, #767469).
  - Tło kafla: aktywny `bg-primary/10` (na #0e0e0e), przeszłe `#1c1c1c` (surface-high).
- Sekcja `LATEST SESSIONS` (mono 9.5 ls .14em muted) + kontener (radius 20, #131313, px-14): 3 ostatnie sesje jako wiersze: data (mono 10, szer. 40, muted) | nazwa `Thursday · Upper B` (13.5 medium, ellipsis) + `24 sets · 1:00` (mono 9.5 #767469) | pill `2 PR` (akcent/15 + tekst akcent, tylko gdy PR) | kg `5,579` (mono 11.5 semibold #dedcd6) | chevron. Na dole wiersz-link: "All 150 sessions, newest first" (12.5 akcent semibold + chevron) → pełna płaska lista (istniejący widok listy z paginacją).
- Bottom nav bez zmian.

## 2b — poziom 2: cykl

- Top bar: back (36x36 radius 11 #1c1c1c) po lewej, ⋯ (36x36) po prawej. Menu ⋯: Porównaj, Wyślij do trenera, (opcjonalnie Usuń — zgodnie z istniejącymi akcjami).
- Nagłówek: nazwa cyklu (display 27 bold) + pill `ACTIVE` (akcent/16, mono 8) obok; pod: `1 Jun – 23 Aug · 12 weeks` (12.5 muted); pod: rząd 4 statów (kolumny flex-1): wartość (display 16 bold; PRS w akcencie) + label mono 8 muted: SESSIONS / TONNAGE / PRS / ATTENDANCE.
- Chipsy statusu (poziomy scroll): `ALL 45` (aktywny: tło akcent, tekst ciemny) / `PRS ONLY` / `DRAFTS 2` / `LONGEST FIRST` (mono 9, radius 999, #1c1c1c + #9a9892). Mapuj na istniejące filtry (completed/draft/onlyPRs; LONGEST FIRST = sort po durationSec malejąco — NOWY sort, opcjonalny: jeśli kosztowny, pomiń i odnotuj).
- Sesje grupowane TYGODNIAMI: nagłówek `WEEK 12 · CURRENT` (mono 9.5 ls .12em; current w akcencie, inne muted) + meta `3 SESSIONS · 19.5 t` po prawej; wiersze sesji jak w 2a (radius 16, tło #131313; pierwszy wiersz bieżącego tygodnia `bg-primary/10`); tap wiersza → istniejący widok sesji.
- Na dole: `All 45 sessions` (akcent) — koniec listy/link.

## 2c — Export sheet (bottom sheet)

- Handle, eyebrow `EXPORT` (mono 9 ls .16em muted), tytuł = aktualny zakres (display 24 bold).
- Chipsy zakresu: `THIS PERIOD` / `ACTIVE CYCLE` / `ALL HISTORY` (aktywny akcentowy).
- Lista formatów (kontener radius 20 #0e0e0e): `PDF report` ("4 cycles · charts and PRs included", ikona akcent) / `CSV data` ("Every set, one row each") / `Send to coach` (adres maila usera-trenera) — każdy wiersz min-h 58 + chevron; tap uruchamia ISTNIEJĄCE mechanizmy (pdf-report, ExportWorkoutsDialog logika CSV, EmailWorkoutDialog wysyłka historii) z wybranym zakresem.
- Cancel (h-50, radius 15, #1c1c1c).

## Zasady adaptacji

1. Wszystkie teksty i18n (PL/EN); liczby realne; separator `·`; zakresy dat przez formatery apki (formatLocalDateLabel); ZERO pauz em/en-dash (istniejący separator zakresu w apce = ` - ` po sweepie X27 — sprawdź aktualny wzorzec w kodzie i trzymaj się go).
2. `color-mix` z designu → klasy `/10`/`/15`/`/30`/`/40`.
3. Poziom 2 przez searchParam `?cycle=<cycleId>` (wzorzec /exercises `?group=`); "All sessions" → `?list=all` (płaska lista, dotychczasowy widok miesięczny jako poziom 2 listy).
4. Sesje "poza cyklami": jako dodatkowy kafel "Poza cyklami" w gridzie (fallback-tło, bez sparkline) — niezmiennik: KAŻDA sesja osiągalna.
5. Sparkline: reuse `buildCycleSparkline` (`src/lib/history-cycles.ts:116-125`, buckety = durationWeeks).
6. Filtry Szukaj/zakres dat: search zostaje jako ikona w headerze? Design 2a NIE ma lupy ("no magnifier") — wyszukiwarkę treningów przenieś do widoku pełnej listy (`?list=all`), poziom 1 bez niej.
