import SwiftUI

@main
struct StrengthWatchApp: App {
    @StateObject private var store = WorkoutStore.shared

    var body: some Scene {
        WindowGroup {
            ContentView()
                .environmentObject(store)
                .onAppear { store.activate() }
        }
    }
}
