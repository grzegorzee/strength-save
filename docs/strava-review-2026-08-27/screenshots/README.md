# Screenshoty do Strava brand review

Anonimowy, deterministyczny zestaw wygenerowany z prawdziwych komponentów
Strength Save w viewportcie `390 × 844` (DPR 1, dark mode, `pl-PL`). Harness
nie łączy się z Firebase ani Stravą i nie używa danych realnych użytkowników.

Pliki:

- `01-profile-connect.png` — Profil → Urządzenia i połączenia, oficjalny CTA
  „Connect with Strava”.
- `02-strava-data.png` — połączona zakładka Strava, anonimowa aktywność i
  oficjalna atrybucja „Powered by Strava”.
- `03-activity-detail.png` — detal anonimowej aktywności z oficjalną atrybucją
  oraz linkiem „View on Strava”.

Regeneracja:

```sh
node scripts/strava-review-screenshots.mjs
```

To materiały webowe do przygotowania wniosku. Przed wysłaniem review właściciel
powinien dodatkowo zrobić analogiczne screenshoty z aktualnego builda iOS na
realnym urządzeniu, połączonego z testowym (nieprodukcyjnym) kontem Strava.
