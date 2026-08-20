# Feedback pierwszego realnego użytkownika + uwagi właściciela (2026-08-20)

> Źródło: przejście onboardingu przez realną osobę + obserwacje właściciela.
> Status: lista wejściowa do planu naprawczego. T19 celowo POMINIĘTE (decyzja właściciela).

## Onboarding

- **T1** Krok "Zatwierdź protokół": nagłówek "ILE DNI W TYGODNIU?" ma mówić wprost
  "ILE DNI TRENINGOWYCH W TYGODNIU?". Dodać krótką notatkę, że plan można później
  dostosować i przełożyć treningi na inne dni.
- **T2** Wybór daty startu (chipy "DZIŚ 20 / SIE 21 / SIE 22..."): nie widać, jaki to
  dzień tygodnia. Chipy mają pokazywać dzień tygodnia (śr, czw, pt...). Dotyczy też
  pola "Wybierz konkretną datę".
- **T4** Po zakończeniu onboardingu: popup/dialog "Czy dodać pomiary ciała?" (tak/nie).
  Przy "tak" formularz wagi + pozostałych pomiarów (biceps itd.).

## Dashboard (Dzisiaj)

- **T3** Gdy cykl jeszcze nie wystartował (start w przyszłości), nie widać żadnych
  treningów i nie ma informacji dlaczego. Ma się wyświetlać informacja kiedy startuje
  cykl treningowy, z datą ORAZ dniem tygodnia.
- **T24** Po zmianie koloru akcentu (nowa paleta 11) część elementów NIE przejmuje
  wybranego koloru: na dashboardzie miesza się limonka (checkmarki tygodnia, pasek
  postępu, badge z hantlami "82") z amberem (nagłówek HI GREG, karta "What's next",
  aktywna zakładka TODAY). Audyt spójności akcentu po całej apce: elementy z
  hardcode'owaną limonką / starymi tokenami mają używać wybranego akcentu.
  (Kolory semantyczne success/warning/danger zostają semantyczne.)

## Strava

- **T5** Osoba połączyła Stravę, trening z planu zaczyna w przyszłym tygodniu, ale w tym
  tygodniu biegała. Biegi NIE wyświetliły się w dashboardzie. Aktywności Strava mają
  być widoczne od razu, także zanim wystartuje plan.
- **T6** Osoba miała biegi ORAZ spacery. Aplikacja pokazała wszystko jako bieg.
  Naprawić mapowanie typów aktywności Strava (Run/Walk/Ride/Hike/...).
- **T7** Po połączeniu ze Stravą: komunikat "połączono" jest ok, ale zaraz po nim ma
  nastąpić automatyczne przeniesienie do dashboardu + synchronizacja treningów.
  Ręczna synchronizacja: zabrać z widoku analityki/postępów (teraz można ją
  spamować i pali tokeny API), zostawić najwyżej w ustawieniach zaawansowanych
  i/lub dodać rate-limit.
- **T8** Audyt poprawności danych pobieranych ze Stravy: dystans, czas całkowity,
  średnie tempo, elewacja itd. Właściciel ma wątpliwości czy wartości są prawdziwe
  (obserwacja u innej osoby).

## Zakładka Plan

- **T9** Treningi (lista/nadchodzący trening) mają być na SAMEJ GÓRZE zakładki Plan,
  ułożone od najbliższego.
- **T10** Trening z przyszłości (jeszcze nie do odpalenia): teraz widać tylko
  instrukcję. Ma być możliwość dodania notatki / przypięcia czegoś do tego treningu.
- **T16** Poprawa designu zakładki Plan (przyciski Cykle / Edytuj / Historia i widok
  planu) — ma być spójnie i "pilnowane".
- **T17** BUG: widok pokazywał "100% done" i "12/12 tygodni" mimo że został jeszcze
  jeden trening do zrobienia. Naprawić liczenie postępu (procent i tygodnie).
  (Screenshot właściciela: WEEK 12 OF 12, baner "Plan ending", a workout Friday
  jeszcze nie zrobiony.)

## Progress / Analytics

- **T11** BUG UI: przyciski Week / Month / PDF / Copy — "Copy" wystaje poza aplikację
  (złe rozmieszczenie). Naprawić layout.
- **T12** Obok PDF dodać eksport CSV z wybranego okresu / określonej liczby treningów
  (w apce jest już eksport CSV w innym miejscu — wykorzystać istniejący mechanizm).

## Pomiary ciała

- **T13** Zdjęcia before/after: możliwość zrobienia/dodania fotki przy pomiarach,
  a po zakończeniu cyklu kolejnej i porównania przed/po.
- **T14** Panel admina: toggle per użytkownik włączający/wyłączający feature zdjęć
  before/after. Umieścić poniżej istniejącego feature'a Strava.

## Powiadomienia

- **T15** Przemyśleć zakładkę/dzwonek notifications: co tam umieszczać, jakie
  informacje mają się pojawiać. Propozycja koncepcji + wdrożenie sensownego zakresu.

## i18n

- **T18** BUG: daty po polsku przy angielskim języku aplikacji ("20 sie 2026" w
  ekranie WORKOUT HISTORY po angielsku). Formatowanie dat ma podążać za językiem
  aplikacji. Przejrzeć wszystkie miejsca formatowania dat.

## Kalendarze zakresów

- **T20** Wszędzie gdzie wybiera się zakres od-do (np. urlop/wyjazd "Zaplanuj",
  zakresy eksportu): wybór jak na Booking.com — klik na dzień początkowy i końcowy,
  dni pomiędzy podświetlone kolorem akcentu wybranym w aplikacji.

## Panel admina

- **T21** Podgląd WSZYSTKICH maili wychodzących z systemu: lista, klik otwiera
  pełną treść maila (jest AdminEmailsCard — sprawdzić czego brakuje).
- **T22** Więcej monitoringu + możliwość wykonywania akcji per użytkownik, spójność
  całego panelu.

## Ogólne

- **T23** Sensowne poprawki UI/UX zauważone przy okazji (wg oceny zespołu).

## POMINIĘTE

- **T19** Wysyłanie pojedynczych treningów na adres mailowy — właściciel wycofał się
  z pomysłu. NIE wdrażać.
