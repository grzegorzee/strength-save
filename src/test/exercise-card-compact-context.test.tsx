import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { LanguageProvider } from '@/contexts/LanguageContext';
import { UnitProvider } from '@/contexts/UnitContext';
import { ExerciseCard } from '@/components/ExerciseCard';
import { PinnedNoteSection } from '@/components/PinnedNoteSection';
import { translate } from '@/i18n';
import type { WeeklyTarget } from '@/lib/progression-engine';

vi.mock('@/contexts/UserContext', () => ({ useCurrentUser: () => ({ uid: 'synthetic-user' }) }));
vi.mock('@/lib/app-telemetry', () => ({ trackTelemetryEvent: vi.fn() }));
vi.mock('@/lib/error-telemetry', () => ({ reportClientError: vi.fn() }));
vi.mock('@/lib/firebase', () => ({ db: {} }));

const exercise = { id: 'rdl', name: 'Martwy ciąg rumuński (RDL)', sets: '3 x 6-8', instructions: [] };
const sets = [
  { weight: 85, reps: 7, completed: false },
  { weight: 85, reps: 7, completed: false },
  { weight: 85, reps: 7, completed: false },
];
const weekly = (over: Partial<WeeklyTarget> = {}): WeeklyTarget => ({
  exerciseId: 'rdl', exerciseName: exercise.name, kind: 'hold', targetWeight: 85,
  targetReps: null, targetSets: null, targetDurationSec: null,
  reasonKey: 'progression.reason.hold', ...over,
});
const pinned = (note = 'Pin nr 6', machineSettings = 'Siedzisko 4') => ({
  id: 'rdl-note', userId: 'synthetic-user', exerciseKey: 'rdl', exerciseName: exercise.name,
  note, machineSettings, updatedAt: Date.parse('2026-09-09T08:00:00Z'),
});

beforeEach(() => { localStorage.setItem('app-language', 'pl'); });

describe('compact workout context preserves the full training controls and information', () => {
  it('opens and closes target explanation without changing any working set', () => {
    const onSetsChange = vi.fn();
    render(<MemoryRouter><LanguageProvider><UnitProvider>
      <ExerciseCard exercise={exercise} index={1} savedSets={sets} weeklyTarget={weekly()} onSetsChange={onSetsChange} />
    </UnitProvider></LanguageProvider></MemoryRouter>);

    const reason = translate('pl', 'progression.reason.hold');
    expect(screen.queryByText(reason)).not.toBeInTheDocument();
    const toggle = within(screen.getByTestId('exercise-card-target')).getByRole('button');
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    fireEvent.click(toggle);
    expect(screen.getByText(reason)).toBeVisible();
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    fireEvent.click(toggle);
    expect(screen.queryByText(reason)).not.toBeInTheDocument();
    expect(screen.getAllByRole('textbox', { name: /Set \d, kg/ })).toHaveLength(3);
    expect(screen.getByRole('textbox', { name: /Set 1, kg/ })).toHaveValue('85');
    expect(onSetsChange).not.toHaveBeenCalled();
  });

  it('keeps the pain warning visible before the first set without requiring disclosure', () => {
    render(<MemoryRouter><LanguageProvider><UnitProvider>
      <ExerciseCard exercise={exercise} index={1} savedSets={sets}
        weeklyTarget={weekly({ kind: 'pain', reasonKey: 'progression.reason.pain' })} />
    </UnitProvider></LanguageProvider></MemoryRouter>);
    expect(screen.getByText(translate('pl', 'progression.reason.pain'))).toBeVisible();
  });

  it('shows the pinned content and edit action without a repeated explanatory heading', () => {
    const onSave = vi.fn();
    render(<LanguageProvider><PinnedNoteSection exerciseName={exercise.name} pinnedNote={pinned()} onSave={onSave} /></LanguageProvider>);
    expect(screen.getByTestId('pinned-note-text')).toHaveTextContent('Pin nr 6');
    expect(screen.getByTestId('pinned-note-machine')).toHaveTextContent('Siedzisko 4');
    expect(screen.queryByText(translate('pl', 'notes.pinnedAlways'))).not.toBeInTheDocument();
    fireEvent.click(screen.getByTestId('pinned-note-edit'));
    expect(screen.getByTestId('pinned-note-input')).toHaveValue('Pin nr 6');
    expect(screen.getByTestId('pinned-note-machine-input')).toHaveValue('Siedzisko 4');
    fireEvent.change(screen.getByTestId('pinned-note-input'), { target: { value: 'Pin nr 7' } });
    fireEvent.click(screen.getByTestId('pinned-note-save'));
    expect(onSave).toHaveBeenCalledWith(exercise.name, { note: 'Pin nr 7', machineSettings: 'Siedzisko 4' });
  });

  it('retains complete long notes and machine settings in read-only mode', () => {
    const note = 'Technika i uchwyt. '.repeat(20);
    const machineSettings = 'Siedzisko 4; podparcie 6; pin 8. '.repeat(4);
    render(<LanguageProvider><PinnedNoteSection exerciseName={exercise.name} pinnedNote={pinned(note, machineSettings)} /></LanguageProvider>);
    expect(screen.getByTestId('pinned-note-text').textContent).toBe(note);
    expect(screen.getByTestId('pinned-note-machine').textContent).toContain(machineSettings);
    expect(screen.queryByTestId('pinned-note-edit')).not.toBeInTheDocument();
  });
});
