# Android — wydanie testowe 2026-09-09

**Android `1.0.0 (50)` jest dostępny w testach wewnętrznych Google Play.** Właściciel przesłał przygotowany AAB i opublikował wersję przez Play Console. Jego zrzut ekranu pokazuje aktywną ścieżkę, najnowszą wersję 50 i status „Dostępna dla testerów wewnętrznych”; czas publikacji wyświetlony w panelu: 9 wrz 16:37. Źródła paczki: `6de07c95a0d9eaa1d37a20fa9389e6bb9f4d2829`, ten sam commit co iOS 144. Nie publikowano wersji produkcyjnej.

[Dołącz do testu i zainstaluj aplikację](https://play.google.com/apps/internaltest/4699979891077312306). Wymagane konto Google z zaznaczonej listy testerów, używane także w Sklepie Play na urządzeniu. Zrzut listy pokazuje jednego użytkownika. Domyślny język strony sklepowej: **en-US**, zgodnie z decyzją właściciela. Tymczasowa nazwa z dopiskiem `unreviewed` pozostaje do ukończenia konfiguracji i sprawdzenia aplikacji.

Pierwotny dowód dystrybucji: [play-delivery.json](play-delivery.json), oparty na zrzutach właściciela i przekazanym linku. Późniejszy niezależny odczyt API potwierdził wersję 50 na ścieżce `internal`, status `completed`, język en-US i identyczny SHA256 paczki: [play-api-check.json](play-api-check.json). Właściciel potwierdził, że link zaczął działać po początkowym opóźnieniu udostępnienia; nie oznacza to pełnego QA aplikacji na urządzeniu.

## Dostęp API do kolejnych wydań — działa

- Konto techniczne: `strength-save-play@fittracker-workouts.iam.gserviceaccount.com`; właściciel dodał je do Play Console z dostępem administratora.
- Google Play Android Developer API jest włączone w `fittracker-workouts` (potwierdzono przez Service Usage API).
- Skrypt korzysta z istniejącego **Application Default Credentials** użytkownika `g.jasionowicz@gmail.com`. Aktywne konto CLI `gcloud` to osobna konfiguracja; w tym środowisku nie należy zastępować ADC tokenem z `gcloud auth print-access-token`.
- Na wskazanym koncie technicznym dodano i odczytano rolę `roles/iam.serviceAccountTokenCreator` dla tego użytkownika. Binding dotyczy wyłącznie tego service account. Nie zmieniono pozostałych bindingów ani ról projektowych.
- Uwierzytelnianie: krótkie tokeny 900 s z zakresem `https://www.googleapis.com/auth/androidpublisher`; nie utworzono ani nie pobierano klucza prywatnego JSON. Bazowy plik ADC pozostaje niezmieniony.
- Przygotowano [google_play_check.py](../../../scripts/google_play_check.py). Tworzy tymczasową edycję do odczytu ścieżek, paczek i języka, waliduje ją i usuwa; nigdy nie wysyła AAB ani nie zatwierdza edycji. Nie uruchamiać równocześnie z edycją tej aplikacji w Play Console.

Z katalogu repozytorium:

```sh
uv run scripts/google_play_check.py --expect-version 50 --output /tmp/strength-save-play-check.json
```

Weryfikacja: 7 testów operacyjnych PASS, rzeczywisty odczyt ścieżki i hash paczki PASS, walidacja HTTP200, usunięcie edycji HTTP204. Testy obejmują sprzątanie po błędzie, odrzucenie niewłaściwej wersji lub statusu draft oraz brak zatwierdzenia edycji. Przy kolejnej publikacji zwiększyć versionCode powyżej 50, zachować wersję produktu 1.0.0 i istniejący upload key. Samo połączenie API nie omija kontroli nowej paczki ani zasad wybranej ścieżki.

## Artefakt i kontrole

- [app-release.aab](../../../android/app/build/outputs/bundle/release/app-release.aab): **22 961 298 B**.
- SHA256: `1238bbab28f61e526b9d07a334f381de77ae9822767e8f28c97473db78fca755`.
- Odczytane z AAB: applicationId `com.grzegorzjasionowicz.strengthsave`, versionName `1.0.0`, versionCode `50`, minSdk `26`, targetSdk `36`.
- `npx cap sync android` po gotowym wspólnym mobile buildzie — PASS. Podpisany `:app:bundleRelease --no-daemon` z JDK 21 — PASS, 30 s. Podczas tych kroków nie zmieniano źródeł, liczników ani mobilnego `dist`.
- `bundletool validate` — PASS. Certyfikat podpisu odpowiada poprzednio zweryfikowanemu istniejącemu upload key; SHA256 certyfikatu i szczegóły są w [artifact.json](artifact.json).
- Każdy z **1365 payload entries** przeszedł niezależną kryptograficzną weryfikację przez `JarFile`; wszystkie mają ten sam oczekiwany certyfikat. CRC ZIP, brak duplikatów oraz zgodność nazw i kompresji między nagłówkami lokalnymi a central directory — PASS.
- Wszystkie **232 pliki runtime**, łącznie **9 895 258 B**, są identyczne w mobilnym `dist`, Android project assets i podpisanym AAB. Hash manifestu zawartości: `cdda121cd362e4dcb678ca73eeacf4981c380f4036a5f38f79fe421abad76cc8`. Receipt opisuje algorytm; wyklucza wyłącznie `.DS_Store` i osobno ujmuje wygenerowane stuby Cordova. Weryfikator ponownie sprawdził, że `dist` nie zmienił się podczas kontroli.
- AAB żąda `PAGE_ALIGNMENT_16K`. Wszystkie segmenty PT_LOAD **6 bibliotek 64-bitowych** spełniają wyrównanie 16 KB. Bundletool utworzył **87 APK**, każdy przeszedł `zipalign -c -P 16 -v 4`.
- Weryfikacyjne APK mają lokalny podpis debug wyłącznie do kontroli pakowania. Nie instalowano ich ani nie wysyłano; nie stanowią dowodu podpisu Play App Signing ani testu fizycznego urządzenia 16 KB.

`jarsigner` zwrócił `jar verified` i kod 0. Podobnie jak przy buildzie 49, ostrzega o samopodpisanym upload certificate, timestampie, niechronionych atrybutach ZIP oraz czytniku `JarInputStream`, który oczekuje manifestu na początku archiwum. W tym AAB `META-INF/MANIFEST.MF` ma indeks 1367, na końcu ZIP. Dlatego każdy payload został dodatkowo zweryfikowany przez `JarFile`, z kontrolą całej struktury ZIP. Nie przepakowywano AAB. Późniejszą akceptację i dystrybucję wersji 50 potwierdza panel właściciela.

## Chronologia i dostęp

Poprzedni podpisany AAB 49 zachowano przed budową w `/tmp/strength-release-20260909/android-history/strength-save-1.0.0-49.aab`; jego SHA256 nadal wynosi `69ab3c28ca9ca45e4872af92d900106f2890cf591f73104ef2e172dfec4d7e7f`. Ponowna weryfikacja wszystkich jego 1368 payload entries — PASS. Binaria i klucze nie są dodawane do Git.

Preflight przed ręcznym uploadem, 2026-09-09 12:29:58 UTC, potwierdził **HTTP 403 / ACCESS_TOKEN_SCOPE_INSUFFICIENT**. Użyto istniejącego ADC do read-only GET z celowo nieistniejącym edit ID `0`; nie logowano ponownie, nie rozszerzano scope, nie tworzono edycji i nie wykonywano uploadu przez API. Sanitized wynik pozostaje w historycznym receipt artefaktu. Później rozwiązano dostęp przez dedykowane konto techniczne i krótkie tokeny, zgodnie z sekcją powyżej; historyczny błąd nie jest już aktualnym blockerem.

Numer 50 jest już użyty w Google Play; kolejna paczka musi mieć wyższy versionCode. Wymagana pozostaje weryfikacja instalacji ze sklepu i funkcji zależnych od Play App Signing. Agent nie wykonywał testów na rzeczywistym koncie.

Panel pokazał dwa nieblokujące ostrzeżenia: brak mapowania R8/ProGuard (w tej wersji `minifyEnabled false`, więc plik nie powstaje) oraz brak symboli bibliotek natywnych (ograniczenie diagnostyki awarii). Nie dodawano sztucznych plików diagnostycznych ani nie przebudowywano zaakceptowanej paczki.

## Dowody lokalne

- Pełny receipt: [artifact.json](artifact.json), weryfikacja zakończona 2026-09-09 13:30:52 UTC.
- Logi: `audit/release-2026-09-09/android-50-*.log`; dostęp: `android-play-access.json`.
- Weryfikator i zestaw APK: `/tmp/strength-release-20260909/`; JDK 21, bundletool 1.18.3 (wcześniej zweryfikowany digest oficjalnego wydania), Android SDK build-tools 36.0.0.
- Dowód parity dotyczy zamrożonego mobilnego `dist` podczas budowy. Nie zastępuje go późniejszy build web; root zachował produkcyjny web osobno.

Pierwotny receipt artefaktu pozostaje niezmieniony jako zapis weryfikacji przed uploadem. Późniejszą publikację przez właściciela dokumentuje osobny receipt dystrybucji.
