import SwiftUI

struct ContentView: View {
    @EnvironmentObject var store: WorkoutStore

    var body: some View {
        NavigationStack {
            Group {
                if let payload = store.payload {
                    if payload.type == "todayWorkout", let exercises = payload.exercises, !exercises.isEmpty {
                        WorkoutListView(payload: payload, exercises: exercises)
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
    let payload: WatchWorkoutPayload
    let exercises: [WatchExercise]

    private var allDone: Bool {
        exercises.allSatisfy { $0.isDone }
    }

    var body: some View {
        List {
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
                if let focus = payload.focus {
                    Text(focus)
                }
            }

            if store.isActive {
                Section {
                    Button {
                        store.finishWorkout()
                    } label: {
                        Label("Zakończ trening", systemImage: "flag.checkered")
                            .foregroundStyle(allDone ? .green : .primary)
                    }
                } footer: {
                    Text("Serie zapisują się na iPhonie na bieżąco.")
                }
            }
        }
        .navigationDestination(for: String.self) { exerciseId in
            if let exercise = store.payload?.exercises?.first(where: { $0.id == exerciseId }) {
                ExerciseDetailView(exerciseId: exercise.id)
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
