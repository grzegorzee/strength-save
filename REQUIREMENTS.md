# Strength Save — Wymagania i Setup

> Wszystko co potrzebne, żeby uruchomić projekt lokalnie, deployować i rozwiązywać problemy.

---

## WYMAGANIA SYSTEMOWE

| Wymaganie | Wersja | Uwagi |
|-----------|--------|-------|
| **Node.js** | 22.x | Cloud Functions wymagają Node 22 (`functions/package.json` → `engines.node: "22"`) |
| **npm** | 10.x+ | Instalowany z Node.js |
| **Git** | 2.x+ | Repozytorium na GitHub |
| **Firebase CLI** | 13.x+ | Tylko do deploy Cloud Functions i Firestore rules |
| **Przeglądarka** | Chrome/Edge | Google OAuth wymaga nowoczesnej przeglądarki |

**Instalacja Firebase CLI:**
```bash
npm install -g firebase-tools
firebase login
```

---

## ZMIENNE ŚRODOWISKOWE

### Frontend (`.env` w rootcie projektu)

| Zmienna | Opis | Przykład |
|---------|------|---------|
| `VITE_FIREBASE_API_KEY` | Firebase Web API Key | `AIzaSyC...` |
| `VITE_FIREBASE_AUTH_DOMAIN` | Firebase Auth domain | `fittracker-workouts.firebaseapp.com` |
| `VITE_FIREBASE_PROJECT_ID` | Firebase project ID | `fittracker-workouts` |
| `VITE_FIREBASE_STORAGE_BUCKET` | Firebase Storage bucket | `fittracker-workouts.firebasestorage.app` |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | Firebase Messaging sender ID | `283539506094` |
| `VITE_FIREBASE_APP_ID` | Firebase App ID | `1:283539506094:web:...` |
| `VITE_ALLOWED_EMAILS` | Whitelist emaili (comma-separated) | `jan@gmail.com,anna@gmail.com` |
| `VITE_OPENAI_API_KEY` | OpenAI API key (client-side!) | `sk-proj-...` |

### Cloud Functions (`functions/.env`)

| Zmienna | Opis | Przykład |
|---------|------|---------|
| `STRAVA_CLIENT_ID` | Strava OAuth Client ID | `209317` |
| `STRAVA_CLIENT_SECRET` | Strava OAuth Client Secret | `ff12a93e...` |
| `STRAVA_REDIRECT_URI` | Strava OAuth redirect | `https://grzegorzee.github.io/strength-save/strava-callback.html` |

### GitHub Actions Secrets

Secrets konfigurowane w **Settings → Secrets and variables → Actions** w repozytorium GitHub:

| Secret | Odpowiada zmiennej |
|--------|---------------------|
| `VITE_FIREBASE_API_KEY` | `.env` → `VITE_FIREBASE_API_KEY` |
| `VITE_FIREBASE_AUTH_DOMAIN` | `.env` → `VITE_FIREBASE_AUTH_DOMAIN` |
| `VITE_FIREBASE_PROJECT_ID` | `.env` → `VITE_FIREBASE_PROJECT_ID` |
| `VITE_FIREBASE_STORAGE_BUCKET` | `.env` → `VITE_FIREBASE_STORAGE_BUCKET` |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | `.env` → `VITE_FIREBASE_MESSAGING_SENDER_ID` |
| `VITE_FIREBASE_APP_ID` | `.env` → `VITE_FIREBASE_APP_ID` |
| `VITE_ALLOWED_EMAIL` | Legacy (single email) — zachowany dla kompatybilności |
| `VITE_ALLOWED_EMAILS` | `.env` → `VITE_ALLOWED_EMAILS` |
| `VITE_OPENAI_API_KEY` | `.env` → `VITE_OPENAI_API_KEY` |

---

## INSTALACJA I URUCHOMIENIE

### 1. Klonowanie

```bash
git clone https://github.com/grzegorzee/strength-save.git
cd strength-save
```

### 2. Zmienne środowiskowe

```bash
# Skopiuj i uzupełnij .env
cp .env.example .env   # lub stwórz ręcznie wg tabeli powyżej

# Functions
cd functions
cp .env.example .env   # lub stwórz ręcznie wg tabeli powyżej
cd ..
```

### 3. Instalacja zależności

```bash
# Frontend
npm install

# Cloud Functions
cd functions && npm install && cd ..
```

### 4. Uruchomienie lokalne

```bash
# Dev server (port 8080)
npm run dev

# Otwórz http://localhost:8080
```

### 5. Testy

```bash
npm run test          # Jednorazowy run
npm run test:watch    # Watch mode
```

### 6. Build

```bash
npm run build         # Production build → dist/
npm run build:dev     # Development build (source maps)
npm run preview       # Preview production build lokalnie
```

---

## DEPLOY

### Frontend → GitHub Pages

**🔴 KRYTYCZNE:** Sam `git push` na `main` NIE aktualizuje strony live!

Są **dwa niezależne** sposoby deploy:

#### Sposób 1: Ręczny deploy (npm run deploy)

```bash
# Buduje dist/ i pushuje na branch gh-pages
npm run deploy
```

Skrypty w `package.json`:
- `predeploy` → `npm run build` (auto przed deploy)
- `deploy` → `gh-pages -d dist`

#### Sposób 2: GitHub Actions (automatyczny)

Workflow `.github/workflows/deploy.yml` uruchamia się automatycznie na push do `main`:
1. Checkout kodu
2. Setup Node 20 + npm cache
3. `npm ci` (instalacja zależności)
4. `npm run build` z secretami jako env vars
5. Upload do GitHub Pages artifact
6. Deploy na GitHub Pages

**Uwaga:** GitHub Actions używa Node 20 (nie 22) — to wystarczy dla frontendu. Node 22 potrzebny jest tylko dla Cloud Functions.

#### Kiedy co używać?

| Scenariusz | Użyj |
|------------|------|
| Push na `main` → auto deploy | GitHub Actions (dzieje się samo) |
| Szybki deploy bez push | `npm run deploy` |
| Po zmianach w kodzie | `git push` (uruchomi Actions) LUB `npm run deploy` |

### Cloud Functions → Firebase

```bash
cd functions
npm run build
npm run deploy
# lub z roota:
firebase deploy --only functions
```

### Firestore Rules & Indexes

```bash
# Deploy reguł bezpieczeństwa
firebase deploy --only firestore:rules

# Deploy indeksów
firebase deploy --only firestore:indexes

# Oba naraz
firebase deploy --only firestore
```

---

## ZEWNĘTRZNE SERWISY

### Firebase

| Parametr | Wartość |
|----------|---------|
| **Project ID** | `fittracker-workouts` |
| **Console** | https://console.firebase.google.com/project/fittracker-workouts |
| **Region** | `us-central1` (default) |
| **Usługi** | Firestore, Authentication (Google), Cloud Functions |
| **Plan** | Blaze (pay-as-you-go, wymagany dla Cloud Functions) |

### OpenAI API

| Parametr | Wartość |
|----------|---------|
| **Model** | `gpt-5-mini` |
| **Endpoint** | `https://api.openai.com/v1/chat/completions` |
| **Pricing** | $0.25 / 1M input tokens, $2.00 / 1M output tokens |
| **Context window** | 400K tokens |
| **Użycie** | Client-side (key w `VITE_OPENAI_API_KEY`) |
| **Funkcje AI** | Plan generation, AI Coach analysis, Chat, Exercise swap, Workout summary |

**Centralne wywołanie:** `callOpenAI()` w `src/lib/ai-coach.ts` — jedna funkcja dla wszystkich AI features.

### Strava API

| Parametr | Wartość |
|----------|---------|
| **Client ID** | `209317` |
| **OAuth scopes** | `read,activity:read_all` |
| **API version** | v3 |
| **OAuth flow** | Authorization Code (via Cloud Functions) |
| **Redirect URI** | `https://grzegorzee.github.io/strength-save/strava-callback.html` |
| **Approval prompt** | `force` (zawsze pyta o zgodę — zapobiega problemom z ponownym łączeniem) |

**OAuth flow:**
1. Frontend → Cloud Function `stravaAuthUrl` → generuje URL autoryzacji
2. User → Strava → zgoda → redirect na `strava-callback.html` z `?code=...`
3. `strava-callback.html` (bridge) → przekierowuje na `/#/strava/callback?code=...`
4. `StravaCallback.tsx` → Cloud Function `stravaCallback` → wymiana code na tokeny
5. Cloud Function zapisuje tokeny w `users/{uid}` i sync-uje aktywności

---

## FIRESTORE RULES

Pełne reguły w `firestore.rules`:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    function isAdmin() {
      return get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
    }

    // users/{userId} — profil użytkownika
    // - read/create: tylko właściciel
    // - update: właściciel (bez zmiany role)
    // - admin: read/write all

    // workouts/{workoutId} — sesje treningowe
    // - read/write: tylko właściciel (userId field)
    // - admin: read all

    // measurements/{measurementId} — pomiary ciała
    // - read/write: tylko właściciel (userId field)
    // - admin: read all

    // training_plans/{planUserId} — plany treningowe (doc ID = userId)
    // - read/write: tylko właściciel
    // - admin: read/write all

    // strava_activities/{activityId} — aktywności Strava
    // - read: tylko właściciel (userId field)
    // - write: TYLKO Cloud Functions (allow write: if false)
    // - admin: read all

    // chat_conversations/{convId} — rozmowy AI Chat
    // - read/write: dowolny zalogowany user (legacy, brak per-user isolation)
  }
}
```

**Deploy:** `firebase deploy --only firestore:rules`

---

## FIRESTORE INDEXES

Plik `firestore.indexes.json` — 3 composite indexes:

| Kolekcja | Pola | Scope |
|----------|------|-------|
| `workouts` | `userId` ASC + `date` DESC | COLLECTION |
| `measurements` | `userId` ASC + `date` DESC | COLLECTION |
| `strava_activities` | `userId` ASC + `date` DESC | COLLECTION |

**Deploy:** `firebase deploy --only firestore:indexes`

**Bez tych indeksów:** Firestore zwróci błąd przy zapytaniach z `where(userId)` + `orderBy(date)`.

---

## TROUBLESHOOTING

### 1. "Undefined is not valid" przy zapisie do Firebase

**Przyczyna:** Firebase Firestore nie akceptuje wartości `undefined` w dokumentach.

**Rozwiązanie:** Dane muszą być sanityzowane przed zapisem. Sprawdź `sanitizeSets()` w `src/lib/exercise-utils.ts` i `useFirebaseWorkouts.ts`. Użyj `?? 0` zamiast opcjonalnych pól.

### 2. Kliknięcie na trening nie pokazuje danych

**Przyczyna:** Brak parametru `?date=YYYY-MM-DD` w URL nawigacji.

**Rozwiązanie:** Upewnij się, że `navigate()` przekazuje parametr daty: `navigate(\`/workout/${dayId}?date=${date}\`)`.

### 3. Plan pokazuje zły tydzień

**Przyczyna:** Nieprawidłowe obliczenie `currentWeek` w `useTrainingPlan`.

**Rozwiązanie:** Sprawdź `planStartDate` i `planDurationWeeks` w Firebase `training_plans/{userId}`. `currentWeek = Math.floor((now - startDate) / 7 days) + 1`.

### 4. Istniejący user widzi onboarding

**Przyczyna:** `onboardingCompleted` nie zostało ustawione (bug z v5.0).

**Rozwiązanie:** `UserContext.ensureUserDoc()` automatycznie wykrywa istniejących użytkowników (mają workouty) i ustawia `onboardingCompleted: true`. Sprawdź ten mechanizm.

### 5. Strava sync nie zwraca aktywności

**Przyczyna:** Wygasły token, za krótki lookback, brak aktywności w danym okresie.

**Rozwiązanie:**
- Sprawdź logi Cloud Functions w Firebase Console
- Token refresh jest automatyczny (jeśli `expiresAt < now`)
- Minimum 7-dniowy lookback jest wymuszany
- Pierwszy sync: 365 dni lookback

### 6. AI nie generuje planu (timeout/error)

**Przyczyna:** Problem z OpenAI API — rate limit, nieprawidłowy key, zbyt długi prompt.

**Rozwiązanie:**
- Sprawdź `VITE_OPENAI_API_KEY` w `.env`
- AI onboarding ma retry (2 próby)
- Sprawdź czy odpowiedź to poprawny JSON (AI coach parsuje JSON z odpowiedzi)

### 7. Deploy na GitHub Pages nie działa

**Przyczyna:** `npm run deploy` wymaga uprawnień push do repozytorium.

**Rozwiązanie:**
- Upewnij się, że masz push access do `gh-pages` branch
- Sprawdź czy `base: '/strength-save/'` jest w `vite.config.ts`
- Poczekaj ~2 min na propagację GitHub Pages

### 8. Cloud Functions nie deployują się

**Przyczyna:** Brak planu Blaze, zły Node.js, brak Firebase CLI.

**Rozwiązanie:**
```bash
firebase login                    # Zaloguj się
cd functions && npm run build     # Build TS → JS
firebase deploy --only functions  # Deploy
```
Firebase Functions wymagają planu Blaze (pay-as-you-go).

### 9. "Missing index" error w Firestore

**Przyczyna:** Brak composite index dla zapytania.

**Rozwiązanie:**
```bash
firebase deploy --only firestore:indexes
```
Kliknij link z error message — Firebase automatycznie zaproponuje utworzenie indexu.

### 10. PWA nie aktualizuje się

**Przyczyna:** Service worker cache'uje starą wersję.

**Rozwiązanie:** `PWAUpdatePrompt.tsx` pokazuje prompt do aktualizacji. User musi kliknąć "Zaktualizuj". W razie problemów: DevTools → Application → Service Workers → Unregister.

---

## STRUKTURA PROJEKTU (skrócona)

```
strength-save/
├── .env                          # Zmienne środowiskowe (frontend)
├── .github/workflows/deploy.yml  # CI/CD pipeline
├── firebase.json                 # Firebase config
├── firestore.rules               # Firestore security rules
├── firestore.indexes.json        # Firestore composite indexes
├── vite.config.ts                # Vite + PWA + chunk splitting
├── package.json                  # Zależności + skrypty
├── public/                       # Static assets (PWA icons, strava-callback.html)
├── src/                          # Kod źródłowy
│   ├── App.tsx                   # Routing + providerzy
│   ├── components/               # Komponenty React
│   ├── contexts/                 # UserContext
│   ├── data/                     # Plany, biblioteka ćwiczeń
│   ├── hooks/                    # Custom hooks (Firebase, AI, Strava)
│   ├── lib/                      # Logika biznesowa (AI, utils)
│   ├── pages/                    # Strony
│   └── types/                    # TypeScript types
├── functions/                    # Firebase Cloud Functions
│   ├── .env                      # Zmienne środowiskowe (Strava)
│   ├── package.json              # Zależności (firebase-admin, firebase-functions)
│   └── src/index.ts              # stravaAuthUrl, stravaCallback, stravaSync
└── scripts/                      # Skrypty pomocnicze (migracja)
```
