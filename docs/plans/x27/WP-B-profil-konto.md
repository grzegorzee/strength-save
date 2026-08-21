# WP-B: Profil — adres kontaktowy + twarde usuwanie konta (weryfikacja i domknięcie luk purge)

> **For agentic workers:** wykonuj task-by-task, TDD. Przeczytaj najpierw `00-OVERVIEW.md`.

**Goal:** (1) adres kontaktowy w apce = `contact@strengthsave.app` (user napisał "strenghtsave" — to literówka, domena produktu to strengthsave.app); (2) usuwanie konta spełnia wymogi: potwierdzenie wpisaniem słowa, jawny komunikat o nieodwracalności, backend soft delete z hard delete po 30 dniach, purge obejmuje WSZYSTKIE dane usera.

**Architecture:** flow usuwania konta JUŻ ISTNIEJE (Z238): dialog z wpisaniem słowa (`Profile.tsx:783`, słowo w `:165`), `deleteOwnAccount` → `scheduleSelfDeletion` (auth user kasowany od razu, dane po 30 dniach przez `resumeDeletionOperations` co 60 min). Ten pakiet: zmiana adresu, audyt copy dialogu, DOMKNIĘCIE LUK w purge (6 kolekcji + subkolekcja aggregates), aktualizacja testu pokrycia.

**Tech stack:** React + TS (frontend), Firebase Functions v2 + firebase-admin (backend), vitest.

**Spec / kontekst (ustalone rozpoznaniem):**
- Adres `kontakt@gjasionowicz.pl` występuje w 4 miejscach: `src/pages/Profile.tsx:719` (mailto), `src/i18n/locales/pl.ts:105` i `en.ts:103` (wewnątrz `profile.deleteAccount.desc`), `functions/src/registration.ts:1514` (odbiorca maila operatora).
- Purge: `purgeUserData` `functions/src/registration.ts:1257`, listy GDPR w `functions/src/security.ts`: `GDPR_USER_ID_COLLECTIONS:45`, `GDPR_UID_FIELD_COLLECTIONS:59`, `GDPR_DIRECT_DOC_COLLECTIONS:66`. `consents` celowo WYKLUCZONE (`security.ts:41-44`) — NIE dodawaj.
- **Luki (kolekcje per-user istniejące w `firestore.rules`, nieobjęte purge):** `plan_cycle_operations` (rules:357, pole `userId`), `user_events` (:537, `userId`), `client_errors` (:561, `userId`), `exercise_notes` (:641, `userId`), `workout_day_notes` (:670, `userId`), `manual_activities` (:713, `userId`). Dodatkowo subkolekcja `users/{uid}/aggregates/*` (rules:95) NIE jest kasowana, bo `registration.ts:1305` robi płaskie `.doc(uid).delete()` bez rekursji.
- Test pokrycia purge: `src/test/functions-security.test.ts:73` — asercja na starym podzbiorze.
- Eksport GDPR: `exportUserDataApi` `functions/src/index.ts:667` — sprawdź, czy korzysta z tych samych list z `security.ts`; jeśli tak, rozszerzenie list naprawia też eksport.

**Files:**
- Modify: `src/pages/Profile.tsx` (:719 + audyt dialogu :783), `src/i18n/locales/pl.ts` (:105), `src/i18n/locales/en.ts` (:103), `functions/src/security.ts`, `functions/src/registration.ts` (:1305 rekursja, :1514 adres)
- Test: `src/test/functions-security.test.ts`, ewentualny test dialogu w `src/test/` (nowy plik `profile-delete-account.test.tsx` TYLKO jeśli brak istniejącego pokrycia dialogu)

**Interfaces:**
- Consumes: nic z innych pakietów.
- Produces: nic — zmiany zamknięte w tym obszarze.

## Edge cases

1. Purge musi być idempotentny: ponowne uruchomienie po częściowym failu nie może się wywalać (dokumenty już skasowane). Istniejący wzorzec batched query z `resumeDeletionOperations` zachować.
2. `users/{uid}/aggregates` — kasowanie subkolekcji PRZED skasowaniem doc usera (lub `recursiveDelete` na ref doc usera; firebase-admin `db.recursiveDelete(db.doc('users/'+uid))` kasuje doc + wszystkie subkolekcje — preferowane).
3. `plan_cycle_operations` może mieć duże dokumenty — kasuj w batchach jak pozostałe kolekcje `userId`.
4. Mail operatora (`registration.ts:1514`): odbiorcą ma zostać skrzynka operatora — zmień na `contact@strengthsave.app` spójnie z resztą.
5. Copy dialogu: musi zawierać (a) jednoznaczne "tej operacji NIE MOŻNA cofnąć", (b) informację o 30-dniowym okresie i trybie anulowania przez kontakt, (c) wymóg wpisania słowa. Słowo potwierdzenia: zostaje istniejący mechanizm PL `USUŃ` / EN `DELETE` (spełnia wymóg usera "twarde potwierdzenie słowem DELETE" — w EN jest dokładnie DELETE; w PL naturalny odpowiednik; NIE zmieniaj na wspólne DELETE, bo PL user ma polskie UI).

## Tasks

### Task B1: adres kontaktowy

- [ ] Zmień `mailto:` w `Profile.tsx:719` na `contact@strengthsave.app`.
- [ ] Zmień adres wewnątrz `profile.deleteAccount.desc` w pl.ts:105 i en.ts:103.
- [ ] Zmień odbiorcę w `functions/src/registration.ts:1514`.
- [ ] `grep -rn "kontakt@gjasionowicz" src functions landing` → zero trafień w kodzie produkcyjnym (docs/design-artefakty mogą zostać).
- [ ] Run: `npx vitest run src/test/i18n-hardcoded-scan.test.ts` → PASS.

### Task B2: audyt dialogu usunięcia konta (copy + word gate)

- [ ] Przeczytaj `Profile.tsx:745-816` (dialogi) i sprawdź: przycisk potwierdzenia disabled dopóki wpisane słowo != wymagane; copy zawiera nieodwracalność. Jeśli copy nie mówi wprost o nieodwracalności — dopisz do `profile.deleteAccount.desc` (pl+en) zdanie: PL "Tej operacji nie można cofnąć." / EN "This cannot be undone.".
- [ ] Jeśli nie istnieje test dialogu: nowy `src/test/profile-delete-account.test.tsx` — (1) przycisk disabled przy pustym polu i przy złym słowie, (2) enabled po wpisaniu poprawnego słowa, (3) treść dialogu zawiera tekst o nieodwracalności. Mockuj `deleteOwnAccount` z `src/lib/registration-api.ts` (w E2E mode ma short-circuity — patrz `registration-api.ts:11`; w vitest mockuj moduł).
- [ ] Run → PASS.

### Task B3: domknięcie luk purge (TDD na liście pokrycia)

- [ ] Test: rozszerz `src/test/functions-security.test.ts:73` — asercja, że `GDPR_USER_ID_COLLECTIONS` zawiera także `plan_cycle_operations`, `user_events`, `client_errors`, `exercise_notes`, `workout_day_notes`, `manual_activities`. Run → FAIL.
- [ ] Implementacja: dodaj 6 kolekcji do `GDPR_USER_ID_COLLECTIONS` w `functions/src/security.ts:45` (wszystkie mają pole `userId` — zweryfikuj w `firestore.rules` przy podanych liniach; jeśli któraś ma inne pole klucza, przenieś do właściwej listy).
- [ ] Run → PASS.
- [ ] Implementacja rekursji: w `functions/src/registration.ts` zamień płaskie kasowanie doc usera (`:1305`) na `db.recursiveDelete(db.collection('users').doc(uid))` (firebase-admin >= 10 ma `recursiveDelete` na `Firestore`), z zachowaniem istniejącego try/catch. Sprawdź import/wersję firebase-admin w `functions/package.json`.
- [ ] Build functions: `cd functions && npm run build` (lub odpowiedni skrypt z functions/package.json) → zielone.
- [ ] Sprawdź `exportUserDataApi` (`functions/src/index.ts:667`): jeśli iteruje po listach z security.ts — nic nie rób (eksport automatycznie objął nowe kolekcje); jeśli ma własną listę — dopisz te same kolekcje.

### Task B4: finał pakietu

- [ ] `npx vitest run` + `npm run typecheck` + `npm run lint` + build functions → zielone.
- [ ] Raport wg protokołu; odnotuj w raporcie: (a) RevenueCat subscriber NIE jest kasowany przy purge (świadoma decyzja — dane rozliczeniowe), (b) skrzynka contact@strengthsave.app musi zostać skonfigurowana przez usera (alias/mailbox), inaczej mailto trafi w próżnię.

## Pułapki

- NIE dotykaj `consents` (RODO art. 7(1) — dowód zgody musi przeżyć konto).
- `recursiveDelete` ma limity przepustowości — dla pojedynczego usera OK, nie zrównoleglaj.
- Functions deploy robi orkiestrator w release train — nie deployuj.
