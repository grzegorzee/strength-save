# Backend, konta, zakupy i granice health — audyt 2026-09-06

Stan wyjściowy: HEAD `33df6dbd`. Audyt i poprawki bez zapisów produkcyjnych, deploya ani odczytu danych prawdziwych kont. Najpierw discovery i plan B1–B8, następnie zatwierdzone RED → fix → GREEN. Poniżej zachowano dowody i plan pierwotnych usterek, a na końcu opisano wykonanie, dodatkowe potwierdzone granice oraz warunki wdrożenia. Numery linii w sekcji discovery odnoszą się do stanu wyjściowego.

## P1 B1 — kolejka usuwania kont zatrzymuje się po 25 zakończonych operacjach

- Pliki: `functions/src/registration.ts:1380,1622-1645`.
- Root cause: `processDeletionOperation` kończy z `state: completed`, zachowując `purgeAfter`. Cron wykonuje `where(purgeAfter <= now).limit(25)` i dopiero później filtruje `state === scheduled`. 25 najstarszych completed stale zajmuje całą stronę wyników; późniejsze należne usunięcia nie są wykonywane.
- Scenariusz: 25 kont przeszło 30-dniową karencję i zostało usuniętych → 26. konto osiąga termin → każde uruchomienie crona bierze te same 25 completed.
- Niezmiennik: każda należna operacja może dojść do purge niezależnie od liczby historycznych operacji.
- Plan: paginacja zapytania i limit wykonywanej pracy liczony po wyborze operacji; completed nie może być stale wybierany. Emulator test 25 completed + scheduled na następnej stronie.

## P1 B2 — twardy crash zamraża usuwanie w stanie running

- Pliki: `functions/src/registration.ts:1365,1623`.
- Root cause: przed pracą zapisuje `running`; retry pobiera tylko `pending/failed`. Timeout/kill procesu nie uruchamia catch i nie ustawi failed. Scheduled query również odrzuca running.
- Scenariusz: usuwanie zapisuje running → funkcja kończy się timeoutem po częściowym purge → cron nigdy nie podejmuje operacji.
- Niezmiennik: przerwany purge jest idempotentnie podejmowany; aktywna operacja nie jest równolegle wykonywana bez ważnego powodu.
- Plan: odzyskiwanie running po wygaśnięciu rozsądnej dzierżawy; test stale running, fresh running, partial failure i ponowienie.

## P1 B3 — usunięcie konta nie unieważnia dostępu backendowego na okres karencji

- Pliki: `functions/src/registration.ts:1423-1447`, `functions/src/security.ts:136`, `functions/src/garmin-entitlement.ts:110`, `firestore.rules:20`, `storage.rules`.
- Root cause: self-delete kasuje Auth i dopisuje `deletionPending`, ale pozostawia status active, access.enabled, tokeny Garmin, połączenia Strava i pushe. Żadna granica dostępu nie czyta deletionPending. Garmin używa własnego bearer tokenu (nie Firebase Auth), więc działa aż do purge lub końca PRO; istniejące Firebase ID tokeny zachowują ważność do godziny.
- Niezmiennik: przyjęte zamknięcie konta natychmiast wyłącza nowe operacje i niezależne urządzenia; karencja przechowuje dane wyłącznie do odzyskania/purge.
- Plan: serwerowy status/access barrier ustawiany atomowo wraz z deletionPending, centralne sprawdzanie deletionPending dla compatibility, natychmiastowe unieważnienie urządzeń/push/Strava przed potwierdzeniem zamknięcia. Retry nie wydłuża karencji. Test self-delete → Garmin/Strava/sync/rules odrzucają → purge po terminie. Wszystkie platformy: ta sama granica serwerowa.
- Źródło kontraktu Firebase: https://firebase.google.com/docs/auth/admin/manage-sessions (ID token 1 h; usunięcie wygasza refresh token).

## P1 B4 — RevenueCat nie jest związany z aktualnym kontem w odczycie ani zakupie

- Pliki: `src/lib/purchases.ts:31-70`, `src/hooks/useAuth.ts:94-99`, `src/hooks/useSubscription.ts:60-97`, `src/pages/Paywall.tsx:118-153`.
- Root cause: configure/login/logout są niezależnymi fire-and-forget operacjami bez single-flight/kolejki. Hook czyta globalny CustomerInfo i przyjmuje listener bez uid; nie czeka na logIn(uid). Paywall bezpośrednio wykonuje zakup/restore. `useAuth` istnieje równocześnie w App i UserProvider, zwiększając liczbę wywołań.
- Scenariusz: płatne konto A → wylogowanie / cold start → B → wolny lub nieudany RevenueCat.logIn(B) → CustomerInfo A daje B PRO albo zakup B zapisany jest na starym appUserID. Powrót z tła również musi ponownie sprawdzić tożsamość.
- Niezmiennik: lokalne PRO i każda operacja sklepu dotyczą potwierdzonego bieżącego Firebase uid. Firestore PRO nadal działa offline, gdy RC nie odpowiada.
- Plan: single-flight configure, serializacja/przywiązanie SDK do żądanego uid, jawny owner state z invalidacją natychmiast przy zmianie auth; hook i purchase/restore korzystają z tej granicy. Testy A→logout→B z opóźnionymi promise oraz login failure; zachować istniejący startup timeout i natychmiastowy Firestore fallback.

## P1 B5 — późny Health write ponownie włącza opcje po wycofaniu zgody

- Plik: `src/lib/health-bridge.ts:112-139`.
- Root cause: `syncPayload` łapie settings przed await i po zakończeniu zapisuje stare syncWorkouts/suggestWeight. `disableHealthFeatures` nie anuluje retry ani opóźnionych completion.
- Dowód runtime 2026-09-06: po `disableHealthFeatures()` settings=`false,false`; po rozwiązaniu mock native write settings=`true,true,lastSyncAt:…`.
- Scenariusz: ukończenie treningu → wolny zapis Health → wycofanie zgody → odpowiedź starego zapisu → opcje ponownie aktywne, a retry może robić kolejne natywne IO po revoke.
- Niezmiennik: wycofanie zgody lub wyłączenie synchronizacji jest monotoniczną barierą dla rozpoczętych operacji; późna odpowiedź nie zmienia intencji użytkownika. Aktualizacja lastSyncAt nie nadpisuje innych przełączników.
- Plan: generation fence dla IO/retry/completion, ponowny odczyt ustawień przy ACK, test deferred write → revoke → resolve oraz fail → revoke → retry timer. Uzgodnienie natywnej idempotencji z agentem native; nie kasować dowodów wykonanego eksportu w sposób powodujący duplikaty.

## P1 B6 — spóźniony webhook po comp nadpisuje nowszy zachowany stan sklepowy

- Plik: `functions/src/revenuecat.ts:165-178`.
- Root cause: po wygaśnięciu comp `resolveEventTarget` porównuje timestamp tylko z subscription (comp), ignoruje nowsze storeSubscription; następnie webhook kasuje storeSubscription.
- Dowód runtime: comp expired + storeSubscription timestamp 2000 + EXPIRATION timestamp 1000 → target=`subscription`, mimo że poprawnie powinien odrzucić stary event.
- Scenariusz: comp → renewal zapisany w storeSubscription → comp wygasa → spóźniona expiration sprzed renewal → utrata PRO (web/Garmin oraz stan konta).
- Niezmiennik: monotoniczna kolejność zdarzeń obowiązuje także przez przejście comp → subscription.
- Plan: podczas wychodzenia z comp dedupe/stale sprawdza storeSubscription; test pełnej sekwencji z renewal/stale expiration/nowy event i brak utraty store.

## P1 B7 — prawdziwy TRANSFER jest potwierdzany jako no-uid i ginie

- Plik: `functions/src/revenuecat.ts:20-62,95-100,196-204`.
- Root cause: schema i resolveUid nie obsługują transferred_from/transferred_to, mimo deklaracji TRANSFER w switch mapującym zakup. Prawdziwy webhook transferu nie ma app_user_id.
- Dowód runtime: oficjalny kształt `{type: TRANSFER, transferred_from:[user-a], transferred_to:[user-b]}` → resolveUid=null → HTTP 200/no-uid. Dostęp A nie wygasa w mirrorze, B nie dostaje go w mirrorze.
- Niezmiennik: transfer odzwierciedla aktualne entitlementy obu właścicieli; nie należy zgadywać dat/subskrypcji z payloadu, który ich nie zawiera.
- Plan: reconciliation z autorytatywnym RevenueCat API dla obu grup uid + idempotentny zapis, albo jawna bramka release konfiguracji transferów do czasu zapewnienia API credentials. Nie da się bezpiecznie nadać B PRO przez samo skopiowanie A, bo transfer może obejmować wiele transakcji/aliasów.
- Oficjalny kontrakt: https://www.revenuecat.com/docs/integrations/webhooks/event-types-and-fields oraz https://www.revenuecat.com/docs/integrations/webhooks/sample-events.

## P2 B8 — SUBSCRIPTION_EXTENDED jest pomijany

- Plik: `functions/src/revenuecat.ts:92-126`.
- Root cause/dowód runtime: `mapEventToSubscription({type:SUBSCRIPTION_EXTENDED,...})` zwraca null. Google Play może przesunąć odnowienie <24 h, a store może jawnie przedłużyć okres; stary mirror expiresAt odbiera PRO przed terminem sklepu.
- Plan: obsługa extended zachowująca istniejący status renew preference, test przedłużenie daty i stary webhook. Źródło: dokumentacja typów RevenueCat wskazana w B7.

## Dodatkowe potwierdzone usterki i zatwierdzone naprawy

### P1 B9 — Strava zapisuje health według zgody sprzed zapytania HTTP

- `functions/src/index.ts` trzymał `includeHealth` przez pobieranie zewnętrznych aktywności i końcowy batch. Wycofanie zgody lub nadanie nowego grantu podczas HTTP nie unieważniało HR ze starej operacji.
- Teraz każdy chunk do 200 aktywności wykonuje transakcję odczytującą bieżący profil/dostęp i porównuje epoch + grantId z początkiem operacji. Finalna aktualizacja maxHR również sprawdza grant w transakcji i używa `update`, aby nie odtworzyć usuniętego profilu. Bez zgody nadal zapisuje bazową aktywność.
- `strava-health-commit.test.ts`: RED przed fence, GREEN po; testy identycznego grantu, revoke i regrant. Testy czystego kontraktu nie zastępują realnego testu Strava OAuth/webhook.

### P1 B10 — raw client create/update exercises omija zgodę health

- Rules ograniczały top-level pola workout, lecz nie walidowały wnętrza tablicy exercises. Osiągalne było create z osadzonym RPE albo create `[]` → update z RPE bez zgody.
- Rules dopuszczają teraz wyłącznie pusty klientowy bootstrap sesji oraz aktualizacje niezmieniające exercises. Tablice ćwiczeń zapisują istniejące `syncWorkoutV2` i `restoreWorkoutBackupV3` z walidacją serwera.
- CSV przeniesiono do restore v3 (agent workout). Uzupełnianie historycznych nazw używa v2 z oryginalną revision i unikalnym writeId; konflikt lub brak dokumentu pomija naprawę. Baza nadal jest naprawiana bez zgody health. `null` grant uniemożliwia odświeżenie/stworzenie health, a dotychczasowy mechanizm serwera zachowuje oryginalne legacy metryki i istniejący sidecar. Metadata-only backfill zachowuje transakcję z precondition.
- Rules RED: raw create/RPE update były dozwolone; po zmianie oba denied, bootstrap i notatka nadal allowed. Frontend test naprawy zachowuje serie i notatki; dotychczasowe backend v2 testy chronią legacy health, konflikt, idempotencję i zapis bazy bez zgody.

### P1 B11 — batch usunięcia treningu odrzucany przy brakującym sidecarze

- Klient usuwa base + health atomowo, także dla treningów bez health i podczas Undo importu. `resource.data.userId` przy nieistniejącym sidecarze powodował deny całego batcha; retry po ACK loss również nie miał wyjścia.
- Rules dopuszczają uwierzytelnione usunięcie brakującego dokumentu jako no-op. Istniejące dokumenty nadal wymagają właściciela. RED → GREEN: base bez sidecara, ponowienie po usunięciu obu, cross-owner nadal denied.

### P1 B12 — zmiana konta w trakcie App Check importuje operację A pod tokenem B

- `protected-callable` czeka na App Check/dynamic import; wcześniejszy assertOwner z hooka nie chronił samego transportu. Backend celowo bierze właściciela z auth i ignoruje owner wyeksportowanego backupu, więc stara operacja A mogła trafić do B.
- Agent native dodał transport guard przed/po await i wymagane `expectedOwnerUid` przechwycone na początku importu. Serwer odrzuca brak/mismatch intencji względem `request.auth.uid` kodem `RESTORE_OWNER_CHANGED` jeszcze przed transakcją. Celowy transfer backupu pomiędzy kontami pozostaje dozwolony: target to obecne konto, owner pliku jest odrębny.
- Backend RED: obie niepoprawne operacje tworzyły dane; GREEN: zero wywołań commit. Cały moduł restore 13/13 PASS. Klient testuje realną granicę App Check + późną zmianę auth.

### P1 B13 — zależne od loadera statyczne klasy Firebase Admin wywracają trigger

- Pełny emulator E2E ujawnił `onWorkoutWrittenAggregate` → `loadAllWorkouts` → `admin.firestore.FieldPath.documentId()` z `TypeError`, ubijający proces funkcji po zapisie treningu. Dotychczasowe CJS/unit harness tego nie wykrywały.
- Realne eksporty zainstalowanego SDK sprawdzone bez mocków: modularne `firebase-admin/firestore` dostarcza klasy FieldPath, FieldValue i Timestamp; zagnieżdżone statics na namespace `firebase-admin` zależą od sposobu ładowania/proxy. Node ESM nie udostępnia ich przez dotychczasowe wyrażenia. To test przenośności samych klas, nie deklaracja konwersji całego backendu na ESM (build nadal CommonJS).
- Minimalna naprawa: bez zmian logiki, wyłącznie modularne importy trzech klas i zamiana ich referencji w dziewięciu plikach: workout-aggregate, bug-reports, repairs/admin-user-repair, registration, index, error-digest, cost-digest, revenuecat, consents. Instancja Firestore/Auth nadal korzysta z istniejącego kontraktu projektu.
- `firebase-admin-static-runtime.test.ts` odczytuje faktyczne importy i używane symbole plików produkcyjnych, uruchamia je na realnym SDK w osobnym procesie Node bez inicjalizacji/credential/network. **9 RED → 9 GREEN**. Pełne Functions po fixie **545 PASS** + 15 integracyjnych testów uruchamianych osobno, typecheck PASS.
- E2E fixtures konfliktów przeniesiono ze starego bezpośredniego write exercises na rzeczywisty callable syncWorkoutV2. Seed jest adminem emulatora; wszystkie asercje konfliktu, rebase, lost ACK, promocji i finalnej edycji sprawdzają realny backend. Istniejące konta UI mają jawny mirror obecnych obowiązkowych zgód; nowe onboarding wciąż składa zgody przez UI.

### Dodatkowe steering onboardingu — serwerowa granica zgód OB-N2

- Nowy klient przechwytuje konto wyświetlające oświadczenie i przekazuje `expectedOwnerUid` (implementacja agenta native). `recordConsent` odrzuca różnicę konta przed parse/Firestore kodem `permission-denied / CONSENT_OWNER_CHANGED`. Pole nieobecne pozostaje obsługiwane dla już wydanych klientów; jawne null/puste/inne konto są odrzucane.
- `consents-response.test.ts`: 3 RED → 5 GREEN, w tym brak jakiejkolwiek transakcji/zapisu przy mismatch oraz niezmieniony mirror dla legacy i zgodnego konta. Dodatkowy emulator HTTP test sprawdza brak mirrora po odrzuconym zapisie i przyjęcie następnej poprawnej intencji dla B.
- Nie jest to ograniczenie celowej zmiany konta przez użytkownika: po wyświetleniu oświadczenia pod B klient może rozpocząć nową operację z B. Stare oświadczenie A nie może zostać przypisane B przez zmianę tokenu w trakcie await.

## Wykonane B1–B8 i zachowane niezmienniki

| Usterka | Końcowe zachowanie | Dowód |
| --- | --- | --- |
| B1/B2 | Due query filtruje `state == scheduled` + `purgeAfter <= now`, więc historyczne completed nie zajmują stron. Completed usuwa purgeAfter. Transakcyjne claim z 10-minutową dzierżawą odzyskuje stare running; fresh running jest pomijane. Cron ma timeout 540 s. | Emulator: 25 completed + należna operacja + stale/fresh running. |
| B3 | Atomowy status deleted/access=false + deletionPending; callable/Rules/Garmin odrzucają zamknięte konto także z aktualnym starym tokenem. Garmin, Strava i push wyłączane przed usunięciem Auth; closurePending daje retry. Ponowienie zachowuje pierwotny termin 30 dni i recoveryProfile. syncUserProfile nie odtwarza konta po usunięciu profilu, gdy istnieje operation marker. | 15/15 registration integration; test centralnego guardu; Rules closing account upload/write denied. |
| B4 | Single-flight configure i kolejka mutacji SDK; potwierdzony UID/generation warunkuje zakup, restore i publikację CustomerInfo. Sieciowy read nie trzyma kolejki. Oczekująca operacja sklepu ma 5 s wyjścia, a po timeout nie uruchamia się późno. Rozpoczęty sheet/login nie jest przerywany sztucznym timeout. Firestore PRO pozostaje dostępne offline. | purchases-identity 5/5, use-subscription-bootstrap 3/3, Paywall feedback 2/2. |
| B5 | Account + grant + generation fence przed native IO, retry i ACK. Późne nowe wywołanie ze starego UID/G1 też odrzucane. Odczyt wagi unieważniony przy revoke/A→B zwraca null. ACK czyta bieżące ustawienia. Wyłączenie health nie kasuje ledgeru potwierdzonych eksportów. Native recordId UID/kind/doc + version są stabilne przy retry. | health-platform-contract 12/12; permission-purpose routing i odroczone weight/write. Natywne upsert/rationale wykonane przez agenta native. |
| B6 | Wyjście z comp porównuje event z nowszym storeSubscription, zanim zastąpi mirror. | RevenueCat stale timestamp regression. |
| B7 | TRANSFER jest rozpoznany przed resolveUid. Reconciler odczytuje API v2 dla obu stron (entitlement → active entitlements → matching subscription → product), pobiera wszystkie owner snapshots przed zapisami i nie kopiuje stanu A do B. Niepowodzenie API daje 503/retry, nigdy 200 sukces. Klucz tylko Secret Manager binding. | revenuecat-transfer 5/5, prawdziwy webhook fixture retry test; brak realnych danych/sekretów w testach. |
| B8 | SUBSCRIPTION_EXTENDED aktualizuje expiry i pozostawia preference willRenew bez zmian przez merge. | revenuecat tests 26/26. |

## Finalna weryfikacja źródeł

Backend zamrożony 2026-09-06; końcowy emulator E2E ponowiony 2026-09-07 po zmianach rozgrzewki klienta, bez deploya. Logi obok raportu:

- `final-functions.log`: **549 PASS**, 15 testów emulator-only skipped w biegu jednostkowym; 52 pliki PASS (po B13 i OB-N2).
- `final-functions-emulator.log`: **15/15 PASS** na Auth + Firestore emulator, obejmujący rozszerzony registration integration.
- `final-functions-typecheck.log`: **PASS** (`tsc --noEmit`).
- `final-functions-build.log`: **PASS** (`tsc`); pełny `e2e:emulator` dodatkowo przebudował Functions przed startem.
- `final-rules.log`: **326/326 Firestore + 44/44 Storage PASS**. Oczekiwane PERMISSION_DENIED są dowodem negatywnych scenariuszy, nie awarią zestawu.
- `final-e2e-emulator.log`: **18/18 PASS, 1,3 min**, pełne `npm run e2e:emulator` exit 0 po końcowym zamrożeniu rozgrzewki 2026-09-07. Fixture świeżego planowanego startu potwierdza widoczną propozycję rozgrzewki, klika rzeczywisty przycisk pominięcia i sprawdza zamknięcie dialogu oraz zapis Firestore; domyślna preferencja pozostaje włączona. Weryfikacja obejmuje realne Auth/Rules/Functions, przyjęcie i odmowę health w pełnym onboardingu, A→B consent rejection bez zapisu mirrora, cached active/suspended/no-profile offline, start sesji, konflikt rewizji planu/treningu, rebase, lost ACK, final edit, provisional promotion, orphan recovery, koniec planu i merge 501 wpisów.
- Chronologia E2E: **18 PASS / 26,6 s** sprzed poprawki cross-week zachowano w `e2e-emulator-before-crossweek.log`; **18 PASS / 46,1 s** po transakcyjnym pendingCycleId, przed rozgrzewką, w `e2e-emulator-before-warmup.log`. Poranny bieg po rozgrzewce ujawnił historyczny selector `/Cześć,/`, chociaż poprawny Dashboard wyświetlał „Dzień dobry, E2E!”. Zatrzymany RED (5 failed, 1 interrupted, 5 passed, 7 nieuruchomionych) zachowano w `e2e-emulator-warmup-greeting-red.log`. Helper nadal wymaga nagłówka h1 w main, ale uwzględnia trzy istniejące polskie powitania według pory dnia. Następny pełny bieg: **18 PASS**, bez retry i bez zmian produktu/Rules.
- `e2e-consent-owner.log`: dodatkowy izolowany realny HTTP test **1/1 PASS**. `e2e-onboarding-consent-diagnostic.log`: izolowany cały onboarding **1/1 PASS** z asercją dokładnej odpowiedzi recordConsent. Lokalny App Check token testowy trafia wyłącznie na localhost; te testy nie potwierdzają sprzętowej atestacji urządzeń produkcyjnych.
- Emulator suite jest serialna. Poprzedni jednoczesny start 4 workers na tym samym hoście co pełna macierz przeglądarek powodował opóźnienia lokalnych cold starts; zachowano 10-sekundowy timeout aplikacji oraz wszystkie asercje. Serialny pełny bieg zakończył się bez niejawnych retry i bez błędów runtime B13.
- Celowany frontend po naprawie restore/backfill, przed dodatkowymi poprawkami OB: **32/32 PASS** (workout-import-restore, workout-save-original-grant, workout-import-owner-boundary). Pełną końcową macierz klienta/buildów prowadzą root i pozostali agenci.
- Porty 8081/9099/5001/8090 (także wcześniej 9199) zwolnione po końcowych testach; brak listenerów potwierdzony i zgłoszony rootowi.

## Jawne warunki wdrożenia — nie wykonano ich w tym audycie

1. **Client-first rollout gate.** Nowy klient musi być dostępny przed egzekwowaniem B10 Rules i wymaganego expectedOwnerUid w restore. Stary build 142 zapisujący CSV bezpośrednio oraz backfill nazw będzie odrzucany i wymaga aktualizacji. Stary restore bez expectedOwnerUid również wymaga aktualizacji. Istniejące workouty pozostają zachowane; dotychczasowy podstawowy trening build 142 korzysta z v2 i zachowuje swój zapis. Nie wdrażać tej granicy backend-first przed dostępnością poprawionego klienta. Wyjście dla starego klienta: aktualizacja aplikacji i ponowienie importu/naprawy.
2. **Firestore composite index przed funkcjami.** `deletion_operations: state ASC, purgeAfter ASC` z `firestore.indexes.json` musi być READY przed uruchomieniem nowego schedulera. Nie migrowano produkcyjnych rekordów.
3. **RevenueCat server API key — external config blocker.** Nowy secret binding `REVENUECAT_SERVER_API_KEY` wymaga poprawnego serwerowego klucza API v2 dla projektu `proj67cb081f`, uprawnień odczytu customers/subscriptions oraz entitlements/products i dostępu runtime przez Secret Manager. Repo ma narzędzia używające zmiennej `STRENGTHSAVE_REVENUECAT_SECRET_KEY`, lecz to nie dowodzi istnienia nowego bindingu. Sprawdzenie wyłącznie metadata poleceniem `gcloud secrets describe` zwróciło IAM PERMISSION_DENIED (`secretmanager.secrets.get`); nie potwierdza to ani istnienia, ani braku sekretu. Nie odczytywano wartości. Należy zweryfikować konfigurację/uprawnienia przed deploy i przetestować transfer na kontach sandbox. Reconciler przy błędzie zwraca retry, nie nadaje dostępu na podstawie domysłu.
4. `scripts/ensure-functions-emulator-secrets.mjs` ma jawne lokalne fikstury RC webhook/server key; emulator nie powinien pobierać sekretu produkcyjnego. Skrypt nadal odrzuca nieznany istniejący plik zamiast go nadpisywać.
5. **Recovery zachowane przez 30 dni.** `recoveryProfile` zachowuje dawny status/access i stały purgeAfter; aktualizacja instrukcji supportu znajduje się w `email-templates.ts`. Przy anulowaniu żądania przed purge trzeba przywrócić Auth/profil według tego protokołu i usunąć marker/operation; urządzenia i Strava wymagają ponownego połączenia. Nie wykonywano odzyskania/usuwania prawdziwego konta.
6. Testy źródeł nie zastępują fizycznych iOS/Android scenariuszy: zakup/restore ze zmianą konta i powrotem z tła, odmowa/wycofanie Health, zapis native z retry bez duplikatu i słaba sieć. Ich status jest częścią zbiorczego raportu launch prowadzącego.

Dokumentacja pierwotna dla API v2: https://www.revenuecat.com/docs/api-v2/customer/resources. Kontrakt transferów: dokumentacja RevenueCat podlinkowana w B7. Zmiany dotyczące stanu kont i danych nie opierają się na odczycie produkcyjnych profili.

## Inwentarz zmian agenta backend do końcowego review

- Konta/usuwanie: `functions/src/registration.ts`, `registration.integration.test.ts`, `security.ts`, `security.test.ts`, `garmin-entitlement.ts`, `email-templates.ts`; `firestore.indexes.json`, `firestore.rules`, `storage.rules`, `scripts/test-firestore-rules.mjs`, `scripts/test-storage-rules.mjs`.
- Backend billing: `functions/src/revenuecat.ts`, `revenuecat.test.ts`, nowe `revenuecat-transfer.ts`, `revenuecat-transfer.test.ts`, `revenuecat-webhook.test.ts`; `scripts/ensure-functions-emulator-secrets.mjs`.
- Strava: `functions/src/index.ts` (tylko syncUserActivities); nowe `functions/src/strava-health-commit.ts`, `strava-health-commit.test.ts`.
- SDK billing i auth: `src/lib/purchases.ts`, `src/hooks/useAuth.ts`, `src/hooks/useSubscription.ts`, `src/pages/Paywall.tsx`; `src/test/purchases-identity.test.ts`, `use-subscription-bootstrap.test.tsx`, `paywall-purchase-feedback.test.tsx`.
- Health klient: `src/lib/health-sync.ts`, `src/lib/health-bridge.ts`, `src/contexts/UserContext.tsx`, `src/components/HealthSettings.tsx`, `src/hooks/useManualActivities.ts`, `src/test/health-platform-contract.test.ts`; `src/pages/WorkoutDay.tsx` wyłącznie przekazanie activeHealthGrant do Health (pozostałe zmiany należą do innych agentów).
- Współdzielony hook: `src/hooks/useFirebaseWorkouts.ts` wyłącznie batchSaveWorkout wrapper grant i backfillHistoricalWorkouts; testy `src/test/workout-save-original-grant.test.ts` i sekcja backfill w `workout-import-restore.test.ts`. CSV/JSON/Undo oraz ich testy należą do agentów workout/native.
- Backend restore owner: `functions/src/workout-restore-v3.ts`, `workout-restore-v3.test.ts`. Klient restore/helper/transport guard jest własnością agenta native.
- B13: `functions/src/workout-aggregate.ts`, `bug-reports.ts`, `repairs/admin-user-repair.ts`, `registration.ts`, `index.ts`, `error-digest.ts`, `cost-digest.ts`, `revenuecat.ts`, `consents.ts` — wyłącznie importy/referencje statycznych klas SDK; nowy `firebase-admin-static-runtime.test.ts`.
- OB-N2 serwer: `functions/src/consents.ts` i `consents-response.test.ts`.
- Emulator E2E: `e2e/emulator/workout-conflict.spec.ts` (prawdziwy callable v2), `offline-user-provider.spec.ts`, `critical-auth.spec.ts`, `plan-lifecycle.spec.ts`, nowe `app-check.ts` (fixture wyłącznie localhost) i `consent-owner.spec.ts`; `playwright.emulator.config.ts` serializuje testy z realnymi lokalnymi Functions, zachowując product deadlines/assertions.
- Dokument: ten raport i cztery finalne logi wskazane wyżej. Nie zmieniano produkcyjnej konfiguracji ani metadanych releasu przez tego agenta.
