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

- [ ] `src/lib/accent-theme.ts`: ACCENTS = limonka (default, pierwsza, brand)
  + 10 kolorów wg wzoru właściciela (hexy docelowe, HSL policzyć):
  sky `#29b6f6`, indigo `#5865f2`, violet `#8b5cf6`, lavender `#b478f1`,
  magenta `#d946ef`, rose `#f43f5e`, amber `#f5a623`, emerald `#10b981`,
  slate `#64748b`, gray `#8e8e93`. lightHsl/lightHex per kolor (jak dotąd:
  jaśniejszy wariant do gradientu CTA).
- [ ] KONTRAST: automatyczny foreground per luminancja dla WSZYSTKICH akcentów
  (dziś tylko custom): ciemniejsze (indigo, emerald, slate, gray, violet...)
  dostają `--primary-foreground`/`--accent-foreground` = 0 0% 98%; jasne
  zostają z ciemnym tekstem. Wspólna ścieżka w applyAccent (nie hardcodować
  listy — liczyć z hexa; próg jak dziś 0.3, sprawdzić wizualnie indigo/emerald
  i ewentualnie skorygować próg globalnie, nie per kolor).
- [ ] WSTECZNA KOMPATYBILNOŚĆ: userzy mają zapisane stare id (cyan, orange,
  pink, purple, blue, red, gold) w localStorage i preferences.accentColor —
  mapa aliasów w getAccentById: cyan→sky, blue→sky, purple→lavender,
  pink→magenta, red→rose, orange→amber, gold→amber. Nieznane id = limonka
  (jak dotąd). Testy na każdy alias.
- [ ] Profil pokazuje nową paletę automatycznie (ACCENTS to jedno źródło;
  siatka flex-wrap pomieści 11 kropek + custom — sprawdzić zrzutem 390x844).
- [ ] Testy accent-theme: paleta 11, unikalne id, limonka default, aliasy,
  foreground per luminancja (indigo → jasny, amber → ciemny), custom hex
  bez regresji; istniejące testy (np. cyan '187 86% 53%') zaktualizować do
  nowych wartości ŚWIADOMIE (to zmiana kontraktu palety, nie przypadek).

## I-T2 — wybór koloru w kroku Welcome onboardingu

- [ ] `src/components/PlanWizard.tsx`, krok Welcome, sekcja askName: POD polem
  imienia rząd kropek palety (bez custom): label krótki (np. "Kolor aplikacji"
  PL / "App color" EN), limonka zaznaczona domyślnie, aria-checked, testidy
  `ob-accent-<id>`.
- [ ] LIVE PREVIEW: onClick = applyAccent(id) + storeAccentId(id) natychmiast
  (ekran onboardingu przebarwia się od razu; localStorage od tego momentu).
- [ ] Zapis do profilu: w `src/pages/Onboarding.tsx` w markOnboardingComplete
  dopisać `'preferences.accentColor'` z aktualnie wybranym id (czytać
  readStoredAccentId() w momencie zapisu; zapisywać tylko gdy różne od
  'lime' ALBO zawsze — wybrać prościej: zawsze, jedno pole więcej nie boli).
- [ ] NIEZMIENNIK (zasada #5): onboarding bez dotknięcia kolorów wygląda
  i działa jak dotąd (limonka, zero nowych wymaganych pól, Dalej działa);
  test na to.
- [ ] i18n do OBU locales. Testy PlanWizard (render kropek w Welcome, klik
  zmienia tokeny), e2e onboardingu: scenariusz new-user → wybór np. indigo →
  ekran przebarwiony (computed --primary) → dokończenie onboardingu →
  Dashboard w indigo; drugi bieg bez wyboru = limonka.

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
