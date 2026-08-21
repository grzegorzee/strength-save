# Konto QA na produkcji — setup i procedura (bramka wydania)

> Wykonuje orkiestrator w release train X27 (setup jednorazowy), potem obowiązuje przy każdym wydaniu.
> ZERO adresów i haseł w tym pliku ani nigdzie w repo (repo publiczne). Dane logowania: `~/FIRMA/_secrets/strength-save-qa.md`.

## Po co (lekcja E-8UE4S)

Testy jednostkowe i sędziowie wizualni działali na ręcznych mockach o nierealnym kształcie — obie warstwy miały to samo ślepe pole. Konto QA ma dane utworzone PRZEZ REALNE FLOW aplikacji na produkcyjnym Firebase, więc jego dokumenty mają produkcyjne kształty z natury (np. aktywny cykl z `endDate: ''`). Przejście po tym koncie przed wydaniem łapie to, czego mocki nie mogą złapać z konstrukcji.

## Setup jednorazowy (release train X27)

1. Rejestracja email+hasło przez wdrożony web (realna przeglądarka — App Check przechodzi naturalnie). Adres: alias na domenie usera, wybrany przy zakładaniu; silne hasło z generatora.
2. Zapis credów do `~/FIRMA/_secrets/strength-save-qa.md` (adres, hasło, uid, data założenia, co jest na koncie).
3. Budowa stanu WYŁĄCZNIE przez UI apki (żadnych zapisów adminem):
   - onboarding → aktywny plan (szablon 3 dni/tydz.), start w bieżącym tygodniu,
   - 3-4 ukończone sesje treningowe (różne dni, z seriami, jedna z notatką),
   - 1 szybki trening (ad-hoc) → sesja poza cyklem,
   - 1 zakończony cykl w historii (skrócony plan zakończony ręcznie — dopuszczalne raz, w setupie),
   - pomiary: wpis z liczbami + wpis ze zdjęciem, drugi pomiar po czasie (trend),
   - 1 własne ćwiczenie, 1 przełożony trening, 1 pominięty dzień.
4. Nadanie PRO przez panel admina (grant comp), żeby QA widziało pełną apkę.

## Procedura per wydanie (przed dystrybucją do testerów)

1. Web: zaloguj się na wdrożonym adresie produkcyjnym na konto QA (przeglądarka), przejdź WSZYSTKIE zakładki (Dashboard, Plan, Historia, Progres, Ćwiczenia, Pomiary, Cykle, Profil) + otwórz 1 sesję z historii + 1 ćwiczenie z biblioteki. Kryterium: zero ekranów błędu, zero pustych ekranów tam, gdzie są dane.
2. iOS: ten sam przebieg na buildzie kandydującym (symulator z nowym buildem albo TestFlight na urządzeniu).
3. Wynik zapisz w DECYZJE.md przy wpisie wydania (jednym zdaniem + ewentualne zrzuty).

## Zasady

- Przebiegi QA są NIENISZCZĄCE dla stanu bazowego: nie kończymy planu, nie kasujemy konta, nie zmieniamy języka/jednostek na stałe. Jeśli scenariusz wymaga destrukcji (usuwanie konta, koniec planu) — konto jednorazowe zakładane ad hoc i kasowane.
- Stan bazowy konta QA aktualizujemy świadomie, gdy dochodzi nowa domena danych (wpis w `_secrets/strength-save-qa.md`, sekcja "co jest na koncie").
- Konto QA NIE jest kontem prywatnym usera — testy na koncie g.jasionowicz@ zakazane jak dotąd.
