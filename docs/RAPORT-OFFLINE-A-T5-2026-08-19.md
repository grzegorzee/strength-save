# Raport A-T5 — prawdziwy kontrakt offline (2026-08-19)

## Status

**BLOCKED na pozostałej bramce fizycznej.** Kod, bramki automatyczne i pełne przebiegi na
Android Emulator oraz iOS Simulator są zielone w commitach `1874a53e` i `00d1a178`.
Fizyczny Garmin EPIX 2 przeszedł pełny kontrakt po poprawce `f127039e`. Nie wolno oznaczyć
A-T5 jako DONE ani zaczynać A-RELEASE, dopóki pełny scenariusz nie przejdzie jeszcze na
realnym iOS i Androidzie oraz interaktywnym symulatorze Apple Watch. Właściciel jawnie
dopuścił Watch Simulator jako dowód zamiast fizycznego zegarka.

Testy używały wyłącznie syntetycznych użytkowników lokalnych emulatorów, mocka E2E albo
wydzielonego syntetycznego konta produkcyjnego Garmin QA. Nie zapisano żadnej serii na
realnym koncie. Fizyczny wariant Garmin QA miał wyłączony zapis FIT, więc techniczny
trening nie trafił do prywatnego Garmin Connect właściciela.

## Wykonane dowody

- TDD: RED brak `firebase-emulator-runtime`, następnie GREEN; dodatkowy RED potwierdził,
  że flaga loopback mogłaby przełączyć natywny `localhost`, po czym kontrakt został
  domknięty przez `Capacitor.isNativePlatform()`.
- `npm run test`: 233/233 pliki, 1700/1700 testów.
- `npm run typecheck`, `npm run lint`, `npm run build`, `check:bundle-budget`,
  `check:dist-smoke`, `check:dist-offline`, `check:no-emoji`: GREEN.
- `check:dist-offline`: prawdziwy Auth/UserProvider, cached active profil i plan, nowa
  strona po całkowitym odcięciu sieci, konkretne CTA Dashboardu, nieogrzany Analytics
  lazy route i ukończona seria w IndexedDB.
- Firebase emulator E2E: active/suspended/no-cache 3/3 GREEN, bez
  `fittracker_e2e_auth_state`.
- Workout E2E Chromium/WebKit: 6/6 GREEN. Chromium wykonuje prawdziwy renderer freeze;
  oba silniki zachowują komplet serii po kill/cold restore i stary flow edycji planu.
- Sync unit: offline launch nie synchronizuje; jeden event `online` daje dokładnie jeden
  `final`, mimo że ta sama sesja istnieje w drafcie i kolejce.
- Wearables unit 3/3: Apple Watch zapisuje durable przed transmit i usuwa tylko po ACK;
  Garmin zachowuje Storage po błędzie, czyści tylko po sukcesie, duplikat `eventId` daje
  jedną kanoniczną serię.
- Android AOSP API 35: pełna sekwencja online seed → force-stop → airplane → cold launch
  offline → start planu → 100 kg × 5 → ekran uśpiony 129 s → resume → finish offline →
  force-stop → cold launch offline → reconnect. Wynik: dokładnie jeden dokument Firestore,
  jedna ukończona seria 100 kg × 5, Dashboard: 1 trening i 0,5 t.
- Androidowy kill ujawnił RED, którego nie pokazywały testy web: po ponownym otwarciu
  pojedynczy-tab manager Firestore potrafił zgłosić `Failed to obtain exclusive access to
  the persistence layer`. Test regresyjny `firestore-native-kill-cache.test.ts` powstał
  przed poprawką; najmniejszy fix to `persistentMultipleTabManager()` (`00d1a178`). Stary
  kontrakt persistence/cache oraz pełna sekwencja po poprawce są GREEN.
- iOS Simulator 26.5: pełna sekwencja z syntetycznym userem lokalnego emulatora. Po cold
  launchu bez backendu Dashboard i CTA odtworzyły się z cache. Seria 100 kg × 5 została
  zapisana offline; ekran był wyłączony od epoch 1787138924 do 1787139054, czyli 130 s.
  Po odblokowaniu oraz killu procesu seria nadal była kompletna. Trening zakończył się
  offline (podsumowanie 0,5 t / 1 seria), a po kolejnym killu cold Dashboard pokazał
  `You have a workout finished locally`.
- iOS reconnect: Sync Center pokazał `Pending workouts saved to the cloud: 1`; zapytanie
  admin do lokalnego Firestore zwróciło dokładnie jeden dokument
  `workout-Wmm2n1igMWi7N9E0hi3w3GfmVZpA-ios-offline-day-2026-08-19`. W nim jedyna
  ukończona seria ma `weight=100`, `reps=5`; Dashboard po syncu pokazuje `1 of 1 sessions`,
  `Workouts 1`, `Tonnage 0.5 t`.
- iOS: pełny scheme `App` z przywróconego produkcyjnego mobile bundle kompiluje się bez
  globalnego `-sdk` (każdy target zachowuje własne SDK). W `App.app/Watch` są
  `StrengthWatch.app` oraz `StrengthWatchWidgets.appex`; wersja 1.0.0, build 103.
- Android: `assembleDebug` GREEN, artefakt `android/app/build/outputs/apk/debug/app-debug.apk`.
- Garmin: SDK 9.2.0, `epix2` build GREEN, PRG uruchomiony przez `monkeydo`.
- Fizyczny Garmin EPIX 2 (firmware 26.09): osobny UUID aplikacji i nazwa `Strength Save
  QA`; produkcyjne pliki aplikacji zostały zabezpieczone binarnie i niezmienione.
  Początkowy cold launch w trybie samolotowym odtworzył RED `Brak łączności. Ponowić?
  (-104)`, mimo poprawnego dzisiejszego cache. Root cause: konto bez historii nie miało
  klucza `recents`, więc każdy cold launch wymuszał fetch, a błąd transportu zastępował
  istniejący plan ekranem retry.
- TDD Garmin (`f127039e`): test najpierw padł przez brak kontraktu fallbacku; minimalna
  poprawka zapisuje brak historii jako pustą listę i po ujemnym kodzie transportu używa
  tylko cache z dzisiejszą datą. 401/403/5xx i cache z poprzedniego dnia pozostają
  fail-closed. Test kontraktowy 6/6, szerszy zakres functions 9/9, wearables 3/3 oraz
  kompilacje produkcyjnego i QA `epix2` są GREEN. PRG QA miał SHA-256
  `8efb2e2acd9fefec1b545c6cce2ae6a676bca148d7901042e1b5c2cc35d05f2b`.
- Fizyczny przebieg po poprawce: airplane → cold launch dzisiejszego planu bez `-104` →
  dwie serie offline (`QA asysta` 17,5 kg i `QA ciężar dystans czas` 25 m) → ekran
  zgaszony pełne 2 min → resume → kill → cold launch z `2 do wysłania` → finish offline
  z komunikatem braku łączności → drugi kill → cold offline nadal `2 do wysłania` →
  reconnect → pojedyncze potwierdzenie finish → `Zapisano`.
- Dowód Firestore przed reconnect: dokładnie jeden dokument
  `garmin-dd8b6f6f5de6-w-2026-08-19-1787145195000`, trzy istniejące serie,
  `lastSyncAt=1787145412178`, pending `0`. Po reconnect nadal ten sam jeden dokument,
  pięć serii łącznie, nowe wartości dokładnie 17,5 kg i 25 m, `revision=2`,
  `lastSyncAt=1787147204248`, pending `0`, `lastError=null`, `fitStatus=unavailable`.
  Nie powstał duplikat dokumentu ani FIT. Próba uzupełnienia dowodu z Cloud Logging była
  jawnie niedostępna (`PERMISSION_DENIED` dla log views); nie jest przedstawiana jako PASS.
- Dodatkowy finding z fizycznego ekranu: po logu offline menu pokazywało `1/1`, ale nie
  lokalne `17,5 kg` ani `25 m`; wartości pojawiły się dopiero po ingest/refetch. Storage
  nie zgubił danych — dowodzi tego późniejszy dokument — brakował natychmiastowy feedback.
  TDD `5827b395` dodaje formatter ostatniej lokalnej serii dla `weight_reps`, `duration`,
  `weight_distance_duration` i `assisted_bodyweight`, zachowując licznik oraz target jako
  fallback. RED → kontrakt 7/7, functions 224/224, pełne 1700/1700, typecheck/lint/build,
  bundle/dist/offline/no-emoji i `epix2` GREEN.
- Na decyzję właściciela pominięto powtórną instalację QA. Produkcyjny PRG został
  zastąpiony bez kasowania Storage; SHA-256
  `d3165176b9b0c0cc2520e36a1b1875aa255f06f37641790122823e9ce9081ad9`. To lokalny
  sideload głównej aplikacji, nie częściowa publikacja Connect IQ Store. Brak ponownego
  ręcznego odczytu etykiet jest jawnie otwartym dowodem, nie ukrytym PASS. Po instalacji
  właściciel potwierdził normalny start głównej aplikacji, zachowane konto/plan i poprawne
  wskazanie najbliższego treningu na czwartek.

## Dokładny blocker

Stan odczytany po wszystkich pracach niezależnych:

```text
xcrun devicectl list devices
Iphone (Greg) ... unavailable ... iPhone15,2

adb devices -l
List of devices attached

Jedyna aktywna para iPhone+Watch to iPhone 17 Pro Max Simulator + Apple Watch Series 11
Simulator. Fizyczny Garmin EPIX 2 jest już zweryfikowany. Brak dostępnego fizycznego
Androida; `Iphone (Greg)` pozostaje niedostępny dla Xcode. Apple Watch zgodnie z późniejszą
decyzją właściciela ma zostać domknięty na aktywnej parze symulatorów.
```

Android AVD i iOS Simulator pozwoliły wykonać pełne sekwencje, łącznie z systemowym
uśpieniem/wyłączeniem ekranu, resume oraz killami procesu. Nadal nie są dowodem sprzętowym:
rzeczywisty iOS może inaczej zawiesić WKWebView po zgaszeniu ekranu, a Apple Watch wymaga
transportu, restartu i ACK na prawdziwym radiu/Storage. Garmin dowodzi już zachowania
prawdziwego Storage i transportu, ale ostatnie dwa checkboxy A-T5 pozostają otwarte do
kompletu rodzin urządzeń.

## Procedura domknięcia — bez realnego konta

Na osobnym koncie testowym/fixture, bez danych użytkownika:

1. iOS: online seed → force quit → airplane → launch → start planu → jedna seria → lock
   2 min → resume → finish offline → kill → launch offline → reconnect. Potwierdzić jeden
   trening w chmurze, zero duplikatów i brak utraconych ćwiczeń.
2. Powtórzyć identyczny scenariusz na fizycznym Androidzie.
3. Apple Watch Simulator (jawnie zaakceptowany zamiast fizycznego): z telefonem
   nieosiągalnym odhaczyć serię i zakończyć; potwierdzić pending, restart zegarka/apki,
   retry po reconnect, ACK oraz pojedynczy ingest na telefonie.
   **PASS 2026-08-19 wieczór (`60ef6c8c`)** — szczegóły w sekcji „Watch Simulator —
   dokończenie" na dole.
4. Garmin: **PASS 2026-08-19** — offline odhaczenie, błąd ingest, dwa restarty aplikacji,
   retry po reconnect, kolejka wyczyszczona dopiero po ACK i jedna sesja.
5. Dopiero po czterech PASS odhaczyć dwa ostatnie punkty A-T5, uruchomić ponownie wszystkie
   bramki i wykonać A-RELEASE jako jeden train z tego samego zielonego commita.

## Watch Simulator — dokończenie (2026-08-19 wieczór, po limicie Codexa)

Sekwencja interaktywna na parze iPhone 17 Pro Max + Apple Watch Series 11 Simulator,
konto syntetyczne `ios-offline-a-t5@e2e.test` (uid `Wmm2n1igMWi7N9E0hi3w3GfmVZpA`)
na lokalnych emulatorach Auth/Firestore. Przebieg i dowody:

1. Quick workout wystartowany z zegarka; telefon ACK-nął dopiero po utworzeniu
   trwałego szkicu (relacja Codexa sprzed limitu + kontekst WC).
2. Seria 42,5 kg × 5 zalogowana przy zabitym telefonie; zegarek usunął ją z kolejki
   dopiero po trwałym przyjęciu (`ackedEventIds` zawiera `0E992520…`).
3. 130 s wygaszonego ekranu + ponad 2 h uśpienia: proces apki zegarka przeżył
   (ten sam pid), stan sesji trwały. Pipeline wyświetlacza symulatora umarł po cyklu
   `screenConfig power` (czarne zrzuty simctl i okna) — wymagał restartu symulatora;
   to defekt narzędzia, nie apki. Po restarcie apka wróciła do aktywnego treningu
   (timer sesji kontynuowany, 142:09).
4. FINISH przy zabitym telefonie → `EA1013B9…` w `watch.pendingEvents.v1`
   (`watch.localFinish` ustawiony). Pending przetrwał restart apki zegarka.
5. **RED wykryty przez QA:** po restarcie zegarka nic nie retransmituje trwałej
   kolejki — systemowe transfery WCSession przepadają z restartem, `activate()` nie
   flushował, a finishedView (jedyny osiągalny widok) nie pokazywał pending ani Retry.
   Event wisiał >10 min mimo osiągalnego telefonu.
6. **TDD fix `60ef6c8c`:** RED w `wearable-offline-contract.test.ts` (2 testy) →
   `retryPendingEvents()` po `activationDidComplete` i po powrocie reachability,
   finishedView z licznikiem pending i Retry. Retransmisja bezpieczna: telefon
   deduplikuje enqueue po `eventId`, ingest funkcji ma test dedup.
7. Po instalacji fixu: auto-retry przy aktywacji dostarczył event, telefon ACK-nął
   (`ackedEventIds` z `EA1013B9…`), obie kolejki puste, mutacja Firestore committed
   pod deterministycznym id `workout-<uid>-adhoc-2026-08-19-1787152125994-2026-08-19`
   (store `mutations` = 0 w trwałym cache SDK => zapis potwierdzony przez serwer;
   jeden id sesji = jeden dokument).

Zastrzeżenie uczciwości: pierwotna instancja emulatora Firestore padła w trakcie
(razem z terminalem tła Codexa), więc finalny dokument nie jest już odczytywalny
przez REST — dowodem zapisu jest committed mutation w trwałym cache SDK plus łańcuch
ACK. Obserwacja poboczna (nie blocker): licznik serii na zegarku po restarcie
pokazuje 0 mimo wcześniej zalogowanej serii (in-memory `sessionStats`; odpowiednik
naprawionego UI Garmina `5827b395`) — kandydat na osobny task.

Stan po dokończeniu: z czterech PASS-ów procedury brakuje wyłącznie fizycznego
iPhone'a i fizycznego Androida (kroki właściciela). Watch i Garmin domknięte.
