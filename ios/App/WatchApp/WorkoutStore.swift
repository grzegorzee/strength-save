import Foundation
import WatchConnectivity
import WatchKit

// Centralny stan aplikacji na zegarku: odbiera dzisiejszy trening z iPhone'a
// (applicationContext), trzyma lokalny postęp w UserDefaults (działa offline)
// i odsyła zalogowane serie przez transferUserInfo (kolejkowane, niezawodne).
@MainActor
final class WorkoutStore: NSObject, ObservableObject {
    static let shared = WorkoutStore()

    @Published var payload: WatchWorkoutPayload?
    @Published var isPhoneReachable = false
    /// Koniec bieżącego odpoczynku między seriami (nil = brak timera).
    @Published var restEndsAt: Date?
    private var restTask: Task<Void, Never>?

    private let defaults = UserDefaults.standard
    private let storageKey = "watch.workoutPayload"
    // Lokalny start z zegarka (sticky): "date|dayId" treningu wystartowanego na
    // zegarku zanim telefon potwierdzi sesję (payload active=true).
    private let localStartKey = "watch.localStart"
    // Trening zakończony z zegarka: "date|dayId" — UI pokazuje podsumowanie,
    // dopóki telefon nie przyśle nowego kontekstu.
    private let localFinishKey = "watch.localFinish"

    var isFinishedLocally: Bool {
        guard let payload, let dayId = payload.dayId else { return false }
        return defaults.string(forKey: localFinishKey) == "\(payload.date)|\(dayId)"
    }

    /// Jednostka wyświetlania ciężaru (z ustawień telefonu, default kg).
    var weightUnit: WeightUnit {
        WeightUnit(rawValue: payload?.unit ?? "kg") ?? .kg
    }

    /// Czy trening jest aktywny: telefon potwierdził (active=true) albo user
    /// wystartował lokalnie na zegarku.
    var isActive: Bool {
        guard let payload, payload.type == "todayWorkout" else { return false }
        if payload.active == true { return true }
        guard let dayId = payload.dayId else { return false }
        return defaults.string(forKey: localStartKey) == "\(payload.date)|\(dayId)"
    }

    private override init() {
        super.init()
        loadCached()
    }

    func activate() {
        guard WCSession.isSupported() else { return }
        let session = WCSession.default
        session.delegate = self
        session.activate()
    }

    // MARK: - Stan

    private func loadCached() {
        guard let data = defaults.data(forKey: storageKey) else { return }
        payload = try? JSONDecoder().decode(WatchWorkoutPayload.self, from: data)
    }

    private func persist() {
        guard let payload, let data = try? JSONEncoder().encode(payload) else { return }
        defaults.set(data, forKey: storageKey)
    }

    /// Nowy kontekst z telefonu. Jeśli to ten sam dzień/trening, zachowujemy
    /// lokalnie zaliczone serie (zegarek może być dalej niż telefon).
    private func applyIncoming(_ incoming: WatchWorkoutPayload) {
        // Porządek w lokalnym starcie: telefon potwierdził sesję albo przyszedł
        // inny dzień/trening → lokalny override przestaje być potrzebny.
        if let localStart = defaults.string(forKey: localStartKey) {
            let incomingKey = "\(incoming.date)|\(incoming.dayId ?? "")"
            if incoming.active == true || localStart != incomingKey {
                defaults.removeObject(forKey: localStartKey)
            }
        }
        // Lokalny finish czyścimy, gdy przyszedł INNY trening (nowy dzień/plan).
        if let localFinish = defaults.string(forKey: localFinishKey),
           localFinish != "\(incoming.date)|\(incoming.dayId ?? "")" {
            defaults.removeObject(forKey: localFinishKey)
        }
        var merged = incoming
        if let current = payload,
           current.date == incoming.date,
           current.dayId == incoming.dayId,
           let currentExercises = current.exercises,
           var incomingExercises = incoming.exercises {
            for (i, exercise) in incomingExercises.enumerated() {
                guard let local = currentExercises.first(where: { $0.id == exercise.id }) else { continue }
                var sets = exercise.sets
                for (j, localSet) in local.sets.enumerated() where j < sets.count && localSet.completed {
                    sets[j] = localSet
                }
                incomingExercises[i].sets = sets
            }
            merged.exercises = incomingExercises
        }
        payload = merged
        persist()
    }

    // MARK: - Akcje użytkownika

    /// Start treningu z zegarka: lokalny override + event do telefonu
    /// (telefon nawiguje do WorkoutDay z autostartem i tworzy sesję).
    func startWorkout() {
        guard let payload, payload.type == "todayWorkout", let dayId = payload.dayId else { return }
        objectWillChange.send()
        defaults.set("\(payload.date)|\(dayId)", forKey: localStartKey)
        WKInterfaceDevice.current().play(.start)
        sendEvent(WatchEvent.startWorkout(date: payload.date, dayId: dayId))
    }

    func logSet(exerciseId: String, setIndex: Int, reps: Int, weight: Double) {
        // Logowanie w trybie podglądu = niejawny start treningu.
        if !isActive { startWorkout() }
        guard var payload, var exercises = payload.exercises,
              let exIndex = exercises.firstIndex(where: { $0.id == exerciseId }),
              setIndex < exercises[exIndex].sets.count else { return }

        exercises[exIndex].sets[setIndex].reps = reps
        exercises[exIndex].sets[setIndex].weight = weight
        exercises[exIndex].sets[setIndex].completed = true
        payload.exercises = exercises
        self.payload = payload
        persist()

        WKInterfaceDevice.current().play(.success)

        // Rest timer: tylko gdy w ćwiczeniu zostały serie do zrobienia.
        let exercise = exercises[exIndex]
        let workingLeft = exercise.workingSets.contains { !$0.completed }
        if workingLeft {
            startRestTimer(seconds: payload.restSeconds ?? 90)
        } else {
            cancelRestTimer()
        }

        if let dayId = payload.dayId {
            sendEvent(WatchEvent.setLogged(
                date: payload.date, dayId: dayId, exerciseId: exerciseId,
                setIndex: setIndex, reps: reps, weight: weight, completed: true
            ))
        }
    }

    func finishWorkout() {
        guard let payload, let dayId = payload.dayId else { return }
        cancelRestTimer()
        defaults.set("\(payload.date)|\(dayId)", forKey: localFinishKey)
        objectWillChange.send()
        WKInterfaceDevice.current().play(.notification)
        sendEvent(WatchEvent.workoutFinished(date: payload.date, dayId: dayId))
    }

    // MARK: - Rest timer

    private func startRestTimer(seconds: Int) {
        restTask?.cancel()
        let end = Date().addingTimeInterval(TimeInterval(seconds))
        restEndsAt = end
        restTask = Task { [weak self] in
            try? await Task.sleep(nanoseconds: UInt64(max(0, end.timeIntervalSinceNow) * 1_000_000_000))
            guard !Task.isCancelled else { return }
            await MainActor.run {
                guard let self, self.restEndsAt == end else { return }
                self.restEndsAt = nil
                WKInterfaceDevice.current().play(.notification)
            }
        }
    }

    func cancelRestTimer() {
        restTask?.cancel()
        restTask = nil
        restEndsAt = nil
    }

    private func sendEvent(_ event: [String: Any]) {
        guard let data = try? JSONSerialization.data(withJSONObject: event),
              let json = String(data: data, encoding: .utf8) else { return }
        let userInfo = ["event": json]
        let session = WCSession.default
        if session.isReachable {
            session.sendMessage(userInfo, replyHandler: nil) { _ in
                session.transferUserInfo(userInfo)
            }
        } else {
            session.transferUserInfo(userInfo)
        }
    }
}

extension WorkoutStore: WCSessionDelegate {
    nonisolated func session(_ session: WCSession, activationDidCompleteWith activationState: WCSessionActivationState, error: Error?) {
        let context = session.receivedApplicationContext
        Task { @MainActor in
            self.isPhoneReachable = session.isReachable
            self.handleContext(context)
        }
    }

    nonisolated func session(_ session: WCSession, didReceiveApplicationContext applicationContext: [String: Any]) {
        Task { @MainActor in
            self.handleContext(applicationContext)
        }
    }

    nonisolated func sessionReachabilityDidChange(_ session: WCSession) {
        let reachable = session.isReachable
        Task { @MainActor in
            self.isPhoneReachable = reachable
        }
    }

    private func handleContext(_ context: [String: Any]) {
        guard let json = context["workout"] as? String,
              let data = json.data(using: .utf8),
              let incoming = try? JSONDecoder().decode(WatchWorkoutPayload.self, from: data) else { return }
        applyIncoming(incoming)
    }
}
