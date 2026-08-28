import HealthKit
import WatchKit

final class WatchExtensionDelegate: NSObject, WKExtensionDelegate {
    func handle(_ workoutConfiguration: HKWorkoutConfiguration) {
        guard WatchHealthFeatureGate.isEnabled else { return }
        Task { @MainActor in
            WorkoutSessionManager.shared.recover(configuration: workoutConfiguration)
        }
    }
}
