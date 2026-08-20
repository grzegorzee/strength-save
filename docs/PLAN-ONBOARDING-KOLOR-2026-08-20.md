# PLAN I — wybór koloru w onboardingu + nowa paleta (2026-08-20)

> Zlecenie właściciela: przy pytaniu o imię w onboardingu dodać wybór koloru
> aplikacji; paleta wg dostarczonego wzoru (10 popularnych kolorów) + brandowa
> limonka jako default. Trzy twarde warunki właściciela zaakceptowane:
> (1) BEZ osobnego kroku — element istniejącego kroku Welcome przy imieniu,
> (2) TYLKO paleta, bez custom hex w onboardingu (hex zostaje w Profilu),
> (3) LIVE PREVIEW — tapnięcie kropki natychmiast przebarwia ekran.
> Tracker pętli agenta (worktree). TDD, stage-per-plik, commity na branchu
> worktree, BEZ push na origin i BEZ deployów (scalenie i wydanie robi sesja
> główna po obu agentach).

## I-T1 — nowa paleta ACCENTS (jedno źródło: Profil + onboarding)

- [x] `src/lib/accent-theme.ts`: ACCENTS = limonka (default, pierwsza, brand)
  + 10 kolorów wg wzoru właściciela (hexy docelowe, HSL policzyć):
  sky `#29b6f6`, indigo `#5865f2`, violet `#8b5cf6`, lavender `#b478f1`,
  magenta `#d946ef`, rose `#f43f5e`, amber `#f5a623`, emerald `#10b981`,
  slate `#64748b`, gray `#8e8e93`. lightHsl/lightHex per kolor (jak dotąd:
  jaśniejszy wariant do gradientu CTA).
  DOWÓD: commit 25c48110, test "paleta: dokładnie hexy wg wzoru właściciela".
- [x] KONTRAST: wspólna ścieżka w applyAccent liczy foreground z luminancji
  hexa dla WSZYSTKICH akcentów. Próg skorygowany GLOBALNIE 0.3 → 0.28 na
  podstawie policzonych kontrastów: lavender (lum 0.2949) z białym tekstem
  miał 2.9:1, z ciemnym 6.1:1; emerald (0.3639) zostaje przy ciemnym
  (7.3:1 vs 2.4:1 białego). Jasny foreground (0 0% 98%) dostają: indigo,
  violet, magenta, rose, slate, gray. DOWÓD: commit 25c48110, testy
  "ciemne akcenty palety..." i "jasne akcenty palety...". Wizualnie
  potwierdzone zrzutami w I-RELEASE.
- [x] WSTECZNA KOMPATYBILNOŚĆ: mapa LEGACY_ACCENT_ALIASES w getAccentById
  (cyan→sky, blue→sky, purple→lavender, pink→magenta, red→rose,
  orange→amber, gold→amber), nieznane id = limonka. Testy it.each na
  każdy alias + boot z zapisanym 'cyan'. DOWÓD: commit 25c48110.
- [x] Profil pokazuje nową paletę automatycznie (ACCENTS to jedno źródło;
  bez zmian w Profile.tsx). Zrzut siatki 390x844 w I-RELEASE.
- [x] Testy accent-theme: 23 passed (paleta 11, unikalne id, limonka default,
  aliasy, foreground per luminancja, custom hex bez regresji); stare wartości
  (cyan '187 86% 53%') zastąpione ŚWIADOMIE przez sky '199 92% 56%' w
  accent-theme.test.ts i profile-sections.test.tsx. DOWÓD: commit 25c48110,
  vitest 44/44 (accent-theme + profile-sections + a11y-i18n), tsc OK, eslint OK.

## I-T2 — wybór koloru w kroku Welcome onboardingu

- [x] `src/components/PlanWizard.tsx`, krok Welcome, sekcja askName: POD polem
  imienia rząd kropek palety (bez custom), label "Kolor aplikacji" / "App
  color", limonka domyślnie, aria-checked, testidy `ob-accent-<id>` +
  radiogroup `ob-accent-swatches`. DOWÓD: commit 42bf6923, testy
  "askName: rząd kropek..." i "bez askName kropek NIE ma".
- [x] LIVE PREVIEW: pickAccent = applyAccent(id) + storeAccentId(id)
  natychmiast w onClick. DOWÓD: commit 42bf6923, test "LIVE PREVIEW: klik
  kropki natychmiast przebarwia ekran i zapisuje localStorage".
- [x] Zapis do profilu: Onboarding.markOnboardingComplete dopisuje
  `'preferences.accentColor': readStoredAccentId()` — wariant ZAWSZE
  (też limonka). DOWÓD: commit 42bf6923, onboarding-accent.test.tsx
  (payload indigo + payload lime); klucz 'preferences' już w allowlist
  firestore.rules (Profil pisze to samo pole).
- [x] NIEZMIENNIK (zasada #5): test "onboarding bez dotknięcia kolorów
  wygląda i działa jak dotąd" (zero nadpisań tokenów, brak localStorage,
  Dalej przechodzi na krok 2). DOWÓD: commit 42bf6923.
- [x] i18n ob.welcome.colorQ w OBU locales; testy PlanWizard (4 nowe) +
  e2e onboarding-accent.spec (new-user → indigo → computed --primary
  '235 86% 65%' od kliku i przez kroki wizarda; Dashboard w indigo w
  scenariuszu active-user ze stanem po onboardingu, bo w trybie e2e profil
  scenariusza new-user nie przełącza onboardingCompleted po zapisie;
  drugi bieg bez wyboru = limonka '73 97% 56%'). DOWÓD: commit 42bf6923,
  vitest 26/26 (plan-wizard-welcome + onboarding-accent + marketing-step +
  a11y-i18n), tsc OK, eslint OK; bieg e2e w I-RELEASE.

## I-RELEASE (lokalne domknięcie w worktree — bez deployu)

- [ ] Bramki: pełny vitest, typecheck, lint, build, check:bundle-budget,
  check:no-emoji; e2e minimum: accent-color.spec, onboarding spec(y),
  ui-improvements, full-app.
- [ ] Przebieg wizualny: zrzuty 390x844 onboardingu (limonka default, po
  kliku indigo, po kliku amber) + Profil z nową paletą + Dashboard w emerald
  (kontrast tekstu na CTA!). Zrzuty do scratchpada sesji.
- [ ] Odhaczenie tasków tutaj z dowodami (hash commita, wyniki), commit
  trackera na branchu. Raport z listą commitów i nazwą brancha.

## Twarde zasady

Zero zmian w: functions/, WorkoutHistory, EmailWorkoutDialog, panel admina
(równolegle pracuje agent maili w głównym repo). Zero deployów, zero push na
origin, zero zmian wersji. Dane realnych userów święte. rtk psuje npx → node
node_modules/.bin/<tool>. Nowe klucze i18n do OBU locales.
