import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const RELEASE_WAVE_2_SURFACES = [
  'src/pages/TrainingPlan.tsx',
  'src/components/TrainingDayCard.tsx',
  'src/pages/Profile.tsx',
  'src/components/analytics/AnalyticsChartsTab.tsx',
  'src/components/StravaActivityCard.tsx',
  'src/components/strava/MonthlyActivities.tsx',
] as const;

describe('release typography wave 2', () => {
  it('priorytetowe etykiety nie schodzą poniżej 11 px', () => {
    for (const path of RELEASE_WAVE_2_SURFACES) {
      const source = readFileSync(path, 'utf8');
      expect(source, path).not.toMatch(/text-\[(?:8|8\.5|9|9\.5|10|10\.5)px\]/);
    }
  });
});
