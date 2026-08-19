import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('Firestore cache after a native force quit', () => {
  it('does not use an exclusive single-tab owner that can survive in the old WebView renderer', () => {
    const source = readFileSync('src/lib/firebase.ts', 'utf8');

    expect(source).toContain('persistentMultipleTabManager()');
    expect(source).not.toContain('persistentSingleTabManager');
  });
});
