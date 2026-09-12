# Stabilność treningu i układ iOS/Android — 12 września 2026

Poprawki źródłowe są gotowe i przeszły lokalną weryfikację. Kandydaci: iOS
1.0.0 (148), Android 1.0.0 (54). Dystrybucja zostanie potwierdzona oddzielnym
odczytem sklepów; same numery w źródłach nie oznaczają dostępności aktualizacji.

## Przyczyny i zmiany

1. **Regresja iOS po zmianie Androida.** Wspólne progi tabeli w `rem` spotkały
   się z `text-size-adjust` na `html`. W prawdziwym WKWebView systemowy tekst
   112% zwiększał również wyliczany rozmiar korzenia do 17,92 px. Tabela
   przechodziła do układu z etykietami przy każdym polu, a usuwanie spadało do
   kolejnego wiersza. Sama przeglądarka WebKit nie odtwarzała tego zachowania.
   iOS skaluje teraz tekst od `body`, pozostawiając stabilne jednostki układu.
   Osobny `src/styles/ios.css` definiuje szerokości i układ dostępności.
2. **Android powiększa tekst wewnątrz pól.** Natywny TextZoom nie zwiększa
   szerokości pól tak samo jak iOS. `src/styles/android.css` daje miejsce na
   cały zakres powtórzeń, także przy asyście. W obu aplikacjach nagłówek numeru
   serii ma znak `#` z dotychczasową etykietą dla czytnika ekranu. Dolne menu
   mieści pięć pełnych nazw, a treść treningu zachowuje systemowy rozmiar tekstu.
3. **Dodatkowo wykryte przycinanie sekund.** Minuty i sekundy w planku/spacerze
   farmera miały po około 16–27 px. Pola mają teraz minimum 44×44 px; te typy
   ćwiczeń zawijają podpisane pola, gdy wszystkie nie mieszczą się obok siebie.
4. **Firebase zatrzymywał kolejkę i powodował reload.** Diagnostyka produkcyjna
   wykazała powtarzające się `INTERNAL ASSERTION FAILED ID: 3c6b` z błędem
   `auth/network-request-failed`, przekroczenia czasu promocji sesji i recovery.
   SDK 12.8 przekazuje kod Auth do klasyfikatora błędów RPC podczas retry
   transakcji. Osłona aplikacji wykonywała wtedy przeładowanie. Adapter
   `firestore-transaction.ts` zachowuje transakcje atomowe i ograniczone retry
   konfliktów, ale klasyfikuje retry poza kolejką SDK. Błędy Auth wracają do
   obsługi lokalnego szkicu. Kod błędu jest zachowywany również przy przekazaniu
   przez tekstowe API, więc chwilowy brak sieci nie blokuje rozpoczęcia treningu.
5. **Rozgrzewka traciła otwarte okno.** Stan otwarcia nie był częścią szkicu;
   odtworzenie z chmury mogło też zastąpić lokalne odhaczenia. Szkic, fallback
   localStorage i promocja sesji przechowują teraz `warmupOpen`. Zamknięcie przez
   użytkownika jest zapisywane. Nowsza rewizja chmury aktualizuje serie,
   zachowując stan rozgrzewki tej samej aktywnej sesji.
6. **Piątek przesunięty na sobotę.** Odczyt produkcyjny potwierdził zapis
   ukończonego treningu pod datą 2026-09-12, z 21 seriami. Nie trzeba przenosić
   danych. Historyczne `dayName` pozostało „Piątek”; komunikat używa teraz dnia
   z rzeczywistej daty sesji. Nazwy własne, np. Push/FBW, pozostają nazwami.
   Korekta obejmuje toast, dzwonek, powiadomienie systemowe i nazwy historii.
7. **Sukces synchronizacji przy wiszącym banerze.** Widok zachowywał
   `finalSyncPending` nawet po potwierdzeniu całego finalnego payloadu w chmurze.
   Teraz usuwa taki szkic i baner z kontrolą wersji. Oczekujący zapis danych
   zdrowotnych nadal chroni szkic. Zarówno ekran treningu, jak i AutoSync używają
   wspólnego, idempotentnego potwierdzenia zakończenia.

Oficjalne źródło błędu SDK: [Firebase #9499](https://github.com/firebase/firebase-js-sdk/issues/9499).
Sprawdzono też [release notes](https://firebase.google.com/support/release-notes/js);
nie przyjęto bez dowodu, że samo podniesienie zależności usuwa błąd. Regresja
uruchamia rzeczywisty zainstalowany SDK, bez połączeń i zapisów produkcyjnych.

## Weryfikacja

- Pełny frontend: **487 plików, 4195 PASS, 16 istniejących SKIP**.
- Typecheck: PASS; lint: 0 błędów, 15 istniejących ostrzeżeń.
- Końcowy pakiet E2E: **66 PASS** na Chromium/WebKit; po ostatnim poszerzeniu
  pól Androida dodatkowo ponowiono 4 kontrole pól — PASS.
- Osobny przepływ plan → wyjście → szybki trening → powrót do kompletnego planu
  → zakończenie → potwierdzony sync: **2/2 PASS** (oba silniki).
- iPhone 13, iOS 26.5, WKWebView: systemowy tekst **100%, 112%, 135%**.
- Android API 35, 360 dp, WebView: systemowy tekst **100%, 135%**.
- Siedem zapisów rzeczywistego DOM natywnego: całe nagłówki, poprzednie wyniki,
  wartości/placeholdery, kontrolki minimum 44×44 px i brak poziomego overflow.
  Obejmuje ciężar/powtórzenia, masę ciała, asystę, czas i spacer farmera.
- Zrzuty ekranu obejrzano po uruchomieniu aplikacji, również Plan, Historię,
  Postępy i Profil. Zrzuty z ekranu ładowania nie stanowią wyniku kontroli.
- iOS: otwarta rozgrzewka i 2 odhaczenia przetrwały tło oraz terminate/launch.
  Jawne zakończenie pozostało zamknięte po ponownym uruchomieniu.
- Android: po wyłączeniu ekranu na kilka minut i odblokowaniu okno nadal było
  otwarte i miało 2 odhaczenia; sprawdzono również cold start treningu.
- W obu zainstalowanych aplikacjach: zakończenie bez sieci → pozostanie na
  podsumowaniu → online → toast „Sobota” → zniknięcie banera → 0 szkiców w IDB.
  Zapisane wartości 30 kg × 10 potwierdzono w testowym źródle chmurowym.

Testy natywne używają izolowanego profilu E2E i kontrolowanego mocka chmury;
przejście offline/online jest wymuszane przez `navigator.onLine` i zdarzenia.
Suspend/blokada ekranu/ponowne uruchomienie są rzeczywiste w symulatorach.
Nie są to testy fizycznego iPhone'a/Huawei ani test jakości faktycznego zasięgu.
Dane właściciela odczytano wyłącznie diagnostycznie; nie wykonywano na nich
zapisów testowych. Pomocnicze skrypty i seed są dodawane tylko do lokalnych kopii
aplikacji, nigdy do paczek produkcyjnych.

## Zrzuty i dowody

[Układ iOS 135%](../audit/stability-2026-09-12/ios-final-text135.png) ·
[Układ iOS 112%](../audit/stability-2026-09-12/ios-final-text112.png) ·
[Układ Android 135%](../audit/stability-2026-09-12/android-final-text135.png) ·
[Rozgrzewka iOS po restarcie](../audit/stability-2026-09-12/ios-final-warmup-after-kill.png) ·
[Rozgrzewka Android po blokadzie](../audit/stability-2026-09-12/android-final-warmup-after-lock.png) ·
[Kontrola geometrii natywnej](../audit/stability-2026-09-12/native-layout-verification.json) ·
[Sync iOS](../audit/stability-2026-09-12/ios-native-sync.json) ·
[Sync Android](../audit/stability-2026-09-12/android-native-sync.json).

## Zasada kolejnych zmian

Przed każdym push/deploy należy uruchomić obie aplikacje, zrobić i obejrzeć
zrzuty naprawianego ekranu i jego otoczenia, również przy większym tekście.
Specyfika systemu pozostaje pod jawnym selektorem platformy. Istniejący plugin
Capacitor TextZoom 8 pozostaje źródłem preferencji; nie dodano mostu natywnego,
uprawnień ani danych telemetrycznych. Odczyt preferencji jest powtarzany po resume;
nie uruchamia obcej Activity, więc nie wymaga nowego `appRestoredResult`.

Pierwszy CI (34683183564) potwierdził budowę obu platform. Jeden test wykrył
stare numery 147/53 w rejestrze wydań po bumpie projektów do 148/54; rejestr
uzupełniono z zachowaniem historycznej kopii. Ponowny pełny lokalny frontend:
4195 PASS / 16 SKIP. To nie wymagało zmiany kodu aplikacji ani pakietów.
