import SwiftUI

struct ContentView: View {
    @EnvironmentObject var store: WorkoutStore

    var body: some View {
        NavigationStack {
            Group {
                if let payload = store.payload {
                    if payload.capability?.active == false && !store.canContinueCurrentWorkout {
                        proRequiredView
                    } else if payload.type == "todayWorkout", let exercises = payload.exercises, !exercises.isEmpty {
                        if store.isFinishedLocally {
                            finishedView(exercises: exercises)
                        } else {
                            WorkoutListView(payload: payload, exercises: exercises)
                        }
                    } else {
                        QuickWorkoutHomeView(date: payload.date)
                    }
                } else {
                    waitingView
                }
            }
            .navigationTitle("Strength")
        }
    }

    private var proRequiredView: some View {
        VStack(spacing: 8) {
            Image(systemName: "lock.fill")
                .font(.title2)
                .foregroundStyle(.orange)
            Text(L10n.proRequired)
                .font(.footnote)
                .multilineTextAlignment(.center)
            if store.pendingEventCount > 0 {
                Text(L10n.pendingEvents(store.pendingEventCount))
                    .font(.caption2)
                    .foregroundStyle(.orange)
                Button(L10n.retry) { store.retryPendingEvents() }
            }
        }
        .padding()
    }

    private var waitingView: some View {
        VStack(spacing: 8) {
            Image(systemName: "iphone.gen3.radiowaves.left.and.right")
                .font(.title2)
                .foregroundStyle(.secondary)
            Text(L10n.openPhone)
                .font(.footnote)
                .multilineTextAlignment(.center)
                .foregroundStyle(.secondary)
        }
        .padding()
    }

    private func finishedView(exercises: [WatchExercise]) -> some View {
        let stats = store.sessionStats
        return VStack(spacing: 8) {
            Image(systemName: "checkmark.seal.fill")
                .font(.title)
                .foregroundStyle(.green)
            Text(L10n.workoutDone)
                .font(.headline)
            Text(L10n.doneSets(stats.completedSets))
                .font(.footnote)
                .multilineTextAlignment(.center)
                .foregroundStyle(.secondary)
        }
        .padding()
    }

}

struct WorkoutListView: View {
    @EnvironmentObject var store: WorkoutStore
    @ObservedObject private var health = WorkoutSessionManager.shared
    let payload: WatchWorkoutPayload
    let exercises: [WatchExercise]
    @State private var confirmFinish = false
    @State private var confirmDiscard = false

    private var allDone: Bool {
        exercises.allSatisfy { $0.isDone }
    }

    private var doneCount: Int {
        exercises.reduce(0) { $0 + $1.completedWorkingCount }
    }

    var body: some View {
        List {
            if store.restEndsAt != nil {
                Section {
                    RestTimerRow()
                }
            }

            if store.pendingEventCount > 0 {
                Section {
                    Label(L10n.pendingEvents(store.pendingEventCount), systemImage: "arrow.triangle.2.circlepath")
                        .font(.caption2)
                        .foregroundStyle(.orange)
                }
            }

            if store.syncErrorMessage != nil {
                Section {
                    Text(L10n.syncError)
                        .font(.caption2)
                        .foregroundStyle(.red)
                    Button(L10n.retry) { store.retryPendingEvents() }
                }
            }

            if store.isActive {
                Section {
                    SessionStatsRow()
                } header: {
                    Text(L10n.stats)
                }
            }

            if let suggestion = store.nextSetSuggestion {
                Section {
                    QuickLogButton(suggestion: suggestion, showExerciseName: true)
                }
            }
            if !store.isActive {
                Section {
                    Button {
                        store.startWorkout()
                    } label: {
                        Label(L10n.startWorkout, systemImage: "play.fill")
                            .frame(maxWidth: .infinity)
                            .foregroundStyle(.black)
                    }
                    .listRowBackground(RoundedRectangle(cornerRadius: 12).fill(.green))
                } footer: {
                    Text(L10n.startFooter)
                }
            }

            Section {
                ForEach(exercises) { exercise in
                    NavigationLink(value: exercise.id) {
                        ExerciseRow(exercise: exercise)
                    }
                }
            } header: {
                HStack {
                    if let focus = payload.focus {
                        Text(focus)
                    }
                    Spacer()
                    if let hr = health.heartRate {
                        Label("\(Int(hr))", systemImage: "heart.fill")
                            .foregroundStyle(.red)
                            .labelStyle(.titleAndIcon)
                    }
                }
            }

            if store.isActive {
                Section {
                    Button {
                        confirmFinish = true
                    } label: {
                        Label(L10n.finishWorkout, systemImage: "flag.checkered")
                            .foregroundStyle(allDone ? .green : .primary)
                    }
                    Button(role: .destructive) {
                        confirmDiscard = true
                    } label: {
                        Label(L10n.discardWorkout, systemImage: "trash")
                    }
                } footer: {
                    Text(L10n.finishFooter)
                }
            }

            Section {
                NavigationLink {
                    RestSettingsView()
                } label: {
                    Label(L10n.restSettings, systemImage: "timer")
                }
                if !store.isActive && !store.recentExercises.isEmpty {
                    NavigationLink {
                        QuickWorkoutListView()
                    } label: {
                        Label(L10n.quickWorkout, systemImage: "bolt.fill")
                    }
                }
            }
        }
        .confirmationDialog(
            L10n.confirmFinish(doneCount),
            isPresented: $confirmFinish,
            titleVisibility: .visible
        ) {
            Button(L10n.finishAndSave, role: .destructive) {
                store.finishWorkout()
            }
            Button(L10n.back, role: .cancel) {}
        }
        .confirmationDialog(
            L10n.discardConfirm,
            isPresented: $confirmDiscard,
            titleVisibility: .visible
        ) {
            Button(L10n.discard, role: .destructive) { store.discardWorkout() }
            Button(L10n.back, role: .cancel) {}
        }
        .navigationDestination(for: String.self) { exerciseId in
            if let exercise = store.payload?.exercises?.first(where: { $0.id == exerciseId }) {
                ExerciseDetailView(exerciseId: exercise.id)
            }
        }
    }
}

struct QuickWorkoutHomeView: View {
    @EnvironmentObject var store: WorkoutStore
    let date: String

    var body: some View {
        List {
            Section {
                Label(L10n.restDay, systemImage: "moon.zzz.fill")
                    .foregroundStyle(.teal)
                Text(date).font(.caption2).foregroundStyle(.secondary)
            }
            if store.pendingEventCount > 0 {
                Section {
                    Label(L10n.pendingEvents(store.pendingEventCount), systemImage: "arrow.triangle.2.circlepath")
                        .foregroundStyle(.orange)
                    if store.syncErrorMessage != nil {
                        Button(L10n.retry) { store.retryPendingEvents() }
                    }
                }
            }
            Section {
                if store.recentExercises.isEmpty {
                    Text(L10n.noRecentExercises).font(.caption2).foregroundStyle(.secondary)
                } else {
                    NavigationLink {
                        QuickWorkoutListView()
                    } label: {
                        Label(L10n.quickWorkout, systemImage: "bolt.fill")
                    }
                }
                NavigationLink {
                    RestSettingsView()
                } label: {
                    Label(L10n.restSettings, systemImage: "timer")
                }
            }
        }
    }
}

struct QuickWorkoutListView: View {
    @EnvironmentObject var store: WorkoutStore

    var body: some View {
        List(store.recentExercises) { exercise in
            Button {
                store.startQuickWorkout(exercise)
            } label: {
                VStack(alignment: .leading, spacing: 2) {
                    Text(exercise.name).lineLimit(2)
                    Text("\(exercise.setCount) × \(exercise.reps) · \(store.weightUnit.toDisplay(exercise.weight).weightText) \(store.weightUnit.label)")
                        .font(.caption2)
                        .foregroundStyle(.secondary)
                }
            }
        }
        .navigationTitle(L10n.recentExercises)
    }
}

struct SessionStatsRow: View {
    @EnvironmentObject var store: WorkoutStore

    var body: some View {
        TimelineView(.periodic(from: .now, by: 1)) { context in
            let stats = store.sessionStats
            let seconds = stats.elapsedSeconds(at: context.date)
            HStack {
                Label(String(format: "%d:%02d", seconds / 60, seconds % 60), systemImage: "clock")
                Spacer()
                Text("\(stats.completedSets)")
                Spacer()
                Text("\(store.weightUnit.toDisplay(stats.volumeKg).weightText) \(store.weightUnit.label)")
            }
            .font(.caption2.monospacedDigit())
        }
    }
}

struct RestSettingsView: View {
    @EnvironmentObject var store: WorkoutStore

    var body: some View {
        List {
            restRow(title: L10n.betweenSets, seconds: store.restBetweenSetsSeconds) {
                store.adjustRestBetweenSets(by: $0)
            }
            restRow(title: L10n.betweenExercises, seconds: store.restBetweenExercisesSeconds) {
                store.adjustRestBetweenExercises(by: $0)
            }
            Text(L10n.localSetting).font(.caption2).foregroundStyle(.secondary)
        }
        .navigationTitle(L10n.restSettings)
    }

    private func restRow(title: String, seconds: Int, adjust: @escaping (Int) -> Void) -> some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(title).font(.caption)
            HStack {
                Button { adjust(-15) } label: { Image(systemName: "minus.circle") }
                Spacer()
                Text("\(seconds) s").font(.headline.monospacedDigit())
                Spacer()
                Button { adjust(15) } label: { Image(systemName: "plus.circle") }
            }
        }
    }
}

// One-tap logowanie następnej serii bez wchodzenia w edytor.
struct QuickLogButton: View {
    @EnvironmentObject var store: WorkoutStore
    let suggestion: WorkoutStore.NextSetSuggestion
    let showExerciseName: Bool

    var body: some View {
        let unit = store.weightUnit
        Button {
            store.log(suggestion: suggestion)
        } label: {
            VStack(alignment: .leading, spacing: 2) {
                if showExerciseName {
                    Text(suggestion.exerciseName)
                        .font(.caption2)
                        .lineLimit(1)
                        .foregroundStyle(.black.opacity(0.7))
                }
                Label(
                    "\(suggestion.label) · \(WatchSet(reps: suggestion.reps, weight: suggestion.weight, completed: false, isWarmup: nil, updatedAt: nil, durationSec: suggestion.durationSec, distanceM: suggestion.distanceM, assistWeight: suggestion.assistWeight).valueText(unit: unit, trackingType: suggestion.trackingType))",
                    systemImage: "checkmark"
                )
                .font(.body.bold())
                .foregroundStyle(.black)
            }
            .frame(maxWidth: .infinity, alignment: .leading)
        }
        .listRowBackground(RoundedRectangle(cornerRadius: 12).fill(.green))
    }
}

// Pasek odpoczynku między seriami: odliczanie + tap = pomiń.
struct RestTimerRow: View {
    @EnvironmentObject var store: WorkoutStore

    var body: some View {
        if let end = store.restEndsAt {
            TimelineView(.periodic(from: .now, by: 1)) { context in
                let left = max(0, Int(end.timeIntervalSince(context.date).rounded()))
                Button {
                    store.cancelRestTimer()
                } label: {
                    HStack {
                        Image(systemName: "timer")
                            .foregroundStyle(.orange)
                        Text(L10n.rest)
                            .font(.caption)
                        Spacer()
                        Text(String(format: "%d:%02d", left / 60, left % 60))
                            .font(.title3.monospacedDigit())
                            .foregroundStyle(.orange)
                    }
                }
            }
        }
    }
}

struct ExerciseRow: View {
    let exercise: WatchExercise

    var body: some View {
        HStack {
            VStack(alignment: .leading, spacing: 2) {
                Text(exercise.name)
                    .font(.body)
                    .lineLimit(2)
                // Z122: cel tygodnia (silnik progresji) ma pierwszeństwo nad surowym "3 x 6-8".
                if let target = exercise.targetLabel {
                    Text(target)
                        .font(.caption2)
                        .foregroundStyle(.green)
                        .lineLimit(1)
                } else if let label = exercise.setsLabel {
                    Text(label)
                        .font(.caption2)
                        .foregroundStyle(.secondary)
                }
            }
            Spacer()
            if exercise.isDone {
                Image(systemName: "checkmark.circle.fill")
                    .foregroundStyle(.green)
            } else {
                Text("\(exercise.completedWorkingCount)/\(exercise.workingSets.count)")
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }
        }
    }
}
