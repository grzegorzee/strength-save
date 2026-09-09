# Android — kandydat Internal Testing 1.0.0 (53)

**Android 1.0.0 (53) został udostępniony w Google Play Internal Testing.** Podpisane AAB i APK oraz natywny test aktualizacji 52→53 przeszły weryfikację. Źródła: `6cf6374805346ad595d9cf6566a6e916614ca1c7`, wspólny zamrożony mobile build z iOS 147. Publikację wykonał agent koordynujący. Status `completed`, wersję 53 i zgodny hash AAB potwierdzono po publikacji oraz niezależnym ponownym odczytem: [potwierdzenie publikacji](play-delivery.json), [odczyt Play API](play-api-check.json). Nie publikowano wersji produkcyjnej.

Build 53 poprawia czytelność poprzednich serii, np. „100 × 10”, na wąskich ekranach. Zachowuje aktualne ikony, pełne nazwy ćwiczeń i superserii oraz neutralne etykiety liczby serii. Notatki: [PL](whats-new-pl.txt), [EN](whats-new-en.txt), odpowiednio 301 i 295 znaków.

## Artefakty

- [app-release.aab](../../../android/app/build/outputs/bundle/release/app-release.aab): **18,769,348 B**, SHA256 `7899341fc6cbc6a352aa7b4c8b4a3f08ba6ece7ebad2fb7b18f259ddfe8f1634`.
- [app-release.apk](../../../android/app/build/outputs/apk/release/app-release.apk): **19,792,997 B**, SHA256 `7ca6322cb4dd71ecaf45b7bc0778bb18e115ad3acf57109f975f56dfbf3f7aa8`.
- Rzeczywiste manifesty: `com.grzegorzjasionowicz.strengthsave`, `1.0.0 (53)`, minSdk 26, targetSdk 36.
- AAB i APK podpisano istniejącym upload key. Lokalny APK **nie ma podpisu Play App Signing**.

## Kontrole pakietów

`cap sync android`, Google SDK preflight i JDK 21 `:app:bundleRelease :app:assembleRelease --no-daemon` — **PASS**. Gradle: 29 s. Źródła i mobilny `dist` pozostawały zamrożone.

- `bundletool validate`, CRC ZIP, unikalność wpisów i zgodność nagłówków ZIP — **PASS**.
- Podpis wszystkich **1338 wpisów payload** przez niezależny `JarFile`, AAB/APK certificate match oraz `apksigner` — **PASS**. Znane ostrzeżenia Java dotyczą samopodpisanego upload certificate, braku timestampu i pozycji manifestu; każdy wpis został dodatkowo kryptograficznie zweryfikowany.
- **24 skompilowane warianty PNG launchera** mają identyczne widoczne piksele i alpha co aktualne źródła Androida.
- Wszystkie **232 pliki runtime**, **9,897,678 B**, są zgodne w mobile `dist`, Android project assets, AAB i podpisanym APK. Hash manifestu: `9f53b56ddaa8a94c9cb639eecd7aefd925b4c75935cb226a726a9552da53004b`.
- Rzeczywisty publiczny Google RevenueCat SDK key odpowiada digestowi finalnego środowiska. `inspect_artifact` — **PASS**, w tym brak RC secret key, service-account JSON i materiału prywatnych kluczy w pakiecie.
- `PAGE_ALIGNMENT_16K`, segmenty PT_LOAD wszystkich **6 bibliotek 64-bitowych**, **87 APK** z bundletool oraz podpisany release APK — **PASS**. Zestaw bundletool używa lokalnego debug signing wyłącznie do kontroli pakowania.

## Test aktualizacji i uruchomienia

Na istniejącym zadaniowym AVD `strength_android51_smoke_20260909` ponownie potwierdzono wersję 52 i hash jej zainstalowanego APK. Następnie `adb install -r` podniósł aplikację do 53. Hash faktycznie zainstalowanego `base.apk` odpowiada artefaktowi powyżej. Cold start: **1014 ms**, `Status: ok`, ekran logowania widoczny, proces żywy i pusty crash buffer — **PASS**.

[Dowód JSON](../../../audit/release-2026-09-09/android53-native-smoke/smoke.json) · [Screenshot](../../../audit/release-2026-09-09/android53-native-smoke/logged-out-53.png). Środowisko: AOSP ARM64 Android15/API35, 360×800dp, bez Play Store. Bez logowania, tworzenia konta lub zapisów treningowych. To nie jest test Huawei Android10/EMUI11, zakupów Play ani fizycznego urządzenia 16 KB. Kolumna poprzednich serii była testowana w oddzielnych scenariuszach przeglądarkowych; ten natywny smoke pozostaje na ekranie logowania.

Na początku tego zadania AVD nie działał; uruchomiono ten sam zachowany dysk bez wipe i potwierdzono obecność 52. Przy końcowym odczycie emulator-5562 działał. Nie podejmowano nowej próby zakończenia po historycznej blokadzie automatycznej kontroli podczas smoke 52.

Podpisane AAB/APK **52** zachowano ze zgodnymi hashami w `/tmp/strength-release-20260909/android-history/strength-save-1.0.0-52.{aab,apk}`; historia 51 i wszystkie poprzednie receipts pozostają bez zmian. Logi aktualnej budowy: `audit/release-2026-09-09/android-53-*.log`. Ten build nie rozwiązuje brakującego profilu płatności Play ani nie potwierdza zakupu sklepowego.
