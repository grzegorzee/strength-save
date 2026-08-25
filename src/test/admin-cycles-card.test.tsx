import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

// WP-7 (X33): sekcja "Cykle" w szczegole usera panelu admina. Fixtury cykli
// WYLACZNIE z kanonicznych stanow (zasada 11): aktywny cykl ma endDate '',
// `choice` z buildCycleChoice (kontrakt sekcji 3 planu X33).

// --- Mocki pod test hosta (AdminUserDetail: users/{uid} przez getDoc,
// plan_cycles przez getDocs; `collection` niesie nazwe, `query` ja przepuszcza). ---
const hostDoc = vi.hoisted(() => ({
  user: undefined as Record<string, unknown> | undefined,
  cycles: [] as Array<{ id: string; data: Record<string, unknown> }>,
  cyclesFail: false,
}));

vi.mock('firebase/firestore', () => ({
  doc: vi.fn((_db: unknown, col: string, id: string) => ({ col, id })),
  getDoc: vi.fn(async (ref: { col: string }) => (ref.col === 'users' && hostDoc.user
    ? { exists: () => true, data: () => hostDoc.user }
    : { exists: () => false, data: () => undefined })),
  getDocs: vi.fn(async (q: { name?: string } | undefined) => {
    if (q?.name !== 'plan_cycles') return { empty: true, docs: [] };
    if (hostDoc.cyclesFail) throw new Error('index building');
    return {
      empty: hostDoc.cycles.length === 0,
      docs: hostDoc.cycles.map((c) => ({
        id: c.id,
        data: () => c.data,
        get: (field: string) => c.data[field],
      })),
    };
  }),
  updateDoc: vi.fn(async () => {}),
  addDoc: vi.fn(async () => ({})),
  collection: vi.fn((_db: unknown, name: string) => ({ name })),
  query: vi.fn((ref: unknown) => ref),
  where: vi.fn(),
  orderBy: vi.fn(),
  limit: vi.fn(),
  startAfter: vi.fn(),
  Timestamp: class {},
}));
vi.mock('@/lib/firebase', () => ({ db: {}, functions: {} }));
vi.mock('firebase/functions', () => ({ httpsCallable: vi.fn(() => async () => ({ data: {} })) }));
vi.mock('@/contexts/UserContext', () => ({ useCurrentUser: () => ({ uid: 'admin-1' }) }));
vi.mock('@/lib/registration-api', () => ({
  updateUserAccess: vi.fn(async () => {}),
  adminGrantSubscription: vi.fn(async () => {}),
  adminRevokeSubscription: vi.fn(async () => {}),
}));

import { LanguageProvider } from '@/contexts/LanguageContext';
import { AdminCyclesCard, parseCycleChoice } from '@/pages/admin/AdminCyclesCard';
import AdminUserDetail from '@/pages/admin/AdminUserDetail';
import { buildCanonicalState, buildCycleChoice } from '@/test/canonical-states';
import type { PlanCycle } from '@/types/cycles';

const TODAY = '2026-08-25';

const stripId = <T extends { id: string }>(doc: T): Omit<T, 'id'> => {
  const { id: _id, ...rest } = doc;
  return rest;
};

/** Dwa cykle z kanonicznego stanu: aktywny (endDate '') dostaje choice, zamkniety nie. */
const twoCycles = (): { active: PlanCycle; past: PlanCycle } => {
  const state = buildCanonicalState('history-multi-cycle', TODAY);
  const active = state.cycles.find((c) => c.status === 'active')!;
  const past = state.cycles.find((c) => c.status === 'completed')!;
  const choice = buildCycleChoice(active.startDate, active.days, {
    planSource: 'browsed',
    recommendedTemplateId: 'tpl-upper-lower-4',
    planName: 'Jesienny fundament',
    entry: 'replan',
  });
  return { active: { ...active, choice }, past };
};

const renderCard = (cycles: PlanCycle[]) => render(
  <LanguageProvider>
    <AdminCyclesCard cycles={cycles} />
  </LanguageProvider>,
);

beforeEach(() => {
  localStorage.clear();
  localStorage.setItem('app-language', 'pl');
  hostDoc.user = undefined;
  hostDoc.cycles = [];
  hostDoc.cyclesFail = false;
});

describe('parseCycleChoice (kontrakt plan_cycles.choice, sekcja 3 X33)', () => {
  it('pelny dokument przechodzi 1:1, pola opcjonalne bez wartosci nie powstaja', () => {
    const { active } = twoCycles();
    expect(parseCycleChoice(active.choice)).toEqual(active.choice);
    const minimal = buildCycleChoice(active.startDate, active.days, { planSource: 'custom' });
    delete minimal.templateId;
    delete minimal.recommendedTemplateId;
    const parsed = parseCycleChoice({ ...minimal, planName: '' });
    expect(parsed).toEqual(minimal);
    expect(parsed).not.toHaveProperty('planName');
    expect(parsed).not.toHaveProperty('templateId');
  });

  it('smieci / brak pola / zle enumy = null (cykl bez choice jest poprawny)', () => {
    const { active } = twoCycles();
    expect(parseCycleChoice(undefined)).toBeNull();
    expect(parseCycleChoice(null)).toBeNull();
    expect(parseCycleChoice('garbage')).toBeNull();
    expect(parseCycleChoice({})).toBeNull();
    expect(parseCycleChoice({ ...active.choice, version: 2 })).toBeNull();
    expect(parseCycleChoice({ ...active.choice, planSource: 'magic' })).toBeNull();
    expect(parseCycleChoice({ ...active.choice, entry: 'import' })).toBeNull();
    expect(parseCycleChoice({ ...active.choice, level: 'pro' })).toBeNull();
    expect(parseCycleChoice({ ...active.choice, objective: 'flex' })).toBeNull();
    expect(parseCycleChoice({ ...active.choice, trainingDays: 'monday' })).toBeNull();
  });

  it('nieznane dni tygodnia odpadaja po cichu, reszta zostaje', () => {
    const { active } = twoCycles();
    const parsed = parseCycleChoice({ ...active.choice, trainingDays: ['monday', 'funday'] });
    expect(parsed?.trainingDays).toEqual(['monday']);
  });
});

describe('AdminCyclesCard: lista cykli', () => {
  it('sortuje po startDate malejaco, aktywny cykl z endDate "" ma etykiete "w toku"', () => {
    const { active, past } = twoCycles();
    renderCard([past, active]);

    const rows = screen.getAllByTestId('admin-cycle-row');
    expect(rows).toHaveLength(2);
    // Aktywny (nowszy start) pierwszy.
    expect(within(rows[0]).getByText('Aktywny')).toBeTruthy();
    expect(within(rows[0]).getByText(/w toku/)).toBeTruthy();
    expect(within(rows[0]).getByText('Jesienny fundament')).toBeTruthy();
    // Zamkniety: pelny zakres dat, status ukonczony, brak nazwy z choice.
    expect(within(rows[1]).getByText('Ukończony')).toBeTruthy();
    expect(within(rows[1]).queryByText(/w toku/)).toBeNull();
    expect(within(rows[1]).getByText('Bez nazwy')).toBeTruthy();
    // Meta: dni tygodnia, dlugosc, frekwencja, treningi.
    expect(within(rows[1]).getByText(`${past.durationWeeks} tyg.`)).toBeTruthy();
    expect(within(rows[1]).getByText(/80%/)).toBeTruthy();
    expect(within(rows[1]).getByText(/Treningów: 8/)).toBeTruthy();
    expect(within(rows[0]).getByText(/Treningów: 0/)).toBeTruthy();
  });

  it('nazwa planu: planName > szablon > plan wlasny', () => {
    const { active } = twoCycles();
    const fromTemplate: PlanCycle = {
      ...active,
      choice: buildCycleChoice(active.startDate, active.days),
    };
    const custom: PlanCycle = {
      ...active,
      id: 'cycle-custom',
      startDate: '2026-01-05',
      choice: buildCycleChoice('2026-01-05', active.days, {
        planSource: 'custom',
        templateId: undefined,
        recommendedTemplateId: undefined,
      }),
    };
    renderCard([fromTemplate, custom]);
    const rows = screen.getAllByTestId('admin-cycle-row');
    expect(within(rows[0]).getByText('Żelazny Fundament')).toBeTruthy();
    expect(within(rows[1]).getByText('Plan własny')).toBeTruthy();
  });

  it('rozwiniecie pokazuje odpowiedzi z kreatora albo komunikat o braku choice', () => {
    const { active, past } = twoCycles();
    renderCard([active, past]);
    const toggles = screen.getAllByRole('button', { name: 'Odpowiedzi z kreatora' });
    expect(toggles).toHaveLength(2);
    expect(toggles[0].getAttribute('aria-expanded')).toBe('false');

    fireEvent.click(toggles[0]);
    expect(toggles[0].getAttribute('aria-expanded')).toBe('true');
    expect(screen.getByText('Średnio zaawansowany')).toBeTruthy();
    expect(screen.getByText('Budowa masy')).toBeTruthy();
    expect(screen.getByText(/2 dni\/tydz/)).toBeTruthy();
    expect(screen.getByText('Wybrany z listy planów')).toBeTruthy();
    expect(screen.getByText('Żelazny Fundament')).toBeTruthy();
    expect(screen.getByText(/Góra \/ Dół/)).toBeTruthy();
    expect(screen.getByText('Nowy plan (replan)')).toBeTruthy();
    expect(screen.getByText(/Wybrano:/)).toBeTruthy();

    fireEvent.click(toggles[1]);
    expect(screen.getByText(/Ten cykl powstał przed zapisem odpowiedzi/)).toBeTruthy();

    fireEvent.click(toggles[0]);
    expect(toggles[0].getAttribute('aria-expanded')).toBe('false');
    expect(screen.queryByText('Średnio zaawansowany')).toBeNull();
  });

  it('brak cykli = pusty stan, bez crasha', () => {
    renderCard([]);
    expect(screen.getByText('Brak cykli.')).toBeTruthy();
  });
});

describe('AdminUserDetail: host laduje plan_cycles i przekazuje do karty', () => {
  const renderHost = () => render(
    <LanguageProvider>
      <MemoryRouter initialEntries={['/admin/users/u1']}>
        <Routes>
          <Route path="/admin/users/:userId" element={<AdminUserDetail />} />
        </Routes>
      </MemoryRouter>
    </LanguageProvider>,
  );

  const baseUser = () => ({
    email: 'robert@example.com',
    displayName: 'Robert',
    role: 'user',
    status: 'active',
  });

  it('sekcja Cykle z dwoma cyklami (choice z surowego dokumentu), reszta szczegolu bez zmian', async () => {
    const { active, past } = twoCycles();
    hostDoc.user = baseUser();
    hostDoc.cycles = [
      { id: past.id, data: stripId(past) as Record<string, unknown> },
      { id: active.id, data: stripId(active) as Record<string, unknown> },
    ];
    renderHost();
    expect(await screen.findByText('Cykle')).toBeTruthy();
    const rows = screen.getAllByTestId('admin-cycle-row');
    expect(rows).toHaveLength(2);
    expect(within(rows[0]).getByText('Jesienny fundament')).toBeTruthy();
    expect(within(rows[0]).getByText(/w toku/)).toBeTruthy();
    // Niezmiennik: dotychczasowe sekcje zostaja.
    expect(screen.getByText('Onboarding')).toBeTruthy();
    expect(screen.getByText('Uprawnienia')).toBeTruthy();
  });

  it('blad zapytania plan_cycles = pusta lista, widok nadal sie renderuje', async () => {
    hostDoc.user = baseUser();
    hostDoc.cyclesFail = true;
    renderHost();
    expect(await screen.findByText('Cykle')).toBeTruthy();
    expect(screen.getByText('Brak cykli.')).toBeTruthy();
    expect(screen.getByText('Uprawnienia')).toBeTruthy();
  });
});
