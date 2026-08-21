# Design reference: Exercises Tab (import z Claude Design, projekt c194f585)

Źródło: https://claude.ai/design/p/c194f585-f0ef-45be-abb9-83c87fe02686?file=Exercises+Tab.dc.html
Czcionki designu: Space Grotesk (display), Inter (body) — w aplikacji użyj ISTNIEJĄCYCH fontów/tokenów apki.
Akcent designu: `--acc` (opcje #FF8B3D/#FFD60A/#00E3FD/#CEFC22) — w aplikacji użyj AKTUALNEGO akcentu apki (single accent po redesignie), NIE hardkoduj koloru z designu.

## Ekran 1 (poziom 1): siatka grup mięśniowych

Layout (karta 390x844, tło #0e0e0e, tekst #f2f1ee):
- Header: pasek `EXERCISES` (display, 15.5px, bold, letter-spacing .14em) po lewej + `243 IN LIBRARY` (mono 9.5px, kolor muted #9a9892) po prawej. Padding górny pod safe-area.
- Search bar: wysokość 46px, radius 14px, tło #1c1c1c, ikona lupy + placeholder "Search all exercises" (14.5px, #767469).
- Grid 2 kolumny, gap 10px, kafle grup:
  - Kafel: radius 20px, tło #1c1c1c, kolumna: zdjęcie (wys. 78px, pełna szerokość, object-cover) + wiersz podpisu (padding 9px 12px 10px): nazwa grupy (display 15.5px bold) po lewej, licznik ćwiczeń (mono 9.5px, kolor AKCENT) po prawej.
  - 8 grup w designie: Chest 28, Back 34, Shoulders 31, Legs 40, Arms 41, Core 32, Glutes 22, Calves 15 (liczniki w apce = realne z biblioteki).
- Pod gridem: wiersz "New custom exercise": radius 18px, tło #131313, min-height 50px, ikona plus w kolorze akcentu, chevron po prawej.
- Bottom nav: 5 tabów TODAY / PLAN / HISTORY / PROGRESS / EXERCISES, ikony 20px stroke 1.7, podpis mono 10px letter-spacing .08em, aktywny tab w kolorze akcentu, nieaktywne #9a9892, tło #131313.

## Ekran 2 (poziom 2): widok grupy (przykład Chest)

- Hero: zdjęcie grupy pełna szerokość, wysokość 150px, tło #1c1c1c pod spodem.
  - Przycisk wstecz: kółko 36px, `rgba(10,10,10,.6)` + `backdrop-filter: blur(8px)`, strzałka w lewo, pozycja lewy górny róg pod safe-area.
- Pod hero: `28 EXERCISES` (mono 9.5px, letter-spacing .16em, kolor AKCENT) + tytuł grupy (display 28px bold).
- Filtry (chipsy, poziomy scroll): `ALL 28` (tło akcent, tekst ciemny), `COMPOUND`, `ISOLATION`, `BODYWEIGHT` (tło #1c1c1c, tekst #dedcd6). Mono 9.5px, padding 8px 12px, radius 999px.
- Lista ćwiczeń: kontener radius 20px, tło #131313, wiersze min-height 56px, border-bottom #1c1c1c:
  - Nazwa (14px, ellipsis) + druga linia: typ (mono 8.5px, COMPOUND/#9a9892, BODYWEIGHT/#767469) `·` `BEST 92.5 kg × 5` (mono 9.5px #9a9892, tylko gdy istnieje najlepsza seria).
  - Badge `PR` (mono 8.5px, tło akcent 15% przezroczystości, tekst akcent, pill) gdy ćwiczenie ma PR.
  - Chevron po prawej (#5c5a55).
- Bottom nav jw.

## Zasady adaptacji do apki

1. Kolory twarde z designu (#0e0e0e, #1c1c1c, #131313, #9a9892, #767469, #5c5a55, #f2f1ee, #dedcd6) mapuj na istniejące tokeny apki o tych samych rolach; jeśli brak odpowiednika, użyj wartości z designu.
2. Teksty przez i18n (PL + EN), NIE hardkoduj angielskich labeli.
3. Zdjęcia grup: assety generowane (patrz WP3-images) — jeden plik na grupę, object-cover w kaflu (78px) i w hero (150px).
4. Wiersz "BEST" = najlepsza seria usera dla ćwiczenia (istniejące dane rekordów/PR jeśli są; jeśli w apce brak takich danych per ćwiczenie, pokaż tylko typ, bez BEST).
5. Grupy mięśniowe = realna taksonomia z biblioteki ćwiczeń apki (nie kopiuj listy 8 grup na ślepo, zmapuj na to, co jest w danych).
