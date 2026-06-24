---
name: product-audit
description: Audytor produktu Strength Save. Uruchamia apkę w trybie E2E, przechodzi kluczowe flow przez przeglądarkę, robi screenshoty + czyta konsolę, i ocenia UX/UI w skali 0-10 z klasyfikacją czerwony/pomarańczowy/żółty. Dowolny błąd działania = 0. Zwraca raport JSON gotowy pod loop. Use when: "audyt produktu", "oceń apkę", "product-audit", lub gdy /loop ma cel poprawy oceny audytu.
---

# Product Audit — Strength Save

Audytor ocenia REALNY stan apki tak, jak zobaczyłby go użytkownik. Nie czyta kodu w poszukiwaniu opinii — uruchamia apkę, klika, patrzy, czyta konsolę.

## Kontrakt (pod /loop)

Skill ZAWSZE kończy zapisem raportu do `audit/latest.json` (i kopii `audit/audit-<timestamp>.json`). Loop czyta `audit/latest.json`, sprawdza pole `score`, decyduje czy kontynuować. Format na końcu pliku.

## Co audytujemy (natywna apka, web = ta sama warstwa)

Strength Save to **apka natywna iOS + Android (Capacitor)**. Capacitor pakuje TEN SAM web build (React) do WebView — więc audyt przez przeglądarkę na dev serverze ocenia dokładnie tę samą warstwę UI/UX, którą widzi user na telefonie. To poprawne proxy dla iOS/Android.

**Czego audyt web NIE pokryje** (zaznacz w raporcie jako `native_not_covered`, nie licz do score):
- safe-area / notch / status bar / dolny pasek gestów
- natywny push, haptyka, klawiatura iOS, splash, ikony
- różnice renderowania WebView vs Chrome

**iOS to benchmark jakości** — działa świetnie wg właściciela. Jeśli audytor web znajdzie 🔴 na trasie, która na iOS działa, to najpewniej różnica WebView/seed/dev, a nie realny błąd produktu: zweryfikuj, zanim zerujesz score, i opisz w `evidence`.

## Dwa tryby audytu

**A) Web (domyślny, pod loop)** — dev server w przeglądarce. Szybkie iteracje (sekundy), pełna kontrola klików/gestów przez claude-in-chrome. Audytuje warstwę React współdzieloną z iOS/Android. To jest tryb pętli /loop.

**B) Natywny iOS (simulator, okresowy/finalny)** — realny build w iPhone Simulator. Łapie to, czego web nie złapie (safe-area, status bar, realny WebView, natywne pluginy). Wolniejszy (build w minutach). Używaj jako bramka jakości przed releasem, nie w każdej iteracji loopa.

> 🔴 **ZAWSZE świeży build.** Nigdy nie audytuj tego, co już jest zainstalowane w symulatorze — to może być stary build. Każdy natywny audyt ZACZYNA od przebudowy i reinstalu aktualnego kodu. Inaczej oceniasz nieaktualną apkę.

```bash
# 0. Świeży build + sync + install + launch na booted simulatorze (OBOWIĄZKOWE)
BOOTED=$(xcrun simctl list devices booted | grep -oE "[0-9A-F-]{36}" | head -1)
npm run mobile:sync                          # vite build + cap sync (web -> ios)
npx cap run ios --target "$BOOTED"           # build (scheme App, SPM), install, launch
# appId: com.grzegorzjasionowicz.strengthsave  | webDir: dist

# 1. Screenshot natywny (po wejściu na ekran)
xcrun simctl io booted screenshot audit/shots/ios-<ekran>.png

# 2. Nawigacja: app używa HashRouter w WebView. Deep-link spróbuj, ale głównie nawiguj klikając UI.
```

**Sterowanie natywne — DZIAŁA przez `idb` (po naprawie CLT 2026-06-10):**

- `simctl io booted screenshot audit/shots/<x>.png` → screenshoty.
- `idb ui tap --udid <UDID> <x> <y>` → tapy. **Współrzędne w PUNKTACH, nie pikselach.** iPhone 17: ekran 402×874 pt, density 3, screenshot 1206×2622 px → **dziel piksele przez 3**. Pobierz dokładne wymiary: `idb describe --udid <UDID>` (pole width_points/height_points).
- WebView (Capacitor) eksponuje TYLKO jeden element AX (cała apka) — `idb ui describe-all` bezużyteczne do celowania. Tapy licz z pozycji na screenshocie (÷3).
- Pasek zakładek dolny: y≈822 pt (NIE 832 — za nisko, strefa home-indicator). 5 zakładek x≈ 50 / 126 / 201 / 277 / 352 pt (Dashboard/Plan/History/Exercises/Profile).
- Gesty: `idb ui swipe`, tekst: `idb ui text`, klawisz: `idb ui key`.
- `cliclick` NIE działa na Simulatorze tego macOS (kursor jedzie, tap ignorowany) — nie używaj.
- Companion auto-spawnuje się przy pierwszej komendzie idb na danym UDID.

> Native = realne konto zalogowane w symulatorze (brak E2E mocka — to tryb produkcyjnego buildu). Interaktywne, szybkie iteracje nadal taniej w trybie web (A); native to bramka jakości na to, czego web nie pokaże.

## Krok 0 — Dev server w trybie E2E

Apka MUSI działać w trybie E2E (mock-auth, bez Firebase produkcyjnego, deterministyczne dane).

```bash
# Sprawdź czy działa
curl -s http://localhost:8080/strength-save/ >/dev/null && echo UP || echo DOWN
```

Jeśli DOWN — uruchom w tle:
```bash
VITE_E2E_MODE=true npm run dev
```
Serwer: `http://localhost:8080/strength-save/`. Viewport audytu: **390×844** (to apka mobilna — audytuj w tym rozmiarze; desktop pomiń).

## Krok 1 — Wstrzyknij usera + dane seed

Apka w E2E czyta stan z `localStorage` (klucz `fittracker_e2e_auth_state`). PRZED nawigacją ustaw przez `javascript_tool` (claude-in-chrome) i przeładuj stronę:

```js
localStorage.setItem('fittracker_e2e_auth_state', JSON.stringify({
  scenario: 'active-user',          // realny zalogowany user z planem
  email: 'audyt@strength.test',
  displayName: 'Audyt Tester'
}));
// dane seed (cykle planu) — bez tego apka pokaże puste stany:
// setE2ECycles odpowiednik: klucz cykli w localStorage, patrz e2e/helpers.ts setE2ECycles
location.reload();
```

> **Kalibracja seedu:** pusty user vs user z planem i historią daje DRAMATYCZNIE różną ocenę. Audytuj na seedzie reprezentującym aktywnego usera (plan + kilka treningów + pomiary). Brak seedu = wynik niemiarodajny, zaznacz to w raporcie (`seeded: false`).

Drugi przebieg dla pełnego pokrycia: scenario `new-user` (onboarding) oraz `active-admin` (panel admina).

## Krok 2 — Przejdź kluczowe flow

Dla KAŻDEJ trasy: nawiguj (HashRouter, np. `#/analytics`), poczekaj na render, screenshot, `read_console_messages`.

| Trasa | Co sprawdzić |
|-------|-------------|
| `#/` (Dashboard) | powitanie, dzisiejszy trening, czy nie pusto/błąd |
| `#/day` | plan dnia, CTA start treningu |
| `#/workout/:dayId` | logowanie serii, rest timer, zapis, draft |
| `#/plan` | widok planu, czytelność tygodni |
| `#/new-plan` + `#/plan/edit` | builder planu, walidacja |
| `#/cycles` | cykle, progresja |
| `#/history` | historia treningów, czy renderuje serie |
| `#/analytics` | wykresy, czy nie NaN/puste osie |
| `#/measurements` | formularz + wykresy pomiarów |
| `#/exercises` + `#/exercise/:slug` | biblioteka, detal ćwiczenia |
| `#/achievements` | odznaki |
| `#/settings` + `#/profile` | ustawienia, jednostki, i18n PL/EN |
| `#/onboarding` (new-user) | flow pierwszego usera |
| `#/admin` (active-admin) | panel admina |

**Błąd konsoli (error/uncaught/Firebase permission) na dowolnej trasie = automatyczny CZERWONY.**

## Krok 3 — Klasyfikacja findingów

- 🔴 **Czerwony** — uniemożliwia działanie: crash, biały ekran, błąd JS w konsoli, niedziałający zapis/CTA, dane się nie ładują, flow nie da się ukończyć.
- 🟠 **Pomarańczowy** — ważne, nie krytyczne: mylący UX, brak feedbacku po akcji, zły stan pusty, niespójność i18n (PL/EN mix), layout się sypie na 390px, dane mylące.
- 🟡 **Żółty** — nice-to-have: kosmetyka, spacing, mikrocopy, drobne niespójności wizualne, element o niskiej wartości dla usera.

Każdy finding: `{ level, route, title, evidence (co widać na screenie/w konsoli), suggestion }`.

## Krok 4 — Ocena 0-10

ZASADA NADRZĘDNA: **jakikolwiek 🔴 (błąd działania) ⇒ `score = 0`.** Bez wyjątków.

Jeśli brak czerwonych: `score = 10 − P`, gdzie P liczone **harmonicznie** (łagodne stackowanie — kolejne findingi karzą coraz mniej, bo apka bez crashy z wieloma drobiazgami to wciąż dobra apka):

1. Wagi bazowe findingów: 🟠 ciężki/systemowy −2.0, 🟠 umiarkowany −1.5, 🟡 −0.5, 🟡 drobny −0.3.
2. **Systemowy problem = JEDEN finding** (np. cyjan w 6 miejscach to jeden fix design-tokens → liczony raz).
3. Posortuj WSZYSTKIE findingi (orange+yellow razem) malejąco po wadze bazowej.
4. `P = Σ ( waga_k / k )` dla k=1,2,3... (k-ty największy finding dzielony przez swoją pozycję). Czyli największy pełną wagą, drugi /2, trzeci /3, itd.
5. Dół ograniczony do 1. Zaokrąglij do 0.5.

**Kotwice kalibracyjne (2026-06-10, native iOS, wg Grzegorza):**
- 1×🟠 systemowy (cyjan) → P=2.0 → **8.0**.
- Pełny audyt: 4×🟠 (cyjan −2, kody EX-* −1.5, duplikat PR −1.5, brak prefill −1.5) + 4×🟡 (−0.5,−0.5,−0.3,−0.3) → P = 2.0 + 1.5/2 + 1.5/3 + 1.5/4 + 0.5/5 + 0.5/6 + 0.3/7 + 0.3/8 ≈ 3.9 → **~6.0**.

Trzymaj się tego modelu; przy rozjeżdżce z oceną Grzegorza koryguj wagi/kotwice tutaj.

## Krok 5 — Raport JSON

Zapisz do `audit/latest.json` ORAZ `audit/audit-<timestamp>.json`:

```json
{
  "score": 7.5,
  "seeded": true,
  "scenarios_audited": ["active-user", "new-user"],
  "summary": "1 zdanie: stan apki",
  "blockers_red": [ { "route": "#/analytics", "title": "Wykres NaN", "evidence": "...", "suggestion": "..." } ],
  "orange": [ ... ],
  "yellow": [ ... ],
  "native_not_covered": [ "safe-area", "push", "haptyka" ],
  "top_fixes": [ "uporządkowana lista 3-5 poprawek o najwyższym ROI dla score" ],
  "screenshots": [ "audit/shots/dashboard.png", "..." ]
}
```

`top_fixes` to wejście dla loopa — naprawia od góry, potem re-audyt.

## Anti-loop / koszty

- Nie audytuj tras, których nie ma w tabeli, chyba że doszły nowe.
- Jeden przebieg = jeden zestaw screenshotów per scenario, nie powtarzaj bez zmiany kodu.
- Jeśli dev server nie wstaje po 2 próbach — zapisz `score: 0` z `red: ["dev server down"]` i przerwij (nie debuguj w nieskończoność).
