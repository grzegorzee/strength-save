# Baseline startu — A-T0 — 2026-08-19

## Środowisko i ograniczenia

- commit bazowy przed zmianą: `248f5b4f`;
- host: macOS, lokalny produkcyjny build Vite, `vite preview`;
- klient pomiarowy: Playwright Chromium, viewport mobilny 390×844;
- pięć pomiarów każdego trybu przez `scripts/measure-startup-baseline.mjs`;
- punkt końcowy: widoczny nagłówek Dashboardu;
- warm: reload w tym samym kontekście; cold: nowy kontekst przeglądarki; offline: online
  seed i aktywny service worker, zamknięcie strony, przełączenie kontekstu offline, nowa strona;
- build pomiarowy miał `VITE_E2E_MODE=true`, więc używał wyłącznie syntetycznego usera i nie
  zapisywał serii ani danych realnego konta.

To jest **symulacja webowa, nie pomiar real-device**. Fizyczny iPhone był widoczny jako
offline, a iOS Simulator nie miał bezpiecznie zasianego profilu testowego. Obecny E2E mock
omija prawdziwy `UserProvider`, dlatego liczby są baseline'em renderu/bundla, a nie dowodem
naprawy sieciowego bootstrapu. Prawdziwy cached-profile cold/offline jest kryterium A-T1/A-T5.

## Wyniki (ms do Dashboardu)

| Tryb | Próba 1 | Próba 2 | Próba 3 | Próba 4 | Próba 5 | Mediana |
|---|---:|---:|---:|---:|---:|---:|
| warm | 82 | 68 | 69 | 65 | 65 | 68 |
| cold | 248 | 337 | 236 | 239 | 238 | 239 |
| offline po seedzie | 150 | 147 | 147 | 149 | 139 | 147 |

## Baseline bundle produkcyjnego builda

`npm run check:bundle-budget`: initial JS 1 298 679 B przy limicie 1 536 000 B; żaden chunk
nie przekracza 819 200 B. Największe elementy krytycznej ścieżki z normalnego builda:

| Chunk | Raw | Gzip |
|---|---:|---:|
| Firebase | 732,72 kB | 168,53 kB |
| Initial (`index`) | 417,74 kB | 133,80 kB |
| AuthenticatedApp | 287,96 kB | 85,10 kB |
| React vendor | 142,35 kB | 45,63 kB |
| Dashboard | 52,48 kB | 15,87 kB |

Pełny precache PWA: 153 pliki, 5 682,58 KiB. Budżetu nie podniesiono.
