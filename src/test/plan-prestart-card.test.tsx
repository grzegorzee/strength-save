// WP-F (X35a): zakładka Plan przed startem cyklu. Plan od poniedziałku 7.09,
// dziś 25.08: bieżący tydzień to "Przed startem" (nie "Historia") z kartą
// pre-start nad zakresem tygodnia; CTA "Zobacz tydzień 1" skacze do
// tygodnia 1 z realnymi treningami. Niezmiennik: plan wystartowany = zero karty,
// tydzień sprzed startu dalej "Historia". Fixtury: canonical-states (zasada 11).
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { LanguageProvider } from '@/contexts/LanguageContext';
import { UnitProvider } from '@/contexts/UnitContext';
import {
  buildCanonicalState,
  type CanonicalState,
  type CanonicalStateId,
} from '@/test/canonical-states';

const fixture = vi.hoisted(() => ({
  state: undefined as unknown as CanonicalState,
}));

vi.mock('firebase/firestore', () => ({
  doc: vi.fn(() => ({})),
  getDoc: vi.fn(async () => ({ exists: () => false, data: () => undefined })),
  getDocFromServer: vi.fn(async () => ({ exists: () => false, data: () => undefined })),
  setDoc: vi.fn(async () => {}),
  updateDoc: vi.fn(async () => {}),
  deleteDoc: vi.fn(async () => {}),
  onSnapshot: vi.fn(() => () => {}),
  collection: vi.fn(),
  query: vi.fn(),
  where: vi.fn(),
  orderBy: vi.fn(),
  limit: vi.fn(),
  getDocs: vi.fn(async () => ({ empty: true, docs: [], forEach: () => {} })),
  runTransaction: vi.fn(),
  writeBatch: vi.fn(() => ({ set: vi.fn(), update: vi.fn(), delete: vi.fn(), commit: vi.fn(async () => {}) })),
  increment: vi.fn(),
  serverTimestamp: vi.fn(() => 0),
  Timestamp: { fromMillis: (ms: number) => ({ toMillis: () => ms }), now: () => ({ toMillis: () => Date.now() }) },
  addDoc: vi.fn(async () => ({})),
}));
vi.mock('@/lib/firebase', () => ({ db: {}, auth: {}, storage: {}, functions: {} }));
vi.mock('@/lib/error-telemetry', () => ({ reportClientError: vi.fn(async () => {}) }));
vi.mock('@/lib/app-telemetry', () => ({ trackTelemetryEvent: vi.fn() }));
vi.mock('@/contexts/UserContext', async () => {
  const helpers = await import('@/test/canonical-states');
  return { useCurrentUser: () => helpers.buildUseCurrentUserResult(fixture.state) };
});
vi.mock('@/hooks/useTrainingPlan', async () => {
  const helpers = await import('@/test/canonical-states');
  return { useTrainingPlan: () => helpers.buildUseTrainingPlanResult(fixture.state) };
});
vi.mock('@/hooks/useFirebaseWorkouts', async () => {
  const helpers = await import('@/test/canonical-states');
  return { useFirebaseWorkouts: () => helpers.buildUseFirebaseWorkoutsResult(fixture.state) };
});
vi.mock('@/hooks/usePlanCycles', async () => {
  const helpers = await import('@/test/canonical-states');
  return { usePlanCycles: () => helpers.buildUsePlanCyclesResult(fixture.state) };
});
vi.mock('@/hooks/useActivities', async () => {
  const helpers = await import('@/test/canonical-states');
  return { useActivities: () => helpers.buildUseActivitiesResult() };
});
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: vi.fn(), dismiss: vi.fn() }),
  toast: vi.fn(),
}));

import TrainingPlan from '@/pages/TrainingPlan';

const renderPlan = (stateId: CanonicalStateId) => {
  fixture.state = buildCanonicalState(stateId);
  return render(
    <MemoryRouter>
      <LanguageProvider>
        <UnitProvider>
          <TrainingPlan />
        </UnitProvider>
      </LanguageProvider>
    </MemoryRouter>,
  );
};

beforeEach(() => {
  localStorage.clear();
  localStorage.setItem('app-language', 'pl');
  // Wtorek 25.08.2026: plan-future-start-wpc = poniedziałek 2 tygodnie w przód = 7.09.
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date(2026, 7, 25, 12, 0, 0));
});

afterEach(() => {
  vi.useRealTimers();
});

describe('WP-F (X35a) — Plan przed startem cyklu', () => {
  it('plan od 7.09, dziś 25.08: karta pre-start nad tygodniem, nagłówek "Przed startem", bez "Historia"', () => {
    renderPlan('plan-future-start-wpc');
    expect(fixture.state.plan?.startDate).toBe('2026-09-07');

    const card = screen.getByTestId('plan-prestart-card');
    // B1c (X70): nagłówek strony już mówi "Przed startem" — karta na Planie
    // NIE dubluje eyebrow "Plan startuje" (Dashboard trzyma go bez zmian).
    expect(card.textContent).not.toContain('Plan startuje');
    const startLabel = new Date(2026, 8, 7).toLocaleDateString('pl-PL', { weekday: 'long', day: 'numeric', month: 'long' });
    expect(card.textContent).toContain(`Start: ${startLabel}`);
    // B1a (X70): pełna data startu pada w karcie dokładnie raz.
    expect(card.textContent?.split(startLabel)).toHaveLength(2);
    expect(card.textContent).toContain('Pierwszy trening:');
    // B1a: pierwszy trening w INNY dzień niż start → jego data zostaje.
    const firstLabel = new Date(2026, 8, 8).toLocaleDateString('pl-PL', { weekday: 'long', day: 'numeric', month: 'long' });
    expect(card.textContent).toContain(firstLabel);
    expect(screen.getByText('Przed startem')).toBeInTheDocument();
    expect(screen.queryByText('Historia')).toBeNull();
    expect(screen.queryByText(/Tydzień \d+\/8/)).toBeNull();
  });

  it('CTA "Zobacz tydzień 1" skacze do tygodnia 1 z treningami; karta znika', () => {
    renderPlan('plan-future-start-wpc');
    fireEvent.click(screen.getByRole('button', { name: 'Zobacz tydzień 1' }));

    expect(screen.getByText('Tydzień 1/8')).toBeInTheDocument();
    expect(screen.getByText(/Start planu/)).toBeInTheDocument();
    expect(screen.queryByTestId('plan-prestart-card')).toBeNull();
    // Tydzień 1 ma realne dni planu: dni kanoniczne zakotwiczone o "dziś"
    // (wtorek) i +2 (czwartek) => 8.09 i 10.09, od startu 7.09.
    expect(screen.getByTestId('plan-day-header-2026-09-08')).toBeInTheDocument();
    expect(screen.getByTestId('plan-day-header-2026-09-10')).toBeInTheDocument();
  });

  it('strzałka wstecz z tygodnia 1 wraca do "Przed startem" z kartą', () => {
    renderPlan('plan-future-start-wpc');
    fireEvent.click(screen.getByRole('button', { name: 'Zobacz tydzień 1' }));
    fireEvent.click(screen.getByLabelText('Poprzedni tydzień'));
    expect(screen.getByText('Przed startem')).toBeInTheDocument();
    expect(screen.getByTestId('plan-prestart-card')).toBeInTheDocument();
  });

  it('niezmiennik: plan wystartowany = bez karty, bieżący tydzień numerowany, tydzień sprzed startu = "Historia"', () => {
    renderPlan('active-plan');
    expect(screen.queryByTestId('plan-prestart-card')).toBeNull();
    expect(screen.getByText(/Tydzień \d+\/8/)).toBeInTheDocument();
    // Cofnij się przed start (start 3 tygodnie wstecz): historia, nadal bez karty.
    for (let i = 0; i < 4; i += 1) fireEvent.click(screen.getByLabelText('Poprzedni tydzień'));
    expect(screen.getByText('Historia')).toBeInTheDocument();
    expect(screen.queryByText('Przed startem')).toBeNull();
    expect(screen.queryByTestId('plan-prestart-card')).toBeNull();
  });
});
