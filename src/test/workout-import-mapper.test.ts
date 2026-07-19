import { describe, expect, it } from 'vitest';
import { exerciseLibrary } from '@/data/exerciseLibrary';
import { autoMapExercises, buildImportedSessions } from '@/lib/workout-import/mapper';
import type { ImportedWorkout } from '@/lib/workout-import/parser';

describe('autoMapExercises (Z109)', () => {
  const map = (names: string[], custom: { name: string }[] = []) =>
    autoMapExercises(names, exerciseLibrary, custom);

  it('mapuje popularne nazwy Strong (sufiks "(Barbell)") na kanoniczne PL', () => {
    const { mapped, unmapped } = map([
      'Bench Press (Barbell)',
      'Squat (Barbell)',
      'Deadlift (Barbell)',
      'Overhead Press (Barbell)',
    ]);
    expect(mapped.get('Bench Press (Barbell)')).toBe('Wyciskanie sztangi na ławce płaskiej');
    expect(mapped.get('Squat (Barbell)')).toBe('Przysiad ze sztangą (High Bar)');
    expect(mapped.get('Deadlift (Barbell)')).toBe('Martwy ciąg klasyczny');
    expect(mapped.get('Overhead Press (Barbell)')).toBe('Wyciskanie sztangi nad głowę (OHP)');
    expect(unmapped).toEqual([]);
  });

  it('mapuje przez odwróconą mapę EN->PL (dokładna nazwa EN z biblioteki)', () => {
    const { mapped } = map(['Barbell Bench Press', 'Romanian Deadlift (RDL)', 'Lateral Raise']);
    expect(mapped.get('Barbell Bench Press')).toBe('Wyciskanie sztangi na ławce płaskiej');
    expect(mapped.get('Romanian Deadlift (RDL)')).toBe('Martwy Ciąg Rumuński (RDL)');
    expect(mapped.get('Lateral Raise')).toBe('Wznosy bokiem (Lateral Raise)');
  });

  it('nazwa PL z biblioteki mapuje się na siebie (case-insensitive)', () => {
    const { mapped } = map(['plank', 'Wyciskanie sztangi na ławce płaskiej']);
    expect(mapped.get('plank')).toBe('Plank');
    expect(mapped.get('Wyciskanie sztangi na ławce płaskiej')).toBe('Wyciskanie sztangi na ławce płaskiej');
  });

  it('własne ćwiczenia usera wygrywają match', () => {
    const { mapped } = map(['Moje wiosłowanie'], [{ name: 'Moje wiosłowanie' }]);
    expect(mapped.get('Moje wiosłowanie')).toBe('Moje wiosłowanie');
  });

  it('nieznane nazwy trafiają do unmapped (bez zgadywania)', () => {
    const { mapped, unmapped } = map(['Jakieś Egzotyczne Ćwiczenie 3000']);
    expect(mapped.has('Jakieś Egzotyczne Ćwiczenie 3000')).toBe(false);
    expect(unmapped).toEqual(['Jakieś Egzotyczne Ćwiczenie 3000']);
  });

  it('pull up / dips / farmer walk (bez sufiksów) mapują się aliasami', () => {
    const { mapped } = map(['Pull Up', 'Dips', "Farmer's Walk"]);
    expect(mapped.get('Pull Up')).toBe('Podciąganie na drążku');
    expect(mapped.get('Dips')).toBe('Dips (pompki na poręczach)');
    expect(mapped.get("Farmer's Walk")).toBe("Spacer farmera (Farmer's Walk)");
  });
});

describe('buildImportedSessions (Z109)', () => {
  const parsed: ImportedWorkout[] = [
    {
      date: '2026-05-04',
      dayName: 'Poniedziałek — Góra',
      notes: 'Ciężki dzień',
      exercises: [
        {
          name: 'Bench Press (Barbell)',
          notes: 'pas na 3 dziurkę',
          sets: [
            { reps: 10, weight: 40, isWarmup: true },
            { reps: 8, weight: 80, rpe: 8 },
            { reps: 6, weight: 82.5, rpe: 8.5 },
          ],
        },
        { name: 'Plank', sets: [{ reps: 0, weight: 0, durationSec: 90 }] },
      ],
    },
    {
      date: '2026-05-06',
      dayName: 'Środa — Dół',
      exercises: [{ name: 'Nieznane Ćwiczenie', sets: [{ reps: 5, weight: 100 }] }],
    },
  ];
  const mapping = new Map([
    ['Bench Press (Barbell)', 'Wyciskanie sztangi na ławce płaskiej'],
    ['Plank', 'Plank'],
  ]);

  const sessions = buildImportedSessions(parsed, mapping, 'user-1', 'abc123');

  it('id i dayId = imported-<batchId>-<n>, completed, snapshot dayName', () => {
    expect(sessions).toHaveLength(2);
    expect(sessions[0].id).toBe('imported-abc123-1');
    expect(sessions[0].dayId).toBe('imported-abc123-1');
    expect(sessions[0].userId).toBe('user-1');
    expect(sessions[0].completed).toBe(true);
    expect(sessions[0].date).toBe('2026-05-04');
    expect(sessions[0].dayName).toBe('Poniedziałek — Góra');
    expect(sessions[0].notes).toBe('Ciężki dzień');
    expect(sessions[0].importBatchId).toBe('abc123');
  });

  it('snapshot nazwy PL ze zmapowania, niezmapowane zachowują oryginał', () => {
    expect(sessions[0].exercises[0].name).toBe('Wyciskanie sztangi na ławce płaskiej');
    expect(sessions[1].exercises[0].name).toBe('Nieznane Ćwiczenie');
  });

  it('serie completed z clampem, warmup i nowe pola przeniesione, RPE ćwiczenia = max z serii', () => {
    const bench = sessions[0].exercises[0];
    expect(bench.sets[0]).toMatchObject({ reps: 10, weight: 40, completed: true, isWarmup: true });
    expect(bench.sets[2]).toMatchObject({ reps: 6, weight: 82.5, completed: true });
    expect(bench.rpe).toBe(8.5);
    expect(bench.notes).toBe('pas na 3 dziurkę');
    const plank = sessions[0].exercises[1];
    expect(plank.sets[0]).toMatchObject({ durationSec: 90, completed: true });
  });

  it('zero undefined w obiektach (sanityzacja pod Firestore)', () => {
    const flat = JSON.parse(JSON.stringify(sessions));
    expect(flat).toEqual(sessions);
    for (const s of sessions) {
      expect(Object.values(s).every((v) => v !== undefined)).toBe(true);
      for (const e of s.exercises) {
        expect(Object.values(e).every((v) => v !== undefined)).toBe(true);
      }
    }
  });
});

describe('computeImportBatchId (Z110)', () => {
  it('deterministyczny i wrażliwy na treść', async () => {
    const { computeImportBatchId } = await import('@/lib/workout-import/batch');
    const a = computeImportBatchId('plik A');
    expect(computeImportBatchId('plik A')).toBe(a);
    expect(computeImportBatchId('plik B')).not.toBe(a);
    expect(a).toMatch(/^[0-9a-f]{16}$/);
  });
});
