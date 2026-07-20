import Toybox.Application;
import Toybox.Lang;
import Toybox.System;
import Toybox.Time;

// Stan treningu na zegarku: kontekst dnia z garminDay + lokalne odhaczenia
// (Storage — przeżywa wyjście z apki), kolejka zdarzeń do garminIngest.
module WorkoutState {
    // day: {v,d,y,n,f,e:[{i,n,t,p,s:[[reps,kg]]}]}; done: {"exIdx#setIdx" => [reps,kg,atMs]}
    function day() as Dictionary or Null {
        return Application.Storage.getValue("day") as Dictionary or Null;
    }

    function setDay(context as Dictionary) as Void {
        Application.Storage.setValue("day", context);
        // Nowy dzień = nowy trening: czyścimy postęp starszego dnia.
        var current = Application.Storage.getValue("dayDate");
        if (current == null || !current.equals(context["d"])) {
            Application.Storage.setValue("dayDate", context["d"]);
            Application.Storage.setValue("done", {});
            Application.Storage.setValue("workoutId", null);
            Application.Storage.setValue("startedAt", null);
        }
    }

    function done() as Dictionary {
        var value = Application.Storage.getValue("done");
        return value == null ? ({} as Dictionary) : value as Dictionary;
    }

    function isDone(exIdx as Number, setIdx as Number) as Boolean {
        return done().hasKey(exIdx.toString() + "#" + setIdx.toString());
    }

    function nowMs() as Number {
        return Time.now().value() * 1000;
    }

    function ensureWorkoutStarted() as Void {
        if (Application.Storage.getValue("workoutId") == null) {
            var d = day();
            var date = d == null ? "unknown" : d["d"] as String;
            Application.Storage.setValue("workoutId", "w-" + date + "-" + nowMs().toString());
            Application.Storage.setValue("startedAt", nowMs());
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

    // Zakończenie: finalna wysyłka wszystkich zdarzeń + zapis sesji FIT.
    function finish(callback as Method(ok as Boolean) as Void) as Void {
        var d = day();
        if (d == null) { callback.invoke(false); return; }
        var payload = {
            "workoutId" => Application.Storage.getValue("workoutId"),
            "date" => d["d"],
            "dayId" => d["y"],
            "dayName" => d["n"],
            "startedAt" => Application.Storage.getValue("startedAt"),
            "finishedAt" => nowMs(),
            "events" => EventQueue.all(),
        };
        SessionRecorder.stopAndSave();
        Api.ingest(payload, method(:onFinishResponse).bind({ :callback => callback }));
    }

    function onFinishResponse(ok as Boolean, context as Dictionary) as Void {
        if (ok) {
            EventQueue.clear();
            Application.Storage.setValue("workoutId", null);
        }
        (context[:callback] as Method).invoke(ok);
    }
}
