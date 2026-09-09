# ExerciseCard — RDL, cel tygodnia, przypięta notatka

Data: 2026-09-09. Zakres zamrożony po końcowym przebiegu opisanym poniżej. Dane wyłącznie syntetyczne (`e2e-test-user`); Firebase i Cloud Functions zablokowane, zapisy tylko przez istniejący lokalny tryb E2E. Bez zapisów na realnym koncie.

## Zachowanie i zachowane informacje

Nagłówek RDL, metadane, cel tygodnia i przypięta notatka są zwarte. Wyjaśnienie celu otwiera się przyciskiem; edycja notatki działa także przy otwartym wyjaśnieniu. Długi tekst i ustawienia maszyny pozostają dostępne po zapisie i przeładowaniu. Licznik początkowy wynosi `0/3`; trzy serie zachowują ciężar `62.5 kg` i osiem powtórzeń. Przyciski wyjaśnienia, edycji i zapisu mają co najmniej 44×44 px.

Scenariusz browser: plan `3 x 8-10` → start → pominięcie rozgrzewki → cel `62.5×8` i `Pin nr6` → wyjaśnienie → edycja długiej notatki oraz ustawień maszyny → zapis → cold reload → ten sam cel, dane i `0/3`, bez ponownego promptu rozgrzewki. Przy powiększonym tekście dodatkowo pionowe odsłonięcie zawiniętych kontrolek → pomiar rzeczywistego hitboxu → klik usunięcia nietkniętej serii → `0/2` → cel nadal `62.5×8` → otwarcie kalkulatora. Usuwanie nietkniętej serii pozostaje natychmiastowe; dotknięte lub ukończone serie zachowują istniejące potwierdzenie.

## Potwierdzone błędy naprawione w tym przebiegu

1. **Cel po rozpoczęciu/resume tracił prescription planu.** `buildDayFromDraft` zastępował `3 x 8-10` etykietą liczby rzeczywistych serii, np. `3 serii`. Silnik progresji traktował ją jako zakres MAX i pokazywał utrzymanie 60 kg mimo poprawnie wypełnionych pól 62.5×8. Zachowano prescription ćwiczenia z planu; liczba faktycznych serii nadal pochodzi z draftu w UI. Lista planu, ćwiczenia dodatkowe, zamienniki i dane wpisane przez użytkownika pozostały zachowane. RED 2/2, następnie GREEN 67/67 w pięciu bezpośrednich plikach. Regresja obejmuje start → inna szybka sesja → cold resume oraz prescription czasu i różną liczbę serii draftu. Dowody: `target-prescription-red.log`, `target-prescription-green.log`.
2. **Tabela ucinała kontrolki przy 320 px i większym tekście.** Przycisk rósł w rem, a kolumna pozostawała 44 px; karta odcinała nadmiar, tabela nie przewijała się. Przy 125% tekstu przycisk usunięcia miał granice x291–335 przy karcie x20–300; dostępne było tylko 9 px jego szerokości. Kalkulator również wychodził poza kartę. RED obu rozmiarów tekstu potwierdził `scrollLeft=0`. Pierwsza próba lokalnego przewijania została odrzucona przez istniejący produktowy `no-horizontal-scroll-guard.test.ts`. Guard pozostał bez zmian. Finalnie tabela zawija pola i akcje, zachowując etykietę przy każdym polu. Wszystkie kontrolki mieszczą się w karcie bez przewijania poziomego. Kontener o szerokości co najmniej 18.9375rem (303 px przy standardowym tekście) przywraca zwartą siatkę (375, 390 i 393 px; patrz punkt 4), a starszy WebKit bez container queries zachowuje bezpieczny układ zawijany. Dolne przyciski również zawijają się. Fonty i docelowe hitboxy nie zostały zmniejszone. Dowody historyczne: `clipping-red.log`, `reflow-red.log`; końcowy GREEN: `reflow-final-browser.log`.

3. **Nazwa i cel przy 200% tekstu miały zbyt wąską kolumnę.** Geometryczny RED wykazał 66 px dla nazwy przy dostępnych 192 px. Dla ciasnego kontenera poniżej 12rem nazwa i tekst celu zajmują teraz pełny wiersz, a miniatura/menu oraz ikona/wyjaśnienie celu osobny. Finalnie oba silniki potwierdzają szerokość nazwy **192/192 px**, celu **152/152 px**, przy niezmienionym foncie nazwy **32 px**. Screenshot WebKit został obejrzany: nazwa zawija pełne wyrazy, nie słupek liter. Zwykły układ 393 oraz tabela pozostały bez zmian. Dowody: `header-red.log`, `header-final-browser.log`.

4. **Próg reflow obejmował niepotrzebnie zwykłe telefony 375/390 px.** Pierwotne 20rem dopasowano tylko do 393 px. Nowe dwa scenariusze RED wymagają pojedynczego rzędu ≤64 px, wspólnej osi czterech kontrolek i zachowania minimalnych szerokości. Finalny próg to 303 px przy standardowym tekście (18.9375rem): numer serii może oddać 4 px (`minmax(20px,24px)`), poprzedni wynik zachowuje minimum 39 px, kg minimum 56 px, powtórzenia i przyciski minimum 44 px. Początkowe obniżenie progu ujawniło na screenie 375 ucięcie `60×10` o 4 px; osobny RED potwierdził je przez `scrollWidth > clientWidth`. Po dopasowaniu minimów pełne `60×10` jest czytelne w obu silnikach, bez ellipsis. Rząd ma dokładnie 60 px, a pola i przyciski pozostają w jednej osi. 393 oraz reflow 320 przy większym tekście zachowane. Dowody RED: `compact-width-red.log`, `previous-width-red.log`; finalny GREEN: `compact-width-final-browser.log`.

## Pomiary finalnego renderu

| Silnik / viewport | Tekst root | Początek tabeli od góry karty | Przycisk usunięcia po zawinięciu |
| --- | --- | ---: | --- |
| Chromium / 375×812 | 16 px | 197.125 px | pojedynczy rząd 60 px, pełne 60×10 |
| WebKit / 375×812 | 16 px | 197.125 px | pojedynczy rząd 60 px, pełne 60×10 |
| Chromium / 390×844 | 16 px | 197.125 px | pojedynczy rząd 60 px, pełne 60×10 |
| WebKit / 390×844 | 16 px | 197.125 px | pojedynczy rząd 60 px, pełne 60×10 |
| Chromium / 393×852 | 16 px | 197.125 px | zwykły układ; kontrolki mieszczą się |
| WebKit / 393×852 | 16 px | 197.125 px | zwykły układ; kontrolki mieszczą się |
| Chromium / 320×852 | 20 px (125%) | 275.750 px | 55×55 px, środek odbiera klik |
| WebKit / 320×852 | 20 px (125%) | 290.875 px | 55×55 px, środek odbiera klik |
| Chromium / 320×852 | 32 px (200%) | 919.250 px | 88×88 px, środek odbiera klik |
| WebKit / 320×852 | 32 px (200%) | 957.750 px | 88×88 px, środek odbiera klik |

Przy 200% cała treść wymaga przewijania pionowego i pełne wyrazy nagłówka zawijają się bez obcięcia; nie twierdzimy, że serie mieszczą się w pierwszym ekranie. Nazwa i dokument nie mają poziomego overflow. Tabela nie wymaga przewijania poziomego: test sprawdza `scrollWidth <= clientWidth + 1`. Dodatkowe cztery scenariusze obejmują wszystkie pięć typów śledzenia: ciężar/powtórzenia, masa ciała, asysta, czas i ciężar/dystans/czas. Łącznie 84 pomiary pól i przycisków potwierdzają pełne zawarcie w wierszu oraz minimum 44×44 px; edycja i anulowanie usunięcia zachowują wpisaną wartość. Surowe pomiary: `chromium/reflow-tracking-{20,32}.json` i `webkit/reflow-tracking-{20,32}.json`.

Dodatkowe screenshoty i pomiary zwykłych telefonów: `{chromium,webkit}/rdl-375x812.{png,json}` i `{chromium,webkit}/rdl-390x844.{png,json}`. Screenshoty 375 zostały obejrzane po finalnym dopasowaniu poprzedniego wyniku. Pozostałe screenshoty i surowe pomiary: `chromium/rdl-393x852.{png,json}`, `chromium/rdl-320x852-text125.{png,json}`, `chromium/rdl-320x852-text200.{png,json}` oraz analogiczne pliki w `webkit/`. Screenshot 393 px został obejrzany wizualnie; zawiera pełną nazwę, zwarty cel, `Pin nr6`, `0/3` i wszystkie trzy serie.

## Weryfikacja i granice dowodu

- Końcowy browser: **28/28 PASS, 1.2 min**, Chromium i WebKit; `compact-width-final-browser.log`. Obejmuje 14 scenariuszy density (375/390/393 normalnie, 320 przy 125/200% oraz wszystkie typy śledzenia) i 14 sprawdzeń etykiet/kolejności/przepływów. Zachowano realne odczyty IDB duration/distance/assist oraz plan → szybka sesja → powrót → zakończenie → potwierdzony sync. Test swapu przeszedł bez zmian timeoutów. Poprzednie poprawne etapy: `header-final-browser.log`, `reflow-final-browser.log`. Starsze logi `final-browser.log` i `clipping-*.log` opisują historyczną próbę ze scrollem i nie stanowią dowodu finalnego rozwiązania.
- Końcowe testy zakresu po reflow nagłówka i tabeli: **126/126 PASS w 9 plikach**, w tym nienaruszony guard bez poziomego scrolla; `compact-width-unit.log`. Zachowane testy obsługi czasu, ukończenia serii, wartości dziesiętnych i danych planu.
- `npm run typecheck`: PASS (`compact-width-typecheck.log`). `npm run lint`: exit 0, brak błędów, 15 ostrzeżeń react-refresh w plikach poza tym zakresem (`compact-width-lint.log`). Pełne bramki repo wykonuje prowadzący po freeze.
- Test powiększa font root przeglądarki; **nie jest dowodem iOS Dynamic Type ani realnego urządzenia**. Screen-off/suspend i natywna klawiatura nie były wykonywane w tym bounded przebiegu. Zmieniono prezentację karty i zachowanie prescription w modelu widoku; bez zmian mechanizmów timerów, trwałości draftu, ACK i synchronizacji.
- Finalny test odsłania przycisk przez przewinięcie pionowe na środek ekranu (poza stałą nawigacją) i czeka na rzeczywistą dostępność środka hitboxu po cold reload, a następnie klika. Nie zmieniano produkcyjnego odtwarzania scrolla. Nowy scenariusz wszystkich typów dopuszcza już samoczynnie wygaszony toast rozpoczęcia treningu; nie jest to badana kontrolka.

Selektory E2E dostosowano do dokładnie jednej widocznej etykiety globalnej lub przy pierwszym wierszu; nie wybierają ukrytego elementu przez gołe `.first()`. Dla `Ser.` i `Poprz.` w reflow test weryfikuje także rzeczywistą etykietę `::before` i jej geometrię. Bez pomijania testów ani osłabiania asercji danych.

Ostatnie zmienione źródła tego zbiorczego zakresu: `ExerciseCard.tsx`, `PinnedNoteSection.tsx`, `workout-day-view.ts` i scoped style karty `exercise-set-*` i `exercise-card-*` w `index.css`; bez dalszego rozszerzania zakresu. Źródła i test E2E zamrożone, Vite 8080 zwolniony prowadzącemu.
