# PLAN PROJEKTU - Strength Save

> Cel, kamienie milowe, zadania

---

## CEL GŁÓWNY

Multi-user aplikacja PWA do śledzenia treningów siłowych z planem 3x w tygodniu (Pon/Śr/Pt), zapisem postępów do Firebase, pomiarami ciała, integracją Strava i panelem admina.

---

## KAMIENIE MILOWE

- [x] **M1:** MVP - podstawowe śledzenie treningów ✅
- [x] **M2:** Firebase integration (Firestore + Auth) ✅
- [x] **M3:** Pomiary ciała ✅
- [x] **M4:** v3.0.0 - Warmup, notatki, edycja, nawigacja historyczna ✅
- [x] **M5:** v3.1.0 - Quick wins, stabilność, jakość, wykresy ✅
- [x] **M6:** v4.0.0 - Multi-user + Admin Panel + Strava Integration ✅
- [ ] **M7:** PWA offline mode (service worker caching)
- [ ] **M8:** Export do PDF / raporty tygodniowe

---

## FUNKCJONALNOŚCI (v3.0.0)

### Core
- [x] Plan treningowy 3x/tydzień (Poniedziałek, Środa, Piątek)
- [x] 5-6 ćwiczeń dziennie + superserie
- [x] Harmonogram na 12 tygodni do przodu
- [x] Seria rozgrzewkowa (warmup) - pomarańczowa
- [x] Notatki do każdego ćwiczenia
- [x] Instrukcje wykonania ćwiczeń (rozwijane)

### Nawigacja i widoki
- [x] Dashboard ze statystykami
- [x] Plan dnia (co dziś?)
- [x] Plan tygodniowy (kalendarz)
- [x] Widok aktywnego treningu (auto-save)
- [x] Widok ukończonego treningu (podsumowanie)
- [x] Tryb edycji (bez auto-save, zapis manualny)
- [x] Nawigacja do przeszłych treningów z parametrem `?date=`

### Statystyki
- [x] Liczba ukończonych treningów
- [x] Całkowity tonaż (kg × powtórzenia)
- [x] Suma powtórzeń w podsumowaniu
- [x] Aktualna waga (z pomiarów)
- [x] Postęp miesięczny (%)

### Pomiary
- [x] 10 wymiarów ciała
- [x] Historia pomiarów
- [x] Data ostatniego pomiaru w formularzu

### Techniczne
- [x] Firebase Firestore (real-time sync)
- [x] Google OAuth (whitelist email)
- [x] GitHub Pages deployment
- [x] Debounce przy zapisie (300ms)
- [x] Sanityzacja danych dla Firebase
- [x] Import/Export JSON

---

## ZADANIA

### CHECKLIST: Stabilność ✅
- [x] **Error Boundary** - React Error Boundary w `App.tsx`
- [x] **Dashboard fix** - Plan tygodnia pokazuje bieżący tydzień (nie najnowszy trening ever)
- [x] **Cleanup timeoutów** - pendingSaves i autoSaveTimer czyszczone na unmount
- [ ] **Walidacja danych z Firebase** - sprawdzać czy dane z `onSnapshot` mają poprawną strukturę

### CHECKLIST: Jakość kodu ✅
- [x] **Strict TypeScript** - `strict: true` w `tsconfig.app.json`
- [x] **Testy jednostkowe** - `sanitizeSets()`, `parseSetCount()`, `createEmptySets()` (25 testów, Vitest)
- [x] **Testy `getTrainingSchedule()`** - weryfikacja kalkulacji dat
- [x] **Cleanup console** - usunięto zbędne `console.error` i `console.log`
- [x] **Utility refactor** - wyciągnięto `exercise-utils.ts` z ExerciseCard (testowalność)
- [ ] **Testy hooka `useFirebaseWorkouts`** - mockowanie Firebase, sprawdzenie sanityzacji

### CHECKLIST: Funkcjonalność ✅
- [x] **Timer odpoczynku** - `RestTimer.tsx` z circular progress ring, presetami, pauzą, wibracją
  - Przycisk timera w dolnym pasku aktywnego treningu
- [x] **Dark mode** - ThemeProvider + toggle Sun/Moon w AppHeader
- [x] **Wykresy postępów** - `Progress.tsx` z recharts
  - Progresja ciężarów (linia w czasie, filtr per dzień)
  - Pomiary ciała (multi-line chart)
  - Nowa pozycja "Postępy" w nawigacji
- [ ] PWA offline mode - cache'owanie ostatnich treningów (service worker)
- [ ] Powiadomienia push (przypomnienie o treningu)
- [ ] Personalizacja planu (dodawanie własnych ćwiczeń)

### Zrobione (v4.0.0 - 2026-03-08)

**Multi-User:**
- [x] Multi-email whitelist (`VITE_ALLOWED_EMAILS`)
- [x] UserContext + UserProvider (profil, rola, stravaConnected)
- [x] userId w workouts, measurements, training_plans
- [x] useFirebaseWorkouts(userId) - zapytania per-user
- [x] useTrainingPlan(userId) - per-user training plans
- [x] Aktualizacja 11 stron + 5 AI hooks
- [x] Skrypt migracji (`scripts/migrate-to-multiuser.mjs`)
- [x] Firestore composite indexes (`firestore.indexes.json`)
- [x] Firestore security rules (`firestore.rules`)

**Admin Panel:**
- [x] AdminRoute guard
- [x] AdminDashboard (lista użytkowników)
- [x] UserPlanEditor (edycja planu per-user)
- [x] Routing admin + nawigacja (Shield icon, only admins)

**Strava Integration:**
- [x] Cloud Functions: stravaAuthUrl, stravaCallback, stravaSync
- [x] OAuth bridge: `public/strava-callback.html`
- [x] useStrava hook (activities, connect, sync, disconnect)
- [x] Settings page (konto + Strava)
- [x] StravaCallback page (OAuth handler)
- [x] StravaActivityCard (ikony, dystans, tempo, tętno)
- [x] Dashboard: aktywności Strava w planie tygodnia
- [x] TrainingPlan: kropki Strava w kalendarzu + legenda
- [x] Routing: /settings, /strava/callback

**Polish:**
- [x] Nazwa użytkownika w AppHeader (dropdown)
- [x] Link "Ustawienia" w nawigacji
- [x] Aktualizacja DOCUMENTATION.md, DECYZJE.md, PLAN.md

### Zrobione (v3.1.0 - 2026-02-23)
- [x] Firebase config przeniesiony do `.env` (bezpieczeństwo)
- [x] Usunięty dead code (`useWorkoutProgress.ts`)
- [x] Typy wyciągnięte do `src/types/index.ts` (DRY)
- [x] ExerciseCard owinięty w `React.memo` (performance)
- [x] Naprawa skakania UI przy auto-save (ref zamiast state, subtelny wskaźnik)
- [x] Potwierdzenie zakończenia treningu (dwukrokowe)
- [x] Podpowiedź poprzedniego ciężaru w ExerciseCard
- [x] Debounce zwiększony 300ms → 500ms (mniej zapisów)
- [x] Dodany `.gitignore`
- [x] Poprawione typowanie `catch` bloków (usunięte `any`)
- [x] Dashboard: plan tygodnia pokazuje bieżący tydzień
- [x] Error Boundary z fallback UI
- [x] Dark mode (ThemeProvider + toggle)
- [x] Timer odpoczynku (RestTimer.tsx) z circular progress ring
- [x] Strona Postępy z wykresami recharts (ciężary + pomiary)
- [x] Strict TypeScript (`strict: true`)
- [x] 25 testów Vitest (exercise-utils + trainingPlan)
- [x] Utility functions wyciągnięte do `src/lib/exercise-utils.ts`
- [x] Cleanup zbędnych console.error/log

### Zrobione (v3.0.0 - 2026-01-28)
- [x] Seria rozgrzewkowa (warmup) - pomarańczowa z ikoną płomienia
- [x] Notatki do ćwiczeń
- [x] Tryb edycji bez auto-save
- [x] Nawigacja do przeszłych treningów z poprawną datą
- [x] Suma powtórzeń w podsumowaniu
- [x] Data ostatniego pomiaru
- [x] Naprawa: plan tygodniowy pokazywał przyszły tydzień
- [x] Naprawa: przycisk "Zapisz zmiany" skakał na mobile
- [x] Usunięto: kafelek "Seria treningowa" z Osiągnięć
- [x] Usunięto: wersję z nagłówka
- [x] Utworzenie pełnej dokumentacji DOCUMENTATION.md

---

## NOTATKI

### Kluczowe pliki do modyfikacji

| Zmiana | Plik(i) |
|--------|---------|
| Nowe ćwiczenie | `src/data/trainingPlan.ts` |
| UI treningu | `src/pages/WorkoutDay.tsx` + `src/components/ExerciseCard.tsx` |
| Nowa strona | `src/pages/` + `src/App.tsx` (routing) |
| Firebase operacje | `src/hooks/useFirebaseWorkouts.ts` |
| Nawigacja | `src/components/AppNavigation.tsx` |
| Statystyki | `src/pages/Dashboard.tsx` + hook |

### Często spotykane problemy

1. **"Undefined is not valid" przy zapisie Firebase**
   → Sprawdź sanityzację w `useFirebaseWorkouts.ts`

2. **Kliknięcie na trening nie pokazuje danych**
   → Sprawdź czy nawigacja przekazuje `?date=` parametr

3. **Plan pokazuje zły tydzień**
   → Sprawdź `getTrainingSchedule()` w `trainingPlan.ts`

4. **Auto-save "mryga"**
   → Użyj `handleSetsChangeLocal` zamiast `handleSetsChange`
