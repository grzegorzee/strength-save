import Toybox.Application;
import Toybox.Lang;
import Toybox.System;
import Toybox.Time;
import Toybox.Time.Gregorian;

// Stan treningu na zegarku: kontekst dnia z garminDay + lokalne odhaczenia
// (Storage — przeżywa wyjście z apki), kolejka zdarzeń do garminIngest.
// mode: "plan" (dzień z garminDay) | "quick" (szybki trening ad-hoc).
module WorkoutState {
    // day: {v,d,y,n,f,e:[{i,n,t,p,s:[[reps,kg]]}]}; done: {"exIdx#setIdx" => [reps,kg,atMs]}
    function day() as Dictionary or Null {
        return Application.Storage.getValue("day") as Dictionary or Null;
    }

    function todayString() as String {
        var now = Gregorian.info(Time.now(), Time.FORMAT_SHORT);
        return now.year.format("%04d") + "-" + now.month.format("%02d") + "-" + now.day.format("%02d");
    }

    function isQuick() as Boolean {
        return "quick".equals(Application.Storage.getValue("mode"));
    }

    function setDay(context as Dictionary) as Void {
        Application.Storage.setValue("day", context);
        Application.Storage.setValue("mode", "plan");
        // Nowy dzień = nowy trening: czyścimy postęp starszego dnia.
        var current = Application.Storage.getValue("dayDate");
        if (current == null || !current.equals(context["d"])) {
            Application.Storage.setValue("dayDate", context["d"]);
            Application.Storage.setValue("done", {});
            Application.Storage.setValue("workoutId", null);
            Application.Storage.setValue("startedAt", null);
        }
    }

    // Szybki trening: syntetyczny dzień ad-hoc w konwencji telefonu
    // (adhoc-<data>-<ms>, sufiks MUSI być liczbą — regex klienta).
    function startQuick(title as String) as Void {
        var date = todayString();
        Application.Storage.setValue("day", {
            "d" => date,
            "y" => "adhoc-" + date + "-" + nowMs().toString(),
            "n" => title,
            "e" => [],
        });
        Application.Storage.setValue("dayDate", date);
        Application.Storage.setValue("done", {});
        Application.Storage.setValue("workoutId", null);
        Application.Storage.setValue("startedAt", null);
        Application.Storage.setValue("mode", "quick");
    }

    // Po wysłanym szybkim treningu wracamy do trybu planu (świeży fetch dnia).
    function clearQuick() as Void {
        Application.Storage.deleteValue("day");
        Application.Storage.setValue("mode", "plan");
    }

    // Dodaje ćwiczenie z listy ostatnich (r z garminDay) do szybkiego treningu:
    // 3 serie z pre-fill z ostatniego wykonania.
    function addQuickExercise(recent as Dictionary) as Void {
        var d = day();
        if (d == null) { return; }
        var reps = recent["p"] as Number;
        var weightKg = recent["w"];
        var exercises = d["e"] as Array;
        exercises.add({
            "i" => recent["i"],
            "n" => recent["n"],
            "s" => [[reps, weightKg], [reps, weightKg], [reps, weightKg]],
        });
        Application.Storage.setValue("day", d);
    }

    // Serie logowane są po kolei, więc ciągły prefiks done == liczba zaliczonych.
    function doneCountContiguous(exIdx as Number) as Number {
        var i = 0;
        while (isDone(exIdx, i)) { i += 1; }
        return i;
    }

    function done() as Dictionary {
        var value = Application.Storage.getValue("done");
        return value == null ? ({} as Dictionary) : value as Dictionary;
    }

    function isDone(exIdx as Number, setIdx as Number) as Boolean {
        return done().hasKey(exIdx.toString() + "#" + setIdx.toString());
    }

    function nowMs() as Long {
        // .toLong() PRZED mnożeniem: sekundy epoch * 1000 przepełniają 32-bit Number.
        return Time.now().value().toLong() * 1000;
    }

    // Czas trwania sesji (s); 0 zanim padnie pierwsza seria (startedAt null).
    // Sanity: startedAt zapisane starym kodem (przepełniony 32-bit Number zamiast
    // Long) daje absurdalny diff — wszystko poza [0, 24h] traktuj jak brak sesji.
    function sessionElapsedSec() as Number {
        var startedAt = Application.Storage.getValue("startedAt");
        if (startedAt == null) { return 0; }
        var diff = (nowMs() - (startedAt as Long).toLong()) / 1000;
        if (diff < 0 || diff > 86400) { return 0; }
        return diff.toNumber();
    }

    // Statystyki bieżącej sesji z mapy done: {"sets" => Number, "tonnage" => Float (kg)}.
    function sessionStats() as Dictionary {
        var progress = done();
        var keys = progress.keys();
        var tonnage = 0.0;
        for (var i = 0; i < keys.size(); i++) {
            var entry = progress[keys[i]] as Array;
            var reps = entry[0] as Number;
            var kg = entry[1];
            tonnage += reps * (kg instanceof Float ? kg as Float : (kg as Number).toFloat());
        }
        return { "sets" => keys.size(), "tonnage" => tonnage };
    }

    function ensureWorkoutStarted() as Void {
        if (Application.Storage.getValue("workoutId") == null) {
            var d = day();
            var date = d == null ? "unknown" : d["d"] as String;
            Application.Storage.setValue("workoutId", "w-" + date + "-" + nowMs().toString());
            Application.Storage.setValue("startedAt", nowMs());
            // Kontekst dnia sesji przybity w chwili startu: finalna wysyłka po
            // zmianie dnia (serie z wtorku wysyłane w środę) ma nieść datę i dayId
            // dnia, w którym serie PADŁY, nie dnia wysyłki.
            if (d != null) {
                Application.Storage.setValue("sessionDay", {
                    "d" => d["d"], "y" => d["y"], "n" => d["n"],
                });
            }
            SessionRecorder.start();
        }
    }

    // Odhaczenie serii: lokalny stan + zdarzenie do kolejki.
    function logSet(exIdx as Number, setIdx as Number, reps as Number, weightKg as Float) as Void {
        ensureWorkoutStarted();
        var d = day();
        if (d == null) { return; }
        var exercises = d["e"] as Array;
        var exercise = exercises[exIdx] as Dictionary;

        var progress = done();
        progress[exIdx.toString() + "#" + setIdx.toString()] = [reps, weightKg, nowMs()];
        Application.Storage.setValue("done", progress);

        EventQueue.push({
            "id" => "e-" + nowMs().toString() + "-" + exIdx.toString() + "-" + setIdx.toString(),
            "exerciseId" => exercise["i"],
            "exerciseName" => exercise["n"],
            "setIndex" => setIdx,
            "reps" => reps,
            "weight" => weightKg,
            "at" => nowMs(),
        });
    }

    var _finishCb = null;

    // Zakończenie: finalna wysyłka wszystkich zdarzeń + zapis sesji FIT.
    function finish(callback as Method(ok as Boolean) as Void) as Void {
        var d = day();
        // Serie należą do dnia, w którym padły (sessionDay z chwili startu);
        // bieżący day() to tylko fallback dla sesji sprzed tego mechanizmu.
        var sd = Application.Storage.getValue("sessionDay");
        var src = sd == null ? d : sd as Dictionary;
        if (src == null) { callback.invoke(false); return; }
        var payload = {
            "workoutId" => Application.Storage.getValue("workoutId"),
            "date" => src["d"],
            "dayId" => src["y"],
            "dayName" => src["n"],
            "startedAt" => Application.Storage.getValue("startedAt"),
            "finishedAt" => nowMs(),
            "events" => EventQueue.all(),
        };
        SessionRecorder.stopAndSave();
        _finishCb = callback;
        Api.ingest(payload, new Lang.Method($.WorkoutState, :onFinishResponse));
    }

    function onFinishResponse(ok as Boolean) as Void {
        if (ok) {
            EventQueue.clear();
            Application.Storage.setValue("workoutId", null);
            Application.Storage.deleteValue("sessionDay");
        }
        var cb = _finishCb;
        _finishCb = null;
        if (cb != null) { (cb as Method).invoke(ok); }
    }

    // Odrzucenie treningu: czyści kolejkę i stan sesji LOKALNIE, nic nie wysyła,
    // nagranie FIT idzie do kosza. Wyjście ze stanu "wiszące serie" bez zapisu
    // (reguła 6: guard bez ścieżki wyjścia to pułapka).
    function discard() as Void {
        SessionRecorder.discard();
        EventQueue.clear();
        Application.Storage.setValue("workoutId", null);
        Application.Storage.setValue("startedAt", null);
        Application.Storage.setValue("done", {});
        Application.Storage.deleteValue("sessionDay");
        if (isQuick()) { clearQuick(); }
    }
}
