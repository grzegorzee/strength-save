# PLAN NAPRAWY: stabilność zapisu treningów (2026-07-03)

> **Dla agenta wykonawcy:** WYMAGANY SUB-SKILL: `superpowers:executing-plans` (albo `superpowers:subagent-driven-development`). Kroki mają checkboxy `- [ ]` do odhaczania. Wykonuj zadania PO KOLEI, fazy rozdzielone checkpointami. Nie przeskakuj checkpointów.
> Źródło diagnozy: `docs/AUDYT-2026-07-03.md` (przeczytaj sekcje 1-3 przed startem).

**Goal:** Wyeliminować błędy zapisu treningów: fałszywe konflikty "Trening edytowany na innym urządzeniu" na jednym urządzeniu, "Nie udało się zapisać zmian" w trybie edycji, wskrzeszanie starych draftów, niedeterministyczny zapis. Docelowo: idempotentny, serializowany pipeline zapisu z telemetrią błędów.

**Architektura podejścia:** Najpierw deterministyczne hotfixy P0 (małe, chirurgiczne), potem jeden release train do użytkownika, dopiero potem zmiany strukturalne (idempotencja writeId, jeden silnik syncu, telemetria, E2E). Zasada: każda faza zostawia działający, przetestowany soft.

**Tech stack:** React + TypeScript + Vite, Firebase (Firestore transakcje, persistentLocalCache), IndexedDB + localStorage fallback, vitest + Playwright (mock i emulator), Capacitor iOS.

## Ograniczenia globalne (obowiązują KAŻDE zadanie)

1. Środowisko docelowe: siłownia. iOS wstrzymuje JS w WKWebView po zgaszeniu ekranu; wszystko co ma przeżyć tło musi być w IndexedDB/localStorage, nie w pamięci Reacta.
2. Dane usera święte: zero testowych zapisów na realnym koncie; naprawy danych tylko skryptem z backupem SHA256.
3. i18n: każdy nowy klucz do OBU plików `src/i18n/locales/pl.ts` i `src/i18n/locales/en.ts`, inaczej typecheck padnie.
4. Polskie teksty UI bez pauz em-dash; pełne polskie znaki.
5. Kontrakt draftu: `markDraftSynced` zapisuje znaczniki chmury ZAWSZE; `dirty`/`version`/treść nietykalne przy niezgodnej wersji. Nie łam testu "does not clear a newer local draft".
6. Nie wracać do podejść z sekcji 6 audytu (m.in. konflikt po updatedAt, auto-retry konfliktu, timery JS w tle, sessionId jako klucz UI).
7. Po każdym zadaniu: commit z konwencją `fix(sync): opis (Z<nr>)`. Po każdej fazie: checkpoint.
8. Kolejność weryfikacji przy checkpointach: `npm run test`, `npm run typecheck`, `npm run lint`, `npm run build`.
9. Deploy: push NIE aktualizuje weba (`npm run deploy` osobno); nigdy `cap sync ios` po `npm run deploy` (dist ma wtedy build webowy); iOS wymaga bump `CURRENT_PROJECT_VERSION` + `scripts/release-ios.sh`; functions osobno `firebase deploy --only functions`.
10. Wpisy do `DECYZJE.md` po każdej fazie (co, dlaczego, root cause, weryfikacja).

---

## FAZA 0: Baseline

### Zadanie Z13.0: zielony baseline

**Goal:** Potwierdzić, że main przed zmianami jest zielony, żeby regresje były przypisywalne.

**Workflow:**
- [ ] Krok 1: `git status` (czyste drzewo, branch main) i `git log --oneline -3` (HEAD = 54ba4c3 lub nowszy).
- [ ] Krok 2: `npm run test` oczekiwane: wszystkie zielone. Jeśli nie: STOP, zgłoś userowi.
- [ ] Krok 3: `npm run typecheck && npm run lint && npm run build` oczekiwane: bez błędów.

---

## FAZA 1: Hotfixy P0 (deterministyczne, przed release)

Cel fazy: usunąć pewne i częste źródła symptomów z audytu (sekcja 1). Zmiany małe i chirurgiczne.

### Zadanie Z13: edycja treningu z poprawnym expectedRevision

**Root cause:** `handleFinishEditing` woła `batchSaveWorkout` bez `expectedRevision`; `hasWorkoutWriteConflict` traktuje `undefined` jak 0, więc każda edycja treningu z revision >= 1 rzuca WORKOUT_CONFLICT (audyt S1/S2).

**Files:**
- Modify: `src/hooks/useFirebaseWorkouts.ts:568` (sygnatura options)
- Modify: `src/pages/WorkoutDay.tsx:1514-1549` (handleFinishEditing)
- Test: `src/test/workout-final-sync.test.ts` (regresja dokumentująca pułapkę)

**Interfaces:**
- Produces: `batchSaveWorkout(sessionId, exercises, options)` z `expectedRevision: number | null` jako polem WYMAGANYM w options (null = świadome pominięcie precondition, dozwolone tylko w migracjach/naprawach danych). Wszystkie ścieżki UI przekazują liczbę.

**Workflow:**
- [ ] Krok 1: test regresyjny (dokumentuje pułapkę na poziomie czystej funkcji). W `src/test/workout-final-sync.test.ts` dodaj:

```ts
it('treats missing expectedRevision as conflicting with any synced revision', () => {
  expect(hasWorkoutWriteConflict({ revision: 1 }, undefined)).toBe(true);
  expect(hasWorkoutWriteConflict({ revision: 1 }, 1)).toBe(false);
});
```

- [ ] Krok 2: `npx vitest run src/test/workout-final-sync.test.ts` oczekiwane: PASS (to test dokumentujący istniejące zachowanie; zostaje jako strażnik).
- [ ] Krok 3: wymuszenie decyzji na poziomie typów. W `src/hooks/useFirebaseWorkouts.ts:568` zmień typ options z `expectedRevision?: number | null` na WYMAGANE:

```ts
options: { cycleId?: string; notes?: string; skippedExercises?: string[]; completed?: boolean; dayName?: string; dayFocus?: string; durationSec?: number; startedAt?: number; completedAt?: number; expectedRevision: number | null }
```

- [ ] Krok 4: `npm run typecheck` oczekiwane: FAIL wskazujący WSZYSTKIE call site'y bez expectedRevision (minimum `WorkoutDay.tsx:1527`; jeśli wskaże inne, każdy z nich to potwierdzony bug tej samej klasy: napraw analogicznie i wypisz je w raporcie).
- [ ] Krok 5: fix `handleFinishEditing` (`src/pages/WorkoutDay.tsx:1514`). Baseline czytaj Z SERWERA w momencie zapisu (edycja to jawna akcja z przyciskiem, +1 RTT akceptowalny; eliminuje stale cache):

```ts
const handleFinishEditing = async () => {
  if (!sessionId) {
    toast({
      title: t('workout.toast.errorTitle'),
      description: t('workout.toast.noSessionDesc'),
      variant: "destructive",
    });
    return;
  }

  setIsExplicitSaving(true);
  setSaveError(null);

  let expectedRevision = 0;
  try {
    const serverWorkout = await getWorkoutSessionFromServer(sessionId);
    if (!serverWorkout) {
      setIsExplicitSaving(false);
      setSaveError(t(workoutSyncErrorMessageKey('WORKOUT_NOT_FOUND')));
      toast({ title: t('workout.toast.errorTitle'), description: t('workout.toast.saveChangesFailedDesc'), variant: "destructive" });
      return;
    }
    expectedRevision = Math.max(0, Math.floor(serverWorkout.revision ?? 0));
  } catch (err) {
    setIsExplicitSaving(false);
    setSaveError(t(workoutSyncErrorMessageKey(err)));
    toast({ title: t('workout.toast.errorTitle'), description: t('workout.toast.saveChangesFailedDesc'), variant: "destructive" });
    return;
  }

  const result = await batchSaveWorkout(sessionId, buildExercisesPayload(), {
    notes: dayNotes,
    skippedExercises: skippedExercises.length > 0 ? skippedExercises : undefined,
    dayName: daySnapshotRef.current.dayName || undefined,
    dayFocus: daySnapshotRef.current.focus || undefined,
    expectedRevision,
  });

  setIsExplicitSaving(false);

  if (!result.success) {
    setSaveError(t(workoutSyncErrorMessageKey(result.error)));
    toast({
      title: t('workout.toast.errorTitle'),
      description: t('workout.toast.saveChangesFailedDesc'),
      variant: "destructive",
    });
  } else {
    cloudMetaRef.current = { sessionId, updatedAt: result.updatedAt, revision: result.revision };
    toast({
      title: t('workout.toast.savedShortTitle'),
      description: t('workout.toast.changesSavedDesc'),
    });
    setIsEditing(false);
  }
};
```

Uwaga: `workoutSyncErrorMessageKey` powstaje w Z14. Jeśli robisz Z13 przed Z14, tymczasowo użyj `t('workout.err.saveGeneric')` i wróć tu w Z14. Dopasuj kształt `cloudMetaRef.current` do istniejącej definicji (`WorkoutDay.tsx:147`, pola `sessionId/updatedAt/revision`); wzoruj się na przypisaniach w liniach 862, 903, 1165.
- [ ] Krok 6: `npm run typecheck` oczekiwane: PASS (wszystkie call site'y jawnie przekazują expectedRevision).
- [ ] Krok 7: `npm run test` oczekiwane: PASS.
- [ ] Krok 8: commit `fix(workout): edycja treningu z expectedRevision z serwera zamiast implicit 0 (Z13)`.

### Zadanie Z14: koniec surowych kodów błędów w UI

**Root cause:** `setSaveError(result.error)` wstawia surowe stringi ('WORKOUT_CONFLICT', angielskie komunikaty Firestore) do bannera (audyt 3.6). Taksonomia `classifyWorkoutSyncError` istnieje, ale nie jest podpięta do komunikatów.

**Files:**
- Modify: `src/lib/workout-sync-conflict.ts` (nowa funkcja mapująca)
- Modify: `src/pages/WorkoutDay.tsx:580-583, 651-654` (oraz miejsce z Z13 krok 5)
- Modify: `src/i18n/locales/pl.ts`, `src/i18n/locales/en.ts` (nowe klucze)
- Test: `src/test/workout-sync-conflict.test.ts`

**Interfaces:**
- Produces: `workoutSyncErrorMessageKey(error: unknown): string` zwraca klucz i18n; używana we WSZYSTKICH miejscach pokazujących błąd syncu userowi (WorkoutDay teraz, SyncCenterCard w Fazie 4).

**Workflow:**
- [ ] Krok 1: failing test w `src/test/workout-sync-conflict.test.ts`:

```ts
import { workoutSyncErrorMessageKey } from '@/lib/workout-sync-conflict';

describe('workoutSyncErrorMessageKey', () => {
  it('maps raw sync errors to i18n keys', () => {
    expect(workoutSyncErrorMessageKey('WORKOUT_CONFLICT')).toBe('workout.err.conflict');
    expect(workoutSyncErrorMessageKey(new Error('permission-denied: Missing or insufficient permissions'))).toBe('workout.err.permission');
    expect(workoutSyncErrorMessageKey('WORKOUT_NOT_FOUND')).toBe('workout.err.notFound');
    expect(workoutSyncErrorMessageKey(new Error('Failed to get document because the client is offline.'))).toBe('workout.err.offline');
    expect(workoutSyncErrorMessageKey('CLOUD_NOT_CONFIRMED: sets mismatch')).toBe('workout.err.validation');
    expect(workoutSyncErrorMessageKey('cokolwiek innego')).toBe('workout.err.unknown');
  });
});
```

- [ ] Krok 2: `npx vitest run src/test/workout-sync-conflict.test.ts` oczekiwane: FAIL (funkcja nie istnieje).
- [ ] Krok 3: implementacja w `src/lib/workout-sync-conflict.ts` (pod `classifyWorkoutSyncError`):

```ts
export const workoutSyncErrorMessageKey = (error: unknown): string => {
  switch (classifyWorkoutSyncError(error instanceof Error ? error.message : error)) {
    case 'revision-conflict': return 'workout.err.conflict';
    case 'permission': return 'workout.err.permission';
    case 'not-found': return 'workout.err.notFound';
    case 'validation': return 'workout.err.validation';
    case 'offline': return 'workout.err.offline';
    default: return 'workout.err.unknown';
  }
};
```

- [ ] Krok 4: klucze i18n. `src/i18n/locales/pl.ts` (obok `workout.err.*`, linia ~958):

```ts
'workout.err.conflict': 'Ten trening ma nowszą wersję w chmurze. Odśwież widok i spróbuj ponownie.',
'workout.err.permission': 'Brak uprawnień do zapisu. Wyloguj się i zaloguj ponownie, a jeśli problem wraca, napisz do nas.',
'workout.err.notFound': 'Nie znaleziono tego treningu w chmurze.',
'workout.err.validation': 'Chmura nie potwierdziła kompletnego zapisu. Spróbuj ponownie.',
```

`src/i18n/locales/en.ts` (analogiczna sekcja):

```ts
'workout.err.conflict': 'This workout has a newer version in the cloud. Refresh the view and try again.',
'workout.err.permission': 'No permission to save. Sign out and back in; if it persists, contact us.',
'workout.err.notFound': 'This workout was not found in the cloud.',
'workout.err.validation': 'The cloud did not confirm a complete save. Try again.',
```

- [ ] Krok 5: podmień w `WorkoutDay.tsx`: linia ~580 `setSaveError(errorMessage)` na `setSaveError(t(workoutSyncErrorMessageKey(result.error)))` (zwracany error do wywołujących zostaw surowy, mapuj tylko to co idzie do UI); linia ~651 analogicznie `setSaveError(t(workoutSyncErrorMessageKey(err)))`; miejsce z Z13 już mapuje. Import: `import { workoutSyncErrorMessageKey } from '@/lib/workout-sync-conflict';`.
- [ ] Krok 6: `npx vitest run src/test/workout-sync-conflict.test.ts` oczekiwane: PASS. Potem `npm run typecheck` (klucze w obu locale) oczekiwane: PASS.
- [ ] Krok 7: commit `fix(workout): komunikaty błędów syncu przez taksonomię i18n zamiast surowych kodów (Z14)`.

### Zadanie Z15: fallback localStorage nie gubi baseline rewizji

**Root cause:** `withFallbackLoad`/`withFallbackSave` (`workout-draft-db.ts:173-207`) odbudowują draft bez `cloudRevision`/`cloudUpdatedAt` i z `version: 1`, więc awaryjna ścieżka sama produkuje fałszywe konflikty (audyt S3 mechanizm B).

**Files:**
- Modify: `src/lib/workout-draft.ts` (format legacy o opcjonalne pola)
- Modify: `src/lib/workout-draft-db.ts:173-207`
- Test: `src/test/workout-draft-db.test.ts`

**Interfaces:**
- Produces: `WorkoutDraft` z opcjonalnymi `cloudRevision?: number; cloudUpdatedAt?: number; version?: number`. Roundtrip przez fallback zachowuje te pola.

**Workflow:**
- [ ] Krok 1: failing test w `src/test/workout-draft-db.test.ts` (wzoruj się na istniejącym teście fallbacku; użyj tego samego mechanizmu symulacji niedostępnego IDB, który już jest w tym pliku):

```ts
it('fallback localStorage zachowuje cloudRevision i version draftu', async () => {
  // przygotuj draft z cloudRevision: 5, cloudUpdatedAt: 1730000000000, version: 7
  // zapisz przez workoutDraftDb.saveActiveDraft przy niedostępnym IDB (fallback)
  // wczytaj przez workoutDraftDb.loadActiveDraft przy niedostępnym IDB
  // expect(loaded?.cloudRevision).toBe(5);
  // expect(loaded?.cloudUpdatedAt).toBe(1730000000000);
  // expect(loaded?.version).toBe(7);
});
```

Wypełnij ciało zgodnie z konwencją sąsiedniego testu "falls back to localStorage" (ten sam setup/mocki).
- [ ] Krok 2: `npx vitest run src/test/workout-draft-db.test.ts` oczekiwane: FAIL (pola gubione).
- [ ] Krok 3: implementacja. W `src/lib/workout-draft.ts` do interfejsu `WorkoutDraft` dopisz:

```ts
  cloudRevision?: number;
  cloudUpdatedAt?: number;
  version?: number;
```

W `src/lib/workout-draft-db.ts` w `withFallbackSave` dodaj do obiektu przekazywanego do `workoutDraft.save`:

```ts
    ...(draft.cloudRevision != null && { cloudRevision: draft.cloudRevision }),
    ...(draft.cloudUpdatedAt != null && { cloudUpdatedAt: draft.cloudUpdatedAt }),
    version: draft.version,
```

W `withFallbackLoad` zamień `version: 1,` na `version: draft.version ?? 1,` i dodaj:

```ts
    ...(draft.cloudRevision != null && { cloudRevision: draft.cloudRevision }),
    ...(draft.cloudUpdatedAt != null && { cloudUpdatedAt: draft.cloudUpdatedAt }),
```

`dirty: true` zostaje (bezpieczne: wymusi sync, ale z poprawnym baseline nie wywoła konfliktu).
- [ ] Krok 4: `npx vitest run src/test/workout-draft-db.test.ts` oczekiwane: PASS (cały plik, nie tylko nowy test).
- [ ] Krok 5: commit `fix(sync): fallback localStorage przenosi cloudRevision/cloudUpdatedAt/version (Z15)`.

### Zadanie Z16: kopia localStorage czyszczona przy sprzątaniu draftu + bezpiecznik migracji legacy

**Root cause:** `clearActiveDraft` przy działającym IDB nie czyści kopii `fittracker_workout_draft:<uid>`; stara kopia wskrzesza się przy pierwszym błędzie odczytu IDB. `migrateFromLocalStorage` wskrzesza dowolnie stary legacy draft (audyt S4 drogi 1-2).

**Files:**
- Modify: `src/lib/workout-draft-db.ts:298-342` (runWrite) i `:485-512` (migrateFromLocalStorage)
- Test: `src/test/workout-draft-db.test.ts`

**Workflow:**
- [ ] Krok 1: dwa failing testy w `src/test/workout-draft-db.test.ts`:

```ts
it('clearActiveDraft usuwa też kopię fallback z localStorage', async () => {
  // setup: działające (fake) IDB; zapisz draft sesji S przez saveActiveDraft;
  // dodatkowo zapisz kopię fallback: workoutDraft.save({...ten sam sessionId...}, userId);
  // wykonaj: await workoutDraftDb.clearActiveDraft(userId, sessionId);
  // expect(workoutDraft.load(userId)).toBeNull();
});

it('migrateFromLocalStorage pomija i usuwa drafty starsze niż 48h', async () => {
  // setup: workoutDraft.save({ ...draft, savedAt: Date.now() - 49 * 60 * 60 * 1000 }, userId);
  // wykonaj migrację (ścieżka wywoływana przez loadActiveDraft/migrate wg implementacji);
  // expect: draft NIE trafił do IDB, klucz localStorage usunięty.
});
```

Dopasuj wywołania do faktycznego API migracji (przeczytaj `workout-draft-db.ts:485-512` przed pisaniem).
- [ ] Krok 2: `npx vitest run src/test/workout-draft-db.test.ts` oczekiwane: FAIL (2 nowe).
- [ ] Krok 3: implementacja. Helper w `workout-draft-db.ts` (nad `runWrite`):

```ts
const clearFallbackCopyIfMatches = (userId: string, sessionId?: string): void => {
  try {
    const copy = workoutDraft.load(userId);
    if (!copy) return;
    if (!sessionId || copy.sessionId === sessionId) {
      workoutDraft.clear(userId);
    }
  } catch {
    // best-effort: brak dostępu do localStorage nie może blokować sprzątania IDB
  }
};
```

W `runWrite`, w gałęzi delete (value === null) przy DZIAŁAJĄCYM IDB, po `tx.oncomplete` wywołaj `clearFallbackCopyIfMatches(userId, sessionId)` (dla ścieżki "usuń wszystkie": bez sessionId). W `migrateFromLocalStorage` na początku:

```ts
const MAX_LEGACY_DRAFT_AGE_MS = 48 * 60 * 60 * 1000;
// draft starszy niż 48h nie wraca do życia; usuwamy klucz żeby nie wracał nigdy
if (legacyDraft.savedAt && Date.now() - legacyDraft.savedAt > MAX_LEGACY_DRAFT_AGE_MS) {
  workoutDraft.clear(userId);
  return null;
}
```

Dopasuj nazwy zmiennych do faktycznego kodu migracji.
- [ ] Krok 4: `npx vitest run src/test/workout-draft-db.test.ts` oczekiwane: PASS (cały plik; szczególnie istniejące testy fallbacku NIE mogą się posypać).
- [ ] Krok 5: prefill to nie treść (audyt S4 droga 3). `hasDraftContent` (`workout-draft-db.ts:154-161`) uznaje prefilowane `weight>0` za realną zawartość, więc wystartowany i porzucony trening wisi jako "niezapisane zmiany" na zawsze. Failing test:

```ts
it('hasDraftContent ignoruje prefilowane serie bez completed', () => {
  const draft = /* draft z setami { reps: 10, weight: 50, completed: false }, bez notatek */;
  expect(hasDraftContent(draft)).toBe(false);
});

it('hasDraftContent widzi odhaczoną serię lub notatkę', () => {
  // wariant A: jeden set completed: true  -> true
  // wariant B: dayNotes niepuste          -> true
});
```

Implementacja: treść = co najmniej jeden set z `completed === true` LUB niepusta notatka (dayNotes/exerciseNotes). Sprawdź wszystkich konsumentów `hasDraftContent` (`rg -n "hasDraftContent" src`) i upewnij się, że zmiana nie ukrywa draftu z realnym postępem.
- [ ] Krok 6: commit `fix(sync): sprzątanie kopii fallback, bezpiecznik migracji legacy, prefill to nie treść draftu (Z16)`.

### Zadanie Z17: znaczniki syncu nie cofają draftu w pamięci

**Root cause:** po udanym checkpoincie `WorkoutDay.tsx:636-645` odbudowuje `activeDraftRef.current` ze STALE `currentDraft` (sprzed edycji wykonanych w trakcie syncu); kolejne zapisy draftu są cicho odrzucane przez `latestWriteVersions`, a `dirty=false` wyłącza checkpointy (audyt S5).

**Files:**
- Create: `src/lib/workout-sync-markers.ts`
- Modify: `src/pages/WorkoutDay.tsx:636-645`
- Test: `src/test/workout-sync-markers.test.ts`

**Interfaces:**
- Produces: `applySyncMarkers(base: ActiveWorkoutDraft, syncedVersion: number, syncedAt: number, result: { updatedAt?: number; revision?: number }): ActiveWorkoutDraft` czysta funkcja; `dirty` czyszczone TYLKO gdy `base.version === syncedVersion` (semantyka jak `markDraftSynced` w IDB).

**Workflow:**
- [ ] Krok 1: failing test `src/test/workout-sync-markers.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { applySyncMarkers } from '@/lib/workout-sync-markers';
import type { ActiveWorkoutDraft } from '@/lib/workout-draft-db';

const baseDraft = (over: Partial<ActiveWorkoutDraft>): ActiveWorkoutDraft => ({
  userId: 'u1', sessionId: 's1', dayId: 'd1', date: '2026-07-03',
  exerciseSets: {}, exerciseNotes: {}, dayNotes: '', skippedExercises: [],
  cycleId: null, sessionOrigin: 'remote', remoteSessionId: null,
  startedAt: 1, updatedAt: 1, savedAt: 1, lastFirebaseSyncAt: null,
  dirty: true, completedLocally: false, finalSyncPending: false, version: 3,
  ...over,
} as ActiveWorkoutDraft);

describe('applySyncMarkers', () => {
  it('czyści dirty gdy wersja bazowa równa zsynchronizowanej', () => {
    const out = applySyncMarkers(baseDraft({ version: 3 }), 3, 999, { updatedAt: 111, revision: 7 });
    expect(out.dirty).toBe(false);
    expect(out.cloudRevision).toBe(7);
    expect(out.cloudUpdatedAt).toBe(111);
    expect(out.lastFirebaseSyncAt).toBe(999);
    expect(out.version).toBe(3);
  });

  it('NIE czyści dirty i NIE cofa wersji gdy draft poszedł do przodu w trakcie syncu', () => {
    const out = applySyncMarkers(baseDraft({ version: 5, dirty: true }), 3, 999, { revision: 7 });
    expect(out.dirty).toBe(true);
    expect(out.version).toBe(5);
    expect(out.cloudRevision).toBe(7);
  });
});
```

Dopasuj pola `baseDraft` do faktycznego typu `ActiveWorkoutDraft` (przeczytaj definicję w `workout-draft-db.ts` przed pisaniem; test ma się kompilować bez `as any`).
- [ ] Krok 2: `npx vitest run src/test/workout-sync-markers.test.ts` oczekiwane: FAIL (moduł nie istnieje).
- [ ] Krok 3: implementacja `src/lib/workout-sync-markers.ts`:

```ts
import type { ActiveWorkoutDraft } from '@/lib/workout-draft-db';

// Lustrzana semantyka markDraftSynced (IDB): znaczniki chmury zawsze,
// dirty czyszczone tylko gdy nic nie doszło w trakcie syncu.
export const applySyncMarkers = (
  base: ActiveWorkoutDraft,
  syncedVersion: number,
  syncedAt: number,
  result: { updatedAt?: number; revision?: number },
): ActiveWorkoutDraft => ({
  ...base,
  dirty: base.version === syncedVersion ? false : base.dirty,
  lastFirebaseSyncAt: syncedAt,
  ...(result.updatedAt !== undefined && { cloudUpdatedAt: result.updatedAt }),
  ...(result.revision !== undefined && { cloudRevision: result.revision }),
});
```

- [ ] Krok 4: `npx vitest run src/test/workout-sync-markers.test.ts` oczekiwane: PASS.
- [ ] Krok 5: podmiana w `WorkoutDay.tsx:636-645`:

```ts
      if (usesActiveDraftStore) {
        const base = activeDraftRef.current?.sessionId === targetSessionId
          ? activeDraftRef.current
          : currentDraft!;
        const syncedDraft = applySyncMarkers(base, currentDraft!.version, syncedAt, result);
        activeDraftRef.current = syncedDraft;
        setActiveDraft(prev => prev && prev.sessionId === syncedDraft.sessionId ? syncedDraft : prev);
      }
```

Import: `import { applySyncMarkers } from '@/lib/workout-sync-markers';`.
- [ ] Krok 6: `npm run test && npm run typecheck` oczekiwane: PASS.
- [ ] Krok 7: commit `fix(sync): znaczniki syncu nakładane na bieżący draft zamiast stale snapshotu (Z17)`.

### Zadanie Z18: `skipped` nie jest błędem

**Root cause:** `syncDraftToFirebase` zwraca `{ success: false, skipped: true }` gdy inny sync trwa (`WorkoutDay.tsx:468-470`), a `handleCompleteWorkout` i `handleRetrySync` pokazują wtedy toast błędu i ustawiają finalSyncPending (audyt 3.7 pkt 3).

**Files:**
- Modify: `src/pages/WorkoutDay.tsx` (konsumenci wyniku syncDraftToFirebase)

**Workflow:**
- [ ] Krok 1: znajdź konsumentów: `rg -n "syncDraftToFirebase\(" src/pages/WorkoutDay.tsx`. Dla każdego miejsca traktującego `!result.success` jako twardy błąd dodaj wcześniejszy warunek:

```ts
if (!result.success && result.skipped) {
  return; // inny sync w toku; nie strasz usera, kolejny checkpoint dokończy
}
```

Upewnij się, że typ zwrotki `syncDraftToFirebase` deklaruje `skipped?: boolean` (jeśli nie, dodaj).
- [ ] Krok 2: `npm run typecheck && npm run test` oczekiwane: PASS.
- [ ] Krok 3: commit `fix(workout): pominięty sync (mutex zajęty) nie jest raportowany jako błąd (Z18)`.

### CHECKPOINT FAZY 1

- [ ] `npm run test` wszystkie zielone; `npm run typecheck`; `npm run lint`; `npm run build`.
- [ ] Smoke web lokalnie (`npm run dev`): start treningu, odhaczenie serii, zakończenie, wejście w edycję ukończonego treningu, zmiana serii, "Zapisz zmiany" bez błędu, druga edycja z rzędu też bez błędu.
- [ ] Wpis do `DECYZJE.md`: Faza 1 planu 2026-07-03 (Z13-Z18), root cause per zadanie, wynik weryfikacji.
- [ ] STOP: pokaż userowi podsumowanie fazy i poproś o zgodę na FAZĘ 2 (release).

---

## FAZA 2: Release train + weryfikacja terenowa

Cel fazy: dowieźć użytkownikowi WSZYSTKIE zaległe fixy (Z1-Z12 z 2026-06-29 + Z13-Z18). Bez tej fazy user dalej trenuje na kodzie z bugami (audyt sekcja 2).

### Zadanie Z19: wdrożenie

**Goal:** Produkcja (web + iOS + functions) zawiera komplet fixów.

**Workflow:**
- [ ] Krok 1: ZGODA USERA na release (push + deploy web + functions + TestFlight; build iOS trafi automatycznie do zewnętrznego testera). Bez zgody nie ruszaj dalej.
- [ ] Krok 2: `git push origin main`.
- [ ] Krok 3: `firebase deploy --only functions` (zawiera Z7: symetria callable z regułami). Oczekiwane: deploy bez błędów.
- [ ] Krok 4: `npm run deploy` (web gh-pages). Weryfikacja: otwórz produkcyjny URL, sprawdź w konsoli hash bundla, że jest świeży (wzorzec diagnozy: grep dist).
- [ ] Krok 5: iOS: bump `CURRENT_PROJECT_VERSION` w `ios/App/App.xcodeproj/project.pbxproj` (6 wystąpień, wszystkie równe, preflight to sprawdzi) na 47, potem `scripts/release-ios.sh "Stabilizacja zapisu: edycja treningu, fałszywe konflikty, stare drafty. Test: edycja ukończonego treningu, trening z gaszeniem ekranu."`.
- [ ] Krok 6: commit zmian wersji + wpis DECYZJE.md (release R47: zakres, hashe).

### Zadanie Z20: test terenowy (wykonuje USER, agent przygotowuje scenariusz)

**Goal:** Potwierdzenie na realnym urządzeniu, że symptomy S1-S5 zniknęły.

**Workflow:**
- [ ] Krok 1: przekaż userowi listę scenariuszy (build 47 z TestFlight):
  1. Edycja: otwórz ukończony trening, Edytuj, zmień jedną serię, Zapisz zmiany. Oczekiwane: "Zapisano", zero czerwonego bannera. Powtórz drugi raz z rzędu.
  2. Background/resume: start treningu, odhacz 2 serie, zgaś ekran na 2-3 min (najlepiej przy słabym zasięgu), wróć, odhacz kolejną serię, zakończ trening. Oczekiwane: zero modala "edytowano na innym urządzeniu", zero "Błąd zapisu".
  3. Stare drafty: po zakończeniu treningu wróć na Dashboard i do Sync Center. Oczekiwane: zero wiszących "niezapisanych zmian" z poprzednich treningów.
  4. Kolejny dzień: start nowego treningu. Oczekiwane: świeże pola (prefill z poprzedniego treningu to zamierzone zachowanie), zero starych odhaczonych serii.
- [ ] Krok 2: kryterium przejścia: 2 pełne treningi bez żadnego z symptomów. Jeśli symptom wystąpi: zbierz dokładny scenariusz + screenshot, wróć do audytu sekcja 1, NIE improwizuj fixów poza planem.

### CHECKPOINT FAZY 2

- [ ] User potwierdza scenariusze 1-4. Dopiero wtedy FAZA 3.

---

## FAZA 3: Idempotencja zapisu (eliminacja self-conflictów z definicji)

Cel fazy: retry po lost-ack (suspend, słaby zasięg) ma być no-op sukcesem, nie konfliktem (audyt S3 mechanizm A). Rozwiązanie: klucz idempotencji `writeId` w dokumencie treningu.

### Zadanie Z21: writeId w batchSaveWorkout

**Files:**
- Create: `src/lib/workout-write-attempt.ts`
- Modify: `src/hooks/useFirebaseWorkouts.ts:565-620` (batchSaveWorkout)
- Modify: `src/pages/WorkoutDay.tsx` (saveOptions w syncDraftToFirebase i handleFinishEditing: generowanie writeId)
- Modify: `src/lib/workout-draft-db.ts` (pole `pendingWriteId` w ActiveWorkoutDraft, persystowane)
- Test: `src/test/workout-write-attempt.test.ts`

**Interfaces:**
- Produces: `resolveWriteAttempt(current: { revision?: number; lastWriteId?: string }, expectedRevision: number | null, writeId: string): 'ok' | 'already-applied' | 'conflict'`. `batchSaveWorkout` przyjmuje w options `writeId: string` i zapisuje `lastWriteId` w dokumencie; zwraca `{ success: true, alreadyApplied?: true, ... }` dla powtórki.

**Semantyka (dokładnie ta):**
1. `expectedRevision === null` (świadome pominięcie): 'ok'.
2. Rewizje zgodne: 'ok' (normalny zapis, transakcja zapisuje `lastWriteId: writeId`).
3. Rewizje niezgodne, ale `current.lastWriteId === writeId`: 'already-applied' (mój poprzedni zapis doszedł, odpowiedź zginęła; zwróć sukces z aktualnymi updatedAt/revision z dokumentu, NIE zapisuj nic).
4. Rewizje niezgodne i inny lastWriteId: 'conflict' (realny konflikt, throw WORKOUT_CONFLICT).

**Workflow:**
- [ ] Krok 1: failing test `src/test/workout-write-attempt.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { resolveWriteAttempt } from '@/lib/workout-write-attempt';

describe('resolveWriteAttempt', () => {
  it('zgodna rewizja = ok', () => {
    expect(resolveWriteAttempt({ revision: 3, lastWriteId: 'a' }, 3, 'b')).toBe('ok');
  });
  it('null = świadome pominięcie preconditionu', () => {
    expect(resolveWriteAttempt({ revision: 9 }, null, 'b')).toBe('ok');
  });
  it('lost-ack retry = already-applied', () => {
    expect(resolveWriteAttempt({ revision: 4, lastWriteId: 'b' }, 3, 'b')).toBe('already-applied');
  });
  it('realny konflikt = conflict', () => {
    expect(resolveWriteAttempt({ revision: 4, lastWriteId: 'a' }, 3, 'b')).toBe('conflict');
  });
  it('stary dokument bez lastWriteId przy niezgodnej rewizji = conflict', () => {
    expect(resolveWriteAttempt({ revision: 4 }, 3, 'b')).toBe('conflict');
  });
});
```

- [ ] Krok 2: `npx vitest run src/test/workout-write-attempt.test.ts` oczekiwane: FAIL.
- [ ] Krok 3: implementacja `src/lib/workout-write-attempt.ts`:

```ts
export type WriteAttemptResolution = 'ok' | 'already-applied' | 'conflict';

export const resolveWriteAttempt = (
  current: { revision?: number; lastWriteId?: string },
  expectedRevision: number | null,
  writeId: string,
): WriteAttemptResolution => {
  if (expectedRevision === null) return 'ok';
  const currentRevision = Math.max(0, Math.floor(current.revision ?? 0));
  const expected = Math.max(0, Math.floor(expectedRevision));
  if (currentRevision === expected) return 'ok';
  if (current.lastWriteId && current.lastWriteId === writeId) return 'already-applied';
  return 'conflict';
};
```

- [ ] Krok 4: test PASS, potem integracja w `batchSaveWorkout` (transakcja): zamiast `hasWorkoutWriteConflict` użyj `resolveWriteAttempt`; dla 'already-applied' zwróć `{ updatedAt: current.updatedAt, revision: current.revision, alreadyApplied: true }` bez update; dla 'ok' dodaj `lastWriteId: writeId` do updateData. `writeId` w options jako wymagany string; call site'y generują `crypto.randomUUID()` PER PRÓBA ZAPISU DANEJ TREŚCI: nowy writeId przy nowej treści (nowa wersja draftu), TEN SAM writeId przy retry tej samej treści. W drafcie persystuj `pendingWriteId` (ustawiany przed próbą, czyszczony po acku) i przy retry z draftu używaj go zamiast generować nowy.
- [ ] Krok 5: aktualizacja typu `WorkoutSession` o `lastWriteId?: string` (sprawdź `src/types`), draftu o `pendingWriteId?: string | null`.
- [ ] Krok 6: `npm run test && npm run typecheck && npm run lint` oczekiwane: PASS.
- [ ] Krok 7: commit `feat(sync): idempotentny zapis treningu przez writeId, lost-ack retry bez konfliktu (Z21)`.

### Zadanie Z22: baseline nigdy ze stale cache

**Root cause:** `workout-read-store.ts:110-123` nie odróżnia snapshotu z cache od serwera; seed `cloudMetaRef`/draftu starą rewizją = fałszywy konflikt (audyt 3.5).

**Files:**
- Modify: `src/lib/workout-read-store.ts:110-123`
- Modify: `src/pages/WorkoutDay.tsx:862-866` (seed cloudMetaRef)
- Test: `src/test/workout-read-store.test.ts` (jeśli istnieje; jeśli nie, utwórz z mockiem onSnapshot wg wzorca innych testów store)

**Workflow:**
- [ ] Krok 1: w `workout-read-store.ts` włącz `includeMetadataChanges: false` (bez zmiany) ale propaguj metadane: do obiektu emitowanego słuchaczom dodaj `fromCache: snapshot.metadata.fromCache`. Jeśli struktura emisji to lista treningów, dodaj pole obok (np. emituj `{ workouts, fromCache }`) i zaktualizuj konsumentów (typecheck wskaże wszystkich).
- [ ] Krok 2: w `WorkoutDay.tsx` seed `cloudMetaRef` wykonuj TYLKO gdy `fromCache === false`. Gdy draft nie ma `cloudRevision`, a snapshot jest z cache: przed pierwszym checkpointem pobierz baseline przez `getWorkoutSessionFromServer` (wzorzec już użyty w Z13).
- [ ] Krok 3: test: mock snapshotu z `metadata.fromCache: true` nie seeduje baseline; z `false` seeduje. Napisz wg wzorca istniejących testów z mockiem Firestore.
- [ ] Krok 4: `npm run test && npm run typecheck` PASS; commit `fix(sync): baseline rewizji tylko z serwera, nigdy ze stale cache (Z22)`.

### CHECKPOINT FAZY 3

- [ ] Pełna weryfikacja (test/typecheck/lint/build) + wpis DECYZJE.md.
- [ ] Scenariusz ręczny na symulatorze: trening, odhaczenie serii, wymuszenie utraty sieci w trakcie checkpointu (Wi-Fi off w trakcie zapisu), powrót sieci, kolejny checkpoint. Oczekiwane: zero dialogu konfliktu.
- [ ] Release R48 (jak Z19, za zgodą usera) albo odłóż release do końca Fazy 4 (decyzja usera).

---

## FAZA 4: Jeden silnik syncu + sprzątanie cyklu życia

Cel fazy: jedna droga zapisu zamiast trzech egzekutorów z kopiami (audyt 3.2-3.3), koniec rozjazdów kolejka/draft.

### Zadanie Z23: workout-sync-engine

**Files:**
- Create: `src/lib/workout-sync-engine.ts`
- Modify: `src/pages/WorkoutDay.tsx` (syncDraftToFirebase deleguje do silnika), `src/components/SyncCenterCard.tsx` (syncOne/handleKeepLocal), `src/components/AutoSyncOnReconnect.tsx`
- Test: `src/test/workout-sync-engine.test.ts`

**Interfaces:**
- Produces:

```ts
export interface WorkoutSyncDeps {
  loadDraft: (userId: string, sessionId: string) => Promise<ActiveWorkoutDraft | null>;
  saveWorkout: typeof batchSaveWorkout;            // sygnatura z Z21 (writeId, expectedRevision)
  getFromServer: (sessionId: string) => Promise<WorkoutSession | null>;
  markSynced: typeof workoutDraftDb.markDraftSynced;
  clearDraft: (userId: string, sessionId: string) => Promise<void>;
  queue: typeof workoutSyncQueue;
}
export type SyncKind = 'checkpoint' | 'final';
export interface SyncOutcome {
  success: boolean;
  skipped?: boolean;         // inny sync tej sesji w locie
  conflict?: boolean;        // realny konflikt: UI decyduje o dialogu
  alreadyFinalized?: boolean;
  error?: string;            // surowy kod; UI mapuje przez workoutSyncErrorMessageKey
  revision?: number;
  updatedAt?: number;
}
export const syncWorkoutSession = (
  userId: string, sessionId: string, kind: SyncKind, deps: WorkoutSyncDeps,
): Promise<SyncOutcome>
```

- Blokada: modułowa `Map<string, Promise<SyncOutcome>>` po kluczu `${userId}::${sessionId}`; równoległe wywołanie zwraca TĘ SAMĄ obietnicę (nie skipped-error).
- Treść ZAWSZE z draftu (deps.loadDraft), nigdy z kopii w kolejce.
- Sekwencja final: load draft, promocja provisional jeśli trzeba, getFromServer + matchesFinalWorkoutContent (idempotencja), save (writeId), walidacja read-back, markSynced/clearDraft, queue.remove. Przenieś istniejącą logikę z `WorkoutDay.tsx:430-659` (to jest wzorzec kanoniczny), nie wymyślaj nowej.

**Workflow:**
- [ ] Krok 1: testy silnika z wstrzykniętymi fake'ami deps (failing): (a) dwa równoległe `syncWorkoutSession` tej samej sesji wykonują JEDEN zapis (licznik na fake saveWorkout = 1, obie obietnice sukces); (b) final z już sfinalizowaną treścią w chmurze nie zapisuje (alreadyFinalized); (c) konflikt z saveWorkout propagowany jako `{ success: false, conflict: true }`; (d) checkpoint po sukcesie woła markSynced z revision z wyniku. Napisz pełne fake'i w teście.
- [ ] Krok 2: implementacja silnika przez PRZENIESIENIE logiki z WorkoutDay (bez zmian semantyki poza blokadą i źródłem treści).
- [ ] Krok 3: testy PASS.
- [ ] Krok 4: przepnij trzech konsumentów. WorkoutDay: `syncDraftToFirebase` staje się cienkim adapterem (stan UI + wywołanie silnika). SyncCenterCard: `syncOne`/`handleKeepLocal` przez silnik (keepLocal = wcześniej nadpisz baseline draftu świeżym `cloud.revision` przez markDraftSynced, potem zwykły sync); wszystkie komunikaty błędów w Sync Center przez `workoutSyncErrorMessageKey` (dziś linia ~573 pokazuje surowy kod). AutoSyncOnReconnect: iteruje po kolejce i woła silnik.
- [ ] Krok 5: kolejka referencyjna: `workout-sync-queue.ts` przechowuje `{ userId, sessionId, queuedAt, attempts }` bez treści; wpisy stare (z treścią) migruj przy odczycie (zignoruj treść, zostaw referencję). Zaktualizuj testy kolejki.
- [ ] Krok 6: `npm run test && npm run typecheck && npm run lint && npm run build` PASS; smoke web jak w checkpoincie Fazy 1.
- [ ] Krok 7: commit `refactor(sync): jeden silnik syncu z blokadą per sesja, kolejka referencyjna (Z23)`.

### Zadanie Z24: domknięcie bocznych ścieżek zapisu

**Files:**
- Modify: `src/hooks/useFirebaseWorkouts.ts`
- Modify: `src/pages/WorkoutDay.tsx:893-924` (naprawa cyklu), `:167-174` (timer), `:663-672` (resolveConflictKeepMine)

**Workflow:**
- [ ] Krok 1: usuń martwe writery omijające revision: `updateExerciseProgress`, `completeWorkout`, `updateWorkoutNotes`, `updateSkippedExercises` (`useFirebaseWorkouts.ts:150-242`). Najpierw potwierdź brak użyć: `rg -n "updateExerciseProgress|completeWorkout|updateWorkoutNotes|updateSkippedExercises" src` (poza definicją i destrukturyzacją hooka). Usuń też z destrukturyzacji.
- [ ] Krok 2: `backfillHistoricalWorkouts` (`useFirebaseWorkouts.ts:~554`): updateDoc podbija też `revision: increment(1)` i `updatedAt` (import `increment` z firebase/firestore), żeby zmiana była widoczna dla preconditionów.
- [ ] Krok 3: naprawa cyklu w tle (`WorkoutDay.tsx:893-924`): dodaj `.catch(err => console.error('cycle repair failed', err))` i po sukcesie odśwież baseline draftu (markDraftSynced z nową revision) także gdy kolejka ma wpis tej sesji.
- [ ] Krok 4: timer sesji (`WorkoutDay.tsx:167-174`): używaj `activeDraft.startedAt` tylko gdy `activeDraft.sessionId === sessionId`.
- [ ] Krok 5: `resolveConflictKeepMine` (`WorkoutDay.tsx:663-672`): try/catch; w catch `setSaveError(t(workoutSyncErrorMessageKey(err)))` i NIE zamykaj dialogu.
- [ ] Krok 6: `npm run test && npm run typecheck && npm run lint` PASS; commit `fix(sync): domknięcie bocznych ścieżek zapisu (martwe writery, backfill revision, cycle repair, timer, keepMine) (Z24)`.

### CHECKPOINT FAZY 4

- [ ] Pełna weryfikacja + wpis DECYZJE.md.
- [ ] Release R48/R49 (za zgodą usera) + skrócony test terenowy (scenariusze 1-2 z Z20).

---

## FAZA 5: Telemetria błędów + testy E2E konfliktów

Cel fazy: koniec debugowania screenshotami; regresje sync łapane automatycznie.

### Zadanie Z25: telemetria błędów produkcyjnych

**Decyzja do potwierdzenia z userem:** wariant A (rekomendowany, bez zewnętrznego serwisu): własna kolekcja `client_errors` w Firestore. Wariant B: Sentry (@sentry/react + @sentry/capacitor); dane wychodzą do zewnętrznego serwisu, wymaga zgody i konta.

**Files (wariant A):**
- Create: `src/lib/error-telemetry.ts`
- Modify: `firestore.rules` (kolekcja client_errors), `src/pages/WorkoutDay.tsx` + `src/lib/workout-sync-engine.ts` (raportowanie w miejscach setSaveError/konfliktów)
- Test: `src/test/error-telemetry.test.ts` + test rules

**Workflow:**
- [ ] Krok 1: moduł `error-telemetry.ts`: `reportClientError(uid: string, entry: { code: WorkoutSyncErrorCode | string; phase: 'checkpoint' | 'final' | 'edit' | 'conflict-resolve' | 'other'; detail?: string; sessionHash?: string })`, zapis `addDoc` do `client_errors` z polami `{ userId, code, phase, detail: detail?.slice(0, 500), sessionHash, appVersion, platform, createdAt }`. Best-effort: całość w try/catch, nigdy nie rzuca. Throttling: max 20 wpisów na sesję appki (licznik w pamięci). `sessionHash` = pierwsze 8 znaków SHA-256 sessionId (nie surowe id).
- [ ] Krok 2: rules:

```
    match /client_errors/{errorId} {
      allow create: if request.auth != null
        && request.resource.data.userId == request.auth.uid
        && request.resource.data.keys().hasOnly(['userId', 'code', 'phase', 'detail', 'sessionHash', 'appVersion', 'platform', 'createdAt'])
        && request.resource.data.detail is string
        && request.resource.data.detail.size() <= 500;
      allow read: if isAdmin();
      allow update, delete: if false;
    }
```

Dopasuj do stylu istniejących reguł (helpery isAdmin/hasSelfAccess). Test rules: create własny OK, create z cudzym userId DENIED, read jako zwykły user DENIED. Uruchom `npm run test:rules` (wymaga JDK21 wg gotchas projektu).
- [ ] Krok 3: podepnij raportowanie: każde `setSaveError` w WorkoutDay, gałąź konfliktu, catch silnika syncu. Kod błędu z `classifyWorkoutSyncError`, detail = surowy message.
- [ ] Krok 4: prosty podgląd admina: w AdminDashboard sekcja "Błędy klienta" (lista ostatnich 50, kolumny: czas, user, code, phase, detail). Minimalny odczyt, bez wykresów.
- [ ] Krok 5: pełna weryfikacja + commit `feat(telemetry): rejestr błędów klienta w client_errors + podgląd admina (Z25)`.

### Zadanie Z26: E2E emulator dla konfliktów treningu

**Files:**
- Create: `e2e/emulator/workout-conflict.spec.ts`
- Wzorzec: `e2e/emulator/plan-conflict.spec.ts` (przeczytaj w całości i skopiuj setup)

**Workflow:**
- [ ] Krok 1: scenariusze (każdy jako osobny test, na emulatorze Firestore):
  1. Dwóch klientów, ten sam trening: klient A zapisuje (revision 1->2), klient B z expectedRevision 1 dostaje WORKOUT_CONFLICT.
  2. Lost-ack retry: zapis z writeId W przy expectedRevision 1 przechodzi (revision 2, lastWriteId W); PONOWNY identyczny zapis (ten sam writeId W, expectedRevision 1) zwraca sukces alreadyApplied bez podbicia revision (dalej 2).
  3. Edycja po final: final sync (revision 1), potem zapis edycji z expectedRevision odczytanym z serwera przechodzi (revision 2).
  4. Promocja provisional->remote: draft offline, przejście online, silnik tworzy sesję remote i czyści draft; drugi bieg silnika (retry) nie duplikuje dokumentu.
- [ ] Krok 2: uruchomienie wg konwencji projektu (sprawdź `playwright.emulator.config.ts` i skrypty w package.json). Oczekiwane: 4 testy PASS.
- [ ] Krok 3: commit `test(e2e): konflikty i idempotencja zapisu treningu na emulatorze (Z26)`.

### CHECKPOINT FAZY 5

- [ ] Pełna weryfikacja + DECYZJE.md + (za zgodą) release.

---

## FAZA 6: Security hardening

Cel fazy: znaleziska z audytu sekcja 4. Niezależne od syncu; można wykonać równolegle z Fazą 5, ale nie przed Fazą 2.

### Zadanie Z27: zależności

**Workflow:**
- [ ] Krok 1: root: `npm audit fix` (cel: react-router-dom >= 6.30.3). Potem `npm run test && npm run build`. Jeśli audit fix chce major bump: STOP, zapytaj usera.
- [ ] Krok 2: functions: `cd functions && npm audit fix` (cel: protobufjs, form-data, fast-xml-builder, @grpc/grpc-js bez HIGH/CRITICAL). Jeśli nie podbija przez transitive: dodaj `overrides` w `functions/package.json` wzorem istniejących (brace-expansion, fast-xml-parser, node-forge). Potem testy functions (sprawdź skrypty w functions/package.json).
- [ ] Krok 3: `npm audit --omit=dev` w obu katalogach oczekiwane: zero HIGH/CRITICAL. `firebase deploy --only functions` za zgodą usera.
- [ ] Krok 4: commit `chore(security): podbicie podatnych zależności (protobufjs, react-router, form-data, grpc) (Z27)`.

### Zadanie Z28: utwardzenia punktowe

**Workflow:**
- [ ] Krok 1: CORS: `functions/src/index.ts:761` usuń originy localhost z listy dla produkcji (warunkuj przez `process.env.FUNCTIONS_EMULATOR` lub stałą DEV).
- [ ] Krok 2: `functions/src/revenuecat.ts:113`: porównanie sekretu przez timing-safe (wzorzec `safeHashEquals` z `functions/src/admin-api.ts`; porównuj hashe SHA-256 obu wartości, co załatwia różne długości).
- [ ] Krok 3: `firestore.rules:215-218`: zawęź `match /config/{docId}` do `match /config/feature_flags`.
- [ ] Krok 4: walidacja schematu w rules dla `chat_messages` i `workouts`: `request.resource.data.keys().hasOnly([...])` z listą pól ustaloną przez odczyt realnych zapisów w kodzie (UWZGLĘDNIJ `lastWriteId` z Z21 i wszystkie pola z `batchSaveWorkout` updateData; przeczytaj też createWorkoutSession). Limity: `notes` <= 5000, exercises notes <= 2000 (zgodnie z clampami w kodzie).
- [ ] Krok 5: `npm run test:rules` z NOWYMI przypadkami: zapis workout z nadmiarowym polem DENIED, zapis z lastWriteId ALLOWED, dokument usera BEZ pola status może zapisać workout (lekcja z ef8b8d5: przypadek "pole nie istnieje" obowiązkowy).
- [ ] Krok 6: deploy rules + functions za zgodą usera; commit `chore(security): utwardzenia (CORS, timing-safe webhook, config scope, schema rules) (Z28)`.

### CHECKPOINT FAZY 6 (końcowy)

- [ ] Pełna weryfikacja + DECYZJE.md (podsumowanie całego planu: co wdrożone, co odłożone).
- [ ] Raport końcowy dla usera: mapping symptom -> fix -> weryfikacja.

---

## Poza zakresem tego planu (świadomie)

- Z10 IntervalTimer bg-safe (timery za flagą OFF), Z11 ai-coach resolver (martwy kod), Wilks, App Check, pełny multi-device draft flow (M2.8), maszyna stanów sesji jako reducer (audyt rekomendacja 4: duży refaktor; wraca na stół po 2 tygodniach stabilności produkcji).
- Prompt injection w generateWeeklySummary (self-scoped, niski priorytet).

## Kolejność awaryjna (gdy user zgłosi nowy błąd w trakcie)

1. Zbierz scenariusz + screenshot + wpis client_errors (po Z25).
2. Sprawdź, czy pasuje do symptomów S1-S5 z audytu; jeśli tak, sprawdź czy faza z fixem już wdrożona NA PRODUKCJĘ (najczęstsza pułapka tego projektu: fix lokalnie, produkcja stara).
3. Nowy bug: osobne zadanie Z<next> wg tego samego wzorca (root cause -> failing test -> fix -> weryfikacja), nie doklejaj do istniejących zadań.
