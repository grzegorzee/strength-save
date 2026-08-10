# Strength Save — aplikacja Garmin Connect IQ (X16C, v3)

Aplikacja device app (Monkey C) do logowania serii z zegarka Garmin:
parowanie 6-cyfrowym kodem (Ustawienia → Zegarek Garmin w apce),
pobranie dnia (`garminDay`), odhaczanie serii ze stepperem, rest timer
z wibracją, natywna sesja siłowa (FIT z HR) do Garmin Connect,
kolejka offline i wysyłka treningu do `garminIngest`.

## STATUS: v3 + kontrakt X25 zbudowany, czeka na bramę fizyczną (2026-08-10)

SDK 9.2.0 zainstalowany, apka skompilowana, sparowana i przetestowana na
epix (Gen 2) usera + w symulatorze (zrzuty). UI v2: lista dnia jako natywne
Menu2, ekran ćwiczenia w pionie, krok wagi 0.5-5 kg, szybki trening ad-hoc
(lista ostatnich ćwiczeń `r` z garminDay, dayId `adhoc-<data>-<ms>` w
konwencji telefonu). v3 (2026-07-28 wieczór): przerwy konfigurowalne w menu
dnia (między seriami 30 s-4 min, default 1:30; między ćwiczeniami
wyłączona-5 min, default 2:30 — parytet 90/150 z telefonem), zegar czasu
sesji (mini u góry ekranu ćwiczenia, tyka od pierwszej odhaczonej serii),
ekran Sesja (czas + serie + tonaż) — wejście swipe w lewo z ekranu ćwiczenia
albo pozycja "Sesja" w menu dnia. Do tego "Odrzuć trening" (2026-07-29):
pozycja w menu widoczna przy wiszących seriach, z potwierdzeniem; czyści
kolejkę i stan LOKALNIE (FIT do kosza, nic nie wysyła) — wyjście ze stanu
"niewysłany trening" bez zapisu; serie niosą datę dnia startu sesji
(sessionDay), nie datę wysyłki. Sideload na macOS: OpenMTP → GARMIN/Apps
(zegarek jest MTP-only; Garmin Express musi być zamknięty). Do publikacji w
Store zostało: pobranie urządzeń fr255/265/955/965 + venu2/3 w SDK
Managerze, ikona 1024x1024, screenshoty, formularz (sekcje A-D niżej).

X25 zachowuje całą architekturę v3 i dodaje: kontrolę jednego entitlementu
`pro` w pair/day/ingest, revocable token z TTL 180 dni, logout/delete revoke,
cztery typy serii + warm-up w addytywnym protokole v1, kg/lbs wyłącznie w UI,
jedną kanoniczną sesję telefonu+Garmina z per-set LWW oraz odporny nowy dzień.
Kontekst dnia ma cache 15 min i ręczny refresh; aktywna EventQueue blokuje
podmianę dnia do trwałego ACK. Typowy trening używa 1 requestu `garminDay` i
1 finalnego `garminIngest`; UI timer/FIT/EventQueue nie zapisują nic co sekundę.

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
  kontrakt `garminDay`: legacy `[reps,kg]` pozostaje, a nowy klient dostaje
  `{v,d,y,n,z,e:[{i,n,k,s:[[reps,kg,duration,distance,assist,warmup]]}]}`.
- `source/EventQueue.mc` — kolejka zdarzeń w Storage (idempotentne
  eventId), flush przy łączności, wysyłka finalna przy zakończeniu.
- `source/SessionRecorder.mc` — ActivityRecording (strength) start przy
  pierwszym odhaczeniu, stop+save przy zakończeniu → FIT do Garmin Connect.
- Widoki: PairView (picker cyfr) → DayView/DayMenu (Menu2: ćwiczenia,
  Szybki trening, Sesja, Zakończ, Krok wagi, Przerwa: serie, Przerwa:
  ćwiczenia) → ExerciseView (serie, stepper wagi, odhacz, przerwa inline
  z wibracją, mini zegar sesji) → SessionView (czas + serie + tonaż,
  swipe w lewo z ExerciseView albo pozycja "Sesja" w menu).

Backend: `functions/src/garmin-pair|day|ingest|endpoints.ts` (testy vitest,
rules deny-all dla `device_pair_codes`/`device_tokens`).
