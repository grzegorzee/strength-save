import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { LanguageProvider } from '@/contexts/LanguageContext';
import { Toaster } from '@/components/ui/toaster';

vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toasts: [{ id: 'toast-1', title: 'Trening rozpoczęty' }],
  }),
}));

describe('globalny toast: dostępne zamknięcie na ekranie dotykowym', () => {
  it('pokazuje stale widoczny cel 44 px z lokalizowanym aria-label', () => {
    localStorage.setItem('app-language', 'pl');
    render(
      <LanguageProvider>
        <Toaster />
      </LanguageProvider>,
    );

    const close = screen.getByRole('button', { name: 'Zamknij' });
    expect(close.className).toContain('h-11');
    expect(close.className).toContain('w-11');
    expect(close.className).not.toContain('opacity-0');
  });
});
