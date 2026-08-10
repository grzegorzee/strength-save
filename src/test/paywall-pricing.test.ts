import { describe, expect, it } from 'vitest';
import { yearlyValueSummary } from '@/lib/purchases';

// Z209: cena efektywna/miesiąc i oszczędność liczona z realnych cen sklepu,
// nigdy hardkodowana ("5 mies. gratis" przy cenach, które dają inny wynik).

const yearly = (price: number, currencyCode: string, pricePerMonthString: string | null = null) =>
  ({ price, currencyCode, pricePerMonthString });
const monthly = (price: number, currencyCode: string) => ({ price, currencyCode });

describe('Z209 — yearlyValueSummary', () => {
  it('PL: liczy cenę efektywną/miesiąc i oszczędność względem 12x monthly', () => {
    const v = yearlyValueSummary(yearly(119.99, 'PLN'), monthly(14.99, 'PLN'), 'pl-PL');
    expect(v.perMonth).toBe('10,00 zł'); // Intl: twarda spacja przed walutą
    expect(v.savingsPercent).toBe(33);
  });

  it('preferuje lokalizowany pricePerMonthString ze sklepu, gdy jest', () => {
    const v = yearlyValueSummary(yearly(119.99, 'PLN', '9,99 zł'), monthly(14.99, 'PLN'), 'pl-PL');
    expect(v.perMonth).toBe('9,99 zł');
  });

  it('EN/USD: formatuje w locale użytkownika', () => {
    const v = yearlyValueSummary(yearly(31.99, 'USD'), monthly(3.99, 'USD'), 'en-US');
    expect(v.perMonth).toBe('$2.67');
    expect(v.savingsPercent).toBe(33);
  });

  it('duże ceny (IDR) nie łamią obliczeń', () => {
    const v = yearlyValueSummary(yearly(1_919_000, 'IDR'), monthly(249_000, 'IDR'), 'id-ID');
    expect(v.perMonth).not.toBeNull();
    expect(v.savingsPercent).toBe(36);
  });

  it('brak monthly albo inna waluta = brak obietnicy oszczędności', () => {
    expect(yearlyValueSummary(yearly(119.99, 'PLN'), null, 'pl-PL').savingsPercent).toBeNull();
    expect(yearlyValueSummary(yearly(119.99, 'PLN'), monthly(3.99, 'USD'), 'pl-PL').savingsPercent).toBeNull();
  });

  it('brak yearly albo brak realnej oszczędności = null, nie ujemny procent', () => {
    expect(yearlyValueSummary(null, monthly(14.99, 'PLN'), 'pl-PL')).toEqual({ perMonth: null, savingsPercent: null });
    expect(yearlyValueSummary(yearly(200, 'PLN'), monthly(14.99, 'PLN'), 'pl-PL').savingsPercent).toBeNull();
  });
});
