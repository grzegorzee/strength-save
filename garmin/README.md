# Strength Save — aplikacja Garmin Connect IQ (X16C, v1)

Aplikacja device app (Monkey C) do logowania serii z zegarka Garmin:
parowanie 6-cyfrowym kodem (Ustawienia → Zegarek Garmin w apce),
pobranie dnia (`garminDay`), odhaczanie serii ze stepperem, rest timer
z wibracją, natywna sesja siłowa (FIT z HR) do Garmin Connect,
kolejka offline i wysyłka treningu do `garminIngest`.

## STATUS: NIEZBUDOWANA (blokada zewnętrzna)

Kod napisany i zgodny z kontraktem backendu (functions `garmin-*`,
wdrożone i przetestowane), ale **NIE był kompilowany** — pobranie
Connect IQ SDK wymaga zalogowania kontem Garmin w SDK Managerze,
a to może zrobić tylko user. Przy pierwszej kompilacji spodziewaj się
drobnych poprawek składni/API.

## KROKI USERA

1. Zainstaluj SDK Manager: https://developer.garmin.com/connect-iq/sdk/
   (logowanie kontem Garmin), pobierz najnowszy SDK (9.2.0+, 2026-06)
   i co najmniej urządzenia: fenix7, fr965, venu3.
2. VS Code + rozszerzenie "Monkey C" (menedżer podpowie).
3. Wygeneruj klucz developerski: `openssl genrsa -out developer_key.pem 4096`
   → `openssl pkcs8 -topk8 -inform PEM -outform DER -in developer_key.pem -out developer_key.der -nocrypt`
   (ścieżkę podaj w build.sh / ustawieniach rozszerzenia).
4. Build: `./build.sh <device>` (np. `./build.sh fenix7`) albo z VS Code
   (Monkey C: Build). Symulator: `connectiq` + `monkeydo bin/strengthsave.prg fenix7`.
5. Zweryfikuj listę `iq:product` w `manifest.xml` z dostępnymi w SDK
   (id urządzeń bywają wersjonowane, np. fenix8solar47mm).
6. Publikacja: konto developerskie Garmin (bezpłatne) → Connect IQ Store
   (opis PL/EN w `store/` — do przygotowania przy submisji).

## Architektura

- `source/Api.mc` — makeWebRequest do Cloud Functions (Bearer token
  urządzenia z Application.Storage; limit odpowiedzi ~8KB → kompaktowy
  kontrakt `garminDay`: `{v,d,y,n,f,e:[{i,n,t,p,s:[[reps,kg]]}]}`).
- `source/EventQueue.mc` — kolejka zdarzeń w Storage (idempotentne
  eventId), flush przy łączności, wysyłka finalna przy zakończeniu.
- `source/SessionRecorder.mc` — ActivityRecording (strength) start przy
  pierwszym odhaczeniu, stop+save przy zakończeniu → FIT do Garmin Connect.
- Widoki: PairView (picker cyfr) → DayView (lista ćwiczeń) →
  ExerciseView (serie, stepper wagi ±2.5 kg / powt. ±1, odhacz) →
  RestTimerView (odliczanie + Attention.vibrate).

Backend: `functions/src/garmin-pair|day|ingest|endpoints.ts` (testy vitest,
rules deny-all dla `device_pair_codes`/`device_tokens`).
