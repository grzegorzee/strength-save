import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const PRODUCT_WAVE_3_SURFACES = [
  'src/components/AddCardioDialog.tsx',
  'src/components/AllTimeStatsSheet.tsx',
  'src/components/AppNavigation.tsx',
  'src/components/CycleCard.tsx',
  'src/components/ExercisePicker.tsx',
  'src/components/kinetic/AchievementBadge.tsx',
  'src/components/kinetic/ProfileHeaderChips.tsx',
  'src/components/kinetic/SettingRow.tsx',
  'src/components/NotificationSettings.tsx',
  'src/components/OnboardingMarketingStep.tsx',
  'src/components/PlanChoiceCard.tsx',
  'src/components/PlanNextStepCard.tsx',
  'src/components/PlanPreview.tsx',
  'src/components/PlanStartStep.tsx',
  'src/components/PlanWizard.tsx',
  'src/components/profile/ProfileAccordionSection.tsx',
  'src/components/RestSettingsCard.tsx',
  'src/components/StatsCard.tsx',
  'src/components/WeekCard.tsx',
] as const;

describe('product typography wave 3', () => {
  it('etykiety produktu nie schodzą poniżej 11 px', () => {
    for (const path of PRODUCT_WAVE_3_SURFACES) {
      const source = readFileSync(path, 'utf8');
      expect(source, path).not.toMatch(/text-\[(?:8|8\.5|9|9\.5|10|10\.5)px\]/);
    }
  });
});
