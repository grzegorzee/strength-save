# Prompt: autonomiczne wykonanie X25 w petli goal-driven

## Wiadomosc do wklejenia w nowym oknie

```text
/goal Wykonaj w calosci docs/PLAN-X25-LAUNCH-2026-08-10.md i ujednolic Strength Save jako jeden produkt na web, iOS, Android, Apple Watch i Garmin. Najpierw przeczytaj CLAUDE.md, caly plan X25, garmin/README.md, docs/PLAN-X16B-2026-07-19.md, docs/PLAN-GARMIN-V3-2026-07-28.md, git status i git log. Pracuj autonomicznie przez /loop, zawsze od pierwszego niezablokowanego checkboxa, test-first i z dowodem przy zadaniu. P0 „User profile missing” ma juz wspolny kontrakt App Check dla iOS/App Attest i Android/Play Integrity; nie cofaj go, web pozostaje invite-only. Zacznij od Z223-Z224: macierzy funkcji i wersjonowanego kontraktu danych, potem domknij Apple Watch, Garmin, wspolny entitlement/cross-device E2E, trial 7/14, ceny 14,99/119,99 zl i $3.99/$31.99 w App Store, Google Play i RevenueCat, eligibility-aware paywall, redukcje kosztow chmury, smoke/a11y/bundle i wspolny release pieciu powierzchni. Jedno PRO obejmuje wszystkie klienty; checkout jest tylko na iOS/Android, bez osobnego paywalla na zegarku. Spojnosc oznacza identyczna semantyke i dane, nie kopiowanie pelnego UI telefonu na zegarek. NIE przebudowuj onboardingu i nie ruszaj `animacje-cwiczen/`. Nie pytaj o odwracalne decyzje; kroki zalezne od konsol sklepow lub realnych urzadzen wykonuj sam, gdy masz dostep, a w przeciwnym razie zapisuj jako KROK USERA i kontynuuj cala niezalezna prace.
```

Po uruchomieniu goal wlacz petle komunikatem:

```text
/loop Przeczytaj docs/PROMPT-X25-LOOP-2026-08-10.md i wykonaj kolejna spojna porcje pracy z docs/PLAN-X25-LAUNCH-2026-08-10.md dla web/iOS/Android/Apple Watch/Garmin. Stan odtwarzaj z checkboxow, git status i git log. Kontynuuj do spelnienia warunku zakonczenia X25; nie deklaruj sukcesu bez wynikow bramek, real-device i cross-device.
```

## Stan startowy po sesji 2026-08-10

- Z203-Z205 sa wykonane i wdrozone; nie implementuj ich od nowa. Backend akceptuje tylko dokladne zweryfikowane App ID iOS/Android, a web bez invite jest odrzucany.
- iOS: App Attest TTL 3600 s, API aktywne, build 84 przygotowany; produkcyjny kontrolowany smoke PASS.
- Android: Play Integrity TTL 3600 s, API aktywne, SHA-256 upload key w Firebase, plugin zsynchronizowany, AAB `versionCode 6` podpisany; produkcyjny kontrolowany smoke PASS.
- Z206 ma emulator 7/7 i produkcyjne smoki dla obu App ID. Pozostaja prawdziwe atestacje: build 84 z TestFlight na iPhone i AAB 6 z Play Internal na Androidzie.
- Apple Watch: target watchOS 10+ i widgets sa osadzone w iOS, build number dziedziczy 84. Dzialaja WatchConnectivity, offline queue, plan dnia, edycja/one-tap, timer, PL/EN, kg/lbs, HealthKit z HR i dedup Health. Pelny real-device scenariusz nadal jest wymagany; macierz ma sprawdzic braki wzgledem Garmin v3.
- Garmin: Connect IQ v3 dziala na epix Gen 2 i w symulatorze; ma parowanie, szybki/planowy trening, przerwy 90/150, czas/tonaz, discard, FIT z HR, kolejke offline i produkcyjny backend. Nie ma jeszcze wielourzadzeniowego eksportu `.iq`, kompletnego listingu ani submisji do Connect IQ Store.
- Ostatnie bramki: aplikacja 1224 PASS, Functions 156 aktywnych PASS, E2E 194 PASS, lint/typecheck/build/mobile/dist/offline/bundle, Xcode i Gradle PASS.
- Z219 jest wykonane: web dist smoke respektuje Vite base. Z206 domknij po dystrybucji obu buildow. Pierwszym niezaleznym zadaniem nowego zakresu jest Z223, potem Z224; dopiero na tej podstawie zmieniaj zegarki i monetyzacje.

---

## Kontrakt dla agenta w kazdej iteracji

Pracujesz w `/Users/grzegorzjasionowicz/FIRMA/projekty/strength_save` nad X25. User nie bedzie odpowiadal w trakcie. Masz samodzielnie diagnozowac, implementowac, testowac, dokumentowac i wykonywac odwracalne kroki.

### Start iteracji

1. Przeczytaj `/Users/grzegorzjasionowicz/.codex/RTK.md` i `CLAUDE.md`.
2. Przeczytaj w calosci `docs/PLAN-X25-LAUNCH-2026-08-10.md`. Przy Z223-Z230 przeczytaj tez `docs/PLAN-X16B-2026-07-19.md`, `docs/PLAN-GARMIN-V3-2026-07-28.md` i `garmin/README.md`.
3. Uruchom `rtk git status --short` i `rtk git log --oneline -15`.
4. Stan prawdy to checkboxy planu + commity + wyniki testow, nie pamiec poprzedniej iteracji.
5. Wybierz pierwsze nieodhaczone zadanie. Z206 moze czekac na dystrybucje, wtedy przejdz do Z223. Nie przeskakuj dalej, chyba ze zadanie jest realnie zablokowane zewnetrznie i zostalo oznaczone `KROK USERA` z dowodem.

### Sposob pracy

1. Dla bugu najpierw root cause i czerwony test odtwarzajacy dokladna sekwencje.
2. Wprowadz najmniejsza zmiane spelniajaca kontrakt i niezmienniki.
3. Uruchom test celowany, potem bramke fazy.
4. Odhacz zadanie w planie i dopisz jednoliniowy dowod: komenda, wynik, istotny artefakt.
5. Commituj zamknieta faze lub spójny task. Stage'uj pliki imiennie, nigdy `git add -A`.
6. Kazda iteracje zakoncz raportem: wykonane, testy, commit, pierwszy nastepny checkbox, realne kroki usera.

### Najwazniejszy P0

Aktualny blad na iPhone: po utworzeniu Firebase Auth brakuje `users/{uid}`. Klient native pokazuje otwarta rejestracje bez invite (`src/pages/Login.tsx`), ale backend `syncUserProfile` odrzuca kazdy nowy profil bez invite (`functions/src/registration.ts`). `UserContext` buduje wtedy fallback `pending_verification`, a `EmailVerificationGate` wywoluje `requestEmailVerificationCode`, ktore zwraca `User profile missing`.

Zachowaj naprawiony kontrakt, nie wracaj do symptomu:

- native iOS bez invite: dozwolony tylko po Firebase App Check/App Attest i dla zatwierdzonego App ID;
- native Android bez invite: dozwolony tylko po Firebase App Check/Play Integrity i dla zatwierdzonego App ID;
- web/unattested bez invite: nadal odrzucony;
- poprawny invite: nadal dziala;
- `registrationOpen=false`: nadal blokuje;
- nie przywracaj spoofowalnego `request.data.platform`;
- nie tworz profilu klientem ani przez poluzowanie Firestore rules;
- `UserContext` nie moze pokazac bramki kodu, dopoki profil nie zostal pomyslnie utworzony/zaladowany;
- istniejace osierocone konto Auth ma odzyskac profil przez idempotentny retry po wdrozeniu poprawki;
- pelna sekwencja emulator/TestFlight/Play Internal: register -> profile -> send code -> verify -> istniejacy onboarding.

Adapter App Check jest juz wdrozony w `src/lib/native-callable.ts`; iOS i Android pobieraja token natywnym pluginem, a callable dostaje oficjalne naglowki. Nie zamieniaj go na webowy App Check w WKWebView bez dowodu kompatybilnosci. Enforce wlaczaj stopniowo i tylko po smoke monitoringu, ale `syncUserProfile` musi zawsze sprawdzac atestacje zanim zezwoli na brak invite.

### Zakres monetizacji

- monthly: 14,99 zl / $3.99, trial 7 dni;
- yearly: 119,99 zl / $31.99, trial 14 dni;
- roczny domyslny; ok. 33% oszczednosci, ok. 4 miesiace gratis;
- zrodlo prawdy ceny i triala: App Store/Google Play przez RevenueCat;
- eligibility albo dostepna kwalifikujaca oferta sprawdzana per produkt i platforma;
- `eligible`: wolno pokazac trial;
- `ineligible`/`unknown`: zwykla subskrypcja bez obietnicy triala;
- zachowaj restore, Terms, Privacy, auto-renew copy i obsluge bledow.
- jeden entitlement `pro` obejmuje web, iOS, Android, Apple Watch i Garmin; nie tworz osobnych planow ani doplat za zegarki;
- checkout/restore tylko przez App Store i Google Play. Web pokazuje status i prowadzi do aplikacji mobilnej, a zegarki tylko respektuja serwerowo/poprzez telefon potwierdzony dostep;
- po zakupie, restore albo zmianie planu entitlement ma propagowac sie bez ponownego zakupu. Wygasniecie nie moze usunac historii ani niewyslanych lokalnie zdarzen.

### Zamrozony onboarding

Nie zmieniaj `src/pages/Onboarding.tsx`, `src/components/PlanWizard.tsx`, `src/components/PlanPreview.tsx`, liczby krokow, tekstow ani layoutu onboardingu. Mozesz zmieniac auth/weryfikacje przed nim i paywall po nim. Jezeli test wymaga zmiany setupu auth, nie zmieniaj asercji dotyczacych obecnego wizardu.

### Jeden kontrakt na pieciu powierzchniach

Najpierw Z223: utworz macierz funkcji z jawna klasyfikacja `pelny`, `urzadzeniowo uproszczony`, `nie dotyczy`, `brak`. Nie zakladaj, ze identyczny produkt wymaga identycznego UI. Web/iOS/Android sa pelnymi klientami, Apple Watch jest sparowanym kontrolerem iPhone, a Garmin samodzielnym klientem sparowanym z uid przez backend.

Niezmienniki wspolne:

- kanoniczne kg, a lbs tylko w prezentacji; brak utraty precyzji w round-tripie;
- te same `uid/deviceId/dayId/sessionId/exerciseId/setIndex/eventId/at`, typy serii i znaczenie finish/discard;
- wersjonowany protokol, kompatybilnosc stary klient/nowy serwer i nowy klient/stary serwer;
- eventy idempotentne, ACK dopiero po trwalym zapisie, lokalne nowsze serie nie sa nadpisywane starym snapshotem;
- defaults przerw 90 s miedzy seriami i 150 s miedzy cwiczeniami, bez cichego resetowania lokalnej zmiany;
- PL/EN, nazwy, jednostki, status pending/offline/error/retry oraz pojedyncza kanoniczna sesja;
- logout, delete account i revoke urzadzenia odcinaja dalszy dostep, ale nie kasuja w ciemno kolejki bez jawnego wyboru usera.

### iOS i Android

- Obie aplikacje maja wyjsc w tym samym publicznym oknie. Nie oznaczaj release jako gotowy, gdy tylko jedna platforma ma dzialajaca rejestracje, trial lub zakup.
- Kazda zmiana auth/IAP ma test kontraktu wspolnego oraz osobne potwierdzenie zachowania StoreKit i Google Play Billing.
- Kolejny checkpoint dystrybucyjny to iOS build 84 w obu grupach TestFlight i Android AAB 6 w Play Internal.
- Po przyjeciu Play App Signing pobierz SHA-1 i SHA-256 certyfikatu App signing. Dodaj oba do Firebase; SHA-1 jest potrzebny Google Sign-In, SHA-256 App Check/Play Integrity.
- W Play Console polacz projekt Cloud `fittracker-workouts` w App integrity -> Play Integrity API. Dopiero instalacja ze sklepu jest dowodem prawdziwego tokenu `PLAY_RECOGNIZED`.
- Subskrypcje Google Play i ich triale musza byc podlaczone do tego samego entitlement/offering RevenueCat co iOS przed publicznym wydaniem.

### Apple Watch

- Rozbuduj istniejace `ios/App/WatchApp`, `ios/App/WatchWidgets`, `src/lib/watch-bridge.ts`, `useWatchPlanPreview` i `useWatchWorkoutSync`; nie tworz drugiej architektury.
- Zachowaj WatchConnectivity application context, UserDefaults offline, `transferUserInfo`, merge lokalnego postepu, one-tap, PL/EN, kg/lbs, HealthKit z HR, komplikacje i `hkSession` zapobiegajace duplikatowi Health.
- Na podstawie macierzy domknij operacyjny standard Garmin v3: szybki trening, przerwy 90/150, czas+serie+tonaz, jawny discard oraz pending/error/retry, o ile brak zostanie potwierdzony w kodzie. Nie usuwaj dzialajacych funkcji.
- Test realny iPhone+Watch jest obowiazkowy: zerwany Bluetooth, telefon offline, kill/resume obu aplikacji, nowy dzien, rownolegla seria, finish/discard, haptyka, jedno HKWorkout. Symulator nie jest dowodem haptyki, background ani HealthKit.
- Apple Watch ma ten sam build/marketing version/signing co aplikacja iOS i musi znalezc sie w archive wraz z widgets.

### Garmin

- Rozbuduj istniejace `garmin/` i Functions `garmin-pair/day/ingest/endpoints`; nie zamieniaj Connect IQ na Garmin Health API.
- Zachowaj v3: kod parowania, kompaktowy `garminDay`, szybki trening, serie, przerwy 90/150, zegar/tonaz, discard, FIT z HR, EventQueue i idempotentny ingest.
- Garmin komunikuje sie z backendem przez minimalny token urzadzenia mapowany do uid. Sprawdz entitlement, revoke, logout/delete, wygasly token, retry, nowy dzien i konflikt z telefonem bez ujawniania Firebase tokenow.
- Bez pollingu per sekunda: plan pobieraj przy starcie/manual refresh/rozsadnym TTL lub zmianie wersji; eventy trzymaj lokalnie i wysylaj paczka/finalizacja. Limit odpowiedzi i kompatybilny kompaktowy payload pozostaja.
- Nigdy nie koncz testowego treningu w symulatorze sparowanym z prywatnym kontem usera. Uzyj izolowanego konta technicznego i posprzataj tylko jego dane kontrolowanym mechanizmem.
- Przed Store: wszystkie urzadzenia z manifestu, okragly/prostokatny ekran, touch/non-touch, podpisany `.iq`, ikona 1024, screenshoty, PL/EN, privacy i uzasadnienie Communications/Fit/Sensor/UserProfile. Klucz developerski poza repo z backupem.

### Web i zarzadzanie urzadzeniami

- Web pozostaje invite-only i nie uruchamia checkoutu. Ma jednak pokazywac ten sam status `pro`, sparowane urzadzenia, last sync/pending/error i revoke oraz kierowac do iOS albo Android zamiast hardkodowanego `tylko iPhone`.
- Web, iOS i Android musza widziec ta sama historie i kanoniczny wynik treningu utworzonego na dowolnym zegarku. Ekrany malego zegarka moga byc uproszczone, ale zapisane dane nie.
- Wspolny cross-device E2E obejmuje co najmniej iOS->Watch->web oraz Android->Garmin->web, offline/reconnect, retry, konflikt, reinstall, logout/delete/revoke i wygasniecie triala z niewyslana sesja.

### Koszty bez utraty funkcji

Kolejnosc: telemetria 5 min/lifecycle, push token dedupe, latest measurement/active cycle na Dashboardzie, ograniczone activities + paginacja, dopiero potem recent realtime workouts + paginowana historia/agregaty. Nie zmniejszaj po prostu limitu 500, jesli zepsuje to streak, PR, all-time lub poprzedni ciezar. Najpierw test rownowaznosci na fixture >500 rekordow i pomiar odczytow przed/po. WatchConnectivity ma pozostac bez chmury per seria. Garmin zachowuje kompaktowy payload, cache/TTL i lokalna kolejke; raport kosztow obejmuje liczbe requestow Functions na typowy trening.

### Twarde zasady repozytorium

- Nie ruszaj ani nie cofaj `animacje-cwiczen/`.
- Nie usuwaj wygenerowanych wpisow App Check, Keep Awake ani Keyboard z `android/app/capacitor.build.gradle` i `android/capacitor.settings.gradle`.
- Nie usuwaj targetow `StrengthWatch`, `StrengthWatchWidgets`, ich signing/entitlements ani natywnego `WatchBridge`.
- Nie zmieniaj Garmina na zaleznosc od telefonu i nie usuwaj FIT/EventQueue/lokalnych ustawien. Backendowy token urzadzenia pozostaje zahashowany, revocable i minimalny.
- Dane usera sa swiete. Zero eksperymentalnych zapisow/usuniec na produkcji.
- Zachowaj PL/EN dla kazdego nowego tekstu w web/mobile, Swift Watch i obu Garmin resources.
- Zachowaj local-first, offline, background/resume i idempotencje synchronizacji.
- Nie wymuszaj sztucznego 1:1 ekranow zegarka z telefonem. Wymagaj 1:1 semantyki, danych i przewidywalnego wyniku.
- Nie podnos limitu bundle. Cel: min. 150 KB zapasu.
- Nie obchodz App Check poluzowaniem rules lub zaufaniem do klienta.
- Nie deployuj czerwonego commita. Functions i klient auth musza byc kompatybilne w kolejnosci wdrozenia.
- Krok wymagajacy Firebase/App Store Connect/Play Console/Connect IQ/realnego urzadzenia wykonaj sam, jesli sesja ma dostep. W przeciwnym razie udokumentuj dokladny `KROK USERA`, ale kontynuuj wszystkie niezalezne zadania.

### Bramy i stop

Pelna lista bramek jest w FAZIE 7 planu. Petla konczy sie dopiero po spelnieniu sekcji „Warunek zakonczenia X25”. Raport koncowy ma zawierac:

1. tabele Z203-Z230 z commitami i dowodami;
2. root cause i dowod naprawy `User profile missing`;
3. status App Attest, Play Integrity i web invite-only;
4. status cen/triali w ASC, Google Play i RevenueCat;
5. macierz funkcji web/iOS/Android/Apple Watch/Garmin z uzasadnionymi roznicami urzadzeniowymi;
6. wyniki realnego Apple Watch: offline/reconnect/background/HealthKit bez duplikatu;
7. wyniki Garmina: urzadzenia manifestu, realny zegarek, FIT/ingest bez duplikatu i artefakt Connect IQ;
8. pomiar Firestore/Functions/requestow Garmin przed i po;
9. wyniki wszystkich testow, buildow, cross-device E2E i real-device;
10. status deployu Functions/web, TestFlight iOS+Watch, Play Internal oraz Connect IQ, wraz ze wspolnym oknem release;
11. jawne potwierdzenie, ze onboarding nie byl przebudowywany i zadna funkcja nie zostala usunieta;
12. tylko rzeczywiste pozostale `KROKI USERA`.
