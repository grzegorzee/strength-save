import SwiftUI

struct ContentView: View {
    @EnvironmentObject var store: WorkoutStore

    var body: some View {
        NavigationStack {
            Group {
                if let payload = store.payload {
                    if payload.type == "todayWorkout", let exercises = payload.exercises, !exercises.isEmpty {
                        if store.isFinishedLocally {
                            finishedView(exercises: exercises)
                        } else {
                            WorkoutListView(payload: payload, exercises: exercises)
                        }
                    } else {
                        restDayView(date: payload.date)
                    }
                } else {
                    waitingView
                }
            }
            .navigationTitle("Strength")
        }
    }

    private var waitingView: some View {
        VStack(spacing: 8) {
            Image(systemName: "iphone.gen3.radiowaves.left.and.right")
                .font(.title2)
                .foregroundStyle(.secondary)
            Text("Otwórz Strength Save na iPhonie, żeby wysłać trening na zegarek.")
                .font(.footnote)
                .multilineTextAlignment(.center)
                .foregroundStyle(.secondary)
        }
        .padding()
    }

    private func finishedView(exercises: [WatchExercise]) -> some View {
        let done = exercises.reduce(0) { $0 + $1.completedWorkingCount }
        return VStack(spacing: 8) {
            Image(systemName: "checkmark.seal.fill")
                .font(.title)
                .foregroundStyle(.green)
            Text("Trening zakończony")
                .font(.headline)
            Text("Zaliczone serie: \(done). Szczegóły na iPhonie.")
                .font(.footnote)
                .multilineTextAlignment(.center)
                .foregroundStyle(.secondary)
        }
        .padding()
    }

    private func restDayView(date: String) -> some View {
        VStack(spacing: 8) {
            Image(systemName: "moon.zzz.fill")
                .font(.title)
                .foregroundStyle(.teal)
            Text("Dziś odpoczynek")
                .font(.headline)
            Text(date)
                .font(.footnote)
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
                        Label("Rozpocznij trening", systemImage: "play.fill")
                            .frame(maxWidth: .infinity)
                            .foregroundStyle(.black)
                    }
                    .listRowBackground(RoundedRectangle(cornerRadius: 12).fill(.green))
                } footer: {
                    Text("Możesz też od razu zaliczyć serię — trening wystartuje sam.")
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
                        Label("Zakończ trening", systemImage: "flag.checkered")
                            .foregroundStyle(allDone ? .green : .primary)
                    }
                } footer: {
                    Text("Serie zapisują się na iPhonie na bieżąco.")
                }
            }
        }
        .confirmationDialog(
            "Zakończyć trening? Zaliczone serie: \(doneCount).",
            isPresented: $confirmFinish,
            titleVisibility: .visible
        ) {
            Button("Zakończ i zapisz", role: .destructive) {
                store.finishWorkout()
            }
            Button("Wróć", role: .cancel) {}
        }
        .navigationDestination(for: String.self) { exerciseId in
            if let exercise = store.payload?.exercises?.first(where: { $0.id == exerciseId }) {
                ExerciseDetailView(exerciseId: exercise.id)
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
                    "\(suggestion.label) · \(suggestion.reps) × \(unit.toDisplay(suggestion.weight).weightText) \(unit.label)",
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
                        Text("Odpoczynek")
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
                if let label = exercise.setsLabel {
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
