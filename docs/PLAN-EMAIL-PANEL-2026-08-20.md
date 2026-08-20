# PLAN G — panel maili w adminie + zdarzenia SES + szablony (2026-08-20)

> Zlecenie właściciela: "chcę widzieć kto i do kogo wysyła te maile,
> dostarczalność, otwieralność, czy trafiają do spamu — wszystko co da się
> odczytać w AWS niech wyświetla się w naszym panelu admina" + porządne
> szablony maili (pojedynczy trening i zbiór wszystkich).
> Tracker pętli agenta. TDD: RED test → implementacja → GREEN → bramki →
> commit stage-per-plik → odhaczenie z dowodem.

## Kontekst zastany (nie odkrywać od nowa)

- Transport maili: `functions/src/index.ts` (sekcja F-T3 na końcu pliku):
  `sendWorkoutEmail` = SES (SESv2, sekrety SES_*) z fallbackiem `sendViaResend`;
  callables `emailWorkoutSummary` / `emailWorkoutHistory`; czysta logika i HTML
  w `functions/src/email-workout.ts` (testy `email-workout.test.ts`, 11 szt.).
- SES: region `eu-central-1`, tożsamość DOMAIN `strengthsave.app` (DKIM SUCCESS),
  DOMYŚLNY configuration set `strengthsave` przypisany do tożsamości, user IAM
  `strengthsave-ses-sender` (wysyłka only). Konfigurację AWS robi profil default
  z `~/.aws/credentials` (admin) przez `aws` CLI. SES_FROM =
  "Strength Save <noreply@strengthsave.app>".
- Panel admina: `src/pages/admin/AdminDashboard.tsx` (+ AdminUserDetail),
  trasa `/admin` za `AdminRoute`; wzorce odczytu podpatrzeć w istniejących
  sekcjach panelu (telemetria/klienci). Rules: `firestore.rules` (isAdmin).
- Rate limit wysyłek: `email_quota/{uid}` (transakcja w index.ts).

## G-T1 — rejestr wysyłek `email_log`

- [x] Przy KAŻDEJ wysyłce (obie callables) zapis dokumentu
  `email_log/{autoId}`: `{ uid, to, type: 'workout'|'history', workoutId?,
  subject, transport: 'ses'|'resend', sesMessageId? (z SendEmailCommand
  response.MessageId), status: 'sent', sentAt (ISO), lang }`.
  SES MessageId jest klucz korelacji ze zdarzeniami — sendWorkoutEmail musi
  ZWRACAĆ metadane transportu (refaktor sygnatury; fallback Resend też loguje,
  bez sesMessageId).
  DOWÓD: commit 42018e25 (SendEmailResult + logEmailSafe w email-workout.ts,
  logEmail → db.collection('email_log').add w index.ts).
- [x] Rules: `email_log` i `email_events` — read tylko admin
  (`isAdmin`), create/update/delete: false (pisze wyłącznie Admin SDK).
  Wzorzec: inne kolekcje adminowe w firestore.rules. `npm run test:rules`
  (JDK21: JAVA_HOME=/opt/homebrew/opt/openjdk@21/libexec/openjdk.jdk/Contents/Home)
  z nowymi przypadkami.
  DOWÓD: commit 42018e25, "Wszystkie 225 testów reguł przeszło" (7 nowych G-T1).
- [x] Testy unit (deps-injection jak dotąd): wysyłka SES loguje z messageId,
  fallback Resend loguje transport=resend, błąd totalny NIE loguje 'sent'
  (loguje status 'failed' z error message — panel ma widzieć nieudane).
  DOWÓD: commit 42018e25, vitest email-workout.test.ts "Tests 17 passed (17)"
  (RED przed implementacją: 4 failed).

## G-T2 — pipeline zdarzeń SES → Firestore

- [x] AWS (aws CLI, profil default, region eu-central-1, tag Project=strengthsave):
  1. SNS topic `strengthsave-ses-events`.
  2. `aws sesv2 put-configuration-set-event-destination` na config secie
     `strengthsave`: destination SNS z topikiem, matching event types:
     SEND, DELIVERY, BOUNCE, COMPLAINT, OPEN, CLICK, REJECT, DELIVERY_DELAY,
     RENDERING_FAILURE. (OPEN/CLICK włączają pixel/link tracking — to daje
     otwieralność.)
  DOWÓD: topic utworzony + polityka pozwalająca ses.amazonaws.com publikować
  (warunki SourceAccount/SourceArn config setu); event destination
  `strengthsave-sns-events` Enabled z 9 typami (get-...-event-destinations OK).
  OGRANICZENIE: user IAM ad-system-admin nie ma SNS:TagResource — topic bez
  tagu Project (reszta zasobów otagowana).
- [x] Functions: `sesEventsWebhook` (onRequest, region us-central1 jak reszta):
  - obsługa SNS `SubscriptionConfirmation` (fetch SubscribeURL — auto-confirm),
  - WALIDACJA podpisu SNS (pakiet `sns-validator` albo równoważna weryfikacja
    SigningCertURL z domeny sns.<region>.amazonaws.com + podpis SHA1withRSA;
    odrzucać wszystko spoza naszego TopicArn),
  - `Notification`: parse wiadomości SES eventu; idempotentny zapis
    `email_events/{messageId}-{eventType}-{timestampMs}` z
    `{ messageId, eventType, timestamp, to, subject?, bounceType?,
    complaintFeedbackType?, ipAddress?, userAgent?, link? }`,
  - aktualizacja `email_log` po `sesMessageId`: DELIVERY → status 'delivered'
    + deliveredAt; BOUNCE → 'bounced' + bounceType; COMPLAINT → 'complaint'
    (to jest sygnał spamu!); OPEN → openedAt (pierwsze) + openCount++;
    CLICK → clickedAt/clickCount; REJECT/RENDERING_FAILURE → 'failed'.
  - Czysta logika parsowania/mapowania w osobnym module
    `functions/src/ses-events.ts` + testy na wszystkie typy eventów
    (fixtures z realnego formatu SES event publishing).
  DOWÓD: commit 0cfee330 — ses-events.ts (parseSnsEnvelope, mapSesEvent,
  applyLogUpdate z niezmiennikiem "zdarzenia nie cofają mocniejszych
  statusów"), 20 testów GREEN (vitest functions 264 passed), webhook z
  sns-validator + sekret SES_SNS_TOPIC_ARN (pełny ARN poza publicznym repo).
- [x] Deploy funkcji, potem `aws sns subscribe --protocol https --notification-endpoint <URL webhooka>`
  i sprawdzenie w logach potwierdzenia subskrypcji (status Confirmed:
  `aws sns list-subscriptions-by-topic`).
  DOWÓD: sesEventsWebhook(us-central1) wdrożony
  (https://us-central1-fittracker-workouts.cloudfunctions.net/sesEventsWebhook);
  list-subscriptions-by-topic zwraca pełny SubscriptionArn (nie pending);
  log funkcji: "[SesEvents] SubscriptionConfirmation potwierdzone (HTTP 200)".
- [x] TEST END-TO-END realny: wyślij przez SES (klucz z
  `~/FIRMA/_secrets/projekty/strengthsave-ses.env`, NIE wypisywać sekretów)
  jednego maila testowego na g.jasionowicz@gmail.com i potwierdź, że w
  `email_events` pojawiły się SEND + DELIVERY, a `email_log` (wpis utworzony
  ręcznie w teście albo przez wysyłkę funkcją) dostał status 'delivered'.
  DOWÓD: MessageId 010701a01e955262-6eb8fd62-29ff-4b32-8586-d939f22ed9ea-000000;
  email_events: Send 09:51:37.570Z + Delivery 09:51:38.299Z + Open 09:51:39.430Z;
  email_log O3CC78xy7KG60QeLnvxb: status=delivered, deliveredAt, openedAt,
  openCount=1 (pixel trackingu działa od razu).

## G-T3 — szablony maili w stylu marki

- [x] Nowy szablon HTML (mail = jasne tło #f6f7f9, karta biała, akcent limonka
  #cefc22 TYLKO jako akcenty przy ciemnym tekście — kontrast; logo tekstowe
  "STRENGTH SAVE"): pojedynczy trening = nagłówek (data, dzień, focus),
  kafle hero (tonaż, czas, serie, ćwiczenia), tabela ćwiczeń z seriami
  (kg × powt., status zrobiona/pominięta/rozgrzewkowa), notatka dnia, notatki
  i RPE/ból per ćwiczenie, ocena sesji, stopka "Wysłane ze Strength Save na
  prośbę właściciela konta".
- [x] Historia: nagłówek zbiorczy (zakres dat, liczba treningów, suma tonażu,
  łączny czas) + kompaktowe sekcje per trening (ten sam moduł sekcji).
- [x] Wszystko w `email-workout.ts` jako czyste funkcje; ISTNIEJĄCE kontrakty
  testów zostają prawdziwe (serie, notatki, RPE, ból, ocena, tonaż, czas,
  escapowanie) + nowe asercje na strukturę szablonu (inline CSS, max szerokość
  640, brak zewnętrznych zasobów poza ew. logo — najlepiej zero obrazków,
  żeby nie psuć dostarczalności). PL/EN przez `Lang` jak dotąd.
- [x] Table-based layout + inline style (klienci pocztowi nie znają flexboxa).
- [x] STYL TREŚCI (wymóg właściciela, twardy): ZERO emoji (repo ma
  check:no-emoji — dotyczy też stringów szablonu), zero AI-slopu: żadnych
  wykrzykników, "Świetna robota!", "Twoja podróż", pustych fraz motywacyjnych
  i przegadanych wstępów. Mail to rzeczowy raport z danych treningu: liczby,
  serie, notatki. Test: HTML nie zawiera emoji ani wykrzykników w copy
  (poza treścią wpisaną przez usera w notatkach).
  DOWÓD G-T3 (cała sekcja): commit 541fa38b — nowa rama (tabele + inline CSS,
  #f6f7f9/karta biała/#cefc22 tylko akcent, max-width:640px, zero obrazków
  i zewnętrznych zasobów), kafle hero, nagłówek zbiorczy historii; +6 testów
  struktury (23/23 GREEN, stare kontrakty treści nietknięte), check:no-emoji
  OK (176 plików), test "zero wykrzykników" pilnuje copy PL i EN.
  Wizualny podgląd wysłany na g.jasionowicz@gmail.com nowym szablonem:
  pojedynczy MessageId 010701a01e9a08cb-19351195-d20d-471f-925e-14a11d2974e9-000000,
  historia MessageId 010701a01e9a0981-1ae413a7-46d0-444e-96e4-3ca170a3aea0-000000.

## G-T4 — panel "Maile" w adminie

- [x] Nowa sekcja/zakładka w panelu admina (`/admin`): lista ostatnich wysyłek
  (limit 100, sortowanie sentAt desc): kto (uid + email usera jeśli w logu),
  do kogo, typ (trening/historia), temat, transport, status z kolorem
  (sent szary / delivered zielony / opened limonka / bounced czerwony /
  complaint=SPAM czerwony / failed czerwony), czasy (wysłany, dostarczony,
  otwarty), licznik otwarć.
- [x] Kafle zbiorcze u góry (7 i 30 dni): wysłane, dostarczalność %,
  otwieralność %, bounce %, skargi spamowe (liczba). Liczone z email_log
  po stronie klienta (limit zapytania) albo prostym agregatem — wybrać
  prostsze, zaznaczyć ograniczenie w UI ("ostatnie N wysyłek").
- [x] Stany: pusto ("brak wysyłek"), błąd odczytu z wyjściem. Bez łamania
  istniejących sekcji panelu (niezmiennik: stare zakładki działają — test).
- [x] i18n do OBU locales (pl.ts/en.ts). E2e panelu (mock danych jak inne
  admin e2e — podpatrzeć istniejące specy adminowe).
  DOWÓD G-T4 (cała sekcja): commit a748b7ba — AdminEmailsCard (lista 100,
  sentAt desc, statusy z kolorami wg zasady tło/10) + czysta logika
  admin-email-stats (8 testów) + RTL 5 testów (pusty stan, błąd z retry,
  wiersze, SPAM/failed, kafle) + e2e admin-emails.spec (pusty stan przy
  zablokowanym Firestore; SDK zwraca pusty snapshot z cache zamiast rzucać,
  stan błędu pokrywa RTL) + admin-switch 3/3 zielone (niezmiennik);
  vitest 13/13, typecheck, lint, check:no-emoji OK; 27 kluczy
  admin.emails.* w obu locales.

## G-RELEASE — wydanie

- [x] Bramki repo: vitest (web + functions), typecheck, lint, build,
  bundle-budget, dist-smoke (build:mobile), dist-offline (build WEB!),
  no-emoji, test:rules; pełne e2e po świeżym vite
  (pkill -f vite + python3 shutil.rmtree node_modules/.vite).
  DOWÓD: vitest web 1819/1819 (244 pliki; po fixie a86b7904+dd7dc418 —
  test logiki przeniesiony do src/test, guard i18n skanuje src/lib),
  functions 270 passed / 7 skipped; typecheck OK, lint 0 błędów,
  build OK, bundle-budget PASS (initial 1314315 B), dist-offline PASS,
  build:mobile + dist-smoke PASS, no-emoji OK (177), rules 225/225,
  pełne e2e 404/404 (5.4 min) po pkill vite + rmtree .vite.
- [x] Deploy KOLEJNOŚĆ: firestore rules → functions (tylko dotknięte:
  emailWorkoutSummary, emailWorkoutHistory, sesEventsWebhook) → web
  (npm run deploy) + weryfikacja: git fetch origin gh-pages + git grep
  markera sekcji maili na origin/gh-pages -- assets + curl live hash.
  DOWÓD: rules Deploy complete → functions:list pokazuje wszystkie 3
  zaktualizowane → web: marker "Lista i statystyki z ostatnich" w
  origin/gh-pages:assets/index-080nD_E1.js, curl live zwraca
  index-080nD_E1.js. Przed deployem git pull --rebase (Already up to date).
- [x] BEZ bumpu iOS/Android w tym planie: szablony są server-side (mobilki
  dostają nowe maile bez update'u), panel admina używany przez web;
  zaznaczyć w raporcie, że zakładka Maile wejdzie do mobilnych bundli przy
  następnym wydaniu mobilnym.
  DOWÓD: żaden plik wersji iOS/Android nie tknięty (git log --name-status
  commitów G bez project.pbxproj/build.gradle/package.json version).
- [x] DECYZJE.md wpis (co, root cause'y, weryfikacja), odhaczenie wszystkich
  tasków tutaj Z DOWODAMI (commity, wyniki bramek, messageId testu e2e),
  aktualizacja pamięci projektu.
  DOWÓD: wpis "G-RELEASE" na górze DECYZJE.md, pamięć projektu
  zaktualizowana (project_audyt_2026_08_19_watch.md + MEMORY.md).

## Twarde zasady (bez wyjątków)

- Dane realnych userów święte: ŻADNYCH wysyłek do adresów innych niż
  g.jasionowicz@gmail.com; żadnych zapisów na realnych kontach userów.
- Sekretów NIE wypisywać do outputu (klucze czytać do zmiennych/plikami).
- Wersje marketingowe 1.0.0; w tym planie zero bumpów mobilnych.
- Stage-per-plik (nigdy `git add -A`, bez wyciszania stderr),
  `git show HEAD --name-status` przed każdym pushem; push po każdym tasku.
- Pułapki warsztatu: rtk psuje `npx` (używać `node node_modules/.bin/<tool>`
  i pełnej ścieżki `firebase`); `aws` CLI przez `rtk proxy aws ...` gdy
  potrzebny czysty JSON; vitest czytelnie: `rtk proxy npx vitest run ... |
  rtk proxy grep -E "Tests "`; masowe faile e2e = najpierw świeży vite;
  nowe klucze i18n do OBU locales; nowe pole w users = sprawdzić mapper.
- Nie ruszać: wysyłki digestów (weekly-digest/Resend), istniejących sekcji
  panelu, transportu poza refaktorem sygnatury z G-T1.
