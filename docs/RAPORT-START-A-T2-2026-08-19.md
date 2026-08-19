# Raport startu — A-T2 — 2026-08-19

## Zakres i uczciwość pomiaru

- produkcyjny build Vite z `VITE_E2E_MODE=true`, bez realnego konta i bez zapisów serii;
- Playwright Chromium, viewport 390×844, pięć uruchomień na wariant;
- warm: reload w jednym kontekście; cold: nowy kontekst; offline: seed service workera,
  zamknięcie strony, tryb offline i nowa strona; weak: nowy kontekst, `effectiveType=2g`
  oraz 250 ms opóźnienia każdego requestu;
- `elapsedMs` mierzy od polecenia nawigacji do widocznego nagłówka, a marker
  `dashboard-interactive` jest zapisywany dopiero po załadowaniu workoutów i planu;
- fizyczny `Iphone (Greg)` był `Offline` w `xcrun xctrace list devices`. To jest pomiar
  web/E2E, **nie dowód real-device** ani test prawdziwego cache Firestore. Real-device
  cold/offline/kill pozostaje obowiązkowym kryterium A-T5.

## Pięć prób i mediany

| Tryb | elapsed 1–5 (ms) | Mediana elapsed | `dashboard-interactive` 1–5 (ms) | Mediana markera |
|---|---|---:|---|---:|
| warm | 80, 62, 66, 62, 64 | 64 | 65, 47, 51, 46, 48 | 48 |
| cold online | 242, 317, 249, 236, 239 | 242 | 207, 276, 209, 201, 202 | 207 |
| cold offline po seedzie | 138, 143, 147, 140, 135 | 140 | 100, 102, 97, 100, 96 | 100 |
| weak network (symulacja) | 2169, 2156, 2164, 2166, 2164 | 2164 | 1989, 1978, 1984, 1993, 1968 | 1984 |

W symulacji trzy warianty mają duży zapas. Weak-network osiąga 1984 ms do markera, ale
zewnętrzny pomiar widoczności kończy się po 2164 ms. Nie wolno z tego wnioskować, że próg
telefonu jest potwierdzony: E2E omija prawdziwy Auth i profil Firestore.

## Markery i wąskie gardło

Markery są dostępne przez Performance API i w ostatnim raporcie sesyjnym pod kluczem
`strength-save:last-startup-report`:

- `root-painted`;
- `auth-restored`;
- `profile-cache-ready` z detalem `cache`, `server`, `sync` albo `e2e`;
- `dashboard-interactive` dopiero po `isLoaded && planIsLoaded`.

Mediana etapów weak-network: `root-painted` 860 ms, `auth-restored` 868 ms,
`profile-cache-ready` 1405 ms, `dashboard-interactive` 1984 ms. Kolejne wąskie gardła to
zatem pobranie i wykonanie początkowego JS do pierwszego frame'u (~860 ms), następnie lazy
chunk drzewa zalogowanego (~545 ms) i lazy Dashboard wraz z jego zależnościami (~579 ms).
To wskazuje przyszły kierunek profilowania na chunks `AuthenticatedApp`/`Dashboard`, a nie
na wydłużanie loadera ani kolejne zapytanie sieciowe.

## Bundle i decyzja po profilowaniu

Normalny build: initial JS 1 300 254 B przy niezmienionym limicie 1 536 000 B; żaden chunk
nie przekracza 819 200 B. Największe elementy krytycznej ścieżki to Firebase 733,22 kB,
initial `index` 418,81 kB, React 142,35 kB; `AuthenticatedApp` ma 288,25 kB i jest lazy.

Nie wykonano spekulacyjnego splitu Firebase: cele symulacji poza zewnętrznym odczytem weak
są zielone, a repo ma udokumentowany wcześniejszy biały ekran przez cykl `firebase-core ↔
firebase-auth`. Budżetu nie podniesiono. Następna optymalizacja ma wynikać z real-device A-T5
i dotyczyć wskazanych lazy chunks.

## Dowody bramek zakresu

- RED: trzy brakujące moduły (`BootScreen`, `startup-performance`, `promise-timeout`) oraz
  dwa czerwone przypadki RevenueCat (cached PRO czekało; brak cache wisiał bez końca);
- GREEN zakresu: 29/29 testów boot/paywall/profile/native splash, następnie 10/10 testów
  markera i starych flow Dashboardu;
- pełny Vitest: 225 plików, 1681/1681;
- `typecheck`, `lint`, normalny `build`, bundle budget, dist smoke, offline smoke i no-emoji:
  GREEN;
- Android `:app:processDebugResources`: `BUILD SUCCESSFUL`;
- iOS `xcodebuild` App/Debug, generic iOS Simulator, signing off: exit 0;
- natywne artwork: ten sam `app-icon`, 64×64 pt/dp, wycentrowany, tło `#0E0E0E`.
