import { describe, expect, it } from 'vitest';
import { releaseBodyLocks } from '@/lib/release-body-locks';

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
});
