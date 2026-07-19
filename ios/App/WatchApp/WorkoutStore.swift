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
    /// Z122: liczba zdarzeń w systemowej kolejce transferUserInfo (wskaźnik "niezsynchronizowane").
    @Published var pendingEventCount = 0
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

    // MARK: - Sugestia następnej serii (one-tap log)

    struct NextSetSuggestion {
        let exerciseId: String
        let exerciseName: String
        let setIndex: Int
        let label: String
        let reps: Int
        let weight: Double // kg
    }

    /// Następna niezaliczona seria w ćwiczeniu, z wartościami do zalogowania
    /// (z serii albo z ostatniej zaliczonej). nil gdy brak sensownych wartości.
    func nextSet(in exercise: WatchExercise) -> NextSetSuggestion? {
        guard let index = exercise.sets.firstIndex(where: { !$0.completed }) else { return nil }
        let set = exercise.sets[index]
        let prior = exercise.sets.prefix(index).last(where: { $0.completed })
        let reps = set.reps > 0 ? set.reps : (prior?.reps ?? 0)
        let weight = set.weight > 0 ? set.weight : (prior?.weight ?? 0)
        guard reps > 0 else { return nil }

        let label: String
        if set.isWarmup == true {
            label = L10n.warmup
        } else {
            let warmupCount = exercise.sets.prefix(index).filter { $0.isWarmup == true }.count
            label = L10n.series(index - warmupCount + 1)
        }
        return NextSetSuggestion(
            exerciseId: exercise.id, exerciseName: exercise.name,
            setIndex: index, label: label, reps: reps, weight: weight
        )
    }

    /// Pierwsza niezaliczona seria w całym treningu (kolejność planu).
    var nextSetSuggestion: NextSetSuggestion? {
        guard let exercises = payload?.exercises else { return nil }
        for exercise in exercises {
            if let suggestion = nextSet(in: exercise) { return suggestion }
            // Ćwiczenie bez sensownych wartości, ale z niezaliczonymi seriami:
            // nie przeskakuj do następnego ćwiczenia — user musi użyć edytora.
            if exercise.sets.contains(where: { !$0.completed }) { return nil }
        }
        return nil
    }

    func log(suggestion: NextSetSuggestion) {
        logSet(
            exerciseId: suggestion.exerciseId, setIndex: suggestion.setIndex,
            reps: suggestion.reps, weight: suggestion.weight
        )
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
        // Powrót do apki w trakcie treningu: wznow sesję HealthKit.
        syncHealthSession()
    }

    // MARK: - Stan

    private func loadCached() {
        guard let data = defaults.data(forKey: storageKey) else { return }
        payload = try? JSONDecoder().decode(WatchWorkoutPayload.self, from: data)
        if let lang = payload?.lang { L10n.lang = lang }
    }

    /// Z122: odśwież licznik niezsynchronizowanych zdarzeń z kolejki systemowej.
    func refreshPendingCount() {
        pendingEventCount = WCSession.default.outstandingUserInfoTransfers.count
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
        if let lang = merged.lang { L10n.lang = lang }
        persist()
        syncHealthSession()
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
        WorkoutSessionManager.shared.start()
    }

    /// Sesja HealthKit podąża za stanem treningu (aktywny → start, koniec → stop).
    private func syncHealthSession() {
        if isActive && !isFinishedLocally {
            WorkoutSessionManager.shared.start()
        } else {
            WorkoutSessionManager.shared.stop()
        }
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
        if workingLeft && payload.timersEnabled == true {
            startRestTimer(seconds: payload.restSeconds ?? 90)
        } else {
            cancelRestTimer()
        }

        if let dayId = payload.dayId {
            sendEvent(WatchEvent.setLogged(
                date: payload.date, dayId: dayId, exerciseId: exerciseId,
                setIndex: setIndex, reps: reps, weight: weight, completed: true,
                hkSession: WorkoutSessionManager.shared.isSessionRunning
            ))
        }
    }

    func finishWorkout() {
        guard let payload, let dayId = payload.dayId else { return }
        cancelRestTimer()
        defaults.set("\(payload.date)|\(dayId)", forKey: localFinishKey)
        objectWillChange.send()
        WKInterfaceDevice.current().play(.notification)
        sendEvent(WatchEvent.workoutFinished(
            date: payload.date, dayId: dayId,
            hkSession: WorkoutSessionManager.shared.isSessionRunning
        ))
        WorkoutSessionManager.shared.stop()
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
        refreshPendingCount()
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
            self.refreshPendingCount()
        }
    }

    // Z122: kolejka systemowa dostarczyła zdarzenie — odśwież wskaźnik.
    nonisolated func session(_ session: WCSession, didFinish userInfoTransfer: WCSessionUserInfoTransfer, error: Error?) {
        Task { @MainActor in
            self.refreshPendingCount()
        }
    }

    private func handleContext(_ context: [String: Any]) {
        guard let json = context["workout"] as? String,
              let data = json.data(using: .utf8),
              let incoming = try? JSONDecoder().decode(WatchWorkoutPayload.self, from: data) else { return }
        applyIncoming(incoming)
    }
}
