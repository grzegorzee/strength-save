import Toybox.Application;
import Toybox.Lang;
import Toybox.WatchUi;

// Ustawienia apki na zegarku (Application.Storage), zmieniane z menu dnia:
// krok ciężaru oraz przerwy (między seriami i między ćwiczeniami — domyślne
// 90/150 s w parytecie z telefonem, rest-timer.ts DEFAULT_REST_SETTINGS).
module AppSettings {
    const STEPS = [0.5, 1.0, 1.25, 2.5, 5.0];
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
        var v = Application.Storage.getValue("weightStep");
        return v == null ? 2.5 : (v as Float);
    }

    function cycleWeightStep() as Float {
        var current = weightStep();
        var idx = 0;
        for (var i = 0; i < STEPS.size(); i++) {
            if (((STEPS[i] as Float) - current).abs() < 0.01) { idx = i; break; }
        }
        var next = STEPS[(idx + 1) % STEPS.size()] as Float;
        Application.Storage.setValue("weightStep", next);
        return next;
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

    function stepLabel() as String {
        return formatKg(weightStep()) + " kg";
    }
}
