import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { formatLocalDate } from '@/lib/utils';

// 2026-09-30: obsługa appUrlOpen (Universal Links / App Links / strengthsave://).
// Symulujemy event natywny: @capacitor/app trzyma go do pierwszego listenera
// (iOS AppPlugin.swift:55,63 retainUntilConsumed: true; Android
// AppPlugin.java:156 notifyListeners(..., true), zimny start przez
// BridgeActivity.java:51 onNewIntent(getIntent())).
// Niezmiennik: link z maila NIGDY nie wyrywa z trwającego treningu.

const native = vi.hoisted(() => ({
  isNative: true,
  listener: null as null | ((event: { url: string }) => void),
  removed: 0,
}));

vi.mock('@capacitor/core', () => ({
  Capacitor: { isNativePlatform: () => native.isNative },
}));
vi.mock('@capacitor/app', () => ({
  App: {
    addListener: vi.fn(async (_name: string, cb: (event: { url: string }) => void) => {
      native.listener = cb;
      return { remove: async () => { native.removed += 1; native.listener = null; } };
    }),
  },
}));
vi.mock('@/contexts/UserContext', () => ({ useCurrentUser: () => ({ uid: 'u1' }) }));
vi.mock('@/contexts/LanguageContext', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));

const toastSpy = vi.hoisted(() => vi.fn());
vi.mock('@/hooks/use-toast', () => ({ toast: toastSpy }));

const draftFixture = vi.hoisted(() => ({ draft: null as unknown }));
vi.mock('@/lib/workout-draft-db', () => ({
  workoutDraftDb: { loadActiveDraft: vi.fn(async () => draftFixture.draft) },
}));

import { App } from '@capacitor/app';
import { DeepLinkRouter } from '@/components/DeepLinkRouter';

const LocationProbe = () => {
  const location = useLocation();
  return <div data-testid="path">{location.pathname}</div>;
};

const renderApp = (initialPath = '/', enabled = true) =>
  render(
    <MemoryRouter initialEntries={[initialPath]}>
      <DeepLinkRouter enabled={enabled} />
      <LocationProbe />
      <Routes>
        <Route path="*" element={null} />
      </Routes>
    </MemoryRouter>,
  );

const flush = async () => {
  await act(async () => {
    await Promise.resolve();
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
};

const fire = async (url: string) => {
  await flush();
  expect(native.listener).not.toBeNull();
  await act(async () => {
    native.listener!({ url });
  });
  await flush();
};

const liveDraft = () => ({
  sessionId: 's1',
  userId: 'u1',
  dayId: 'day-1',
  date: formatLocalDate(new Date()),
  completedLocally: false,
  finalSyncPending: false,
  updatedAt: Date.now(),
});

beforeEach(() => {
  native.isNative = true;
  native.listener = null;
  native.removed = 0;
  draftFixture.draft = null;
  toastSpy.mockClear();
  vi.mocked(App.addListener).mockClear();
});

describe('DeepLinkRouter', () => {
  it('Universal Link z trasą z białej listy nawiguje do niej', async () => {
    renderApp('/');
    await fire('https://strengthsave.app/open?to=%2Fhistory');
    expect(screen.getByTestId('path').textContent).toBe('/history');
    expect(toastSpy).not.toHaveBeenCalled();
  });

  it('schemat strengthsave:// z intentu landingu też nawiguje', async () => {
    renderApp('/');
    await fire('strengthsave://open?to=%2Fprofile');
    expect(screen.getByTestId('path').textContent).toBe('/profile');
  });

  it('link bez celu tylko otwiera apkę: ekran zostaje', async () => {
    renderApp('/plan');
    await fire('https://strengthsave.app/open');
    expect(screen.getByTestId('path').textContent).toBe('/plan');
    expect(toastSpy).not.toHaveBeenCalled();
  });

  it('trasa spoza listy i obcy link są ignorowane', async () => {
    renderApp('/plan');
    await fire('https://strengthsave.app/open?to=/admin');
    await fire('https://evil.example/open?to=/history');
    expect(screen.getByTestId('path').textContent).toBe('/plan');
  });

  it('na ekranie treningu nie przełącza ekranu, pokazuje dyskretny toast', async () => {
    renderApp('/workout/day-1');
    await fire('https://strengthsave.app/open?to=%2Fhistory');
    expect(screen.getByTestId('path').textContent).toBe('/workout/day-1');
    expect(toastSpy).toHaveBeenCalledWith(expect.objectContaining({ title: 'deepLink.workoutInProgress' }));
  });

  it('w treningu próbnym przewodnika też nie przełącza ekranu', async () => {
    renderApp('/practice');
    await fire('https://strengthsave.app/open?to=%2Fhistory');
    expect(screen.getByTestId('path').textContent).toBe('/practice');
  });

  it('trening trwa (żywy draft dnia), user poza ekranem treningu: bez nawigacji (auto-resume wygrywa)', async () => {
    draftFixture.draft = liveDraft();
    renderApp('/');
    await fire('https://strengthsave.app/open?to=%2Fhistory');
    expect(screen.getByTestId('path').textContent).toBe('/');
    expect(toastSpy).toHaveBeenCalledWith(expect.objectContaining({ title: 'deepLink.workoutInProgress' }));
  });

  it('zakończony trening (draft completedLocally) nie blokuje linku', async () => {
    draftFixture.draft = { ...liveDraft(), completedLocally: true };
    renderApp('/');
    await fire('https://strengthsave.app/open?to=%2Fhistory');
    expect(screen.getByTestId('path').textContent).toBe('/history');
  });

  it('w onboardingu (enabled=false) event jest zużywany bez nawigacji', async () => {
    renderApp('/onboarding', false);
    await fire('https://strengthsave.app/open?to=%2Fhistory');
    expect(screen.getByTestId('path').textContent).toBe('/onboarding');
  });

  it('web: brak listenera natywnego', async () => {
    native.isNative = false;
    renderApp('/');
    await flush();
    expect(App.addListener).not.toHaveBeenCalled();
  });

  it('unmount zdejmuje listener', async () => {
    const view = renderApp('/');
    await flush();
    view.unmount();
    await flush();
    expect(native.removed).toBe(1);
  });
});
