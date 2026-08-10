import Toybox.Graphics;
import Toybox.Lang;
import Toybox.Timer;
import Toybox.WatchUi;

// Ekran Sesja: duży czas trwania + serie + tonaż bieżącej sesji.
// Wejścia: swipe w lewo z ekranu ćwiczenia albo pozycja "Sesja" w menu dnia.
class SessionView extends WatchUi.View {
    var uiTimer as Timer.Timer or Null = null;

    function initialize() {
        View.initialize();
    }

    function onShow() as Void {
        if (uiTimer == null) { uiTimer = new Timer.Timer(); }
        uiTimer.start(method(:onTick), 1000, true);
    }

    function onHide() as Void {
        if (uiTimer != null) { uiTimer.stop(); }
    }

    function onTick() as Void {
        WatchUi.requestUpdate();
    }

    function onUpdate(dc as Dc) as Void {
        dc.setColor(Graphics.COLOR_WHITE, Graphics.COLOR_BLACK);
        dc.clear();
        var cx = dc.getWidth() / 2;
        var h = dc.getHeight();
        var center = Graphics.TEXT_JUSTIFY_CENTER | Graphics.TEXT_JUSTIFY_VCENTER;

        dc.setColor(Graphics.COLOR_LT_GRAY, Graphics.COLOR_TRANSPARENT);
        dc.drawText(cx, h * 14 / 100, Graphics.FONT_XTINY,
            WatchUi.loadResource(Rez.Strings.SessionTitle) as String, center);

        dc.setColor(Graphics.COLOR_WHITE, Graphics.COLOR_TRANSPARENT);
        dc.drawText(cx, h * 38 / 100, Graphics.FONT_NUMBER_MEDIUM,
            AppSettings.formatElapsed(WorkoutState.sessionElapsedSec()), center);

        var stats = WorkoutState.sessionStats();
        dc.drawText(cx, h * 60 / 100, Graphics.FONT_SMALL,
            (WatchUi.loadResource(Rez.Strings.SetsLabel) as String) + ": "
                + (stats["sets"] as Number).toString(), center);
        dc.drawText(cx, h * 72 / 100, Graphics.FONT_SMALL,
            (WatchUi.loadResource(Rez.Strings.TonnageLabel) as String) + ": "
                + AppSettings.formatWeight(stats["tonnage"] as Float) + " " + AppSettings.unitLabel(), center);
    }
}

class SessionDelegate extends WatchUi.BehaviorDelegate {
    function initialize() {
        BehaviorDelegate.initialize();
    }

    function onBack() as Boolean {
        WatchUi.popView(WatchUi.SLIDE_RIGHT);
        return true;
    }

    function onSwipe(evt as WatchUi.SwipeEvent) as Boolean {
        if (evt.getDirection() == WatchUi.SWIPE_RIGHT) {
            WatchUi.popView(WatchUi.SLIDE_RIGHT);
            return true;
        }
        return false;
    }
}
