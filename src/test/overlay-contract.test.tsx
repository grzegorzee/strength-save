import { useState } from 'react';
import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { LanguageProvider } from '@/contexts/LanguageContext';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { Sheet, SheetContent, SheetDescription, SheetTitle } from '@/components/ui/sheet';

const Harness = () => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  return (
    <LanguageProvider>
      <button onClick={() => setDialogOpen(true)}>dialog</button>
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent data-testid="contract-dialog">
          <DialogTitle>Dialog</DialogTitle>
          <DialogDescription>Warstwa pierwsza</DialogDescription>
          <button onClick={() => setSheetOpen(true)}>sheet</button>
        </DialogContent>
      </Dialog>
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent data-testid="contract-sheet">
          <SheetTitle>Sheet</SheetTitle>
          <SheetDescription>Warstwa druga</SheetDescription>
        </SheetContent>
      </Sheet>
    </LanguageProvider>
  );
};

describe('kontrakt blokujących overlayów', () => {
  it('otwarcie drugiego zamyka pierwszy i w DOM zostaje jedna pełnoekranowa warstwa', async () => {
    render(<Harness />);
    fireEvent.click(screen.getByRole('button', { name: 'dialog' }));
    expect(document.querySelectorAll('[data-app-overlay]')).toHaveLength(1);
    expect(screen.getByTestId('contract-dialog')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'sheet' }));
    await waitFor(() => expect(screen.queryByTestId('contract-dialog')).toBeNull());
    expect(document.querySelectorAll('[data-app-overlay]')).toHaveLength(1);
    expect(screen.getByTestId('contract-sheet')).toBeTruthy();
    expect(screen.getByRole('button', { name: /Zamknij|Close dialog/ })).toBeTruthy();
  });

  it('unmount otwartego overlayu sprząta body scroll-lock', async () => {
    const { unmount } = render(<Harness />);
    fireEvent.click(screen.getByRole('button', { name: 'dialog' }));
    document.body.style.pointerEvents = 'none';
    document.body.style.overflow = 'hidden';
    document.body.setAttribute('data-scroll-locked', '1');

    unmount();

    await waitFor(() => expect(document.body.style.pointerEvents).toBe(''));
    expect(document.body.style.overflow).toBe('');
    expect(document.body.hasAttribute('data-scroll-locked')).toBe(false);
  });
});
