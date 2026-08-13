import { afterEach, describe, expect, it, vi } from 'vitest';
import { forceRepaint, installResumeRepaint } from '@/lib/resume-repaint';

describe('resume-repaint (czarne kafle WKWebView po powrocie z tła)', () => {
  afterEach(() => {
    document.documentElement.style.transform = '';
    vi.restoreAllMocks();
  });

  it('forceRepaint przełącza transform na <html> i zdejmuje go po dwóch klatkach', () => {
    const frames: FrameRequestCallback[] = [];
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((cb) => {
      frames.push(cb);
      return frames.length;
    });

    forceRepaint();
    expect(document.documentElement.style.transform).toBe('translateZ(0)');

    // dwie klatki: rAF w rAF
    frames.shift()?.(0);
    frames.shift()?.(0);
    expect(document.documentElement.style.transform).toBe('');
  });

  it('installResumeRepaint reaguje na powrót do aktywności (web: visibilitychange)', () => {
    const frames: FrameRequestCallback[] = [];
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((cb) => {
      frames.push(cb);
      return frames.length;
    });
    Object.defineProperty(document, 'hidden', { configurable: true, value: false });

    const remove = installResumeRepaint();
    document.dispatchEvent(new Event('visibilitychange'));
    expect(document.documentElement.style.transform).toBe('translateZ(0)');

    frames.shift()?.(0);
    frames.shift()?.(0);
    remove();
  });
});
