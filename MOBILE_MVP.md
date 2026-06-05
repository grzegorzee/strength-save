# StrengthSave Mobile MVP

Mobilne MVP korzysta z tej samej aplikacji React, Firebase Auth, Firestore i Cloud Functions co wersja webowa. Capacitor opakowuje build webowy w aplikacje Android i iOS.

## Zakres MVP

- rejestracja i logowanie przez email + haslo,
- potwierdzenie konta 6-cyfrowym kodem wysylanym przez Cloud Functions,
- onboarding, plan treningowy i wykonywanie treningu,
- zapis draftu treningu i synchronizacja po odzyskaniu internetu,
- wspolny backend Google Cloud/Firebase dla web, Androida i iOS.

Google Sign-In i Strava nie sa czescia pierwszego mobilnego MVP. W mobilnym WebView wymagaja osobnego natywnego OAuth i deep linkow.

## Konfiguracja Firebase

1. W Firebase Console wybierz projekt `fittracker-workouts`.
2. W `Authentication > Sign-in method` wlacz `Email/Password`.
3. Z konfiguracji aplikacji webowej Firebase uzupelnij plik `.env.mobile.local`:

```bash
cp .env.example .env.mobile.local
```

Wymagane zmienne:

```dotenv
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=fittracker-workouts.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=fittracker-workouts
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
```

Firebase Web SDK dziala wewnatrz aplikacji Capacitor, dlatego MVP nie wymaga jeszcze plikow `google-services.json` ani `GoogleService-Info.plist`.

## Cloud Functions rejestracji

Rejestracja email wymaga wdrozonych funkcji z katalogu `functions/` oraz sekretow Google Cloud Secret Manager:

```bash
firebase functions:secrets:set RESEND_API_KEY --project fittracker-workouts
firebase functions:secrets:set API_KEY_PEPPER --project fittracker-workouts
npm run build --prefix functions
firebase deploy --only functions,firestore:rules,firestore:indexes --project fittracker-workouts
```

`RESEND_API_KEY` wysyla kod weryfikacyjny. `API_KEY_PEPPER` zabezpiecza hash kodu zapisanego w Firestore.

## Uruchomienie

Wymagania lokalne:

- Android SDK 36, Build Tools 36 i Java 21,
- aktualny Xcode oraz zainstalowany runtime iOS 26.5.

Na tym Macu SDK wskazuje `android/local.properties`, a Gradle korzysta z Homebrew `openjdk@21`.

```bash
npm install
npm run mobile:sync
npm run mobile:android
```

Na macOS:

```bash
npm run mobile:ios
```

Po zmianach w React uruchom ponownie `npm run mobile:sync`.

Debug APK zbudujesz poleceniem:

```bash
cd android
./gradlew assembleDebug
```

Plik wynikowy: `android/app/build/outputs/apk/debug/app-debug.apk`.

Przed deployem Functions sprawdz dostep aktualnego konta Firebase CLI:

```bash
firebase projects:list
```

Lista musi zawierac projekt `fittracker-workouts`.

## Kryterium gotowosci

1. Uzytkownik instaluje aplikacje.
2. Rejestruje konto przez email i haslo.
3. Otrzymuje kod email i aktywuje konto.
4. Konczy onboarding.
5. Rozpoczyna trening offline, zamyka aplikacje, wraca i konczy trening bez utraty danych.
