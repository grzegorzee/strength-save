// X31 H2: replan przez /new-plan (bez fromCycle) ma startowac z profilu
// treningowego usera (users/{uid}.trainingProfile = odpowiedzi z krokow 2-4).
// Profil przychodzi asynchronicznie z getDoc, a PlanWizard czyta `initial`
// tylko w inicjalizatorach useState. Bez trzymania kreatora do czasu wczytania
// profilu krok 5 liczyl rekomendacje z domyslnych beginner/build_muscle/4 dni,
// wiec user widzial plan niezgodny z WSZYSTKIMI swoimi odpowiedziami.
// Test SEKWENCJI: getDoc (pozniej) -> krok 5 -> podglad -> zatwierdzenie -> zapis profilu.
// Harness wg newplan-training-profile.test.tsx (kreator prawdziwy, podglad atrapa).
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { LanguageProvider } from '@/contexts/LanguageContext';
import { UnitProvider } from '@/contexts/UnitContext';
import { getRecommendedPlan } from '@/data/planTemplates';
import { localizePlanName } from '@/lib/plan-i18n';
import type { TrainingDay } from '@/data/trainingPlan';

type ProfileDoc = { trainingProfile?: { level: string; objective: string; daysPerWeek: number } } | null;
const profileDoc = vi.hoisted(() => ({ current: null as ProfileDoc, reject: false }));
const updateDoc = vi.hoisted(() => vi.fn<(ref: unknown, data: Record<string, unknown>) => Promise<void>>(async () => {}));
vi.mock('firebase/firestore', () => ({
  doc: vi.fn(() => ({})),
  // Odpowiedz PO pierwszym renderze (makrotask) = realna kolejnosc w apce.
  getDoc: vi.fn(() => new Promise((resolve, reject) => {
    setTimeout(() => {
      if (profileDoc.reject) reject(new Error('offline'));
      else resolve({ exists: () => profileDoc.current !== null, data: () => profileDoc.current });
    }, 0);
  })),
  updateDoc,
}));
vi.mock('@/lib/firebase', () => ({ db: {}, auth: {}, storage: {}, functions: {} }));
vi.mock('@/lib/app-telemetry', () => ({ trackTelemetryEvent: vi.fn() }));
vi.mock('@/lib/user-events', () => ({ buildPlanEventEmitter: () => vi.fn() }));
vi.mock('@/contexts/UserContext', () => ({
  useCurrentUser: () => ({ uid: 'u1', profile: { displayName: 'Tester' }, isAdmin: false }),
}));
vi.mock('@/hooks/useSubscription', () => ({ useRequiresPaywall: () => false }));
vi.mock('@/hooks/useTrainingPlan', () => ({
  useTrainingPlan: () => ({ plan: [], planName: '', planDurationWeeks: 12, planStartDate: null, savePlan: vi.fn() }),
}));
vi.mock('@/hooks/useFirebaseWorkouts', () => ({
  useFirebaseWorkouts: () => ({ workouts: [], backfillHistoricalWorkouts: vi.fn() }),
}));
vi.mock('@/hooks/usePlanCycles', () => ({
  usePlanCycles: () => ({ archiveCurrentPlan: vi.fn(), createActiveCycle: vi.fn(), getCycleById: vi.fn() }),
}));
const startCycleWithPlan = vi.hoisted(() => vi.fn<() => Promise<{ success: boolean; error?: string }>>(async () => ({ success: true })));
vi.mock('@/lib/cycle-actions', () => ({ startCycleWithPlan }));
const navigate = vi.hoisted(() => vi.fn());
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return { ...actual, useNavigate: () => navigate };
});
vi.mock('@/components/PlanBuilder', () => ({ PlanBuilder: () => null }));
vi.mock('@/components/PlanPreview', () => ({
  PlanPreview: ({ days, onConfirm }: { days: TrainingDay[]; onConfirm: () => void }) => (
    <button onClick={onConfirm}>PREVIEW-CONFIRM:{days.length}</button>
  ),
}));

import NewPlan from '@/pages/NewPlan';

const renderNewPlan = () => render(
  <MemoryRouter>
    <LanguageProvider>
      <UnitProvider><NewPlan /></UnitProvider>
    </LanguageProvider>
  </MemoryRouter>,
);

// X32: kreator startuje od kroku 2 z zaznaczonym profilem; user potwierdza
// poziom/cel/dni (Dalej x3) i dopiero krok 5 liczy rekomendacje z tych odpowiedzi.
// X33 WP-2: rekomendacja = karta "Polecany" (zamiast linii "polecamy plan").
const recommendedLine = async () => {
  fireEvent.click(await screen.findByRole('button', { name: /Następny krok/ }));
  fireEvent.click(screen.getByRole('button', { name: /Dalej/ }));
  fireEvent.click(screen.getByRole('button', { name: /Dalej/ }));
  return screen.findByTestId('plan-choice-recommended');
};

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  localStorage.setItem('app-language', 'pl');
  profileDoc.current = null;
  profileDoc.reject = false;
});

describe('NewPlan: krok 5 liczy rekomendacje z profilu treningowego (X31 H2)', () => {
  it('REGRESJA (realne konto): profil {fat_loss, intermediate, 3} -> krok 5 rekomenduje plan 3-dniowy i zapisuje ten profil', async () => {
    profileDoc.current = { trainingProfile: { level: 'intermediate', objective: 'fat_loss', daysPerWeek: 3 } };
    renderNewPlan();

    const expected = getRecommendedPlan('fat_loss', 'intermediate', 3);
    expect(expected.daysPerWeek).toBe(3);
    const line = await recommendedLine();
    expect(line.textContent).toContain(localizePlanName(expected.id, expected.name, 'pl'));
    expect(line.textContent).not.toContain('Rzeźba i Kondycja');

    // Podglad dostaje 3 dni; zatwierdzenie zapisuje profil z odpowiedzi usera, nie z domyslnych.
    fireEvent.click(screen.getByRole('button', { name: /Podgląd planu/ }));
    fireEvent.click(await screen.findByText('PREVIEW-CONFIRM:3'));
    await waitFor(() => expect(updateDoc).toHaveBeenCalledTimes(1));
    expect(updateDoc.mock.calls[0][1]).toEqual({
      trainingProfile: { level: 'intermediate', objective: 'fat_loss', daysPerWeek: 3 },
    });
  });

  it('niezmiennik: brak profilu (dokument bez trainingProfile) -> kreator z domyslnymi (4 dni)', async () => {
    profileDoc.current = {};
    renderNewPlan();

    const expected = getRecommendedPlan('build_muscle', 'beginner', 4);
    const line = await recommendedLine();
    expect(line.textContent).toContain(localizePlanName(expected.id, expected.name, 'pl'));
    fireEvent.click(screen.getByRole('button', { name: /Podgląd planu/ }));
    expect(await screen.findByText('PREVIEW-CONFIRM:4')).toBeTruthy();
  });

  it('niezmiennik: awaria odczytu profilu (offline) NIE blokuje kreatora', async () => {
    profileDoc.reject = true;
    renderNewPlan();

    expect((await recommendedLine()).textContent).toContain('Polecany');
  });
});
