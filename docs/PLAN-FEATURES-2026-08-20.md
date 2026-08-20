# PLAN F — feature'y zgłoszone przez właściciela (2026-08-20)

> Tracker pętli. Wchodzi PO wydaniu E (bugi mają pierwszeństwo). TDD,
> stage-per-plik, bramki jak zawsze. Wydanie wspólne F-RELEASE na końcu.

## F-T1 — imię usera: edycja pod zdjęciem + pytanie w onboardingu

**Zgłoszenie:** "Powinien móc zmienić imię; podczas onboardingu powinniśmy o to
zapytać, żeby wiedzieć jak się zwracać. Imię edytowalne od razu pod zdjęciem."

- [x] Profil: imię pod avatarem edytowalne inline (tap w imię albo ikona ołówka
  przy imieniu → input → zapis). Zapis do `users/{uid}.displayName`; UWAGA na
  mapper `mapAppUserProfile` (lekcja buildu 88: nowe/zmieniane pole = sprawdź
  przeniesienie pole-po-polu) i rules (czy `displayName` w dozwolonych kluczach
  update).
- [x] Onboarding: krok "Jak masz na imię?" (input, walidacja 1-40 znaków, bez
  wymuszania — można pominąć; wtedy fallback jak dziś). Zapis razem z profilem
  startowym.
- [x] Powitanie na Dashboard i inne miejsca używają displayName (już używają —
  test niezmiennika, że po zmianie imienia UI się aktualizuje).
- [x] Testy: unit edycji (zapis + mirror + sanityzacja), e2e: onboarding z
  imieniem, zmiana imienia w Profilu widoczna na Dashboard.

DOWÓD (2026-08-20, commit 154cf6be): rozpoznanie pokazało, że onboarding JUŻ
pyta o imię (PlanWizard askName, ob-name-input, zapis displayName w
markOnboardingComplete), a dialog edycji istniał pod "Edytuj profil" (updateDoc,
mapper przenosi displayName linia 111, rules bez zmian — działający prod flow).
Dodane brakujące wejście: tap w imię/ołówek pod avatarem (profile-name-edit)
otwiera ten dialog; etykieta 'Nazwa' -> 'Imię'. Test 15/15, typecheck, lint,
e2e mobile-nav 8/8 GREEN.

## F-T2 — kolor przewodni aplikacji (theming)

**Zgłoszenie:** "zmiana koloru aplikacji: człowiek wybiera swój ulubiony kolor
i cała aplikacja jest w tym kolorze."

- [ ] Paleta predefiniowana (nie dowolny color-picker w v1): ~8 akcentów
  dobranych pod ciemne tło z kontrastem AA dla tekstu na akcencie (limonka =
  default, np. cyjan, pomarańcz, róż, fiolet, niebieski, czerwień, złoto).
  Każdy akcent = komplet tokenów: `--primary`, pochodne fitness-*, wykresy.
- [ ] Wybór w Profilu (sekcja "Wygląd"): siatka próbek, natychmiastowy podgląd.
- [ ] Persistencja: `users/{uid}.settings.accentColor` (mirror jak timerSound —
  sprawdzić mapper!) + localStorage, żeby kolor działał od splashu i offline.
- [ ] Aplikacja: CSS variables na `:root` (klasa/atrybut data-accent), zero
  hardcodów w komponentach. PUŁAPKI z pamięci: Recharts `stop-color` nie
  przyjmuje `var()` (defs inline z wartością hex — komponenty wykresów muszą
  czytać kolor z JS-owego theme hooka); share-utils ma hardcoded LIME (przekazać
  kolor parametrem, obraz share w kolorze usera).
- [ ] Statusowe kolory (success/warning/destructive) NIE zmieniają się z akcentem
  (czytelność stanów > estetyka).
- [ ] Testy: unit hooka theme (zapis/odczyt/fallback), snapshot tokenów per
  akcent, e2e: zmiana koloru w Profilu zmienia przycisk primary na Dashboard.

## F-T3 — wysyłka podsumowania treningu mailem (Amazon SES)

**Zgłoszenie:** "możliwość wysłania podsumowania treningu (ze wszystkimi
notatkami, RPE, bólem itp.) np. do swojego trenera, mailem przez Amazon SES
(wdrożony u mnie). Pojedynczy trening albo wszystkie naraz."

- [ ] Functions: callable `emailWorkoutSummary({ workoutId, to })` i
  `emailWorkoutHistory({ to })`. HTML przez istniejący wzorzec email-templates:
  data/dzień/focus, serie (kg × powt., ukończone/pominięte), notatka dnia,
  notatki ćwiczeń, RPE/ocena sesji, ból/kontuzje jeśli zapisane, tonaż/czas/PRy.
- [ ] Transport: abstrakcja `sendEmail` (już wstrzykiwana w weekly-digest).
  Implementacja SES (SDK v3, region+klucze z Firebase Secrets:
  `SES_REGION`/`SES_ACCESS_KEY_ID`/`SES_SECRET_ACCESS_KEY`/`SES_FROM`);
  fallback Resend gdy sekrety SES nieobecne (dev/emulator). KROK WŁAŚCICIELA:
  dostarczyć sekrety SES do functions (zweryfikowany sender w SES).
- [ ] Bezpieczeństwo: tylko uwierzytelniony user, tylko własne treningi
  (userId check), rate limit (np. 10 maili/dobę per user, licznik w Firestore),
  walidacja adresu, treść bez sekretów. Historia zbiorcza: limit rozmiaru
  (np. ostatnie 200 treningów albo załącznik CSV zamiast wielkiego HTML —
  decyzja przy implementacji, test na 45+ treningach demo).
- [ ] Client: w ukończonym treningu akcja "Wyślij e-mailem" (input adresu
  trenera zapamiętany w profilu `settings.trainerEmail`), w Historii akcja
  "Wyślij całą historię". Potwierdzenie przed wysyłką, toast wyniku, stany
  błędów z wyjściem (reguła #6).
- [ ] Testy: functions unit (składanie HTML, rate limit, ownership), emulator
  functions e2e ścieżki callable, client unit.

## F-RELEASE — wspólne wydanie F

- [ ] Bramki repo + pełne e2e po świeżym vite + functions testy i deploy PRZED
  klientami (backward compatible).
- [ ] Weryfikacja natywna iOS na koncie demo (emulatory): zmiana imienia →
  Dashboard wita nowym imieniem; zmiana koloru → cała apka + wykresy + share
  w kolorze; mail: wysyłka na emulatorze functions (bez realnego maila) +
  ścieżka błędu bez sekretów.
- [ ] Train: web deploy + marker na origin/gh-pages, iOS (kolejny bump), AAB
  (kolejny versionCode), Garmin tylko gdy tknięty, DECYZJE.md + tracker +
  pamięć projektu.

## Zasady (bez zmian)

Dane realnych userów święte (QA wyłącznie demo na emulatorach). Wersje 1.0.0.
TDD, stage-per-plik, `git show HEAD --name-status` przed pushem. Numery buildów:
kontynuacja po E-RELEASE.
