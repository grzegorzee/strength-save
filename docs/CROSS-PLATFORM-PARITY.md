# Strength Save: macierz parytetu web, iOS, Android, Apple Watch i Garmin

**Wersja audytu:** 2026-08-10  
**Zakres:** X25 / Z223  
**Fixture referencyjne:** `fixtures/cross-platform/workout-contract-v1.json`

## Jak czytać macierz

- `pełny` — dana powierzchnia realizuje pełny kontrakt właściwy dla swojej roli.
- `urządzeniowo uproszczony` — celowo mniejszy interfejs albo pośredni transport, ale bez zmiany znaczenia danych.
- `nie dotyczy` — funkcja nie należy do roli powierzchni i istnieje bezpieczna ścieżka na właściwym urządzeniu.
- `brak [Gxx]` — funkcji lub wspólnej semantyki faktycznie brakuje. Każdy taki wpis ma niżej właściciela, test i kryterium zamknięcia.

Web, iOS i Android współdzielą aplikację React. Różnice między nimi są dozwolone wyłącznie tam, gdzie wymagają tego auth/App Check, sklep albo natywne API. Apple Watch jest kontrolerem sparowanego iPhone'a, a Garmin samodzielnym klientem sparowanym z `uid` przez backend. `Urządzeniowo uproszczony` nie oznacza gorszych ani innych danych końcowych.

## Stan zastany przed Z224

| Obszar | Web PWA | iOS | Android | Apple Watch | Garmin |
|---|---|---|---|---|---|
| Auth / powiązanie konta | pełny — Firebase Auth, rejestracja tylko z invite | pełny — Firebase Auth, App Attest i dokładny App ID | pełny — Firebase Auth, Play Integrity i dokładny App ID | urządzeniowo uproszczony — para iPhone/WatchConnectivity, bez osobnego loginu | urządzeniowo uproszczony — jednorazowy kod i minimalny token urządzenia |
| Status entitlementu `pro` | pełny — profil Firestore, bez checkoutu | pełny — RevenueCat + profil Firestore | brak [G01] | brak [G02] | brak [G03] |
| Checkout / restore | nie dotyczy — bezpieczne skierowanie do mobile jest celem | pełny — App Store/RevenueCat, ceny i eligibility wymagają Z207-Z210 | brak [G01] | nie dotyczy — bez osobnego paywalla | nie dotyczy — bez osobnego paywalla |
| Plan dnia | pełny | pełny | pełny | urządzeniowo uproszczony — snapshot przez application context | urządzeniowo uproszczony — kompaktowy `garminDay` |
| Trening planowy | pełny | pełny | pełny | urządzeniowo uproszczony — kontroluje draft iPhone'a | urządzeniowo uproszczony — lokalna sesja, finalny ingest |
| Szybki trening | pełny | pełny | pełny | brak [G04] | urządzeniowo uproszczony — ostatnie ćwiczenia z `garminDay.r` |
| Typy serii | pełny — `weight_reps`, `duration`, `weight_distance_duration`, `assisted_bodyweight`, warm-up | pełny | pełny | brak [G05] — tylko reps/weight + warm-up | brak [G06] — tylko reps/weight |
| Edycja serii | pełny | pełny | pełny | urządzeniowo uproszczony — stepper reps/weight i one-tap | urządzeniowo uproszczony — stepper reps/weight |
| Przerwa między seriami 90 s | pełny | pełny | pełny | urządzeniowo uproszczony — jedna wartość z iPhone'a | urządzeniowo uproszczony — lokalna konfiguracja 30-240 s |
| Przerwa między ćwiczeniami 150 s | pełny | pełny | pełny | brak [G07] | urządzeniowo uproszczony — lokalna konfiguracja 0-300 s |
| Czas + serie + tonaż sesji | pełny | pełny | pełny | brak [G08] | urządzeniowo uproszczony — ekran Sesja |
| Finish | pełny | pełny | pełny | urządzeniowo uproszczony — event do trwałego draftu iPhone'a | urządzeniowo uproszczony — finalny batch + FIT |
| Discard | pełny | pełny | pełny | brak [G09] | urządzeniowo uproszczony — jawne lokalne odrzucenie kolejki i FIT |
| Offline / resume | pełny — IndexedDB + localStorage fallback | pełny | pełny | urządzeniowo uproszczony — UserDefaults + `transferUserInfo` | urządzeniowo uproszczony — Storage + EventQueue |
| Konflikt telefonu i zegarka | pełny między klientami React — revision/local-wins | pełny | pełny | brak [G10] — lokalne `completed` bez wersji/timestampu może wygrać ze świeższą edycją | brak [G11] — konflikt ukończonego dnia tworzy drugą sesję ad-hoc zamiast jednej kanonicznej |
| Health / FIT | nie dotyczy | pełny — HealthKit/Apple Health z idempotencją | brak [G12] — copy obiecuje Health Connect, bridge jest no-op | pełny — HKWorkout z HR i `hkSession` przeciw duplikatom | pełny — natywny FIT z HR |
| PL / EN | pełny | pełny | pełny | pełny — język z payloadu | pełny — osobne resources ENG/POL |
| kg kanoniczne / lbs w UI | pełny | pełny | pełny | pełny — event w kg, konwersja tylko do prezentacji | brak [G13] — UI i etykiety są tylko w kg |
| Sync: pending / offline / error / retry | pełny | pełny | pełny | brak [G14] — jest pending, brakuje jawnego error i ręcznego retry/discard | urządzeniowo uproszczony — licznik kolejki, komunikat błędu, retry przez ponowne finish |
| Zarządzanie urządzeniami i last sync | brak [G15] — lista obejmuje tylko Garmin i nie pokazuje pending/error/FIT/Watch | brak [G15] | brak [G15] | nie dotyczy — zarządzanie należy do telefonu | urządzeniowo uproszczony — widoczny last used i revoke w kliencie React |
| Logout | pełny lokalnie | pełny lokalnie | pełny lokalnie | brak [G16] — cache/capability nie są jawnie czyszczone po logout iPhone'a | brak [G17] — token działa po logout konta, dopóki user ręcznie go nie cofnie |
| Delete account | brak [G17] — purge nie obejmuje `device_tokens` | brak [G17] | brak [G17] | brak [G16] | brak [G17] |
| Wersjonowany protokół i limity | brak [G18] | brak [G18] | brak [G18] | brak [G18] — payload i eventy bez jawnego `v`/`sessionId`/`deviceId` | brak [G18] — `garminDay.v=1`, ale ingest nie ma wersji ani wspólnej koperty |

## Rejestr jawnych braków

| ID | Priorytet | Właściciel w X25 | Brak i kryterium zamknięcia | Obowiązkowy test / dowód |
|---|---|---|---|---|
| G01 | P0 launch | Z207-Z210 | Android używa osobnego publicznego klucza RevenueCat/Google Play, wspólnego offeringu i entitlementu `pro`; purchase/restore i eligibility działają na Play Internal. | `src/test/purchases-platform.test.ts`, `src/test/paywall-eligibility.test.tsx` oraz scenariusz Play Internal: purchase/restore/used trial/unknown. |
| G02 | P0 | Z227 | iPhone wysyła Watch capability snapshot z potwierdzonym `pro`; zegarek nie pokazuje checkoutu i blokuje wyłącznie nowe akcje po wygaśnięciu, nie kasując kolejki. | `src/test/watch-capability-contract.test.ts`, test dekodowania Swift i real-device expiry z niewysłaną serią. |
| G03 | P0 | Z226-Z227 | `garminDay` i `garminIngest` sprawdzają serwerowy entitlement tokenu; wygaśnięcie nie usuwa lokalnych eventów, a odzyskanie `pro` pozwala na retry. | `functions/src/garmin-entitlement.test.ts` + konto techniczne: active/expired/restored/revoked. |
| G04 | P1 | Z225 | Apple Watch rozpoczyna szybki trening z bezpiecznej listy ostatnich ćwiczeń bez drugiej ścieżki zapisu. | `src/test/watch-quick-workout-contract.test.ts`, test Swift store i real-device start/offline/finish. |
| G05 | P1 data | Z224-Z225 | Watch payload/event zachowuje pełny tracking i pola `durationSec`, `distanceM`, `assistWeightKg` bez degradacji do reps/weight. UI może być uproszczone. | wspólne fixture + `src/test/watch-contract-v2.test.ts` + round-trip Swift dla czterech trackingów. |
| G06 | P1 data | Z224-Z226 | Garmin `garminDay`/EventQueue/ingest zachowuje cztery typy trackingu i warm-up; stary payload `[reps,kg]` nadal działa. | wspólne fixture + `functions/src/garmin-protocol.test.ts` + build Monkey C. |
| G07 | P1 | Z225 | Apple Watch rozróżnia domyślne 90/150 i nie resetuje lokalnej zmiany starym snapshotem. | `src/test/watch-rest-contract.test.ts`, test Swift merge oraz realna haptyka obu przerw. |
| G08 | P1 | Z225 | Watch pokazuje czas, zaliczone serie i tonaż z kanonicznych kg, również po kill/resume. | fixture + test Swift store + real-device background/resume. |
| G09 | P1 safety | Z225 | Jawny discard czyści tylko wybraną lokalną sesję/jej eventy i HKWorkout, bez wysyłki finish. | `src/test/watch-discard-contract.test.ts`, test Swift i real-device discard offline. |
| G10 | P0 data | Z224-Z225-Z228 | Merge Watch używa stabilnego klucza serii i `at`; starszy snapshot/event nie nadpisuje nowszej lokalnej serii, retry jest idempotentny. | wspólne fixture konfliktu + `src/test/watch-conflict-v2.test.ts` + równoległa seria iOS/Watch. |
| G11 | P0 data | Z224-Z226-Z228 | Telefon i Garmin kończą jedną kanoniczną sesję; polityka konfliktu jest jawna i nie tworzy cicho drugiego treningu. | wspólne fixture + `functions/src/garmin-conflict.test.ts` + Android/Garmin/web cross-device. |
| G12 | P1 promise | Z230 | Albo Android ma działający Health Connect z dowodem, albo wszystkie copy/listingi jasno mówią o aktualnym braku; nie wolno obiecywać no-op. | `src/test/health-platform-copy.test.ts` i real-device Android, jeśli bridge zostanie wdrożony. |
| G13 | P1 | Z224-Z226 | Garmin przechowuje kg, ale prezentuje kg/lbs zgodnie z bezpiecznym ustawieniem; round-trip nie traci precyzji. | fixture 62.5 kg -> lbs -> kg, `functions/src/garmin-protocol.test.ts`, symulator Garmin. |
| G14 | P1 recovery | Z225-Z227 | Watch ma rozróżnialne pending/offline/error i ręczne retry albo discard; ACK dopiero po trwałym zapisie. | `src/test/watch-sync-state.test.ts`, Swift queue failure/retry i real-device reconnect. |
| G15 | P1 | Z227 | Web/iOS/Android pokazują spójnie Watch i Garmin: stan, last sync, pending/error, Health/FIT, refresh i revoke/unlink. | `src/test/device-management.test.tsx` + E2E settings na trzech klientach. |
| G16 | P0 security | Z227-Z228 | Logout/delete iPhone'a wysyła Watch stan revoked, odcina nowe akcje i zachowuje niewysłaną kolejkę do jawnej decyzji. | `src/test/watch-revoke-contract.test.ts` + real-device logout/delete/reinstall. |
| G17 | P0 security | Z226-Z228 | Logout/revoke/delete unieważnia Garmin; purge usuwa/revokuje wszystkie `device_tokens` danego `uid`. | `functions/src/security.test.ts`, `functions/src/garmin-pair.test.ts` i techniczne konto delete/revoked-token 401. |
| G18 | P0 protocol | Z224 | Jedna wersjonowana koperta definiuje identyfikatory, eventy, limity, kg, typy serii, finish/discard i kompatybilność w obie strony. | `src/test/cross-platform-protocol.test.ts` + legacy Watch/Garmin fixtures + Functions tests. |

## Zamrożone fixture i wynik referencyjny

`fixtures/cross-platform/workout-contract-v1.json` jest niezależne od UI i zawiera:

- jeden plan z czterema trackingami: `weight_reps`, `duration`, `weight_distance_duration`, `assisted_bodyweight`;
- planową sesję z eventami z telefonu, Apple Watch i Garmin, w tym konflikt jednej serii rozstrzygany przez nowsze `at`;
- szybką sesję kończącą się jawnym `session_discarded` bez zapisanego treningu;
- wspólne `uid/deviceId/dayId/sessionId/exerciseId/setIndex/eventId/at`, kg i defaulty 90/150;
- legacy Watch event, `garminDay v1` i legacy `garminIngest` do testów zgodności wstecz.

Referencyjny wynik sesji planowej: status `finished`, 900 s, 6 zaliczonych serii i 1500 kg tonażu dla trzech serii `weight_reps`; zwycięzcą konfliktu `fixture-back-squat#1` jest `fixture-event-squat-1-watch-newer`. Odtworzenie tej samej listy eventów drugi raz nie może zmienić wyniku ani utworzyć drugiej sesji.

## Dowody audytu

- React/web/iOS/Android: `src/types/index.ts`, `src/lib/workout-draft-db.ts`, `src/lib/workout-sync-engine.ts`, `src/lib/purchases.ts`, `src/hooks/useSubscription.ts`.
- Apple Watch: `src/lib/watch-bridge.ts`, `src/hooks/useWatchWorkoutSync.ts`, `ios/App/WatchApp/WorkoutModels.swift`, `ios/App/WatchApp/WorkoutStore.swift`.
- Garmin: `functions/src/garmin-day.ts`, `functions/src/garmin-ingest.ts`, `functions/src/garmin-endpoints.ts`, `garmin/source/WorkoutState.mc`, `garmin/source/EventQueue.mc`.
- Test fixture: `npm run test -- src/test/cross-platform-contract-fixture.test.ts` — 4/4 PASS.

