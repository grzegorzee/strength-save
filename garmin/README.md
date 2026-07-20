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

## PUBLIKACJA W CONNECT IQ STORE (krok po kroku)

### A. Przed submisją (jednorazowo)

1. Konto developerskie: zaloguj się na https://apps.garmin.com/developer
   tym samym kontem Garmin co w SDK Managerze. Konto jest bezpłatne,
   akceptujesz regulamin developera. Nie ma tu recenzji wstępnej jak u Apple.
2. Zbuduj paczkę dystrybucyjną (NIE zwykły .prg):
   `monkeyc -e -o bin/strengthsave.iq -f monkey.jungle -y ~/.garmin/developer_key.der -w`
   Flaga `-e` robi export na WSZYSTKIE urządzenia z manifestu naraz.
   Plik `.iq` to jedyny format przyjmowany przez Store.
3. Sprawdź paczkę w symulatorze na 2 rozmiarach ekranu (okrągły fenix
   i prostokątny venu), bo recenzent testuje na losowym urządzeniu z listy.

### B. Materiały do formularza (przygotuj zawczasu)

| Pole | Co wpisać |
|------|-----------|
| Nazwa | Strength Save |
| Kategoria | Health & Fitness |
| Krótki opis | Loguj serie treningu siłowego z nadgarstka. Plan dnia, cele serii, timer przerwy, zapis do Garmin Connect. |
| Opis PL/EN | Oba języki (apka ma resources PL+EN) |
| Ikona Store | 1024x1024 PNG |
| Screenshoty | Min. 1, zalecane 3-4 z symulatora (`monkeydo` + zrzut okna) |
| Polityka prywatności | URL (WYMAGANY, bo apka wysyła dane na własny backend) |
| Uprawnienia | Communications, Fit, Sensor, UserProfile - uzasadnij każde w opisie |

### C. Submisja i recenzja

4. Upload `.iq` w panelu developera → wypełnij formularz z tabeli B →
   Submit for review.
5. Recenzja Garmina trwa zwykle kilka dni roboczych. Typowe powody odrzucenia:
   brak polityki prywatności, uprawnienia bez uzasadnienia, crash na którymś
   z zadeklarowanych urządzeń (dlatego krok A.3).
6. Po akceptacji apka jest publiczna od razu. Aktualizacja = nowy `.iq`
   z podbitą wersją w `manifest.xml` i ponowna (szybsza) recenzja.

### D. Uwaga o kluczu developerskim

Klucz `developer_key.der` to Twoja tożsamość w Store. Zgubienie = brak
możliwości wydania aktualizacji istniejącej apki. Trzymaj kopię w
`_secrets/` (poza repo, tak jak klucze Apple).

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
