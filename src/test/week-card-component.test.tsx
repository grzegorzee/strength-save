import { beforeEach, describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { LanguageProvider } from '@/contexts/LanguageContext';
import { UnitProvider } from '@/contexts/UnitContext';
import { WeekCard } from '@/components/WeekCard';
import type { WeekCardModel } from '@/lib/week-card';

// Runna pakiet 1, krok 7 (spec B1): render karty tygodnia.

const model: WeekCardModel = {
  week: { current: 6, total: 12 },
  days: [
    { date: '2026-08-10', status: 'done', isToday: false },
    { date: '2026-08-11', status: 'rest', isToday: false },
    { date: '2026-08-12', status: 'rest', isToday: true },
    { date: '2026-08-13', status: 'planned', isToday: false },
    { date: '2026-08-14', status: 'rest', isToday: false },
    { date: '2026-08-15', status: 'skipped', isToday: false },
    { date: '2026-08-16', status: 'rest', isToday: false },
  ],
  sessionsDone: 1,
  sessionsPlanned: 3,
  tonnageKg: 4300,
};

const renderCard = (m: WeekCardModel, isDeloadWeek = false, todayDoneDayName?: string) =>
  render(
    <LanguageProvider>
      <UnitProvider>
        <WeekCard model={m} isDeloadWeek={isDeloadWeek} todayDoneDayName={todayDoneDayName} />
      </UnitProvider>
    </LanguageProvider>,
  );

beforeEach(() => {
  localStorage.clear();
  localStorage.setItem('app-language', 'pl');
});

describe('WeekCard', () => {
  it('nagłówek: licznik sesji, tonaż i skrót tygodnia mono (fala 2)', () => {
    renderCard(model);
    expect(screen.getByText('1 z 3 sesji')).toBeTruthy();
    // Tonaż i "TYDZ. 6/12" w jednym wierszu mono po prawej.
    expect(screen.getByText(/4\.3 t · TYDZ\. 6\/12/)).toBeTruthy();
  });

  it('bez tonażu: sam skrót tygodnia, bez separatora', () => {
    renderCard({ ...model, tonnageKg: 0 });
    expect(screen.getByText(/^TYDZ\. 6\/12$/)).toBeTruthy();
  });

  it('badge deload przy tygodniu deloadowym', () => {
    renderCard(model, true);
    expect(screen.getByText('Deload')).toBeTruthy();
  });

  it('week null = karta nie renderuje się (plan bez startu, bez regresu)', () => {
    renderCard({ ...model, week: null });
    expect(screen.queryByTestId('week-card')).toBeNull();
  });

  // T24a (feedback 2026-08-20): "ukończone" podąża za kolorem akcentu (primary),
  // nie za semantycznym fitness-success. Fala 2: segment poziomy zamiast kółka.
  it('segment done w kolorze akcentu (primary), nie fitness-success', () => {
    renderCard(model);
    const doneSegment = screen.getByTestId('week-day-2026-08-10');
    expect(doneSegment.className).toContain('bg-primary');
    expect(doneSegment.className).not.toContain('fitness-success');
    const plannedSegment = screen.getByTestId('week-day-2026-08-13');
    expect(plannedSegment.className).toContain('bg-primary/25');
    const restSegment = screen.getByTestId('week-day-2026-08-14');
    expect(restSegment.className).toContain('bg-surface-highest');
    const todaySegment = screen.getByTestId('week-day-2026-08-12');
    expect(todaySegment.className).toContain('ring-primary/60');
  });

  // Fala 2: stopka "Dzisiaj zrobione · {dzień}" tylko gdy dziś done i znamy nazwę.
  it('stopka dzisiejszego ukończenia widoczna tylko przy statusie done', () => {
    const doneToday: WeekCardModel = {
      ...model,
      days: model.days.map((d) => (d.isToday ? { ...d, status: 'done' } : d)),
    };
    renderCard(doneToday, false, 'Upper Body A');
    expect(screen.getByText('Dzisiaj zrobione · Upper Body A')).toBeTruthy();
  });

  it('bez ukończenia dziś: brak stopki mimo podanej nazwy dnia', () => {
    renderCard(model, false, 'Upper Body A');
    expect(screen.queryByText(/Dzisiaj zrobione/)).toBeNull();
  });
});
