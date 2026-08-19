import { readFileSync } from 'node:fs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { LanguageProvider } from '@/contexts/LanguageContext';
import { WorkoutDraftStatusNotice, WorkoutErrorNotice } from '@/components/WorkoutDraftStatusNotice';

const renderNotice = (kind: 'final-sync-pending' | 'save-error') => {
  const onRetry = vi.fn();
  const onDiscard = vi.fn();
  const onDismiss = vi.fn();
  render(
    <LanguageProvider>
      <WorkoutDraftStatusNotice
        kind={kind}
        onRetry={onRetry}
        onDiscard={onDiscard}
        onDismiss={onDismiss}
      />
    </LanguageProvider>,
  );
  return { onRetry, onDiscard, onDismiss };
};

beforeEach(() => {
  localStorage.clear();
  localStorage.setItem('app-language', 'pl');
});

describe('WorkoutDraftStatusNotice', () => {
  it('finalSyncPending daje widoczne wyjścia: ponów, odrzuć z potwierdzeniem i zamknij', () => {
    const { onRetry, onDiscard, onDismiss } = renderNotice('final-sync-pending');

    fireEvent.click(screen.getByRole('button', { name: 'Synchronizuj teraz' }));
    expect(onRetry).toHaveBeenCalledOnce();

    fireEvent.click(screen.getByRole('button', { name: 'Usuń szkic' }));
    expect(onDiscard).not.toHaveBeenCalled();
    fireEvent.click(screen.getAllByRole('button', { name: 'Usuń szkic' }).at(-1)!);
    expect(onDiscard).toHaveBeenCalledOnce();

    const close = screen.getByRole('button', { name: 'Zamknij' });
    expect(close.className).toContain('min-h-11');
    expect(close.className).toContain('min-w-11');
    expect(close.className).toContain('touch-manipulation');
    fireEvent.click(close);
    expect(onDismiss).toHaveBeenCalledOnce();
  });

  it('totalny błąd lokalnego zapisu ma ponów, odrzuć i zamknij', () => {
    const { onRetry, onDiscard, onDismiss } = renderNotice('save-error');

    fireEvent.click(screen.getByRole('button', { name: 'Ponów zapis' }));
    expect(onRetry).toHaveBeenCalledOnce();
    fireEvent.click(screen.getByRole('button', { name: 'Usuń szkic' }));
    fireEvent.click(screen.getAllByRole('button', { name: 'Usuń szkic' }).at(-1)!);
    expect(onDiscard).toHaveBeenCalledOnce();
    fireEvent.click(screen.getByRole('button', { name: 'Zamknij' }));
    expect(onDismiss).toHaveBeenCalledOnce();
  });

  it('niezmiennik: zwykły błąd chmury zachowuje komunikat i zamknięcie bez błędnego retry lokalnego', () => {
    const onDismiss = vi.fn();
    render(
      <LanguageProvider>
        <WorkoutErrorNotice message="Konflikt zapisu w chmurze" onDismiss={onDismiss} />
      </LanguageProvider>,
    );

    expect(screen.getByText('Konflikt zapisu w chmurze')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Ponów zapis' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Usuń szkic' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Zamknij' }));
    expect(onDismiss).toHaveBeenCalledOnce();
  });
});

describe('ciche wznowienie zwykłego draftu', () => {
  it('WorkoutDay zachowuje telemetrię odzyskania, ale nie pokazuje toastu odzyskania', () => {
    const source = readFileSync('src/pages/WorkoutDay.tsx', 'utf8');
    expect(source).toContain("trackTelemetryEvent(uid, 'draft_recovered')");
    expect(source).not.toContain("t('workout.toast.draftRecoveredTitle')");
    expect(source).not.toContain("t('workout.toast.draftPendingTitle')");
  });
});
