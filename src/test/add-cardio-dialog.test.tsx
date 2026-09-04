import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AddCardioDialog } from '@/components/AddCardioDialog';
import { LanguageProvider } from '@/contexts/LanguageContext';

const health = vi.hoisted(() => ({ enabled: true }));
vi.mock('@/hooks/useHealthConsent', () => ({ useHealthConsent: () => health.enabled }));

beforeEach(() => { health.enabled = true; });

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
    expect(dialog.className).toContain('grid-rows-[auto_minmax(0,1fr)_auto]');
    expect(dialog.querySelector('.min-h-0.overflow-y-auto')).toBeTruthy();
    expect(within(dialog).getByTestId('cardio-save')).toBeTruthy();
  });

  it('bez zgody pokazuje lekkie cardio bazowe, bez pól zdrowotnych', () => {
    health.enabled = false;
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

    fireEvent.click(screen.getByRole('button', { name: /^(More|Więcej)/i }));
    expect(screen.getByTestId('cardio-distance')).toBeTruthy();
    expect(screen.queryByTestId('cardio-hr')).toBeNull();
    expect(screen.queryByTestId('cardio-calories')).toBeNull();
    expect(screen.queryByTestId('cardio-intensity-moderate')).toBeNull();
  });

  it('na iPhonie pokazuje szerokie kafle bez łamania etykiet w środku słowa', () => {
    localStorage.setItem('app-language', 'pl');
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

    const grid = screen.getByTestId('cardio-type-grid');
    expect(grid.className).toContain('grid-cols-2');
    expect(grid.className).not.toContain('grid-cols-4');

    for (const name of ['Pływanie', 'Rower stac.', 'Skakanka']) {
      const tile = screen.getByRole('button', { name });
      expect(tile.className).toContain('min-h-12');
      expect(tile.className).toContain('text-xs');
      expect(tile.className).toContain('phone:text-sm');
      const label = tile.querySelectorAll('span')[1];
      expect(label?.className).toContain('break-normal');
      expect(label?.className).not.toContain('break-words');
    }
  });

  it('zachowuje szybki zapis typu, czasu i daty po przebudowie formularza', async () => {
    localStorage.setItem('app-language', 'pl');
    const onAdd = vi.fn(async () => ({ ok: true }));
    render(
      <LanguageProvider>
        <AddCardioDialog
          open
          defaultDate="2026-09-02"
          onOpenChange={vi.fn()}
          onAdd={onAdd}
          onUpdate={vi.fn(async () => ({ ok: true }))}
          onDelete={vi.fn(async () => ({ ok: true }))}
        />
      </LanguageProvider>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Pływanie' }));
    fireEvent.change(screen.getByTestId('cardio-minutes'), { target: { value: '30' } });
    fireEvent.click(screen.getByTestId('cardio-save'));

    await waitFor(() => {
      expect(onAdd).toHaveBeenCalledWith(expect.objectContaining({
        type: 'Swim',
        date: '2026-09-02',
        movingTime: 1800,
      }));
    });
  });

  it('po błędzie transportu pokazuje wyjście i pozwala ponowić zapis', async () => {
    localStorage.setItem('app-language', 'pl');
    render(
      <LanguageProvider>
        <AddCardioDialog
          open
          onOpenChange={vi.fn()}
          onAdd={vi.fn(async () => { throw new Error('offline'); })}
          onUpdate={vi.fn(async () => ({ ok: true }))}
          onDelete={vi.fn(async () => ({ ok: true }))}
        />
      </LanguageProvider>,
    );

    fireEvent.change(screen.getByTestId('cardio-minutes'), { target: { value: '30' } });
    fireEvent.click(screen.getByTestId('cardio-save'));

    expect(await screen.findByRole('alert')).toHaveTextContent('Zapis nie powiódł się');
    expect(within(screen.getByTestId('cardio-footer')).getByRole('alert')).toBeTruthy();
    expect(screen.getByTestId('cardio-save')).not.toBeDisabled();
  });
});
