import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { CycleCard } from '@/components/CycleCard';
import { LanguageProvider } from '@/contexts/LanguageContext';
import type { PlanCycle } from '@/types/cycles';

const cycle: PlanCycle = {
  id: 'cycle-1',
  userId: 'user-1',
  days: [],
  durationWeeks: 8,
  startDate: '2026-08-01',
  endDate: '2026-09-25',
  status: 'active',
  createdAt: '2026-08-01T00:00:00.000Z',
  stats: { totalWorkouts: 4, totalTonnage: 1200, prs: [], completionRate: 50 },
};

describe('CycleCard: oczywista i dostępna akcja', () => {
  it('otwiera cykl kliknięciem, Enterem i spacją', () => {
    const onClick = vi.fn();
    render(
      <LanguageProvider>
        <CycleCard cycle={cycle} onClick={onClick} />
      </LanguageProvider>,
    );

    const card = screen.getByRole('button');
    expect(card).toHaveAttribute('tabindex', '0');
    fireEvent.click(card);
    fireEvent.keyDown(card, { key: 'Enter' });
    fireEvent.keyDown(card, { key: ' ' });
    expect(onClick).toHaveBeenCalledTimes(3);
  });
});
