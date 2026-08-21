# WP-G: Hardening procesu — kanoniczne stany danych, route sweep, bezpieczne formatowanie, telemetria jako bramka

> **For agentic workers:** wykonuj task-by-task, TDD. Przeczytaj `00-OVERVIEW.md` i CLAUDE.md zasada 11 (nowa). Ten pakiet biegnie SOLO po batchu 3 (obejmuje kod zmieniony przez całą falę X27).

**Goal:** klasa buga E-8UE4S (nierealne fixtury + rzucające formatowanie + brak sweepa tras + brak alarmu telemetrii) ma być niemożliwa do powtórzenia. Cztery zabezpieczenia: (1) kanoniczne stany danych jako jedyne źródło fixtur, (2) route render sweep na tych stanach, (3) etykiety nie rzucają (safe parse), (4) nowy kod błędu w `client_errors` → automatyczny mail do operatora.

**Architecture:** stany generowane produkcyjną logiką zapisu (nie ręczne obiekty). Sweep montuje każdą trasę na każdym stanie i asertuje brak ErrorBoundary. `parseLocalDateSafe` degraduje do null → etykieta pokazuje placeholder. Digest błędów wzorem `cost-digest.ts`.

**Kontekst (ustalone rozpoznaniem fali X27):**
- Thrower: `parseLocalDate` `src/lib/utils.ts:17,21` (RangeError). ErrorBoundary + kod błędu: `src/components/ErrorBoundary.tsx:17-24`; fallback route'owy `AuthenticatedApp.tsx:200`.
- Znane NIEZABEZPIECZONE parse'y `endDate` (inne źródło danych niż cykle — vacation/reducedMode, własne niezmienniki, ale ta sama klasa ryzyka): grep `parseLocalDate` w `Dashboard.tsx`, `Profile.tsx`, `TrainingPlan.tsx`, `ReducedModeDialog.tsx` (linie sprzed fali: D:523,733,752 / P:278,286 / TP:194,810,828 / RMD:39 — po fali X27 pozycje się przesunęły, szukaj greppem).
- Kanoniczny kształt aktywnego cyklu: `usePlanCycles.ts:198` pisze `endDate: ''`; hydracja `firestore-doc-guards.ts:190`. Plan doc: pola wg `firestore.rules` blok training_plans (po X27 też `status`, `name`).
- Kolekcja `client_errors` istnieje (`firestore.rules:561`, pole `userId`) — telemetria z X13. Sprawdź czy ErrorBoundary faktycznie tam pisze (grep `client_errors` w src/).
- Wzorzec digestu: `functions/src/cost-digest.ts` (`dailyCostDigest` onSchedule 06:10, Resend). E2E seed: `VITE_E2E_MODE` short-circuity (`registration-api.ts:11`, `e2e-auth.ts`, `useTrainingPlan` localStorage mirror).

**Files:**
- Create: `src/test/canonical-states.ts`, `src/test/route-smoke.test.tsx`, `functions/src/error-digest.ts`
- Modify: `src/lib/utils.ts` (parseLocalDateSafe), call-site'y etykiet (wg G3), `src/components/ErrorBoundary.tsx` (jeśli nie loguje do client_errors), `functions/src/index.ts` (eksport digestu), `src/test/workout-history-redesign.test.tsx` (przełącz fixture cyklu na canonical-states — dogfooding)
- Test: wszystkie powyżej + `src/test/date-label-guard.test.ts` (nowy guard)

**Interfaces:**
- Produces: `canonicalStates` z `src/test/canonical-states.ts`:
  ```ts
  export type CanonicalStateId = 'fresh-user' | 'active-plan' | 'plan-ended' | 'empty-history' | 'history-outside-cycles' | 'draft-open';
  export function buildCanonicalState(id: CanonicalStateId): { cycles: PlanCycle[]; workouts: WorkoutSession[]; plan: {...} | null; profile: {...} }
  ```
  Aktywny cykl w `active-plan` MUSI mieć `endDate: ''` i być zbudowany przez tę samą funkcję/kształt co produkcyjny zapis (importuj helpery produkcyjne, np. buduj przez logikę z `usePlanCycles`/`cycle-actions`, nie literal z ręki; tam gdzie import ciągnie firebase — odtwórz kształt 1:1 z komentarzem wskazującym źródło prawdy i asercją zgodności z sanitizerem: `expect(sanitize(doc)).toEqual(doc)`).
- Produces: `parseLocalDateSafe(value: unknown): Date | null` w `src/lib/utils.ts` (nie rzuca; '' / undefined / złe formaty → null) + `formatLocalDateLabel(value, locale, opts): string` zwracające placeholder `'-'` przy null.

## Edge cases

1. Sweep musi realnie renderować (mount z providerami: MemoryRouter + LanguageProvider + UnitProvider + mocki hooków danych jak w `workout-history-redesign.test.tsx` — użyj tego pliku jako wzorca scaffoldingu i mocków). Trasy minimum: `/`, `/plan`, `/history`, `/achievements`, `/exercises`, `/measurements`, `/cycles`, `/profile`. Trasy focused-flow (`/workout/*`, `/exercise/:slug`) — dołącz jeśli scaffolding tani, inaczej odnotuj.
2. Asercja sweepa: brak tekstu fallbacku ErrorBoundary (klucz i18n jego tytułu) + brak wyrzuconego błędu (spy na console.error dopuszczalny z filtrem znanych warningów Radix/act — NIE wycinaj wszystkiego).
3. Stan `plan-ended` używa pola `status:'ended'` z WP-PLANS-1 — sweep weryfikuje więc też nowy kod fali.
4. `parseLocalDateSafe` NIE zastępuje `parseLocalDate` w logice (sortowanie, porównania, silnik harmonogramu — tam throw jest poprawny: głośny błąd w teście). Zamiana TYLKO w renderach etykiet.
5. Digest błędów: raportuj kody NIEWIDZIANE wcześniej (stan: kolekcja `error_digest_state/{code}` pisana przez funkcję adminem) + próg (kod widziany >3 razy = też alert). Mail na `contact@strengthsave.app` przez Resend wzorem cost-digest; zero PII w mailu (kod, message, liczność, platforma — bez uid).
6. ErrorBoundary pisze do client_errors: jeśli już pisze — nic nie zmieniaj; jeśli nie — dopisz best-effort (try/catch, żadnych throw z error handlera; offline → po prostu się nie uda, trudno).

## Tasks

### Task G1: canonical-states.ts (TDD przez asercję zgodności z sanitizerami)

- [ ] Utwórz moduł wg Interfaces; test wewnętrzny (może być w tym samym pliku `.test.ts` obok): każdy stan przechodzi przez odpowiednie sanitizery (`firestore-doc-guards`) bez modyfikacji (roundtrip equal) — to jest kotwica "kształt = produkcja".
- [ ] Przełącz fixture aktywnego cyklu w `workout-history-redesign.test.tsx` na `buildCanonicalState('active-plan')` (dogfooding; test regresyjny E-8UE4S ma zostać).
- [ ] `npx vitest run src/test/workout-history-redesign.test.tsx` → PASS.

### Task G2: route-smoke.test.tsx

- [ ] Zbuduj sweep: `describe.each(trasy) × it.each(stany)` → render bez ErrorBoundary (Edge 1-2). Scaffolding mocków wyciągnij ze wzorca `workout-history-redesign.test.tsx`; jeśli mocki hooków różnią się per strona, zrób wspólny moduł mocków w `canonical-states.ts` obok stanów.
- [ ] Run → wszystkie kombinacje PASS (jeśli któraś trasa pada na którymś stanie — to PRAWDZIWY bug klasy E-8UE4S: napraw źródło w kodzie strony wg zasady safe-label, nie wycinaj przypadku ze sweepa; każdy taki fix opisz w raporcie).

### Task G3: parseLocalDateSafe + sweep etykiet (TDD)

- [ ] Test w nowym `src/test/date-label-guard.test.ts`: (a) `parseLocalDateSafe('')` → null, `parseLocalDateSafe('2026-08-21')` → Date; (b) `formatLocalDateLabel('', 'pl')` → '-'; (c) GUARD: przeczytaj (fs) pliki `src/pages/*.tsx` i `src/components/*.tsx` i asertuj brak wzorca `parseLocalDate(` w tych plikach (dozwolone: `parseLocalDateSafe(`; lista jawnych wyjątków w teście z komentarzem "logika, nie etykieta" — jeśli po G3 jakieś zostają zasadnie).
- [ ] Implementacja w `utils.ts` + zamiana call-site'ów ETYKIET: greppuj `parseLocalDate` po src/pages i src/components; każdy render-label (toLocaleDateString itp.) → safe wariant; logika (porównania dat, silniki) zostaje na rzucającym i ląduje na liście wyjątków guardu.
- [ ] Run → PASS. Pełne `npx vitest run` → PASS (zamiany nie mogły zmienić zachowania przy poprawnych danych).

### Task G4: telemetria — ErrorBoundary → client_errors + dzienny alert (TDD backend)

- [ ] Grep `client_errors` w src/: potwierdź/dopnij zapis z ErrorBoundary (Edge 6). Kształt dokumentu zgodny z rules (:561) — sprawdź wymagane pola.
- [ ] Nowy `functions/src/error-digest.ts` wzorem `cost-digest.ts`: DI-testowalny rdzeń `runErrorDigest(deps)` + `onSchedule("every day 06:20", tz Europe/Warsaw)`; logika wg Edge 5. Test jednostkowy rdzenia (nowy kod → mail; znany rzadki kod → brak; znany kod z nagłym wzrostem → mail).
- [ ] Eksport w `functions/src/index.ts`; build functions → zielone.

### Task G5: finał pakietu

- [ ] `npx vitest run` + `npm run typecheck` + `npm run lint` + build functions → zielone.
- [ ] Raport: ile realnych bugów wykrył sweep (G2), lista wyjątków guardu z G3, status wpięcia ErrorBoundary, potwierdzenie że sweep łapie E-8UE4S (sanity: cofnij lokalnie fix w WorkoutHistory na chwilę, sweep musi paść, przywróć — opisz wynik).

## Pułapki

- Sweep NIE może być flaky: zero timerów realnych (fake timers jeśli trzeba), zero sieci (mocki), deterministyczna data bazowa (vi.setSystemTime).
- Guard z G3 czyta pliki z dysku — pilnuj, żeby nie łapał testów ani komentarzy (filtruj linie z `//` na początku? nie — prościej: dopasowanie w całym pliku jest OK, testy są poza src/pages i src/components).
- Digest: mail przez Resend — klucz/konfiguracja jak w cost-digest (nie twórz nowej konfiguracji sekretów).
- Nie ruszaj planów/kodu pakietów fali poza zamianami z G2/G3 (chirurgicznie, z testem na każdą naprawę).
