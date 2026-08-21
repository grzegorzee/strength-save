// Z192: X dialogów i sheetów musi mieć pole dotyku >= 44 px (HIG minimum 44 pt) —
// 16×16 px było wzmacniaczem incydentu "nie mogłem zamknąć popupu z filmem".
// Do tego bezpiecznik warstw: gdyby JAKAKOLWIEK przyszła kombinacja warstw
// zostawiła body z pointer-events: none przy otwartym dialogu, dialog sam
// zdejmuje blokadę po czasie animacji menu.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import { LanguageProvider } from '@/contexts/LanguageContext';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Sheet, SheetContent, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { AlertDialog, AlertDialogContent, AlertDialogTitle, AlertDialogDescription } from '@/components/ui/alert-dialog';

beforeEach(() => {
  localStorage.setItem('app-language', 'pl');
  document.body.style.pointerEvents = '';
});
afterEach(() => {
  document.body.style.pointerEvents = '';
});

const renderDialog = () => render(
  <LanguageProvider>
    <Dialog open>
      <DialogContent>
        <DialogTitle>Tytuł</DialogTitle>
        <DialogDescription>Opis</DialogDescription>
      </DialogContent>
    </Dialog>
  </LanguageProvider>,
);

describe('Z192: tap target przycisku zamknięcia', () => {
  it('X w DialogContent ma pole dotyku 44 px (h-11 w-11 + centrowanie glifu)', () => {
    renderDialog();
    const close = screen.getByRole('button', { name: 'Zamknij okno' });
    expect(close.className).toContain('h-11');
    expect(close.className).toContain('w-11');
    expect(close.className).toContain('items-center');
    expect(close.className).toContain('justify-center');
  });

  it('X w AlertDialogContent ma pole dotyku 44 px (WP-F Task F1)', () => {
    render(
      <LanguageProvider>
        <AlertDialog open>
          <AlertDialogContent>
            <AlertDialogTitle>Tytuł</AlertDialogTitle>
            <AlertDialogDescription>Opis</AlertDialogDescription>
          </AlertDialogContent>
        </AlertDialog>
      </LanguageProvider>,
    );
    const close = screen.getByRole('button', { name: 'Zamknij okno' });
    expect(close.className).toContain('h-11');
    expect(close.className).toContain('w-11');
    expect(close.className).toContain('items-center');
    expect(close.className).toContain('justify-center');
  });

  it('X w SheetContent ma pole dotyku 44 px', () => {
    render(
      <LanguageProvider>
        <Sheet open>
          <SheetContent>
            <SheetTitle>Tytuł</SheetTitle>
            <SheetDescription>Opis</SheetDescription>
          </SheetContent>
        </Sheet>
      </LanguageProvider>,
    );
    const close = screen.getByRole('button', { name: 'Zamknij okno' });
    expect(close.className).toContain('h-11');
    expect(close.className).toContain('w-11');
    expect(close.className).toContain('items-center');
    expect(close.className).toContain('justify-center');
  });
});

describe('Z192: bezpiecznik pointer-events przy otwartym dialogu', () => {
  it('osierocony pointer-events: none na body jest czyszczony po 350 ms', () => {
    vi.useFakeTimers();
    try {
      renderDialog();
      // Symulacja osieroconej blokady po warstwie menu (bez menu w DOM).
      document.body.style.pointerEvents = 'none';

      act(() => { vi.advanceTimersByTime(400); });

      expect(document.body.style.pointerEvents).toBe('');
    } finally {
      vi.useRealTimers();
    }
  });

  it('blokada NIE jest zdejmowana, gdy w DOM żyje otwarta warstwa menu', () => {
    vi.useFakeTimers();
    try {
      renderDialog();
      const fakeMenu = document.createElement('div');
      fakeMenu.setAttribute('role', 'menu');
      fakeMenu.setAttribute('data-state', 'open');
      document.body.appendChild(fakeMenu);
      document.body.style.pointerEvents = 'none';

      act(() => { vi.advanceTimersByTime(400); });

      expect(document.body.style.pointerEvents).toBe('none');
      fakeMenu.remove();
    } finally {
      vi.useRealTimers();
    }
  });
});
