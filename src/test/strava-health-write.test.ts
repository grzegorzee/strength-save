import { describe, expect, it } from 'vitest';

import { buildMaxHRWrite } from '@/lib/strava-health-write';

describe('buildMaxHRWrite', () => {
  it('odmawia zapisu Max HR bez aktywnego grantu zdrowotnego', () => {
    expect(buildMaxHRWrite(190, null)).toBeNull();
  });

  it('wiąże zapis Max HR z bieżącą epoką zgody', () => {
    expect(buildMaxHRWrite(189.6, { healthEpoch: 7 })).toEqual({
      estimatedMaxHR: 190,
      maxHRManualOverride: true,
      estimatedMaxHREpoch: 7,
    });
  });

  it.each([99, 231, Number.NaN, Number.POSITIVE_INFINITY])(
    'odrzuca wartość poza zakresem: %s',
    (value) => {
      expect(buildMaxHRWrite(value, { healthEpoch: 7 })).toBeNull();
    },
  );

  it('odrzuca nieprawidłową epokę grantu', () => {
    expect(buildMaxHRWrite(190, { healthEpoch: 0 })).toBeNull();
    expect(buildMaxHRWrite(190, { healthEpoch: Number.MAX_SAFE_INTEGER + 1 })).toBeNull();
  });
});
