# Strength Save: materiały do premiery

Data: 13 września 2026.

## Pliki

- `index.html`: podgląd mockupów i Apple Watch.
- `raw/`: 42 rzeczywiste zrzuty aktualnego interfejsu, z lokalnymi danymi demonstracyjnymi. Po 9 iPhone, 9 iPad i 3 Watch na język.
- `screenshots/`: 34 gotowe pliki do App Store Connect, po 8 iPhone, 6 iPad i 3 Watch na język.
- `metadata.json`: nazwy, podtytuły, słowa kluczowe, opisy i linki PL/EN.
- `ASO.md`: uzasadnienie i źródła Apple. Frazy są hipotezą startową, bez deklarowania niezmierzonego ruchu.
- `review-notes.txt`: instrukcja dla recenzenta bez danych logowania.
- `review-access-verification.json`: wynik sprawdzenia nowego konta recenzenta.
- `asc-update-receipt.json`: identyfikatory, sumy plików i potwierdzenie przetworzenia w Apple.
- `landing-qa/`: zrzuty i wyniki kontroli strony PL/EN.
- Animacje: `../../../videos/strength-save-store-motion/renders/` w repozytorium. Wersje 1080x1920 i 720x1280, po 8 sekund, PL/EN.

## Źródło obrazów

Interfejs iPhone i iPad pochodzi z aktualnego kodu aplikacji, uruchomionego w natywnym WKWebView na osobnych symulatorach iOS 26.5. Natywna obudowa pochodzi z builda 148. Apple Watch to rzeczywista aplikacja SwiftUI na symulatorze watchOS 26.5. Dane są fikcyjne i lokalne. Konto właściciela nie było używane do zapisu treningów.

Rozmiary eksportu: iPhone 1320x2868, iPad 2064x2752, Watch 416x496. Eksport Watch usuwa wyłącznie kanał alfa, bez zmiany treści. Mockupy składają nagłówek i ramkę wokół oryginalnego ekranu. Animacje poruszają prawdziwymi zrzutami.

## Odtworzenie

1. `scripts/store-demo-fixture.mjs` definiuje fikcyjne dane.
2. `node scripts/store-demo-server.mjs` uruchamia lokalny serwer demonstracyjny na porcie 4187. Używać wyłącznie osobnych symulatorów, z kopią aplikacji i lokalnym adresem serwera w capacitor.config.json. Nie publikować tej konfiguracji.
3. Identyfikatory osobnych symulatorów zapisać w `/tmp/strength-save-store-demo/{iphone,ipad,watch}.id`.
4. `python scripts/store-capture-native.py` pobiera zrzuty i odczyt tekstu natywnego ekranu; opcja `--scene plan` pozwala odświeżyć jeden widok.
5. `python scripts/store-capture-watch.py` ustawia fikcyjny lokalny stan Watch i pobiera trzy widoki.
6. `node scripts/store-mockups.mjs` tworzy mockupy i galerię. Potrzebuje lokalnego Playwright oraz fontu Archivo z sąsiedniego repozytorium landingu.
7. `uv run scripts/store-listing-update.py` waliduje bez zapisu. Flagi `--apply --replace-existing` zapisują wcześniej sprawdzone materiały. Skrypt nie wysyła aplikacji do recenzji i nie czyta haseł.

## Zakres weryfikacji

- Obejrzane ekrany iPhone, iPad i Watch oraz gotowe kompozycje.
- Aplikacja: 4195 testów zaliczonych, 16 pominiętych; typecheck i build zaliczone; lint bez błędów, 15 istniejących ostrzeżeń. Kod działania aplikacji nie był zmieniany i nowy build nie był wydawany.
- Landing: 44 testy zaliczone, build zaliczony, 25 scenariuszy przeglądarkowych PL/EN oraz osobna kontrola sekcji Watch. Chromium desktop, mobilny WebKit i mobilny Chromium. Sprawdzono obrazy, pełne etykiety, szerokość, odtwarzanie i pauzę, ograniczony ruch oraz formularz z atrapą API. Nie wysyłano wiadomości testowych do odbiorców.
- Konto recenzenta: potwierdzone logowanie Firebase, odczyt profilu i PRO. Fizycznego treningu z synchronizacją Apple Health/Watch ten etap nie zastępuje.

## Publikacja

Strona została wdrożona na https://strengthsave.app. Metadane i grafiki trafiają do wersji roboczej App Store Connect. Samo zgłoszenie aplikacji do App Review nie jest częścią tej operacji. Animacje 8 s są przeznaczone na stronę i social media, a nie do pola App Preview, które wymaga innego formatu i długości.
