# PLAN GARMIN V3: przerwy w apce zegarkowej + zegar sesji + ekran Sesja (2026-07-28)

> **Dla agenta wykonawcy:** WYMAGANY SUB-SKILL: `superpowers:executing-plans`. TRYB 100% AUTONOMICZNY.
> Kontynuacja pracy z 2026-07-28 (v2 UI + szybki trening WDROŻONE i działają na zegarku usera).
> Start = commit `wip(garmin): v3 w toku` na main. **Repo garmin/ NIE KOMPILUJE SIĘ** do czasu FAZY 1 (brakujące stringi) — to oczekiwane.

**Goal:** Trzy rzeczy na zegarku: (1) przerwy konfigurowalne w menu dnia (między seriami ORAZ między ćwiczeniami — ta druga dziś nie istnieje), (2) zegar czasu trwania sesji (mini u góry ekranu ćwiczenia + duży na nowym ekranie), (3) ekran "Sesja" (czas + serie + tonaż) dostępny swipe'em w bok z ekranu ćwiczenia i z menu dnia.

---

## 0. TWARDE ZASADY

1. **Dane usera święte.** Symulator jest SPAROWANY z produkcyjnym kontem usera i w jego kolejce wisi 1 niewysłany event testowy — **NIGDY nie klikaj "Zakończ trening" w symulatorze** (wysłałby trening na konto usera). Odhaczanie serii w symulatorze = lokalne, bezpieczne.
2. **Zero `git add -A`.** W repo leży nietrackowany folder `animacje-cwiczen/` (699 MB wideo) i inne WIPy. Stage'uj pliki imiennie.
3. **Decyzje usera już zapadły (nie podważaj):** nawigacja ekranów = swipe w bok (+ pozycja w menu dnia, żeby działało na zegarkach bez dotyku); ekran Sesja pokazuje TYLKO czas + serie + tonaż (bez HR, bez postępu dnia); przerwy: serie default 90 s, ćwiczenia default 150 s (parytet z telefonem, `src/lib/rest-timer.ts:77-79`), ustawiane wyłącznie na zegarku (podejście "rs z backendu" zostało jawnie wycofane, nie wracaj do niego).
4. **Pułapki Monkey C (kosztowały czas, nie powtarzaj):** `method(:sym)` NIE działa w scope modułu → `new Lang.Method($.Modul, :sym)`; `.bind()` nie istnieje; fonty `FONT_NUMBER_*` mają TYLKO cyfry (nawiasy/litery = tofu); i18n do OBU plików `garmin/resources-pol/strings/strings.xml` + `garmin/resources/strings/strings.xml`.
5. Build tylko `epix2` na potrzeby testów usera (jego zegarek); pozostałe urządzenia dopiero przy paczce do Store (poza zakresem tego planu).

---

## STAN ZASTANY (commit `wip(garmin): v3 w toku`)

**Działa (wdrożone wcześniej, nie ruszaj):** UI v2 (Menu2, ExerciseView pionowy, krok wagi), szybki trening (menu, recents `r` z garminDay — backend ZDEPLOYOWANY), parowanie. Środowisko: SDK 9.2.0, PATH do `monkeyc` = `$HOME/Library/Application Support/Garmin/ConnectIQ/Sdks/connectiq-sdk-mac-9.2.0-2026-06-09-92a1605b2/bin` + `/opt/homebrew/opt/openjdk@21/bin`. Build: `cd garmin && ./build.sh epix2`.

**Zrobione w WIP (są w commicie):**
- `AppSettings.mc`: `REST_SET_STEPS [30..240]`, `REST_EXERCISE_STEPS [0,60..300]` (0 = wyłączona), `cycleStored`, `restSetSeconds()` (default 90), `cycleRestSetSeconds()`, `restExerciseSeconds()` (default 150), `cycleRestExerciseSeconds()`, `formatSeconds` ("1:30"), `formatElapsed` ("43:12" / "1:02:33"), `restSetLabel()`, `restExerciseLabel()` (używa **brakującego** stringa `RestOff`).
- `WorkoutState.mc`: `nowMs()` zwraca **Long** (fix przepełnienia 32-bit: `.toLong()` przed `* 1000`), `sessionElapsedSec()` (0 gdy brak `startedAt`), `sessionStats()` → `{"sets" => Number, "tonnage" => Float}`.
- `DayView.mc` / `DayMenu`: pola `restSetIndex`/`restExIndex` + dwie pozycje menu `:restSet`/`:restEx` dodane w `initialize` (używają **brakujących** stringów `RestSetLabel`/`RestExLabel`). `refresh()` ich NIE aktualizuje, delegate NIE ma handlerów — to FAZA 2.

**Niezrobione:** stringi, handlery `:restSet`/`:restEx`, logika przerw w `ExerciseView.logCurrent` (wciąż `startRest(90)`), refactor timera UI, mini zegar, `SessionView.mc`, pozycja `:session` w menu, swipe.

---

## FAZA 1: Stringi (odblokowuje kompilację)

- [x] Krok 1: Dopisz do OBU plików stringów (przed `</strings>`):
  PL (`resources-pol/strings/strings.xml`):
  ```xml
  <string id="RestSetLabel">Przerwa: serie</string>
  <string id="RestExLabel">Przerwa: ćwiczenia</string>
  <string id="RestOff">wyłączona</string>
  <string id="SessionTitle">Sesja</string>
  <string id="TonnageLabel">Tonaż</string>
  ```
  EN (`resources/strings/strings.xml`):
  ```xml
  <string id="RestSetLabel">Rest: sets</string>
  <string id="RestExLabel">Rest: exercises</string>
  <string id="RestOff">off</string>
  <string id="SessionTitle">Session</string>
  <string id="TonnageLabel">Volume</string>
  ```
- [x] Krok 2: `./build.sh epix2` → BUILD SUCCESSFUL (jedyne dopuszczalne warningi: "Invalid device id" dla niepobranych urządzeń i skalowanie ikony).

## FAZA 2: Dokończenie przerw

- [x] Krok 1: `DayMenu.refresh()` — dopisz po bloku `stepIndex`:
  ```monkeyc
  if (restSetIndex >= 0) {
      (getItem(restSetIndex) as WatchUi.MenuItem).setSubLabel(AppSettings.restSetLabel());
  }
  if (restExIndex >= 0) {
      (getItem(restExIndex) as WatchUi.MenuItem).setSubLabel(AppSettings.restExerciseLabel());
  }
  ```
- [x] Krok 2: `DayMenuDelegate.onSelect` — dwa nowe gałęzie obok `:step`:
  ```monkeyc
  } else if (id == :restSet) {
      AppSettings.cycleRestSetSeconds();
      item.setSubLabel(AppSettings.restSetLabel());
      WatchUi.requestUpdate();
  } else if (id == :restEx) {
      AppSettings.cycleRestExerciseSeconds();
      item.setSubLabel(AppSettings.restExerciseLabel());
      WatchUi.requestUpdate();
  ```
- [x] Krok 3: `ExerciseView.logCurrent` — przerwa serii z ustawień + NOWA przerwa po ostatniej serii ćwiczenia ("zmiana stanowiska", parytet `resolveRestSeconds` z telefonu: `exerciseFinished => betweenExercisesSeconds`):
  ```monkeyc
  if (nextSetIndex() >= 0) {
      startRest(AppSettings.restSetSeconds());
      if (!WorkoutState.isQuick()) { loadNextSet(); }
  } else {
      var between = AppSettings.restExerciseSeconds();
      if (between > 0) { startRest(between); }
  }
  ```
  (Po przerwie międzyćwiczeniowej widok naturalnie pokaże AllDone; BACK wraca do menu.)
- [x] Krok 4: Build + commit `feat(garmin): przerwy miedzy seriami i cwiczeniami ustawiane w menu dnia (0=wylaczona, parytet 90/150 z telefonem)`.

## FAZA 3: Jeden timer UI + mini zegar sesji w ExerciseView

- [x] Krok 1: Refactor timera (dziś timer startuje tylko przy przerwie; zegar sesji musi tykać zawsze): usuń `restTimer`, dodaj `uiTimer` uruchamiany w `onShow`, zatrzymywany w `onHide`:
  ```monkeyc
  var uiTimer as Timer.Timer or Null = null;

  function onShow() as Void {
      if (uiTimer == null) { uiTimer = new Timer.Timer(); }
      uiTimer.start(method(:onTick), 1000, true);
  }

  function onHide() as Void {
      if (uiTimer != null) { uiTimer.stop(); }
  }

  function startRest(seconds as Number) as Void {
      restLeft = seconds; // uiTimer już tyka
  }

  function onTick() as Void {
      if (restLeft > 0) {
          restLeft -= 1;
          if (restLeft == 0 && Attention has :vibrate) {
              Attention.vibrate([new Attention.VibeProfile(100, 600)]);
          }
      }
      WatchUi.requestUpdate();
  }
  ```
  W `ExerciseDelegate.onSelect` (pomiń przerwę) podmień `view.onRestTick()` → `view.onTick()` (mechanizm `restLeft = 1` zostaje).
- [x] Krok 2: Mini zegar na górze `onUpdate` (przed nazwą ćwiczenia; rysuj TYLKO gdy sesja trwa):
  ```monkeyc
  var elapsed = WorkoutState.sessionElapsedSec();
  if (elapsed > 0) {
      dc.setColor(Graphics.COLOR_LT_GRAY, Graphics.COLOR_TRANSPARENT);
      dc.drawText(cx, h * 5 / 100, Graphics.FONT_XTINY, AppSettings.formatElapsed(elapsed), center);
      dc.setColor(Graphics.COLOR_WHITE, Graphics.COLOR_TRANSPARENT);
  }
  ```
  Ma być widoczny też podczas przerwy (blok `restLeft > 0` jest niżej — zegar rysuj PRZED nim).
- [x] Krok 3: Build + commit `feat(garmin): zegar sesji na ekranie cwiczenia, jeden timer UI`.

## FAZA 4: Ekran Sesja + wejścia (menu i swipe)

- [x] Krok 1: Nowy plik `garmin/source/SessionView.mc`:
  ```monkeyc
  import Toybox.Graphics;
  import Toybox.Lang;
  import Toybox.Timer;
  import Toybox.WatchUi;

  // Ekran Sesja: duży czas trwania + serie + tonaż bieżącej sesji.
  // Wejścia: swipe w lewo z ekranu ćwiczenia albo pozycja "Sesja" w menu dnia.
  class SessionView extends WatchUi.View {
      var uiTimer as Timer.Timer or Null = null;

      function initialize() {
          View.initialize();
      }

      function onShow() as Void {
          if (uiTimer == null) { uiTimer = new Timer.Timer(); }
          uiTimer.start(method(:onTick), 1000, true);
      }

      function onHide() as Void {
          if (uiTimer != null) { uiTimer.stop(); }
      }

      function onTick() as Void {
          WatchUi.requestUpdate();
      }

      function onUpdate(dc as Dc) as Void {
          dc.setColor(Graphics.COLOR_WHITE, Graphics.COLOR_BLACK);
          dc.clear();
          var cx = dc.getWidth() / 2;
          var h = dc.getHeight();
          var center = Graphics.TEXT_JUSTIFY_CENTER | Graphics.TEXT_JUSTIFY_VCENTER;

          dc.setColor(Graphics.COLOR_LT_GRAY, Graphics.COLOR_TRANSPARENT);
          dc.drawText(cx, h * 14 / 100, Graphics.FONT_XTINY,
              WatchUi.loadResource(Rez.Strings.SessionTitle) as String, center);

          dc.setColor(Graphics.COLOR_WHITE, Graphics.COLOR_TRANSPARENT);
          dc.drawText(cx, h * 38 / 100, Graphics.FONT_NUMBER_MEDIUM,
              AppSettings.formatElapsed(WorkoutState.sessionElapsedSec()), center);

          var stats = WorkoutState.sessionStats();
          dc.drawText(cx, h * 60 / 100, Graphics.FONT_SMALL,
              (WatchUi.loadResource(Rez.Strings.SetsLabel) as String) + ": "
                  + (stats["sets"] as Number).toString(), center);
          dc.drawText(cx, h * 72 / 100, Graphics.FONT_SMALL,
              (WatchUi.loadResource(Rez.Strings.TonnageLabel) as String) + ": "
                  + AppSettings.formatKg(stats["tonnage"] as Float) + " kg", center);
      }
  }

  class SessionDelegate extends WatchUi.BehaviorDelegate {
      function initialize() {
          BehaviorDelegate.initialize();
      }

      function onBack() as Boolean {
          WatchUi.popView(WatchUi.SLIDE_RIGHT);
          return true;
      }

      function onSwipe(evt as WatchUi.SwipeEvent) as Boolean {
          if (evt.getDirection() == WatchUi.SWIPE_RIGHT) {
              WatchUi.popView(WatchUi.SLIDE_RIGHT);
              return true;
          }
          return false;
      }
  }
  ```
- [x] Krok 2: `DayMenu` — pozycja "Sesja" (TYLKO gdy `day != null`), wstaw MIĘDZY blokiem `:add`/`:quick` a blokiem `:finish`, z aktualizacją `nextIndex` i nowym polem `sessionIndex as Number = -1`:
  ```monkeyc
  if (day != null) {
      addItem(new WatchUi.MenuItem(
          WatchUi.loadResource(Rez.Strings.SessionTitle) as String, null, :session, {}));
      sessionIndex = nextIndex;
      nextIndex += 1;
  }
  ```
  W `refresh()`: `if (sessionIndex >= 0) { var e = WorkoutState.sessionElapsedSec(); (getItem(sessionIndex) as WatchUi.MenuItem).setSubLabel(e > 0 ? AppSettings.formatElapsed(e) : null); }`
  W `DayMenuDelegate.onSelect`: `} else if (id == :session) { WatchUi.pushView(new SessionView(), new SessionDelegate(), WatchUi.SLIDE_LEFT); }`
- [x] Krok 3: Swipe z ekranu ćwiczenia — w `ExerciseDelegate`:
  ```monkeyc
  function onSwipe(evt as WatchUi.SwipeEvent) as Boolean {
      if (evt.getDirection() == WatchUi.SWIPE_LEFT) {
          WatchUi.pushView(new SessionView(), new SessionDelegate(), WatchUi.SLIDE_LEFT);
          return true;
      }
      return false;
  }
  ```
- [x] Krok 4: Build + commit `feat(garmin): ekran Sesja (czas+serie+tonaz), swipe w bok i pozycja w menu dnia`.

## FAZA 5: Weryfikacja w symulatorze + handoff

Warsztat symulatora (pełne notatki: memory `garmin-ciq-dev-workflow`):
- start: `nohup monkeydo bin/strengthsave-epix2.prg epix2 >/dev/null 2>&1 &` (monkeydo BLOKUJE terminal bez nohup); restart apki: `pkill -f monkeydodeux` + ponowny monkeydo (Storage przeżywa);
- zrzut TYLKO okna symulatora: id okna przez `uv run --with pyobjc-framework-Quartz python` (CGWindowList, owner "Connect IQ Device Simulator"), potem `screencapture -x -o -l <id> plik.png` (id 11611 z poprzedniej sesji mogło się zmienić — sprawdź na nowo);
- klawisze przez osascript System Events: UP=126, DOWN=125, SELECT/Enter=36, BACK/Escape=53; po `activate` daj `delay 1` (pierwszy keypress potrafi przepaść);
- swipe'a NIE symulujesz klawiszami — w symulatorze przeciągnij nie da się z CLI; ekran Sesja testuj przez pozycję w menu, swipe zweryfikuje user na zegarku.

- [x] Krok 1: Zrzuty do weryfikacji wizualnej (obejrzyj je narzędziem Read i OCEŃ layout, nie tylko "plik istnieje"): (a) dół menu dnia — pozycje Sesja / Krok wagi / Przerwa: serie / Przerwa: ćwiczenia z sublabelami "1:30" i "2:30"; (b) klik w "Przerwa: serie" zmienia sublabel (cykl); (c) ekran Sesja z menu (czas 0:00 albo tykający, Serie, Tonaż); (d) ekran ćwiczenia z mini zegarem u góry (odhacz JEDNĄ serię w symulatorze, żeby sesja wystartowała — to bezpieczne, lokalne).
- [x] Krok 2: Sprawdź, że w kolejce NIE przybyło nic ponad Twoje testowe odhaczenia i że NIE dotknąłeś "Zakończ trening".
- [x] Krok 3: Commit + push (pliki imiennie!). `cp garmin/bin/strengthsave-epix2.prg ~/Desktop/StrengthSave.prg` i napisz userowi instrukcję: podłącz zegarek USB → OpenMTP (Garmin Express musi być ZAMKNIĘTY, blokuje MTP) → przeciągnij z Pulpitu do `GARMIN/Apps` (Replace) → odłącz.
- [x] Krok 4: Zaktualizuj sekcję STATUS w `garmin/README.md` (v3: przerwy, zegar sesji, ekran Sesja) + dopisz memory update do `garmin-ciq-dev-workflow` jeśli odkryjesz nową pułapkę.

## POZA ZAKRESEM (nie ruszaj)

Publikacja w Connect IQ Store (urządzenia FR/Venu w SDK Managerze, ikona 1024, screenshoty, formularz — sekcje A-D w `garmin/README.md`); cardio (decyzja: natywne aktywności Garmina + Strava); HR na ekranie Sesja (user świadomie odrzucił); odpięcie symulatora z konta (garminRevokeDevice) — dopiero po zakończeniu developmentu.
