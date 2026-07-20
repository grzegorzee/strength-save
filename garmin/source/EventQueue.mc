import Toybox.Application;
import Toybox.Lang;

// Kolejka zdarzeń odhaczeń w Storage (idempotentne eventId) — trening działa
// bez łączności; finalna wysyłka w WorkoutState.finish(), a garminIngest
// deduplikuje po eventId, więc podwójna wysyłka jest bezpieczna.
module EventQueue {
    function all() as Array {
        var value = Application.Storage.getValue("events");
        return value == null ? ([] as Array) : value as Array;
    }

    function push(event as Dictionary) as Void {
        var events = all();
        events.add(event);
        Application.Storage.setValue("events", events);
    }

    function size() as Number {
        return all().size();
    }

    function clear() as Void {
        Application.Storage.setValue("events", []);
    }
}
