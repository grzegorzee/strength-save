// F-T3: dialog wysyłki maila — sukces zapamiętuje adres, błąd ma wyjście.
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { EmailWorkoutDialog } from '@/components/EmailWorkoutDialog';
import { emailErrorKey } from '@/lib/email-workout';

vi.mock('@/contexts/LanguageContext', () => ({
  useTranslation: () => ({ t: (k: string, p?: Record<string, unknown>) => (p ? `${k}:${JSON.stringify(p)}` : k), lang: 'pl' }),
}));
vi.mock('@/lib/firebase', () => ({ db: {} }));
const updateDocMock = vi.hoisted(() => vi.fn(async () => undefined));
vi.mock('firebase/firestore', () => ({ doc: vi.fn(), updateDoc: updateDocMock }));
const toastMock = vi.hoisted(() => vi.fn());
vi.mock('@/hooks/use-toast', () => ({ toast: toastMock }));
const sendWorkoutMock = vi.hoisted(() => vi.fn(async () => undefined));
const sendHistoryMock = vi.hoisted(() => vi.fn(async () => undefined));
vi.mock('@/lib/email-workout', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/email-workout')>()),
  sendWorkoutEmail: sendWorkoutMock,
  sendHistoryEmail: sendHistoryMock,
}));

beforeEach(() => {
  sendWorkoutMock.mockReset().mockResolvedValue(undefined);
  sendHistoryMock.mockReset().mockResolvedValue(undefined);
  updateDocMock.mockClear();
  toastMock.mockClear();
});

const renderDialog = (over: Partial<Parameters<typeof EmailWorkoutDialog>[0]> = {}) => render(
  <EmailWorkoutDialog
    open
    onOpenChange={() => {}}
    mode="workout"
    uid="u1"
    workoutId="w1"
    initialEmail="trener@example.com"
    {...over}
  />,
);

describe('EmailWorkoutDialog (F-T3)', () => {
  it('sukces: wysyła, zapamiętuje adres w preferences.trainerEmail i pokazuje toast', async () => {
    const onOpenChange = vi.fn();
    renderDialog({ onOpenChange });
    fireEvent.click(screen.getByTestId('email-workout-send'));
    await waitFor(() => expect(sendWorkoutMock).toHaveBeenCalledWith('w1', 'trener@example.com', 'pl'));
    await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false));
    expect(updateDocMock).toHaveBeenCalledWith(undefined, { 'preferences.trainerEmail': 'trener@example.com' });
    expect(toastMock).toHaveBeenCalled();
  });

  it('tryb history woła sendHistoryEmail', async () => {
    renderDialog({ mode: 'history', workoutId: undefined });
    fireEvent.click(screen.getByTestId('email-workout-send'));
    await waitFor(() => expect(sendHistoryMock).toHaveBeenCalledWith('trener@example.com', 'pl'));
  });

  it('błąd: komunikat widoczny, dialog zostaje otwarty (wyjście = popraw/zamknij)', async () => {
    sendWorkoutMock.mockRejectedValue(Object.assign(new Error('x'), { code: 'functions/resource-exhausted' }));
    const onOpenChange = vi.fn();
    renderDialog({ onOpenChange });
    fireEvent.click(screen.getByTestId('email-workout-send'));
    await waitFor(() => expect(screen.getByTestId('email-workout-error').textContent).toBe('email.errQuota'));
    expect(onOpenChange).not.toHaveBeenCalledWith(false);
  });

  it('pusty adres = przycisk zablokowany', () => {
    renderDialog({ initialEmail: '' });
    expect((screen.getByTestId('email-workout-send') as HTMLButtonElement).disabled).toBe(true);
  });
});

describe('emailErrorKey', () => {
  it('mapuje kody callable na komunikaty', () => {
    expect(emailErrorKey({ code: 'functions/resource-exhausted' })).toBe('email.errQuota');
    expect(emailErrorKey({ code: 'functions/invalid-argument' })).toBe('email.errInvalid');
    expect(emailErrorKey({ code: 'functions/failed-precondition' })).toBe('email.errEmptyHistory');
    expect(emailErrorKey(new Error('x'))).toBe('email.errGeneric');
  });
});
