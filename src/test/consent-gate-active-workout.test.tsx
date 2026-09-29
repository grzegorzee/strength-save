import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useNavigate } from 'react-router-dom';
import { LanguageProvider } from '@/contexts/LanguageContext';
import { formatLocalDate } from '@/lib/utils';

// B8 (2026-09-29, audyt R1): po podbiciu wersji dokumentów ConsentGate zastępuje
// cały router. Offline na siłowni (recordConsents wymaga sieci) user z
// treningiem w toku nie mógł do niego wrócić. Niezmiennik: trening w toku
// nigdy nie zostaje zablokowany ani utracony. Bramka oferuje powrót do
// treningu; zgody wracają po wyjściu z ekranu treningu.

const draftFixture = vi.hoisted(() => ({ current: null as Record<string, unknown> | null }));
vi.mock('@/lib/workout-draft-db', () => ({
  workoutDraftDb: { loadActiveDraft: vi.fn(async () => draftFixture.current) },
}));
vi.mock('@/lib/consents-api', () => ({ recordConsents: vi.fn(async () => ({})) }));
vi.mock('@/lib/registration-api', () => ({ deleteOwnAccount: vi.fn() }));

import { ConsentGate, ConsentDeferralRearm } from '@/components/ConsentGate';
import type { UserProfile } from '@/lib/user-profile';

const profile = { uid: 'u1', email: 'a@b.c' } as unknown as UserProfile;
const today = formatLocalDate(new Date());

const renderGate = (onResumeWorkout?: (target: string) => void) => render(
  <LanguageProvider>
    <ConsentGate profile={profile} onConfirmed={vi.fn()} onLogout={vi.fn(async () => {})} onResumeWorkout={onResumeWorkout} />
  </LanguageProvider>,
);

beforeEach(() => {
  localStorage.clear();
  localStorage.setItem('app-language', 'pl');
  draftFixture.current = null;
});

describe('B8: bramka zgód nie blokuje treningu w toku', () => {
  it('dzisiejszy nieukończony trening: przycisk powrotu prowadzi do treningu', async () => {
    draftFixture.current = { dayId: 'day-2', date: today, sessionId: 's-1', completedLocally: false, finalSyncPending: false };
    const onResumeWorkout = vi.fn();
    renderGate(onResumeWorkout);
    fireEvent.click(await screen.findByRole('button', { name: 'Wróć do trwającego treningu' }));
    expect(onResumeWorkout).toHaveBeenCalledWith(`/workout/day-2?date=${today}&session=s-1`);
  });

  it('bez treningu w toku: brak przycisku, bramka jak dotąd', async () => {
    renderGate(vi.fn());
    await waitFor(() => expect(screen.getByTestId('consent-gate-submit')).toBeInTheDocument());
    expect(screen.queryByRole('button', { name: 'Wróć do trwającego treningu' })).toBeNull();
  });

  it('trening ukończony lokalnie nie otwiera obejścia bramki', async () => {
    draftFixture.current = { dayId: 'day-2', date: today, sessionId: 's-1', completedLocally: true };
    renderGate(vi.fn());
    await waitFor(() => expect(screen.getByTestId('consent-gate-submit')).toBeInTheDocument());
    expect(screen.queryByRole('button', { name: 'Wróć do trwającego treningu' })).toBeNull();
  });
});

describe('B8: odroczenie zgód trwa tylko na ekranie treningu', () => {
  const Leave = () => {
    const navigate = useNavigate();
    return <button onClick={() => navigate('/')}>leave</button>;
  };
  const renderAt = (path: string, onRearm: () => void) => render(
    <MemoryRouter initialEntries={[path]}>
      <ConsentDeferralRearm onRearm={onRearm} />
      <Routes><Route path="*" element={<Leave />} /></Routes>
    </MemoryRouter>,
  );

  it('na /workout/* bramka czeka; wyjście z treningu przywraca bramkę', () => {
    const onRearm = vi.fn();
    renderAt('/workout/day-2', onRearm);
    expect(onRearm).not.toHaveBeenCalled();
    fireEvent.click(screen.getByText('leave'));
    expect(onRearm).toHaveBeenCalledTimes(1);
  });

  it('poza treningiem bramka wraca od razu', () => {
    const onRearm = vi.fn();
    renderAt('/history', onRearm);
    expect(onRearm).toHaveBeenCalledTimes(1);
  });
});
