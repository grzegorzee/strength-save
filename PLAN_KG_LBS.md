# PLAN: kg ↔ lbs — przełącznik jednostek działa WSZĘDZIE

> Cel: przełącznik kg/lbs (Profil) ma zmieniać KAŻDĄ wagę w całej aplikacji (wyświetlanie + pola wpisywania + wykresy + tonaż + rekordy + pomiary ciała). Dziś działa tylko w 4 plikach.

## Zasada (NIE zmieniać modelu danych)
- **Kanoniczne w Firestore = ZAWSZE kg.** Nigdy nie zapisujemy lbs. Konwersja tylko na warstwie UI.
- **Wyświetlanie:** wartość z kg → `fmt(kg)` (zwraca "92.5 kg" / "204 lbs") albo `toDisplay(kg)` dla samej liczby (wykresy) + etykieta z `unit`.
- **Wpisywanie:** to co user wpisał (w aktualnej jednostce) → `fromInput(value)` (→ kg) przy zapisie. Pre-fill pola: `toDisplay(storedKg)`.
- **Nigdy** twardego napisu `"kg"` w kontekście wagi — zawsze z `unit`/`fmt`.

## Infra (już istnieje, NIE budować od nowa)
- `src/lib/units.ts`: `kgToLbs`, `lbsToKg`, `toDisplayWeight`, `fromInputWeight`, `formatWeight`. `UnitSystem='kg'|'lbs'`.
- `src/contexts/UnitContext.tsx`: `useUnit()` → `{ unit, setUnit, fmt, toDisplay, fromInput }`. localStorage `unit-system`.
- Przełącznik: `Profile.tsx` (setUnit). Provider w `App.tsx` (UnitProvider).

## Stan (audyt)
- ✅ Używają `useUnit`: `ExerciseCard.tsx`, `Profile.tsx`, `WorkoutDay.tsx` (zweryfikować kompletność).
- ❌ Twarde "kg" / surowe wagi (do naprawy, liczba wystąpień): `Analytics.tsx` (11), `Achievements.tsx` (7), `ExerciseProgressionDialog.tsx` (5), `WorkoutDay.tsx` (4 — częściowo), `WorkoutHistory.tsx` (3), `Dashboard.tsx` (3), `Measurements.tsx` (2), `ExerciseCard.tsx` (2), `NewPlan.tsx` (1), `Cycles.tsx` (1), `RzaMetricsCard.tsx` (1), `CycleDetail.tsx` (1).

## Kroki (kolejność)

**Krok 1 — rozszerz units.ts + testy**
- Dodaj `formatTonnage(kg, unit)`: kg → "X.X t", lbs → "X.X k lbs" (tysiące funtów). Tonaż to Σ kg; w lbs konwertujemy całość.
- (opc.) `weightUnitLabel(unit)` → "kg"/"lbs".
- Testy w `src/test/units.test.ts` (jeśli brak — utwórz): kgToLbs/lbsToKg round-trip, formatWeight, formatTonnage, fromInput/toDisplay.

**Krok 2 — pola wpisywania wagi (round-trip)**
- `ExerciseCard.tsx` / `WorkoutDay.tsx`: input serii — pre-fill `toDisplay(kg)`, zapis `fromInput(value)`. Placeholder/label z `unit`. Sprawdź pre-fill ostatniej wagi (M32) + zapis serii (krytyczne — nie zepsuć `setData`/`onSetsChange`).
- `Measurements.tsx` + `MeasurementsForm`: pole wagi ciała — pre-fill `toDisplay`, zapis `fromInput`. (Obwody ciała: cm — NIE ruszać, to nie jednostka wagi.)

**Krok 3 — wyświetlanie wag (per plik)**
Zamień surowe `{x} kg` → `{fmt(x)}` lub `{toDisplay(x)} {unit}`:
- `Dashboard.tsx`: kafelek tonażu (`formatTonnage`), ostatni PR. (UWAGA: `weeklyKm` = dystans km, NIE waga — zostaw.)
- `WorkoutHistory.tsx`: kafelek "kg" sesji (`formatTonnage` lub fmt), delty porównania.
- `Cycles.tsx` / `CycleDetail.tsx`: tonaż, PR.
- `RzaMetricsCard.tsx`, `NewPlan.tsx` (objętość closeout → formatTonnage).

**Krok 4 — wykresy (Analytics, Achievements, ExerciseProgressionDialog)**
- Mapuj dane wykresu przez `toDisplay(kg)` PRZED podaniem do Recharts (żeby oś się skalowała).
- Tooltip/oś: formatuj z `unit` (np. `formatter={(v)=>`${v} ${unit}`}`).
- `Achievements.tsx`: życiowe 1RM (delta też konwertuj!), lista rekordów (maxWeight), lista 1RM, trend tonażu (formatTonnage), dialog historii (serie kg×reps → fmt), progi odznak tonażu (label przez formatTonnage; logika `achieved` zostaje na kg).
- `Analytics.tsx`: tonaż, trend wagi, 1RM, statystyki.
- `ExerciseProgressionDialog.tsx`: wykres + wartości 1RM/ciężaru.

**Krok 5 — weryfikacja round-trip**
- Wpisz wagę w trybie lbs → zapis kg → wyświetlenie z powrotem lbs (zgodne). Przełącz na kg → poprawne kg.
- Brak podwójnej konwersji (miejsca już używające fmt nie mogą dostać `toDisplay` drugi raz).

**Krok 6 — testy + wizualna weryfikacja**
- `npx tsc --noEmit -p tsconfig.app.json` + `npx eslint .` + `npx vitest run`.
- Playwright: ustaw `unit-system='lbs'` w localStorage (addInitScript) + scenariusz `active-admin`, screenshoty: Dashboard, Analytics, WorkoutDay, Achievements, Measurements, Historia — potwierdź "lbs" wszędzie + przeliczone wartości. Potem `npm run build:mobile`.

## Pułapki
- Tonaż w lbs: duże liczby — użyj `formatTonnage` (t / k lbs), nie surowego fmt.
- Progi/milestones: thresholdy w kg (kanon), konwertuj TYLKO label.
- Strava (km/pace) = dystans, nie waga — poza zakresem tego przełącznika.
- Pre-fill wagi serii (M32: ostatnia waga bez +1) — zachowaj logikę, dodaj tylko konwersję.
- Nie zaokrąglaj kg przy zapisie (100 lbs = 45.359 kg) — zaokrąglenie tylko przy wyświetlaniu.

## Kryterium sukcesu
Przełącznik lbs w Profilu → KAŻDA waga w apce (treningi, podsumowania, wykresy, rekordy, tonaż, pomiary) pokazuje lbs i przeliczoną wartość; powrót na kg → kg. Zero twardych "kg" w kontekstach wagi. Zapisy zawsze w kg.
