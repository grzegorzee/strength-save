import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import { hasProPlan } from '@/lib/subscription-summary';
import { ProfileHeaderChips } from '@/components/kinetic/ProfileHeaderChips';

// Spec 2026-08-11 (redesign Profilu): chip PRO w nagłówku tylko dla planu
// płatnego/trial/comp/admin; darmowy user BEZ chipa FREE; poziom zawsze.
describe('hasProPlan', () => {
  it.each([
    'subscription.admin',
    'subscription.comp',
    'subscription.plan.monthly',
    'subscription.plan.yearly',
    'subscription.plan.trial',
  ] as const)('%s daje chip PRO', (planKey) => {
    expect(hasProPlan(planKey)).toBe(true);
  });

  it('darmowy plan (subscription.none) bez chipa PRO', () => {
    expect(hasProPlan('subscription.none')).toBe(false);
  });
});

describe('ProfileHeaderChips', () => {
  it('user z planem: chip PRO i chip poziomu', () => {
    const { getByTestId } = render(<ProfileHeaderChips showPro tierLabel="Veteran" />);
    expect(getByTestId('chip-pro').textContent).toBe('PRO');
    expect(getByTestId('chip-tier').textContent).toBe('Veteran');
  });

  it('darmowy user: bez chipa PRO (i bez FREE), poziom nadal widoczny', () => {
    const { queryByTestId, getByTestId, container } = render(
      <ProfileHeaderChips showPro={false} tierLabel="Rookie" />,
    );
    expect(queryByTestId('chip-pro')).toBeNull();
    expect(container.textContent).not.toContain('FREE');
    expect(getByTestId('chip-tier').textContent).toBe('Rookie');
  });
});
