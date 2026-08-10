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

        // Cyfry rysowane pojedynczo: fonty FONT_NUMBER_* mają tylko cyfry
        // (nawiasy renderują się jako tofu), więc kursor = kolor + podkreślenie.
        var font = Graphics.FONT_NUMBER_MILD;
        var gap = 8;
        var digitY = dc.getHeight() / 2 - Graphics.getFontHeight(font) / 2;
        var total = 0;
        var widths = new Array<Number>[digits.size()];
        for (var i = 0; i < digits.size(); i++) {
            widths[i] = dc.getTextWidthInPixels(digits[i].toString(), font);
            total += widths[i] + (i > 0 ? gap : 0);
        }
        var x = cx - total / 2;
        for (var i = 0; i < digits.size(); i++) {
            dc.setColor(i == cursor ? Brand.ACCENT : Graphics.COLOR_WHITE, Graphics.COLOR_TRANSPARENT);
            dc.drawText(x, digitY, font, digits[i].toString(), Graphics.TEXT_JUSTIFY_LEFT);
            if (i == cursor) {
                dc.fillRectangle(x, digitY + Graphics.getFontHeight(font) + 2, widths[i], 4);
            }
            x += widths[i] + gap;
        }
        dc.setColor(Graphics.COLOR_WHITE, Graphics.COLOR_TRANSPARENT);

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
