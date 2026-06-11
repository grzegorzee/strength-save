import Foundation
import Capacitor

// Subclass kontrolera Capacitora — jedyne wspierane miejsce na rejestrację
// pluginów lokalnych (w obrębie targetu App). Podpięty w Main.storyboard.
class BridgeViewController: CAPBridgeViewController {
    override open func capacitorDidLoad() {
        bridge?.registerPluginInstance(WatchBridgePlugin())
    }
}
