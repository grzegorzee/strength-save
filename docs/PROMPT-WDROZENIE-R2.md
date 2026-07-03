# Prompt do nowego okna agenta (wdrożenie planu R2)

```text
Przejmij wdrożenie planu naprawy R2 projektu Strength Save (cwd: repo strength_save).

Przeczytaj najpierw, w tej kolejności:
1. CLAUDE.md projektu (zasady Karpathy, checklist wdrożeniowy, pułapki iOS/background).
2. docs/PLAN-NAPRAWY-2026-07-03-R2.md — to jest obowiązujący zakres: rejestr znalezisk R2-01..R2-32, fazy 0-6 z zadaniami Z29-Z46 i checkpointami.
3. docs/AUDYT-2026-07-03.md sekcje 3 i 6 — architektura i podejścia zakazane (tylko kontekst, statusy nieaktualne).

Goal: wykonać plan R2 w całości, zadanie po zadaniu, aż do wdrożonego release (web + functions + rules + TTL + iOS build 49) i raportu końcowego. Priorytet bezwzględny: FAZA 1 (integralność zapisu, P0/P1) -> FAZA 2 (waitlista, release script, wydajność) -> FAZA 3 (koszty Functions) -> FAZA 4 (rules + P2) -> FAZA 5 (higiena) -> FAZA 6 (release train). FAZY 7 nie wykonuj.

Twarde zasady:
- Użyj skilla superpowers:executing-plans. Zadania PO KOLEI, odhaczaj checkboxy w pliku planu. Checkpointy faz są bramkami: npm run test, typecheck, lint, build (+ test:rules, testy functions, e2e mock/emulator tam, gdzie faza tego wymaga wg planu). Nie przeskakuj.
- TDD z bezpiecznikiem: każde zadanie zaczyna failing test odtwarzający znalezisko. Jeśli test NIE potwierdza znaleziska: STOP dla zadania, wpis do DECYZJE.md, idź dalej. Nie forsuj fixu na niepotwierdzonym scenariuszu.
- Chirurgicznie: jedno znalezisko = jeden izolowany commit (konwencja z planu). Zero poprawiania sąsiedniego kodu.
- Środowisko docelowe to siłownia: przy każdej zmianie w treningu pierwsze pytanie "co się dzieje, gdy ekran gaśnie" (iOS wstrzymuje JS; wszystko, co ma przeżyć tło, musi być w IndexedDB/localStorage).
- Dane usera święte: zero zapisów na realnym koncie.
- i18n: nowe klucze do OBU plików pl.ts i en.ts. Teksty bez pauz em-dash.
- Deploy WYŁĄCZNIE w FAZIE 6, zgodnie z kolejnością z Z46 (pamiętaj: push nie aktualizuje weba, npm run deploy osobno, nigdy cap sync ios po deployu, bump CURRENT_PROJECT_VERSION 48->49 w 6 wystąpieniach). Przed wysyłką TestFlight potwierdź z userem.
- Decyzje produktowe nie do wywnioskowania z kodu (np. wariant B w Z33): nazwij warianty i zapytaj; domyślne rekomendacje są w planie.
- Po każdej fazie wpis do DECYZJE.md (co, dlaczego, root cause, weryfikacja).

Nie deklaruj sukcesu, bo stare testy są zielone. Zakończ raportem: zmienione pliki per zadanie, wyniki wszystkich bramek, co odłożone i dlaczego, dokładny scenariusz testu terenowego dla usera (jest w Z46 krok 10).
```
