import { act, render, screen, waitFor } from '@testing-library/react';
import { useState } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AndroidBackHandler } from '@/components/AndroidBackHandler';
import { useExclusiveOverlay } from '@/hooks/useExclusiveOverlay';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { Sheet, SheetContent, SheetDescription, SheetTitle } from '@/components/ui/sheet';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { LanguageProvider } from '@/contexts/LanguageContext';

const native = vi.hoisted(() => ({
  platform: 'android',
  addListener: vi.fn(),
  remove: vi.fn(),
  exitApp: vi.fn(),
  backHandler: null as null | ((event: { canGoBack: boolean }) => void),
}));

vi.mock('@capacitor/core', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@capacitor/core')>();
  return {
    ...actual,
    Capacitor: {
      ...actual.Capacitor,
      isNativePlatform: () => native.platform !== 'web',
      getPlatform: () => native.platform,
    },
  };
});

vi.mock('@capacitor/app', () => ({
  App: {
    addListener: native.addListener,
    exitApp: native.exitApp,
  },
}));

const Overlay = ({ name }: { name: string }) => {
  const [open, setOpen] = useState(true);
  useExclusiveOverlay(open, () => setOpen(false), { announce: false });
  return open ? <div data-testid={name} data-app-overlay data-state="open" /> : null;
};

const PrimitiveOverlay = ({ kind }: { kind: 'dialog' | 'sheet' }) => {
  const [open, setOpen] = useState(true);
  if (kind === 'dialog') {
    return (
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent><DialogTitle>Dialog</DialogTitle><DialogDescription>Test</DialogDescription></DialogContent>
      </Dialog>
    );
  }
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetContent><SheetTitle>Sheet</SheetTitle><SheetDescription>Test</SheetDescription></SheetContent>
    </Sheet>
  );
};

const StackedDialogs = () => {
  const [dialogOpen, setDialogOpen] = useState(true);
  const [alertOpen, setAlertOpen] = useState(true);
  return (
    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
      <DialogContent>
        <DialogTitle>Dialog</DialogTitle>
        <DialogDescription>Test</DialogDescription>
        <AlertDialog open={alertOpen} onOpenChange={setAlertOpen}>
          <AlertDialogContent>
            <AlertDialogTitle>Alert</AlertDialogTitle>
            <AlertDialogDescription>Test</AlertDialogDescription>
          </AlertDialogContent>
        </AlertDialog>
      </DialogContent>
    </Dialog>
  );
};

const renderWithLanguage = (node: React.ReactNode) => render(
  <LanguageProvider>{node}</LanguageProvider>,
);

describe('AndroidBackHandler', () => {
  beforeEach(() => {
    native.platform = 'android';
    native.backHandler = null;
    native.remove.mockReset();
    native.exitApp.mockReset();
    native.addListener.mockReset();
    native.addListener.mockImplementation(async (event: string, handler: (event: { canGoBack: boolean }) => void) => {
      if (event === 'backButton') native.backHandler = handler;
      return { remove: native.remove };
    });
    vi.spyOn(window.history, 'back').mockImplementation(() => undefined);
  });

  it('pierwszy Back zamyka tylko najwyższą warstwę, a dopiero kolejny wraca w historii', async () => {
    render(
      <>
        <AndroidBackHandler />
        <Overlay name="parent-overlay" />
        <Overlay name="top-overlay" />
      </>,
    );
    await waitFor(() => expect(native.backHandler).not.toBeNull());

    act(() => native.backHandler?.({ canGoBack: true }));
    expect(screen.queryByTestId('top-overlay')).not.toBeInTheDocument();
    expect(screen.getByTestId('parent-overlay')).toBeInTheDocument();
    expect(window.history.back).not.toHaveBeenCalled();

    act(() => native.backHandler?.({ canGoBack: true }));
    expect(screen.queryByTestId('parent-overlay')).not.toBeInTheDocument();
    expect(window.history.back).not.toHaveBeenCalled();

    act(() => native.backHandler?.({ canGoBack: true }));
    expect(window.history.back).toHaveBeenCalledTimes(1);
  });

  it('bez historii zamyka aplikację dopiero wtedy, gdy nie ma aktywnej warstwy', async () => {
    render(<AndroidBackHandler />);
    await waitFor(() => expect(native.backHandler).not.toBeNull());

    act(() => native.backHandler?.({ canGoBack: false }));
    expect(native.exitApp).toHaveBeenCalledTimes(1);
  });

  it.each(['dialog', 'sheet'] as const)('zamyka %s bez opuszczenia bieżącej trasy', async (kind) => {
    renderWithLanguage(
      <>
        <AndroidBackHandler />
        <PrimitiveOverlay kind={kind} />
      </>,
    );
    await waitFor(() => expect(native.backHandler).not.toBeNull());

    act(() => native.backHandler?.({ canGoBack: true }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(window.history.back).not.toHaveBeenCalled();
  });

  it('AlertDialog nad Dialogiem zamyka warstwami, bez jednoczesnego odmontowania rodzica', async () => {
    renderWithLanguage(
      <>
        <AndroidBackHandler />
        <StackedDialogs />
      </>,
    );
    await waitFor(() => expect(native.backHandler).not.toBeNull());

    act(() => native.backHandler?.({ canGoBack: true }));
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(window.history.back).not.toHaveBeenCalled();

    act(() => native.backHandler?.({ canGoBack: true }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(window.history.back).not.toHaveBeenCalled();
  });

  it('lokalny ekran może przejąć Back, gdy żadna warstwa nie jest otwarta', async () => {
    const localBack = vi.fn((event: Event) => event.preventDefault());
    window.addEventListener('strength-save:android-back', localBack);
    render(<AndroidBackHandler />);
    await waitFor(() => expect(native.backHandler).not.toBeNull());

    act(() => native.backHandler?.({ canGoBack: true }));
    expect(localBack).toHaveBeenCalledTimes(1);
    expect(window.history.back).not.toHaveBeenCalled();

    window.removeEventListener('strength-save:android-back', localBack);
  });

  it('nie rejestruje natywnego listenera na iOS ani webie', async () => {
    native.platform = 'ios';
    const ios = render(<AndroidBackHandler />);
    await act(async () => { await Promise.resolve(); });
    expect(native.addListener).not.toHaveBeenCalled();
    ios.unmount();

    native.platform = 'web';
    render(<AndroidBackHandler />);
    await act(async () => { await Promise.resolve(); });
    expect(native.addListener).not.toHaveBeenCalled();
  });
});
