import SwiftUI

// Szczegóły ćwiczenia: lista serii. Tap na serię otwiera edytor (powt./ciężar
// stepperami) z dużym przyciskiem "Zalicz serię".
struct ExerciseDetailView: View {
    @EnvironmentObject var store: WorkoutStore
    let exerciseId: String

    private var exercise: WatchExercise? {
        store.payload?.exercises?.first(where: { $0.id == exerciseId })
    }

    var body: some View {
        Group {
            if let exercise {
                List {
                    ForEach(Array(exercise.sets.enumerated()), id: \.offset) { index, set in
                        NavigationLink {
                            SetEditorView(exerciseId: exerciseId, setIndex: index)
                        } label: {
                            SetRow(index: index, set: set, sets: exercise.sets)
                        }
                    }
                }
                .navigationTitle(exercise.name)
            } else {
                Text("Brak ćwiczenia")
            }
        }
    }
}

struct SetRow: View {
    let index: Int
    let set: WatchSet
    let sets: [WatchSet]

    private var label: String {
        if set.isWarmup == true { return "Rozgrzewka" }
        let warmupCount = sets.prefix(index).filter { $0.isWarmup == true }.count
        return "Seria \(index - warmupCount + 1)"
    }

    var body: some View {
        HStack {
            VStack(alignment: .leading, spacing: 2) {
                Text(label)
                    .font(.caption)
                    .foregroundStyle(.secondary)
                if set.reps > 0 || set.weight > 0 {
                    Text("\(set.reps) × \(set.weight.weightText) kg")
                        .font(.body)
                } else {
                    Text("—")
                        .foregroundStyle(.tertiary)
                }
            }
            Spacer()
            Image(systemName: set.completed ? "checkmark.circle.fill" : "circle")
                .foregroundStyle(set.completed ? .green : .secondary)
        }
    }
}

struct SetEditorView: View {
    @EnvironmentObject var store: WorkoutStore
    @Environment(\.dismiss) private var dismiss
    let exerciseId: String
    let setIndex: Int

    @State private var reps: Int = 0
    @State private var weight: Double = 0
    @State private var loaded = false

    private var currentSet: WatchSet? {
        guard let exercise = store.payload?.exercises?.first(where: { $0.id == exerciseId }),
              setIndex < exercise.sets.count else { return nil }
        return exercise.sets[setIndex]
    }

    private var title: String {
        guard let exercise = store.payload?.exercises?.first(where: { $0.id == exerciseId }) else {
            return "Seria"
        }
        if exercise.sets[safe: setIndex]?.isWarmup == true { return "Rozgrzewka" }
        let warmupCount = exercise.sets.prefix(setIndex).filter { $0.isWarmup == true }.count
        return "Seria \(setIndex - warmupCount + 1)"
    }

    var body: some View {
        ScrollView {
            VStack(spacing: 10) {
                HStack {
                    Text("Powt.")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                    Spacer()
                    Stepper(value: $reps, in: 0...100) {
                        Text("\(reps)")
                            .font(.title3.monospacedDigit())
                    }
                }

                HStack {
                    Text("Ciężar")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                    Spacer()
                    Stepper(value: $weight, in: 0...500, step: 2.5) {
                        Text("\(weight.weightText) kg")
                            .font(.title3.monospacedDigit())
                    }
                }

                Button {
                    store.logSet(exerciseId: exerciseId, setIndex: setIndex, reps: reps, weight: weight)
                    dismiss()
                } label: {
                    Label("Zalicz serię", systemImage: "checkmark")
                        .frame(maxWidth: .infinity)
                }
                .buttonStyle(.borderedProminent)
                .tint(.green)
            }
            .padding(.horizontal, 4)
        }
        .navigationTitle(title)
        .onAppear {
            guard !loaded, let set = currentSet else { return }
            loaded = true
            reps = set.reps
            weight = set.weight
            // Prefill z poprzedniej zaliczonej serii, żeby nie klikać od zera.
            if reps == 0 || weight == 0,
               let exercise = store.payload?.exercises?.first(where: { $0.id == exerciseId }) {
                let prior = exercise.sets.prefix(setIndex).last(where: { $0.completed })
                if reps == 0 { reps = prior?.reps ?? 0 }
                if weight == 0 { weight = prior?.weight ?? 0 }
            }
        }
    }
}

extension Array {
    subscript(safe index: Int) -> Element? {
        indices.contains(index) ? self[index] : nil
    }
}

extension Double {
    var weightText: String {
        truncatingRemainder(dividingBy: 1) == 0
            ? String(format: "%.0f", self)
            : String(format: "%.1f", self)
    }
}
