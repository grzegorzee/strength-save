import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('Capacitor Keyboard — natywne tło klawiatury', () => {
  it('nie resizeuje globalnego layoutu i dopasowuje backdrop do tła aplikacji', () => {
    const config = readFileSync('capacitor.config.ts', 'utf8');

    expect(config).toMatch(/Keyboard:\s*\{[\s\S]*?resize:\s*['"]none['"]/);
    expect(config).toMatch(/Keyboard:\s*\{[\s\S]*?autoBackdropColor:\s*['"]dom['"]/);
  });
});
