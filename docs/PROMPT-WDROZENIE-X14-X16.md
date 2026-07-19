# Prompt do nowego okna agenta (wdrożenie planów X14, X15, X16: wyprzedzenie konkurencji) — tryb w pełni autonomiczny, praca do wyczerpania limitów

> Skopiuj blok poniżej do nowej sesji Claude Code w cwd projektu. Ten sam prompt służy też do WZNOWIENIA po wyczerpaniu limitów: agent sam znajduje pierwszy nieodhaczony checkbox i jedzie dalej.

```text
Przejmij wdrożenie planów X14, X15 i X16 projektu Strength Save (cwd: /Users/grzegorzjasionowicz/FIRMA/projekty/strength_save).

Przeczytaj najpierw, w tej kolejności:
1. CLAUDE.md projektu (zasady Karpathy, checklist wdrożeniowy, pułapki iOS/background, dane usera święte).
2. Plany w kolejności wykonywania:
   - docs/PLAN-X14A-2026-07-19.md (Z103-Z104: przypięte notatki + szybki trening bez planu)
   - docs/PLAN-X14B-2026-07-19.md (Z105-Z108: typy serii czas/dystans/asysta + PR asysty + kalkulatory)
   - docs/PLAN-X14C-2026-07-19.md (Z109-Z110: import CSV Strong/Hevy)
   - docs/PLAN-X15A-2026-07-19.md (Z111-Z113: ręczne cardio bez Stravy)
   - docs/PLAN-X15B-2026-07-19.md (Z114-Z115: obciążenie hybrydowe siła+cardio, interferencja)
   - docs/PLAN-X15C-2026-07-19.md (Z116-Z118: Apple Health + Health Connect)
   - docs/PLAN-X16A-2026-07-19.md (Z119-Z121: progresja programowa + deload)
   - docs/PLAN-X16B-2026-07-19.md (Z122-Z124: Apple Watch v1)
   - docs/PLAN-X16C-2026-07-19.md (Z125-Z126: Garmin; ma BLOKADĘ ZEWNĘTRZNĄ, patrz plan)
3. docs/DESIGN.md (Kinetic Precision; nowy UI wyłącznie tokenami).
4. START.md sekcja "Historia odporna na zmianę planu" (snapshot + resolver; X14A/X14C na tym stoją).
5. NEXT_AGENT.md WYŁĄCZNIE sekcje o pułapkach buildu iOS i pipeline TestFlight (numery buildów NIEAKTUALNE, pułapki aktualne: build:mobile vs web base, npm run deploy nadpisuje dist, RTK przepisuje npx cap, używaj ./node_modules/.bin/cap).

WARUNEK WSTĘPNY: X13 wdrożone (wpisy release X13A/B/C w DECYZJE.md, wersja 1.0.0 w package.json). Sprawdź i działaj, nie pytaj.

GOAL: wykonać WSZYSTKIE plany w kolejności X14A -> X14B -> X14C -> X15A -> X15B -> X15C -> X16A -> X16B -> X16C, zadanie po zadaniu, każdy plan aż do wdrożonego release (web + rules + functions gdy dotyczone + iOS TestFlight z dystrybucją external przez testflight_external.py) i raportu. Definicja done całości: wszystkie checkboxy dziewięciu planów odhaczone (albo jawnie ODŁOŻONE z uzasadnieniem), dziewięć release trainów wykonanych, a w apce działa: przypięte notatki, szybki trening, serie na czas/dystans/asystę z poprawnymi PR, kalkulator talerzy i rozgrzewki, import CSV z cofaniem, ręczne cardio widoczne w kalendarzu i TRIMP, karta obciążenia hybrydowego, sync Apple Health, cele tygodniowe z deloadem, trening z Apple Watch, połączenie Garmin (w zakresie odblokowanym przez Garmin).

TRYB: 100% AUTONOMICZNY, PRACA DO WYCZERPANIA LIMITÓW SESJI. User zatwierdził całość 2026-07-19 i NIE podejmuje decyzji w trakcie. NIE zatrzymuj się, NIE zadawaj pytań, NIE czekaj na potwierdzenia. Każdą decyzję podejmij sam wg planów; gdy plan nie rozstrzyga, wybierz wariant prostszy i zgodny z zasadami projektu, wybór z uzasadnieniem wpisz do DECYZJE.md. Bezpieczniki zamiast pytań: TDD, dry-run przed zapisami do danych, import testowany wyłącznie na koncie testowym, zero zapisów testowych na realnych kontach userów.

ODPORNOŚĆ NA LIMITY (kluczowe, sesja MOŻE się urwać w dowolnym momencie):
- Checkboxy w plikach planów są JEDYNYM źródłem prawdy o postępie. Odhaczaj (- [x]) NATYCHMIAST po weryfikacji kroku i commituj plik planu razem ze zmianą kodu. Nigdy nie trzymaj odhaczeń "w głowie" na później.
- Commituj często i atomowo (krok = commit). Working tree ma być czyste po każdym kroku. Push po każdym checkpoincie fazy (autoryzacja stała usera obejmuje git push).
- Gdy czujesz, że kontekst/limity się kończą: dokończ bieżący KROK do commita, odhacz, wypisz krótki raport stanu (ostatni ukończony krok, następny krok, rzeczy w toku) na koniec odpowiedzi. NIE zaczynaj nowego zadania, którego nie zdążysz domknąć do commita.
- WZNOWIENIE: ten sam prompt w nowej sesji. Pętla niżej zaczyna od znalezienia pierwszego nieodhaczonego kroku, więc wznowienie = normalne wykonanie pętli.

LOOP (powtarzaj, aż wszystkie checkboxy dziewięciu planów są odhaczone lub ODŁOŻONE):
1. Znajdź PIERWSZY plan z nieodhaczonym checkboxem (w kolejności wyżej), w nim PIERWSZY nieodhaczony krok. Zweryfikuj `git status` i `git log --oneline -5` względem stanu planu (czy poprzednia sesja czegoś nie zostawiła bez odhaczenia; jeśli kod kroku istnieje i przechodzi weryfikację, odhacz i jedź dalej).
2. Wykonaj dokładnie ten krok. Zmiana kodu = najpierw failing test (TDD z bezpiecznikiem).
3. Zweryfikuj wynik poleceniem/testem podanym w kroku. Czerwone = napraw w ramach zadania (superpowers:systematic-debugging); nie idź dalej z czerwonym.
4. Odhacz checkbox w pliku planu i commituj wg konwencji zadania (kod + plan w jednym commicie).
5. Na checkpointach faz odpal pełne bramki: npm run test, typecheck, lint, build, check:bundle-budget, e2e:mock, a tam gdzie plan wymaga: test:rules (JDK21: export JAVA_HOME=/opt/homebrew/opt/openjdk@21) i testy functions. Na release train dodatkowo check:dist-smoke i check:dist-offline. Po checkpoincie: git push.
6. Po ostatnim kroku planu: raport planu, przejdź do następnego planu bez czekania.
Pętli NIE przerywasz. Obsługa przeszkód zamiast zatrzymania:
(a) bezpiecznik TDD (znalezisko niepotwierdzone testem) = wpis do DECYZJE.md i następne zadanie;
(b) bramka czerwona = debuguj systematycznie aż zielona; jeśli po rzetelnych próbach fix wykracza poza zakres zadania: oznacz zadanie ODŁOŻONE w pliku planu z opisem, wpis do DECYZJE.md, kontynuuj (release train wykonaj tylko przy pełnych zielonych bramkach; inaczej dokończ resztę planu bez deployu i wypisz w raporcie jako TOP priorytet);
(c) BLOKADA ZEWNĘTRZNA (klucze Garmin niewydane, deklaracje Health w App Store Connect wymagające konta usera, brak fizycznego Apple Watch) = wykonaj wszystko co możliwe bez blokera (architektura, testy, fixtures, symulatory), oznacz pozostałość ODŁOŻONE z dokładnymi krokami dokończenia i listą KROKÓW USERA, kontynuuj następne zadanie;
(d) brak dostępu/credentials = spróbuj wszystkich udokumentowanych ścieżek (_secrets, gcloud application-default, skrypty projektu), dopiero po wyczerpaniu odłóż KROK i jedź dalej.

Twarde zasady:
- Użyj skilla superpowers:executing-plans (albo subagent-driven-development). Zadania PO KOLEI. Nie przeskakuj checkpointów.
- Weryfikacja przed deklaracją sukcesu (superpowers:verification-before-completion): dla każdej funkcji wykonaj scenariusz użytkownika (e2e, emulator, symulator albo ręczny na dev serverze), wynik do raportu. Zielone stare testy NIE dowodzą, że nowa rzecz działa.
- Weryfikacja bugów po każdej fazie: przejrzyj diff fazy pod kątem regresji (skill code-review na poziomie medium przy fazach dotykających zapisu danych: X14C import, X15A cardio, X16B watch), znalezione defekty napraw przed checkpointem.
- ROZBUDOWUJESZ istniejące mechanizmy (draft-db, maszyna stanów sesji, resolver nazw, TRIMP, useStrava, WatchApp prototyp), NICZEGO nie budujesz od zera równolegle. Nowe rzeczy jako osobne moduły, minimalne wpięcia.
- Chirurgicznie: jedno zadanie = izolowane commity. Zero poprawiania sąsiedniego kodu. Usuwasz kod: usuń osierocone importy, klucze i18n (OBA pliki pl.ts i en.ts), testy.
- Ścieżka logowania serii NIE może zwolnić (największy churn-driver kategorii): każda zmiana WorkoutDay z e2e regresją zwykłego treningu.
- Dane userów ŚWIĘTE: import i naprawy tylko z dry-run + tagiem wsadu + cofaniem; testy zapisu wyłącznie na koncie testowym/emulatorze.
- Firestore: kg/metry/sekundy kanoniczne, sanityzacja bez undefined, rules z zamkniętymi schematami + test:rules przy KAŻDEJ zmianie schematu, koszty (zero zapisów per klik, odczyty przez istniejące subskrypcje).
- Timery/tło: iOS wstrzymuje JS po zgaszeniu ekranu; sygnały w tle wyłącznie systemowe (local notifications); scenariusz background/resume obowiązuje przy każdym planie dotykającym treningu (checklist w CLAUDE.md projektu).
- Deploy: autoryzacja stała usera obejmuje git push, npm run deploy, firebase deploy (rules i functions) i TestFlight w fazach release train. Po KAŻDYM uploadzie TestFlight: testflight_external.py (Robert dostaje build). Poza release train NICZEGO nie wdrażaj.
- Wersjonowanie: 1.0.0 NA SZTYWNO (MARKETING_VERSION, package.json, versionName). Bump tylko CURRENT_PROJECT_VERSION (+1 per build, 6 wystąpień równych w pbxproj; jeśli X16B dodaje wystąpienia dla watch targetu, zaktualizuj preflight i CLAUDE.md).
- i18n: polskie teksty z pełnymi znakami, bez pauz em-dash. Każdy klucz w pl.ts I en.ts.
- Po każdej fazie wpis do DECYZJE.md (co, dlaczego, root cause przy naprawach, weryfikacja).

Raport końcowy każdego PLANU: co wdrożono (web index-hash, build iOS), wyniki bramek, scenariusze użytkownika z wynikami, zadania ODŁOŻONE + KROKI USERA, koszty (Firestore/Functions), następny plan.
Raport końcowy CAŁOŚCI (po X16C): tabela 9 planów ze statusami, lista wszystkich KROKÓW USERA (wniosek Garmin, deklaracje App Privacy Health, test na fizycznym Watch, decyzja premium gating progresji/watch), propozycja kolejnych kroków (backlog v2: Wear OS, wideo techniki top 50, heatmapa mięśni, tryb wielu siłowni).
```
