import Toybox.Application;
import Toybox.Communications;
import Toybox.Lang;
import Toybox.System;

// Warstwa HTTP do Cloud Functions. Odpowiedzi makeWebRequest mają praktyczny
// limit ~8KB (BLE) — kontrakt garminDay jest kompaktowy z założenia.
// Callback usera trzymamy w zmiennej modułu (Monkey C nie ma .bind, a handler
// makeWebRequest dostaje tylko (code, data)); jedno żądanie danego typu naraz.
module Api {
    const BASE = "https://us-central1-fittracker-workouts.cloudfunctions.net";

    var _pairCb = null;
    var _dayCb = null;
    var _ingestCb = null;

    function token() {
        return Application.Storage.getValue("deviceToken");
    }

    function authHeaders() as Dictionary {
        return {
            "Content-Type" => Communications.REQUEST_CONTENT_TYPE_JSON,
            "Authorization" => "Bearer " + token(),
        };
    }

    // Wymiana kodu parowania na token urządzenia.
    function pair(code as String, callback as Method(ok as Boolean) as Void) as Void {
        _pairCb = callback;
        Communications.makeWebRequest(
            BASE + "/garminPair",
            { "code" => code, "label" => "Garmin " + System.getDeviceSettings().partNumber },
            {
                :method => Communications.HTTP_REQUEST_METHOD_POST,
                :headers => { "Content-Type" => Communications.REQUEST_CONTENT_TYPE_JSON },
                :responseType => Communications.HTTP_RESPONSE_CONTENT_TYPE_JSON,
            },
            new Lang.Method($.Api, :onPairResponse)
        );
    }

    function onPairResponse(responseCode as Number, data as Dictionary or String or Null) as Void {
        var ok = responseCode == 200 && data instanceof Dictionary && data["token"] != null;
        if (ok) {
            Application.Storage.setValue("deviceToken", (data as Dictionary)["token"]);
            Application.Storage.setValue("deviceId", (data as Dictionary)["deviceId"]);
        }
        var cb = _pairCb;
        _pairCb = null;
        if (cb != null) { (cb as Method).invoke(ok); }
    }

    // Kontekst dnia (kompaktowy JSON) na wskazaną datę.
    function fetchDay(date as String, callback as Method(day as Dictionary or Null, code as Number) as Void) as Void {
        _dayCb = callback;
        var telemetry = "&p=" + EventQueue.size().toString() + "&f=" + SessionRecorder.status();
        Communications.makeWebRequest(
            BASE + "/garminDay?date=" + date + telemetry,
            null,
            {
                :method => Communications.HTTP_REQUEST_METHOD_GET,
                :headers => authHeaders(),
                :responseType => Communications.HTTP_RESPONSE_CONTENT_TYPE_JSON,
            },
            new Lang.Method($.Api, :onDayResponse)
        );
    }

    function onDayResponse(responseCode as Number, data as Dictionary or String or Null) as Void {
        if (data instanceof Dictionary && (data as Dictionary).hasKey("z")) {
            // Opaque server-signed capability snapshot; never manufactured locally.
            Application.Storage.setValue("proCapability", (data as Dictionary)["z"]);
        }
        if (responseCode == 401) {
            // Token cofnięty — powrót do parowania.
            Application.Storage.deleteValue("deviceToken");
        }
        if (responseCode == 403) {
            // Entitlement expired: keep token and every local event. A renewed
            // subscription can retry without re-pairing or losing the workout.
            Application.Storage.setValue("proBlocked", true);
        } else if (responseCode == 200) {
            Application.Storage.setValue("proBlocked", false);
        }
        var cb = _dayCb;
        _dayCb = null;
        if (cb != null) {
            (cb as Method).invoke(responseCode == 200 && data instanceof Dictionary ? data : null, responseCode);
        }
    }

    // Wysyłka paczki zdarzeń treningu (idempotentna po workoutId/eventId).
    function ingest(payload as Dictionary, callback as Method(ok as Boolean, code as Number) as Void) as Void {
        _ingestCb = callback;
        payload["pendingEvents"] = EventQueue.size();
        payload["fitStatus"] = SessionRecorder.status();
        Communications.makeWebRequest(
            BASE + "/garminIngest",
            payload,
            {
                :method => Communications.HTTP_REQUEST_METHOD_POST,
                :headers => authHeaders(),
                :responseType => Communications.HTTP_RESPONSE_CONTENT_TYPE_JSON,
            },
            new Lang.Method($.Api, :onIngestResponse)
        );
    }

    function onIngestResponse(responseCode as Number, data as Dictionary or String or Null) as Void {
        if (data instanceof Dictionary && (data as Dictionary).hasKey("z")) {
            Application.Storage.setValue("proCapability", (data as Dictionary)["z"]);
        }
        if (responseCode == 401) {
            Application.Storage.deleteValue("deviceToken");
        }
        if (responseCode == 403) {
            Application.Storage.setValue("proBlocked", true);
        } else if (responseCode == 200) {
            Application.Storage.setValue("proBlocked", false);
        }
        var cb = _ingestCb;
        _ingestCb = null;
        if (cb != null) { (cb as Method).invoke(responseCode == 200, responseCode); }
    }
}
