# LOG DECYZJI - Strength Save

> Wszystkie ważne decyzje projektowe w jednym miejscu

---

**Data utworzenia:** 2026-01-28
**Ostatnia aktualizacja:** 2026-03-08 (v5.1.0)

---

## DECYZJE

### v5.1.0 (2026-03-08)

| Data | Decyzja | Kontekst | Status |
|------|---------|----------|--------|
| 2026-03-08 | **Auto-detect istniejących użytkowników** — w `ensureUserDoc()` sprawdzamy czy user ma workouty → auto `onboardingCompleted: true` | Bug v5.0: istniejący użytkownicy widzieli onboarding i tracili swój plan | AKTYWNA |
| 2026-03-08 | **Przywracanie domyślnego planu** — jeśli existing user nie miał `onboardingCompleted`, przywracamy defaultPlan | Bug v5.0 nadpisywał plany istniejących użytkowników | AKTYWNA |
| 2026-03-08 | **Rozszerzony Weekday type (7 dni)** — `'monday' \| 'tuesday' \| ... \| 'sunday'` | Plany 2-5 dni/tydzień wymagają mappingu na dowolny dzień | AKTYWNA |
| 2026-03-08 | **Dynamiczny getTrainingSchedule()** — akceptuje `weeks` i `days` params | Plany AI mają różną liczbę dni i tygodni | AKTYWNA |
| 2026-03-08 | **Plan duration tracking** — `planDurationWeeks`, `planStartDate`, `currentWeek`, `isPlanExpired` | Plany mają czas trwania (8-16 tygodni), po upływie → nowy plan | AKTYWNA |
| 2026-03-08 | **Banner expired plan** — Dashboard pokazuje banner "Twój plan się zakończył!" z linkiem do /new-plan | UX: jasna komunikacja + call-to-action | AKTYWNA |
| 2026-03-08 | **NewPlan.tsx** — oddzielna strona generowania nowego planu (cel, dni, AI, review, save) | Oddzielony od onboardingu: mniejszy, prostszy, podsumowuje stary plan | AKTYWNA |
| 2026-03-08 | **Review planu po AI generation** — onboarding i NewPlan pokazują plan z "Zamień" buttonsami | User widzi plan PRZED zapisem, może zamienić ćwiczenia | AKTYWNA |
| 2026-03-08 | **ExerciseSwapDialog** — dialog zamiany ćwiczenia z filtrami po kategorii | Filtruje bibliotekę, ukrywa już użyte, zachowuje oryginalne sety | AKTYWNA |
| 2026-03-08 | **GeneratedPlan interface** — `{ days, planDurationWeeks }` zamiast plain array | AI zwraca czas trwania planu (8-12 tygodni) | AKTYWNA |
| 2026-03-08 | **Strava 365 dni lookback** — pierwszy sync pobiera rok wstecz (zamiast 30 dni) | Użytkownicy chcieli widzieć starsze aktywności | AKTYWNA |
| 2026-03-08 | **Strava w planie tygodnia** — Dashboard, TrainingPlan, Analytics, AIChat | Strava aktywności widoczne obok treningów siłowych | AKTYWNA |
| 2026-03-08 | **AI "Podsumuj tydzień" z Strava** — quick action w AIChat buduje prompt z treningami + Strava | Pełny obraz tygodnia: siłownia + bieganie/rower/etc. | AKTYWNA |
| 2026-03-08 | **Klikalne ukończone treningi w Analytics** — `<button>` zamiast `<div>` z navigate | UX: użytkownik może przejść do szczegółów treningu | AKTYWNA |

### v5.0.0 (2026-03-08)

| Data | Decyzja | Kontekst | Status |
|------|---------|----------|--------|
| 2026-03-08 | **AI-powered onboarding** — 5-krokowy wizard → AI generuje plan | Nowi użytkownicy dostają spersonalizowany plan zamiast domyślnego | AKTYWNA |
| 2026-03-08 | **Exercise library (60+ ćwiczeń)** — `exerciseLibrary.ts` z kategoriami i video URL | AI używa nazw z biblioteki (priorytet), swap dialog filtruje po kategoriach | AKTYWNA |
| 2026-03-08 | **AI Coach na Dashboard** — insights: plateau, progress, consistency, suggestion, warning | Analiza treningów po 3+ ukończonych, cache 24h | AKTYWNA |
| 2026-03-08 | **OpenAI integration** — `callOpenAI()` w `ai-coach.ts`, `VITE_OPENAI_API_KEY` | Generowanie planów i AI coaching przez API | AKTYWNA |
| 2026-03-08 | **onboardingCompleted flag** — pole w `users/{uid}` decyduje o onboarding vs Dashboard | Kontrola flow nowych użytkowników | AKTYWNA |

### v4.0.0 (2026-03-08)

| Data | Decyzja | Kontekst | Status |
|------|---------|----------|--------|
| 2026-03-08 | **Multi-user: UserContext + userId** — każdy hook przyjmuje userId, dane izolowane per-user | Dodanie drugiego użytkownika, plany per-user | AKTYWNA |
| 2026-03-08 | **Multi-email whitelist** — `VITE_ALLOWED_EMAILS` (comma-separated) | Skalowalne podejście do autentykacji | AKTYWNA |
| 2026-03-08 | **Admin panel z rolami** — `role: 'admin' \| 'user'`, AdminRoute guard | Admin zarządza planami wszystkich użytkowników | AKTYWNA |
| 2026-03-08 | **Per-user training plans** — `training_plans/{userId}` z days, durationWeeks, startDate | Każdy użytkownik ma własny plan z czasem trwania | AKTYWNA |
| 2026-03-08 | **Strava via Cloud Functions** — stravaAuthUrl, stravaCallback, stravaSync (callable) | OAuth wymaga server-side, token refresh | AKTYWNA |
| 2026-03-08 | **Strava OAuth bridge** — `strava-callback.html` → HashRouter `#/strava/callback` | GitHub Pages + HashRouter = Strava nie może redirectować na hash URL | AKTYWNA |
| 2026-03-08 | **Firestore composite indexes** — userId ASC + date DESC na workouts, measurements, strava_activities | Zapytania z `where('userId')` + `orderBy('date')` | AKTYWNA |
| 2026-03-08 | **Firestore security rules** — użytkownicy czytają/piszą tylko swoje dane, admin read all | Bezpieczeństwo danych multi-user | AKTYWNA |

### v3.1.0 (2026-02-23)

| Data | Decyzja | Kontekst | Status |
|------|---------|----------|--------|
| 2026-02-23 | **Strict TypeScript** — `strict: true` w tsconfig.app.json, zero błędów | Jakość — strictNullChecks, noImplicitAny | AKTYWNA |
| 2026-02-23 | **Testy Vitest** — 25 testów dla exercise-utils i trainingPlan | Pokrycie kluczowych utility functions | AKTYWNA |
| 2026-02-23 | **exercise-utils.ts** — wyciągnięto parseSetCount, createEmptySets, sanitizeSets z ExerciseCard | Testowalność — utility w oddzielnym pliku | AKTYWNA |
| 2026-02-23 | **Strona Postępy** — wykresy recharts: progresja ciężarów + pomiary ciała | Wizualizacja progresu treningowego | AKTYWNA |
| 2026-02-23 | **RestTimer w WorkoutDay** — circular progress, presety, wibracja | Timer dostępny w trakcie treningu (manualne uruchomienie) | AKTYWNA |
| 2026-02-23 | **Dark mode** — ThemeProvider (next-themes) + toggle Sun/Moon | CSS variables, class strategy | AKTYWNA |
| 2026-02-23 | **Error Boundary** — class component owijający App | Fallback UI zamiast białej strony | AKTYWNA |
| 2026-02-23 | **Dashboard: bieżący tydzień** — getThisWeekDates() zamiast getLatestWorkout() | Plan tygodnia nie pokazywał starych treningów | AKTYWNA |
| 2026-02-23 | **Firebase config do .env** — credentials przeniesione do VITE_* | Bezpieczeństwo — klucze poza źródłami | AKTYWNA |
| 2026-02-23 | **React.memo na ExerciseCard** — zapobiega re-renderom | Skakanie UI przy auto-save | AKTYWNA |
| 2026-02-23 | **Debounce 500ms** (wcześniej 300ms) — mniej zapisów do Firebase | Rzadsze zapisy, mniej onSnapshot callbacks | AKTYWNA |
| 2026-02-23 | **Podpowiedź poprzedniego ciężaru** — "Poprzednio: 8×40kg" | User nie musi pamiętać ciężarów | AKTYWNA |

### v3.0.0 (2026-01-28)

| Data | Decyzja | Kontekst | Status |
|------|---------|----------|--------|
| 2026-01-28 | **Seria rozgrzewkowa (warmup)** — pierwsza seria, pomarańczowa, ikona płomienia | Oddzielenie rozgrzewki od serii roboczych | AKTYWNA |
| 2026-01-28 | **Notatki do ćwiczeń** — opcjonalne pole tekstowe pod seriami | Zapisywanie odczuć, uwag technicznych | AKTYWNA |
| 2026-01-28 | **Tryb edycji bez auto-save** — `handleSetsChangeLocal` modyfikuje tylko lokalny state | Auto-save powodował "mryganie" UI | AKTYWNA |
| 2026-01-28 | **Parametr `?date=` w URL** — wszystkie nawigacje do workout przekazują datę | Bez tego kliknięcie na przeszły trening pokazywało dzisiejszą datę | AKTYWNA |
| 2026-01-28 | **Plan tygodniowy od bieżącego poniedziałku** | Wcześniej pokazywał następny tydzień | AKTYWNA |
| 2026-01-28 | **Przycisk "Zapisz zmiany" statyczny** — nie fixed | Fixed button skakał na mobile przy klawiaturze | AKTYWNA |

---

## DECYZJE ARCHITEKTONICZNE

| Data | Decyzja | Kontekst | Status |
|------|---------|----------|--------|
| 2026-01 | **HashRouter zamiast BrowserRouter** | GitHub Pages nie obsługuje server-side routing | AKTYWNA |
| 2026-01 | **Firebase Firestore** | Real-time sync, Google Auth, darmowy tier | AKTYWNA |
| 2026-01 | **Multi-email whitelist** | VITE_ALLOWED_EMAILS (comma-separated) | AKTYWNA |
| 2026-01 | **Sanityzacja danych przed Firebase** | Firebase nie akceptuje `undefined` | AKTYWNA |
| 2026-02 | **OpenAI API client-side** | VITE_OPENAI_API_KEY, bezpośrednie wywołania | AKTYWNA |
| 2026-03 | **Strava OAuth server-side** | Firebase Cloud Functions (callable) | AKTYWNA |
| 2026-03 | **Per-user data isolation** | Firestore security rules + composite indexes | AKTYWNA |
| 2026-03 | **AI plan duration (8-16 weeks)** | AI decyduje na podstawie celu/doświadczenia | AKTYWNA |

---

## ODRZUCONE OPCJE

| Data | Opcja | Powód odrzucenia |
|------|-------|------------------|
| 2026-01-28 | Auto-save w trybie edycji | "Mryganie" i zbędne zapisy Firebase |
| 2026-01-28 | Fixed button na dole (tryb edycji) | Skakał przy klawiaturze na mobile |
| 2026-01 | LocalStorage zamiast Firebase | Brak sync między urządzeniami |
| 2026-01 | BrowserRouter | Nie działa na GitHub Pages |
| 2026-03 | Strava OAuth client-side | Wymaga server-side dla token exchange |
| 2026-03 | Natychmiastowy zapis planu z onboardingu | Użytkownik nie mógł zweryfikować/zamienić ćwiczeń |
| 2026-03 | 30 dni lookback Strava (pierwszy sync) | Za mało aktywności widocznych dla nowych użytkowników |

---

## KONTEKST TECHNICZNY (dla przyszłych sesji)

### Handlery w WorkoutDay.tsx
- `handleSetsChange` → aktywny trening, AUTO-SAVE z debounce 500ms
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
navigate(`/workout/${dayId}?date=${targetDate}`)
const [searchParams] = useSearchParams();
const targetDate = searchParams.get('date') || today;
```

### Znajdowanie bieżącego poniedziałku
```typescript
const dayOfWeek = start.getDay();
const daysSinceMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
start.setDate(start.getDate() - daysSinceMonday);
```

### Onboarding detection
```typescript
// UserContext.tsx
const workoutsSnap = await getDocs(
  query(collection(db, 'workouts'), where('userId', '==', user.uid), limit(1))
);
const isExistingUser = !workoutsSnap.empty;
// isExistingUser → auto onboardingCompleted: true
```

### Plan expiration
```typescript
// useTrainingPlan.ts
const currentWeek = Math.floor((now - startDate) / (7 * 24 * 60 * 60 * 1000)) + 1;
const isPlanExpired = currentWeek > planDurationWeeks;
```
