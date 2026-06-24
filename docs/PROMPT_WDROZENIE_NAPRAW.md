# Prompt do nowego okna Codex

```text
Przejmij wdrożenie planu naprawy Strength Save. Najpierw przeczytaj:

1. AGENTS.md oraz wskazany w nim /Users/grzegorzjasionowicz/.codex/RTK.md — każdy command shell uruchamiaj przez `rtk`.
2. docs/PLAN_NAPRAWY_2026-06-24.md — to jest obowiązujący zakres, kolejność i kryteria akceptacji.
3. docs/AUDIT_REMEDIATION_PLAN.md wyłącznie jako historyczny kontekst; nie zakładaj, że jego statusy są aktualne.

Cel: naprawić aplikację zgodnie z planem aż do obiektywnie zweryfikowanego stanu release-ready. Priorytet jest bezwzględny: M1 (security/płatności) → M2 (integralność offline i konflikty) → M3 → M4 → M5 → M6 → M7. Nie zaczynaj optymalizacji ani redesignu przed naprawą P0/P1.

Twarde zasady:

- Worktree jest brudny i zawiera cudze, trwające zmiany. Na początku pokaż `rtk git status --short` i `rtk git diff --stat`; nie używaj `git reset --hard`, `git checkout --`, stashowania ani nadpisywania zmian bez ustalenia ich relacji do aktualnego etapu.
- Stosuj Karpathy guidelines: najpierw test reprodukujący, potem minimalny fix, następnie testy celowane i pełne bramki etapu. Nie dodawaj spekulacyjnych abstrakcji ani nie refaktoruj kodu niezwiązanego z bugiem.
- Każdy etap realizuj jako małą, logiczną zmianę. Przed przejściem dalej krótko raportuj: co zostało naprawione, jakie testy przechodzą, jakie ryzyko/założenie pozostało.
- Zapewnij kompatybilność ze starymi dokumentami Firestore i draftami IndexedDB. Migracje muszą być idempotentne i testowane.
- Nie wdrażaj do Firebase/Apple/RevenueCat, nie zmieniaj sekretów, nie publikuj ani nie wykonuj transakcji zewnętrznych. Przygotuj pipeline i preflight, ale zatrzymaj się przed zewnętrznym działaniem wymagającym zgody.
- Gdy wymagana jest decyzja produktowa, której nie da się wywnioskować z kodu (np. polityka mobile registration/App Check), nazwij warianty, ich wpływ i poproś o decyzję. Nie zgaduj.

Minimalne oczekiwania implementacyjne:

1. Zbuduj najpierw wiarygodne harnessy M0 i testy regresyjne dla P0/P1.
2. Zabezpiecz `subscription` i niezmienność `userId` regułami, napraw webhook RevenueCat, lifecycle konta i push po logout.
3. Zastąp timestampowy conflict detection rewizjami, wersjonuj local draft, serializuj jego zapis i napraw provisional promotion oraz Sync Center.
4. Napraw idempotencję onboarding/cycles/plans i potwierdzone błędy poprawności danych/statystyk/jednostek/dat.
5. Następnie wykonaj integracje mobilne, skalowanie i release engineering wskazane w planie.

Weryfikacja końcowa musi obejmować co najmniej:

- `rtk npm run typecheck`
- `rtk npm run lint`
- `rtk npm test`
- `rtk npm --prefix functions test`
- `rtk npm run test:rules`
- właściwe emulatorowe E2E i testy celowane dla każdego naprawionego wyścigu
- `rtk npm run build` oraz `rtk npm --prefix functions run build`

Nie deklaruj sukcesu tylko dlatego, że stare testy są zielone. Zakończ dopiero z raportem: zmienione pliki, testy i wyniki, pokryte scenariusze regresyjne, nierozwiązane blokery oraz dokładne instrukcje manualnych testów i wdrożenia.
```
