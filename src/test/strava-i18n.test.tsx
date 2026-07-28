import { describe, it, expect, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import { LanguageProvider } from '@/contexts/LanguageContext';
import { HRZoneDistribution } from '@/components/strava/HRZoneDistribution';
import { computeWeeklyKm, computeMonthlySummaries } from '@/lib/strava-utils';
import { formatLocalDate } from '@/lib/utils';
import type { StravaActivity } from '@/types/strava';

// Z164: ekrany Strava w trybie EN nie mogą pokazywać polskich stringów
// (nazwy stref HR, etykiety tygodni, nazwy miesięcy).

const makeActivity = (over: Partial<StravaActivity> = {}): StravaActivity => ({
  id: 'act-1',
  userId: 'u1',
  stravaId: 1,
  name: 'Morning Run',
  type: 'Run',
  date: '2026-03-10',
  distance: 5000,
  movingTime: 1500,
  averageSpeed: 3.33,
  averageHeartrate: 150,
  totalElevationGain: 50,
  calories: 400,
  ...over,
} as StravaActivity);

describe('strefy HR przez i18n (Z164)', () => {
  beforeEach(() => localStorage.clear());

  it('EN: nazwy stref po angielsku, zero polskich', () => {
    localStorage.setItem('app-language', 'en');
    const view = render(
      <LanguageProvider>
        <HRZoneDistribution activities={[makeActivity()]} estimatedMaxHR={190} />
      </LanguageProvider>,
    );

    expect(view.getByText(/Recovery/)).toBeTruthy();
    expect(view.queryByText(/Regeneracja/)).toBeNull();
    expect(view.queryByText(/Aerobowa/)).toBeNull();
    expect(view.queryByText(/Próg/)).toBeNull();
  });

  it('PL: nazwy stref po polsku', () => {
    localStorage.setItem('app-language', 'pl');
    const view = render(
      <LanguageProvider>
        <HRZoneDistribution activities={[makeActivity()]} estimatedMaxHR={190} />
      </LanguageProvider>,
    );

    expect(view.getByText(/Regeneracja/)).toBeTruthy();
    expect(view.queryByText(/Recovery/)).toBeNull();
  });
});

describe('etykiety tygodni i miesięcy per język (Z164)', () => {
  it('computeWeeklyKm: EN daje "This wk", PL "Ten tydz."', () => {
    const today = formatLocalDate(new Date());
    const acts = [makeActivity({ date: today })];

    const en = computeWeeklyKm(acts, 3, undefined, 'en');
    const pl = computeWeeklyKm(acts, 3, undefined, 'pl');

    expect(en[en.length - 1].label).toBe('This wk');
    expect(en[en.length - 2].label).toBe('Last wk');
    expect(en[0].label).toMatch(/wks ago/);
    expect(pl[pl.length - 1].label).toBe('Ten tydz.');
    expect(pl[0].label).toMatch(/tyg\. temu/);
  });

  it('domyślny język (bez parametru) zostaje PL — niezmiennik starych callerów', () => {
    const today = formatLocalDate(new Date());
    const weeks = computeWeeklyKm([makeActivity({ date: today })], 2);
    expect(weeks[weeks.length - 1].label).toBe('Ten tydz.');
  });

  it('computeMonthlySummaries: EN formatuje miesiąc po angielsku', () => {
    const acts = [makeActivity({ date: '2026-01-15' })];

    expect(computeMonthlySummaries(acts, 'en')[0].label).toBe('January 2026');
    expect(computeMonthlySummaries(acts)[0].label).toBe('Styczeń 2026');
  });
});
