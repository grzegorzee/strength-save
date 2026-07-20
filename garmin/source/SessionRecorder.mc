import Toybox.ActivityRecording;
import Toybox.Lang;

// Natywna sesja siłowa (FIT z HR) — start przy pierwszym odhaczeniu,
// stop+save przy zakończeniu; Garmin Connect dostaje trening zwykłym syncem.
module SessionRecorder {
    var _session as ActivityRecording.Session or Null = null;

    function start() as Void {
        if (_session != null) { return; }
        _session = ActivityRecording.createSession({
            :name => "Strength Save",
            :sport => ActivityRecording.SPORT_TRAINING,
            :subSport => ActivityRecording.SUB_SPORT_STRENGTH_TRAINING,
        });
        _session.start();
    }

    function stopAndSave() as Void {
        if (_session == null) { return; }
        _session.stop();
        _session.save();
        _session = null;
    }
}
