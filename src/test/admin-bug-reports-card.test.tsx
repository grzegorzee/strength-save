import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, waitFor } from '@testing-library/react';

const getDocsMock = vi.fn();
const collectionMock = vi.fn();
const queryMock = vi.fn();
const orderByMock = vi.fn();
const limitMock = vi.fn();
const callProtectedFunctionMock = vi.fn();

vi.mock('@/lib/firebase', () => ({ db: {} }));
vi.mock('firebase/firestore', () => ({
  collection: (...args: unknown[]) => collectionMock(...args),
  query: (...args: unknown[]) => queryMock(...args),
  orderBy: (...args: unknown[]) => orderByMock(...args),
  limit: (...args: unknown[]) => limitMock(...args),
  getDocs: (...args: unknown[]) => getDocsMock(...args),
}));
vi.mock('@/lib/protected-callable', () => ({
  callProtectedFunction: (...args: unknown[]) => callProtectedFunctionMock(...args),
}));

import { LanguageProvider } from '@/contexts/LanguageContext';
import { AdminBugReportsCard } from '@/pages/admin/AdminBugReportsCard';

const docSnap = (id: string, data: Record<string, unknown>) => ({ id, data: () => data });
const snapshot = (docs: ReturnType<typeof docSnap>[]) => ({ docs });

const baseReport = {
  reporterEmail: 'user@example.com',
  message: 'Timer nie wrócił po wygaszeniu ekranu',
  category: 'workout',
  status: 'new',
  context: { platform: 'ios', appVersion: '1.0.0' },
  screenshot: { path: 'bug-reports/user/report/screenshot.jpg' },
  createdAt: { toMillis: () => Date.UTC(2026, 7, 27, 10, 0) },
};

const renderCard = () => render(
  <LanguageProvider>
    <AdminBugReportsCard />
  </LanguageProvider>,
);

beforeEach(() => {
  localStorage.clear();
  localStorage.setItem('app-language', 'pl');
  getDocsMock.mockReset();
  collectionMock.mockReset();
  queryMock.mockReset();
  orderByMock.mockReset();
  limitMock.mockReset();
  callProtectedFunctionMock.mockReset();
  collectionMock.mockReturnValue('bug-reports-ref');
  orderByMock.mockReturnValue('created-desc');
  limitMock.mockReturnValue('limit-100');
  queryMock.mockReturnValue('reports-query');
});

describe('AdminBugReportsCard', () => {
  it('czyta ostatnie 100 zgłoszeń w kolejności od najnowszych i pokazuje pusty stan', async () => {
    getDocsMock.mockResolvedValue(snapshot([]));
    const view = renderCard();

    expect(view.getByText('Ładowanie zgłoszeń…')).toBeTruthy();
    expect(await view.findByText('Brak zgłoszeń błędów')).toBeTruthy();
    expect(collectionMock).toHaveBeenCalledWith({}, 'bug_reports');
    expect(orderByMock).toHaveBeenCalledWith('createdAt', 'desc');
    expect(limitMock).toHaveBeenCalledWith(100);
    expect(queryMock).toHaveBeenCalledWith('bug-reports-ref', 'created-desc', 'limit-100');
  });

  it('błąd odczytu ma wyjście: retry ładuje listę ponownie', async () => {
    getDocsMock.mockRejectedValueOnce(new Error('permission-denied'));
    getDocsMock.mockResolvedValueOnce(snapshot([]));
    const view = renderCard();

    expect(await view.findByText('Nie udało się wczytać zgłoszeń')).toBeTruthy();
    fireEvent.click(view.getByRole('button', { name: 'Spróbuj ponownie' }));
    expect(await view.findByText('Brak zgłoszeń błędów')).toBeTruthy();
    expect(getDocsMock).toHaveBeenCalledTimes(2);
  });

  it('wiersz pokazuje opis, email, platformę, wersję i status', async () => {
    getDocsMock.mockResolvedValue(snapshot([docSnap('report-1', baseReport)]));
    const view = renderCard();

    expect(await view.findByText(baseReport.message)).toBeTruthy();
    expect(view.getByText('user@example.com')).toBeTruthy();
    expect(view.getByText('ios · 1.0.0')).toBeTruthy();
    expect(view.getByRole('combobox', { name: 'Status zgłoszenia user@example.com' })).toHaveValue('new');
  });

  it('filtry statusu i kategorii zawężają listę i mają wyjście przez Wszystkie', async () => {
    getDocsMock.mockResolvedValue(snapshot([
      docSnap('report-1', baseReport),
      docSnap('report-2', {
        ...baseReport,
        reporterEmail: 'web@example.com',
        message: 'Nie działa eksport',
        category: 'ui',
        status: 'resolved',
        context: { platform: 'web', appVersion: '1.0.0' },
      }),
    ]));
    const view = renderCard();
    await view.findByText(baseReport.message);

    fireEvent.change(view.getByRole('combobox', { name: 'Filtr statusu' }), { target: { value: 'resolved' } });
    expect(view.queryByText(baseReport.message)).toBeNull();
    expect(view.getByText('Nie działa eksport')).toBeTruthy();

    fireEvent.change(view.getByRole('combobox', { name: 'Filtr kategorii' }), { target: { value: 'workout' } });
    expect(view.getByText('Brak wyników dla filtrów')).toBeTruthy();

    fireEvent.change(view.getByRole('combobox', { name: 'Filtr statusu' }), { target: { value: 'all' } });
    expect(view.getByText(baseReport.message)).toBeTruthy();
  });

  it('zmienia status wyłącznie przez chronione callable', async () => {
    getDocsMock.mockResolvedValue(snapshot([docSnap('report-1', baseReport)]));
    callProtectedFunctionMock.mockResolvedValue({ ok: true });
    const view = renderCard();
    const status = await view.findByRole('combobox', { name: 'Status zgłoszenia user@example.com' });

    fireEvent.change(status, { target: { value: 'triaged' } });

    await waitFor(() => expect(callProtectedFunctionMock).toHaveBeenCalledWith(
      'adminUpdateBugReport',
      { reportId: 'report-1', status: 'triaged' },
    ));
    expect(status).toHaveValue('triaged');
  });

  it('błąd zmiany statusu przywraca poprzedni status i daje retry', async () => {
    getDocsMock.mockResolvedValue(snapshot([docSnap('report-1', baseReport)]));
    callProtectedFunctionMock.mockRejectedValueOnce(new Error('unavailable'));
    callProtectedFunctionMock.mockResolvedValueOnce({ ok: true });
    const view = renderCard();
    const status = await view.findByRole('combobox', { name: 'Status zgłoszenia user@example.com' });

    fireEvent.change(status, { target: { value: 'triaged' } });
    expect(await view.findByText('Nie udało się zmienić statusu')).toBeTruthy();
    expect(status).toHaveValue('new');

    fireEvent.click(view.getByRole('button', { name: 'Ponów zmianę statusu' }));
    await waitFor(() => expect(callProtectedFunctionMock).toHaveBeenCalledTimes(2));
    expect(status).toHaveValue('triaged');
  });

  it('pobiera prywatny URL screenshotu przez callable i otwiera go z noopener', async () => {
    getDocsMock.mockResolvedValue(snapshot([docSnap('report-1', baseReport)]));
    callProtectedFunctionMock.mockResolvedValue({ url: 'https://storage.example/signed' });
    const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null);
    const view = renderCard();

    fireEvent.click(await view.findByRole('button', { name: 'Otwórz zrzut ekranu' }));

    await waitFor(() => expect(callProtectedFunctionMock).toHaveBeenCalledWith(
      'adminGetBugReportScreenshotUrl',
      { reportId: 'report-1' },
    ));
    expect(openSpy).toHaveBeenCalledWith('https://storage.example/signed', '_blank', 'noopener,noreferrer');
    openSpy.mockRestore();
  });

  it('błąd pobrania screenshotu pokazuje retry', async () => {
    getDocsMock.mockResolvedValue(snapshot([docSnap('report-1', baseReport)]));
    callProtectedFunctionMock.mockRejectedValueOnce(new Error('unavailable'));
    callProtectedFunctionMock.mockResolvedValueOnce({ url: 'https://storage.example/retry' });
    const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null);
    const view = renderCard();

    fireEvent.click(await view.findByRole('button', { name: 'Otwórz zrzut ekranu' }));
    expect(await view.findByText('Nie udało się otworzyć zrzutu')).toBeTruthy();
    fireEvent.click(view.getByRole('button', { name: 'Ponów otwarcie zrzutu' }));

    await waitFor(() => expect(openSpy).toHaveBeenCalledWith(
      'https://storage.example/retry',
      '_blank',
      'noopener,noreferrer',
    ));
    openSpy.mockRestore();
  });
});
