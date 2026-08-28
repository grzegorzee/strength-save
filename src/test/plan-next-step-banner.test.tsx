import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { PlanNextStepCard } from '@/components/PlanNextStepCard';
import { emitUserEvent } from '@/lib/user-events';
import type { PlanNextStepAction } from '@/lib/plan-next-step';

// Fala 2 (2026-08-20): wariant `banner` na Dashboardzie. Niezmiennik: rozwinięty
// banner pokazuje TE SAME akcje co wariant card (żadna funkcja nie znika).

vi.mock('@/contexts/LanguageContext', () => ({
  useTranslation: () => ({ t: (k: string) => k, lang: 'pl' }),
}));
vi.mock('@/lib/user-events', () => ({
  emitUserEvent: vi.fn(async () => undefined),
  planEventKey: (action: string, ref: string) => `plan-${action}-${ref}`,
}));

const step = (over: Partial<PlanNextStepAction> = {}): PlanNextStepAction => ({
  state: 'closeout',
  title: 'Cykl dobiegł końca',
  description: 'Zdecyduj co dalej.',
  badges: ['88% frekwencji'],
  primaryLabel: 'Przygotuj kolejny plan',
  primaryPath: '/new-plan?fromCycle=c1',
  secondaryLabel: 'Zobacz cykle',
  secondaryPath: '/cycles',
  tone: 'primary',
  ...over,
});

const actionLabels = () =>
  Array.from(document.querySelectorAll('button'))
    .map((b) => b.textContent?.trim())
    .filter((label) => label && label !== 'dash.nextStep.decide');

const renderStep = (props: Partial<Parameters<typeof PlanNextStepCard>[0]> = {}) => render(
  <MemoryRouter>
    <PlanNextStepCard
      step={step()}
      uid="u1"
      planStartDate="2026-03-02"
      canRepeat
      onRepeat={() => {}}
      onDismiss={() => {}}
      {...props}
    />
  </MemoryRouter>,
);

beforeEach(() => vi.clearAllMocks());

describe('PlanNextStepCard wariant banner (fala 2)', () => {
  it('zwinięty: tytuł, opis i pigułka Zdecyduj; akcje ukryte', () => {
    renderStep({ variant: 'banner' });
    expect(screen.getByText('Cykl dobiegł końca')).toBeTruthy();
    expect(screen.getByText('Zdecyduj co dalej.')).toBeTruthy();
    expect(screen.getByTestId('plan-next-decide')).toBeTruthy();
    expect(screen.queryByText('Przygotuj kolejny plan')).toBeNull();
    expect(screen.queryByTestId('plan-next-repeat')).toBeNull();
    // X (dismiss) dostępny bez rozwijania.
    const dismiss = screen.getByLabelText('dash.dismissHint');
    expect(dismiss).toBeTruthy();
    expect(dismiss.className).toContain('min-h-11');
    expect(dismiss.className).toContain('min-w-11');
  });

  it('rozwinięcie ujawnia KOMPLET akcji wariantu card (primary/secondary/repeat)', () => {
    const onRepeat = vi.fn();
    const { unmount } = renderStep({ onRepeat });
    const cardLabels = actionLabels();
    unmount();

    renderStep({ variant: 'banner', onRepeat });
    fireEvent.click(screen.getByTestId('plan-next-decide'));
    expect(screen.getByText('Przygotuj kolejny plan')).toBeTruthy();
    expect(screen.getByText('Zobacz cykle')).toBeTruthy();
    expect(screen.getByText('88% frekwencji')).toBeTruthy();
    fireEvent.click(screen.getByTestId('plan-next-repeat'));
    expect(onRepeat).toHaveBeenCalledTimes(1);

    // Snapshot listy labeli: banner po rozwinięciu = card (plus brak "Zdecyduj").
    const bannerLabels = actionLabels();
    for (const label of cardLabels) expect(bannerLabels).toContain(label);
  });

  it('emisja plan-ended działa niezależnie od rozwinięcia', () => {
    renderStep({ variant: 'banner' });
    expect(emitUserEvent).toHaveBeenCalledWith('u1', expect.objectContaining({
      key: 'plan-ended-2026-03-02',
    }));
  });
});
