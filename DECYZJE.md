# LOG DECYZJI - Strength Save

> Wszystkie ważne decyzje projektowe w jednym miejscu

---

**Data utworzenia:** 2026-01-28

---

## DECYZJE

| Data | Decyzja | Kontekst | Status |
|------|---------|----------|--------|
| 2026-03-08 | **Multi-user: UserContext + userId** - każdy hook przyjmuje userId, dane izolowane per-user | Dodanie Asi jako drugiego użytkownika, plany per-user | AKTYWNA |
| 2026-03-08 | **Multi-email whitelist** - `VITE_ALLOWED_EMAILS` (comma-separated) zamiast jednego emaila | Skalowalne podejście do autentykacji | AKTYWNA |
| 2026-03-08 | **Admin panel z rolami** - `role: 'admin' \| 'user'` w profilu, AdminRoute guard | Admin zarządza planami wszystkich użytkowników | AKTYWNA |
| 2026-03-08 | **Per-user training plans** - `training_plans/{userId}` zamiast `training_plans/current` | Każdy użytkownik ma własny plan | AKTYWNA |
| 2026-03-08 | **Strava via Cloud Functions** - stravaAuthUrl, stravaCallback, stravaSync (callable) | OAuth wymaga server-side, token refresh | AKTYWNA |
| 2026-03-08 | **Strava OAuth bridge** - `strava-callback.html` → HashRouter `#/strava/callback` | GitHub Pages + HashRouter = Strava nie może redirectować na hash URL | AKTYWNA |
| 2026-03-08 | **Firestore composite indexes** - userId ASC + date DESC na workouts i measurements | Zapytania z `where('userId')` + `orderBy('date')` wymagają composite index | AKTYWNA |
| 2026-03-08 | **Firestore security rules** - użytkownicy czytają/piszą tylko swoje dane, admin ma read all | Bezpieczeństwo danych multi-user | AKTYWNA |
| 2026-02-23 | **Strict TypeScript** - `strict: true` w tsconfig.app.json, zero błędów | Jakość - strictNullChecks, noImplicitAny zapobiegają runtime errors | AKTYWNA |
| 2026-02-23 | **Testy Vitest** - 25 testów dla exercise-utils i trainingPlan | Jakość - pokrycie kluczowych utility functions | AKTYWNA |
| 2026-02-23 | **exercise-utils.ts** - wyciągnięto parseSetCount, createEmptySets, sanitizeSets z ExerciseCard | Testowalność - funkcje utility w oddzielnym pliku, importowane przez komponent | AKTYWNA |
| 2026-02-23 | **Strona Postępy** - wykresy recharts: progresja ciężarów (filtr per dzień) + pomiary ciała | Funkcjonalność - wizualizacja progresu treningowego | AKTYWNA |
| 2026-02-23 | **RestTimer w WorkoutDay** - przycisk timera w dolnym pasku obok "Zakończ trening" | UX - timer dostępny w trakcie treningu, nie automatyczny (manualne uruchomienie) | AKTYWNA |
| 2026-02-23 | **Dark mode** - ThemeProvider (next-themes) + toggle Sun/Moon w AppHeader | UX - wsparcie ciemnego motywu, CSS variables w index.css już były | AKTYWNA |
| 2026-02-23 | **Error Boundary** - class component ErrorBoundary owijający całą aplikację | Stabilność - fallback UI zamiast białej strony przy crashach | AKTYWNA |
| 2026-02-23 | **Dashboard: bieżący tydzień** - getThisWeekDates() zamiast getLatestWorkout() | Stabilność - plan tygodnia nie pokazywał starych treningów z poprzednich tygodni | AKTYWNA |
| 2026-02-23 | **Firebase config do .env** - credentials przeniesione do zmiennych VITE_* | Bezpieczeństwo - hardkodowane klucze w źródłach | AKTYWNA |
| 2026-02-23 | **Typy w src/types/index.ts** - centralne typy zamiast duplikatów w hookach | DRY, łatwiejsze utrzymanie, usunięcie dead code | AKTYWNA |
| 2026-02-23 | **React.memo na ExerciseCard** - zapobiega niepotrzebnym re-renderom | Performance - skakanie UI przy auto-save | AKTYWNA |
| 2026-02-23 | **AutoSaveStatus zamiast SavingIndicator** - subtelna chmurka w rogu zamiast skaczącego paska | UX - stary wskaźnik powodował layout shift i irytujące skoki | AKTYWNA |
| 2026-02-23 | **Potwierdzenie zakończenia treningu** - dwukrokowy przycisk (klik → "Tak, zakończ" / "Anuluj") | UX - jedno kliknięcie kończyło trening bez szansy na cofnięcie | AKTYWNA |
| 2026-02-23 | **Podpowiedź poprzedniego ciężaru** - "Poprzednio: 8×40kg" pod pustymi seriami | UX - użytkownik nie musi pamiętać ciężarów z poprzedniego treningu | AKTYWNA |
| 2026-02-23 | **Debounce 500ms** (wcześniej 300ms) - mniej zapisów do Firebase | Performance - rzadsze zapisy, mniej onSnapshot callbacks | AKTYWNA |
| 2026-01-28 | **Seria rozgrzewkowa (warmup)** - pierwsza seria każdego ćwiczenia jest warmup, pomarańczowa z ikoną płomienia | Użytkownik chciał oddzielić rozgrzewkę od serii roboczych | AKTYWNA |
| 2026-01-28 | **Notatki do ćwiczeń** - opcjonalne pole tekstowe pod seriami, zapisywane do Firebase | Użytkownik chciał zapisywać odczucia, uwagi techniczne | AKTYWNA |
| 2026-01-28 | **Tryb edycji bez auto-save** - handler `handleSetsChangeLocal` modyfikuje tylko lokalny state, zapis dopiero na "Zapisz zmiany" | Auto-save w trybie edycji powodował "mryganie" UI i niepotrzebne zapisy | AKTYWNA |
| 2026-01-28 | **Parametr `?date=` w URL** - wszystkie nawigacje do `/workout/:dayId` przekazują datę | Bez tego kliknięcie na przeszły trening pokazywało dzisiejszą datę i "Rozpocznij trening" | AKTYWNA |
| 2026-01-28 | **Plan tygodniowy od bieżącego poniedziałku** - `getTrainingSchedule()` liczy wstecz do poniedziałku | Wcześniej pokazywał następny tydzień zamiast bieżącego | AKTYWNA |
| 2026-01-28 | **Przycisk "Zapisz zmiany" statyczny** - nie fixed, małe przyciski pod listą ćwiczeń | Fixed button skakał na mobile przy otwieraniu klawiatury | AKTYWNA |
| 2026-01-28 | **Usunięcie kafelka "Seria treningowa"** z Osiągnięć | Niepotrzebna funkcjonalność, brak sensownego wykorzystania | AKTYWNA |
| 2026-01-28 | **Wersja tylko w nawigacji** - usunięta z nagłówka Dashboard | Mniej clutteru w UI | AKTYWNA |
| 2026-01-28 | **Suma powtórzeń w podsumowaniu** - `totalRepsCount` obok serii i ćwiczeń | Dodatkowa metryka sukcesu treningu | AKTYWNA |
| 2026-01-28 | **Data ostatniego pomiaru** - wyświetlana w formularzu pomiarów | Użytkownik chciał wiedzieć kiedy ostatnio mierzył | AKTYWNA |

---

## DECYZJE ARCHITEKTONICZNE

| Data | Decyzja | Kontekst | Status |
|------|---------|----------|--------|
| 2026-01 | **HashRouter zamiast BrowserRouter** | GitHub Pages nie obsługuje server-side routing | AKTYWNA |
| 2026-01 | **Firebase Firestore** | Real-time sync, Google Auth integration, darmowy tier | AKTYWNA |
| 2026-01 | **Whitelist email** | Multi-email whitelist (VITE_ALLOWED_EMAILS) | AKTYWNA |
| 2026-01 | **Debounce 300ms przy auto-save** | Zapobiega nadmiernym zapisom przy szybkim wprowadzaniu | AKTYWNA |
| 2026-01 | **Sanityzacja danych przed Firebase** | Firebase nie akceptuje `undefined`, musi być `null` lub pominięte | AKTYWNA |

---

## DO PRZEMYŚLENIA

- [ ] Czy dodać timer odpoczynku między seriami?
- [ ] Czy pokazywać poprzedni ciężar jako podpowiedź?
- [ ] Czy dodać dark mode?
- [ ] Czy rozbudować o własne ćwiczenia?

---

## ODRZUCONE OPCJE

| Data | Opcja | Powód odrzucenia |
|------|-------|------------------|
| 2026-01-28 | Auto-save w trybie edycji | Powodował "mryganie" i niepotrzebne zapisy do Firebase |
| 2026-01-28 | Fixed button na dole ekranu w trybie edycji | Skakał przy otwieraniu klawiatury na mobile |
| 2026-01-28 | Kafelek "Seria treningowa" | Nie dawał wartości użytkownikowi |
| 2026-01 | LocalStorage zamiast Firebase | Brak sync między urządzeniami |
| 2026-01 | BrowserRouter | Nie działa na GitHub Pages |

---

## KONTEKST TECHNICZNY (dla przyszłych sesji)

### Handlery w WorkoutDay.tsx
- `handleSetsChange` → aktywny trening, AUTO-SAVE z debounce
- `handleSetsChangeLocal` → tryb edycji, TYLKO lokalny state
- `handleFinishEditing` → zapis wszystkiego na raz po edycji

### Struktura SetData
```typescript
interface SetData {
  reps: number;       // Zawsze number, nigdy undefined
  weight: number;     // Zawsze number, nigdy undefined
  completed: boolean; // Zawsze boolean
  isWarmup?: boolean; // Opcjonalne, true tylko dla warmup
}
```

### Nawigacja z datą
```typescript
// Tak nawigujemy do treningu z konkretnej daty:
navigate(`/workout/${dayId}?date=${targetDate}`)

// WorkoutDay odczytuje:
const [searchParams] = useSearchParams();
const targetDate = searchParams.get('date') || today;
```

### Znajdowanie bieżącego poniedziałku
```typescript
const dayOfWeek = start.getDay();
const daysSinceMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
start.setDate(start.getDate() - daysSinceMonday);
```
