import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Sheet, SheetContent, SheetDescription, SheetTitle } from '@/components/ui/sheet';
import { LanguageProvider } from '@/contexts/LanguageContext';

describe('mobile overlay keyboard contract', () => {
  it('AlertDialog zmienia pozycję po zamknięciu klawiatury natychmiast, bez animacji top', () => {
    render(
      <LanguageProvider>
        <AlertDialog open>
          <AlertDialogContent data-testid="keyboard-alert">
            <AlertDialogTitle>Potwierdzenie</AlertDialogTitle>
            <AlertDialogDescription>Opis</AlertDialogDescription>
          </AlertDialogContent>
        </AlertDialog>
      </LanguageProvider>,
    );

    const content = screen.getByTestId('keyboard-alert');
    expect(content.className).toContain('top-[calc((100dvh-var(--keyboard-inset,0px))/2)]');
    expect(content.className).not.toContain('transition-[top]');
  });

  it('bottom Sheet pozostawia przewijalną treść i CTA nad klawiaturą oraz safe-area', () => {
    render(
      <LanguageProvider>
        <Sheet open>
          <SheetContent side="bottom" data-testid="keyboard-sheet">
            <SheetTitle>Edycja</SheetTitle>
            <SheetDescription>Opis</SheetDescription>
            <button type="button">Zapisz</button>
          </SheetContent>
        </Sheet>
      </LanguageProvider>,
    );

    const content = screen.getByTestId('keyboard-sheet');
    expect(content.className).toContain('bottom-[var(--keyboard-inset,0px)]');
    expect(content.className).toContain('max-h-[calc(100dvh-var(--keyboard-inset,0px))]');
    expect(content.className).toMatch(/\boverflow-y-auto\b/);
    expect(content.className).toContain('pb-[calc(1.5rem+env(safe-area-inset-bottom))]');
    expect(content.className).toMatch(/\btransition-transform\b/);
    expect(screen.getByRole('button', { name: 'Zapisz' })).toBeTruthy();
  });
});
