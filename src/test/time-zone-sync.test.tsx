// Bug 11 (X30): klient zapisuje strefę IANA urządzenia do users/{uid}.timeZone,
// żeby poranny push i digest wychodziły o porze i z dniem odbiorcy, nie serwera.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, waitFor } from '@testing-library/react';

const updateDoc = vi.hoisted(() => vi.fn(async () => {}));
vi.mock('firebase/firestore', () => ({ doc: vi.fn(() => ({})), updateDoc }));
vi.mock('@/lib/firebase', () => ({ db: {} }));

const mockUser = vi.hoisted(() => ({ uid: 'u1', profile: null as Record<string, unknown> | null }));
vi.mock('@/contexts/UserContext', () => ({
  useCurrentUser: () => ({ uid: mockUser.uid, profile: mockUser.profile }),
}));

import { TimeZoneSync } from '@/components/TimeZoneSync';
import { readDeviceTimeZone } from '@/lib/device-time-zone';

const resolvedOptions = vi.spyOn(Intl.DateTimeFormat.prototype, 'resolvedOptions');

beforeEach(() => {
  vi.clearAllMocks();
  resolvedOptions.mockReturnValue({ timeZone: 'America/Los_Angeles' } as Intl.ResolvedDateTimeFormatOptions);
  mockUser.uid = 'u1';
  mockUser.profile = { uid: 'u1' };
});
afterEach(() => {
  resolvedOptions.mockReset();
});

describe('TimeZoneSync (bug 11, X30)', () => {
  it('profil bez strefy: zapisuje strefę urządzenia do users/{uid}.timeZone', async () => {
    render(<TimeZoneSync />);
    await waitFor(() => expect(updateDoc).toHaveBeenCalledWith(expect.anything(), { timeZone: 'America/Los_Angeles' }));
    expect(updateDoc).toHaveBeenCalledTimes(1);
  });

  it('strefa w profilu inna niż urządzenia (podróż): nadpisuje', async () => {
    mockUser.profile = { uid: 'u1', timeZone: 'Europe/Warsaw' };
    render(<TimeZoneSync />);
    await waitFor(() => expect(updateDoc).toHaveBeenCalledWith(expect.anything(), { timeZone: 'America/Los_Angeles' }));
  });

  it('strefa zgodna: zero zapisów (bez pustych write per sesja)', async () => {
    mockUser.profile = { uid: 'u1', timeZone: 'America/Los_Angeles' };
    render(<TimeZoneSync />);
    await Promise.resolve();
    expect(updateDoc).not.toHaveBeenCalled();
  });

  it('profil jeszcze nie załadowany: czeka (brak zapisu na ślepo)', async () => {
    mockUser.profile = null;
    render(<TimeZoneSync />);
    await Promise.resolve();
    expect(updateDoc).not.toHaveBeenCalled();
  });

  it('błąd zapisu (offline) jest cichy', async () => {
    updateDoc.mockRejectedValueOnce(new Error('offline'));
    render(<TimeZoneSync />);
    await waitFor(() => expect(updateDoc).toHaveBeenCalled());
    await Promise.resolve();
  });
});

describe('readDeviceTimeZone', () => {
  it('Intl bez strefy (stare WebView) = null, bez wyjątku', () => {
    resolvedOptions.mockReturnValue({} as Intl.ResolvedDateTimeFormatOptions);
    expect(readDeviceTimeZone()).toBeNull();
  });
});
