import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { Switch } from '@/components/ui/switch';

describe('Switch visual contract', () => {
  it('keeps the inactive track visible and exposes a keyboard focus indicator', () => {
    render(<Switch aria-label="Test switch" />);

    const control = screen.getByRole('switch', { name: 'Test switch' });

    expect(control).toHaveClass('border-border');
    expect(control).toHaveClass(
      'focus-visible:outline-none',
      'focus-visible:ring-2',
      'focus-visible:ring-ring',
      'focus-visible:ring-offset-2',
    );
  });
});
