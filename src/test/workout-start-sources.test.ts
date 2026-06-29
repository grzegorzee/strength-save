import { describe, expect, it, vi } from 'vitest';

// workout-read-store importuje @/lib/firebase, którego realna inicjalizacja pada w jsdom.
// Dla pustego userId żadna funkcja firestore nie jest wołana — mockujemy tylko `db`.
vi.mock('@/lib/firebase', () => ({ db: {}, auth: {} }));

import { getWorkoutReadSnapshot } from '@/lib/workout-read-store';

// #6: gdy uid jest chwilowo puste (odświeżanie tokena), źródła startu treningu
// muszą raportować "gotowe" (puste, ale załadowane), inaczej gate w WorkoutDay
// wisi w nieskończonym spinnerze. Wzorzec spójny z loaderem draftu (!uid → isDraftLoaded=true).
describe('workout start sources — pusty userId jest gotowy (#6 spinner bez końca)', () => {
  it('getWorkoutReadSnapshot("") raportuje isLoaded=true z pustymi danymi', () => {
    const snap = getWorkoutReadSnapshot('');
    expect(snap.isLoaded).toBe(true);
    expect(snap.workouts).toEqual([]);
    expect(snap.measurements).toEqual([]);
  });
});
