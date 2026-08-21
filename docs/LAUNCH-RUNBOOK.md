# LAUNCH RUNBOOK: App Store + Google Play

> Stan wyjściowy 2026-08-21: web + backend na produkcji (redesign single accent),
> iOS build 113 w Beta App Review (TestFlight), AAB versionCode 28 podpisany,
> organizacja Google Play ZWERYFIKOWANA ("Utwórz aplikację" aktywne).
> Wersja marketingowa: 1.0.0 (sztywno do launchu, decyzja 2026-07-17).
> Legenda: [TY] = klikasz Ty, [JA] = robi Claude po komendzie "robimy launch".

---

## FAZA 0: bramki przed startem (wspólne)

- [ ] [TY] **Freeze designu**: kończysz poprawki wizualne; od tego momentu
      screenshoty sklepowe są wiążące.
- [ ] [TY] **Test builda 113 na iPhonie** (TestFlight): logowanie (Apple/Google/
      email), trening z planu start → zgaszenie ekranu → powrót → zakończenie →
      podsumowanie, zmiana akcentu w Profilu.
- [ ] [JA] Jeśli po freeze designu wejdą jeszcze commity: nowy build iOS 114 +
      AAB v29 (pełny release train), i to one idą do sklepów.
- [ ] [JA] Screenshoty sklepowe z finalnego designu, jeden zestaw źródłowy:
      symulator iPhone (6.7" 1290x2796 i 5.5" 1242x2208, min. 3-5 ekranów:
      Dashboard, Plan, sesja treningowa, Summary, Progress) + kadry telefonowe
      pod Play (dowolne 16:9-9:16, min. 2, damy 5-8). PL i EN.

---

## FAZA A: Apple App Store

**Dane:** App ID ASC `6777446137`, bundle `com.grzegorzjasionowicz.strengthsave`,
wersja 1.0 id `8a088f55-9eb7-4abf-ad56-ba8fcef8cec9` (PREPARE_FOR_SUBMISSION),
subskrypcje `strengthsave_pro_monthly` + `strengthsave_pro_yearly`
(READY_TO_SUBMIT, grupa 22150355), RevenueCat offering `default`,
klucz ASC `UD43687FB9` w `_secrets/oauth/`.

**Już gotowe:** Paid Apps Agreement Active (do 2027-06-05), bank/tax/DSA,
opis en-US + keywords + support URL, konto demo recenzenta KOMPLETNE
(`applereview@strengthsave.app` / `Demo-Apple-2026-StrengthSave`, profil active
+ comp PRO utworzony 2026-08-21), czyste URL-e prawne (strengthsave.app/privacy
i /terms, HTTP 200), rejestracja domeny w Apple email relay (SPF zielony).

Kroki:

1. [JA] Upload screenshotów 6.7" + 5.5" do en-US (ASC API).
2. [JA] Lokalizacja **pl-PL**: opis, keywords, promotional text (teksty
   przygotuję na bazie en-US + tonu marki) + te same screenshoty (wersja PL).
3. [JA] **App Privacy labels** (ASC API): mapa z formularza Data safety w
   `docs/GOOGLE-PLAY-SETUP.md` sekcja 3 (te same fakty: email, UID, health,
   fitness, purchase history, crash/diagnostics, FCM token; nic nie jest
   "shared", brak lokalizacji). Pokażę Ci podsumowanie do potwierdzenia
   PRZED zapisem.
4. [JA] Dołączenie builda (113 lub 114) do wersji 1.0 + dołączenie OBU
   subskrypcji do submisji (pierwsza subskrypcja MUSI iść z appką, inaczej
   StoreKit nie serwuje produktów; root cause z 2026-06-24).
5. [JA] Review notes: konto demo + notka, że Strava jest opcjonalna, dane
   zdrowotne lokalne dla konta, brak treści UGC/social.
6. [JA] Ustawienie release: **manual release** po approvalu (Ty decydujesz
   o dniu premiery; można zmienić na auto).
7. [JA] **Submit do App Review** (ASC API), potem monitoring statusu.
8. [TY] Po approvalu: klik "Release" (albo mówisz mi, ja zwalniam przez API).
9. [WERYFIKACJA PO RELEASE] paywall na realnym urządzeniu pokazuje ceny
   (119,99 zł/rok wg cennika FINALNEGO z 2026-08-11), zakup sandbox → PRO.

Ryzyka Apple: pierwsza recenzja appki z IAP bywa odrzucana za drobiazgi
(guideline 2.1 performance, 3.1 IAP metadata). Konto demo i notes minimalizują;
odrzut = poprawka + resubmit, zwykle 24h.

---

## FAZA B: Google Play

**Dane:** applicationId `com.grzegorzjasionowicz.strengthsave`, AAB
`android/app/build/outputs/bundle/release/app-release.aab` (v28, SHA-256
`70d4a9a6a3f8c11d930ead90a8d7cf5cbf172d77f42b316fa2af9e98560d22d0`),
keystore `_secrets/android/strength-save-release.keystore` (alias STRENGTH),
teksty listingu: `release/google-play/pl-PL.md` + `en-US.md`,
formularz Data safety rozpisany: `docs/GOOGLE-PLAY-SETUP.md` sekcja 3.

Kroki (kolejność konsoli; pierwsze kliki MUSZĄ być ręczne, API nie tworzy apek):

1. [TY] Play Console → **Utwórz aplikację**:
   - Nazwa: `Strength Save`; język domyślny: polski (pl-PL);
   - Aplikacja (nie gra); **Bezpłatna** (monetyzacja przez subskrypcje w apce;
     UWAGA: wyboru bezpłatna/płatna NIE DA SIĘ potem zmienić);
   - deklaracje zgodności (wytyczne dev + eksport USA): zaznacz zgody.
2. [TY] **Testy wewnętrzne** (Internal testing) → Utwórz wersję → wgraj
   `app-release.aab` → przy pierwszym uploadzie zaakceptuj **Play App Signing**
   (Google przejmuje klucz podpisu, nasz keystore zostaje kluczem uploadu) →
   zapisz i opublikuj wersję wewnętrzną; dodaj siebie jako testera, sprawdź
   instalację ze sklepu.
3. [TY, wklejanie z gotowców] **Konfiguracja aplikacji** (zakładka "Zawartość
   aplikacji" / App content), wszystko obowiązkowe przed produkcją:
   - Polityka prywatności: `https://strengthsave.app/privacy`
   - Dostęp do aplikacji: "Cały dostęp bez specjalnych uprawnień" + dane konta
     demo (`applereview@strengthsave.app` / `Demo-Apple-2026-StrengthSave`,
     działa też dla Google) w polu instrukcji dostępu;
   - Reklamy: **NIE zawiera reklam**;
   - Ankieta klasyfikacji treści (IARC): kategoria "Narzędzie/inne", wszystkie
     pytania o przemoc/hazard/seks/narkotyki: NIE → wynik 3+/E;
   - Grupa docelowa: 18+ (nie kierujemy do dzieci, bez Families);
   - **Aplikacje zdrowotne**: zadeklaruj funkcje health & fitness
     (uprawnienia `health.READ_WEIGHT`, `health.WRITE_EXERCISE`);
   - Aplikacja rządowa: NIE; Funkcje finansowe: BRAK; COVID: NIE;
   - **Bezpieczeństwo danych** (Data safety): przepisz 1:1 tabelę z
     `docs/GOOGLE-PLAY-SETUP.md` sekcja 3 (szyfrowanie w tranzycie: TAK,
     usuwanie danych: TAK, nic nie jest udostępniane osobom trzecim).
4. [TY] **Strona aplikacji w sklepie** (Main store listing): wklej teksty z
   `release/google-play/pl-PL.md` i `en-US.md`; grafiki ode mnie z FAZY 0
   (ikona 512x512 PNG, feature graphic 1024x500, 5-8 screenshotów tel.).
5. [TY] **Subskrypcje** (Zarabianie → Produkty → Subskrypcje): utwórz
   `strengthsave_pro_monthly` i `strengthsave_pro_yearly` z base plans
   (miesięczny/roczny, auto-odnawialne) i cenami wg cennika finalnego
   (rocznie 119,99 zł / 31,99 USD, miesięczne wg tabeli RC). Identyfikatory
   MUSZĄ być dokładnie takie jak wyżej (RC na nie mapuje).
6. [TY raz, potem JA] **Service account** do API: Play Console → Ustawienia →
   Dostęp do API → utwórz/podepnij projekt GCP → utwórz konto usługi z rolą
   Release manager + Finance (dla RC) → pobierz JSON → do `_secrets/`.
   Od tej pory wersje/listingi/subskrypcje ogarniam przez androidpublisher API.
7. [JA] **RevenueCat strona Play**: dodanie aplikacji Play Store w projekcie
   `proj67cb081f`, wgranie service account JSON, podpięcie produktów do
   `$rc_monthly`/`$rc_annual` w offeringu `default`, konfiguracja Real-time
   developer notifications (pub/sub). Test: zakup subskrypcji na koncie
   testowym (License testing → dodaj swój mail → zakupy testowe bez obciążenia).
8. [TY] **Produkcja**: Promuj wersję z testów wewnętrznych do produkcji →
   wybierz kraje (proponuję: wszystkie) → wyślij do weryfikacji.
   Organizacja NIE ma wymogu 12 testerów x 14 dni. Pierwsza weryfikacja
   Play trwa zwykle 1-7 dni.
9. [WERYFIKACJA PO RELEASE] instalacja ze sklepu, zakup testowy → PRO,
   webhook RC → Firestore subscription.

---

## FAZA C: po obu premierach

- [ ] [JA] Landing strengthsave.app: podmiana linków na realne App Store /
      Google Play (teraz promuje TestFlight/wersję webową).
- [ ] [JA] Monitoring pierwszych dni: client_errors, funnel/cost digest,
      webhook RC, oceny w sklepach.
- [ ] [JA] Wpis DECYZJE.md + pamięć + status projektu.
- [ ] [TY] Decyzja o cenniku promocyjnym na start / kodach (RC promotional
      niedostępne przez API v2; granty robimy przez panel admina).
- [ ] Otwarte drobiazgi produktowe (nie blokują launchu): zieleń #22c55e,
      T23-6 dedup tytułów, etykieta totalDistance, kalorie Strava.

## Komenda startowa

Gdy skończysz design i test 113: napisz **"robimy launch"**. Wtedy odpalam
FAZĘ 0 [JA] (screenshoty, ewentualny build 114/v29) i całą FAZĘ A po kolei,
a Tobie wypisuję na bieżąco, który Twój krok z FAZY B jest następny.
