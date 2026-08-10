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
    var durationSec as Number = 0;
    var distanceM as Number = 0;
    var assistWeight as Float = 0.0;
    var isWarmup as Boolean = false;
    var editField as Number = 0;
    var restLeft as Number = 0;
    // Jeden timer UI tykający cały czas widoczności widoku: odlicza przerwę
    // ORAZ odświeża mini zegar sesji (który tyka też poza przerwą).
    var uiTimer as Timer.Timer or Null = null;

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
        if (WorkoutState.isQuick()) {
            // Serie otwarte: zawsze jest następna (można logować ponad pre-fill).
            return WorkoutState.doneCountContiguous(exIdx);
        }
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
        if (sets.size() == 0) { return; }
        var pair = sets[setIdx < sets.size() ? setIdx : sets.size() - 1] as Array;
        reps = WorkoutState.compactValue(pair, 0) as Number;
        weight = WorkoutState.asFloat(WorkoutState.compactValue(pair, 1));
        durationSec = WorkoutState.compactValue(pair, 2) as Number;
        distanceM = WorkoutState.compactValue(pair, 3) as Number;
        assistWeight = WorkoutState.asFloat(WorkoutState.compactValue(pair, 4));
        isWarmup = (WorkoutState.compactValue(pair, 5) as Number) == 1;
        var tracking = WorkoutState.trackingFor(ex);
        editField = "duration".equals(tracking) ? 0 : 1;
    }

    function logCurrent() as Void {
        var setIdx = nextSetIndex();
        if (setIdx < 0) { return; }
        var ex = exercise();
        if (ex == null) { return; }
        WorkoutState.logSet(
            exIdx, setIdx, reps, weight, durationSec, distanceM,
            assistWeight, isWarmup, WorkoutState.trackingFor(ex)
        );
        if (Attention has :vibrate) {
            Attention.vibrate([new Attention.VibeProfile(80, 300)]);
        }
        if (nextSetIndex() >= 0) {
            startRest(AppSettings.restSetSeconds());
            // Quick: zostaw wpisane wartości (user często robi kolejną serię tym
            // samym ciężarem, który właśnie skorygował). Plan: pre-fill celu serii.
            if (!WorkoutState.isQuick()) {
                loadNextSet();
            }
        } else {
            // Ostatnia seria ćwiczenia: przerwa na zmianę stanowiska (0 = wyłączona,
            // parytet resolveRestSeconds z telefonu). Po niej widok pokaże AllDone.
            var between = AppSettings.restExerciseSeconds();
            if (between > 0) { startRest(between); }
        }
        WatchUi.requestUpdate();
    }

    function startRest(seconds as Number) as Void {
        restLeft = seconds; // uiTimer już tyka
    }

    function fieldCount() as Number {
        var ex = exercise();
        if (ex == null) { return 1; }
        var tracking = WorkoutState.trackingFor(ex);
        if ("duration".equals(tracking)) { return 2; }
        if ("weight_distance_duration".equals(tracking)) { return 4; }
        return 3;
    }

    function warmupField() as Number {
        return fieldCount() - 1;
    }

    function currentValue() as String {
        var ex = exercise();
        if (ex == null) { return ""; }
        var tracking = WorkoutState.trackingFor(ex);
        if (editField == warmupField()) {
            return WatchUi.loadResource(isWarmup ? Rez.Strings.Warmup : Rez.Strings.WorkingSet) as String;
        }
        if ("duration".equals(tracking)) { return AppSettings.formatSeconds(durationSec); }
        if ("weight_distance_duration".equals(tracking)) {
            if (editField == 0) { return AppSettings.formatWeight(weight); }
            if (editField == 1) { return distanceM.toString(); }
            return AppSettings.formatSeconds(durationSec);
        }
        if ("assisted_bodyweight".equals(tracking)) {
            return editField == 0 ? reps.toString() : AppSettings.formatWeight(assistWeight);
        }
        return editField == 0 ? reps.toString() : AppSettings.formatWeight(weight);
    }

    function currentUnit() as String {
        var ex = exercise();
        if (ex == null || editField == warmupField()) { return ""; }
        var tracking = WorkoutState.trackingFor(ex);
        if ("duration".equals(tracking)) {
            return WatchUi.loadResource(Rez.Strings.DurationUnit) as String;
        }
        if ("weight_distance_duration".equals(tracking)) {
            if (editField == 1) { return WatchUi.loadResource(Rez.Strings.DistanceUnit) as String; }
            if (editField == 2) { return WatchUi.loadResource(Rez.Strings.DurationUnit) as String; }
            return AppSettings.unitLabel();
        }
        if ("assisted_bodyweight".equals(tracking) && editField == 1) {
            return (WatchUi.loadResource(Rez.Strings.AssistUnit) as String) + " " + AppSettings.unitLabel();
        }
        return editField == 0 ? WatchUi.loadResource(Rez.Strings.RepsUnit) as String : AppSettings.unitLabel();
    }

    function currentSummary() as String {
        var ex = exercise();
        if (ex == null) { return ""; }
        var tracking = WorkoutState.trackingFor(ex);
        if ("duration".equals(tracking)) { return ""; }
        if ("weight_distance_duration".equals(tracking)) {
            return AppSettings.formatWeight(weight) + " " + AppSettings.unitLabel()
                + " · " + distanceM.toString() + " m · " + AppSettings.formatSeconds(durationSec);
        }
        if ("assisted_bodyweight".equals(tracking)) {
            return reps.toString() + " × -" + AppSettings.formatWeight(assistWeight) + " " + AppSettings.unitLabel();
        }
        return reps.toString() + " " + (WatchUi.loadResource(Rez.Strings.RepsUnit) as String)
            + " · " + AppSettings.formatWeight(weight) + " " + AppSettings.unitLabel();
    }

    function adjustCurrent(direction as Number) as Void {
        var ex = exercise();
        if (ex == null) { return; }
        var tracking = WorkoutState.trackingFor(ex);
        if (editField == warmupField()) {
            isWarmup = !isWarmup;
        } else if ("duration".equals(tracking)) {
            var nextDuration = durationSec + direction * 5;
            durationSec = nextDuration < 0 ? 0 : nextDuration;
        } else if ("weight_distance_duration".equals(tracking)) {
            if (editField == 0) { weight = AppSettings.adjustWeightKg(weight, direction); }
            else if (editField == 1) {
                var nextDistance = distanceM + direction * 5;
                distanceM = nextDistance < 0 ? 0 : nextDistance;
            } else {
                var nextCarryDuration = durationSec + direction * 5;
                durationSec = nextCarryDuration < 0 ? 0 : nextCarryDuration;
            }
        } else if ("assisted_bodyweight".equals(tracking)) {
            if (editField == 0) {
                var nextAssistReps = reps + direction;
                reps = nextAssistReps < 0 ? 0 : nextAssistReps;
            }
            else { assistWeight = AppSettings.adjustWeightKg(assistWeight, direction); }
        } else if (editField == 0) {
            var nextReps = reps + direction;
            reps = nextReps < 0 ? 0 : nextReps;
        } else {
            weight = AppSettings.adjustWeightKg(weight, direction);
        }
    }

    function onShow() as Void {
        if (uiTimer == null) { uiTimer = new Timer.Timer(); }
        uiTimer.start(method(:onTick), 1000, true);
    }

    function onHide() as Void {
        if (uiTimer != null) { uiTimer.stop(); }
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

        // Mini zegar sesji (tyka od pierwszej odhaczonej serii, także w przerwie).
        var elapsed = WorkoutState.sessionElapsedSec();
        if (elapsed > 0) {
            dc.setColor(Graphics.COLOR_LT_GRAY, Graphics.COLOR_TRANSPARENT);
            dc.drawText(cx, h * 5 / 100, Graphics.FONT_XTINY, AppSettings.formatElapsed(elapsed), center);
            dc.setColor(Graphics.COLOR_WHITE, Graphics.COLOR_TRANSPARENT);
        }

        // Nagłówek: nazwa + cel (u góry okręgu węższy pas, stąd 66% szerokości).
        dc.drawText(cx, h * 12 / 100, Graphics.FONT_XTINY,
            fitText(dc, ex["n"] as String, Graphics.FONT_XTINY, w * 66 / 100), center);
        var target = WorkoutState.targetLabel(ex);
        if (target != null) {
            dc.setColor(Brand.ACCENT, Graphics.COLOR_TRANSPARENT);
            dc.drawText(cx, h * 21 / 100, Graphics.FONT_XTINY, target, center);
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
            dc.setColor(Brand.ACCENT, Graphics.COLOR_TRANSPARENT);
            dc.drawText(cx, h / 2, Graphics.FONT_SMALL,
                WatchUi.loadResource(Rez.Strings.AllDone) as String, center);
            return;
        }

        // Numer serii (quick: bez "/total", serie otwarte).
        var setLabel = WatchUi.loadResource(Rez.Strings.SetWord) as String + " " + (setIdx + 1).toString();
        if (!WorkoutState.isQuick()) {
            setLabel += "/" + sets.size().toString();
        }
        dc.setColor(Graphics.COLOR_LT_GRAY, Graphics.COLOR_TRANSPARENT);
        dc.drawText(cx, h * 30 / 100, Graphics.FONT_XTINY, setLabel, center);

        // Edytowana wartość duża w centrum; MENU przechodzi po polach typu serii.
        var bigValue = currentValue();
        var bigUnit = currentUnit();
        var smallValue = currentSummary();

        dc.setColor(Brand.ACCENT, Graphics.COLOR_TRANSPARENT);
        var bigFont = editField == warmupField() ? Graphics.FONT_SMALL : Graphics.FONT_NUMBER_MEDIUM;
        dc.drawText(cx, h * 47 / 100, bigFont, bigValue, center);
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
        view.adjustCurrent(-1);
        WatchUi.requestUpdate();
        return true;
    }

    function onPreviousPage() as Boolean {
        view.adjustCurrent(1);
        WatchUi.requestUpdate();
        return true;
    }

    function onSelect() as Boolean {
        if (view.restLeft > 0) {
            // Tap w timer = pomiń odpoczynek.
            view.restLeft = 1;
            view.onTick();
            return true;
        }
        view.logCurrent();
        return true;
    }

    function onMenu() as Boolean {
        // MENU przełącza pola właściwe dla typu serii + warm-up/working.
        view.editField = (view.editField + 1) % view.fieldCount();
        WatchUi.requestUpdate();
        return true;
    }

    function onBack() as Boolean {
        WatchUi.popView(WatchUi.SLIDE_RIGHT);
        return true;
    }

    function onSwipe(evt as WatchUi.SwipeEvent) as Boolean {
        if (evt.getDirection() == WatchUi.SWIPE_LEFT) {
            WatchUi.pushView(new SessionView(), new SessionDelegate(), WatchUi.SLIDE_LEFT);
            return true;
        }
        return false;
    }
}
