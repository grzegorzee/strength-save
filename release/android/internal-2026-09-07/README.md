# Android — wydanie testowe 2026-09-07

**Podpisany AAB `1.0.0 (49)` jest gotowy lokalnie; upload do Google Play nie został wykonany.** Źródła: commit `3c9f975b40634e83472497b331b2d4ce53bafa0b`. Zakres dystrybucji to istniejący Google Play Internal Testing. Numer `49` wynika z ostatniego numeru `48` w repo; najwyższego numeru w Google Play nie udało się potwierdzić. Publikacja produkcyjna nie jest częścią tego wydania.

## Gotowy artefakt

- Plik: [app-release.aab](../../../android/app/build/outputs/bundle/release/app-release.aab), 22 958 213 B.
- SHA256: `69ab3c28ca9ca45e4872af92d900106f2890cf591f73104ef2e172dfec4d7e7f`.
- Odczytane z finalnego AAB: applicationId `com.grzegorzjasionowicz.strengthsave`, versionName `1.0.0`, versionCode `49`, minSdk `26`, targetSdk `36`.
- Synchronizacja wyłącznie Androida po wspólnym mobile buildzie: `npx cap sync android` — PASS. Podpisany `:app:bundleRelease --no-daemon` pod JDK 21 — PASS, 37 s. Nie zmieniano źródeł ani liczników podczas tych kroków.
- `bundletool validate` — PASS. Podpis AAB odpowiada istniejącemu upload key. Szczegóły: [artifact.json](artifact.json).
- Wszystkie **235 plików aplikacji** (9 881 840 B) mają identyczną zawartość w mobilnym `dist`, Android project assets oraz podpisanym AAB. Hash manifestu zawartości: `0e13809a191c3cdb9aebfd2810cb20a62fad6a07dde7962a4b91036abfbba0b1`. Receipt podaje algorytm i oddzielnie ujmuje puste stuby Cordova; wyłączono wyłącznie metadane Findera `.DS_Store`.
- AAB żąda `PAGE_ALIGNMENT_16K`. Wszystkie segmenty ELF PT_LOAD wszystkich **6 bibliotek 64-bitowych** (arm64-v8a/x86_64) spełniają kontrolę 16 KB. Bundletool utworzył pełny zestaw **87 APK**; każdy przeszedł `zipalign -c -P 16 -v 4`.
- APK weryfikacyjne są lokalnie podpisane kluczem debug wyłącznie do sprawdzenia pakowania; nie instalowano ich ani nie wysyłano. Nie są dowodem podpisu Play App Signing.
- Pełne logi: lokalny katalog `audit/release-2026-09-07/`. Poprzedni signed AAB zachowano poza repo jako `/tmp/strength-release-20260907/android-history/app-release-before-49.aab`.

## Interpretacja weryfikacji podpisu

`jarsigner` zwrócił `jar verified` i kod 0. Oprócz ostrzeżeń o samopodpisanym upload certificate, braku timestampu i niechronionych atrybutach POSIX zgłosił różnicę w weryfikacji przez `JarInputStream`: `META-INF/MANIFEST.MF` znajduje się na końcu ZIP (indeks 1370). Ten czytnik oczekuje manifestu na początku strumienia, zgodnie z [dokumentacją Java 21](https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/jar/JarInputStream.html).

Dlatego niezależnie od komunikatu `jar verified` odczytano każdy payload entry przez weryfikujący `JarFile`, potwierdzając jego kryptograficzny podpis i zgodność certyfikatu. Dodatkowo sprawdzono CRC, brak zdublowanych nazw ZIP oraz zgodność nazw i metod kompresji między nagłówkami lokalnymi a central directory. Wyniki są zapisane w receipt. Nie zmieniano ani nie przepakowywano AAB; akceptacja przez Google Play pozostaje oddzielnym krokiem po uzyskaniu dostępu.

## Preflight dostępu

- `android/key.properties` ma komplet czterech wymaganych pól, a wskazany keystore istnieje poza repo, w prywatnym katalogu Android. Nie ujawniono haseł ani zawartości klucza.
- Odczyt certyfikatu keystore: PASS, `PrivateKeyEntry`, RSA 2048, ważny do 2053-12-02. SHA256 upload key: `8F:65:CB:13:AD:7B:7D:FE:08:71:DD:AA:CE:C3:B3:A4:52:4B:90:A4:8E:E0:95:3C:6C:37:BA:9B:E3:7A:9C:65`.
- W istniejących narzędziach projektu i prywatnych konfiguracjach Android/projektu nie znaleziono dedykowanego upload CLI ani Play service-account JSON. Firebase `google-services.json` nie jest poświadczeniem uploadu Google Play.
- Istniejące Google ADC odświeża domyślny token, lecz read-only GET do API Play zwraca `403 / ACCESS_TOKEN_SCOPE_INSUFFICIENT`. Żądanie zakresu `androidpublisher` przy odświeżeniu zwraca `restricted_client`. Test użył nieistniejącego edit ID `0`; nie utworzono edycji, nie wysłano AAB ani nie zmieniono kanału wydania.
- Próba użycia istniejącego Chrome przez `browser-use` nie uzyskała połączenia: remote debugging nie jest włączony. Nie odczytywano ani nie eksportowano cookies/tokenów, nie wyświetlano prośby o logowanie. Oficjalna instrukcja narzędzia wymaga jednorazowego ręcznego włączenia przełącznika w `chrome://inspect/#remote-debugging`.

## Narzędzia weryfikacji

JDK 21 jest dostępny. `bundletool 1.18.3` pobrano z oficjalnego release Google do tymczasowego katalogu narzędzi poza repo. SHA256 pliku zgadza się z digestem release: `a099cfa1543f55593bc2ed16a70a7c67fe54b1747bb7301f37fdfd6d91028e29`. Binaria i sekrety nie są dodawane do Git.

Podpisany build i kontrole są zakończone. Sam lokalny plik nie jest dowodem publikacji na kanale testowym ani instalacji na urządzeniu ze stronami pamięci 16 KB. Dowód zgodności zasobów jest migawką mobilnego `dist` sprzed ewentualnej kolejnej kompilacji produkcyjnego web.

## Kolejność Internal Testing

1. Uzyskać dostęp do istniejącej aplikacji w konsoli lub przez poświadczenie z właściwymi uprawnieniami Android Publisher. Potwierdzić najwyższy użyty versionCode, istniejący kanał Internal Testing i upload certificate.
2. Użyć powyższego zweryfikowanego AAB; przy zajętym numerze `49` uzgodnić wyższy numer i przebudować.
3. Wysłać konkretny zweryfikowany AAB wyłącznie do Internal Testing; zachować release notes PL/EN i dotychczasowe grono testerów. Zweryfikować wynik przetwarzania oraz stan testowego wydania.
4. Sprawdzić instalację ze sklepu, zwłaszcza Google Sign-In, Play Integrity i zakup testowy, ponieważ Play App Signing może używać innego certyfikatu niż upload key.

Źródła: [Android Publisher setup](https://developers.google.com/android-publisher/getting_started), [tracks i testowe wydania](https://developers.google.com/android-publisher/tracks), [bundletool](https://developer.android.com/tools/bundletool), [oficjalny release bundletool 1.18.3](https://github.com/google/bundletool/releases/tag/1.18.3), [kontrola 16 KB](https://developer.android.com/guide/practices/page-sizes?hl=en), [lokalne połączenie browser-use](https://github.com/browser-use/browser-harness/blob/main/install.md).
