# Audyt natywny i sklepowy — 2026-09-06

Status pierwotnego etapu agenta: audyt i uzgodniona implementacja zakończone dla NAT-01–04, REL-01, DOC-01 i DEP-01, wówczas bez cap sync i buildów. Koordynator wykonał następnie świeże buildy iOS/Android, instalację oraz smoke logowania/klawiatury. Końcowe odświeżenie po skróceniu copy i zgodność pełnych zasobów dokumentuje `native-build-receipt.json`, a pełne bramki `docs/LAUNCH-AUDIT-2026-09-06.md`. Nie wykonano deployu, uploadu, bumpu ani operacji na rzeczywistych danych użytkowników.

## Potwierdzone usterki i plan

| ID | Waga | Dowód / root cause | Minimalna naprawa i akceptacja |
|---|---|---|---|
| NAT-01 | P1 | `android/.../HealthSyncPlugin.kt:requestHealthPermissions` otwiera tylko ogólne ustawienia HC i natychmiast zwraca false. Brak `PermissionController.createRequestPermissionResultContract`. Manifest nie deklaruje widoczności pakietu HC ani Activity/alias rationale. Świeży użytkownik nie dostaje normalnego dialogu zgód, na Android <=13 provider może być uznany za niedostępny. | ActivityResult rejestrowany w cyklu życia Activity; żądanie konkretnych uprawnień, rezultat po powrocie, cancel=false, brak crashu po utracie bridge. Manifest: queries, rationale Activity i Android 14+ alias. Rationale pokazuje tę samą politykę co listing. Test kontraktu plus kompilacja i urządzeniowe grant/deny/retry/process-death. |
| NAT-02 | P1 | iOS `HealthSyncPlugin.requestHealthPermissions` traktuje `requestAuthorization` success jako zgodę. Apple definiuje tę flagę jako powodzenie przeprowadzenia żądania, również po odmowie. | Dla synchronizacji treningów sprawdzać `authorizationStatus(for: workoutType) == .sharingAuthorized`; odczyt wagi nie ujawnia statusu zgody z powodów privacy. Nie udawać, że brak próbki dowodzi odmowy. Regresja kontraktu plus deny/grant na urządzeniu. |
| NAT-03 | P1 | Native writeWorkout na obu platformach zawsze tworzy nowy workout. Retry x3, cache LS ograniczony do 500 wpisów, reset/revoke i concurrent calls mogą wyprodukować duplikaty. Zmiana czasu treningu tworzy drugi wpis zamiast update. Brak stable recordId/version w interfejsie JS. | Wspólny payload stable recordId (UID + rodzaj + docId) i recordVersion zamrożony per intencja/retry. HC: metadata clientRecordId/clientRecordVersion; HK: SyncIdentifier/SyncVersion przed zapisem. Bez migracji/usuwania istniejących Health danych. Backend agent równolegle naprawia fence revoke i retry JS. Test duplicate/retry/update + systemowy smoke zapisany dwa razy daje jeden rekord. |
| NAT-04 | P2 | iOS opcjonalne kalorie dodaje `activeEnergyBurned`, ale `toShare` zawiera tylko workout; callback `builder.add` i `endCollection` ignorują błąd. Udany workout może ukrywać utratę energii. | Dodać do żądania opcjonalną energię, zapisywać próbkę tylko przy przyznanej zgodzie; errors builder/endCollection rozwiązywać jawnie. Nie blokować samego workoutu odmową optional energy. |
| REL-01 | P1 | `release-candidate-manifest.mjs` hashuje HTML i debug APK, nie hashuje release AAB ani IPA. Podmiana JS/CSS w dist przy zachowanym index.html lub podmiana podpisanego AAB/IPA pozostaje niewidoczna. Selekcja wejść pomija release/ i .github/. | Dodać deterministyczne hashe całych drzew output (plik, rozmiar, hash), podpisane AAB/IPA i inputs release/.github. Test: zmiana wyłącznie assetu JS/AAB/IPA unieważnia manifest. Nie przypisywać starych artefaktów nowym źródłom. |
| DOC-01 | P1 | `release/release-train.json` ma iOS136/Android46 + stary github.io; test brand wymusza te historyczne wartości. Źródła i gotowe IPA mają142/48. `docs/LAUNCH-RUNBOOK.md` i `GOOGLE-PLAY-SETUP.md` powielają stare wersje i nieaktualną deklarację braku zdjęć i nierozstrzygniętą rozbieżność dotyczącą lokalizacji. Runbook kieruje do kopiowania tej tabeli 1:1 do konsoli. | Oznaczyć snapshot dostaw jako historyczny; kontrakt porównuje aktualne source versions bez fałszywych statusów APPROVED. Nowa karta release oddziela źródła/artifact/delivery/QA. Przebudować instrukcje Data Safety z faktycznych przepływów i powiązać z aktualną polityką. |
| SEC-REVIEW | P1 | `docs/LAUNCH-RUNBOOK.md` zawiera plaintext hasło review konta w publicznym repo. W raporcie celowo bez wartości. | Usunąć credential z dokumentacji, używać prywatnego kanału App Review Information; rotacja/invalidacja po stronie Firebase wymaga odrębnej operacji właściciela. Root przejmuje ustalenie zakresu. |
| DEP-01 | P2 | Dzisiejszy npm audit: root 4 (1 high/2 moderate/1 low), Functions 3 moderate; wcześniejsze raporty 0 są historyczne. | Kontrolowane patch/minor transitive updates bez `--force`; patrz analiza niżej. Lockfile mutation dopiero po baseline E2E. |

## Obserwacje bez potwierdzonej usterki

- App/Watch mają dołączone PrivacyInfo.xcprivacy, UserDefaults CA92.1, App file timestamps C617.1; HealthKit, Sign in with Apple, APS, App Attest mają entitlements. To kontrola plików, nie dowód zgodności aktualnych App Privacy labels w ASC.
- Timer ma realne WAV w bundlu i resources; audio/native powiadomienia wymagają osobnego testu screen-off, silent switch, Siri/call interruption. Nie znaleziono tutaj braku pliku.
- iOS/Android używają custom scheme strengthsave; brak Universal/App Links sam w sobie nie jest bugiem, jeśli produktowy kontrakt pozostaje custom-scheme.
- Stan początkowy: CI sprawdzał web i iOS simulator, bez Android job. Lukę konfiguracji zamknięto w REL-02 poniżej; wykonanie nowego joba na GitHub pozostaje niezweryfikowane.
- Android Health Connect 1.1.0-alpha07 jest stary, ale sama etykieta alpha nie dowodzi awarii. Rozważyć stable 1.1.0 dopiero przy konieczności poprawy SDK metadata/permission contract, z osobną kompilacją.

## Toolchain, artefakty i możliwości bramek

- Xcode 26.6 (17F113), iPhoneOS SDK26.5. Symulatory iOS26.5 i watchOS26.5 dostępne; trzy iPhone symulatory uruchomione. Fizyczny iPhone: unavailable. `adb devices -l`: zero urządzeń.
- Android SDK build-tools35/36 dostępny. Domyślny `java_home` wskazuje JDK20; JDK21 dostępny pod `/opt/homebrew/opt/openjdk@21/libexec/openjdk.jdk/Contents/Home` (root ustalił i używa do bramek).
- Źródła: sześć `CURRENT_PROJECT_VERSION=142`, sześć marketing1.0.0; Android versionCode48/versionName1.0.0; targetSdk i compileSdk36, minSdk26; AGP8.13.0/Gradle8.14.3.
- Lokalny IPA: build142/1.0.0, SDKiphoneos26.5, Xcode2660; 24207399 bytes, SHA256 `96aae01319528fe17f63b266bb58bd933053e567fdf491b5669bd3aded4f3282`.
- Lokalny AAB: 22598459 bytes, SHA256 `00b9a16b8cfd266115e88a14aad37ea6f7b1f173e2877241799bf5b91abca771`. Obecność pliku nie dowodzi uploadu ani review.
- Trzy arm64 .so w AAB (`libdatastore_shared_counter`, `libimage_processing_util_jni`, `libsurface_util_jni`) mają wszystkie ELF PT_LOAD align16384. Potrzebna jeszcze walidacja zip/bundle config i systemowy 16KB smoke; brak dowodu nie jest failure.
- Debug APK SHA256 `9b34653fb8222e86ccd65495d6103f5e4f31f5e17ee689c956d6ee250ced3378`.

## Aktualne oficjalne wymagania i granice wiedzy

1. Apple od 2026-04-28 wymaga Xcode26+ i SDKiOS/watchOS26. Lokalny toolchain i istniejący IPA spełniają minimalne SDK. Updated age rating questionnaire i DSA trader status trzeba potwierdzić w ASC; repo nie dowodzi stanu konta. [Apple Upcoming Requirements](https://developer.apple.com/news/upcoming-requirements/).
2. Google Play od 2026-08-31 wymaga targetAPI36 dla nowych aplikacji/updates telefonu. Repo spełnia. [Target API policy](https://support.google.com/googleplay/android-developer/answer/11926878?hl=en).
3. Aktualna angielska strona Google o 16KB mówi o zgodności dla API35+ i enforcement updates od 2027-02-01; starsze lokalizacje nadal pokazują 2025-11-01. Nie kopiować starej daty jako dzisiejszego faktu. Najważniejszy kontrakt techniczny to ELF + ZIP alignment i test16KB. [16KB guide](https://developer.android.com/guide/practices/page-sizes?hl=en).
4. Manifest/rationale/permission launcher są oficjalnym kontraktem HC; jego privacy Activity ma pokazywać tę samą politykę co Play. [HC get started](https://developer.android.com/health-and-fitness/health-connect/get-started).
5. Play wymaga Data Safety oraz Health Apps declaration. Formularze muszą odpowiadać manifestowi i realnym przepływom, nie starej tabeli. [Publish health app](https://developer.android.com/health-and-fitness/health-connect/publish?hl=en).
6. Apple jawnie rozdziela success request i przyznanie zgody; status odczytu pozostaje ukryty. [Request authorization](https://developer.apple.com/documentation/healthkit/hkhealthstore/requestauthorization(toshare:read:completion:)), [Authorization status](https://developer.apple.com/documentation/healthkit/hkhealthstore/authorizationstatus(for:)).
7. Idempotencja jest wspierana systemowo: [Apple SyncIdentifier](https://developer.apple.com/documentation/healthkit/hkmetadatakeysyncidentifier), [Google sync-data](https://developer.android.com/health-and-fitness/health-connect/sync-data).
8. Native-first discovery: aktualny katalog zawiera `@capacitor/health-fitness`1.0.1 z peer core>=8.0.0. Zweryfikowane API `writeData` obsługuje na Android tylko zmienne profilu; na iOS quantity samples, nie zapis HKWorkout ze stable sync identity. Nie pokrywa więc kontraktu workout upsert tej aplikacji. Decyzja: odrzucić migrację przed launch; poprawić istniejący minimalny HealthSync. Web pozostaje no-op, iOS HealthKit, Android HC. Privacy nie rozszerza się o background jobs/history read (nowy plugin dodaje takie uprawnienia domyślnie). Recovery korzysta z oficjalnego ActivityCallback Capacitora; po process death ustawienia pozostają wyłączone, user może ponowić włączenie bez utraty treningu. [Health Fitness API](https://capacitorjs.com/docs/apis/health-fitness), [Capacitor8](https://capacitorjs.com/docs/updating/8-0).

## Zależności — ekspozycja i bezpieczna korekta

Wyniki źródłowe: `npm-audit-root.json`, `npm-audit-functions.json` w tym katalogu. Root: Browserslist<=4.28.6 (build query/custom stats, high), humanfs<0.16.8 (tooling symlink copy, moderate), xmldom0.9.0–0.9.11 (Capacitor XML serialization, moderate), postcss-selector-parser6.1.0–6.1.2 (build CSS recursion, low). To przede wszystkim środowisko budowania, brak dowodu zdalnej ekspozycji w bundle klienta. Docelowe minimum: Browserslist4.28.7, humanfs0.16.8, xmldom0.9.12, selector-parser6.1.3; zweryfikować published versions przed update.

Functions: qs<6.16.0 poprzez express/body-parser jest rzeczywistą zależnością runtime HTTP, choć konkretne parsowanie comma/object isBuffer wymaga oceny konfiguracji wejścia; docelowo qs>=6.16.0 i zgodne rodzice. Nie określać całego backendu jako zdalnie exploitable wyłącznie na podstawie npm audit.

Oficjalne advisories: [Browserslist cache](https://github.com/advisories/GHSA-c83g-rgw3-j3cx), [Browserslist stats](https://github.com/advisories/GHSA-73wf-gq98-2v4g), [humanfs](https://github.com/advisories/GHSA-p498-v437-472g), [xmldom](https://github.com/advisories/GHSA-6gmq-8vp8-gcm6), [selector parser](https://github.com/advisories/GHSA-w9m9-85wc-3x92), [qs comma](https://github.com/advisories/GHSA-x5fp-wj9c-mxmx), [qs isBuffer](https://github.com/advisories/GHSA-4mjr-xmp4-gh2g).

## Bramki, których nie wolno oznaczyć jako wykonane z repo

- Finalne signed source/artifact provenance i upload nowego kandydata po poprawkach.
- Fizyczny iPhone/Android: suspend/resume, offline/force-kill, notifications cold tap, Health grant/deny/revoke/update, share/camera return.
- Play Console: istnienie app, Internal Testing, Play App Signing fingerprints w Firebase, Play Integrity, produkty/oferty RC, license tester zakup/restore, deklaracje Data Safety/Health i listing assets. Repo historycznie mówi, że organizacja zweryfikowana; dzisiejszego stanu konsoli nie odczytano.
- ASC: bieżący stan build/review, IAP submission z pierwszą app, Privacy labels, updated age rating, konto recenzenta po rotacji, manual release.

## Wynik wdrożenia i korekty audytu

- NAT-01–04: 6 kontraktów natywnych GREEN, wcześniej 5 RED; dodatkowa regresja kolejności metadata również RED→GREEN. Runtime testy JS/revoke/retry/purpose prowadzi agent backend. Kompilacja i sprzęt pozostają oddzielnymi bramkami.
- Review root wykrył konieczność `beginCollection` przed `addMetadata`. Potwierdzenie: oficjalny Xcode SDK `HealthKit.framework/Headers/HKWorkoutBuilder.h`, dokumentacja `beginCollectionWithStartDate` linia105. Implementacja ma begin→metadata→energy→end→finish. Energia również ma stable sync identifier/version, ponieważ HealthKit zapisuje samples podczas builder.add, zanim zapisze cały workout.
- REL-01: dwie rzeczywiste regresje filesystem (zmiana JS bez zmiany HTML, podmiana/usunięcie AAB/IPA) RED→GREEN; 9 testów helpera manifestu GREEN. Hashe całych drzew uwzględniają zasoby, nie tylko HTML. Dodano release/ i .github/ do inputs.
- DOC-01: stary release train przeniesiony do jawnego historycznego snapshotu; aktualny train pokazuje source142/48 i wymaga nowego delivery verification. Test porównuje wersje ze źródeł, nie wymusza starych136/46. Runbook i Play setup zastąpione aktualną instrukcją bez haseł.
- Korekta lokalizacji: backend `mapStravaActivityToDoc` nie zapisuje GPS/latlng/polyline; pełna odpowiedź upstream Strava może przejściowo zawierać te pola, a PrivacyInfo deklaruje PreciseLocation. Nie stwierdzono trwałego zbierania tras. To rozbieżność do uzgodnienia definicji danych/metadata przed formularzami, nie potwierdzona funkcja GPS. Zdjęcia i screenshoty mają rzeczywiste ścieżki w aplikacji.
- DEP-01: root transitives zaktualizowane bez force/major; Functions ma override qs6.16.0, ponieważ Express4.22.2/body-parser1.20.6 pinują vulnerable ~6.15.1. Dzisiejsze audyty po zmianach: root0, Functions0 (osobne JSON *-after). Full tests/build po aktualizacji prowadzi root.
- Fizyczny iPhone nadal unavailable, adb bez urządzeń. Żaden powyższy GREEN nie jest potwierdzeniem rzeczywistych uprawnień Health ani usunięcia wcześniej istniejących duplikatów. Nie wykonywano migracji/usuwania Health danych.

## Dodatkowy finding Android timer — plan przekazany agentowi workout

NAT-05/P1: manifest nie miał SCHEDULE_EXACT_ALARM; plugin na API31+ przy canScheduleExactAlarms=false przechodzi na inexact setAndAllowWhileIdle. `allowWhileIdle:true` samo nie daje dokładnego alarmu. Potrzebny SCHEDULE_EXACT_ALARM plus check/changeExactNotificationSetting z oficjalnego pluginu, kontekstowa kontrolka i odmowa/recovery; bez USE_EXACT_ALARM z ograniczoną kwalifikacją Play. Uzgodnienie i implementacja JS w osobnej fali workout. Dźwięki wybrane w iOS nie mają Android res/raw, a kanał API26+ ma niezależny, niezmienny sound; należy odróżnić systemowy domyślny dźwięk od wybranego gongu. [Oficjalne Local Notifications](https://capacitorjs.com/docs/apis/local-notifications).

### NAT-05 — zatwierdzony plan implementacji

1. Niezmiennik: foreground nie planuje alertu systemowego; rest i set-countdown pozostają niezależne, cancel wygrywa z async schedule. Android tworzy kanał przypisany do wybranego dźwięku (wersjonowane ID), nigdy nie zmienia istniejącego kanału. Te same trzy WAV kopiowane do res/raw.
2. SCHEDULE_EXACT_ALARM deklarowany; brak USE_EXACT_ALARM. Profil → Timer ma krótką informację o możliwym opóźnieniu i CTA do ustawień tylko gdy brak zgody. Otwarcie ustawień wyłącznie po kliknięciu; trening nigdy nie uruchamia systemowych Settings sam.
3. Uprawnienie sprawdzane przy wejściu i resume; odmowa/błąd zostawiają dostępną kontrolkę retry. Nie blokujemy treningu ani standardowego systemowego powiadomienia. Po revoke restart systemu zachowuje istniejący mechanizm recovery draftu; ponowne uzbrojenie korzysta z aktualnego OS setting.
4. RED przed zmianą: runtime Android schedule wskazuje kanał o wybranym sound; zmiana bell→horn daje nowe channelId; cancel podczas createChannel uniemożliwia schedule. Dodatkowo UI: deny→CTA→resume grant oraz web/iOS brak kontrolki, brak automatycznego otwierania Settings.
5. Nie obiecujemy gwarancji dźwięku co90s w głębokim Doze. Android limituje allowWhileIdle (dokumentacja: około9min), niezależnie od exact grant. Fizyczne screen-off/Doze QA i ustawienia oszczędzania baterii pozostają jawne.

### NAT-05 — wykonanie

Implementacja gotowa: manifest ma wyłącznie SCHEDULE_EXACT_ALARM, trzy pliki WAV
w Android res/raw są byte-for-byte zgodne z public/, rest i odliczanie serii
korzystają z kanału wybranego gongu. Kanały są wersjonowane i nie nadpisują
ustawień systemowych użytkownika. AndroidTimerPermission jest wstawiony tylko
w Profil → Timer; błędy i odmowa zachowują przycisk, grant ukrywa opis, powrót
z Settings sprawdza aktualny stan. Brak automatycznego przekierowania do Settings.

Dowody: nowe testy Android channels2RED→GREEN, permission/resource4RED→GREEN;
cały zestaw rest+Android24/24PASS. Typecheck oraz celowany ESLint przechodzą.
Na Androidzie nadal obowiązują systemowe ograniczenia Doze, DND i wyłączenia
powiadomień. Nie dodano uprawnienia USE_EXACT_ALARM ani bypassów battery policy.

## REL-02 — bramka kompilacji Android w CI

Potwierdzona luka: `.github/workflows/deploy.yml` nie kompilował Androida,
a opcjonalny Pages deploy zależał wyłącznie od quality i iOS simulator.
Dodano niezależny `android-debug-build`, uruchamiany równolegle z tymi jobami:
Ubuntu, Node22, Temurin21, Android platform36 i Build Tools35.0.0, `npm ci`,
`npm run build:mobile`, `npx cap sync android`, następnie
`./gradlew -Dorg.gradle.java.home="$JAVA_HOME" :app:assembleDebug --no-daemon`.
Pages wymaga teraz wszystkich trzech bramek; jego istniejący warunek
`ENABLE_PAGES_DEPLOY` pozostaje zachowany. Job ma tylko `contents: read`.

Dobór SDK odpowiada źródłom: compile/target36, AGP8.13.0 i Gradle8.14.3.
AGP8.13 obsługuje API36.1, wymaga Gradle>=8.13 i domyślnie używa Build Tools35.0.0;
Gradle obsługuje wykonanie na JDK21 od8.5. Nie zmieniano wersji zależności ani
konfiguracji aplikacji. [AGP8.13 compatibility](https://developer.android.com/build/releases/agp-8-13-0-release-notes?hl=en),
[Gradle Java compatibility](https://docs.gradle.org/current/userguide/compatibility.html).

Konfiguracja i poświadczenia:

- `android/app/google-services.json` jest śledzony, poprawnie parsuje się jako JSON
  i zawiera klienta odpowiadającego applicationId. Używany jest istniejący plik;
  nie tworzono zastępczych danych Firebase ani nowych sekretów.
- Web bundle używa tych samych sześciu sekretów `VITE_FIREBASE_*`, co istniejący
  job iOS. Ich wartości i dostępność na GitHub nie zostały odczytane.
- `android/local.properties` jest ignorowany. Setup SDK dostarcza `ANDROID_HOME`,
  więc runner nie potrzebuje ścieżki SDK z komputera dewelopera.
  [Android SDK environment variables](https://developer.android.com/tools/variables).
- Śledzony `android/gradle.properties` zawiera bezwzględną macOS ścieżkę JDK.
  Samo `setup-java` byłoby niewystarczające na Ubuntu. Argument
  `-Dorg.gradle.java.home="$JAVA_HOME"` nadpisuje tę wartość wyłącznie w jobie,
  zgodnie z udokumentowanym pierwszeństwem CLI nad gradle.properties i środowiskiem.
  [Gradle build environment](https://docs.gradle.org/current/userguide/build_environment.html).
- `android-actions/setup-android@v4` instaluje wyłącznie wskazane pakiety SDK;
  brak obrazu systemu, emulatora i NDK. Runtime samej akcji to Node24,
  natomiast komendy aplikacji korzystają z Node22 ustawionego przez setup-node.
  [Setup Android action](https://github.com/android-actions/setup-android),
  [deklaracja v4](https://raw.githubusercontent.com/android-actions/setup-android/v4/action.yml).
- `assembleDebug` używa automatycznego debug keystore. To APK bez podpisu
  dystrybucyjnego, technicznie podpisany kluczem debug; nie jest unsigned release.
  Nie ma produkcyjnych kluczy, uploadu, publikacji ani zmiany numerów1.0.0/142/48.

Weryfikacja lokalna: parser YAML (wykrywanie duplikatów kluczy), rozwiązywanie
referencji jobs.needs, `bash -n` dla czterech nowych kroków run i `git diff --check`
przechodzą. Sprawdzono wykonywalny, śledzony gradlew, wrapper oraz konfigurację
Firebase/SDK/JDK. Istniejący lokalny `final-android-build.log` kończy się
`BUILD SUCCESSFUL in 12s` (642 zadania:27 wykonanych,615 up-to-date); to dowód
wcześniejszej lokalnej kompilacji, nie wykonania nowego workflow. Nie uruchamiano
równoległego cap sync ani kompilacji; świeży build po freeze prowadzi root.
Nowy job na GitHub nie został uruchomiony. Ostateczne potwierdzenie runnera,
dostępności istniejących sekretów i pobierania SDK nastąpi w jego pierwszym biegu.

### REL-01 — konfiguracja Firebase Androida w wejściach kandydata

Końcowy review wykazał pominięcie śledzonego `android/app/google-services.json`
przez selektor wejść manifestu. Ten plik określa konfigurację klienta Firebase
Androida, więc jego zmiana musi unieważniać kandydata. Dodano wyłącznie tę ścieżkę
do `EXACT_RELEASE_INPUTS`; generator uwzględnia ją także przez listę wymaganych wejść.

Regresja przechodzi przez rzeczywisty `selectReleaseInputPaths`, buduje dwa
manifesty z syntetycznymi hashami konfiguracji i wymaga różnego candidateSha256
oraz `source:changed:android/app/google-services.json`. Przed poprawką oba hashe
kandydata były identyczne: 1 RED, 9 PASS (`manifest-android-firebase-red.log`).
Po poprawce: 10/10 PASS (`manifest-android-firebase-green.log`), celowany ESLint
i diff-check PASS. Nie odczytywano ani nie drukowano zawartości konfiguracji.
Istniejący kandydat musi zostać wygenerowany ponownie przez prowadzącego po freeze.
