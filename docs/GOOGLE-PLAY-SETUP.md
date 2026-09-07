# Google Play — przygotowanie wydania

Stan dokumentacji: 2026-09-07. Nie jest to odczyt dzisiejszego stanu Play Console.
Konto projektu jest według wcześniejszych notatek kontem organizacji; notatka
z 2026-08-21 potwierdzała weryfikację. Przed wydaniem sprawdź bieżący stan konta,
rekord aplikacji i Internal Testing. Numery firmowe, adresy administracyjne,
service-account JSON oraz hasła recenzenta pozostają poza publicznym repo.

Kanoniczna instrukcja: [Launch runbook](LAUNCH-RUNBOOK.md).

## Źródła i artefakty

- applicationId: `com.grzegorzjasionowicz.strengthsave`.
- source versionName1.0.0 / versionCode49; compileSdk36 / targetSdk36 / minSdk26.
- Produkcyjny plik: `android/app/build/outputs/bundle/release/app-release.aab`.
- Podpisany AAB49 z commita `3c9f975b40634e83472497b331b2d4ce53bafa0b`
  zawiera poprawki audytu. Podpis, 235 zasobów oraz zgodność 16 KB zweryfikowano:
  [dowód artefaktu](../release/android/internal-2026-09-07/artifact.json).
  Upload nie został wykonany: obecne ADC nie ma zakresu Android Publisher,
  a dostęp do zalogowanej Play Console wymaga ręcznego udostępnienia Chrome.
  Bieżący najwyższy versionCode w sklepie nadal wymaga sprawdzenia przed uploadem.
  Poprzedni AAB48 zachowano poza repo. Signing keys pozostają poza repo.
- Listing PL/EN: `release/google-play/`. Potwierdź aktualność screenshotów telefonu,
  feature graphic1024×500 i ikony512×512 przed wysłaniem.

## Techniczna bramka Play

- Nowe wydania telefonu od2026-08-31 wymagają targetAPI36; źródła spełniają.
- Sprawdź ELF i ZIP alignment16KB finalnego AAB oraz instalację/systemowy smoke.
  Sam brak własnego C++ nie zwalnia z kontroli bibliotek dołączonych przez SDK.
- Android Health Connect: manifest permission declarations, provider visibility,
  systemowy permission request oraz privacy-rationale Activity/alias są częścią
  działania app. Testuj oddzielnie odczyt wagi i zapis treningu: grant, deny,
  ponowienie, revoke oraz ubijanie procesu podczas dialogu systemowego.
- Na Internal Testing potwierdź Play App Signing fingerprints w Firebase,
  Google Sign-In, App Check/Play Integrity i powiadomienia. Keystore uploadu
  i klucz podpisujący app ze sklepu mogą być różne.

## Dane bezpieczeństwa — karta do przeglądu

Poniższe mapowanie jest listą rzeczy do uzgodnienia z aktualnym backendem,
PrivacyInfo.xcprivacy i polityką; nie kopiuj automatycznie odpowiedzi do konsoli.
Brak uprawnienia GPS w AndroidManifest nie wyklucza tras z integracji Strava.

| Kategoria | Przepływ wymagający deklaracji/przeglądu |
|---|---|
| Personal info | Email, opcjonalne imię, identyfikator konta Firebase |
| Health and fitness | Treningi/serie, pomiary ciała, opcjonalne dane health po zgodzie |
| Location | Rozbieżność do wyjaśnienia: manifest iOS deklaruje precise location; mapper Strava nie zapisuje tras, choć odpowiedź upstream może zawierać współrzędne |
| Photos/videos | Avatar oraz opcjonalne zdjęcia i załączniki zgłoszenia błędu; odróżnij dane wyłącznie lokalne od uploadu |
| Other user content | Notatki treningu, treść zgłoszeń błędów |
| Financial info | Historia zakupów/subskrypcji przetwarzana przez Play i RevenueCat |
| App activity | Interakcje, diagnostyka użycia i zdarzenia wiadomości email |
| App info/performance | Błędy klienta, dane diagnostyczne i wydajności |
| Device identifiers | Token FCM, identyfikatory wymagane przez dostawców SDK |

Dla każdego przepływu ustal collected/shared, optional/required, cel, retencję,
transit encryption, usuwanie i zastosowanie wyjątku service-provider. Nie zakładaj
jednej odpowiedzi „nic shared” dla wszystkich usług bez sprawdzenia warunków i
rzeczywistej konfiguracji. Dane zdrowotne i trasy muszą odpowiadać aktualnej zgodzie.

Publiczne adresy do sprawdzenia przed submission:

- Privacy: https://strengthsave.app/privacy
- Terms: https://strengthsave.app/terms
- Usuwanie konta: https://strengthsave.app/delete-account

## Health Apps declaration

- `READ_WEIGHT`: propozycja najnowszej masy ciała, zatwierdzana przez użytkownika.
- `WRITE_EXERCISE`: opcjonalny zapis ukończonego treningu do Health Connect.
- Deklaracja musi odpowiadać wszystkim faktycznie włączonym funkcjom zdrowotnym,
  a polityka z linku rationale musi być tą samą polityką podaną w konsoli.
- Dowód z konsoli jest oddzielny od testu kodu i poprawnego manifestu Android.

## Kolejność konsoli

1. Potwierdzenie organizacji, utworzenie rekordu aplikacji, Play App Signing.
2. Internal Testing nowego AAB i instalacja przez sklep.
3. Firebase signing fingerprints, Integrity, zakup/restore jako License tester.
4. Produkty monthly/yearly, base plans, RevenueCat service account, offering/RTDN.
5. Data Safety, Health Apps, App access z instrukcją logowania, rating/odbiorcy,
   listing i grafiki. Dane logowania recenzenta tylko w prywatnym polu konsoli.
6. Przegląd fizycznego QA i decyzja o submission/produkcji.

Nie stosuj automatycznie wymogu closed testing12×14 dni do organizacji; Google
opisuje go dla nowych kont osobistych. Obowiązujące zadania należy sprawdzić w
konkretnym koncie Play Console.

Źródła: [target API](https://support.google.com/googleplay/android-developer/answer/11926878?hl=en),
[Health publish](https://developer.android.com/health-and-fitness/health-connect/publish?hl=en),
[Health permissions](https://developer.android.com/health-and-fitness/health-connect/get-started),
[Data Safety](https://support.google.com/googleplay/android-developer/answer/10787469?hl=en),
[testing personal accounts](https://support.google.com/googleplay/android-developer/answer/14151465?hl=en).
