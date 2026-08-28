import { beforeEach, describe, expect, it } from 'vitest';
import {
  buildPreStartWarmup,
  detectWarmupEquipment,
  rampSchemeFor,
  shouldOfferPreStartWarmup,
  warmupVariantForCategory,
} from '@/lib/prestart-warmup';
import { isWarmupPromptEnabled, setWarmupPromptEnabled } from '@/lib/warmup-prompt';

describe('C-T2: detekcja sprzętu pierwszego ćwiczenia', () => {
  it('rozpoznaje sztangę, hantle, maszyny i bodyweight (PL i EN)', () => {
    expect(detectWarmupEquipment('Przysiad ze sztangą (High Bar)')).toBe('barbell');
    expect(detectWarmupEquipment('Barbell Bench Press')).toBe('barbell');
    expect(detectWarmupEquipment('Wyciskanie hantli na ławce płaskiej')).toBe('dumbbell');
    expect(detectWarmupEquipment('Dumbbell Row')).toBe('dumbbell');
    expect(detectWarmupEquipment('Wyciskanie na Smith maszynie (ławka płaska)')).toBe('machine');
    expect(detectWarmupEquipment('Ściąganie drążka wyciągu')).toBe('machine');
    expect(detectWarmupEquipment('Hack squat maszyna')).toBe('machine');
    expect(detectWarmupEquipment('Podciąganie', true)).toBe('bodyweight');
  });

  it('hantle wygrywają ze sztangą przy nazwach mieszanych', () => {
    // "Wyciskanie hantli..." nie może dostać gryfu.
    expect(detectWarmupEquipment('Wyciskanie hantli zamiast sztangi')).toBe('dumbbell');
  });
});

// X37 WP-B (RESEARCH sekcja 7): szablon tętno -> mobilność wg kategorii
// pierwszego ćwiczenia (góra / dół / full body) -> aktywacja; 6-9 pozycji,
// początkujący krócej (4 min, max 6 pozycji), reszta 6 min.
describe('X37: treść rozgrzewki wg szablonu (tętno -> mobilność -> aktywacja)', () => {
  const phasesInOrder = (phases: string[]) => {
    const rank = { pulse: 0, mobility: 1, activation: 2 } as const;
    const ranks = phases.map((p) => rank[p as keyof typeof rank]);
    return ranks.every((r, i) => i === 0 || r >= ranks[i - 1]);
  };

  it('kategoria -> wariant: klatka/plecy/barki/ramiona = góra, nogi/pośladki/łydki = dół, reszta = full body', () => {
    for (const c of ['chest', 'back', 'shoulders', 'arms']) expect(warmupVariantForCategory(c)).toBe('upper');
    for (const c of ['legs', 'glutes', 'calves']) expect(warmupVariantForCategory(c)).toBe('lower');
    expect(warmupVariantForCategory('core')).toBe('full');
    expect(warmupVariantForCategory(undefined)).toBe('full');
  });

  it('standard: 6-9 pozycji w kolejności faz, 6 min, każda pozycja ma czas ALBO powtórzenia', () => {
    for (const category of ['chest', 'legs', 'core', undefined]) {
      const plan = buildPreStartWarmup({ exerciseName: 'Przysiad ze sztangą', category });
      expect(plan.items.length).toBeGreaterThanOrEqual(6);
      expect(plan.items.length).toBeLessThanOrEqual(9);
      expect(plan.estMinutes).toBe(6);
      expect(phasesInOrder(plan.items.map((i) => i.phase))).toBe(true);
      expect(plan.items.some((i) => i.phase === 'pulse')).toBe(true);
      expect(plan.items.some((i) => i.phase === 'mobility')).toBe(true);
      expect(plan.items.some((i) => i.phase === 'activation')).toBe(true);
      for (const item of plan.items) {
        const timed = typeof item.durationSec === 'number';
        const repped = typeof item.reps === 'number';
        expect(timed !== repped, item.key).toBe(true);
        expect(item.instructionKey, item.key).toBe(`${item.key}.instruction`);
      }
      // Klucze unikalne: klucz = odhaczenie w drafcie (warmupChecked).
      expect(new Set(plan.items.map((i) => i.key)).size).toBe(plan.items.length);
    }
  });

  // X38 WP-B: rozgrzewka siłowa bez pajacyków. Tętno standard = spokojne cardio
  // (rower / wioślarz / marsz na bieżni) 120 s + pięty do pośladków z krążeniami 30 s.
  it('tętno standard: spokojne cardio 120 s + pięty do pośladków z krążeniami ramion 30 s; bez pajacyków', () => {
    const plan = buildPreStartWarmup({ exerciseName: 'Wyciskanie sztangi', category: 'chest' });
    const pulse = plan.items.filter((i) => i.phase === 'pulse');
    expect(pulse.map((i) => i.durationSec)).toEqual([120, 30]);
    expect(pulse.map((i) => i.key)).toEqual(['warmup.v3.cardioEasy', 'warmup.v3.heelsArmCircles']);
    expect(plan.items.map((i) => i.key)).not.toContain('warmup.v3.jacks');
  });

  it('X38: plan opisuje tylko fazy (bez rampy i notki sprzętowej), szacunek minut zostaje', () => {
    const plan = buildPreStartWarmup({ exerciseName: 'Przysiad ze sztangą', category: 'legs', workingWeightKg: 100 });
    expect('ramp' in plan).toBe(false);
    expect('rampNoteKey' in plan).toBe(false);
    expect(plan.estMinutes).toBe(6);
  });

  it('góra: mobilność barków (krążenia, rotacje zewnętrzne), aktywacja z pull-apart i pompkami; bez wymachów nóg', () => {
    const plan = buildPreStartWarmup({ exerciseName: 'Wyciskanie sztangi', category: 'chest' });
    const keys = plan.items.map((i) => i.key);
    expect(plan.variant).toBe('upper');
    expect(keys).toContain('warmup.v3.armCircles');
    expect(keys).toContain('warmup.v3.extRotations');
    expect(keys).toContain('warmup.v3.bandPullApart');
    expect(keys).toContain('warmup.v3.pushups');
    expect(keys).not.toContain('warmup.v3.legSwings');
    // "na stronę" tylko przy pozycjach jednostronnych.
    expect(plan.items.find((i) => i.key === 'warmup.v3.extRotations')).toMatchObject({ reps: 10, perSide: true });
  });

  it('dół: goblet squat z pauzą, wymachy nóg, wykrok z pauzą; aktywacja glute bridge + bird dog', () => {
    const plan = buildPreStartWarmup({ exerciseName: 'Przysiad ze sztangą', category: 'legs' });
    const keys = plan.items.map((i) => i.key);
    expect(plan.variant).toBe('lower');
    expect(keys).toContain('warmup.v3.gobletSquatPause');
    expect(keys).toContain('warmup.v3.legSwings');
    expect(keys).toContain('warmup.v3.lungePause');
    expect(keys).toContain('warmup.v3.gluteBridge');
    expect(keys).toContain('warmup.v3.birdDog');
    expect(keys).not.toContain('warmup.v3.pushups');
  });

  it('full body: szablon uniwersalny z hip airplane zamiast wykroku z rotacją + pull-apart', () => {
    const plan = buildPreStartWarmup({ exerciseName: 'Burpees', category: 'core' });
    const keys = plan.items.map((i) => i.key);
    expect(plan.variant).toBe('full');
    expect(keys).toContain('warmup.v3.hipAirplane');
    expect(keys).not.toContain('warmup.v3.lungeRotation');
    expect(keys).toContain('warmup.v3.bandPullApart');
    expect(keys).toContain('warmup.v3.gluteBridge');
  });

  it('początkujący: wariant 4 min, max 6 pozycji, marsz z wysokimi kolanami 60 s + pięty 30 s (bez cardio 120 s), mniej powtórzeń', () => {
    for (const category of ['chest', 'legs', 'core']) {
      const plan = buildPreStartWarmup({ exerciseName: 'X', category, level: 'beginner' });
      expect(plan.estMinutes).toBe(4);
      expect(plan.items.length).toBeLessThanOrEqual(6);
      expect(plan.items.length).toBeGreaterThanOrEqual(5);
      expect(plan.items[0]).toMatchObject({ key: 'warmup.v3.marchHighKnees', durationSec: 60 });
      expect(plan.items[1]).toMatchObject({ key: 'warmup.v3.heelsArmCircles', durationSec: 30 });
      expect(plan.items.map((i) => i.key)).not.toContain('warmup.v3.jacks');
      expect(plan.items.map((i) => i.key)).not.toContain('warmup.v3.cardioEasy');
      expect(phasesInOrder(plan.items.map((i) => i.phase))).toBe(true);
    }
    const lower = buildPreStartWarmup({ exerciseName: 'X', category: 'legs', level: 'beginner' });
    expect(lower.items.find((i) => i.key === 'warmup.v3.gluteBridge')?.reps).toBe(10);
    const standard = buildPreStartWarmup({ exerciseName: 'X', category: 'legs' });
    expect(standard.items.find((i) => i.key === 'warmup.v3.gluteBridge')?.reps).toBe(12);
  });

  it('poziom średni/zaawansowany/nieznany = wariant standard (6 min)', () => {
    for (const level of ['intermediate', 'advanced', undefined, 'cokolwiek']) {
      expect(buildPreStartWarmup({ exerciseName: 'X', category: 'back', level }).estMinutes).toBe(6);
    }
  });
});

// Schemat rampy (Nippard + RP + Barbell Logic): sztanga gryf x8, 50% x5, 70% x3,
// 85% x1; roboczy <60 kg: gryf x8, 60% x4, 85% x1; >150 kg dodatkowo 40% x5.
// Hantle/maszyna: 50% x8, 75% x3. Bodyweight: bez rampy. X38: rampa zniknęła
// z dialogu rozgrzewki, schemat żyje dalej jako źródło chipa "Rozgrzewka" w karcie
// (warmup-generator.ts), stąd test na rampSchemeFor.
describe('X37/X38: schemat rampy (50/70/85) dla chipa w karcie', () => {
  it('sztanga 100 kg: gryf x8, 50% x5, 70% x3, 85% x1', () => {
    expect(rampSchemeFor('barbell', 100).map((r) => [r.pct, r.reps])).toEqual([[0, 8], [50, 5], [70, 3], [85, 1]]);
  });

  it('sztanga <60 kg: gryf x8, 60% x4, 85% x1 (mniej serii)', () => {
    expect(rampSchemeFor('barbell', 50).map((r) => [r.pct, r.reps])).toEqual([[0, 8], [60, 4], [85, 1]]);
  });

  it('sztanga >150 kg: dodatkowo 40% x5 przed 50%', () => {
    expect(rampSchemeFor('barbell', 180).map((r) => r.pct)).toEqual([0, 40, 50, 70, 85]);
  });

  it('hantle i maszyny: BEZ pustego gryfu, 50% x8 i 75% x3', () => {
    for (const equipment of ['dumbbell', 'machine', 'other'] as const) {
      expect(rampSchemeFor(equipment, 60).map((r) => [r.pct, r.reps])).toEqual([[50, 8], [75, 3]]);
    }
  });

  it('bodyweight: bez rampy; brak ciężaru roboczego = schemat standardowy', () => {
    expect(rampSchemeFor('bodyweight', 0)).toEqual([]);
    expect(rampSchemeFor('barbell', 0).map((r) => r.pct)).toEqual([0, 50, 70, 85]);
  });
});

describe('C-T2 + X37: kiedy pokazać prompt pre-start', () => {
  const base = { alreadyStarted: false, hasDraftContent: false, autostart: false, viewingPast: false };

  beforeEach(() => {
    localStorage.clear();
  });

  it('świeży jawny start = prompt (brak preferencji = włączone)', () => {
    expect(shouldOfferPreStartWarmup(base)).toBe(true);
    expect(shouldOfferPreStartWarmup({ ...base, warmupPrompt: true })).toBe(true);
  });

  it('resume (draft z treścią), autostart z Watch/Garmin, trwająca sesja i przeszłość = bez promptu', () => {
    expect(shouldOfferPreStartWarmup({ ...base, hasDraftContent: true })).toBe(false);
    expect(shouldOfferPreStartWarmup({ ...base, autostart: true })).toBe(false);
    expect(shouldOfferPreStartWarmup({ ...base, alreadyStarted: true })).toBe(false);
    expect(shouldOfferPreStartWarmup({ ...base, viewingPast: true })).toBe(false);
  });

  // X38 WP-B: szybki trening z Dashboardu to autostart ad-hoc; arkusz ma się
  // pojawić (po utworzeniu sesji), o ile sesja świeża i proponowanie włączone.
  it('X38: autostart ad-hoc (szybki trening) NIE blokuje arkusza; reszta bramek działa jak przy planie', () => {
    const adhoc = { ...base, autostart: true, isAdhoc: true };
    expect(shouldOfferPreStartWarmup(adhoc)).toBe(true);
    expect(shouldOfferPreStartWarmup({ ...adhoc, warmupPrompt: false })).toBe(false);
    expect(shouldOfferPreStartWarmup({ ...adhoc, hasDraftContent: true })).toBe(false);
    expect(shouldOfferPreStartWarmup({ ...adhoc, alreadyStarted: true })).toBe(false);
    expect(shouldOfferPreStartWarmup({ ...adhoc, viewingPast: true })).toBe(false);
    // Autostart z planu (Dashboard "dzisiejszy trening", Watch/Garmin) bez zmian: bez arkusza.
    expect(shouldOfferPreStartWarmup({ ...base, autostart: true, isAdhoc: false })).toBe(false);
  });

  it('X37: preferencja wyłączona = bez promptu mimo świeżego startu', () => {
    expect(shouldOfferPreStartWarmup({ ...base, warmupPrompt: false })).toBe(false);
  });

  it('sekwencja: "Nie proponuj więcej" (cache off) -> następny start bez arkusza; ponowne włączenie -> arkusz wraca', () => {
    // Cache per urządzenie: brak wpisu = włączone.
    expect(isWarmupPromptEnabled()).toBe(true);
    expect(shouldOfferPreStartWarmup({ ...base, warmupPrompt: isWarmupPromptEnabled() })).toBe(true);

    setWarmupPromptEnabled(false);
    expect(localStorage.getItem('fittracker_warmup_prompt_v1')).toBe('false');
    expect(shouldOfferPreStartWarmup({ ...base, warmupPrompt: isWarmupPromptEnabled() })).toBe(false);

    setWarmupPromptEnabled(true);
    expect(shouldOfferPreStartWarmup({ ...base, warmupPrompt: isWarmupPromptEnabled() })).toBe(true);
  });
});
