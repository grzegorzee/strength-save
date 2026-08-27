import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import { Toast, ToastClose, ToastDescription, ToastProvider, ToastTitle, ToastViewport } from '@/components/ui/toast';

describe('toast z zawsze widocznym przyciskiem zamknięcia', () => {
  it('rezerwuje treści miejsce na 44-pikselowy przycisk X', () => {
    const { getByTestId } = render(
      <ToastProvider>
        <Toast defaultOpen data-testid="layout-toast">
          <div>
            <ToastTitle>Długi tytuł komunikatu</ToastTitle>
            <ToastDescription>Długi opis, który nie może znaleźć się pod przyciskiem zamknięcia.</ToastDescription>
          </div>
          <ToastClose aria-label="Zamknij" />
        </Toast>
        <ToastViewport />
      </ToastProvider>,
    );

    expect(getByTestId('layout-toast').className).toContain('pr-14');
  });
});
