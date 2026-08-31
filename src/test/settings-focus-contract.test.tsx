import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { SettingRow } from '@/components/kinetic/SettingRow';
import { ProfileAccordionSection } from '@/components/profile/ProfileAccordionSection';

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

  it('nie ucina statycznej etykiety w zwartym wierszu ustawień', () => {
    render(<SettingRow compact label="Urządzenia i połączenia" value="Połączono" />);

    const label = screen.getByText('Urządzenia i połączenia');
    expect(label).not.toHaveClass('truncate');
    expect(label).toHaveClass('break-words');
  });

  it('nie ucina podsumowania zwiniętej sekcji Profilu', () => {
    render(
      <ProfileAccordionSection
        id="subscription"
        label="Subskrypcja"
        value="Brak aktywnej subskrypcji"
        open={false}
        onOpenChange={() => undefined}
      >
        <div />
      </ProfileAccordionSection>,
    );

    const value = screen.getByText('Brak aktywnej subskrypcji');
    expect(value).not.toHaveClass('truncate');
    expect(value).toHaveClass('break-words');
  });
});
