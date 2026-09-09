# Android 50 — zwarta tabela serii na telefonie 360 px

Status: naprawione lokalnie, źródła zamrożone. Punkt wyjścia: `dc68e3a6`, zgłoszenie dotyczące wydanego Androida 50. Brak publikacji/bumpu w tym zadaniu.

## Dowód i przyczyna

Użytkownik: Huawei P30 Pro VOG-L29, Android 10 / EMUI 11, standardowy tekst i skala. Obejrzano IMG_2637.jpeg: przyszły piątek, OHP siedząc, trzy serie; numer/POPRZ zajmują osobny rząd nad polami. Nie znamy wersji Android System WebView urządzenia.

Dwie osiągalne przyczyny w `src/index.css`:

1. Przy viewport 360 px karta ma 320 px, a tabela po bocznym paddingu tylko 288 px. Próg siatki to 303 px, więc nawet aktualny silnik wybiera wysoki fallback.
2. Fallback deklarował dla numeru serii i poprzedniego wyniku po około 50% szerokości. Silnik ignorujący `@container` dostawał ten układ na każdej szerokości.

RED przed zmianą źródeł: `table-red.log`, dwa testy Chromium 360 px, wysokość wiersza **132,5 px**. Test używa prawdziwego DOM/CSS i geometrii; jsdom nie oblicza tego układu.

## Zmiana i niezmienniki

- Do 374 px tabela odzyskuje 16 px przez padding boczny 8 px. Na 360 px ma 304 px i mieści dotychczasową siatkę. Modern 375/390/393 bez zmiany układu.
- Fallback używa naturalnych szerokości numeru, historii, pól oraz przycisków. Wszystko mieści się w jednym rzędzie przy standardowym tekście; większy tekst może zawijać pola. Zachowane etykiety i każda kontrolka, bez poziomego przewijania.
- Jawne klasy `exercise-set-duration` i `exercise-set-reps` utrzymują reguły CSS w wyniku kompilacji Tailwinda. Minuty i sekundy w fallbacku pozostają celami co najmniej 44 px.
- Zmiany nie dotykają źródeł ćwiczeń, prescription, liczb, draftu, ACK, timera ani synchronizacji. Plan nadal ma oba ćwiczenia i wszystkie serie po reloadzie.

## Wynik

| Scenariusz | Wynik |
|---|---|
| 360 px, standardowy tekst, modern | Wiersz 60 px przed startem i w sesji |
| 360 px, bez reguł kontenera | Wiersz 80,5 px przed startem i w sesji |
| 375/393 modern i bez reguł kontenera | Zwarty wiersz, komplet kontrolek |
| Wszystkie 5 tracking types bez reguł kontenera przy 360 px | Wszystkie pola i usuwanie dostępne, minimum 44 px |
| 375/390/393 oraz 320 przy 125% i 200% tekstu | Istniejące testy density i wszystkich typów nadal przechodzą |
| 42.5 kg / 11 powt. → IDB → reload | Dane zachowane, oba ćwiczenia i 3 serie obecne |

34/34 E2E Chromium/WebKit (wliczając 6 testów notatki opisanych w REPORT.md), 130/130 targeted unit, typecheck, scoped lint i build PASS. `browser-verified.log`, `unit-final.log`, `typecheck.log`, `lint-final.log`, `build.log`. Root wykonuje osobno pełną walidację wydania i sekwencję przerwania treningu.

Przykłady: `webkit/workout-360-modern.png`, `webkit/workout-360-legacy.png`, odpowiadające JSON z geometrią. Nowe wyniki starego density spec skopiowano do `regression-density/`; wcześniejsze dowody wydania 50 w `../exercise-card/` przywrócono bajtowo z HEAD.

## Granica weryfikacji

Wyłączenie reguł kontenera polega na usunięciu wszystkich `@container` z prawdziwego CSSOM. To kontrolowany test braku tej funkcji, **nie emulator całego starego WebView ani fizyczny test Huawei**. Wersja WebView telefonu jest nieznana. Brak urządzenia: fizyczny Huawei, screen-off/resume i rzeczywista klawiatura systemowa NOT RUN. Przed potwierdzeniem naprawy u użytkownika potrzebny zainstalowany nowy build, ten sam plan, 3 serie, edycja/liczby, zgaszenie ekranu i powrót. Weryfikacja obecnego wydanego builda 50 nie obejmuje tej jeszcze nieopublikowanej poprawki.
