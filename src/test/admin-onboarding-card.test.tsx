import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

// WP-A (X30): karta Onboarding w szczegole usera panelu admina. Fixture
// onboardingAnswers = DOKLADNIE kontrakt v2 z pakietu P11 (zapis w
// Onboarding.tsx markOnboardingComplete); NIE zmieniac ksztaltu bez P11.

// --- Mocki pod test hosta (AdminUserDetail laduje users/{uid} przez getDoc) ---
const hostDoc = vi.hoisted(() => ({ user: undefined as Record<string, unknown> | undefined }));

vi.mock('firebase/firestore', () => ({
  doc: vi.fn((_db: unknown, col: string, id: string) => ({ col, id })),
  getDoc: vi.fn(async (ref: { col: string }) => (ref.col === 'users' && hostDoc.user
    ? { exists: () => true, data: () => hostDoc.user }
    : { exists: () => false, data: () => undefined })),
  getDocs: vi.fn(async () => ({ empty: true, docs: [] })),
  updateDoc: vi.fn(async () => {}),
  addDoc: vi.fn(async () => ({})),
  collection: vi.fn(),
  query: vi.fn(),
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
import {
  AdminOnboardingCard,
  mapOnboardingAnswers,
  type AdminOnboardingAnswers,
  type AdminOnboardingFallback,
} from '@/pages/admin/AdminOnboardingCard';
import AdminUserDetail from '@/pages/admin/AdminUserDetail';

// Kontrakt P11 v2 (spec P11-onboarding-answers.md, zakres pkt 1).
const rawAnswersV2 = () => ({
  version: 2,
  completedAt: '2026-08-25T10:00:00.000Z',
  name: 'Robert',
  accentColor: 'sky',
  level: 'intermediate',
  objective: 'build_muscle',
  daysPerWeek: 4,
  trainingDays: ['monday', 'tuesday', 'thursday', 'friday'],
  planSource: 'browsed',
  templateId: 'tpl-upper-lower-4',
  recommendedTemplateId: 'tpl-split-5',
  durationWeeks: 8,
  startDate: '2026-08-31',
  planName: 'Moj plan na jesien',
});

const emptyFallback: AdminOnboardingFallback = {
  trainingProfile: null,
  accentColor: null,
  onboardingState: null,
  onboardingVersion: null,
};

const renderCard = (
  answers: AdminOnboardingAnswers | null,
  fallback: AdminOnboardingFallback = emptyFallback,
) => render(
  <LanguageProvider>
    <AdminOnboardingCard answers={answers} fallback={fallback} />
  </LanguageProvider>,
);

beforeEach(() => {
  localStorage.clear();
  localStorage.setItem('app-language', 'pl');
  hostDoc.user = undefined;
});

describe('mapOnboardingAnswers (kontrakt P11 v2)', () => {
  it('parsuje pelny dokument v2 bez utraty pol', () => {
    const parsed = mapOnboardingAnswers(rawAnswersV2());
    expect(parsed).toEqual({
      version: 2,
      completedAt: '2026-08-25T10:00:00.000Z',
      name: 'Robert',
      accentColor: 'sky',
      level: 'intermediate',
      objective: 'build_muscle',
      daysPerWeek: 4,
      trainingDays: ['monday', 'tuesday', 'thursday', 'friday'],
      planSource: 'browsed',
      templateId: 'tpl-upper-lower-4',
      recommendedTemplateId: 'tpl-split-5',
      durationWeeks: 8,
      startDate: '2026-08-31',
      planName: 'Moj plan na jesien',
    });
  });

  it('brak pola / smieciowe dane = null (stare konta bez onboardingAnswers)', () => {
    expect(mapOnboardingAnswers(undefined)).toBeNull();
    expect(mapOnboardingAnswers(null)).toBeNull();
    expect(mapOnboardingAnswers('garbage')).toBeNull();
    expect(mapOnboardingAnswers({})).toBeNull();
  });

  it('pola opcjonalne moga nie istniec, zle typy degraduja bezpiecznie', () => {
    const parsed = mapOnboardingAnswers({
      version: 2,
      completedAt: '2026-08-25T10:00:00.000Z',
      accentColor: 'lime',
      level: 'beginner',
      objective: 'fat_loss',
      daysPerWeek: 3,
      trainingDays: 'not-an-array',
      planSource: 'custom',
      durationWeeks: 6,
      startDate: '2026-09-07',
    });
    expect(parsed).not.toBeNull();
    expect(parsed?.name).toBeUndefined();
    expect(parsed?.templateId).toBeUndefined();
    expect(parsed?.recommendedTemplateId).toBeUndefined();
    expect(parsed?.planName).toBeUndefined();
    expect(parsed?.trainingDays).toEqual([]);
  });
});

describe('AdminOnboardingCard: pelne odpowiedzi krok po kroku', () => {
  it('renderuje kroki 1-5 z etykietami i18n i wartosciami odpowiedzi', () => {
    renderCard(mapOnboardingAnswers(rawAnswersV2()));

    // Krok 1: imie + kolor motywu.
    expect(screen.getByText('Imię i kolor')).toBeTruthy();
    expect(screen.getByText('Robert')).toBeTruthy();
    expect(screen.getByText(/Błękit/)).toBeTruthy();

    // Krok 2-3: poziom i cel przez klucze onboardingu.
    expect(screen.getByText('Poziom')).toBeTruthy();
    expect(screen.getByText('Średnio zaawansowany')).toBeTruthy();
    expect(screen.getByText('Cel')).toBeTruthy();
    expect(screen.getByText('Budowa masy')).toBeTruthy();

    // Krok 4: dni/tydzien + konkretne dni tygodnia.
    expect(screen.getByText('Dni treningowe')).toBeTruthy();
    expect(screen.getByText(/4 dni\/tydz/)).toBeTruthy();
    expect(screen.getByText(/Pn · Wt · Cz · Pt/)).toBeTruthy();

    // Krok 5: zrodlo, szablon wybrany vs rekomendowany, dlugosc, start, nazwa.
    expect(screen.getByText('Źródło planu')).toBeTruthy();
    expect(screen.getByText('Wybrany z listy planów')).toBeTruthy();
    expect(screen.getByText('Szablon')).toBeTruthy();
    expect(screen.getByText(/Góra \/ Dół/)).toBeTruthy();
    expect(screen.getByText('Rekomendowany szablon')).toBeTruthy();
    expect(screen.getByText('Split Hipertroficzny')).toBeTruthy();
    expect(screen.getByText(/8 tyg\./)).toBeTruthy();
    expect(screen.getByText('Data startu')).toBeTruthy();
    expect(screen.getByText('2026-08-31')).toBeTruthy();
    expect(screen.getByText('Nazwa planu')).toBeTruthy();
    expect(screen.getByText('Moj plan na jesien')).toBeTruthy();

    // Metadane ukonczenia.
    expect(screen.getByText(/Ukończony:/)).toBeTruthy();
  });
});

describe('AdminOnboardingCard: fallback starych kont', () => {
  it('bez onboardingAnswers pokazuje dane profilu + komunikat o wersji', () => {
    renderCard(null, {
      trainingProfile: { level: 'beginner', objective: 'fat_loss', daysPerWeek: 3 },
      accentColor: 'lime',
      onboardingState: 'completed',
      onboardingVersion: 2,
    });
    expect(screen.getByText(/onboarding przed wersją/)).toBeTruthy();
    expect(screen.getByText('Początkujący')).toBeTruthy();
    expect(screen.getByText('Redukcja')).toBeTruthy();
    expect(screen.getByText(/3 dni\/tydz/)).toBeTruthy();
    expect(screen.getByText(/Limonka/)).toBeTruthy();
    expect(screen.getByText(/completed/)).toBeTruthy();
  });

  it('konto bez zadnych danych onboardingu = pusty stan, bez crasha', () => {
    renderCard(null);
    expect(screen.getByText('Brak danych onboardingu.')).toBeTruthy();
  });
});

describe('AdminUserDetail: host przekazuje onboardingAnswers do karty', () => {
  const renderHost = () => render(
    <LanguageProvider>
      <MemoryRouter initialEntries={['/admin/users/u1']}>
        <Routes>
          <Route path="/admin/users/:userId" element={<AdminUserDetail />} />
        </Routes>
      </MemoryRouter>
    </LanguageProvider>,
  );

  it('sekcja Onboarding widoczna z odpowiedziami z users/{uid}', async () => {
    hostDoc.user = {
      email: 'robert@example.com',
      displayName: 'Robert',
      role: 'user',
      status: 'active',
      onboardingAnswers: rawAnswersV2(),
    };
    renderHost();
    expect(await screen.findByText('Onboarding')).toBeTruthy();
    expect(screen.getByText('Średnio zaawansowany')).toBeTruthy();
    expect(screen.getByText('Budowa masy')).toBeTruthy();
    // Niezmiennik starego przeplywu: dotychczasowe sekcje szczegolu zostaja.
    expect(screen.getByText('Uprawnienia')).toBeTruthy();
    expect(screen.getByText('Brak planu')).toBeTruthy();
  });

  it('stare konto bez onboardingAnswers: karta w trybie fallback, reszta szczegolu bez zmian', async () => {
    hostDoc.user = {
      email: 'stary@example.com',
      displayName: 'Stary',
      role: 'user',
      status: 'active',
      trainingProfile: { level: 'advanced', objective: 'peak_strength', daysPerWeek: 5 },
      preferences: { accentColor: 'rose' },
      onboarding: { state: 'completed', version: 2 },
    };
    renderHost();
    expect(await screen.findByText('Onboarding')).toBeTruthy();
    expect(screen.getByText(/onboarding przed wersją/)).toBeTruthy();
    expect(screen.getByText('Zaawansowany')).toBeTruthy();
    expect(screen.getByText('Maksymalna siła')).toBeTruthy();
    expect(screen.getByText(/Róż/)).toBeTruthy();
    expect(screen.getByText('Uprawnienia')).toBeTruthy();
  });
});
