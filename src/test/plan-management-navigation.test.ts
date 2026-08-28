import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('Plan: jedno wejście do zarządzania', () => {
  it('grupuje cykle, edycję i bibliotekę bez odbierania ich użytkownikowi', () => {
    const content = readFileSync(resolve(process.cwd(), 'src/pages/TrainingPlan.tsx'), 'utf8');
    expect(content).toContain('data-testid="plan-manage-trigger"');
    expect(content).toContain("navigate('/cycles')");
    expect(content).toContain("navigate('/plan/edit')");
    expect(content).toContain("navigate('/exercises')");
    expect(content).toContain("t('trainingplan.manage')");
  });

  it('nie powtarza edycji przy każdym dniu, bo pełna akcja zostaje w zarządzaniu', () => {
    const content = readFileSync(resolve(process.cwd(), 'src/pages/TrainingPlan.tsx'), 'utf8');
    const editDestinations = content.match(/navigate\('\/plan\/edit'\)/g) ?? [];

    expect(editDestinations).toHaveLength(1);
    expect(content).toContain('data-testid="plan-manage-trigger"');
    expect(content).toContain('data-testid={`add-cardio-day-${dateStr}`}');
  });
});
