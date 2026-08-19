import { describe, expect, it } from 'vitest';
import {
  buildPreStartWarmup,
  detectWarmupEquipment,
  shouldOfferPreStartWarmup,
} from '@/lib/prestart-warmup';

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

describe('C-T2: budowa planu rozgrzewki', () => {
  it('sztanga: gryf + ramp 40/60/80% ciężaru roboczego z kg', () => {
    const plan = buildPreStartWarmup({
      exerciseName: 'Przysiad ze sztangą (High Bar)',
      category: 'legs',
      workingWeightKg: 100,
    });
    expect(plan.rampNoteKey).toBe('warmup.v2.rampBar');
    expect(plan.ramp.map((r) => r.pctOfWorking)).toEqual([0, 40, 60, 80]);
    expect(plan.ramp[1]).toMatchObject({ weightKg: 40, reps: 5 });
    expect(plan.ramp[3]).toMatchObject({ weightKg: 80, reps: 1 });
    expect(plan.dynamicKeys).toContain('warmup.v2.dynHipCircles');
    expect(plan.estMinutes).toBe(4);
  });

  it('hantle i maszyny: BEZ pustego gryfu, start od 40% ciężaru roboczego', () => {
    for (const name of ['Wyciskanie hantli na ławce płaskiej', 'Hack squat maszyna']) {
      const plan = buildPreStartWarmup({ exerciseName: name, workingWeightKg: 60 });
      expect(plan.rampNoteKey).toBe('warmup.v2.rampLight');
      expect(plan.ramp.some((r) => r.pctOfWorking === 0)).toBe(false);
      expect(plan.ramp[0]).toMatchObject({ pctOfWorking: 40, weightKg: 24 });
    }
  });

  it('bodyweight: dynamiczne bez rampu', () => {
    const plan = buildPreStartWarmup({ exerciseName: 'Podciąganie', isBodyweight: true, category: 'back' });
    expect(plan.ramp).toEqual([]);
    expect(plan.rampNoteKey).toBeNull();
    expect(plan.dynamicKeys.length).toBeGreaterThanOrEqual(2);
  });

  it('brak ciężaru roboczego: ramp pokazuje % bez kg (weightKg null)', () => {
    const plan = buildPreStartWarmup({ exerciseName: 'Przysiad ze sztangą', workingWeightKg: 0 });
    expect(plan.ramp[1].weightKg).toBeNull();
    expect(plan.ramp[1].pctOfWorking).toBe(40);
  });

  it('zaokrąglenie do 0,5 kg', () => {
    const plan = buildPreStartWarmup({ exerciseName: 'Przysiad ze sztangą', workingWeightKg: 82.5 });
    expect(plan.ramp[1].weightKg).toBe(33);
    expect(plan.ramp[2].weightKg).toBe(49.5);
  });
});

describe('C-T2: kiedy pokazać prompt pre-start', () => {
  const base = { alreadyStarted: false, hasDraftContent: false, autostart: false, viewingPast: false };

  it('świeży jawny start = prompt', () => {
    expect(shouldOfferPreStartWarmup(base)).toBe(true);
  });

  it('resume (draft z treścią), autostart z Watch/Garmin, trwająca sesja i przeszłość = bez promptu', () => {
    expect(shouldOfferPreStartWarmup({ ...base, hasDraftContent: true })).toBe(false);
    expect(shouldOfferPreStartWarmup({ ...base, autostart: true })).toBe(false);
    expect(shouldOfferPreStartWarmup({ ...base, alreadyStarted: true })).toBe(false);
    expect(shouldOfferPreStartWarmup({ ...base, viewingPast: true })).toBe(false);
  });
});
