# Naprawa zgłoszeń błędów — 2026-09-16

## Ustalenia i granice diagnozy

Udokumentowana przyczyna utraty przepływu: klient uzależniał finalizację treści
od powodzenia sanitize + upload załącznika. Każdy wyjątek przerywał wysyłkę,
a wiszący Promise nie miał limitu czasu. Scheduler kasował pozostawione dokumenty
po 24 godzinach. Nie ustalono, który etap zawiódł w konkretnej próbie 13:11/13:12.

Fizyczny iPhone jest sparowany, ale ma wyłączone Developer Mode i Web Inspector.
Logi systemowe nie zawierają rozstrzygającego śladu JS. Po prośbie właściciela
„dobra a bez tego nie ogarniesz sam?” kontynuowano bez tej diagnostyki.
Nie powtarzano wykluczonych kontroli Storage, App Check, bucketu i skrzynki.

## Wysyłka i odzyskiwanie

- Sanityzacja ma budżet 15 s, upload 30 s. Upload jest anulowalny. Błąd każdego
  z tych kroków prowadzi do finalize bez obrazu; toast potwierdza wysłanie treści
  i pominięcie załącznika. Błąd samej finalizacji pozostawia szkic do retry.
- Sanitizer nadal nigdy nie wysyła oryginału z EXIF/GPS. Po odrzuceniu przez
  ImageBitmap próbuje dekodera elementu img, a następnie koduje obraz do JPEG.
  Prawdziwy HEIC w WKWebView: 2 808 983 B → 874 030 B, poprawny nagłówek JPEG,
  także po wymuszonym błędzie ImageBitmap.
- Oficjalny [Camera v8](https://capacitorjs.com/docs/apis/camera) już jest używany
  (8.2.3, core8.4.0). Zachowano plugin i istniejące recovery appRestoredResult;
  brak nowego mostu lub uprawnień. Web pozostaje przy input, iOS i Android
  przy pickerze pluginu. Decoder img obsługuje HEIC w WebKit także wtedy, gdy
  obraz trafi do sanitizera w tym formacie; wynik przechodzi przez canvas JPEG.
- Serwer finalizuje awaiting_upload bez aktywności przez 15 min, co 15 min.
  Zachowuje poprawny JPEG, a brak/uszkodzenie obrazu nie blokuje treści.
  **Wybrano serwer**, bo retry klienta wymagałby powrotu użytkownika do aplikacji.
- Transakcja ponownie sprawdza updatedAt i status. Retry po odzyskaniu/triage
  nie nadpisuje treści, nie uploaduje ponownie i nie kasuje przypiętego obrazu.
- Finalizacja zapisuje trwały znacznik emailRetryAt. Nieudane lub przerwane
  powiadomienie jest ponawiane przez scheduler, z transakcyjną dzierżawą 10 min.
  Zwykły retry nie duplikuje maila. Awaria po akceptacji SES, ale przed zapisem
  wyniku, może spowodować ponowne powiadomienie (dostarczenie co najmniej raz).
- Kasowanie pozostaje związane wyłącznie z istniejącą retencją 180 dni.

## Osobne poprawki UI

1. `6b5f699c`: jeden stan dwóch dialogów Profilu i atomowy mount/unmount;
   brak nakładania, zachowanie szkicu. Test odtworzył dwa dialogi przed zmianą.
2. `4c69e0eb`: kategoria i stopka poza przewijanym opisem. Android ma lokalne
   wyłączenie ponownego odejmowania wysokości klawiatury, ponieważ już zmniejsza
   WebView. iOS zachowuje inset. Pełny tekst przycisku przy 135%.

## Weryfikacja

[Dowody i zrzuty](../audit/bug-reports-2026-09-16/quality-gates.json).
4210 testów klienta PASS, 587 testów backendu PASS (w tym 28 testów zgłoszeń),
15 integracyjnych na emulatorze Firebase PASS. Typecheck, lint i build PASS.
Native UI: iOS26.5 100/112/135%, Android API35 100/135%; prawdziwa klawiatura,
zmiana kategorii, profile i hasło, najwyżej1 dialog; szkic po cold launch.
Nie zapisywano treningów na realnym koncie.

## Wdrożenie

Backend: createBugReport, finalizeBugReport i cleanupStaleBugReports ACTIVE,
rewizje 00006. Scheduler co 15 min ENABLED. [Odczyt wdrożenia](../audit/bug-reports-2026-09-16/backend-delivery.json).
Web opublikowany; HTML, service worker i entry assets live zgodne bajtowo z buildem
źródła 9babfab0. [Weryfikacja weba](../audit/bug-reports-2026-09-16/web-delivery.json).

Stan awaiting_upload wskazanego zgłoszenia zmieniono na new przez nowy scheduler;
oryginalny dokument i treść zachowane. SES Delivery na contact@strengthsave.app
2026-09-16 12:35:38 UTC (14:35:38 Warszawa). Powtórzenie schedulera nie zmieniło
identyfikatora maila i nie ponowiło wysyłki.
[Dowód odzyskania i dostarczenia](../audit/bug-reports-2026-09-16/recovered-report.json).
Delivery oznacza przyjęcie przez serwer odbiorcy, nie oględziny skrzynki.

iOS149: podpisany IPA i wszystkie 3 targety 1.0.0 (149) zweryfikowane, upload przyjęty
przez Apple. Odczyt ASC: VALID, APPROVED, IN_BETA_TESTING w obu grupach,
autoNotifyEnabled=true, treść What to Test zgodna.
[Dowód TestFlight](../release/ios/testflight-149.json).
Android55: podpis i zgodność 232 plików runtime potwierdzone; 87 wygenerowanych APK
przeszło zipalign 16 KB, 6 bibliotek 64-bit poprawnych; publikacja Internal Testing COMPLETED, potwierdzona odczytem Google Play API.
[Dowód Android](../release/android/internal-2026-09-16-55/play-delivery.json).
Test na fizycznym iPhonie pozostaje niepotwierdzony; nie utożsamiać go z testem
symulatora ani potwierdzeniem serwera pocztowego.
