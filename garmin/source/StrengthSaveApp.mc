import Toybox.Application;
import Toybox.Lang;
import Toybox.WatchUi;

// Wejście aplikacji: bez tokenu -> parowanie; z tokenem -> dzień treningowy.
class StrengthSaveApp extends Application.AppBase {
    function initialize() {
        AppBase.initialize();
    }

    function getInitialView() as [Views] or [Views, InputDelegates] {
        var token = Application.Storage.getValue("deviceToken");
        if (token == null) {
            var pairView = new PairView();
            return [pairView, new PairDelegate(pairView)];
        }
        var dayView = new DayView();
        return [dayView, new DayDelegate(dayView)];
    }
}
