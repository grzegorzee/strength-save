# PROMPT: autonomiczne wdrożenie X21 (rozgrzewka + spójność i18n)

Skopiuj poniższy blok jako pierwszą wiadomość w nowej sesji w `~/FIRMA/projekty/strength_save`.

---

Przejmij wdrożenie planu X21. Pracuj w `/Users/grzegorzjasionowicz/FIRMA/projekty/strength_save`.

PLAN: `docs/PLAN-X21-2026-07-28.md` (zadania Z162-Z168). KONTEKST: `docs/AUDYT-I18N-2026-07-28.md` (pełny audyt i18n z 2026-07-28, root cause zweryfikowane w kodzie).

KOLEJNOŚĆ (z sekcji "KOLEJNOŚĆ I ZALEŻNOŚCI" planu):
1. Z162 (persystencja odhaczeń rozgrzewki w drafcie sesji) — P1, zgłoszenie usera
2. Z163 (nazwy rozgrzewki w 100% PL/EN bez mieszania)
3. Z164 → Z165 → Z166 SEKWENCYJNIE (wszystkie dotykają `pl.ts`/`en.ts`)
4. Z167 (functions: push dnia + mail zaproszenia per język) + deploy functions
5. Z168 OSTATNIE (rejestr LANGUAGES, nakładki per język, globalny test-guard, `docs/I18N-NOWY-JEZYK.md`)

TRYB: 100% autonomiczny. User zatwierdził plan 2026-07-28 i nie podejmuje decyzji w trakcie. Nie zatrzymuj się, nie pytaj o zgodę na kroki, które są w planie. Wznowienie = ten sam prompt w nowej sesji.

ŹRÓDŁO PRAWDY O POSTĘPIE: checkboxy `- [ ]` w pliku planu. Odhaczaj NATYCHMIAST po wykonaniu z krótkim DOWODEM (komenda + wynik) i commituj plan razem z kodem. Zaczynając, znajdź pierwszy nieodhaczony krok.

PĘTLA: znajdź pierwszy nieodhaczony krok → wykonaj (TDD: test first tam, gdzie plan tak mówi) → zweryfikuj → odhacz + commit → przy bramkach pełny checklist → push.

DECYZJE USERA, KTÓRE JUŻ ZAPADŁY (nie podważaj):
- Odhaczenia rozgrzewki żyją w drafcie sesji (`warmupChecked?: string[]` po `nameKey`, pole additive). Nowa sesja = czysta rozgrzewka. Pole NIE wychodzi do Firestore.
- Nazwy rozgrzewki: PL w pełni po polsku (Pajacyki, Krążenia bioder, Koci grzbiet, Pozycja dziecka, Pozycja gołębia), EN w pełni po angielsku. Klucze i18n (`warmup.*`/`stretch.*`) BEZ ZMIAN (to identyfikatory, od Z162 też w draftach).
- Tiery osiągnięć (Newcomer, Rookie...) ZOSTAJĄ po EN (branding, odłożone do decyzji usera).
- Nieużywane komponenty shadcn (pagination, breadcrumb, sidebar) NIE są dotykane.
- Mail zaproszenia: default PL, parametr `lang` przyszłościowy.
- Nazwy ćwiczeń na Watch/Garmin ZOSTAJĄ kanoniczne PL (lokalizacja display = tech debt, nie X21).

TWARDE ZASADY (pełna lista w sekcji 0 planu):
- **NIGDY `git add -A` / `git add .`** W repo: nietrackowany folder `animacje-cwiczen/` (699 MB) oraz WIP Garmin v3 (`garmin/source/AppSettings.mc`, `DayView.mc`, NIE kompiluje się, osobny wątek). Stage'uj pliki imiennie, garmin/* nie dotykaj.
- Dane usera święte: zero zapisów na produkcyjnych danych, testy na emulatorze/trybie e2e mock.
- Reguła 5 CLAUDE.md: test niezmiennika starego przepływu przy każdej zmianie (legacy draft bez `warmupChecked` musi się ładować!), sekwencje nie ekrany.
- Nowe klucze i18n do OBU plików (`pl.ts` + `en.ts`), inaczej typecheck padnie.
- Kanoniczne PL nietykalne (nazwy ćwiczeń/dni/focus w Firestore, slugi, lookupy): tłumaczymy tylko wyświetlanie.
- Bundle budget: zapas ~16 KB, nowych kluczy ~150×2. `check:bundle-budget` padnie → NIE podnoś limitu, zgłoś w raporcie z propozycją (np. lazy locale dla admin.*).
- Chirurgiczne commity per zadanie, `(Z16x)` w opisie. Wpis do `DECYZJE.md` po każdej fazie.

BRAMKI (bez `| tail`, pipe maskuje exit code):
`npm run test`, `npm run typecheck`, `npm run lint`, `npm run build`, `npm run check:bundle-budget`, `npm run check:dist-smoke` (na `build:mobile`!), `npm run check:dist-offline` (na buildzie web!), `npm run e2e:mock`, `cd functions && npm test`. Rules niezmieniane, `test:rules` niewymagany.

Reguła 9 CLAUDE.md: e2e wielokrotnie wolniejsze niż zwykle albo masowe faile na `page.goto` → najpierw `pkill -f vite` + wyczyść `node_modules/.vite`, dopiero potem szukaj buga.

DEPLOY (autoryzacja stała usera): `git push`, `npm run deploy` (web; sam push NIE aktualizuje strony), `firebase deploy --only functions` (po Z167), TestFlight. Po uploadzie iOS ZAWSZE: `uv run --with "pyjwt[crypto]" --with requests scripts/testflight_external.py 80 --whats-new "..."` (po polsku, konkretnie: rozgrzewka zapamiętuje odhaczenia, spójne nazwy, poprawki tłumaczeń). Nigdy dwa pipeline'y iOS równolegle.

WERSJONOWANIE: 1.0.0 na sztywno. Bump wyłącznie `CURRENT_PROJECT_VERSION` → **80** (6 wystąpień, wszystkie równe; pilnuje `release-ios-preflight.mjs`).

OBSŁUGA PRZESZKÓD:
- Bramka czerwona → `superpowers:systematic-debugging`, nie obchodź.
- Coś poza zakresem planu → ODŁOŻONE z jednozdaniowym opisem w pliku planu (sekcja ODŁOŻONE już istnieje).
- Kroki wymagające fizycznego iPhone'a (scenariusz rozgrzewki z FAZY 1: odhacz → zamknij → wróć → zgaś ekran → wróć; push EN z Z167) → zrób co się da na symulatorze (UDID `8F8734A8-5063-41DE-B465-1697B8F4771C`), resztę odłóż z jawną listą KROKÓW USERA na końcu raportu.

SCENARIUSZE OBOWIĄZKOWE przed buildem (reguła 5 CLAUDE.md):
1. plan → wyjście → szybki trening → powrót do planu → wszystkie ćwiczenia na miejscu → zakończenie → sync
2. rozgrzewka: start treningu → odhacz 3 pozycje → zamknij dialog → otwórz (SĄ) → wyjdź do Dashboard → wróć (SĄ) → zakończ trening → nowy trening (CZYSTA)
3. przełącz język PL↔EN: rozgrzewka, ekran Strava, panel admina — zero mieszanych stringów

RAPORTY: po każdej fazie krótki raport (co zmienione, dowody bramek). Na końcu raport całości: tabela Z162-Z168, lista KROKÓW USERA (testy na iPhone), tech debt dopisany do `PLAN.md`.
