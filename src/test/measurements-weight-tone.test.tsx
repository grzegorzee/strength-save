import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { LanguageProvider } from '@/contexts/LanguageContext';
import { UnitProvider } from '@/contexts/UnitContext';
import { buildRecordedMeasurement } from '@/test/canonical-states';

// WP-G (X35a): kolor delty WAGI w Historii pomiarów (wiersz + badge trendu w
// nagłówku) idzie z JEDNEJ funkcji weightDeltaTone(delta, objective), gdzie cel
// = profile.trainingProfile.objective. Przed zmianą wiersz był neutralny, a badge
// miał zaszyte "wzrost = źle" (sprzeczność dla build_muscle). NIEZMIENNIK:
// obwody kolorowane jak dotąd wg MEASUREMENT_FIELD_GOALS, niezależnie od celu.

const pageMocks = vi.hoisted(() => ({
  measurements: [] as unknown[],
  objective: undefined as string | undefined,
}));

vi.mock('@/contexts/UserContext', () => ({
  useCurrentUser: () => ({
    uid: 'u1',
    canUseBodyPhotos: false,
    isAdmin: false,
    profile: { displayName: 'Tester', trainingProfile: pageMocks.objective ? { objective: pageMocks.objective } : undefined },
  }),
}));
vi.mock('@/hooks/useFirebaseWorkouts', () => ({
  useFirebaseWorkouts: () => ({
    measurements: pageMocks.measurements,
    addMeasurement: vi.fn(),
    updateMeasurement: vi.fn(),
    deleteMeasurement: vi.fn(),
    getLatestMeasurement: () => undefined,
  }),
}));
vi.mock('@/hooks/useHealthConsent', () => ({ useHealthConsent: () => true }));
vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: vi.fn() }) }));
vi.mock('@/lib/firebase', () => ({ storage: {}, db: {} }));
vi.mock('firebase/storage', () => ({ ref: vi.fn(), uploadBytes: vi.fn(), getDownloadURL: vi.fn() }));
vi.mock('@/components/MeasurementTrendChart', () => ({ default: () => null }));
vi.mock('@/components/HealthWeightSuggestion', () => ({ HealthWeightSuggestion: () => null }));

import Measurements from '@/pages/Measurements';

// Dwa wpisy: wcześniejszy 84 kg / talia 90, późniejszy 83 kg / talia 88
// (kanoniczny kształt z recordedAt; waga i talia SPADAJĄ).
const earlier = { ...buildRecordedMeasurement('2026-08-10', 8), id: 'm-earlier', weight: 84, waist: 90 };
const later = { ...buildRecordedMeasurement('2026-08-17', 8), id: 'm-later', weight: 83, waist: 88 };

const renderPage = () =>
  render(
    <MemoryRouter>
      <LanguageProvider>
        <UnitProvider>
          <Measurements />
        </UnitProvider>
      </LanguageProvider>
    </MemoryRouter>,
  );

const laterRow = () => screen.getByTestId('measurement-row-m-later');
const weightDelta = () => within(laterRow()).getByTestId('measurement-delta-weight');
const waistDelta = () => within(laterRow()).getByTestId('measurement-delta-waist');
const trendBadge = () => screen.getByTestId('measurement-weight-trend');

beforeEach(() => {
  localStorage.clear();
  localStorage.setItem('app-language', 'pl');
  pageMocks.measurements = [earlier, later];
  pageMocks.objective = undefined;
});

describe('ton delty wagi wg celu (WP-G)', () => {
  it.each([
    ['fat_loss', 'success', 'text-fitness-success'],
    ['build_muscle', 'destructive', 'text-destructive'],
    ['peak_strength', 'destructive', 'text-destructive'],
    ['athletic', 'neutral', 'text-muted-foreground'],
    [undefined, 'neutral', 'text-muted-foreground'],
  ])('cel %s: spadek wagi -1 kg w wierszu i badge\'u ma ton %s', (objective, tone, cls) => {
    pageMocks.objective = objective;
    renderPage();

    expect(weightDelta()).toHaveAttribute('data-tone', tone);
    expect(weightDelta()).toHaveClass(cls);
    expect(weightDelta()).toHaveTextContent('-1');
    expect(trendBadge()).toHaveAttribute('data-tone', tone);
    expect(trendBadge()).toHaveClass(cls);
  });

  it('build_muscle: wzrost wagi = success (badge nie ma już zaszytego "wzrost = źle")', () => {
    pageMocks.objective = 'build_muscle';
    pageMocks.measurements = [{ ...earlier, weight: 83 }, { ...later, weight: 84.5 }];
    renderPage();

    expect(weightDelta()).toHaveAttribute('data-tone', 'success');
    expect(weightDelta()).toHaveTextContent('+1.5');
    expect(trendBadge()).toHaveAttribute('data-tone', 'success');
    expect(trendBadge()).toHaveTextContent('1.5');
  });

  it('fat_loss: wzrost wagi = destructive', () => {
    pageMocks.objective = 'fat_loss';
    pageMocks.measurements = [{ ...earlier, weight: 83 }, { ...later, weight: 84.5 }];
    renderPage();

    expect(weightDelta()).toHaveAttribute('data-tone', 'destructive');
    expect(trendBadge()).toHaveAttribute('data-tone', 'destructive');
  });

  it('NIEZMIENNIK: obwody wg MEASUREMENT_FIELD_GOALS niezależnie od celu (talia w dół = success także przy build_muscle)', () => {
    pageMocks.objective = 'build_muscle';
    renderPage();

    expect(waistDelta()).toHaveClass('text-fitness-success');
    expect(waistDelta()).toHaveTextContent('-2');
  });

  it('badge trendu: równa waga = brak badge\'a delty (jak dotąd, jeden wpis = brak badge\'a)', () => {
    pageMocks.objective = 'fat_loss';
    pageMocks.measurements = [later];
    renderPage();

    expect(screen.queryByTestId('measurement-weight-trend')).toBeNull();
  });
});
