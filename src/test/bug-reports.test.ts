import { beforeEach, describe, expect, it, vi } from 'vitest';

const callProtectedFunction = vi.hoisted(() => vi.fn());
const uploadBytes = vi.hoisted(() => vi.fn(async () => undefined));
const storageRef = vi.hoisted(() => vi.fn((_storage, path: string) => ({ path })));
const sanitizeBugReportScreenshot = vi.hoisted(() => vi.fn(async (file: File) => new Blob([file], { type: 'image/jpeg' })));

vi.mock('@/lib/protected-callable', () => ({ callProtectedFunction }));
vi.mock('@/lib/firebase', () => ({ storage: {} }));
vi.mock('@/lib/bug-report-screenshot', () => ({ sanitizeBugReportScreenshot }));
vi.mock('firebase/storage', () => ({ ref: storageRef, uploadBytes }));
vi.mock('@capacitor/core', () => ({ Capacitor: { getPlatform: () => 'ios' } }));

import { submitBugReport } from '@/lib/bug-reports';

describe('submitBugReport', () => {
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
});
