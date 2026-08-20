// T22a: współdzielony wiersz rejestru maili (AdminEmailsCard + AdminUserDetail).
// Ekstrakcja nie może zmienić renderu wiersza — status, typ, adresat, podgląd.
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render } from '@testing-library/react';

vi.mock('@/lib/firebase', () => ({ db: {} }));
vi.mock('firebase/firestore', () => ({
  doc: vi.fn(),
  getDoc: vi.fn(),
}));
import { LanguageProvider } from '@/contexts/LanguageContext';
import { EmailLogRowItem } from '@/pages/admin/EmailLogRow';
import type { EmailLogRow } from '@/lib/admin-email-stats';

const row = (over: Partial<EmailLogRow> = {}): EmailLogRow => ({
  id: 'el1',
  uid: 'user-abc-123',
  to: 'trener@example.com',
  type: 'workout',
  subject: 'Trening 2026-08-20',
  transport: 'ses',
  status: 'sent',
  sentAt: new Date().toISOString(),
  ...over,
});

const renderRow = (data: EmailLogRow, onPreview = vi.fn()) => render(
  <LanguageProvider>
    <EmailLogRowItem row={data} onPreview={onPreview} />
  </LanguageProvider>,
);

beforeEach(() => {
  localStorage.clear();
  localStorage.setItem('app-language', 'pl');
});

describe('EmailLogRowItem (T22a)', () => {
  it('renderuje status, typ, temat i adresata', () => {
    const view = renderRow(row());
    expect(view.getByText('wysłany')).toBeTruthy();
    expect(view.getByText('trening')).toBeTruthy();
    expect(view.getByText('Trening 2026-08-20')).toBeTruthy();
    expect(view.getByText('trener@example.com')).toBeTruthy();
  });

  it('nieznany typ pokazuje surowy string (stare wpisy nic nie tracą)', () => {
    const view = renderRow(row({ type: 'tajemniczy_typ' }));
    expect(view.getByText('tajemniczy_typ')).toBeTruthy();
  });

  it('przycisk Pokaż treść woła onPreview z wierszem', () => {
    const onPreview = vi.fn();
    const data = row();
    const view = renderRow(data, onPreview);
    fireEvent.click(view.getByRole('button', { name: 'Pokaż treść' }));
    expect(onPreview).toHaveBeenCalledWith(data);
  });
});
