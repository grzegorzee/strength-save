import Toybox.Graphics;
import Toybox.Lang;
import Toybox.WatchUi;

// Parowanie: 6 cyfr wybieranych góra/dół (UP/DOWN zmienia cyfrę, SELECT/tap
// przechodzi dalej, po ostatniej cyfrze wysyła kod do garminPair).
class PairView extends WatchUi.View {
    var digits as Array<Number> = [0, 0, 0, 0, 0, 0];
    var cursor as Number = 0;
    var status as String or Null = null;
    var busy as Boolean = false;

    function initialize() {
        View.initialize();
    }

    function code() as String {
        var out = "";
        for (var i = 0; i < digits.size(); i++) {
            out += digits[i].toString();
        }
        return out;
    }

    function submit() as Void {
        busy = true;
        status = null;
        WatchUi.requestUpdate();
        Api.pair(code(), method(:onPaired));
    }

    function onPaired(ok as Boolean) as Void {
        busy = false;
        if (ok) {
            var dayView = new DayView();
            WatchUi.switchToView(dayView, new DayDelegate(dayView), WatchUi.SLIDE_LEFT);
        } else {
            status = WatchUi.loadResource(Rez.Strings.PairFailed) as String;
            WatchUi.requestUpdate();
        }
    }

    function onUpdate(dc as Dc) as Void {
        dc.setColor(Graphics.COLOR_WHITE, Graphics.COLOR_BLACK);
        dc.clear();
        var cx = dc.getWidth() / 2;
        dc.drawText(cx, dc.getHeight() / 5, Graphics.FONT_SMALL,
            WatchUi.loadResource(Rez.Strings.PairTitle) as String, Graphics.TEXT_JUSTIFY_CENTER);

        var shown = "";
        for (var i = 0; i < digits.size(); i++) {
            shown += (i == cursor) ? "[" + digits[i].toString() + "]" : digits[i].toString();
        }
        dc.drawText(cx, dc.getHeight() / 2 - 20, Graphics.FONT_NUMBER_MILD, shown, Graphics.TEXT_JUSTIFY_CENTER);

        var hint = busy
            ? WatchUi.loadResource(Rez.Strings.Loading) as String
            : (status != null ? status : WatchUi.loadResource(Rez.Strings.PairHint) as String);
        dc.drawText(cx, dc.getHeight() * 3 / 4, Graphics.FONT_XTINY, hint, Graphics.TEXT_JUSTIFY_CENTER);
    }
}

class PairDelegate extends WatchUi.BehaviorDelegate {
    var view as PairView;

    function initialize(pairView as PairView) {
        BehaviorDelegate.initialize();
        view = pairView;
    }

    function onNextPage() as Boolean {
        view.digits[view.cursor] = (view.digits[view.cursor] + 9) % 10;
        WatchUi.requestUpdate();
        return true;
    }

    function onPreviousPage() as Boolean {
        view.digits[view.cursor] = (view.digits[view.cursor] + 1) % 10;
        WatchUi.requestUpdate();
        return true;
    }

    function onSelect() as Boolean {
        if (view.busy) { return true; }
        if (view.cursor < view.digits.size() - 1) {
            view.cursor += 1;
            WatchUi.requestUpdate();
        } else {
            view.submit();
        }
        return true;
    }

    function onBack() as Boolean {
        if (view.cursor > 0) {
            view.cursor -= 1;
            WatchUi.requestUpdate();
            return true;
        }
        return false;
    }
}
