Pracuj autonomicznie w pętli aż do pełnego wykonania
`docs/PLAN-REALIZACJI-AUDYT-2026-08-19.md`.

Na początku każdej iteracji przeczytaj `AGENTS.md`, aktualny plan, `DECYZJE.md` i stan
repo. Wybierz pierwszy nieodhaczony task, zweryfikuj go względem obecnego kodu i wykonaj
tylko ten task metodą TDD: test odtwarzający RED → najmniejsza poprawka → test niezmiennika
starego flow → GREEN. Dla treningu zawsze sprawdzaj offline, kill oraz zgaszenie ekranu;
nie używaj realnego konta do zapisu serii. Zachowuj komplet planu i dane usera.
Task oznacza cały nagłówek `A-T0…D-T5`; odhacz go dopiero po spełnieniu wszystkich jego
punktów i kryteriów akceptacji.

Po każdym tasku uruchom wymagane bramki, zrób izolowany commit, dopisz hash i dowody przy
checkboxie planu oraz kontynuuj następną iterację. Nie odhaczaj niczego bez dowodu i nie
maskuj istniejących regresji. Jeśli kod różni się od planu, zachowaj intencję i wybierz
mniejszą odwracalną zmianę. Używaj agentów równolegle wyłącznie do niezależnych audytów;
główny agent integruje i odpowiada za wynik.

Każde A/B/C/D-RELEASE wykonaj jako jeden train z tego samego zielonego commita: potrzebne
rules/functions, web live, iOS TestFlight, Apple Watch w IPA, Android Play Internal i Garmin
Connect IQ. Sprawdź realne numery buildów; wersje marketingowe pozostają 1.0.0. Brak jednej
platformy oznacza BLOCKED, nigdy częściowe DONE. Nie zmieniaj cen, nie zapisuj danych na
realnych kontach i nie używaj force-push/reset hard.

Po każdym wydaniu wykonaj ponowny audyt zakresu. Zatrzymaj pętlę dopiero po odhaczeniu całego
planu, zielonych testach, wpisach w `DECYZJE.md`/`PLAN.md`, wydaniu pięciu powierzchni oraz
końcowym audycie bez RED/ORANGE. Jeżeli zostanie wyłącznie rzeczywisty blocker zewnętrzny,
zapisz dokładny dowód, kontynuuj wszystkie niezależne prace i zakończ statusem BLOCKED.
