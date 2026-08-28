import Foundation

// Protokół danych iPhone <-> Watch. Musi być zgodny z payloadem budowanym
// po stronie web w src/lib/watch-bridge.ts.

struct WatchSet: Codable, Hashable {
    var reps: Int
    var weight: Double
    var completed: Bool
    var isWarmup: Bool?
    // Wspólny LWW telefon<->Watch<->chmura; kanoniczny zapis zachowuje metadane.
    var updatedAt: Double?
    var updatedEventId: String? = nil
    var durationSec: Double?
    var distanceM: Double?
    var assistWeight: Double?
}

struct WatchRecentExercise: Codable, Identifiable, Hashable {
    var id: String
    var name: String
    var setCount: Int
    var reps: Int
    var weight: Double // kg
}

struct WatchExercise: Codable, Identifiable, Hashable {
    var id: String
    var name: String
    var setsLabel: String?
    // Z122: cel tygodnia z silnika progresji (gotowy string z telefonu).
    var targetLabel: String?
    // Z122: przypięta notatka (X14A), przycięta na telefonie.
    var pinnedNote: String?
    var trackingType: String?
    var sets: [WatchSet]

    var workingSets: [WatchSet] { sets.filter { $0.isWarmup != true } }
    var completedWorkingCount: Int { workingSets.filter { $0.completed }.count }
    var isDone: Bool {
        let working = workingSets
        return !working.isEmpty && working.allSatisfy { $0.completed }
    }
}

struct WatchCapabilitySnapshot: Codable {
    var v: Int
    var active: Bool
    var tier: String
    var expiresAt: String?
    // Addytywne v1: expired może domknąć aktywną sesję; revoked nie może.
    var inactiveReason: String?
}

struct WatchWorkoutPayload: Codable {
    // X25/Z224: addytywne pola wersjonowanego protokołu. Stary Watch ignoruje
    // nieznane klucze, a nowy nadal dekoduje snapshoty bez tych pól.
    var v: Int?
    var protocolVersion: Int?
    var type: String // "todayWorkout" | "noWorkout"
    var date: String // YYYY-MM-DD
    var uid: String?
    var deviceId: String?
    var sessionId: String?
    var dayId: String?
    var dayName: String?
    var focus: String?
    var sentAt: Double
    // true = sesja aktywna na telefonie; false/nil = podgląd planu (preview).
    var active: Bool?
    // Domyślny odpoczynek między seriami (z ustawień telefonu), sekundy.
    var restSeconds: Int?
    var restBetweenSetsSeconds: Int?
    var restBetweenExercisesSeconds: Int?
    // Globalna flaga timerów treningowych. Brak/false = timer wyłączony.
    var timersEnabled: Bool?
    // Dobrowolne funkcje zdrowotne. Brak/false = trening i kolejka działają,
    // ale Watch nie uruchamia, nie odzyskuje ani nie zapisuje HealthKit.
    var healthFeaturesEnabled: Bool?
    // Jednostka WYŚWIETLANIA ("kg"/"lbs"). Model i eventy zawsze trzymają kg.
    var unit: String?
    // Język UI zegarka (Z122): "pl"/"en", spójny z telefonem.
    var lang: String?
    // Z227: Apple Watch dziedziczy jeden stan PRO z iPhone'a. Brak = legacy allow.
    var capability: WatchCapabilitySnapshot?
    var exercises: [WatchExercise]?
    var recentExercises: [WatchRecentExercise]?
}

/// Trwała granica także dla systemowego recovery, które może nastąpić zanim UI
/// odtworzy payload. Stary kontekst bez pola jest celowo traktowany jak false.
enum WatchHealthFeatureGate {
    private static let key = "watch.healthFeaturesEnabled.v1"

    static var isEnabled: Bool {
        UserDefaults.standard.bool(forKey: key)
    }

    static func update(_ enabled: Bool?) {
        UserDefaults.standard.set(enabled == true, forKey: key)
    }
}

// Z122: minimalny słownik UI zegarka (PL/EN) — bez katalogów lokalizacji,
// język przychodzi w payloadzie z telefonu.
enum L10n {
    static var lang: String = "pl"

    static func t(_ pl: String, _ en: String) -> String {
        lang == "en" ? en : pl
    }

    static var warmup: String { t("Rozgrzewka", "Warm-up") }
    static func series(_ n: Int) -> String { t("Seria \(n)", "Set \(n)") }
    static var logSet: String { t("Zalicz serię", "Log set") }
    static var reps: String { t("Powt.", "Reps") }
    static var weight: String { t("Ciężar", "Weight") }
    static var duration: String { t("Czas (s)", "Time (s)") }
    static var distance: String { t("Dystans (m)", "Distance (m)") }
    static var assistance: String { t("Asysta", "Assistance") }
    static var noExercise: String { t("Brak ćwiczenia", "No exercise") }
    static var pendingSync: String { t("Niezsynchronizowane serie — dojdą po odzyskaniu łączności.", "Unsynced sets — they will arrive once connection is back.") }
    static func pendingEvents(_ n: Int) -> String { t("Oczekujące zdarzenia: \(n)", "Pending events: \(n)") }
    static var syncError: String { t("Nie udało się wysłać. Dane są bezpieczne na zegarku.", "Could not send. Your data is safe on the watch.") }
    static var retry: String { t("Spróbuj ponownie", "Retry") }
    static var openPhone: String { t("Otwórz Strength Save na iPhonie, żeby wysłać trening na zegarek.", "Open Strength Save on your iPhone to send the workout to the watch.") }
    static var workoutDone: String { t("Trening zakończony", "Workout finished") }
    static func doneSets(_ n: Int) -> String { t("Zaliczone serie: \(n). Szczegóły na iPhonie.", "Sets logged: \(n). Details on your iPhone.") }
    static var restDay: String { t("Dziś odpoczynek", "Rest day") }
    static var startWorkout: String { t("Rozpocznij trening", "Start workout") }
    static var startFooter: String { t("Możesz też od razu zaliczyć serię — trening wystartuje sam.", "You can also just log a set — the workout starts automatically.") }
    static var finishWorkout: String { t("Zakończ trening", "Finish workout") }
    static var finishFooter: String { t("Serie zapisują się na iPhonie na bieżąco.", "Sets sync to your iPhone as you go.") }
    static func confirmFinish(_ n: Int) -> String { t("Zakończyć trening? Zaliczone serie: \(n).", "Finish workout? Sets logged: \(n).") }
    static var finishAndSave: String { t("Zakończ i zapisz", "Finish and save") }
    static var back: String { t("Wróć", "Back") }
    static var rest: String { t("Odpoczynek", "Rest") }
    static var quickWorkout: String { t("Szybki trening", "Quick workout") }
    static var recentExercises: String { t("Ostatnie ćwiczenia", "Recent exercises") }
    static var noRecentExercises: String { t("Zrób trening na telefonie, aby pojawiła się bezpieczna lista ćwiczeń.", "Complete a phone workout to build a safe exercise list.") }
    static var stats: String { t("Czas · serie · tonaż", "Time · sets · volume") }
    static var discardWorkout: String { t("Odrzuć trening", "Discard workout") }
    static var discardConfirm: String { t("Odrzucić lokalną sesję? Zapisane serie zostaną usunięte po synchronizacji.", "Discard the local session? Logged sets will be removed after sync.") }
    static var discard: String { t("Odrzuć", "Discard") }
    static var restSettings: String { t("Ustawienia przerw", "Rest settings") }
    static var betweenSets: String { t("Między seriami", "Between sets") }
    static var betweenExercises: String { t("Między ćwiczeniami", "Between exercises") }
    static var localSetting: String { t("Zmiana zostaje na zegarku i nie jest cicho resetowana snapshotem telefonu.", "The watch keeps this change and a phone snapshot will not silently reset it.") }
    static var proRequired: String { t("PRO jest nieaktywne. Odnów dostęp w aplikacji na telefonie.", "PRO is inactive. Renew access in the phone app.") }
}

// Jednostka ciężaru: konwersja tylko w warstwie UI, zapis zawsze w kg.
enum WeightUnit: String {
    case kg
    case lbs

    static let lbsPerKg = 2.2046226218

    var label: String { rawValue }
    /// Krok steppera/koronki w jednostce wyświetlania.
    var step: Double { self == .kg ? 2.5 : 5.0 }

    func toDisplay(_ kg: Double) -> Double {
        self == .kg ? kg : kg * Self.lbsPerKg
    }

    func toKg(_ display: Double) -> Double {
        let kg = self == .kg ? display : display / Self.lbsPerKg
        // 2 miejsca wystarczą; bez tego po konwersji lbs zostaje szum floatów.
        return (kg * 100).rounded() / 100
    }
}

extension WatchSet {
    func valueText(unit: WeightUnit, trackingType: String?) -> String {
        switch trackingType {
        case "duration":
            return "\(Int(durationSec ?? 0)) s"
        case "weight_distance_duration":
            return "\(unit.toDisplay(weight).weightText) \(unit.label) · \((distanceM ?? 0).weightText) m · \(Int(durationSec ?? 0)) s"
        case "assisted_bodyweight":
            return "\(reps) × -\(unit.toDisplay(assistWeight ?? 0).weightText) \(unit.label)"
        case "bodyweight_reps":
            return "\(reps) × BW"
        default:
            return "\(reps) × \(unit.toDisplay(weight).weightText) \(unit.label)"
        }
    }
}

enum WatchEvent {
    private static func metadata(
        id: String,
        canonicalType: String,
        uid: String?,
        deviceId: String,
        sessionId: String?
    ) -> [String: Any] {
        var value: [String: Any] = [
            "protocolVersion": 1,
            "id": id,
            "eventId": id,
            "canonicalType": canonicalType,
            "deviceId": deviceId,
        ]
        if let uid { value["uid"] = uid }
        if let sessionId { value["sessionId"] = sessionId }
        return value
    }

    static func setLogged(
        date: String,
        dayId: String,
        exerciseId: String,
        setIndex: Int,
        reps: Int,
        weight: Double,
        completed: Bool,
        uid: String? = nil,
        deviceId: String,
        sessionId: String? = nil,
        eventId: String = UUID().uuidString,
        hkSession: Bool = false,
        at: Double = Date().timeIntervalSince1970 * 1000,
        trackingType: String? = nil,
        durationSec: Double? = nil,
        distanceM: Double? = nil,
        assistWeight: Double? = nil
    ) -> [String: Any] {
        var value = metadata(
            id: eventId,
            canonicalType: "set_logged",
            uid: uid,
            deviceId: deviceId,
            sessionId: sessionId
        )
        value.merge([
            "type": "setLogged",
            "date": date,
            "dayId": dayId,
            "exerciseId": exerciseId,
            "setIndex": setIndex,
            "reps": reps,
            "weight": weight,
            "completed": completed,
            "at": at,
            // Z122: telefon pomija własny zapis Health, gdy sesję prowadzi zegarek.
            "hkSession": hkSession,
        ]) { _, new in new }
        if let trackingType { value["trackingType"] = trackingType }
        if let durationSec { value["durationSec"] = durationSec }
        if let distanceM { value["distanceM"] = distanceM }
        if let assistWeight { value["assistWeight"] = assistWeight }
        return value
    }

    static func workoutFinished(
        date: String,
        dayId: String,
        uid: String? = nil,
        deviceId: String,
        sessionId: String? = nil,
        hkSession: Bool = false
    ) -> [String: Any] {
        let id = UUID().uuidString
        var value = metadata(
            id: id,
            canonicalType: "session_finished",
            uid: uid,
            deviceId: deviceId,
            sessionId: sessionId
        )
        value.merge([
            "type": "workoutFinished",
            "date": date,
            "dayId": dayId,
            "at": Date().timeIntervalSince1970 * 1000,
            "hkSession": hkSession,
        ]) { _, new in new }
        return value
    }

    static func startWorkout(
        date: String,
        dayId: String,
        uid: String? = nil,
        deviceId: String,
        sessionId: String? = nil
    ) -> [String: Any] {
        let id = UUID().uuidString
        var value = metadata(
            id: id,
            canonicalType: "session_started",
            uid: uid,
            deviceId: deviceId,
            sessionId: sessionId
        )
        value.merge([
            "type": "startWorkout",
            "date": date,
            "dayId": dayId,
            "at": Date().timeIntervalSince1970 * 1000,
        ]) { _, new in new }
        return value
    }

    static func startQuickWorkout(
        date: String,
        dayId: String,
        exercise: WatchRecentExercise,
        uid: String? = nil,
        deviceId: String
    ) -> [String: Any] {
        let id = UUID().uuidString
        var value = metadata(
            id: id,
            canonicalType: "session_started",
            uid: uid,
            deviceId: deviceId,
            sessionId: nil
        )
        value.merge([
            "type": "startQuickWorkout",
            "date": date,
            "dayId": dayId,
            "exerciseId": exercise.id,
            "exerciseName": exercise.name,
            "setCount": exercise.setCount,
            "reps": exercise.reps,
            "weight": exercise.weight,
            "at": Date().timeIntervalSince1970 * 1000,
        ]) { _, new in new }
        return value
    }

    static func workoutDiscarded(
        date: String,
        dayId: String,
        uid: String? = nil,
        deviceId: String,
        sessionId: String? = nil,
        hkSession: Bool = false,
        at: Double = Date().timeIntervalSince1970 * 1000
    ) -> [String: Any] {
        let id = UUID().uuidString
        var value = metadata(
            id: id,
            canonicalType: "session_discarded",
            uid: uid,
            deviceId: deviceId,
            sessionId: sessionId
        )
        value.merge([
            "type": "workoutDiscarded",
            "date": date,
            "dayId": dayId,
            "at": at,
            "hkSession": hkSession,
        ]) { _, new in new }
        return value
    }
}
