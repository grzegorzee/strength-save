import WidgetKit
import SwiftUI

// Komplikacja-launcher na tarczę: tap otwiera aplikację Strength Save na zegarku.

struct LauncherEntry: TimelineEntry {
    let date: Date
}

struct LauncherProvider: TimelineProvider {
    func placeholder(in context: Context) -> LauncherEntry {
        LauncherEntry(date: .now)
    }

    func getSnapshot(in context: Context, completion: @escaping (LauncherEntry) -> Void) {
        completion(LauncherEntry(date: .now))
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<LauncherEntry>) -> Void) {
        completion(Timeline(entries: [LauncherEntry(date: .now)], policy: .never))
    }
}

struct LauncherView: View {
    @Environment(\.widgetFamily) private var family

    var body: some View {
        switch family {
        case .accessoryInline:
            Label("Strength Save", systemImage: "dumbbell.fill")
        default:
            Image(systemName: "dumbbell.fill")
                .font(.title3)
                .foregroundStyle(.green)
        }
    }
}

struct StrengthLauncherWidget: Widget {
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: "StrengthLauncher", provider: LauncherProvider()) { _ in
            LauncherView()
                .containerBackground(.black, for: .widget)
        }
        .configurationDisplayName("Strength Save")
        .description("Szybki dostęp do treningu na zegarku.")
        .supportedFamilies([.accessoryCircular, .accessoryCorner, .accessoryInline])
    }
}

@main
struct StrengthWidgetsBundle: WidgetBundle {
    var body: some Widget {
        StrengthLauncherWidget()
    }
}
