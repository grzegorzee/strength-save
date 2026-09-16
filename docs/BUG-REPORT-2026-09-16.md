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
  brak nowego mostu lub uprawnień. iOS plugin odczytuje UIImage i zwraca obraz
  przekodowany natywnie; web pozostaje przy input, Android przy pickerze pluginu.
  Decoder img uzupełnia obsługę WebKit, bez zmiany zachowania innych zdjęć w apce.
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
4210 testów klienta PASS, pełny backend PASS, 28 testów zgłoszeń PASS,
15 integracyjnych na emulatorze Firebase PASS. Typecheck, lint i build PASS.
Native UI: iOS26.5 100/112/135%, Android API35 100/135%; prawdziwa klawiatura,
zmiana kategorii, profile i hasło, najwyżej1 dialog; szkic po cold launch.
Nie zapisywano treningów na realnym koncie.

## Wdrożenie

W toku. Backend, web, iOS149 i Android55 są przygotowywane. Wyniki odczytu
produkcyjnego zgłoszenia i zdarzeń dostarczenia SES zostaną dopisane po wdrożeniu.
Test na fizycznym iPhonie pozostaje niepotwierdzony; nie utożsamiać go z testem
symulatora ani potwierdzeniem serwera pocztowego.
