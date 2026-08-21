# Fala X28 — plan przeglądowy (2026-08-21, feedback z builda 114)

> **For agentic workers:** każdy pakiet WP-* to samodzielny plan. Wykonuj TYLKO swój pakiet w jego granicach plików. Obowiązują GLOBAL CONSTRAINTS z `docs/plans/x27/00-OVERVIEW.md` (TDD, i18n anchory, zakazy, protokół zakończenia) — przeczytaj TAMTEN plik, poniżej tylko różnice.

**Goal:** poprawki z realnego testu builda 114 + integracja assetów pro-look. Wydanie: web + iOS 115 + AAB v30.

**Kontekst:** baza = main po X27 + commit assetów `media-staging/pro-look/` (38 grafik dark-gym-v1). NASTĘPNY bump iOS = **115**, versionCode = **30** (robi orkiestrator).

## Batche

| Batch | Pakiety |
|---|---|
| 1 | WP-A (dialog własnego ćwiczenia), WP-B (dashboard: data next session + zamykany baner), WP-C (plan: current week + kolejność dni), WP-D (Postępy kafelkowo + wykresy jako kafle + weekly restyle), WP-E (eksport before/after) |
| 2 | WP-F (integracja pro-look: empty states, hero szablonów, paywall, kafel Własne) — solo |
| 3 | Release train (orkiestrator) |

## Granice plików (batch 1 — brak nakładania)

- WP-A: `src/components/ExercisePicker.tsx`, `src/pages/ExerciseLibrary.tsx`, NOWY `src/components/CreateCustomExerciseDialog.tsx` (+ testy). NIE dotyka PlanPreview/PlanDaysEditor/WorkoutDay poza podmianą propsów jeśli trywialna.
- WP-B: `src/pages/Dashboard.tsx`, `src/lib/plan-schedule.ts` (+ mirror `functions/src/garmin-day.ts` + fixture parytetu jeśli zmieniasz resolver), testy.
- WP-C: `src/pages/TrainingPlan.tsx` + komponent pagera tygodni (wg rozpoznania), testy.
- WP-D: `src/pages/Achievements.tsx`, `src/pages/Analytics.tsx`, `src/components/analytics/*`, `src/components/kinetic/AchievementBadge.tsx` (tylko jeśli plan każe), `public/badges/` (kopiuje z media-staging), helper w `src/lib/exercise-media.ts` LUB nowy plik lib — uwaga: `exercise-media.ts` NIE jest w granicach nikogo innego w batchu 1, więc wolno.
- WP-E: `src/components/BodyPhotoCompare.tsx`, NOWY komponent eksportu, `public/share/` (tło z media-staging), testy.
- i18n: WSZYSCY przez anchory: WP-A `exercises.*`, WP-B `dash.*`, WP-C `trainingplan.*`, WP-D `progress.*`/`analytics.*`/`achievements.*`, WP-E `measurements.*`.

## Twarde zasady dodatkowe (lekcje z X27)

1. Playwright NIE normalizuje białych znaków w regexach — w asercjach tekstu z NBSP używaj `[\s ]`.
2. Route sweep (`src/test/route-smoke.test.tsx`) MUSI zostać zielony; jeśli zmieniasz strukturę strony objętej sweepem, aktualizuj sweep świadomie (nie wycinaj stanów).
3. Kanoniczne stany: nowe fixtury dokumentów TYLKO przez `src/test/canonical-states.ts` (rozszerzaj moduł, nie klep ręcznych obiektów).
4. Zero pauz em/en-dash w nowych stringach (guard `no-dashes-guard.test.ts`).
5. Assety z `media-staging/pro-look/` KOPIUJESZ do `public/` w swoim pakiecie (git mv nie jest wymagane; staging zostaje jako źródło).
6. Deep-linki i testy kontraktowe: `/analytics?tab=...` musi działać jak dotąd; `dashboard-quick-actions.test.tsx:163` asertuje `/achievements?view=analytics&tab=summary`.
