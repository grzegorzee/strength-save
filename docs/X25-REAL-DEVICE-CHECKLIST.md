# X25 — brama real-device Apple Watch

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
