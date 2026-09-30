import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// OTA 2026-09-30: kanał `internal` przypisuje admin w karcie użytkownika (callable
// adminSetLiveUpdateChannel + audyt), nie ukryty gest na urządzeniu (Apple 2.3.1(a)).

const hostDoc = vi.hoisted(() => ({ user: undefined as Record<string, unknown> | undefined }));
const api = vi.hoisted(() => ({
  adminSetLiveUpdateChannel: vi.fn(async (_uid: string, channel: string) => ({ success: true, channel })),
  logAdminAction: vi.fn(async () => undefined),
}));

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
vi.mock('@/lib/admin-audit', () => ({ logAdminAction: api.logAdminAction }));
vi.mock('@/lib/registration-api', () => ({
  updateUserAccess: vi.fn(async () => {}),
  adminGrantSubscription: vi.fn(async () => {}),
  adminRevokeSubscription: vi.fn(async () => {}),
  adminSetLiveUpdateChannel: api.adminSetLiveUpdateChannel,
}));

import { LanguageProvider } from '@/contexts/LanguageContext';
import AdminUserDetail from '@/pages/admin/AdminUserDetail';

const renderHost = () => render(
  <LanguageProvider>
    <MemoryRouter initialEntries={['/admin/users/u1']}>
      <Routes>
        <Route path="/admin/users/:userId" element={<AdminUserDetail />} />
      </Routes>
    </MemoryRouter>
  </LanguageProvider>,
);

describe('AdminUserDetail: kanał aktualizacji OTA', () => {
  beforeEach(() => {
    api.adminSetLiveUpdateChannel.mockClear();
    api.logAdminAction.mockClear();
    hostDoc.user = { email: 'tester@example.com', displayName: 'Tester', role: 'user', status: 'active' };
  });

  it('przełącznik pokazuje produkcję domyślnie i przypisuje kanał testowy przez callable + audyt', async () => {
    renderHost();
    const toggle = await screen.findByRole('switch', { name: /kanał aktualizacji|update channel/i });
    expect(toggle.getAttribute('aria-checked')).toBe('false');
    fireEvent.click(toggle);
    await waitFor(() => expect(api.adminSetLiveUpdateChannel).toHaveBeenCalledWith('u1', 'internal'));
    await waitFor(() => expect(toggle.getAttribute('aria-checked')).toBe('true'));
    expect(api.logAdminAction).toHaveBeenCalledWith('admin-1', { action: 'liveUpdateChannel:internal', targetUid: 'u1' });
  });

  it('czyta przypisany kanał z users/{uid} i pozwala wrócić do produkcji', async () => {
    hostDoc.user = { ...hostDoc.user, liveUpdateChannel: 'internal' };
    renderHost();
    const toggle = await screen.findByRole('switch', { name: /kanał aktualizacji|update channel/i });
    expect(toggle.getAttribute('aria-checked')).toBe('true');
    fireEvent.click(toggle);
    await waitFor(() => expect(api.adminSetLiveUpdateChannel).toHaveBeenCalledWith('u1', 'production'));
  });
});
