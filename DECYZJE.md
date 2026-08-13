# LOG DECYZJI - Strength Save

> Wszystkie ważne decyzje projektowe w jednym miejscu

---

**Data utworzenia:** 2026-01-28
**Ostatnia aktualizacja:** 2026-08-13 (WYDANIE FIX-A: stabilność na prod, iOS 101, AAB v17)

---

## DECYZJE

### 2026-08-13: WYDANIE FIX-A — stabilność przed launchem (zgłoszenia z treningu 2026-08-13)

**Co:** Cztery naprawy stabilności + pełny release train (web + iOS 101 z Watch + Android AAB v17).

1. **A-T1 crash-guard Firestore (c357bbeb):** po `INTERNAL ASSERTION FAILED` (screen usera E-RM6GU,
   b815 po resume WKWebView) SDK jest martwe do końca życia strony. Globalny guard
   (unhandledrejection/error, instalacja w main.tsx przed renderem) robi kontrolowany reload
   z anti-loopem raz na 2 min; draft przeżywa w IDB/localStorage. ErrorBoundary i
   RouteCrashFallback przy asercji pokazują „Uruchom ponownie" i robią hard reload
   (nawigacja SPA nie wskrzesza SDK — root cause „Wróć na Dashboard" nic nie naprawiał).
2. **A-T2 releaseBodyLocks (8d7d3dc8):** awaryjny unmount otwartego Radix Sheet zostawiał
   na body pointer-events:none + scroll-lock (mechanizm regresji b.92, „czarny ekran po
   Twoich liczbach"). ErrorBoundary w componentDidCatch zdejmuje blokady i osierocone
   overlaye — fallback zawsze klikalny. Test niezmiennika w error-boundary.test.tsx.
3. **A-T3 przycisk zakończenia (e28ac0fa):** press-and-hold (ring 900 ms) zawodził na
   siłowni — drgnięcie palca = onPointerLeave anulował hold (timer nabił 1:18:44).
   Powrót do zwykłego przycisku + istniejące potwierdzenie [Anuluj]/[Potwierdź].
   HoldToFinishButton usunięty.
4. **A-T4 błąd zapisu tylko po totalnym failu (994f1e81):** czerwony „Błąd zapisu" leciał
   z KAŻDEGO wyjątku saveActiveDraft, także gdy fallback localStorage uratował dane.
   Teraz: DraftSaveTotalFailure('fallback') tylko gdy IDB + retry + localStorage padły;
   1. fail = cichy retry po 3 s, czerwony od 2. z rzędu; stage/streak do client_errors
   (code draft-save-total-failure — whitelist eventów telemetrii w rules nietknięta).

**Weryfikacja:** 1647 testów jednostkowych PASS, typecheck, lint, build, check:no-emoji;
pełne e2e 394 PASS na świeżym vite (sekwencja start→wyjście→powrót→zakończ→sync pokryta
specami resume-after-kill/full-app/continue-workout). Web live: index-CpaMokif.js na
app.strengthsave.app. iOS build 101 (MARKETING_VERSION 1.0.0): upload OK, obie grupy
TestFlight (204/204), whatsNew 200, Beta App Review APPROVED, Watch/StrengthWatch.app
w IPA (unzip -l). Android AAB versionCode 17: jar verified,
SHA-256 7a38d0b54ee56f913da5c58915ab88d20f2d0da3da513713d6dde9cf66eeaf9b.

### 2026-08-13: PRO A-E — zbiorcze zamknięcie pakietu (5 wydań w jedną pętlę /loop)

**Co:** pełny pakiet PRO wykonany autonomicznie od A do Z w jednej pętli /loop (2026-08-12 wieczór → 2026-08-13 noc): 5 planów, 21 tasków TDD, 5 pełnych wydań (web + iOS TestFlight z Watch + Android AAB), sekcja Zamknięcie (audyt Garmin/Watch). Szczegóły per wydanie w 5 wpisach niżej (A: de-emojizacja + bramka; B: header/inbox/nav; C: moment WOW; D: gamifikacja; E: Dashboard hero-first). Kamień **M55** w PLAN.md.

**Dlaczego:** kontrakt PRO = jakość wykonania jako wyróżnik (wizja: zero socjalu, gamifikacja tylko wokół realnego progresu); wszystkie 5 planów to warstwa prezentacji — zero zmian modelu danych, rules, functions i kontraktów urządzeń.

**Root cause'y przekrojowe (lekcje):** (1) guard i18n Z168 skanuje `components/` — testy komponentów z polskimi diakrytykami muszą żyć w `src/test/` (konwencja repo, 6 nowych testów tam trafiło); (2) TOAST_REMOVE_DELAY=1000000: toast wisi do zamknięcia i przechwytuje kliknięcia w menu (pre-existing flake webkit, fix testowy z jawnym dismissem); (3) trzy e2e znały tylko „Dzisiaj wolne" — od Runna B2 dzień wolny to „Dzień regeneracji"; pękły dopiero przy zmianie daty na czwartek (datozależność, wszystkie trzy wzorce rozszerzone); (4) mock ConfettiBurst wołający onDone w renderze unieważniał własne asercje; (5) vi.mock hoisting + transitive `@/lib/firebase` w testach stron (pułapki z memory, rozwiązane vi.hoisted + mock).

**Weryfikacja końcowa:** unit 1616→**1642** (26 nowych testów), e2e 392→**394** (nowy dashboard-order), typecheck/lint/build/`check:no-emoji` zielone przy każdym wydaniu; Garmin: zero plików kontraktu CIQ dotkniętych (adnotacja w garmin/README.md); Watch: StrengthWatch.app w IPA wszystkich 5 buildów, 36/36 testów kontraktu. Artefakty: web `index-De466VIE.js` (live), iOS **96-100** (wszystkie APPROVED obie grupy), AAB **v12-v16** (wszystkie `jar verified`). NASTĘPNY bump iOS = 101, versionCode = 17.

**Po stronie usera:** testy urządzeniowe 5 wydań (scenariusze w wpisach per wydanie); upload AAB do Play po weryfikacji konta Google.

### 2026-08-13: PRO wydanie E — Dashboard hero-first, hierarchia zamiast ściany kart (WYDANE)

**Co (plan `docs/PLAN-PRO-E-2026-08-12.md`, wykonanie przez /loop wg `docs/PROMPT-WDROZENIE-PRO.md`, commity `2a415f2a`→ bump v16):**
(T1) `DashboardStatusSlot`: prezentacyjny slot komunikatów stanu — renderuje wyłącznie najwyższy priorytet, resztę za togglem „Pozostałe komunikaty (n)"; (T2) 4 banery (sync/offline 100, urlop 80, tryb „nie na 100%" 70, przedłużenie planu 60) przeniesione 1:1 do slotu — warunki logiczne nietknięte; (T3) hero-first: karta dnia (trening/ukończony/regeneracja, wrapper `dash-hero`) zaraz pod powitaniem, slot za nią, ProUpsellBanner zepchnięty pod kafle statystyk; sekcje z data-testid + nowy e2e `dashboard-order.spec.ts` pilnujący kolejności pionowej; (T4) karta „Twój plan" bez listy dni (zostaje meta + progress + CTA; dni żyją w WeekCard i sekcji „Plan tygodnia" — koniec potrójnego powtórzenia; osierocone dayColors usunięte).

**Dlaczego:** user po otwarciu apki w 2 sekundy wie, co dziś robi (lekcja Runna v3: ekran dnia to plan, nie hub); ściana 4 banerów nad treningiem zamieniona na jeden świadomie rozwijany slot; upsell nie konkuruje z treningiem.

**Root cause napotkany (3 wystąpienia tej samej pułapki):** asercje e2e karty dnia (`full-app`, `ui-improvements`, `critical`) znały tylko „Dzisiaj wolne", a od Runna p.1 B2 dzień wolny to karta „Dzień regeneracji" — pękły dopiero, gdy data przeskoczyła na czwartek (dzień wolny w mocku). Datozależność, nie regresja refaktoru; wszystkie trzy wzorce rozszerzone.

**Niezmiennik (zasada 5, testowane):** wszystkie elementy Dashboardu osiągalne — zmieniona wyłącznie kolejność i zwijanie; testidy `today-completed-card`/`recovery-card`/`week-card` zachowane dla istniejących kontraktów.

**Weryfikacja (wszystko zielone):** unit 1642/1642 (214 plików; nowe: slot 3), typecheck, lint, build, `check:no-emoji` (171), e2e pełne 392/392 + critical po fixie 18/18 (nowy dashboard-order 2/2; jedyny inny fail = flake wyścigu edycji cardio, PASS przy retry).

**Deploy (pre-autoryzowany, WYKONANY):** web live `index-De466VIE.js` (Published, hash zweryfikowany); iOS build **100** upload OK, `StrengthWatch.app` w IPA, obie grupy TestFlight (204/204, whatsNew 200), betaReviewState **APPROVED**; Android AAB **versionCode 16** BUILD SUCCESSFUL, `jar verified`, SHA-256 `2d7150e6a250e0850b04c4c222adc21c19e2b12bd87337420b1a12b176814802`. Wersje marketingowe 1.0.0 bez zmian. NASTĘPNY bump iOS = 101, versionCode = 17.

**Po stronie usera:** scenariusz sekwencji na urządzeniu: start treningu z hero-karty → wyjście → szybki trening → powrót → zakończenie → sync; Dashboard z banerami (offline + urlop naraz → slot pokazuje offline, toggle ujawnia urlop).

### 2026-08-13: PRO wydanie D — gamifikacja progresu, duma na wierzch (WYDANE)

**Co (plan `docs/PLAN-PRO-D-2026-08-12.md`, wykonanie przez /loop wg `docs/PROMPT-WDROZENIE-PRO.md`, commity `4dbbc37b`→ bump v15):**
(T1) `src/components/kinetic/AchievementBadge.tsx`: jeden kształt odznaki (heksagon CSS clip-path, bez SVG assetów), tier przez materiał (gradienty brąz/srebro/złoto/platyna + tusz per tier), ghost = ten sam kształt 8% krycia bez kłódki, rozmiary sm/md, opcjonalny pasek postępu; (T2) Postępy: kamienie milowe i odznaki specjalne na AchievementBadge (`tierForIndex` w achievements-utils: [b,b,s,g,p] z pozycji progu; specjalne w jednolitym srebrze; Lock usunięty); (T3) Profil: pasek postępu poziomu pod chipami (pola progress/next z computeTier, dotąd ignorowane; elite bez paska); (T4) nieużywany `TrainingHeatmap` osadzony na Postępach (własny Card „Mapa treningowa" + wybór roku; Strava poza zakresem ekranu); (T5) `diffMilestones` (czysta funkcja) + emisja wpisu `badge` do inboxa przy finalizacji treningu (statystyki przed/po z załadowanej listy, zero odczytów; kategorie workouts+tonnage — records wymaga pipeline'u Postępów, a PR-y i tak lądują jako `pr`); (T6) sekcja dumy w Profilu: 3 najwyższe zdobyte odznaki z agregatu (workoutCount/totalTonnageKg, fallback okno recent), zero odznak = brak sekcji, link „Wszystkie" → /achievements.

**Dlaczego:** zgodnie z wizją produktu (gamifikacja tylko wokół realnego progresu): score tieru bez zmian (treningi + 2×PR), zero punktów za czynności obsługowe, jeden kształt odznaki zamiast tęczy kafli z kłódkami; duma widoczna w Profilu bez wchodzenia w Postępy.

**Root cause'y napotkane:** vi.mock hoisting (fixture w vi.hoisted) i transitive import `@/lib/firebase` wywracający jsdom (Auth INTERNAL ASSERTION) — obie pułapki znane z memory projektu, rozwiązane mockami; `Milestone.progress` jest 0-100, komponent przyjmuje 0-1 (konwersja przy renderze).

**Weryfikacja (wszystko zielone):** unit 1639/1639 (213 plików; nowe: badge 2, diff 2, heatmapa 1, pride 1, tier-progress 1), typecheck, lint, build, `check:no-emoji` (170), e2e pełne **392/392** (świeży vite, 4.2 min).

**Deploy (pre-autoryzowany, WYKONANY):** web live `index-DOy_Icwi.js` (Published, hash zweryfikowany); iOS build **99** upload OK, `StrengthWatch.app` w IPA, obie grupy TestFlight (204/204, whatsNew 200), betaReviewState **APPROVED**; Android AAB **versionCode 15** BUILD SUCCESSFUL, `jar verified`, SHA-256 `b5ba79b3448ddbaaa37e5c12940435f1846eef2c89896d53fee63a4b5dc90a0c`. Wersje marketingowe 1.0.0 bez zmian. NASTĘPNY bump iOS = 100, versionCode = 16.

**Po stronie usera:** wizualnie na urządzeniu: Postępy (odznaki materiałowe + ghost + heatmapa, dark mode), Profil (pasek poziomu, sekcja dumy), dzwonek po treningu z kamieniem milowym (wpis „Nowa odznaka").

### 2026-08-12: PRO wydanie C — moment WOW po treningu (WYDANE)

**Co (plan `docs/PLAN-PRO-C-2026-08-12.md`, wykonanie przez /loop wg `docs/PROMPT-WDROZENIE-PRO.md`, commity `2935075a`→`8d9b442b`):**
(T1) każdy PR w podsumowaniu z deltą względem poprzedniego rekordu (`formatPRDelta` w pr-utils, "+5 kg"/"+2"/"+30s"; pierwszy rekord bez bazy = bez delty); (T2) karta metryk z hierarchią hero: tonaż text-5xl jako jedyna dominująca liczba (wzorzec WHOOP), czas+serie drugorzędne w rzędzie; stara karta „Trening ukończony" z siatką 2×2 USUNIĘTA (dublowała metryki) — zostaje wyłącznie baner sync-pending (status ≠ gratulacja, zasada 6), licznik ćwiczeń w nagłówku listy („Ćwiczenia (N)"); (T3) confetti tylko dla rzadkich momentów: prop `bigMoment ?? prs.length > 0` (furtka pod kamienie milowe PRO-D), zwykły trening = czysty ekran + AutoAdvance min(celebrationMs,1200); Dashboard confetti wyłącznie `?welcome=1` (po `?celebrate=1` zostaje highlight + „+1" w headerze); (T4) toast live PR z deltą (bestBefore w stanie pending — ten sam baseline max(historia, backfill) co detekcja), haptyka już była.

**Dlaczego:** jedna liczba czytelna z wyciągniętej ręki zamiast trzech równych kolumn i drugiej karty z czterema; delta odpowiada na "o ile lepiej", nie tylko "lepiej"; confetti codziennie = confetti nigdy (inflacja nagrody).

**Root cause'y napotkane:** test polityki confetti z planu sam się unieważniał (mock ConfettiBurst wołał onDone synchronicznie w renderze → setStage wyrzucał confetti z DOM przed asercją; fix: mock bez onDone); AutoAdvance z planu miał sztywne 1200 ms, a stare testy sekwencji przekazują celebrationMs=30 i czekają waitForem 1000 ms (fix: min(celebrationMs, 1200)).

**Weryfikacja (wszystko zielone):** unit 1632/1632 (209 plików; nowe: delta 2, confetti 2, formatPRValue z B), typecheck, lint, build, `check:no-emoji` (169), e2e pełne **392/392** (świeży vite, 4.2 min).

**Deploy (pre-autoryzowany, WYKONANY):** web live `index-DaIzuDtB.js` (Published, hash zweryfikowany); iOS build **98** upload OK, `StrengthWatch.app` w IPA, obie grupy TestFlight (204/204, whatsNew 200), betaReviewState **APPROVED**; Android AAB **versionCode 14** BUILD SUCCESSFUL, `jar verified`, SHA-256 `961319d2045e9da4e4b7c8180cc5256871643f939c19ff56d53d2c5dd984c792`. Wersje marketingowe 1.0.0 bez zmian. NASTĘPNY bump iOS = 99, versionCode = 15.

**Po stronie usera:** scenariusz sekwencji na iPhone: serie z live PR (wibracja + toast z deltą) → wyjście → powrót → zakończenie bez PR (czysty ekran, bez confetti) i z PR (confetti + delty) → hero-tonaż → Dashboard bez drugiego confetti.

### 2026-08-12: PRO wydanie B — avatar w headerze, centrum powiadomień, Postępy w bottom nav (WYDANE)

**Co (plan `docs/PLAN-PRO-B-2026-08-12.md`, wykonanie przez /loop wg `docs/PROMPT-WDROZENIE-PRO.md`, commity `7f30bfa0`→`55de59da`):**
(T1) czysty moduł `src/lib/notification-inbox.ts`: lokalny inbox per uid na localStorage (limit 50, wersjonowany klucz `ss_inbox_v1_*`, odporny na uszkodzony JSON, event `ss-inbox-change`), zero sieci; (T2) `NotificationBell` w headerze: kropka nieprzeczytanych, sheet Radix ZAWSZE zamontowany i sterowany wyłącznie `open` (lekcja builda 92), otwarcie = markAllRead, empty state, ikony per typ; (T3) avatar w headerze (zdjęcie/inicjały) jako jedyna mobilna trasa do Profilu, 5. slot bottom nav = Postępy (`/achievements`, labelKey `nav.progress` — w sidebarze etykieta zmienia się z 'Osiągnięcia' na 'Postępy'), `rootPaths` = {/, /plan, /history, /exercises, /achievements, /analytics} (Profil dostaje strzałkę wstecz); (T4) po zakończeniu treningu każdy PR trafia do inboxa (obok toastu): `formatPRValue` wyniesiony do `pr-utils` i współdzielony z podsumowaniem treningu.

**Dlaczego:** wzorzec rynkowy (avatar = Profil, dzwonek = centrum zdarzeń) uwalnia 5. slot nawigacji dla Postępów (fundament pod PRO-D gamifikację); inbox lokalny bo header renderuje się wszędzie i nie może trzymać szerokich listenerów Firestore (Z216).

**Weryfikacja (wszystko zielone):** unit 1628/1628 (207 plików; nowe: inbox 4, bell 3, nav 1, formatPRValue 3), typecheck, lint, build, `check:no-emoji` (169 plików), e2e pełne: 389/392 + 3 oczekiwane aktualizacje speców po T3 (sidebar 'Postępy', achievements legalnie w bottom nav — `929a1a96`), po nich 8/8; mobile-nav-reachability przepisany na nowy niezmiennik (Profil przez avatar).

**Deploy (pre-autoryzowany, WYKONANY):** web live `index-GODEYLhM.js` (Published, hash zweryfikowany na app.strengthsave.app); iOS build **97** upload OK, `StrengthWatch.app` w IPA, obie grupy TestFlight (HTTP 204/204, whatsNew 200), betaReviewState **APPROVED**; Android AAB **versionCode 13** BUILD SUCCESSFUL, `jar verified`, SHA-256 `a50bf1f19bcb2bbd907fe522a5307777f24deec078974e5e12521c4ad1dd7011` (upload do Play poza zakresem). Wersje marketingowe 1.0.0 bez zmian. NASTĘPNY bump iOS = 98, versionCode = 14.

**Po stronie usera:** scenariusz sekwencji na urządzeniu: trening z PR → zakończ → Dashboard: kropka na dzwonku → wpis PR w inboxie → zamknij (kropka znika); avatar → Profil (strzałka wstecz); zakładka Postępy; start z planu → wyjście → powrót (nic nie zniknęło).

### 2026-08-12: PRO wydanie A — de-emojizacja chrome UI + bramka check:no-emoji (WYDANE)

**Co (plan `docs/PLAN-PRO-A-2026-08-12.md`, wykonanie przez /loop wg `docs/PROMPT-WDROZENIE-PRO.md`, commity `9ed4b3b5`→`06a106a2`):**
(T1) wspólna mapa `src/lib/activity-icons.ts` (typ aktywności → ikona lucide, fallback Medal) zastępuje 3 zduplikowane mapy emoji; (T2) TrainingDayCard: ✅❌🏋️ → CheckCircle2/XCircle/Dumbbell, tło missed `bg-destructive/10` (zasada 8); (T3) badge'e ExerciseCard: 🎯📅⬆⬇↺🏆 → Target/CalendarCheck/TrendingUp/TrendingDown/RotateCcw/Trophy; (T4) DayPlan (pusty stan, rozgrzewka, zasady, stretching) + karta regeneracji Dashboardu: 💪🧘🔥⚡⏱️🔄 → Dumbbell/Leaf/Flame/Zap/Timer/Repeat; (T5) StravaActivityCard/Detail/AddCardioDialog na wspólnej mapie, ❤️→Heart, ↗→MoveUpRight, 👍 kudos → sama liczba, interfejs CardioPR BEZ pola emoji (CardioPersonalBests mapuje kategorię na Footprints/Ruler/Mountain/Medal); (T6) toasty PR w obu locale bez 🏆, badge Analytics Trophy + `text-fitness-warning` (fix kontrastu po text-yellow-700), puste stany Strava i RacePredictor na Footprints; (T7) share card: 💪 usunięty, 🏆 → typograficzny "PR ·"; (T8) trwała bramka `npm run check:no-emoji` (skan components/pages/i18n/share-utils ze stripem komentarzy jak guard i18n Z168, whitelist tylko Analytics-copy-do-schowka) + domknięte 17 resztek (nagłówki ✓ gridu serii → Check, TrainingPlan ⚡⏱️ → Zap/Timer, 🏠 indoor → Home, import '✓'→'OK', i18n bez ✓/💪).

**Dlaczego:** kontrakt PRO: chrome UI bez emoji (spójny język ikon lucide, kontrola koloru wg zasady 8: kolor tylko gdy niesie informację), emoji zostaje wyłącznie w treści kopiowanej do schowka i nierenderowanych polach danych. Bramka pilnuje regresji na zawsze.

**Root cause'y napotkane:** (1) guard i18n Z168 skanuje `components/` — test komponentu z polskimi diakrytykami musi żyć w `src/test/` (konwencja repo); (2) pre-existing flake e2e webkit: toast autostartu (TOAST_REMOVE_DELAY=1000000, wisi do zamknięcia) przechwytywał klik w menuitem "Zamień ćwiczenie" — pada IDENTYCZNIE na commicie sprzed planu A (`88b88cdc`), więc nie regresja; fix testowy: czekaj na toast i zamknij przed otwarciem menu (`2fe333a0`).

**Weryfikacja (wszystko zielone):** unit 1617/1617 (204 pliki), typecheck, lint, build, `check:no-emoji` OK (168 plików), e2e pełne 392/392 po stabilizacji (świeży vite, 4.4 min).

**Deploy (pre-autoryzowany, WYKONANY):** web live `index-iHRC0bdg.js` (gh-pages Published, hash zweryfikowany na app.strengthsave.app); iOS build **96** upload OK, `StrengthWatch.app` w IPA, obie grupy TestFlight (HTTP 204/204, whatsNew 200), betaReviewState **APPROVED** (dystrybucję zrobił zintegrowany krok [2/2] release-ios.sh, odpowiednik testflight_external.py — nie dublowano zgłoszenia); Android AAB **versionCode 12** BUILD SUCCESSFUL, `jar verified`, SHA-256 `e5f133838dda0e247c2d20d100c0d5c3437efe48cd92c15861f6f04bc8269b47` (upload do Play poza zakresem — konto czeka na weryfikację Google). MARKETING_VERSION/versionName = 1.0.0 bez zmian. NASTĘPNY bump iOS = 97, versionCode = 13.

**Po stronie usera:** scenariusz urządzeniowy wydania A: Dashboard → DayPlan → trening (badge'e) → zakończenie (toast rekordu) → karta udostępniania (4 szablony) — zero emoji na każdym kroku.

### 2026-08-12: Runna pakiet 1, WYDANIE 2 (etap C: odstępstwa od planu) — kroki 12-17 w kodzie

**Co (spec `docs/superpowers/specs/2026-08-11-runna-pakiet-1-design.md`, wykonanie przez /loop wg `docs/PROMPT-WDROZENIE-RUNNA-PAKIET-1.md`, commity `81fac5c1`→`2f43ba68` + krok 17):**

*Etap C — życie rozjeżdża plan:* (12) **Pomiń trening** (C1): stan skipped per data (pole na dokumencie planu, rules hasOnly + testy, mapper sprawdzony), wejścia z menu karty dnia i z traya, odwracalne, wygaszony checkmark w karcie tygodnia, silnik neutralny wobec skipa; (13) **tray zaległości** (C2, wersja minimalna): `detectLapse` (nieukończona/nieodpuszczona sesja starsza niż 2 dni w oknie 14 dni ALBO pusty miniony tydzień planu; świeże 1-2 dni zostają w banerze przełożenia), `LapseTray` bottom sheet w tonie neutralnym [Odpuść]/[Przełóż]/[Kontynuuj od dziś] (masowe odpuszczenie zaległych dat JEDNYM zapisem pola + comeback silnika: przerwa 14+ dni od ćwiczenia = propozycja -10%, `deload.break`), pamięć odrzucenia per zaległość (localStorage), cisza przy żywym drafcie, sheet domykany PRZED mutacją (lekcja b.92); (14) **tryb "nie na 100%"** (C3): `ReducedMode` 3-14 dni (lżej -20% / tylko główne boje / pauza), propozycje liczone od BAZY sprzed trybu, rampa powrotna 85% → 92% → 100% per sesja ćwiczenia, badge na Dashboardzie (stan jawny, wyłączalny w każdej chwili), push przed końcem trybu (functions + testy), kolizja z deloadem: tryb WYGRYWA, nic się nie dubluje; (15) **tryb urlopu** (C4): deklaracja z datami 3-21 dni, deload cyklu przesuwa się na tydzień wyjazdu (przerwa PEŁNI ROLĘ deloadu), cykl wydłuża się o pełne tygodnie (id dni bez zmian — niezmiennik X19), rampa jak C3, push powrotny, anulowanie przed startem i w trakcie, jeden tryb naraz (UI blokuje drugi); (16) **ad-hoc zasila silnik** (C5): audyt — tonaż tygodnia już działał (week-card liczy wszystkie sesje); luka: cały silnik matchował po `exerciseId`, a ćwiczenia ad-hoc mają syntetyczne `adhoc-ex-<slug>` + snapshot nazwy; domknięcie: `matchesExerciseEntry` (id LUB identyczny snapshot nazwy, gdy w parze uczestniczy strona ad-hoc — planowe wpisy między cyklami bez zmian) wpięty w historię (`getExerciseHistory`/tracked), propozycje (`getNextSetAdvice`, `computeWeeklyTargets`, `suggestEarlyDeload`), metryki (ocena "za ciężko", ból, RZA), rekordy (`pr-utils` best*/`detectNewPRs`: bez fałszywego PR w sesji planowej po mocnym ad-hoc, PR w ad-hoc widzi rekord planowy) i rampę trybów.

**Dlaczego:** research Runny cz. 1 (TOP 1/6/7): życie rozjeżdża plan — apka wychodzi do usera z czystym restartem w 1 tap zamiast ściany zaległości; wszystkie korekty żyją WYŁĄCZNIE w propozycjach (zasada "adaptacja za zgodą"), plan/cykl/historia nietknięte bez tapnięcia.

**Niezmiennik globalny (testowany per krok):** user, który nic nie pomija, nie włącza trybów i nie robi ad-hoc, ma DOKŁADNIE dzisiejsze zachowanie; wywołania silnika bez snapshotu nazwy zachowują się jak dotąd.

**Fix bramek (krok 17):** tray zaległości zasłaniał `main` (inert Radixa) w 31 testach e2e — mockowy plan ma zaplanowane dni w przeszłości bez sesji, więc tray otwierał się w każdym teście Dashboardu; fix: seed pamięci odrzuceń (`fittracker_lapse_dismissed_v1`, pełne okno detekcji) w `playwright.config.ts` przez `use.storageState` — testy traya czyszczą klucz u siebie, zachowanie produkcyjne bez zmian. Drugi fail (warmup-persistence, spinner po reload) = flake zwietrzałego dev servera, potwierdzona lekcja #9 (świeży vite → zielone).

**Weryfikacja (krok 17, wszystko zielone):** unit 1614/1614, `typecheck` + `lint`, `build` + `build:mobile` + `check:dist-smoke` (bundle startuje w Chromium), `test:rules` 203/203 (JDK21 z homebrew: `JAVA_HOME=/opt/homebrew/opt/openjdk@21`), testy functions 222 passed / 7 skipped, `e2e:mock` 196/196 (2.9 min, świeży vite).

**Deploy (krok 18, pre-autoryzowany, WYKONANY 2026-08-12):** functions `Deploy complete` na fittracker-workouts, w tym NOWE `reducedModeEndingPush` + `vacationEndingPush` (Successful create, us-central1); web live `index-Dvg_7x86.js` (gh-pages Published, hash zweryfikowany na app.strengthsave.app); iOS build **95** UPLOAD SUCCEEDED (Delivery UUID dd9bfa15-6dff-4411-a44f-bcba217fdf02), obie grupy TestFlight podpięte (HTTP 204/204, whatsNew 200), betaReviewState **APPROVED**; Android AAB **versionCode 11** BUILD SUCCESSFUL, `jar verified`, SHA-256 `16fde5c7c793b913aa5ae835831a35a3ef62b30e8185355156a8030e5796628d` (upload do Play poza zakresem — konto czeka na weryfikację Google). NASTĘPNY bump iOS = 96, versionCode = 12.

**Po stronie usera:** testy urządzeniowe wydania 2 na iPhone (build 95): pomiń trening z menu karty dnia i cofnięcie, tray zaległości po 3+ dniach przerwy (każda z opcji), tryb "nie na 100%" (wejście z Profilu i traya, badge, rampa po końcu, push przed końcem), tryb urlopu (deklaracja z datami, push powrotny, anulowanie), szybki trening → propozycja ciężaru w planie uwzględnia ad-hoc.

### 2026-08-12: Runna pakiet 1, WYDANIE 1 (pętla sesji + tydzień) — kroki 1-10 wdrożone w kodzie

**Co (spec `docs/superpowers/specs/2026-08-11-runna-pakiet-1-design.md`, wykonanie przez /loop wg `docs/PROMPT-WDROZENIE-RUNNA-PAKIET-1.md`, commity `58815634`→`27b5bfb3`):**

*Decyzje zakresu (dyskusja z userem 2026-08-12):* pełny zakres w DWÓCH wydaniach (A+B+backfill teraz, etap C po deployu wydania 1); A3 bez osobnego ekranu przeglądu (edycja z podsumowania przez istniejący tryb edycji); dodany backfill rekordów (A5); deploy OBU wydań pre-autoryzowany w czacie ("wdroz wszystkie poprawki").

*Etap A — pętla po sesji:* (1) ocena sesji: pola `sessionRating`/`sessionRatingReasons` na dokumencie workouts (rules hasOnly + zamknięta lista wartości, 4 testy rules), czysty builder `workout-session-rating.ts`, przejście przez `sanitizeWorkoutDoc` (lekcja b.88), `saveWorkoutSessionRating` celowo BEZ writeId/revision (ocena po finalnym zapisie; offline = mutation queue Firestore; utrata = brak sygnału, nic nie wisi); (2) `WorkoutCompletionSequence`: celebracja (ConfettiBurst+haptyka) → kciuk/chipsy (pomijalne X) → rating-gate → podsumowanie deterministyczne (`computeCompletionSummary`: hero tonaż/czas/serie, plan vs wykonanie, delta wolumenu vs poprzednia sesja dnia) + blok PR per ćwiczenie; tylko ŚWIEŻO zakończona sesja (justCompleted), wejście z historii bez zmian; zombie-guard: edycja gasi justCompleted; (3) "Popraw serie" z podsumowania → istniejący tryb edycji (rewizja z serwera, clampSet, writeId); (4) ocena zasila silnik (spec A2, "za zgodą"): `lastSessionRatedTooHeavy` + flaga w `decideNextSet` gasi WYŁĄCZNIE podbicie (reasonKey `hold.rated`), deload przy plateau ma priorytet, spięte w `getNextSetAdvice` i `computeWeeklyTargets`; (5) share: szablon `story` 1080x1920 wg raportu 3.2 (hero wybierane: tonaż/PR/czas, glass, pasek "Tydzień N z M", brand; nowy domyślny), realne dane (duration, PR-y, completedSets, week) + PR NA ŻYWO w sesji (`live-pr.ts`: toast raz per ćwiczenie + badge na karcie; brak historii ≠ PR); (6) backfill rekordów (A5): `users.prBackfill` (zamknięta mapa squat/bench/deadlift 0-600 kg, rules + mapper), dialog w Profilu (TWOJE DANE, jednostka usera, miękkie "na pewno?" >400 kg, pusty formularz czyści), detekcja PR = max(historia, backfill), matcher nazw PL/EN z foldem znaków (warianty NIE dziedziczą).

*Etap B — Dashboard i ekran treningu:* (7) karta tygodnia (`week-card.ts` + `WeekCard`): "Tydzień N z M" + badge Deload + checkmarki 7 dni (przełożony w NOWEJ dacie przez kanoniczny resolver; skipped strukturalnie pod krok 12) + pasek sesji (dni zaplanowane) + tonaż tygodnia (ad-hoc dokłada); (8) kolejność Dashboardu wg B2 (dziś → tydzień → reszta → Szybki trening na dole) + dzień wolny jako karta "Dzień regeneracji" (`recovery-tips.ts`: tip ogólny + tip pod partię z wczoraj, deterministyczne); (9) przerwa-hero w RestBar (wielki countdown + "Następne: X kg × N", po końcu wraca; deadline/notyfikacje NIETKNIĘTE — pilnują istniejące testy) + `HoldToFinishButton` (przytrzymanie 900 ms z ringiem, tap = hint, Enter = fallback do istniejącego potwierdzenia).

**Dlaczego:** research Runny (`docs/RESEARCH-RUNNA-2026-08-11.md`): pętla nagrody po KAŻDEJ sesji (nie raz w tygodniu), telemetria RPE dla silnika z 1 tapa, tydzień jako domykana jednostka, share card jako jedyny kanał organicznego wzrostu, backfill żeby celebracja PR nie gratulowała starych ciężarów.

**Niezmiennik globalny (testowany per krok):** user, który niczego nie ocenia i nie używa nowych funkcji, ma DOKŁADNIE dzisiejsze zachowanie apki; brak oceny = progresja identyczna jak dziś; wejście w ukończony trening z historii bez celebracji; wszystkie elementy Dashboardu obecne (przesunięte, nie usunięte).

**Weryfikacja (krok 10, wszystko zielone):** unit 1557/1557 (79 nowych testów w 10 plikach), `typecheck` + `lint`, `build` + `build:mobile` + `check:dist-smoke` (bundle startuje w Chromium), `test:rules` 0 FAIL (JDK21), `e2e:mock` 196/196 (1.8 min, świeży vite).

**Deploy (krok 11, pre-autoryzowany, WYKONANY 2026-08-12):** web live `index-Dm9M5Rhz.js` (gh-pages Published, hash zweryfikowany na app.strengthsave.app); iOS build **94** UPLOAD SUCCEEDED (Delivery UUID 0b7c2832), obie grupy TestFlight podpięte (HTTP 204/204, whatsNew 200), betaReviewState **APPROVED**; Android AAB **versionCode 10** BUILD SUCCESSFUL, `jar verified`, SHA-256 `e004131b1c6f059b3dfc616a9885d04dc2f709b0a313e71af6265360fd6fc63b` (upload do Play poza zakresem — konto czeka na weryfikację Google). NASTĘPNY bump iOS = 95, versionCode = 11. Etap C (skip, tray, tryby, ad-hoc audyt) startuje po tym wydaniu.

**Po stronie usera:** testy urządzeniowe wydania 1 na iPhone: completion (celebracja → ocena → podsumowanie → edycja serii), press-and-hold, przerwa-hero, share story (render w WKWebView), backfill w Profilu, karta tygodnia z przełożonym dniem.

---

### 2026-08-11: Przełożenie treningu (scheduleOverrides) + krok marketingowy onboardingu — kroki 1-10 wdrożone w kodzie

**Co (spec `docs/superpowers/specs/2026-08-11-przelozenie-treningu-onboarding-marketing-design.md`, wykonanie przez /loop wg `docs/PROMPT-WDROZENIE-PRZELOZENIE-ONBOARDING-2026-08-11.md`, commity `683f05f0`→`108645fb`):**

*Feature A — przełożenie treningu:* (1) kanoniczny resolver `resolvePlannedDay(dateISO, planDays, scheduleOverrides)` w `src/lib/plan-schedule.ts` (override: null = wolne, osierocony dayId ignorowany z fallbackiem weekday) + wspólny fixture `fixtures/cross-platform/schedule-overrides-v1.json` (14 przypadków); (2) rules: `scheduleOverrides` w hasOnly `training_plans` + `is map` + limit 60 wpisów (głęboka walidacja kluczy YYYY-MM-DD i wartości string|null w kodzie — rules nie iterują po mapach, konwencja Z41); (3) `src/lib/schedule-overrides.ts`: sanitize, pruning >28 dni, `buildScheduleMove` (move {A: null, B: dayId} / swap jako JEDNA mapa = atomowy zapis pola + LWW), czyszczenie przy zmianie zestawu dni w transakcji zapisu planu (edycja ćwiczeń NIE czyści); `moveScheduledDay` w `useTrainingPlan` offline-first (setDoc merge do lokalnej kolejki, bez blokowania na potwierdzeniu); (4) UI: `RescheduleSheet` (14 dni, zajętość, zapowiedź swapu), akcja na karcie dnia (ukryta dla ukończonych/przeszłych; żywy draft = toast blokady), `MissedWorkoutBanner` + `findMissedWorkout` (7 dni wstecz, [Zrób dziś] tylko gdy dziś wolne, krzyżyk = odrzucenie zapamiętane per data), Dashboard/`useWatchPlanPreview` liczą przez resolver; (5) mirror resolvera w `functions/src/garmin-day.ts` (`resolvePlannedGarminDay`) + `garminDay` czyta pole z dokumentu planu, parity web↔functions na wspólnym fixture, protokół CIQ bez zmian; (6) hak e2e `setE2EPlanMeta` seeduje overrides + spec `e2e/reschedule.spec.ts`.

*Feature B — krok marketingowy onboardingu:* dedykowany ekran `OnboardingMarketingStep` (wzorzec Runna "Be the first to know": mock powiadomienia w HTML/CSS, [Jasne, wchodzę!]/[Nie, dzięki], treść oświadczenia na ekranie, zero pre-selekcji) po konfiguracji planu, przed PlanPreview — pozycja wg realnej struktury (zgody prawne są na Welcome, nie na końcu jak zakładał spec). Zapis ISTNIEJĄCYM `recordConsent`: granted/withdrawn (odmowa też do logu), kanał `onboarding-marketing-step` (nowa wartość CHANNELS w functions), wersja dokumentu bez zmian; mirror.marketingVersion = odpowiedź zapamiętana (krok nie wraca); wstecz bez zapisu; awaria zapisu = komunikat + retry (wzorzec Welcome). Welcome ma teraz DOKŁADNIE 3 checkboxy (`showMarketing={false}` tylko w PlanWizard); ConsentGate/ConsentSettings nietknięte.

**Dlaczego:** user nie mógł przenieść niezrobionego treningu na inny dzień ("dzisiaj nie byłem na treningu, chcę go zrobić jutro" — wzorzec Runny); zgoda marketingowa jako 4. checkbox na ekranie prawnym miała zerową konwersję perswazyjną i mieszała marketing z RODO. Drag&drop świadomie POZA v1 (ryzyko regresji touch w WKWebView).

**Niezmienniki (zasada #5):** przełożenie zmienia wyłącznie mapowanie data→dzień (historia, drafty, listy ćwiczeń, progresja po exercise.id, cykle i id dni X19 nietknięte — testy sekwencji `reschedule-sequence.test.ts`); bez overrides wszystkie funkcje harmonogramu działają bajt w bajt jak dotąd; stare wywołania `buildGarminDayContext` bez zmian.

**Weryfikacja (krok 10, wszystko zielone):** unit 1478/1478 (49 nowych testów), functions 218/218, `test:rules` (JDK21), `build` + `build:mobile` + `check:dist-smoke`, `e2e:mock` 195/195, parity web↔functions 15/15, typecheck + lint obu paczek.

**Hotfix regresji builda 92 (2026-08-12, commit `83f8deea`, release za zgodą usera):** zwiecha po wyborze daty w RescheduleSheet (unmount otwartego Radix Sheet -> wiszący scroll-lock na body w WKWebView) + kropki HybridWeekStrip bez overrides. Fix: zamrożony kontekst sheeta + zamknięcie przed zapisem + kropki z resolvera. Zapis usera w bazie działał od początku. Wydane: web live `index-BKHP0trQ.js` (zweryfikowany, user potwierdził działanie), iOS build **93** obie grupy (HTTP 204/204, whatsNew 200), betaReviewState **APPROVED**, Android AAB **versionCode 9** `jar verified`, SHA-256 `0f4b2d9a034a5328664cdf7dedaaa18823732170e312c5e1af625c818506e138`. NASTĘPNY bump iOS = 94, versionCode = 10.

**Deploy (krok 12, pre-autoryzowany, WYKONANY 2026-08-11 wieczór):** rules released; functions `garminDay` + `recordConsent` updated (us-central1); web live `index-DIuIrMmX.js` (gh-pages `162b1715`, Pages built, hash zweryfikowany na app.strengthsave.app); iOS build **92** upload SUCCEEDED, obie grupy TestFlight podpięte (HTTP 204/204, whatsNew 200), betaReviewState **APPROVED**; Android AAB **versionCode 8** `jar verified`, SHA-256 `e9020d60a89b58373df18e313145f0e3798737ae45c4b146aeaa72a10cc5adce` (upload do Play poza zakresem — konto czeka na weryfikację Google). NASTĘPNY bump iOS = 93, versionCode = 9.

**Po stronie usera:** testy urządzeniowe na TestFlight (build 92): scenariusz przełożenia (przełóż → start → wyjście → szybki trening → powrót → dokończenie → sync + baner niezrobionego treningu) oraz przejście onboardingu na świeżym koncie (krok marketingowy + 3 checkboxy); Play upload po weryfikacji konta Google.

---

### 2026-08-11: Redesign Profilu wariant A — kroki 1-6 wdrożone w kodzie (deploy: czeka na zgodę usera)

**Co (spec `docs/superpowers/specs/2026-08-11-profil-redesign-design.md`, wykonanie przez /loop wg `docs/PROMPT-WDROZENIE-PROFIL-2026-08-11.md`, commity `b06b4ff9`→`382fcba0`):**
(1) rename poziomów gamifikacyjnych: "Pro Tier"→"Veteran", "Elite Tier"→"Elite" (progi w `tier.ts` bez zmian); (2) chipy nagłówka: [PRO] wypełniony primary tylko dla planu płatnego/trial/comp/admin (`hasProPlan(planKey)`, darmowy user BEZ chipa FREE) + [poziom] outline wyciszony zawsze (`ProfileHeaderChips` zastąpił `TierBadge`); (3) reorganizacja sekcji: Nagłówek → TRENING (rename z "Preferencje treningu", wchodzi Dźwięk z "Aplikacji") → TWOJE DANE → SUBSKRYPCJA (kod 1:1, tylko pozycja) → KONTO → APLIKACJA → POMOC (rename z "Wsparcie") → SYSTEM (nowa: Zaawansowane + Admin) → Wyloguj + Usuń konto; (4) wiersz Powiadomienia pokazuje stan z `getPushPermission()` (granted = Włączone, inaczej Wyłączone); (5) reset hasła za dialogiem potwierdzenia (wcześniej mail leciał po jednym tapnięciu); (6) faza 2: zębatka przy RestBar otwiera bottom sheet (timer wł/wył, domyślna przerwa, dźwięk) — TE SAME klucze zapisu co Profil, stałe wyniesione do `lib/workout-preferences.ts`, zero zmian logiki zapisu.

**Dlaczego:** sekcje Profilu odzwierciedlały historię kodu, nie model mentalny usera (ustawienia timera w dwóch sekcjach, "Wsparcie" jako worek na Admin/Zaawansowane); badge "Pro Tier" z gamifikacji zderzał się znaczeniowo z planem PRO z sekcji Subskrypcja; ustawienia zmieniane najczęściej (timer, przerwa, dźwięk) mają być najwyżej i dostępne z ekranu treningu.

**Weryfikacja:** vitest 172 pliki / 1397 PASS, w tym nowe: `tier-labels` (etykiety PL+EN), `profile-header-chips` (hasProPlan per planKey + render), `profile-sections` (niezmiennik zasady #5: wszystkie wiersze/akcje obecne, kolejność sekcji, stany powiadomień, reset za potwierdzeniem, sekwencje sheet↔Profil dla przerwy/dźwięku/timera), zębatka w `rest-bar`. Typecheck, lint, `build`, `build:mobile` + `check:dist-smoke` zielone. Pułapka z wdrożenia: nowy transitive import `@/lib/firebase` (RestBar→WorkoutSettingsSheet) wywalił 2 testy ExerciseCard na realnym `initializeAuth` — fix: mock `@/lib/firebase` w tych testach.

**Deploy (za zgodą usera "wdrażaj", 2026-08-11 wieczór):** web LIVE `index-cuBgCpM2.js` ✔; iOS build 91 TestFlight (archive+export+upload, obie grupy, whatsNew, Beta App Review APPROVED; Delivery `c24c7e6c`) ✔; Android AAB `versionCode 7` podpisany (`jar verified`, SHA-256 `7efc4145…b079dcd3`), gotowy do Play — upload zablokowany do końca weryfikacji konta organizacji przez Google ✔; Watch bez zmian kodu, jedzie w archiwum 91 ✔; Garmin nietknięty (protokół bez zmian) ✔. Następny bump iOS = 92.

### 2026-08-11: Build 90 — sekcja "Subskrypcja" w Profilu + startedAt z webhooka RC (wdrożone: functions + web + iOS)

**Feature (zgłoszenie usera):** "od kiedy do kiedy mam premium" widoczne w apce. Spec: `docs/superpowers/specs/2026-08-11-subscription-section-design.md`.

**Zakres:** (1) webhook RC zapisuje `startedAt` z `purchased_at_ms` (początek bieżącego okresu; dokumenty sprzed zmiany dostaną pole przy najbliższym evencie); (2) klient: `startedAt` w `SubscriptionState`/`useSubscription` z fallbackiem `latestPurchaseDate` z CustomerInfo na native; (3) czysty formatter `subscription-summary.ts` (admin/comp/trial/monthly/yearly z odnawia-wygasa-grace/brak) + sekcja w Profilu z "Zarządzaj subskrypcją" (App Store) i "Przejdź na PRO" tylko na platformie paywalla. Weryfikacja builda 86 po drodze: metryki pokazały pierwszą udaną wymianę `ExchangeAppAttestAttestation` 200 w historii projektu (fix App Check potwierdzony na urządzeniu).

**Deploy:** functions `revenuecatWebhook` ✔, web `index-fv6Dq5H5.js` live (zawiera też fix bramki zgód z builda 88) ✔, iOS build 90 TestFlight (obie grupy, Beta App Review APPROVED) ✔. Build 89 pominięty celowo: równoległa sesja wydała 88 (fix bramki zgód), user wyznaczył 90 dla tego feature'u. Następny bump = 91. Testy: 1371/1371 (w tym 8 nowych formattera, 2 webhooka).

### 2026-08-11: Build 88 — bramka zgód wisiała na spinnerze mimo udanego zapisu (mapper gubił mirror)

**Zgłoszenie usera (build 87, 17:27):** zaakceptował 4 zgody, spinner kręcił się w nieskończoność. **Dowody, nie hipoteza:** log `recordConsent` 15:27:36 UTC "Callable request verification passed" (auth VALID, app MISSING = fallback z builda 86 działał), Firestore `users/{uid}` updateTime 15:27:37 z KOMPLETNYM mirrorem (terms 2.0, privacy 2.0, health 1.0, marketing 1.0) zgodnym co do znaku z `LEGAL_VERSIONS`. Backend działał; `mapAppUserProfile` budował profil pole po polu i NIE przenosił `consents`, więc `needsConsentRefresh` nigdy nie robiło się false. Dotyczyło KAŻDEGO usera na 87 i na web (index-CcUCiX0m). **Fix:** przeniesienie pola + typy (`ConsentMirror` w `AppUserProfile` i `UserProfile`); test czerwony przed fixem w `user-profile.test.ts`. Vitest 1362 PASS. **Wdrożone:** web `index-DyYGCCbr.js` LIVE, iOS build 88 na TestFlight (obie grupy, Beta App Review APPROVED). Następny bump = 89. **Do rozważenia (sesja legal):** ConsentGate po sukcesie trzyma spinner bez timeoutu czekając na snapshot — reguła #6 wymaga wyjścia (timeout + komunikat). **Lekcja:** mapper typu "pole po polu" to miejsce, gdzie nowe pola dokumentu giną domyślnie; test nowej funkcji musi pokrywać CAŁĄ pętlę (zapis → snapshot → warunek UI), nie tylko zapis.

### 2026-08-11: Pakiet prawny v2 — dokumenty 2.0, consent engine, compliance (3 plany, spec: docs/superpowers/specs/2026-08-11-legal-pack-design.md)

**Kontekst:** dwa raporty deep research (audyt prawny UE+USA) wykazały luki P0: jeden zbiorczy checkbox zgód naruszał RODO (zgoda zdrowotna art. 9 musi być odrębna i wyraźna; polityki prywatności się nie "akceptuje"), zgoda nigdzie nie była zapisywana (zero dowodu), brak dokumentu MHMDA (stan Waszyngton, bez progów, private right of action). Decyzje usera: marketing z opt-in, arbitraż US z 30-dniowym opt-out, wszystkie zgody wyciągalne do CSV z datą+godziną+IP, stare /legal/*.html usunięte (buildy <=85 to tylko testy TF).

**Plan 1 (landing, repo strength_save_landing, commit 7ab1f34, LIVE na Vercel):** Regulamin 2.0 i Privacy 2.0 PL/EN (assumption of risk z carve-outem 385(3)/473 kc dla UE, reklamacje 14 dni + wymagania techniczne z UŚUDE, sekcja arbitrażowa "U.S. residents only", klauzule API: Strava 48h/Usage Data/zakaz AI, HealthKit, Health Connect, Garmin; rejestr zgód z IP jako nowe przetwarzanie; karencja 30 dni), NOWE: Polityka Cookies 1.0 (zero trackerów = bez banera) i Consumer Health Data Privacy Policy 1.0 EN (MHMDA/NV, osobny link w stopce — twardy wymóg ustawy). Źródło dokumentów: src/data/legal/*.html + build-legal.mjs (JSON generowany); archiwum wersji /legal-archive/. Benchmarki konkurencji (Hevy, Strong) potwierdziły, że oba mają słabe dokumenty (Hevy: zero medical disclaimera; Strong: retencja "indefinitely").

**Plan 2 (consent engine, commit cf4139f6):** 4 rozdzielone checkboxy w onboardingu (regulamin+16 lat, zapoznanie z privacy, WYRAŹNA zgoda zdrowotna, opcjonalny marketing), Cloud Function recordConsent (IP z x-forwarded-for, timestamp serwerowy, pełna treść oświadczenia + wersja dokumentu, batch do kolekcji consents + mirror users/{uid}.consents), ConsentGate (re-consent istniejących userów; bump wersji w legal-versions.ts = re-consent), ustawienia zgód (wycofanie zdrowotnej blokuje pomiary + metryki RPE/ból, konto zostaje — zasada #6: stan ma wyjście), rules (consents: read admin, write tylko backend; mirror poza whitelistą users). Kolekcja consents CELOWO poza kasowaniem GDPR (dowód rozliczalności, opisane w polityce). E2e bypass na VITE_E2E_MODE (seedowani userzy nie mają mirrora).

**Plan 3 (admin+compliance):** panel admina: karta "Log zgód" + eksport CSV (createdAtUtc, email, uid, typ, akcja, wersja, język, kanał, wersja aplikacji, IP, treść oświadczenia; RFC 4180 + BOM dla Excela). Dokumenty wewnętrzne: docs/legal/RCPD.md (obowiązkowy mimo solo dev — art. 30 ust. 5, bo dane art. 9), PROCEDURA-NARUSZEN.md (72h), REJESTR-WERSJI.md (procedura bumpa dokumentów: functions PRZED webem), DPA-CHECKLIST.md. Digest zweryfikowany: czysto serwisowy (zero treści promo w szablonie), więc bez osobnej zgody; przy dodaniu promo → gate na marketingGranted.

**Weryfikacja:** vitest front 167 plików/1358+ PASS (w tym nowe: consents walidacja+IP+mirror, parity wersji src/functions, PlanWizard 3 checkboxy, ConsentGate, CSV), functions 210 PASS, rules 183 PASS (5 nowych o consents), lint 0, typecheck OK, build+dist-smoke OK, e2e:mock 194 PASS (1 test zaktualizowany na nowe checkboxy). Deploy: rules + functions:recordConsent + web + landing LIVE.

**Zastrzeżenie:** dokumenty to kompletne wersje robocze na bazie raportów; przed launchem przegląd radcy prawnego (miejsca sporne oznaczone w spec "do potwierdzenia z prawnikiem": m.in. blokujący charakter zgody zdrowotnej w onboardingu, koszty arbitrażu AAA).

### 2026-08-11: Build 86 — logowanie iOS martwe na buildzie 85 (App Check: DeviceCheck zamiast App Attest)

**Zgłoszenie usera:** ekran "Nie udało się wczytać profilu" po zalogowaniu, na OBU kontach (g.jasionowicz@gmail.com i grzegorzee@gmail.com), build 85 z TestFlight.

**Root cause (dowody z metryk GCP, nie hipoteza):** na iOS `syncUserProfile` idzie przez `callNativeAttestedFunction`, który najpierw pobiera token App Check. Fabryka providera App Attest była rejestrowana dopiero, gdy JS zawołał `FirebaseAppCheck.initialize()` — a instancja App Check powstawała wcześniej (plugin `@capacitor-firebase/authentication` + `FirebaseApp.configure()` w `load()` pluginu przy starcie bridge'a) z DOMYŚLNYM providerem DeviceCheck. Konsola Firebase ma skonfigurowany tylko App Attest, więc `ExchangeDeviceCheckToken` zwracał 400 FAILED_PRECONDITION, `getToken` rzucał i request o profil NIGDY nie wychodził z telefonu (zero wpisów w logach Cloud Run w oknie awarii; metryki serviceruntime: przez cały tydzień ZERO wymian App Attest, 2x DeviceCheck 400 dokładnie w oknach prób logowania usera). Błąd niezależny od konta — blokował każdego użytkownika natywnego iOS.

**Fix 1 (root cause, `AppDelegate.swift`):** rejestracja `StrengthAppCheckProviderFactory` (AppAttestProvider) + `FirebaseApp.configure()` jako PIERWSZE linie `didFinishLaunching`, zanim bridge Capacitora załaduje pluginy Firebase. Moduły `FirebaseCore`/`FirebaseAppCheck` widoczne w targecie App transytywnie przez SPM (bez zmian w pbxproj; zweryfikowane `xcodebuild ... BUILD SUCCEEDED`).

**Fix 2 (wyjście z błędu, `src/lib/native-callable.ts`):** token App Check pobierany best-effort. Gdy attestacja padnie (zależność zewnętrzna: Secure Enclave/serwery Apple/wymiana Firebase), request idzie BEZ nagłówka `X-Firebase-AppCheck` — backend nie wymusza App Check na callables, a rejestrację nowych kont i tak gate'uje serwerowo `canCreateUserProfile`. Zasada #6 z CLAUDE.md: stan błędu musi mieć wyjście; wcześniej awaria attestacji trwale odcinała logowanie. Test: `native-callable.test.ts` ("falls back to a request without App Check header when attestation fails").

**Weryfikacja po wydaniu 86:** logowanie na realnym urządzeniu + w metrykach `serviceruntime.googleapis.com/api/request_count` dla `firebaseappcheck.googleapis.com` mają się pojawić wymiany `ExchangeAppAttestAttestation/Assertion` z kodem 200 (dotąd zero w historii projektu).

**iOS build 85 (odblokowany i wydany):** user włączył App Attest w portalu, ale samo włączenie unieważniło WSZYSTKIE trzy profile (App/Watch/Widgets: stan INVALID w portalu, lokalne kopie sprzed zmiany bez entitlementu). Naprawa bez klikania w portalu: ASC API delete+create wszystkich 3 profili (te same nazwy, cert DISTRIBUTION F52LLKV85G, ACTIVE), instalacja świeżych .mobileprovision (stare w backupie), weryfikacja `appattest-environment: [development, production]` w profilu App. `ExportOptions-manual.plist` przepięty z UUID na NAZWY profili (odporność na przyszłe regeneracje; plik gitignored, zmiana lokalna). Rezultat: archive SUCCEEDED, export, upload (Delivery UUID 58c4a57a), build 85 VALID, obie grupy TestFlight podpięte, whatsNew ustawione, Beta App Review **APPROVED**. Lekcja: włączenie capability na App ID ZAWSZE unieważnia istniejące profile; regeneruj przez ASC API (profiles delete+create) i trzymaj ExportOptions na nazwach.

**Cennik (decyzja OSTATECZNA usera, zamyka A3):** roczny **119,99 zł / $31.99** (miesięczny 14,99 zł / $3.99 bez zmian). Zaplanowana w ASC zmiana z X25 (od 2026-08-12) zostaje. Opcjonalny wariant na launch: intro/promo 99,99 zł za pierwszy rok przy cenie katalogowej 119,99.

**Przegląd animacji ćwiczeń (na żądanie usera, rozszerza Z248):** pełny audyt 137 klipów z CDN. Metoda: 7 agentów oceniało siatki klatek świeżym okiem wg kryteriów README; 45 flag merytorycznych przeszło DRUGĄ, sceptyczną weryfikację (45/45 potwierdzone, każda z konkretnym opisem defektu); flagi czysto stylistyczne skalibrowane ręcznie na 17 obrazach (styl glow = OK, stary szablon "preparatu anatomicznego" = kosmetyka). Wynik: **45 klipów zdjętych z `ANIMATION_FILES`** (pokazywały inne ćwiczenie/sprzęt/chwyt/mięśnie: lepszy placeholder niż kłamstwo; pliki na CDN nietknięte, przywrócenie = jedna linia po wymianie klipu), 9 kosmetycznych zostaje do wymiany, 6 flag stylu odrzucone. Wdrożone na web (`index-DQ9u8oyG.js` live, vitest 1345 PASS); iOS dostanie w buildzie 86. Raport i kolejka produkcji 160 klipów (93 nowe + 13 stare FAIL + 45 wymian + 9 kosmetyk, ~8 h generacji w panelu Higgsfield tryb unlimited): `animacje-cwiczen/_PRZEGLAD-2026-08-11.md`. Lekcja: pojedynczy przegląd agenta popełnia błędy obu typów: bez adwersaryjnej weryfikacji zdjęlibyśmy 6 dobrych klipów (flagi stylu), a bez świeżego przeglądu zostałoby 45 błędnych z PASS-ami z produkcji.

**CI "Deploy to GitHub Pages" (czerwony od ~2026-08-03, spam maili o failach):** trzy przyczyny naprawione: (1) `rest-timer-controller.test.tsx` bez mocka `@/lib/error-telemetry` ciągnął realny init Firebase — na runnerze bez .env padał cały plik z `auth/invalid-api-key`; (2) test chipa kategorii w `exercise-picker.test.tsx` przekraczał 15 s pod coverage (timeout 30 s); (3) `ios-simulator-smoke` nie miał sekretu `VITE_REVENUECAT_APPLE_API_KEY` (dodany przez `gh secret set`). Dodatkowo `build-and-deploy` (deploy Pages z Actions) za flagą `vars.ENABLE_PAGES_DEPLOY` — kanoniczny deploy web to lokalne `npm run deploy` (gh-pages), Pages jest w trybie legacy (source: branch), więc `deploy-pages` i tak by padał. `firebase-contract-deploy` dalej wyłączony (brak `ENABLE_FIREBASE_DEPLOY`).

### 2026-08-11: X26 sesja 2 — deployed evidence (web + functions + landing; iOS 85 BLOCKED na App Attest → rozwiązane wyżej)

**Bramki (wszystkie zielone przed deployami):** vitest 1343 PASS (165 plików), typecheck, lint, e2e:mock 194/194 PASS (1.9 min, po restarcie vite + czyszczeniu node_modules/.vite wg lekcji #9), build, dist-smoke PASS, bundle-budget PASS (initial JS 1 276 965 / 1 536 000 B).

**Deployed evidence:**
- **Web:** `npm run deploy` (gh-pages) — https://app.strengthsave.app/ serwuje `index-DXkvGdPz.js` (weryfikacja curl; poprzednio index-CDA1eN0R.js). Bundle zawiera Z231-Z246 + Z249 (czyste URL-e legal).
- **Functions:** `firebase deploy --only functions --project fittracker-workouts` — Deploy complete, wszystkie funkcje zaktualizowane. `functions:list`: `deleteOwnAccount` (v2 callable, secret RESEND_API_KEY zbindowany bez błędu) i `resumeDeletionOperations` (v2 scheduled) ACTIVE. Logi po deployu czyste (scheduler odpala się co godzinę, same rutynowe starty instancji). Weryfikacja Z238 bez dotykania realnych kont. Secret `strava-redirect-uri` NIE zmieniony (decyzja: dopiero razem z Authorization Callback Domain w apce Strava; 301 z github.io nadal działa).
- **Landing (Vercel prod):** stan Z247+legal-cleanup+Z250 live: /delete-account 200; /legal/{privacy,privacy-pl,terms,terms-pl,delete-account}.html → 308 na /privacy, /terms, /delete-account; /privacy i /terms 200; treść privacy bez wzmianek o AI. INCYDENT: agent 2 (ta sesja) zdeployował landing z 8c62329 (HEAD w momencie startu kroku; deploy przez git worktree, bo working tree miał niezacommitowaną pracę agenta legal), przez co na kilka minut cofnął świeżo zdeployowany Z250 (86b6e2b); wykryte po commicie 49e7ded2 w repo app, natychmiastowy redeploy z 86b6e2b przywrócił stan. Lekcja: przy równoległych sesjach przed deployem porównaj HEAD repo i stan proda, nie polegaj na snapshotcie z początku sesji.
- **iOS build 85: BLOCKED (krok usera).** CURRENT_PROJECT_VERSION 84 → 85 zbumpowany (6 wystąpień, commit 2d57b0a6, MARKETING_VERSION 1.0.0 bez zmian). `scripts/release-ios.sh` failuje na archive: profil "Strength Save App Store" nie zawiera capability App Attest (`com.apple.developer.devicecheck.appattest-environment`) — dokładnie tak, jak przewidział Z229/X25 (entitlement celowo nieusuwany). Odblokowanie: user w Apple Developer portal włącza App Attest dla App ID `com.grzegorzjasionowicz.strengthsave` i odtwarza profil "Strength Save App Store", potem `scripts/release-ios.sh` + `testflight_external.py 85` (obie grupy + Beta App Review).
- **Z248 (dokumentacja):** FAZA 7 planu zaktualizowana: 137/243 klipów na CDN (`_cdn/`: 137 mp4 + 137 jpg), kolejka `_STATUS.md`: 131 PASS, 16 FAIL (7 ODŁOŻONE), 96 TODO. Produkcja klipów = osobna sesja z budżetem Higgsfield.

**Otwarte decyzje usera (bez zmian):** A1 strzałka na paywallu (rekomendacja: zostawić), A2 web billing (odłożone), A3 cennik roczny 99,99 vs 119,99 zł (zmiana ASC z X25 planowana od 2026-08-12; w tej sesji ZERO zmian cen). Po odblokowaniu profilu: testy urządzeniowe builda 85. Play Console: URL usuwania konta https://strengthsave.app/delete-account (live). Przy submisji ASC/Play wpisać czyste URL-e https://strengthsave.app/privacy i /terms.

### 2026-08-11: X26 sesja 1 — feedback z przeglądu builda 84 WDROŻONY w kodzie (Z231-Z247)

**Źródło:** przegląd usera na iPhone (8 screenshotów + głosowe zgłoszenia) + wymóg Play (URL usuwania konta). Plan: `docs/PLAN-X26-2026-08-11.md`, research planów: `docs/RESEARCH-PLANY-TRENINGOWE-2026-08-11.md`.

**Decyzje:**
- Onboarding ODMROŻONY (uchyla zamrożenie z X25): "Witaj w Strength Save" zamiast "Iron Zone", checkbox zgód (regulamin+prywatność) blokujący Dalej, pole imienia z zapisem do displayName, `termsAcceptedAt` w mapie onboarding (rules bez zmian).
- Root cause strzałki wstecz z Podglądu planu: XOR-owy render w Onboarding remountował PlanWizard i `useState` wracał na krok 1; fix przez `resumeStep` (wzorzec `startAtPrecision` z NewPlan). Swipe-back wyłączony w onboardingu.
- Paywall: "Trener AI" (martwy wpis, stack AI usunięty 2026-07-03) → "Inteligentna progresja"; Strava zdjęta z piedestału ("i integracje"). Ryzyko App Review 2.3 zamknięte.
- Wylogowanie: dialog potwierdzenia + spinner; cleanup (garmin/watch/push) równolegle `Promise.allSettled` z timeoutem 3 s przed signOut (było 4 sekwencyjne awaity = 3-5 s martwego przycisku).
- Usuwanie konta: Auth kasowany OD RAZU, dane po 30-dniowej karencji (cron `resumeDeletionOperations`, zapytanie tylko po `purgeAfter` bez composite indexu); mail powiadomienia do operatora (kontakt@gjasionowicz.pl przez Resend, best-effort). Anulowanie w karencji: ręcznie wg instrukcji z maila.
- Język: domyślnie EN, polski TYLKO dla polskiego locale; zapisany wybór usera wygrywa.
- Reset onboardingu z powrotem dla każdego usera (osobna karta w Ustawieniach; od Z90.4 był za isAdmin).
- 12 nowych gotowych planów (24 łącznie): Nippard minimalist, BWS full body, GZCLP, kalistenika RR, Strong Curves, PHUL, 5/3/1 BBB, RP mezocykl, PHAT, UL+PPL hybrid, nSuns, Arnold Split. 100% ćwiczeń z istniejącej biblioteki.
- Strona usuwania konta: NA ŻYCZENIE USERA bez statycznego HTML — istniejąca strona React `https://strengthsave.app/delete-account` (copy o karencji 30 dni) + redirect 308 z `/legal/delete-account.html` (repo landing, commit 4d504e9). Ten URL wpisać w Play Console.
- Z245 (kadr modala animacji 4:3) był już naprawiony w HEAD — bez zmian.

**Weryfikacja:** vitest app 1343 PASS (165 plików), functions 198 PASS, typecheck+lint czyste; commity 4d3a96c8, da608657, 05def0f3, 08ef1f18, 5aa0fd45.

**Ogony (sesja 2, prompt: `docs/PROMPT-X26-KONTYNUACJA.md`):** e2e mock + build + dist-smoke, deploy web/functions/landing, iOS build 85 + TestFlight (obie grupy), weryfikacje URL, aktualizacja stanu animacji (137/243). Otwarte decyzje usera: A1 strzałka na paywallu (rekomendacja: zostawić), A2 web billing (później), A3 cennik roczny 99,99 (dziś, user akceptował) vs 119,99 zł (decyzja X25, zmiana ASC planowana od 2026-08-12). Polityka prywatności na landingu nadal wspomina "Trenera AI" — do poprawy przy aktualizacji legali.

### 2026-08-10: aplikacja webowa pod https://app.strengthsave.app/ (custom domain zamiast github.io)

**Decyzja:** Web apka serwowana z app.strengthsave.app (GitHub Pages custom domain). Landing (strengthsave.app, Vercel) linkuje do niej tylko z /download, a strona główna promuje wyłącznie mobilki (bez web apki w hero, testflightNote i FAQ).

**Co zrobione:**
- DNS: CNAME `app` -> grzegorzee.github.io (Cloudflare, DNS only, token w `_secrets/projekty/strengthsave-domain-admin.env`)
- GitHub Pages: `cname=app.strengthsave.app`, `https_enforced=true` (cert Let's Encrypt wydany)
- vite base `'/'` (web), PWA scope/start_url `'/'`, `public/CNAME` (bez niego deploy gh-pages kasuje custom domain)
- playwright.config, playwright.emulator.config, e2e/emulator/plan-lifecycle, check:dist-offline: baseURL bez `/strength-save/`
- Firebase Auth authorized domains + `app.strengthsave.app` (identitytoolkit admin/v2 PATCH; token z `--account g.jasionowicz@gmail.com` + nagłówek `x-goog-user-project`, konto grzegorzee nie ma uprawnień)
- functions: `WEB_URL` digestu i `inviteUrl` na nową domenę (kod w repo, funkcje NIE przedeployowane; stare linki działają przez 301)
- Landing: `WEB_APP_URL` -> nowa domena, hero eyebrow "iOS · Android · Apple Watch", testflightNote i FAQ bez promowania web apki

**Dlaczego:** brandowy adres zamiast github.io; strona główna ma sprzedawać aplikacje mobilne, web zostaje jako kanał dla zaproszonych (karta na /download).

**Weryfikacja:** vitest+lint+typecheck zielone, dist-smoke passed; https://app.strengthsave.app/ 200 z nowym bundlem (index-CDA1eN0R.js), strava-callback.html 200; stary URL github.io/strength-save 301 na nową domenę (ścieżka+query zachowane, więc Strava OAuth działa bez zmiany redirect_uri); bundle landinga na prod bez "Web app included", z nowym URL-em.

**Ogony:**
- `stravaRedirectUri` (param funkcji) wciąż wskazuje github.io; przy najbliższym deployu functions zaktualizować param i Authorization Callback Domain w ustawieniach apki Strava (do tego czasu 301 załatwia sprawę)
- starzy userzy web PWA z github.io: zainstalowana PWA może serwować stary cache (SW nie zaktualizuje się przez redirect); rozwiązanie: wejście/reinstalacja z nowej domeny
- RTK potrafi streszczać JSON z curl/gh do schematu; przy debugowaniu API używać `rtk proxy`

### 2026-08-10 — plan X25: najpierw rejestracja i release, onboarding zamrożony

**Decyzja usera:** można wykonać wszystkie rekomendacje z audytu kosztów i gotowości do wydania, ale w X25 nie przebudowujemy ani nie skracamy onboardingu. Szczegółowy plan test-first i autonomiczny prompt `/goal` + `/loop` są zapisane w `docs/PLAN-X25-LAUNCH-2026-08-10.md` oraz `docs/PROMPT-X25-LOOP-2026-08-10.md`.

**Cennik (zastępuje wcześniejsze decyzje cenowe niżej w tym pliku):** miesięczny 14,99 zł / $3.99, roczny 119,99 zł / $31.99. Roczny odpowiada 10,00 zł / $2.67 miesięcznie i daje około 33% oszczędności, czyli praktycznie cztery miesiące gratis. Trial: 7 dni monthly i 14 dni yearly. Paywall ma używać cen i intro period z RevenueCat/StoreKit oraz pokazywać trial wyłącznie przy potwierdzonym `eligible`; `unknown` i `ineligible` bez obietnicy darmowego okresu.

**Wdrożenie ASC X25/Z207 (2026-08-10):** po jawnym read-before i dry-run ceny App Store zostały zaplanowane na 2026-08-12 we wszystkich 175 storefrontach (POL/USA: 14,99/3.99 monthly i 119,99/31.99 yearly), a triale zastąpione na `ONE_WEEK`/`TWO_WEEKS`; końcowy read-back ma 0 braków i 175/175 ofert na produkt. RevenueCat Apple nadal używa jednego `pro` i offeringu `default`. Google Play/RC Android pozostają bramą zewnętrzną opisaną w `docs/X25-MONETIZATION-STATUS.md`; nie utworzono atrap produktów ani drugiego entitlementu.

**Sesja autonomiczna 2026-08-10 (przejęcie po limicie Codexa), Z208-Z222 wdrożone:** eligibility-aware paywall (Z208) i dynamiczna prezentacja ceny (Z209) na obu platformach; batching telemetrii (Z211), dedup push (Z212), pomiary/aktywności/treningi per ekran (Z213/Z214/Z216) z agregatem all-time (Z217, trigger+backfill+fallback, obie funkcje ACTIVE); mapa historii z golden freeze (Z215), kontrakt paginacji (Z218); a11y bez warningów + pojedyncza rejestracja pluginu (Z220), zapas bundle 262 KB (Z221), funnel rejestracji/monetyzacji + dzienny raport kosztów `dailyCostDigest` (Z222). Rules 178/178, functions 198, app 1333, E2E 388 (2 flaky pojedynczo zielone). Web wdrożony na gh-pages (index-BrYBWwO-.js), rules + 3 nowe funkcje na prod. Otwarte wyłącznie KROKI USERA: profil App Attest dla archive iOS (Z229), Play Console/Google Play (Z207/Z210), realne urządzenia Watch/Garmin/iPhone/Android (Z206/Z225/Z226/Z228), submisja Connect IQ.

**Implementacja Z217, agregat all-time (2026-08-10):** `users/{uid}/aggregates/allTime` trzyma mapę wkładów per workoutId (totals przeliczane z mapy — odtwarzalne, idempotentne, odporne na at-least-once); trigger na workouts robi transakcyjny apply, a przy braku dokumentu/starym schemacie pełny rebuild historii (istniejący user nie dostanie agregatu z jednego treningu); backfill = callable `rebuildWorkoutAggregate`. Pisze wyłącznie backend (rules write false, +4 testy). Kafle Dashboardu czytają agregat z fallbackiem na obecne liczenie — przy >500 treningach agregat NAPRAWIA liczby (dotąd liczone z okna 500), nie tylko przyspiesza. Równoważność zamrożona przeciw golden Z215 (fixture 600: 374400 kg/540/1080). Obie funkcje ACTIVE na prod.

**Redukcje kosztów FAZY 4 (2026-08-10, Z211-Z214):** telemetria flush 5 min + online/pagehide/hidden (12/h zamiast 120/h); push registration deduplikowana lokalnym hashem (backend tylko przy zmianie tokenu/uid albo po 30 dniach, logout czyści stan); listener pomiarów tierowany per ekran (Dashboard/WorkoutDay sonda 25 zamiast 365, komponenty sync zero, pełna lista tylko Pomiary/Analityka/eksport) z jedną implementacją selekcji najnowszego pomiaru; listenery aktywności z oknem `sinceDate` (Dashboard od poniedziałku tygodnia planu, DayPlan od dziś), logika kart wyciągnięta do `activity-window.ts` z testem równości pełna historia vs okno na fixture 600+.

**Implementacja Z209, dynamiczna prezentacja ceny (2026-08-10):** oszczędność pakietu rocznego i cena efektywna/miesiąc są liczone z realnych cen sklepu (`yearlyValueSummary`: preferencja `pricePerMonthString` z RC, fallback Intl w locale użytkownika; procent tylko przy tej samej walucie i realnym zysku, inaczej badge znika). Hardkodowany badge „5 mies. gratis" usunięty. Lista korzyści mówi o Apple Watch i Garmin w cenie, bez sugerowania osobnej opłaty. Testy PL/EN/IDR 6/6 PASS, pełna suita 1295 PASS.

**Implementacja Z208, eligibility-aware paywall (2026-08-10):** root cause: paywall pokazywał trial bezwarunkowo (hardkodowane 30/14 dni, stare wartości), a `configurePurchases` używało klucza Apple także na Androidzie. TDD: dwa czerwone testy kontraktowe (`purchases-platform`, `paywall-eligibility`), po implementacji 5/5 PASS. Kontrakt: `revenueCatApiKeyForPlatform` daje klucz per platforma (web = null, brak fallbacku między sklepami, brak klucza = zakupy wyłączone, nie źle skonfigurowane); `resolvePurchaseOptions` na iOS uznaje za trial wyłącznie darmowy introPrice potwierdzony przez `checkTrialOrIntroductoryPriceEligibility` (status 2 = eligible; 1 i 3 = ineligible; 0 lub błąd sieci = unknown), a na Androidzie wyłącznie faktycznie zwróconą opcję Play z `freePhase` (ineligible = defaultOption/base plan, brak opcji = unknown); `trialPresentation` daje trial copy tylko przy eligible. Paywall renderuje trialLine/CTA/renewalNote warunkowo (nowe klucze `paywall.ctaNoTrial` i `paywall.renewalNoteNoTrial` w PL/EN), a zakup na Androidzie idzie przez `purchaseSubscriptionOption` dokładnie na pokazanej opcji. Usunięte bezwarunkowe obietnice „30 dni" z teasera onboardingu i banera PRO. Weryfikacja: aplikacja 155 plików/1289 PASS, typecheck, lint, build, build:mobile, dist smoke i bundle budget PASS.

**Bloker znaleziony na realnym iPhone:** `User profile missing` nie pochodzi z onboardingu. Klient native udostępnia rejestrację bez invite, ale `syncUserProfile` po stronie Functions wymaga invite dla każdego brakującego `users/{uid}`. Firebase Auth tworzy konto, backend nie tworzy profilu, `UserContext` fabrykuje fallback `pending_verification`, a automatyczne `requestEmailVerificationCode` nie znajduje dokumentu usera. Właściwy fix X25: serwerowo weryfikowalna rejestracja native przez Firebase App Check/App Attest, web nadal invite-only, bez powrotu do spoofowalnego pola `platform`; dodatkowo odporny i idempotentny bootstrap profilu dla istniejących osieroconych kont Auth.

**Priorytety po P0:** eligibility-aware paywall i nowe ceny/triale; batching telemetrii 30 s → 5 min/lifecycle; deduplikacja rejestracji push; węższe zapytania Dashboardu i paginacja historii; recent realtime + agregaty dopiero po testach równoważności; naprawa web dist-smoke, a11y i odzyskanie min. 150 KB zapasu bundle. Dane, pełna historia, offline, eksport i obecny flow onboardingu pozostają.

**Implementacja P0 (2026-08-10):** iOS i Android pobierają natywny token Firebase App Check przez `@capacitor-firebase/app-check` (App Attest / Play Integrity), a trzy callable rejestracyjne wysyłają oficjalną kopertę `{data}` z nagłówkami Firebase Auth i `X-Firebase-AppCheck`. Backend nie ufa klientowi: brak invite jest dozwolony wyłącznie dla zweryfikowanego `request.app.appId` równego dokładnemu App ID Strength Save iOS albo Android; kill switch `registrationOpen=false` ma pierwszeństwo. Web oraz każdy brakujący/obcy App Check ID pozostają invite-only. `UserContext` najpierw kończy idempotentny sync profilu, dopiero potem uruchamia listener, więc pusty snapshot nie fabrykuje profilu i nie montuje za wcześnie bramki kodu.

**Stan chmury i obu platform:** Firebase iOS ma Team ID `J4CRD2SA6D` i App Attest TTL 3600 s. Android ma Play Integrity TTL 3600 s, aktywne `playintegrity.googleapis.com` oraz SHA-256 upload key w Firebase. Wymagane `firebaseappcheck.googleapis.com` jest aktywne. `syncUserProfile` wdrożono i ma stan ACTIVE. Kontrolowane produkcyjne smoki dla dokładnych App ID obu platform przeszły `profile -> email code -> verify -> onboarding.in_progress`; oba konta techniczne usunięto przez `deleteOwnAccount`, a tymczasowe debug tokeny unieważniono. Emulator obu platform i web invite-only: 7/7 PASS. Pozostają prawdziwe atestacje z dystrybucji sklepowej: iOS build 84 z TestFlight i Android AAB `versionCode 6` z Play Internal.

**Decyzja release Android równolegle z iOS:** obie aplikacje wychodzą w tym samym publicznym oknie. Parytet obejmuje rejestrację, paywall, ceny, triale, restore i smoke zakupu. AAB 6 jest podpisany i przechodzi Gradle `assembleDebug` + `bundleRelease`; po stronie Play pozostają konto/aplikacja, pierwszy upload, akceptacja Play App Signing, dodanie SHA-1 i SHA-256 certyfikatu App signing do Firebase, powiązanie projektu Cloud w Play Integrity oraz produkty Google Play podłączone do RevenueCat.

**Decyzja: jeden produkt na pięciu powierzchniach:** zakres X25 obejmuje także web PWA, osadzony w iOS Apple Watch oraz samodzielną aplikację Garmin Connect IQ. Jedno konto i entitlement `pro` obejmują wszystkie powierzchnie bez osobnej opłaty za zegarki. Checkout i restore pozostają w App Store/Google Play; web pokazuje zsynchronizowany status i prowadzi do właściwej aplikacji mobilnej, a zegarki respektują capability/entitlement z iPhone albo backendu. Spójność oznacza te same identyfikatory, kanoniczne kg, ustawienia, PL/EN, stan sesji, offline/retry/dedup i wynik historii, ale nie sztuczne kopiowanie pełnego UI telefonu na mały ekran.

**Zakres parytetu zegarków przed wydaniem:** najpierw powstaje macierz funkcji i wersjonowany kontrakt. Apple Watch zachowuje WatchConnectivity, lokalny merge, HealthKit, one-tap i widgets, a potwierdzone braki wobec Garmin v3 są domykane bez odbierania funkcji: szybki trening, przerwy 90/150, czas/serie/tonaż, discard i jawny retry. Garmin zachowuje parowanie, kompaktowe endpointy, FIT, EventQueue i lokalne ustawienia; dochodzą testy entitlement/revoke/konflikt oraz eksport `.iq` dla wszystkich rodzin z manifestu. Release gate obejmuje web, iOS+Watch, Android i Connect IQ oraz realne scenariusze iOS<->Watch<->web i Android<->Garmin<->web bez utraty i duplikacji danych.

**Implementacja parytetu Garmin Z226:** źródłem dostępu jest dokładnie ten sam profil/subskrypcja RevenueCat w `users/{uid}` co dla web/mobile; pair/day/ingest sprawdzają go serwerowo, bez osobnego paywalla i bez zaufania do zegarka. Device token ma hash w Firestore, revoke oraz 180-dniowy TTL. Pomyślny logout najpierw revokuje wszystkie tokeny Garmina, a delete-account purge obejmuje pair codes i tokens. `403` oznacza wygasłe PRO i celowo zachowuje token/EventQueue do retry po odnowieniu; `401` oznacza revoke/expiry i wymaga re-pair, ale także nie kasuje niewysłanych eventów. Konflikt telefonu i Garmina nie tworzy już drugiego ad-hoc: touched sets są scalane po `at/updatedAt`, a transakcja wykonuje drugi merge przeciw zapisowi telefonu, który wszedł po odczycie. Legacy tuple i aliasy pozostają dla rolling deploy. Kanoniczne kg nigdy nie są zamieniane w storage; lbs to lokalna prezentacja z dokładną stałą. Cloud requesty typowego treningu: jeden day przy lifecycle/TTL/manual refresh i jeden finalny batch ingest, zero chmury per set/sekundę. Testy automatyczne i buildy pięciu reprezentatywnych urządzeń PASS; fizyczne G1-G9 na koncie technicznym pozostają bramą, ponieważ Garmin nie był podłączony.

**Wspólne zarządzanie urządzeniami Z227:** jedynym źródłem listy Watch/Garmin jest serwerowy read model `linkedDevices`, a dokumenty tokenów i lifecycle pozostają niedostępne bezpośrednio z klienta. Web/iOS/Android pokazują te same last sync/seen, pending, HealthKit/FIT i akcje refresh/unlink. Web nie uruchamia zakupu ani nie obiecuje triala; prowadzi do obu aplikacji mobilnych. Apple Watch dziedziczy potwierdzony capability z iPhone i przy revoke/expiry blokuje tylko nowe akcje, zachowując kolejkę. Garmin dostaje małą podpisaną HMAC kopertę, lecz autorytatywne PRO nadal jest sprawdzane na serwerze przy każdym request. Logout/delete/revoke odcinają oba typy zegarków; relink jest jawny. Aby utrzymać co najmniej 150 KB zapasu bundle bez podnoszenia limitu, ciężki runtime zalogowanego użytkownika jest ładowany po rozpoznaniu sesji: initial JS spadł do 1 269 850 B (266 150 B zapasu), a pełne testy, online/offline smoke i build mobile pozostają zielone. Fizyczne D1-D4 są częścią Z228, nie podstawą do fałszywego zamknięcia bram real-device Z225/Z226.

**Naprawa bramki web Z219:** `check-dist-smoke` wcześniej otwierał `/`, mimo że produkcyjny build ma Vite base `/strength-save/`, i zwracał `index.html` zamiast modułów JS. Skrypt wykrywa teraz base z wygenerowanego `index.html` i poprawnie testuje build web oraz relatywny build mobile. Pełna regresja po rozszerzeniu Android: aplikacja 1224/1224, Functions 156/156 aktywnych, emulator 7/7, E2E 194/194, lint/typecheck/build/mobile/dist/offline/bundle, Xcode generic simulator oraz Gradle PASS.

### 2026-08-06 — X24: dźwięk NATYWNIE + regulacja głośności + tytuł pod animacją (Z200-Z202, build 83)

**Zgłoszenie usera po treningu na buildzie 82:** (1) „mam wybrany dźwięk klaksonu i nie działa, nic nie słychać między seriami", (2) „dźwięk między ćwiczeniami wleciał, ale mam głośność na full a ledwo co było słychać" + prośba o regulację głośności w aplikacji, (3) „jak otwieram żeby zobaczyć ćwiczenie, box jest za duży i nachodzi na animacje".

**Root cause dźwięku (research potwierdzony źródłami, nie zgadnięty):** WKWebView ma WŁASNĄ sesję audio w OSOBNYM procesie — ignoruje kategorię AVAudioSession apki (WebKit bug 167788, otwarty od 2017), a AudioContext odpala w kategorii `ambient`: cichej, duckowanej przez inne sesje i wyciszanej przełącznikiem dzwonka (WebKit 237322). Do tego `GainNode`/`volume` na iOS w WKWebView NIE DZIAŁA wcale (Apple forum 82939 — celowa decyzja platformowa), więc żadne podbijanie gainu w JS nie mogło pomóc. Nasza własna sesja `.playback + .duckOthers` (aktywna cały czas) mogła wręcz DUCKOWAĆ ambient WebView, czyli własne sygnały. Kod JS był poprawny — grał w kanał, który system trzyma po cichu. To dokładnie „plan B: natywny AVAudioPlayer" zapisany 2026-07-24.

**Z200 (natywne granie):** lokalny plugin `TimerSound` (`ios/App/App/TimerSoundPlugin.swift`, wzorzec WatchBridge, rejestracja w BridgeViewController) gra przez AVAudioPlayer pliki z root bundla — te same `rest_{bell,horn,alarm}.wav` co UNNotificationSound plus NOWE `timer_{tick,complete}.wav` (generator `scripts/generate-timer-signals.mjs`: fala trójkątna, częstotliwości i timing 1:1 z playSynth, kompresja tanh drive 2.8, mean -8/-9 dB jak rest_*.wav). `timer-sound.ts`: native-first dla finish/tick/complete ORAZ dla odsłuchu z Ustawień (odsłuch MUSI iść realnym kanałem — cała lekcja sagi dźwięku); fallback łańcuchowy WebAudio→synteza bez zmian; fallback WebAudio wzmocniony `navigator.audioSession.type='playback'` (iOS 17+, oficjalne wyjście z ambient). Web/Android: zachowanie jak dotąd (registerPlugin bez implementacji → reject → fallback).

**Z201 (regulacja głośności):** suwak 20-100% (krok 5, domyślnie 100%) w Ustawieniach pod wyborem dźwięku, odsłuch przy puszczeniu; `timer-volume.ts` (localStorage `fittracker_timer_volume_v1`, clamp 0.2-1). Mnożnik idzie w: volume natywnego playera, gain pliku WebAudio, szczyt syntezy. Minimum 20% świadomie — pełne wyciszenie ma już przełącznik w Profilu, drugi ukryty stan „off" w suwaku to pułapka. Hint pod suwakiem: głośność powiadomienia przy zgaszonym ekranie reguluje SYSTEMOWA głośność dzwonka (tego nie obejdziemy — zasada iOS).

**Z202 (tytuł pod animacją):** blok eyebrow + h1 `display-md` (2.75rem) leżał absolute na wideo 4:3 ExerciseDetail z gradientem od dołu — przy dłuższych nazwach zakrywał dolną część ruchu (nogi/stopy ćwiczącego). Tytuł przeniesiony POD hero, gradient zdjęty (służył wyłącznie czytelności białego tekstu na wideo).

**Pułapka bramek (nauka na przyszłość):** `check:dist-smoke` NA BUILDZIE WEB zawsze pada białym ekranem — web ma base `/strength-save/` (gh-pages), a serwer smoke serwuje dist z roota → moduł wraca jako text/html. Poprawna kolejność bramek: `build:mobile` + `check:dist-smoke`, POTEM `build` (web) + `check:bundle-budget` + `check:dist-offline` (tak stoi w DECYZJE X19, łatwo przeoczyć). Druga pułapka: `npx gh-pages -d dist` przez hook rtk potrafi nie zadziałać — użyj `./node_modules/.bin/gh-pages -d dist` + `gh api .../pages/builds -X POST`.

**Weryfikacja:** vitest 1217/1217 (nowe: natywna ścieżka z głośnością, plugin pada → fallback WebAudio, głośność w gain pliku i szczycie syntezy, suwak startuje 100%/zapisuje ułamek/wraca po montowaniu), typecheck 0, lint 0, build:mobile + dist-smoke PASS, build web + bundle-budget (1 532 678 / 1 536 000 B) + dist-offline PASS, e2e:mock 193/194 + warmup-persistence solo PASS 2/2 (flake pod obciążeniem równoległych buildów, spec bez związku ze zmianami). Commity: f6d11a98 (feat sound Z200+Z201), 2275a1d1 (fix ui Z202). **Deploy:** web `index-Cmt1AhVN.js` na live (potwierdzony curl-em po force rebuild). iOS build 83: upload SUCCEEDED, obie grupy podpięte (HTTP 204+204), whatsNew ustawiony, betaReviewState APPROVED — Robert dostaje build automatycznie. **Czeka na usera (checklist background/resume):** realny test na iPhone — głośność klaksonu między seriami przy włączonym ekranie, suwak głośności, powiadomienie przy zgaszonym ekranie (dzwonek systemowy!), podgląd ćwiczenia.

### 2026-08-05 — X23 WPIS ZBIORCZY: zgłoszenia z realnego treningu na buildzie 81 naprawione u źródła (Z182-Z199)

Plan `docs/PLAN-X23-2026-08-05.md` wykonany w CAŁOŚCI metodą test-first (każdy fix ma test CZERWONY przed implementacją; szczegóły per faza w sześciu wpisach poniżej), autonomicznie w pętli /loop (6 iteracji). Zakres: **F1 sesja nieśmiertelna** (Z182 najświeższy snapshot IDB vs fallback + diagnoza read-only: chmura CZYSTA, wskrzeszenie 4xW było lokalne = klasa H2; Z183 dirty draft nowszy niż chmura wygrywa mimo rozjazdu sessionId; Z184 sanitizeSets bez fabrykatu W; Z185 sessionSwaps persystowane + samonaprawa widoku; Z186 e2e kill→kontynuuj serie 1:1); **F2 kuloodporny timer** (Z187 przerwa też po rozgrzewkowej 45 s; Z188 deadline w kontrolerze + localStorage — kill nie gubi przerwy; Z189 stan przed sygnałami + watchdog 3 s + fail-open `shouldStartRest`; Z190 test sekwencji); **F3 dialogi zamykalne** (Z191 menu zamyka się PRZED otwarciem dialogu — koniec pointer-events lock, który wymusił force-quit; Z192 X 44 px w dialog/sheet + bezpiecznik warstw; Z193 bramka e2e); **F4 miniatury** (Z194 137 posterów JPEG na Bunny; Z195 miniatura = `<img>` — WebKit nie maluje klatki wideo przy preload=metadata); **F5 input** (Z196 px-1 + kolumny 0.9/1.25/0.85 — "122.5" z zapasem ~26 px); **F6 share** (Z197 treść w dolnej 1/3, twarz czysta; Z198 "Zapisano ✓" + haptyka, AbortError bez fałszywego sukcesu; Z199 hover tylko przy kursorze — wariant globalny + active:scale). **F7:** pełne bramki z jawnymi exit code — test 136 plików / 1204, typecheck 0, lint 0, build 0, bundle 1 532 326 / 1 536 000 B (limit NIE podnoszony), dist-smoke PASS, dist-offline PASS, e2e:mock w całości zielone; sekwencja obowiązkowa plan→wyjście→szybki→powrót w e2e + nowy resume-after-kill.spec. Wdrożone: web gh-pages + iOS build 82 (TestFlight + dystrybucja do obu grup przez testflight_external.py). Tech debt (postery kadrowane, klipy TODO, group-hover, tap targety overlayów) w PLAN.md.

### 2026-08-05 — X23 FAZA 6: share bez wstydu (Z197-Z199)

**Z197 ("na zdjęciu liczby nachodzą mi na nos"):** szablon ZDJĘCIE miał w jednym flex-column DWA auto-marginesy (nagłówek `margin-bottom:auto` + stopka `margin-top:auto`) — flexbox dzielił wolną przestrzeń po równo i CENTROWAŁ statystyki w pionie (pas 35-70% wysokości = twarz na selfie); scrim przyciemniał liniowo całość, `dim=0.6` dawał brightness(0.40). Fix: JEDEN spacer `flex:1` po nagłówku (treść klei się do dołu, pas ~dolna 1/3), scrim strefowy `rgba(0,0,0,0) 0% → 0.15 45% → 0.75 68% → 0.92 100%`, dim default 0.35 (brightness 0.65 — twarz czysta), lista max 3 ćwiczenia (+N więcej). Render Playwright 540×960 potwierdza: środek kadru czysty. **Z198 ("Pobierz i zero reakcji"):** `systemShare(): Promise<boolean>` (AbortError = false, zero fałszywego sukcesu); po udanym share/anchor: `markSaved` — przycisk pokazuje "Zapisano ✓" (Check + `hapticSuccess`) przez 1.8 s; klucze `comp.share.saved` w OBU locale. **Z199 (sticky hover):** shadcn Button miał wyłącznie warianty `hover:`, a w projekcie nie było ANI JEDNEGO `@media (hover: hover)` — po tapie przyciski zostawały "podświetlone". Fix systemowy: plugin `addVariant('hover', '@media (hover: hover) and (pointer: fine) { &:hover }')` w tailwind.config — WSZYSTKIE `hover:` w apce (67 reguł w dist) działają tylko przy realnym kursorze, bez ruszania 100+ komponentów; przyciski dostały `active:scale-[0.97]` (realne poczucie tapnięcia). Pułapka do zapamiętania: globalny guard i18n (Z168) skanuje też template literale HTML — komentarze z polskimi znakami tylko w JS. Weryfikacja: vitest PASS 1204/1204, typecheck 0, lint 0, bundle 1 532 326 / 1 536 000 B (limit nie podnoszony). Commity: 2a1bf0e8, cbac6238 + Z199.

### 2026-08-05 — X23 FAZA 5: wiersz serii mieści "122.5" (Z196)

**Kontekst (build 81):** "125 nie mieści się w kratce". Root cause: `px-3` (24 px) dziedziczone z bazowego `Input` + równy podział `1fr/1fr` między KG a POWT — @390 px kolumna KG miała 50.7 px (26.7 px wnętrza), a "125" potrzebuje ~29.5 px (Inter Bold 16). Fix: `px-1` we wszystkich 7 inputach wiersza serii (klasa `.exercise-card-input` w index.css NIETKNIĘTA — współdzielona z notatkami i kalkulatorem talerzy) + proporcjonalne kolumny (weight_reps/assisted: PREV 0.9fr, KG/asysta 1.25fr, POWT 0.85fr; wdd: 1.1/1.1/0.8), nagłówek zsynchronizowany automatycznie (ten sam `gridCols`). Font ZOSTAJE 16 px (próg auto-zoomu iOS przy focusie). Rachunek @390 px po fixie: KG ~70 px wnętrza vs "122.5" ~44 px (zapas ~26 px); POWT ~46 px vs 3 cyfry ~29.5 px. Weryfikacja: vitest PASS 1198/1198, typecheck 0, lint 0.

### 2026-08-05 — X23 FAZA 4: miniatury bez czarnych kafli (Z194, Z195)

**Kontekst (build 81):** "podgląd ćwiczeń jest czarny". Root cause: Z176 oparło miniaturę o `<video preload="metadata">` bez postera, zakładając "metadata = pierwsza klatka" — w WebKit/WKWebView to FAŁSZ: Safari pobiera tylko `moov` i nie maluje ŻADNEJ klatki do pierwszego `play()`/seeka (Chromium maluje, dlatego e2e było zielone). **Z194 (pipeline):** 137 posterów JPEG wygenerowanych z pierwszej klatki (`ffmpeg select=eq(n,0)`, scale 320, ~3.5 KB/szt.) i wgranych na Bunny (`exercises/<slug>.jpg`, 137/137 OK, weryfikacja curl: HTTP/2 200 + image/jpeg na próbce 6 slugów); krok postera dopisany do `do_cdn.sh` (przyszłe klipy automatycznie), `na_bunny.sh` wysyła też `*.jpg`. Katalog poza gitem — zmiany skryptów tylko na dysku. **Z195 (apka):** nowy `getExercisePosterUrl` w exercise-media.ts (nazwa mp4 → .jpg); miniatura karty = `<img loading="lazy" decoding="async">` z fallbackiem na ikonę Dumbbell przy błędzie (ślad `exercise-poster-error` w client_errors); overlay przyciemnienia zmniejszony do `bg-black/15` (poster jest jasny); ZERO dekoderów wideo na liście treningu (twardy niezmiennik w e2e: `header video → count 0`); dialog wideo bez zmian (twardy play() z Z176). E2E z nową fixture sample-poster.jpg (route jpg/mp4 rozdzielone). Weryfikacja: vitest PASS 1197/1197, typecheck 0, lint 0, e2e exercise-video + exercise-card-v3 27/27.

### 2026-08-05 — X23 FAZA 3: dialogi zamykalne ZAWSZE (Z191-Z193)

**Kontekst (build 81):** "nie mogłem zamknąć popupu z filmem, X nie działa" — skończyło się force-quitem. Root cause: modalna warstwa DropdownMenu współistnieje z warstwą dialogu (menu zostaje w DOM przez animację zamykania, `layersWithOutsidePointerEventsDisabled` czyszczone dopiero przy unmount) → `DialogContent` pod `pointer-events: none` na body: X martwy, overlay martwy, a na iOS nie ma Escape. Wzmacniacz: X miał 16×16 px (HIG minimum 44 pt). **Z191:** DropdownMenu w ExerciseCard przeszedł na kontrolowany stan `menuOpen`; KAŻDA pozycja menu przez helper `selectFromMenu` (preventDefault → zamknij menu → `requestAnimationFrame` → akcja) — dialog otwiera się dopiero w klatce PO zniknięciu warstwy menu; miniatura wideo z guardem `menuOpen`. Test RED→GREEN: bezpośrednio po kliku "Instrukcje" menu zamknięte i dialogu JESZCZE nie ma, dialog po klatce. **Z192:** X we WSPÓLNYCH `dialog.tsx` i `sheet.tsx` dostał pole dotyku 44 px (`h-11 w-11 flex items-center justify-center`, glif bez zmian; DialogTitle z `pr-8`) + bezpiecznik warstw: efekt w DialogContent po 350 ms zdejmuje osierocone `pointer-events: none` z body, jeśli w DOM nie żyje żadna otwarta warstwa menu (`[data-state="open"][role="menu"]`) — pas bezpieczeństwa na każdą przyszłą kombinację warstw, nie zastępuje Z191. **Z193 (bramka e2e):** menu→Instrukcje→dialog→X za pierwszym kliknięciem→odhaczenie serii działa; menu otwarte→tap w miniaturę (modalne menu pochłania pierwszy tap — menu znika, dialog z kolejnego tapu działa); po obu dialogach body bez locka. Weryfikacja: vitest PASS 1196/1196, typecheck 0, lint 0, spec e2e 24/24. Commity: b2f2bd7f, 2117e964 + spec.

### 2026-08-05 — X23 FAZA 2: kuloodporny timer przerwy (Z187-Z190)

**Kontekst (build 81, realny trening):** timer między seriami się zacinał, po serii rozgrzewkowej w ogóle nie startował, a pasek "Koniec przerwy" potrafił wisieć na zawsze. **Z187:** start przerwy siedział w bloku `if (turningOn && !currentSet.isWarmup)` — po serii ROZGRZEWKOWEJ timer nigdy nie startował, mimo że `resolveRestSeconds` miał martwą od X17C gałąź `warmupSeconds`. Fix: start przerwy wyciągnięty PRZED warunek roboczych (`allDone` z guardem `!currentSet.isWarmup`); rozgrzewka dostaje 45 s, bez dźwięku "complete" i bez wliczania do końca ćwiczenia. **Z188 (refaktor architektury):** deadline przeniesiony do kontrolera `useRestTimerController` (kształt `{exerciseId, deadlineAt, totalSeconds, runId}`) z persystencją w localStorage (`fittracker_rest_state_v1`): kill apki w środku przerwy nie gubi odliczania — `resumeFromStorage()` po hydracji sesji (raz per mount, WorkoutDay) przywraca TEN SAM deadline; przy `isCompleted` zawsze stopRest. RestBar czysto prezentacyjny (deadline propsem, ±15 przez `onAdjust` do właściciela, tykanie 250 ms zostaje — kontrakt R2-07); efekt notyfikacji z dep `[runId, deadlineAt]` i t/exerciseLabel w refach — zmiana języka/nazwy nie restartuje przerwy, a korekta ±15 nadal przeplanowuje notyfikację. **Z189 (samonaprawa, 3 fixy):** (1) kolejność w efekcie końca: NAJPIERW `onFinished` (stan), POTEM sygnały w try/catch (`rest-finish-signal-failed` do client_errors) — wyjątek dźwięku nie zostawia wiszącego paska; (2) watchdog w kontrolerze: gdy deadline minął o >3 s a stan żyje (RestBar odmontowany przez błąd), tick 1000 ms zeruje stan + localStorage + notyfikację; (3) bramka końca treningu fail-open: nowa czysta funkcja `shouldStartRest` (`exercises.length === 0 || hasRemainingWork(...)`) — pusta/nie zasiana lista dnia STARTUJE timer zamiast go gasić. **Z190 (bramka sekwencji):** jeden przebieg W→0:45 → robocza→1:30 → przejęcie przez B (2:30, jedna notyfikacja) → ostatnia seria gasi wszystko; osobno kill w środku przerwy → resume z tym samym deadline. Metoda: test-first (RED przed każdym fixem). Weryfikacja: vitest PASS 1191/1191, typecheck 0, lint 0. Commity: 36e80f34, 876eb38f, 78304e8b + Z190.

### 2026-08-05 — X23 FAZA 1: sesja nieśmiertelna — serie wracają 1:1 po force-quit (Z182-Z186)

**Kontekst (realny trening 2026-08-04, build 81):** po force-quit i „Kontynuuj trening" RDL pokazał wskrzeszoną drabinkę rozgrzewkową 4xW i zdublowane serie. **Diagnoza read-only (Z182, REST runQuery z tokenem `gcloud --account g.jasionowicz@gmail.com`):** dokument `workout-...-day-2-2026-08-04` w chmurze jest CZYSTY — RDL ma dokładnie 3 serie robocze (50/70/85 kg × 6, wszystkie completed), zero wierszy isWarmup, zero kluczy `__swap-` (klucze: tpl-ex-35..39, revision 27). Wniosek: wskrzeszenie było czysto lokalne (starszy snapshot draftu) = klasa H2; finalny sync poszedł już z poprawionym stanem. Fixy pokrywają wszystkie trzy klasy: **Z182 (H2a)** `resolveFresherFallback` w `workout-draft-db.ts` — po udanym odczycie IDB porównanie z fallbackiem localStorage tej samej sesji: wyższa `version` (tiebreaker `updatedAt`) wygrywa, zwycięzca dziedziczy brakujące pola z rekordu IDB i wraca do IDB przez `saveActiveDraft` (guard Z175 nienaruszony); starszy/obcy fallback ignorowany. **Z183 (H2b)** `workout-hydration.ts`: rozjazd `sessionId` draft↔chmura przestał bezwarunkowo wybierać chmurę — dirty draft NOWSZY niż `workout.updatedAt` wygrywa (force-quit tuż po promocji sesji); czysty albo starszy draft: chmura (ochrona przed zombie). **Z184 (H3)** `sanitizeSets` NIE fabrykuje już pustego wiersza W, gdy zapis go nie ma (usunięta rozgrzewka nie wraca po resume; W przy NOWEJ liście nadal z `createEmptySets`/`createPrefilledSets`; jedyne wywołania: mount+resync ExerciseCard — żadne nie polegało na fabrykacie). **Z185 (H1)** tożsamość swapu „tylko dziś" przeżywa restart dwuwarstwowo: (1) persystencja — pole `sessionSwaps` w `ActiveWorkoutDraft` (WYŁĄCZNIE IndexedDB + fallback localStorage, NIE Firestore — rules mają schema-checks), zapis w `handleApplySwap`, dziedziczenie w `buildWorkoutDraftSnapshot`, odczyt w `applyWorkoutState`; (2) samonaprawa — `buildDayFromDraft` mapuje klucz `${planId}__swap-...` na kartę planu i ją ZASTĘPUJE (extras tylko dla prawdziwych ad-hoc); draft anormalnie z oboma kluczami renderuje obie karty (zero utraty edycji). **Z186** bramka sekwencji: NOWY `e2e/resume-after-kill.spec.ts` (start z planu → 4xW z generatora → odhacz 4W+2 robocze → poll draftu → wyjście → reload/kill → auto-resume X10 lub „Kontynuuj trening" → serie 1:1 → „Zakończ trening" dostępny). Metoda: test-first każdego fixu (RED przed implementacją). Weryfikacja: vitest PASS 1175/1175 (w tym zaktualizowany helper `checkFirstOpenSet`, który zakładał fabrykat W), typecheck 0, lint 0, spec e2e PASS. Commity: ef4f5d87, de90e75c, 379e247a, 66e3f860 + spec.

### 2026-08-03 — X22 WPIS ZBIORCZY: zgłoszenia z builda 80 naprawione u źródła (Z170-Z181)

Plan `docs/PLAN-X22-2026-08-03.md` wykonany w CAŁOŚCI metodą test-first (każdy fix ma test, który był CZERWONY przed implementacją; szczegóły per faza w pięciu wpisach poniżej). Zakres: **F1** usuwanie serii (Z170 dialog stabilny/klikalny, Z171 usuwanie po referencji + dialog tylko dla realnych danych); **F2** Dashboard (Z172 bez defaultPlan przy nieznanym planie, Z173 świeże `today` + guard daty kafli, Z174 jeden CTA aktywnej sesji, Z175 promocja provisional bez wchodzenia w trening + guard wersji draftu w IDB); **F3** wideo (Z176 miniatury bez autoplay, twardy start w dialogu, biblioteka bez hovera); **F4** dźwięk/ekran (Z177 AudioContext odporny na interrupted/closed, reaktywacja sesji audio w AppDelegate, keep-awake self-healing, wiersz Dźwięk zawsze widoczny; diagnoza read-only: `preferences.timerSound=true` — mirror nie wyciszał); **F5** separator (Z178 przecinek wszędzie, koniec cichego zerowania); **F6** share (Z179 plist+downscale+JPEG+lazy html2canvas+Pobierz natywnie, Z180 szablony z logo). **F7 (Z181):** pełne bramki z jawnymi exit code — test 134 pliki / 1160, typecheck 0, lint 0, build OK, bundle 1 531 095 / 1 536 000 B (limit NIE podnoszony), dist-smoke PASS, dist-offline PASS, e2e:mock 192 passed; sekwencje obowiązkowe pokryte: (1) `full-app.spec.ts:1422` plan→wyjście→szybki→powrót, (2) `exercise-card-v3.spec.ts` „Z171: usunięta seria nie wraca...", (3) provisional→jeden CTA→promocja po online: `dashboard-active-session.test.tsx` + `auto-sync-provisional.test.ts` + e2e wariant offline w `plan-edit-during-workout.spec.ts`. Wdrożone: web gh-pages (bundle `index-DtDIdtPz.js`), iOS build 81 (TestFlight + auto-dystrybucja `testflight_external.py` w pipeline release-ios.sh). Tech debt dopisany do PLAN.md (sekcja ODŁOŻONE planu X22).

### 2026-08-03 — X22 FAZA 6: udostępnianie bez crasha + szablony z logo (Z179, Z180)

**Z179 (crash po „Dodaj zdjęcie", martwy „Pobierz", obraz 1.3 MB):** trzy root cause. (1) `capture="environment"` wymuszał aparat, a `Info.plist` nie miał `NSCameraUsageDescription` → TCC ubija proces; fix: capture usunięty (wybór z galerii) + OBA opisy użycia w plist (picker WKWebView oferuje też aparat). (2) 12 MP bez downscale = kilka kopii base64 w pamięci WKWebView; fix: `downscalePhoto` (createImageBitmap z `imageOrientation:'from-image'`, canvas ≤1080×1920, JPEG 0.8, `bitmap.close()`, fallback `<img>.decode()` dla Safari <16.4). (3) `<a download>` ignorowany przez WKWebView; fix: „Pobierz" natywnie idzie przez share sheet (iOS ma „Zapisz obraz"), web zostaje z anchorem; wspólny `systemShare` ignoruje `AbortError`. Format wynikowy: JPEG 0.85 z tłem `#0f172a` (JPEG bez alfy — przezroczyste piksele robiły czarne artefakty), nazwa `trening-{data}.jpg`. `html2canvas-pro` przeszedł na lazy import w `generateWorkoutImage` — initial JS 1 531 095 / 1 536 000 B (budżet PASS). Gate share przez `navigator.canShare?.()` (TS2774: `navigator.share` jest w typach zawsze zdefiniowane).

**Z180 (szablony z logo):** stopki wszystkich szablonów przez wspólny `renderFooter` z realnym logo (`import app-icon.png`, hashowany URL z bundla) zamiast tekstowego „SS"; typ `ShareTemplate = gradient | photo | minimal`; NOWY wariant `minimal` (tło `#0b0b0f`, tonaż 76 px, wiersz liczb, zero nowej logiki danych); `dim` (0.3-0.7) parametryzuje przyciemnienie zdjęcia. Dialog: rząd 3 chipów z zapamiętaniem wyboru (`fittracker_share_template_v1`), „Dodaj zdjęcie" auto-przełącza na `photo`, chip „Zdjęcie" bez zdjęcia otwiera picker (reguła 6), klucze i18n w OBU locale. Commit wspólny Z179+Z180 (te same dwa pliki). Bramki: vitest 134 pliki / 1160, typecheck 0, lint 0, build + bundle budget PASS, e2e:mock 192 passed.

### 2026-08-03 — X22 FAZA 5: przecinek dziesiętny bez cichej utraty danych (Z178)

**Z178 („47,3" vs „49.6" — zapis 0 kg):** root cause = `input type="number"` + `parseFloat(...) || 0`. Klawiatura PL podaje PRZECINEK: „47,3" to dla type="number" tekst, którego React nie nadpisze; wariant WebKit sanituje wejście do `""` i `||0` robił **zapis 0 kg (cicha utrata)**; `Number("82,4")=NaN` blokował zapis pomiarów; RPE z przecinkiem = NaN znikające po powrocie. Fix systemowy: NOWY `src/lib/decimal-input.ts` — `parseDecimalInput` (przecinek/kropka, separatory tysięcy w tym U+00A0/U+202F, kontrakt: **null = „nie zmieniaj stanu", nigdy 0**; jawny guard na stan pośredni „47," — Number('47.') dałoby 47) + `formatDecimalInput`. Komponent `DecimalInput` w ExerciseCard (wzorzec DurationInput: type="text" + inputMode="decimal", lokalny draft, commit na bieżąco dla wartości parsowalnych, jawny `onClear` dla pustego pola — waga→0, metryka→delete, blur wraca do postaci z kropką). Przepięte: waga główna/wdd/asysta, metryki rpe/ból/jakość (`handleMetricChange` przyjmuje number|null zamiast raw stringa), `MeasurementsForm` (nieparsowalne pole → NaN → walidacja odrzuca ZAPIS, nie dane), `PlateCalculatorSheet` (3 pola), `AddCardioDialog` (minuty/dystans + guard przycisku; martwy `replace(',', '.')` usunięty), `chart.tsx` toLocaleString('en-US'). Wyświetlanie ZOSTAJE z kropką (spójne z Watch/PDF/share) — `units.ts` nietknięte. E2E: 8 speców przepięte z roli `spinbutton` na `textbox` (pola kg/Asysta przestały być type="number"). Bramki: vitest 133 plików / 1157, typecheck 0, lint 0, e2e:mock 192 passed.

### 2026-08-03 — X22 FAZA 4: dźwięk odporny na iOS + keep-awake z samonaprawą (Z177)

**Z177 (cisza gongów do restartu apki + ekran gaśnie mimo ustawienia):** trzy root cause naraz. (1) **AudioContext:** media sessions wideo (Z176 wprowadziło `<video>` na trening) wpychają współdzielony kontekst w stan `interrupted`, a kod obsługiwał wyłącznie `'suspended'` (3 miejsca); system potrafi też kontekst ZAMKNĄĆ — closed jest nieodwracalne. Fix: `resumeIfNotRunning` (resume dla każdego stanu ≠ running), `getCtx` odtwarza kontekst po closed, `playSynth` w try/catch (ostatnia linia obrony przed ciszą nie może wywalić handlera odhaczenia). Telemetria przez NOWY `reportClientErrorWithCurrentUid` (global-error-telemetry) — timer-sound/keep-awake nie mają kontekstu uid, a nowe liczniki telemetrii wywaliłyby hasOnly w rules. (2) **Sesja audio iOS:** kategoria `.playback` ustawiana RAZ na starcie; po przerwaniu (telefon, Siri) system jej nie przywraca. Fix w AppDelegate: `configureAudioSession()` też w `applicationDidBecomeActive` + obserwator `AVAudioSession.interruptionNotification` (przy `.ended` rekonfiguracja); kompilacja zweryfikowana xcodebuild na symulator (exit 0). (3) **Keep-awake:** blokada zakładana raz per sesja, iOS zdejmuje idle-timer po powrocie z tła, błędy pluginu połykane. Fix: samonaprawa w LIBIE — moduł pamięta intencję (`held`), ponawia blokadę po `appStateChange(isActive=true)`; `allowScreenSleep` zdejmuje intencję; po `keepAwake()` weryfikacja `isKeptAwake()` (false → telemetria `keep-awake-not-applied`), błędy → `keep-awake-error`. Dodatkowo re-apply w listenerze WorkoutDay (z guardem isCompleted) i przy starcie każdej przerwy. (4) **Pułapka UI (reguła 6):** wiersz „Dźwięk" w Profilu wyszedł spod warunku `FEATURE_FLAGS.workoutTimers` — wyłączenie timera przerwy nie odcina już drogi do ustawienia dźwięku. (5) **Diagnoza danych (read-only, zero zapisów):** `users/U6GDdfg7GmP1k1xJuISIsK9uSUE2.preferences.timerSound = true` — mirror w Firestore NIE był przyczyną ciszy (odczyt REST z tokenem gcloud, pułapka X12: token musi być z konta `g.jasionowicz@gmail.com`, aktywne `grzegorzee@` dostaje PERMISSION_DENIED). Bramki: vitest 130 plików / 1147 (rest-settings.test dostał mock telemetrii — nowy import ciągnął Firebase do jsdom), typecheck 0, lint 0, e2e:mock 192 passed.

### 2026-08-03 — X22 FAZA 3: wideo ćwiczeń bez autoplay i bez freeze WebKit (Z176)

**Z176 (nieruchome klatki zamiast animacji + biblioteka bez podglądu na dotyku):** root cause = 7 autoodtwarzanych `<video>` naraz na ekranie treningu (limit dekoderów sprzętowych iOS — część nigdy nie startowała) + `opacity-80`/`backdrop-blur-sm` NA wideo (znany freeze kompozytora WebKit) + zero obsługi błędów; w bibliotece podgląd gated hoverem, który na dotyku nie istnieje. Animacje weszły commitem `wip` 532a2d74 do builda 79/80 bez review. Fix: (1) miniatura karty = statyczna pierwsza klatka (`preload="metadata"`, bez autoplay, przyciemnienie zwykłym `bg-black/30`), `onError` → fallback ikona + ślad `exercise-video-error` w client_errors (świadomie NIE nowy licznik telemetrii — hasOnly w rules); (2) dialog animacji i hero szczegółów: twardy start `play()` w `onLoadedMetadata` — odmowa autoplay (Low Power Mode) jest widoczna jako rejection i włącza natywne `controls` (reguła 6: user zawsze ma przycisk), hero chowa wtedy dekoracyjny badge i zdejmuje pointer-events z gradientu; (3) biblioteka: podgląd startuje z TAPNIĘCIA w miniaturę (stopPropagation — tap nie otwiera szczegółów), stan wyniesiony do rodzica = max 1 aktywne wideo naraz. NOWY `e2e/exercise-video.spec.ts` z lokalną fixture mp4 (route na `media.gjasionowicz.pl`): miniatury stoją, dialog gra albo pokazuje controls, tap przełącza podgląd. Bramki: vitest 1139, typecheck 0, lint 0, e2e:mock 192 passed; layout test karty zielony bez zmian asercji.

### 2026-08-03 — X22 FAZA 2: Dashboard mówi prawdę o planie i sesji (Z172-Z175)

**Z172 („stary plan" na Dashboardzie):** Dashboard renderował wbudowany `defaultPlan` („Klatka / Przysiad / Środek Pleców" = literalnie `trainingPlan.ts:96`) w dwóch oknach: zanim doszedł snapshot planu (gate czekał tylko na `isLoaded` treningów) i po błędzie snapshotu (handler robił `setPlan(defaultPlan)`). Fix: handler błędu ZOSTAWIA poprzedni stan (nowy `planError` z hooka, zerowany przy każdym dobrym snapshocie), gate → `if (!isLoaded || !planIsLoaded)`. Spinner nie zawiśnie: oba `isLoaded` ustawiane też w error-handlerach (`workout-read-store.ts:156`, error handler hooka). Niezmiennik: konto BEZ dokumentu planu dalej dostaje default (to legalny fallback). Testy: NOWY `dashboard-plan-source.test.tsx` (RTL Dashboard przez mocki hooków + REALNY hook przez `vi.importActual` z mockiem `onSnapshot`).

**Z173 („Pominięte" w środę, która nie nadeszła):** `today = useMemo(() => new Date(), [])` zamrożone przy mouncie, a WKWebView żyje dniami. Fix: NOWY `useToday` (stan = początek dnia; refresh na `appStateChange`/visibilitychange przez `addAppStateListener`, `focus` i timer najbliższej północy; referencja stabilna w obrębie dnia). Drugi rozjazd: lookup ukończenia kafli (`findWorkoutForRoute` z `allowDateFallback`) wciągał ukończony trening INNEGO dnia planu z tej samej daty → guard `today` (jak w WorkoutDay) w obu wywołaniach z `dayId`.

**Z174 (dwa CTA „Kontynuuj trening" + „Odhaczone serie: 0"):** baner sync i karta dnia czytały ten sam draft niezależnie, a licznik Dashboardu wliczał rozgrzewkę. Fix: wspólny memo `todayContinueDraft` (jedna decyzja: karta dnia jest właścicielem CTA; baner degraduje się do wiersza informacyjnego, wariant „Otwórz Sync Center" zostaje), licznik przez NOWY util `countCompletedWorkingSets` (deleguje do `sessionStats` — ta sama prawda co ekran treningu), kafel tygodnia przy żywym drafcie nawiguje na `?session=` zamiast `?autostart=true`. Zero nowych kluczy i18n.

**Z175 (baner „offline" wisi mimo 5G + „Odhaczone serie: 0" po autostarcie):** trzy współdziałające fixy. (1) `AutoSyncOnReconnect` przepuszcza też aktywne sesje provisional (kind=checkpoint; final wyłącznie dla `finalSyncPending`; dirty remote dalej obsługuje tylko WorkoutDay). (2) WorkoutDay: fire-and-forget flush + checkpoint przy unmount dla sesji provisional/dirty (refy na najświeższe callbacki — cleanup z pustymi deps widziałby pierwszy render) oraz pierwszy checkpoint provisional po 15 s (`PROVISIONAL_FIRST_CHECKPOINT_MS`) zamiast 5 min. (3) Guard wersji draftu w IDB: `runWrite` z flagą `skipIfNewerExists` robi get+put w JEDNEJ transakcji i odbija zapis z niższą wersją (autostart z kafla budował świeży stan version=1 i nadpisywał żywą sesję; mapa `latestWriteVersions` chroni tylko wyścigi w obrębie strony — po reloadzie WebView jest pusta). Ścieżki redirect/tombstone/runUpdate nietknięte.

**Bramki FAZY 2:** vitest 129 plików / 1139 testów, typecheck 0, lint 0, e2e:mock 189 passed (w tym sekwencja obowiązkowa `full-app.spec.ts:1422` plan → wyjście → szybki trening → powrót).

### 2026-08-03 — X22 FAZA 1: usuwanie serii działa za pierwszym tapnięciem (Z170, Z171)

**Z170 (USUŃ w dialogu nic nie robił — zgłoszenie z builda 80):** root cause = `transition-[top] duration-200` z Z159: po tapnięciu X klawiatura się chowa, `--keyboard-inset` spada do 0 i dialog ZJEŻDŻA ~150 px pod palcem przez 200 ms — tap trafia w overlay, Radix zamyka dialog bez akcji. Fix trójwarstwowy: (1) animacja top USUNIĘTA (pozycjonowanie względem `--keyboard-inset` zostaje — fix Z159 nietknięty, `keyboard-inset.test.ts` zielony), (2) `onInteractOutside={preventDefault}` na dialogu potwierdzenia — destrukcyjne potwierdzenie zamyka się TYLKO przez ANULUJ/X, (3) tap targety: przyciski dialogu `min-h-[44px] min-w-[88px]` + `data-testid`, X przy serii `h-11 w-11` z poszerzeniem ostatniej kolumny gridu 22px→44px (węższa kolumna kładła 44px X na checkmarku). Test RED→GREEN: outside pointerdown nie zamyka dialogu (pułapka testowa: Radix podpina listener w `setTimeout(0)` i na dotyku domyka dopiero na click — test musi zrobić tick + click).

**Z171 (dialog pytał o „zapisane dane" przy świeżej serii + usuwanie po indeksie):** root cause podwójny: (a) `handleAddSet` prefilluje reps/weight z ostatniej serii, więc nietknięta seria zawsze przechodziła `setHasData`; (b) `pendingRemoveIndex` trzymał INDEKS — podmiana `sets` (hydracja draftu) między otwarciem dialogu a USUŃ kasowała złą serię, a `removeSetAt` przy złym indeksie robił cichy no-op. Fix: `pendingRemove: SetData | null` (REFERENCJA, zero nowych pól w kształcie Firestore — rules mają schema-checks), `removeSet(target)` filtruje po `!==` z guardem stale-ref (ślad do `client_errors` przez `reportClientError`, phase 'other', code `remove-set-stale-ref` — świadomie NIE nowy event telemetrii: whitelist `counters.keys().hasOnly` w rules odrzuciłaby cały dzienny zapis), reset `pendingRemove` przy resync (otwarty dialog nie przeżywa podmiany sets), `touchedSets = WeakSet<SetData>` — dialog TYLKO dla serii odhaczonej (`completed`) albo dotkniętej w tym mount (`handleSetChange`/`handleToggleComplete` dodają NOWY obiekt). Świadomy tradeoff: seria z danymi hydratowana z draftu, nieodhaczona i niedotknięta po powrocie kasuje się bez dialogu (aplikacja nie odróżni jej od prefillu; ochronę realnych danych niesie `completed`). Testy RED→GREEN: prefill kasuje się bez dialogu i znika DOKŁADNIE on (round-trip przez kontrolowany wrapper), podmiana savedSets w trakcie dialogu nie kasuje złej serii; nowy e2e: sekwencja start → dodaj → wpisz → odhacz → usuń → Dashboard → powrót (seria nadal usunięta, draft wrócił).

**Bramki FAZY 1:** vitest 125 plików / 1123 testy, typecheck 0, lint 0, e2e:mock 189 passed (w tym nowy scenariusz sekwencji Z171).

### 2026-07-28 — X21: rozgrzewka pamięta odhaczenia + spójność i18n PL/EN (Z162-Z168)

**Z162 (odhaczenia rozgrzewki znikały — zgłoszenie usera):** root cause = `WarmupRoutineDialog` trzymał stan w lokalnym `useState<Set<number>>`, a efekt jawnie robił `setChecked(new Set())` przy KAŻDYM `open === false` (X, Esc, klik w overlay); klucz = indeks pozycji, więc niestabilny przy zmianie focusu (offset stretchingu zależał od długości listy rozgrzewki). Fix: dialog KONTROLOWANY (`checked: ReadonlySet<string>` po `nameKey` + `onToggle`), stan mieszka w drafcie sesji jako pole additive `ActiveWorkoutDraft.warmupChecked?: string[]` (bez bumpu wersji IndexedDB, wzorzec `lastTouchedExerciseId`), przeżywa round-trip przez IDB i fallback localStorage, odhaczenie liczy się jako zmiana treści (bump `version`). Pole NIE wychodzi do Firestore — payload syncu budowany jawnie (`buildDraftExercisesPayload` + `saveOptions`), zweryfikowane grepem. Nowa sesja = czysta rozgrzewka (reset w `applyWorkoutState`). Weryfikacja: `warmup-routine-dialog.test.tsx` (dialog + sekwencja odhacz/wyjdź/wróć/nowa sesja + niezmiennik legacy draftu bez pola), round-trip IDB i localStorage, NOWY `e2e/warmup-persistence.spec.ts` (realne klikanie: X, Escape, wyjście na Dashboard, powrót).

**Z163 (mieszane PL/EN w nazwach rozgrzewki):** polski słownik miał wartości angielskie (`Jumping Jacks`, `Child's Pose`, `Pigeon Pose`) albo dwujęzyczne (`Kręcenie biodrami (Hip Circles)`). Nowe wartości: Pajacyki, Krążenia bioder, Krążenia ramion, Koci grzbiet (na czworakach), Pozycja dziecka, Pozycja gołębia. Klucze `warmup.*`/`stretch.*` BEZ ZMIAN — to kanoniczne identyfikatory, od Z162 zapisywane w draftach sesji. Guard `warmup-i18n.test.ts` zostaje na stałe (PL bez angielskich wtrąceń, EN bez polskich znaków).

**Z164 (polskie stringi na ekranach EN):** `HRZoneConfig.name` → `nameKey: TranslationKey` (render przez `t()` w obu konsumentach); `getWeekLabel` i format miesiąca per język (`strava.week*` + `DF_LOCALES = {pl, enUS}`), pięć funkcji `compute*` przyjmuje `lang` z domyślnym `'pl'` (niezmiennik starych callerów), komponenty Strava przekazują język z `useTranslation`; `PLAN_DESC['tpl-rza-3']` (jedyny szablon bez opisu EN) — guard skanuje teraz WSZYSTKIE szablony; `useWatchPlanPreview` dokłada `lang` do obu payloadów podglądu (nazwy ćwiczeń zostają kanoniczne PL — dopasowanie serii po nazwie). Follow-up z e2e: dialog rozgrzewki pokazywał focus dnia kanonicznie po polsku również w EN → `localizeFocus(focus, lang)`.

**Z165 (panel admina pół na pół):** ~90 nowych kluczy `admin.*` w obu locales, ~70 literałów PL podmienionych w 7 plikach (dialogi, toasty, kafle pulsu, filtry, sortowania, logi, flagi, broadcast). `admin-user-types.ts` (moduł bez Reacta): `description` → `descriptionKey: TranslationKey`; `admin-audit.ts`: `formatRepairOperations(ops, lang = 'pl')` przez `translate`. Przy okazji: klucz `admin.revoke` miał w polskim słowniku wartość angielską. Definicja „done" zakodowana w `admin-i18n-scan.test.ts` — polski znak w `src/pages/admin` lub `src/components/admin` poza komentarzem wywala test.

**Z166 (hardcodowane EN w UI):** sr-only zamknięcia dialogu, aria-label nawigacji, „Max HR" i komunikaty błędów `cycle-actions` przez `t()`/`translate` (`lang?: LanguageCode` w Deps, default PL = niezmiennik). E2E wyłapało kolizję: sr-only „Zamknij" miało tę samą nazwę dostępnościową co przyciski akcji „Zamknij" w tym samym dialogu (strict mode violation + realny problem dla czytnika ekranu) → `a11y.close` = „Zamknij okno" / „Close dialog". Nieużywane komponenty shadcn (pagination, breadcrumb, sidebar) świadomie nietknięte (0 importów).

**Z167 (backend po polsku niezależnie od konta):** `daily-reminder` czyta `users.language` — EN dostaje „Hey {imię}! Time to train 💪" z focusem tłumaczonym portem mapy tokenów (`functions/src/focus-en.ts`, wzorzec `exercise-name-en.ts`); brak pola = dotychczasowy push PL 1:1. `inviteEmailHtml(code, url, note, lang = 'pl')` + subject per język (`lang` z payloadu, dziś wysyłki PL, parametr przyszłościowy). Test parytetu obu map focus (klient vs functions) — rozjazd oznaczałby polski focus w powiadomieniu EN. Wdrożone: `firebase deploy --only functions` (Deploy complete).

**Z168 (architektura dwujęzyczna → n-językowa):** `dateLocale` przez `DATE_LOCALES` z fallbackiem, selektor języka w Profilu generowany z rejestru `LANGUAGES`, binarne `lang === 'en'` zastąpione nakładkami `Partial<Record<LanguageCode, ...>>` (nazwy ćwiczeń, instrukcje, kategorie, dni, skróty, tokeny focusu, teksty planów) — istniejące testy przeszły BEZ zmiany asercji (to był test niezmiennika). Typy `language?: LanguageCode` + walidacja przez rejestr zamiast literałów. Globalny `i18n-hardcoded-scan.test.ts`: polski znak w `src/` poza allowlistą (12 plików, każdy z uzasadnieniem: wartości kanoniczne, klucze lookup, normalizacja diakrytyków, kod poza LanguageProvider) = czerwony test; drugi test pilnuje, że allowlista nie ma martwych wpisów. `docs/I18N-NOWY-JEZYK.md` = checklist dodania języka (klient, nakładki, functions, Garmin/Watch, warstwa statyczna) z ostrzeżeniem, że trzeci pełny słownik wymaga lazy-loadu locale (bundle).

**Bramki:** test 125 plików / 1114 testów, functions 151, typecheck + lint 0, build OK, bundle 1 529 471 / 1 536 000 B (limit NIE podnoszony), dist-smoke, dist-offline, e2e:mock 188 passed. **Wdrożone:** web (`index-S1tEjfK8.js`), functions (prod), iOS build 80 (TestFlight, betaReviewState APPROVED).

### 2026-07-28 — X20: zgłoszenia z builda 78 — analityka bez czarnego ekranu, push, i18n, timer z przełącznikiem, klawiatura, digest, usuwanie treningu (Z154-Z161)

**Z154 (czarny ekran analityki po powrocie z tła):** root cause = handler `vite:preloadError` w main.tsx robił `preventDefault()`, przez co błąd chunka NIE rzucał — catch w `lazyWithRetry` był martwym kodem, `lazy` dostawał undefined, a reload szedł BEZ guarda antypętlowego. Fix: handler USUNIĘTY; `loadChunkWithRetry` (walidacja `chunk-empty`, retry 500 ms w miejscu, guard sessionStorage) + licznik antypętlowy w `requestGuardedReload` (max 2 reloady/60 s, telemetria `reload-loop-guard`); 5 gołych `lazy(` przepięte na `lazyWithRetry`; `TabBoundary` per zakładka analityki (fallback z "Spróbuj ponownie", reset przez key); top-level ErrorBoundary czyta uid z auth W MOMENCIE catcha (App nie re-renderuje się po zalogowaniu); nowy `global-error-telemetry.ts` (`window-error`/`unhandled-rejection` → client_errors). Weryfikacja: lazy-with-retry 5/5 (RED→GREEN), pwa-update-guard 4/4, error-boundary 4/4.

**Z155 (push "idź na trening" w trakcie treningu):** guard X18C sprawdzał `startedAt || completed`, ale klient wysyłał `startedAt` dopiero przy finalnym syncu — realny aktywny trening to doc `{completed:false}` bez startedAt (test X18C mockował dokument, jakiego klient nie produkował). Fix dwustronny: backend pomija push gdy dokument dnia ISTNIEJE (samo istnienie = zaczął/skończył); klient pisze `startedAt` od `createWorkoutSession` i w checkpointach (zdjęty warunek `requiresFinal`). Rules bez zmian (`validWorkoutShape` już dopuszczał startedAt). Margines: okno start→pierwszy checkpoint (tech debt w PLAN.md). Weryfikacja: daily-reminder 14/14 (RED na realnym kształcie dokumentu), sync engine z asercją startedAt w checkpoincie.

**Z156 (nazwy ćwiczeń po polsku przy EN):** 5 ścieżek omijało lokalizację (weekly-summary, rza-metrics, all-time-stats, cycle-insights, dialog progresji) + w mapie EN brakowało nie 12, a **30 nazw** (test inwentarzowy wykrył też szablony RZA/hybrydowe). Kontrakty zakodowane komentarzami i testami: prop `ExerciseProgressionDialog` = kanoniczna PL (lokalizacja WEWNĄTRZ), `isBodyweightExercise` przyjmuje kanoniczną PL (w EN zwracał zawsze false → wykresy bodyweight pokazywały kg zamiast reps); resolver dostał `resolveCanonicalExerciseName`. Test inwentarzowy zostaje na stałe (blokuje przyszłe luki). Weryfikacja: coverage + sekwencja przełączenia języka (PL→EN, zero polskich nazw) + weekly-local 5/5.

**Z157 (timer przerwy z przełącznikiem, default ON):** precedencja `e2eOverride ?? ustawienie usera (localStorage, bez mirrora Firestore — jak keep-awake) ?? default ON`. EMOM/AMRAP + rozgrzewka ZOSTAJĄ wyłączone za NOWĄ flagą `VITE_FEATURE_INTERVAL_TIMERS` (mają tylko setInterval — milkną przy zgaszonym ekranie; dług Z10, warunek zdjęcia w PLAN.md). Przełącznik w Profilu nad wierszem czasu odpoczynku (SettingRow z opisem); wiersze zależne chowają się natychmiast. Konsekwencja web: timer domyślnie ON także na webie — domyka wiszącą decyzję "flaga web" z X18. Weryfikacja: feature-flags 9/9 (RED→GREEN), e2e przepisany na wyłączenie przez ustawienie usera, e2e:mock 183/183.

**Z158 (kafle statystyk ucinane):** kafle tekstowe (ulubione ćwiczenie, "Trenujesz od") dostały `col-span-2` + `break-words` zamiast `truncate`; liczbowe bez zmian (truncate+tabular-nums, niezmiennik w teście). Weryfikacja: all-time-stats-sheet 3/3 (RED→GREEN).

**Z159 (klawiatura zasłania modale):** `@capacitor/keyboard` z `resize: 'none'` — globalny layout NIE drga (fixed bottom bary WorkoutDay); kompensują wyłącznie dialogi przez CSS var `--keyboard-inset` (`keyboard-inset.ts`: natywnie keyboardWillShow/Hide, web fallback visualViewport). `dialog.tsx`/`alert-dialog.tsx`: top liczony względem widocznego viewportu + `transition-[top]`. Jedna zmiana naprawia wszystkie dialogi z inputami. Weryfikacja: keyboard-inset 3/3; scenariusz na fizycznym iPhone = krok usera (jsdom nie pokrywa).

**Z160 (mail tygodniowy):** pełne podsumowanie zamiast 2 kafli: statystyki (tonaż METODĄ APKI — port setTonnage z guardami na uszkodzone dokumenty; crash 2026-07-20 nie wyklucza cicho usera), PR-y tygodnia względem historii, porównanie WoW, top 3 ćwiczenia, sekcja biegowa, i18n PL/EN (users.language), jednostki wg preferences.unit, layout WYŁĄCZNIE `<table>` (Gmail/Outlook wycinają flex), preheader, stopka z opt-outem. Poprzedni tydzień wycinany z kwerendy historii (2 kwerendy zbiorcze zamiast 3); koszt pełnej historii odnotowany w komentarzu. Port mapy nazw EN w functions pilnowany testem 1:1 z mapą klienta. Wysyłka testowa na g.jasionowicz@gmail.com przez `functions/send-test-digest.cjs` (ta sama ścieżka co harmonogram, guard na inne adresy): sent:1, temat "💪 5 treningów, 28.3 t — Twój tydzień 20 lipca - 26 lipca 2026". Ocena w skrzynce = krok usera przed poniedziałkiem.

**Z161 (usuwanie treningu z widoku treningu):** Historia miała pełny przepływ — WorkoutDay wystawia TĘ SAMĄ ścieżkę (`deleteWorkoutEverywhere`: dokument + szkic IDB + kolejka syncu, nigdy goły deleteDoc) w widoku podsumowania zapisanej sesji (ghost destructive + AlertDialog wzorem Historii, reuse kluczy history.*). Niezmiennik: trening W TOKU nie renderuje akcji (test e2e). Weryfikacja: workout-delete-from-day.spec 2/2 (RED→GREEN).

**Zastane w drzewie (poza X20, nie ruszane):** zmiany garmin/ (wątek CIQ) + `firestore.indexes.json` (composite index workouts userId+date dopisany przez równoległy proces innej sesji).

**Deploy:** functions (dailyTrainingReminder + weeklyDigest) na prod; web `npm run deploy`; iOS build 79 → TestFlight (obie grupy + Beta App Review przez testflight_external.py).

### 2026-07-24 — X19: id dni aktywnego cyklu niezmienne przy każdym zapisie planu (Z150-Z153) + fix jednostki inwentarza talerzy

**Niezmiennik (Z151, zakodowany w testach):** id dnia aktywnego cyklu nadane przy starcie cyklu jest niezmienne do końca cyklu. Sync planu do cyklu może dni AKTUALIZOWAĆ i DOKŁADAĆ, nigdy nie zmienia id istniejących. Realizacja: `alignPlanDaysWithCycleIds` (`plan-cycle-utils.ts`) — id obecne w cyklu lub w formacie cyklu zostaje; dzień w obcym formacie dopasowany po pozycji+weekday dostaje id dnia cyklu (treść z planu, id ćwiczeń nietknięte); nowy dzień dostaje świeże `${cycleStartDate}-dN`. Wyrównany zestaw idzie do `training_plans.days` ORAZ patcha cyklu (w tej samej transakcji `saveTrainingPlanWithRevision`); gałąź e2e-mock `savePlan` wyrównuje tak samo (cykle z `fittracker_e2e_cycles`), żeby e2e testowało realny kontrakt.

**Wektory dryfu (zweryfikowane w Z150, mapa skutków w PLAN-X19):** `resetToDefault` (plan default `day-N` nadpisywał id cyklu), `addPlanDay` (zawsze `day-N`), zapis z buildera/szablonu. Skutki przed fixem: Dashboard linkuje id z PLANU → po podmianie żywy draft nieodnajdywalny (auto-resume prowadzi w `dayNotFound` albo dzień tylko z dotkniętych ćwiczeń), ukończony dziś trening niewidoczny dla karty dnia (druga sesja tego samego dnia), mieszanka prefiksów id ćwiczeń.

**Weryfikacja:** testy align 16/16 (czerwony bieg na starym zachowaniu: 4 fail); niezmienniki starych przepływów `training-plan-save.test.ts` (resetToDefault→id cyklu, addPlanDay→format cyklu, edycja ćwiczenia→id bez zmian, plan bez cyklu→`day-N`); e2e `plan-cycle-day-ids.spec.ts` 2/2 (czerwone na kodzie sprzed Z151: `day-4` zamiast `${START}-d4`, po resecie `day-1..3`); pełna suita 1049, e2e:mock 181/181, bramki dist w kolejności mobile+smoke→web+offline zielone.

**Audyt produkcji (Z153):** `scripts/repair-cycle-day-ids.mjs` (dry-run domyślny, workouts NIGDY nie modyfikowane, wyrównanie plan/cykl do formatu HISTORII). Dry-run g.jasionowicz@gmail.com: 1 aktywny cykl, plan+cykl+historia spójnie `day-1..4` (32 workouts planowe, 4 adhoc), ZERO rozjazdów — apply niepotrzebny.

**Fix przy okazji (zgłoszenie usera z builda 77):** przełącznik jednostki inwentarza talerzy KG/LBS wyglądał na martwy — preset się aplikował, ale jednostka nie była persystowana ani pokazywana (nominały w kg: `20.412 kg` zamiast `45 lbs`). Teraz: pole `unit` w `fittracker_plate_inventory_v1` (legacy bez pola = kg), aktywny przycisk z `aria-pressed`, nominały i nagłówek w jednostce inwentarza (`formatPlateNominal`), wpis własnego talerza interpretowany w jednostce inwentarza. i18n: `plates.availablePlates` z parametrem `{unit}` w PL i EN (parytet kluczy pełny, wymusza go typecheck).

**Deploy:** web `index-Btkz95fT.js` na live (hash zweryfikowany curl-em). iOS: po potwierdzeniu builda 77 przez usera (realny trening OK) — build 78 na TestFlight tym samym dniem (X19 + fix jednostki inwentarza): upload SUCCEEDED, obie grupy podpięte, Beta App Review APPROVED; Robert dostaje build automatycznie.

### 2026-07-24 — X18C: reminder bez spamu, gong bez Now Playing, czytelny pasek tygodnia (Z146+Z147+Z148)

**Warunek pomijania porannego pusha (Z146):** `runDailyReminder` czyta dzisiejszy trening kandydata (1 query per kandydat po dotychczasowych filtrach, composite index workouts userId+date istniał): `startedAt` obecny LUB `completed=true` → skip (licznik `skippedActive` w logu). Świadome ograniczenie: draft offline niewidoczny dla backendu — trening rozpoczęty offline bez syncu nadal dostanie push.

**Los `presentationOptions` (Z146):** bez `'alert'` (zostaje badge+sound) — w foregroundzie prezentację przejmuje w całości kontrolowany toast. Payload dostaje `data.type='daily-reminder'`, a klient (czysty moduł `push-foreground`, bez importów Firebase) nie pokazuje toastu tego typu na ekranie treningu. Koniec podwójnego banera.

**Rewizja decyzji 2026-07-20 "HTMLAudioElement przed WebAudio" (Z147):** tamta decyzja dotyczyła SYNTEZY dźwięku, nie odtwarzania zdekodowanego PLIKU. Media element w WKWebView rejestrował apkę w Now Playing (widget odtwarzacza z paskiem 0:02 = długość wav). Teraz: fetch + decodeAudioData + bufferSource (cache per plik, porażka nie zostaje w cache), synteza WebAudio zostaje fallbackiem, `unlockTimerSound` prefetchuje wybrany plik w geście. Kategoria `.playback` w AppDelegate ZOSTAJE (dźwięk mimo przełącznika ciszy). Zero `new Audio(`/`<audio` w src/. Domyślny dźwięk: GONG (`rest_bell.wav`), etykieta ujednoznaczniona "Gong (dzwon bokserski)". Test słyszalności na fizycznym iPhone czeka na usera (plan B: natywny AVAudioPlayer, tylko jeśli WebAudio padnie na urządzeniu).

**Pasek tygodnia (Z148):** pokazuje WYKONANE obciążenie — dostał własny mikronagłówek ("Obciążenie treningowe · czas × intensywność"), min 3 px słupka z obciążeniem, legendę siła/cardio i kropki dni planu (`plannedWeekdays` z Dashboardu). "Plan tygodnia" zostaje nagłówkiem listy kart dni. Zrzuty przed/po: docs/assets/z148-week-strip-*.png.

**Weryfikacja:** functions daily-reminder 13/13, push-foreground 3/3, timer-sound 5/5, hybrid-week-strip 5/5 (wszystko RED→GREEN); pełny vitest 1031/1031; e2e:mock 179/179; bundle 1 515 062 B (limit 1 536 000); deploy functions potwierdzony (updateTime 2026-07-24T09:26Z, ACTIVE).

### 2026-07-24 — X18B: timery przerw v2 — jeden timer, koniec treningu bez timera, pełna widoczność (Z143+Z144+Z145)

**Co:** Timer przerwy to jeden spójny mechanizm sesji: nigdy nie biegną dwa naraz, nie startuje po ostatniej serii całego treningu, jest w pełni widoczny w ukończonej karcie.

**Właściciel stanu timera (Z143):** stan `{exerciseId, seconds, runId}` przeniesiony z `useState` per instancja ExerciseCard do WorkoutDay (`useRestTimerController`). Karta dostaje `restRun` tylko gdy przerwa jest jej; callbacki stabilne (memo/R2-07 zachowane), tykanie zostaje w RestBar. Odhaczenie w B przejmuje przerwę z A: unmount paska A anuluje notyfikację, mount B planuje nową (serializuje `operationChain`). Nowość: `RestBar.onFinished` — koniec przerwy w foregroundzie zeruje stan (pasek znika, karta może się przygasić).

**Wyjątek ostatniej serii (Z144):** `hasRemainingWork(exerciseSets, skipped, exercises)` w workout-session-state — po ostatniej serii roboczej ostatniego niepominiętego ćwiczenia handler NIE startuje timera i gasi biegnącą przerwę + notyfikację. Rozgrzewka nie jest pracą; ćwiczenie bez stanu serii (dodane w trakcie) jest. `exerciseSetsRef` aktualizowany synchronicznie w handleSetsChange (decyzja w tym samym kliknięciu). Zero nowego UI — zostaje przycisk "Zakończ trening".

**Warunek dimmingu (Z145):** przygaszenie ukończonej karty tylko `allCompleted && !restActive` — opacity rodzica jest multiplikatywne i wyszarzało pasek dokładnie wtedy, gdy odliczał przejście do następnego ćwiczenia.

**Status flagi:** `VITE_FEATURE_WORKOUT_TIMERS` bez zmian — web OFF, buildy iOS ON. Zdjęcie flagi web bramkowane potwierdzeniem usera z fizycznego iPhone'a (Z149 krok 3).

**Weryfikacja:** rest-timer-controller.test.tsx (przejęcie A→B: 1 pasek + 1 notyfikacja z księgującego mocka LocalNotifications; sekwencja Z144; dimming Z145; niezmienniki ±15/Pomiń/start po serii) — RED na starym kodzie, GREEN po; hasRemainingWork 5 przypadków; pełny vitest 1018/1018; e2e:mock 179/179; bundle bez zmian (1 514 702 B).

### 2026-07-24 — X18A: autostart kasował serie po edycji planu dnia + czas 48:08:47 (Z141+Z142)

**Co:** (1) Edycja planu dnia w trakcie treningu nie kasuje odhaczonych serii. (2) durationSec liczony do ostatniej realnej aktywności, nie do kliknięcia "Zakończ trening".

**Root cause 1 (reset serii):** `?autostart=true` żył w historii przeglądarki (Dashboard nigdy go nie zdejmował). Powrót (back) z `/plan/edit` montował WorkoutDay na świeżo: `autostartDone` ref świeży, `sessionId` w domknięciu efektu jeszcze `null` (hydracja ustawia go setState'em niewidocznym w tym samym przebiegu) → `handleStartWorkout()` startował NA ŻYWEJ SESJI. Gałąź provisional nadpisywała draft deterministycznie (`initialDraft` z `version: 1`), gałąź remote — zależnie od wyścigu z hydracją (`exerciseSetsRef` pusty na świeżym mouncie).

**Fix 1:** `shouldAutostartWorkout` (czysta funkcja: start/resume/scroll-only/none; draft z treścią → resume) + zdjęcie parametru z URL po konsumpcji (`setSearchParams` replace) + guard bliźniak w `handleStartWorkout` (`buildStartExerciseSets`: draft z bazy źródłem prawdy, prefill tylko brakujących; `buildStartDraft`: adopcja żywego draftu — serie/notatki/startedAt/wersja zostają).

**Root cause 2 (48:08:47):** `durationSec = finalizedAt - startedAt` bez capa; `finalizedAt` = moment kliknięcia "Zakończ trening", nawet 48h po treningu.

**Fix 2:** `ActiveWorkoutDraft.lastActivityAt` (opcjonalne, bump tylko przy zmianie treści draftu — detekcja `contentUnchanged` w snapshocie; snapshoty techniczne nie ruszają) + `computeEffectiveDurationSec`: przerwa bez akcji > 60 min → koniec = lastActivityAt + 3 min bufora. `completedAt` zostaje momentem zapisu (porządek syncu). Jedno źródło prawdy: silnik finalizacji + kafel "Czas".

**Weryfikacja:** e2e sekwencji `plan-edit-during-workout.spec.ts` (autostart → 2 serie → /plan/edit → dodaj ćwiczenie → back → serie nietknięte + wariant offline/provisional) — RED na kodzie sprzed fixa, GREEN po; unit: workout-autostart 11, workout-start 18, snapshot +5, silnik +3 (clamp RED→GREEN); pełny vitest 1006/1006.

**Naprawa danych (czeka na usera):** dry-run `scripts/repair-duration-outliers.mjs` znalazł 1 rekord: 2026-07-21 Wtorek 48:08:47, 17 serii → propozycja 51 min (17×3 min) albo 60 min wg słów usera. Zapis dopiero po potwierdzeniu.

**Przy okazji (środowisko):** dev server wisiał na skanie zależności po każdym czyszczeniu `node_modules/.vite` — domyślny glob `**/*.html` vite trafiał w `build/sim` (3,1 GB derivedData z cyklicznymi symlinkami xcframeworków). Fix: `optimizeDeps.entries: ['index.html']`. Seam e2e: dni planu w `fittracker_e2e_plan.days` (localStorage), zapis planu bez Firestore w trybie mock.

### 2026-07-20 — dźwięk końca przerwy: root cause i wybór dźwięku (build 74 → 75)

**Sekwencja diagnostyczna (trzy testy usera na urządzeniu, trzy różne przyczyny):**

1. **Build 71:** „cicha wibracja, nic więcej". Przyczyna: koniec przerwy wołał `hapticImpactLight` (najsłabszy impuls). Fix: `hapticRestEnd` z wzorcem notyfikacyjnym + trzema ciężkimi uderzeniami.
2. **Build 73:** dźwięk działa na aktywnym ekranie, w tle nadal cisza. Przyczyna w foregroundzie była systemowa: kategoria sesji audio WKWebView (`.ambient`) jest wyciszana bocznym przełącznikiem ciszy. Fix: `.playback` + `.duckOthers` w `AppDelegate`.
3. **Build 74:** w tle nadal cisza. **ROOT CAUSE znaleziony w źródle pluginu**, nie zgadnięty: `LocalNotificationsPlugin.swift` robi `content.sound = UNNotificationSound(named: UNNotificationSoundName(sound))`. Przekazywanie `'default'` każe iOS szukać **PLIKU o nazwie „default"** — taki nie istnieje, więc powiadomienie było NIEME. Pominięcie pola też daje ciszę (plugin nie ustawia wtedy `content.sound` w ogóle). **Jedyne wyjście: realny plik dźwiękowy w bundlu.**
4. **Potwierdzenie usera:** po wyłączeniu wyciszenia telefonu dźwięk w tle działa. Czyli zostały dwie niezależne przyczyny: zły parametr `sound` (naprawiony) i przełącznik ciszy (poza naszą kontrolą).

**Decyzje:**

1. **Trzy dźwięki do wyboru, generowane proceduralnie** (`rest_bell` / `rest_horn` / `rest_alarm`), każdy z ODSŁUCHEM w Ustawieniach. Odsłuch jest kluczowy: głośności nie da się ocenić inaczej niż na telefonie w hałasie siłowni. Domyślny: dzwon bokserski (klasyk kategorii, przebija hałas, nie brzmi jak alarm medyczny).
2. **Głośność przez kompresję, nie przez sam szczyt.** `tanh` z drive 2.6–3.4 podnosi poziom ŚREDNI (RMS 0.33–0.53), bo to on decyduje o słyszalności, a nie wartość szczytowa. Partiale skupione w paśmie 2–4 kHz, gdzie ucho jest najczulsze.
3. **Pliki w DWÓCH miejscach i to nie jest pomyłka:** root bundla iOS (dla `UNNotificationSound`) oraz web assets (dla `HTMLAudioElement` w foregroundzie). Ta sama nazwa po obu stronach, jeden wybór usera steruje obiema ścieżkami.
4. **HTMLAudioElement przed WebAudio.** Synteza WebAudio potrafi nie zagrać w WKWebView mimo odblokowania gestem; realny plik jest przewidywalniejszy. Synteza zostaje fallbackiem.
5. **Blokada wygaszania ekranu** (`@capacitor-community/keep-awake`) jako przełącznik w Ustawieniach, domyślnie włączony. Przy włączonym ekranie dźwięk gra zawsze, bo robi to sama apka. Zwalniana BEZWARUNKOWO przy wyjściu z treningu, żeby nie zostawić zapalonego ekranu.

**Czego NIE da się obejść:** przy bocznym przełączniku ciszy powiadomienia systemowe są nieme z zasady iOS. Jedyne wyjście to Critical Alerts, wymagające osobnego wniosku do Apple — świadomie nie wchodzimy w to.

**Lekcja (druga tego dnia):** po dodaniu nowej zależności natywnej działający dev server Vite zawiesza się na re-optymalizacji — 118 testów e2e padło z `page.goto timeout`, a bieg trwał 22 minuty zamiast 2. Kod był w porządku. **Po `npm i` nowego pluginu: ubij dev server i wyczyść `node_modules/.vite`, zanim uznasz e2e za czerwone.**

**Lint złapał realny błąd:** hook blokady wygaszania wylądował po wczesnym `return` komponentu, co łamie Rules of Hooks. Przeniesiony przed nie, warunek liczony z `sessionId` zamiast z `isWorkoutStarted` (ta zmienna powstaje dopiero po returnach).

---

### 2026-07-20 — X17C poprawki po teście usera na urządzeniu (build 71 → 73)

**Zgłoszenie po realnym teście:** „jedyne co się wydarzyło to cicha wibracja, nic więcej", „da się to zrobić inline zamiast tego dużego zegara?", „możliwość ustawiania domyślnej przerwy między seriami i między ćwiczeniami".

**Dobra wiadomość:** powiadomienia systemowe DOCHODZĄ przy zgaszonym ekranie — czyli fundament z Z135 (deadline + local notification) działa. Problemem była SIŁA sygnału i podwójny UI.

**Naprawione:**

1. **Podwójny timer — mój błąd.** `ExerciseCard` wołał `setRestRun` (nowy pasek inline) i RÓWNOCZEŚNIE `onRestTimerStart` (stary modal na poziomie strony). Na zrzucie usera widać oba naraz. Stary modal `RestTimer` odpięty i usunięty (był po tym martwy: 236 linii komponentu + 107 linii testu).
2. **„Cicha wibracja" — źle dobrany sygnał.** Koniec przerwy wołał `hapticImpactLight`, czyli najsłabszy dostępny impuls. Nowy `hapticRestEnd`: systemowy wzorzec notyfikacyjny + trzy CIĘŻKIE uderzenia w odstępach 180 ms. Na webie fallback do `navigator.vibrate` ze wzorcem.
3. **Brak dźwięku — przyczyna systemowa, nie kod JS.** Domyślna kategoria sesji audio WKWebView (`.ambient`) jest wyciszana bocznym przełącznikiem ciszy iPhone'a. `AppDelegate` ustawia teraz `.playback` z `[.mixWithOthers, .duckOthers]`: beep gra mimo przełącznika ciszy, a muzyka z AirPodsów nie jest przerywana, tylko przyciszana na czas sygnału (user miał podłączone AirPodsy).
4. **Sam dźwięk wzmocniony:** szczyt 0.3 → 0.85, sinus → trójkąt (lepiej się niesie), a sygnał końca przerwy z dwóch krótkich tonów na cztery wznoszące z domknięciem.
5. **Rozjeżdżający się pasek.** Etykieta, czas i trzy przyciski były w JEDNYM rzędzie — na iPhone „Pomiń" wychodził poza kartę. Teraz czas w pierwszym rzędzie, przyciski w drugim, każdy `flex-1`. Szerokość tekstu nie ma jak rozwalić układu.
6. **Ustawienia przerw (nowe, `RestSettingsCard` w Ustawieniach).** Trzy niezależne czasy, bo to trzy różne sytuacje na siłowni: **między seriami** (domyślnie 90 s), **między ćwiczeniami** (150 s — dochodzi zmiana stanowiska i sprzętu), **po rozgrzewce** (45 s). Każdy z polem liczbowym i czterema presetami. Zakres 5–600 s.
7. **Przerwa startuje też po ZAKOŃCZENIU ćwiczenia.** Dotąd ostatnia seria dawała tylko dźwięk „przejdź dalej" bez odliczania. Teraz leci przerwa „między ćwiczeniami"; nadpisanie per ćwiczenie jej NIE dotyczy (to czas na zmianę stanowiska, nie na daną pracę).

**Weryfikacja:** test 974/974, typecheck, lint, build, bundle-budget (1 512 517 / 1 536 000), dist-offline, e2e:mock 177/177. Zrzut paska potwierdza brak ucięcia.

**Flaga nadal wyłączona** dla weba; build 73 idzie z timerami włączonymi do ponownego testu na urządzeniu. Do sprawdzenia przez usera: czy dźwięk słychać przy przełączniku ciszy i czy wibracja jest wyczuwalna przez kieszeń.

---

### 2026-07-20 — X17D (Z138-Z140): ekran „Twoje liczby" + animacja „+1"

**Prośba usera:** „chciałbym, żeby po kliknięciu u góry po prawej stronie w ilość treningów wyświetlały się jakieś dane o tych wszystkich treningach, np. ile czasu spędziłem na siłowni oraz ile ton podniosłem (...) a jak zapiszę trening to chciałbym animację +1".

**Decyzje:**

1. **Jedno źródło prawdy dla statystyk.** `buildAllTimeStats` REUŻYWA istniejących reguł (`calculateTonnage`, `workoutDurationSec`, `calculateStreakDetails`, `buildHistoryRowMeta`) zamiast liczyć po swojemu. Inaczej powstałaby trzecia wersja prawdy o tonażu.
2. **Naprawiony dług: dwie metody liczenia tonażu.** `getTotalWeight` liczył BEZ filtra `isWarmup`, więc Dashboard i Osiągnięcia pokazywały inną liczbę niż raport PDF. Test regresji utrwala, która jest poprawna, i dowodzi, że różnica była realna: **1100 kg starą metodą vs 500 kg poprawną** na tym samym treningu (600 kg rozgrzewki).
3. **Czas z jawnym zastrzeżeniem.** Pokazujemy, z ilu treningów jest liczony — sesje sprzed M32 nie mają pomiaru i cicho wliczone jako zero kłamałyby w dół.
4. **Łączna liczba serii i powtórzeń** — luka: dotąd nigdzie w projekcie nie liczone zbiorczo (tylko inline per sesja).
5. **Grywalizacja TYLKO na tym ekranie.** Ekwiwalenty (słonie/samochody) w jednym boksie z podpisem, że to zabawa. Do ekranu treningu nie wchodzi nic — brak grywalizacji w logowaniu jest wymieniany jako ZALETA Stronga, a odznaki „często tylko rozpraszają".
6. **Licznik w nagłówku to teraz przycisk.** Był zwykłym `div` bez `onClick`, roli i `tabIndex`. Doszła rola przycisku, `aria-label` i obsługa klawiatury (e2e sprawdza wejście Enterem).
7. **PUŁAPKA Z140.2 rozwiązana wprost.** `AppHeader` jest UKRYTY na `/workout/*`, więc przy kliknięciu „Zakończ trening" nie ma czego animować. Zamiast liczyć na zamontowany komponent, `consumeCelebration` porównuje licznik z ostatnio pokazanym i świętuje po powrocie na Dashboard. Zachowania brzegowe w testach: jednorazowość, brak świętowania istniejącej historii przy pierwszym uruchomieniu, brak świętowania przy usunięciu treningu, pełna delta przy zsynchronizowaniu kilku treningów.
8. **Confetti po treningu przez parametr `?celebrate=1`**, ten sam wzorzec co `?welcome=1` po onboardingu. Dwa niezależne mechanizmy (confetti z URL, „+1" z licznika) zamiast jednego współdzielonego stanu, który jeden z konsumentów by „zjadł".
9. **Zero nowych zależności animacyjnych.** Keyframes inline jak w `ConfettiBurst`. `prefers-reduced-motion` respektowane w obu animacjach.

**Uwaga na przyszłość:** po X17D zostały **24 KB zapasu** w budżecie bundla (1 511 843 / 1 536 000). Kolejna większa funkcja wymaga code-splittingu albo świadomego podniesienia limitu.

**Weryfikacja:** test 969/969, typecheck, lint, build, bundle-budget, build:mobile + dist-smoke, dist-offline, e2e:mock 177/177, scenariusz przerwania zielony. Web na gh-pages, iOS build 72 VALID + APPROVED.

---

### 2026-07-20 — X17C (Z135-Z136): timery przerw wracają zza flagi, ale flaga ZOSTAJE

**Kontekst:** timery wyłączono flagą 2026-06-27 po treningu, na którym timer nie dał sygnału przy zgaszonym ekranie. Przyczyna była systemowa: iOS wstrzymuje JavaScript w WKWebView, więc nic opartego o żywy JS nie zadziała, gdy telefon leży w kieszeni.

**Decyzje:**

1. **Stan timera to DEADLINE, nie licznik.** Pozostały czas liczy się zawsze jako `deadline − now`. Test symuluje skok zegara o 5 minut (jak po wyjęciu telefonu z kieszeni) i wymaga, żeby timer był SKOŃCZONY, nie zamrożony. To jedyna różnica, która naprawdę decyduje.
2. **Sygnał przy zgaszonym ekranie wyłącznie przez local notification.** JS jest potrzebny tylko do rysowania paska, gdy user patrzy na ekran. Zadanie „obudź mnie za 90 sekund" należy do systemu.
3. **Powiadomienie ma parę zaplanuj/anuluj.** `Pomiń` anuluje, każda zmiana czasu przeplanowuje, a koniec w foregroundzie anuluje systemowe i gra in-app — inaczej user dostałby sygnał do przerwy, której już nie ma, albo dwa razy ten sam.
4. **Pasek INLINE w karcie, nie modal** (wzorzec Strong: odliczanie w kontekście serii). Tap rozwija do dużego odliczania na pełnym ekranie.
5. **Pasek tyka we WŁASNYM stanie.** Gdyby licznik siedział w karcie, karta re-renderowałaby się cztery razy na sekundę — czyli powrót re-render bomby R2-07. `setInterval` odświeża wyłącznie widok paska i nigdy nie jest źródłem prawdy o czasie.
6. **Osobne czasy przerwy dla rozgrzewki i serii roboczej** + nadpisanie per ćwiczenie, które celowo NIE dotyczy rozgrzewki. Najczęstsza skarga zaawansowanych na Hevy to jeden czas na wszystko.
7. **Override flagi przez localStorage TYLKO w trybie E2E.** Bez tego timery za wyłączoną flagą są nietestowalne end-to-end, a włączenie ich globalnie w e2e zabiłoby test pilnujący, że przy wyłączonej fladze timerów w apce nie ma.

**FLAGA POZOSTAJE WYŁĄCZONA.** Build 71 na TestFlight ma timery włączone (zbudowany z `VITE_FEATURE_WORKOUT_TIMERS=true`), web na gh-pages ich nie ma. Zdjęcie flagi na stałe wymaga zielonego testu na FIZYCZNYM iPhone — symulator nie odtwarza wstrzymania WKWebView, więc zielony wynik z symulatora niczego by nie dowodził. Lista kroków usera w `docs/PLAN-X17C-2026-07-20.md`.

**Weryfikacja, że build 71 naprawdę ma timery** (nie założenie): bundle mobilny kompiluje się do `workoutTimers(){return e()??!0}`, a bez zmiennej środowiskowej do `!1`. Sprawdzone w obie strony; IPA zbudowana z tego dist.

**Weryfikacja pozostała:** test 952/952, typecheck, lint, build, bundle-budget (initial JS 1 493 183 / 1 536 000), build:mobile + dist-smoke, dist-offline, e2e:mock 174/174, scenariusz przerwania zielony. iOS build 71 VALID + Beta App Review APPROVED.

---

### 2026-07-20 — X17B (Z132-Z134): kalkulator talerzy v2

**Zarzut usera:** „kalkulator o tyle jest słaby, że nie mogę tam zmienić wagi. Czyli jakbym chciał mieć inną wagę, to tam miałem na stałe przypisane np. 60 kg". Potwierdzone w kodzie: `targetKg` był propem, w komponencie nie istniał ani input wagi, ani stan na nią.

**Decyzje:**

1. **Waga to STAN arkusza, nie prop.** Prop daje wyłącznie wartość startową z serii. Do tego steppery ±1,25 / ±2,5 / ±5 kg liczone w jednostce UI (kg kanonicznie w modelu).
2. **„Ustaw w serii" domyka pętlę.** Policzona waga wraca do aktywnej serii roboczej. Callback z `exerciseId` w sygnaturze — kontrakt `memo()` z X17A. Bez tego kalkulator był ślepą uliczką: user liczył, zamykał i przepisywał ręcznie.
3. **`suggestAchievable` zamiast samego „exact: false".** Zwraca wariant w DÓŁ i w GÓRĘ (oba klikalne) plus brakujący nominał, gdy to on blokuje. `up` jest `null`, gdy inwentarz się kończy; sufit liczony z realnych sztuk, więc pętla szukająca nie ma jak się zapętlić. Research: Stronger pokazuje obie strony, Stronglifts wskazuje brakujący nominał, Strong nie robi nic.
4. **Tryb bez gryfu (`noBar`) jako opcja, nie druga funkcja.** Maszyna i hantle: cała waga na JEDNĄ stronę, sztuki NIE parowane (3 talerze 5 kg = realne 15 kg). Osobny test pilnuje, że ścieżka z gryfem zachowuje starą semantykę.
5. **Preset imperialny trzyma kg kanonicznie.** 45 lb → `lbsToKg(45)`, przeliczenie na lbs robi UI. Model zostaje jednojednostkowy (twarda zasada projektu).
6. **`loadPlateInventory` przestaje odrzucać gryf spoza presetów.** Legalne 0–100 kg (gryf techniczny 7,5, trap bar, 0 = brak gryfu). `BAR_OPTIONS_KG` degraduje się do listy skrótów w UI zamiast udawać walidator.
7. **Ustawienia sprzętu z toggli na realną konfigurację:** liczba sztuk per rozmiar, własne talerze z usuwaniem, własny gryf, preset jednostki. „Mam / nie mam" nie oddaje siłowni, na której są dwie dwudziestki i osiem piątek.
8. **Generator rozgrzewki zaokrągla do REALNIE składalnych ciężarów.** Na siłowni z samymi dwudziestkami proponował 84 kg, których nie da się złożyć. Dochodzi deduplikacja, bo ubogi inwentarz zbijał kilka procentów do tej samej wagi.
9. **Chip „Talerze" niezależny od wpisanego ciężaru.** Warunek `plateWeight > 0` chował kalkulator dokładnie w momencie, w którym jest najbardziej potrzebny (zanim user wie, ile wziąć).
10. **Kolory neutralne domyślnie**, presety IWF/IPF opcjonalnie, liczba kg widoczna w każdym wariancie. Komercyjne siłownie nie trzymają standardu kolorów.

**LEKCJA (metodyczna, ważniejsza niż sam feature):** pierwsza wersja testów zaokrąglania rozgrzewki do inwentarza **przeszła bez żadnej zmiany kodu**. Asercje sprawdzały podzielność, którą stare zachowanie przypadkiem spełniało — czyli test nie testował niczego. Dopiero przepisanie na sprawdzenie realnej składalności przez `computePlates(...).exact` dało czerwień na starym kodzie. Wniosek: „test first" nie wystarcza; test regresji trzeba SPRAWDZIĆ w obie strony, bo zielony test na starym kodzie to test-atrapa.

**Świadomie odłożone:** profile per siłownia, sync inwentarza między urządzeniami, zaciski zawodnicze (collars), gryf per ćwiczenie.

**Weryfikacja:** test 929/929, typecheck, lint, build, bundle-budget (initial JS 1 492 548 / 1 536 000), build:mobile + dist-smoke, dist-offline, e2e:mock 172/172, scenariusz przerwania zielony. Web na gh-pages, iOS build 70 VALID + Beta App Review APPROVED.

---

### 2026-07-20 — X17A FAZA 4 (Z131): nagłówek sesji + znalezisko o wznowieniu

**Decyzje:**

1. **Czas / Objętość / Serie w jednym zwartym rzędzie** zamiast dwóch dużych kafelków `StatCard`. Kafelki zjadały pionową przestrzeń nad pierwszą kartą, a liczby serii sesji nie pokazywały w ogóle.
2. **Logika metryk wyjęta z komponentu** do czystego `sessionStats()` w `lib/workout-day-view.ts` — 2500-linijkowej strony nie da się sensownie testować, a czysta funkcja tak (4 testy: rozgrzewka poza tonażem i licznikiem, masa własna liczy się do serii ale nie do tonażu, pusta sesja daje zera, nie NaN).
3. **Scenariusz przerwania jako trwały e2e**, nie jednorazowy przebieg ręczny. Sekwencja z reguły 5: start z planu → seria 62,5×7 → wyjście → szybki trening z dodanym ćwiczeniem → powrót → komplet ćwiczeń + dane w szkicu + nowy układ → dostępne zakończenie.

**ZNALEZISKO (odłożone, poza zakresem X17A):** powrót do treningu z planu po szybkim treningu pokazuje sesję jako NIEWZNOWIONĄ — pola puste, wraca przycisk „Rozpocznij trening" — mimo że szkic w IndexedDB ma komplet 7 ćwiczeń planu i odhaczoną serię `62.5×7`.

- **Dane są bezpieczne.** Zrzut szkicu po całej sekwencji potwierdza komplet ćwiczeń i zalogowaną serię. To NIE jest powtórka utraty danych z incydentu 2026-07-20.
- **To nie regresja X17A.** Bisekt: ten sam scenariusz na `a605a081` (kod sprzed X17A) daje identyczny wynik (`kg=` pusty, przycisk startu obecny). Zachowanie zastane.
- **Ryzyko dla usera mimo bezpiecznych danych:** po powrocie widzi pusty ekran i może uznać, że trening przepadł — dokładnie ten sam wzorzec paniki co przy incydencie. Rzecz siedzi w warstwie wznowienia sesji (`WorkoutDay`/auto-resume), nie w karcie ćwiczenia ani w zapisie.
- Rekomendacja: osobne zadanie, priorytet wysoki, backlog v2.

**Pułapka przy okazji:** klucz `workout.statSets` już istniał („Serii"); dopisany duplikat wywalił typecheck (TS1117). Przed dodaniem klucza i18n sprawdź, czy go nie ma.

**Weryfikacja:** test 893/893, typecheck, lint, build, bundle-budget, build:mobile + dist-smoke, dist-offline, e2e:mock 171/171.

---

### 2026-07-20 — X17A FAZA 2 (Z129): „Dodaj serię" pod listą + menu ⋯

**Problem:** rzadkie akcje ćwiczenia były rozsiane po trzech miejscach (ikona `Info` w nagłówku, chipy w stopce, przyciski POD kartą), a „Dodaj serię" siedziało w pasku akcji na dole, nie tam, gdzie kończy się lista serii. Pasek chipów mieszał nagie ikony (`%`, dysk) z etykietowanymi, bez `flex-wrap` — po samej ikonie dysku nie było wiadomo, że to kalkulator talerzy.

**Decyzje:**

1. **„Dodaj serię" pełną szerokością bezpośrednio pod ostatnią serią** (wzorzec Hevy/Strong), w tym samym kontenerze co tabela.
2. **Limit 10 serii mówi, dlaczego.** Nieme `disabled` zastąpione komunikatem `card.addSetLimit`. Reguła 6 z `CLAUDE.md`: każdy stan blokady musi powiedzieć userowi, co się dzieje.
3. **Jedno menu `⋯` na rzadkie akcje:** Instrukcje, Zamień ćwiczenie, Pomiń, Notatka, Przypnij notatkę. Swap i pomiń pojawiają się tylko wtedy, gdy rodzic poda callbacki, więc widok historyczny ma menu bez akcji edycyjnych.
4. **Instrukcje jako dialog na żądanie.** Treść usunięta z karty w Z128.2 wraca pod jednym tapnięciem, z fallbackiem z biblioteki (działa też dla ćwiczeń własnych) i przejściem do pełnych szczegółów, gdy ćwiczenie jest w bibliotece. Ikona `Info` znika z nagłówka.
5. **Pusta przypięta notatka nie zajmuje miejsca w karcie.** Sekcja renderuje się dopiero, gdy notatka ma treść; zakłada się ją z menu (nowy prop `startInEdit` otwiera edycję od razu).
6. **Trzy chipy o jednym rozmiarze** (Rozgrzewka / Talerze / Metryki) przez wspólną stałą `chipClass` z `flex-1`. Zero ramek 1px — granice przez tło (No-Line Rule). Chip „Notatka" przeniesiony do menu.
7. **Kontrakt `memo()` utrzymany.** `handleRequestSwap` to `useCallback` z sygnaturą `(exerciseId)`, jak `handleSkipExercise`. Żadnej lambdy inline per karta — to była re-render bomba R2-07.

**Infrastruktura testowa:** `src/test/setup.ts` dostał polyfill `PointerEvent`, `*PointerCapture` i `scrollIntoView`. jsdom ich nie implementuje, a Radix na nich stoi — bez tego menu `⋯` nie otwiera się w żadnym teście jednostkowym. To polyfill środowiska, nie rozluźnienie asercji.

**Dwa fałszywe alarmy w bramkach (warto pamiętać, oba środowiskowe):**

- `exercise-picker` „chip kategorii zawęża listę" wywalił się raz na timeout 26 s w teście synchronicznym. Solo zielony, trzy kolejne pełne biegi 887/887 zielone. Przyczyna: kontencja CPU (dev server + workery vitest + Playwright naraz), nie kod.
- E2E karty sypało się losowo (raz 0 kart na `/workout/day-1`, raz brak chipa Talerze) na dev serverze **działającym od godzin z nagromadzonym HMR** po dziesiątkach edycji. Po restarcie serwera: 19/19 szeregowo, 170/170 pełne e2e. Wniosek na przyszłość: przed diagnozowaniem dziwnego e2e zrestartuj dev server, zanim zaczniesz szukać buga w kodzie.

Przy okazji poprawiony nowy test e2e: pole ciężaru wybierane po `aria-label`, nie po indeksie `spinbutton` — indeks zależy od liczby wierszy rozgrzewki, a te właśnie zmieniły pozycję w Z128.1.

**Weryfikacja:** test 887/887, typecheck, lint, build, bundle-budget (initial JS 1 490 669 / 1 536 000), build:mobile + dist-smoke, dist-offline, e2e:mock 170/170.

---

### 2026-07-20 — X17A FAZA 1 (Z128): hierarchia karty ćwiczenia

**Problem:** po treningu 2026-07-20 user zgłosił, że karta ćwiczenia jest nieczytelna. Zrzut baseline z symulatora iPhone 17 potwierdził: nad tabelą serii stał pusty kwadrat miniatury 92×72 (mapa `ANIMATION_FILES` jest PUSTA, więc placeholder pokazywał się przy KAŻDYM ćwiczeniu), 6 linii instrukcji i osobna sekcja rozgrzewki z własnym badge'em. Efekt: nad zgięciem ekranu mieściły się dwie serie robocze.

**Decyzje:**

1. **Rozgrzewka wchodzi do wspólnej tabeli serii** (Z128.1). Osobna sekcja z badge'em „Rozgrzewka" i własnym dividerem znika, oznaczeniem zostaje złote „W" w kolumnie SET. Nagłówki kolumn (`SET | POPRZ. | KG | POWT. | ✓`) są teraz PIERWSZE — user widzi strukturę tabeli, zanim zobaczy jej zawartość.
2. **Ukończona seria = wypełnione tło całego wiersza** (`bg-primary/[0.06]`), aktywna zachowuje obrys. Reguła zapisana wprost jako rozłączna (`completed ? tło : isActive && obrys`), bo aktywna to z definicji pierwsza NIEukończona. Zgodne z No-Line Rule: zero ramek, granice przez tło.
3. **Złoto rozgrzewki na obu ścieżkach renderu.** Dotąd tylko stara ścieżka `weight_reps` oznaczała inputy rozgrzewki; `renderTrackedSetRow` (Z105) nie. `DurationInput` dostał opcjonalny `className`.
4. **Miniatura tylko gdy JEST animacja** (Z128.2). Skoro `ANIMATION_FILES` jest pusta, dziś oznacza to brak miniatury i pełną szerokość dla tytułu. Gdy animacje wrócą, gałąź z `<video>` działa bez zmian (test pokrywa obie).
5. **Instrukcje wypadają z karty na stałe** — idą do menu `⋯` (Z129). Uzasadnienie celu i ostatnia notatka zostają, ale jako jeden zwarty blok metadanych.
6. **`.exercise-card-divider` usunięta.** Klasa była martwa (`height: 0; background: transparent`) i miała 4 użycia udające sekcjonowanie. Zastąpiona odstępami.
7. **Tło nagłówka karty przez token.** `#262626` na sztywno ignorowało light mode (ciemnoszary pasek na białej karcie). Teraz `hsl(var(--surface-highest))`; w dark to dokładnie 0 0% 15%, więc ciemny motyw wygląda identycznie.

**Weryfikacja:** test charakteryzujący `exercise-card-layout.test.tsx` napisany PRZED zmianami (16 asercji, dwa bloki: niezmienniki i stan-do-zmiany); każda nowa asercja potwierdzona czerwona przed implementacją. Bramki: test 879/879, typecheck, lint, build, bundle-budget (initial JS 1 490 147 / 1 536 000), dist-smoke, dist-offline, e2e:mock 168. Zrzut po zmianie: cała karta (W + 3 serie) mieści się nad zgięciem razem z początkiem następnego ćwiczenia.

**Zaktualizowane testy e2e (nie obejścia, zmiana kontraktu UI):** badge „Rozgrzewka" → test pozycji wiersza W pod nagłówkami kolumn; asercja obecności martwego dividera → asercja jego BRAKU plus sprawdzenie, że nagłówek odcina się tłem.

---

### 2026-07-20 — INCYDENT NA TRENINGU (konto admina): utrata 5 ćwiczeń + 4 inne bugi

**Zgłoszenie:** trening z planu (Poniedziałek/Góra A, 6 ćwiczeń) → wyjście → szybki trening → powrót do planu = TYLKO 1 ćwiczenie na ekranie. User zrobił pozostałe 5 ćwiczeń na siłowni, ale nie miał ich gdzie zalogować. Do tego: pomarańczowe nieczytelne bloki, baner syncu nie do usunięcia, rozjeżdżający się/zoomowany layout, tap zaznaczający tekst.

**Ground truth z Firestore (read-only):** `workout-...-day-1-2026-07-20` miał completed=false i JEDNO ćwiczenie (tpl-ex-29, 4 serie) przy revision=6; obok pusty `adhoc-2026-07-20-...` (completed=true, 0 ćwiczeń, 6 sekund).

**Root cause 1 (utrata danych):** `day` w WorkoutDay był budowany WYŁĄCZNIE z kluczy `draft.exerciseSets` (gałąź dodana dla szybkiego treningu Z104). Draft miał tylko dotknięte ćwiczenie, więc reszta planu znikała z ekranu — i z treningu. Wzmacniało to drugie niedopatrzenie: wznowienie istniejącej sesji (`result.existing`) nie robiło pre-fillu, więc stan startował pusty i pierwsza edycja tworzyła 1-elementowy draft. Fix: `buildDayFromDraft` (plan = BAZA, draft tylko dokłada + nadpisuje nazwę przy swapie) + pre-fill brakujących ćwiczeń przy wznowieniu.

**Root cause 2 (zacięty sync):** pusty trening przechodzi zapis do chmury, ale walidacja finalna zwraca `empty-final-payload` — warunku NIE DA SIĘ spełnić, więc draft z `finalSyncPending` wisiał wiecznie. Fix: pusty draft przy ukończonym treningu jest czyszczony (nie ma czego stracić) + blokada kończenia treningu bez ani jednej odhaczonej serii.

**Root cause 3 (kolory):** `bg-fitness-warning` bez `/10` — pełne pomarańczowe tło z pomarańczowym tekstem (WorkoutDay x2, SyncCenterCard).

**Root cause 4 (zoom/zaznaczanie):** w CSS nie było ŻADNYCH reguł dotyku. WebView zachowywał się jak strona: pinch-zoom rozjeżdżał layout, tap w przycisk zaznaczał tekst. Fix: baseline dotyku w `index.css`, `maximum-scale=1`, `zoomEnabled:false`, guard `overflow-x`.

**Brak funkcji (zgłoszony przy okazji):** `deleteWorkout` istniał w hooku, ale NIE MIAŁ UI — nie dało się usunąć śmieciowego treningu. Historia ma teraz usuwanie z potwierdzeniem (`deleteWorkoutEverywhere` kasuje też lokalny szkic i wpis w kolejce).

**Odtworzenie danych:** trening 2026-07-20 uzupełniony z liczb podanych przez usera (6 ćwiczeń, 22 serie, 75 min, 5348 kg roboczego tonażu), revision 6→36 żeby lokalny szkic z telefonu nie wygrał. Backup przed zapisem w scratchpadzie sesji. Zweryfikowane odczytem po zapisie.

**Sprawdzone i CZYSTE:** cardio (238 aktywności Strava nietknięte, 0 ręcznych, usuwanie ręcznego cardio już było w edycji), plan (6 dni bez uszkodzeń), cykle, notatki, ćwiczenia własne.

**Lekcje zapisane w CLAUDE.md projektu (reguły 5-8):** nowa funkcja nie może zabrać niczego istniejącemu przepływowi (nazwij niezmiennik + test na stary przepływ); każdy stan błędu musi mieć wyjście; apka natywna ma się zachowywać jak apka; tła statusowe zawsze z przezroczystością. Checklista wdrożeniowa ma nowy scenariusz przerwania (plan → wyjście → szybki trening → powrót).

**Weryfikacja:** vitest 863/863 (26 nowych: buildDayFromDraft, hasAnyCompletedSet, hydracja pustego draftu), typecheck/lint/build/budżet zielone, e2e 333 passed z NOWĄ sceną regresji incydentu, sprawdzoną w obie strony (pada na starym zachowaniu, przechodzi po fixie). Web index-Cnb1kBsw, iOS build 68 VALID + obie grupy + Beta App Review APPROVED.


### 2026-07-20 — MARATON X14-X16 ZAKOŃCZONY (Z103-Z127): 8,5/9 planów wdrożonych

Podsumowanie autonomicznego wykonania (2026-07-19/20, prompt docs/PROMPT-WDROZENIE-X14-X16.md): X14A/B/C, X15A/B/C, X16A/B wdrożone w CAŁOŚCI (web + rules + functions + iOS TestFlight, buildy 59-67 wszystkie VALID + Beta App Review APPROVED); X16C wdrożony w zakresie wykonalnym (backend + web + iOS 67; apka Connect IQ napisana w `garmin/`, NIEZBUDOWANA — SDK za logowaniem Garmin = KROK USERA). Najważniejsze odkrycie maratonu: FIX SYSTEMOWY signingu iOS (buildy 47-63 miały binarki bez entitlements — martwe Sign in with Apple i push; od 64 manual signing w archive). KROKI USERA i backlog v2: raport końcowy sesji + wpisy per plan poniżej. Web X16C (index-BLktCjfp) POTWIERDZONY LIVE 2026-07-20 ~03:40 (Pages build wisiał ~1h przez nocny incydent GitHuba, API 503; pomógł ponowny trigger builds po ustąpieniu incydentu).

### 2026-07-20 — X16C (Z125-Z127): backend Garmin WDROŻONY, apka CIQ napisana (BLOKADA: SDK za logowaniem Garmin)

**Co wdrożone:** iOS build 67 (VALID, obie grupy TestFlight, Beta App Review APPROVED — maraton zamyka się buildami 59-67, wszystkie APPROVED); web index-BLktCjfp; functions na prod (smoke 401 na złym kodzie): callable garminPairStart/garminDevices/garminRevokeDevice + HTTP garminPair/garminDay/garminIngest (token urządzenia Bearer; w Firestore WYŁĄCZNIE hashe z pepperem API_KEY_PEPPER; kod 6-cyfrowy TTL 10 min jednorazowy z TTL Firestore; rate limit 2 s per token; CORS domyślnie zamknięty). Rules: deny-all dla device_pair_codes/device_tokens (nawet admin — tokeny to sekrety; 5 testów). Web: sekcja "Zegarek Garmin" w Ustawieniach (kod z odliczaniem, lista urządzeń, odłączanie). Testy: 20 functions + parytet ingest→sanitizeWorkoutDoc klienta + e2e sekcji.

**Decyzje architektoniczne:** (1) garminDay zwraca kompaktowy JSON <8KB (praktyczny limit makeWebRequest przez BLE; test rozmiaru na 12 ćwiczeń) — serie jako pary [reps, kg], klucze 1-literowe. (2) Cel serii z UPROSZCZONEJ double progression w functions (progress/hold — parytet z decideNextSet testowany); pełny silnik (plateau/ból/deload) zostaje w kliencie — przeniesienie do wspólnego pakietu = v2, kopiowanie 500 linii silnika do functions odrzucone. (3) garminIngest: dedup po eventId, local-wins po timestamp per seria, idempotentny docId garmin-<deviceId>-<workoutId>, guard jednoczesności (istnieje completed sesja dnia → zapis jako ad-hoc "(Garmin)", zero mergowania).

**BLOKADA ZEWNĘTRZNA (KROKI USERA):** kompletne źródła apki CIQ w `garmin/` (Monkey C: picker parowania, widok dnia z cache offline, ekran ćwiczenia ze stepperem i celem/notatką, rest timer z wibracją, ActivityRecording strength→FIT, kolejka zdarzeń w Storage; i18n PL/EN; 12 urządzeń, min API 4.0.0) — NIEZBUDOWANE, bo pobranie Connect IQ SDK wymaga zalogowania kontem Garmin w SDK Managerze. User: (1) SDK Manager + logowanie + SDK 9.2.0 i urządzenia, (2) klucz developerski (openssl, instrukcja w garmin/README.md), (3) `garmin/build.sh fenix7` + poprawki pierwszej kompilacji, (4) konto developerskie Garmin → submit do Connect IQ Store. Research: SDK 9.2.0 (2026-06-08); limity makeWebRequest ~8KB/-2/-300/-102.

### 2026-07-20 — RELEASE X16B (Z122-Z124): Apple Watch v1 domknięty na bazie prototypu

**Co:** web index-CtB1XlVp + iOS build 66 (VALID, obie grupy, Beta App Review APPROVED). Prototyp watch pokrywał ~80% scope v1 (audyt w PLAN-X16B FAZA 0) — dorobione braki: etykieta celu tygodnia (silnik X16A) i przypięta notatka (X14A) w payloadzie (`buildWatchExercises`, notatka przycięta do 140 znaków), i18n zegarka PL/EN (enum L10n, język z payloadu — zero grzebania w pbxproj), wskaźnik "niezsynchronizowane" (outstandingUserInfoTransfers + delegate didFinish, widoczny gdy telefon nieosiągalny), DEDUPLIKACJA zapisu Health: eventy z zegarka niosą flagę `hkSession` — telefon pomija własny syncWorkoutToHealth, gdy sesję HKWorkout (z tętnem) prowadził zegarek.

**Weryfikacja:** vitest 848/848 (watch-contract 5 nowych), e2e 330 passed (2 webkit-faile: flak + środowiskowy analytics-pdf potwierdzony bisektem na commit sprzed zmian), build obu targetów Xcode, pętla na parze symulatorów (iPhone 17 + Ultra 3, bundle E2E mock bez realnych kont): context dochodzi, L10n renderuje, nowe pola nie psują dekodowania. Interaktywne scenariusze headless niewykonalne (ekran hosta zgaszony, simctl bez tap) — KROK USERA na realnym sprzęcie. Lekcja narzędziowa: seed UserDefaults symulatora przez `simctl spawn defaults write` nie działa dla sandboxa apki (cfprefsd cache) — a świeży context z telefonu i tak nadpisuje.

### 2026-07-20 — RELEASE X16A (Z119-Z121): progresja programowa v1 + audyt prototypu watch (X16B FAZA 0)

**Co:** X16A w całości na prod: web index-BP5paMV1 + rules (update progression) + iOS build 65 (upload OK, poll VALID/external w tle). Z121: DeloadBanner na Dashboardzie ([Zastosuj]/[Pomiń] → progression.deloadDecisions, punktowy updateDoc bez rewizji planu), suggestEarlyDeload (>=2 plateau lub powtarzalny ból >=4 w 2 ostatnich sesjach; cooldown 3 tyg. od zastosowanego; nigdy w tygodniu programowym), WeekReportCard (raport ostatniego ZAKOŃCZONEGO tygodnia: cele liczone z historii sprzed niego → % realizacji + do 3 rozjazdów z faktycznym wynikiem). Decyzja 'applied' aktywuje wariant deloadowy też poza harmonogramem (wcześniejszy deload). ODŁOŻONE: "sekcja w AI podsumowaniu tygodnia" — w kodzie nie ma AI podsumowania (chat usunięty w X12B); ewentualne rozszerzenie weekly digest o raport = backlog v2 (digest w functions nie ma dostępu do silnika klienta).

**Audyt prototypu Apple Watch (X16B FAZA 0):** prototyp pokrywa ~80% scope v1 (most, kolejka transferUserInfo, rest timer z haptyką, steppery+crown, HKWorkoutSession z HR na zegarku, router startWorkout). Braki: etykieta celu tygodnia i przypięta notatka w payloadzie, wskaźnik niezsynchronizowanych, i18n zegarka, DEDUPLIKACJA zapisu Health (zegarek i telefon zapisują OBA — do rozwiązania w X16B FAZA 1). Szczegóły w docs/PLAN-X16B-2026-07-19.md (FAZA 0).

**Weryfikacja:** vitest 843/843 (silnik 21 testów), rules 162/162 (2 nowe update progression), e2e 327 (5 nowych scen Z120-Z121), symulacja 2 tygodni + deload w tygodniu 5 przez e2e mock (zero realnych kont). Tooling: preflight akceptuje $(MARKETING_VERSION).

### 2026-07-20 — RELEASE X15C (Z116-Z118): Apple Health / Health Connect + fix signing iOS

**Co:** cały release train X15C na prod: web index-Y_2d8C3i (health-bridge no-op w web), iOS build 64 (VALID, obie grupy TestFlight, Beta App Review APPROVED), Android AAB release-ready z Health Connect. Do buildu 64 weszły też gotowe Z119-Z120 (progresja: konfiguracja + cele tygodnia).

**Incydent buildu 64 i fix systemowy signingu:** pierwszy upload padł na flaky iTMSTransporter ("Defaults.properties"), retry ujawnił altool 90166: StrengthWatch.app w IPA z PUSTYMI entitlements. Root cause GŁĘBSZY: pipeline archiwizował BEZ podpisu (CODE_SIGNING_ALLOWED=NO), a re-sign przy eksporcie nadaje tylko minimalne entitlements z profilu — główna apka na TestFlight (buildy 47-63) NIE MIAŁA healthkit/applesignin/aps-environment, czyli Sign in with Apple i push były martwe w binarce. Fix: manual signing w Release configach 3 targetów (Apple Distribution + PROVISIONING_PROFILE_SPECIFIER), profile watch/widgets przez scripts/watch_signing.py (idempotentny, aktualizuje ExportOptions-manual.plist), archive podpisuje pełne App.entitlements. Weryfikacja: codesign -d --entitlements na IPA — App: healthkit+applesignin+aps; Watch: healthkit; Widgets: bazowe.

**KROKI USERA (X15C):** pełna pętla Health na realnym iPhone; App Privacy kategoria Health w ASC; test Sign in with Apple + push na buildzie 64 (pierwszy build z działającymi entitlements); emulator Android z Health Connect.

### 2026-07-20 — X16A FAZA 2 (Z120): silnik celów tygodniowych + cele w UI treningu

**Co:** `computeWeeklyTargets(planDays, workouts, weekIndex, config, options)` w `progression-engine.ts`: per dzień / per ćwiczenie cel `{kind, targetWeight, targetReps, targetSets, targetDurationSec, reasonKey}`. Priorytety: deload-week (tylko z decyzją `deloadApplied`) > ból (pain>=4 w ostatniej sesji, -10% do 2.5 kg) > plateau (>=4 sesje, -10%) > double progression (góra zakresu → +2.5 compound / +1 isolation, reps do dołu; w zakresie → hold +1 powt.). Typ duration: best +10% do 5 s. Deload-week: -40% serii (ceil, min 1), -10% ciężaru do 2.5 kg. UI: badge "Cel tygodnia" w ExerciseCard (priorytet RZA > weeklyTarget > nextAdvice), reason pod nagłówkiem; pre-fill startu treningu bierze cel (`createPrefilledSets` z opcjonalnym targetem), deload-week redukuje też liczbę pre-fillowanych serii.

**Dlaczego tak:** wspólna funkcja `decideNextSet` wydzielona z `next-set-advice.ts` — coach serii i silnik tygodniowy liczą IDENTYCZNĄ decyzją (testy charakteryzujące z Z119 zielone bez modyfikacji, i18n zostało w next-set-advice). Silnik czysty, zero zapisów. E2E mock: nowy klucz `fittracker_e2e_plan` (startDate+progression w useTrainingPlan) — bez tego mock nie ma jak włączyć silnika.

**Weryfikacja:** vitest 835/835 (13 nowych silnika + 4 pre-fill z celem), e2e 325 passed (3 nowe sceny Z120: badge progress 62.5×6 + pre-fill z celu, badge hold, brak badge bez configu), typecheck/lint/build/bundle-budget zielone. Webkit 5 failed w drugim pełnym runie = flaki obciążeniowe (za każdym runem inne stare testy; solo-run przechodzi).

**Model:** `ProgressionConfig { enabled, deloadEveryWeeks (2-12, default 5), deloadDecisions? }` w polu `progression` dokumentu planu (brak pola = silnik wyłączony dla starych planów; NOWE plany z kreatora/onboardingu: DEFAULT_PROGRESSION enabled). `sanitizeProgressionConfig` + `isDeloadWeek` (1-based, co N tygodni) z testami. Rules: `progression` w validTrainingPlanShape (zamknięta mapa, 4 testy — 160/160). Edycja: sekcja "Progresja" w PlanEditor (toggle + select 3/4/5/6/8 tyg., zapis przez savePlan z syncActiveCycle: false). Testy charakteryzujące coacha serii dopisane PRZED refaktorem (+3 gałęzie bodyweight: progress/hold/deload).

**LEKCJA NOCNA (klasa błędu: daty UTC vs lokalne w testach):** po północy CEST `new Date().toISOString()` daje WCZORAJ (UTC) — 4 testy strava-utils i 8 e2e nagle czerwone (autostart blokowany jako "przeszłość", tygodnie przesunięte). Fix systemowy: `formatLocalDate` w unit testach, helper `localToday()` w e2e/helpers (w page.evaluate inline — funkcje node niedostępne w przeglądarce). Reguła: testy dat ZAWSZE liczą lokalnie jak apka.

### 2026-07-19 — X15C FAZA 2 (Z117+Z118): Health Connect (Android) + ustawienia i propozycja wagi

**Z117 Android:** własny `HealthSyncPlugin.kt` (Kotlin WŁĄCZONY w projekcie: kotlin-gradle-plugin 2.0.21 + connect-client 1.1.0-alpha07 + coroutines; rejestracja w MainActivity.registerPlugin przed super.onCreate; uprawnienia health.WRITE_EXERCISE/READ_WEIGHT w manifeście). **minSdk 24 -> 26** (wymóg connect-client; Android nieopublikowany, zero userów — decyzja w ramach autonomii). Flow zgód v1: brak pełnego ActivityResult — przy braku zgód otwieramy ustawienia Health Connect (ACTION_HEALTH_CONNECT_SETTINGS), user nadaje tam; kolejne wywołanie zwraca granted. Rename metody na `requestHealthPermissions` (kolizja z bazową Plugin.requestPermissions na OBU platformach). Weryfikacja: `gradlew :app:compileDebugKotlin` BUILD SUCCESSFUL. **ODŁOŻONE: scenariusz na emulatorze** — SDK bez emulatora/AVD na tej maszynie (KROK USERA albo przyszła sesja z emulatorem).

**Z118:** sekcja "Zdrowie" w Ustawieniach (widoczna TYLKO gdy bridge.isAvailable — web ukryta, asercja w e2e; zgody systemowe dopiero przy pierwszym włączeniu toggle, nie przy starcie), stan w localStorage (natura uprawnień systemowych = per urządzenie); `HealthWeightSuggestion` w Pomiarach (banner "Dodaj X kg ze Zdrowia", zapis ISTNIEJĄCĄ ścieżką addMeasurement po tapnięciu, nigdy auto). iOS bridge platform-guard: web bundle +1.2 KB (registerPlugin lazy).

**Weryfikacja:** vitest 815/815, e2e 161/161, bundle budget OK; symulator iOS: build z pluginem+entitlementem SUCCEEDED, apka startuje bez crasha (screenshot sim-health.png). Pełna pętla trening->Health->waga na realnym urządzeniu = KROK USERA (na symulatorze zalogowane realne konto — zapis treningu zabroniony).

### 2026-07-19 — X15C FAZA 1 (Z116): warstwa health-sync + HealthKit (iOS)

**Wybór pluginu (research 2026-07-19):** ekosystem NIE wspiera zapisu workoutów (@capgo/capacitor-health: workouts read-only; @perfood/capacitor-healthkit: iOS-only, zapis niepotwierdzony, luty 2025) => WŁASNY minimalny plugin `HealthSyncPlugin.swift` (wzorzec lokalnego WatchBridgePlugin z prototypu X16B; auto-rejestracja CAPBridgedPlugin, 4 metody: isAvailable/requestPermissions/writeWorkout/readLatestWeight; HKWorkoutBuilder + bodyMass HKSampleQuery).

**Warstwa abstrakcji:** `health-sync.ts` (interfejs HealthBridge + czyste mapowania: mapWorkoutToHealth ze znaczników startedAt/completedAt i fallbackiem date+durationSec, mapCardioToHealth z pełną mapą 10 typów X15A, shouldSyncWorkout idempotentny po endMs, newerHealthWeight z epsilonem 0.1 kg) — 14 testów. `health-bridge.ts`: platform guard (iOS native / no-op), retry x3 z backoffem, log client_errors przy porażce, stan syncu i ustawienia w localStorage (natura uprawnień systemowych = per urządzenie).

**Formalności wykonane przez API:** capability HEALTHKIT dodana do App ID + stary profil usunięty + nowy profil provisioning zainstalowany + ExportOptions-manual.plist zaktualizowany (`scripts/asc_healthkit_capability.py`). Entitlement com.apple.developer.healthkit + NSHealthShare/UpdateUsageDescription (uczciwe opisy PL).

**Weryfikacja:** vitest 815/815, e2e 161/161, bundle web BEZ regresji (1 483 476 B — identyczny). Scenariusz ręczny na symulatorze po Z118 (wymaga toggle w Ustawieniach).

### 2026-07-19 — RELEASE X15B (Z114-Z115) na prod

**Wdrożone:** web index-E0HlxZjB (z fixem: cardio na wykresach #00e3fd zamiast niezdefiniowanego --chart-2 renderującego się na czarno — jawny kolor design systemu jak wykresy Strava); iOS 1.0.0 build 63 + external (APPROVED). Rules bez zmian. Bramki: vitest 801, e2e 161, dist-smoke/offline PASS. Lekcja: pierwszy pipeline 63 ubity PRZED uploadem (fix cyan wszedł do tego samego numeru builda — czysto, bez marnowania numeru).

### 2026-07-19 — X15B FAZA 2 (Z115): UI tygodnia hybrydowego

**Wdrożone:** HybridWeekStrip na Dashboardzie (7 mini słupków pon-nd siła/cardio + dismissowalny banner interferencji, dismiss per para w localStorage `fittracker_interference_dismissed_v1`, przeżywa reload); HybridLoadCard w Analytics zakładka Podsumowanie (12 tygodni stacked bar siła+cardio + linia total + % split bieżącego tygodnia + hint interferencji z 7 dni); TrainingLoadChart z opcjonalnym prop workouts — CTL/ATL/TSB karmione ŁĄCZNYM loadem (test: dodanie sesji siłowej podnosi ATL), etykieta "obejmuje siłę i cardio".

**Odstępstwo (ODŁOŻONE):** "wpis w podsumowaniu tygodnia AI (prompt dostaje detectInterference)" — AI podsumowanie tygodnia NIE ISTNIEJE już w kliencie (AI Chat/Coach usunięte w v6.7.0/X12B). Interferencja trafia do UI (banner Dashboard + hint w karcie hybrydowej). Ewentualne rozszerzenie weekly digest (functions) o interferencję = backlog.

**Pułapka odkryta:** domyślna zakładka Analytics to 'weekly' (nie 'summary') — testy klikają "Podsum.".

**Weryfikacja:** vitest 801/801 (14 hybrid-load z testem ATL), e2e 161/161 (2 nowe Z115: hybryda z interferencją i dismissem po reloadzie; konto tylko-siłowe 100% bez crasha), bramki komplet.

### 2026-07-19 — X15B FAZA 1 (Z114): silnik obciążenia hybrydowego

**sTRIMP (Foster session-RPE):** load siłowy = minuty x RPE sesji (średnia ważona liczbą ukończonych serii roboczych z exercises[].rpe; fallback RPE 6.0; brak durationSec => serie x 3 min). **Kalibracja do skali TRIMP:** STRENGTH_TO_TRIMP_CALIBRATION = 0.23 — godzinna sesja RPE 6 (sTRIMP 360) zrównana z godzinnym biegiem moderate (~75% HRmax => TRIMP ~83 przy rest 60/max 190); stała jawna, przybita testem (test kalibracyjny: ratio siła/cardio w przedziale 0.8-1.2). UI dostanie etykietę "obciążenie szacunkowe".

**Interferencja (czysta reguła, zero ML):** ciężkie nogi = tonaż ćwiczeń kategorii legs/glutes/calves >= 1500 kg w sesji (próg jawny); intensywne cardio = Run/HIIT/Treadmill nie-easy (intensywność odczuwana; fallback HR >= 140; bieg/HIIT bez danych = wymagający); okno D lub D+1. Wynik: lista par (informacja, nigdy blokada).

**Weryfikacja:** vitest 13/13 hybrid-load (pełne pokrycie czystych funkcji), typecheck/lint zielone.

### 2026-07-19 — RELEASE X15A (Z111-Z113) na prod

**Wdrożone:** rules (manual_activities) + composite index manual_activities(userId, date desc); web index-CyMOYXXe (live zweryfikowane); iOS 1.0.0 build 62 + testflight_external.py (Beta App Review APPROVED). Bramki: vitest 787, e2e 159, rules 156, dist-smoke/offline PASS. Weryfikacja klikana na realnym koncie = KROK USERA (scenariusze pokryte e2e mock; screenshot dialogu cardio w scratchpadzie).

### 2026-07-19 — X15A FAZA 3 (Z113): manualne cardio w widokach + TRIMP

**TRIMP bez HR:** `computeDailyLoad` — realny pomiar HR WYGRYWA; bez HR intensywność odczuwana mapowana na reprezentatywny %HRmax (easy 60 / moderate 75 / hard 88); bez HR i bez intensywności aktywność pominięta (jak dotąd nieobecna). Testy obu ścieżek. TrainingLoadChart w StravaTab dostaje strumień zunifikowany (merge Strava+manual).

**Konsumenci przełączeni na useActivities:** Dashboard (FAZA 2), TrainingPlan kalendarz (FAZA 2), AnalyticsWeeklyTab (podsumowania tygodni: runKm/czas liczą też manualne), TrainingLoadChart. Czysto-Stravowe nietknięte (Race Predictor, HR Zones, Pace/Calories/Elevation, personal bests).

**Odstępstwa odnotowane:** (1) AI podsumowanie tygodnia operuje na AGREGATACH (runKm, czas) — manualne wpisy WCHODZĄ przez unified, ale "etykieta źródła per aktywność" nie ma nośnika w prompcie (prompt nie listuje aktywności) — wariant prostszy; (2) weekly digest (functions, e-mail) liczy po stronie serwera ze strava_activities — manualne wpisy nie wchodzą do MAILA (backlog: rozszerzenie digestu o manual_activities); (3) Training Load w UI żyje w zakładce Strava — user bez Stravy nie widzi TRIMP (X15B doda kartę obciążenia hybrydowego w Analytics dla wszystkich).

**Weryfikacja:** vitest 787/787 (10 training-load z nowymi ścieżkami), e2e 159/159 (nowy: manualny bieg 5 km w podsumowaniu tygodnia; regresja tylko-Strava = komplet istniejących), bramki komplet.

### 2026-07-19 — X15A FAZA 2 (Z112): UI logowania cardio

**AddCardioDialog:** typ (grid 10 chipów z ikonami) + czas w MINUTACH obowiązkowe (decyzja: minuty zamiast mm:ss — cardio loguje się w minutach, mniej tarcia niż parser), data edytowalna (wpisy wsteczne), reszta pod Collapsible "więcej" (dystans km->m, HR, kalorie, intensywność easy/moderate/hard, notatka). Wejścia: Dashboard (przycisk obok "Szybki trening", grid 2 kolumny) i kalendarz TrainingPlan (przycisk "Cardio" przy każdym dniu z defaultDate). Edycja: klik karty manualnej otwiera dialog z przyciskiem Usuń (ConfirmDialog); wpisy Strava read-only (klik = szczegóły Strava jak dotąd).

**StravaActivityCard rozszerzona chirurgicznie:** opcjonalny prop onEdit; wpis manualny = badge "Ręczny" + kolor fitness-cyan (Strava zostaje pomarańczowa brandowo); brak propa = render identyczny jak dotąd (zero regresji Strava). Dashboard i TrainingPlan przeszły na useActivities (manual ZAWSZE widoczne, Strava gate connected jak dotąd); weeklyKm i komponenty czysto-Stravowe nietknięte.

**Fix przy okazji (lint):** build/sim (build symulatorowy z weryfikacji X14B) nie był w ignores eslinta — lint failował od tamtej pory, maskowane przez `| tail` (exit code tail-a). Fix: ignores "build/**". Lekcja: bramki bez pipe albo z pipefail.

**Weryfikacja:** vitest 785/785, e2e 158/158 (nowy: dodaj Bieżnia 30 min -> Dashboard+kalendarz -> edycja 45 min -> usunięcie z potwierdzeniem), bramki komplet.

### 2026-07-19 — X15A FAZA 1 (Z111): model i hooki manual_activities

**Architektura:** osobna kolekcja `manual_activities` (kształt podzbioru StravaActivity + source='manual'; NIE dotykamy strava_activities — sync nadpisuje). Zamknięta lista 10 typów (Run/Ride/Walk/Hike/Swim/Treadmill/IndoorRide/JumpRope/HIIT/Other), jednostki kanoniczne (metry/sekundy). `sanitizeManualActivity`: typ+data+czas obowiązkowe, śmieciowe wartości opcjonalne POMIJANE (nie unieważniają wpisu), zero undefined. `UnifiedActivity = StravaActivity & { source, perceivedIntensity? }` + `mergeActivities` (sort desc po dacie, stabilny po id). Hooki: `useManualActivities` (CRUD, onSnapshot userId+date desc limit 500, E2E localStorage) + `useActivities` (warstwa scalająca; Strava zostaje read-only).

**Rules:** zamknięty schemat validManualActivityShape (11 testów, 156/156) + composite index manual_activities(userId, date desc). `perceivedIntensity` easy/moderate/hard = wejście TRIMP bez HR (mapowanie 60/75/88 %HRmax w FAZIE 3).

**Weryfikacja:** vitest 785/785 (9 manual-activity), e2e 157 (1 flake w pierwszym runie, retry czysty), bramki komplet.

### 2026-07-19 — RELEASE X14C (Z109-Z110) na prod — X14 KOMPLETNY

**Wdrożone:** rules (workouts.importBatchId) + NOWY composite index workouts(userId, importBatchId) na cloud.firestore; web index-OskchBvM na gh-pages (live zweryfikowane pętlą aż nowy hash); iOS 1.0.0 build 61 + testflight_external.py (obie grupy, Beta App Review APPROVED). Bramki: vitest 776, e2e 157, rules 145, dist-smoke/dist-offline PASS.

**Weryfikacja end-to-end importu:** wykonana na KONCIE TESTOWYM e2e (mock, zero dotykania realnych kont): pełny scenariusz importu fixture Strong (3 treningi, 1 uszkodzony wiersz zliczony, auto-mapowanie 7/7) -> historia ze snapshotami nazw -> idempotencja (2x ten sam plik = nadal 3) -> cofnięcie (0 treningów). Screenshot wizarda w scratchpadzie sesji (import-wizard.png). Statystyka auto-mapowania na fixtures: Strong 7/7, Hevy analogiczne nazwy pokryte aliasami+mapą EN.

**X14 (A+B+C) DOMKNIĘTY:** wszystkie 3 plany wykonane i wdrożone tego samego dnia (buildy 59/60/61, web index-CNXBdODL -> DwKIaJCS -> OskchBvM). Następny: X15A (ręczne cardio).

### 2026-07-19 — X14C FAZA 2 (Z110): kreator importu + zapis + cofnięcie

**Bezpieczeństwo danych (dane usera święte):** zapis WYŁĄCZNIE nowych dokumentów `imported-<batchId>-<n>` (istniejące treningi niedotykane — test rules na cudzy userId), zero zapisów bez jawnego checkboxa potwierdzenia w kroku podglądu (N treningów, zakres dat, M serii), cofnięcie jednym przyciskiem = delete po `importBatchId` (query userId+importBatchId, NOWY composite index w firestore.indexes.json), idempotencja = batchId z hasha pliku (FNV-1a x2, 16 hex — decyzja: synchroniczny hash zamiast async crypto.subtle, wystarczający per user).

**Implementacja:** rules: `importBatchId` dopisany do validWorkoutShape (string<=64) + 4 testy (145/145); hook: `importCsvSessions` (batched po 400, progress callback, gałąź E2E na localStorage fittracker_e2e_workouts) + `deleteImportBatch`; `WorkoutImportWizard` w Ustawieniach -> Twoje dane (kroki: plik -> podsumowanie+mapper (select 241+custom, "jako własne" przez useCustomExercises, wybór kg/lbs dla Strong) -> checkbox -> zapis z progress -> sukces; Historia importów w localStorage `fittracker_import_history_v1`, max 20 wpisów).

**Weryfikacja skutków:** PRy/rekordy/wykresy/heatmapa liczą z całej historii — imported wchodzą z DATAMI HISTORYCZNYMI z CSV (getExerciseBest1RM.bestDate = w.date; brak fałszywych "dzisiejszych" PR — import nie triggeruje detectNewPRs, ta ścieżka działa tylko przy kończeniu treningu). E2E: pełny scenariusz (import fixture -> historia z snapshotem dayName -> idempotencja 2x = nadal 3 treningi -> cofnięcie = 0) + rekordy w Achievements z importu.

**Weryfikacja:** vitest 776/776, e2e 157/157, rules 145/145, bramki komplet. Flaki e2e w pełnych runach (3 różne testy, zawsze pass w izolacji) = obciążenie maszyny przy równoległości, nie regresja.

### 2026-07-19 — X14C FAZA 1 (Z109): parser CSV Strong/Hevy + mapowanie nazw

**Formaty (zweryfikowane na realnych eksportach z GitHuba, nie z pamięci):** Strong `Date,Workout Name,Duration,Exercise Name,Set Order,Weight,Reps,Distance,Seconds,Notes,Workout Notes,RPE` (data "YYYY-MM-DD HH:MM:SS", warmup Set Order=W, jednostka wagi NIEZAPISANA w pliku => opcja strongWeightUnit w wizardzie, default kg); Hevy `title,start_time,...,exercise_title,...,set_index,set_type,weight_kg,reps,distance_km,duration_seconds,rpe` (daty ISO albo "30 Jun 2025, 19:56"; set_type normal/warmup/dropset/failure albo 1/2/3/4; starszy wariant weight_lbs/distance_miles => auto-wykrycie kolumny z danymi). Parser: własny splitter CSV (quoted fields), przecinek dziesiętny PL, uszkodzone wiersze pomijane z licznikiem, grupowanie sesji po (data+nazwa treningu).

**Mapowanie nazw:** kolejność prób custom usera -> exact PL -> alias Strong/Hevy (~55 pozycji, tylko gdy cel istnieje w bibliotece) -> odwrócona mapa EXERCISE_NAME_EN (241 par za darmo) -> transformacja "X (Equipment)" -> "Equipment X". Nieznane nazwy NIE są zgadywane (unmapped => ręczny mapper w UI). `buildImportedSessions`: id=dayId=`imported-<batchId>-<n>`, snapshot nazw, completed, tag `importBatchId` (nowe opcjonalne pole WorkoutSession), RPE ćwiczenia = max z serii, sanityzacja clampSet (zero undefined).

**Weryfikacja:** vitest 775/775 (13 parser + 10 mapper na fixtures wiernych strukturze), e2e 155/155, bramki komplet.

### 2026-07-19 — RELEASE X14B (Z105-Z108) na prod

**Wdrożone:** rules (custom_exercises + tracking) na cloud.firestore; web index-DwKIaJCS na gh-pages (live zweryfikowane po propagacji CDN ~60 s); iOS 1.0.0 build 60 + testflight_external.py (obie grupy, Beta App Review APPROVED od razu). Bramki: vitest 752, e2e 155, rules 141, dist-smoke (build:mobile) i dist-offline (build web!) PASS.

**Lekcja pipeline (kolejność dist checków):** `check:dist-offline` WYMAGA builda WEB (SW wyłączony w build:mobile) — kolejność: build:mobile -> dist-smoke -> build (web) -> dist-offline. Uwaga na maskowanie exit code: `skrypt | tail -1` zwraca exit tail-a — dist-offline "przechodził" mimo faila. Druga lekcja: NIGDY dwa ios-testflight.sh równolegle (wspólne build/ios i DerivedData — pierwsza próba builda 60 padła "4 failures" przez wyścig; ubić stary pipeline przed nowym).

**Weryfikacja na symulatorze (iPhone 17):** build Debug sim + instalacja + start — apka startuje bez białego ekranu, Dashboard z przyciskiem "Szybki trening" (X14A) renderuje się poprawnie. Na symulatorze zalogowane REALNE konto — scenariusz klikany plank+asysta+kalkulator wykonany wyłącznie w e2e mock (155 testów, w tym te scenariusze 1:1); zero zapisów na realnym koncie (dane święte).

### 2026-07-19 — X14B FAZA 3 (Z107+Z108): kalkulator talerzy + generator rozgrzewki %1RM

**Z107:** `computePlates` (greedy od najcięższych, arytmetyka w gramach — float 1.25 kg bez błędów; count = ŁĄCZNA liczba talerzy, floor(count/2) na stronę; cel<gryf => belowBar; niedokładność => najbliższy osiągalny W DÓŁ + info). Inwentarz w localStorage `fittracker_plate_inventory_v1` (gryf 20/15/10 + checkboxy talerzy w Ustawieniach; default pełny zestaw 25...1.25). UI: `PlateCalculatorSheet` (bottom sheet, wizualizacja talerzy na stronę) otwierany ikoną Disc w FOOTERZE karty ćwiczenia (nie per wiersz serii — grid serii to krytyczna ścieżka logowania, zero zmian w nim); ciężar = aktywna seria, fallback ostatnia robocza. Tylko weight_reps z ciężarem > 0.

**Z108:** `generateWarmupSets` — pusty gryf x10, 50% x8, 70% x5, 90% x2 od PIERWSZEGO ciężaru roboczego; zaokrąglanie W DÓŁ do 2.5 kg (lżejsza rozgrzewka bezpieczniejsza — decyzja w ramach autonomii); serie <= gryf i >= ciężaru roboczego pomijane; null dla bodyweight/duration/assisted. Przycisk (Flame+%) w footerze karty, znika gdy istnieją wypełnione warmupy (bez duplikacji). Dostępny w każdej karcie weight_reps z ciężarem (plan mówił "przy pierwszym ćwiczeniu" — rozszerzenie w ramach autonomii, rozgrzewka procentowa ma sens przy każdym boju). Warmup nie liczy się do tonażu (istniejący test regresji).

**Weryfikacja:** vitest 752/752 (6 plate-calculator, 6 warmup-generator), e2e 155/155 (rozkład 100 kg => "1×25 + 1×15"; generator wstawia 4 wiersze W i przycisk znika), bramki komplet.

### 2026-07-19 — X14B FAZA 2 (Z106): PR, tonaż i progresja per typ (asysta = wyróżnik)

**Obciążenie efektywne:** `computeEffectiveLoad` (effective-load.ts): assisted = masa ciała MINUS asysta (clamp 0 gdy asysta > waga), bodyweight = masa ciała, duration = null. **Skąd waga ciała:** najnowszy pomiar z `measurements` (`getLatestMeasurement`); **brak pomiaru** = PR asysty tylko po powtórzeniach + hint w dialogu progresji "dodaj pomiar wagi". Uproszczenie v1 (odnotowane): jedna AKTUALNA waga do obu stron porównania historycznego (nie mamy wagi per trening) — różnice effectiveLoad = różnice asysty, więc detekcja PR poprawna.

**PR per typ (`detectNewPRs` + opcjonalny 5. parametr, stare wywołania bez zmian):** assisted -> PR gdy effectiveLoad rośnie przy >= powtórzeniach (test wprost odtwarza skargę z r/Hevy: te same powtórzenia, mniejsza asysta => JEST PR); duration -> PR czasu; wdd -> PR iloczynu kg x m. WorkoutDay przekazuje trackingByExerciseId + bodyWeightKg (toast PR po treningu).

**Tonaż (twarda zasada 4, zapisana testami):** duration i assisted NIE wchodzą (weight=0); wdd wchodzi jako ciężar x 1 na serię (`setTonnage` w summary-utils). **Wykresy:** `getTrackedExerciseHistory` (duration: czas; assisted: effectiveLoad — malejąca asysta daje ROSNĄCĄ linię, fallback reps bez wagi; wdd: kg·m) + dedykowany widok w ExerciseProgressionDialog (resolwuje tracking z customExercises/biblioteki). **Achievements:** wariant prostszy — serie weight=0 nie generują rekordu 1RM (test), rekordy kg czyste; wartości typowane widać w dialogu progresji i historii.

**Weryfikacja:** vitest 740/740 (29 pr-utils, 13 progression, 20 summary, 7 effective-load, 18 achievements), e2e 153/153 (+utwardzenie flaky testu count bez auto-wait), typecheck/lint/build/budget zielone.

### 2026-07-19 — X14B FAZA 1 (Z105): silnik typów serii (czas/dystans/asysta)

**Model:** `SetData` rozszerzone TYLKO polami opcjonalnymi `durationSec`/`distanceM`/`assistWeight` (zero migracji). Typ per ćwiczenie: `LibraryExercise.tracking` + `getTrackingType`/`visibleSetFields` w `src/lib/set-tracking.ts` (brak pola = weight_reps, isBodyweight = bodyweight_reps, jawne pole wygrywa). Biblioteka: 3 planki -> duration, Farmer's Hold -> weight_distance_duration, Podciąganie wspomagane -> assisted_bodyweight + NOWE: Spacer farmera (wdd) i Dipy wspomagane (assisted) z tłumaczeniami EN. Własne ćwiczenia: wybór typu w formularzu pickera (chipy Standard/Na czas/Ciężar+dystans+czas/Z asystą), pole `tracking` w custom_exercises (rules: opcjonalne, zamknięta lista, 2 nowe testy).

**UI:** nowa gałąź renderu wiersza serii (renderTrackedSetRow) — ścieżka weight_reps/bodyweight_reps NIETKNIĘTA (twarda zasada: logowanie serii nie może zwolnić). Czas jako mm:ss (DurationInput: draft lokalny, parse na blur — parsowanie per znak psuje edycję), dystans w m, asysta "-kg". Historia: `formatHistorySetLabel` z ZAWARTOŚCI serii (historyczne dane nie znają trackingu). Coach serii: duration/wdd świadomie null, asysta = cel powtórzeniowy.

**Root cause (3 kopie sanityzacji gubiły nowe pola):** WorkoutDay.handleSetsChange/Local (inline map), exercise-utils.sanitizeSets, workout-draft-db.normalizeSet — każda przepisywała serie do {reps,weight,completed,isWarmup} i wycinała durationSec/distanceM/assistWeight (objaw: wartość w UI, brak w drafcie po round-trip IndexedDB). Fix: wspólny `carrySetExtras` (exercise-utils) + rozszerzenie normalizeSet; `setsMatch` w workout-final-sync porównuje też nowe pola (rozjazd = rozjazd zapisu). Rules workouts: pola serii NIE są walidowane wprost (validWorkoutShape sprawdza tylko top-level + notes) — zmiana rules niepotrzebna.

**Weryfikacja:** vitest 711/711, e2e 153/153 (2 nowe Z105: plank+farmer+asysta w szybkim treningu z draftem; render historii "1:30" / "24 kg · 40 m · 1:00" / "8×-25 kg"), rules 141/141, bramki komplet.

### 2026-07-19 — RELEASE X14A (Z103-Z104) na prod

**Wdrożone:** rules (exercise_notes) na cloud.firestore; web index-CNXBdODL na gh-pages (zweryfikowane live: nowy hash + render #root bez pageerrors w headless Chromium); iOS 1.0.0 build 59 przez ios-testflight.sh + testflight_external.py (obie grupy, Beta App Review: APPROVED od razu; Robert dostaje build). Bramki przed wdrożeniem: vitest 681, e2e:mock 151, typecheck, lint, build, bundle budget (initial 1 471 846 B), dist-smoke PASS (build:mobile), dist-offline PASS.

**Krok weryfikacji na koncie admina (częściowo ODŁOŻONY):** Chrome extension niepodłączony (user nieobecny, sesja autonomiczna), brak headless credentials — wykonano smoke live (render, zero błędów JS) zamiast pełnego scenariusza klikanego. KROK USERA: na live przypiąć notatkę przy ćwiczeniu i odpalić "Szybki trening" z Dashboardu (scenariusze pokryte e2e mock 1:1).

### 2026-07-19 — X14A FAZA 2 (Z104): szybki trening bez planu (empty workout)

**Co:** przycisk "Szybki trening" na Dashboardzie (widoczny ZAWSZE, także bez planu), syntetyczny dzień `adhoc-<YYYY-MM-DD>-<ts>` (`src/lib/adhoc-workout.ts`: createAdhocDay/adhocDayFromId/isAdhocDayId/buildAdhocExerciseId), w WorkoutDay fallback `baseDay` z adhocDayFromId + przycisk "Dodaj ćwiczenie" (wspólny ExercisePicker Z69) tylko dla ad-hoc. Trening idzie ISTNIEJĄCĄ ścieżką (handleStartWorkout, draft-db, maszyna stanów, batchSaveWorkout) — zero równoległej ścieżki. Pre-fill serii dodanego ćwiczenia działa po nazwie (zweryfikowane: `getPreviousSets` fallback `previousSetsByName`).

**Root cause fix (hydracja):** świeży draft ad-hoc ma 0 ćwiczeń — `resolveWorkoutHydration` uznawał go za pusty i resetował sesję zaraz po starcie (UI wracało do "Rozpocznij trening"). Fix: `draft.dirty && isAdhocDayId(draft.dayId)` => hydratowalny (test w workout-hydration.test.ts).

**Ograniczenie e2e mock (świadome):** finalny sync w mock e2e wisi (Firestore zablokowany, silnik bez timeoutu), więc scenariusz e2e weryfikuje start->dodanie 2 ćwiczeń->odhaczenie serii roboczej->draft w IndexedDB + widoczność "Zakończ trening"; ścieżkę finalSyncPending pokrywa istniejący test Z49, historię ad-hoc test z seedem setE2EWorkouts (snapshot dayName "Szybki trening" renderuje się w Historii bez zmian w widokach), background/resume test zimnego startu z auto-resume do ad-hoc.

**Decyzje w ramach autonomii:** (1) id dodanego ćwiczenia = `adhoc-ex-<slug>` (slugifyExercise, sufiks -N przy kolizji) zamiast reuse buildSwappedExerciseId (mylący format `__swap`); (2) monotoniczny ts w adhoc id (dwa starty w tym samym ms); (3) przycisk "Edytuj plan dnia" ukryty dla ad-hoc (nie ma go w planie); (4) domyślnie 3 serie dla dodanego ćwiczenia.

**Weryfikacja:** vitest 681/681, e2e 151/151 (3 nowe Z104), typecheck/lint/build/bundle zielone.

### 2026-07-19 — X14A FAZA 1 (Z103): przypięte notatki per ćwiczenie

**Co:** trwała notatka per ćwiczenie (technika + ustawienia maszyny), widoczna i edytowalna w każdej sesji z tym ćwiczeniem, niezależnie od planu. Nowa kolekcja `exercise_notes` (doc id deterministyczny `${userId}_${slug(nazwa)}`, reuse `slugifyExercise` z exercise-media), model+sanityzacja w `src/lib/exercise-notes.ts` (rozszerzenie istniejącego pliku Z74, nie nowy plik), hook `useExerciseNotes` (wzorzec useCustomExercises: jedna subskrypcja per user, limit 300, E2E fallback localStorage), współdzielony `PinnedNoteSection` w ExerciseCard (nad notatką sesyjną, podgląd zawsze gdy istnieje, zapis TYLKO po zatwierdzeniu) i w ExerciseDetail.

**Decyzje w ramach autonomii:** (1) plan wskazywał "ExerciseLibrary.tsx (szczegół ćwiczenia)" — faktyczny szczegół ćwiczenia to `ExerciseDetail.tsx` (ExerciseLibrary tylko listuje i nawiguje), sekcję wpięto tam; (2) pusta notatka bez ustawień maszyny = delete dokumentu (nie trzymamy pustych docków); (3) klucz mapy notatek = slug nazwy (odporność na spacje/wielkość liter).

**Rules:** zamknięty schemat `validExerciseNoteShape` (hasOnly 5 pól, note<=500, machineSettings<=200, exerciseName 2-120), CRUD tylko właściciel ze statusem active, read także admin; 13 nowych przypadków w test:rules (139/139 zielone).

**Weryfikacja:** vitest 669/669 (12 testów exercise-notes), e2e 148/148 (nowy scenariusz: przypnij w treningu -> zimny start -> notatka widoczna -> widoczna też w szczegółach ćwiczenia). Fix przy okazji: selektor `getByText('Notatka')` w exercise-card-v3.spec doprecyzowany do getByRole (kolizja substring z "Przypięta notatka").

### 2026-07-19 (wieczór) — X16C wersja 2: aplikacja Garmin Connect IQ zamiast Health API

**Decyzja usera:** ścieżką Garmin jest dedykowana aplikacja Connect IQ (device app na zegarku), nie server-side Health/Activity API. **Powody:** (1) Health API wymaga akceptacji Garmin Connect Developer Program (gatekeeper, tygodnie, możliwa odmowa solo-devowi), Connect IQ nie ma gatekeepera (SDK darmowe, dystrybucja przez Connect IQ Store ze zwykłą recenzją); (2) import cardio od userów Garmina w większości pokrywa już Strava (auto-sync Garmin→Strava); (3) CIQ daje więcej: logowanie serii z nadgarstka na Garminie (nie ma tego NIKT w kategorii) + trening siłowy natywnie w Garmin Connect (sesja FIT z HR nagrywana na zegarku, bez żadnego API).

**Architektura (plan `docs/PLAN-X16C-2026-07-19.md` wersja 2, Z125-Z127):** zegarek rozmawia z naszym backendem (nie z telefonem): parowanie 6-cyfrowym kodem (`device_pair_codes` TTL 10 min → token urządzenia, hash w `device_tokens`), `garminDay` (kontekst dnia, REUŻYCIE `watch-contract.ts` z X16B), `garminIngest` (idempotentne zdarzenia, zapis WorkoutSession ze snapshotami przez Admin SDK). Zegarek równolegle nagrywa natywną sesję strength (FIT). V1 standalone: bez live-syncu z draftem telefonu (guard jednoczesności: osobna sesja, zero mergowania). Health API import → backlog (opcja, gdyby Garmin przyznał dostęp).

### 2026-07-19 — Kierunek rozwoju X14-X16: synteza 3 deep researchy (Gemini, Claude, ChatGPT)

**Decyzja usera:** pełna sekwencja X14 (parytet + quick wins) -> X15 (hybryda siła+cardio = moat) -> X16 (warstwa premium: progresja, Watch, Garmin). Wykonanie w pełni autonomiczne wg `docs/PROMPT-WDROZENIE-X14-X16.md`.

**Podstawa:** 3 niezależne deep researche (2026-07-19) zgodne co do: (1) table stakes, których brak wywołuje churn: przypięte notatki/ustawienia maszyn (pain point nr 1 kategorii, migracje Hevy<->Strong), empty workout, import CSV, typy serii czas/dystans/asysta, kalkulatory; (2) niszy-zwycięzcy: hybrydowcy (Garmin +23% r/r userów łączących bieg i siłę; mamy już Strava+TRIMP+Race Predictor = więcej infrastruktury hybrydowej niż Hevy/Strong, brakuje ręcznego cardio i wspólnego obciążenia); (3) czego NIE budować: feed społecznościowy z lajkami, własna baza żywieniowa, HRV/readiness jako silnik rekomendacji, sztywny cycle syncing, VBT, AI analiza techniki. Wyróżnik techniczny: poprawny PR dla ćwiczeń z asystą (waga ciała minus odciążenie), czego nie liczy dobrze NIKT z konkurencji. Wideo techniki: spór raportów (2:1 za), odłożone do backlogu v2 (top 50 ćwiczeń, etapami).

**Monetyzacja (kierunkowo, gating = osobna decyzja przy launchu):** X14 w całości FREE (broń akwizycyjna: Strong gate'uje kalkulatory), premium = progresja programowa + analityka hybrydowa + Watch. Rynek PL: rozważyć lifetime 99-149 zł (alergia PL na subskrypcje, sygnał SFD/Wykop). Benchmark: Hevy Pro $23.99/rok przy 14 mln userów = darmowy rdzeń musi być hojny.

**Artefakty:** plany `docs/PLAN-X14A/B/C`, `PLAN-X15A/B/C`, `PLAN-X16A/B/C` (wszystkie 2026-07-19, zadania Z103-Z126) + prompt agenta `docs/PROMPT-WDROZENIE-X14-X16.md` (odporny na urwanie sesji: checkboxy planów = źródło prawdy, wznowienie tym samym promptem). Kamienie M51-M53 w PLAN.md.

### 2026-07-17 (wieczór) — LEKCJA TestFlight: internal-setup nie wystarcza dla Roberta

**Objaw:** user widział w TestFlight build 52; buildy 53-58 (wersja 1.0.0) nie docierały do grupy zewnętrznej. **Przyczyna:** release trainy X12B-X13C podpinały buildy TYLKO do grupy wewnętrznej (`asc_api.py internal-setup`); grupa "Testerzy zewnętrzni" (Robert) wymaga per build: podpięcia + zgłoszenia do Beta App Review (`testflight_external.py`), czego pipeline nie robił. Dodatkowo 1.0.0 to NOWA wersja marketingowa = pełny Beta App Review.

**Naprawa:** `testflight_external.py 58` (uv --with pyjwt[crypto] --with requests): build 58 podpięty do obu grup, What to Test ustawione, zgłoszony (WAITING_FOR_REVIEW; Robert dostanie po approvalu ~24h). Internal widzi build 58 od razu — w aplikacji TestFlight buildy 1.0.0 są NOWĄ sekcją nad 6.13.0 (52), czasem trzeba odświeżyć listę.

**Reguła na przyszłość (checklist):** po każdym buildzie TestFlight odpalać `testflight_external.py <build> --whats-new "..."` ZAMIAST samego internal-setup (robi oba podpięcia + review); przy serii buildów jednego dnia wystarczy zgłosić OSTATNI.

### 2026-07-17 — X13C (Z100-Z102): zdalne naprawy kont + dziennik akcji admina

**Architektura:** klient admina NIGDY nie pisze w cudzych dokumentach — naprawy wykonuje callable `adminUserRepair` (serwerowa weryfikacja roli), zawsze: dry-run (zero zapisów) -> apply z automatycznym backupem dokumentów `before` do `admin_repair_backups` (TTL 90 dni) -> operacje batched -> wpis audytu. Algorytmy 4 napraw jako czyste funkcje operacji z testami PARYTETU klient<->functions na wspólnych fixtures JSON (kopia pliku po obu stronach, dryf łapią testy).

**Świadome zawężenia server-side (vs naprawy z Ustawień):** mergeCycles bez maszyny wznawialnej R2 (Admin SDK batch atomowo, do 400 op/batch); repairHistory dopisuje TYLKO brakujący cycleId i etykiety dnia ze snapshotu cyklu (bez przepisywania serii/nazw ćwiczeń — rzadki legacy case zostaje naprawialny z Ustawień). Backlog: konsolidacja napraw z Ustawień na te same Functions.

**Dziennik (Z101):** `admin_audit_log` create-only dla admina (schemat zamknięty hasOnly, update/delete nikt, TTL 365 dni); `logAdminAction` wpięty we WSZYSTKIE akcje admina (toggles/suspend przez hook, reset/resend/email/kohorty/delete w AdminDashboard); naprawy dopisuje Admin SDK. Widok: AdminAuditLog (50 wpisów) w panelu.

**UI (Z102):** sekcja NAPRAWY KONTA w szczególe usera: 4 akcje, "Wykonaj" aktywne dopiero po świeżym dry-run, ConfirmDialog z liczbą operacji, wynik z backupId, po apply automatyczny ponowny dry-run.

**Weryfikacja integracyjna na EMULATORZE (konto testowe, tmp/x13c-emulator-verify.mjs):** dry-run merge pokazał 3 operacje bez żadnego zapisu; nie-admin odrzucony; apply połączył 2 cykle w 1 (endDate 2026-05-28, trening przepięty na cykl pierwotny), backup zawierał 3 dokumenty before, wpis audytu `repair:mergeCycles`; dedupe usunął pusty duplikat. Rules: 0 FAIL (backupy: klient nie pisze; audyt: create-only, bez edycji).

### 2026-07-17 — X13B (Z97-Z99): panel admina 2.0 (przełącznik, lista z aktywnością, szczegół usera)

**Z97:** sticky pasek "PANEL ADMINA" (fitness-warning) + "Wróć do aplikacji" nad panelem; wejścia bez zmian (Profil + dropdown sidebara). **Z98:** `UsersActivityTable` — wiersz+ekspander przeniesione 1:1 z AdminDashboard (handlery propsami, zero zmian logiki), nowe kolumny: badge active/idle/dormant, ostatnia aktywność, dni aktywne 7/30, treningi 7/30 z `users.activitySummary`; sort domyślnie po aktywności. **Z99:** strona `/admin/users/:uid` (lazy): wykres 30 dni (recharts), staty, top ekrany/akcje (etykiety i18n), plan + link do edytora, uprawnienia przez wspólny hook `useAdminUserActions` (lista i szczegół używają tej samej logiki), błędy klienta; odczyty on-demand ~43 max, zero odczytów kolekcji workouts.

**Weryfikacja end-to-end rollupu na PRODUKCJI:** ręczne uruchomienie `firebase-schedule-activityRollup` (gcloud scheduler jobs run) po dodaniu brakującego composite index (userId+date; pierwotny run padł na FAILED_PRECONDITION) zapisało realne `users/{admin}.activitySummary`: lastActiveAt 2026-07-17, activeDays30=19, activeDays7=5 (z historycznych liczników sync_*); workouts/topScreens wypełnią się z nowej wersji apki. Lekcja: gcloud na tym projekcie wymaga `--account g.jasionowicz@gmail.com`.

**Bramki:** unit 654, e2e:mock 147 (admin-switch: redirect nie-admina, pasek+powrót, szczegół z pustymi danymi bez crasha), rules 0 FAIL, budget (initial 1 469 499 B, szczegół w lazy chunku).

### 2026-07-17 — X13A RELEASE TRAIN: telemetria produktowa wdrożona (rules + functions + web + iOS 56)

**Wdrożone:** firestore.rules (zamknięte liczniki + expiresAt), functions (scheduled activityRollup 03:30 Europe/Warsaw), web index-BtD9oq7c (ProductTelemetry aktywna), iOS build 1.0.0 (56) VALID w grupie Wewnętrzni. Polityka TTL 180 dni na app_telemetry_daily przez gcloud (konto g.jasionowicz@gmail.com; konto grzegorzee@ nie ma uprawnień - zapisana lekcja: gcloud --account).

**Weryfikacja end-to-end:** ścieżka kliencka potwierdzona e2e (nawigacja po 3 ekranach zostawia w buforze localStorage session_active=1 + screen_dashboard/analytics/profile; flush wymaga realnego auth, więc dokument produkcyjny pojawi się przy pierwszym użyciu apki przez usera, a users.activitySummary po pierwszym nocnym rollupie ~03:30). Skrypt read-only tmp/x12-diagnoza.mjs pozwala to sprawdzić następnego dnia.

**Koszt:** bez zmian po stronie klienta (1 zapis per flush 30 s przy aktywności); rollup raz dziennie ~N+30N odczytów, N zapisów dla N userów aktywnych wczoraj. **App Privacy (przed publicznym launchem):** dodać "Product Interaction" w App Store Connect; na TestFlight internal wystarczy obecna nota.

### 2026-07-17 — X13A FAZA 2 (Z95-Z96): rules, retencja 180 dni, rollup do users.activitySummary

**Z95 rules (commit po b352e6e):** schemat liczników domknięty WŁAŚCIWIE: `counters.keys().hasOnly(pełna unia TelemetryEventName)`; odkryte przy okazji, że historyczne wpisy 'counters.xxx' w top-level hasOnly nigdy nie walidowały nazw (pola dokumentów legacy) — zachowane dla merge na starych dokumentach. Retencja: flush dopisuje `expiresAt` (+180 dni); polityka TTL gcloud w release train. Testy rules 117+ PASS (nowe: liczniki allow/deny, expiresAt, cudzy dokument, klient nie zapisze activitySummary).

**Z96 rollup (commit 064da40):** `computeActivitySummary` (czysta, testy: okna 7/30, topScreens z remisem alfabetycznym, puste wejście) + `runActivityRollup` (O(aktywnych wczoraj): query date==wczoraj -> per user 30 dni dokumentów -> merge `users/{uid}.activitySummary`, bounded concurrency 8) + scheduled 03:30 Europe/Warsaw. Typ `ActivitySummary` w UserProfile (odczyt klienta; zapis tylko Admin SDK, rules deny potwierdzone testem). Koszt: przy N aktywnych wczoraj ~N+N*30 odczytów i N zapisów raz dziennie.

**Bramki:** unit 650, functions 87, rules 0 FAIL, e2e 144, build/budget (initial 1 466 058 B).

### 2026-07-17 — X13A FAZA 1 (Z94): telemetria produktowa (sesje, ekrany, akcje)

**Kształt (rozszerzenie ISTNIEJĄCEGO mechanizmu, zero nowych kolekcji):** `app_telemetry_daily/{uid}-{YYYY-MM-DD}`: `{ userId, date, updatedAt, counters: { <TelemetryEventName>: number } }`; bufor localStorage + flush co 30 s (TelemetryHeartbeat) — koszt bez zmian (1 zapis per flush). Nowe liczniki (zamknięta unia TS): `session_active`, 11x `screen_*` (whitelist tras, admin poza), 7x `action_*` (started/completed/set_checked/plan_edited/replan_completed/export_data/strava_opened). Prywatność: liczniki bez treści, zero clickstreamu.

**Wpięcia:** ProductTelemetry w HashRouter (session_active raz dziennie z guardem localStorage + visibilitychange dla zmiany dnia po powrocie z tła; screen_* przy zmianie trasy, ta sama trasa pod rząd raz), akcje po 1 linii w istniejących handlerach. Testy: product-telemetry (mapowanie tras, guard dnia per user); 650 unit, e2e 144, typecheck, lint.

**ZNALEZISKO (naprawione w Z95.1):** wpisy `counters.*` w top-level hasOnly NIGDY nie walidowały nazw liczników (to pola dokumentów LEGACY z płaskim zapisem, nie walidacja dot-notation) — nazwy liczników były w praktyce niezamknięte (flush działał, ale rules nie zamykały schematu). Z95.1 domknął schemat właściwie: `counters.keys().hasOnly(pełna unia)`, legacy płaskie klucze zachowane dla merge na starych dokumentach.

### 2026-07-17 — Web push (commit c6430fc) + Android release prep (commit 8dfa261) + build 55

**Web push:** cały kod wdrożony: `public/firebase-messaging-sw.js` (SW powiadomień w tle, config Firebase w query stringu rejestracji, własny scope `fcm/` obok SW workboxa — gh-pages nie kontroluje roota domeny, więc jawna rejestracja spod base), gałęzie web w `push-notifications.ts` (Notification API + FirebaseMessaging.getToken z vapidKey i własną rejestracją SW). Backend gotowy od dawna (registerPushToken/adminSendPush/dailyTrainingReminder — tokeny web obsługiwane bez zmian). **ODŁOŻONY 1 KROK (wymaga konsoli):** wygenerowanie klucza VAPID (Firebase Console -> Project settings -> Cloud Messaging -> Web Push certificates -> Generate key pair) i wpisanie do `.env` jako `VITE_FIREBASE_VAPID_KEY` + redeploy web. Bez klucza web zachowuje się jak dotąd (push 'unsupported', zero regresji). Konsola nie ma API na VAPID, a rozszerzenie Chrome nie było podłączone w tej sesji.

**Android:** keystore release wygenerowany (`FIRMA/_secrets/android/strength-save-release.keystore` + properties, chmod 600), SHA-1 release dodany do Firebase (apps:android:sha:create), signing config w build.gradle (czyta gitignorowane `android/key.properties` -> _secrets; brak pliku = build bez podpisu jak dotąd), `app-release.aab` (14.6 MB) zbudowany i zweryfikowany (jarsigner: jar verified). **ODŁOŻONE (wymaga płatności/konta usera):** rejestracja Google Play Console (25 USD), store listing, upload AAB.

**iOS build 1.0.0 (55)** (P0 walidacja + M19 offline + M20 PDF) VALID na TestFlight, grupa Wewnętrzni.

### 2026-07-17 — M19: PWA offline mode (commit 6167c64)

**Zakres świadomie minimalny (większość offline JUŻ działała):** treningi offline = drafty IndexedDB + kolejka syncu (R1/R2), pomiary offline = mutation queue persistentLocalCache, iOS startuje offline natywnie (SW celowo wyłączony w build:mobile — Capacitor trzyma pliki lokalnie). Brakowało: (1) DOWODU, że web startuje offline (zimny start z SW cache), (2) ludzkiego komunikatu przy zapisie planu offline (transakcje Firestore wymagają sieci).

**Zrobione:** nowa stała bramka `npm run check:dist-offline` (load online rejestruje SW + precache, potem zimny start OFFLINE musi wyrenderować aplikację; wymaga builda WEB) — przechodzi na obecnej konfiguracji VitePWA (precache **/*.{js,css,html,...} obejmuje lazy chunki). `useTrainingPlan.savePlan`: błąd offline mapowany na `err.planOffline` (obie locale). Kolejki edycji planu offline NIE budujemy (kontrakt rewizji wymagałby merge'a konfliktów planu — koszt/ryzyko nieproporcjonalne do częstości edycji planu na siłowni).

### 2026-07-17 — M20: eksport raportu treningowego do PDF (commit c0ae48a)

**Decyzja techniczna:** zamiast wbudowywać fonty TTF w jsPDF (polskie znaki!), raport renderowany jako HTML (fonty przeglądarki, wzorzec share-utils z escapeHtml), zdejmowany html2canvas i osadzany w jsPDF jako obraz A4 (multi-page slicing). jsPDF (381 KB) + html2canvas (198 KB) to LAZY chunki ładowane przy kliku — initial bundle bez zmian (1 464 105 B). Treść: nagłówek (user, data), sumy 12 miesięcy (treningi, czas, tonaż) + tabela miesięcy (reuse `aggregateMonthlyStats` z Z92). Dystrybucja: navigator.share z plikiem (iOS/Android), fallback download (desktop); AbortError ignorowany.

**Weryfikacja:** vitest 646 (model raportu), e2e:mock 144 (pobranie pliku + nagłówek %PDF), typecheck, lint, budget.

### 2026-07-17 — P0: walidacja danych z Firebase w onSnapshot (commit 5fd39f9)

**Problem:** hydracja z Firestore rzutowała dokumenty bez walidacji (`as WorkoutSession` itd.) — uszkodzony dokument (NaN w seriach, brak date, zły status cyklu, zepsute days planu) renderował śmieci albo wywracał widoki.

**Rozwiązanie:** czysty moduł `firestore-doc-guards.ts`. Kontrakty: uszkodzony DOKUMENT = odrzucony z hydracji + raport do client_errors (code `invalid-doc`, detail `kolekcja/id`, limit sesyjny 20 z error-telemetry); uszkodzony FRAGMENT (seria, ćwiczenie) = odfiltrowany, reszta treningu zostaje. Dni planu: uszkodzony dzień unieważnia całą listę (null) — hydracja NIE nadpisuje wtedy dobrego stanu w UI (plan bez jednego dnia jest groźniejszy niż zatrzymanie odświeżenia). Koercje bezpieczne: liczby stringowe -> Number (finite), completed -> bool, nie-finite opcjonalne pola znikają.

**Wpięcia (całość odczytów treningowych):** workout-read-store (listener 500 + paginacja historii; pełność strony liczona z SUROWEGO snapshotu, żeby odfiltrowany dokument nie przerywał paginacji w środku), usePlanCycles (per cykl), useTrainingPlan (days).

**Decyzja release:** P0/M19/M20 to jeden pociąg iOS (build 55 po ukończeniu paczki) — web deployowany po każdej pozycji (tani), TestFlight nie jest mnożony per drobny krok. **Weryfikacja:** vitest 644 (14 nowych), typecheck, lint, build, budget (initial 1 463 248 B), e2e:mock 143.

### 2026-07-17 — X12C RELEASE TRAIN C: karta Miesiące na produkcji (web + iOS build 54)

**Bramki:** vitest 630, typecheck, lint, build, budget (initial 1 459 649 B), e2e:mock 143, dist-smoke PASS (build:mobile).

**Wdrożenie:** git push, web `npm run deploy` zweryfikowany na live (index-C7jDc1gn.js), iOS build 54 (53->54, MARKETING_VERSION zostaje 1.0.0) przez ios-testflight.sh: UPLOAD SUCCEEDED, ASC **build 1.0.0 (54) state=VALID**, grupa Wewnętrzni. Backlog uporządkowany w PLAN.md: P0 walidacja danych z Firebase w onSnapshot -> M19 PWA offline -> M20 eksport PDF -> web push -> Android Google Play.

**Pakiet X12 (A+B+C) w całości wdrożony jednego dnia:** 3 release trainy (web x3 + iOS buildy 52, 53, 54), zero regresji w bramkach.

### 2026-07-17 — X12C FAZY 1-2 (Z92-Z93): statystyki miesięczne w Analityce

**Zgłoszenie usera:** "ile treningów zrobiłem w miesiącu oraz ile czasu poświęciłem... loguję wszystkie treningi od początku roku, każdy ma mieć do tego dostęp".

**Z92 (commit 9f54766):** czysta agregacja `src/lib/monthly-stats.ts`: `workoutDurationSec` (durationSec, fallback completedAt-startedAt, null dla treningów sprzed M32), `aggregateMonthlyStats` (klucz miesiąca z pola `date` — czas lokalny, tylko completed, okno monthsBack, sortowanie od najnowszego; tonaż ISTNIEJĄCYM helperem `calculateTonnage` — ukończone serie bez rozgrzewkowych), `formatDurationHM` ("1 h 23 min" / "49 min"). TDD: 12 testów (granice miesięcy, przełom roku, braki czasu, tonaż z warmup/nieukończonymi).

**Z93 (commity 2b3fc5f, 9a70f53):** karta "Miesiące" na GÓRZE zakładki Podsumowanie w Analityce (bez 5. zakładki, bez gate'ów — dostępna dla każdego zalogowanego). Wiersz per miesiąc: etykieta (Intl toLocaleDateString + dateLocale, spójnie z resztą pliku), "{n} treningów", czas `formatDurationHM` + dopisek "{n} bez zmierzonego czasu" (dane sprzed M32 nie zaniżają sumy), tonaż `fmtTonnage` (spójny z Historią). Źródło danych: `workouts` SummaryTab (listener 500 najnowszych — pokrywa 12 miesięcy z zapasem). Pusty stan: karta nie renderuje się. Liczba mnoga "{n} treningów" zgodna z konwencją sąsiednich kluczy ('{n} serii').

**Weryfikacja:** vitest 630, typecheck, lint, e2e:mock 143 (nowy spec z dynamicznymi datami: bieżący + poprzedni miesiąc); screenshot karty (Lipiec 2026: 2 treningi, 1 h 0 min, 1 bez zmierzonego czasu, 1.0 t). Pułapka e2e: Analytics domyślnie otwiera zakładkę Tygodnie — spec wchodzi przez ?tab=summary.

### 2026-07-17 — X12B RELEASE TRAIN B: aplikacja w wersji 1.0.0 (web + iOS build 53)

**Zakres:** Z89 (Adaptive Coach out), Z90 (hamburger/drawer out + dojścia przez Profil, narzędzia naprawcze za isAdmin), Z91 (wersja 1.0.0 zamrożona do launchu).

**Wersjonowanie (decyzja usera 2026-07-17):** MARKETING_VERSION + package.json + Android versionName = 1.0.0 NA SZTYWNO do launchu; bump tylko CURRENT_PROJECT_VERSION. Zasada dopisana do CLAUDE.md projektu. Naprawiony przy okazji rozjazd: Info.plist miał zahardcodowane CFBundleShortVersionString=6.13.0, teraz $(MARKETING_VERSION) (jedno źródło prawdy w pbxproj).

**Bramki:** vitest 618, typecheck, lint, build, budget (initial 1 459 383 B; łącznie -4 428 B po wycinkach X12B), e2e:mock 142, dist-smoke PASS (build:mobile).

**Wdrożenie:** git push, web `npm run deploy` zweryfikowany na live (index-OvoGHMd8.js, UI pokazuje v1.0.0), iOS build 53 (52->53) przez ios-testflight.sh: UPLOAD SUCCEEDED, ASC pokazuje **build 1.0.0 (53) state=VALID**, podpięty do grupy Wewnętrzni. Pierwsza wysyłka z nową MARKETING_VERSION utworzyła wersję 1.0.0 w App Store Connect bez problemów.

### 2026-07-17 — X12B FAZA 2 (Z90): mobile bez hamburgera i drawera + narzędzia naprawcze tylko dla admina

**Decyzja usera (2026-07-17):** hamburger na mobile "zupełnie niepotrzebny". Kolejność twarda zachowana: najpierw dojścia (Z90.1) i e2e osiągalności (Z90.2, PRZED wycinką), potem wycinka (Z90.3).

**Dojścia po zmianie (tabela):** bottom nav: Dashboard/Plan/Analityka/Ćwiczenia/Profil; Profil sekcja "Twoje dane": Historia, Pomiary, Osiągnięcia (+ wiersz Admin dla isAdmin w sekcji Wsparcie; wcześniej /admin nie miał ŻADNEGO dojścia mobilnego poza drawerem); /cykle z karty planu na Dashboardzie; /settings z Profilu (jak dotąd). Desktop sidebar bez zmian.

**Wycinka (commit a228e33):** AppHeader bez przycisku Menu i propa onMenuClick; Layout bez stanu sidebarOpen; AppNavigation bez Sheet i propsów isOpen/onClose; klucz nav.openMenu usunięty z OBU locale; stary blok e2e "Mobile drawer (Z66)" usunięty, zastąpiony spec'em `mobile-nav-reachability` (przechodził PRZED i PO wycince) + asercja braku hamburgera.

**Z90.4 (commit 13901fa, decyzja usera z aktualizacji planu):** akordeon "Narzędzia naprawcze" w Ustawieniach widoczny TYLKO dla admina (isAdmin); Eksport/Import kopii zostaje dla wszystkich. E2E: active-user bez sekcji, active-admin z sekcją (pułapka: zmiana hasha nie przeładowuje dokumentu, initScript wymaga reload). Przenosiny napraw do panelu admina = osobne plany X13.

**Weryfikacja:** typecheck, lint, unit 618, e2e:mock 142, build, budget (initial 1 459 386 B, dalszy spadek po wycince drawera). Wizualnie: mobile header bez hamburgera + bottom nav (screenshot), desktop sidebar z pełną nawigacją (screenshot).

### 2026-07-17 — X12B FAZA 1 (Z89): usunięcie Adaptive Coach

**Decyzja usera (2026-07-17), wycofuje feature Z60-Z65 z X10:** "belka na dashboardzie nic nie robi". Usunięte: belka readiness na Dashboardzie, badge CoachBadge w ExerciseCard, karta "Następnym razem" w podsumowaniu WorkoutDay, moduł `adaptive-coach.ts` + testy, flaga `adaptiveCoach` (`VITE_FEATURE_ADAPTIVE_COACH`), 13 kluczy `coachx.*` z OBU locale, spec e2e. ZOSTAJE (granica wycinki wg planu): coach następnej serii (`next-set-advice`), RzaAdviceBadge, zbieranie i wyświetlanie metryk RPE/ból/jakość.

**Weryfikacja:** rg adaptive|coachx w src/ = 0; vitest 618 zielone (16 testów adaptive usuniętych), typecheck, lint, build, e2e:mock 139; bundle initial 1 463 811 -> 1 462 322 B. Wizualnie (Playwright, screenshoty): Dashboard bez belki, karta ćwiczenia z celem następnej serii (🎯) i rekordem, zero 🧠.

**Nota środowiskowa:** w trakcie bramek load average maszyny sięgał 180 (Screen Studio) i wywoływał timeouty testu exercise-picker także na czystym HEAD; po spadku obciążenia test zielony bez zmian w kodzie. Commity: a4bde25, 7cf93e0 (+ ec430cc dojścia Profilu pod Z90).

### 2026-07-17 — X12A RELEASE TRAIN A: web + iOS build 52 na TestFlight

**Zakres:** Z86 (repeatPlanSource + gate isLoaded oferty przedłużenia), Z87 (local-wins konfliktu rewizji), Z88 (Kontynuuj trening dla zsynchronizowanego szkicu).

**Bramki przed wdrożeniem:** vitest 632 zielone, typecheck, lint, build, bundle budget (initial 1 463 811 B / limit 1 536 000), e2e:mock 141, e2e:emulator 13, check:dist-smoke PASS (na build:mobile: smoke serwuje dist z korzenia, web build z base /strength-save/ zawsze da w nim biały ekran; kolejność build:mobile -> smoke, jak w ios-testflight.sh).

**Wdrożenie:** git push (main), web `npm run deploy` zweryfikowany na live (index-D6h0uwMg.js), iOS build 52 (CURRENT_PROJECT_VERSION 51->52) przez scripts/ios-testflight.sh: UPLOAD SUCCEEDED, processing VALID, podpięty do grupy Wewnętrzni.

**Incydent po drodze (nie kodowy):** upload blokowany przez `FORBIDDEN.REQUIRED_AGREEMENTS_MISSING_OR_EXPIRED` (wygasła umowa Apple; między 2026-07-04 a 2026-07-17). User zaakceptował umowę w App Store Connect; propagacja do usługi uploadu ~10 min, potem sukces bez zmian w konfiguracji. Klucz ASC UD43687FB9 działa; nowy AuthKey_YSXY39JA8Q.p8 przeniesiony do _secrets/oauth (nieużywany w env). Lekcja: "Cannot determine the Apple ID from Bundle ID" z altool = najpierw sprawdź agreements (`asc_api.py whoami`), nie klucz.

**Lekcja narzędziowa:** dwa równoległe uruchomienia ios-testflight.sh kolidują (drugi robi rm -rf na archiwum pierwszego); pipeline odpalać ZAWSZE pojedynczo.

### 2026-07-17 — X12A FAZA 3 (Z88): "Kontynuuj trening" także dla w pełni zsynchronizowanego szkicu

**Objaw:** po przypadkowym wyjściu z aplikacji w trakcie treningu Dashboard pokazywał "Rozpocznij trening" zamiast "Kontynuuj trening".

**Root cause (potwierdzony w kodzie):** karta Dashboardu używała decyzji auto-resume (`shouldResumeWorkoutDraft`, Z49), która wymaga szkicu "żywego" (`dirty || provisional`). Szkic w pełni zsynchronizowany (autosave zdążył: dirty=false, origin remote) nie był "żywy", więc karta wracała do "Rozpocznij".

**Fix (commity d7af3c3, 77e2a22, 1d08d14):** nowa czysta funkcja `isDraftContinuableToday` + `continuableDraftTarget` w `workout-resume.ts`: KAŻDY nieukończony dzisiejszy szkic (bez completedLocally/finalSyncPending) jest kontynuowalny, niezależnie od dirty. Karta Dashboardu przepięta; auto-nawigacja (`shouldResumeWorkoutDraft`) celowo zostaje ostrzejsza (nie porywa usera, który świadomie wyszedł); karta Sync Center nietknięta (dalej używa draftResume). E2E `continue-workout.spec.ts` (zegar strony zamrożony na poniedziałek przez page.clock): szkic dirty=false remote -> przycisk "Kontynuuj trening" + powrót do sesji; szkic completedLocally -> brak przycisku.

**Weryfikacja:** unit 632 zielone, e2e:mock 141 zielone (139 + 2 nowe).

### 2026-07-17 — X12A FAZA 2 (Z87): konflikt rewizji treningu rozwiązywany automatycznie local-wins

**Decyzja produktowa usera (2026-07-17), jawnie COFA decyzję M18 o dialogu wyboru wersji:** dialog "Trening edytowany na innym urządzeniu" wyskoczył w trakcie treningu na siłowni; user nie chce żadnych dialogów o konfliktach. Wersja LOKALNA wygrywa ZAWSZE.

**Skala zjawiska (telemetria):** 12x revision-conflict (iOS, checkpoint) w 4 poranki treningowe lipca — konflikt to normalny stan przy iPhone+web, nie wyjątek.

**Implementacja (commity 5023cfd, 40e12e7):** gałąź `outcome.conflict` w WorkoutDay bez dialogu: `shouldAutoResolveConflict` (limit `MAX_CONFLICT_AUTO_RESOLVES=2` na sesję zapisu, reset po udanym syncu) + `keepLocalOnConflict` (baseline serwera na draft + retry) wołany przez ref. Po wyczerpaniu limitu (drugie urządzenie aktywnie pisze): zostajemy przy lokalnym drafcie, komunikat `workout.err.conflict`, kolejny checkpoint dosyła. Telemetria zostaje (`revision_conflict` + nowy `revision_conflict_auto_resolved`), żeby widzieć skalę po wyłączeniu dialogu.

**Usunięte:** AlertDialog konfliktu, stan `conflictDialogOpen`, `resolveConflictUseCloud`, klucze `workout.conflict.title/desc`. **Zostaje:** `workout.conflict.keepMine/useCloud` (używa ich Sync Center — zaległości syncu to inny przypadek, świadoma decyzja per plan X12A), maszyna stanów sesji nietykalna (wejście `conflictDialogOpen: false`, faza 'conflict' nieosiągalna).

**Weryfikacja:** unit 626 zielone; nowy test emulatorowy (auth+firestore, realne rules): dwóch klientów, drugi na stale rewizji dostaje konflikt, sekwencja local-wins dosyła wersję lokalną bez udziału usera (reps lokalne w chmurze, revision podbita). e2e:mock 139 zielone.

### 2026-07-17 — X12A FAZA 1 (Z86): wskrzeszony stary plan + PLAN_CONFLICT — root cause i fix

**Objaw (incydent ~2026-07-04/05):** po treningu aktywny zrobił się STARY plan trzydniowy z poprzedniego cyklu, Dashboard pokazywał "Tydzień 1 z 12", wyskoczył błąd konfliktu planu (PLAN_CONFLICT).

**Diagnoza (read-only, tmp/x12-diagnoza.mjs, firebase-admin + ADC):** stan konta admina DZIŚ poprawny: plan 4-dniowy (revision 4, updatedAt 2026-07-05 15:25 UTC = moment ręcznej naprawy przez usera), 3 cykle, jeden active (4-dniowy, startDate 2026-06-01), zero cykli utworzonych w lipcu. Telemetria client_errors: zero wpisów PLAN_CONFLICT (ten błąd nie jest raportowany), za to 12x revision-conflict treningu (WORKOUT_CONFLICT, iOS, phase=checkpoint) w 4 poranki treningowe (6/7, 7/7, 9/7, 16/7), zawsze PODWÓJNY wpis w tej samej ms — potwierdza zasadność Z87 (local-wins).

**Root cause (H1+H3 potwierdzone lekturą kodu):**
1. `handleRepeatPlan` (Dashboard.tsx i Cycles.tsx) brał dni ze snapshotu aktywnego CYKLU (`active?.days`), nie z bieżącego planu; Dashboard szukał active przez `cycles.find()` na surowej liście.
2. Karta "Przedłuż plan" (`extendOffer`, następca auto-przedłużenia M33) gate'owała wyłącznie na `isLoaded` WORKOUTS — nie czekała na załadowanie planu ani cykli. Po wybudzeniu z tła / na starej karcie PWA klik padał na stale stanie: `active` wskazywał stary 3-dniowy cykl, `startCycleWithPlan` zapisywał STARE dni ze świeżym startDate (stąd "Tydzień 1 z 12") i tworzył świeży aktywny cykl ze starych dni.
3. PLAN_CONFLICT widziany przez usera to KOLEJNY zapis odrzucony przez revision guard (drugi klik / drugie urządzenie na stale rewizji). Wariant wejścia bez konfliktu: stara karta webowa PWA z kodem sprzed R1 (revision guard istnieje dopiero od 2026-07-03; revision=4 potwierdza młody licznik).
4. `startCycleWithPlan` sam jest bezpieczny: savePlan przed createActiveCycle, przy PLAN_CONFLICT cykl nie powstaje (regresja potwierdzona testem).

**Fix (minimalny, commit d8f92f6):** czysta funkcja `repeatPlanSource` w `cycle-actions.ts` — źródłem dni i durationWeeks dla "Powtórz/Przedłuż plan" jest ZAWSZE bieżący plan (chroniony rewizją), snapshot cyklu tylko fallbackiem przy pustym planie; oba komponenty przepięte; `extendOffer` czeka na `isLoaded` planu ORAZ cykli. Testy: 4 nowe w cycle-actions.test.ts (TDD: FAIL przed fixem, PASS po), łącznie 624 zielone.

**Naprawa danych usera (Z86.5): POMINIĘTA — stan konta już poprawny** (user naprawił ręcznie przez UI ~2026-07-05 17:25 PL). Żadnych zapisów produkcyjnych nie wykonano (diagnoza wyłącznie read-only).

**Uwaga procesowa:** plik planu X12A został w trakcie sesji zmodyfikowany na dysku (Z86.5 przepisane z "za jawną zgodą" na "autonomicznie z backupem"). Wykonawca trzymał się dyrektywy z promptu startowego (zgoda wymagana); konflikt bez skutków, bo naprawa okazała się zbędna.

### 2026-07-04 — Z85 HOTFIX: biały ekran na starcie (iOS build 50 + prod web) — cykliczne chunki firebase

**Objaw:** TestFlight build 50 po otwarciu pokazywał tylko biały ekran. Ten sam objaw na prod web (index-BOBq35aR na gh-pages) — release X11 wywalił OBA kanały, mimo że wszystkie bramki (vitest 620, typecheck, lint, e2e 139) były zielone.

**Root cause:** split firebase per produkt z Z54 (`manualChunks`: firebase-core / firebase-auth / firebase-firestore) wygenerował CYKLICZNY import między chunkami: `firebase-core` importował z `firebase-auth` i odwrotnie. W runtime dawało to TDZ `ReferenceError: Cannot access 'uo' before initialization` w firebase-core przy starcie → React nigdy nie montował `#root` → biały ekran. Błąd istnieje TYLKO w produkcyjnym bundlu (dev/vitest/typecheck go nie widzą); cykl jest wrażliwy na graf importów, więc zmaterializował się dopiero po zmianach X11. To drugi raz, gdy over-splitting chunków tworzy cykl (pierwszy: React/Radix — komentarz w vite.config).

**Diagnoza (reprodukcja przed fixem):** dist mobilny serwowany lokalnie w Chromium → `#root` pusty + pageerror; symulator iPhone 17 Pro → biały ekran identyczny z TestFlight; prod web → ten sam ReferenceError.

**Fix (minimalny):** `vite.config.ts` — firebase w JEDNYM chunku (`if (id.includes("firebase")) return "firebase"`), ~732 KB. Zero możliwości cyklu wewnątrz firebase. Realny initial się NIE pogorszył: index importował auth i firestore statycznie już przed fixem, więc te bajty i tak ładowały się na starcie.

**Nowa bramka (odtwarza tę klasę błędów):** `scripts/check-dist-smoke.mjs` (`npm run check:dist-smoke`) — serwuje dist, otwiera w headless Chromium, FAIL gdy `#root` pusty po 15 s lub jakikolwiek pageerror. Wpięta w `ios-testflight.sh` po `build:mobile`, przed archive. Przed fixem: FAIL (odtwarzał buga), po fixie: PASS. Lekcja: „build przechodzi" ≠ „bundle startuje" — bramki muszą wykonać bundle produkcyjny w przeglądarce.

**Budżet bundle (uczciwa korekta):** per chunk 800 KB (scalony firebase), initial 1500 KB liczony z prefixem `firebase-` — poprzedni pomiar (925 KB / 1200 KB) liczył tylko firebase-core, a index importował też auth+firestore statycznie; realny initial wynosił ~1430 KB już przed Z85.

**Wdrożenie:** web `npm run deploy` (naprawa prod) + iOS build 51 przez `release-ios.sh` (bump 50→51, 6 wystąpień). Weryfikacja: vitest/lint/typecheck/budżet zielone, smoke PASS na dist mobilnym, symulator renderuje ekran logowania, prod web sprawdzony po deployu.

### 2026-07-03 — X11 FAZA 7: release train (Z84) — checkpoint X11

**Bramki przed wdrożeniem (wszystkie zielone):** vitest 620/620 (77 plików), typecheck 0, lint 0, build OK, bundle-budget OK (initial 925 KB / 1200 KB), test:rules 110/110, functions 82 passed / 4 skipped + build OK (nieruszone), e2e:mock 139/139 (jeden flaky exercise-card-v3 w pierwszym runie — w izolacji i powtórce zielony), e2e:emulator 12/12.

**Wdrożone na produkcję (w kolejności checklisty):**
1. **Git:** 26 commitów X11 wypchniętych na origin/main (e608ed1..e9bbd90).
2. **Rules:** `firebase deploy --only firestore:rules` — nowa kolekcja `custom_exercises` (zamknięty schemat, Z71).
3. **Functions:** NIE deployowane — nieruszone w X11 (zgodnie z planem).
4. **Web:** `npm run deploy` — hash `index-BOBq35aR.js` na https://grzegorzee.github.io/strength-save/ zgodny z dist/index.html.
5. **iOS:** bump CURRENT_PROJECT_VERSION 49 → 50 (6 wystąpień) + `scripts/release-ios.sh` — UPLOAD SUCCEEDED, build 50 VALID, podpięty do grup (internal + external), whatsNew ustawiony, **Beta App Review: APPROVED** (Robert dostaje build po zatwierdzeniu Apple ~24h; internal od razu).
6. **Weryfikacja produkcji:** web wstaje z nowym hashem; `gcloud functions logs read` — zero nowych błędów (standardowa aktywność listapikeys/resumedeletionoperations).

**Zakres release'u X11 (web + rules + iOS build 50):** nawigacja bez ślepych zaułków (Z66-Z68), jeden system planów i ćwiczeń + custom exercises (Z69-Z73), dane w akcji (Z74-Z77), postępy bez duplikatów (Z78-Z80), Profil vs Ustawienia (Z81), polish App Store (Z82-Z83). Nowy plugin: `@capacitor-community/in-app-review` 8.0.0 (cap sync wykonany przez release-ios.sh).

**Świadomie pominięte/odłożone:** dodatkowe szablony fat_loss/athletic (Z72d — oba cele mają po jednym szablonie; wróci po teście terenowym); pełny merge Profile+Settings, drag&drop w edytorze, strukturalny model serii — poza zakresem planu (sekcja "Poza zakresem").

### 2026-07-03 — X11 FAZA 6: polish pod App Store (Z82-Z83)

**Bramki checkpointu (wszystkie zielone):** vitest 620/620 (77 plików), typecheck 0, lint 0, build OK, bundle-budget OK (initial 925 KB / 1200 KB), e2e:mock 139/139.

1. **Z82 — empty states (audyt bez danych):** puste bez zaproszenia były: `/achievements` (same zera, sekcje ukryte), `/history` (komunikat o filtrach nawet przy zerze sesji), `/measurements` (strona kończyła się po formularzu bez słowa), `/analytics` (pusty okres bez CTA). Wszystkie dostały EmptyState (wspólny komponent, wzorzec z Cycles: ikona + 1 zdanie + CTA); `/cycles` miał już wzorzec, `/exercises` zawsze pełne (biblioteka). Haptyka: `src/lib/haptics.ts` (guard `Capacitor.isNativePlatform`, web no-op, 3 testy z mockiem Capacitora) — lekki impact przy odhaczeniu KAŻDEJ serii (ExerciseCard; mocna wibracja końca ćwiczenia zostaje bez zmian) + notification-success przy ukończeniu treningu (WorkoutDay).
2. **Z83 — natywna prośba o ocenę:** `review-prompt.ts` (`shouldRequestReview`: kamienie 5/15/30/50/100 ukończonych treningów, min 60 dni między prośbami, znacznik w localStorage `fittracker_review_prompt`; 5 testów TDD). Plugin `@capacitor-community/in-app-review` 8.0.0 (peer `@capacitor/core>=8` — kompatybilny z naszym 8.4; `cap sync ios` wykona release-ios.sh w FAZIE 7). Wywołanie przy finalizacji treningu, fire-and-forget z catch, guard natywny (web nigdy nie woła). Licznik = ukończone z historii bez bieżącej sesji + 1 (listener może jeszcze nie widzieć finalizowanej sesji jako completed). ZERO własnych modali "oceń nas" (wymóg Apple — system sam decyduje, czy dialog pokazać).

### 2026-07-03 — X11 FAZA 5: porządek Profil vs Ustawienia (Z81)

**Bramki checkpointu (wszystkie zielone):** vitest 612/612 (75 plików), typecheck 0, lint 0, build OK, e2e:mock 139/139.

**Kryterium podziału (obowiązuje):** Profil = kim jestem i jak apka się zachowuje (konto, preferencje, język, jednostki, dźwięk, timer, launcher powiadomień); Ustawienia = dane i integracje (backup, Strava, sync, narzędzia naprawcze).

1. Karta "Konto" read-only usunięta z Settings (duplikat Profilu pod TYM SAMYM tytułem i18n); email pokazany w Profilu pod nickiem; podtytuł Settings opisuje zawartość (`settings.subtitle`); osierocony klucz `settings.account.role` usunięty z obu locale.
2. DataManagement renderowany TYLKO w Settings; na Pomiarach drogowskaz "Kopia zapasowa danych" → `/settings?section=data` (deep-scroll z X10).
3. **Decyzja (wariant mniejszego diffu):** NotificationSettings ZOSTAJE w Settings — launcher z Profilu (`/settings?section=notifications`) działa; przeniesienie całej karty do Profilu nie zmienia osiągalności, a zwiększa diff.
4. **Naprawa procesu weryfikacji:** test e2e pickera w PlanEditor failował w PEŁNYCH runach e2e:mock od Z70 (przycisk "Dodaj" → "Dodaj ćwiczenie"), a bramki raportowałem po samej liczbie "passed" (fail był niewidoczny w tail). Test naprawiony; od teraz bramka e2e sprawdzana jawnie po "failed" (139/139).

### 2026-07-03 — X11 FAZA 4: postępy bez duplikatów (Z78-Z80)

**Bramki checkpointu (wszystkie zielone):** vitest 612/612 (75 plików), typecheck 0, lint 0, build OK, bundle-budget OK (initial 924 KB / 1200 KB), e2e:mock 138/138.

1. **Z78 — koniec zombie-danych Weekly:** `AnalyticsWeeklyTab` liczy tygodnie client-side (`buildLocalWeeklySummaries` w weekly-summary.ts — 12 tygodni wstecz przez istniejące `prepareWeeklyData`, tygodnie bez danych pomijane); `useWeeklySummary.ts` usunięty; kolekcja `weekly_summaries` w rules zostaje (stare dane, admin), klient przestaje jej dotykać (0 czytań). Tekst AI `summary` i `generatedAt` znikają z UI — pochodziły z zamrożonej kolekcji i nigdy nie powstaną dla nowych tygodni.
2. **Z79 — rekordy w jednym miejscu:** bezpiecznik potwierdził, że zakładka progression NIE dubluje list rekordów z Achievements (ma tylko wykresy progresji per ćwiczenie), więc zakres ograniczony do linków: karta "Nowe PR" w Analytics Summary klikalna → `/achievements` (świeżość zostaje); link "Wszystkie rekordy" w progression dodany w Z67(e); Dashboard "Ostatni PR" linkował od dawna. **ZASADA:** agregaty (tonaż, liczba treningów) wolno powtarzać między przeglądem a szczegółem — LISTY rekordów żyją wyłącznie w Achievements.
3. **Z80 — historia jako archiwum:** `history-stats.ts` (buildHistoryRowMeta — PR per sesja liczone RAZ chronologicznie względem wcześniejszych sesji, semantyka detectNewPRs: pierwsza sesja nie ma czego pobić; formatDurationCompact "1h 12m"); wiersz historii: badge czasu trwania + badge liczby PR; rozwinięcie (z Z74) rozszerzone o serie per ćwiczenie (nieukończone przekreślone) i metryki RPE/ból/technika; filtr "Tylko z PR".

### 2026-07-03 — X11 FAZA 3: dane, które mamy, zaczynają pracować (Z74-Z77)

**Bramki checkpointu (wszystkie zielone):** vitest 604/604 (73 pliki), typecheck 0, lint 0, build OK, bundle-budget OK (initial 924 KB / 1200 KB), e2e:mock 138/138.

**Root cause znalezisk:** apka zbierała notatki, metryki RZA (RPE/ból/technika), durationSec, skippedExercises i 7 pól obwodów ciała — i nic z tego nie pokazywała. Inwestycja usera w dane szła na darmo.

1. **Z74 — notatki wracają:** `exercise-notes.ts` (getExerciseNoteHistory — ukończone sesje, najnowsze pierwsze, limit 5); sekcja "Twoje notatki" w dialogu progresji; "Ostatnio: „…”" na karcie ćwiczenia w aktywnym treningu (lastNote przez exerciseInsights); WorkoutHistory dostała ROZWINIĘCIE wpisu (Szczegóły) z notatką dnia i notatkami ćwiczeń (Z80 je rozszerzy). Hak mock E2E w workout-read-store obsługuje teraz też paginowaną historię (wcześniej zwracał pustkę — testy /history były niemożliwe).
2. **Z75 — ból i technika jako trend:** `getExerciseMetricHistory` + `getPainWatchlist` (ból >= 3, okno 4 tyg., snapshot nazwy) + `getAvgQuality` w rza-metrics; 3 sparkline'y RPE/Ból/Technika w dialogu progresji; RzaMetricsCard: podsumowanie 4 tygodni (objętość, śr. RPE, śr. technika) + watchlist bólu z klikiem do dialogu progresji.
3. **Z76 — czas i pomijane:** `workout-time-stats.ts` (getDurationTrend — miesiące, śr. minuty, gęstość kg/min z tonażu bez rozgrzewek; getSkippedStats — id→nazwa przez resolver); wykres "Czas i gęstość" + lista "Najczęściej pomijane" z linkiem do edytora planu w subzakładce Treningi (bez nowej zakładki); Cycles pokazuje `averageWorkoutsPerWeek` (liczone od dawna w cycle-insights, nigdy nie renderowane).
4. **Z77 — obwody widoczne (pokazujemy, nie usuwamy):** `measurement-stats.ts` (buildMeasurementSeries + MEASUREMENT_FIELD_GOALS: talia/biodra w dół = zielone, mięśnie w górę = zielone, waga neutralna — komentarz w kodzie); lazy MeasurementTrendChart z chipami 10 pól (pola bez wpisów ukryte); lista pomiarów pokazuje WSZYSTKIE wypełnione pola + delty vs poprzedni pomiar POLA (nie poprzedni wpis).

### 2026-07-03 — X11 FAZA 2: plany i ćwiczenia — jeden system (Z69-Z73)

**Bramki checkpointu (wszystkie zielone):** vitest 583/583 (70 plików), typecheck 0, lint 0, build OK, bundle-budget OK (initial 921 KB / 1200 KB), test:rules 110/110, e2e:mock 136/136, e2e:emulator 12/12.

**Root cause znalezisk:** cztery niezależne implementacje pickera ćwiczeń i dwa ~90% identyczne edytory planu narosły przyrostowo; builder nie miał reorderu, edytor nie zarządzał dniami; wybór 6 dni cicho degradował do 5 (brak szablonu + slice); onboarding commitował plan bez podglądu mimo labela "dalej do podglądu"; własnych ćwiczeń nie dało się dodać nigdzie.

1. **Z69 — jeden ExercisePicker:** nowy `src/components/ExercisePicker.tsx` (szukajka PL/EN przez `matchesQuery`, chipy kategorii, `excludeNames`, `initialCategory`, slot `renderFooter` na zakres swapu). Podmienione: PlanBuilder, PlanEditor, UserPlanEditor, WorkoutDay (swap "tylko dziś"/"na stałe" w footerze), NewPlan preview; `ExerciseSwapDialog.tsx` usunięty. Jedna stała `WEEKDAYS` i `defaultSetsForType` w `plan-cycle-utils` (koniec duplikacji w 3 plikach). Kontrakt: bez `renderFooter` tap = wybór i zamknięcie; z `renderFooter` tap zaznacza, wybór domykają przyciski hosta. **Nowy test e2e ujawnił pre-existing bug:** swap "tylko dziś" nie utrwalał się w drafcie (przy prefilled `exerciseSets` widok bierze nazwy z draftu, a draft nie był zapisywany po swapie — zamiana niewidoczna i ginęła przy odświeżeniu). Fix chirurgiczny: `handleApplySwap` woła istniejące `saveDraftSnapshot` z `exerciseNames` (wzorzec `handleSkipExercise`); silnik syncu nietknięty.
2. **Z70 — PlanDaysEditor:** czyste funkcje `src/lib/plan-day-edit.ts` (addPlanDay max 6 + pierwszy wolny weekday, removePlanDay, duplicatePlanDay z nowymi id i głęboką kopią, setPlanDayWeekday z auto-zamianą przy kolizji, setPlanDayFocus; 10 testów TDD) + wspólny komponent `PlanDaysEditor` (karty dni: weekday-chipy, focus, duplikuj/usuń; ćwiczenia: reorder/swap/remove/serie; chipy czasu trwania). PlanEditor zapisuje przez NIETKNIĘTY `savePlan` (transakcja z revision); builder = stan lokalny + autozapis szkicu. Decyzja: teksty admina ujednolicone na `planbuilder.*`/`planeditor.*`/`daysedit.*` (osierocone `admin.*` klucze dialogu usunięte). Edytor umie dni (luka 3), builder umie reorder (luka 4).
3. **Z71 — custom_exercises:** kolekcja z zamkniętym schematem rules (hasOnly, name 2-80, 8 kategorii z categoryLabels, type compound/isolation, isBodyweight bool, createdAt int; CRUD tylko właściciel, read + admin) — 15 nowych testów rules (95→110). Hook `useCustomExercises` (listener limit 100, sort kliencki po nazwie — bez indeksu złożonego; kształt Exercise z id `custom-<docId>`); w E2E mode pełny CRUD na localStorage (`fittracker_e2e_custom_exercises`). Picker: sekcja "Twoje ćwiczenia" + formularz inline (po zapisie od razu wybór). WorkoutDay: `resolveIsBodyweight` — dla customów źródłem prawdy pole isBodyweight, nie heurystyka po nazwie. Bezpiecznik zakresu czysty: wszystkie `exerciseLibrary.find` mają fallbacki. Decyzja: admin w edytorze cudzego planu widzi WŁASNE customy (jedyny user = admin; bez dodatkowego prop-drillingu).
4. **Z72 — 6 dni + elite:** nowy szablon `tpl-ppl-6` (Push Pull Legs ×2, build_muscle/intermediate, pon-sob, 12 tyg., 100% ćwiczeń z biblioteki — pilnuje istniejący test integralności); `planDaysMismatch` + ostrzeżenie `wizard.daysMismatch` na kroku 5 (koniec cichej degradacji); poziom "elite" usunięty (legacy wartości z trainingProfile sanityzowane do advanced). Opcja (d) — dodatkowe szablony fat_loss/athletic — POMINIĘTA świadomie: oba cele mają już po jednym szablonie 4-dniowym, a wartość dodatkowych szablonów bez feedbacku usera jest spekulatywna; wróci po teście terenowym.
5. **Z73 — podgląd wszędzie:** `PlanPreview` wydzielony z NewPlan i użyty też w onboardingu (wybór planu → podgląd ze swapami → zapis; powrót nie gubi stanu wizarda dzięki resume); PlanBuilder startuje z wyborem "Zacznij od zera"/"Zacznij od szablonu" (`clonePlanDays` — głęboka kopia z nowymi id). Test emulatorowy onboarding own-plan zaktualizowany do nowego (zamierzonego) flow.

### 2026-07-03 — X11 FAZA 1: nawigacja bez ślepych zaułków (Z66-Z68)

**Bramki checkpointu (wszystkie zielone):** vitest 560/560 (67 plików), typecheck 0, lint 0, build OK, bundle-budget OK (initial 921 KB / 1200 KB), e2e:mock 127/127.

**Root cause znalezisk:** mobilny drawer istniał w kodzie (Sheet w AppNavigation + stan `sidebarOpen` w Layout), ale nikt nie wołał `setSidebarOpen(true)` — AppHeader nie miał hamburgera. Skutek: na telefonie żyło tylko 5 pozycji dolnego paska, `/history`, `/measurements`, `/cycles` były sierotami bez linków wchodzących.

1. **Z66 — hamburger + żywy drawer:** AppHeader dostał przycisk hamburger (ikona `Menu`, `md:hidden`, wzorzec `rounded-2xl bg-muted/60` z WorkoutDay, aria-label `nav.openMenu`); Layout przekazuje `onMenuClick={() => setSidebarOpen(true)}`. Sheet zamykał się już poprawnie (linki mają `onClick={onClose}`). Dolny pasek bez zmian (5 pozycji) — drawer uzupełnia, nie zastępuje. 2 nowe testy e2e (viewport 375x667: Historia/Pomiary/Cykle osiągalne, drawer zamyka się po wyborze).
2. **Z67 — linki krzyżowe:** (a) trening → instrukcje ćwiczenia: ikona `Info` przy nazwie w ExerciseCard i w liście DayPlan, nawigacja do `/exercise/:slug` TYLKO gdy slug-match w exerciseLibrary (custom/nieznane bez ikony); celowo ikona zamiast klikalnego nagłówka — brak przypadkowych tapnięć przy odhaczaniu; nawigacja w środku sesji bezpieczna (draft w IndexedDB, kontrakt Z49 nietknięty, potwierdzone testem e2e z powrotem do treningu). (b) Dashboard stat "Waga" → `/measurements` (było: analytics charts). (c) Sekcja "Plan tygodnia" → link "Pełna historia" → `/history`. (d) Karta "Twój plan" → drugorzędny link "Cykle" → `/cycles`. (e) Analytics progresja → przycisk "Wszystkie rekordy" → `/achievements`. Klucze i18n: `card.details`, `dash.fullHistory`, `dash.cycles`, `charts.allRecords` w OBU locale. 4 nowe testy e2e.
3. **Z68 — zero martwych przycisków:** z ExerciseDetail usunięte: przycisk "Dodaj do treningu" (toast "wkrótce" — stub od miesięcy; dodawanie ćwiczeń do planu wraca w Z71 we właściwym miejscu, edytorze planu) i zakładki (localStorage `bookmarked-exercises` — zapisywane, NIGDY nie czytane; rg potwierdził zero konsumentów). Osierocone i18n (`detail.added`, `detail.addedSoon`, `detail.addToWorkout`, `detail.bookmark`) usunięte z obu locale.

### 2026-07-03 — X10 FAZA 7: release train (Z65) — checkpoint X10

**Bramki przed wdrożeniem (wszystkie zielone):** vitest 560/560 (67 plików), typecheck 0, lint 0, build OK, bundle-budget OK (initial 921 KB / 1200 KB), test:rules 95/95, functions 82 passed / 4 skipped + build, e2e:mock 121/121, e2e:emulator 12/12.

**Wdrożone na produkcję (w kolejności checklisty):**
1. **Git:** 20 commitów X10 wypchniętych na origin/main (6d0d325..44c1805).
2. **Rules:** `firebase deploy --only firestore:rules` — whitelist estimatedMaxHR/maxHRManualOverride (Z59). Indeksy nietykane (bez zmian).
3. **Functions:** `firebase deploy --only functions --force` — komplet; saveMaxHR usunięty z GCP przez deploy (functions:delete zwrócił "not found" = już skasowany, potwierdzone functions:list).
4. **Web:** `npm run deploy` — hash `index-C3ZFOS2E.js` na https://grzegorzee.github.io/strength-save/ zgodny z dist/index.html.
5. **iOS:** build 49 (bez bumpu — 49 nie był w ASC) przez `scripts/release-ios.sh` — UPLOAD SUCCEEDED, build VALID, podpięty do grup, **Beta App Review: APPROVED** (Robert dostaje build automatycznie).
6. **Sekrety GitHub:** VITE_ALLOWED_EMAIL i VITE_ALLOWED_EMAILS usunięte (`gh secret delete`, zaległość R2/Z45); zostały tylko VITE_FIREBASE_*.
7. **Weryfikacja produkcji:** web wstaje z nowym hashem, logi functions bez błędów po deployu (gcloud functions logs read, 30 wpisów).

**Zakres release'u X10 (web + iOS build 49):** auto-resume treningu (Z47-Z49), porządki Settings (Z50-Z53), wydajność startu (Z54-Z56), maszyna stanów sesji (Z57), higiena (Z58-Z60), Adaptive Coach (Z63-Z64). Z61 (App Check) świadomie pominięty — kroki w checkpoincie FAZY 5.

**Uwaga do iOS:** build 49 zawiera ŁĄCZNIE zmiany R2 (Z29-Z46, nie wysłane wcześniej) + X10 — to pierwszy build w TestFlight od build 48.

### 2026-07-03 — X10 FAZA 6: Adaptive Coach (Z63-Z64)

**Bramki checkpointu (wszystkie zielone):** vitest 560/560 (67 plików), typecheck 0, lint 0, build OK, e2e:mock 121/121.

**Wyróżnik rynkowy:** trener reagujący na RPE/ból + gotowość łącząca siłownię z bieganiem (Strava), 100% offline, zero Functions.

**Silnik (`src/lib/adaptive-coach.ts`, 14 testów TDD) — reguły i strojenie:**
1. `buildExerciseRecommendation` (ostatnia ukończona sesja z ćwiczeniem): ból >= 3 → **deload** (delta -10% max ciężaru roboczego, zaokrąglone do 0.5 kg; bodyweight: delta 0); RPE >= 9 LUB completionRate < 0.8 → **hold**; RPE <= 7.5 I completionRate == 1 → **progress** (+5 kg dla dużych bojów dolnej połowy po nazwie: przysiad/martwy/prasa/hip thrust/hack squat, inaczej +2.5 kg). Priorytet: ból > ciężka sesja > progres. Brak metryk (rpe i pain undefined) LUB strefa środkowa (np. RPE 8) → **null** — coach mówi tylko przy jasnym sygnale, UI spada na nextAdvice. Progi = stałe na górze pliku (PAIN_DELOAD_THRESHOLD itd.) — strojenie w jednym miejscu.
2. `buildReadiness`: ratio = suma obciążenia z 7 dni / (suma z 28 dni / 4), liczona osobno dla tonażu siłowego i TRIMP (istniejące `computeDailyLoad` z training-load.ts, bez duplikacji), uśredniona z dostępnych domen; brak danych → ratio 1. Progi: <0.8 fresh, <=1.2 ok, <=1.5 loaded, >1.5 overreached; score = clamp(100 - ratio*50, 0, 100) — monotoniczny.

**UI (Z64), wszystko za flagą `FEATURE_FLAGS.adaptiveCoach` (kill-switch: `VITE_FEATURE_ADAPTIVE_COACH=false`):** karta Coach na Dashboardzie (pasek readiness + JEDNA najważniejsza rekomendacja dnia, priorytet deload > hold > progress); badge 🧠 na karcie ćwiczenia w treningu (nad nextAdvice, tooltip z powodem); sekcja "Następnym razem" w podsumowaniu ukończonego treningu (lista rekomendacji per ćwiczenie). Klucze i18n `coachx.*` w OBU locale (prefiks coachx, nie coach.* — tamte usunięto w Z39). Nowy hak testowy `fittracker_e2e_workouts` w workout-read-store (tylko mock E2E, wzorzec fittracker_e2e_cycles).

### 2026-07-03 — X10 FAZA 5: higiena i zaległości z FAZY 7 planu R2 (Z58-Z61)

**Bramki checkpointu (wszystkie zielone):** vitest 546/546, typecheck 0, lint 0, build OK, test:rules 95/95, functions 82 passed / 4 skipped + build OK, e2e:mock 119/119.

1. **Z58 — vitest 4.x w functions:** bump 2.1.9 → 4.1.9 bez breaking changes (testy przechodzą bez modyfikacji); `npm --prefix functions audit`: 0 podatności.
2. **Z59 — saveMaxHR przez rules (-1 kontener):** rules users dopuszczają `estimatedMaxHR` (int, 100-230) i `maxHRManualOverride` (bool) w update usera; klient (`useStrava.saveMaxHR`) pisze `updateDoc(users/{uid})` bezpośrednio z walidacją widełek przed zapisem; funkcja usunięta z index.ts wraz z osieroconym `max-hr.ts` (+test) — walidacja żyje w rules i ma 4 przypadki w test-firestore-rules (ALLOWED w widełkach, DENIED 300, DENIED 'wysoki', DENIED zły typ bool). Stare przypadki "zablokowane" zaktualizowane. `firebase functions:delete saveMaxHR` = krok FAZY 7.
3. **Z60 — martwe aliasy tras:** `/stats` `/summary` `/progress` usunięte z App.tsx (rg: zero linków w src/); test e2e zaktualizowany na oczekiwane 404.
4. **Z61 — App Check: ŚWIADOMIE POMINIĘTE (ścieżka STOP z planu).** Rejestracja reCAPTCHA v3 (web) i App Attest (iOS) wymaga kroków w konsolach (reCAPTCHA admin / Firebase console / App Store Connect), niedostępnych z CLI; wartość przy dostępie 1 usera na TestFlight niska, ryzyko odcięcia przy złej konfiguracji realne. Kroki dla usera przed przyszłym wdrożeniem (tryb MONITOR, bez enforce): (a) Firebase console → App Check → zarejestruj appkę web z reCAPTCHA v3 (utwórz klucz na google.com/recaptcha, domena grzegorzee.github.io) i appkę iOS z App Attest; (b) w kliencie `initializeAppCheck` z `isTokenAutoRefreshEnabled: true`, BEZ enforce na żadnej usłudze; (c) po 2-4 tygodniach sprawdź metryki App Check (odsetek zweryfikowanych żądań) zanim włączysz enforce.

### 2026-07-03 — X10 FAZA 4: maszyna stanów sesji + hydracja jako czysta funkcja (Z57)

**Bramki checkpointu (wszystkie zielone):** vitest 546/546 (66 plików), typecheck 0, lint 0, build OK, e2e:mock 119/119, e2e:emulator 12/12.

**Co:** dwa czyste moduły — `src/lib/workout-session-state.ts` (`deriveWorkoutSessionPhase`: idle/active-provisional/active-remote/completing/final-pending/completed/editing/conflict + helper `isActiveTrainingPhase`) i `src/lib/workout-hydration.ts` (`resolveWorkoutHydration`: DOSŁOWNE przeniesienie 9 gałęzi shouldUseDraft + warunek czyszczenia draftu). WorkoutDay: efekt hydracji woła resolveWorkoutHydration i wykonuje skutki; `sessionPhase` liczona useMemo, użyta w AutoSaveIndicator i w `enabled` synca zegarka (isActiveTrainingPhase = dawne `!!sessionId && !isCompleted && !isEditing` — mapowanie dokładne, bo editing i final-pending wymagają ukończonej sesji).

**Świadome ograniczenie zakresu:** gate'y widoków completed/editing (`isCompleted && !isEditing` itd.) ZOSTAŁY na flagach — stany nakładają się (editing+isExplicitSaving podczas zapisu edycji, completed+isExplicitSaving podczas retry finalnego syncu), więc liniowa faza ich nie odwzorowuje 1:1; wymuszenie = zmiana zachowania, wbrew kontraktowi zadania. Root cause klasy bugów R1/R2 (heurystyki hydracji w komponencie z eslint-disable) jest wyjęty do funkcji z 12 testami.

**Naprawa testu przy okazji (nie kodu):** e2e emulator merge-501 klika "Połącz przerwane cykle", który po Z52 żyje w domyślnie zwiniętym akordeonie — test najpierw rozwija "Narzędzia naprawcze". Jednorazowy fail suity emulatora po fixie okazał się flakiem (rerun 12/12).

### 2026-07-03 — X10 FAZA 3: wydajność startu i danych (Z54-Z56)

**Bramki checkpointu (wszystkie zielone):** vitest 526/526 (64 pliki), typecheck 0, lint 0, build OK, check:bundle-budget OK (initial 919 KB / limit 1200 KB), e2e:mock 119/119 (1 pre-existing flake exercise-card-v3 "multiple workout days", przechodzi przy powtórce 6/6).

**Z54 — bundle (rozmiary dist/assets, KB):**

| Chunk | PRZED | PO | Uwagi |
|---|---|---|---|
| firebase | 716 | — | rozbity na 3 poniżej |
| firebase-firestore | — | 352 | osobny chunk = bump SDK nie unieważnia auth/core w cache |
| firebase-core | — | 192 | |
| firebase-auth | — | 180 | |
| index | 568 | 568 | bez zmian |
| ExerciseDetail | 272 | 144 | słownik EN (128 KB) dociągany dynamicznie tylko w trybie EN |
| exercise-details-en | — | 128 | lazy |
| chart-config (recharts) | 364 | 364 | ładowany dopiero przy wykresie w Achievements (lazy TonnageTrendChart, wzorzec AnalyticsChartsTab) |
| react-vendor | 140 | 140 | |

Budżet zaostrzony: per-chunk 800→600 KB + NOWY limit sumy initial (index + firebase-core + react-vendor) 1200 KB (obecnie 919 KB). Dynamiczny import EN tylko dla `exercise-details-en` (1 konsument produkcyjny: ExerciseDetail, bump stanu po preload); PL kanoniczny zostaje statyczny — zgodnie z bezpiecznikiem planu (limit 5 plików nie przekroczony).

**Z55 — limity listenerów:** `plan_cycles` limit(60) (5 lat historii, orderBy startDate desc tnie najstarsze); `weekly_summaries` limit(26) — kolekcja zamrożona (generator usunięty w R2), limit to czapka kosztowa, nie selektor.

**Z56 — obserwowalność crashy renderu:** ErrorBoundary.componentDidCatch raportuje `render-crash` (phase 'other', message + pierwsza linia stacka) do client_errors, tylko przy przekazanym uid; NOWY boundary per trasa wokół `<Suspense>` drzewa tras (uid z useCurrentUser) z kartą "Coś poszło nie tak" + "Wróć na Dashboard" (reset + navigate) — crash strony nie wywala apki; boundary topowy zostaje ostatnią linią obrony.

### 2026-07-03 — X10 FAZA 2: porządki w Settings i narzędziach (Z50-Z53)

**Bramki checkpointu (wszystkie zielone):** vitest 523/523 (63 pliki), typecheck 0, lint 0, build OK, e2e:mock 119/119.

1. **Z50 — martwe ustawienie usunięte:** Select "godzina podsumowania" zapisywał `summary-hour` do localStorage, którego NIC nie czytało (digest chodzi cronem o stałej porze). Bezpiecznik rg potwierdził zero konsumentów; karta + stała + stan + 3 osierocone klucze i18n usunięte z obu locale.
2. **Z51 — ODSTĘPSTWO OD PLANU (świadome):** plan kazał PRZENIEŚĆ FeatureFlagsPanel z Settings do AdminDashboard, ale AdminDashboard JUŻ MA per-user feature flags w rozwijanych szczegółach usera (sekcja `admin.features`, label zawsze widoczny, ten sam zapis `features.strava`). Przeniesienie tworzyłoby DUPLIKAT — panel w Settings usunięty w całości (140 linii), klucze `settings.features.*`/`settings.feature.*` usunięte jako osierocone. Intencja zadania (back-office poza Settings, label widoczny na telefonie) spełniona lepiej niż literalny fix.
3. **Z52 — Sync Center jako deska ratunkowa:** stan wpisów wydzielony do hooka `useSyncCenterEntries` (dedup drafty+kolejka po sessionId, ekstrakcja 1:1); Settings renderuje kartę TYLKO przy `listedEntries.length > 0` — zdrowy user nie widzi pustego Sync Center. Surowy kod błędu zszedł do tooltipa (`title=`), user widzi komunikat po ludzku (mapowanie `workoutSyncErrorMessageKey` już istniało). Narzędzia serwisowe (naprawa cykli, napraw dane, wyczyść duplikaty, reset planu) w JEDNYM zwijanym bloku "Narzędzia naprawcze" (Collapsible, domyślnie zwinięty, hint kiedy używać); przyciski naprawcze wydzielone z DataManagement do eksportowanego `DataRepairTools` (Measurements nadal dostaje je przez DataManagement — bez zmiany API).
4. **Z53 — jednorazowe sprzątanie sprzed R2:** `cleanupLegacySyncLeftovers(uid, workouts)` w `src/lib/workout-sync-cleanup.ts`: (1) wpisy kolejki bez draftu w IDB → remove (kolejka referencyjna, bez treści nie ma czego syncować); (2) czyste (nie-dirty, nie-finalSyncPending) drafty provisional z ukończonym odpowiednikiem dzień+data w chmurze → `clearActiveDraftIfVersion` (respektuje wersjonowanie — kontrakt R2 nietknięty); guard `fittracker_legacy_cleanup_v1:{uid}` ustawiany PO sukcesie (porażka = retry). Podpięte w AutoSyncOnReconnect po załadowaniu workouts, fire-and-forget.

**Root cause klasy problemu:** Settings zbierał przez lata funkcje serwisowe i adminowe bez miejsca docelowego; "stary trening wisiał w Sync Center", bo mechanizmy sprzątania R2 (tombstone Z32, kolejka Z23) nie działają wstecz.

### 2026-07-03 — X10 FAZA 1: powrót do aktywnego treningu (Z47-Z49)

**Bramki checkpointu (wszystkie zielone):** vitest 515/515 (61 plików), typecheck 0, lint 0, build OK, e2e:mock 119/119, e2e:emulator 12/12 (JDK21).

**Co i dlaczego:** po zabiciu apki / zimnym starcie user ZAWSZE lądował na Dashboardzie mimo żywego draftu w IndexedDB; karta dzisiejszego treningu pokazywała "Start treningu" w połowie sesji, a karta statusu sync kierowała do Settings zamiast do treningu.

1. **Z47 — draft pamięta ostatnie ćwiczenie:** nowe opcjonalne pole `lastTouchedExerciseId` w `ActiveWorkoutDraft` (additive, bez bumpu DB_VERSION, normalizacja wzorcem exerciseMetrics); snapshot przenosi je z previousDraft (overrides mogą nadpisać); handlery `handleSetsChange`/`handleMetricsChange`/`handleWatchSetLogged` ustawiają je przy każdym dotknięciu. Po hydracji draftu WorkoutDay przewija kartę tego ćwiczenia (`scrollIntoView`, retry 300/900 ms), ale TYLKO gdy scroll-restore nie ma świeżej pozycji (<15 min) — zapisana pozycja ma pierwszeństwo. Ref-guard scrolla po stabilnym kluczu `uid:date` (NIE sessionId — promocja provisional→remote zmienia go w trakcie).
2. **Z48 — natywny cykl życia iOS:** nowy plugin `@capacitor/app` + moduł `src/lib/app-lifecycle.ts` (`addAppStateListener`): natywnie `appStateChange` (dynamiczny import, guard na brak pluginu), na webie fallback visibilitychange. WorkoutDay flushuje draft dodatkowo przez ten kanał; webowe handlery zostają (duplikat flusha = no-op przez latestWriteVersions).
3. **Z49 — auto-resume:** czysta funkcja `shouldResumeWorkoutDraft` (`src/lib/workout-resume.ts`): resume gdy draft żywy (dirty lub provisional), nieukończony (!completedLocally && !finalSyncPending) i świeży (dzisiejszy LUB dotykany <12h). Komponent `ActiveWorkoutResume` (App.tsx, obok WatchEventRouter): nawiguje na mount i na przejście background→active (ref-guard; świadome wyjście usera z treningu nie wraca), telemetria `workout_auto_resume` (rules OK — counters to mapa bez per-event hasOnly). Dashboard: karta dzisiejszego treningu przy żywym drafcie = "Kontynuuj trening" + licznik odhaczonych serii i link z `session=`; karta statusu sync przy żywym drafcie prowadzi do treningu (Settings zostaje dla wpisów kolejki bez draftu).

**Root cause klasy problemu:** draft był bezpieczny w IndexedDB, ale żadna warstwa nawigacji go nie otwierała — brakowało decyzji "resume" jako czystej funkcji i komponentu, który ją wykonuje.

**Zmiana w testach e2e:** scenariusz "dashboard highlights offline state" dostał draft nieświeży (>12h) — świeży provisional jest teraz z definicji auto-wznawiany (nowy test Auto-resume Z49 pokrywa oba warianty).

### 2026-07-03 — R2 FAZA 6: release train (Z46) — checkpoint R2

**Bramki przed wdrożeniem (wszystkie zielone):** vitest 501/501, typecheck 0, lint 0, build OK, test:rules 93/93, functions 85+4 (2 nowe integracyjne waitlisty na emulatorze), e2e:mock 116/116, e2e:emulator 12/12, bundle-budget OK.

**Wdrożone na produkcję:**
1. **Git:** 36 commitów R2 wypchnięte na origin/main (de85d78..fd16c89).
2. **Functions:** `firebase deploy --only functions` — komplet; streamOpenAI, proxyOpenAI, generateWeeklySummary skasowane z GCP (`functions:delete`).
3. **Rules + indeksy:** deploy `firestore:rules,firestore:indexes`; nowy composite index workouts (completed ASC, date ASC); skasowane 2 martwe indeksy chat_messages i chat_conversations (`gcloud firestore indexes composite delete`), stan w GCP = firestore.indexes.json (5 indeksów).
4. **TTL:** 7 polityk ACTIVE (auth_audit_logs/notification_logs/api_audit_logs/api_rate_limits/waitlist_rate_limits/client_errors po `expiresAt`, email_verification_codes po `ttlExpiresAt`).
5. **Web:** `npm run deploy` — hash bundla na gh-pages zgodny z lokalnym buildem (index-DKee537W.js).
6. **iOS:** CURRENT_PROJECT_VERSION 48 -> 49 (6 wystąpień, preflight passed). `scripts/release-ios.sh` NIE odpalony — czeka na potwierdzenie usera przed wysyłką TestFlight (twarda zasada zlecenia).

**HOTFIX wykryty smoke testem produkcyjnym (poza planem):** po zdjęciu enforceAppCheck (Z33) waitlista NADAL padała — transakcja `createWaitlistEntry` robiła odczyt PO zapisie (get(rate) -> set(rate) -> get(existing)), a Firestore wymaga wszystkich odczytów przed zapisami; defekt istniał od zawsze, maskowany przez App Check odrzucający requesty zanim doszło do transakcji (emulator w E2E też go nie łapał, bo scenariusze nie przechodziły przez tę ścieżkę). Fix: oba odczyty przed zapisem + ekstrakcja `createWaitlistEntryCore` + 2 testy integracyjne na emulatorze (`npm run test:functions:emulator`). Weryfikacja NA PRODUKCJI: `createWaitlistEntry` zwraca `{entryId, existing:false}`; testowy wpis i jego rate limit usunięte admin SDK.

**Weryfikacja produkcji po wdrożeniu:** waitlista przechodzi end-to-end; jedyny błąd w logach functions po deployu to zapis sprzed hotfixu; TTL wszystkie ACTIVE.

**Zostaje (poza zakresem automatu):** wysyłka builda 49 na TestFlight (`scripts/release-ios.sh "R2: stabilność zapisu + koszty"` — po Z34 bez ręcznego source .env), usunięcie sekretów VITE_ALLOWED_EMAIL/VITE_ALLOWED_EMAILS z GitHub Secrets (ręczne, konsola GitHub), test terenowy usera (scenariusz w raporcie końcowym R2 i w Z46 krok 10 planu).

### 2026-07-03 — R2 FAZA 5: higiena repo i zależności (Z45)

Weryfikacja checkpointu: vitest 501/501, typecheck 0, lint 0, build OK, check:bundle-budget OK, functions 85 passed / 2 skipped.

Zmiany (commit per punkt): (1) `test-results/.last-run.json` zdjęty z trackingu (gitignore już pokrywał). (2) `engines.node >= 22` w root package.json. (3) Override `uuid ^11.1.1` w functions — `npm audit --omit=dev` w functions: 0 podatności (wcześniej 8 moderate przez łańcuch firebase-admin), testy i build functions zielone. (4) Usunięte 14 nieużywanych zależności (zod, @hookform/resolvers, react-hook-form, 6 sierot @radix-ui, react-resizable-panels, embla-carousel-react, input-otp, cmdk, vaul, react-day-picker) + 12 plików `src/components/ui/*` bez ani jednego importera (każda pozycja zweryfikowana rg przed usunięciem). (5) Martwe `VITE_ALLOWED_EMAIL`/`VITE_ALLOWED_EMAILS` usunięte z `.github/workflows/deploy.yml` i `src/vite-env.d.ts` — **RĘCZNE dla usera: usunąć sekrety VITE_ALLOWED_EMAIL i VITE_ALLOWED_EMAILS z GitHub Secrets repo.** (6) Martwe grupy kluczy i18n usunięte z OBU locale (workout.status.{offline,syncPending,syncing,synced,finishedLocally}, newplan.level.*, onboarding.level.*; pozostałe workout.status.* są używane — zweryfikowane rg per klucz). (7) Hardcoded PL w panelach admina: przyjęte jako "by design" (admin = właściciel, pracuje po polsku); migracja do t() dopisana do backlogu jako opcja — user może zdecydować inaczej.

Chunk firebase (~715K, 87% budżetu) pozostaje obserwacją (R2-31): rozbicie w manualChunks przy najbliższym bumpie SDK (FAZA 7 pkt 8).

### 2026-07-03 — R2 FAZA 4: rules hardening + pakiety P2 syncu i frontendu (Z41-Z44)

Weryfikacja checkpointu: vitest 501/501 (+27 nowych testów), typecheck 0, lint 0, build OK, test:rules 93/93 (+29 nowych), e2e:mock 116/116, e2e:emulator 12/12. Scenariusz background/resume na urządzeniu odłożony do testu terenowego usera (Z46), jak w Fazie 2.

**Z41 — zamknięte schematy rules (R2-13..15).** Przed napisaniem reguł zweryfikowano READ-ONLY kształty dokumentów PRODUKCYJNYCH skryptem admin SDK (lekcja createdAt z F1) — wykryto m.in. dokumenty `app_telemetry_daily` z legacy PŁASKIMI kluczami `counters.xxx` (historyczny zapis dot-notation), które hasOnly musi jawnie dopuszczać. Zmiany: client_errors z pełną walidacją pól (typy, limity długości, platform in [web/ios/android], createdAt w widełkach +/- 10 min od request.time, expiresAt timestamp OPCJONALNE — klienty build <= 48 raportują bez TTL), training_plans/measurements/plan_cycles/plan_cycle_operations/app_telemetry_daily z hasOnly + typami pól skalarnych, users z typami wartości whitelisty update (mapy/stringi z limitami), weekly_summaries create+update: false (martwe — generator usunięty w Z39), chat_messages delete: false (GDPR przez admin SDK). Dwa stare testy rules zaktualizowane do realnego kształtu klienta (telemetria pisała w teście nieistniejące pole `opens`, client_errors miał createdAt sprzed widełek).

**Z42 — kolejka i klasyfikacja (R2-16..19, R2-32).** (1) `recordWorkoutSyncFailure` (workout-sync-entries.ts): porażka syncu zapisywana pod DOCELOWYM sessionId (po promocji NOWY id); gdy wpis nie istnieje, draft jest adoptowany do kolejki — bez tego lastError ginął i AutoSync ponawiał konfliktowy final w nieskończoność. (2) Flaga `permanent` na wpisie kolejki (markRetry klasyfikuje not-found/permission); collectRetryableSyncEntries pomija takie wpisy (draft i wpis), Sync Center nadal je pokazuje z ręcznymi akcjami. (3) Gałąź offline w WorkoutDay przez `classifyWorkoutSyncError(...) === 'offline'` (silnik zwraca 'OFFLINE' tylko dla provisional; remote offline leci surowym błędem Firestore — wcześniej klasyfikowany jako twardy błąd z czerwonym badge). (4) Telemetria z prawdziwą fazą: syncOne raportuje 'checkpoint' (nie 'final'), konflikt wykryty PODCZAS syncu raportuje fazę syncu (registerConflict z parametrem), 'conflict-resolve' zostaje dla akcji usera. (5) R2-32 z korektą znaleziska: martwy był TYLKO `buildSyncCenterSaveOptions` (pułapka `expectedRevision ?? 0`, bez writeId) — `buildSyncCenterExercisesPayload` był używany przez SILNIK; przeniesiony do workout-sync-engine.ts jako `buildDraftExercisesPayload`, moduł sync-center-payload.ts usunięty; usunięte nieużywane isSyncingRef i import matchesFinalWorkoutContent w WorkoutDay; gałęzie `!success && skipped` dostosowane do kontraktu Z23 (skipped przychodzi z success:true, bez toastu "zsynchronizowano").

**Z43 — baseline i hydracja (R2-20..23).** (1) Promocja na ISTNIEJĄCĄ sesję (createSession existing:true) pobiera baseline z `getFromServer` zamiast ufać revision z kopii pamięciowej createSession (persistentLocalCache). (2) `buildWorkoutDraftSnapshot` z fallbackiem bazy na queuedDraft przy zgodnym sessionId (bez rollbacku version do 1 i utraty startedAt/cycleId przy hydracji z kolejki). (3) Hydracja czyszcząca draft po ukończonym treningu porównuje przez `buildDraftFinalExpectation` (sety + notes + skippedExercises) — draft z niedosłaną notatką/skipem zostaje jako dirty. (4) Singleton połączenia IDB z onclose/onversionchange (reopen po zerwaniu w tle) + reset połączenia przed retry zapisu; koniec z open per operacja.

**Z44 — frontend P2 (R2-24..29, 6 izolowanych commitów).** (1) rest-notification: cache tylko pozytywnej decyzji o uprawnieniach — odmowa weryfikowana ponownie (user może włączyć w Ustawieniach systemu). (2) RestTimer/rest-notification: token generacji + wspólny chain operacji — cancel w trakcie trwającego schedule wygrywa (notyfikacja nie odpala mimo pauzy). (3) Watch: klucz dedupu appliedRef trwały dopiero PO udanym zapisie draftu; błąd = klucz usunięty, event zostaje w natywnej kolejce do retry + toast destructive + reportClientError (nowe klucze i18n workout.toast.watchSetError* w pl i en). (4) Cycles auto-repair: `runCycleAutoRepair` — guard ustawiany przed create (ochrona okna async), czyszczony przy porażce (offline nie wypala naprawy na zawsze). (5) useOnlineStatus: licznik pending sterowany WORKOUT_SYNC_STATE_CHANGED_EVENT + focus/online zamiast odpytywania IndexedDB co 2 s (konkurencja z zapisami draftu w treningu). (6) Usunięty martwy duplikat trasy /measurements, limit 200 na odczycie users w panelu flag Settings, avatar pod stałą ścieżką `avatars/{uid}/avatar` (nadpisywanie zamiast osieroconych plików; nowy upload = nowy token = świeży URL).

### 2026-07-03 — R2 FAZA 3: koszty Functions / serverless (Z36-Z40)

Weryfikacja checkpointu: vitest 474/474, typecheck 0, lint 0, build OK, functions 85 passed / 2 skipped + build OK. Efekt zbiorczy: przy 1000 aktywnych userów koszt zmienny spada z ~22-25 USD/mies. do ~2-3 USD/mies. (model w planie R2, sekcja 2).

| Funkcja | Zmiana | Efekt kosztowy |
|---------|--------|----------------|
| stravaScheduledSync / manualny sync (Z36) | sync inkrementalny czyta TYLKO pobrane w runie aktywności (`db.getAll` po deterministycznych ID, chunk 300); pełny skan zostaje wyłącznie dla initial syncu; ekstrakcja `loadExistingActivities` (testowalna) | ~99% redukcja reads największego drivera (300 userów x 300 aktywności x 30 dni = ~2.7M reads/mies. -> O(pobranych), typowo 0-5/user/noc) |
| resumeDeletionOperations (Z37) | cron co 60 min zamiast co 5 (worker naprawczy po crashu; usunięcia i tak biegną synchronicznie) | 8640 -> ~720 inwokacji/mies. (-97%) |
| weeklyDigest (Z38) | odbiorcy z kolekcji users (status active + opt-out `notificationPrefs.weeklyDigest`, brak pola = wysyłaj); 2 kwerendy zbiorcze (workouts completed+date, strava date) zamiast 2 per user; toggle w ustawieniach (web i native) + i18n; nowy composite index workouts (completed ASC, date ASC); ekstrakcja `runWeeklyDigest(deps)` (testowalna) | maile tylko do realnych subskrybentów z treningiem (dominujący koszt Resend ~20 USD/mies. przy 1000 userów spada do realnej frakcji); reads O(treningów tygodnia + userów), nie O(2x userów) |
| streamOpenAI, proxyOpenAI, generateWeeklySummary (Z39) | usunięte z kodu (deploy skasuje kontenery w Fazie 6) + moduł ai-usage.ts, kliencki ai-coach.ts/useAISwap/TypingIndicator, generator weekly-summary, karta ai_usage w adminie, 18 kluczy i18n, indeks chat_messages; GDPR purge kolekcji ai_usage ZOSTAJE (dane istnieją) | -3 kontenery (w tym publiczny endpoint HTTP), -1 sekret (openai-api-key przestaje być montowany), mniejsza powierzchnia ataku |
| dailyTrainingReminder (Z40a) | iteracja po fcm_token_registrations -> getAll tylko userów z tokenem i ich planów; ekstrakcja `runDailyReminder(deps)` (testowalna) | przy 1000 userów / 100 z tokenem: ~3k -> ~300 reads/dzień |
| syncUserProfile (Z40b) | `shouldLogLoginSuccess`: wpis login_success do auth_audit_logs tylko gdy poprzedni login starszy niż 20 h (inne typy zdarzeń bez zmian) | zapis 1x/dzień zamiast przy każdym otwarciu apki |
| TTL (Z40c) | `expiresAt` (Timestamp) przy zapisie: auth_audit_logs (90 dni), notification_logs (90), api_audit_logs (180), api_rate_limits (7), waitlist_rate_limits (7), client_errors (30, pisze klient — pole dopuszczone w rules w Z41); email_verification_codes dostaje `ttlExpiresAt` (1 dzień) — ODSTĘPSTWO od planu: istniejące pole `expiresAt` to string ISO w logice 10-minutowej ważności kodu, zmiana typu łamałaby weryfikację | storage kolekcji operacyjnych przestaje rosnąć bez sufitu |

**Komendy TTL do wykonania w FAZIE 6 (Z46 krok 5), po deployu functions:**

```bash
gcloud firestore fields ttls update expiresAt --collection-group=auth_audit_logs --enable-ttl --project fittracker-workouts
gcloud firestore fields ttls update expiresAt --collection-group=notification_logs --enable-ttl --project fittracker-workouts
gcloud firestore fields ttls update expiresAt --collection-group=api_audit_logs --enable-ttl --project fittracker-workouts
gcloud firestore fields ttls update expiresAt --collection-group=api_rate_limits --enable-ttl --project fittracker-workouts
gcloud firestore fields ttls update ttlExpiresAt --collection-group=email_verification_codes --enable-ttl --project fittracker-workouts
gcloud firestore fields ttls update expiresAt --collection-group=waitlist_rate_limits --enable-ttl --project fittracker-workouts
gcloud firestore fields ttls update expiresAt --collection-group=client_errors --enable-ttl --project fittracker-workouts
```

Uwaga: TTL kasuje tylko dokumenty z ustawionym polem — wpisy sprzed R2 (bez expiresAt) zostaną; ewentualne jednorazowe doczyszczenie starych logów można zrobić skryptem admin SDK później (nie blokuje niczego).

### 2026-07-03 — R2 FAZA 2: waitlista, release script, wydajność WorkoutDay (Z33-Z35)

Weryfikacja checkpointu: vitest 474/474, typecheck 0, lint 0, build OK, functions 68 passed / 4 skipped. Scenariusz background/resume na realnym urządzeniu ODŁOŻONY do testu terenowego usera w Z46 (zmiany Z35 są czysto renderowe: zegar liczy od startedAt przy każdym ticku, więc po resume pokazuje poprawny czas; logika zapisu draftu nietknięta — pokryta testami F1).

**Z33 — reanimacja waitlisty, wariant A (R2-05).** Root cause: `createWaitlistEntry` z `enforceAppCheck: true`, a klient NIGDZIE nie inicjalizuje App Check (rg: zero `initializeAppCheck` w src/) — Functions v2 odrzuca każdy produkcyjny request, każdy lead z ekranu logowania przepada; emulator pomija App Check, więc E2E tego nie widziało. Logi produkcyjne: wywołania z 2026-06-27 z WARNING. Fix (wariant A, potwierdzony przez usera): zdjęty enforceAppCheck; anti-abuse zapewnia transakcyjny rate limit 60 s per email + walidacje + cooldown. Pełny App Check (reCAPTCHA v3 + App Attest) świadomie odłożony do publicznego launchu (FAZA 7 pkt 7).

**Z34 — release-ios.sh ładuje .env (R2-06).** Root cause: preflight (proces node) wymaga `VITE_REVENUECAT_APPLE_API_KEY` w env, a skrypt nie ładował `.env` (vite czyta go sam, node nie) — release padał bez ręcznego `set -a && source .env` (pułapka z release trainu R1). Fix: blok `source .env` po cd do ROOT + walidacja istnienia klucza `.p8` z czytelnym błędem + poprawiony stale komentarz (6 wystąpień CURRENT_PROJECT_VERSION, nie 2). Weryfikacja: `bash -n` + preflight przechodzi w czystym env (`env -i`).

**Z35 — WorkoutDay bez re-render bomby (R2-07).** Root cause: `setElapsedSec` w setInterval(1000) re-renderował cały 2100-liniowy komponent co sekundę przez cały trening, a w renderze per ćwiczenie liczone były pełne skany historii (getNextSetAdvice, getExerciseBest1RM, getRzaAdvice, getPreviousSets); memo na ExerciseCard bezużyteczne przez świeże lambdy onSetsChange/onMetricsChange. Fix: (a) zegar wydzielony do `SessionClock` (własny stan, tick re-renderuje tylko kafelek; liczy od startedAt, więc odporny na suspend iOS), elapsedSec usunięty ze stanu strony (fallback duration podsumowania liczony z finalizedAt/startedAt draftu); (b) `exerciseInsights` = useMemo mapa exerciseId -> {previousSets, nextAdvice, historicalBest, rzaAdvice} zależna od [day, workouts, previousWorkout, previousSetsByName, lang, unit]; (c) ExerciseCard callbacki przyjmują exerciseId (onSetsChange(exerciseId, sets, notes)) — strona przekazuje stabilne useCallback bez lambd inline. Weryfikacja POMIAREM (tymczasowa instrumentacja + jednorazowy spec Playwright w trybie mock, usunięte po pomiarze): 5 sekund ticków zegara przy aktywnym treningu = 0 re-renderów ExerciseCard.

### 2026-07-03 — R2 FAZA 1: integralność zapisu P0/P1 (Z29-Z32) + hotfix rules

Weryfikacja checkpointu: vitest 474/474 (56 plików, 16 nowych testów), typecheck 0, lint 0, build OK, e2e:mock 116/116, e2e:emulator 12/12 (1 nowy scenariusz orphan), test:rules 64/64 (JDK21).

**Z29 — writeId przeżywa flush draftu (R2-01).** Root cause: `buildDraftSnapshot` w WorkoutDay budował draft od zera — gubił `pendingWriteId`/`pendingWriteVersion` (put całego rekordu wymazywał je z IDB) i ZAWSZE podbijał `version`; flush przed każdym checkpointem powodował, że retry po lost-ack szedł z nowym writeId i podbitą wersją → `resolveWriteAttempt` zwracał WORKOUT_CONFLICT (obejście Z21 na głównej ścieżce). Fix: ekstrakcja do czystej funkcji `buildWorkoutDraftSnapshot` (`src/lib/workout-draft-snapshot.ts`): pendingWrite\* przenoszone z previousDraft, version podbijana TYLKO przy realnej zmianie treści (exerciseSets/exerciseNotes/exerciseMetrics/dayNotes/skippedExercises, porównanie strukturalne). Komponent jest cienkim wrapperem. Test integracyjny lost-ack na silniku: checkpoint → commit bez acku → flush → retry z TYM SAMYM writeId → already-applied, revision bez podbicia. Odstępstwo kosmetyczne: testy w `src/test/` (konwencja repo), nie `src/lib/`.

**Z30 — updateDraft atomowe (R2-02).** Root cause: `updateDraft` robił read (osobna transakcja) → mutacja w JS → write (osobna transakcja), poza `writeChains`; markDraftSynced startujący na v1 potrafił nadpisać równolegle zapisaną v2 (odhaczona seria znikała z IDB; po ubiciu webview przepadała na stałe, bo dirty=false blokował checkpoint). Fix: `runUpdate` = get+put w JEDNEJ transakcji readwrite (mutator synchroniczny — transakcja IDB auto-commituje po opróżnieniu mikrotasków) + serializacja przez `writeChains` per klucz draftu. Test wyścigu na fake IDB z bramkowanym putem.

**Z31 — finalny clearDraft z guardem wersji (R2-03).** Root cause: po walidacji finalu silnik kasował draft bezwarunkowo; seria odhaczona w trakcie finalnego RTT (kilka-kilkanaście s na słabym zasięgu) ginęła na zawsze. Fix: `clearActiveDraftIfVersion(userId, sessionId, expectedVersion)` (delete tylko gdy `version <= expected`, w writeChains, zwraca boolean); silnik przy odmowie ustawia `draftRetained: true`, NIE sprząta kolejki i zapisuje fakt serwera na drafcie przez markSynced (przy niezgodnej wersji = tylko znaczniki chmury, świeży precondition dla follow-upu). Adapter WorkoutDay przy draftRetained: draft + kolejka zostają, sesja aktywna, toast "zapisano lokalnie" — user domyka ponownym "Zakończ trening" (checkpoint follow-up nie cofa completed: batchSaveWorkout nie dotyka pola completed bez options.completed).

**Z32 — tombstone promocji provisional->remote (R2-04).** Root cause: przez cały RTT promocji WorkoutDay pisał pod stary klucz provisional (sessionId w React zmienia się po outcome) — orphan wisiał w Sync Center, a ręczny sync orphana nadpisywał treścią stale nowszy trening w chmurze (markPromotedToRemote nadpisywał draft remote, cloudRevision=undefined → świeży baseline → precondition przechodził). Fix: (a) tombstone w localStorage `fittracker_promoted:{uid}:{provisionalId}` -> {remoteId, at}, TTL 7 dni, sprzątany przy odczycie i przy zapisie kolejnych; (b) `saveActiveDraft` pod klucz z tombstone przekierowuje zapis pod remote (merge po version: stale zapis sprzed promocji przegrywa, edycja z okna promocji wygrywa i podbija do max+1; brak rekordu remote = sesja domknięta, nie wskrzeszamy); (c) `markPromotedToRemote` scala transakcyjnie na OBU kluczach (`runPromote` + czysta `mergePromotedDraft`): nowszy draft remote wygrywa treścią, znaczniki chmury zawsze świeże. E2E emulator: nowy scenariusz "sync orphana nie nadpisuje nowszej treści" używa realnej `mergePromotedDraft`.

**Hotfix bramki (poza planem, klasa "błąd zapisu treningu").** e2e:emulator wykrył powtarzalny fail `plan-lifecycle merge 501 treningów` — zweryfikowany na worktree baseline 19def99: fail PRE-ISTNIEJĄCY (nie regresja R2), wszedł z Z28 i nie został wykryty, bo bramki startowe audytu R2 nie obejmowały e2e:emulator. Root cause: `validWorkoutShape()` (hasOnly) nie dopuszczał legacy pola `createdAt` — hasOnly widzi CAŁY dokument po merge, więc KAŻDY update dokumentu z tym polem (np. remap cyklu, checkpoint na starym dokumencie) padał PERMISSION_DENIED. Fix: `createdAt` dodany do hasOnly + test rules "update workouta LEGACY z polem createdAt dozwolony — REGRESJA" (lekcja 880cb9e: reguły muszą mieć przypadek z danymi w kształcie sprzed hardeningu). Po fixie: rules 64/64, e2e:emulator 12/12.

### 2026-07-03 — FAZA 6 planu naprawy + release train: security (Z27-Z28), zamknięcie planu Z13-Z28

**Z27 — zależności.** Root: `npm audit fix` → prod deps 0 podatności, react-router-dom 6.30.4 (cel >= 6.30.3). Functions: prod deps (`npm audit --omit=dev`) 0 HIGH/CRITICAL (zostało 9 moderate bez dostępnego niełamiącego fixa). Świadomie odłożone: HIGH/CRITICAL w DEV deps functions (vitest/vite, fix wymaga major bump vitest 4.x — nie dotyka produkcji, do zrobienia przy okazji aktualizacji toolchainu). Testy functions po bumpach: 68 passed / 4 skipped.

**Z28 — utwardzenia punktowe.** (1) CORS streamOpenAI: originy localhost tylko przy `FUNCTIONS_EMULATOR=true`, produkcja wyłącznie GitHub Pages. (2) revenuecatWebhook: porównanie sekretu timing-safe (SHA-256 obu wartości + `timingSafeEqual`, wzorzec safeHashEquals z admin-api.ts). (3) `config/{docId}` zawężone do `config/feature_flags`. (4) Schemat workouts w rules: `validWorkoutShape()` = `keys().hasOnly([17 znanych pól, w tym lastWriteId z Z21])` + `notes <= 5000` na create i update (per-exercise notes clampowane w kodzie — rules nie iterują po tablicach). (5) chat_messages: `create: if false` — ODSTĘPSTWO od planu (plan chciał hasOnly): feature AI Chat usunięty w v6.7.0, klient nie pisze wcale (rg: zero użyć), jedyny writer to admin SDK w Functions, który omija rules; zamknięcie jest prostsze i mocniejsze. Testy rules: 63/63, w tym obowiązkowy przypadek "konto bez pola status zapisuje workout" (lekcja ef8b8d5), workout z lastWriteId ALLOWED, nadmiarowe pole DENIED, config/secret_settings DENIED.

**Release train (Z19 + finalny).** Web: gh-pages ec42f2c (komplet Faz 1-6; wcześniej 1581b59 z Fazami 1-4). Functions: deploy 2x (Fazy 1-4 rano, Z28 po południu). Rules: deploy z client_errors + schematem workouts. iOS: build 47 (Fazy 1-4) na TestFlight z Beta App Review APPROVED (Robert dostaje builda), build 48 (komplet z telemetrią) wysłany tuż po. Pułapki infrastrukturalne rozwiązane po drodze: Xcode 26.6 bez platform iOS 26.5/watchOS 26.5 (fix: `xcodebuild -downloadPlatform iOS` i `watchOS`, ~12.5 GB), skrypty release nie ładują `.env` (fix: `set -a && source .env` przed `release-ios.sh`), JDK21 dla emulatorów w `/opt/homebrew/opt/openjdk@21`.

### 2026-07-03 — FAZA 5 planu naprawy: telemetria błędów + E2E konfliktów (Z25-Z26)

Weryfikacja checkpointu: vitest 458/458 (55 plików), typecheck 0, lint 0, test:rules 54/54 (8 nowych dla client_errors), e2e:emulator 11/11 (4 nowe).

**Z25 — telemetria błędów produkcyjnych (wariant A: własna kolekcja, bez zewnętrznego serwisu).** Root cause (audyt 3.6): zero telemetrii błędów, każda iteracja napraw opierała się na screenshotach usera. Fix: `src/lib/error-telemetry.ts` z `reportClientError(uid, {code, phase, detail, sessionId})` — addDoc do `client_errors` z polami {userId, code, phase, detail<=500, sessionHash (8 znaków SHA-256, nie surowe id), appVersion, platform, createdAt}; best-effort (nigdy nie rzuca), throttling 20 wpisów/sesję appki. Rules: create tylko własny wpis z zamkniętym schematem (keys().hasOnly), read tylko admin, update/delete zablokowane. Raportowanie podpięte w adapterach: WorkoutDay (konflikt, błąd syncu, błąd edycji, catch keepMine), SyncCenterCard (registerConflict, błąd syncu), AutoSyncOnReconnect (błędy finali). Podgląd admina: sekcja "Błędy klienta (ostatnie 50)" w AdminDashboard (onSnapshot orderBy createdAt desc limit 50).

**Z26 — E2E emulator dla konfliktów treningu.** Warunek konieczny: transakcja zapisu wyekstrahowana z hooka do `src/lib/workout-save.ts` (`saveWorkoutBatchWithRevision`, wzorzec training-plan-save.ts) — testy E2E wykonują DOKŁADNIE ten sam kod co produkcja, hook jest cienkim wrapperem błędów. 4 scenariusze w `e2e/emulator/workout-conflict.spec.ts` (wzorzec plan-conflict): (1) dwóch klientów, stale revision → WORKOUT_CONFLICT, treść zwycięzcy nietknięta; (2) lost-ack retry z tym samym writeId → alreadyApplied bez podbicia revision, lastWriteId w dokumencie; (3) edycja po finalu z expectedRevision z serwera → przechodzi (wzorzec Z13); (4) promocja provisional->remote przez silnik syncu (in-memory draft store + realny Firestore), retry nie duplikuje dokumentu (skipped, createSession wywołane raz).

### 2026-07-03 — FAZA 4 planu naprawy: jeden silnik syncu (Z23-Z24)

Weryfikacja checkpointu: vitest 454/454 (54 pliki), typecheck 0, lint 0, build OK, e2e mock 10/10 batch-save (1 test zaktualizowany do nowego kontraktu, patrz niżej).

**Z23 — workout-sync-engine.** Root cause (audyt 3.2-3.3): trzy równoległe egzekutory syncu (WorkoutDay, SyncCenterCard, AutoSyncOnReconnect) z mutexami per komponent, sekwencja finalna skopiowana 3 razy, AutoSync synchronizował treść z KOPII w kolejce zamiast z draftu — rozjazd kopii = wzajemne podbijanie revision. Fix: `src/lib/workout-sync-engine.ts` z `syncWorkoutSession(userId, sessionId, kind, deps)`: cała sekwencja promote -> alreadyFinalized -> save -> validate -> cleanup w jednym module; blokada in-flight per `${userId}::${sessionId}` (równoległe wywołanie tego samego rodzaju dostaje TĘ SAMĄ obietnicę; `final` żądany w trakcie checkpointu dołącza PO nim, żeby nie został połknięty); treść ZAWSZE z draftu IDB; baseline z serwera gdy brak (Z22); writeId per treść (Z21). Trzej konsumenci to cienkie adaptery UI. Kolejka (`workout-sync-queue.ts`) jest REFERENCYJNA: wpis = sessionId + metadane retry/UI, zero treści; stare wpisy z treścią migrowane przy odczycie (treść ignorowana). Konsekwencja kontraktu: wpis kolejki bez draftu w IDB to martwa referencja i jest sprzątany przez silnik (test e2e sync center zaktualizowany: sesja z kolejki musi mieć draft w IDB). Testy silnika na wstrzykiwanych fake'ach: pojedynczy zapis przy równoległych wywołaniach, alreadyFinalized bez zapisu, propagacja konfliktu, markSynced z revision wyniku, sprzątanie martwej referencji, baseline z serwera, final wymuszony kind=final.

**Z24 — boczne ścieżki zapisu.** (1) Usunięte martwe writery omijające revision: `updateExerciseProgress`, `completeWorkout`, `updateWorkoutNotes`, `updateSkippedExercises` (potwierdzone rg: zero użyć poza definicją i return hooka). (2) `backfillHistoricalWorkouts`: updateDoc podbija `revision: increment(1)` + `updatedAt` (inwariant "każdy zapis podbija revision"). (3) Naprawa cyklu w tle: `.catch` z console.error + po sukcesie świeży baseline draftu przez `setCloudBaseline` także gdy sesja czeka w kolejce. (4) Timer sesji używa `activeDraft.startedAt` tylko gdy `activeDraft.sessionId === sessionId`. (5) `resolveConflictKeepMine`: try/catch, przy błędzie dialog zostaje otwarty i user widzi zmapowany komunikat.

### 2026-07-03 — FAZA 3 planu naprawy: idempotencja zapisu (Z21-Z22)

Weryfikacja checkpointu: vitest 445/445 (53 pliki), typecheck 0, lint czysty, build OK. Scenariusz utraty sieci w trakcie checkpointu pokryty testem E2E emulatora w Z26 (lost-ack retry) + test terenowy usera.

**Z21 — idempotentny zapis przez writeId.** Root cause (S3 mechanizm A): transakcja checkpointu nieidempotentna; lost-ack (suspend przy gaszeniu ekranu, słaby zasięg) = commit doszedł, odpowiedź zginęła, retry rzucał WORKOUT_CONFLICT z samym sobą. Fix: `resolveWriteAttempt(current, expectedRevision, writeId)` w `workout-write-attempt.ts`; dokument dostaje `lastWriteId`; retry z tym samym writeId przy niezgodnej rewizji = sukces no-op ('already-applied', zwraca aktualne updatedAt/revision bez update). `writeId` WYMAGANE w options batchSaveWorkout; 5 call site'ów wpiętych (typecheck wymusił). ISTOTNE ODSTĘPSTWO OD PLANU: obok `pendingWriteId` w drafcie persystowane też `pendingWriteVersion` — reuse writeId dozwolony TYLKO gdy wersja draftu się zgadza. Bez tego retry z NOWĄ treścią i starym writeId dawałby fałszywy "already-applied" i utratę nowej treści (checkpoint markowałby dirty=false bez zapisu treści v2 do chmury). Helper `draftWriteId(draft)` egzekwuje tę regułę we wszystkich konsumentach.

**Z22 — baseline nigdy ze stale cache.** Root cause (audyt 3.5): onSnapshot nie odróżniał snapshotu z persistentLocalCache od serwera; po zimnym starcie stale rewizja seedowała `cloudMetaRef`/draft → fałszywy konflikt. Fix: `WorkoutReadSnapshot.workoutsFromCache` (z `snapshot.metadata.fromCache`, konserwatywnie true przed pierwszym snapshotem); seed `cloudMetaRef` w hydracji WorkoutDay tylko przy `workoutsFromCache === false`; draft bez `cloudRevision` (sessionOrigin remote) dostaje baseline z `getWorkoutSessionFromServer` przed checkpointem, utrwalany nowym `workoutDraftDb.setCloudBaseline` (fakt serwera bez ruszania dirty/wersji/treści).

### 2026-07-03 — FAZA 1 planu naprawy (docs/PLAN-NAPRAWY-2026-07-03.md): hotfixy P0 zapisu treningów (Z13-Z18)

Wykonanie metodą TDD (failing test → fix), osobny commit per zadanie. Kolejność Z14 przed Z13 (Z13 używa `workoutSyncErrorMessageKey` z Z14). Weryfikacja checkpointu: vitest 437/437 (51 plików), typecheck 0 błędów, lint czysty, build OK, e2e mock 116/116, e2e emulator PASS (JDK21 z homebrew: `/opt/homebrew/opt/openjdk@21`).

**Z14 — komunikaty błędów syncu przez taksonomię i18n.** Root cause: `setSaveError(result.error)` wstawiał surowe kody ('WORKOUT_CONFLICT', angielskie komunikaty Firestore) do bannera. Fix: `workoutSyncErrorMessageKey(error)` w `workout-sync-conflict.ts` mapuje przez `classifyWorkoutSyncError` na klucze i18n (typ zwrotu zawężony do unii kluczy, bo `t()` wymaga literalnych); 4 nowe klucze w pl.ts i en.ts (conflict/permission/notFound/validation); podpięte w WorkoutDay (linie ~580, ~651). Surowy kod błędu nadal wraca do wywołujących, mapowanie tylko na granicy UI.

**Z13 — edycja treningu z expectedRevision z serwera.** Root cause (S1/S2, deterministyczny): `handleFinishEditing` wołał `batchSaveWorkout` bez `expectedRevision`; `hasWorkoutWriteConflict` traktuje `undefined` jak 0, więc KAŻDA edycja treningu z revision >= 1 rzucała WORKOUT_CONFLICT. Fix: `expectedRevision` jest teraz WYMAGANE w options `batchSaveWorkout` (null = świadome pominięcie, tylko migracje); typecheck wskazał dokładnie 1 call site bez pola (handleFinishEditing) — naprawiony odczytem baseline z serwera (`getWorkoutSessionFromServer`) w momencie zapisu + aktualizacja `cloudMetaRef` po sukcesie. Test strażnik: `hasWorkoutWriteConflict({revision:1}, undefined) === true`.

**Z15 — fallback localStorage przenosi cloudRevision/cloudUpdatedAt/version.** Root cause (S3 mechanizm B): `withFallbackLoad`/`withFallbackSave` odbudowywały draft bez znaczników chmury i z `version: 1`, więc awaryjna ścieżka sama produkowała fałszywe konflikty. Fix: `WorkoutDraft` (format legacy) dostał opcjonalne pola, roundtrip przez fallback je zachowuje. Test: zapis/odczyt przy niedostępnym IDB zachowuje cloudRevision=5, cloudUpdatedAt, version=7.

**Z16 — sprzątanie kopii fallback + bezpiecznik migracji + prefill to nie treść.** Root cause (S4): (1) `clearActiveDraft` przy działającym IDB nie czyścił kopii `fittracker_workout_draft:<uid>` — stara kopia wskrzeszała się przy pierwszym błędzie odczytu IDB; (2) `migrateFromLocalStorage` wskrzeszał dowolnie stary legacy draft; (3) `hasDraftContent` uznawał prefilowane `weight>0` za realną treść, więc porzucony start wisiał jako "niezapisane zmiany" na zawsze. Fix: `clearFallbackCopyIfMatches` po delete w runWrite; bezpiecznik 48h w migracji (starszy draft = usunięcie klucza); treść draftu = odhaczona seria LUB notatka LUB skip (istniejący test migracji dostał świeży savedAt, bo 123 ms epoki podpadał pod bezpiecznik).

**Z17 — znaczniki syncu na bieżącym drafcie.** Root cause (S5, cichy zjadacz serii): po udanym checkpoincie WorkoutDay odbudowywał `activeDraftRef.current` ze STALE snapshotu sprzed syncu; cofnięta wersja powodowała ciche odrzucanie zapisów przez `latestWriteVersions`, a `dirty=false` wyłączał kolejne checkpointy. Fix: czysta funkcja `applySyncMarkers` (`workout-sync-markers.ts`, lustrzana semantyka `markDraftSynced`): znaczniki chmury zawsze, `dirty` czyszczone tylko gdy `base.version === syncedVersion`; baza = bieżący `activeDraftRef.current`.

**Z18 — skipped nie jest błędem.** Root cause: `syncDraftToFirebase` zwraca `{success:false, skipped:true}` przy zajętym mutexie, a `handleCompleteWorkout`/`handleRetrySync` pokazywały toast błędu i ustawiały finalSyncPending. Fix: wcześniejszy return dla `skipped` (bez toastu, bez kolejki).

### 2026-06-29 — Realizacja planu naprawy po audycie (docs/AUDYT-FIX-PLAN-2026-06-29.md)

Wykonanie zadań Z1-Z12 metodą TDD (test odtwarzający → minimalny surgical fix), osobny commit per zadanie. Bez push/deploy/iOS/functions deploy (czeka na zgodę usera). Poniżej per zadanie.

**Z12 — Bramka preflight build number + aktualizacja CLAUDE.md (#10, P2).** `release-ios-preflight.mjs` walidował tylko `MARKETING_VERSION`/Info.plist/package, ale NIE `CURRENT_PROJECT_VERSION` (6 wystąpień w `project.pbxproj`); CLAUDE.md mówił błędnie „4 wystąpienia". Ręczny bump łatwo rozjeżdża część targetów, co Apple odrzuca dopiero po uploadzie. Fix: czyste helpery `extractBuildNumbers`/`findBuildNumberMismatch` w `scripts/release-ios-preflight-checks.mjs` (testowalne bez side-effectów), wpięte do preflightu — rzuca, gdy build numbery nieobecne lub niespójne. CLAUDE.md poprawione „4 wystąpienia" → „6 wystąpień, wszystkie równe; pilnuje tego release-ios-preflight.mjs". Test `release-ios-preflight.test.ts` (spójne→ok, rozjazd→fail, brak→fail, ekstrakcja wszystkich wystąpień). Weryfikacja: `node scripts/release-ios-preflight.mjs` przechodzi na realnym pbxproj (6×46); vitest 428 (50 plików), typecheck/lint OK.

**Z11 — ai-coach: resolver zamiast surowego id (#11, P2) — ODŁOŻONE świadomie.** `ai-coach.ts` buduje mapę nazw plan-first (`exerciseNames.get(ex.exerciseId) || ex.name || ex.exerciseId`, linie ~103/~466), pomijając cykle/defaultPlan. Powód odłożenia: `prepareCoachData` i `generateWorkoutSummary` są eksportowane, ale NIGDZIE nieimportowane (coach niewpięty — martwy kod). Istniejący fallback `|| ex.name` (snapshot z treningu, dodany w fixie Zastój/PR 2026-06-29) chroni realne dane przed surowym id; ryzyko jest latentne. Refactor sygnatur martwych funkcji pod `resolveExerciseName` (wymaga przekazania `cycles`) to praca spekulatywna na nieużywanym kodzie (Karpathy: nie ruszać martwego kodu). Dodano noty TODO przy obu funkcjach: przy wpięciu coacha przekazać `cycles` + użyć `resolveExerciseName` (snapshot-first) jak Analytics/Achievements. Zmiana w tym zadaniu: tylko komentarze TODO (bez zachowania). typecheck/lint OK.

**Z10 — IntervalTimer nie background-safe (#8, P2) — ODŁOŻONE świadomie.** `IntervalTimer.tsx:49-70` używa tylko `setInterval(1000)` (brak local notification jak w `RestTimer`+`rest-notification.ts`), więc EMOM/AMRAP po zgaszeniu ekranu nie odpali sygnału rund/finiszu. Powód odłożenia: flaga `VITE_FEATURE_WORKOUT_TIMERS=false` w prod → IntervalTimer w ogóle się nie montuje (ExerciseCard: `FEATURE_FLAGS.workoutTimers ? resolveExerciseInterval : null`); to dług latentny, nie aktywny bug. Poprawność fixu = systemowe powiadomienie dostarczone przy wstrzymanym JS (zgaszony ekran) — weryfikowalna WYŁĄCZNIE na realnym urządzeniu z włączoną flagą, co jest poza zakresem tego loop. Unit test sprawdzałby tylko, że wołamy mock Capacitora (anty-wzorzec TDD „testing the mock"); istniejący analog `rest-notification.ts` też nie ma unit testu z tego powodu. Plan działania przy włączaniu timerów: `schedule` local notification na koniec bloku (+ ewentualnie granice rund EMOM) wzorem `scheduleRestEndNotification`, z anulowaniem przy pauzie/reset/close/finiszu w foregroundzie.

**Z9 — Twardy throw przy 2 aktywnych cyklach (#7, P2).** `workout-start.ts:55` rzucał `MULTIPLE_ACTIVE_CYCLES`, łapane generycznym catch w `WorkoutDay.tsx:1251` → toast błędu, brak recovery, start zablokowany. Prod: nie występuje (każdy user 1 aktywny) — defensywa danych. Root cause: anomalia danych traktowana jako błąd krytyczny zamiast degradacji. Fix: zamiast throw deterministyczny wybór najnowszego aktywnego cyklu (`createdAt` malejąco, tie-break `id`) z `console.warn`; start kontynuuje. Catch generyczny zostaje (inne błędy). Test `workout-start.test.ts` (2 aktywne cykle, obie kolejności wejścia → wybrany „newer", brak wyjątku). Weryfikacja: vitest 424, typecheck/lint OK.

**Z8 — Nieskończony spinner startu treningu przy pustym uid (#6, P2).** Gate `startSourcesReady` w `WorkoutDay.tsx:1560` wymaga 4 źródeł `isLoaded`. Trzy z nich robiły early-return bez ustawienia loaded przy `!userId`: `useTrainingPlan.ts:33`, `usePlanCycles.ts:66` oraz `workout-read-store.ts` (`getWorkoutReadSnapshot('')` → EMPTY_SNAPSHOT z `isLoaded:false`). Gdy uid chwilowo puste (odświeżanie tokena), spinner wisiał bez komunikatu ani timeoutu. Root cause: brak konwencji „puste, ale gotowe" w 3 z 4 źródeł (loader draftu `WorkoutDay.tsx:712` JUŻ ją miał: `!uid → setIsDraftLoaded(true)`). Fix (spójny z istniejącym wzorcem): `!userId → setIsLoaded(true)` w obu hookach; w read-store osobna stabilna `EMPTY_LOADED_SNAPSHOT` (isLoaded:true) zwracana dla pustego uid (stabilna referencja konieczna dla useSyncExternalStore). Test `workout-start-sources.test.ts` (mock `@/lib/firebase` bo realny init pada w jsdom): `getWorkoutReadSnapshot('')` → isLoaded true, puste dane. Hooki: zmiana to mechaniczne odwzorowanie zweryfikowanego wzorca draftu (brak harnessu renderHook+firestore w repo). Weryfikacja: vitest 423, e2e:mock 116 (jeden przebieg miał flake exercise-card-v3:62, zielony po powtórce i w pełnym ponowieniu), typecheck/lint OK.

**Z7 — Asymetria status: reguły vs callable (#2, P2).** `firestore.rules` (hasSelfAccess, :24-33) traktuje brak pola `status` jak aktywny (fix z incydentu „Missing or insufficient permissions"), ale `functions/src/security.ts hasCallableAppAccess` wymagał `status === 'active'` → konto bez `status` (Google/legacy) zapisze trening, ale AI/Strava odrzuci („Active app access required"). Bramkuje `index.ts:572,676,790`. Prod: 0 userów dotkniętych dziś (wszyscy active po backfillu) — defekt latentny. Root cause: niespójna logika dostępu między warstwą reguł a callable. Fix: `hasCallableAppAccess` zrównane z regułami — brak `profile` (dokument nie istnieje) = false; brak pola `status` (doc istnieje) = aktywny; jawnie nieaktywni (pending_verification/suspended) nadal blokowani; warunek `access.enabled !== false` zachowany. Testy zaktualizowane w `functions/src/security.test.ts` (18 zielonych) i `src/test/functions-security.test.ts` (brak status = dozwolone, undefined = blok, access.enabled:false = blok). Build functions OK.

⚠ ŚWIADOME ODWRÓCENIE wcześniejszej decyzji z 2026-06-29 („pusty profil {} ma dalej być odrzucany"). Uzasadnienie: audyt Z7 wykazał, że to ASYMETRIA — reguły już pozwalają `{}` na zapis, więc callable powinien być spójny; w przeciwnym razie legit konto bez `status` ma częściowy, mylący dostęp. Bezpieczeństwo: wymagamy istnienia dokumentu profilu (`undefined` → blok) i `access.enabled !== false`, więc niezarejestrowany/wyłączony user dalej nie wejdzie. Jeśli user nie zgadza się na poszerzenie dostępu dla pustego `{}` — rollback tego commita. Wymaga `firebase deploy --only functions` (osobna zgoda). Weryfikacja: vitest root 422, functions 18, typecheck/lint/build OK.

**Z6 — P1 KRYTYCZNE: fałszywy konflikt sync po wznowieniu z tła (#1).** Po zgaszeniu ekranu i powrocie (iOS purguje WKWebView) pojawiał się fałszywy „Trening edytowany na innym urządzeniu"; wybór „Pobierz z chmury" = utrata serii. Root cause (potwierdzony w kodzie): `markDraftSynced` (`workout-draft-db.ts:440`) zwracał draft BEZ ZMIAN, gdy `draft.version !== expectedDraftVersion` (edycja serii w trakcie syncu podbiła version). Skutek: `cloudUpdatedAt`/`cloudRevision` (fakt serwera) NIE trafiały do IndexedDB. Korekta żyła tylko w pamięci (`WorkoutDay.tsx:637-645`) i ginęła przy purge. Po resume `expectedRevision` czytane z IDB (`WorkoutDay.tsx:554` = `draft.cloudRevision`) było stale ≠ serwer → `hasWorkoutWriteConflict` true → `WORKOUT_CONFLICT` (`workout-final-sync.ts:30`, `useFirebaseWorkouts.ts:606`). Fix (surgical): w `markDraftSynced` znaczniki chmury zapisywane ZAWSZE (fakt serwera, niezależny od edycji draftu); przy niezgodnej wersji aktualizowane są WYŁĄCZNIE `cloudUpdatedAt`/`cloudRevision`, bez ruszania `dirty` i treści (lokalna edycja czeka na własny sync). Testy: jednostkowy (edycja podbija version w trakcie syncu → cloudRevision=6 i cloudUpdatedAt=777 zapisane, dirty=true, version=2, treść zachowana) + integracyjny (reload z IDB → `hasWorkoutWriteConflict(serwer rev 6, cloudRevision 6)`=false; kontrola negatywna ze stale rev 5 → true). Istniejący test „does not clear a newer local draft" nadal zielony (dirty/version zachowane). ⚠ DŁUG: wymaga ręcznego testu background/resume z edycją serii tuż przed zgaszeniem ekranu na realnym urządzeniu PRZED iOS release. Weryfikacja automatyczna: vitest 422, typecheck/lint OK.

**Z5 — Stale staty completed cyklu (#5, P2).** `usePlanCycles.archiveCurrentPlan` liczy `computeStats` jednorazowo przy archiwizacji i zapisuje do `cycle.stats`. Gdy trening dojdzie/zmieni się PO archiwizacji (np. spóźniony sync z innego urządzenia), completed cykl pokazuje przestarzałe staty — prod: MwiWFE cykl `5Hp8zu20` ma 1 trening, ale `stats.totalWorkouts=0` → po Z4 byłby ukryty. Root cause: zapisane staty completed to migawka, nie żywe źródło. Fix (simplicity-first, jedno źródło prawdy = treningi): helper `withLiveCompletedStats(cycle, workouts)` w `cycle-insights.ts` (analog `buildActiveCyclePreview`, ale zachowuje `endDate` cyklu) przelicza `stats` z treningów otagowanych `cycleId`. Użyty dla completed cykli w Dashboard (`visibleCycles`), Cycles (`visibleCycles`) i Achievements (`seasonShelf`) PRZED filtrem widoczności (Z4) i wyświetleniem — `CycleCard`/`CycleDetail`/medale dostają świeże staty. Zapisane `cycle.stats` zostają jako cache. Aktywny cykl bez zmian (osobny `buildActiveCyclePreview`). Test `cycle-insights.test.ts` (completed ze stale stats=0 + trening w slocie → live totalWorkouts=1, completionRate>0, tonaż 400, endDate zachowany). Weryfikacja: vitest 420, e2e:mock 116, typecheck/lint OK.

**Z4 — Niespójne ukrywanie pustych cykli (#4, P2).** `Dashboard.tsx:184` filtrował cykle tylko przez `isCycleVisible` (flagi `technical`/`hiddenFromInsights` nigdzie nieustawiane → zawsze true), bez warunku `totalWorkouts>0`, więc pusty completed cykl mógł trafić do `previousCompletedCycle` i porównania. `Cycles.tsx:137` i `Achievements.tsx:192` dodawały warunek osobno, każdy inaczej. Root cause: brak jednego źródła prawdy dla „cykl wart pokazania". Fix: helper `isCycleVisibleWithData(c) = isCycleVisible(c) && (c.status==='active' || c.stats.totalWorkouts>0)` w `cycle-visibility.ts`, użyty w Dashboard (184), Cycles (137) i Achievements (192). Bez nowych flag — opiera się na `stats.totalWorkouts`. (Stale staty completed → osobne zadanie Z5.) Test jednostkowy `cycle-visibility.test.ts` (pusty completed ukryty, aktywny pusty widoczny, completed z treningami widoczny, techniczny ukryty). Weryfikacja: vitest 418, e2e:mock 116, typecheck/lint OK.

**Z3 — Cleanup martwego kodu po revercie build 46 (#9, P2).** Trzy sieroty, wszystkie zweryfikowane gremem jako nieosiągalne w produkcji:
1. `enforceWorkingSetCount` — prop usunięty z wywołania `ExerciseCard` w build 46 (`938aadb`), więc zawsze `false`; martwe gałęzie w `ExerciseCard.tsx` (interfejs, destrukturyzacja, `sanitizeSets` 3. arg, blok `if (enforceWorkingSetCount...)` w useEffect, warunki przy przycisku delete/add-set) i w `exercise-utils.ts` (3. param + gałąź enforce w `sanitizeSets`). Usunięto wszystko + test `enforces exactly the planned working-set count`.
2. `src/lib/offline-queue.ts` — `.add()` wołane tylko w teście; w produkcji `offlineQueue.size()` zawsze 0. Usunięto moduł + test; w `useOnlineStatus.ts` realne źródło `pendingOps` to `queueCount + activeCount` (zachowane), zastąpiono `offlineQueue.size()` zerem (zachowanie identyczne, `Math.max(0, ...)` uproszczony).
3. `workout-draft-db.markCompletedLocally` — metoda wołana tylko w teście; pole `completedLocally` żyje przez inną ścieżkę (`WorkoutDay.tsx:1436`, czytane w `useWatchPlanPreview`/`WorkoutDay`), więc usunięto wyłącznie martwą metodę + jej test.

Zmiany czysto refaktorowe, bez zmiany zachowania (TDD-exception: refactor → testy zielone przed i po, minus testy usuniętego martwego API). Weryfikacja: typecheck/lint OK, vitest 414 (47 plików, było 422/48 — minus 6 offline-queue + 1 enforce + 1 markCompletedLocally), e2e:mock 116 passed.

**Z2 — Tonaż cyklu wliczał serie rozgrzewkowe (#3, P2).** `cycle-insights.ts:114` sumował tonaż bez filtra `!set.isWarmup`, podczas gdy `summary-utils.calculateTonnage` (:30) i obliczanie PR-ów w tym samym pliku (:132) rozgrzewki pomijają → tonaż cyklu zawyżony, niespójny. Root cause: pominięty warunek `isWarmup` przy tonażu. Fix (surgical, 1 linia): dodano `&& !set.isWarmup` w reduktorze tonażu. Test regresji w `cycle-insights.test.ts` (rozgrzewka 1000 kg + robocza 360 kg → tonaż 360, było 1360). Weryfikacja: vitest 422 zielone (+1), typecheck/lint OK.

**Z1 — e2e: 2 czerwone testy nawigacji (#12, P2).** Build 46 (`938aadb`) usunął mobilny hamburger/drawer; `sidebarOpen` w `Layout.tsx` nigdy nie jest ustawiane na `true`, więc `Sheet` (boczne menu) na mobile nie da się otworzyć. Dwa testy klikały nieistniejący `button 'Nawigacja główna'` → TimeoutError. Root cause: testy zakładały drawer usunięty w build 46. Fix (tylko `e2e/`): `nav-analytics.spec.ts` — usunięto część otwierającą boczne menu i szukającą Historii (na mobile Historia nie jest już w nawigacji), zachowano pokrycie dolnego paska (Analityka jest, Historia nie); `ui-improvements.spec.ts` — usunięto klik hamburgera + Escape, zachowano asercję braku sidebara na mobile i pętlę Tab sprawdzającą, że linki tylko-sidebarowe (history/measurements/achievements/cycles) nie łapią fokusa. Weryfikacja: `e2e:mock` 116 passed (było 2 failed), typecheck/lint/test 421 zielone.



**Serie:** podczas aktywnego treningu nie dało się dodać/usunąć serii roboczej (tylko rozgrzewkowe). Przyczyna: `enforceWorkingSetCount` (regresja z hardeningu `880cb9e`) wymuszał liczbę serii z planu, ukrywając przyciski +/× (`ExerciseCard` linie 451, 597). Fix: usunięto prop `enforceWorkingSetCount` z wywołania `ExerciseCard` w `WorkoutDay.tsx` (default false) → pełna swoboda jak przed hardeningiem. Reszta logiki (`sanitizeSets`) działa w trybie niewymuszonym.

**Hamburger:** przycisk menu (top-left, `AppHeader`) otwierał mobilny boczny Sheet, który nie działał na iOS (WKWebView). Usunięty: `AppHeader` bez `Menu`/`onMenuClick`, `Layout` nie przekazuje `onMenuClick`. Nawigacja mobilna w całości na dolnym pasku (`AppNavigation` bottom-nav, niezależny). Desktopowy sidebar bez zmian.

Obie to regresje z pakietu hardeningu, nie z builda 44. 421 testów, typecheck, lint, build zielone.

### 2026-06-29 — Zastój/PR pokazywały surowe exerciseId (ex-1-2) zamiast nazw legacy ćwiczeń

**Objaw:** sekcja "Zastój" na Osiągnięciach pokazywała `ex-1-2`, `ex-2-3` zamiast nazw (część ćwiczeń, np. "Uginanie nóg", rozwiązywała się poprawnie).

**Root cause:** mapa `exerciseNames` przekazywana do `detectPlateaus` (Achievements.tsx) jest budowana z `oneRMRecords`, które są **deduplikowane po nazwie** — gdy legacy id (`ex-1-2` = "Przysiad ze sztangą") ma tę samą nazwę co aktualny `tpl-ex-35`, dedup zostawia jeden id i wyrzuca drugi z mapy. `detectPlateaus`/`detectNewPRs` grupują po surowym exerciseId (wszystkie), więc wyrzucony legacy id → `map.get(id) ?? id` → surowe id. Dane są OK: każdy wpis treningu MA zapisane `ex.name`.

**Fix (u źródła, fallback do snapshotu, dane już istnieją):**
- `achievements-utils.ts` `detectPlateaus`: zbiera `ex.name` per id, `exerciseNames.get(exId) ?? snapshotNames.get(exId) ?? exId`.
- `pr-utils.ts` `detectNewPRs`: `... || ex.name || ex.exerciseId`.
- `ai-coach.ts` (kontekst dla AI): `... || ex.name || ex.exerciseId` (AI widziało surowe id).
- Test regresji w `achievements-utils.test.ts` (legacy id + pusta mapa → nazwa ze snapshotu).

**Audyt innych miejsc:** `cycle-insights.ts` już miał fallback do snapshotu; `AnalyticsChartsTab`, Rekordy w Achievements i ExerciseProgression używają `resolver.resolveExerciseName` (snapshot-first) — OK.

421 testów, typecheck, lint zielone. Fix kliencki: web zdeployowany; iOS wymaga builda 45.

### 2026-06-29 — "Missing or insufficient permissions" przy starcie treningu: reguły wymagały status=='active', którego nie mają konta Google

**Objaw:** user nie mógł rozpocząć/zapisać treningu — czerwony błąd "Missing or insufficient permissions". Strona renderowała się (odczyty działały), padał dopiero zapis.

**Root cause (systematic-debugging, potwierdzony na danych prod read-only):** hardening reguł (`880cb9e`, `1aede0f`) dodał `hasSelfAccess`, które do KAŻDEGO zapisu (create/update workouts, plan_cycles, measurements, telemetry) wymaga `users/{uid}.status == 'active'`. Reguły read mają bypass `isAdmin()`, ale write NIE — dlatego odczyty działały, a zapisy padały. Konta z logowania Google (i sprzed flow rejestracji) NIGDY nie dostały pola `status` — gałąź logowania w `registration.ts` aktualizuje `lastLoginAt`, ale nie ustawia `status`. Skala: 2 z 5 userów bez `status` (g.jasionowicz/admin + realna userka joannawojtun32). Dla nie-admina blokowane były nawet odczyty.

**Dlaczego test:rules tego nie złapał:** harness `seedUser` ZAWSZE ustawiał `status` — przypadek dokumentu BEZ pola `status` nie był pokryty.

**Fix (pełny):**
1. Reguła `hasSelfAccess` backward-compat: brak pola `status` = traktuj jak aktywny; jawnie nieaktywni (`pending_verification`, `suspended`) nadal blokowani. Plik `firestore.rules`. Wdrożone na prod (`firebase deploy --only firestore:rules`).
2. Regresja w `scripts/test-firestore-rules.mjs`: dokument users bez `status` → zapis dozwolony (red→green; 46/46 testów reguł przechodzi). `pending_verification` nadal blokowany.
3. Backfill `status:'active'` + `access:{enabled:true}` na 2 kontach (admin SDK, merge, idempotentnie) — naprawia też dostęp do Cloud Functions callable (`hasCallableAppAccess` wymaga status=='active'). Zweryfikowane.

**Źródło dla nowych kont jest OK:** `registerUser` (registration.ts:350-351) ustawia `status`/`access` dla nowych userów. Incydent dotyczył wyłącznie kont legacy. Świadomie NIE ruszano `hasCallableAppAccess` (pusty profil `{}` ma dalej być odrzucany — istniejąca intencja bezpieczeństwa; wszystkie obecne konta mają już status po backfillu).

**To NIE był błąd kodu builda 44** (stabilizacja treningów) — czysto warstwa reguł + dane legacy.

### 2026-06-27 — Stabilizacja treningów: wyścig startu, konflikt Sync Center, odporne statystyki, naprawa danych (build 44 / 6.13.0)

**Objaw:** banner „Ustabilizuj realizację planu" + frekwencja 9/16 (56%) i 7 „opuszczonych",
mimo że właściciel zrobił 16 treningów. Pełna analiza: `docs/ANALIZA_I_PLAN_STABILIZACJI_TRENINGOW_2026-06-27.md`.

**Root cause (2 defekty danych + 4 defekty kodu):**
1. 6 ukończonych sesji (16–26.06) bez `cycleId` → statystyki cyklu ich nie liczyły.
2. Sesja 19.06 miała 13 zaliczonych serii, ale `completed=false` (utknęła między draftem a chmurą).
3. Wyścig startu: `WorkoutDay` autostartował po `isLoaded` listy treningów, nie czekając na plan + cykle + draft → sesje bez `cycleId` i mieszanie ćwiczeń planu domyślnego z właściwym.
4. Sync Center nie rozróżniał typów błędów ani nie oferował rozwiązania konfliktu rewizji.
5. Statystyki liczyły `treningi/oczekiwane` zamiast slotów kalendarza; brak `cycleId` zamieniał obecność w nieobecność; pusty techniczny cykl trafiał na półkę medali (fałszywy „Sezon 0%").
6. Telemetria pisała liczniki jako literalne klucze `counters.x` zamiast mapy `counters`.

**Zrobione (kod):**
- Faza 2: `src/lib/workout-start.ts` (gate `areWorkoutStartSourcesReady` na workouts+plan+cykle+draft, `buildWorkoutStartSnapshot`, `findUniqueCycleForDate`). Autostart i przycisk startu zablokowane do załadowania wszystkich źródeł; bezpieczny backfill `cycleId` przez transakcję `createWorkoutSession` tylko gdy dokładnie jeden cykl pasuje do daty.
- Faza 3: `src/lib/workout-sync-conflict.ts` (`classifyWorkoutSyncError`, `summarizeLocalDraft/Cloud`); SyncCenterCard pokazuje konflikt z porównaniem (ćwiczenia/serie), nie ponawia konfliktu automatycznie; AutoSyncOnReconnect pomija konflikty rewizji.
- Faza 4: `cycle-insights.ts` liczy frekwencję wg slotów kalendarza, dedup duplikatów, cap 100%, `orphanWorkoutCount`; przy orphanie/pending-final pokazuje neutralne „Statystyki wymagają synchronizacji" zamiast coachingu. `cycle-visibility.ts` (`isCycleVisible`) ukrywa cykle `technical`/`hiddenFromInsights` w Dashboard/Cycles/Achievements/usePlanCycles.
- Faza 5: telemetria zapisuje prawdziwą mapę `counters`; nowe metryki `revision_conflict`, `orphan_workout`, `mixed_plan_exercise_set`. Narzędzie `scripts/audit-repair-training-data.mjs` (backup → preview → apply --confirm → verify, backup z SHA256 przed zapisem).
- Feature flag `VITE_FEATURE_WORKOUT_TIMERS=false` (`src/lib/feature-flags.ts`): timery odpoczynku/EMOM/AMRAP/rozgrzewki + ich UI i timer na Watch wyłączone domyślnie; pomiar czasu sesji zostaje.

**Zrobione (dane produkcyjne, konto `g.jasionowicz@gmail.com`, uid U6GDdfg7...):**
- Faza 0: 3 backupy z SHA256 w `private-backups/` (gitignored).
- Faza 1 (zweryfikowane porównaniem snapshotów przed/po): 6 sesji dostało `cycleId=otL65epGl1lQ9eyKIZrO`; ćwiczenia oczyszczone do 5/7/6/5/7 (usunięte puste obce wpisy); 19.06 `completed=true`; techniczny cykl `lkjSbPbc3suvlhEBtFYK` oznaczony `technical=true, hiddenFromInsights=true`.

**Weryfikacja:** `typecheck`, `lint`, `test` (48 plików / 420 testów), `build` web + mobile — wszystkie zielone. Preflight wersji: 6.13.0 / build 44 spójne (Info.plist + 6× MARKETING_VERSION + CURRENT_PROJECT_VERSION).

**Zostaje (Faza 6, ręczne):** test na fizycznym iPhonie (zgaszony ekran, resume, finalizacja, słaby zasięg) i Watch; te bramki realizuje TestFlight. Pełny scenariusz Sync Center (reload bez nawrotu draftu) do potwierdzenia na urządzeniu. `test:rules`/`e2e:emulator` nieuruchomione w tej sesji (reguły Firestore niezmienione).

### 2026-06-18/24 — Pusty paywall IAP: root cause = brak App Review pierwszej subskrypcji (WSTRZYMANE, czeka na usera)

**Objaw:** natywny paywall iOS nie ładuje pakietów (`getOfferings()` → `code=23`, puste pakiety).

**Root cause (systematic-debugging, dowód warstwa po warstwie):** to NIE bug w kodzie ani błąd
konfiguracji. Wszystkie warstwy zielone (klucz w buildzie, kod, RC offering+produkty, ASC
READY_TO_SUBMIT+ceny+lokalizacje, Paid Apps Agreement Active, bundle). Jedyna przyczyna: app w
`PREPARE_FOR_SUBMISSION`, **pierwsza subskrypcja nigdy nie przeszła App Review** — StoreKit nie
serwuje produktów first-time app w sandbox/TestFlight, dopóki IAP nie pójdzie do review z buildem.
Potwierdzone na urządzeniu (build 40 z diagnostyką na ekranie): `cfg=true THROW code=23 ... no App
Store products registered ... for your offerings`. RC backend (odpytany kluczem z builda) zwraca
poprawne identyfikatory — porażka jest na poziomie StoreKit fetch.

**Decyzja:** jedyna droga = wysłać apkę 1.0 z subskrypcjami do App Review (i tak konieczne do sprzedaży).

**Zrobione:** build 40 (diagnostyka, potwierdził root cause) → build 41 (czysty, VALID na TestFlight);
cena Free; kategoria Health & Fitness; privacy/support URL; konto demo Auth (`applereview@strengthsave.app`).

**Blokery (czeka na usera):** service account Firebase (grzegorzee bez GCP IAM na fittracker →
brak Firestore admin write do nadania PRO comp koncie demo); dane kontaktowe recenzenta; akceptacja copy.

**Pełny status + checklist + dane referencyjne:** `docs/APP-REVIEW-IAP-STATUS.md`.

### 2026-06-18 — Naprawa 3 bugów z treningu na siłowni (audyt + TDD wg Karpathy)

**Kontekst:** User zgłosił 3 bugi po realnym treningu (5G, ekran zgaszony). Audyt root cause (3 równoległych agentów Explore) → potwierdzenie w kodzie → fix każdego przez TDD (test odtwarzający RED → fix GREEN), izolowane commity (1 bug = 1 zmiana).

**Bug 1 — miks ćwiczeń z dwóch dni planu w podsumowaniu (część 0/4 serii, część zrobiona).**
Root cause: `findWorkoutForRoute` z `allowDateFallback` wracał do treningu INNEGO dnia planu z tej samej daty (fallback ignoruje `dayId`). Przy starcie dzisiejszego treningu dnia A, gdy istniał ukończony trening dnia B z tej samej daty, init wczytywał ćwiczenia B do `exerciseSets` (`WorkoutDay.tsx:785`), user dorabiał A, a zapis `Object.entries(exerciseSets)` (`:1356`) utrwalał miks obu dni pod jedną sesją.
Fix: nowa opcja `today` w `findWorkoutForRoute` — cross-day fallback działa tylko dla dat PRZESZŁYCH (oglądanie historii po zmianie planu, chronione testem `:16-32`). Dla dzisiejszej daty fallback zablokowany → nowy trening startuje czysto z `baseDay`. Podłączone w widoku (`:189`) i init (`:701`).
Weryfikacja: 3 nowe testy w `workout-lookup.test.ts` (blokada cross-day dziś, fallback historii w przeszłości, własny dzień dziś).

**Bug 2 — layout „rozjeżdża się" w bok przy zamianie ćwiczenia.**
Root cause: nazwy ćwiczeń w nagłówku dialogu zamiany (`WorkoutDay.tsx:1897`) i w pozycjach listy biblioteki (`:1924`) były we flex-kontenerze bez `min-w-0`/`truncate`. Flex-item z długim tekstem ma `min-width:auto`, więc rozpychał kontener szerzej niż ekran → poziomy scroll całej strony.
Fix: `min-w-0` + `truncate` na tekstach, `shrink-0` na przycisku Zamknij.
Weryfikacja: build + scenariusz manualny (CSS layout poza zasięgiem unit-testu).

**Bug 3 — pusta kolumna POPRZ. mimo istniejącej historii.**
Root cause: `getPreviousHint` (`ExerciseCard.tsx`) indeksował `previousSets[globalIndex]`, gdzie `globalIndex` liczył rozgrzewki+robocze bieżącej sesji, a `previousSets` to surowa tablica historii. Różna liczba rozgrzewek między sesjami rozjeżdżała indeksy → `'—'`.
Fix: nowa czysta funkcja `previousWorkingSet()` (`exercise-utils.ts`) filtruje rozgrzewki po obu stronach i indeksuje po kolejności serii roboczych (spójnie z `createPrefilledSets`). `renderSetRow` przekazuje working index.
Weryfikacja: 4 testy w `exercise-utils.test.ts`.

**Uwaga o danych:** Fix bug 1 zatrzymuje tworzenie NOWYCH miksów. Treningi już zapisane z miksem (jeśli istnieją w Firestore) pozostaną — to osobna naprawa danych, nie dotykano konta usera (dane święte). Build/resume na urządzeniu do potwierdzenia bug 2.

**Stan:** 376/376 testów zielone, typecheck + lint + build OK. 3 izolowane commity na `main`.

### 2026-06-11 — Rebrand ikony aplikacji: limonkowy hantel 3D

**Co:** Nowa ikona (3D hantel na limonkowym tle #DDF70D, wygenerowana w ChatGPT) wdrożona wszędzie: iOS AppIcon + watch icon (1024px, rogi zalane limonką, bez kanału alpha — wymóg App Store), splash screen (ikona na tle #0e0e0e, 9 wariantów — zastąpiła stare logo tarczy), PWA (pwa-192/512), favicon.png 96px + favicon.svg (embedded PNG), logo w sidebarze (AppNavigation) i na ekranie logowania (zamiast badge "SS" i lucide Dumbbell), tytuł logowania w font-heading (Space Grotesk).

**Dlaczego:** Wyróżnialność w App Store (kategoria fitness = morze ciemnych ikon, solid lime się wybija) + spójność z motywem neon lime apki. Wybrano wariant solid (bez gradientu/tekstury) — najlepsza czytelność przy 60px, zgodnie z Apple HIG.

**Technika:** ImageMagick — maska roundrectangle (promień 186/1254 jak w wypieczonych rogach źródła), wersja kwadratowa (rogi zalane #DDF70D) dla iOS/PWA i wersja z przezroczystymi rogami dla favicon/UI. theme-color #0a0a1a → #0e0e0e (index.html + manifest PWA).

**Weryfikacja:** 350 testów zielonych, typecheck, lint, build OK, web zdeployowany (favicon.svg/png widoczne na live). Nowa ikona iOS pojawi się w TestFlight przy następnym buildzie.

### 2026-06-11 — Aplikacja Apple Watch (StrengthWatch): logowanie serii z nadgarstka

Cel: logowanie treningu bezpośrednio na zegarku, bez wyjmowania telefonu.

**Architektura (zweryfikowana E2E na sparowanych symulatorach iPhone 17 + Watch Ultra 3):**
- Target watchOS `StrengthWatch` (SwiftUI, watchOS 10+, single-target watch app) osadzony w apce iOS. Źródła: `ios/App/WatchApp/`. Target dodawany skryptem `scripts/add_watch_target.rb` (gem xcodeproj, idempotentny).
- Transport: WatchConnectivity. Telefon → zegarek: `updateApplicationContext` (JSON pod kluczem `workout`). Zegarek → telefon: `sendMessage` z fallbackiem `transferUserInfo` (kolejkowane, działa gdy apka telefonu uśpiona).
- Most do warstwy web: lokalny plugin Capacitora `WatchBridge` (`ios/App/App/WatchBridge/`), rejestrowany przez `BridgeViewController` (subclass `CAPBridgeViewController`, podpięty w Main.storyboard). Eventy z zegarka trafiają do trwałej kolejki w UserDefaults (max 500) i są odbierane przez JS listenerem `watchEvent` + `drainEvents()` przy starcie/foregroundzie — nic nie ginie, gdy webview nie żyje.
- Web: `src/lib/watch-bridge.ts` (protokół + API pluginu), `src/hooks/useWatchWorkoutSync.ts` (wysyłka stanu z debounce 800 ms, dedup eventów po `at`), wpięty w `WorkoutDay.tsx`. Serie z zegarka przechodzą przez `handleSetsChange` → draft IndexedDB → istniejący sync do Firestore (zero nowych ścieżek zapisu).
- Zasada MVP: trening trzeba WYSTARTOWAĆ na telefonie (draft + sessionId), zegarek służy do logowania serii. Eventy dla nieaktywnej sesji czekają w natywnej kolejce.
- Zegarek trzyma payload w UserDefaults (działa offline); merge przychodzącego kontekstu zachowuje lokalnie zaliczone serie.
- UI zegarka: lista ćwiczeń (postęp x/y) → serie → edytor (steppery powt./ciężar ±2,5 kg, prefill z poprzedniej zaliczonej serii) → „Zalicz serię" (haptyka). Teksty PL.
- Build: `CURRENT_PROJECT_VERSION = 28` (build 27 wydała równoległa sesja grywalizacji z czystego worktree). Ikona watch = ikona iOS 1024.
- Koordynacja: w repo pracowała równolegle sesja grywalizacji — commit watch zrobiony jawnymi ścieżkami (bez `git add -A`); klucze i18n watch weszły przypadkiem z commitem 901eb27 (nieszkodliwe).
- Dowody E2E: `audit/shots/watch/` (10-watch-context, 13-watch-after-log, 14-phone-after-watch-log — toast „Set from watch" + seria zaliczona na telefonie).
- Wdrożone: web (GH Pages) + **TestFlight build 28** (upload OK, Beta App Review APPROVED od razu). Signing zegarka: `scripts/watch_signing.py` (bundle ID `...watchkitapp` zarejestrowany, profil „Strength Save Watch App Store" na istniejącym cercie Distribution, mapowanie dopisane do ExportOptions-manual.plist — plik poza repo).

### 2026-06-11 (cz. 2) — Start treningu z zegarka + podgląd planu (build 29)

- Zegarek pokazuje plan dnia PRZED startem sesji (Dashboard → `useWatchPlanPreview`, payload `active:false`, prefill jak w WorkoutDay) i ma przycisk „Rozpocznij trening".
- Event `startWorkout` → globalny `WatchEventRouter` (App.tsx) nawiguje do WorkoutDay z `autostart=true`; sesja powstaje istniejącą ścieżką. Plugin dostał `peekEvents` (podgląd kolejki bez kasowania — eventy serii konsumuje wyłącznie WorkoutDay).
- Zaliczenie serii na zegarku w trybie podglądu = niejawny start (sticky lokalny override do potwierdzenia `active:true` z telefonu).
- Aktywny draft → Dashboard wysyła stan z draftu (`active:true`) — zegarek aktualny bez otwierania WorkoutDay (zweryfikowane na symulatorze).
- 4 testy `WatchEventRouter` (nawigacja, peek, filtr daty/typu, dedup po `at`). Ścieżka preview→start nie miała pełnego E2E na symulatorze (dzisiejszy dzień miał realny draft na koncie admina — nie fałszujemy danych treningowych); pierwsza realna weryfikacja w nowy dzień treningowy.
- Wdrożone: web (GH Pages) + **TestFlight build 29** (Beta App Review APPROVED).

### 2026-06-11 (cz. 3) — Rest timer na zegarku + zakończenie treningu z nadgarstka (build 30)

- Rest timer: po zaliczeniu serii zegarek odlicza odpoczynek (czas z ustawień telefonu, klucz `rest-timer-default`, fallback 90 s, payload `restSeconds`); pasek na liście ćwiczeń i w widoku serii, tap = pomiń, haptyka na koniec; nie startuje po ostatniej serii ćwiczenia. Uwaga: haptyka końca timera wymaga działającej apki (bez extended runtime session — świadomie poza zakresem).
- Zakończenie z zegarka: confirmationDialog z liczbą zaliczonych serii → event `workoutFinished` → telefon finalizuje przez `handleCompleteWorkout` (ref, bez drugiego dialogu; guard isCompleted/isExplicitSaving). Zegarek pokazuje sticky ekran „Trening zakończony"; telefon po ukończeniu wysyła `noWorkout`.
- Zweryfikowane na symulatorze (screenshoty 19-26): timer 1:28→0:57, dialog z licznikiem „Zaliczone serie: 2", cancel. Finalizacji NIE wykonano na realnym koncie admina (nie fałszujemy danych treningowych); testowe eventy serii wyczyszczone z natywnej kolejki (plutil -remove). W drafcie dnia pozostała testowa seria 45 kg×6 (wyciskanie, seria 1) z cz. 1 — do ręcznego odznaczenia.
- Wdrożone: web (GH Pages) + **TestFlight build 30** (Beta App Review APPROVED).

### 2026-06-11 (cz. 4) — 5 bugów zgłoszonych z realnego treningu (build 32)

Feedback z porannego treningu na iPhone 14 Pro. Wszystkie 5 naprawione, commit `82e3ad7`.

- **Metryki/Notatka (ExerciseCard):** szare „linki" (`text-muted-foreground/40`) wyglądały na nieaktywne i po otwarciu sekcji znikały bez możliwości zwinięcia. Teraz: przyciski z ramką i jasnym tekstem, działają jak toggle (drugi klik zwija, dane zostają), stan aktywny podświetlony primary.
- **RestTimer — kółko START:** po końcu odliczania kółko pokazywało „START!" (text-2xl, nie mieściło się) i nie było klikalne. Teraz kółko = przycisk: po końcu klik restartuje przerwę, w trakcie pauzuje/wznawia; tekst zmniejszony (text-base). Test: tap po finishu restartuje odliczanie.
- **Brak wibracji/dźwięku końca przerwy na iOS — ROOT CAUSE:** po zgaszeniu ekranu WKWebView wstrzymuje JS, więc `finishTimer` (haptic+beep) w ogóle nie odpalał się w tle. Fix: `@capacitor/local-notifications` — powiadomienie systemowe (dźwięk+wibracja) planowane na deadline+1s przy starcie/wznowieniu timera, anulowane przy pauzie/reset/zamknięciu i przy końcu w foregroundzie (wtedy gra in-app sygnał, +1s bufora eliminuje podwójny dźwięk). Nowy moduł `src/lib/rest-notification.ts`, permission lazy przy pierwszym timerze.
- **„Nie udało się zapisać szkicu lokalnie":** IndexedDB w WKWebView potrafi stracić połączenie po powrocie z tła. `saveActiveDraft`: retry (świeże połączenie) → fallback `localStorage` → błąd tylko gdy oba padną. Komunikat akcjonowalny (nie zamykaj apki, zakończ trening), banner zamykalny (X).
- **Scroll do góry po odblokowaniu telefonu:** dwa defekty starego mechanizmu: (1) klucz `workout-scroll:${sessionId}` pękał po promocji provisional→remote (sessionId się zmienia), (2) pojedynczy `scrollTo` po 250 ms clampował do 0, bo lista jeszcze się nie wyrenderowała. Teraz: klucz `workout-scroll:${uid}:${date}`, restore z retry (250/700/1500/2600 ms, czeka aż strona urośnie), dodatkowo restore na `visibilitychange→visible` gdy iOS wyzeruje scroll bez remountu (warunek: scrollY<100, zapis y>200, świeży <15 min).
- Weryfikacja: 350/350 testów, typecheck+lint czyste. Wdrożone: web (GH Pages) + **TestFlight build 32** (Beta App Review APPROVED).
- **Proces na przyszłość (Karpathy):** bugi typu „timer nie gra przy zgaszonym ekranie" i „scroll wraca na górę" wynikały z testowania wyłącznie na symulatorze/web w foregroundzie. Przy zmianach dotykających cyklu życia apki (timery, zapis, scroll) obowiązkowy scenariusz weryfikacji: zgaś ekran / zbackgrounduj apkę / wróć — na realnym urządzeniu lub z symulacją suspendu, zanim build pójdzie na TestFlight.

### 2026-06-11 (cz. 5) — Zegarek: jednostki kg/lbs + Digital Crown (w buildzie 32)

- Payload watch niesie `unit` (localStorage `unit-system`, jak UnitContext); zegarek wyświetla i steppuje w jednostce usera (krok 2,5 kg / 5 lbs), model i eventy zawsze w kg (zaokrąglenie do 2 miejsc po konwersji). Naprawia hardcoded „kg" na zegarku.
- Edytor serii: Digital Crown kręci ciężarem (`focusable` + `digitalCrownRotation`, haptyka detentów). Koronka niezweryfikowana na symulatorze (idb nie symuluje crown) — sprawdzić na realnym zegarku.
- Commit `116e831`. Build 31 (upload OK, VALID) NIE został rozdystrybuowany — w międzyczasie sesja bugfixowa wypuściła build 32 z main zawierającym te zmiany; dystrybucja 31 byłaby zbędna. Lekcja: `release-ios.sh` pollował 40×, a ASC przetwarzał dłużej; przy TIMEOUT sprawdzić `asc_api.py builds` i ewentualnie dokończyć `testflight_external.py <nr>` ręcznie.

### 2026-06-11 (cz. 6) — Zegarek: one-tap logowanie następnej serii (build 33)

- `WorkoutStore.nextSetSuggestion`: pierwsza niezaliczona seria treningu (wartości z serii albo ostatniej zaliczonej; bez sensownych wartości przycisk się nie pokazuje — zostaje edytor).
- `QuickLogButton` na liście ćwiczeń (z nazwą ćwiczenia) i w widoku ćwiczenia. Jeden tap = seria zalogowana + haptyka + rest timer. Trzy interakcje → jedna.
- Zweryfikowane na symulatorze (screenshoty 29-30): tap zalogował rozgrzewkę, timer ruszył, sugestia przeskoczyła na „Seria 2 · 6 × 50 kg" (pominęła zaliczoną serię 1).
- Testowa rozgrzewka 10×30 mogła wejść do draftu „Góra B" (live drain) — do odznaczenia razem z serią 45 kg×6 z cz. 1, jeśli draft jeszcze aktywny.
- Wdrożone: **TestFlight build 33** (Beta App Review APPROVED). Web bez zmian (iteracja czysto watchowa, bez deploya).

### 2026-06-11 (cz. 7) — Zegarek: sesja treningowa HealthKit + live tętno (build 34)

- `WorkoutSessionManager`: HKWorkoutSession (.traditionalStrengthTraining, indoor) + HKLiveWorkoutBuilder. Start gdy trening aktywny (start z zegarka / kontekst `active` z telefonu / powrót do apki), stop przy finish lub `noWorkout`. Efekt: apka żyje cały trening (haptyka rest timera przy opuszczonej ręce), trening siłowy w Apple Health (tętno, kalorie), live BPM w nagłówku listy.
- Signing: capability HEALTHKIT przez API unieważnia istniejący profil → `watch_signing.py` usuwa wszystkie profile o tej nazwie (też INVALID — blokują create konfliktem nazwy 409) i tworzy świeży. Entitlements `com.apple.developer.healthkit` + `INFOPLIST_KEY_NSHealth*UsageDescription` w add_watch_target.rb.
- NIEZWERYFIKOWANE na symulatorze: trening usera był już ukończony (zegarek poprawnie pokazał „Dziś odpoczynek"), test wymagałby sfałszowania sesji. Realna weryfikacja = pierwszy trening z zegarkiem; arkusz zgody HealthKit pojawi się raz na zegarku.
- Wdrożone: **TestFlight build 34** (Beta App Review APPROVED). Web bez zmian.

### 2026-06-11 (cz. 8) — Zegarek: komplikacja na tarczę (build 35)

- Target `StrengthWatchWidgets` (widget extension watchOS, appex w PlugIns apki zegarkowej): accessoryCircular/Corner (hantla) + accessoryInline; tap otwiera apkę. Skrypt `scripts/add_watch_widget_target.rb` (idempotentny), własny Info.plist z `NSExtensionPointIdentifier = com.apple.widgetkit-extension` (`GENERATE_INFOPLIST_FILE=NO` — kluczy NSExtension nie da się wygenerować z INFOPLIST_KEY_*).
- Signing: `watch_signing.py` zgeneralizowany (ensure_bundle_id/create_profile z parametrami) + sekcja widgets: bundle `...watchkitapp.widgets` (Z4Q5Q88AX9), profil „Strength Save Watch Widgets App Store", ExportOptions z trzema mapowaniami profili.
- Wersje appex MUSZĄ równać się wersjom apki zegarkowej (CFBundleShortVersionString/CFBundleVersion) — bump teraz dotyczy 6 wystąpień CURRENT_PROJECT_VERSION w pbxproj (App ×2, StrengthWatch ×2, Widgets ×2).
- Weryfikacja: build + appex w PlugIns + apka startuje bez crashu; dodanie komplikacji do tarczy do sprawdzenia na realnym zegarku.
- Wdrożone: **TestFlight build 35** (Beta App Review APPROVED). Po 7 iteracjach (buildy 28-30, 32-35) apka watch ma komplet: komplikacja → preview → start → one-tap serie → rest timer (sesja HK trzyma apkę żywą) → live tętno → finish → Apple Health.

### 2026-06-11 (cz. 9) — Release-prep: weryfikacja MUST/SHOULD z PLAN_RELEASE_1.0 (build 36)

Pętla /loop nad sekcją 5 planu release. Kluczowa lekcja: plan audytu był NIEAKTUALNY względem kodu — większość pozycji naprawiły wcześniejsze commity ("audit fixes 13 HIGH"). Każdą pozycję zweryfikowano względem kodu i testów zamiast ślepo "naprawiać".

- **Zweryfikowane jako zrobione wcześniej:** adminDeleteUser (paginacja + błąd auth), reguły Firestore `status=='active'` (testy rules na emulatorze: PASS, w tym deny dla pending_verification), sendEmail rzuca przy błędzie Resend, stabilne ID ćwiczeń (nextId licznik), PlanWizard dni==daysPerWeek, PWA update guard, a11y drawer (Radix Sheet), locale E2E (pl-PL, 111/111 green).
- **NAPRAWIONE — closeout cyklu (bug znaleziony wizualną weryfikacją):** NewPlan liczył statystyki na żywo z workouts (`buildActiveCyclePreview`) i pokazywał ZERA zanim workouts się załadowały, ignorując snapshot `cycle.stats` zapisany przy zamknięciu. Fix: snapshot ?? przeliczenie. Regresja przykryta asercjami 28/32 i 88% w replan.spec.ts; screenshot potwierdza dane + medal sezonu.
- **NAPRAWIONE — weekly-digest:** Resend SDK nie rzuca przy odrzuceniu (błąd w `response.error`); digest logował sukces mimo odrzucenia. Funkcja weeklyDigest wdrożona na Firebase.
- **Domena strengthsave.app w Resend: VERIFIED** (API) — kody rejestracyjne dochodzą.
- **Poza zakresem (świadomie):** otwarcie rejestracji (czeka na decyzje cenowe + RevenueCat, tydzień 1 planu), konflikt draftów multi-device (jedyny otwarty SHOULD).
- Koordynacja: kolizja numeru builda przy uploadzie (równoległa sesja watch wgrała 33-35) — przeskok na 36 z HEAD łączącym obie sesje.
- Wdrożone: web (GH Pages), functions (weeklyDigest), **TestFlight build 36** (Beta App Review APPROVED). Commity `afd1909` + `1fd26f1`. Statusy odhaczone w `docs/PLAN_RELEASE_1.0.md` sekcja 5.

### 2026-06-11 (cz. 13) — Funnel onboardingu wariant B WDROŻONY (build 38): hard paywall bez wyjścia + teaser planu

**Co i dlaczego:** realizacja decyzji z cz. 12 (`docs/PROMPT_ONBOARDING_B.md`). Flow: quiz (bez zmian logiki) → zapis planu → teaser "Twój plan jest gotowy" (zamglone ćwiczenia) → hard paywall bez strzałki wstecz (jedyna ucieczka: Wyloguj) → trial → dashboard z confetti (`/?welcome=1`). Świeży user na iOS bez PRO nie widzi już ŻADNEGO ekranu apki poza paywallem.

**Implementacja:**
- **Route guard (domknięcie dziury z cz. 12):** czysta funkcja `resolvePaywallGuard` (`src/lib/paywall-guard.ts`) + hook `useHardPaywall` (sprawdza `workouts limit(1)`; fail-open przy błędzie odczytu — apki nie zamykamy userowi z danymi, monetyzację chronią bramki akcji) + `PaywallRouteGuard` owijający całe drzewo tras w `App.tsx`. Status `enforced` → każda trasa poza `/paywall` przekierowuje na paywall; `pending` → loader (zero mignięcia dashboardem). Kolejność decyzji: PRO z dowolnego ustalonego źródła zwalnia guard bez czekania na RevenueCat.
- **Anty-"data hostage" zachowane:** user z ukończonymi treningami i wygasłym dostępem zostaje w read-only + bramki akcji + baner (bez zmian). Admin i tier `comp` omijają wszystko. Web: ZERO zmian (invite-only).
- **Teaser** jako wewnętrzny krok `/paywall` w trybie hard (decyzja wykonawcza: jedna trasa = prosty guard, zero problemów z back-stackiem): czas trwania, dni/tydzień, lista dni z ćwiczeniami pod `blur` + gradient, CTA "Odblokuj 30 dni za darmo" odsłania cennik. Po zakupie/restore w trybie hard nawigacja na `/?welcome=1` (tryb zapamiętany w ref, bo zakup gasi `enforced` przed redirectem).
- **Zapowiedź trialu:** dyskretna linijka na ekranie Welcome wizarda ("Najpierw ułożymy Twój plan. Potem 30 dni testujesz za darmo.") — prop `trialNotice` w PlanWizard, włączany tylko w onboardingu na iOS (nie replan, nie web).
- **Seam testowy E2E:** `E2EAuthState` rozszerzony o `simulateNative` / `subscription` / `hasWorkouts`; `isPaywallPlatform()` honoruje symulację tylko w `VITE_E2E_MODE` (RC nieaktywny — efekty RC sprawdzają Capacitor bezpośrednio).
- Wymogi App Review 3.1.2 na paywallu nietknięte (ceny z RC, trial, nota o odnowieniu, restore, legal).

**Weryfikacja:** typecheck + lint + **370 unit** (w tym 8 nowych `paywall-guard.test.ts`: świeży→enforced, expired z treningami→off, admin/comp→off, web→off, pending) + **116 E2E** (5 nowych `paywall-funnel.spec.ts` ze screenshotami teaser+paywall: redirect z `/`, `/plan`, `/analytics`, `/settings`; brak strzałki wstecz; link Wyloguj; expired/admin/comp/web bez redirectu). Scenariusz manualny na urządzeniu: świeże konto → quiz → teaser → paywall; sprawdzić, że back-swipe nie wychodzi z paywalla i że po starcie trialu wchodzi dashboard z confetti.

**Wdrożone:** web (GH Pages) + **TestFlight build 38** (upload OK, Beta App Review **APPROVED**, Robert dostaje build automatycznie). Test zakupu sandbox z cz. 12 nadal otwarty (propagacja produktów po stronie Apple) — ponowić na buildzie 38.

### 2026-06-11 (cz. 12) — Test usera na buildzie 37: decyzja o przebudowie funnelu (wariant B)

**Problem z realnego testu usera:** (1) z paywalla po onboardingu można wyjść strzałką wstecz i przeglądać całą apkę (gating łapie tylko akcje: start treningu, nowy plan), co dla świeżego usera wygląda jak działająca darmowa apka; (2) brak zapowiedzi płatności na początku onboardingu = wrażenie bait-and-switch; (3) paywall to suchy cennik, nie wykorzystuje momentu "właśnie ułożyliśmy Ci plan".

**Rozważone warianty:** A) domknięcie obecnego flow (paywall bez wyjścia), B) pełna przebudowa funnelu wzorem Fitbod (quiz → teaser zamglonego planu → hard paywall → trial → reveal), C) kompromis (A + narracja "plan gotowy"). **Decyzja usera: B.** Zadanie przekazane do osobnej sesji: prompt w `docs/PROMPT_ONBOARDING_B.md` (krótki /goal + pełny kontekst; /goal ma limit 4000 znaków). Zasada zachowana: read-only + eksport dla wygasłych userów Z DANYMI zostaje; hard gate dotyczy tylko świeżych kont bez treningów.

**Test zakupu sandbox:** wstrzymany — StoreKit nie zwracał produktów (stan MISSING_METADATA; po wgraniu screenshotów recenzji oba produkty READY_TO_SUBMIT od ~16:00; pozostała propagacja po stronie Apple, godziny). Ponowić na buildzie 37.

### 2026-06-11 (cz. 11) — Tydzień 1 monetyzacji WDROŻONY (build 37) + podwyżka cen US

**Kod monetyzacji (commity ed9318b, f432437, rejestracja, build 37 TestFlight APPROVED):**
- RevenueCat SDK (configure na starcie, logIn/logOut = uid Firebase), model `subscription` na profilu + `useSubscription` (admin → Firestore comp/webhook → RC CustomerInfo), webhook `revenuecatWebhook` WDROŻONY (sekret REVENUECAT_WEBHOOK_AUTH; chroni tier comp; grace period przy billing_issue).
- Paywall `/paywall`: ceny z RC Offerings, triale 14/30 dni, nota o auto-odnowieniu (3.1.2), restore, linki legal per język. Gating tylko iOS: start treningu, kreator planu, koniec onboardingu → paywall; historia/eksport/konto wolne; baner PRO na Dashboardzie. Web bez paywalla.
- Rejestracja: mobile otwarta (platform w syncUserProfile), web invite-only (isInviteUsable przed utworzeniem profilu). Login na native bez waitlisty/invite. Funkcje wdrożone.
- Testy: 361 app + 63 functions + 10 E2E. Build SPM padł raz na fetchu RevenueCat → fix: `xcodebuild -resolvePackageDependencies -scmProvider system`.

**Podwyżka cen US PRZED startem (zero subskrybentów):** $2.99→**$4.99** (monthly), $19.99→**$29.99** (yearly). Powód: USA jest kotwicą equalizacji — zaniżone US ceny zaniżały 173 pozostałe terytoria; odwrócona siła nabywcza vs PL. Polska BEZ ZMIAN (14,99/99,99 zł, jawna decyzja). Re-equalizacja: DEU €5.99/€34.99, GBR £4.99/£29.99, JPN ¥800/¥5000. Zmiana przez `scripts/asc_subscriptions.py prices`; przejściowe 500 przy hurtowych POST-ach to re-POST-y już zastosowanych zmian (zweryfikowano per terytorium). Stan: oba produkty 175 cen + 175 intro offers, POL nietknięta. Uwaga na przyszłość: weryfikuj ceny po `customerPrice`, nie po ID price pointu (Apple ma wiele pointów o tej samej cenie klienta).

**Hardening do tygodnia 2 (finding security review):** pole `platform` w syncUserProfile jest deklaracją klienta (spoofowalne) — techniczny user może założyć webowe konto bez invite. Ryzyko zaakceptowane na teraz (ochrona przychodu = paywall iOS); właściwy fix: **Firebase App Check** (App Attest) przed publicznym launchem.

**Zostało (user):** RC dashboard: entitlement `pro` + offering default (2 pakiety) + webhook (URL + Authorization). Potem test sandbox na urządzeniu.

### 2026-06-11 (cz. 10) — Monetyzacja: decyzje cenowe + formalności ASC ZALICZONE (Paid Apps ACTIVE)

**Decyzje usera (wiążące dla 1.0):**
- Cennik: **14,99 zł/mies** ($2.99 US) + **99,99 zł/rok** ($19.99 US). BEZ lifetime.
- Triale asymetryczne: miesięczny 14 dni free, roczny 30 dni free (intro offers per produkt; raz na konto Apple per grupa).
- Apka mobilna BEZ kodów invite: zaloguj/zarejestruj na jednym ekranie (email verification zostaje). Web pozostaje invite-only.
- Płatności: RevenueCat (wariant A) zamiast własnego StoreKit.
- Otwarte: zachowanie po końcu trialu (rekomendacja: read-only historia + eksport, blokada nowych treningów).

**Formalności App Store Connect (przeprowadzone z userem krok po kroku, wszystko jednego dnia, finał: Paid Apps ACTIVE):**
- Zaktualizowana ADP License Agreement zaakceptowana → odblokowała resztę.
- Legal Entity uzupełnione; DSA trader: YES, dane publiczne (adres CEIDG, contact@strengthsave.app), dokument tożsamości i adresu: **PDF z VIES** (rejestr VAT UE, po angielsku — sposób na wymóg "English (US)"; NIP 6852331914 zwraca imię+adres). Status: In Review (nie blokuje IAP).
- Paid Apps Agreement: **ACTIVE**. Bank mBank PLN: **ACTIVE** (routing = cyfry 3-10 NRB, SWIFT BREXPLPWMBK). Tax: W-8BEN **ACTIVE** (Foreign TIN=NIP, treaty Poland art. 8 business profits 0%) + Certificate of Foreign Status **ACTIVE** (Individual/Sole proprietor, Title: Owner).
- SBP (15% prowizji): formularz do dokończenia (associated accounts: 4×No; rola Marketing u klienta się nie liczy).
- Dokumenty prawne privacy+terms PL/EN w `landing/legal/` (commit 36f37ed), do publikacji na strengthsave.app.

**Następne:** produkty subskrypcji przez ASC API (agent), RevenueCat (user: konto + In-App Purchase Key), kod: login bez invite + paywall + entitlement gating.

### 2026-06-08 (cz. 6) — Przełącznik jednostek kg ↔ lbs działa w CAŁEJ aplikacji

Cel: przełącznik kg/lbs (Profil) zmienia KAŻDĄ wagę w apce (wyświetlanie, pola wpisywania, wykresy, tonaż, rekordy, podpowiedzi, pomiary, share, onboarding). Wcześniej działał tylko w 4 plikach. **NIE wdrożone** (commit/push/deploy odłożone na życzenie usera — zmiany w working tree).

**Zasada (bez zmiany modelu danych):** kg KANONICZNE w Firestore, konwersja wyłącznie na warstwie UI. Wyświetlanie przez `fmt(kg)`/`toDisplay(kg)`, wpisywanie przez `fromInput(value)` (→ kg przy zapisie), tonaż przez `fmtTonnage(kg)`. Zero twardego "kg" w kontekstach wagi.

**Infrastruktura rozszerzona:** `units.ts` +`formatTonnage` (kg→"12.3 t" / lbs→"27.1 k lbs", tysiące funtów) +`weightUnitLabel`. `UnitContext` +`fmtTonnage`. Nowy `src/test/units.test.ts` (14 testów: round-trip kgToLbs/lbsToKg, formatWeight, formatTonnage, fromInput/toDisplay, brak zaokrąglenia kg przy zapisie).

**Naprawione (~17 plików):**
- **Wpisywanie:** `ExerciseCard` (serie — bez ruszania `setData`/`onSetsChange`, tylko konwersja), `MeasurementsForm` (waga ciała: pre-fill `toDisplay`, zapis `fromInput`; obwody w cm NIE ruszane).
- **Strony:** `Dashboard` (kafelek tonażu `fmtTonnage`, trend +suffix konwertowany, waga ciała, PR), `Analytics` (3 komponenty: schowek, kafelki, wykresy tonaż/waga/per-ćwiczenie z konwersją danych PRZED Recharts + oś/tooltip, weekly summaries), `Achievements` (kafelki, life-PR +delta, wykres trendu 6 mies., milestones, lista rekordów+1RM, dialog historii), `WorkoutHistory`, `Cycles`, `CycleDetail`, `Measurements`, `NewPlan`, `WorkoutDay` (badge tonażu per-ćwiczenie, prompt AI coach, dane share).
- **Komponenty:** `RzaMetricsCard`, `ExerciseProgressionDialog` (wykres+statystyki; bodyweight=powtórzenia bez konwersji przez helper `dispVal`), `ShareWorkoutDialog`+`share-utils` (obrazek share: `generateWorkoutImage` +param `unit`, tonaż przez `formatTonnage`), `PlanWizard` (onboarding "kg/mies" → jednostka usera).
- **Liby z podpowiedziami:** `next-set-advice` (`getNextSetAdvice` +param `unit`, formatowanie wag w `reason`) i `exercise-utils` (`getProgressionAdvice` +param `unit`). Oba `unit: UnitSystem = 'kg'` (default = output identyczny jak wcześniej → 287 testów bez zmian; testy asertujące `'↑ +2.5kg'` i `reason` nietknięte).
- **i18n:** 24 klucze (12 PL + 12 EN) sparametryzowane `{unit}` zamiast twardego "kg": nsadvice.*, progress.increaseWeight, cycles.kgTonnage/kgPerWorkout/est1RM, achievements.totalTonnageSub/ms.tonnage, comp.progression.maxKg, analytics.copy.tonnage/weight, measurements.field.weight, ob.precision.kgMonth.

**Pułapki rozwiązane:** tonaż w lbs (duże liczby) → `formatTonnage` ("t"/"k lbs") zamiast surowego fmt. Progi/milestones: logika `achieved` zostaje na kg, konwertowany TYLKO label. Brak podwójnej konwersji. Nie zaokrąglamy kg przy zapisie (100 lbs = 45.359 kg, zaokrąglenie tylko przy wyświetlaniu).

**Weryfikacja:** `tsc` OK, `eslint` czysty na zmienionych plikach (pozostałe 2 błędy pre-existing: `build/` artefakt iOS + `functions/src/registration.ts`), 287/287 testów, `build:mobile` OK. Playwright (tymczasowy spec, usunięty): `unit-system='lbs'` → nagłówek WorkoutDay "lbs"/zero "kg", label Measurements "Weight (lbs)", Dashboard renderuje bez crashu.

**Świadomie POZA zakresem:** proza generowana przez AI w cotygodniowym podsumowaniu (`generateWeeklySummary` Cloud Function, server-side) nadal cytuje kg — pełna konwersja wymaga zmiany backendu + przekazania `unit` + deploy funkcji. Kafelki liczbowe tego podsumowania (tonaż, PR) JUŻ konwertowane. Strava (km/pace) = dystans, poza zakresem przełącznika wagi. `generateWorkoutSummary` (ai-coach) — nieużywany w UI, pominięty.

---

### 2026-06-08 (cz. 5) — Zgoda na push + poranne przypomnienie o treningu (build 14)

- **Zgoda (Settings → Powiadomienia, `NotificationSettings.tsx`):** przycisk "Włącz powiadomienia" (świadoma akcja → systemowy prompt iOS + rejestracja tokenu) + status + toggle porannego przypomnienia (`notificationPrefs.dailyReminder`). `push-notifications.ts` rozdzielony: `registerPushForUser` (przy starcie, BEZ promptu — tylko gdy zgoda już jest) vs `requestPushPermission` (z Ustawień, prompt).
- **Cron `dailyTrainingReminder` (functions/daily-reminder.ts, deployed):** `onSchedule every day 07:00 Europe/Warsaw`. Push TYLKO w dni gdy user ma dziś zaplanowany dzień treningowy (czyta training_plans/{uid}.days, dopasowanie po weekday; dni wolne pomija). Spersonalizowane: imię + focus dnia. Respektuje dailyReminder + dostęp + token. i18n settings.notif.* (PL/EN). 267 testów. Build 14 VALID+podpięty.
- APNs key skonfigurowany przez usera w tej sesji (Apple Developer → Keys → upload do Firebase Cloud Messaging) — push iOS gotowy do testu.

---

### 2026-06-08 (cz. 4) — Panel admina Faza 1-3 + powiadomienia push (build 13)

Cel: rozbudowa panelu admina (wgląd, kontrola per user, broadcast, flagi) + push do userów/grup. Admin tylko `g.jasionowicz@gmail.com`, BEZ ról (nikt nie nadaje sobie admina).

**Backend (registration.ts + index.ts, deployed):** `adminGetUserLogs` (notification_logs + auth_audit per uid, bez composite indexu), `adminSendUserEmail`, `adminResendVerification`, `adminBroadcastEmail` (all/cohort), `adminSendPush` (FCM sendEachForMulticast, tokeny z users.fcmTokens), `adminDeleteUser` (Auth + Firestore, blokada usunięcia siebie). `updateUserAccess` +reason (zawieszenie → audyt). **AI gate per user**: `assertAiEnabled` w proxyOpenAI/streamOpenAI (features.ai!==false, admin zawsze, domyślnie ON). firestore.rules: `config/feature_flags` (auth read, admin write).

**Frontend (AdminDashboard + 3 karty modularne):** Puls aplikacji (10 metryk, getCountFromServer dla treningów+cykli). Lista userów: szukaj + filtry (aktywni/zawieszeni/bez dostępu/niezweryf.) + sort. Karta usera: logi per-user (Maile/Logowania), koszt AI per user, AI on/off + Strava per user, zawieś z powodem, akcje (mail, kod, reset onboardingu, cohorty, usuń 2x). AdminCommsCard (broadcast mail + push do all/cohort), AdminFeatureFlagsCard (config/feature_flags).

**Push (FCM):** `@capacitor-firebase/messaging`, `lib/push-notifications.ts` (registerPushForUser/listenPushTokenRefresh → users.fcmTokens), `PushRegistrar` w App (native). iOS: aps-environment=production w App.entitlements, capability PUSH_NOTIFICATIONS na App ID (ASC API), profil regen z push (UUID c85f25b1). Build 13 VALID+podpięty.

⚠️ **DOSTARCZANIE PUSH NA iOS WYMAGA KROKU ZEWNĘTRZNEGO:** klucz APNs (.p8) w Apple Developer (Certificates → Keys → Apple Push Notifications service) → upload do Firebase Console → Project Settings → Cloud Messaging → Apple app configuration → APNs Authentication Key. Bez tego iOS nie wygeneruje tokenu FCM ani nie dostarczy push. Backend/klient/UI gotowe.

**Decyzje:** wgląd głównie client-side (reguły admina pozwalają na users/workouts/cycles/ai_usage; logi notification_logs/auth wymagają funkcji bo rules=false). Bez systemu ról. AI domyślnie ON (toggle zapisuje features.ai). 246 testów, tsc/eslint czyste.

---

### 2026-06-08 (cz. 3) — Fixy onboardingu (build 11) + nawigacja (build 12)
Backlog 1-5 onboardingu (404 redirect, walidacja PlanBuilder, banner grace/kickoff, frekwencja rekomendacji, PL nazwy planów, wyszukiwarka bez-diakrytyczna, spójność nagłówków, confetti) + dolny pasek (pigułka pod ikoną) + boczne menu (sekcje GŁÓWNE/POSTĘPY/KONTO). Patrz commity a987c55..1039e42.

---

### 2026-06-08 (cz. 2) — DOKOŃCZENIE: email działa + Apple Sign-In live (build 10) + branding Google + email-gate UX

Z tokenami usera (Cloudflare + pełny klucz Resend, użyte tylko w pamięci sesji) dokończono blokady zewnętrzne z cz. 1:

- **Email z strengthsave.app — DZIAŁA.** Domena dodana w Resend (id 75a2bd1b), 3 rekordy DNS wpisane do Cloudflare przez API (DKIM TXT, SPF MX, SPF TXT) + DMARC (`v=DMARC1; p=none; rua=mailto:grzegorzee@gmail.com`). Domena **verified**. Klucz funkcji (re_Matw, send-only) jest w tym samym koncie → probe wysyłki zwrócił `id`, mail dotarł. `firebase deploy --only functions` wykonany — 24 funkcje live z `from: noreply@strengthsave.app`. Kody rejestracji dochodzą do każdego.
- **Apple Sign-In — LIVE w TestFlight (build 10).** Capability `APPLE_ID_AUTH` włączona na App ID przez ASC API (`scripts/_enable_apple_signin.py`, settings `APPLE_ID_AUTH_APP_CONSENT/PRIMARY_APP_CONSENT`). Provider Apple włączony w Firebase Console (user). Stary profil usunięty + nowy `Strength Save App Store` z capability (UUID 50cc6fd9, `scripts/_regen_apple_profile.py`, reuse cert F52LLKV85G). `CODE_SIGN_ENTITLEMENTS=App/App.entitlements` wpięty do pbxproj (Debug+Release), build 9→10. Pipeline TestFlight: ARCHIVE+EXPORT+UPLOAD SUCCEEDED, build 10 VALID, podpięty do grupy "Wewnętrzni". Do testu na urządzeniu: TestFlight → update build 10 → "Zaloguj przez Apple".
- **Branding logowania Google** (user w konsolach): OAuth consent screen App name "Strength Save" + logo + authorized domain strengthsave.app; authorized domain dodany w Firebase Auth. Fix "logowania do randomowego projektu".
- **Email-gate UX** (build 10): przyciski "Otwórz [provider]" (detekcja domeny maila, `lib/inbox-links.ts`) pod polem kodu + cooldown 60s na ponowne wysłanie kodu.

Build 10 zawiera CAŁOŚĆ sesji (nav, Achievements, Historia, Apple Sign-In, email-gate). 237 testów, tsc/eslint czyste.

---

### 2026-06-08 — Backlog 1-5 (nawigacja, Achievements, Historia, email, Apple Sign-In)

**Kontekst:** realizacja celu "zrobić 1-5 z backlogu + maile z domeny strengthsave.app".

1. **Nawigacja wstecz (spójna).** Decyzja: jeden wzorzec — `AppHeader` dostaje `onBack` dla tras NIE-root; trasy root (bottom nav: `/`, `/plan`, `/history`, `/exercises`, `/profile`) bez strzałki. `Layout.handleBack` = `navigate(-1)` z fallbackiem na `/` gdy brak historii (deep link, `window.history.state.idx`). Usunięto zdublowane in-content back-arrows (Settings, PlanEditor, AdminDashboard, UserPlanEditor, WorkoutHistory) — dublowały tytuł z AppHeader. Focused flow (Workout/Exercise) i fullscreen (NewPlan) zostają z własnym back.

2. **Achievements premium.** Nowy `lib/achievements-utils.ts` (testowalne; 10 testów): `getExercise1RMProgress` (rekord + delta vs poprzedni najlepszy), `getMonthlyTonnage` (6 mies., `refDate` param — sandbox blokuje `new Date()` w testach), `detectPlateaus` (rekord starszy niż ostatnie 3 z min. 4 sesji), `computeMilestones` (progi workouts/tonnage/records). UI: karty top-3 życiowych 1RM z przyrostem, wykres tonażu 6 mies. (Recharts), siatka odznak achieved/locked, karta zastoju z CTA do progresji. Usunięto zdublowaną kartę "Tonaż" (zastąpiona trendem). **Wilks ODŁOŻONY** — brak pola płci + niejednoznaczne mapowanie big-3 (High/Low Bar, Hack Squat); ryzyko mylących liczb sprzeczne z tylko_fakty.

3. **Historia premium.** Filtry statusu i dnia planu jako chipy (Kinetic: aktywny `fitness-cyan`, nieaktywny `surface-highest`) zamiast Select. Grupowanie sesji po miesiącach z nagłówkiem (miesiąc rok + liczba sesji + tonaż). Search + zakres dat zostają.

4. **Email z domeny strengthsave.app (KOD).** `from: Strength Save <noreply@strengthsave.app>` w `registration.ts` + `weekly-digest.ts` (było `onboarding@resend.dev`). ⚠️ **NIE deployować funkcji** zanim domena nie jest zweryfikowana w Resend (DNS SPF/DKIM) — inaczej kody rejestracji przestaną dochodzić. Klucz Resend (sekret Firebase) jest send-only → dodanie/weryfikacja domeny to krok w dashboardzie Resend + DNS u rejestratora.

5. **Apple Sign-In (KOD).** Google Sign-In był już zrobiony. Apple wymagany przez App Store skoro jest Google. Dodano `appleProvider` (firebase.ts), `useAuth.signInWithApple` (mirror Google, `skipNativeAuth:true` globalnie → `rawNonce` z plugina), przycisk iOS w Login (logo Apple SVG, czarny per HIG), `capacitor.config` providers +`apple.com`, `ios/App/App/App.entitlements` (gotowy, NIE wpięty do pbxproj). **Decyzja: nie wpinać entitlementu do pbxproj teraz** — bez capability w profilu provisioning zepsułoby pipeline TestFlight (signing mismatch). Aktywacja = kroki zewnętrzne (portal Apple → profil/pbxproj → Firebase provider Apple → test → nowy build).

**Weryfikacja:** tsc clean, eslint clean, 232 testy (222+10), `build:mobile` OK, screenshoty Playwright (nav, achievements, history, login). Commity per zadanie.

**Stan zadania 5 (Android/App Store):** kod gotowy. Android projekt OK (google-services.json, applicationId, versionCode 1) — brak release keystore (sekret) + Play Console. App Store release = submission/review. Wszystko poza CLI (kroki zewnętrzne).

---

### v0.0.1 build 1-9 (2026-06-06 → 2026-06-08) — TestFlight + redesign całej apki + naprawa cykli

**Publikacja iOS (TestFlight, w pełni przez API/CLI, bez Xcode GUI ani fastlane):**
- App ID, certyfikat Distribution, profil App Store utworzone przez App Store Connect API (`scripts/asc_api.py`, `scripts/ios_signing.py`). Pipeline `scripts/ios-testflight.sh` (build:mobile → cap sync → archive UNSIGNED → export manual → altool upload). Klucz API (Admin) w `_secrets/oauth/AuthKey_UD43687FB9.p8` + `appstore-connect.env`.
- Pułapki: (1) automatic cloud signing wymaga roli Admin klucza → obejście: ręczny cert+profil przez API + manual signing; (2) p12 z openssl 3 → `MAC verification failed` → `openssl pkcs12 -export -legacy`; (3) archive z automatic signing chce Development profil (wymaga device) → `CODE_SIGNING_ALLOWED=NO`, podpis przy eksporcie; (4) rekord apki — Apple BLOKUJE create przez API (`403 apps does not allow CREATE`), jedyny krok GUI; (5) `build/` w .gitignore (prywatny klucz dist). Internal testing: grupa "Wewnętrzni" + tester przez API. Wersja 0.0.1 (start, nie 1.0).
- Firebase Storage zainicjalizowany + `storage.rules` (avatars/{uid}: write tylko właściciel, obrazy <5MB) wdrożone.

**Naprawy UX treningu/podsumowania:**
- Pre-fill wagi bierze OSTATNIĄ wagę bez auto-progresji (+1/+2.5) — była regresja 14→15; sugestia podbicia w badge CEL. Sygnatura `createPrefilledSets` uproszczona.
- Czas trwania treningu: `WorkoutSession.durationSec` + `startedAt`/`completedAt` (backup, liczone w `syncDraftToFirebase` final przez `batchSaveWorkout`). Stare treningi pokażą "—".
- Scroll-restore po wygaszeniu (iOS WKWebView reload w tle) — `window.scrollY` do localStorage przy hidden/pagehide, restore po remount (TTL 15 min).
- RestTimer: `@capacitor/haptics` (navigator.vibrate martwy na iOS) + bez `animate-pulse`. Checkbox serii: obrys gdy niezaznaczony. Autosave badge chowany (tylko błąd). Usunięty zdublowany górny stoper.

**Naprawa cykli (lifecycle):**
- PR-y w `computeCycleStats` = RZECZYWISTE rekordy (`detectNewPRs` vs historia sprzed cyklu), nie top-10 → koniec "10 i 10".
- `buildCycleRecommendation.canCloseout` — przycisk "Domknij cykl" tylko gdy wygasł (`isExpired` z planowanego końca startDate+durationWeeks, NIE endDate=dziś z preview).
- Helper `lib/cycle-actions.ts startCycleWithPlan` — "Powtórz plan" (Cykle+Dashboard, wagi z historii), "Zmień plan", auto-przedłużenie (>7 dni bez decyzji → auto nowy cykl + toast).

**Design — Kinetic Precision w CAŁEJ apce (23 pliki):** indigo/blue/violet → lime/cyan; emerald → fitness-success; amber → fitness-warning/lime; sky → cyan; semantyczne badge → tokeny; hex+white-opacity → surface/muted. Karta podsumowania premium (badge kg stały kształt). Avatar object-cover. Italic na nagłówkach sekcji. Nawigacja: Dashboard/Plan/Historia/Ćwiczenia/Profil. Celowo zostają: Strava (brand+wykresy), flame rozgrzewki, koszty admina, toast.

**ODŁOŻONE:** Email weryfikacyjny (Resend) — `from: onboarding@resend.dev` (sandbox) dociera tylko na adres właściciela konta Resend. Naprawa: zweryfikować domenę apki w Resend + zmienić `from` w `functions/src/registration.ts:195` + `weekly-digest.ts:222` + `firebase deploy --only functions`.

### v6.11.4 (2026-05-30) — Final sync bez utraty treningu

**Decyzja:** Finalny zapis treningu jest teraz potwierdzany odczytem z serwera przed
usunięciem lokalnego draftu. IndexedDB pozostaje źródłem bezpieczeństwa do momentu, gdy
Firestore zwróci `completed=true` oraz te same ćwiczenia, serie i ciężary.

| Zmiana | Szczegóły | Status |
|--------|-----------|--------|
| Walidacja final sync | `batchSaveWorkout` nie wystarcza jako dowód. Po finalnym zapisie `WorkoutDay` i `SyncCenter` robią read-back z serwera i walidują payload przez `workout-final-sync.ts` | ✅ |
| Brak kasowania draftu przy częściowym zapisie | Jeśli chmura nie potwierdzi kompletnego treningu, draft zostaje lokalnie, wraca do kolejki i pokazuje status final sync pending | ✅ |
| Eksport awaryjny | Sync Center ma przycisk eksportu lokalnego draftu do JSON | ✅ |
| Widoczna wersja PWA | Podbicie do `v6.11.4` pozwala sprawdzić, że użytkownik działa na nowym buildzie | ✅ |


### v6.11.0 (2026-05-29) — Coach następnej serii (1. funkcja AI dająca wartość)

**Decyzja:** Pierwszy z 3 pomysłów AI. Rdzeń deterministyczny (darmowy), AI tylko on-demand
(zero kosztu w tle — lekcja z usunięcia AI z planów). Odpowiada na pytanie „ile dziś nałożyć".

| Element | Szczegóły | Status |
|---------|-----------|--------|
| `src/lib/next-set-advice.ts` | `getNextSetAdvice` — konkretny cel (ciężar×powt.) z TRENDU całej historii (`getExerciseHistory` + `detectPlateau`), nie tylko ostatniego treningu. Kind: progress / hold / deload | ✅ |
| Deload przy plateau | Zastój ≥4 sesje → sugestia -10% ciężaru zamiast forsowania | ✅ |
| `ExerciseCard` badge "🎯 Cel: X kg × Y" | Zastępuje ogólne "↑ +2.5kg" gdy jest historia; fallback do starego badge dla 1 treningu. Plus jednozdaniowe uzasadnienie | ✅ |
| Przycisk "Coach AI" (on-demand) | `callOpenAI` z kontekstem (5 ostatnich sesji, sugestia, notatki) → 1-2 zdania porady w toaście. Koszt tylko po kliknięciu, limit $5 pilnuje `proxyOpenAI` | ✅ |

**Jakość:** typecheck ✓, lint ✓, vitest 209/209 ✓ (7 nowych), playwright 99/99 ✓, build ✓.

**Pozostałe 2 pomysły AI (backlog):** asystent doboru ćwiczeń w kreatorze planu; wykrywanie plateau + deload na poziomie całego planu (proaktywny sygnał na Dashboard).


### v6.10.0 (2026-05-29) — Koniec AI w tworzeniu planów + własny builder

**Decyzja:** Usunięto generowanie planów przez AI (nieprzewidywalne, kosztowne, zależne od
OpenAI). Tworzenie planu = gotowe szablony (`planTemplates`) albo ręczny kreator od zera.
AI zostaje tam, gdzie analizuje realne dane (Coach, Chat, podsumowania) — nie zgaduje planu.

| Zmiana | Szczegóły | Status |
|--------|-----------|--------|
| Usunięto AI z `NewPlan` | Tryb 'ai' (quiz + `generateTrainingPlan`) wycięty. Toggle: Gotowe plany / Własny plan | ✅ |
| Usunięto AI z `Onboarding` | 5-krokowy quiz + AI generate → wybór gotowego szablonu | ✅ |
| Nowy `src/components/PlanBuilder.tsx` | Ręczny kreator: dni (weekday+focus), ćwiczenia z biblioteki, serie, czas trwania. Walidacja: dzień = focus + min 1 ćwiczenie | ✅ |
| `fromCycle` bez AI | Kreator prefilluje dni skopiowane ze starego cyklu (zamiast AI-regeneracji) | ✅ |
| Usunięto `src/lib/ai-onboarding.ts` | Osierocony po wycięciu AI (Karpathy: czyść własny bałagan). `ai-coach.ts` zostaje (Coach/Chat) | ✅ |

**Jakość:** typecheck ✓, lint ✓, vitest 202/202 ✓, playwright 99/99 ✓ (1 test E2E zaktualizowany pod nowy onboarding), build ✓.

**Backlog AI (do realizacji osobno, używa realnych danych):** progresja per ćwiczenie,
wykrywanie plateau/deload, asystent doboru ćwiczeń w kreatorze, analiza dysbalansu objętości,
predykcja celów, normalizacja nazw ćwiczeń, analiza ryzyka przeciążenia (TRIMP).


### v6.9.4 (2026-05-29) — Naprawa historii po zmianie planu + snapshot (prewencja)

**Problem:** Po odpaleniu nowego planu (FBW → push/pull, start 1 czerwca) historyczne
treningi przestały się poprawnie wyświetlać: ukończony trening pokazywał pustą strukturę
nowego planu, znikały nazwy ćwiczeń, rekordy, osiągnięcia; plan startujący w przyszłości
pokazywał 8% i przyszły tydzień; cykle miały ujemne wartości. Dane w Firestore były
bezpieczne — to był bug warstwy odczytu (kod resolwował historię przez aktualny plan,
a `dayId`/`exerciseId` są niestabilne między planami).

| Decyzja | Kontekst | Status |
|---------|----------|--------|
| Wspólny resolver nazw `src/lib/exercise-name-resolver.ts` | Priorytet: snapshot w treningu → zarchiwizowany cykl → aktualny plan → defaultPlan → id. Reużyty w WorkoutDay, WorkoutHistory, Achievements, Analytics, cycle-insights | ✅ |
| `WorkoutDay` renderuje historię z ZAPISANEGO treningu, nie z planu | Snapshot dnia odbudowany z `workoutForDate.exercises`, gdy oglądamy ukończony/przeszły trening | ✅ |
| Snapshot w modelu: `ExerciseProgress.name`, `WorkoutSession.dayName/dayFocus` | Opcjonalne, wstecznie zgodne. Zapisywane od teraz przy każdym treningu → odporność na przyszłe zmiany planu | ✅ |
| `currentWeek=0` i guard `computeCycleStats` dla planu startującego w przyszłości | Eliminuje fałszywe 8% i NaN; plan tygodnia pokazuje pierwszy tydzień planu | ✅ |
| `buildCycleComparison` zwraca null dla świeżego cyklu (0 treningów) | Koniec mylących ujemnych delt (np. -50000 kg) | ✅ |
| Przycisk „Napraw dane historyczne" (Ustawienia) + `backfillHistoricalWorkouts` | Jednorazowe dotagowanie cycleId + snapshot nazw ze zarchiwizowanych cykli; idempotentne, ręczne (po eksporcie backupu) | ✅ |
| Auto-dotagowanie przy zmianie planu (`NewPlan.handleApprove`) | Po archiwizacji starego planu untagged treningi dostają cycleId — zapobiega powtórce problemu | ✅ |

**Jakość:** typecheck ✓, lint ✓, vitest 202/202 ✓, playwright 99/99 ✓, build ✓.
**Globalnie wdrożone:** zasady Karpathy (`~/.claude/karpathy-guidelines.md`) jako pierwszy krok każdego developmentu.


### v6.8.0 (2026-04-03)

| Data | Decyzja | Kontekst | Status |
|------|---------|----------|--------|
| 2026-04-03 | **IndexedDB jako source of truth dla aktywnego treningu** — local-first draft + periodic/background sync | `React state + localStorage` nie wystarczał przy ubijaniu karty / przejściu telefonu w tło. Draft treningu ma być trwały lokalnie, a Firebase tylko warstwą checkpoint/final sync. | AKTYWNA |
| 2026-04-03 | **Offline-first start treningu** — provisional session bez wymaganego dokumentu w Firebase | Użytkownik ma móc zacząć trening bez internetu. Zdalna sesja jest tworzona dopiero po odzyskaniu połączenia i promocji lokalnej sesji. | AKTYWNA |
| 2026-04-03 | **Sync Center** — jawny stan kolejek syncu, retry i discard lokalnych sesji | Warstwa synchronizacji przestała być ukryta. Użytkownik i admin muszą widzieć, co jest tylko lokalne, co czeka na sync i co się nie udało. | AKTYWNA |
| 2026-04-03 | **CycleId jako źródło prawdy dla nowych treningów** — dual-read dla starych danych | Statystyki cyklu nie mogą opierać się tylko na zakresie dat. Nowe sesje są przypinane do `cycleId`, stare dane dalej działają przez fallback. | AKTYWNA |
| 2026-04-03 | **Access control po stronie backendu** — `access.enabled` i `status` egzekwowane w rules/functions | Sam client-side guard był za słaby. Dostęp użytkownika do danych i callable functions ma być blokowany też po backendzie. | AKTYWNA |
| 2026-04-03 | **Auth model: Google + email/password + kod mailowy** | Rejestracja ma być dostępna dla zwykłego usera bez admin handoff. Email verification jest obsłużony przez Functions + Resend, nie przez passwordless email-link. | AKTYWNA |
| 2026-04-03 | **Invite i waitlista jako warstwa operacyjna, nie bramka wejścia** | User po weryfikacji dostaje dostęp od razu. Invite i waitlista służą do cohort, onboarding contextu, flag i operacji admina, a nie do blokowania podstawowego wejścia. | AKTYWNA |
| 2026-04-03 | **Role tylko `admin` + `user`** — reszta przez statusy, cohorty i feature flags | Nie dokładamy nowych ról typu coach/staff. Produktowo wystarczą role bazowe plus metadata konta. | AKTYWNA |
| 2026-04-03 | **Osobne strony `/#/login` i `/#/register`** + redirect zalogowanego usera z auth routes | Rozdzielenie intencji upraszcza UX. Po zalogowaniu user nie może zostać na ekranie auth i ma być przeniesiony na dashboard lub onboarding. | AKTYWNA |
| 2026-04-03 | **Admin auth ops** — invite, waitlista, audit auth, suspend/restore, access toggle | Panel admina ma obsługiwać nie tylko plan i feature flags, ale też pełny lifecycle wejścia użytkownika do aplikacji. | AKTYWNA |
| 2026-04-03 | **Playwright jako realny gate dla flow auth i offline** — 83 scenariusze | Krytyczne scenariusze productowe muszą być testowane E2E, nie tylko smoke. Dotyczy to auth, offline startu, Sync Center i admin operations. | AKTYWNA |

### v6.7.0 (2026-04-02)

| Data | Decyzja | Kontekst | Status |
|------|---------|----------|--------|
| 2026-04-02 | **Bodyweight exercises** — `isBodyweight` flag w exerciseLibrary, ukrycie pola kg w ExerciseCard, PR na reps | Dead Bug, Plank, Reverse Crunch itd. nie mają obciążenia. Pole kg było wymagane i bezużyteczne. Teraz grid 3-kolumnowy, progresja "+powt.", `getExerciseBestReps()`. | AKTYWNA |
| 2026-04-02 | **Batch save** — localStorage draft + Firestore writeBatch zamiast debounced autosave | Każda zmiana reps/weight powodowała zapis do Firebase (debounce 500ms). Teraz dane zapisywane TYLKO przy "Zakończ trening". `workout-draft.ts` jako backup. Draft recovery po crash/reload. `beforeunload` warning. | AKTYWNA |
| 2026-04-02 | **Dashboard "Rozpocznij trening"** — karta z 3 stanami na górze Dashboard | Użytkownik musiał nawigować do Plan dnia lub Plan treningowy żeby zacząć. Teraz: training day → przycisk start, completed → "Ukończony!", rest day → "Dzisiaj wolne" + info o następnym. | AKTYWNA |
| 2026-04-02 | **Nawigacja 8→6 zakładek** — usunięto "Plan dnia" i "AI Coach" z sidebar | Plan dnia zbędny z Dashboard start button. AI Coach nieużywany. Trasy dostępne przez URL. | AKTYWNA |
| 2026-04-02 | **Analytics per-exercise** — grid osobnych wykresów zamiast jednego overlapping | 30kg ćwiczenie obok 150kg na wspólnej osi Y = nieczytelne. Teraz każde ćwiczenie ma własny chart 150px z własną skalą Y. Bodyweight = reps na osi Y. | AKTYWNA |
| 2026-04-02 | **PR dates** — `bestDate` w ExerciseBest + wyświetlanie w Achievements | Rekordy nie miały daty. Teraz "80kg × 5 rep · 15 mar". | AKTYWNA |
| 2026-04-02 | **Cycles aktualny plan** — karta na górze z progress bar, tydzień X z Y | Cycles pokazywał tylko historyczne cykle, nie aktualny plan. | AKTYWNA |
| 2026-04-02 | **Playwright E2E** — VITE_E2E_MODE, 60 testów (smoke, nav, features, edge cases) | Brak E2E testów. Krytyczne dla weryfikacji batch save. | AKTYWNA |
| 2026-04-02 | **Security audit — 5 agentów równolegle** — CRITICAL: Strava auth fix, role escalation block, useAIChat userId fix | Audyt bezpieczeństwa znalazł 2 CRITICAL (Strava bez auth, role escalation), 3 HIGH, 7 MEDIUM. Wszystkie naprawione. | AKTYWNA |
| 2026-04-02 | **Usunięcie AI Chat/Coach** — useAIChat, useAICoach, useChatMessages, AIChat.tsx, ai-chat.ts | Nieużywane moduły. Usunięcie zmniejsza attack surface i kod (-815 linii). ai-coach.ts zostaje (callOpenAI, getSwapSuggestions). | AKTYWNA |
| 2026-04-02 | **Input validation** — clampSet() 0-999, notes cap 2000/5000, importData schema validation | Audit znalazł brak walidacji zakresów. Dodano server-side clamping i whitelist pól przy imporcie. | AKTYWNA |
| 2026-04-02 | **OpenAI hardening** — model allowlist, maxTokens cap 4000, max 50 messages | Audit: user mógł wybrać dowolny model i maxTokens. Teraz tylko gpt-5-mini/gpt-4.1-mini. | AKTYWNA |
| 2026-04-02 | **Cleanup /simplify** — formatLocalDate→utils, E2E helpers, callback refs, draft debounce, latestPR limit | Audyt /simplify: 20 findings, naprawiono top 11. -50 linii, lepsza memoizacja, mniej re-renderów. | AKTYWNA |

### v6.6.0 (2026-04-01)

| Data | Decyzja | Kontekst | Status |
|------|---------|----------|--------|
| 2026-04-01 | **One-Click Autostart** — `?autostart=true` query param + useEffect auto-start + scrollIntoView | Użytkownik musiał kliknąć 2-3 razy żeby rozpocząć trening (Dashboard → WorkoutDay → "Rozpocznij"). Teraz jedno kliknięcie z Dashboard startuje sesję i scrolluje do pierwszego ćwiczenia. `autostartDone` ref zapobiega podwójnemu odpaleniu. | AKTYWNA |
| 2026-04-01 | **Pre-fill z progresją** — `createPrefilledSets()` w exercise-utils.ts, wywoływane przy tworzeniu nowej sesji | Sety startowały od 0/0 mimo że mamy dane z poprzedniego treningu. Teraz kopiuje reps + weight + increment z getProgressionAdvice (+2.5kg compound, +1kg isolation). completed=false — user potwierdza ✓. Fallback do createEmptySets() przy braku historii. | AKTYWNA |
| 2026-04-01 | **Skip exercise = tylko na dziś** — `skippedExercises?: string[]` w WorkoutSession, NIE modyfikuje planu | User chciał pomijać ćwiczenia bez wpływu na plan. skippedExercises zapisywane w Firebase per-sesja. Ćwiczenie filtrowane w aktywnym widoku, widoczne z badge "Pominięte" w podsumowaniu. | AKTYWNA |
| 2026-04-01 | **Dynamiczne serie** — handleAddSet/handleRemoveSet w ExerciseCard, max 10, min 1 | Stała liczba serii (z planu) nie pozwalała na elastyczność. Nowa seria kopiuje dane z ostatniej. Firebase już przechowuje dynamiczną tablicę SetData[], więc brak zmian modelu. | AKTYWNA |

### v6.5.0 (2026-03-24)

| Data | Decyzja | Kontekst | Status |
|------|---------|----------|--------|
| 2026-03-24 | **Plan Cycles w osobnej kolekcji** — `plan_cycles/{autoId}` zamiast subcollection pod `training_plans` | Niezależne query, prostsze indeksy, brak limitu zagnieżdżenia. Każdy cykl ma pełny snapshot planu + statystyki. | AKTYWNA |
| 2026-03-24 | **Archiwizacja przy tworzeniu nowego planu** — `archiveCurrentPlan()` przed `savePlan()` | `training_plans/{userId}` przechowuje tylko JEDEN aktywny plan (setDoc nadpisuje). Archiwizacja zapobiega utracie historii. | AKTYWNA |
| 2026-03-24 | **Stats obliczane przy archiwizacji** — snapshot statystyk (tonaż, PRy, frekwencja) w dokumencie cyklu | Unikamy kosztownych retrospektywnych query. Stats frozen at cycle end. | AKTYWNA |
| 2026-03-24 | **generatePlanFromCycle** — osobna funkcja AI z kontekstem starego planu + PRów | AI dostaje pełny kontekst progresji: stary plan JSON, rekordy, frekwencję. Generuje plan z progresją. | AKTYWNA |
| 2026-03-24 | **Żółty banner ≤2 tygodnie** — `weeksRemaining` w useTrainingPlan, osobny od `isPlanExpired` | Proaktywne przypomnienie zamiast reaktywnego "plan się skończył". User ma czas zaplanować nowy cykl. | AKTYWNA |
| 2026-03-24 | **Share z photo — FileReader + brightness filter** — zdjęcie jako tło z `filter: brightness(0.4)` | Nie uploadujemy zdjęcia nigdzie — base64 w pamięci, renderowane przez html2canvas-pro. Prywatność preserved. | AKTYWNA |
| 2026-03-24 | **cycleId opcjonalne w WorkoutSession** — backward compatible, stare workouty bez cycleId | Brak migration wymagana. Nowe workouty dostają cycleId, stare działają bez zmian. | AKTYWNA |

### v6.4.1 (2026-03-17)

| Data | Decyzja | Kontekst | Status |
|------|---------|----------|--------|
| 2026-03-17 | **savePlan zachowuje startDate/durationWeeks** — always-include zamiast optional spread | `setDoc` nadpisywał cały dokument, kasując metadata planu przy każdej edycji ćwiczenia. Dashboard pokazywał "Tydzień 1/12" zamiast prawidłowego tygodnia. | AKTYWNA |
| 2026-03-17 | **Auto-repair missing startDate** — query earliest workout → Monday → updateDoc | One-time self-healing: jeśli plan nie ma startDate, odtwarza go z historii treningów. Zapobiega konieczności ręcznej naprawy w Firebase. | AKTYWNA |

### v6.4.0 (2026-03-13)

| Data | Decyzja | Kontekst | Status |
|------|---------|----------|--------|
| 2026-03-13 | **Streaming AI Chat (SSE)** — streamOpenAI onRequest + callOpenAIStream na froncie | Token-by-token UX zamiast czekania na pełną odpowiedź. onRequest zamiast onCall bo onCall nie wspiera SSE. | AKTYWNA |
| 2026-03-13 | **Per-user chat w Firestore** — chat_messages collection z userId isolation | Zastępuje localStorage (max 50 msg, ginęły po wylogowaniu) i legacy chat_conversations (brak per-user isolation). One-time migration z localStorage. | AKTYWNA |
| 2026-03-13 | **$5/user/miesiąc AI limit** — ai_usage/{userId_YYYY-MM} z FieldValue.increment() | Ochrona przed nadużyciami. Atomowe inkrementy (concurrent-safe). checkUsageLimit() przed każdym callem. | AKTYWNA |
| 2026-03-13 | **Cost tracking we wszystkich AI functions** — proxyOpenAI, generateWeeklySummary, streamOpenAI | Pełny obraz kosztów per user. Admin widzi global + per-user. | AKTYWNA |
| 2026-03-13 | **Manual auth w streamOpenAI** — Authorization: Bearer {idToken} zamiast onCall auth | onRequest nie ma wbudowanego auth jak onCall. verifyIdToken() ręcznie. | AKTYWNA |
| 2026-03-13 | **chat_conversations DEPRECATED** — zakomentowane w firestore.rules | Zastąpione przez chat_messages z per-user isolation. Legacy collection. | AKTYWNA |

### v6.3.0 (2026-03-12)

| Data | Decyzja | Kontekst | Status |
|------|---------|----------|--------|
| 2026-03-12 | **Resend zamiast SendGrid** — Weekly Digest używa Resend API | User wybrał Resend, prostsze API, darmowy tier wystarczający | AKTYWNA |
| 2026-03-12 | **Auto-detect emaili z Firebase Auth** — `listUsers()` zamiast hardcoded secret | Digest wysyłany do każdego użytkownika z kontem, bez ręcznej konfiguracji | AKTYWNA |
| 2026-03-12 | **Per-user digest** — osobne query workouts + strava per userId | Każdy user dostaje swoje statystyki, nie globalne | AKTYWNA |
| 2026-03-12 | **Kompaktowe karty Strava w TrainingPlan** — inline rows zamiast pełnych StravaActivityCard | Na mobile pełne karty zajmowały za dużo miejsca, rozjeżdżały layout | AKTYWNA |
| 2026-03-12 | **Grupowanie po dacie w timeline** — Strava + trening z tego samego dnia razem | Czystszy layout, data wyświetlana raz, elementy logicznie powiązane | AKTYWNA |

### v6.1.0 (2026-03-11)

| Data | Decyzja | Kontekst | Status |
|------|---------|----------|--------|
| 2026-03-11 | **Exercise Timeline z Recharts** — LineChart (est. 1RM primary + max weight dashed) | Wizualizacja progresji per ćwiczenie, reuse calculate1RM z pr-utils | AKTYWNA |
| 2026-03-11 | **Plateau detection** — brak progresu max weight w ostatnich N sesjach | Prosta heurystyka (domyślnie 4 sesje), alert w dialogu | AKTYWNA |
| 2026-03-11 | **Smart Rest Timer (intensity-based)** — czas odpoczynku zależy od typu ćwiczenia i % 1RM | Compound 90s base, isolation 60s, +30s >80% 1RM, +60s >90% 1RM. Superset first 15s, non-first 60s | AKTYWNA |
| 2026-03-11 | **lookupExerciseType** — lookup compound/isolation z exerciseLibrary | Reuse istniejącej biblioteki, fallback 'compound' dla nieznanych | AKTYWNA |
| 2026-03-11 | **Warmup Routine UI z timerami** — checklist + inline 30s countdown | Dane z warmupStretching.ts (już istniały), focus-based stretching | AKTYWNA |
| 2026-03-11 | **Training Heatmap (GitHub-style)** — grid 53×7 z 5 poziomami intensywności | Łączy workouts + Strava w jedną wizualizację, year selector | AKTYWNA |
| 2026-03-11 | **Share Workout via html2canvas-pro** — generowanie PNG 540×960 (IG story) | Ciemny gradient, stats grid, lista ćwiczeń, navigator.share + download fallback | AKTYWNA |
| 2026-03-11 | **Race Predictor (Riegel formula)** — T2 = T1 × (D2/D1)^1.06 | Predykcje 5K/10K/HM/Marathon z najlepszego effort w Strava | AKTYWNA |
| 2026-03-11 | **Training Load (TRIMP/Banister)** — CTL 42d EWMA, ATL 7d EWMA, TSB = CTL - ATL | Wymaga aktywności z HR, default restHR=60, maxHR z connection | AKTYWNA |
| 2026-03-11 | **Weekly Digest (Cloud Function)** — onSchedule Monday 08:00 Warsaw | HTML email inline CSS, stats grid + Strava highlights, per-user | AKTYWNA |
| 2026-03-11 | **escapeHtml w share-utils** — XSS protection przy innerHTML | Pre-commit hook złapał innerHTML bez sanityzacji, dodano escapeHtml() | AKTYWNA |

### v5.1.0 (2026-03-08)

| Data | Decyzja | Kontekst | Status |
|------|---------|----------|--------|
| 2026-03-08 | **Auto-detect istniejących użytkowników** — w `ensureUserDoc()` sprawdzamy czy user ma workouty → auto `onboardingCompleted: true` | Bug v5.0: istniejący użytkownicy widzieli onboarding i tracili swój plan | AKTYWNA |
| 2026-03-08 | **Przywracanie domyślnego planu** — jeśli existing user nie miał `onboardingCompleted`, przywracamy defaultPlan | Bug v5.0 nadpisywał plany istniejących użytkowników | AKTYWNA |
| 2026-03-08 | **Rozszerzony Weekday type (7 dni)** — `'monday' \| 'tuesday' \| ... \| 'sunday'` | Plany 2-5 dni/tydzień wymagają mappingu na dowolny dzień | AKTYWNA |
| 2026-03-08 | **Dynamiczny getTrainingSchedule()** — akceptuje `weeks` i `days` params | Plany AI mają różną liczbę dni i tygodni | AKTYWNA |
| 2026-03-08 | **Plan duration tracking** — `planDurationWeeks`, `planStartDate`, `currentWeek`, `isPlanExpired` | Plany mają czas trwania (8-16 tygodni), po upływie → nowy plan | AKTYWNA |
| 2026-03-08 | **Banner expired plan** — Dashboard pokazuje banner "Twój plan się zakończył!" z linkiem do /new-plan | UX: jasna komunikacja + call-to-action | AKTYWNA |
| 2026-03-08 | **NewPlan.tsx** — oddzielna strona generowania nowego planu (cel, dni, AI, review, save) | Oddzielony od onboardingu: mniejszy, prostszy, podsumowuje stary plan | AKTYWNA |
| 2026-03-08 | **Review planu po AI generation** — onboarding i NewPlan pokazują plan z "Zamień" buttonsami | User widzi plan PRZED zapisem, może zamienić ćwiczenia | AKTYWNA |
| 2026-03-08 | **ExerciseSwapDialog** — dialog zamiany ćwiczenia z filtrami po kategorii | Filtruje bibliotekę, ukrywa już użyte, zachowuje oryginalne sety | AKTYWNA |
| 2026-03-08 | **GeneratedPlan interface** — `{ days, planDurationWeeks }` zamiast plain array | AI zwraca czas trwania planu (8-12 tygodni) | AKTYWNA |
| 2026-03-08 | **Strava 365 dni lookback** — pierwszy sync pobiera rok wstecz (zamiast 30 dni) | Użytkownicy chcieli widzieć starsze aktywności | AKTYWNA |
| 2026-03-08 | **Strava w planie tygodnia** — Dashboard, TrainingPlan, Analytics, AIChat | Strava aktywności widoczne obok treningów siłowych | AKTYWNA |
| 2026-03-08 | **AI "Podsumuj tydzień" z Strava** — quick action w AIChat buduje prompt z treningami + Strava | Pełny obraz tygodnia: siłownia + bieganie/rower/etc. | AKTYWNA |
| 2026-03-08 | **Klikalne ukończone treningi w Analytics** — `<button>` zamiast `<div>` z navigate | UX: użytkownik może przejść do szczegółów treningu | AKTYWNA |

### v5.0.0 (2026-03-08)

| Data | Decyzja | Kontekst | Status |
|------|---------|----------|--------|
| 2026-03-08 | **AI-powered onboarding** — 5-krokowy wizard → AI generuje plan | Nowi użytkownicy dostają spersonalizowany plan zamiast domyślnego | AKTYWNA |
| 2026-03-08 | **Exercise library (60+ ćwiczeń)** — `exerciseLibrary.ts` z kategoriami i video URL | AI używa nazw z biblioteki (priorytet), swap dialog filtruje po kategoriach | AKTYWNA |
| 2026-03-08 | **AI Coach na Dashboard** — insights: plateau, progress, consistency, suggestion, warning | Analiza treningów po 3+ ukończonych, cache 24h | AKTYWNA |
| 2026-03-08 | **OpenAI integration** — `callOpenAI()` w `ai-coach.ts`, `VITE_OPENAI_API_KEY` | Generowanie planów i AI coaching przez API | AKTYWNA |
| 2026-03-08 | **onboardingCompleted flag** — pole w `users/{uid}` decyduje o onboarding vs Dashboard | Kontrola flow nowych użytkowników | AKTYWNA |

### v4.0.0 (2026-03-08)

| Data | Decyzja | Kontekst | Status |
|------|---------|----------|--------|
| 2026-03-08 | **Multi-user: UserContext + userId** — każdy hook przyjmuje userId, dane izolowane per-user | Dodanie drugiego użytkownika, plany per-user | AKTYWNA |
| 2026-03-08 | **Multi-email whitelist** — `VITE_ALLOWED_EMAILS` (comma-separated) | Skalowalne podejście do autentykacji | AKTYWNA |
| 2026-03-08 | **Admin panel z rolami** — `role: 'admin' \| 'user'`, AdminRoute guard | Admin zarządza planami wszystkich użytkowników | AKTYWNA |
| 2026-03-08 | **Per-user training plans** — `training_plans/{userId}` z days, durationWeeks, startDate | Każdy użytkownik ma własny plan z czasem trwania | AKTYWNA |
| 2026-03-08 | **Strava via Cloud Functions** — stravaAuthUrl, stravaCallback, stravaSync (callable) | OAuth wymaga server-side, token refresh | AKTYWNA |
| 2026-03-08 | **Strava OAuth bridge** — `strava-callback.html` → HashRouter `#/strava/callback` | GitHub Pages + HashRouter = Strava nie może redirectować na hash URL | AKTYWNA |
| 2026-03-08 | **Firestore composite indexes** — userId ASC + date DESC na workouts, measurements, strava_activities | Zapytania z `where('userId')` + `orderBy('date')` | AKTYWNA |
| 2026-03-08 | **Firestore security rules** — użytkownicy czytają/piszą tylko swoje dane, admin read all | Bezpieczeństwo danych multi-user | AKTYWNA |

### v3.1.0 (2026-02-23)

| Data | Decyzja | Kontekst | Status |
|------|---------|----------|--------|
| 2026-02-23 | **Strict TypeScript** — `strict: true` w tsconfig.app.json, zero błędów | Jakość — strictNullChecks, noImplicitAny | AKTYWNA |
| 2026-02-23 | **Testy Vitest** — 25 testów dla exercise-utils i trainingPlan | Pokrycie kluczowych utility functions | AKTYWNA |
| 2026-02-23 | **exercise-utils.ts** — wyciągnięto parseSetCount, createEmptySets, sanitizeSets z ExerciseCard | Testowalność — utility w oddzielnym pliku | AKTYWNA |
| 2026-02-23 | **Strona Postępy** — wykresy recharts: progresja ciężarów + pomiary ciała | Wizualizacja progresu treningowego | AKTYWNA |
| 2026-02-23 | **RestTimer w WorkoutDay** — circular progress, presety, wibracja | Timer dostępny w trakcie treningu (manualne uruchomienie) | AKTYWNA |
| 2026-02-23 | **Dark mode** — ThemeProvider (next-themes) + toggle Sun/Moon | CSS variables, class strategy | AKTYWNA |
| 2026-02-23 | **Error Boundary** — class component owijający App | Fallback UI zamiast białej strony | AKTYWNA |
| 2026-02-23 | **Dashboard: bieżący tydzień** — getThisWeekDates() zamiast getLatestWorkout() | Plan tygodnia nie pokazywał starych treningów | AKTYWNA |
| 2026-02-23 | **Firebase config do .env** — credentials przeniesione do VITE_* | Bezpieczeństwo — klucze poza źródłami | AKTYWNA |
| 2026-02-23 | **React.memo na ExerciseCard** — zapobiega re-renderom | Skakanie UI przy auto-save | AKTYWNA |
| 2026-02-23 | **Debounce 500ms** (wcześniej 300ms) — mniej zapisów do Firebase | Rzadsze zapisy, mniej onSnapshot callbacks | AKTYWNA |
| 2026-02-23 | **Podpowiedź poprzedniego ciężaru** — "Poprzednio: 8×40kg" | User nie musi pamiętać ciężarów | AKTYWNA |

### v3.0.0 (2026-01-28)

| Data | Decyzja | Kontekst | Status |
|------|---------|----------|--------|
| 2026-01-28 | **Seria rozgrzewkowa (warmup)** — pierwsza seria, pomarańczowa, ikona płomienia | Oddzielenie rozgrzewki od serii roboczych | AKTYWNA |
| 2026-01-28 | **Notatki do ćwiczeń** — opcjonalne pole tekstowe pod seriami | Zapisywanie odczuć, uwag technicznych | AKTYWNA |
| 2026-01-28 | **Tryb edycji bez auto-save** — `handleSetsChangeLocal` modyfikuje tylko lokalny state | Auto-save powodował "mryganie" UI | AKTYWNA |
| 2026-01-28 | **Parametr `?date=` w URL** — wszystkie nawigacje do workout przekazują datę | Bez tego kliknięcie na przeszły trening pokazywało dzisiejszą datę | AKTYWNA |
| 2026-01-28 | **Plan tygodniowy od bieżącego poniedziałku** | Wcześniej pokazywał następny tydzień | AKTYWNA |
| 2026-01-28 | **Przycisk "Zapisz zmiany" statyczny** — nie fixed | Fixed button skakał na mobile przy klawiaturze | AKTYWNA |

---

## DECYZJE ARCHITEKTONICZNE

| Data | Decyzja | Kontekst | Status |
|------|---------|----------|--------|
| 2026-01 | **HashRouter zamiast BrowserRouter** | GitHub Pages nie obsługuje server-side routing | AKTYWNA |
| 2026-01 | **Firebase Firestore** | Real-time sync, Google Auth, darmowy tier | AKTYWNA |
| 2026-01 | **Multi-email whitelist** | VITE_ALLOWED_EMAILS (comma-separated) | AKTYWNA |
| 2026-01 | **Sanityzacja danych przed Firebase** | Firebase nie akceptuje `undefined` | AKTYWNA |
| 2026-02 | **OpenAI API client-side** | VITE_OPENAI_API_KEY, bezpośrednie wywołania | AKTYWNA |
| 2026-03 | **Strava OAuth server-side** | Firebase Cloud Functions (callable) | AKTYWNA |
| 2026-03 | **Per-user data isolation** | Firestore security rules + composite indexes | AKTYWNA |
| 2026-03 | **AI plan duration (8-16 weeks)** | AI decyduje na podstawie celu/doświadczenia | AKTYWNA |
| 2026-03 | **SSE streaming via onRequest** | onCall nie wspiera streaming, onRequest + manual Bearer auth | AKTYWNA |
| 2026-03 | **AI cost tracking per-user per-month** | FieldValue.increment() atomowe, $5 limit, ai_usage collection |
| 2026-03 | **Plan Cycles (osobna kolekcja)** | plan_cycles/{autoId} z snapshot planu + stats, archiwizacja przy nowym planie |
| 2026-03 | **Photo share (client-side only)** | FileReader base64, brightness filter, html2canvas-pro, zero upload | AKTYWNA |

---

## ODRZUCONE OPCJE

| Data | Opcja | Powód odrzucenia |
|------|-------|------------------|
| 2026-01-28 | Auto-save w trybie edycji | "Mryganie" i zbędne zapisy Firebase |
| 2026-01-28 | Fixed button na dole (tryb edycji) | Skakał przy klawiaturze na mobile |
| 2026-01 | LocalStorage zamiast Firebase | Brak sync między urządzeniami |
| 2026-01 | BrowserRouter | Nie działa na GitHub Pages |
| 2026-03 | Strava OAuth client-side | Wymaga server-side dla token exchange |
| 2026-03 | Natychmiastowy zapis planu z onboardingu | Użytkownik nie mógł zweryfikować/zamienić ćwiczeń |
| 2026-03 | 30 dni lookback Strava (pierwszy sync) | Za mało aktywności widocznych dla nowych użytkowników |

---

## KONTEKST TECHNICZNY (dla przyszłych sesji)

### Handlery w WorkoutDay.tsx
- `handleSetsChange` → aktywny trening, AUTO-SAVE z debounce 500ms
- `handleSetsChangeLocal` → tryb edycji, TYLKO lokalny state
- `handleFinishEditing` → zapis wszystkiego na raz po edycji

### Struktura SetData
```typescript
interface SetData {
  reps: number;       // Zawsze number, nigdy undefined
  weight: number;     // Zawsze number, nigdy undefined
  completed: boolean; // Zawsze boolean
  isWarmup?: boolean; // Opcjonalne, true tylko dla warmup
}
```

### Nawigacja z datą
```typescript
navigate(`/workout/${dayId}?date=${targetDate}`)
const [searchParams] = useSearchParams();
const targetDate = searchParams.get('date') || today;
```

### Znajdowanie bieżącego poniedziałku
```typescript
const dayOfWeek = start.getDay();
const daysSinceMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
start.setDate(start.getDate() - daysSinceMonday);
```

### Onboarding detection
```typescript
// UserContext.tsx
const workoutsSnap = await getDocs(
  query(collection(db, 'workouts'), where('userId', '==', user.uid), limit(1))
);
const isExistingUser = !workoutsSnap.empty;
// isExistingUser → auto onboardingCompleted: true
```

### Plan expiration
```typescript
// useTrainingPlan.ts
const currentWeek = Math.floor((now - startDate) / (7 * 24 * 60 * 60 * 1000)) + 1;
const isPlanExpired = currentWeek > planDurationWeeks;
```

---

## SESJA 2026-06-05/06 — i18n pełne, katalog 241, 10 planów, onboarding redesign, replan, fixy

### Decyzje produktowe (z ankiet z userem)
- **Plany:** zostawić istniejące, dać lepsze nazwy (bez nazwisk — "Jeremy Ethier" → "Balanced Builder"), dobić do **10** (6 rename + 4 flagowce pod cele onboardingu). Nazwy brandowe Kinetic (Iron Foundation, Push Pull Legs Engine, Upper/Lower Forge, Hypertrophy Split, Tension Protocol; Foundational Strength 5x5, Powerbuilding Protocol, Lean Engine, Kinetic Athlete).
- **Custom ćwiczenia (dodawanie własnych do bazy):** ODPUSZCZONE — katalog 241 wystarczy, user wybiera z katalogu zamiast dodawać. (Firestore per-user custom exercises pominięte.)
- **Katalog:** "idziemy na grubo" — +135 ćwiczeń (maszyny popularnych siłowni + wolne ciężary + BW), nie tylko top 30. Każde komplet PL+EN.
- **Onboarding:** pełny 5-krokowy kreator wg makiet usera (Welcome → Baseline/poziom → Objective/cel → Protocol/dni+harmonogram+data → Precision/rekomendacja). Rekomendacja + przeglądanie 10 + ułóż własny.
- **Replan (po skończeniu planu):** spójny z onboardingiem przez wspólny `PlanWizard`. Start od rekomendacji (pre-fill z profilu) + "Zmień ustawienia". Closeout (świętowanie wyników cyklu) PRZED wyborem. Preview + swap ćwiczeń przed zatwierdzeniem.

### Decyzje techniczne / architektura
- **i18n:** PL pozostaje KANONICZNE w danych (nazwy ćwiczeń/dni/focus = slug CDN, lookup szczegółów, zapis Firestore, resolver historii). Lokalizuje się TYLKO wyświetlanie. Czysta funkcja `translate(lang,key,params)` w `@/i18n` używana też w lib/ (poza Reactem; funkcje lib biorą `lang` z domyślnym 'pl' by testy przeszły). Helpery: localizeExerciseName/Instruction/Category, localizeDayName/Focus/WeekdayShort, dateLocale. Wartości PL w locale dla kluczy asertowanych w testach = 1:1 z oryginałem.
- **Focusy planów** muszą być tokenizowalne przez localizeFocus (mapa słów PL→EN word-by-word) — nowe plany używają prostego słownictwa (Nogi/Klatka/Plecy/Barki, Całe ciało A, Dół/Góra/Kondycja, Siła A), nie wielowyrazowych fraz.
- **PlanWizard** (`src/components/PlanWizard.tsx`) = jedno źródło prawdy dla wyboru planu. Props: showWelcome, initial (pre-fill), startAtPrecision, confirmLabelKey, onConfirm(choice), onExitBack. Onboarding.tsx i NewPlan.tsx = cienkie wrappery (różnią się tylko zapisem: onboarding→completed, replan→archive+cycle).
- **Porównanie cykli:** tonaż liczony NA TRENING (averageTonnagePerWorkout), nie suma — suma świeżego cyklu vs zakończonego zawsze dawała absurdalny minus (-69978 kg).
- **Naprawy danych usera (np. fantomowy cykl):** robione jako narzędzia W APCE (user uruchamia, ma dostęp przez security rules), bo z CLI brak admin-dostępu do Firestore (ADC PERMISSION_DENIED). Przykład: "Usuń cykl" w CycleDetail (deleteCycle odtagowuje cycleId, nie kasuje treningów).
- **Root-cause fantomowych cykli:** auto-repair w Cycles.tsx tworzył duplikaty bo guard na ref żył tylko w jednym mountcie. Fix: guard per planStartDate + localStorage zamiast ref.

### 🔴 WNIOSKI ZE WSZYSTKICH BUILDÓW (kluczowe — biały ekran iOS)
- **Base path = przyczyna białego ekranu na iOS.** `vite.config.ts`: `base: isMobileBuild ? './' : '/strength-save/'`. iOS WKWebView serwuje z roota → WYMAGA builda mobilnego (base `./`). Build webowy (base `/strength-save/`) wgrany do iOS = assety 404 = biały ekran (bez ErrorBoundary, bo bundle się nie ładuje).
- **`npm run deploy` ma predeploy `vite build` (WEB) i NADPISUJE `dist`.** Jeśli po deployu zrobisz `cap sync ios`, skopiujesz build WEBowy do iOS → biały ekran. **Zawsze:** `npm run build:mobile && ./node_modules/.bin/cap sync ios && ./node_modules/.bin/cap run ios --target=<UDID>`. Weryfikacja: `grep 'src="' ios/App/App/public/index.html` musi pokazać `./assets/...`, NIE `/strength-save/assets/...`.
- **`cap sync` NIE wystarcza** do zobaczenia zmian na uruchomionej apce iOS — trzeba `cap run` (xcodebuild przebudowuje .app). Sam `cap sync` tylko kopiuje pliki.
- **Service worker NIE był przyczyną** białego ekranu (fresh uninstall+reinstall też był biały) — to czysto base path. (Ale SW PWA w WKWebView to potencjalne źródło problemów z cache przy update.)
- **RTK hook** przepisuje `npx cap` → `npm cap` (błąd "Missing script") — używaj `./node_modules/.bin/cap`.
- **Weryfikacja wizualna bez urządzenia:** Chrome-extension MCP bywa offline; WKWebView nie pipuje konsoli JS do stdout (OSLog = systemowy szum). Działa **Playwright** (headless chromium) + dev server z `.env.local` `VITE_E2E_MODE=true` + `addInitScript` ustawiający localStorage `fittracker_e2e_auth_state={"scenario":"new-user"|"active-admin"}`. PO TEŚCIE USUŃ `.env.local` (E2E-bypass nie może trafić na produkcję). `waitUntil:'domcontentloaded'` (NIE 'networkidle' — HMR websocket wisi). Onboarding = new-user; replan `/new-plan` = active-admin.
- **Multi-plik scalanie danych (i18n/ćwiczenia):** agenci piszą fragmenty (JSON/klucze), główny agent scala deterministycznie skryptem ze sprawdzeniem dup/parity/kolizji — zero równoległej edycji wspólnych plików. tsc waliduje komplet (en typowany `Record<keyof typeof pl,string>`).
- **Każdy etap weryfikowany:** `npx tsc --noEmit -p tsconfig.app.json` + `npx eslint .` + `npm run build:mobile` + `npx vitest run` (219 testów). Build/testy NIE łapią błędu base-path (to runtime iOS) — dlatego potrzebny screenshot symulatora po `cap run`.

---

## SESJA 2026-06-10 — audyt 20 agentów + naprawa 13 HIGH + 9 funkcji UX (v6.12.0)

**Audyt:** 20 agentów (po jednym na obszar) + adwersaryjna weryfikacja każdego critical/high. Wynik: 141 znalezisk, 140 potwierdzonych (0 critical, 13 high, 74 medium, 53 low). Pełny raport: `audit/AUDYT_KOMPLETNY_2026-06-10.md`.

**Naprawione wszystkie 13 HIGH:**
1. `VITE_OPENAI_API_KEY` usunięty z CI (deploy.yml) i z sekretów repo — klient go nie używał. UWAGA: klucz był publiczny w bundlu do 2026-03-09 → wymaga ROTACJI w OpenAI dashboard (manualnie).
2. Konflikt dwóch urządzeń: seed `cloudUpdatedAt` (cloudMetaRef) + kolejka sync nie wycina już pól + dialog "Zachowaj moją / Pobierz z chmury" zamiast cichego nadpisania.
3. `savePlan`: guard na `isLoaded` + `merge: true` (zapis przed snapshotem kasował custom plan).
4. Swap w podglądzie NewPlan przez `swapExerciseIdentity` (videoUrl: undefined wywalał setDoc).
5. Powrót preview→wizard przywraca stan (prop `resume` w PlanWizard + initialDays w PlanBuilder).
6. Reset planu (PlanEditor) za AlertDialogiem.
7. Pre-fill wag: fallback po nazwie ćwiczenia z całej historii (id zmieniają się między cyklami).
8. Reconnect Strava kasuje aktywności TYLKO przy zmianie konta (athleteId); to samo konto zachowuje historię >365 dni.
9. Disconnect Strava z potwierdzeniem (ostrzeżenie o utracie).
10. Flagi admina (config/feature_flags) faktycznie egzekwowane: aiEnabled w assertAiEnabled, registrationOpen w syncUserProfile (kill switch na cost abuse); generateWeeklySummary ma bramkę AI.
11. Streak: parseLocalDate zamiast new Date('YYYY-MM-DD') — poniedziałki liczone w UTC+ (test regresyjny).
12. Self-service usunięcie konta (Apple 5.1.1(v)): callable deleteOwnAccount + wspólny purgeUserData (też avatary Storage i app_telemetry_daily) + dialog z wpisaniem USUŃ w Profilu.
13. Import backupu z dialogiem podsumowania (data, liczby, nadpisania) zamiast natychmiastowego wykonania.

**Funkcje UX (1-6, 8-10; 7 pominięta na życzenie):**
- AutoSyncOnReconnect: zaległe final-synci domykane po powrocie online; wskaźnik zapisu 2 stany ("na telefonie"/"w chmurze HH:MM").
- Pełny backup (plan+cykle, schemaVersion 2), import batchami bez limitu 500, updatedAt/revision zachowane.
- ConfirmDialog (wspólny) wpięty w cleanup/merge/reset admina/API keys.
- Szkice kreatora planu w localStorage (builder + preview) z bannerem "kontynuować?".
- PreferenceSync: users/{uid}.preferences (jednostki, język, timer, dźwięk) między web i iOS; users.language pisany dla push/digest.
- Dashboard: planEnded (wygasły LUB zakończony wcześniej), odliczanie "startuje za X dni", karta przedłużenia ZAMIAST cichego auto-startu cyklu.
- Odznaki z paskiem postępu (%), podpowiedź "zrób jeszcze N treningów, aby utrzymać serię".
- Profil linkuje do sekcji Ustawień (?section= + scroll), wykres tonażu z zakresem 8/12 tyg/Wszystko (domyślnie 12).

**Wcześniej w tej sesji:** zawsze ciemny motyw (forcedTheme, usunięty toggle) + licznik ukończonych treningów w nagłówku; iOS build 25 na TestFlight.

**Do zrobienia ręcznie:** rotacja klucza OpenAI w dashboardzie OpenAI (sekret w Secret Manager: openai-api-key) — stary był publiczny w bundlu GH Pages do 2026-03-09.

## SESJA 2026-06-11 — grywalizacja: tarcza serii, odznaki specjalne, medale sezonów

- **Tarcza serii (streak freeze):** `calculateStreakDetails` w `summary-utils.ts`. Tydzień bez 2 treningów nie zeruje serii, jeśli starszy tydzień jest zaliczony i poprzednia tarcza była >=4 tyg. wcześniej (max ~1/mies.). Bieżący tydzień nigdy nie łamie serii (naprawia reset w poniedziałek). Notka na Dashboardzie gdy tarcza uratowała zeszły tydzień.
- **Odznaki specjalne:** `computeSpecialBadges` (achievements-utils): Ranny ptaszek (<7:00), Comeback (21+ dni przerwy), Niedzielny wojownik, Konsekwentny (4 tyg. z kompletem planu). Sekcja w Achievements.
- **Medale sezonów:** `season-medals.ts` (złoto >=85%, srebro >=65%, brąz >=40% frekwencji). Chip na closeout cyklu + sekcja "Półka medali" w Achievements.
- Wdrożone: web (GH Pages) + iOS TestFlight build 27.
- **UWAGA build 27 z czystego worktree:** w repo trwa równoległa praca nad Apple Watch (useWatchWorkoutSync, watch-bridge, target StrengthWatch w pbxproj — NIEZACOMMITOWANE). Deploy i build iOS zrobione z czystego HEAD, żeby nie wypuścić WIP. Numer buildu 27 podbity TYLKO w worktree — pbxproj w repo dalej ma 26; przy commitowaniu pracy nad Watch ustawić CURRENT_PROJECT_VERSION >= 28.

---

## SESJA 2026-08-10 — X25 Z228: deterministyczne sekwencje cross-device

**Root cause danych:** `clampSet` wycinał `updatedAt` przed Firestore, a konflikt rewizji
stosował globalne local-wins. W sekwencji iOS -> Watch -> edycja web -> finish starszy
lokalny snapshot mógł cofnąć nowszą serię z web. Decyzja: jedna polityka per-set LWW
`(updatedAt, updatedEventId)` w TS, Swift i Garmin Functions; konflikt pobiera cloud,
robi rebase i retry na świeżej rewizji. Metadane są addytywne i zachowane w Firestore.

**Root cause entitlementu Watch:** capability miało tylko `active=false`, więc expiry
i revoke były nierozróżnialne. Decyzja: `inactiveReason=expired|revoked|inactive`;
expiry pozwala domknąć wyłącznie już aktywną sesję i zachowuje pending, revoke blokuje
nowe eventy fail-closed bez cichego kasowania kolejki.

**E2E:** harness po utwardzeniu P0 nadal nie uruchamiał Functions i oczekiwał fallbacku
profilu po błędzie `syncUserProfile`. Decyzja: E2E uruchamia Auth+Firestore+Functions,
buduje Functions przed startem i generuje ignorowany fixture `.secret.local`, aby nie
sięgać do Secret Manager. Fixture aktywnego usera ma wysłany welcome mail; naprawa 501
rekordów używa roli admin zgodnie z Z90.4. Wynik 13/13 PASS.

**Brama fizyczna:** iPhone offline, brak Watch/Android/Garmin. W1-W9, G1-G9 i D1-D4
pozostają jawnie otwarte; automatyczne testy nie zostały przedstawione jako real-device.

---

## SESJA 2026-08-10 — X25 Z229: release readiness bez obchodzenia App Attest

**Apple signing:** trzy targety zachowują manualne profile App Store. Próba
Automatic provisioning szukała profili Development, a wymuszenie Apple Distribution
konfliktowało targety i SPM, więc eksperyment wycofano. Nowo wygenerowany profil
`Strength Save App Store` nadal nie ma entitlementu App Attest, ponieważ capability
nie jest włączone na App ID. Decyzja: nie usuwać produkcyjnego App Attest; portalowe
włączenie capability i podpisany archive pozostają twardą bramą.

**Privacy/review:** aplikacja i Watch dostały osobne, uczciwe privacy manifests z
UserDefaults `CA92.1`; oba są osadzone w zasobach. Review notes opisują jeden
HKWorkout, brak paywalla na zegarku i wspólny entitlement.

**Garmin Store:** manifest rozszerzono o prostokątny Venu Sq 2. Wszystkie 16 ID
budują się na SDK 9.2.0, a podpisany export ma 27 PRG. Symulator potwierdza prawdziwy
ekran aplikacji na FR255 (round/buttons) i Venu Sq 2 (rectangle/touch) bez konta i
bez zakończenia treningu. Klucz i lokalny backup poza repo mają ten sam checksum;
off-host backup, fizyczne G1-G9 i portalowy submit pozostają bramami.
