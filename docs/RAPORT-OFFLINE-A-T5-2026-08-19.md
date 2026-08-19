# Raport A-T5 — prawdziwy kontrakt offline (2026-08-19)

## Status

**BLOCKED na bramce fizycznej.** Kod i wszystkie niezależne bramki automatyczne są
zielone w commicie `1874a53e`. Nie wolno oznaczyć A-T5 jako DONE ani zaczynać A-RELEASE,
dopóki pełny scenariusz nie przejdzie na realnym iOS, Androidzie, Apple Watch i Garminie.

Testy używały wyłącznie syntetycznych użytkowników lokalnych emulatorów lub mocka E2E.
Nie zapisano żadnej serii na realnym koncie.

## Wykonane dowody

- TDD: RED brak `firebase-emulator-runtime`, następnie GREEN; dodatkowy RED potwierdził,
  że flaga loopback mogłaby przełączyć natywny `localhost`, po czym kontrakt został
  domknięty przez `Capacitor.isNativePlatform()`.
- `npm run test`: 232/232 pliki, 1699/1699 testów.
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
- iOS: pełny scheme `App` z bieżącego mobile bundle kompiluje się i uruchamia na sparowanej
  parze symulatorów. W `App.app/Watch` są `StrengthWatch.app` oraz
  `StrengthWatchWidgets.appex`; wersja 1.0.0, build 103.
- Android: `assembleDebug` GREEN, artefakt `android/app/build/outputs/apk/debug/app-debug.apk`.
- Garmin: SDK 9.2.0, `epix2` build GREEN, PRG uruchomiony przez `monkeydo`.

## Dokładny blocker

Stan odczytany po wszystkich pracach niezależnych:

```text
xcrun devicectl list devices
Iphone (Greg) ... unavailable ... iPhone15,2

adb devices -l
List of devices attached

Android SDK: brak katalogu emulator i brak AVD.
Brak dostępnego fizycznego Apple Watch i Garmina.
```

Symulator nie reprodukuje kluczowego zachowania produkcyjnego: iOS wstrzymuje JavaScript
w WKWebView po zgaszeniu ekranu. Dlatego renderer freeze, `appStateChange` mock, build i
symulator są dowodami uzupełniającymi, ale nie zastępują 2-minutowego locka na urządzeniu.

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
