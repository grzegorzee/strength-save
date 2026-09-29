import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { DeloadBanner } from '@/components/DeloadBanner';
import { resolveDeloadWeek, type VacationMode } from '@/lib/vacation-mode';
import type { ProgressionConfig } from '@/lib/progression-engine';

// F3 (2026-09-29): baner deloadu (Plan) liczył isDeloadWeek BEZ urlopu, a chip
// "Deload" w WeekCard (Dashboard) resolveDeloadWeek Z urlopem. Po urlopie
// w tygodniu 4 tydzień 5 miał baner "Zastosuj deload" (podwójny deload po
// rampie), a WeekCard mówił, że deloadu nie ma. Niezmiennik: jedna decyzja.

vi.mock('@/contexts/LanguageContext', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

const PROGRESSION: ProgressionConfig = { enabled: true, deloadEveryWeeks: 5 };
const PLAN_START = '2026-08-31';
// Urlop właściciela 22-27.09 = tydzień 4 planu startującego 31.08.
const VACATION: VacationMode = { startDate: '2026-09-22', endDate: '2026-09-27', activity: 'none', extendedWeeks: 1 };

const renderBanner = (week: number, vacation: VacationMode | null) => render(
  <DeloadBanner
    planDays={[]}
    workouts={[]}
    currentWeek={week}
    progression={PROGRESSION}
    onDecision={vi.fn(async () => ({ success: true }))}
    vacation={vacation}
    planStartDate={PLAN_START}
  />,
);

describe('DeloadBanner = chip Deload w WeekCard (resolveDeloadWeek)', () => {
  it.each([3, 4, 5, 6, 10])('tydzień %i z urlopem: baner tylko gdy WeekCard pokazuje Deload', (week) => {
    const weekCardDeload = resolveDeloadWeek(week, PROGRESSION, VACATION, PLAN_START);
    const { unmount } = renderBanner(week, VACATION);
    expect(!!screen.queryByTestId('deload-banner')).toBe(weekCardDeload);
    unmount();
  });

  it('tydzień 5 tuż po urlopie: brak banera (urlop przejął rolę deloadu)', () => {
    renderBanner(5, VACATION);
    expect(screen.queryByTestId('deload-banner')).toBeNull();
  });

  it('niezmiennik: bez urlopu tydzień 5 ma baner programowego deloadu', () => {
    renderBanner(5, null);
    expect(screen.getByTestId('deload-banner')).toBeTruthy();
  });
});
