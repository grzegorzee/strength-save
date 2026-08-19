# Raport A-T5 — prawdziwy kontrakt offline (2026-08-19)

## Status

**BLOCKED na bramce fizycznej.** Kod, bramki automatyczne i pełne przebiegi na Android
Emulator oraz iOS Simulator są zielone w commitach `1874a53e` i `00d1a178`. Nie wolno
oznaczyć A-T5 jako DONE ani zaczynać A-RELEASE, dopóki pełny scenariusz nie przejdzie na
realnym iOS, Androidzie, Apple Watch i Garminie.

Testy używały wyłącznie syntetycznych użytkowników lokalnych emulatorów lub mocka E2E.
Nie zapisano żadnej serii na realnym koncie.

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

## Dokładny blocker

Stan odczytany po wszystkich pracach niezależnych:

```text
xcrun devicectl list devices
Iphone (Greg) ... unavailable ... iPhone15,2

adb devices -l
List of devices attached

system_profiler SPUSBDataType | rg Garmin
<brak wyniku>

Jedyna aktywna para iPhone+Watch to iPhone 17 Pro Max Simulator + Apple Watch Series 11
Simulator. Brak dostępnego fizycznego Apple Watch i Garmina.
```

Android AVD i iOS Simulator pozwoliły wykonać pełne sekwencje, łącznie z systemowym
uśpieniem/wyłączeniem ekranu, resume oraz killami procesu. Nadal nie są dowodem sprzętowym:
rzeczywisty iOS może inaczej zawiesić WKWebView po zgaszeniu ekranu, a zegarki wymagają
transportu, restartu i ACK na prawdziwym radiu/Storage. Dlatego ostatnie dwa checkboxy A-T5
pozostają otwarte.

## Procedura domknięcia — bez realnego konta

Na osobnym koncie testowym/fixture, bez danych użytkownika:

1. iOS: online seed → force quit → airplane → launch → start planu → jedna seria → lock
   2 min → resume → finish offline → kill → launch offline → reconnect. Potwierdzić jeden
   trening w chmurze, zero duplikatów i brak utraconych ćwiczeń.
2. Powtórzyć identyczny scenariusz na fizycznym Androidzie.
3. Apple Watch: z telefonem nieosiągalnym odhaczyć serię i zakończyć; potwierdzić pending,
   restart zegarka/apki, retry po reconnect, ACK oraz pojedynczy ingest na telefonie.
4. Garmin: offline odhaczyć i zakończyć, wymusić błąd ingest, zrestartować aplikację,
   ponowić po reconnect; potwierdzić wyczyszczenie kolejki dopiero po sukcesie i jedną sesję.
5. Dopiero po czterech PASS odhaczyć dwa ostatnie punkty A-T5, uruchomić ponownie wszystkie
   bramki i wykonać A-RELEASE jako jeden train z tego samego zielonego commita.
