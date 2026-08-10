import Toybox.Application;
import Toybox.Lang;
import Toybox.WatchUi;

// Ustawienia apki na zegarku (Application.Storage), zmieniane z menu dnia:
// krok ciężaru oraz przerwy (między seriami i między ćwiczeniami — domyślne
// 90/150 s w parytecie z telefonem, rest-timer.ts DEFAULT_REST_SETTINGS).
module AppSettings {
    // Canonical persistence is always kg. Pounds exist only in presentation
    // and step input, using the exact international conversion constant.
    const LB_TO_KG = 0.45359237;
    const KG_STEPS = [0.5, 1.0, 1.25, 2.5, 5.0];
    const LB_STEPS = [0.5, 1.0, 2.5, 5.0, 10.0];
    const REST_SET_STEPS = [30, 60, 90, 120, 150, 180, 240];
    const REST_EXERCISE_STEPS = [0, 60, 90, 120, 150, 180, 240, 300];

    function cycleStored(key as String, steps as Array, current as Number) as Number {
        var idx = 0;
        for (var i = 0; i < steps.size(); i++) {
            if ((steps[i] as Number) == current) { idx = i; break; }
        }
        var next = steps[(idx + 1) % steps.size()] as Number;
        Application.Storage.setValue(key, next);
        return next;
    }

    function restSetSeconds() as Number {
        var v = Application.Storage.getValue("restSetSec");
        return v == null ? 90 : (v as Number);
    }

    function cycleRestSetSeconds() as Number {
        return cycleStored("restSetSec", REST_SET_STEPS, restSetSeconds());
    }

    function restExerciseSeconds() as Number {
        var v = Application.Storage.getValue("restExSec");
        return v == null ? 150 : (v as Number);
    }

    function cycleRestExerciseSeconds() as Number {
        return cycleStored("restExSec", REST_EXERCISE_STEPS, restExerciseSeconds());
    }

    // "1:30" — czytelniejsze na kaflu menu niż "90 s".
    function formatSeconds(total as Number) as String {
        return (total / 60).toString() + ":" + (total % 60).format("%02d");
    }

    // Czas sesji: "43:12", a powyżej godziny "1:02:33".
    function formatElapsed(totalSec as Number) as String {
        if (totalSec >= 3600) {
            return (totalSec / 3600).toString() + ":"
                + ((totalSec % 3600) / 60).format("%02d") + ":"
                + (totalSec % 60).format("%02d");
        }
        return formatSeconds(totalSec);
    }

    function restSetLabel() as String {
        return formatSeconds(restSetSeconds());
    }

    function restExerciseLabel() as String {
        var v = restExerciseSeconds();
        return v == 0 ? WatchUi.loadResource(Rez.Strings.RestOff) as String : formatSeconds(v);
    }

    function weightStep() as Float {
        var key = usesLbs() ? "weightStepLb" : "weightStepKg";
        var v = Application.Storage.getValue(key);
        // Migrate the old kg-only setting without changing its meaning.
        if (v == null && !usesLbs()) { v = Application.Storage.getValue("weightStep"); }
        return v == null ? (usesLbs() ? 5.0 : 2.5) : (v as Float);
    }

    function cycleWeightStep() as Float {
        var steps = usesLbs() ? LB_STEPS : KG_STEPS;
        var current = weightStep();
        var idx = 0;
        for (var i = 0; i < steps.size(); i++) {
            if (((steps[i] as Float) - current).abs() < 0.01) { idx = i; break; }
        }
        var next = steps[(idx + 1) % steps.size()] as Float;
        Application.Storage.setValue(usesLbs() ? "weightStepLb" : "weightStepKg", next);
        return next;
    }

    function usesLbs() as Boolean {
        return "lbs".equals(Application.Storage.getValue("unit"));
    }

    function cycleUnit() as String {
        var next = usesLbs() ? "kg" : "lbs";
        Application.Storage.setValue("unit", next);
        return next;
    }

    function unitLabel() as String {
        return usesLbs() ? "lbs" : "kg";
    }

    function weightStepKg() as Float {
        return usesLbs() ? weightStep() * LB_TO_KG : weightStep();
    }

    function adjustWeightKg(valueKg as Float, direction as Number) as Float {
        var next = valueKg + weightStepKg() * direction;
        return next < 0.0 ? 0.0 : next;
    }

    // "82.5" bez zbędnych zer: 80 -> "80", 82.5 -> "82.5", 81.25 -> "81.25".
    function formatKg(value as Float) as String {
        if ((value - value.toNumber().toFloat()).abs() < 0.001) {
            return value.toNumber().toString();
        }
        var tenth = value * 10.0;
        if ((tenth - tenth.toNumber().toFloat()).abs() < 0.001) {
            return value.format("%.1f");
        }
        return value.format("%.2f");
    }

    function formatWeight(valueKg as Float) as String {
        return formatKg(usesLbs() ? valueKg / LB_TO_KG : valueKg);
    }

    function stepLabel() as String {
        return formatKg(weightStep()) + " " + unitLabel();
    }
}
