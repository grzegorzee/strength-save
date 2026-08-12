import { describe, expect, it, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { NotificationBell } from '@/components/NotificationBell';
import { addInboxItem } from '@/lib/notification-inbox';

vi.mock('@/contexts/LanguageContext', () => ({
  useTranslation: () => ({ t: (k: string) => k, lang: 'pl' }),
}));

describe('NotificationBell', () => {
  beforeEach(() => localStorage.clear());

  it('bez nieprzeczytanych: brak kropki', () => {
    render(<NotificationBell uid="u1" />);
    expect(screen.queryByTestId('inbox-unread-dot')).toBeNull();
  });

  it('nieprzeczytany wpis pokazuje kropkę, otwarcie czyta wszystko', () => {
    addInboxItem('u1', { type: 'pr', title: 'Rekord: Przysiad 100 kg' });
    render(<NotificationBell uid="u1" />);
    expect(screen.getByTestId('inbox-unread-dot')).toBeTruthy();
    fireEvent.click(screen.getByLabelText('inbox.open'));
    expect(screen.getByText('Rekord: Przysiad 100 kg')).toBeTruthy();
    expect(screen.queryByTestId('inbox-unread-dot')).toBeNull();
  });

  it('pusty inbox po otwarciu pokazuje empty state', () => {
    render(<NotificationBell uid="u1" />);
    fireEvent.click(screen.getByLabelText('inbox.open'));
    expect(screen.getByText('inbox.empty.title')).toBeTruthy();
  });
});
