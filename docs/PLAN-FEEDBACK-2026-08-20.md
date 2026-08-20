# PLAN NAPRAWCZY: feedback pierwszego użytkownika (2026-08-20)

> Wejście: `docs/FEEDBACK-UZYTKOWNIK-2026-08-20.md` (T1-T24, bez T19).
> Szczegółowe plany per obszar (wynik 11 agentów badawczych):
> `docs/plany-feedback-2026-08-20/*.md`. Ten plik trzyma kolejność i bramki.

## Kolejność wykonania (sekwencyjnie, wspólne drzewo robocze)

| # | Obszar | Zadania | Uzasadnienie kolejności |
|---|--------|---------|-------------------------|
| 1 | dashboard | T3, T24a-d | Naprawa tokenów akcentu + strażnik kolorów NAJPIERW, żeby nowe komponenty (kalendarz, karty) powstawały już na poprawnych tokenach |
| 2 | i18n-dates | T18-1..3 | LocalizedDateInput + dateLocale + strażnik skanujący; fundament dla dat w kolejnych obszarach |
| 3 | range-calendar | T20.1-7 | Kalendarz zakresów booking-style; korzysta z tokenów akcentu (1) i dateLocale (2) |
| 4 | onboarding | T1, T2, T4 | PlanWizard + popup pomiarów po onboardingu |
| 5 | plan-tab | T9, T10, T16, T17 | Fix procentu, treningi na górze, notatki do dnia, design |
| 6 | strava | T5, T6, T7, T8 | Karta cardio na dashboardzie, mapowanie typów, redirect+rate-limit, audyt danych (functions!) |
| 7 | analytics | T11, T12 | Fix layoutu przycisków + CSV (reuse ExportWorkoutsDialog po zmianach z 3) |
| 8 | measurements-photos | T14, T13a, T13b | Toggle admina najpierw (feature gate), potem zdjęcia before/after (Storage) |
| 9 | admin | T21a-c, T22a-c | Log treści maili (functions) + podgląd w panelu + spójność |
| 10 | notifications | T15 (A1-A3) | Ogłoszenia w dzwonku (inbox user_events + mirror push + przełącznik w adminie) |
| 11 | ux-sweep | T23-1..7 | Drobne poprawki na końcu, po ustabilizowaniu reszty |

## Zasady dla agentów wykonawczych

1. Przeczytaj `CLAUDE.md`, swój plan `docs/plany-feedback-2026-08-20/<obszar>.md`
   i sekcję swojego obszaru w `docs/FEEDBACK-UZYTKOWNIK-2026-08-20.md`.
2. Plan powstał na drzewie SPRZED zmian poprzednich obszarów: przed każdą zmianą
   zweryfikuj aktualny stan pliku; adaptuj minimalnie, odnotuj odchylenie.
3. Karpathy: surgical changes, simplicity first. Jeden task = jeden commit
   (konwencja repo: `fix:`/`feat:`/`chore:` + opis PL).
4. Klucze i18n ZAWSZE do `pl.ts` I `en.ts`. Zasada 5 z CLAUDE.md: nowa funkcja
   nie zabiera niczego istniejącemu przepływowi (test niezmiennika!).
5. Bramki KAŻDEGO obszaru przed oddaniem: `npm run test` + `npm run typecheck`
   + `npm run lint` zielone. Zmiany rules → `npm run test:rules` (JDK21).
   Zmiany functions → `npm --prefix functions run typecheck` + `npm --prefix functions test`.
6. ZAKAZ: push, deploy, bump wersji, dotykanie obszarów innych agentów.

## Bramki końcowe (główna pętla, po wszystkich obszarach)

1. `npm run test`, `npm run typecheck`, `npm run lint`, `npm run build`,
   `npm run check:dist-smoke`, `npm run check:bundle-budget`, `npm run check:no-emoji`.
2. E2E: `npm run e2e` (mock, chromium); przy masowych failach NAJPIERW
   `pkill -f vite` + wyczyść `node_modules/.vite` (lekcja z CLAUDE.md).
3. Push `main`, deploy web (`gh-pages`), deploy functions + firestore rules +
   indexes + storage rules (jeśli zmienione).
4. Weryfikacja wizualna: screenshoty kluczowych ekranów (e2e mock) per zadanie.
5. Mobile: bump iOS `CURRENT_PROJECT_VERSION` = 113, `scripts/release-ios.sh`,
   `testflight_external.py`; Android versionCode = 28, AAB.
6. Wpis do `DECYZJE.md`.

## Poza zakresem

- T19 (mail z pojedynczym treningiem) — decyzja właściciela: nie wdrażać.
- authDomain: przełączony i wdrożony na web PRZED tym planem (osobny strumień).
