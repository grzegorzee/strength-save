# Dodanie nowego języka (checklist)

> Stan na 2026-07-28 (X21/Z168). Przykład: hiszpański (`es`). Kanoniczne PL zostaje
> nietknięte: nazwy ćwiczeń/dni/focus w Firestore, slugi CDN i klucze lookup NIGDY
> nie są tłumaczone. Tłumaczymy wyłącznie **wyświetlanie**.

## 1. Rdzeń klienta (bez tego nic nie ruszy)

| Krok | Plik | Co zrobić |
|---|---|---|
| Słownik | `src/i18n/locales/es.ts` | Kopia `pl.ts` (**1 886 linii, ~1 730 kluczy**) z przetłumaczonymi wartościami. Klucze identyczne — typecheck pilnuje kompletności względem `pl.ts`. |
| Rejestr | `src/i18n/index.ts` | Wpis w `LANGUAGES` (`{ code: 'es', label: 'Español' }`), import słownika do `locales`, wpis w `DATE_LOCALES` (`es: 'es-ES'`). Selektor w Profilu i `detectLanguage()` podchwytują to automatycznie. |
| Daty `date-fns` | `src/lib/strava-utils.ts` | Dopisz locale do `DF_LOCALES` (`import { es } from 'date-fns/locale'`). Bez tego miesiące w podsumowaniach lecą po polsku. |

## 2. Nakładki danych (kanoniczne PL → język UI)

Wszystkie działają wzorcem `Partial<Record<LanguageCode, ...>>`: brak wpisu = wartość kanoniczna.

| Nakładka | Plik | Uwaga |
|---|---|---|
| Nazwy ćwiczeń | `src/data/exercise-i18n.ts` → `NAME_OVERLAYS` | Kompletność pilnuje `src/test/exercise-i18n-coverage.test.ts`. |
| Wskazówki techniczne | `src/data/exercise-i18n.ts` → `INSTRUCTION_OVERLAYS` | Mapa budowana z `exerciseLibrary`. |
| Kategorie mięśniowe | `src/data/exercise-i18n.ts` → `CATEGORY_OVERLAYS` | Klucz (`chest`, `back`...) zostaje kanoniczny do filtrowania. |
| Dni tygodnia + skróty | `src/lib/plan-i18n.ts` → `WEEKDAY_OVERLAYS`, `WEEKDAY_SHORT_OVERLAYS` | |
| Tokeny focusu | `src/lib/plan-i18n.ts` → `FOCUS_TOKEN_OVERLAYS` | Port do backendu: `functions/src/focus-en.ts` (patrz §4). |
| Nazwy/opisy planów | `src/lib/plan-i18n.ts` → `PLAN_NAME`, `PLAN_DESC` | Dopisz pole `es` w interfejsie `PlanText` i we wszystkich wpisach; brak pola = fallback PL. Guard: `src/test/plan-i18n.test.ts`. |
| Strefy HR | `src/types/strava.ts` | Już przez klucze i18n (`strava.zone*`) — wystarczy słownik z §1. |

**Szczegóły ćwiczeń (`src/data/exercise-details.ts:1742`)** zostały binarne (`lang === 'en'`,
lazy-load `exercise-details-en`). Przy realnym trzecim języku trzeba przebudować na
rejestr `Partial<Record<LanguageCode, () => Promise<...>>>` z lazy importem per język.

## 3. Testy-guardy (utrzymują stan)

- `src/test/i18n-hardcoded-scan.test.ts` — globalny skan `src/` na polskie znaki poza allowlistą.
- `src/test/admin-i18n-scan.test.ts` — panel admina.
- `src/test/warmup-i18n.test.ts` — nazwy rozgrzewki bez mieszania języków.
- `src/test/plan-i18n.test.ts`, `src/test/exercise-i18n-coverage.test.ts` — kompletność nakładek.

Nowy język NIE wymaga zmiany guardów, ale warto dopisać asercję „brak polskich znaków
w `es.ts`” analogiczną do testu EN.

## 4. Backend (Firebase Functions)

| Miejsce | Plik | Co zrobić |
|---|---|---|
| Typ języka | `functions/src/email-templates.ts` → `Lang` | Rozszerz unię o `"es"`; `normalizeLanguage` w `registration.ts` też. |
| Maile (weryfikacja, welcome, dostęp, zaproszenie) | `functions/src/email-templates.ts` | Każdy szablon ma gałąź per język. |
| Digest tygodniowy | `functions/src/weekly-digest*.ts` + `functions/src/exercise-name-en.ts` | Port mapy nazw per język (test parytetu z klientem). |
| Push dnia | `functions/src/daily-reminder.ts` + `functions/src/focus-en.ts` | Tytuł/treść i port mapy tokenów focusu. |

## 5. Platformy natywne (osobne pliki zasobów)

- **Garmin CIQ:** katalog `garmin/resources-<lang>/strings/` (dziś: `resources` = EN bazowy, `resources-pol`). Dla ES: `resources-spa`.
- **Apple Watch:** `ios/App/WatchApp/*` — dziś teksty w kodzie Swift; wymaga `NSLocalizedString` + `Localizable.strings` per język.
- **Widget iOS:** `ios/App/WatchWidgets/StrengthWidgets.swift:46` — opis widgetu hardcoded PL.
- **Nazwy ćwiczeń na Watch/Garmin** zostają kanoniczne PL (dopasowanie serii po nazwie) — lokalizacja display to osobny wątek.

## 6. Warstwa statyczna

- `index.html` — `<html lang="pl">`, `<title>`, `<meta description>`.
- Manifest PWA — `vite.config.ts:58` (`manifest`).
- `public/strava-callback.html`, strony `landing/` i legal — brak wersji obcojęzycznych.

## 7. Kolejność wdrożenia (sprawdzona na EN)

1. `es.ts` + rejestr + `DF_LOCALES` → apka mówi po hiszpańsku poza nakładkami danych.
2. Nakładki danych (§2) → znikają polskie nazwy ćwiczeń/dni/planów.
3. Guardy i testy (§3) → zielone.
4. Functions (§4) + deploy → maile i push w nowym języku.
5. Natywne (§5) i statyczne (§6) → domknięcie.

Bramki jak zawsze: `npm run test`, `typecheck`, `lint`, `build`, `check:bundle-budget`
(**uwaga: kolejny pełny słownik to ~60-70 KB w initial JS — przy trzecim języku
prawdopodobnie trzeba lazy-loadować locale zamiast importować statycznie**),
`check:dist-smoke`, `check:dist-offline`, `e2e:mock`, `cd functions && npm test`.
