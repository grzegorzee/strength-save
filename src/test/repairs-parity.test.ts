import { describe, expect, it } from 'vitest';
import clientFixtures from './__fixtures__/repair-cases.json';
import * as client from '@/lib/repair-algorithms';

// Z100: PARYTET algorytmów napraw klient <-> Functions. Te same fixtures muszą
// dawać identyczny (serializowany) wynik operacji. Fixtures są kopiowane 1:1
// (functions/src/repairs/__fixtures__ i src/test/__fixtures__) — dryf łapie
// porównanie snapshotów operacji zapisanych niżej.

type W = client.RepairWorkoutDoc;
type C = client.RepairCycleDoc;

describe('parytet algorytmów napraw (Z100)', () => {
  it('dedupe: deterministyczny wynik na wspólnych fixtures', () => {
    const ops = client.dedupeWorkoutsOperations(clientFixtures.dedupe.workouts as W[]);
    expect(ops.map(o => `${o.op}:${o.collection}/${o.docId}`)).toEqual(['delete:workouts/w-empty']);
  });
  it('repairHistory: deterministyczny wynik na wspólnych fixtures', () => {
    const ops = client.repairHistoryOperations(
      clientFixtures.repairHistory.workouts as W[],
      clientFixtures.repairHistory.cycles as C[],
    );
    expect(JSON.stringify(ops.map(o => ({ id: o.docId, after: o.after })))).toBe(
      JSON.stringify([{ id: 'w-nocycle', after: { cycleId: 'c-1', dayName: 'Poniedziałek', dayFocus: 'Push' } }]),
    );
  });
  it('mergeCycles: deterministyczny wynik na wspólnych fixtures', () => {
    const ops = client.mergeCyclesOperations(
      clientFixtures.mergeCycles.cycles as C[],
      clientFixtures.mergeCycles.workouts as W[],
    );
    expect(ops.map(o => `${o.op}:${o.docId}`)).toEqual(['update:w-b1', 'update:c-a', 'delete:c-b']);
  });
  it('resetOnboarding: deterministyczny wynik na wspólnych fixtures', () => {
    const ops = client.resetOnboardingOperations(
      clientFixtures.resetOnboarding.userId,
      clientFixtures.resetOnboarding.userDoc,
      clientFixtures.resetOnboarding.cycles as C[],
      clientFixtures.resetOnboarding.today,
    );
    expect(ops.map(o => `${o.op}:${o.docId}`)).toEqual(['update:c-active', 'update:u-target']);
  });
});
