# LOG DECYZJI - Strength Save

> Wszystkie ważne decyzje projektowe w jednym miejscu

---

**Data utworzenia:** 2026-01-28
**Ostatnia aktualizacja:** 2026-08-31 (X73: kandydat 1.0, recovery produkcji i listing sklepowy)

---

## DECYZJE

### 2026-08-31: X73 — kandydat 1.0 jest prawdziwym artefaktem, a dane mają recovery

**Kontekst i root cause:** audyt przed premierą wykazał nie tyle nowy błąd rdzenia,
co cztery luki operacyjne: Firestore bez PITR/backup/delete protection, publiczną
obietnicę niedziałającej Stravy, pusty listing App Store i dwa konflikty rewizji
bez rozróżnienia finalizacji od checkpointu w Centrum synchronizacji. Dodatkowo
angielskie systemowe prompty iOS dziedziczyły polskie teksty. Build 135 nie
zawierał tych zmian, więc nie mógł być kandydatem 1.0.

**Decyzja i zakres:** produkcyjny Firestore ma delete protection, siedmiodniowy
PITR oraz codzienny backup przechowywany 14 dni. Istniejący budżet 50 PLN/miesiąc
pozostaje kanoniczny; dodano alert błędów runtime i 30 tys. odczytów Firestore na
dzień. Automatyczny job Stravy jest wstrzymany, a Store/landing nie obiecują tej
funkcji do czasu aktywacji dostawcy. Dane i kod integracji nie są usuwane.

Konflikty z 31 sierpnia były dwoma ręcznymi retry starej rewizji tej samej sesji;
kanoniczna ukończona rewizja 11 z 5 ćwiczeniami i 20 seriami pozostała w chmurze.
Guard zadziałał i nie ma dowodu utraty danych. Centrum synchronizacji rozróżnia
teraz zaległą finalizację (`final`) od aktywnego checkpointu, a test niezmiennika
pilnuje, że konflikt nie usuwa żadnej wersji. Nie wykonujemy automatycznego
rozstrzygnięcia na realnym koncie.

iOS otrzymał lokalizowane po polsku i angielsku prompty Camera, Photos i Health.
Następnym kandydatem jest 1.0.0 build 136. App Store 1.0 ma aktualny angielski
opis, Privacy URL, rating 4+, oraz 10 zaakceptowanych screenshotów 1320×2868 z
fikcyjnego konta. Publiczne wysłanie do App Review pozostaje oddzielną decyzją po
fizycznym smoke dokładnego builda 136 i uzupełnieniu numeru telefonu recenzenta.

**Weryfikacja lokalna przed artefaktem:** Vitest 3876/3876 (448 plików),
Functions 513 PASS/12 SKIP i registration 12/12, oba typechecki, lint bez błędów,
build, budżet paczki, dist smoke, offline, no-emoji i npm audit są zielone.
Firestore Rules przechodzą 317/317, Storage Rules 42/42 na JDK 21. Pełny E2E po
świeżym cache Vite obejmuje 314 scenariuszy Chromium i 314 WebKit. Landing ma
kanoniczne 71 publicznych funkcji, 25 programów i 10 aktualnych ekranów; jego
testy 38/38, build oraz responsive smoke 320/390/1440 px przechodzą.

### 2026-08-31: X72 — Postępy są dziennikiem wyników, a etykiety nie mogą być skracane

**Kontekst i root cause:** poprzedni ekran Postępów dokładał kolejne kapsuły i
duże przyciski bez wspólnej hierarchii. Cztery główne miejsca były ściskane do
trzech przycisków i menu, przez co „Wykresy” zmieniały się w „WYKRE…”. Tydzień,
Miesiąc i Udostępnij zajmowały osobne duże kafle. Rekordy rozbijały jedną liczbę
na trzy nierówne karty, nazwy ćwiczeń kończyły się `(...)`, a Odznaki zaczynały
się od niepowiązanej z produktem grafiki gwiazdy i wieńca. Osiągalne legacy
„Podsumowania tygodniowe” nie miały wystarczającego kontraktu danych i sprawiały
wrażenie niepełnych. Poza Postępami kilka statycznych etykiet w Planie, Profilu,
Historii i bibliotece ćwiczeń dziedziczyło `truncate` albo jednoliniową wysokość.

**Decyzja:** Postępy przyjmują hierarchię spokojnego dziennika siłowego. Cztery
główne zakładki — Wyniki, Wykresy, Rekordy i Odznaki — są zawsze bezpośrednio
widoczne jako jedna równa szyna z pełnymi nazwami. Wyniki mają kompaktowy segment
Tydzień/Miesiąc i ikonową akcję udostępniania, a pod nimi jeden wspólny
scoreboard. Rekordy pokazują tonaż na pełnej szerokości, a nazwy ćwiczeń zawijają
się zamiast być skracane. Odznaki nie mają sztucznego hero; zaczynają się od
rzeczywistych osiągnięć użytkownika. Legacy `tab=weekly` i `tab=details` wracają
do aktualnych Wyników, a powiadomienie tygodniowe otwiera właściwy poprzedni
okres. Strava pozostaje osiągalna z Wykresów dla kont objętych flagą.

Statyczne etykiety interfejsu w PL i EN nie mogą używać wielokropka ani być
obcinane przez kontener. Długie dane użytkownika mogą pozostać ograniczone tylko
tam, gdzie obok istnieje pełny kontekst lub osobny widok, ale nazwy rekordowych
ćwiczeń są informacją pierwszoplanową i zawijają się. Test runtime sprawdza
viewport 320 px, oba języki, główne trasy, rozwinięte menu, dialogi, formularze,
onboarding, paywall i panel administracyjny: brak wyjścia poza viewport, clippingu,
ellipsis i poziomego scrolla. Przy okazji audyt wykrył błąd przekierowania
`/analytics`: alias zachowywał tylko `tab`, gubiąc `period` i `offset`; alias
przenosi teraz cały query string.

**Weryfikacja przed wydaniem:** Vitest 3869/3869 (446 plików), typecheck, build,
budżet 1 442 738/1 536 000 B, dist-smoke, offline i no-emoji 276 są zielone.
Lint ma 0 błędów i 15 zastanych warningów Fast Refresh. Pełny Chromium E2E
przechodzi 314/314, w tym 8 scenariuszy audytu etykiet PL/EN oraz wizualny smoke
Postępów 393 px. Na JDK 21 Firestore Rules przechodzą 317/317, a Storage Rules
42/42. Fala nie zmienia Functions ani Rules, więc backendu nie wdrażamy ponownie.
Galeria dowodowa jest w `audit/shots/2026-08-31-x72/`. Wersja marketingowa
pozostaje 1.0.0; następnym kandydatem iOS jest build 135. Fizyczny przegląd
Postępów i smoke na realnym iPhonie pozostają podpisem właściciela po TestFlight.

**Rollout 2026-08-31:** commit `d431c262` jest na `main`, web został
opublikowany, a domena produkcyjna zwraca 200 z bundla
`assets/index-CVNpyrbP.js`. Po świeżym DerivedData iOS Simulator zbudował,
zainstalował i uruchomił App+Watch. Pierwsza próba użyła uszkodzonego stałego
cache Swift Package w `/tmp` (brak manifestu Capacitor); izolowany rerun wykazał,
że root cause był w cache bramki, nie w aplikacji. IPA 1.0.0 (135), SHA-256
`6c67b55fa593eae821f8a38e632a45a22675eb57295a65ed2fb35181522882c7`,
zostało wgrane bez błędów (`Delivery UUID
c8adc9b5-5a2c-44fa-aae7-0ecac03b3f64`). Build ma stan `VALID`, obie grupy
TestFlight, opis testów i Beta App Review `APPROVED`.

Fizycznego smoke'a nadal nie oznaczamy jako wykonanego: podłączony iPhone jest
widoczny jako offline, a ADB nie widzi urządzenia z Androidem. Właściciel musi
sprawdzić dokładny build 135 na realnym telefonie przed publicznym submission.

### 2026-08-31: X71 — trwałe palety, kanoniczny reminder, bounded auth i przebudowane Postępy

**Kontekst i root cause:** produkcyjne konto miało wyłącznie legacy
`accentColor: rose`; emisje profilu uznawały ten fallback za nowszy od pełnej
palety i czyściły lokalny wybór. Outbox nie miał rewizji między urządzeniami.
Poranny reminder wybierał dzień tylko po weekday i ignorował `startDate`,
przełożenia, pominięcia oraz zakończenie planu. Cold auth miał jedną nieograniczoną
bramkę sieciową. Historia commitowała pierwszy klik zakresu i zamykała popover.
Postępy rozdzielały Tydzień/Miesiąc do ukrytych Szczegółów, porównywały niepełny
okres z pełnym poprzednim i filtrowały progresję według aktualnego planu.

**Decyzja:** zostaje jeden kolor główny aplikacji oraz dwa kolory wspierające o
zamkniętych rolach (dane i oszczędna dekoracja), nie trzy równorzędne akcenty.
Pełna poprawna paleta zawsze wygrywa z legacy accentem. Zapis presetów używa
transakcji, `paletteRevision` i idempotentnego mutation ID; zaległy zapis offline
nie może nadpisać nowszego wyboru z innego urządzenia. Reminder i Garmin używają
jednego resolvera dnia planu. Po 3 s auth może wejść wyłącznie na użytkownika
utrzymywanego przez Firebase SDK; bez takiej tożsamości pokazuje komunikat i retry,
bez obchodzenia auth. Zakres dat ma lokalny draft i commit przy zamknięciu.

Wyniki są jednym ekranem z Tydzień/Miesiąc, pagerem okresów i porównaniem
to-date do tego samego fragmentu poprzedniego okresu. Udostępnianie używa
systemowego share sheetu z fallbackiem do schowka. Stare `tab=details` wraca do
Wyników; Miesiące i Obciążenie hybrydowe są w Wykresach. Progresja wybiera jedno
ćwiczenie z całej ukończonej historii, niezależnie od bieżącego planu. Dialog
trenera łamie długi e-mail bez poziomego overflow.

**Weryfikacja:** finalny Vitest 3864/3864 (446 plików), Functions 513 PASS/12
SKIP (48 plików + 1 skip) i oba typechecki są zielone. Lint ma 0 błędów i 15
zastanych warningów Fast Refresh. Build, budżet 1 442 738/1 536 000 B,
dist-smoke, offline, no-emoji 276, iOS release preflight i `git diff --check`
przechodzą. Po świeżym Vite/cache Chromium 305/305 i WebKit 305/305; wykryty
wyścig dwóch natychmiastowych kliknięć w teście został zsynchronizowany z renderem
i przeszedł dodatkowo 5/5. Na JDK 21 Firestore Rules przechodzą 317/317 (w tym
5 bezpośrednich przypadków rewizji/mutation ID palety), a Storage Rules 42/42.

Przed zleceniem release nie wykonano deployu, pushu, bumpu ani uploadu. iOS
1.0.0 build 133 i Android 1.0.0 code 45 są poprawnie oznaczone jako starsze od
X71. Wydanie X71 wymaga Functions + Firestore Rules, nowego klienta (następny
iOS build 134) i fizycznego smoke’a; właściciel zlecił rollout 2026-08-31.

**Rollout 2026-08-31:** commit implementacji `956b61a0` i przygotowanie builda
`21a87921` są na `main`. Firestore Rules wdrożono po pełnym przebiegu na JDK 21;
wszystkie 69 Functions są `ACTIVE`, a produkcyjne przebiegi
`dailyTrainingReminder` kończą się bez błędów. Web został opublikowany i domena
produkcyjna zwraca 200 z bundla `assets/index-BK4azUWq.js`. iOS 1.0.0 build 134
przeszedł archive, export i upload (`Delivery UUID
5e9dbbdb-9246-43df-bd1d-6084199a7ca4`), ma stan `VALID`, jest przypięty do obu
grup TestFlight i ma Beta App Review `APPROVED`.

Natywny smoke zastępczy przeszedł: iOS Simulator zbudował, zainstalował i
uruchomił App+Watch na ekranie Dzisiaj, a Android API 35 zbudował debug APK,
zainstalował je i uruchomił `MainActivity` na ekranie logowania. Fizycznego smoke'a
nie wolno oznaczyć jako wykonanego: iPhone `00008120-000E6CC23638C01E` był
offline, a ADB nie widział żadnego realnego Androida. To pozostaje obowiązkową
bramką właściciela po podłączeniu i odblokowaniu obu telefonów; smoke nie może
zapisywać serii na realnym koncie bez jawnej zgody.

### 2026-08-28: X70b — trzy korekty właściciela po przeglądzie przed/po

Właściciel obejrzał galerię X70 i skorygował kierunek (decyzje produktowe,
nie bugi): (1) na Dzisiaj wraca stary układ karty sesji — tytuł to nazwa dnia
w jednej linii, focus w podtytule z liczbą ćwiczeń (duży focus zawijał się na
dwie linie i rozciągał ekran); na Planie tytuł = focus zostaje, bo tam była
potrójna duplikacja; (2) zakładki Postępów WYNIKI/WYKRESY/REKORDY to trzy
OSOBNE przyciski z ramką 1 px (border-border, rounded-full, gap), aktywny
wypełniony primary — bez wspólnej kapsuły; semantyka tablist/tab i testidy bez
zmian; (3) wraca pełna etykieta „Zobacz pierwszy tydzień" — zawijanie i h-14
z X70 gwarantują brak overflow na 320 px (pomiar: 2 linie, zero wyjścia poza
przycisk). Profil bez zmian („jest super").

Commity: 418b8542 (implementacja + testy) i 27323577 (aktualizacja kontraktu
selection-button do nowego wyglądu tabów — pełny vitest wykrył, że stary
kontrakt wymagał border-muted-foreground; kontrakt świadomie przepisany na
border-border + bg-primary, bez osłabienia focus/nazw). Weryfikacja: QA
wizualne 6/6 bez regresji; pełny Vitest 3850/3850; Functions 511/12; rules
312+42; E2E Chromium 305/305 + WebKit 305/305; mobile w bloku 3. Lekcja
(zasada 15 w praktyce): testy celowane torów nie łapią kontraktów czytających
źródła innych plików — pełny suite przed wydaniem jest nienegocjowalny.

### 2026-08-28: X70 — paleta to znów trzy kolory, tap zapisuje, teksty bez duplikacji

**Kontekst:** po testach builda 131 właściciel zgłosił: wybór palety "nie działa",
przepełnione CTA na karcie startu, zduplikowane daty na Dzisiaj/Planie, słabe
kafle Postępów. Audyt (4 agentów po kodzie + weryfikacja na żywo web i iOS
Simulator ze screenshotami) pokazał, że "nie działa" to kaskada CZTERECH przyczyn,
z których żadna nie była awarią mechanizmu:

1. **Pulse wizualnie identyczna z domyślną limonką** (#c6ff00 vs #cefc22) i
   zapisywana każdemu po onboardingu — wybór Pulse nie zmieniał nic widocznego.
2. **Wyścig ze snapshotem Firestore:** efekt w Profile.tsx miał obiekt w deps
   (świeży przy każdej emisji, także metadata-only) i bezwarunkowo re-aplikował
   paletę z chmury; ack własnego zapisu po 0,5-2 s cofał świeży wybór. Mock E2E
   nie ma snapshotów, dlatego web "działał", a realne konto na iOS nie.
3. **Tap = tylko podgląd; wyjście bez Zatwierdź po cichu cofało wybór**
   (unmount pickera robił restoreBase), podczas gdy onboarding zapisywał
   jednym tapnięciem.
4. **supportA/supportB bez żadnego konsumenta w UI** poza dwiema seriami
   wykresów — "paleta trzech kolorów" degradowała się do jednego.

**Decyzje i naprawy (5 torów, commity 61450264, ebb13f94, 5d6d2647, 6f6f3ce1,
9fa697cf + 1c2325d9):** dep na sygnaturze prymitywnej + no-op gdy paleta z chmury
równa lokalnej (realna zmiana z innego urządzenia nadal się aplikuje; test
sekwencji tap Forge → stary ack Pulse → Forge zostaje); tap zapisuje od razu
również w Profilu (kontrakt preview/confirm usunięty świadomie, z aktualizacją
testów); karta aktywnej palety z jawnym stanem "Aktywna" i podpisem, że Pulse to
domyślny wygląd (hexy presetów nietknięte — pilnują ich rules); role kolorów
wspierających wg decyzji właściciela "dane/dekoracja": supportA = drugi akcent
danych (ikona rekordów, serie wykresów), supportB = dekoracja (tint banera
tygodnia, poświata hero bramkowana data-palette, księżyc) z fallbackami równymi
staremu wyglądowi (bez palety zero zmiany) i nowym testem kontraktowym
palette-support-roles; legacy siatka 11 kolorów za zwiniętym "Więcej kolorów"
(koniec prześwitu pod glass navem); karta startu bez zdublowanej daty i bez
drugiego eyebrow, CTA "Zobacz tydzień 1" h-14 (przedtem tekst 270 px wystawał
z 208 px wnętrza na 320 px); tytuł karty sesji = focus treningu z fallbackiem na
dzień (dzień zostaje w nagłówku sekcji); baner zaległości bez błędnej odmiany
("Trening {day} ({date}) czeka"); delta tonażu ukryta przy poprzednim okresie
<2 treningów lub bieżącym <3 dni; "Tygodnie z rzędu"; ikona Share2 zamiast
trzech kropek; redirect /progress → /achievements (był 404); size xl w Button;
radius kinetic 24→16 px (spójny kształt CTA niezależnie od wysokości).

**Bonus z weryfikacji B5:** mieszany język focusów w EN to była ścieżka
PRODUKCYJNA — słownik localizeFocus nie znał tokenów Przysiad/Środek/Pleców/
Szerokie/Uda/Płasko/Jednonóż/Detali i innych; słownik uzupełniony.

**Co poszło nie tak w procesie:** (1) pierwotne zgłoszenie "palety nie działają"
okazało się czterema różnymi wadami — pojedyncza hipoteza byłaby fixem
objawowym (zasada 17 obroniona przez równoległy audyt kodu i dwie weryfikacje
wizualne); (2) pełne e2e wykryły kolizję nowego redirectu /progress ze starym
kontraktem Z60 ("martwe aliasy = 404") — deterministyczna na obu silnikach,
rozwiązana aktualizacją kontraktu (Z60 nadal pilnuje /stats i /summary, nowy
test pilnuje redirectu); (3) błąd operatorski orkiestratora: "cd w kompozycie
zostaje" — start bloku e2e ze względną ścieżką po zmianie cwd cicho nie
wystartował procesu; wykryty, bo weryfikujemy pgrep po starcie; skrypty tła
odpalane odtąd wyłącznie ścieżką absolutną.

**Weryfikacja:** Vitest **3850/3850** (443 pliki, +14 testów), Functions 511
PASS/12 SKIP, Firestore 312/312, Storage 42/42 (JDK 21), typecheck, lint, build,
bundle budget, dist-smoke, offline, no-emoji, diff-check zielone; pełne E2E po
restarcie Vite: Chromium **305/305**, WebKit **305/305**; QA wizualne 13/13 bez
regresji (galeria przed/po w artifactcie). Mobile w bloku 3.

### 2026-08-28: X69-release — kontrolowane wydanie backend-first na jawne zlecenie właściciela

Właściciel zlecił wydanie i zapowiedział testy urządzeniowe tego samego dnia.
Kolejność zgodna z planem rollout health v2: najpierw backend, potem klient.
Push `3009e42f` + `51878d55`; 69 Functions (nowe `syncWorkoutV2`,
`restoreWorkoutBackupV3`), Firestore rules + indexes i Storage rules released;
web `index-B4A79kd5` na produkcji z zielonym smoke Chromium + WebKit (zero
pageerror); iOS build 131 w TestFlight z `betaReviewState = APPROVED` (obie
grupy, whatsNew ustawione); podpisany AAB versionCode 43, SHA-256
`39d172bd5e409f3a5cf04a9f765ad1ec2a5cdd01001deacca70633f3be9d0431`, na Pulpicie.
Syntetyczny pierwszy zapis `syncWorkoutV2` na produkcji wykona właściciel
(callable wymusza App Check; dane konta QA nieosiągalne, plik z CLAUDE.md nie
istnieje — do odtworzenia). Obowiązkowy przegląd `client_errors` w ciągu 24 h
po testach. Wersje marketingowe pozostają 1.0.0; publiczna publikacja App
Store/Play nadal wymaga osobnej decyzji po fizycznym QA.

### 2026-08-28: X69 — dokończenie fali uciętej limitem: pasek nawigacji publikuje zmierzoną wysokość, outbox palety jest typowo i behawioralnie domknięty

**Kontekst:** sesja zewnętrznego agenta została ucięta limitem 2026-08-28 ~14:16,
w trakcie trzech równoległych audytów domykających (release, typografia,
palety/avatar). Delta po bramce X68 (13:12) pozostała bez końcowej weryfikacji:
dwa wywołania `flushPalettePreferenceOutbox` nie przechodziły bramki typecheck,
a macierz e2e skali tekstu miała czerwony scenariusz `pre-start pl 320x568 at
200%` (CTA „Rozpocznij trening" nachodziło na dolną nawigację).

**Root cause typecheck:** `PalettePreferencePatch` był zadeklarowany jako
`interface`, a interfejsy w TypeScript nie mają niejawnej sygnatury indeksu,
której wymaga `UpdateData` w `updateDoc` (indeks `${string}.${string}`). Zmiana
na alias typu (`type`) przywraca zgodność bez zmiany kształtu danych ani callerów.
Wariant z `persistPreference` odrzucony świadomie: ten helper połyka błędy zapisu,
a outbox musi widzieć porażkę, żeby zostawić wpis do ponowienia.

**Root cause geometrii:** stała rezerwa `7rem` (CTA startu, spacer strony) i
`6rem` (pasek przerwy) pod elementami fixed zakładała stałą wysokość dolnej
nawigacji. Przy systemowej skali tekstu 200% etykiety nawigacji zawijają się na
dwie linie i pasek przerasta każdą stałą wartość (~123 px > 112 px), więc elementy
fixed na niego nachodziły. Fix systemowy zamiast kolejnej stałej: `AppNavigation`
mierzy własny pasek (ResizeObserver + resize) i publikuje odległość od dołu
viewportu do jego górnej krawędzi jako `--mobile-nav-clearance`; CTA startu,
spacer strony treningu i `RestBar` konsumują zmienną z dotychczasowymi wartościami
jako fallbackiem przed pierwszym pomiarem. Ukrycie paska (desktop-shell) usuwa
zmienną i wraca do fallbacku.

**Niezmiennik outboxa domknięty testem wprost:** po świadomym wyborze legacy/
custom HEX (discard) `flush` zwraca `none` i nie wykonuje żadnego zapisu — stary
preset nie może wrócić i nadpisać świadomej decyzji. Znane ograniczenie
(odnotowane, nie naprawiane w tej fali): ochrona działa per urządzenie; oczekujący
outbox na urządzeniu A może po powrocie online nadpisać w chmurze późniejszy wybór
z urządzenia B, bo preferencje nie mają wersjonowania.

**Weryfikacja (pełny komplet bramek na dokończonym kandydacie):** Vitest
**3836/3836** w 441 plikach; Functions **511 PASS/12 SKIP** + typecheck; emulator
rejestracji **12/12**; Firestore Rules **312/312** (w tym nowa reguła
PaletteThemeV2 „powtórzona rola DENIED"), Storage Rules **42/42** (JDK 21);
typecheck, lint (0 błędów), build, bundle budget **1 441 265/1 536 000 B**,
dist-smoke, dist-offline, no-emoji i `git diff --check` zielone. Pełne E2E po
restarcie Vite i wyczyszczeniu cache: Chromium **304/304**, WebKit **304/304**
(w tym cała macierz pairwise skali tekstu 9 scenariuszy na obu silnikach).
`mobile:sync` 18 pluginów; Android `assembleDebug` BUILD SUCCESSFUL (642
zadania); iOS Simulator App + StrengthWatch BUILD SUCCEEDED, install i launch.
Nie wykonano deployu, pushu, migracji, bumpu ani uploadu; wersje pozostają 1.0.0,
buildy kontrolne 130/42. Fizyczne iOS/Android/Watch oraz backend-first rollout
health v2 nadal blokują publiczne wydanie.

### 2026-08-28: X68 — pusta seria nie może stać się treningiem, avatar jest prywatny, a Background Runner pozostaje niewdrożony

**Root cause danych treningowych:** ręczny checkmark pozwalał oznaczyć pustą serię
`0 kg / 0 powt.` jako ukończoną. Lokalny finał uznawał wtedy trening za niepusty,
podczas gdy zaostrzony backend mógł go później odrzucić. Powstawał stan bez dobrej
drogi wyjścia. Wspólny kontrakt kompletności wymaga teraz rzeczywistego ruchu:
`reps > 0`, `durationSec > 0` albo `distanceM > 0`. Sama waga lub asysta nie jest
wynikiem. Serie z masą ciała i wykroki nadal poprawnie przechodzą z powtórzeniami
i `0 kg`; zwykłe serie ciężarowe wymagają również dodatniej wagi w UI.

**Root cause prywatności avatara:** Storage Rules pozwalały każdemu zalogowanemu
użytkownikowi odczytać cudzy plik i właścicielowi tworzyć dowolne dodatkowe nazwy
pod `avatars/{uid}`. Reguły ograniczają teraz odczyt, zapis i usunięcie do właściciela
oraz jednej kanonicznej ścieżki `avatars/{uid}/avatar`, z zachowaniem limitu `< 5 MiB`
i MIME `image/*`. Admin nie dostał wyjątku bez istniejącego, bezpiecznego modelu
uprawnień. Tokenizowany `getDownloadURL` pozostaje osobnym ryzykiem bearer URL,
dlatego nie wolno traktować samego URL jako tajnego ani umieszczać go w logach.

**Decyzja o tle i mediach:** nie instalujemy `@capacitor/background-runner` bez
telemetrii dowodzącej, że systemowy foreground resume, trwały draft i kolejka sync
nie wystarczają. Pełne filmy nie są automatycznie cache'owane; lokalne opisy PL/EN
i spakowane assety są kanonicznym fallbackiem. Mała miniatura avatara pozostaje
local-first w `LibraryNoCloud`.

**Weryfikacja:** czerwone testy odtworzyły pusty trening, wagę bez ruchu oraz odczyt
avatara przez obcego użytkownika. Po minimalnych poprawkach: Vitest 3822/3822 w
438 plikach; Functions 511 PASS/12 SKIP i typecheck; Firestore 310/310; Storage
42/42; root typecheck, lint 0 błędów (15 istniejących ostrzeżeń), build, bundle
budget, dist-smoke, offline i no-emoji są zielone. Po osobnych restartach Vite i
usunięciu cache Chromium oraz WebKit mają po 297/297. `mobile:sync` znalazł 18
pluginów; Android `assembleDebug` i iOS Simulator App+Watch zakończyły się sukcesem.
Nie wykonano deployu, pushu, migracji, bumpu ani uploadu. Wersje pozostają 1.0.0;
fizyczne iOS/Android oraz backend-first rollout nadal blokują publiczne wydanie.

### 2026-08-28: X62 — pełny kandydat lokalny jest zielony, ale fizyczne urządzenia i health v2 nadal blokują publiczne wydanie

**Root cause dwóch klas czerwonych E2E:** po uproszczeniu Postępów dwa testy nadal
szukały analizy hybrydowej na głównych `Wynikach`, choć produkt świadomie przeniósł
ją do `Więcej → Szczegóły`. Testy chronią teraz obie części kontraktu: lekki ekran
główny oraz zachowaną analizę w szczegółach. Osobny fail WebKit odczytywał liczbę
kart ćwiczeń w trakcie spinnera lazy route; zrzut pokazał stan ładowania, a snapshot
końcowy komplet kart. Asercja czeka teraz na widoczną kartę zamiast jednorazowo
próbkować DOM. Powtórzenie 6/6 i pełny rerun 594/594 są zielone.

**Końcowe bramki lokalne:** Vitest 3753/3753 w 429 plikach; Functions 492 PASS/12
SKIP i typecheck; Firestore Rules 296/296; Storage Rules 33/33; root typecheck,
lint 0 błędów, build, budżet bundla 1 433 014/1 536 000 B, dist-smoke, offline,
no-emoji 273 pliki i `git diff --check` są zielone. Świeży Chromium + WebKit mają
594/594. `mobile:sync` zsynchronizował 18 pluginów; czysty Android `assembleDebug`
oraz instalacja/launch API 35 przeszły, tak samo czysty iOS Simulator build,
install i launch wraz z targetem Watch.

**Decyzja release:** wynik audytu lokalnego to 9,3/10, nie 10/10. Nie wykonano
deployu, pushu ani uploadu TestFlight. Publiczne wydanie pozostaje zablokowane do
produkcyjnego wpięcia granicy `syncWorkoutV2` opisanej w X61, jednego
audytowalnego snapshotu oraz fizycznych prób iOS/Android/Watch: screen-off,
background/resume, przerwany trening, force-kill recovery, eksport/share,
notyfikacje, HealthKit/Health Connect, VoiceOver/TalkBack i skala tekstu. Wersje
pozostają `1.0.0`, a `CURRENT_PROJECT_VERSION` pozostaje 130.

### 2026-08-28: X61 — palety zostają w onboardingu; Watch jest fail-closed, a syncWorkoutV2 pozostaje niewpiętym fundamentem

**Decyzja produktowa:** trzy gotowe palety Pulse/Forge/Glacier oraz wejście
„Własny kolor” pozostają w onboardingu jako krótki, świadomy moment personalizacji
i efekt jakości od pierwszego uruchomienia. Nie dokładamy kolejnego kroku ani
obowiązkowej decyzji: Pulse jest bezpiecznym ustawieniem domyślnym, a pełny edytor
pozostaje ujawniany na żądanie. Analiza avatara nadal nie wchodzi do 1.0.0.

**Watch health — root cause i decyzja:** opcjonalne pole w starszym payloadzie
mogło być interpretowane niejednoznacznie, a wznowienie Watch mogło uruchomić
HealthKit bez świeżej, jawnej decyzji telefonu. Każdy aktualny payload niesie teraz
`healthFeaturesEnabled`; brak albo `false` oznacza fail-closed. Bazowe logowanie
serii na Watch nadal działa, ale nie uruchamia, nie odzyskuje i nie zapisuje sesji
HealthKit. Revoke usuwa możliwość kolejnego startu/odzyskania HealthKit bez
kasowania bazowego treningu. Granica ma testy TS/Swift i przeszła pełny build
Watch oraz osadzonej aplikacji iOS; zachowanie na fizycznym iPhone + Watch nadal
wymaga ręcznego podpisu.

**syncWorkoutV2 — świadome niewpięcie:** powstał zabezpieczony callable i adapter
klienta z kontraktem `revision`/`writeId`, obsługą utraconego ACK, niezależnym
zapisem `workout_health_v2` oraz weryfikacją dokładnego `healthEpoch` i
`healthGrantId`. Bazowy trening może zakończyć się mimo braku zgody lub błędu
health side-write. Fundament nie jest podłączony do bieżącego `batchSaveWorkout`
ani kolejki produkcyjnej. Wpięcie pozostaje zablokowane do czasu: utrwalenia fence
epoki/grantu w drafcie i kolejce w chwili wpisania danych; kolejki pending health
ponawianej z tym samym `writeId`; read-joinu bez znikania metryk po reloadzie;
eksportu i usuwania danych właściciela po cofnięciu zgody; oraz kontrolowanego
minimum-client rollout z blokadą nowych legacy writes przez stare klienty.

**Wyniki:** korekta X60 — trzecią liczbą są „nowe rekordy”, nie „ostatnia waga”.
Domyślny widok pozostaje jednym tygodniowym insightem i trzema liczbami: tonaż,
seria tygodni oraz nowe rekordy. Miesiąc, obciążenie hybrydowe i pozostałe analizy
są dostępne przez `Więcej → Szczegóły`, a lista sesji pozostaje w Historii.

**Weryfikacja lokalna:** kontrakty Watch i powiązane przepływy 50/50, foundation
Functions `syncWorkoutV2` + workout-health 13/13, adapter klienta 3/3, palety
onboardingu 3/3 oraz uproszczone Wyniki 18/18. Typecheck klienta i Functions jest
zielony. Nie wykonano deployu, pushu, migracji ani publikacji; pełne bramki oraz
fizyczne iOS/Android/Watch nadal rozstrzygają gotowość wydania.

### 2026-08-28: X57 — prostota jako stała bramka produktu i pełna regresja health (bez wydania)

**Decyzja produktowa:** `docs/PRODUCT-PRINCIPLES.md` jest stałym kontraktem
każdej zmiany. Ekran ma jedno bieżące zadanie i najwyżej jedną dominującą akcję;
informacje są ujawniane warstwami Teraz → Kontekst → Szczegóły. Liczby,
rekomendacje i obietnice wymagają danych oraz opisanej metody. Zakazane są
antropomorfizacja algorytmu, pozorowana analiza, generyczne pochwały, sztuczny
entuzjazm, dekoracyjne emoji i elementy bez funkcji. Uproszczenie nie może ukryć
błędu, kontroli danych ani drogi odzyskania treningu.

**Root cause dwóch czerwonych E2E:** po wdrożeniu fail-closed health domyślny
profil E2E bez aktualnej zgody poprawnie nie renderował chipa RPE/ból/jakość i nie
pozwalał edytować pomiarów. Stare testy nadal zakładały bezwarunkowy dostęp, więc
nie odtwarzały deklarowanego przepływu opt-in. Produkcja nie została osłabiona;
oba testy jawnie seedują health 1.1 i chronią stary dobrowolny flow. Izolowana
reprodukcja była czerwona 0/2, po minimalnej korekcie danych testowych zielona 2/2.

**Weryfikacja:** pełny Chromium 296/296 oraz WebKit 296/296 po osobnych restartach
Vite i usunięciu `node_modules/.vite`. Bundle budget 1 432 254/1 536 000 B,
dist-smoke, offline contract, no-emoji 270 plików i `git diff --check` przechodzą.
Wcześniejsze bramki tej samej delty: Vitest 3712/3712, Functions 454 PASS/12 SKIP,
typecheck, lint i build zielone. Publiczny release nadal blokuje backendowa granica
health i fizyczne QA iOS/Android; nie wykonano deployu, pushu ani publikacji.

### 2026-08-27: X48 — fail-closed mediów, wiarygodny preflight i plan dostępnej typografii (bez wydania)

**Filtr produktu:** prostota ma pierwszeństwo przed liczbą funkcji. Domyślny
ekran prowadzi do jednej decyzji, szczegóły są ujawniane na żądanie, a funkcja
kosmetyczna lub zewnętrzna nie może blokować planu ani treningu. Do 1.0.0
kwalifikują się trzy gotowe palety Pulse/Forge/Glacier; pełne trzy role z avatara
pozostają falą 1.1. Apple, e-mail, brak zdjęcia i offline dostają ten sam kompletny
wybór presetów. Nie analizujemy cech osoby, nie udajemy AI i nie zapisujemy obrazu.

**RevenueCat / preflight — root cause:** bezpośrednie `preflight:ios-release` nie
ładowało pliku `.env` w trybie `mobile`, chociaż właściwy build Vite go ładował.
Powstawała fałszywie czerwona bramka albo ryzyko rozjazdu między walidacją a
artefaktem. Skrypt używa teraz tego samego `loadEnv('mobile')`, respektuje jawne
zmienne procesu i odrzuca brak klucza, `sk_`, `test_`, `goog_` oraz zły format.
Akceptowany jest tylko publiczny klucz Apple `appl_`; wartość nigdy nie trafia do
logu. Test zaczął od 8 czerwonych przypadków, po poprawce ma 13/13 PASS, a realny
preflight dla 1.0.0 przechodzi.

**Media ćwiczeń — root cause i decyzja:** pełny Chromium ujawnił prawdziwy
`ERR_CERT_COMMON_NAME_INVALID`. Read-only TLS/HTTP potwierdził, że
`media.gjasionowicz.pl` podaje certyfikat wyłącznie dla `*.b-cdn.net`, a strefa
Bunny odpowiada `403 Domain suspended or not configured`. To nie jest regresja
Reacta. Produkcja od teraz failuje zamknięta: bez jawnego, zweryfikowanego
`VITE_EXERCISE_MEDIA_BASE_URL` helper zwraca `null`, więc trening zachowuje opis
i placeholder bez niedziałającej kontrolki oraz błędów WebView. E2E używa lokalnych
fixtures; przywrócenie animacji wymaga naprawionej strefy, ważnego TLS i osobnego
smoke realnych plików. Test regresji najpierw był czerwony 3/5, potem zielony 5/5.

**Typografia:** zachowujemy tylko self-hosted Inter Variable i Space Grotesk
Variable. Audyt oficjalnych wytycznych Apple/Android/WCAG wykazał brak dowodu
systemowej skali 200% w WebView oraz ślepe pole guardu: `.eyebrow-mono` miało
10,4 px, a `.chip-mono` 10 px. Nowy test skanuje deklaracje CSS i był czerwony dla
obu klas; minimalny fix ustawia 11 px. Pełne tokeny semantyczne, reflow 200% i
fizyczny podpis iOS/Android pozostają bramką, opisaną w
`docs/RESEARCH-TYPOGRAPHY-ACCESSIBILITY-1.0.0-2026-08-27.md`. Nie instalujemy
pluginu wymuszającego 100% tekstu.

**Stan operacyjny bez mutacji:** SNS eventów SES ma potwierdzony endpoint HTTPS,
ale e-mail alarmów reputacji nadal jest `PendingConfirmation`; alarmy są aktywne
i mają `INSUFFICIENT_DATA`. Sekret Stravy ma jedną aktywną wersję i nadal wymaga
zewnętrznej rotacji. Nie wykonano deployu, pushu, publikacji ani zmian sekretów.

**Weryfikacja:** Vitest 3663/3663; Functions 454 PASS/12 SKIP; Firestore Rules
282/282; Storage Rules 11/11; build, bundle budget, dist-smoke, offline, no-emoji,
typecheck i lint bez błędów są zielone. Pełne Chromium i WebKit po osobnych świeżych
restartach Vite mają po 286/286. Mobile bundle i `cap sync` obu platform, Android
`assembleDebug` oraz iOS Simulator build+launch przechodzą. Fizyczne urządzenia
oraz nowe podpisane artefakty pozostają otwarte.

### 2026-08-27: X47 — prostota i rzetelność jako automatyczny kontrakt produktu (bez wydania)

**Decyzja produktowa:** domyślny ekran ma pomagać podjąć jedną następną decyzję.
Zaawansowane możliwości pozostają dostępne przez progresywne ujawnianie, ale nie
konkurują z głównym CTA. Efekt jakości ma wynikać z szybkości, czytelności,
przewidywalności i odzyskania danych. Dekoracyjne emoji, marketingowe absoluty,
udawanie AI i metryki bez opisanej metody nie należą do języka Strength Save.

**Onboarding i palety:** personalizacja i zgody są dwoma osobnymi widokami w
tym samym kroku 01/06, dzięki czemu treść prawna nie konkuruje z wyborem wyglądu.
Na pierwszym widoku są trzy kompaktowe palety Pulse/Forge/Glacier oraz opcjonalne
imię. Starsze akcenty, własny HEX i lokalna propozycja ze zdjęcia są za przyciskiem
„Własny kolor”. Zachowano pełną funkcjonalność, stary domyślny kolor i źródła
danych. Palety mają semantykę radiogroup: strzałki i Home/End zmieniają podgląd,
a Tab zatrzymuje się raz. Profil pokazuje tylko zwinięte próbki kolorów.

**Root cause wyścigu palety:** baza przywracania była zamrożona podczas preview,
więc zewnętrzny wybór legacy mógł zostać cofnięty przez późniejsze cancel/unmount.
Baza śledzi teraz aktualne propsy również podczas preview; sam podgląd nadal
niczego nie zapisuje. Test odtwarza preview → legacy → cancel → preview → unmount.

**Root cause wyścigu zgód:** wolny zapis pozostawiał aktywne wizualne i natywne
Wstecz, a późny sukces zawsze przenosił do kolejnego kroku. Podczas zapisu oba
mechanizmy Wstecz są teraz bezczynne, wynik przechodzi najwyżej raz, loading ma
dostępną nazwę i `aria-busy`, a błąd `role=alert` z możliwością ponowienia.
Same checkboxy są w tym czasie niemutowalne, więc UI nie może pokazać innej zgody
niż payload, który właśnie zapisuje serwer. Test zamraża wszystkie trzy kontrolki
na czas pending Promise i potwierdza możliwość ponowienia po błędzie.

**Root cause utraty kompaktowego wyboru palety:** onboarding traktował tapnięcie
jak sam podgląd, a przycisk Dalej nie zatwierdzał go. Użytkownik mógł więc zobaczyć
wybraną paletę i przejść dalej ze starą. Tryb kompaktowy zapisuje teraz gotowy
preset jednym tapnięciem; pełny edytor Profilu zachowuje osobne preview/anuluj/
zatwierdź. Test odtwarza tap → Dalej i sprawdza utrwalenie wyboru.

**Targety i klawiatura:** legacy swatche miały na ekranie 320 px około 35 px,
a ręcznie pisane radiogroupy nie miały roving tabindex ani obsługi strzałek.
Siatka ma teraz cztery kolumny na małym ekranie, target minimum 44×44 px oraz
Arrow/Home/End w onboardingu i Profilu. E2E mierzy realne bounding boxy 320×667.

**Rzetelność treści:** wcześniejszy brak kontraktu pozwalał instrukcjom ćwiczeń i
szablonom obiecywać bezpieczeństwo, rehabilitację, ochronę stawów lub „lepsze
efekty” bez udokumentowanego przeglądu eksperta. Nowy test obejmuje oba zbiory
PL/EN, `exercise-i18n`, bibliotekę, bazowy plan i szablony. Absolutne twierdzenia
zostały zastąpione opisem techniki, zastosowania albo ostrożnym językiem. Test nie
jest substytutem przeglądu medycznego; blokuje tylko powrót znanych klas obietnic.

**Zero emoji — root cause fałszywie zielonej bramki:** skrypt nie obejmował
`src/data` ani `functions/src`, dlatego dekoracyjne prefiksy w instrukcjach,
powiadomieniach i e-mailach pozostawały poza kontrolą. Zakres rozszerzono na dane
aplikacji i komunikację Functions; usunięto prefiksy bez zmiany struktury ćwiczeń
oraz emoji z treści udostępniania, reminderów i digestu.

**Dodatkowa spójność:** historia pokazuje jednostkę `kg`/`lbs` przy tonażu zgodnie
z aktywną preferencją. Niejasne „Nie na 100%?” zmieniono na „Dostosuj trening”,
a opisy progresji i gotowości Strava mówią wprost, z jakiej historii i okna czasu
wynika informacja.

**Weryfikacja:** 418 plików Vitest i 3653/3653 testów; typecheck; lint 0 błędów
i 15 zastanych warningów; build, dist-smoke, offline, no-emoji 270 plików i
`git diff --check`. Po restarcie Vite i wyczyszczeniu jego cache szeroki przepływ
Chromium/WebKit ma 202/202 PASS, a osobny kontrakt 320×667 przechodzi na obu
silnikach z CTA w viewport i bez poziomego scrolla. Fresh mobile build i `cap sync`
obu platform, Android `assembleDebug` oraz iOS Simulator build+launch są zielone.
Functions mają 454 PASS/12 SKIP, Firestore Rules 282/282 i Storage Rules 11/11.
`audit/latest.json` ma wynik 10,0 wyłącznie dla wspólnej warstwy web/UI, bez
czerwonych, pomarańczowych i żółtych usterek; nie obejmuje fizycznych bramek.
Nie wykonano pushu, deployu ani TestFlight; fizyczne lifecycle/IME/VoiceOver/
TalkBack/export/recovery pozostają bramką.

### 2026-08-27: X46 — onboarding odporny na restart i szybki handoff po planie (bez wydania)

**Research i kierunek produktu:** oficjalne wzorce Apple i Android wskazują na
krótki, opcjonalny onboarding uczący przy realnym kontekście, zamiast długiego
touru zasłaniającego aplikację. Przyjęty kierunek „instrument treningowy” stawia
na jedną główną akcję, czytelną hierarchię liczb, 44 pt / 48 dp, safe-area,
font scale 200%, reduced motion i naukę przez wykonanie pierwszej serii. Żywy plan
fal, kryteria i macierz urządzeń są w
`docs/PLAN-PRODUCT-UX-UI-10-10-2026-08-27.md`.

**Nadrzędny filtr IA/UI:** prostota i rzetelność mają pierwszeństwo przed
liczbą funkcji na ekranie. Stosujemy progresywne ujawnianie, jedną oczywistą
akcję i usuwamy nieweryfikowalne obietnice. Nie wprowadzamy AI slopu,
dekoracyjnych emoji ani metryk bez znanego źródła/metodologii. „Wow” oznacza
szybkość, lekkość nawigacji, precyzyjny feedback i brak utraty danych.

**Główna IA i progressive disclosure:** dolna nawigacja pozostaje pięcioelementowa:
Dzisiaj, Plan, Historia, Postępy i Ćwiczenia. Profil jest pod stale widocznym
avatarem, ponieważ ustawienia są rzadszą czynnością niż biblioteka ćwiczeń.
`MAIN_DESTINATIONS` jest jednym źródłem prawdy dla kolejności, etykiet, root chrome,
dzwonka i licznika; `/analytics` pozostaje kompatybilnym deep linkiem. Tytuł
„Dashboard” zmieniono na Dzisiaj/Today, bez zmiany URL ani źródeł danych.

Na Dzisiaj pozostało jedno dominujące CTA treningowe oraz dwa operacyjne wyjątki:
szybki trening i ręczne cardio. Duplikaty „Twoje liczby” i „Analityka” usunięto,
bo ich stałym domem są Postępy. Historia domyślnie pokazuje pełną aktualnie
załadowaną chronologię od najnowszej; cykle są osiągalne w zwykłej, zwijanej
sekcji bez overlayu, a filtry, paginacja, eksport i widoki cyklu zachowały stare
kontrakty.

**Root cause utraty onboardingu:** kroki 1–6 oraz odpowiedzi istniały wyłącznie w
React state. Ubicie WKWebView lub presja pamięci cofały proces do początku.
Wprowadzono `OnboardingDraftV1` per UID z TTL 7 dni, defensywną walidacją i
best-effort zapisem przez oficjalne `@capacitor/preferences` 8.0.1. iOS używa
UserDefaults, Android SharedPreferences, a web fallbacku pluginu w localStorage.
Wymagany wpis Privacy Manifest `NSPrivacyAccessedAPICategoryUserDefaults` z
powodem `CA92.1` już istniał. Szkic nie przechowuje checkboxów ani dowodu zgody;
przejście poza Welcome dopuszcza wyłącznie aktualny mirror serwera. Zapisy są
serializowane, aby wolniejsza stara operacja nie nadpisała nowszego kroku.

**Integralność planu:** sekwencja „cykl utworzony → plan nie zapisany → restart →
inny wybór z tą samą datą” tworzyła drugi aktywny cykl z sufiksem. Dwa snapshoty
z `choice.entry=onboarding` należą do tej samej niedokończonej operacji, więc
transakcja aktualizuje deterministyczny cykl bazowy. Replan pozostaje bez zmian i
nadal tworzy nowy cykl oraz archiwizuje stary. Test na realnych hookach i fałszywym
Firestore potwierdza dokładnie jeden aktywny cykl, identyczne ćwiczenia w planie i
cyklu oraz ukończenie onboardingu dopiero po udanym zapisie planu.

**UX po utworzeniu planu:** Dashboard pokazuje inline „Twój plan jest gotowy” i
opcjonalną mapę Dzisiaj / Plan / Postępy. Przewodnik ma Pomiń, Gotowe, replay w
Profilu, stan per UID i nie blokuje aplikacji przy awarii storage. Automatyczny
popup pomiarów czeka na zamknięcie handoffu. Istniejący First Workout Tour dostał
safe-area, obsługę visual viewport/landscape/200%, przewijalny panel, sticky CTA
48 px i poprawną semantykę VoiceOver bez ukrywania interaktywnego celu.

**Fałszywe oczekiwanie:** synchroniczna rekomendacja była przykrywana udawanym
„dobieraniem” przez 3,5 s opartym o `setTimeout`. Timer nie wykonywał pracy i po
suspendzie WKWebView mógł trwać dłużej. Nakładkę i timery usunięto; karty planów
są dostępne natychmiast, a nagłówek „Dopasowane do Ciebie” komunikuje wynik bez
blokowania. Niezweryfikowane „12K+ ćwiczących” zastąpiła prawdziwa korzyść offline.

**Root cause utraty własnego planu na 6/6:** `PlanBuilder` usuwał swój pełny
szkic już przy submit, chociaż submit tylko przenosił dane do pamięci React kroku
startowego. Kill WKWebView przed trwałym zapisem przywracał `planSource=custom`,
ale bez ćwiczeń. Builder zachowuje teraz pełny draft do sukcesu całej operacji;
Onboarding usuwa go dopiero po udanym `completeOnboardingPlan`, a błąd nadal
pozostawia dane do retry. Test sekwencji custom builder → 6/6 → unmount/remount
potwierdza odzyskanie wszystkich ćwiczeń i zachowanie starego submitu.

**PaletteThemeV2:** wdrożono addytywny model trzech ról koloru, bez usuwania
11 legacy akcentów i custom hex. Pulse, Forge i Glacier mają preview bez zapisu,
anulowanie/unmount przywraca poprzedni wygląd, a dopiero potwierdzenie zapisuje
pełny obiekt i `accentColor=primary` jako fallback dla starych klientów.
`PreferenceSync` stosuje pełną paletę cloud→local bez echo-write; cold start
czyta cache przed Reactem. Firestore przyjmuje wyłącznie zamknięty schemat v2,
zgodne pary id/source, pełne HEX i trzy różne role. Statusy success/warning/error
pozostają semantycznie stałe. Granica ukończenia jest jawna: presety runtime są
gotowe, lecz `avatar-custom`, szerokie użycie supportA/B i fizyczne cross-device QA
należą do kolejnej fali.

**Telemetria aktywacji:** dodano wyłącznie liczniki started/resumed/completed/
save_failed dla onboardingu oraz started/completed/skipped dla post-plan guide.
Nie zapisujemy treści pól, URL avatara ani surowych kolorów. Rules i testy mają
zamkniętą allowlistę. Bardziej szczegółowe kroki i czas przejścia pozostają
planem instrumentacji, a nie fikcyjnym dowodem gotowości.

**Root cause blackoutu po szybkim reopen:** watchdog cleanupu fizycznie usuwał
węzły portalu należące jeszcze do React/Radix, co kończyło się `removeChild` i
ErrorBoundary. Pierwsza bezpieczniejsza wersja ukrywała także zamknięty content,
ale Radix potrafił użyć tego samego węzła przy szybkim `zamknij → otwórz`; pozostawały
na nim inline `hidden`, `aria-hidden` i `pointer-events:none`, a aktywny backdrop
przykrywał martwy dialog. Watchdog może teraz dezaktywować wyłącznie jawny backdrop,
nigdy React-owned content. Zamknięty content jest nieinteraktywny deklaratywnie
przez `data-state`, a Dialog/Sheet oraz zagnieżdżony AlertDialog mają jawny stos
50/51 i 52/53. Testy odtwarzają ownership, reuse contentu, żywy nowy dialog i
szybki trzeci import; nie używają `force` ani sztucznego opóźnienia.

**Kontrolki i prostota:** wspólny Switch ze Zdrowia już spełniał kontrast, focus
i 44 px. Braki dotyczyły ręcznych kontrolek: nawigacji miesiąca/tygodnia, trybu
„Nie na 100%”, urlopu, klikalnego `SettingRow` i Wyloguj. Dostały dostępne nazwy,
44 px, focus oraz obrys tylko dla neutralnych wyborów. Primary CTA pozostają
wypełnione bez dodatkowego szumu. Fresh screenshot audit wskazuje dwa uczciwe
długi P1: pełny edytor palety wymaga progressive disclosure w Profilu, a pierwszy
krok onboardingu nadal łączy personalizację i zgody.

**Weryfikacja bieżącej fali:** wszystkie poprawki zaczęły od czerwonych testów.
Pełny Vitest ma 416 plików i 3637/3637 testów; typecheck, build, bundle budget,
dist-smoke, offline i no-emoji są zielone, lint ma 0 błędów i 15 zastanych
warningów Fast Refresh. Po świeżym Vite Chromium pokrywa 284/284 scenariusze
(277 w pełnym biegu + 7/7 kontrolnego retry), a WebKit 284/284 (283 + 1/1).
Krytyczna sekwencja plan → wyjście → szybki trening → powrót → zakończenie → sync
i oba testy blackoutu są zielone. Fresh mobile build, `cap sync` obu platform,
iOS Simulator build+launch i Android `assembleDebug` przeszły. `audit/latest.json`
ma świeży, evidence-based wynik 9,0/10. Fizyczny PASS iOS/Android pozostaje
obowiązkowy przed wydaniem; nie wykonano pushu, deployu ani nowego TestFlight.

### 2026-08-27: X45 — release audit, pełniejszy route sweep i czytelna typografia (bez wydania)

**Blackout — root cause i kontrakt naprawy:** przy otwartym niestandardowym
overlayu treningu iOS edge-swipe mógł opuścić trasę, a osierocone tło portalu
Radix mogło zachować czarną warstwę oraz locki `body`. `IosSwipeBack` blokuje
teraz gest przy każdym otwartym `[data-app-overlay][data-state="open"]`, niezależnie
od roli ARIA. `release-body-locks` usuwa wyłącznie oznaczone, osierocone tła Radix
i locki bez żywego właściciela; żywy dialog, sheet albo własny overlay pozostaje
nietykalny. Testy były czerwone przed poprawkami, a po minimalnych fixach scenariusz
E2E `workout-overlay-exit` jest zielony i potwierdza działający ekran oraz dotyk po
opuszczeniu treningu.

**Route sweep — root cause i decyzja:** wcześniejszy sweep obejmował tylko osiem
unikalnych ścieżek i nie dawał dowodu renderowania czterech kanonicznych tras:
`/day`, `/plan/edit`, `/new-plan` oraz parametryzowanej `/exercise/:slug`.
Najpierw czerwony test wykazał te luki, następnie dodano wyłącznie brakujące
przypadki bez mieszania ich z testami redirectów. Kontrakt ma teraz 12/12
kanonicznych tras i 195/195 kombinacji trasa × stan użytkownika.

**Typografia — decyzja test-first:** audyt wykazał mikroetykiety 8–10,5 px w
krytycznych powierzchniach treningu, planu, historii, Profilu, Analityki i Stravy.
Dwa pierwsze i trzy końcowe izolowane kontrakty statyczne były czerwone przed
zmianami. Minimalnie podniesiono wszystkie 112 zakazanych wystąpień do minimum
11 px, bez zmiany copy ani data flow. Globalny kontrakt był RED z 74 pozostałymi
naruszeniami i jest GREEN z zerem. Migracja kodu jest skończona; fizyczne QA
100/150/200% nadal pozostaje osobną bramką.

**Palety — kierunek implementacji:** obecne pojedyncze akcenty nie są paletą
trzech współpracujących kolorów. Docelowy, addytywny `PaletteThemeV2` ma zapewnić
trzy gotowe presety z rolami primary/supportA/supportB oraz lokalne wyprowadzenie
propozycji z avatara Google. Analiza zdjęcia i dobór kolorów mają odbywać się na
urządzeniu; surowy avatar ani materiał pośredni nie trafia do synchronizacji.
Migracja ma zachować wszystkie dotychczasowe akcenty i bezpieczny fallback dla
Apple, emaila, webu i trybu offline. To zatwierdzony plan, nie twierdzenie o
ukończonej funkcji.

**Dowody i granica gotowości:** świeży audyt renderowania ma 20/20 przypadków na
każdym silniku i wynik produktowy 8,5/10. Bieżące automatyczne dowody obejmują
Vitest 3566/3566, typecheck, lint 0 błędów (15 zastanych warningów Fast Refresh),
build, dist smoke, bundle budget, offline contract i no-emoji, Firestore Rules
275/275, Storage Rules 11/11, Functions emulator 12/12 oraz Chromium 274/274.
Po osobnym restarcie Vite i wyczyszczeniu cache pełny WebKit również ma 274/274.
Nie wykonano deployu, publikacji ani nowego artefaktu release. Publiczne 1.0.0
nadal blokują fizyczne scenariusze iOS/Android, potwierdzenie SNS, rotacja sekretu
Stravy oraz aktualne podpisane artefakty. Typografia kodu nie jest już blockerem;
pozostaje jej fizyczne QA dostępności.

### 2026-08-27: X44 — osierocone overlaye nie mogą zostawić czarnego ekranu (bez wydania)

**Root cause:** iOS edge-swipe blokował nawigację tylko dla otwartego Radix
`dialog/alertdialog`. Własne overlaye treningu (m.in. pełnoekranowy timer, live PR,
celebracja i tour) mają kontrakt `data-app-overlay`, lecz nie zawsze rolę dialogu.
Gest podczas takiej warstwy mógł więc wykonać `navigate(-1)` i twardo odmontować
trasę treningu. Druga luka była w cleanupie: osierocony portal Radix nadal miał
`data-app-overlay="" data-state="open"`, więc był błędnie uznawany za żywego
właściciela blokady i zostawiał czarną warstwę, `pointer-events:none`, ukryty
overflow albo `data-scroll-locked` na `body`.

**Decyzja:** wszystkie własne otwarte overlaye blokują iOS edge-swipe. Wspólne
wrappery Dialog/Sheet/AlertDialog znakują tło jako `data-radix-overlay`. Cleanup
rozróżnia żywy portal (ma odpowiadający mu otwarty content) od osieroconego tła:
żywe custom overlaye zachowuje, osierocone tła Radix usuwa, a lock `body` zdejmuje
po microtasku i ponownie po macrotasku dla opóźnionego cyklu portalu w WKWebView.
Awaryjny cleanup po render crashu również usuwa jawnie oznaczone tła Radix.

**Test-first i dowód:** test gestu na custom overlayu oraz test osieroconego
portalu były czerwone przed poprawką. Po minimalnym fixie targeted unit ma 23/23,
targeted Chromium+WebKit 4/4, pełny Vitest 400 plików / 3507 testów, a pełne E2E
mają Chromium 270/270 i WebKit 270/270 po restarcie Vite i wyczyszczeniu
`node_modules/.vite`. Nowy scenariusz E2E opuszcza aktywny trening przy otwartym
dialogu rozgrzewki, sprawdza brak tła i locków, a następnie potwierdza działanie
Planu. Produkcyjna, zanonimizowana próbka 200 ostatnich `client_errors` nie zawiera
nowego `render-crash` po 2026-08-21; obecny incydent ma więc dowód w cyklu życia
overlayu, nie w nowym błędzie renderowania. Najnowszy mobile bundle skopiowano do
obu projektów; Android `assembleDebug`, iOS Simulator (bez wymuszania błędnego
`-sdk iphonesimulator` na watchOS target), dist smoke i bundle budget są zielone.
Fizyczny iOS pozostaje obowiązkową
bramką: dialog/timer → wyjście i edge-swipe → background/resume → powrót do planu.

**Spójność motywu:** osobny czerwony test wykazał, że akcent z chmury był stosowany
dopiero po wejściu w Profil. `PreferenceSync` stosuje teraz `preferences.accentColor`
globalnie przy hydratacji i zapisuje bezpieczny cache offline, bez wtórnego zapisu
do chmury. To warunek wstępny dla przyszłego modelu trzech palet; obecny model
pozostaje pojedynczym akcentem i nie jest błędnie opisywany jako gotowa paleta 3×3.

### 2026-08-27: X43 — jeden kontrakt obrysu dla przełączników i kontrolek wyboru (bez wydania)

**Root cause:** samo dodanie `border-2` do `Switch` nie naprawiało czytelności.
Token `border-border` miał zbyt mały kontrast z ciemną powierzchnią, nieaktywny
tor praktycznie znikał, a `primary-foreground` użyty również dla kciuka OFF był
niemal czarny na ciemnym tle. Równolegle część selektorów (`aria-pressed`, radia,
segmenty i filtry) była budowana lokalnie z `border-border` albo bez obrysu i
focusu, więc wygląd zależał od konkretnego ekranu.

**Decyzja systemowa:** wspólny `Switch` ma target 44×44, wizualny tor 44×24 z
`border-muted-foreground`, osobne kolory kciuka ON/OFF oraz focus ring. Wszystkie
produkcyjne użycia `Switch` przechodzą przez ten komponent i mają dostępną nazwę.
Krytyczne checkboxy zgód mają osobny target 44×44, czytelny wskaźnik, focus i
`aria-labelledby`. `toggleButtonClasses` jest jednym kontraktem dla chipów,
przycisków wyboru, filtrów i radii: stały border bez skoku layoutu, aktywny
`border-primary`, nieaktywny `border-muted-foreground`, focus ring, ARIA i minimum
44×44. Wspólny wariant `Button outline` również używa czytelnego tokenu. Kontrakt
objął m.in. Profil, Health, Stravę, Historię, eksport/mail, Analitykę, plan i
onboarding, picker ćwiczeń, przerwy, cardio, kalkulator talerzy, import Strong,
Postępy oraz filtry admina.

**Świadome wyjątki UX:** wypełnione CTA, destructive CTA, linki, ghost icon
buttons i swatche kolorów nie dostają stałej ramki, bo ich rola jest już czytelna
z wypełnienia lub treści. Dni kalendarza także nie mają 42 stałych ramek; zachowują
stan wypełniony, focus ring i target 44 px, aby nie tworzyć wizualnego szumu.

**Test-first i weryfikacja:** czerwony kontrakt wykazał najpierw 10, a pełny sweep
13 dalszych wyjątków. Po minimalnych poprawkach test kontraktu ma 32/32, szersza
regresja ekranów 105/105, a bieżący pełny Vitest ma 400 plików / 3507 testów. Typecheck,
lint (0 błędów; 15 zastanych warningów Fast Refresh), build, bundle budget,
dist smoke i offline contract są zielone. Po restarcie Vite i wyczyszczeniu jego
cache pełne E2E Chromium i WebKit mają po 270/270, w tym sekwencję plan → wyjście
→ szybki trening → powrót → zakończenie → synchronizacja i regresję blackoutu.
Fizyczny przegląd iOS/Android pozostaje bramką przed następnym TestFlight; nie
wykonano deployu ani publikacji.

### 2026-08-27: X42 — TestFlight 1.0.0 (128), Monika w external i bezpieczny pregrant PRO

**TestFlight:** właściciel jawnie autoryzował kolejne wydanie testowe. App Store
Connect potwierdził przed uploadem, że najwyższy build to 127, a numer 128 jest
wolny. `CURRENT_PROJECT_VERSION` podniesiono wyłącznie 127→128 we wszystkich
sześciu konfiguracjach; `MARKETING_VERSION`, package version i Android
`versionName` pozostały 1.0.0. Preflight dostał brakujący test dokładnie sześciu
wystąpień (wcześniej akceptował dowolną dodatnią liczbę). Podpisane archiwum,
Watch i Widgets zbudowały się, eksport IPA i upload przeszły bez błędów. Build
128 jest `VALID`, przypięcie grup wewnętrznej i zewnętrznej zwróciło 204, opis
testów 200, Beta App Review = `APPROVED`. IPA: 24 153 128 B, SHA-256
`1748079361233383bfd6e41307c8d554ab225d7de737384ea49ce27d50c70487`;
`codesign --verify --deep --strict` zielony. Publiczne wydanie sklepowe i push nie
zostały wykonane; fizyczne scenariusze nadal są bramką launchu.

**Nowa testerka:** `monikatoczek7@gmail.com` nie istniała w TestFlight ani
Firebase Auth. Utworzono ją przez App Store Connect API jako `EMAIL` beta tester
w tej samej zewnętrznej grupie co Joanna Wojtuń; członkostwo grupy zweryfikowano
read-only, a grupa ma już zatwierdzony build 128. Nie użyto starej komendy
`asc_api.py add-tester`, bo błędnie kieruje ona nowe osoby do grupy wewnętrznej.

**Pregrant PRO — root cause i rozwiązanie:** istniejący `adminGrantSubscription`
wymaga `users/{uid}`, więc przed pierwszym logowaniem zwraca `not-found`; tworzenie
sztucznego Auth usera groziłoby kolizją konta Google/Apple. Dodano serwerową,
niedostępną klientowi kolekcję `pending_subscription_grants`, indeksowaną wyłącznie
SHA-256 z emaila z tokenu Firebase Auth. Pierwszy dozwolony `syncUserProfile`
atomowo zapisuje bezterminowy `comp active` i usuwa grant; nie omija weryfikacji
email ani App Check i ponowny sync nie zmienia `startedAt`. Test emulatorowy był
czerwony, potem 12/12 zielony; pełne Functions 443/443, typecheck i build zielone.
Na produkcję wdrożono wyłącznie `syncUserProfile` (Node 22, us-central1), następnie
utworzono jednorazowy grant Moniki bez plaintext emaila i wpis audytowy z 90-dniowym
TTL. Po jej pierwszej rejestracji dokument grantu ma zniknąć, a profil ma mieć
`subscription.tier=comp`, `status=active`, `expiresAt=null`.

### 2026-08-27: X41 — domknięcie bramek automatycznych, SES-only i Android edge-to-edge (bez wydania)

**Bramki:** po ostatniej zmianie root Vitest ma 392/392 pliki i 3435/3435 testów,
typecheck jest czysty, lint ma 0 błędów (15 zastanych warningów Fast Refresh), build
Vite 6.4.3, bundle budget, dist smoke i pełny offline contract są zielone. Functions
mają 443/443 (+11 świadomie pominiętych), emulator rejestracji/SES 11/11, Firestore
Rules 275/275, Storage Rules 11/11. Po restarcie Vite i wyczyszczeniu wyłącznie
`node_modules/.vite` pełne E2E Chromium+WebKit mają 536/536. Audyty npm root i
Functions mają 0 findings. Pierwszy pełny Vitest przeszedł wszystkie asercje, ale
Vitest 3.2.6 zwrócił znany timeout RPC `onTaskUpdate`; kontrolowany rerun z czterema
workerami zakończył się exit 0. Nie użyto flag ignorujących unhandled errors.
Skrypt `npm run test` ma teraz ten limit jawnie, więc obowiązkowa komenda release
jest deterministyczna także na 8-rdzeniowym hoście.

**Offline smoke — root cause i poprawka testu:** test czekał na toast „Trening
rozpoczęty offline”, usunięty celowo w X38 na rzecz trwałego stanu sesji. Aplikacja
już wtedy miała aktywny trening; nieaktualna asercja zatrzymywała test przed zapisem
serii. Smoke sprawdza teraz dostępny przycisk zakończenia aktywnej sesji, ma 15 s
timeout na Service Worker i zamyka keep-alive. Czerwony wynik oraz osobny przypadek
nadpisania `dist` przez równoległy build mobile zostały rozdzielone; po prawidłowym
web buildzie pełny cache/cold lazy route/local draft przechodzi w 16,9 s.

**Android SystemBars — root cause i decyzja plugin-first:** targetSdk 36 wymusza
edge-to-edge na Androidzie 15+, a legacy `@capacitor/status-bar` nie może tam ustawić
tła ani `overlay:false` i steruje tylko górnymi ikonami. Jasny wariant motywu DayNight
odsłaniał białe `windowBackground` pod białym zegarem. Zgodnie z zasadą plugin-first
użyto wbudowanego w Capacitor 8 `SystemBars` dla obu belek, przypięto ciemne tło okna
i poprawny `postSplashScreenTheme`. Test był 2/2 czerwony, po fixie zielony. Świeży
APK na emulatorze API 35: build/install/cold launch zielone, oba paski ciemne i ikony
czytelne; czysty log bez wcześniejszego błędu safe-area. Dodatkowy dark-mode,
landscape, scroll do wszystkich CTA i hot resume również przeszły bez crasha. iOS simulator również został
ponownie zbudowany, zainstalowany i uruchomiony po skopiowaniu aktualnej konfiguracji.

**Granica decyzji:** nie wykonano deployu, pushu, TestFlight ani Play Store. Pozostają
fizyczne scenariusze screen-off/resume/force-kill/share/notification/Camera/Health,
publiczna privacy disclosure oraz operacyjne uruchomienie Amazon SES (identity,
DKIM/SPF/DMARC, production access/quota, TLS/events, least-privilege IAM, sekrety i
syntetyczny smoke). Podpisany preflight wymaga też poprawnego sekretu RevenueCat.
Automatyczne bramki są zielone, ale te punkty nadal blokują publiczne 1.0.0.

### 2026-08-27: X40 — domknięcie bug-hunt, final-sync idempotency i spójność UX (bez wydania)

**Stan raportu:** po izolowanych testach i poprawkach #35/#36/#40/#54 macierz
`docs/RELEASE-READINESS-2026-08-27.md` ma 54 naprawione / 0 częściowych / 0
otwartych. Nie jest to zgoda na release: zostały pełne bramki, urządzenia,
retry odczytu IDB, hardening tombstones, privacy disclosure avatara i końcowe bramki.
Wersje iOS/package/Android pozostają 1.0.0; RTK, hooki RTK i `SessionStart` nie
wracają.

**#35 App Check — root cause i decyzja:** klient umiał czekać na App Check, ale po
zablokowanej wymianie tokenu nie rozróżniał ochrony aplikacji od zamkniętej
rejestracji i nie dawał bezpiecznej drogi powrotu. Functions zwracają teraz
stabilne `details.reason` (`app-verification-required` lub `registration-closed`),
klient klasyfikuje tylko te jawne powody i pozostaje fail-closed. Aktywny user
zachowuje cache profilu, cold start przechodzi do `AccessRestrictedView` z retry
lub logout, bez reload-loopu i bez bypassu. Bramki: 5 plików / 38 testów,
Functions emulator 8/8 oraz oba typechecki. Backend i klient muszą trafić do
jednego kontrolowanego rollout trainu.

**#36/#40/#54 — root causes:** legacy historia bez `durationSec` liczyła surową
różnicę timestampów, więc wielodniowa luka udawała trening; helper odrzuca >12 h
bez mutacji danych. Measurement store rejestrował błąd listenera, ale wspólny
snapshot/UI go nie eksponował; osobny `measurementError` i retry są widoczne w
Measurements oraz Analytics. Zapis custom exercise mógł pozostawić nigdy
nierozstrzygniętą Promise i zamrozić UX; komponent trzyma dokładnie jedną próbę,
po 8 s pokazuje stan i sprawdza tę samą Promise, więc retry nie tworzy duplikatu,
a cancel daje wyjście. Każdy fix rozpoczął czerwony test; testy celowane i
typecheck są zielone.

**Nowy blocker wykryty testem sekwencji — checkpoint→final:** pełne E2E
plan→wyjście→szybki trening→powrót→zakończenie→remote confirmation ujawniło, że
toast mówił „Trening zapisany”, draft znikał, lecz dokument chmurowy nadal miał
7 ćwiczeń i `completed:false`. Root cause: udany checkpoint pozostawiał w drafcie
`pendingWriteId/pendingWriteVersion`; techniczny final bez zmiany treści zachowywał
tę samą wersję i reuse'ował identyfikator. Backend poprawnie uznawał go za
`already-applied` wcześniejszego checkpointu, więc final był no-opem. Fix w
`markDraftSynced`: ACK czyści tylko identyfikator dokładnie potwierdzonej wersji;
nowszej próby nie rusza. Final tej samej wersji dostaje nowy klucz idempotencji.
Dowód: czerwony unit otrzymywał `checkpoint-write`, czerwony E2E otrzymywał
`{completed:false,count:7}`; po fixie 15 plików / 178 testów sync/draft oraz pełna
sekwencja Chromium i WebKit są zielone z `completed:true` i 7 ćwiczeniami.

**UX, typografia i paleta:** fonty Inter Variable i Space Grotesk Variable są
self-hosted, usunięto zależność Google Fonts, ujednolicono hierarchię/faux weights
i breakpoint shella z uwzględnieniem niskiego landscape. `html.lang` podąża za
i18n. W onboardingu Google paleta wyznacza po jawnym CTA do trzech propozycji,
działa lokalnie i przyjmuje tylko
zaufany HTTPS Google avatar, MIME image, maks. 5 MB i timeout; trzy swatche mają
44×44 oraz wyliczony kontrast czarny/biały. Analiza tylko porządkuje propozycje:
nie wybiera i nie zapisuje koloru, dopóki użytkownik nie dotknie konkretnego swatcha;
istniejący wybór nigdy nie jest nadpisywany. Brak zdjęcia Apple/offline zachowuje
gotowe palety. Ta jawna akcja zastępuje wcześniejszą decyzję X33 o auto-preselekcji.
Przed release
polityka prywatności musi opisać pobranie zdjęcia i lokalną analizę. About pokazuje
PL/EN „© 2026 Strength Save. Wszystkie prawa
zastrzeżone / All rights reserved”. Automatyczny product audit 15/15 jest zielony;
font scale 100/150/200%, klawiatura, safe-area i landscape pozostają device gate.

**Trwałość draftu — root cause i pierwszy fix:** emergency fallback przechowywał
serie, lecz pomijał tożsamość/promocję sesji, snapshot dnia oraz
`completedLocally`/`finalSyncPending`. Po awarii IDB i restarcie dane serii nadal
istniały, ale aplikacja mogła uznać ukończony trening za zwykły checkpoint i nie
ponowić finalnego zapisu. Fallback zapisuje teraz pełną intencję sesji i
`updatedEventId`; merge po odzyskaniu IDB zachowuje monotonicznie flagi finalizacji
i deterministyczny tie-breaker. Czerwone testy odtworzyły utratę pól, zielone:
55/55 baza draftu oraz 150/150 regresji draft/hydration/autosync/sync. Odczyty
`loadActiveDraft`/`loadDraft`/`listDrafts` mają teraz dokładnie jedną ponowną próbę
po resecie cache połączenia; czerwone testy odtwarzały `InvalidStateError` z martwej
transakcji po resume, a trwała awaria potwierdza dokładnie dwa `open()` i zejście
do fallbacku. Zielone: 58/58 baza draftu i 170/170 szerszej regresji. Treść
kolejki nadal pozostaje w drafcie; `Preferences` nie jest magazynem danych treningu.

**Zależności, Router 7 i deep link:** point updates i precyzyjne `overrides` bez
`npm audit fix --force` usunęły wszystkie production findings Functions oraz
high/critical w root. Pozostałe advisory React Router 6 obejmowało osiągalną klasę
open redirect przez backslash, więc samo zabezpieczenie inboxu nie było wystarczającą
podstawą publicznego 1.0. Migracja do `react-router-dom@7.18.2` zachowuje deklaratywny
`HashRouter`; `useTransitions={false}` w obu routerach utrzymuje synchroniczne
zachowanie v6 przy lazy trasach i słabym internecie. Nie dodano BrowserRoutera,
data routera ani SSR. Parser wewnętrznej ścieżki odrzuca pojedynczy i podwójnie
kodowany slash/backslash, protokół, whitespace i znaki kontrolne; niebezpieczny
wpis inbox pozostaje tekstem. Czerwone: audit 2 moderate i testy `%252f`/`%255c`;
zielone: root oraz Functions 0 production findings, 206 testów tras/deep-linków,
typecheck, scoped lint i build produkcyjny.

**Pluginy kolejnych fal:** Camera ma sens po stabilizacji jako natywne źródło
zdjęcia z zachowaniem własnego croppera i `appRestoredResult`. Crashlytics ma sens
przed skalowaniem 1.0, ale wyłącznie z consentem, privacy disclosure, symbolami i
kontrolowanym crash testem. Motion tylko jako foreground bench-timer PoC (nie
licznik powtórzeń), TTS tylko opt-in i nigdy zamiast local notification, BLE HR
jako osobny privacy-heavy PoC. Text Zoom nie będzie wymuszał 100% kosztem
dostępności; Remote Config odłożony; własny Health bridge zostaje; Background
Runner nadal wymaga telemetrycznego dowodu porażki foreground resume. Research:
`docs/RESEARCH-UX-TYPOGRAPHY-CAPACITOR-2026-08-27.md`.

### 2026-08-27: X39 — audyt publicznego wydania i bezpieczny eksport natywny (bez deployu/push/TestFlight/Play)

**Źródło i zakres:** pełna rewalidacja 54 problemów z `RAPORT-BUG-HUNT-strength-save-2026-08-24.md`, pięć integracji Capacitor oraz aktualny product audit. Macierz, zależności, kryteria etapów i blockery są w `docs/RELEASE-READINESS-2026-08-27.md`. Stan raportu: 50 naprawionych, 3 częściowe (#35 App Check blocked UX, #40 błąd pomiarów bez wyjścia w UI, #54 zapis custom exercise wiszący offline), 1 nadal występuje (#36 legacy duration bez clampu). Wszystkie problemy high mają fix w kodzie. Wersje marketingowe pozostają 1.0.0; RTK i `SessionStart` pozostają poza systemem.

**Root cause czerwonej bramki wejściowej:** X38 dodał odczyt `workoutSyncQueue.list()` na Dashboardzie, ale 10 starszych testów komponentu mockowało tylko `pendingCount()`. UI assertions przechodziły, natomiast async load draftu generował 42 unhandled rejectiony, a worker kończył timeoutem. Fix wyłącznie testowy: mocki realizują bieżący kontrakt kolejki. Dowód czerwony: 3346/3347 + 42 errors; zielony celowany: 10 plików / 43 testy, zero errors.

**Root cause eksportu:** dotychczasowy helper na native polegał na Web Share API z JS `File`; jeśli `navigator.canShare({files})` było false, wykonywał `<a download>`, który WKWebView ignoruje. PDF dodatkowo miał dwie kopie tej logiki poza helperem. Fix test-first: `@capacitor/filesystem@8.1.3` zapisuje tekst UTF-8 lub binaria base64 do dedykowanego `Directory.Cache/strength-save-exports`, `@capacitor/share@8.0.1` udostępnia zwrócone URI; stare pliki tylko z tego katalogu są sprzątane best-effort przy następnym eksporcie. Web zachowuje Web Share/download. Cancel (`AbortError` oraz natywne `Share canceled/cancelled`) nie daje fałszywego sukcesu, inne błędy wracają jako `failed` i trafiają do telemetrii. JSON/CSV/PDF/PNG idą wspólną ścieżką; iOS Privacy Manifest dostał wymagany FileTimestamp `C617.1`. `cap sync ios/android` zarejestrował Filesystem, Share i zachował wcześniejszy Network.

**Decyzje o pozostałych pluginach:** Preferences nie przejmuje draftu, sync queue, tombstones ani telemetrii; ewentualny canary tylko dla małych ustawień i wyłącznie dual-read/dual-write. Background Runner nie wchodzi: X38 ma foreground resume, a brak telemetrycznego dowodu porażki nie uzasadnia drugiego środowiska syncu bez DOM/IDB/localStorage. Najpierw instrumentacja `resume_with_pending_sync`/wynik. Screen Orientation nie wchodzi bez polityki produktu i testów landscape; runtime lock 8.0.1 ma ryzyko safe-area na iOS, a Android 16 ogranicza lock na dużych ekranach.

**Weryfikacja etapu:** testy eksportu/regresji 88/88, helper 9/9 (UTF-8 i `%PDF-` base64), typecheck zielony, Privacy Manifest `plutil` OK, `cap sync` obie platformy. Product audit po świeżym Vite/cache: Chromium 15/15 (active-user z 5 treningami, new-user, admin; 390×844 i 844×390), bez blank/NaN/overflow/unexpected console/page errors; artefakty `audit/latest.json`, `audit/audit-20260827-release-readiness.json`, `audit/shots/2026-08-27/`. To nie zastępuje smoke natywnego.

**Blockery i bezpieczeństwo:** brak końcowych pełnych bramek, fizycznego iOS/Android share/open/cancel/restart, pełnego screen-off→network-return→resume, testu sekwencji aż do potwierdzonego syncu, hardeningu metadata queue/tombstones oraz napraw #35/#40/#54/#36. `npm audit --omit=dev` wykazuje 8 production findings (4 moderate, 3 high, 1 critical), wymagających izolowanej analizy i aktualizacji bez `audit fix --force`. Żadnego deployu, pushu, uploadu ani publikacji przed finalnym raportem i zielonymi bramkami.

### 2026-08-26 (4): X38 — karta serii bez domyślnej W i bez kreski, „Cel" w jednym kolorze, rozgrzewka siłowa (bez pajacyków, rampy i stretchingu) także w szybkim treningu, AUTOSYNC bez pytań i toastów (rules / web / iOS 127 / AAB v42)

**Źródło:** głosówka + zrzut właściciela po buildzie 126 (trening na siłowni z testerką). Ground truth z produkcji (read-only): konto właściciela (Google, uid `U6GD…`) miało dziś DWIE skorupy szybkiego treningu (`revision 0`, 0 ćwiczeń, `completed: false`), telemetria `action_workout_started: 2`, zero `final_sync_pending`, zero `client_errors`: sesja założona w chmurze przy starcie, a żaden późniejszy zapis (checkpoint/final) nie doszedł i nic tego nie zalogowało. Trening testerki (07:47) zsynchronizował się. Plan `docs/PLAN-X38-2026-08-26.md`, research `docs/RESEARCH-X38-2026-08-26.md`. Wykonanie: Workflow 3 agentów w worktree (766 tys. tokenów, 30 min), merge bez konfliktów.

**Diagnoza syncu (rozpoznanie kodu):** AutoSync nasłuchiwał tylko `window 'online'` (bez `appStateChange`/Network), zapis = `runTransaction` + `getDocFromServer` bez timeoutu (zawieszona obietnica blokowała `inFlight`/`runningRef` do końca życia strony), backoff do 1 h, bramka `navigator.onLine`, wpisy trwałe bez wyjścia w UI, gałąź offline bez telemetrii, unmount po ukończeniu offline nie próbował finalu.

**WP-A Karta serii:** `createEmptySets`/`createPrefilledSets` bez domyślnej W (wszystkie call sites, zegarek też); chip „Rozgrzewka" pierwszy w `exercise-card-chips`, widoczny gdy brak W (z ciężarem: rampa wg sprzętu, bez ciężaru: 1 pusta W), znika gdy są W; „Cel" jako `tone` (primary/warning/destructive) na całym boxie (`exercise-card-target`), bez `labelClass`; `.set-row-active` (kreska) usunięte, zostaje obrys + tło + checkmark.

**WP-B Rozgrzewka:** tętno standard = „Rower, wioślarz albo marsz na bieżni (spokojne tempo)" 120 s + pięty/krążenia 30 s (klucz `jacks` usunięty), początkujący marsz 60 s; dialog bez rampy i stretchingu (klucze `warmup.v2.ramp*`/`stretchToggle` usunięte; `warmupStretching.ts` zostaje dla DayPlan); rampa tylko chipem w karcie; szybki trening: po autostarcie ad-hoc arkusz `prestart-sheet` (3 akcje, wariant full), `shouldOfferPreStartWarmup({ isAdhoc })`, `startFromPreStart` nie startuje sesji drugi raz; start z Watch bez arkusza.

**WP-C Autosync:** wyzwalacze `online` + `addAppStateListener` (resume / visibilitychange) + `@capacitor/network` (`src/lib/network-status.ts`, nowy plugin, `cap sync` przez release-ios) + timer 45 s w foregroundzie + `WORKOUT_SYNC_REQUESTED_EVENT` z WorkoutDay (zakończenie offline, unmount z `finalSyncPending`); każde realne zdarzenie resetuje backoff; bez bramki `navigator.onLine`; backoff full jitter `min(60 s, 5 s·2^n)`; `withTimeout` na `createSession`/`getFromServer` (20 s) i `saveWorkout` (20/30 s), kod `timeout` retryable, lock zwalniany w `finally`, `client_errors` + licznik `sync_timeout`; `CLOUD_NOT_CONFIRMED` po zatwierdzonej transakcji = sukces (`cloudUnconfirmed`, retry samego odczytu); trwałe (`permission`/`unauthenticated`/`not-found`/`invalid-argument`) poza auto-retry, Sync Center w Profilu TYLKO dla `attentionEntries` z akcjami Spróbuj ponownie / Usuń szkic / Eksportuj; telemetria `sync_offline_deferred`, `sync_retry_auto`, `sync_success_deferred`, `sync_timeout` (rules + test); CISZA: toasty „Trening zapisano lokalnie" i „Trening rozpoczęty offline" usunięte, zamiast nich `CloudPendingIndicator` „Czeka na chmurę" na Dashboardzie i w Historii; po odroczonym syncu (≥ 2 min, apka niewidoczna) local notification bez dźwięku „Trening zapisany w chmurze", a gdy widoczna: wpis do dzwonka (typ `sync`, rules) + krótki toast; ad-hoc: promocja z timeoutem, checkpoint natychmiast po dodaniu pierwszego ćwiczenia; e2e mock chmury za flagą `fittracker_e2e_cloud_writes`.

**Bramki:** vitest **3347/3347**; typecheck, lint 0 err, no-emoji; `test:rules` (JDK 21 z homebrew) **267/267** (w tym liczniki autosyncu); e2e chromium **250/250** + `batch-save` 12/12 po ciszy startu; dist-smoke, bundle 1 395 978 B; QA iPhone 15 `tmp/qa-x38/` 3/3 (karta bez W + chip → rampa hantli 2×W, Cel jeden kolor, aktywna bez kreski; szybki trening z arkuszem; dialog bez rampy/stretchingu; offline zakończenie bez toastu, chmurka na Dashboardzie i w Historii, po powrocie sieci sync sam + toast i wpis w dzwonku). Lekcja QA: lazy chunki tras trzeba rozgrzać online w dev (w produkcji precache SW).

**Wydanie (potok: rules → web → iOS → AAB):** firestore.rules released (liczniki `sync_offline_deferred`, `sync_success_deferred`, `sync_timeout`, typ `sync` w `user_events`; UWAGA: `./node_modules/.bin/firebase` nie istnieje, deploy globalnym `firebase` z nvm); web LIVE `index-BFTUNodO.js` (smoke prod OK); iOS **127** upload + obie grupy TestFlight (HTTP 204) + Beta App Review **APPROVED**, plugin @capacitor/network w buildzie (log `tmp/release/ios-127.log`); AAB **v42** SHA `4163aa37` (`~/Desktop/strength-save-v42.aab`, 19,4 MB, jar verified; do wgrania w Play Console przez właściciela). Telemetria `client_errors` po wdrożeniu: 0. **Następny iOS = 128, versionCode = 43.**

### 2026-08-26 (3): X37 — pierwszy trening bez tarcia: rozgrzewka opcjonalna (przełącznik + 3 akcje + treść wg YouTube), serie na czas z odliczaniem, aktywna seria, auto-odhaczanie przy "Zakończ", tour 3 kroków, celebracje 1./10./25./50./100., ilustracje 12 grup mięśniowych (web / iOS 126 / AAB v41)

**Źródło:** głosówka właściciela po buildzie 125 (testy na siłowni) + "najpierw research i plan, potem workflow, na końcu produkcja". Plan `docs/PLAN-X37-2026-08-26.md`, research `docs/RESEARCH-X37-2026-08-26.md` (UX: NN/G, HIG, Material, Hevy/Strong/Fitbod/JEFIT/Boostcamp/Runna; rozgrzewki: Nippard, RP/Israetel, Squat University, Thrall, Kaleigh Cohen, CentrumSportowca.pl). Wykonanie: Workflow 5 agentów w worktree (WP-B..WP-F, 1,36 mln tokenów, 606 tool calls, 52 min) + WP-A/WP-G orkiestrator; merge sekwencyjny (2 konflikty tekstowe w ExerciseCard/WorkoutDay, duplikaty `useWorkoutAggregate` scalone do jednego).

**WP-A Profil:** kolor przewodni znów ZAWSZE rozwinięty (uwaga właściciela), wiersz "Konto i pomoc" bez wartości języka.

**WP-B Rozgrzewka:** `preferences.warmupPrompt` (domyślnie true; cache `fittracker_warmup_prompt_v1` czytany synchronicznie, mirror w Firestore przez `warmup-prompt-sync.ts`, chmura→cache w `PreferenceSync`); przełącznik w Profilu > Trening "Proponuj rozgrzewkę przed treningiem" (`profile-warmup-prompt`); arkusz przed startem z 3 akcjami (`prestart-yes` / `prestart-skip` / `prestart-never` + toast "Włączysz ją w Profilu > Trening"), przy 0 ukończonych blok "dlaczego" (`prestart-first-why`); treść wg researchu: tętno (60/30 s) → mobilność wg partii pierwszego ćwiczenia (góra/dół/full) → aktywacja; początkujący 4 min (max 6 pozycji, marsz zamiast pajacyków), reszta 6 min; dialog w 3 fazach z aktywną pozycją i "Dalej", odliczanie pozycji czasowych za istniejącą flagą `intervalTimers`; rampa 50/70/85 (`rampSchemeFor`: sztanga gryf x8, 50% x5, 70% x3, 85% x1; <60 kg krótsza; >150 kg +40% x5; hantle/maszyna 50% x8, 75% x3) wspólna dla arkusza i "Dodaj serie rozgrzewkowe" w karcie (`detectWarmupEquipment`).

**WP-C Serie na czas:** `set-countdown.ts` (cel wg poziomu: początkujący 30 s, średni 45 s, zaawansowany 60 s, nieznany 45 s; deadline-based) + `SetCountdown` (play/stop 44 px przy polu czasu; na zero: haptyka + dźwięk + `durationSec` = cel + `completed` tą samą ścieżką co ręczne odhaczenie + start przerwy; stop = zapis upłyniętego bez odhaczenia; local notification na deadline przez `rest-notification.ts` w kanałach); `Hollow Hold` → `tracking: 'duration'`; szablony: ćwiczenia czasowe w sekundach wg poziomu (`parseDurationRange`, sekundy nie trafiają do reps).

**WP-D Aktywna seria + auto-odhaczanie:** wiersz aktywnej serii z obrysem `ring-1 ring-primary/70`, lewym paskiem akcentu 3 px i checkmarkiem z obrysem (aria "(aktywna)"); `autoCompleteFilledSets` w `workout-day-view.ts` (serie robocze z kompletem danych wg trackingu odhaczane przy "Zakończ", toast "Odhaczono N serii z wpisanymi danymi"; puste i rozgrzewkowe nietknięte); świadomie inaczej niż Hevy (które po cichu pomija nieodhaczone).

**WP-E Tour pierwszego treningu:** `first-workout-tour.ts` + `FirstWorkoutTour` (3 spotlighty: inputy → checkmark → Zakończ; wycięcie z rAF, Dalej/Pomiń, raz na urządzenie `fittracker_first_workout_tour_v1`, tylko jawny start przy 0 ukończonych, nie desktop md+); `playwright.config` seeduje klucz "widziane" (tour zasłaniałby sesję w każdym specu). QA wykryło i naprawiono: "Tak, rozgrzewka" paliło tour (mount w luce przed dialogiem + Escape z tego samego dispatchu) → `warmupQueued` + ignorowanie zdarzeń sprzed montażu.

**WP-F Celebracje:** `workout-milestones.ts` (1, 10, 25, 50, 100, 150, 200, 300, 500) + `WorkoutMilestoneCelebration` (wzorzec LivePR: baner + konfetti, 2,5 s, X) w `WorkoutCompletionSequence`; "Trening nr N" w podsumowaniu (`workout-ordinal`); klucz `fittracker_milestone_celebrated_v1` (raz per n).

**WP-G Ilustracje mięśni:** 12 obrazów `public/muscles/<PrimaryMuscle>.webp` (GPT Image 2 przez Higgsfield; OpenAI API bez kredytów; źródła PNG w `~/FIRMA/media/ai_generowane/strength_save/muscles/`), 512x512, 11-20 KB, razem 172 KB, poza precache; `getMuscleImageUrl`, `ExerciseDetail` z `<img loading="lazy">` i fallbackiem do `MuscleMap`; właściciel zaakceptował wszystkie 12.

**Naprawione przy okazji:** 6 datozależnych e2e (`critical:38`, `edge-cases` ×4, `mobile-nav:75`) czyta nazwę dnia z daty (`plWeekdayName(localToday())`), bo od X30 WP-L nagłówek sesji podąża za datą.

**Bramki:** vitest **3302/3307** (5 = timeouty `exercise-picker.test.tsx` pod obciążeniem; w izolacji 12/12, na `main` ten plik trwa 67 s); typecheck, lint 0 err, no-emoji; e2e chromium **245/245** (pełny bieg 242 + 3 zaktualizowane pod nową rampę i datę, zielone w powtórce); QA iPhone 15 `tmp/qa-x37/` (arkusz, lista rozgrzewki, tour 1-3, aktywna seria, odliczanie planka, baner 1. treningu, Profil > Trening, ExerciseDetail core/klatka). Znane: `exercise-picker.test.tsx` trwa 45-70 s także na `main` (timeouty tylko pod obciążeniem równoległym).

**Przejście na świeżym koncie produkcyjnym (WP-H pkt 3):** headless Playwright zablokowany przez App Check (bot bez reCAPTCHA: rejestracja tworzy usera Auth, ale zapis profilu odrzucony, ekran "Nie udało się wczytać profilu"); osierocone konto testowe usunięte (Auth accounts:delete, brak dokumentu users/). Pełny flow onboarding → pierwszy trening → baner zweryfikowany w mocku e2e (QA zrzuty 01-23); przejście na realnym koncie = TestFlight 126 / Chrome właściciela (skrypt `tmp/prod-qa/walk.mjs` gotowy dla przeglądarki z reCAPTCHA).

**Wydanie:** web LIVE `index-DeqdHxb7.js`; iOS **126** upload + obie grupy TestFlight (HTTP 204) + Beta App Review **APPROVED** (log `tmp/release/ios-126.log`); AAB **v41** SHA `5d95b812` (`~/Desktop/strength-save-v41.aab`, 19,4 MB, jar verified; do wgrania w Play Console przez właściciela). Telemetria `client_errors` po wdrożeniu: 1 wpis `listener-error` z konta testowego (App Check), zero od realnych userów. **Następny iOS = 127, versionCode = 42.**

### 2026-08-26 (2): X36 — Postępy z Analityką pierwszą i domyślną + skróty Tonaż/Progresja, Profil w zwijanych sekcjach (nowe grupowanie), Profil bez paska "Wstecz" (web / iOS 125 / AAB v40)

**Źródło:** głosówka właściciela po buildzie 124. Plan `docs/PLAN-X36-2026-08-26.md`, branch `feat/x36-profile-progress`, research UX (Hevy/Strong/Fitbod/JEFIT/Boostcamp/Runna + HIG/Material) jako tło grupowania.

**Postępy:** segment `Analityka | Rekordy i odznaki`, Analityka PIERWSZA i DOMYŚLNA (`/achievements` bez `?view=`); rekordy pod `?view=records` (stare deep linki `?section=records|badges` bez `view` nadal otwierają rekordy). Nad zakładkami Analityki rząd skrótów `Tonaż` / `Progresja` (`analytics-quick-*`, deep link `view=analytics&tab=charts&chart=…`) — wykres w JEDNO tapnięcie zamiast Analityka → Wykresy → kafel; menu wykresów zaczyna się od Tonażu i Progresji. Wejścia do rekordów ("Wszystkie rekordy" w progresji, karty PR w Podsumowaniu, push o PR z WorkoutDay, "Wszystkie" w Profilu) celują w `?view=records`. Route sweep dostał `/achievements?view=records` i mock `useWorkoutRange` (`buildUseWorkoutRangeResult`), bo domyślny `/achievements` renderuje teraz SummaryTab.

**Profil:** `ProfileAccordionSection` (`src/components/profile/`, wzorzec Radix: `h2 > button`, etykieta w `[data-section-label]`, wartość w wierszu, treść NIEZAMONTOWANA gdy zwinięta — karty z hookami sieciowymi nie odpytują backendu do otwarcia). Kolejność: Tożsamość + Osiągnięcia (otwarte) → Kolor przewodni → **Trening** (jednostki, **Nie wygaszaj ekranu** przeniesione z karty przerw, Nie na 100%, Urlop) → **Timer i przerwy** (timer on/off + dźwięk, dawniej w Treningu; `RestSettingsCard hideTitle` bez keep-awake; wiersz: "Między seriami: N s" / "Wyłączony") → Kalkulator talerzy (`PlateInventorySettings` bez własnego Card/Collapsible) → Trener (wiersz: imię / zamaskowany adres / "Nie ustawiono") → **Urządzenia i połączenia** (Health + Garmin/Apple Watch `hideTitle` + Strava w JEDNEJ sekcji, skrót "Garmin i zegarek" zbędny) → Powiadomienia (niżej: "nie najważniejsze") → Subskrypcja (wiersz: plan) → Twoje dane → Backup i przywracanie → Zgody i prywatność → Konto i pomoc (wiersz: język). Deep link `?section=` ROZWIJA sekcję i przewija; aliasy `connections`/`strava` → `devices`, `rest` → `timer`; `legacySettingsPath('strava')` → `devices`. Sync Center NAD listą sekcji (alert o zaległościach, nie ustawienie — e2e `batch-save` to złapał). Popup "Zapisać jako trenera?" po pierwszej wysyłce bez zmian (EmailWorkoutDialog). Decyzja świadoma wbrew researchowi: apki z kategorii nie robią accordionów (lista wierszy → podstrony), ale właściciel jawnie chciał "ptaszki" jak w sekcji przerw.

**Layout:** `/profile` bez `BackBar` (wejście z avatara; strzałka w nagłówku zostaje jedynym powrotem), rezerwa dolna 7.5rem.

**Bramki:** vitest **3176/3176**, typecheck, lint 0 err, build web + mobile, dist-smoke, bundle 1 391 103 B, e2e chromium **225/231** (6 failów NIE z X36: `critical.spec:38`, `edge-cases` ×4, `mobile-nav-reachability:75` oczekują "Poniedziałek" na `/workout/day-1`, a nagłówek od X30 WP-L (4c03d29c) podąża za datą, więc padają w każdy dzień poza poniedziałkiem; potwierdzone na `main` przez stash — do naprawy osobno), QA iPhone 15 `tmp/qa-x36/` 4/4 (zero poziomego scrolla; po QA: skróty bez chevrona, bo "Progresja" ucinała się na 393 px; karta urządzeń bez tytułu, bo dwie linie obok "Odśwież").

**Wydanie:** web LIVE `index-CeIn7pvM.js`; iOS **125** upload + obie grupy TestFlight (HTTP 204) + Beta App Review **APPROVED** (log `tmp/release/ios-125.log`); AAB **v40** SHA `4de8f9fb` (`~/Desktop/strength-save-v40.aab`, 19,3 MB, jar verified; do wgrania w Play Console przez właściciela). Telemetria `client_errors` od wdrożenia: 0 wpisów (REST read-only). **Następny iOS = 126, versionCode = 41.**

### 2026-08-26: X35b + X35c — Profil bez "Ustawień zaawansowanych", pasek "Wstecz", przerwy wg celu planu, reset planu w Cyklach, powiadomienia (6 typów + push o rekordzie + dzwonek wszędzie) (iOS 124 / AAB v39 / functions)

**Decyzje właściciela:** patrz `docs/PLAN-X35-2026-08-25.md` sekcje B, C, E + "Decyzje" (pasek "Wstecz" nad nawigacją; przerwy siła 180 / masa 120 / redukcja 60 (max) / atletyka 75 s; trzy przyciski resetu w Cyklach; likwidacja `/settings`). Dzwonek = skrzynka zdarzeń w nagłówku (PR, odznaki, raport tygodnia, plan, ogłoszenia), dotąd tylko na Dashboardzie.

**X35c powiadomienia:** `NotificationSettings` z 6 przełącznikami i opisem kanału (`notification-prefs.ts`: dailyReminder push, prPush push+apka, photoReminder push+apka, modeEnding push, announcements push+apka, weeklyDigest mail; brak pola = włączone); gate'y w functions: `photo-reminder` (dotąd bez gate'a), `reduced-mode-push` (urlop/tryb lżejszy, dotąd pod `dailyReminder`), `adminSendPush` (`announcement-recipients.ts`: push pomija `announcements === false`, wpis w dzwonku zostaje). **Push o rekordzie** `onWorkoutCompletedPrPush` (`functions/src/pr-push.ts`, trigger `workouts/{id}` tylko na przejściu `completed → true`, detekcja `detectEmailPRs` na baseline 100 sesji, treść wg języka i jednostek, idempotencja przez `pr_push_markers/{workoutId}`; klient pozostaje jedynym producentem wpisu `'pr'` w dzwonku, serwer tylko dosyła push). Dzwonek na wszystkich zakładkach głównych (`BELL_PATHS` w AppHeader; pigułka licznika tylko na Dashboardzie). `AdminCommsCard`: szablony (Nowa wersja / Tydzień / Wolny tekst) + podgląd z liczbą odbiorców. Rules bez zmian; do deployu functions: nowa `onWorkoutCompletedPrPush`, zmienione `photoReminder`, `reducedModeEndingPush`, `vacationEndingPush`, `adminSendPush`.

**X35b WP-C (pasek "Wstecz" + sticky nagłówek):** ROOT CAUSE "nie ma sticky menu": `body { overflow-x: hidden }` (przy `html` też `hidden`) robił z body scrollport, więc `position: sticky` nagłówka kotwiczyło się do body, które nie scrolluje → nagłówek NIGDY nie był przyklejony na mobile (zrzut baseline: header y = -1475 px). Fix: `html { overflow-x: hidden }`, `body { overflow-x: clip }`, wrappery Layout `overflow-x-clip`. Nowy `BackBar` (fixed nad nawigacją, slot jak RestBar z X29, `nav.back` + tytuł trasy) na trasach spoza `rootPaths` i w focused flow `/exercise/:slug`; NIE w `/workout/:dayId` (slot zajęty przez RestBar/CTA sesji); rezerwa dolna maina 10.75rem z paskiem.

**X35b przerwy wg celu:** `rest-defaults.ts` (robocza / między ćwiczeniami / po rozgrzewce): siła 180/240/90, masa 120/180/60, redukcja 60/90/30, atletyka 75/120/45, nieznany cel 90/150/45. Jedno źródło prawdy `users/{uid}.preferences.rest` (+ `custom: bool`), localStorage jako cache; migracja w `PreferenceSync` (brak `rest` → z `restTimerSec` albo z cache, `custom: true`; `restTimerSec` legacy tylko do odczytu); `startCycleWithPlan`/`completeOnboardingPlan` zapisują domyślne wg `choice.objective`, chyba że `custom`; `RestSettingsCard` z nagłówkiem "Twoja przerwa robocza", "Polecane dla Twojego planu: N s" i "Przywróć polecane". Zegarek czyta `rest.workingSeconds`.

**X35b WP-B Profil:** `/settings` zlikwidowane (`SettingsRedirect` → `/profile?section=` z mapą: notifications→profile-notifications, connections→profile-devices, strava→profile-connections, consents→profile-consents, data→profile-backup, account→profile-account). Profil w 11 sekcjach z kotwicami: Tożsamość (+ osiągnięcia, kolor akcentu), Powiadomienia, Urządzenia i dostęp (+ zegarek), Trening, Przerwy między seriami (Collapsible, wiersz z aktualną wartością), Kalkulator talerzy, Połączenia (`StravaConnectionCard`), Trener (ZAWSZE widoczny: pusty stan "Dodaj trenera" z formularzem imię/e-mail), Subskrypcja, Dane (+ `BackupSettings` z pełnym oknem, `ConsentSettings`), Konto i pomoc; duplikat "Imię i awatar" usunięty; stary Select "Timer przerwy" zastąpiony kartą przerw. Cykle: sekcja "Plan" z trzema akcjami za `ConfirmDialog` ("Zakończ plan", "Zakończ plan i ułóż nowy", "Onboarding od nowa"), guard aktywnego draftu. Narzędzia naprawcze jako `AdminRepairToolsCard` na `/admin`. Hardening: `listLinkedDevices` zwraca `[]` przy złej odpowiedzi (route sweep złapał crash `/profile`).

**Proces:** 3 agentów równolegle (Profil; pasek+przerwy; powiadomienia), Profil scalił main z pozostałymi u siebie (1 konflikt), merge do main bez konfliktów. QA zrzuty: `tmp/qa-x35b-profile/` (Profil pełna strona, Trener 3 stany, Cykle, deep link), `tmp/qa-x35b-back-rest/` (baseline bez sticky vs po fixie, pasek na Pomiarach/ćwiczeniu, brak paska w sesji, karta przerw).

**Bramki po merge (main):** vitest **3151/3151** (368 plików; jeden bezgłośny bieg kontrolny padł kodem wyjścia, powtórka exit 0 z 3151/3151), functions **415/0**, typecheck web+functions, lint 0 err, no-emoji, build web+mobile, dist-smoke, bundle 1 391 103 B, e2e chromium **110/110**.

**Wydanie (potok: functions → web → iOS → AAB):** functions Deploy complete (nowa `onWorkoutCompletedPrPush` trigger Firestore + zaktualizowane `photoReminder`, `reducedModeEndingPush`, `vacationEndingPush`, `adminSendPush`, potwierdzone `functions:list`); web LIVE `index-K-NsFPic.js`; iOS **124** upload + obie grupy + Beta App Review **APPROVED**; AAB **v39** SHA `b44d43b1` (`~/Desktop/strength-save-v39.aab`, jar verified); rules bez zmian. **Następny iOS = 125, versionCode = 40.**

### 2026-08-25 (5): X35a — zero przewijania poziomego, eksport konkretnego cyklu, Plan przed startem, pomiary wg celu (iOS 123 / AAB v38)

**Uwagi właściciela po 122 (głosówka) + audyt + research (NN/g: treści za poziomym przewijaniem mają niską odkrywalność; chipy zawijać przy >5-8 opcjach).** Plan: `docs/PLAN-X35-2026-08-25.md` (X35a = A, D, F, G, H; X35b = Profil bez "Ustawień zaawansowanych" + pasek "Wstecz" + przerwy wg celu + 3 przyciski resetu w Cyklach; X35c = powiadomienia). Decyzje: heatmapa roczna USUNIĘTA (nieczytelna na telefonie), 12-tygodniowa zostaje bez scrolla; przerwy domyślne: siła 180 s, masa 120 s, redukcja 60 s (max), atletyka 75 s; powrót z dołu strony = sticky pasek "Wstecz"; reset planu w Cyklach = "Zakończ plan" / "Zakończ plan i ułóż nowy" / "Onboarding od nowa".

**WP-A zasada produktu: żaden element sterujący za przewijaniem w bok.** 10 miejsc zamienionych na zawijane wiersze / siatki: filtry typu w grupie ćwiczeń (+ liczniki, WP-H), kategorie w pickerze (siatka 3×3), chipy daty pierwszego treningu (siatka 4×2), chipy celu w bibliotece planów, chipy statusu i dnia w Historii ("Porównaj" jako osobny przycisk trybu), chipy szczegółów cyklu, pola wykresu pomiarów, filtr Stravy, chipy eksportu; martwy `overflow-x` w TabsList Analityki usunięty. `TrainingHeatmap` (roczna) usunięty z komponentem, lib, i18n i testami; heatmapa 12 tyg. jako siatka CSS `1rem + 12×minmax(0,1fr)` (komórki ~24 px). **Guard** `src/test/no-horizontal-scroll-guard.test.ts` (skan `src/pages` + `src/components` pod `overflow-x-auto|overflow-x-scroll|snap-x|overflowX`, pusta lista wyjątków).

**WP-D eksport:** oba eksporty (Historia `HistoryExportSheet`, Ustawienia/Analityka `ExportWorkoutsDialog`) mają listę cykli "Cykl N · nazwa · 1.06 → 24.08 · 47 treningów" (`export-cycle-options.ts`; nazwa z `choice.planName` ?? szablon; tylko cykle widoczne z danymi; domyślnie aktywny), zakres w trybie `cycle` filtruje po `cycleId` po stronie klienta (legacy bez `cycleId` dopasowane po datach jak w Historii; sesja z innym `cycleId` w tych samych datach = poza eksportem). Dotąd eksport z Historii miał tylko "aktywny cykl".

**WP-F Plan przed startem:** `buildPreStartInfo` (`src/lib/plan-prestart.ts`, wyciągnięte z Dashboardu) + wspólny `PreStartCard`; w zakładce Plan karta "Plan startuje: poniedziałek 7 września" nad zakresem tygodnia z CTA "Zobacz pierwszy tydzień" (skok do tygodnia startu), nagłówek "Przed startem" zamiast "Historia" dla tygodni przed startem niewystartowanego planu.

**WP-G pomiary:** edycja wpisu jako `Sheet` od dołu (`overflow-x-hidden`, `min-w-0`, data i godzina w osobnych pełnych wierszach POD polami) — koniec "latania na boki" (przyczyna: dwa natywne inputy date/time po 152 px w dwóch kolumnach rozpychały `DialogContent`); `onOpenAutoFocus` → pole wagi (dotąd Radix brał natywne pole daty i iOS podnosił picker); `weightDeltaTone(delta, objective)`: redukcja = spadek zielony / wzrost czerwony, masa i siła odwrotnie, atletyka/brak celu neutralnie, ta sama funkcja w wierszu i badge'u trendu (dotąd badge miał zaszyte "wzrost = źle"); test sekwencji popupu "Zrób pomiary" po onboardingu (vitest przez prawdziwy router + e2e od `/?welcome=1`); haki mock E2E `fittracker_e2e_measurements` + `trainingProfile`.

**Proces:** 3 agentów równolegle w worktree (pomiary; eksport+prestart; scroll+ćwiczenia), każdy z własnym e2e i QA na iPhone 15 (chromium + webkit, `tmp/qa-x35a*`), merge bez konfliktów; jeden agent usnął po `run_in_background` (znana pułapka) i został wznowiony z instrukcją "na pierwszym planie". Lekcja QA: `webServer.cwd` w tymczasowym configu Playwright w worktree musi wskazywać worktree, inaczej serwuje kod głównego repo (bezpiecznik `assertServesX35a` w specu).

**Bramki po merge (main):** vitest **3060/3060** (361 plików), typecheck, lint 0 err, no-emoji, build web+mobile, dist-smoke, bundle 1 386 341 B, e2e chromium **109/109**; zrzuty kontrolne orkiestratora (`tmp/qa-x35a-final`, iPhone 15): ćwiczenia/nogi, Historia, Plan, 6/6 — `scrollWidth = innerWidth = 393` wszędzie.

**Wydanie:** web LIVE `index-DDYag34a.js`; iOS **123** upload + obie grupy + Beta App Review **APPROVED**; AAB **v38** SHA `7abea171` (`~/Desktop/strength-save-v38.aab`, jar verified); rules i functions bez zmian. **Następny iOS = 124, versionCode = 39.**

### 2026-08-25 (4): X34 — poprawki kreatora po przeglądzie X33 na iPhonie: 5A odchudzone, ekran 6/6 "Start planu" z CTA wg celu, "Wybierz inny plan" w podglądzie, przerywnik 3,5 s (iOS 121 / AAB v36)

**Uwagi właściciela (screen IMG_1243 + głosówka):** nazwa/długość/start na osobny ekran po wyborze planu, CTA na 5A krótkie ("Wybierz start planu"); przerywnik ma trwać 3-4 s, żeby dało się go zobaczyć; z 5A wyrzucić podsumowanie odpowiedzi i "Zmień ustawienia" (to onboarding, user właśnie to przeszedł); z kart wyrzucić "Pierwszy trening"; podgląd planu musi mieć wyjście "Wybierz inny plan" obok "Zatwierdź i zacznij"; główny CTA na ekranie startu spersonalizowany celem ("Zacznij redukcję", "Zacznij budować masę"…). Plan: `docs/PLAN-X34-2026-08-25.md`.

**Zmiany:** 5A = nagłówek "Plany na {days} dni w tygodniu" + dwie karty (bez "Pierwszy trening") + "Ułóż własny plan" + "Biblioteka planów na N dni" + jedno CTA `ob-match-next`; nowy `PlanStartStep` (6/6): nazwa (pełna szerokość, 60 znaków; własny plan = "Własny plan"), kafle 8/12/16 + wartość szablonu "polecane" + "Inna" (picker), chipy poniedziałków "Pierwszy tydzień", CTA `ob.start.cta.{objective}` (zapis od razu) + "Podgląd planu"; `PlanPreview` z `plan-preview-choose-other` (powrót na 5A z zachowanym stanem, bez przerywnika); strzałka wstecz z podglądu i z kroku marketingowego wraca na 6/6; przerywnik 3,5 s z wierszami co 0,7 s, pomijany przy powrotach i wznowieniu; wznowienie przywraca też `durationWeeks`; licznik kroków 1..6 / 2..6. `PlanSettingsRow` usunięty; klucze i18n usunięte z obu plików (`ob.match.start`, `ob.match.firstWorkout`, `ob.precision.answers`, `ob.precision.change`, `ob.settings.*`, `ob.startWeek`). Kontrakt zapisu (`choice`, `onboardingAnswers`, `skipPreview`) bez zmian; payload custom dostaje `planName`.

**Testy:** vitest +23 (PlanStartStep 18, choose-other 7), e2e 4 nowe scenariusze (a-d ze specu) w `full-app`/`replan`; w trybie mock e2e kończy się na kliknięciu zapisu (transakcja Firestore zablokowana), pełna ścieżka do Dashboardu w `e2e/emulator/plan-lifecycle.spec.ts` (zaktualizowany pod 6/6, wymaga emulatorów). QA wizualne osobnym agentem (Playwright, iPhone 15 393×852 @3x, chromium + webkit, ~40 zrzutów w `tmp/qa-x34/`, obejrzane przez orkiestratora): przerywnik 3502-3505 ms z wierszami co ~0,7 s; brak poziomego scrolla na każdym ekranie; CTA klikalne (`elementFromPoint`); podgląd wchodzi z `scrollY 0`; "Wybierz inny plan" bez przerywnika i z zachowanym stanem; 0 `pageerror`. **Jedno odchylenie:** nazwa 60 znaków przewijała się w jednoliniowym `input` (widoczne ~30 znaków) → fix: `textarea` rosnąca w dół (bez Entera, `overflow-hidden`), ponowne QA 4/4 i e2e **102/102 chromium, 102/102 webkit**. INFO (bez zmian, do decyzji): domyślny poniedziałek = bieżący tydzień (X27), chipy celu w bibliotece przewijają się poziomo, po "Inna" picker dubluje wartości kafli, brak `env(safe-area-inset)` w kreatorze/podglądzie (stan sprzed X34, do sprawdzenia na urządzeniu).

**Bramki po merge:** vitest **2988/2988** (355 plików), typecheck, lint 0 err, no-emoji, build web+mobile, dist-smoke, bundle 1 386 766 B, e2e 102/102 ×2.

**Wydanie (potok nohup):** web LIVE `index-BvVh_gQc.js`; iOS **121** upload + obie grupy + Beta App Review **APPROVED**; AAB **v36** SHA `f2e3c069` (`~/Desktop/strength-save-v36.aab`, jar verified); rules i functions bez zmian.

**X34b (uwagi właściciela po 121, ten sam wieczór):** (1) ekran 6/6 w nowej kolejności: **data pierwszego treningu** (chipy kolejnych DNI TRENINGOWYCH wg kroku 4, od dziś, "Dziś" gdy dotyczy) → czas trwania (polecane domyślnie) → nazwa → CTA wg celu; model planu nadal zakotwiczony w poniedziałku (`startDate` = poniedziałek tygodnia wybranej daty), a dni treningowe tygodnia startu sprzed wybranej daty idą do `training_plans.skippedDates` (czysta funkcja `buildFirstWorkoutSchedule`); kontrakty `choice`/`onboardingAnswers`/rules bez zmian; (2) zakładka Plan bez karty zasad "Ciężar… / Przerwy…" (`getTrainingRules` zostaje w DayPlan); (3) Dashboard przed startem cyklu: "Zobacz plan" jako CTA w akcencie (`kinetic-primary-button`, pełna szerokość) zamiast wyszarzonego outline. Wydanie X34b (bramki: vitest **3011/3011**, typecheck, lint 0 err, build, dist-smoke, bundle 1 386 976 B, e2e chromium 102/102 (webkit 102/102 w worktree agenta), QA chromium 109 sprawdzeń / 0 odchyleń): web LIVE `index-CbhWFcL2.js`; iOS **122** upload + obie grupy + Beta App Review **APPROVED**; AAB **v37** SHA `55fc4b87` (`~/Desktop/strength-save-v37.aab`, jar verified). **Następny iOS = 123, versionCode = 38.**

### 2026-08-25 (3): X32 + X33 — kreator po cyklu od kroku 2, krok 5 jako wybór dwóch planów, "Zaczynam" bez podglądu, odpowiedzi z kreatora na cyklu, sekcja Cykle w adminie, avatar w kroku 1 (iOS 120 / AAB v35)

**Decyzje właściciela (z rozmowy o onboardingu, plan `docs/PLAN-X33-2026-08-25.md`):** ekrany 1-4 bez zmian; po zakończeniu cyklu zawsze kroki 2-5 (X32); krok 5 pokazuje TYLKO plany o wybranej liczbie dni; podgląd planu opcjonalny ("Zaczynam ten plan" zapisuje od razu, "Podgląd planu" drugorzędny); zero nadpisywania: każde przejście przez kreator = nowy cykl z własnymi odpowiedziami, admin widzi cykle i wybory; pomysł Grzegorza (avatar + imię + kolory ze zdjęcia w kroku 1) przyjęty. Inspiracja: projekt Claude Design "Strength Save onboarding app" wariant 1a ekran 6.

**X32 (fundament):** `/new-plan` startuje od kroku 2 z `trainingProfile` (koniec `startAtPrecision`, martwy `reachedViaSteps` usunięty); `selectTemplatesForDays` (dokładna liczba dni → ±1 → katalog) i `scoreTemplates` na puli; Browse "Plany na N dni w tygodniu (M)"; wybór z Browse nie resetuje dni tygodnia z kroku 4; "Zmień ustawienia" także w onboardingu.

**X33 kreator (WP-1..5):** przerywnik "Dobieram plany" (nakładka ~900 ms po kroku 4, pomijana przy powrocie/wznowieniu); `PlanChoiceCard` ×2 (Polecany = `scoreTemplates(pula)[0]`, Alternatywa = najlepszy o innym celu, fallback drugi; hero webp, "dlaczego" z etykiet szablonu, meta, "Pierwszy trening: focus + 3 ćwiczenia"); biblioteka (Browse) z chipami celu w obrębie puli dni, wybór spoza kart podmienia kartę 2 z badge "Wybrany"; `PlanSettingsRow` (zwinięta linia nazwa · tygodnie · start; rozwinięcie: nazwa pełnej szerokości, kafle 8/12/16 + Inna z "polecane" na wartości szablonu, chipy poniedziałków); dwa CTA: "Zaczynam ten plan" (`skipPreview: true` → Onboarding: krok marketingowy → `completeOnboardingPlan`; NewPlan: `startCycleWithPlan` od razu) i "Podgląd planu"; scroll na górę przy zmianie kroku/trybu i w `PlanPreview`. Usunięte: tonaż (`estimateMonthlyVolume`), lista dni w kroku 5, tagi celu, klucze `ob.precision.title/recommended/chosen/browse/volume/kgMonth`, `ob.tag.*`. Test równości payloadu "Zaczynam" vs "Podgląd → Zatwierdź".

**X33 dane (WP-6):** `plan_cycles.choice` v1 `{version, chosenAt, level, objective, daysPerWeek, trainingDays, planSource, templateId?, recommendedTemplateId?, planName?, entry: onboarding|replan}`; `buildPlanCycleChoice(wizardChoice, entry, now)`; `createActiveCycle(days, weeks, start, { choice })` (reuse przy kolizji id z X31 nie nadpisuje istniejącego `choice`); `sanitizePlanCycleChoice` (enumy przez `satisfies`, nieznane dni odfiltrowane, uszkodzone `choice` odrzucone po cichu, cykl bez `choice` poprawny); rules `validPlanCycleChoice` (8 nowych przypadków, emulator 266/266); backup JSON round-trip zachowuje `choice`; test sekwencji onboarding → koniec planu → replan = DWA cykle z własnym `choice`, `onboardingAnswers` nietknięte. `training_plans/{uid}` pozostaje kopią roboczą bieżącego planu; historia i odpowiedzi żyją w cyklach.

**X33 admin (WP-7):** `AdminCyclesCard` w `AdminUserDetail` (jedno zapytanie `plan_cycles where userId`, limit 50, tolerancyjne na błąd): chronologicznie cykle (daty, "w toku" dla `endDate ''`, status, nazwa `choice.planName` > szablon > "Plan własny", dni, tygodnie, frekwencja), wiersz rozwijalny z odpowiedziami z kreatora albo "cykl sprzed zapisu odpowiedzi"; `parseCycleChoice` toleruje surowe dokumenty.

**X33 krok 1 (WP-8):** kółko avatara (zdjęcie z Google; Apple nie daje zdjęcia → inicjał imienia/e-maila; ikona bez danych) + "Cześć, {imię}" liczone z żywego pola imienia; `accentCandidatesFromImageData` (12 sektorów koła barw, próg nasycenia, pasmo jasności 0.1-0.9, top 3 → `nearestAccentId`, dedup, nigdy neutralne) → do 3 kropek "Z Twojego zdjęcia" przed paletą; auto-preselekcja jak w X29; szare zdjęcie/Apple/offline = dokładnie dotychczasowy widok.

**Proces:** WP-6, WP-7, WP-8 równolegle w worktree (WP-7 na kontrakcie ze specu; przy merge ręczne scalenie zdublowanego typu `PlanCycleChoice` i buildera `buildCycleChoice`, zwycięzca WP-6, adapter w teście WP-7), potem kreator na scalonym main.

**Bramki po merge:** vitest **2965/2965** (353 pliki), typecheck, lint 0 err (15 warningów react-refresh), no-emoji, build web+mobile, dist-smoke, bundle 1 386 559 B / 1 536 000, test:rules **266/266** (8 nowych dla `choice`). E2E: `replan`, `auth-registration`, `onboarding-accent` zielone; `full-app.spec.ts` 14 testów × 2 przeglądarki czerwone z przyczyn PRZESTARZAŁYCH SCENARIUSZY (X30 WP-L: nazwa dnia z daty, test oczekiwał "Poniedziałek" na `/workout/day-1` bez daty we wtorek; X32: `/new-plan` od kroku 2, test klikał "Zmień ustawienia" od razu; X33: nowy DOM kroku 5) — e2e nie było uruchamiane przy X30/X31 (lekcja: e2e do bramek każdego wydania dotykającego kreatora/WorkoutDay). Naprawa testów po wydaniu (pakiet TEST-E2E, tylko e2e/*): chromium **98/98**, webkit **98/98**, zero realnych błędów produktu (nowe helpery `plWeekdayName`, `advanceWizardToStep5`; sekwencja przerwania z retryowanym `toHaveCount`).

**Wydanie (potok nohup: rules → web → iOS → AAB):** firestore.rules released (`choice`); web LIVE `index-CtyvAWCa.js`; iOS **120** upload + obie grupy + Beta App Review **APPROVED**; AAB **v35** SHA `296838ab` (`~/Desktop/strength-save-v35.aab`, jar verified). **Następny iOS = 121, versionCode = 36.**

### 2026-08-25 (2): HOTFIX X31 — incydent na koncie właściciela: plan "zakończony" mimo wybranego nowego planu, zero aktywnych cykli po replanie, rekomendacja 4 dni zamiast 3 (iOS 119 / AAB v34)

**Zgłoszenie:** rano po wydaniu X30 właściciel widzi w Planie "plan zakończony, czekaj na następny krok", choć 21.08 wybrał FBW 3 dni ze startem 7.09; po ponownym wyborze planu kreator proponuje plan 4-dniowy, a w Cyklach nie ma aktywnego cyklu. Ground truth z Firestore (read-only) przed jakąkolwiek hipotezą.

**Root cause A (wczoraj 21:31, 4 min po wejściu X29 na web):** klient web ze STARYM dokumentem planu w IndexedDB (persistentLocalCache: start 1.06, 12 tyg., active) dostał pierwszy snapshot z cache → `isLoaded=true`, `isPlanExpired=true` → auto-end (`shouldAutoEndPlan`) odpalił zanim doszły dane z serwera: zarchiwizował stary cykl (poprawnie, wygasał 24.08) i wpisał `status: 'ended'` przez `setDoc(merge)` BEZ precondycji do dokumentu, który od 21.08 był już nowym planem 7.09. Drugi event `plan ended 2026-09-07` (+366 ms) emitowała `PlanNextStepCard` przy renderze stanu ended z bieżącym startDate. Pułapka SDK: bez `includeMetadataChanges` snapshot z serwera identyczny z cache w ogóle nie jest dostarczany, więc sama flaga `fromCache` bez tej opcji nigdy by nie wstała.

**Fix A:** `useTrainingPlan` i `usePlanCycles` wystawiają `hasServerSnapshot` (listenery z `includeMetadataChanges: true`); auto-end i auto-repair cyklu (Dashboard, Cycles) działają WYŁĄCZNIE na danych z serwera (offline = brak automatycznych mutacji, closeout przy następnym online); `setPlanStatus('ended')` to transakcja z precondycją `startDate === expectedStartDate && status === 'active'`, rozjazd = `{success:false, reason:'stale'}` bez zapisu i bez eventu (telemetria informacyjna `plan-status-stale`). Test sekwencji `plan-lifecycle-stale-cache.test.tsx` na realnych hookach z in-memory fake Firestore.

**Root cause B (dziś 08:32, ponowny wybór planu z TĄ SAMĄ datą startu 7.09):** `createActiveCycle` używa deterministycznego id `cycle-{uid}-{startDate}` → trafił w istniejący aktywny cykl (no-op, "sukces"), a następnie `archiveCurrentPlan` zamknął właśnie ten cykl (`endDate 2026-08-25 < startDate`, `durationWeeks 1`). Efekt: plan active, zero aktywnych cykli, auto-repair (ten sam id) bezradny.

**Fix B:** kolizja id: aktywny cykl tego samego planu (hash szablonu + durationWeeks) = reuse (idempotencja retry), inny stan = nowy dokument `cycle-{uid}-{startDate}-{ms}`; `startCycleWithPlan` przekazuje `excludeCycleId` do archiwizacji; cykl, który nie ruszył, zamykany z `endDate = startDate` (bez ujemnych zakresów, `archivedDurationWeeks` z guardem). Test sekwencji `plan-cycle-same-start-replan.test.tsx` (dokładnie jeden aktywny cykl po replanie z tą samą datą).

**Root cause C (rekomendacja 4 dni):** X30 WP-O zmieniło wagi na dni 100 / cel 150 / poziom 10, więc jedyny szablon `fat_loss` (4 dni) wygrywał z wyborem 3 dni. **Fix:** dni 1000 / cel 100 / poziom 10 (porządek leksykograficzny: dokładna liczba dni ZAWSZE pierwsza), test własności dla wszystkich kombinacji cel × poziom × 2..6 dni, przywrócone oczekiwania `planTemplates.test.ts`. **Root cause D (drugi mechanizm "kroki 2-4 nie działają w kroku 5"):** `/new-plan` bez `fromCycle` montował `PlanWizard` zanim `getDoc(trainingProfile)` odpowiedział, a kreator czyta `initial` tylko w inicjalizatorach `useState` → krok 5 liczony z domyślnych beginner / masa / 4 dni. **Fix:** spinner do czasu profilu (null = kreator z domyślnymi, bez wiecznego czekania) + podsumowanie odpowiedzi z kroków 2-4 pod rekomendacją (`ob.precision.answers`, pl+en) + test sekwencji `newplan-profile-hint.test.tsx`.

**Naprawa danych właściciela (za zgodą, backup w scratchpadzie sesji):** `plan_cycles/cycle-{uid}-2026-09-07` przywrócony na `active`, `endDate ''`, 12 tyg., days z dokumentu planu; historia (cykl 1.06 → 24.08, 47 treningów, 96%) nietknięta. Skrypt ogólny: `scripts/repair-plan-cycle-2026-08-25.mjs` (dry-run, `--apply`). Hipoteza duplikatu archiwum `cycle-{uid}-2026-06-01` sprawdzona: nie istnieje.

**Bramki po merge:** vitest 2873/2873 (345 plików), typecheck, lint 0 err, build web+mobile, dist-smoke, bundle-budget. **Wydanie (jeden potok nohup, bo web/iOS/Android współdzielą `dist/`):** web LIVE `index-X5Z5vJOY.js`; iOS **119** upload + Beta App Review **APPROVED**; AAB **v34** SHA `da7bc4f1` (`~/Desktop/strength-save-v34.aab`, jar verified). Cron X30 potwierdzony: Cloud Scheduler `0 * * * *` UTC ENABLED, przebieg 07:00:01Z start→done bez błędów. **Następny iOS = 120, versionCode = 35.**

**Lekcje:** (1) każda automatyczna mutacja (auto-end, auto-repair) musi być bramkowana danymi Z SERWERA, a zapis statusu musi mieć precondycję tożsamości dokumentu; (2) deterministyczne id jako kotwica idempotencji łamie się przy powtórzeniu klucza w innym stanie: sprawdzaj stan istniejącego dokumentu, nie sam fakt istnienia; (3) zmiana wag w scoringu to zmiana produktowa: jawna decyzja usera (liczba dni) nigdy nie może przegrać z heurystyką; (4) `initial` czytane tylko w `useState` = wyścig z asynchronicznym profilem, testuj sekwencję "dane przychodzą PO pierwszym renderze".

### 2026-08-25: FALA X30 — 53 bugi z bug huntu + edycja pomiarów + onboardingAnswers + karta admina + rekomendacja planu + nazwa dnia po przełożeniu

**Wejście:** raport bug hunt z 2026-08-24 (`~/Downloads/RAPORT-BUG-HUNT-strength-save-2026-08-24.md`, 54 potwierdzone bugi: 8 wysoki / 23 średni / 23 niski, 3 odrzucone) + 3 zgłoszenia usera z tej sesji (edycja wpisu pomiaru, zapis kroków onboardingu z podglądem w adminie, tytuł "Poniedziałek" na karcie treningu przełożonego na środę). Decyzja usera: grafika notesu w pustym stanie Planu ZOSTAJE (pokazuje się tylko przy braku planu).

**Proces:** (1) 9 agentów read-only zweryfikowało każdy z 54 bugów na HEAD po X29: **54/54 nadal obecne** (żaden nie zniknął przy okazji X29), z dowodami file:line i zaktualizowanym kierunkiem naprawy; (2) 2 agentów rekonesansu (pomiary, onboarding+admin); (3) 12 pakietów w izolowanych worktree (TDD, commit per bug), 5 pakietów wznowionych po limicie modelu w tych samych worktree; (4) merge sekwencyjny do main, 4 konflikty (wszystkie "sąsiednie dopisania": importy TrainingPlan/ActiveWorkoutResume, canonical-states, rules+mapper) + 3 interakcje między pakietami wykryte dopiero po scaleniu (zdublowany import `sanitizePlanCycleDoc` p3/p9; lista wyjątków guarda `parseLocalDate(` przestarzała po p2/p10; test bug 15 mockował `updateDoc`, a p9 przeniosło backfill na `runTransaction`).

**Naprawione (53 z 54; bug 36 = wontfix, dotyczy wyłącznie rekordów legacy sprzed M32):**
- p1 zgody/auth: 1 (wycofanie zgody zdrowotnej nie zapętla na ConsentGate: bramka na DECYZJI, nie zgodzie; ograniczenia realizuje `useHealthConsent`), 9 (EmailVerificationGate czeka na snapshot 12 s, `alreadyVerified` bez fałszywego toastu), 10 (`auth-errors.ts`: anulowanie = cisza, kolizja kont/sieć/popup = dedykowane i18n), 32 (Wyloguj na ConsentGate), 33 (kod zaproszenia konsumowany PO udanym redeem, telemetria `invite-redeem-failed`), 34 (`protected-callable.ts`: recordConsent z timeoutem 10 s + App Attest), 35 (`appCheckReady` przed callable na web), 46 (restore konta legacy nie degraduje do pending_verification; functions).
- p2 przełożenia: 2 (frekwencja cyklu zna `scheduleOverrides`, sloty przez `resolvePlannedDay`), 12 (numer tygodnia kalendarzowo, `planWeekNumberForDate`, DST), 39 (`currentWeek` z `useToday`), **WP-L: `displayDayNameForDate` w plan-i18n — domyślna nazwa dnia tygodnia podąża za datą przełożenia (pn→śr pokazuje "Środa"), własna nazwa ("Push") zostaje; karta Planu, Dashboard, WorkoutDay, RescheduleSheet.**
- p3 cykle/historia: 15 (`getCycleById` przez sanitizer + invalid-doc), 16 (merge/delete cykli remapuje sesje z serwerowego zapytania po cycleId, nie z okna), 17 (aktywny cykl `endDate: ''` = otwarty zakres), 41 (kursor paginacji z surowego ogona snapshotu), 45 (eksport CSV cyklu `endDate || dziś`), 51 (safe parse w agregacji tygodni).
- p4 draft/sesja: 3 (silnik zwraca `skipped+missingDraft`, "Zakończ trening" nie jest no-opem po promocji), 4 (`loadDraftForDay(uid, dayId, date)`: draft per strona, szybki trening nie podmienia sesji planu), 13 (fallback localStorage niesie `exerciseMetrics/exerciseNames/pendingWriteId`), 20 (`redirectDraftSave` przenosi warmupChecked/sessionSwaps/lastActivityAt), 27 (auto-resume tylko gdy user był na ekranie treningu przy zejściu do tła), 38 (tombstone czytany ponownie w odroczonym closure zapisu), 52 (stan REST ze scope `dayId:date`).
- p5 sync/eksport: 5 (`sanitizeSet` kopiuje durationSec/distanceM/assistWeight/LWW; fixture `buildTypedSetsWorkout`), 24/26/50 (jeden wzorzec `ShareExportResult`: aborted = cisza, failed = destructive toast, sukces = toast), 25 (`writePendingTelemetry` w try/catch), 37 (retry syncu z wykładniczym backoffem min(2^n·30 s, 1 h)).
- p6 inputy/jednostki: 6 (dystans serii przez `DecimalInput`, przecinek nie daje 0), 18/19 (kalkulator talerzy: zmiana gryfa nie kasuje jednostki, własny gryf w jednostce inwentarza), 42 (baner wagi ze Zdrowia w jednostce usera).
- p7 subskrypcje (functions): 7 (grant comp nie kasuje stanu sklepowego: `storeSubscription` + `resolveEffectiveSubscription`), 21 (Garmin: datowany comp wygasa po expiresAt), 22 (BILLING_ISSUE honoruje grace period), 23 (webhook 503 zamiast 200 przy braku users/{uid} dla eventów z aktywnym stanem; RC ponawia), 47 (paywall: feedback przy zakupie bez entitlementu).
- p8 timery/notyfikacje: 8 (notyfikacja końca przerwy planowana dopiero przy `appStateChange(false)`, foreground = jeden gong), 11 (**strefa usera**: `TimeZoneSync` zapisuje `users/{uid}.timeZone`; functions `local-time.ts`; daily-reminder cron co godzinę UTC z filtrem lokalnej 07:00, weekly-digest nd/pn co godzinę z lokalnym poniedziałkiem 08:00; brak pola = Warszawa jak dotąd), 28 (grace window 3 s po ciepłym resume: bez replay gongu), 31 (timer celebracji przez `onDoneRef`, wzorzec B-T3), 53 (tap w notyfikację końca przerwy otwiera sesję: `addRestNotificationTapListener`).
- p9 import/UI: 14 (import planCycles przez `sanitizePlanCycleDoc`), 29 (swipe-back nie nawiguje nad otwartym dialogiem), 30 (licznik generacji w ShareWorkoutDialog), 43 (backfill w `runTransaction` z precondycją rewizji), 44 (import `training_plans.days` wyrównany do id dni cyklu), 49 (adres trenera case-insensitive), 54 (błąd zapisu własnego ćwiczenia = toast + telemetria).
- p10 pomiary: 40 (listener pomiarów emituje error + telemetria) + **WP-M edycja/usuwanie wpisu pomiaru**: `updateMeasurement/deleteMeasurement` (wspólny sanitizer, `recordedAt` edytowalny, `deleteField` dla wyczyszczonych pól, best-effort `deleteObject` starego zdjęcia), `EditMeasurementDialog` (data + godzina → `recordedAt` przez `measurement-time.ts`, 10 pól, zdjęcie keep/zmień/usuń, Usuń wpis za ConfirmDialog, zawsze zamontowany, zamykany tylko `open=false`), lista klikalna + "Pokaż wszystkie" (tier full), delty/sort po `date+recordedAt`; rules bez zmian (update/delete już dozwolone).
- p11 onboarding: **WP-O `users/{uid}.onboardingAnswers` v2** `{version, completedAt, name?, accentColor, level, objective, daysPerWeek, trainingDays, planSource: recommended|browsed|custom, templateId?, recommendedTemplateId?, durationWeeks, startDate, planName?}` zapisywane dot-path w `markOnboardingComplete` (mapa `onboarding` nie jest już zastępowana w całości); `trainingProfile` aktualizowany przy replanie (NewPlan); łańcuch mappera `AppUserProfile → UserProfile → mapAppUserProfile` przenosi `trainingProfile` i `onboardingAnswers` (lekcja builda 88); rules whitelist + walidacja (is map, hasOnly 14 pól, version int) + 4 przypadki w test:rules. **Rekomendacja planu**: `plan-recommendation.ts` `scoreTemplates` (wagi dni 100 / cel 150 / poziom 10: cel nie jest już ignorowany przy braku szablonu z dokładną liczbą dni; świadoma zmiana oczekiwań w `planTemplates.test.ts`), Browse plans posortowane wg dopasowania + badge "Polecany".
- p12 admin: 48 (CSV logu zgód dociąga wszystkie strony przez `startAfter`) + **WP-A `AdminOnboardingCard`** w `AdminUserDetail` (krok po kroku: imię+kolor, poziom, cel, dni, plan: źródło/szablon wybrany vs rekomendowany/długość/start; fallback dla kont sprzed zmiany z `trainingProfile`+`preferences.accentColor`; zero dodatkowych odczytów, 100% i18n, guard admin-i18n-scan).

**Bramki po merge:** vitest **2850/2850** (341 plików), functions **396/0**, test:rules **258/0** (JDK 21), typecheck web+functions czysty, lint 0 err (9 warningów sprzed fali), check:no-emoji OK, build web + build:mobile, dist-smoke, bundle-budget (wyniki w podsumowaniu sesji).

**Wydanie (2026-08-25 rano, za zgodą usera):** push main (c867de5f); **functions** deploy OK (59 funkcji, w tym nowe crony daily-reminder `0 * * * *` i weekly-digest `0 * * * 0,1` UTC); **firestore.rules** released (`timeZone`, `onboardingAnswers`; potwierdzone jawnym re-deployem "already up to date"); web LIVE `index-BOgk902c.js` na app.strengthsave.app (propagacja 30 s; smoke headless: #root wyrenderowany, zero pageerror; jedyny 403 = App Check reCAPTCHA w bocie, oczekiwane); iOS **118** upload + obie grupy + Beta App Review **APPROVED**; AAB **v33** SHA `533fcd8f` (`~/Desktop/strength-save-v33.aab`, jar verified). Telemetria `client_errors` na moment wydania: zero nowych wpisów (ostatni 2026-08-22, znany `body-compare-export-load` sprzed X29). **Następny iOS = 119, versionCode = 34.**

**Scenariusze ręczne na realnym iPhone (unit nie sięga):** (a) wycofanie zgody zdrowotnej w Ustawieniach na koncie testowym (NIE QA-bazowym): apka zostaje, banery blokady w Pomiarach/treningu, ponowne wyrażenie działa; (b) przerwa 90 s z włączonym ekranem = jeden gong, zero banera systemowego; zgaszenie ekranu w połowie = notyfikacja systemowa z dźwiękiem, powrót przed deadline = bez drugiego sygnału; powrót >3 s po deadline = pasek znika bez gongu; (c) zabić apkę w tle w trakcie przerwy, tapnąć notyfikację = otwiera sesję; (d) anulowanie sheetu Apple/Google = cichy powrót bez czerwonego Alertu; (e) edycja pomiaru z godziną i podmianą zdjęcia; (f) przełożenie pn→śr: karta w Planie i Dashboard pokazują "Środa"; (g) nowy onboarding na koncie jednorazowym → karta Onboarding w adminie.

**Lekcje:** (1) merge 12 równoległych pakietów: konflikty git są łatwe, groźne są **interakcje bez konfliktu** (dwa pakiety dopisują ten sam import; guard z liczbami wystąpień; test mockujący API, które inny pakiet zmienił) — po merge ZAWSZE pełny suite, nie tylko testy pakietów; (2) agent padnięty na limicie modelu zostawia commity + brudny worktree: wznowienie w TYM SAMYM worktree z listą "zrobione/w toku/zostaje" jest tańsze niż restart; (3) worktree bez `node_modules` (root i `functions/`) daje fałszywe błędy typecheck: symlinki do głównego repo + `.git/info/exclude`.

### 2026-08-24: FALA X29 — spójność przełożeń, eksport natywny, splash, trener, kolor z avatara, nav w sesji (iOS 117 / AAB v32)

**Zgłoszenia usera (transkrypcja głosowa + screeny z realnego konta, build 116) i root cause z rozpoznania (5 agentów Explore + telemetria produkcyjna):**

1. **Rozjazd po przełożeniu treningu (Dashboard "Środa 26 sie" vs nagłówek "Poniedziałek"; Plan z badge NASTĘPNY na starej dacie; martwa ikonka kalendarza).** Root cause: `buildTrainingSchedule` w zakładce Plan NIE przyjmował `scheduleOverrides` — timeline i badge jechały z gołej reguły weekday, gdy Dashboard używał kanonicznego resolvera z przełożeniami; do tego `RescheduleSheet` robił `return null` przy `open=true` dla dat nierozwiązywalnych (dead-click) i trzymał stale `frozenRef` między otwarciami. Fix (WP-A): `buildTrainingSchedule(plan, start, weeks, opts {overrides, planStartDateISO})` przez resolver per data (bez opts zachowanie identyczne — zasada 5); sheet zamontowany z komunikatem `reschedule.unavailable` zamiast null + reset frozenRef na open; ikona kalendarza gated `>= planStartDate`. Hero: role ODWRÓCONE — duży nagłówek = dzień tygodnia REALNEJ daty sesji, nazwa dnia planu w eyebrow (deduplikacja case-insensitive). Zweryfikowane wizualnie na screenach: karta przełożonego dnia pod "Wt., 25 SIE" z badge NASTĘPNY.
2. **Flash paska postępu 100%→0% po zakończonym cyklu.** Root cause: `TrainingPlan.tsx` bez gate `isLoaded` (Dashboard ma od Z172): pierwszy frame liczył stare ukończone treningi przy `remainingWorkouts=0` (ternary na `planStartDate=null`) = 100%. Fix (WP-B): gate `planIsLoaded`+`cyclesLoaded` z loaderem + obrona w głębi w `computePlanProgressPercent` (jawny null startu → 0).
3. **Powiadomienie "Raport tygodnia gotowy" lądowało w ogólnej analityce.** Root cause: deepLink `"/analytics"` = tab summary. Fix (WP-C): functions piszą `"/analytics?tab=weekly"` + NotificationBell wymusza ten cel dla `type==='week'` (legacy eventy w produkcji).
4. **Eksport porównania sylwetki wciąż martwy na iOS mimo hotfixu 116.** DOWÓD z telemetrii (client_errors 2026-08-22): `photo-load-failed getBlob=getBlob-timeout fetch=Load failed` — OBA kanały JS padają w warstwie sieciowej WKWebView (origin capacitor://). Fix systemowy (WP-E): kanał NATYWNY `CapacitorHttp.get` (URLSession, poza WKWebView) jako PIERWSZY na native (`src/lib/native-photo-fetch.ts`), getBlob/fetch fallbackami; działa też dla wpisów bez `photoPath`. Telemetria domknięta: `body-compare-export-generate` i `-share` (dotąd ślepe fazy). `Info.plist`: NOWY `NSPhotoLibraryAddUsageDescription` (bez niego "Zapisz obraz" z share sheeta = crash uprawnień) + zaktualizowany opis PhotoLibrary.
5. **Start apki w 3 kolorach (czarny→granat→czerń).** Root cause: storyboard #0E0E0E, plugin SplashScreen nadpisywał tło configiem #0a0a1a, po hide czarna szczelina `UIColor.systemBackground` (brak top-level `backgroundColor` w capacitor.config) + potencjalna klatka jasnego `:root` przed nałożeniem `dark` przez next-themes. Fix (WP-F): #0e0e0e we WSZYSTKICH warstwach (SplashScreen config, top-level backgroundColor, StatusBar Android, `class="dark"` w index.html), hide splasha po pierwszym commicie Reacta (useEffect w App zamiast po render()). BootLogo zweryfikowane = aktualny 3D hantel. Usunięty martwy `Splash.imageset` (31 MB, zero referencji); android `splash.png` ZOSTAJE (plugin ładuje drawable "splash" w runtime). Zweryfikowane na symulatorze: zimny start = jednolite tło + logo, zero granatu.
6. **Maskowanie emaila w Profilu (WP-G):** `maskEmail` (`g•••••••@g••••.com`), default zamaskowany, toggle Eye/EyeOff persist w localStorage `ss-email-visible`; ta sama maska w desktop sidebarze.
7. **Kolor akcentu z avatara (WP-H):** automat TYLKO gdy zero wyboru (brak `preferences.accentColor` i brak wpisu localStorage): pobranie avatara (native przez CapacitorHttp), downsample 24x24, dominanta ważona sat^2, sat<0.18=nic, mapowanie na najbliższy akcent (nigdy slate/gray), zapis do preferencji; preselekcja w onboardingu. Nigdy nie nadpisuje wyboru (potwierdzone na koncie usera na symulatorze — amber został).
8. **Trener z imieniem (WP-I):** koniec bezwarunkowego zapisu adresu po wysyłce; popup "Zapisać jako trenera?" z opcjonalnym imieniem tylko dla NOWEGO adresu; sekcja Trener w Profilu (zmień imię / usuń, email maskowany); mail z powitaniem "Cześć {imię},"; **jednostki wg `preferences.unit`** (dotąd zawsze kg — user na lbs dostawał raport w kg); ownership hardening: `getWorkout(workoutId, uid)` z checkiem w ADAPTERZE (IDOR nie występował, ale check był omijalne kruchy).
9. **Maile raportowe bez CTA (WP-J):** digest tygodniowy bez przycisku `strengthsave://open` i linku web (decyzja usera); welcome (nie-raportowy) z https zamiast martwego deep linku.
10. **Popup pomiarów po onboardingu (WP-K):** funkcja JUŻ istniała (welcome=1); audyt wyjść Paywall = zero dziur; dopisane testy sekwencji + pin. Nie pokazuje się tylko gdy konto ma już pomiar (zamierzone).
11. **Bottom nav widoczny ZAWSZE (WP-D, decyzja usera):** także w sesji (/workout) i szczegółach ćwiczenia; header w focused flow nadal ukryty; pasek startu/RestBar dokują nad navem (6rem), IntervalTimer nad RestBarem (9.75rem); e2e pilnuje geometrii bbox; stary test pinujący ukrywanie zaktualizowany do nowego kontraktu.
12. **Wspólny `shareOrDownloadFile` (WP-L):** dedup 3 kopii systemShare/download; **eksporty CSV/JSON działają na iOS przez share sheet** (dotąd martwy `<a download>`); merge z WP-E scalony opcją `onShareError` (telemetria dostaje surowy błąd).

**Proces:** 12 pakietów przez agentów w git worktree (3 fale + wznowienia po 2 błędach API), merge per pakiet; bramki: vitest **2592/2592**, functions **365/0**, typecheck, lint 0 err, build, dist-smoke, e2e **444 pass** (w tym zaktualizowany kontrakt nav). Weryfikacja WIZUALNA skryptem playwright 390x844: **12/12 PASS** (reschedule end-to-end na screenach, maska, popup pomiarów, weekly tab, bbox nav/pasków) + symulator iOS (splash, zimny start). Fixy przy okazji: mock firebase w `body-photo-compare.test` (padał na kolekcji już na baseline 116), allowlist `native-setup.ts` w strażniku hexów (StatusBar wymaga natywnego #0e0e0e).

**Wydanie:** functions deploy OK; web LIVE `index-Z8WkHsBD.js` (smoke na produkcji: 0 błędów JS); iOS **117** upload + obie grupy + **Beta App Review APPROVED**; AAB **v32** SHA `7e74bbc7` (kopia na Pulpicie: `strength-save-v32.aab`). RTK usunięty z systemu (hook+binarka; przepisywał komendy i psuł narzędzia).

**Otwarte:** upload AAB v32 do Play = krok właściciela; test eksportu before/after na REALNYM iPhone (symulatorowa weryfikacja interakcyjna niemożliwa — ekran Maca zablokowany w nocy; kanał natywny pokryty testami, fallbacki zostają); konto QA (brak credentiali w _secrets — do założenia); przegląd client_errors w 24 h (nowe kody `body-compare-export-generate/-share`); backlog sharingu w PLAN.md (karty PR, sticker przezroczysty, IG Stories — wymaga Facebook App ID i mini-pluginu); "onboarding kohortowy" do doprecyzowania z userem.

### 2026-08-21 (4): HOTFIX po buildzie 115 — eksport before/after + kafle Postępów (iOS 116 / AAB v31)

**Zgłoszenia usera z 115 (minuty po instalacji):** (1) "Pobierz / udostępnij" w porównaniu sylwetki: spinner ponad minutę, toast błędu dopiero po długim czasie; (2) kafle Postępów z medalionami webp wyglądały źle (czarne kwadraty, ucięte "BADGES AND...").

**Root cause eksportu (z dowodami w kodzie i SDK):** żaden krok przygotowania zdjęcia nie miał limitu czasu; na natywnym iOS `fetch(photoUrl)` z originu capacitor://localhost pada w warstwie sieciowej WKWebView (wisi do ~60 s; CORS serwera wykluczony — bucket zwraca `access-control-allow-origin: *`), a fallback `getBlob` traktował błąd sieciowy jako retryowalny i mielił go do `maxOperationRetryTime` = 2 min (stała SDK Storage). Kolejność kanałów była odwrotna do wiarygodności: kanał SDK (jedyny udowodniony na urządzeniu — tym samym wgrano zdjęcia) był fallbackiem.

**Fix:** na natywnej platformie `getBlob` (SDK) jako PIERWSZY kanał, fetch fallbackiem (web bez zmian); twardy timeout 8 s per krok (fetch/getBlob/downscale) → toast w kilkanaście sekund zamiast 2+ min; porażka logowana do `client_errors` kodem `body-compare-export-load` z krokiem i komunikatem (diagnoza z danych następnym razem). `share-utils.downscalePhoto` świadomie nietknięty (współdzielony; obie ścieżki dekodowania rejectują poprawnie). Testy: 4 czerwone przed fixem potwierdzały mechanizm.

**Kafle Postępów:** lokalny `SectionTile` (ikona lucide w akcencie na `bg-primary/10`) zamiast `GroupTile`+webp; Trophy/Medal/BarChart3/CalendarRange; etykieta `progress.tile.badges` skrócona do "Odznaki"/"Badges". `public/badges/` zostaje (hero sekcji poziomu 2 nadal używa).

**Wydanie:** web LIVE index-DOu_2XEt.js, iOS 116 Beta App Review APPROVED (obie grupy), AAB v31 SHA b8fbe9db. Bramki: vitest 2486/0, e2e 218/218, typecheck, lint 0 err. AAB v30 NIE wgrywać do Play — obowiązuje v31.

### 2026-08-21 (3): FALA X28 + HISTORIA v2 — feedback builda 114, pro-look, redesign Historii (iOS 115 / AAB v30)

**Bugi z realnego testu builda 114 (root cause z rozpoznania):**
1. "NEXT SESSION · AUG 24" przy starcie planu 7 września: guard startu w resolverze był OPT-IN (4. argument), Dashboard nie podawał go w 4 wywołaniach, a branch `completed` w todayTraining wygrywał z guardem pre-start (dzisiejszy ukończony trening ad-hoc omijał sprawdzenie). Fix: guard pre-start PRZED completed + startDateISO we wszystkich konsumentach (Dashboard, DayPlan, MissedWorkoutBanner, missed-workout, buildScheduleMove) + wewnętrzna spójność plan-schedule. Test X27 nie łapał, bo sprawdzał pre-start bez ukończonego dziś treningu — luka domknięta testem 1:1 ze zgłoszeniem.
2. "current week" na każdym tygodniu Planu: (a) link powrotu renderował się zawsze przy `planStarted=false` (actualCurrentWeek=0), (b) badge NASTĘPNY liczony z dat tylko wyświetlanego tygodnia. Fix: link tylko po starcie planu (+ "Start planu: {data}" przed startem), badge liczony globalnie z całego harmonogramu.

**Pakiety X28 (workflow 8 agentów, 2 batche; bramki końcowe po merge: vitest 2482/0, e2e 218/218, typecheck, lint 0 err):**
- WP-A: kompaktowy CreateCustomExerciseDialog (Selecty zamiast poziomych chipów, bez listy biblioteki, keyboard-aware wysokość — usunięte nadpisanie max-h-[88vh], które wypychało górę dialogu poza ekran); w pickerze przycisk "Dodaj własne" nad listą.
- WP-B: fix daty startu (wyżej) + zamykany baner "Workout completed" (X, dismiss per data w localStorage, wraca następnego dnia).
- WP-C: fixy Planu (wyżej) + wyróżnienie "Dziś" w liście dni.
- WP-D: Postępy kafelkowo — poziom 1: staty + Life PRs + heatmapa + 4 kafle (Rekordy / Odznaki i sezony / Analityka / Tygodnie, medaliony webp), sekcje pod ?section=; wykresy jako kafle-menu z deep-linkiem ?chart= (jeden na raz); weekly w zwartym stylu listy.
- WP-E: eksport before/after — BodyCompareShareDialog: 3 szablony (classic/accent/photo), formaty 1:1 i 9:16, logo, daty, wagi, delta, kolor akcentu usera; zdjęcia Storage przez fetch→downscale do dataURL (zero tainted canvas), fallback getBlob SDK; wspólny escapeHtml w lib/share-html.
- WP-F: integracja pro-look — ilustracje pustych stanów (Historia/Pomiary/brak planu/Strava), hero 25 szablonów planów w wizardzie (test kompletności per id), hero paywalla, kafel grupy "Własne"; +~1,8 MB webp w public/.
- WP-H (osobny agent w git worktree, merge po workflow): **Historia v2 "tiles"** wg designu 2a/2b/2c — poziom 1: kafle cykli ze sparkline tonażu + PERIOD + jeden Export; poziom 2 (?cycle=): staty w nagłówku, chipsy, sesje po tygodniach; pełna lista ?list=all (wyszukiwarka, paginacja); Export sheet (zakres × PDF/CSV/do trenera); Porównaj w menu ⋯. Wszystkie niezmienniki przeniesione z mapowaniem (E-8UE4S, komplet akcji wiersza, każda sesja osiągalna). Merge: konflikty canonical-states (unia) i WorkoutHistory (strona WP-H + graft ilustracji empty state z WP-F).

**Wydanie:** web LIVE index-BGInrQ0j.js (+ assety pro-look 200 OK), iOS 115 upload + obie grupy + Beta App Review APPROVED, AAB v30 (SHA 38586726, 19,2 MB — wzrost przez grafiki). Functions/rules bez zmian w tej fali (deploy z X27 aktualny).

**Otwarte:** Play upload v30 = krok właściciela; konto QA nadal czeka na rozszerzenie Chrome; skrzynka contact@strengthsave.app; testy urządzeniowe wg deviceTestNotes pakietów (m.in. Selecty Radix w WKWebView, fetch zdjęć Storage przy eksporcie, PERIOD/kalendarz, glass na light theme).

### 2026-08-21 (2): FALA X27 — hotfix Historii, 8 pakietów funkcyjnych, hardening procesu, wydanie (iOS 114 / AAB v29)

**Root cause hotfixu (P0, E-8UE4S):** redesign Historii (c753cdba, build 113) formatował `cycle.endDate` bez guarda, a aktywny cykl ma w produkcji `endDate: ''` do archiwizacji; `parseLocalDate('')` = RangeError = cały route na ErrorBoundary. Testy CI zielone, bo fixture miał nierealny wypełniony endDate; sędziowie wizualni oceniali te same złe mocki. Fix e4b6afc0 (label "teraz" + test na produkcyjnym kształcie danych).

**Pakiety (workflow 12 agentów, 3 batche + WP-G; bramki: vitest 2288/0, functions 350/0, rules 250/250, e2e zielone):**
1. WP-A: blokada reschedule ukończonych treningów (guard w silniku + sheet + wejścia Dashboardu), kompaktowy jednowierszowy baner ukończenia z odstępem, data przy NEXT SESSION gdy dalej niż jutro.
2. WP-B: adres contact@strengthsave.app (4 miejsca), copy nieodwracalności w dialogu usunięcia konta, purge rozszerzony o 6 kolekcji (plan_cycle_operations, user_events, client_errors, exercise_notes, workout_day_notes, manual_activities) + recursiveDelete users/{uid} (subkolekcja aggregates).
3. WP-C: ręczny sync Strava raz na dobę (24h server-side + stan przycisku), predykaty isRunLike/isWalkLike, pace/PR-y/longest run tylko z biegów, filtr typów aktywności, digest ujednolicony.
4. WP-D: zdjęcia sylwetki dla wszystkich (flaga default ON), wpis tylko-zdjęcie, kadrowanie (react-easy-crop, PhotoCropDialog), przycisk "Dodaj zdjęcie", photoReminder (push+dzwonek po 30 dniach treningu bez zdjęcia, codziennie 10:00).
5. WP-E: redesign /exercises: kafle 8 grup ze zdjęciami + widok grupy (?group=, hero, filtry compound/isolation/bodyweight), search globalny, wiersz nowego własnego ćwiczenia; BEST/PR w wierszach pominięte (brak taniego agregatu, świadomie).
6. WP-PLANS-1: pole status active/ended na training_plans (rules+guards), endPlan z 3 opcjami (zakończ+wybierz / zakończ / anuluj), auto-koniec po upływie tygodni, stan "brak planu" w całej apce, długość 2-36 tyg. + custom (też szablony), szablon "Full Body Workout (FBW)".
7. WP-PLANS-2: krok 5 onboardingu z nazwą planu + datą startu (poniedziałki) + tygodniami; replan z datą startu; guard resolvera na daty przed startem + mirror Garmin (bug: sesje przed wybranym startem); closeout z czasem na siłowni + udostępnianie (CycleShareCard).
8. WP-F: X w każdym AlertDialogu (Radix Cancel 44px, opt-out hideClose), liquid glass 2.0 (kinetic-glass header+nav, kinetic-glass-sheet dla bottom sheetów, wariant light), zwijany kalkulator talerzy w Ustawieniach, sweep ~145 pauz em/en-dash + guard.
9. WP-IMG: 8 zdjęć grup dark-gym-v1 (GPT Image 2 via Higgsfield po wyczerpaniu kredytów OpenAI; 1568x608 webp, 484 KB) + manifest.

**Hardening procesu (zasada 11 w CLAUDE.md, po incydencie E-8UE4S):** kanoniczne stany danych (roundtrip przez sanitizery), route sweep 9 tras x 6 stanów (sanity: cofnięty fix = czerwony sweep z tym samym kodem błędu), parseLocalDateSafe w ~50 etykietach + guard plikowy, dailyErrorDigest 06:20 (nowy kod w client_errors → mail operatora), konto QA na produkcji jako bramka wydania (procedura docs/plans/x27/QA-KONTO.md).

**Wydanie:** rules + functions deployed PRZED webem (pola status/name, guard Garmina — bez tego PERMISSION_DENIED i zegarek z sesjami sprzed startu), web LIVE index-B-rd2KNm.js (+ zdjęcia grup), iOS 114 upload + obie grupy + Beta App Review APPROVED, AAB v29 (SHA 5444ee04). E2e: 2 nieaktualne specy naprawione (NBSP w meta karty; kafle grup zamiast chipów).

**Otwarte:** skrzynka contact@strengthsave.app do założenia; konto QA do założenia po podłączeniu rozszerzenia Chrome; pierwszy bieg dailyErrorDigest wyśle zbiorczy backlog; assety "pro look" w media-staging/pro-look/ (integracja = następny drop, web + iOS 115); kredyty OpenAI (OPENAI_API_KEY_IMAGE) wyczerpane; Play upload v29 = krok właściciela.

### 2026-08-21: MEGA-WYDANIE — authDomain, fala naprawcza T1-T24, redesign "single accent" (iOS 113 / AAB v28)

**Co (3 strumienie jednej sesji):**
1. **authDomain przełączony** na `auth.strengthsave.app` (cert + redirect URI Google potwierdzone monitorem, domena była w authorized domains; secrets env zmienione, web wdrożony; właściciel potwierdził działanie logowania).
2. **Fala naprawcza T1-T24** (feedback pierwszego realnego użytkownika, `docs/FEEDBACK-UZYTKOWNIK-2026-08-20.md`): 11 obszarów wdrożonych przez workflow agentów (plany per obszar w `docs/plany-feedback-2026-08-20/`, wyniki w `WYNIKI-FALA1.md`). Skróty: onboarding (dni treningowe + notatka, chipy dat z dniem tygodnia, popup pomiarów po starcie), dashboard (karta pre-startu cyklu, tokeny akcentu, strażnik limonki, rozdzielenie success od akcentu), Strava (karta cardio tygodnia przed startem planu, mapowanie typów Walk/Run, redirect po połączeniu + sync ręczny tylko w Ustawieniach + rate-limit serwerowy, fix średniego tempa), Plan (fix procentu postępu z treningów, treningi na górze, notatki do przyszłego dnia + rules, design nagłówka), Analytics (fix overflow przycisków, CSV przez ExportWorkoutsDialog), pomiary (zdjęcia before/after: Storage+rules+kompresja+porównanie, admin toggle `bodyPhotos` pod Stravą), daty i18n (LocalizedDateInput + dateLocale + strażnik skanujący), kalendarz zakresów booking-style (RangeCalendar/DateRangeField w urlopie/eksporcie/historii), admin (treść maili w email_log + podgląd po kliknięciu + wszystkie typy maili + karta maili usera + filtry + spójność), powiadomienia (ogłoszenia push mirror do dzwonka + przełącznik w adminie), sweep UX (5 drobnych). Pominięte świadomie: T19 (mail pojedynczego treningu — decyzja właściciela), T23-6 (dedup tytułów — czeka na OK), etykieta totalDistance i mapowanie kalorii Strava (do osobnej decyzji).
3. **Redesign "single accent"** wg projektu Claude Design właściciela (`docs/design-2026-08-20/`, źródła artboardów w `dc/`): fundament tokenów (zakaz color-mix — iOS 15 WKWebView; tinty `hsl(var(--primary)/0.1x)`; 5 klas pomocniczych; strażnik design-token-guard), 6 ekranów (Dashboard, Plan, Historia z cyklami jako poziomem nadrzędnym, Profil 1a, Sesja treningowa z ustawieniami timera pod tapem w pasek REST, Summary z BACK TO DASHBOARD h-14 = FINISH), pętla 3 rund sędziów (struktura/jeden akcent/funkcje; 7→4→4 zgłoszeń, wszystkie naprawione) + sędzia kontrolny: werdykt GOTOWE (pomiary pikselowe kontrastu, zero limonki na obcych akcentach, indigo z jasnym tekstem). Inwentarze funkcji (44+34+62+33+37+40 pozycji) odhaczone — nic nie zniknęło.

**Artefakty:** web LIVE `index-Crtcx1EU.js` (app.strengthsave.app); backend fali 1 wdrożony (57 functions, firestore rules+indexes, storage rules; fala 2 bez zmian backendu); iOS 1.0.0(113) upload SUCCEEDED, VALID, whatsNew 200, grupa zewnętrzna 204, Beta App Review zgłoszony; AAB versionCode 28 `jar verified` SHA-256 `70d4a9a6a3f8c11d930ead90a8d7cf5cbf172d77f42b316fa2af9e98560d22d0`.

**Bramki:** vitest 2087/2087 (268→279 plików w trakcie), rules 244/244, functions 327, e2e chromium 36/36, typecheck/lint/build/dist-smoke/bundle-budget/no-emoji zielone.

**Czeka na właściciela:** (1) test TestFlight 113 na urządzeniu, w tym scenariusze background/resume i sekwencja przerwania — agenci nie mają urządzenia; (2) upload AAB v28 do Play Console; (3) akceptacja nowej zieleni success `#22c55e` (T24b, wdrożona wg planu bez potwierdzenia wizualnego właściciela); (4) test "Kontynuuj z Apple" na webie po zmianie authDomain (return URL Services ID); (5) decyzje odłożone: T23-6, etykieta totalDistance, kalorie Strava.

**Root cause bugów z feedbacku (najciekawsze):** procent planu liczony z numeru tygodnia zamiast ukończonych treningów; spacery jako biegi przez zbyt wąskie mapowanie typów Strava; daty PL w EN przez `toLocaleDateString` bez `dateLocale(lang)`; mieszanie kolorów przez hardcode limonki i użycie `fitness-success` w roli akcentu.

### 2026-08-21: Fala 2, runda naprawcza r2 (werdykty 3 sędziów rundy 2)

**Co (4 majory + 8 minorów, commit per naprawa):**
1. **Aktywna seria (MAJOR):** obrys akcentowy przenosi się z CAŁEGO wiersza
   (`ring-2 ring-primary`) na INPUTY KG/POWT. (`.accent-ring`, 1.5px inset,
   obie ścieżki renderu + duration/dystans/asysta); wiersz tylko tint
   `bg-primary/[0.08]` — zgodnie z mockupem exercise-card-full i tokens.md §2.4.
   Test `exercise-card-layout` zaktualizowany pod nowy kontrakt.
2. **Historia, header (MAJOR):** kafle lupy i filtrów wracają do RZĘDU headera
   (artboard 1a: avatar + HISTORIA + lupa + filtr) przez NOWY slot
   `HeaderActions` (context + portal; provider w Layout, outlet w AppHeader;
   poza Layoutem dzieci renderują się inline — unit testy stron bez zmian).
   Pusty pas ~100px pod headerem usunięty.
3. **Konfetti (MAJOR, jeden akcent):** hardkodowany cyjan `#00e3fd` usunięty
   z palety ConfettiBurst — celebracje sypią wyłącznie odcieniami akcentu + bielą.
4. **Historia, meta wiersza (MAJOR, funkcje):** liczba ćwiczeń wraca do linii
   meta ("{ćw} ćw. · {serie} serii · {czas}", klucz `history.exercisesUnit`),
   zgodnie z inwentarzem history-tab poz. 19/22.
5. **Cyjan cardio przez token (minor):** HybridWeekStrip `bg-fitness-cyan/85`
   i HybridLoadCard `fill="hsl(var(--fitness-cyan))"` zamiast dwóch różnych
   `#00e3fd`; wpis HybridWeekStrip usunięty z allowlisty design-token-guard
   (strażnik znów domyka arbitrary hex).
6. **Headery pod-tabów (minor):** dzwonek + licznik treningów TYLKO na
   Dashboardzie (artboardy pod-tabów mają akcje kontekstowe); wejście w
   statystyki nie znika (pigułka na Dashboardzie + kafel "Twoje liczby");
   konsumpcja celebracji "+1" tylko na Dashboardzie (nie przepada po cichu).
7. **Avatar-inicjał (minor):** `bg-primary/20 text-primary` we wszystkich
   headerach (wariant z Profilu; było neutralne surface-highest).
8. **Powitanie (minor):** bez `italic` (SG nie ma kroju, tokens.md ryzyko 4);
   "!" w spanie imienia (gap-2 flexa robił szczelinę "E2E !").
9. **CTA hero Dashboardu (minor):** "Rozpocznij trening"/"Otwórz sesję"
   w `.kinetic-primary-button` h-14 — jeden język z FINISH WORKOUT i BACK TO
   DASHBOARD (rozstrzygnięcie konfliktu planów na rzecz tokens.md §2.8).
10. **Miniatura ćwiczenia (minor):** `rounded-lg` (12px) zamiast `rounded-xl`
    (24px w skali override), które przy 46px robiło koło zamiast kwadratu.
11. **Nagłówek kolumny SET (minor):** PL `card.colSet` = "Ser." (kolumna 26px);
    aria-labels pól zostają "Set 1, kg" przez NOWY klucz `card.setAria`
    (kontrakt kilkudziesięciu asercji e2e); asercje nagłówka w unit + 2 e2e
    zaktualizowane w tym samym commicie.
12. **Focus w rozwinięciu Historii (minor):** focus sesji powtórzony jako
    eyebrow w panelu rozwinięcia (plan §6.7: przy uciętym tytule na 390px
    informacja była nieosiągalna).

**Świadomie pominięte (do decyzji właściciela):** chronologia listy dni Planu
(porządek "najbliższy pierwszy" to decyzja T9 z testem plan-timeline-order —
konflikt z mockupem wymaga rozstrzygnięcia, nie cichej zmiany); przeniesienie
ikon przełóż/pomiń karty NASTĘPNY do menu ⋯ (łamie kontrakty e2e
reschedule-flow + testy reschedule-ui/plan-tab-order — nie jest tanie);
kolizja sky vs cyjan cardio (złagodzona tokenem --fitness-cyan, głębsza zmiana
= decyzja designowa); limonkowy tint --foreground (jawnie odroczony, tokens.md
ryzyko 5).

**Weryfikacja:** test 2086/2086 (po naprawie błędu składni JSX w AppHeader,
którego vitest nie łapał — typecheck tak), typecheck, lint (0 błędów, 2 zastane
warningi admina), strażniki zielone; pętla wizualna 2 iteracje
(fix-r2-iter1 → finalny `screens/fix-r2`: 4 trasy × 4 akcenty; home--lime
w iter1 złapał splash — flake harnessa, w finalnym przebiegu czysty).

### 2026-08-21: Fala 2, runda naprawcza r1 (werdykty 3 sędziów: struktura, jeden akcent, funkcje)

**Co (7 napraw critical/major + 5 minorów, commit per naprawa):**
1. **Kontrast ciemnych akcentów (CRITICAL, systemowe):** `applyAccent` dla
   akcentów o luminancji < 0.28 (indigo, slate, ciemny custom) ustawia
   `--primary-light` PRZYCIEMNIONY (gradient forged CTA: primary → -8 p.p.;
   biały tekst na lewym krańcu miał 1.5-2.2:1) oraz NOWY token `--primary-text`
   (jasność podbijana pętlą aż do >= 4.5:1 na tincie bg-primary/15 nad
   surface-low). Tailwind: utilities `text-primary` czytają `--primary-text`
   (fallback `var(--primary)` w index.css — jasne akcenty piksel w piksel bez
   zmian); `bg/border/ring-primary` i `text-primary-foreground` nietknięte.
   Pomiar po fixie (indigo, piksele zrzutu): CTA 4.55:1 na obu krańcach,
   Zdecyduj 4.75:1, chip serii 5.25:1, eyebrow 5.11:1 (przed: 1.5-4.4:1).
2. **Dashboard: hero NASTĘPNA SESJA w stanach rest/completed (MAJOR):**
   `todayTraining` niesie pełny wpis następnej sesji (day+dateKey);
   `renderNextSessionHero` = eyebrow akcentowy z dniem tygodnia + tytuł + meta
   + CTA "Otwórz sesję" (podgląd `/workout/:id?date=`) + tekstowe "Przełóż
   trening" (guard draftu bez zmian). Rest: hero NAD kartą regeneracji;
   completed: hero POD kartą ukończenia. Nowe klucze `dash.hero.next/openSession`.
3. **Headery pod-tabów (2x MAJOR):** AppHeader 15.5px/ls .14em nowrap+truncate;
   etykiety zakładek skrócone (`layout.title.plan/history` = "Plan"/"Historia");
   sufiks "ŁĄCZNIE" pigułki licznika tylko na Dashboardzie (kompaktowa pigułka
   liczba+ikona zostaje wszędzie — wejście w statystyki nie znika). Historia:
   page-h1 usunięty (tytuł raz, w headerze), italic zdjęty też z grup miesięcy
   (SG nie ma italica; italic zostaje tylko w powitaniu Dashboardu). e2e
   critical/full-app zaktualizowane w tych samych commitach.
4. **Karta ćwiczenia (MAJOR + minor):** placeholder zakresu POWT.
   `placeholder:text-[13px]` + `appearance: textfield` i ukryte webkit spin
   buttony w `.exercise-card-input` (spinner Chromium rezerwował prawą krawędź
   i klipował "6-8" → "6-"; iOS WebView spinnerów nie rysuje). POPRZ. bez
   historii = "—" per komórka, komunikat "pierwszy raz" RAZ nad tabelą (tylko
   przy pełnym braku historii).
5. **Plan, rząd akcji dnia (MAJOR):** etykieta dnia wraca ZAWSZE (rzędy
   "Cardio/Edytuj" pływały bez właściciela), kolor /70 zamiast /40, przyciski
   min-h-11 (44px).
6. **Plan, karta NASTĘPNY (minory):** play WEWNĄTRZ badge (samodzielny glif
   afordował nieistniejącą akcję), tor paska obciążenia zawsze (wspólna
   anatomia kart dnia).
7. **Historia, sparkline (minor):** słupki rounded-[2px] jak artboard
   (rounded-sm = 8px przez override skali robił pastylki).

**Świadomie pominięte (minory, do decyzji właściciela):** kolizja sky vs cyjan
cardio na wykresie obciążenia (sędzia dopuszcza akceptację jak dla akcentu
gray); chłodny tint `--ec-set-number` numerów nieaktywnych serii (zamrożony
kontrakt --ec-* z tokens.md §17 — kolejne audyty nie powinny zgłaszać).

**Weryfikacja:** test 2086/2086, typecheck, lint (0 błędów; 2 zastane warningi
admina), strażniki limonki + design-token-guard zielone; pętla wizualna
3 iteracje (fix-r1-iter1, fix-r1-iter2 + zrzuty stanu REST z własnym seedem
planu bez dzisiejszego dnia, finalny katalog `screens/fix-r1`: 5 tras × 4
akcenty + home-rest lime/indigo). Skan pikselowy: zero limonki na obcych
akcentach (trafienia heurystyki = złoto rozgrzewki --ec-warmup-gold i swatch
limonki w pickerze akcentów Profilu — legalne).

### 2026-08-20: Redesign podsumowania treningu (fala 2, artboard workout-summary 1a)

**Co:** Nowa prezentacja COMPLETED VIEW (WorkoutDay + WorkoutCompletionSequence
stage done) wg mockupu 1a, wyłącznie na tokenach akcentu/surface (zero nowych
hexów, zero color-mix, strażniki zielone bez zmian allowlist):
- header: wstecz 40px surface-container + tytuł font-heading z datą w subtitle
  (focus · d MMM) + Edytuj w pigułce chip-mono (warunek isFinalSyncPending bez zmian),
- hero karta surface-container: OGROMNY tonaż w akcencie (split fmtTonnage po
  pierwszej spacji: wartość + jednostka; lbs = "k lbs"), badge delty + label
  "vs {data}" (NOWE pole prevDate w CompletionSummary), DWA paski porównania
  Dziś/poprzednia (tor surface-highest, wypełnienia bg-primary / bg-outline-variant),
  rząd statów CZAS · SERIE done/planned · % planu + pigułka Popraw serie
  (handler i warunek bez zmian; flex-wrap dla długich labeli PL na 390px),
- sekcja Nowe rekordy ({n}): eyebrow w akcencie + kafle accent-wash grid 2 kolumny
  (wartość text-primary, est1RM z podpisem estymacji, delta z formatPRDelta),
- NOWA sekcja "Gdzie poszedł tonaż": NOWY lib volume-split.ts (kategoria:
  biblioteka → własne ćwiczenia → fallback primaryMuscle→kategoria; nierozpoznane
  i <5% i ponad limit 5 → "Inne"; zero zmyślonych grup) + komponent
  WorkoutVolumeSplit (odcienie JEDNEGO akcentu /75 /55 /35 /20, "Inne" neutralne,
  STATYCZNA lista klas pod purge; render tylko przy >=2 kubełkach),
- lista ćwiczeń jako ranking tonażu: płaskie wiersze, licznik done/total
  (niepełne = text-fitness-warning), pasek rankingowy względem maksa (max =
  bg-primary + wartość w akcencie), kolumna tonażu mono, expand/serie bez zmian,
- rząd Udostępnij + Wyślij do trenera h-12 na surface-container; CTA WRÓC DO
  DASHBOARDU = kinetic-primary-button h-14 z ikoną Home (TA SAMA wielkość co
  FINISH WORKOUT — wymóg właściciela); Usuń pod CTA bez zmian (testidy nietknięte).

**Pominięte świadomie:** SESSION SHAPE z mockupu — SetData nie ma recordedAt
(updatedAt to LWW), rysowanie kształtu sesji = zmyślone dane; backlog: zapisywać
recordedAt przy odhaczeniu serii. Weekday jako tytuł odrzucony (dayName apki to
realna tożsamość dnia).

**Niezmienniki (nietknięte):** stage machine celebration/rating (wejście z
Historii bez celebracji), WorkoutDraftStatusNotice, Share/Email dialogi i payloady,
delete przez deleteWorkoutEverywhere, EDIT MODE, jednostki kg/lbs, testidy
workout-email / workout-delete / workout-delete-dialog / workout-delete-confirm.
Znana cecha (przedistniejąca): "poprzednia sesja" = najnowsza INNA sesja dayId,
więc stare sesje oglądane z Historii porównują się z nowszymi (delta liczona tak
samo przed redesignem; teraz widać datę).
Inwentarz 33 funkcji z plan/summary.md odhaczony (wszystkie dostępne).

**Weryfikacja:** vitest 279 plików / 2080 zielone (nowe: volume-split, prevDate,
paski porównania; zaktualizowany workout-completion-sequence pod staty 10/12 + %),
typecheck, lint, build; e2e celowane: NOWY workout-summary-actions (niezmiennik:
komplet akcji naraz + hero z paskami), session-prs-remount, email-coach-button,
workout-delete-from-day, batch-save — zielone (chromium). Pętla wizualna:
2 iteracje x 4 akcenty (lime/amber/sky/indigo) + zrzut degradacji (pierwsza
sesja dnia bez pasków/PR/splitu), zrzuty w docs/design-2026-08-20/screens/
summary-iter1..2 (finalne iter2); poprawki z pętli: flex-wrap rzędu statów,
pigułka Popraw serie ml-auto. Indigo: jasny tekst na CTA (applyAccent per
luminancja) potwierdzony na zrzucie.

### 2026-08-20: Redesign ekranu sesji treningowej (fala 2, artboard exercise-card 2a)

**Co:** Nowa prezentacja aktywnego treningu (WorkoutDay + ExerciseCard + RestBar)
wg mockupu 2a (quick-workout-compact / exercise-card-full), wyłącznie na tokenach
akcentu/surface (zero nowych hexów, zero color-mix, strażniki zielone):
- header: wstecz 40px + tytuł font-heading + pigułka Saved (AutoSaveIndicator
  przeniesiony z fixed top-4 right-4 do headera; pełny stan z godziną w title),
- pasek statystyk CZAS/TONAŻ/SERIE: karta surface-container, etykiety mono,
  wartości font-heading, czas w akcencie (testid session-stats bez zmian),
- karta ćwiczenia: miniatura 46px z play, nazwa font-heading, JEDNA mono meta
  linia (serie · szac. 1RM ze źródłem (B-T2) · max), TARGET BOX bg-primary/10
  z kaskadą celu (RZA > cel tygodnia > cel z trendu > progresja; etykieta deload/
  pain w kolorze semantycznym) zamiast rzędu badge, licznik done x/y w ostatniej
  kolumnie nagłówka tabeli, checkmarki jako ciemne kafle (done = bg-primary
  text-primary-foreground), ADD SET/chipy na surface-low,
- STICKY pasek REST na dole ekranu (render w WorkoutDay, nie w karcie): REST ·
  czas · progress · expand · SKIP; -15/+15 w widoku pełnoekranowym; **tap w korpus
  paska otwiera WorkoutSettingsSheet** (długość przerwy, dźwięk, auto-start —
  wymóg właściciela; testid rest-bar-settings na tap-obszarze),
- FINISH WORKOUT w PRZEPŁYWIE po notatce treningu (h-14 kinetic, jak BACK TO
  DASHBOARD w podsumowaniu), potwierdzenie inline w miejscu; koniec fixed baru.

**Dlaczego:** Fala 2 redesignu (BRIEF-REDESIGN.md #3) + wymóg właściciela:
ustawienia timera dostępne z paska przerwy w trakcie sesji.

**Niezmienniki (nietknięte):** draft autosave/checkpointy, workout-sync-engine,
useRestTimerController (deadline+persist localStorage), notyfikacja lokalna końca
przerwy (schedule/cancel przenosi się w całości z RestBar), watch sync, PR
celebration, autostart, scroll restore, gridCols tabeli serii (Z196), złoto
rozgrzewki, guard pustego treningu. Sheet ustawień renderowany NIEZALEŻNIE od
restState (lekcja Radix b.92 — koniec przerwy nie unmountuje otwartego sheeta).
Inwentarz 62 funkcji z plan/session.md odhaczony (wszystkie dostępne).

**Weryfikacja:** vitest 278 plików / 2069 zielone (nowe: workout-day-redesign
+ zaktualizowane rest-bar / rest-timer-controller pod sticky właściciela);
typecheck, lint (0 błędów), build + e2e celowane: exercise-card-v3 (z nowym
testem tapu w korpus), full-app, critical, edge-cases, ui-improvements,
resume-after-kill, continue-workout, warmup-persistence, workout-delete-from-day,
batch-save, plan-edit-during-workout, session-prs-remount — wszystkie zielone.
Pętla wizualna: 3 iteracje, 4 akcenty (lime/amber/sky/indigo), zrzuty w
docs/design-2026-08-20/screens/session-iter1..3 (finalne iter3); poprawki z
pętli: ciemne kafle checkmarków, bez "Następne: × 0" przy pustej serii.
Czeka na usera: scenariusz urządzeniowy background/resume (przerwa → zgaszony
ekran → notyfikacja) + tap w pasek przy biegnącej przerwie (nowa długość od
NASTĘPNEJ przerwy).

### 2026-08-20: Redesign zakładki Profil (fala 2, artboard profile-tab 1a)

**Co:** Nowa prezentacja Profilu wg mockupu 1a ("identity, potem kontrolki
mid-session, potem zwarte grupy"), wyłącznie na tokenach akcentu/surface
(zero nowych hexów, zero color-mix, strażniki zielone bez zmian allowlist):
- identity poziomo: avatar 64px (fallback bg-primary/20) z plakietką "+"
  (upload jak dotąd), imię klikalne (testid profile-name-edit, ten sam dialog),
  email, chipy PRO (restyle: bg-primary/15 text-primary, reguła #8) + poziom,
  mono licznik "{n} treningów · {m} do: {poziom}" (nowe pole tier.remaining,
  zmiana addytywna w computeTier), pasek poziomu pełnej szerokości,
- kafle TWOJA DUMA (4, zawsze — zera są prawdziwe): Treningi/Seria/Tonaż/Serie
  z agregatu all-time + fallback okna recent (dzisiejsza semantyka
  completedCount); streak z dat agregatu przez NOWY helper streakDetailsFromDates
  (syntetyczna seria robocza spełnia kontrakt hasCompletedWorkingSet); kafel
  "PRs" z mockupu POMINIĘTY (brak all-time PR w agregacie — okno kłamałoby);
  rząd 3 odznak bez zmian (przy zdobytych),
- karta TRENING (surface-container): Timer przerwy + select przerwy w jednym
  wierszu, Dźwięk (Z177: zawsze widoczny), segment KG/LB (aktywny bg-primary
  text-primary-foreground), Nie na 100%? i Urlop / wyjazd (dialogi bez zmian),
- karta KOLOR: grid 12 swatchy (paleta 11 + custom, 6/rząd, rounded-lg) + hex
  input/Zastosuj; wszystkie testidy e2e zachowane (accent-swatches, accent-{id},
  accent-custom(-input), accent-hex-input/apply),
- grupy zwartych wierszy (surface-low, SettingRow z addytywnym prop compact +
  valueAccent; domyślny wygląd dla WorkoutSettingsSheet BEZ zmian): Subskrypcja,
  POŁĄCZENIA (nowa grupa: Strava ze statusem z profile.stravaConnected — zero
  nowych odczytów; Garmin/Apple Health TYLKO natywnie, żeby web nie prowadził
  w pustkę; deep-linki do nowych kotwic ?section=strava / ?section=connections
  w Ustawieniach), Twoje dane (Historia/Pomiary/Postępy/PR backfill/NOWY skrót
  Kopia i import→?section=data/Prywatność/Zaawansowane/Admin), Aplikacja
  (Powiadomienia ze stanem, Język), Konto i pomoc (Imię i avatar/Zmień hasło/
  Centrum pomocy/Kontakt/O aplikacji z wersją),
- stopka: neutralny Wyloguj wg mockupu (dialog Z237 + testid logout-confirm bez
  zmian), Usuń konto tekstowo, wersja "STRENGTH SAVE {version}".

**Dlaczego:** artboard 1a zatwierdzony przez właściciela; żelazna zasada fali 2:
żadna funkcja nie znika (inwentarz 40 pozycji w planie = kontrakt, pilnowany
testem niezmiennika w profile-sections.test.tsx). Chip EDIT z mockupu pominięty
(header globalny; edycja przez tap w imię + wiersz Imię i avatar + plakietkę).

**Niezmienniki (testy):** wszystkie 40 pozycji inwentarza obecne po redesignie;
etykiety e2e exact (Historia, Pomiary ciała, Postępy, Ustawienia zaawansowane,
Admin) i testidy bez zmian — e2e accent-color + mobile-nav-reachability
przechodzą BEZ aktualizacji speców; zmiana akcentu nadal ustawia tokeny +
mirror Firestore; kafle wyłącznie z realnych danych.

**Weryfikacja:** npm run test (2060/2060), typecheck, lint (0 błędów), build;
e2e celowane accent-color + mobile-nav-reachability (18/18, świeży serwer);
pętla wizualna design-screenshots (viewport 390, akcenty lime/amber/sky/indigo,
2 iteracje) — zrzuty w docs/design-2026-08-20/screens/profile-iter2 (final);
na indigo jasny foreground na akcencie (KG, plakietka), zero limonki na
amber/sky/indigo, brak horizontal scrolla.

**Znane obserwacje poza zakresem:** Dashboard liczy streak z dat agregatu
mapując je na sesje z exercises: [] — hasCompletedWorkingSet je odfiltrowuje,
więc ścieżka agregatu daje tam streak 0 (chip się chowa); Profil używa
poprawnego streakDetailsFromDates. Kandydat na osobny fix w Dashboardzie
(jednolinijkowa podmiana na ten sam helper).

### 2026-08-20: Redesign zakładki Historia (fala 2, artboard history-tab 1a)

**Co:** Nowa prezentacja Historii wg mockupu 1a ("cykle jako poziom nadrzędny"),
wyłącznie na tokenach akcentu/surface (zero nowych hexów, zero color-mix,
strażniki limonki i design-token-guard zielone bez zmian allowlist):
- wiersz tytułowy: h1 (styl jak dotąd) + zwijane pole szukania i zakres dat pod
  ikonami (lupa / suwaki, aria: history.search / history.filters); karta
  "Filtry" zastąpiona samymi rzędami chipów (status + dni planu, komponent Chip),
- rząd akcji: chip PORÓWNAJ włącza tryb porównania (tap w wiersz = zaznacz,
  FIFO max 2 bez zmian) + pille "Wyślij do trenera" i "Eksport CSV" (testidy
  history-email / history-export-csv bez zmian),
- linia licznika: "{n} cykli · {m} sesji" + tonaż (agregat all-time bez
  filtrów, suma z przefiltrowanej załadowanej listy przy filtrach — zero danych
  zmyślonych; tonaż małymi literami, lekcja Dashboardu),
- karta AKTYWNEGO cyklu (surface-container): tytuł "Cykl {n}" (cykle nie mają
  pola nazwy — numeracja od najstarszego, nie zmyślamy nazw), badge Aktywny
  (primary/15), staty LIVE z buildActiveCyclePreview (Sesje/Tonaż/PR w akcencie/
  Frekwencja), sparkline tonażu per tydzień TYLKO gdy okno danych pokrywa start
  cyklu (windowCoversCycleStart — żadnych częściowych wykresów), tygodnie
  malejąco (bieżący w akcencie), pierwsza sesja bieżącego tygodnia z tintem
  bg-primary/10, stopka "Wszystkie sesje (N)" (domyślnie 2 tygodnie; przy
  niepełnym oknie dociąga starsze strony = dawne "Załaduj więcej"),
- karty PRZESZŁYCH cykli (surface-low, zwinięte): staty live
  (withLiveCompletedStats) gdy dane w oknie, inaczej cache cycle.stats;
  rozwinięcie lazy dociąga sesje spoza okna (useCycleSessions,
  fetchWorkoutRange per cykl, cache; błąd => komunikat + Spróbuj ponownie),
- wiersz sesji (HistorySessionRow): jednoliniowy (data mono · tytuł+draft ·
  serie·czas · pigułka "N PR" w akcencie zamiast fitness-warning · tonaż);
  tap = otwórz trening, chevron = Szczegóły (aria-label utrzymuje kontrakt
  e2e), menu ⋯ = komplet akcji (Otwórz/Porównaj/Wyślij do trenera/Usuń,
  testidy history-row-email / history-delete na pozycjach menu); wiersz ma
  własny aria-label ("Otwórz trening: {tytuł}") — bez niego accessible name
  sklejał się z aria-labelami przycisków w środku i getByRole('Szczegóły')
  trafiał w cały wiersz (nawigacja zamiast rozwinięcia),
- sesje bez cyklu: sekcja "Poza cyklami" (grupowanie miesięczne jak dotąd);
  user bez żadnego cyklu = cała lista miesiącami (ścieżka e2e bez seedu cykli),
- niezmienione: cała logika filtrów/porównania/usuwania/paginacji, oba
  EmailWorkoutDialog (stały mount, pułapka Radix), ExportWorkoutsDialog,
  AlertDialog usuwania, DateRangeField, empty states, rozwinięcie Szczegóły
  (serie/metryki/notatki 1:1).

**Dlaczego:** brief redesignu 2026-08-20 (fala 2); inwentarz 32 funkcji z planu
odhaczony — żadna nie znika, część przeniesiona do menu ⋯. Sesja z cycleId na
ukryty/techniczny cykl trafia do "Poza cyklami" (nie ginie, nie wpada po
zakresie dat do złego cyklu). deletedIds filtruje też sesje dociągnięte lazy.

**Weryfikacja:** 2051 testów (277 plików) + typecheck + lint + build zielone;
nowe testy: history-cycles (16, w tym niezmiennik kompletności perCycle+outside
== wejście), workout-history-redesign (10, DOM: komplet akcji menu, tryb
porównania FIFO, filtry, usuwanie, oba dialogi zamontowane, staty live);
e2e: aktualizacja 2 speców zgodnie z planem (email-coach-button: menu przed
history-row-email; critical: chip Wszystkie + ikona Filtry zamiast karty) +
komentarz w workout-delete-from-day; celowane biegi zielone: critical,
email-coach-button, export-csv-dialog, accent-color, workout-delete-from-day
(21) + CAŁY full-app (83). Pętla wizualna 4 iteracje (viewport 390, akcenty
lime/amber/sky/indigo) — zrzuty w docs/design-2026-08-20/screens/history-iter1..4;
harness doposażony: sesje z cycleId, dni cyklu, daty wyrównane do pon/śr
(frekwencja realna), zakończony mini-cykl.

### 2026-08-20: Redesign zakładki Plan (fala 2, artboard plan-tab 1b)

**Co:** Nowa prezentacja zakładki Plan wg mockupu 1b ("day-led"), wyłącznie na
tokenach akcentu/surface (zero nowych hexów, strażniki limonki i
design-token-guard zielone bez zmian allowlist):
- blok tytułu: h1 display (bez uppercase/italic) + mono chip "Tydzień x/y" w
  akcencie, pasek postępu pełnej szerokości, pille Cykle/Edytuj (rounded-full,
  surface-high); dawne kafle Tydzień/Ukończone/Pozostało zwinięte do chipa +
  nowej linii meta `trainingplan.metaProgress` (informacja zostaje w 100%),
- baner decyzji: PlanNextStepCard `variant="banner"` (mockupowy "Zdecyduj") +
  nowy prop `statsLine` z realnych statystyk aktywnego cyklu
  (`trainingplan.decideStats`); brak cyklu = brak linii, zero placeholderów,
- nawigacja tygodnia: mono zakres dat po lewej, okrągłe strzałki
  ChevronLeft/Right po prawej (aria: prevWeek/nextWeek),
- karty dni (TrainingDayCard): nazwa dnia font-heading + meta "PON 17 · focus ·
  n ćwiczeń" (bez ucinania — liczba ćwiczeń zawsze widoczna), badge
  ZROBIONE/DZIŚ w przygaszonym akcencie (primary/15) zamiast fitness-success,
  NOWY badge NASTĘPNY (bg-primary + play, najwyżej jeden, nie wypiera statusów),
  pasek obciążenia dnia (tonaż vs max tygodnia, helper `plan-day-load.ts`,
  tylko ukończone treningi — brak tonażu = brak paska),
- nagłówek dnia nad kartą zredukowany do rzędu akcji (Cardio/Edytuj); pełna
  etykieta tylko dla dni bez karty treningu,
- stopka trybów "Nie na 100%? / Urlop" jako 2 przyciski h-12 surface-low
  (stany aktywne zostają na kolorach semantycznych), rules tip na surface-low,
- wrapper `.exercise-card` zdjęty — sekcje leżą na tle strony (mockup).

**Dlaczego:** brief redesignu 2026-08-20 (fala 2); żadna funkcja nie znika —
inwentarz 34 pozycji z planu odhaczony; kalendarz desktop, HybridWeekStrip,
DeloadBanner, dialogi (cardio/urlop/reduced/reschedule) bez zmian. Kolor DONE
na kartach idzie za mockupem (akcent), kalendarz desktop zostaje na
fitness-success (świadoma decyzja z planu, ewentualne wyrównanie osobno).

**Weryfikacja:** 2025 unit testów (275 plików) + typecheck + lint + build
zielone bez edycji istniejących speców (plan-tab-order, critical, icons);
nowe testy: plan-day-load (11), training-day-card-next (5), statsLine;
e2e celowane 18 testów zielone (critical, reschedule-flow,
mobile-nav-reachability, full-app: cardio w Planie, hybrid strip, deload);
pętla wizualna 3 iteracje (viewport 390, akcenty lime/amber/sky/indigo) —
zrzuty w docs/design-2026-08-20/screens/plan-iter1..3.

### 2026-08-20: Redesign Dashboardu (fala 2, artboard dashboard-simplified 2a)

**Co:** Nowa prezentacja Dashboardu wg mockupu z Claude Design, wyłącznie na
tokenach akcentu/surface (zero nowych hexów, strażniki limonki i design-token-guard
zielone bez zmian allowlist):
- hero = karta NEXT SESSION (eyebrow mono w akcencie, duży tytuł, CTA h-14,
  stopka Szczegóły + Przełóż trening — link przełożenia wreszcie PODPIĘTY pod
  istniejący `openReschedule` z guardem żywego draftu),
- baner decyzji planu (PlanNextStepCard `variant="banner"`) między powitaniem
  a hero; "Zdecyduj" rozwija KOMPLET akcji wariantu card (niezmiennik testowany),
- pasek tygodnia: 7 poziomych segmentów zamiast kółek, nagłówek "N z M sesji" +
  "tonaż · TYDZ. x/y" mono, stopka "Dzisiaj zrobione · {dzień}", pasek % usunięty
  (duplikat segmentów),
- grid 2x2 szybkich akcji: Szybki trening, Dodaj cardio, Twoje liczby (przywrócone
  drugie wejście do AllTimeStatsSheet, X17D Z139.4), Analityka (przejmuje zdjęty
  pełnowymiarowy przycisk "Zobacz analitykę"),
- chip streaka tygodniowego przy dacie (dotąd liczony, niewyświetlany),
- badge licznika w headerze z sufiksem mono ŁĄCZNIE/TOTAL.

**Dlaczego:** brief redesignu 2026-08-20 (fala 2); żadna funkcja nie znika —
inwentarz 44 pozycji z planu odhaczony, kontrakty e2e (dashboard-order, critical,
full-app, all-time-stats, reschedule-flow, continue-workout) przeszły bez edycji
speców.

**Weryfikacja:** 2008 unit testów + typecheck + lint + build zielone; e2e subset
64 testy zielone; pętla wizualna 2 iteracje (viewport 390, akcenty
lime/amber/sky/indigo, stan rest + training) — zrzuty w
`docs/design-2026-08-20/screens/dashboard-iter1..2/`. Świadome odstępstwa od
planu ekranu: teksty "Następny trening:" w kartach completed/rest zostają
(kontrakt testów), klucz `comp.header.totalSuffix` zamiast `header.totalSuffix`
(konwencja repo), bez klucza `dash.hero.next` (byłby nieużywany).

### 2026-08-20: Audyt danych Strava + poprawka typów i średniego tempa (T5-T8, feedback użytkownika)

**Audyt (T8, ground truth READ-ONLY z Firestore, 300 dokumentów):** dystans
(metry), czas (movingTime, sekundy), elewacja (m) i data (start_date_local)
mapowane POPRAWNIE. `type`/`sportType` w dokumentach też poprawne (Walk=Walk,
TrailRun jako type=Run + sportType=TrailRun) — problem "spacer jako bieg"
siedział w PREZENTACJI (karta bez etykiety typu) i w REKORDACH (isPaceActivity
= Run|Walk|Hike karmiło best 5K/10K i RacePredictor).

**Naprawione:**
- **avgPace (realny bug):** była średnia ARYTMETYCZNA pace'ów per aktywność;
  teraz ważona dystansem (suma czasu / suma km) w computeSummaryStats,
  computeMonthlySummaries i computePaceTrendData. Wartości na ekranach userów
  SIĘ ZMIENIĄ — to korekta błędu. Spacery zostają w avgPace (tempo marszu to
  legalne tempo); jeśli właściciel chce avgPace tylko biegowe → jedno słowo,
  przełączenie na isRunActivity.
- **Rekordy i predykcje (T6):** fastest pace / best 5K / best 10K /
  RacePredictor liczą TYLKO biegi (isRunActivity: type Run lub sportType
  zawierający Run). Spacery/wędrówki wypadają z "rekordów biegowych" — u osób
  ze spacerami wyświetlane rekordy się zmienią (zamierzona poprawka).
- **Etykieta typu na karcie:** spacer podpisany "Spacer", trail "Bieg
  trailowy" itd. (cardio.type.*, fallback surowy sportType).

**Ograniczenie API (bez zmian w kodzie, decyzja właściciela otwarta):**
`calories` i `description` są null we WSZYSTKICH dokumentach — endpoint listy
Stravy (SummaryActivity) tych pól NIE zwraca (tylko DetailedActivity per
aktywność). UI degraduje się uczciwie ('—', CaloriesChart się chowa), nic nie
jest kłamane. Opcje: (a) zostawić jak jest — REKOMENDOWANE, (b) mapować
kilojoules→kcal dla jazd (przybliżenie, ryzyko zarzutu "fałszywe dane"),
(c) dociągać DetailedActivity per aktywność (ODRADZANE: 1 request/aktywność,
pali limit API 100 req/15 min — sprzeczne z rate-limitem T7).

**Poprawne celowo (NIE ruszać):** totalDistance/weeklyStravaKm sumują wszystkie
typy cardio (zamierzone "km cardio"), filtry WeightTraining/Crossfit,
weekly-digest (już filtrował Run), HR zones/Training Load (typ nieistotny).

**Weryfikacja:** vitest (strava-utils: asercja 260 vs 270 s/km odróżnia ważoną
od arytmetycznej; race-predictor: same spacery → zero predykcji; activity-icons;
functions strava-activity: fallback sport_type), typecheck, lint.

### 2026-08-20: Kalendarz zakresów booking-style (T20, feedback użytkownika)

**Co:** Własny lekki `RangeCalendar` (`src/components/ui/range-calendar.tsx`
+ czysta logika `src/lib/date-range-select.ts`) zamiast react-day-picker /
shadcn Calendar — zero nowych zależności (pułapka zasady 9: vite re-optimize
po `npm i`, plus bundle-budget). Semantyka Booking: klik = początek, drugi
klik = koniec, klik przed początkiem RESTARTUJE początek (bez błędu
„koniec przed początkiem"; walidacja w `vacation-mode.ts` zostaje jako
bezpiecznik). Dni pomiędzy podświetlone `bg-primary/15` (token akcentu,
zasada 8), krańce `bg-primary`. Tydzień ZAWSZE od poniedziałku, także przy
en (spójnie z logiką tygodni w apce). Nazwy miesięcy/dni przez
`Intl.DateTimeFormat(dateLocale(lang))` — język APKI, nie systemu (T18).

**Wdrożone w:** VacationDialog (inline, zamiast dwóch inputów date; presety
7/14/21 i walidacja MIN 3/MAX 21 bez zmian), ExportWorkoutsDialog (inline
dla kind='custom'; `exportRangeBounds` nietknięte), filtr Historii
(`DateRangeField` = trigger + Popover + Wyczyść, zasada 6: filtr ma wyjście).
Podczas wyboru drugiego końca (to=null) zapis urlopu zablokowany z hintem
`range.pickEnd` — zero stale summary.

**Root cause zmiany:** feedback pierwszego użytkownika 2026-08-20 (T20):
dwa natywne inputy date to słaby UX wyboru zakresu na telefonie.

**Weryfikacja:** vitest (date-range-select, range-calendar, date-range-field,
vacation-dialog po przejściu na kliki, workout-export-range jako regresja),
typecheck, lint, build, e2e export-csv-dialog.spec.ts (chromium) po świeżym
vite. Testy ręczne na urządzeniu = krok właściciela przy wydaniu.

### 2026-08-20: Wydanie — kolor w onboardingu, nowa paleta 11, social-first login (iOS 112 / AAB v27)

**Co:** (1) Plan I (agent w worktree, merge do main): wybór koloru aplikacji
w kroku Welcome onboardingu przy pytaniu o imię — rząd 11 kropek, live preview
od kliknięcia, zapis w markOnboardingComplete; nowa paleta wg wzoru właściciela
(limonka default + sky/indigo/violet/lavender/magenta/rose/amber/emerald/
slate/gray) z automatycznym kontrastem per luminancja (próg 0.28; indigo/
violet/magenta/rose/slate/gray = jasny tekst) i aliasami starych id
(cyan→sky, blue→sky, purple→lavender, pink→magenta, red→rose, orange→amber,
gold→amber). (2) Social-first login z równoległej sesji właściciela
(Kontynuuj z Apple/Google/e-mailem; zajął numery 111/v26) wszedł do tego
wydania mobilnego. (3) Bramka dist-offline nauczona nowego logowania
(przycisk zamiast zakładek; dwa pola Email na stronie — .first()).

**Artefakty:** web LIVE `index-ChIQ6bbR.js` (marker ob-accent na
origin/gh-pages + curl); iOS 1.0.0(112) TestFlight: VALID, obie grupy 204,
whatsNew 200, Beta App Review APPROVED; AAB versionCode 27 `jar verified` SHA
`6093f73c59469d50300b231dfff70c10eca9c773abad868963c2c63fb0f87c5d` (upload
Play = właściciel). Następny build iOS = 113, versionCode = 28.

**Bramki po merge:** vitest 1863/1863, typecheck, lint, no-emoji (179),
dist-smoke, bundle-budget (1 317 249 B), dist-offline (po fixie gate),
pełne e2e 426/426 po świeżym vite.

**Kontekst numeracji:** 111/v26 zbumpowała druga sesja (social login) bez
wysyłki do TestFlight w chwili tego wydania — 112 zawiera całość, żaden krok
właściciela dla 111 nie jest potrzebny.


### 2026-08-20: Social-first logowanie + sekcja Subskrypcja w panelu admina (grant/revoke PRO)

**Co (decyzje właściciela po rozmowie 2026-08-20):**
(1) **Ekran logowania social-first.** Pierwszy ekran = "Kontynuuj z Apple" +
"Kontynuuj z Google" (iOS: Apple na górze wg HIG; Android/web: Google) +
wyraźny, klikalny przycisk "Kontynuuj z emailem" niżej (jawne życzenie:
widoczny, nie mikro-link). Zniknęły zakładki Google/Email i box "Przejdź do
rejestracji": "Kontynuuj z..." obsługuje i nowego (auto-tworzenie konta,
status active dla Apple/Google), i wracającego usera. Apple pokazywane na
WSZYSTKICH platformach (konto z iPhone'a musi się zalogować na Androidzie /
webie; Firebase robi flow przeglądarkowy). Ścieżka email (login + rejestracja
+ reset + wybór języka) bez zmian merytorycznych, dostępna za przyciskiem.
Stopka prawna z linkami Regulamin/Prywatność. Zgody RODO nietknięte: zbiera
je jak dotąd onboarding/ConsentGate, nie formularz. Przy okazji naprawiony
ukryty problem App Review 4.8: wcześniej /register otwierał domyślnie
zakładkę email i nowy user na iOS w ogóle nie widział Apple Sign-In.
(2) **Panel admina: sekcja Subskrypcja.** Karta w szczególe usera + boks w
rozwinięciu wiersza tabeli + badge PRO w wierszu. Nadawanie z presetami
+30/+90/+365 dni / bezterminowo / własna liczba dni; dni DOLICZAJĄ SIĘ do
końca obecnego dostępu (także opłaconego okresu ze sklepu). "Odbierz PRO"
usuwa ręczny grant (tylko tier comp; płatną subskrypcją rządzi Apple/Google,
panel nie ma jak jej przerwać ani zmienić planu rozliczeniowego — "zmiana na
roczny" = grant +365 dni).
**Root cause przebudowy grantu:** stary grant na N dni zapisywał tier
'trial', a webhook RC chronił przed nadpisaniem tylko 'comp' — event
EXPIRATION ze sklepu mógł skasować ręcznie nadany miesiąc. Teraz grant jest
ZAWSZE 'comp' (opcjonalnie z expiresAt), `shouldApplySubscriptionEvent`
pomija eventy tylko przy AKTYWNYM grancie (bezterminowym albo z datą w
przyszłości), a po wygaśnięciu grantu webhook odtwarza stan sklepowy.
Klient: `isSubscriptionActive` respektuje expiresAt dla comp,
`summarizeSubscription` pokazuje "wygasa {data}" w Profilu. Nowe callable
`adminRevokeSubscription` (failed-precondition dla tier != comp), grant w
transakcji Firestore. Audyt: admin_subscription_granted/revoked +
logAdminAction.
**Weryfikacja:** unit 1845/1845 (nowe: login-screen 8, granty/webhook/stan),
functions 311/311, typecheck (app + functions), lint 0 błędów, build +
dist-smoke + bundle-budget + no-emoji, e2e auth-registration przepisane pod
nowy układ (13/13 z admin-switch), helpery loginThroughUi w spec-ach
emulatorowych zaktualizowane.
**Pliki:** Login.tsx (rewrite), AdminSubscriptionCard.tsx (nowy),
AdminDashboard/AdminUserDetail/UsersActivityTable/admin-user-types,
functions: security.ts, registration.ts, revenuecat.ts, index.ts; lib:
user-profile, subscription-summary, registration-api; i18n pl+en.

### 2026-08-20: Plan J — fix "Sending failed" (brakujący indeks), spójny język maili, wyślij-z-Historii, eksport CSV z zakresami

**Co:** Plan `docs/PLAN-MAILE-FIX-2026-08-20.md` wykonany w całości (TDD)
i WDROŻONY (indexes + functions + web). (1) J-T1 root cause "Sending failed"
przy week/last30: `listWorkoutsInRange` wymaga composite indeksu
`workouts(userId ASC, completed ASC, date DESC)`, którego nie było —
Firestore rzucał failed-precondition, callable oddawał 'internal'. Indeks
dodany i zbudowany (READY), do tego try/catch z logger.error wokół odczytów
(kody dla klienta bez zmian) i skrypt READ-ONLY
`scripts/verify-email-range-index.mjs` (RED failed-precondition przed
zbudowaniem, GREEN po: week 4, last30 30, baseline 81 treningów na koncie
właściciela, zero zapisów). Bonus: adapter honorował wreszcie `beforeDate`
(baseline PR miał w kontrakcie górną granicę, adapter ją ignorował).
(2) J-T2: akcja "Wyślij do trenera" w wierszu Historii (mode='workout',
dialog zawsze zamontowany — pułapka Radix). (3) J-T3: mail w 100% jednym
języku — przy lang=en słowniki digestu (localizeExerciseNameEn,
localizeFocusEn) + 7 dni tygodnia PL→EN; nieznana nazwa własna usera
zostaje; tłumaczenie przed detekcją PR. (4) J-T4 po decyzji właściciela
(2026-08-20, BEZ załączników w mailach): last30 i każdy mail historii > 7
treningów = tabela-przegląd (data, dzień, tonaż, czas, serie robocze, PR)
zamiast ściany sekcji; week zostaje z pełnymi sekcjami. Pierwotna hybryda
z załącznikiem CSV (RAW MIME, attachments SES/Resend, workout-csv w
functions) była wdrożona i WYCOFANA bez martwego kodu (commit 7bfba9f8).
(5) J-T5 po doprecyzowaniu właściciela: eksport CSV w całości klientski —
dialog ExportWorkoutsDialog z zakresami (tydzień domyślnie / miesiąc /
ostatnie 10/30 / cykl z plan_cycles / własny od-do), podgląd liczby
treningów, Eksportuj disabled przy 0, dwa punkty wejścia (Historia obok
"Wyślij do trenera" + Ustawienia → Dane), plik
`strengthsave-treningi-<od>-<do>.csv` (UTF-8 BOM, nagłówki EN techniczne,
wiersz per seria; src/lib/workout-csv.ts + workout-export-range.ts).

**Weryfikacja realna:** wysyłki SES na g.jasionowicz@gmail.com (fixtures
syntetyczne): week lang=en (pełne sekcje, 100% EN) MessageId
`010701a01f338efc-228b2eff-fc5f-459c-b53b-46cc33a57141-000000`; last30
lang=pl (8 sesji, tabela-przegląd) MessageId
`010701a01f338fdc-618ff24d-711e-4930-92e3-e100feb1f2dd-000000`. Bez
załączników (potwierdzone).

**Bramki + deploy:** vitest web 1833/1833, functions 309+7 skip, tsc 0,
eslint 0 błędów, buildy web+mobile, check:no-emoji/bundle-budget/
dist-offline/dist-smoke, pełne e2e 416/416 po świeżym vite (5.0 min).
Deploy: indexes (READY) → functions emailWorkoutSummary+emailWorkoutHistory
(us-central1 updated) → web LIVE `index-D79Mk9PG.js` (origin/gh-pages +
curl). BEZ bumpów mobilnych (wydanie zbiorcze robi sesja główna).
Pułapka warsztatowa: rtk obcina output gcloud nawet przy redirect do pliku
— czysty JSON tylko przez `rtk proxy gcloud ...`; plik env z wartością
`Nazwa <adres>` nie przechodzi przez shellowe `source` (parse error na
`<`), ładować env pythonem.

### 2026-08-20: Wydanie zbiorcze — kolory wszędzie + maile do trenera na mobilki

**Co:** Scalono i wydano na wszystkie powierzchnie efekty trzech równoległych
prac: (1) audyt kolorów akcentu (agent w worktree; merge 5f9c4f0c, 34 pliki,
zero konfliktów): --accent/--accent-foreground nadpisywane kolorem przewodnim,
--fitness-cyan przestrojony na realny cyjan (znaczenie: cardio), ~70 zaszytych
limonek zmigrowanych na tokeny primary, gradienty CTA/wykresów z tokenów,
statusy nietknięte; (2) plany G+H agenta maili (opisane niżej, wydane wcześniej
tego dnia); (3) wydanie mobilne: bump iOS 110 + AAB v25, żeby przycisk "Wyślij
do trenera", zakresy i kolory weszły do bundli natywnych.

**Artefakty:** web LIVE `index-CSEYo3a1.js` (marker 'Wyślij do trenera' na
origin/gh-pages + curl live); iOS 1.0.0(110) TestFlight: VALID, obie grupy 204,
whatsNew 200, Beta App Review APPROVED; AAB versionCode 25 `jar verified` SHA
`2952dc8894bb2e2c60228f4aa9299e2a5c9415fc29a192e9f892ef3c709d66e0` (upload
Play = właściciel); Garmin/Watch bez zmian źródeł. Następny build iOS = 111,
versionCode = 26.

**Bramki po merge:** vitest 1821/1821, typecheck, lint, no-emoji (177),
dist-smoke, bundle-budget (1 314 821 B), dist-offline, pełne e2e 410/410
po świeżym vite. Lekcja: `pkill -f vite` ubija też trwający `vite build`
w tle — nie czyścić vite, gdy w tle idzie build (pierwszy bieg bramek padł
z SIGTERM przez to).


### 2026-08-20: H-RELEASE — poprawki UX i treści maili do trenera (feedback po teście 109)

**Co:** Plan `docs/PLAN-EMAIL-UX-2026-08-20.md` wykonany w całości (TDD),
6 zgłoszeń właściciela zaadresowanych:
- H-T1 (27824943): pełny button "Wyślij do trenera" zamiast samej ikony
  (układ 2+1 na 390px, zweryfikowany zrzutem); Historia z wyborem zakresu
  (chipy: Ostatni tydzień default / Ostatnie 30 treningów; opcji "wszystko"
  nie ma); e2e email-coach-button.spec.
- H-T2 (a80c0666): functions — listWorkoutsInRange (sinceDate/beforeDate),
  range week (dziś-6 dni, limit 14) / last30; HISTORY_EMAIL_MAX_WORKOUTS
  200 → 30; nieznany range = invalid-argument.
- H-T3 (e696f707): język maila z users.language (to samo pole co
  weekly-digest) — profil wygrywa z parametrem klienta, fallback parametr,
  brak wszystkiego = pl; awaria odczytu profilu nie blokuje wysyłki;
  email_log.lang = finalny język.
- H-T4 (cb919ca6): tytuły bez pauz z displayName ("Strength Save: trening
  Greg, czwartek 20.08.2026"; historia z zakresem dat zamiast "(N)"); treść:
  kafle tonaż/czas/serie zrobione-planowane/ćwiczenia/rekordy, sekcja NOWE
  REKORDY liczona server-side (email-prs.ts, minimalny port detectNewPRs:
  nowy max kg / powt. przy tym samym ciężarze / e1RM; pierwszy zapis to nie
  PR), badge serii rozgrzewkowej, wyróżniona najlepsza seria, podsumowanie
  setów per ćwiczenie; historia z sumą serii roboczych i PR per sesja
  (baseline narastający, limit 100 wcześniejszych sesji).

**Root cause:** feedback z realnego testu na buildzie 109: mail "biedny"
(gołe listy serii), tytuł z em-dash bez imienia, ikona wysyłki niewidoczna,
historia = 200 treningów naraz, język maila nie respektował ustawień usera.

**Weryfikacja:** vitest web 1821/1821 + functions 302, e2e 406/406 po
świeżym vite, wszystkie check:* zielone; deploy functions (obie callables)
+ web live index-CTJWO6e6.js (marker 'Wyślij do trenera' na gh-pages);
REALNE maile na g.jasionowicz@gmail.com nowym szablonem: pojedynczy
(z PR-em 105 vs 100 i rozgrzewką) MessageId 010701a01ed781dc-...,
historia week MessageId 010701a01ed7828c-...; oba z kompletem zdarzeń
Send+Delivery+Open w email_events.

**Ograniczenia:** BEZ bumpów mobilnych — button i zakresy wejdą do bundli
iOS/Android przy następnym wydaniu mobilnym; treść maili działa od razu
wszędzie (server-side). Rules nietknięte.

### 2026-08-20: G-RELEASE — panel maili w adminie + pipeline zdarzeń SES + szablony marki

**Co:** Plan `docs/PLAN-EMAIL-PANEL-2026-08-20.md` wykonany w całości (TDD):
- G-T1 (42018e25): rejestr `email_log` — każda wysyłka (obie callables) zostawia
  wpis sent/failed; `sendEmail` w deps zwraca metadane transportu
  (`transport: ses|resend`, `sesMessageId` z SES = klucz korelacji). Awaria logu
  nie psuje wysłanego maila. Rules: `email_log` + `email_events` read tylko
  admin, write false (225/225 test:rules).
- G-T2 (0cfee330): pipeline zdarzeń SES: SNS topic `strengthsave-ses-events`
  (polityka: publikuje tylko ses.amazonaws.com z naszego config setu) + event
  destination (9 typów, OPEN/CLICK włączają tracking otwarć) + webhook
  `sesEventsWebhook` (walidacja podpisu SNS przez sns-validator, TopicArn
  z sekretu SES_SNS_TOPIC_ARN — pełny ARN poza publicznym repo, auto-confirm
  subskrypcji, idempotentne `email_events/{messageId}-{EventType}-{tsMs}`,
  transakcyjny merge email_log). Niezmiennik mapowania: zdarzenia nie cofają
  mocniejszych statusów (complaint zostaje mimo Delivery, failed nie nadpisuje
  delivered), openedAt tylko przy pierwszym otwarciu + licznik.
- G-T3 (541fa38b): szablony maili w stylu marki: jasne tło #f6f7f9, biała
  karta, logo tekstowe STRENGTH SAVE z limonkowym akcentem #cefc22, tabele +
  inline CSS, max 640px, zero obrazków/zewnętrznych zasobów, zero emoji
  i wykrzykników (testy pilnują); kafle hero (tonaż/czas/serie/ćwiczenia),
  historia z nagłówkiem zbiorczym (zakres, suma tonażu, łączny czas).
- G-T4 (a748b7ba + a86b7904/dd7dc418): sekcja Maile w panelu admina — lista
  100 ostatnich wysyłek ze statusami (opened limonka, complaint=SPAM czerwony),
  kafle 7/30 dni (dostarczalność/otwieralność/bounce/skargi, adnotacja
  o limicie 100), stany pusty/błąd-z-retry; RTL 5 + logika 8 + e2e.

**Root cause potrzeby:** właściciel nie widział, kto do kogo wysyła maile ani
czy dochodzą (spam?); SES miał metryki tylko w konsoli AWS.

**Weryfikacja:** e2e realne: MessageId
010701a01e955262-6eb8fd62-29ff-4b32-8586-d939f22ed9ea-000000 → email_events
Send+Delivery+Open, email_log delivered z openedAt/openCount=1 (pixel działa);
2 maile podglądowe szablonów też z kompletem zdarzeń. Bramki: vitest web
1819/1819 + functions 270, typecheck, lint, build, bundle-budget, dist-smoke,
dist-offline, no-emoji, rules 225/225, pełne e2e 404/404 po świeżym vite.
Deploy: rules → functions (emailWorkoutSummary/History, sesEventsWebhook) →
web live index-080nD_E1.js (marker sekcji Maile na origin/gh-pages).

**Ograniczenia:** user IAM ad-system-admin bez SNS:TagResource → topic bez
tagu Project. Zakładka Maile wejdzie do mobilnych bundli przy następnym
wydaniu mobilnym (panel używany przez web; BEZ bumpów iOS/Android w tym
planie, wersje 1.0.0). Testowy wpis email_log (uid e2e-ses-test) widoczny
w panelu jako dowód działania.

### 2026-08-20: Amazon SES WDROŻONY jako główny transport maili (noreply@strengthsave.app)

**Co:** Na polecenie właściciela wdrożone autonomicznie: (1) tożsamość domeny
`strengthsave.app` w SES (Easy DKIM; 3 CNAME dodane przez API Cloudflare, status
SUCCESS), (2) osobny "sektor" Strength Save wewnątrz konta AWS: configuration
set `strengthsave` (osobne metryki wysyłek) + user IAM `strengthsave-ses-sender`
(tag Project=strengthsave) z polityką zawężoną do ses:SendEmail WYŁĄCZNIE
z tej tożsamości i tego config setu, (3) realne sekrety w Firebase Secret
Manager (SES_REGION=eu-central-1, klucze usera IAM, SES_FROM="Strength Save
<noreply@strengthsave.app>"), (4) redeploy obu callables, (5) fallback: błąd
wysyłki SES przełącza na Resend (mail ma dojść; commit z tej sesji),
(6) TEST realny: SendEmail z noreply@strengthsave.app dostarczony (MessageId
010701a01e7a361c-...). Kopia klucza w `~/FIRMA/_secrets/projekty/strengthsave-ses.env`.

**Kontrola/rozszerzanie:** inne domeny właściciela dochodzą na tym samym koncie
jako osobne tożsamości + własne config sety + osobni userzy IAM z kluczami
scoped per domena — klucz Strength Save nie wyśle z niczego innego.
Istniejące gjasionowicz.pl / kontakt@ nietknięte.

### 2026-08-20: F-RELEASE — feature'y właściciela (kolor, imię, mail do trenera)

**Co:** Wydanie F (plan `docs/PLAN-FEATURES-2026-08-20.md`):
- F-T1 (154cf6be): imię edytowalne wprost pod zdjęciem w Profilu (tap w imię →
  istniejący dialog; onboarding już pytał o imię — PlanWizard askName).
- F-T2 (3866e376) + F-T2b (3d7907e1, dopisek usera mid-turn): kolor przewodni
  aplikacji — paleta 8 jasnych akcentów + DOWOLNY kolor (systemowy picker
  input type=color z wpisem po # na iOS + pole tekstowe #RRGGBB). Tokeny CSS
  (--primary/--primary-light/--ring) + hex dla wykresów/share/PDF/confetti
  (stop-color nie łyka var()); ciemny własny kolor dostaje jasny tekst na
  akcencie (luminancja < 0.3); kolory statusów nietknięte; persistencja
  localStorage (od splashu) + mirror preferences.accentColor.
- F-T3 (8b2171eb): mail z pełnym podsumowaniem treningu (serie, notatki, RPE,
  ból, ocena sesji, tonaż, czas) na dowolny adres (np. trener) — pojedynczy
  trening albo cała historia (max 200). Callables emailWorkoutSummary/
  emailWorkoutHistory WDROŻONE na prod; transport SES (sekrety SES_* jako
  placeholder 'unset') z fallbackiem Resend; limit 10 maili/dobę (transakcja
  email_quota), ownership check, walidacja adresu; adres zapamiętywany
  w preferences.trainerEmail.

**Artefakty:** web LIVE `index-JWie54Xt.js` (marker accent-swatches w chunku
Profile na origin/gh-pages + curl live); iOS 1.0.0(109) TestFlight: VALID,
obie grupy 204, whatsNew 200, Beta App Review APPROVED; AAB versionCode 24
`jar verified` SHA `e983902ba73fe47501bc4ac0cae17a5172bc8f7899f990c6b599ec1aa0b60eee`
(upload Play = właściciel); functions: 2 nowe callables na prodzie; Garmin bez
zmian źródeł. Następny build iOS = 110, versionCode = 25.

**Weryfikacja natywna (symulator, konto demo na emulatorach):** cyjan z palety
barwi całą apkę (nagłówki, nav, CTA), custom #1e90ff przez pole hex barwi
Dashboard z BIAŁYM tekstem na CTA (automatyczny kontrast), persistencja
przeżywa reinstall (localStorage). Zrzuty w scratchpadzie sesji.

**Kroki właściciela:** podmienić sekrety SES na realne
(`printf '<wartość>' | firebase functions:secrets:set SES_REGION --project
fittracker-workouts --data-file -` itd. dla SES_ACCESS_KEY_ID,
SES_SECRET_ACCESS_KEY, SES_FROM) + `firebase deploy --only
functions:emailWorkoutSummary,functions:emailWorkoutHistory`; do tego czasu
maile idą Resendem z noreply@strengthsave.app. Poza tym: testy TestFlight
108/109, upload AAB v23/v24 do Play, submit CIQ.

**Bramki:** vitest 1804/1804, functions 238/238, pełne e2e 400/400 (świeży
vite) + accent-color 4/4, typecheck, lint, build, wszystkie check:* GREEN.


### 2026-08-20: E-RELEASE — bugi zgłoszone z realnego treningu na buildzie 107

**Co:** Wydanie E (E-T1..E-T5, plan `docs/PLAN-BUGI-2026-08-20.md`): PR-y sesji
liczone z danych zamiast ulotnego stanu (share/ekran ukończony po remont pokazują
rekordy; e395cc52), share card z tonażem I czasem razem na każdym szablonie +
lista ćwiczeń w karcie + podgląd mieszczący się na ekranie + fix zdublowanego
dnia tygodnia (b3f54e47), komunikat "Trening został zapisany pomyślnie" (1394f274),
kafel Pozostało liczy TRENINGI z honorowaniem skip/urlop/przełożeń (6b31e0af),
Historia cache-first — pierwsza strona z lokalnego cache natychmiast (fe7fee18).

**Artefakty:** web LIVE `index-B2BKTGWX.js` (markery E zweryfikowane git grepem
na origin/gh-pages i curlem live); iOS 1.0.0(108) TestFlight: VALID, obie grupy
(pierwsze podpięcie HTTP 500 po stronie Apple, fallback testflight_external
dopiął 204+204), whatsNew 200, Beta App Review APPROVED; AAB versionCode 23
`jar verified` SHA `c7cb043b6337b2372cd17172dd29891c5a9d063743f525ca2850b604f5c0e4f6`
(upload Play = właściciel); Garmin bez zmian źródeł; backend nietknięty.
Następny build iOS = 109, versionCode = 24.

**Weryfikacja natywna:** świeży build emulatorowy w iPhone 17 Pro Max Simulator,
konto demo na LOKALNYCH emulatorach Auth/Firestore, przeklikane przez idb:
login → trening 100 kg × 5 → finish → share (story TONNAGE i TIME, obie metryki,
lista ćwiczeń, dialog w całości na ekranie) → Plan (1 COMPLETED / 11 REMAINING)
→ Historia (natychmiastowe malowanie). Zrzuty w scratchpadzie sesji.

**INCYDENT (posprzątany):** seed QA uruchomiony bez env emulatorów poszedł przez
ADC na PRODUKCJĘ (syntetyczne konto admin z hasłem 123456 + 2 dokumenty).
Zweryfikowano brak szkody dla realnych userów (uid utworzony w tej sesji,
lastSignIn null), wszystko usunięte (deleteUser + delete docs, potwierdzone
user-not-found). Bezpiecznik: seed twardo wymaga FIREBASE_AUTH_EMULATOR_HOST
i FIRESTORE_EMULATOR_HOST (04b99342). Lekcja: skrypty admin SDK NIGDY bez
jawnego celu; `| tail` maskuje exit code bramek (nie łączyć przy go/no-go).

**Bramki:** vitest 1787/1787, pełne e2e 398/398 (świeży vite), typecheck, lint,
build, bundle-budget/dist-smoke/dist-offline/no-emoji GREEN.


### 2026-08-20: D-RELEASE — wydanie D, domknięcie planu audytu 2026-08-19

**Co:** Wydanie D (D-T1..D-T5): docelowa architektura informacji. Bottom nav
Dzisiaj/Plan/Historia/Postępy/Ćwiczenia; Dashboard skupiony na "co teraz"; Plan
przejmuje tydzień + przełożenie/pominięcie dnia; scalenie Analytics i Achievements
w jeden ekran Postępy (`/achievements` z przełącznikiem Rekordy i odznaki/Analityka,
`/analytics` = redirect zachowujący `?tab=`); audyt czytelności (product-audit 9.5,
zero RED/ORANGE, raport `audit/latest.json`).

**Artefakty:** web LIVE `index-B7Kq8hoP.js` (marker `progress-view-analytics`
zweryfikowany git grepem w chunku `Achievements-D9p_g1gk.js` na origin/gh-pages
+ curl live); iOS 1.0.0(107) TestFlight: VALID, obie grupy podpięte (204), whatsNew
200, Beta App Review APPROVED, Watch w IPA; AAB versionCode 22 `jar verified` SHA
`03d04f35162269526be5e9066e23ca9393eb0e6a25d9a17d487c41c55a6d29f9` (upload Play =
właściciel); Garmin bez zmian źródeł (artefakty A+B aktualne); backend nietknięty.
Następny build iOS = 108, versionCode = 23.

**Root cause / lekcje:** (1) gate dist-offline wisiał bez limitu — `dist` z
build:mobile nie ma service workera, a `navigator.serviceWorker.ready` w evaluate
nigdy się nie rozwiązuje; dist-offline wymaga builda WEB. (2) Gate po D-T4 uczony
scalonego ekranu: nagłówek Postępy + zakładka z wnętrza Analytics jako dowód lazy
chunka (commit 6d8a8b61). (3) Flaky warmup-persistence: toast startu (TOAST_REMOVE_DELAY)
przykrywał przycisk Rozgrzewki — zamykanie toastu wzorcem [toast-close] (b9724f49).
(4) Pipe `| tail` maskuje exit code bramki — nie łączyć bramek pipe'em przy decyzji go/no-go.

**Bramki:** vitest 1758/1758, pełne e2e 394/394 (świeży vite), typecheck, lint,
build, bundle-budget/dist-smoke/dist-offline/no-emoji GREEN, product-audit 9.5.


### 2026-08-19: C-RELEASE — wydanie C na powierzchniach (kontynuacja trainu)

**Co:** Wydanie C (C-T1..C-T4): urlop Od-Do z wejściem z Planu, pre-start warmup flow
(prompt + treść v2 pod pierwsze ćwiczenie), tryb "nie na 100%" z Planu (decyzja:
zostaje, mapa nakładania w trackerze), jedna maszyna/karta końca planu (Dashboard/
Plan/Cykle) + zdarzenie plan-ended do inboxa.

**Artefakty:** web LIVE `index-CociTREW.js` (markery C zweryfikowane w chunkach
gh-pages); iOS 1.0.0(106) TestFlight obie grupy + Beta App Review APPROVED, Watch 106
w IPA (release-task zabity w trakcie pollingu dystrybucji - upload zdążył, dystrybucję
domknął testflight_external.py); AAB versionCode 21 `jar verified` SHA
`2353432b29ae97c4f1da0fc3deefeb59eabd80314a55ccc9f9d79679369641db` (upload Play =
właściciel); Garmin bez zmian źródeł (artefakty A+B aktualne); backend nietknięty.
Bramka dist-offline nauczona promptu pre-start (klik Pomiń jak realny user).
Następny build iOS = 107, versionCode = 22.

**Bramki:** vitest 1758/1758, e2e 197/197 (świeży vite), typecheck, lint, build,
bundle/dist-smoke/dist-offline/no-emoji GREEN.


### 2026-08-19: RELEASE TRAIN A+B — wydanie na 5 powierzchni (mandat właściciela)

**Co:** Pierwszy wspólny release train planu audytu (wydania A i B, zielony commit
`398a3442`): web + backend + iOS/Watch + Android + Garmin. Wykonany na jawny mandat
właściciela ("pracuj aż wydasz nowe wersje na wszystkich powierzchniach"); fizyczne
przebiegi A-T5 na iPhone/Androidzie oraz submity sklepowe pozostają krokami właściciela.

**Artefakty:**
1. **Backend:** rules + indexes (user_events, composite userId+createdAt) + functions
   (weeklyDigest z producentem inboxa) wdrożone na prod PRZED klientami.
2. **Web:** LIVE na app.strengthsave.app, hash `index-BMqiRMRo.js` zweryfikowany.
3. **iOS 1.0.0 (105):** TestFlight, obie grupy podpięte (204/204), whatsNew ustawione,
   Beta App Review APPROVED; `StrengthWatch.app` 105 + widgets w IPA. Build 104 był
   zajęty (upload Codexa ze starego kodu przed limitem) — bump na 105. Następny = 106.
4. **Android AAB versionCode 20:** `jar verified`, SHA-256
   `99f692ce99affb34b1d177e29abe87908c5876ea47ff6c34f465cb6f2b91f637`
   (`android/app/build/outputs/bundle/release/app-release.aab`) — upload do Play
   Console = krok właściciela.
5. **Garmin:** podpisany `.iq` 27/27 urządzeń SHA `e488c208…`, PRG epix2 SHA
   `d3165176…` = bajt w bajt binarka fizycznie wdrożona rano na EPIX2 właściciela;
   submit do Connect IQ Store = krok właściciela.

**Zakres merytoryczny (commity B-T1..B-T6 + fixy):** jedno źródło prawdy serii
roboczych (`769890e8`), rekord vs szac. 1RM (`5854c02d`), celebracja PR 5,5 s ścienne
(`8ae5d942`), notatka nad seriami, matcher backfillu po slugu (`a78c0993`~), serwerowy
inbox user_events (`48083efc`), fix retransmisji kolejki Watch (`60ef6c8c`), fix
eksmisji rodzica przez zagnieżdżone potwierdzenie (`398a3442` — wyłapany bramką e2e
trainu, RED w overlay-contract).

**Bramki trainu:** vitest 1729/1729, functions 227 + build, test:rules 218/218,
typecheck, lint, build, bundle-budget, dist-smoke, dist-offline, no-emoji, pełne e2e
197/197 na świeżym vite.

**Incydent procesowy:** commit `9b32e915` wszedł jako wydmuszka (git add z listą
ścieżek i wyciszonym stderr), a bisekcja `checkout -- .` nadpisała niezacommitowane
zmiany; treść odtworzona 1:1 i dograna w `48083efc`. Lekcja w pamięci projektu +
zasada: stage per plik, `git show --name-status` przed pushem.


### 2026-08-19: Watch Simulator QA domknięte po limicie Codexa + fix retransmisji kolejki (60ef6c8c)

**Co:** Dokończenie interaktywnej sekwencji Apple Watch Simulator z procedury A-T5
(pętla audytu `docs/PLAN-REALIZACJI-AUDYT-2026-08-19.md`), przerwanej limitem Codexa
w trakcie testu "2 min wygaszonego ekranu przed resume". Pełny przebieg: quick workout
z zegarka, seria 42,5 kg × 5 przy zabitym telefonie (ACK 0E992520 po trwałym przyjęciu),
2 min screen-off + ponad 2 h uśpienia z żywym procesem, FINISH przy zabitym telefonie
(pending EA1013B9), restart apki i pełny restart symulatora zegarka z zachowanym
pending, reconnect, ACK, pojedynczy ingest.

**Root cause wykrytego RED:** po restarcie zegarka z pending eventem nic nie
retransmituje trwałej kolejki: systemowe transfery WCSession przepadają z restartem,
`activate()` nie flushował `watch.pendingEvents.v1`, a finishedView (jedyny osiągalny
widok w tym stanie) nie pokazywał pending ani Retry (pułapka wg zasady 6 CLAUDE.md).

**Fix (TDD):** `retryPendingEvents()` po `activationDidComplete` i po powrocie
reachability + licznik pending i Retry na finishedView. Retransmisja bezpieczna przez
dedup enqueue po eventId na telefonie i dedup ingest w functions. 2 nowe testy w
`wearable-offline-contract.test.ts` (RED przed fixem).

**Weryfikacja:** vitest 1702/1702, typecheck, lint, xcodebuild Debug sim GREEN; po
instalacji fixu auto-retry dostarczył event, ackedEventIds potwierdzone, obie kolejki
puste, mutacja Firestore committed (mutations=0, deterministyczny id sesji = jeden
dokument). Konto wyłącznie syntetyczne na lokalnych emulatorach.

**Kontekst:** A-T5 pozostaje BLOCKED wyłącznie na fizyczny iPhone i fizyczny Android
(kroki właściciela); Garmin i Watch domknięte. Build 104 przygotowany w pbxproj
(167dcf24), NIE wysłany na TestFlight. Obserwacja poboczna: licznik serii na zegarku
po restarcie pokazuje 0 (in-memory sessionStats, analog naprawionego UI Garmina
5827b395) — kandydat na osobny task. Dograne też zaległe artefakty cap sync
splash-screen z FIX-C (9424e270).


### 2026-08-13: WYDANIE FIX-C — zgłoszenia z testu po południu (4 naprawy)

**Co:** czas treningu, edytor serii, czarne kafle po resume, splash na starcie.
Pełny release train: web index-C19splrj.js + iOS 103 (APPROVED, Watch w IPA) + AAB v19
(jar verified, SHA-256 9056c4a1...).

1. **Czas treningu (b1c8ed83):** ground truth z Firestore: trening 2026-08-13 miał
   startedAt 04:09:26Z, completedAt 05:28:49Z (1h19m23s), a durationSec=180. Root cause:
   fallback localStorage nie niósł startedAt/lastActivityAt/finalizedAt; przy martwym IDB
   (cała sesja na fallbacku) merge Z182 dziedziczył stęchły lastActivityAt z IDB
   (= startedAt) i clamp Z142 uznawał sesję za porzuconą (duration = bufor 3 min).
   Fix: znaczniki czasu w kształcie fallbacku (WorkoutDraft), withFallbackSave/Load
   w obie strony, resolveFresherFallback preferuje znaczniki świeższego fallbacku
   (startedAt celowo z IDB — stare fallbacki bez pola fałszowałyby go przez savedAt).
   NAPRAWA DANYCH za jawną zgodą usera: durationSec 180 -> 4763 (PATCH updateMask
   wyłącznie durationSec, wzorzec repair-duration-outliers).
2. **Edytor serii (f5845a7a):** format "N × reps" rozbity na stepper liczby serii (1-12)
   + pole powtórzeń; formaty niestandardowe (AMRAP) dostają surowe pole. Zgłoszenie:
   nie dało się edytować liczby serii w ciasnym inpucie.
3. **Czarne kafle po resume (ba988052):** kompozytor WKWebView potrafi nie przemalować
   warstw po powrocie z tła (treść jest, dotyk działa, piksele czarne — inny defekt niż
   scroll-lock b.92). forceRepaint: toggle transform na <html> przez dwie klatki,
   instalowany w main.tsx (appStateChange/visibilitychange). Główne przyczyny czarnych
   ekranów usera (martwe SDK + scroll-lock) naprawione już w b.101/102 — zrzut usera
   z 07:30 pochodził z builda sprzed fixów.
4. **Splash (6831e53b):** natywny splash z logo ZNIKAŁ po ~0.5 s i user oglądał czarną
   szczelinę do wstania weba. @capacitor/splash-screen: launchAutoHide:false +
   hide({fadeOutDuration:200}) po pierwszej klatce Reacta (hideNativeSplashWhenReady).

**Weryfikacja:** 1662 testy jednostkowe (+11 nowych TDD), typecheck, lint, build,
no-emoji, pełne e2e 394 PASS na świeżym vite (nowa zależność natywna = obowiązkowy
reset cache). Backlog z rozmowy: obciążenie dodatkowe przy ćwiczeniach bodyweight
(BW+20 kg; model: pole weight serii = dodatek, effective load = masa ciała + dodatek,
progresja reps-first) — do osobnego planu.

### 2026-08-13: FIX A-B — zbiorcze zamknięcie (zgłoszenia z treningu 2026-08-13)

**Co:** Kompletne wdrożenie obu planów naprawczych po treningu usera 2026-08-13, w jednej
pętli /loop (pełna autonomia wg `docs/PROMPT-WDROZENIE-FIX-2026-08-13.md`). Szczegóły obu
wydań w osobnych wpisach niżej (WYDANIE FIX-A, WYDANIE FIX-B).

**Dlaczego:** Trening 2026-08-13 ujawnił krytyczne problemy tuż przed launchem: martwa apka
po awarii Firestore (E-RM6GU), czarny nie-do-zamknięcia ekran, niemożliwe zakończenie
treningu press-and-holdem (timer nabił 1:18:44), fałszywe alarmy „Błąd zapisu" oraz pakiet
tarć UX (rozgrzewka bez wyjścia, PR jako szary toast, przerwa na pół ekranu, anonimowy
loader, zdublowana karta planu, analityka na losowym tygodniu, pomiary bez godziny).

**Root cause'y (skrót):** (1) asercja b815 Firestore po resume WKWebView zabija SDK do końca
życia strony — nawigacja SPA nic nie naprawia, jedyne wyjście to pełny reload; (2) awaryjny
unmount otwartego Radix Sheet zostawia scroll-lock na body (mechanizm regresji b.92);
(3) onPointerLeave anulował hold przy drgnięciu palca; (4) catch w persistDraftSnapshot
świecił na czerwono także gdy fallback localStorage uratował dane; (5) domyślna zakładka
analityki = weekly digest zamiast bieżącego summary; (6) hasOnly w rules odrzucało nowe
pole recordedAt.

**Weryfikacja:** wszystkie kroki KOLEJKI trackera odhaczone (TDD per task, checkpoint po
każdym, celowane e2e); 2 pełne release trainy: iOS 101 i 102 APPROVED (obie grupy,
Watch/StrengthWatch.app w IPA), AAB v17 i v18 jar verified, web index-CpaMokif →
index-HByan1WC, rules przed webem przy FIX-B. Audyty Zamknięcia: kontrakt Garmin CIQ
i Apple Watch nietknięte (adnotacja w garmin/README.md, kontrakt watch 46/46).
Unit 1646→1651, e2e 394. M56 odhaczony w PLAN.md (lokalnie).

### 2026-08-13: WYDANIE FIX-B — UX treningu i porządki przed launchem

**Co:** Siedem zmian UX + jedno pole danych, pełny release train (rules + web + iOS 102 z Watch + Android AAB v18).

1. **B-T1 Zakończ rozgrzewkę (e64d4259):** WarmupRoutineDialog nie miał wyjścia poza X shadcn —
   sticky stopka z przyciskiem. Decyzja: bez animacji ćwiczeń w rozgrzewce (szum + koszt CDN).
2. **B-T2 celebracja live PR (426c8d28):** rekord w trakcie serii dostawał szary toast — teraz
   pełnoekranowy overlay (ConfettiBurst, trofeum, delta), tap/2.2 s zamyka, zawsze zamontowany
   (lekcja b.92), prefers-reduced-motion respektowane. Detekcja PR nietknięta.
3. **B-T3 chudszy pasek przerwy (916c5526):** hero countdown text-5xl → text-3xl (zabierał pół
   ekranu); widok pełnoekranowy i logika timera bez zmian.
4. **B-T4 loader z logo (713fec86):** AppLoader startowy = app-icon.png z pulsem zamiast Loader2.
5. **B-T5 Dashboard odchudzony (a7d0d632):** karta planu usunięta (dublowała /plan), ostatni PR
   przeniesiony do Analityki; Cykle dostały stały przycisk na stronie Planu (jedyne wejście na
   mobile żyło na usuwanej karcie). Niezmiennik "nic nie znika" w dashboard-order.test.
6. **B-T6 domyślna zakładka analityki (d9e64988):** bez ?tab= otwiera się summary (bieżący
   tydzień), nie weekly digest z "randomowym" tygodniem; link z Dashboardu jawnie ?tab=summary.
7. **B-T7 recordedAt w pomiarach (a85cf218):** epoch ms wykonania pomiaru — typ, zapis
   Date.now(), rules hasOnly + walidacja typu (test:rules RED→GREEN), godzina w historii.
   Rules zdeployowane PRZED webem (stare klienty nie wysyłają pola — kolejność bezpieczna).

**Weryfikacja:** bramki (1651 testów, typecheck, lint, build, no-emoji) + komplet test:rules;
pełne e2e 394 PASS na świeżym vite. Rules na prod → web live index-HByan1WC.js na
app.strengthsave.app. iOS build 102 (1.0.0): obie grupy TestFlight (204/204), whatsNew 200,
Beta App Review APPROVED, Watch/StrengthWatch.app w IPA. Android AAB versionCode 18:
jar verified, SHA-256 83451521a0b652f4aa3b062461366601433de1323ee240b43b79d6cfb902409d.

### 2026-08-13: WYDANIE FIX-A — stabilność przed launchem (zgłoszenia z treningu 2026-08-13)

**Co:** Cztery naprawy stabilności + pełny release train (web + iOS 101 z Watch + Android AAB v17).

1. **A-T1 crash-guard Firestore (c357bbeb):** po `INTERNAL ASSERTION FAILED` (screen usera E-RM6GU,
   b815 po resume WKWebView) SDK jest martwe do końca życia strony. Globalny guard
   (unhandledrejection/error, instalacja w main.tsx przed renderem) robi kontrolowany reload
   z anti-loopem raz na 2 min; draft przeżywa w IDB/localStorage. ErrorBoundary i
   RouteCrashFallback przy asercji pokazują „Uruchom ponownie" i robią hard reload
   (nawigacja SPA nie wskrzesza SDK — root cause „Wróć na Dashboard" nic nie naprawiał).
2. **A-T2 releaseBodyLocks (8d7d3dc8):** awaryjny unmount otwartego Radix Sheet zostawiał
   na body pointer-events:none + scroll-lock (mechanizm regresji b.92, „czarny ekran po
   Twoich liczbach"). ErrorBoundary w componentDidCatch zdejmuje blokady i osierocone
   overlaye — fallback zawsze klikalny. Test niezmiennika w error-boundary.test.tsx.
3. **A-T3 przycisk zakończenia (e28ac0fa):** press-and-hold (ring 900 ms) zawodził na
   siłowni — drgnięcie palca = onPointerLeave anulował hold (timer nabił 1:18:44).
   Powrót do zwykłego przycisku + istniejące potwierdzenie [Anuluj]/[Potwierdź].
   HoldToFinishButton usunięty.
4. **A-T4 błąd zapisu tylko po totalnym failu (994f1e81):** czerwony „Błąd zapisu" leciał
   z KAŻDEGO wyjątku saveActiveDraft, także gdy fallback localStorage uratował dane.
   Teraz: DraftSaveTotalFailure('fallback') tylko gdy IDB + retry + localStorage padły;
   1. fail = cichy retry po 3 s, czerwony od 2. z rzędu; stage/streak do client_errors
   (code draft-save-total-failure — whitelist eventów telemetrii w rules nietknięta).

**Weryfikacja:** 1647 testów jednostkowych PASS, typecheck, lint, build, check:no-emoji;
pełne e2e 394 PASS na świeżym vite (sekwencja start→wyjście→powrót→zakończ→sync pokryta
specami resume-after-kill/full-app/continue-workout). Web live: index-CpaMokif.js na
app.strengthsave.app. iOS build 101 (MARKETING_VERSION 1.0.0): upload OK, obie grupy
TestFlight (204/204), whatsNew 200, Beta App Review APPROVED, Watch/StrengthWatch.app
w IPA (unzip -l). Android AAB versionCode 17: jar verified,
SHA-256 7a38d0b54ee56f913da5c58915ab88d20f2d0da3da513713d6dde9cf66eeaf9b.

### 2026-08-13: PRO A-E — zbiorcze zamknięcie pakietu (5 wydań w jedną pętlę /loop)

**Co:** pełny pakiet PRO wykonany autonomicznie od A do Z w jednej pętli /loop (2026-08-12 wieczór → 2026-08-13 noc): 5 planów, 21 tasków TDD, 5 pełnych wydań (web + iOS TestFlight z Watch + Android AAB), sekcja Zamknięcie (audyt Garmin/Watch). Szczegóły per wydanie w 5 wpisach niżej (A: de-emojizacja + bramka; B: header/inbox/nav; C: moment WOW; D: gamifikacja; E: Dashboard hero-first). Kamień **M55** w PLAN.md.

**Dlaczego:** kontrakt PRO = jakość wykonania jako wyróżnik (wizja: zero socjalu, gamifikacja tylko wokół realnego progresu); wszystkie 5 planów to warstwa prezentacji — zero zmian modelu danych, rules, functions i kontraktów urządzeń.

**Root cause'y przekrojowe (lekcje):** (1) guard i18n Z168 skanuje `components/` — testy komponentów z polskimi diakrytykami muszą żyć w `src/test/` (konwencja repo, 6 nowych testów tam trafiło); (2) TOAST_REMOVE_DELAY=1000000: toast wisi do zamknięcia i przechwytuje kliknięcia w menu (pre-existing flake webkit, fix testowy z jawnym dismissem); (3) trzy e2e znały tylko „Dzisiaj wolne" — od Runna B2 dzień wolny to „Dzień regeneracji"; pękły dopiero przy zmianie daty na czwartek (datozależność, wszystkie trzy wzorce rozszerzone); (4) mock ConfettiBurst wołający onDone w renderze unieważniał własne asercje; (5) vi.mock hoisting + transitive `@/lib/firebase` w testach stron (pułapki z memory, rozwiązane vi.hoisted + mock).

**Weryfikacja końcowa:** unit 1616→**1642** (26 nowych testów), e2e 392→**394** (nowy dashboard-order), typecheck/lint/build/`check:no-emoji` zielone przy każdym wydaniu; Garmin: zero plików kontraktu CIQ dotkniętych (adnotacja w garmin/README.md); Watch: StrengthWatch.app w IPA wszystkich 5 buildów, 36/36 testów kontraktu. Artefakty: web `index-De466VIE.js` (live), iOS **96-100** (wszystkie APPROVED obie grupy), AAB **v12-v16** (wszystkie `jar verified`). NASTĘPNY bump iOS = 101, versionCode = 17.

**Po stronie usera:** testy urządzeniowe 5 wydań (scenariusze w wpisach per wydanie); upload AAB do Play po weryfikacji konta Google.

### 2026-08-13: PRO wydanie E — Dashboard hero-first, hierarchia zamiast ściany kart (WYDANE)

**Co (plan `docs/PLAN-PRO-E-2026-08-12.md`, wykonanie przez /loop wg `docs/PROMPT-WDROZENIE-PRO.md`, commity `2a415f2a`→ bump v16):**
(T1) `DashboardStatusSlot`: prezentacyjny slot komunikatów stanu — renderuje wyłącznie najwyższy priorytet, resztę za togglem „Pozostałe komunikaty (n)"; (T2) 4 banery (sync/offline 100, urlop 80, tryb „nie na 100%" 70, przedłużenie planu 60) przeniesione 1:1 do slotu — warunki logiczne nietknięte; (T3) hero-first: karta dnia (trening/ukończony/regeneracja, wrapper `dash-hero`) zaraz pod powitaniem, slot za nią, ProUpsellBanner zepchnięty pod kafle statystyk; sekcje z data-testid + nowy e2e `dashboard-order.spec.ts` pilnujący kolejności pionowej; (T4) karta „Twój plan" bez listy dni (zostaje meta + progress + CTA; dni żyją w WeekCard i sekcji „Plan tygodnia" — koniec potrójnego powtórzenia; osierocone dayColors usunięte).

**Dlaczego:** user po otwarciu apki w 2 sekundy wie, co dziś robi (lekcja Runna v3: ekran dnia to plan, nie hub); ściana 4 banerów nad treningiem zamieniona na jeden świadomie rozwijany slot; upsell nie konkuruje z treningiem.

**Root cause napotkany (3 wystąpienia tej samej pułapki):** asercje e2e karty dnia (`full-app`, `ui-improvements`, `critical`) znały tylko „Dzisiaj wolne", a od Runna p.1 B2 dzień wolny to karta „Dzień regeneracji" — pękły dopiero, gdy data przeskoczyła na czwartek (dzień wolny w mocku). Datozależność, nie regresja refaktoru; wszystkie trzy wzorce rozszerzone.

**Niezmiennik (zasada 5, testowane):** wszystkie elementy Dashboardu osiągalne — zmieniona wyłącznie kolejność i zwijanie; testidy `today-completed-card`/`recovery-card`/`week-card` zachowane dla istniejących kontraktów.

**Weryfikacja (wszystko zielone):** unit 1642/1642 (214 plików; nowe: slot 3), typecheck, lint, build, `check:no-emoji` (171), e2e pełne 392/392 + critical po fixie 18/18 (nowy dashboard-order 2/2; jedyny inny fail = flake wyścigu edycji cardio, PASS przy retry).

**Deploy (pre-autoryzowany, WYKONANY):** web live `index-De466VIE.js` (Published, hash zweryfikowany); iOS build **100** upload OK, `StrengthWatch.app` w IPA, obie grupy TestFlight (204/204, whatsNew 200), betaReviewState **APPROVED**; Android AAB **versionCode 16** BUILD SUCCESSFUL, `jar verified`, SHA-256 `2d7150e6a250e0850b04c4c222adc21c19e2b12bd87337420b1a12b176814802`. Wersje marketingowe 1.0.0 bez zmian. NASTĘPNY bump iOS = 101, versionCode = 17.

**Po stronie usera:** scenariusz sekwencji na urządzeniu: start treningu z hero-karty → wyjście → szybki trening → powrót → zakończenie → sync; Dashboard z banerami (offline + urlop naraz → slot pokazuje offline, toggle ujawnia urlop).

### 2026-08-13: PRO wydanie D — gamifikacja progresu, duma na wierzch (WYDANE)

**Co (plan `docs/PLAN-PRO-D-2026-08-12.md`, wykonanie przez /loop wg `docs/PROMPT-WDROZENIE-PRO.md`, commity `4dbbc37b`→ bump v15):**
(T1) `src/components/kinetic/AchievementBadge.tsx`: jeden kształt odznaki (heksagon CSS clip-path, bez SVG assetów), tier przez materiał (gradienty brąz/srebro/złoto/platyna + tusz per tier), ghost = ten sam kształt 8% krycia bez kłódki, rozmiary sm/md, opcjonalny pasek postępu; (T2) Postępy: kamienie milowe i odznaki specjalne na AchievementBadge (`tierForIndex` w achievements-utils: [b,b,s,g,p] z pozycji progu; specjalne w jednolitym srebrze; Lock usunięty); (T3) Profil: pasek postępu poziomu pod chipami (pola progress/next z computeTier, dotąd ignorowane; elite bez paska); (T4) nieużywany `TrainingHeatmap` osadzony na Postępach (własny Card „Mapa treningowa" + wybór roku; Strava poza zakresem ekranu); (T5) `diffMilestones` (czysta funkcja) + emisja wpisu `badge` do inboxa przy finalizacji treningu (statystyki przed/po z załadowanej listy, zero odczytów; kategorie workouts+tonnage — records wymaga pipeline'u Postępów, a PR-y i tak lądują jako `pr`); (T6) sekcja dumy w Profilu: 3 najwyższe zdobyte odznaki z agregatu (workoutCount/totalTonnageKg, fallback okno recent), zero odznak = brak sekcji, link „Wszystkie" → /achievements.

**Dlaczego:** zgodnie z wizją produktu (gamifikacja tylko wokół realnego progresu): score tieru bez zmian (treningi + 2×PR), zero punktów za czynności obsługowe, jeden kształt odznaki zamiast tęczy kafli z kłódkami; duma widoczna w Profilu bez wchodzenia w Postępy.

**Root cause'y napotkane:** vi.mock hoisting (fixture w vi.hoisted) i transitive import `@/lib/firebase` wywracający jsdom (Auth INTERNAL ASSERTION) — obie pułapki znane z memory projektu, rozwiązane mockami; `Milestone.progress` jest 0-100, komponent przyjmuje 0-1 (konwersja przy renderze).

**Weryfikacja (wszystko zielone):** unit 1639/1639 (213 plików; nowe: badge 2, diff 2, heatmapa 1, pride 1, tier-progress 1), typecheck, lint, build, `check:no-emoji` (170), e2e pełne **392/392** (świeży vite, 4.2 min).

**Deploy (pre-autoryzowany, WYKONANY):** web live `index-DOy_Icwi.js` (Published, hash zweryfikowany); iOS build **99** upload OK, `StrengthWatch.app` w IPA, obie grupy TestFlight (204/204, whatsNew 200), betaReviewState **APPROVED**; Android AAB **versionCode 15** BUILD SUCCESSFUL, `jar verified`, SHA-256 `b5ba79b3448ddbaaa37e5c12940435f1846eef2c89896d53fee63a4b5dc90a0c`. Wersje marketingowe 1.0.0 bez zmian. NASTĘPNY bump iOS = 100, versionCode = 16.

**Po stronie usera:** wizualnie na urządzeniu: Postępy (odznaki materiałowe + ghost + heatmapa, dark mode), Profil (pasek poziomu, sekcja dumy), dzwonek po treningu z kamieniem milowym (wpis „Nowa odznaka").

### 2026-08-12: PRO wydanie C — moment WOW po treningu (WYDANE)

**Co (plan `docs/PLAN-PRO-C-2026-08-12.md`, wykonanie przez /loop wg `docs/PROMPT-WDROZENIE-PRO.md`, commity `2935075a`→`8d9b442b`):**
(T1) każdy PR w podsumowaniu z deltą względem poprzedniego rekordu (`formatPRDelta` w pr-utils, "+5 kg"/"+2"/"+30s"; pierwszy rekord bez bazy = bez delty); (T2) karta metryk z hierarchią hero: tonaż text-5xl jako jedyna dominująca liczba (wzorzec WHOOP), czas+serie drugorzędne w rzędzie; stara karta „Trening ukończony" z siatką 2×2 USUNIĘTA (dublowała metryki) — zostaje wyłącznie baner sync-pending (status ≠ gratulacja, zasada 6), licznik ćwiczeń w nagłówku listy („Ćwiczenia (N)"); (T3) confetti tylko dla rzadkich momentów: prop `bigMoment ?? prs.length > 0` (furtka pod kamienie milowe PRO-D), zwykły trening = czysty ekran + AutoAdvance min(celebrationMs,1200); Dashboard confetti wyłącznie `?welcome=1` (po `?celebrate=1` zostaje highlight + „+1" w headerze); (T4) toast live PR z deltą (bestBefore w stanie pending — ten sam baseline max(historia, backfill) co detekcja), haptyka już była.

**Dlaczego:** jedna liczba czytelna z wyciągniętej ręki zamiast trzech równych kolumn i drugiej karty z czterema; delta odpowiada na "o ile lepiej", nie tylko "lepiej"; confetti codziennie = confetti nigdy (inflacja nagrody).

**Root cause'y napotkane:** test polityki confetti z planu sam się unieważniał (mock ConfettiBurst wołał onDone synchronicznie w renderze → setStage wyrzucał confetti z DOM przed asercją; fix: mock bez onDone); AutoAdvance z planu miał sztywne 1200 ms, a stare testy sekwencji przekazują celebrationMs=30 i czekają waitForem 1000 ms (fix: min(celebrationMs, 1200)).

**Weryfikacja (wszystko zielone):** unit 1632/1632 (209 plików; nowe: delta 2, confetti 2, formatPRValue z B), typecheck, lint, build, `check:no-emoji` (169), e2e pełne **392/392** (świeży vite, 4.2 min).

**Deploy (pre-autoryzowany, WYKONANY):** web live `index-DaIzuDtB.js` (Published, hash zweryfikowany); iOS build **98** upload OK, `StrengthWatch.app` w IPA, obie grupy TestFlight (204/204, whatsNew 200), betaReviewState **APPROVED**; Android AAB **versionCode 14** BUILD SUCCESSFUL, `jar verified`, SHA-256 `961319d2045e9da4e4b7c8180cc5256871643f939c19ff56d53d2c5dd984c792`. Wersje marketingowe 1.0.0 bez zmian. NASTĘPNY bump iOS = 99, versionCode = 15.

**Po stronie usera:** scenariusz sekwencji na iPhone: serie z live PR (wibracja + toast z deltą) → wyjście → powrót → zakończenie bez PR (czysty ekran, bez confetti) i z PR (confetti + delty) → hero-tonaż → Dashboard bez drugiego confetti.

### 2026-08-12: PRO wydanie B — avatar w headerze, centrum powiadomień, Postępy w bottom nav (WYDANE)

**Co (plan `docs/PLAN-PRO-B-2026-08-12.md`, wykonanie przez /loop wg `docs/PROMPT-WDROZENIE-PRO.md`, commity `7f30bfa0`→`55de59da`):**
(T1) czysty moduł `src/lib/notification-inbox.ts`: lokalny inbox per uid na localStorage (limit 50, wersjonowany klucz `ss_inbox_v1_*`, odporny na uszkodzony JSON, event `ss-inbox-change`), zero sieci; (T2) `NotificationBell` w headerze: kropka nieprzeczytanych, sheet Radix ZAWSZE zamontowany i sterowany wyłącznie `open` (lekcja builda 92), otwarcie = markAllRead, empty state, ikony per typ; (T3) avatar w headerze (zdjęcie/inicjały) jako jedyna mobilna trasa do Profilu, 5. slot bottom nav = Postępy (`/achievements`, labelKey `nav.progress` — w sidebarze etykieta zmienia się z 'Osiągnięcia' na 'Postępy'), `rootPaths` = {/, /plan, /history, /exercises, /achievements, /analytics} (Profil dostaje strzałkę wstecz); (T4) po zakończeniu treningu każdy PR trafia do inboxa (obok toastu): `formatPRValue` wyniesiony do `pr-utils` i współdzielony z podsumowaniem treningu.

**Dlaczego:** wzorzec rynkowy (avatar = Profil, dzwonek = centrum zdarzeń) uwalnia 5. slot nawigacji dla Postępów (fundament pod PRO-D gamifikację); inbox lokalny bo header renderuje się wszędzie i nie może trzymać szerokich listenerów Firestore (Z216).

**Weryfikacja (wszystko zielone):** unit 1628/1628 (207 plików; nowe: inbox 4, bell 3, nav 1, formatPRValue 3), typecheck, lint, build, `check:no-emoji` (169 plików), e2e pełne: 389/392 + 3 oczekiwane aktualizacje speców po T3 (sidebar 'Postępy', achievements legalnie w bottom nav — `929a1a96`), po nich 8/8; mobile-nav-reachability przepisany na nowy niezmiennik (Profil przez avatar).

**Deploy (pre-autoryzowany, WYKONANY):** web live `index-GODEYLhM.js` (Published, hash zweryfikowany na app.strengthsave.app); iOS build **97** upload OK, `StrengthWatch.app` w IPA, obie grupy TestFlight (HTTP 204/204, whatsNew 200), betaReviewState **APPROVED**; Android AAB **versionCode 13** BUILD SUCCESSFUL, `jar verified`, SHA-256 `a50bf1f19bcb2bbd907fe522a5307777f24deec078974e5e12521c4ad1dd7011` (upload do Play poza zakresem). Wersje marketingowe 1.0.0 bez zmian. NASTĘPNY bump iOS = 98, versionCode = 14.

**Po stronie usera:** scenariusz sekwencji na urządzeniu: trening z PR → zakończ → Dashboard: kropka na dzwonku → wpis PR w inboxie → zamknij (kropka znika); avatar → Profil (strzałka wstecz); zakładka Postępy; start z planu → wyjście → powrót (nic nie zniknęło).

### 2026-08-12: PRO wydanie A — de-emojizacja chrome UI + bramka check:no-emoji (WYDANE)

**Co (plan `docs/PLAN-PRO-A-2026-08-12.md`, wykonanie przez /loop wg `docs/PROMPT-WDROZENIE-PRO.md`, commity `9ed4b3b5`→`06a106a2`):**
(T1) wspólna mapa `src/lib/activity-icons.ts` (typ aktywności → ikona lucide, fallback Medal) zastępuje 3 zduplikowane mapy emoji; (T2) TrainingDayCard: ✅❌🏋️ → CheckCircle2/XCircle/Dumbbell, tło missed `bg-destructive/10` (zasada 8); (T3) badge'e ExerciseCard: 🎯📅⬆⬇↺🏆 → Target/CalendarCheck/TrendingUp/TrendingDown/RotateCcw/Trophy; (T4) DayPlan (pusty stan, rozgrzewka, zasady, stretching) + karta regeneracji Dashboardu: 💪🧘🔥⚡⏱️🔄 → Dumbbell/Leaf/Flame/Zap/Timer/Repeat; (T5) StravaActivityCard/Detail/AddCardioDialog na wspólnej mapie, ❤️→Heart, ↗→MoveUpRight, 👍 kudos → sama liczba, interfejs CardioPR BEZ pola emoji (CardioPersonalBests mapuje kategorię na Footprints/Ruler/Mountain/Medal); (T6) toasty PR w obu locale bez 🏆, badge Analytics Trophy + `text-fitness-warning` (fix kontrastu po text-yellow-700), puste stany Strava i RacePredictor na Footprints; (T7) share card: 💪 usunięty, 🏆 → typograficzny "PR ·"; (T8) trwała bramka `npm run check:no-emoji` (skan components/pages/i18n/share-utils ze stripem komentarzy jak guard i18n Z168, whitelist tylko Analytics-copy-do-schowka) + domknięte 17 resztek (nagłówki ✓ gridu serii → Check, TrainingPlan ⚡⏱️ → Zap/Timer, 🏠 indoor → Home, import '✓'→'OK', i18n bez ✓/💪).

**Dlaczego:** kontrakt PRO: chrome UI bez emoji (spójny język ikon lucide, kontrola koloru wg zasady 8: kolor tylko gdy niesie informację), emoji zostaje wyłącznie w treści kopiowanej do schowka i nierenderowanych polach danych. Bramka pilnuje regresji na zawsze.

**Root cause'y napotkane:** (1) guard i18n Z168 skanuje `components/` — test komponentu z polskimi diakrytykami musi żyć w `src/test/` (konwencja repo); (2) pre-existing flake e2e webkit: toast autostartu (TOAST_REMOVE_DELAY=1000000, wisi do zamknięcia) przechwytywał klik w menuitem "Zamień ćwiczenie" — pada IDENTYCZNIE na commicie sprzed planu A (`88b88cdc`), więc nie regresja; fix testowy: czekaj na toast i zamknij przed otwarciem menu (`2fe333a0`).

**Weryfikacja (wszystko zielone):** unit 1617/1617 (204 pliki), typecheck, lint, build, `check:no-emoji` OK (168 plików), e2e pełne 392/392 po stabilizacji (świeży vite, 4.4 min).

**Deploy (pre-autoryzowany, WYKONANY):** web live `index-iHRC0bdg.js` (gh-pages Published, hash zweryfikowany na app.strengthsave.app); iOS build **96** upload OK, `StrengthWatch.app` w IPA, obie grupy TestFlight (HTTP 204/204, whatsNew 200), betaReviewState **APPROVED** (dystrybucję zrobił zintegrowany krok [2/2] release-ios.sh, odpowiednik testflight_external.py — nie dublowano zgłoszenia); Android AAB **versionCode 12** BUILD SUCCESSFUL, `jar verified`, SHA-256 `e5f133838dda0e247c2d20d100c0d5c3437efe48cd92c15861f6f04bc8269b47` (upload do Play poza zakresem — konto czeka na weryfikację Google). MARKETING_VERSION/versionName = 1.0.0 bez zmian. NASTĘPNY bump iOS = 97, versionCode = 13.

**Po stronie usera:** scenariusz urządzeniowy wydania A: Dashboard → DayPlan → trening (badge'e) → zakończenie (toast rekordu) → karta udostępniania (4 szablony) — zero emoji na każdym kroku.

### 2026-08-12: Runna pakiet 1, WYDANIE 2 (etap C: odstępstwa od planu) — kroki 12-17 w kodzie

**Co (spec `docs/superpowers/specs/2026-08-11-runna-pakiet-1-design.md`, wykonanie przez /loop wg `docs/PROMPT-WDROZENIE-RUNNA-PAKIET-1.md`, commity `81fac5c1`→`2f43ba68` + krok 17):**

*Etap C — życie rozjeżdża plan:* (12) **Pomiń trening** (C1): stan skipped per data (pole na dokumencie planu, rules hasOnly + testy, mapper sprawdzony), wejścia z menu karty dnia i z traya, odwracalne, wygaszony checkmark w karcie tygodnia, silnik neutralny wobec skipa; (13) **tray zaległości** (C2, wersja minimalna): `detectLapse` (nieukończona/nieodpuszczona sesja starsza niż 2 dni w oknie 14 dni ALBO pusty miniony tydzień planu; świeże 1-2 dni zostają w banerze przełożenia), `LapseTray` bottom sheet w tonie neutralnym [Odpuść]/[Przełóż]/[Kontynuuj od dziś] (masowe odpuszczenie zaległych dat JEDNYM zapisem pola + comeback silnika: przerwa 14+ dni od ćwiczenia = propozycja -10%, `deload.break`), pamięć odrzucenia per zaległość (localStorage), cisza przy żywym drafcie, sheet domykany PRZED mutacją (lekcja b.92); (14) **tryb "nie na 100%"** (C3): `ReducedMode` 3-14 dni (lżej -20% / tylko główne boje / pauza), propozycje liczone od BAZY sprzed trybu, rampa powrotna 85% → 92% → 100% per sesja ćwiczenia, badge na Dashboardzie (stan jawny, wyłączalny w każdej chwili), push przed końcem trybu (functions + testy), kolizja z deloadem: tryb WYGRYWA, nic się nie dubluje; (15) **tryb urlopu** (C4): deklaracja z datami 3-21 dni, deload cyklu przesuwa się na tydzień wyjazdu (przerwa PEŁNI ROLĘ deloadu), cykl wydłuża się o pełne tygodnie (id dni bez zmian — niezmiennik X19), rampa jak C3, push powrotny, anulowanie przed startem i w trakcie, jeden tryb naraz (UI blokuje drugi); (16) **ad-hoc zasila silnik** (C5): audyt — tonaż tygodnia już działał (week-card liczy wszystkie sesje); luka: cały silnik matchował po `exerciseId`, a ćwiczenia ad-hoc mają syntetyczne `adhoc-ex-<slug>` + snapshot nazwy; domknięcie: `matchesExerciseEntry` (id LUB identyczny snapshot nazwy, gdy w parze uczestniczy strona ad-hoc — planowe wpisy między cyklami bez zmian) wpięty w historię (`getExerciseHistory`/tracked), propozycje (`getNextSetAdvice`, `computeWeeklyTargets`, `suggestEarlyDeload`), metryki (ocena "za ciężko", ból, RZA), rekordy (`pr-utils` best*/`detectNewPRs`: bez fałszywego PR w sesji planowej po mocnym ad-hoc, PR w ad-hoc widzi rekord planowy) i rampę trybów.

**Dlaczego:** research Runny cz. 1 (TOP 1/6/7): życie rozjeżdża plan — apka wychodzi do usera z czystym restartem w 1 tap zamiast ściany zaległości; wszystkie korekty żyją WYŁĄCZNIE w propozycjach (zasada "adaptacja za zgodą"), plan/cykl/historia nietknięte bez tapnięcia.

**Niezmiennik globalny (testowany per krok):** user, który nic nie pomija, nie włącza trybów i nie robi ad-hoc, ma DOKŁADNIE dzisiejsze zachowanie; wywołania silnika bez snapshotu nazwy zachowują się jak dotąd.

**Fix bramek (krok 17):** tray zaległości zasłaniał `main` (inert Radixa) w 31 testach e2e — mockowy plan ma zaplanowane dni w przeszłości bez sesji, więc tray otwierał się w każdym teście Dashboardu; fix: seed pamięci odrzuceń (`fittracker_lapse_dismissed_v1`, pełne okno detekcji) w `playwright.config.ts` przez `use.storageState` — testy traya czyszczą klucz u siebie, zachowanie produkcyjne bez zmian. Drugi fail (warmup-persistence, spinner po reload) = flake zwietrzałego dev servera, potwierdzona lekcja #9 (świeży vite → zielone).

**Weryfikacja (krok 17, wszystko zielone):** unit 1614/1614, `typecheck` + `lint`, `build` + `build:mobile` + `check:dist-smoke` (bundle startuje w Chromium), `test:rules` 203/203 (JDK21 z homebrew: `JAVA_HOME=/opt/homebrew/opt/openjdk@21`), testy functions 222 passed / 7 skipped, `e2e:mock` 196/196 (2.9 min, świeży vite).

**Deploy (krok 18, pre-autoryzowany, WYKONANY 2026-08-12):** functions `Deploy complete` na fittracker-workouts, w tym NOWE `reducedModeEndingPush` + `vacationEndingPush` (Successful create, us-central1); web live `index-Dvg_7x86.js` (gh-pages Published, hash zweryfikowany na app.strengthsave.app); iOS build **95** UPLOAD SUCCEEDED (Delivery UUID dd9bfa15-6dff-4411-a44f-bcba217fdf02), obie grupy TestFlight podpięte (HTTP 204/204, whatsNew 200), betaReviewState **APPROVED**; Android AAB **versionCode 11** BUILD SUCCESSFUL, `jar verified`, SHA-256 `16fde5c7c793b913aa5ae835831a35a3ef62b30e8185355156a8030e5796628d` (upload do Play poza zakresem — konto czeka na weryfikację Google). NASTĘPNY bump iOS = 96, versionCode = 12.

**Po stronie usera:** testy urządzeniowe wydania 2 na iPhone (build 95): pomiń trening z menu karty dnia i cofnięcie, tray zaległości po 3+ dniach przerwy (każda z opcji), tryb "nie na 100%" (wejście z Profilu i traya, badge, rampa po końcu, push przed końcem), tryb urlopu (deklaracja z datami, push powrotny, anulowanie), szybki trening → propozycja ciężaru w planie uwzględnia ad-hoc.

### 2026-08-12: Runna pakiet 1, WYDANIE 1 (pętla sesji + tydzień) — kroki 1-10 wdrożone w kodzie

**Co (spec `docs/superpowers/specs/2026-08-11-runna-pakiet-1-design.md`, wykonanie przez /loop wg `docs/PROMPT-WDROZENIE-RUNNA-PAKIET-1.md`, commity `58815634`→`27b5bfb3`):**

*Decyzje zakresu (dyskusja z userem 2026-08-12):* pełny zakres w DWÓCH wydaniach (A+B+backfill teraz, etap C po deployu wydania 1); A3 bez osobnego ekranu przeglądu (edycja z podsumowania przez istniejący tryb edycji); dodany backfill rekordów (A5); deploy OBU wydań pre-autoryzowany w czacie ("wdroz wszystkie poprawki").

*Etap A — pętla po sesji:* (1) ocena sesji: pola `sessionRating`/`sessionRatingReasons` na dokumencie workouts (rules hasOnly + zamknięta lista wartości, 4 testy rules), czysty builder `workout-session-rating.ts`, przejście przez `sanitizeWorkoutDoc` (lekcja b.88), `saveWorkoutSessionRating` celowo BEZ writeId/revision (ocena po finalnym zapisie; offline = mutation queue Firestore; utrata = brak sygnału, nic nie wisi); (2) `WorkoutCompletionSequence`: celebracja (ConfettiBurst+haptyka) → kciuk/chipsy (pomijalne X) → rating-gate → podsumowanie deterministyczne (`computeCompletionSummary`: hero tonaż/czas/serie, plan vs wykonanie, delta wolumenu vs poprzednia sesja dnia) + blok PR per ćwiczenie; tylko ŚWIEŻO zakończona sesja (justCompleted), wejście z historii bez zmian; zombie-guard: edycja gasi justCompleted; (3) "Popraw serie" z podsumowania → istniejący tryb edycji (rewizja z serwera, clampSet, writeId); (4) ocena zasila silnik (spec A2, "za zgodą"): `lastSessionRatedTooHeavy` + flaga w `decideNextSet` gasi WYŁĄCZNIE podbicie (reasonKey `hold.rated`), deload przy plateau ma priorytet, spięte w `getNextSetAdvice` i `computeWeeklyTargets`; (5) share: szablon `story` 1080x1920 wg raportu 3.2 (hero wybierane: tonaż/PR/czas, glass, pasek "Tydzień N z M", brand; nowy domyślny), realne dane (duration, PR-y, completedSets, week) + PR NA ŻYWO w sesji (`live-pr.ts`: toast raz per ćwiczenie + badge na karcie; brak historii ≠ PR); (6) backfill rekordów (A5): `users.prBackfill` (zamknięta mapa squat/bench/deadlift 0-600 kg, rules + mapper), dialog w Profilu (TWOJE DANE, jednostka usera, miękkie "na pewno?" >400 kg, pusty formularz czyści), detekcja PR = max(historia, backfill), matcher nazw PL/EN z foldem znaków (warianty NIE dziedziczą).

*Etap B — Dashboard i ekran treningu:* (7) karta tygodnia (`week-card.ts` + `WeekCard`): "Tydzień N z M" + badge Deload + checkmarki 7 dni (przełożony w NOWEJ dacie przez kanoniczny resolver; skipped strukturalnie pod krok 12) + pasek sesji (dni zaplanowane) + tonaż tygodnia (ad-hoc dokłada); (8) kolejność Dashboardu wg B2 (dziś → tydzień → reszta → Szybki trening na dole) + dzień wolny jako karta "Dzień regeneracji" (`recovery-tips.ts`: tip ogólny + tip pod partię z wczoraj, deterministyczne); (9) przerwa-hero w RestBar (wielki countdown + "Następne: X kg × N", po końcu wraca; deadline/notyfikacje NIETKNIĘTE — pilnują istniejące testy) + `HoldToFinishButton` (przytrzymanie 900 ms z ringiem, tap = hint, Enter = fallback do istniejącego potwierdzenia).

**Dlaczego:** research Runny (`docs/RESEARCH-RUNNA-2026-08-11.md`): pętla nagrody po KAŻDEJ sesji (nie raz w tygodniu), telemetria RPE dla silnika z 1 tapa, tydzień jako domykana jednostka, share card jako jedyny kanał organicznego wzrostu, backfill żeby celebracja PR nie gratulowała starych ciężarów.

**Niezmiennik globalny (testowany per krok):** user, który niczego nie ocenia i nie używa nowych funkcji, ma DOKŁADNIE dzisiejsze zachowanie apki; brak oceny = progresja identyczna jak dziś; wejście w ukończony trening z historii bez celebracji; wszystkie elementy Dashboardu obecne (przesunięte, nie usunięte).

**Weryfikacja (krok 10, wszystko zielone):** unit 1557/1557 (79 nowych testów w 10 plikach), `typecheck` + `lint`, `build` + `build:mobile` + `check:dist-smoke` (bundle startuje w Chromium), `test:rules` 0 FAIL (JDK21), `e2e:mock` 196/196 (1.8 min, świeży vite).

**Deploy (krok 11, pre-autoryzowany, WYKONANY 2026-08-12):** web live `index-Dm9M5Rhz.js` (gh-pages Published, hash zweryfikowany na app.strengthsave.app); iOS build **94** UPLOAD SUCCEEDED (Delivery UUID 0b7c2832), obie grupy TestFlight podpięte (HTTP 204/204, whatsNew 200), betaReviewState **APPROVED**; Android AAB **versionCode 10** BUILD SUCCESSFUL, `jar verified`, SHA-256 `e004131b1c6f059b3dfc616a9885d04dc2f709b0a313e71af6265360fd6fc63b` (upload do Play poza zakresem — konto czeka na weryfikację Google). NASTĘPNY bump iOS = 95, versionCode = 11. Etap C (skip, tray, tryby, ad-hoc audyt) startuje po tym wydaniu.

**Po stronie usera:** testy urządzeniowe wydania 1 na iPhone: completion (celebracja → ocena → podsumowanie → edycja serii), press-and-hold, przerwa-hero, share story (render w WKWebView), backfill w Profilu, karta tygodnia z przełożonym dniem.

---

### 2026-08-11: Przełożenie treningu (scheduleOverrides) + krok marketingowy onboardingu — kroki 1-10 wdrożone w kodzie

**Co (spec `docs/superpowers/specs/2026-08-11-przelozenie-treningu-onboarding-marketing-design.md`, wykonanie przez /loop wg `docs/PROMPT-WDROZENIE-PRZELOZENIE-ONBOARDING-2026-08-11.md`, commity `683f05f0`→`108645fb`):**

*Feature A — przełożenie treningu:* (1) kanoniczny resolver `resolvePlannedDay(dateISO, planDays, scheduleOverrides)` w `src/lib/plan-schedule.ts` (override: null = wolne, osierocony dayId ignorowany z fallbackiem weekday) + wspólny fixture `fixtures/cross-platform/schedule-overrides-v1.json` (14 przypadków); (2) rules: `scheduleOverrides` w hasOnly `training_plans` + `is map` + limit 60 wpisów (głęboka walidacja kluczy YYYY-MM-DD i wartości string|null w kodzie — rules nie iterują po mapach, konwencja Z41); (3) `src/lib/schedule-overrides.ts`: sanitize, pruning >28 dni, `buildScheduleMove` (move {A: null, B: dayId} / swap jako JEDNA mapa = atomowy zapis pola + LWW), czyszczenie przy zmianie zestawu dni w transakcji zapisu planu (edycja ćwiczeń NIE czyści); `moveScheduledDay` w `useTrainingPlan` offline-first (setDoc merge do lokalnej kolejki, bez blokowania na potwierdzeniu); (4) UI: `RescheduleSheet` (14 dni, zajętość, zapowiedź swapu), akcja na karcie dnia (ukryta dla ukończonych/przeszłych; żywy draft = toast blokady), `MissedWorkoutBanner` + `findMissedWorkout` (7 dni wstecz, [Zrób dziś] tylko gdy dziś wolne, krzyżyk = odrzucenie zapamiętane per data), Dashboard/`useWatchPlanPreview` liczą przez resolver; (5) mirror resolvera w `functions/src/garmin-day.ts` (`resolvePlannedGarminDay`) + `garminDay` czyta pole z dokumentu planu, parity web↔functions na wspólnym fixture, protokół CIQ bez zmian; (6) hak e2e `setE2EPlanMeta` seeduje overrides + spec `e2e/reschedule.spec.ts`.

*Feature B — krok marketingowy onboardingu:* dedykowany ekran `OnboardingMarketingStep` (wzorzec Runna "Be the first to know": mock powiadomienia w HTML/CSS, [Jasne, wchodzę!]/[Nie, dzięki], treść oświadczenia na ekranie, zero pre-selekcji) po konfiguracji planu, przed PlanPreview — pozycja wg realnej struktury (zgody prawne są na Welcome, nie na końcu jak zakładał spec). Zapis ISTNIEJĄCYM `recordConsent`: granted/withdrawn (odmowa też do logu), kanał `onboarding-marketing-step` (nowa wartość CHANNELS w functions), wersja dokumentu bez zmian; mirror.marketingVersion = odpowiedź zapamiętana (krok nie wraca); wstecz bez zapisu; awaria zapisu = komunikat + retry (wzorzec Welcome). Welcome ma teraz DOKŁADNIE 3 checkboxy (`showMarketing={false}` tylko w PlanWizard); ConsentGate/ConsentSettings nietknięte.

**Dlaczego:** user nie mógł przenieść niezrobionego treningu na inny dzień ("dzisiaj nie byłem na treningu, chcę go zrobić jutro" — wzorzec Runny); zgoda marketingowa jako 4. checkbox na ekranie prawnym miała zerową konwersję perswazyjną i mieszała marketing z RODO. Drag&drop świadomie POZA v1 (ryzyko regresji touch w WKWebView).

**Niezmienniki (zasada #5):** przełożenie zmienia wyłącznie mapowanie data→dzień (historia, drafty, listy ćwiczeń, progresja po exercise.id, cykle i id dni X19 nietknięte — testy sekwencji `reschedule-sequence.test.ts`); bez overrides wszystkie funkcje harmonogramu działają bajt w bajt jak dotąd; stare wywołania `buildGarminDayContext` bez zmian.

**Weryfikacja (krok 10, wszystko zielone):** unit 1478/1478 (49 nowych testów), functions 218/218, `test:rules` (JDK21), `build` + `build:mobile` + `check:dist-smoke`, `e2e:mock` 195/195, parity web↔functions 15/15, typecheck + lint obu paczek.

**Hotfix regresji builda 92 (2026-08-12, commit `83f8deea`, release za zgodą usera):** zwiecha po wyborze daty w RescheduleSheet (unmount otwartego Radix Sheet -> wiszący scroll-lock na body w WKWebView) + kropki HybridWeekStrip bez overrides. Fix: zamrożony kontekst sheeta + zamknięcie przed zapisem + kropki z resolvera. Zapis usera w bazie działał od początku. Wydane: web live `index-BKHP0trQ.js` (zweryfikowany, user potwierdził działanie), iOS build **93** obie grupy (HTTP 204/204, whatsNew 200), betaReviewState **APPROVED**, Android AAB **versionCode 9** `jar verified`, SHA-256 `0f4b2d9a034a5328664cdf7dedaaa18823732170e312c5e1af625c818506e138`. NASTĘPNY bump iOS = 94, versionCode = 10.

**Deploy (krok 12, pre-autoryzowany, WYKONANY 2026-08-11 wieczór):** rules released; functions `garminDay` + `recordConsent` updated (us-central1); web live `index-DIuIrMmX.js` (gh-pages `162b1715`, Pages built, hash zweryfikowany na app.strengthsave.app); iOS build **92** upload SUCCEEDED, obie grupy TestFlight podpięte (HTTP 204/204, whatsNew 200), betaReviewState **APPROVED**; Android AAB **versionCode 8** `jar verified`, SHA-256 `e9020d60a89b58373df18e313145f0e3798737ae45c4b146aeaa72a10cc5adce` (upload do Play poza zakresem — konto czeka na weryfikację Google). NASTĘPNY bump iOS = 93, versionCode = 9.

**Po stronie usera:** testy urządzeniowe na TestFlight (build 92): scenariusz przełożenia (przełóż → start → wyjście → szybki trening → powrót → dokończenie → sync + baner niezrobionego treningu) oraz przejście onboardingu na świeżym koncie (krok marketingowy + 3 checkboxy); Play upload po weryfikacji konta Google.

---

### 2026-08-11: Redesign Profilu wariant A — kroki 1-6 wdrożone w kodzie (deploy: czeka na zgodę usera)

**Co (spec `docs/superpowers/specs/2026-08-11-profil-redesign-design.md`, wykonanie przez /loop wg `docs/PROMPT-WDROZENIE-PROFIL-2026-08-11.md`, commity `b06b4ff9`→`382fcba0`):**
(1) rename poziomów gamifikacyjnych: "Pro Tier"→"Veteran", "Elite Tier"→"Elite" (progi w `tier.ts` bez zmian); (2) chipy nagłówka: [PRO] wypełniony primary tylko dla planu płatnego/trial/comp/admin (`hasProPlan(planKey)`, darmowy user BEZ chipa FREE) + [poziom] outline wyciszony zawsze (`ProfileHeaderChips` zastąpił `TierBadge`); (3) reorganizacja sekcji: Nagłówek → TRENING (rename z "Preferencje treningu", wchodzi Dźwięk z "Aplikacji") → TWOJE DANE → SUBSKRYPCJA (kod 1:1, tylko pozycja) → KONTO → APLIKACJA → POMOC (rename z "Wsparcie") → SYSTEM (nowa: Zaawansowane + Admin) → Wyloguj + Usuń konto; (4) wiersz Powiadomienia pokazuje stan z `getPushPermission()` (granted = Włączone, inaczej Wyłączone); (5) reset hasła za dialogiem potwierdzenia (wcześniej mail leciał po jednym tapnięciu); (6) faza 2: zębatka przy RestBar otwiera bottom sheet (timer wł/wył, domyślna przerwa, dźwięk) — TE SAME klucze zapisu co Profil, stałe wyniesione do `lib/workout-preferences.ts`, zero zmian logiki zapisu.

**Dlaczego:** sekcje Profilu odzwierciedlały historię kodu, nie model mentalny usera (ustawienia timera w dwóch sekcjach, "Wsparcie" jako worek na Admin/Zaawansowane); badge "Pro Tier" z gamifikacji zderzał się znaczeniowo z planem PRO z sekcji Subskrypcja; ustawienia zmieniane najczęściej (timer, przerwa, dźwięk) mają być najwyżej i dostępne z ekranu treningu.

**Weryfikacja:** vitest 172 pliki / 1397 PASS, w tym nowe: `tier-labels` (etykiety PL+EN), `profile-header-chips` (hasProPlan per planKey + render), `profile-sections` (niezmiennik zasady #5: wszystkie wiersze/akcje obecne, kolejność sekcji, stany powiadomień, reset za potwierdzeniem, sekwencje sheet↔Profil dla przerwy/dźwięku/timera), zębatka w `rest-bar`. Typecheck, lint, `build`, `build:mobile` + `check:dist-smoke` zielone. Pułapka z wdrożenia: nowy transitive import `@/lib/firebase` (RestBar→WorkoutSettingsSheet) wywalił 2 testy ExerciseCard na realnym `initializeAuth` — fix: mock `@/lib/firebase` w tych testach.

**Deploy (za zgodą usera "wdrażaj", 2026-08-11 wieczór):** web LIVE `index-cuBgCpM2.js` ✔; iOS build 91 TestFlight (archive+export+upload, obie grupy, whatsNew, Beta App Review APPROVED; Delivery `c24c7e6c`) ✔; Android AAB `versionCode 7` podpisany (`jar verified`, SHA-256 `7efc4145…b079dcd3`), gotowy do Play — upload zablokowany do końca weryfikacji konta organizacji przez Google ✔; Watch bez zmian kodu, jedzie w archiwum 91 ✔; Garmin nietknięty (protokół bez zmian) ✔. Następny bump iOS = 92.

### 2026-08-11: Build 90 — sekcja "Subskrypcja" w Profilu + startedAt z webhooka RC (wdrożone: functions + web + iOS)

**Feature (zgłoszenie usera):** "od kiedy do kiedy mam premium" widoczne w apce. Spec: `docs/superpowers/specs/2026-08-11-subscription-section-design.md`.

**Zakres:** (1) webhook RC zapisuje `startedAt` z `purchased_at_ms` (początek bieżącego okresu; dokumenty sprzed zmiany dostaną pole przy najbliższym evencie); (2) klient: `startedAt` w `SubscriptionState`/`useSubscription` z fallbackiem `latestPurchaseDate` z CustomerInfo na native; (3) czysty formatter `subscription-summary.ts` (admin/comp/trial/monthly/yearly z odnawia-wygasa-grace/brak) + sekcja w Profilu z "Zarządzaj subskrypcją" (App Store) i "Przejdź na PRO" tylko na platformie paywalla. Weryfikacja builda 86 po drodze: metryki pokazały pierwszą udaną wymianę `ExchangeAppAttestAttestation` 200 w historii projektu (fix App Check potwierdzony na urządzeniu).

**Deploy:** functions `revenuecatWebhook` ✔, web `index-fv6Dq5H5.js` live (zawiera też fix bramki zgód z builda 88) ✔, iOS build 90 TestFlight (obie grupy, Beta App Review APPROVED) ✔. Build 89 pominięty celowo: równoległa sesja wydała 88 (fix bramki zgód), user wyznaczył 90 dla tego feature'u. Następny bump = 91. Testy: 1371/1371 (w tym 8 nowych formattera, 2 webhooka).

### 2026-08-11: Build 88 — bramka zgód wisiała na spinnerze mimo udanego zapisu (mapper gubił mirror)

**Zgłoszenie usera (build 87, 17:27):** zaakceptował 4 zgody, spinner kręcił się w nieskończoność. **Dowody, nie hipoteza:** log `recordConsent` 15:27:36 UTC "Callable request verification passed" (auth VALID, app MISSING = fallback z builda 86 działał), Firestore `users/{uid}` updateTime 15:27:37 z KOMPLETNYM mirrorem (terms 2.0, privacy 2.0, health 1.0, marketing 1.0) zgodnym co do znaku z `LEGAL_VERSIONS`. Backend działał; `mapAppUserProfile` budował profil pole po polu i NIE przenosił `consents`, więc `needsConsentRefresh` nigdy nie robiło się false. Dotyczyło KAŻDEGO usera na 87 i na web (index-CcUCiX0m). **Fix:** przeniesienie pola + typy (`ConsentMirror` w `AppUserProfile` i `UserProfile`); test czerwony przed fixem w `user-profile.test.ts`. Vitest 1362 PASS. **Wdrożone:** web `index-DyYGCCbr.js` LIVE, iOS build 88 na TestFlight (obie grupy, Beta App Review APPROVED). Następny bump = 89. **Do rozważenia (sesja legal):** ConsentGate po sukcesie trzyma spinner bez timeoutu czekając na snapshot — reguła #6 wymaga wyjścia (timeout + komunikat). **Lekcja:** mapper typu "pole po polu" to miejsce, gdzie nowe pola dokumentu giną domyślnie; test nowej funkcji musi pokrywać CAŁĄ pętlę (zapis → snapshot → warunek UI), nie tylko zapis.

### 2026-08-11: Pakiet prawny v2 — dokumenty 2.0, consent engine, compliance (3 plany, spec: docs/superpowers/specs/2026-08-11-legal-pack-design.md)

**Kontekst:** dwa raporty deep research (audyt prawny UE+USA) wykazały luki P0: jeden zbiorczy checkbox zgód naruszał RODO (zgoda zdrowotna art. 9 musi być odrębna i wyraźna; polityki prywatności się nie "akceptuje"), zgoda nigdzie nie była zapisywana (zero dowodu), brak dokumentu MHMDA (stan Waszyngton, bez progów, private right of action). Decyzje usera: marketing z opt-in, arbitraż US z 30-dniowym opt-out, wszystkie zgody wyciągalne do CSV z datą+godziną+IP, stare /legal/*.html usunięte (buildy <=85 to tylko testy TF).

**Plan 1 (landing, repo strength_save_landing, commit 7ab1f34, LIVE na Vercel):** Regulamin 2.0 i Privacy 2.0 PL/EN (assumption of risk z carve-outem 385(3)/473 kc dla UE, reklamacje 14 dni + wymagania techniczne z UŚUDE, sekcja arbitrażowa "U.S. residents only", klauzule API: Strava 48h/Usage Data/zakaz AI, HealthKit, Health Connect, Garmin; rejestr zgód z IP jako nowe przetwarzanie; karencja 30 dni), NOWE: Polityka Cookies 1.0 (zero trackerów = bez banera) i Consumer Health Data Privacy Policy 1.0 EN (MHMDA/NV, osobny link w stopce — twardy wymóg ustawy). Źródło dokumentów: src/data/legal/*.html + build-legal.mjs (JSON generowany); archiwum wersji /legal-archive/. Benchmarki konkurencji (Hevy, Strong) potwierdziły, że oba mają słabe dokumenty (Hevy: zero medical disclaimera; Strong: retencja "indefinitely").

**Plan 2 (consent engine, commit cf4139f6):** 4 rozdzielone checkboxy w onboardingu (regulamin+16 lat, zapoznanie z privacy, WYRAŹNA zgoda zdrowotna, opcjonalny marketing), Cloud Function recordConsent (IP z x-forwarded-for, timestamp serwerowy, pełna treść oświadczenia + wersja dokumentu, batch do kolekcji consents + mirror users/{uid}.consents), ConsentGate (re-consent istniejących userów; bump wersji w legal-versions.ts = re-consent), ustawienia zgód (wycofanie zdrowotnej blokuje pomiary + metryki RPE/ból, konto zostaje — zasada #6: stan ma wyjście), rules (consents: read admin, write tylko backend; mirror poza whitelistą users). Kolekcja consents CELOWO poza kasowaniem GDPR (dowód rozliczalności, opisane w polityce). E2e bypass na VITE_E2E_MODE (seedowani userzy nie mają mirrora).

**Plan 3 (admin+compliance):** panel admina: karta "Log zgód" + eksport CSV (createdAtUtc, email, uid, typ, akcja, wersja, język, kanał, wersja aplikacji, IP, treść oświadczenia; RFC 4180 + BOM dla Excela). Dokumenty wewnętrzne: docs/legal/RCPD.md (obowiązkowy mimo solo dev — art. 30 ust. 5, bo dane art. 9), PROCEDURA-NARUSZEN.md (72h), REJESTR-WERSJI.md (procedura bumpa dokumentów: functions PRZED webem), DPA-CHECKLIST.md. Digest zweryfikowany: czysto serwisowy (zero treści promo w szablonie), więc bez osobnej zgody; przy dodaniu promo → gate na marketingGranted.

**Weryfikacja:** vitest front 167 plików/1358+ PASS (w tym nowe: consents walidacja+IP+mirror, parity wersji src/functions, PlanWizard 3 checkboxy, ConsentGate, CSV), functions 210 PASS, rules 183 PASS (5 nowych o consents), lint 0, typecheck OK, build+dist-smoke OK, e2e:mock 194 PASS (1 test zaktualizowany na nowe checkboxy). Deploy: rules + functions:recordConsent + web + landing LIVE.

**Zastrzeżenie:** dokumenty to kompletne wersje robocze na bazie raportów; przed launchem przegląd radcy prawnego (miejsca sporne oznaczone w spec "do potwierdzenia z prawnikiem": m.in. blokujący charakter zgody zdrowotnej w onboardingu, koszty arbitrażu AAA).

### 2026-08-11: Build 86 — logowanie iOS martwe na buildzie 85 (App Check: DeviceCheck zamiast App Attest)

**Zgłoszenie usera:** ekran "Nie udało się wczytać profilu" po zalogowaniu, na OBU kontach (g.jasionowicz@gmail.com i grzegorzee@gmail.com), build 85 z TestFlight.

**Root cause (dowody z metryk GCP, nie hipoteza):** na iOS `syncUserProfile` idzie przez `callNativeAttestedFunction`, który najpierw pobiera token App Check. Fabryka providera App Attest była rejestrowana dopiero, gdy JS zawołał `FirebaseAppCheck.initialize()` — a instancja App Check powstawała wcześniej (plugin `@capacitor-firebase/authentication` + `FirebaseApp.configure()` w `load()` pluginu przy starcie bridge'a) z DOMYŚLNYM providerem DeviceCheck. Konsola Firebase ma skonfigurowany tylko App Attest, więc `ExchangeDeviceCheckToken` zwracał 400 FAILED_PRECONDITION, `getToken` rzucał i request o profil NIGDY nie wychodził z telefonu (zero wpisów w logach Cloud Run w oknie awarii; metryki serviceruntime: przez cały tydzień ZERO wymian App Attest, 2x DeviceCheck 400 dokładnie w oknach prób logowania usera). Błąd niezależny od konta — blokował każdego użytkownika natywnego iOS.

**Fix 1 (root cause, `AppDelegate.swift`):** rejestracja `StrengthAppCheckProviderFactory` (AppAttestProvider) + `FirebaseApp.configure()` jako PIERWSZE linie `didFinishLaunching`, zanim bridge Capacitora załaduje pluginy Firebase. Moduły `FirebaseCore`/`FirebaseAppCheck` widoczne w targecie App transytywnie przez SPM (bez zmian w pbxproj; zweryfikowane `xcodebuild ... BUILD SUCCEEDED`).

**Fix 2 (wyjście z błędu, `src/lib/native-callable.ts`):** token App Check pobierany best-effort. Gdy attestacja padnie (zależność zewnętrzna: Secure Enclave/serwery Apple/wymiana Firebase), request idzie BEZ nagłówka `X-Firebase-AppCheck` — backend nie wymusza App Check na callables, a rejestrację nowych kont i tak gate'uje serwerowo `canCreateUserProfile`. Zasada #6 z CLAUDE.md: stan błędu musi mieć wyjście; wcześniej awaria attestacji trwale odcinała logowanie. Test: `native-callable.test.ts` ("falls back to a request without App Check header when attestation fails").

**Weryfikacja po wydaniu 86:** logowanie na realnym urządzeniu + w metrykach `serviceruntime.googleapis.com/api/request_count` dla `firebaseappcheck.googleapis.com` mają się pojawić wymiany `ExchangeAppAttestAttestation/Assertion` z kodem 200 (dotąd zero w historii projektu).

**iOS build 85 (odblokowany i wydany):** user włączył App Attest w portalu, ale samo włączenie unieważniło WSZYSTKIE trzy profile (App/Watch/Widgets: stan INVALID w portalu, lokalne kopie sprzed zmiany bez entitlementu). Naprawa bez klikania w portalu: ASC API delete+create wszystkich 3 profili (te same nazwy, cert DISTRIBUTION F52LLKV85G, ACTIVE), instalacja świeżych .mobileprovision (stare w backupie), weryfikacja `appattest-environment: [development, production]` w profilu App. `ExportOptions-manual.plist` przepięty z UUID na NAZWY profili (odporność na przyszłe regeneracje; plik gitignored, zmiana lokalna). Rezultat: archive SUCCEEDED, export, upload (Delivery UUID 58c4a57a), build 85 VALID, obie grupy TestFlight podpięte, whatsNew ustawione, Beta App Review **APPROVED**. Lekcja: włączenie capability na App ID ZAWSZE unieważnia istniejące profile; regeneruj przez ASC API (profiles delete+create) i trzymaj ExportOptions na nazwach.

**Cennik (decyzja OSTATECZNA usera, zamyka A3):** roczny **119,99 zł / $31.99** (miesięczny 14,99 zł / $3.99 bez zmian). Zaplanowana w ASC zmiana z X25 (od 2026-08-12) zostaje. Opcjonalny wariant na launch: intro/promo 99,99 zł za pierwszy rok przy cenie katalogowej 119,99.

**Przegląd animacji ćwiczeń (na żądanie usera, rozszerza Z248):** pełny audyt 137 klipów z CDN. Metoda: 7 agentów oceniało siatki klatek świeżym okiem wg kryteriów README; 45 flag merytorycznych przeszło DRUGĄ, sceptyczną weryfikację (45/45 potwierdzone, każda z konkretnym opisem defektu); flagi czysto stylistyczne skalibrowane ręcznie na 17 obrazach (styl glow = OK, stary szablon "preparatu anatomicznego" = kosmetyka). Wynik: **45 klipów zdjętych z `ANIMATION_FILES`** (pokazywały inne ćwiczenie/sprzęt/chwyt/mięśnie: lepszy placeholder niż kłamstwo; pliki na CDN nietknięte, przywrócenie = jedna linia po wymianie klipu), 9 kosmetycznych zostaje do wymiany, 6 flag stylu odrzucone. Wdrożone na web (`index-DQ9u8oyG.js` live, vitest 1345 PASS); iOS dostanie w buildzie 86. Raport i kolejka produkcji 160 klipów (93 nowe + 13 stare FAIL + 45 wymian + 9 kosmetyk, ~8 h generacji w panelu Higgsfield tryb unlimited): `animacje-cwiczen/_PRZEGLAD-2026-08-11.md`. Lekcja: pojedynczy przegląd agenta popełnia błędy obu typów: bez adwersaryjnej weryfikacji zdjęlibyśmy 6 dobrych klipów (flagi stylu), a bez świeżego przeglądu zostałoby 45 błędnych z PASS-ami z produkcji.

**CI "Deploy to GitHub Pages" (czerwony od ~2026-08-03, spam maili o failach):** trzy przyczyny naprawione: (1) `rest-timer-controller.test.tsx` bez mocka `@/lib/error-telemetry` ciągnął realny init Firebase — na runnerze bez .env padał cały plik z `auth/invalid-api-key`; (2) test chipa kategorii w `exercise-picker.test.tsx` przekraczał 15 s pod coverage (timeout 30 s); (3) `ios-simulator-smoke` nie miał sekretu `VITE_REVENUECAT_APPLE_API_KEY` (dodany przez `gh secret set`). Dodatkowo `build-and-deploy` (deploy Pages z Actions) za flagą `vars.ENABLE_PAGES_DEPLOY` — kanoniczny deploy web to lokalne `npm run deploy` (gh-pages), Pages jest w trybie legacy (source: branch), więc `deploy-pages` i tak by padał. `firebase-contract-deploy` dalej wyłączony (brak `ENABLE_FIREBASE_DEPLOY`).

### 2026-08-11: X26 sesja 2 — deployed evidence (web + functions + landing; iOS 85 BLOCKED na App Attest → rozwiązane wyżej)

**Bramki (wszystkie zielone przed deployami):** vitest 1343 PASS (165 plików), typecheck, lint, e2e:mock 194/194 PASS (1.9 min, po restarcie vite + czyszczeniu node_modules/.vite wg lekcji #9), build, dist-smoke PASS, bundle-budget PASS (initial JS 1 276 965 / 1 536 000 B).

**Deployed evidence:**
- **Web:** `npm run deploy` (gh-pages) — https://app.strengthsave.app/ serwuje `index-DXkvGdPz.js` (weryfikacja curl; poprzednio index-CDA1eN0R.js). Bundle zawiera Z231-Z246 + Z249 (czyste URL-e legal).
- **Functions:** `firebase deploy --only functions --project fittracker-workouts` — Deploy complete, wszystkie funkcje zaktualizowane. `functions:list`: `deleteOwnAccount` (v2 callable, secret RESEND_API_KEY zbindowany bez błędu) i `resumeDeletionOperations` (v2 scheduled) ACTIVE. Logi po deployu czyste (scheduler odpala się co godzinę, same rutynowe starty instancji). Weryfikacja Z238 bez dotykania realnych kont. Secret `strava-redirect-uri` NIE zmieniony (decyzja: dopiero razem z Authorization Callback Domain w apce Strava; 301 z github.io nadal działa).
- **Landing (Vercel prod):** stan Z247+legal-cleanup+Z250 live: /delete-account 200; /legal/{privacy,privacy-pl,terms,terms-pl,delete-account}.html → 308 na /privacy, /terms, /delete-account; /privacy i /terms 200; treść privacy bez wzmianek o AI. INCYDENT: agent 2 (ta sesja) zdeployował landing z 8c62329 (HEAD w momencie startu kroku; deploy przez git worktree, bo working tree miał niezacommitowaną pracę agenta legal), przez co na kilka minut cofnął świeżo zdeployowany Z250 (86b6e2b); wykryte po commicie 49e7ded2 w repo app, natychmiastowy redeploy z 86b6e2b przywrócił stan. Lekcja: przy równoległych sesjach przed deployem porównaj HEAD repo i stan proda, nie polegaj na snapshotcie z początku sesji.
- **iOS build 85: BLOCKED (krok usera).** CURRENT_PROJECT_VERSION 84 → 85 zbumpowany (6 wystąpień, commit 2d57b0a6, MARKETING_VERSION 1.0.0 bez zmian). `scripts/release-ios.sh` failuje na archive: profil "Strength Save App Store" nie zawiera capability App Attest (`com.apple.developer.devicecheck.appattest-environment`) — dokładnie tak, jak przewidział Z229/X25 (entitlement celowo nieusuwany). Odblokowanie: user w Apple Developer portal włącza App Attest dla App ID `com.grzegorzjasionowicz.strengthsave` i odtwarza profil "Strength Save App Store", potem `scripts/release-ios.sh` + `testflight_external.py 85` (obie grupy + Beta App Review).
- **Z248 (dokumentacja):** FAZA 7 planu zaktualizowana: 137/243 klipów na CDN (`_cdn/`: 137 mp4 + 137 jpg), kolejka `_STATUS.md`: 131 PASS, 16 FAIL (7 ODŁOŻONE), 96 TODO. Produkcja klipów = osobna sesja z budżetem Higgsfield.

**Otwarte decyzje usera (bez zmian):** A1 strzałka na paywallu (rekomendacja: zostawić), A2 web billing (odłożone), A3 cennik roczny 99,99 vs 119,99 zł (zmiana ASC z X25 planowana od 2026-08-12; w tej sesji ZERO zmian cen). Po odblokowaniu profilu: testy urządzeniowe builda 85. Play Console: URL usuwania konta https://strengthsave.app/delete-account (live). Przy submisji ASC/Play wpisać czyste URL-e https://strengthsave.app/privacy i /terms.

### 2026-08-11: X26 sesja 1 — feedback z przeglądu builda 84 WDROŻONY w kodzie (Z231-Z247)

**Źródło:** przegląd usera na iPhone (8 screenshotów + głosowe zgłoszenia) + wymóg Play (URL usuwania konta). Plan: `docs/PLAN-X26-2026-08-11.md`, research planów: `docs/RESEARCH-PLANY-TRENINGOWE-2026-08-11.md`.

**Decyzje:**
- Onboarding ODMROŻONY (uchyla zamrożenie z X25): "Witaj w Strength Save" zamiast "Iron Zone", checkbox zgód (regulamin+prywatność) blokujący Dalej, pole imienia z zapisem do displayName, `termsAcceptedAt` w mapie onboarding (rules bez zmian).
- Root cause strzałki wstecz z Podglądu planu: XOR-owy render w Onboarding remountował PlanWizard i `useState` wracał na krok 1; fix przez `resumeStep` (wzorzec `startAtPrecision` z NewPlan). Swipe-back wyłączony w onboardingu.
- Paywall: "Trener AI" (martwy wpis, stack AI usunięty 2026-07-03) → "Inteligentna progresja"; Strava zdjęta z piedestału ("i integracje"). Ryzyko App Review 2.3 zamknięte.
- Wylogowanie: dialog potwierdzenia + spinner; cleanup (garmin/watch/push) równolegle `Promise.allSettled` z timeoutem 3 s przed signOut (było 4 sekwencyjne awaity = 3-5 s martwego przycisku).
- Usuwanie konta: Auth kasowany OD RAZU, dane po 30-dniowej karencji (cron `resumeDeletionOperations`, zapytanie tylko po `purgeAfter` bez composite indexu); mail powiadomienia do operatora (kontakt@gjasionowicz.pl przez Resend, best-effort). Anulowanie w karencji: ręcznie wg instrukcji z maila.
- Język: domyślnie EN, polski TYLKO dla polskiego locale; zapisany wybór usera wygrywa.
- Reset onboardingu z powrotem dla każdego usera (osobna karta w Ustawieniach; od Z90.4 był za isAdmin).
- 12 nowych gotowych planów (24 łącznie): Nippard minimalist, BWS full body, GZCLP, kalistenika RR, Strong Curves, PHUL, 5/3/1 BBB, RP mezocykl, PHAT, UL+PPL hybrid, nSuns, Arnold Split. 100% ćwiczeń z istniejącej biblioteki.
- Strona usuwania konta: NA ŻYCZENIE USERA bez statycznego HTML — istniejąca strona React `https://strengthsave.app/delete-account` (copy o karencji 30 dni) + redirect 308 z `/legal/delete-account.html` (repo landing, commit 4d504e9). Ten URL wpisać w Play Console.
- Z245 (kadr modala animacji 4:3) był już naprawiony w HEAD — bez zmian.

**Weryfikacja:** vitest app 1343 PASS (165 plików), functions 198 PASS, typecheck+lint czyste; commity 4d3a96c8, da608657, 05def0f3, 08ef1f18, 5aa0fd45.

**Ogony (sesja 2, prompt: `docs/PROMPT-X26-KONTYNUACJA.md`):** e2e mock + build + dist-smoke, deploy web/functions/landing, iOS build 85 + TestFlight (obie grupy), weryfikacje URL, aktualizacja stanu animacji (137/243). Otwarte decyzje usera: A1 strzałka na paywallu (rekomendacja: zostawić), A2 web billing (później), A3 cennik roczny 99,99 (dziś, user akceptował) vs 119,99 zł (decyzja X25, zmiana ASC planowana od 2026-08-12). Polityka prywatności na landingu nadal wspomina "Trenera AI" — do poprawy przy aktualizacji legali.

### 2026-08-10: aplikacja webowa pod https://app.strengthsave.app/ (custom domain zamiast github.io)

**Decyzja:** Web apka serwowana z app.strengthsave.app (GitHub Pages custom domain). Landing (strengthsave.app, Vercel) linkuje do niej tylko z /download, a strona główna promuje wyłącznie mobilki (bez web apki w hero, testflightNote i FAQ).

**Co zrobione:**
- DNS: CNAME `app` -> grzegorzee.github.io (Cloudflare, DNS only, token w `_secrets/projekty/strengthsave-domain-admin.env`)
- GitHub Pages: `cname=app.strengthsave.app`, `https_enforced=true` (cert Let's Encrypt wydany)
- vite base `'/'` (web), PWA scope/start_url `'/'`, `public/CNAME` (bez niego deploy gh-pages kasuje custom domain)
- playwright.config, playwright.emulator.config, e2e/emulator/plan-lifecycle, check:dist-offline: baseURL bez `/strength-save/`
- Firebase Auth authorized domains + `app.strengthsave.app` (identitytoolkit admin/v2 PATCH; token z `--account g.jasionowicz@gmail.com` + nagłówek `x-goog-user-project`, konto grzegorzee nie ma uprawnień)
- functions: `WEB_URL` digestu i `inviteUrl` na nową domenę (kod w repo, funkcje NIE przedeployowane; stare linki działają przez 301)
- Landing: `WEB_APP_URL` -> nowa domena, hero eyebrow "iOS · Android · Apple Watch", testflightNote i FAQ bez promowania web apki

**Dlaczego:** brandowy adres zamiast github.io; strona główna ma sprzedawać aplikacje mobilne, web zostaje jako kanał dla zaproszonych (karta na /download).

**Weryfikacja:** vitest+lint+typecheck zielone, dist-smoke passed; https://app.strengthsave.app/ 200 z nowym bundlem (index-CDA1eN0R.js), strava-callback.html 200; stary URL github.io/strength-save 301 na nową domenę (ścieżka+query zachowane, więc Strava OAuth działa bez zmiany redirect_uri); bundle landinga na prod bez "Web app included", z nowym URL-em.

**Ogony:**
- `stravaRedirectUri` (param funkcji) wciąż wskazuje github.io; przy najbliższym deployu functions zaktualizować param i Authorization Callback Domain w ustawieniach apki Strava (do tego czasu 301 załatwia sprawę)
- starzy userzy web PWA z github.io: zainstalowana PWA może serwować stary cache (SW nie zaktualizuje się przez redirect); rozwiązanie: wejście/reinstalacja z nowej domeny
- RTK potrafi streszczać JSON z curl/gh do schematu; przy debugowaniu API używać `rtk proxy`

### 2026-08-10 — plan X25: najpierw rejestracja i release, onboarding zamrożony

**Decyzja usera:** można wykonać wszystkie rekomendacje z audytu kosztów i gotowości do wydania, ale w X25 nie przebudowujemy ani nie skracamy onboardingu. Szczegółowy plan test-first i autonomiczny prompt `/goal` + `/loop` są zapisane w `docs/PLAN-X25-LAUNCH-2026-08-10.md` oraz `docs/PROMPT-X25-LOOP-2026-08-10.md`.

**Cennik (zastępuje wcześniejsze decyzje cenowe niżej w tym pliku):** miesięczny 14,99 zł / $3.99, roczny 119,99 zł / $31.99. Roczny odpowiada 10,00 zł / $2.67 miesięcznie i daje około 33% oszczędności, czyli praktycznie cztery miesiące gratis. Trial: 7 dni monthly i 14 dni yearly. Paywall ma używać cen i intro period z RevenueCat/StoreKit oraz pokazywać trial wyłącznie przy potwierdzonym `eligible`; `unknown` i `ineligible` bez obietnicy darmowego okresu.

**Wdrożenie ASC X25/Z207 (2026-08-10):** po jawnym read-before i dry-run ceny App Store zostały zaplanowane na 2026-08-12 we wszystkich 175 storefrontach (POL/USA: 14,99/3.99 monthly i 119,99/31.99 yearly), a triale zastąpione na `ONE_WEEK`/`TWO_WEEKS`; końcowy read-back ma 0 braków i 175/175 ofert na produkt. RevenueCat Apple nadal używa jednego `pro` i offeringu `default`. Google Play/RC Android pozostają bramą zewnętrzną opisaną w `docs/X25-MONETIZATION-STATUS.md`; nie utworzono atrap produktów ani drugiego entitlementu.

**Sesja autonomiczna 2026-08-10 (przejęcie po limicie Codexa), Z208-Z222 wdrożone:** eligibility-aware paywall (Z208) i dynamiczna prezentacja ceny (Z209) na obu platformach; batching telemetrii (Z211), dedup push (Z212), pomiary/aktywności/treningi per ekran (Z213/Z214/Z216) z agregatem all-time (Z217, trigger+backfill+fallback, obie funkcje ACTIVE); mapa historii z golden freeze (Z215), kontrakt paginacji (Z218); a11y bez warningów + pojedyncza rejestracja pluginu (Z220), zapas bundle 262 KB (Z221), funnel rejestracji/monetyzacji + dzienny raport kosztów `dailyCostDigest` (Z222). Rules 178/178, functions 198, app 1333, E2E 388 (2 flaky pojedynczo zielone). Web wdrożony na gh-pages (index-BrYBWwO-.js), rules + 3 nowe funkcje na prod. Otwarte wyłącznie KROKI USERA: profil App Attest dla archive iOS (Z229), Play Console/Google Play (Z207/Z210), realne urządzenia Watch/Garmin/iPhone/Android (Z206/Z225/Z226/Z228), submisja Connect IQ.

**Implementacja Z217, agregat all-time (2026-08-10):** `users/{uid}/aggregates/allTime` trzyma mapę wkładów per workoutId (totals przeliczane z mapy — odtwarzalne, idempotentne, odporne na at-least-once); trigger na workouts robi transakcyjny apply, a przy braku dokumentu/starym schemacie pełny rebuild historii (istniejący user nie dostanie agregatu z jednego treningu); backfill = callable `rebuildWorkoutAggregate`. Pisze wyłącznie backend (rules write false, +4 testy). Kafle Dashboardu czytają agregat z fallbackiem na obecne liczenie — przy >500 treningach agregat NAPRAWIA liczby (dotąd liczone z okna 500), nie tylko przyspiesza. Równoważność zamrożona przeciw golden Z215 (fixture 600: 374400 kg/540/1080). Obie funkcje ACTIVE na prod.

**Redukcje kosztów FAZY 4 (2026-08-10, Z211-Z214):** telemetria flush 5 min + online/pagehide/hidden (12/h zamiast 120/h); push registration deduplikowana lokalnym hashem (backend tylko przy zmianie tokenu/uid albo po 30 dniach, logout czyści stan); listener pomiarów tierowany per ekran (Dashboard/WorkoutDay sonda 25 zamiast 365, komponenty sync zero, pełna lista tylko Pomiary/Analityka/eksport) z jedną implementacją selekcji najnowszego pomiaru; listenery aktywności z oknem `sinceDate` (Dashboard od poniedziałku tygodnia planu, DayPlan od dziś), logika kart wyciągnięta do `activity-window.ts` z testem równości pełna historia vs okno na fixture 600+.

**Implementacja Z209, dynamiczna prezentacja ceny (2026-08-10):** oszczędność pakietu rocznego i cena efektywna/miesiąc są liczone z realnych cen sklepu (`yearlyValueSummary`: preferencja `pricePerMonthString` z RC, fallback Intl w locale użytkownika; procent tylko przy tej samej walucie i realnym zysku, inaczej badge znika). Hardkodowany badge „5 mies. gratis" usunięty. Lista korzyści mówi o Apple Watch i Garmin w cenie, bez sugerowania osobnej opłaty. Testy PL/EN/IDR 6/6 PASS, pełna suita 1295 PASS.

**Implementacja Z208, eligibility-aware paywall (2026-08-10):** root cause: paywall pokazywał trial bezwarunkowo (hardkodowane 30/14 dni, stare wartości), a `configurePurchases` używało klucza Apple także na Androidzie. TDD: dwa czerwone testy kontraktowe (`purchases-platform`, `paywall-eligibility`), po implementacji 5/5 PASS. Kontrakt: `revenueCatApiKeyForPlatform` daje klucz per platforma (web = null, brak fallbacku między sklepami, brak klucza = zakupy wyłączone, nie źle skonfigurowane); `resolvePurchaseOptions` na iOS uznaje za trial wyłącznie darmowy introPrice potwierdzony przez `checkTrialOrIntroductoryPriceEligibility` (status 2 = eligible; 1 i 3 = ineligible; 0 lub błąd sieci = unknown), a na Androidzie wyłącznie faktycznie zwróconą opcję Play z `freePhase` (ineligible = defaultOption/base plan, brak opcji = unknown); `trialPresentation` daje trial copy tylko przy eligible. Paywall renderuje trialLine/CTA/renewalNote warunkowo (nowe klucze `paywall.ctaNoTrial` i `paywall.renewalNoteNoTrial` w PL/EN), a zakup na Androidzie idzie przez `purchaseSubscriptionOption` dokładnie na pokazanej opcji. Usunięte bezwarunkowe obietnice „30 dni" z teasera onboardingu i banera PRO. Weryfikacja: aplikacja 155 plików/1289 PASS, typecheck, lint, build, build:mobile, dist smoke i bundle budget PASS.

**Bloker znaleziony na realnym iPhone:** `User profile missing` nie pochodzi z onboardingu. Klient native udostępnia rejestrację bez invite, ale `syncUserProfile` po stronie Functions wymaga invite dla każdego brakującego `users/{uid}`. Firebase Auth tworzy konto, backend nie tworzy profilu, `UserContext` fabrykuje fallback `pending_verification`, a automatyczne `requestEmailVerificationCode` nie znajduje dokumentu usera. Właściwy fix X25: serwerowo weryfikowalna rejestracja native przez Firebase App Check/App Attest, web nadal invite-only, bez powrotu do spoofowalnego pola `platform`; dodatkowo odporny i idempotentny bootstrap profilu dla istniejących osieroconych kont Auth.

**Priorytety po P0:** eligibility-aware paywall i nowe ceny/triale; batching telemetrii 30 s → 5 min/lifecycle; deduplikacja rejestracji push; węższe zapytania Dashboardu i paginacja historii; recent realtime + agregaty dopiero po testach równoważności; naprawa web dist-smoke, a11y i odzyskanie min. 150 KB zapasu bundle. Dane, pełna historia, offline, eksport i obecny flow onboardingu pozostają.

**Implementacja P0 (2026-08-10):** iOS i Android pobierają natywny token Firebase App Check przez `@capacitor-firebase/app-check` (App Attest / Play Integrity), a trzy callable rejestracyjne wysyłają oficjalną kopertę `{data}` z nagłówkami Firebase Auth i `X-Firebase-AppCheck`. Backend nie ufa klientowi: brak invite jest dozwolony wyłącznie dla zweryfikowanego `request.app.appId` równego dokładnemu App ID Strength Save iOS albo Android; kill switch `registrationOpen=false` ma pierwszeństwo. Web oraz każdy brakujący/obcy App Check ID pozostają invite-only. `UserContext` najpierw kończy idempotentny sync profilu, dopiero potem uruchamia listener, więc pusty snapshot nie fabrykuje profilu i nie montuje za wcześnie bramki kodu.

**Stan chmury i obu platform:** Firebase iOS ma Team ID `J4CRD2SA6D` i App Attest TTL 3600 s. Android ma Play Integrity TTL 3600 s, aktywne `playintegrity.googleapis.com` oraz SHA-256 upload key w Firebase. Wymagane `firebaseappcheck.googleapis.com` jest aktywne. `syncUserProfile` wdrożono i ma stan ACTIVE. Kontrolowane produkcyjne smoki dla dokładnych App ID obu platform przeszły `profile -> email code -> verify -> onboarding.in_progress`; oba konta techniczne usunięto przez `deleteOwnAccount`, a tymczasowe debug tokeny unieważniono. Emulator obu platform i web invite-only: 7/7 PASS. Pozostają prawdziwe atestacje z dystrybucji sklepowej: iOS build 84 z TestFlight i Android AAB `versionCode 6` z Play Internal.

**Decyzja release Android równolegle z iOS:** obie aplikacje wychodzą w tym samym publicznym oknie. Parytet obejmuje rejestrację, paywall, ceny, triale, restore i smoke zakupu. AAB 6 jest podpisany i przechodzi Gradle `assembleDebug` + `bundleRelease`; po stronie Play pozostają konto/aplikacja, pierwszy upload, akceptacja Play App Signing, dodanie SHA-1 i SHA-256 certyfikatu App signing do Firebase, powiązanie projektu Cloud w Play Integrity oraz produkty Google Play podłączone do RevenueCat.

**Decyzja: jeden produkt na pięciu powierzchniach:** zakres X25 obejmuje także web PWA, osadzony w iOS Apple Watch oraz samodzielną aplikację Garmin Connect IQ. Jedno konto i entitlement `pro` obejmują wszystkie powierzchnie bez osobnej opłaty za zegarki. Checkout i restore pozostają w App Store/Google Play; web pokazuje zsynchronizowany status i prowadzi do właściwej aplikacji mobilnej, a zegarki respektują capability/entitlement z iPhone albo backendu. Spójność oznacza te same identyfikatory, kanoniczne kg, ustawienia, PL/EN, stan sesji, offline/retry/dedup i wynik historii, ale nie sztuczne kopiowanie pełnego UI telefonu na mały ekran.

**Zakres parytetu zegarków przed wydaniem:** najpierw powstaje macierz funkcji i wersjonowany kontrakt. Apple Watch zachowuje WatchConnectivity, lokalny merge, HealthKit, one-tap i widgets, a potwierdzone braki wobec Garmin v3 są domykane bez odbierania funkcji: szybki trening, przerwy 90/150, czas/serie/tonaż, discard i jawny retry. Garmin zachowuje parowanie, kompaktowe endpointy, FIT, EventQueue i lokalne ustawienia; dochodzą testy entitlement/revoke/konflikt oraz eksport `.iq` dla wszystkich rodzin z manifestu. Release gate obejmuje web, iOS+Watch, Android i Connect IQ oraz realne scenariusze iOS<->Watch<->web i Android<->Garmin<->web bez utraty i duplikacji danych.

**Implementacja parytetu Garmin Z226:** źródłem dostępu jest dokładnie ten sam profil/subskrypcja RevenueCat w `users/{uid}` co dla web/mobile; pair/day/ingest sprawdzają go serwerowo, bez osobnego paywalla i bez zaufania do zegarka. Device token ma hash w Firestore, revoke oraz 180-dniowy TTL. Pomyślny logout najpierw revokuje wszystkie tokeny Garmina, a delete-account purge obejmuje pair codes i tokens. `403` oznacza wygasłe PRO i celowo zachowuje token/EventQueue do retry po odnowieniu; `401` oznacza revoke/expiry i wymaga re-pair, ale także nie kasuje niewysłanych eventów. Konflikt telefonu i Garmina nie tworzy już drugiego ad-hoc: touched sets są scalane po `at/updatedAt`, a transakcja wykonuje drugi merge przeciw zapisowi telefonu, który wszedł po odczycie. Legacy tuple i aliasy pozostają dla rolling deploy. Kanoniczne kg nigdy nie są zamieniane w storage; lbs to lokalna prezentacja z dokładną stałą. Cloud requesty typowego treningu: jeden day przy lifecycle/TTL/manual refresh i jeden finalny batch ingest, zero chmury per set/sekundę. Testy automatyczne i buildy pięciu reprezentatywnych urządzeń PASS; fizyczne G1-G9 na koncie technicznym pozostają bramą, ponieważ Garmin nie był podłączony.

**Wspólne zarządzanie urządzeniami Z227:** jedynym źródłem listy Watch/Garmin jest serwerowy read model `linkedDevices`, a dokumenty tokenów i lifecycle pozostają niedostępne bezpośrednio z klienta. Web/iOS/Android pokazują te same last sync/seen, pending, HealthKit/FIT i akcje refresh/unlink. Web nie uruchamia zakupu ani nie obiecuje triala; prowadzi do obu aplikacji mobilnych. Apple Watch dziedziczy potwierdzony capability z iPhone i przy revoke/expiry blokuje tylko nowe akcje, zachowując kolejkę. Garmin dostaje małą podpisaną HMAC kopertę, lecz autorytatywne PRO nadal jest sprawdzane na serwerze przy każdym request. Logout/delete/revoke odcinają oba typy zegarków; relink jest jawny. Aby utrzymać co najmniej 150 KB zapasu bundle bez podnoszenia limitu, ciężki runtime zalogowanego użytkownika jest ładowany po rozpoznaniu sesji: initial JS spadł do 1 269 850 B (266 150 B zapasu), a pełne testy, online/offline smoke i build mobile pozostają zielone. Fizyczne D1-D4 są częścią Z228, nie podstawą do fałszywego zamknięcia bram real-device Z225/Z226.

**Naprawa bramki web Z219:** `check-dist-smoke` wcześniej otwierał `/`, mimo że produkcyjny build ma Vite base `/strength-save/`, i zwracał `index.html` zamiast modułów JS. Skrypt wykrywa teraz base z wygenerowanego `index.html` i poprawnie testuje build web oraz relatywny build mobile. Pełna regresja po rozszerzeniu Android: aplikacja 1224/1224, Functions 156/156 aktywnych, emulator 7/7, E2E 194/194, lint/typecheck/build/mobile/dist/offline/bundle, Xcode generic simulator oraz Gradle PASS.

### 2026-08-06 — X24: dźwięk NATYWNIE + regulacja głośności + tytuł pod animacją (Z200-Z202, build 83)

**Zgłoszenie usera po treningu na buildzie 82:** (1) „mam wybrany dźwięk klaksonu i nie działa, nic nie słychać między seriami", (2) „dźwięk między ćwiczeniami wleciał, ale mam głośność na full a ledwo co było słychać" + prośba o regulację głośności w aplikacji, (3) „jak otwieram żeby zobaczyć ćwiczenie, box jest za duży i nachodzi na animacje".

**Root cause dźwięku (research potwierdzony źródłami, nie zgadnięty):** WKWebView ma WŁASNĄ sesję audio w OSOBNYM procesie — ignoruje kategorię AVAudioSession apki (WebKit bug 167788, otwarty od 2017), a AudioContext odpala w kategorii `ambient`: cichej, duckowanej przez inne sesje i wyciszanej przełącznikiem dzwonka (WebKit 237322). Do tego `GainNode`/`volume` na iOS w WKWebView NIE DZIAŁA wcale (Apple forum 82939 — celowa decyzja platformowa), więc żadne podbijanie gainu w JS nie mogło pomóc. Nasza własna sesja `.playback + .duckOthers` (aktywna cały czas) mogła wręcz DUCKOWAĆ ambient WebView, czyli własne sygnały. Kod JS był poprawny — grał w kanał, który system trzyma po cichu. To dokładnie „plan B: natywny AVAudioPlayer" zapisany 2026-07-24.

**Z200 (natywne granie):** lokalny plugin `TimerSound` (`ios/App/App/TimerSoundPlugin.swift`, wzorzec WatchBridge, rejestracja w BridgeViewController) gra przez AVAudioPlayer pliki z root bundla — te same `rest_{bell,horn,alarm}.wav` co UNNotificationSound plus NOWE `timer_{tick,complete}.wav` (generator `scripts/generate-timer-signals.mjs`: fala trójkątna, częstotliwości i timing 1:1 z playSynth, kompresja tanh drive 2.8, mean -8/-9 dB jak rest_*.wav). `timer-sound.ts`: native-first dla finish/tick/complete ORAZ dla odsłuchu z Ustawień (odsłuch MUSI iść realnym kanałem — cała lekcja sagi dźwięku); fallback łańcuchowy WebAudio→synteza bez zmian; fallback WebAudio wzmocniony `navigator.audioSession.type='playback'` (iOS 17+, oficjalne wyjście z ambient). Web/Android: zachowanie jak dotąd (registerPlugin bez implementacji → reject → fallback).

**Z201 (regulacja głośności):** suwak 20-100% (krok 5, domyślnie 100%) w Ustawieniach pod wyborem dźwięku, odsłuch przy puszczeniu; `timer-volume.ts` (localStorage `fittracker_timer_volume_v1`, clamp 0.2-1). Mnożnik idzie w: volume natywnego playera, gain pliku WebAudio, szczyt syntezy. Minimum 20% świadomie — pełne wyciszenie ma już przełącznik w Profilu, drugi ukryty stan „off" w suwaku to pułapka. Hint pod suwakiem: głośność powiadomienia przy zgaszonym ekranie reguluje SYSTEMOWA głośność dzwonka (tego nie obejdziemy — zasada iOS).

**Z202 (tytuł pod animacją):** blok eyebrow + h1 `display-md` (2.75rem) leżał absolute na wideo 4:3 ExerciseDetail z gradientem od dołu — przy dłuższych nazwach zakrywał dolną część ruchu (nogi/stopy ćwiczącego). Tytuł przeniesiony POD hero, gradient zdjęty (służył wyłącznie czytelności białego tekstu na wideo).

**Pułapka bramek (nauka na przyszłość):** `check:dist-smoke` NA BUILDZIE WEB zawsze pada białym ekranem — web ma base `/strength-save/` (gh-pages), a serwer smoke serwuje dist z roota → moduł wraca jako text/html. Poprawna kolejność bramek: `build:mobile` + `check:dist-smoke`, POTEM `build` (web) + `check:bundle-budget` + `check:dist-offline` (tak stoi w DECYZJE X19, łatwo przeoczyć). Druga pułapka: `npx gh-pages -d dist` przez hook rtk potrafi nie zadziałać — użyj `./node_modules/.bin/gh-pages -d dist` + `gh api .../pages/builds -X POST`.

**Weryfikacja:** vitest 1217/1217 (nowe: natywna ścieżka z głośnością, plugin pada → fallback WebAudio, głośność w gain pliku i szczycie syntezy, suwak startuje 100%/zapisuje ułamek/wraca po montowaniu), typecheck 0, lint 0, build:mobile + dist-smoke PASS, build web + bundle-budget (1 532 678 / 1 536 000 B) + dist-offline PASS, e2e:mock 193/194 + warmup-persistence solo PASS 2/2 (flake pod obciążeniem równoległych buildów, spec bez związku ze zmianami). Commity: f6d11a98 (feat sound Z200+Z201), 2275a1d1 (fix ui Z202). **Deploy:** web `index-Cmt1AhVN.js` na live (potwierdzony curl-em po force rebuild). iOS build 83: upload SUCCEEDED, obie grupy podpięte (HTTP 204+204), whatsNew ustawiony, betaReviewState APPROVED — Robert dostaje build automatycznie. **Czeka na usera (checklist background/resume):** realny test na iPhone — głośność klaksonu między seriami przy włączonym ekranie, suwak głośności, powiadomienie przy zgaszonym ekranie (dzwonek systemowy!), podgląd ćwiczenia.

### 2026-08-05 — X23 WPIS ZBIORCZY: zgłoszenia z realnego treningu na buildzie 81 naprawione u źródła (Z182-Z199)

Plan `docs/PLAN-X23-2026-08-05.md` wykonany w CAŁOŚCI metodą test-first (każdy fix ma test CZERWONY przed implementacją; szczegóły per faza w sześciu wpisach poniżej), autonomicznie w pętli /loop (6 iteracji). Zakres: **F1 sesja nieśmiertelna** (Z182 najświeższy snapshot IDB vs fallback + diagnoza read-only: chmura CZYSTA, wskrzeszenie 4xW było lokalne = klasa H2; Z183 dirty draft nowszy niż chmura wygrywa mimo rozjazdu sessionId; Z184 sanitizeSets bez fabrykatu W; Z185 sessionSwaps persystowane + samonaprawa widoku; Z186 e2e kill→kontynuuj serie 1:1); **F2 kuloodporny timer** (Z187 przerwa też po rozgrzewkowej 45 s; Z188 deadline w kontrolerze + localStorage — kill nie gubi przerwy; Z189 stan przed sygnałami + watchdog 3 s + fail-open `shouldStartRest`; Z190 test sekwencji); **F3 dialogi zamykalne** (Z191 menu zamyka się PRZED otwarciem dialogu — koniec pointer-events lock, który wymusił force-quit; Z192 X 44 px w dialog/sheet + bezpiecznik warstw; Z193 bramka e2e); **F4 miniatury** (Z194 137 posterów JPEG na Bunny; Z195 miniatura = `<img>` — WebKit nie maluje klatki wideo przy preload=metadata); **F5 input** (Z196 px-1 + kolumny 0.9/1.25/0.85 — "122.5" z zapasem ~26 px); **F6 share** (Z197 treść w dolnej 1/3, twarz czysta; Z198 "Zapisano ✓" + haptyka, AbortError bez fałszywego sukcesu; Z199 hover tylko przy kursorze — wariant globalny + active:scale). **F7:** pełne bramki z jawnymi exit code — test 136 plików / 1204, typecheck 0, lint 0, build 0, bundle 1 532 326 / 1 536 000 B (limit NIE podnoszony), dist-smoke PASS, dist-offline PASS, e2e:mock w całości zielone; sekwencja obowiązkowa plan→wyjście→szybki→powrót w e2e + nowy resume-after-kill.spec. Wdrożone: web gh-pages + iOS build 82 (TestFlight + dystrybucja do obu grup przez testflight_external.py). Tech debt (postery kadrowane, klipy TODO, group-hover, tap targety overlayów) w PLAN.md.

### 2026-08-05 — X23 FAZA 6: share bez wstydu (Z197-Z199)

**Z197 ("na zdjęciu liczby nachodzą mi na nos"):** szablon ZDJĘCIE miał w jednym flex-column DWA auto-marginesy (nagłówek `margin-bottom:auto` + stopka `margin-top:auto`) — flexbox dzielił wolną przestrzeń po równo i CENTROWAŁ statystyki w pionie (pas 35-70% wysokości = twarz na selfie); scrim przyciemniał liniowo całość, `dim=0.6` dawał brightness(0.40). Fix: JEDEN spacer `flex:1` po nagłówku (treść klei się do dołu, pas ~dolna 1/3), scrim strefowy `rgba(0,0,0,0) 0% → 0.15 45% → 0.75 68% → 0.92 100%`, dim default 0.35 (brightness 0.65 — twarz czysta), lista max 3 ćwiczenia (+N więcej). Render Playwright 540×960 potwierdza: środek kadru czysty. **Z198 ("Pobierz i zero reakcji"):** `systemShare(): Promise<boolean>` (AbortError = false, zero fałszywego sukcesu); po udanym share/anchor: `markSaved` — przycisk pokazuje "Zapisano ✓" (Check + `hapticSuccess`) przez 1.8 s; klucze `comp.share.saved` w OBU locale. **Z199 (sticky hover):** shadcn Button miał wyłącznie warianty `hover:`, a w projekcie nie było ANI JEDNEGO `@media (hover: hover)` — po tapie przyciski zostawały "podświetlone". Fix systemowy: plugin `addVariant('hover', '@media (hover: hover) and (pointer: fine) { &:hover }')` w tailwind.config — WSZYSTKIE `hover:` w apce (67 reguł w dist) działają tylko przy realnym kursorze, bez ruszania 100+ komponentów; przyciski dostały `active:scale-[0.97]` (realne poczucie tapnięcia). Pułapka do zapamiętania: globalny guard i18n (Z168) skanuje też template literale HTML — komentarze z polskimi znakami tylko w JS. Weryfikacja: vitest PASS 1204/1204, typecheck 0, lint 0, bundle 1 532 326 / 1 536 000 B (limit nie podnoszony). Commity: 2a1bf0e8, cbac6238 + Z199.

### 2026-08-05 — X23 FAZA 5: wiersz serii mieści "122.5" (Z196)

**Kontekst (build 81):** "125 nie mieści się w kratce". Root cause: `px-3` (24 px) dziedziczone z bazowego `Input` + równy podział `1fr/1fr` między KG a POWT — @390 px kolumna KG miała 50.7 px (26.7 px wnętrza), a "125" potrzebuje ~29.5 px (Inter Bold 16). Fix: `px-1` we wszystkich 7 inputach wiersza serii (klasa `.exercise-card-input` w index.css NIETKNIĘTA — współdzielona z notatkami i kalkulatorem talerzy) + proporcjonalne kolumny (weight_reps/assisted: PREV 0.9fr, KG/asysta 1.25fr, POWT 0.85fr; wdd: 1.1/1.1/0.8), nagłówek zsynchronizowany automatycznie (ten sam `gridCols`). Font ZOSTAJE 16 px (próg auto-zoomu iOS przy focusie). Rachunek @390 px po fixie: KG ~70 px wnętrza vs "122.5" ~44 px (zapas ~26 px); POWT ~46 px vs 3 cyfry ~29.5 px. Weryfikacja: vitest PASS 1198/1198, typecheck 0, lint 0.

### 2026-08-05 — X23 FAZA 4: miniatury bez czarnych kafli (Z194, Z195)

**Kontekst (build 81):** "podgląd ćwiczeń jest czarny". Root cause: Z176 oparło miniaturę o `<video preload="metadata">` bez postera, zakładając "metadata = pierwsza klatka" — w WebKit/WKWebView to FAŁSZ: Safari pobiera tylko `moov` i nie maluje ŻADNEJ klatki do pierwszego `play()`/seeka (Chromium maluje, dlatego e2e było zielone). **Z194 (pipeline):** 137 posterów JPEG wygenerowanych z pierwszej klatki (`ffmpeg select=eq(n,0)`, scale 320, ~3.5 KB/szt.) i wgranych na Bunny (`exercises/<slug>.jpg`, 137/137 OK, weryfikacja curl: HTTP/2 200 + image/jpeg na próbce 6 slugów); krok postera dopisany do `do_cdn.sh` (przyszłe klipy automatycznie), `na_bunny.sh` wysyła też `*.jpg`. Katalog poza gitem — zmiany skryptów tylko na dysku. **Z195 (apka):** nowy `getExercisePosterUrl` w exercise-media.ts (nazwa mp4 → .jpg); miniatura karty = `<img loading="lazy" decoding="async">` z fallbackiem na ikonę Dumbbell przy błędzie (ślad `exercise-poster-error` w client_errors); overlay przyciemnienia zmniejszony do `bg-black/15` (poster jest jasny); ZERO dekoderów wideo na liście treningu (twardy niezmiennik w e2e: `header video → count 0`); dialog wideo bez zmian (twardy play() z Z176). E2E z nową fixture sample-poster.jpg (route jpg/mp4 rozdzielone). Weryfikacja: vitest PASS 1197/1197, typecheck 0, lint 0, e2e exercise-video + exercise-card-v3 27/27.

### 2026-08-05 — X23 FAZA 3: dialogi zamykalne ZAWSZE (Z191-Z193)

**Kontekst (build 81):** "nie mogłem zamknąć popupu z filmem, X nie działa" — skończyło się force-quitem. Root cause: modalna warstwa DropdownMenu współistnieje z warstwą dialogu (menu zostaje w DOM przez animację zamykania, `layersWithOutsidePointerEventsDisabled` czyszczone dopiero przy unmount) → `DialogContent` pod `pointer-events: none` na body: X martwy, overlay martwy, a na iOS nie ma Escape. Wzmacniacz: X miał 16×16 px (HIG minimum 44 pt). **Z191:** DropdownMenu w ExerciseCard przeszedł na kontrolowany stan `menuOpen`; KAŻDA pozycja menu przez helper `selectFromMenu` (preventDefault → zamknij menu → `requestAnimationFrame` → akcja) — dialog otwiera się dopiero w klatce PO zniknięciu warstwy menu; miniatura wideo z guardem `menuOpen`. Test RED→GREEN: bezpośrednio po kliku "Instrukcje" menu zamknięte i dialogu JESZCZE nie ma, dialog po klatce. **Z192:** X we WSPÓLNYCH `dialog.tsx` i `sheet.tsx` dostał pole dotyku 44 px (`h-11 w-11 flex items-center justify-center`, glif bez zmian; DialogTitle z `pr-8`) + bezpiecznik warstw: efekt w DialogContent po 350 ms zdejmuje osierocone `pointer-events: none` z body, jeśli w DOM nie żyje żadna otwarta warstwa menu (`[data-state="open"][role="menu"]`) — pas bezpieczeństwa na każdą przyszłą kombinację warstw, nie zastępuje Z191. **Z193 (bramka e2e):** menu→Instrukcje→dialog→X za pierwszym kliknięciem→odhaczenie serii działa; menu otwarte→tap w miniaturę (modalne menu pochłania pierwszy tap — menu znika, dialog z kolejnego tapu działa); po obu dialogach body bez locka. Weryfikacja: vitest PASS 1196/1196, typecheck 0, lint 0, spec e2e 24/24. Commity: b2f2bd7f, 2117e964 + spec.

### 2026-08-05 — X23 FAZA 2: kuloodporny timer przerwy (Z187-Z190)

**Kontekst (build 81, realny trening):** timer między seriami się zacinał, po serii rozgrzewkowej w ogóle nie startował, a pasek "Koniec przerwy" potrafił wisieć na zawsze. **Z187:** start przerwy siedział w bloku `if (turningOn && !currentSet.isWarmup)` — po serii ROZGRZEWKOWEJ timer nigdy nie startował, mimo że `resolveRestSeconds` miał martwą od X17C gałąź `warmupSeconds`. Fix: start przerwy wyciągnięty PRZED warunek roboczych (`allDone` z guardem `!currentSet.isWarmup`); rozgrzewka dostaje 45 s, bez dźwięku "complete" i bez wliczania do końca ćwiczenia. **Z188 (refaktor architektury):** deadline przeniesiony do kontrolera `useRestTimerController` (kształt `{exerciseId, deadlineAt, totalSeconds, runId}`) z persystencją w localStorage (`fittracker_rest_state_v1`): kill apki w środku przerwy nie gubi odliczania — `resumeFromStorage()` po hydracji sesji (raz per mount, WorkoutDay) przywraca TEN SAM deadline; przy `isCompleted` zawsze stopRest. RestBar czysto prezentacyjny (deadline propsem, ±15 przez `onAdjust` do właściciela, tykanie 250 ms zostaje — kontrakt R2-07); efekt notyfikacji z dep `[runId, deadlineAt]` i t/exerciseLabel w refach — zmiana języka/nazwy nie restartuje przerwy, a korekta ±15 nadal przeplanowuje notyfikację. **Z189 (samonaprawa, 3 fixy):** (1) kolejność w efekcie końca: NAJPIERW `onFinished` (stan), POTEM sygnały w try/catch (`rest-finish-signal-failed` do client_errors) — wyjątek dźwięku nie zostawia wiszącego paska; (2) watchdog w kontrolerze: gdy deadline minął o >3 s a stan żyje (RestBar odmontowany przez błąd), tick 1000 ms zeruje stan + localStorage + notyfikację; (3) bramka końca treningu fail-open: nowa czysta funkcja `shouldStartRest` (`exercises.length === 0 || hasRemainingWork(...)`) — pusta/nie zasiana lista dnia STARTUJE timer zamiast go gasić. **Z190 (bramka sekwencji):** jeden przebieg W→0:45 → robocza→1:30 → przejęcie przez B (2:30, jedna notyfikacja) → ostatnia seria gasi wszystko; osobno kill w środku przerwy → resume z tym samym deadline. Metoda: test-first (RED przed każdym fixem). Weryfikacja: vitest PASS 1191/1191, typecheck 0, lint 0. Commity: 36e80f34, 876eb38f, 78304e8b + Z190.

### 2026-08-05 — X23 FAZA 1: sesja nieśmiertelna — serie wracają 1:1 po force-quit (Z182-Z186)

**Kontekst (realny trening 2026-08-04, build 81):** po force-quit i „Kontynuuj trening" RDL pokazał wskrzeszoną drabinkę rozgrzewkową 4xW i zdublowane serie. **Diagnoza read-only (Z182, REST runQuery z tokenem `gcloud --account g.jasionowicz@gmail.com`):** dokument `workout-...-day-2-2026-08-04` w chmurze jest CZYSTY — RDL ma dokładnie 3 serie robocze (50/70/85 kg × 6, wszystkie completed), zero wierszy isWarmup, zero kluczy `__swap-` (klucze: tpl-ex-35..39, revision 27). Wniosek: wskrzeszenie było czysto lokalne (starszy snapshot draftu) = klasa H2; finalny sync poszedł już z poprawionym stanem. Fixy pokrywają wszystkie trzy klasy: **Z182 (H2a)** `resolveFresherFallback` w `workout-draft-db.ts` — po udanym odczycie IDB porównanie z fallbackiem localStorage tej samej sesji: wyższa `version` (tiebreaker `updatedAt`) wygrywa, zwycięzca dziedziczy brakujące pola z rekordu IDB i wraca do IDB przez `saveActiveDraft` (guard Z175 nienaruszony); starszy/obcy fallback ignorowany. **Z183 (H2b)** `workout-hydration.ts`: rozjazd `sessionId` draft↔chmura przestał bezwarunkowo wybierać chmurę — dirty draft NOWSZY niż `workout.updatedAt` wygrywa (force-quit tuż po promocji sesji); czysty albo starszy draft: chmura (ochrona przed zombie). **Z184 (H3)** `sanitizeSets` NIE fabrykuje już pustego wiersza W, gdy zapis go nie ma (usunięta rozgrzewka nie wraca po resume; W przy NOWEJ liście nadal z `createEmptySets`/`createPrefilledSets`; jedyne wywołania: mount+resync ExerciseCard — żadne nie polegało na fabrykacie). **Z185 (H1)** tożsamość swapu „tylko dziś" przeżywa restart dwuwarstwowo: (1) persystencja — pole `sessionSwaps` w `ActiveWorkoutDraft` (WYŁĄCZNIE IndexedDB + fallback localStorage, NIE Firestore — rules mają schema-checks), zapis w `handleApplySwap`, dziedziczenie w `buildWorkoutDraftSnapshot`, odczyt w `applyWorkoutState`; (2) samonaprawa — `buildDayFromDraft` mapuje klucz `${planId}__swap-...` na kartę planu i ją ZASTĘPUJE (extras tylko dla prawdziwych ad-hoc); draft anormalnie z oboma kluczami renderuje obie karty (zero utraty edycji). **Z186** bramka sekwencji: NOWY `e2e/resume-after-kill.spec.ts` (start z planu → 4xW z generatora → odhacz 4W+2 robocze → poll draftu → wyjście → reload/kill → auto-resume X10 lub „Kontynuuj trening" → serie 1:1 → „Zakończ trening" dostępny). Metoda: test-first każdego fixu (RED przed implementacją). Weryfikacja: vitest PASS 1175/1175 (w tym zaktualizowany helper `checkFirstOpenSet`, który zakładał fabrykat W), typecheck 0, lint 0, spec e2e PASS. Commity: ef4f5d87, de90e75c, 379e247a, 66e3f860 + spec.

### 2026-08-03 — X22 WPIS ZBIORCZY: zgłoszenia z builda 80 naprawione u źródła (Z170-Z181)

Plan `docs/PLAN-X22-2026-08-03.md` wykonany w CAŁOŚCI metodą test-first (każdy fix ma test, który był CZERWONY przed implementacją; szczegóły per faza w pięciu wpisach poniżej). Zakres: **F1** usuwanie serii (Z170 dialog stabilny/klikalny, Z171 usuwanie po referencji + dialog tylko dla realnych danych); **F2** Dashboard (Z172 bez defaultPlan przy nieznanym planie, Z173 świeże `today` + guard daty kafli, Z174 jeden CTA aktywnej sesji, Z175 promocja provisional bez wchodzenia w trening + guard wersji draftu w IDB); **F3** wideo (Z176 miniatury bez autoplay, twardy start w dialogu, biblioteka bez hovera); **F4** dźwięk/ekran (Z177 AudioContext odporny na interrupted/closed, reaktywacja sesji audio w AppDelegate, keep-awake self-healing, wiersz Dźwięk zawsze widoczny; diagnoza read-only: `preferences.timerSound=true` — mirror nie wyciszał); **F5** separator (Z178 przecinek wszędzie, koniec cichego zerowania); **F6** share (Z179 plist+downscale+JPEG+lazy html2canvas+Pobierz natywnie, Z180 szablony z logo). **F7 (Z181):** pełne bramki z jawnymi exit code — test 134 pliki / 1160, typecheck 0, lint 0, build OK, bundle 1 531 095 / 1 536 000 B (limit NIE podnoszony), dist-smoke PASS, dist-offline PASS, e2e:mock 192 passed; sekwencje obowiązkowe pokryte: (1) `full-app.spec.ts:1422` plan→wyjście→szybki→powrót, (2) `exercise-card-v3.spec.ts` „Z171: usunięta seria nie wraca...", (3) provisional→jeden CTA→promocja po online: `dashboard-active-session.test.tsx` + `auto-sync-provisional.test.ts` + e2e wariant offline w `plan-edit-during-workout.spec.ts`. Wdrożone: web gh-pages (bundle `index-DtDIdtPz.js`), iOS build 81 (TestFlight + auto-dystrybucja `testflight_external.py` w pipeline release-ios.sh). Tech debt dopisany do PLAN.md (sekcja ODŁOŻONE planu X22).

### 2026-08-03 — X22 FAZA 6: udostępnianie bez crasha + szablony z logo (Z179, Z180)

**Z179 (crash po „Dodaj zdjęcie", martwy „Pobierz", obraz 1.3 MB):** trzy root cause. (1) `capture="environment"` wymuszał aparat, a `Info.plist` nie miał `NSCameraUsageDescription` → TCC ubija proces; fix: capture usunięty (wybór z galerii) + OBA opisy użycia w plist (picker WKWebView oferuje też aparat). (2) 12 MP bez downscale = kilka kopii base64 w pamięci WKWebView; fix: `downscalePhoto` (createImageBitmap z `imageOrientation:'from-image'`, canvas ≤1080×1920, JPEG 0.8, `bitmap.close()`, fallback `<img>.decode()` dla Safari <16.4). (3) `<a download>` ignorowany przez WKWebView; fix: „Pobierz" natywnie idzie przez share sheet (iOS ma „Zapisz obraz"), web zostaje z anchorem; wspólny `systemShare` ignoruje `AbortError`. Format wynikowy: JPEG 0.85 z tłem `#0f172a` (JPEG bez alfy — przezroczyste piksele robiły czarne artefakty), nazwa `trening-{data}.jpg`. `html2canvas-pro` przeszedł na lazy import w `generateWorkoutImage` — initial JS 1 531 095 / 1 536 000 B (budżet PASS). Gate share przez `navigator.canShare?.()` (TS2774: `navigator.share` jest w typach zawsze zdefiniowane).

**Z180 (szablony z logo):** stopki wszystkich szablonów przez wspólny `renderFooter` z realnym logo (`import app-icon.png`, hashowany URL z bundla) zamiast tekstowego „SS"; typ `ShareTemplate = gradient | photo | minimal`; NOWY wariant `minimal` (tło `#0b0b0f`, tonaż 76 px, wiersz liczb, zero nowej logiki danych); `dim` (0.3-0.7) parametryzuje przyciemnienie zdjęcia. Dialog: rząd 3 chipów z zapamiętaniem wyboru (`fittracker_share_template_v1`), „Dodaj zdjęcie" auto-przełącza na `photo`, chip „Zdjęcie" bez zdjęcia otwiera picker (reguła 6), klucze i18n w OBU locale. Commit wspólny Z179+Z180 (te same dwa pliki). Bramki: vitest 134 pliki / 1160, typecheck 0, lint 0, build + bundle budget PASS, e2e:mock 192 passed.

### 2026-08-03 — X22 FAZA 5: przecinek dziesiętny bez cichej utraty danych (Z178)

**Z178 („47,3" vs „49.6" — zapis 0 kg):** root cause = `input type="number"` + `parseFloat(...) || 0`. Klawiatura PL podaje PRZECINEK: „47,3" to dla type="number" tekst, którego React nie nadpisze; wariant WebKit sanituje wejście do `""` i `||0` robił **zapis 0 kg (cicha utrata)**; `Number("82,4")=NaN` blokował zapis pomiarów; RPE z przecinkiem = NaN znikające po powrocie. Fix systemowy: NOWY `src/lib/decimal-input.ts` — `parseDecimalInput` (przecinek/kropka, separatory tysięcy w tym U+00A0/U+202F, kontrakt: **null = „nie zmieniaj stanu", nigdy 0**; jawny guard na stan pośredni „47," — Number('47.') dałoby 47) + `formatDecimalInput`. Komponent `DecimalInput` w ExerciseCard (wzorzec DurationInput: type="text" + inputMode="decimal", lokalny draft, commit na bieżąco dla wartości parsowalnych, jawny `onClear` dla pustego pola — waga→0, metryka→delete, blur wraca do postaci z kropką). Przepięte: waga główna/wdd/asysta, metryki rpe/ból/jakość (`handleMetricChange` przyjmuje number|null zamiast raw stringa), `MeasurementsForm` (nieparsowalne pole → NaN → walidacja odrzuca ZAPIS, nie dane), `PlateCalculatorSheet` (3 pola), `AddCardioDialog` (minuty/dystans + guard przycisku; martwy `replace(',', '.')` usunięty), `chart.tsx` toLocaleString('en-US'). Wyświetlanie ZOSTAJE z kropką (spójne z Watch/PDF/share) — `units.ts` nietknięte. E2E: 8 speców przepięte z roli `spinbutton` na `textbox` (pola kg/Asysta przestały być type="number"). Bramki: vitest 133 plików / 1157, typecheck 0, lint 0, e2e:mock 192 passed.

### 2026-08-03 — X22 FAZA 4: dźwięk odporny na iOS + keep-awake z samonaprawą (Z177)

**Z177 (cisza gongów do restartu apki + ekran gaśnie mimo ustawienia):** trzy root cause naraz. (1) **AudioContext:** media sessions wideo (Z176 wprowadziło `<video>` na trening) wpychają współdzielony kontekst w stan `interrupted`, a kod obsługiwał wyłącznie `'suspended'` (3 miejsca); system potrafi też kontekst ZAMKNĄĆ — closed jest nieodwracalne. Fix: `resumeIfNotRunning` (resume dla każdego stanu ≠ running), `getCtx` odtwarza kontekst po closed, `playSynth` w try/catch (ostatnia linia obrony przed ciszą nie może wywalić handlera odhaczenia). Telemetria przez NOWY `reportClientErrorWithCurrentUid` (global-error-telemetry) — timer-sound/keep-awake nie mają kontekstu uid, a nowe liczniki telemetrii wywaliłyby hasOnly w rules. (2) **Sesja audio iOS:** kategoria `.playback` ustawiana RAZ na starcie; po przerwaniu (telefon, Siri) system jej nie przywraca. Fix w AppDelegate: `configureAudioSession()` też w `applicationDidBecomeActive` + obserwator `AVAudioSession.interruptionNotification` (przy `.ended` rekonfiguracja); kompilacja zweryfikowana xcodebuild na symulator (exit 0). (3) **Keep-awake:** blokada zakładana raz per sesja, iOS zdejmuje idle-timer po powrocie z tła, błędy pluginu połykane. Fix: samonaprawa w LIBIE — moduł pamięta intencję (`held`), ponawia blokadę po `appStateChange(isActive=true)`; `allowScreenSleep` zdejmuje intencję; po `keepAwake()` weryfikacja `isKeptAwake()` (false → telemetria `keep-awake-not-applied`), błędy → `keep-awake-error`. Dodatkowo re-apply w listenerze WorkoutDay (z guardem isCompleted) i przy starcie każdej przerwy. (4) **Pułapka UI (reguła 6):** wiersz „Dźwięk" w Profilu wyszedł spod warunku `FEATURE_FLAGS.workoutTimers` — wyłączenie timera przerwy nie odcina już drogi do ustawienia dźwięku. (5) **Diagnoza danych (read-only, zero zapisów):** `users/U6GDdfg7GmP1k1xJuISIsK9uSUE2.preferences.timerSound = true` — mirror w Firestore NIE był przyczyną ciszy (odczyt REST z tokenem gcloud, pułapka X12: token musi być z konta `g.jasionowicz@gmail.com`, aktywne `grzegorzee@` dostaje PERMISSION_DENIED). Bramki: vitest 130 plików / 1147 (rest-settings.test dostał mock telemetrii — nowy import ciągnął Firebase do jsdom), typecheck 0, lint 0, e2e:mock 192 passed.

### 2026-08-03 — X22 FAZA 3: wideo ćwiczeń bez autoplay i bez freeze WebKit (Z176)

**Z176 (nieruchome klatki zamiast animacji + biblioteka bez podglądu na dotyku):** root cause = 7 autoodtwarzanych `<video>` naraz na ekranie treningu (limit dekoderów sprzętowych iOS — część nigdy nie startowała) + `opacity-80`/`backdrop-blur-sm` NA wideo (znany freeze kompozytora WebKit) + zero obsługi błędów; w bibliotece podgląd gated hoverem, który na dotyku nie istnieje. Animacje weszły commitem `wip` 532a2d74 do builda 79/80 bez review. Fix: (1) miniatura karty = statyczna pierwsza klatka (`preload="metadata"`, bez autoplay, przyciemnienie zwykłym `bg-black/30`), `onError` → fallback ikona + ślad `exercise-video-error` w client_errors (świadomie NIE nowy licznik telemetrii — hasOnly w rules); (2) dialog animacji i hero szczegółów: twardy start `play()` w `onLoadedMetadata` — odmowa autoplay (Low Power Mode) jest widoczna jako rejection i włącza natywne `controls` (reguła 6: user zawsze ma przycisk), hero chowa wtedy dekoracyjny badge i zdejmuje pointer-events z gradientu; (3) biblioteka: podgląd startuje z TAPNIĘCIA w miniaturę (stopPropagation — tap nie otwiera szczegółów), stan wyniesiony do rodzica = max 1 aktywne wideo naraz. NOWY `e2e/exercise-video.spec.ts` z lokalną fixture mp4 (route na `media.gjasionowicz.pl`): miniatury stoją, dialog gra albo pokazuje controls, tap przełącza podgląd. Bramki: vitest 1139, typecheck 0, lint 0, e2e:mock 192 passed; layout test karty zielony bez zmian asercji.

### 2026-08-03 — X22 FAZA 2: Dashboard mówi prawdę o planie i sesji (Z172-Z175)

**Z172 („stary plan" na Dashboardzie):** Dashboard renderował wbudowany `defaultPlan` („Klatka / Przysiad / Środek Pleców" = literalnie `trainingPlan.ts:96`) w dwóch oknach: zanim doszedł snapshot planu (gate czekał tylko na `isLoaded` treningów) i po błędzie snapshotu (handler robił `setPlan(defaultPlan)`). Fix: handler błędu ZOSTAWIA poprzedni stan (nowy `planError` z hooka, zerowany przy każdym dobrym snapshocie), gate → `if (!isLoaded || !planIsLoaded)`. Spinner nie zawiśnie: oba `isLoaded` ustawiane też w error-handlerach (`workout-read-store.ts:156`, error handler hooka). Niezmiennik: konto BEZ dokumentu planu dalej dostaje default (to legalny fallback). Testy: NOWY `dashboard-plan-source.test.tsx` (RTL Dashboard przez mocki hooków + REALNY hook przez `vi.importActual` z mockiem `onSnapshot`).

**Z173 („Pominięte" w środę, która nie nadeszła):** `today = useMemo(() => new Date(), [])` zamrożone przy mouncie, a WKWebView żyje dniami. Fix: NOWY `useToday` (stan = początek dnia; refresh na `appStateChange`/visibilitychange przez `addAppStateListener`, `focus` i timer najbliższej północy; referencja stabilna w obrębie dnia). Drugi rozjazd: lookup ukończenia kafli (`findWorkoutForRoute` z `allowDateFallback`) wciągał ukończony trening INNEGO dnia planu z tej samej daty → guard `today` (jak w WorkoutDay) w obu wywołaniach z `dayId`.

**Z174 (dwa CTA „Kontynuuj trening" + „Odhaczone serie: 0"):** baner sync i karta dnia czytały ten sam draft niezależnie, a licznik Dashboardu wliczał rozgrzewkę. Fix: wspólny memo `todayContinueDraft` (jedna decyzja: karta dnia jest właścicielem CTA; baner degraduje się do wiersza informacyjnego, wariant „Otwórz Sync Center" zostaje), licznik przez NOWY util `countCompletedWorkingSets` (deleguje do `sessionStats` — ta sama prawda co ekran treningu), kafel tygodnia przy żywym drafcie nawiguje na `?session=` zamiast `?autostart=true`. Zero nowych kluczy i18n.

**Z175 (baner „offline" wisi mimo 5G + „Odhaczone serie: 0" po autostarcie):** trzy współdziałające fixy. (1) `AutoSyncOnReconnect` przepuszcza też aktywne sesje provisional (kind=checkpoint; final wyłącznie dla `finalSyncPending`; dirty remote dalej obsługuje tylko WorkoutDay). (2) WorkoutDay: fire-and-forget flush + checkpoint przy unmount dla sesji provisional/dirty (refy na najświeższe callbacki — cleanup z pustymi deps widziałby pierwszy render) oraz pierwszy checkpoint provisional po 15 s (`PROVISIONAL_FIRST_CHECKPOINT_MS`) zamiast 5 min. (3) Guard wersji draftu w IDB: `runWrite` z flagą `skipIfNewerExists` robi get+put w JEDNEJ transakcji i odbija zapis z niższą wersją (autostart z kafla budował świeży stan version=1 i nadpisywał żywą sesję; mapa `latestWriteVersions` chroni tylko wyścigi w obrębie strony — po reloadzie WebView jest pusta). Ścieżki redirect/tombstone/runUpdate nietknięte.

**Bramki FAZY 2:** vitest 129 plików / 1139 testów, typecheck 0, lint 0, e2e:mock 189 passed (w tym sekwencja obowiązkowa `full-app.spec.ts:1422` plan → wyjście → szybki trening → powrót).

### 2026-08-03 — X22 FAZA 1: usuwanie serii działa za pierwszym tapnięciem (Z170, Z171)

**Z170 (USUŃ w dialogu nic nie robił — zgłoszenie z builda 80):** root cause = `transition-[top] duration-200` z Z159: po tapnięciu X klawiatura się chowa, `--keyboard-inset` spada do 0 i dialog ZJEŻDŻA ~150 px pod palcem przez 200 ms — tap trafia w overlay, Radix zamyka dialog bez akcji. Fix trójwarstwowy: (1) animacja top USUNIĘTA (pozycjonowanie względem `--keyboard-inset` zostaje — fix Z159 nietknięty, `keyboard-inset.test.ts` zielony), (2) `onInteractOutside={preventDefault}` na dialogu potwierdzenia — destrukcyjne potwierdzenie zamyka się TYLKO przez ANULUJ/X, (3) tap targety: przyciski dialogu `min-h-[44px] min-w-[88px]` + `data-testid`, X przy serii `h-11 w-11` z poszerzeniem ostatniej kolumny gridu 22px→44px (węższa kolumna kładła 44px X na checkmarku). Test RED→GREEN: outside pointerdown nie zamyka dialogu (pułapka testowa: Radix podpina listener w `setTimeout(0)` i na dotyku domyka dopiero na click — test musi zrobić tick + click).

**Z171 (dialog pytał o „zapisane dane" przy świeżej serii + usuwanie po indeksie):** root cause podwójny: (a) `handleAddSet` prefilluje reps/weight z ostatniej serii, więc nietknięta seria zawsze przechodziła `setHasData`; (b) `pendingRemoveIndex` trzymał INDEKS — podmiana `sets` (hydracja draftu) między otwarciem dialogu a USUŃ kasowała złą serię, a `removeSetAt` przy złym indeksie robił cichy no-op. Fix: `pendingRemove: SetData | null` (REFERENCJA, zero nowych pól w kształcie Firestore — rules mają schema-checks), `removeSet(target)` filtruje po `!==` z guardem stale-ref (ślad do `client_errors` przez `reportClientError`, phase 'other', code `remove-set-stale-ref` — świadomie NIE nowy event telemetrii: whitelist `counters.keys().hasOnly` w rules odrzuciłaby cały dzienny zapis), reset `pendingRemove` przy resync (otwarty dialog nie przeżywa podmiany sets), `touchedSets = WeakSet<SetData>` — dialog TYLKO dla serii odhaczonej (`completed`) albo dotkniętej w tym mount (`handleSetChange`/`handleToggleComplete` dodają NOWY obiekt). Świadomy tradeoff: seria z danymi hydratowana z draftu, nieodhaczona i niedotknięta po powrocie kasuje się bez dialogu (aplikacja nie odróżni jej od prefillu; ochronę realnych danych niesie `completed`). Testy RED→GREEN: prefill kasuje się bez dialogu i znika DOKŁADNIE on (round-trip przez kontrolowany wrapper), podmiana savedSets w trakcie dialogu nie kasuje złej serii; nowy e2e: sekwencja start → dodaj → wpisz → odhacz → usuń → Dashboard → powrót (seria nadal usunięta, draft wrócił).

**Bramki FAZY 1:** vitest 125 plików / 1123 testy, typecheck 0, lint 0, e2e:mock 189 passed (w tym nowy scenariusz sekwencji Z171).

### 2026-07-28 — X21: rozgrzewka pamięta odhaczenia + spójność i18n PL/EN (Z162-Z168)

**Z162 (odhaczenia rozgrzewki znikały — zgłoszenie usera):** root cause = `WarmupRoutineDialog` trzymał stan w lokalnym `useState<Set<number>>`, a efekt jawnie robił `setChecked(new Set())` przy KAŻDYM `open === false` (X, Esc, klik w overlay); klucz = indeks pozycji, więc niestabilny przy zmianie focusu (offset stretchingu zależał od długości listy rozgrzewki). Fix: dialog KONTROLOWANY (`checked: ReadonlySet<string>` po `nameKey` + `onToggle`), stan mieszka w drafcie sesji jako pole additive `ActiveWorkoutDraft.warmupChecked?: string[]` (bez bumpu wersji IndexedDB, wzorzec `lastTouchedExerciseId`), przeżywa round-trip przez IDB i fallback localStorage, odhaczenie liczy się jako zmiana treści (bump `version`). Pole NIE wychodzi do Firestore — payload syncu budowany jawnie (`buildDraftExercisesPayload` + `saveOptions`), zweryfikowane grepem. Nowa sesja = czysta rozgrzewka (reset w `applyWorkoutState`). Weryfikacja: `warmup-routine-dialog.test.tsx` (dialog + sekwencja odhacz/wyjdź/wróć/nowa sesja + niezmiennik legacy draftu bez pola), round-trip IDB i localStorage, NOWY `e2e/warmup-persistence.spec.ts` (realne klikanie: X, Escape, wyjście na Dashboard, powrót).

**Z163 (mieszane PL/EN w nazwach rozgrzewki):** polski słownik miał wartości angielskie (`Jumping Jacks`, `Child's Pose`, `Pigeon Pose`) albo dwujęzyczne (`Kręcenie biodrami (Hip Circles)`). Nowe wartości: Pajacyki, Krążenia bioder, Krążenia ramion, Koci grzbiet (na czworakach), Pozycja dziecka, Pozycja gołębia. Klucze `warmup.*`/`stretch.*` BEZ ZMIAN — to kanoniczne identyfikatory, od Z162 zapisywane w draftach sesji. Guard `warmup-i18n.test.ts` zostaje na stałe (PL bez angielskich wtrąceń, EN bez polskich znaków).

**Z164 (polskie stringi na ekranach EN):** `HRZoneConfig.name` → `nameKey: TranslationKey` (render przez `t()` w obu konsumentach); `getWeekLabel` i format miesiąca per język (`strava.week*` + `DF_LOCALES = {pl, enUS}`), pięć funkcji `compute*` przyjmuje `lang` z domyślnym `'pl'` (niezmiennik starych callerów), komponenty Strava przekazują język z `useTranslation`; `PLAN_DESC['tpl-rza-3']` (jedyny szablon bez opisu EN) — guard skanuje teraz WSZYSTKIE szablony; `useWatchPlanPreview` dokłada `lang` do obu payloadów podglądu (nazwy ćwiczeń zostają kanoniczne PL — dopasowanie serii po nazwie). Follow-up z e2e: dialog rozgrzewki pokazywał focus dnia kanonicznie po polsku również w EN → `localizeFocus(focus, lang)`.

**Z165 (panel admina pół na pół):** ~90 nowych kluczy `admin.*` w obu locales, ~70 literałów PL podmienionych w 7 plikach (dialogi, toasty, kafle pulsu, filtry, sortowania, logi, flagi, broadcast). `admin-user-types.ts` (moduł bez Reacta): `description` → `descriptionKey: TranslationKey`; `admin-audit.ts`: `formatRepairOperations(ops, lang = 'pl')` przez `translate`. Przy okazji: klucz `admin.revoke` miał w polskim słowniku wartość angielską. Definicja „done" zakodowana w `admin-i18n-scan.test.ts` — polski znak w `src/pages/admin` lub `src/components/admin` poza komentarzem wywala test.

**Z166 (hardcodowane EN w UI):** sr-only zamknięcia dialogu, aria-label nawigacji, „Max HR" i komunikaty błędów `cycle-actions` przez `t()`/`translate` (`lang?: LanguageCode` w Deps, default PL = niezmiennik). E2E wyłapało kolizję: sr-only „Zamknij" miało tę samą nazwę dostępnościową co przyciski akcji „Zamknij" w tym samym dialogu (strict mode violation + realny problem dla czytnika ekranu) → `a11y.close` = „Zamknij okno" / „Close dialog". Nieużywane komponenty shadcn (pagination, breadcrumb, sidebar) świadomie nietknięte (0 importów).

**Z167 (backend po polsku niezależnie od konta):** `daily-reminder` czyta `users.language` — EN dostaje „Hey {imię}! Time to train 💪" z focusem tłumaczonym portem mapy tokenów (`functions/src/focus-en.ts`, wzorzec `exercise-name-en.ts`); brak pola = dotychczasowy push PL 1:1. `inviteEmailHtml(code, url, note, lang = 'pl')` + subject per język (`lang` z payloadu, dziś wysyłki PL, parametr przyszłościowy). Test parytetu obu map focus (klient vs functions) — rozjazd oznaczałby polski focus w powiadomieniu EN. Wdrożone: `firebase deploy --only functions` (Deploy complete).

**Z168 (architektura dwujęzyczna → n-językowa):** `dateLocale` przez `DATE_LOCALES` z fallbackiem, selektor języka w Profilu generowany z rejestru `LANGUAGES`, binarne `lang === 'en'` zastąpione nakładkami `Partial<Record<LanguageCode, ...>>` (nazwy ćwiczeń, instrukcje, kategorie, dni, skróty, tokeny focusu, teksty planów) — istniejące testy przeszły BEZ zmiany asercji (to był test niezmiennika). Typy `language?: LanguageCode` + walidacja przez rejestr zamiast literałów. Globalny `i18n-hardcoded-scan.test.ts`: polski znak w `src/` poza allowlistą (12 plików, każdy z uzasadnieniem: wartości kanoniczne, klucze lookup, normalizacja diakrytyków, kod poza LanguageProvider) = czerwony test; drugi test pilnuje, że allowlista nie ma martwych wpisów. `docs/I18N-NOWY-JEZYK.md` = checklist dodania języka (klient, nakładki, functions, Garmin/Watch, warstwa statyczna) z ostrzeżeniem, że trzeci pełny słownik wymaga lazy-loadu locale (bundle).

**Bramki:** test 125 plików / 1114 testów, functions 151, typecheck + lint 0, build OK, bundle 1 529 471 / 1 536 000 B (limit NIE podnoszony), dist-smoke, dist-offline, e2e:mock 188 passed. **Wdrożone:** web (`index-S1tEjfK8.js`), functions (prod), iOS build 80 (TestFlight, betaReviewState APPROVED).

### 2026-07-28 — X20: zgłoszenia z builda 78 — analityka bez czarnego ekranu, push, i18n, timer z przełącznikiem, klawiatura, digest, usuwanie treningu (Z154-Z161)

**Z154 (czarny ekran analityki po powrocie z tła):** root cause = handler `vite:preloadError` w main.tsx robił `preventDefault()`, przez co błąd chunka NIE rzucał — catch w `lazyWithRetry` był martwym kodem, `lazy` dostawał undefined, a reload szedł BEZ guarda antypętlowego. Fix: handler USUNIĘTY; `loadChunkWithRetry` (walidacja `chunk-empty`, retry 500 ms w miejscu, guard sessionStorage) + licznik antypętlowy w `requestGuardedReload` (max 2 reloady/60 s, telemetria `reload-loop-guard`); 5 gołych `lazy(` przepięte na `lazyWithRetry`; `TabBoundary` per zakładka analityki (fallback z "Spróbuj ponownie", reset przez key); top-level ErrorBoundary czyta uid z auth W MOMENCIE catcha (App nie re-renderuje się po zalogowaniu); nowy `global-error-telemetry.ts` (`window-error`/`unhandled-rejection` → client_errors). Weryfikacja: lazy-with-retry 5/5 (RED→GREEN), pwa-update-guard 4/4, error-boundary 4/4.

**Z155 (push "idź na trening" w trakcie treningu):** guard X18C sprawdzał `startedAt || completed`, ale klient wysyłał `startedAt` dopiero przy finalnym syncu — realny aktywny trening to doc `{completed:false}` bez startedAt (test X18C mockował dokument, jakiego klient nie produkował). Fix dwustronny: backend pomija push gdy dokument dnia ISTNIEJE (samo istnienie = zaczął/skończył); klient pisze `startedAt` od `createWorkoutSession` i w checkpointach (zdjęty warunek `requiresFinal`). Rules bez zmian (`validWorkoutShape` już dopuszczał startedAt). Margines: okno start→pierwszy checkpoint (tech debt w PLAN.md). Weryfikacja: daily-reminder 14/14 (RED na realnym kształcie dokumentu), sync engine z asercją startedAt w checkpoincie.

**Z156 (nazwy ćwiczeń po polsku przy EN):** 5 ścieżek omijało lokalizację (weekly-summary, rza-metrics, all-time-stats, cycle-insights, dialog progresji) + w mapie EN brakowało nie 12, a **30 nazw** (test inwentarzowy wykrył też szablony RZA/hybrydowe). Kontrakty zakodowane komentarzami i testami: prop `ExerciseProgressionDialog` = kanoniczna PL (lokalizacja WEWNĄTRZ), `isBodyweightExercise` przyjmuje kanoniczną PL (w EN zwracał zawsze false → wykresy bodyweight pokazywały kg zamiast reps); resolver dostał `resolveCanonicalExerciseName`. Test inwentarzowy zostaje na stałe (blokuje przyszłe luki). Weryfikacja: coverage + sekwencja przełączenia języka (PL→EN, zero polskich nazw) + weekly-local 5/5.

**Z157 (timer przerwy z przełącznikiem, default ON):** precedencja `e2eOverride ?? ustawienie usera (localStorage, bez mirrora Firestore — jak keep-awake) ?? default ON`. EMOM/AMRAP + rozgrzewka ZOSTAJĄ wyłączone za NOWĄ flagą `VITE_FEATURE_INTERVAL_TIMERS` (mają tylko setInterval — milkną przy zgaszonym ekranie; dług Z10, warunek zdjęcia w PLAN.md). Przełącznik w Profilu nad wierszem czasu odpoczynku (SettingRow z opisem); wiersze zależne chowają się natychmiast. Konsekwencja web: timer domyślnie ON także na webie — domyka wiszącą decyzję "flaga web" z X18. Weryfikacja: feature-flags 9/9 (RED→GREEN), e2e przepisany na wyłączenie przez ustawienie usera, e2e:mock 183/183.

**Z158 (kafle statystyk ucinane):** kafle tekstowe (ulubione ćwiczenie, "Trenujesz od") dostały `col-span-2` + `break-words` zamiast `truncate`; liczbowe bez zmian (truncate+tabular-nums, niezmiennik w teście). Weryfikacja: all-time-stats-sheet 3/3 (RED→GREEN).

**Z159 (klawiatura zasłania modale):** `@capacitor/keyboard` z `resize: 'none'` — globalny layout NIE drga (fixed bottom bary WorkoutDay); kompensują wyłącznie dialogi przez CSS var `--keyboard-inset` (`keyboard-inset.ts`: natywnie keyboardWillShow/Hide, web fallback visualViewport). `dialog.tsx`/`alert-dialog.tsx`: top liczony względem widocznego viewportu + `transition-[top]`. Jedna zmiana naprawia wszystkie dialogi z inputami. Weryfikacja: keyboard-inset 3/3; scenariusz na fizycznym iPhone = krok usera (jsdom nie pokrywa).

**Z160 (mail tygodniowy):** pełne podsumowanie zamiast 2 kafli: statystyki (tonaż METODĄ APKI — port setTonnage z guardami na uszkodzone dokumenty; crash 2026-07-20 nie wyklucza cicho usera), PR-y tygodnia względem historii, porównanie WoW, top 3 ćwiczenia, sekcja biegowa, i18n PL/EN (users.language), jednostki wg preferences.unit, layout WYŁĄCZNIE `<table>` (Gmail/Outlook wycinają flex), preheader, stopka z opt-outem. Poprzedni tydzień wycinany z kwerendy historii (2 kwerendy zbiorcze zamiast 3); koszt pełnej historii odnotowany w komentarzu. Port mapy nazw EN w functions pilnowany testem 1:1 z mapą klienta. Wysyłka testowa na g.jasionowicz@gmail.com przez `functions/send-test-digest.cjs` (ta sama ścieżka co harmonogram, guard na inne adresy): sent:1, temat "💪 5 treningów, 28.3 t — Twój tydzień 20 lipca - 26 lipca 2026". Ocena w skrzynce = krok usera przed poniedziałkiem.

**Z161 (usuwanie treningu z widoku treningu):** Historia miała pełny przepływ — WorkoutDay wystawia TĘ SAMĄ ścieżkę (`deleteWorkoutEverywhere`: dokument + szkic IDB + kolejka syncu, nigdy goły deleteDoc) w widoku podsumowania zapisanej sesji (ghost destructive + AlertDialog wzorem Historii, reuse kluczy history.*). Niezmiennik: trening W TOKU nie renderuje akcji (test e2e). Weryfikacja: workout-delete-from-day.spec 2/2 (RED→GREEN).

**Zastane w drzewie (poza X20, nie ruszane):** zmiany garmin/ (wątek CIQ) + `firestore.indexes.json` (composite index workouts userId+date dopisany przez równoległy proces innej sesji).

**Deploy:** functions (dailyTrainingReminder + weeklyDigest) na prod; web `npm run deploy`; iOS build 79 → TestFlight (obie grupy + Beta App Review przez testflight_external.py).

### 2026-07-24 — X19: id dni aktywnego cyklu niezmienne przy każdym zapisie planu (Z150-Z153) + fix jednostki inwentarza talerzy

**Niezmiennik (Z151, zakodowany w testach):** id dnia aktywnego cyklu nadane przy starcie cyklu jest niezmienne do końca cyklu. Sync planu do cyklu może dni AKTUALIZOWAĆ i DOKŁADAĆ, nigdy nie zmienia id istniejących. Realizacja: `alignPlanDaysWithCycleIds` (`plan-cycle-utils.ts`) — id obecne w cyklu lub w formacie cyklu zostaje; dzień w obcym formacie dopasowany po pozycji+weekday dostaje id dnia cyklu (treść z planu, id ćwiczeń nietknięte); nowy dzień dostaje świeże `${cycleStartDate}-dN`. Wyrównany zestaw idzie do `training_plans.days` ORAZ patcha cyklu (w tej samej transakcji `saveTrainingPlanWithRevision`); gałąź e2e-mock `savePlan` wyrównuje tak samo (cykle z `fittracker_e2e_cycles`), żeby e2e testowało realny kontrakt.

**Wektory dryfu (zweryfikowane w Z150, mapa skutków w PLAN-X19):** `resetToDefault` (plan default `day-N` nadpisywał id cyklu), `addPlanDay` (zawsze `day-N`), zapis z buildera/szablonu. Skutki przed fixem: Dashboard linkuje id z PLANU → po podmianie żywy draft nieodnajdywalny (auto-resume prowadzi w `dayNotFound` albo dzień tylko z dotkniętych ćwiczeń), ukończony dziś trening niewidoczny dla karty dnia (druga sesja tego samego dnia), mieszanka prefiksów id ćwiczeń.

**Weryfikacja:** testy align 16/16 (czerwony bieg na starym zachowaniu: 4 fail); niezmienniki starych przepływów `training-plan-save.test.ts` (resetToDefault→id cyklu, addPlanDay→format cyklu, edycja ćwiczenia→id bez zmian, plan bez cyklu→`day-N`); e2e `plan-cycle-day-ids.spec.ts` 2/2 (czerwone na kodzie sprzed Z151: `day-4` zamiast `${START}-d4`, po resecie `day-1..3`); pełna suita 1049, e2e:mock 181/181, bramki dist w kolejności mobile+smoke→web+offline zielone.

**Audyt produkcji (Z153):** `scripts/repair-cycle-day-ids.mjs` (dry-run domyślny, workouts NIGDY nie modyfikowane, wyrównanie plan/cykl do formatu HISTORII). Dry-run g.jasionowicz@gmail.com: 1 aktywny cykl, plan+cykl+historia spójnie `day-1..4` (32 workouts planowe, 4 adhoc), ZERO rozjazdów — apply niepotrzebny.

**Fix przy okazji (zgłoszenie usera z builda 77):** przełącznik jednostki inwentarza talerzy KG/LBS wyglądał na martwy — preset się aplikował, ale jednostka nie była persystowana ani pokazywana (nominały w kg: `20.412 kg` zamiast `45 lbs`). Teraz: pole `unit` w `fittracker_plate_inventory_v1` (legacy bez pola = kg), aktywny przycisk z `aria-pressed`, nominały i nagłówek w jednostce inwentarza (`formatPlateNominal`), wpis własnego talerza interpretowany w jednostce inwentarza. i18n: `plates.availablePlates` z parametrem `{unit}` w PL i EN (parytet kluczy pełny, wymusza go typecheck).

**Deploy:** web `index-Btkz95fT.js` na live (hash zweryfikowany curl-em). iOS: po potwierdzeniu builda 77 przez usera (realny trening OK) — build 78 na TestFlight tym samym dniem (X19 + fix jednostki inwentarza): upload SUCCEEDED, obie grupy podpięte, Beta App Review APPROVED; Robert dostaje build automatycznie.

### 2026-07-24 — X18C: reminder bez spamu, gong bez Now Playing, czytelny pasek tygodnia (Z146+Z147+Z148)

**Warunek pomijania porannego pusha (Z146):** `runDailyReminder` czyta dzisiejszy trening kandydata (1 query per kandydat po dotychczasowych filtrach, composite index workouts userId+date istniał): `startedAt` obecny LUB `completed=true` → skip (licznik `skippedActive` w logu). Świadome ograniczenie: draft offline niewidoczny dla backendu — trening rozpoczęty offline bez syncu nadal dostanie push.

**Los `presentationOptions` (Z146):** bez `'alert'` (zostaje badge+sound) — w foregroundzie prezentację przejmuje w całości kontrolowany toast. Payload dostaje `data.type='daily-reminder'`, a klient (czysty moduł `push-foreground`, bez importów Firebase) nie pokazuje toastu tego typu na ekranie treningu. Koniec podwójnego banera.

**Rewizja decyzji 2026-07-20 "HTMLAudioElement przed WebAudio" (Z147):** tamta decyzja dotyczyła SYNTEZY dźwięku, nie odtwarzania zdekodowanego PLIKU. Media element w WKWebView rejestrował apkę w Now Playing (widget odtwarzacza z paskiem 0:02 = długość wav). Teraz: fetch + decodeAudioData + bufferSource (cache per plik, porażka nie zostaje w cache), synteza WebAudio zostaje fallbackiem, `unlockTimerSound` prefetchuje wybrany plik w geście. Kategoria `.playback` w AppDelegate ZOSTAJE (dźwięk mimo przełącznika ciszy). Zero `new Audio(`/`<audio` w src/. Domyślny dźwięk: GONG (`rest_bell.wav`), etykieta ujednoznaczniona "Gong (dzwon bokserski)". Test słyszalności na fizycznym iPhone czeka na usera (plan B: natywny AVAudioPlayer, tylko jeśli WebAudio padnie na urządzeniu).

**Pasek tygodnia (Z148):** pokazuje WYKONANE obciążenie — dostał własny mikronagłówek ("Obciążenie treningowe · czas × intensywność"), min 3 px słupka z obciążeniem, legendę siła/cardio i kropki dni planu (`plannedWeekdays` z Dashboardu). "Plan tygodnia" zostaje nagłówkiem listy kart dni. Zrzuty przed/po: docs/assets/z148-week-strip-*.png.

**Weryfikacja:** functions daily-reminder 13/13, push-foreground 3/3, timer-sound 5/5, hybrid-week-strip 5/5 (wszystko RED→GREEN); pełny vitest 1031/1031; e2e:mock 179/179; bundle 1 515 062 B (limit 1 536 000); deploy functions potwierdzony (updateTime 2026-07-24T09:26Z, ACTIVE).

### 2026-07-24 — X18B: timery przerw v2 — jeden timer, koniec treningu bez timera, pełna widoczność (Z143+Z144+Z145)

**Co:** Timer przerwy to jeden spójny mechanizm sesji: nigdy nie biegną dwa naraz, nie startuje po ostatniej serii całego treningu, jest w pełni widoczny w ukończonej karcie.

**Właściciel stanu timera (Z143):** stan `{exerciseId, seconds, runId}` przeniesiony z `useState` per instancja ExerciseCard do WorkoutDay (`useRestTimerController`). Karta dostaje `restRun` tylko gdy przerwa jest jej; callbacki stabilne (memo/R2-07 zachowane), tykanie zostaje w RestBar. Odhaczenie w B przejmuje przerwę z A: unmount paska A anuluje notyfikację, mount B planuje nową (serializuje `operationChain`). Nowość: `RestBar.onFinished` — koniec przerwy w foregroundzie zeruje stan (pasek znika, karta może się przygasić).

**Wyjątek ostatniej serii (Z144):** `hasRemainingWork(exerciseSets, skipped, exercises)` w workout-session-state — po ostatniej serii roboczej ostatniego niepominiętego ćwiczenia handler NIE startuje timera i gasi biegnącą przerwę + notyfikację. Rozgrzewka nie jest pracą; ćwiczenie bez stanu serii (dodane w trakcie) jest. `exerciseSetsRef` aktualizowany synchronicznie w handleSetsChange (decyzja w tym samym kliknięciu). Zero nowego UI — zostaje przycisk "Zakończ trening".

**Warunek dimmingu (Z145):** przygaszenie ukończonej karty tylko `allCompleted && !restActive` — opacity rodzica jest multiplikatywne i wyszarzało pasek dokładnie wtedy, gdy odliczał przejście do następnego ćwiczenia.

**Status flagi:** `VITE_FEATURE_WORKOUT_TIMERS` bez zmian — web OFF, buildy iOS ON. Zdjęcie flagi web bramkowane potwierdzeniem usera z fizycznego iPhone'a (Z149 krok 3).

**Weryfikacja:** rest-timer-controller.test.tsx (przejęcie A→B: 1 pasek + 1 notyfikacja z księgującego mocka LocalNotifications; sekwencja Z144; dimming Z145; niezmienniki ±15/Pomiń/start po serii) — RED na starym kodzie, GREEN po; hasRemainingWork 5 przypadków; pełny vitest 1018/1018; e2e:mock 179/179; bundle bez zmian (1 514 702 B).

### 2026-07-24 — X18A: autostart kasował serie po edycji planu dnia + czas 48:08:47 (Z141+Z142)

**Co:** (1) Edycja planu dnia w trakcie treningu nie kasuje odhaczonych serii. (2) durationSec liczony do ostatniej realnej aktywności, nie do kliknięcia "Zakończ trening".

**Root cause 1 (reset serii):** `?autostart=true` żył w historii przeglądarki (Dashboard nigdy go nie zdejmował). Powrót (back) z `/plan/edit` montował WorkoutDay na świeżo: `autostartDone` ref świeży, `sessionId` w domknięciu efektu jeszcze `null` (hydracja ustawia go setState'em niewidocznym w tym samym przebiegu) → `handleStartWorkout()` startował NA ŻYWEJ SESJI. Gałąź provisional nadpisywała draft deterministycznie (`initialDraft` z `version: 1`), gałąź remote — zależnie od wyścigu z hydracją (`exerciseSetsRef` pusty na świeżym mouncie).

**Fix 1:** `shouldAutostartWorkout` (czysta funkcja: start/resume/scroll-only/none; draft z treścią → resume) + zdjęcie parametru z URL po konsumpcji (`setSearchParams` replace) + guard bliźniak w `handleStartWorkout` (`buildStartExerciseSets`: draft z bazy źródłem prawdy, prefill tylko brakujących; `buildStartDraft`: adopcja żywego draftu — serie/notatki/startedAt/wersja zostają).

**Root cause 2 (48:08:47):** `durationSec = finalizedAt - startedAt` bez capa; `finalizedAt` = moment kliknięcia "Zakończ trening", nawet 48h po treningu.

**Fix 2:** `ActiveWorkoutDraft.lastActivityAt` (opcjonalne, bump tylko przy zmianie treści draftu — detekcja `contentUnchanged` w snapshocie; snapshoty techniczne nie ruszają) + `computeEffectiveDurationSec`: przerwa bez akcji > 60 min → koniec = lastActivityAt + 3 min bufora. `completedAt` zostaje momentem zapisu (porządek syncu). Jedno źródło prawdy: silnik finalizacji + kafel "Czas".

**Weryfikacja:** e2e sekwencji `plan-edit-during-workout.spec.ts` (autostart → 2 serie → /plan/edit → dodaj ćwiczenie → back → serie nietknięte + wariant offline/provisional) — RED na kodzie sprzed fixa, GREEN po; unit: workout-autostart 11, workout-start 18, snapshot +5, silnik +3 (clamp RED→GREEN); pełny vitest 1006/1006.

**Naprawa danych (czeka na usera):** dry-run `scripts/repair-duration-outliers.mjs` znalazł 1 rekord: 2026-07-21 Wtorek 48:08:47, 17 serii → propozycja 51 min (17×3 min) albo 60 min wg słów usera. Zapis dopiero po potwierdzeniu.

**Przy okazji (środowisko):** dev server wisiał na skanie zależności po każdym czyszczeniu `node_modules/.vite` — domyślny glob `**/*.html` vite trafiał w `build/sim` (3,1 GB derivedData z cyklicznymi symlinkami xcframeworków). Fix: `optimizeDeps.entries: ['index.html']`. Seam e2e: dni planu w `fittracker_e2e_plan.days` (localStorage), zapis planu bez Firestore w trybie mock.

### 2026-07-20 — dźwięk końca przerwy: root cause i wybór dźwięku (build 74 → 75)

**Sekwencja diagnostyczna (trzy testy usera na urządzeniu, trzy różne przyczyny):**

1. **Build 71:** „cicha wibracja, nic więcej". Przyczyna: koniec przerwy wołał `hapticImpactLight` (najsłabszy impuls). Fix: `hapticRestEnd` z wzorcem notyfikacyjnym + trzema ciężkimi uderzeniami.
2. **Build 73:** dźwięk działa na aktywnym ekranie, w tle nadal cisza. Przyczyna w foregroundzie była systemowa: kategoria sesji audio WKWebView (`.ambient`) jest wyciszana bocznym przełącznikiem ciszy. Fix: `.playback` + `.duckOthers` w `AppDelegate`.
3. **Build 74:** w tle nadal cisza. **ROOT CAUSE znaleziony w źródle pluginu**, nie zgadnięty: `LocalNotificationsPlugin.swift` robi `content.sound = UNNotificationSound(named: UNNotificationSoundName(sound))`. Przekazywanie `'default'` każe iOS szukać **PLIKU o nazwie „default"** — taki nie istnieje, więc powiadomienie było NIEME. Pominięcie pola też daje ciszę (plugin nie ustawia wtedy `content.sound` w ogóle). **Jedyne wyjście: realny plik dźwiękowy w bundlu.**
4. **Potwierdzenie usera:** po wyłączeniu wyciszenia telefonu dźwięk w tle działa. Czyli zostały dwie niezależne przyczyny: zły parametr `sound` (naprawiony) i przełącznik ciszy (poza naszą kontrolą).

**Decyzje:**

1. **Trzy dźwięki do wyboru, generowane proceduralnie** (`rest_bell` / `rest_horn` / `rest_alarm`), każdy z ODSŁUCHEM w Ustawieniach. Odsłuch jest kluczowy: głośności nie da się ocenić inaczej niż na telefonie w hałasie siłowni. Domyślny: dzwon bokserski (klasyk kategorii, przebija hałas, nie brzmi jak alarm medyczny).
2. **Głośność przez kompresję, nie przez sam szczyt.** `tanh` z drive 2.6–3.4 podnosi poziom ŚREDNI (RMS 0.33–0.53), bo to on decyduje o słyszalności, a nie wartość szczytowa. Partiale skupione w paśmie 2–4 kHz, gdzie ucho jest najczulsze.
3. **Pliki w DWÓCH miejscach i to nie jest pomyłka:** root bundla iOS (dla `UNNotificationSound`) oraz web assets (dla `HTMLAudioElement` w foregroundzie). Ta sama nazwa po obu stronach, jeden wybór usera steruje obiema ścieżkami.
4. **HTMLAudioElement przed WebAudio.** Synteza WebAudio potrafi nie zagrać w WKWebView mimo odblokowania gestem; realny plik jest przewidywalniejszy. Synteza zostaje fallbackiem.
5. **Blokada wygaszania ekranu** (`@capacitor-community/keep-awake`) jako przełącznik w Ustawieniach, domyślnie włączony. Przy włączonym ekranie dźwięk gra zawsze, bo robi to sama apka. Zwalniana BEZWARUNKOWO przy wyjściu z treningu, żeby nie zostawić zapalonego ekranu.

**Czego NIE da się obejść:** przy bocznym przełączniku ciszy powiadomienia systemowe są nieme z zasady iOS. Jedyne wyjście to Critical Alerts, wymagające osobnego wniosku do Apple — świadomie nie wchodzimy w to.

**Lekcja (druga tego dnia):** po dodaniu nowej zależności natywnej działający dev server Vite zawiesza się na re-optymalizacji — 118 testów e2e padło z `page.goto timeout`, a bieg trwał 22 minuty zamiast 2. Kod był w porządku. **Po `npm i` nowego pluginu: ubij dev server i wyczyść `node_modules/.vite`, zanim uznasz e2e za czerwone.**

**Lint złapał realny błąd:** hook blokady wygaszania wylądował po wczesnym `return` komponentu, co łamie Rules of Hooks. Przeniesiony przed nie, warunek liczony z `sessionId` zamiast z `isWorkoutStarted` (ta zmienna powstaje dopiero po returnach).

---

### 2026-07-20 — X17C poprawki po teście usera na urządzeniu (build 71 → 73)

**Zgłoszenie po realnym teście:** „jedyne co się wydarzyło to cicha wibracja, nic więcej", „da się to zrobić inline zamiast tego dużego zegara?", „możliwość ustawiania domyślnej przerwy między seriami i między ćwiczeniami".

**Dobra wiadomość:** powiadomienia systemowe DOCHODZĄ przy zgaszonym ekranie — czyli fundament z Z135 (deadline + local notification) działa. Problemem była SIŁA sygnału i podwójny UI.

**Naprawione:**

1. **Podwójny timer — mój błąd.** `ExerciseCard` wołał `setRestRun` (nowy pasek inline) i RÓWNOCZEŚNIE `onRestTimerStart` (stary modal na poziomie strony). Na zrzucie usera widać oba naraz. Stary modal `RestTimer` odpięty i usunięty (był po tym martwy: 236 linii komponentu + 107 linii testu).
2. **„Cicha wibracja" — źle dobrany sygnał.** Koniec przerwy wołał `hapticImpactLight`, czyli najsłabszy dostępny impuls. Nowy `hapticRestEnd`: systemowy wzorzec notyfikacyjny + trzy CIĘŻKIE uderzenia w odstępach 180 ms. Na webie fallback do `navigator.vibrate` ze wzorcem.
3. **Brak dźwięku — przyczyna systemowa, nie kod JS.** Domyślna kategoria sesji audio WKWebView (`.ambient`) jest wyciszana bocznym przełącznikiem ciszy iPhone'a. `AppDelegate` ustawia teraz `.playback` z `[.mixWithOthers, .duckOthers]`: beep gra mimo przełącznika ciszy, a muzyka z AirPodsów nie jest przerywana, tylko przyciszana na czas sygnału (user miał podłączone AirPodsy).
4. **Sam dźwięk wzmocniony:** szczyt 0.3 → 0.85, sinus → trójkąt (lepiej się niesie), a sygnał końca przerwy z dwóch krótkich tonów na cztery wznoszące z domknięciem.
5. **Rozjeżdżający się pasek.** Etykieta, czas i trzy przyciski były w JEDNYM rzędzie — na iPhone „Pomiń" wychodził poza kartę. Teraz czas w pierwszym rzędzie, przyciski w drugim, każdy `flex-1`. Szerokość tekstu nie ma jak rozwalić układu.
6. **Ustawienia przerw (nowe, `RestSettingsCard` w Ustawieniach).** Trzy niezależne czasy, bo to trzy różne sytuacje na siłowni: **między seriami** (domyślnie 90 s), **między ćwiczeniami** (150 s — dochodzi zmiana stanowiska i sprzętu), **po rozgrzewce** (45 s). Każdy z polem liczbowym i czterema presetami. Zakres 5–600 s.
7. **Przerwa startuje też po ZAKOŃCZENIU ćwiczenia.** Dotąd ostatnia seria dawała tylko dźwięk „przejdź dalej" bez odliczania. Teraz leci przerwa „między ćwiczeniami"; nadpisanie per ćwiczenie jej NIE dotyczy (to czas na zmianę stanowiska, nie na daną pracę).

**Weryfikacja:** test 974/974, typecheck, lint, build, bundle-budget (1 512 517 / 1 536 000), dist-offline, e2e:mock 177/177. Zrzut paska potwierdza brak ucięcia.

**Flaga nadal wyłączona** dla weba; build 73 idzie z timerami włączonymi do ponownego testu na urządzeniu. Do sprawdzenia przez usera: czy dźwięk słychać przy przełączniku ciszy i czy wibracja jest wyczuwalna przez kieszeń.

---

### 2026-07-20 — X17D (Z138-Z140): ekran „Twoje liczby" + animacja „+1"

**Prośba usera:** „chciałbym, żeby po kliknięciu u góry po prawej stronie w ilość treningów wyświetlały się jakieś dane o tych wszystkich treningach, np. ile czasu spędziłem na siłowni oraz ile ton podniosłem (...) a jak zapiszę trening to chciałbym animację +1".

**Decyzje:**

1. **Jedno źródło prawdy dla statystyk.** `buildAllTimeStats` REUŻYWA istniejących reguł (`calculateTonnage`, `workoutDurationSec`, `calculateStreakDetails`, `buildHistoryRowMeta`) zamiast liczyć po swojemu. Inaczej powstałaby trzecia wersja prawdy o tonażu.
2. **Naprawiony dług: dwie metody liczenia tonażu.** `getTotalWeight` liczył BEZ filtra `isWarmup`, więc Dashboard i Osiągnięcia pokazywały inną liczbę niż raport PDF. Test regresji utrwala, która jest poprawna, i dowodzi, że różnica była realna: **1100 kg starą metodą vs 500 kg poprawną** na tym samym treningu (600 kg rozgrzewki).
3. **Czas z jawnym zastrzeżeniem.** Pokazujemy, z ilu treningów jest liczony — sesje sprzed M32 nie mają pomiaru i cicho wliczone jako zero kłamałyby w dół.
4. **Łączna liczba serii i powtórzeń** — luka: dotąd nigdzie w projekcie nie liczone zbiorczo (tylko inline per sesja).
5. **Grywalizacja TYLKO na tym ekranie.** Ekwiwalenty (słonie/samochody) w jednym boksie z podpisem, że to zabawa. Do ekranu treningu nie wchodzi nic — brak grywalizacji w logowaniu jest wymieniany jako ZALETA Stronga, a odznaki „często tylko rozpraszają".
6. **Licznik w nagłówku to teraz przycisk.** Był zwykłym `div` bez `onClick`, roli i `tabIndex`. Doszła rola przycisku, `aria-label` i obsługa klawiatury (e2e sprawdza wejście Enterem).
7. **PUŁAPKA Z140.2 rozwiązana wprost.** `AppHeader` jest UKRYTY na `/workout/*`, więc przy kliknięciu „Zakończ trening" nie ma czego animować. Zamiast liczyć na zamontowany komponent, `consumeCelebration` porównuje licznik z ostatnio pokazanym i świętuje po powrocie na Dashboard. Zachowania brzegowe w testach: jednorazowość, brak świętowania istniejącej historii przy pierwszym uruchomieniu, brak świętowania przy usunięciu treningu, pełna delta przy zsynchronizowaniu kilku treningów.
8. **Confetti po treningu przez parametr `?celebrate=1`**, ten sam wzorzec co `?welcome=1` po onboardingu. Dwa niezależne mechanizmy (confetti z URL, „+1" z licznika) zamiast jednego współdzielonego stanu, który jeden z konsumentów by „zjadł".
9. **Zero nowych zależności animacyjnych.** Keyframes inline jak w `ConfettiBurst`. `prefers-reduced-motion` respektowane w obu animacjach.

**Uwaga na przyszłość:** po X17D zostały **24 KB zapasu** w budżecie bundla (1 511 843 / 1 536 000). Kolejna większa funkcja wymaga code-splittingu albo świadomego podniesienia limitu.

**Weryfikacja:** test 969/969, typecheck, lint, build, bundle-budget, build:mobile + dist-smoke, dist-offline, e2e:mock 177/177, scenariusz przerwania zielony. Web na gh-pages, iOS build 72 VALID + APPROVED.

---

### 2026-07-20 — X17C (Z135-Z136): timery przerw wracają zza flagi, ale flaga ZOSTAJE

**Kontekst:** timery wyłączono flagą 2026-06-27 po treningu, na którym timer nie dał sygnału przy zgaszonym ekranie. Przyczyna była systemowa: iOS wstrzymuje JavaScript w WKWebView, więc nic opartego o żywy JS nie zadziała, gdy telefon leży w kieszeni.

**Decyzje:**

1. **Stan timera to DEADLINE, nie licznik.** Pozostały czas liczy się zawsze jako `deadline − now`. Test symuluje skok zegara o 5 minut (jak po wyjęciu telefonu z kieszeni) i wymaga, żeby timer był SKOŃCZONY, nie zamrożony. To jedyna różnica, która naprawdę decyduje.
2. **Sygnał przy zgaszonym ekranie wyłącznie przez local notification.** JS jest potrzebny tylko do rysowania paska, gdy user patrzy na ekran. Zadanie „obudź mnie za 90 sekund" należy do systemu.
3. **Powiadomienie ma parę zaplanuj/anuluj.** `Pomiń` anuluje, każda zmiana czasu przeplanowuje, a koniec w foregroundzie anuluje systemowe i gra in-app — inaczej user dostałby sygnał do przerwy, której już nie ma, albo dwa razy ten sam.
4. **Pasek INLINE w karcie, nie modal** (wzorzec Strong: odliczanie w kontekście serii). Tap rozwija do dużego odliczania na pełnym ekranie.
5. **Pasek tyka we WŁASNYM stanie.** Gdyby licznik siedział w karcie, karta re-renderowałaby się cztery razy na sekundę — czyli powrót re-render bomby R2-07. `setInterval` odświeża wyłącznie widok paska i nigdy nie jest źródłem prawdy o czasie.
6. **Osobne czasy przerwy dla rozgrzewki i serii roboczej** + nadpisanie per ćwiczenie, które celowo NIE dotyczy rozgrzewki. Najczęstsza skarga zaawansowanych na Hevy to jeden czas na wszystko.
7. **Override flagi przez localStorage TYLKO w trybie E2E.** Bez tego timery za wyłączoną flagą są nietestowalne end-to-end, a włączenie ich globalnie w e2e zabiłoby test pilnujący, że przy wyłączonej fladze timerów w apce nie ma.

**FLAGA POZOSTAJE WYŁĄCZONA.** Build 71 na TestFlight ma timery włączone (zbudowany z `VITE_FEATURE_WORKOUT_TIMERS=true`), web na gh-pages ich nie ma. Zdjęcie flagi na stałe wymaga zielonego testu na FIZYCZNYM iPhone — symulator nie odtwarza wstrzymania WKWebView, więc zielony wynik z symulatora niczego by nie dowodził. Lista kroków usera w `docs/PLAN-X17C-2026-07-20.md`.

**Weryfikacja, że build 71 naprawdę ma timery** (nie założenie): bundle mobilny kompiluje się do `workoutTimers(){return e()??!0}`, a bez zmiennej środowiskowej do `!1`. Sprawdzone w obie strony; IPA zbudowana z tego dist.

**Weryfikacja pozostała:** test 952/952, typecheck, lint, build, bundle-budget (initial JS 1 493 183 / 1 536 000), build:mobile + dist-smoke, dist-offline, e2e:mock 174/174, scenariusz przerwania zielony. iOS build 71 VALID + Beta App Review APPROVED.

---

### 2026-07-20 — X17B (Z132-Z134): kalkulator talerzy v2

**Zarzut usera:** „kalkulator o tyle jest słaby, że nie mogę tam zmienić wagi. Czyli jakbym chciał mieć inną wagę, to tam miałem na stałe przypisane np. 60 kg". Potwierdzone w kodzie: `targetKg` był propem, w komponencie nie istniał ani input wagi, ani stan na nią.

**Decyzje:**

1. **Waga to STAN arkusza, nie prop.** Prop daje wyłącznie wartość startową z serii. Do tego steppery ±1,25 / ±2,5 / ±5 kg liczone w jednostce UI (kg kanonicznie w modelu).
2. **„Ustaw w serii" domyka pętlę.** Policzona waga wraca do aktywnej serii roboczej. Callback z `exerciseId` w sygnaturze — kontrakt `memo()` z X17A. Bez tego kalkulator był ślepą uliczką: user liczył, zamykał i przepisywał ręcznie.
3. **`suggestAchievable` zamiast samego „exact: false".** Zwraca wariant w DÓŁ i w GÓRĘ (oba klikalne) plus brakujący nominał, gdy to on blokuje. `up` jest `null`, gdy inwentarz się kończy; sufit liczony z realnych sztuk, więc pętla szukająca nie ma jak się zapętlić. Research: Stronger pokazuje obie strony, Stronglifts wskazuje brakujący nominał, Strong nie robi nic.
4. **Tryb bez gryfu (`noBar`) jako opcja, nie druga funkcja.** Maszyna i hantle: cała waga na JEDNĄ stronę, sztuki NIE parowane (3 talerze 5 kg = realne 15 kg). Osobny test pilnuje, że ścieżka z gryfem zachowuje starą semantykę.
5. **Preset imperialny trzyma kg kanonicznie.** 45 lb → `lbsToKg(45)`, przeliczenie na lbs robi UI. Model zostaje jednojednostkowy (twarda zasada projektu).
6. **`loadPlateInventory` przestaje odrzucać gryf spoza presetów.** Legalne 0–100 kg (gryf techniczny 7,5, trap bar, 0 = brak gryfu). `BAR_OPTIONS_KG` degraduje się do listy skrótów w UI zamiast udawać walidator.
7. **Ustawienia sprzętu z toggli na realną konfigurację:** liczba sztuk per rozmiar, własne talerze z usuwaniem, własny gryf, preset jednostki. „Mam / nie mam" nie oddaje siłowni, na której są dwie dwudziestki i osiem piątek.
8. **Generator rozgrzewki zaokrągla do REALNIE składalnych ciężarów.** Na siłowni z samymi dwudziestkami proponował 84 kg, których nie da się złożyć. Dochodzi deduplikacja, bo ubogi inwentarz zbijał kilka procentów do tej samej wagi.
9. **Chip „Talerze" niezależny od wpisanego ciężaru.** Warunek `plateWeight > 0` chował kalkulator dokładnie w momencie, w którym jest najbardziej potrzebny (zanim user wie, ile wziąć).
10. **Kolory neutralne domyślnie**, presety IWF/IPF opcjonalnie, liczba kg widoczna w każdym wariancie. Komercyjne siłownie nie trzymają standardu kolorów.

**LEKCJA (metodyczna, ważniejsza niż sam feature):** pierwsza wersja testów zaokrąglania rozgrzewki do inwentarza **przeszła bez żadnej zmiany kodu**. Asercje sprawdzały podzielność, którą stare zachowanie przypadkiem spełniało — czyli test nie testował niczego. Dopiero przepisanie na sprawdzenie realnej składalności przez `computePlates(...).exact` dało czerwień na starym kodzie. Wniosek: „test first" nie wystarcza; test regresji trzeba SPRAWDZIĆ w obie strony, bo zielony test na starym kodzie to test-atrapa.

**Świadomie odłożone:** profile per siłownia, sync inwentarza między urządzeniami, zaciski zawodnicze (collars), gryf per ćwiczenie.

**Weryfikacja:** test 929/929, typecheck, lint, build, bundle-budget (initial JS 1 492 548 / 1 536 000), build:mobile + dist-smoke, dist-offline, e2e:mock 172/172, scenariusz przerwania zielony. Web na gh-pages, iOS build 70 VALID + Beta App Review APPROVED.

---

### 2026-07-20 — X17A FAZA 4 (Z131): nagłówek sesji + znalezisko o wznowieniu

**Decyzje:**

1. **Czas / Objętość / Serie w jednym zwartym rzędzie** zamiast dwóch dużych kafelków `StatCard`. Kafelki zjadały pionową przestrzeń nad pierwszą kartą, a liczby serii sesji nie pokazywały w ogóle.
2. **Logika metryk wyjęta z komponentu** do czystego `sessionStats()` w `lib/workout-day-view.ts` — 2500-linijkowej strony nie da się sensownie testować, a czysta funkcja tak (4 testy: rozgrzewka poza tonażem i licznikiem, masa własna liczy się do serii ale nie do tonażu, pusta sesja daje zera, nie NaN).
3. **Scenariusz przerwania jako trwały e2e**, nie jednorazowy przebieg ręczny. Sekwencja z reguły 5: start z planu → seria 62,5×7 → wyjście → szybki trening z dodanym ćwiczeniem → powrót → komplet ćwiczeń + dane w szkicu + nowy układ → dostępne zakończenie.

**ZNALEZISKO (odłożone, poza zakresem X17A):** powrót do treningu z planu po szybkim treningu pokazuje sesję jako NIEWZNOWIONĄ — pola puste, wraca przycisk „Rozpocznij trening" — mimo że szkic w IndexedDB ma komplet 7 ćwiczeń planu i odhaczoną serię `62.5×7`.

- **Dane są bezpieczne.** Zrzut szkicu po całej sekwencji potwierdza komplet ćwiczeń i zalogowaną serię. To NIE jest powtórka utraty danych z incydentu 2026-07-20.
- **To nie regresja X17A.** Bisekt: ten sam scenariusz na `a605a081` (kod sprzed X17A) daje identyczny wynik (`kg=` pusty, przycisk startu obecny). Zachowanie zastane.
- **Ryzyko dla usera mimo bezpiecznych danych:** po powrocie widzi pusty ekran i może uznać, że trening przepadł — dokładnie ten sam wzorzec paniki co przy incydencie. Rzecz siedzi w warstwie wznowienia sesji (`WorkoutDay`/auto-resume), nie w karcie ćwiczenia ani w zapisie.
- Rekomendacja: osobne zadanie, priorytet wysoki, backlog v2.

**Pułapka przy okazji:** klucz `workout.statSets` już istniał („Serii"); dopisany duplikat wywalił typecheck (TS1117). Przed dodaniem klucza i18n sprawdź, czy go nie ma.

**Weryfikacja:** test 893/893, typecheck, lint, build, bundle-budget, build:mobile + dist-smoke, dist-offline, e2e:mock 171/171.

---

### 2026-07-20 — X17A FAZA 2 (Z129): „Dodaj serię" pod listą + menu ⋯

**Problem:** rzadkie akcje ćwiczenia były rozsiane po trzech miejscach (ikona `Info` w nagłówku, chipy w stopce, przyciski POD kartą), a „Dodaj serię" siedziało w pasku akcji na dole, nie tam, gdzie kończy się lista serii. Pasek chipów mieszał nagie ikony (`%`, dysk) z etykietowanymi, bez `flex-wrap` — po samej ikonie dysku nie było wiadomo, że to kalkulator talerzy.

**Decyzje:**

1. **„Dodaj serię" pełną szerokością bezpośrednio pod ostatnią serią** (wzorzec Hevy/Strong), w tym samym kontenerze co tabela.
2. **Limit 10 serii mówi, dlaczego.** Nieme `disabled` zastąpione komunikatem `card.addSetLimit`. Reguła 6 z `CLAUDE.md`: każdy stan blokady musi powiedzieć userowi, co się dzieje.
3. **Jedno menu `⋯` na rzadkie akcje:** Instrukcje, Zamień ćwiczenie, Pomiń, Notatka, Przypnij notatkę. Swap i pomiń pojawiają się tylko wtedy, gdy rodzic poda callbacki, więc widok historyczny ma menu bez akcji edycyjnych.
4. **Instrukcje jako dialog na żądanie.** Treść usunięta z karty w Z128.2 wraca pod jednym tapnięciem, z fallbackiem z biblioteki (działa też dla ćwiczeń własnych) i przejściem do pełnych szczegółów, gdy ćwiczenie jest w bibliotece. Ikona `Info` znika z nagłówka.
5. **Pusta przypięta notatka nie zajmuje miejsca w karcie.** Sekcja renderuje się dopiero, gdy notatka ma treść; zakłada się ją z menu (nowy prop `startInEdit` otwiera edycję od razu).
6. **Trzy chipy o jednym rozmiarze** (Rozgrzewka / Talerze / Metryki) przez wspólną stałą `chipClass` z `flex-1`. Zero ramek 1px — granice przez tło (No-Line Rule). Chip „Notatka" przeniesiony do menu.
7. **Kontrakt `memo()` utrzymany.** `handleRequestSwap` to `useCallback` z sygnaturą `(exerciseId)`, jak `handleSkipExercise`. Żadnej lambdy inline per karta — to była re-render bomba R2-07.

**Infrastruktura testowa:** `src/test/setup.ts` dostał polyfill `PointerEvent`, `*PointerCapture` i `scrollIntoView`. jsdom ich nie implementuje, a Radix na nich stoi — bez tego menu `⋯` nie otwiera się w żadnym teście jednostkowym. To polyfill środowiska, nie rozluźnienie asercji.

**Dwa fałszywe alarmy w bramkach (warto pamiętać, oba środowiskowe):**

- `exercise-picker` „chip kategorii zawęża listę" wywalił się raz na timeout 26 s w teście synchronicznym. Solo zielony, trzy kolejne pełne biegi 887/887 zielone. Przyczyna: kontencja CPU (dev server + workery vitest + Playwright naraz), nie kod.
- E2E karty sypało się losowo (raz 0 kart na `/workout/day-1`, raz brak chipa Talerze) na dev serverze **działającym od godzin z nagromadzonym HMR** po dziesiątkach edycji. Po restarcie serwera: 19/19 szeregowo, 170/170 pełne e2e. Wniosek na przyszłość: przed diagnozowaniem dziwnego e2e zrestartuj dev server, zanim zaczniesz szukać buga w kodzie.

Przy okazji poprawiony nowy test e2e: pole ciężaru wybierane po `aria-label`, nie po indeksie `spinbutton` — indeks zależy od liczby wierszy rozgrzewki, a te właśnie zmieniły pozycję w Z128.1.

**Weryfikacja:** test 887/887, typecheck, lint, build, bundle-budget (initial JS 1 490 669 / 1 536 000), build:mobile + dist-smoke, dist-offline, e2e:mock 170/170.

---

### 2026-07-20 — X17A FAZA 1 (Z128): hierarchia karty ćwiczenia

**Problem:** po treningu 2026-07-20 user zgłosił, że karta ćwiczenia jest nieczytelna. Zrzut baseline z symulatora iPhone 17 potwierdził: nad tabelą serii stał pusty kwadrat miniatury 92×72 (mapa `ANIMATION_FILES` jest PUSTA, więc placeholder pokazywał się przy KAŻDYM ćwiczeniu), 6 linii instrukcji i osobna sekcja rozgrzewki z własnym badge'em. Efekt: nad zgięciem ekranu mieściły się dwie serie robocze.

**Decyzje:**

1. **Rozgrzewka wchodzi do wspólnej tabeli serii** (Z128.1). Osobna sekcja z badge'em „Rozgrzewka" i własnym dividerem znika, oznaczeniem zostaje złote „W" w kolumnie SET. Nagłówki kolumn (`SET | POPRZ. | KG | POWT. | ✓`) są teraz PIERWSZE — user widzi strukturę tabeli, zanim zobaczy jej zawartość.
2. **Ukończona seria = wypełnione tło całego wiersza** (`bg-primary/[0.06]`), aktywna zachowuje obrys. Reguła zapisana wprost jako rozłączna (`completed ? tło : isActive && obrys`), bo aktywna to z definicji pierwsza NIEukończona. Zgodne z No-Line Rule: zero ramek, granice przez tło.
3. **Złoto rozgrzewki na obu ścieżkach renderu.** Dotąd tylko stara ścieżka `weight_reps` oznaczała inputy rozgrzewki; `renderTrackedSetRow` (Z105) nie. `DurationInput` dostał opcjonalny `className`.
4. **Miniatura tylko gdy JEST animacja** (Z128.2). Skoro `ANIMATION_FILES` jest pusta, dziś oznacza to brak miniatury i pełną szerokość dla tytułu. Gdy animacje wrócą, gałąź z `<video>` działa bez zmian (test pokrywa obie).
5. **Instrukcje wypadają z karty na stałe** — idą do menu `⋯` (Z129). Uzasadnienie celu i ostatnia notatka zostają, ale jako jeden zwarty blok metadanych.
6. **`.exercise-card-divider` usunięta.** Klasa była martwa (`height: 0; background: transparent`) i miała 4 użycia udające sekcjonowanie. Zastąpiona odstępami.
7. **Tło nagłówka karty przez token.** `#262626` na sztywno ignorowało light mode (ciemnoszary pasek na białej karcie). Teraz `hsl(var(--surface-highest))`; w dark to dokładnie 0 0% 15%, więc ciemny motyw wygląda identycznie.

**Weryfikacja:** test charakteryzujący `exercise-card-layout.test.tsx` napisany PRZED zmianami (16 asercji, dwa bloki: niezmienniki i stan-do-zmiany); każda nowa asercja potwierdzona czerwona przed implementacją. Bramki: test 879/879, typecheck, lint, build, bundle-budget (initial JS 1 490 147 / 1 536 000), dist-smoke, dist-offline, e2e:mock 168. Zrzut po zmianie: cała karta (W + 3 serie) mieści się nad zgięciem razem z początkiem następnego ćwiczenia.

**Zaktualizowane testy e2e (nie obejścia, zmiana kontraktu UI):** badge „Rozgrzewka" → test pozycji wiersza W pod nagłówkami kolumn; asercja obecności martwego dividera → asercja jego BRAKU plus sprawdzenie, że nagłówek odcina się tłem.

---

### 2026-07-20 — INCYDENT NA TRENINGU (konto admina): utrata 5 ćwiczeń + 4 inne bugi

**Zgłoszenie:** trening z planu (Poniedziałek/Góra A, 6 ćwiczeń) → wyjście → szybki trening → powrót do planu = TYLKO 1 ćwiczenie na ekranie. User zrobił pozostałe 5 ćwiczeń na siłowni, ale nie miał ich gdzie zalogować. Do tego: pomarańczowe nieczytelne bloki, baner syncu nie do usunięcia, rozjeżdżający się/zoomowany layout, tap zaznaczający tekst.

**Ground truth z Firestore (read-only):** `workout-...-day-1-2026-07-20` miał completed=false i JEDNO ćwiczenie (tpl-ex-29, 4 serie) przy revision=6; obok pusty `adhoc-2026-07-20-...` (completed=true, 0 ćwiczeń, 6 sekund).

**Root cause 1 (utrata danych):** `day` w WorkoutDay był budowany WYŁĄCZNIE z kluczy `draft.exerciseSets` (gałąź dodana dla szybkiego treningu Z104). Draft miał tylko dotknięte ćwiczenie, więc reszta planu znikała z ekranu — i z treningu. Wzmacniało to drugie niedopatrzenie: wznowienie istniejącej sesji (`result.existing`) nie robiło pre-fillu, więc stan startował pusty i pierwsza edycja tworzyła 1-elementowy draft. Fix: `buildDayFromDraft` (plan = BAZA, draft tylko dokłada + nadpisuje nazwę przy swapie) + pre-fill brakujących ćwiczeń przy wznowieniu.

**Root cause 2 (zacięty sync):** pusty trening przechodzi zapis do chmury, ale walidacja finalna zwraca `empty-final-payload` — warunku NIE DA SIĘ spełnić, więc draft z `finalSyncPending` wisiał wiecznie. Fix: pusty draft przy ukończonym treningu jest czyszczony (nie ma czego stracić) + blokada kończenia treningu bez ani jednej odhaczonej serii.

**Root cause 3 (kolory):** `bg-fitness-warning` bez `/10` — pełne pomarańczowe tło z pomarańczowym tekstem (WorkoutDay x2, SyncCenterCard).

**Root cause 4 (zoom/zaznaczanie):** w CSS nie było ŻADNYCH reguł dotyku. WebView zachowywał się jak strona: pinch-zoom rozjeżdżał layout, tap w przycisk zaznaczał tekst. Fix: baseline dotyku w `index.css`, `maximum-scale=1`, `zoomEnabled:false`, guard `overflow-x`.

**Brak funkcji (zgłoszony przy okazji):** `deleteWorkout` istniał w hooku, ale NIE MIAŁ UI — nie dało się usunąć śmieciowego treningu. Historia ma teraz usuwanie z potwierdzeniem (`deleteWorkoutEverywhere` kasuje też lokalny szkic i wpis w kolejce).

**Odtworzenie danych:** trening 2026-07-20 uzupełniony z liczb podanych przez usera (6 ćwiczeń, 22 serie, 75 min, 5348 kg roboczego tonażu), revision 6→36 żeby lokalny szkic z telefonu nie wygrał. Backup przed zapisem w scratchpadzie sesji. Zweryfikowane odczytem po zapisie.

**Sprawdzone i CZYSTE:** cardio (238 aktywności Strava nietknięte, 0 ręcznych, usuwanie ręcznego cardio już było w edycji), plan (6 dni bez uszkodzeń), cykle, notatki, ćwiczenia własne.

**Lekcje zapisane w CLAUDE.md projektu (reguły 5-8):** nowa funkcja nie może zabrać niczego istniejącemu przepływowi (nazwij niezmiennik + test na stary przepływ); każdy stan błędu musi mieć wyjście; apka natywna ma się zachowywać jak apka; tła statusowe zawsze z przezroczystością. Checklista wdrożeniowa ma nowy scenariusz przerwania (plan → wyjście → szybki trening → powrót).

**Weryfikacja:** vitest 863/863 (26 nowych: buildDayFromDraft, hasAnyCompletedSet, hydracja pustego draftu), typecheck/lint/build/budżet zielone, e2e 333 passed z NOWĄ sceną regresji incydentu, sprawdzoną w obie strony (pada na starym zachowaniu, przechodzi po fixie). Web index-Cnb1kBsw, iOS build 68 VALID + obie grupy + Beta App Review APPROVED.


### 2026-07-20 — MARATON X14-X16 ZAKOŃCZONY (Z103-Z127): 8,5/9 planów wdrożonych

Podsumowanie autonomicznego wykonania (2026-07-19/20, prompt docs/PROMPT-WDROZENIE-X14-X16.md): X14A/B/C, X15A/B/C, X16A/B wdrożone w CAŁOŚCI (web + rules + functions + iOS TestFlight, buildy 59-67 wszystkie VALID + Beta App Review APPROVED); X16C wdrożony w zakresie wykonalnym (backend + web + iOS 67; apka Connect IQ napisana w `garmin/`, NIEZBUDOWANA — SDK za logowaniem Garmin = KROK USERA). Najważniejsze odkrycie maratonu: FIX SYSTEMOWY signingu iOS (buildy 47-63 miały binarki bez entitlements — martwe Sign in with Apple i push; od 64 manual signing w archive). KROKI USERA i backlog v2: raport końcowy sesji + wpisy per plan poniżej. Web X16C (index-BLktCjfp) POTWIERDZONY LIVE 2026-07-20 ~03:40 (Pages build wisiał ~1h przez nocny incydent GitHuba, API 503; pomógł ponowny trigger builds po ustąpieniu incydentu).

### 2026-07-20 — X16C (Z125-Z127): backend Garmin WDROŻONY, apka CIQ napisana (BLOKADA: SDK za logowaniem Garmin)

**Co wdrożone:** iOS build 67 (VALID, obie grupy TestFlight, Beta App Review APPROVED — maraton zamyka się buildami 59-67, wszystkie APPROVED); web index-BLktCjfp; functions na prod (smoke 401 na złym kodzie): callable garminPairStart/garminDevices/garminRevokeDevice + HTTP garminPair/garminDay/garminIngest (token urządzenia Bearer; w Firestore WYŁĄCZNIE hashe z pepperem API_KEY_PEPPER; kod 6-cyfrowy TTL 10 min jednorazowy z TTL Firestore; rate limit 2 s per token; CORS domyślnie zamknięty). Rules: deny-all dla device_pair_codes/device_tokens (nawet admin — tokeny to sekrety; 5 testów). Web: sekcja "Zegarek Garmin" w Ustawieniach (kod z odliczaniem, lista urządzeń, odłączanie). Testy: 20 functions + parytet ingest→sanitizeWorkoutDoc klienta + e2e sekcji.

**Decyzje architektoniczne:** (1) garminDay zwraca kompaktowy JSON <8KB (praktyczny limit makeWebRequest przez BLE; test rozmiaru na 12 ćwiczeń) — serie jako pary [reps, kg], klucze 1-literowe. (2) Cel serii z UPROSZCZONEJ double progression w functions (progress/hold — parytet z decideNextSet testowany); pełny silnik (plateau/ból/deload) zostaje w kliencie — przeniesienie do wspólnego pakietu = v2, kopiowanie 500 linii silnika do functions odrzucone. (3) garminIngest: dedup po eventId, local-wins po timestamp per seria, idempotentny docId garmin-<deviceId>-<workoutId>, guard jednoczesności (istnieje completed sesja dnia → zapis jako ad-hoc "(Garmin)", zero mergowania).

**BLOKADA ZEWNĘTRZNA (KROKI USERA):** kompletne źródła apki CIQ w `garmin/` (Monkey C: picker parowania, widok dnia z cache offline, ekran ćwiczenia ze stepperem i celem/notatką, rest timer z wibracją, ActivityRecording strength→FIT, kolejka zdarzeń w Storage; i18n PL/EN; 12 urządzeń, min API 4.0.0) — NIEZBUDOWANE, bo pobranie Connect IQ SDK wymaga zalogowania kontem Garmin w SDK Managerze. User: (1) SDK Manager + logowanie + SDK 9.2.0 i urządzenia, (2) klucz developerski (openssl, instrukcja w garmin/README.md), (3) `garmin/build.sh fenix7` + poprawki pierwszej kompilacji, (4) konto developerskie Garmin → submit do Connect IQ Store. Research: SDK 9.2.0 (2026-06-08); limity makeWebRequest ~8KB/-2/-300/-102.

### 2026-07-20 — RELEASE X16B (Z122-Z124): Apple Watch v1 domknięty na bazie prototypu

**Co:** web index-CtB1XlVp + iOS build 66 (VALID, obie grupy, Beta App Review APPROVED). Prototyp watch pokrywał ~80% scope v1 (audyt w PLAN-X16B FAZA 0) — dorobione braki: etykieta celu tygodnia (silnik X16A) i przypięta notatka (X14A) w payloadzie (`buildWatchExercises`, notatka przycięta do 140 znaków), i18n zegarka PL/EN (enum L10n, język z payloadu — zero grzebania w pbxproj), wskaźnik "niezsynchronizowane" (outstandingUserInfoTransfers + delegate didFinish, widoczny gdy telefon nieosiągalny), DEDUPLIKACJA zapisu Health: eventy z zegarka niosą flagę `hkSession` — telefon pomija własny syncWorkoutToHealth, gdy sesję HKWorkout (z tętnem) prowadził zegarek.

**Weryfikacja:** vitest 848/848 (watch-contract 5 nowych), e2e 330 passed (2 webkit-faile: flak + środowiskowy analytics-pdf potwierdzony bisektem na commit sprzed zmian), build obu targetów Xcode, pętla na parze symulatorów (iPhone 17 + Ultra 3, bundle E2E mock bez realnych kont): context dochodzi, L10n renderuje, nowe pola nie psują dekodowania. Interaktywne scenariusze headless niewykonalne (ekran hosta zgaszony, simctl bez tap) — KROK USERA na realnym sprzęcie. Lekcja narzędziowa: seed UserDefaults symulatora przez `simctl spawn defaults write` nie działa dla sandboxa apki (cfprefsd cache) — a świeży context z telefonu i tak nadpisuje.

### 2026-07-20 — RELEASE X16A (Z119-Z121): progresja programowa v1 + audyt prototypu watch (X16B FAZA 0)

**Co:** X16A w całości na prod: web index-BP5paMV1 + rules (update progression) + iOS build 65 (upload OK, poll VALID/external w tle). Z121: DeloadBanner na Dashboardzie ([Zastosuj]/[Pomiń] → progression.deloadDecisions, punktowy updateDoc bez rewizji planu), suggestEarlyDeload (>=2 plateau lub powtarzalny ból >=4 w 2 ostatnich sesjach; cooldown 3 tyg. od zastosowanego; nigdy w tygodniu programowym), WeekReportCard (raport ostatniego ZAKOŃCZONEGO tygodnia: cele liczone z historii sprzed niego → % realizacji + do 3 rozjazdów z faktycznym wynikiem). Decyzja 'applied' aktywuje wariant deloadowy też poza harmonogramem (wcześniejszy deload). ODŁOŻONE: "sekcja w AI podsumowaniu tygodnia" — w kodzie nie ma AI podsumowania (chat usunięty w X12B); ewentualne rozszerzenie weekly digest o raport = backlog v2 (digest w functions nie ma dostępu do silnika klienta).

**Audyt prototypu Apple Watch (X16B FAZA 0):** prototyp pokrywa ~80% scope v1 (most, kolejka transferUserInfo, rest timer z haptyką, steppery+crown, HKWorkoutSession z HR na zegarku, router startWorkout). Braki: etykieta celu tygodnia i przypięta notatka w payloadzie, wskaźnik niezsynchronizowanych, i18n zegarka, DEDUPLIKACJA zapisu Health (zegarek i telefon zapisują OBA — do rozwiązania w X16B FAZA 1). Szczegóły w docs/PLAN-X16B-2026-07-19.md (FAZA 0).

**Weryfikacja:** vitest 843/843 (silnik 21 testów), rules 162/162 (2 nowe update progression), e2e 327 (5 nowych scen Z120-Z121), symulacja 2 tygodni + deload w tygodniu 5 przez e2e mock (zero realnych kont). Tooling: preflight akceptuje $(MARKETING_VERSION).

### 2026-07-20 — RELEASE X15C (Z116-Z118): Apple Health / Health Connect + fix signing iOS

**Co:** cały release train X15C na prod: web index-Y_2d8C3i (health-bridge no-op w web), iOS build 64 (VALID, obie grupy TestFlight, Beta App Review APPROVED), Android AAB release-ready z Health Connect. Do buildu 64 weszły też gotowe Z119-Z120 (progresja: konfiguracja + cele tygodnia).

**Incydent buildu 64 i fix systemowy signingu:** pierwszy upload padł na flaky iTMSTransporter ("Defaults.properties"), retry ujawnił altool 90166: StrengthWatch.app w IPA z PUSTYMI entitlements. Root cause GŁĘBSZY: pipeline archiwizował BEZ podpisu (CODE_SIGNING_ALLOWED=NO), a re-sign przy eksporcie nadaje tylko minimalne entitlements z profilu — główna apka na TestFlight (buildy 47-63) NIE MIAŁA healthkit/applesignin/aps-environment, czyli Sign in with Apple i push były martwe w binarce. Fix: manual signing w Release configach 3 targetów (Apple Distribution + PROVISIONING_PROFILE_SPECIFIER), profile watch/widgets przez scripts/watch_signing.py (idempotentny, aktualizuje ExportOptions-manual.plist), archive podpisuje pełne App.entitlements. Weryfikacja: codesign -d --entitlements na IPA — App: healthkit+applesignin+aps; Watch: healthkit; Widgets: bazowe.

**KROKI USERA (X15C):** pełna pętla Health na realnym iPhone; App Privacy kategoria Health w ASC; test Sign in with Apple + push na buildzie 64 (pierwszy build z działającymi entitlements); emulator Android z Health Connect.

### 2026-07-20 — X16A FAZA 2 (Z120): silnik celów tygodniowych + cele w UI treningu

**Co:** `computeWeeklyTargets(planDays, workouts, weekIndex, config, options)` w `progression-engine.ts`: per dzień / per ćwiczenie cel `{kind, targetWeight, targetReps, targetSets, targetDurationSec, reasonKey}`. Priorytety: deload-week (tylko z decyzją `deloadApplied`) > ból (pain>=4 w ostatniej sesji, -10% do 2.5 kg) > plateau (>=4 sesje, -10%) > double progression (góra zakresu → +2.5 compound / +1 isolation, reps do dołu; w zakresie → hold +1 powt.). Typ duration: best +10% do 5 s. Deload-week: -40% serii (ceil, min 1), -10% ciężaru do 2.5 kg. UI: badge "Cel tygodnia" w ExerciseCard (priorytet RZA > weeklyTarget > nextAdvice), reason pod nagłówkiem; pre-fill startu treningu bierze cel (`createPrefilledSets` z opcjonalnym targetem), deload-week redukuje też liczbę pre-fillowanych serii.

**Dlaczego tak:** wspólna funkcja `decideNextSet` wydzielona z `next-set-advice.ts` — coach serii i silnik tygodniowy liczą IDENTYCZNĄ decyzją (testy charakteryzujące z Z119 zielone bez modyfikacji, i18n zostało w next-set-advice). Silnik czysty, zero zapisów. E2E mock: nowy klucz `fittracker_e2e_plan` (startDate+progression w useTrainingPlan) — bez tego mock nie ma jak włączyć silnika.

**Weryfikacja:** vitest 835/835 (13 nowych silnika + 4 pre-fill z celem), e2e 325 passed (3 nowe sceny Z120: badge progress 62.5×6 + pre-fill z celu, badge hold, brak badge bez configu), typecheck/lint/build/bundle-budget zielone. Webkit 5 failed w drugim pełnym runie = flaki obciążeniowe (za każdym runem inne stare testy; solo-run przechodzi).

**Model:** `ProgressionConfig { enabled, deloadEveryWeeks (2-12, default 5), deloadDecisions? }` w polu `progression` dokumentu planu (brak pola = silnik wyłączony dla starych planów; NOWE plany z kreatora/onboardingu: DEFAULT_PROGRESSION enabled). `sanitizeProgressionConfig` + `isDeloadWeek` (1-based, co N tygodni) z testami. Rules: `progression` w validTrainingPlanShape (zamknięta mapa, 4 testy — 160/160). Edycja: sekcja "Progresja" w PlanEditor (toggle + select 3/4/5/6/8 tyg., zapis przez savePlan z syncActiveCycle: false). Testy charakteryzujące coacha serii dopisane PRZED refaktorem (+3 gałęzie bodyweight: progress/hold/deload).

**LEKCJA NOCNA (klasa błędu: daty UTC vs lokalne w testach):** po północy CEST `new Date().toISOString()` daje WCZORAJ (UTC) — 4 testy strava-utils i 8 e2e nagle czerwone (autostart blokowany jako "przeszłość", tygodnie przesunięte). Fix systemowy: `formatLocalDate` w unit testach, helper `localToday()` w e2e/helpers (w page.evaluate inline — funkcje node niedostępne w przeglądarce). Reguła: testy dat ZAWSZE liczą lokalnie jak apka.

### 2026-07-19 — X15C FAZA 2 (Z117+Z118): Health Connect (Android) + ustawienia i propozycja wagi

**Z117 Android:** własny `HealthSyncPlugin.kt` (Kotlin WŁĄCZONY w projekcie: kotlin-gradle-plugin 2.0.21 + connect-client 1.1.0-alpha07 + coroutines; rejestracja w MainActivity.registerPlugin przed super.onCreate; uprawnienia health.WRITE_EXERCISE/READ_WEIGHT w manifeście). **minSdk 24 -> 26** (wymóg connect-client; Android nieopublikowany, zero userów — decyzja w ramach autonomii). Flow zgód v1: brak pełnego ActivityResult — przy braku zgód otwieramy ustawienia Health Connect (ACTION_HEALTH_CONNECT_SETTINGS), user nadaje tam; kolejne wywołanie zwraca granted. Rename metody na `requestHealthPermissions` (kolizja z bazową Plugin.requestPermissions na OBU platformach). Weryfikacja: `gradlew :app:compileDebugKotlin` BUILD SUCCESSFUL. **ODŁOŻONE: scenariusz na emulatorze** — SDK bez emulatora/AVD na tej maszynie (KROK USERA albo przyszła sesja z emulatorem).

**Z118:** sekcja "Zdrowie" w Ustawieniach (widoczna TYLKO gdy bridge.isAvailable — web ukryta, asercja w e2e; zgody systemowe dopiero przy pierwszym włączeniu toggle, nie przy starcie), stan w localStorage (natura uprawnień systemowych = per urządzenie); `HealthWeightSuggestion` w Pomiarach (banner "Dodaj X kg ze Zdrowia", zapis ISTNIEJĄCĄ ścieżką addMeasurement po tapnięciu, nigdy auto). iOS bridge platform-guard: web bundle +1.2 KB (registerPlugin lazy).

**Weryfikacja:** vitest 815/815, e2e 161/161, bundle budget OK; symulator iOS: build z pluginem+entitlementem SUCCEEDED, apka startuje bez crasha (screenshot sim-health.png). Pełna pętla trening->Health->waga na realnym urządzeniu = KROK USERA (na symulatorze zalogowane realne konto — zapis treningu zabroniony).

### 2026-07-19 — X15C FAZA 1 (Z116): warstwa health-sync + HealthKit (iOS)

**Wybór pluginu (research 2026-07-19):** ekosystem NIE wspiera zapisu workoutów (@capgo/capacitor-health: workouts read-only; @perfood/capacitor-healthkit: iOS-only, zapis niepotwierdzony, luty 2025) => WŁASNY minimalny plugin `HealthSyncPlugin.swift` (wzorzec lokalnego WatchBridgePlugin z prototypu X16B; auto-rejestracja CAPBridgedPlugin, 4 metody: isAvailable/requestPermissions/writeWorkout/readLatestWeight; HKWorkoutBuilder + bodyMass HKSampleQuery).

**Warstwa abstrakcji:** `health-sync.ts` (interfejs HealthBridge + czyste mapowania: mapWorkoutToHealth ze znaczników startedAt/completedAt i fallbackiem date+durationSec, mapCardioToHealth z pełną mapą 10 typów X15A, shouldSyncWorkout idempotentny po endMs, newerHealthWeight z epsilonem 0.1 kg) — 14 testów. `health-bridge.ts`: platform guard (iOS native / no-op), retry x3 z backoffem, log client_errors przy porażce, stan syncu i ustawienia w localStorage (natura uprawnień systemowych = per urządzenie).

**Formalności wykonane przez API:** capability HEALTHKIT dodana do App ID + stary profil usunięty + nowy profil provisioning zainstalowany + ExportOptions-manual.plist zaktualizowany (`scripts/asc_healthkit_capability.py`). Entitlement com.apple.developer.healthkit + NSHealthShare/UpdateUsageDescription (uczciwe opisy PL).

**Weryfikacja:** vitest 815/815, e2e 161/161, bundle web BEZ regresji (1 483 476 B — identyczny). Scenariusz ręczny na symulatorze po Z118 (wymaga toggle w Ustawieniach).

### 2026-07-19 — RELEASE X15B (Z114-Z115) na prod

**Wdrożone:** web index-E0HlxZjB (z fixem: cardio na wykresach #00e3fd zamiast niezdefiniowanego --chart-2 renderującego się na czarno — jawny kolor design systemu jak wykresy Strava); iOS 1.0.0 build 63 + external (APPROVED). Rules bez zmian. Bramki: vitest 801, e2e 161, dist-smoke/offline PASS. Lekcja: pierwszy pipeline 63 ubity PRZED uploadem (fix cyan wszedł do tego samego numeru builda — czysto, bez marnowania numeru).

### 2026-07-19 — X15B FAZA 2 (Z115): UI tygodnia hybrydowego

**Wdrożone:** HybridWeekStrip na Dashboardzie (7 mini słupków pon-nd siła/cardio + dismissowalny banner interferencji, dismiss per para w localStorage `fittracker_interference_dismissed_v1`, przeżywa reload); HybridLoadCard w Analytics zakładka Podsumowanie (12 tygodni stacked bar siła+cardio + linia total + % split bieżącego tygodnia + hint interferencji z 7 dni); TrainingLoadChart z opcjonalnym prop workouts — CTL/ATL/TSB karmione ŁĄCZNYM loadem (test: dodanie sesji siłowej podnosi ATL), etykieta "obejmuje siłę i cardio".

**Odstępstwo (ODŁOŻONE):** "wpis w podsumowaniu tygodnia AI (prompt dostaje detectInterference)" — AI podsumowanie tygodnia NIE ISTNIEJE już w kliencie (AI Chat/Coach usunięte w v6.7.0/X12B). Interferencja trafia do UI (banner Dashboard + hint w karcie hybrydowej). Ewentualne rozszerzenie weekly digest (functions) o interferencję = backlog.

**Pułapka odkryta:** domyślna zakładka Analytics to 'weekly' (nie 'summary') — testy klikają "Podsum.".

**Weryfikacja:** vitest 801/801 (14 hybrid-load z testem ATL), e2e 161/161 (2 nowe Z115: hybryda z interferencją i dismissem po reloadzie; konto tylko-siłowe 100% bez crasha), bramki komplet.

### 2026-07-19 — X15B FAZA 1 (Z114): silnik obciążenia hybrydowego

**sTRIMP (Foster session-RPE):** load siłowy = minuty x RPE sesji (średnia ważona liczbą ukończonych serii roboczych z exercises[].rpe; fallback RPE 6.0; brak durationSec => serie x 3 min). **Kalibracja do skali TRIMP:** STRENGTH_TO_TRIMP_CALIBRATION = 0.23 — godzinna sesja RPE 6 (sTRIMP 360) zrównana z godzinnym biegiem moderate (~75% HRmax => TRIMP ~83 przy rest 60/max 190); stała jawna, przybita testem (test kalibracyjny: ratio siła/cardio w przedziale 0.8-1.2). UI dostanie etykietę "obciążenie szacunkowe".

**Interferencja (czysta reguła, zero ML):** ciężkie nogi = tonaż ćwiczeń kategorii legs/glutes/calves >= 1500 kg w sesji (próg jawny); intensywne cardio = Run/HIIT/Treadmill nie-easy (intensywność odczuwana; fallback HR >= 140; bieg/HIIT bez danych = wymagający); okno D lub D+1. Wynik: lista par (informacja, nigdy blokada).

**Weryfikacja:** vitest 13/13 hybrid-load (pełne pokrycie czystych funkcji), typecheck/lint zielone.

### 2026-07-19 — RELEASE X15A (Z111-Z113) na prod

**Wdrożone:** rules (manual_activities) + composite index manual_activities(userId, date desc); web index-CyMOYXXe (live zweryfikowane); iOS 1.0.0 build 62 + testflight_external.py (Beta App Review APPROVED). Bramki: vitest 787, e2e 159, rules 156, dist-smoke/offline PASS. Weryfikacja klikana na realnym koncie = KROK USERA (scenariusze pokryte e2e mock; screenshot dialogu cardio w scratchpadzie).

### 2026-07-19 — X15A FAZA 3 (Z113): manualne cardio w widokach + TRIMP

**TRIMP bez HR:** `computeDailyLoad` — realny pomiar HR WYGRYWA; bez HR intensywność odczuwana mapowana na reprezentatywny %HRmax (easy 60 / moderate 75 / hard 88); bez HR i bez intensywności aktywność pominięta (jak dotąd nieobecna). Testy obu ścieżek. TrainingLoadChart w StravaTab dostaje strumień zunifikowany (merge Strava+manual).

**Konsumenci przełączeni na useActivities:** Dashboard (FAZA 2), TrainingPlan kalendarz (FAZA 2), AnalyticsWeeklyTab (podsumowania tygodni: runKm/czas liczą też manualne), TrainingLoadChart. Czysto-Stravowe nietknięte (Race Predictor, HR Zones, Pace/Calories/Elevation, personal bests).

**Odstępstwa odnotowane:** (1) AI podsumowanie tygodnia operuje na AGREGATACH (runKm, czas) — manualne wpisy WCHODZĄ przez unified, ale "etykieta źródła per aktywność" nie ma nośnika w prompcie (prompt nie listuje aktywności) — wariant prostszy; (2) weekly digest (functions, e-mail) liczy po stronie serwera ze strava_activities — manualne wpisy nie wchodzą do MAILA (backlog: rozszerzenie digestu o manual_activities); (3) Training Load w UI żyje w zakładce Strava — user bez Stravy nie widzi TRIMP (X15B doda kartę obciążenia hybrydowego w Analytics dla wszystkich).

**Weryfikacja:** vitest 787/787 (10 training-load z nowymi ścieżkami), e2e 159/159 (nowy: manualny bieg 5 km w podsumowaniu tygodnia; regresja tylko-Strava = komplet istniejących), bramki komplet.

### 2026-07-19 — X15A FAZA 2 (Z112): UI logowania cardio

**AddCardioDialog:** typ (grid 10 chipów z ikonami) + czas w MINUTACH obowiązkowe (decyzja: minuty zamiast mm:ss — cardio loguje się w minutach, mniej tarcia niż parser), data edytowalna (wpisy wsteczne), reszta pod Collapsible "więcej" (dystans km->m, HR, kalorie, intensywność easy/moderate/hard, notatka). Wejścia: Dashboard (przycisk obok "Szybki trening", grid 2 kolumny) i kalendarz TrainingPlan (przycisk "Cardio" przy każdym dniu z defaultDate). Edycja: klik karty manualnej otwiera dialog z przyciskiem Usuń (ConfirmDialog); wpisy Strava read-only (klik = szczegóły Strava jak dotąd).

**StravaActivityCard rozszerzona chirurgicznie:** opcjonalny prop onEdit; wpis manualny = badge "Ręczny" + kolor fitness-cyan (Strava zostaje pomarańczowa brandowo); brak propa = render identyczny jak dotąd (zero regresji Strava). Dashboard i TrainingPlan przeszły na useActivities (manual ZAWSZE widoczne, Strava gate connected jak dotąd); weeklyKm i komponenty czysto-Stravowe nietknięte.

**Fix przy okazji (lint):** build/sim (build symulatorowy z weryfikacji X14B) nie był w ignores eslinta — lint failował od tamtej pory, maskowane przez `| tail` (exit code tail-a). Fix: ignores "build/**". Lekcja: bramki bez pipe albo z pipefail.

**Weryfikacja:** vitest 785/785, e2e 158/158 (nowy: dodaj Bieżnia 30 min -> Dashboard+kalendarz -> edycja 45 min -> usunięcie z potwierdzeniem), bramki komplet.

### 2026-07-19 — X15A FAZA 1 (Z111): model i hooki manual_activities

**Architektura:** osobna kolekcja `manual_activities` (kształt podzbioru StravaActivity + source='manual'; NIE dotykamy strava_activities — sync nadpisuje). Zamknięta lista 10 typów (Run/Ride/Walk/Hike/Swim/Treadmill/IndoorRide/JumpRope/HIIT/Other), jednostki kanoniczne (metry/sekundy). `sanitizeManualActivity`: typ+data+czas obowiązkowe, śmieciowe wartości opcjonalne POMIJANE (nie unieważniają wpisu), zero undefined. `UnifiedActivity = StravaActivity & { source, perceivedIntensity? }` + `mergeActivities` (sort desc po dacie, stabilny po id). Hooki: `useManualActivities` (CRUD, onSnapshot userId+date desc limit 500, E2E localStorage) + `useActivities` (warstwa scalająca; Strava zostaje read-only).

**Rules:** zamknięty schemat validManualActivityShape (11 testów, 156/156) + composite index manual_activities(userId, date desc). `perceivedIntensity` easy/moderate/hard = wejście TRIMP bez HR (mapowanie 60/75/88 %HRmax w FAZIE 3).

**Weryfikacja:** vitest 785/785 (9 manual-activity), e2e 157 (1 flake w pierwszym runie, retry czysty), bramki komplet.

### 2026-07-19 — RELEASE X14C (Z109-Z110) na prod — X14 KOMPLETNY

**Wdrożone:** rules (workouts.importBatchId) + NOWY composite index workouts(userId, importBatchId) na cloud.firestore; web index-OskchBvM na gh-pages (live zweryfikowane pętlą aż nowy hash); iOS 1.0.0 build 61 + testflight_external.py (obie grupy, Beta App Review APPROVED). Bramki: vitest 776, e2e 157, rules 145, dist-smoke/dist-offline PASS.

**Weryfikacja end-to-end importu:** wykonana na KONCIE TESTOWYM e2e (mock, zero dotykania realnych kont): pełny scenariusz importu fixture Strong (3 treningi, 1 uszkodzony wiersz zliczony, auto-mapowanie 7/7) -> historia ze snapshotami nazw -> idempotencja (2x ten sam plik = nadal 3) -> cofnięcie (0 treningów). Screenshot wizarda w scratchpadzie sesji (import-wizard.png). Statystyka auto-mapowania na fixtures: Strong 7/7, Hevy analogiczne nazwy pokryte aliasami+mapą EN.

**X14 (A+B+C) DOMKNIĘTY:** wszystkie 3 plany wykonane i wdrożone tego samego dnia (buildy 59/60/61, web index-CNXBdODL -> DwKIaJCS -> OskchBvM). Następny: X15A (ręczne cardio).

### 2026-07-19 — X14C FAZA 2 (Z110): kreator importu + zapis + cofnięcie

**Bezpieczeństwo danych (dane usera święte):** zapis WYŁĄCZNIE nowych dokumentów `imported-<batchId>-<n>` (istniejące treningi niedotykane — test rules na cudzy userId), zero zapisów bez jawnego checkboxa potwierdzenia w kroku podglądu (N treningów, zakres dat, M serii), cofnięcie jednym przyciskiem = delete po `importBatchId` (query userId+importBatchId, NOWY composite index w firestore.indexes.json), idempotencja = batchId z hasha pliku (FNV-1a x2, 16 hex — decyzja: synchroniczny hash zamiast async crypto.subtle, wystarczający per user).

**Implementacja:** rules: `importBatchId` dopisany do validWorkoutShape (string<=64) + 4 testy (145/145); hook: `importCsvSessions` (batched po 400, progress callback, gałąź E2E na localStorage fittracker_e2e_workouts) + `deleteImportBatch`; `WorkoutImportWizard` w Ustawieniach -> Twoje dane (kroki: plik -> podsumowanie+mapper (select 241+custom, "jako własne" przez useCustomExercises, wybór kg/lbs dla Strong) -> checkbox -> zapis z progress -> sukces; Historia importów w localStorage `fittracker_import_history_v1`, max 20 wpisów).

**Weryfikacja skutków:** PRy/rekordy/wykresy/heatmapa liczą z całej historii — imported wchodzą z DATAMI HISTORYCZNYMI z CSV (getExerciseBest1RM.bestDate = w.date; brak fałszywych "dzisiejszych" PR — import nie triggeruje detectNewPRs, ta ścieżka działa tylko przy kończeniu treningu). E2E: pełny scenariusz (import fixture -> historia z snapshotem dayName -> idempotencja 2x = nadal 3 treningi -> cofnięcie = 0) + rekordy w Achievements z importu.

**Weryfikacja:** vitest 776/776, e2e 157/157, rules 145/145, bramki komplet. Flaki e2e w pełnych runach (3 różne testy, zawsze pass w izolacji) = obciążenie maszyny przy równoległości, nie regresja.

### 2026-07-19 — X14C FAZA 1 (Z109): parser CSV Strong/Hevy + mapowanie nazw

**Formaty (zweryfikowane na realnych eksportach z GitHuba, nie z pamięci):** Strong `Date,Workout Name,Duration,Exercise Name,Set Order,Weight,Reps,Distance,Seconds,Notes,Workout Notes,RPE` (data "YYYY-MM-DD HH:MM:SS", warmup Set Order=W, jednostka wagi NIEZAPISANA w pliku => opcja strongWeightUnit w wizardzie, default kg); Hevy `title,start_time,...,exercise_title,...,set_index,set_type,weight_kg,reps,distance_km,duration_seconds,rpe` (daty ISO albo "30 Jun 2025, 19:56"; set_type normal/warmup/dropset/failure albo 1/2/3/4; starszy wariant weight_lbs/distance_miles => auto-wykrycie kolumny z danymi). Parser: własny splitter CSV (quoted fields), przecinek dziesiętny PL, uszkodzone wiersze pomijane z licznikiem, grupowanie sesji po (data+nazwa treningu).

**Mapowanie nazw:** kolejność prób custom usera -> exact PL -> alias Strong/Hevy (~55 pozycji, tylko gdy cel istnieje w bibliotece) -> odwrócona mapa EXERCISE_NAME_EN (241 par za darmo) -> transformacja "X (Equipment)" -> "Equipment X". Nieznane nazwy NIE są zgadywane (unmapped => ręczny mapper w UI). `buildImportedSessions`: id=dayId=`imported-<batchId>-<n>`, snapshot nazw, completed, tag `importBatchId` (nowe opcjonalne pole WorkoutSession), RPE ćwiczenia = max z serii, sanityzacja clampSet (zero undefined).

**Weryfikacja:** vitest 775/775 (13 parser + 10 mapper na fixtures wiernych strukturze), e2e 155/155, bramki komplet.

### 2026-07-19 — RELEASE X14B (Z105-Z108) na prod

**Wdrożone:** rules (custom_exercises + tracking) na cloud.firestore; web index-DwKIaJCS na gh-pages (live zweryfikowane po propagacji CDN ~60 s); iOS 1.0.0 build 60 + testflight_external.py (obie grupy, Beta App Review APPROVED od razu). Bramki: vitest 752, e2e 155, rules 141, dist-smoke (build:mobile) i dist-offline (build web!) PASS.

**Lekcja pipeline (kolejność dist checków):** `check:dist-offline` WYMAGA builda WEB (SW wyłączony w build:mobile) — kolejność: build:mobile -> dist-smoke -> build (web) -> dist-offline. Uwaga na maskowanie exit code: `skrypt | tail -1` zwraca exit tail-a — dist-offline "przechodził" mimo faila. Druga lekcja: NIGDY dwa ios-testflight.sh równolegle (wspólne build/ios i DerivedData — pierwsza próba builda 60 padła "4 failures" przez wyścig; ubić stary pipeline przed nowym).

**Weryfikacja na symulatorze (iPhone 17):** build Debug sim + instalacja + start — apka startuje bez białego ekranu, Dashboard z przyciskiem "Szybki trening" (X14A) renderuje się poprawnie. Na symulatorze zalogowane REALNE konto — scenariusz klikany plank+asysta+kalkulator wykonany wyłącznie w e2e mock (155 testów, w tym te scenariusze 1:1); zero zapisów na realnym koncie (dane święte).

### 2026-07-19 — X14B FAZA 3 (Z107+Z108): kalkulator talerzy + generator rozgrzewki %1RM

**Z107:** `computePlates` (greedy od najcięższych, arytmetyka w gramach — float 1.25 kg bez błędów; count = ŁĄCZNA liczba talerzy, floor(count/2) na stronę; cel<gryf => belowBar; niedokładność => najbliższy osiągalny W DÓŁ + info). Inwentarz w localStorage `fittracker_plate_inventory_v1` (gryf 20/15/10 + checkboxy talerzy w Ustawieniach; default pełny zestaw 25...1.25). UI: `PlateCalculatorSheet` (bottom sheet, wizualizacja talerzy na stronę) otwierany ikoną Disc w FOOTERZE karty ćwiczenia (nie per wiersz serii — grid serii to krytyczna ścieżka logowania, zero zmian w nim); ciężar = aktywna seria, fallback ostatnia robocza. Tylko weight_reps z ciężarem > 0.

**Z108:** `generateWarmupSets` — pusty gryf x10, 50% x8, 70% x5, 90% x2 od PIERWSZEGO ciężaru roboczego; zaokrąglanie W DÓŁ do 2.5 kg (lżejsza rozgrzewka bezpieczniejsza — decyzja w ramach autonomii); serie <= gryf i >= ciężaru roboczego pomijane; null dla bodyweight/duration/assisted. Przycisk (Flame+%) w footerze karty, znika gdy istnieją wypełnione warmupy (bez duplikacji). Dostępny w każdej karcie weight_reps z ciężarem (plan mówił "przy pierwszym ćwiczeniu" — rozszerzenie w ramach autonomii, rozgrzewka procentowa ma sens przy każdym boju). Warmup nie liczy się do tonażu (istniejący test regresji).

**Weryfikacja:** vitest 752/752 (6 plate-calculator, 6 warmup-generator), e2e 155/155 (rozkład 100 kg => "1×25 + 1×15"; generator wstawia 4 wiersze W i przycisk znika), bramki komplet.

### 2026-07-19 — X14B FAZA 2 (Z106): PR, tonaż i progresja per typ (asysta = wyróżnik)

**Obciążenie efektywne:** `computeEffectiveLoad` (effective-load.ts): assisted = masa ciała MINUS asysta (clamp 0 gdy asysta > waga), bodyweight = masa ciała, duration = null. **Skąd waga ciała:** najnowszy pomiar z `measurements` (`getLatestMeasurement`); **brak pomiaru** = PR asysty tylko po powtórzeniach + hint w dialogu progresji "dodaj pomiar wagi". Uproszczenie v1 (odnotowane): jedna AKTUALNA waga do obu stron porównania historycznego (nie mamy wagi per trening) — różnice effectiveLoad = różnice asysty, więc detekcja PR poprawna.

**PR per typ (`detectNewPRs` + opcjonalny 5. parametr, stare wywołania bez zmian):** assisted -> PR gdy effectiveLoad rośnie przy >= powtórzeniach (test wprost odtwarza skargę z r/Hevy: te same powtórzenia, mniejsza asysta => JEST PR); duration -> PR czasu; wdd -> PR iloczynu kg x m. WorkoutDay przekazuje trackingByExerciseId + bodyWeightKg (toast PR po treningu).

**Tonaż (twarda zasada 4, zapisana testami):** duration i assisted NIE wchodzą (weight=0); wdd wchodzi jako ciężar x 1 na serię (`setTonnage` w summary-utils). **Wykresy:** `getTrackedExerciseHistory` (duration: czas; assisted: effectiveLoad — malejąca asysta daje ROSNĄCĄ linię, fallback reps bez wagi; wdd: kg·m) + dedykowany widok w ExerciseProgressionDialog (resolwuje tracking z customExercises/biblioteki). **Achievements:** wariant prostszy — serie weight=0 nie generują rekordu 1RM (test), rekordy kg czyste; wartości typowane widać w dialogu progresji i historii.

**Weryfikacja:** vitest 740/740 (29 pr-utils, 13 progression, 20 summary, 7 effective-load, 18 achievements), e2e 153/153 (+utwardzenie flaky testu count bez auto-wait), typecheck/lint/build/budget zielone.

### 2026-07-19 — X14B FAZA 1 (Z105): silnik typów serii (czas/dystans/asysta)

**Model:** `SetData` rozszerzone TYLKO polami opcjonalnymi `durationSec`/`distanceM`/`assistWeight` (zero migracji). Typ per ćwiczenie: `LibraryExercise.tracking` + `getTrackingType`/`visibleSetFields` w `src/lib/set-tracking.ts` (brak pola = weight_reps, isBodyweight = bodyweight_reps, jawne pole wygrywa). Biblioteka: 3 planki -> duration, Farmer's Hold -> weight_distance_duration, Podciąganie wspomagane -> assisted_bodyweight + NOWE: Spacer farmera (wdd) i Dipy wspomagane (assisted) z tłumaczeniami EN. Własne ćwiczenia: wybór typu w formularzu pickera (chipy Standard/Na czas/Ciężar+dystans+czas/Z asystą), pole `tracking` w custom_exercises (rules: opcjonalne, zamknięta lista, 2 nowe testy).

**UI:** nowa gałąź renderu wiersza serii (renderTrackedSetRow) — ścieżka weight_reps/bodyweight_reps NIETKNIĘTA (twarda zasada: logowanie serii nie może zwolnić). Czas jako mm:ss (DurationInput: draft lokalny, parse na blur — parsowanie per znak psuje edycję), dystans w m, asysta "-kg". Historia: `formatHistorySetLabel` z ZAWARTOŚCI serii (historyczne dane nie znają trackingu). Coach serii: duration/wdd świadomie null, asysta = cel powtórzeniowy.

**Root cause (3 kopie sanityzacji gubiły nowe pola):** WorkoutDay.handleSetsChange/Local (inline map), exercise-utils.sanitizeSets, workout-draft-db.normalizeSet — każda przepisywała serie do {reps,weight,completed,isWarmup} i wycinała durationSec/distanceM/assistWeight (objaw: wartość w UI, brak w drafcie po round-trip IndexedDB). Fix: wspólny `carrySetExtras` (exercise-utils) + rozszerzenie normalizeSet; `setsMatch` w workout-final-sync porównuje też nowe pola (rozjazd = rozjazd zapisu). Rules workouts: pola serii NIE są walidowane wprost (validWorkoutShape sprawdza tylko top-level + notes) — zmiana rules niepotrzebna.

**Weryfikacja:** vitest 711/711, e2e 153/153 (2 nowe Z105: plank+farmer+asysta w szybkim treningu z draftem; render historii "1:30" / "24 kg · 40 m · 1:00" / "8×-25 kg"), rules 141/141, bramki komplet.

### 2026-07-19 — RELEASE X14A (Z103-Z104) na prod

**Wdrożone:** rules (exercise_notes) na cloud.firestore; web index-CNXBdODL na gh-pages (zweryfikowane live: nowy hash + render #root bez pageerrors w headless Chromium); iOS 1.0.0 build 59 przez ios-testflight.sh + testflight_external.py (obie grupy, Beta App Review: APPROVED od razu; Robert dostaje build). Bramki przed wdrożeniem: vitest 681, e2e:mock 151, typecheck, lint, build, bundle budget (initial 1 471 846 B), dist-smoke PASS (build:mobile), dist-offline PASS.

**Krok weryfikacji na koncie admina (częściowo ODŁOŻONY):** Chrome extension niepodłączony (user nieobecny, sesja autonomiczna), brak headless credentials — wykonano smoke live (render, zero błędów JS) zamiast pełnego scenariusza klikanego. KROK USERA: na live przypiąć notatkę przy ćwiczeniu i odpalić "Szybki trening" z Dashboardu (scenariusze pokryte e2e mock 1:1).

### 2026-07-19 — X14A FAZA 2 (Z104): szybki trening bez planu (empty workout)

**Co:** przycisk "Szybki trening" na Dashboardzie (widoczny ZAWSZE, także bez planu), syntetyczny dzień `adhoc-<YYYY-MM-DD>-<ts>` (`src/lib/adhoc-workout.ts`: createAdhocDay/adhocDayFromId/isAdhocDayId/buildAdhocExerciseId), w WorkoutDay fallback `baseDay` z adhocDayFromId + przycisk "Dodaj ćwiczenie" (wspólny ExercisePicker Z69) tylko dla ad-hoc. Trening idzie ISTNIEJĄCĄ ścieżką (handleStartWorkout, draft-db, maszyna stanów, batchSaveWorkout) — zero równoległej ścieżki. Pre-fill serii dodanego ćwiczenia działa po nazwie (zweryfikowane: `getPreviousSets` fallback `previousSetsByName`).

**Root cause fix (hydracja):** świeży draft ad-hoc ma 0 ćwiczeń — `resolveWorkoutHydration` uznawał go za pusty i resetował sesję zaraz po starcie (UI wracało do "Rozpocznij trening"). Fix: `draft.dirty && isAdhocDayId(draft.dayId)` => hydratowalny (test w workout-hydration.test.ts).

**Ograniczenie e2e mock (świadome):** finalny sync w mock e2e wisi (Firestore zablokowany, silnik bez timeoutu), więc scenariusz e2e weryfikuje start->dodanie 2 ćwiczeń->odhaczenie serii roboczej->draft w IndexedDB + widoczność "Zakończ trening"; ścieżkę finalSyncPending pokrywa istniejący test Z49, historię ad-hoc test z seedem setE2EWorkouts (snapshot dayName "Szybki trening" renderuje się w Historii bez zmian w widokach), background/resume test zimnego startu z auto-resume do ad-hoc.

**Decyzje w ramach autonomii:** (1) id dodanego ćwiczenia = `adhoc-ex-<slug>` (slugifyExercise, sufiks -N przy kolizji) zamiast reuse buildSwappedExerciseId (mylący format `__swap`); (2) monotoniczny ts w adhoc id (dwa starty w tym samym ms); (3) przycisk "Edytuj plan dnia" ukryty dla ad-hoc (nie ma go w planie); (4) domyślnie 3 serie dla dodanego ćwiczenia.

**Weryfikacja:** vitest 681/681, e2e 151/151 (3 nowe Z104), typecheck/lint/build/bundle zielone.

### 2026-07-19 — X14A FAZA 1 (Z103): przypięte notatki per ćwiczenie

**Co:** trwała notatka per ćwiczenie (technika + ustawienia maszyny), widoczna i edytowalna w każdej sesji z tym ćwiczeniem, niezależnie od planu. Nowa kolekcja `exercise_notes` (doc id deterministyczny `${userId}_${slug(nazwa)}`, reuse `slugifyExercise` z exercise-media), model+sanityzacja w `src/lib/exercise-notes.ts` (rozszerzenie istniejącego pliku Z74, nie nowy plik), hook `useExerciseNotes` (wzorzec useCustomExercises: jedna subskrypcja per user, limit 300, E2E fallback localStorage), współdzielony `PinnedNoteSection` w ExerciseCard (nad notatką sesyjną, podgląd zawsze gdy istnieje, zapis TYLKO po zatwierdzeniu) i w ExerciseDetail.

**Decyzje w ramach autonomii:** (1) plan wskazywał "ExerciseLibrary.tsx (szczegół ćwiczenia)" — faktyczny szczegół ćwiczenia to `ExerciseDetail.tsx` (ExerciseLibrary tylko listuje i nawiguje), sekcję wpięto tam; (2) pusta notatka bez ustawień maszyny = delete dokumentu (nie trzymamy pustych docków); (3) klucz mapy notatek = slug nazwy (odporność na spacje/wielkość liter).

**Rules:** zamknięty schemat `validExerciseNoteShape` (hasOnly 5 pól, note<=500, machineSettings<=200, exerciseName 2-120), CRUD tylko właściciel ze statusem active, read także admin; 13 nowych przypadków w test:rules (139/139 zielone).

**Weryfikacja:** vitest 669/669 (12 testów exercise-notes), e2e 148/148 (nowy scenariusz: przypnij w treningu -> zimny start -> notatka widoczna -> widoczna też w szczegółach ćwiczenia). Fix przy okazji: selektor `getByText('Notatka')` w exercise-card-v3.spec doprecyzowany do getByRole (kolizja substring z "Przypięta notatka").

### 2026-07-19 (wieczór) — X16C wersja 2: aplikacja Garmin Connect IQ zamiast Health API

**Decyzja usera:** ścieżką Garmin jest dedykowana aplikacja Connect IQ (device app na zegarku), nie server-side Health/Activity API. **Powody:** (1) Health API wymaga akceptacji Garmin Connect Developer Program (gatekeeper, tygodnie, możliwa odmowa solo-devowi), Connect IQ nie ma gatekeepera (SDK darmowe, dystrybucja przez Connect IQ Store ze zwykłą recenzją); (2) import cardio od userów Garmina w większości pokrywa już Strava (auto-sync Garmin→Strava); (3) CIQ daje więcej: logowanie serii z nadgarstka na Garminie (nie ma tego NIKT w kategorii) + trening siłowy natywnie w Garmin Connect (sesja FIT z HR nagrywana na zegarku, bez żadnego API).

**Architektura (plan `docs/PLAN-X16C-2026-07-19.md` wersja 2, Z125-Z127):** zegarek rozmawia z naszym backendem (nie z telefonem): parowanie 6-cyfrowym kodem (`device_pair_codes` TTL 10 min → token urządzenia, hash w `device_tokens`), `garminDay` (kontekst dnia, REUŻYCIE `watch-contract.ts` z X16B), `garminIngest` (idempotentne zdarzenia, zapis WorkoutSession ze snapshotami przez Admin SDK). Zegarek równolegle nagrywa natywną sesję strength (FIT). V1 standalone: bez live-syncu z draftem telefonu (guard jednoczesności: osobna sesja, zero mergowania). Health API import → backlog (opcja, gdyby Garmin przyznał dostęp).

### 2026-07-19 — Kierunek rozwoju X14-X16: synteza 3 deep researchy (Gemini, Claude, ChatGPT)

**Decyzja usera:** pełna sekwencja X14 (parytet + quick wins) -> X15 (hybryda siła+cardio = moat) -> X16 (warstwa premium: progresja, Watch, Garmin). Wykonanie w pełni autonomiczne wg `docs/PROMPT-WDROZENIE-X14-X16.md`.

**Podstawa:** 3 niezależne deep researche (2026-07-19) zgodne co do: (1) table stakes, których brak wywołuje churn: przypięte notatki/ustawienia maszyn (pain point nr 1 kategorii, migracje Hevy<->Strong), empty workout, import CSV, typy serii czas/dystans/asysta, kalkulatory; (2) niszy-zwycięzcy: hybrydowcy (Garmin +23% r/r userów łączących bieg i siłę; mamy już Strava+TRIMP+Race Predictor = więcej infrastruktury hybrydowej niż Hevy/Strong, brakuje ręcznego cardio i wspólnego obciążenia); (3) czego NIE budować: feed społecznościowy z lajkami, własna baza żywieniowa, HRV/readiness jako silnik rekomendacji, sztywny cycle syncing, VBT, AI analiza techniki. Wyróżnik techniczny: poprawny PR dla ćwiczeń z asystą (waga ciała minus odciążenie), czego nie liczy dobrze NIKT z konkurencji. Wideo techniki: spór raportów (2:1 za), odłożone do backlogu v2 (top 50 ćwiczeń, etapami).

**Monetyzacja (kierunkowo, gating = osobna decyzja przy launchu):** X14 w całości FREE (broń akwizycyjna: Strong gate'uje kalkulatory), premium = progresja programowa + analityka hybrydowa + Watch. Rynek PL: rozważyć lifetime 99-149 zł (alergia PL na subskrypcje, sygnał SFD/Wykop). Benchmark: Hevy Pro $23.99/rok przy 14 mln userów = darmowy rdzeń musi być hojny.

**Artefakty:** plany `docs/PLAN-X14A/B/C`, `PLAN-X15A/B/C`, `PLAN-X16A/B/C` (wszystkie 2026-07-19, zadania Z103-Z126) + prompt agenta `docs/PROMPT-WDROZENIE-X14-X16.md` (odporny na urwanie sesji: checkboxy planów = źródło prawdy, wznowienie tym samym promptem). Kamienie M51-M53 w PLAN.md.

### 2026-07-17 (wieczór) — LEKCJA TestFlight: internal-setup nie wystarcza dla Roberta

**Objaw:** user widział w TestFlight build 52; buildy 53-58 (wersja 1.0.0) nie docierały do grupy zewnętrznej. **Przyczyna:** release trainy X12B-X13C podpinały buildy TYLKO do grupy wewnętrznej (`asc_api.py internal-setup`); grupa "Testerzy zewnętrzni" (Robert) wymaga per build: podpięcia + zgłoszenia do Beta App Review (`testflight_external.py`), czego pipeline nie robił. Dodatkowo 1.0.0 to NOWA wersja marketingowa = pełny Beta App Review.

**Naprawa:** `testflight_external.py 58` (uv --with pyjwt[crypto] --with requests): build 58 podpięty do obu grup, What to Test ustawione, zgłoszony (WAITING_FOR_REVIEW; Robert dostanie po approvalu ~24h). Internal widzi build 58 od razu — w aplikacji TestFlight buildy 1.0.0 są NOWĄ sekcją nad 6.13.0 (52), czasem trzeba odświeżyć listę.

**Reguła na przyszłość (checklist):** po każdym buildzie TestFlight odpalać `testflight_external.py <build> --whats-new "..."` ZAMIAST samego internal-setup (robi oba podpięcia + review); przy serii buildów jednego dnia wystarczy zgłosić OSTATNI.

### 2026-07-17 — X13C (Z100-Z102): zdalne naprawy kont + dziennik akcji admina

**Architektura:** klient admina NIGDY nie pisze w cudzych dokumentach — naprawy wykonuje callable `adminUserRepair` (serwerowa weryfikacja roli), zawsze: dry-run (zero zapisów) -> apply z automatycznym backupem dokumentów `before` do `admin_repair_backups` (TTL 90 dni) -> operacje batched -> wpis audytu. Algorytmy 4 napraw jako czyste funkcje operacji z testami PARYTETU klient<->functions na wspólnych fixtures JSON (kopia pliku po obu stronach, dryf łapią testy).

**Świadome zawężenia server-side (vs naprawy z Ustawień):** mergeCycles bez maszyny wznawialnej R2 (Admin SDK batch atomowo, do 400 op/batch); repairHistory dopisuje TYLKO brakujący cycleId i etykiety dnia ze snapshotu cyklu (bez przepisywania serii/nazw ćwiczeń — rzadki legacy case zostaje naprawialny z Ustawień). Backlog: konsolidacja napraw z Ustawień na te same Functions.

**Dziennik (Z101):** `admin_audit_log` create-only dla admina (schemat zamknięty hasOnly, update/delete nikt, TTL 365 dni); `logAdminAction` wpięty we WSZYSTKIE akcje admina (toggles/suspend przez hook, reset/resend/email/kohorty/delete w AdminDashboard); naprawy dopisuje Admin SDK. Widok: AdminAuditLog (50 wpisów) w panelu.

**UI (Z102):** sekcja NAPRAWY KONTA w szczególe usera: 4 akcje, "Wykonaj" aktywne dopiero po świeżym dry-run, ConfirmDialog z liczbą operacji, wynik z backupId, po apply automatyczny ponowny dry-run.

**Weryfikacja integracyjna na EMULATORZE (konto testowe, tmp/x13c-emulator-verify.mjs):** dry-run merge pokazał 3 operacje bez żadnego zapisu; nie-admin odrzucony; apply połączył 2 cykle w 1 (endDate 2026-05-28, trening przepięty na cykl pierwotny), backup zawierał 3 dokumenty before, wpis audytu `repair:mergeCycles`; dedupe usunął pusty duplikat. Rules: 0 FAIL (backupy: klient nie pisze; audyt: create-only, bez edycji).

### 2026-07-17 — X13B (Z97-Z99): panel admina 2.0 (przełącznik, lista z aktywnością, szczegół usera)

**Z97:** sticky pasek "PANEL ADMINA" (fitness-warning) + "Wróć do aplikacji" nad panelem; wejścia bez zmian (Profil + dropdown sidebara). **Z98:** `UsersActivityTable` — wiersz+ekspander przeniesione 1:1 z AdminDashboard (handlery propsami, zero zmian logiki), nowe kolumny: badge active/idle/dormant, ostatnia aktywność, dni aktywne 7/30, treningi 7/30 z `users.activitySummary`; sort domyślnie po aktywności. **Z99:** strona `/admin/users/:uid` (lazy): wykres 30 dni (recharts), staty, top ekrany/akcje (etykiety i18n), plan + link do edytora, uprawnienia przez wspólny hook `useAdminUserActions` (lista i szczegół używają tej samej logiki), błędy klienta; odczyty on-demand ~43 max, zero odczytów kolekcji workouts.

**Weryfikacja end-to-end rollupu na PRODUKCJI:** ręczne uruchomienie `firebase-schedule-activityRollup` (gcloud scheduler jobs run) po dodaniu brakującego composite index (userId+date; pierwotny run padł na FAILED_PRECONDITION) zapisało realne `users/{admin}.activitySummary`: lastActiveAt 2026-07-17, activeDays30=19, activeDays7=5 (z historycznych liczników sync_*); workouts/topScreens wypełnią się z nowej wersji apki. Lekcja: gcloud na tym projekcie wymaga `--account g.jasionowicz@gmail.com`.

**Bramki:** unit 654, e2e:mock 147 (admin-switch: redirect nie-admina, pasek+powrót, szczegół z pustymi danymi bez crasha), rules 0 FAIL, budget (initial 1 469 499 B, szczegół w lazy chunku).

### 2026-07-17 — X13A RELEASE TRAIN: telemetria produktowa wdrożona (rules + functions + web + iOS 56)

**Wdrożone:** firestore.rules (zamknięte liczniki + expiresAt), functions (scheduled activityRollup 03:30 Europe/Warsaw), web index-BtD9oq7c (ProductTelemetry aktywna), iOS build 1.0.0 (56) VALID w grupie Wewnętrzni. Polityka TTL 180 dni na app_telemetry_daily przez gcloud (konto g.jasionowicz@gmail.com; konto grzegorzee@ nie ma uprawnień - zapisana lekcja: gcloud --account).

**Weryfikacja end-to-end:** ścieżka kliencka potwierdzona e2e (nawigacja po 3 ekranach zostawia w buforze localStorage session_active=1 + screen_dashboard/analytics/profile; flush wymaga realnego auth, więc dokument produkcyjny pojawi się przy pierwszym użyciu apki przez usera, a users.activitySummary po pierwszym nocnym rollupie ~03:30). Skrypt read-only tmp/x12-diagnoza.mjs pozwala to sprawdzić następnego dnia.

**Koszt:** bez zmian po stronie klienta (1 zapis per flush 30 s przy aktywności); rollup raz dziennie ~N+30N odczytów, N zapisów dla N userów aktywnych wczoraj. **App Privacy (przed publicznym launchem):** dodać "Product Interaction" w App Store Connect; na TestFlight internal wystarczy obecna nota.

### 2026-07-17 — X13A FAZA 2 (Z95-Z96): rules, retencja 180 dni, rollup do users.activitySummary

**Z95 rules (commit po b352e6e):** schemat liczników domknięty WŁAŚCIWIE: `counters.keys().hasOnly(pełna unia TelemetryEventName)`; odkryte przy okazji, że historyczne wpisy 'counters.xxx' w top-level hasOnly nigdy nie walidowały nazw (pola dokumentów legacy) — zachowane dla merge na starych dokumentach. Retencja: flush dopisuje `expiresAt` (+180 dni); polityka TTL gcloud w release train. Testy rules 117+ PASS (nowe: liczniki allow/deny, expiresAt, cudzy dokument, klient nie zapisze activitySummary).

**Z96 rollup (commit 064da40):** `computeActivitySummary` (czysta, testy: okna 7/30, topScreens z remisem alfabetycznym, puste wejście) + `runActivityRollup` (O(aktywnych wczoraj): query date==wczoraj -> per user 30 dni dokumentów -> merge `users/{uid}.activitySummary`, bounded concurrency 8) + scheduled 03:30 Europe/Warsaw. Typ `ActivitySummary` w UserProfile (odczyt klienta; zapis tylko Admin SDK, rules deny potwierdzone testem). Koszt: przy N aktywnych wczoraj ~N+N*30 odczytów i N zapisów raz dziennie.

**Bramki:** unit 650, functions 87, rules 0 FAIL, e2e 144, build/budget (initial 1 466 058 B).

### 2026-07-17 — X13A FAZA 1 (Z94): telemetria produktowa (sesje, ekrany, akcje)

**Kształt (rozszerzenie ISTNIEJĄCEGO mechanizmu, zero nowych kolekcji):** `app_telemetry_daily/{uid}-{YYYY-MM-DD}`: `{ userId, date, updatedAt, counters: { <TelemetryEventName>: number } }`; bufor localStorage + flush co 30 s (TelemetryHeartbeat) — koszt bez zmian (1 zapis per flush). Nowe liczniki (zamknięta unia TS): `session_active`, 11x `screen_*` (whitelist tras, admin poza), 7x `action_*` (started/completed/set_checked/plan_edited/replan_completed/export_data/strava_opened). Prywatność: liczniki bez treści, zero clickstreamu.

**Wpięcia:** ProductTelemetry w HashRouter (session_active raz dziennie z guardem localStorage + visibilitychange dla zmiany dnia po powrocie z tła; screen_* przy zmianie trasy, ta sama trasa pod rząd raz), akcje po 1 linii w istniejących handlerach. Testy: product-telemetry (mapowanie tras, guard dnia per user); 650 unit, e2e 144, typecheck, lint.

**ZNALEZISKO (naprawione w Z95.1):** wpisy `counters.*` w top-level hasOnly NIGDY nie walidowały nazw liczników (to pola dokumentów LEGACY z płaskim zapisem, nie walidacja dot-notation) — nazwy liczników były w praktyce niezamknięte (flush działał, ale rules nie zamykały schematu). Z95.1 domknął schemat właściwie: `counters.keys().hasOnly(pełna unia)`, legacy płaskie klucze zachowane dla merge na starych dokumentach.

### 2026-07-17 — Web push (commit c6430fc) + Android release prep (commit 8dfa261) + build 55

**Web push:** cały kod wdrożony: `public/firebase-messaging-sw.js` (SW powiadomień w tle, config Firebase w query stringu rejestracji, własny scope `fcm/` obok SW workboxa — gh-pages nie kontroluje roota domeny, więc jawna rejestracja spod base), gałęzie web w `push-notifications.ts` (Notification API + FirebaseMessaging.getToken z vapidKey i własną rejestracją SW). Backend gotowy od dawna (registerPushToken/adminSendPush/dailyTrainingReminder — tokeny web obsługiwane bez zmian). **ODŁOŻONY 1 KROK (wymaga konsoli):** wygenerowanie klucza VAPID (Firebase Console -> Project settings -> Cloud Messaging -> Web Push certificates -> Generate key pair) i wpisanie do `.env` jako `VITE_FIREBASE_VAPID_KEY` + redeploy web. Bez klucza web zachowuje się jak dotąd (push 'unsupported', zero regresji). Konsola nie ma API na VAPID, a rozszerzenie Chrome nie było podłączone w tej sesji.

**Android:** keystore release wygenerowany (`FIRMA/_secrets/android/strength-save-release.keystore` + properties, chmod 600), SHA-1 release dodany do Firebase (apps:android:sha:create), signing config w build.gradle (czyta gitignorowane `android/key.properties` -> _secrets; brak pliku = build bez podpisu jak dotąd), `app-release.aab` (14.6 MB) zbudowany i zweryfikowany (jarsigner: jar verified). **ODŁOŻONE (wymaga płatności/konta usera):** rejestracja Google Play Console (25 USD), store listing, upload AAB.

**iOS build 1.0.0 (55)** (P0 walidacja + M19 offline + M20 PDF) VALID na TestFlight, grupa Wewnętrzni.

### 2026-07-17 — M19: PWA offline mode (commit 6167c64)

**Zakres świadomie minimalny (większość offline JUŻ działała):** treningi offline = drafty IndexedDB + kolejka syncu (R1/R2), pomiary offline = mutation queue persistentLocalCache, iOS startuje offline natywnie (SW celowo wyłączony w build:mobile — Capacitor trzyma pliki lokalnie). Brakowało: (1) DOWODU, że web startuje offline (zimny start z SW cache), (2) ludzkiego komunikatu przy zapisie planu offline (transakcje Firestore wymagają sieci).

**Zrobione:** nowa stała bramka `npm run check:dist-offline` (load online rejestruje SW + precache, potem zimny start OFFLINE musi wyrenderować aplikację; wymaga builda WEB) — przechodzi na obecnej konfiguracji VitePWA (precache **/*.{js,css,html,...} obejmuje lazy chunki). `useTrainingPlan.savePlan`: błąd offline mapowany na `err.planOffline` (obie locale). Kolejki edycji planu offline NIE budujemy (kontrakt rewizji wymagałby merge'a konfliktów planu — koszt/ryzyko nieproporcjonalne do częstości edycji planu na siłowni).

### 2026-07-17 — M20: eksport raportu treningowego do PDF (commit c0ae48a)

**Decyzja techniczna:** zamiast wbudowywać fonty TTF w jsPDF (polskie znaki!), raport renderowany jako HTML (fonty przeglądarki, wzorzec share-utils z escapeHtml), zdejmowany html2canvas i osadzany w jsPDF jako obraz A4 (multi-page slicing). jsPDF (381 KB) + html2canvas (198 KB) to LAZY chunki ładowane przy kliku — initial bundle bez zmian (1 464 105 B). Treść: nagłówek (user, data), sumy 12 miesięcy (treningi, czas, tonaż) + tabela miesięcy (reuse `aggregateMonthlyStats` z Z92). Dystrybucja: navigator.share z plikiem (iOS/Android), fallback download (desktop); AbortError ignorowany.

**Weryfikacja:** vitest 646 (model raportu), e2e:mock 144 (pobranie pliku + nagłówek %PDF), typecheck, lint, budget.

### 2026-07-17 — P0: walidacja danych z Firebase w onSnapshot (commit 5fd39f9)

**Problem:** hydracja z Firestore rzutowała dokumenty bez walidacji (`as WorkoutSession` itd.) — uszkodzony dokument (NaN w seriach, brak date, zły status cyklu, zepsute days planu) renderował śmieci albo wywracał widoki.

**Rozwiązanie:** czysty moduł `firestore-doc-guards.ts`. Kontrakty: uszkodzony DOKUMENT = odrzucony z hydracji + raport do client_errors (code `invalid-doc`, detail `kolekcja/id`, limit sesyjny 20 z error-telemetry); uszkodzony FRAGMENT (seria, ćwiczenie) = odfiltrowany, reszta treningu zostaje. Dni planu: uszkodzony dzień unieważnia całą listę (null) — hydracja NIE nadpisuje wtedy dobrego stanu w UI (plan bez jednego dnia jest groźniejszy niż zatrzymanie odświeżenia). Koercje bezpieczne: liczby stringowe -> Number (finite), completed -> bool, nie-finite opcjonalne pola znikają.

**Wpięcia (całość odczytów treningowych):** workout-read-store (listener 500 + paginacja historii; pełność strony liczona z SUROWEGO snapshotu, żeby odfiltrowany dokument nie przerywał paginacji w środku), usePlanCycles (per cykl), useTrainingPlan (days).

**Decyzja release:** P0/M19/M20 to jeden pociąg iOS (build 55 po ukończeniu paczki) — web deployowany po każdej pozycji (tani), TestFlight nie jest mnożony per drobny krok. **Weryfikacja:** vitest 644 (14 nowych), typecheck, lint, build, budget (initial 1 463 248 B), e2e:mock 143.

### 2026-07-17 — X12C RELEASE TRAIN C: karta Miesiące na produkcji (web + iOS build 54)

**Bramki:** vitest 630, typecheck, lint, build, budget (initial 1 459 649 B), e2e:mock 143, dist-smoke PASS (build:mobile).

**Wdrożenie:** git push, web `npm run deploy` zweryfikowany na live (index-C7jDc1gn.js), iOS build 54 (53->54, MARKETING_VERSION zostaje 1.0.0) przez ios-testflight.sh: UPLOAD SUCCEEDED, ASC **build 1.0.0 (54) state=VALID**, grupa Wewnętrzni. Backlog uporządkowany w PLAN.md: P0 walidacja danych z Firebase w onSnapshot -> M19 PWA offline -> M20 eksport PDF -> web push -> Android Google Play.

**Pakiet X12 (A+B+C) w całości wdrożony jednego dnia:** 3 release trainy (web x3 + iOS buildy 52, 53, 54), zero regresji w bramkach.

### 2026-07-17 — X12C FAZY 1-2 (Z92-Z93): statystyki miesięczne w Analityce

**Zgłoszenie usera:** "ile treningów zrobiłem w miesiącu oraz ile czasu poświęciłem... loguję wszystkie treningi od początku roku, każdy ma mieć do tego dostęp".

**Z92 (commit 9f54766):** czysta agregacja `src/lib/monthly-stats.ts`: `workoutDurationSec` (durationSec, fallback completedAt-startedAt, null dla treningów sprzed M32), `aggregateMonthlyStats` (klucz miesiąca z pola `date` — czas lokalny, tylko completed, okno monthsBack, sortowanie od najnowszego; tonaż ISTNIEJĄCYM helperem `calculateTonnage` — ukończone serie bez rozgrzewkowych), `formatDurationHM` ("1 h 23 min" / "49 min"). TDD: 12 testów (granice miesięcy, przełom roku, braki czasu, tonaż z warmup/nieukończonymi).

**Z93 (commity 2b3fc5f, 9a70f53):** karta "Miesiące" na GÓRZE zakładki Podsumowanie w Analityce (bez 5. zakładki, bez gate'ów — dostępna dla każdego zalogowanego). Wiersz per miesiąc: etykieta (Intl toLocaleDateString + dateLocale, spójnie z resztą pliku), "{n} treningów", czas `formatDurationHM` + dopisek "{n} bez zmierzonego czasu" (dane sprzed M32 nie zaniżają sumy), tonaż `fmtTonnage` (spójny z Historią). Źródło danych: `workouts` SummaryTab (listener 500 najnowszych — pokrywa 12 miesięcy z zapasem). Pusty stan: karta nie renderuje się. Liczba mnoga "{n} treningów" zgodna z konwencją sąsiednich kluczy ('{n} serii').

**Weryfikacja:** vitest 630, typecheck, lint, e2e:mock 143 (nowy spec z dynamicznymi datami: bieżący + poprzedni miesiąc); screenshot karty (Lipiec 2026: 2 treningi, 1 h 0 min, 1 bez zmierzonego czasu, 1.0 t). Pułapka e2e: Analytics domyślnie otwiera zakładkę Tygodnie — spec wchodzi przez ?tab=summary.

### 2026-07-17 — X12B RELEASE TRAIN B: aplikacja w wersji 1.0.0 (web + iOS build 53)

**Zakres:** Z89 (Adaptive Coach out), Z90 (hamburger/drawer out + dojścia przez Profil, narzędzia naprawcze za isAdmin), Z91 (wersja 1.0.0 zamrożona do launchu).

**Wersjonowanie (decyzja usera 2026-07-17):** MARKETING_VERSION + package.json + Android versionName = 1.0.0 NA SZTYWNO do launchu; bump tylko CURRENT_PROJECT_VERSION. Zasada dopisana do CLAUDE.md projektu. Naprawiony przy okazji rozjazd: Info.plist miał zahardcodowane CFBundleShortVersionString=6.13.0, teraz $(MARKETING_VERSION) (jedno źródło prawdy w pbxproj).

**Bramki:** vitest 618, typecheck, lint, build, budget (initial 1 459 383 B; łącznie -4 428 B po wycinkach X12B), e2e:mock 142, dist-smoke PASS (build:mobile).

**Wdrożenie:** git push, web `npm run deploy` zweryfikowany na live (index-OvoGHMd8.js, UI pokazuje v1.0.0), iOS build 53 (52->53) przez ios-testflight.sh: UPLOAD SUCCEEDED, ASC pokazuje **build 1.0.0 (53) state=VALID**, podpięty do grupy Wewnętrzni. Pierwsza wysyłka z nową MARKETING_VERSION utworzyła wersję 1.0.0 w App Store Connect bez problemów.

### 2026-07-17 — X12B FAZA 2 (Z90): mobile bez hamburgera i drawera + narzędzia naprawcze tylko dla admina

**Decyzja usera (2026-07-17):** hamburger na mobile "zupełnie niepotrzebny". Kolejność twarda zachowana: najpierw dojścia (Z90.1) i e2e osiągalności (Z90.2, PRZED wycinką), potem wycinka (Z90.3).

**Dojścia po zmianie (tabela):** bottom nav: Dashboard/Plan/Analityka/Ćwiczenia/Profil; Profil sekcja "Twoje dane": Historia, Pomiary, Osiągnięcia (+ wiersz Admin dla isAdmin w sekcji Wsparcie; wcześniej /admin nie miał ŻADNEGO dojścia mobilnego poza drawerem); /cykle z karty planu na Dashboardzie; /settings z Profilu (jak dotąd). Desktop sidebar bez zmian.

**Wycinka (commit a228e33):** AppHeader bez przycisku Menu i propa onMenuClick; Layout bez stanu sidebarOpen; AppNavigation bez Sheet i propsów isOpen/onClose; klucz nav.openMenu usunięty z OBU locale; stary blok e2e "Mobile drawer (Z66)" usunięty, zastąpiony spec'em `mobile-nav-reachability` (przechodził PRZED i PO wycince) + asercja braku hamburgera.

**Z90.4 (commit 13901fa, decyzja usera z aktualizacji planu):** akordeon "Narzędzia naprawcze" w Ustawieniach widoczny TYLKO dla admina (isAdmin); Eksport/Import kopii zostaje dla wszystkich. E2E: active-user bez sekcji, active-admin z sekcją (pułapka: zmiana hasha nie przeładowuje dokumentu, initScript wymaga reload). Przenosiny napraw do panelu admina = osobne plany X13.

**Weryfikacja:** typecheck, lint, unit 618, e2e:mock 142, build, budget (initial 1 459 386 B, dalszy spadek po wycince drawera). Wizualnie: mobile header bez hamburgera + bottom nav (screenshot), desktop sidebar z pełną nawigacją (screenshot).

### 2026-07-17 — X12B FAZA 1 (Z89): usunięcie Adaptive Coach

**Decyzja usera (2026-07-17), wycofuje feature Z60-Z65 z X10:** "belka na dashboardzie nic nie robi". Usunięte: belka readiness na Dashboardzie, badge CoachBadge w ExerciseCard, karta "Następnym razem" w podsumowaniu WorkoutDay, moduł `adaptive-coach.ts` + testy, flaga `adaptiveCoach` (`VITE_FEATURE_ADAPTIVE_COACH`), 13 kluczy `coachx.*` z OBU locale, spec e2e. ZOSTAJE (granica wycinki wg planu): coach następnej serii (`next-set-advice`), RzaAdviceBadge, zbieranie i wyświetlanie metryk RPE/ból/jakość.

**Weryfikacja:** rg adaptive|coachx w src/ = 0; vitest 618 zielone (16 testów adaptive usuniętych), typecheck, lint, build, e2e:mock 139; bundle initial 1 463 811 -> 1 462 322 B. Wizualnie (Playwright, screenshoty): Dashboard bez belki, karta ćwiczenia z celem następnej serii (🎯) i rekordem, zero 🧠.

**Nota środowiskowa:** w trakcie bramek load average maszyny sięgał 180 (Screen Studio) i wywoływał timeouty testu exercise-picker także na czystym HEAD; po spadku obciążenia test zielony bez zmian w kodzie. Commity: a4bde25, 7cf93e0 (+ ec430cc dojścia Profilu pod Z90).

### 2026-07-17 — X12A RELEASE TRAIN A: web + iOS build 52 na TestFlight

**Zakres:** Z86 (repeatPlanSource + gate isLoaded oferty przedłużenia), Z87 (local-wins konfliktu rewizji), Z88 (Kontynuuj trening dla zsynchronizowanego szkicu).

**Bramki przed wdrożeniem:** vitest 632 zielone, typecheck, lint, build, bundle budget (initial 1 463 811 B / limit 1 536 000), e2e:mock 141, e2e:emulator 13, check:dist-smoke PASS (na build:mobile: smoke serwuje dist z korzenia, web build z base /strength-save/ zawsze da w nim biały ekran; kolejność build:mobile -> smoke, jak w ios-testflight.sh).

**Wdrożenie:** git push (main), web `npm run deploy` zweryfikowany na live (index-D6h0uwMg.js), iOS build 52 (CURRENT_PROJECT_VERSION 51->52) przez scripts/ios-testflight.sh: UPLOAD SUCCEEDED, processing VALID, podpięty do grupy Wewnętrzni.

**Incydent po drodze (nie kodowy):** upload blokowany przez `FORBIDDEN.REQUIRED_AGREEMENTS_MISSING_OR_EXPIRED` (wygasła umowa Apple; między 2026-07-04 a 2026-07-17). User zaakceptował umowę w App Store Connect; propagacja do usługi uploadu ~10 min, potem sukces bez zmian w konfiguracji. Klucz ASC UD43687FB9 działa; nowy AuthKey_YSXY39JA8Q.p8 przeniesiony do _secrets/oauth (nieużywany w env). Lekcja: "Cannot determine the Apple ID from Bundle ID" z altool = najpierw sprawdź agreements (`asc_api.py whoami`), nie klucz.

**Lekcja narzędziowa:** dwa równoległe uruchomienia ios-testflight.sh kolidują (drugi robi rm -rf na archiwum pierwszego); pipeline odpalać ZAWSZE pojedynczo.

### 2026-07-17 — X12A FAZA 3 (Z88): "Kontynuuj trening" także dla w pełni zsynchronizowanego szkicu

**Objaw:** po przypadkowym wyjściu z aplikacji w trakcie treningu Dashboard pokazywał "Rozpocznij trening" zamiast "Kontynuuj trening".

**Root cause (potwierdzony w kodzie):** karta Dashboardu używała decyzji auto-resume (`shouldResumeWorkoutDraft`, Z49), która wymaga szkicu "żywego" (`dirty || provisional`). Szkic w pełni zsynchronizowany (autosave zdążył: dirty=false, origin remote) nie był "żywy", więc karta wracała do "Rozpocznij".

**Fix (commity d7af3c3, 77e2a22, 1d08d14):** nowa czysta funkcja `isDraftContinuableToday` + `continuableDraftTarget` w `workout-resume.ts`: KAŻDY nieukończony dzisiejszy szkic (bez completedLocally/finalSyncPending) jest kontynuowalny, niezależnie od dirty. Karta Dashboardu przepięta; auto-nawigacja (`shouldResumeWorkoutDraft`) celowo zostaje ostrzejsza (nie porywa usera, który świadomie wyszedł); karta Sync Center nietknięta (dalej używa draftResume). E2E `continue-workout.spec.ts` (zegar strony zamrożony na poniedziałek przez page.clock): szkic dirty=false remote -> przycisk "Kontynuuj trening" + powrót do sesji; szkic completedLocally -> brak przycisku.

**Weryfikacja:** unit 632 zielone, e2e:mock 141 zielone (139 + 2 nowe).

### 2026-07-17 — X12A FAZA 2 (Z87): konflikt rewizji treningu rozwiązywany automatycznie local-wins

**Decyzja produktowa usera (2026-07-17), jawnie COFA decyzję M18 o dialogu wyboru wersji:** dialog "Trening edytowany na innym urządzeniu" wyskoczył w trakcie treningu na siłowni; user nie chce żadnych dialogów o konfliktach. Wersja LOKALNA wygrywa ZAWSZE.

**Skala zjawiska (telemetria):** 12x revision-conflict (iOS, checkpoint) w 4 poranki treningowe lipca — konflikt to normalny stan przy iPhone+web, nie wyjątek.

**Implementacja (commity 5023cfd, 40e12e7):** gałąź `outcome.conflict` w WorkoutDay bez dialogu: `shouldAutoResolveConflict` (limit `MAX_CONFLICT_AUTO_RESOLVES=2` na sesję zapisu, reset po udanym syncu) + `keepLocalOnConflict` (baseline serwera na draft + retry) wołany przez ref. Po wyczerpaniu limitu (drugie urządzenie aktywnie pisze): zostajemy przy lokalnym drafcie, komunikat `workout.err.conflict`, kolejny checkpoint dosyła. Telemetria zostaje (`revision_conflict` + nowy `revision_conflict_auto_resolved`), żeby widzieć skalę po wyłączeniu dialogu.

**Usunięte:** AlertDialog konfliktu, stan `conflictDialogOpen`, `resolveConflictUseCloud`, klucze `workout.conflict.title/desc`. **Zostaje:** `workout.conflict.keepMine/useCloud` (używa ich Sync Center — zaległości syncu to inny przypadek, świadoma decyzja per plan X12A), maszyna stanów sesji nietykalna (wejście `conflictDialogOpen: false`, faza 'conflict' nieosiągalna).

**Weryfikacja:** unit 626 zielone; nowy test emulatorowy (auth+firestore, realne rules): dwóch klientów, drugi na stale rewizji dostaje konflikt, sekwencja local-wins dosyła wersję lokalną bez udziału usera (reps lokalne w chmurze, revision podbita). e2e:mock 139 zielone.

### 2026-07-17 — X12A FAZA 1 (Z86): wskrzeszony stary plan + PLAN_CONFLICT — root cause i fix

**Objaw (incydent ~2026-07-04/05):** po treningu aktywny zrobił się STARY plan trzydniowy z poprzedniego cyklu, Dashboard pokazywał "Tydzień 1 z 12", wyskoczył błąd konfliktu planu (PLAN_CONFLICT).

**Diagnoza (read-only, tmp/x12-diagnoza.mjs, firebase-admin + ADC):** stan konta admina DZIŚ poprawny: plan 4-dniowy (revision 4, updatedAt 2026-07-05 15:25 UTC = moment ręcznej naprawy przez usera), 3 cykle, jeden active (4-dniowy, startDate 2026-06-01), zero cykli utworzonych w lipcu. Telemetria client_errors: zero wpisów PLAN_CONFLICT (ten błąd nie jest raportowany), za to 12x revision-conflict treningu (WORKOUT_CONFLICT, iOS, phase=checkpoint) w 4 poranki treningowe (6/7, 7/7, 9/7, 16/7), zawsze PODWÓJNY wpis w tej samej ms — potwierdza zasadność Z87 (local-wins).

**Root cause (H1+H3 potwierdzone lekturą kodu):**
1. `handleRepeatPlan` (Dashboard.tsx i Cycles.tsx) brał dni ze snapshotu aktywnego CYKLU (`active?.days`), nie z bieżącego planu; Dashboard szukał active przez `cycles.find()` na surowej liście.
2. Karta "Przedłuż plan" (`extendOffer`, następca auto-przedłużenia M33) gate'owała wyłącznie na `isLoaded` WORKOUTS — nie czekała na załadowanie planu ani cykli. Po wybudzeniu z tła / na starej karcie PWA klik padał na stale stanie: `active` wskazywał stary 3-dniowy cykl, `startCycleWithPlan` zapisywał STARE dni ze świeżym startDate (stąd "Tydzień 1 z 12") i tworzył świeży aktywny cykl ze starych dni.
3. PLAN_CONFLICT widziany przez usera to KOLEJNY zapis odrzucony przez revision guard (drugi klik / drugie urządzenie na stale rewizji). Wariant wejścia bez konfliktu: stara karta webowa PWA z kodem sprzed R1 (revision guard istnieje dopiero od 2026-07-03; revision=4 potwierdza młody licznik).
4. `startCycleWithPlan` sam jest bezpieczny: savePlan przed createActiveCycle, przy PLAN_CONFLICT cykl nie powstaje (regresja potwierdzona testem).

**Fix (minimalny, commit d8f92f6):** czysta funkcja `repeatPlanSource` w `cycle-actions.ts` — źródłem dni i durationWeeks dla "Powtórz/Przedłuż plan" jest ZAWSZE bieżący plan (chroniony rewizją), snapshot cyklu tylko fallbackiem przy pustym planie; oba komponenty przepięte; `extendOffer` czeka na `isLoaded` planu ORAZ cykli. Testy: 4 nowe w cycle-actions.test.ts (TDD: FAIL przed fixem, PASS po), łącznie 624 zielone.

**Naprawa danych usera (Z86.5): POMINIĘTA — stan konta już poprawny** (user naprawił ręcznie przez UI ~2026-07-05 17:25 PL). Żadnych zapisów produkcyjnych nie wykonano (diagnoza wyłącznie read-only).

**Uwaga procesowa:** plik planu X12A został w trakcie sesji zmodyfikowany na dysku (Z86.5 przepisane z "za jawną zgodą" na "autonomicznie z backupem"). Wykonawca trzymał się dyrektywy z promptu startowego (zgoda wymagana); konflikt bez skutków, bo naprawa okazała się zbędna.

### 2026-07-04 — Z85 HOTFIX: biały ekran na starcie (iOS build 50 + prod web) — cykliczne chunki firebase

**Objaw:** TestFlight build 50 po otwarciu pokazywał tylko biały ekran. Ten sam objaw na prod web (index-BOBq35aR na gh-pages) — release X11 wywalił OBA kanały, mimo że wszystkie bramki (vitest 620, typecheck, lint, e2e 139) były zielone.

**Root cause:** split firebase per produkt z Z54 (`manualChunks`: firebase-core / firebase-auth / firebase-firestore) wygenerował CYKLICZNY import między chunkami: `firebase-core` importował z `firebase-auth` i odwrotnie. W runtime dawało to TDZ `ReferenceError: Cannot access 'uo' before initialization` w firebase-core przy starcie → React nigdy nie montował `#root` → biały ekran. Błąd istnieje TYLKO w produkcyjnym bundlu (dev/vitest/typecheck go nie widzą); cykl jest wrażliwy na graf importów, więc zmaterializował się dopiero po zmianach X11. To drugi raz, gdy over-splitting chunków tworzy cykl (pierwszy: React/Radix — komentarz w vite.config).

**Diagnoza (reprodukcja przed fixem):** dist mobilny serwowany lokalnie w Chromium → `#root` pusty + pageerror; symulator iPhone 17 Pro → biały ekran identyczny z TestFlight; prod web → ten sam ReferenceError.

**Fix (minimalny):** `vite.config.ts` — firebase w JEDNYM chunku (`if (id.includes("firebase")) return "firebase"`), ~732 KB. Zero możliwości cyklu wewnątrz firebase. Realny initial się NIE pogorszył: index importował auth i firestore statycznie już przed fixem, więc te bajty i tak ładowały się na starcie.

**Nowa bramka (odtwarza tę klasę błędów):** `scripts/check-dist-smoke.mjs` (`npm run check:dist-smoke`) — serwuje dist, otwiera w headless Chromium, FAIL gdy `#root` pusty po 15 s lub jakikolwiek pageerror. Wpięta w `ios-testflight.sh` po `build:mobile`, przed archive. Przed fixem: FAIL (odtwarzał buga), po fixie: PASS. Lekcja: „build przechodzi" ≠ „bundle startuje" — bramki muszą wykonać bundle produkcyjny w przeglądarce.

**Budżet bundle (uczciwa korekta):** per chunk 800 KB (scalony firebase), initial 1500 KB liczony z prefixem `firebase-` — poprzedni pomiar (925 KB / 1200 KB) liczył tylko firebase-core, a index importował też auth+firestore statycznie; realny initial wynosił ~1430 KB już przed Z85.

**Wdrożenie:** web `npm run deploy` (naprawa prod) + iOS build 51 przez `release-ios.sh` (bump 50→51, 6 wystąpień). Weryfikacja: vitest/lint/typecheck/budżet zielone, smoke PASS na dist mobilnym, symulator renderuje ekran logowania, prod web sprawdzony po deployu.

### 2026-07-03 — X11 FAZA 7: release train (Z84) — checkpoint X11

**Bramki przed wdrożeniem (wszystkie zielone):** vitest 620/620 (77 plików), typecheck 0, lint 0, build OK, bundle-budget OK (initial 925 KB / 1200 KB), test:rules 110/110, functions 82 passed / 4 skipped + build OK (nieruszone), e2e:mock 139/139 (jeden flaky exercise-card-v3 w pierwszym runie — w izolacji i powtórce zielony), e2e:emulator 12/12.

**Wdrożone na produkcję (w kolejności checklisty):**
1. **Git:** 26 commitów X11 wypchniętych na origin/main (e608ed1..e9bbd90).
2. **Rules:** `firebase deploy --only firestore:rules` — nowa kolekcja `custom_exercises` (zamknięty schemat, Z71).
3. **Functions:** NIE deployowane — nieruszone w X11 (zgodnie z planem).
4. **Web:** `npm run deploy` — hash `index-BOBq35aR.js` na https://grzegorzee.github.io/strength-save/ zgodny z dist/index.html.
5. **iOS:** bump CURRENT_PROJECT_VERSION 49 → 50 (6 wystąpień) + `scripts/release-ios.sh` — UPLOAD SUCCEEDED, build 50 VALID, podpięty do grup (internal + external), whatsNew ustawiony, **Beta App Review: APPROVED** (Robert dostaje build po zatwierdzeniu Apple ~24h; internal od razu).
6. **Weryfikacja produkcji:** web wstaje z nowym hashem; `gcloud functions logs read` — zero nowych błędów (standardowa aktywność listapikeys/resumedeletionoperations).

**Zakres release'u X11 (web + rules + iOS build 50):** nawigacja bez ślepych zaułków (Z66-Z68), jeden system planów i ćwiczeń + custom exercises (Z69-Z73), dane w akcji (Z74-Z77), postępy bez duplikatów (Z78-Z80), Profil vs Ustawienia (Z81), polish App Store (Z82-Z83). Nowy plugin: `@capacitor-community/in-app-review` 8.0.0 (cap sync wykonany przez release-ios.sh).

**Świadomie pominięte/odłożone:** dodatkowe szablony fat_loss/athletic (Z72d — oba cele mają po jednym szablonie; wróci po teście terenowym); pełny merge Profile+Settings, drag&drop w edytorze, strukturalny model serii — poza zakresem planu (sekcja "Poza zakresem").

### 2026-07-03 — X11 FAZA 6: polish pod App Store (Z82-Z83)

**Bramki checkpointu (wszystkie zielone):** vitest 620/620 (77 plików), typecheck 0, lint 0, build OK, bundle-budget OK (initial 925 KB / 1200 KB), e2e:mock 139/139.

1. **Z82 — empty states (audyt bez danych):** puste bez zaproszenia były: `/achievements` (same zera, sekcje ukryte), `/history` (komunikat o filtrach nawet przy zerze sesji), `/measurements` (strona kończyła się po formularzu bez słowa), `/analytics` (pusty okres bez CTA). Wszystkie dostały EmptyState (wspólny komponent, wzorzec z Cycles: ikona + 1 zdanie + CTA); `/cycles` miał już wzorzec, `/exercises` zawsze pełne (biblioteka). Haptyka: `src/lib/haptics.ts` (guard `Capacitor.isNativePlatform`, web no-op, 3 testy z mockiem Capacitora) — lekki impact przy odhaczeniu KAŻDEJ serii (ExerciseCard; mocna wibracja końca ćwiczenia zostaje bez zmian) + notification-success przy ukończeniu treningu (WorkoutDay).
2. **Z83 — natywna prośba o ocenę:** `review-prompt.ts` (`shouldRequestReview`: kamienie 5/15/30/50/100 ukończonych treningów, min 60 dni między prośbami, znacznik w localStorage `fittracker_review_prompt`; 5 testów TDD). Plugin `@capacitor-community/in-app-review` 8.0.0 (peer `@capacitor/core>=8` — kompatybilny z naszym 8.4; `cap sync ios` wykona release-ios.sh w FAZIE 7). Wywołanie przy finalizacji treningu, fire-and-forget z catch, guard natywny (web nigdy nie woła). Licznik = ukończone z historii bez bieżącej sesji + 1 (listener może jeszcze nie widzieć finalizowanej sesji jako completed). ZERO własnych modali "oceń nas" (wymóg Apple — system sam decyduje, czy dialog pokazać).

### 2026-07-03 — X11 FAZA 5: porządek Profil vs Ustawienia (Z81)

**Bramki checkpointu (wszystkie zielone):** vitest 612/612 (75 plików), typecheck 0, lint 0, build OK, e2e:mock 139/139.

**Kryterium podziału (obowiązuje):** Profil = kim jestem i jak apka się zachowuje (konto, preferencje, język, jednostki, dźwięk, timer, launcher powiadomień); Ustawienia = dane i integracje (backup, Strava, sync, narzędzia naprawcze).

1. Karta "Konto" read-only usunięta z Settings (duplikat Profilu pod TYM SAMYM tytułem i18n); email pokazany w Profilu pod nickiem; podtytuł Settings opisuje zawartość (`settings.subtitle`); osierocony klucz `settings.account.role` usunięty z obu locale.
2. DataManagement renderowany TYLKO w Settings; na Pomiarach drogowskaz "Kopia zapasowa danych" → `/settings?section=data` (deep-scroll z X10).
3. **Decyzja (wariant mniejszego diffu):** NotificationSettings ZOSTAJE w Settings — launcher z Profilu (`/settings?section=notifications`) działa; przeniesienie całej karty do Profilu nie zmienia osiągalności, a zwiększa diff.
4. **Naprawa procesu weryfikacji:** test e2e pickera w PlanEditor failował w PEŁNYCH runach e2e:mock od Z70 (przycisk "Dodaj" → "Dodaj ćwiczenie"), a bramki raportowałem po samej liczbie "passed" (fail był niewidoczny w tail). Test naprawiony; od teraz bramka e2e sprawdzana jawnie po "failed" (139/139).

### 2026-07-03 — X11 FAZA 4: postępy bez duplikatów (Z78-Z80)

**Bramki checkpointu (wszystkie zielone):** vitest 612/612 (75 plików), typecheck 0, lint 0, build OK, bundle-budget OK (initial 924 KB / 1200 KB), e2e:mock 138/138.

1. **Z78 — koniec zombie-danych Weekly:** `AnalyticsWeeklyTab` liczy tygodnie client-side (`buildLocalWeeklySummaries` w weekly-summary.ts — 12 tygodni wstecz przez istniejące `prepareWeeklyData`, tygodnie bez danych pomijane); `useWeeklySummary.ts` usunięty; kolekcja `weekly_summaries` w rules zostaje (stare dane, admin), klient przestaje jej dotykać (0 czytań). Tekst AI `summary` i `generatedAt` znikają z UI — pochodziły z zamrożonej kolekcji i nigdy nie powstaną dla nowych tygodni.
2. **Z79 — rekordy w jednym miejscu:** bezpiecznik potwierdził, że zakładka progression NIE dubluje list rekordów z Achievements (ma tylko wykresy progresji per ćwiczenie), więc zakres ograniczony do linków: karta "Nowe PR" w Analytics Summary klikalna → `/achievements` (świeżość zostaje); link "Wszystkie rekordy" w progression dodany w Z67(e); Dashboard "Ostatni PR" linkował od dawna. **ZASADA:** agregaty (tonaż, liczba treningów) wolno powtarzać między przeglądem a szczegółem — LISTY rekordów żyją wyłącznie w Achievements.
3. **Z80 — historia jako archiwum:** `history-stats.ts` (buildHistoryRowMeta — PR per sesja liczone RAZ chronologicznie względem wcześniejszych sesji, semantyka detectNewPRs: pierwsza sesja nie ma czego pobić; formatDurationCompact "1h 12m"); wiersz historii: badge czasu trwania + badge liczby PR; rozwinięcie (z Z74) rozszerzone o serie per ćwiczenie (nieukończone przekreślone) i metryki RPE/ból/technika; filtr "Tylko z PR".

### 2026-07-03 — X11 FAZA 3: dane, które mamy, zaczynają pracować (Z74-Z77)

**Bramki checkpointu (wszystkie zielone):** vitest 604/604 (73 pliki), typecheck 0, lint 0, build OK, bundle-budget OK (initial 924 KB / 1200 KB), e2e:mock 138/138.

**Root cause znalezisk:** apka zbierała notatki, metryki RZA (RPE/ból/technika), durationSec, skippedExercises i 7 pól obwodów ciała — i nic z tego nie pokazywała. Inwestycja usera w dane szła na darmo.

1. **Z74 — notatki wracają:** `exercise-notes.ts` (getExerciseNoteHistory — ukończone sesje, najnowsze pierwsze, limit 5); sekcja "Twoje notatki" w dialogu progresji; "Ostatnio: „…”" na karcie ćwiczenia w aktywnym treningu (lastNote przez exerciseInsights); WorkoutHistory dostała ROZWINIĘCIE wpisu (Szczegóły) z notatką dnia i notatkami ćwiczeń (Z80 je rozszerzy). Hak mock E2E w workout-read-store obsługuje teraz też paginowaną historię (wcześniej zwracał pustkę — testy /history były niemożliwe).
2. **Z75 — ból i technika jako trend:** `getExerciseMetricHistory` + `getPainWatchlist` (ból >= 3, okno 4 tyg., snapshot nazwy) + `getAvgQuality` w rza-metrics; 3 sparkline'y RPE/Ból/Technika w dialogu progresji; RzaMetricsCard: podsumowanie 4 tygodni (objętość, śr. RPE, śr. technika) + watchlist bólu z klikiem do dialogu progresji.
3. **Z76 — czas i pomijane:** `workout-time-stats.ts` (getDurationTrend — miesiące, śr. minuty, gęstość kg/min z tonażu bez rozgrzewek; getSkippedStats — id→nazwa przez resolver); wykres "Czas i gęstość" + lista "Najczęściej pomijane" z linkiem do edytora planu w subzakładce Treningi (bez nowej zakładki); Cycles pokazuje `averageWorkoutsPerWeek` (liczone od dawna w cycle-insights, nigdy nie renderowane).
4. **Z77 — obwody widoczne (pokazujemy, nie usuwamy):** `measurement-stats.ts` (buildMeasurementSeries + MEASUREMENT_FIELD_GOALS: talia/biodra w dół = zielone, mięśnie w górę = zielone, waga neutralna — komentarz w kodzie); lazy MeasurementTrendChart z chipami 10 pól (pola bez wpisów ukryte); lista pomiarów pokazuje WSZYSTKIE wypełnione pola + delty vs poprzedni pomiar POLA (nie poprzedni wpis).

### 2026-07-03 — X11 FAZA 2: plany i ćwiczenia — jeden system (Z69-Z73)

**Bramki checkpointu (wszystkie zielone):** vitest 583/583 (70 plików), typecheck 0, lint 0, build OK, bundle-budget OK (initial 921 KB / 1200 KB), test:rules 110/110, e2e:mock 136/136, e2e:emulator 12/12.

**Root cause znalezisk:** cztery niezależne implementacje pickera ćwiczeń i dwa ~90% identyczne edytory planu narosły przyrostowo; builder nie miał reorderu, edytor nie zarządzał dniami; wybór 6 dni cicho degradował do 5 (brak szablonu + slice); onboarding commitował plan bez podglądu mimo labela "dalej do podglądu"; własnych ćwiczeń nie dało się dodać nigdzie.

1. **Z69 — jeden ExercisePicker:** nowy `src/components/ExercisePicker.tsx` (szukajka PL/EN przez `matchesQuery`, chipy kategorii, `excludeNames`, `initialCategory`, slot `renderFooter` na zakres swapu). Podmienione: PlanBuilder, PlanEditor, UserPlanEditor, WorkoutDay (swap "tylko dziś"/"na stałe" w footerze), NewPlan preview; `ExerciseSwapDialog.tsx` usunięty. Jedna stała `WEEKDAYS` i `defaultSetsForType` w `plan-cycle-utils` (koniec duplikacji w 3 plikach). Kontrakt: bez `renderFooter` tap = wybór i zamknięcie; z `renderFooter` tap zaznacza, wybór domykają przyciski hosta. **Nowy test e2e ujawnił pre-existing bug:** swap "tylko dziś" nie utrwalał się w drafcie (przy prefilled `exerciseSets` widok bierze nazwy z draftu, a draft nie był zapisywany po swapie — zamiana niewidoczna i ginęła przy odświeżeniu). Fix chirurgiczny: `handleApplySwap` woła istniejące `saveDraftSnapshot` z `exerciseNames` (wzorzec `handleSkipExercise`); silnik syncu nietknięty.
2. **Z70 — PlanDaysEditor:** czyste funkcje `src/lib/plan-day-edit.ts` (addPlanDay max 6 + pierwszy wolny weekday, removePlanDay, duplicatePlanDay z nowymi id i głęboką kopią, setPlanDayWeekday z auto-zamianą przy kolizji, setPlanDayFocus; 10 testów TDD) + wspólny komponent `PlanDaysEditor` (karty dni: weekday-chipy, focus, duplikuj/usuń; ćwiczenia: reorder/swap/remove/serie; chipy czasu trwania). PlanEditor zapisuje przez NIETKNIĘTY `savePlan` (transakcja z revision); builder = stan lokalny + autozapis szkicu. Decyzja: teksty admina ujednolicone na `planbuilder.*`/`planeditor.*`/`daysedit.*` (osierocone `admin.*` klucze dialogu usunięte). Edytor umie dni (luka 3), builder umie reorder (luka 4).
3. **Z71 — custom_exercises:** kolekcja z zamkniętym schematem rules (hasOnly, name 2-80, 8 kategorii z categoryLabels, type compound/isolation, isBodyweight bool, createdAt int; CRUD tylko właściciel, read + admin) — 15 nowych testów rules (95→110). Hook `useCustomExercises` (listener limit 100, sort kliencki po nazwie — bez indeksu złożonego; kształt Exercise z id `custom-<docId>`); w E2E mode pełny CRUD na localStorage (`fittracker_e2e_custom_exercises`). Picker: sekcja "Twoje ćwiczenia" + formularz inline (po zapisie od razu wybór). WorkoutDay: `resolveIsBodyweight` — dla customów źródłem prawdy pole isBodyweight, nie heurystyka po nazwie. Bezpiecznik zakresu czysty: wszystkie `exerciseLibrary.find` mają fallbacki. Decyzja: admin w edytorze cudzego planu widzi WŁASNE customy (jedyny user = admin; bez dodatkowego prop-drillingu).
4. **Z72 — 6 dni + elite:** nowy szablon `tpl-ppl-6` (Push Pull Legs ×2, build_muscle/intermediate, pon-sob, 12 tyg., 100% ćwiczeń z biblioteki — pilnuje istniejący test integralności); `planDaysMismatch` + ostrzeżenie `wizard.daysMismatch` na kroku 5 (koniec cichej degradacji); poziom "elite" usunięty (legacy wartości z trainingProfile sanityzowane do advanced). Opcja (d) — dodatkowe szablony fat_loss/athletic — POMINIĘTA świadomie: oba cele mają już po jednym szablonie 4-dniowym, a wartość dodatkowych szablonów bez feedbacku usera jest spekulatywna; wróci po teście terenowym.
5. **Z73 — podgląd wszędzie:** `PlanPreview` wydzielony z NewPlan i użyty też w onboardingu (wybór planu → podgląd ze swapami → zapis; powrót nie gubi stanu wizarda dzięki resume); PlanBuilder startuje z wyborem "Zacznij od zera"/"Zacznij od szablonu" (`clonePlanDays` — głęboka kopia z nowymi id). Test emulatorowy onboarding own-plan zaktualizowany do nowego (zamierzonego) flow.

### 2026-07-03 — X11 FAZA 1: nawigacja bez ślepych zaułków (Z66-Z68)

**Bramki checkpointu (wszystkie zielone):** vitest 560/560 (67 plików), typecheck 0, lint 0, build OK, bundle-budget OK (initial 921 KB / 1200 KB), e2e:mock 127/127.

**Root cause znalezisk:** mobilny drawer istniał w kodzie (Sheet w AppNavigation + stan `sidebarOpen` w Layout), ale nikt nie wołał `setSidebarOpen(true)` — AppHeader nie miał hamburgera. Skutek: na telefonie żyło tylko 5 pozycji dolnego paska, `/history`, `/measurements`, `/cycles` były sierotami bez linków wchodzących.

1. **Z66 — hamburger + żywy drawer:** AppHeader dostał przycisk hamburger (ikona `Menu`, `md:hidden`, wzorzec `rounded-2xl bg-muted/60` z WorkoutDay, aria-label `nav.openMenu`); Layout przekazuje `onMenuClick={() => setSidebarOpen(true)}`. Sheet zamykał się już poprawnie (linki mają `onClick={onClose}`). Dolny pasek bez zmian (5 pozycji) — drawer uzupełnia, nie zastępuje. 2 nowe testy e2e (viewport 375x667: Historia/Pomiary/Cykle osiągalne, drawer zamyka się po wyborze).
2. **Z67 — linki krzyżowe:** (a) trening → instrukcje ćwiczenia: ikona `Info` przy nazwie w ExerciseCard i w liście DayPlan, nawigacja do `/exercise/:slug` TYLKO gdy slug-match w exerciseLibrary (custom/nieznane bez ikony); celowo ikona zamiast klikalnego nagłówka — brak przypadkowych tapnięć przy odhaczaniu; nawigacja w środku sesji bezpieczna (draft w IndexedDB, kontrakt Z49 nietknięty, potwierdzone testem e2e z powrotem do treningu). (b) Dashboard stat "Waga" → `/measurements` (było: analytics charts). (c) Sekcja "Plan tygodnia" → link "Pełna historia" → `/history`. (d) Karta "Twój plan" → drugorzędny link "Cykle" → `/cycles`. (e) Analytics progresja → przycisk "Wszystkie rekordy" → `/achievements`. Klucze i18n: `card.details`, `dash.fullHistory`, `dash.cycles`, `charts.allRecords` w OBU locale. 4 nowe testy e2e.
3. **Z68 — zero martwych przycisków:** z ExerciseDetail usunięte: przycisk "Dodaj do treningu" (toast "wkrótce" — stub od miesięcy; dodawanie ćwiczeń do planu wraca w Z71 we właściwym miejscu, edytorze planu) i zakładki (localStorage `bookmarked-exercises` — zapisywane, NIGDY nie czytane; rg potwierdził zero konsumentów). Osierocone i18n (`detail.added`, `detail.addedSoon`, `detail.addToWorkout`, `detail.bookmark`) usunięte z obu locale.

### 2026-07-03 — X10 FAZA 7: release train (Z65) — checkpoint X10

**Bramki przed wdrożeniem (wszystkie zielone):** vitest 560/560 (67 plików), typecheck 0, lint 0, build OK, bundle-budget OK (initial 921 KB / 1200 KB), test:rules 95/95, functions 82 passed / 4 skipped + build, e2e:mock 121/121, e2e:emulator 12/12.

**Wdrożone na produkcję (w kolejności checklisty):**
1. **Git:** 20 commitów X10 wypchniętych na origin/main (6d0d325..44c1805).
2. **Rules:** `firebase deploy --only firestore:rules` — whitelist estimatedMaxHR/maxHRManualOverride (Z59). Indeksy nietykane (bez zmian).
3. **Functions:** `firebase deploy --only functions --force` — komplet; saveMaxHR usunięty z GCP przez deploy (functions:delete zwrócił "not found" = już skasowany, potwierdzone functions:list).
4. **Web:** `npm run deploy` — hash `index-C3ZFOS2E.js` na https://grzegorzee.github.io/strength-save/ zgodny z dist/index.html.
5. **iOS:** build 49 (bez bumpu — 49 nie był w ASC) przez `scripts/release-ios.sh` — UPLOAD SUCCEEDED, build VALID, podpięty do grup, **Beta App Review: APPROVED** (Robert dostaje build automatycznie).
6. **Sekrety GitHub:** VITE_ALLOWED_EMAIL i VITE_ALLOWED_EMAILS usunięte (`gh secret delete`, zaległość R2/Z45); zostały tylko VITE_FIREBASE_*.
7. **Weryfikacja produkcji:** web wstaje z nowym hashem, logi functions bez błędów po deployu (gcloud functions logs read, 30 wpisów).

**Zakres release'u X10 (web + iOS build 49):** auto-resume treningu (Z47-Z49), porządki Settings (Z50-Z53), wydajność startu (Z54-Z56), maszyna stanów sesji (Z57), higiena (Z58-Z60), Adaptive Coach (Z63-Z64). Z61 (App Check) świadomie pominięty — kroki w checkpoincie FAZY 5.

**Uwaga do iOS:** build 49 zawiera ŁĄCZNIE zmiany R2 (Z29-Z46, nie wysłane wcześniej) + X10 — to pierwszy build w TestFlight od build 48.

### 2026-07-03 — X10 FAZA 6: Adaptive Coach (Z63-Z64)

**Bramki checkpointu (wszystkie zielone):** vitest 560/560 (67 plików), typecheck 0, lint 0, build OK, e2e:mock 121/121.

**Wyróżnik rynkowy:** trener reagujący na RPE/ból + gotowość łącząca siłownię z bieganiem (Strava), 100% offline, zero Functions.

**Silnik (`src/lib/adaptive-coach.ts`, 14 testów TDD) — reguły i strojenie:**
1. `buildExerciseRecommendation` (ostatnia ukończona sesja z ćwiczeniem): ból >= 3 → **deload** (delta -10% max ciężaru roboczego, zaokrąglone do 0.5 kg; bodyweight: delta 0); RPE >= 9 LUB completionRate < 0.8 → **hold**; RPE <= 7.5 I completionRate == 1 → **progress** (+5 kg dla dużych bojów dolnej połowy po nazwie: przysiad/martwy/prasa/hip thrust/hack squat, inaczej +2.5 kg). Priorytet: ból > ciężka sesja > progres. Brak metryk (rpe i pain undefined) LUB strefa środkowa (np. RPE 8) → **null** — coach mówi tylko przy jasnym sygnale, UI spada na nextAdvice. Progi = stałe na górze pliku (PAIN_DELOAD_THRESHOLD itd.) — strojenie w jednym miejscu.
2. `buildReadiness`: ratio = suma obciążenia z 7 dni / (suma z 28 dni / 4), liczona osobno dla tonażu siłowego i TRIMP (istniejące `computeDailyLoad` z training-load.ts, bez duplikacji), uśredniona z dostępnych domen; brak danych → ratio 1. Progi: <0.8 fresh, <=1.2 ok, <=1.5 loaded, >1.5 overreached; score = clamp(100 - ratio*50, 0, 100) — monotoniczny.

**UI (Z64), wszystko za flagą `FEATURE_FLAGS.adaptiveCoach` (kill-switch: `VITE_FEATURE_ADAPTIVE_COACH=false`):** karta Coach na Dashboardzie (pasek readiness + JEDNA najważniejsza rekomendacja dnia, priorytet deload > hold > progress); badge 🧠 na karcie ćwiczenia w treningu (nad nextAdvice, tooltip z powodem); sekcja "Następnym razem" w podsumowaniu ukończonego treningu (lista rekomendacji per ćwiczenie). Klucze i18n `coachx.*` w OBU locale (prefiks coachx, nie coach.* — tamte usunięto w Z39). Nowy hak testowy `fittracker_e2e_workouts` w workout-read-store (tylko mock E2E, wzorzec fittracker_e2e_cycles).

### 2026-07-03 — X10 FAZA 5: higiena i zaległości z FAZY 7 planu R2 (Z58-Z61)

**Bramki checkpointu (wszystkie zielone):** vitest 546/546, typecheck 0, lint 0, build OK, test:rules 95/95, functions 82 passed / 4 skipped + build OK, e2e:mock 119/119.

1. **Z58 — vitest 4.x w functions:** bump 2.1.9 → 4.1.9 bez breaking changes (testy przechodzą bez modyfikacji); `npm --prefix functions audit`: 0 podatności.
2. **Z59 — saveMaxHR przez rules (-1 kontener):** rules users dopuszczają `estimatedMaxHR` (int, 100-230) i `maxHRManualOverride` (bool) w update usera; klient (`useStrava.saveMaxHR`) pisze `updateDoc(users/{uid})` bezpośrednio z walidacją widełek przed zapisem; funkcja usunięta z index.ts wraz z osieroconym `max-hr.ts` (+test) — walidacja żyje w rules i ma 4 przypadki w test-firestore-rules (ALLOWED w widełkach, DENIED 300, DENIED 'wysoki', DENIED zły typ bool). Stare przypadki "zablokowane" zaktualizowane. `firebase functions:delete saveMaxHR` = krok FAZY 7.
3. **Z60 — martwe aliasy tras:** `/stats` `/summary` `/progress` usunięte z App.tsx (rg: zero linków w src/); test e2e zaktualizowany na oczekiwane 404.
4. **Z61 — App Check: ŚWIADOMIE POMINIĘTE (ścieżka STOP z planu).** Rejestracja reCAPTCHA v3 (web) i App Attest (iOS) wymaga kroków w konsolach (reCAPTCHA admin / Firebase console / App Store Connect), niedostępnych z CLI; wartość przy dostępie 1 usera na TestFlight niska, ryzyko odcięcia przy złej konfiguracji realne. Kroki dla usera przed przyszłym wdrożeniem (tryb MONITOR, bez enforce): (a) Firebase console → App Check → zarejestruj appkę web z reCAPTCHA v3 (utwórz klucz na google.com/recaptcha, domena grzegorzee.github.io) i appkę iOS z App Attest; (b) w kliencie `initializeAppCheck` z `isTokenAutoRefreshEnabled: true`, BEZ enforce na żadnej usłudze; (c) po 2-4 tygodniach sprawdź metryki App Check (odsetek zweryfikowanych żądań) zanim włączysz enforce.

### 2026-07-03 — X10 FAZA 4: maszyna stanów sesji + hydracja jako czysta funkcja (Z57)

**Bramki checkpointu (wszystkie zielone):** vitest 546/546 (66 plików), typecheck 0, lint 0, build OK, e2e:mock 119/119, e2e:emulator 12/12.

**Co:** dwa czyste moduły — `src/lib/workout-session-state.ts` (`deriveWorkoutSessionPhase`: idle/active-provisional/active-remote/completing/final-pending/completed/editing/conflict + helper `isActiveTrainingPhase`) i `src/lib/workout-hydration.ts` (`resolveWorkoutHydration`: DOSŁOWNE przeniesienie 9 gałęzi shouldUseDraft + warunek czyszczenia draftu). WorkoutDay: efekt hydracji woła resolveWorkoutHydration i wykonuje skutki; `sessionPhase` liczona useMemo, użyta w AutoSaveIndicator i w `enabled` synca zegarka (isActiveTrainingPhase = dawne `!!sessionId && !isCompleted && !isEditing` — mapowanie dokładne, bo editing i final-pending wymagają ukończonej sesji).

**Świadome ograniczenie zakresu:** gate'y widoków completed/editing (`isCompleted && !isEditing` itd.) ZOSTAŁY na flagach — stany nakładają się (editing+isExplicitSaving podczas zapisu edycji, completed+isExplicitSaving podczas retry finalnego syncu), więc liniowa faza ich nie odwzorowuje 1:1; wymuszenie = zmiana zachowania, wbrew kontraktowi zadania. Root cause klasy bugów R1/R2 (heurystyki hydracji w komponencie z eslint-disable) jest wyjęty do funkcji z 12 testami.

**Naprawa testu przy okazji (nie kodu):** e2e emulator merge-501 klika "Połącz przerwane cykle", który po Z52 żyje w domyślnie zwiniętym akordeonie — test najpierw rozwija "Narzędzia naprawcze". Jednorazowy fail suity emulatora po fixie okazał się flakiem (rerun 12/12).

### 2026-07-03 — X10 FAZA 3: wydajność startu i danych (Z54-Z56)

**Bramki checkpointu (wszystkie zielone):** vitest 526/526 (64 pliki), typecheck 0, lint 0, build OK, check:bundle-budget OK (initial 919 KB / limit 1200 KB), e2e:mock 119/119 (1 pre-existing flake exercise-card-v3 "multiple workout days", przechodzi przy powtórce 6/6).

**Z54 — bundle (rozmiary dist/assets, KB):**

| Chunk | PRZED | PO | Uwagi |
|---|---|---|---|
| firebase | 716 | — | rozbity na 3 poniżej |
| firebase-firestore | — | 352 | osobny chunk = bump SDK nie unieważnia auth/core w cache |
| firebase-core | — | 192 | |
| firebase-auth | — | 180 | |
| index | 568 | 568 | bez zmian |
| ExerciseDetail | 272 | 144 | słownik EN (128 KB) dociągany dynamicznie tylko w trybie EN |
| exercise-details-en | — | 128 | lazy |
| chart-config (recharts) | 364 | 364 | ładowany dopiero przy wykresie w Achievements (lazy TonnageTrendChart, wzorzec AnalyticsChartsTab) |
| react-vendor | 140 | 140 | |

Budżet zaostrzony: per-chunk 800→600 KB + NOWY limit sumy initial (index + firebase-core + react-vendor) 1200 KB (obecnie 919 KB). Dynamiczny import EN tylko dla `exercise-details-en` (1 konsument produkcyjny: ExerciseDetail, bump stanu po preload); PL kanoniczny zostaje statyczny — zgodnie z bezpiecznikiem planu (limit 5 plików nie przekroczony).

**Z55 — limity listenerów:** `plan_cycles` limit(60) (5 lat historii, orderBy startDate desc tnie najstarsze); `weekly_summaries` limit(26) — kolekcja zamrożona (generator usunięty w R2), limit to czapka kosztowa, nie selektor.

**Z56 — obserwowalność crashy renderu:** ErrorBoundary.componentDidCatch raportuje `render-crash` (phase 'other', message + pierwsza linia stacka) do client_errors, tylko przy przekazanym uid; NOWY boundary per trasa wokół `<Suspense>` drzewa tras (uid z useCurrentUser) z kartą "Coś poszło nie tak" + "Wróć na Dashboard" (reset + navigate) — crash strony nie wywala apki; boundary topowy zostaje ostatnią linią obrony.

### 2026-07-03 — X10 FAZA 2: porządki w Settings i narzędziach (Z50-Z53)

**Bramki checkpointu (wszystkie zielone):** vitest 523/523 (63 pliki), typecheck 0, lint 0, build OK, e2e:mock 119/119.

1. **Z50 — martwe ustawienie usunięte:** Select "godzina podsumowania" zapisywał `summary-hour` do localStorage, którego NIC nie czytało (digest chodzi cronem o stałej porze). Bezpiecznik rg potwierdził zero konsumentów; karta + stała + stan + 3 osierocone klucze i18n usunięte z obu locale.
2. **Z51 — ODSTĘPSTWO OD PLANU (świadome):** plan kazał PRZENIEŚĆ FeatureFlagsPanel z Settings do AdminDashboard, ale AdminDashboard JUŻ MA per-user feature flags w rozwijanych szczegółach usera (sekcja `admin.features`, label zawsze widoczny, ten sam zapis `features.strava`). Przeniesienie tworzyłoby DUPLIKAT — panel w Settings usunięty w całości (140 linii), klucze `settings.features.*`/`settings.feature.*` usunięte jako osierocone. Intencja zadania (back-office poza Settings, label widoczny na telefonie) spełniona lepiej niż literalny fix.
3. **Z52 — Sync Center jako deska ratunkowa:** stan wpisów wydzielony do hooka `useSyncCenterEntries` (dedup drafty+kolejka po sessionId, ekstrakcja 1:1); Settings renderuje kartę TYLKO przy `listedEntries.length > 0` — zdrowy user nie widzi pustego Sync Center. Surowy kod błędu zszedł do tooltipa (`title=`), user widzi komunikat po ludzku (mapowanie `workoutSyncErrorMessageKey` już istniało). Narzędzia serwisowe (naprawa cykli, napraw dane, wyczyść duplikaty, reset planu) w JEDNYM zwijanym bloku "Narzędzia naprawcze" (Collapsible, domyślnie zwinięty, hint kiedy używać); przyciski naprawcze wydzielone z DataManagement do eksportowanego `DataRepairTools` (Measurements nadal dostaje je przez DataManagement — bez zmiany API).
4. **Z53 — jednorazowe sprzątanie sprzed R2:** `cleanupLegacySyncLeftovers(uid, workouts)` w `src/lib/workout-sync-cleanup.ts`: (1) wpisy kolejki bez draftu w IDB → remove (kolejka referencyjna, bez treści nie ma czego syncować); (2) czyste (nie-dirty, nie-finalSyncPending) drafty provisional z ukończonym odpowiednikiem dzień+data w chmurze → `clearActiveDraftIfVersion` (respektuje wersjonowanie — kontrakt R2 nietknięty); guard `fittracker_legacy_cleanup_v1:{uid}` ustawiany PO sukcesie (porażka = retry). Podpięte w AutoSyncOnReconnect po załadowaniu workouts, fire-and-forget.

**Root cause klasy problemu:** Settings zbierał przez lata funkcje serwisowe i adminowe bez miejsca docelowego; "stary trening wisiał w Sync Center", bo mechanizmy sprzątania R2 (tombstone Z32, kolejka Z23) nie działają wstecz.

### 2026-07-03 — X10 FAZA 1: powrót do aktywnego treningu (Z47-Z49)

**Bramki checkpointu (wszystkie zielone):** vitest 515/515 (61 plików), typecheck 0, lint 0, build OK, e2e:mock 119/119, e2e:emulator 12/12 (JDK21).

**Co i dlaczego:** po zabiciu apki / zimnym starcie user ZAWSZE lądował na Dashboardzie mimo żywego draftu w IndexedDB; karta dzisiejszego treningu pokazywała "Start treningu" w połowie sesji, a karta statusu sync kierowała do Settings zamiast do treningu.

1. **Z47 — draft pamięta ostatnie ćwiczenie:** nowe opcjonalne pole `lastTouchedExerciseId` w `ActiveWorkoutDraft` (additive, bez bumpu DB_VERSION, normalizacja wzorcem exerciseMetrics); snapshot przenosi je z previousDraft (overrides mogą nadpisać); handlery `handleSetsChange`/`handleMetricsChange`/`handleWatchSetLogged` ustawiają je przy każdym dotknięciu. Po hydracji draftu WorkoutDay przewija kartę tego ćwiczenia (`scrollIntoView`, retry 300/900 ms), ale TYLKO gdy scroll-restore nie ma świeżej pozycji (<15 min) — zapisana pozycja ma pierwszeństwo. Ref-guard scrolla po stabilnym kluczu `uid:date` (NIE sessionId — promocja provisional→remote zmienia go w trakcie).
2. **Z48 — natywny cykl życia iOS:** nowy plugin `@capacitor/app` + moduł `src/lib/app-lifecycle.ts` (`addAppStateListener`): natywnie `appStateChange` (dynamiczny import, guard na brak pluginu), na webie fallback visibilitychange. WorkoutDay flushuje draft dodatkowo przez ten kanał; webowe handlery zostają (duplikat flusha = no-op przez latestWriteVersions).
3. **Z49 — auto-resume:** czysta funkcja `shouldResumeWorkoutDraft` (`src/lib/workout-resume.ts`): resume gdy draft żywy (dirty lub provisional), nieukończony (!completedLocally && !finalSyncPending) i świeży (dzisiejszy LUB dotykany <12h). Komponent `ActiveWorkoutResume` (App.tsx, obok WatchEventRouter): nawiguje na mount i na przejście background→active (ref-guard; świadome wyjście usera z treningu nie wraca), telemetria `workout_auto_resume` (rules OK — counters to mapa bez per-event hasOnly). Dashboard: karta dzisiejszego treningu przy żywym drafcie = "Kontynuuj trening" + licznik odhaczonych serii i link z `session=`; karta statusu sync przy żywym drafcie prowadzi do treningu (Settings zostaje dla wpisów kolejki bez draftu).

**Root cause klasy problemu:** draft był bezpieczny w IndexedDB, ale żadna warstwa nawigacji go nie otwierała — brakowało decyzji "resume" jako czystej funkcji i komponentu, który ją wykonuje.

**Zmiana w testach e2e:** scenariusz "dashboard highlights offline state" dostał draft nieświeży (>12h) — świeży provisional jest teraz z definicji auto-wznawiany (nowy test Auto-resume Z49 pokrywa oba warianty).

### 2026-07-03 — R2 FAZA 6: release train (Z46) — checkpoint R2

**Bramki przed wdrożeniem (wszystkie zielone):** vitest 501/501, typecheck 0, lint 0, build OK, test:rules 93/93, functions 85+4 (2 nowe integracyjne waitlisty na emulatorze), e2e:mock 116/116, e2e:emulator 12/12, bundle-budget OK.

**Wdrożone na produkcję:**
1. **Git:** 36 commitów R2 wypchnięte na origin/main (de85d78..fd16c89).
2. **Functions:** `firebase deploy --only functions` — komplet; streamOpenAI, proxyOpenAI, generateWeeklySummary skasowane z GCP (`functions:delete`).
3. **Rules + indeksy:** deploy `firestore:rules,firestore:indexes`; nowy composite index workouts (completed ASC, date ASC); skasowane 2 martwe indeksy chat_messages i chat_conversations (`gcloud firestore indexes composite delete`), stan w GCP = firestore.indexes.json (5 indeksów).
4. **TTL:** 7 polityk ACTIVE (auth_audit_logs/notification_logs/api_audit_logs/api_rate_limits/waitlist_rate_limits/client_errors po `expiresAt`, email_verification_codes po `ttlExpiresAt`).
5. **Web:** `npm run deploy` — hash bundla na gh-pages zgodny z lokalnym buildem (index-DKee537W.js).
6. **iOS:** CURRENT_PROJECT_VERSION 48 -> 49 (6 wystąpień, preflight passed). `scripts/release-ios.sh` NIE odpalony — czeka na potwierdzenie usera przed wysyłką TestFlight (twarda zasada zlecenia).

**HOTFIX wykryty smoke testem produkcyjnym (poza planem):** po zdjęciu enforceAppCheck (Z33) waitlista NADAL padała — transakcja `createWaitlistEntry` robiła odczyt PO zapisie (get(rate) -> set(rate) -> get(existing)), a Firestore wymaga wszystkich odczytów przed zapisami; defekt istniał od zawsze, maskowany przez App Check odrzucający requesty zanim doszło do transakcji (emulator w E2E też go nie łapał, bo scenariusze nie przechodziły przez tę ścieżkę). Fix: oba odczyty przed zapisem + ekstrakcja `createWaitlistEntryCore` + 2 testy integracyjne na emulatorze (`npm run test:functions:emulator`). Weryfikacja NA PRODUKCJI: `createWaitlistEntry` zwraca `{entryId, existing:false}`; testowy wpis i jego rate limit usunięte admin SDK.

**Weryfikacja produkcji po wdrożeniu:** waitlista przechodzi end-to-end; jedyny błąd w logach functions po deployu to zapis sprzed hotfixu; TTL wszystkie ACTIVE.

**Zostaje (poza zakresem automatu):** wysyłka builda 49 na TestFlight (`scripts/release-ios.sh "R2: stabilność zapisu + koszty"` — po Z34 bez ręcznego source .env), usunięcie sekretów VITE_ALLOWED_EMAIL/VITE_ALLOWED_EMAILS z GitHub Secrets (ręczne, konsola GitHub), test terenowy usera (scenariusz w raporcie końcowym R2 i w Z46 krok 10 planu).

### 2026-07-03 — R2 FAZA 5: higiena repo i zależności (Z45)

Weryfikacja checkpointu: vitest 501/501, typecheck 0, lint 0, build OK, check:bundle-budget OK, functions 85 passed / 2 skipped.

Zmiany (commit per punkt): (1) `test-results/.last-run.json` zdjęty z trackingu (gitignore już pokrywał). (2) `engines.node >= 22` w root package.json. (3) Override `uuid ^11.1.1` w functions — `npm audit --omit=dev` w functions: 0 podatności (wcześniej 8 moderate przez łańcuch firebase-admin), testy i build functions zielone. (4) Usunięte 14 nieużywanych zależności (zod, @hookform/resolvers, react-hook-form, 6 sierot @radix-ui, react-resizable-panels, embla-carousel-react, input-otp, cmdk, vaul, react-day-picker) + 12 plików `src/components/ui/*` bez ani jednego importera (każda pozycja zweryfikowana rg przed usunięciem). (5) Martwe `VITE_ALLOWED_EMAIL`/`VITE_ALLOWED_EMAILS` usunięte z `.github/workflows/deploy.yml` i `src/vite-env.d.ts` — **RĘCZNE dla usera: usunąć sekrety VITE_ALLOWED_EMAIL i VITE_ALLOWED_EMAILS z GitHub Secrets repo.** (6) Martwe grupy kluczy i18n usunięte z OBU locale (workout.status.{offline,syncPending,syncing,synced,finishedLocally}, newplan.level.*, onboarding.level.*; pozostałe workout.status.* są używane — zweryfikowane rg per klucz). (7) Hardcoded PL w panelach admina: przyjęte jako "by design" (admin = właściciel, pracuje po polsku); migracja do t() dopisana do backlogu jako opcja — user może zdecydować inaczej.

Chunk firebase (~715K, 87% budżetu) pozostaje obserwacją (R2-31): rozbicie w manualChunks przy najbliższym bumpie SDK (FAZA 7 pkt 8).

### 2026-07-03 — R2 FAZA 4: rules hardening + pakiety P2 syncu i frontendu (Z41-Z44)

Weryfikacja checkpointu: vitest 501/501 (+27 nowych testów), typecheck 0, lint 0, build OK, test:rules 93/93 (+29 nowych), e2e:mock 116/116, e2e:emulator 12/12. Scenariusz background/resume na urządzeniu odłożony do testu terenowego usera (Z46), jak w Fazie 2.

**Z41 — zamknięte schematy rules (R2-13..15).** Przed napisaniem reguł zweryfikowano READ-ONLY kształty dokumentów PRODUKCYJNYCH skryptem admin SDK (lekcja createdAt z F1) — wykryto m.in. dokumenty `app_telemetry_daily` z legacy PŁASKIMI kluczami `counters.xxx` (historyczny zapis dot-notation), które hasOnly musi jawnie dopuszczać. Zmiany: client_errors z pełną walidacją pól (typy, limity długości, platform in [web/ios/android], createdAt w widełkach +/- 10 min od request.time, expiresAt timestamp OPCJONALNE — klienty build <= 48 raportują bez TTL), training_plans/measurements/plan_cycles/plan_cycle_operations/app_telemetry_daily z hasOnly + typami pól skalarnych, users z typami wartości whitelisty update (mapy/stringi z limitami), weekly_summaries create+update: false (martwe — generator usunięty w Z39), chat_messages delete: false (GDPR przez admin SDK). Dwa stare testy rules zaktualizowane do realnego kształtu klienta (telemetria pisała w teście nieistniejące pole `opens`, client_errors miał createdAt sprzed widełek).

**Z42 — kolejka i klasyfikacja (R2-16..19, R2-32).** (1) `recordWorkoutSyncFailure` (workout-sync-entries.ts): porażka syncu zapisywana pod DOCELOWYM sessionId (po promocji NOWY id); gdy wpis nie istnieje, draft jest adoptowany do kolejki — bez tego lastError ginął i AutoSync ponawiał konfliktowy final w nieskończoność. (2) Flaga `permanent` na wpisie kolejki (markRetry klasyfikuje not-found/permission); collectRetryableSyncEntries pomija takie wpisy (draft i wpis), Sync Center nadal je pokazuje z ręcznymi akcjami. (3) Gałąź offline w WorkoutDay przez `classifyWorkoutSyncError(...) === 'offline'` (silnik zwraca 'OFFLINE' tylko dla provisional; remote offline leci surowym błędem Firestore — wcześniej klasyfikowany jako twardy błąd z czerwonym badge). (4) Telemetria z prawdziwą fazą: syncOne raportuje 'checkpoint' (nie 'final'), konflikt wykryty PODCZAS syncu raportuje fazę syncu (registerConflict z parametrem), 'conflict-resolve' zostaje dla akcji usera. (5) R2-32 z korektą znaleziska: martwy był TYLKO `buildSyncCenterSaveOptions` (pułapka `expectedRevision ?? 0`, bez writeId) — `buildSyncCenterExercisesPayload` był używany przez SILNIK; przeniesiony do workout-sync-engine.ts jako `buildDraftExercisesPayload`, moduł sync-center-payload.ts usunięty; usunięte nieużywane isSyncingRef i import matchesFinalWorkoutContent w WorkoutDay; gałęzie `!success && skipped` dostosowane do kontraktu Z23 (skipped przychodzi z success:true, bez toastu "zsynchronizowano").

**Z43 — baseline i hydracja (R2-20..23).** (1) Promocja na ISTNIEJĄCĄ sesję (createSession existing:true) pobiera baseline z `getFromServer` zamiast ufać revision z kopii pamięciowej createSession (persistentLocalCache). (2) `buildWorkoutDraftSnapshot` z fallbackiem bazy na queuedDraft przy zgodnym sessionId (bez rollbacku version do 1 i utraty startedAt/cycleId przy hydracji z kolejki). (3) Hydracja czyszcząca draft po ukończonym treningu porównuje przez `buildDraftFinalExpectation` (sety + notes + skippedExercises) — draft z niedosłaną notatką/skipem zostaje jako dirty. (4) Singleton połączenia IDB z onclose/onversionchange (reopen po zerwaniu w tle) + reset połączenia przed retry zapisu; koniec z open per operacja.

**Z44 — frontend P2 (R2-24..29, 6 izolowanych commitów).** (1) rest-notification: cache tylko pozytywnej decyzji o uprawnieniach — odmowa weryfikowana ponownie (user może włączyć w Ustawieniach systemu). (2) RestTimer/rest-notification: token generacji + wspólny chain operacji — cancel w trakcie trwającego schedule wygrywa (notyfikacja nie odpala mimo pauzy). (3) Watch: klucz dedupu appliedRef trwały dopiero PO udanym zapisie draftu; błąd = klucz usunięty, event zostaje w natywnej kolejce do retry + toast destructive + reportClientError (nowe klucze i18n workout.toast.watchSetError* w pl i en). (4) Cycles auto-repair: `runCycleAutoRepair` — guard ustawiany przed create (ochrona okna async), czyszczony przy porażce (offline nie wypala naprawy na zawsze). (5) useOnlineStatus: licznik pending sterowany WORKOUT_SYNC_STATE_CHANGED_EVENT + focus/online zamiast odpytywania IndexedDB co 2 s (konkurencja z zapisami draftu w treningu). (6) Usunięty martwy duplikat trasy /measurements, limit 200 na odczycie users w panelu flag Settings, avatar pod stałą ścieżką `avatars/{uid}/avatar` (nadpisywanie zamiast osieroconych plików; nowy upload = nowy token = świeży URL).

### 2026-07-03 — R2 FAZA 3: koszty Functions / serverless (Z36-Z40)

Weryfikacja checkpointu: vitest 474/474, typecheck 0, lint 0, build OK, functions 85 passed / 2 skipped + build OK. Efekt zbiorczy: przy 1000 aktywnych userów koszt zmienny spada z ~22-25 USD/mies. do ~2-3 USD/mies. (model w planie R2, sekcja 2).

| Funkcja | Zmiana | Efekt kosztowy |
|---------|--------|----------------|
| stravaScheduledSync / manualny sync (Z36) | sync inkrementalny czyta TYLKO pobrane w runie aktywności (`db.getAll` po deterministycznych ID, chunk 300); pełny skan zostaje wyłącznie dla initial syncu; ekstrakcja `loadExistingActivities` (testowalna) | ~99% redukcja reads największego drivera (300 userów x 300 aktywności x 30 dni = ~2.7M reads/mies. -> O(pobranych), typowo 0-5/user/noc) |
| resumeDeletionOperations (Z37) | cron co 60 min zamiast co 5 (worker naprawczy po crashu; usunięcia i tak biegną synchronicznie) | 8640 -> ~720 inwokacji/mies. (-97%) |
| weeklyDigest (Z38) | odbiorcy z kolekcji users (status active + opt-out `notificationPrefs.weeklyDigest`, brak pola = wysyłaj); 2 kwerendy zbiorcze (workouts completed+date, strava date) zamiast 2 per user; toggle w ustawieniach (web i native) + i18n; nowy composite index workouts (completed ASC, date ASC); ekstrakcja `runWeeklyDigest(deps)` (testowalna) | maile tylko do realnych subskrybentów z treningiem (dominujący koszt Resend ~20 USD/mies. przy 1000 userów spada do realnej frakcji); reads O(treningów tygodnia + userów), nie O(2x userów) |
| streamOpenAI, proxyOpenAI, generateWeeklySummary (Z39) | usunięte z kodu (deploy skasuje kontenery w Fazie 6) + moduł ai-usage.ts, kliencki ai-coach.ts/useAISwap/TypingIndicator, generator weekly-summary, karta ai_usage w adminie, 18 kluczy i18n, indeks chat_messages; GDPR purge kolekcji ai_usage ZOSTAJE (dane istnieją) | -3 kontenery (w tym publiczny endpoint HTTP), -1 sekret (openai-api-key przestaje być montowany), mniejsza powierzchnia ataku |
| dailyTrainingReminder (Z40a) | iteracja po fcm_token_registrations -> getAll tylko userów z tokenem i ich planów; ekstrakcja `runDailyReminder(deps)` (testowalna) | przy 1000 userów / 100 z tokenem: ~3k -> ~300 reads/dzień |
| syncUserProfile (Z40b) | `shouldLogLoginSuccess`: wpis login_success do auth_audit_logs tylko gdy poprzedni login starszy niż 20 h (inne typy zdarzeń bez zmian) | zapis 1x/dzień zamiast przy każdym otwarciu apki |
| TTL (Z40c) | `expiresAt` (Timestamp) przy zapisie: auth_audit_logs (90 dni), notification_logs (90), api_audit_logs (180), api_rate_limits (7), waitlist_rate_limits (7), client_errors (30, pisze klient — pole dopuszczone w rules w Z41); email_verification_codes dostaje `ttlExpiresAt` (1 dzień) — ODSTĘPSTWO od planu: istniejące pole `expiresAt` to string ISO w logice 10-minutowej ważności kodu, zmiana typu łamałaby weryfikację | storage kolekcji operacyjnych przestaje rosnąć bez sufitu |

**Komendy TTL do wykonania w FAZIE 6 (Z46 krok 5), po deployu functions:**

```bash
gcloud firestore fields ttls update expiresAt --collection-group=auth_audit_logs --enable-ttl --project fittracker-workouts
gcloud firestore fields ttls update expiresAt --collection-group=notification_logs --enable-ttl --project fittracker-workouts
gcloud firestore fields ttls update expiresAt --collection-group=api_audit_logs --enable-ttl --project fittracker-workouts
gcloud firestore fields ttls update expiresAt --collection-group=api_rate_limits --enable-ttl --project fittracker-workouts
gcloud firestore fields ttls update ttlExpiresAt --collection-group=email_verification_codes --enable-ttl --project fittracker-workouts
gcloud firestore fields ttls update expiresAt --collection-group=waitlist_rate_limits --enable-ttl --project fittracker-workouts
gcloud firestore fields ttls update expiresAt --collection-group=client_errors --enable-ttl --project fittracker-workouts
```

Uwaga: TTL kasuje tylko dokumenty z ustawionym polem — wpisy sprzed R2 (bez expiresAt) zostaną; ewentualne jednorazowe doczyszczenie starych logów można zrobić skryptem admin SDK później (nie blokuje niczego).

### 2026-07-03 — R2 FAZA 2: waitlista, release script, wydajność WorkoutDay (Z33-Z35)

Weryfikacja checkpointu: vitest 474/474, typecheck 0, lint 0, build OK, functions 68 passed / 4 skipped. Scenariusz background/resume na realnym urządzeniu ODŁOŻONY do testu terenowego usera w Z46 (zmiany Z35 są czysto renderowe: zegar liczy od startedAt przy każdym ticku, więc po resume pokazuje poprawny czas; logika zapisu draftu nietknięta — pokryta testami F1).

**Z33 — reanimacja waitlisty, wariant A (R2-05).** Root cause: `createWaitlistEntry` z `enforceAppCheck: true`, a klient NIGDZIE nie inicjalizuje App Check (rg: zero `initializeAppCheck` w src/) — Functions v2 odrzuca każdy produkcyjny request, każdy lead z ekranu logowania przepada; emulator pomija App Check, więc E2E tego nie widziało. Logi produkcyjne: wywołania z 2026-06-27 z WARNING. Fix (wariant A, potwierdzony przez usera): zdjęty enforceAppCheck; anti-abuse zapewnia transakcyjny rate limit 60 s per email + walidacje + cooldown. Pełny App Check (reCAPTCHA v3 + App Attest) świadomie odłożony do publicznego launchu (FAZA 7 pkt 7).

**Z34 — release-ios.sh ładuje .env (R2-06).** Root cause: preflight (proces node) wymaga `VITE_REVENUECAT_APPLE_API_KEY` w env, a skrypt nie ładował `.env` (vite czyta go sam, node nie) — release padał bez ręcznego `set -a && source .env` (pułapka z release trainu R1). Fix: blok `source .env` po cd do ROOT + walidacja istnienia klucza `.p8` z czytelnym błędem + poprawiony stale komentarz (6 wystąpień CURRENT_PROJECT_VERSION, nie 2). Weryfikacja: `bash -n` + preflight przechodzi w czystym env (`env -i`).

**Z35 — WorkoutDay bez re-render bomby (R2-07).** Root cause: `setElapsedSec` w setInterval(1000) re-renderował cały 2100-liniowy komponent co sekundę przez cały trening, a w renderze per ćwiczenie liczone były pełne skany historii (getNextSetAdvice, getExerciseBest1RM, getRzaAdvice, getPreviousSets); memo na ExerciseCard bezużyteczne przez świeże lambdy onSetsChange/onMetricsChange. Fix: (a) zegar wydzielony do `SessionClock` (własny stan, tick re-renderuje tylko kafelek; liczy od startedAt, więc odporny na suspend iOS), elapsedSec usunięty ze stanu strony (fallback duration podsumowania liczony z finalizedAt/startedAt draftu); (b) `exerciseInsights` = useMemo mapa exerciseId -> {previousSets, nextAdvice, historicalBest, rzaAdvice} zależna od [day, workouts, previousWorkout, previousSetsByName, lang, unit]; (c) ExerciseCard callbacki przyjmują exerciseId (onSetsChange(exerciseId, sets, notes)) — strona przekazuje stabilne useCallback bez lambd inline. Weryfikacja POMIAREM (tymczasowa instrumentacja + jednorazowy spec Playwright w trybie mock, usunięte po pomiarze): 5 sekund ticków zegara przy aktywnym treningu = 0 re-renderów ExerciseCard.

### 2026-07-03 — R2 FAZA 1: integralność zapisu P0/P1 (Z29-Z32) + hotfix rules

Weryfikacja checkpointu: vitest 474/474 (56 plików, 16 nowych testów), typecheck 0, lint 0, build OK, e2e:mock 116/116, e2e:emulator 12/12 (1 nowy scenariusz orphan), test:rules 64/64 (JDK21).

**Z29 — writeId przeżywa flush draftu (R2-01).** Root cause: `buildDraftSnapshot` w WorkoutDay budował draft od zera — gubił `pendingWriteId`/`pendingWriteVersion` (put całego rekordu wymazywał je z IDB) i ZAWSZE podbijał `version`; flush przed każdym checkpointem powodował, że retry po lost-ack szedł z nowym writeId i podbitą wersją → `resolveWriteAttempt` zwracał WORKOUT_CONFLICT (obejście Z21 na głównej ścieżce). Fix: ekstrakcja do czystej funkcji `buildWorkoutDraftSnapshot` (`src/lib/workout-draft-snapshot.ts`): pendingWrite\* przenoszone z previousDraft, version podbijana TYLKO przy realnej zmianie treści (exerciseSets/exerciseNotes/exerciseMetrics/dayNotes/skippedExercises, porównanie strukturalne). Komponent jest cienkim wrapperem. Test integracyjny lost-ack na silniku: checkpoint → commit bez acku → flush → retry z TYM SAMYM writeId → already-applied, revision bez podbicia. Odstępstwo kosmetyczne: testy w `src/test/` (konwencja repo), nie `src/lib/`.

**Z30 — updateDraft atomowe (R2-02).** Root cause: `updateDraft` robił read (osobna transakcja) → mutacja w JS → write (osobna transakcja), poza `writeChains`; markDraftSynced startujący na v1 potrafił nadpisać równolegle zapisaną v2 (odhaczona seria znikała z IDB; po ubiciu webview przepadała na stałe, bo dirty=false blokował checkpoint). Fix: `runUpdate` = get+put w JEDNEJ transakcji readwrite (mutator synchroniczny — transakcja IDB auto-commituje po opróżnieniu mikrotasków) + serializacja przez `writeChains` per klucz draftu. Test wyścigu na fake IDB z bramkowanym putem.

**Z31 — finalny clearDraft z guardem wersji (R2-03).** Root cause: po walidacji finalu silnik kasował draft bezwarunkowo; seria odhaczona w trakcie finalnego RTT (kilka-kilkanaście s na słabym zasięgu) ginęła na zawsze. Fix: `clearActiveDraftIfVersion(userId, sessionId, expectedVersion)` (delete tylko gdy `version <= expected`, w writeChains, zwraca boolean); silnik przy odmowie ustawia `draftRetained: true`, NIE sprząta kolejki i zapisuje fakt serwera na drafcie przez markSynced (przy niezgodnej wersji = tylko znaczniki chmury, świeży precondition dla follow-upu). Adapter WorkoutDay przy draftRetained: draft + kolejka zostają, sesja aktywna, toast "zapisano lokalnie" — user domyka ponownym "Zakończ trening" (checkpoint follow-up nie cofa completed: batchSaveWorkout nie dotyka pola completed bez options.completed).

**Z32 — tombstone promocji provisional->remote (R2-04).** Root cause: przez cały RTT promocji WorkoutDay pisał pod stary klucz provisional (sessionId w React zmienia się po outcome) — orphan wisiał w Sync Center, a ręczny sync orphana nadpisywał treścią stale nowszy trening w chmurze (markPromotedToRemote nadpisywał draft remote, cloudRevision=undefined → świeży baseline → precondition przechodził). Fix: (a) tombstone w localStorage `fittracker_promoted:{uid}:{provisionalId}` -> {remoteId, at}, TTL 7 dni, sprzątany przy odczycie i przy zapisie kolejnych; (b) `saveActiveDraft` pod klucz z tombstone przekierowuje zapis pod remote (merge po version: stale zapis sprzed promocji przegrywa, edycja z okna promocji wygrywa i podbija do max+1; brak rekordu remote = sesja domknięta, nie wskrzeszamy); (c) `markPromotedToRemote` scala transakcyjnie na OBU kluczach (`runPromote` + czysta `mergePromotedDraft`): nowszy draft remote wygrywa treścią, znaczniki chmury zawsze świeże. E2E emulator: nowy scenariusz "sync orphana nie nadpisuje nowszej treści" używa realnej `mergePromotedDraft`.

**Hotfix bramki (poza planem, klasa "błąd zapisu treningu").** e2e:emulator wykrył powtarzalny fail `plan-lifecycle merge 501 treningów` — zweryfikowany na worktree baseline 19def99: fail PRE-ISTNIEJĄCY (nie regresja R2), wszedł z Z28 i nie został wykryty, bo bramki startowe audytu R2 nie obejmowały e2e:emulator. Root cause: `validWorkoutShape()` (hasOnly) nie dopuszczał legacy pola `createdAt` — hasOnly widzi CAŁY dokument po merge, więc KAŻDY update dokumentu z tym polem (np. remap cyklu, checkpoint na starym dokumencie) padał PERMISSION_DENIED. Fix: `createdAt` dodany do hasOnly + test rules "update workouta LEGACY z polem createdAt dozwolony — REGRESJA" (lekcja 880cb9e: reguły muszą mieć przypadek z danymi w kształcie sprzed hardeningu). Po fixie: rules 64/64, e2e:emulator 12/12.

### 2026-07-03 — FAZA 6 planu naprawy + release train: security (Z27-Z28), zamknięcie planu Z13-Z28

**Z27 — zależności.** Root: `npm audit fix` → prod deps 0 podatności, react-router-dom 6.30.4 (cel >= 6.30.3). Functions: prod deps (`npm audit --omit=dev`) 0 HIGH/CRITICAL (zostało 9 moderate bez dostępnego niełamiącego fixa). Świadomie odłożone: HIGH/CRITICAL w DEV deps functions (vitest/vite, fix wymaga major bump vitest 4.x — nie dotyka produkcji, do zrobienia przy okazji aktualizacji toolchainu). Testy functions po bumpach: 68 passed / 4 skipped.

**Z28 — utwardzenia punktowe.** (1) CORS streamOpenAI: originy localhost tylko przy `FUNCTIONS_EMULATOR=true`, produkcja wyłącznie GitHub Pages. (2) revenuecatWebhook: porównanie sekretu timing-safe (SHA-256 obu wartości + `timingSafeEqual`, wzorzec safeHashEquals z admin-api.ts). (3) `config/{docId}` zawężone do `config/feature_flags`. (4) Schemat workouts w rules: `validWorkoutShape()` = `keys().hasOnly([17 znanych pól, w tym lastWriteId z Z21])` + `notes <= 5000` na create i update (per-exercise notes clampowane w kodzie — rules nie iterują po tablicach). (5) chat_messages: `create: if false` — ODSTĘPSTWO od planu (plan chciał hasOnly): feature AI Chat usunięty w v6.7.0, klient nie pisze wcale (rg: zero użyć), jedyny writer to admin SDK w Functions, który omija rules; zamknięcie jest prostsze i mocniejsze. Testy rules: 63/63, w tym obowiązkowy przypadek "konto bez pola status zapisuje workout" (lekcja ef8b8d5), workout z lastWriteId ALLOWED, nadmiarowe pole DENIED, config/secret_settings DENIED.

**Release train (Z19 + finalny).** Web: gh-pages ec42f2c (komplet Faz 1-6; wcześniej 1581b59 z Fazami 1-4). Functions: deploy 2x (Fazy 1-4 rano, Z28 po południu). Rules: deploy z client_errors + schematem workouts. iOS: build 47 (Fazy 1-4) na TestFlight z Beta App Review APPROVED (Robert dostaje builda), build 48 (komplet z telemetrią) wysłany tuż po. Pułapki infrastrukturalne rozwiązane po drodze: Xcode 26.6 bez platform iOS 26.5/watchOS 26.5 (fix: `xcodebuild -downloadPlatform iOS` i `watchOS`, ~12.5 GB), skrypty release nie ładują `.env` (fix: `set -a && source .env` przed `release-ios.sh`), JDK21 dla emulatorów w `/opt/homebrew/opt/openjdk@21`.

### 2026-07-03 — FAZA 5 planu naprawy: telemetria błędów + E2E konfliktów (Z25-Z26)

Weryfikacja checkpointu: vitest 458/458 (55 plików), typecheck 0, lint 0, test:rules 54/54 (8 nowych dla client_errors), e2e:emulator 11/11 (4 nowe).

**Z25 — telemetria błędów produkcyjnych (wariant A: własna kolekcja, bez zewnętrznego serwisu).** Root cause (audyt 3.6): zero telemetrii błędów, każda iteracja napraw opierała się na screenshotach usera. Fix: `src/lib/error-telemetry.ts` z `reportClientError(uid, {code, phase, detail, sessionId})` — addDoc do `client_errors` z polami {userId, code, phase, detail<=500, sessionHash (8 znaków SHA-256, nie surowe id), appVersion, platform, createdAt}; best-effort (nigdy nie rzuca), throttling 20 wpisów/sesję appki. Rules: create tylko własny wpis z zamkniętym schematem (keys().hasOnly), read tylko admin, update/delete zablokowane. Raportowanie podpięte w adapterach: WorkoutDay (konflikt, błąd syncu, błąd edycji, catch keepMine), SyncCenterCard (registerConflict, błąd syncu), AutoSyncOnReconnect (błędy finali). Podgląd admina: sekcja "Błędy klienta (ostatnie 50)" w AdminDashboard (onSnapshot orderBy createdAt desc limit 50).

**Z26 — E2E emulator dla konfliktów treningu.** Warunek konieczny: transakcja zapisu wyekstrahowana z hooka do `src/lib/workout-save.ts` (`saveWorkoutBatchWithRevision`, wzorzec training-plan-save.ts) — testy E2E wykonują DOKŁADNIE ten sam kod co produkcja, hook jest cienkim wrapperem błędów. 4 scenariusze w `e2e/emulator/workout-conflict.spec.ts` (wzorzec plan-conflict): (1) dwóch klientów, stale revision → WORKOUT_CONFLICT, treść zwycięzcy nietknięta; (2) lost-ack retry z tym samym writeId → alreadyApplied bez podbicia revision, lastWriteId w dokumencie; (3) edycja po finalu z expectedRevision z serwera → przechodzi (wzorzec Z13); (4) promocja provisional->remote przez silnik syncu (in-memory draft store + realny Firestore), retry nie duplikuje dokumentu (skipped, createSession wywołane raz).

### 2026-07-03 — FAZA 4 planu naprawy: jeden silnik syncu (Z23-Z24)

Weryfikacja checkpointu: vitest 454/454 (54 pliki), typecheck 0, lint 0, build OK, e2e mock 10/10 batch-save (1 test zaktualizowany do nowego kontraktu, patrz niżej).

**Z23 — workout-sync-engine.** Root cause (audyt 3.2-3.3): trzy równoległe egzekutory syncu (WorkoutDay, SyncCenterCard, AutoSyncOnReconnect) z mutexami per komponent, sekwencja finalna skopiowana 3 razy, AutoSync synchronizował treść z KOPII w kolejce zamiast z draftu — rozjazd kopii = wzajemne podbijanie revision. Fix: `src/lib/workout-sync-engine.ts` z `syncWorkoutSession(userId, sessionId, kind, deps)`: cała sekwencja promote -> alreadyFinalized -> save -> validate -> cleanup w jednym module; blokada in-flight per `${userId}::${sessionId}` (równoległe wywołanie tego samego rodzaju dostaje TĘ SAMĄ obietnicę; `final` żądany w trakcie checkpointu dołącza PO nim, żeby nie został połknięty); treść ZAWSZE z draftu IDB; baseline z serwera gdy brak (Z22); writeId per treść (Z21). Trzej konsumenci to cienkie adaptery UI. Kolejka (`workout-sync-queue.ts`) jest REFERENCYJNA: wpis = sessionId + metadane retry/UI, zero treści; stare wpisy z treścią migrowane przy odczycie (treść ignorowana). Konsekwencja kontraktu: wpis kolejki bez draftu w IDB to martwa referencja i jest sprzątany przez silnik (test e2e sync center zaktualizowany: sesja z kolejki musi mieć draft w IDB). Testy silnika na wstrzykiwanych fake'ach: pojedynczy zapis przy równoległych wywołaniach, alreadyFinalized bez zapisu, propagacja konfliktu, markSynced z revision wyniku, sprzątanie martwej referencji, baseline z serwera, final wymuszony kind=final.

**Z24 — boczne ścieżki zapisu.** (1) Usunięte martwe writery omijające revision: `updateExerciseProgress`, `completeWorkout`, `updateWorkoutNotes`, `updateSkippedExercises` (potwierdzone rg: zero użyć poza definicją i return hooka). (2) `backfillHistoricalWorkouts`: updateDoc podbija `revision: increment(1)` + `updatedAt` (inwariant "każdy zapis podbija revision"). (3) Naprawa cyklu w tle: `.catch` z console.error + po sukcesie świeży baseline draftu przez `setCloudBaseline` także gdy sesja czeka w kolejce. (4) Timer sesji używa `activeDraft.startedAt` tylko gdy `activeDraft.sessionId === sessionId`. (5) `resolveConflictKeepMine`: try/catch, przy błędzie dialog zostaje otwarty i user widzi zmapowany komunikat.

### 2026-07-03 — FAZA 3 planu naprawy: idempotencja zapisu (Z21-Z22)

Weryfikacja checkpointu: vitest 445/445 (53 pliki), typecheck 0, lint czysty, build OK. Scenariusz utraty sieci w trakcie checkpointu pokryty testem E2E emulatora w Z26 (lost-ack retry) + test terenowy usera.

**Z21 — idempotentny zapis przez writeId.** Root cause (S3 mechanizm A): transakcja checkpointu nieidempotentna; lost-ack (suspend przy gaszeniu ekranu, słaby zasięg) = commit doszedł, odpowiedź zginęła, retry rzucał WORKOUT_CONFLICT z samym sobą. Fix: `resolveWriteAttempt(current, expectedRevision, writeId)` w `workout-write-attempt.ts`; dokument dostaje `lastWriteId`; retry z tym samym writeId przy niezgodnej rewizji = sukces no-op ('already-applied', zwraca aktualne updatedAt/revision bez update). `writeId` WYMAGANE w options batchSaveWorkout; 5 call site'ów wpiętych (typecheck wymusił). ISTOTNE ODSTĘPSTWO OD PLANU: obok `pendingWriteId` w drafcie persystowane też `pendingWriteVersion` — reuse writeId dozwolony TYLKO gdy wersja draftu się zgadza. Bez tego retry z NOWĄ treścią i starym writeId dawałby fałszywy "already-applied" i utratę nowej treści (checkpoint markowałby dirty=false bez zapisu treści v2 do chmury). Helper `draftWriteId(draft)` egzekwuje tę regułę we wszystkich konsumentach.

**Z22 — baseline nigdy ze stale cache.** Root cause (audyt 3.5): onSnapshot nie odróżniał snapshotu z persistentLocalCache od serwera; po zimnym starcie stale rewizja seedowała `cloudMetaRef`/draft → fałszywy konflikt. Fix: `WorkoutReadSnapshot.workoutsFromCache` (z `snapshot.metadata.fromCache`, konserwatywnie true przed pierwszym snapshotem); seed `cloudMetaRef` w hydracji WorkoutDay tylko przy `workoutsFromCache === false`; draft bez `cloudRevision` (sessionOrigin remote) dostaje baseline z `getWorkoutSessionFromServer` przed checkpointem, utrwalany nowym `workoutDraftDb.setCloudBaseline` (fakt serwera bez ruszania dirty/wersji/treści).

### 2026-07-03 — FAZA 1 planu naprawy (docs/PLAN-NAPRAWY-2026-07-03.md): hotfixy P0 zapisu treningów (Z13-Z18)

Wykonanie metodą TDD (failing test → fix), osobny commit per zadanie. Kolejność Z14 przed Z13 (Z13 używa `workoutSyncErrorMessageKey` z Z14). Weryfikacja checkpointu: vitest 437/437 (51 plików), typecheck 0 błędów, lint czysty, build OK, e2e mock 116/116, e2e emulator PASS (JDK21 z homebrew: `/opt/homebrew/opt/openjdk@21`).

**Z14 — komunikaty błędów syncu przez taksonomię i18n.** Root cause: `setSaveError(result.error)` wstawiał surowe kody ('WORKOUT_CONFLICT', angielskie komunikaty Firestore) do bannera. Fix: `workoutSyncErrorMessageKey(error)` w `workout-sync-conflict.ts` mapuje przez `classifyWorkoutSyncError` na klucze i18n (typ zwrotu zawężony do unii kluczy, bo `t()` wymaga literalnych); 4 nowe klucze w pl.ts i en.ts (conflict/permission/notFound/validation); podpięte w WorkoutDay (linie ~580, ~651). Surowy kod błędu nadal wraca do wywołujących, mapowanie tylko na granicy UI.

**Z13 — edycja treningu z expectedRevision z serwera.** Root cause (S1/S2, deterministyczny): `handleFinishEditing` wołał `batchSaveWorkout` bez `expectedRevision`; `hasWorkoutWriteConflict` traktuje `undefined` jak 0, więc KAŻDA edycja treningu z revision >= 1 rzucała WORKOUT_CONFLICT. Fix: `expectedRevision` jest teraz WYMAGANE w options `batchSaveWorkout` (null = świadome pominięcie, tylko migracje); typecheck wskazał dokładnie 1 call site bez pola (handleFinishEditing) — naprawiony odczytem baseline z serwera (`getWorkoutSessionFromServer`) w momencie zapisu + aktualizacja `cloudMetaRef` po sukcesie. Test strażnik: `hasWorkoutWriteConflict({revision:1}, undefined) === true`.

**Z15 — fallback localStorage przenosi cloudRevision/cloudUpdatedAt/version.** Root cause (S3 mechanizm B): `withFallbackLoad`/`withFallbackSave` odbudowywały draft bez znaczników chmury i z `version: 1`, więc awaryjna ścieżka sama produkowała fałszywe konflikty. Fix: `WorkoutDraft` (format legacy) dostał opcjonalne pola, roundtrip przez fallback je zachowuje. Test: zapis/odczyt przy niedostępnym IDB zachowuje cloudRevision=5, cloudUpdatedAt, version=7.

**Z16 — sprzątanie kopii fallback + bezpiecznik migracji + prefill to nie treść.** Root cause (S4): (1) `clearActiveDraft` przy działającym IDB nie czyścił kopii `fittracker_workout_draft:<uid>` — stara kopia wskrzeszała się przy pierwszym błędzie odczytu IDB; (2) `migrateFromLocalStorage` wskrzeszał dowolnie stary legacy draft; (3) `hasDraftContent` uznawał prefilowane `weight>0` za realną treść, więc porzucony start wisiał jako "niezapisane zmiany" na zawsze. Fix: `clearFallbackCopyIfMatches` po delete w runWrite; bezpiecznik 48h w migracji (starszy draft = usunięcie klucza); treść draftu = odhaczona seria LUB notatka LUB skip (istniejący test migracji dostał świeży savedAt, bo 123 ms epoki podpadał pod bezpiecznik).

**Z17 — znaczniki syncu na bieżącym drafcie.** Root cause (S5, cichy zjadacz serii): po udanym checkpoincie WorkoutDay odbudowywał `activeDraftRef.current` ze STALE snapshotu sprzed syncu; cofnięta wersja powodowała ciche odrzucanie zapisów przez `latestWriteVersions`, a `dirty=false` wyłączał kolejne checkpointy. Fix: czysta funkcja `applySyncMarkers` (`workout-sync-markers.ts`, lustrzana semantyka `markDraftSynced`): znaczniki chmury zawsze, `dirty` czyszczone tylko gdy `base.version === syncedVersion`; baza = bieżący `activeDraftRef.current`.

**Z18 — skipped nie jest błędem.** Root cause: `syncDraftToFirebase` zwraca `{success:false, skipped:true}` przy zajętym mutexie, a `handleCompleteWorkout`/`handleRetrySync` pokazywały toast błędu i ustawiały finalSyncPending. Fix: wcześniejszy return dla `skipped` (bez toastu, bez kolejki).

### 2026-06-29 — Realizacja planu naprawy po audycie (docs/AUDYT-FIX-PLAN-2026-06-29.md)

Wykonanie zadań Z1-Z12 metodą TDD (test odtwarzający → minimalny surgical fix), osobny commit per zadanie. Bez push/deploy/iOS/functions deploy (czeka na zgodę usera). Poniżej per zadanie.

**Z12 — Bramka preflight build number + aktualizacja CLAUDE.md (#10, P2).** `release-ios-preflight.mjs` walidował tylko `MARKETING_VERSION`/Info.plist/package, ale NIE `CURRENT_PROJECT_VERSION` (6 wystąpień w `project.pbxproj`); CLAUDE.md mówił błędnie „4 wystąpienia". Ręczny bump łatwo rozjeżdża część targetów, co Apple odrzuca dopiero po uploadzie. Fix: czyste helpery `extractBuildNumbers`/`findBuildNumberMismatch` w `scripts/release-ios-preflight-checks.mjs` (testowalne bez side-effectów), wpięte do preflightu — rzuca, gdy build numbery nieobecne lub niespójne. CLAUDE.md poprawione „4 wystąpienia" → „6 wystąpień, wszystkie równe; pilnuje tego release-ios-preflight.mjs". Test `release-ios-preflight.test.ts` (spójne→ok, rozjazd→fail, brak→fail, ekstrakcja wszystkich wystąpień). Weryfikacja: `node scripts/release-ios-preflight.mjs` przechodzi na realnym pbxproj (6×46); vitest 428 (50 plików), typecheck/lint OK.

**Z11 — ai-coach: resolver zamiast surowego id (#11, P2) — ODŁOŻONE świadomie.** `ai-coach.ts` buduje mapę nazw plan-first (`exerciseNames.get(ex.exerciseId) || ex.name || ex.exerciseId`, linie ~103/~466), pomijając cykle/defaultPlan. Powód odłożenia: `prepareCoachData` i `generateWorkoutSummary` są eksportowane, ale NIGDZIE nieimportowane (coach niewpięty — martwy kod). Istniejący fallback `|| ex.name` (snapshot z treningu, dodany w fixie Zastój/PR 2026-06-29) chroni realne dane przed surowym id; ryzyko jest latentne. Refactor sygnatur martwych funkcji pod `resolveExerciseName` (wymaga przekazania `cycles`) to praca spekulatywna na nieużywanym kodzie (Karpathy: nie ruszać martwego kodu). Dodano noty TODO przy obu funkcjach: przy wpięciu coacha przekazać `cycles` + użyć `resolveExerciseName` (snapshot-first) jak Analytics/Achievements. Zmiana w tym zadaniu: tylko komentarze TODO (bez zachowania). typecheck/lint OK.

**Z10 — IntervalTimer nie background-safe (#8, P2) — ODŁOŻONE świadomie.** `IntervalTimer.tsx:49-70` używa tylko `setInterval(1000)` (brak local notification jak w `RestTimer`+`rest-notification.ts`), więc EMOM/AMRAP po zgaszeniu ekranu nie odpali sygnału rund/finiszu. Powód odłożenia: flaga `VITE_FEATURE_WORKOUT_TIMERS=false` w prod → IntervalTimer w ogóle się nie montuje (ExerciseCard: `FEATURE_FLAGS.workoutTimers ? resolveExerciseInterval : null`); to dług latentny, nie aktywny bug. Poprawność fixu = systemowe powiadomienie dostarczone przy wstrzymanym JS (zgaszony ekran) — weryfikowalna WYŁĄCZNIE na realnym urządzeniu z włączoną flagą, co jest poza zakresem tego loop. Unit test sprawdzałby tylko, że wołamy mock Capacitora (anty-wzorzec TDD „testing the mock"); istniejący analog `rest-notification.ts` też nie ma unit testu z tego powodu. Plan działania przy włączaniu timerów: `schedule` local notification na koniec bloku (+ ewentualnie granice rund EMOM) wzorem `scheduleRestEndNotification`, z anulowaniem przy pauzie/reset/close/finiszu w foregroundzie.

**Z9 — Twardy throw przy 2 aktywnych cyklach (#7, P2).** `workout-start.ts:55` rzucał `MULTIPLE_ACTIVE_CYCLES`, łapane generycznym catch w `WorkoutDay.tsx:1251` → toast błędu, brak recovery, start zablokowany. Prod: nie występuje (każdy user 1 aktywny) — defensywa danych. Root cause: anomalia danych traktowana jako błąd krytyczny zamiast degradacji. Fix: zamiast throw deterministyczny wybór najnowszego aktywnego cyklu (`createdAt` malejąco, tie-break `id`) z `console.warn`; start kontynuuje. Catch generyczny zostaje (inne błędy). Test `workout-start.test.ts` (2 aktywne cykle, obie kolejności wejścia → wybrany „newer", brak wyjątku). Weryfikacja: vitest 424, typecheck/lint OK.

**Z8 — Nieskończony spinner startu treningu przy pustym uid (#6, P2).** Gate `startSourcesReady` w `WorkoutDay.tsx:1560` wymaga 4 źródeł `isLoaded`. Trzy z nich robiły early-return bez ustawienia loaded przy `!userId`: `useTrainingPlan.ts:33`, `usePlanCycles.ts:66` oraz `workout-read-store.ts` (`getWorkoutReadSnapshot('')` → EMPTY_SNAPSHOT z `isLoaded:false`). Gdy uid chwilowo puste (odświeżanie tokena), spinner wisiał bez komunikatu ani timeoutu. Root cause: brak konwencji „puste, ale gotowe" w 3 z 4 źródeł (loader draftu `WorkoutDay.tsx:712` JUŻ ją miał: `!uid → setIsDraftLoaded(true)`). Fix (spójny z istniejącym wzorcem): `!userId → setIsLoaded(true)` w obu hookach; w read-store osobna stabilna `EMPTY_LOADED_SNAPSHOT` (isLoaded:true) zwracana dla pustego uid (stabilna referencja konieczna dla useSyncExternalStore). Test `workout-start-sources.test.ts` (mock `@/lib/firebase` bo realny init pada w jsdom): `getWorkoutReadSnapshot('')` → isLoaded true, puste dane. Hooki: zmiana to mechaniczne odwzorowanie zweryfikowanego wzorca draftu (brak harnessu renderHook+firestore w repo). Weryfikacja: vitest 423, e2e:mock 116 (jeden przebieg miał flake exercise-card-v3:62, zielony po powtórce i w pełnym ponowieniu), typecheck/lint OK.

**Z7 — Asymetria status: reguły vs callable (#2, P2).** `firestore.rules` (hasSelfAccess, :24-33) traktuje brak pola `status` jak aktywny (fix z incydentu „Missing or insufficient permissions"), ale `functions/src/security.ts hasCallableAppAccess` wymagał `status === 'active'` → konto bez `status` (Google/legacy) zapisze trening, ale AI/Strava odrzuci („Active app access required"). Bramkuje `index.ts:572,676,790`. Prod: 0 userów dotkniętych dziś (wszyscy active po backfillu) — defekt latentny. Root cause: niespójna logika dostępu między warstwą reguł a callable. Fix: `hasCallableAppAccess` zrównane z regułami — brak `profile` (dokument nie istnieje) = false; brak pola `status` (doc istnieje) = aktywny; jawnie nieaktywni (pending_verification/suspended) nadal blokowani; warunek `access.enabled !== false` zachowany. Testy zaktualizowane w `functions/src/security.test.ts` (18 zielonych) i `src/test/functions-security.test.ts` (brak status = dozwolone, undefined = blok, access.enabled:false = blok). Build functions OK.

⚠ ŚWIADOME ODWRÓCENIE wcześniejszej decyzji z 2026-06-29 („pusty profil {} ma dalej być odrzucany"). Uzasadnienie: audyt Z7 wykazał, że to ASYMETRIA — reguły już pozwalają `{}` na zapis, więc callable powinien być spójny; w przeciwnym razie legit konto bez `status` ma częściowy, mylący dostęp. Bezpieczeństwo: wymagamy istnienia dokumentu profilu (`undefined` → blok) i `access.enabled !== false`, więc niezarejestrowany/wyłączony user dalej nie wejdzie. Jeśli user nie zgadza się na poszerzenie dostępu dla pustego `{}` — rollback tego commita. Wymaga `firebase deploy --only functions` (osobna zgoda). Weryfikacja: vitest root 422, functions 18, typecheck/lint/build OK.

**Z6 — P1 KRYTYCZNE: fałszywy konflikt sync po wznowieniu z tła (#1).** Po zgaszeniu ekranu i powrocie (iOS purguje WKWebView) pojawiał się fałszywy „Trening edytowany na innym urządzeniu"; wybór „Pobierz z chmury" = utrata serii. Root cause (potwierdzony w kodzie): `markDraftSynced` (`workout-draft-db.ts:440`) zwracał draft BEZ ZMIAN, gdy `draft.version !== expectedDraftVersion` (edycja serii w trakcie syncu podbiła version). Skutek: `cloudUpdatedAt`/`cloudRevision` (fakt serwera) NIE trafiały do IndexedDB. Korekta żyła tylko w pamięci (`WorkoutDay.tsx:637-645`) i ginęła przy purge. Po resume `expectedRevision` czytane z IDB (`WorkoutDay.tsx:554` = `draft.cloudRevision`) było stale ≠ serwer → `hasWorkoutWriteConflict` true → `WORKOUT_CONFLICT` (`workout-final-sync.ts:30`, `useFirebaseWorkouts.ts:606`). Fix (surgical): w `markDraftSynced` znaczniki chmury zapisywane ZAWSZE (fakt serwera, niezależny od edycji draftu); przy niezgodnej wersji aktualizowane są WYŁĄCZNIE `cloudUpdatedAt`/`cloudRevision`, bez ruszania `dirty` i treści (lokalna edycja czeka na własny sync). Testy: jednostkowy (edycja podbija version w trakcie syncu → cloudRevision=6 i cloudUpdatedAt=777 zapisane, dirty=true, version=2, treść zachowana) + integracyjny (reload z IDB → `hasWorkoutWriteConflict(serwer rev 6, cloudRevision 6)`=false; kontrola negatywna ze stale rev 5 → true). Istniejący test „does not clear a newer local draft" nadal zielony (dirty/version zachowane). ⚠ DŁUG: wymaga ręcznego testu background/resume z edycją serii tuż przed zgaszeniem ekranu na realnym urządzeniu PRZED iOS release. Weryfikacja automatyczna: vitest 422, typecheck/lint OK.

**Z5 — Stale staty completed cyklu (#5, P2).** `usePlanCycles.archiveCurrentPlan` liczy `computeStats` jednorazowo przy archiwizacji i zapisuje do `cycle.stats`. Gdy trening dojdzie/zmieni się PO archiwizacji (np. spóźniony sync z innego urządzenia), completed cykl pokazuje przestarzałe staty — prod: MwiWFE cykl `5Hp8zu20` ma 1 trening, ale `stats.totalWorkouts=0` → po Z4 byłby ukryty. Root cause: zapisane staty completed to migawka, nie żywe źródło. Fix (simplicity-first, jedno źródło prawdy = treningi): helper `withLiveCompletedStats(cycle, workouts)` w `cycle-insights.ts` (analog `buildActiveCyclePreview`, ale zachowuje `endDate` cyklu) przelicza `stats` z treningów otagowanych `cycleId`. Użyty dla completed cykli w Dashboard (`visibleCycles`), Cycles (`visibleCycles`) i Achievements (`seasonShelf`) PRZED filtrem widoczności (Z4) i wyświetleniem — `CycleCard`/`CycleDetail`/medale dostają świeże staty. Zapisane `cycle.stats` zostają jako cache. Aktywny cykl bez zmian (osobny `buildActiveCyclePreview`). Test `cycle-insights.test.ts` (completed ze stale stats=0 + trening w slocie → live totalWorkouts=1, completionRate>0, tonaż 400, endDate zachowany). Weryfikacja: vitest 420, e2e:mock 116, typecheck/lint OK.

**Z4 — Niespójne ukrywanie pustych cykli (#4, P2).** `Dashboard.tsx:184` filtrował cykle tylko przez `isCycleVisible` (flagi `technical`/`hiddenFromInsights` nigdzie nieustawiane → zawsze true), bez warunku `totalWorkouts>0`, więc pusty completed cykl mógł trafić do `previousCompletedCycle` i porównania. `Cycles.tsx:137` i `Achievements.tsx:192` dodawały warunek osobno, każdy inaczej. Root cause: brak jednego źródła prawdy dla „cykl wart pokazania". Fix: helper `isCycleVisibleWithData(c) = isCycleVisible(c) && (c.status==='active' || c.stats.totalWorkouts>0)` w `cycle-visibility.ts`, użyty w Dashboard (184), Cycles (137) i Achievements (192). Bez nowych flag — opiera się na `stats.totalWorkouts`. (Stale staty completed → osobne zadanie Z5.) Test jednostkowy `cycle-visibility.test.ts` (pusty completed ukryty, aktywny pusty widoczny, completed z treningami widoczny, techniczny ukryty). Weryfikacja: vitest 418, e2e:mock 116, typecheck/lint OK.

**Z3 — Cleanup martwego kodu po revercie build 46 (#9, P2).** Trzy sieroty, wszystkie zweryfikowane gremem jako nieosiągalne w produkcji:
1. `enforceWorkingSetCount` — prop usunięty z wywołania `ExerciseCard` w build 46 (`938aadb`), więc zawsze `false`; martwe gałęzie w `ExerciseCard.tsx` (interfejs, destrukturyzacja, `sanitizeSets` 3. arg, blok `if (enforceWorkingSetCount...)` w useEffect, warunki przy przycisku delete/add-set) i w `exercise-utils.ts` (3. param + gałąź enforce w `sanitizeSets`). Usunięto wszystko + test `enforces exactly the planned working-set count`.
2. `src/lib/offline-queue.ts` — `.add()` wołane tylko w teście; w produkcji `offlineQueue.size()` zawsze 0. Usunięto moduł + test; w `useOnlineStatus.ts` realne źródło `pendingOps` to `queueCount + activeCount` (zachowane), zastąpiono `offlineQueue.size()` zerem (zachowanie identyczne, `Math.max(0, ...)` uproszczony).
3. `workout-draft-db.markCompletedLocally` — metoda wołana tylko w teście; pole `completedLocally` żyje przez inną ścieżkę (`WorkoutDay.tsx:1436`, czytane w `useWatchPlanPreview`/`WorkoutDay`), więc usunięto wyłącznie martwą metodę + jej test.

Zmiany czysto refaktorowe, bez zmiany zachowania (TDD-exception: refactor → testy zielone przed i po, minus testy usuniętego martwego API). Weryfikacja: typecheck/lint OK, vitest 414 (47 plików, było 422/48 — minus 6 offline-queue + 1 enforce + 1 markCompletedLocally), e2e:mock 116 passed.

**Z2 — Tonaż cyklu wliczał serie rozgrzewkowe (#3, P2).** `cycle-insights.ts:114` sumował tonaż bez filtra `!set.isWarmup`, podczas gdy `summary-utils.calculateTonnage` (:30) i obliczanie PR-ów w tym samym pliku (:132) rozgrzewki pomijają → tonaż cyklu zawyżony, niespójny. Root cause: pominięty warunek `isWarmup` przy tonażu. Fix (surgical, 1 linia): dodano `&& !set.isWarmup` w reduktorze tonażu. Test regresji w `cycle-insights.test.ts` (rozgrzewka 1000 kg + robocza 360 kg → tonaż 360, było 1360). Weryfikacja: vitest 422 zielone (+1), typecheck/lint OK.

**Z1 — e2e: 2 czerwone testy nawigacji (#12, P2).** Build 46 (`938aadb`) usunął mobilny hamburger/drawer; `sidebarOpen` w `Layout.tsx` nigdy nie jest ustawiane na `true`, więc `Sheet` (boczne menu) na mobile nie da się otworzyć. Dwa testy klikały nieistniejący `button 'Nawigacja główna'` → TimeoutError. Root cause: testy zakładały drawer usunięty w build 46. Fix (tylko `e2e/`): `nav-analytics.spec.ts` — usunięto część otwierającą boczne menu i szukającą Historii (na mobile Historia nie jest już w nawigacji), zachowano pokrycie dolnego paska (Analityka jest, Historia nie); `ui-improvements.spec.ts` — usunięto klik hamburgera + Escape, zachowano asercję braku sidebara na mobile i pętlę Tab sprawdzającą, że linki tylko-sidebarowe (history/measurements/achievements/cycles) nie łapią fokusa. Weryfikacja: `e2e:mock` 116 passed (było 2 failed), typecheck/lint/test 421 zielone.



**Serie:** podczas aktywnego treningu nie dało się dodać/usunąć serii roboczej (tylko rozgrzewkowe). Przyczyna: `enforceWorkingSetCount` (regresja z hardeningu `880cb9e`) wymuszał liczbę serii z planu, ukrywając przyciski +/× (`ExerciseCard` linie 451, 597). Fix: usunięto prop `enforceWorkingSetCount` z wywołania `ExerciseCard` w `WorkoutDay.tsx` (default false) → pełna swoboda jak przed hardeningiem. Reszta logiki (`sanitizeSets`) działa w trybie niewymuszonym.

**Hamburger:** przycisk menu (top-left, `AppHeader`) otwierał mobilny boczny Sheet, który nie działał na iOS (WKWebView). Usunięty: `AppHeader` bez `Menu`/`onMenuClick`, `Layout` nie przekazuje `onMenuClick`. Nawigacja mobilna w całości na dolnym pasku (`AppNavigation` bottom-nav, niezależny). Desktopowy sidebar bez zmian.

Obie to regresje z pakietu hardeningu, nie z builda 44. 421 testów, typecheck, lint, build zielone.

### 2026-06-29 — Zastój/PR pokazywały surowe exerciseId (ex-1-2) zamiast nazw legacy ćwiczeń

**Objaw:** sekcja "Zastój" na Osiągnięciach pokazywała `ex-1-2`, `ex-2-3` zamiast nazw (część ćwiczeń, np. "Uginanie nóg", rozwiązywała się poprawnie).

**Root cause:** mapa `exerciseNames` przekazywana do `detectPlateaus` (Achievements.tsx) jest budowana z `oneRMRecords`, które są **deduplikowane po nazwie** — gdy legacy id (`ex-1-2` = "Przysiad ze sztangą") ma tę samą nazwę co aktualny `tpl-ex-35`, dedup zostawia jeden id i wyrzuca drugi z mapy. `detectPlateaus`/`detectNewPRs` grupują po surowym exerciseId (wszystkie), więc wyrzucony legacy id → `map.get(id) ?? id` → surowe id. Dane są OK: każdy wpis treningu MA zapisane `ex.name`.

**Fix (u źródła, fallback do snapshotu, dane już istnieją):**
- `achievements-utils.ts` `detectPlateaus`: zbiera `ex.name` per id, `exerciseNames.get(exId) ?? snapshotNames.get(exId) ?? exId`.
- `pr-utils.ts` `detectNewPRs`: `... || ex.name || ex.exerciseId`.
- `ai-coach.ts` (kontekst dla AI): `... || ex.name || ex.exerciseId` (AI widziało surowe id).
- Test regresji w `achievements-utils.test.ts` (legacy id + pusta mapa → nazwa ze snapshotu).

**Audyt innych miejsc:** `cycle-insights.ts` już miał fallback do snapshotu; `AnalyticsChartsTab`, Rekordy w Achievements i ExerciseProgression używają `resolver.resolveExerciseName` (snapshot-first) — OK.

421 testów, typecheck, lint zielone. Fix kliencki: web zdeployowany; iOS wymaga builda 45.

### 2026-06-29 — "Missing or insufficient permissions" przy starcie treningu: reguły wymagały status=='active', którego nie mają konta Google

**Objaw:** user nie mógł rozpocząć/zapisać treningu — czerwony błąd "Missing or insufficient permissions". Strona renderowała się (odczyty działały), padał dopiero zapis.

**Root cause (systematic-debugging, potwierdzony na danych prod read-only):** hardening reguł (`880cb9e`, `1aede0f`) dodał `hasSelfAccess`, które do KAŻDEGO zapisu (create/update workouts, plan_cycles, measurements, telemetry) wymaga `users/{uid}.status == 'active'`. Reguły read mają bypass `isAdmin()`, ale write NIE — dlatego odczyty działały, a zapisy padały. Konta z logowania Google (i sprzed flow rejestracji) NIGDY nie dostały pola `status` — gałąź logowania w `registration.ts` aktualizuje `lastLoginAt`, ale nie ustawia `status`. Skala: 2 z 5 userów bez `status` (g.jasionowicz/admin + realna userka joannawojtun32). Dla nie-admina blokowane były nawet odczyty.

**Dlaczego test:rules tego nie złapał:** harness `seedUser` ZAWSZE ustawiał `status` — przypadek dokumentu BEZ pola `status` nie był pokryty.

**Fix (pełny):**
1. Reguła `hasSelfAccess` backward-compat: brak pola `status` = traktuj jak aktywny; jawnie nieaktywni (`pending_verification`, `suspended`) nadal blokowani. Plik `firestore.rules`. Wdrożone na prod (`firebase deploy --only firestore:rules`).
2. Regresja w `scripts/test-firestore-rules.mjs`: dokument users bez `status` → zapis dozwolony (red→green; 46/46 testów reguł przechodzi). `pending_verification` nadal blokowany.
3. Backfill `status:'active'` + `access:{enabled:true}` na 2 kontach (admin SDK, merge, idempotentnie) — naprawia też dostęp do Cloud Functions callable (`hasCallableAppAccess` wymaga status=='active'). Zweryfikowane.

**Źródło dla nowych kont jest OK:** `registerUser` (registration.ts:350-351) ustawia `status`/`access` dla nowych userów. Incydent dotyczył wyłącznie kont legacy. Świadomie NIE ruszano `hasCallableAppAccess` (pusty profil `{}` ma dalej być odrzucany — istniejąca intencja bezpieczeństwa; wszystkie obecne konta mają już status po backfillu).

**To NIE był błąd kodu builda 44** (stabilizacja treningów) — czysto warstwa reguł + dane legacy.

### 2026-06-27 — Stabilizacja treningów: wyścig startu, konflikt Sync Center, odporne statystyki, naprawa danych (build 44 / 6.13.0)

**Objaw:** banner „Ustabilizuj realizację planu" + frekwencja 9/16 (56%) i 7 „opuszczonych",
mimo że właściciel zrobił 16 treningów. Pełna analiza: `docs/ANALIZA_I_PLAN_STABILIZACJI_TRENINGOW_2026-06-27.md`.

**Root cause (2 defekty danych + 4 defekty kodu):**
1. 6 ukończonych sesji (16–26.06) bez `cycleId` → statystyki cyklu ich nie liczyły.
2. Sesja 19.06 miała 13 zaliczonych serii, ale `completed=false` (utknęła między draftem a chmurą).
3. Wyścig startu: `WorkoutDay` autostartował po `isLoaded` listy treningów, nie czekając na plan + cykle + draft → sesje bez `cycleId` i mieszanie ćwiczeń planu domyślnego z właściwym.
4. Sync Center nie rozróżniał typów błędów ani nie oferował rozwiązania konfliktu rewizji.
5. Statystyki liczyły `treningi/oczekiwane` zamiast slotów kalendarza; brak `cycleId` zamieniał obecność w nieobecność; pusty techniczny cykl trafiał na półkę medali (fałszywy „Sezon 0%").
6. Telemetria pisała liczniki jako literalne klucze `counters.x` zamiast mapy `counters`.

**Zrobione (kod):**
- Faza 2: `src/lib/workout-start.ts` (gate `areWorkoutStartSourcesReady` na workouts+plan+cykle+draft, `buildWorkoutStartSnapshot`, `findUniqueCycleForDate`). Autostart i przycisk startu zablokowane do załadowania wszystkich źródeł; bezpieczny backfill `cycleId` przez transakcję `createWorkoutSession` tylko gdy dokładnie jeden cykl pasuje do daty.
- Faza 3: `src/lib/workout-sync-conflict.ts` (`classifyWorkoutSyncError`, `summarizeLocalDraft/Cloud`); SyncCenterCard pokazuje konflikt z porównaniem (ćwiczenia/serie), nie ponawia konfliktu automatycznie; AutoSyncOnReconnect pomija konflikty rewizji.
- Faza 4: `cycle-insights.ts` liczy frekwencję wg slotów kalendarza, dedup duplikatów, cap 100%, `orphanWorkoutCount`; przy orphanie/pending-final pokazuje neutralne „Statystyki wymagają synchronizacji" zamiast coachingu. `cycle-visibility.ts` (`isCycleVisible`) ukrywa cykle `technical`/`hiddenFromInsights` w Dashboard/Cycles/Achievements/usePlanCycles.
- Faza 5: telemetria zapisuje prawdziwą mapę `counters`; nowe metryki `revision_conflict`, `orphan_workout`, `mixed_plan_exercise_set`. Narzędzie `scripts/audit-repair-training-data.mjs` (backup → preview → apply --confirm → verify, backup z SHA256 przed zapisem).
- Feature flag `VITE_FEATURE_WORKOUT_TIMERS=false` (`src/lib/feature-flags.ts`): timery odpoczynku/EMOM/AMRAP/rozgrzewki + ich UI i timer na Watch wyłączone domyślnie; pomiar czasu sesji zostaje.

**Zrobione (dane produkcyjne, konto `g.jasionowicz@gmail.com`, uid U6GDdfg7...):**
- Faza 0: 3 backupy z SHA256 w `private-backups/` (gitignored).
- Faza 1 (zweryfikowane porównaniem snapshotów przed/po): 6 sesji dostało `cycleId=otL65epGl1lQ9eyKIZrO`; ćwiczenia oczyszczone do 5/7/6/5/7 (usunięte puste obce wpisy); 19.06 `completed=true`; techniczny cykl `lkjSbPbc3suvlhEBtFYK` oznaczony `technical=true, hiddenFromInsights=true`.

**Weryfikacja:** `typecheck`, `lint`, `test` (48 plików / 420 testów), `build` web + mobile — wszystkie zielone. Preflight wersji: 6.13.0 / build 44 spójne (Info.plist + 6× MARKETING_VERSION + CURRENT_PROJECT_VERSION).

**Zostaje (Faza 6, ręczne):** test na fizycznym iPhonie (zgaszony ekran, resume, finalizacja, słaby zasięg) i Watch; te bramki realizuje TestFlight. Pełny scenariusz Sync Center (reload bez nawrotu draftu) do potwierdzenia na urządzeniu. `test:rules`/`e2e:emulator` nieuruchomione w tej sesji (reguły Firestore niezmienione).

### 2026-06-18/24 — Pusty paywall IAP: root cause = brak App Review pierwszej subskrypcji (WSTRZYMANE, czeka na usera)

**Objaw:** natywny paywall iOS nie ładuje pakietów (`getOfferings()` → `code=23`, puste pakiety).

**Root cause (systematic-debugging, dowód warstwa po warstwie):** to NIE bug w kodzie ani błąd
konfiguracji. Wszystkie warstwy zielone (klucz w buildzie, kod, RC offering+produkty, ASC
READY_TO_SUBMIT+ceny+lokalizacje, Paid Apps Agreement Active, bundle). Jedyna przyczyna: app w
`PREPARE_FOR_SUBMISSION`, **pierwsza subskrypcja nigdy nie przeszła App Review** — StoreKit nie
serwuje produktów first-time app w sandbox/TestFlight, dopóki IAP nie pójdzie do review z buildem.
Potwierdzone na urządzeniu (build 40 z diagnostyką na ekranie): `cfg=true THROW code=23 ... no App
Store products registered ... for your offerings`. RC backend (odpytany kluczem z builda) zwraca
poprawne identyfikatory — porażka jest na poziomie StoreKit fetch.

**Decyzja:** jedyna droga = wysłać apkę 1.0 z subskrypcjami do App Review (i tak konieczne do sprzedaży).

**Zrobione:** build 40 (diagnostyka, potwierdził root cause) → build 41 (czysty, VALID na TestFlight);
cena Free; kategoria Health & Fitness; privacy/support URL; konto demo Auth (`applereview@strengthsave.app`).

**Blokery (czeka na usera):** service account Firebase (grzegorzee bez GCP IAM na fittracker →
brak Firestore admin write do nadania PRO comp koncie demo); dane kontaktowe recenzenta; akceptacja copy.

**Pełny status + checklist + dane referencyjne:** `docs/APP-REVIEW-IAP-STATUS.md`.

### 2026-06-18 — Naprawa 3 bugów z treningu na siłowni (audyt + TDD wg Karpathy)

**Kontekst:** User zgłosił 3 bugi po realnym treningu (5G, ekran zgaszony). Audyt root cause (3 równoległych agentów Explore) → potwierdzenie w kodzie → fix każdego przez TDD (test odtwarzający RED → fix GREEN), izolowane commity (1 bug = 1 zmiana).

**Bug 1 — miks ćwiczeń z dwóch dni planu w podsumowaniu (część 0/4 serii, część zrobiona).**
Root cause: `findWorkoutForRoute` z `allowDateFallback` wracał do treningu INNEGO dnia planu z tej samej daty (fallback ignoruje `dayId`). Przy starcie dzisiejszego treningu dnia A, gdy istniał ukończony trening dnia B z tej samej daty, init wczytywał ćwiczenia B do `exerciseSets` (`WorkoutDay.tsx:785`), user dorabiał A, a zapis `Object.entries(exerciseSets)` (`:1356`) utrwalał miks obu dni pod jedną sesją.
Fix: nowa opcja `today` w `findWorkoutForRoute` — cross-day fallback działa tylko dla dat PRZESZŁYCH (oglądanie historii po zmianie planu, chronione testem `:16-32`). Dla dzisiejszej daty fallback zablokowany → nowy trening startuje czysto z `baseDay`. Podłączone w widoku (`:189`) i init (`:701`).
Weryfikacja: 3 nowe testy w `workout-lookup.test.ts` (blokada cross-day dziś, fallback historii w przeszłości, własny dzień dziś).

**Bug 2 — layout „rozjeżdża się" w bok przy zamianie ćwiczenia.**
Root cause: nazwy ćwiczeń w nagłówku dialogu zamiany (`WorkoutDay.tsx:1897`) i w pozycjach listy biblioteki (`:1924`) były we flex-kontenerze bez `min-w-0`/`truncate`. Flex-item z długim tekstem ma `min-width:auto`, więc rozpychał kontener szerzej niż ekran → poziomy scroll całej strony.
Fix: `min-w-0` + `truncate` na tekstach, `shrink-0` na przycisku Zamknij.
Weryfikacja: build + scenariusz manualny (CSS layout poza zasięgiem unit-testu).

**Bug 3 — pusta kolumna POPRZ. mimo istniejącej historii.**
Root cause: `getPreviousHint` (`ExerciseCard.tsx`) indeksował `previousSets[globalIndex]`, gdzie `globalIndex` liczył rozgrzewki+robocze bieżącej sesji, a `previousSets` to surowa tablica historii. Różna liczba rozgrzewek między sesjami rozjeżdżała indeksy → `'—'`.
Fix: nowa czysta funkcja `previousWorkingSet()` (`exercise-utils.ts`) filtruje rozgrzewki po obu stronach i indeksuje po kolejności serii roboczych (spójnie z `createPrefilledSets`). `renderSetRow` przekazuje working index.
Weryfikacja: 4 testy w `exercise-utils.test.ts`.

**Uwaga o danych:** Fix bug 1 zatrzymuje tworzenie NOWYCH miksów. Treningi już zapisane z miksem (jeśli istnieją w Firestore) pozostaną — to osobna naprawa danych, nie dotykano konta usera (dane święte). Build/resume na urządzeniu do potwierdzenia bug 2.

**Stan:** 376/376 testów zielone, typecheck + lint + build OK. 3 izolowane commity na `main`.

### 2026-06-11 — Rebrand ikony aplikacji: limonkowy hantel 3D

**Co:** Nowa ikona (3D hantel na limonkowym tle #DDF70D, wygenerowana w ChatGPT) wdrożona wszędzie: iOS AppIcon + watch icon (1024px, rogi zalane limonką, bez kanału alpha — wymóg App Store), splash screen (ikona na tle #0e0e0e, 9 wariantów — zastąpiła stare logo tarczy), PWA (pwa-192/512), favicon.png 96px + favicon.svg (embedded PNG), logo w sidebarze (AppNavigation) i na ekranie logowania (zamiast badge "SS" i lucide Dumbbell), tytuł logowania w font-heading (Space Grotesk).

**Dlaczego:** Wyróżnialność w App Store (kategoria fitness = morze ciemnych ikon, solid lime się wybija) + spójność z motywem neon lime apki. Wybrano wariant solid (bez gradientu/tekstury) — najlepsza czytelność przy 60px, zgodnie z Apple HIG.

**Technika:** ImageMagick — maska roundrectangle (promień 186/1254 jak w wypieczonych rogach źródła), wersja kwadratowa (rogi zalane #DDF70D) dla iOS/PWA i wersja z przezroczystymi rogami dla favicon/UI. theme-color #0a0a1a → #0e0e0e (index.html + manifest PWA).

**Weryfikacja:** 350 testów zielonych, typecheck, lint, build OK, web zdeployowany (favicon.svg/png widoczne na live). Nowa ikona iOS pojawi się w TestFlight przy następnym buildzie.

### 2026-06-11 — Aplikacja Apple Watch (StrengthWatch): logowanie serii z nadgarstka

Cel: logowanie treningu bezpośrednio na zegarku, bez wyjmowania telefonu.

**Architektura (zweryfikowana E2E na sparowanych symulatorach iPhone 17 + Watch Ultra 3):**
- Target watchOS `StrengthWatch` (SwiftUI, watchOS 10+, single-target watch app) osadzony w apce iOS. Źródła: `ios/App/WatchApp/`. Target dodawany skryptem `scripts/add_watch_target.rb` (gem xcodeproj, idempotentny).
- Transport: WatchConnectivity. Telefon → zegarek: `updateApplicationContext` (JSON pod kluczem `workout`). Zegarek → telefon: `sendMessage` z fallbackiem `transferUserInfo` (kolejkowane, działa gdy apka telefonu uśpiona).
- Most do warstwy web: lokalny plugin Capacitora `WatchBridge` (`ios/App/App/WatchBridge/`), rejestrowany przez `BridgeViewController` (subclass `CAPBridgeViewController`, podpięty w Main.storyboard). Eventy z zegarka trafiają do trwałej kolejki w UserDefaults (max 500) i są odbierane przez JS listenerem `watchEvent` + `drainEvents()` przy starcie/foregroundzie — nic nie ginie, gdy webview nie żyje.
- Web: `src/lib/watch-bridge.ts` (protokół + API pluginu), `src/hooks/useWatchWorkoutSync.ts` (wysyłka stanu z debounce 800 ms, dedup eventów po `at`), wpięty w `WorkoutDay.tsx`. Serie z zegarka przechodzą przez `handleSetsChange` → draft IndexedDB → istniejący sync do Firestore (zero nowych ścieżek zapisu).
- Zasada MVP: trening trzeba WYSTARTOWAĆ na telefonie (draft + sessionId), zegarek służy do logowania serii. Eventy dla nieaktywnej sesji czekają w natywnej kolejce.
- Zegarek trzyma payload w UserDefaults (działa offline); merge przychodzącego kontekstu zachowuje lokalnie zaliczone serie.
- UI zegarka: lista ćwiczeń (postęp x/y) → serie → edytor (steppery powt./ciężar ±2,5 kg, prefill z poprzedniej zaliczonej serii) → „Zalicz serię" (haptyka). Teksty PL.
- Build: `CURRENT_PROJECT_VERSION = 28` (build 27 wydała równoległa sesja grywalizacji z czystego worktree). Ikona watch = ikona iOS 1024.
- Koordynacja: w repo pracowała równolegle sesja grywalizacji — commit watch zrobiony jawnymi ścieżkami (bez `git add -A`); klucze i18n watch weszły przypadkiem z commitem 901eb27 (nieszkodliwe).
- Dowody E2E: `audit/shots/watch/` (10-watch-context, 13-watch-after-log, 14-phone-after-watch-log — toast „Set from watch" + seria zaliczona na telefonie).
- Wdrożone: web (GH Pages) + **TestFlight build 28** (upload OK, Beta App Review APPROVED od razu). Signing zegarka: `scripts/watch_signing.py` (bundle ID `...watchkitapp` zarejestrowany, profil „Strength Save Watch App Store" na istniejącym cercie Distribution, mapowanie dopisane do ExportOptions-manual.plist — plik poza repo).

### 2026-06-11 (cz. 2) — Start treningu z zegarka + podgląd planu (build 29)

- Zegarek pokazuje plan dnia PRZED startem sesji (Dashboard → `useWatchPlanPreview`, payload `active:false`, prefill jak w WorkoutDay) i ma przycisk „Rozpocznij trening".
- Event `startWorkout` → globalny `WatchEventRouter` (App.tsx) nawiguje do WorkoutDay z `autostart=true`; sesja powstaje istniejącą ścieżką. Plugin dostał `peekEvents` (podgląd kolejki bez kasowania — eventy serii konsumuje wyłącznie WorkoutDay).
- Zaliczenie serii na zegarku w trybie podglądu = niejawny start (sticky lokalny override do potwierdzenia `active:true` z telefonu).
- Aktywny draft → Dashboard wysyła stan z draftu (`active:true`) — zegarek aktualny bez otwierania WorkoutDay (zweryfikowane na symulatorze).
- 4 testy `WatchEventRouter` (nawigacja, peek, filtr daty/typu, dedup po `at`). Ścieżka preview→start nie miała pełnego E2E na symulatorze (dzisiejszy dzień miał realny draft na koncie admina — nie fałszujemy danych treningowych); pierwsza realna weryfikacja w nowy dzień treningowy.
- Wdrożone: web (GH Pages) + **TestFlight build 29** (Beta App Review APPROVED).

### 2026-06-11 (cz. 3) — Rest timer na zegarku + zakończenie treningu z nadgarstka (build 30)

- Rest timer: po zaliczeniu serii zegarek odlicza odpoczynek (czas z ustawień telefonu, klucz `rest-timer-default`, fallback 90 s, payload `restSeconds`); pasek na liście ćwiczeń i w widoku serii, tap = pomiń, haptyka na koniec; nie startuje po ostatniej serii ćwiczenia. Uwaga: haptyka końca timera wymaga działającej apki (bez extended runtime session — świadomie poza zakresem).
- Zakończenie z zegarka: confirmationDialog z liczbą zaliczonych serii → event `workoutFinished` → telefon finalizuje przez `handleCompleteWorkout` (ref, bez drugiego dialogu; guard isCompleted/isExplicitSaving). Zegarek pokazuje sticky ekran „Trening zakończony"; telefon po ukończeniu wysyła `noWorkout`.
- Zweryfikowane na symulatorze (screenshoty 19-26): timer 1:28→0:57, dialog z licznikiem „Zaliczone serie: 2", cancel. Finalizacji NIE wykonano na realnym koncie admina (nie fałszujemy danych treningowych); testowe eventy serii wyczyszczone z natywnej kolejki (plutil -remove). W drafcie dnia pozostała testowa seria 45 kg×6 (wyciskanie, seria 1) z cz. 1 — do ręcznego odznaczenia.
- Wdrożone: web (GH Pages) + **TestFlight build 30** (Beta App Review APPROVED).

### 2026-06-11 (cz. 4) — 5 bugów zgłoszonych z realnego treningu (build 32)

Feedback z porannego treningu na iPhone 14 Pro. Wszystkie 5 naprawione, commit `82e3ad7`.

- **Metryki/Notatka (ExerciseCard):** szare „linki" (`text-muted-foreground/40`) wyglądały na nieaktywne i po otwarciu sekcji znikały bez możliwości zwinięcia. Teraz: przyciski z ramką i jasnym tekstem, działają jak toggle (drugi klik zwija, dane zostają), stan aktywny podświetlony primary.
- **RestTimer — kółko START:** po końcu odliczania kółko pokazywało „START!" (text-2xl, nie mieściło się) i nie było klikalne. Teraz kółko = przycisk: po końcu klik restartuje przerwę, w trakcie pauzuje/wznawia; tekst zmniejszony (text-base). Test: tap po finishu restartuje odliczanie.
- **Brak wibracji/dźwięku końca przerwy na iOS — ROOT CAUSE:** po zgaszeniu ekranu WKWebView wstrzymuje JS, więc `finishTimer` (haptic+beep) w ogóle nie odpalał się w tle. Fix: `@capacitor/local-notifications` — powiadomienie systemowe (dźwięk+wibracja) planowane na deadline+1s przy starcie/wznowieniu timera, anulowane przy pauzie/reset/zamknięciu i przy końcu w foregroundzie (wtedy gra in-app sygnał, +1s bufora eliminuje podwójny dźwięk). Nowy moduł `src/lib/rest-notification.ts`, permission lazy przy pierwszym timerze.
- **„Nie udało się zapisać szkicu lokalnie":** IndexedDB w WKWebView potrafi stracić połączenie po powrocie z tła. `saveActiveDraft`: retry (świeże połączenie) → fallback `localStorage` → błąd tylko gdy oba padną. Komunikat akcjonowalny (nie zamykaj apki, zakończ trening), banner zamykalny (X).
- **Scroll do góry po odblokowaniu telefonu:** dwa defekty starego mechanizmu: (1) klucz `workout-scroll:${sessionId}` pękał po promocji provisional→remote (sessionId się zmienia), (2) pojedynczy `scrollTo` po 250 ms clampował do 0, bo lista jeszcze się nie wyrenderowała. Teraz: klucz `workout-scroll:${uid}:${date}`, restore z retry (250/700/1500/2600 ms, czeka aż strona urośnie), dodatkowo restore na `visibilitychange→visible` gdy iOS wyzeruje scroll bez remountu (warunek: scrollY<100, zapis y>200, świeży <15 min).
- Weryfikacja: 350/350 testów, typecheck+lint czyste. Wdrożone: web (GH Pages) + **TestFlight build 32** (Beta App Review APPROVED).
- **Proces na przyszłość (Karpathy):** bugi typu „timer nie gra przy zgaszonym ekranie" i „scroll wraca na górę" wynikały z testowania wyłącznie na symulatorze/web w foregroundzie. Przy zmianach dotykających cyklu życia apki (timery, zapis, scroll) obowiązkowy scenariusz weryfikacji: zgaś ekran / zbackgrounduj apkę / wróć — na realnym urządzeniu lub z symulacją suspendu, zanim build pójdzie na TestFlight.

### 2026-06-11 (cz. 5) — Zegarek: jednostki kg/lbs + Digital Crown (w buildzie 32)

- Payload watch niesie `unit` (localStorage `unit-system`, jak UnitContext); zegarek wyświetla i steppuje w jednostce usera (krok 2,5 kg / 5 lbs), model i eventy zawsze w kg (zaokrąglenie do 2 miejsc po konwersji). Naprawia hardcoded „kg" na zegarku.
- Edytor serii: Digital Crown kręci ciężarem (`focusable` + `digitalCrownRotation`, haptyka detentów). Koronka niezweryfikowana na symulatorze (idb nie symuluje crown) — sprawdzić na realnym zegarku.
- Commit `116e831`. Build 31 (upload OK, VALID) NIE został rozdystrybuowany — w międzyczasie sesja bugfixowa wypuściła build 32 z main zawierającym te zmiany; dystrybucja 31 byłaby zbędna. Lekcja: `release-ios.sh` pollował 40×, a ASC przetwarzał dłużej; przy TIMEOUT sprawdzić `asc_api.py builds` i ewentualnie dokończyć `testflight_external.py <nr>` ręcznie.

### 2026-06-11 (cz. 6) — Zegarek: one-tap logowanie następnej serii (build 33)

- `WorkoutStore.nextSetSuggestion`: pierwsza niezaliczona seria treningu (wartości z serii albo ostatniej zaliczonej; bez sensownych wartości przycisk się nie pokazuje — zostaje edytor).
- `QuickLogButton` na liście ćwiczeń (z nazwą ćwiczenia) i w widoku ćwiczenia. Jeden tap = seria zalogowana + haptyka + rest timer. Trzy interakcje → jedna.
- Zweryfikowane na symulatorze (screenshoty 29-30): tap zalogował rozgrzewkę, timer ruszył, sugestia przeskoczyła na „Seria 2 · 6 × 50 kg" (pominęła zaliczoną serię 1).
- Testowa rozgrzewka 10×30 mogła wejść do draftu „Góra B" (live drain) — do odznaczenia razem z serią 45 kg×6 z cz. 1, jeśli draft jeszcze aktywny.
- Wdrożone: **TestFlight build 33** (Beta App Review APPROVED). Web bez zmian (iteracja czysto watchowa, bez deploya).

### 2026-06-11 (cz. 7) — Zegarek: sesja treningowa HealthKit + live tętno (build 34)

- `WorkoutSessionManager`: HKWorkoutSession (.traditionalStrengthTraining, indoor) + HKLiveWorkoutBuilder. Start gdy trening aktywny (start z zegarka / kontekst `active` z telefonu / powrót do apki), stop przy finish lub `noWorkout`. Efekt: apka żyje cały trening (haptyka rest timera przy opuszczonej ręce), trening siłowy w Apple Health (tętno, kalorie), live BPM w nagłówku listy.
- Signing: capability HEALTHKIT przez API unieważnia istniejący profil → `watch_signing.py` usuwa wszystkie profile o tej nazwie (też INVALID — blokują create konfliktem nazwy 409) i tworzy świeży. Entitlements `com.apple.developer.healthkit` + `INFOPLIST_KEY_NSHealth*UsageDescription` w add_watch_target.rb.
- NIEZWERYFIKOWANE na symulatorze: trening usera był już ukończony (zegarek poprawnie pokazał „Dziś odpoczynek"), test wymagałby sfałszowania sesji. Realna weryfikacja = pierwszy trening z zegarkiem; arkusz zgody HealthKit pojawi się raz na zegarku.
- Wdrożone: **TestFlight build 34** (Beta App Review APPROVED). Web bez zmian.

### 2026-06-11 (cz. 8) — Zegarek: komplikacja na tarczę (build 35)

- Target `StrengthWatchWidgets` (widget extension watchOS, appex w PlugIns apki zegarkowej): accessoryCircular/Corner (hantla) + accessoryInline; tap otwiera apkę. Skrypt `scripts/add_watch_widget_target.rb` (idempotentny), własny Info.plist z `NSExtensionPointIdentifier = com.apple.widgetkit-extension` (`GENERATE_INFOPLIST_FILE=NO` — kluczy NSExtension nie da się wygenerować z INFOPLIST_KEY_*).
- Signing: `watch_signing.py` zgeneralizowany (ensure_bundle_id/create_profile z parametrami) + sekcja widgets: bundle `...watchkitapp.widgets` (Z4Q5Q88AX9), profil „Strength Save Watch Widgets App Store", ExportOptions z trzema mapowaniami profili.
- Wersje appex MUSZĄ równać się wersjom apki zegarkowej (CFBundleShortVersionString/CFBundleVersion) — bump teraz dotyczy 6 wystąpień CURRENT_PROJECT_VERSION w pbxproj (App ×2, StrengthWatch ×2, Widgets ×2).
- Weryfikacja: build + appex w PlugIns + apka startuje bez crashu; dodanie komplikacji do tarczy do sprawdzenia na realnym zegarku.
- Wdrożone: **TestFlight build 35** (Beta App Review APPROVED). Po 7 iteracjach (buildy 28-30, 32-35) apka watch ma komplet: komplikacja → preview → start → one-tap serie → rest timer (sesja HK trzyma apkę żywą) → live tętno → finish → Apple Health.

### 2026-06-11 (cz. 9) — Release-prep: weryfikacja MUST/SHOULD z PLAN_RELEASE_1.0 (build 36)

Pętla /loop nad sekcją 5 planu release. Kluczowa lekcja: plan audytu był NIEAKTUALNY względem kodu — większość pozycji naprawiły wcześniejsze commity ("audit fixes 13 HIGH"). Każdą pozycję zweryfikowano względem kodu i testów zamiast ślepo "naprawiać".

- **Zweryfikowane jako zrobione wcześniej:** adminDeleteUser (paginacja + błąd auth), reguły Firestore `status=='active'` (testy rules na emulatorze: PASS, w tym deny dla pending_verification), sendEmail rzuca przy błędzie Resend, stabilne ID ćwiczeń (nextId licznik), PlanWizard dni==daysPerWeek, PWA update guard, a11y drawer (Radix Sheet), locale E2E (pl-PL, 111/111 green).
- **NAPRAWIONE — closeout cyklu (bug znaleziony wizualną weryfikacją):** NewPlan liczył statystyki na żywo z workouts (`buildActiveCyclePreview`) i pokazywał ZERA zanim workouts się załadowały, ignorując snapshot `cycle.stats` zapisany przy zamknięciu. Fix: snapshot ?? przeliczenie. Regresja przykryta asercjami 28/32 i 88% w replan.spec.ts; screenshot potwierdza dane + medal sezonu.
- **NAPRAWIONE — weekly-digest:** Resend SDK nie rzuca przy odrzuceniu (błąd w `response.error`); digest logował sukces mimo odrzucenia. Funkcja weeklyDigest wdrożona na Firebase.
- **Domena strengthsave.app w Resend: VERIFIED** (API) — kody rejestracyjne dochodzą.
- **Poza zakresem (świadomie):** otwarcie rejestracji (czeka na decyzje cenowe + RevenueCat, tydzień 1 planu), konflikt draftów multi-device (jedyny otwarty SHOULD).
- Koordynacja: kolizja numeru builda przy uploadzie (równoległa sesja watch wgrała 33-35) — przeskok na 36 z HEAD łączącym obie sesje.
- Wdrożone: web (GH Pages), functions (weeklyDigest), **TestFlight build 36** (Beta App Review APPROVED). Commity `afd1909` + `1fd26f1`. Statusy odhaczone w `docs/PLAN_RELEASE_1.0.md` sekcja 5.

### 2026-06-11 (cz. 13) — Funnel onboardingu wariant B WDROŻONY (build 38): hard paywall bez wyjścia + teaser planu

**Co i dlaczego:** realizacja decyzji z cz. 12 (`docs/PROMPT_ONBOARDING_B.md`). Flow: quiz (bez zmian logiki) → zapis planu → teaser "Twój plan jest gotowy" (zamglone ćwiczenia) → hard paywall bez strzałki wstecz (jedyna ucieczka: Wyloguj) → trial → dashboard z confetti (`/?welcome=1`). Świeży user na iOS bez PRO nie widzi już ŻADNEGO ekranu apki poza paywallem.

**Implementacja:**
- **Route guard (domknięcie dziury z cz. 12):** czysta funkcja `resolvePaywallGuard` (`src/lib/paywall-guard.ts`) + hook `useHardPaywall` (sprawdza `workouts limit(1)`; fail-open przy błędzie odczytu — apki nie zamykamy userowi z danymi, monetyzację chronią bramki akcji) + `PaywallRouteGuard` owijający całe drzewo tras w `App.tsx`. Status `enforced` → każda trasa poza `/paywall` przekierowuje na paywall; `pending` → loader (zero mignięcia dashboardem). Kolejność decyzji: PRO z dowolnego ustalonego źródła zwalnia guard bez czekania na RevenueCat.
- **Anty-"data hostage" zachowane:** user z ukończonymi treningami i wygasłym dostępem zostaje w read-only + bramki akcji + baner (bez zmian). Admin i tier `comp` omijają wszystko. Web: ZERO zmian (invite-only).
- **Teaser** jako wewnętrzny krok `/paywall` w trybie hard (decyzja wykonawcza: jedna trasa = prosty guard, zero problemów z back-stackiem): czas trwania, dni/tydzień, lista dni z ćwiczeniami pod `blur` + gradient, CTA "Odblokuj 30 dni za darmo" odsłania cennik. Po zakupie/restore w trybie hard nawigacja na `/?welcome=1` (tryb zapamiętany w ref, bo zakup gasi `enforced` przed redirectem).
- **Zapowiedź trialu:** dyskretna linijka na ekranie Welcome wizarda ("Najpierw ułożymy Twój plan. Potem 30 dni testujesz za darmo.") — prop `trialNotice` w PlanWizard, włączany tylko w onboardingu na iOS (nie replan, nie web).
- **Seam testowy E2E:** `E2EAuthState` rozszerzony o `simulateNative` / `subscription` / `hasWorkouts`; `isPaywallPlatform()` honoruje symulację tylko w `VITE_E2E_MODE` (RC nieaktywny — efekty RC sprawdzają Capacitor bezpośrednio).
- Wymogi App Review 3.1.2 na paywallu nietknięte (ceny z RC, trial, nota o odnowieniu, restore, legal).

**Weryfikacja:** typecheck + lint + **370 unit** (w tym 8 nowych `paywall-guard.test.ts`: świeży→enforced, expired z treningami→off, admin/comp→off, web→off, pending) + **116 E2E** (5 nowych `paywall-funnel.spec.ts` ze screenshotami teaser+paywall: redirect z `/`, `/plan`, `/analytics`, `/settings`; brak strzałki wstecz; link Wyloguj; expired/admin/comp/web bez redirectu). Scenariusz manualny na urządzeniu: świeże konto → quiz → teaser → paywall; sprawdzić, że back-swipe nie wychodzi z paywalla i że po starcie trialu wchodzi dashboard z confetti.

**Wdrożone:** web (GH Pages) + **TestFlight build 38** (upload OK, Beta App Review **APPROVED**, Robert dostaje build automatycznie). Test zakupu sandbox z cz. 12 nadal otwarty (propagacja produktów po stronie Apple) — ponowić na buildzie 38.

### 2026-06-11 (cz. 12) — Test usera na buildzie 37: decyzja o przebudowie funnelu (wariant B)

**Problem z realnego testu usera:** (1) z paywalla po onboardingu można wyjść strzałką wstecz i przeglądać całą apkę (gating łapie tylko akcje: start treningu, nowy plan), co dla świeżego usera wygląda jak działająca darmowa apka; (2) brak zapowiedzi płatności na początku onboardingu = wrażenie bait-and-switch; (3) paywall to suchy cennik, nie wykorzystuje momentu "właśnie ułożyliśmy Ci plan".

**Rozważone warianty:** A) domknięcie obecnego flow (paywall bez wyjścia), B) pełna przebudowa funnelu wzorem Fitbod (quiz → teaser zamglonego planu → hard paywall → trial → reveal), C) kompromis (A + narracja "plan gotowy"). **Decyzja usera: B.** Zadanie przekazane do osobnej sesji: prompt w `docs/PROMPT_ONBOARDING_B.md` (krótki /goal + pełny kontekst; /goal ma limit 4000 znaków). Zasada zachowana: read-only + eksport dla wygasłych userów Z DANYMI zostaje; hard gate dotyczy tylko świeżych kont bez treningów.

**Test zakupu sandbox:** wstrzymany — StoreKit nie zwracał produktów (stan MISSING_METADATA; po wgraniu screenshotów recenzji oba produkty READY_TO_SUBMIT od ~16:00; pozostała propagacja po stronie Apple, godziny). Ponowić na buildzie 37.

### 2026-06-11 (cz. 11) — Tydzień 1 monetyzacji WDROŻONY (build 37) + podwyżka cen US

**Kod monetyzacji (commity ed9318b, f432437, rejestracja, build 37 TestFlight APPROVED):**
- RevenueCat SDK (configure na starcie, logIn/logOut = uid Firebase), model `subscription` na profilu + `useSubscription` (admin → Firestore comp/webhook → RC CustomerInfo), webhook `revenuecatWebhook` WDROŻONY (sekret REVENUECAT_WEBHOOK_AUTH; chroni tier comp; grace period przy billing_issue).
- Paywall `/paywall`: ceny z RC Offerings, triale 14/30 dni, nota o auto-odnowieniu (3.1.2), restore, linki legal per język. Gating tylko iOS: start treningu, kreator planu, koniec onboardingu → paywall; historia/eksport/konto wolne; baner PRO na Dashboardzie. Web bez paywalla.
- Rejestracja: mobile otwarta (platform w syncUserProfile), web invite-only (isInviteUsable przed utworzeniem profilu). Login na native bez waitlisty/invite. Funkcje wdrożone.
- Testy: 361 app + 63 functions + 10 E2E. Build SPM padł raz na fetchu RevenueCat → fix: `xcodebuild -resolvePackageDependencies -scmProvider system`.

**Podwyżka cen US PRZED startem (zero subskrybentów):** $2.99→**$4.99** (monthly), $19.99→**$29.99** (yearly). Powód: USA jest kotwicą equalizacji — zaniżone US ceny zaniżały 173 pozostałe terytoria; odwrócona siła nabywcza vs PL. Polska BEZ ZMIAN (14,99/99,99 zł, jawna decyzja). Re-equalizacja: DEU €5.99/€34.99, GBR £4.99/£29.99, JPN ¥800/¥5000. Zmiana przez `scripts/asc_subscriptions.py prices`; przejściowe 500 przy hurtowych POST-ach to re-POST-y już zastosowanych zmian (zweryfikowano per terytorium). Stan: oba produkty 175 cen + 175 intro offers, POL nietknięta. Uwaga na przyszłość: weryfikuj ceny po `customerPrice`, nie po ID price pointu (Apple ma wiele pointów o tej samej cenie klienta).

**Hardening do tygodnia 2 (finding security review):** pole `platform` w syncUserProfile jest deklaracją klienta (spoofowalne) — techniczny user może założyć webowe konto bez invite. Ryzyko zaakceptowane na teraz (ochrona przychodu = paywall iOS); właściwy fix: **Firebase App Check** (App Attest) przed publicznym launchem.

**Zostało (user):** RC dashboard: entitlement `pro` + offering default (2 pakiety) + webhook (URL + Authorization). Potem test sandbox na urządzeniu.

### 2026-06-11 (cz. 10) — Monetyzacja: decyzje cenowe + formalności ASC ZALICZONE (Paid Apps ACTIVE)

**Decyzje usera (wiążące dla 1.0):**
- Cennik: **14,99 zł/mies** ($2.99 US) + **99,99 zł/rok** ($19.99 US). BEZ lifetime.
- Triale asymetryczne: miesięczny 14 dni free, roczny 30 dni free (intro offers per produkt; raz na konto Apple per grupa).
- Apka mobilna BEZ kodów invite: zaloguj/zarejestruj na jednym ekranie (email verification zostaje). Web pozostaje invite-only.
- Płatności: RevenueCat (wariant A) zamiast własnego StoreKit.
- Otwarte: zachowanie po końcu trialu (rekomendacja: read-only historia + eksport, blokada nowych treningów).

**Formalności App Store Connect (przeprowadzone z userem krok po kroku, wszystko jednego dnia, finał: Paid Apps ACTIVE):**
- Zaktualizowana ADP License Agreement zaakceptowana → odblokowała resztę.
- Legal Entity uzupełnione; DSA trader: YES, dane publiczne (adres CEIDG, contact@strengthsave.app), dokument tożsamości i adresu: **PDF z VIES** (rejestr VAT UE, po angielsku — sposób na wymóg "English (US)"; NIP 6852331914 zwraca imię+adres). Status: In Review (nie blokuje IAP).
- Paid Apps Agreement: **ACTIVE**. Bank mBank PLN: **ACTIVE** (routing = cyfry 3-10 NRB, SWIFT BREXPLPWMBK). Tax: W-8BEN **ACTIVE** (Foreign TIN=NIP, treaty Poland art. 8 business profits 0%) + Certificate of Foreign Status **ACTIVE** (Individual/Sole proprietor, Title: Owner).
- SBP (15% prowizji): formularz do dokończenia (associated accounts: 4×No; rola Marketing u klienta się nie liczy).
- Dokumenty prawne privacy+terms PL/EN w `landing/legal/` (commit 36f37ed), do publikacji na strengthsave.app.

**Następne:** produkty subskrypcji przez ASC API (agent), RevenueCat (user: konto + In-App Purchase Key), kod: login bez invite + paywall + entitlement gating.

### 2026-06-08 (cz. 6) — Przełącznik jednostek kg ↔ lbs działa w CAŁEJ aplikacji

Cel: przełącznik kg/lbs (Profil) zmienia KAŻDĄ wagę w apce (wyświetlanie, pola wpisywania, wykresy, tonaż, rekordy, podpowiedzi, pomiary, share, onboarding). Wcześniej działał tylko w 4 plikach. **NIE wdrożone** (commit/push/deploy odłożone na życzenie usera — zmiany w working tree).

**Zasada (bez zmiany modelu danych):** kg KANONICZNE w Firestore, konwersja wyłącznie na warstwie UI. Wyświetlanie przez `fmt(kg)`/`toDisplay(kg)`, wpisywanie przez `fromInput(value)` (→ kg przy zapisie), tonaż przez `fmtTonnage(kg)`. Zero twardego "kg" w kontekstach wagi.

**Infrastruktura rozszerzona:** `units.ts` +`formatTonnage` (kg→"12.3 t" / lbs→"27.1 k lbs", tysiące funtów) +`weightUnitLabel`. `UnitContext` +`fmtTonnage`. Nowy `src/test/units.test.ts` (14 testów: round-trip kgToLbs/lbsToKg, formatWeight, formatTonnage, fromInput/toDisplay, brak zaokrąglenia kg przy zapisie).

**Naprawione (~17 plików):**
- **Wpisywanie:** `ExerciseCard` (serie — bez ruszania `setData`/`onSetsChange`, tylko konwersja), `MeasurementsForm` (waga ciała: pre-fill `toDisplay`, zapis `fromInput`; obwody w cm NIE ruszane).
- **Strony:** `Dashboard` (kafelek tonażu `fmtTonnage`, trend +suffix konwertowany, waga ciała, PR), `Analytics` (3 komponenty: schowek, kafelki, wykresy tonaż/waga/per-ćwiczenie z konwersją danych PRZED Recharts + oś/tooltip, weekly summaries), `Achievements` (kafelki, life-PR +delta, wykres trendu 6 mies., milestones, lista rekordów+1RM, dialog historii), `WorkoutHistory`, `Cycles`, `CycleDetail`, `Measurements`, `NewPlan`, `WorkoutDay` (badge tonażu per-ćwiczenie, prompt AI coach, dane share).
- **Komponenty:** `RzaMetricsCard`, `ExerciseProgressionDialog` (wykres+statystyki; bodyweight=powtórzenia bez konwersji przez helper `dispVal`), `ShareWorkoutDialog`+`share-utils` (obrazek share: `generateWorkoutImage` +param `unit`, tonaż przez `formatTonnage`), `PlanWizard` (onboarding "kg/mies" → jednostka usera).
- **Liby z podpowiedziami:** `next-set-advice` (`getNextSetAdvice` +param `unit`, formatowanie wag w `reason`) i `exercise-utils` (`getProgressionAdvice` +param `unit`). Oba `unit: UnitSystem = 'kg'` (default = output identyczny jak wcześniej → 287 testów bez zmian; testy asertujące `'↑ +2.5kg'` i `reason` nietknięte).
- **i18n:** 24 klucze (12 PL + 12 EN) sparametryzowane `{unit}` zamiast twardego "kg": nsadvice.*, progress.increaseWeight, cycles.kgTonnage/kgPerWorkout/est1RM, achievements.totalTonnageSub/ms.tonnage, comp.progression.maxKg, analytics.copy.tonnage/weight, measurements.field.weight, ob.precision.kgMonth.

**Pułapki rozwiązane:** tonaż w lbs (duże liczby) → `formatTonnage` ("t"/"k lbs") zamiast surowego fmt. Progi/milestones: logika `achieved` zostaje na kg, konwertowany TYLKO label. Brak podwójnej konwersji. Nie zaokrąglamy kg przy zapisie (100 lbs = 45.359 kg, zaokrąglenie tylko przy wyświetlaniu).

**Weryfikacja:** `tsc` OK, `eslint` czysty na zmienionych plikach (pozostałe 2 błędy pre-existing: `build/` artefakt iOS + `functions/src/registration.ts`), 287/287 testów, `build:mobile` OK. Playwright (tymczasowy spec, usunięty): `unit-system='lbs'` → nagłówek WorkoutDay "lbs"/zero "kg", label Measurements "Weight (lbs)", Dashboard renderuje bez crashu.

**Świadomie POZA zakresem:** proza generowana przez AI w cotygodniowym podsumowaniu (`generateWeeklySummary` Cloud Function, server-side) nadal cytuje kg — pełna konwersja wymaga zmiany backendu + przekazania `unit` + deploy funkcji. Kafelki liczbowe tego podsumowania (tonaż, PR) JUŻ konwertowane. Strava (km/pace) = dystans, poza zakresem przełącznika wagi. `generateWorkoutSummary` (ai-coach) — nieużywany w UI, pominięty.

---

### 2026-06-08 (cz. 5) — Zgoda na push + poranne przypomnienie o treningu (build 14)

- **Zgoda (Settings → Powiadomienia, `NotificationSettings.tsx`):** przycisk "Włącz powiadomienia" (świadoma akcja → systemowy prompt iOS + rejestracja tokenu) + status + toggle porannego przypomnienia (`notificationPrefs.dailyReminder`). `push-notifications.ts` rozdzielony: `registerPushForUser` (przy starcie, BEZ promptu — tylko gdy zgoda już jest) vs `requestPushPermission` (z Ustawień, prompt).
- **Cron `dailyTrainingReminder` (functions/daily-reminder.ts, deployed):** `onSchedule every day 07:00 Europe/Warsaw`. Push TYLKO w dni gdy user ma dziś zaplanowany dzień treningowy (czyta training_plans/{uid}.days, dopasowanie po weekday; dni wolne pomija). Spersonalizowane: imię + focus dnia. Respektuje dailyReminder + dostęp + token. i18n settings.notif.* (PL/EN). 267 testów. Build 14 VALID+podpięty.
- APNs key skonfigurowany przez usera w tej sesji (Apple Developer → Keys → upload do Firebase Cloud Messaging) — push iOS gotowy do testu.

---

### 2026-06-08 (cz. 4) — Panel admina Faza 1-3 + powiadomienia push (build 13)

Cel: rozbudowa panelu admina (wgląd, kontrola per user, broadcast, flagi) + push do userów/grup. Admin tylko `g.jasionowicz@gmail.com`, BEZ ról (nikt nie nadaje sobie admina).

**Backend (registration.ts + index.ts, deployed):** `adminGetUserLogs` (notification_logs + auth_audit per uid, bez composite indexu), `adminSendUserEmail`, `adminResendVerification`, `adminBroadcastEmail` (all/cohort), `adminSendPush` (FCM sendEachForMulticast, tokeny z users.fcmTokens), `adminDeleteUser` (Auth + Firestore, blokada usunięcia siebie). `updateUserAccess` +reason (zawieszenie → audyt). **AI gate per user**: `assertAiEnabled` w proxyOpenAI/streamOpenAI (features.ai!==false, admin zawsze, domyślnie ON). firestore.rules: `config/feature_flags` (auth read, admin write).

**Frontend (AdminDashboard + 3 karty modularne):** Puls aplikacji (10 metryk, getCountFromServer dla treningów+cykli). Lista userów: szukaj + filtry (aktywni/zawieszeni/bez dostępu/niezweryf.) + sort. Karta usera: logi per-user (Maile/Logowania), koszt AI per user, AI on/off + Strava per user, zawieś z powodem, akcje (mail, kod, reset onboardingu, cohorty, usuń 2x). AdminCommsCard (broadcast mail + push do all/cohort), AdminFeatureFlagsCard (config/feature_flags).

**Push (FCM):** `@capacitor-firebase/messaging`, `lib/push-notifications.ts` (registerPushForUser/listenPushTokenRefresh → users.fcmTokens), `PushRegistrar` w App (native). iOS: aps-environment=production w App.entitlements, capability PUSH_NOTIFICATIONS na App ID (ASC API), profil regen z push (UUID c85f25b1). Build 13 VALID+podpięty.

⚠️ **DOSTARCZANIE PUSH NA iOS WYMAGA KROKU ZEWNĘTRZNEGO:** klucz APNs (.p8) w Apple Developer (Certificates → Keys → Apple Push Notifications service) → upload do Firebase Console → Project Settings → Cloud Messaging → Apple app configuration → APNs Authentication Key. Bez tego iOS nie wygeneruje tokenu FCM ani nie dostarczy push. Backend/klient/UI gotowe.

**Decyzje:** wgląd głównie client-side (reguły admina pozwalają na users/workouts/cycles/ai_usage; logi notification_logs/auth wymagają funkcji bo rules=false). Bez systemu ról. AI domyślnie ON (toggle zapisuje features.ai). 246 testów, tsc/eslint czyste.

---

### 2026-06-08 (cz. 3) — Fixy onboardingu (build 11) + nawigacja (build 12)
Backlog 1-5 onboardingu (404 redirect, walidacja PlanBuilder, banner grace/kickoff, frekwencja rekomendacji, PL nazwy planów, wyszukiwarka bez-diakrytyczna, spójność nagłówków, confetti) + dolny pasek (pigułka pod ikoną) + boczne menu (sekcje GŁÓWNE/POSTĘPY/KONTO). Patrz commity a987c55..1039e42.

---

### 2026-06-08 (cz. 2) — DOKOŃCZENIE: email działa + Apple Sign-In live (build 10) + branding Google + email-gate UX

Z tokenami usera (Cloudflare + pełny klucz Resend, użyte tylko w pamięci sesji) dokończono blokady zewnętrzne z cz. 1:

- **Email z strengthsave.app — DZIAŁA.** Domena dodana w Resend (id 75a2bd1b), 3 rekordy DNS wpisane do Cloudflare przez API (DKIM TXT, SPF MX, SPF TXT) + DMARC (`v=DMARC1; p=none; rua=mailto:grzegorzee@gmail.com`). Domena **verified**. Klucz funkcji (re_Matw, send-only) jest w tym samym koncie → probe wysyłki zwrócił `id`, mail dotarł. `firebase deploy --only functions` wykonany — 24 funkcje live z `from: noreply@strengthsave.app`. Kody rejestracji dochodzą do każdego.
- **Apple Sign-In — LIVE w TestFlight (build 10).** Capability `APPLE_ID_AUTH` włączona na App ID przez ASC API (`scripts/_enable_apple_signin.py`, settings `APPLE_ID_AUTH_APP_CONSENT/PRIMARY_APP_CONSENT`). Provider Apple włączony w Firebase Console (user). Stary profil usunięty + nowy `Strength Save App Store` z capability (UUID 50cc6fd9, `scripts/_regen_apple_profile.py`, reuse cert F52LLKV85G). `CODE_SIGN_ENTITLEMENTS=App/App.entitlements` wpięty do pbxproj (Debug+Release), build 9→10. Pipeline TestFlight: ARCHIVE+EXPORT+UPLOAD SUCCEEDED, build 10 VALID, podpięty do grupy "Wewnętrzni". Do testu na urządzeniu: TestFlight → update build 10 → "Zaloguj przez Apple".
- **Branding logowania Google** (user w konsolach): OAuth consent screen App name "Strength Save" + logo + authorized domain strengthsave.app; authorized domain dodany w Firebase Auth. Fix "logowania do randomowego projektu".
- **Email-gate UX** (build 10): przyciski "Otwórz [provider]" (detekcja domeny maila, `lib/inbox-links.ts`) pod polem kodu + cooldown 60s na ponowne wysłanie kodu.

Build 10 zawiera CAŁOŚĆ sesji (nav, Achievements, Historia, Apple Sign-In, email-gate). 237 testów, tsc/eslint czyste.

---

### 2026-06-08 — Backlog 1-5 (nawigacja, Achievements, Historia, email, Apple Sign-In)

**Kontekst:** realizacja celu "zrobić 1-5 z backlogu + maile z domeny strengthsave.app".

1. **Nawigacja wstecz (spójna).** Decyzja: jeden wzorzec — `AppHeader` dostaje `onBack` dla tras NIE-root; trasy root (bottom nav: `/`, `/plan`, `/history`, `/exercises`, `/profile`) bez strzałki. `Layout.handleBack` = `navigate(-1)` z fallbackiem na `/` gdy brak historii (deep link, `window.history.state.idx`). Usunięto zdublowane in-content back-arrows (Settings, PlanEditor, AdminDashboard, UserPlanEditor, WorkoutHistory) — dublowały tytuł z AppHeader. Focused flow (Workout/Exercise) i fullscreen (NewPlan) zostają z własnym back.

2. **Achievements premium.** Nowy `lib/achievements-utils.ts` (testowalne; 10 testów): `getExercise1RMProgress` (rekord + delta vs poprzedni najlepszy), `getMonthlyTonnage` (6 mies., `refDate` param — sandbox blokuje `new Date()` w testach), `detectPlateaus` (rekord starszy niż ostatnie 3 z min. 4 sesji), `computeMilestones` (progi workouts/tonnage/records). UI: karty top-3 życiowych 1RM z przyrostem, wykres tonażu 6 mies. (Recharts), siatka odznak achieved/locked, karta zastoju z CTA do progresji. Usunięto zdublowaną kartę "Tonaż" (zastąpiona trendem). **Wilks ODŁOŻONY** — brak pola płci + niejednoznaczne mapowanie big-3 (High/Low Bar, Hack Squat); ryzyko mylących liczb sprzeczne z tylko_fakty.

3. **Historia premium.** Filtry statusu i dnia planu jako chipy (Kinetic: aktywny `fitness-cyan`, nieaktywny `surface-highest`) zamiast Select. Grupowanie sesji po miesiącach z nagłówkiem (miesiąc rok + liczba sesji + tonaż). Search + zakres dat zostają.

4. **Email z domeny strengthsave.app (KOD).** `from: Strength Save <noreply@strengthsave.app>` w `registration.ts` + `weekly-digest.ts` (było `onboarding@resend.dev`). ⚠️ **NIE deployować funkcji** zanim domena nie jest zweryfikowana w Resend (DNS SPF/DKIM) — inaczej kody rejestracji przestaną dochodzić. Klucz Resend (sekret Firebase) jest send-only → dodanie/weryfikacja domeny to krok w dashboardzie Resend + DNS u rejestratora.

5. **Apple Sign-In (KOD).** Google Sign-In był już zrobiony. Apple wymagany przez App Store skoro jest Google. Dodano `appleProvider` (firebase.ts), `useAuth.signInWithApple` (mirror Google, `skipNativeAuth:true` globalnie → `rawNonce` z plugina), przycisk iOS w Login (logo Apple SVG, czarny per HIG), `capacitor.config` providers +`apple.com`, `ios/App/App/App.entitlements` (gotowy, NIE wpięty do pbxproj). **Decyzja: nie wpinać entitlementu do pbxproj teraz** — bez capability w profilu provisioning zepsułoby pipeline TestFlight (signing mismatch). Aktywacja = kroki zewnętrzne (portal Apple → profil/pbxproj → Firebase provider Apple → test → nowy build).

**Weryfikacja:** tsc clean, eslint clean, 232 testy (222+10), `build:mobile` OK, screenshoty Playwright (nav, achievements, history, login). Commity per zadanie.

**Stan zadania 5 (Android/App Store):** kod gotowy. Android projekt OK (google-services.json, applicationId, versionCode 1) — brak release keystore (sekret) + Play Console. App Store release = submission/review. Wszystko poza CLI (kroki zewnętrzne).

---

### v0.0.1 build 1-9 (2026-06-06 → 2026-06-08) — TestFlight + redesign całej apki + naprawa cykli

**Publikacja iOS (TestFlight, w pełni przez API/CLI, bez Xcode GUI ani fastlane):**
- App ID, certyfikat Distribution, profil App Store utworzone przez App Store Connect API (`scripts/asc_api.py`, `scripts/ios_signing.py`). Pipeline `scripts/ios-testflight.sh` (build:mobile → cap sync → archive UNSIGNED → export manual → altool upload). Klucz API (Admin) w `_secrets/oauth/AuthKey_UD43687FB9.p8` + `appstore-connect.env`.
- Pułapki: (1) automatic cloud signing wymaga roli Admin klucza → obejście: ręczny cert+profil przez API + manual signing; (2) p12 z openssl 3 → `MAC verification failed` → `openssl pkcs12 -export -legacy`; (3) archive z automatic signing chce Development profil (wymaga device) → `CODE_SIGNING_ALLOWED=NO`, podpis przy eksporcie; (4) rekord apki — Apple BLOKUJE create przez API (`403 apps does not allow CREATE`), jedyny krok GUI; (5) `build/` w .gitignore (prywatny klucz dist). Internal testing: grupa "Wewnętrzni" + tester przez API. Wersja 0.0.1 (start, nie 1.0).
- Firebase Storage zainicjalizowany + `storage.rules` (avatars/{uid}: write tylko właściciel, obrazy <5MB) wdrożone.

**Naprawy UX treningu/podsumowania:**
- Pre-fill wagi bierze OSTATNIĄ wagę bez auto-progresji (+1/+2.5) — była regresja 14→15; sugestia podbicia w badge CEL. Sygnatura `createPrefilledSets` uproszczona.
- Czas trwania treningu: `WorkoutSession.durationSec` + `startedAt`/`completedAt` (backup, liczone w `syncDraftToFirebase` final przez `batchSaveWorkout`). Stare treningi pokażą "—".
- Scroll-restore po wygaszeniu (iOS WKWebView reload w tle) — `window.scrollY` do localStorage przy hidden/pagehide, restore po remount (TTL 15 min).
- RestTimer: `@capacitor/haptics` (navigator.vibrate martwy na iOS) + bez `animate-pulse`. Checkbox serii: obrys gdy niezaznaczony. Autosave badge chowany (tylko błąd). Usunięty zdublowany górny stoper.

**Naprawa cykli (lifecycle):**
- PR-y w `computeCycleStats` = RZECZYWISTE rekordy (`detectNewPRs` vs historia sprzed cyklu), nie top-10 → koniec "10 i 10".
- `buildCycleRecommendation.canCloseout` — przycisk "Domknij cykl" tylko gdy wygasł (`isExpired` z planowanego końca startDate+durationWeeks, NIE endDate=dziś z preview).
- Helper `lib/cycle-actions.ts startCycleWithPlan` — "Powtórz plan" (Cykle+Dashboard, wagi z historii), "Zmień plan", auto-przedłużenie (>7 dni bez decyzji → auto nowy cykl + toast).

**Design — Kinetic Precision w CAŁEJ apce (23 pliki):** indigo/blue/violet → lime/cyan; emerald → fitness-success; amber → fitness-warning/lime; sky → cyan; semantyczne badge → tokeny; hex+white-opacity → surface/muted. Karta podsumowania premium (badge kg stały kształt). Avatar object-cover. Italic na nagłówkach sekcji. Nawigacja: Dashboard/Plan/Historia/Ćwiczenia/Profil. Celowo zostają: Strava (brand+wykresy), flame rozgrzewki, koszty admina, toast.

**ODŁOŻONE:** Email weryfikacyjny (Resend) — `from: onboarding@resend.dev` (sandbox) dociera tylko na adres właściciela konta Resend. Naprawa: zweryfikować domenę apki w Resend + zmienić `from` w `functions/src/registration.ts:195` + `weekly-digest.ts:222` + `firebase deploy --only functions`.

### v6.11.4 (2026-05-30) — Final sync bez utraty treningu

**Decyzja:** Finalny zapis treningu jest teraz potwierdzany odczytem z serwera przed
usunięciem lokalnego draftu. IndexedDB pozostaje źródłem bezpieczeństwa do momentu, gdy
Firestore zwróci `completed=true` oraz te same ćwiczenia, serie i ciężary.

| Zmiana | Szczegóły | Status |
|--------|-----------|--------|
| Walidacja final sync | `batchSaveWorkout` nie wystarcza jako dowód. Po finalnym zapisie `WorkoutDay` i `SyncCenter` robią read-back z serwera i walidują payload przez `workout-final-sync.ts` | ✅ |
| Brak kasowania draftu przy częściowym zapisie | Jeśli chmura nie potwierdzi kompletnego treningu, draft zostaje lokalnie, wraca do kolejki i pokazuje status final sync pending | ✅ |
| Eksport awaryjny | Sync Center ma przycisk eksportu lokalnego draftu do JSON | ✅ |
| Widoczna wersja PWA | Podbicie do `v6.11.4` pozwala sprawdzić, że użytkownik działa na nowym buildzie | ✅ |


### v6.11.0 (2026-05-29) — Coach następnej serii (1. funkcja AI dająca wartość)

**Decyzja:** Pierwszy z 3 pomysłów AI. Rdzeń deterministyczny (darmowy), AI tylko on-demand
(zero kosztu w tle — lekcja z usunięcia AI z planów). Odpowiada na pytanie „ile dziś nałożyć".

| Element | Szczegóły | Status |
|---------|-----------|--------|
| `src/lib/next-set-advice.ts` | `getNextSetAdvice` — konkretny cel (ciężar×powt.) z TRENDU całej historii (`getExerciseHistory` + `detectPlateau`), nie tylko ostatniego treningu. Kind: progress / hold / deload | ✅ |
| Deload przy plateau | Zastój ≥4 sesje → sugestia -10% ciężaru zamiast forsowania | ✅ |
| `ExerciseCard` badge "🎯 Cel: X kg × Y" | Zastępuje ogólne "↑ +2.5kg" gdy jest historia; fallback do starego badge dla 1 treningu. Plus jednozdaniowe uzasadnienie | ✅ |
| Przycisk "Coach AI" (on-demand) | `callOpenAI` z kontekstem (5 ostatnich sesji, sugestia, notatki) → 1-2 zdania porady w toaście. Koszt tylko po kliknięciu, limit $5 pilnuje `proxyOpenAI` | ✅ |

**Jakość:** typecheck ✓, lint ✓, vitest 209/209 ✓ (7 nowych), playwright 99/99 ✓, build ✓.

**Pozostałe 2 pomysły AI (backlog):** asystent doboru ćwiczeń w kreatorze planu; wykrywanie plateau + deload na poziomie całego planu (proaktywny sygnał na Dashboard).


### v6.10.0 (2026-05-29) — Koniec AI w tworzeniu planów + własny builder

**Decyzja:** Usunięto generowanie planów przez AI (nieprzewidywalne, kosztowne, zależne od
OpenAI). Tworzenie planu = gotowe szablony (`planTemplates`) albo ręczny kreator od zera.
AI zostaje tam, gdzie analizuje realne dane (Coach, Chat, podsumowania) — nie zgaduje planu.

| Zmiana | Szczegóły | Status |
|--------|-----------|--------|
| Usunięto AI z `NewPlan` | Tryb 'ai' (quiz + `generateTrainingPlan`) wycięty. Toggle: Gotowe plany / Własny plan | ✅ |
| Usunięto AI z `Onboarding` | 5-krokowy quiz + AI generate → wybór gotowego szablonu | ✅ |
| Nowy `src/components/PlanBuilder.tsx` | Ręczny kreator: dni (weekday+focus), ćwiczenia z biblioteki, serie, czas trwania. Walidacja: dzień = focus + min 1 ćwiczenie | ✅ |
| `fromCycle` bez AI | Kreator prefilluje dni skopiowane ze starego cyklu (zamiast AI-regeneracji) | ✅ |
| Usunięto `src/lib/ai-onboarding.ts` | Osierocony po wycięciu AI (Karpathy: czyść własny bałagan). `ai-coach.ts` zostaje (Coach/Chat) | ✅ |

**Jakość:** typecheck ✓, lint ✓, vitest 202/202 ✓, playwright 99/99 ✓ (1 test E2E zaktualizowany pod nowy onboarding), build ✓.

**Backlog AI (do realizacji osobno, używa realnych danych):** progresja per ćwiczenie,
wykrywanie plateau/deload, asystent doboru ćwiczeń w kreatorze, analiza dysbalansu objętości,
predykcja celów, normalizacja nazw ćwiczeń, analiza ryzyka przeciążenia (TRIMP).


### v6.9.4 (2026-05-29) — Naprawa historii po zmianie planu + snapshot (prewencja)

**Problem:** Po odpaleniu nowego planu (FBW → push/pull, start 1 czerwca) historyczne
treningi przestały się poprawnie wyświetlać: ukończony trening pokazywał pustą strukturę
nowego planu, znikały nazwy ćwiczeń, rekordy, osiągnięcia; plan startujący w przyszłości
pokazywał 8% i przyszły tydzień; cykle miały ujemne wartości. Dane w Firestore były
bezpieczne — to był bug warstwy odczytu (kod resolwował historię przez aktualny plan,
a `dayId`/`exerciseId` są niestabilne między planami).

| Decyzja | Kontekst | Status |
|---------|----------|--------|
| Wspólny resolver nazw `src/lib/exercise-name-resolver.ts` | Priorytet: snapshot w treningu → zarchiwizowany cykl → aktualny plan → defaultPlan → id. Reużyty w WorkoutDay, WorkoutHistory, Achievements, Analytics, cycle-insights | ✅ |
| `WorkoutDay` renderuje historię z ZAPISANEGO treningu, nie z planu | Snapshot dnia odbudowany z `workoutForDate.exercises`, gdy oglądamy ukończony/przeszły trening | ✅ |
| Snapshot w modelu: `ExerciseProgress.name`, `WorkoutSession.dayName/dayFocus` | Opcjonalne, wstecznie zgodne. Zapisywane od teraz przy każdym treningu → odporność na przyszłe zmiany planu | ✅ |
| `currentWeek=0` i guard `computeCycleStats` dla planu startującego w przyszłości | Eliminuje fałszywe 8% i NaN; plan tygodnia pokazuje pierwszy tydzień planu | ✅ |
| `buildCycleComparison` zwraca null dla świeżego cyklu (0 treningów) | Koniec mylących ujemnych delt (np. -50000 kg) | ✅ |
| Przycisk „Napraw dane historyczne" (Ustawienia) + `backfillHistoricalWorkouts` | Jednorazowe dotagowanie cycleId + snapshot nazw ze zarchiwizowanych cykli; idempotentne, ręczne (po eksporcie backupu) | ✅ |
| Auto-dotagowanie przy zmianie planu (`NewPlan.handleApprove`) | Po archiwizacji starego planu untagged treningi dostają cycleId — zapobiega powtórce problemu | ✅ |

**Jakość:** typecheck ✓, lint ✓, vitest 202/202 ✓, playwright 99/99 ✓, build ✓.
**Globalnie wdrożone:** zasady Karpathy (`~/.claude/karpathy-guidelines.md`) jako pierwszy krok każdego developmentu.


### v6.8.0 (2026-04-03)

| Data | Decyzja | Kontekst | Status |
|------|---------|----------|--------|
| 2026-04-03 | **IndexedDB jako source of truth dla aktywnego treningu** — local-first draft + periodic/background sync | `React state + localStorage` nie wystarczał przy ubijaniu karty / przejściu telefonu w tło. Draft treningu ma być trwały lokalnie, a Firebase tylko warstwą checkpoint/final sync. | AKTYWNA |
| 2026-04-03 | **Offline-first start treningu** — provisional session bez wymaganego dokumentu w Firebase | Użytkownik ma móc zacząć trening bez internetu. Zdalna sesja jest tworzona dopiero po odzyskaniu połączenia i promocji lokalnej sesji. | AKTYWNA |
| 2026-04-03 | **Sync Center** — jawny stan kolejek syncu, retry i discard lokalnych sesji | Warstwa synchronizacji przestała być ukryta. Użytkownik i admin muszą widzieć, co jest tylko lokalne, co czeka na sync i co się nie udało. | AKTYWNA |
| 2026-04-03 | **CycleId jako źródło prawdy dla nowych treningów** — dual-read dla starych danych | Statystyki cyklu nie mogą opierać się tylko na zakresie dat. Nowe sesje są przypinane do `cycleId`, stare dane dalej działają przez fallback. | AKTYWNA |
| 2026-04-03 | **Access control po stronie backendu** — `access.enabled` i `status` egzekwowane w rules/functions | Sam client-side guard był za słaby. Dostęp użytkownika do danych i callable functions ma być blokowany też po backendzie. | AKTYWNA |
| 2026-04-03 | **Auth model: Google + email/password + kod mailowy** | Rejestracja ma być dostępna dla zwykłego usera bez admin handoff. Email verification jest obsłużony przez Functions + Resend, nie przez passwordless email-link. | AKTYWNA |
| 2026-04-03 | **Invite i waitlista jako warstwa operacyjna, nie bramka wejścia** | User po weryfikacji dostaje dostęp od razu. Invite i waitlista służą do cohort, onboarding contextu, flag i operacji admina, a nie do blokowania podstawowego wejścia. | AKTYWNA |
| 2026-04-03 | **Role tylko `admin` + `user`** — reszta przez statusy, cohorty i feature flags | Nie dokładamy nowych ról typu coach/staff. Produktowo wystarczą role bazowe plus metadata konta. | AKTYWNA |
| 2026-04-03 | **Osobne strony `/#/login` i `/#/register`** + redirect zalogowanego usera z auth routes | Rozdzielenie intencji upraszcza UX. Po zalogowaniu user nie może zostać na ekranie auth i ma być przeniesiony na dashboard lub onboarding. | AKTYWNA |
| 2026-04-03 | **Admin auth ops** — invite, waitlista, audit auth, suspend/restore, access toggle | Panel admina ma obsługiwać nie tylko plan i feature flags, ale też pełny lifecycle wejścia użytkownika do aplikacji. | AKTYWNA |
| 2026-04-03 | **Playwright jako realny gate dla flow auth i offline** — 83 scenariusze | Krytyczne scenariusze productowe muszą być testowane E2E, nie tylko smoke. Dotyczy to auth, offline startu, Sync Center i admin operations. | AKTYWNA |

### v6.7.0 (2026-04-02)

| Data | Decyzja | Kontekst | Status |
|------|---------|----------|--------|
| 2026-04-02 | **Bodyweight exercises** — `isBodyweight` flag w exerciseLibrary, ukrycie pola kg w ExerciseCard, PR na reps | Dead Bug, Plank, Reverse Crunch itd. nie mają obciążenia. Pole kg było wymagane i bezużyteczne. Teraz grid 3-kolumnowy, progresja "+powt.", `getExerciseBestReps()`. | AKTYWNA |
| 2026-04-02 | **Batch save** — localStorage draft + Firestore writeBatch zamiast debounced autosave | Każda zmiana reps/weight powodowała zapis do Firebase (debounce 500ms). Teraz dane zapisywane TYLKO przy "Zakończ trening". `workout-draft.ts` jako backup. Draft recovery po crash/reload. `beforeunload` warning. | AKTYWNA |
| 2026-04-02 | **Dashboard "Rozpocznij trening"** — karta z 3 stanami na górze Dashboard | Użytkownik musiał nawigować do Plan dnia lub Plan treningowy żeby zacząć. Teraz: training day → przycisk start, completed → "Ukończony!", rest day → "Dzisiaj wolne" + info o następnym. | AKTYWNA |
| 2026-04-02 | **Nawigacja 8→6 zakładek** — usunięto "Plan dnia" i "AI Coach" z sidebar | Plan dnia zbędny z Dashboard start button. AI Coach nieużywany. Trasy dostępne przez URL. | AKTYWNA |
| 2026-04-02 | **Analytics per-exercise** — grid osobnych wykresów zamiast jednego overlapping | 30kg ćwiczenie obok 150kg na wspólnej osi Y = nieczytelne. Teraz każde ćwiczenie ma własny chart 150px z własną skalą Y. Bodyweight = reps na osi Y. | AKTYWNA |
| 2026-04-02 | **PR dates** — `bestDate` w ExerciseBest + wyświetlanie w Achievements | Rekordy nie miały daty. Teraz "80kg × 5 rep · 15 mar". | AKTYWNA |
| 2026-04-02 | **Cycles aktualny plan** — karta na górze z progress bar, tydzień X z Y | Cycles pokazywał tylko historyczne cykle, nie aktualny plan. | AKTYWNA |
| 2026-04-02 | **Playwright E2E** — VITE_E2E_MODE, 60 testów (smoke, nav, features, edge cases) | Brak E2E testów. Krytyczne dla weryfikacji batch save. | AKTYWNA |
| 2026-04-02 | **Security audit — 5 agentów równolegle** — CRITICAL: Strava auth fix, role escalation block, useAIChat userId fix | Audyt bezpieczeństwa znalazł 2 CRITICAL (Strava bez auth, role escalation), 3 HIGH, 7 MEDIUM. Wszystkie naprawione. | AKTYWNA |
| 2026-04-02 | **Usunięcie AI Chat/Coach** — useAIChat, useAICoach, useChatMessages, AIChat.tsx, ai-chat.ts | Nieużywane moduły. Usunięcie zmniejsza attack surface i kod (-815 linii). ai-coach.ts zostaje (callOpenAI, getSwapSuggestions). | AKTYWNA |
| 2026-04-02 | **Input validation** — clampSet() 0-999, notes cap 2000/5000, importData schema validation | Audit znalazł brak walidacji zakresów. Dodano server-side clamping i whitelist pól przy imporcie. | AKTYWNA |
| 2026-04-02 | **OpenAI hardening** — model allowlist, maxTokens cap 4000, max 50 messages | Audit: user mógł wybrać dowolny model i maxTokens. Teraz tylko gpt-5-mini/gpt-4.1-mini. | AKTYWNA |
| 2026-04-02 | **Cleanup /simplify** — formatLocalDate→utils, E2E helpers, callback refs, draft debounce, latestPR limit | Audyt /simplify: 20 findings, naprawiono top 11. -50 linii, lepsza memoizacja, mniej re-renderów. | AKTYWNA |

### v6.6.0 (2026-04-01)

| Data | Decyzja | Kontekst | Status |
|------|---------|----------|--------|
| 2026-04-01 | **One-Click Autostart** — `?autostart=true` query param + useEffect auto-start + scrollIntoView | Użytkownik musiał kliknąć 2-3 razy żeby rozpocząć trening (Dashboard → WorkoutDay → "Rozpocznij"). Teraz jedno kliknięcie z Dashboard startuje sesję i scrolluje do pierwszego ćwiczenia. `autostartDone` ref zapobiega podwójnemu odpaleniu. | AKTYWNA |
| 2026-04-01 | **Pre-fill z progresją** — `createPrefilledSets()` w exercise-utils.ts, wywoływane przy tworzeniu nowej sesji | Sety startowały od 0/0 mimo że mamy dane z poprzedniego treningu. Teraz kopiuje reps + weight + increment z getProgressionAdvice (+2.5kg compound, +1kg isolation). completed=false — user potwierdza ✓. Fallback do createEmptySets() przy braku historii. | AKTYWNA |
| 2026-04-01 | **Skip exercise = tylko na dziś** — `skippedExercises?: string[]` w WorkoutSession, NIE modyfikuje planu | User chciał pomijać ćwiczenia bez wpływu na plan. skippedExercises zapisywane w Firebase per-sesja. Ćwiczenie filtrowane w aktywnym widoku, widoczne z badge "Pominięte" w podsumowaniu. | AKTYWNA |
| 2026-04-01 | **Dynamiczne serie** — handleAddSet/handleRemoveSet w ExerciseCard, max 10, min 1 | Stała liczba serii (z planu) nie pozwalała na elastyczność. Nowa seria kopiuje dane z ostatniej. Firebase już przechowuje dynamiczną tablicę SetData[], więc brak zmian modelu. | AKTYWNA |

### v6.5.0 (2026-03-24)

| Data | Decyzja | Kontekst | Status |
|------|---------|----------|--------|
| 2026-03-24 | **Plan Cycles w osobnej kolekcji** — `plan_cycles/{autoId}` zamiast subcollection pod `training_plans` | Niezależne query, prostsze indeksy, brak limitu zagnieżdżenia. Każdy cykl ma pełny snapshot planu + statystyki. | AKTYWNA |
| 2026-03-24 | **Archiwizacja przy tworzeniu nowego planu** — `archiveCurrentPlan()` przed `savePlan()` | `training_plans/{userId}` przechowuje tylko JEDEN aktywny plan (setDoc nadpisuje). Archiwizacja zapobiega utracie historii. | AKTYWNA |
| 2026-03-24 | **Stats obliczane przy archiwizacji** — snapshot statystyk (tonaż, PRy, frekwencja) w dokumencie cyklu | Unikamy kosztownych retrospektywnych query. Stats frozen at cycle end. | AKTYWNA |
| 2026-03-24 | **generatePlanFromCycle** — osobna funkcja AI z kontekstem starego planu + PRów | AI dostaje pełny kontekst progresji: stary plan JSON, rekordy, frekwencję. Generuje plan z progresją. | AKTYWNA |
| 2026-03-24 | **Żółty banner ≤2 tygodnie** — `weeksRemaining` w useTrainingPlan, osobny od `isPlanExpired` | Proaktywne przypomnienie zamiast reaktywnego "plan się skończył". User ma czas zaplanować nowy cykl. | AKTYWNA |
| 2026-03-24 | **Share z photo — FileReader + brightness filter** — zdjęcie jako tło z `filter: brightness(0.4)` | Nie uploadujemy zdjęcia nigdzie — base64 w pamięci, renderowane przez html2canvas-pro. Prywatność preserved. | AKTYWNA |
| 2026-03-24 | **cycleId opcjonalne w WorkoutSession** — backward compatible, stare workouty bez cycleId | Brak migration wymagana. Nowe workouty dostają cycleId, stare działają bez zmian. | AKTYWNA |

### v6.4.1 (2026-03-17)

| Data | Decyzja | Kontekst | Status |
|------|---------|----------|--------|
| 2026-03-17 | **savePlan zachowuje startDate/durationWeeks** — always-include zamiast optional spread | `setDoc` nadpisywał cały dokument, kasując metadata planu przy każdej edycji ćwiczenia. Dashboard pokazywał "Tydzień 1/12" zamiast prawidłowego tygodnia. | AKTYWNA |
| 2026-03-17 | **Auto-repair missing startDate** — query earliest workout → Monday → updateDoc | One-time self-healing: jeśli plan nie ma startDate, odtwarza go z historii treningów. Zapobiega konieczności ręcznej naprawy w Firebase. | AKTYWNA |

### v6.4.0 (2026-03-13)

| Data | Decyzja | Kontekst | Status |
|------|---------|----------|--------|
| 2026-03-13 | **Streaming AI Chat (SSE)** — streamOpenAI onRequest + callOpenAIStream na froncie | Token-by-token UX zamiast czekania na pełną odpowiedź. onRequest zamiast onCall bo onCall nie wspiera SSE. | AKTYWNA |
| 2026-03-13 | **Per-user chat w Firestore** — chat_messages collection z userId isolation | Zastępuje localStorage (max 50 msg, ginęły po wylogowaniu) i legacy chat_conversations (brak per-user isolation). One-time migration z localStorage. | AKTYWNA |
| 2026-03-13 | **$5/user/miesiąc AI limit** — ai_usage/{userId_YYYY-MM} z FieldValue.increment() | Ochrona przed nadużyciami. Atomowe inkrementy (concurrent-safe). checkUsageLimit() przed każdym callem. | AKTYWNA |
| 2026-03-13 | **Cost tracking we wszystkich AI functions** — proxyOpenAI, generateWeeklySummary, streamOpenAI | Pełny obraz kosztów per user. Admin widzi global + per-user. | AKTYWNA |
| 2026-03-13 | **Manual auth w streamOpenAI** — Authorization: Bearer {idToken} zamiast onCall auth | onRequest nie ma wbudowanego auth jak onCall. verifyIdToken() ręcznie. | AKTYWNA |
| 2026-03-13 | **chat_conversations DEPRECATED** — zakomentowane w firestore.rules | Zastąpione przez chat_messages z per-user isolation. Legacy collection. | AKTYWNA |

### v6.3.0 (2026-03-12)

| Data | Decyzja | Kontekst | Status |
|------|---------|----------|--------|
| 2026-03-12 | **Resend zamiast SendGrid** — Weekly Digest używa Resend API | User wybrał Resend, prostsze API, darmowy tier wystarczający | AKTYWNA |
| 2026-03-12 | **Auto-detect emaili z Firebase Auth** — `listUsers()` zamiast hardcoded secret | Digest wysyłany do każdego użytkownika z kontem, bez ręcznej konfiguracji | AKTYWNA |
| 2026-03-12 | **Per-user digest** — osobne query workouts + strava per userId | Każdy user dostaje swoje statystyki, nie globalne | AKTYWNA |
| 2026-03-12 | **Kompaktowe karty Strava w TrainingPlan** — inline rows zamiast pełnych StravaActivityCard | Na mobile pełne karty zajmowały za dużo miejsca, rozjeżdżały layout | AKTYWNA |
| 2026-03-12 | **Grupowanie po dacie w timeline** — Strava + trening z tego samego dnia razem | Czystszy layout, data wyświetlana raz, elementy logicznie powiązane | AKTYWNA |

### v6.1.0 (2026-03-11)

| Data | Decyzja | Kontekst | Status |
|------|---------|----------|--------|
| 2026-03-11 | **Exercise Timeline z Recharts** — LineChart (est. 1RM primary + max weight dashed) | Wizualizacja progresji per ćwiczenie, reuse calculate1RM z pr-utils | AKTYWNA |
| 2026-03-11 | **Plateau detection** — brak progresu max weight w ostatnich N sesjach | Prosta heurystyka (domyślnie 4 sesje), alert w dialogu | AKTYWNA |
| 2026-03-11 | **Smart Rest Timer (intensity-based)** — czas odpoczynku zależy od typu ćwiczenia i % 1RM | Compound 90s base, isolation 60s, +30s >80% 1RM, +60s >90% 1RM. Superset first 15s, non-first 60s | AKTYWNA |
| 2026-03-11 | **lookupExerciseType** — lookup compound/isolation z exerciseLibrary | Reuse istniejącej biblioteki, fallback 'compound' dla nieznanych | AKTYWNA |
| 2026-03-11 | **Warmup Routine UI z timerami** — checklist + inline 30s countdown | Dane z warmupStretching.ts (już istniały), focus-based stretching | AKTYWNA |
| 2026-03-11 | **Training Heatmap (GitHub-style)** — grid 53×7 z 5 poziomami intensywności | Łączy workouts + Strava w jedną wizualizację, year selector | AKTYWNA |
| 2026-03-11 | **Share Workout via html2canvas-pro** — generowanie PNG 540×960 (IG story) | Ciemny gradient, stats grid, lista ćwiczeń, navigator.share + download fallback | AKTYWNA |
| 2026-03-11 | **Race Predictor (Riegel formula)** — T2 = T1 × (D2/D1)^1.06 | Predykcje 5K/10K/HM/Marathon z najlepszego effort w Strava | AKTYWNA |
| 2026-03-11 | **Training Load (TRIMP/Banister)** — CTL 42d EWMA, ATL 7d EWMA, TSB = CTL - ATL | Wymaga aktywności z HR, default restHR=60, maxHR z connection | AKTYWNA |
| 2026-03-11 | **Weekly Digest (Cloud Function)** — onSchedule Monday 08:00 Warsaw | HTML email inline CSS, stats grid + Strava highlights, per-user | AKTYWNA |
| 2026-03-11 | **escapeHtml w share-utils** — XSS protection przy innerHTML | Pre-commit hook złapał innerHTML bez sanityzacji, dodano escapeHtml() | AKTYWNA |

### v5.1.0 (2026-03-08)

| Data | Decyzja | Kontekst | Status |
|------|---------|----------|--------|
| 2026-03-08 | **Auto-detect istniejących użytkowników** — w `ensureUserDoc()` sprawdzamy czy user ma workouty → auto `onboardingCompleted: true` | Bug v5.0: istniejący użytkownicy widzieli onboarding i tracili swój plan | AKTYWNA |
| 2026-03-08 | **Przywracanie domyślnego planu** — jeśli existing user nie miał `onboardingCompleted`, przywracamy defaultPlan | Bug v5.0 nadpisywał plany istniejących użytkowników | AKTYWNA |
| 2026-03-08 | **Rozszerzony Weekday type (7 dni)** — `'monday' \| 'tuesday' \| ... \| 'sunday'` | Plany 2-5 dni/tydzień wymagają mappingu na dowolny dzień | AKTYWNA |
| 2026-03-08 | **Dynamiczny getTrainingSchedule()** — akceptuje `weeks` i `days` params | Plany AI mają różną liczbę dni i tygodni | AKTYWNA |
| 2026-03-08 | **Plan duration tracking** — `planDurationWeeks`, `planStartDate`, `currentWeek`, `isPlanExpired` | Plany mają czas trwania (8-16 tygodni), po upływie → nowy plan | AKTYWNA |
| 2026-03-08 | **Banner expired plan** — Dashboard pokazuje banner "Twój plan się zakończył!" z linkiem do /new-plan | UX: jasna komunikacja + call-to-action | AKTYWNA |
| 2026-03-08 | **NewPlan.tsx** — oddzielna strona generowania nowego planu (cel, dni, AI, review, save) | Oddzielony od onboardingu: mniejszy, prostszy, podsumowuje stary plan | AKTYWNA |
| 2026-03-08 | **Review planu po AI generation** — onboarding i NewPlan pokazują plan z "Zamień" buttonsami | User widzi plan PRZED zapisem, może zamienić ćwiczenia | AKTYWNA |
| 2026-03-08 | **ExerciseSwapDialog** — dialog zamiany ćwiczenia z filtrami po kategorii | Filtruje bibliotekę, ukrywa już użyte, zachowuje oryginalne sety | AKTYWNA |
| 2026-03-08 | **GeneratedPlan interface** — `{ days, planDurationWeeks }` zamiast plain array | AI zwraca czas trwania planu (8-12 tygodni) | AKTYWNA |
| 2026-03-08 | **Strava 365 dni lookback** — pierwszy sync pobiera rok wstecz (zamiast 30 dni) | Użytkownicy chcieli widzieć starsze aktywności | AKTYWNA |
| 2026-03-08 | **Strava w planie tygodnia** — Dashboard, TrainingPlan, Analytics, AIChat | Strava aktywności widoczne obok treningów siłowych | AKTYWNA |
| 2026-03-08 | **AI "Podsumuj tydzień" z Strava** — quick action w AIChat buduje prompt z treningami + Strava | Pełny obraz tygodnia: siłownia + bieganie/rower/etc. | AKTYWNA |
| 2026-03-08 | **Klikalne ukończone treningi w Analytics** — `<button>` zamiast `<div>` z navigate | UX: użytkownik może przejść do szczegółów treningu | AKTYWNA |

### v5.0.0 (2026-03-08)

| Data | Decyzja | Kontekst | Status |
|------|---------|----------|--------|
| 2026-03-08 | **AI-powered onboarding** — 5-krokowy wizard → AI generuje plan | Nowi użytkownicy dostają spersonalizowany plan zamiast domyślnego | AKTYWNA |
| 2026-03-08 | **Exercise library (60+ ćwiczeń)** — `exerciseLibrary.ts` z kategoriami i video URL | AI używa nazw z biblioteki (priorytet), swap dialog filtruje po kategoriach | AKTYWNA |
| 2026-03-08 | **AI Coach na Dashboard** — insights: plateau, progress, consistency, suggestion, warning | Analiza treningów po 3+ ukończonych, cache 24h | AKTYWNA |
| 2026-03-08 | **OpenAI integration** — `callOpenAI()` w `ai-coach.ts`, `VITE_OPENAI_API_KEY` | Generowanie planów i AI coaching przez API | AKTYWNA |
| 2026-03-08 | **onboardingCompleted flag** — pole w `users/{uid}` decyduje o onboarding vs Dashboard | Kontrola flow nowych użytkowników | AKTYWNA |

### v4.0.0 (2026-03-08)

| Data | Decyzja | Kontekst | Status |
|------|---------|----------|--------|
| 2026-03-08 | **Multi-user: UserContext + userId** — każdy hook przyjmuje userId, dane izolowane per-user | Dodanie drugiego użytkownika, plany per-user | AKTYWNA |
| 2026-03-08 | **Multi-email whitelist** — `VITE_ALLOWED_EMAILS` (comma-separated) | Skalowalne podejście do autentykacji | AKTYWNA |
| 2026-03-08 | **Admin panel z rolami** — `role: 'admin' \| 'user'`, AdminRoute guard | Admin zarządza planami wszystkich użytkowników | AKTYWNA |
| 2026-03-08 | **Per-user training plans** — `training_plans/{userId}` z days, durationWeeks, startDate | Każdy użytkownik ma własny plan z czasem trwania | AKTYWNA |
| 2026-03-08 | **Strava via Cloud Functions** — stravaAuthUrl, stravaCallback, stravaSync (callable) | OAuth wymaga server-side, token refresh | AKTYWNA |
| 2026-03-08 | **Strava OAuth bridge** — `strava-callback.html` → HashRouter `#/strava/callback` | GitHub Pages + HashRouter = Strava nie może redirectować na hash URL | AKTYWNA |
| 2026-03-08 | **Firestore composite indexes** — userId ASC + date DESC na workouts, measurements, strava_activities | Zapytania z `where('userId')` + `orderBy('date')` | AKTYWNA |
| 2026-03-08 | **Firestore security rules** — użytkownicy czytają/piszą tylko swoje dane, admin read all | Bezpieczeństwo danych multi-user | AKTYWNA |

### v3.1.0 (2026-02-23)

| Data | Decyzja | Kontekst | Status |
|------|---------|----------|--------|
| 2026-02-23 | **Strict TypeScript** — `strict: true` w tsconfig.app.json, zero błędów | Jakość — strictNullChecks, noImplicitAny | AKTYWNA |
| 2026-02-23 | **Testy Vitest** — 25 testów dla exercise-utils i trainingPlan | Pokrycie kluczowych utility functions | AKTYWNA |
| 2026-02-23 | **exercise-utils.ts** — wyciągnięto parseSetCount, createEmptySets, sanitizeSets z ExerciseCard | Testowalność — utility w oddzielnym pliku | AKTYWNA |
| 2026-02-23 | **Strona Postępy** — wykresy recharts: progresja ciężarów + pomiary ciała | Wizualizacja progresu treningowego | AKTYWNA |
| 2026-02-23 | **RestTimer w WorkoutDay** — circular progress, presety, wibracja | Timer dostępny w trakcie treningu (manualne uruchomienie) | AKTYWNA |
| 2026-02-23 | **Dark mode** — ThemeProvider (next-themes) + toggle Sun/Moon | CSS variables, class strategy | AKTYWNA |
| 2026-02-23 | **Error Boundary** — class component owijający App | Fallback UI zamiast białej strony | AKTYWNA |
| 2026-02-23 | **Dashboard: bieżący tydzień** — getThisWeekDates() zamiast getLatestWorkout() | Plan tygodnia nie pokazywał starych treningów | AKTYWNA |
| 2026-02-23 | **Firebase config do .env** — credentials przeniesione do VITE_* | Bezpieczeństwo — klucze poza źródłami | AKTYWNA |
| 2026-02-23 | **React.memo na ExerciseCard** — zapobiega re-renderom | Skakanie UI przy auto-save | AKTYWNA |
| 2026-02-23 | **Debounce 500ms** (wcześniej 300ms) — mniej zapisów do Firebase | Rzadsze zapisy, mniej onSnapshot callbacks | AKTYWNA |
| 2026-02-23 | **Podpowiedź poprzedniego ciężaru** — "Poprzednio: 8×40kg" | User nie musi pamiętać ciężarów | AKTYWNA |

### v3.0.0 (2026-01-28)

| Data | Decyzja | Kontekst | Status |
|------|---------|----------|--------|
| 2026-01-28 | **Seria rozgrzewkowa (warmup)** — pierwsza seria, pomarańczowa, ikona płomienia | Oddzielenie rozgrzewki od serii roboczych | AKTYWNA |
| 2026-01-28 | **Notatki do ćwiczeń** — opcjonalne pole tekstowe pod seriami | Zapisywanie odczuć, uwag technicznych | AKTYWNA |
| 2026-01-28 | **Tryb edycji bez auto-save** — `handleSetsChangeLocal` modyfikuje tylko lokalny state | Auto-save powodował "mryganie" UI | AKTYWNA |
| 2026-01-28 | **Parametr `?date=` w URL** — wszystkie nawigacje do workout przekazują datę | Bez tego kliknięcie na przeszły trening pokazywało dzisiejszą datę | AKTYWNA |
| 2026-01-28 | **Plan tygodniowy od bieżącego poniedziałku** | Wcześniej pokazywał następny tydzień | AKTYWNA |
| 2026-01-28 | **Przycisk "Zapisz zmiany" statyczny** — nie fixed | Fixed button skakał na mobile przy klawiaturze | AKTYWNA |

---

## DECYZJE ARCHITEKTONICZNE

| Data | Decyzja | Kontekst | Status |
|------|---------|----------|--------|
| 2026-01 | **HashRouter zamiast BrowserRouter** | GitHub Pages nie obsługuje server-side routing | AKTYWNA |
| 2026-01 | **Firebase Firestore** | Real-time sync, Google Auth, darmowy tier | AKTYWNA |
| 2026-01 | **Multi-email whitelist** | VITE_ALLOWED_EMAILS (comma-separated) | AKTYWNA |
| 2026-01 | **Sanityzacja danych przed Firebase** | Firebase nie akceptuje `undefined` | AKTYWNA |
| 2026-02 | **OpenAI API client-side** | VITE_OPENAI_API_KEY, bezpośrednie wywołania | AKTYWNA |
| 2026-03 | **Strava OAuth server-side** | Firebase Cloud Functions (callable) | AKTYWNA |
| 2026-03 | **Per-user data isolation** | Firestore security rules + composite indexes | AKTYWNA |
| 2026-03 | **AI plan duration (8-16 weeks)** | AI decyduje na podstawie celu/doświadczenia | AKTYWNA |
| 2026-03 | **SSE streaming via onRequest** | onCall nie wspiera streaming, onRequest + manual Bearer auth | AKTYWNA |
| 2026-03 | **AI cost tracking per-user per-month** | FieldValue.increment() atomowe, $5 limit, ai_usage collection |
| 2026-03 | **Plan Cycles (osobna kolekcja)** | plan_cycles/{autoId} z snapshot planu + stats, archiwizacja przy nowym planie |
| 2026-03 | **Photo share (client-side only)** | FileReader base64, brightness filter, html2canvas-pro, zero upload | AKTYWNA |

---

## ODRZUCONE OPCJE

| Data | Opcja | Powód odrzucenia |
|------|-------|------------------|
| 2026-01-28 | Auto-save w trybie edycji | "Mryganie" i zbędne zapisy Firebase |
| 2026-01-28 | Fixed button na dole (tryb edycji) | Skakał przy klawiaturze na mobile |
| 2026-01 | LocalStorage zamiast Firebase | Brak sync między urządzeniami |
| 2026-01 | BrowserRouter | Nie działa na GitHub Pages |
| 2026-03 | Strava OAuth client-side | Wymaga server-side dla token exchange |
| 2026-03 | Natychmiastowy zapis planu z onboardingu | Użytkownik nie mógł zweryfikować/zamienić ćwiczeń |
| 2026-03 | 30 dni lookback Strava (pierwszy sync) | Za mało aktywności widocznych dla nowych użytkowników |

---

## KONTEKST TECHNICZNY (dla przyszłych sesji)

### Handlery w WorkoutDay.tsx
- `handleSetsChange` → aktywny trening, AUTO-SAVE z debounce 500ms
- `handleSetsChangeLocal` → tryb edycji, TYLKO lokalny state
- `handleFinishEditing` → zapis wszystkiego na raz po edycji

### Struktura SetData
```typescript
interface SetData {
  reps: number;       // Zawsze number, nigdy undefined
  weight: number;     // Zawsze number, nigdy undefined
  completed: boolean; // Zawsze boolean
  isWarmup?: boolean; // Opcjonalne, true tylko dla warmup
}
```

### Nawigacja z datą
```typescript
navigate(`/workout/${dayId}?date=${targetDate}`)
const [searchParams] = useSearchParams();
const targetDate = searchParams.get('date') || today;
```

### Znajdowanie bieżącego poniedziałku
```typescript
const dayOfWeek = start.getDay();
const daysSinceMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
start.setDate(start.getDate() - daysSinceMonday);
```

### Onboarding detection
```typescript
// UserContext.tsx
const workoutsSnap = await getDocs(
  query(collection(db, 'workouts'), where('userId', '==', user.uid), limit(1))
);
const isExistingUser = !workoutsSnap.empty;
// isExistingUser → auto onboardingCompleted: true
```

### Plan expiration
```typescript
// useTrainingPlan.ts
const currentWeek = Math.floor((now - startDate) / (7 * 24 * 60 * 60 * 1000)) + 1;
const isPlanExpired = currentWeek > planDurationWeeks;
```

---

## SESJA 2026-06-05/06 — i18n pełne, katalog 241, 10 planów, onboarding redesign, replan, fixy

### Decyzje produktowe (z ankiet z userem)
- **Plany:** zostawić istniejące, dać lepsze nazwy (bez nazwisk — "Jeremy Ethier" → "Balanced Builder"), dobić do **10** (6 rename + 4 flagowce pod cele onboardingu). Nazwy brandowe Kinetic (Iron Foundation, Push Pull Legs Engine, Upper/Lower Forge, Hypertrophy Split, Tension Protocol; Foundational Strength 5x5, Powerbuilding Protocol, Lean Engine, Kinetic Athlete).
- **Custom ćwiczenia (dodawanie własnych do bazy):** ODPUSZCZONE — katalog 241 wystarczy, user wybiera z katalogu zamiast dodawać. (Firestore per-user custom exercises pominięte.)
- **Katalog:** "idziemy na grubo" — +135 ćwiczeń (maszyny popularnych siłowni + wolne ciężary + BW), nie tylko top 30. Każde komplet PL+EN.
- **Onboarding:** pełny 5-krokowy kreator wg makiet usera (Welcome → Baseline/poziom → Objective/cel → Protocol/dni+harmonogram+data → Precision/rekomendacja). Rekomendacja + przeglądanie 10 + ułóż własny.
- **Replan (po skończeniu planu):** spójny z onboardingiem przez wspólny `PlanWizard`. Start od rekomendacji (pre-fill z profilu) + "Zmień ustawienia". Closeout (świętowanie wyników cyklu) PRZED wyborem. Preview + swap ćwiczeń przed zatwierdzeniem.

### Decyzje techniczne / architektura
- **i18n:** PL pozostaje KANONICZNE w danych (nazwy ćwiczeń/dni/focus = slug CDN, lookup szczegółów, zapis Firestore, resolver historii). Lokalizuje się TYLKO wyświetlanie. Czysta funkcja `translate(lang,key,params)` w `@/i18n` używana też w lib/ (poza Reactem; funkcje lib biorą `lang` z domyślnym 'pl' by testy przeszły). Helpery: localizeExerciseName/Instruction/Category, localizeDayName/Focus/WeekdayShort, dateLocale. Wartości PL w locale dla kluczy asertowanych w testach = 1:1 z oryginałem.
- **Focusy planów** muszą być tokenizowalne przez localizeFocus (mapa słów PL→EN word-by-word) — nowe plany używają prostego słownictwa (Nogi/Klatka/Plecy/Barki, Całe ciało A, Dół/Góra/Kondycja, Siła A), nie wielowyrazowych fraz.
- **PlanWizard** (`src/components/PlanWizard.tsx`) = jedno źródło prawdy dla wyboru planu. Props: showWelcome, initial (pre-fill), startAtPrecision, confirmLabelKey, onConfirm(choice), onExitBack. Onboarding.tsx i NewPlan.tsx = cienkie wrappery (różnią się tylko zapisem: onboarding→completed, replan→archive+cycle).
- **Porównanie cykli:** tonaż liczony NA TRENING (averageTonnagePerWorkout), nie suma — suma świeżego cyklu vs zakończonego zawsze dawała absurdalny minus (-69978 kg).
- **Naprawy danych usera (np. fantomowy cykl):** robione jako narzędzia W APCE (user uruchamia, ma dostęp przez security rules), bo z CLI brak admin-dostępu do Firestore (ADC PERMISSION_DENIED). Przykład: "Usuń cykl" w CycleDetail (deleteCycle odtagowuje cycleId, nie kasuje treningów).
- **Root-cause fantomowych cykli:** auto-repair w Cycles.tsx tworzył duplikaty bo guard na ref żył tylko w jednym mountcie. Fix: guard per planStartDate + localStorage zamiast ref.

### 🔴 WNIOSKI ZE WSZYSTKICH BUILDÓW (kluczowe — biały ekran iOS)
- **Base path = przyczyna białego ekranu na iOS.** `vite.config.ts`: `base: isMobileBuild ? './' : '/strength-save/'`. iOS WKWebView serwuje z roota → WYMAGA builda mobilnego (base `./`). Build webowy (base `/strength-save/`) wgrany do iOS = assety 404 = biały ekran (bez ErrorBoundary, bo bundle się nie ładuje).
- **`npm run deploy` ma predeploy `vite build` (WEB) i NADPISUJE `dist`.** Jeśli po deployu zrobisz `cap sync ios`, skopiujesz build WEBowy do iOS → biały ekran. **Zawsze:** `npm run build:mobile && ./node_modules/.bin/cap sync ios && ./node_modules/.bin/cap run ios --target=<UDID>`. Weryfikacja: `grep 'src="' ios/App/App/public/index.html` musi pokazać `./assets/...`, NIE `/strength-save/assets/...`.
- **`cap sync` NIE wystarcza** do zobaczenia zmian na uruchomionej apce iOS — trzeba `cap run` (xcodebuild przebudowuje .app). Sam `cap sync` tylko kopiuje pliki.
- **Service worker NIE był przyczyną** białego ekranu (fresh uninstall+reinstall też był biały) — to czysto base path. (Ale SW PWA w WKWebView to potencjalne źródło problemów z cache przy update.)
- **RTK hook** przepisuje `npx cap` → `npm cap` (błąd "Missing script") — używaj `./node_modules/.bin/cap`.
- **Weryfikacja wizualna bez urządzenia:** Chrome-extension MCP bywa offline; WKWebView nie pipuje konsoli JS do stdout (OSLog = systemowy szum). Działa **Playwright** (headless chromium) + dev server z `.env.local` `VITE_E2E_MODE=true` + `addInitScript` ustawiający localStorage `fittracker_e2e_auth_state={"scenario":"new-user"|"active-admin"}`. PO TEŚCIE USUŃ `.env.local` (E2E-bypass nie może trafić na produkcję). `waitUntil:'domcontentloaded'` (NIE 'networkidle' — HMR websocket wisi). Onboarding = new-user; replan `/new-plan` = active-admin.
- **Multi-plik scalanie danych (i18n/ćwiczenia):** agenci piszą fragmenty (JSON/klucze), główny agent scala deterministycznie skryptem ze sprawdzeniem dup/parity/kolizji — zero równoległej edycji wspólnych plików. tsc waliduje komplet (en typowany `Record<keyof typeof pl,string>`).
- **Każdy etap weryfikowany:** `npx tsc --noEmit -p tsconfig.app.json` + `npx eslint .` + `npm run build:mobile` + `npx vitest run` (219 testów). Build/testy NIE łapią błędu base-path (to runtime iOS) — dlatego potrzebny screenshot symulatora po `cap run`.

---

## SESJA 2026-06-10 — audyt 20 agentów + naprawa 13 HIGH + 9 funkcji UX (v6.12.0)

**Audyt:** 20 agentów (po jednym na obszar) + adwersaryjna weryfikacja każdego critical/high. Wynik: 141 znalezisk, 140 potwierdzonych (0 critical, 13 high, 74 medium, 53 low). Pełny raport: `audit/AUDYT_KOMPLETNY_2026-06-10.md`.

**Naprawione wszystkie 13 HIGH:**
1. `VITE_OPENAI_API_KEY` usunięty z CI (deploy.yml) i z sekretów repo — klient go nie używał. UWAGA: klucz był publiczny w bundlu do 2026-03-09 → wymaga ROTACJI w OpenAI dashboard (manualnie).
2. Konflikt dwóch urządzeń: seed `cloudUpdatedAt` (cloudMetaRef) + kolejka sync nie wycina już pól + dialog "Zachowaj moją / Pobierz z chmury" zamiast cichego nadpisania.
3. `savePlan`: guard na `isLoaded` + `merge: true` (zapis przed snapshotem kasował custom plan).
4. Swap w podglądzie NewPlan przez `swapExerciseIdentity` (videoUrl: undefined wywalał setDoc).
5. Powrót preview→wizard przywraca stan (prop `resume` w PlanWizard + initialDays w PlanBuilder).
6. Reset planu (PlanEditor) za AlertDialogiem.
7. Pre-fill wag: fallback po nazwie ćwiczenia z całej historii (id zmieniają się między cyklami).
8. Reconnect Strava kasuje aktywności TYLKO przy zmianie konta (athleteId); to samo konto zachowuje historię >365 dni.
9. Disconnect Strava z potwierdzeniem (ostrzeżenie o utracie).
10. Flagi admina (config/feature_flags) faktycznie egzekwowane: aiEnabled w assertAiEnabled, registrationOpen w syncUserProfile (kill switch na cost abuse); generateWeeklySummary ma bramkę AI.
11. Streak: parseLocalDate zamiast new Date('YYYY-MM-DD') — poniedziałki liczone w UTC+ (test regresyjny).
12. Self-service usunięcie konta (Apple 5.1.1(v)): callable deleteOwnAccount + wspólny purgeUserData (też avatary Storage i app_telemetry_daily) + dialog z wpisaniem USUŃ w Profilu.
13. Import backupu z dialogiem podsumowania (data, liczby, nadpisania) zamiast natychmiastowego wykonania.

**Funkcje UX (1-6, 8-10; 7 pominięta na życzenie):**
- AutoSyncOnReconnect: zaległe final-synci domykane po powrocie online; wskaźnik zapisu 2 stany ("na telefonie"/"w chmurze HH:MM").
- Pełny backup (plan+cykle, schemaVersion 2), import batchami bez limitu 500, updatedAt/revision zachowane.
- ConfirmDialog (wspólny) wpięty w cleanup/merge/reset admina/API keys.
- Szkice kreatora planu w localStorage (builder + preview) z bannerem "kontynuować?".
- PreferenceSync: users/{uid}.preferences (jednostki, język, timer, dźwięk) między web i iOS; users.language pisany dla push/digest.
- Dashboard: planEnded (wygasły LUB zakończony wcześniej), odliczanie "startuje za X dni", karta przedłużenia ZAMIAST cichego auto-startu cyklu.
- Odznaki z paskiem postępu (%), podpowiedź "zrób jeszcze N treningów, aby utrzymać serię".
- Profil linkuje do sekcji Ustawień (?section= + scroll), wykres tonażu z zakresem 8/12 tyg/Wszystko (domyślnie 12).

**Wcześniej w tej sesji:** zawsze ciemny motyw (forcedTheme, usunięty toggle) + licznik ukończonych treningów w nagłówku; iOS build 25 na TestFlight.

**Do zrobienia ręcznie:** rotacja klucza OpenAI w dashboardzie OpenAI (sekret w Secret Manager: openai-api-key) — stary był publiczny w bundlu GH Pages do 2026-03-09.

## SESJA 2026-06-11 — grywalizacja: tarcza serii, odznaki specjalne, medale sezonów

- **Tarcza serii (streak freeze):** `calculateStreakDetails` w `summary-utils.ts`. Tydzień bez 2 treningów nie zeruje serii, jeśli starszy tydzień jest zaliczony i poprzednia tarcza była >=4 tyg. wcześniej (max ~1/mies.). Bieżący tydzień nigdy nie łamie serii (naprawia reset w poniedziałek). Notka na Dashboardzie gdy tarcza uratowała zeszły tydzień.
- **Odznaki specjalne:** `computeSpecialBadges` (achievements-utils): Ranny ptaszek (<7:00), Comeback (21+ dni przerwy), Niedzielny wojownik, Konsekwentny (4 tyg. z kompletem planu). Sekcja w Achievements.
- **Medale sezonów:** `season-medals.ts` (złoto >=85%, srebro >=65%, brąz >=40% frekwencji). Chip na closeout cyklu + sekcja "Półka medali" w Achievements.
- Wdrożone: web (GH Pages) + iOS TestFlight build 27.
- **UWAGA build 27 z czystego worktree:** w repo trwa równoległa praca nad Apple Watch (useWatchWorkoutSync, watch-bridge, target StrengthWatch w pbxproj — NIEZACOMMITOWANE). Deploy i build iOS zrobione z czystego HEAD, żeby nie wypuścić WIP. Numer buildu 27 podbity TYLKO w worktree — pbxproj w repo dalej ma 26; przy commitowaniu pracy nad Watch ustawić CURRENT_PROJECT_VERSION >= 28.

---

## SESJA 2026-08-10 — X25 Z228: deterministyczne sekwencje cross-device

**Root cause danych:** `clampSet` wycinał `updatedAt` przed Firestore, a konflikt rewizji
stosował globalne local-wins. W sekwencji iOS -> Watch -> edycja web -> finish starszy
lokalny snapshot mógł cofnąć nowszą serię z web. Decyzja: jedna polityka per-set LWW
`(updatedAt, updatedEventId)` w TS, Swift i Garmin Functions; konflikt pobiera cloud,
robi rebase i retry na świeżej rewizji. Metadane są addytywne i zachowane w Firestore.

**Root cause entitlementu Watch:** capability miało tylko `active=false`, więc expiry
i revoke były nierozróżnialne. Decyzja: `inactiveReason=expired|revoked|inactive`;
expiry pozwala domknąć wyłącznie już aktywną sesję i zachowuje pending, revoke blokuje
nowe eventy fail-closed bez cichego kasowania kolejki.

**E2E:** harness po utwardzeniu P0 nadal nie uruchamiał Functions i oczekiwał fallbacku
profilu po błędzie `syncUserProfile`. Decyzja: E2E uruchamia Auth+Firestore+Functions,
buduje Functions przed startem i generuje ignorowany fixture `.secret.local`, aby nie
sięgać do Secret Manager. Fixture aktywnego usera ma wysłany welcome mail; naprawa 501
rekordów używa roli admin zgodnie z Z90.4. Wynik 13/13 PASS.

**Brama fizyczna:** iPhone offline, brak Watch/Android/Garmin. W1-W9, G1-G9 i D1-D4
pozostają jawnie otwarte; automatyczne testy nie zostały przedstawione jako real-device.

---

## SESJA 2026-08-10 — X25 Z229: release readiness bez obchodzenia App Attest

**Apple signing:** trzy targety zachowują manualne profile App Store. Próba
Automatic provisioning szukała profili Development, a wymuszenie Apple Distribution
konfliktowało targety i SPM, więc eksperyment wycofano. Nowo wygenerowany profil
`Strength Save App Store` nadal nie ma entitlementu App Attest, ponieważ capability
nie jest włączone na App ID. Decyzja: nie usuwać produkcyjnego App Attest; portalowe
włączenie capability i podpisany archive pozostają twardą bramą.

**Privacy/review:** aplikacja i Watch dostały osobne, uczciwe privacy manifests z
UserDefaults `CA92.1`; oba są osadzone w zasobach. Review notes opisują jeden
HKWorkout, brak paywalla na zegarku i wspólny entitlement.

**Garmin Store:** manifest rozszerzono o prostokątny Venu Sq 2. Wszystkie 16 ID
budują się na SDK 9.2.0, a podpisany export ma 27 PRG. Symulator potwierdza prawdziwy
ekran aplikacji na FR255 (round/buttons) i Venu Sq 2 (rectangle/touch) bez konta i
bez zakończenia treningu. Klucz i lokalny backup poza repo mają ten sam checksum;
off-host backup, fizyczne G1-G9 i portalowy submit pozostają bramami.

---

## SESJA 2026-08-19 — audyt realizacyjny A-T0: stabilna baza i baseline startu

**Root cause:** pięć testów `session-rating-progression` nie przekazywało `todayISO`, więc
19 sierpnia automatycznie przekroczyły produkcyjny próg comeback 14 dni i zaczęły oczekiwać
progresji, choć silnik poprawnie zwracał deload. To był błąd testu, nie algorytmu.

**Decyzja:** wstrzyknąć stałe `todayISO` wyłącznie do pięciu przypadków oceny sesji i
utrzymać osobne testy dokładnej granicy 13/14 dni. Nie zmieniać kodu produkcyjnego. Baseline
startu wykonać bez realnego konta na produkcyjnym buildzie z syntetycznym E2E userem i
jednoznacznie nazwać go emulacją webową, nie real-device.

**Dowód (`351e026a`):** RED 5/10 → testy celowane 19/19 GREEN; pełny Vitest 220/220
plików, 1662/1662 testów; typecheck, lint, build i bundle budget GREEN. Raport
`docs/BASELINE-START-A-T0-2026-08-19.md`: pięć prób warm/cold/offline, mediany
68/239/147 ms; initial JS 1 298 679 B przy niezmienionym limicie 1 536 000 B.

---

## SESJA 2026-08-19 — audyt realizacyjny A-T1: cache-first profil

**Root cause:** `UserProvider` awaitował sieciowy `syncUserProfile` przed utworzeniem
listenera dokumentu usera. Persistent cache Firestore istniał, lecz kod nie miał jak go
odczytać przed zakończeniem callable. Dodatkowo natywny protokół nie miał deadline'u, a
błąd sync zerował poprawny cached profil.

**Decyzja:** listener `users/{uid}` z metadanymi cache powstaje pierwszy, callable działa
równolegle i jest ponawiany po `online`. Istniejący cached profil — także `suspended` —
jest pokazywany zgodnie ze swoim serwerowym statusem; pusty cache niczego nie tworzy.
Błąd sieci zachowuje ostatni profil. Zmiana UID unieważnia callbacki i profil jest używany
tylko, gdy `profile.uid === userId`. Natywne callable mają wspólny deadline 10 s obejmujący
Auth, App Check i fetch, z abortem requestu.

**Dowód (`bf985779`):** bootstrap RED 6/6 → GREEN 7/7 (w tym stary flow nowego usera),
native timeout RED `still-pending` → 8/8 GREEN; pełny Vitest 1668/1668, typecheck, lint,
build i bundle budget GREEN. Nie użyto realnego konta. Fizyczny airplane/force-quit jest
nadal otwartą bramką A-T5, nie został przedstawiony jako PASS.

---

## SESJA 2026-08-19 — audyt realizacyjny A-T2: jeden start i mierzalny bootstrap

**Root cause:** start miał trzy niespójne loadery (dwa z wirującym kółkiem), Android używał
innego artworku niż web/iOS, a oczekiwanie na RevenueCat i zdalny lookup treningów nie miało
deadline'u. Marker Dashboardu początkowo mógłby kłamać przy samym mouncie, zanim doszły
workouty i plan.

**Decyzja:** jeden `BootScreen` ma małe logo 64×64 i cienki pasek indeterminate; natywne
launch screeny mają dokładnie ten sam znak, rozmiar, środek i tło. Serwerowo potwierdzone
Firestore PRO/admin ma pierwszeństwo przed RevenueCat. RC i lookup treningów kończą się po
1500 ms, a sync profilu web po 10 s; timeout nie fabrykuje PRO. Lookup treningów czyta cache
pierwszy i zachowuje istniejący fail-open/read-only, żeby dane usera nie stały się zakładnikiem.
`dashboard-interactive` powstaje dopiero przy `isLoaded && planIsLoaded`.

**Dowód (`c300aa4d`):** RED brak 3 modułów + 2 czerwone scenariusze RC; GREEN 1681/1681,
typecheck/lint/build/bundle/dist/offline/no-emoji, Android resources i iOS simulator build.
Raport `docs/RAPORT-START-A-T2-2026-08-19.md` zapisuje pięć prób warm/cold/offline/weak,
mediany markerów 48/207/100/1984 ms i dokładne bottlenecks. Initial JS 1 300 254 B przy
niezmienionym limicie 1 536 000 B; bez spekulacyjnego splitu Firebase. Fizyczny iPhone był
offline, więc real-device cold/kill nie został przedstawiony jako PASS i pozostaje w A-T5.

---

## SESJA 2026-08-19 — audyt realizacyjny A-T3: ciche wznowienie draftu

**Root cause:** hydracja każdego dirty draftu wywoływała toast niezależnie od tego, czy
user musiał coś zrobić. Z kolei czerwony stan po drugim totalnym failu zapisu miał tylko
mały przycisk zamknięcia (~28 px), bez retry i bez bezpiecznej ścieżki odrzucenia. Ten sam
`saveError` obsługiwał też błędy chmury, więc wspólne retry lokalne zepsułoby stary flow.

**Decyzja:** zwykłe odzyskanie jest całkowicie ciche, ale nadal emituje
`draft_recovered`. Tylko `finalSyncPending` oraz rozpoznany totalny błąd lokalny dostają
kompaktowy status z retry, odrzuceniem po destrukcyjnym potwierdzeniu i celem zamknięcia
44×44. Ogólne błędy chmury zachowują komunikat bez fałszywej akcji lokalnej. Odrzucenie
czyści draft i referencję kolejki, wysyła wspólny event stanu i dopiero potem nawiguje.

**Dowód (`77b37a16`):** RED brak komponentu → GREEN 87/87 zakresu; corrupted IDB
odtwarza scoped localStorage; pełny Vitest 226/226 i 1686/1686, typecheck/lint/build,
bundle/dist/offline/no-emoji GREEN. E2E mock 11/11, osobna sekwencja renderer
suspend→resume→kill 1/1, bez realnego konta; niezmiennik plan→szybki trening→powrót
zachowuje wszystkie ćwiczenia.

**Jawna bramka native:** dodatkowy simulator build nie doszedł do uruchomienia przez
istniejący błąd targetu `StrengthWatchWidgets`: Swift kompiluje go jako iOS 15, gdzie
`accessoryCorner` jest niedostępne, a `containerBackground` wymaga iOS 17. Nie maskujemy
tego wyniku; poprawka i realny lock 2 min pozostają częścią A-T5/A-RELEASE.

---

## SESJA 2026-08-19 — audyt realizacyjny A-T4: blackouty i warstwy blokujące

**Root cause:** Dashboard otwierał `LapseTray` automatycznie po samej detekcji zaległości,
a pełnoekranowe powierzchnie powstawały w kilku niezależnych systemach (Radix, timer,
completion, live-PR) bez wspólnej arbitraży. Cleanup blokad `body` działał tylko po crashu,
nie po każdym awaryjnym unmountcie. Crash guard rozpoznawał sam tekst `INTERNAL ASSERTION
FAILED`, więc mógł przeładować aplikację po asercji obcego SDK, zanim jawnie zabezpieczył
najświeższy snapshot treningu.

**Decyzja:** zaległość jest priorytetową, ale nieblokującą kartą statusu i dopiero CTA
otwiera tray. Każda blokująca warstwa zgłasza się do jednego lekkiego kontraktu eventowego;
nowa warstwa zamyka poprzednią, a custom fullscreeny mają jawny X 44×44. Cleanup body
czeka do microtaska i działa tylko, gdy nie istnieje inny otwarty overlay. Hard reload
jest dozwolony wyłącznie dla komunikatu zawierającego Firestore oraz jego internal
assertion, nadal najwyżej raz na 2 minuty. Przed reloadem `WorkoutDay` buduje snapshot z
żywych refów i synchronicznie zapisuje go do istniejącego scoped fallbacku localStorage.

**Dowód (`a5cae77b`):** RED pięciu kontraktów + RED brak awaryjnego fallbacku; GREEN
84/84 zakresu. Pełny Vitest 230/230 i 1693/1693, typecheck, lint, build,
bundle/dist/offline/no-emoji GREEN. Playwright 2/2 potwierdza brak osieroconego scroll-locka
oraz komplet serii po kill→resume bez realnego konta. Natywny `appStateChange` ma osobny
test repaintu; fizyczne zgaszenie ekranu na 2 minuty pozostaje bramką A-T5.

---

## SESJA 2026-08-19 — audyt realizacyjny A-T5: produkcyjny kontrakt offline

**Root cause:** dotychczasowy `check:dist-offline` sprawdzał tylko, czy anonimowy root
wyrenderował się z precache. Nie dowodził odtworzenia Firebase Auth, profilu, planu,
konkretnego CTA, nieogrzanego lazy route ani lokalnego zapisu serii. Emulatorowe E2E
mogły też ominąć prawdziwy `UserProvider`, a wspólny scenariusz kolejek zegarków nie miał
jednego jawnego testu offline→retry→dedup.

**Decyzja:** bramka buduje dokładny webowy `dist`, seeduje wyłącznie syntetycznego usera
w lokalnych Auth/Firestore, loguje się prawdziwym Firebase Auth, a potem odcina cały
kontekst sieciowy. Produkcyjny build może wybrać emulatory tylko jawnym parametrem na
przeglądarkowym loopback; natywny Capacitor jest zawsze fail-closed. Osobne E2E uruchamiają
prawdziwy `UserProvider` dla active/suspended/no-cache. Niezmiennik reconnect deduplikuje
draft i wpis kolejki do jednego final, Watch zapisuje przed transportem i usuwa po ACK,
a Garmin trzyma Storage do udanego, idempotentnego ingest.

**Dowód (`1874a53e`):** początkowy RED brak modułu runtime oraz osobny RED ochrony native;
GREEN 232/232 pliki i 1699/1699 testów, typecheck, lint, build, bundle/dist/offline/no-emoji.
E2E Auth+Firestore+Functions 3/3 bez bypassu oraz Chromium/WebKit kill/offline 6/6.
Mobile build z base `./` kompiluje pełny iOS scheme; iPhone i Watch uruchamiają App oraz
osadzony `StrengthWatch`/widget (1.0.0 build 103). Android `assembleDebug`, Garmin `epix2`
i trzy testy trwałości/dedupu są GREEN. Nie użyto realnego konta ani produkcyjnego zapisu.

**Jawny blocker:** `xcrun devicectl list devices` pokazuje `Iphone (Greg)` jako
`unavailable`; `adb devices -l` jest puste, a lokalny Android SDK nie ma emulatora/AVD.
Brak też fizycznych Apple Watch i Garmin. Symulator nie dowodzi 2-minutowego locka ani
suspendu WKWebView, więc A-T5 i A-RELEASE pozostają otwarte. Dokładna procedura domknięcia
i komplet dowodów są w `docs/RAPORT-OFFLINE-A-T5-2026-08-19.md`.

### Ponowny audyt A-T5 po uruchomieniu natywnych symulatorów

**Nowy RED i root cause:** po Androidowym `force-stop` cold start odzyskiwał Auth, lecz
Firestore zgłaszał `Failed to obtain exclusive access to the persistence layer`. Konfiguracja
`persistentSingleTabManager()` zakładała zwolnienie lease przez poprzednią instancję, czego
natywny kill nie gwarantuje. Najmniejsza odwracalna poprawka to wieloinstancyjny manager
persistence; test źródłowy zachowuje też stary niezmiennik lokalnego cache (`00d1a178`).

**Decyzja o dowodzie:** symulator może domknąć wszystkie prace niezależne od sprzętu, ale
nie zmienia kryterium fizycznego. Na AOSP API 35 przeszedł cały przebieg z ekranem uśpionym
129 s. Na iOS Simulator ekran był fizycznie wyłączony przez 130 s, następnie wykonano resume,
dwa kille i final offline. Po reconnect lokalny Firestore miał dokładnie jeden workout z
jedną ukończoną serią 100 kg × 5, a Dashboard 1 trening / 0,5 t. Wszystko odbyło się na
syntetycznych kontach emulatorów; produkcja i realne konto nie zostały dotknięte.

**Bramki po poprawce:** Vitest 233/233 pliki i 1700/1700 testów, typecheck, lint, build,
bundle budget, dist smoke/offline i no-emoji GREEN. Android `assembleDebug`, Garmin `epix2`
oraz pełny scheme iOS z produkcyjnego mobile bundle są GREEN; iOS artefakt 1.0.0 (103)
zawiera `StrengthWatch.app` i `StrengthWatchWidgets.appex`. Globalnego `-sdk
iphonesimulator` nie wolno używać dla pełnego scheme, bo nadpisuje `SDKROOT=watchos`
targetu widgetu i tworzy fałszywy błąd kompilacji jako iOS.

**Pozostały blocker:** `Iphone (Greg)` nadal `unavailable`; po wyłączeniu AVD ADB jest
puste, Garmin nie występuje w USB, a jedyna aktywna para Watch jest symulatorem. Dwa ostatnie
punkty A-T5 oraz A-RELEASE pozostają otwarte do testów fizycznych czterech rodzin urządzeń.

### Fizyczny Garmin A-T5: cache dnia po błędzie transportu

**Nowy RED i root cause:** na prawdziwym EPIX 2 cold launch w trybie samolotowym pokazał
`Brak łączności. Ponowić? (-104)`, mimo że dzisiejszy plan był w Storage. Konto techniczne
nie miało historii, a endpoint celowo pomijał puste `r`; klient interpretował brak klucza
`recents` jako niepełny cache i wymuszał fetch przy każdym starcie. Ujemny błąd transportu
zastępował wtedy poprawny cache ekranem retry.

**Decyzja:** po odpowiedzi dnia zawsze zapisywać `recents` (także pustą tablicę), a po
ujemnym kodzie transportu użyć cache wyłącznie wtedy, gdy jego data jest dokładnie dzisiejsza.
Nie rozszerzać uprawnień: 401/403/5xx, brak cache i dzień z inną datą pozostają fail-closed.
Zmiana jest chirurgiczna i odwracalna (`f127039e`). Fizyczny QA używa osobnego UUID,
syntetycznego UID `garmin-at5-20260819` i wariantu bez zapisu FIT, więc nie zapisuje serii
na realnym koncie ani treningu w prywatnym Garmin Connect.

**Weryfikacja:** kontrakt najpierw RED, potem 6/6 GREEN; functions zakres 9/9, wearable
offline 3/3, pełne Vitest 233/233 pliki i 1700/1700 testów, functions 223/223, typecheck,
lint, build, bundle/dist/offline/no-emoji oraz produkcyjny i QA `epix2` GREEN. Fizyczny
przebieg: cold offline bez `-104`, 17,5 kg asysty + 25 m offline, ekran zgaszony 2 min,
kill/cold z kolejką 2, finish offline zachował kolejkę, drugi kill również, a pojedynczy
finish po reconnect dał ACK i kolejkę 0. Firestore nadal ma jeden kanoniczny dokument,
z pięcioma seriami i `revision=2`; nie powstał duplikat ani FIT. Cloud Logging nie był
dostępny dla aktywnego konta (`PERMISSION_DENIED`) i nie jest przedstawiany jako dowód.
Garmin jest PASS; całe A-T5 pozostaje BLOCKED do fizycznych iOS, Android i Apple Watch.

### Garmin A-T5: natychmiastowy podgląd wartości lokalnej i bezpośredni sideload

**Finding:** fizyczny test dowiódł, że kolejka Storage zachowała 17,5 kg asysty i 25 m,
ale menu przed ingest pokazywało wyłącznie `1/1`. Po serwerowym merge wartości były
poprawne, więc root cause leżał w prezentacji: `exerciseSubLabel` zawsze renderował cel
planu, nigdy ostatni wpis z lokalnego `done`.

**Decyzja:** formatter ostatniej zaliczonej serii czyta właściwy kompaktowy układ `done`
(`[reps, kg, at, duration, distance, assist, warmup]`) dla czterech tracking types. Menu
zachowuje licznik i używa lokalnej wartości jako rozszerzenia; bez wpisu nadal pokazuje
stary target. RED → minimalny fix i test niezmiennika są w `5827b395`.

**Weryfikacja i wdrożenie:** functions 224/224, pełne Vitest 1700/1700, typecheck, lint,
build, bundle/dist/offline/no-emoji oraz produkcyjny `epix2` GREEN. Właściciel jawnie
zrezygnował z drugiego wariantu QA i polecił zastąpić główny PRG. Artefakt produkcyjny
SHA-256 `d3165176b9b0c0cc2520e36a1b1875aa255f06f37641790122823e9ce9081ad9` został
zainstalowany bez kasowania Storage; aplikacja uruchamia się normalnie, zachowała konto
i plan oraz pokazuje najbliższy trening na czwartek. Nie wykonano nowej sztucznej serii
tylko po to, by ponownie zobaczyć etykietę, więc ten ręczny detal pozostaje jawnie
niezweryfikowany. Publiczny Connect IQ Store nadal czeka na wspólny A-RELEASE.

### A-T5: aktualizacja kryteriów fizycznych przez właściciela

Właściciel 2026-08-19 jawnie zezwolił na testowanie buildów na swoim realnym koncie
Strength Save oraz na uznanie interaktywnego Apple Watch Simulator zamiast fizycznego
zegarka. To zastępuje wcześniejsze ograniczenie sesji wyłącznie do kont syntetycznych
w zakresie ręcznych testów właściciela; agent nadal ogranicza zapis do jednej wyraźnej
sesji, najpierw sprawdza brak zaległej synchronizacji i nie usuwa danych bez osobnego
potwierdzenia. iOS i Android nadal wymagają prawdziwych urządzeń. Watch musi przejść pełną
sekwencję offline → restart → reconnect → ACK na sparowanym symulatorze, nie tylko build.

---

## SESJA 2026-08-27 — trwały alias promocji draftu

**Root cause:** blokada wskrzeszenia provisional draftu po promocji do remote była
przechowywana w pamięci i localStorage. Safari/WKWebView może odrzucić zapis localStorage
albo uruchomić nowy proces bez pamięci, więc późny callback UI mógł ponownie utworzyć
usunięty provisional i osierocić finalną synchronizację.

**Decyzja:** alias `provisional → remote` jest osobną kopertą w istniejącym store IDB i
powstaje w tej samej transakcji co usunięcie provisional oraz zapis remote. Resolver czyta
pamięć → localStorage → IDB z jednym świeżym połączeniem po resume. `saveActiveDraft`
sprawdza alias także wewnątrz kolejki, bez pętli i bez masowego kasowania.

**Weryfikacja:** czerwone testy odtworzyły utratę localStorage, null resolver i późny zapis;
po poprawce test race z `QuotaExceededError`, 104 testy storage/sync, typecheck i lint są
zielone. Fizyczny force-kill iOS/Android pozostaje osobną bramką — test automatyczny nie
jest przedstawiany jako dowód urządzeniowy.

---

## SESJA 2026-08-27 — „Zgłoś błąd” jako prywatny, odporny na przerwanie przepływ

**Root cause:** Profil oferował tylko `mailto:`. Nie było strukturalnego zgłoszenia,
idempotencji, limitu, panelu triage ani sposobu bezpiecznego dołączenia obrazu. Zwykły
upload oryginału mógłby zachować EXIF/GPS, a Android może zabić Activity podczas systemowego
Photo Pickera i zgubić załącznik oraz kontekst.

**Decyzja:** przed własnym pickerem używamy oficjalnego `@capacitor/camera` 8.2.3,
zgodnego z Capacitor 8.4. Formularz zapisuje tekst i UUID lokalnie. Picker uzbraja prywatny
binding w IndexedDB; `appRestoredResult` przyjmuje wyłącznie `Camera / chooseFromGallery`
i przechowuje Blob maksymalnie 24 h. Przed uploadem obraz jest zawsze ponownie kodowany do
JPEG, bez fallbacku do oryginału. Backend realizuje `create → upload → finalize`, wymaga
Auth/App Check/aktywnego konta, używa dokładnej ścieżki Storage i limitu 3/h, 10/d. Reguły
blokują bezpośredni zapis Firestore oraz odczyt/nadpisanie/usunięcie screenshotu przez
klienta. E-mail jest best-effort: jego awaria nie usuwa przyjętego raportu. `mailto:`
pozostaje ścieżką awaryjną. GDPR purge obejmuje raporty, licznik i cały prefix Storage.

**Panel i retencja:** administrator widzi 100 najnowszych zgłoszeń, filtruje status i
kategorię, a zmianę statusu wykonuje tylko chroniony callable z zamkniętym grafem
przejść. Screenshot nie ma publicznego URL; osobny callable wydaje dokładnie 5-minutowy
V4 signed URL po ponownym sprawdzeniu roli i ścieżki. E-mail zgłaszającego jest snapshotem
wyłącznie z tokenu Auth i nie zmienia się przy idempotentnym retry. Raporty mają retencję
180 dni, porzucone uploady 24 h, a godzinny scheduler usuwa Storage przed dokumentem.

**Weryfikacja:** testy zaczęły się od brakujących modułów (RED). Frontend ma 30/30 testów
formularza, draftu, sanitizera, API, Camera recovery, pickera i panelu; Functions test
kontraktu 16/16, pełny Functions 432/432 (+10 pominiętych), emulator integracyjny 10/10,
Firestore Rules 275/275 i Storage Rules 11/11. Typecheck web/Functions i build Functions
są zielone. Produkcyjny audit zależności root/Functions = 0. Nie wysłano testowego raportu
na realnym koncie.

**Prywatność i operacje:** screenshot jest opcjonalny, UI ostrzega o danych osobowych, a
e-mail nie zawiera obrazu. Publiczne wydanie nadal wymaga dopisania celu, odbiorcy i
retencji do polityki prywatności w osobnym repozytorium landingu
(`strengthsave.app/privacy`), ustawienia czterech sekretów Amazon SES, wdrożenia
Functions/rules oraz testu odbioru e-maila i triage na koncie QA. Brak tych kroków jest blockerem,
nie powodem do omijania App Check ani publikacji publicznego pliku.

---

## SESJA 2026-08-27 — klawiatura nie może zasłaniać CTA ani wyjścia z modalu

**Root cause:** trzy lokalne klasy omijały wspólny kontrakt `--keyboard-inset`:
`AddCardioDialog` nadpisywał bazowy limit przez `max-h-[85vh]`, a dolne arkusze edycji
pomiaru i kalkulatora talerzy były zakotwiczone w `bottom-0` z `max-h-[92vh]`. Po wysunięciu
klawiatury CTA mogło znaleźć się pod nią. W nowym dialogu zgłoszenia zewnętrzny scroll
potrafił dodatkowo odsunąć X i przyciąć footer.

**Decyzja:** dialog cardio dziedziczy bazowy keyboard-aware `DialogContent`; oba Sheet
używają `bottom-[var(--keyboard-inset,0px)]` i wysokości od widocznego `100dvh`. Dialog
zgłoszenia ma trzy wiersze grid: stały header, wewnętrzny scroll `minmax(0,1fr)` i stały
footer, dzięki czemu X, Wyślij i Anuluj pozostają osiągalne. Nie zmieniamy globalnego Sheet,
żeby nie ryzykować regresji arkuszy bez inputów.

**Weryfikacja:** trzy kontrakty były czerwone przed poprawką; 38/38 testów dialogów po
poprawce jest zielone. Playwright na świeżym Vite/cache: 6/6 Chromium+WebKit dla zgłoszenia,
własnego ćwiczenia i kalkulatora, z symulowanym insetem 300 px oraz screenshotami w
`audit/shots/2026-08-27/keyboard-*.png`. To nie zastępuje fizycznego iOS/Android.

---

## SESJA 2026-08-27 — jawna rejestracja lokalnego HealthSync na iOS

**Root cause:** decyzja X15C z 2026-07-19 błędnie zakładała auto-rejestrację lokalnego
`CAPBridgedPlugin`. W Capacitor 8.4 `HealthSyncPlugin.swift` był kompilowany, ale nie był
ani w wygenerowanym `packageClassList`, ani rejestrowany przez lokalny
`BridgeViewController`. Warstwa JS łapie błąd `isAvailable` i zwraca `false`, więc build
i smoke samego uruchomienia nie ujawniały martwego mostu HealthKit.

**Decyzja:** tak jak `WatchBridgePlugin` i `TimerSoundPlugin`, lokalny
`HealthSyncPlugin()` jest jawnie rejestrowany w `capacitorDidLoad()`. Kontrakt źródłowy
czyta rzeczywisty kontroler i chroni rejestrację przed kolejną migracją Capacitor.

**Weryfikacja:** nowy test najpierw był RED, po minimalnej zmianie 4/4 testy
`health-platform-contract` są zielone. Kompilacja i uruchomienie symulatora iOS oraz
realny odczyt/zapis HealthKit pozostają częścią bramki natywnej; test źródłowy nie jest
przedstawiany jako dowód zgody ani zapisu danych zdrowotnych.

---

## SESJA 2026-08-27 — jeden transport Amazon SES dla wszystkich aktywnych maili

**Root cause:** backend miał dwa różne modele dostarczania poczty. Maile treningowe
używały lokalnej implementacji SES z fallbackiem Resend w `index.ts`, natomiast
rejestracja, weryfikacja, zaproszenia, digesty, alerty i nowe zgłoszenia błędów używały
Resend bezpośrednio. Powielało to obsługę błędów i sekretów, a `emailDelivery: sent`
mogło błędnie sugerować doręczenie, chociaż provider tylko przyjął wiadomość.

**Decyzja:** cały aktywny runtime e-mailowy korzysta z jednego adaptera
`functions/src/ses-email.ts` opartego na `@aws-sdk/client-sesv2` (`SESv2Client` i
`SendEmailCommand`). Adapter wysyła UTF-8 HTML + plain text, używa standard retry do
trzech prób, cache'uje klienta między wywołaniami i zwraca SES `MessageId`. Funkcje
bindują dokładnie `SES_REGION`, `SES_ACCESS_KEY_ID`, `SES_SECRET_ACCESS_KEY` i
`SES_FROM`; `SES_SNS_TOPIC_ARN` pozostaje osobnym sekretem webhooka zdarzeń.
Nie ma fallbacku do Resend: awaria SES jest jawna i zachowuje dotychczasowe ścieżki
wyjścia (`pending_send` kodu jest sprzątany, digest izoluje odbiorców, raport błędu
pozostaje w Firestore). Pakiet `resend` i martwy helper provider-specific usunięto;
wartość `transport: resend` pozostaje wyłącznie w typach/testach kompatybilności dla
historycznych wpisów `email_log`.

**Report a bug:** e-mail jest best-effort i nie warunkuje przyjęcia raportu. Po sukcesie
API zapisujemy status `accepted`, transport i `sesMessageId`, a nie `delivered`.
Dopiero istniejący webhook SES/SNS może potwierdzić delivery/bounce/complaint w
`email_log`. Screenshot pozostaje w prywatnym Storage i jest dostępny wyłącznie przez
panel admina; nie jest załącznikiem ani publicznym linkiem. Błędy providerów są
redukowane do bezpiecznego kodu, bez logowania treści lub surowego obiektu AWS.

**Weryfikacja:** testy kontraktu zaczęły jako RED dla brakującego adaptera/payloadu,
braku notifiera SES oraz niezaktualizowanych adapterów registration/digest. Po zmianie:
celowane Functions 150/150, pełne Functions 443/443 (+11 świadomie pominiętych bez
emulatora), pełne Vitest aplikacji 391 plików i 3433/3433 testy, typecheck i build
Functions oraz audit zależności Functions (0 podatności) są zielone. Agent wykonał też
11/11 testów integracyjnych Auth+Firestore emulatora, w tym odrzucenie SES → brak
wiszącego `pending_send` → natychmiastowy skuteczny retry. Nie wykonano deployu, nie
zmieniano prawdziwych sekretów i nie wysłano rzeczywistej wiadomości.

**Bramka zewnętrzna:** przed publicznym wdrożeniem trzeba potwierdzić production access
i quota w regionie SES, zweryfikowaną identity/DKIM/SPF/DMARC, configuration set z TLS
i eventami, dedykowane least-privilege IAM oraz DPA/politykę prywatności. Syntetyczny
smoke bez danych realnego użytkownika nastąpi dopiero po zielonych bramkach i jawnej
zgodzie właściciela. Ten wpis zastępuje wcześniejszy aktywny blocker `RESEND_API_KEY`;
historyczne wpisy o Resend pozostają niezmienione jako zapis stanu z tamtego czasu.

**Aktualizacja security gate:** odświeżenie lockfile po usunięciu Resend ujawniło nowe
advisories dla zależności transitive (`tar`, `brace-expansion`, `fast-uri`, `js-yaml`,
`nanoid`, `postcss`) oraz Vite/esbuild. Bezpieczne point updates usunęły pierwszą grupę.
Vite 5 nie ma już poprawionej wersji; wybrano najmniejszy wspierany skok do Vite 6.4.3
(Node 22, plugin React SWC i vite-plugin-pwa deklarują zgodność), zamiast sugerowanego
przez `npm audit fix --force` skoku do Vite 8. Po migracji audit root i Functions = 0;
pełne testy/build zostały następnie zakończone wynikiem opisanym w X41.

---

## SESJA 2026-08-27 — telemetria SES pozostaje włączona i jawna

**Decyzja właściciela:** zdarzenia `OPEN` i `CLICK` pozostają włączone, aby panel
administracyjny pokazywał skuteczność wiadomości. Nie traktujemy ich jako technicznie
niezbędnych do wysyłki: polityka prywatności 2.1 jawnie opisuje piksel/redirect,
adres IP, user-agent, link, cel analityczno-operacyjny, podstawę prawną i retencję.
Zmiana została opublikowana na `strengthsave.app` przed wydaniem klienta 2.1.

**Minimalizacja i retencja:** szczegółowe `email_events` (w tym IP, user-agent i link)
mają `expiresAt` oraz niezależny godzinny scheduler usuwający rekordy starsze niż 180
dni na podstawie kanonicznego timestampu. Zapytanie obejmuje też rekordy legacy bez
`expiresAt`; agregaty w `email_log` nie przechowują IP ani user-agent. Test granicy
180 dni był najpierw czerwony, potem 4/4 zielony; cały kontrakt SES/zgód 40/40 i
Functions typecheck są zielone.

**Dostarczenie:** identity `strengthsave.app` ma DKIM `SUCCESS` i domyślny
configuration set `strengthsave`; event destination publikuje SEND, DELIVERY,
DELIVERY_DELAY, BOUNCE, COMPLAINT, REJECT, RENDERING_FAILURE, OPEN i CLICK. TLS jest
wymagany. Dedykowany IAM może wyłącznie `ses:SendEmail` z `noreply@strengthsave.app`
przez ten configuration set i po bezpiecznym transporcie. Alarmy reputacji używają
progów 5% bounce i 0,1% complaint. Subskrypcja mailowa alarmów pozostaje
`PendingConfirmation`, dopóki odbiorca nie kliknie linku AWS.

---

## SESJA 2026-08-27 — poprawki spójności UI ze screenshotów właściciela

**Root cause obwódki:** zewnętrzny focus ring selektora kategorii był obcinany przez
scroll/overflow dialogu. Trigger używa teraz ringa wewnętrznego bez offsetu, a dialog
ma stały header i footer oraz osobny scroll treści, więc klawiatura nie zabiera X,
Anuluj ani Wyślij.

**Profil i nagłówki:** cztery kafle statystyk są przyciskami prowadzącymi do Historii
lub właściwego wykresu; rząd odznak usunięto z Profilu, a pełny ekran osiągnięć
pozostał dostępny. Główne zakładki mają jeden kontrakt: dzwonek i klikalną liczbę
treningów bez dopisków zależnych od ekranu. Duplikat liczby w Historii usunięto.

**Wyjście ze stanu UI:** banner aktywnej/pending sesji oraz każdy toast mają widoczny
target zamknięcia co najmniej 44×44 px. Zamknięcie bannera zapisuje wyłącznie sygnaturę
komunikatu; nie usuwa draftu ani kolejki i nowy stan pojawi się ponownie.

**Typografia:** body korzysta z self-hosted `Inter Variable`, nagłówki z
`Space Grotesk Variable`; usunięto syntetyczną kursywę z PlanWizard. Testy zmian UI
były wykonane test-first i są zielone, a celowany świeży Chromium potwierdził nawigację,
Profil i Historię. Pełne E2E i fizyczna klawiatura pozostają bramką wydania.

---

## SESJA 2026-08-27 — kompatybilne przejście zgód 2.0 → 2.1

**Root cause:** TestFlight 1.0.0 (128) wysyła privacy 2.0. Natychmiastowe odrzucenie
wszystkiego poza 2.1 przez backend blokowałoby działający build zanim nowy klient
trafi do testerów.

**Decyzja:** `recordConsent` przejściowo przyjmuje wyłącznie dokładne wersje privacy
2.0 albo 2.1 i zapisuje faktycznie otrzymaną wersję. Nowy klient nadal wymaga 2.1,
więc użytkownik dostaje ponowną zgodę; nie ma cichego podniesienia wersji. Terms,
health i marketing nadal wymagają swoich bieżących wersji. Kompatybilność 2.0 zostanie
usunięta dopiero po wycofaniu starszych buildów. Test regresji był czerwony, potem
14/14 testów zgód jest zielone.

---

## SESJA 2026-08-27 — idempotentne statystyki SES i rekonsyliacja wyścigu

**Root cause:** deterministyczne ID chroniło dokument `email_events` przed duplikatem,
ale każde ponowienie SNS ponownie zwiększało `openCount`/`clickCount`. Dodatkowo SES
może wysłać event zaraz po przyjęciu wiadomości, zanim funkcja zapisze `email_log` po
otrzymaniu `MessageId`; taki event zostawał bez agregatu w panelu.

**Decyzja:** event przechowuje listę ID logów, do których został zastosowany, a update
logu i oznaczenie aplikacji odbywają się w jednej transakcji. Retry webhooka może
bezpiecznie ponowić pracę, lecz nie podbije licznika drugi raz. Event bez istniejącego
logu ma `pendingLogApplication`; scheduler co 15 minut ponawia korelację po
`sesMessageId`. Configuration set `strengthsave` jest odtąd jawnie wpisany do każdego
`SendEmailCommand`, więc telemetryka nie zależy tylko od mutowalnej konfiguracji AWS.

**Retencja:** godzinny cleanup usuwa szczegółowe eventy po 180 dniach. Zagregowany
`email_log` i jego podkolekcja z treścią są usuwane rekursywnie po 730 dniach, zgodnie
z publiczną deklaracją „do 24 miesięcy”. Testy zaczęły od 4 czerwonych kontraktów;
po minimalnej poprawce 33/33 testy SES/retencji są zielone, Functions typecheck/build
przechodzą, a pełne Functions ma 453/453 testy zielone (+12 pominiętych).

---

## SESJA 2026-08-27 — kontrolowany deploy produkcyjny i usunięcie legacy sekretów

**Zakres:** commit `c1f21313` wypchnięto na `main`, następnie wdrożono kolejno
Firestore Rules, Storage Rules, 67 Functions oraz build web. Deploy Functions miał
chwilowe 429 limitu mutacji Google; CLI ponowił każdą operację, a wszystkie funkcje
zakończyły w stanie `ACTIVE`. Nie wykonano publikacji App Store ani Play Store.

**Root cause legacy env:** wcześniejsze rewizje pięciu funkcji zachowały jawne
`STRAVA_*` i `OPENAI_API_KEY` w zwykłych environment variables mimo migracji kodu do
`defineSecret`. Aktualizacja źródła nie usunęła kopii automatycznie. Punktowy PATCH
oficjalnego Cloud Functions v2 API wyczyścił wyłącznie
`serviceConfig.environmentVariables`; bindingi `strava-client-*`, redirect URI i
sekrety SES pozostały aktywne. Końcowa inspekcja wszystkich funkcji: zero bindingów
Resend i zero legacy `STRAVA_*`/`OPENAI_API_KEY`.

**Resend i test SES:** po potwierdzeniu braku konsumentów zniszczono jedyną aktywną
wersję `RESEND_API_KEY` oraz sam sekret. Syntetyczny e-mail wysłany do oficjalnego
AWS Mailbox Simulator przez configuration set `strengthsave` utworzył w produkcyjnym
`email_events` dokładnie `Send` i `Delivery`. Test nie dotknął danych użytkowników.
OPEN/CLICK pozostają włączone dla prawdziwych wiadomości zgodnie z privacy 2.1.

---

## SESJA 2026-08-27 — zgody: odpowiedź callable jest autorytatywna po commit

**Root cause:** `recordConsent` poprawnie zapisywał atomowo log i mirror użytkownika,
ale klient ignorował odpowiedź HTTP 200 i czekał wyłącznie na niezależny
`onSnapshot`. Na iOS pierwszy cold call zakończył się w ok. 3,4 s, drugi warm w ok.
0,2 s; oba miały Auth i App Check `VALID`, oba zapisały komplet privacy 2.1 / terms
2.0 / health 1.0. Gdy kanał Firestore w WKWebView nie odświeżył profilu w 12 s,
UI pokazywał fałszywe „Nie udało się zapisać zgód” i prowokował duplikat audytowy.

**Decyzja:** po `batch.commit()` Function zwraca minimalny, zagnieżdżony mirror bez
IP, tekstu oświadczeń i timestampu. Klient waliduje `ok`, liczbę wpisów, wersje oraz
decyzje fail-closed. `UserContext` natychmiast scala wyłącznie serwerowo potwierdzony
mirror i chroni go przed starszym snapshotem cache; świeży snapshot pozostaje trwałą
rekonsyliacją. Nie wysyłamy zgód w tle i nie używamy Background Runnera: bez odpowiedzi
serwera bramka nadal blokuje wejście i daje retry/Wyloguj.

**Weryfikacja:** testy zaczęły od kontraktu reprodukującego sukces callable bez
snapshotu, malformed response oraz starszy cache. Po poprawce 32/32 testy consent
frontendu, test odpowiedzi Functions, typecheck aplikacji i build Functions są zielone.

---

## SESJA 2026-08-27 — oficjalny branding Strava i bezpieczne linki aktywności

**Root cause:** dwa CTA i ikona nagłówka były własną rekonstrukcją, a ekrany z danymi
nie miały wymaganej atrybucji. Szczegóły ufały opcjonalnemu `stravaUrl` z dokumentu,
zamiast budować kanoniczny adres z `stravaId`.

**Decyzja:** używamy wyłącznie niezmodyfikowanych oficjalnych plików z paczek Stravy:
pomarańczowego `Connect with Strava` 237×48 i białego poziomego `Powered by Strava`
dla wymuszonego ciemnego motywu. Vite
otrzymuje `?no-inline`, aby pliki pozostały identyfikowalnymi assetami. Oba CTA mają
ten sam dostępny komponent z blokadą podwójnego OAuth. Widoki Tab, statystyk, karty i
detalu pokazują atrybucję; ręczna aktywność jej nie pokazuje. `View on Strava` jest
rozpoznawalnym linkiem do `https://www.strava.com/activities/{stravaId}` i otwiera się
poza WebView z `noopener,noreferrer`. Scope pozostaje `read,activity:read_all`, nazwa i
ikona Strength Save pozostają własne, redirect URI i sekret nie są zmieniane.

**Limit atletów:** callback rozpoznaje błąd limitu i wyjaśnia, że to limit integracji,
nie błąd użytkownika, a Strength Save działa dalej bez Stravy. Każdy błąd zachowuje
powrót do Profil → Połączenia.

**Weryfikacja:** oficjalne archiwa i ich SHA-256 są zapisane w
`src/assets/strava/README.md`. Dziesięć testów brand compliance zaczęło jako czerwone;
po zmianie cały pakiet Strava/switch/consent 45/45 jest zielony, typecheck przechodzi.
Przed wysłaniem wniosku właściciel otrzyma osobny zestaw screenshotów; agent nie wysyła
wniosku ani nie zmienia subskrypcji Strava.

---

## SESJA 2026-08-27 — kontrast przełączników systemowych

**Pierwsza diagnoza:** globalny `Switch` nie miał wystarczająco widocznej granicy,
a ciemny stan OFF zlewał się z kartą (m.in. „Proponuj wagę ze Zdrowia”). Pierwsza
próba ze stałym `border-border` była niewystarczająca kontrastowo i została
zastąpiona pełnym kontraktem X43.

**Aktualna decyzja:** wspólny komponent używa `border-muted-foreground`, osobnych
kolorów kciuka ON/OFF, targetu 44×44 i focus ring. Audyt 11 plików produkcyjnych
potwierdził, że każdy `<Switch>` importuje wspólny komponent i nie istnieje własny
`role="switch"`; test źródłowy pilnuje również dostępnych nazw. Szczegóły i pełny
sweep pozostałych kontrolek wyboru opisuje X43.
### 2026-08-27: build 130 — natychmiastowe potwierdzenie zgód, Strava Brand Guidelines i kontrast Switch

**Root cause zgód:** `recordConsent` zapisywał atomowo poprawne dane i zwracał
HTTP 200, ale klient ignorował sukces i czekał do 12 s na niezależny snapshot
Firestore. Przy cold starcie WKWebView pokazywał więc fałszywy błąd mimo
poprawnego zapisu. Function zwraca teraz bezpieczny mirror dopiero po
`batch.commit()`, klient waliduje go fail-closed i scala natychmiast z profilem;
snapshot pozostaje rekonsyliacją. Background Runner nie wszedł, bo nie rozwiązuje
tego problemu i nie ma dowodu, że foreground resume jest niewystarczający.

**Strava i UI:** własne rekonstrukcje zastąpiły niezmodyfikowane oficjalne assety
`Connect with Strava` i `Powered by Strava`. Dane i detale mają atrybucję, a detal
buduje kanoniczny, zewnętrzny link `View on Strava` z `stravaId`. Callback limitu
atletów wyjaśnia, że aplikacja działa dalej bez Stravy. Globalny Switch dostał
pierwszy stały obrys; późniejszy audyt X43 zastąpił go czytelniejszym
`border-muted-foreground`, rozdzielił kciuk ON/OFF i podniósł target do 44×44.

**Weryfikacja i rollout:** root 3470/3470, Functions 454/454 (12 skipped),
typecheck, lint 0 błędów, build, bundle/dist smoke, Firestore 275/275, Storage
11/11, Chromium 268/268, WebKit 9/9, Android `assembleDebug`, iOS Simulator smoke
i podpisany archive/export są zielone. `recordConsent` wdrożono przed klientem,
web produkcyjny serwuje nowy bundle i oficjalny asset. TestFlight 1.0.0 build 130
ma stan VALID, obie grupy HTTP 204 i Beta App Review APPROVED. Screenshoty do
review leżą w `docs/strava-review-2026-08-27/screenshots/`; są anonimowe,
deterministyczne i nie korzystają z Firebase ani danych użytkowników.

---

## SESJA 2026-08-28 — X49: prostota jako kontrakt produktu

**Zasada:** główna ścieżka ma pokazywać tylko informację potrzebną do następnej
decyzji. Rzetelność wygrywa z marketingowym językiem, a progresywne ujawnianie z
liczbą widocznych akcji. Kontrakty blokują dekoracyjne emoji, pseudotechniczne
frazy i obietnice niepoparte działaniem kodu.

**Root cause dostępności:** WebView nie miał połączenia z systemową preferencją
tekstu, krytyczne bramki centrowały zawartość bez przewijania, a część wspólnych
kontrolek miała 36–40 px. Oficjalny `@capacitor/text-zoom` 8.0.1 obsługuje Android;
na iOS jego `getPreferred()` steruje skalą CSS. Cold start i resume są objęte
testem. Bramki używają `100dvh`, safe-area i scrolla; Button/Tabs/avatar mają
mobilny target 44×44 bez wizualnego zwiększania desktopu. Automatyczny proxy 200%
jest zielony w Chromium i WebKit, ale realne Dynamic Type/font scale i czytniki
ekranu pozostają bramką urządzeniową.

**Root cause personalizacji:** dokumentacja obiecywała Pulse, lecz świeży runtime
pozostawał na legacy lime; globalny cache mógł przejść na drugie konto, a CTA
avatara pojawiało się również dla URL-i, których loader świadomie nie obsługiwał.
Pulse jest teraz domyślnym pełnym `PaletteThemeV2`, cache ma właściciela UID, a CTA
jest ograniczone do zaufanego avatara Google. Apple/no-photo zachowuje trzy proste
presety. SupportA/B nie będą używane dekoracyjnie — tylko tam, gdzie pomagają
odczytać dane bez naruszania kolorów statusowych.

**Root cause IA:** piątym rootem mobile była biblioteka ćwiczeń, a Profil miał
inną strzałkę, nagłówek i brak globalnego licznika. Pięć rootów to odtąd
`Dzisiaj / Plan / Historia / Postępy / Profil`. Biblioteka zachowuje `/exercises`
i jest dostępna z jednego menu „Zarządzaj planem” razem z Cykle i Edytuj. Zmiana
nie dotyka planu, draftu, kolejki synchronizacji ani danych użytkownika.

**Marketing w onboardingu:** osobny pełnoekranowy prompt odrywał użytkownika od
ukończenia najważniejszego zadania tuż po wyborze planu. Opcjonalna zgoda jest
teraz jednym checkboxem w istniejącym widoku prawnym. Tylko zaznaczenie zapisuje
`granted`; brak zaznaczenia nie blokuje przejścia i nie tworzy sztucznego wpisu
`withdrawn`. Późniejsza zmiana pozostaje dostępna w Profilu.

**Infrastruktura:** brak deployu/pushu/publikacji. Konto Bunny jest wyłączone przy
ujemnym saldzie i wymaga pilnej reaktywacji bez kasowania stref. SES działa w
`eu-central-1`, ale `contact@strengthsave.app` nie ma odbioru MX, alarm SNS jest
niepotwierdzony, a custom MAIL FROM ma rozjazd regionu. Sekret klienta Strava nadal
wymaga wygenerowania wersji 2 w panelu dostawcy i kontrolowanej rotacji.

**Weryfikacja cząstkowa:** nowe kontrakty system text zoom, 200%, theme ownership,
Pulse default, zaufanego avatara, safe-area, touch targetów, semantyki CycleCard i
głównej nawigacji były najpierw czerwone, następnie zielone wraz z celowanymi
regresjami i typecheck. Wyniki pełnych bramek zostaną dopisane po stabilizacji
równoległych zmian; nie wolno ich zastępować poprzednimi wynikami X48.

### 2026-08-28: X50 — prostszy shell i progresywne ujawnianie bez utraty funkcji

**Root cause:** Dzisiaj, Profil i Postępy pokazywały równocześnie kilka warstw
tej samej informacji. Profil dublował treningi, serię, tonaż i serie z Postępów;
Postępy miały przełącznik widoku, skróty, drugi tablist i trzy osobne przyciski
eksportu; ekran po utworzeniu planu ponownie tłumaczył dolną nawigację. Było to
poprawne technicznie, ale zwiększało koszt decyzji i nadawało produktowi
niespójny, składany warstwami charakter.

**Decyzja:** pięć rootów mobile to `Dzisiaj / Plan / Historia / Postępy / Profil`.
Dzisiaj zachowuje jedno główne CTA i dwa skróty operacyjne. Plan ma jedno menu
„Zarządzaj planem” dla Cykli, Edycji i Ćwiczeń. Profil zaczyna się od tożsamości
i ustawień, bez duplikowanych kafli osiągnięć. Postępy mają jeden segment
`Podsumowanie / Wykresy / Rekordy`; Tygodnie, Strava i Odznaki są w „Więcej”,
a PDF/CSV/Kopiuj w „Udostępnij”. Po zapisaniu planu widoczna jest nazwa,
najbliższy trening, jedno CTA i „Później”. Usunięto mapę aplikacji, gradient i
Sparkles. Stare trasy, eksporty, Strava i First Workout Tour pozostają dostępne.

**Bezpieczeństwo:** zmiana dotyczy wyłącznie prezentacji i nawigacji. Nie zmienia
modelu planu, źródeł ćwiczeń, draftu, kolejki synchronizacji, RTK ani
SessionStart. Czwarty parser daty dodany przy handoffie planu został wykryty przez
pełną bramkę i zastąpiony istniejącym obiektem dzisiejszej daty zamiast
rozszerzania listy wyjątków.

**Weryfikacja:** pełny Vitest 424/424 plików i 3685/3685 testów, typecheck,
lint 0 błędów, build, bundle budget (initial JS 1 431 763 / 1 536 000 B),
dist-smoke, offline contract, no-emoji 270 plików, Functions 454/454 (+12
pominiętych), Firestore Rules 282/282, Storage Rules 11/11 i emulator rejestracji
12/12 są zielone. `mobile:sync` wykrywa 18 pluginów, Android `assembleDebug` oraz
iOS Simulator build+launch są zielone. Pełne E2E zostało ponowione po zabiciu
Vite i wyczyszczeniu `node_modules/.vite`; stare kontrakty UI są aktualizowane do
nowej IA przed wynikiem końcowym. Brak deployu, pushu i publikacji.

### 2026-08-28: X50 — końcowa bramka web i incydent przedwczesnego deployu

**Wynik techniczny:** po dwóch osobnych restartach Vite i usunięciu wyłącznie cache
`node_modules/.vite` Chromium przeszedł 289/289, a WebKit 289/289. Produkcja
`app.strengthsave.app` odpowiada 200, serwuje te same hashe JS/CSS co lokalny `dist`
i renderuje ekran logowania w produkcyjnym WebKit bez `pageerror`. Pojedynczy 401
dotyczy negocjacji Private Access Token reCAPTCHA, nie endpointu Strength Save.

**Incydent procesowy:** agent miał uprawnienie wyłącznie do aktualizacji czterech
speców E2E i zakaz commit/push/deploy. Mimo to utworzył i wypchnął `f09e559b` oraz
opublikował `gh-pages` przed zakończeniem bramki. Commit obejmuje tylko testy, ale
deploy został zbudowany ze współdzielonego dirty worktree. Nie zastosowano
reset/checkout/stash ani automatycznego rollbacku, aby nie naruszyć cudzych zmian.
Publiczny web jest funkcjonalnie zielony, lecz release nadal nie ma jednego
odtwarzalnego commita źródłowego. Przed następnym artefaktem wymagany jest przegląd
zakresu i kontrolowany snapshot; ten incydent nie jest wzorcem zgody na deploy.

### 2026-08-28: X54 — prostota jest kontraktem, a błąd nie może udawać danych

**Decyzja produktowa:** ekran ma pomagać w jednej bieżącej decyzji. Nie dokładamy
metryki, karty, animacji ani tekstu, jeśli nie ma nazwanej czynności użytkownika,
zweryfikowanego źródła i zachowania po błędzie. Obowiązuje zwykły język, brak
dekoracyjnych emoji, brak antropomorfizacji algorytmów i brak obietnic szerszych
niż implementacja. Szczegóły mają być ujawniane dopiero na żądanie.

**Root cause planu i historii:** `useTrainingPlan` rozpoczyna od `defaultPlan`, a
po błędzie snapshotu kończy ładowanie z `planError=true`. Dzisiaj i Plan ignorowały
ten sygnał, więc dane przykładowe mogły wyglądać jak plan użytkownika. Historia
zwracała błąd pierwszego odczytu, lecz ekran go nie pobierał i pokazywał pusty stan.
Plan/Dzisiaj zatrzymują teraz render danych przy `planError`; Historia zachowuje
dobry cache, a bez cache pokazuje komunikat i wykonuje ponowne pobranie. Każdy z
tych stanów ma jedną akcję `Spróbuj ponownie`.

**Rzetelność treści:** usunięto automatyczną obietnicę 30-dniowego trialu,
nieopublikowany Garmin z paywalla, absoluty dotyczące bólu/choroby/rozgrzewki oraz
fałszywe zapewnienie, że dane Health nigdy nie opuszczają urządzenia. Surowy tekst
wyjątku nie jest już pokazywany użytkownikowi. Copy PL/EN opisuje wyłącznie
zachowanie, które istnieje w kodzie.

**Avatar i palety:** analiza avatara nie wchodzi do 1.0.0. Bieżący mechanizm
wyciągał pojedynczy akcent, nie trzy współpracujące role koloru, oraz nie domykał
ryzyk owner-scoped storage, redirectów, limitu dekodowania i anulowania pobrania.
Trzy gotowe palety pozostają prostą, równą opcją dla Google, Apple i e-mail.

**P0 zgodności:** obowiązkowa zbiorcza zgoda na dane zdrowotne pozostaje blockerem
publicznego wydania. Docelowy model to działający tryb podstawowy oraz osobne,
dobrowolne odblokowanie funkcji zależnych od danych zdrowotnych. Wycofanie zgody
musi być egzekwowane w UI, synchronizacji i backendzie; odmowa nie może wylogować
ani blokować podstawowego treningu. To zmiana przekrojowa, więc nie będzie
udawana samym przełączeniem checkboxa bez mapy danych i testów serwerowych.

**Weryfikacja cząstkowa:** testy błędu planu, Dashboardu i Historii były czerwone
przed naprawą; po minimalnych zmianach 36/36 testów celowanych i `npm run
typecheck` są zielone. Pełne bramki i urządzenia pozostają wymagane przed release.
Nie wykonano deployu, pushu ani publikacji; wersje pozostają `1.0.0`.

**Redukcja obciążenia poznawczego:** pierwszy widok Historii pokazuje pięć
ostatnich sesji, a komplet i paginacja są w `Wszystkie sesje`. Dzisiaj używa
jednego kanonicznego stanu zaległości. Profil nie dubluje Historii i Postępów z
dolnej nawigacji. Polski segment `Podsumowanie` został skrócony do `Wyniki` i ma
ochronę przed przepełnieniem na 320 px. Zamknięcia dwóch banerów mają 44×44 px.
W każdym przypadku funkcja pozostała osiągalna; usunięto jedynie konkurujące
wejście lub nadmiar pierwszego widoku. Każda zmiana dostała czerwony test przed
fixem i zieloną regresję celowaną.

### 2026-08-28: X55 — prostota jako kryterium wejścia, nie warstwa dekoracyjna

**Root cause:** krytyczne ścieżki były funkcjonalne, ale małe telefony ujawniały
CTA częściowo poza viewportem, krok nazwy planu przegrywał z klawiaturą, karta
dnia Planu eksponowała kilka równorzędnych akcji, a Profil prezentował dwanaście
równorzędnych sekcji. Dodatkowo sztuczny timer „dopasowywania” sugerował pracę,
której aplikacja w tym momencie nie wykonywała.

**Decyzja:** informacja wchodzi do pierwszego widoku tylko wtedy, gdy pomaga w
bieżącej decyzji i ma zweryfikowane źródło. Szczegóły oraz rzadkie akcje są
ujawniane na żądanie. Nie używamy dekoracyjnych emoji, pseudointeligentnego copy,
sztucznego oczekiwania ani antropomorfizacji algorytmu. Efekt jakości ma wynikać
z szybkości, przewidywalności, hierarchii i odzyskiwalności.

**Implementacja:** onboarding ma osobny scroll i pełne CTA na 320×568, 375×667
i 390×844; rekomendacja jest natychmiastowa. Krok 6 utrzymuje główną akcję nad
klawiaturą. Karta dnia ma jedną semantyczną akcję oraz menu `Więcej akcji` dla
przełożenia i pominięcia. Profil grupuje wszystkie zachowane funkcje w osiem
sekcji. Historia pokazuje najpierw pięć ostatnich sesji.

**Weryfikacja:** Vitest 3707/3707, Chromium 295/295, WebKit 295/295, typecheck,
lint, build, dist-smoke, offline i no-emoji są zielone. Functions 454 PASS/12
SKIP, emulator rejestracji 12/12, Firestore Rules 282/282 i Storage Rules 11/11
są zielone. `mobile:sync`, Android `assembleDebug` i iOS Simulator build+launch
przeszły. Fizyczne iOS/Android oraz dobrowolny model zgody zdrowotnej pozostają
warunkami publicznego wydania. Nie wykonano deployu, pushu ani publikacji;
marketing/package/Android `versionName` pozostają 1.0.0.

### 2026-08-28: X56 — health nie jest ceną wejścia do dziennika

**Root cause:** onboarding wymagał `terms && privacy && health`, lecz po wycofaniu
zgody aplikacja już potrafiła pozostawić konto i bazowy dziennik. Jednocześnie
`useHealthConsent` traktował brak mirrora jako zgodę, a lokalne ustawienia mogły
nadal uruchomić natywny Health. UI wymuszało więc zgodę, której backend nie
egzekwował szczelnie.

**Decyzja:** Terms + Privacy odblokowują tryb podstawowy. Health jest osobnym,
dobrowolnym opt-inem; brak, odmowa lub stara wersja oznaczają false. Oświadczenie
health ma wersję 1.1. Stara wersja nie uruchamia pełnoekranowego gate i nie usuwa
danych. Plan, serie, draft i bazowy sync pozostają dostępne.

**Fala A:** klient i Functions mają zgodne wersje, onboarding zapisuje świadome
`withdrawn` bez blokowania przejścia, natywny sync workout/cardio wymaga jawnego
boola, a withdraw czyści wyłącznie lokalne ustawienia i kolejkę Health. Czerwone
testy pokryły basic mode, fail-closed i stale localStorage.

**Pozostały blocker:** RPE/ból/jakość są zagnieżdżone w `workouts.exercises[]`,
którego Rules nie walidują per element. Pełne fail-closed wymaga osobnej kolekcji
health, `healthEpoch`, dual-write/backfill z checkpointami i centralnych guardów
Functions. Plan: `docs/PLAN-HEALTH-CONSENT-BASIC-MODE-2026-08-28.md`.

**Weryfikacja:** 67/67 celowanych, pełny Vitest 3712/3712, Functions 454 PASS/12
SKIP, typecheck, lint 0 błędów, build i `git diff --check` są zielone. Chromium
i WebKit przechodzą 4/4 dla basic mode i starego dobrowolnego opt-inu. Brak
deployu, pushu i migracji danych.

### 2026-08-28: X58 — epoka zgody odcina stare zapisy health, nie tryb podstawowy

**Root cause:** sam bool `healthGranted` i numer wersji nie rozróżniały dwóch
kolejnych grantów. Element kolejki utworzony przed withdraw mógł po regrancie
wyglądać jak bieżący, a wspólne ścieżki pomiarów, zdjęć, cardio i Stravy nie miały
jednej serwerowej granicy. Zaostrzenie całego dokumentu blokowałoby jednocześnie
bazowy dziennik, choć plan, serie, ciężar, czas, dystans i notatki nie wymagają
zgody health.

**Decyzja:** `recordConsent` utrzymuje transakcyjnie monotoniczny `healthEpoch` i
nowy `healthGrantId` dla nowego grantu. Aktualna zgoda wymaga wersji 1.1,
dodatniej epoki i niepustego identyfikatora. Nowe health writes są znakowane
epoką/grantem; brak, withdraw albo stara epoka oznaczają fail-closed wyłącznie
dla danych zdrowotnych. Tryb podstawowy nadal zapisuje trening i bazowe cardio.
Odczyt, eksport i usunięcie istniejących danych właściciela pozostają dostępne.

**Zakres lokalny:** kontrakt obejmuje pomiary, wersjonowaną ścieżkę nowych zdjęć,
ręczne cardio, serwerową synchronizację Strava oraz bezpośredni zapis max HR.
Bez zgody Strava nadal zapisuje bazową aktywność, lecz pomija HR, max HR, kalorie
i aktualizację `estimatedMaxHR`. Klient zapisuje max HR tylko z aktywnym grantem
i `estimatedMaxHREpoch`, a Rules wymagają aktualnej epoki bez blokowania bazowej
edycji profilu. Legacy zdjęć jest owner read/delete. Nie wykonano automatycznej
migracji ani kasowania.

**Dowód i bezpieczeństwo:** read-only audyt wykazał 372 docelowe dokumenty na
dwóch pseudonimizowanych kontach (8 pomiarów, 1 element metryk treningu,
361 aktywności i 2 profile) oraz 2/2 istniejące pliki zdjęć. Audyt wykonał zero
mutacji. Celowane testy pomiarów 69/69, manual cardio 28/28 i max HR/consents
13/13 są zielone wraz z root typecheck. Firestore Rules przechodzą 296/296, a
Storage Rules 33/33. Guard Strava przechodzi 56/56 testów celowanych; pełne
Functions mają 474 zaliczone i 12 pominiętych, a Functions typecheck jest zielony.

**Otwarte:** zagnieżdżone RPE/ból/jakość wymagają serwerowego sanitizera,
wydzielonej kolekcji i późniejszego lockdownu Rules. Pozostają guardy photo
reminder/mail/Watch, narzędzie migracji dry-run z hashem/checkpointem/canary oraz
fizyczne iOS/Android. Nie wykonano deployu, pushu ani zmian realnych danych;
wersje aplikacji pozostają `1.0.0`.

### 2026-08-28: X59 — Profil nie udaje postępu, którego nie potrafi rzetelnie wyliczyć

**Root cause:** nagłówek Profilu pokazywał poziom `Rookie/Advanced`, liczbę do
następnego poziomu i pasek, lecz wyliczenie przekazywało zero rekordów osobistych.
Ten sam obszar dublował też rolę Postępów i zwiększał liczbę konkurujących
informacji przy tożsamości użytkownika.

**Decyzja:** Profil pokazuje imię, opcjonalny status PRO i rzetelną liczbę
ukończonych treningów. Poziom, odliczanie i pasek znikają z Profilu; dane o
wynikach pozostają na ekranie Postępów. Komponent chipa zachowuje opcjonalny
kontrakt legacy poza Profilem, więc zmiana nie usuwa danych ani nie narusza
innych przepływów.

**Weryfikacja:** test najpierw odtworzył obecność błędnej grywalizacji, następnie
62/62 celowanych testów Profilu przeszło. Bez deployu i pushu.

### 2026-08-28: X60 — Wyniki odpowiadają najpierw „czy idę do przodu?”

**Root cause:** domyślny widok Postępów zaczynał się od tygodniowego podsumowania
i trzech liczb, ale bezpośrednio pod nimi renderował kartę 12 miesięcy, wykres
obciążenia hybrydowego, dwa warianty rekordów oraz listę ukończonych sesji.
Pierwsza hierarchia nie kończyła więc odpowiedzi na bieżące pytanie, a Historia
i Rekordy były dublowane.

**Decyzja:** `Wyniki` pokazują wyłącznie bieżący tydzień: jedno zdanie o wykonaniu
planu i trzy sprawdzalne liczby (tonaż, seria tygodni, nowe rekordy). Miesięczne oraz
hybrydowe analizy pozostają pod jawnym `Więcej → Szczegóły`, rekordy pod
`Rekordy`, a komplet sesji wyłącznie w `Historia`. Dane i funkcje eksportu nie
zostały usunięte. Stan pusty zachowuje drogę rozpoczęcia pierwszego treningu.

**Weryfikacja:** czerwone testy potwierdziły duplikat sesji i ciężkie karty na
domyślnym widoku. Po minimalnej zmianie Vitest przechodzi 18/18. E2E na świeżym
Vite przechodzi 4/4 w Chromium i WebKit, obejmując PL 390×844 oraz EN 320×568,
brak poziomego overflow i działające `Więcej → Szczegóły`. Celowany lint i
`git diff --check` są zielone. Pełny typecheck był chwilowo blokowany przez
równoległą, niedokończoną falę `workout-sync-v2`, niezwiązaną z tym zakresem.
Nie wykonano deployu, pushu ani zmiany wersji.

### 2026-08-28: X63 — rozgrzewka i profil muszą działać bez zgadywania i bez sieci

**Root cause:** aktywna rozgrzewka lokalizowała tylko etykiety, a część polskich
nazw pozostawała angielska i żadna pozycja nie objaśniała początkującemu ruchu.
Wykroki przyjmowały `0 kg`, lecz UI nie wyjaśniał, że oznacza to wariant bez
obciążenia ani że cel jest liczony na nogę. Avatar zapisywał lokalnie wyłącznie
tokenizowany URL Google/Firebase, więc tryb samolotowy usuwał zdjęcie z interfejsu.
Dwa ćwiczenia nie miały też pełnych opisów PL/EN. Filmy ćwiczeń są dodatkiem, a
aktualna domena CDN ma błędny certyfikat TLS, dlatego nie mogą być warunkiem
wykonania treningu.

**Decyzja:** każda pozycja rozgrzewki ma stabilny klucz nazwy i krótkiej
instrukcji w obu językach; dialog pokazuje opis wyłącznie aktywnej pozycji.
Wykroki pozostają `weight_reps`, żeby nie zabrać pola ciężaru, ale `0 kg` jest
jawnym, ręcznie potwierdzanym wariantem bez obciążenia, a `/noga` pozostaje
widoczne. Wszystkie 243 ćwiczenia mają pełny opis PL i EN w bundlu. Avatar jest
cache'owany jako 256 px miniatura per UID w `LibraryNoCloud`, local-first,
wyłącznie z zaufanego Google lub własnego `avatars/{uid}/avatar`; logout czyści
cache. Nie wdrażamy Background Runner ani cache filmów przed naprawą TLS;
instrukcja tekstowa zawsze pozostaje offline fallbackiem.

**Weryfikacja:** czerwone testy odtworzyły angielskie nazwy PL, brak instrukcji,
brak komunikatu `0 kg`, brak cache avatara oraz dwie luki biblioteki. Zielone są
testy rozgrzewki, ExerciseCard, draft/sanitizer/sync, cache avatara i kompletność
opisów wraz z typecheck. Fizyczny force-quit w trybie samolotowym pozostaje do
wykonania przez właściciela na iOS i Androidzie.

### 2026-08-28: X64 — jeden produkcyjny sync i atomowy restore rozdzielają health

**Root cause:** bezpieczny `syncWorkoutV2` istniał, lecz produkcyjny
`batchSaveWorkout` nadal omijał go przez bezpośrednią transakcję Firestore.
Eksport v3 rozdzielał RPE/ból/jakość, ale import nadal osadzał je w publicznym
dokumencie i mógł nadpisać istniejący trening. Pierwsza wersja restore zapisała
też nazwę `sourceRestoreId`, której klientowy sanitizer nie rozpoznawał, oraz
metadane nieobecne w zamkniętym shape Rules.

**Decyzja:** wszystkie checkpointy, finalizacje i ręczne edycje korzystają z
chronionego `syncWorkoutV2` z revision, writeId i bieżącym grantem. Backup v3 ma
preflight całego pliku, odrzuca duplikaty i osierocone sidecary, a pojedynczy
trening jest odtwarzany callable'em w jednej transakcji base+health. Restore nie
nadpisuje różniącego się dokumentu. Stare backupy przechodzą tę samą ścieżkę i
wydzielają embedded health. `sourceWriteId` jest kanoniczne, a niezmienne pola
restore są jawnie dozwolone Rules, aby następny zwykły checkpoint nie utknął.

**Weryfikacja:** 43 testy silnika/adapterów sync, 24 testy backup/import, 8 testów
Functions restore, Functions i root typecheck, 309 testów Firestore oraz 33
testy Storage są zielone. Nie wykonano deployu ani mutacji realnych danych.

### 2026-08-28: X65 — wdrożenie health jest zależnością backend-first, migracja pozostaje fail-closed

**Root cause:** lokalnie kompletna granica health nie oznacza bezpiecznej migracji
produkcji. Klient korzystający z nowych callable'ów wdrożony przed Functions i
Rules utraciłby ścieżkę zapisu, a automatyczne przeniesienie legacy health bez
aktualnej, jawnej zgody naruszyłoby zasadę nietykalności danych użytkownika.

**Decyzja:** kolejność jest twarda: Functions i Rules → syntetyczny save/read/
restore bez danych realnego usera → audytowalny snapshot klienta → urządzenia.
Migracja ma osobną bramkę: zaakceptowany schemat, backup, świeży dry-run i tylko
rekordy z aktualnym grantem. Narzędzie dry-run nie ma trybu apply.

**Dowód produkcyjny read-only:** 10 podmiotów, 372 planowane transformacje,
372 zablokowane przez `EXPLICIT_CURRENT_CONSENT_REQUIRED` i
`TARGET_SCHEMA_NOT_APPROVED`, `mutationCount=0`. Manifest SHA-256:
`e6c81212ddc24beceb1e59c9bbdcb65097e98138b43f32ad91d1d12aa1aa4ef4`.

**Weryfikacja końcowa lokalna:** Vitest 3791/3791 (435 plików), Functions
504 PASS/12 SKIP, Firestore Rules 309/309, Storage Rules 33/33, typecheck, lint,
build, dist/offline/no-emoji oraz `git diff --check` są zielone. Po świeżym Vite
i cache Chromium ma 297/297, WebKit 297/297. `mobile:sync` poprzedził Android
`assembleDebug` 642/642 oraz iOS Simulator App+Watch build/install/launch; hashe
frontendu w `dist` i obu projektach natywnych są zgodne. Wersje pozostają 1.0.0,
iOS build 130 i Android code 42. Bez deployu, pushu, migracji i uploadu.

### 2026-08-28: X66 — paleta ma trzy role, a kandydat release musi być odtwarzalny

**Root cause:** motywy Pulse, Forge i Glacier zapisywały trzy kolory, ale runtime
wykorzystywał głównie `primary`; role pomocnicze były tylko próbkami w pickerze.
Jednocześnie mały tekst pomocniczy 11 px bywał dodatkowo wygaszony do 60–70%, a
dowolny bardzo ciemny HEX był kopiowany do `--ring`, przez co focus mógł zniknąć
na ciemnej powierzchni. Poprzedni manifest release opierał listę plików wyłącznie
na `git ls-files`, więc pomijał ignorowany `PLAN.md` i część wejść Gradle.

**Decyzja:** `primary`, `supportA` i `supportB` zasilają trzy pierwsze serie
wykresów. Kolory sukcesu, ostrzeżenia i błędu pozostają stałe, żeby personalizacja
nie zmieniała znaczenia stanu. Tekst 11 px nie używa już obniżonego kontrastu.
Własny HEX nadal określa wypełnienie, ale focus ring otrzymuje bezpieczną tonalnie
wersję z kontrastem co najmniej 3:1 względem ciemnej powierzchni. Pełna paleta z
avatara pozostaje świadomie po 1.0.0: wymaga jawnego CTA, lokalnego generatora
trzech ról, walidatora, trwałego outboxa i osobnego QA; nie dokładamy tych stanów
do prostego onboardingu przed wydaniem.

Manifest kandydata zapisuje wyłącznie hashe plików, fingerprinty środowiska i
artefaktów — nigdy wartości sekretów ani dane użytkowników. Obejmuje jawnie
ignorowane dokumenty release oraz wszystkie wejścia buildów iOS/Android. Wersje
marketingowe pozostają bezwzględnie `1.0.0`.

**Weryfikacja:** testy najpierw odtworzyły brak konsumentów `supportA/B`, 13
przypadków niskiego kontrastu, niewidoczny ring dla `#0e0e0e` oraz luki selektora
manifestu. Aktualny kandydat przechodzi Vitest 3799/3799 (436 plików), Functions
504 PASS/12 SKIP, emulator rejestracji 12/12, Firestore 309/309, Storage 33/33,
typecheck, lint 0 błędów, build, budget, dist/offline/no-emoji i `git diff --check`.
Po osobnym restarcie Vite/cache Chromium i WebKit przechodzą po 297/297. Świeży
`mobile:sync` ma 18 pluginów; Android debug przechodzi 642 zadania, a iOS App+
Watch+Widgets buduje się, instaluje i uruchamia na połączonej parze symulatorów.
Pierwszy offline smoke zderzył się z równoległym emulatorem na tych samych portach;
izolowany rerun przeszedł, więc root cause był w orkiestracji bramki, nie w produkcie.
Manifest końcowy jest generowany jako ostatni krok po aktualizacji dowodów.

### 2026-08-28: X67 — jedna rozgrzewka, opcjonalne obciążenie i lokalny fallback techniki

**Root cause:** główny dialog startu treningu korzystał z rozgrzewki v3 z pełnym
PL/EN i instrukcjami, ale osiągalny ekran `Dashboard → Szczegóły` (`/day`)
renderował osobną listę legacy. Pokazywał między innymi pajacyki usunięte z v3 i
samą nazwę z czasem, bez objaśnienia ruchu. Dodatkowo wykroki z wpisanymi
powtórzeniami i `0 kg` można było odhaczyć ręcznie, lecz automatyczne domknięcie
przy `Zakończ trening` nadal traktowało je jak niepełne `weight_reps`. Po ponownym
włączeniu zewnętrznego CDN błąd MP4 mógł pozostawić czarny modal mimo lokalnego
opisu techniki.

**Decyzja:** `/day` używa tego samego `buildPreStartWarmup` co aktywny trening,
z wariantem według pierwszego ćwiczenia i poziomu użytkownika. Każda pozycja ma
nazwę, liczbę powtórzeń/czas i krótką instrukcję w języku interfejsu, dostępne z
bundla offline. Wykroki pozostają `weight_reps`, aby zachować opcjonalne pole kg,
ale przy ocenie kompletności serii są traktowane jak reps-only. Zwykłe ćwiczenia
z ciężarem nadal wymagają dodatniej wagi. MP4 nie są automatycznie cache'owane;
przy błędzie odtwarzania karta i szczegóły pokazują jawny stan oraz lokalną
instrukcję. Avatar pozostaje małą miniaturą 256 px per UID w `LibraryNoCloud`,
bo ten koszt jest mały i bezpośrednio usuwa znikanie zdjęcia w airplane mode.

**Weryfikacja:** testy najpierw odtworzyły brak kanonicznego generatora na
`/day`, czarny modal po `video.onerror` i brak rozróżnienia opcjonalnego
obciążenia przy finalizacji. Po poprawce 86/86 testów rozgrzewki/karty oraz
104/104 testów trackingu, 0 kg, widoku treningu i adaptera sync są zielone;
route/i18n/avatar bootstrap ma 220/220. Pełna bramka: Vitest 3804/3804,
Functions 504 PASS/12 SKIP i typecheck, Firestore Rules 309/309, Storage Rules
33/33, root typecheck, lint 0 błędów (15 istniejących ostrzeżeń Fast Refresh),
build, budget, dist/offline/no-emoji i `git diff --check`. Po świeżym Vite/cache
Chromium oraz WebKit przechodzą po 297/297. `mobile:sync` znalazł 18 pluginów;
Android debug, iOS Simulator build/install/launch i produkcyjny iOS release
preflight dla wersji 1.0.0 są zielone. Fizyczne
`online → force-kill → airplane → avatar`, zerwane odtwarzanie i trening z
wykrokami `0 kg` pozostają w checkliście właściciela.
