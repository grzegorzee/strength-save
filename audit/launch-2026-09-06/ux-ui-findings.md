# UX/UI i objętość tekstu — 2026-09-06

Audyt obejmuje mobilną warstwę React wspólną dla web/iOS/Android. Dane są
syntetyczne; badanie nie dotyka treningów realnych osób. Screenshots bazowe
obejmują 13 tras aktywnego użytkownika, onboarding, admina i cztery orientacje
poziome. Dodatkowo porównano pierwsze cztery kroki onboardingu w PL/EN.

## Ocena nadmiaru tekstów

Dzisiaj, Postępy, Historia i zamknięty Profil mają krótką, czytelną hierarchię.
Nie ma podstaw do globalnego skracania wszystkich opisów. Na ekranie treningu
nazwy ćwiczeń i wyników są treścią użytkową, a instrukcje techniki pomagają
bezpiecznie wykonać ćwiczenie. Opisy konsekwencji w synchronizacji, zgodach,
subskrypcji i usuwaniu konta pozostają istotne dla decyzji.

**UX-03 / P2, naprawione:** onboarding powtarzał offline w opisie i pod CTA;
opis poziomu powtarzał nagłówek, a opis dni — pytania nad kontrolkami. Usunięto
te powtórzenia, skrócono wyjaśnienie rekomendacji i opisy czterech celów. Zostają
kryteria doboru planu, przedziały doświadczenia, informacja o późniejszej zmianie
dni, informacja o subskrypcji i osobny ekran zgód. Komunikat listy oczekujących
nie używa już wewnętrznych pojęć „invite/cohorta”. Formularz cardio ma jedną
krótką instrukcję.

Rozwinięto także sekcje Profilu: trening, timer, urządzenia, dane i konto w
obu językach (`ux-details/`, 10 obrazów stanu przed ostatnim skróceniem hintów).
Skrócono opis gongu, rozgrzewki i integracji; opis podtrzymania ekranu nie obiecuje
już bezwarunkowego działania. Usunięto drugi opis tego samego uprawnienia PRO
w ustawieniach urządzeń. Ekran zapisu na testy mówi teraz o miejscu i powiadomieniu
e-mailem, bez „cohorty” i „specjalnych flag konta”. Przyciski, ustawienia,
informacje o zgodach i ścieżki naprawy pozostają dostępne.

Końcowa kontrola rozgrzewki (7 IX): pierwszorazowe wyjaśnienie skrócono do
„Przygotuj ciało do pierwszych serii.” / „Get ready for your first sets.”.
Usunięto powtórzoną stałą obietnicę 4–6 minut; sąsiedni opis wyświetla właściwy
czas wybranego zestawu. Dialog, dostępność opcji i informacja o celu pozostają.
Zestaw copy/dialog/generator/preferencje/autostart: 69/69 PASS po tej zmianie.

Pomiar `body.innerText` na tych samych ekranach 390×844, z tym samym fikcyjnym
imieniem i językiem; liczby obejmują również etykiety przycisków i opcje:

| Język | Przed, słowa na krokach 1–4 | Po | Zmiana |
| --- | --- | --- | --- |
| PL | 31 + 26 + 56 + 53 = 166 | 22 + 20 + 42 + 42 = 126 | −24% |
| EN | 31 + 25 + 65 + 64 = 185 | 21 + 19 + 46 + 47 = 133 | −28% |

Dowody: `copy-before/copy.json`, `copy-after/copy.json` i 16 obrazów w tych
katalogach. To pomiar czterech ekranów onboardingu, nie całej aplikacji ani
prawnych oświadczeń.

## Błędy obsługi formularza

**UX-01 / P1, naprawione:** onSave zwracał void, formularz nie czekał na wynik.
Klik kasował datę i zdjęcie, drugi klik wysyłał następny wpis. Teraz stan zapisu
blokuje ponowny submit i edycję wysyłanej treści. Błąd zachowuje zdjęcie, datę
oraz liczby i pokazuje retry; dopiero sukces resetuje datę/zdjęcie. Dwa testy
odtwarzające slow ACK/failure/retry i rejected promise były czerwone przed fixem.

**UX-02 / P2, naprawione:** walidacja liczby mówiła tylko, że zapis się nie udał.
Teraz wskazuje pole i zakres w wybranych jednostkach, ustawia focus i powiązany
opis `aria-describedby`/`aria-invalid`. Komunikat jest przy błędnym polu.
Pusty formularz wyjaśnia wymaganie jednego pomiaru lub zdjęcia. Trzy testy PL/EN
oraz empty→recovery były czerwone przed poprawką. Zestaw formularzy: 50 PASS
(przed finalną pełną bramką).

**UX-04 / P1, naprawione:** świeży natywny iOS build ujawnił formularz logowania/rejestracji
z przyciskiem pod klawiaturą, nieosiągalnym przez przewinięcie. Keyboard.resize=none
jest niezmiennikiem treningu; Login nie kompensował istniejącego --keyboard-inset.
Minimalna poprawka ustawia tylko na iOS wysokość scrollowalnej powłoki do widocznej
części ekranu. Android już zmniejsza WebView. Dwa testy geometrii były RED,
następnie 4/4 Chromium+WebKit GREEN; wpisane dane przetrwały zamknięcie klawiatury.
Obrazy przed poprawką: native-shots/ios-keyboard.png i ios-keyboard-scrolled.png.
Po poprawce wykonano ponowny build, reinstalację i otwarcie systemowej klawiatury
na nowym symulatorze iPhone 17 / iOS 26.5. `native-shots/ios-keyboard-after.png`
potwierdza widoczne pola oraz przycisk nad klawiaturą. Osobny świeży emulator
Android API 35 również pokazuje osiągalny przycisk (`native-shots/android-keyboard.png`).
Nie logowano się na rzeczywiste konto. To dowód dla formularza logowania;
VoiceOver/TalkBack i klawiatury na fizycznych urządzeniach pozostają poza tym smoke.

**UX-05 / P2, naprawione:** przerwany częściowy import pokazywał error, lecz nie dodawał historii
Undo. Teraz written>0 zapisuje historię właściwego konta także przy failure, bez
udawania pełnego sukcesu. Testy obejmują close→open→Undo, retry, brak zapisów oraz
zmianę konta podczas oczekiwania. Dwie regresje RED→GREEN, 36 celowanych testów PASS.

## Ocena zasad projektowych

- Główne CTA są widoczne i odróżnione akcentem; szczegóły Profilu są zwijane.
- Kontrolki Button mają mobilne minimum 44×44 CSS px; małe kontrolki, reflow i
  dostępność czytnikiem wymagają osobnej pełnej macierzy — nie ogłaszamy zgodności
  WCAG wyłącznie z klasy CSS.
- E2E obejmuje PL/EN, szerokość 320 px, większy tekst i zasłanianie klawiaturą.
  Fizyczne Dynamic Type, VoiceOver/TalkBack i safe-area pozostają bramką urządzeń.

Punkty odniesienia sprawdzone online:
[Apple Accessibility](https://developer.apple.com/design/human-interface-guidelines/accessibility),
[Apple Entering data](https://developer.apple.com/design/human-interface-guidelines/entering-data),
[WCAG 2.2, errors i target size](https://www.w3.org/TR/WCAG22/).
