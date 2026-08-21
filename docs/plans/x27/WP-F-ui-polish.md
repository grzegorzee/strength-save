# WP-F: UI polish — liquid glass, X w każdym popupie, zwijany plate calculator, sweep długich pauz

> **For agentic workers:** wykonuj task-by-task, TDD. Przeczytaj `00-OVERVIEW.md`. Ten pakiet biegnie SOLO w batchu 3 (dotyka współdzielonych prymitywów) — bazą jest kod po batchach 1-2.

**Goal:** (1) "liquid glass" tam gdzie ma sens, przede wszystkim dolne menu (mocniejszy, bardziej płynny efekt szkła) + nagłówek + bottom sheety; (2) KAŻDY popup ma widoczny X od razu przy wyświetleniu (dziś brakuje w AlertDialog); (3) sekcja plate inventory w ustawieniach zaawansowanych jest zwijana; (4) w całej aplikacji ZERO długich pauz (em-dash —, en-dash –) w tekstach UI.

**Architecture:** glass = rozbudowa istniejącej klasy `.kinetic-glass` (index.css:256-262) + wariant `.kinetic-glass-sheet`; X w AlertDialog = rozszerzenie prymitywu `src/components/ui/alert-dialog.tsx` wzorem dialog.tsx (44 px tap target — kontrakt testu `dialog-close-target.test.tsx`); pauzy = sweep i18n + danych + guard test na przyszłość.

**Tech stack:** CSS/Tailwind, Radix, vitest.

**Spec / kontekst (ustalone rozpoznaniem):**
- `.kinetic-glass`: `src/index.css:256-262` — gradient `rgba(56,56,56,.52)→rgba(28,28,28,.66)`, `backdrop-filter: blur(24px) saturate(160%)`, border `rgba(255,255,255,.08)` z jaśniejszą górną krawędzią. Użyta TYLKO w `AppNavigation.tsx:227` (mobilny bottom bar, floating pill).
- Ad-hoc blur (10 miejsc): `AppHeader.tsx:61` (`bg-background/80 backdrop-blur-xl`), `IntervalTimer.tsx:93`, `RestBar.tsx:218`, `LivePRCelebration.tsx:73`, `WorkoutCompletionSequence.tsx:105`, `WarmupRoutineDialog.tsx:189`, `ExerciseDetail.tsx:103`, `NewPlan.tsx:178`, `AdminDashboard.tsx:593`, `WorkoutDay.tsx:3168`.
- Prymitywy: `Dialog` (dialog.tsx:77-80) i `Sheet` (sheet.tsx:69-72) MAJĄ X (44 px, sr-only `a11y.close`); **`AlertDialog` (alert-dialog.tsx) NIE MA X** — 12 użyć `AlertDialogContent` w 35 plikach overlay'owych. Testy kontraktu: `src/test/dialog-close-target.test.tsx` (44 px, Z192), `src/test/overlay-contract.test.tsx`.
- Plate: `PlateCalculatorSheet.tsx` (sheet w treningu — zostaje jak jest) + `PlateInventorySettings` (`:292`) renderowane w `Settings.tsx:187` jako zwykła karta, POZA istniejącym `Collapsible` (`Settings.tsx:236`). Prymityw `Collapsible` istnieje (`ui/collapsible.tsx`).
- Zakazy: zero `color-mix()` (guard `design-token-guard.test.ts`), tła statusowe `/10`, `hover:` gated. WKWebView: backdrop-filter z prefiksem `-webkit-` (wzorzec już w .kinetic-glass).
- Pauzy: user zgłosił em-dashe w copy (m.in. baner "cycle ending" i dane ćwiczeń "Rest 2–3 minutes" — zrzut). Źródła: `src/i18n/locales/pl.ts`/`en.ts`, `src/data/exercise-details.ts` + `exercise-details-en.ts`, `src/data/planTemplates.ts`, ewentualne stringi w komponentach.

**Files:**
- Modify: `src/index.css`, `src/components/ui/alert-dialog.tsx`, `src/components/AppNavigation.tsx`, `src/components/AppHeader.tsx`, `src/components/ui/sheet.tsx` (wariant glass), `src/pages/Settings.tsx`, `src/i18n/locales/pl.ts`, `src/i18n/locales/en.ts`, `src/data/exercise-details.ts`, `src/data/exercise-details-en.ts`, inne pliki danych z pauzami (wg grep)
- Create: brak nowych komponentów
- Test: `src/test/alert-dialog-close.test.tsx` (nowy), `src/test/no-dashes-guard.test.ts` (nowy), aktualizacja `dialog-close-target.test.tsx` o AlertDialog, test collapsible w `src/test/plate-inventory-settings.test.tsx`

**Interfaces:** brak konsumentów zewnętrznych; zmiany wizualne + prymityw.

## Edge cases

1. AlertDialog z X: X = "bezpieczne zamknięcie" (odpowiednik Cancel). W dialogach destrukcyjnych (usuwanie) X działa jak Cancel, NIGDY jak akcja potwierdzająca. Radix: `AlertDialogPrimitive.Cancel` jako trigger X (nie `Action`).
2. Niektóre AlertDialogi mogą celowo wymuszać wybór (blokujące)? Przejrzyj 12 użyć — jeśli któryś jest krytyczny (np. wymagana zgoda prawna), zostaw bez X przez opt-out prop `hideClose` i odnotuj. Default = X widoczny.
3. Glass i czytelność: tekst na glass musi mieć kontrast — nie zmieniaj kolorów tekstu, tylko tło/blur/border. Na jasnym motywie (light theme istnieje: `:root` light) glass ma jasny wariant — zdefiniuj obie wersje (zmienne w :root i .dark), NIE zakładaj tylko dark.
4. Performance WKWebView: max 2-3 aktywne backdrop-filter na ekranie; NIE dodawaj glass do elementów w listach/scrollu (kafle, wiersze). Cel: bottom nav (już ma), AppHeader, bottom sheety (SheetContent side="bottom"), RestBar (już ma blur — ujednolić klasą).
5. Pauzy w DATACH ćwiczeń: zakresy "2–3 minutes"/"60–90 seconds" → "2-3"/"60-90" (zwykły łącznik). W i18n: em-dash w zdaniach → przecinek/dwukropek/kropka wg sensu (PL bez pauz — zgodnie z regułą projektu). NIE zmieniaj separatora `·` (to nie pauza).
6. Guard test nie może blokować uzasadnionych znaków: sprawdzaj TYLKO `—` (U+2014), `–` (U+2013), `―` (U+2015) w pl.ts, en.ts i src/data/*.ts.

## Tasks

### Task F1: X w AlertDialog (TDD)

- [ ] Test `src/test/alert-dialog-close.test.tsx`: render `AlertDialog` z contentem → widoczny przycisk zamknięcia (aria-label z `a11y.close`), tap target ≥44 px (wzorem asercji z `dialog-close-target.test.tsx`), klik zamyka (onOpenChange(false)); z `hideClose` → brak X. Run → FAIL.
- [ ] Implementacja `alert-dialog.tsx`: X wzorem `dialog.tsx:77-80` (ta sama pozycja/klasa `h-11 w-11`, ikona `X h-4 w-4`), przez `AlertDialogPrimitive.Cancel asChild`; prop `hideClose?: boolean` na `AlertDialogContent`; tytułom `pr-8` (wzorem `dialog.tsx:104`).
- [ ] Rozszerz `dialog-close-target.test.tsx` o przypadek AlertDialog (kontrakt 44 px w jednym miejscu).
- [ ] Przejrzyj 12 użyć `AlertDialogContent` (grep) pod Edge 2; sprawdź, że layouty nie łamią się z X (tytuł pr-8). Run → PASS.

### Task F2: liquid glass 2.0 (TDD gdzie się da)

- [ ] `src/index.css`: rozbuduj `.kinetic-glass` — mocniejszy efekt "liquid": `blur(28px) saturate(180%)`, delikatny inner highlight (dodatkowy `box-shadow: inset 0 1px 0 rgba(255,255,255,.12), inset 0 -1px 0 rgba(255,255,255,.03)`), tło bardziej przezroczyste w dark (`rgba(30,30,30,.55)→rgba(16,16,16,.72)`), jasny wariant pod `:root` (biały glass `rgba(255,255,255,.6)→rgba(244,244,244,.75)`); wszystko z `-webkit-` prefiksem. Dodaj `.kinetic-glass-sheet` (dla bottom sheetów: blur 20px, mocniejsze tło dla czytelności długich treści).
- [ ] `AppNavigation.tsx:227`: zostaje `.kinetic-glass` (dostaje nowy wygląd automatycznie); sprawdź czy pasek tła za navem (`:224`) nie dusi efektu — jeśli filler jest w pełni kryjący, zmniejsz krycie tak, by content "prześwitywał" pod glassem.
- [ ] `AppHeader.tsx:61`: podmień ad-hoc `bg-background/80 backdrop-blur-xl` na `.kinetic-glass` (spójność).
- [ ] `sheet.tsx`: `SheetContent` side="bottom" dostaje `.kinetic-glass-sheet` (sprawdź czytelność PlateCalculatorSheet/RescheduleSheet — jeśli treść na glass nieczytelna w teście wizualnym DOM, zwiększ krycie tła wariantu sheet).
- [ ] Test: `design-token-guard.test.ts` PASS (zero color-mix); szybki test snapshot klas AppHeader/AppNavigation jeśli istnieją testy tych komponentów (grep) — zaktualizuj.
- [ ] `npx vitest run` → zielone.

### Task F3: zwijany plate inventory w ustawieniach (TDD)

- [ ] Test w `src/test/plate-inventory-settings.test.tsx`: w Settings sekcja plate inventory domyślnie ZWINIĘTA (nagłówek widoczny, treść nie); klik nagłówka rozwija. Run → FAIL.
- [ ] Implementacja `Settings.tsx:187`: opakuj `PlateInventorySettings` w `Collapsible` wzorem istniejącego Collapsible z `Settings.tsx:236` (ten sam wygląd trigger'a: tytuł + chevron), default closed. i18n nagłówka — reuse istniejącego tytułu sekcji.
- [ ] Run → PASS.

### Task F4: sweep długich pauz + guard (TDD)

- [ ] Test `src/test/no-dashes-guard.test.ts`: importuje pl.ts, en.ts oraz czyta (fs) pliki `src/data/exercise-details*.ts`, `src/data/planTemplates.ts` — asercja: zero znaków U+2013/U+2014/U+2015 w wartościach. Run → FAIL (jeśli są).
- [ ] Sweep: `grep -rn "—\|–" src/i18n src/data src/components src/pages --include="*.ts*"` → każdą pozycję zamień wg Edge 5 (zakresy liczbowe → "-", zdaniowe pauzy → przecinek/dwukropek/kropka). W komponentach: literały w JSX też (poza testami i komentarzami — komentarze zostaw).
- [ ] Run → PASS (guard zielony).

### Task F5: finał pakietu

- [ ] `npx vitest run` + `npm run typecheck` + `npm run lint` → zielone.
- [ ] Raport: lista AlertDialogów z opt-outem `hideClose` (jeśli są), miejsca z glass, ile pauz wymieniono, co wymaga oceny wizualnej na urządzeniu (glass na light theme!).

## Pułapki

- Radix AlertDialog nie zamyka się przez overlay-click by design — X to jedyna szybka droga ucieczki; upewnij się, że `useExclusiveOverlayState` (kontrakt overlay) nie jest łamany.
- Glass na `position: fixed` elementach w WKWebView bywa kosztowny przy scrollu — nie dodawaj `will-change`, zostaw jak w obecnej implementacji.
- Nie ruszaj plików, które batch 1-2 świeżo zmieniły, poza zakresem swoich tasków (np. Dashboard banner — WP-A).
- Sweep pauz NIE dotyka: node_modules, docs/, testów cudzych asercji (jeśli test asertuje string z pauzą, zaktualizuj razem ze źródłem).
