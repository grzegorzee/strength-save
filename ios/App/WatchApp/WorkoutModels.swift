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
    var exercises: [WatchExercise]?
}

enum WatchEvent {
    static func setLogged(date: String, dayId: String, exerciseId: String, setIndex: Int, reps: Int, weight: Double, completed: Bool) -> [String: Any] {
        [
            "type": "setLogged",
            "date": date,
            "dayId": dayId,
            "exerciseId": exerciseId,
            "setIndex": setIndex,
            "reps": reps,
            "weight": weight,
            "completed": completed,
            "at": Date().timeIntervalSince1970 * 1000,
        ]
    }

    static func workoutFinished(date: String, dayId: String) -> [String: Any] {
        [
            "type": "workoutFinished",
            "date": date,
            "dayId": dayId,
            "at": Date().timeIntervalSince1970 * 1000,
        ]
    }

    static func startWorkout(date: String, dayId: String) -> [String: Any] {
        [
            "type": "startWorkout",
            "date": date,
            "dayId": dayId,
            "at": Date().timeIntervalSince1970 * 1000,
        ]
    }
}
