// F-T3: dialog wysyłki maila — sukces, błąd ma wyjście.
// WP-I (plan X29): koniec bezwarunkowego zapisu adresu — po wysyłce na NOWY
// adres popup "Zapisać jako trenera?" z opcjonalnym imieniem; znany adres
// leci bez popupu, ale z zapisanym imieniem w payload.
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { EmailWorkoutDialog } from '@/components/EmailWorkoutDialog';
import { emailErrorKey } from '@/lib/email-workout';

vi.mock('@/contexts/LanguageContext', () => ({
  useTranslation: () => ({ t: (k: string, p?: Record<string, unknown>) => (p ? `${k}:${JSON.stringify(p)}` : k), lang: 'pl' }),
}));
vi.mock('@/lib/firebase', () => ({ db: {} }));
const updateDocMock = vi.hoisted(() => vi.fn(async () => undefined));
const DELETE_SENTINEL = vi.hoisted(() => '__DELETE_FIELD__');
vi.mock('firebase/firestore', () => ({
  doc: vi.fn(),
  updateDoc: updateDocMock,
  deleteField: vi.fn(() => DELETE_SENTINEL),
}));
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
  it('sukces: wysyła i pokazuje toast (bez bezwarunkowego zapisu adresu)', async () => {
    const onOpenChange = vi.fn();
    renderDialog({ onOpenChange });
    fireEvent.click(screen.getByTestId('email-workout-send'));
    await waitFor(() => expect(sendWorkoutMock).toHaveBeenCalledWith('w1', 'trener@example.com', 'pl', undefined));
    await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false));
    expect(updateDocMock).not.toHaveBeenCalled();
    expect(toastMock).toHaveBeenCalled();
  });

  it('tryb history woła sendHistoryEmail z domyślnym zakresem week', async () => {
    renderDialog({ mode: 'history', workoutId: undefined });
    fireEvent.click(screen.getByTestId('email-workout-send'));
    await waitFor(() => expect(sendHistoryMock).toHaveBeenCalledWith('trener@example.com', 'pl', 'week', undefined));
  });

  // H-T1: wybór zakresu w trybie history (żadnej opcji "wszystko/200").
  it('tryb history: dwie opcje zakresu, wybór last30 przekazuje range', async () => {
    renderDialog({ mode: 'history', workoutId: undefined });
    expect(screen.getByTestId('email-range-week')).toBeTruthy();
    expect(screen.getByTestId('email-range-last30')).toBeTruthy();
    fireEvent.click(screen.getByTestId('email-range-last30'));
    fireEvent.click(screen.getByTestId('email-workout-send'));
    await waitFor(() => expect(sendHistoryMock).toHaveBeenCalledWith('trener@example.com', 'pl', 'last30', undefined));
  });

  it('tryb workout: bez selektora zakresu', () => {
    renderDialog();
    expect(screen.queryByTestId('email-range-week')).toBeNull();
    expect(screen.queryByTestId('email-range-last30')).toBeNull();
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

// WP-I: popup zapisu trenera po wysyłce.
describe('EmailWorkoutDialog (WP-I: zapis trenera po wysyłce)', () => {
  it('wysyłka na nowy adres otwiera popup; Zapisz z imieniem zapisuje oba pola', async () => {
    renderDialog({ savedTrainerEmail: undefined, savedTrainerName: undefined });
    fireEvent.click(screen.getByTestId('email-workout-send'));
    await waitFor(() => expect(screen.getByTestId('save-trainer-name')).toBeTruthy());
    // Błąd popupu nie może zjeść wysyłki: nic nie zapisano przed decyzją usera.
    expect(updateDocMock).not.toHaveBeenCalled();
    fireEvent.change(screen.getByTestId('save-trainer-name'), { target: { value: '  Marek ' } });
    fireEvent.click(screen.getByText('email.saveTrainer.save'));
    await waitFor(() => expect(updateDocMock).toHaveBeenCalledWith(undefined, {
      'preferences.trainerEmail': 'trener@example.com',
      'preferences.trainerName': 'Marek',
    }));
  });

  it('Zapisz bez imienia: trainerName czyszczony przez deleteField', async () => {
    renderDialog();
    fireEvent.click(screen.getByTestId('email-workout-send'));
    await waitFor(() => expect(screen.getByTestId('save-trainer-name')).toBeTruthy());
    fireEvent.click(screen.getByText('email.saveTrainer.save'));
    await waitFor(() => expect(updateDocMock).toHaveBeenCalledWith(undefined, {
      'preferences.trainerEmail': 'trener@example.com',
      'preferences.trainerName': DELETE_SENTINEL,
    }));
  });

  it('Pomiń: zero zapisu', async () => {
    renderDialog();
    fireEvent.click(screen.getByTestId('email-workout-send'));
    await waitFor(() => expect(screen.getByTestId('save-trainer-name')).toBeTruthy());
    fireEvent.click(screen.getByText('email.saveTrainer.skip'));
    await waitFor(() => expect(screen.queryByTestId('save-trainer-name')).toBeNull());
    expect(updateDocMock).not.toHaveBeenCalled();
  });

  it('znany adres: bez popupu, wysyłka z zapisanym imieniem', async () => {
    renderDialog({ savedTrainerEmail: 'trener@example.com', savedTrainerName: 'Kasia' });
    fireEvent.click(screen.getByTestId('email-workout-send'));
    await waitFor(() => expect(sendWorkoutMock).toHaveBeenCalledWith('w1', 'trener@example.com', 'pl', 'Kasia'));
    expect(screen.queryByTestId('save-trainer-name')).toBeNull();
    expect(updateDocMock).not.toHaveBeenCalled();
  });

  it('inny adres niż zapisany: wysyłka BEZ cudzego imienia + popup', async () => {
    renderDialog({ savedTrainerEmail: 'stary@example.com', savedTrainerName: 'Kasia' });
    fireEvent.click(screen.getByTestId('email-workout-send'));
    await waitFor(() => expect(sendWorkoutMock).toHaveBeenCalledWith('w1', 'trener@example.com', 'pl', undefined));
    await waitFor(() => expect(screen.getByTestId('save-trainer-name')).toBeTruthy());
  });

  it('po zapisie w popupie kolejna wysyłka idzie już z nowym imieniem bez popupu', async () => {
    renderDialog();
    fireEvent.click(screen.getByTestId('email-workout-send'));
    await waitFor(() => expect(screen.getByTestId('save-trainer-name')).toBeTruthy());
    fireEvent.change(screen.getByTestId('save-trainer-name'), { target: { value: 'Marek' } });
    fireEvent.click(screen.getByText('email.saveTrainer.save'));
    await waitFor(() => expect(screen.queryByTestId('save-trainer-name')).toBeNull());
    fireEvent.click(screen.getByTestId('email-workout-send'));
    await waitFor(() => expect(sendWorkoutMock).toHaveBeenLastCalledWith('w1', 'trener@example.com', 'pl', 'Marek'));
    expect(screen.queryByTestId('save-trainer-name')).toBeNull();
  });

  // Bug 49 (X30): porównanie adresu trenera bez rozróżniania wielkości liter —
  // "Trener@X.pl" vs zapisany "trener@x.pl" to TEN SAM trener (mail z powitaniem,
  // bez zbędnego popupu); wysyłka idzie na oryginalnie wpisany string.
  it('zapisany adres w innym zapisie liter: bez popupu, imię w payload, wysyłka na oryginalny string', async () => {
    renderDialog({
      initialEmail: 'Trener@Example.COM',
      savedTrainerEmail: 'trener@example.com',
      savedTrainerName: 'Kasia',
    });
    fireEvent.click(screen.getByTestId('email-workout-send'));
    await waitFor(() => expect(sendWorkoutMock).toHaveBeenCalledWith('w1', 'Trener@Example.COM', 'pl', 'Kasia'));
    expect(screen.queryByTestId('save-trainer-name')).toBeNull();
    expect(updateDocMock).not.toHaveBeenCalled();
  });

  it('Zapisz normalizuje adres trenera (trim + lowercase)', async () => {
    renderDialog({ initialEmail: 'Nowy@Example.com', savedTrainerEmail: undefined });
    fireEvent.click(screen.getByTestId('email-workout-send'));
    await waitFor(() => expect(screen.getByTestId('save-trainer-name')).toBeTruthy());
    fireEvent.click(screen.getByText('email.saveTrainer.save'));
    await waitFor(() => expect(updateDocMock).toHaveBeenCalledWith(undefined, {
      'preferences.trainerEmail': 'nowy@example.com',
      'preferences.trainerName': DELETE_SENTINEL,
    }));
    // Kolejna wysyłka na wariant literowy zapisanego adresu: już bez popupu.
    await waitFor(() => expect(screen.queryByTestId('save-trainer-name')).toBeNull());
    fireEvent.click(screen.getByTestId('email-workout-send'));
    await waitFor(() => expect(sendWorkoutMock).toHaveBeenCalledTimes(2));
    expect(screen.queryByTestId('save-trainer-name')).toBeNull();
  });

  it('tryb history: popup też działa, payload z imieniem po zapisie', async () => {
    renderDialog({ mode: 'history', workoutId: undefined, savedTrainerEmail: 'trener@example.com', savedTrainerName: 'Ania' });
    fireEvent.click(screen.getByTestId('email-workout-send'));
    await waitFor(() => expect(sendHistoryMock).toHaveBeenCalledWith('trener@example.com', 'pl', 'week', 'Ania'));
    expect(screen.queryByTestId('save-trainer-name')).toBeNull();
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
