# Prompt: autonomiczne wykonanie X25 w petli goal-driven

## Wiadomosc do wklejenia w nowym oknie

```text
/goal Wykonaj w calosci docs/PLAN-X25-LAUNCH-2026-08-10.md. Najpierw przeczytaj CLAUDE.md, caly plan X25, git status i git log. Pracuj autonomicznie przez /loop, zawsze od pierwszego nieodhaczonego zadania, test-first i z dowodem przy checkboxie. P0: napraw „User profile missing” przez serwerowo weryfikowalna rejestracje native, zachowujac web invite-only. Potem trial 7/14, ceny 14,99/119,99 zl i $3.99/$31.99, eligibility-aware paywall, redukcja kosztow Firestore, smoke/a11y/bundle, pelne bramki i wydanie. NIE przebudowuj onboardingu i nie ruszaj zastanych zmian Android/animacje. Nie pytaj o odwracalne decyzje; zatrzymaj sie tylko przy realnym nieodwracalnym blokerze lub kroku wymagajacym konta/urzadzenia usera.
```

Po uruchomieniu goal wlacz petle komunikatem:

```text
/loop Przeczytaj docs/PROMPT-X25-LOOP-2026-08-10.md i wykonaj kolejna spojna porcje pracy z docs/PLAN-X25-LAUNCH-2026-08-10.md. Stan odtwarzaj z checkboxow, git status i git log. Kontynuuj do spelnienia warunku zakonczenia X25; nie deklaruj sukcesu bez wynikow bramek.
```

## Stan startowy po sesji 2026-08-10

- Z203 i Z205 sa wykonane lokalnie; nie implementuj ich od nowa, tylko zweryfikuj diff i testy.
- Z204 jest wykonane: App Attest config i Team ID potwierdzone, wymagane API wlaczone, `syncUserProfile` wdrozone, produkcyjny attested callable smoke PASS.
- Z206 ma emulator 6/6 i produkcyjny smoke PASS; pozostaje smoke prawdziwego App Attest na buildzie 84 z realnego iPhone.
- Ostatnie bramki: aplikacja 1223 PASS, Functions 155 aktywnych PASS, E2E 194 PASS, lint/typecheck/build/mobile/offline/bundle/Xcode PASS.
- Po dystrybucji i smoke builda 84 domknij Z206. Pierwszym kolejnym niezaleznym zadaniem jest Z207.

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

Napraw kontrakt, nie symptom:

- native iOS bez invite: dozwolony tylko po serwerowo weryfikowalnym Firebase App Check/App Attest i dla zatwierdzonego app ID;
- web/unattested bez invite: nadal odrzucony;
- poprawny invite: nadal dziala;
- `registrationOpen=false`: nadal blokuje;
- nie przywracaj spoofowalnego `request.data.platform`;
- nie tworz profilu klientem ani przez poluzowanie Firestore rules;
- `UserContext` nie moze pokazac bramki kodu, dopoki profil nie zostal pomyslnie utworzony/zaladowany;
- istniejace osierocone konto Auth ma odzyskac profil przez idempotentny retry po wdrozeniu poprawki;
- pelna sekwencja emulator/TestFlight: register -> profile -> send code -> verify -> istniejacy onboarding.

Przed wyborem integracji App Check sprawdz aktualna oficjalna dokumentacje Firebase i kompatybilnosc z Capacitor. Jezeli natywny token trzeba polaczyc z webowym SDK Functions, uzyj wspieranej integracji albo jawnego, przetestowanego adaptera; nie zakladaj, ze dwa Firebase app IDs automatycznie dziela tokeny. Enforce wlaczaj stopniowo i tylko po smoke monitoringu, ale sam `syncUserProfile` musi sprawdzac atestacje zanim zezwoli na brak invite.

### Zakres monetizacji

- monthly: 14,99 zl / $3.99, trial 7 dni;
- yearly: 119,99 zl / $31.99, trial 14 dni;
- roczny domyslny; ok. 33% oszczednosci, ok. 4 miesiace gratis;
- zrodlo prawdy ceny i triala: StoreKit/RevenueCat;
- eligibility sprawdzane dla kazdego produktu;
- `eligible`: wolno pokazac trial;
- `ineligible`/`unknown`: zwykla subskrypcja bez obietnicy triala;
- zachowaj restore, Terms, Privacy, auto-renew copy i obsluge bledow.

### Zamrozony onboarding

Nie zmieniaj `src/pages/Onboarding.tsx`, `src/components/PlanWizard.tsx`, `src/components/PlanPreview.tsx`, liczby krokow, tekstow ani layoutu onboardingu. Mozesz zmieniac auth/weryfikacje przed nim i paywall po nim. Jezeli test wymaga zmiany setupu auth, nie zmieniaj asercji dotyczacych obecnego wizardu.

### Koszty bez utraty funkcji

Kolejnosc: telemetria 5 min/lifecycle, push token dedupe, latest measurement/active cycle na Dashboardzie, ograniczone activities + paginacja, dopiero potem recent realtime workouts + paginowana historia/agregaty. Nie zmniejszaj po prostu limitu 500, jesli zepsuje to streak, PR, all-time lub poprzedni ciezar. Najpierw test rownowaznosci na fixture >500 rekordow i pomiar odczytow przed/po.

### Twarde zasady repozytorium

- Nie ruszaj ani nie cofaj zastanych zmian:
  - `android/app/capacitor.build.gradle`
  - `android/capacitor.settings.gradle`
  - `animacje-cwiczen/`
- Dane usera sa swiete. Zero eksperymentalnych zapisow/usuniec na produkcji.
- Zachowaj PL/EN dla kazdego nowego tekstu.
- Zachowaj local-first, offline, background/resume i idempotencje synchronizacji.
- Nie podnos limitu bundle. Cel: min. 150 KB zapasu.
- Nie obchodz App Check poluzowaniem rules lub zaufaniem do klienta.
- Nie deployuj czerwonego commita. Functions i klient auth musza byc kompatybilne w kolejnosci wdrozenia.
- Krok wymagajacy Firebase/App Store Connect/realnego iPhone wykonaj sam, jesli sesja ma dostep. W przeciwnym razie udokumentuj dokladny `KROK USERA`, ale kontynuuj wszystkie niezalezne zadania.

### Bramy i stop

Pelna lista bramek jest w FAZIE 6 planu. Pętla konczy sie dopiero po spelnieniu sekcji „Warunek zakonczenia X25”. Raport koncowy ma zawierac:

1. tabele Z203-Z222 z commitami i dowodami;
2. root cause i dowod naprawy `User profile missing`;
3. status App Check i web invite-only;
4. status cen/triali w ASC i RevenueCat;
5. pomiar Firestore przed/po;
6. wyniki wszystkich testow/buildow/E2E;
7. status deployu Functions/web/TestFlight;
8. jawne potwierdzenie, ze onboarding nie byl przebudowywany;
9. tylko rzeczywiste pozostale `KROKI USERA`.
