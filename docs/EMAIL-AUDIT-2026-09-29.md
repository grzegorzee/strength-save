# Audyt maili Strength Save (2026-09-29)

Zakres: wygląd szablonów, dostarczalność (DNS, SES, nagłówki), treść. Odczyty
produkcyjne wyłącznie read-only (`dig` na 1.1.1.1, `aws sesv2 get-*`, `aws iam get-*`,
CloudWatch, Firestore REST przez konto właściciela). Zero wysyłek, zero zmian DNS i SES.

Stan kodu: main `7d190c59` + commity tej fali (lista na końcu).

## 1. Inwentarz

Transport: jeden, Amazon SES v2 (`functions/src/ses-email.ts`), region z sekretu
`SES_REGION` = eu-central-1 (identity istnieje tylko tam; w us-east-1 `NotFoundException`),
configuration set `strengthsave`, From z sekretu `SES_FROM` =
`Strength Save <noreply@strengthsave.app>` (wg DECYZJE 2026-08-20; sekret nieczytelny
z konta `grzegorzee@`, IAM `ses-send-only` pozwala wyłącznie na ten From).
Przed tą falą: brak Reply-To, brak dodatkowych nagłówków, text/plain generowany
automatycznie z HTML (gubił adresy linków).

| Mail | Gdzie | Do | Temat PL / EN | Kiedy |
|---|---|---|---|---|
| Kod weryfikacyjny | `registration.ts` (`verificationEmailHtml`) | user | `Kod weryfikacyjny Strength Save: 123456` / `Strength Save verification code: 123456` | rejestracja email+hasło, ponowne wysłanie, admin „resend” |
| Powitanie | `registration.ts` (`maybeSendWelcomeEmail`) | user | `Strength Save: konto gotowe` / `...: account ready` | pierwsza aktywacja konta |
| Reset hasła | `password-reset.ts` (callable `requestPasswordReset`) | user | `Strength Save: ustaw nowe hasło` / `...: set a new password` | „Nie pamiętam hasła” |
| Zaproszenie | `registration.ts` (admin `createInvite`) | adres z zaproszenia | `Zaproszenie do Strength Save` / `Your Strength Save invite` | admin |
| Zmiana dostępu | `registration.ts` (admin) | user | `Strength Save: zmiana dostępu do konta` / `...: account access change` | admin włącza/wyłącza konto |
| Wiadomość admina / broadcast | `registration.ts` (`adminSendUserEmail`, `adminBroadcastEmail`) | user / wszyscy lub cohorta | temat wpisany przez admina | ręcznie z panelu |
| Digest tygodniowy | `weekly-digest.ts` + `weekly-digest-html.ts` | user | patrz sekcja 4 | poniedziałek 08:00 lokalnie, opt-out `notificationPrefs.weeklyDigest` |
| Trening do trenera | `email-workout.ts` (callable w `index.ts`) | adres podany przez usera | `Strength Save: trening Jan, czwartek 24.09.2026` | na żądanie, limit 10/dzień |
| Historia do trenera | jw. | jw. | `Strength Save: treningi Jan, 22.09.2026 do 24.09.2026` | jw. |
| Zgłoszenie błędu | `bug-reports.ts` | contact@ (wewn.) | `[Strength Save] Nowe zgłoszenie błędu: <kat>` | zgłoszenie z apki (ma własny text/plain) |
| Alert client_errors | `error-digest.ts` | contact@ (wewn.) | `[Strength Save] client_errors: N alert(y), top: ...` | cron dzienny |
| Usunięcie konta | `registration.ts` (`selfDeletionNotice*`) | contact@ (wewn.) | `Strength Save: użytkownik X usunął konto` | user usuwa konto |
| Szablony Firebase Auth | konsola Firebase | - | - | **nieużywane przez apkę**: w `src/` nie ma `sendPasswordResetEmail`/`sendEmailVerification`; edycja zablokowana przez Google (`EMAIL_TEMPLATE_UPDATE_NOT_ALLOWED`, docs/INSTRUKCJA-MAILE-AUTH-DOMENA.md) |

Rejestr `email_log` (39 wpisów od 2026-08-20, stan 2026-09-29): workout 13 delivered,
weekly_digest 9 delivered + 2 sent, welcome_email 3 delivered + 1 sent + **6 bounced**,
password_reset 2, bug_report 1, admin_message 1, history 1. Wszystkie 6 odbić to adresy
testowe (4x `@example.com`, 1x Google Play test lab `@cloudtestlabaccounts.com`, 1x
`@strengthsave.app` z 13.09, przed uruchomieniem skrzynek 16.09), typ `Transient`.
Reputacja SES (CloudWatch 15-28.09): bounce rate 0, complaint rate 0. Konto
`EnforcementStatus: HEALTHY`, production access, 50 000/24 h, suppression list pusta
(BOUNCE+COMPLAINT włączone na poziomie konta).

Użytkownicy (22 dokumenty `users`): 3 adresy Apple Private Relay, 10 z językiem EN,
0 wyłączonych digestów.

## 2. Wygląd (przed)

Zrzuty: `tmp/email-preview/before/shots/` (worktree, niecommitowane), warianty
`light`, `dark` (prefers-color-scheme, jak Apple Mail) i `forcedark` (automatyczne
przyciemnianie Chromium, przybliżenie Gmaila i Outlook.com), 375 i 600 px.
Generator: `node scripts/email-previews.mjs <katalog>` + `node scripts/email-screenshots.mjs <katalog>`
(po `npm --prefix functions run build`).

| Punkt | Stan przed |
|---|---|
| Szkielet dokumentu | 6 z 8 szablonów bez `<!DOCTYPE>`, `<html lang>`, `<meta charset>`, viewport (goły `<div>`); digest miał |
| Layout | szablony konta na `<div>` z `max-width` (Outlook desktop ignoruje), digest i trening na tabelach |
| Mobile 375 px | **mail z treningiem rozpychał się do ~450 px** (5 kafli w jednym wierszu tabeli), poziomy scroll |
| Preheader | tylko digest; reszta pokazywała w skrzynce pierwsze słowa treści |
| Dark mode | przycisk resetu już odporny (c7e32497); pozostałe przyciski z samym `background` w CSS; brak deklaracji `color-scheme` |
| Branding | trzy różne style: granat #0f172a (konto), pasek granatowy (digest), limonka #cefc22 zamiast marki #ccfc22 (trening) |
| Logo | brak obrazu (dobrze: G-T3 „zero obrazków”); wordmark tylko w mailu z treningiem |
| Stopka | brak nadawcy i powodu wysyłki poza digestem i treningiem; digest kierował do **nieistniejącego** „Ustawienia → Powiadomienia” (realnie: Profil, Powiadomienia) |
| Linki | wszystkie https (deep link `strengthsave://` usunięty w X29) |
| Rozmiar | 0,4-7,5 KB (limit obcinania Gmaila 102 KB daleko) |
| text/plain | generowany z HTML, przyciski traciły adres (`Otwórz aplikację` bez URL), wiodące spacje |

## 3. Dostarczalność

### DNS (strefa `strengthsave.app` w Cloudflare, odczyt 2026-09-29)

| Rekord | Wartość | Ocena |
|---|---|---|
| SPF `strengthsave.app` | `v=spf1 a mx include:amazonses.com include:_spf.firebasemail.com include:_spf-h19.microhost.pl ~all` | OK, 8/10 lookupów (a, mx, amazonses, firebasemail, sendgrid, ab.sendgrid, _spf.google, microhost) |
| DKIM SES | 3x CNAME `<token>._domainkey` -> `<token>.dkim.amazonses.com` | OK, SES `DkimAttributes.Status: SUCCESS`, RSA 2048 |
| DKIM Firebase | `firebase1/2._domainkey` -> firebasemail | OK (dla szablonów Firebase, dziś nieużywanych) |
| DKIM Resend | `resend._domainkey` TXT | OK (landing, `api/feedback.ts`, `api/waitlist.ts`) |
| `send.strengthsave.app` | MX `feedback-smtp.us-east-1.amazonses.com`, TXT `v=spf1 include:amazonses.com ~all` | **To jest domena zwrotna Resend** (Resend działa na SES us-east-1), a nie zepsuty MAIL FROM naszego SES. Notatka z RELEASE-READINESS-2026-08-27 („błędny region”) była błędną diagnozą. **Nie zmieniać** tego MX, bo zepsuje SPF maili z landingu |
| Custom MAIL FROM (SES eu-central-1) | **brak** (`MailFromAttributes` bez `MailFromDomain`) | Return-Path = `amazonses.com`: SPF przechodzi, ale NIE jest wyrównany z `strengthsave.app`. DMARC przechodzi dziś wyłącznie dzięki DKIM |
| DMARC `_dmarc` | `v=DMARC1; p=none; rua=mailto:(prywatny adres gmail.com właściciela)` | Polityka monitorująca. **Raporty prawdopodobnie nie dochodzą**: adres rua w obcej domenie wymaga rekordu autoryzacji `strengthsave.app._report._dmarc.gmail.com`, którego Gmail nie publikuje (sprawdzone: brak), a Google i Microsoft to weryfikują |
| MX `strengthsave.app` | `mail.strengthsave.app` (seohost h19) | OK od 16.09, contact@ ma odbiór |
| DKIM skrzynek seohost | brak rekordu (`default._domainkey` pusty) | odpowiedzi wysyłane ręcznie z contact@ mają tylko SPF (wyrównany); przed zaostrzeniem DMARC włączyć DKIM w panelu seohost |

### SES (eu-central-1, read-only)

- Identity `strengthsave.app`: verified, DKIM SUCCESS, feedback forwarding on, domyślny configuration set `strengthsave`.
- Configuration set: TLS `REQUIRE`, reputation metrics on, event destination SNS
  `strengthsave-ses-events` (subskrypcja HTTPS do `sesEventsWebhook` potwierdzona) z typami
  BOUNCE, COMPLAINT, DELIVERY, DELIVERY_DELAY, REJECT, RENDERING_FAILURE, SEND oraz
  **OPEN i CLICK**. Skutek: SES dokleja piksel i **przepisuje każdy link przez
  `*.awstrack.me`**, także link resetu hasła z `oobCode`. Domena śledzenia jest
  współdzielona przez wszystkich klientów SES (reputacja poza naszą kontrolą), a link
  w mailu wygląda inaczej niż tekst. W kodzie linki resetu i zaproszenia mają teraz
  `ses:no-track` (SES usuwa ten atrybut przed doręczeniem, docs.aws.amazon.com/ses/latest/dg/faqs-metrics.html).
- Konto SES współdzielone z `gjasionowicz.pl` i ZernFlow (reputacja konta wspólna),
  suppression na poziomie konta, sandbox: nie (production).
- IAM `strengthsave-ses-sender`: tylko `ses:SendEmail`, warunek `ses:FromAddress = noreply@strengthsave.app`, `aws:SecureTransport`. Reply-To i nagłówki mieszczą się w polityce.

### Nagłówki

- Message-ID nadaje SES (poprawny, korelowany z `email_log.sesMessageId`).
- Reply-To: brak przed falą. Odpowiedź na mail z `noreply@` nie miała dokąd trafić.
- List-Unsubscribe: brak. Maile nietransakcyjne: **digest tygodniowy** (cykliczny, do
  wszystkich aktywnych) i **broadcast admina**. Wymóg Gmail/Yahoo 2024 (one-click) formalnie
  dotyczy nadawców >5000 maili/dzień do Gmaila, ale przycisk wypisu przy nadawcy obniża
  zgłoszenia spamu także przy małej skali.

## 4. Treść

| Mail | Problem | Poprawka |
|---|---|---|
| Digest, temat | `4 treningów, 18.4 t — Twój tydzień ...`: zła odmiana (2-4 = „treningi”), pauza em | `Strength Save: Twój tydzień <zakres>, 4 treningi, 18.4 t` (EN analogicznie); odmiana 1 / 2-4 / 5+ z wyjątkiem 12-14 |
| Digest, stopka | wskazywała „Ustawienia → Powiadomienia” (nie istnieje) | „Wyłączysz w aplikacji: Profil, Powiadomienia.” + powód wysyłki |
| Digest, czas 0 | placeholder `—` | `-` |
| Powitanie | „przejść do onboardingu” (żargon) | „Otwórz aplikację i ułóż swój plan treningowy.” |
| Wszystkie | brak powodu wysyłki | jedno zdanie powodu w stopce + nadawca z adresem z polityki prywatności |
| Tematy | brak CAPS, brak wykrzykników, krótkie, polskie znaki poprawne | bez zmian poza digestem |

Nie zmieniane: temat kodu weryfikacyjnego zawiera kod (standard, w `email_log` maskowany),
teksty zaproszenia i zmiany dostępu (poprawne).

## 5. Co zmieniono w kodzie (bez deployu)

1. `a432bf3d` wspólny layout `functions/src/email-layout.ts` (tabele, inline CSS,
   `color-scheme: light`, preheader ze znacznikami, wordmark STRENGTH SAVE z akcentem
   #ccfc22 bez obrazów, przycisk z `bgcolor` i obramowaniem, stopka: powód, nadawca,
   „Masz pytanie? Odpowiedz na tę wiadomość.”), wszystkie maile do userów przez niego;
   kafle treningu `inline-block`; digest: odmiana, stopka, bez pauz; `ses:no-track` na
   linkach resetu i zaproszenia; czytelny text/plain; kontrakt `email-contract.test.ts`
   (152 przypadki PL/EN); skrypty podglądu i zrzutów.
2. `13d53388` Reply-To `contact@strengthsave.app` domyślnie; transport przyjmuje nagłówki.
3. `2c3c8a02` działający one-click unsubscribe digestu: nagłówki `List-Unsubscribe` +
   `List-Unsubscribe-Post`, nowa funkcja HTTP `emailUnsubscribe` (POST wyłącza
   `notificationPrefs.weeklyDigest`, GET tylko potwierdzenie), token HMAC z klucza
   wyprowadzonego z `API_KEY_PEPPER` (bez nowego sekretu).
4. `b1b4ce53`, `271da675`, `c2a216a7` drobne poprawki (lint, text/plain list, kafle digestu).

Zrzuty po: `tmp/email-preview/after/shots/`. Maile wewnętrzne (bug report, alert,
usunięcie konta) bez zmian wyglądu: idą tylko do contact@.

## 6. Do zrobienia ręcznie (właściciel), w tej kolejności

### 6.1 Deploy functions (po review i merge)

Zalecane pełne `firebase deploy --only functions` (predeploy: typecheck + test + build),
bo zmiana transportu (Reply-To) dotyczy każdej funkcji wysyłającej maile. Zmienione
funkcje z mailami: `syncUserProfile` (powitanie), `requestEmailVerificationCode`,
`verifyEmailCode`, `requestPasswordReset`, `createInvite`, `updateUserAccess`,
`adminSendUserEmail`, `adminResendVerification`, `adminBroadcastEmail`, `deleteOwnAccount`,
`emailWorkoutSummary`, `emailWorkoutHistory`, `weeklyDigest`, zgłoszenia błędów i
`dailyErrorDigest` (Reply-To), nowa `emailUnsubscribe`.
`emailUnsubscribe` i `weeklyDigest` muszą wejść razem (nagłówek wskazuje nową funkcję).
Sprawdzenie po deployu: `curl -s -o /dev/null -w "%{http_code}" "https://us-central1-fittracker-workouts.cloudfunctions.net/emailUnsubscribe?u=x&t=y"` = 400 (zły token), nie 404.
Test na własnym koncie: reset hasła i digest do siebie, w Gmailu „Pokaż oryginał”:
`Reply-To: contact@strengthsave.app`, `List-Unsubscribe` przy digeście, DKIM/SPF/DMARC PASS.

### 6.2 DNS w Cloudflare (strefa strengthsave.app), rekordy „DNS only”

**A. Custom MAIL FROM dla SES (wyrównanie SPF).** Nowa subdomena, bo `send.` należy do Resend:

| Typ | Nazwa | Wartość | Priorytet |
|---|---|---|---|
| MX | `bounce` | `feedback-smtp.eu-central-1.amazonses.com` | 10 |
| TXT | `bounce` | `v=spf1 include:amazonses.com ~all` | - |

Potem w SES (konsola: Identities, strengthsave.app, Custom MAIL FROM domain, albo CLI):
```
aws sesv2 put-email-identity-mail-from-attributes --region eu-central-1 \
  --email-identity strengthsave.app --mail-from-domain bounce.strengthsave.app \
  --behavior-on-mx-failure USE_DEFAULT_VALUE
```
Weryfikacja: `aws sesv2 get-email-identity --email-identity strengthsave.app --region eu-central-1`
-> `MailFromAttributes.MailFromDomainStatus: SUCCESS`.
`send.strengthsave.app` (MX us-east-1 + TXT) zostaje bez zmian.

**B. DMARC: raporty do własnej domeny.** Zmienić TXT `_dmarc`:
```
v=DMARC1; p=none; rua=mailto:contact@strengthsave.app; adkim=r; aspf=r
```
(lepiej osobny alias `dmarc@strengthsave.app` na seohost i ten adres w `rua`, żeby XML-e
nie zaśmiecały supportu). Po 2-4 tygodniach czystych raportów (SES, Resend, seohost,
Firebase wyrównane) zmiana na `p=quarantine; pct=100`. Przed tym: DKIM dla skrzynek
seohost (panel hostingu, wygeneruje TXT `<selektor>._domainkey`).

**C. SPF root:** bez zmian (8/10 lookupów). `include:amazonses.com` na root przestanie
być potrzebne po MAIL FROM, ale nie szkodzi.

### 6.3 SES: śledzenie otwarć i kliknięć

Rekomendacja: z event destination `strengthsave-sns-events` usunąć typy `OPEN` i `CLICK`
(konsola SES, Configuration sets, strengthsave, Event destinations, Edit). Znika piksel i
przepisywanie linków na `awstrack.me` we wszystkich mailach. Open rate i tak jest zawyżony
przez Apple Mail Privacy Protection, a panel admina używa głównie delivered/bounced.
Alternatywa: własna domena śledzenia (wymaga HTTPS przez CloudFront). Linki resetu i
zaproszenia są już wyłączone ze śledzenia w kodzie.

### 6.4 Apple Private Relay (3 użytkowników)

Apple Developer, Certificates, Identifiers & Profiles, Services, „Sign in with Apple for
Email Communication”: dodać domenę `strengthsave.app` i adres `noreply@strengthsave.app`
(opcjonalnie `contact@`). Bez rejestracji Apple może odrzucać maile na
`@privaterelay.appleid.com`. W `email_log` 2 z 3 powitań na relay mają `delivered`
(przyjęte przez serwer Apple), więc to wymaga weryfikacji w portalu, nie jest
potwierdzoną awarią.

## 7. Poza zakresem, do decyzji

- **Zrobione po decyzji właściciela (2026-09-29):** broadcast admina pomija wypisanych
  (`notificationPrefs.announcementEmails`, przełącznik w Profil, Powiadomienia) i ma
  one-click unsubscribe; mail do trenera ma Reply-To = zweryfikowany adres właściciela
  konta (poza Apple Private Relay), inaczej contact@. Treść stricte marketingowa w
  broadcaście wymagałaby dodatkowo `consents.marketingGranted`.
- Zgłoszenie błędu: Reply-To mógłby wskazywać `reporterEmail` (odpowiedź prosto do usera).
- Nazwy ćwiczeń w EN: słownik `exercise-name-en.ts` nie zna m.in. „Martwy ciąg” (w EN zostaje PL).
- Maile wewnętrzne (alert client_errors) mają teksty bez polskich znaków („Powod”, „Przyklad”).

## 8. Czego testy nie dowodzą

Zrzuty to Chromium, nie realni klienci. Nie sprawdzone: Outlook desktop (Word renderer,
`inline-block` kafli ułoży się pionowo, co jest akceptowalne), Gmail app iOS/Android przy
wymuszonym ciemnym motywie (przybliżenie `forcedark`), filtr spamu Gmaila na realnym
mailu. Weryfikacja po deployu: mail testowy do siebie + mail-tester.com (wysyłka to
decyzja właściciela).
