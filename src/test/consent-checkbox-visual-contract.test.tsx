import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { ConsentCheckboxes } from '@/components/ConsentCheckboxes';
import { LanguageProvider } from '@/contexts/LanguageContext';

describe('Consent checkbox visual and accessibility contract', () => {
  it('keeps every consent control named, outlined, focusable and 44 px tappable', () => {
    render(
      <LanguageProvider>
        <ConsentCheckboxes
          value={{ terms: false, privacy: false, health: false, marketing: false }}
          onChange={vi.fn()}
        />
      </LanguageProvider>,
    );

    const controls = screen.getAllByRole('checkbox');
    expect(controls).toHaveLength(4);

    for (const control of controls) {
      expect(control).toHaveAccessibleName();
      expect(control).toHaveClass(
        'h-11',
        'w-11',
        'focus-visible:ring-2',
        'focus-visible:ring-ring',
      );
      expect(control.querySelector('[aria-hidden="true"]')).toHaveClass(
        'border-2',
        'border-muted-foreground',
      );
    }
  });
});
