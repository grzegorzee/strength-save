// X27/WP-F Task F1: KAŻDY popup ma widoczny X od razu przy wyświetleniu.
// AlertDialog nie miał X (Dialog i Sheet mają od Z192) — user zostawał z jedyną
// drogą ucieczki przez przycisk Cancel w stopce. X = bezpieczne zamknięcie
// (odpowiednik Cancel przez AlertDialogPrimitive.Cancel), NIGDY akcja
// potwierdzająca. Opt-out `hideClose` dla dialogów wymuszających wybór.
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { LanguageProvider } from '@/contexts/LanguageContext';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

beforeEach(() => {
  localStorage.setItem('app-language', 'pl');
});

const renderAlert = (props: { hideClose?: boolean; onOpenChange?: (open: boolean) => void } = {}) => render(
  <LanguageProvider>
    <AlertDialog open onOpenChange={props.onOpenChange}>
      <AlertDialogContent hideClose={props.hideClose}>
        <AlertDialogHeader>
          <AlertDialogTitle>Na pewno?</AlertDialogTitle>
          <AlertDialogDescription>Opis potwierdzenia</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Anuluj</AlertDialogCancel>
          <AlertDialogAction>Potwierdź</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </LanguageProvider>,
);

describe('WP-F: X w AlertDialogContent', () => {
  it('X jest widoczny od razu, z polem dotyku 44 px (h-11 w-11)', () => {
    renderAlert();
    const close = screen.getByRole('button', { name: 'Zamknij okno' });
    expect(close.className).toContain('h-11');
    expect(close.className).toContain('w-11');
    expect(close.className).toContain('items-center');
    expect(close.className).toContain('justify-center');
  });

  it('klik X zamyka dialog (onOpenChange(false)) — działa jak Cancel, nie jak akcja', () => {
    const onOpenChange = vi.fn();
    renderAlert({ onOpenChange });
    fireEvent.click(screen.getByRole('button', { name: 'Zamknij okno' }));
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('hideClose ukrywa X (dialogi wymuszające wybór)', () => {
    renderAlert({ hideClose: true });
    expect(screen.queryByRole('button', { name: 'Zamknij okno' })).toBeNull();
  });

  it('tytuł ma pr-8 — nie wjeżdża pod X w prawym górnym rogu', () => {
    renderAlert();
    const title = screen.getByText('Na pewno?');
    expect(title.className).toContain('pr-8');
  });
});
