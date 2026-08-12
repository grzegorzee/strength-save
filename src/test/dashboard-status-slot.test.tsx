import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { DashboardStatusSlot } from '@/components/DashboardStatusSlot';

vi.mock('@/contexts/LanguageContext', () => ({
  useTranslation: () => ({ t: (k: string, p?: Record<string, unknown>) => (p ? `${k}:${p.n}` : k) }),
}));

const entries = [
  { id: 'vacation', priority: 80, node: <div>URLOP</div> },
  { id: 'offline-sync', priority: 100, node: <div>OFFLINE</div> },
  { id: 'reduced', priority: 70, node: <div>REDUCED</div> },
];

describe('DashboardStatusSlot', () => {
  it('puste entries: nic nie renderuje', () => {
    const { container } = render(<DashboardStatusSlot entries={[]} />);
    expect(container.firstChild).toBeNull();
  });

  it('renderuje tylko najwyższy priorytet, reszta za togglem', () => {
    render(<DashboardStatusSlot entries={entries} />);
    expect(screen.getByText('OFFLINE')).toBeTruthy();
    expect(screen.queryByText('URLOP')).toBeNull();
    fireEvent.click(screen.getByTestId('status-slot-toggle'));
    expect(screen.getByText('URLOP')).toBeTruthy();
    expect(screen.getByText('REDUCED')).toBeTruthy();
  });

  it('jeden wpis: bez toggle', () => {
    render(<DashboardStatusSlot entries={[entries[0]]} />);
    expect(screen.getByText('URLOP')).toBeTruthy();
    expect(screen.queryByTestId('status-slot-toggle')).toBeNull();
  });
});
