# PROMPT: autonomiczne wdrożenie X17 (UX ekranu treningu v2)

Skopiuj poniższy blok jako pierwszą wiadomość w nowej sesji w `~/FIRMA/projekty/strength_save`.

---

Przejmij wdrożenie planów X17. Pracuj w `/Users/grzegorzjasionowicz/FIRMA/projekty/strength_save`.

KOLEJNOŚĆ (ścisła):
1. `docs/PLAN-X17A-2026-07-20.md` — karta ćwiczenia v2 (Z128-Z131)
2. `docs/PLAN-X17B-2026-07-20.md` — kalkulator talerzy v2 (Z132-Z134)
3. `docs/PLAN-X17C-2026-07-20.md` — timery przerw v2 (Z135-Z137)
4. `docs/PLAN-X17D-2026-07-20.md` — statystyki + animacja „+1" (Z138-Z140)

Karta pierwsza, bo ustawia układ, w który wchodzą timery. Kalkulator przed timerami, bo generator rozgrzewki korzysta z jego inwentarza.

TRYB: 100% autonomiczny. User zatwierdził całość 2026-07-20 i nie podejmuje decyzji w trakcie. Nie zatrzymuj się, nie pytaj o zgodę na kroki, które są w planach. Pracuj do wyczerpania limitów sesji; wznowienie = ten sam prompt w nowej sesji.

ŹRÓDŁO PRAWDY O POSTĘPIE: checkboxy `- [ ]` w plikach planów. Odhaczaj NATYCHMIAST po wykonaniu i commituj plan razem z kodem. Zaczynając, znajdź pierwszy nieodhaczony krok.

PĘTLA: znajdź pierwszy nieodhaczony krok → wykonaj (TDD: test first tam, gdzie plan tak mówi) → zweryfikuj → odhacz + commit → przy checkpointach pełne bramki → push.

DECYZJE USERA, KTÓRE JUŻ ZAPADŁY (nie podważaj):
- Rzadkie akcje ćwiczenia (instrukcje, zamień, pomiń, przypnij notatkę) idą do menu `⋯` w nagłówku karty.
- Timery przerw wracają zza flagi w ramach tej roboty (X17C).
- Kolory talerzy: neutralne domyślnie, presety IWF/IPF opcjonalnie.
- Grywalizacja tylko na ekranie statystyk, nigdy w ekranie treningu.

TWARDE ZASADY:
- **Kontrakt `memo()`**: callbacki do `ExerciseCard` mają sygnaturę `(exerciseId, ...)` i są `useCallback` w `WorkoutDay`. Lambda inline per karta = powrót re-render bomby R2-07. Dotyczy też nowych akcji z menu `⋯`.
- Obie ścieżki renderu serii (stara `weight_reps`/`bodyweight_reps` i `renderTrackedSetRow` z Z105) muszą przechodzić testy.
- Ścieżka logowania serii nie może zwolnić.
- Zero ramek 1px do sekcjonowania (`docs/DESIGN.md`, „No-Line Rule"). Granice przez przesunięcia tła. Od konkurencji bierzemy architekturę informacji, NIE wygląd.
- Timery: sygnał przy zgaszonym ekranie wyłącznie przez local notification, stan jako DEADLINE nie licznik. `setInterval` tylko do animacji na wierzchu.
- Bez nowych zależności animacyjnych (brak `framer-motion` w projekcie). Wzorzec: `ConfettiBurst.tsx`.
- Nowe klucze i18n do OBU plików (`pl.ts` + `en.ts`).
- Kg kanoniczne, konwersja jednostek tylko w UI.
- Dane userów święte: testy zapisu wyłącznie na koncie testowym albo emulatorze, nigdy na koncie admina.
- Chirurgiczne commity per zadanie. Wpis do `DECYZJE.md` po każdej fazie.

BRAMKI (bez `| tail` — pipe maskuje exit code):
`npm run test`, `npm run typecheck`, `npm run lint`, `npm run build`, `npm run check:bundle-budget`, `npm run check:dist-smoke` (na `build:mobile`!), `npm run check:dist-offline` (na buildzie web!), `npm run e2e:mock`, `npm run test:rules` gdy dotkniesz reguł (JAVA_HOME=/opt/homebrew/opt/openjdk@21).

Przy webkitowych failach e2e: sprawdź solo-runem czy to flak, i bisektem czy nie failowało przed Twoimi zmianami (znany środowiskowy fail: `analytics-pdf.spec.ts` na webkit).

DEPLOY (autoryzacja stała usera): `git push`, `npm run deploy`, `firebase deploy` (rules/functions), TestFlight — w fazach release train każdego planu. Po KAŻDYM uploadzie: `uv run --with "pyjwt[crypto]" --with requests scripts/testflight_external.py <build> --whats-new "..."` (po polsku, konkretnie co user zobaczy). Nigdy dwa pipeline'y iOS równolegle.

WERSJONOWANIE: 1.0.0 na sztywno. Bump wyłącznie `CURRENT_PROJECT_VERSION` (6 wystąpień, wszystkie równe).

OBSŁUGA PRZESZKÓD:
- Bramka czerwona → debuguj systematycznie (`superpowers:systematic-debugging`), nie obchodź.
- Coś poza zakresem planu → ODŁOŻONE z jednozdaniowym opisem w pliku planu.
- Blokada zewnętrzna (X17C krok 2 fazy 3 wymaga fizycznego iPhone) → zrób wszystko co się da, resztę odłóż z jawną listą KROKÓW USERA. Flaga timerów zostaje wyłączona, dopóki test na urządzeniu nie wypadnie zielono.

WERYFIKACJA WIZUALNA: zrzuty przed/po z symulatora iPhone 17 (UDID `8F8734A8-5063-41DE-B465-1697B8F4771C`) dla karty ćwiczenia i arkusza kalkulatora. Nie loguj serii na koncie admina — używaj trybu E2E mock.

SCENARIUSZ OBOWIĄZKOWY przed każdym release trainem (reguła 5 w `CLAUDE.md`): plan → wyjście → szybki trening → powrót do planu → wszystkie ćwiczenia na miejscu → zakończenie → sync.

RAPORTY: po każdym planie krótki raport (co zmienione, zrzuty przed/po, co odłożone). Po X17D raport całości: tabela 4 planów, lista KROKÓW USERA, backlog v2.
