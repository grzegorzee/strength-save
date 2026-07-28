# PROMPT: autonomiczne wdrożenie X20 (naprawa zgłoszeń z builda 78)

Skopiuj poniższy blok jako pierwszą wiadomość w nowej sesji w `~/FIRMA/projekty/strength_save`.

---

Przejmij wdrożenie planu X20. Pracuj w `/Users/grzegorzjasionowicz/FIRMA/projekty/strength_save`.

PLAN: `docs/PLAN-X20-2026-07-28.md` (zadania Z154-Z161, root cause zweryfikowane w kodzie 2026-07-28).

KOLEJNOŚĆ (z sekcji "KOLEJNOŚĆ I ZALEŻNOŚCI" planu):
1. Z154 (czarny ekran analityki) i Z155 (push podczas treningu) — P1, najpierw
2. Z156 (i18n nazw ćwiczeń) → potem Z158 (kafle) — oba dotykają `AllTimeStatsSheet.tsx`, sekwencyjnie
3. Z157 (przełącznik timera) — ODBLOKOWANE: WIP animacji zacommitowany (commit `wip(animacje)`), `ExerciseCard.tsx` czysty
4. Z161 (usuwanie treningu z widoku treningu) — po Z157, oba dotykają `WorkoutDay.tsx`
5. Z159 (klawiatura, `@capacitor/keyboard`) — ostatnia zmiana klienta (nowa zależność natywna → restart vite → pełne e2e raz)
6. Z160 (mail tygodniowy) — functions, deploy razem z Z155

TRYB: 100% autonomiczny. User zatwierdził plan 2026-07-28 i nie podejmuje decyzji w trakcie. Nie zatrzymuj się, nie pytaj o zgodę na kroki, które są w planie. Pracuj do wyczerpania limitów sesji; wznowienie = ten sam prompt w nowej sesji.

ŹRÓDŁO PRAWDY O POSTĘPIE: checkboxy `- [ ]` w pliku planu. Odhaczaj NATYCHMIAST po wykonaniu z krótkim DOWODEM (komenda + wynik) i commituj plan razem z kodem. Zaczynając, znajdź pierwszy nieodhaczony krok.

PĘTLA: znajdź pierwszy nieodhaczony krok → wykonaj (TDD: test first tam, gdzie plan tak mówi) → zweryfikuj → odhacz + commit → przy bramkach pełny checklist → push.

DECYZJE USERA, KTÓRE JUŻ ZAPADŁY (nie podważaj):
- Timer przerwy: przełącznik w Profilu, default WŁĄCZONY (localStorage, bez mirrora do Firestore).
- EMOM/AMRAP + timer rozgrzewki ZOSTAJĄ wyłączone za nową flagą `VITE_FEATURE_INTERVAL_TIMERS` (mają tylko `setInterval`, milkną przy zgaszonym ekranie).
- Usunięcie serii działa dobrze — NIE dotykać.
- Usuwanie treningu: Historia JUŻ MA pełny przepływ (nie ruszać go); Z161 wystawia tę samą ścieżkę (`deleteWorkoutEverywhere`, nigdy goły `deleteDoc`) w widoku zapisanego treningu w `WorkoutDay`. Trening W TOKU bez opcji usuwania.
- Klawiatura: `@capacitor/keyboard` z `resize: 'none'` + CSS var, fix w `dialog.tsx`/`alert-dialog.tsx`, NIE zmieniać globalnego resize webview.
- Testowy digest: po deploy functions wyślij WYŁĄCZNIE na `g.jasionowicz@gmail.com` (własna skrzynka usera, krok weryfikacji zatwierdzony razem z tym promptem). Do nikogo innego.

TWARDE ZASADY (pełna lista w sekcji 0 planu):
- **NIGDY `git add -A` / `git add .`** — w repo leży nietrackowany folder `animacje-cwiczen/` (699 MB wideo). Nie wolno go dodać do gita ani ruszać. Stage'uj pliki imiennie.
- Dane usera święte: zero zapisów na produkcyjnych danych; testy na emulatorze/trybie e2e mock, nigdy na koncie admina.
- Reguła 5 CLAUDE.md: testy niezmienników starych przepływów, sekwencje nie ekrany.
- Nowe klucze i18n do OBU plików (`pl.ts` + `en.ts`).
- Kg kanoniczne, konwersja jednostek tylko w UI.
- Bundle budget bez podnoszenia limitu (~20 KB zapasu).
- Chirurgiczne commity per zadanie, `(Z15x)` w opisie. Wpis do `DECYZJE.md` po każdej fazie.
- Timery: sygnał przy zgaszonym ekranie wyłącznie local notification, stan jako DEADLINE nie licznik.

BRAMKI (bez `| tail` — pipe maskuje exit code):
`npm run test`, `npm run typecheck`, `npm run lint`, `npm run build`, `npm run check:bundle-budget`, `npm run check:dist-smoke` (na `build:mobile`!), `npm run check:dist-offline` (na buildzie web!), `npm run e2e:mock`, `cd functions && npm test`, `npm run test:rules` gdy dotkniesz reguł (JAVA_HOME=/opt/homebrew/opt/openjdk@21).

Reguła 9 CLAUDE.md: po `npm i @capacitor/keyboard` OBOWIĄZKOWO `pkill -f vite` + wyczyść `node_modules/.vite` przed e2e. E2e trwa wielokrotnie dłużej niż zwykle albo masowo pada na `page.goto` → najpierw restart vite, dopiero potem szukaj buga.

DEPLOY (autoryzacja stała usera): `git push`, `npm run deploy` (web; sam push NIE aktualizuje strony), `firebase deploy --only functions` (+ rules jeśli Z155 krok 4 tego wymaga), TestFlight. Po uploadzie iOS ZAWSZE: `uv run --with "pyjwt[crypto]" --with requests scripts/testflight_external.py 79 --whats-new "..."` (po polsku, konkretnie co user zobaczy). Nigdy dwa pipeline'y iOS równolegle.

WERSJONOWANIE: 1.0.0 na sztywno. Bump wyłącznie `CURRENT_PROJECT_VERSION` → **79** (6 wystąpień, wszystkie równe; pilnuje `release-ios-preflight.mjs`).

OBSŁUGA PRZESZKÓD:
- Bramka czerwona → `superpowers:systematic-debugging`, nie obchodź.
- Coś poza zakresem planu → ODŁOŻONE z jednozdaniowym opisem w pliku planu.
- Kroki wymagające fizycznego iPhone'a (weryfikacja klawiatury Z159, timer przy zgaszonym ekranie Z157, background/resume Z154) → zrób wszystko co się da na symulatorze (UDID `8F8734A8-5063-41DE-B465-1697B8F4771C`), resztę odłóż z jawną listą KROKÓW USERA na końcu raportu.

SCENARIUSZ OBOWIĄZKOWY przed release trainem (reguła 5 CLAUDE.md): plan → wyjście → szybki trening → powrót do planu → wszystkie ćwiczenia na miejscu → zakończenie → sync.

TECH DEBT do dopisania w `PLAN.md` (z planu, sekcja BRAMKI): (a) promocja sesji provisional przed pierwszym checkpointem (margines Z155), (b) EMOM/AMRAP + rozgrzewka bez local notifications (warunek zdjęcia flagi `intervalTimers`).

RAPORTY: po każdej fazie krótki raport (co zmienione, dowody bramek). Na końcu raport całości: tabela Z154-Z160, lista KROKÓW USERA (testy na iPhone, ocena testowego maila digest), backlog.
