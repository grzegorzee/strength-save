# LOG DECYZJI - Strength Save

> Wszystkie ważne decyzje projektowe w jednym miejscu

---

**Data utworzenia:** 2026-01-28
**Ostatnia aktualizacja:** 2026-04-01 (v6.6.0)

---

## DECYZJE

### v6.6.0 (2026-04-01)

| Data | Decyzja | Kontekst | Status |
|------|---------|----------|--------|
| 2026-04-01 | **One-Click Autostart** — `?autostart=true` query param + useEffect auto-start + scrollIntoView | Użytkownik musiał kliknąć 2-3 razy żeby rozpocząć trening (Dashboard → WorkoutDay → "Rozpocznij"). Teraz jedno kliknięcie z Dashboard startuje sesję i scrolluje do pierwszego ćwiczenia. `autostartDone` ref zapobiega podwójnemu odpaleniu. | AKTYWNA |
| 2026-04-01 | **Pre-fill z progresją** — `createPrefilledSets()` w exercise-utils.ts, wywoływane przy tworzeniu nowej sesji | Sety startowały od 0/0 mimo że mamy dane z poprzedniego treningu. Teraz kopiuje reps + weight + increment z getProgressionAdvice (+2.5kg compound, +1kg isolation). completed=false — user potwierdza ✓. Fallback do createEmptySets() przy braku historii. | AKTYWNA |
| 2026-04-01 | **Skip exercise = tylko na dziś** — `skippedExercises?: string[]` w WorkoutSession, NIE modyfikuje planu | User chciał pomijać ćwiczenia bez wpływu na plan. skippedExercises zapisywane w Firebase per-sesja. Ćwiczenie filtrowane w aktywnym widoku, widoczne z badge "Pominięte" w podsumowaniu. | AKTYWNA |
| 2026-04-01 | **Dynamiczne serie** — handleAddSet/handleRemoveSet w ExerciseCard, max 10, min 1 | Stała liczba serii (z planu) nie pozwalała na elastyczność. Nowa seria kopiuje dane z ostatniej. Firebase już przechowuje dynamiczną tablicę SetData[], więc brak zmian modelu. | AKTYWNA |

### v6.5.0 (2026-03-24)

| Data | Decyzja | Kontekst | Status |
|------|---------|----------|--------|
| 2026-03-24 | **Plan Cycles w osobnej kolekcji** — `plan_cycles/{autoId}` zamiast subcollection pod `training_plans` | Niezależne query, prostsze indeksy, brak limitu zagnieżdżenia. Każdy cykl ma pełny snapshot planu + statystyki. | AKTYWNA |
| 2026-03-24 | **Archiwizacja przy tworzeniu nowego planu** — `archiveCurrentPlan()` przed `savePlan()` | `training_plans/{userId}` przechowuje tylko JEDEN aktywny plan (setDoc nadpisuje). Archiwizacja zapobiega utracie historii. | AKTYWNA |
| 2026-03-24 | **Stats obliczane przy archiwizacji** — snapshot statystyk (tonaż, PRy, frekwencja) w dokumencie cyklu | Unikamy kosztownych retrospektywnych query. Stats frozen at cycle end. | AKTYWNA |
| 2026-03-24 | **generatePlanFromCycle** — osobna funkcja AI z kontekstem starego planu + PRów | AI dostaje pełny kontekst progresji: stary plan JSON, rekordy, frekwencję. Generuje plan z progresją. | AKTYWNA |
| 2026-03-24 | **Żółty banner ≤2 tygodnie** — `weeksRemaining` w useTrainingPlan, osobny od `isPlanExpired` | Proaktywne przypomnienie zamiast reaktywnego "plan się skończył". User ma czas zaplanować nowy cykl. | AKTYWNA |
| 2026-03-24 | **Share z photo — FileReader + brightness filter** — zdjęcie jako tło z `filter: brightness(0.4)` | Nie uploadujemy zdjęcia nigdzie — base64 w pamięci, renderowane przez html2canvas-pro. Prywatność preserved. | AKTYWNA |
| 2026-03-24 | **cycleId opcjonalne w WorkoutSession** — backward compatible, stare workouty bez cycleId | Brak migration wymagana. Nowe workouty dostają cycleId, stare działają bez zmian. | AKTYWNA |

### v6.4.1 (2026-03-17)

| Data | Decyzja | Kontekst | Status |
|------|---------|----------|--------|
| 2026-03-17 | **savePlan zachowuje startDate/durationWeeks** — always-include zamiast optional spread | `setDoc` nadpisywał cały dokument, kasując metadata planu przy każdej edycji ćwiczenia. Dashboard pokazywał "Tydzień 1/12" zamiast prawidłowego tygodnia. | AKTYWNA |
| 2026-03-17 | **Auto-repair missing startDate** — query earliest workout → Monday → updateDoc | One-time self-healing: jeśli plan nie ma startDate, odtwarza go z historii treningów. Zapobiega konieczności ręcznej naprawy w Firebase. | AKTYWNA |

### v6.4.0 (2026-03-13)

| Data | Decyzja | Kontekst | Status |
|------|---------|----------|--------|
| 2026-03-13 | **Streaming AI Chat (SSE)** — streamOpenAI onRequest + callOpenAIStream na froncie | Token-by-token UX zamiast czekania na pełną odpowiedź. onRequest zamiast onCall bo onCall nie wspiera SSE. | AKTYWNA |
| 2026-03-13 | **Per-user chat w Firestore** — chat_messages collection z userId isolation | Zastępuje localStorage (max 50 msg, ginęły po wylogowaniu) i legacy chat_conversations (brak per-user isolation). One-time migration z localStorage. | AKTYWNA |
| 2026-03-13 | **$5/user/miesiąc AI limit** — ai_usage/{userId_YYYY-MM} z FieldValue.increment() | Ochrona przed nadużyciami. Atomowe inkrementy (concurrent-safe). checkUsageLimit() przed każdym callem. | AKTYWNA |
| 2026-03-13 | **Cost tracking we wszystkich AI functions** — proxyOpenAI, generateWeeklySummary, streamOpenAI | Pełny obraz kosztów per user. Admin widzi global + per-user. | AKTYWNA |
| 2026-03-13 | **Manual auth w streamOpenAI** — Authorization: Bearer {idToken} zamiast onCall auth | onRequest nie ma wbudowanego auth jak onCall. verifyIdToken() ręcznie. | AKTYWNA |
| 2026-03-13 | **chat_conversations DEPRECATED** — zakomentowane w firestore.rules | Zastąpione przez chat_messages z per-user isolation. Legacy collection. | AKTYWNA |

### v6.3.0 (2026-03-12)

| Data | Decyzja | Kontekst | Status |
|------|---------|----------|--------|
| 2026-03-12 | **Resend zamiast SendGrid** — Weekly Digest używa Resend API | User wybrał Resend, prostsze API, darmowy tier wystarczający | AKTYWNA |
| 2026-03-12 | **Auto-detect emaili z Firebase Auth** — `listUsers()` zamiast hardcoded secret | Digest wysyłany do każdego użytkownika z kontem, bez ręcznej konfiguracji | AKTYWNA |
| 2026-03-12 | **Per-user digest** — osobne query workouts + strava per userId | Każdy user dostaje swoje statystyki, nie globalne | AKTYWNA |
| 2026-03-12 | **Kompaktowe karty Strava w TrainingPlan** — inline rows zamiast pełnych StravaActivityCard | Na mobile pełne karty zajmowały za dużo miejsca, rozjeżdżały layout | AKTYWNA |
| 2026-03-12 | **Grupowanie po dacie w timeline** — Strava + trening z tego samego dnia razem | Czystszy layout, data wyświetlana raz, elementy logicznie powiązane | AKTYWNA |

### v6.1.0 (2026-03-11)

| Data | Decyzja | Kontekst | Status |
|------|---------|----------|--------|
| 2026-03-11 | **Exercise Timeline z Recharts** — LineChart (est. 1RM primary + max weight dashed) | Wizualizacja progresji per ćwiczenie, reuse calculate1RM z pr-utils | AKTYWNA |
| 2026-03-11 | **Plateau detection** — brak progresu max weight w ostatnich N sesjach | Prosta heurystyka (domyślnie 4 sesje), alert w dialogu | AKTYWNA |
| 2026-03-11 | **Smart Rest Timer (intensity-based)** — czas odpoczynku zależy od typu ćwiczenia i % 1RM | Compound 90s base, isolation 60s, +30s >80% 1RM, +60s >90% 1RM. Superset first 15s, non-first 60s | AKTYWNA |
| 2026-03-11 | **lookupExerciseType** — lookup compound/isolation z exerciseLibrary | Reuse istniejącej biblioteki, fallback 'compound' dla nieznanych | AKTYWNA |
| 2026-03-11 | **Warmup Routine UI z timerami** — checklist + inline 30s countdown | Dane z warmupStretching.ts (już istniały), focus-based stretching | AKTYWNA |
| 2026-03-11 | **Training Heatmap (GitHub-style)** — grid 53×7 z 5 poziomami intensywności | Łączy workouts + Strava w jedną wizualizację, year selector | AKTYWNA |
| 2026-03-11 | **Share Workout via html2canvas-pro** — generowanie PNG 540×960 (IG story) | Ciemny gradient, stats grid, lista ćwiczeń, navigator.share + download fallback | AKTYWNA |
| 2026-03-11 | **Race Predictor (Riegel formula)** — T2 = T1 × (D2/D1)^1.06 | Predykcje 5K/10K/HM/Marathon z najlepszego effort w Strava | AKTYWNA |
| 2026-03-11 | **Training Load (TRIMP/Banister)** — CTL 42d EWMA, ATL 7d EWMA, TSB = CTL - ATL | Wymaga aktywności z HR, default restHR=60, maxHR z connection | AKTYWNA |
| 2026-03-11 | **Weekly Digest (Cloud Function)** — onSchedule Monday 08:00 Warsaw | HTML email inline CSS, stats grid + Strava highlights, per-user | AKTYWNA |
| 2026-03-11 | **escapeHtml w share-utils** — XSS protection przy innerHTML | Pre-commit hook złapał innerHTML bez sanityzacji, dodano escapeHtml() | AKTYWNA |

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
| 2026-03 | **SSE streaming via onRequest** | onCall nie wspiera streaming, onRequest + manual Bearer auth | AKTYWNA |
| 2026-03 | **AI cost tracking per-user per-month** | FieldValue.increment() atomowe, $5 limit, ai_usage collection |
| 2026-03 | **Plan Cycles (osobna kolekcja)** | plan_cycles/{autoId} z snapshot planu + stats, archiwizacja przy nowym planie |
| 2026-03 | **Photo share (client-side only)** | FileReader base64, brightness filter, html2canvas-pro, zero upload | AKTYWNA |

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
