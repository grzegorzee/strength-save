// Z166: etykiety dostępności i komunikaty błędów cykli przez t()/translate().
import { describe, it, expect, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import { LanguageProvider } from '@/contexts/LanguageContext';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { completeOnboardingPlan } from '@/lib/cycle-actions';
import type { TrainingDay } from '@/data/trainingPlan';

const day: TrainingDay = {
  id: 'day-1', dayName: 'Poniedziałek', weekday: 'monday', focus: 'Klatka',
  exercises: [{ id: 'ex-1', name: 'Wyciskanie', sets: '3 x 8', instructions: [] }],
};

const renderDialog = (lang: 'pl' | 'en') => {
  localStorage.setItem('app-language', lang);
  return render(
    <LanguageProvider>
      <Dialog open><DialogContent>treść</DialogContent></Dialog>
    </LanguageProvider>,
  );
};

describe('sr-only "Zamknij" w dialogu per język (Z166)', () => {
  beforeEach(() => localStorage.clear());

  it('PL: Zamknij', () => {
    renderDialog('pl');
    expect(document.body.textContent).toContain('Zamknij okno');
  });

  it('EN: Close', () => {
    renderDialog('en');
    expect(document.body.textContent).toContain('Close dialog');
  });
});

describe('błędy cycle-actions per język (Z166)', () => {
  const deps = (lang?: 'pl' | 'en') => ({
    ...(lang ? { lang } : {}),
    savePlan: async () => ({ success: true }),
    createActiveCycle: async () => null, // wymusza ścieżkę błędu
    markOnboardingComplete: async () => {},
  });
  const choice = { days: [day], durationWeeks: 8, startDate: '2026-07-28', level: 'beginner', objective: 'build_muscle', daysPerWeek: 3 };

  it('EN: komunikat po angielsku', async () => {
    const res = await completeOnboardingPlan(choice, deps('en'));
    expect(res.success).toBe(false);
    expect(res.error).toBe('Active cycle was not created');
  });

  it('domyślnie (bez lang) po polsku — niezmiennik', async () => {
    const res = await completeOnboardingPlan(choice, deps());
    expect(res.error).toBe('Nie udało się utworzyć aktywnego cyklu');
  });
});
