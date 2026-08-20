# Plan obszaru: admin

## Obszar
Panel admina: rejestr maili wychodzących z podglądem treści (T21) + audyt monitoringu, akcji per user i spójności (T22)

## Stan istniejący
DUŻO JUŻ ISTNIEJE. (1) Kolekcja `email_log` (firestore.rules linie 421-424: read tylko isAdmin, write false) zapisywana WYŁĄCZNIE przez callables emailWorkoutSummary/emailWorkoutHistory (functions/src/index.ts:1321-1323, logEmailSafe w functions/src/email-workout.ts:469-492). Wpis ma metadane (uid, to, type workout|history, subject, transport ses|resend, sesMessageId, status, error, sentAt, lang) ale NIE MA TREŚCI HTML — html jest budowany w runEmailWorkout/runEmailHistory (linie 515, 575) i przekazywany tylko do sendEmail. (2) Webhook sesEventsWebhook (index.ts:1381) aktualizuje email_log o deliveredAt/openedAt/bounce/complaint. (3) UI: src/pages/admin/AdminEmailsCard.tsx — lista 100 ostatnich wpisów + kafle dostarczalności 7/30 dni (logika w src/lib/admin-email-stats.ts, testy src/test/admin-emails-card.test.tsx i admin-email-stats.test.ts). BRAKI T21: (a) klik nie otwiera treści, bo treść nie jest nigdzie zapisywana; (b) maile z registration.ts (welcome_email, verification_code, admin_message [adminSendUserEmail], admin_broadcast, invite_email, access_changed, self_deletion_notice — wysyłka przez wspólny sendEmail registration.ts:274-306) trafiają tylko do `notification_logs`, które ma rules read:false — panel ich NIE widzi; (c) weekly-digest.ts (linia ~192) nie loguje wysyłek NIGDZIE poza logger.info; (d) etykieta typu w AdminEmailsCard to binarny ternary history/workout (linia 146) — inne typy pokażą się źle. T22 — panel już ma: puls (9 kafli), telemetrię zdrowia, client_errors, ApiKeysCard, zaproszenia/waitlistę/audyt auth, AdminAuditLog (akcje adminów), AdminConsentsLog+CSV, AdminEmailsCard, UsersActivityTable z akcjami per user (access, features, suspend, sendEmail, resendCode, resetOnboarding, cohorts, delete), AdminUserDetail (/admin/users/:userId — profil, telemetria 30 dni, plan, 10 błędów klienta, naprawy dry-run: mergeCycles/repairHistory/dedupeWorkouts/resetOnboarding, AdminSubscriptionCard grant/revoke PRO), AdminCommsCard (broadcast), AdminFeatureFlagsCard. Braki T22: brak widoku maili per user w AdminUserDetail, brak filtrów w AdminEmailsCard, client_errors nie linkuje do szczegółu usera, niespójne CardTitle (część kart ma font-heading uppercase, karty telemetrii/błędów/audytu auth mają goły text-base). Guard i18n: src/test/admin-i18n-scan.test.ts wymusza zero polskich literałów w src/pages/admin.

## Zadania

### T21a: Zapis treści maila do podkolekcji email_log/{id}/content/body (workout+history) (effort: S)
**Pliki:** functions/src/email-workout.ts, functions/src/index.ts, firestore.rules, functions/src/email-workout.test.ts, scripts/test-firestore-rules.mjs

**Podejście:**
1) W functions/src/email-workout.ts rozszerzyć kontrakt deps: `logEmail(entry: EmailLogEntry, html?: string)`. W runEmailWorkout (l.515) i runEmailHistory (l.575) html już jest liczony w linii wywołania sendEmail — wyciągnąć do zmiennej `const html = build...` i przekazać do logEmailSafe → deps.logEmail(entry, html). 2) W index.ts buildEmailWorkoutDeps.logEmail: `const ref = await db.collection('email_log').add(entry); if (html) await ref.collection('content').doc('body').set({ html: html.slice(0, 900000), truncated: html.length > 900000 })` — zapis content w osobnym try/catch (awaria treści nie unieważnia wpisu rejestru, zgodnie z istniejącym komentarzem G-T1). 3) firestore.rules: nowy match `/email_log/{logId}/content/{docId} { allow read: if request.auth != null && isAdmin(); allow write: if false; }` obok istniejącego bloku (l.421-424). 4) Treść w podkolekcji, NIE w dokumencie wpisu — getDocs listy 100 wpisów w panelu musi zostać lekkie (web SDK nie ma projekcji pól).

**Testy:**
functions/src/email-workout.test.ts (describe 'email_log (G-T1)', l.158+): dodać asercję że logEmail dostał drugi argument z html zawierającym nazwę ćwiczenia; istniejące asercje mock.calls[0][0] przechodzą bez zmian. scripts/test-firestore-rules.mjs (seed email_log l.530): dodać seed content/body + przypadki admin-read-ok / user-read-denied / write-denied. Uruchomienie: npm test w functions/ + npm run test:rules (JDK21).

**Ryzyka:**
Zasada 5: EmailLogEntry bez zmian kształtu — stare wpisy i panel dalej działają. Limit dokumentu Firestore 1 MB — stąd slice(900000). Awaria zapisu content nie może zabrać maila ani wpisu (osobny try/catch). NIE zmieniać semantyki logEmailSafe (log best-effort).

### T21b: Wszystkie maile systemu w email_log: registration.ts + weekly-digest.ts (effort: M)
**Pliki:** functions/src/email-log.ts (nowy, ~40 linii), functions/src/registration.ts, functions/src/weekly-digest.ts, functions/src/index.ts, functions/src/registration.integration.test.ts, functions/src/weekly-digest.test.ts

**Podejście:**
1) Nowy mały moduł functions/src/email-log.ts: `writeEmailLog(db, entry: {uid, to, type, subject, transport, status, error?, sentAt, lang?}, html?)` — jedno miejsce zapisu (add do email_log + content/body jak w T21a); index.ts buildEmailWorkoutDeps.logEmail przełączyć na ten helper (DRY, bez zmiany kontraktu). 2) registration.ts sendEmail (l.274-306): PO writeNotificationLog dopisać best-effort `writeEmailLog(getDb(), { uid: params.userId ?? 'system', to: params.to, type: params.type, subject: params.type === 'verification_code' ? '[verification code]' : params.subject, transport: 'resend', status: errorMessage ? 'failed' : 'sent', error: errorMessage ?? undefined, sentAt: nowIso() }, params.type === 'verification_code' ? undefined : params.html)` w try/catch. verification_code BEZ html i z zamaskowanym subject (subject zawiera kod — admin nie ma go widzieć w rejestrze; kody i tak żyją w email_verification_codes zahashowane). notification_logs zostaje NIETKNIĘTE. 3) weekly-digest.ts: do WeeklyDigestDeps dodać opcjonalny `logEmail?: (entry, html) => Promise<void>`; w processUser po deps.sendEmail wywołać deps.logEmail (type 'weekly_digest', status wg response.error) w try/catch; w budowie deps (l.~289) podpiąć writeEmailLog.

**Testy:**
registration.integration.test.ts (mock resend już jest, l.5-11; asercje notification_logs l.51): dodać asercje że email_log dostaje wpis przy welcome/verification (verification: subject '[verification code]', brak content). weekly-digest.test.ts (deps.sendEmail mock l.20): dodać logEmail do deps i asercję wywołania po udanej wysyłce oraz status failed przy response.error. Bramka: npm test + typecheck w functions/.

**Ryzyka:**
NAJWAŻNIEJSZE (zasada 5): zapis email_log w registration.ts MUSI być best-effort w try/catch — sendEmail rzuca HttpsError przy odrzuceniu przez Resend i ta semantyka (rejestracja, kody weryfikacyjne) nie może się zmienić ani o milimetr. Nie ruszać writeNotificationLog (system istniejący). Broadcast = N wpisów (1 per odbiorca) — akceptowalne przy obecnej skali (limit 25 testerów). uid może być null (invite, broadcast, self_deletion) → 'system' (EmailLogRow.uid jest wymagane w typie web).

### T21c: AdminEmailsCard: klik wiersza otwiera pełną treść maila + etykiety wszystkich typów (effort: M)
**Pliki:** src/pages/admin/AdminEmailsCard.tsx, src/lib/admin-email-stats.ts, src/i18n/locales/pl.ts, src/i18n/locales/en.ts, src/test/admin-emails-card.test.tsx

**Podejście:**
1) admin-email-stats.ts: dodać czystą funkcję `emailTypeLabelKey(type: string): TranslationKey | null` — mapa znanych typów (workout, history, weekly_digest, welcome_email, verification_code, admin_message, admin_broadcast, invite_email, access_changed, self_deletion_notice) → klucz i18n; null → UI pokazuje surowy string (fallback, stare/nieznane typy nic nie tracą). W AdminEmailsCard zastąpić ternary z l.146. 2) Podgląd: stan `preview: { row: EmailLogRow; html: string | null | 'loading' | 'unavailable' } | null`; wiersz dostaje przycisk/klik → `getDoc(doc(db, 'email_log', row.id, 'content', 'body'))`; istnieje → html, nie istnieje lub błąd → 'unavailable'. 3) Dialog (shadcn Dialog, wzorzec AlertDialog z AdminDashboard l.884): nagłówek = subject + to + data, treść = `<iframe sandbox="" srcDoc={html} className="h-[60vh] w-full rounded-lg border bg-white" title={...}>` — iframe z pustym sandbox izoluje style maila od panelu i nie wykonuje skryptów; stan 'unavailable' → komunikat t('admin.emails.contentUnavailable') (każdy stan ma wyjście — stare wpisy sprzed T21a nie mają treści i to jest normalne). Dialog kontrolowany: zamykanie WYŁĄCZNIE przez onOpenChange → setPreview(null), nigdy przez warunkowy unmount (pułapka Radix z CLAUDE.md). 4) i18n do OBU plików: admin.emails.viewContent, admin.emails.contentUnavailable, admin.emails.contentTitle + klucze typów (admin.emails.typeWeeklyDigest, typeWelcome, typeVerification, typeAdminMessage, typeBroadcast, typeInvite, typeAccessChanged, typeSelfDeletion).

**Testy:**
src/test/admin-emails-card.test.tsx (istniejący, mock firebase/firestore l.8-14 — dorzucić doc/getDoc do mocka): (a) klik wiersza → getDoc wywołany, dialog z iframe (sprawdzić srcDoc przez title/atrybut); (b) getDoc zwraca exists()=false → 'Treść niedostępna...'; (c) WSZYSTKIE 5 istniejących testów przechodzi BEZ modyfikacji (niezmiennik listy i statystyk); (d) nowy typ 'weekly_digest' renderuje etykietę, nieznany typ renderuje surowy string. Guard admin-i18n-scan.test.ts pilnuje braku polskich literałów. Bramka: npm run test + typecheck + lint.

**Ryzyka:**
Zasada 5: lista, kafle 7/30 dni i retry działają identycznie — podgląd tylko DOKŁADA. i18n: klucz tylko w pl.ts = czerwony typecheck. jsdom nie renderuje iframe'a realnie — asercje na atrybutach, nie na zawartości. NIE używać dangerouslySetInnerHTML (style maila rozjadą panel, a broadcast body pochodzi z inputu admina).

### T22a: AdminUserDetail: karta 'Maile tego użytkownika' (email_log per uid) (effort: M)
**Pliki:** src/pages/admin/AdminUserDetail.tsx, firestore.indexes.json, src/i18n/locales/pl.ts, src/i18n/locales/en.ts, src/test/admin-email-stats.test.ts

**Podejście:**
1) firestore.indexes.json: composite index email_log(uid ASC, sentAt DESC) — bez niego query padnie failed-precondition (znana pułapka z lekcji J-T1/X13). Deploy indeksów przed webem. 2) W AdminUserDetail do istniejącego Promise.all (l.129-143) dodać `getDocs(query(collection(db,'email_log'), where('uid','==',userId), orderBy('sentAt','desc'), limit(20)))` — z osobnym catch, żeby błąd maili nie ubił całego widoku (obecny catch zeruje wszystko). 3) Nowa Card pod kartą błędów klienta: reuse emailDisplayStatus + STATUS_CLASSES — wyekstrahować STATUS_CLASSES i mały komponent wiersza EmailLogRowItem z AdminEmailsCard do współdzielenia (np. src/pages/admin/EmailLogRow.tsx) zamiast kopiować; podgląd treści reuse dialogu z T21c. Pusty stan: t('admin.emails.emptyForUser'). 4) Klucze i18n do obu locale.

**Testy:**
Logika czysta już pokryta (admin-email-stats.test.ts). Dodać test komponentu wiersza jeśli ekstrahowany (wzór admin-emails-card.test.tsx). Ręcznie: /admin/users/:uid pokazuje maile po wdrożeniu indeksu; user bez maili → pusty stan. Bramka: test + typecheck + lint.

**Ryzyka:**
INDEKS NAJPIERW: firebase deploy --only firestore:indexes i poczekać na build indeksu, dopiero potem web deploy — inaczej karta w prod od razu w stanie błędu. Osobny try/catch na query maili — nie zabrać istniejącemu widokowi telemetrii/planu/błędów (zasada 5). Ekstrakcja wiersza z AdminEmailsCard = zmiana chirurgiczna: przenieść 1:1, testy AdminEmailsCard muszą przejść bez zmian asercji.

### T22b: AdminEmailsCard: filtry client-side (status/typ/szukajka) (effort: S)
**Pliki:** src/pages/admin/AdminEmailsCard.tsx, src/lib/admin-email-stats.ts, src/i18n/locales/pl.ts, src/i18n/locales/en.ts, src/test/admin-email-stats.test.ts

**Podejście:**
Na 100 pobranych wierszach (bez nowych zapytań Firestore): 1) czysta funkcja `filterEmailRows(rows, { status?: EmailDisplayStatus | 'all', search: string })` w admin-email-stats.ts — search dopasowuje to/subject/uid/type (case-insensitive). 2) UI jak w sekcji userów AdminDashboard (l.849-856): rząd chipów statusów (wszystkie / wysłany / dostarczony / otwarty / odbity / SPAM / błąd — etykiety już istnieją jako admin.emails.status*) + Input szukajki. 3) WAŻNE: kafle statystyk 7/30 dni liczone ZAWSZE z pełnego `rows`, nie z przefiltrowanych (niezmiennik statystyk). Filtr działa tylko na listę.

**Testy:**
admin-email-stats.test.ts: filterEmailRows — filtr po statusie display (opened wygrywa z delivered jak w emailDisplayStatus), search po fragmencie adresu, pusty search = wszystko. Component test: chip 'bounced' zostawia tylko odbite, kafle statystyk niezmienione. Bramka standardowa.

**Ryzyka:**
Minimalne. Nie zmieniać zapytania Firestore ani EMAIL_LOG_LIMIT. Pusty wynik filtra potrzebuje komunikatu (reuse admin.emails.empty albo nowy klucz noMatches) — stan z wyjściem (chip 'wszystkie' zawsze widoczny).

### T22c: Spójność panelu: linki z client_errors do szczegółu usera + ujednolicone nagłówki kart (effort: S)
**Pliki:** src/pages/admin/AdminDashboard.tsx, src/pages/admin/AdminUserDetail.tsx

**Podejście:**
1) W karcie clientErrors AdminDashboard (l.685-700) userId.slice(0,8) zamienić na Link (react-router, już importowany przez navigate) do `/admin/users/${entry.userId}` — najczęstszy przepływ debugowania: błąd → profil usera z akcjami i naprawami, jednym klikiem. To samo w kaflach pulsu NIE ruszać (agregaty). 2) Kosmetyka nagłówków: CardTitle kart 'healthTelemetry' (l.654), 'clientErrors' (l.681), invite/waitlist/auditAuth (l.711, 766, 802) dostają ten sam zestaw klas co Puls i AdminEmailsCard: `text-base font-heading font-bold uppercase tracking-tight` — czysto klasowa zmiana, zero logiki. NIC więcej: akcje per user są już kompletne (access, suspend, features, mail, resend code, reset onboarding, cohorts, delete, naprawy dry-run, grant/revoke PRO) — nie dokładać nowych callables.

**Testy:**
Brak nowych testów jednostkowych (zmiana klas + Link). admin-i18n-scan.test.ts i istniejące testy panelu muszą przejść. Ręcznie: klik userId w błędach klienta trafia do AdminUserDetail; przegląd panelu — wszystkie nagłówki w jednym stylu. Bramka: test + typecheck + lint + build.

**Ryzyka:**
Karpathy surgical: zmiana klas TYLKO na nagłówkach kart panelu admina, nie 'przy okazji' w innych ekranach. Link zamiast span nie może zmienić layoutu wiersza błędu (zachować font-mono/break-all). userId w client_errors może nie mieć doca usera (konto usunięte) — AdminUserDetail już obsługuje user=null, więc link jest bezpieczny.

## Notatki
Kolejność wdrożenia: T21a → T21b → T21c → T22a → T22b → T22c (treść musi być zapisywana zanim UI ją pokaże; indeks przed kartą per user). Deploy: functions PRZED webem (klienci nie mogą wołać podglądu treści zanim rules i zapis wejdą), rules i indeksy razem z functions. Świadome decyzje do potwierdzenia z właścicielem: (1) verification_code w rejestrze BEZ treści i z zamaskowanym subject (subject zawiera kod logowania — bezpieczeństwo > kompletność podglądu); (2) notification_logs zostaje jako drugi, wewnętrzny log registration.ts (nie migrujemy, nie kasujemy — zero ryzyka dla istniejących przepływów); (3) wpisy email_log sprzed wdrożenia nie mają treści — dialog pokazuje 'treść niedostępna', to nie bug. Statystyki dostarczalności 7/30 dni po T21b obejmą też maile registration/digest (transport resend, bez sesMessageId — brak deliveredAt/openedAt, więc delikatnie zaniżą 'Dostarczalność'); jeśli to zaburzy odczyt kafli, licznik można ograniczyć do transport==='ses', ale minimalnie zostawiamy jak jest i obserwujemy. Wszystkie zadania są rozszerzeniami istniejących plików, żadnej przebudowy; największy nowy plik to helper writeEmailLog (~40 linii) i ewentualna ekstrakcja wiersza EmailLogRow do współdzielenia między AdminEmailsCard a AdminUserDetail.
