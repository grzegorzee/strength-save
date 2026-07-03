import { describe, it, expect } from 'vitest';
import { resolveWriteAttempt } from '@/lib/workout-write-attempt';

describe('resolveWriteAttempt', () => {
  it('zgodna rewizja = ok', () => {
    expect(resolveWriteAttempt({ revision: 3, lastWriteId: 'a' }, 3, 'b')).toBe('ok');
  });
  it('null = świadome pominięcie preconditionu', () => {
    expect(resolveWriteAttempt({ revision: 9 }, null, 'b')).toBe('ok');
  });
  it('lost-ack retry = already-applied', () => {
    expect(resolveWriteAttempt({ revision: 4, lastWriteId: 'b' }, 3, 'b')).toBe('already-applied');
  });
  it('realny konflikt = conflict', () => {
    expect(resolveWriteAttempt({ revision: 4, lastWriteId: 'a' }, 3, 'b')).toBe('conflict');
  });
  it('stary dokument bez lastWriteId przy niezgodnej rewizji = conflict', () => {
    expect(resolveWriteAttempt({ revision: 4 }, 3, 'b')).toBe('conflict');
  });
});
