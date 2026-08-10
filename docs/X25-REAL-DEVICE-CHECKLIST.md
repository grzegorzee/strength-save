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

## Z227-Z228 — wspólny ekran urządzeń i odcięcie dostępu

| # | Sekwencja cross-device | Oczekiwany wynik i wymagany dowód | Status |
|---|---|---|---|
| D1 | Otwórz Ustawienia na web, iOS i Android po lifecycle Watch oraz finalnym Garmin ingest | te same dwa deviceId, last seen/sync, pending, HealthKit/FIT i sync status na trzech klientach | TODO REAL DEVICE |
| D2 | Odłącz Apple Watch na web, pozostaw niewysłaną serię i uruchom iPhone/Watch offline | nowe akcje zablokowane po najbliższym lifecycle, kolejka nadal widoczna; jawny relink przywraca możliwość retry | TODO REAL DEVICE |
| D3 | Odłącz Garmin na Androidzie i ponów day/ingest z lokalną kolejką | `401`, brak utraty kolejki; po re-pair retry zapisuje jedną sesję i jeden FIT | TODO REAL DEVICE |
| D4 | Logout oraz delete osobnych kont technicznych przy obu zegarkach; sprawdź web po ponownym loginie | oba urządzenia odcięte, zero checkoutu/triala na web/zegarkach, historia i niewysłane lokalne eventy nie są kasowane w ciemno | TODO REAL DEVICE |

Do zamknięcia Z228 dołącz screenshot wspólnego panelu z każdej powierzchni oraz log callable/HTTP dla unlink, revoke, expired i relink. Testy muszą używać wyłącznie kont technicznych i obejmować scenariusze treningowe z Z228, nie tylko ekran ustawień.

### Dowód automatyczny Z228 (nie zastępuje D1-D4)

- iOS -> Watch -> web edit -> iOS finish: jedna sesja, obie najnowsze serie, 1220 kg;
- Android -> Garmin offline -> reconnect -> utracony ACK -> retry: jeden dokument i jedna revision końcowa;
- równoległy telefon/Watch: deterministyczny tie-break po `updatedEventId`, replay no-op;
- reinstall: rehydracja kanonicznego `sessionId`, potem nowszy event Watch;
- entitlement: `expired` zachowuje możliwość finish/retry aktywnej sesji, `revoked` blokuje akcje bez skasowania kolejki;
- emulator Auth/Firestore/Functions: 13/13 PASS, w tym produkcyjny callable `syncUserProfile` dla istniejącego profilu i realny konflikt rewizji.

Detekcja urządzeń 2026-08-10: `xcrun xctrace list devices` pokazuje fizyczny iPhone
wyłącznie jako offline oraz brak fizycznego Watch; `adb devices -l` jest puste;
`system_profiler SPUSBDataType` nie pokazuje Garmina. Dlatego W1-W9, G1-G9 i D1-D4
pozostają rzeczywistym `KROK USERA`, a Z225, Z226 i Z228 nie są odhaczone.
