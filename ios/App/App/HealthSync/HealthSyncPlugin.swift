import Foundation
import Capacitor
import HealthKit

// Lokalny plugin Capacitora (Z116): zapis treningów do Apple Health (HKWorkout)
// + odczyt najnowszej masy ciała. JS: registerPlugin('HealthSync') — src/lib/health-bridge.ts.
// Minimalny własny plugin: utrzymywane pluginy ekosystemu nie wspierają ZAPISU workoutów
// (research 2026-07-19 w DECYZJE.md).
@objc(HealthSyncPlugin)
public class HealthSyncPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "HealthSyncPlugin"
    public let jsName = "HealthSync"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "isAvailable", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "requestHealthPermissions", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "writeWorkout", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "readLatestWeight", returnType: CAPPluginReturnPromise),
    ]

    private let store = HKHealthStore()

    private static let activityTypes: [String: HKWorkoutActivityType] = [
        "strength": .traditionalStrengthTraining,
        "running": .running,
        "cycling": .cycling,
        "walking": .walking,
        "hiking": .hiking,
        "swimming": .swimming,
        "jumpRope": .jumpRope,
        "hiit": .highIntensityIntervalTraining,
        "other": .other,
    ]

    @objc func isAvailable(_ call: CAPPluginCall) {
        call.resolve(["available": HKHealthStore.isHealthDataAvailable()])
    }

    @objc func requestHealthPermissions(_ call: CAPPluginCall) {
        guard HKHealthStore.isHealthDataAvailable() else {
            call.resolve(["granted": false])
            return
        }
        let toShare: Set<HKSampleType> = [HKObjectType.workoutType()]
        let toRead: Set<HKObjectType> = [HKObjectType.quantityType(forIdentifier: .bodyMass)!]
        store.requestAuthorization(toShare: toShare, read: toRead) { granted, _ in
            DispatchQueue.main.async {
                call.resolve(["granted": granted])
            }
        }
    }

    @objc func writeWorkout(_ call: CAPPluginCall) {
        guard HKHealthStore.isHealthDataAvailable() else {
            call.reject("unavailable")
            return
        }
        guard
            let typeName = call.getString("activityType"),
            let activityType = Self.activityTypes[typeName],
            let startMs = call.getDouble("startMs"),
            let endMs = call.getDouble("endMs"),
            endMs > startMs
        else {
            call.reject("invalid payload")
            return
        }

        let start = Date(timeIntervalSince1970: startMs / 1000)
        let end = Date(timeIntervalSince1970: endMs / 1000)
        let calories = call.getDouble("calories")

        let configuration = HKWorkoutConfiguration()
        configuration.activityType = activityType

        let builder = HKWorkoutBuilder(healthStore: store, configuration: configuration, device: .local())
        builder.beginCollection(withStart: start) { [weak self] began, error in
            guard let self, began else {
                DispatchQueue.main.async { call.reject("begin failed: \(error?.localizedDescription ?? "unknown")") }
                return
            }

            let finish = {
                builder.endCollection(withEnd: end) { _, _ in
                    builder.finishWorkout { workout, error in
                        DispatchQueue.main.async {
                            if workout != nil {
                                call.resolve(["ok": true])
                            } else {
                                call.reject("finish failed: \(error?.localizedDescription ?? "unknown")")
                            }
                        }
                    }
                }
            }

            if let calories, calories > 0,
               let energyType = HKObjectType.quantityType(forIdentifier: .activeEnergyBurned) {
                let quantity = HKQuantity(unit: .kilocalorie(), doubleValue: calories)
                let sample = HKQuantitySample(type: energyType, quantity: quantity, start: start, end: end)
                builder.add([sample]) { _, _ in finish() }
            } else {
                finish()
            }
        }
    }

    @objc func readLatestWeight(_ call: CAPPluginCall) {
        guard
            HKHealthStore.isHealthDataAvailable(),
            let bodyMass = HKObjectType.quantityType(forIdentifier: .bodyMass)
        else {
            call.resolve(["sample": NSNull()])
            return
        }

        let sort = NSSortDescriptor(key: HKSampleSortIdentifierEndDate, ascending: false)
        let query = HKSampleQuery(sampleType: bodyMass, predicate: nil, limit: 1, sortDescriptors: [sort]) { _, samples, _ in
            DispatchQueue.main.async {
                guard let sample = samples?.first as? HKQuantitySample else {
                    call.resolve(["sample": NSNull()])
                    return
                }
                let kg = sample.quantity.doubleValue(for: .gramUnit(with: .kilo))
                let formatter = DateFormatter()
                formatter.dateFormat = "yyyy-MM-dd"
                formatter.timeZone = .current
                call.resolve([
                    "sample": [
                        "kg": kg,
                        "date": formatter.string(from: sample.endDate),
                    ],
                ])
            }
        }
        store.execute(query)
    }
}
