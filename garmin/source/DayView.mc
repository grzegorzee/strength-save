import Toybox.Application;
import Toybox.Graphics;
import Toybox.Lang;
import Toybox.System;
import Toybox.WatchUi;

// Ekran startowy dnia: pobiera kontekst z garminDay i obsługuje stany
// loading/błąd/odpoczynek. Sama lista ćwiczeń to natywne Menu2 (DayMenu) —
// poprawny layout na okrągłych ekranach każdego urządzenia bez ręcznego
// liczenia marginesów, marquee długich nazw za darmo.
class DayView extends WatchUi.View {
    const DAY_CACHE_TTL_MS = 15 * 60 * 1000;
    var loading as Boolean = true;
    var errorCode as Number = 0;

    function initialize() {
        View.initialize();
    }

    function onShow() as Void {
        // Cache pozwala trenować offline, ale nie może być wieczny: odśwież gdy
        // brak dnia, dzień z INNEJ daty (stary bug: wczorajszy dzień wisiał na
        // zawsze) albo brak listy ostatnich ćwiczeń. Wyjątek: szybki trening
        // z niewysłanymi seriami — jego kontekstu nie wolno nadpisać (reguła 5).
        var day = WorkoutState.day();
        var keepSession = EventQueue.size() > 0;
        var fetchedAt = Application.Storage.getValue("dayFetchedAt");
        var ttlExpired = fetchedAt == null
            || WorkoutState.nowMs() - (fetchedAt as Long).toLong() > DAY_CACHE_TTL_MS;
        var stale = day == null
            || !(day["d"] as String).equals(WorkoutState.todayString())
            || Application.Storage.getValue("recents") == null
            || ttlExpired;
        if (stale && !keepSession) {
            fetch();
        } else {
            loading = false;
            showMenu();
        }
    }

    function fetch() as Void {
        loading = true;
        errorCode = 0;
        WatchUi.requestUpdate();
        Api.fetchDay(WorkoutState.todayString(), method(:onDay));
    }

    function canUseCachedDayAfterTransportError(code as Number) as Boolean {
        if (code >= 0) { return false; }
        var cachedDay = WorkoutState.day();
        return cachedDay != null
            && (cachedDay["d"] as String).equals(WorkoutState.todayString());
    }

    function onDay(data as Dictionary or Null, code as Number) as Void {
        loading = false;
        if (data == null) {
            // Connect IQ zwraca ujemne kody (np. -104) dla błędów transportu.
            // Bieżący plan z cache jest wtedy lepszy niż ślepy ekran retry;
            // 401/403/5xx i wczorajszy dzień nadal pozostają fail-closed.
            if (canUseCachedDayAfterTransportError(code)) {
                showMenu();
                return;
            }
            errorCode = code;
            if (code == 401) {
                var pairView = new PairView();
                WatchUi.switchToView(pairView, new PairDelegate(pairView), WatchUi.SLIDE_RIGHT);
                return;
            }
            WatchUi.requestUpdate();
            return;
        }
        Application.Storage.setValue("dayFetchedAt", WorkoutState.nowMs());
        // Lista ostatnich ćwiczeń do szybkiego treningu (też w dni wolne).
        // Brak pola oznacza pustą listę, nie "nigdy nie pobrano" — inaczej konto
        // bez historii wymusza fetch przy każdym cold launchu.
        Application.Storage.setValue("recents", data.hasKey("r") ? data["r"] : []);
        if (data.hasKey("rest") && data["rest"] == true) {
            // Dzień wolny nie jest ślepym zaułkiem: menu z szybkim treningiem.
            showMenu();
            return;
        }
        WorkoutState.setDay(data);
        showMenu();
    }

    function showMenu() as Void {
        var menu = new DayMenu();
        WatchUi.switchToView(menu, new DayMenuDelegate(menu), WatchUi.SLIDE_LEFT);
    }

    function onUpdate(dc as Dc) as Void {
        dc.setColor(Graphics.COLOR_WHITE, Graphics.COLOR_BLACK);
        dc.clear();
        var cx = dc.getWidth() / 2;
        var h = dc.getHeight();

        if (loading) {
            dc.drawText(cx, h / 2, Graphics.FONT_SMALL,
                WatchUi.loadResource(Rez.Strings.Loading) as String,
                Graphics.TEXT_JUSTIFY_CENTER | Graphics.TEXT_JUSTIFY_VCENTER);
            return;
        }
        if (errorCode != 0) {
            var message = errorCode == 403
                ? WatchUi.loadResource(Rez.Strings.ProRequired) as String
                : (errorCode >= 500
                    ? WatchUi.loadResource(Rez.Strings.ServerError) as String
                    : WatchUi.loadResource(Rez.Strings.NoConnection) as String);
            dc.drawText(cx, h * 45 / 100, Graphics.FONT_XTINY, message,
                Graphics.TEXT_JUSTIFY_CENTER | Graphics.TEXT_JUSTIFY_VCENTER);
            dc.setColor(Graphics.COLOR_LT_GRAY, Graphics.COLOR_TRANSPARENT);
            dc.drawText(cx, h * 58 / 100, Graphics.FONT_XTINY, "(" + errorCode.toString() + ")",
                Graphics.TEXT_JUSTIFY_CENTER | Graphics.TEXT_JUSTIFY_VCENTER);
            return;
        }
    }
}

class DayDelegate extends WatchUi.BehaviorDelegate {
    var view as DayView;

    function initialize(dayView as DayView) {
        BehaviorDelegate.initialize();
        view = dayView;
    }

    function onSelect() as Boolean {
        if (view.errorCode != 0) {
            view.fetch();
        }
        return true;
    }
}

// Natywne menu dnia w trzech stanach:
// - plan: ćwiczenia dnia + Szybki trening + Zakończ + Krok wagi
// - quick: ćwiczenia ad-hoc + Dodaj ćwiczenie + Zakończ + Krok wagi
// - dzień wolny (day == null): Szybki trening + Krok wagi (+ Zakończ gdy wiszą eventy)
class DayMenu extends WatchUi.Menu2 {
    var exerciseCount as Number = 0;
    var finishIndex as Number = -1;
    var stepIndex as Number = -1;
    var restSetIndex as Number = -1;
    var restExIndex as Number = -1;
    var sessionIndex as Number = -1;
    var unitIndex as Number = -1;
    var refreshIndex as Number = -1;

    function initialize() {
        var day = WorkoutState.day();
        var quick = WorkoutState.isQuick();
        var title = day == null
            ? WatchUi.loadResource(Rez.Strings.RestDay) as String
            : day["n"] as String;
        Menu2.initialize({ :title => title });

        var exercises = day == null ? ([] as Array) : day["e"] as Array;
        exerciseCount = exercises.size();
        for (var i = 0; i < exerciseCount; i++) {
            var exercise = exercises[i] as Dictionary;
            addItem(new WatchUi.MenuItem(exercise["n"] as String, exerciseSubLabel(i), i, {}));
        }

        var nextIndex = exerciseCount;
        if (day != null && quick) {
            addItem(new WatchUi.MenuItem(
                WatchUi.loadResource(Rez.Strings.AddExercise) as String, null, :add, {}));
        } else {
            addItem(new WatchUi.MenuItem(
                WatchUi.loadResource(Rez.Strings.QuickWorkout) as String, null, :quick, {}));
        }
        nextIndex += 1;

        if (day != null) {
            addItem(new WatchUi.MenuItem(
                WatchUi.loadResource(Rez.Strings.SessionTitle) as String, null, :session, {}));
            sessionIndex = nextIndex;
            nextIndex += 1;
        }

        if (day != null || EventQueue.size() > 0) {
            addItem(new WatchUi.MenuItem(
                WatchUi.loadResource(Rez.Strings.Finish) as String, pendingSubLabel(), :finish, {}));
            finishIndex = nextIndex;
            nextIndex += 1;
        }

        // Wyjście ze stanu "wiszące serie" bez wysyłki (reguła 6): widoczne
        // tylko, gdy faktycznie jest co odrzucić.
        if (EventQueue.size() > 0) {
            addItem(new WatchUi.MenuItem(
                WatchUi.loadResource(Rez.Strings.DiscardWorkout) as String, null, :discard, {}));
            nextIndex += 1;
        }

        addItem(new WatchUi.MenuItem(
            WatchUi.loadResource(Rez.Strings.WeightStep) as String, AppSettings.stepLabel(), :step, {}));
        stepIndex = nextIndex;
        nextIndex += 1;

        addItem(new WatchUi.MenuItem(
            WatchUi.loadResource(Rez.Strings.UnitLabel) as String, AppSettings.unitLabel(), :unit, {}));
        unitIndex = nextIndex;
        nextIndex += 1;

        addItem(new WatchUi.MenuItem(
            WatchUi.loadResource(Rez.Strings.RestSetLabel) as String, AppSettings.restSetLabel(), :restSet, {}));
        restSetIndex = nextIndex;
        nextIndex += 1;

        addItem(new WatchUi.MenuItem(
            WatchUi.loadResource(Rez.Strings.RestExLabel) as String, AppSettings.restExerciseLabel(), :restEx, {}));
        restExIndex = nextIndex;
        nextIndex += 1;

        addItem(new WatchUi.MenuItem(
            WatchUi.loadResource(Rez.Strings.Refresh) as String, null, :refresh, {}));
        refreshIndex = nextIndex;
    }

    function exerciseSubLabel(index as Number) as String {
        var day = WorkoutState.day();
        if (day == null) { return ""; }
        var exercise = (day["e"] as Array)[index] as Dictionary;
        var sets = exercise["s"] as Array;
        if (WorkoutState.isQuick()) {
            // Serie w szybkim treningu są otwarte (można logować ponad plan).
            return (WatchUi.loadResource(Rez.Strings.SetsLabel) as String) + ": "
                + WorkoutState.doneCountContiguous(index).toString();
        }
        var doneCount = 0;
        for (var j = 0; j < sets.size(); j++) {
            if (WorkoutState.isDone(index, j)) { doneCount += 1; }
        }
        var label = doneCount.toString() + "/" + sets.size().toString();
        var target = WorkoutState.targetLabel(exercise);
        if (target != null) {
            label += " · " + target;
        }
        return label;
    }

    function pendingSubLabel() as String or Null {
        var pending = EventQueue.size();
        if (pending == 0) { return null; }
        return pending.toString() + " " + (WatchUi.loadResource(Rez.Strings.ToSend) as String);
    }

    function refresh() as Void {
        for (var i = 0; i < exerciseCount; i++) {
            (getItem(i) as WatchUi.MenuItem).setSubLabel(exerciseSubLabel(i));
        }
        if (sessionIndex >= 0) {
            var e = WorkoutState.sessionElapsedSec();
            (getItem(sessionIndex) as WatchUi.MenuItem).setSubLabel(e > 0 ? AppSettings.formatElapsed(e) : null);
        }
        if (finishIndex >= 0) {
            (getItem(finishIndex) as WatchUi.MenuItem).setSubLabel(pendingSubLabel());
        }
        if (stepIndex >= 0) {
            (getItem(stepIndex) as WatchUi.MenuItem).setSubLabel(AppSettings.stepLabel());
        }
        if (unitIndex >= 0) {
            (getItem(unitIndex) as WatchUi.MenuItem).setSubLabel(AppSettings.unitLabel());
        }
        if (restSetIndex >= 0) {
            (getItem(restSetIndex) as WatchUi.MenuItem).setSubLabel(AppSettings.restSetLabel());
        }
        if (restExIndex >= 0) {
            (getItem(restExIndex) as WatchUi.MenuItem).setSubLabel(AppSettings.restExerciseLabel());
        }
    }

    function onShow() as Void {
        refresh();
        Menu2.onShow();
    }
}

class DayMenuDelegate extends WatchUi.Menu2InputDelegate {
    var menu as DayMenu;

    function initialize(dayMenu as DayMenu) {
        Menu2InputDelegate.initialize();
        menu = dayMenu;
    }

    function rebuildMenu() as Void {
        var fresh = new DayMenu();
        WatchUi.switchToView(fresh, new DayMenuDelegate(fresh), WatchUi.SLIDE_LEFT);
    }

    function onSelect(item as WatchUi.MenuItem) as Void {
        var id = item.getId();
        if (id instanceof Number) {
            var exView = new ExerciseView(id as Number);
            WatchUi.pushView(exView, new ExerciseDelegate(exView), WatchUi.SLIDE_LEFT);
        } else if (id == :quick) {
            // Reguła 5: start szybkiego treningu nie może zgubić niewysłanych serii
            // z bieżącej sesji — najpierw Zakończ trening.
            if (EventQueue.size() > 0) {
                if (WatchUi has :showToast) {
                    WatchUi.showToast(WatchUi.loadResource(Rez.Strings.FinishFirst) as String, null);
                }
                return;
            }
            WorkoutState.startQuick(WatchUi.loadResource(Rez.Strings.QuickWorkout) as String);
            rebuildMenu();
        } else if (id == :add) {
            var recents = Application.Storage.getValue("recents");
            if (recents == null || (recents as Array).size() == 0) {
                if (WatchUi has :showToast) {
                    WatchUi.showToast(WatchUi.loadResource(Rez.Strings.NoRecents) as String, null);
                }
                return;
            }
            WatchUi.pushView(new RecentsMenu(recents as Array), new RecentsDelegate(recents as Array), WatchUi.SLIDE_LEFT);
        } else if (id == :finish) {
            if (EventQueue.size() == 0) {
                if (WatchUi has :showToast) {
                    WatchUi.showToast(WatchUi.loadResource(Rez.Strings.NothingToSend) as String, null);
                }
                return;
            }
            var dialog = new WatchUi.Confirmation(WatchUi.loadResource(Rez.Strings.FinishConfirm) as String);
            WatchUi.pushView(dialog, new FinishConfirmDelegate(menu), WatchUi.SLIDE_UP);
        } else if (id == :step) {
            AppSettings.cycleWeightStep();
            item.setSubLabel(AppSettings.stepLabel());
            WatchUi.requestUpdate();
        } else if (id == :unit) {
            AppSettings.cycleUnit();
            rebuildMenu();
        } else if (id == :restSet) {
            AppSettings.cycleRestSetSeconds();
            item.setSubLabel(AppSettings.restSetLabel());
            WatchUi.requestUpdate();
        } else if (id == :restEx) {
            AppSettings.cycleRestExerciseSeconds();
            item.setSubLabel(AppSettings.restExerciseLabel());
            WatchUi.requestUpdate();
        } else if (id == :refresh) {
            // Lifecycle/manual fetch only; pending session keeps its pinned day.
            if (EventQueue.size() > 0) {
                if (WatchUi has :showToast) {
                    WatchUi.showToast(WatchUi.loadResource(Rez.Strings.FinishFirst) as String, null);
                }
                return;
            }
            Application.Storage.deleteValue("dayFetchedAt");
            var refreshView = new DayView();
            WatchUi.switchToView(refreshView, new DayDelegate(refreshView), WatchUi.SLIDE_RIGHT);
        } else if (id == :session) {
            WatchUi.pushView(new SessionView(), new SessionDelegate(), WatchUi.SLIDE_LEFT);
        } else if (id == :discard) {
            if (EventQueue.size() == 0) {
                if (WatchUi has :showToast) {
                    WatchUi.showToast(WatchUi.loadResource(Rez.Strings.NothingToSend) as String, null);
                }
                return;
            }
            var confirm = new WatchUi.Confirmation(WatchUi.loadResource(Rez.Strings.DiscardConfirm) as String);
            WatchUi.pushView(confirm, new DiscardConfirmDelegate(menu), WatchUi.SLIDE_UP);
        }
    }
}

// Wybór ćwiczenia do szybkiego treningu z ostatnio wykonywanych (r z garminDay).
class RecentsMenu extends WatchUi.Menu2 {
    function initialize(recents as Array) {
        Menu2.initialize({ :title => WatchUi.loadResource(Rez.Strings.AddExercise) as String });
        for (var i = 0; i < recents.size(); i++) {
            var recent = recents[i] as Dictionary;
            var preview = {
                "k" => recent.hasKey("k") ? recent["k"] : "weight_reps",
                "s" => [[recent["p"], recent["w"],
                    recent.hasKey("d") ? recent["d"] : 0,
                    recent.hasKey("m") ? recent["m"] : 0,
                    recent.hasKey("a") ? recent["a"] : 0]],
            };
            var sub = WorkoutState.targetLabel(preview);
            addItem(new WatchUi.MenuItem(recent["n"] as String, sub, i, {}));
        }
    }
}

class RecentsDelegate extends WatchUi.Menu2InputDelegate {
    var recents as Array;

    function initialize(list as Array) {
        Menu2InputDelegate.initialize();
        recents = list;
    }

    function onSelect(item as WatchUi.MenuItem) as Void {
        var id = item.getId();
        if (id instanceof Number) {
            WorkoutState.addQuickExercise(recents[id as Number] as Dictionary);
            // Pod spodem leży stary DayMenu bez nowej pozycji — podmień na świeży.
            WatchUi.popView(WatchUi.SLIDE_RIGHT);
            var fresh = new DayMenu();
            WatchUi.switchToView(fresh, new DayMenuDelegate(fresh), WatchUi.SLIDE_LEFT);
        }
    }
}

class DiscardConfirmDelegate extends WatchUi.ConfirmationDelegate {
    var menu as DayMenu;

    function initialize(dayMenu as DayMenu) {
        ConfirmationDelegate.initialize();
        menu = dayMenu;
    }

    function onResponse(response as WatchUi.Confirm) as Boolean {
        if (response == WatchUi.CONFIRM_YES) {
            WorkoutState.discard();
            if (WatchUi has :showToast) {
                WatchUi.showToast(WatchUi.loadResource(Rez.Strings.Discarded) as String, null);
            }
            // Dialog zdejmuje się sam; tu tylko odświeżamy sublabele (licznik
            // "do wysłania" znika). Pozycja Odrzuć wisi do przebudowy menu,
            // klik w nią z pustą kolejką kwituje toast (guard w onSelect).
            menu.refresh();
            WatchUi.requestUpdate();
        }
        return true;
    }
}

class FinishConfirmDelegate extends WatchUi.ConfirmationDelegate {
    var menu as DayMenu;

    function initialize(dayMenu as DayMenu) {
        ConfirmationDelegate.initialize();
        menu = dayMenu;
    }

    function onResponse(response as WatchUi.Confirm) as Boolean {
        if (response == WatchUi.CONFIRM_YES) {
            WorkoutState.finish(method(:onFinished));
        }
        return true;
    }

    function onFinished(ok as Boolean) as Void {
        // ok=false: zdarzenia zostają w kolejce (sublabel "do wysłania"), retry
        // przy kolejnym zakończeniu — ingest jest idempotentny.
        if (WatchUi has :showToast) {
            var code = Application.Storage.getValue("lastIngestCode");
            var message = ok
                ? Rez.Strings.Saved
                : (code != null && (code as Number) == 403 ? Rez.Strings.ProRequired : Rez.Strings.NoConnection);
            WatchUi.showToast(WatchUi.loadResource(message) as String, null);
        }
        if (ok && WorkoutState.isQuick()) {
            // Szybki trening wysłany: wróć do świeżo pobranego dnia z planu.
            WorkoutState.clearQuick();
            var dayView = new DayView();
            WatchUi.switchToView(dayView, new DayDelegate(dayView), WatchUi.SLIDE_RIGHT);
            return;
        }
        var currentDay = WorkoutState.day();
        if (ok && currentDay != null
            && !(currentDay["d"] as String).equals(WorkoutState.todayString())) {
            Application.Storage.deleteValue("dayFetchedAt");
            var dayView = new DayView();
            WatchUi.switchToView(dayView, new DayDelegate(dayView), WatchUi.SLIDE_RIGHT);
            return;
        }
        menu.refresh();
        WatchUi.requestUpdate();
    }
}
