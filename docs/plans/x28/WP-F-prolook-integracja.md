# WP-F (X28): Integracja pro-look — empty states, hero szablonów planów, paywall, kafel "Własne"

> **For agentic workers:** TDD, przeczytaj `docs/plans/x28/00-OVERVIEW.md` + global constraints x27. Pakiet biegnie SOLO w batchu 2 (bazą jest kod po batchu 1). Assety: `media-staging/pro-look/` (manifesty w podkatalogach).

**Goal:** wygenerowane grafiki dark-gym-v1 wchodzą do apki: (1) empty states z ilustracjami (Historia, Pomiary, brak planu, Strava); (2) karty szablonów planów w Browse plans z hero-obrazami (25 grafik, komplet id `tpl-*`); (3) hero na ekranie paywalla PRO; (4) kafel grupy "Własne" w /exercises z dedykowaną grafiką.

**Kontekst:**
- Empty states: wspólny komponent `src/components/EmptyState.tsx` — sprawdź jego API (props) i użycia greppem (`EmptyState` w src/); konsumenci m.in. WorkoutHistory, Measurements, Dashboard/TrainingPlan (stan braku planu po X27), StravaTab/Settings.
- Szablony: `src/components/PlanWizard.tsx` (lista/karty szablonów — grep po `planTemplates`), assety `media-staging/pro-look/plan-templates/tpl-*.webp` nazwane DOKŁADNIE id szablonów z `src/data/planTemplates.ts` (komplet 25 — zweryfikuj `ls` vs lista id testem).
- Paywall: znajdź ekran subskrypcji/paywalla greppem (`paywall`, `useHardPaywall`, RevenueCat purchase UI) — hero `media-staging/pro-look/paywall/hero.webp` (1088x1360, pion).
- Kafel "Własne": `src/pages/ExerciseLibrary.tsx` — grupa custom używa fallbacku gradientowego; asset `media-staging/pro-look/custom-group/tile.webp` (1568x608, jak grupy).
- Wzorce: `getGroupImageUrl` (`exercise-media.ts:152`), `GroupTile` onError fallback.

**Files:**
- Modify: `src/components/EmptyState.tsx` (opcjonalny prop `imageUrl`), konsumenci EmptyState (wg grep — tylko te 4 konteksty z Goal), `src/components/PlanWizard.tsx`, ekran paywalla (wg grep), `src/pages/ExerciseLibrary.tsx` (obraz grupy custom), `src/lib/exercise-media.ts` (helper `getPlanTemplateImageUrl(id)` i stała ścieżki custom — albo nowy mały lib, wybierz spójnie)
- Create: `public/empty-states/*.webp`, `public/plan-templates/*.webp`, `public/paywall/hero.webp`, `public/exercise-groups/custom.webp` (kopie z media-staging), `src/test/prolook-integration.test.tsx`
- i18n: bez nowych kluczy (obrazy dekoracyjne, `alt=""` + aria-hidden)

## Zasady wdrożenia

1. Obrazy DEKORACYJNE: `alt=""`, `loading="lazy"`, `onError` → dotychczasowy wygląd (żaden empty state nie może się zepsuć od braku pliku). EmptyState: obraz NAD tekstem, max-h ograniczone (np. h-40, rounded-2xl, object-cover), tekst i CTA bez zmian.
2. Karty szablonów: hero 72-90 px na górze karty (object-cover, rounded-t), reszta karty bez zmian; brak pliku dla id → karta wygląda jak dotąd (onError). Test kompletności: automatyczny test iterujący po WSZYSTKICH id z planTemplates i sprawdzający istnienie pliku w public/plan-templates/ (fs w teście) — złapie przyszłe nowe szablony bez grafiki jako TODO (test z listą znanych wyjątków, nie hard-fail... DECYZJA: hard-fail z pustą listą wyjątków dziś — wymusza grafikę przy nowym szablonie albo świadomy wpis wyjątku).
3. Paywall: hero u góry ekranu, pod nim istniejąca treść; NIE zmieniaj logiki zakupów ani copy (tylko wizualnie); sprawdź kontrast tekstu na obrazie (tekst NIE na obrazie — obraz jako osobny blok).
4. Rozmiar bundla: +~1,9 MB webp w public/ — sprawdź `check:bundle-budget` (liczy JS, przejdzie) i odnotuj wzrost rozmiaru apki w raporcie.
5. Waga strony: empty states ładują się tylko na pustych ekranach; szablony tylko w wizardzie — bez preloadu.

## Edge cases

1. Fallbacki (onError) testowane dla każdego z 4 kontekstów.
2. Route sweep: stany fresh-user/empty-history teraz renderują OBRAZY w empty states — sweep musi zostać zielony (jsdom nie ładuje obrazów, ale struktura DOM się zmienia — zaktualizuj asercje sweepa TYLKO jeśli pęknie na strukturze).
3. Dark/light: obrazy są ciemne — w light theme empty state z ciemnym obrazem jest OK wizualnie (celowy kontrast), ale sprawdź, że kontener nie zakłada ciemnego tła wokół (obraz w rounded kontenerze, bez łat kolorystycznych).

## Tasks

- [ ] **F1:** kopie assetów do public/ (wg Files) + test kompletności szablonów (Zasada 2) → PASS.
- [ ] **F2 (TDD):** test prolook-integration: EmptyState z imageUrl renderuje obraz z alt="" i lazy; bez imageUrl — jak dotąd; onError chowa obraz. → implementacja propa + wpięcie w 4 konteksty (Historia pusta: history.webp; Pomiary puste: measurements.webp; brak planu: no-plan.webp; Strava niepołączona: strava.webp) → PASS.
- [ ] **F3 (TDD):** test kart szablonów (hero widoczne, brak pliku → fallback) → implementacja w PlanWizard → PASS.
- [ ] **F4:** paywall hero + kafel custom w /exercises (test: grupa custom ma obraz zamiast fallbacku) → PASS.
- [ ] **F5:** `npx vitest run` + typecheck + lint + route sweep → zielone; raport (w tym wzrost rozmiaru dist/ i lista miejsc).

## Pułapki

- Batch 1 zmienił EmptyState-konsumentów (WorkoutHistory nie, ale Dashboard/TrainingPlan tak) — pracujesz na ich NOWEJ wersji; czytaj aktualny kod, nie plan.
- Nie dotykaj `public/exercise-groups/*.webp` istniejących (8 grup); custom.webp to NOWY plik, a `getGroupImageUrl('custom')`/logika grupy Własne wg aktualnej implementacji ExerciseLibrary (grep jak custom group liczy obraz).
- iOS: pliki w public/ wchodzą do bundla przez build:mobile automatycznie (jak exercise-groups w X27) — zero kroków natywnych.
