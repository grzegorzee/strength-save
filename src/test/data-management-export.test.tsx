// Bug 24 (X30): eksport backupu (WP-L X29) mial goly `return` dla 'failed' —
// share sheet pada na native i user nie widzi NIC (naruszenie zasady 6:
// stan bledu bez komunikatu), a client_errors tez milczaly (brak onShareError).
// 'aborted' (zamkniety sheet) ma milczec celowo — wzorzec Z198.
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { LanguageProvider } from '@/contexts/LanguageContext';
import type { ShareExportResult } from '@/lib/share-export';

const toastMock = vi.hoisted(() => vi.fn());
const shareMock = vi.hoisted(() =>
  vi.fn<(file: File, options?: { onShareError?: (err: unknown) => void }) => Promise<ShareExportResult>>());
const reportErrorMock = vi.hoisted(() => vi.fn());

vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: toastMock }) }));
vi.mock('@/lib/share-export', () => ({ shareOrDownloadFile: shareMock }));
vi.mock('@/lib/global-error-telemetry', () => ({ reportClientErrorWithCurrentUid: reportErrorMock }));

import { DataManagement } from '@/components/DataManagement';

const renderCard = () =>
  render(
    <LanguageProvider>
      <DataManagement
        onExport={() => '{"workouts":[]}'}
        onImport={async () => ({ success: true, message: 'ok' })}
      />
    </LanguageProvider>,
  );

const clickExport = () => {
  fireEvent.click(screen.getByText('Eksportuj JSON'));
};

beforeEach(() => {
  localStorage.clear();
  localStorage.setItem('app-language', 'pl');
  toastMock.mockReset();
  reportErrorMock.mockReset();
  shareMock.mockReset();
});

describe('DataManagement — eksport backupu bramkuje feedback wynikiem share', () => {
  it('failed: destructive toast zamiast ciszy', async () => {
    shareMock.mockResolvedValue('failed');
    renderCard();
    clickExport();
    await waitFor(() => expect(toastMock).toHaveBeenCalledTimes(1));
    expect(toastMock.mock.calls[0][0]).toMatchObject({ variant: 'destructive' });
  });

  it('failed: awaria share sheeta laduje w client_errors (onShareError)', async () => {
    shareMock.mockImplementation(async (_file, options) => {
      options?.onShareError?.(new Error('share broke'));
      return 'failed';
    });
    renderCard();
    clickExport();
    await waitFor(() => expect(reportErrorMock).toHaveBeenCalledTimes(1));
    expect(reportErrorMock.mock.calls[0][0]).toMatchObject({ code: 'data-export-share' });
  });

  it('aborted (zamkniety sheet): cisza — zero toastow (Z198)', async () => {
    shareMock.mockResolvedValue('aborted');
    renderCard();
    clickExport();
    await waitFor(() => expect(shareMock).toHaveBeenCalledTimes(1));
    expect(toastMock).not.toHaveBeenCalled();
  });

  it('niezmiennik: sukces (downloaded) nadal daje toast sukcesu', async () => {
    shareMock.mockResolvedValue('downloaded');
    renderCard();
    clickExport();
    await waitFor(() => expect(toastMock).toHaveBeenCalledTimes(1));
    expect(toastMock.mock.calls[0][0]).not.toMatchObject({ variant: 'destructive' });
  });
});
