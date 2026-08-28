import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { ChipButton } from '@/components/ui/chip-button';
import { Chip } from '@/components/kinetic/Chip';
import { Button } from '@/components/ui/button';

describe('selection button visual contract', () => {
  it('gives the shared chip a stable outline and visible keyboard focus', () => {
    render(<ChipButton pressed={false}>Option</ChipButton>);

    expect(screen.getByRole('button', { name: 'Option' })).toHaveClass(
      'border',
      'border-muted-foreground',
      'min-h-11',
      'min-w-11',
      'focus-visible:outline-none',
      'focus-visible:ring-2',
      'focus-visible:ring-ring',
      'focus-visible:ring-offset-2',
    );
  });

  it('routes the kinetic chip used by History and Strava through the same contract', () => {
    render(<Chip active={false} onClick={() => undefined}>History filter</Chip>);

    expect(screen.getByRole('button', { name: 'History filter' })).toHaveClass(
      'border',
      'border-muted-foreground',
      'min-h-11',
      'min-w-11',
      'focus-visible:ring-2',
      'focus-visible:ring-ring',
    );
    expect(screen.getByRole('button', { name: 'History filter' })).toHaveAttribute('aria-pressed', 'false');
  });

  it('uses a visible outline token for the shared outline button variant', () => {
    render(<Button variant="outline">Secondary action</Button>);

    expect(screen.getByRole('button', { name: 'Secondary action' })).toHaveClass(
      'border',
      'border-muted-foreground',
      'focus-visible:ring-2',
      'focus-visible:ring-ring',
    );
  });

  it.each([
    ['components/ShareWorkoutDialog.tsx', 2, 2],
    ['components/BodyCompareShareDialog.tsx', 1, 2],
    ['components/RestSettingsCard.tsx', 2, 2],
    ['components/MeasurementTrendChart.tsx', 1, 1],
    ['components/AddCardioDialog.tsx', 2, 2],
    ['components/PlateCalculatorSheet.tsx', 5, 5],
    ['components/PlanStartStep.tsx', 3, 3],
    ['components/ExercisePicker.tsx', 6, 6],
    ['pages/Profile.tsx', 1, 1],
    ['pages/Paywall.tsx', 1, 1],
    ['pages/ExerciseLibrary.tsx', 1, 1],
    ['pages/WorkoutHistory.tsx', 1, 1],
    ['components/VacationDialog.tsx', 2, 2],
    ['components/PlanChoiceCard.tsx', 1, 1],
    ['components/PlanWizard.tsx', 2, 2],
    ['components/ReducedModeDialog.tsx', 2, 2],
    ['components/ExerciseCard.tsx', 1, 1],
  ])('%s routes every selection state through the outline helper', (relativePath, helperCount, pressedCount) => {
    const source = readFileSync(join(process.cwd(), 'src', relativePath), 'utf8');

    expect(source.match(/toggleButtonClasses\(/g)?.length ?? 0).toBeGreaterThanOrEqual(helperCount);
    expect(source.match(/aria-pressed=/g)?.length ?? 0).toBeGreaterThanOrEqual(pressedCount);
  });

  it('keeps calendar days visually quiet but keyboard-visible', () => {
    const source = readFileSync(join(process.cwd(), 'src/components/ui/range-calendar.tsx'), 'utf8');

    expect(source).toContain('focus-visible:ring-2');
    expect(source).toContain('focus-visible:ring-ring');
    expect(source).toContain("'flex h-11 w-full");
  });


  it.each([
    ['components/EmailWorkoutDialog.tsx', 1, 'aria-checked=', 1],
    ['components/ExportWorkoutsDialog.tsx', 1, 'aria-checked=', 1],
    ['components/history/HistoryExportSheet.tsx', 2, 'aria-checked=', 2],
    ['pages/Analytics.tsx', 2, 'aria-pressed=', 2],
    ['pages/Login.tsx', 1, 'aria-pressed=', 1],
    ['pages/admin/AdminSubscriptionCard.tsx', 2, 'aria-pressed=', 2],
    ['components/WorkoutImportWizard.tsx', 1, 'aria-pressed=', 1],
    ['pages/admin/AdminDashboard.tsx', 2, 'aria-pressed=', 2],
    ['pages/admin/AdminEmailsCard.tsx', 1, 'aria-pressed=', 1],
    ['components/admin/AdminUserLogs.tsx', 2, 'aria-pressed=', 2],
  ])('%s applies the shared contract to every local selector', (relativePath, helperCount, stateAttribute, stateCount) => {
    const source = readFileSync(join(process.cwd(), 'src', relativePath), 'utf8');

    expect(source.match(/toggleButtonClasses\(/g)?.length ?? 0).toBeGreaterThanOrEqual(helperCount);
    expect(source.split(stateAttribute).length - 1).toBeGreaterThanOrEqual(stateCount);
  });

  it('keeps segmented tabs and warmup check rows keyboard-visible and named', () => {
    const achievements = readFileSync(join(process.cwd(), 'src/pages/Achievements.tsx'), 'utf8');
    const warmup = readFileSync(join(process.cwd(), 'src/components/WarmupRoutineDialog.tsx'), 'utf8');

    expect(achievements).toContain('border-muted-foreground');
    expect(achievements.match(/min-h-11/g)?.length ?? 0).toBeGreaterThanOrEqual(2);
    expect(achievements.match(/focus-visible:ring-2/g)?.length ?? 0).toBeGreaterThanOrEqual(2);
    expect(warmup).toContain('role="checkbox"');
    expect(warmup).toContain('aria-checked={checked.has(nameKey)}');
    expect(warmup).toContain('focus-visible:ring-2');
    expect(warmup).toContain("'border-muted-foreground'");
  });
});
