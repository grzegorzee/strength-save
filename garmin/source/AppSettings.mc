import Toybox.Application;
import Toybox.Lang;

// Ustawienia apki na zegarku (Application.Storage).
// Krok zmiany ciężaru konfigurowalny z menu dnia (user: 2.5 kg to za dużo
// przy hantlach/maszynach, potrzebne też 0.5).
module AppSettings {
    const STEPS = [0.5, 1.0, 1.25, 2.5, 5.0];

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
