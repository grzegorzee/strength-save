# Status: naprawa IAP → submisja do App Review

> Utworzono 2026-06-24. Praca diagnostyczna + buildy: 2026-06-18.
> Cel: natywne zakupy iOS (RevenueCat) działają na realnym urządzeniu — paywall pokazuje
> pakiety roczny + miesięczny z cenami z App Store, zakup w sandbox kończy się PRO.

---

## ROOT CAUSE (potwierdzony, z dowodem na każdej warstwie)

Pusty paywall (`getOfferings()` → `code=23`, brak pakietów) to **NIE bug w kodzie ani błąd
konfiguracji**. To wbudowane zachowanie Apple: **pierwsza subskrypcja w nowej aplikacji musi
przejść App Review razem z buildem, zanim StoreKit zacznie serwować produkty** — także w
sandbox/TestFlight.

Dowód z urządzenia (build 40, diagnostyka na ekranie):
```
cfg=true THROW code=23 ... You have configured the SDK with an App Store API key,
but there are no App Store products registered in the RevenueCat dashboard for your offerings.
```
Komunikat mylący — produkty SĄ w offeringu. Faktyczna porażka: SDK dostaje z RC poprawne
identyfikatory, próbuje pobrać je ze StoreKit po ceny, StoreKit zwraca 0 → RC odrzuca puste
pakiety → code=23.

**Wszystkie warstwy konfiguracji zweryfikowane jako poprawne (zielone):**
- Klucz `appl_TfXz...` w buildzie iOS; `configure()`/`getOfferings()` kod OK (`cfg=true`).
- RC backend odpytany kluczem z builda + `X-Platform: ios` zwraca offering `default` z
  `strengthsave_pro_monthly` + `strengthsave_pro_yearly` (klucz mapuje na właściwy app).
- ASC: oba produkty `READY_TO_SUBMIT`, 175 cen, intro offers, review screenshot, lokalizacje pl+en.
- RC: App Store products podpięte do `$rc_monthly`/`$rc_annual`, offering `default` is_current.
- Paid Apps Agreement **Active** (Jun 11 2026 – Jun 5 2027), Bank/Tax/DSA Active.
- Bundle `com.grzegorzjasionowicz.strengthsave` zgodny build↔ASC↔RC.
- App: `PREPARE_FOR_SUBMISSION`, **nigdy nie wysłana do review** (`reviewSubmissions` puste) ← przyczyna.

**Jedyna droga do DONE:** wysłać apkę 1.0 z dołączonymi obiema subskrypcjami do App Review.
Po wejściu w review/approval StoreKit zaczyna serwować produkty (i tak konieczne, by je sprzedawać).

---

## DANE REFERENCYJNE

| Co | Wartość |
|----|---------|
| App ID (ASC) | `6777446137` |
| Bundle | `com.grzegorzjasionowicz.strengthsave` |
| ASC version | 1.0, id `8a088f55-9eb7-4abf-ad56-ba8fcef8cec9`, state `PREPARE_FOR_SUBMISSION` |
| Subskrypcje | `strengthsave_pro_monthly`, `strengthsave_pro_yearly` (READY_TO_SUBMIT) |
| Grupa subskrypcji | "Strength Save PRO", id `22150355` |
| RevenueCat | projekt `proj67cb081f`, App Store app `app04502c737f`, offering `default` `ofrngf3279a7f4f`, entitlement `pro` |
| Klucze ASC API | KEY_ID `UD43687FB9`, ISSUER `c7dc0c6f-bae0-43ee-a96c-fbb0eabab7b9`, p8: `~/FIRMA/_secrets/oauth/AuthKey_UD43687FB9.p8` |
| RC secret key | `.env` → `STRENGTHSAVE_REVENUECAT_SECRET_KEY` (to klucz **v2** `sk_...`; promotional grant wymaga v1 — niedostępny) |
| Webhook auth | `.env` → `STRENGTHSAVE_REVENUECAT_WEBHOOK_AUTH` |
| Skrypty | `scripts/asc_subscriptions.py` (status), `scripts/asc_api.py` (builds; ENV: ASC_KEY_ID/ASC_ISSUER_ID/ASC_KEY_PATH), `scripts/release-ios.sh "co testować"` |

**Konto demo dla recenzenta** (Auth utworzone, profil+PRO NIE — czeka na service account):
- Login: `applereview@strengthsave.app`
- Hasło: `Demo-Apple-2026-StrengthSave`
- uid: `demoAppleReviewStrengthSave01`
- Profil docelowy (Firestore `users/{uid}`): `access.enabled=true`, `status=active`,
  `onboardingCompleted=true`, `subscription={tier:'comp', status:'active', expiresAt:null}`.

---

## ZROBIONE ✅

1. **Root cause zdiagnozowany** (systematic-debugging, dowód warstwa po warstwie — wyżej).
2. **Build 40** (diagnostyka pustych offerings na ekranie paywalla) → TestFlight → potwierdził
   `code=23` na realnym urządzeniu.
3. **Build 41** (czysty, diagnostyka usunięta) → TestFlight, **VALID**. Kandydat do App Review.
   - Diagnostyka cofnięta w `src/pages/Paywall.tsx` (git diff czysty względem oryginału przed build 40).
4. **Cena apki = Free** (appPriceSchedule, USA base, free price point). ASC API POST.
5. **Metadane bazowe** (ASC API, en-US — listing tylko angielski wg decyzji):
   - Primary category: `HEALTH_AND_FITNESS`
   - Privacy Policy URL: `https://strengthsave.app/legal/privacy.html` (żyje, 200)
   - Support/Marketing URL: `https://strengthsave.app/` (żyje, 200)
6. **Konto demo (Auth)** utworzone przez `firebase auth:import` (BCRYPT, base64-encoded hash,
   emailVerified=true). Logowanie zweryfikowane (signInWithPassword → uid OK).
7. **Decyzje usera:** konto demo z PRO (comp); listing tylko en-US.

---

## DO ZROBIENIA ⬜

### BLOKERY (czeka na usera)
- [ ] **Service account Firebase** — `grzegorzee@gmail.com` ma dostęp Firebase-level (Auth), ale
      BRAK roli GCP IAM (datastore) na `fittracker-workouts` → nie da się zapisać Firestore żadną
      automatyczną drogą (ADC 403, token CLI 403, webhook wymaga istniejącego profilu, syncUserProfile
      dla provider=password daje access=false). Potrzebny klucz:
      Firebase Console → fittracker-workouts → ⚙️ Project Settings → Service accounts →
      Generate new private key → zapisz jako `~/FIRMA/_secrets/oauth/fittracker-adminsdk.json`.
- [ ] **Dane kontaktowe recenzenta** (widzi tylko Apple): imię, nazwisko, email, telefon (+48...).
- [ ] **Akceptacja copy** (draft niżej).

### PO ODBLOKOWANIU
- [ ] **Konto demo PRO** (task #4): skryptem admin (firebase-admin + service account) ustawić
      `users/demoAppleReviewStrengthSave01` na profil docelowy (wyżej) + opcjonalnie przykładowy
      plan/treningi, żeby apka wyglądała "żywo" dla recenzenta.
- [ ] **Copy en-US** (task #2): po akceptacji PATCH do `appStoreVersionLocalizations`
      (description, keywords, subtitle, promotionalText).
- [ ] **Screenshoty en-US** (task #3): iPhone 6.9" (1320×2868) min. 1–3 (zalecane 3–5) z symulatora,
      zalogowany na demo PRO z danymi. Upload do `appScreenshotSet` wersji 1.0.
- [ ] **Dane recenzenta** (task #5): PATCH `appStoreReviewDetail` (kontakt) + review notes:
      konto demo applereview@... / hasło, "PRO already granted (complimentary)", info że to
      pierwsza subskrypcja i StoreKit serwuje produkty w review.
- [ ] **Dołączyć build 41 do wersji 1.0** (task #6 dokończenie): build VALID, dołączyć przez ASC API.
- [ ] **Dołączyć subskrypcje + wysłka** (task #7): obie subskrypcje do submisji wersji 1.0,
      utworzyć reviewSubmission, wysłać do App Review.
- [ ] Po wejściu w review/approval: **test na realnym urządzeniu** — paywall pokazuje pakiety
      z cenami, zakup w sandbox → entitlement `pro` → dashboard. To jest DONE.

---

## DRAFT COPY en-US (do akceptacji)

- **Subtitle** (≤30): `Lifting tracker & planner`
- **Keywords** (≤100): `gym,workout,strength,lifting,weights,training,tracker,sets,reps,progress,muscle,exercise,PR,plan`
- **Promotional text**: `Plan your lifts, log every set, and watch your strength climb. Now with Apple Watch and AI coaching.`
- **Description**:
```
Strength Save is a focused tracker for people who lift. Build your plan, log every
set in the gym, and see your progress in clear charts and personal records.

WHAT YOU GET
- Custom training plans: build your own routine with a simple plan builder, 2-5
  sessions per week, any length.
- Fast set logging: weight, reps and notes for every working set, with a built-in
  rest timer and warmup helper.
- Real analytics: progress charts, personal records, training load and muscle
  heatmaps so you know what is actually moving.
- AI coach: ask about your training, get plan suggestions and analysis of your
  sessions.
- Apple Watch: start a session and track heart rate straight from your wrist.
- Strava sync: bring your runs and rides in alongside your strength work.

STRENGTH SAVE PRO
A subscription unlocks unlimited plans, the AI coach, full analytics and Apple
Watch. Monthly and yearly options with a free trial. Subscriptions renew
automatically unless cancelled at least 24 hours before the end of the period;
manage or cancel anytime in your App Store account.

Terms: https://strengthsave.app/legal/terms.html
Privacy: https://strengthsave.app/legal/privacy.html
```

---

## PUŁAPKI Z TEJ SESJI (dla przyszłego agenta)
- Test IAP rozstrzyga TYLKO realne urządzenie przez TestFlight (symulator nie fetchuje sandbox).
- Diagnostyka na ekranie paywalla > Console.app (screenshot zamiast kabla).
- RC promotional entitlement = API v1 (legacy key); mamy tylko v2 → nie tą drogą.
- `grzegorzee` nie ma GCP IAM na fittracker → service account konieczny do Firestore admin.
- `auth:import` BCRYPT wymaga hasha **base64-encoded** (`base64(bcrypt_mcf)`), inaczej "should be base64 encoded".
- Powłoka: `UID` i `GID` to zmienne read-only (zsh) — używać innych nazw (DUID).
- `rtk` psuje JSON curla i bywa łapany przez safety hook — do ASC/RC REST używać czystego `python3 urllib`.
- Build iOS: `CURRENT_PROJECT_VERSION` = 6 wystąpień, bumpować wszystkie; `scripts/release-ios.sh`.
