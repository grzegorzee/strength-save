import HealthKit
import WatchKit

final class WatchExtensionDelegate: NSObject, WKExtensionDelegate {
    func handle(_ workoutConfiguration: HKWorkoutConfiguration) {
        Task { @MainActor in
            WorkoutSessionManager.shared.recover(configuration: workoutConfiguration)
        }
    }
}
