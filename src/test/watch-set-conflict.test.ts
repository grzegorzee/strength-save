import { describe, expect, it } from 'vitest';
import { mergeWatchSetEvent, stampChangedWatchSets } from '@/lib/watch-set-conflict';

const event = (at: number, weight: number) => ({
  type: 'setLogged' as const, date: '2026-08-10', dayId: 'day-1',
  exerciseId: 'bench', setIndex: 0, reps: 8, weight, completed: true, at,
});

describe('Watch set LWW (X25/Z225)', () => {
  it('stempluje zmianę telefonu, ale nie resetuje timestampu przy identycznym renderze', () => {
    const old = [{ reps: 8, weight: 70, completed: false, updatedAt: 100 }];
    expect(stampChangedWatchSets(old, [{ reps: 8, weight: 72.5, completed: false }], 200)[0].updatedAt).toBe(200);
    expect(stampChangedWatchSets(old, [{ reps: 8, weight: 70, completed: false }], 200)[0].updatedAt).toBe(100);
  });

  it('nowszy telefon wygrywa ze starym eventem Watch, nowszy Watch wygrywa deterministycznie', () => {
    const phone = [{ reps: 8, weight: 75, completed: true, updatedAt: 300 }];
    expect(mergeWatchSetEvent(phone, event(200, 70))).toEqual({ sets: phone, applied: false });
    expect(mergeWatchSetEvent(phone, event(400, 77.5))).toMatchObject({
      applied: true,
      sets: [{ reps: 8, weight: 77.5, completed: true, updatedAt: 400 }],
    });
  });

  it('nie degraduje pól duration/distance/assistance podczas merge do draftu', () => {
    const current = [{ reps: 0, weight: 20, completed: false }];
    const merged = mergeWatchSetEvent(current, {
      ...event(500, 24),
      trackingType: 'weight_distance_duration',
      durationSec: 60,
      distanceM: 40,
    });
    expect(merged.sets[0]).toMatchObject({ weight: 24, durationSec: 60, distanceM: 40, updatedAt: 500 });
  });
});
