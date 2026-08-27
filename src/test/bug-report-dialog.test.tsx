import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { LanguageProvider } from '@/contexts/LanguageContext';
import type { StoredBugReportCameraRecovery } from '@/lib/bug-report-attachment-db';

const submitBugReport = vi.hoisted(() => vi.fn());
const pickSingleNativeImage = vi.hoisted(() => vi.fn(async () => ({ status: 'unsupported' as const })));
const cameraRecovery = vi.hoisted(() => ({
  prepare: vi.fn(async () => true),
  clear: vi.fn(async () => true),
  read: vi.fn<() => Promise<StoredBugReportCameraRecovery>>(async () => ({ status: 'none' })),
  consume: vi.fn<() => Promise<StoredBugReportCameraRecovery>>(async () => ({ status: 'none' })),
}));
vi.mock('@/lib/bug-reports', () => ({ submitBugReport }));
vi.mock('@/lib/native-image-picker', () => ({ pickSingleNativeImage }));
vi.mock('@/lib/bug-report-camera-restore', () => ({
  prepareBugReportCameraRecovery: cameraRecovery.prepare,
  clearPendingBugReportCameraRecovery: cameraRecovery.clear,
  readRecoveredBugReportAttachment: cameraRecovery.read,
  consumeRecoveredBugReportAttachment: cameraRecovery.consume,
}));

import { BugReportDialog } from '@/components/BugReportDialog';

const renderDialog = (onOpenChange = vi.fn()) => {
  localStorage.setItem('app-language', 'pl');
  return render(
    <LanguageProvider><BugReportDialog open uid="user-1" onOpenChange={onOpenChange} /></LanguageProvider>,
  );
};

describe('BugReportDialog', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    submitBugReport.mockResolvedValue({ ok: true });
    cameraRecovery.read.mockResolvedValue({ status: 'none' });
  });

  it('nie ucina obramowania fokusu kategorii i zostawia akcje poza przewijanym korpusem', () => {
    renderDialog();

    const category = screen.getByRole('combobox', { name: 'Obszar problemu' });
    expect(category).toHaveClass('focus:ring-inset', 'focus:ring-offset-0');

    const scrollRegion = screen.getByTestId('bug-report-scroll-region');
    expect(scrollRegion).toHaveClass('px-1');
    expect(scrollRegion).not.toContainElement(screen.getByRole('button', { name: 'Wyślij zgłoszenie' }));
  });

  it('po błędzie zachowuje tekst, kategorię i daje wyjście przez retry lub email', async () => {
    submitBugReport.mockRejectedValueOnce(new Error('offline'));
    renderDialog();
    fireEvent.change(screen.getByLabelText('Co się stało?'), { target: { value: 'Po powrocie z tła przycisk zapisu nie reaguje.' } });
    fireEvent.click(screen.getByRole('button', { name: 'Wyślij zgłoszenie' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Nie udało się wysłać');
    expect(screen.getByLabelText('Co się stało?')).toHaveValue('Po powrocie z tła przycisk zapisu nie reaguje.');
    expect(screen.getByRole('button', { name: 'Spróbuj ponownie' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Napisz e-mail' })).toHaveAttribute('href', expect.stringContaining('mailto:contact@strengthsave.app'));
  });

  it('przywraca niewysłany tekst po ponownym otwarciu', () => {
    const first = renderDialog();
    fireEvent.change(screen.getByLabelText('Co się stało?'), { target: { value: 'Klawiatura zasłania przycisk dodawania ćwiczenia.' } });
    first.unmount();

    renderDialog();
    expect(screen.getByLabelText('Co się stało?')).toHaveValue('Klawiatura zasłania przycisk dodawania ćwiczenia.');
  });

  it('sukces czyści draft i zamyka dialog, a stary kontakt email pozostaje fallbackiem', async () => {
    const onOpenChange = vi.fn();
    const view = renderDialog(onOpenChange);
    fireEvent.change(screen.getByLabelText('Co się stało?'), { target: { value: 'Przycisk kończenia treningu nie odpowiada po wznowieniu.' } });
    fireEvent.click(screen.getByRole('button', { name: 'Wyślij zgłoszenie' }));
    await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false));
    view.unmount();

    renderDialog();
    expect(screen.getByLabelText('Co się stało?')).toHaveValue('');
  });

  it('na webie otwiera kontrolowany input, a wybrany screenshot można usunąć', async () => {
    renderDialog();
    fireEvent.click(screen.getByRole('button', { name: 'Dodaj zrzut ekranu' }));
    await waitFor(() => expect(pickSingleNativeImage).toHaveBeenCalled());
    const input = screen.getByTestId('bug-report-file-input');
    const file = new File(['image'], 'screen.png', { type: 'image/png' });
    fireEvent.change(input, { target: { files: [file] } });
    expect(screen.getByText('screen.png')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Usuń zrzut' }));
    expect(screen.queryByText('screen.png')).not.toBeInTheDocument();
  });

  it('po Android process death przywraca screenshot z IndexedDB i usuwa go dopiero po sukcesie', async () => {
    const recovered = new File(['restored'], 'bug-report-screenshot.jpg', { type: 'image/jpeg' });
    cameraRecovery.read.mockResolvedValueOnce({ status: 'ready', file: recovered });
    const onOpenChange = vi.fn();
    renderDialog(onOpenChange);

    expect(await screen.findByText('bug-report-screenshot.jpg')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Co się stało?'), { target: { value: 'Android zamknął aplikację podczas wybierania zrzutu.' } });
    fireEvent.click(screen.getByRole('button', { name: 'Wyślij zgłoszenie' }));

    await waitFor(() => expect(submitBugReport).toHaveBeenCalledWith('user-1', expect.objectContaining({ attachment: recovered })));
    await waitFor(() => expect(cameraRecovery.consume).toHaveBeenCalled());
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});
