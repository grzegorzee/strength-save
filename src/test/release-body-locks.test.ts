import { afterEach, describe, expect, it } from 'vitest';
import {
  RADIX_OVERLAY_EXIT_WATCHDOG_MS,
  releaseBodyLocks,
  releaseBodyLocksAfterOverlayUnmount,
} from '@/lib/release-body-locks';

afterEach(() => {
  document.querySelectorAll('[data-app-overlay], [role="dialog"], [role="alertdialog"]')
    .forEach((element) => element.remove());
  document.body.style.pointerEvents = '';
  document.body.style.overflow = '';
  document.body.removeAttribute('data-scroll-locked');
});

describe('releaseBodyLocks', () => {
  it('zdejmuje pointer-events/overflow i atrybut scroll-lock Radixa', () => {
    document.body.style.pointerEvents = 'none';
    document.body.style.overflow = 'hidden';
    document.body.setAttribute('data-scroll-locked', '1');
    releaseBodyLocks();
    expect(document.body.style.pointerEvents).toBe('');
    expect(document.body.style.overflow).toBe('');
    expect(document.body.hasAttribute('data-scroll-locked')).toBe(false);
  });

  it('jest idempotentny na czystym body', () => {
    expect(() => {
      releaseBodyLocks();
      releaseBodyLocks();
    }).not.toThrow();
  });

  it('dezaktywuje osierocony overlay Radixa i lock po awaryjnym unmountcie', async () => {
    const orphan = document.createElement('div');
    orphan.setAttribute('data-app-overlay', '');
    orphan.setAttribute('data-radix-overlay', '');
    orphan.setAttribute('data-state', 'open');
    document.body.appendChild(orphan);
    document.body.style.pointerEvents = 'none';
    document.body.style.overflow = 'hidden';
    document.body.setAttribute('data-scroll-locked', '1');

    releaseBodyLocksAfterOverlayUnmount();
    await new Promise((resolve) => window.setTimeout(resolve, 20));

    expect(orphan.hidden).toBe(true);
    expect(orphan.style.pointerEvents).toBe('none');
    expect(document.body.style.pointerEvents).toBe('');
    expect(document.body.style.overflow).toBe('');
    expect(document.body.hasAttribute('data-scroll-locked')).toBe(false);
  });

  it('ukrywa czarny orphan data-state=closed po zawieszonej animacji WKWebView', async () => {
    const orphan = document.createElement('div');
    orphan.setAttribute('data-app-overlay', '');
    orphan.setAttribute('data-radix-overlay', '');
    orphan.setAttribute('data-state', 'closed');
    const orphanContent = document.createElement('div');
    orphanContent.setAttribute('role', 'dialog');
    orphanContent.setAttribute('data-state', 'closed');
    document.body.append(orphan, orphanContent);
    document.body.style.pointerEvents = 'none';
    document.body.style.overflow = 'hidden';
    document.body.setAttribute('data-scroll-locked', '1');

    releaseBodyLocksAfterOverlayUnmount();
    await new Promise((resolve) => window.setTimeout(resolve, RADIX_OVERLAY_EXIT_WATCHDOG_MS + 20));

    expect(orphan.hidden).toBe(true);
    // Content należy do React/Radix i może zostać ponownie użyty przy szybkim reopen.
    expect(orphanContent.hidden).toBe(false);
    expect(orphanContent.style.pointerEvents).toBe('');
    expect(document.body.style.pointerEvents).toBe('');
    expect(document.body.style.overflow).toBe('');
    expect(document.body.hasAttribute('data-scroll-locked')).toBe(false);
  });

  it('nie odbiera Reactowi własności portalu podczas watchdog cleanupu', async () => {
    const portal = document.createElement('div');
    const overlay = document.createElement('div');
    overlay.setAttribute('data-app-overlay', '');
    overlay.setAttribute('data-radix-overlay', '');
    overlay.setAttribute('data-state', 'closed');
    const content = document.createElement('div');
    content.setAttribute('role', 'dialog');
    content.setAttribute('data-state', 'closed');
    portal.append(overlay, content);
    document.body.appendChild(portal);

    releaseBodyLocksAfterOverlayUnmount();
    await new Promise((resolve) => window.setTimeout(resolve, RADIX_OVERLAY_EXIT_WATCHDOG_MS + 20));

    // React/Presence nadal musi móc wykonać własny removeChild bez NotFoundError.
    expect(() => portal.removeChild(overlay)).not.toThrow();
    expect(() => portal.removeChild(content)).not.toThrow();
  });

  it('nie zostawia hidden ani inline pointer-events po ponownym użyciu contentu', async () => {
    const content = document.createElement('div');
    content.setAttribute('role', 'dialog');
    content.setAttribute('data-state', 'closed');
    document.body.appendChild(content);

    releaseBodyLocksAfterOverlayUnmount();
    await new Promise((resolve) => window.setTimeout(resolve, RADIX_OVERLAY_EXIT_WATCHDOG_MS + 20));
    content.setAttribute('data-state', 'open');

    expect(content.hidden).toBe(false);
    expect(content.style.pointerEvents).toBe('');
    expect(content.hasAttribute('aria-hidden')).toBe(false);
  });

  it('nie zdejmuje locka ani overlaya należącego do nowo otwartego dialogu', async () => {
    const overlay = document.createElement('div');
    overlay.setAttribute('data-app-overlay', '');
    overlay.setAttribute('data-radix-overlay', '');
    overlay.setAttribute('data-state', 'open');
    const content = document.createElement('div');
    content.setAttribute('role', 'dialog');
    content.setAttribute('data-state', 'open');
    document.body.append(overlay, content);
    document.body.style.pointerEvents = 'none';
    document.body.style.overflow = 'hidden';
    document.body.setAttribute('data-scroll-locked', '1');

    releaseBodyLocksAfterOverlayUnmount();
    await new Promise((resolve) => window.setTimeout(resolve, RADIX_OVERLAY_EXIT_WATCHDOG_MS + 20));

    expect(document.body.contains(overlay)).toBe(true);
    expect(document.body.style.pointerEvents).toBe('none');
    expect(document.body.style.overflow).toBe('hidden');
    expect(document.body.hasAttribute('data-scroll-locked')).toBe(true);
  });
});
