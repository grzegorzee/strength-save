import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ConfirmDialog } from '@/components/ConfirmDialog';

vi.mock('@/contexts/LanguageContext', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

describe('ConfirmDialog: długi niełamliwy tytuł na małym ekranie', () => {
  it('ogranicza grid do jednej kolumny i pozwala łamać adres e-mail', () => {
    render(
      <ConfirmDialog
        open
        onOpenChange={vi.fn()}
        title="bardzo.dlugi.adres.email.ktory.nie.miesci.sie.w.dialogu@example.com"
        description="Opis"
        confirmLabel="Zapisz"
        onConfirm={vi.fn()}
      >
        <input aria-label="Imię trenera" />
      </ConfirmDialog>,
    );

    expect(screen.getByRole('alertdialog')).toHaveClass('grid-cols-1');
    expect(screen.getByRole('heading')).toHaveClass('break-words');
  });
});
