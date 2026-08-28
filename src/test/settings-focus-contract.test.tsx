import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { SettingRow } from '@/components/kinetic/SettingRow';

describe('settings interaction contract', () => {
  it('keeps clickable setting rows discoverable for keyboard and switch-control users', () => {
    render(<SettingRow label="Język" value="Polski" onClick={() => undefined} />);

    expect(screen.getByRole('button', { name: /Język Polski/ })).toHaveClass(
      'touch-manipulation',
      'focus-visible:outline-none',
      'focus-visible:ring-2',
      'focus-visible:ring-ring',
      'focus-visible:ring-offset-2',
      'focus-visible:ring-offset-background',
    );
  });
});
