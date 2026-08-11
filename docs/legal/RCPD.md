# Rejestr czynności przetwarzania (RCPD) — art. 30 RODO

Administrator: WEB3 POWER Grzegorz Jasionowicz, Osiek Jasielski 46, 38-223 Osiek Jasielski, NIP 6852331914, REGON 366475053. Kontakt: contact@strengthsave.app. Brak IOD (poniżej progu "dużej skali" z art. 37 ust. 1 lit. c; ocena do powtórzenia przy wzroście bazy userów).

> RCPD jest OBOWIĄZKOWY mimo <250 pracowników, bo przetwarzane są szczególne
> kategorie danych (art. 9 — dane o zdrowiu); art. 30 ust. 5 RODO wyłącza
> zwolnienie. Aktualizować przy każdej zmianie zakresu przetwarzania.
> Ostatnia aktualizacja: 2026-08-11 (pakiet prawny v2).

Wspólne środki bezpieczeństwa (art. 32): szyfrowanie transmisji (TLS), izolacja danych per użytkownik przez Firestore Security Rules (testowane automatycznie, `scripts/test-firestore-rules.mjs`), kontrola dostępu (rola admin w dokumencie usera), App Check na klientach natywnych, kopie zapasowe Firestore, brak SDK reklamowych i trackerów.

| # | Czynność | Cele | Kategorie osób | Kategorie danych | Podstawa | Odbiorcy (procesorzy) | Transfer poza EOG | Retencja |
|---|----------|------|----------------|------------------|----------|----------------------|-------------------|----------|
| 1 | Konta użytkowników | rejestracja, uwierzytelnienie, prowadzenie konta | użytkownicy aplikacji | e-mail, nazwa, zdjęcie (opc.), hash hasła, dostawca logowania, preferencje | art. 6.1.b | Google (Firebase Auth/Firestore) | USA (DPF/SCC) | czas konta + 30 dni karencji |
| 2 | Dziennik treningowy | zapis i synchronizacja treningów, statystyki, analityka progresu | użytkownicy | treningi, serie, ciężary, notatki, RPE, oceny bólu/dyskomfortu, jakość serii (dane art. 9) | art. 9.2.a (wyraźna zgoda) + art. 6.1.b | Google (Firestore) | USA (DPF/SCC) | czas konta + 30 dni |
| 3 | Pomiary ciała | śledzenie masy i obwodów | użytkownicy | masa ciała, obwody (dane art. 9) | art. 9.2.a | Google (Firestore) | USA (DPF/SCC) | czas konta + 30 dni |
| 4 | Integracje zdrowotne | import aktywności i tętna na życzenie usera | użytkownicy, którzy połączyli | aktywności Strava, tętno HealthKit/Health Connect/Garmin (dane art. 9) | art. 9.2.a + art. 6.1.a | Google (Firestore); dostawcy integracji jako odrębni administratorzy | USA (DPF/SCC) | czas konta + 30 dni; dane Strava usuwane <=48h po odłączeniu |
| 5 | Rejestr zgód | rozliczalność zgód (art. 7 ust. 1) | użytkownicy | uid, typ/treść/wersja oświadczenia, data+godzina, IP, kanał, język, wersja aplikacji | art. 6.1.c w zw. z art. 7.1 | Google (Firestore) | USA (DPF/SCC) | czas konta + okres przedawnienia roszczeń (przeżywa usunięcie konta) |
| 6 | E-maile serwisowe | weryfikacja, bezpieczeństwo, tygodniowy digest informacyjny | użytkownicy | e-mail, imię, statystyki treningowe | art. 6.1.b | Resend | USA (SCC) | logi wysyłki do 24 mies. |
| 7 | E-maile marketingowe | nowości i promocje | użytkownicy ze zgodą opt-in | e-mail, imię | art. 6.1.a + art. 398 PKE | Resend | USA (SCC) | do wycofania zgody |
| 8 | Telemetria i logi błędów | diagnostyka, stabilność, bezpieczeństwo | użytkownicy | zdarzenia użycia, błędy, wersja aplikacji/OS | art. 6.1.f | Google (Firestore) | USA (DPF/SCC) | do 24 mies., minimalizowane |
| 9 | Subskrypcje | status PRO, rozliczenia sklepów | użytkownicy płacący | identyfikatory subskrypcji, status, historia zdarzeń billingowych (bez kart) | art. 6.1.b | RevenueCat; Apple/Google jako odrębni administratorzy płatności | USA (SCC/DPF) | czas konta + wymogi księgowe |
| 10 | Panel admina i audyt | wsparcie userów, bezpieczeństwo, dziennik akcji | użytkownicy, admin | dane kont, logi akcji administracyjnych | art. 6.1.f | Google (Firestore) | USA (DPF/SCC) | logi do 24 mies. |
| 11 | Księgowość | obowiązki podatkowe/rachunkowe | klienci | dane rozliczeniowe | art. 6.1.c | biuro rachunkowe (jeśli powierzono) | brak | okresy ustawowe (5 lat) |

Uwagi:
- Usunięcie konta: samoobsługowe w aplikacji; kolekcje kasowane wg list w `functions/src/security.ts` (GDPR_*); wyjątek: rejestr zgód (poz. 5) i dane księgowe (poz. 11).
- DPIA (art. 35): nieobowiązkowa na obecnej skali; wykonać przy przekroczeniu progu "dużej skali" (do potwierdzenia z prawnikiem).
