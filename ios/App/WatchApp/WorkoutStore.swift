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
    @Published var syncErrorMessage: String?
    private var restTask: Task<Void, Never>?

    private let defaults = UserDefaults.standard
    private let storageKey = "watch.workoutPayload"
    private let deviceIdKey = "watch.deviceId.v1"
    // Lokalny start z zegarka (sticky): "date|dayId" treningu wystartowanego na
    // zegarku zanim telefon potwierdzi sesję (payload active=true).
    private let localStartKey = "watch.localStart"
    // Trening zakończony z zegarka: "date|dayId" — UI pokazuje podsumowanie,
    // dopóki telefon nie przyśle nowego kontekstu.
    private let localFinishKey = "watch.localFinish"
    private let pendingEventsKey = "watch.pendingEvents.v1"
    private let sessionStartedKey = "watch.sessionStarted.v1"
    private let localDiscardKey = "watch.localDiscard.v1"
    private let restSetsOverrideKey = "watch.restSets.override.v1"
    private let restExercisesOverrideKey = "watch.restExercises.override.v1"

    /// Stabilny opaque installation id zegarka. Nie jest uid i nie daje dostępu
    /// do backendu; służy wyłącznie do konfliktów/deduplikacji protokołu.
    private var watchDeviceId: String {
        if let stored = defaults.string(forKey: deviceIdKey), !stored.isEmpty { return stored }
        let created = "watch-\(UUID().uuidString)"
        defaults.set(created, forKey: deviceIdKey)
        return created
    }

    var isFinishedLocally: Bool {
        guard let payload, let dayId = payload.dayId else { return false }
        return defaults.string(forKey: localFinishKey) == "\(payload.date)|\(dayId)"
    }

    /// Jednostka wyświetlania ciężaru (z ustawień telefonu, default kg).
    var weightUnit: WeightUnit {
        WeightUnit(rawValue: payload?.unit ?? "kg") ?? .kg
    }

    var recentExercises: [WatchRecentExercise] {
        payload?.recentExercises ?? []
    }

    var hasProAccess: Bool { payload?.capability?.active != false }

    var restBetweenSetsSeconds: Int {
        if defaults.object(forKey: restSetsOverrideKey) != nil {
            return max(15, min(600, defaults.integer(forKey: restSetsOverrideKey)))
        }
        return max(15, min(600, payload?.restBetweenSetsSeconds ?? payload?.restSeconds ?? 90))
    }

    var restBetweenExercisesSeconds: Int {
        if defaults.object(forKey: restExercisesOverrideKey) != nil {
            return max(15, min(900, defaults.integer(forKey: restExercisesOverrideKey)))
        }
        return max(15, min(900, payload?.restBetweenExercisesSeconds ?? 150))
    }

    func adjustRestBetweenSets(by delta: Int) {
        objectWillChange.send()
        defaults.set(max(15, min(600, restBetweenSetsSeconds + delta)), forKey: restSetsOverrideKey)
    }

    func adjustRestBetweenExercises(by delta: Int) {
        objectWillChange.send()
        defaults.set(max(15, min(900, restBetweenExercisesSeconds + delta)), forKey: restExercisesOverrideKey)
    }

    struct SessionStats {
        let startedAt: Date?
        let completedSets: Int
        let volumeKg: Double

        func elapsedSeconds(at now: Date) -> Int {
            guard let startedAt else { return 0 }
            return max(0, Int(now.timeIntervalSince(startedAt)))
        }
    }

    var sessionStats: SessionStats {
        let exercises = payload?.exercises ?? []
        let working = exercises.flatMap(\.workingSets).filter(\.completed)
        return SessionStats(
            startedAt: sessionStartedAt,
            completedSets: working.count,
            volumeKg: working.reduce(0) { $0 + Double($1.reps) * $1.weight }
        )
    }

    private var sessionStartedAt: Date? {
        guard let payload, let dayId = payload.dayId,
              let stored = defaults.dictionary(forKey: sessionStartedKey),
              stored["key"] as? String == "\(payload.date)|\(dayId)",
              let at = stored["at"] as? Double else { return nil }
        return Date(timeIntervalSince1970: at / 1000)
    }

    private func rememberSessionStart(date: String, dayId: String, at: Double = Date().timeIntervalSince1970 * 1000) {
        if let stored = defaults.dictionary(forKey: sessionStartedKey),
           stored["key"] as? String == "\(date)|\(dayId)" { return }
        defaults.set(["key": "\(date)|\(dayId)", "at": at], forKey: sessionStartedKey)
    }

    private static let dayFormatter: DateFormatter = {
        let formatter = DateFormatter()
        formatter.calendar = Calendar(identifier: .gregorian)
        formatter.locale = Locale(identifier: "en_US_POSIX")
        formatter.dateFormat = "yyyy-MM-dd"
        return formatter
    }()

    private var today: String { Self.dayFormatter.string(from: Date()) }

    // MARK: - Sugestia następnej serii (one-tap log)

    struct NextSetSuggestion {
        let exerciseId: String
        let exerciseName: String
        let setIndex: Int
        let label: String
        let reps: Int
        let weight: Double // kg
        let trackingType: String
        let durationSec: Double?
        let distanceM: Double?
        let assistWeight: Double?
    }

    /// Następna niezaliczona seria w ćwiczeniu, z wartościami do zalogowania
    /// (z serii albo z ostatniej zaliczonej). nil gdy brak sensownych wartości.
    func nextSet(in exercise: WatchExercise) -> NextSetSuggestion? {
        guard let index = exercise.sets.firstIndex(where: { !$0.completed }) else { return nil }
        let set = exercise.sets[index]
        let prior = exercise.sets.prefix(index).last(where: { $0.completed })
        let reps = set.reps > 0 ? set.reps : (prior?.reps ?? 0)
        let weight = set.weight > 0 ? set.weight : (prior?.weight ?? 0)
        let trackingType = exercise.trackingType ?? "weight_reps"
        let durationSec = (set.durationSec ?? 0) > 0 ? set.durationSec : prior?.durationSec
        let distanceM = (set.distanceM ?? 0) > 0 ? set.distanceM : prior?.distanceM
        let assistWeight = (set.assistWeight ?? 0) > 0 ? set.assistWeight : prior?.assistWeight
        switch trackingType {
        case "duration": guard (durationSec ?? 0) > 0 else { return nil }
        case "weight_distance_duration":
            guard (durationSec ?? 0) > 0 || (distanceM ?? 0) > 0 else { return nil }
        default: guard reps > 0 else { return nil }
        }

        let label: String
        if set.isWarmup == true {
            label = L10n.warmup
        } else {
            let warmupCount = exercise.sets.prefix(index).filter { $0.isWarmup == true }.count
            label = L10n.series(index - warmupCount + 1)
        }
        return NextSetSuggestion(
            exerciseId: exercise.id, exerciseName: exercise.name,
            setIndex: index, label: label, reps: reps, weight: weight,
            trackingType: trackingType, durationSec: durationSec,
            distanceM: distanceM, assistWeight: assistWeight
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
            reps: suggestion.reps, weight: suggestion.weight,
            trackingType: suggestion.trackingType,
            durationSec: suggestion.durationSec,
            distanceM: suggestion.distanceM,
            assistWeight: suggestion.assistWeight
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
        refreshPendingCount()
    }

    func activate() {
        guard WCSession.isSupported() else { return }
        let session = WCSession.default
        session.delegate = self
        session.activate()
        refreshPendingCount()
        normalizeCachedDay()
        // Powrót do apki w trakcie treningu: wznow sesję HealthKit.
        syncHealthSession()
    }

    // MARK: - Stan

    private func loadCached() {
        guard let data = defaults.data(forKey: storageKey) else { return }
        payload = try? JSONDecoder().decode(WatchWorkoutPayload.self, from: data)
        if let lang = payload?.lang { L10n.lang = lang }
    }

    /// Stary plan nie może po północy udawać dzisiejszego. Zachowujemy wyłącznie
    /// bezpieczną listę recent, aby quick workout działał nawet bez telefonu.
    private func normalizeCachedDay() {
        guard var payload, payload.date != today else { return }
        payload.type = "noWorkout"
        payload.date = today
        payload.dayId = nil
        payload.dayName = nil
        payload.focus = nil
        payload.sessionId = nil
        payload.active = false
        payload.exercises = nil
        payload.sentAt = Date().timeIntervalSince1970 * 1000
        self.payload = payload
        defaults.removeObject(forKey: localStartKey)
        defaults.removeObject(forKey: localFinishKey)
        persist()
    }

    /// Liczymy własną kolejkę aż do trwałego ACK telefonu; systemowy transfer
    /// nie jest dowodem zapisu do draftu.
    func refreshPendingCount() {
        pendingEventCount = pendingEvents.count
        publishDeviceStatus()
    }

    private func publishDeviceStatus() {
        guard WCSession.isSupported() else { return }
        let session = WCSession.default
        var context = session.applicationContext
        var status: [String: Any] = [
            "deviceId": watchDeviceId,
            "label": WKInterfaceDevice.current().name,
            "paired": true,
            "watchAppInstalled": true,
            "reachable": session.isReachable,
            "pendingEvents": pendingEventCount,
            "healthStatus": WorkoutSessionManager.shared.healthStatus,
        ]
        if defaults.object(forKey: "watch.lastSyncAt.v1") != nil {
            status["lastSyncAt"] = defaults.double(forKey: "watch.lastSyncAt.v1")
        }
        context["deviceStatus"] = status
        try? session.updateApplicationContext(context)
    }

    private var pendingEvents: [String] {
        defaults.stringArray(forKey: pendingEventsKey) ?? []
    }

    private func persist() {
        guard let payload, let data = try? JSONEncoder().encode(payload) else { return }
        defaults.set(data, forKey: storageKey)
    }

    /// Nowy kontekst z telefonu. Jeśli to ten sam dzień/trening, zachowujemy
    /// lokalnie zaliczone serie (zegarek może być dalej niż telefon).
    private func applyIncoming(_ incoming: WatchWorkoutPayload) {
        let incomingKey = "\(incoming.date)|\(incoming.dayId ?? "")"
        if let discard = defaults.dictionary(forKey: localDiscardKey),
           discard["key"] as? String == incomingKey,
           let discardedAt = discard["at"] as? Double,
           incoming.sentAt <= discardedAt {
            return
        }
        // Porządek w lokalnym starcie: telefon potwierdził sesję albo przyszedł
        // inny dzień/trening → lokalny override przestaje być potrzebny.
        if let localStart = defaults.string(forKey: localStartKey) {
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
        if merged.recentExercises == nil {
            merged.recentExercises = payload?.recentExercises
        }
        if let current = payload,
           current.date == incoming.date,
           current.dayId == incoming.dayId,
           let currentExercises = current.exercises,
           var incomingExercises = incoming.exercises {
            for (i, exercise) in incomingExercises.enumerated() {
                guard let local = currentExercises.first(where: { $0.id == exercise.id }) else { continue }
                var sets = exercise.sets
                for (j, localSet) in local.sets.enumerated() where j < sets.count {
                    let remoteSet = sets[j]
                    let localAt = localSet.updatedAt ?? 0
                    // Snapshot bez timestampu per seria nie jest dowodem, że jego
                    // treść jest nowsza (telefon mógł wysłać go przed drainem Watch).
                    let remoteAt = remoteSet.updatedAt ?? 0
                    // Legacy completed set without timestamp remains local-wins
                    // against an incomplete snapshot; v1 uses deterministic LWW.
                    if localAt >= remoteAt && localAt > 0
                        || (localSet.completed && !remoteSet.completed && localSet.updatedAt == nil) {
                        sets[j] = localSet
                    }
                }
                incomingExercises[i].sets = sets
            }
            merged.exercises = incomingExercises
        }
        payload = merged
        defaults.set(Date().timeIntervalSince1970 * 1000, forKey: "watch.lastSyncAt.v1")
        if let lang = merged.lang { L10n.lang = lang }
        persist()
        syncHealthSession()
        publishDeviceStatus()
    }

    // MARK: - Akcje użytkownika

    /// Start treningu z zegarka: lokalny override + event do telefonu
    /// (telefon nawiguje do WorkoutDay z autostartem i tworzy sesję).
    func startWorkout() {
        guard hasProAccess, let payload, payload.type == "todayWorkout", let dayId = payload.dayId else { return }
        objectWillChange.send()
        defaults.set("\(payload.date)|\(dayId)", forKey: localStartKey)
        rememberSessionStart(date: payload.date, dayId: dayId)
        WKInterfaceDevice.current().play(.start)
        sendEvent(WatchEvent.startWorkout(
            date: payload.date,
            dayId: dayId,
            uid: payload.uid,
            deviceId: watchDeviceId,
            sessionId: payload.sessionId
        ))
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

    func logSet(
        exerciseId: String,
        setIndex: Int,
        reps: Int,
        weight: Double,
        trackingType: String? = nil,
        durationSec: Double? = nil,
        distanceM: Double? = nil,
        assistWeight: Double? = nil
    ) {
        guard hasProAccess else { return }
        // Logowanie w trybie podglądu = niejawny start treningu.
        if !isActive { startWorkout() }
        guard var payload, var exercises = payload.exercises,
              let exIndex = exercises.firstIndex(where: { $0.id == exerciseId }),
              setIndex < exercises[exIndex].sets.count else { return }

        let eventAt = Date().timeIntervalSince1970 * 1000
        exercises[exIndex].sets[setIndex].reps = reps
        exercises[exIndex].sets[setIndex].weight = weight
        exercises[exIndex].sets[setIndex].completed = true
        exercises[exIndex].sets[setIndex].updatedAt = eventAt
        if let durationSec { exercises[exIndex].sets[setIndex].durationSec = durationSec }
        if let distanceM { exercises[exIndex].sets[setIndex].distanceM = distanceM }
        if let assistWeight { exercises[exIndex].sets[setIndex].assistWeight = assistWeight }
        payload.exercises = exercises
        self.payload = payload
        persist()

        WKInterfaceDevice.current().play(.success)

        // 90 s w ćwiczeniu, 150 s po ostatniej serii przed kolejnym ćwiczeniem.
        let exercise = exercises[exIndex]
        let workingLeft = exercise.workingSets.contains { !$0.completed }
        let laterExerciseLeft = exercises.dropFirst(exIndex + 1).contains { candidate in
            candidate.workingSets.contains { !$0.completed }
        }
        if payload.timersEnabled == true && workingLeft {
            startRestTimer(seconds: restBetweenSetsSeconds)
        } else if payload.timersEnabled == true && laterExerciseLeft {
            startRestTimer(seconds: restBetweenExercisesSeconds)
        } else {
            cancelRestTimer()
        }

        if let dayId = payload.dayId {
            sendEvent(WatchEvent.setLogged(
                date: payload.date, dayId: dayId, exerciseId: exerciseId,
                setIndex: setIndex, reps: reps, weight: weight, completed: true,
                uid: payload.uid, deviceId: watchDeviceId, sessionId: payload.sessionId,
                hkSession: WorkoutSessionManager.shared.isSessionRunning,
                at: eventAt,
                trackingType: trackingType ?? exercise.trackingType,
                durationSec: exercises[exIndex].sets[setIndex].durationSec,
                distanceM: exercises[exIndex].sets[setIndex].distanceM,
                assistWeight: exercises[exIndex].sets[setIndex].assistWeight
            ))
        }
    }

    /// Lokalny quick workout korzysta tylko z listy wygenerowanej przez telefon
    /// z ukończonej historii i pozostaje w tej samej ścieżce ad-hoc po reconnect.
    func startQuickWorkout(_ exercise: WatchRecentExercise) {
        guard hasProAccess else { return }
        let date = today
        let timestamp = Int(Date().timeIntervalSince1970 * 1000)
        let dayId = "adhoc-\(date)-\(timestamp)"
        let sets = (0..<max(1, min(6, exercise.setCount))).map { _ in
            WatchSet(
                reps: exercise.reps, weight: exercise.weight, completed: false,
                isWarmup: nil, updatedAt: nil, durationSec: nil,
                distanceM: nil, assistWeight: nil
            )
        }
        let previous = payload
        payload = WatchWorkoutPayload(
            v: 1,
            protocolVersion: 1,
            type: "todayWorkout",
            date: date,
            uid: previous?.uid,
            deviceId: previous?.deviceId,
            sessionId: nil,
            dayId: dayId,
            dayName: L10n.quickWorkout,
            focus: "",
            sentAt: Double(timestamp),
            active: true,
            restSeconds: previous?.restSeconds,
            restBetweenSetsSeconds: previous?.restBetweenSetsSeconds,
            restBetweenExercisesSeconds: previous?.restBetweenExercisesSeconds,
            timersEnabled: previous?.timersEnabled,
            unit: previous?.unit,
            lang: previous?.lang,
            capability: previous?.capability,
            exercises: [WatchExercise(
                id: exercise.id,
                name: exercise.name,
                setsLabel: "\(sets.count) × \(exercise.reps)",
                targetLabel: nil,
                pinnedNote: nil,
                trackingType: "weight_reps",
                sets: sets
            )],
            recentExercises: previous?.recentExercises
        )
        defaults.set("\(date)|\(dayId)", forKey: localStartKey)
        rememberSessionStart(date: date, dayId: dayId, at: Double(timestamp))
        persist()
        objectWillChange.send()
        WKInterfaceDevice.current().play(.start)
        sendEvent(WatchEvent.startQuickWorkout(
            date: date,
            dayId: dayId,
            exercise: exercise,
            uid: previous?.uid,
            deviceId: watchDeviceId
        ))
        WorkoutSessionManager.shared.start()
    }

    func finishWorkout() {
        guard let payload, let dayId = payload.dayId else { return }
        cancelRestTimer()
        defaults.set("\(payload.date)|\(dayId)", forKey: localFinishKey)
        objectWillChange.send()
        WKInterfaceDevice.current().play(.notification)
        sendEvent(WatchEvent.workoutFinished(
            date: payload.date, dayId: dayId,
            uid: payload.uid, deviceId: watchDeviceId, sessionId: payload.sessionId,
            hkSession: WorkoutSessionManager.shared.isSessionRunning
        ))
        WorkoutSessionManager.shared.stop()
    }

    func discardWorkout() {
        guard var payload, let dayId = payload.dayId else { return }
        let at = Date().timeIntervalSince1970 * 1000
        let key = "\(payload.date)|\(dayId)"
        let hadHealthSession = WorkoutSessionManager.shared.isSessionRunning
        sendEvent(WatchEvent.workoutDiscarded(
            date: payload.date,
            dayId: dayId,
            uid: payload.uid,
            deviceId: watchDeviceId,
            sessionId: payload.sessionId,
            hkSession: hadHealthSession,
            at: at
        ))
        defaults.set(["key": key, "at": at], forKey: localDiscardKey)
        defaults.removeObject(forKey: localStartKey)
        defaults.removeObject(forKey: localFinishKey)
        defaults.removeObject(forKey: sessionStartedKey)
        cancelRestTimer()
        WorkoutSessionManager.shared.discard()
        if dayId.hasPrefix("adhoc-") {
            payload.type = "noWorkout"
            payload.dayId = nil
            payload.dayName = nil
            payload.focus = nil
            payload.exercises = nil
        } else {
            payload.active = false
            payload.sessionId = nil
            payload.exercises = payload.exercises?.map { exercise in
                var reset = exercise
                reset.sets = exercise.sets.map { set in
                    var value = set
                    value.completed = false
                    value.updatedAt = nil
                    return value
                }
                return reset
            }
        }
        payload.sentAt = at
        self.payload = payload
        persist()
        WKInterfaceDevice.current().play(.failure)
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
        var pending = pendingEvents
        let id = event["eventId"] as? String ?? event["id"] as? String
        let alreadyQueued = id.map { candidate in
            pending.contains { queued in
                guard let data = queued.data(using: .utf8),
                      let object = try? JSONSerialization.jsonObject(with: data) as? [String: Any]
                else { return false }
                return (object["eventId"] as? String ?? object["id"] as? String) == candidate
            }
        } ?? false
        if !alreadyQueued {
            pending.append(json)
            defaults.set(pending, forKey: pendingEventsKey)
        }
        transmit(json)
        refreshPendingCount()
    }

    private func transmit(_ json: String) {
        let userInfo = ["event": json]
        let session = WCSession.default
        if session.isReachable {
            session.sendMessage(userInfo, replyHandler: { _ in
                Task { @MainActor in self.syncErrorMessage = nil }
            }) { _ in
                Task { @MainActor in self.syncErrorMessage = L10n.syncError }
                session.transferUserInfo(userInfo)
            }
        } else {
            session.transferUserInfo(userInfo)
        }
    }

    func retryPendingEvents() {
        guard !pendingEvents.isEmpty else {
            syncErrorMessage = nil
            return
        }
        syncErrorMessage = nil
        pendingEvents.forEach(transmit)
        refreshPendingCount()
    }

    private func acknowledge(ids: [String]) {
        guard !ids.isEmpty else { return }
        let acknowledged = Set(ids)
        let remaining = pendingEvents.filter { json in
            guard let data = json.data(using: .utf8),
                  let object = try? JSONSerialization.jsonObject(with: data) as? [String: Any]
            else { return true }
            let id = object["eventId"] as? String ?? object["id"] as? String
            return id.map { !acknowledged.contains($0) } ?? true
        }
        defaults.set(remaining, forKey: pendingEventsKey)
        defaults.set(Date().timeIntervalSince1970 * 1000, forKey: "watch.lastSyncAt.v1")
        if remaining.isEmpty { syncErrorMessage = nil }
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
            if error != nil { self.syncErrorMessage = L10n.syncError }
            self.refreshPendingCount()
        }
    }

    private func handleContext(_ context: [String: Any]) {
        if let ids = context["ackedEventIds"] as? [String] {
            acknowledge(ids: ids)
        }
        guard let json = context["workout"] as? String,
              let data = json.data(using: .utf8),
              let incoming = try? JSONDecoder().decode(WatchWorkoutPayload.self, from: data) else { return }
        applyIncoming(incoming)
    }
}
