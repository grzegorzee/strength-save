# Prompt do nowego okna agenta (wdrożenie planów X12A, X12B, X12C)

```text
Przejmij wdrożenie planów X12 projektu Strength Save (cwd: /Users/grzegorzjasionowicz/FIRMA/projekty/strength_save).

Przeczytaj najpierw, w tej kolejności:
1. CLAUDE.md projektu (zasady Karpathy, checklist wdrożeniowy, pułapki iOS/background).
2. docs/PLAN-X12A-2026-07-17.md, docs/PLAN-X12B-2026-07-17.md, docs/PLAN-X12C-2026-07-17.md. To jest obowiązujący zakres: Z86-Z93.
3. docs/DESIGN.md (Kinetic Precision: tokeny, typografia; nowy UI wyłącznie tokenami).
4. NEXT_AGENT.md WYŁĄCZNIE sekcje o pułapkach buildu iOS i pipeline TestFlight (numery buildów w tym pliku są NIEAKTUALNE, pułapki aktualne: build:mobile vs web base, npm run deploy nadpisuje dist, RTK przepisuje npx cap, używaj ./node_modules/.bin/cap).

GOAL: wykonać WSZYSTKIE trzy plany w kolejności X12A -> X12B -> X12C, zadanie po zadaniu, każdy plan aż do wdrożonego release (web + iOS TestFlight) i raportu. Definicja done: wszystkie checkboxy trzech planów odhaczone, trzy release trainy wykonane, wersja aplikacji = 1.0.0 (od X12B), raport zbiorczy dostarczony.

LOOP (powtarzaj, aż wszystkie checkboxy trzech planów są odhaczone):
1. Otwórz bieżący plan i znajdź PIERWSZY nieodhaczony krok.
2. Wykonaj dokładnie ten krok. Zmiana kodu = najpierw failing test (TDD z bezpiecznikiem).
3. Zweryfikuj wynik poleceniem/testem podanym w kroku. Czerwone = napraw w ramach zadania; nie idź dalej z czerwonym.
4. Odhacz checkbox w pliku planu (- [x]) i commituj wg konwencji zadania.
5. Na checkpointach faz odpal pełne bramki: npm run test, typecheck, lint, build, check:bundle-budget, e2e:mock (na release train dodatkowo check:dist-smoke).
6. Po ostatnim kroku planu: raport dla usera, przejdź do następnego planu bez czekania.
Pętlę przerywasz TYLKO w dwóch sytuacjach: (a) krok wymaga jawnej zgody usera (Z86.5 naprawa danych produkcyjnych, decyzje produktowe nie do wywnioskowania z kodu), (b) czerwona bramka, której nie umiesz naprawić w ramach zadania. Wtedy zatrzymaj się, opisz stan i zadaj konkretne pytanie. Bezpiecznik TDD (znalezisko niepotwierdzone testem) NIE przerywa pętli: wpis do DECYZJE.md i następne zadanie.

Twarde zasady:
- Użyj skilla superpowers:executing-plans (albo subagent-driven-development). Zadania PO KOLEI. Nie przeskakuj checkpointów.
- Weryfikacja przed deklaracją sukcesu (superpowers:verification-before-completion): "kompiluje się" to nie jest done. Dla każdego fixu wykonaj scenariusz użytkownika (e2e albo ręczny na dev serverze), wynik do raportu. Zielone stare testy NIE dowodzą, że nowa rzecz działa.
- Chirurgicznie: jedno zadanie = izolowane commity wg konwencji z planów. Zero poprawiania sąsiedniego kodu. Usuwasz kod: usuń osierocone importy, klucze i18n (OBA pliki pl.ts i en.ts), flagi, testy.
- Środowisko docelowe to siłownia: przy każdej zmianie w treningu pierwsze pytanie "co się dzieje, gdy ekran gaśnie" (iOS wstrzymuje JS; wszystko, co ma przeżyć tło, żyje w IndexedDB/localStorage).
- Dane usera ŚWIĘTE: zero testowych zapisów na realnym koncie. Diagnoza produkcyjna (Z86.1) wyłącznie read-only. Naprawa danych usera (Z86.5) WYŁĄCZNIE po przedstawieniu diffa i jawnej zgodzie usera.
- Deploy: autoryzacja stała usera (X10/X11) obejmuje git push, npm run deploy, firebase deploy i TestFlight w fazach release train. Poza release train NICZEGO nie wdrażaj.
- Wersjonowanie (od X12B): MARKETING_VERSION, package.json version i versionName = 1.0.0 NA SZTYWNO do launchu. Bump tylko CURRENT_PROJECT_VERSION (+1 per build TestFlight, 6 wystąpień równych w pbxproj, pilnuje release-ios-preflight.mjs).
- i18n: polskie teksty z pełnymi znakami, bez pauz em-dash.
- POCZEKALNIA (nie implementuj, czeka na decyzję usera): przeniesienie "Narzędzi naprawczych" z Ustawień za flagę admina + zdalne naprawy kont z panelu admina przez Cloud Functions. Jeśli dotykasz tych narzędzi (Settings/DataManagement), NIE zmieniaj ich widoczności.
- Po każdej fazie wpis do DECYZJE.md (co, dlaczego, root cause, weryfikacja).

Zakończ całość raportem zbiorczym: X12A root cause wskrzeszonego planu, X12B co wycięte + potwierdzenie 1.0.0, X12C screenshot karty Miesiące, wyniki wszystkich bramek per plan, co odłożone i dlaczego, scenariusz testu terenowego dla usera, lista następnych kroków z backlogu (P0 walidacja onSnapshot, M19 offline mode, M20 eksport PDF, web push, Android Google Play).
```
