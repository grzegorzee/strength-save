import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import { Trophy } from 'lucide-react';
import { AchievementBadge } from '@/components/kinetic/AchievementBadge';

describe('AchievementBadge', () => {
  it('zdobyta: materiał tieru, bez ghost', () => {
    const { getByTestId } = render(
      <AchievementBadge label="50 treningów" earned tier="gold" icon={Trophy} />,
    );
    expect(getByTestId('badge-hex').dataset.tier).toBe('gold');
    expect(getByTestId('badge-hex').dataset.earned).toBe('true');
  });
  it('ghost: earned=false, ten sam kształt', () => {
    const { getByTestId } = render(
      <AchievementBadge label="100 treningów" earned={false} tier="gold" icon={Trophy} />,
    );
    expect(getByTestId('badge-hex').dataset.earned).toBe('false');
  });
});
