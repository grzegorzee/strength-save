import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { WarmupRoutineDialog } from '@/components/WarmupRoutineDialog';
import { buildPreStartWarmup } from '@/lib/prestart-warmup';

vi.mock('@/contexts/LanguageContext', () => ({
  useTranslation: () => ({ t: (k: string, p?: Record<string, unknown>) => (p ? `${k}:${JSON.stringify(p)}` : k), lang: 'pl' }),
}));
vi.mock('@/contexts/UnitContext', () => ({
  useUnit: () => ({ toDisplay: (kg: number) => kg, unit: 'kg' }),
}));

describe('WarmupRoutineDialog: zakończenie rozgrzewki', () => {
  it('przycisk Zakończ rozgrzewkę zamyka dialog', () => {
    const onOpenChange = vi.fn();
    render(
      <WarmupRoutineDialog focus="Push" plan={buildPreStartWarmup({ exerciseName: 'Wyciskanie hantli', category: 'chest', workingWeightKg: 30 })} open onOpenChange={onOpenChange} checked={new Set()} onToggle={() => {}} />,
    );
    fireEvent.click(screen.getByTestId('warmup-finish'));
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});
