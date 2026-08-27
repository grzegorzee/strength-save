import { render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { AddCardioDialog } from '@/components/AddCardioDialog';
import { LanguageProvider } from '@/contexts/LanguageContext';

describe('AddCardioDialog — klawiatura mobilna', () => {
  it('korzysta z keyboard-aware limitu bazowego DialogContent, bez lokalnego limitu 85vh', () => {
    render(
      <LanguageProvider>
        <AddCardioDialog
          open
          onOpenChange={vi.fn()}
          onAdd={vi.fn(async () => ({ ok: true }))}
          onUpdate={vi.fn(async () => ({ ok: true }))}
          onDelete={vi.fn(async () => ({ ok: true }))}
        />
      </LanguageProvider>,
    );

    const dialog = screen.getByRole('dialog');
    expect(dialog.className).toContain('max-h-[calc(100dvh_-_var(--keyboard-inset,0px)');
    expect(dialog.className).not.toContain('max-h-[85vh]');
    expect(within(dialog).getByTestId('cardio-save')).toBeTruthy();
  });
});
