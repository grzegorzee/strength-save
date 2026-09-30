# Test płatności sandbox (10 minut) z podglądem na żywo

Stan konfiguracji i dowody: `release/payments-2026-09-30/` (asc, play, rc, pubsub, client).
Ten test nie kosztuje nic: TestFlight i License tester płacą walutą testową.

## 0. Przed startem (2 minuty)

1. **Nie kupuj na prawdziwej karcie ani poza TestFlight/internal testing.** Apka z App Store
   (1.0 jest już `READY_FOR_SALE`) i produkcyjna ścieżka Play pobierają prawdziwe pieniądze.
2. **Konto w apce bez grantu comp.** Konto admina ma PRO przyznane, więc paywall go przepuszcza
   i test nic nie udowodni. Użyj `grzegorzee@gmail.com` (Google, uid `XtXPgWsB8S…`, rola user,
   brak comp, odczyt 30.09 12:34 UTC). Uwaga: na tym koncie trwa już okres próbny miesięczny
   z TestFlight (start 12:20 UTC, koniec 1.10 12:20 UTC). Na świeży zakup od zera załóż nowe
   konto w apce (np. Sign in with Apple z ukrytym adresem).
3. **Podgląd na żywo** w terminalu na Macu (tylko odczyt, sam kończy po 30 min):

   ```
   cd ~/FIRMA/projekty/strength_save
   STRENGTH_SAVE_GCLOUD_ACCOUNT=g.jasionowicz@gmail.com node scripts/payments-live-watch.mjs grzegorzee@gmail.com
   ```

   Co 10 s wypisuje tylko ZMIANY: `[firestore]` (users/{uid}.subscription: tier, status,
   expiresAt, store, environment), `[revenuecat]` (stan klienta w RC), `[webhook]` (log
   revenuecatWebhook dla tego uid), `[client_errors]` (błędy apki tego usera).

## 1. iPhone, TestFlight build 153 (iOS)

Apka z TestFlight działa w sandboxie automatycznie. Zakup idzie na Apple ID zalogowane
w App Store i jest bezpłatny. Czasy (Apple, stan 30.09.2026):

| Konto | Odnowienie subskrypcji miesięcznej | Limit |
|---|---|---|
| Apple ID w TestFlight | co 24 h (każdy okres, także trial) | 6 odnowień, potem koniec |
| Sandbox Apple Account | domyślnie 5 min (do wyboru 3, 5, 30, 60 min) | 12 odnowień |

Potwierdzone na produkcji: zakup z 12:20 dał `trial` z końcem po 24 h. Dla 10-minutowego testu
wygaśnięcia potrzebne jest konto sandbox:

- ASC ma dziś **0 sandbox testerów**. Utwórz: App Store Connect → Użytkownicy i dostęp →
  Sandbox → Konta testowe → „+” (adres, który NIE jest Apple ID).
- Na iPhonie: Ustawienia → Deweloper → Sandbox Apple Account (menu Deweloper pojawia się po
  włączeniu trybu dewelopera). Na starszych iOS: Ustawienia → App Store → Konto sandboxowe.
  Tam też „Zarządzaj”: tempo odnowień, anulowanie, wyczyszczenie historii zakupów.
- Czy TestFlight 153 użyje konta sandbox, czy Apple ID, wymaga sprawdzenia na urządzeniu.
  Podgląd rozstrzyga to od razu: `expiresAt − startedAt` = minuty (sandbox) albo 24 h (TestFlight).

| Krok | Co robisz | Co pokazuje apka | Co pokazuje payments-live-watch |
|---|---|---|---|
| 1 | Zaloguj konto testowe, dojdź do paywalla (Profil → Subskrypcja → „Przejdź na PRO”, albo sam paywall po kreatorze) | Ceny ze sklepu: 14,99 zł/mies., 119,99 zł/rok, „Zacznij 7 dni za darmo” tylko przy kwalifikacji do trialu | brak zmian |
| 2 | Wybierz miesięczny, kup | Arkusz Apple „[Sandbox]”, po nim Dashboard | `[revenuecat] subscriptions … trialing`, po kilku sekundach `[webhook] INITIAL_PURCHASE → users/<uid> subscription: trial/active do …`, `[firestore] subscription.tier null → "trial"`, `store APP_STORE`, `environment SANDBOX` |
| 3 | Profil → Subskrypcja | „Okres próbny”, „do {data}” | brak zmian |
| 4 | Usuń apkę, zainstaluj z TestFlight, zaloguj TO SAMO konto | PRO od razu (lustro z Firestore, bez przywracania) | brak zmian |
| 5 | Paywall → „Przywróć zakupy” (na tym samym koncie) | Toast „Zakupy przywrócone. Witaj z powrotem!” | ewentualnie `[revenuecat] lastSeenAt` |
| 6 | Profil → Subskrypcja → „Zarządzaj subskrypcją” → Anuluj | „wygasa {data}” zamiast „odnawia się” | `[webhook] CANCELLATION …`, `[firestore] subscription.willRenew true → false`, status zostaje `active` |
| 7 | Poczekaj do końca okresu (sandbox: minuty, TestFlight: do 24 h) | Po powrocie do apki: konto bez treningów = hard paywall z „Wyloguj” i „Usuń konto i wszystkie dane”; konto z treningami = zostaje w apce w trybie tylko do odczytu | `[webhook] EXPIRATION …`, `[firestore] subscription.tier "trial" → "none"`, `status "active" → "expired"` |

Restore na INNYM koncie w apce (to samo Apple ID) przenosi zakup (zdarzenie TRANSFER): stare
konto traci PRO, nowe dostaje. Zachowanie ustawia RevenueCat → Project settings → Restore
behavior; sprawdź je przed testem, jeśli chcesz testować przenoszenie.

## 2. Android, internal testing 57

**Blokada przed testem (wymaga decyzji właściciela, zmiana w RevenueCat):** webhook
„Strenght Save Sub” ma przypiętą tylko aplikację App Store (`app_id = app04502c737f`).
RevenueCat wysyła wtedy zdarzenia wyłącznie z iOS. Zakup na Androidzie da PRO na telefonie
(CustomerInfo), ale `users/{uid}.subscription`, web, Garmin i podgląd `[firestore]`/`[webhook]`
nie zobaczą nic. Naprawa: RevenueCat → Integrations → Webhooks → „Strenght Save Sub” → App:
wszystkie aplikacje (albo drugi webhook dla Google Play z tym samym URL i nagłówkiem).

Czasy testowe Google (License tester, stan 30.09.2026): subskrypcja miesięczna odnawia się
co 5 min, roczna co 30 min, trial trwa 3 min, grace period 5 min, maksymalnie 6 odnowień.

1. License testers: Play Console, poziom KONTA (nie aplikacji) → Ustawienia → Testowanie
   licencji → dodaj konto Gmail z telefonu → Zapisz. API tego nie pokazuje, sprawdź na liście.
2. To samo konto na liście testerów Internal testing, instalacja 57 przez link z
   Testowanie i publikowanie → Testy wewnętrzne → Testerzy → „Kopiuj link”. Konto Gmail musi być
   głównym kontem w Sklepie Play na telefonie.
3. Kup miesięczny. W arkuszu Google wybierz „Test instrument, always approves”
   (albo „Test card, always approves”). Nie wybieraj prawdziwej karty.
   Apka: Dashboard, Profil → Subskrypcja „Okres próbny”. Podgląd: `[revenuecat] … play_store`
   od razu; `[firestore]`/`[webhook]` dopiero po naprawie webhooka.
4. Przywróć: odinstaluj, zainstaluj z linku, zaloguj to samo konto, paywall → „Przywróć zakupy”.
5. Anuluj: Sklep Play → ikona profilu → Płatności i subskrypcje → Subskrypcje → Strength Save
   → Anuluj. Po ok. 3 min (trial) albo 5 min (okres) wygaśnięcie: apka jak w kroku 7 iOS.
6. RTDN (powiadomienia Play → RevenueCat): w projekcie GCP `fittracker-workouts` nie ma
   tematu Pub/Sub dla Play (jest tylko `cost-guard-budget`). Sprawdź: Play Console → Strength Save
   → Zarabianie z Play → Konfiguracja zarabiania → Powiadomienia w czasie rzeczywistym
   dla deweloperów (temat) oraz RevenueCat → Google Play app → Google developer notifications.
   Bez RTDN anulowanie i wygaśnięcie z Androida dociera do RC z opóźnieniem (przy otwarciu apki).

## 3. Czego ten test nie sprawdzi

Prawdziwego obciążenia karty, wypłat, podatków i zwrotów (tylko w produkcji), zachowania
przy ekranie zgaszonym podczas zakupu, rodzinnego udostępniania, kodów promocyjnych.
