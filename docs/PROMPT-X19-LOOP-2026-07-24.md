# Prompt: autonomiczne wykonanie X19 w pętli (goal-driven)

## Jak odpalić

W NOWEJ sesji Claude Code w katalogu projektu wpisz:

```
/loop Przeczytaj docs/PROMPT-X19-LOOP-2026-07-24.md i wykonaj kolejną porcję pracy dokładnie według niego. Stan odtwarzaj wyłącznie z checkboxów w docs/PLAN-X19-2026-07-24.md i z git log, nie z pamięci.
```

Pętla sama się zatrzyma, gdy GOAL będzie ZWERYFIKOWANY, a zostaną wyłącznie zadania bramkowane decyzją usera.

---

## Prompt właściwy (obowiązuje agenta w każdej iteracji pętli)

```text
Przejmij wdrożenie planu naprawy Strength Save X19 (spójne id dni cyklu). Pracujesz AUTONOMICZNIE, w pętli; każda iteracja to jedna spójna porcja pracy. User nie odpowiada w trakcie.

NA START KAŻDEJ ITERACJI (odtworzenie stanu, zero pamięci między iteracjami):
1. Przeczytaj CLAUDE.md projektu (zasady Karpathy + checklist wdrożeniowy są obowiązkowe).
2. Przeczytaj docs/PLAN-X19-2026-07-24.md W CAŁOŚCI (root cause, twarde zasady, fazy, bramki, sekcja USTALENIA Z150).
3. Sprawdź `git log --oneline -15` i `git status --short`. Stan wykonania = odhaczone checkboxy w planie + commity. Niczego nie zakładaj.
4. Użyj skilla superpowers:executing-plans do prowadzenia wykonania.

GOAL (definicja ukończenia):
Id dnia AKTYWNEGO cyklu jest niezmienne przez całe życie cyklu — żadna ścieżka zapisu planu (edycja, dodanie dnia, reset do domyślnego, szablon) nie podmienia id istniejących dni cyklu, a nowe dni dostają id w formacie cyklu. Plan i cykl trzymają identyczne id po każdym zapisie.
Kryteria weryfikacji (wszystkie, dowód = wynik komendy, nie deklaracja):
- testy alignPlanDaysWithCycleIds ze WSZYSTKICH przypadków z planu (zgodne id, obcy format po pozycji+weekday, nowy dzień, usunięty dzień, mieszanka, idempotencja) zielone; były CZERWONE przed implementacją (pokaż oba biegi),
- testy niezmienników starych przepływów zielone: resetToDefault przy aktywnym cyklu daje id cyklu, addPlanDay+zapis daje nowy dzień w formacie cyklu, onboarding i startCycleWithPlan bez zmian, edycja ćwiczenia nie zmienia id dnia, plan BEZ cyklu zostaje przy day-N,
- e2e sekwencji (mock): aktywny cykl -> trening z serią -> /plan/edit (dodaj dzień + ćwiczenie) -> back -> serie nietknięte, wszystkie id dni w formacie cyklu, wejście w dzień działa; wariant resetToDefault też zielony,
- sekcja USTALENIA Z150 w planie wypełniona (mapa skutków przed fixem),
- dry-run scripts/repair-cycle-day-ids.mjs dla g.jasionowicz@gmail.com wykonany (read-only), wynik w raporcie,
- pełne BRAMKI planu zielone (w tym poprawna kolejność dist-checków: build:mobile+smoke, potem build web+offline).

PROTOKÓŁ ITERACJI:
1. Wybierz PIERWSZE nieodhaczone zadanie w kolejności FAZA 0 -> 1 -> 2 -> 3. Nie skacz.
2. Wykonaj metodą z planu: test first (test musi paść na starym kodzie, potem przejść), minimalny fix, zero refaktorów przy okazji.
3. Po ukończeniu zadania: odhacz checkbox w pliku planu (dopisz jednolinijkowy dowód: która komenda/test to potwierdza), commit zgodnie z nazwą z planu.
4. Po ukończeniu fazy: przebiegnij bramki fazy. Po ukończeniu planu: pełny checklist z CLAUDE.md (z wyjątkami z twardych zasad planu).
5. Iterację kończ krótkim raportem: co zrobione, co zielone, co następne, co czeka na usera.

TWARDE ZASADY (nadrzędne wobec tempa):
- Dane usera są święte. ZERO zapisów na produkcyjnych danych. Z153: wyłącznie dry-run, apply czeka na potwierdzenie usera.
- Historii (kolekcja workouts) NIE dotykasz w ogóle — naprawa wyrównuje plan/cykl do historii, nigdy odwrotnie.
- iOS build WSTRZYMANY: user testuje build 77 na realnym treningu. NIE bumpuj CURRENT_PROJECT_VERSION, NIE odpalaj release-ios.sh. Zmiany X19 pojadą następnym trainem po potwierdzeniu builda 77. Web deploy (npm run deploy + weryfikacja hasha curl-em) TAK, po zielonych bramkach.
- e2e czerwone lub wolne wielokrotnie ponad normę -> NAJPIERW pkill -f vite + wyczyść node_modules/.vite (reguła 9 z CLAUDE.md).
- check:dist-offline wymaga builda WEB (build:mobile wyłącza service workera) — kolejność: build:mobile + check:dist-smoke, potem npm run build + check:dist-offline.
- Bundle budget: ~20 KB zapasu. Przekroczenie -> code-splitting, nie podnoszenie limitu.
- Przy bugu w trakcie wykonania: superpowers:systematic-debugging, root cause przed fixem. Trzy nieudane fixy tej samej rzeczy -> STOP, wpisz bloker do raportu, przejdź do następnego niezależnego zadania.
- Wpis do DECYZJE.md po ukończeniu planu (niezmiennik, wektory dryfu, wynik dry-run, weryfikacja).

WARUNEK STOPU PĘTLI:
Zatrzymaj pętlę (stop), gdy: wszystkie kryteria GOAL zweryfikowane, web deploy wykonany i zweryfikowany, a lista pozostałych pozycji zawiera wyłącznie: apply naprawy rozjazdów (jeśli dry-run coś znalazł — czeka na usera) oraz release iOS następnym trainem. Wtedy raport końcowy: zmienione pliki, wyniki wszystkich bramek, wynik dry-run audytu, dokładna lista rzeczy do potwierdzenia przez usera.
Nie deklaruj sukcesu bez pokazania wyników komend (superpowers:verification-before-completion).
```
