# Strength Save — zasady produktu

Ten dokument jest stałym filtrem dla nowych ekranów, funkcji, treści i zmian
istniejących przepływów. Plan fali może doprecyzować rozwiązanie, ale nie może
osłabić tych zasad.

## Obietnica

Strength Save ma być prostym i skutecznym narzędziem treningowym. Użytkownik na
siłowni ma szybko rozumieć, gdzie jest, co ma zrobić teraz i co stanie się po
wykonaniu akcji. Produkt pomaga podjąć decyzję; nie zmusza do czytania interfejsu.

## Zasady obowiązkowe

1. **Jedna oczywista akcja.** Każdy ekran lub wyraźnie wydzielona sekcja ma jeden
   bieżący cel i najwyżej jedną dominującą akcję. Akcje drugorzędne nie konkurują
   z nią kolorem, rozmiarem, pozycją ani tekstem.
2. **Progresywne ujawnianie.** Najpierw pokazujemy to, czego użytkownik potrzebuje
   do decyzji teraz. Kontekst pojawia się przy elemencie, którego dotyczy, a
   ustawienia zaawansowane i rzadkie operacje dopiero na żądanie. Ukrycie nie może
   tworzyć zgadywanki: wejście do szczegółu ma czytelną etykietę i przewidywalny
   powrót.
3. **Lekka, stabilna nawigacja.** Te same obszary i czynności mają te same nazwy,
   miejsce oraz zachowanie. Nowa funkcja rozszerza istniejący model nawigacji;
   nie dodaje równoległej drogi bez uzasadnionego zadania użytkownika.
4. **Rzetelność ponad efekt.** Każda rekomendacja, estymacja i interpretacja musi
   wynikać ze zweryfikowanych danych oraz opisanej metody. Gdy danych brakuje albo
   wynik jest niepewny, mówimy to wprost lub nie pokazujemy wyniku. Interfejs nie
   może sugerować precyzji, automatyzacji ani funkcji, których produkt nie ma.
5. **Intuicyjność i zwykły język.** Etykiety opisują skutek akcji, komunikaty błędu
   podają następny krok, a pojęcia są zrozumiałe bez instrukcji i wiedzy o
   architekturze aplikacji. Ikona nie zastępuje nieoczywistej nazwy.
6. **Powściągliwość.** Nie dodajemy „AI slop”: antropomorfizacji algorytmu,
   sztucznego entuzjazmu, generycznych pochwał, pozorowanych analiz, nadmiarowych
   kart ani dekoracyjnych komunikatów. Nie używamy dziwnych lub dekoracyjnych
   emoji. Efekt jakości ma wynikać z trafności, szybkości i dopracowanego stanu.
7. **Bezpieczna prostota.** Uproszczenie nie może usuwać informacji koniecznej do
   świadomej decyzji, dostępności, kontroli danych ani drogi wyjścia z błędu.
   Stan po offline, przerwaniu i wznowieniu nadal ma wskazywać jednoznaczny
   następny krok.

## Warstwy informacji

Progresywne ujawnianie stosujemy w tej kolejności:

1. **Teraz:** stan potrzebny do bieżącego zadania i główna akcja.
2. **Kontekst:** krótkie „dlaczego”, konsekwencja albo status przy danym elemencie.
3. **Szczegóły:** historia, metodologia, ustawienia i rzadkie operacje otwierane
   świadomie przez użytkownika.

Alert bezpieczeństwa, błąd blokujący zadanie lub ryzyko utraty danych nie może
być schowany jako szczegół.

## Bramka review — pass/fail

Zmiana nie przechodzi review, jeśli na którekolwiek pytanie odpowiedź brzmi „nie”:

- Czy da się jednym zdaniem nazwać zadanie użytkownika realizowane przez zmianę?
- Czy na każdym zmienionym viewportcie widać najwyżej jedną dominującą akcję?
- Czy użytkownik rozpozna bieżący stan i następny krok bez instrukcji lub touru?
- Czy element nie dubluje istniejącej informacji, akcji ani drogi nawigacji?
- Czy szczegóły drugorzędne są dostępne na żądanie, z czytelnym wejściem i powrotem?
- Czy każda liczba, rekomendacja i obietnica ma wskazane dane, metodę oraz uczciwy
  stan braku lub niepewności?
- Czy tekst jest konkretny i neutralny, bez udawania AI, fałszywej precyzji,
  sztucznego entuzjazmu i dekoracyjnych emoji?
- Czy błąd, offline, anulowanie i wznowienie mają widoczną drogę dalszego działania?
- Czy stary główny przepływ nadal zachowuje komplet danych i dotychczasowe funkcje?

## Kryteria akceptacji zmiany produktowej

Opis zadania lub PR musi zawierać:

- scenariusz użytkownika i jedno oczekiwane zachowanie;
- wskazanie głównej akcji oraz elementów przeniesionych do szczegółu;
- źródło i metodę dla nowych twierdzeń, rekomendacji lub estymacji;
- stan podstawowy, pusty, ładowania, błędu/offline i powrotu po przerwaniu;
- dowód zachowania starego przepływu oraz sprawdzenie PL/EN;
- screenshot lub nagranie na docelowym telefonie, jeśli zmienia się hierarchia UI.

Reviewer odrzuca rozwiązanie, gdy wymaga ono objaśnienia autora, aby znaleźć
główną akcję; gdy liczba lub rekomendacja nie ma możliwego do sprawdzenia
pochodzenia; albo gdy „uproszczenie” tylko przenosi chaos do nieopisanej ikony,
menu lub kolejnego ekranu.
