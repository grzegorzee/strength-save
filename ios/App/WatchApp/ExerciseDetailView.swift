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
                    if store.restEndsAt != nil {
                        Section {
                            RestTimerRow()
                        }
                    }
                    // Z122: cel tygodnia + przypięta notatka (ustawienia maszyny itp.).
                    if exercise.targetLabel != nil || exercise.pinnedNote != nil {
                        Section {
                            if let target = exercise.targetLabel {
                                Label(target, systemImage: "target")
                                    .font(.caption)
                                    .foregroundStyle(.green)
                            }
                            if let note = exercise.pinnedNote {
                                Label(note, systemImage: "pin.fill")
                                    .font(.caption2)
                                    .foregroundStyle(.yellow)
                            }
                        }
                    }
                    if let suggestion = store.nextSet(in: exercise) {
                        Section {
                            QuickLogButton(suggestion: suggestion, showExerciseName: false)
                        }
                    }
                    ForEach(Array(exercise.sets.enumerated()), id: \.offset) { index, set in
                        NavigationLink {
                            SetEditorView(exerciseId: exerciseId, setIndex: index)
                        } label: {
                            SetRow(index: index, set: set, sets: exercise.sets, trackingType: exercise.trackingType)
                        }
                    }
                }
                .navigationTitle(exercise.name)
            } else {
                Text(L10n.noExercise)
            }
        }
    }
}

struct SetRow: View {
    @EnvironmentObject var store: WorkoutStore
    let index: Int
    let set: WatchSet
    let sets: [WatchSet]
    let trackingType: String?

    private var label: String {
        if set.isWarmup == true { return L10n.warmup }
        let warmupCount = sets.prefix(index).filter { $0.isWarmup == true }.count
        return L10n.series(index - warmupCount + 1)
    }

    var body: some View {
        let unit = store.weightUnit
        HStack {
            VStack(alignment: .leading, spacing: 2) {
                Text(label)
                    .font(.caption)
                    .foregroundStyle(.secondary)
                if set.reps > 0 || set.weight > 0 || (set.durationSec ?? 0) > 0 || (set.distanceM ?? 0) > 0 || (set.assistWeight ?? 0) > 0 {
                    Text(set.valueText(unit: unit, trackingType: trackingType))
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
    /// Ciężar w jednostce WYŚWIETLANIA (kg lub lbs) — konwersja do kg przy zapisie.
    @State private var weight: Double = 0
    @State private var durationSec: Int = 0
    @State private var distanceM: Double = 0
    @State private var assistWeight: Double = 0
    @State private var loaded = false

    private var currentSet: WatchSet? {
        guard let exercise = store.payload?.exercises?.first(where: { $0.id == exerciseId }),
              setIndex < exercise.sets.count else { return nil }
        return exercise.sets[setIndex]
    }

    private var title: String {
        guard let exercise = store.payload?.exercises?.first(where: { $0.id == exerciseId }) else {
            return L10n.series(1)
        }
        if exercise.sets[safe: setIndex]?.isWarmup == true { return L10n.warmup }
        let warmupCount = exercise.sets.prefix(setIndex).filter { $0.isWarmup == true }.count
        return L10n.series(setIndex - warmupCount + 1)
    }

    private var trackingType: String {
        store.payload?.exercises?.first(where: { $0.id == exerciseId })?.trackingType ?? "weight_reps"
    }

    private var showsReps: Bool {
        trackingType == "weight_reps" || trackingType == "bodyweight_reps" || trackingType == "assisted_bodyweight"
    }

    private var showsWeight: Bool {
        trackingType == "weight_reps" || trackingType == "weight_distance_duration"
    }

    var body: some View {
        ScrollView {
            VStack(spacing: 10) {
                if showsReps {
                    HStack {
                        Text(L10n.reps).font(.caption).foregroundStyle(.secondary)
                        Spacer()
                        Stepper(value: $reps, in: 0...1000) {
                            Text("\(reps)").font(.title3.monospacedDigit())
                        }
                    }
                }

                if showsWeight {
                    HStack {
                        Text(L10n.weight).font(.caption).foregroundStyle(.secondary)
                        Spacer()
                        Stepper(value: $weight, in: 0...4400, step: store.weightUnit.step) {
                            Text("\(weight.weightText) \(store.weightUnit.label)").font(.title3.monospacedDigit())
                        }
                    }
                    .focusable()
                    .digitalCrownRotation(
                        $weight,
                        from: 0, through: 4400, by: store.weightUnit.step,
                        sensitivity: .medium, isContinuous: false, isHapticFeedbackEnabled: true
                    )
                }

                if trackingType == "duration" || trackingType == "weight_distance_duration" {
                    HStack {
                        Text(L10n.duration).font(.caption).foregroundStyle(.secondary)
                        Spacer()
                        Stepper(value: $durationSec, in: 0...86400, step: 5) {
                            Text("\(durationSec)").font(.title3.monospacedDigit())
                        }
                    }
                }

                if trackingType == "weight_distance_duration" {
                    HStack {
                        Text(L10n.distance).font(.caption).foregroundStyle(.secondary)
                        Spacer()
                        Stepper(value: $distanceM, in: 0...1_000_000, step: 5) {
                            Text(distanceM.weightText).font(.title3.monospacedDigit())
                        }
                    }
                }

                if trackingType == "assisted_bodyweight" {
                    HStack {
                        Text(L10n.assistance).font(.caption).foregroundStyle(.secondary)
                        Spacer()
                        Stepper(value: $assistWeight, in: 0...4400, step: store.weightUnit.step) {
                            Text("\(assistWeight.weightText) \(store.weightUnit.label)").font(.title3.monospacedDigit())
                        }
                    }
                }

                Button {
                    store.logSet(
                        exerciseId: exerciseId, setIndex: setIndex, reps: reps,
                        weight: store.weightUnit.toKg(weight),
                        trackingType: trackingType,
                        durationSec: trackingType == "duration" || trackingType == "weight_distance_duration" ? Double(durationSec) : nil,
                        distanceM: trackingType == "weight_distance_duration" ? distanceM : nil,
                        assistWeight: trackingType == "assisted_bodyweight" ? store.weightUnit.toKg(assistWeight) : nil
                    )
                    dismiss()
                } label: {
                    Label(L10n.logSet, systemImage: "checkmark")
                        .frame(maxWidth: .infinity)
                }
                .buttonStyle(.borderedProminent)
                .tint(.accentColor)
            }
            .padding(.horizontal, 4)
        }
        .navigationTitle(title)
        .onAppear {
            guard !loaded, let set = currentSet else { return }
            loaded = true
            let unit = store.weightUnit
            reps = set.reps
            weight = unit.toDisplay(set.weight)
            durationSec = Int(set.durationSec ?? 0)
            distanceM = set.distanceM ?? 0
            assistWeight = unit.toDisplay(set.assistWeight ?? 0)
            // Prefill z poprzedniej zaliczonej serii, żeby nie klikać od zera.
            if reps == 0 || weight == 0,
               let exercise = store.payload?.exercises?.first(where: { $0.id == exerciseId }) {
                let prior = exercise.sets.prefix(setIndex).last(where: { $0.completed })
                if reps == 0 { reps = prior?.reps ?? 0 }
                if weight == 0 { weight = unit.toDisplay(prior?.weight ?? 0) }
                if durationSec == 0 { durationSec = Int(prior?.durationSec ?? 0) }
                if distanceM == 0 { distanceM = prior?.distanceM ?? 0 }
                if assistWeight == 0 { assistWeight = unit.toDisplay(prior?.assistWeight ?? 0) }
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
