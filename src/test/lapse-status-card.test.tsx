import { useState } from 'react';
import { describe, expect, it, beforeEach } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { LanguageProvider } from '@/contexts/LanguageContext';
import { LapseStatusCard } from '@/components/LapseStatusCard';
import { LapseTray } from '@/components/LapseTray';
import type { Lapse } from '@/lib/lapse-detection';

const lapse: Lapse = {
  kind: 'stale-session',
  dateISO: '2026-08-07',
  dismissKey: '2026-08-07',
  day: { id: 'day-3', dayName: 'Push', weekday: 'friday', focus: 'Push', exercises: [] },
  weekPlus: false,
};

const Harness = () => {
  const [open, setOpen] = useState(false);
  return (
    <LanguageProvider>
      <LapseStatusCard lapse={lapse} onOpen={() => setOpen(true)} onDismiss={() => {}} />
      <LapseTray
        open={open}
        onOpenChange={setOpen}
        lapse={lapse}
        onSkip={() => {}}
        onMove={() => {}}
        onContinueToday={() => {}}
      />
    </LanguageProvider>
  );
};

beforeEach(() => {
  localStorage.clear();
  localStorage.setItem('app-language', 'pl');
});

describe('zaległość na Dashboardzie', () => {
  it('jest nieblokującą kartą, a tray otwiera dopiero jawny tap', () => {
    render(<Harness />);

    expect(screen.getByTestId('lapse-status-card')).toBeTruthy();
    expect(screen.queryByTestId('lapse-tray')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Zobacz opcje' }));
    expect(screen.getByTestId('lapse-tray')).toBeTruthy();
  });

  // B3 (X70): szablon bez odmiany — "z poniedziałek, 24 sierpnia" łamało
  // fleksję; data w nawiasie, krótka (bez nazwy dnia), dzień w mianowniku.
  it('opis karty i traya: "Trening {day} ({date}) czeka." z krótką datą bez nazwy dnia', () => {
    render(<Harness />);

    expect(
      screen.getByText('Trening Push (7 sierpnia) czeka. Bez presji: wybierz, co z nim zrobić.'),
    ).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Zobacz opcje' }));
    const tray = screen.getByTestId('lapse-tray');
    expect(tray.textContent).toContain('Trening Push (7 sierpnia) czeka.');
  });
});
