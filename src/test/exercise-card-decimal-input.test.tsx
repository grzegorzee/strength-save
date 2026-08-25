import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { LanguageProvider } from '@/contexts/LanguageContext';
import { UnitProvider } from '@/contexts/UnitContext';
import { ExerciseCard } from '@/components/ExerciseCard';
import { lbsToKg } from '@/lib/units';
import type { Exercise } from '@/data/trainingPlan';
import type { SetData } from '@/types';

// Z178: klawiatura PL podaje PRZECINEK. Pole wagi (type="number" + parseFloat||0)
// robiło z "47,3" wpis 47 albo — wariant WebKit — ZAPIS 0 kg (cicha utrata).

vi.mock('@/contexts/UserContext', () => ({
  useCurrentUser: () => ({ uid: 'test-uid' }),
}));
vi.mock('@/lib/app-telemetry', () => ({ trackTelemetryEvent: vi.fn() }));
vi.mock('@/lib/error-telemetry', () => ({ reportClientError: vi.fn() }));
// Krok 6: RestBar renderuje WorkoutSettingsSheet — moduł ciągnie realny init
// Firebase (initializeAuth pada w jsdom), więc mock.
vi.mock('@/lib/firebase', () => ({ db: {} }));

const exercise: Exercise = {
  id: 'ex-1',
  name: 'Wyciskanie sztangi na ławce płaskiej',
  sets: '2 x 6-8',
  instructions: [],
};

const workingSet = (over: Partial<SetData> = {}): SetData => ({
  reps: 0,
  weight: 0,
  completed: false,
  ...over,
});

const renderCard = (props: Partial<Parameters<typeof ExerciseCard>[0]> = {}) => {
  const view = render(
    <MemoryRouter>
      <LanguageProvider>
        <UnitProvider>
          <ExerciseCard exercise={exercise} index={1} {...props} />
        </UnitProvider>
      </LanguageProvider>
    </MemoryRouter>,
  );
  return { ...view, card: view.container.querySelector('.exercise-card') as HTMLElement };
};

beforeEach(() => {
  localStorage.clear();
  localStorage.setItem('app-language', 'pl');
});

const lastSets = (spy: ReturnType<typeof vi.fn>): SetData[] => spy.mock.calls.at(-1)?.[1] as SetData[];

describe('Z178: przecinek dziesiętny w polach karty', () => {
  it('waga "47,3" commituje 47.3 (nie 47, nie 0)', () => {
    const onSetsChange = vi.fn();
    const { card } = renderCard({
      savedSets: [workingSet({ isWarmup: true }), workingSet()],
      onSetsChange,
    });
    const weightInput = within(card).getAllByLabelText(/kg$/).at(-1) as HTMLInputElement;

    fireEvent.change(weightInput, { target: { value: '47,3' } });
    expect(lastSets(onSetsChange)[1].weight).toBe(47.3);
  });

  it('stan pośredni "47," NIE zmienia wagi, po blur pole pokazuje wartość z kropką', () => {
    const onSetsChange = vi.fn();
    const { card } = renderCard({
      savedSets: [workingSet({ isWarmup: true }), workingSet({ weight: 60, reps: 8 })],
      onSetsChange,
    });
    const weightInput = within(card).getAllByLabelText(/kg$/).at(-1) as HTMLInputElement;

    fireEvent.change(weightInput, { target: { value: '47,' } });
    expect(onSetsChange).not.toHaveBeenCalled();

    fireEvent.change(weightInput, { target: { value: '47,3' } });
    fireEvent.blur(weightInput);
    expect(weightInput.value).toBe('47.3');
  });

  it('lbs: "185,5" idzie przez fromInput (kanoniczne kg w stanie)', () => {
    localStorage.setItem('unit-system', 'lbs');
    const onSetsChange = vi.fn();
    const { card } = renderCard({
      savedSets: [workingSet({ isWarmup: true }), workingSet()],
      onSetsChange,
    });
    const weightInput = within(card).getAllByLabelText(/lbs$/).at(-1) as HTMLInputElement;

    fireEvent.change(weightInput, { target: { value: '185,5' } });
    expect(lastSets(onSetsChange)[1].weight).toBeCloseTo(lbsToKg(185.5), 5);
  });

  it('RPE "8,5" → metrics.rpe === 8.5 (nie NaN znikające po powrocie)', () => {
    const onMetricsChange = vi.fn();
    const { getByPlaceholderText } = renderCard({
      savedSets: [workingSet({ isWarmup: true }), workingSet()],
      onMetricsChange,
      defaultMetricsVisible: true,
    });
    const rpeInput = getByPlaceholderText('8') as HTMLInputElement;

    fireEvent.change(rpeInput, { target: { value: '8,5' } });
    expect(onMetricsChange).toHaveBeenCalledWith('ex-1', { rpe: 8.5 });
  });
});

// Bug 6 (X30): pole dystansu (weight_distance_duration) zostało na type="number"
// + parseFloat||0 — "20,5" sanitizowane przez WebKit do "" robiło cichy zapis
// distanceM=0 (normalizatory dropują <=0, historia traci komponent dystansu).
// Ta sama klasa błędu co waga w Z178; fix = ten sam DecimalInput.
describe('bug 6 (X30): przecinek dziesiętny w polu dystansu', () => {
  const renderDistanceCard = () => {
    const onSetsChange = vi.fn();
    const { card } = renderCard({
      savedSets: [workingSet()],
      onSetsChange,
      trackingType: 'weight_distance_duration',
    });
    const distanceInput = within(card).getAllByLabelText(/Dystans$/).at(-1) as HTMLInputElement;
    return { onSetsChange, distanceInput };
  };

  it('dystans "20,5" commituje 20.5 m (nie 0, nie 20)', () => {
    const { onSetsChange, distanceInput } = renderDistanceCard();
    fireEvent.change(distanceInput, { target: { value: '20,5' } });
    expect(lastSets(onSetsChange)[0].distanceM).toBe(20.5);
  });

  it('stan pośredni "20," NIE zeruje dystansu', () => {
    const { onSetsChange, distanceInput } = renderDistanceCard();
    fireEvent.change(distanceInput, { target: { value: '20' } });
    expect(lastSets(onSetsChange)[0].distanceM).toBe(20);
    fireEvent.change(distanceInput, { target: { value: '20,' } });
    expect(lastSets(onSetsChange)[0].distanceM).toBe(20);
  });

  it('puste pole = jawne wyczyszczenie (distanceM 0)', () => {
    const { onSetsChange, distanceInput } = renderDistanceCard();
    fireEvent.change(distanceInput, { target: { value: '15' } });
    fireEvent.change(distanceInput, { target: { value: '' } });
    expect(lastSets(onSetsChange)[0].distanceM).toBe(0);
  });
});
