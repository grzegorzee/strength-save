# TODO: aktywacja web push + Android Google Play (2026-07-17)

> Stan wyjściowy: kod web push wdrożony (uśpiony bez klucza VAPID); Android release-ready
> (podpisany `android/app/build/outputs/bundle/release/app-release.aab`, keystore w
> `~/FIRMA/_secrets/android/`). Kroki oznaczone [USER] wymagają Ciebie; [AGENT] wykonuje
> asystent na hasło. Szczegółowy przewodnik: rozmowa z 2026-07-17 (sesja X13).

---

## A. Web push (ok. 3 min pracy usera)

- [ ] [USER] Wygeneruj/skopiuj klucz VAPID: https://console.firebase.google.com/project/fittracker-workouts/settings/cloudmessaging -> Web configuration -> **Web Push certificates** -> (Generate) key pair -> kopiuj (~87 znaków, zwykle od `B...`). Konsola nie ma na to API.
- [ ] [USER] Dopisz do env (`.env` w projekcie to symlink na ten plik):
  `echo 'VITE_FIREBASE_VAPID_KEY=WKLEJONY_KLUCZ' >> ~/FIRMA/_secrets/projekty/strength_save.env`
- [ ] [AGENT] `npm run deploy` + weryfikacja hash na live (hasło: "vapid wklejony").
- [ ] [USER] Test: live web w Chrome -> Profil -> Powiadomienia -> włącz (systemowy prompt "Zezwól") -> Panel admina -> Komunikacja -> wyślij testowy push -> powiadomienie przychodzi przy zamkniętej karcie.
- [ ] Znane pułapki: literówka w kluczu = błąd `applicationServerKey` w konsoli przeglądarki; SW pusha rejestruje się we własnym scope `fcm/` obok workboxa (nie kolidują).

---

## B. Android / Google Play

### B1. Konto dewelopera (25 USD jednorazowo)

- [ ] [USER] **Backup keystore**: skopiuj `~/FIRMA/_secrets/android/strength-save-release.keystore` + `strength-save-key.properties` do miejsca backupów _secrets (bez keystore nie ma aktualizacji; Play App Signing z B3 zdejmuje część ryzyka).
- [ ] [USER] Decyzja typu konta na https://play.google.com/console/signup :
  - **osobiste**: szybka weryfikacja dowodem, ALE publikacja PRODUKCYJNA wymaga zamkniętych testów: >=12 testerów aktywnych 14 dni (testów wewnętrznych to nie blokuje),
  - **organizacja (JDG)**: bez wymogu 12 testerów, wymaga numeru **D-U-N-S** (darmowy, do ~30 dni przez dnb.com) + weryfikacji firmy; adres firmy publiczny w sklepie.
  - Rekomendacja: osobiste teraz (testy ruszają od razu); jeśli celujesz w publiczny sklep, równolegle złóż wniosek o D-U-N-S.
- [ ] [USER] Rejestracja na koncie g.jasionowicz@gmail.com (spójnie z Firebase), opłata 25 USD, weryfikacja tożsamości (godziny-dni).

### B2. Aplikacja + formularze zgodności

- [ ] [USER] Play Console -> **Create app**: nazwa `Strength Save`, język polski, typ App, **Free** (nieodwracalne; monetyzacja = subskrypcje w apce).
- [ ] [AGENT] Na hasło "formularze Play": gotowe treści do wklejenia: polityka prywatności (URL do wystawienia na gjasionowicz.pl albo podstronie apki - do decyzji), **Data safety** (konto: email+nazwa; dane fitness: treningi/pomiary; telemetria interakcji X13A; błędy klienta; szyfrowanie w tranzycie; self-service delete konta), **Content rating** IARC (fitness, wyjdzie 3+), Ads: No, Target audience: 18+, News/COVID/Government: No.
- [ ] [USER] Wyklikanie sekcji **App content** z powyższymi treściami.

### B3. Pierwszy upload (testy wewnętrzne)

- [ ] [USER] Testing -> **Internal testing** -> Create new release -> **zaakceptuj Play App Signing** (Google przejmuje klucz podpisu; nasz keystore = upload key) -> wgraj `app-release.aab` -> notes "Pierwszy build testowy 1.0.0".
- [ ] [USER] Setup -> **App signing** -> skopiuj SHA-1 z "App signing key certificate" i podeślij agentowi.
- [ ] [AGENT] Dodanie SHA-1 App Signing do Firebase (`firebase apps:android:sha:create`) - bez tego logowanie Google nie działa w buildach ze sklepu (SHA-1 upload key już dodany).
- [ ] [USER] Testers -> lista mailowa (Ty + Robert) -> wyślij link "Join on the web".
- [ ] [USER] Instalacja ze Sklepu Play przez link testera, smoke test na telefonie (login Google, trening, sync).

### B4. Przed wyjściem poza testy wewnętrzne

- [ ] [AGENT] Subskrypcje Android: produkty w Google Play Billing + podpięcie w RevenueCat (możliwe dopiero, gdy apka jest w internal testing) - dziś RevenueCat skonfigurowany tylko z ASC; bez tego paywall na Androidzie nie sprzeda.
- [ ] [AGENT] Kolejne buildy na hasło "nowy AAB": bump `versionCode` w `android/app/build.gradle` (teraz 5; `versionName` zostaje 1.0.0), build:mobile -> cap sync android -> bundleRelease.
- [ ] [AGENT] Store listing do publikacji: opisy (krótki 80 / pełny 4000 zgodnie z Writing Guard), feature graphic 1024x500, screenshoty telefoniczne (min 2).
- [ ] [USER] (konto osobiste) zamknięte testy: 12 testerów / 14 dni przed produkcją.

---

Opcja: po podłączeniu rozszerzenia Claude w Chrome (claude.ai/chrome) agent przechodzi przez konsolę Play razem z userem na żywo.
