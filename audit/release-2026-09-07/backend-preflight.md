# Backend preflight — iOS 143 / Google Play 49

Data: 2026-09-07. Zakres: odczyt stanu chmury, porównanie Rules i indeksów, obecność konfiguracji oraz cztery read-only zapytania RevenueCat. **Nie wykonano deploya, zmiany IAM, utworzenia/rotacji sekretu ani operacji na danych użytkownika.** Zmieniony przez ten preflight jest wyłącznie niniejszy dokument. Źródła pozostają zamrożone po audycie.

## Wniosek i kolejność

**Faza 1 może objąć nowy indeks, sekret RC i jego binding, 68 kompatybilnych Functions oraz Storage Rules. Nie ma potwierdzonej zależności tych Functions od nowych Firestore Rules: operacje backendu używają Admin SDK.** Pominąć `restoreWorkoutBackupV3` i cały aktualny plik `firestore.rules` do fazy 2.

Nowy klient 143/49 nie dodaje wymaganej nazwy callable. Zwykły trening, rozgrzewka, zapis v2, onboarding, nowy CSV/JSON przez v3 i backfill przez v2 zachowują istniejący protokół. To ocena zgodności źródeł i obecności endpointów, nie wynik sesji treningowej wykonanej na produkcyjnym koncie. **Nie można nazwać fazy 1 pełnym zamknięciem audytu:** odroczone są B10/B11/B12 i część ochrony Rules przy zamykaniu konta.

## Potwierdzony stan produkcji

Projekt `fittracker-workouts`, Functions `us-central1`.

| Element | Odczytany stan |
| --- | --- |
| Konto z dostępem | Jawne `--account=g.jasionowicz@gmail.com` działa dla Functions, Secret Manager metadata, IAM metadata, indeksów i Rules REST. Nie zmieniano aktywnego konta CLI. |
| Drugie istniejące konto | `grzegorzee@gmail.com` nadal otrzymuje PERMISSION_DENIED. To była przyczyna niejednoznacznego sprawdzenia sekretu w poprzednim audycie. |
| Functions | **69/69 ACTIVE**, aktualizacje 2026-09-04, najnowsza 09:04:17 UTC. `syncWorkoutV2`, `restoreWorkoutBackupV3`, `recordConsent` istnieją. Same metadane nie poświadczają identyczności z konkretnym SHA archiwum Functions. |
| Firestore Rules | Release `cloud.firestore`, 2026-08-31 10:22:28 UTC, ruleset `ae49dda7-1e3a-4276-b777-413def64df88`. **Treść identyczna z HEAD 33df6dbd**, różna od zamrożonego workspace audytu. |
| Storage Rules | Release `firebase.storage/fittracker-workouts.firebasestorage.app`, 2026-08-28 13:55:02 UTC, ruleset `6b4ff6e8-7ad0-4685-9eb9-2bc9a8fc3f59`. **Treść identyczna z HEAD 33df6dbd**. |
| Indeksy | **13 istniejących READY**. Workspace ma 14: dokładnie jedno dodanie `deletion_operations: state ASC, purgeAfter ASC`, scope COLLECTION; brak usunięć istniejących indeksów. |
| RevenueCat webhook | ACTIVE, aktualizacja 2026-09-04 08:57:36 UTC. Binding wyłącznie `REVENUECAT_WEBHOOK_AUTH` version 1. |
| Nowy secret | `REVENUECAT_SERVER_API_KEY` = **NOT_FOUND** przy koncie z dostępem. Obecnie nie jest to nierozstrzygnięty błąd IAM. |
| Runtime SA | `283539506094-compute@developer.gserviceaccount.com`; odczytane project-level role: editor, eventarc.eventReceiver, run.invoker. Nie stwierdzono project-level secretAccessor; nowy secret powinien dostać jawny, ograniczony do niego binding. |

Rules pobrano przez `firebaserules.googleapis.com/v1/projects/fittracker-workouts/releases` i wskazane rulesety. Wymagany był nagłówek quota `x-goog-user-project: fittracker-workouts`; bez niego pierwsze zapytanie dało 403. Nie odczytywano kolekcji Firestore ani plików użytkowników.

## Co nowy klient wymaga od backendu

| Przepływ 143/49 | Zgodność z obecnym backendem i znaczenie nowego deploya |
| --- | --- |
| Rozgrzewka, checklista i resume | Lokalny UI/draft; brak nowego callable. Dotychczasowy bootstrap pustej sesji i v2 nadal działają według istniejącego kontraktu. |
| Zapis / zakończenie treningu | `syncWorkoutV2` bez zmiany protokołu. Wrapper grantu jest poprawką klienta; backend już rozumie healthEpoch/grantId. |
| CSV i JSON restore | Nowy CSV używa już istniejącego `restoreWorkoutBackupV3`; payload dodaje `expectedOwnerUid`, które stary parser ignoruje. Normalny import nie wymaga nowego serwera. Nowy serwer B12 jest konieczny do autorytatywnego odrzucenia mismatch właściciela. |
| Backfill nazw | Nowy klient przechodzi przez istniejący `syncWorkoutV2` z revision/writeId i null grant. Zmiana źródła zapisów klienta nie wymaga nowej wersji protokołu serwera. Korekta bazy bez zgody oraz zachowanie historycznego health są już częścią v2. |
| Onboarding / consent | Istniejące `recordConsent` ma kontrakt odpowiedzi z mirrorem zgód. Nowe `expectedOwnerUid` nie psuje starego parsera; faza 1 dokłada serwerowy guard OB-N2, zachowując klienta bez tego pola. |
| Cross-week onboarding retry | `users.onboarding.pendingCycleId` zapisuje klient w transakcji. Obecne Rules dopuszczają pole onboarding; nie wymaga nowej funkcji ani nowych Rules. |
| Usuń trening / Undo importu bez sidecara | **Obecne Rules odrzucają batch usuwający brakujący health sidecar.** B11 znajduje się w odroczonym pliku Firestore Rules. Tego scenariusza nie należy deklarować jako naprawionego na produkcji po samej fazie 1. |
| Billing / Health native | Poprawki tożsamości SDK, health owner/grant fence i native upsert są w nowym kliencie. Backend RC B6–B8 i sandboxowy test transferu są osobną częścią fazy 1 / weryfikacji. |

Dowody źródłowe: `src/lib/workout-restore-v3.ts`, `functions/src/workout-restore-v3.ts` (parser nie odrzuca dodatkowego pola; nowy guard jest przed parserem), `src/hooks/useFirebaseWorkouts.ts`, `functions/src/workout-sync-v2.ts`, `src/lib/consents-api.ts`, `functions/src/consents.ts`, `src/hooks/usePlanCycles.ts` oraz diff z rzeczywiście wdrożonymi Rules.

## RevenueCat: konfiguracja i granica weryfikacji

- Repo `.env` zawiera **niepustą** `STRENGTHSAVE_REVENUECAT_SECRET_KEY`. `scripts/revenuecat_release.py` używa tej nazwy dla API v2 projektu `proj67cb081f`. Klucz nie był obecny w środowisku bieżącego procesu. Wartości nie drukowano.
- Po dodatkowej autoryzacji prowadzącego wykonano wyłącznie GET: katalog entitlements **200**, `pro` obecne; katalog products **200**. Potwierdza to działający klucz v2, projekt i dostęp katalogowy.
- GET active_entitlements oraz subscriptions dla **losowego, nieistniejącego** identyfikatora preflight zwróciły **404 resource_missing**, nie 401/403. Nie tworzono customer i nie odczytywano prawdziwego konta. To nie zastępuje odczytu subskrypcji testowego sandbox customer ani testu pełnego TRANSFER.
- Reconciler potrzebuje `project_configuration:entitlements:read`, `project_configuration:products:read`, `customer_information:customers:read` i `customer_information:subscriptions:read`. Uprawnienia opisują oficjalne [entitlements](https://www.revenuecat.com/docs/api-v2/entitlement), [products](https://www.revenuecat.com/docs/api-v2/product) i [customer resources](https://www.revenuecat.com/docs/api-v2/customer/resources). Znaczenie 401/403/404: [API v2](https://www.revenuecat.com/docs/api-v2).
- Pozostały konkretny blocker wdrożenia RC: **utworzenie właściwego sekretu w GCP i przyznanie odczytu runtime**. Lokalny kandydat istnieje i działa dla API katalogowego. Nie generować losowego klucza ani nie podstawiać emulatorowej fikstury.

Poniższe komendy są przygotowane **do późniejszego wykonania przez prowadzącego**, nie zostały uruchomione. Node 22 ma wbudowane `util.parseEnv`; nie potrzeba instalacji dotenv ani shellowego `source .env`. Klucz trafia wyłącznie na stdin procesu gcloud, bez argumentu procesu i bez stdout:

```sh
node --input-type=commonjs <<'NODE'
const { readFileSync } = require('node:fs');
const { parseEnv } = require('node:util');
const { spawnSync } = require('node:child_process');
const releaseKey = parseEnv(readFileSync('.env', 'utf8')).STRENGTHSAVE_REVENUECAT_SECRET_KEY;
if (!releaseKey || !releaseKey.startsWith('sk_')) {
  throw new Error('Brak poprawnego lokalnego klucza server APIv2');
}
const provision = spawnSync('gcloud', [
  'secrets', 'create', 'REVENUECAT_SERVER_API_KEY',
  '--project=fittracker-workouts',
  '--account=g.jasionowicz@gmail.com',
  '--replication-policy=automatic',
  '--data-file=-',
], { input: releaseKey, stdio: ['pipe', 'inherit', 'inherit'] });
process.exit(provision.status ?? 1);
NODE

gcloud secrets add-iam-policy-binding REVENUECAT_SERVER_API_KEY \
  --project=fittracker-workouts --account=g.jasionowicz@gmail.com \
  --member=serviceAccount:283539506094-compute@developer.gserviceaccount.com \
  --role=roles/secretmanager.secretAccessor
```

`create` celowo przerwie przy istniejącym sekrecie; po częściowym sukcesie najpierw sprawdzić metadata/wersje, nie nadpisywać ani automatycznie rotować. Po provisioning sprawdzenie `secrets versions list` i bindingów wystarcza do potwierdzenia ENABLED/access — bez `versions access`.

## Faza 1 — kolejność bez odcinania importów 142/48

1. Upewnić się, że żadna automatyzacja push nie wykona pełnego deploya Functions/Firestore wbrew selekcji. Weryfikację GitHub workflow prowadzi root.
2. Wdrożyć **wyłącznie indeksy** i zaczekać na READY nowego indeksu. Nie wdrażać schedulera wcześniej.
3. Utworzyć RC secret z istniejącego lokalnego klucza i nadać wyłącznie runtime odczyt tego sekretu, jak wyżej.
4. Wdrożyć **Storage Rules** i niżej wskazane **68 Functions**. Wspólny kod/dependencies/security zostanie wtedy odświeżony we wszystkich istniejących funkcjach poza celowo pozostawionym restore. Nie używać ogólnego `--only functions` ani `--force`.
5. Potwierdzić ACTIVE, nowy binding RC i READY indeksu. Nie uruchamiać ręcznie purge; nowy scheduler zachowuje 30 dni oraz recovery, a przy zwykłym harmonogramie będzie przetwarzać należne operacje.
6. Udostępnić klienta 143/49 do testów. Normalne importy starego 142/48 nadal mają dotychczasowy endpoint i Rules. Znane ograniczenia tej fazy komunikować zgodnie z tabelą niżej.

```sh
firebase deploy --project fittracker-workouts --account g.jasionowicz@gmail.com \
  --only firestore:indexes

gcloud firestore indexes composite list --project=fittracker-workouts \
  --account=g.jasionowicz@gmail.com \
  --filter='name:deletion_operations' --format='table(name,state)'

firebase deploy --project fittracker-workouts --account g.jasionowicz@gmail.com \
  --only storage
```

### Dokładna selekcja Functions fazy 1

**68 funkcji — wszystkie obecnie wdrożone z wyjątkiem `restoreWorkoutBackupV3`.** Lista została zbudowana z odczytanego deployment inventory, nie z domysłu. Zapewnia aktualizację współdzielonych guardów i modularnych importów we wszystkich usługach.

```sh
firebase deploy --project fittracker-workouts --account g.jasionowicz@gmail.com \
  --only 'functions:activityRollup,functions:adminBroadcastEmail,functions:adminDeleteUser,functions:adminGetBugReportScreenshotUrl,functions:adminGetUserLogs,functions:adminGrantSubscription,functions:adminResendVerification,functions:adminRevokeSubscription,functions:adminSendPush,functions:adminSendUserEmail,functions:adminUpdateBugReport,functions:adminUserRepair,functions:cleanupExpiredSesEvents,functions:cleanupStaleBugReports,functions:createApiKey,functions:createBugReport,functions:createInvite,functions:createWaitlistEntry,functions:dailyCostDigest,functions:dailyErrorDigest,functions:dailyTrainingReminder,functions:deleteOwnAccount,functions:emailWorkoutHistory,functions:emailWorkoutSummary,functions:exportUserDataApi,functions:finalizeBugReport,functions:garminDay,functions:garminDevices,functions:garminIngest,functions:garminPair,functions:garminPairStart,functions:garminRevokeAllDevices,functions:garminRevokeDevice,functions:linkedDevices,functions:listApiKeys,functions:listAuthAuditLogs,functions:listInvites,functions:listWaitlistEntries,functions:onWorkoutCompletedPrPush,functions:onWorkoutWrittenAggregate,functions:photoReminder,functions:rebuildWorkoutAggregate,functions:reconcilePendingSesEvents,functions:recordConsent,functions:redeemInvite,functions:reducedModeEndingPush,functions:registerPushToken,functions:reportAppleWatchStatus,functions:requestEmailVerificationCode,functions:resumeDeletionOperations,functions:revenuecatWebhook,functions:revokeApiKey,functions:revokeInvite,functions:rotateApiKey,functions:sesEventsWebhook,functions:stravaAuthUrl,functions:stravaCallback,functions:stravaDisconnect,functions:stravaScheduledSync,functions:stravaSync,functions:syncUserProfile,functions:syncWorkoutV2,functions:unlinkLinkedDevice,functions:unregisterPushToken,functions:updateUserAccess,functions:vacationEndingPush,functions:verifyEmailCode,functions:weeklyDigest'
```

| Naprawa audytu | Stan po fazie 1 |
| --- | --- |
| B1/B2 purge pagination/lease | Wdrożone przez resumeDeletionOperations; wymagany indeks READY. |
| B3 zamykanie konta | Functions: status deleted/access=false, natychmiastowe odłączenia i retry, 30 dni recovery. Storage: blokada nowych uploadów konta w zamykaniu. Stare Firestore hasSelfAccess już odrzuca status deleted, ale dodatkowe blokady deletionPending i edycji profilu czekają na fazę 2. |
| B4/B5 SDK billing / Health | Klient 143/49; brak nowego protokołu backendu. TestFlight nadal potrzebuje testu natywnego. |
| B6/B7/B8 RC timestamp/TRANSFER/EXTENDED | revenuecatWebhook z nowym sekretem. API failures dają retry; pełny test transferu na kontach sandbox pozostaje do wykonania. |
| B9 health consent Strava | stravaSync i stravaScheduledSync z transakcyjnym fence; zwykłe request payloady zgodne. |
| B10 raw exercises bypass | Nowy CSV/backfill klienta używa poprawnego transportu. **Serwerowa blokada bezpośrednich tablic czeka na fazę 2.** |
| B11 delete brakującego sidecara | **Odroczone** wraz z Firestore Rules; znany problem Undo/delete bez health pozostaje. |
| B12 restore expectedOwnerUid | Guard klienta wydany w 143/49. **Autorytatywny wymagany guard serwera odroczony**, aby stary JSON restore nadal działał. |
| B13 Firebase Admin statics | Modularne importy w objętych funkcjach; brak zmiany kontraktu. |
| OB-N2 consent owner | recordConsent wdrożony kompatybilnie: brak expectedOwnerUid nadal akceptowany, jawny mismatch odrzucany. |

Nie ma udowodnionej zależności powodującej awarię Functions fazy 1 na starych Firestore Rules. **Nie oznacza to równoważnej ochrony:** stare Rules zachowują B10 i B11 oraz część brakujących ograniczeń zamykanego konta. W tym preflight nie wydzielano etapowego wariantu Rules ani nie modyfikowano sprawdzonego kodu.

## Faza 2 — świadome zakończenie obsługi starego importu

Po sprawdzeniu 143/49 na urządzeniach i udostępnieniu aktualizacji obu platformom oraz web można przejść do nowego kontraktu. **Sam sukces TestFlight nie gwarantuje, że użytkownicy nadal korzystający z 142/48 przestaną importować.** Jeżeli wymogiem nadal jest nieblokowanie importu tych wersji, faza 2 musi pozostać odroczona. Egzekwowanie nowych Rules oznacza jawny wymóg aktualizacji klienta przed kolejnym importem/backfillem.

Kolejność: najpierw nowe `restoreWorkoutBackupV3`, potem Firestore Rules. Nowy klient przez cały czas korzysta z v2/v3. Stary JSON restore bez expectedOwnerUid zacznie być odrzucany po pierwszym kroku; stary CSV raw/backfill exercises po drugim. To oczekiwana granica migracji, nie utrata istniejących workoutów.

```sh
firebase deploy --project fittracker-workouts --account g.jasionowicz@gmail.com \
  --only functions:restoreWorkoutBackupV3

firebase deploy --project fittracker-workouts --account g.jasionowicz@gmail.com \
  --only firestore:rules
```

Po fazie 2 pełne B10/B11/B12 i Firestore część B3 są egzekwowane. Dotychczasowy podstawowy zapis treningu w 142/48 korzysta z v2 i pozostaje zgodny; ograniczony jest stary raw import/backfill i stary JSON restore. Wyjście: aktualizacja klienta i ponowienie operacji; nie kasować ani nie migrować historii ręcznie.

## Dowody i ograniczenia

- Zamrożony kandydat audytu: `audit/launch-2026-09-06/final-functions.log` **549 PASS**, `final-functions-emulator.log` **15/15 PASS**, `final-rules.log` **326 Firestore + 44 Storage PASS**, `final-e2e-emulator.log` **18/18 PASS**. W tym preflight ich nie powtarzano.
- Odczytano rzeczywistą konfigurację chmury i treść Rules, ale nie wywoływano produkcyjnych callable tworzących/zmieniających dane. Macierz jednostek/emulatora sprawdza końcowy zestaw źródeł; etapowy mieszany backend wymaga monitorowania po wdrożeniu i zaplanowanych testów użytkownika.
- Test natywny zakup/restore/TRANSFER, Health permissions/background oraz końcowe potwierdzenie TestFlight/Google Play są odpowiedzialnością releasu prowadzonego przez root i użytkownika. Katalogowe GET RevenueCat nie zastępują tych scenariuszy.
