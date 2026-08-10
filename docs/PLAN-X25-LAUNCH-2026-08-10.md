# PLAN X25: rejestracja, monetyzacja, koszty chmury i release

**Data:** 2026-08-10  
**Cel:** usunac blokery publicznego wydania Strength Save, obnizyc koszt Firestore bez utraty funkcji i wdrozyc poprawny cennik/triale.  
**Tryb:** autonomiczny `/goal` + `/loop`, test-first, commit po kazdej zamknietej fazie.  
**Poza zakresem X25:** przebudowa i skracanie onboardingu. Obecny onboarding jest zamrozony.

---

## 0. Decyzje i niezmienniki

### Cennik docelowy

| Plan | Polska | USA | Efektywnie / mies. | Oszczednosc vs 12 miesiecy |
|---|---:|---:|---:|---:|
| Miesieczny | 14,99 zl | $3.99 | 14,99 zl / $3.99 | - |
| Roczny | 119,99 zl | $31.99 | 10,00 zl / $2.67 | ok. 33%, czyli ok. 4 miesiace gratis |

- Trial miesieczny: **7 dni**.
- Trial roczny: **14 dni**.
- Na paywallu roczny jest zaznaczony domyslnie.
- Cena, okres, oszczednosc i trial maja pochodzic z metadanych RevenueCat/App Store, a nie z hardkodowanych napisow.
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
3. Web pozostaje invite-only. Publiczna rejestracja bez invite dotyczy natywnego iOS dopiero po serwerowo weryfikowalnej atestacji.
4. Nie wolno ponownie zaufac polu `platform` wysylanemu przez klienta.
5. `registrationOpen=false` nadal natychmiast zamyka tworzenie nowych kont.
6. Istniejacy user z wygasla subskrypcja zachowuje odczyt i eksport swoich danych.
7. Nie zapisuj ani nie usuwaj produkcyjnych danych userow w testach i diagnostyce.
8. Nie ruszaj zastanych zmian `android/app/capacitor.build.gradle`, `android/capacitor.settings.gradle` ani `animacje-cwiczen/`.

---

## 1. Stan bazowy i znalezione problemy

### Wyniki audytu 2026-08-10

- aplikacja: 137 plikow testowych, 1217 testow PASS;
- backend Functions: 18 plikow PASS + 1 skipped, 151 testow PASS + 4 skipped;
- E2E mock: 194 PASS;
- typecheck, lint, build web: PASS;
- build mobile + mobile dist smoke: PASS;
- web dist offline: PASS;
- web `check:dist-smoke`: falszywy FAIL, bo skrypt otwiera `/`, a assety buildu web maja base `/strength-save/`;
- initial JS: 1 532 678 B przy limicie 1 536 000 B, tylko ok. 3,3 KB zapasu;
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

---

## 2. Kolejnosc wykonania

### FAZA 1 - P0 rejestracja i weryfikacja email

- [x] **Z203: testy regresyjne kontraktu rejestracji.** Dodaj czerwone testy: attested native bez invite tworzy profil; web/unattested bez invite jest odrzucony; poprawny invite dziala; `registrationOpen=false` blokuje; brak dokumentu nie pokazuje bramki weryfikacji przed zakonczonym sync; osierocone konto Auth odzyskuje profil po poprawnym sync. **Dowod:** `functions/src/security.test.ts`, `src/test/native-callable.test.ts`, `src/test/user-provider-bootstrap.test.tsx`; najpierw czerwone, po implementacji 22 + 4 + 2 testy PASS.
- [x] **Z204: serwerowo weryfikowalna rejestracja native.** Wdrozenie Firebase App Check dla iOS z App Attest w trybie kontrolowanym. `syncUserProfile` moze utworzyc profil bez invite tylko dla zaakceptowanego natywnego App ID z prawidlowym App Check. Web nadal wymaga invite. Nie uzywaj deklaracji `platform`. Jesli potrzebny jest most miedzy natywnym tokenem App Check i JS Functions, wybierz oficjalnie wspierana integracje po sprawdzeniu aktualnej dokumentacji; opisz architekture w `DECYZJE.md`. **Dowod:** iOS Firebase App ma bundle `com.grzegorzjasionowicz.strengthsave`, Team ID `J4CRD2SA6D`; App Attest config istnieje z TTL 3600 s; wymagane `firebaseappcheck.googleapis.com` wlaczone 2026-08-10; `syncUserProfile` wdrozone w `us-central1`; produkcyjny App Check exchange i attested profile creation PASS.
- [x] **Z205: odporny bootstrap profilu.** `UserContext` nie moze traktowac brakujacego dokumentu jak gotowego profilu do weryfikacji, zanim `syncUserProfile` zakonczy sie sukcesem. Dodaj stan `syncing/error/retry`, czytelny lokalizowany komunikat i retry. Po naprawie atestacji istniejace osierocone konto Auth ma samo utworzyc profil bez ponownej rejestracji. **Dowod:** listener startuje dopiero po udanym idempotentnym `syncUserProfile`; brak profilu lub blad sync pokazuje istniejacy lokalizowany ekran z `Odswiez`/`Refresh`, nie bramke kodu; test bootstrapu 2/2 PASS.
- [ ] **Z206: test produkcyjny bez dotykania danych usera.** Emulator: pelna sekwencja register -> profile -> code -> verify -> onboarding route. Produkcja/TestFlight: nowe techniczne konto, sprawdzenie dokumentu i maila, potem usuniecie wyłącznie tego konta testowego kontrolowanym mechanizmem. Functions deploy dopiero po testach. **Stan:** emulator 6/6 PASS; produkcyjny smoke na technicznym koncie `+x25smoke` PASS (`profile -> code -> verify -> onboarding.in_progress`), konto usuniete przez `deleteOwnAccount`, tymczasowy debug token uniewazniony; pozostaje smoke prawdziwego App Attest na buildzie 84 z realnego iPhone.

**Brama fazy:** nowy user na iOS dochodzi do niezmienionego onboardingu; web bez invite nadal nie tworzy profilu; screenshotowy blad nie wystepuje.

### FAZA 2 - trial, cennik i poprawny paywall

- [ ] **Z207: konfiguracja App Store Connect.** Zmien `scripts/asc_subscriptions.py` i ASC: monthly 14,99 zl / $3.99 + `ONE_WEEK`; yearly 119,99 zl / $31.99 + `TWO_WEEKS`; pozostale terytoria przez equalizacje. Najpierw tryb/status bez zapisu, potem zastosowanie i ponowny odczyt wszystkich cen/ofert.
- [ ] **Z208: eligibility-aware paywall.** Uzyj `checkTrialOrIntroductoryPriceEligibility` dla obu product identifiers. Trial pokazuj tylko przy `eligible`; `unknown` i `ineligible` nie dostaja trial copy. Dlugosc triala i okres odnowienia czytaj z produktu/intro offer. Obsluz brak Offering, brak intro price, blad sieci i restore.
- [ ] **Z209: dynamiczna prezentacja ceny.** Roczny domyslny. Pokaz lokalizowana cene laczna, cene efektywna/miesiac i oszczednosc wyliczona wzgledem pakietu monthly. Nie hardkoduj `4 miesiace gratis`, jezeli lokalne ceny daja inny wynik. Testy PL/EN i duzych cen.
- [ ] **Z210: sandbox/TestFlight.** Scenariusze: eligible monthly 7 dni, eligible yearly 14 dni, wykorzystany trial, `unknown`, purchase, cancel, restore, offline/error. Zweryfikuj teksty regulaminu, privacy, auto-renew i brak mylacej obietnicy.

**Brama fazy:** paywall nigdy nie obiecuje triala bez potwierdzenia; ceny na ekranie sa identyczne ze StoreKit.

### FAZA 3 - szybkie oszczednosci bez zmiany funkcji

- [ ] **Z211: batching telemetrii.** Flush z 30 s na 5 min, a dodatkowo przy `online`, przejsciu aplikacji w tlo i zamknieciu tam, gdzie platforma pozwala. Bufor localStorage i retry pozostaja. Test fake timers: maks. 12 okresowych flushy/h zamiast 120.
- [ ] **Z212: deduplikacja push registration.** Lokalnie przechowuj hash tokenu, uid i czas potwierdzenia. Backend wywoluj tylko po zmianie tokenu/uid albo po 30 dniach. Event refresh tokenu musi natychmiast rejestrowac nowy token. Logout usuwa stan poprzedniego uid.
- [ ] **Z213: pomiary i cykle per ekran.** Dashboard pobiera najnowszy pomiar (`limit(1)`) i aktywny cykl. Pelne pomiary/cykle pozostaja na swoich ekranach, z paginacja gdzie potrzebna. Nie zmieniaj wynikow UI.
- [ ] **Z214: aktywnosci per ekran.** Dashboard pobiera ograniczone ostatnie okno potrzebne do kart. Pelna historia Strava/manual jest paginowana na widokach historii/analityki. Porownaj wyniki kart przed/po na fixture z historia >500 rekordow.

**Brama fazy:** testy funkcjonalne 1:1; pomiar odczytow zimnego Dashboardu z raportem przed/po; cel <=100 dokumentow dla standardowego startu, bez ukrywania historii.

### FAZA 4 - historia treningow i statystyki bez stalego listenera 500

- [ ] **Z215: mapa zaleznosci od calej historii.** Wypisz wszystkie komponenty liczace streak, PR, objetosc, wykresy i poprzedni ciezar. Dla kazdego okresl recent realtime, paginowana historia albo agregat. Nie implementuj, dopoki testy fixture nie zamroza obecnych wynikow.
- [ ] **Z216: recent realtime + pagination.** Globalny listener nie moze zawsze pobierac 500 treningow i 365 pomiarow. Ostatnie treningi zostaja realtime; starsze sa pobierane kursorem na zadanie. `AutoSyncOnReconnect` ma synchronizowac kolejke/draft bez utrzymywania szerokiego listenera na kazdym ekranie.
- [ ] **Z217: agregaty statystyk.** Jezeli Dashboard potrzebuje all-time, dodaj wersjonowany dokument agregatu aktualizowany idempotentnie przy finalizacji/edycji/usunieciu treningu. Przygotuj bezpieczny, wznawialny backfill i test rownowaznosci agregatu z obecnymi obliczeniami. Brak agregatu musi miec bezpieczny fallback.
- [ ] **Z218: integralnosc offline.** Sekwencje: trening offline -> kill -> resume -> finalizacja -> reconnect; edycja starego treningu; usuniecie; konflikt urzadzen; paginacja bez duplikatow/luk. Dane usera maja wygrac nad oszczednoscia.

**Brama fazy:** wszystkie statystyki i historia sa identyczne, a stale subskrypcje nie skaluja sie z cala historia usera.

### FAZA 5 - release engineering i dostepnosc

- [ ] **Z219: napraw web dist smoke.** Skrypt ma respektowac Vite `base` i sprawdzac prawidlowy URL/assety dla web oraz `/` dla mobile. Test musi najpierw odtworzyc stary falszywy FAIL.
- [ ] **Z220: warningi a11y.** Dodaj wymagane `DialogTitle`/description albo prawidlowe wizualnie ukryte etykiety. Nie zmieniaj layoutu onboardingu. Usun podwojna rejestracje pluginu w testach.
- [ ] **Z221: bundle.** Odzyskaj min. 150 KB zapasu initial JS przez istniejace granice routingu/dynamic import, bez podnoszenia limitu. Sprawdz start i offline na iPhone/mobile viewport.
- [ ] **Z222: obserwowalnosc kosztow i funnelu.** Zdarzenia lokalnie buforowane: register_started/profile_created/email_verified/paywall_viewed/trial_started/purchase_failed. Bez danych treningowych i bez osobnego zapisu per klik. Dodaj dashboard/raport dzienny kosztow Firestore, Functions i maili w granicach dostepnych API.

### FAZA 6 - pelne bramki i wydanie

- [x] `npm run test` - 139 plikow, 1223 testy PASS po poprawce P0
- [x] `npm --prefix functions test` - 18 plikow PASS + 1 skipped, 155 PASS + 4 skipped
- [x] `npm run typecheck`
- [x] `npm --prefix functions run typecheck`
- [x] `npm run lint`
- [ ] `npm run build && npm run check:bundle-budget && npm run check:dist-smoke && npm run check:dist-offline` - build, budget i offline PASS; web dist-smoke pozostaje Z219, bo nie respektuje base `/strength-save/`
- [x] `npm run build:mobile && npm run check:dist-smoke` - PASS; natywny adapter 1,86 kB, Firebase 732,22 kB
- [x] `npm run e2e:mock` - 194/194 PASS
- [x] kontrolny build Xcode iOS Simulator bez podpisu - exit 0, plugin App Check rozwiazany przez SwiftPM
- [x] App Attest config + API + Functions deploy - `syncUserProfile` successful update, produkcyjny attested callable smoke PASS
- [ ] emulator auth/functions/rules: nowa rejestracja i zachowanie web invite-only
- [ ] TestFlight na realnym iPhone: register -> email code -> obecny onboarding -> paywall -> trial/purchase -> pierwszy trening -> background/resume -> sync
- [ ] App Store metadata: screenshot IAP, opis, privacy, review notes i konto demo
- [ ] Wpis zbiorczy X25 do `DECYZJE.md`, aktualizacja `PLAN.md` i `docs/PLAN_RELEASE_1.0.md`
- [ ] Deploy Functions/web tylko z zielonego commita; nowy build iOS z kolejnym wolnym `CURRENT_PROJECT_VERSION`; dystrybucja do obu grup TestFlight

---

## 3. Strategia commitow i wdrozen

1. `test(auth): odtworz brak profilu po rejestracji native (Z203)`
2. `fix(auth): atestowana rejestracja i odporny bootstrap profilu (Z204-Z206)`
3. `fix(iap): trial 7/14 i eligibility-aware paywall (Z207-Z210)`
4. `perf(firebase): batching telemetrii i deduplikacja push (Z211-Z212)`
5. `perf(firebase): waskie zapytania dashboardu i paginacja (Z213-Z218)`
6. `fix(release): smoke a11y i zapas bundle (Z219-Z222)`
7. `chore(release): bramki dokumentacja i build X25`

Stage'uj pliki imiennie. Nigdy `git add -A`. Nie lacz deployu Functions z niezweryfikowana zmiana klienta auth.

---

## 4. Warunek zakonczenia X25

X25 jest zakonczony dopiero, gdy:

1. blad `User profile missing` nie wystepuje i nowy user iOS dochodzi do obecnego onboardingu;
2. web bez invite nadal nie tworzy konta aplikacyjnego;
3. App Store i paywall maja ceny 14,99/119,99 zl oraz $3.99/$31.99 i triale 7/14;
4. trial copy jest zgodne z eligibility;
5. funkcje aplikacji, historia, offline i synchronizacja pozostaja 1:1;
6. raport przed/po pokazuje spadek odczytow i zapisow;
7. wszystkie bramki sa zielone, web/functions wdrozone, a nowy build jest na TestFlight;
8. onboarding nie zostal przebudowany ani skrocony w ramach tej pracy.
