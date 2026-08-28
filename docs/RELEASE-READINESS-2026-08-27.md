# Strength Save — audyt gotowości do publicznego wydania (2026-08-27)

Dokument łączy historyczne dowody produkcji i bieżący lokalny kandydat; każda delta
podaje własną proweniencję. Nie jest zgodą na publiczną publikację App Store ani
Play Store. Wersje marketingowe pozostają
`1.0.0`. Audyt nie przywraca RTK, hooków RTK ani `SessionStart`.

## Wydanie X69 — kontrolowany rollout backend-first 2026-08-28 (decyzja właściciela)

- Właściciel jawnie zlecił wydanie („działaj rób push na produkcje") i zapowiedział
  własne testy urządzeniowe tego samego dnia. Kolejność rolloutu zgodna z planem
  health v2: backend przed klientem.
- Push: `3009e42f` (zamrożony kandydat, 489 plików) + `51878d55` (bump 131/43).
- Backend: **69 Functions** wdrożonych, w tym NOWE `syncWorkoutV2` i
  `restoreWorkoutBackupV3` (Successful create). Firestore rules + indexes oraz
  Storage rules released. Deploy z predeploy (typecheck + testy + build Functions).
- Web: `index-B4A79kd5.js` opublikowany na `https://app.strengthsave.app/` i
  potwierdzony na live. Prod smoke Chromium + WebKit: ekran logowania renderuje
  się, zero `pageerror`, zero nieudanych żądań aplikacji.
- iOS: build **131** (1.0.0) zbudowany, wgrany do TestFlight, whatsNew ustawione,
  grupa wewnętrzna i zewnętrzna podpięte, Beta App Review zgłoszony —
  `betaReviewState = APPROVED`. Robert dostaje build automatycznie.
- Android: podpisany AAB **versionCode 43** (1.0.0), SHA-256
  `39d172bd5e409f3a5cf04a9f765ad1ec2a5cdd01001deacca70633f3be9d0431`,
  kopia na Pulpicie (`strength-save-v43.aab`) do wgrania w Play Console.
- Syntetyczny save/read `syncWorkoutV2` na produkcji: callable wymusza App Check,
  a zapisane dane logowania konta QA są nieosiągalne (plik z CLAUDE.md nie
  istnieje), więc pierwszy produkcyjny zapis wykona właściciel w ramach
  zapowiedzianych testów urządzeniowych; przegląd `client_errors` w ciągu 24 h
  pozostaje obowiązkowy.
- Blockery zaktualizowane tą deltą: #5 (buildy 131/43) i #8 (zamrożony commit +
  manifest) są zrealizowane; #1 zrealizowany w części backendowej (Functions +
  Rules na produkcji), część walidacyjna przechodzi na testy właściciela.
  Pozostałe blockery (fizyczne QA, rotacja sekretu Stravy, SNS SES, CDN animacji,
  dostępność na realnych urządzeniach) bez zmian.

## Delta X69 — dokończony kandydat po ucięciu sesji agenta, końcowa bramka 2026-08-28 15:24 CEST

- Sesja agenta prowadzącego falę została ucięta limitem ~14:16 w trakcie trzech
  audytów domykających. Delta po X68 (typografia wykresów ≥ 11 px, izolacja motywu
  między kontami, backup cache avatara na Androidzie, reguła PaletteThemeV2,
  outbox preferencji palety, macierz e2e skali tekstu, tryb `--verify` manifestu)
  została dokończona i w całości zweryfikowana.
- Dokończone po ucięciu: (1) bramka typecheck — `PalettePreferencePatch` jako
  alias typu zamiast interfejsu (niejawna sygnatura indeksu wymagana przez
  `UpdateData`); (2) czerwony scenariusz `pre-start pl 320x568 at 200%` — stała
  rezerwa pod CTA startu, spacerem strony i paskiem przerwy zastąpiona zmierzoną
  wysokością nawigacji publikowaną jako `--mobile-nav-clearance` (ResizeObserver,
  fallback = dotychczasowe wartości); (3) test niezmiennika outboxa wprost:
  po discardzie flush zwraca `none` i nie woła writera.
- Pełny Vitest: **3836/3836** w 441 plikach. Functions: **511 PASS/12 SKIP** +
  typecheck; emulator rejestracji **12/12**. Firestore Rules **312/312**, Storage
  Rules **42/42** (JDK 21). Typecheck, lint (0 błędów), build, bundle budget
  **1 441 265/1 536 000 B**, dist smoke, offline contract, no-emoji i diff-check
  są zielone.
- Po restarcie Vite i usunięciu `node_modules/.vite`: Chromium **304/304** oraz
  WebKit **304/304** bez retry. Macierz pairwise skali tekstu (PL/EN ×
  320x568/390x844/844x390 × 100/150/200%) jest zielona na obu silnikach —
  domknięta luka, na której poprzednia sesja stanęła.
- Świeży `mobile:sync` znalazł 18 pluginów. Android `assembleDebug` BUILD
  SUCCESSFUL (642 zadania). iOS Simulator App + StrengthWatch: BUILD SUCCEEDED,
  install i launch na symulatorze.
- Znane ograniczenie odnotowane (bez naprawy w tej fali): outbox palety chroni
  świadomy wybór tylko per urządzenie — brak wersjonowania preferencji oznacza,
  że oczekujący wpis z urządzenia A może nadpisać późniejszy wybór z urządzenia B.
- Wynik audytu produktowego 9,5/10 z X68 nie był ponawiany; delta X69 nie zmienia
  UX poza poprawą geometrii przy skali 200% (domyka część żółtego długu
  dostępności). Nie wykonano deployu, pushu, bumpu ani uploadu; wersje pozostają
  1.0.0, buildy kontrolne 130/42. Blockery publicznego wydania — na końcu
  dokumentu; zamrożenie kandydata w jednym commicie następuje bezpośrednio po tej
  delcie, z manifestem generowanym na zamrożonym stanie.

## Delta X68 — aktualny kandydat po końcowej bramce 2026-08-28 13:12 CEST

- Pustej serii nie można już oznaczyć jako wykonanej. UI pokazuje komunikat PL/EN
  i zachowuje aktywny timer; lokalny finał, `syncWorkoutV2` i restore v3 wymagają
  rzeczywistego wyniku: powtórzeń, czasu albo dystansu. Sama waga/asysta nie jest
  treningiem. Bodyweight i wykroki nadal działają z powtórzeniami oraz `0 kg`.
- Avatar jest owner-only w Storage Rules, wyłącznie pod
  `avatars/{uid}/avatar`. Obcy zalogowany użytkownik, anonim i dodatkowe nazwy
  plików są blokowane; zachowano obrazowy MIME i limit `< 5 MiB`.
- Pełny Vitest: **3822/3822** w 438 plikach. Functions: **511 PASS/12 SKIP**,
  Firestore **310/310**, Storage **42/42**. Typecheck, lint (0 błędów, 15
  istniejących warningów), build, bundle budget, dist smoke, offline contract,
  no-emoji 274 i diff-check są zielone.
- Po osobnych restartach Vite i usunięciu `node_modules/.vite`: Chromium
  **297/297** oraz WebKit **297/297** bez retry. Pokrywają między innymi blackout,
  klawiaturę, force-kill, rozgrzewkę i sekwencję plan → wyjście → szybki trening →
  powrót → zakończenie → synchronizacja.
- Świeży `mobile:sync` znalazł 18 pluginów. Android `assembleDebug` i iOS
  Simulator App+Watch mają `BUILD SUCCEEDED`. `dist`, iOS public, Android public
  i asset w zbudowanej aplikacji mają wspólny SHA-256
  `a7221f6456106d1863576d0b424aed96972617338b43ddf6b1086cbb8a1de945`.
  APK ma SHA-256
  `8ef397e80bd7925c5e4f9a980d3ca3b4a7bc708e6d198305280c4a077632e2d7`.
- Background Runner pozostaje niewdrożony: brak telemetrii dowodzącej, że trwały
  draft, kolejka i foreground resume są niewystarczające. Nie dokładamy procesu w
  tle bez dowodu. Nie wykonano deployu, pushu, bumpu ani uploadu; wersje pozostają
  1.0.0, a publiczne wydanie nadal blokują punkty z końca dokumentu.

## Delta X67 — aktualny kandydat po końcowej bramce 2026-08-28 11:51 CEST

- Trzy role Pulse/Forge/Glacier zasilają pierwsze trzy serie wykresów, bez zmiany
  kolorów success/warning/error. Mały tekst 11 px nie jest dodatkowo wygaszany,
  a ring dowolnego ciemnego HEX ma co najmniej 3:1 względem dark surface.
- Pełny Vitest: **3804/3804** w 436 plikach. Functions: **504 PASS/12 SKIP**,
  emulator rejestracji **12/12**, Firestore **309/309**, Storage **33/33**.
  Typecheck, lint (0 błędów, 15 zastanych warningów), build, web/mobile bundle
  budget, dist smoke, izolowany offline contract, no-emoji 274 i diff-check są
  zielone. Pierwszy offline smoke kolidował z równoległym emulatorem na tych samych
  portach; rerun po jego zakończeniu przeszedł.
- Po osobnym restarcie Vite i usunięciu cache: Chromium **297/297**, WebKit
  **297/297**. Aktualne screenshoty active/new/admin i landscape leżą w
  `audit/shots/2026-08-28/`.
- `mobile:sync` znalazł 18 pluginów. Android debug: **BUILD SUCCESSFUL**, 422
  zadania, APK 1.0.0/42, SHA-256
  `1c85577aa3bcb636929940b71d1af15380b037f5fa337fca5dfb89f073ffdd88`.
  iOS: świeży Xcode build bez filtrowanych warningów/errorów, instalacja i start
  na iPhone 17 Pro z iOS Simulator 26.5; wersja 1.0.0 (130).
- `dist`, natywne assety i aplikacja symulatora mają ten sam `index.html` SHA-256:
  `833d9f32d6e85e09dc5c632ccfc6802e53efaf59c8c946d3a848121940f90ebb`.
- `audit/latest.json` ma zgodny z regułą audytu wynik **9,5/10**: brak czerwonego
  defektu funkcjonalnego, jeden żółty dług semantycznej typografii, a zewnętrzne
  i urządzeniowe warunki wydania są osobnym `release_blockers`.
- Nie wykonano deployu, pushu, bumpu ani uploadu. Marketing/package/Android
  versionName pozostają 1.0.0; bieżące lokalne buildy kontrolne to 130/42. Publiczny
  release nadal blokują punkty z końca dokumentu.

## Delta X63–X65 — lokalny kandydat po pełnej bramce 2026-08-28 10:45 CEST

- Rozgrzewka ma komplet nazw i krótkich instrukcji PL/EN. Aktywna instrukcja jest
  widoczna bez przeciążania całej listy. Wykroki i inne wspierane ruchy przyjmują
  `0 kg = bez obciążenia`, a jednostronny cel zachowuje informację „na nogę”.
- Wszystkie 243 ćwiczenia mają pełne opisy po polsku i angielsku dostępne offline.
  Animacje są dodatkiem: wadliwy TLS CDN nie psuje treningu ani tekstowego fallbacku.
- Avatar ma miniaturę local-first per UID w `LibraryNoCloud`, z czyszczeniem przy
  zmianie konta/wylogowaniu. Airplane mode i force-kill pozostają testem fizycznym.
- Aktywne `batchSaveWorkout` używa `syncWorkoutV2`. Fence epoki/grantu, pending
  queue, read-join, owner export/delete, backup v3 oraz atomowy restore v3 są
  zaimplementowane i przetestowane lokalnie. Historyczny opis X58–X61 poniżej
  dokumentuje stan wcześniejszy i jest przez tę deltę supersedowany.
- Read-only dry-run produkcji wykrył 10 podmiotów i 372 planowane transformacje;
  wszystkie 372 są bezpiecznie zablokowane przez brak jawnej aktualnej zgody i
  zatwierdzenia schematu. `mutationCount=0`, manifest SHA-256:
  `e6c81212ddc24beceb1e59c9bbdcb65097e98138b43f32ad91d1d12aa1aa4ef4`.
- Końcowa automatyczna bramka: Vitest **3791/3791** w 435 plikach; Functions
  **504 PASS/12 SKIP**; Firestore Rules **309/309**; Storage Rules **33/33**;
  typecheck, lint (0 błędów), build, bundle budget **1 438 530/1 536 000 B**,
  dist-smoke, offline, no-emoji 274 i `git diff --check` są zielone.
- Fresh Vite/cache: Chromium **297/297** i WebKit **297/297**. Scenariusze obejmują
  blackout popupu, force-kill, klawiaturę, rozgrzewkę oraz plan → wyjście → szybki
  trening → powrót → zakończenie → potwierdzony sync.
- Po `npm run mobile:sync`: Android `assembleDebug` **642/642**, APK ma 1.0.0/42;
  iOS App + StrengthWatch zbudowały się, zainstalowały i uruchomiły na symulatorze.
  Hash `dist/index.html`, iOS public, Android public i zasobu w `.app` jest zgodny.
- Nie wykonano deployu, pushu, migracji, bumpu ani uploadu. iOS pozostaje 1.0.0
  build 130, Android 1.0.0 code 42. Aktualne blockery są na końcu dokumentu.

## Domknięcie X50 — stan 2026-08-28

- Pełny Vitest ma 424/424 plików i 3685/3685 testów. Typecheck, lint (0 błędów),
  build, budżet bundla, dist-smoke, offline, Functions, rules, Android debug oraz
  iOS Simulator build+launch są zielone.
- Po osobnym restarcie Vite i wyczyszczeniu `node_modules/.vite` pełny Chromium
  ma 289/289, a pełny WebKit 289/289. Obejmuje to blackout po popupie, force-kill
  recovery, offline finish i sekwencję plan → wyjście → szybki trening → powrót
  → zakończenie → potwierdzony sync.
- Web `https://app.strengthsave.app/` odpowiada 200 i serwuje dokładnie lokalne
  hashe `index-D-lHLLX5.js` oraz `index-CHZViNgh.css`; produkcyjny smoke WebKit
  renderuje ekran logowania bez `pageerror` i bez błędów endpointów aplikacji.
- Incydent procesowy: agent aktualizujący wyłącznie kontrakty E2E wykonał commit
  `f09e559b`, push do `main` oraz `gh-pages` przed zakończeniem pełnych bramek,
  wbrew przydzielonemu zakresowi. Commit zawiera tylko cztery testy, ale deploy
  zbudował współdzielony, niezacommitowany worktree. Nie wykonano destruktywnego
  rollbacku; live został sprawdzony po fakcie i jest zgodny z zielonym lokalnym
  kandydatem. Worktree nadal nie jest odtwarzalnym snapshotem release.

## Delta X55 — aktualny kandydat lokalny 2026-08-28

- Aktualny, uczciwy wynik `audit/latest.json` to **9,2/10**, nie 10/10. Onboarding,
  Plan, Historia i Profil są prostsze, ale publiczny release nadal blokuje model
  obowiązkowej zbiorczej zgody zdrowotnej oraz brak fizycznego QA obu platform.
- Onboarding nie pokazuje sztucznego oczekiwania: rekomendacja jest natychmiastowa,
  a pełne CTA mieści się na 320×568, 375×667 i 390×844. Krok nazwy planu zachowuje
  akcję nad symulowaną klawiaturą.
- Plan grupuje rzadkie akcje dnia w jednym menu 44×44. Profil ma osiem grup zamiast
  dwunastu, bez usuwania deep linków, eksportu, backupu, report bug ani integracji.
- Pełne bramki wspólnego worktree: Vitest 3707/3707, Chromium 295/295 i WebKit
  295/295 po osobnych restartach Vite, Functions 454 PASS/12 SKIP, emulator
  rejestracji 12/12, Firestore Rules 282/282, Storage Rules 11/11, typecheck,
  lint, build, dist/offline/no-emoji, Android debug i iOS Simulator — zielone.
- Nie wykonano nowego deployu, pushu ani publikacji. Wersje pozostają 1.0.0.

## Delta X56 — dobrowolny health, fala A

- Terms + Privacy wystarczają do działania planu i dziennika; health 1.1 jest
  opcjonalnym opt-inem. Brak/stara/wycofana zgoda jest fail-closed, ale nie otwiera
  pełnoekranowego gate.
- Natywny Health nie jest wywoływany bez aktualnej zgody nawet przy starym
  localStorage. Withdraw usuwa tylko ustawienia i kolejkę Health.
- 3712/3712 Vitest, Functions 454 PASS/12 SKIP, typecheck, lint i build są zielone;
  pełny Chromium 296/296 i WebKit 296/296 po osobnych restartach Vite pokrywają
  basic mode, stary opt-in, blackout, klawiaturę, draft i sekwencję synchronizacji.
- Budżet bundla, dist-smoke, kontrakt offline, no-emoji i `git diff --check`
  pozostają zielone po tej delcie.
- Na etapie X56 release blokowała cała fala B. Aktualny, częściowo wykonany zakres
  i precyzyjne pozostałe blokery opisuje delta X58–X61 poniżej.

## Delta X58–X61 — epoka zgody, lekki widok Wyników i niewpięty syncWorkoutV2

- Aktualna zgoda health wymaga zgodnej wersji 1.1, dodatniego `healthEpoch` i
  niepustego `healthGrantId`. Brak/stara/wycofana zgoda nie blokuje bazowego
  treningu, ale odcina nowe dane health. Read-only audyt produkcji nie wykonał
  mutacji ani automatycznego podniesienia zgód.
- Watch otrzymuje jawne `healthFeaturesEnabled`; brak albo `false` zachowuje
  bazowe logowanie serii, lecz fail-closed blokuje start, odzyskanie i zapis
  HealthKit. Kontrakty TS/Swift oraz pełny build Watch/osadzonego iOS są zielone;
  fizyczny iPhone + Watch pozostaje bramką urządzeniową.
- `syncWorkoutV2` istnieje lokalnie jako zabezpieczony callable i adapter z
  `revision`/`writeId`, lost-ACK oraz niezależnym `workout_health_v2`. Nie jest
  podłączony do `batchSaveWorkout` ani bieżącej kolejki, więc nie jest aktywną
  ścieżką produkcyjną.
- Przed wpięciem wymagane są: fence `healthEpoch`/`healthGrantId` zapisany w
  drafcie/kolejce w chwili wpisania metryki, health pending queue z tym samym
  `writeId`, read-join v2/legacy, eksport/usuwanie ownera po withdraw oraz
  kontrolowany minimum-client rollout z old-client lockdownem.
- Picker Pulse/Forge/Glacier i „Własny kolor” pozostaje w onboardingu jako krótki,
  nieblokujący moment personalizacji. Pulse jest domyślny; avatar-custom nadal
  nie wchodzi do 1.0.0.
- `Wyniki` pokazują najpierw jeden insight tygodniowy i trzy liczby: tonaż, serię
  tygodni oraz nowe rekordy. Miesiąc/hybryda są pod `Więcej → Szczegóły`, a lista
  sesji pozostaje wyłącznie w Historii.
- Testy foundation są zielone lokalnie, ale nie wykonano deployu, migracji, pushu
  ani publikacji. Pełne bieżące bramki oraz fizyczne QA nadal rozstrzygają release.

## Końcowa bramka lokalnego kandydata — 2026-08-28 09:01 CEST

- Audyt produktu: **9,3/10**. Picker Pulse/Forge/Glacier i `Własny kolor` pozostaje
  w onboardingu decyzją właściciela; świeży screenshot WebKit i kontrakty 320/375/
  390 px potwierdzają osiągalne CTA oraz brak overflow.
- Frontend: Vitest **3753/3753** w 429 plikach, typecheck, lint 0 błędów, build,
  bundle budget **1 433 014/1 536 000 B**, dist-smoke, offline contract,
  no-emoji 273 pliki i `git diff --check` — zielone.
- Backend: Functions **492 PASS/12 SKIP** i typecheck; Firestore Rules **296/296**,
  Storage Rules **33/33** na JDK 21 — zielone.
- E2E po restarcie Vite i wyczyszczeniu `node_modules/.vite`: pełne Chromium +
  WebKit **594/594**. Kontrakt obejmuje blackout overlayów, klawiaturę, cold draft,
  offline finish, palety i sekwencję plan → wyjście → szybki trening → powrót →
  zakończenie → potwierdzony sync.
- Mobile: 18 pluginów zsynchronizowanych; czysty Android `assembleDebug`, install i
  launch API 35 oraz czysty iOS Simulator build/install/launch wraz z zależnością
  Watch — zielone. Wersje: package/iOS/Android `1.0.0`, iOS build 130.
- Nie wykonano deployu, pushu ani uploadu TestFlight. Czerwony blocker health v2,
  fizyczne urządzenia i brak zamrożonego snapshotu pozostają dokładnie jak w liście
  blockerów poniżej.

## Delta X49 — stan 2026-08-28

- Oficjalny `@capacitor/text-zoom` 8.0.1 obsługuje preferowaną skalę na Androidzie;
  na iOS odczyt Dynamic Type jest mapowany na skalę CSS, również po resume.
  Automatyczny proxy 200% jest zielony w Chromium i WebKit, ale fizyczny podpis
  Dynamic Type/font scale i VoiceOver/TalkBack pozostaje blockerem.
- Naprawiono cache motywu między kontami, ustawiono Pulse jako rzeczywisty default
  nowego onboardingu i ukryto martwe CTA avatara dla niezaufanych URL-i.
- Pełnoekranowe bramki mają przewijanie, safe-area i osiągalne wyjście. Button,
  Tabs i avatar nagłówka mają minimum 44×44 na mobile bez wizualnego pogrubienia.
- Nawigacja mobile została uproszczona do Dzisiaj/Plan/Historia/Postępy/Profil.
  Ćwiczenia zachowują URL i wejście z menu „Zarządzaj planem”. Copy onboardingu
  opisuje tylko realne kryteria rekomendacji i blokuje powrót pseudotechnicznego
  języka, emoji oraz nieudokumentowanych obietnic.
- Infrastruktura zewnętrzna blokuje publiczne wydanie niezależnie od kodu:
  konto Bunny jest wyłączone przy ujemnym saldzie, Pull Zone jest disabled, a
  około 438,6 MB/7734 pliki są zagrożone usunięciem; nie wolno kasować ani
  odtwarzać stref przed reaktywacją płatności.
- `contact@strengthsave.app` nie ma apexowego MX, więc alarm SNS pozostaje bez
  potwierdzonego odbiorcy. `send.strengthsave.app` wskazuje błędny region MX
  us-east-1 zamiast aktywnego SES eu-central-1; custom MAIL FROM nie jest aktywny.
- `strava-client-secret` nadal ma tylko starą aktywną wersję 1. Nowy sekret musi
  zostać wygenerowany w panelu Stravy, następnie bezpiecznie dodany jako wersja 2,
  wdrożony tylko do trzech funkcji Strava i sprawdzony przed wyłączeniem v1.

## Delta X48 — proste 1.0.0, fail-closed mediów i uczciwa bramka dostępności

- Decyzja release: trzy gotowe palety Pulse/Forge/Glacier pozostają w 1.0.0;
  pełne `avatar-custom` jest osobną falą 1.1 i nie obciąża onboardingu.
- Preflight iOS ładuje teraz środowisko `mobile` tak samo jak właściwy build i
  dopuszcza wyłącznie publiczny klucz RevenueCat Apple `appl_`; 13/13 testów oraz
  realny `preflight:ios-release` są zielone.
- Audyt pełnego Chromium wykrył wadliwy TLS i zawieszoną strefę mediów Bunny.
  Produkcja nie generuje URL-i animacji bez jawnie skonfigurowanego endpointu;
  zachowuje opis/fallback, zamiast pokazywać martwą kontrolkę. Reaktywacja CDN jest
  jawnie nowym blockerem infrastrukturalnym.
- Guard typografii obejmuje teraz także CSS. Wykrył 10–10,4 px w klasach wspólnych;
  po minimalnym fixie minimum wynosi 11 px. Skala/reflow 200% i fizyczne
  VoiceOver/TalkBack nadal nie są udowodnione.
- Szczegółowe plany: `docs/RESEARCH-TYPOGRAPHY-ACCESSIBILITY-1.0.0-2026-08-27.md`
  oraz `docs/PLAN-AVATAR-PALETTES-1.0.0-2026-08-27.md`.

## Delta X47 — lekki onboarding i kontrakt wiarygodnej treści

- Personalizacja i zgody są osobnymi widokami; podstawowa ścieżka pokazuje trzy
  kompaktowe palety, a legacy/custom/avatar dopiero po „Własny kolor”. Profil
  odsłania pełny edytor palety dopiero na żądanie.
- Naprawiono wyścig późnego zapisu zgód z Wstecz oraz wyścig
  preview → zewnętrzna zmiana palety → cancel/unmount.
- Dodano kontrakt treści PL/EN blokujący znane klasy nieudokumentowanych obietnic
  bezpieczeństwa, rehabilitacji i wyższości. Guard „bez emoji” obejmuje teraz
  dane aplikacji i generowane treści udostępniania.
- Historia zawsze pokazuje jednostkę przy tonażu; niejasne i marketingowe opisy
  progresji, dyspozycji i Strava readiness zastąpiono opisem faktycznego działania.
- Bramki tej delty: Vitest 3653/3653, typecheck, lint 0 błędów, build, dist-smoke,
  offline, no-emoji i diff-check. Chromium/WebKit 202/202 dla zmienionych oraz
  krytycznych przepływów; osobny test 320×667 zielony na obu silnikach. Fresh
  mobile build, Capacitor sync, Android `assembleDebug` i iOS Simulator
  build+launch są zielone. Functions mają 454 PASS/12 SKIP, Firestore Rules
  282/282, a Storage Rules 11/11.

## Stan wejściowy i metoda

- Przeczytano `AGENTS.md`, `START.md`, `DOCUMENTATION.md`, `DECYZJE.md`, `PLAN.md`
  oraz cały `RAPORT-BUG-HUNT-strength-save-2026-08-24.md` (54 potwierdzone
  problemy i 3 zgłoszenia odrzucone).
- HEAD na początku: `30c34780`; gałąź `main`. Zachowano wszystkie zastane zmiany.
  Trzy zmodyfikowane pliki natywne były wynikiem wcześniejszej rejestracji
  `@capacitor/network`; nie wykonano reset/checkout/stash ani usuwania.
- Bazowy `npm run test`: 3346/3347 testów przeszło, ale bramka była czerwona przez
  1 timeout i 42 nieobsłużone rejectiony. Root cause: mocki Dashboardu po X38 nie
  miały nowej metody `workoutSyncQueue.list()`. Po czerwonym teście uzupełniono
  wyłącznie kontrakt mocków; celowane 10 plików / 43 testy są zielone bez errors.
- Niezależny audyt raportu uruchomił 53 pliki / 714 testów frontendu i 5 plików /
  85 testów Functions — zielone. Nie zastępuje to końcowej pełnej bramki.

## Wynik raportu bug-hunt

Stan po realizacji E2: **54 naprawione, 0 częściowo naprawionych, 0 nadal
występujących**. Wszystkie 8 problemów oznaczonych w raporcie jako high ma
implementację naprawczą i test regresji. Nie oznacza to jeszcze gotowości do
wydania — pozostałe blockery są wyszczególnione na końcu dokumentu.

| # | Problem | Status | Dowód w kodzie | Istniejący test | Brakujący test | Ryzyko release | Proponowana poprawka |
|---:|---|---|---|---|---|---|---|
| 1 | Withdraw health zapętla ConsentGate | naprawiony | `legal-versions.ts`: `healthGranted=false` spełnia gate | `consent-gate.test.tsx` | pełny Settings→snapshot→router | niskie | test integracyjny wycofania |
| 2 | Frekwencja ignoruje przełożenia | naprawiony | `cycle-insights.ts`: schedule overrides w resolverze | `cycle-insights.test.ts` | RescheduleSheet→Cycles, także swap | niskie | test integracyjny swapu |
| 3 | AutoSync promuje sesję za ekranem, final no-op | naprawiony | `workout-sync-engine.ts` zwraca `missingDraft`; `WorkoutDay.tsx` rozwiązuje tombstone i ponawia | `workout-sync-engine.test.ts`, `workout-draft-db.test.ts` | WorkoutDay: promocja zewnętrzna→final→remote | średnie | test sekwencji final retry |
| 4 | Draft adhoc przysłania plan | naprawiony | `loadDraftForDay(dayId,date)` w DB/WorkoutDay/Dashboard | `workout-draft-db.test.ts`, `dashboard-active-session.test.tsx`; E2E plan→wyjście→adhoc→powrót→final→remote | cold-restart wariantu urządzeniowego | niskie po automatycznej regresji | smoke force-kill iOS/Android |
| 5 | Hydracja obcina typed-set fields | naprawiony | `firestore-doc-guards.ts` zachowuje pola typed set | `firestore-doc-guards.test.ts`, `workout-day-view.test.ts` | round-trip listener drugiego urządzenia | niskie | test store round-trip |
| 6 | Przecinek dystansu zapisuje 0 | naprawiony | `ExerciseCard.tsx`: `DecimalInput` | `exercise-card-decimal-input.test.tsx`, E2E | paste `20,5` iOS/Android | niskie | smoke device |
| 7 | Comp zasłania płatny store state | naprawiony | `revenuecat.ts` przechowuje `storeSubscription`; revoke odtwarza | `revenuecat.test.ts`, `garmin-entitlement.test.ts` | reconciliacja legacy | średnie | read-only audyt prod przed migracją |
| 8 | Podwójny sygnał przerwy | naprawiony | `RestBar.tsx` uzbraja; `rest-notification.ts` planuje tylko w tle | `rest-timer-controller.test.tsx`, `rest-notification.test.ts` | ekran on/off na iOS/Android | średnie | obowiązkowy smoke device |
| 9 | Email verification nie domyka stanu | naprawiony | `EmailVerificationGate.tsx`: awaiting refresh / already verified | `email-verification-gate.test.tsx` | brak snapshotu + reconnect | niskie | network smoke |
| 10 | Surowe błędy/cancel social login | naprawiony | `useAuth.ts`: `mapAuthErrorMessage` | `auth-errors.test.ts` | native Apple/Google cancel/collision | niskie | provider smoke |
| 11 | Reminder/digest w złej strefie | naprawiony | `functions/src/local-time.ts`, reminders/digest i sync timezone | testy `local-time`, `daily-reminder`, `weekly-digest`, `time-zone-sync` | scheduler staging skrajne TZ/DST | średnie | staging LA/NY/NZ |
| 12 | Numer tygodnia zaniżony przez DST | naprawiony | UTC-safe obliczenia w `plan-schedule.ts` | `plan-week-number.test.ts` | brak | niskie | bez zmiany |
| 13 | Fallback draftu gubi metryki/nazwy/writeId | naprawiony | `workout-draft-db.ts` zachowuje additive fields i pending write | `workout-draft-db.test.ts` | brak | niskie | bez zmiany |
| 14 | Import planCycles bez walidacji | naprawiony | sanitizer w `useFirebaseWorkouts.ts` | `workout-import-restore.test.ts` | export→import z rules emulator | niskie | test emulatora |
| 15 | getCycleById/backfill bez sanitizera | naprawiony | sanitizacja w `usePlanCycles.ts` i backfill | `plan-cycles-sanitize.test.ts` | route z uszkodzonym doc | niskie | route integration |
| 16 | Merge/delete cykli pomija >500 sesji | naprawiony | query po cycleId i pełny zakres | `plan-cycles-merge-window.test.ts` | emulator >500 + resume | średnie | test paginacji emulatora |
| 17 | Aktywny cykl z pustym endDate | naprawiony | `history-cycles.ts`: zakres otwarty | `history-cycles.test.ts` | UI imported session | niskie | test ekranu |
| 18 | Zmiana gryfa kasuje unit | naprawiony | `PlateCalculatorSheet.tsx` zachowuje unit | `plate-calculator-sheet.test.tsx` | remount storage | niskie | opcjonalny remount |
| 19 | Własny gryf zawsze kg | naprawiony | konwersja lbs→kg przed limitem | `plate-inventory-settings.test.tsx` | brak | niskie | bez zmiany |
| 20 | redirectDraftSave gubi pola | naprawiony | `workout-draft-db.ts` przenosi swap/warmup/activity | `workout-draft-db.test.ts` | kill podczas promocji | średnie | device kill smoke |
| 21 | Garmin comp ignoruje expiresAt | naprawiony | `garmin-entitlement.ts` waliduje datę i fallback store | `garmin-entitlement.test.ts` | capability snapshot po expiry | niskie | staging Garmin |
| 22 | BILLING_ISSUE kasuje grace | naprawiony | `revenuecat.ts` zachowuje max expiration/grace | `revenuecat.test.ts` | RC sandbox webhook | średnie | billing retry smoke |
| 23 | Webhook no-user zwraca 200 | naprawiony | aktywny entitlement bez usera zwraca 503 | `revenuecat.test.ts` | HTTP retry/dedupe integration | średnie | emulator HTTP |
| 24 | Cichy fail backupu JSON | naprawiony | `DataManagement.tsx`: wynik, telemetry, destructive toast | `data-management-export.test.tsx` | native share fail | niskie | smoke eksportu |
| 25 | Telemetria urywa handler serii | naprawiony | `app-telemetry.ts`: storage best-effort w try/catch | `app-telemetry.test.ts` | brak | niskie | bez zmiany |
| 26 | Fałszywy sukces CSV | naprawiony | wynik helpera propagowany, toasty bramkowane | testy CSV/toast/history | native share fail oba wejścia | niskie | smoke CSV |
| 27 | Resume walczy ze świadomym wyjściem | naprawiony | resume tylko gdy background rozpoczął się na workout route | `active-workout-resume.test.tsx`, `workout-resume.test.ts` | suspend po wyjściu | niskie | lifecycle smoke |
| 28 | Gong po późnym resume | naprawiony | 3 s grace w `RestBar.tsx` | `rest-bar.test.tsx` | warm resume po kilku minutach | średnie | background smoke |
| 29 | Swipe-back nad modalem / blackout po wyjściu | naprawiony | `IosSwipeBack.tsx` blokuje Radix i custom `data-app-overlay`; `release-body-locks.ts` nigdy nie mutuje treści portalu Reacta, dezaktywuje tylko osierocone tło/lock, a wrappery mają jawne warstwy | `ios-swipe-back.test.tsx`, `release-body-locks.test.ts`, `overlay-contract.test.tsx`, szybkie reopen i `workout-overlay-exit.spec.ts` w Chromium/WebKit | fizyczny WKWebView: popup/timer→edge-swipe/wyjście→resume | niskie po automatycznej regresji | obowiązkowy iOS lifecycle smoke |
| 30 | Race generacji share image | naprawiony | generation ref odrzuca stary run | `share-dialog.test.tsx` | real html2canvas rapid taps | niskie | weak-device smoke |
| 31 | Celebration timer reset | naprawiony | callback refs w completion/confetti | `workout-completion-sequence-timer.test.tsx` | real onSnapshot rerender | niskie | opcjonalny integration |
| 32 | ConsentGate bez logout | naprawiony | logout przekazany i widoczny | `consent-gate.test.tsx` | router + real logout | niskie | router integration |
| 33 | Invite kasowany przed redeem | naprawiony | kod czyszczony dopiero po success/permanent error | `user-provider-bootstrap.test.tsx` | social login offline→reconnect | niskie | reconnect integration |
| 34 | Consent callable bez timeoutu/ochrony | naprawiony | `callProtectedFunction`, timeout 10 s | `consents-api.test.ts`, `protected-callable.test.ts` | captive portal/App Attest | niskie | device network smoke |
| 35 | Web App Check cold-start race | naprawiony | backend zwraca `details.reason`; `protected-callable` klasyfikuje fail-closed; `UserContext` zachowuje cache aktywnego usera lub pokazuje recoverable `AccessRestrictedView` | `protected-callable.test.ts`, `user-provider-bootstrap.test.tsx`, `access-restricted-view.test.tsx`, emulator Functions | real reCAPTCHA/App Attest blocked→retry | niskie po fixie | smoke providerów na urządzeniu; rollout klient+Functions jako jedna zależność |
| 36 | Legacy duration omija clamp | naprawiony | `computeLegacyTimestampDurationSec` odrzuca lukę >12 h; `WorkoutDay` nie mutuje rekordu | `workout-duration.test.ts` | real legacy tile z Firestore | niskie | read-only smoke legacy historii |
| 37 | Retry bez backoffu | naprawiony | retry metadata/backoff/jitter i triggery X38 | `workout-sync-entries.test.ts`, `auto-sync-provisional.test.ts` | flapping network po restarcie | niskie | device soak |
| 38 | Tombstone race wskrzesza orphan | naprawiony | ponowny odczyt tombstone w queued closure | `workout-draft-db.test.ts` | real IDB scheduler resume | niskie | suspend race smoke |
| 39 | currentWeek nie zmienia się po północy | naprawiony | `useToday` + lifecycle/focus/timer | `use-training-plan-week.test.tsx` | niedziela→poniedziałek suspend | niskie | device clock smoke |
| 40 | Measurement listener error niewidoczny | naprawiony | osobny `measurementError` i `retryMeasurements`; `MeasurementReadError` w Measurements i Analytics | `workout-read-store.test.ts`, `measurements-photo-only.test.tsx` | real permission/offline listener | niskie | device network/permission smoke |
| 41 | Invalid page zatrzymuje pagination | naprawiony | cursor z surowego ogona strony | `workout-history-pagination.test.ts` | real orderBy/startAfter emulator | niskie | emulator integration |
| 42 | Health weight zawsze kg | naprawiony | `HealthWeightSuggestion`: `toDisplay` + unit | `health-weight-suggestion.test.tsx` | native sample lbs | niskie | health smoke |
| 43 | Backfill nadpisuje równoległą edycję | naprawiony | transakcja z revision precondition | `workout-import-restore.test.ts` | concurrent emulator writer | niskie | concurrency integration |
| 44 | Import planu nie alignuje IDs | naprawiony | sanitizer + resolve days względem cykli | `workout-import-restore.test.ts` | legacy backup round-trip | niskie | rules/emulator integration |
| 45 | CSV cycle pusty endDate | naprawiony | `endDate || today` | `workout-export-range.test.ts` | UI/future imported workout | niskie | dialog test |
| 46 | Legacy access restore → pending | naprawiony | Functions security/registration legacy handling | `functions-security.test.ts` | callable + rules legacy doc | niskie | emulator integration |
| 47 | Zakup bez entitlementu = cisza | naprawiony | refresh + informacyjny toast w Paywall | `paywall-purchase-feedback.test.tsx` | RC sandbox misconfig | niskie | purchase smoke |
| 48 | Consent CSV obcięty 10k | naprawiony | pełna paginacja `startAfter` | `consents-csv.test.ts` | emulator >page size | niskie | admin integration |
| 49 | Trainer email case-sensitive | naprawiony | trim/lowercase compare/save | `email-workout-dialog.test.tsx` | brak | niskie | bez zmiany |
| 50 | SyncCenter ignoruje wynik eksportu | naprawiony | wynik, telemetry i toast w `SyncCenterCard` | `sync-center-export-draft.test.tsx` | native iOS share fail | niskie | export smoke |
| 51 | Throwing parseLocalDate | naprawiony | bezpieczne guardy i importer odrzuca złą datę | `weekly-local.test.ts`, `workout-import-parser.test.ts` | invalid Strava w UI | niskie | UI test aktywności |
| 52 | Rest state z innej sesji | naprawiony | stabilny scope `dayId:date`, mismatch cleanup | `rest-timer-controller.test.tsx` | plan A→Dashboard→adhoc B device | niskie | sequence smoke |
| 53 | Tap notification nie wraca do treningu | naprawiony | action listener + continuable target | `rest-notification.test.ts`, `active-workout-resume-notification-tap.test.tsx` | cold start z tapu iOS/Android | średnie | obowiązkowy device test |
| 54 | Cichy błąd custom exercise | naprawiony | `ExercisePicker` trzyma jedną pending Promise, po 8 s pokazuje status i sprawdza ten sam zapis; cancel wychodzi bez duplikatu | `exercise-picker.test.tsx` (pending, późny success, reject i stary flow) | real Firestore offline→online | niskie | device airplane-mode smoke |

Trzy zgłoszenia odrzucone w raporcie pozostają odrzucone: Apple button ma
`disabled`, gradient nawigacji nie przecina interaktywnej zawartości, a Analytics
Weekly nie tworzy efektywnie listenera ograniczonego do `recent`.

## Mapa obejść: eksport, storage i synchronizacja

### Eksport przed migracją

- Centralny `share-export.ts`: na webie `File` + Web Share API albo object URL i
  `<a download>`; na native również używał Web Share API. Gdy
  `navigator.canShare({files})` zwracał false, schodził do martwego downloadu w
  WKWebView.
- JSON: `DataManagement`; draft JSON: `SyncCenterCard`; CSV:
  `workout-csv-download`; PNG: workout/cycle/body compare.
- PDF miał dwie osobne implementacje Web Share/download w `Analytics.tsx` i
  `HistoryExportSheet.tsx`.
- Admin consent CSV nadal jest web/admin-only wyjątkiem z bezpośrednim downloadem;
  przed użyciem admina native wymaga przepięcia do helpera.

### Eksport po etapie E1

- Native: `@capacitor/filesystem` zapisuje odtwarzalny plik base64 wyłącznie w
  `Directory.Cache/strength-save-exports`, a `@capacitor/share` udostępnia URI
  `file://`. Stare pliki tego dedykowanego katalogu są sprzątane best-effort przy
  następnym eksporcie; źródłowe dane nie są modyfikowane.
- Web zachowuje dotychczasowy Web Share/download. Oficjalny Share Web ignoruje
  `files`, dlatego nie zastępuje tej gałęzi.
- JSON/CSV/PDF/PNG korzystają z jednego helpera; cancel nie daje sukcesu, błąd ma
  telemetry i widoczną ścieżkę wyjścia. Dodano FileTimestamp `C617.1` do iOS
  Privacy Manifest.

### Storage i synchronizacja

- Firestore web cache: IndexedDB (`persistentLocalCache`).
- Krytyczny draft: `strength-save-db/workoutDrafts` w IndexedDB oraz scoped
  localStorage fallback. Fallback zachowuje pełną tożsamość sesji, snapshot dnia,
  flagi finalizacji i `updatedEventId`; po odzyskaniu IDB nowsza intencja finalna
  nie jest cofana. Odczyty po resume wykonują jedną ponowną próbę na świeżym
  połączeniu, a druga porażka schodzi do fallbacku bez pętli.
- Sync queue: referencyjne wpisy w localStorage; treść pozostaje w drafcie. Utrata
  queue nie kasuje treningu, lecz może skasować retry/permanent-error metadata.
- Promotion tombstones mają pomocniczy cache w pamięci/localStorage, ale kanoniczny
  alias `provisional → remote` jest zapisany w tej samej transakcji IDB co promocja.
  Późny zapis i `missingDraft` recovery nie zależą już od trwałości localStorage.
- `AutoSyncOnReconnect`: startup, online, app-active, Capacitor Network, jawne
  żądanie WorkoutDay i timer 45 s foreground; timeout, blokada równoległości,
  backoff+jitter.
- Lekkie ustawienia są rozproszone w localStorage, część mirroruje
  `PreferenceSync` do Firestore.

## Audyt pięciu integracji Capacitor

| Plugin | Wersja zgodna z core 8.4 | Web | iOS / Android | Ryzyko danych | Decyzja i kolejność |
|---|---:|---|---|---|---|
| `@capacitor/share` | 8.0.1 | Web implementation nie przenosi `files`; zachować obecny fallback | natywny share `file://` | niskie dla źródła, średnie privacy temp | wdrożyć E1 razem z Filesystem |
| `@capacitor/filesystem` | 8.1.3 | web to IDB, nie Downloads — nie używać do web export | Cache bez storage permissions; Android FileProvider | niskie dla źródła, średnie memory/privacy | wdrożyć E1, tylko Cache; test dużych plików |
| `@capacitor/preferences` | 8.0.1 | webowy fallback localStorage | UserDefaults/SharedPreferences, string-only | niskie dla obecnego szkicu, wysokie dla draftu treningu | **wdrożony** dla lekkiego szkicu onboardingu; nigdy draft/queue treningu |
| `@capacitor/background-runner` | 3.0.0 | niedostępny | osobny JS bez DOM/IDB/LS; iOS harmonogram niegwarantowany | wysokie | **nie wdrażać** bez dowodu; najpierw instrumentacja resume |
| `@capacitor/screen-orientation` | 8.0.1 | lock bywa unavailable | runtime lock ma otwarte ryzyko safe-area i ograniczenia tabletów | niskie dane, średnie UX | nie wdrażać przed polityką orientacji i QA landscape |

Źródła oficjalne: [Share](https://capacitorjs.com/docs/apis/share),
[Filesystem](https://capacitorjs.com/docs/apis/filesystem),
[Preferences](https://capacitorjs.com/docs/apis/preferences),
[Background Runner](https://capacitorjs.com/docs/apis/background-runner),
[Screen Orientation](https://capacitorjs.com/docs/apis/screen-orientation).

### Kolejne fale pluginów 6–13

Pełny research, zachowanie platform, testy i scenariusze urządzeniowe:
`docs/RESEARCH-UX-TYPOGRAPHY-CAPACITOR-2026-08-27.md`.

- **Wdrożone w ograniczonym zakresie:** `@capacitor/camera` 8.2.3 jako natywne źródło
  pojedynczego screenshotu zgłoszenia błędu, z `appRestoredResult`, prywatnym recovery
  IDB i ponownym kodowaniem JPEG. Migracja zdjęć sylwetki z zachowaniem
  `PhotoCropDialog` pozostaje osobną falą; nie oddawać przycinania pluginowi bez
  parytetu UX.
- **Przed skalowaniem 1.0:** `@capacitor-firebase/crashlytics`, ale tylko razem z
  consentem, aktualizacją privacy disclosures, uploadem symboli i testem
  kontrolowanego crashu. Uzupełnia `client_errors`, nie zastępuje go.
- **Fala eksperymentalna:** Motion wyłącznie foreground PoC „telefon leży na
  ławce”; liczenie powtórzeń odrzucone jako niewiarygodne bez walidacji sprzętowej.
  TTS wyłącznie opt-in; nie gwarantuje cue po suspendzie JS, więc timer nadal
  opiera się na local notifications. BLE HR jako osobny produktowy PoC z privacy.
- **Odłożone/odrzucone przed launch:** Text Zoom nie może wymuszać 100% kosztem
  dostępności; Remote Config nie jest potrzebny bez pilnej flagi runtime;
  własny most HealthKit/Health Connect pozostaje; Background Runner nadal wymaga
  telemetrycznego dowodu, że foreground resume nie wystarcza.

## Plan etapowy, zależności i kryteria akceptacji

### E0 — wiarygodna baza i audyt (przed każdym fixem)

Zależności: brak. Kryteria: pełna macierz 54/54; zachowany dirty worktree;
wersje 1.0.0; brak RTK/SessionStart; czerwony test bazowej regresji i zielony test
celowany. Status: **ukończony**; pełną bramkę powtórzono po X47.

### E1 — bezpieczny eksport natywny (Share + Filesystem)

Zależności: E0. Kryteria automatyczne: jeden helper dla JSON/CSV/PDF/PNG; web bez
zmiany; native nigdy nie wywołuje anchor download; poprawne mapowanie
shared/aborted/failed; telemetry nie blokuje flow; cleanup dotyczy tylko własnego
katalogu Cache; Privacy Manifest lint; typecheck i testy eksportu zielone; `cap
sync` obie platformy. Kryteria urządzeniowe: iPhone i Android otwierają poprawny
JSON/CSV/PDF/PNG w Files/Drive/Mail; cancel milczy; powtórny share działa; chooser
resume nie gubi trasy/draftu. Status: **implementacja i bramki automatyczne
ukończone**; pozostaje smoke na fizycznym iOS/Android.

### E2 — trzy częściowe problemy i legacy clamp

Zależności: E1 stabilne. Kolejność: #40 (error + retry), #54 (offline pending bez
duplikatu), #35 (App Check recoverable UX), #36 (test legacy clamp i minimalny
helper). Każdy osobno: czerwony test → fix → zielony → stary flow → regresja.
Kryteria: każdy stan błędu ma akcję; brak mutacji historycznych danych; App Check
nie jest obchodzony; retry custom exercise jest idempotentny. Status:
**ukończony automatycznie** — #35/#36/#40/#54 mają testy czerwony→zielony i
regresje starego przepływu; App Check przeszedł również emulator Functions.

### E3 — trwałość queue/markerów i sekwencja treningowa

Zależności: E2. Kryteria: plan bazowy tylko rozszerzany przez draft; draft i sync
survive IDB reconnect, background, cold restart; queue/marker hardening nie usuwa
danych; automatyczny test całej sekwencji plan→wyjście→adhoc→powrót→zakończenie
→potwierdzony sync; wariant offline/resume oraz force-kill. Status: test sekwencji
do remote confirmation jest zielony w Chromium i WebKit. Wykrył i naprawił
dodatkowy blocker poza raportem: ACK checkpointu pozostawiał `pendingWriteId`, więc
final tej samej wersji był no-opem `already-applied` i chmura zachowywała
`completed:false`. `markDraftSynced` czyści teraz wyłącznie identyfikator
potwierdzonej próby; 178 testów draft/sync i oba E2E są zielone. Nadal pozostają
warianty device offline/force-kill. Trwały alias promocji jest zapisany atomowo
w IDB i ma regresje utraty localStorage, late-save oraz fresh-connection retry.

### E4 — Preferences dla lekkich danych (częściowo wdrożony)

Zależności: E3 i backup QA. Kryteria: tylko język/unit/accent/timery i inne małe
prefs; native-value-wins, legacy fallback, dual-write przez co najmniej jeden
release; żadnego `Preferences.clear`; web legacy keys bez zmiany; upgrade bez
uninstall zachowuje prefs, draft i queue byte-for-byte. Obecnie wdrożony jest
wersjonowany szkic onboardingu; draft i kolejka treningu pozostają świadomie w
warstwie IDB/localStorage z własnym recovery.

### E5 — product audit i końcowe bramki

Zależności: E1–E3. Kryteria automatyczne: aktualny audyt 390×844 dla active/new/
admin i landscape; `npm run test`, typecheck, lint, build; Functions i rules; E2E
Chromium i WebKit po świeżym Vite/cache; świeży build iOS/Android. Kryteria manualne:
smoke obu platform, background/resume, przerwanie treningu, eksport wszystkich
formatów, restart/recovery, notification tap cold start. Dopiero finalny raport
może rekomendować wydanie. Backend/web wdrożono po zielonych bramkach; publikacja
w publicznych sklepach nadal wymaga fizycznego QA i finalnej decyzji właściciela.

Status automatyczny po ostatniej zmianie: **ukończony dla bieżącego worktree**. Root Vitest 3712/3712 w 425 plikach,
route contract 12/12 oraz 195/195 renderów tras na
stanach kanonicznych, typecheck, lint (0 błędów, 15 zastanych warningów), build,
bundle budget, dist-smoke, pełny kontrakt offline i no-emoji 270 plików są zielone.
Functions mają 454 PASS/12 SKIP i zielony typecheck; Firestore Rules 282/282, a
Storage Rules 11/11. Fresh product audit X55 ma score 9,2, jeden czerwony blocker
zgody zdrowotnej i dwa pomarańczowe ryzyka: fizyczne QA oraz brak audytowalnego
snapshotu. Globalny kontrakt typografii przeszedł z RED 74 do
GREEN 0. Po osobnym restarcie Vite i wyczyszczeniu jego cache Chromium i WebKit
pokrywają po 295/295 scenariuszy. Finalny bundle mobilny został skopiowany do obu
projektów; Android `assembleDebug` oraz
iOS Simulator build+launch są zielone. Podpisane artefakty nadal poprzedzają najnowsze zmiany.
Automaty nie zastępują
fizycznych scenariuszy suspendu, powiadomień, Health ani systemowego share sheetu.

### E6 — Background Runner wyłącznie warunkowo

Zależności: telemetry resume i okres obserwacji. Próg: aktualny build ma sieć i
co najmniej dwa `app-active`, a final nadal pending >15 min bez permanent error.
Brak takich dowodów oznacza pozostawienie foreground resume. Runner wymagałby
nowego idempotentnego protokołu serwerowego; nie może czytać obecnego IDB/LS.

## Testy automatyczne wymagane do finalnej bramki

- Pełny Vitest, typecheck, lint, build.
- Functions: wszystkie testy, w tym reminder/digest/RevenueCat/security.
- Firestore/Storage rules na emulatorze, import/export i legacy access.
- Sekwencja plan→wyjście→adhoc→powrót→finish→remote confirmation.
- Draft: IDB fail/reconnect, fallback freshness, restart, tombstone race.
- Sync: resume/network/timer/cold restart/flapping, timeout, concurrency,
  idempotencja i permanent error exit.
- Eksport: byte-for-byte UTF-8 JSON/CSV, `%PDF-`, PNG magic, duży backup, cancel,
  write/share fail, cleanup scope, guard przeciw native anchor fallback.
- Regresje #35/#40/#54 i legacy #36 oraz ACK checkpoint→final tej samej wersji.
- E2E Chromium i WebKit w portrait i landscape; przed diagnozą masowych faili:
  restart Vite i usunięcie wyłącznie `node_modules/.vite`.

## Scenariusze realnego urządzenia

### Delta X67 — początkujący i słaby internet

- `/day` oraz start treningu korzystają z jednego generatora rozgrzewki v3.
  Nazwy i krótkie instrukcje są w lokalnym bundlu PL/EN; lista legacy z
  pajacykami nie jest już renderowana.
- Wykroki mogą zostać zakończone z powtórzeniami i `0 kg`, również przez
  auto-domknięcie przy `Zakończ trening`. Zwykłe serie ciężarowe zachowują
  dotychczasowy wymóg dodatniej wagi.
- Avatar ma jedną prywatną miniaturę 256 px per UID w `LibraryNoCloud`; pełne
  filmy ćwiczeń pozostają strumieniowane. Awaria animacji daje lokalny opis
  techniki zamiast pustego/czarnego modala.
- Celowane dowody po X67: 86/86 rozgrzewka/karta, 104/104 tracking/0 kg/sync,
  220/220 route/i18n/avatar bootstrap. Pełna bramka: Vitest 3804/3804,
  Functions 504 PASS/12 SKIP, Firestore 309/309, Storage 33/33, typecheck, lint,
  build, budget, dist/offline/no-emoji, Chromium i WebKit po 297/297. Świeży
  `mobile:sync` ma 18 pluginów; Android debug oraz iOS Simulator build/install/
  launch są zielone. Produkcyjny iOS release preflight dla 1.0.0 przechodzi.
  Testy fizyczne wykonuje właściciel.

1. Plan→wyjście→szybki trening→powrót (pełna lista)→finish→sync.
2. Offline trening, ekran zgaszony, JS wstrzymany, sieć wraca, unlock→auto-sync.
3. Force-kill z aktywnym draftem i pending final, restart w airplane mode.
4. Timer/rest: foreground/background, silent switch, notification tap i cold start.
5. JSON/CSV/PDF/PNG: share/save/open/validate, cancel, ponowienie, brak success po
   błędzie; Android receiver czyta URI.
6. Obrót 844×390 na WorkoutDay/Dashboard/dialogach/share; safe-area, keyboard,
   scroll i RestBar; iPad multitasking i Android 16 tablet/foldable.
7. Social auth cancel/collision, email verification reconnect, App Check blocked.
8. RevenueCat sandbox billing issue/retry i Garmin expiry.
9. Zgłoszenie błędu na iOS/Android: klawiatura nie zasłania X/CTA, Photo Picker cancel,
   wybór zdjęcia, Android process death/restart, offline retry, odbiór e-maila i triage
   w panelu; zweryfikować brak EXIF/GPS w pobranym pliku.
10. Rozgrzewka PL/EN na `/day` i przy starcie; instrukcje początkującego, wykroki
    `10 powt. / 0 kg`, zakończenie, force-kill, restart offline i późniejszy sync.
11. Avatar: uruchom online, potwierdź miniaturę, force-kill, włącz airplane mode,
    uruchom ponownie; zdjęcie lub bezpieczne inicjały bez migania uszkodzonego URL.
12. Animacja ćwiczenia: zerwij sieć w otwartym podglądzie; zamiast czarnego ekranu
    ma pojawić się lokalna instrukcja, a trening i jego draft pozostają dostępne.

## Jednoznaczne blockery publicznego wydania

1. Granica health v2 jest kompletna lokalnie, lecz wymaga bezpiecznej kolejności
   wdrożenia: najpierw Functions (`syncWorkoutV2`, `restoreWorkoutBackupV3`) i Rules,
   potem syntetyczny save/read/restore bez danych realnego użytkownika, a dopiero
   później klient. Read-only dry-run ma 372/372 transformacje zablokowane i 0
   mutacji; migracja wymaga zatwierdzonego schematu, backupu oraz jawnej aktualnej
   zgody każdego kwalifikowanego rekordu. Nie wolno automatycznie migrować danych.
2. Brak fizycznego smoke iOS/Android dla finalnego źródła: eksport JSON/CSV/PDF/PNG,
   share cancel/retry,
   screen-off→network-return→resume, notification tap, przerwanie treningu i
   odzyskanie danych po force-kill/restarcie. Emulator potwierdza cold launch, nie
   potwierdza prawdziwego suspendu WKWebView ani systemowych odbiorców share.
3. Subskrypcja e-mail alarmów reputacji SNS dla `contact@strengthsave.app` ma status
   `PendingConfirmation`; same alarmy bounce 5% i complaint 0,1% są aktywne i
   według read-only weryfikacji 2026-08-28 mają stan `OK`. HTTPS eventów SES jest
   potwierdzony; OPEN/CLICK pozostają włączone.
4. Rotacja ujawnionego wcześniej sekretu Stravy u dostawcy pozostaje operacją
   zewnętrzną. Wszystkie zwykłe zmienne `STRAVA_*`/`OPENAI_API_KEY` zostały już
   usunięte z pięciu aktywnych funkcji; pozostają wyłącznie bindingi Secret Managera.
   Read-only metadata nadal pokazuje dokładnie jedną aktywną wersję v1 z 2026-03-09.
5. Następny TestFlight z kandydatem X68 wymaga podniesienia wyłącznie sześciu
   wystąpień `CURRENT_PROJECT_VERSION` z 130 do 131 i ponownego podpisanego
   preflightu. Build 130 jest VALID/APPROVED, ale nie zawiera całego bieżącego
   kandydata. Android release versionCode 42 również jest starszy od bieżących zmian;
   następny artefakt wymaga versionCode 43 przy niezmienionym versionName 1.0.0.
   HealthKit/Health Connect,
   Camera process recovery, Google/Apple auth return i billing sandbox nadal wymagają
   realnego urządzenia.
6. CDN animacji ćwiczeń jest zawieszony i ma nieprawidłowy certyfikat dla
   `media.gjasionowicz.pl`. Aplikacja bez konfiguracji failuje bezpiecznie do
   opisów/placeholderów, ale ponowne włączenie animacji wymaga sprawnego hosta,
   ważnego TLS i syntetycznego smoke JPG/MP4.
7. Nie ma podpisu dostępności 200% na realnych urządzeniach. Oficjalny
   `@capacitor/text-zoom` obsługuje Android, a iOS mapuje preferowaną Dynamic Type
   na skalę CSS; proxy 200% przechodzi w Chromium/WebKit. Nadal trzeba potwierdzić
   reflow, VoiceOver i TalkBack na fizycznym iOS/Android.
8. Bieżący worktree nadal nie jest zamrożonym commitem. Końcowy manifest musi być
   wygenerowany po tej dokumentacji; przed buildami 131/43 trzeba przypisać wyniki
   do jednego przejrzanego commita i po każdej zmianie ponowić manifest oraz bramki.

Naprawy #35/#36/#40/#54, trwały alias promocji oraz pełny test remote confirmation
nie są już blockerami. Formularz i panel zgłoszeń zachowują swoje zielone testy,
emulator Functions ma 12/12, Firestore 310/310 i Storage 42/42. Bieżący Vitest ma
3822/3822 w 438 plikach. Fresh audit X68 ma score 9,5 i jawnie uwzględnia brak
wdrożenia granicy health oraz brak fizycznego QA. Świeży pełny Chromium + WebKit
ma 594/594 na bieżącym worktree. Audyt zależności root/Functions ma 0 findings;
`audit fix --force` pozostaje zakazany. Androidowy kontrast pasków systemowych po
API 35 został naprawiony przez wbudowane Capacitor 8 `SystemBars` i potwierdzony
testem kontraktu oraz screenshotem po świeżej reinstalacji APK.

Ostatni kontrolowany deploy backendu jest zsynchronizowany z commitem `c1f21313`:
Firestore Rules, Storage Rules i 67 Functions zostały wdrożone. Web został później
opublikowany z niezacommitowanego worktree po `f09e559b`, jak opisano w incydencie
X50; nie wolno przypisywać mu proweniencji `c1f21313`. Aktualne konfiguracje backendu nie zawierają bindingu
`RESEND_API_KEY`; ostatnia wersja sekretu Resend została zniszczona. Syntetyczna
wiadomość do AWS Mailbox Simulator w konfiguracji `strengthsave` utworzyła w
`email_events` dokładnie zdarzenia `Send` i `Delivery`, bez danych realnego usera.

Publiczna polityka prywatności 2.1 jest już wdrożona na `strengthsave.app` i opisuje
avatar, screenshoty, administratora, Amazon SES, OPEN/CLICK, IP/user-agent/link oraz
retencję 180 dni/24 miesiące. SES ma production access, DKIM `SUCCESS`, SPF/DMARC,
TLS `REQUIRE`, domyślny i jawny configuration set, quota 50 000/dzień i 14/s oraz
least-privilege IAM. DMARC `p=none` i brak custom MAIL FROM są kontrolowanym
hardeningiem po okresie obserwacji, nie ukrytym brakiem konfiguracji.

Bieżąca warstwa web X50 została opublikowana przedwcześnie w opisanym incydencie i
następnie zweryfikowana smoke'em oraz pełnymi bramkami. Nie jest jednak przypisana
do kompletnego commita źródłowego. Podpisane buildy 130/42 nie zawierają całego X50.
