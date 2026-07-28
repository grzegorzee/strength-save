import Toybox.Attention;
import Toybox.Graphics;
import Toybox.Lang;
import Toybox.Timer;
import Toybox.WatchUi;

// Ekran ćwiczenia: następna niezaliczona seria z pre-fill (cel z garminDay),
// stepper ciężaru (krok z AppSettings, UP/DOWN), tap/SELECT = zalicz. Po serii
// rest timer z wibracją. Układ pionowy, wszystko wycentrowane — okrągły ekran
// nie obcina, teksty przycinane do szerokości piksela (fitText).
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

    // Przycina tekst do maxWidth pikseli (z "..."), zamiast zgadywać liczbę znaków.
    function fitText(dc as Dc, text as String, font as Graphics.FontType, maxWidth as Number) as String {
        if (dc.getTextWidthInPixels(text, font) <= maxWidth) { return text; }
        var t = text;
        while (t.length() > 1 && dc.getTextWidthInPixels(t + "...", font) > maxWidth) {
            t = t.substring(0, t.length() - 1) as String;
        }
        return t + "...";
    }

    function onUpdate(dc as Dc) as Void {
        dc.setColor(Graphics.COLOR_WHITE, Graphics.COLOR_BLACK);
        dc.clear();
        var w = dc.getWidth();
        var h = dc.getHeight();
        var cx = w / 2;
        var center = Graphics.TEXT_JUSTIFY_CENTER | Graphics.TEXT_JUSTIFY_VCENTER;
        var ex = exercise();
        if (ex == null) { return; }

        // Nagłówek: nazwa + cel (u góry okręgu węższy pas, stąd 66% szerokości).
        dc.drawText(cx, h * 12 / 100, Graphics.FONT_XTINY,
            fitText(dc, ex["n"] as String, Graphics.FONT_XTINY, w * 66 / 100), center);
        if (ex.hasKey("t")) {
            dc.setColor(Graphics.COLOR_GREEN, Graphics.COLOR_TRANSPARENT);
            dc.drawText(cx, h * 21 / 100, Graphics.FONT_XTINY, ex["t"] as String, center);
            dc.setColor(Graphics.COLOR_WHITE, Graphics.COLOR_TRANSPARENT);
        }

        if (restLeft > 0) {
            dc.setColor(Graphics.COLOR_ORANGE, Graphics.COLOR_TRANSPARENT);
            dc.drawText(cx, h / 2, Graphics.FONT_NUMBER_MEDIUM,
                (restLeft / 60).toString() + ":" + (restLeft % 60).format("%02d"), center);
            dc.setColor(Graphics.COLOR_LT_GRAY, Graphics.COLOR_TRANSPARENT);
            dc.drawText(cx, h * 72 / 100, Graphics.FONT_XTINY,
                WatchUi.loadResource(Rez.Strings.Rest) as String + " · " + WatchUi.loadResource(Rez.Strings.Skip) as String,
                center);
            return;
        }

        var setIdx = nextSetIndex();
        var sets = ex["s"] as Array;
        if (setIdx < 0) {
            dc.setColor(Graphics.COLOR_GREEN, Graphics.COLOR_TRANSPARENT);
            dc.drawText(cx, h / 2, Graphics.FONT_SMALL,
                WatchUi.loadResource(Rez.Strings.AllDone) as String, center);
            return;
        }

        // Numer serii.
        dc.setColor(Graphics.COLOR_LT_GRAY, Graphics.COLOR_TRANSPARENT);
        dc.drawText(cx, h * 30 / 100, Graphics.FONT_XTINY,
            WatchUi.loadResource(Rez.Strings.SetWord) as String + " "
                + (setIdx + 1).toString() + "/" + sets.size().toString(), center);

        // Edytowana wartość duża w centrum, druga mała pod spodem.
        var bigValue = editReps ? reps.toString() : AppSettings.formatKg(weight);
        var bigUnit = editReps
            ? WatchUi.loadResource(Rez.Strings.RepsUnit) as String
            : "kg";
        var smallValue = editReps
            ? AppSettings.formatKg(weight) + " kg"
            : reps.toString() + " " + (WatchUi.loadResource(Rez.Strings.RepsUnit) as String);

        dc.setColor(Graphics.COLOR_GREEN, Graphics.COLOR_TRANSPARENT);
        dc.drawText(cx, h * 47 / 100, Graphics.FONT_NUMBER_MEDIUM, bigValue, center);
        dc.drawText(cx, h * 62 / 100, Graphics.FONT_TINY, bigUnit, center);
        dc.setColor(Graphics.COLOR_LT_GRAY, Graphics.COLOR_TRANSPARENT);
        dc.drawText(cx, h * 72 / 100, Graphics.FONT_XTINY, smallValue, center);

        // Notatka (przypięta w apce) i podpowiedź sterowania.
        if (ex.hasKey("p")) {
            dc.setColor(Graphics.COLOR_YELLOW, Graphics.COLOR_TRANSPARENT);
            dc.drawText(cx, h * 81 / 100, Graphics.FONT_XTINY,
                fitText(dc, ex["p"] as String, Graphics.FONT_XTINY, w * 60 / 100), center);
        }
        dc.setColor(Graphics.COLOR_DK_GRAY, Graphics.COLOR_TRANSPARENT);
        dc.drawText(cx, h * 87 / 100, Graphics.FONT_XTINY,
            fitText(dc, WatchUi.loadResource(Rez.Strings.HintLog) as String, Graphics.FONT_XTINY, w * 52 / 100),
            center);
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
            var step = AppSettings.weightStep();
            view.weight = view.weight >= step ? view.weight - step : 0.0;
        }
        WatchUi.requestUpdate();
        return true;
    }

    function onPreviousPage() as Boolean {
        if (view.editReps) {
            view.reps += 1;
        } else {
            view.weight += AppSettings.weightStep();
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
