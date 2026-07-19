import Foundation

// Protokół danych iPhone <-> Watch. Musi być zgodny z payloadem budowanym
// po stronie web w src/lib/watch-bridge.ts.

struct WatchSet: Codable, Hashable {
    var reps: Int
    var weight: Double
    var completed: Bool
    var isWarmup: Bool?
}

struct WatchExercise: Codable, Identifiable, Hashable {
    var id: String
    var name: String
    var setsLabel: String?
    // Z122: cel tygodnia z silnika progresji (gotowy string z telefonu).
    var targetLabel: String?
    // Z122: przypięta notatka (X14A), przycięta na telefonie.
    var pinnedNote: String?
    var sets: [WatchSet]

    var workingSets: [WatchSet] { sets.filter { $0.isWarmup != true } }
    var completedWorkingCount: Int { workingSets.filter { $0.completed }.count }
    var isDone: Bool {
        let working = workingSets
        return !working.isEmpty && working.allSatisfy { $0.completed }
    }
}

struct WatchWorkoutPayload: Codable {
    var type: String // "todayWorkout" | "noWorkout"
    var date: String // YYYY-MM-DD
    var dayId: String?
    var dayName: String?
    var focus: String?
    var sentAt: Double
    // true = sesja aktywna na telefonie; false/nil = podgląd planu (preview).
    var active: Bool?
    // Domyślny odpoczynek między seriami (z ustawień telefonu), sekundy.
    var restSeconds: Int?
    // Globalna flaga timerów treningowych. Brak/false = timer wyłączony.
    var timersEnabled: Bool?
    // Jednostka WYŚWIETLANIA ("kg"/"lbs"). Model i eventy zawsze trzymają kg.
    var unit: String?
    // Język UI zegarka (Z122): "pl"/"en", spójny z telefonem.
    var lang: String?
    var exercises: [WatchExercise]?
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
    static var noExercise: String { t("Brak ćwiczenia", "No exercise") }
    static var pendingSync: String { t("Niezsynchronizowane serie — dojdą po odzyskaniu łączności.", "Unsynced sets — they will arrive once connection is back.") }
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

enum WatchEvent {
    static func setLogged(date: String, dayId: String, exerciseId: String, setIndex: Int, reps: Int, weight: Double, completed: Bool, hkSession: Bool = false) -> [String: Any] {
        [
            "id": UUID().uuidString,
            "type": "setLogged",
            "date": date,
            "dayId": dayId,
            "exerciseId": exerciseId,
            "setIndex": setIndex,
            "reps": reps,
            "weight": weight,
            "completed": completed,
            "at": Date().timeIntervalSince1970 * 1000,
            // Z122: telefon pomija własny zapis Health, gdy sesję prowadzi zegarek.
            "hkSession": hkSession,
        ]
    }

    static func workoutFinished(date: String, dayId: String, hkSession: Bool = false) -> [String: Any] {
        [
            "id": UUID().uuidString,
            "type": "workoutFinished",
            "date": date,
            "dayId": dayId,
            "at": Date().timeIntervalSince1970 * 1000,
            "hkSession": hkSession,
        ]
    }

    static func startWorkout(date: String, dayId: String) -> [String: Any] {
        [
            "id": UUID().uuidString,
            "type": "startWorkout",
            "date": date,
            "dayId": dayId,
            "at": Date().timeIntervalSince1970 * 1000,
        ]
    }
}
