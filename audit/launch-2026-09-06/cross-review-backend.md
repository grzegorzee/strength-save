# Ograniczony adversarial review — backend/zakupy/Health

Reviewer: audit_workout. Zakres wyznaczony przez prowadzącego po domknięciu W1–W9: bieżące zmiany `purchases.ts`, `useSubscription.ts`, `health-bridge.ts` oraz handoff grantu w `useFirebaseWorkouts.batchSaveWorkout`. Brak nowego discovery poza tym zakresem; reviewer nie zmieniał produkcyjnego kodu ownera.

Aktualizacja końcowa ownera backend, 2026-09-07: **CR1–CR4 zamknięte w źródłach**. Poniższe opisy RED zachowują stan z chwili review; statusy końcowe opisują wykonane naprawy i istniejące dowody. Aktualizacja dotyczy wyłącznie tego dokumentu, bez ponownego uruchamiania testów.

## CR1 — kontrakt argumentu grantu — ZAMKNIĘTY

Historia RED:

Pierwsza wersja poprawki przyjmowała w batchSaveWorkout surowy ActiveHealthGrant, ale WorkoutSyncDeps i silnik przekazują `{ healthGrant, healthMode? }`. Runtime wysłałby niezdefiniowane pola grantId/epoch, a typecheck pokazałby niezgodność adaptera. Wskazane ownerowi i prowadzącemu; owner poprawia wrapper oraz test realnego handoffu. Jawne `{healthGrant:null}` musi pozostać null, bez fallbacku na nową zgodę.

Stan końcowy: `src/hooks/useFirebaseWorkouts.ts:856` przyjmuje wrapper `{ healthGrant, healthMode? }`. Adapter bierze grant z obecnego argumentu; fallback na bieżącą zgodę jest możliwy wyłącznie przy braku wrappera. Jawne null pozostaje zapisem bez health. `src/test/workout-save-original-grant.test.ts` przekazuje rzeczywisty wrapper silnika, sprawdza zachowanie starego G1 przy aktywnym G2 i brak grantu po jawnym null: **3/3 PASS** w `final-vitest.log`.

## CR2 / P1 — spóźnione wywołanie Health po zmianie konta lub zgody — ZAMKNIĘTY

Historia RED:

Pierwszy fence chronił promise, który już był w toku przy zmianie ioGeneration, ale `syncPayload` pobierał aktualną generation dopiero przy wywołaniu i nie porównywał UID ze znanym accountOwner. Osiągalne: final A czeka na chmurę -> A wylogowane, B zalogowane -> stary callback finalu woła `syncWorkoutToHealth(A, ..., true)`; nowa generation wygląda aktualnie i zapis przechodzi. Przy tym samym UID revoke G1 -> regrant G2 stary boolean także nie daje dowodu pochodzenia zgody.

Owner potwierdził zmianę publicznego API na captured ActiveHealthGrant|null oraz sprawdzenie uid/accountOwner i grantId/consentScope przed nowym IO oraz retry. Wymagane testy: zmiana nastąpiła PRZED nowym wywołaniem, nie tylko w trakcie bridge promise; G1 nie staje się G2. Call site WorkoutDay i manual cardio należą do ownera tej poprawki.

Stan końcowy: `src/lib/health-bridge.ts:150` sprawdza owner UID i przechwycony grantId przed rozpoczęciem operacji, a następnie generation, owner, grant i aktualne ustawienie przed IO/retry/ACK. API i call sites w `src/pages/WorkoutDay.tsx` oraz `src/hooks/useManualActivities.ts` przekazują ActiveHealthGrant|null. `src/test/health-platform-contract.test.ts`: **12/12 PASS** w `final-vitest.log`, w tym nowe wywołanie ze starego A po przejściu do B, stare G1 po regrant, późny ACK i retry po revoke oraz odroczony odczyt wagi po revoke/A→B. Testy używają mocka natywnego pluginu; nie zastępują testu Health na urządzeniu.

## CR3 / P1 — zewnętrzny timeout nie zwalnia kolejki RevenueCat — ZAMKNIĘTY

Historia RED:

Nowe `sdkQueue` serializuje również getCustomerInfo, configure i login. `useSubscription.refresh` ma zewnętrzny timeout 1500 ms, ale oczekiwany bez końca SDK promise pozostaje głową kolejki. Następne Kup/Przywróć/login B nie dochodzą do SDK; Paywall busy nie ma wyjścia, mimo że bootstrap loading już się skończył. Źródłowy kontrakt timeoutu sprzed zmiany jawnie przewidywał wiszący natywny odczyt.

Wskazane ownerowi: regression hang-read -> refresh timeout -> następna operacja ma recovery; rozwiązanie nie może automatycznie ponawiać zakupu ani skracać użytkownikowi aktywnego sheetu StoreKit. Wyjątki odrzucone przez SDK już zwalniają queue, problem dotyczy nierozwiązanej obietnicy.

Stan końcowy: `src/lib/purchases.ts:129` wykonuje sieciowy odczyt CustomerInfo poza kolejką mutacji, po sprawdzeniu tożsamości, i odrzuca wynik po zmianie UID/generation. Zakup/restore oczekujący na poprzednią mutację ma wyjście `PURCHASES_BUSY_RETRY` po 5 s i nie wykona się późno; rozpoczęty zakup/login pozostaje w kolejce do rzeczywistego zakończenia SDK. `src/test/purchases-identity.test.ts`: **5/5 PASS**, w tym wiszący read → udany zakup → login B oraz timeout oczekującego zakupu bez późnego wykonania. `src/test/use-subscription-bootstrap.test.tsx`: **3/3 PASS**, w tym dostęp do potwierdzonego Firestore PRO przy wiszącym RC, zakończenie pending bez nadania PRO i izolacja kont. Wyniki w `final-vitest.log`. Testy nie poświadczają rzeczywistego zakupu w StoreKit/Google Play sandbox.

## CR4 / P2 — auth bootstrap fallback nie publikuje tożsamości RevenueCat — ZAMKNIĘTY

Historia RED:

`useAuth` po AUTH_BOOT_TIMEOUT_MS akceptuje `auth.currentUser` i pokazuje aplikację, lecz fallback nie woła logInPurchases. Gdy listener SDK nadal milczy, requestedUserId pozostaje undefined, a każda operacja nowego wrappera kończy się PURCHASES_IDENTITY_NOT_READY. Wskazane ownerowi; fallback potwierdzonej tożsamości Firebase powinien publikować tę samą intencję co normalny listener.

Stan końcowy: `src/hooks/useAuth.ts:72` wywołuje `logInPurchases(cachedFirebaseUser.uid)` w fallbacku przed publikacją użytkownika, tak samo jak normalny listener. Brak użytkownika Firebase nadal pozostawia bramkę auth. `src/test/use-auth-theme-owner.test.tsx`: **3/3 PASS** w `final-vitest.log`, obejmujące fallback po 3 s i późniejsze uzgodnienie listenera. Granica dowodu: ten test mockuje Purchases i nie ma osobnej asercji wywołania logInPurchases; samą obecność i kolejność tego wywołania potwierdzono przeglądem końcowego źródła. Nie pozostaje otwarta poprawka kodu CR4.

Pozostała ocena: UID/version w stanie React `useSubscription` prawidłowo odrzuca spóźnione RC wyniki starego konta. `UserContext` publikuje profil tylko dla bieżącego UID, więc stare Firestore entitlement nie przecieka przez ten fallback. Native Health false acknowledgement jest sprawdzany jawnie (`ok === true`), a grant null powinien pozostać base-only retry.

## Istniejąca końcowa weryfikacja integracji

- `final-vitest.log`: **4084 PASS, 16 skipped; 470 plików PASS**, zawiera wymienione wyżej testy CR.
- `final-functions.log`: **549 PASS**, 15 testów przeznaczonych do emulatora pominiętych w biegu jednostkowym; `final-functions-emulator.log`: te testy osobno **15/15 PASS**.
- `final-e2e-emulator.log`: **18/18 PASS, 1,3 min, exit 0** po końcowych zmianach rozgrzewki, na realnych lokalnych Auth/Firestore Rules/Functions. To potwierdzenie integracji backendu i przepływów aplikacji; natywne kontrakty zakupów/Health mają osobne dowody i ograniczenia opisane przy CR2/CR3.

Logi znajdują się obok tego dokumentu. W ramach zamknięcia review nie uruchamiano emulatorów ani nowych testów i nie zmieniano kodu, danych ani konfiguracji produkcyjnej.
