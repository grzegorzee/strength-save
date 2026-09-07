# Launch runbook — App Store i Google Play

Aktualizacja 2026-09-06. Wersja produktu pozostaje **1.0.0**. Źródła mają iOS
build142 i Android versionCode48; te numery nie są dowodem, że istniejące IPA/AAB
zawierają poprawki audytu. Dzisiejszy stan konsol nie został potwierdzony.

Audyt i plan: [raport natywny](../audit/launch-2026-09-06/native-release-findings.md).
Aktualna konfiguracja źródeł: [release-train](../release/release-train.json).
Poprzednie statusy dostaw zachowano jako jawnie historyczny snapshot w `release/history/`.

## Bramka wspólna

1. Naprawić potwierdzone usterki; przejść pełne testy, typecheck, lint, build,
   Functions i reguły, E2E Chromium/WebKit po świeżym Vite oraz buildy natywne.
2. Na fizycznych iOS i Android potwierdzić start → wyjście → inna sesja → powrót
   → ukończenie → sync; osobno zgaszony ekran, offline, force-kill, notyfikacje,
   Health grant/deny/revoke/retry, camera/share return i billing sandbox.
3. Zidentyfikować dokładny commit źródeł. Wygenerować manifest źródeł, środowiska
   i całych artefaktów (`npm run release:manifest`); po każdej zmianie ponownie
   wykonać właściwe bramki. Manifest z obecnymi starymi artefaktami nie dowodzi
   ich związku z nowymi źródłami — podpisać nowe po zamrożeniu kandydata.
4. Zachować 1.0.0. Dopiero przed nowym uploadem podnieść iOS build (+1 we
   wszystkich sześciu target/config entries) oraz Android versionCode (+1).
   Zapisz commit, hash IPA/AAB, wynik uploadu i QA jako oddzielne dowody.
5. Przygotować screenshoty finalnego UI PL/EN. Istniejący zestaw w repo jest
   punktem wyjścia; trzeba sprawdzić jego zgodność z kandydatem.

## Apple App Store

- App bundle: `com.grzegorzjasionowicz.strengthsave`. Lokalny Xcode26.6/SDK26.5
  spełnia aktualne minimum Apple. Przed uploadem uruchomić `npm run preflight:ios-release`.
- Sprawdzić w ASC agreements/bank/tax, zweryfikowany DSA trader, nowy formularz
  age rating, App Privacy labels, wersję1.0.0, support/privacy URL i listing PL/EN.
- Dane konta recenzenta przechowywać wyłącznie w prywatnym App Review Information.
  Hasło wcześniej obecne w dokumentacji usunięto; wymaga rotacji i ponownego
  sprawdzenia logowania na koncie recenzenta, bez danych realnego użytkownika.
- App Privacy labels oprzeć na aktualnym przepływie danych, PrivacyInfo.xcprivacy
  oraz bieżącej publicznej polityce. Dane zdrowotne i zdjęcia wymagają zgodnych deklaracji; rozbieżność
  deklaracji precise location i braku zapisu tras wymaga wyjaśnienia; brak permission lokalizacji nie oznacza braku
  lokalizacji pozyskanej z integracji zewnętrznej.
- Pierwsze subskrypcje `strengthsave_pro_monthly` i `strengthsave_pro_yearly`
  zgłosić wraz z pierwszą app; sprawdzić produkty, ceny, entitlement i restore
  na sandbox koncie. Nie używać opisu/listingu jako dowodu skonfigurowania IAP.
- Po zamrożeniu źródła i zmianie builda `scripts/release-ios.sh "co testować"`
  buduje, uploaduje oraz dystrybuuje TestFlight do obu grup i Beta App Review.
  To jest zewnętrzna operacja wydania; sam lokalny audyt jej nie wykonuje.
- Podłączyć zweryfikowany build do wersji sklepowej, dodać aktualne screenshots
  i review notes. Wybrać manual release; wysłanie do App Review oraz publiczne
  zwolnienie wersji wymagają świadomej decyzji o wydaniu.

## Google Play

Szczegóły: [Google Play setup](GOOGLE-PLAY-SETUP.md).

1. Potwierdzić dzisiejszy stan konta organizacji i aplikacji. Historyczne notatki
   z sierpnia mówią o zweryfikowanej organizacji; nie zastępują konsoli.
2. Zbudować i podpisać nowy AAB z finalnego źródła. Sprawdzić targetAPI36, versionCode,
   podpis, ELF i ZIP16KB. Przetestować instalację z Internal Testing.
3. Play App Signing fingerprint (SHA1 i SHA256) dodać do Firebase; upload-key
   fingerprint nie zastępuje podpisu dystrybuowanej aplikacji. Sprawdzić Google
   Sign-In, App Check/Play Integrity i push na instalacji sklepowej.
4. Utworzyć/potwierdzić produkty i base plans, service account RevenueCat, RTDN,
   offering i entitlement. Zakup testowy/restore/cancel muszą działać na License
   testerze. Uprawnienia API ograniczyć do wymaganego zakresu.
5. Uzupełnić aktualne Data Safety i Health Apps declaration, link usuwania konta,
   policy, rating, grupę odbiorców, listing PL/EN, screenshots i feature graphic.
6. Do App access podać instrukcje logowania i prywatne dane recenzenta; aplikacja
   wymaga konta, więc nie deklarować, że każdy ekran jest dostępny bez logowania.
7. Promocja zweryfikowanego Internal Testing do produkcji jest osobną decyzją
   o publikacji. Nie wnioskować gotowości sklepu z samego podpisanego pliku.

## Źródła wymagań

- [Apple SDK, age rating i DSA](https://developer.apple.com/news/upcoming-requirements/)
- [Google targetAPI36](https://support.google.com/googleplay/android-developer/answer/11926878?hl=en)
- [Google16KB](https://developer.android.com/guide/practices/page-sizes?hl=en)
- [Publikacja Health Connect](https://developer.android.com/health-and-fitness/health-connect/publish?hl=en)
