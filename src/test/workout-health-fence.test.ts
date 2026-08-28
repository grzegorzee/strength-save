import { describe, expect, it } from 'vitest';
import {
  applyHealthMetricChangeFence,
  selectFencedHealthMetrics,
} from '@/lib/workout-health-fence';

const grant7 = { healthEpoch: 7, healthGrantId: 'grant-7' };
const grant8 = { healthEpoch: 8, healthGrantId: 'grant-8' };

describe('workout health fence', () => {
  it('wiąże nową metrykę z grantem aktywnym dokładnie w chwili wpisania', () => {
    const result = applyHealthMetricChangeFence({
      exerciseId: 'squat',
      previousMetrics: {},
      nextMetrics: { rpe: 8 },
      previousGrants: {},
      currentGrant: grant7,
    });

    expect(result.exerciseMetricGrants).toEqual({ squat: { rpe: grant7 } });
    expect(result.pendingHealthGrant).toEqual(grant7);
  });

  it('regrant nie relabeluje niezmienionych starych pól', () => {
    const result = applyHealthMetricChangeFence({
      exerciseId: 'squat',
      previousMetrics: { rpe: 8, pain: 2 },
      nextMetrics: { rpe: 8, pain: 3 },
      previousGrants: { squat: { rpe: grant7, pain: grant7 } },
      currentGrant: grant8,
    });

    expect(result.exerciseMetricGrants).toEqual({
      squat: { rpe: grant7, pain: grant8 },
    });
    expect(selectFencedHealthMetrics({
      exerciseMetrics: { squat: { rpe: 8, pain: 3 } },
      exerciseMetricGrants: result.exerciseMetricGrants,
      pendingHealthGrant: result.pendingHealthGrant,
    })).toEqual({ squat: { pain: 3 } });
  });

  it('usunięcie ostatniej metryki zachowuje jawny replace intent dla serwera', () => {
    const result = applyHealthMetricChangeFence({
      exerciseId: 'squat',
      previousMetrics: { rpe: 8 },
      nextMetrics: {},
      previousGrants: { squat: { rpe: grant7 } },
      currentGrant: grant7,
    });

    expect(result.exerciseMetricGrants).toEqual({});
    expect(result.pendingHealthGrant).toEqual(grant7);
    expect(selectFencedHealthMetrics({
      exerciseMetrics: { squat: {} },
      exerciseMetricGrants: result.exerciseMetricGrants,
      pendingHealthGrant: result.pendingHealthGrant,
    })).toEqual({});
  });

  it('brak aktywnego grantu nigdy nie tworzy fence ani pending write', () => {
    const result = applyHealthMetricChangeFence({
      exerciseId: 'squat',
      previousMetrics: {},
      nextMetrics: { rpe: 8 },
      previousGrants: {},
      currentGrant: null,
    });

    expect(result).toEqual({ exerciseMetricGrants: {}, pendingHealthGrant: null });
  });
});
