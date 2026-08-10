# X25 — brama real-device Apple Watch i Garmin

Nie jest to substytut testu ani deklaracja PASS. Arkusz służy do zebrania dowodu na fizycznym iPhonie z buildem 84 i sparowanym Apple Watch; symulator nie potwierdza Bluetooth, background, haptyki ani HealthKit.

## Warunki bezpiecznego testu

- użyj technicznego konta, nie prywatnych danych;
- włącz nagranie ekranu i zapisz godzinę startu/końca;
- przed testem zanotuj liczbę treningów siłowych w Apple Health dla bieżącego dnia;
- nie usuwaj kolejki po błędzie; użyj najpierw `Spróbuj ponownie`, a `Odrzuć` tylko w scenariuszu discard.

## Macierz dowodowa

| # | Sekwencja na fizycznym zestawie | Oczekiwany wynik i wymagany dowód | Status |
|---|---|---|---|
| W1 | iPhone online, otwórz plan na Watch, zaloguj po jednej serii każdego trackingu | te same reps/kg/duration/distance/assistance w drafcie iPhone; kg round-trip bez utraty | TODO REAL DEVICE |
| W2 | wyłącz sieć iPhone i Bluetooth, zaloguj 2 serie, zabij obie aplikacje, uruchom Watch | sesja, czas, serie, tonaż i licznik pending wracają z UserDefaults | TODO REAL DEVICE |
| W3 | przywróć Bluetooth, pozostaw telefon offline, potem online | pending znika dopiero po zapisie draftu; retry nie duplikuje serii | TODO REAL DEVICE |
| W4 | edytuj tę samą serię na iPhone i Watch w obu kolejnościach | wygrywa nowsze `at`; jedna seria, jedna sesja | TODO REAL DEVICE |
| W5 | ukończ ćwiczenie A, potem serię w B | haptyka odpowiednio po 90 s i 150 s; lokalna zmiana czasu nie resetuje się | TODO REAL DEVICE |
| W6 | rest day/offline, rozpocznij quick workout z recent, reconnect i finish | istniejący ad-hoc flow, jedna sesja w historii web/iPhone | TODO REAL DEVICE |
| W7 | aktywna sesja offline -> `Odrzuć trening` -> reconnect | brak zapisanego workoutu i brak odtworzenia starymi eventami | TODO REAL DEVICE |
| W8 | aktywna sesja -> background/opuszczona ręka -> resume -> finish | timer i HR działają; dokładnie jeden nowy HKWorkout | TODO REAL DEVICE |
| W9 | przejście przez północ bez świeżego kontekstu telefonu | stary plan nie udaje dzisiejszego; quick recent pozostaje dostępny | TODO REAL DEVICE |

Do zamknięcia Z225 wymagane są: model i wersje urządzeń, build aplikacji, zapis W1–W9, screenshot stanu pending/error/retry, oraz porównanie licznika HKWorkout przed/po. W sesji implementacyjnej `xcrun xctrace list devices` zwrócił fizyczny iPhone jako offline i nie wykrył fizycznego Apple Watch, więc wykonanie tej bramy było zewnętrznie niemożliwe.

## Garmin — wyłącznie izolowane konto techniczne

Przed G1 utwórz konto techniczne z aktywnym PRO/comp i planem-fixture. Nie używaj prywatnego konta ani prywatnego planu; po teście usuń tylko dane konta technicznego przez kontrolowany `deleteOwnAccount`. Zanotuj model, firmware, wersję `.prg`, deviceId z ekranu urządzeń oraz liczbę aktywności Strength Save w Garmin Connect przed testem.

| # | Sekwencja na fizycznym Garminie | Oczekiwany wynik i wymagany dowód | Status |
|---|---|---|---|
| G1 | pair aktywnego konta PRO -> `garminDay` -> po jednej serii 4 trackingów + warm-up | plan i PL/EN poprawne; EventQueue ma v1 i legacy aliasy; serwer zapisuje reps/kg/duration/distance/assist/warm-up 1:1 | TODO REAL DEVICE |
| G2 | ustaw lbs, edytuj 62.5 kg w prezentacji lbs, wróć do kg | backend nadal ma dokładnie kanoniczne 62.5 kg; brak dryfu po round-trip | TODO REAL DEVICE |
| G3 | wyłącz telefon/sieć, zaloguj serie, kill/resume zegarka, przejdź przez północ | EventQueue, sessionDay, czas/serie/tonaż wracają; nowy dzień nie połyka starej kolejki | TODO REAL DEVICE |
| G4 | przywróć sieć i dwukrotnie wyślij ten sam finalny batch | ACK dopiero po trwałym zapisie; jeden workout, jeden FIT, drugi request nie zmienia revision | TODO REAL DEVICE |
| G5 | edytuj tę samą serię nowszą wartością na Androidzie i starszą na Garminie, potem odwróć kolejność | per-set nowsze `at/updatedAt` wygrywa, pozostałe serie obu klientów zostają, jedna sesja w web | TODO REAL DEVICE |
| G6 | z niewysłaną sesją wygaś PRO, spróbuj finish (`403`), przywróć PRO i retry | token i EventQueue zostają; po restore zapis bez ponownego zakupu i bez duplikatu | TODO REAL DEVICE |
| G7 | revoke urządzenia i osobno poczekaj/testowo ustaw expiry tokenu, potem day/ingest | oba dają `401`, token lokalny znika dopiero po odpowiedzi, kolejka nie znika; re-pair pozwala retry | TODO REAL DEVICE |
| G8 | nowe pair -> logout w mobile -> day/ingest; osobne konto -> delete account -> day/ingest | `garminRevokeAllDevices`/purge odcinają backend; `device_tokens` i pair codes konta usunięte | TODO REAL DEVICE |
| G9 | quick workout offline -> discard; osobno plan workout -> finish | discard nie wysyła ingest i nie zapisuje FIT; finish tworzy dokładnie jeden FIT z HR i jeden kanoniczny workout | TODO REAL DEVICE |

Do zamknięcia Z226 wymagane są logi HTTP/statusy G1-G9, screenshot pending/403/401/retry, eksport lub widok pojedynczego FIT w Garmin Connect oraz pojedynczy workout widoczny na web/Android. W sesji implementacyjnej `system_profiler SPUSBDataType` i `diskutil list` nie wykryły Garmina, więc brama fizyczna była zewnętrznie niemożliwa.
