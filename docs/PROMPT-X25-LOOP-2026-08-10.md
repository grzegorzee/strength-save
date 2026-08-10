# Prompt: autonomiczne wykonanie X25 w petli goal-driven

## Wiadomosc do wklejenia w nowym oknie

```text
/goal Wykonaj w calosci docs/PLAN-X25-LAUNCH-2026-08-10.md dla iOS i Android wydawanych w tym samym czasie. Najpierw przeczytaj CLAUDE.md, caly plan X25, git status i git log. Pracuj autonomicznie przez /loop, zawsze od pierwszego niezablokowanego checkboxa, test-first i z dowodem przy zadaniu. P0 „User profile missing” ma juz wspolny kontrakt App Check dla iOS/App Attest i Android/Play Integrity; nie cofaj go, web pozostaje invite-only. Dalej wdroz trial 7/14, ceny 14,99/119,99 zl i $3.99/$31.99 w App Store, Google Play i RevenueCat, eligibility-aware paywall, redukcje kosztow Firestore, smoke/a11y/bundle, pelne bramki i wspolny release obu platform. NIE przebudowuj onboardingu i nie ruszaj `animacje-cwiczen/`. Nie pytaj o odwracalne decyzje; kroki zalezne od Play Console lub realnego urzadzenia zapisuj jako KROK USERA i kontynuuj cala niezalezna prace.
```

Po uruchomieniu goal wlacz petle komunikatem:

```text
/loop Przeczytaj docs/PROMPT-X25-LOOP-2026-08-10.md i wykonaj kolejna spojna porcje pracy z docs/PLAN-X25-LAUNCH-2026-08-10.md. Stan odtwarzaj z checkboxow, git status i git log. Kontynuuj do spelnienia warunku zakonczenia X25; nie deklaruj sukcesu bez wynikow bramek.
```

## Stan startowy po sesji 2026-08-10

- Z203-Z205 sa wykonane i wdrozone; nie implementuj ich od nowa. Backend akceptuje tylko dokladne zweryfikowane App ID iOS/Android, a web bez invite jest odrzucany.
- iOS: App Attest TTL 3600 s, API aktywne, build 84 przygotowany; produkcyjny kontrolowany smoke PASS.
- Android: Play Integrity TTL 3600 s, API aktywne, SHA-256 upload key w Firebase, plugin zsynchronizowany, AAB `versionCode 6` podpisany; produkcyjny kontrolowany smoke PASS.
- Z206 ma emulator 7/7 i produkcyjne smoki dla obu App ID. Pozostaja prawdziwe atestacje: build 84 z TestFlight na iPhone i AAB 6 z Play Internal na Androidzie.
- Ostatnie bramki: aplikacja 1224 PASS, Functions 156 aktywnych PASS, E2E 194 PASS, lint/typecheck/build/mobile/dist/offline/bundle, Xcode i Gradle PASS.
- Z219 jest wykonane: web dist smoke respektuje Vite base. Pierwszym kolejnym niezaleznym zadaniem jest Z207; Z206 domknij po dystrybucji obu buildow.

---

## Kontrakt dla agenta w kazdej iteracji

Pracujesz w `/Users/grzegorzjasionowicz/FIRMA/projekty/strength_save` nad X25. User nie bedzie odpowiadal w trakcie. Masz samodzielnie diagnozowac, implementowac, testowac, dokumentowac i wykonywac odwracalne kroki.

### Start iteracji

1. Przeczytaj `/Users/grzegorzjasionowicz/.codex/RTK.md` i `CLAUDE.md`.
2. Przeczytaj w calosci `docs/PLAN-X25-LAUNCH-2026-08-10.md`.
3. Uruchom `rtk git status --short` i `rtk git log --oneline -15`.
4. Stan prawdy to checkboxy planu + commity + wyniki testow, nie pamiec poprzedniej iteracji.
5. Wybierz pierwsze nieodhaczone zadanie. Nie przeskakuj faz, chyba ze zadanie jest realnie zablokowane zewnetrznie i zostalo oznaczone `KROK USERA` z dowodem.

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

### Zamrozony onboarding

Nie zmieniaj `src/pages/Onboarding.tsx`, `src/components/PlanWizard.tsx`, `src/components/PlanPreview.tsx`, liczby krokow, tekstow ani layoutu onboardingu. Mozesz zmieniac auth/weryfikacje przed nim i paywall po nim. Jezeli test wymaga zmiany setupu auth, nie zmieniaj asercji dotyczacych obecnego wizardu.

### Parytet iOS i Android

- Obie aplikacje maja wyjsc w tym samym publicznym oknie. Nie oznaczaj release jako gotowy, gdy tylko jedna platforma ma dzialajaca rejestracje, trial lub zakup.
- Kazda zmiana auth/IAP ma test kontraktu wspolnego oraz osobne potwierdzenie zachowania StoreKit i Google Play Billing.
- Kolejny checkpoint dystrybucyjny to iOS build 84 w obu grupach TestFlight i Android AAB 6 w Play Internal.
- Po przyjeciu Play App Signing pobierz SHA-1 i SHA-256 certyfikatu App signing. Dodaj oba do Firebase; SHA-1 jest potrzebny Google Sign-In, SHA-256 App Check/Play Integrity.
- W Play Console polacz projekt Cloud `fittracker-workouts` w App integrity -> Play Integrity API. Dopiero instalacja ze sklepu jest dowodem prawdziwego tokenu `PLAY_RECOGNIZED`.
- Subskrypcje Google Play i ich triale musza byc podlaczone do tego samego entitlement/offering RevenueCat co iOS przed publicznym wydaniem.

### Koszty bez utraty funkcji

Kolejnosc: telemetria 5 min/lifecycle, push token dedupe, latest measurement/active cycle na Dashboardzie, ograniczone activities + paginacja, dopiero potem recent realtime workouts + paginowana historia/agregaty. Nie zmniejszaj po prostu limitu 500, jesli zepsuje to streak, PR, all-time lub poprzedni ciezar. Najpierw test rownowaznosci na fixture >500 rekordow i pomiar odczytow przed/po.

### Twarde zasady repozytorium

- Nie ruszaj ani nie cofaj `animacje-cwiczen/`.
- Nie usuwaj wygenerowanych wpisow App Check, Keep Awake ani Keyboard z `android/app/capacitor.build.gradle` i `android/capacitor.settings.gradle`.
- Dane usera sa swiete. Zero eksperymentalnych zapisow/usuniec na produkcji.
- Zachowaj PL/EN dla kazdego nowego tekstu.
- Zachowaj local-first, offline, background/resume i idempotencje synchronizacji.
- Nie podnos limitu bundle. Cel: min. 150 KB zapasu.
- Nie obchodz App Check poluzowaniem rules lub zaufaniem do klienta.
- Nie deployuj czerwonego commita. Functions i klient auth musza byc kompatybilne w kolejnosci wdrozenia.
- Krok wymagajacy Firebase/App Store Connect/Play Console/realnego urzadzenia wykonaj sam, jesli sesja ma dostep. W przeciwnym razie udokumentuj dokladny `KROK USERA`, ale kontynuuj wszystkie niezalezne zadania.

### Bramy i stop

Pelna lista bramek jest w FAZIE 6 planu. Pętla konczy sie dopiero po spelnieniu sekcji „Warunek zakonczenia X25”. Raport koncowy ma zawierac:

1. tabele Z203-Z222 z commitami i dowodami;
2. root cause i dowod naprawy `User profile missing`;
3. status App Attest, Play Integrity i web invite-only;
4. status cen/triali w ASC, Google Play i RevenueCat;
5. pomiar Firestore przed/po;
6. wyniki wszystkich testow/buildow/E2E;
7. status deployu Functions/web/TestFlight/Play Internal oraz wspolnego release;
8. jawne potwierdzenie, ze onboarding nie byl przebudowywany;
9. tylko rzeczywiste pozostale `KROKI USERA`.
