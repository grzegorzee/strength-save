import UIKit
import Capacitor
import AVFoundation
import FirebaseCore
import FirebaseAppCheck

/// App Attest zamiast domyślnego DeviceCheck. Fabryka MUSI być zarejestrowana
/// zanim cokolwiek dotknie Firebase: plugin authentication tworzy instancję
/// App Check przy starcie bridge'a i wtedy provider jest już zamrożony.
/// Rejestracja dopiero w JS (FirebaseAppCheck.initialize) przychodziła za późno,
/// token szedł przez DeviceCheck, a konsola ma tylko App Attest → wymiana padała
/// FAILED_PRECONDITION i logowanie umierało na każdym koncie (incydent 2026-08-11).
final class StrengthAppCheckProviderFactory: NSObject, AppCheckProviderFactory {
    func createProvider(with app: FirebaseApp) -> AppCheckProvider? {
        return AppAttestProvider(app: app)
    }
}

@UIApplicationMain
class AppDelegate: UIResponder, UIApplicationDelegate {

    var window: UIWindow?

    func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
        AppCheck.setAppCheckProviderFactory(StrengthAppCheckProviderFactory())
        if FirebaseApp.app() == nil {
            FirebaseApp.configure()
        }
        // Aktywuj sesję Watch jak najwcześniej — eventy z zegarka (transferUserInfo)
        // muszą trafić do kolejki nawet zanim załaduje się webview.
        PhoneWatchSessionManager.shared.activate()
        configureAudioSession()
        // Z177: po przerwaniu sesji audio (telefon, Siri, inne media) system NIE
        // przywraca jej sam — bez reaktywacji gongi milkły do restartu apki.
        NotificationCenter.default.addObserver(
            self,
            selector: #selector(handleAudioSessionInterruption(_:)),
            name: AVAudioSession.interruptionNotification,
            object: AVAudioSession.sharedInstance()
        )
        return true
    }

    @objc private func handleAudioSessionInterruption(_ notification: Notification) {
        guard let info = notification.userInfo,
              let typeValue = info[AVAudioSessionInterruptionTypeKey] as? UInt,
              let type = AVAudioSession.InterruptionType(rawValue: typeValue),
              type == .ended else { return }
        configureAudioSession()
    }

    /// Sygnał końca przerwy MUSI być słyszalny na siłowni.
    ///
    /// Domyślna kategoria sesji audio WKWebView (.ambient) jest wyciszana przez
    /// boczny przełącznik ciszy na iPhone — user zgłosił po realnym treningu, że
    /// słyszy tylko cichą wibrację. Kategoria .playback ignoruje ten przełącznik.
    ///
    /// .duckOthers + .mixWithOthers: muzyka z AirPodsów NIE jest przerywana, tylko
    /// przyciszana na czas beepa. Na siłowni to jedyny sensowny wariant.
    private func configureAudioSession() {
        do {
            try AVAudioSession.sharedInstance().setCategory(
                .playback,
                mode: .default,
                options: [.mixWithOthers, .duckOthers]
            )
            try AVAudioSession.sharedInstance().setActive(true)
        } catch {
            // Bez sesji audio zostaje haptyka i powiadomienie systemowe.
        }
    }

    // @capacitor-firebase/messaging odbiera token APNs przez NotificationCenter.
    // Bez tego FCM nie może powiązać urządzenia i getToken() nie rejestruje działającego push tokenu.
    func application(_ application: UIApplication, didRegisterForRemoteNotificationsWithDeviceToken deviceToken: Data) {
        NotificationCenter.default.post(name: .capacitorDidRegisterForRemoteNotifications, object: deviceToken)
    }

    func application(_ application: UIApplication, didFailToRegisterForRemoteNotificationsWithError error: Error) {
        NotificationCenter.default.post(name: .capacitorDidFailToRegisterForRemoteNotifications, object: error)
    }

    func application(_ application: UIApplication, didReceiveRemoteNotification userInfo: [AnyHashable: Any], fetchCompletionHandler completionHandler: @escaping (UIBackgroundFetchResult) -> Void) {
        NotificationCenter.default.post(
            name: Notification.Name("didReceiveRemoteNotification"),
            object: completionHandler,
            userInfo: userInfo
        )
    }

    func applicationWillResignActive(_ application: UIApplication) {
        // Sent when the application is about to move from active to inactive state. This can occur for certain types of temporary interruptions (such as an incoming phone call or SMS message) or when the user quits the application and it begins the transition to the background state.
        // Use this method to pause ongoing tasks, disable timers, and invalidate graphics rendering callbacks. Games should use this method to pause the game.
    }

    func applicationDidEnterBackground(_ application: UIApplication) {
        // Use this method to release shared resources, save user data, invalidate timers, and store enough application state information to restore your application to its current state in case it is terminated later.
        // If your application supports background execution, this method is called instead of applicationWillTerminate: when the user quits.
    }

    func applicationWillEnterForeground(_ application: UIApplication) {
        // Called as part of the transition from the background to the active state; here you can undo many of the changes made on entering the background.
    }

    func applicationDidBecomeActive(_ application: UIApplication) {
        // Z177: reaktywacja sesji audio po powrocie na pierwszy plan — kategoria
        // .playback bywa zdejmowana przez system, a była ustawiana RAZ na starcie.
        configureAudioSession()
    }

    func applicationWillTerminate(_ application: UIApplication) {
        // Called when the application is about to terminate. Save data if appropriate. See also applicationDidEnterBackground:.
    }

    func application(_ app: UIApplication, open url: URL, options: [UIApplication.OpenURLOptionsKey: Any] = [:]) -> Bool {
        // Called when the app was launched with a url. Feel free to add additional processing here,
        // but if you want the App API to support tracking app url opens, make sure to keep this call
        return ApplicationDelegateProxy.shared.application(app, open: url, options: options)
    }

    func application(_ application: UIApplication, continue userActivity: NSUserActivity, restorationHandler: @escaping ([UIUserActivityRestoring]?) -> Void) -> Bool {
        // Called when the app was launched with an activity, including Universal Links.
        // Feel free to add additional processing here, but if you want the App API to support
        // tracking app url opens, make sure to keep this call
        return ApplicationDelegateProxy.shared.application(application, continue: userActivity, restorationHandler: restorationHandler)
    }

}
