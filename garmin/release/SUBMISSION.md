# Connect IQ Store: co wpisać w formularz (wersja 1.0.0)

Portal: https://apps.garmin.com/developer (konto Garmin tego samego developera co klucz
`developer_key.der`, sha256 `63eee010…5730e9`). Pierwsza publikacja: „Submit an App”.

## Pliki do uploadu

| Pole | Plik | Kontrola |
|---|---|---|
| App package (.iq) | `garmin/bin/strengthsave.iq` w worktree builda albo kopia `~/Desktop/strengthsave-garmin-1.0.0.iq` | sha256 `e4722ac255ed4fcfe7387f0bef1785bf4bd0d5465e926a94f4cd4622cebfe01a`, 657634 B |
| Ikona Store | `garmin/release/store-icon-1024.png` | 1024x1024 PNG |
| Screenshoty | `garmin/release/screenshots/fr255-pairing-round.png`, `venusq2-pairing-rectangle.png` | ekran parowania, okrągły i prostokątny |
| Screenshoty z planem (zalecane) | zrzuty z konta QA wg `docs/GARMIN-DEVICE-TEST-QUICK.md` p. 4 | jeszcze nie istnieją |

Portal waliduje `.iq` po uploadzie. Wersja i lista urządzeń idą z manifestu w paczce.

## Pola formularza

| Pole | Wartość |
|---|---|
| App type | Device App (watch-app) |
| Nazwa | Strength Save |
| Wersja | 1.0.0 (manifest `version="1.0.0"`; kolejna aktualizacja musi mieć wyższą) |
| Kategoria | Health & Fitness (jeśli portal ma inną nazwę, najbliższa kategoria fitness) |
| Języki opisu | English (domyślny) + Polski |
| Krótki opis EN / PL | sekcja „Short description” w `listing-en.md` / „Krótki opis” w `listing-pl.md` |
| Opis EN / PL | sekcja „Description” / „Opis” (razem z akapitami Requirements/Wymagania i Payment/Płatność) |
| Uprawnienia (widoczne dla usera z paczki) | Communications, Fit. Uzasadnienia: sekcja „Permissions” / „Uprawnienia” listingu |
| Czy aplikacja wymaga płatności | TAK: główne funkcje wymagają aktywnej subskrypcji Strength Save PRO kupowanej w aplikacji iOS/Android; zegarek nie ma własnego zakupu (Connect IQ Monetization nieużywane) |
| Polityka prywatności | https://strengthsave.app/privacy |
| Warunki / EULA (jeśli pole jest) | https://strengthsave.app/terms |
| Wsparcie (URL) | https://strengthsave.app/support |
| E-mail kontaktowy | contact@strengthsave.app |
| ANT+ | nie |
| Urządzenia | 16 z manifestu: fenix7, fenix7s, fenix7x, fenix8solar47mm, epix2, epix2pro42mm, epix2pro47mm, epix2pro51mm, fr255, fr265, fr955, fr965, venu2, venu3, vivoactive5, venusq2 (27 binariów) |

## Notatka dla recenzenta (pole „Notes to reviewer”, jeśli jest)

The app is a client for a Strength Save account and requires an active Strength Save PRO
subscription. To review: install Strength Save on iOS or Android, sign in with the review
account we provide on request (contact@strengthsave.app), open Profile > Devices &
connections > Pair watch and enter the 6-digit code on the watch. Without pairing the watch
shows the pairing screen only. Heart rate and FIT data are recorded natively to Garmin
Connect and are not sent to our server.

Konto do recenzji: nie wpisuj danych konta QA do repo. Jeśli portal wymaga loginu w formularzu,
wklej go tylko tam (dane: `~/FIRMA/_secrets/strength-save-qa.md`).

## Przed kliknięciem Submit

- [ ] G1-G9 na epix Gen 2 z buildem 1.0.0 (`docs/GARMIN-DEVICE-TEST-QUICK.md`), w tym tętno w aktywności
- [ ] polityka prywatności z poprawionym opisem Garmina wdrożona na strengthsave.app (commit `f91a95c` w repo landingu, bez deployu)
- [ ] sha256 uploadowanego pliku = wartość z `artifact.json`
- [ ] klucz developerski w szyfrowanej kopii poza tym Makiem
