# Onboarding w aplikacji: research i projekt przewodnika nowego konta (2026-09-29)

Zlecenie właściciela: „dla nowych kont musimy zrobić onboarding w aplikacji, czyli
pokazanie co i jak działa, odhaczanie pierwszej serii, wyjaśnienie gdzie co jest.
To musi się samo odpalać bez mrugnięcia, żeby osoba miała efekt wow i wiedziała co
ma klikać.”

Źródła zebrane agentem researchowym (web, 2026-09-29); liczby sprawdzone na
stronach źródłowych, chyba że oznaczono „niepotwierdzone”. Wcześniejszy research
X37 (`docs/RESEARCH-X37-2026-08-26.md`, sekcja 1) jest spójny z poniższym.

## 1. Zasady (od najsilniejszego dowodu)

1. **Bez tutoriala „na zapas” przed użyciem.** NN/g, test kontrolowany (70 osób,
   4 apki iPhone): sukces zadań 91% z tutorialem vs 94% bez (n.s.), postrzegana
   łatwość gorsza z tutorialem (4,92 vs 5,49, p=0,047).
   https://www.nngroup.com/articles/mobile-tutorials/ ; „we don't recommend
   deck-of-cards onboarding” https://www.nngroup.com/articles/mobile-app-onboarding/
2. **Krótko: 3-4 kroki na tour.** Chameleon (58 mln tourów): 3 kroki = 72%
   ukończeń, 7 kroków = 16%; nowsza analiza 550 mln punktów: 4 kroki 74%, 7+ 16%;
   wskaźnik postępu +12% (raport 2025, odczyt przez streszczenie).
   https://www.chameleon.io/benchmark-report-2022 ,
   https://www.chameleon.io/blog/mastering-product-tours
3. **Wyzwalacz = akcja usera, nie czas.** Tour po kliknięciu 67% ukończeń, po
   opóźnieniu 31%; modale zamykane w ok. 50%.
   https://www.chameleon.io/blog/mastering-product-tours
4. **Ucz przez wykonanie.** HIG: ludzie lepiej zapamiętują, gdy „can actually
   perform the task”; onboarding „fast, fun, and optional”; wskazówki przy
   elemencie, jedna akcja naraz; pominięty tutorial nie wraca, ale jest do
   znalezienia w ustawieniach. Appcues: krok przechodzi po realnym kliknięciu
   („Advance on click”), seria „Next” uczy klikania bez czytania.
   https://developer.apple.com/design/human-interface-guidelines/onboarding ,
   https://www.appcues.com/blog/build-effective-product-tours
5. **Jedna wskazówka naraz, w kontekście, obok elementu.** NN/g: coach mark
   w chwili dojścia do funkcji; pamięć krótkotrwała gaśnie po ok. 20 s; nakładka
   ma odróżniać się od UI. Material: nie pokazuj przy otwarciu apki, tylko po
   powiązanej akcji; jeden prompt na sesję.
   https://www.nngroup.com/articles/mobile-instructional-overlay/ ,
   https://m1.material.io/growth-communications/feature-discovery.html
6. **Pomiń zawsze widoczne; tylko dla nowych.** NN/g „highly visible Skip”;
   Material: onboarding nigdy dla powracających.
   https://m1.material.io/growth-communications/onboarding.html
7. **Pusty stan prowadzi do pierwszej akcji.** NN/g: „Do not default to totally
   empty states”; teardown Stronga krytykuje pusty start.
   https://www.nngroup.com/articles/empty-state-interface-design/
8. **Mała celebracja pierwszej wygranej + haptyka Success zgodnie ze znaczeniem.**
   Duolingo: odznaki +4,1% rozpoczętych sesji; lekcja przed rejestracją ok. +20% DAU.
   HIG: Success = „an action completed successfully”, nie nadużywać.
   https://review.firstround.com/the-tenets-of-a-b-testing-from-duolingos-master-growth-hacker/ ,
   https://developer.apple.com/design/human-interface-guidelines/playing-haptics
9. **Dostępność.** Ruch opcjonalny (Reduce Motion), animacja nie jest jedynym
   nośnikiem informacji, wskazówka nie znika sama (WCAG 1.4.13 jako analogia).
   https://developer.apple.com/design/human-interface-guidelines/motion
10. **Konkurencja fitness uczy W TRAKCIE pierwszego treningu, nie przed.**
    Hevy: „tap the checkmark… to mark it as complete and trigger the rest timer”,
    kontekstowe pop-upy, animacja checkmarka jako nagroda
    (https://www.hevyapp.com/hevy-tutorial/ ,
    https://screensdesign.com/showcase/hevy-workout-tracker-gym-log). Strong:
    „small, contextual modals” przy pierwszym użyciu, timer startuje sam.
    Fitbod: „tooltips appear during the first workout”
    (https://screensdesign.com/showcase/fitbod-gym-fitness-planner). JEFIT (notatki
    App Store 26.08.2026): skrócony onboarding, haptyka. Ladder/Future: trening
    prowadzony wideo, brak nauki odhaczania. Luka: nikt publicznie nie tłumaczy
    timera przerwy coach markiem; brak publicznych danych o konwersji.

Niepotwierdzone (nie użyte w decyzjach): benchmark checklist Userpilot (19,2%),
dane o haptyce Duolingo.

## 2. Co z tego wynika dla Strength Save

Kontekst: nowe konto przechodzi kreator planu (dane zebrane), na iOS paywall,
potem Dashboard z kartą „Twój plan jest gotowy” (PostPlanGuide). Trening dzieje
się na siłowni: telefon w kieszeni, ekran gaśnie (iOS wstrzymuje JS), słaby
zasięg, między seriami 1-3 min przerwy.

- **Nie robimy talii kart ani ekranu powitalnego.** Dashboard dostaje dwa kroki:
  legenda paska zakładek (jeden dymek, cztery pozycje po 2-4 słowa) i spotlight
  na „Rozpocznij” jako AKCJA (tap w prawdziwy przycisk). Drugi krok ma też
  „Później”, żeby przewodnik nie blokował rozglądania się po apce.
- **Nauka w pierwszym treningu, porcjami wyzwalanymi akcją** (max 3 kroki na
  porcję, wskaźnik postępu w porcji):
  - start sesji: „Tu wpisujesz ciężar i powtórzenia” → „Tapnij ✓, gdy skończysz
    serię” (czeka na REALNE odhaczenie, bez „Dalej”);
  - realne odhaczenie: moment wow (animacja checkmarka w dymku, haptyka Success
    raz, bez dźwięku) + wyjaśnienie przerwy w chwili, gdy startuje („telefon da
    znać, możesz zgasić ekran”; sygnał końca przerwy to systemowe powiadomienie,
    zasada 1 CLAUDE.md) → menu „…” (zamiana ćwiczenia) → „Zakończ trening”.
  Wyjaśnienie timera tylko wtedy, gdy pasek przerwy faktycznie ruszył; bez
  timera zdanie o przerwie znika.
- **Po pierwszym treningu karta „Co dalej” w podsumowaniu (inline, nie modal):**
  Historia i Postępy, zamyka ją user, nie znika sama.
- **Stan per konto** (`users/{uid}.preferences.appTour`), fallback localStorage
  per uid (offline, ponowienie zapisu); stary klucz urządzenia z X37 = widziany.
  Pominięty przewodnik nie wraca; „Pokaż przewodnik ponownie” w Profilu.
- **Nie przeszkadza w innych warstwach:** gdy otwarty jest dialog, arkusz,
  menu albo celebracja, przewodnik się chowa i wraca po ich zamknięciu (nie jest
  „zużywany” przez obcy overlay). Arkusz rozgrzewki zawsze pierwszy.
- **Nie zależy od timerów JS:** stan etapu w localStorage, powrót z tła / po
  zabiciu apki / wyjście z treningu i powrót wznawia właściwy krok; overlay nie
  blokuje scrolla (brak scroll-locka do sprzątania).

## 3. Wybrany projekt i odrzucone warianty

Wybrany: jeden przewodnik w trzech etapach (Dashboard 2 kroki, Trening 2 + 3
kroki w porcjach wyzwalanych akcją, Podsumowanie: karta inline), przebudowa
istniejącego `FirstWorkoutTour` (spotlight z wycięciem, rAF, portal) zamiast
drugiego mechanizmu (zasada 3 CLAUDE.md).

Odrzucone:
- **Karuzela ekranów powitalnych przed Dashboardem**: NN/g (brak zysku, gorsza
  postrzegana łatwość), Material „don't force education upfront”.
- **Osobny „trening demo” / sandbox**: user ma prawdziwy plan i prawdziwy
  pierwszy trening; demo dublowałoby dane i łamało zasadę „dane usera są święte”.
- **Checklista onboardingowa na Dashboardzie**: słabe dane (niepotwierdzone,
  SaaS), a nasza ścieżka to jedna rzecz: pierwszy trening.
- **Jeden 8-krokowy tour z „Dalej”**: 16% ukończeń przy 7+ krokach; klikanie bez
  czytania. Zamiast tego porcje ≤3 kroków wyzwalane akcją.
- **Wymuszony dźwięk przy celebracji**: siłownia, słuchawki, wyciszony telefon;
  haptyka + animacja wystarczą (HIG: haptyka jako uzupełnienie).
- **Stan tylko w localStorage (jak X37)**: tour wracałby na nowym urządzeniu
  i po reinstalacji (HIG: pominięty nie wraca).
