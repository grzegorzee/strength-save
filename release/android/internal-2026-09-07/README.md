# Android — wydanie testowe 2026-09-07

Zakres: nowy podpisany AAB do istniejącego Google Play Internal Testing. Wersja produktu pozostaje `1.0.0`; kandydat `versionCode 49` wynika z ostatniego numeru `48` w repo. Najwyższego numeru w Google Play nie udało się jeszcze potwierdzić. Publikacja produkcyjna nie jest częścią tego wydania.

## Preflight dostępu

- `android/key.properties` ma komplet czterech wymaganych pól, a wskazany keystore istnieje poza repo, w prywatnym katalogu Android. Nie ujawniono haseł ani zawartości klucza.
- Odczyt certyfikatu keystore: PASS, `PrivateKeyEntry`, RSA 2048, ważny do 2053-12-02. SHA256 upload key: `8F:65:CB:13:AD:7B:7D:FE:08:71:DD:AA:CE:C3:B3:A4:52:4B:90:A4:8E:E0:95:3C:6C:37:BA:9B:E3:7A:9C:65`.
- W istniejących narzędziach projektu i prywatnych konfiguracjach Android/projektu nie znaleziono dedykowanego upload CLI ani Play service-account JSON. Firebase `google-services.json` nie jest poświadczeniem uploadu Google Play.
- Istniejące Google ADC odświeża domyślny token, lecz read-only GET do API Play zwraca `403 / ACCESS_TOKEN_SCOPE_INSUFFICIENT`. Żądanie zakresu `androidpublisher` przy odświeżeniu zwraca `restricted_client`. Test użył nieistniejącego edit ID `0`; nie utworzono edycji, nie wysłano AAB ani nie zmieniono kanału wydania.
- Próba użycia istniejącego Chrome przez `browser-use` nie uzyskała połączenia: remote debugging nie jest włączony. Nie odczytywano ani nie eksportowano cookies/tokenów, nie wyświetlano prośby o logowanie. Oficjalna instrukcja narzędzia wymaga jednorazowego ręcznego włączenia przełącznika w `chrome://inspect/#remote-debugging`.

## Narzędzia weryfikacji

JDK 21 jest dostępny. `bundletool 1.18.3` pobrano z oficjalnego release Google do tymczasowego katalogu narzędzi poza repo. SHA256 pliku zgadza się z digestem release: `a099cfa1543f55593bc2ed16a70a7c67fe54b1747bb7301f37fdfd6d91028e29`. Binaria i sekrety nie są dodawane do Git.

Build podpisanego AAB oczekuje na zakończenie podniesienia numerów i synchronizacji mobilnego bundla przez root. Po buildzie osobny receipt zapisze wersję, hash AAB, zgodność zasobów, podpis oraz wyniki kontroli 16 KB. Sam lokalny podpisany plik nie jest dowodem publikacji na kanale testowym.

## Kolejność Internal Testing

1. Uzyskać dostęp do istniejącej aplikacji w konsoli lub przez poświadczenie z właściwymi uprawnieniami Android Publisher. Potwierdzić najwyższy użyty versionCode, istniejący kanał Internal Testing i upload certificate.
2. Zbudować i zweryfikować finalny AAB; przy zajętym numerze `49` uzgodnić wyższy numer i przebudować.
3. Wysłać konkretny zweryfikowany AAB wyłącznie do Internal Testing; zachować release notes PL/EN i dotychczasowe grono testerów. Zweryfikować wynik przetwarzania oraz stan testowego wydania.
4. Sprawdzić instalację ze sklepu, zwłaszcza Google Sign-In, Play Integrity i zakup testowy, ponieważ Play App Signing może używać innego certyfikatu niż upload key.

Źródła: [Android Publisher setup](https://developers.google.com/android-publisher/getting_started), [tracks i testowe wydania](https://developers.google.com/android-publisher/tracks), [bundletool](https://developer.android.com/tools/bundletool), [oficjalny release bundletool 1.18.3](https://github.com/google/bundletool/releases/tag/1.18.3), [kontrola 16 KB](https://developer.android.com/guide/practices/page-sizes?hl=en), [lokalne połączenie browser-use](https://github.com/browser-use/browser-harness/blob/main/install.md).
