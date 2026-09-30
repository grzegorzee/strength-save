# Natywne materiały Androida do Google Play

Każdy ekran pochodzi z Android WebView, przechwycony przez `adb exec-out screencap -p`.
Nie użyto screenshotów iPhone'a, iPada ani generowanego interfejsu.
Dane fikcyjne: `e2e-test-user`, Alex, sześć tygodni historii, plan trzech dni.
Żaden zapis treningowy nie trafił na prawdziwe konto.

## Środowisko

- Oddzielny AVD `strength_store_api36_20260913`, Android API36, tryb read-only.
- Ekran 1080 × 1920, density360, tekst systemowy 100%.
- Natywny kontener aplikacji z bieżącym kodem UI, zbudowany `mode=mobile`.
- Lokalna demonstracyjna konfiguracja E2E; CSP blokuje połączenia WebView z backendem.
- Debug APK tylko w `/tmp/strength-save-play-demo-20260913` i w tym emulatorze.
  Nie wysłano go do Google Play. Produkcyjny AAB54 nie został zmieniony.
- Renderer programowy w izolowanym debug manifest. Sprzętowe renderowanie
  w emulatorach API35/WebView124 i API36/WebView133 powodowało błędne kafle
  obrazu na Dzisiaj i w polu serii. Wyłączenie go w kontenerze demonstracyjnym
  usunęło artefakty bez zmian CSS, treści lub układu aplikacji.
  To nie jest dowód poprawienia takiego problemu na fizycznym telefonie.
- Zrzuty nie są nowym testem zakupów, pracy w tle ani synchronizacji produkcyjnej.

## Pliki

- `assets/phone-raw/en-US` i `assets/phone-raw/pl-PL`: oryginalne zrzuty ADB.
- `assets/phone-final/en-US` i `assets/phone-final/pl-PL`: materiały sklepowe.
  SVG zawiera dokładny natywny screenshot jako osadzony PNG oraz podpis poza UI.
  Rasteryzacja rsvg-convert, wynik 1080 × 1920 RGB8 bez kanału alfa.
- `assets/feature-en-US.png` i `assets/feature-pl-PL.png`: grafiki 1024 × 500.
- `android-capture-manifest.json`: pochodzenie, parametry i SHA256 zrzutów.
- `store-graphics-manifest.json`: podpisy i powiązanie finalnych grafik z oryginałami.
- `android-assets-delivery.json`: zapis i niezależny odczyt z Google Play.

Do uploadu służą wyłącznie katalogi `phone-final` oraz dwie grafiki feature.
Luźne pliki testowe w assets nie są materiałami do publikacji.
