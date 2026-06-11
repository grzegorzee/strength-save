import Foundation
import HealthKit

// Sesja treningowa HealthKit na czas logowania: trzyma apkę przy życiu
// (haptyka timera działa przy opuszczonej ręce), zbiera tętno/kalorie
// i zapisuje trening siłowy do Apple Health.
@MainActor
final class WorkoutSessionManager: NSObject, ObservableObject {
    static let shared = WorkoutSessionManager()

    @Published var heartRate: Double?
    @Published var isSessionRunning = false

    private let store = HKHealthStore()
    private var session: HKWorkoutSession?
    private var builder: HKLiveWorkoutBuilder?

    private override init() {
        super.init()
    }

    func start() {
        guard HKHealthStore.isHealthDataAvailable(), session == nil else { return }

        let share: Set<HKSampleType> = [HKObjectType.workoutType()]
        let read: Set<HKObjectType> = [
            HKObjectType.quantityType(forIdentifier: .heartRate)!,
            HKObjectType.quantityType(forIdentifier: .activeEnergyBurned)!,
        ]
        store.requestAuthorization(toShare: share, read: read) { [weak self] granted, _ in
            guard granted else { return }
            Task { @MainActor in
                self?.beginSession()
            }
        }
    }

    private func beginSession() {
        guard session == nil else { return }
        let config = HKWorkoutConfiguration()
        config.activityType = .traditionalStrengthTraining
        config.locationType = .indoor

        do {
            let session = try HKWorkoutSession(healthStore: store, configuration: config)
            let builder = session.associatedWorkoutBuilder()
            builder.dataSource = HKLiveWorkoutDataSource(healthStore: store, workoutConfiguration: config)
            session.delegate = self
            builder.delegate = self

            self.session = session
            self.builder = builder

            let start = Date()
            session.startActivity(with: start)
            builder.beginCollection(withStart: start) { _, _ in }
            isSessionRunning = true
        } catch {
            self.session = nil
            self.builder = nil
        }
    }

    func stop() {
        guard let session, let builder else { return }
        session.end()
        builder.endCollection(withEnd: Date()) { [weak self] _, _ in
            builder.finishWorkout { _, _ in }
            Task { @MainActor in
                self?.session = nil
                self?.builder = nil
                self?.isSessionRunning = false
                self?.heartRate = nil
            }
        }
    }
}

extension WorkoutSessionManager: HKWorkoutSessionDelegate {
    nonisolated func workoutSession(_ workoutSession: HKWorkoutSession, didChangeTo toState: HKWorkoutSessionState,
                                    from fromState: HKWorkoutSessionState, date: Date) {}

    nonisolated func workoutSession(_ workoutSession: HKWorkoutSession, didFailWithError error: Error) {
        Task { @MainActor in
            self.session = nil
            self.builder = nil
            self.isSessionRunning = false
        }
    }
}

extension WorkoutSessionManager: HKLiveWorkoutBuilderDelegate {
    nonisolated func workoutBuilder(_ workoutBuilder: HKLiveWorkoutBuilder, didCollectDataOf collectedTypes: Set<HKSampleType>) {
        guard let hrType = HKQuantityType.quantityType(forIdentifier: .heartRate),
              collectedTypes.contains(hrType),
              let stats = workoutBuilder.statistics(for: hrType),
              let value = stats.mostRecentQuantity()?.doubleValue(for: HKUnit.count().unitDivided(by: .minute()))
        else { return }
        Task { @MainActor in
            self.heartRate = value
        }
    }

    nonisolated func workoutBuilderDidCollectEvent(_ workoutBuilder: HKLiveWorkoutBuilder) {}
}
