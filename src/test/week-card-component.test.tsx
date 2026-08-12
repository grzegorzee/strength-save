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

const renderCard = (m: WeekCardModel, isDeloadWeek = false) =>
  render(
    <LanguageProvider>
      <UnitProvider>
        <WeekCard model={m} isDeloadWeek={isDeloadWeek} />
      </UnitProvider>
    </LanguageProvider>,
  );

beforeEach(() => {
  localStorage.clear();
  localStorage.setItem('app-language', 'pl');
});

describe('WeekCard', () => {
  it('nagłówek tygodnia, pasek sesji i tonaż', () => {
    renderCard(model);
    expect(screen.getByText('Tydzień 6 z 12')).toBeTruthy();
    expect(screen.getByText('1 z 3 sesji')).toBeTruthy();
    expect(screen.getByText('4.3 t')).toBeTruthy();
  });

  it('badge deload przy tygodniu deloadowym', () => {
    renderCard(model, true);
    expect(screen.getByText('Deload')).toBeTruthy();
  });

  it('week null = karta nie renderuje się (plan bez startu, bez regresu)', () => {
    renderCard({ ...model, week: null });
    expect(screen.queryByTestId('week-card')).toBeNull();
  });
});
