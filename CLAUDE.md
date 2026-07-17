# CLAUDE.md - Strength Save (zasady pracy nad projektem)

> Kontekst projektu: `START.md` (quick ref), `DOCUMENTATION.md` (architektura), `DECYZJE.md` (log decyzji), `PLAN.md` (backlog).

## Zasady kodowania (Karpathy, obowiązkowe przy każdej zmianie)

Wdrożone 2026-06-11 po treningu, na którym 5 bugów uniemożliwiało normalne korzystanie z apki (timer bez wibracji, scroll na górę, błąd zapisu szkicu). Wszystkie wynikały z testowania wyłącznie w foregroundzie na symulatorze/web.

### 1. Think before coding: nazwij środowisko docelowe

Apka działa NA SIŁOWNI: telefon w kieszeni, ekran zgaszony, zasięg słaby.
Przy każdej funkcji dotykającej treningu pierwsze pytanie: **co się dzieje, gdy ekran gaśnie?**

- iOS WSTRZYMUJE JavaScript w WKWebView po zgaszeniu ekranu. Nic opartego o `setInterval`/`setTimeout` nie wykona się w tle.
- Sygnały dla usera w tle = wyłącznie systemowe (local notifications, `src/lib/rest-notification.ts`).
- IndexedDB potrafi stracić połączenie po powrocie z tła: zapis zawsze z retry + fallback localStorage (`workout-draft-db.ts`).
- Scroll/stan UI po resume: nie zakładaj, że przetrwa. Restore z retry, klucze stabilne w czasie sesji (NIE sessionId, bo zmienia się przy promocji provisional→remote).

### 2. Goal-driven: kryterium akceptacji = scenariusz użytkownika

"Kod się kompiluje" to nie jest definicja done. Dla każdego buga/feature:

1. Test odtwarzający problem (vitest), dopiero potem fix.
2. Tam gdzie test automatyczny nie sięga (wibracja, dźwięk, zgaszony ekran, haptyka): ręczny scenariusz na realnym urządzeniu lub symulatorze z symulacją suspendu.

### 3. Simplicity first: rozwiązania systemowe zamiast sprytnych obejść

Przykład: koniec przerwy sygnalizuje system (local notification zaplanowana na deadline), a nie próby utrzymania JS przy życiu. Mniej kodu, zero edge-case'ów.

### 4. Surgical changes

Każdy fix dotyka tylko swojego obszaru. N bugów = N izolowanych zmian, opis per bug w commicie, rollback punktowy. Nie poprawiaj przy okazji sąsiedniego kodu.

## Checklist przed KAŻDYM wdrożeniem

- [ ] `npm run test` (wszystkie zielone), `npm run typecheck`, `npm run lint`
- [ ] `npm run build` przechodzi
- [ ] Zmiany dotykają timerów / autozapisu / scrolla / cyklu życia apki? → scenariusz **background/resume**: zgaś ekran, odczekaj, wróć (realne urządzenie)
- [ ] Commit + push na `main`
- [ ] **Web:** `npm run deploy` (gh-pages; sam push NIE aktualizuje strony live)
- [ ] **iOS:** bump `CURRENT_PROJECT_VERSION` w `ios/App/App.xcodeproj/project.pbxproj` (6 wystąpień, wszystkie równe; pilnuje tego `release-ios-preflight.mjs`), potem `scripts/release-ios.sh "co testować"` (build + TestFlight + auto Beta App Review; Robert dostaje build automatycznie)
- [ ] **TestFlight dystrybucja:** po uploadzie ZAWSZE `uv run --with "pyjwt[crypto]" --with requests scripts/testflight_external.py <build> --whats-new "..."` (podpina OBIE grupy + zgłasza Beta App Review; sam `asc_api.py internal-setup` zostawia Roberta bez builda — lekcja 2026-07-17)
- [ ] **Wersja aplikacji:** MARKETING_VERSION (iOS), `version` w package.json i versionName (Android) = **1.0.0 na sztywno do launchu** (decyzja 2026-07-17). Bump TYLKO `CURRENT_PROJECT_VERSION` (+1 per build TestFlight). Zmiana 1.0.0 wymaga jawnej decyzji usera.
- [ ] Wpis do `DECYZJE.md` (co, dlaczego, root cause, weryfikacja)

## Pułapki specyficzne dla projektu (skrót)

- **Dźwięk timera:** WebAudio wymaga gestu usera (unlock w handlerze odhaczenia serii); przy wyciszonym telefonie beep nie zagra, ale haptic i notyfikacja tak.
- **Firestore:** kg kanoniczne, konwersja jednostek tylko w UI (`useUnit`). Sanityzacja przed zapisem.
- **i18n:** każdy nowy klucz do OBU plików `src/i18n/locales/pl.ts` i `en.ts`, inaczej typecheck padnie.
- **Capacitor:** nowy plugin = `npm i` + `cap sync ios` (robi to `release-ios.sh`); `cap sync` nie wystarcza do testu na urządzeniu, potrzebny `cap run ios` lub pełny release.
- **Dane usera są święte:** żadnych testów na realnym koncie zapisujących serie; user jest wrażliwy na utratę treningów, przy ryzykownych operacjach proponuj eksport.
