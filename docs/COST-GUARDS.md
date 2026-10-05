# Zabezpieczenia kosztów GCP (cost guards)

Wdrożone 2026-09-30. Decyzja właściciela: limit 50 PLN/miesiąc dla projektu
`fittracker-workouts`, **bez odcinania billingu**. Google przy odpięciu konta
rozliczeniowego wyłącza wszystkie usługi i może usunąć zasoby, a apka ma
płacących userów. Zamiast tego pięć warstw:

| # | Warstwa | Gdzie | Co robi |
|---|---|---|---|
| 1 | Limit instancji | `functions/src/function-limits.ts`, `global-options.ts` | sufit równoległości każdej funkcji |
| 2 | Budżet | Cloud Billing, `infra/billing/budget.json` | maile 25/50/75/90/100% + prognoza 100%, Pub/Sub |
| 3 | Bezpiecznik w aplikacji | `functions/src/cost-guard.ts`, `config/cost_guard`, karta w panelu admina | przy 90% wstrzymuje niekrytyczne zadania cykliczne |
| 4 | Alerty anomalii | Cloud Monitoring, `infra/monitoring/*.json` | godzinowe progi odczytów, zapisów, wywołań, transferu |
| 5 | Konto tylko do odczytu | SA `agent-readonly`, `scripts/prod-read.mjs` | agenci czytają produkcję bez prawa zapisu i z sufitem odczytów |

## 1. Limit instancji (maxInstances)

`setGlobalOptions({ maxInstances: 10 })` w `functions/src/global-options.ts`,
importowanym jako PIERWSZY w `index.ts`: firebase-functions 7.2.2 czyta opcje
globalne w chwili definicji funkcji (`lib/v2/providers/https.js:90`,
`scheduler.js:59`, `firestore.js:234`, `pubsub.js:123`). Concurrency zostaje
domyślna dla v2 (80 żądań na instancję przy cpu=1), więc 10 instancji to do
800 równoległych żądań na funkcję.

Stan przed zmianą (odczyt `gcloud run services list` 2026-09-30): maxScale 20
na 70 usługach, brak limitu na `adminsetliveupdatechannel` i `emailunsubscribe`.
Ruch 30 dni: max 25 wywołań na godzinę na funkcję (`syncworkoutv2`), max 5
instancji na usługę (nakładka rewizji przy deployu).

| Funkcja | Limit | Uzasadnienie |
|---|---|---|
| wszystkie pozostałe (67, w tym `adminSetCostGuard`) | 10 (globalny) | ruch max kilkanaście wywołań na godzinę; 10×80 = 800 równoległych |
| `syncWorkoutV2` | 30 | zapis treningu na siłowni, dane święte, ruch liniowy z aktywnymi userami |
| `syncUserProfile` | 30 | każde otwarcie apki na każdym urządzeniu |
| `registerPushToken` | 20 | wywoływana przy otwarciu apki |
| `onWorkoutWrittenAggregate` | 20 | trigger 1:1 z zapisami `workouts` (Eventarc ponawia 429, ale opóźnia agregat) |
| `onWorkoutCompletedPrPush` | 20 | jw., push o rekordzie |
| `revenuecatWebhook` | 20 | płatności: odrzucony webhook opóźnia PRO płacącego usera |
| `costGuardBudgetListener` | 1 | serializuje komunikaty budżetu |

Triggerów Auth (blocking functions) projekt nie ma. Kontrakt:
`functions/src/function-limits.test.ts` importuje `index.ts` i sprawdza
`__endpoint.maxInstances` każdej eksportowanej funkcji (brak limitu, limit
inny niż zadeklarowany, martwy wyjątek albo własna concurrency = czerwony test).

## 2. Budżet

`billingAccounts/01CCE7-EC9CA5-319974/budgets/dbe64eb2-50cd-43e2-b3c2-b2145227b586`
(„Firebase Project fittracker-workouts”), treść 1:1 w `infra/billing/budget.json`:
50 PLN/miesiąc, tylko projekt 283539506094, progi na koszt rzeczywisty 25, 50,
75, 90, 100% i 100% prognozy. Maile: domyślni odbiorcy IAM konta
rozliczeniowego (admini) + odbiorcy na poziomie projektu. Komunikaty Pub/Sub
(schemaVersion 1.0) na topic `projects/fittracker-workouts/topics/cost-guard-budget`
(publisher: `billing-budget-alert@system.gserviceaccount.com`, nadany przez Billing).

Zmiana budżetu: `gcloud billing budgets update` w gcloud 559 pada
(`AttributeError: ... updateMask`), więc przez REST:

```bash
TOKEN=$(gcloud auth print-access-token --account <właściciel>)
curl -X PATCH -H "Authorization: Bearer $TOKEN" -H "x-goog-user-project: fittracker-workouts" \
  -H "Content-Type: application/json" --data @infra/billing/budget.json \
  "https://billingbudgets.googleapis.com/v1/billingAccounts/01CCE7-EC9CA5-319974/budgets/dbe64eb2-50cd-43e2-b3c2-b2145227b586?updateMask=displayName,budgetFilter,amount,thresholdRules,notificationsRule"
gcloud billing budgets describe <ta sama nazwa> --account <właściciel>   # odczyt kontrolny
```

Budżet to alarm, nie limit: Google nie zatrzymuje wydatków po jego przekroczeniu,
a dane kosztowe spływają z opóźnieniem kilku godzin. Dlatego warstwy 1, 3 i 4.

## 3. Bezpiecznik w aplikacji

Przepływ: budżet → Pub/Sub `cost-guard-budget` → `costGuardBudgetListener`
(us-central1, maxInstances 1, bez retry) → dokument `config/cost_guard`.

- **Pauza:** `costAmount / budgetAmount >= 0.9` (próg zmienialny polem
  `pauseAtRatio` w dokumencie, zakres 0-2) → `{paused: true, reason:
  "budget-threshold", costAmount, budgetAmount, currencyCode, ratio,
  budgetPeriod, at, changedBy: "budget"}`. Komunikat „tylko prognoza” nie
  pauzuje: liczy się koszt rzeczywisty.
- **Mail:** jeden na okres budżetu (`alertEmailPeriod`), przez SES na
  `contact@strengthsave.app` i `g.jasionowicz@gmail.com` (od 2026-09-30). Rezerwacja w transakcji przed wysyłką; padnięta
  wysyłka zwalnia rezerwację, więc kolejny komunikat ponawia mail.
- **Wznowienie automatyczne:** nowy okres budżetu (`costIntervalStart`) albo
  koszt spadł pod próg w tym samym okresie (korekta, kredyt). Dotyczy tylko
  pauzy z budżetu.
- **Ręcznie:** karta „Bezpiecznik kosztów” na górze panelu admina (baner, gdy
  paused; przełącznik „Zadania niekrytyczne aktywne”) → callable
  `adminSetCostGuard` (rola admin, walidacja, wpis `admin_audit_log` w tej samej
  transakcji). Ręczne wznowienie trzyma do końca bieżącego okresu (budżet nie
  pauzuje ponownie). Ręcznej pauzy system nigdy nie zdejmuje sam.
- **Błędy:** uszkodzony komunikat = log `cost_guard_invalid_budget_message`,
  zero zmian. Błąd odczytu flagi w zadaniu = fail-open (zadanie rusza). Błąd
  odczytu w panelu = komunikat + przycisk „Wznów zadania niekrytyczne”.
- **Reguły:** `config/cost_guard` czyta tylko admin, zapis wyłącznie Admin SDK.

Klasyfikacja zadań `onSchedule` (kontrakt: `functions/src/cost-guard-contract.test.ts`,
każde zadanie jest owinięte `withCostGuard` albo jest na liście `COST_GUARD_EXEMPT`):

| Zadanie | Harmonogram | Przy pauzie | Dlaczego |
|---|---|---|---|
| `resumeDeletionOperations` | co 60 min | działa | RODO: usuwanie kont w terminie |
| `cleanupExpiredSesEvents` | co 60 min | działa | retencja 180 dni z polityki prywatności |
| `cleanupStaleBugReports` | co 15 min | działa | retencja 180 dni zgłoszeń ze zrzutami + odzysk zgłoszeń |
| `dailyCostDigest` | 06:10 | działa | pomiar kosztów, bez niego incydent jest ślepy |
| `dailyErrorDigest` | 06:20 | działa | alarm błędów produkcji (zasada 11), max 2000 odczytów |
| `weeklyDigest` | co godz. nd/pn | wstrzymane | mail tygodniowy |
| `weeklySubscriptionDigest` | pn 08:00 | wstrzymane | mail do właściciela z liczbami RC (1 zapytanie RC + 1 kwerenda znaczników); alerty o zakupach idą z webhooka niezależnie |
| `dailyTrainingReminder` | co godz. | wstrzymane | przypomnienie push |
| `reducedModeEndingPush` | 18:00 | wstrzymane | push; dzień pauzy = ten push przepada |
| `vacationEndingPush` | 18:10 | wstrzymane | push; dzień pauzy = ten push przepada |
| `photoReminder` | 10:00 | wstrzymane | jednorazowy push, nadrobi się po wznowieniu |
| `activityRollup` | 03:30 | wstrzymane | statystyki admina; dni pauzy bez rollupu |
| `stravaScheduledSync` | 10:00 | wstrzymane | sync zewnętrzny; ręczny sync w apce działa |
| `reconcilePendingSesEvents` | co 15 min | wstrzymane | liczniki email_log; zaległe zdarzenia zostają i nadrabiają się po wznowieniu |

Bezpiecznik nie dotyka callable ani triggerów: zapis treningów, logowanie,
płatności i usuwanie kont działają zawsze.

## 4. Alerty anomalii (Cloud Monitoring)

Kanał: istniejący `notificationChannels/14133494776147715887` (e-mail
`contact@strengthsave.app` + kanał `g.jasionowicz@gmail.com` 17110596458526275707 od 2026-09-30; oba kanały także na budżecie). Baseline z metryk 2026-08-31..2026-09-30
(Monitoring API `timeSeries`, `ALIGN_SUM` w oknach 3600 s, suma po seriach;
instancje: `ALIGN_MAX` 300 s per usługa).

| Polityka (ID) | Metryka | Baseline 30 dni | Próg |
|---|---|---|---|
| Firestore reads per hour (`4773575916003304099`) | `document/read_count` | mediana 40, p95 454, p99 900, max 2028 | > 5000 / h |
| Firestore writes and deletes per hour (`1012794078284974758`) | `write_count`, `delete_count` | zapisy: mediana 3, p99 40, max 78; usunięcia max 37 | > 500 / h każde |
| Cloud Functions invocations and instances (`8967140309089208583`) | `run.googleapis.com/request_count`; `container/instance_count` per usługa | wywołania: mediana 11, p99 41, max 59; instancje max 5 | > 600 / h; > 8 instancji przez 5 min |
| Storage egress per hour (`14740643300804438383`) | `storage/network/sent_bytes_count`, bucket domyślny | mediana 1,0 MB, p99 2,8 MB, max 3,4 MB | > 1 GiB / h |

Próg transferu jest świadomie wyżej niż 10× baseline: baseline sprzed
pierwszej publikacji OTA, a jedno wydanie OTA to kilka MB na urządzenie.
1 GiB/h = ok. 200+ pobrań paczki w godzinę albo pętla pobierania.

Wcześniejsze polityki (bez zmian, eksport w `infra/monitoring/existing-*.json`):
„Firestore daily reads” (> 30 000 / dobę) i „production runtime errors”
(log-based metric `strengthsave_runtime_error_count`, oba realnie aktywne).

Zmiana progu: edycja pliku, potem
`gcloud monitoring policies update projects/fittracker-workouts/alertPolicies/<ID> --policy-from-file=infra/monitoring/<plik>.json --account <właściciel>`.

## 5. Konto tylko do odczytu dla agentów

`agent-readonly@fittracker-workouts.iam.gserviceaccount.com`, role:
`roles/datastore.viewer`, `roles/logging.viewer`, `roles/monitoring.viewer`,
`roles/firebaseauth.viewer` (istnieje; daje `firebaseauth.users.get`, czyli
lookup konta po e-mailu). **Zero kluczy JSON.** Dostęp przez impersonację:
właściciel ma `roles/iam.serviceAccountTokenCreator` na tym SA.

Weryfikacja 2026-09-30: odczyt `config/feature_flags` HTTP 200; zapis
`agent_readonly_probe/write-test` → 403 PERMISSION_DENIED (dokument nie
powstał, odczyt 404); Monitoring: odczyt 200, próba usunięcia polityki 403.

Helper `scripts/prod-read.mjs` (helpery i testy: `scripts/prod-read-helpers.mjs`,
`src/test/prod-read.test.ts`):

```bash
export STRENGTH_SAVE_GCLOUD_ACCOUNT=g.jasionowicz@gmail.com   # aktywne konto gcloud (grzegorzee@gmail.com) nie ma roli TokenCreator na agent-readonly
node scripts/prod-read.mjs get users/<uid>
node scripts/prod-read.mjs query client_errors --where 'createdAt >= 1727000000000' --order-by createdAt:desc --limit 50
node scripts/prod-read.mjs count workouts --where 'userId == "<uid>"'
node scripts/prod-read.mjs auth-lookup <email>
node scripts/prod-read.mjs logs 'resource.type="cloud_run_revision" AND severity>=ERROR' --hours 6 --limit 50
```

- Twardy limit `--max-docs` (domyślnie 5000) na uruchomienie; zapytanie
  dostaje `limit` = to, co zostało, więc skrypt nigdy nie przeczyta ponad
  sufit. Dojście do sufitu = przerwanie z kodem 3.
- Podsumowanie odczytów na stderr, log każdego wywołania w
  `tmp/prod-read/queries.log` (poza gitem; e-mail z `auth-lookup` zamaskowany).
- Biała lista żądań: tylko GET dokumentów, `runQuery`, `runAggregationQuery`,
  `accounts:lookup`, `entries:list`. Wszystko inne rzuca przed wysłaniem.
  Drugi zamek: samo konto nie ma uprawnień zapisu.

## Czego te zabezpieczenia NIE robią

- Nie zatrzymują wydatków twardo: budżet działa z opóźnieniem danych
  kosztowych (godziny), bezpiecznik wstrzymuje tylko zadania cykliczne.
  Koszt generowany przez ruch userów (callable, odczyty klienta) ograniczają
  wyłącznie limity instancji i alerty.
- Limit instancji nie ogranicza odczytów Firestore z klienta (reguły + alert).
- Transfer OTA idzie z bucketu bez limitu; jedyne hamulce to alert i rollback kanału.
