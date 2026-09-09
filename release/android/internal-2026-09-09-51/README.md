# Android — kandydat Internal Testing 1.0.0 (51)

**Opublikowano 1.0.0 (51) w Google Play Internal Testing przez API.** Status `completed` i identyczny SHA256 AAB potwierdzono dwoma niezależnymi odczytami. Źródła: `73f435d47c99c8df46bcf29f5d074e9a2bdef8ad`, ten sam commit i wspólny mobile build co iOS 145. [Wynik publikacji](play-delivery.json), [ponowny odczyt API](play-api-check.json), [link dla testerów](https://play.google.com/apps/internaltest/4699979891077312306).

Test podpisanego APK na izolowanym emulatorze API35/360dp przeszedł: ikona, cold start, klawiatura, Back, Home i screen-off/resume; bez logowania lub zapisów treningowych. [Raport](../../../audit/release-2026-09-09/android51-native-smoke/REPORT.md). To nie zastępuje testu na fizycznym Huawei Android10.

## Finalny AAB

- [app-release.aab](../../../android/app/build/outputs/bundle/release/app-release.aab), **18 769 071 B**.
- SHA256: `559bc0d5f891b85e07762ffda94a14a115ca13d73ecf4cd608ed41c91da702f2`.
- Rzeczywisty manifest: `com.grzegorzjasionowicz.strengthsave`, versionName `1.0.0`, versionCode `51`, minSdk `26`, targetSdk `36`.
- `cap sync android`, a następnie `:app:bundleRelease :app:assembleRelease --no-daemon` z JDK 21 — **PASS**, 29 s. Źródła i mobilny `dist` pozostawały zamrożone.
- `bundletool validate`, niezależny podpis każdego payload entry przez `JarFile`, zgodność istniejącego upload certificate, CRC ZIP i zgodność nagłówków — **PASS**.
- **24 skompilowane warianty PNG launchera** wewnątrz AAB mają identyczne widoczne piksele i alpha co nowe zasoby Androida: legacy, round, adaptive foreground i monochrome dla sześciu gęstości. Kontrola dotyczy gotowego pakietu, nie tylko plików w repo.
- Wszystkie **232 pliki runtime**, **9 897 300 B**, są identyczne w mobile `dist`, Android project assets i podpisanym AAB. Hash manifestu zawartości: `9907de83dd47e3bdac502470c2897757e274db767bd633cd8a1d772429bfcfc5`.
- Produkcyjny Google RevenueCat SDK key występuje w rzeczywistym bundle i odpowiada digestowi finalnego preflight środowiska. `inspect_artifact` — **PASS**, także kontrola braku RC secret key, service-account JSON i materiału prywatnych kluczy. Wartość publicznego SDK key nie jest wypisywana.
- `PAGE_ALIGNMENT_16K`, segmenty PT_LOAD wszystkich **6 bibliotek 64-bitowych** i wszystkie **87 APK** utworzone przez bundletool — **PASS**. Zestaw weryfikacyjny bundletool używa lokalnego debug signing wyłącznie do kontroli pakowania.

Pełny dowód i algorytm hash/parity: [artifact.json](artifact.json). Ostrzeżenie `jarsigner` o końcowej pozycji manifestu ZIP, samopodpisanym certyfikacie i timestampie ma tę samą interpretację co w wydaniu 50: każdy payload entry został dodatkowo kryptograficznie zweryfikowany przez `JarFile`; AAB nie był przepakowywany.

## Podpisany APK do testu uruchomienia

- [app-release.apk](../../../android/app/build/outputs/apk/release/app-release.apk), **19 792 757 B**, `1.0.0 (51)`.
- SHA256: `aa4f137654ba63617b07b8a8c001e71868e6e91fb4669f0a7e94899ad70e57fe`.
- `apksigner`, właściwy upload certificate, manifest, `zipalign -P 16` i wszystkie 232 pliki mobile `dist` — **PASS**.
- Podpis pochodzi z istniejącego lokalnego release signingConfig. **To nie jest podpis Play App Signing.** APK przekazano do odrębnego testu na izolowanym AOSP API 35, bez konta użytkownika. Test zakończony PASS; raport powyżej.

## Konfiguracja oraz historia

Do tej wersji wchodzą aktualne ikony/splash oraz konfiguracja Firebase z Android OAuth client dla zweryfikowanego certyfikatu Play. W Firebase dodano brakujące Play SHA1 i SHA256, zachowując wszystkie istniejące wpisy; nie zmieniono enforcement App Check. Szczegóły techniczne i dowody read-back: `audit/feedback-2026-09-09/android-branding/`.

Keyless dostęp Android Publisher przez krótkotrwałą impersonację service account został potwierdzony. Historyczny błąd raw ADC `403` z wydania 50 nie opisuje obecnego dostępu. Udostępniono nowy AAB przez `scripts/google_play_release.py --publish` po lokalnym dry-run i teście uruchomienia. Sam poprawny build nie rozwiązuje brakującego profilu płatności Play ani nie dowodzi zakupu sklepowego; stan płatności opisuje [raport](../../../docs/ANDROID-2026-09-09.md).

Poprzednie podpisane AAB 49 i 50 zachowano w `/tmp/strength-release-20260909/android-history/`. Receipt 50 pozostaje bez zmian. Logi obecnego buildu: `audit/release-2026-09-09/android-51-*.log`; APK metadata są osadzone w receipt. Nie testowano tu fizycznego Huawei P30 Pro ani urządzenia ze stronami pamięci 16 KB.

Pliki AAB/APK oraz wspólny mobile `dist` pozostały niezmienione między weryfikacją a publikacją.
