// WP-L (X30): nazwa dnia podazy za data przelozenia. Trening przelozony
// pn->sr renderowal sie pod naglowkiem "Sr., 26 SIE", ale tytul karty to
// nadal "Poniedzialek" (dayName dnia planu). Domyslna nazwa weekday ma
// podazac za data docelowa; wlasna nazwa usera ("Push") zostaje.
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { displayDayNameForDate, displayDayNameForDateISO } from '@/lib/plan-i18n';
import { parseLocalDate } from '@/lib/utils';
import { TrainingDayCard } from '@/components/TrainingDayCard';
import type { TrainingDay } from '@/data/trainingPlan';

vi.mock('@/contexts/LanguageContext', () => ({
  useTranslation: () => ({ t: (k: string) => k, lang: 'pl' }),
}));

// 2026-08-24 = poniedzialek, 2026-08-26 = sroda.
const MONDAY = parseLocalDate('2026-08-24');
const WEDNESDAY = parseLocalDate('2026-08-26');

describe('displayDayNameForDate (WP-L, X30)', () => {
  it('domyslna nazwa weekday podaza za data: pn->sr daje Sroda (PL) / Wednesday (EN)', () => {
    expect(displayDayNameForDate('Poniedziałek', 'monday', WEDNESDAY, 'pl')).toBe('Środa');
    expect(displayDayNameForDate('Poniedziałek', 'monday', WEDNESDAY, 'en')).toBe('Wednesday');
  });

  it('angielska domyslna nazwa tez jest rozpoznawana jako domyslna', () => {
    expect(displayDayNameForDate('Monday', 'monday', WEDNESDAY, 'pl')).toBe('Środa');
    expect(displayDayNameForDate('Monday', 'monday', WEDNESDAY, 'en')).toBe('Wednesday');
  });

  it('wlasna nazwa usera zostaje bez zmian niezaleznie od daty', () => {
    expect(displayDayNameForDate('Push', 'monday', WEDNESDAY, 'pl')).toBe('Push');
    expect(displayDayNameForDate('Klatka', 'monday', WEDNESDAY, 'en')).toBe('Klatka');
  });

  it('niezmiennik: bez przelozenia (data zgodna z weekday) nazwa jak dotad, z lokalizacja', () => {
    expect(displayDayNameForDate('Poniedziałek', 'monday', MONDAY, 'pl')).toBe('Poniedziałek');
    expect(displayDayNameForDate('Poniedziałek', 'monday', MONDAY, 'en')).toBe('Monday');
    expect(displayDayNameForDate('Push', 'monday', MONDAY, 'pl')).toBe('Push');
  });

  it('nazwa INNEGO weekday niz day.weekday traktowana jak wlasna (snapshoty historii zostaja)', () => {
    // np. workoutToDay: dayName "Poniedziałek" ze snapshotu sesji, weekday
    // wyliczony z daty (wednesday) — nie przemianowujemy zapisanej sesji.
    expect(displayDayNameForDate('Poniedziałek', 'wednesday', WEDNESDAY, 'pl')).toBe('Poniedziałek');
  });

  it('wariant ISO: poprawna data podaza, zly string degraduje do dotychczasowej nazwy (nie rzuca)', () => {
    expect(displayDayNameForDateISO('Poniedziałek', 'monday', '2026-08-26', 'pl')).toBe('Środa');
    expect(displayDayNameForDateISO('Poniedziałek', 'monday', 'zepsute', 'pl')).toBe('Poniedziałek');
    expect(displayDayNameForDateISO('Poniedziałek', 'monday', 'zepsute', 'en')).toBe('Monday');
  });
});

// X70 (B2): tytul karty = focus treningu (dzien+data mieszka w naglowku sekcji
// timeline); nazwa dnia zostaje w aria-label i jako fallback pustego focusu,
// gdzie nadal podaza za trainingDate (WP-L, X30).
describe('TrainingDayCard: tytul = focus, dzien w aria podaza za trainingDate (X70 + WP-L X30)', () => {
  const day = (dayName: string, focus = 'Barki / Detale'): TrainingDay => ({
    id: 'd1',
    dayName,
    weekday: 'monday',
    focus,
    exercises: [{ id: 'e1', name: 'X', sets: '3x8', instructions: [] }],
  });

  it('tytulem karty jest focus, nazwa dnia nie powtarza sie w tresci', () => {
    render(<TrainingDayCard day={day('Poniedziałek')} trainingDate={MONDAY} onClick={() => {}} />);
    expect(screen.getByText('Barki / Detale')).toBeTruthy();
    expect(screen.queryByText('Poniedziałek')).toBeNull();
  });

  it('aria-label karty podaza za data przelozenia pn->sr (WP-L)', () => {
    render(<TrainingDayCard day={day('Poniedziałek')} trainingDate={WEDNESDAY} onClick={() => {}} />);
    expect(screen.getByRole('button', { name: 'Środa' })).toBeTruthy();
  });

  it('pusty focus: fallback na nazwe dnia podazajaca za data (tytul nigdy nie jest pusty)', () => {
    render(<TrainingDayCard day={day('Poniedziałek', '')} trainingDate={WEDNESDAY} onClick={() => {}} />);
    expect(screen.getByText('Środa')).toBeTruthy();
  });

  it('pusty focus + wlasna nazwa usera: fallback zostawia wlasna nazwe, takze bez trainingDate', () => {
    const { unmount } = render(
      <TrainingDayCard day={day('Push', '')} trainingDate={WEDNESDAY} onClick={() => {}} />,
    );
    expect(screen.getByText('Push')).toBeTruthy();
    unmount();
    render(<TrainingDayCard day={day('Push', '')} onClick={() => {}} />);
    expect(screen.getByText('Push')).toBeTruthy();
  });
});
