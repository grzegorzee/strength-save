import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const DATA_WAVE_3_SURFACES = [
  'src/components/history/CycleDetailView.tsx',
  'src/components/RzaMetricsCard.tsx',
  'src/components/strava/CardioPersonalBests.tsx',
  'src/components/strava/HRZoneDistribution.tsx',
  'src/components/StravaActivityDetail.tsx',
  'src/components/ui/badge.tsx',
  'src/pages/admin/AdminBugReportsCard.tsx',
  'src/pages/admin/AdminDashboard.tsx',
  'src/pages/admin/AdminEmailsCard.tsx',
  'src/pages/admin/AdminSubscriptionCard.tsx',
  'src/pages/admin/UsersActivityTable.tsx',
  'src/pages/Analytics.tsx',
  'src/pages/Dashboard.tsx',
  'src/pages/ExerciseLibrary.tsx',
  'src/pages/Paywall.tsx',
  'src/pages/WorkoutHistory.tsx',
] as const;

describe('data typography wave 3', () => {
  it('etykiety danych nie schodzą poniżej 11 px', () => {
    for (const path of DATA_WAVE_3_SURFACES) {
      const source = readFileSync(path, 'utf8');
      expect(source, path).not.toMatch(/text-\[(?:8|8\.5|9|9\.5|10|10\.5)px\]/);
    }
  });
});
