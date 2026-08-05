# Prompt: autonomiczne wykonanie X23 w pętli (goal-driven)

## Jak odpalić

W NOWEJ sesji Claude Code w katalogu projektu wpisz:

```
/loop Przeczytaj docs/PROMPT-X23-LOOP-2026-08-05.md i wykonaj kolejną porcję pracy dokładnie według niego. Stan odtwarzaj wyłącznie z checkboxów w docs/PLAN-X23-2026-08-05.md i z git log, nie z pamięci. GOAL: wszystkie checkboxy planu odhaczone z dowodami, pełne bramki zielone, web zdeployowany, iOS build 82 na TestFlight z dystrybucją do obu grup.
```

Pętla sama się zatrzyma, gdy GOAL będzie ZWERYFIKOWANY, a zostaną wyłącznie KROKI USERA (testy na fizycznym iPhone).

---

## Prompt właściwy (obowiązuje agenta w każdej iteracji pętli)

```text
Przejmij wdrożenie planu naprawy Strength Save X23 (zgłoszenia z realnego treningu na buildzie 81: wskrzeszone/zdublowane serie po force-quit, timer przerwy do przebudowy na kuloodporny, niezamykalny modal wideo, czarne miniatury, obcięte "125", szablon zdjęcia i feedback Pobierz). Pracujesz AUTONOMICZNIE, w pętli; każda iteracja to jedna spójna porcja pracy. User nie odpowiada w trakcie.

NA START KAŻDEJ ITERACJI (odtworzenie stanu, zero pamięci między iteracjami):
1. Przeczytaj CLAUDE.md projektu (zasady Karpathy + checklist wdrożeniowy obowiązkowe).
2. Przeczytaj docs/PLAN-X23-2026-08-05.md W CAŁOŚCI (mapa root cause, twarde zasady sekcji 0, fazy, niezmienniki faz).
3. Sprawdź `git log --oneline -15` i `git status --short`. Stan wykonania = odhaczone checkboxy w planie + commity. Niczego nie zakładaj.
4. Użyj skilla superpowers:executing-plans do prowadzenia wykonania.

GOAL (definicja ukończenia):
Wszystkie zgłoszenia usera z builda 81 naprawione u źródła i pokryte testami odtwarzającymi:
(1) SESJA NIEŚMIERTELNA: po force-quit i "Kontynuuj trening" liczba i stan serii wracają 1:1 (najświeższy snapshot wygrywa między IDB a fallbackiem; dirty draft nowszy niż chmura wygrywa mimo rozjazdu sessionId; sanitizeSets niczego nie fabrykuje; swap "tylko dziś" nie tworzy dwóch kart po restarcie); e2e sekwencja kill → kontynuuj zielona.
(2) TIMER KULOODPORNY: przerwa startuje po KAŻDEJ odhaczonej serii, także rozgrzewkowej (45 s z warmupSeconds), z wyjątkiem ostatniej serii treningu; deadline w kontrolerze + persystencja localStorage (kill nie gubi przerwy); koniec przerwy NAJPIERW zeruje stan, potem gra sygnały (wyjątek sygnału nie zostawia paska); watchdog samonaprawy gasi wiszący stan po 3 s; bramka końca treningu fail-open przy niepełnych danych.
(3) DIALOGI ZAMYKALNE ZAWSZE: dialog otwiera się dopiero po zamknięciu menu (kontrolowany DropdownMenu + onSelect z preventDefault + requestAnimationFrame); X w dialog.tsx i sheet.tsx ma tap target 44 px; bezpiecznik czyści pointer-events lock na body; e2e: menu → dialog → X za pierwszym tapem.
(4) MINIATURY: kafelek ćwiczenia renderuje poster JPEG z CDN (nie <video>; WebKit nie maluje klatki przy preload=metadata), fallback ikona przy błędzie; postery wygenerowane i wgrane na Bunny (weryfikacja curl 200).
(5) INPUT: pola KG/POWT mieszczą "122.5" (px-1 zamiast dziedziczonego px-3 + proporcjonalne kolumny 0.9/1.25/0.85, nagłówek zsynchronizowany, bez zmniejszania fontu poniżej 16 px).
(6) SHARE: szablon ZDJĘCIE ma statystyki i listę w dolnej 1/3 (jeden spacer flex:1, scrim strefowy, dim 0.35, lista max 3), twarz czysta; Pobierz/Udostępnij pokazują stan "Zapisano ✓" (Check + hapticSuccess), AbortError bez fałszywego sukcesu; hover w całej apce tylko przy realnym kursorze (wariant globalny w tailwind.config), przyciski mają active:scale.

Kryteria weryfikacji (wszystkie, dowód = wynik komendy, nie deklaracja):
- każdy fix ma test, który był CZERWONY przed implementacją (pokaż oba biegi tam, gdzie plan tak mówi),
- pełne bramki: npm run test, typecheck, lint, build, check:bundle-budget, build:mobile + check:dist-smoke, build + check:dist-offline, e2e:mock — bez `| tail`,
- scenariusz przerwania z FAZY 7 planu zielony (start → rozgrzewka z timerem → wyjście → szybki trening → powrót → zakończenie → sync),
- web zdeployowany (npm run deploy + weryfikacja hasha), iOS build 82 wysłany (release-ios.sh) i zdystrybuowany (testflight_external.py 82 — obie grupy),
- DECYZJE.md uzupełnione (wpis zbiorczy X23), tech debt w PLAN.md,
- wszystkie checkboxy w docs/PLAN-X23-2026-08-05.md odhaczone z jednolinijkowym dowodem.

PROTOKÓŁ ITERACJI:
1. Wybierz PIERWSZE nieodhaczone zadanie w kolejności FAZA 1 → 2 → 3 → 4 → 5 → 6 → 7. Nie skacz.
2. Wykonaj metodą z planu: test first (test musi paść na starym kodzie, potem przejść), minimalny fix, zero refaktorów przy okazji.
3. Po ukończeniu zadania: odhacz checkbox w pliku planu (z dowodem: komenda + wynik), commit zgodnie z nazwą z planu (stage'uj pliki IMIENNIE — nigdy git add -A, w repo jest 699 MB nietrackowanych animacji i zastane zmiany android/).
4. Po ukończeniu fazy: bramki fazy + wpis do DECYZJE.md. Po ukończeniu planu: FAZA 7 w całości.
5. Iterację kończ krótkim raportem: co zrobione, co zielone, co następne, co czeka na usera.

TWARDE ZASADY (nadrzędne wobec tempa):
- Dane usera święte: zero zapisów na produkcyjnych danych. Krok diagnostyczny Z182 = WYŁĄCZNIE odczyt dokumentu workout z Firestore, wynik do raportu.
- Nie dodawaj pól do kształtów zapisywanych do FIRESTORE (rules mają schema-checks). Nowe pola (sessionSwaps, rest state) wolno dodać TYLKO do IndexedDB draftu i localStorage.
- Reguła 5: test niezmiennika starego przepływu przy każdej zmianie; testuj SEKWENCJE, nie ekrany.
- Bundle budget: zmierz zapas na starcie (check:bundle-budget), przekroczenie → code-splitting, nie podnoszenie limitu.
- Nowe klucze i18n do OBU locale (pl.ts + en.ts).
- e2e czerwone lub wolne ponad normę → NAJPIERW pkill -f vite + wyczyść node_modules/.vite (reguła 9).
- Przy bugu w trakcie: superpowers:systematic-debugging, root cause przed fixem. Trzy nieudane fixy tej samej rzeczy → STOP, bloker do raportu, przejdź do następnego niezależnego zadania.
- Kroki wymagające fizycznego iPhone'a → zrób co się da na symulatorze (UDID 8F8734A8-5063-41DE-B465-1697B8F4771C), resztę zostaw w sekcji KROKI USERA planu.
- FAZA 4 (postery): katalog animacje-cwiczen/ jest POZA gitem — niczego z niego nie commituj; dowody = wyniki curl i wpis w raporcie. Upload wyłącznie plików .jpg do exercises/ (nie ruszaj istniejących mp4).
- Wersja 1.0.0 na sztywno; bump wyłącznie CURRENT_PROJECT_VERSION → 82 (6 wystąpień). Nigdy dwa pipeline'y iOS równolegle.

WARUNEK STOPU PĘTLI:
Zatrzymaj pętlę (stop), gdy: wszystkie kryteria GOAL zweryfikowane, web deploy wykonany, iOS build 82 na TestFlight zdystrybuowany do obu grup, a lista pozostałych pozycji zawiera wyłącznie KROKI USERA z planu (testy urządzeniowe). Wtedy raport końcowy: tabela Z182-Z199, wyniki wszystkich bramek, wynik diagnozy Z182 (H1 vs H2), dokładna lista rzeczy do potwierdzenia przez usera.
Nie deklaruj sukcesu bez pokazania wyników komend (superpowers:verification-before-completion).
```
