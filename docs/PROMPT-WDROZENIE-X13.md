# Prompt do nowego okna agenta (wdrożenie planów X13A, X13B, X13C: panel admina) — tryb w pełni autonomiczny

```text
Przejmij wdrożenie planów X13 (panel admina) projektu Strength Save (cwd: /Users/grzegorzjasionowicz/FIRMA/projekty/strength_save).

Przeczytaj najpierw, w tej kolejności:
1. CLAUDE.md projektu (zasady Karpathy, checklist wdrożeniowy, pułapki iOS/background).
2. docs/PLAN-X13A-2026-07-17.md, docs/PLAN-X13B-2026-07-17.md, docs/PLAN-X13C-2026-07-17.md. To jest obowiązujący zakres: Z94-Z102 (telemetria produktowa -> panel admina 2.0 -> zdalne naprawy i audyt).
3. docs/DESIGN.md (Kinetic Precision; nowy UI wyłącznie tokenami, celowe wyjątki panelu admina zostają).
4. NEXT_AGENT.md WYŁĄCZNIE sekcje o pułapkach buildu iOS i pipeline TestFlight (numery buildów NIEAKTUALNE, pułapki aktualne: build:mobile vs web base, npm run deploy nadpisuje dist, RTK przepisuje npx cap, używaj ./node_modules/.bin/cap).

WARUNEK WSTĘPNY: plany X12 muszą być wdrożone (wpisy release X12A/B/C w DECYZJE.md, wersja 1.0.0 w package.json). Jeśli NIE są: najpierw wykonaj w całości docs/PROMPT-WDROZENIE-X12.md, dopiero potem X13. Nie pytaj o to usera, sprawdź i działaj.

GOAL: wykonać WSZYSTKIE trzy plany w kolejności X13A -> X13B -> X13C, zadanie po zadaniu, każdy plan aż do wdrożonego release (web + rules + functions + iOS TestFlight) i raportu. Definicja done: wszystkie checkboxy trzech planów odhaczone, trzy release trainy wykonane, admin (g.jasionowicz@gmail.com) widzi w panelu listę userów z aktywnością, szczegół usera (wykres 30 dni, top ekrany i akcje, plan treningowy, uprawnienia w tym Strava, błędy klienta), wykonuje naprawy kont z dry-run i backupem, a każda akcja admina ląduje w dzienniku.

TRYB: 100% AUTONOMICZNY. User zatwierdził całość 2026-07-17 i NIE podejmuje żadnych decyzji w trakcie. NIE zatrzymuj się, NIE zadawaj pytań, NIE czekaj na potwierdzenia. Każdą decyzję podejmij sam wg planów; gdy plan nie rozstrzyga, wybierz wariant prostszy i zgodny z zasadami projektu, wybór z uzasadnieniem wpisz do DECYZJE.md. Bezpieczniki zamiast pytań: dry-run przed każdym apply, backup dokumentów przed każdą naprawą, zero zapisów testowych na cudzych produkcyjnych kontach.

LOOP (powtarzaj, aż wszystkie checkboxy trzech planów są odhaczone):
1. Otwórz bieżący plan i znajdź PIERWSZY nieodhaczony krok.
2. Wykonaj dokładnie ten krok. Zmiana kodu = najpierw failing test (TDD z bezpiecznikiem).
3. Zweryfikuj wynik poleceniem/testem podanym w kroku. Czerwone = napraw w ramach zadania; nie idź dalej z czerwonym.
4. Odhacz checkbox w pliku planu (- [x]) i commituj wg konwencji zadania.
5. Na checkpointach faz odpal pełne bramki: npm run test, typecheck, lint, build, check:bundle-budget, e2e:mock, a tam gdzie plan wymaga: test:rules (JDK21) i testy functions. Na release train dodatkowo check:dist-smoke.
6. Po ostatnim kroku planu: raport, przejdź do następnego planu bez czekania.
Pętli NIE przerywasz. Obsługa przeszkód zamiast zatrzymania: (a) bezpiecznik TDD (znalezisko niepotwierdzone testem) = wpis do DECYZJE.md i następne zadanie; (b) bramka czerwona = debuguj systematycznie aż zielona (superpowers:systematic-debugging), a jeśli po rzetelnych próbach fix wykracza poza zakres zadania: oznacz zadanie jako ODŁOŻONE w pliku planu z opisem, wpis do DECYZJE.md, kontynuuj (release train wykonaj tylko przy pełnych zielonych bramkach; inaczej dokończ resztę bez deployu i wypisz w raporcie jako TOP priorytet); (c) brak dostępu/credentials = spróbuj wszystkich udokumentowanych ścieżek (_secrets, gcloud application-default, skrypty projektu), dopiero po wyczerpaniu odłóż KROK i jedź dalej.

Twarde zasady:
- Użyj skilla superpowers:executing-plans (albo subagent-driven-development). Zadania PO KOLEI. Nie przeskakuj checkpointów.
- Weryfikacja przed deklaracją sukcesu (superpowers:verification-before-completion): dla każdej funkcji wykonaj scenariusz użytkownika (e2e, emulator albo ręczny na dev serverze), wynik do raportu. Zielone stare testy NIE dowodzą, że nowa rzecz działa.
- ROZBUDOWUJESZ istniejący panel (AdminDashboard, UserPlanEditor, AdminRoute, isAdmin, app_telemetry_daily), NICZEGO nie budujesz od zera równolegle. Nowe rzeczy jako osobne komponenty/moduły, minimalne wpięcia.
- Chirurgicznie: jedno zadanie = izolowane commity. Zero poprawiania sąsiedniego kodu. Usuwasz kod: usuń osierocone importy, klucze i18n (OBA pliki pl.ts i en.ts), testy.
- Koszty Firestore: żadnych zapisów per klik (tylko istniejący bufor telemetrii), lista userów bez skanowania kolekcji workouts, rollup O(aktywnych), TTL wg planów.
- Bezpieczeństwo: klient admina NIGDY nie dostaje prawa zapisu do cudzych dokumentów; zapisy na cudzych kontach wyłącznie przez callable Functions z serwerową weryfikacją roli admin. Rules z zamkniętymi schematami + testy rules przy każdej zmianie.
- Dane userów ŚWIĘTE: apply napraw tylko po backupie (admin_repair_backups); testy apply wyłącznie na koncie testowym/emulatorze, nigdy na cudzych kontach produkcyjnych.
- Deploy: autoryzacja stała usera obejmuje git push, npm run deploy, firebase deploy (rules i functions) i TestFlight w fazach release train. Poza release train NICZEGO nie wdrażaj.
- Wersjonowanie: 1.0.0 NA SZTYWNO (MARKETING_VERSION, package.json, versionName). Bump tylko CURRENT_PROJECT_VERSION (+1 per build TestFlight, 6 wystąpień równych w pbxproj).
- i18n: polskie teksty z pełnymi znakami, bez pauz em-dash.
- Po każdej fazie wpis do DECYZJE.md (co, dlaczego, weryfikacja).

Zakończ całość raportem zbiorczym: X13A kształt telemetrii + potwierdzenie realnych danych z produkcji, X13B screenshoty listy userów i szczegółu usera, X13C wynik dry-run przykładowej naprawy + wpis w dzienniku akcji, wyniki wszystkich bramek per plan, zadania odłożone z uzasadnieniem, koszty (zapisy/odczyty/wywołania Functions), przypomnienie o App Privacy w App Store Connect przed publicznym launchem, propozycja następnych kroków.
```
