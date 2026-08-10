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
    private let statusKey = "watchBridge.deviceStatus.v1"
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
        var info: [String: Any] = [
            "supported": true,
            "paired": session.isPaired,
            "watchAppInstalled": session.isWatchAppInstalled,
            "reachable": session.isReachable,
        ]
        if let status = UserDefaults.standard.dictionary(forKey: statusKey) {
            ["deviceId", "label", "healthStatus", "lastSyncAt"].forEach { key in
                if let value = status[key] { info[key] = value }
            }
            let watchPending = status["pendingEvents"] as? Int ?? 0
            let phonePending = UserDefaults.standard.stringArray(forKey: pendingKey)?.count ?? 0
            info["pendingEvents"] = max(watchPending, phonePending)
        } else {
            info["pendingEvents"] = UserDefaults.standard.stringArray(forKey: pendingKey)?.count ?? 0
            info["healthStatus"] = "unknown"
        }
        return info
    }

    func sendWorkout(json: String) throws {
        guard WCSession.isSupported() else {
            throw NSError(domain: "WatchBridge", code: 1, userInfo: [NSLocalizedDescriptionKey: "WCSession unsupported"])
        }
        var context = WCSession.default.applicationContext
        context["workout"] = json
        try WCSession.default.updateApplicationContext(context)
    }

    // MARK: - Kolejka eventów

    private func eventId(from eventJSON: String) -> String? {
        guard let data = eventJSON.data(using: .utf8),
              let object = try? JSONSerialization.jsonObject(with: data) as? [String: Any]
        else { return nil }
        return object["eventId"] as? String ?? object["id"] as? String
    }

    private func enqueue(eventJSON: String) {
        let inserted = queue.sync { () -> Bool in
            var pending = UserDefaults.standard.stringArray(forKey: pendingKey) ?? []
            if let incomingId = eventId(from: eventJSON),
               pending.contains(where: { eventId(from: $0) == incomingId }) {
                return false
            }
            pending.append(eventJSON)
            UserDefaults.standard.set(pending, forKey: pendingKey)
            return true
        }
        guard inserted else { return }
        NotificationCenter.default.post(name: Self.eventReceivedNotification, object: nil, userInfo: ["event": eventJSON])
    }

    /// Podgląd kolejki bez kasowania — dla globalnego routera (np. startWorkout),
    /// który nie może ukraść eventów właściwemu konsumentowi (WorkoutDay).
    func peekEvents() -> [String] {
        queue.sync {
            UserDefaults.standard.stringArray(forKey: pendingKey) ?? []
        }
    }

    func ackEvents(ids: [String]) {
        guard !ids.isEmpty else { return }
        queue.sync {
            let acknowledged = Set(ids)
            let pending = UserDefaults.standard.stringArray(forKey: pendingKey) ?? []
            let remaining = pending.filter { eventJSON in
                guard let data = eventJSON.data(using: .utf8),
                      let object = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
                      let id = object["id"] as? String else { return true }
                return !acknowledged.contains(id)
            }
            UserDefaults.standard.set(remaining, forKey: pendingKey)
        }
        // ACK wraca na Watch dopiero po tym, jak webview potwierdzi trwały zapis
        // draftu/usunięcia. Mergujemy context, aby nie wymazać planu dnia.
        var context = WCSession.default.applicationContext
        let previous = context["ackedEventIds"] as? [String] ?? []
        context["ackedEventIds"] = Array((previous + ids).reduce(into: [String]()) { result, id in
            if !result.contains(id) { result.append(id) }
        }.suffix(100))
        context["ackAt"] = Date().timeIntervalSince1970 * 1000
        try? WCSession.default.updateApplicationContext(context)
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

    func session(_ session: WCSession, didReceiveApplicationContext applicationContext: [String: Any]) {
        guard let status = applicationContext["deviceStatus"] as? [String: Any] else { return }
        UserDefaults.standard.set(status, forKey: statusKey)
    }

    func session(_ session: WCSession, didReceiveMessage message: [String: Any]) {
        handleIncoming(message)
    }

    func session(_ session: WCSession, didReceiveMessage message: [String: Any],
                 replyHandler: @escaping ([String: Any]) -> Void) {
        handleIncoming(message)
        replyHandler(["queued": true])
    }
}
