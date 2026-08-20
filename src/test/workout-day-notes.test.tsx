// T10 (feedback 2026-08-20): notatka przypięta do DNIA treningu — planowanie
// przyszłej sesji z Planu. Osobny byt od dayNotes draftu i notatek per ćwiczenie.
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { LanguageProvider } from '@/contexts/LanguageContext';
import {
  sanitizeWorkoutDayNote,
  shouldShowNoWorkoutCard,
  workoutDayNoteDocId,
} from '@/lib/workout-day-notes';
import { WorkoutDayNoteSection } from '@/components/WorkoutDayNoteSection';

describe('workoutDayNoteDocId (T10)', () => {
  it('jest deterministyczny: ta sama para (user, data) daje ten sam id', () => {
    expect(workoutDayNoteDocId('u1', '2026-08-21')).toBe(workoutDayNoteDocId('u1', '2026-08-21'));
    expect(workoutDayNoteDocId('u1', '2026-08-21')).toBe('u1_2026-08-21');
  });

  it('rozróżnia userów i daty', () => {
    expect(workoutDayNoteDocId('u1', '2026-08-21')).not.toBe(workoutDayNoteDocId('u2', '2026-08-21'));
    expect(workoutDayNoteDocId('u1', '2026-08-21')).not.toBe(workoutDayNoteDocId('u1', '2026-08-22'));
  });
});

describe('sanitizeWorkoutDayNote (T10)', () => {
  it('trimuje notatkę', () => {
    expect(sanitizeWorkoutDayNote({ note: '  wziąć pas  ' })).toEqual({ note: 'wziąć pas' });
  });

  it('obcina do 500 znaków', () => {
    expect(sanitizeWorkoutDayNote({ note: 'x'.repeat(600) }).note).toHaveLength(500);
  });

  it('brak note → pusty string (sygnał usunięcia, nie undefined)', () => {
    expect(sanitizeWorkoutDayNote({})).toEqual({ note: '' });
    expect(sanitizeWorkoutDayNote({ note: '   ' })).toEqual({ note: '' });
  });
});

describe('shouldShowNoWorkoutCard (T10, niezmiennik zasady 5)', () => {
  const today = '2026-08-20';

  it('przeszła data bez sesji NADAL dostaje kartę noWorkoutForDate', () => {
    expect(shouldShowNoWorkoutCard({ isWorkoutStarted: false, targetDateISO: '2026-08-10', todayISO: today })).toBe(true);
  });

  it('PRZYSZŁA data nie dostaje mylącej karty (to zaplanowany trening)', () => {
    expect(shouldShowNoWorkoutCard({ isWorkoutStarted: false, targetDateISO: '2026-08-25', todayISO: today })).toBe(false);
  });

  it('dziś bez sesji: bez karty (jest przycisk startu)', () => {
    expect(shouldShowNoWorkoutCard({ isWorkoutStarted: false, targetDateISO: today, todayISO: today })).toBe(false);
  });

  it('rozpoczęta sesja: nigdy', () => {
    expect(shouldShowNoWorkoutCard({ isWorkoutStarted: true, targetDateISO: '2026-08-10', todayISO: today })).toBe(false);
  });
});

const renderSection = (props: Partial<Parameters<typeof WorkoutDayNoteSection>[0]> = {}) =>
  render(
    <LanguageProvider>
      <WorkoutDayNoteSection dateISO="2026-08-21" {...props} />
    </LanguageProvider>,
  );

beforeEach(() => {
  localStorage.clear();
  localStorage.setItem('app-language', 'pl');
});

describe('WorkoutDayNoteSection (T10)', () => {
  it('pusta bez onSave: nie renderuje się', () => {
    renderSection();
    expect(screen.queryByTestId('workout-day-note-section')).toBeNull();
  });

  it('pusta z onSave: pokazuje "Dodaj notatkę", zapis woła onSave z datą i treścią', () => {
    const onSave = vi.fn();
    renderSection({ onSave });
    fireEvent.click(screen.getByTestId('workout-day-note-edit'));
    fireEvent.change(screen.getByTestId('workout-day-note-input'), { target: { value: 'wziąć pas' } });
    fireEvent.click(screen.getByTestId('workout-day-note-save'));
    expect(onSave).toHaveBeenCalledWith('2026-08-21', 'wziąć pas');
  });

  it('istniejąca notatka: tekst widoczny, cancel przywraca draft bez zapisu', () => {
    const onSave = vi.fn();
    renderSection({
      onSave,
      dayNote: { userId: 'u1', date: '2026-08-21', note: 'spróbować 80 kg', updatedAt: 1 },
    });
    expect(screen.getByTestId('workout-day-note-text').textContent).toBe('spróbować 80 kg');
    fireEvent.click(screen.getByTestId('workout-day-note-edit'));
    fireEvent.change(screen.getByTestId('workout-day-note-input'), { target: { value: 'inaczej' } });
    fireEvent.click(screen.getByText('Anuluj'));
    expect(onSave).not.toHaveBeenCalled();
    expect(screen.getByTestId('workout-day-note-text').textContent).toBe('spróbować 80 kg');
  });

  it('przyszła data: dopisek futureHint widoczny', () => {
    renderSection({ onSave: vi.fn(), showFutureHint: true });
    expect(screen.getByText('(zobaczysz ją przy starcie treningu)')).toBeTruthy();
  });
});
