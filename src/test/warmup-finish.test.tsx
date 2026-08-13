import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { WarmupRoutineDialog } from '@/components/WarmupRoutineDialog';

vi.mock('@/contexts/LanguageContext', () => ({
  useTranslation: () => ({ t: (k: string, p?: Record<string, unknown>) => (p ? `${k}:${JSON.stringify(p)}` : k), lang: 'pl' }),
}));

describe('WarmupRoutineDialog: zakończenie rozgrzewki', () => {
  it('przycisk Zakończ rozgrzewkę zamyka dialog', () => {
    const onOpenChange = vi.fn();
    render(
      <WarmupRoutineDialog focus="Push" open onOpenChange={onOpenChange} checked={new Set()} onToggle={() => {}} />,
    );
    fireEvent.click(screen.getByTestId('warmup-finish'));
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});
