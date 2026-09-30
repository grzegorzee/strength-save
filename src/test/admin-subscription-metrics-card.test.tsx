import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { LanguageProvider } from '@/contexts/LanguageContext';
import type { SubscriptionMetricsResponse } from '@/lib/registration-api';

// Karta „Subskrypcje” (2026-09-30): liczby z RevenueCat przez callable admina
// (cache 1 h po stronie serwera). Zasada 6: błąd RC ma wyjście (Spróbuj ponownie),
// stare liczby przy błędzie są oznaczone, brak danych nie udaje zera.

const api = vi.hoisted(() => ({ adminSubscriptionMetrics: vi.fn() }));
vi.mock('@/lib/registration-api', () => ({ adminSubscriptionMetrics: api.adminSubscriptionMetrics }));

import { AdminSubscriptionMetricsCard } from '@/components/admin/AdminSubscriptionMetricsCard';

const metrics = {
  activeTrials: 4,
  activeSubscriptions: 2,
  mrr: 29.5,
  revenue28d: 139.98,
  newCustomers28d: 30,
  activeUsers28d: 55,
  currency: 'PLN',
  rcUpdatedAt: null,
};
const ok = (over: Partial<SubscriptionMetricsResponse> = {}): SubscriptionMetricsResponse => ({
  metrics, fetchedAt: Date.parse('2026-09-30T12:05:00Z'), stale: false, error: null, ...over,
});

const renderCard = () => render(<LanguageProvider><AdminSubscriptionMetricsCard /></LanguageProvider>);

beforeEach(() => {
  localStorage.clear();
  localStorage.setItem('app-language', 'pl');
  api.adminSubscriptionMetrics.mockReset();
});

describe('AdminSubscriptionMetricsCard', () => {
  it('z danymi: aktywne triale, subskrypcje, MRR, przychód 28 dni i czas stanu', async () => {
    api.adminSubscriptionMetrics.mockResolvedValue(ok());
    renderCard();
    expect(await screen.findByText('Aktywne triale')).toBeTruthy();
    const card = screen.getByTestId('admin-subscription-metrics');
    expect(card.textContent).toContain('4');
    expect(card.textContent).toContain('Aktywne subskrypcje');
    expect(card.textContent).toMatch(/29,50\s*zł/);
    expect(card.textContent).toMatch(/139,98\s*zł/);
    expect(card.textContent).toContain('Stan z');
    expect(screen.queryByRole('alert')).toBeNull();
    expect(api.adminSubscriptionMetrics).toHaveBeenCalledTimes(1);
  });

  it('bez danych: komunikat zamiast zer, z możliwością ponowienia', async () => {
    api.adminSubscriptionMetrics.mockResolvedValue(ok({ metrics: null, fetchedAt: null }));
    renderCard();
    expect(await screen.findByText('RevenueCat nie zwrócił jeszcze liczb.')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Spróbuj ponownie' })).toBeTruthy();
  });

  it('pojedyncza brakująca metryka jest oznaczona, nie pokazana jako 0', async () => {
    api.adminSubscriptionMetrics.mockResolvedValue(ok({ metrics: { ...metrics, mrr: null } }));
    renderCard();
    const cell = await screen.findByTestId('subs-metric-mrr');
    expect(cell.textContent).toContain('brak');
  });

  it('błąd RC bez danych: komunikat z kodem i wyjście "Spróbuj ponownie" (drugi raz działa)', async () => {
    api.adminSubscriptionMetrics
      .mockResolvedValueOnce(ok({ metrics: null, fetchedAt: null, stale: true, error: 'REVENUECAT_HTTP_503' }))
      .mockResolvedValueOnce(ok());
    renderCard();
    const alert = await screen.findByRole('alert');
    expect(alert.textContent).toContain('REVENUECAT_HTTP_503');
    fireEvent.click(screen.getByRole('button', { name: 'Spróbuj ponownie' }));
    await waitFor(() => expect(screen.queryByRole('alert')).toBeNull());
    expect(await screen.findByText('Aktywne triale')).toBeTruthy();
    expect(api.adminSubscriptionMetrics).toHaveBeenCalledTimes(2);
  });

  it('błąd RC przy zapisanym stanie: stare liczby + ostrzeżenie + ponowienie', async () => {
    api.adminSubscriptionMetrics.mockResolvedValue(ok({ stale: true, error: 'REVENUECAT_HTTP_429' }));
    renderCard();
    const alert = await screen.findByRole('alert');
    expect(alert.textContent).toContain('ostatni zapisany stan');
    expect(screen.getByTestId('admin-subscription-metrics').textContent).toContain('Aktywne triale');
    expect(screen.getByRole('button', { name: 'Spróbuj ponownie' })).toBeTruthy();
  });

  it('wyjątek callable (sieć/uprawnienia): komunikat i ponowienie', async () => {
    api.adminSubscriptionMetrics.mockRejectedValueOnce(new Error('internal')).mockResolvedValueOnce(ok());
    renderCard();
    expect(await screen.findByRole('alert')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Spróbuj ponownie' }));
    expect(await screen.findByText('Aktywne triale')).toBeTruthy();
  });
});
