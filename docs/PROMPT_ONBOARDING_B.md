# PROMPT: Przebudowa funnelu onboardingu (wariant B) — Strength Save

> Skopiuj całość jako pierwszą wiadomość dla świeżego agenta w `~/FIRMA/projekty/strength_save`.

---

**Wiadomość startowa dla agenta (krótka, mieści się w limicie /goal 4000 znaków) — wklej TO, resztę agent doczyta z tego pliku:**

```
/goal Wykonane w całości zadanie z docs/PROMPT_ONBOARDING_B.md (przeczytaj ten plik NAJPIERW): funnel onboardingu iOS w wariancie B — quiz → teaser "Twój plan jest gotowy" → hard paywall bez wyjścia → trial → dashboard; świeży user bez PRO nie widzi żadnego ekranu poza paywallem; testy unit + E2E ze screenshotami zielone; wdrożone web + build 38 na TestFlight (Beta App Review); DECYZJE.md i PLAN_RELEASE_1.0.md zaktualizowane. Użyj /loop i pracuj aż dowiezione, bez pytań o pozwolenie przy odwracalnych krokach.
```

---

Pracujesz w projekcie Strength Save (`/Users/grzegorzjasionowicz/FIRMA/projekty/strength_save`). Przeczytaj najpierw: lokalny `CLAUDE.md` (zasady pracy, checklist wdrożenia), `docs/PLAN_RELEASE_1.0.md` (plan release, sekcje 6-7), `DECYZJE.md` wpisy z 2026-06-11 cz. 10-11 (monetyzacja). Stack: React 18 + TS + Vite + Firebase + Capacitor iOS. Pełne i18n PL/EN (`src/i18n/locales/pl.ts` + `en.ts`, każdy klucz w OBU plikach, inaczej typecheck padnie).

## ZADANIE

Przebuduj funnel onboardingu nowego użytkownika na iOS według wariantu B (wzór Fitbod/Calm): quiz → teaser "Twój plan jest gotowy" → hard paywall bez wyjścia → zakup/trial → odsłonięcie planu i wejście do apki. Po wszystkim: testy, commit, push, deploy web, deploy functions (jeśli dotkniesz), build iOS 38 na TestFlight (`scripts/release-ios.sh`, wcześniej bump CURRENT_PROJECT_VERSION: 6 wystąpień w `ios/App/App.xcodeproj/project.pbxproj`).

## STAN OBECNY (build 37, wszystko działa, NIE psuj)

- Monetyzacja gotowa: RevenueCat SDK (`src/lib/purchases.ts`, logIn/logOut w `useAuth`), hook `useSubscription` + `useRequiresPaywall` (`src/hooks/useSubscription.ts`; paywall TYLKO na natywnym iOS), paywall `/paywall` (`src/pages/Paywall.tsx`; ceny z RC Offerings, triale 14/30 dni, restore, nota o odnowieniu, linki legal), webhook RC → `users/{uid}.subscription` (wdrożony).
- Produkty ASC: `strengthsave_pro_monthly` (14,99 zł / $4.99, trial 14 dni), `strengthsave_pro_yearly` (99,99 zł / $29.99, trial 30 dni), stan READY_TO_SUBMIT. NIE ruszaj ASC ani konfiguracji RevenueCat.
- Obecny flow: rejestracja (bez invite na mobile) → weryfikacja email → `src/pages/Onboarding.tsx` (wrapper na `src/components/PlanWizard.tsx`: welcome → baseline → objective → protocol → precision → szablon/builder) → `completeOnboardingPlan` zapisuje plan + `onboardingCompleted: true` → navigate na `/paywall` (gdy `useRequiresPaywall`) → dashboard.
- Bramki dziś: TYLKO akcje (start treningu w `WorkoutDay.handleStartWorkout`, kreator w `NewPlan`, baner `ProUpsellBanner` na Dashboardzie).
- Routing: `src/App.tsx` (drzewo isNewUser vs reszta; `isNewUser` z `UserContext` = active + !onboardingCompleted). Paywall i /new-plan są pełnoekranowe (`Layout.tsx` isFullScreenFlow).

## PROBLEM DO ROZWIĄZANIA (feedback usera z realnego testu)

1. Z paywalla można wyjść strzałką wstecz i "używać" apki (przeglądanie wszystkiego), bo gating łapie tylko akcje. Świeży user bez trialu nie powinien widzieć apki W OGÓLE.
2. Nikt nie uprzedza usera na początku, że apka jest płatna (trial) — paywall na końcu wygląda jak bait-and-switch.
3. Paywall to suchy cennik, nie wykorzystuje momentu "właśnie ułożyłem Ci plan".

## DOCELOWY FLOW (wariant B)

1. **Rejestracja/logowanie**: bez zmian.
2. **Wizard (quiz)**: kroki PlanWizard zostają (NIE przebudowuj logiki układania planu). Zmiana: na ekranie Welcome dyskretna linijka zapowiedzi, np. PL: "Najpierw ułożymy Twój plan. Potem 30 dni testujesz za darmo." (klucz i18n, EN analogicznie).
3. **Zapis planu**: jak dziś, od razu po zatwierdzeniu w wizardzie (`completeOnboardingPlan` + `onboardingCompleted`). Celowo PRZED paywallem: ułożony plan nie może przepaść, jeśli user zamknie apkę na paywallu.
4. **NOWY ekran teaser "Twój plan jest gotowy"** (pełnoekranowy, między wizardem a paywallem albo jako górna sekcja paywalla — decyzja wykonawcza Twoja): nazwa/typ planu, dni/tydzień, czas trwania (dane z zatwierdzonego wyboru), lista dni z ćwiczeniami ZAMGLONYMI (blur/skeleton, bez pełnej treści). CTA: "Odblokuj 30 dni za darmo".
5. **Hard paywall**: jak obecny `/paywall`, ale w trybie onboardingowym BEZ strzałki wstecz; jedyna ucieczka = "Wyloguj" (mały link na dole; signOut). Po udanym zakupie/trialu → dashboard z confetti (`/?welcome=1`).
6. **Route guard (domknięcie dziury)**: natywny iOS + brak PRO (`useRequiresPaywall`) + user NIE ma żadnych ukończonych treningów → każda trasa przekierowuje na `/paywall` (nie tylko akcje). Wyjątki: `/paywall`, ekrany auth/weryfikacji. User z danymi i wygasłym dostępem (expired): zostaje jak dziś read-only + bramki akcji + baner (anty-"data hostage", NIE zmieniaj). Admin i tier `comp` omijają wszystko. Web: ZERO zmian (invite-only, bez paywalla).
7. **Wymogi Apple na paywallu zachowane** (są w obecnym Paywall.tsx): cena+okres, długość trialu, nota o auto-odnowieniu, restore purchases, linki Terms/Privacy. Nie wycinaj.

## OGRANICZENIA

- Zasady z lokalnego CLAUDE.md obowiązują (Karpathy: zmiany chirurgiczne, scenariusz background/resume nie dotyczy tego zadania, ale checklist wdrożenia TAK).
- NIE zmieniaj: cen, produktów ASC, konfiguracji RevenueCat, webhooka, logiki zapisu planów, web-owej ścieżki, reguł Firestore.
- PlanWizard jest współdzielony z `/new-plan` (replan istniejących userów) — zapowiedź trialu i teaser tylko w trybie onboardingu (PlanWizard ma prop `showWelcome`; dodaj analogiczny prop zamiast warunków globalnych).
- E2E (`e2e/`, Playwright, bez emulatora) i unit testy (vitest) muszą przejść; dopisz testy nowej logiki guard (przypadki: świeży user bez PRO → redirect; user z workouts + expired → read-only zostaje; admin/comp → bez redirectu; web → bez zmian). Wzorzec mock auth: `src/lib/e2e-auth.ts`, scenariusze w `e2e/helpers.ts`.
- Weryfikacja wizualna: spec E2E ze screenshotem teaser+paywall (wzór: `e2e/replan.spec.ts`).

## DEFINITION OF DONE

1. `npm run typecheck && npm run lint && npx vitest run` zielone; `npx playwright test` zielone (111+ testów + nowe).
2. Świeży user na iOS NIE jest w stanie zobaczyć apki bez startu trialu (zweryfikowane E2E + opisany scenariusz manualny).
3. Commit + push na main, `npm run deploy` (web), build 38 na TestFlight przez `scripts/release-ios.sh "opis"`.
4. Wpis w `DECYZJE.md` (cz. kolejna, data 2026-06-11/12): co, dlaczego, weryfikacja.
5. Odhaczenie w `docs/PLAN_RELEASE_1.0.md` (dopisz pozycję "funnel B" w tygodniu 1/2).

## KONTEKST OTWARTYCH SPRAW (nie Twoje zadanie, nie blokuj się)

- Test zakupu sandbox czeka na propagację produktów po stronie Apple (godziny od 2026-06-11 ~16:00). Jak w trakcie pracy paywall zacznie zwracać plany na symulatorze/urządzeniu, odnotuj w DECYZJE.md.
- Tydzień 2 planu (PrivacyInfo.xcprivacy, App Check, landing na domenę) robi inna sesja — nie wchodź w to.
