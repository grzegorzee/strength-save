# Audyt przed premierą — 2026-09-06

Rozpoczęty 6 września; kontynuacja 7 września obejmuje zgłoszenie rozgrzewki
z rzeczywistego treningu i końcową walidację całego zestawu zmian.

## Zakres i kryteria

Punkt wyjścia: commit `33df6dbd`, wersja produktu `1.0.0`. Audyt obejmuje kod
aplikacji, backend i reguły dostępu, konfigurację iOS/Android, proces wydania,
zależności oraz rzeczywiste przepływy interfejsu na danych syntetycznych.
Istniejące nieśledzone materiały użytkownika nie należą do zakresu zmian.

Środowisko docelowe: siłownia, słaba sieć, telefon ze zgaszonym ekranem.
Niezmienniki: komplet ćwiczeń planu po powrocie do sesji, trwałość wykonanych
serii, izolacja kont, kanoniczne kilogramy, brak cichego nadpisania konfliktu,
możliwość wyjścia ze stanu błędu. Test przeglądarkowy nie potwierdza działania
systemowego dźwięku, haptyki ani natywnego zawieszenia procesu.

## Plan pracy

1. Ustalić aktualny stan źródeł, wcześniejszych decyzji i dowodów wydania.
2. Równolegle zbadać trzy obszary: trening/offline/synchronizacja;
   auth/płatności/backend/prywatność; iOS/Android/publikacja/zależności.
   Prowadzący wykonuje bramki bazowe i audyt interfejsu.
3. Potwierdzić kandydatów na błędy scenariuszem i testem. Zapisać priorytet,
   przyczynę, dotknięte pliki, niezmiennik i sposób weryfikacji przed poprawką.
4. Zlecić agentom izolowane poprawki potwierdzonych usterek; każda zaczyna się
   od czerwonego testu regresji. Zmiany UX i tekstów ograniczyć do rozpoznanego
   tarcia użytkownika, zgodnie z rozszerzeniem zakresu przez właściciela.
5. Zintegrować i przejrzeć poprawki. Wykonać pełne testy frontend/backend,
   typecheck, lint, build, reguły w emulatorach, Chromium i WebKit, kontrole
   bundla/offline oraz możliwe lokalne buildy natywne.
6. Zapisać końcową macierz dowodów, pozostałe warunki publikacji i scenariusze
   testów urządzeniowych. Oddzielić sprawdzony kod od historycznych artefaktów.

## Wprowadzone naprawy

Wszystkie poniższe zmiany są lokalne. Rejestry agentów zawierają przyczynę,
niezmiennik, czerwony test przed poprawką oraz wynik weryfikacji.

| Obszar / ID | Zachowanie po poprawce |
| --- | --- |
| Trening W1–W4 | ACK/hydracja porównują kompletną zawartość; nie usuwają nowszej notatki ani nie przywracają usuniętej serii. Zapis zachowuje ułamkowe kg, czas, dystans i asystę. Pusta notatka i lista pominięć są zapisywane jako świadoma edycja. |
| CSV W5–W9 | Eksport obejmuje dodatkowe metryki, parser respektuje wieloliniowe notatki. Import korzysta z serwerowego restore/zgody health, UID jest częścią identyfikatora, historia i Undo należą do konta. Stare własne importy są rozpoznawane bez nadpisania. |
| Import i Rules B10–B12 / WR01–02 | Nie można ominąć health consent surowym zapisem exercises. Backfill używa callable z rewizją. Brak sidecara nie blokuje Undo. Docelowy UID importu jest wiązany na kliencie i w Functions; jawny import backupu z innego konta pozostaje możliwy. |
| Usunięcie konta B1–B3 | Zamknięcie dostępu jest natychmiastowe; 30-dniowy termin nie przesuwa się przy retry. Kolejka omija completed, odzyskuje stare running i ponawia przerwane zamknięcie tokenów/integracji. |
| Subskrypcje B4, B6–B8 | Zakup/restore/CustomerInfo są związane z aktualnym UID. Zawieszony odczyt nie blokuje zakupów. Stare webhooki nie cofają uprawnień; TRANSFER uzgadnia obie strony przez API, a SUBSCRIPTION_EXTENDED aktualizuje ważność. |
| Health i Strava B5/B9 | Spóźniony wynik po zmianie konta lub zgody nie włącza ponownie synchronizacji. Zapis po pobraniu Stravy ponownie sprawdza zgodę transakcyjnie. |
| Natywne Health NAT01–04 | Android ma właściwy kontrakt systemowego dialogu HC/rationale. iOS rozróżnia zakończenie pytania od faktycznej zgody na zapis. Stała tożsamość rekordu obsługuje retry/update, a opcjonalna energia ma osobną obsługę zgody i błędów. |
| Android timer NAT05 | Rzeczywiste WAV, kanał dobrany do gongu oraz SCHEDULE_EXACT_ALARM. Profil pozwala świadomie otworzyć ustawienia i ponowić po odmowie; aplikacja nie otwiera ich w środku serii. |
| Pomiary UX01–02 | Formularz czeka na wynik, blokuje podwójny submit, zachowuje dane po błędzie. Walidacja wskazuje pole, zakres w wybranych jednostkach i umożliwia poprawienie wpisu. |
| Teksty UX03 | Usunięto powtórzenia z onboardingu, skrócono hinty Profilu, timera i integracji oraz żargon z zapisu na testy. Funkcje i informacje o konsekwencjach pozostają. |
| Klawiatura UX04 | Ekran logowania/rejestracji iOS ma własny obszar przewijania nad klawiaturą; globalne Keyboard.resize=none i zachowanie treningu pozostają. Testy mierzą osiągalność przycisku oraz zachowanie wpisanych danych po zamknięciu klawiatury. |
| Częściowy import UX05 | Jeśli serwer zapisał część pliku, wpis trafia do historii właściciela również po błędzie. Po zamknięciu i ponownym otwarciu można cofnąć tę część; komunikat nadal pokazuje błąd i umożliwia retry. |
| Onboarding OB-W1–3 | Podgląd zachowuje zamienione ćwiczenia po cofnięciu i restarcie. Trwający zapis blokuje edycję oraz powtórny submit. Szkic własnego planu nie omija aktualnych wymaganych zgód. |
| Onboarding OB-N1/2/4 | Autorytatywne potwierdzenie zgód od razu aktualizuje kontekst właściwego konta. Zmiana UID nie przenosi poprzedniej decyzji, a nowsze wycofanie Health wygrywa ze starszym ACK. |
| Onboarding OB-W4 | Ponowienie po utracie odpowiedzi i zmianie tygodnia używa tej samej operacji i jednego aktywnego cyklu, z właściwą datą. Współbieżne próby są serializowane; zakończone i niezwiązane plany pozostają zachowane. |
| Rozgrzewka — zgłoszenie 7 IX | Świeży start treningu z planu na telefonie respektuje propozycję rozgrzewki. Górne szablony nie powtarzają krążeń ramion. Sesja z odhaczeniami samej rozgrzewki jest wznawiana z jej stanem. Ustawienie propozycji jest związane z kontem. |
| Wydanie REL01/DOC01/SEC-REVIEW | Manifest hashuje pełne drzewa i artefakty IPA/AAB; dokumentacja odróżnia historię dostaw od aktualnego kodu. Usunięto hasło recenzenta z runbooka; rotacja pozostaje zewnętrzną bramką. |
| CI REL02 | Android ma osobny job kompilacji z JDK 21 i SDK 36. Opcjonalny deploy Pages wymaga sukcesu obu platform. Job nie używa produkcyjnego podpisu ani nie publikuje aplikacji. |
| Zależności DEP01 | Celowane aktualizacje zależności przechodnich; npm audit obu projektów nie zgłasza podatności. Bez wymuszonego skoku wersji głównych. |
| QA01–03 | Screenshoty mają katalog przebiegu i silnika. Test przekładania treningu obejmuje niedzielę i granicę tygodnia. Vite ignoruje natywne HTML, które wywoływały nieoczekiwany reload podczas budowania. |
| Backend B13 | Klasy FieldPath/FieldValue/Timestamp są importowane z firebase-admin/firestore. Emulator ujawnił undefined w namespace ESM, czego nie odtwarzały mocki/CJS; poprawka obejmuje wszystkie dziewięć miejsc tej samej przyczyny. |

Szczegóły: [trening](../audit/launch-2026-09-06/workout-findings.md),
[backend](../audit/launch-2026-09-06/backend-findings.md),
[natywne/sklepy](../audit/launch-2026-09-06/native-release-findings.md),
[UX/UI](../audit/launch-2026-09-06/ux-ui-findings.md),
[cross-review importu](../audit/launch-2026-09-06/workout-integration-review.md),
[cross-review backendu](../audit/launch-2026-09-06/cross-review-backend.md),
[sprawdzenie watchera](../audit/launch-2026-09-06/vite-watch-verification.md).

## Czy aplikacja ma za dużo tekstu?

Główne ekrany są zwięzłe; nadmiar dotyczył głównie powtarzających się opisów
przy konfiguracji. Na tych samych pierwszych czterech krokach onboardingu:

| Język | Przed | Po | Redukcja |
| --- | --- | --- | --- |
| Polski | 166 słów | 126 słów | 24% |
| Angielski | 185 słów | 133 słowa | 28% |

Liczby obejmują przyciski/opcje na czterech ekranach, nie całą aplikację ani
dokumenty prawne. Obrazy porównawcze: `audit/launch-2026-09-06/copy-before/`
i `copy-after/`. Pozostawiono instrukcje ćwiczeń, znaczenie zgód, ceny i warunki
subskrypcji oraz informacje potrzebne przy błędzie lub usuwaniu danych.

Na pierwszym treningu skrócono także dodatkowe wyjaśnienie rozgrzewki do
„Przygotuj ciało do pierwszych serii.”. Szacowany czas jest podany tylko raz,
z aktualnego zestawu, bez powtarzanej stałej obietnicy 4–6 minut.

## Dodatkowy audyt onboardingu

Na osobne polecenie właściciela zakres rozszerzono o sekwencje przerwania,
cofania, restartu, zmiany konta, zgód i ponawiania zapisu. Potwierdzono testami
utratę zamiany ćwiczenia po Back/reload, możliwość edycji podczas zapisu,
nieprawidłowe wejście ze szkicu przy nieaktualnych zgodach, brak natychmiastowego
scalenia serwerowego potwierdzenia zgód oraz wyścig zmiany konta. Osobna regresja
wykazała przesłanianie nowszej revokacji health przez starsze lokalne ACK.
Ostatni P1 odtwarzał zapis planu w niedzielę, utratę odpowiedzi, restart w
poniedziałek i ponowienie: wcześniej powstawały dwa aktywne cykle. Trwały
wskaźnik operacji zapisywany transakcyjnie w profilu pozwala odzyskać ten sam
cykl po zmianie daty; jednoznaczny szkic ze starszego klienta również jest
rozpoznawany. Test sprawdza liczbę cykli, finalną datę, pełny wybór i retry
transakcji przy współbieżnym zapisie. Zakończone plany i zwykły replan zachowują
dotychczasowe działanie. Niejednoznaczne zastane dane dają komunikat z drogą
pomocy/zmiany konta, bez automatycznego nadpisywania historii.

Dowody: [kreator i szkic](../audit/launch-2026-09-06/onboarding-workout-findings.md),
[konto i zgody](../audit/launch-2026-09-06/onboarding-auth-findings.md),
[granica tygodnia](../audit/launch-2026-09-06/onboarding-week-boundary-findings.md).
Zestawy celowane: 90 testów kreatora, 73 testy konta/zgód i 69 testów zapisu
oraz cykli. Zestawy częściowo się pokrywają; nie należy sumować ich jako liczby
unikalnych testów. Pełny wynik jest w macierzy poniżej.

## Zgłoszenie rozgrzewki z 7 września

Potwierdzono cztery mechanizmy związane ze zgłoszonym zachowaniem:

- Przycisk startu z Dzisiaj przekazywał `autostart`, który bezwarunkowo wykluczał
  propozycję dla planu. Start telefonu teraz ją respektuje po trwałym utworzeniu
  nowej sesji; wznowienie i sterowanie z zegarka mają odrębne warunki.
- Standardowa i początkująca rozgrzewka góry zawierały krążenia ramion w fazie
  podniesienia tętna i ponownie w mobilności. Usunięto dwa zbędne wiersze
  szablonów. Stare identyfikatory odhaczeń i serie w szkicu nie są migrowane;
  widoczny postęp liczy wyłącznie aktualne zadania.
- Szkic zawierający jedynie odhaczenia rozgrzewki nie był uznawany za rozpoczętą
  sesję. Teraz stan rozgrzewki uczestniczy w rozpoznawaniu wznowienia.
- Lokalny cache wyłączonej propozycji mógł przejść z konta A na konto B bez tego
  ustawienia w profilu. Cache i synchronizacja tej preferencji respektują UID;
  świadomie wyłączona propozycja pozostaje wyłączona dla jej właściciela.

Testy odtwarzają konkretne ścieżki i powtórkę ruchu. Właściciel nie podał jeszcze
platformy ani nazw powtórzonych ćwiczeń z rzeczywistego treningu; nie traktujemy
tego jako odczytu lub diagnozy jego prywatnej sesji. Wszystkie poprawki są nadal
lokalne, więc test z wcześniej zainstalowanego builda nie weryfikuje tych zmian.

Dowody: [generator i stare szkice](../audit/launch-2026-09-06/warmup-followup-2026-09-07.md),
[propozycja, wznowienie i preferencja](../audit/launch-2026-09-06/warmup-prompt-followup-2026-09-07.md).

## Macierz weryfikacji

| Bramka | Wynik i dowód lokalny |
| --- | --- |
| Pełny frontend | **4084 PASS**, 470 plików, 16 historycznych przypadków pominiętych; `final-vitest.log`. Po tym przebiegu zmieniono wyłącznie krótkie firstWhy PL/EN i testową izolację szkicu: 69/69 celowanych testów rozgrzewki/copy PASS (`final-warmup-copy-tests.log`). |
| Chromium | **330/330 PASS** w pełnej macierzy (`final-e2e.log`); końcowe testy zmienionej rozgrzewki i fixture są opisane poniżej. |
| WebKit | **330/330 PASS**, pełny przebieg po poprawce fixture i skróceniu tekstu; `final-e2e-webkit.log`. |
| Rzeczywiste Auth/Functions/Rules E2E | **18/18 PASS** po poprawkach rozgrzewki; `final-e2e-emulator.log`. Obejmuje zgody, zmianę konta, onboarding, zapis treningu, konflikt, utratę ACK i recovery. |
| Functions unit / emulator | **549 PASS**, 15 przypadków wymagających emulatora pominiętych w zwykłym biegu; osobny emulator **15/15 PASS**. `final-functions.log`, `final-functions-emulator.log`; typecheck i build backendu PASS. |
| Reguły dostępu | **326/326 Firestore + 44/44 Storage PASS**, `final-rules.log`. |
| Typecheck / lint | Typecheck PASS; lint **0 błędów, 15 zastanych ostrzeżeń Fast Refresh**. Końcowe zmiany copy i fixture również lint PASS. |
| Zależności | Powtórzone 7 IX `npm audit`: **0 podatności** w root i Functions; `npm-audit-*-after.json`. |
| Produkcyjny build / bundle / offline | Po końcowej copy: **PASS** build, bundle, start bez błędu JS i cold offline (profil+plan, Dashboard, lazy route, zapis szkicu). Initial JS **1 447 000 B / limit 1 536 000 B**; maksymalny chunk mieści się w 819 200 B. `final-production-build.log`, `final-bundle-budget.log`, `final-dist-smoke.log`, `final-dist-offline.log`. |
| Natywne kompilacje | Po końcowej copy: **PASS** iOS Debug iphonesimulator bez podpisu dystrybucyjnego / Android debug z kluczem debug. Potwierdzono **235 identycznych plików runtime** w mobile dist, obu projektach, App.app i APK. Stub Cordova i metadane Findera opisane osobno. `native-build-receipt.json`. |
| Natywny interfejs | Świeży iPhone 17 / iOS 26.5 oraz nowy Android API 35: instalacja, uruchomienie i formularz nad systemową klawiaturą PASS. `native-shots/final-*-keyboard.png`; bez logowania na rzeczywiste konto. Smoke poprzedza wyłącznie ostatnią korektę opisu rozgrzewki; po niej wykonano ponowną kompilację i porównanie zasobów, bez ponownej instalacji. |
| Fizyczne iOS / Android | **NOT RUN** — 22 scenariusze w osobnym dokumencie; kompilacja i symulator nie zastępują ich wykonania. |

Pełny pierwszy bieg przeglądarek dał **659/660 PASS**: wszystkie 330 Chromium
i 329 WebKit. Jedyny błąd odtwarzał wyścig technicznego usuwania szkicu w teście
z rzeczywistym zaległym autozapisem po odmontowaniu ekranu. Kontrolowany test
zatrzymania i zwolnienia tego zapisu potwierdził przyczynę. Fixture teraz najpierw
odłącza JS aplikacji, potem czyści testowy storage i sprawdza jego pusty stan.
Nie zmieniono produkcyjnego autozapisu ani asercji nowej/wznawianej rozgrzewki.
Cały zmieniony spec przeszedł **6/6** w obu silnikach przed pełną powtórką WebKit.
Powtórka WebKit dała **330/330 PASS**. Następnie ten sam mechanizm izolacji
zastosowano do dwóch analogicznych przygotowań nowej sesji w testach preferencji,
usuwając oczekiwanie 250 ms. Oba pełne specy rozgrzewki w Chromium i WebKit:
**24/24 PASS** na końcowej copy i końcowych fixture (`final-warmup-e2e.log`).
Nie sumujemy powtórek do liczby 660 scenariuszy pełnej macierzy.
Historia RED i dowód są w `warmup-prompt-followup-2026-09-07.md`.

Poranny pełny Vitest ujawnił także zależny od dnia tygodnia fixture PlanTab:
przyszłe środowe/piątkowe cardio w poniedziałek błędnie nazwano przeszłym.
Test otrzymał stały piątek i zachował asercje kolejności; kod produktu pozostał
bez zmian. Błąd starego selektora powitania w E2E emulatora opisuje raport backendu.

Logi w `audit/launch-2026-09-06/` są lokalne i ignorowane przez Git; nie publikować
surowych logów emulatora bez sprawdzenia danych diagnostycznych. Ocena z
`audit/latest.json` dotyczy zaobserwowanej warstwy UI; nie jest certyfikatem
gotowości publikacji ani dowodem braku wszystkich możliwych usterek.

Końcowy manifest lokalnego stanu znajduje się w
`audit/launch-2026-09-06/release-candidate-manifest.json`; odtworzenie i porównanie
zapisuje `final-manifest-verify.log`. Łączy wersje, bazowy commit, zmodyfikowane
źródła, fingerprint środowiska i pełne drzewa artefaktów. Obecne na dysku IPA/AAB
są **historyczne**; ich hash zapewnia rozpoznawalność, nie dowodzi zbudowania
z nowych źródeł. Nowe artefakty tego audytu to diagnostyczne App.app i debug APK.

## Warunki publikacji i kolejność wdrożenia

**Publikacja nie jest zatwierdzona przez ten raport.** Nie wykonano push,
deployu, uploadu TestFlight/Play ani żadnego zapisu treningu na prawdziwym koncie.
Repo może potwierdzić gotowość kodu i narzędzi, nie aktualny stan konsol sklepów
ani działanie czujników/dźwięku na fizycznym telefonie.

1. Wykonać [22 scenariusze urządzeniowe](LAUNCH-DEVICE-QA-2026-09-06.md)
   na fizycznym iOS i Androidzie, na kontach testowych. Każdy wynik musi wskazać
   faktyczny build i backend. Szczególnie: trening z planu → inna sesja → powrót,
   screen-off/resume, słaba sieć, exact alarm, Health revoke/retry, zakup/restore.
2. Zweryfikować Secret Manager `REVENUECAT_SERVER_API_KEY` oraz wymagane
   uprawnienia API v2. Odczyt metadanych zwrócił IAM PERMISSION_DENIED;
   nie ustalono, czy sekret istnieje. Nie pobierano wartości.
3. Skoordynować dostępność nowego klienta z enforcementem Rules i wymaganego
   `expectedOwnerUid` w restore. Stare buildy bez tego pola nie wykonają importu
   JSON na nowym backendzie, a stare raw CSV/backfill zostaną odrzucone przez
   nowe Rules. Nowy klient na starym serwerze nie daje jeszcze pełnego server
   owner fence. Nie wdrażać całego enforcementu automatycznie przed udostępnieniem
   zgodnego klienta. Istniejące treningi nie są migrowane ani usuwane.
4. Wdrożyć indeks `deletion_operations(state,purgeAfter)` i potwierdzić READY
   przed nowym schedulerem. Istniejący w repo indeks `workouts(userId,importBatchId)`
   również wymaga potwierdzenia w docelowym środowisku. Uwzględnić kolejność
   w rzeczywistym wydaniu Functions/Rules; sam lokalny emulator nie dowodzi READY.
5. Zmienić hasło konta recenzenta uprzednio zapisane w runbooku, sprawdzić jego
   logowanie i umieścić dane wyłącznie w prywatnym App Review Information.
6. Potwierdzić w ASC/Play aktualne produkty, sandbox/license tester purchase i
   restore, App Signing/Firebase fingerprints, App Check/Play Integrity,
   listing, rating/DSA oraz App Privacy/Data Safety/Health declarations.
   Repo deklaruje precise location, podczas gdy mapper Stravy nie utrwala tras:
   uzgodnić rzeczywisty przepływ i deklaracje, nie kopiować starej tabeli 1:1.
7. Przygotować nowe podpisane artefakty po QA i zamrożeniu kodu. Marketing/package/
   versionName pozostają **1.0.0**. Obecne 142/48 są numerami historycznej dystrybucji;
   lokalne buildy diagnostyczne z tymi numerami nie są nową dostawą. Kolejny
   build wymaga nowych liczników i manifestu, a następnie świadomego wydania.

Nowy job Android CI ma zweryfikowaną składnię i zależności; lokalna kompilacja
sprawdza obecny kod. Pierwszy rzeczywisty przebieg nowego joba na GitHub pozostaje
do potwierdzenia po pushu. 15 ostrzeżeń Fast Refresh to stan zastany, bez błędów lint.

## Zakres dowodów i źródła

Audyt UI: mobilne dane syntetyczne aktywnego użytkownika, onboarding oraz admin,
PL/EN, mały ekran, duży tekst, poziom i scenariusze błędów. Natywne uruchomienie
wykonano na nowych urządzeniach wirtualnych, bez wykorzystania istniejących
sesji użytkowników. Smoke logowania nie zalicza treningu w kieszeni ani zakupów.

GitHub: brak otwartych Issues i PR w chwili przeglądu. Ostatni nieudany workflow
[33874959256](https://github.com/grzegorzee/strength-save/actions/runs/33874959256)
padł przy pobraniu binarnego pakietu SPM z HTTP 500. Bieżący dla bazowego `33df6dbd`
miał już zielony job iOS; nie jest dowodem dla lokalnych poprawek tego audytu.

Punkty odniesienia sprawdzone w oficjalnych źródłach:
[Apple Accessibility](https://developer.apple.com/design/human-interface-guidelines/accessibility),
[Apple Entering data](https://developer.apple.com/design/human-interface-guidelines/entering-data),
[WCAG2.2](https://www.w3.org/TR/WCAG22/),
[Apple wymagania wydania](https://developer.apple.com/news/upcoming-requirements/),
[Google target API](https://support.google.com/googleplay/android-developer/answer/11926878?hl=en),
[Health Connect](https://developer.android.com/health-and-fitness/health-connect/get-started),
[Capacitor Local Notifications](https://capacitorjs.com/docs/apis/local-notifications),
[Vite watcher](https://vite.dev/config/server-options#server-watch).
Szczegółowe ustalenia wersji SDK, pluginów i ograniczeń znajdują się w raporcie
natywnym, wraz z linkami do konkretnych kontraktów.
