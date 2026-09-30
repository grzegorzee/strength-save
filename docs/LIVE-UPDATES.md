# Aktualizacje OTA (live updates) warstwy JS/HTML/CSS

Stan: 2026-09-30. Pierwszy build z mechanizmem: **1.0.1 (iOS 153, Android 57)**.
Web (app.strengthsave.app) bez zmian: aktualizuje się przez PWA / service worker.

## 1. TWARDA REGUŁA UŻYCIA (czytaj przed każdą publikacją)

OTA wolno użyć **wyłącznie** do zmian, które nie zmieniają przeznaczenia aplikacji,
nie dodają nowych funkcji i nie omijają zabezpieczeń systemu. Wszystko inne idzie
przez App Review / Google Play jako nowy build (nowa wersja natywna).

**OTA WOLNO (PATCH warstwy web):**
- poprawki błędów w JS/React (crash, zły stan, zła kalkulacja, synchronizacja),
- teksty, tłumaczenia PL/EN, literówki, komunikaty błędów,
- poprawki UI: układ, kolory, odstępy, czytelność, dostępność,
- drobne usprawnienia istniejących ekranów i przepływów (mniej kroków, lepsze domyślne wartości),
- dane statyczne w bundlu (opisy ćwiczeń, szablony planów) w ramach istniejących funkcji.

**OTA NIE WOLNO (zawsze nowy build + review):**
- nowa funkcja albo nowy ekran/sekcja, której recenzent nie widział (Apple 2.3.1(a), 2.5.2),
- zmiana przeznaczenia aplikacji, nowy typ treści, sklep/katalog innego kodu (DPLA 3.3.1(B)),
- cokolwiek wymagające nowego lub zaktualizowanego pluginu natywnego, zmiany Capacitora,
  kodu w `ios/App/App`, `android/app/src/main`, `capacitor.config.ts`, uprawnień, entitlementów
  (skrypt publikacji odmawia automatycznie, patrz §4),
- zmiany zakupów, cen, paywalla, warunków subskrypcji, zgód prawnych i polityki prywatności
  wymagające deklaracji w sklepie (App Privacy / Data safety),
- obchodzenie zabezpieczeń (App Check, podpis, sandbox), zdalne włączanie ukrytych funkcji
  (flagi odblokowujące funkcje niewidziane przez recenzenta = 2.3.1(a)),
- zmiana nazwy, marki, grupy docelowej, kategorii wiekowej.

W razie wątpliwości: **review**. Numeracja: PATCH = poprawki, MINOR = nowe funkcje
(zawsze przez review), MAJOR = duże przebudowy. OTA nigdy nie zmienia wersji natywnej;
pakiet nosi identyfikator `<wersja natywna>-ota.<N>`.

### Źródła zasad (stan 2026-09-30)

- Apple App Review Guidelines 2.5.2 (cytat): „Apps should be self-contained in their bundles,
  and may not read or write data outside the designated container area, nor may they download,
  install, or execute code which introduces or changes features or functionality of the app,
  including other apps.” https://developer.apple.com/app-store/review/guidelines/#2.5.2
- Apple 2.3.1(a) (cytat): „Don't include any hidden, dormant, or undocumented features in your
  app; your app's functionality should be clear to end users and App Review. All new features,
  functionality, and product changes must be described with specificity in the Notes for Review
  section of App Store Connect […]”.
- Apple Developer Program License Agreement §3.3.1(B) (parafraza, pełny tekst w DPLA na
  developer.apple.com/support/terms): kod interpretowany (np. JavaScript wykonywany przez WebKit)
  może być pobierany, o ile nie zmienia podstawowego przeznaczenia aplikacji niezgodnie z tym,
  co zgłoszono do App Store, nie tworzy sklepu z innym kodem i nie omija podpisu, sandboxa ani
  innych zabezpieczeń systemu.
- Google Play, Device and Network Abuse (cytat): „An app distributed via Google Play may not
  modify, replace, or update itself using any method other than Google Play's update mechanism.
  […] This restriction does not apply to code that runs in a virtual machine or an interpreter
  where either provides indirect access to Android APIs (such as JavaScript in a webview or
  browser).” oraz „Apps or third-party code, like SDKs, with interpreted languages (JavaScript,
  Python, Lua, etc.) loaded at run time […] must not allow potential violations of Google Play
  policies.” https://support.google.com/googleplay/android-developer/answer/9888379

## 2. Wybrane rozwiązanie

**`@capawesome/capacitor-live-update` 8.4.4 (MIT), tryb self-host**, bez Capawesome Cloud.
Przypięte dokładnie (`"8.4.4"`); przeczytane źródło w `node_modules` jest identyczne z paczką npm
(diff zerowy, 2026-09-30).

| Kryterium | Capawesome live-update 8.4.4 | Capgo capacitor-updater 8.52.1 |
|---|---|---|
| Capacitor 8 (mamy 8.4.0) | peer `@capacitor/core >=8.0.0` | peer `^8.0.0` |
| Licencja | MIT | MPL-2.0 |
| Rozmiar natywny | ok. 1,1 tys. linii Swift + 1,5 tys. Java (rdzeń) | ok. 13,4 tys. Swift + 15,2 tys. Java |
| Self-host | `downloadBundle({url,...})` z dowolnego URL; chmura tylko dla `sync`/`fetchLatestBundle` (nie używamy) | wymaga podmiany `updateUrl`/`statsUrl`/`channelUrl`, domyślnie `plugin.capgo.app` (CapacitorUpdaterPlugin.swift:100-102) |
| Podpis | RSA-2048 PKCS#1 v1.5 SHA-256 ZIP-a, z `publicKey` podpis OBOWIĄZKOWY (LiveUpdate.swift:1008-1024, LiveUpdate.java:1504-1519) | szyfrowanie + podpis RSA/AES (większa powierzchnia) |
| Checksum | SHA-256 (LiveUpdate.swift:1026-1036) | tak |
| Rollback | `readyTimeout` + `ready()`, powrót do bundla wbudowanego, `autoBlockRolledBackBundles` (LiveUpdate.swift:814-828, 959-968, 217-242) | `notifyAppReady` + `appReadyTimeout` |
| Telemetria wysyłana | nagłówek `X-Capawesome-Device-Id` przy pobraniu (LiveUpdateHttpClient.swift:35, .java:77) | statystyki z device_id, wersjami, `is_emulator` do `statsUrl` |

Uzasadnienie: mniejsza powierzchnia kodu natywnego do audytu, MIT, pobieranie z naszego URL bez
żadnej chmury, podpis wymuszany natywnie. Rollback do **wbudowanego** bundla (nie poprzedniego OTA)
uzupełnia kontroler JS: po rollbacku wraca na ostatni dobry pakiet (§5).

Kluczowe fakty z kodu (zasada 18):
- Nowa binarka ze sklepu zawsze startuje na bundlu wbudowanym: Capacitor czyści `serverBasePath`
  przy zmianie `CFBundleVersion`/`versionCode` (`@capacitor/ios` CAPBridgeViewController.swift:18-30,
  93, 328-339; `@capacitor/android` Bridge.java:295-303, 423-449).
- Bez `appId` i przy `autoUpdateStrategy: 'none'` plugin nie wykonuje własnych zapytań
  (LiveUpdate.swift:205-215, LiveUpdate.java:345-358).
- Klucz iOS: `kSecAttrKeySizeInBits: 2048` na sztywno (LiveUpdate.swift:1049-1054), więc klucz RSA-2048.
- „Następny” pakiet aktywuje się dopiero przy starcie albo `reload()` (LiveUpdate.swift:244-248).

Odstępstwo od domyślnych zależności pluginu: Android używa OkHttp **4.12.0**
(`android/variables.gradle`, `okhttp3Version`) zamiast 5.3.2, bo OkHttp 5 podbija
kotlin-stdlib do 2.2.21, a kompilator Kotlin 2.0.21 projektu pada wtedy na
`HealthPermissionsRationaleActivity.kt`. iOS: Alamofire 5.12.2 i ZIPFoundation 0.9.20
(Package.resolved). Klucz publiczny leży w `public-key.txt` (PEM w pliku .txt), bo serwer
deweloperski Vite domyślnie blokuje `*.pem`.

## 3. Architektura

```
[publish-live-update.mjs] --gcloud--> gs://fittracker-workouts.firebasestorage.app/live-updates/
      bundles/1.0.1-ota.N.zip                          (niezmienne, cache immutable)
      <kanał>/<platforma>/<wersja natywna>/manifest.json (podpisana koperta, no-cache)
[aplikacja] --CapacitorHttp (bez CORS)--> firebasestorage.googleapis.com/v0/b/.../o/<ścieżka>?alt=media
```

- **Hosting:** domyślny bucket Firebase Storage projektu `fittracker-workouts`. `storage.rules`:
  `live-updates/**` odczyt publiczny, zapis zabroniony (tylko Admin/gcloud). Bez nowych usług i abonamentów.
- **Manifest:** `{payload, signature}`; payload: kanał, platforma, wersja natywna, `sequence`
  (monotoniczny, ochrona przed replay), `target` (id, URL, sha256, podpis ZIP, rozmiar,
  `minNativeBuild`, `requiredPlugins`, odcisk warstwy natywnej, commit źródła, `rolloutPercent`)
  albo `null` (wyłącznik: powrót do bundla wbudowanego).
- **Bezpieczeństwo:** klucz prywatny `~/FIRMA/_secrets/projekty/strength_save-live-update/private.pem`
  (NIGDY w repo; repo publiczne). W repo tylko `release/live-updates/public-key.txt`, wpięty w
  `capacitor.config.ts` (natywna weryfikacja ZIP) i w bundle JS (weryfikacja manifestu WebCrypto).
  Tylko HTTPS (http://localhost wyłącznie w buildzie testowym z `VITE_LIVE_UPDATE_ALLOW_INSECURE_LOCALHOST`;
  skrypt odmawia publikacji do bucketu z tymi zmiennymi).
- **Zgodność:** pakiet aktywuje się tylko gdy wersja natywna jest identyczna, build >= `minNativeBuild`
  i wszystkie `requiredPlugins` są dostępne (`Capacitor.isPluginAvailable`). Przy publikacji skrypt
  porównuje warstwę natywną pakietu z baseline'em builda (`release/live-updates/native-baselines/`):
  Capacitor core/ios/android, wersje 19 pluginów, hash lokalnego kodu natywnego i `capacitor.config.ts`.
  Różnica = odmowa. W jednej wersji natywnej warstwa natywna musi być stała (zmiana = `version:bump`).
- **Kanały:** `internal` (admin automatycznie; tester: przypisanie admina w panelu, karta użytkownika >
  Uprawnienia > „Kanał aktualizacji: testowy”, callable `adminSetLiveUpdateChannel` z audytem,
  pole `users/{uid}.liveUpdateChannel` poza whitelistą zapisu klienta; na urządzeniu nie ma
  przełącznika ani ukrytego gestu, Apple 2.3.1(a)),
  `production` (wszyscy). Promocja tego samego pakietu: `--promote`. Stopniowy rollout: `--rollout N`
  (kubełek FNV z identyfikatora instalacji i pakietu).
- **Aktywacja:** sprawdzenie 4 s po starcie (po rozpoznaniu usera) i przy powrocie z tła (manifest
  maks. co 30 min). Pobieranie natywnie w tle; przerwane = ponowienie przy następnej okazji
  (plugin czyści niedokończone pobrania przy starcie). Pobrany pakiet staje się „następnym” i działa
  od kolejnego zimnego startu; przeładowanie od razu tylko po powrocie z tła po >= 10 min albo po
  automatycznym rollbacku.
- **Nigdy w trakcie treningu:** bramka (`live-update-activity.ts`) blokuje aktywację, gdy: trasa
  `/workout/*`, istnieje draft nieukończony dotknięty w ciągu 12 h, `finalSyncPending`/`healthSyncPending`,
  błąd odczytu IndexedDB, user nieznany. Przy zejściu do tła w trakcie treningu „następny” jest
  przypinany do bieżącego, więc zimny start nie podmieni kodu. Draft w IndexedDB przetrwa reload
  (ten sam origin WebView niezależnie od katalogu bundla).
- **Rollback:** pakiet, który nie wyrenderuje powłoki w 20 s (`readyTimeout`), natywnie wraca do bundla
  wbudowanego i jest blokowany na urządzeniu; kontroler wraca na ostatni dobry pakiet i przeładowuje.
  Ręcznie: `--rollback` (poprzedni pakiet kanału lub `--to builtin`).
- **Telemetria (`client_errors`, reguła bez zmian):** `live-update-rollback`, `live-update-manifest-invalid`,
  `live-update-incompatible`, `live-update-bundle-rejected` (podpis/checksum). `appVersion` =
  `1.0.1-ota.N (153)` natywnie (<= 32 znaki).
- **Wersja w Profilu:** „1.0.1 (153) · aktualizacja 3” / „1.0.1 (153) · update 3”; bez OTA „1.0.1 (153)”.

## 4. Procedura publikacji

Warunki: reguły storage wdrożone (jednorazowo), commit na `main`, pełne bramki zielone
(`npm run test`, `typecheck`, `lint`, route-smoke), zmiana spełnia §1.

```bash
npm run live-update:publish -- --channel internal                 # dry-run: build, zgodność, podpis, plan
npm run live-update:publish -- --channel internal --publish       # upload + manifesty + odczyt kontrolny
# test właściciela/testerów na TestFlight/Internal Testing (restart apki x2)
npm run live-update:publish -- --channel production --promote 1.0.1-ota.N --publish [--rollout 20]
git add release/live-updates/ledger.json && git commit -m "ota: 1.0.1-ota.N na <kanał>"
```

Upload idzie przez `gcloud storage cp`; domyślne aktywne konto gcloud na tym Macu NIE ma prawa do
bucketu (sprawdzone 2026-09-30), więc ustaw `STRENGTH_SAVE_OTA_GCLOUD_ACCOUNT=<konto właściciela projektu>`.

Skrypt odmawia gdy: brak baseline'u wersji natywnej, inna warstwa natywna, niezacommitowane zmiany
(przy `--publish`), klucz prywatny niepasujący do publicznego, pakiet o tym numerze istnieje, zmienne
testowe `VITE_LIVE_UPDATE_*` ustawione.

Przy KAŻDYM buildzie sklepowym: `npm run live-update:baseline -- --platform ios|android --write`
i commit pliku (preflight iOS odmawia bez baseline'u).

## 5. Rollback

- Automatyczny (urządzenie): §3. Widać go w `client_errors` jako `live-update-rollback`.
- Ręczny (kanał): `npm run live-update:publish -- --channel production --rollback --publish`
  (poprzedni pakiet z rejestru) albo `--to 1.0.1-ota.K` / `--to builtin` (wyłącznik). Urządzenia
  przyjmą nowy manifest (wyższe `sequence`) przy najbliższym sprawdzeniu.

## 6. Checklist po publikacji

- [ ] Odczyt kontrolny skryptu OK (podpis manifestu, sha256 pakietu).
- [ ] Na urządzeniu testowym: 2 restarty, w Profilu „· aktualizacja N”.
- [ ] `client_errors` po 1 h i po 24 h: kody `live-update-*` oraz nowe błędy z `appVersion` = `…-ota.N`.
  Nowy kod błędu = rollback kanału, potem poprawka.
- [ ] Rejestr `release/live-updates/ledger.json` zacommitowany; wpis w DECYZJE.md.

## 7. Prywatność (App Privacy / Data safety)

Aplikacja pobiera z naszego bucketu manifest i ZIP. Przy pobraniu ZIP plugin wysyła nagłówek
`X-Capawesome-Device-Id` (iOS: `identifierForVendor`, Android: losowy UUID per aplikacja) oraz,
jak każde żądanie HTTP, adres IP i User-Agent. Nie przetwarzamy tych danych poza obsługą żądania
(sprawdzone 2026-09-30 odczytem: brak `auditConfigs` w polityce IAM projektu i brak `logging_config` bucketu). Telemetria błędów OTA idzie do
istniejącego `client_errors` (już zadeklarowane jako diagnostyka). Deklaracje sklepowe: patrz raport
wdrożenia 2026-09-30 w DECYZJE.md; jeśli kiedykolwiek włączymy logi dostępu do bucketu, Device ID
trzeba zadeklarować.

## 8. Notatka do App Review (build z mechanizmem OTA)

Propozycja tekstu do „Notes for Review” (EN, do wklejenia):

> This build adds an internal update mechanism for the app's web layer (JavaScript/HTML/CSS
> executed by WebKit), used only for bug fixes and small improvements of existing features,
> consistent with Guideline 2.5.2 and DPLA 3.3.1(B). Updates are signed and verified on device,
> never change the app's purpose, never add new features and never bypass OS security. New
> features always ship as new App Store builds. There is no hidden or user-facing switch for this;
> the version screen (Profile > About) shows the installed version and update number.
