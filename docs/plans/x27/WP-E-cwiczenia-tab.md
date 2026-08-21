# WP-E: Zakładka Ćwiczenia — redesign "grupy mięśniowe najpierw"

> **For agentic workers:** wykonuj task-by-task, TDD. Przeczytaj `00-OVERVIEW.md` ORAZ `design-exercises-tab.md` (pełna specyfikacja wizualna) przed startem.

**Goal:** przebudowa `/exercises` na dwupoziomową nawigację z designu: poziom 1 = siatka kafli grup mięśniowych ze zdjęciami i licznikami, poziom 2 = widok grupy (hero-zdjęcie, filtry COMPOUND/ISOLATION/BODYWEIGHT, lista z najlepszą serią i badge PR). Wyszukiwarka globalna zostaje na poziomie 1. Custom exercises widoczne w bibliotece.

**Architecture:** zakładka `/exercises` (`ExerciseLibrary.tsx`) już istnieje z płaską listą + chipsami kategorii. Redesign: poziom 1 to nowy widok grup; poziom 2 realizowany W TEJ SAMEJ trasie przez stan/URL-param (`/exercises?group=<id>` — hash router, użyj searchParams), żeby nie mnożyć tras i nie psuć bottom nav. Zdjęcia grup: statyczne assety `public/exercise-groups/<categoryId>.webp` (dostarcza WP-IMG — pracuj z fallbackiem, patrz E5).

**Tech stack:** React + TS, Tailwind, vitest + testing-library.

**Spec / kontekst (ustalone rozpoznaniem):**
- Strona: `src/pages/ExerciseLibrary.tsx` (`ExerciseVideoPreview:22`, `ExerciseRow:65`, page `:108`, search `:146`, chipsy kategorii `:157`, licznik `:170`, lista `:175`). Route w `AuthenticatedApp.tsx:223`; detail `/exercise/:slug` (focused flow, zostaje bez zmian).
- Dane: `src/data/exerciseLibrary.ts` — ~244 wpisy, `LibraryExercise { name, category (8 wartości), type: compound/isolation, isBodyweight, tracking, instructions }`. Sprawdź dokładne id kategorii greppem po `category:` w tym pliku.
- Media: `src/lib/exercise-media.ts` — `CDN_BASE`, `getExercisePosterUrl` (jpg postery per ćwiczenie), `slugifyExercise`.
- Custom exercises: `src/hooks/useCustomExercises.ts` (kolekcja `custom_exercises`, E2E fallback localStorage) — dziś NIE są pokazywane w `/exercises`, tylko w `ExercisePicker`. Tworzenie: `ExercisePicker` ma props `onCreateCustomExercise` — znajdź komponent dialogu tworzenia i użyj TEGO SAMEGO (nie buduj drugiego).
- Najlepsza seria / PR: poszukaj istniejącej logiki per-exercise best (grep `ExerciseProgressionDialog`, `best`, `pr` w src/lib) — jeśli jest czysty helper, użyj; jeśli best wymagałby ładowania pełnej historii na tej stronie, ZREZYGNUJ z "BEST" w wierszach (design pkt 4 dopuszcza) i pokaż tylko typ — odnotuj w raporcie. NIE dodawaj nowych odczytów Firestore o dużym wolumenie (koszty!).
- Bottom nav: tab EXERCISES już istnieje (5. pozycja) — NIE dotykaj `AppNavigation.tsx` (własność WP-F).

**Files:**
- Modify: `src/pages/ExerciseLibrary.tsx` (przebudowa), `src/lib/exercise-media.ts` (helper `getGroupImageUrl(categoryId)`)
- Create: `src/components/exercises/GroupTile.tsx`, `src/components/exercises/GroupHeader.tsx` (hero + back), opcjonalnie `src/components/exercises/ExerciseListRow.tsx` (wydzielony wiersz)
- Test: `src/test/exercise-library-groups.test.tsx` (nowy), aktualizacja istniejących testów library (grep `ExerciseLibrary` w src/test i e2e — e2e NIE uruchamiaj, ale ZAKTUALIZUJ selektory jeśli zmieniasz testid-y; zachowaj `data-testid="exercise-preview-thumb"`)
- i18n: anchor `exercises.*` / `library.*` (sprawdź istniejący namespace strony greppem)

**Interfaces:**
- Consumes: `public/exercise-groups/<categoryId>.webp` od WP-IMG (manifest: `public/exercise-groups/manifest.json` z listą wygenerowanych id).
- Produces: `getGroupImageUrl(categoryId: string): string` w `exercise-media.ts` → `/exercise-groups/${categoryId}.webp` (ścieżka względna basePath — sprawdź jak apka linkuje inne assety z public/, np. dźwięk timera; base '/' od custom domain).

## Wymagania wizualne (szczegóły w design-exercises-tab.md)

Poziom 1: header EXERCISES + licznik "N IN LIBRARY" (i18n!), search, grid 2 kolumny kafli (zdjęcie 78 px + nazwa + licznik w akcencie), wiersz "Nowe własne ćwiczenie", poziome dojście do custom exercises (są liczone w licznikach swoich kategorii). Poziom 2: hero 150 px ze zdjęciem grupy + przycisk wstecz (glass circle `bg-black/60 backdrop-blur`), licznik + tytuł grupy, chipsy filtrów (ALL n / COMPOUND / ISOLATION / BODYWEIGHT), lista wierszy (nazwa, typ, opcjonalnie BEST, badge PR, chevron) — tap w wiersz → istniejący `/exercise/:slug`. Kolory przez tokeny apki (surface-*, primary), akcent = `text-primary`/`bg-primary` (NIE hardkoduj limonki — akcent jest konfigurowalny). Badge PR: `bg-primary/15 text-primary` (wzorzec już w `ExerciseRow:97`; zero color-mix).

## Edge cases

1. Wyszukiwanie na poziomie 1 działa globalnie: niepusta fraza → płaska lista wyników (jak dziś), pusta → siatka grup. Wyniki wyszukiwania to istniejące wiersze z podglądem wideo (zachowaj `ExerciseVideoPreview` i limit jednego aktywnego podglądu).
2. Powrót z poziomu 2: przycisk wstecz w hero + systemowy back (searchParam `group` → history back działa naturalnie). Scroll: wejście do grupy zaczyna od góry; powrót do siatki przywraca pozycję (użyj istniejących wzorców scroll-restore jeśli są; jeśli nie — pomiń restore, odnotuj).
3. Filtr BODYWEIGHT = `isBodyweight === true`; COMPOUND/ISOLATION = `type`; ALL pokazuje licznik grupy. Ćwiczenie bodyweight compound liczy się do OBUS filtrów (BODYWEIGHT i COMPOUND) — filtry są rozłączne w UI (jeden aktywny naraz).
4. Custom exercise bez kategorii lub z kategorią spoza 8 → grupa "Własne" (dodatkowy kafel, zdjęcie fallback — gradient surface bez fotki) LUB przypisanie do kategorii jeśli custom ma pole kategorii — sprawdź kształt `custom_exercises` i wybierz zgodnie z danymi; odnotuj decyzję.
5. Brak zdjęcia grupy (WP-IMG jeszcze nie dostarczył / brak pliku): kafel renderuje gradient `bg-surface-high` z nazwą — ZERO zepsutych imgów (onError → fallback).
6. Licznik "243 IN LIBRARY" = biblioteka + custom usera (spójny z sumą kafli).
7. i18n: nazwy grup mięśniowych muszą mieć tłumaczenia PL/EN (sprawdź czy istnieją klucze kategorii — chipsy `:157` już jakieś mają; użyj tych samych).

## Tasks

### Task E1: helper obrazków grup + fallback (TDD)

- [ ] Test w `src/test/exercise-library-groups.test.tsx`: `getGroupImageUrl('chest')` (użyj realnego id kategorii z danych) zwraca ścieżkę `/exercise-groups/<id>.webp`.
- [ ] Implementacja w `exercise-media.ts`. Run → PASS.

### Task E2: poziom 1 — siatka grup

- [ ] Test: render `ExerciseLibrary` bez frazy → widoczne kafle wszystkich kategorii (liczba kafli == liczba kategorii [+1 "Własne" jeśli dotyczy]), każdy z licznikiem; licznik nagłówka == suma. Fraza w search → płaska lista wyników, siatka ukryta.
- [ ] Implementacja: przebudowa `ExerciseLibrary.tsx` page component; `GroupTile` (zdjęcie object-cover h-[78px], nazwa font-heading, licznik `text-primary` mono); wiersz "Nowe własne ćwiczenie" otwierający ISTNIEJĄCY dialog tworzenia custom (ten z ExercisePicker); po utworzeniu — ćwiczenie widoczne w swojej grupie.
- [ ] Run → PASS.

### Task E3: poziom 2 — widok grupy

- [ ] Test: z `?group=<id>` render pokazuje hero z tytułem grupy, chipsy filtrów, listę ćwiczeń tej grupy; klik COMPOUND filtruje; klik wstecz wraca do siatki (searchParam znika); klik wiersza nawiguję do `/exercise/:slug`.
- [ ] Implementacja: `GroupHeader` (hero + back button glass), chipsy wzorem istniejących (`chip-mono`), lista w kontenerze `bg-surface-low rounded-[20px]`, wiersze min-h-56px z separatorem.
- [ ] BEST/PR wg "Spec" (tylko jeśli istnieje tani helper — inaczej pomiń, odnotuj).
- [ ] Run → PASS.

### Task E4: aktualizacja istniejących testów

- [ ] `grep -rn "ExerciseLibrary\|exercise-preview-thumb\|exercises" src/test e2e --include="*.ts*" -l` → przejrzyj każdy trafiony test unit; zaktualizuj do nowej struktury (np. test chipów kategorii → test kafli). E2E specy: zaktualizuj selektory, jeśli jednoznacznie widzisz konieczność (np. `exercise-video.spec.ts` wchodzi w listę — po redesignie lista jest pod grupą lub w wynikach szukania; dopisz kroki wejścia w grupę), ale NIE odpalaj playwrighta.
- [ ] `npx vitest run` → zielone.

### Task E5: integracja zdjęć od WP-IMG

- [ ] Sprawdź `public/exercise-groups/manifest.json`; jeśli istnieje — upewnij się, że id plików pokrywają się z id kategorii użytymi w E1/E2 (manifest zawiera mapping). Jeśli WP-IMG jeszcze nie skończył — fallback z Edge case 5 MUSI działać (test: kafel bez pliku renderuje gradient).
- [ ] Run → PASS.

### Task E6: finał pakietu

- [ ] `npx vitest run` + `npm run typecheck` + `npm run lint` → zielone.
- [ ] Raport wg protokołu; wypisz decyzje: BEST włączone/pominięte, obsługa custom bez kategorii, które e2e specy zaktualizowane.

## Pułapki

- NIE dotykaj `AppNavigation.tsx`, `src/index.css`, prymitywów ui/ (własność WP-F).
- Podgląd wideo: iOS ma limit dekoderów — utrzymaj zasadę jednego aktywnego podglądu (`ExerciseLibrary.tsx:115`).
- Licznik i teksty przez i18n — `i18n-hardcoded-scan.test.ts` wyłapie hardkody.
- Obrazy: `loading="lazy"` na kaflach; hero bez lazy (LCP widoku grupy).
