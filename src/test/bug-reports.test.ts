import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const callProtectedFunction = vi.hoisted(() => vi.fn());
const uploadBytes = vi.hoisted(() => vi.fn<(...args: unknown[]) => Promise<unknown>>(async () => undefined));
const cancelUpload = vi.hoisted(() => vi.fn());
const storageRef = vi.hoisted(() => vi.fn((_storage, path: string) => ({ path })));
const sanitizeBugReportScreenshot = vi.hoisted(() => vi.fn(async (file: File) => new Blob([file], { type: 'image/jpeg' })));

vi.mock('@/lib/protected-callable', () => ({ callProtectedFunction }));
vi.mock('@/lib/firebase', () => ({ storage: {} }));
vi.mock('@/lib/bug-report-screenshot', () => ({ sanitizeBugReportScreenshot }));
vi.mock('firebase/storage', () => ({
  ref: storageRef,
  uploadBytesResumable: (...args: unknown[]) => Object.assign(uploadBytes(...args), { cancel: cancelUpload }),
}));
vi.mock('@capacitor/core', () => ({ Capacitor: { getPlatform: () => 'ios' } }));

import { submitBugReport } from '@/lib/bug-reports';

describe('submitBugReport', () => {
  afterEach(() => vi.useRealTimers());
  beforeEach(() => {
    vi.clearAllMocks();
    callProtectedFunction.mockImplementation(async (name: string) => (
      name === 'createBugReport'
        ? { ok: true, reportId: 'server-report', uploadPath: 'bug-reports/user-1/server-report/screenshot.jpg' }
        : { ok: true }
    ));
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 390 });
    Object.defineProperty(window, 'innerHeight', { configurable: true, value: 844 });
    window.location.hash = '#/profile';
  });

  it('wysyła opis i bezpieczny kontekst bez screenshotu', async () => {
    await submitBugReport('user-1', {
      reportId: '123e4567-e89b-42d3-a456-426614174000',
      message: 'Przycisk zapisu nie reaguje po powrocie.',
    });

    expect(uploadBytes).not.toHaveBeenCalled();
    expect(callProtectedFunction).toHaveBeenNthCalledWith(1, 'createBugReport', expect.objectContaining({
      clientRequestId: '123e4567-e89b-42d3-a456-426614174000',
      message: 'Przycisk zapisu nie reaguje po powrocie.',
      context: expect.objectContaining({ platform: 'ios', viewport: '390x844' }),
    }));
    expect(callProtectedFunction).toHaveBeenNthCalledWith(2, 'finalizeBugReport', {
      clientRequestId: '123e4567-e89b-42d3-a456-426614174000',
      useScreenshot: false,
    });
  });

  it('kompresuje i wgrywa screenshot pod idempotentną ścieżką przed callable', async () => {
    const file = new File(['png'], 'screen.png', { type: 'image/png' });
    const reportId = '123e4567-e89b-42d3-a456-426614174001';

    await submitBugReport('user-1', { reportId, message: 'Opis wystarczająco długi.', attachment: file });

    const path = 'bug-reports/user-1/server-report/screenshot.jpg';
    expect(sanitizeBugReportScreenshot).toHaveBeenCalledWith(file);
    expect(storageRef).toHaveBeenCalledWith({}, path);
    expect(uploadBytes).toHaveBeenCalledWith({ path }, expect.any(Blob), expect.objectContaining({ contentType: 'image/jpeg' }));
    expect(callProtectedFunction).toHaveBeenLastCalledWith('finalizeBugReport', {
      clientRequestId: reportId,
      useScreenshot: true,
    });
  });

  it('retry z tym samym reportId nadpisuje tę samą ścieżkę zamiast tworzyć duplikat', async () => {
    const file = new File(['png'], 'screen.png', { type: 'image/png' });
    const input = {
      reportId: '123e4567-e89b-42d3-a456-426614174002',
      message: 'Opis wystarczająco długi.',
      attachment: file,
    };
    callProtectedFunction
      .mockRejectedValueOnce(new Error('offline'))
      .mockImplementation(async (name: string) => (
        name === 'createBugReport'
          ? { ok: true, reportId: 'server-report', uploadPath: 'bug-reports/user-1/server-report/screenshot.jpg' }
          : { ok: true }
      ));

    await expect(submitBugReport('user-1', input)).rejects.toThrow('offline');
    await expect(submitBugReport('user-1', input)).resolves.toEqual({ ok: true });

    expect(storageRef.mock.calls.every((call) => call[1] === 'bug-reports/user-1/server-report/screenshot.jpg')).toBe(true);
  });

  it.each(['sanitize', 'upload'] as const)('%s failure still finalizes the message without an attachment', async (stage) => {
    if (stage === 'sanitize') sanitizeBugReportScreenshot.mockRejectedValueOnce(new Error('SCREENSHOT_SANITIZE_FAILED'));
    else uploadBytes.mockRejectedValueOnce(new Error('storage/retry-limit-exceeded'));
    const reportId = '123e4567-e89b-42d3-a456-426614174003';

    await expect(submitBugReport('user-1', {
      reportId,
      message: 'Klawiatura zasłania obszar problemu w formularzu.',
      attachment: new File(['photo'], 'screen.heic', { type: 'image/heic' }),
    })).resolves.toMatchObject({ ok: true, screenshotOmitted: true });

    expect(callProtectedFunction).toHaveBeenLastCalledWith('finalizeBugReport', {
      clientRequestId: reportId,
      useScreenshot: false,
    });
    if (stage === 'sanitize') expect(uploadBytes).not.toHaveBeenCalled();
  });

  it('retains a failed finalization as an error so the user can retry the same report', async () => {
    sanitizeBugReportScreenshot.mockRejectedValueOnce(new Error('SCREENSHOT_SANITIZE_FAILED'));
    callProtectedFunction.mockImplementation(async (name: string) => {
      if (name === 'createBugReport') return { ok: true, reportId: 'server-report', uploadPath: 'bug-reports/user-1/server-report/screenshot.jpg' };
      throw new Error('offline');
    });
    await expect(submitBugReport('user-1', {
      reportId: '123e4567-e89b-42d3-a456-426614174004',
      message: 'Treść zgłoszenia musi pozostać do ponowienia.',
      attachment: new File(['invalid'], 'screen.jpg', { type: 'image/jpeg' }),
    })).rejects.toThrow('offline');
    expect(callProtectedFunction).toHaveBeenLastCalledWith('finalizeBugReport', expect.anything());
  });

  it.each(['sanitize', 'upload'] as const)('does not wait forever for a stalled %s', async (stage) => {
    vi.useFakeTimers();
    const never = new Promise<never>(() => undefined);
    if (stage === 'sanitize') sanitizeBugReportScreenshot.mockReturnValueOnce(never);
    else uploadBytes.mockReturnValueOnce(never);
    const result = submitBugReport('user-1', {
      reportId: '123e4567-e89b-42d3-a456-426614174005',
      message: 'Zgłoszenie nie może czekać bez końca na obraz.',
      attachment: new File(['image'], 'screen.heic', { type: 'image/heic' }),
    });
    await vi.advanceTimersByTimeAsync(45_000);
    await expect(result).resolves.toMatchObject({ ok: true, screenshotOmitted: true });
    expect(callProtectedFunction).toHaveBeenLastCalledWith('finalizeBugReport', expect.objectContaining({ useScreenshot: false }));
    if (stage === 'upload') expect(cancelUpload).toHaveBeenCalledOnce();
  });

  it('retry after server recovery skips the upload and returns the actual attachment outcome', async () => {
    callProtectedFunction.mockResolvedValueOnce({
      ok: true, reportId: 'server-report', uploadPath: 'bug-reports/user-1/server-report/screenshot.jpg',
      finalized: true, screenshotAttached: false,
    });
    await expect(submitBugReport('user-1', {
      reportId: '123e4567-e89b-42d3-a456-426614174005', message: 'Zgłoszenie już odzyskane przez serwer.',
      attachment: new File(['image'], 'screen.png', { type: 'image/png' }),
    })).resolves.toMatchObject({ ok: true, screenshotOmitted: true });
    expect(uploadBytes).not.toHaveBeenCalled();
    expect(callProtectedFunction).toHaveBeenCalledTimes(1);
  });
});
