# Android — opublikowany Internal Testing 1.0.0 (52)

**Wersja 52 opublikowana w Google Play Internal Testing.** Status `completed` i hash AAB potwierdzono odczytem po publikacji oraz osobnym świeżym sprawdzeniem API. [Publikacja](play-delivery.json), [niezależny odczyt](play-api-check.json), [aktualizacja dla testerów](https://play.google.com/apps/internaltest/4699979891077312306). Źródła: `75401daab404edcf71212234ca68f1e7386496db`, wspólny zamrożony mobile build z iOS 146. Ścieżka produkcyjna nie została opublikowana.

Build 52 zawiera poprawki wydania 51 oraz neutralne etykiety „Serie: {n}” / „Sets: {n}”, poprawne dla każdej liczby. Oba tłumaczenia potwierdzono w rzeczywistych AAB i APK. Logika i CSS karty pozostają bez zmian względem 51. Notatki dla testerów: [PL](whats-new-pl.txt), [EN](whats-new-en.txt), odpowiednio 336 i 324 znaki.

## Gotowe artefakty

- [app-release.aab](../../../android/app/build/outputs/bundle/release/app-release.aab): **18,769,266 B**, SHA256 `7d07f2bb0fb42f5c0eb696c9487496abce658830f21ccd24124401eb74dc4070`.
- [app-release.apk](../../../android/app/build/outputs/apk/release/app-release.apk): **19,792,941 B**, SHA256 `fcd8fafceef1ad4fedc302152fa964a0e0ea4d438d98b7ff659d7d860b35de06`.
- Rzeczywiste manifesty: `com.grzegorzjasionowicz.strengthsave`, `1.0.0 (52)`, minSdk 26, targetSdk 36.
- APK jest podpisany istniejącym lokalnym upload key. **To nie jest certyfikat Play App Signing.** AAB używa tego samego zweryfikowanego upload certificate.

## Weryfikacja

`cap sync android`, Google SDK environment preflight oraz JDK 21 `:app:bundleRelease :app:assembleRelease --no-daemon` — **PASS**; Gradle 26 s. Nie przebudowywano mobilnego `dist` ani nie zmieniano źródeł podczas kontroli.

- `bundletool validate`, CRC ZIP, brak powtórzonych wpisów i zgodność nagłówków ZIP — **PASS**.
- `JarFile` niezależnie zweryfikował podpis wszystkich **1338 wpisów payload**; zgodność AAB i APK z istniejącym upload certificate oraz `apksigner` — **PASS**. Znane ostrzeżenia Java o certyfikacie samopodpisanym, timestampie i pozycji manifestu ZIP nie zastępują tej pełnej kontroli kryptograficznej.
- **24 skompilowane warianty PNG launchera** odpowiadają widocznym pikselom i alpha aktualnych źródeł: legacy, round, adaptive foreground i monochrome.
- Wszystkie **232 pliki runtime**, **9,897,302 B**, są identyczne w mobile `dist`, Android project assets, AAB i podpisanym APK. SHA256 manifestu zawartości: `f8a03b70bba3b64dd61576d11de74b644b68e8a83f043ca745b5d3abba091221`.
- Rzeczywisty Google RevenueCat SDK key odpowiada digestowi finalnego preflight. `inspect_artifact` — **PASS**, w tym kontrola braku RC secret key, service-account JSON i materiału prywatnych kluczy. Wartości kluczy nie są wypisywane.
- `PAGE_ALIGNMENT_16K`, segmenty PT_LOAD wszystkich **6 bibliotek 64-bitowych**, **87 APK** z bundletool i podpisany release APK — **PASS**. Zestaw bundletool używa lokalnego debug signing wyłącznie do kontroli pakowania.

Pełne wyniki: [artifact.json](artifact.json). Logi: `audit/release-2026-09-09/android-52-*.log`. Dowód etykiet z obu pakietów: `audit/release-2026-09-09/android-52-set-label-package-check.json`.

[Smoke gotowego APK52](../../../audit/release-2026-09-09/android52-native-smoke/smoke.json) potwierdził aktualizację z51, hash zainstalowanego APK, cold start1108ms, widoczny ekran logowania i brak crasha. [Smoke podpisanego APK 51](../../../audit/release-2026-09-09/android51-native-smoke/REPORT.md) na izolowanym AOSP API35/360dp przeszedł kontrolę ikony, cold start, klawiatury, Back, Home i screen-off/resume przed ostatnią zmianą dwóch etykiet. Nie jest to test fizycznego Huawei P30 Pro/Android10 ani urządzenia ze stronami pamięci 16 KB.

Podpisane **AAB i APK 51** zachowano oraz ponownie sprawdzono ich SHA256 w `/tmp/strength-release-20260909/android-history/strength-save-1.0.0-51.{aab,apk}`. Receipt i publikacja 51 pozostają bez zmian. To wydanie zachowuje aktualne ikony, konfigurację Firebase certyfikatu Play i publiczny Google SDK key z 51; nie rozwiązuje brakującego profilu płatności Play ani nie dowodzi zakupu sklepowego.

Emulator zadania `emulator-5562` pozostał uruchomiony: automatyczna kontrola `safety-pretooluse` odrzuciła jego zamknięcie jako `shutdown/reboot`. Nie obchodzono blokady.
