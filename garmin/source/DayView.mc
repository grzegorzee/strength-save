import Toybox.Graphics;
import Toybox.Lang;
import Toybox.System;
import Toybox.Time;
import Toybox.Time.Gregorian;
import Toybox.WatchUi;

// Ekran dnia: pobiera kontekst z garminDay i renderuje przewijaną listę
// ćwiczeń (UP/DOWN), SELECT otwiera ćwiczenie, MENU kończy trening.
class DayView extends WatchUi.View {
    var loading as Boolean = true;
    var errorCode as Number = 0;
    var rest as Boolean = false;
    var selected as Number = 0;

    function initialize() {
        View.initialize();
    }

    function onShow() as Void {
        // Kontekst z cache pozwala trenować offline; odśwież tylko gdy brak dnia.
        if (WorkoutState.day() == null) {
            fetch();
        } else {
            loading = false;
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
        }
        WatchUi.requestUpdate();
    }

    function onUpdate(dc as Dc) as Void {
        dc.setColor(Graphics.COLOR_WHITE, Graphics.COLOR_BLACK);
        dc.clear();
        var cx = dc.getWidth() / 2;

        if (loading) {
            dc.drawText(cx, dc.getHeight() / 2, Graphics.FONT_SMALL,
                WatchUi.loadResource(Rez.Strings.Loading) as String, Graphics.TEXT_JUSTIFY_CENTER);
            return;
        }
        if (errorCode != 0) {
            dc.drawText(cx, dc.getHeight() / 2, Graphics.FONT_XTINY,
                WatchUi.loadResource(Rez.Strings.NoConnection) as String, Graphics.TEXT_JUSTIFY_CENTER);
            return;
        }
        var day = WorkoutState.day();
        if (rest || day == null) {
            dc.drawText(cx, dc.getHeight() / 2, Graphics.FONT_SMALL,
                WatchUi.loadResource(Rez.Strings.RestDay) as String, Graphics.TEXT_JUSTIFY_CENTER);
            return;
        }

        var exercises = day["e"] as Array;
        dc.drawText(cx, 8, Graphics.FONT_XTINY, day["n"] as String, Graphics.TEXT_JUSTIFY_CENTER);
        if (EventQueue.size() > 0) {
            dc.setColor(Graphics.COLOR_ORANGE, Graphics.COLOR_TRANSPARENT);
            dc.drawText(cx, 26, Graphics.FONT_XTINY,
                WatchUi.loadResource(Rez.Strings.Pending) as String, Graphics.TEXT_JUSTIFY_CENTER);
            dc.setColor(Graphics.COLOR_WHITE, Graphics.COLOR_TRANSPARENT);
        }

        var rowHeight = 26;
        var top = 46;
        var visible = (dc.getHeight() - top) / rowHeight - 1;
        var first = selected > visible ? selected - visible : 0;
        for (var i = first; i < exercises.size() && (i - first) <= visible; i++) {
            var exercise = exercises[i] as Dictionary;
            var doneCount = 0;
            var sets = exercise["s"] as Array;
            for (var j = 0; j < sets.size(); j++) {
                if (WorkoutState.isDone(i, j)) { doneCount += 1; }
            }
            var y = top + (i - first) * rowHeight;
            if (i == selected) {
                dc.setColor(Graphics.COLOR_GREEN, Graphics.COLOR_TRANSPARENT);
            } else {
                dc.setColor(Graphics.COLOR_WHITE, Graphics.COLOR_TRANSPARENT);
            }
            var name = exercise["n"] as String;
            var label = name.length() > 18 ? name.substring(0, 18) : name;
            dc.drawText(12, y, Graphics.FONT_XTINY, label, Graphics.TEXT_JUSTIFY_LEFT);
            dc.drawText(dc.getWidth() - 12, y, Graphics.FONT_XTINY,
                doneCount.toString() + "/" + sets.size().toString(), Graphics.TEXT_JUSTIFY_RIGHT);
        }
    }
}

class DayDelegate extends WatchUi.BehaviorDelegate {
    var view as DayView;

    function initialize(dayView as DayView) {
        BehaviorDelegate.initialize();
        view = dayView;
    }

    function exerciseCount() as Number {
        var day = WorkoutState.day();
        return day == null ? 0 : (day["e"] as Array).size();
    }

    function onNextPage() as Boolean {
        var count = exerciseCount();
        if (count > 0) {
            view.selected = (view.selected + 1) % count;
            WatchUi.requestUpdate();
        }
        return true;
    }

    function onPreviousPage() as Boolean {
        var count = exerciseCount();
        if (count > 0) {
            view.selected = (view.selected + count - 1) % count;
            WatchUi.requestUpdate();
        }
        return true;
    }

    function onSelect() as Boolean {
        if (view.errorCode != 0) {
            view.fetch();
            return true;
        }
        if (exerciseCount() > 0) {
            var exView = new ExerciseView(view.selected);
            WatchUi.pushView(exView, new ExerciseDelegate(exView), WatchUi.SLIDE_LEFT);
        }
        return true;
    }

    function onMenu() as Boolean {
        var dialog = new WatchUi.Confirmation(WatchUi.loadResource(Rez.Strings.FinishConfirm) as String);
        WatchUi.pushView(dialog, new FinishConfirmDelegate(), WatchUi.SLIDE_UP);
        return true;
    }
}

class FinishConfirmDelegate extends WatchUi.ConfirmationDelegate {
    function initialize() {
        ConfirmationDelegate.initialize();
    }

    function onResponse(response as WatchUi.Confirm) as Boolean {
        if (response == WatchUi.CONFIRM_YES) {
            WorkoutState.finish(method(:onFinished));
        }
        return true;
    }

    function onFinished(ok as Boolean) as Void {
        // ok=false: zdarzenia zostają w kolejce (wskaźnik na liście), retry przy
        // kolejnym zakończeniu — ingest jest idempotentny.
        WatchUi.requestUpdate();
    }
}
