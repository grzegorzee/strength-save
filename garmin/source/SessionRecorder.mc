import Toybox.Activity;
import Toybox.ActivityRecording;
import Toybox.Application;
import Toybox.Lang;

// Natywna sesja siłowa (FIT z HR) — start przy pierwszym odhaczeniu,
// stop+save przy zakończeniu; Garmin Connect dostaje trening zwykłym syncem.
module SessionRecorder {
    var _session as ActivityRecording.Session or Null = null;

    function setStatus(value as String) as Void {
        Application.Storage.setValue("fitStatus", value);
    }

    function status() as String {
        var value = Application.Storage.getValue("fitStatus");
        return value == null ? "ready" : value as String;
    }

    function start() as Void {
        if (_session != null) { return; }
        _session = ActivityRecording.createSession({
            :name => "Strength Save",
            :sport => Activity.SPORT_TRAINING,
            :subSport => Activity.SUB_SPORT_STRENGTH_TRAINING,
        });
        _session.start();
        setStatus("active");
    }

    function stopAndSave() as Void {
        if (_session == null) { return; }
        _session.stop();
        _session.save();
        _session = null;
        setStatus("saved");
    }

    // Odrzucenie treningu: porzuca nagranie FIT bez zapisu do Garmin Connect.
    function discard() as Void {
        if (_session == null) { return; }
        _session.stop();
        _session.discard();
        _session = null;
        setStatus("discarded");
    }
}
