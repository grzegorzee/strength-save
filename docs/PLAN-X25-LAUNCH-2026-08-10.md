# PLAN X25: jeden produkt na web, iOS, Android, Apple Watch i Garmin

**Data:** 2026-08-10  
**Cel:** usunac blokery publicznego wydania Strength Save, ujednolicic web, iOS, Android, Apple Watch i Garmin, obnizyc koszt chmury bez utraty funkcji oraz wdrozyc poprawny cennik/triale.  
**Tryb:** autonomiczny `/goal` + `/loop`, test-first, commit po kazdej zamknietej fazie.  
**Poza zakresem X25:** przebudowa i skracanie onboardingu. Obecny onboarding jest zamrozony.

---

## 0. Decyzje i niezmienniki

### Piec powierzchni, jeden produkt

| Powierzchnia | Rola w produkcie | Zrodlo tozsamosci i danych | Dystrybucja |
|---|---|---|---|
| Web PWA | pelny plan, historia, analityka, ustawienia i zarzadzanie urzadzeniami | Firebase Auth + Firestore; web pozostaje invite-only | GitHub Pages |
| iOS | pelna aplikacja mobilna, zakup App Store i most Apple Watch | Firebase Auth + lokalny draft + Firestore + RevenueCat | App Store/TestFlight |
| Android | pelna aplikacja mobilna, zakup Google Play | Firebase Auth + lokalny draft + Firestore + RevenueCat | Google Play |
| Apple Watch | sparowany kontroler treningu, HealthKit i kolejka offline | snapshot i zdarzenia przez WatchConnectivity; iPhone pozostaje zrodlem prawdy | target w tej samej paczce iOS |
| Garmin | samodzielny sparowany klient treningu, FIT i kolejka offline | token urzadzenia mapowany serwerowo do uid; kompaktowe endpointy Functions | Connect IQ Store |

- Spojnosc nie oznacza kopiowania kazdego ekranu na maly zegarek. Oznacza te same identyfikatory, znaczenie serii, jednostki, ustawienia, stan treningu, entitlement, nazewnictwo PL/EN i wynik synchronizacji, przy interfejsie dopasowanym do urzadzenia.
- Jedno konto i jeden entitlement `pro` obejmuja web, iOS, Android, Apple Watch i Garmin. Nie ma osobnej oplaty za zegarki.
- Zakup i restore odbywaja sie w aplikacjach iOS/Android przez ich sklepy. Web pokazuje ten sam status dostepu i bezpieczna sciezke do aplikacji mobilnej; Apple Watch i Garmin nie implementuja osobnego checkoutu.
- Apple Watch dziedziczy bezpieczny stan konta i mozliwosci z iPhone. Garmin korzysta z serwerowo zweryfikowanego tokenu urzadzenia. Wylogowanie, usuniecie konta i odpiecie urzadzenia maja uniewazniac dalszy dostep.
- Brak aktywnego PRO nigdy nie usuwa historii ani lokalnych niewyslanych zdarzen. Zachowanie po wygasnieciu ma byc zgodne z obecnym kontraktem aplikacji i wdrozone z kompatybilna migracja, bez naglego odebrania istniejacej funkcji.

### Cennik docelowy

| Plan | Polska | USA | Efektywnie / mies. | Oszczednosc vs 12 miesiecy |
|---|---:|---:|---:|---:|
| Miesieczny | 14,99 zl | $3.99 | 14,99 zl / $3.99 | - |
| Roczny | 119,99 zl | $31.99 | 10,00 zl / $2.67 | ok. 33%, czyli ok. 4 miesiace gratis |

- Trial miesieczny: **7 dni**.
- Trial roczny: **14 dni**.
- Na paywallu roczny jest zaznaczony domyslnie.
- Cena, okres, oszczednosc i trial maja pochodzic z metadanych RevenueCat/App Store/Google Play, a nie z hardkodowanych napisow.
- Obietnica triala jest widoczna tylko dla usera z potwierdzona eligibility. `unknown` i `ineligible` pokazuja zwykle CTA subskrypcji bez obietnicy darmowego okresu.

### Zamrozenie onboardingu

W X25 NIE zmieniaj UX, liczby krokow, tresci ani logiki wyboru planu w:

- `src/pages/Onboarding.tsx`
- `src/components/PlanWizard.tsx`
- `src/components/PlanPreview.tsx`
- testach opisujacych obecny wizard, poza niezbedna aktualizacja setupu auth

Wolno naprawic rejestracje i weryfikacje email przed onboardingiem oraz paywall po onboardingu. Osobny przyszly projekt obejmie onboarding 30-60 s.

### Niezmienniki produktu i danych

1. Zadna funkcja ani historia usera nie znika. Starsze dane wolno ladowac stronicami lub na zadanie.
2. Lokalny IndexedDB, draft treningu, synchronizacja po odzyskaniu sieci i checkpointy treningu pozostaja.
3. Web pozostaje invite-only. Publiczna rejestracja bez invite dotyczy natywnych aplikacji iOS i Android dopiero po serwerowo weryfikowalnej atestacji.
4. Nie wolno ponownie zaufac polu `platform` wysylanemu przez klienta.
5. `registrationOpen=false` nadal natychmiast zamyka tworzenie nowych kont.
6. Istniejacy user z wygasla subskrypcja zachowuje odczyt i eksport swoich danych.
7. Nie zapisuj ani nie usuwaj produkcyjnych danych userow w testach i diagnostyce.
8. Nie ruszaj `animacje-cwiczen/`. Wygenerowane pliki Android zostaly odswiezone przez `cap sync android`; zachowaj wpisy App Check, Keep Awake i Keyboard.
9. Kanoniczna masa w danych i eventach to kg; lbs jest tylko warstwa prezentacji. Wszystkie powierzchnie musza pokazac ten sam wynik po konwersji i nie moga zaokraglac wartosci przy synchronizacji.
10. `exerciseId`, `dayId`, `sessionId`, `eventId`, indeks serii i czas zdarzenia maja to samo znaczenie na kazdej powierzchni. Kazdy event jest idempotentny, a ACK nastepuje dopiero po trwalym zapisie.
11. Snapshot z telefonu/backendu nie moze nadpisac nowszych lokalnych serii zegarka. Merge zachowuje lokalny postep, deduplikuje retry i ma jawna polityke konfliktu.
12. Domyslne przerwy to 90 s miedzy seriami i 150 s miedzy cwiczeniami. Lokalna zmiana na zegarku nie moze zostac po cichu wyzerowana przez stary snapshot.
13. PL/EN, nazwa Strength Save, ikony, zielony akcent, terminy `trening`, `seria`, `przerwa`, `synchronizacja` oraz komunikaty offline maja byc spojne znaczeniowo na wszystkich klientach.
14. Apple Health/HealthKit i Garmin FIT nie moga tworzyc podwojnego treningu dla tej samej sesji. Import/sync z zegarka ma zachowac pojedyncza kanoniczna sesje Strength Save.
15. Apple Watch i Garmin musza miec wyjscie z kazdego stanu: ponow synchronizacje, pomin przerwe, zakoncz albo odrzuc trening, odswiez plan, odparuj urzadzenie. Brak lacznosci nie jest stanem bez wyjscia.

---

## 1. Stan bazowy i znalezione problemy

### Wyniki audytu 2026-08-10

- aplikacja: 139 plikow testowych, 1224 testy PASS;
- backend Functions: 18 plikow PASS + 1 skipped, 156 testow PASS + 7 skipped;
- E2E mock: 194 PASS;
- typecheck, lint, build web: PASS;
- build mobile + mobile dist smoke: PASS;
- web dist offline: PASS;
- web `check:dist-smoke`: naprawiony; wykrywa base z `dist/index.html` i przechodzi dla `/strength-save/` oraz mobile `./`;
- initial JS: 1 532 843 B przy limicie 1 536 000 B, tylko ok. 3,2 KB zapasu;
- warningi: brak `DialogTitle`/description w czesci dialogow, podwojna rejestracja testowego pluginu natywnego, React Router future flags, deprecated `punycode`.

### P0: blokada rejestracji widoczna na iPhone

Objaw: ekran weryfikacji email pokazuje `User profile missing`.

Root cause:

1. `Login.tsx` udostepnia na native rejestracje bez invite.
2. Firebase Auth poprawnie tworzy konto.
3. `UserContext` uruchamia `syncUserProfile`, ale Functions odrzuca brak invite dla kazdego nowego profilu.
4. Listener brakujacego `users/{uid}` buduje lokalny profil `pending_verification` i pokazuje `EmailVerificationGate` mimo nieudanego syncu.
5. `requestEmailVerificationCode` nie znajduje dokumentu `users/{uid}` i zwraca `User profile missing`.

To jest niespojnosc auth klient/backend, nie blad onboardingu ani wpisanego adresu email.

### Koszt chmury

- wspolny listener czyta do 500 treningow i 365 pomiarow;
- Dashboard dodatkowo moze sluchac do 500 Strava, 500 manual activities i 60 cykli;
- zimny Dashboard mocno aktywnego usera moze dojsc do ok. 1900 odczytow dokumentow;
- telemetria probuje flush co 30 s, co przy stale naplywajacych eventach moze dac do 120 zapisow/h;
- rejestracja push wywoluje backend przy kazdym starcie aplikacji i odswieza `lastSeenAt` nawet bez zmiany tokenu.

### Stan Apple Watch i Garmin

- Apple Watch jest targetem watchOS 10+ osadzonym w paczce iOS (`StrengthWatch` + `StrengthWatchWidgets`). Ma plan dnia, start/finish, edycje i odhaczanie serii, one-tap log, timer przerwy, PL/EN, kg/lbs, HealthKit z tetnem, komplikacje i kolejke `transferUserInfo` z ACK po trwalym zapisie.
- Apple Watch wymaga przed wydaniem pelnego testu na realnym iPhone + Watch: zerwana lacznosc, restart obu aplikacji, background, finish, HealthKit bez duplikatu i poprawny stan po nowym dniu. Brakuje pelnego parytetu operacyjnego z Garminem: szybki trening, przerwa miedzy cwiczeniami, widok czasu/statystyk sesji i jawne odrzucenie lokalnego treningu.
- Garmin Connect IQ v3 dziala na epix Gen 2 i w symulatorze. Ma parowanie kodem, plan dnia, szybki trening, edycje serii, przerwy 90/150, zegar i statystyki sesji, odrzucenie, FIT z HR, lokalna kolejke oraz backend `garminPair`/`garminDay`/`garminIngest`.
- Garmin nie jest jeszcze gotowy do Store: trzeba zbudowac i przetestowac eksport `.iq` na wszystkich deklarowanych rodzinach, sprawdzic layout okragly/prostokatny oraz touch/non-touch, przygotowac listing PL/EN, privacy i wykonac test na realnym zegarku bez zapisu na prywatne konto usera.
- WatchConnectivity nie generuje odczytow chmury per seria. Garmin ma zachowac kompaktowy payload i lokalna kolejke; bez pollingu per sekunda i bez osobnego zapisu telemetrycznego per klik.

---

## 2. Kolejnosc wykonania

### FAZA 1 - P0 rejestracja i weryfikacja email

- [x] **Z203: testy regresyjne kontraktu rejestracji.** Dodaj czerwone testy: attested native bez invite tworzy profil; web/unattested bez invite jest odrzucony; poprawny invite dziala; `registrationOpen=false` blokuje; brak dokumentu nie pokazuje bramki weryfikacji przed zakonczonym sync; osierocone konto Auth odzyskuje profil po poprawnym sync. **Dowod:** `functions/src/security.test.ts`, `src/test/native-callable.test.ts`, `src/test/user-provider-bootstrap.test.tsx`; po rozszerzeniu na obie platformy 23 + 5 + 2 testy PASS.
- [x] **Z204: serwerowo weryfikowalna rejestracja native.** Firebase App Check dziala dla iOS/App Attest i Android/Play Integrity. `syncUserProfile` moze utworzyc profil bez invite tylko dla dokladnego App ID iOS albo Android z prawidlowym App Check. Web nadal wymaga invite; backend nie ufa deklaracji `platform`. **Dowod iOS:** bundle `com.grzegorzjasionowicz.strengthsave`, Team ID `J4CRD2SA6D`, App Attest TTL 3600 s. **Dowod Android:** App ID `1:283539506094:android:d247e84bda5834fe66be3f`, Play Integrity TTL 3600 s, API `playintegrity.googleapis.com` wlaczone, SHA-256 upload key dodany do Firebase, plugin dolaczony przez `cap sync android`. Wspolny adapter przesyla oficjalna koperte `{data}` z Firebase Auth i `X-Firebase-AppCheck`. `syncUserProfile` wdrozone w `us-central1` i ACTIVE.
- [x] **Z205: odporny bootstrap profilu.** `UserContext` nie moze traktowac brakujacego dokumentu jak gotowego profilu do weryfikacji, zanim `syncUserProfile` zakonczy sie sukcesem. Dodaj stan `syncing/error/retry`, czytelny lokalizowany komunikat i retry. Po naprawie atestacji istniejace osierocone konto Auth ma samo utworzyc profil bez ponownej rejestracji. **Dowod:** listener startuje dopiero po udanym idempotentnym `syncUserProfile`; brak profilu lub blad sync pokazuje istniejacy lokalizowany ekran z `Odswiez`/`Refresh`, nie bramke kodu; test bootstrapu 2/2 PASS.
- [ ] **Z206: test produkcyjny bez dotykania danych usera.** Emulator: pelna sekwencja register -> profile -> code -> verify -> onboarding route dla iOS i Android. Produkcja: nowe techniczne konto, sprawdzenie dokumentu i maila, potem usuniecie wyłącznie tego konta testowego kontrolowanym mechanizmem. **Stan:** emulator 7/7 PASS; kontrolowane produkcyjne smoki dla dokladnych App ID iOS oraz Android PASS (`profile -> code -> verify -> onboarding.in_progress`), konta usuniete przez `deleteOwnAccount`, tymczasowe debug tokeny uniewaznione. Pozostaja dwa testy prawdziwej atestacji: App Attest na buildzie iOS 84 z realnego iPhone oraz Play Integrity na AAB `versionCode 6` zainstalowanym z Google Play Internal Testing.

**Brama fazy:** nowy user na iOS i Android dochodzi do niezmienionego onboardingu; web bez invite nadal nie tworzy profilu; screenshotowy blad nie wystepuje.

### FAZA 2 - wspolny kontrakt pieciu powierzchni i parytet zegarkow

- [x] **Z223: macierz funkcji i kontrakt danych.** Utworz `docs/CROSS-PLATFORM-PARITY.md` z wierszami dla web/iOS/Android/Apple Watch/Garmin: auth, entitlement, plan dnia, planowy i szybki trening, typy serii, edycja, przerwy, czas/statystyki sesji, finish/discard, offline, konflikt, health/FIT, PL/EN, kg/lbs, sync i delete/logout. Dla kazdego wiersza oznacz `pelny`, `urzadzeniowo uproszczony`, `nie dotyczy` albo `brak`; kazdy brak ma task i test. Zamroz wspolne fixture planu i eventow przed implementacja. **Dowod:** `docs/CROSS-PLATFORM-PARITY.md` klasyfikuje 21 obszarow i mapuje kazdy brak G01-G18 na task/test; `fixtures/cross-platform/workout-contract-v1.json` zamraza cztery typy serii, konflikt, finish/discard i legacy Watch/Garmin; `npm run test -- src/test/cross-platform-contract-fixture.test.ts` 4/4 PASS (test najpierw czerwony przez brak fixture).
- [x] **Z224: wersjonowany protokol i jedna semantyka.** Ujednolic znaczenie `uid/deviceId/dayId/sessionId/exerciseId/setIndex/eventId/at`, kg, czasu, typow serii oraz ustawien 90/150 bez rozwalania kompaktowego Garmin `v` ani payloadu Watch. Dodaj jawne wersjonowanie, parsery kompatybilne wstecz, limity rozmiaru, test nowych klientow ze starym serwerem i starych klientow z nowym serwerem. Event wolno ACK dopiero po trwalym zapisie; retry nie tworzy duplikatu. **Dowod:** `docs/WORKOUT-PROTOCOL.md` + `src/lib/workout-protocol.ts`; Watch wysyla addytywne `v/protocolVersion/uid/deviceId/sessionId` i 90/150, legacy eventy nadal sa parsowane, Xcode `App`/Watch/Widgets exit 0; Garmin przyjmuje legacy i hybrydowy v1, zachowuje cztery typy serii, odrzuca future/oversize, HTTP success czeka na `saveWorkout`; testy celowane app 17/17 + fixture 4/4 + preview 2/2, Functions Garmin 20/20, pelna aplikacja 141 plikow/1238 PASS, lint/typecheck/build/dist smoke/offline PASS. Bundle 1 535 366/1 536 000 B PASS, pozostaly zapas 634 B do odzyskania w Z221.
- [ ] **Z225: Apple Watch do wspolnego standardu.** Zachowaj dzialajace WatchConnectivity, lokalny merge, HealthKit, one-tap i komplikacje. Domknij braki wybrane przez macierz: szybki trening z bezpiecznej listy ostatnich cwiczen, przerwa 90/150, czas + serie + tonaz, jawne odrzucenie lokalnej sesji oraz czytelny pending/error/retry. Testy Swift/TS i realny iPhone + Watch: telefon offline, zerwany Bluetooth, kill/resume, nowy dzien, rownolegle odhaczenie, finish, discard, haptic i dokladnie jeden HKWorkout. **Stan implementacji:** kod domkniety: quick workout idzie istniejaca sciezka ad-hoc, cztery typy serii zachowuja pola, serie maja per-set LWW `updatedAt`, Watch trzyma wlasna kolejke do trwalego ACK, a HealthKit rozroznia `finishWorkout` od `discardWorkout`. Testy najpierw czerwone, potem Watch/TS 37/37 i pelna aplikacja 144 pliki/1252 PASS; Xcode `App` (z `StrengthWatch` i widgets) exit 0; lint/typecheck/build/dist smoke/offline PASS; bundle 1 535 571/1 536 000 B PASS. **KROK USERA:** fizyczny Watch nie jest widoczny (`xcrun xctrace list devices`: tylko iPhone offline i symulatory); wykonac macierz `docs/X25-REAL-DEVICE-CHECKLIST.md` na realnym sparowanym iPhone+Watch i dolaczyc screenshot/log oraz liczbe HKWorkout. Do tego czasu checkbox pozostaje otwarty.
- [ ] **Z226: Garmin do wspolnego standardu.** Zachowaj v3, FIT, lokalne ustawienia i kolejke. Zweryfikuj wspolny protokol, entitlement tokenu, revoke/logout/delete, wygasly token, retry/dedup ingest, zmiane dnia i konflikt z sesja telefonu. `garminDay` tylko przy starcie/manual refresh/rozsadnym TTL lub zmianie wersji, `garminIngest` paczkami/finalizacja; zero pollingu i zapisu per sekunda. Testuj na technicznym koncie, nigdy na prywatnym koncie usera. **Stan implementacji:** backend sprawdza ten sam `users/{uid}.subscription` dla pair/day/ingest, token ma revocation i TTL 180 dni, logout najpierw wywoluje `garminRevokeAllDevices`, a purge konta obejmuje pair codes i device tokens. Connect IQ zachowuje legacy `[reps,kg]`, ale addytywnie przesyla cztery trackingi + warm-up, ma lokalne kg/lbs, TTL dnia 15 min/manual refresh i trzyma poprzedni dzien dopoki EventQueue nie dostanie trwalego ACK. Konflikt telefon/Garmin scala per-set LWW w jeden dokument, z transakcyjnym guardem na rownolegly zapis; lost-ACK retry nie pisze drugi raz. Dowod: Functions 175 PASS, aplikacja 1253 PASS, lint/typecheck/build/dist/offline PASS, bundle 1 535 890/1 536 000 B PASS; Monkey C SDK 9.2.0 `BUILD SUCCESSFUL` dla epix2, fenix7, fr255, venu3 i vivoactive5; `firebase deploy --only functions` PASS dla `fittracker-workouts`, a `firebase functions:list` pokazuje komplet 7 endpointow Garmin v2/nodejs22 wraz z `garminRevokeAllDevices`. **KROK USERA:** fizyczny Garmin nie jest podlaczony (`system_profiler`/`diskutil`: brak urzadzenia); wykonac G1-G9 z `docs/X25-REAL-DEVICE-CHECKLIST.md` na izolowanym koncie technicznym i dolaczyc FIT/ingest/401/403 oraz jedna sesje w web. Do tego czasu checkbox pozostaje otwarty.
- [x] **Z227: spojne zarzadzanie urzadzeniami i dostepem.** Web/iOS/Android pokazuja te same sparowane urzadzenia, ostatnia synchronizacje, oczekujace zdarzenia, stan Health/FIT i akcje odswiez/odlacz. Jedno `pro` obejmuje oba zegarki; Apple Watch dziedziczy capability snapshot z iPhone, Garmin dostaje minimalny serwerowo podpisany stan. Web nie sprzedaje i nie obiecuje triala, lecz pokazuje aktualny status i kieruje do odpowiedniej aplikacji mobilnej. Zero osobnego paywalla na zegarku. **Dowod:** commit `9cc3a8de`; jeden server read model zasila web/iOS/Android, Apple Watch ma lifecycle report + zachowujacy kolejke revoke/capability, a Garmin podpisana HMAC koperta i lifecycle-only pending/FIT. Testy: app 147 plikow/1261 PASS, Functions 179 PASS, Firestore rules 170 PASS, lint/typecheck/build web+mobile/dist smoke/offline PASS; Xcode scheme `App` z Watch/widgets i Android `assembleDebug` PASS, Monkey C epix2 PASS. Bundle initial 1 269 850/1 536 000 B (266 150 B zapasu, limit bez zmian). `firebase deploy --only functions` oraz `firestore:rules` PASS; `functions:list` potwierdza 10 aktywnych endpointow Garmin/device v2/nodejs22, w tym `linkedDevices`, `reportAppleWatchStatus`, `unlinkLinkedDevice`. Fizyczne unlink/revoke/expiry pozostaja celowo w cross-device Z228 (D1-D4), nie blokuja implementacyjnego Z227.
- [ ] **Z228: testy sekwencji miedzy powierzchniami.** Minimum: rozpocznij na iOS -> seria Watch -> edycja web -> powrot i finish; rozpocznij Android -> Garmin offline -> reconnect/ingest -> historia web; rownolegla seria telefon+zegarek; reinstall telefonu; logout/delete/revoke; wygasniecie triala podczas niewyslanej sesji. Wynik: jedna sesja, brak utraty/duplikatu, te same wartosci i jawny status sync. **Stan automatyczny:** wspolny per-set LWW `(updatedAt, updatedEventId)` jest zachowywany w drafcie i Firestore, konflikt rewizji pobiera cloud i robi rebase zamiast globalnego local-wins, Watch odroznia `expired` (wolno domknac juz aktywna sesje) od `revoked` (fail closed), a Garmin stosuje ten sam tie-break w transakcyjnym finalnym merge. Testy sekwencji pokrywaja iOS -> Watch -> web -> finish (jedna sesja, 2 serie, 1220 kg), Android -> Garmin offline -> lost ACK -> web (jeden doc, brak podbicia revision), rownolegly tie/replay, reinstall oraz expiry/revoke. Pelne testy: aplikacja 148 plikow/1268 PASS, Functions 180 PASS; emulator Auth/Firestore/Functions 13/13 PASS po naprawie harnessu, ktory teraz rzeczywiscie uruchamia `syncUserProfile`; mock UI E2E 194/194 PASS. **KROK USERA:** fizyczny iPhone jest widoczny tylko jako offline, brak fizycznego Watch oraz Androida (`adb devices` puste); wykonac W1-W9, G1-G9 i D1-D4 z `docs/X25-REAL-DEVICE-CHECKLIST.md` na kontach technicznych, z logami jednej sesji w web, 401/403/relink, HKWorkout i FIT. Do tego czasu checkbox pozostaje otwarty.
  **Dowod deployu Z228:** `firebase deploy --only functions --project fittracker-workouts` z zielonego commita `28ebcc29` zakonczone sukcesem; predeploy Functions 180 PASS/7 skipped, wszystkie 47 funkcji zaktualizowane.
- [ ] **Z229: Connect IQ Store i watchOS release readiness.** Apple Watch target/widgets maja ten sam `MARKETING_VERSION` i build co iOS, poprawne signing/entitlements/privacy/Health review notes i sa w archive. Garmin: pobierz wszystkie rodziny z `manifest.xml`, build warning-free poza udokumentowanymi wyjatkami, eksport podpisanego `.iq`, test okragly/prostokatny i touch/non-touch, ikona 1024, screenshoty, opis/uprawnienia/privacy PL/EN oraz submit. Klucz developerski pozostaje poza repo z backupem. **Stan lokalny:** App/Watch/widgets maja `1.0.0 (84)`, oba executable privacy manifests (UserDefaults `CA92.1`) i review notes; unsigned structural archive potwierdzil osadzenie Watch, widgets oraz privacy. Wszystkie 16 ID Garmin buduja sie na SDK 9.2.0; podpisany `.iq` ma 27 target PRG, 644900 B i SHA-256 `5f4f4b5d3b638b3b69d957d21573bb79d3b87c545e7f9a5c09bf7cac7c8a8c98`. Symulator PASS: FR255 round/buttons i Venu Sq 2 rectangle/touch; listing PL/EN, permission reasons, privacy URL, ikona 1024 i dwa prawdziwe screenshoty sa w `garmin/release/`. Lokalny backup klucza poza repo ma ten sam checksum i mode 600. **KROK USERA Apple:** wlaczyc App Attest dla App ID `com.grzegorzjasionowicz.strengthsave` w Apple Developer Certificates, Identifiers & Profiles, odtworzyc profil `Strength Save App Store`, wykonac podpisany archive i zweryfikowac podpis/entitlements App+Watch+widgets; aktualny nowo wygenerowany profil nie zawiera App Attest, wiec archive poprawnie failuje i entitlement nie zostal usuniety. **KROK USERA Garmin:** wykonac fizyczne G1-G9 na koncie technicznym, dodac screenshot planu, zrobic szyfrowany off-host backup klucza, wgrac `.iq` i materialy do Connect IQ, przejsc walidacje i Submit for review. Checkbox pozostaje otwarty do podpisanego archive, real-device i submisji.
  **Bramki lokalne Z229:** test release najpierw 3/3 RED przez brak materialow, potem 3/3 PASS; pelna aplikacja 149 plikow/1271 PASS, lint/typecheck/mobile build PASS; `xcodebuild` Release bez signing 112-targetowego schematu PASS i produkt zawiera App `1.0.0 (84)`, `Watch/StrengthWatch.app`, widgets oraz oba privacy manifests. Normalny podpisany archive failuje wylacznie na brak App Attest w profilu, z jawnym komunikatem Xcode.
- [x] **Z230: wspolny branding, copy i release contract.** Sprawdz nazwe, ikone, akcent, terminologie, PL/EN, jednostki, status offline/sync i obietnice funkcji w produkcie oraz listingach App Store/Google Play/Connect IQ. Nie obiecuj funkcji niedostepnej na danym urzadzeniu. Przygotuj jedna mape wersji i artefaktow: web commit, iOS+Watch build, Android versionCode i Garmin manifest version. **Dowod:** commit `0bc40970`; testy kontraktu najpierw 5 RED/2 PASS, potem 7/7 PASS; `Strength Save` i `#CCFC22` sa wspolne dla instalowalnych powierzchni, a gotowy Android `HealthSyncPlugin` jest teraz osiagalny przez wspolny bridge zamiast blednego iOS-only guard. `release/` zawiera prawdziwe platformowe listingi PL/EN i maszynowa mape artefaktow; App Store Connect en-US zaktualizowany po dry-run (PATCH 200, niezalezny read-back 3/3), bez obietnicy niekwalifikowanego triala ani Garmina przed submisja. Garmin 27/27 export PASS (`644900` B, SHA-256 `5f4f4b5d3b638b3b69d957d21573bb79d3b87c545e7f9a5c09bf7cac7c8a8c98`); iOS+Watch/widgets Release no-sign PASS; Android podpisany AAB `1.0.0 (6)` PASS (`16307381` B, SHA-256 `6269194373192f2f01dcdcd714a755f024c9caffa552a0158bed9ec4372af82d`). Pelna aplikacja 151 plikow/1278 testow, lint/typecheck/build/mobile, dist smoke/offline i bundle 1270007/1536000 B PASS. `docs/X25-BRAND-REVIEW.md` potwierdza, ze zamrozony onboarding nie byl zmieniany. **KROK USERA Google Play:** Play Console -> Store presence -> Main store listing, wkleic `release/google-play/en-US.md` i `pl-PL.md`, ustawic privacy URL `https://strengthsave.app/legal/privacy.html`, zapisac i odczytac oba locale; brak poświadczeń Google Play API w sesji.

**Brama fazy:** macierz nie ma nieudokumentowanych brakow P0/P1; ten sam plan i dwa treningi referencyjne daja identyczne kanoniczne dane na pieciu powierzchniach; realny Apple Watch i Garmin przechodza scenariusz offline -> reconnect bez utraty i duplikatow.

### FAZA 3 - trial, cennik i poprawny paywall

- [ ] **Z207: konfiguracja obu sklepow i RevenueCat.** App Store Connect: monthly 14,99 zl / $3.99 + `ONE_WEEK`; yearly 119,99 zl / $31.99 + `TWO_WEEKS`; pozostale terytoria przez equalizacje. Google Play: odpowiadajace subskrypcje/base plans/offers 7 i 14 dni, gdy aplikacja jest juz w Internal Testing. Podlacz oba sklepy do tego samego entitlement/offering w RevenueCat. Najpierw status/dry-run, potem zastosowanie i ponowny odczyt cen/ofert. **Stan niezalezny:** ASC read-before wykazal 14,99/4,99 + 14 dni oraz 99,99/29,99 + 30 dni. Test kontraktu byl 3/3 RED; po zmianie 3/3 PASS. Dry-run: 307 zmian cen i 350 ofert; apply: 307 cen zaplanowanych od 2026-08-12 oraz 350 starych ofert zastapionych 350 nowymi. Read-back: monthly 14,99 PLN / 3.99 USD + `ONE_WEEK` 175/175, yearly 119,99 PLN / 31.99 USD + `TWO_WEEKS` 175/175, zero pozostalych zmian. RevenueCat read-back: Apple app `app04502c737f`, oba Apple products sa w jednym `pro` i pakietach `$rc_monthly`/`$rc_annual` offeringu `default`; test automatyzacji RC najpierw RED przez brak skryptu, potem lacznie 6/6 PASS. **KROK USERA Google Play:** brak aplikacji Internal, service credentials, RC `google_play` app i Android public SDK key; wykonac 7 krokow z `docs/X25-MONETIZATION-STATUS.md`, po czym `scripts/revenuecat_release.py apply` ma pokazac cztery wspolne wiersze i `APPLY + READ_BACK OK`. Checkbox pozostaje otwarty do read-backu Google Play + RevenueCat.
- [x] **Z208: eligibility-aware paywall na obu platformach.** iOS: `checkTrialOrIntroductoryPriceEligibility`. Android: uzyj aktualnego kontraktu RevenueCat dla dostepnych Play offers/purchase options i nie zakladaj eligibility na podstawie samego produktu. Trial pokazuj tylko przy potwierdzonym `eligible` lub dostepnej, kwalifikujacej opcji; `unknown` i `ineligible` nie dostaja trial copy. Obsluz brak Offering, brak intro price/offer, blad sieci i restore. Usun z web copy zalozenie `tylko iPhone`; web ma wskazac odpowiednia aplikacje mobilna bez uruchamiania checkoutu. **Dowod:** TDD: `src/test/purchases-platform.test.ts` + `src/test/paywall-eligibility.test.tsx` najpierw RED (`revenueCatApiKeyForPlatform is not a function`), po implementacji `vitest run` 5/5 PASS. `src/lib/purchases.ts`: `revenueCatApiKeyForPlatform` (klucz per platforma, web=null, zero fallbacku miedzy sklepami), `resolvePurchaseOptions` (iOS: darmowy introPrice + status RC 2=eligible/1,3=ineligible/0,throw=unknown; Android: wylacznie faktyczna opcja z `freePhase`, ineligible=defaultOption/basePlan, brak opcji=unknown), `trialPresentation` (tylko eligible dostaje trial copy). `Paywall.tsx`: warunkowy trialLine/CTA/renewalNote (nowe klucze `paywall.ctaNoTrial`, `paywall.renewalNoteNoTrial` PL/EN), Android kupuje dokladnie pokazana opcje przez `purchaseSubscriptionOption`. Usuniete bezwarunkowe obietnice `30 dni` z `paywall.teaser.cta` i `probanner.desc`; `paywall.webNote` juz wskazuje iOS i Android bez checkoutu. Bramki: aplikacja 155 plikow/1289 PASS, typecheck, lint, build, build:mobile, dist smoke, bundle 1 271 372/1 536 000 B PASS.
- [x] **Z209: dynamiczna prezentacja ceny.** Roczny domyslny. Pokaz lokalizowana cene laczna, cene efektywna/miesiac i oszczednosc wyliczona wzgledem pakietu monthly. Nie hardkoduj `4 miesiace gratis`, jezeli lokalne ceny daja inny wynik. Testy PL/EN i duzych cen. Lista korzysci ma mowic o Apple Watch i Garmin zgodnie z faktycznie gotowa macierza, bez sugerowania osobnej oplaty. **Dowod:** TDD: `src/test/paywall-pricing.test.ts` RED (brak `yearlyValueSummary`), po implementacji 6/6 PASS (PL 10,00 zl/33%, EN $2.67/33%, IDR 36%, brak monthly/inna waluta/ujemna oszczednosc = null). `yearlyValueSummary` preferuje `pricePerMonthString` ze sklepu, fallback Intl per locale; badge `paywall.badgeSavings` ({percent}% wyliczone, stary hardkod `5 mies. gratis` usuniety) i linia `paywall.perMonthEffective` pod cena roczna. Roczny pozostaje domyslny. `paywall.feature4` mowi o Apple Watch i Garmin w cenie (macierz Z223: oba parytety kodowo domkniete), bez osobnej oplaty. Bramki: 156 plikow/1295 PASS, typecheck, lint, build, build:mobile, dist smoke, bundle 1 271 856/1 536 000 B PASS.
- [ ] **Z210: sandbox/TestFlight + Play Internal.** Na obu platformach: eligible monthly 7 dni, eligible yearly 14 dni, wykorzystany trial, `unknown`, purchase, cancel, restore, offline/error. Zweryfikuj teksty regulaminu, privacy, auto-renew i brak mylacej obietnicy. Po zakupie/restore stan `pro` ma dojsc do web, Apple Watch i sparowanego Garmina bez ponownego zakupu; wygasniecie nie moze usunac danych ani niewyslanej sesji.

**Brama fazy:** paywall nigdy nie obiecuje triala bez potwierdzenia; ceny sa identyczne z App Store/Google Play, a jeden entitlement poprawnie propaguje sie na wszystkie powierzchnie.

### FAZA 4 - szybkie oszczednosci bez zmiany funkcji

- [ ] **Z211: batching telemetrii.** Flush z 30 s na 5 min, a dodatkowo przy `online`, przejsciu aplikacji w tlo i zamknieciu tam, gdzie platforma pozwala. Bufor localStorage i retry pozostaja. Test fake timers: maks. 12 okresowych flushy/h zamiast 120.
- [ ] **Z212: deduplikacja push registration.** Lokalnie przechowuj hash tokenu, uid i czas potwierdzenia. Backend wywoluj tylko po zmianie tokenu/uid albo po 30 dniach. Event refresh tokenu musi natychmiast rejestrowac nowy token. Logout usuwa stan poprzedniego uid.
- [ ] **Z213: pomiary i cykle per ekran.** Dashboard pobiera najnowszy pomiar (`limit(1)`) i aktywny cykl. Pelne pomiary/cykle pozostaja na swoich ekranach, z paginacja gdzie potrzebna. Nie zmieniaj wynikow UI.
- [ ] **Z214: aktywnosci per ekran.** Dashboard pobiera ograniczone ostatnie okno potrzebne do kart. Pelna historia Strava/manual jest paginowana na widokach historii/analityki. Porownaj wyniki kart przed/po na fixture z historia >500 rekordow.

**Brama fazy:** testy funkcjonalne 1:1; pomiar odczytow zimnego Dashboardu z raportem przed/po; cel <=100 dokumentow dla standardowego startu, bez ukrywania historii.

### FAZA 5 - historia treningow i statystyki bez stalego listenera 500

- [ ] **Z215: mapa zaleznosci od calej historii.** Wypisz wszystkie komponenty liczace streak, PR, objetosc, wykresy i poprzedni ciezar. Dla kazdego okresl recent realtime, paginowana historia albo agregat. Nie implementuj, dopoki testy fixture nie zamroza obecnych wynikow.
- [ ] **Z216: recent realtime + pagination.** Globalny listener nie moze zawsze pobierac 500 treningow i 365 pomiarow. Ostatnie treningi zostaja realtime; starsze sa pobierane kursorem na zadanie. `AutoSyncOnReconnect` ma synchronizowac kolejke/draft bez utrzymywania szerokiego listenera na kazdym ekranie.
- [ ] **Z217: agregaty statystyk.** Jezeli Dashboard potrzebuje all-time, dodaj wersjonowany dokument agregatu aktualizowany idempotentnie przy finalizacji/edycji/usunieciu treningu. Przygotuj bezpieczny, wznawialny backfill i test rownowaznosci agregatu z obecnymi obliczeniami. Brak agregatu musi miec bezpieczny fallback.
- [ ] **Z218: integralnosc offline.** Sekwencje: trening offline -> kill -> resume -> finalizacja -> reconnect; edycja starego treningu; usuniecie; konflikt urzadzen; paginacja bez duplikatow/luk. Dane usera maja wygrac nad oszczednoscia.

**Brama fazy:** wszystkie statystyki i historia sa identyczne, a stale subskrypcje nie skaluja sie z cala historia usera.

### FAZA 6 - release engineering i dostepnosc

- [x] **Z219: napraw web dist smoke.** Skrypt wykrywa base z wygenerowanego `index.html`, serwuje assety spod `/strength-save/` dla web i z relatywnego base dla mobile. **Dowod:** stary skrypt odtworzyl `#root pusty po 15 s`; po poprawce `check:dist-smoke` oraz `check:dist-offline` PASS na buildzie web.
- [ ] **Z220: warningi a11y.** Dodaj wymagane `DialogTitle`/description albo prawidlowe wizualnie ukryte etykiety. Nie zmieniaj layoutu onboardingu. Usun podwojna rejestracje pluginu w testach.
- [ ] **Z221: bundle.** Odzyskaj min. 150 KB zapasu initial JS przez istniejace granice routingu/dynamic import, bez podnoszenia limitu. Sprawdz start i offline na iPhone/mobile viewport.
- [ ] **Z222: obserwowalnosc kosztow i funnelu.** Zdarzenia lokalnie buforowane: register_started/profile_created/email_verified/paywall_viewed/trial_started/purchase_failed. Bez danych treningowych i bez osobnego zapisu per klik. Dodaj dashboard/raport dzienny kosztow Firestore, Functions i maili w granicach dostepnych API.

### FAZA 7 - pelne bramki i wydanie

- [x] `npm run test` - 139 plikow, 1224 testy PASS po poprawce P0 obu platform
- [x] `npm --prefix functions test` - 18 plikow PASS + 1 skipped, 156 PASS + 7 skipped
- [x] `npm run typecheck`
- [x] `npm --prefix functions run typecheck`
- [x] `npm run lint`
- [x] `npm run build && npm run check:bundle-budget && npm run check:dist-smoke && npm run check:dist-offline` - PASS; initial JS 1 532 843 / 1 536 000 B
- [x] `npm run build:mobile && npm run check:dist-smoke` - PASS; natywny adapter 1,93 kB, Firebase 732,22 kB
- [x] `npm run e2e:mock` - 194/194 PASS
- [x] kontrolny build Xcode iOS Simulator bez podpisu - exit 0 przy `generic/platform=iOS Simulator`, plugin App Check rozwiazany przez SwiftPM
- [x] Android `assembleDebug` + podpisany `bundleRelease` - BUILD SUCCESSFUL; AAB 15,5 MB, `versionCode 6`, podpis zweryfikowany, SHA-256 artefaktu `099bb88f842dcf6234e61fc9e1929e6ad80547b0a28b82f9859397a08f08303f`
- [x] App Attest + Play Integrity config/API + Functions deploy - `syncUserProfile` ACTIVE, kontrolowane produkcyjne callable smoke iOS i Android PASS
- [x] emulator auth/functions: 7/7, rejestracja iOS/Android + zachowanie web invite-only
- [ ] Kontrakt/macierze: wspolne fixture i testy kompatybilnosci web/iOS/Android/Apple Watch/Garmin oraz brak nieudokumentowanych roznic P0/P1
- [ ] Apple Watch: build targetu i widgets w archive + realny iPhone/Watch, offline/reconnect/kill-resume/finish/discard/HealthKit bez duplikatu
- [ ] Garmin: testy Functions i kontraktu + build na wszystkich urzadzeniach manifestu + podpisany eksport `.iq` + realny epix + smoke backendu na koncie technicznym
- [ ] Real devices mobile: TestFlight iPhone App Attest oraz Play Internal Android Play Integrity; register -> email code -> obecny onboarding -> paywall -> trial/purchase -> pierwszy trening -> background/resume -> sync
- [ ] Cross-device E2E: iOS<->Watch<->web oraz Android<->Garmin<->web, w tym offline, retry, konflikt, logout/revoke i jedna sesja w historii
- [ ] Metadata trzech sklepow: App Store, Google Play i Connect IQ; screenshoty, opis, privacy/data safety/uprawnienia Health/FIT, review notes i konto demo/techniczne
- [ ] Wpis zbiorczy X25 do `DECYZJE.md`, aktualizacja `PLAN.md` i `docs/PLAN_RELEASE_1.0.md`
- [ ] Web deploy z zielonego commita; build iOS+Apple Watch do obu grup TestFlight, AAB Android do Play Internal i Garmin `.iq` zaakceptowany w Connect IQ. Publiczny release ma byc wspolnym checkpointem calego produktu; jezeli Connect IQ publikuje automatycznie po review, udokumentuj najblizsze mozliwe wspolne okno.

---

## 3. Strategia commitow i wdrozen

1. `test(auth): odtworz brak profilu po rejestracji native (Z203)`
2. `fix(auth): atestowana rejestracja i odporny bootstrap profilu iOS/Android (Z204-Z206)`
3. `test(parity): macierz i wersjonowany kontrakt pieciu powierzchni (Z223-Z224)`
4. `feat(watch): parytet Apple Watch i Garmin bez utraty offline (Z225-Z226)`
5. `feat(devices): wspolny entitlement zarzadzanie i cross-device e2e (Z227-Z230)`
6. `fix(iap): trial 7/14 i eligibility-aware paywall (Z207-Z210)`
7. `perf(firebase): batching telemetrii i deduplikacja push (Z211-Z212)`
8. `perf(firebase): waskie zapytania dashboardu i paginacja (Z213-Z218)`
9. `fix(release): smoke a11y i zapas bundle (Z219-Z222)`
10. `chore(release): bramki dokumentacja i build X25 wszystkich powierzchni`

Stage'uj pliki imiennie. Nigdy `git add -A`. Nie lacz deployu Functions z niezweryfikowana zmiana klienta auth.

---

## 4. Warunek zakonczenia X25

X25 jest zakonczony dopiero, gdy:

1. blad `User profile missing` nie wystepuje i nowy user iOS oraz Android dochodzi do obecnego onboardingu;
2. web bez invite nadal nie tworzy konta aplikacyjnego;
3. macierz web/iOS/Android/Apple Watch/Garmin nie ma nieudokumentowanego braku P0/P1, a roznice urzadzeniowe sa jawne i celowe;
4. App Store, Google Play i paywall maja ceny 14,99/119,99 zl oraz $3.99/$31.99 i triale 7/14;
5. trial copy jest zgodne z eligibility, a jedno `pro` obejmuje wszystkie powierzchnie bez osobnego zakupu na zegarku;
6. Apple Watch przechodzi real-device offline/reconnect/kill-resume i tworzy dokladnie jeden HKWorkout;
7. Garmin przechodzi real-device offline/reconnect/ingest, tworzy FIT, nie duplikuje sesji i ma zaakceptowany artefakt Connect IQ;
8. identyczne fixture daja te same kanoniczne serie, czas, tonaz i stan treningu na wszystkich klientach;
9. funkcje aplikacji, historia, offline i synchronizacja pozostaja 1:1, a kazdy blad ma retry/discard/revoke;
10. raport przed/po pokazuje spadek odczytow i zapisow, lacznie z budzetem requestow Garmin;
11. wszystkie bramki sa zielone, web/functions wdrozone, iOS+Watch jest na TestFlight, Android w Play Internal, a Garmin zaakceptowany/gotowy w Connect IQ przed wspolnym publicznym wydaniem;
12. onboarding nie zostal przebudowany ani skrocony w ramach tej pracy.
