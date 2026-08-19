import { beforeEach, describe, expect, it, vi } from 'vitest';

const native = vi.hoisted(() => ({
  listener: null as null | ((state: { isActive: boolean }) => void),
  remove: vi.fn(),
}));

vi.mock('@capacitor/core', () => ({
  Capacitor: { isNativePlatform: () => true },
}));

vi.mock('@capacitor/app', () => ({
  App: {
    addListener: vi.fn(async (_event: string, callback: (state: { isActive: boolean }) => void) => {
      native.listener = callback;
      return { remove: native.remove };
    }),
  },
}));

import { installResumeRepaint } from '@/lib/resume-repaint';

describe('resume-repaint native', () => {
  beforeEach(() => {
    native.listener = null;
    native.remove.mockClear();
    document.documentElement.style.transform = '';
  });

  it('reaguje na natywny appStateChange background→foreground i odpina listener', async () => {
    const frames: FrameRequestCallback[] = [];
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback) => {
      frames.push(callback);
      return frames.length;
    });

    const unsubscribe = installResumeRepaint();
    await vi.waitFor(() => expect(native.listener).not.toBeNull());
    native.listener?.({ isActive: false });
    expect(document.documentElement.style.transform).toBe('');
    native.listener?.({ isActive: true });
    expect(document.documentElement.style.transform).toBe('translateZ(0)');
    frames.shift()?.(0);
    frames.shift()?.(0);
    expect(document.documentElement.style.transform).toBe('');

    unsubscribe();
    expect(native.remove).toHaveBeenCalledOnce();
  });
});
