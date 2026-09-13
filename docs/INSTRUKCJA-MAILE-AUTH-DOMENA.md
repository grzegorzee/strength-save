# Maile Firebase Auth z domeny strengthsave.app: instrukcja klikania

Stan na 2026-09-13. Co zrobione przez API i co zostaje do kliknięcia w konsoli Firebase.

## Zrobione (API, bez klikania)

- **Reset hasła idzie już własnym kanałem** (od 2026-09-13, web LIVE, functions
  wdrożone): callable `requestPasswordReset` generuje link Firebase, przepisuje
  host na `auth.strengthsave.app` i wysyła mail przez Amazon SES z
  `noreply@strengthsave.app` (przycisk + link zapasowy, PL/EN). Blokada Google
  nie ma na to wpływu. iOS/Android przełączą się w następnym buildzie (148 jest
  w App Review); do tego czasu telefon wysyła mail Firebase z nazwą „Strength Save”.

- Nazwa nadawcy „Strength Save” we wszystkich 4 szablonach Firebase Auth (reset hasła,
  weryfikacja e-maila, zmiana e-maila, cofnięcie 2FA). Zweryfikowane testowym mailem
  resetu na g.jasionowicz@gmail.com.
- Rekordy DNS dla Firebase w Cloudflare (strefa strengthsave.app), propagacja
  potwierdzona na 1.1.1.1 i 8.8.8.8:
  - TXT `strengthsave.app` = `firebase=fittracker-workouts`
  - TXT `strengthsave.app` (SPF, scalony z SES) = `v=spf1 include:amazonses.com include:_spf.firebasemail.com ~all`
  - CNAME `firebase1._domainkey.strengthsave.app` -> `mail-strengthsave-app.dkim1._domainkey.firebasemail.com`
  - CNAME `firebase2._domainkey.strengthsave.app` -> `mail-strengthsave-app.dkim2._domainkey.firebasemail.com`
  - DMARC (`p=none`) bez zmian, rekordy SES i Resend nietknięte.

## Zablokowane przez Google (nie przejdzie ani po API, ani prawdopodobnie w konsoli)

Identity Toolkit odpowiada `EMAIL_TEMPLATE_UPDATE_NOT_ALLOWED` na zmianę: tematu,
treści HTML, adresu linku (action URL). To blokada antyspamowa nałożona na projekt
po stronie Google. Zdejmuje ją tylko Firebase Support. Nazwa nadawcy i reply-to
przechodzą normalnie.

## Do kliknięcia (konsola Firebase, konto g.jasionowicz@gmail.com)

### A. Podpięcie domeny nadawcy (żeby From był noreply@strengthsave.app)

1. Otwórz: https://console.firebase.google.com/project/fittracker-workouts/authentication/emails
   Zaloguj się kontem **g.jasionowicz@gmail.com** (to konto jest właścicielem projektu;
   grzegorzee@gmail.com nie ma dostępu).
2. Na liście po lewej kliknij **Password reset** (albo „Resetowanie hasła”).
3. Kliknij ikonę **ołówka** (edytuj) w prawym górnym rogu podglądu szablonu.
4. Pod polem **From** (Od) jest link **Customize domain** (Dostosuj domenę). Kliknij.
5. Wpisz domenę: `strengthsave.app` (bez `www`, bez `noreply@`). Kliknij **Continue** (Dalej).
6. Konsola pokaże tabelę rekordów DNS do dodania. **Porównaj z listą wyżej.**
   Wszystkie cztery powinny być identyczne (TXT `firebase=...`, TXT SPF, dwa CNAME
   `firebase1._domainkey` i `firebase2._domainkey`). Jeśli którykolwiek wpis różni się
   od mojego (inna nazwa, inna wartość), zrób zrzut ekranu i wrzuć mi. Nie dodawaj nic
   ręcznie w Cloudflare.
7. Kliknij **Verify** (Zweryfikuj). Rekordy są już rozpropagowane, więc zwykle
   przechodzi od razu. Jeśli pokaże „pending”, odczekaj kilka minut i kliknij ponownie
   (Google dopuszcza do 24 h, ale realnie to minuty).
8. Po zielonym „Verification complete” kliknij **Apply custom domain** (Zastosuj
   domenę niestandardową), potem **Save** (Zapisz) w edycji szablonu.
9. Domena obowiązuje dla wszystkich szablonów naraz. Sprawdzenie: w aplikacji
   (web albo telefon) na ekranie logowania kliknij „Nie pamiętam hasła”, wpisz swój
   adres i sprawdź, czy mail przyszedł od **Strength Save <noreply@strengthsave.app>**.

### B. Próba odblokowania adresu linku i treści (może się nie udać)

1. W tej samej edycji szablonu Password reset przewiń na dół do **Customize action URL**
   (Dostosuj adres URL działania). Kliknij.
2. Wpisz: `https://auth.strengthsave.app/__/auth/action` i zapisz.
3. Jeśli konsola pokaże błąd (czerwony komunikat, „not allowed”, „nie można
   zaktualizować”), to ta sama blokada co po API. Wtedy zgłoszenie do supportu:
   - https://firebase.google.com/support/troubleshooter/contact
   - Product: Authentication. Temat: „EMAIL_TEMPLATE_UPDATE_NOT_ALLOWED on project fittracker-workouts”.
   - Treść (po angielsku, do wklejenia):

     ```
     Project: fittracker-workouts
     Updating the Authentication email templates (subject, message body,
     custom action URL) fails with EMAIL_TEMPLATE_UPDATE_NOT_ALLOWED, both in the
     Firebase console and via the Identity Toolkit admin API (projects.updateConfig).
     Sender name changes are accepted. The custom sending domain strengthsave.app
     is verified. This is a production app (Strength Save, App Store / Google Play).
     Please lift the template update restriction so we can set the action URL to
     https://auth.strengthsave.app/__/auth/action and customize the message body.
     ```

4. Jeśli konsola pozwoliła zapisać action URL bez błędu, daj znać: wtedy spróbuję
   jeszcze raz wgrać po API gotowe szablony HTML z przyciskami (skrypt jest gotowy,
   podgląd w tej sesji był zaakceptowany).

### C. Po co jeszcze krok A, skoro reset idzie przez SES

Krok A (domena w konsoli) dotyczy maili, które nadal wysyła Firebase: reset
hasła ze starszych buildów iOS/Android (do następnego wydania) oraz ewentualne
przyszłe maile Firebase Auth (weryfikacja, zmiana e-maila; dziś nieużywane).
Krok B jest opcjonalny: link resetu z naszego kanału już prowadzi na
`auth.strengthsave.app`.
