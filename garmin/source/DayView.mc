import Toybox.Graphics;
import Toybox.Lang;
import Toybox.System;
import Toybox.Time;
import Toybox.Time.Gregorian;
import Toybox.WatchUi;

// Ekran startowy dnia: pobiera kontekst z garminDay i obsługuje stany
// loading/błąd/odpoczynek. Sama lista ćwiczeń to natywne Menu2 (DayMenu) —
// poprawny layout na okrągłych ekranach każdego urządzenia bez ręcznego
// liczenia marginesów, marquee długich nazw za darmo.
class DayView extends WatchUi.View {
    var loading as Boolean = true;
    var errorCode as Number = 0;
    var rest as Boolean = false;

    function initialize() {
        View.initialize();
    }

    function onShow() as Void {
        // Kontekst z cache pozwala trenować offline; odśwież tylko gdy brak dnia.
        if (WorkoutState.day() == null) {
            fetch();
        } else {
            loading = false;
            showMenu();
        }
    }

    function todayString() as String {
        var now = Gregorian.info(Time.now(), Time.FORMAT_SHORT);
        return now.year.format("%04d") + "-" + now.month.format("%02d") + "-" + now.day.format("%02d");
    }

    function fetch() as Void {
        loading = true;
        errorCode = 0;
        WatchUi.requestUpdate();
        Api.fetchDay(todayString(), method(:onDay));
    }

    function onDay(data as Dictionary or Null, code as Number) as Void {
        loading = false;
        if (data == null) {
            errorCode = code;
            if (code == 401) {
                var pairView = new PairView();
                WatchUi.switchToView(pairView, new PairDelegate(pairView), WatchUi.SLIDE_RIGHT);
                return;
            }
        } else if (data.hasKey("rest") && data["rest"] == true) {
            rest = true;
        } else {
            WorkoutState.setDay(data);
            showMenu();
            return;
        }
        WatchUi.requestUpdate();
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
            var message = errorCode >= 500
                ? WatchUi.loadResource(Rez.Strings.ServerError) as String
                : WatchUi.loadResource(Rez.Strings.NoConnection) as String;
            dc.drawText(cx, h * 45 / 100, Graphics.FONT_XTINY, message,
                Graphics.TEXT_JUSTIFY_CENTER | Graphics.TEXT_JUSTIFY_VCENTER);
            dc.setColor(Graphics.COLOR_LT_GRAY, Graphics.COLOR_TRANSPARENT);
            dc.drawText(cx, h * 58 / 100, Graphics.FONT_XTINY, "(" + errorCode.toString() + ")",
                Graphics.TEXT_JUSTIFY_CENTER | Graphics.TEXT_JUSTIFY_VCENTER);
            return;
        }
        if (rest) {
            dc.drawText(cx, h / 2, Graphics.FONT_SMALL,
                WatchUi.loadResource(Rez.Strings.RestDay) as String,
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

// Natywne menu dnia: ćwiczenia (sublabel: postęp + cel) + akcje na końcu.
class DayMenu extends WatchUi.Menu2 {
    function initialize() {
        var day = WorkoutState.day();
        Menu2.initialize({ :title => day == null ? "" : day["n"] as String });
        var exercises = day == null ? ([] as Array) : day["e"] as Array;
        for (var i = 0; i < exercises.size(); i++) {
            var exercise = exercises[i] as Dictionary;
            addItem(new WatchUi.MenuItem(exercise["n"] as String, exerciseSubLabel(i), i, {}));
        }
        addItem(new WatchUi.MenuItem(
            WatchUi.loadResource(Rez.Strings.Finish) as String, pendingSubLabel(), :finish, {}));
        addItem(new WatchUi.MenuItem(
            WatchUi.loadResource(Rez.Strings.WeightStep) as String, AppSettings.stepLabel(), :step, {}));
    }

    function exerciseSubLabel(index as Number) as String {
        var day = WorkoutState.day();
        if (day == null) { return ""; }
        var exercise = (day["e"] as Array)[index] as Dictionary;
        var sets = exercise["s"] as Array;
        var doneCount = 0;
        for (var j = 0; j < sets.size(); j++) {
            if (WorkoutState.isDone(index, j)) { doneCount += 1; }
        }
        var label = doneCount.toString() + "/" + sets.size().toString();
        if (exercise.hasKey("t")) {
            label += " · " + (exercise["t"] as String);
        }
        return label;
    }

    function pendingSubLabel() as String or Null {
        var pending = EventQueue.size();
        if (pending == 0) { return null; }
        return pending.toString() + " " + (WatchUi.loadResource(Rez.Strings.ToSend) as String);
    }

    function refresh() as Void {
        var day = WorkoutState.day();
        if (day == null) { return; }
        var count = (day["e"] as Array).size();
        for (var i = 0; i < count; i++) {
            (getItem(i) as WatchUi.MenuItem).setSubLabel(exerciseSubLabel(i));
        }
        (getItem(count) as WatchUi.MenuItem).setSubLabel(pendingSubLabel());
        (getItem(count + 1) as WatchUi.MenuItem).setSubLabel(AppSettings.stepLabel());
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

    function onSelect(item as WatchUi.MenuItem) as Void {
        var id = item.getId();
        if (id instanceof Number) {
            var exView = new ExerciseView(id as Number);
            WatchUi.pushView(exView, new ExerciseDelegate(exView), WatchUi.SLIDE_LEFT);
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
        }
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
        menu.refresh();
        if (WatchUi has :showToast) {
            WatchUi.showToast(WatchUi.loadResource(ok ? Rez.Strings.Saved : Rez.Strings.NoConnection) as String, null);
        }
        WatchUi.requestUpdate();
    }
}
