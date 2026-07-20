// Z125: parytet kontraktu klient<->functions (wzorzec X13C).
// Sesja złożona przez garminIngest (functions) MUSI przechodzić przez guardy
// hydracji klienta bez strat — inaczej trening z Garmina zniknie z historii.
import { describe, it, expect } from 'vitest';
import { buildSessionFromEvents, validateIngestPayload } from '../../functions/src/garmin-ingest';
import { sanitizeWorkoutDoc } from '@/lib/firestore-doc-guards';

const NOW = 1_752_960_000_000;

const payload = validateIngestPayload({
  workoutId: 'w-20260720-1',
  date: '2026-07-20',
  dayId: 'day-1',
  dayName: 'Poniedziałek',
  startedAt: NOW - 3_600_000,
  finishedAt: NOW,
  events: [
    { id: 'e1', exerciseId: 'ex-1', exerciseName: 'Wyciskanie hantli (Lekki skos)', setIndex: 0, reps: 6, weight: 62.5, at: NOW - 3000 },
    { id: 'e2', exerciseId: 'ex-2', exerciseName: 'Przysiad ze sztangą (High Bar)', setIndex: 0, reps: 8, weight: 80, at: NOW - 1000 },
  ],
});

describe('parytet garminIngest -> hydracja klienta (Z125)', () => {
  it('sesja z ingest przechodzi sanitizeWorkoutDoc bez strat (plan i ad-hoc)', () => {
    for (const adhoc of [false, true]) {
      const session = buildSessionFromEvents(payload!, 'user-1', 'dev123', { adhoc });
      const { id, ...doc } = session;
      const hydrated = sanitizeWorkoutDoc(id, doc);
      expect(hydrated).not.toBeNull();
      expect(hydrated!.completed).toBe(true);
      expect(hydrated!.exercises).toHaveLength(2);
      expect(hydrated!.exercises[0].name).toBe('Wyciskanie hantli (Lekki skos)');
      expect(hydrated!.exercises[0].sets[0]).toMatchObject({ reps: 6, weight: 62.5, completed: true });
      expect(hydrated!.dayName).toContain('Poniedziałek');
      expect(hydrated!.durationSec).toBe(3600);
    }
  });
});
