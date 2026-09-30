# Garmin: szybki test na zegarku przed Connect IQ Store (1 strona)

Build: 1.0.0, `.iq` sha256 `e4722ac2…` (pełny zapis: `garmin/release/artifact.json`).
Plik do sideloadu na epix Gen 2: `~/Desktop/strengthsave-epix2-1.0.0.prg` (id CIQ `epix2`).
Konto: konto QA (login i hasło w `~/FIRMA/_secrets/strength-save-qa.md`), nigdy prywatne.

## 1. Wgranie na zegarek

1. Zamknij Garmin Express (trzyma połączenie MTP).
2. Podłącz epix kablem, otwórz OpenMTP, prawa strona = zegarek.
3. Przeciągnij `strengthsave-epix2-1.0.0.prg` do `GARMIN/Apps` (nadpisz starszy plik).
4. Odłącz kabel. Aplikacja jest w menu aplikacji zegarka jako Strength Save.

## 2. Parowanie z kontem QA

W aplikacji na telefonie zaloguj się na konto QA, potem Profil > Urządzenia i połączenia > Sparuj zegarek. Na zegarku ekran „Sparuj z aplikacją” (podpowiedź „Profil > Urządzenia”), wpisz 6 cyfr w 10 minut. Zegarek przechodzi do planu dnia.

## 3. G1-G9 w skrócie (pełny opis: `docs/X25-REAL-DEVICE-CHECKLIST.md`)

| # | Co zrobić | Co ma być |
|---|---|---|
| G1 | plan dnia, po jednej serii z każdego typu + rozgrzewka | plan i teksty PL/EN poprawne, serie 1:1 w aplikacji |
| G2 | przełącz lbs, zmień ciężar, wróć do kg | w aplikacji ta sama wartość w kg, bez dryfu |
| G3 | tryb samolotowy w telefonie, serie, wyjdź i wróć do apki | serie, czas i tonaż wracają, licznik „do wysłania” |
| G4 | przywróć sieć, Zakończ trening, potem Zakończ jeszcze raz | jeden trening w aplikacji, jedna aktywność w Garmin Connect |
| G5 | ta sama seria zmieniona na telefonie i na zegarku | wygrywa nowsza zmiana, reszta serii zostaje |
| G6 | niewysłane serie, PRO wyłączone, Zakończ | komunikat o PRO, serie zostają; po przywróceniu PRO zapis bez duplikatu |
| G7 | odłącz zegarek w aplikacji, na zegarku Odśwież plan | powrót do parowania, niewysłane serie nie znikają |
| G8 | wylogowanie z aplikacji, potem Odśwież plan na zegarku | dostęp zegarka odcięty |
| G9 | szybki trening offline > Odrzuć trening; osobno trening z planu > Zakończ | odrzucony nic nie wysyła; zakończony = 1 trening + 1 aktywność z tętnem |

Konto QA jest nieniszczące: G6 (wyłączenie PRO) i usuwanie konta z G8 rób na osobnym koncie jednorazowym, nie na QA. Nie kończ planu na koncie QA. W G9 sprawdź w Garmin Connect, że aktywność ma wykres tętna: build 1.0.0 nie ma już uprawnienia Sensor (kod go nie używał), tętno ma przyjść z natywnego nagrania aktywności. Brak tętna = zgłoś, wrócimy do uprawnienia.

## 4. Zrzut ekranu z planem na zegarku

epix Gen 2 nie ma fabrycznej kombinacji do zrzutu. Ustaw ją raz: przytrzymaj MENU > System > Skróty klawiszowe (Hot Keys) > wybierz przycisk lub parę przycisków > Zrzut ekranu. Potem na ekranie z planem przytrzymaj ustawiony skrót. Zrzut zostaje w pamięci zegarka, pobierz go przez OpenMTP (Garmin Express zamknięty). Garmin Connect na telefonie nie robi zrzutów ekranu zegarka. Do Store przydadzą się 2 zrzuty: lista ćwiczeń dnia i ekran serii.

## 5. Kopia klucza developerskiego (binarny `.der`, `pbcopy` go uszkodzi)

```bash
# do schowka jako tekst base64
base64 -i ~/.garmin/developer_key.der | pbcopy
# odtworzenie ze schowka na innym Macu
pbpaste | base64 -D > ~/.garmin/developer_key.der && chmod 600 ~/.garmin/developer_key.der
shasum -a 256 ~/.garmin/developer_key.der   # musi dać 63eee010…5730e9
```

Wklej base64 do menedżera haseł jako notatkę zabezpieczoną (nie do maila ani czatu). Bez tego klucza nie wydasz aktualizacji aplikacji w Store.
