import { describe, expect, it } from 'vitest';
import { stravaHealthGrantStillCurrent } from './strava-health-commit';

describe('Strava network fetch consent fence', () => {
  const before = { consents: { healthGranted: true, healthVersion: '1.1', healthEpoch: 1, healthGrantId: 'g1' } };
  it('cannot persist HR after withdrawal while fetching paginated activities', () => {
    expect(stravaHealthGrantStillCurrent(before, { consents: { ...before.consents, healthGranted: false, healthEpoch: 2, healthGrantId: null } })).toBe(false);
  });
  it('cannot relabel an old fetch under a new grant after revoke/regrant', () => {
    expect(stravaHealthGrantStillCurrent(before, { consents: { ...before.consents, healthEpoch: 3, healthGrantId: 'g3' } })).toBe(false);
  });
  it('unchanged valid grant preserves the old sync workflow', () => {
    expect(stravaHealthGrantStillCurrent(before, before)).toBe(true);
  });
});
