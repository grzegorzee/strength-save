import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { LanguageProvider } from '@/contexts/LanguageContext';

// Bezpiecznik kosztów (docs/COST-GUARDS.md): baner w panelu, gdy zadania
// niekrytyczne są wstrzymane, i przełącznik admina (callable + audyt serwerowy).
// Zasada 6: każdy stan ma wyjście, także przy błędzie odczytu dokumentu.

const store = vi.hoisted(() => ({
  doc: undefined as Record<string, unknown> | undefined,
  readError: false,
}));
const api = vi.hoisted(() => ({
  adminSetCostGuard: vi.fn(async (paused: boolean) => ({ success: true, paused })),
}));
const toastSpy = vi.hoisted(() => vi.fn());

vi.mock('@/lib/firebase', () => ({ db: {}, functions: {} }));
vi.mock('firebase/firestore', () => ({
  doc: vi.fn((_db: unknown, col: string, id: string) => ({ col, id })),
  getDoc: vi.fn(async () => {
    if (store.readError) throw new Error('permission-denied');
    return store.doc
      ? { exists: () => true, data: () => store.doc }
      : { exists: () => false, data: () => undefined };
  }),
}));
vi.mock('@/lib/registration-api', () => ({ adminSetCostGuard: api.adminSetCostGuard }));
vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: toastSpy }) }));

import { AdminCostGuardCard } from '@/components/admin/AdminCostGuardCard';

const renderCard = () => render(<LanguageProvider><AdminCostGuardCard /></LanguageProvider>);
const jobsSwitch = () => screen.findByRole('switch', { name: /zadania niekrytyczne/i });

beforeEach(() => {
  localStorage.clear();
  localStorage.setItem('app-language', 'pl');
  store.doc = undefined;
  store.readError = false;
  api.adminSetCostGuard.mockReset();
  api.adminSetCostGuard.mockImplementation(async (paused: boolean) => ({ success: true, paused }));
  toastSpy.mockClear();
});

describe('AdminCostGuardCard', () => {
  it('pauza z budżetu: baner z kosztem i wznowienie przełącznikiem', async () => {
    store.doc = {
      paused: true,
      reason: 'budget-threshold',
      costAmount: 46,
      budgetAmount: 50,
      currencyCode: 'PLN',
      ratio: 0.92,
      at: '2026-09-28T10:00:00.000Z',
    };
    renderCard();
    const banner = await screen.findByRole('alert');
    expect(banner.textContent).toMatch(/wstrzymane/i);
    expect(banner.textContent).toContain('46.00 PLN');
    expect(banner.textContent).toContain('50.00 PLN');
    expect(banner.textContent).toContain('92%');

    const toggle = await jobsSwitch();
    expect(toggle.getAttribute('aria-checked')).toBe('false');
    fireEvent.click(toggle);
    await waitFor(() => expect(api.adminSetCostGuard).toHaveBeenCalledWith(false));
    await waitFor(() => expect(screen.queryByRole('alert')).toBeNull());
    expect((await jobsSwitch()).getAttribute('aria-checked')).toBe('true');
  });

  it('brak dokumentu = zadania aktywne, bez banera; ręczna pauza przez callable', async () => {
    renderCard();
    const toggle = await jobsSwitch();
    expect(toggle.getAttribute('aria-checked')).toBe('true');
    expect(screen.queryByRole('alert')).toBeNull();
    fireEvent.click(toggle);
    await waitFor(() => expect(api.adminSetCostGuard).toHaveBeenCalledWith(true));
    expect(await screen.findByRole('alert')).toBeTruthy();
  });

  it('błąd callable: toast, stan bez zmian', async () => {
    store.doc = { paused: true, reason: 'admin-pause' };
    api.adminSetCostGuard.mockRejectedValueOnce(new Error('permission-denied'));
    renderCard();
    const toggle = await jobsSwitch();
    fireEvent.click(toggle);
    await waitFor(() => expect(toastSpy).toHaveBeenCalledWith(expect.objectContaining({ variant: 'destructive' })));
    expect(toggle.getAttribute('aria-checked')).toBe('false');
    expect(screen.getByRole('alert')).toBeTruthy();
  });

  it('błąd odczytu stanu: komunikat i jawne wznowienie (wyjście bez znajomości stanu)', async () => {
    store.readError = true;
    renderCard();
    expect(await screen.findByText(/nie udało się odczytać/i)).toBeTruthy();
    // Stan nieznany: nie pokazujemy przełącznika, który mógłby kłamać.
    expect(screen.queryByRole('switch')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: /wznów zadania/i }));
    await waitFor(() => expect(api.adminSetCostGuard).toHaveBeenCalledWith(false));
    expect((await jobsSwitch()).getAttribute('aria-checked')).toBe('true');
  });
});
