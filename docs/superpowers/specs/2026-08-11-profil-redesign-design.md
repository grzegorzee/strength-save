# Redesign sekcji Profil: porządek bez przebudowy (wariant A)

Data: 2026-08-11 · Status: zatwierdzony przez usera (czat) · Zakres: web + iOS (sam frontend)

## Cel

Profil ma być prosty, czytelny i szybki w obsłudze. Dziś sekcje odzwierciedlają
historię kodu, nie model mentalny usera: ustawienia timera rozstrzelone po dwóch
sekcjach, "Wsparcie" jest workiem na Admin i Zaawansowane, a badge "Pro Tier"
(poziom gamifikacyjny z liczby treningów) zderzy się z planem PRO z nadchodzącej
sekcji Subskrypcja.

Dane wejściowe od usera: ustawienia treningowe (timer, dźwięk, czas przerwy)
zmienia często; reszta ustawiana raz. Miejsce główne: Profil, plus skrót
w ekranie treningu.

## Rozstrzygnięcie słownikowe PRO

Słowo PRO znaczy w apce dokładnie jedno: płatny plan subskrypcji.

1. **Rename poziomów gamifikacyjnych** (`src/lib/tier.ts` bez zmian progów,
   tylko etykiety w `pl.ts` i `en.ts`):
   Newcomer / Rookie / Advanced / **Veteran** (było "Pro Tier") / **Elite**
   (było "Elite Tier"). Słowo "Tier" znika z etykiet, bo `subscription.tier`
   to termin płatny.
2. **Nagłówek profilu**: pod nickiem i emailem rząd dwóch chipów:
   - **[PRO]** wypełniony primary, tylko gdy plan płatny/comp/admin
     (wg `summarizeSubscription.planKey`). Darmowy user nie dostaje chipa
     "FREE" (upsell mieszka w sekcji Subskrypcja, nie w nagłówku).
   - **[Veteran]** (aktualny poziom) outline, wyciszony, zawsze widoczny,
     wizualnie podrzędny wobec PRO.
3. Licznik treningów w prawym górnym rogu ekranu bez zmian (element globalny).

## Struktura ekranu (kolejność sekcji)

1. **Nagłówek**: avatar (edycja ołówkiem), nick, email, chipy [PRO] [poziom].
2. **TRENING** (rename z "Preferencje treningu"): Timer przerwy (toggle),
   Domyślna przerwa (select), Dźwięk (toggle, przenosi się z "Aplikacji"),
   Jednostki (kg/lbs). Wszystko, co user rusza często, w jednej sekcji wysoko.
3. **TWOJE DANE**: Historia, Pomiary ciała, Osiągnięcia (bez zmian).
4. **SUBSKRYPCJA**: kod sekcji 1:1 ze specu
   `2026-08-11-subscription-section-design.md`; zmienia się wyłącznie pozycja
   na ekranie.
5. **KONTO**: Edytuj profil, Zmień hasło, Prywatność.
6. **APLIKACJA**: Powiadomienia (wiersz pokazuje stan Włączone/Wyłączone),
   Język.
7. **POMOC** (rename z "Wsparcie"): Centrum pomocy, Kontakt, O aplikacji.
8. **SYSTEM** (dyskretna sekcja): Ustawienia zaawansowane, Admin (tylko admin).
9. **Wyloguj** + **Usuń konto** na dole (bez zmian).

Deep-linki "Prywatność" i "Powiadomienia" do podstron `/settings` zostają jako
celowe skróty do zadań. Zaawansowane i Admin przestają udawać "Wsparcie".

## Mikro-zmiany zachowań

- **Zmień hasło**: dialog potwierdzenia ("Wyślemy link resetu na X. Wysłać?")
  zamiast natychmiastowej wysyłki maila po jednym tapnięciu.
- **Powiadomienia**: stan widoczny w wierszu bez wchodzenia głębiej.
  Źródło prawdy: uprawnienie push na urządzeniu (`getPushPermission()`,
  jak w `NotificationSettings`): `granted` = Włączone, inaczej Wyłączone.

## Skrót w treningu (faza 2, po reorganizacji Profilu)

Ikona zębatki przy pasku przerwy w ekranie treningu otwiera bottom sheet
z trzema kontrolkami: domyślna przerwa, dźwięk, timer wł/wył. Te same klucze
zapisu co w Profilu (localStorage + `preferences.*` w Firestore). Zgodnie
z zasadą #5: nowy punkt wejścia, zero zmian w istniejącej logice zapisu.

## Poza zakresem

- Wnętrze `/settings` (Ustawienia zaawansowane): bez zmian.
- Zawartość i logika sekcji Subskrypcja (własność drugiego agenta).
- Hub z podstronami (wariant B): świadomie odłożony na po launchu, gdy
  ustawień przybędzie.
- Pliki w toku u agenta subskrypcji: `functions/src/revenuecat.*`,
  `src/hooks/useSubscription.ts`, `src/lib/registration-api.ts`,
  `src/lib/user-profile.ts`. Nie dotykamy.

## Koordynacja wdrożenia

Zmiany w `Profile.tsx` wdrażamy dopiero po scommitowaniu pracy agenta
subskrypcji, żeby nie robić konfliktu w jednym pliku.

## Testy i niezmienniki

- **Niezmiennik (zasada #5)**: żaden wiersz ani akcja Profilu nie znika,
  zmienia się grupowanie, kolejność i etykiety. Test: wszystkie dotychczasowe
  akcje (nawigacje, toggle, dialogi, wyloguj, usuń konto) dostępne po zmianie.
- Test chipów nagłówka: PRO widoczny tylko dla planu płatnego/comp/admin;
  poziom widoczny zawsze; darmowy user bez chipa FREE.
- Test potwierdzenia resetu hasła: mail leci dopiero po potwierdzeniu.
- i18n: każda zmieniona etykieta w OBU plikach (`pl.ts`, `en.ts`), inaczej
  typecheck padnie.
- Standardowe bramki: `npm run test`, `typecheck`, `lint`, `build`,
  `check:dist-smoke`.

## Wdrożenie

Bramki → web `npm run deploy` → iOS bump CURRENT_PROJECT_VERSION 88 → 89 →
`release-ios.sh` + dystrybucja obu grup (`testflight_external.py`).
