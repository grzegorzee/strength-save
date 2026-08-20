# BRIEF: Redesign 2026-08-20 (fala 2, po fali naprawczej T1-T24)

> Źródło: projekt Claude Design właściciela (mockupy w tym folderze).
> Mockupy są w akcencie POMARAŃCZOWYM, ale wdrożenie MUSI używać tokenów
> akcentu wybranego przez użytkownika (paleta 11). Pomarańcz na mockupie =
> `--accent` (kolor akcentu usera). Neutralne szarości/czernie = tokeny surface.

## Żelazne zasady fali 2

1. **Żadna istniejąca funkcja nie znika.** Redesign to nowa prezentacja tych
   samych możliwości. Przed zmianą ekranu agent spisuje listę WSZYSTKICH
   funkcji/akcji obecnego ekranu i po redesignie odhacza, że każda jest dostępna
   (może być w innym miejscu, np. schowana w menu, ale MUSI być).
2. **Jeden akcent + neutralne powierzchnie.** Zakaz mieszania kolorów ozdobnych.
   Kolory semantyczne (success/warning/danger) tylko tam, gdzie niosą znaczenie
   statusu. Bramka: ekran testowany na min. 3 akcentach (limonka default, amber,
   sky) - zero pozostałości innego akcentu.
3. Reużywaj istniejących tokenów/klas (index.css, tailwind config) i komponentów
   kinetic/shadcn. Nie wprowadzaj nowych hexów - tylko tokeny.
4. Wszystkie teksty przez i18n (pl.ts + en.ts).
5. Mobile-first: viewport 390px, bez horizontal scrolla, safe-area.

## Ekrany

### 1. Dashboard Simplified (`dashboard-simplified.png`)

- Header: avatar-inicjał, tytuł DASHBOARD, dzwonek, badge licznika treningów
  ("82 TOTAL" z ikoną hantli, w akcencie).
- Powitanie: ikona pory dnia + "GOOD EVENING, GREG!" (imię w akcencie, italic
  display font), pod spodem data + chip "14 WEEKS" (streak/tygodnie).
- Banner decyzji planu (jeśli plan się kończy): obrys w akcencie, "Plan ends
  Sunday / 1 more update" + przycisk "Decide".
- Karta NEXT SESSION: eyebrow "NEXT SESSION · FRIDAY" (akcent), duży tytuł dnia
  ("Lower Body Power B"), meta "Quad & glute · 5 exercises · 45 min", duży
  przycisk akcentowy "Open session", pod nim tekstowy "Reschedule".
- Pasek tygodnia: "3 of 4 sessions" + po prawej "19.5 t · WK 12/12";
  7 segmentów poziomych (nie kółka!), wypełniony = akcent; pod spodem
  "✓ Today done · Upper Body A".
- Grid 2x2 szybkich akcji: Quick workout, Add cardio, Your numbers, Analytics
  (neutralne karty z ikonami).
- Dolna nawigacja bez zmian funkcjonalnie.
- ZACHOWAĆ funkcje obecnego dashboardu, które nie są na mockupie (np. karta
  cardio z fali 1/T5, karta pre-startu cyklu z T3, baner "workout completed") -
  wkomponować w ten sam język wizualny.

### 2. Plan Tab (`plan-tab.png`)

- Header: avatar, TRAINING PLAN, przycisk "Edit".
- Tytuł planu duży ("Hypertrophy II") + "WK 12/12" w akcencie; pasek postępu
  pełnej szerokości (akcent); meta linia "Mon · Tue · Thu · Fri - 45 sessions
  done, 1 left".
- Banner decyzji (jak na dashboardzie): "Plan ends Sunday / 96% attendance ·
  24 PRs" + "Decide".
- Nawigacja tygodnia: "08/17 - 08/23" + strzałki (okrągłe przyciski).
- Lista dni tygodnia jako karty: nazwa dnia duża, meta "MON 17 · Upper A ·
  6 exercises", badge statusu (DONE - przygaszony akcent; TODAY - akcent;
  NEXT - wypełniony akcent + play), pasek postępu dnia na dole karty.
  Karta NEXT lekko podświetlona (accent/10).
- Na dole: "Not at 100%?" i "Vacation / trip" (dwa neutralne przyciski) -
  istniejące funkcje Zaplanuj/Urlop.
- Cykle/Historia: mockup ich nie pokazuje, ale funkcje MUSZĄ zostać dostępne
  (np. pod Edit menu albo osobny rząd) - decyzja agenta, byle spójnie.

### 3. Karty ćwiczeń / sesja treningowa (`quick-workout-compact.png`, `exercise-card-full.png`)

- Header sesji: strzałka wstecz, tytuł (QUICK WORKOUT / nazwa dnia), badge
  "Saved" (autozapis).
- Pasek statystyk sesji: TIME / TONNAGE / SETS (monospace, duże wartości).
- Karta ćwiczenia: miniatura/play animacji, nazwa, meta (sets · est 1RM · max),
  menu "...".
- Box "Target 100 kg × 8" (accent/10 tło, obrys) + podpowiedź progresji
  ("You hit 6 reps - add 2.5 kg").
- Tabela serii: SET | PREV | KG | REPS | licznik done (np. 1/3);
  rozgrzewkowa jako "W"; aktywna seria z obrysem akcentowym na inputach;
  odhaczenie = przycisk ✓; usunięcie = ×.
- "+ ADD SET" pełną szerokością; rząd "Plates" / "Metrics" (istniejące
  funkcje: kalkulator talerzy, metryki).
- "+ Add exercise", notatka treningu (textarea), duży akcentowy
  "FINISH WORKOUT".
- Sticky pasek REST na dole: "REST 2:00" + pasek postępu + "SKIP".
- TIMER: dodać możliwość ZMIANY USTAWIEŃ timera przerwy z poziomu sesji
  (kliknięcie w pasek REST otwiera ustawienia: długość przerwy, dźwięk,
  auto-start - wykorzystać istniejące ustawienia timera z WorkoutSettingsSheet).
- WSZYSTKIE istniejące funkcje ekranu treningu zostają (swap ćwiczenia,
  notatki ćwiczenia, animacje, PR celebration, itd.).

### 4. Workout Summary (`workout-summary-top.png`, `workout-summary-bottom.png`)

- Header: wstecz, "Thursday / Upper B · 20 Aug", przycisk Edit.
- Hero karta: OGROMNY tonaż ("5.6 t" w akcencie) + "-24% VS LAST THU";
  dwa paski porównania TODAY vs poprzedni analogiczny dzień; rząd
  TIME / SETS / % PLANNED + przycisk "Fix sets".
- Sekcja "2 NEW RECORDS": karty PR (nazwa ćwiczenia + "24 kg +4") na accent/10.
- "WHERE THE VOLUME WENT": pasek składany + legenda (Back 36%, Arms 18%...)
  - odcienie akcentu (opacity), NIE różne kolory.
- Lista EXERCISES (8) z tonażem per ćwiczenie + mini pasek + "3/3 sets"
  (niepełne serie w kolorze warning/akcent); rozwijane szczegóły (chevron).
- "SESSION SHAPE": mini słupki work/rest + "48 MIN WORK · 12 MIN REST".
- Przyciski: "Share" i "Send to coach" (neutralne, w rzędzie), potem
  **"BACK TO DASHBOARD" jako duży akcentowy przycisk TEJ SAMEJ WIELKOŚCI co
  "FINISH WORKOUT" w sesji** (wymóg właściciela), pod spodem tekstowy
  "Delete workout".
- Zachować wszystkie istniejące akcje podsumowania (edit, fix sets, share,
  wysyłka, usunięcie).

### 5. History Tab + Profile Tab

- Projekty `History Tab.dc.html` i `Profile Tab.dc.html` - BRAK dostępu do
  plików i brak mockupów. CZEKA na: /design-login właściciela, podłączenie
  Chrome albo zrzuty. Nie zgadywać designu tych ekranów.

## Proces

1. Fala 2 startuje DOPIERO po zakończeniu fali naprawczej (workflow T1-T24)
   i jej bramkach - te same pliki.
2. Research → plan per ekran (funkcje do zachowania!) → implementacja →
   pętla weryfikacji designu: screenshot (e2e mock, viewport 390) vs mockup,
   iteracja aż do zgodności strukturalnej i zerowego mieszania kolorów.
