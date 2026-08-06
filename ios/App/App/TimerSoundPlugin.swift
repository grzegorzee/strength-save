import Foundation
import AVFoundation
import Capacitor

// Lokalny plugin Capacitora: sygnały timera grają NATYWNIE przez AVAudioPlayer,
// nie przez WebAudio w WKWebView. Powód (zgłoszenie usera po treningu na buildzie 82,
// 2026-08-06): WebAudio w WKWebView na fizycznym iPhone gra ledwo słyszalnie mimo
// pełnej głośności medialnej — to plan B zapisany w DECYZJE.md 2026-07-24.
//
// Pliki żyją w root bundla App — te same, których używa UNNotificationSound
// (rest_{bell,horn,alarm}.wav) plus timer_{tick,complete}.wav z generatora
// scripts/generate-timer-signals.mjs. Sesja audio (.playback + duckOthers)
// jest konfigurowana w AppDelegate i obowiązuje też tutaj.
//
// JS: registerPlugin('TimerSound') — patrz src/lib/timer-sound.ts. Rejestracja
// instancji w BridgeViewController (jak WatchBridgePlugin).
@objc(TimerSoundPlugin)
public class TimerSoundPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "TimerSoundPlugin"
    public let jsName = "TimerSound"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "play", returnType: CAPPluginReturnPromise),
    ]

    // Retencja do końca odtwarzania — bez tego ARC zwalnia player w trakcie
    // i dźwięk się ucina. Nowe odtworzenie nadpisuje poprzednie (sygnały są
    // krótkie, jednoczesne granie dwóch to błąd, nie feature).
    private var player: AVAudioPlayer?

    @objc func play(_ call: CAPPluginCall) {
        guard let file = call.getString("file"), !file.contains("/"),
              let url = Bundle.main.url(forResource: file, withExtension: nil) else {
            call.reject("Sound file not in bundle: \(call.getString("file") ?? "nil")")
            return
        }
        let volume = call.getDouble("volume") ?? 1.0
        do {
            let p = try AVAudioPlayer(contentsOf: url)
            p.volume = Float(min(max(volume, 0.0), 1.0))
            p.prepareToPlay()
            p.play()
            player = p
            call.resolve()
        } catch {
            call.reject("AVAudioPlayer failed: \(error.localizedDescription)")
        }
    }
}
