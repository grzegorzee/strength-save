# Product audit po poprawkach — Strength Save 1.0.0 (iOS build 139) — 2026-09-04

Read-only design critique aktualnego working tree. Claude nie edytował repo ani `audit/`.
Pomiar na świeżym `VITE_E2E_MODE=true` w Chromium/Playwright 1.59.1, viewport 390×844,
DPR 2, `isMobile`, `hasTouch`, dark. Serwery audytu zostały zatrzymane po pomiarach.

## Werdykt

**PASS: 12/12 głównych pozycji B139 zamkniętych, 0 regresji.** Dodatkowy pomiar po
ostatniej iteracji zamknął **4/4** drobnych pozostałości N1/N2/N3/N5.

Globalnie: poziomy scroll 0/27 tras w pełnym rechecku i 0/6 w pomiarze końcowym,
`pageerror` 0, błędy konsoli produktu 0, tła statusowe bez przezroczystości 0,
przyciski bez nazwy dostępnej 0 oraz pola formularzy poniżej 16 px 0.

| Obszar | Wynik | Dowód |
|---|---|---|
| Cele dotykowe | PASS | check/usuń serii 44×44, DODAJ SERIĘ 318×44, kontrolki RestBar ≥44×44, menu i chipy 44 px, akcje Dashboardu/Planu/Profilu/404 ≥44 px |
| Historia | PASS | data w osobnej kolumnie, pełny focus, meta i czas bez ucięcia; pierwszy wiersz po schowaniu filtrów y=294 zamiast 546 |
| PL/EN | PASS | brak polskich tokenów w EN poza nazwą własną planu; naturalne polskie statusy i akcje |
| Średnia cyklu | PASS | 16 sesji / 6 przepracowanych tygodni = 2,7 |
| Formularze | PASS | textarea, kalkulator, HEX i język ≥16 px |
| Kontrast/statusy | PASS | brak potwierdzonych problemów i brak pełnych teł statusowych |
| 404 | PASS | powłoka aplikacji obecna, link 203×44, dokładnie jeden `h1` |
| Plan | PASS | przyszłe daty rosnąco; bieżący tydzień nadal zachowuje dzisiejszy hero |
| Dostępność | PASS | 0 przycisków bez nazwy; po jednym `h1`; spójny ring focusu |
| BackBar | PASS | zachowany zgodnie z X35b, cel „Wstecz” 99×44 |

## Końcowy pomiar pozostałości

- linki prawne: login 67,2×44 i 75,1×44; onboarding 72,1×44 i 135,8×44;
- RestBar fullscreen: −15 i +15 po 44×44, Pomiń 52,7×44, Zwiń 44×44;
- 404: `H1: 404`, brak przeskoku poziomów; `/day`: `H1 → H2 → H2 → H3`, brak przeskoku;
- placeholder Historii „Szukaj sesji lub ćwiczenia”: 196,1 px tekstu przy 300 px wnętrza,
  font 16 px, bez ucięcia;
- scroll poziomy 0/6 i `pageerror` 0.

## Świadome decyzje i zakres zewnętrzny

Sugestia usunięcia paska BackBar nie została wdrożona, ponieważ X35b jest jawnym
niezmiennikiem produktu; poprawiono jego hit-area. Wpis `WORKOUT_NOT_FOUND` pojawił się
wyłącznie przy auto-syncu szkicu przeciw deterministycznemu mockowi bez tej sesji. Nie
zmieniono logiki danych bez odtworzenia na koncie QA.

Fizyczne urządzenie pozostaje konieczne do potwierdzenia safe area, klawiatury, VoiceOver,
haptyki i dźwięku oraz scenariuszy background/resume i przerwania sesji.

Surowe dane końcowego rechecku: `/tmp/strength-save-build139-postfix/` oraz
`/tmp/strength-save-build139-finalcheck/` w środowisku audytowym.
