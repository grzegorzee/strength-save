# PROMPT: wdrożenie redesignu Profilu (wariant A) — do /loop

> Odpalany w nowym oknie przez `/loop`. Każda iteracja robi JEDEN nieodhaczony
> krok ze STANU poniżej, weryfikuje, odhacza, commituje. Wszystkie kroki
> odhaczone = zakończ pętlę (stop) i podsumuj.

## Kontekst

Spec zatwierdzony przez usera: `docs/superpowers/specs/2026-08-11-profil-redesign-design.md`.
Czytaj go W CAŁOŚCI przed pierwszym krokiem każdej iteracji. Obowiązuje
CLAUDE.md projektu (zasady Karpathy, checklist wdrożeniowy, i18n w OBU plikach).

## Twarde zasady

1. **Nie dotykaj plików agenta subskrypcji**: `functions/src/revenuecat.ts`,
   `functions/src/revenuecat.test.ts`, `src/hooks/useSubscription.ts`,
   `src/lib/registration-api.ts`, `src/lib/user-profile.ts`.
2. **Zanim ruszysz `src/pages/Profile.tsx`**: sprawdź `git status`. Jeśli
   `Profile.tsx` ma niezacommitowane zmiany nie-Twoje, NIE edytuj go w tej
   iteracji; zrób krok, który go nie dotyka, albo zakończ iterację z noop.
3. Chirurgicznie: jeden krok = jeden commit z opisem. Żadnych poprawek "przy
   okazji".
4. Niezmiennik (zasada #5): żaden wiersz ani akcja Profilu nie znika. Zmienia
   się grupowanie, kolejność, etykiety.
5. Test przed fixem tam, gdzie się da (vitest). Bramki przed odhaczeniem kroku:
   `npm run test`, `npm run typecheck`, `npm run lint`.
6. **Deploy i release iOS: NIGDY sam.** Krok 9 to pytanie do usera, nie akcja.

## STAN (odhaczaj [x] po weryfikacji, commituj ten plik razem z krokiem)

- [x] **1. Rename poziomów gamifikacyjnych.** `pl.ts` + `en.ts`:
  `tier.proTier` → "Veteran", `tier.eliteTier` → "Elite" (bez słowa "Tier").
  `src/lib/tier.ts` bez zmian progów. Test etykiet jeśli istnieje, inaczej
  snapshot użycia.
- [x] **2. Chipy nagłówka.** Pod nickiem i emailem rząd: [PRO] (wypełniony
  primary, tylko gdy `summarizeSubscription.planKey` wskazuje plan
  płatny/comp/admin; darmowy user BEZ chipa FREE) + [poziom] (outline,
  wyciszony, zawsze). Testy: PRO tylko dla płatnych, poziom zawsze.
- [x] **3. Reorganizacja sekcji `Profile.tsx`.** Kolejność: Nagłówek → TRENING
  (rename z "Preferencje treningu"; wchodzi Dźwięk z "Aplikacji") → TWOJE DANE
  → SUBSKRYPCJA (kod sekcji 1:1, tylko pozycja) → KONTO → APLIKACJA
  (Powiadomienia, Język) → POMOC (rename z "Wsparcie": Centrum pomocy, Kontakt,
  O aplikacji) → SYSTEM (Ustawienia zaawansowane, Admin tylko dla admina) →
  Wyloguj + Usuń konto. Test niezmiennika: wszystkie dotychczasowe
  akcje/wiersze obecne.
- [x] **4. Stan w wierszu Powiadomienia.** `getPushPermission()` jak
  w `NotificationSettings`: `granted` = "Włączone", inaczej "Wyłączone".
  Klucze i18n w obu plikach.
- [x] **5. Potwierdzenie resetu hasła.** Dialog ("Wyślemy link resetu na X.
  Wysłać?") przed wysyłką maila. Test: mail dopiero po potwierdzeniu.
- [x] **6. Faza 2: skrót w treningu.** Ikona zębatki przy pasku przerwy
  (RestBar) otwiera bottom sheet: domyślna przerwa, dźwięk, timer wł/wył.
  TE SAME klucze zapisu co Profil (localStorage + `preferences.*`). Test
  sekwencji: zmiana w sheet widoczna w Profilu i odwrotnie.
- [x] **7. Bramki całości.** `npm run test` + `typecheck` + `lint` +
  `npm run build` + `npm run check:dist-smoke` (na build:mobile, patrz
  CLAUDE.md). Wszystko zielone.
- [x] **8. DECYZJE.md.** Wpis: co, dlaczego, spec, weryfikacja.
- [x] **9. STOP: zapytaj usera o deploy.** (pytanie zadane 2026-08-11, pętla
  zakończona; uwaga: w międzyczasie wyszedł build 90, więc bump = 91, nie 89) Web `npm run deploy` + iOS bump
  88 → 89 + `release-ios.sh` + `testflight_external.py` DOPIERO po jego zgodzie
  (równolegle działa agent subskrypcji, build może mieć wejść wspólny).

## Koniec pętli

Kroki 1-8 odhaczone i krok 9 zadany userowi = stop pętli, podsumowanie:
co zmienione, jakie testy, co czeka na zgodę.
