import Foundation
import Capacitor

// Lokalny plugin Capacitora: most między warstwą web (React) a Apple Watch.
// JS: registerPlugin('WatchBridge') — patrz src/lib/watch-bridge.ts.
@objc(WatchBridgePlugin)
public class WatchBridgePlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "WatchBridgePlugin"
    public let jsName = "WatchBridge"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "isAvailable", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "sendWorkout", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "drainEvents", returnType: CAPPluginReturnPromise),
    ]

    public override func load() {
        PhoneWatchSessionManager.shared.activate()
        NotificationCenter.default.addObserver(
            self,
            selector: #selector(onWatchEvent(_:)),
            name: PhoneWatchSessionManager.eventReceivedNotification,
            object: nil
        )
    }

    deinit {
        NotificationCenter.default.removeObserver(self)
    }

    @objc private func onWatchEvent(_ notification: Notification) {
        guard let json = notification.userInfo?["event"] as? String else { return }
        notifyListeners("watchEvent", data: ["payload": json])
    }

    @objc func isAvailable(_ call: CAPPluginCall) {
        call.resolve(PhoneWatchSessionManager.shared.statusInfo)
    }

    @objc func sendWorkout(_ call: CAPPluginCall) {
        guard let payload = call.getString("payload") else {
            call.reject("Missing payload")
            return
        }
        do {
            try PhoneWatchSessionManager.shared.sendWorkout(json: payload)
            call.resolve()
        } catch {
            call.reject("updateApplicationContext failed: \(error.localizedDescription)")
        }
    }

    @objc func drainEvents(_ call: CAPPluginCall) {
        call.resolve(["events": PhoneWatchSessionManager.shared.drainEvents()])
    }
}
