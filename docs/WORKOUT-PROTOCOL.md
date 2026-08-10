# Strength Save Workout Protocol v1

**Status:** kontrakt X25/Z224  
**Wersja:** `1`  
**Fixture normatywne:** `fixtures/cross-platform/workout-contract-v1.json`

## Cel i zakres

Protokół opisuje ten sam trening na web, iOS, Android, Apple Watch i Garmin. Nie narzuca tych samych ekranów. Narzuca identyczne identyfikatory, kg, typ serii, kolejność konfliktu, znaczenie finish/discard i wynik finalny.

Snapshot planu i strumień eventów to osobne rzeczy:

- snapshot mówi, co można wykonać i jaki stan zna nadawca;
- event mówi, jaka akcja zaszła lokalnie;
- snapshot nigdy nie jest potwierdzeniem trwałego zapisu eventu;
- ACK eventu wolno wysłać dopiero po trwałym zapisie w lokalnym źródle prawdy albo backendzie.

## Koperta eventu

Każdy event v1 ma pola:

| Pole | Znaczenie |
|---|---|
| `protocolVersion` | Dokładnie `1`. Nieznana wersja jest odrzucana bez ACK. |
| `uid` | Konto będące właścicielem sesji. Backend zawsze zastępuje/porównuje je z zaufanym auth; wartość klienta nie jest autoryzacją. |
| `deviceId` | Stabilny, opaque identyfikator instalacji/urządzenia. Nie jest sekretem ani tokenem. |
| `dayId` | Id planowego dnia albo `adhoc-YYYY-MM-DD-<liczba>` dla szybkiego treningu. |
| `sessionId` | Logiczny identyfikator jednej sesji od startu do finish/discard. Cloud document id może być osobnym szczegółem persystencji. |
| `exerciseId` | Stabilny id ćwiczenia dla eventu serii; `null` dla eventu lifecycle. |
| `setIndex` | Indeks w obrębie ćwiczenia, liczony od zera; `null` dla lifecycle. |
| `eventId` | Globalnie unikalny klucz idempotencji. Retry zachowuje ten sam `eventId`. |
| `at` | Epoch milliseconds czasu akcji na urządzeniu. Służy do jawnego last-write-wins per seria. |
| `type` | `session_started`, `set_logged`, `set_updated`, `session_finished` albo `session_discarded`. |
| `set` | Wymagane tylko dla `set_logged`/`set_updated`; pełna kanoniczna treść serii. |

Eventy lifecycle mają jawne `exerciseId: null` i `setIndex: null`. Brakujące pola nie są domyślnie dopowiadane w wersjonowanym evencie. Wyjątkiem są adaptery legacy, które uzupełniają kontekst wyłącznie z zaufanego aktywnego draftu/uwierzytelnionego tokenu.

## Typy serii i jednostki

Masa jest zawsze przesyłana i zapisywana w kg. `lbs` istnieje wyłącznie w UI. Konwersja nie może modyfikować wartości kanonicznej ani zaokrąglać jej przy synchronizacji.

| `tracking` | Pola v1 |
|---|---|
| `weight_reps` | `reps`, `weightKg`, `completed`, opcjonalne `isWarmup` |
| `duration` | `durationSec`, `completed`, opcjonalne `isWarmup` |
| `weight_distance_duration` | `weightKg`, `distanceM`, opcjonalne `durationSec`, `completed`, opcjonalne `isWarmup` |
| `assisted_bodyweight` | `reps`, `assistWeightKg`, `completed`, opcjonalne `isWarmup` |

Adapter do modelu aplikacji mapuje `weightKg -> weight` i `assistWeightKg -> assistWeight` bez zmiany liczby. Limity: reps 0-999, masa/asysta 0-1000 kg, czas 0-86400 s, dystans 0-1000000 m, indeks serii 0-99.

## Przerwy

Wspólne defaulty to:

- `betweenSetsSec = 90`;
- `betweenExercisesSec = 150`.

Snapshot może nieść aktualne ustawienia usera. Stary Watch nadal czyta alias `restSeconds`; nowy dostaje równolegle `restBetweenSetsSeconds` i `restBetweenExercisesSeconds`. Brak pola w starym snapshocie oznacza default, nie wyzerowanie lokalnej zmiany. Wersja lub czas ustawienia musi rozstrzygać przyszły merge ustawień; stary snapshot nie może po cichu nadpisać nowszej wartości lokalnej.

## Idempotencja, konflikt i stan końcowy

1. Replay tego samego `eventId` nie wykonuje akcji drugi raz.
2. Dwa różne eventy tej samej serii rozstrzyga większe `at`; przy identycznym `at` większe leksykograficznie `eventId` daje wynik deterministyczny.
3. Inna seria ma klucz `exerciseId#setIndex`; event jednej serii nie może nadpisać drugiej.
4. `session_finished` oznacza trwałą finalizację jednej sesji. Retry nie tworzy drugiego dokumentu.
5. `session_discarded` jest terminalne lokalnie i nie wolno tłumaczyć go na finish. Nie zapisuje WorkoutSession ani Health/FIT.
6. Wygaśnięcie entitlementu blokuje nowe płatne akcje, ale nie kasuje eventów. Po odzyskaniu `pro` retry używa tych samych identyfikatorów.

Referencyjny reducer jest w `src/lib/workout-protocol.ts`. Fixture v1 po dwukrotnym replayu nadal daje jedną sesję: 900 s, 6 serii i 1500 kg tonażu, a nowszy event Watch wygrywa konflikt `fixture-back-squat#1`.

## Trwałość i ACK

| Transport | Trwały zapis poprzedzający ACK/success |
|---|---|
| Web/iOS/Android | IndexedDB draft z retry i fallbackiem localStorage; finalnie potwierdzony write Firestore. |
| Apple Watch -> iPhone | UserDefaults/`transferUserInfo` na Watch, następnie zapis draftu iPhone; dopiero wtedy `ackEvents`. |
| Garmin -> Functions | EventQueue w Garmin Storage; HTTP 200 dopiero po `await saveWorkout`. Kolejka jest czyszczona tylko po 200. |

Błąd zapisu nie może trafić do dedupu trwałego. Event zostaje pending i wraca przez retry. Logout/revoke/delete odcina dalszy dostęp, ale nie czyści niewysłanej kolejki bez jawnego discard usera.

## Limity transportu

| Transport | Limit v1 | Zachowanie po przekroczeniu |
|---|---:|---|
| Watch application context | 256 KiB UTF-8 JSON | telefon nie wysyła i raportuje błąd diagnostyczny |
| Garmin `garminDay` response | 8 KiB UTF-8 JSON | HTTP 413 `payload-too-large`, bez uciętego/niepoprawnego snapshotu |
| Garmin ingest batch | 256 KiB, maks. 500 eventów | HTTP 400 `invalid`, zero zapisu |
| Id/nazwa/notatka | id do 120 w kanonicznym evencie; Garmin id do 80, nazwa do 120, notatka do 140 | odrzucenie albo jawne przycięcie snapshotowej notatki |

Rozmiar liczymy w bajtach UTF-8, nie jako liczbę znaków JavaScript.

## Rolling compatibility

### Stary klient -> nowy serwer/telefon

- Watch event bez `protocolVersion/sessionId/deviceId` jest mapowany do v1 z aktywnego draftu i stabilnego id instalacji. Legacy `id` pozostaje `eventId`.
- `garminIngest` bez `protocolVersion` jest traktowany jako `weight_reps`; `weight` oznacza kg. Backend nadal bierze `uid/deviceId` wyłącznie z tokenu.
- `garminDay.v=1` i zestawy `[reps, kg]` pozostają legalne.

### Nowy klient -> stary serwer/telefon

- Watch wysyła hybrydowy event: stare `type/id/reps/weight` plus addytywne `protocolVersion/eventId/canonicalType/sessionId/deviceId`. Stary telefon ignoruje nowe klucze.
- Garmin wysyła stare `workoutId/id/reps/weight` równolegle z `protocolVersion/sessionId/eventId/set`. Stary serwer waliduje aliasy, nowy zachowuje pełne typy serii.
- Snapshot iPhone -> stary Watch dodaje tylko opcjonalne pola; Swift Codable ignoruje nieznane klucze.

Nieznana przyszła wersja nie jest automatycznie interpretowana jako v1. Klient pokazuje błąd/retry, a serwer nie zapisuje częściowego treningu.

## Dowody automatyczne

- `src/test/cross-platform-contract-fixture.test.ts` — integralność fixture;
- `src/test/cross-platform-protocol.test.ts` — parser, replay, konflikt, discard, typy i limity;
- `src/test/watch-contract.test.ts` i `src/test/watch-workout-sync.test.tsx` — legacy Watch, wersja/identyfikatory, 90/150 i ACK po zapisie;
- `functions/src/garmin-protocol.test.ts` — oba kierunki rolling compatibility, cztery typy i durable success;
- `functions/src/garmin-ingest.test.ts` i `functions/src/garmin-day.test.ts` — idempotentny doc, konflikt i budżet 8 KiB.

