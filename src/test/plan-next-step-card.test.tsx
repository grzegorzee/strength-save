import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { PlanNextStepCard } from '@/components/PlanNextStepCard';
import { emitUserEvent } from '@/lib/user-events';
import type { PlanNextStepAction } from '@/lib/plan-next-step';

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

const renderCard = (props: Partial<Parameters<typeof PlanNextStepCard>[0]> = {}) => render(
  <MemoryRouter>
    <PlanNextStepCard
      step={step()}
      uid="u1"
      planStartDate="2026-03-02"
      canRepeat
      onRepeat={() => {}}
      {...props}
    />
  </MemoryRouter>,
);

beforeEach(() => vi.clearAllMocks());

describe('PlanNextStepCard (C-T4: jedna karta decyzyjna)', () => {
  it('closeout: trzy akcje (przygotuj / kontynuuj-zobacz / powtórz)', () => {
    const onRepeat = vi.fn();
    renderCard({ onRepeat });
    expect(screen.getByText('Przygotuj kolejny plan')).toBeTruthy();
    expect(screen.getByText('Zobacz cykle')).toBeTruthy();
    fireEvent.click(screen.getByTestId('plan-next-repeat'));
    expect(onRepeat).toHaveBeenCalledTimes(1);
  });

  it('koniec planu emituje idempotentne zdarzenie inboxa (klucz po startDate)', () => {
    renderCard();
    expect(emitUserEvent).toHaveBeenCalledWith('u1', expect.objectContaining({
      type: 'plan',
      key: 'plan-ended-2026-03-02',
      payload: expect.objectContaining({ action: 'ended' }),
    }));
  });

  it('stan nie-końcowy: bez emisji i bez przycisku Powtórz', () => {
    renderCard({ step: step({ state: 'warning' }) });
    expect(emitUserEvent).not.toHaveBeenCalled();
    expect(screen.queryByTestId('plan-next-repeat')).toBeNull();
  });

  it('statsLine (fala 2): renderowana gdy podana, brak linii gdy undefined', () => {
    const { unmount } = renderCard({ statsLine: '96% obecności · 24 PR' });
    expect(screen.getByText('96% obecności · 24 PR')).toBeTruthy();
    unmount();
    renderCard();
    expect(screen.queryByText('96% obecności · 24 PR')).toBeNull();
  });

  it('dismiss renderuje się tylko z handlerem (Dashboard), Plan/Cykle bez X', () => {
    renderCard();
    expect(screen.queryByLabelText('dash.dismissHint')).toBeNull();
    renderCard({ onDismiss: () => {} });
    expect(screen.getByLabelText('dash.dismissHint')).toBeTruthy();
  });
});
