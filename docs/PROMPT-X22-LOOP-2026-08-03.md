# Prompt: autonomiczne wykonanie X22 w pętli (goal-driven)

## Jak odpalić

W NOWEJ sesji Claude Code w katalogu projektu wpisz:

```
/loop Przeczytaj docs/PROMPT-X22-LOOP-2026-08-03.md i wykonaj kolejną porcję pracy dokładnie według niego. Stan odtwarzaj wyłącznie z checkboxów w docs/PLAN-X22-2026-08-03.md i z git log, nie z pamięci. GOAL: wszystkie checkboxy planu odhaczone z dowodami, pełne bramki zielone, web zdeployowany, iOS build 81 na TestFlight z dystrybucją do obu grup.
```

Pętla sama się zatrzyma, gdy GOAL będzie ZWERYFIKOWANY, a zostaną wyłącznie KROKI USERA (testy na fizycznym iPhone).

---

## Prompt właściwy (obowiązuje agenta w każdej iteracji pętli)

```text
Przejmij wdrożenie planu naprawy Strength Save X22 (zgłoszenia z builda 80: usuwanie serii, Dashboard, wideo, dźwięk/ekran, separator dziesiętny, share). Pracujesz AUTONOMICZNIE, w pętli; każda iteracja to jedna spójna porcja pracy. User nie odpowiada w trakcie.

NA START KAŻDEJ ITERACJI (odtworzenie stanu, zero pamięci między iteracjami):
1. Przeczytaj CLAUDE.md projektu (zasady Karpathy + checklist wdrożeniowy obowiązkowe).
2. Przeczytaj docs/PLAN-X22-2026-08-03.md W CAŁOŚCI (root cause, twarde zasady sekcji 0, fazy, bramki).
3. Sprawdź `git log --oneline -15` i `git status --short`. Stan wykonania = odhaczone checkboxy w planie + commity. Niczego nie zakładaj.
4. Użyj skilla superpowers:executing-plans do prowadzenia wykonania.

GOAL (definicja ukończenia):
Wszystkie zgłoszenia usera z builda 80 naprawione u źródła i pokryte testami odtwarzającymi: (1) usunięcie serii działa za pierwszym tapnięciem, dialog nie ucieka spod palca i nie pyta o dane przy świeżej serii; (2) Dashboard nigdy nie renderuje wbudowanego defaultPlan zamiast planu usera, `today` przeżywa rollover, aktywna sesja ma JEDEN CTA, provisional promuje się po online bez wchodzenia w trening, draft z odhaczeniami nie jest nadpisywany wersją 1; (3) miniatury ćwiczeń bez autoplay, animacja odtwarza się w dialogu albo pokazuje controls, biblioteka bez gatingu hoverem; (4) dźwięki grają po interrupted/closed AudioContext, sesja audio reaktywowana po powrocie, keep-awake re-apply po resume, wiersz Dźwięk zawsze widoczny; (5) przecinek dziesiętny akceptowany we wszystkich polach bez cichego zerowania (waga, pomiary, RPE, talerze, cardio); (6) Dodaj zdjęcie bez crasha (plist + downscale), Pobierz działa natywnie, obraz JPEG < 0.5 MB, szablony z logo Strength Save + własne zdjęcie.
Kryteria weryfikacji (wszystkie, dowód = wynik komendy, nie deklaracja):
- każdy fix ma test, który był CZERWONY przed implementacją (pokaż oba biegi tam, gdzie plan tak mówi),
- pełne bramki: npm run test, typecheck, lint, build, check:bundle-budget, build:mobile + check:dist-smoke, build + check:dist-offline, e2e:mock — bez `| tail`,
- sekwencje z FAZY 7 planu zielone,
- web zdeployowany (npm run deploy + weryfikacja hasha), iOS build 81 wysłany (release-ios.sh) i zdystrybuowany (testflight_external.py 81),
- DECYZJE.md uzupełnione per faza + wpis zbiorczy X22, tech debt w PLAN.md,
- wszystkie checkboxy w docs/PLAN-X22-2026-08-03.md odhaczone z jednolinijkowym dowodem.

PROTOKÓŁ ITERACJI:
1. Wybierz PIERWSZE nieodhaczone zadanie w kolejności FAZA 1 → 2 → 3 → 4 → 5 → 6 → 7. Nie skacz.
2. Wykonaj metodą z planu: test first (test musi paść na starym kodzie, potem przejść), minimalny fix, zero refaktorów przy okazji.
3. Po ukończeniu zadania: odhacz checkbox w pliku planu (z dowodem: komenda + wynik), commit zgodnie z nazwą z planu (stage'uj pliki IMIENNIE — nigdy git add -A, w repo jest 699 MB nietrackowanych animacji i zastane zmiany android/).
4. Po ukończeniu fazy: bramki fazy + wpis do DECYZJE.md. Po ukończeniu planu: FAZA 7 w całości.
5. Iterację kończ krótkim raportem: co zrobione, co zielone, co następne, co czeka na usera.

TWARDE ZASADY (nadrzędne wobec tempa):
- Dane usera święte: zero zapisów na produkcyjnych danych; odczyt preferences.timerSound wyłącznie read-only, wynik do raportu.
- Nie dodawaj pól do kształtów zapisywanych do Firestore (rules mają schema-checks) — usuwanie serii po REFERENCJI, nie po nowym polu id.
- Reguła 5: test niezmiennika starego przepływu przy każdej zmianie; testuj SEKWENCJE, nie ekrany.
- Bundle budget: zapas ~5.4 KB; przekroczenie → code-splitting (lazy html2canvas-pro już w planie), nie podnoszenie limitu.
- Nowe klucze i18n do OBU locale (pl.ts + en.ts).
- e2e czerwone lub wolne ponad normę → NAJPIERW pkill -f vite + wyczyść node_modules/.vite (reguła 9).
- Przy bugu w trakcie: superpowers:systematic-debugging, root cause przed fixem. Trzy nieudane fixy tej samej rzeczy → STOP, bloker do raportu, przejdź do następnego niezależnego zadania.
- Kroki wymagające fizycznego iPhone'a → zrób co się da na symulatorze (UDID 8F8734A8-5063-41DE-B465-1697B8F4771C), resztę zostaw w sekcji KROKI USERA planu.
- Wersja 1.0.0 na sztywno; bump wyłącznie CURRENT_PROJECT_VERSION → 81 (6 wystąpień). Nigdy dwa pipeline'y iOS równolegle.

WARUNEK STOPU PĘTLI:
Zatrzymaj pętlę (stop), gdy: wszystkie kryteria GOAL zweryfikowane, web deploy wykonany, iOS build 81 na TestFlight zdystrybuowany, a lista pozostałych pozycji zawiera wyłącznie KROKI USERA z planu (testy urządzeniowe + ewentualna decyzja o preferences.timerSound). Wtedy raport końcowy: tabela Z170-Z181, wyniki wszystkich bramek, dokładna lista rzeczy do potwierdzenia przez usera.
Nie deklaruj sukcesu bez pokazania wyników komend (superpowers:verification-before-completion).
```
