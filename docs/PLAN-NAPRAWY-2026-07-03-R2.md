# PLAN NAPRAWY R2: audyt ponowny po Z13-Z28 + serverless cost (2026-07-03)

> **Dla agenta wykonawcy:** WYMAGANY SUB-SKILL: `superpowers:executing-plans` (albo `superpowers:subagent-driven-development`). Kroki mają checkboxy `- [ ]`. Wykonuj zadania PO KOLEI, fazy rozdzielone checkpointami. Nie przeskakuj checkpointów.
> Źródło: audyt R2 wykonany przez 5 równoległych agentów (silnik syncu, koszty Functions, security rules, QA/build, sweep frontendu); wszystkie znaleziska P0/P1 zweryfikowane ręcznie w kodzie przez koordynatora.
> Poprzednia runda: `docs/AUDYT-2026-07-03.md` + `docs/PLAN-NAPRAWY-2026-07-03.md` (Z13-Z28, WYKONANE i WDROŻONE: web ec42f2c, functions, rules, iOS build 48).

**Goal:** Domknąć integralność zapisu treningów (4 nowe P0/P1 w warstwie syncu mimo Z13-Z28), naprawić martwą waitlistę i pipeline release, oraz przebudować koszty Cloud Functions tak, żeby aplikacja była maksymalnie serverless: przy 1000 aktywnych userów koszt zmienny spada z ~22-25 USD/mies. do ~2-3 USD/mies. bez utraty funkcjonalności.

**Architektura podejścia:** Najpierw P0/P1 integralności zapisu (chirurgiczne, TDD), potem P1 funkcjonalne (waitlista, release script, wydajność WorkoutDay), potem redukcja kosztów Functions, potem domknięcie rules i pakiety P2, na końcu jeden release train. Każda faza zostawia działający, przetestowany soft.

**Tech stack:** React + TypeScript + Vite, Firebase (Firestore transakcje, persistentLocalCache, Functions v2, Rules), IndexedDB + localStorage fallback, vitest + Playwright (mock i emulator), Capacitor iOS, Resend, RevenueCat.

---

## 0. EXECUTIVE SUMMARY AUDYTU R2

Stan bramek na start: vitest 458/458, typecheck 0, lint 0, build OK, bundle-budget OK, npm audit prod 0 (root) / 8 moderate (functions, łańcuch uuid), working tree czyste.

1. **Warstwa zapisu nadal ma 4 dziury P0/P1 mimo Z13-Z28.** Mechanizmy z Z21/Z22 działają w silniku, ale główna ścieżka WorkoutDay je obchodzi: flush przed checkpointem kasuje `pendingWriteId` (lost-ack znowu = fałszywy konflikt), finalny `clearDraft` bez guardu wersji potrafi po cichu skasować serię odhaczoną w trakcie zapisu końcowego, edycja w oknie promocji provisional->remote tworzy osierocony draft zdolny nadpisać nowszy trening w chmurze, a `updateDraft` robi nieatomowe read-modify-write.
2. **Waitlista jest martwa w produkcji.** `createWaitlistEntry` ma `enforceAppCheck: true`, a klient NIGDZIE nie inicjalizuje App Check. Każdy zapis z ekranu logowania pada (utrata leadów). Emulator pomija App Check, więc E2E tego nie widzi.
3. **Koszty: 3 driverów dominuje rachunek.** weeklyDigest mailuje WSZYSTKICH userów Auth bez opt-out/status (przy 1000 userów ~20 USD/mies. Resend, dominuje wszystko), stravaScheduledSync czyta co noc CAŁĄ historię aktywności każdego podłączonego usera (miliony reads przy skali), resumeDeletionOperations odpala się co 5 minut (8640 inv/mies.) dla zdarzenia, które prawie nie występuje. Do tego martwy stack AI (3 funkcje bez żadnego callera po usunięciu AI Chat w v6.7.0).
4. **Dobra wiadomość architektoniczna:** zero Firestore triggers, zapisy treningów idą z klienta prosto do Firestore przez rules, 38 funkcji v2 bez minInstances. Fundament pod serverless już jest; ten plan go domyka.
5. **Rules:** Z28 domknął workouts i chat_messages, ale training_plans ma `allow write` bez ŻADNEJ walidacji, client_errors da się floodować (throttle tylko po stronie klienta, createdAt z klienta może zasłonić realne błędy w panelu admina), weekly_summaries ma martwe uprawnienia zapisu.
6. **Frontend:** WorkoutDay re-renderuje cały 2191-liniowy komponent co sekundę przez cały trening (timer sesji + pełne skany historii w renderze), useOnlineStatus odpytuje IndexedDB co 2 s bez przerwy, seria z Apple Watch może zniknąć bez śladu przy błędzie zapisu draftu.

---

## 1. REJESTR ZNALEZISK (traceability: znalezisko -> zadanie)

| ID | Sev | Obszar | Skrót | Zadanie |
|----|-----|--------|-------|---------|
| R2-01 | P1 | sync | buildDraftSnapshot gubi pendingWriteId/pendingWriteVersion i zawsze podbija version; lost-ack checkpointu = fałszywy konflikt (obejście Z21) | Z29 |
| R2-02 | P1 | sync | updateDraft: nieatomowe RMW poza writeChains; znaczniki mogą cofnąć treść draftu w IDB | Z30 |
| R2-03 | P0 | sync | finalny clearDraft bez guardu wersji; seria odhaczona w trakcie finalnego RTT ginie na zawsze | Z31 |
| R2-04 | P0/P1 | sync | edycja w oknie promocji provisional->remote wskrzesza stary klucz; orphan może nadpisać nowszy trening w chmurze | Z32 |
| R2-05 | P1 | funkcjonalny | waitlista martwa: enforceAppCheck bez App Check w kliencie (registration.ts:590) | Z33 |
| R2-06 | P1 | infra | release-ios.sh nie ładuje .env; preflight pada bez ręcznego `set -a && source .env` | Z34 |
| R2-07 | P1 | wydajność | WorkoutDay: re-render bomb co 1 s (timer sesji + skany historii inline w renderze, memo ExerciseCard bezużyteczne przez świeże lambdy) | Z35 |
| R2-08 | koszt | functions | stravaScheduledSync czyta całą kolekcję strava_activities usera przy każdym syncu (index.ts:1444-1455) | Z36 |
| R2-09 | koszt | functions | resumeDeletionOperations co 5 min = 8640 inv/mies. dla zdarzenia, które prawie nie występuje | Z37 |
| R2-10 | koszt | functions | weeklyDigest: listUsers WSZYSTKICH + mail bez opt-out/status/access (weekly-digest.ts:214-222); dominuje koszt przy skali | Z38 |
| R2-11 | koszt | functions | martwy stack AI: streamOpenAI, proxyOpenAI, generateWeeklySummary + ai-usage.ts + kliencki ai-coach.ts/useAISwap/TypingIndicator + indeks chat_messages | Z39 |
| R2-12 | koszt | functions | dailyTrainingReminder skanuje CAŁĄ kolekcję users zamiast iterować po posiadaczach tokenów; syncUserProfile pisze audit log przy każdym otwarciu apki; brak TTL na kolekcjach operacyjnych | Z40 |
| R2-13 | P2 | rules | client_errors: flood bez limitu, 7 z 8 pól bez walidacji, createdAt z klienta zasłania panel admina | Z41 |
| R2-14 | P2 | rules | training_plans `allow write` bez walidacji; measurements/plan_cycles/plan_cycle_operations/app_telemetry_daily/users bez zamkniętych typów | Z41 |
| R2-15 | P2/P3 | rules | weekly_summaries martwe create/update; chat_messages martwe delete | Z41 |
| R2-16 | P2 | sync | markRetry po promocji pod STARYM sessionId: konfliktowy final ponawiany w nieskończoność | Z42 |
| R2-17 | P2 | sync | kolejka bez capu retry; WORKOUT_NOT_FOUND/permission ponawiane wiecznie | Z42 |
| R2-18 | P2 | sync | offline checkpoint remote draftu klasyfikowany jako twardy błąd (czerwony badge + telemetria za brak zasięgu) | Z42 |
| R2-19 | P2 | sync | telemetria: SyncCenterCard raportuje błędne `phase` | Z42 |
| R2-20 | P2 | sync | baseline promocji ze stale cache (createWorkoutSession zwraca kopię z pamięci onSnapshot) | Z43 |
| R2-21 | P2 | sync | buildDraftSnapshot nie zna queuedDraft jako bazy: rollback version, złe startedAt/duration | Z43 |
| R2-22 | P2 | sync | hydracja czyści draft po ukończonym treningu porównując tylko sety (gubi notatkę/skip) | Z43 |
| R2-23 | P2 | sync | openDatabase: nowe połączenie IDB na każdą operację, nigdy close, brak onversionchange | Z43 |
| R2-24 | P2 | frontend | rest-notification: negatywna decyzja o uprawnieniach cache'owana do końca życia appki | Z44 |
| R2-25 | P2 | frontend | RestTimer: wyścig schedule vs cancel (notyfikacja odpala mimo pauzy) | Z44 |
| R2-26 | P2 | frontend | Watch: appliedRef przed await; seria z zegarka może zniknąć do restartu + unhandled rejection | Z44 |
| R2-27 | P2 | frontend | Cycles auto-repair: guard localStorage wypalany PRZED operacją; offline = auto-naprawa nigdy się nie ponowi | Z44 |
| R2-28 | P2 | frontend | useOnlineStatus: odczyt IndexedDB co 2 s non-stop (x2 na /settings), konkuruje z zapisami draftu | Z44 |
| R2-29 | P2 | frontend | duplikat trasy /measurements w App.tsx; Settings FeatureFlagsPanel czyta users bez limitu; avatary bez sprzątania starych plików | Z44 |
| R2-30 | P2 | repo/deps | test-results/.last-run.json trackowany; brak engines w root; ~14 nieużywanych deps (zod, react-hook-form, resolvers, 11 sierot shadcn); uuid override functions; VITE_ALLOWED_* martwe w CI; martwe klucze i18n; hardcoded ścieżka .p8 | Z45 |
| R2-32 | P2 | sync | martwy kod po Z23: `sync-center-payload.ts` (pułapka `expectedRevision ?? 0`, brak writeId, używany tylko we własnym teście), nieużywany `isSyncingRef` i import `matchesFinalWorkoutContent` w WorkoutDay, martwe gałęzie `skipped` z mylącym toastem sukcesu | Z42 |
| R2-31 | P2 | jakość | 8 moderate w functions prod deps (łańcuch uuid via firebase-admin); chunk firebase 715K = 87% budżetu | Z45 (override) / obserwacja |

Sprawdzone i CZYSTE (nie ruszać): jednostki kg kanoniczne (zero ścieżek zapisu lbs, Watch też), listenery onSnapshot (wszystkie mają unsubscribe, limity zgodne z LISTENER_LIMITS), i18n pl/en (1442 = 1442 kluczy), sekrety (nic w repo/bundlu/historii gita), endpointy HTTP po Z28 (CORS, timing-safe, pepper), blokada in-flight silnika, fallback localStorage po Z15/Z16, izolacja per user w rules.

---

## 2. MODEL KOSZTÓW I DOCELOWA ARCHITEKTURA SERVERLESS

### Zasada architektoniczna (obowiązuje każdą przyszłą decyzję)

1. **Domyślna ścieżka danych: klient -> Firestore + rules.** Zero Firestore triggers. Walidację robi schemat w rules, nie funkcja.
2. **Function tylko gdy niezbędna serwerowo:** sekret API (Strava, Resend, RevenueCat), admin SDK (Auth, push FCM, purge GDPR), webhook z podpisem. Nic poza tym.
3. **Scheduled: rzadkie i O(aktywnych), nie O(wszystkich).** Każdy cron musi mieć koszt proporcjonalny do userów faktycznie objętych efektem (subskrybenci, posiadacze tokenów, podłączeni do Stravy), nie do rozmiaru bazy.
4. **Kolekcje operacyjne (logi, kody, rate limity, telemetria) mają TTL.** Storage nie rośnie bez sufitu.
5. **Nie przenosić do klienta:** Strava OAuth/sync (client_secret), revenuecatWebhook, rejestracja/invites/verification (kill switch, anti-abuse, Resend), delete konta (Auth+Storage purge), push (FCM admin), wszystkie maile.

### Model przed/po (ceny standardowe GCP/Firestore/Resend, orientacyjnie)

| Skala | Bez zmian | Po planie (Z36-Z40) | Co dominuje przed | Co dominuje po |
|-------|-----------|---------------------|--------------------|----------------|
| 100 aktywnych | < 1 USD zmienne + ~0.5-1.5 USD stałe (sekrety, Artifact Registry) | jw., mniejszy zapas na limity Resend | digest na granicy dziennego free tier Resend | koszty stałe |
| 1000 aktywnych | ~22-25 USD/mies. | ~2-3 USD/mies. | Resend przez weeklyDigest (~20 USD), Strava reads (1-2 USD, rośnie z historią) | koszty stałe + maile do realnych subskrybentów |

---

## 3. OGRANICZENIA GLOBALNE (obowiązują KAŻDE zadanie)

1. Środowisko docelowe: siłownia. iOS wstrzymuje JS w WKWebView po zgaszeniu ekranu; wszystko co ma przeżyć tło musi być w IndexedDB/localStorage, nie w pamięci Reacta.
2. Dane usera święte: zero testowych zapisów na realnym koncie; naprawy danych tylko skryptem z backupem SHA256.
3. TDD z bezpiecznikiem: każde zadanie zaczyna się od failing testu odtwarzającego znalezisko. **Jeśli test NIE potwierdza znaleziska, STOP dla tego zadania: opisz rozbieżność w DECYZJE.md i przejdź do następnego.** Nie forsuj fixu na niepotwierdzonym scenariuszu.
4. i18n: każdy nowy klucz do OBU plików `src/i18n/locales/pl.ts` i `en.ts`, inaczej typecheck padnie.
5. Polskie teksty UI bez pauz (em-dash); pełne polskie znaki.
6. Kontrakt draftu: `markDraftSynced`/`applySyncMarkers` zapisują znaczniki chmury ZAWSZE; `dirty`/`version`/treść nietykalne przy niezgodnej wersji. Kolejka jest REFERENCYJNA (sessionId + metadane, zero treści). writeId reuse tylko przy zgodnym `pendingWriteVersion`.
7. Nie wracać do podejść z sekcji 6 `docs/AUDYT-2026-07-03.md` (konflikt po updatedAt, auto-retry konfliktu bez zmiany precondition, timery JS w tle, sessionId jako stabilny klucz UI).
8. Po każdym zadaniu: commit `fix(obszar): opis (Z<nr>)` lub `chore(...)`/`perf(...)` adekwatnie. Po każdej fazie: checkpoint.
9. Weryfikacja przy checkpointach (minimum): `npm run test`, `npm run typecheck`, `npm run lint`, `npm run build`. Fazy dotykające rules: + `npm run test:rules`. Fazy dotykające functions: + `npm --prefix functions test` i `npm --prefix functions run build`. Fazy dotykające syncu: + `npm run e2e:mock`, a FAZA 1 dodatkowo `npm run e2e:emulator` (JDK21: `/opt/homebrew/opt/openjdk@21`).
10. Deploy TYLKO w FAZIE 6 (release train). Wcześniej niczego nie wdrażaj do Firebase/Apple/RevenueCat i nie zmieniaj sekretów.
11. Wpisy do `DECYZJE.md` po każdej fazie (co, dlaczego, root cause, weryfikacja).

---

## FAZA 0: Baseline

### Zadanie Z29.0: zielony baseline

**Goal:** Potwierdzić zielony main przed zmianami, żeby regresje były przypisywalne.

**Workflow:**
- [x] Krok 1: `git status` (czyste drzewo, branch main), `git log --oneline -3` (HEAD = db8d15e lub nowszy).
- [x] Krok 2: `npm run test` oczekiwane 458/458. Jeśli nie: STOP, zgłoś userowi.
- [x] Krok 3: `npm run typecheck && npm run lint && npm run build` bez błędów.

---

## FAZA 1: Integralność zapisu, P0/P1 (Z29-Z32)

### Zadanie Z29: writeId przeżywa flush draftu (R2-01)

**Goal:** Lost-ack checkpointu kończy się no-op "already-applied", a nie fałszywym konfliktem; flush bez zmiany treści nie podbija wersji.

**Znalezisko:** `src/pages/WorkoutDay.tsx:379-421` `buildDraftSnapshot` buduje obiekt draftu od zera: nie przenosi `pendingWriteId`/`pendingWriteVersion` z `previousDraft` (put całego rekordu wymazuje je z IDB) i ZAWSZE podbija `version` (`(previousDraft?.version ?? 0) + 1`), nawet gdy treść identyczna. `syncDraftToFirebase` robi flush przed każdym checkpointem, więc retry po lost-ack idzie z NOWYM writeId i podbitą wersją: `resolveWriteAttempt` widzi rev N+1 != N i lastWriteId != mój -> WORKOUT_CONFLICT (symptom S3, który Z21 miał eliminować). Ścieżki SyncCenter/AutoSync (bez flusha) są chronione; główna ścieżka WorkoutDay nie.

**Fix:** Wyekstrahuj `buildDraftSnapshot` do czystej funkcji w `src/lib/workout-draft-snapshot.ts` (wejście: obecne wartości refów + previousDraft + overrides; wzorzec ekstrakcji jak Z17/Z26). W funkcji: (a) przenoś `pendingWriteId` i `pendingWriteVersion` z previousDraft (overrides mogą nadpisać), (b) podbijaj `version` TYLKO gdy treść (exerciseSets, exerciseNotes, exerciseMetrics, dayNotes, skippedExercises) różni się od previousDraft; przy identycznej treści zachowaj `version` previousDraft. Komponent woła funkcję.

**Workflow:**
- [x] Krok 1: failing testy w `src/lib/workout-draft-snapshot.test.ts`: (1) snapshot z previousDraft z `pendingWriteId='W', pendingWriteVersion=6` zachowuje oba pola; (2) identyczna treść -> version bez zmian; (3) zmieniona treść -> version+1 i pendingWriteId NADAL przeniesiony (kasuje go dopiero silnik po sukcesie); (4) previousDraft o innym sessionId -> zachowanie jak dotychczas (od zera).
- [x] Krok 2: implementacja ekstrakcji + podpięcie w WorkoutDay (buildDraftSnapshot zostaje cienkim wrapperem przekazującym refy).
- [x] Krok 3: test integracyjny scenariusza lost-ack na poziomie silnika (rozszerz istniejące testy workout-sync-engine): checkpoint -> commit bez acku -> flush -> retry checkpointu używa TEGO SAMEGO writeId -> wynik alreadyApplied.
- [x] Krok 4: `npm run test`, typecheck, lint.
- [x] Krok 5: commit `fix(sync): writeId przeżywa flush draftu, version bez podbicia przy identycznej treści (Z29)`.

### Zadanie Z30: updateDraft atomowe (R2-02)

**Goal:** Modyfikacje znaczników nigdy nie cofają równoległie zapisanej treści draftu.

**Znalezisko:** `src/lib/workout-draft-db.ts:374-386` `updateDraft` czyta draft (transakcja readonly), modyfikuje w JS, zapisuje (osobna transakcja readwrite), poza `writeChains` i bez guardu wersji. Konsumenci: markDraftSynced, markPromotedToRemote, setCloudBaseline, setPendingWrite (`:463-539`). Okno: silnik robi markSynced na v5, user w międzyczasie odhacza serię (commit v6), markSynced zapisuje obiekt z treścią v5 -> seria znika z IDB; jeśli iOS ubije webview przed kolejnym flushem, przepada na stałe (dirty=false blokuje checkpoint).

**Fix:** RMW w JEDNEJ transakcji IDB readwrite (get + put w tym samym `IDBTransaction`) oraz przepuszczenie `updateDraft` przez `writeChains` per klucz (serializacja z saveActiveDraft). Mutator dostaje świeży rekord z tej samej transakcji.

**Workflow:**
- [x] Krok 1: failing test w `src/lib/workout-draft-db.test.ts` (fake-indexeddb): wystartuj `updateDraft` (markDraftSynced) i W TRAKCIE jego microtasków wykonaj `saveActiveDraft` v6 z nową serią; po obu operacjach draft w IDB ma serię z v6 (dziś: znika).
- [x] Krok 2: implementacja (jedna transakcja + writeChains). Uważaj: transakcja IDB auto-commituje po opróżnieniu kolejki mikrotasków; mutator musi być synchroniczny wewnątrz transakcji.
- [x] Krok 3: pełne testy draft-db (regresje kontraktu: "does not clear a newer local draft", fallback roundtrip).
- [x] Krok 4: commit `fix(sync): updateDraft w jednej transakcji IDB przez writeChains (Z30)`.

### Zadanie Z31: finalny clearDraft z guardem wersji (R2-03)

**Goal:** Seria odhaczona w trakcie finalnego zapisu nie ginie; draft z nowszą wersją zostaje jako dirty i idzie kolejnym checkpointem.

**Znalezisko:** `src/lib/workout-sync-engine.ts:267-273`: po walidacji finalu `deps.clearDraft(userId, targetSessionId)` bezwarunkowo. User tapnie "Zakończ trening" (draft v k), w trakcie RTT (słaby zasięg = kilka-kilkanaście sekund) odhacza serię (v k+1), silnik waliduje treść v k i kasuje v k+1. Trwała, cicha utrata serii. Ścieżka checkpoint jest chroniona (`markSynced(expectedDraftVersion)`), final nie.

**Fix:** `clearActiveDraft` w `workout-draft-db.ts` dostaje wariant warunkowy `clearActiveDraftIfVersion(userId, sessionId, expectedVersion)` (w writeChains, w jednej transakcji: delete tylko gdy `version <= expectedVersion`, zwraca boolean). Silnik woła wariant warunkowy z `draft.version` sync-runu; przy odmowie ustawia w wyniku `draftRetained: true`, NIE kasuje wpisu kolejki dla checkpointu follow-up, a adapter WorkoutDay traktuje to jak pending (nie sukces całkowity: status 'pending', bez czyszczenia stanu sesji).

**Workflow:**
- [x] Krok 1: failing test silnika (fake deps): final na drafcie v k, w trakcie `deps.save` draft w store podbity do v k+1; oczekiwane: draft NIE skasowany, outcome z draftRetained, wpis kolejki zachowany.
- [x] Krok 2: implementacja clearActiveDraftIfVersion + zmiana silnika + adapter WorkoutDay (obsługa draftRetained).
- [x] Krok 3: test draft-db dla wariantu warunkowego (delete przy równej/starszej wersji, odmowa przy nowszej).
- [x] Krok 4: commit `fix(sync): finalny clearDraft z guardem wersji, draftRetained (Z31)`.

### Zadanie Z32: tombstone promocji provisional->remote (R2-04)

**Goal:** Edycja w oknie promocji nie wskrzesza starego klucza provisional; zapisy lądują pod kluczem remote; orphany nie nadpisują nowszych treningów.

**Znalezisko:** `src/lib/workout-sync-engine.ts:157-177` + `src/pages/WorkoutDay.tsx:524-537`: sessionId w React aktualizuje się dopiero po outcome, więc przez cały RTT zapisu `handleSetsChange` pisze pod stary klucz provisional (previousDraft z activeDraftRef nadal pasuje) i wskrzesza go jako osobny draft. Orphan wisi w Sync Center jako "niezapisany trening"; ręczny "Synchronizuj" na orphanie: createSession zwraca istniejącą sesję, markPromotedToRemote NADPISUJE draft remote treścią orphana, `cloudRevision=undefined` powoduje pobranie świeżego baseline (Z22), precondition przechodzi i STALE treść nadpisuje nowszy, nawet ukończony trening.

**Fix:** (a) Przy `markPromotedToRemote` zapisz tombstone w localStorage (`fittracker_promoted:{uid}:{provisionalId}` -> `{remoteId, at}`, sprzątany po 7 dniach). (b) `saveActiveDraft`: jeśli klucz docelowy ma tombstone, przekieruj zapis pod klucz remote (sessionId=remoteId, sessionOrigin='remote', merge: zachowaj cloudRevision/cloudUpdatedAt/pendingWrite* z istniejącego rekordu remote, treść i version z zapisywanego draftu tylko gdy version nowsza). (c) `markPromotedToRemote` przy istniejącym drafcie remote NIE nadpisuje ślepo: scala po `version` (nowsza treść wygrywa), znaczniki chmury zawsze świeże.

**Workflow:**
- [x] Krok 1: failing testy draft-db: (1) po markPromotedToRemote zapis pod provisional ląduje pod remote (jeden draft w IDB, sessionId=remoteId); (2) markPromotedToRemote nie cofa treści, gdy draft remote ma nowszą version; (3) tombstone starszy niż 7 dni ignorowany i czyszczony.
- [x] Krok 2: implementacja tombstone + przekierowania + merge.
- [x] Krok 3: rozszerz test E2E emulatora `e2e/emulator/workout-conflict.spec.ts` scenariusz 4 (promocja): edycja w trakcie promocji nie tworzy drugiego draftu i nie nadpisuje nowszej treści.
- [x] Krok 4: commit `fix(sync): tombstone promocji provisional->remote, zapisy przekierowane (Z32)`.

### CHECKPOINT FAZY 1
- [x] `npm run test` (wszystkie + nowe), `npm run typecheck`, `npm run lint`, `npm run build`.
- [x] `npm run e2e:mock` oraz `npm run e2e:emulator` (JDK21).
- [x] Wpis do DECYZJE.md (FAZA 1 R2: co, root cause per zadanie, weryfikacja).

---

## FAZA 2: P1 funkcjonalne i infrastrukturalne (Z33-Z35)

### Zadanie Z33: reanimacja waitlisty (R2-05)

**Goal:** Zapis na waitlistę z ekranu logowania działa w produkcji.

**Znalezisko:** `functions/src/registration.ts:590`: `createWaitlistEntry = onCall({ enforceAppCheck: true }, ...)`, a w `src/` zero `initializeAppCheck` (zweryfikowane grep). Functions v2 odrzuca każdy request bez tokenu App Check. Emulator pomija weryfikację, więc testy tego nie łapią.

**Fix (wariant A, rekomendowany):** zdejmij `enforceAppCheck: true` z tego jednego callable; zostaje istniejący transakcyjny rate limit + walidacje + cooldown. Pełny App Check (reCAPTCHA v3 web + App Attest iOS) pozostaje odłożony do publicznego launchu (decyzja w DECYZJE.md:342, PLAN_RELEASE_1.0.md:100). **Wariant B** (jeśli user zdecyduje inaczej): wdrożyć App Check w kliencie; to osobny projekt, nie wciskaj go w to zadanie.

**Workflow:**
- [x] Krok 1: potwierdź znalezisko w logach produkcji: `gcloud functions logs read createwaitlistentry --project fittracker-workouts --limit 50` (szukaj failed-precondition/unauthenticated). Jeśli logów brak (nikt nie próbował), znalezisko i tak stoi (kod).
- [x] Krok 2: usuń `{ enforceAppCheck: true }` z createWaitlistEntry; test functions: `npm --prefix functions test`.
- [x] Krok 3: commit `fix(functions): waitlista bez enforceAppCheck (klient nie ma App Check) (Z33)`.

### Zadanie Z34: release-ios.sh ładuje .env (R2-06)

**Goal:** `scripts/release-ios.sh` działa bez ręcznego `set -a && source .env`.

**Fix:** w `scripts/release-ios.sh`, po `cd "$ROOT"`, przed preflight:

```bash
# Załaduj .env jeśli istnieje (preflight wymaga VITE_REVENUECAT_APPLE_API_KEY w env;
# vite build czyta .env sam, ale procesy node/preflight już nie)
if [ -f .env ]; then
  set -a
  # shellcheck source=/dev/null
  source .env
  set +a
fi
```

Semantyka bez zmian: `.env` ma tylko `VITE_*`/`STRENGTHSAVE_*`, defaulty `ASC_*` przez `${VAR:-...}` nietknięte. Przy okazji (to samo zadanie, ten sam plik): popraw stale komentarz "CURRENT_PROJECT_VERSION, 2 wystapienia" na 6 wystąpień (zgodnie z preflight i CLAUDE.md) i dodaj walidację istnienia pliku klucza `.p8` z czytelnym komunikatem błędu przed startem builda.

**Workflow:**
- [x] Krok 1: wprowadź zmiany; `bash -n scripts/release-ios.sh` (syntaks) i test na sucho: `env -i bash -c 'cd <root> && source scripts/... ' NIE uruchamiaj pełnego release; wystarczy sprawdzić, że preflight przechodzi bez ręcznego source: `node scripts/release-ios-preflight.mjs` w czystym env po załadowaniu bloku.
- [x] Krok 2: commit `fix(scripts): release-ios.sh ładuje .env, walidacja .p8, poprawiony komentarz (Z34)`.

### Zadanie Z35: WorkoutDay bez re-render bomby (R2-07)

**Goal:** Tick zegara sesji nie re-renderuje kart ćwiczeń; skany historii (1RM, advice, previousSets) liczone raz per zmiana danych, nie co sekundę.

**Znalezisko:** `src/pages/WorkoutDay.tsx:173-181` `setElapsedSec` w `setInterval(1000)` re-renderuje cały komponent; w renderze per ćwiczenie liczone inline: `getExerciseBest1RM(workouts)` (`:2025`), `getNextSetAdvice` (`:2021`), `getRzaAdvice` (`:2029`), `getPreviousSets` (`:2020`); memo ExerciseCard bezużyteczne przez świeże lambdy `onSetsChange`/`onMetricsChange` (`:2018`, `:2028`).

**Fix:** (a) wydziel zegar do małego komponentu `SessionClock` (props: startedAt; własny setInterval; renderuje tylko elapsed) i usuń `elapsedSec` ze stanu WorkoutDay; (b) `useMemo` dla danych per ćwiczenie zależny od `[workouts, dayId]` (mapa exerciseId -> {best1RM, advice, previousSets}); (c) stabilne callbacki `useCallback` przyjmujące `exerciseId` (karta przekazuje swój id), bez lambd inline w mapie renderującej.

**Workflow:**
- [x] Krok 1: zmiany chirurgiczne, bez ruszania logiki syncu (Z29-Z32 już scommitowane; nie przesuwaj ich kodu).
- [x] Krok 2: weryfikacja: istniejące testy zielone; ręcznie w dev: `console.count` w ExerciseCard (albo React Profiler) pokazuje brak re-renderu kart na tick zegara przy otwartym treningu.
- [x] Krok 3: commit `perf(workout): zegar sesji wydzielony, memoizacja advice/1RM, stabilne callbacki (Z35)`.

### CHECKPOINT FAZY 2
- [x] `npm run test`, `npm run typecheck`, `npm run lint`, `npm run build`, `npm --prefix functions test`.
- [x] Scenariusz background/resume na realnym urządzeniu lub symulatorze (zmiany dotykały WorkoutDay): zgaś ekran w trakcie treningu, odczekaj, wróć; odhaczenia zachowane, zegar poprawny.
- [x] Wpis do DECYZJE.md.

---

## FAZA 3: Koszty Functions / serverless (Z36-Z40)

Kolejność wg stosunku efekt/wysiłek: Z36 -> Z37 -> Z38 -> Z39 -> Z40.

### Zadanie Z36: stravaScheduledSync bez pełnego skanu historii (R2-08)

**Goal:** Odczyty przy syncu Stravy proporcjonalne do liczby POBRANYCH aktywności (typowo 0-5), nie do całej historii usera. Redukcja ~99% największego drivera reads.

**Znalezisko:** `functions/src/index.ts:1444-1455`: przy każdym syncu (też codziennym inkrementalnym z lookback 7 dni) query po CAŁEJ `strava_activities` usera; `select()` nie pomaga (projekcja bilinguje 1 read/dokument). 300 userów x 300 aktywności x 30 dni = ~2.7M reads/mies., rośnie bez sufitu.

**Fix:** zamiast pełnej kwerendy: `db.getAll(...)` po deterministycznych ID (`strava-{uid}-{activityId}`) WYŁĄCZNIE dla aktywności właśnie pobranych ze Stravy w tym runie. Initial sync (365 dni) może zostać na pełnej kwerendzie (jednorazowy). Upsert po deterministycznym ID i logika REFRESHABLE_ACTIVITY_FIELDS bez zmian.

**Workflow:**
- [x] Krok 1: failing test w `functions/src/strava-activity.test.ts` (lub nowy plik): sync inkrementalny z 3 pobranymi aktywnościami wykonuje odczyt tylko 3 dokumentów (mock db: zlicz odczyty), nie kolekcji.
- [x] Krok 2: implementacja; testy functions + build functions.
- [x] Krok 3: commit `perf(functions): strava sync czyta tylko pobrane aktywności przez getAll (Z36)`.

### Zadanie Z37: resumeDeletionOperations co 60 minut (R2-09)

**Goal:** -97% inwokacji najczęściej wywoływanej funkcji projektu.

**Fix:** `functions/src/registration.ts`: `onSchedule("every 5 minutes")` -> `onSchedule("every 60 minutes")`. Usunięcia i tak biegną synchronicznie w adminDeleteUser/deleteOwnAccount; cron to worker naprawczy po crashu; dokończenie do 1 h później jest OK (GDPR bez zmian).

**Workflow:**
- [x] Krok 1: zmiana + `npm --prefix functions test` + build.
- [x] Krok 2: commit `perf(functions): resumeDeletionOperations co 60 min zamiast 5 (Z37)`.

### Zadanie Z38: weeklyDigest z opt-out i zbiorczą kwerendą (R2-10)

**Goal:** Maile tylko do aktywnych userów bez opt-outu; reads proporcjonalne do treningów tygodnia, nie 2 kwerendy per user.

**Znalezisko:** `functions/src/weekly-digest.ts:214-222`: `admin.auth().listUsers` WSZYSTKICH, filtr tylko "ma email", mail do każdego z >= 1 treningiem, zero sprawdzenia `notificationPrefs`/`status`/`access` (maile idą też do zawieszonych). Przy 1000 userów dominuje cały rachunek (Resend ~20 USD/mies.).

**Fix:** (a) źródłem odbiorców jest kolekcja `users` (paginowana), filtr w pamięci: `status == 'active'` ORAZ `notificationPrefs.weeklyDigest !== false` (opt-out, default wysyłaj); (b) zamiast 2 kwerend per user: JEDNA zbiorcza kwerenda `workouts` where `completed == true` and `date >= start` and `date <= end`, grupowanie po `userId` w pamięci; analogicznie jedna kwerenda `strava_activities` po dacie; mail tylko do userów z >= 1 treningiem; (c) toggle w ustawieniach klienta: pole `notificationPrefs.weeklyDigest` (boolean) w miejscu, gdzie już jest UI preferencji powiadomień (wzorzec dailyReminder); klucze i18n do OBU plików; sprawdź, że whitelist update `users` w rules dopuszcza `notificationPrefs` (dailyReminder już z niego korzysta).

**Workflow:**
- [x] Krok 1: failing testy functions: (1) user ze `status: 'suspended'` nie dostaje maila; (2) user z `notificationPrefs.weeklyDigest === false` nie dostaje; (3) brak pola = dostaje; (4) liczba kwerend workouts niezależna od liczby userów (mock: 1 kwerenda).
- [x] Krok 2: implementacja digest + composite index jeśli kwerenda go wymaga (`firestore.indexes.json`: workouts completed+date; sprawdź istniejące indeksy).
- [x] Krok 3: toggle UI + i18n + test komponentu ustawień (jeśli sekcja ma testy; minimum: typecheck/lint).
- [x] Krok 4: commit `perf(functions): weeklyDigest opt-out + zbiorcza kwerenda (Z38)` (+ osobny commit UI `feat(settings): toggle weekly digest (Z38)`).

### Zadanie Z39: usunięcie martwego stacku AI (R2-11)

**Goal:** -3 funkcje (kontenery), -1 sekret, mniejsza powierzchnia ataku (streamOpenAI to publiczny endpoint HTTP), czystszy klient.

**Znalezisko (dowód martwoty, zweryfikowany rg):** `callOpenAIStream` (jedyny klient streamOpenAI, `src/lib/ai-coach.ts:186`): zero wywołań. `ai-coach.ts` importowany wyłącznie przez `useAISwap.ts`, który ma ZERO importerów. `generateWeeklySummaryText`: zero wywołań (useWeeklySummary tylko czyta kolekcję). `TypingIndicator.tsx`: zero importerów. Feature AI Chat usunięty w v6.7.0, AI z planów w v6.10.0.

**Fix:** Functions: usuń eksporty `streamOpenAI`, `proxyOpenAI`, `generateWeeklySummary` z `functions/src/index.ts` + moduł `ai-usage.ts` (z testami) + zależność od sekretu `openai-api-key`. Klient: usuń `src/lib/ai-coach.ts`, `src/hooks/useAISwap.ts`, `src/components/TypingIndicator.tsx`, generator w weekly-summary lib (odczyt `weekly_summaries` w useWeeklySummary ZOSTAJE); usuń martwe klucze i18n z OBU plików: `coach.err.*` (9), `workout.coach.*` (4), `card.coachAi`. AdminDashboard: usuń kartę/odczyt `ai_usage` (flaga `aiEnabled` w users może zostać w danych, UI do usunięcia). `firestore.indexes.json`: usuń composite index `chat_messages`. UWAGA: NIE usuwaj kolekcji ani danych; NIE zmieniaj rules w tym zadaniu (rules domyka Z41). Kasowanie funkcji z GCP dopiero w FAZIE 6 (release train): `firebase functions:delete streamOpenAI proxyOpenAI generateWeeklySummary --force` (albo deploy z potwierdzeniem usunięcia).

**Workflow:**
- [x] Krok 1: przed usunięciem każdego pliku: `rg` po jego eksportach (potwierdź zero importerów; bezpiecznik z ograniczeń globalnych pkt 3).
- [x] Krok 2: usuń kod; `npm run test`, `npm run typecheck` (wykryje wiszące importy), `npm --prefix functions test` i build.
- [x] Krok 3: commit `chore(cleanup): usunięcie martwego stacku AI, functions + klient + i18n + indeks (Z39)`.

### Zadanie Z40: reminder odwrócony + audit log 1x/dzień + TTL (R2-12)

**Goal:** dailyTrainingReminder czyta O(posiadaczy tokenów), nie O(wszystkich userów); syncUserProfile nie pisze audit logu przy każdym otwarciu apki; kolekcje operacyjne mają TTL.

**Fix:** (a) `functions/src/daily-reminder.ts:102-110`: iteruj po `fcm_token_registrations` (grupuj po userId), czytaj tylko tych userów i ich plany (przy 1000 userów / 100 z tokenem: ~3k -> ~300 reads/dzień). (b) `syncUserProfile` w `functions/src/registration.ts`: wpis `login_success` do `auth_audit_logs` tylko gdy poprzedni login (pole lastLoginAt profilu, które funkcja i tak czyta/pisze) starszy niż 20 h; inne typy zdarzeń bez zmian. (c) TTL: dodaj pole `expiresAt` (Timestamp) przy zapisie do kolekcji: `auth_audit_logs` (90 dni), `notification_logs` (90), `api_audit_logs` (180), `api_rate_limits` (7), `email_verification_codes` (1), `waitlist_rate_limits` (7), `client_errors` (30); polityki TTL włącza się w konsoli/gcloud (`gcloud firestore fields ttls update expiresAt --collection-group=<nazwa> --enable-ttl`), zapisz dokładne komendy w DECYZJE.md, wykonanie w FAZIE 6.

**Workflow:**
- [ ] Krok 1: failing testy: reminder z 2 tokenami i 10 userami czyta tylko 2 userów; syncUserProfile drugi raz tego samego dnia nie pisze audit logu.
- [ ] Krok 2: implementacja + pole expiresAt w writerach wymienionych kolekcji (client_errors pisze klient: dodaj expiresAt w `src/lib/error-telemetry.ts` i dopuść pole w rules w Z41).
- [ ] Krok 3: testy functions + build; commit `perf(functions): reminder po tokenach, audit log 1x/dzień, TTL expiresAt (Z40)`.

### CHECKPOINT FAZY 3
- [ ] `npm run test`, typecheck, lint, build; `npm --prefix functions test` i `npm --prefix functions run build`.
- [ ] Wpis do DECYZJE.md (w tym tabela: funkcja -> zmiana -> efekt kosztowy; komendy TTL do wykonania w FAZIE 6).

---

## FAZA 4: Rules hardening + pakiety P2 (Z41-Z44)

### Zadanie Z41: domknięcie schematów w rules (R2-13, R2-14, R2-15)

**Goal:** Każda kolekcja zapisywana przez klienta ma zamknięty schemat i limity; client_errors nieopłacalne do floodowania; martwe uprawnienia zamknięte.

**Fix (per kolekcja, wzorzec `validWorkoutShape()` z Z28):**
- `client_errors`: wszystkie pola z typami i limitami (`code` string <= 64, `phase` string <= 32, `sessionHash` string size == 8, `appVersion` string <= 32, `platform` in ['web','ios','android'], `detail` string <= 500, `createdAt` int w widełkach `request.time.toMillis() +/- 10 min`, `expiresAt` timestamp z Z40, `userId == request.auth.uid`); create nadal bez `hasSelfAccess` (świadomie: telemetria ma działać też przy problemach z profilem; koszt get() w rules > zysk).
- `training_plans`: `keys().hasOnly([...])` z listą pól z modelu klienta (odczytaj typ z `src/` przed pisaniem reguły), typy skalarnych pól, limit rozmiaru stringów (name <= 200). Rules nie iterują po tablicach: głęboka walidacja tygodni/dni zostaje w kodzie.
- `measurements`, `plan_cycles`, `plan_cycle_operations`, `app_telemetry_daily`: hasOnly + typy pól skalarnych.
- `users`: dla pól z istniejącej whitelisty update dodaj typy wartości (minimum: `notificationPrefs is map`, `preferences is map`, stringi z limitem długości).
- `weekly_summaries`: `allow create, update: if false` (klient tylko czyta; functions nie zapisują wcale, zweryfikowane).
- `chat_messages`: `allow delete: if false` (spójnie z Z28; GDPR kasuje przez admin SDK).

**Workflow:**
- [ ] Krok 1: failing testy rules per zmiana (wzorzec istniejących 63 testów): dokument zgodny ALLOWED, nadmiarowe pole DENIED, zły typ DENIED, createdAt poza widełkami DENIED, weekly_summaries create DENIED, chat_messages delete DENIED. OBOWIĄZKOWO regresja: "konto bez pola status zapisuje workout" (lekcja ef8b8d5) i wszystkie 63 istniejące zielone.
- [ ] Krok 2: implementacja w `firestore.rules`; `npm run test:rules` (JDK21).
- [ ] Krok 3: sprawdź, że klient przechodzi: `npm run e2e:emulator` (rules na emulatorze) + rg po writerach każdej zmienianej kolekcji (czy nie zapisują pól spoza hasOnly).
- [ ] Krok 4: commit `chore(security): zamknięte schematy rules dla kolekcji klienta (Z41)`.

### Zadanie Z42: sync P2 pakiet A: kolejka i klasyfikacja (R2-16..R2-19)

**Goal:** Kolejka nie ponawia w nieskończoność; offline to nie błąd; telemetria z prawdziwą fazą.

**Fix:** (1) `AutoSyncOnReconnect.tsx:71`, `SyncCenterCard.tsx:173,182,236`: `markRetry`/upsert na `outcome.sessionId` (po promocji NOWY id), nie na `entry.sessionId`. (2) `workout-sync-queue.ts`: wpis dostaje flagę `permanent` ustawianą, gdy `classifyWorkoutSyncError` zwraca not-found/permission; AutoSync pomija takie wpisy, SyncCenter pokazuje z akcją ręczną (usuń/ponów). (3) `WorkoutDay.tsx:553`: gałąź offline przez `classifyWorkoutSyncError(outcome.error) === 'offline'` zamiast `=== 'OFFLINE'` (silnik zwraca 'OFFLINE' tylko dla provisional; remote offline leci surowym błędem Firestore). (4) `SyncCenterCard.tsx:142-147,187-192`: przekazuj rzeczywisty `kind` do telemetrii (checkpoint vs final), konflikt wykryty podczas syncu raportuj jako phase syncu, nie 'conflict-resolve'. (5) R2-32 martwy kod po Z23: usuń `src/lib/sync-center-payload.ts` wraz z jego testem (pułapka `expectedRevision: draft.cloudRevision ?? 0` sprzeczna z kontraktem, brak writeId; zero użyć poza testem — potwierdź rg), nieużywany `isSyncingRef` (`WorkoutDay.tsx:146`) i import `matchesFinalWorkoutContent` (`WorkoutDay.tsx:50`); gałęzie `!result.success && result.skipped` w `WorkoutDay.tsx:1381-1383,1422-1426` dostosuj do kontraktu Z23 (skipped przychodzi z success:true; w `handleRetrySync` skipped-sukces NIE pokazuje toastu "zsynchronizowano").

**Workflow:**
- [ ] Krok 1: failing testy: (1) unit kolejki: permanent nie wraca w getRetryable; (2) test adaptera (istniejące wzorce testów AutoSync/SyncCenter, jeśli brak: testy funkcji pomocniczych wyekstrahowanych przy fixie); (3) unit klasyfikacji gałęzi offline.
- [ ] Krok 2: implementacja + testy zielone.
- [ ] Krok 3: commit `fix(sync): markRetry po promocji, cap permanent, offline przez taksonomię, telemetria phase (Z42)`.

### Zadanie Z43: sync P2 pakiet B: baseline i hydracja (R2-20..R2-23)

**Goal:** Baseline promocji zawsze z serwera; snapshot draftu zna bazę kolejkową; hydracja nie kasuje notatek; jedno połączenie IDB.

**Fix:** (1) `workout-sync-engine.ts:165-168`: po promocji na ISTNIEJĄCĄ sesję pobierz baseline `getWorkoutSessionFromServer` (deps już istnieją po Z22) zamiast ufać revision z wyniku createSession (może być z cache onSnapshot). (2) `WorkoutDay.tsx:387-389`: `previousDraft` z fallbackiem na `queuedDraftRef` przy zgodnym sessionId (chroni version/startedAt/cycleId przy hydracji z kolejki); to zmiana w wyekstrahowanym w Z29 `workout-draft-snapshot.ts`. (3) `WorkoutDay.tsx:755-768`: `buildWorkoutWriteExpectation` przy czyszczeniu draftu po ukończonym treningu porównuje też `notes`/`skippedExercises`; przy rozjeździe draft ZOSTAJE (dirty), nie jest kasowany. (4) `workout-draft-db.ts:221-259`: singleton połączenia IDB z handlerami `onversionchange`/`onclose` (reopen przy zerwaniu po tle), zamiast open per operacja.

**Workflow:**
- [ ] Krok 1: failing testy per punkt (silnik: baseline z fake serwera przy istniejącej sesji; snapshot: baza z queuedDraft; draft-db: reuse połączenia i reopen po symulowanym close; ekspektacja: notes w porównaniu).
- [ ] Krok 2: implementacja + testy.
- [ ] Krok 3: commit `fix(sync): baseline promocji z serwera, queuedDraft jako baza, hydracja z notes, singleton IDB (Z43)`.

### Zadanie Z44: frontend P2 (R2-24..R2-29)

**Goal:** Notyfikacje przerwy odzyskiwalne po zmianie uprawnień; brak wyścigu schedule/cancel; serie z Watch nie giną po cichu; auto-repair cykli ponawialny; badge pending bez pollingu IDB; czyste trasy.

**Fix (6 izolowanych commitów, kolejność dowolna):**
1. `src/lib/rest-notification.ts:11-25`: cache'uj tylko wynik pozytywny; negatywny weryfikuj ponownie przy każdej próbie (lub inwaliduj na `resume`).
2. `src/components/RestTimer.tsx:90-106`: token generacji (licznik inkrementowany przy każdym schedule/cancel) sprawdzany po awaitach przed `LocalNotifications.schedule`; cancel czeka na trwający schedule (wspólny promise chain).
3. `src/hooks/useWatchWorkoutSync.ts:89-93` + `WorkoutDay.tsx:1298-1313`: klucz do `appliedRef` dopiero PO sukcesie `onSetLogged`; w catch: usuń klucz, `reportClientError` + toast (klucz i18n do OBU plików).
4. `src/pages/Cycles.tsx:114-121`: guard `repairKey` ustawiany po sukcesie (`cycleId != null`), czyszczony przy porażce.
5. `src/hooks/useOnlineStatus.ts:24-38`: zamiast `setInterval(2000)` nasłuch `WORKOUT_SYNC_STATE_CHANGED_EVENT` (już istnieje, używany w Dashboard/Cycles) + odświeżenie na `focus`/`online`.
6. `src/App.tsx:196`: usuń martwy duplikat trasy /measurements; `src/pages/Settings.tsx:60`: `limit(ADMIN_USERS_LISTENER_LIMIT)` na getDocs users; `src/pages/Profile.tsx:89`: po udanym uploadzie avatara usuń poprzedni plik (lub stała nazwa pliku = nadpisywanie).

**Workflow:**
- [ ] Krok 1: dla 1-5 failing test przed fixem (unit/hook testy; wzorce w istniejących testach hooków); dla 6 wystarczy typecheck/lint + istniejące testy.
- [ ] Krok 2: implementacje, commit per punkt (`fix(...): ... (Z44)`).

### CHECKPOINT FAZY 4
- [ ] `npm run test`, typecheck, lint, build, `npm run test:rules`, `npm run e2e:mock`, `npm run e2e:emulator`.
- [ ] Scenariusz background/resume na urządzeniu (zmiany dotykały notyfikacji i draftów).
- [ ] Wpis do DECYZJE.md.

---

## FAZA 5: Higiena repo i zależności (Z45)

### Zadanie Z45: sprzątanie (R2-30, R2-31)

**Goal:** Repo bez śmieci, zależności bez martwego balastu, functions bez znanych moderate.

**Workflow (commit per punkt):**
- [ ] Krok 1: `git rm --cached test-results/.last-run.json` (gitignore już pokrywa, plik był trackowany wcześniej).
- [ ] Krok 2: root `package.json`: `"engines": { "node": ">=22" }`.
- [ ] Krok 3: functions: override `uuid` >= 11.1.1 w `functions/package.json` (sekcja overrides istnieje, wzorzec na miejscu); `npm --prefix functions install` + testy; jeśli override łamie firebase-admin, wycofaj i odnotuj w DECYZJE.md (czekamy na bump SDK).
- [ ] Krok 4: usuń nieużywane zależności: `zod`, `@hookform/resolvers`, `react-hook-form` + `src/components/ui/form.tsx`; 11 sierot shadcn (`@radix-ui/react-menubar`, `react-navigation-menu`, `react-context-menu`, `react-hover-card`, `react-aspect-ratio`, `react-resizable-panels`, `embla-carousel-react`, `input-otp`, `cmdk`, `vaul`, `react-day-picker`) + odpowiadające pliki `src/components/ui/*`. PRZED usunięciem każdej: `rg` po importach (bezpiecznik). Po: test/typecheck/build.
- [ ] Krok 5: usuń martwe `VITE_ALLOWED_EMAIL`/`VITE_ALLOWED_EMAILS` z `.github/workflows/deploy.yml:60-61,137-138` i `src/vite-env.d.ts:13`; poinformuj usera, żeby usunął sekrety z GitHub Secrets (ręczne).
- [ ] Krok 6: usuń zweryfikowane martwe grupy kluczy i18n z OBU plików: `workout.status.{offline,syncPending,syncing,synced,finishedLocally}`, `newplan.level.*`, `onboarding.level.*` (PlanWizard używa `ob.level.*`); PRZED usunięciem każdej grupy `rg` po pełnym kluczu ORAZ po prefiksie dynamicznym (`t(\`` z prefiksem). Kluczy `coach.*` nie ruszaj tutaj, poszły w Z39.
- [ ] Krok 7: wpis do DECYZJE.md: hardcoded PL w panelach admina uznane za "by design" (admin = właściciel, PL) LUB zadanie migracji do t() do backlogu; decyzja usera.

### CHECKPOINT FAZY 5
- [ ] `npm run test`, typecheck, lint, build, `npm run check:bundle-budget`, `npm --prefix functions test`.

---

## FAZA 6: Release train + weryfikacja terenowa (Z46)

### Zadanie Z46: wdrożenie

**Goal:** Komplet R2 na produkcji: web + functions (z usunięciem martwych) + rules + iOS build 49; TTL włączone; test terenowy przygotowany.

**Workflow (kolejność OBOWIĄZKOWA, checklist CLAUDE.md):**
- [ ] Krok 1: pełne bramki: `npm run test`, typecheck, lint, build, `npm run test:rules`, `npm --prefix functions test`, `npm run e2e:mock`, `npm run e2e:emulator`.
- [ ] Krok 2: commit + push na main.
- [ ] Krok 3: functions: `firebase deploy --only functions` (potwierdź usunięcie streamOpenAI/proxyOpenAI/generateWeeklySummary przy prompt'cie lub wcześniej `firebase functions:delete streamOpenAI proxyOpenAI generateWeeklySummary --force`).
- [ ] Krok 4: rules + indeksy: `firebase deploy --only firestore:rules,firestore:indexes` (usunięcie indeksu chat_messages + ewentualny nowy indeks digest).
- [ ] Krok 5: TTL: wykonaj komendy `gcloud firestore fields ttls update ...` zapisane w DECYZJE.md (FAZA 3).
- [ ] Krok 6: web: `npm run deploy` (sam push NIE aktualizuje strony). NIGDY `cap sync ios` po deployu (dist ma wtedy build webowy).
- [ ] Krok 7: iOS: bump `CURRENT_PROJECT_VERSION` 48 -> 49 w `ios/App/App.xcodeproj/project.pbxproj` (6 wystąpień, pilnuje preflight), potem `scripts/release-ios.sh "R2: stabilność zapisu + koszty"` (po Z34 bez ręcznego source .env). Jeśli sesja interaktywna: potwierdź z userem przed wysyłką TestFlight.
- [ ] Krok 8: weryfikacja produkcji: waitlista na prod web (zapis przechodzi), logi functions bez błędów po 1. uruchomieniu cronów.
- [ ] Krok 9: wpis do DECYZJE.md (checkpoint R2) + aktualizacja `CONTEXT.md` (OSTATNIE DECYZJE) i `PLAN.md` jeśli statusy się zmieniły.
- [ ] Krok 10: scenariusz testu terenowego dla USERA (wypisz w raporcie): (1) trening z gaszeniem ekranu między seriami, po powrocie odhaczenia są; (2) "Zakończ trening" na słabym zasięgu, w trakcie zapisu odhacz jeszcze jedną serię, po syncu seria jest w historii; (3) edycja ukończonego treningu i zapis; (4) start treningu offline, włącz sieć w trakcie, dokończ; (5) zapis na waitlistę z niezalogowanej przeglądarki.

---

## FAZA 7 (OPCJONALNA, po 2 tygodniach stabilnej produkcji): dalszy slim-down

Nie wykonuj bez osobnej zgody usera. Backlog z audytu R2 i R1:

1. **Maszyna stanów sesji** (rekomendacja 4 audytu R1, odłożona świadomie): jawne stany idle/active-provisional/active-remote/completing/final-pending/completed/editing/conflict jako czysta funkcja + ekstrakcja hydracji `shouldUseDraft` z WorkoutDay.
2. **vitest 4.x** major bump (HIGH/CRITICAL w dev deps functions; nie dotyka produkcji).
3. **saveMaxHR -> rules**: dopuść `estimatedMaxHR` (int 100-230) i `maxHRManualOverride` (bool) w whitelist users; klient setDoc merge; usuń funkcję.
4. **Admin listy -> bezpośrednie odczyty z rules `isAdmin()`**: `listInvites`, `listWaitlistEntries`, `listAuthAuditLogs`, `adminGetUserLogs`, `revokeInvite` (-5 kontenerów; `api_keys` ZOSTAJE po stronie serwera).
5. **Konsolidacja pozostałych admin callables** w jeden dispatcher `adminOps` (-6 kontenerów, mniej cold startów; niski priorytet).
6. **exportUserDataApi**: paginacja `startAfter(date)` zamiast `offset()`.
7. **App Check pełny** (reCAPTCHA v3 web + App Attest iOS) przed publicznym launchem; wtedy przywróć enforceAppCheck na createWaitlistEntry i rozważ na innych callable.
8. **Chunk firebase (715K, 87% budżetu)**: rozbić w manualChunks przy najbliższym bumpie SDK Firebase.

---

## Poza zakresem tego planu (świadomie)

- Maszyna stanów sesji, vitest 4.x, App Check: patrz FAZA 7.
- Konflikt draftów multi-device jako pełny flow (M2.8), Wilks score, Z10 IntervalTimer bg-safe (timery nadal za flagą `VITE_FEATURE_WORKOUT_TIMERS=false`).
- Migracja hardcoded PL w adminie do i18n (decyzja usera w Z45 krok 7).

## Kolejność awaryjna (gdy user zgłosi nowy błąd w trakcie)

1. Błąd zapisu/utraty treningu: przerwij bieżące zadanie po commicie, diagnozuj z telemetrią `client_errors` (AdminDashboard, sekcja "Błędy klienta"), wróć do planu po hotfixie.
2. Błąd niekrytyczny: dopisz do rejestru na końcu tego pliku, nie zmieniaj kolejności faz.

## Rejestr uzupełnień (w trakcie wykonania)

- R2-33 (wykryte na bramce F1, NAPRAWIONE hotfixem): `validWorkoutShape()` z Z28 nie dopuszczał legacy pola `createdAt` w workouts — każdy update dokumentu z tym polem padał PERMISSION_DENIED (m.in. merge cykli, e2e plan-lifecycle). Fail pre-istniejący na baseline 19def99 (bramki startowe audytu nie obejmowały e2e:emulator). Fix: `createdAt` w hasOnly + test rules regresyjny. Szczegóły w DECYZJE.md (R2 FAZA 1).
