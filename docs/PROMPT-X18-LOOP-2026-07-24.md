# Prompt: autonomiczne wykonanie X18A + X18B + X18C w pętli (goal-driven)

## Jak odpalić

W nowej sesji Claude Code w katalogu projektu wpisz:

```
/loop Przeczytaj docs/PROMPT-X18-LOOP-2026-07-24.md i wykonaj kolejną porcję pracy dokładnie według niego. Stan odtwarzaj wyłącznie z checkboxów w planach X18 i z git log, nie z pamięci.
```

Pętla sama się zatrzyma, gdy wszystkie cele będą ZWERYFIKOWANE albo gdy zostaną wyłącznie zadania bramkowane decyzją usera.

---

## Prompt właściwy (obowiązuje agenta w każdej iteracji pętli)

```text
Przejmij wdrożenie planów naprawy Strength Save X18. Pracujesz AUTONOMICZNIE, w pętli; każda iteracja to jedna spójna porcja pracy. User nie odpowiada w trakcie.

NA START KAŻDEJ ITERACJI (odtworzenie stanu, zero pamięci między iteracjami):
1. Przeczytaj CLAUDE.md projektu (zasady Karpathy + checklist wdrożeniowy są obowiązkowe).
2. Przeczytaj docs/PLAN-X18A-2026-07-24.md, docs/PLAN-X18B-2026-07-24.md, docs/PLAN-X18C-2026-07-24.md.
3. Sprawdź `git log --oneline -15` i `git status --short`. Stan wykonania = odhaczone checkboxy w planach + commity. Niczego nie zakładaj.
4. Użyj skilla superpowers:executing-plans do prowadzenia wykonania.

CEL NADRZĘDNY (definicja ukończenia całości):
Wszystkie trzy GOALe poniżej mają status ZWERYFIKOWANY, a jedyne nieodhaczone pozycje w planach to zadania oznaczone [WYMAGA POTWIERDZENIA USERA] lub [BRAMKA: POTWIERDZENIE USERA] oraz kroki wymagające fizycznego iPhone'a.

GOAL 1 (plan X18A, P0, wykonaj w całości PRZED pozostałymi):
Edycja planu dnia w trakcie treningu nie kasuje żadnej odhaczonej serii, a duration treningu jest liczony do ostatniej aktywności.
Kryteria weryfikacji (wszystkie muszą być spełnione, dowód = wynik komendy, nie deklaracja):
- istnieje test e2e sekwencji: start z ?autostart=true -> odhaczone serie -> /plan/edit -> dodanie ćwiczenia -> history back -> serie nietknięte + nowe ćwiczenie widoczne; test jest ZIELONY i był CZERWONY na kodzie sprzed fixa (pokaż oba biegi),
- wariant offline/provisional tej sekwencji zielony,
- test workout-sync-engine: finalizacja 48h po ostatniej aktywności daje durationSec liczone do lastActivityAt; finalizacja 5 min po ostatniej serii bez zmian zachowania,
- parametr autostart znika z URL po konsumpcji (asercja w teście),
- pełne bramki z sekcji BRAMKI planu X18A zielone.

GOAL 2 (plan X18B, P1):
W sesji biegnie maksymalnie jeden timer przerwy, ostatnia seria treningu nie startuje przerwy, pasek przerwy w ukończonej karcie nie jest przygaszony.
Kryteria weryfikacji:
- test: seria w ćwiczeniu A, potem seria w B przy biegnącej przerwie A -> w drzewie dokładnie jeden RestBar (B) i dokładnie jedna zaplanowana notyfikacja (mock LocalNotifications),
- testy hasRemainingWork ze wszystkich przypadków planu (ostatnia seria treningu, skipped, same rozgrzewkowe),
- test: ostatnia seria ostatniego ćwiczenia -> zero RestBar, zero zaplanowanych notyfikacji, biegnąca przerwa anulowana,
- test renderu: allCompleted + aktywna przerwa -> karta bez opacity-50; bez przerwy -> opacity-50,
- testy niezmiennika starych przepływów (przerwa po zwykłej serii, +-15, Pomiń, przerwa między ćwiczeniami gdy jest następne) zielone,
- pełne bramki planu X18B zielone. Zadanie Z149 krok 3 (zdjęcie flagi web) POMIŃ: bramkowane potwierdzeniem usera.

GOAL 3 (plan X18C, P2):
Poranny reminder pomija rozpoczęty/ukończony trening, dźwięk gongu gra bez wpisu Now Playing, pasek tygodnia ma legendę, minimalną wysokość i oznaczenie dni planu.
Kryteria weryfikacji:
- testy daily-reminder (started -> skip, completed -> skip, brak -> push) zielone; indeks kompozytowy sprawdzony przed deployem functions,
- testy timer-sound na ścieżce WebAudio zielone; grep potwierdza brak `new Audio(` i `<audio` w src/ poza dozwolonymi miejscami wymienionymi w planie,
- testy HybridWeekStrip (min 3 px, legenda, kropki dni planu, podpis metryki) zielone,
- i18n: nowe klucze w pl.ts I en.ts (typecheck to wymusza),
- pełne bramki planu X18C zielone. Krok 4 Z147 (test na fizycznym iPhone) POMIŃ i wypisz w raporcie jako czekający na usera.

PROTOKÓŁ ITERACJI:
1. Wybierz PIERWSZE nieodhaczone zadanie w kolejności X18A -> X18B -> X18C (fazy po kolei). Nie skacz.
2. Wykonaj je metodą z planu: test first (test musi paść na starym kodzie, potem przejść), minimalny fix, zero refaktorów przy okazji.
3. Po ukończeniu zadania: odhacz checkbox w pliku planu (dopisz jednolinijkowy dowód: która komenda/test to potwierdza), commit zgodnie z nazwą z planu.
4. Po ukończeniu całej fazy: przebiegnij bramki fazy. Po ukończeniu całego planu: pełny checklist z CLAUDE.md.
5. Iterację kończ krótkim raportem: co zrobione, co zielone, co następne, co czeka na usera.

TWARDE ZASADY (nadrzędne wobec tempa):
- Dane usera są święte. ZERO operacji zapisu na produkcyjnych danych. Zadanie Z142.3 (naprawa rekordu 48h): przygotuj skrypt i DRY-RUN, wypisz wynik w raporcie, NIE wykonuj zapisu. Analogicznie każde zadanie [WYMAGA POTWIERDZENIA USERA].
- Deploye, które wolno wykonać autonomicznie po zielonych bramkach danego planu: git push na main, npm run deploy (web), firebase deploy --only functions (tylko przy X18C), release iOS przez scripts/release-ios.sh + bump CURRENT_PROJECT_VERSION (6 wystąpień, pilnuje release-ios-preflight) + OBOWIĄZKOWO uv run --with "pyjwt[crypto]" --with requests scripts/testflight_external.py <build> --whats-new "...". MARKETING_VERSION zostaje 1.0.0.
- Sensowna kadencja releasów: jeden build TestFlight po ukończeniu X18A (P0 ma iść do usera od razu), drugi po X18B+X18C. Nie rób builda po każdym zadaniu.
- Domyślny dźwięk przerwy: GONG (decyzja usera 2026-07-24). Flaga timerów web zostaje wyłączona.
- e2e czerwone lub wolne wielokrotnie ponad normę -> NAJPIERW pkill -f vite + wyczyść node_modules/.vite (reguła 9 z CLAUDE.md), dopiero potem szukaj buga.
- Bundle budget: 24 KB zapasu. Przekroczenie -> code-splitting, nie podnoszenie limitu.
- Przy bugu w trakcie wykonania: superpowers:systematic-debugging, root cause przed fixem. Trzy nieudane fixy tej samej rzeczy -> STOP, wpisz bloker do raportu, przejdź do następnego niezależnego zadania.
- Wpisy do DECYZJE.md po każdym ukończonym planie (co, dlaczego, root cause, weryfikacja).

WARUNEK STOPU PĘTLI:
Zatrzymaj pętlę (stop), gdy: wszystkie kryteria GOAL 1-3 zweryfikowane, deploye wykonane, a lista pozostałych pozycji zawiera wyłącznie zadania czekające na usera. Wtedy raport końcowy: zmienione pliki, wyniki wszystkich bramek, numery buildów TestFlight, dokładna lista rzeczy do zrobienia/potwierdzenia przez usera (dry-run naprawy rekordu 48h, ręczne testy na iPhone z listą kroków, decyzja o fladze web).
Nie deklaruj sukcesu bez pokazania wyników komend (superpowers:verification-before-completion).
```
