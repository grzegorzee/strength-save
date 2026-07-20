import Toybox.Application;
import Toybox.Communications;
import Toybox.Lang;
import Toybox.System;

// Warstwa HTTP do Cloud Functions. Odpowiedzi makeWebRequest mają praktyczny
// limit ~8KB (BLE) — kontrakt garminDay jest kompaktowy z założenia.
module Api {
    const BASE = "https://us-central1-fittracker-workouts.cloudfunctions.net";

    function token() as String or Null {
        return Application.Storage.getValue("deviceToken") as String or Null;
    }

    function authHeaders() as Dictionary {
        return {
            "Content-Type" => Communications.REQUEST_CONTENT_TYPE_JSON,
            "Authorization" => "Bearer " + token(),
        };
    }

    // Wymiana kodu parowania na token urządzenia.
    function pair(code as String, callback as Method(ok as Boolean) as Void) as Void {
        Communications.makeWebRequest(
            BASE + "/garminPair",
            { "code" => code, "label" => "Garmin " + System.getDeviceSettings().partNumber },
            {
                :method => Communications.HTTP_REQUEST_METHOD_POST,
                :headers => { "Content-Type" => Communications.REQUEST_CONTENT_TYPE_JSON },
                :responseType => Communications.HTTP_RESPONSE_CONTENT_TYPE_JSON,
            },
            method(:onPairResponse).bind({ :callback => callback })
        );
    }

    function onPairResponse(responseCode as Number, data as Dictionary or Null, context as Dictionary) as Void {
        var ok = responseCode == 200 && data != null && data["token"] != null;
        if (ok) {
            Application.Storage.setValue("deviceToken", data["token"]);
            Application.Storage.setValue("deviceId", data["deviceId"]);
        }
        (context[:callback] as Method).invoke(ok);
    }

    // Kontekst dnia (kompaktowy JSON) na wskazaną datę.
    function fetchDay(date as String, callback as Method(day as Dictionary or Null, code as Number) as Void) as Void {
        Communications.makeWebRequest(
            BASE + "/garminDay?date=" + date,
            null,
            {
                :method => Communications.HTTP_REQUEST_METHOD_GET,
                :headers => authHeaders(),
                :responseType => Communications.HTTP_RESPONSE_CONTENT_TYPE_JSON,
            },
            method(:onDayResponse).bind({ :callback => callback })
        );
    }

    function onDayResponse(responseCode as Number, data as Dictionary or Null, context as Dictionary) as Void {
        if (responseCode == 401) {
            // Token cofnięty — powrót do parowania.
            Application.Storage.deleteValue("deviceToken");
        }
        (context[:callback] as Method).invoke(responseCode == 200 ? data : null, responseCode);
    }

    // Wysyłka paczki zdarzeń treningu (idempotentna po workoutId/eventId).
    function ingest(payload as Dictionary, callback as Method(ok as Boolean) as Void) as Void {
        Communications.makeWebRequest(
            BASE + "/garminIngest",
            payload,
            {
                :method => Communications.HTTP_REQUEST_METHOD_POST,
                :headers => authHeaders(),
                :responseType => Communications.HTTP_RESPONSE_CONTENT_TYPE_JSON,
            },
            method(:onIngestResponse).bind({ :callback => callback })
        );
    }

    function onIngestResponse(responseCode as Number, data as Dictionary or Null, context as Dictionary) as Void {
        (context[:callback] as Method).invoke(responseCode == 200);
    }
}
