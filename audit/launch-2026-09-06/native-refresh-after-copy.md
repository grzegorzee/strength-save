# Odświeżenie natywne po końcowej korekcie copy — 2026-09-07

Po skróceniu `warmup.prestart.firstWhy` w PL/EN odświeżono lokalne debug artefakty. Nie zmieniano źródeł produktu, wersji ani numerów buildów. Nowy receipt zapisano o `2026-09-07T08:49:07.237611+00:00`.

## Wykonane kroki

1. Poprzednie trzy logi i receipt zachowano z sufiksem `before-final-copy-20260907T084127Z`. Poprzedni katalog `App.app` przeniesiono do `App-before-final-copy-20260907T084127Z.app` w tym samym katalogu produktów; zapobiega to pozostawieniu starego podpisu w świeżym unsigned simulator buildzie. Ścieżki zawiera `native-refresh-after-copy-context.json`.
2. `npm run mobile:sync` — PASS, `final-mobile-sync.log`.
3. `xcodebuild -project ios/App/App.xcodeproj -scheme App -configuration Debug -destination 'generic/platform=iOS Simulator' -derivedDataPath /tmp/strength-launch-audit-20260906/ios CODE_SIGNING_ALLOWED=NO build` — PASS, `final-ios-build.log`.
4. W `android/`: `JAVA_HOME=/opt/homebrew/opt/openjdk@21/libexec/openjdk.jdk/Contents/Home ./gradlew -Dorg.gradle.java.home=/opt/homebrew/opt/openjdk@21/libexec/openjdk.jdk/Contents/Home :app:assembleDebug --no-daemon` — PASS, `final-android-build.log`.
5. Porównano faktyczne pliki w mobile `dist`, obu projektach natywnych oraz wewnątrz zbudowanych `App.app` i `app-debug.apk`. Odczytano wersje z `Info.plist` i `aapt dump badging`, potwierdzono oba nowe teksty w JavaScript mobilnego bundla.

## Wynik

- iOS: `1.0.0 (142)`, Debug `iphonesimulator26.5`, bez podpisywania.
- Android: `1.0.0 (48)`, standardowy debug build, 36 452 342 B.
- APK SHA256: `1447dc6d610dddd33ee80b32d03a8dd06d3f304fd59257bdaae24255731e6032`.
- Wszystkie pięć lokalizacji zawiera identyczne **235 plików aplikacji**, 9 881 840 B. Hash manifestu zawartości: `0e13809a191c3cdb9aebfd2810cb20a62fad6a07dde7962a4b91036abfbba0b1`.
- Algorytm: SHA256 zwartego UTF-8 JSON posortowanych wierszy `[relativePath, byteLength, fileSHA256]`. Dwa puste pliki Cordova, tworzone przez Capacitor wyłącznie po stronie natywnej, zapisano osobno w receipt. `.DS_Store` (metadane Findera, odfiltrowane przez natywne narzędzia pakujące) wyłączono z porównania zasobów aplikacji; ich obecność i hashe też zapisano osobno. Nie usuwano tych plików.
- Dowody: `native-build-receipt.json`, `native-after-copy-verification.log`; jednorazowy generator `refresh-native-receipt-after-copy.py` wymaga mobilnego `dist` przed jego zastąpieniem przez produkcyjny build web.

Po zapisie receipt przekazano rootowi możliwość wykonania końcowego produkcyjnego buildu web. Mobilny hash jest migawką z chwili weryfikacji i nie opisuje późniejszego produkcyjnego `dist`.

## Granice weryfikacji

Nie instalowano ani nie uruchamiano ponownie nowych artefaktów po tej korekcie copy. Poprzedni test natywnego logowania i klawiatury jest zachowany jako dowód sprzed korekty tekstu, nie jako nowy smoke. Nie uruchamiano zamkniętego Android AVD; iOS simulator pozostawiono uruchomiony. Nie wykonywano fizycznego device QA, archive/release signing, publikacji ani uploadu. Historyczne IPA/AAB nie zostały przebudowane.
