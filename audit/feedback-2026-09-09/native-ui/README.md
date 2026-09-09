# DayPlan i dolne paski — 2026-09-09

Zakres: zgłoszone zrzuty IMG_2630/2629 (plan dnia) oraz IMG_2631 (timer nad dolną nawigacją). Zrzuty i pomiary w tym katalogu pochodzą wyłącznie z lokalnej aplikacji z syntetycznymi danymi. Nie są dowodem testu nowego buildu na fizycznym iPhonie.

## Potwierdzone przyczyny i poprawki

1. **Plan dnia:** powitanie, data, etykieta dnia i duży nagłówek powtarzały kontekst, a trzy kolumny ściskały ikonę. Nazwa ćwiczenia konkurowała w jednym rzędzie z nierozciągliwą etykietą superserii. Teraz data i tytuł występują raz, własna nazwa dnia pozostaje zachowana, a pełna uporządkowana lista znajduje się zaraz pod akcją rozpoczęcia. Nazwy i serie zawijają się; opis ćwiczenia ma osobną kontrolkę co najmniej 44 px. Rozgrzewka, rozciąganie i wskazówki są rozwijane poniżej listy. Zachowane są start z właściwym dayId/datą, gotowy trening, szczegóły i kolejny termin.

2. **Grupy superserii podczas odczytu:** `sanitizePlanExercise` zachowywał `isSuperset`, ale usuwał `supersetGroup`. Dotyczyło to zarówno rzeczywistego odczytu Firestore w `useTrainingPlan`, jak i planów cyklu oraz fixture E2E. Nowy odczyt zachowuje opcjonalny niepusty identyfikator do 120 znaków bez zmieniania jego treści. Nieprawidłowy identyfikator zostaje pominięty bez usuwania ćwiczenia; nie jest obcinany do wspólnego prefiksu. DayPlan wyznacza oznaczenia członków grupy z rzeczywistej kolejności (np. 5A/5B), bez zgadywania na podstawie końcówki id. Odrębny test przeglądarkowy pełnej hydracji i oznaczeń prowadzi root.

3. **Timer na nawigacji w poziomie:** RestBar używał `md:bottom-0`, choć mobilny nav ukrywa się dopiero przy `desktop-shell`, czyli jednocześnie szerokości co najmniej 768 px i wysokości co najmniej 600 px. Przy 844×390 oba paski były widoczne, a timer zachodził na nav o 91,75 px. RestBar i BackBar używają teraz tego samego warunku co nav.

4. **Odstęp po powrocie / zmianie rozmiaru:** `innerHeight - rect.top` mieszał układy odniesienia viewportu i nie zawierał przerwy. Rezerwa wynosi teraz zmierzoną wysokość nav + obliczone CSS bottom + 8 px. Odświeża ją ResizeObserver, resize/pageshow, visualViewport resize/scroll, załadowanie fontów oraz istniejący most app-lifecycle po resume. Cleanup usuwa subskrypcje i blokuje spóźnione callbacki fontów. Nie dodano własnego mostu natywnego ani drugiej kompensacji klawiatury.

5. **Powiększony tekst:** ikona nawigacji mieści się w szerokości swojego linku. Przy szerokości 320 px i 200% skali REM akcje timera przechodzą do kolejnego wiersza, zostawiając czytelny zegar i dane następnej serii. Nav i BackBar używają istniejącego mocniej kryjącego tokenu `kinetic-glass-sheet`. Nie zmieniono deadline, dźwięków, harmonogramowania powiadomień ani stanu treningu.

Root osobno usunął zbędny BackBar i jego rezerwę na `/day` oraz uaktualnił uzgodnione etykiety PL/EN. Te pliki nie były edytowane w tym zadaniu.

## RED → GREEN i pomiary

| Sprawdzenie | Wynik |
| --- | --- |
| DayPlan przed poprawką | 7 FAIL / 2 PASS; osobny test własnej nazwy dnia również RED |
| DayPlan i warmup i18n po poprawce | 16 PASS |
| Istniejące ścieżki DayPlan/route/start-date | 14 PASS; 196 innych testów pominiętych przez jawny filtr |
| Hydracja grupy przed poprawką | 2 FAIL / 23 PASS; oba błędy wskazują usunięte `supersetGroup` |
| Hydracja i DayPlan po poprawce | 35 PASS (25 + 10) |
| Rezerwa nawigacji przed poprawką | 10 FAIL / 1 PASS |
| Nav, RestBar, BackBar i rezerwa po poprawce | 49 PASS |
| Istniejące sekwencje timera, kontrakty i typografia | 37 PASS |
| E2E rzeczywistego timera, obrót i skala tekstu | 2 PASS: Chromium + WebKit, po końcowym tokenie tła |
| Globalny typecheck; scoped ESLint; diff-check | PASS |

Każdy scenariusz E2E rozpoczyna syntetyczny trening, świadomie pomija propozycję rozgrzewki, zapisuje pierwszą serię i sprawdza rzeczywisty RestBar. Następnie zmienia rozmiar 390×844 → 844×390 → 320×568 ze skalą REM 200%. Sprawdza odstęp, ikony i dolny zapas etykiet oraz brak nachodzenia przycisków na zegar. Jednostkowe testy obejmują także resume, fonty, keyboard pan, przejście desktop/mobile i cleanup. Czas timera pozostaje wyliczany według dotychczasowego deadline.

| Widok | Odstęp przed poprawką | Odstęp po poprawce, oba silniki |
| --- | ---: | ---: |
| 390×844, 100% | 0,25 px | 8,25 px |
| 844×390, 100% | −91,75 px | 8,25 px |
| 320×568, 200% REM | 0,5 px | 8,5 px |

Surowe współrzędne: `nav-rest-red.json`, `nav-rest-green.json`. Zrzuty `red-*` dokumentują stan przed poprawką, `green-*` stan po końcowej zmianie tła. Logi obok zawierają odpowiadające im wyniki. Pełna macierz integracyjna i natywna dystrybucja należą do końcowej walidacji prowadzonej przez root.

## Zamrożone pliki źródłowe i testy

- `src/pages/DayPlan.tsx`
- `src/components/AppNavigation.tsx`, `RestBar.tsx`, `BackBar.tsx`
- `src/lib/firestore-doc-guards.ts` — wyłącznie zachowanie `supersetGroup`
- `src/test/day-plan-readability.test.tsx`, `mobile-nav-clearance.test.tsx`, `firestore-doc-guards.test.ts`
- `e2e/bottom-navigation-clearance.spec.ts`

Źródła zamrożone 2026-09-09 po zielonych wynikach opisanych powyżej. Nie wykonywano commit, push, uploadu ani nowego buildu w tym zadaniu.
