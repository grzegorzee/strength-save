import Toybox.Attention;
import Toybox.Graphics;
import Toybox.Lang;
import Toybox.Timer;
import Toybox.WatchUi;

// Ekran ćwiczenia: następna niezaliczona seria z pre-fill (cel z garminDay),
// stepper ciężaru +/-2.5 kg (UP/DOWN), tap/SELECT = zalicz. Po serii rest
// timer z wibracją. Notatka i cel z kontekstu (pola t/p).
class ExerciseView extends WatchUi.View {
    var exIdx as Number;
    var reps as Number = 0;
    var weight as Float = 0.0;
    var editReps as Boolean = false;
    var restLeft as Number = 0;
    var restTimer as Timer.Timer or Null = null;

    function initialize(exerciseIndex as Number) {
        View.initialize();
        exIdx = exerciseIndex;
        loadNextSet();
    }

    function exercise() as Dictionary or Null {
        var day = WorkoutState.day();
        if (day == null) { return null; }
        var exercises = day["e"] as Array;
        return exIdx < exercises.size() ? exercises[exIdx] as Dictionary : null;
    }

    function nextSetIndex() as Number {
        var ex = exercise();
        if (ex == null) { return -1; }
        var sets = ex["s"] as Array;
        for (var i = 0; i < sets.size(); i++) {
            if (!WorkoutState.isDone(exIdx, i)) { return i; }
        }
        return -1;
    }

    function loadNextSet() as Void {
        var ex = exercise();
        var setIdx = nextSetIndex();
        if (ex == null || setIdx < 0) { return; }
        var sets = ex["s"] as Array;
        var pair = sets[setIdx] as Array;
        reps = pair[0] as Number;
        weight = (pair[1] as Number).toFloat();
    }

    function logCurrent() as Void {
        var setIdx = nextSetIndex();
        if (setIdx < 0) { return; }
        WorkoutState.logSet(exIdx, setIdx, reps, weight);
        if (Attention has :vibrate) {
            Attention.vibrate([new Attention.VibeProfile(80, 300)]);
        }
        if (nextSetIndex() >= 0) {
            startRest(90);
            loadNextSet();
        }
        WatchUi.requestUpdate();
    }

    function startRest(seconds as Number) as Void {
        restLeft = seconds;
        if (restTimer == null) { restTimer = new Timer.Timer(); }
        restTimer.start(method(:onRestTick), 1000, true);
    }

    function onRestTick() as Void {
        restLeft -= 1;
        if (restLeft <= 0) {
            restTimer.stop();
            restLeft = 0;
            if (Attention has :vibrate) {
                Attention.vibrate([new Attention.VibeProfile(100, 600)]);
            }
        }
        WatchUi.requestUpdate();
    }

    function onHide() as Void {
        if (restTimer != null) { restTimer.stop(); }
    }

    function onUpdate(dc as Dc) as Void {
        dc.setColor(Graphics.COLOR_WHITE, Graphics.COLOR_BLACK);
        dc.clear();
        var cx = dc.getWidth() / 2;
        var ex = exercise();
        if (ex == null) { return; }

        var name = ex["n"] as String;
        dc.drawText(cx, 8, Graphics.FONT_XTINY,
            name.length() > 20 ? name.substring(0, 20) : name, Graphics.TEXT_JUSTIFY_CENTER);

        if (ex.hasKey("t")) {
            dc.setColor(Graphics.COLOR_GREEN, Graphics.COLOR_TRANSPARENT);
            dc.drawText(cx, 28, Graphics.FONT_XTINY, ex["t"] as String, Graphics.TEXT_JUSTIFY_CENTER);
            dc.setColor(Graphics.COLOR_WHITE, Graphics.COLOR_TRANSPARENT);
        }

        if (restLeft > 0) {
            dc.setColor(Graphics.COLOR_ORANGE, Graphics.COLOR_TRANSPARENT);
            dc.drawText(cx, dc.getHeight() / 2 - 20, Graphics.FONT_NUMBER_MEDIUM,
                (restLeft / 60).toString() + ":" + (restLeft % 60).format("%02d"), Graphics.TEXT_JUSTIFY_CENTER);
            dc.drawText(cx, dc.getHeight() * 3 / 4, Graphics.FONT_XTINY,
                WatchUi.loadResource(Rez.Strings.Rest) as String + " · " + WatchUi.loadResource(Rez.Strings.Skip) as String,
                Graphics.TEXT_JUSTIFY_CENTER);
            return;
        }

        var setIdx = nextSetIndex();
        if (setIdx < 0) {
            dc.setColor(Graphics.COLOR_GREEN, Graphics.COLOR_TRANSPARENT);
            dc.drawText(cx, dc.getHeight() / 2, Graphics.FONT_SMALL, "✓", Graphics.TEXT_JUSTIFY_CENTER);
            return;
        }

        // Edytowane pole podświetlone: UP/DOWN zmienia, długi SELECT przełącza pole.
        dc.setColor(editReps ? Graphics.COLOR_GREEN : Graphics.COLOR_WHITE, Graphics.COLOR_TRANSPARENT);
        dc.drawText(cx - 40, dc.getHeight() / 2 - 16, Graphics.FONT_NUMBER_MILD,
            reps.toString(), Graphics.TEXT_JUSTIFY_CENTER);
        dc.setColor(editReps ? Graphics.COLOR_WHITE : Graphics.COLOR_GREEN, Graphics.COLOR_TRANSPARENT);
        dc.drawText(cx + 40, dc.getHeight() / 2 - 16, Graphics.FONT_NUMBER_MILD,
            weight.format("%.1f"), Graphics.TEXT_JUSTIFY_CENTER);
        dc.setColor(Graphics.COLOR_LT_GRAY, Graphics.COLOR_TRANSPARENT);
        dc.drawText(cx - 40, dc.getHeight() / 2 + 24, Graphics.FONT_XTINY,
            WatchUi.loadResource(Rez.Strings.Reps) as String, Graphics.TEXT_JUSTIFY_CENTER);
        dc.drawText(cx + 40, dc.getHeight() / 2 + 24, Graphics.FONT_XTINY,
            "kg", Graphics.TEXT_JUSTIFY_CENTER);

        if (ex.hasKey("p")) {
            dc.setColor(Graphics.COLOR_YELLOW, Graphics.COLOR_TRANSPARENT);
            var note = ex["p"] as String;
            dc.drawText(cx, dc.getHeight() - 34, Graphics.FONT_XTINY,
                note.length() > 24 ? note.substring(0, 24) : note, Graphics.TEXT_JUSTIFY_CENTER);
        }
    }
}

class ExerciseDelegate extends WatchUi.BehaviorDelegate {
    var view as ExerciseView;

    function initialize(exerciseView as ExerciseView) {
        BehaviorDelegate.initialize();
        view = exerciseView;
    }

    function onNextPage() as Boolean {
        if (view.editReps) {
            view.reps = view.reps > 0 ? view.reps - 1 : 0;
        } else {
            view.weight = view.weight >= 2.5 ? view.weight - 2.5 : 0.0;
        }
        WatchUi.requestUpdate();
        return true;
    }

    function onPreviousPage() as Boolean {
        if (view.editReps) {
            view.reps += 1;
        } else {
            view.weight += 2.5;
        }
        WatchUi.requestUpdate();
        return true;
    }

    function onSelect() as Boolean {
        if (view.restLeft > 0) {
            // Tap w timer = pomiń odpoczynek.
            view.restLeft = 1;
            view.onRestTick();
            return true;
        }
        view.logCurrent();
        return true;
    }

    function onMenu() as Boolean {
        // MENU przełącza edytowane pole (reps <-> ciężar).
        view.editReps = !view.editReps;
        WatchUi.requestUpdate();
        return true;
    }

    function onBack() as Boolean {
        WatchUi.popView(WatchUi.SLIDE_RIGHT);
        return true;
    }
}
