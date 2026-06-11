import Foundation
import WatchConnectivity

// Singleton WCSession po stronie iPhone'a. Eventy z zegarka (zalogowane serie)
// trafiają do trwałej kolejki w UserDefaults — warstwa web odbiera je przez
// plugin WatchBridge (listener + drainEvents przy starcie), więc nic nie ginie
// nawet gdy webview nie żyje w momencie odbioru.
final class PhoneWatchSessionManager: NSObject {
    static let shared = PhoneWatchSessionManager()

    static let eventReceivedNotification = Notification.Name("WatchBridgeEventReceived")
    private let pendingKey = "watchBridge.pendingEvents"
    private let queue = DispatchQueue(label: "watchBridge.pending")

    private override init() {
        super.init()
    }

    func activate() {
        guard WCSession.isSupported() else { return }
        let session = WCSession.default
        session.delegate = self
        session.activate()
    }

    var statusInfo: [String: Any] {
        guard WCSession.isSupported() else {
            return ["supported": false, "paired": false, "watchAppInstalled": false, "reachable": false]
        }
        let session = WCSession.default
        return [
            "supported": true,
            "paired": session.isPaired,
            "watchAppInstalled": session.isWatchAppInstalled,
            "reachable": session.isReachable,
        ]
    }

    func sendWorkout(json: String) throws {
        guard WCSession.isSupported() else {
            throw NSError(domain: "WatchBridge", code: 1, userInfo: [NSLocalizedDescriptionKey: "WCSession unsupported"])
        }
        try WCSession.default.updateApplicationContext(["workout": json])
    }

    // MARK: - Kolejka eventów

    private func enqueue(eventJSON: String) {
        queue.sync {
            var pending = UserDefaults.standard.stringArray(forKey: pendingKey) ?? []
            pending.append(eventJSON)
            // Bezpiecznik na rozmiar kolejki.
            if pending.count > 500 { pending.removeFirst(pending.count - 500) }
            UserDefaults.standard.set(pending, forKey: pendingKey)
        }
        NotificationCenter.default.post(name: Self.eventReceivedNotification, object: nil, userInfo: ["event": eventJSON])
    }

    func drainEvents() -> [String] {
        queue.sync {
            let pending = UserDefaults.standard.stringArray(forKey: pendingKey) ?? []
            UserDefaults.standard.removeObject(forKey: pendingKey)
            return pending
        }
    }

    private func handleIncoming(_ userInfo: [String: Any]) {
        guard let json = userInfo["event"] as? String else { return }
        enqueue(eventJSON: json)
    }
}

extension PhoneWatchSessionManager: WCSessionDelegate {
    func session(_ session: WCSession, activationDidCompleteWith activationState: WCSessionActivationState, error: Error?) {}

    func sessionDidBecomeInactive(_ session: WCSession) {}

    func sessionDidDeactivate(_ session: WCSession) {
        session.activate()
    }

    func session(_ session: WCSession, didReceiveUserInfo userInfo: [String: Any] = [:]) {
        handleIncoming(userInfo)
    }

    func session(_ session: WCSession, didReceiveMessage message: [String: Any]) {
        handleIncoming(message)
    }
}
