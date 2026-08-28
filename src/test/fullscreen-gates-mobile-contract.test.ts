import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const source = (path: string) => readFileSync(resolve(process.cwd(), 'src', path), 'utf8');

describe('pełnoekranowe bramki na mobile', () => {
  it.each([
    ['components/ConsentGate.tsx'],
    ['components/EmailVerificationGate.tsx'],
    ['pages/Login.tsx'],
    ['components/AuthenticatedApp.tsx'],
    ['components/ErrorBoundary.tsx'],
  ])('%s zachowuje przewijanie i pionowe safe-area', (path) => {
    const content = source(path);
    expect(content).toContain('min-h-[100dvh]');
    expect(content).toContain('overflow-y-auto');
    expect(content).toContain('safe-area-inset-top');
    expect(content).toContain('safe-area-inset-bottom');
  });

  it('toast nie wchodzi pod Dynamic Island', () => {
    const content = source('components/ui/toast.tsx');
    expect(content).toContain('safe-area-inset-top');
    expect(content).toContain('safe-area-inset-left');
    expect(content).toContain('safe-area-inset-right');
  });
});
