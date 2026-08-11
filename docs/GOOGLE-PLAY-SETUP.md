# Google Play: zalozenie konta i pierwszy upload

Stan na 2026-08-11. Decyzja: konto **organizacji**, nie personal.

Powod: zasady Play wymagaja konta organizacji dla aplikacji "zwiazanych ze
zdrowiem", a ogloszenie Google z 2024-07-17 wymienia kategorie bez granulacji
("financial products and services, health, VPN, and government"). Strength Save
uzywa `health.READ_WEIGHT` + `health.WRITE_EXERCISE` i trafia do Health &
Fitness, wiec konto personal groziloby blokada wydania na deklaracji zdrowotnej,
a typu konta nie da sie pozniej zmienic (tylko formalny transfer). Dodatkowy
zysk: organizacja jest zwolniona z wymogu 12 testerow x 14 dni.

Adresu firmy nie da sie ukryc w sklepie: Play publikuje pelny adres dla kont
organizacji ORAZ dla kont personal, ktore monetyzuja. Ten sam adres jest juz
jawny w App Store przez DSA trader compliance, wiec wybor konta niczego tu nie
pogarsza.

**Repo jest publiczne. Numeru D-U-N-S, adresu firmy i identyfikatora konta Play
nie zapisywac w tym drzewie.** Te dane sa w pamieci sesji Claude
(`memory/google_play_account.md`).

## 1. Stan gotowosci (zweryfikowany lokalnie)

| Element | Stan |
|---|---|
| `applicationId` | `com.grzegorzjasionowicz.strengthsave` |
| Wersja | `versionName 1.0.0`, `versionCode 6` |
| Podpisany AAB | `android/app/build/outputs/bundle/release/app-release.aab`, 16 311 666 B, SHA-256 `d30c3e5ad6ea9a2335ba8e90e973a6fbd2884c6184574594daa3856a9a2ff351` (build 2026-08-11) |
| Upload key | keystore `FIRMA/_secrets/android/strength-save-release.keystore`, alias `STRENGTH`, wazny do 2053-12-02 |
| Upload key SHA-1 | `61:75:B0:23:AE:29:5A:97:E1:5A:07:1A:92:E0:28:0D:88:0C:70:A0` |
| Upload key SHA-256 | `8F:65:CB:13:AD:7B:7D:FE:08:71:DD:AA:CE:C3:B3:A4:52:4B:90:A4:8E:E0:95:3C:6C:37:BA:9B:E3:7A:9C:65` |
| Listing PL/EN | `release/google-play/pl-PL.md`, `release/google-play/en-US.md` |
| Privacy policy | https://strengthsave.app/legal/privacy.html (HTTP 200) |
| Regulamin | https://strengthsave.app/legal/terms-pl.html (HTTP 200) |
| Ikony Android | wygenerowane w `android/app/src/main/res/` |

Komenda przebudowy AAB:

```
npm run build:mobile && ./node_modules/.bin/cap sync android && (cd android && ./gradlew bundleRelease)
```

## 2. Rejestracja konta: stan na 2026-08-11

Zrobione:

- [x] Wybrany typ **Dla organizacji**, wlasciciel `grzegorzee@gmail.com`
      (nieodwracalne), oplata 25 USD.
- [x] Numer D-U-N-S: firma miala go juz nadany, wniosek do D&B okazal sie
      zbedny. Dane firmy zgodne z profilem D&B (szczegoly poza repo).
- [x] Konto organizacji utworzone, nazwa konta `Strength Save`.

Otwarte (blokuje wszystko dalsze):

- [ ] **Zweryfikuj swoja tozsamosc**: oficjalny dokument. Google ostrzega, zeby
      nie edytowac ani nie zmieniac dokumentow, bo to konczy sie niepowodzeniem
      weryfikacji. Kilka dni.
- [ ] **Zweryfikuj numery telefonow** oraz weryfikacja organizacji i
      zatwierdzenie dokumentow przez Google.
- [ ] **Czekanie na REGON** po stronie usera (stan 2026-08-11), potrzebny do
      dokumentow weryfikacyjnych firmy.

Przycisk **Utworz aplikacje jest wyszarzony** do czasu potwierdzenia wlasnosci
konta. Dopoki weryfikacja nie przejdzie, nie da sie utworzyc aplikacji ani
wgrac AAB, takze przez API.

Uwaga do wypelniania: nazwa dewelopera widoczna w sklepie to osobne pole niz
nazwa prawna i moze brzmiec `Strength Save`. Dane adresowe musza byc znak w
znak zgodne z profilem D&B, lacznie z nietypowym zapisem ulicy.

### Czego NIE da sie zrobic przez API

Play Developer API (androidpublisher) operuje na istniejacym `packageName`:
`edits`, `monetization.subscriptions`, `inappproducts`. Nie ma metody tworzacej
nowa aplikacje. Custom App Publishing API tworzy tylko prywatne aplikacje dla
Managed Google Play. Do tego samo utworzenie service accounta odbywa sie w
konsoli. Pierwsze kliki sa wiec recznie: weryfikacja, utworzenie aplikacji,
pierwszy upload z akceptacja Play App Signing, wygenerowanie service accounta.
Po tym kolejne buildy, listingi i subskrypcje wracaja do automatyzacji.

## 3. Formularz Data safety (propozycja z kodu, do potwierdzenia)

Zrodlo: `android/app/src/main/AndroidManifest.xml` (uprawnienia), zaleznosci
Firebase/RevenueCat, model danych w `src/`.

Uprawnienia w manifescie sa minimalne: `INTERNET`, `POST_NOTIFICATIONS`,
`health.READ_WEIGHT`, `health.WRITE_EXERCISE`. **Brak jakiegokolwiek
uprawnienia lokalizacji**, brak kontaktow, brak dostepu do zdjec i plikow.
W kodzie nie ma zapisu GPS/polyline nawet dla aktywnosti Strava.

### Zbierane dane

| Kategoria Play | Typ | Zrodlo | Cel | Wymagane | Udostepniane |
|---|---|---|---|---|---|
| Personal info | Email address | Firebase Auth | Account management, App functionality | tak | nie |
| Personal info | Name | opcjonalne pole profilu | App functionality | nie | nie |
| Personal info | User IDs | Firebase UID | Account management, App functionality | tak | nie |
| Health and fitness | Health info | masa ciala, pomiary, tetno | App functionality | nie | nie |
| Health and fitness | Fitness info | treningi, serie, ciezary, plany, aktywnosci | App functionality | tak | nie |
| Financial info | Purchase history | Google Play Billing przez RevenueCat | App functionality | tak | nie |
| App activity | App interactions | wlasna telemetria (`app-telemetry.ts`) | Analytics, App functionality | nie | nie |
| App info and performance | Crash logs | `error-telemetry.ts`, `client_errors` | Diagnostyka | nie | nie |
| App info and performance | Diagnostics | jw. | Diagnostyka | nie | nie |
| Device or other IDs | Device or other IDs | token FCM (push) | App functionality | nie | nie |

### Deklaracje ogolne

- Is all user data encrypted in transit? **Tak** (HTTPS, Firestore).
- Do you provide a way for users to request data deletion? **Tak.**
- Data collected is processed ephemerally? **Nie.**
- Committed to Play Families Policy? **Nie dotyczy** (aplikacja nie jest
  kierowana do dzieci).

Firebase, Google Cloud i RevenueCat wystepuja jako procesorzy w imieniu
aplikacji, wiec nie deklaruje sie ich jako "shared". Strava dziala odwrotnie:
aplikacja pobiera dane od Stravy po autoryzacji usera, nic tam nie wysyla.
**Potwierdz to swiadomie przed wyslaniem formularza**, bo to Twoja deklaracja.

## 4. Osobna deklaracja Health Connect

Uprawnienia `health.READ_WEIGHT` i `health.WRITE_EXERCISE` podlegaja polityce
Health Connect. Google wymaga oddzielnego formularza deklaracji dostepu do
danych zdrowotnych (App content -> Health apps declaration) z uzasadnieniem
kazdego uprawnienia. Uzasadnienie zgodne ze stanem kodu:

- `READ_WEIGHT`: import masy ciala do pomiarow uzytkownika, zawsze po jego
  potwierdzeniu, wylacznie w celu sledzenia postepow.
- `WRITE_EXERCISE`: zapis ukonczonego treningu silowego jako sesji cwiczen,
  tylko gdy uzytkownik wlaczy synchronizacje.

Bez tej deklaracji Google odrzuci wydanie produkcyjne.

## 5. Luki blokujace wydanie produkcyjne

1. **Publiczny URL usuwania konta (X26/Z247).** Kanoniczny adres do wpisania
   w Play Console: `https://strengthsave.app/delete-account` (strona React
   w repo `strength_save_landing`, PL/EN, opis karencji 30 dni z Z238).
   Stary adres `/legal/delete-account.html` ma redirect 308 na powyzszy
   (vercel.json). Wymaga deployu landingu (`npm run build` + `vercel --prod`)
   i weryfikacji `curl -I` obu adresow.
2. **Brak screenshotow telefonu** (min. 2, format 16:9 lub 9:16, krotszy bok
   min. 320 px) i **feature graphic 1024x500 px**. Do wygenerowania z
   emulatora Android.
3. **Deklaracja Health apps** (sekcja 4) plus Data safety (sekcja 3).

Wymog **12 testerow x 14 dni NIE dotyczy** tego konta: obowiazuje konta
personal zalozone po 2023-11-13, a nasze jest kontem organizacji. To byl jeden
z powodow wyboru typu konta.

## 6. Kolejnosc po weryfikacji konta

0. Dokonczenie weryfikacji konta (tozsamosc, telefony, dokumenty firmy).
   Dopiero to odblokowuje przycisk "Utworz aplikacje".
1. Utworzenie aplikacji: nazwa `Strength Save`, jezyk domyslny `pl-PL`, typ
   `Aplikacja`, model `Bezplatna` (nieodwracalne, monetyzacja idzie przez
   subskrypcje w aplikacji).
2. Upload AAB do **Internal Testing**, akceptacja Play App Signing, publikacja.
2. Skopiowanie **app signing** SHA-1 i SHA-256 z Play Console do ustawien
   aplikacji Android w Firebase. Fingerprint upload key nie zastepuje klucza
   podpisujacego aplikacje.
3. App integrity: podpiecie projektu `fittracker-workouts`, wlaczenie Play
   Integrity API.
4. Subskrypcje i oferty trial, service account do Play Developer API,
   podpiecie RevenueCat: dokladne parametry w
   `docs/X25-MONETIZATION-STATUS.md`, kroki 3 do 7. Po nich
   `scripts/revenuecat_release.py apply` ma zwrocic `APPLY + READ_BACK OK`
   i cztery wiersze z `inEntitlement=true`, `inPackage=true`.
5. Rownolegle: zaproszenie 12 testerow do closed testingu, zeby licznik 14 dni
   ruszyl jak najwczesniej.
6. Store listing PL/EN z `release/google-play/`, Data safety, Health apps
   declaration, screenshoty, feature graphic.
