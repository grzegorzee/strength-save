# WP-A (X28): Kompaktowy dialog "Nowe własne ćwiczenie"

> **For agentic workers:** TDD, przeczytaj `docs/plans/x28/00-OVERVIEW.md` + global constraints z x27.

**Goal:** tworzenie własnego ćwiczenia z /exercises otwiera MAŁY, czytelny dialog-formularz (bez listy istniejących ćwiczeń, bez poziomego suwaka kategorii, nic nie ucieka poza ekran przy klawiaturze). Tryb wybierania w pickerze zostaje, ale przycisk "Dodaj własne" wychodzi nad listę i znika nadpisanie wysokości.

**Root cause z rozpoznania (2026-08-21):**
- `ExercisePicker.tsx` `DialogContent:135` ma `max-h-[88vh]`, które przez tailwind-merge NADPISUJE keyboard-aware `max-h-[calc(100dvh - var(--keyboard-inset) ...)]` z `ui/dialog.tsx:71` — przy klawiaturze (autoFocus search :151 / name :201) góra dialogu wyjeżdża poza ekran.
- Przycisk "Dodaj własne ćwiczenie" (:177-192) renderuje się WEWNĄTRZ scrollowanej listy ~200 pozycji — user widzi "stare ćwiczenia", formularz "pojawia się po wpisaniu liter" (lista się kurczy).
- Z /exercises picker idzie BEZ `onPick` (ExerciseLibrary.tsx:333-339) — tap w dowolne ćwiczenie z listy to no-op zamykający dialog (martwa interakcja), a description = generyczne "wybierz ćwiczenie".
- Formularz inline: pola i walidacja w :194-268 (nazwa 2..80 `customNameValid:91`, kategoria chipsy :203-214, typ+bodyweight :215-238, tracking :240-259), zapis `addCustomExercise` (`useCustomExercises.ts:96-137`, `CustomExerciseInput:25-33`).
- Wzorzec Select-w-dialogu do skopiowania: `BodyPhotoCompare.tsx:86-95`. i18n istnieje: `custom.addButton/namePlaceholder/save/section/trackingLabel`, `exercises.newCustom`.
- Testy do aktualizacji: `exercise-library-groups.test.tsx:131-138`, `exercise-picker.test.tsx`.

**Files:**
- Create: `src/components/CreateCustomExerciseDialog.tsx`, `src/test/create-custom-exercise-dialog.test.tsx`
- Modify: `src/pages/ExerciseLibrary.tsx` (:333-339 — podmiana na nowy dialog), `src/components/ExercisePicker.tsx` (dwie chirurgiczne zmiany: usunięcie `max-h-[88vh]` z :135; przeniesienie przycisku "Dodaj własne" NAD kontener scrollowany, przed :176)
- Test: aktualizacje `exercise-library-groups.test.tsx`, `exercise-picker.test.tsx`
- i18n: anchor `exercises.*` / `custom.*` (reuse istniejących kluczy, nowe tylko jeśli brakuje)

**Interfaces:**
- `CreateCustomExerciseDialog` props: `{ open: boolean; onOpenChange(open: boolean): void; onCreate(input: CustomExerciseInput): Promise<unknown>; defaultName?: string }`. Wewnątrz: `Input` nazwy (autoFocus), `Select` kategorii (8 opcji `localizeCategory`), `Select` typu (compound/isolation), `Switch` "masa ciała", `Select` trackingu (4 opcje z `set-tracking.ts`), przyciski Anuluj/Zapisz (disabled dopóki nazwa niepoprawna). `DialogContent className="max-w-sm"` BEZ nadpisania max-h (dziedziczy keyboard-aware z ui/dialog).

## Edge cases

1. Walidacja jak w pickerze: nazwa trim 2..80; pozostałe pola mają defaulty (kategoria 'chest', typ 'compound', bodyweight false, tracking default z set-tracking) — zapis jednym tapem po wpisaniu nazwy.
2. Po sukcesie: dialog zamyka się, nowe ćwiczenie widoczne w swojej grupie w /exercises (istniejący listener useCustomExercises), krótki toast potwierdzenia (reuse wzorca toastów).
3. Błąd zapisu (offline): toast destructive, dialog ZOSTAJE otwarty z wpisanymi danymi (user nie traci formularza).
4. Radix: zamykanie wyłącznie przez onOpenChange; X jest w prymitywie Dialog.
5. Picker w trybie wyboru (PlanPreview/PlanDaysEditor/WorkoutDay): zachowanie BEZ zmian poza pkt. wysokości i pozycją przycisku "Dodaj własne" (formularz inline w pickerze ZOSTAJE dla tych flow — tam kontekst listy ma sens).
6. `--keyboard-inset`: nie ruszaj mechanizmu (`keyboard-inset.ts`); poprawka = usunięcie nadpisania.

## Tasks

### Task A1: nowy dialog (TDD)

- [ ] Test `create-custom-exercise-dialog.test.tsx`: (a) render z open: pola widoczne, przycisk Zapisz disabled przy pustej nazwie; (b) wpisanie nazwy → enabled; (c) submit woła onCreate z pełnym `CustomExerciseInput` (defaulty potwierdzone w asercji); (d) onCreate reject → dialog nadal open, toast błędu; (e) sukces → onOpenChange(false). Mock `useCustomExercises` nie jest potrzebny (dialog dostaje onCreate propsem).
- [ ] Run → FAIL → implementacja wg Interfaces (Select wzorem BodyPhotoCompare:86-95) → PASS.

### Task A2: podpięcie w /exercises

- [ ] `ExerciseLibrary.tsx:333-339`: zamiast `ExercisePicker` renderuj `CreateCustomExerciseDialog` z `onCreate={addCustomExercise}`.
- [ ] Aktualizacja `exercise-library-groups.test.tsx:131-138` do nowego dialogu (asercje: brak listy ćwiczeń w dialogu, pola formularza widoczne od razu).
- [ ] Run → PASS.

### Task A3: chirurgia w pickerze

- [ ] Usuń `max-h-[88vh]` z `ExercisePicker.tsx:135` (zostaje keyboard-aware default z ui/dialog).
- [ ] Przenieś przycisk "Dodaj własne ćwiczenie" (:177-192) NAD scrollowany kontener listy (sticky sekcja pod search barem) — widoczny bez scrollowania niezależnie od długości listy.
- [ ] Aktualizacja `exercise-picker.test.tsx` (pozycja przycisku), run → PASS.

### Task A4: finał

- [ ] `npx vitest run` + `npm run typecheck` + `npm run lint` → zielone.
- [ ] Raport; do testu na urządzeniu: otwarcie dialogu z klawiaturą na iPhone (góra dialogu widoczna), Select kategorii w WKWebView.

## Pułapki

- NIE dotykaj `PlanPreview/PlanDaysEditor/WorkoutDay` (ich flow pickera bez zmian).
- tailwind-merge: każde `max-h-*` w className DialogContent nadpisze keyboard-aware default — nie dodawaj żadnego.
- Teksty przez istniejące klucze i18n; scanner hardkodów pilnuje.
