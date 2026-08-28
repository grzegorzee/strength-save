import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const SOURCE_ROOT = 'src';
const FORBIDDEN_MICROTEXT = /text-\[(?:8|8\.5|9|9\.5|10|10\.5)px\]/;
const FORBIDDEN_INLINE_MICROTEXT = /(?:fontSize\s*:\s*(?:8|8\.5|9|9\.5|10|10\.5)(?![\d.])|font-size\s*:\s*(?:8|8\.5|9|9\.5|10|10\.5)px)/i;
const MUTED_OPACITY_BELOW_FULL = String.raw`(?:[1-9]|[1-9]\d)(?!\d)`;
const LOW_CONTRAST_SMALL_TEXT = new RegExp(
  String.raw`(?:text-\[11px\][^"'\x60\n]*text-muted-foreground\/${MUTED_OPACITY_BELOW_FULL}|text-muted-foreground\/${MUTED_OPACITY_BELOW_FULL}[^"'\x60\n]*text-\[11px\])`,
);

function productionSources(directory: string): string[] {
  return readdirSync(directory).flatMap((entry) => {
    const path = join(directory, entry);
    if (statSync(path).isDirectory()) {
      return entry === 'test' ? [] : productionSources(path);
    }

    return /\.(?:ts|tsx)$/.test(entry) && !/\.(?:test|spec)\.(?:ts|tsx)$/.test(entry)
      ? [path]
      : [];
  });
}

describe('globalny kontrakt czytelności typografii release', () => {
  it('żaden tekst produkcyjny nie schodzi poniżej 11 px', () => {
    const violations = productionSources(SOURCE_ROOT).flatMap((path) => {
      const lines = readFileSync(path, 'utf8').split('\n');
      return lines.flatMap((line, index) => (
        FORBIDDEN_MICROTEXT.test(line) ? [`${path}:${index + 1}`] : []
      ));
    });

    expect(violations).toEqual([]);
  });

  it('wspólne klasy CSS także nie schodzą poniżej 11 px', () => {
    const css = readFileSync(join(SOURCE_ROOT, 'index.css'), 'utf8');
    const declarations = [...css.matchAll(/font-size:\s*([0-9.]+)(px|rem)/g)];
    const violations = declarations
      .map((match) => ({
        declaration: match[0],
        pixels: Number(match[1]) * (match[2] === 'rem' ? 16 : 1),
      }))
      .filter(({ pixels }) => pixels < 11);

    expect(violations).toEqual([]);
  });

  it('etykiety SVG, wykresów i generowanego HTML nie schodzą poniżej 11 px', () => {
    const violations = productionSources(SOURCE_ROOT).flatMap((path) => {
      const lines = readFileSync(path, 'utf8').split('\n');
      return lines.flatMap((line, index) => (
        FORBIDDEN_INLINE_MICROTEXT.test(line) ? [`${path}:${index + 1}`] : []
      ));
    });

    expect(violations).toEqual([]);
  });

  it('tekst 11 px nie przygasza neutralnego koloru poniżej kontrastu AA', () => {
    const violations = productionSources(SOURCE_ROOT).flatMap((path) => {
      const lines = readFileSync(path, 'utf8').split('\n');
      return lines.flatMap((line, index) => (
        LOW_CONTRAST_SMALL_TEXT.test(line) ? [`${path}:${index + 1}`] : []
      ));
    });

    expect(violations).toEqual([]);
  });

  it('globalnie respektuje systemowe ograniczenie ruchu bez wygaszania treści', () => {
    const css = readFileSync(join(SOURCE_ROOT, 'index.css'), 'utf8');
    const reducedMotion = css.match(/@media\s*\(prefers-reduced-motion:\s*reduce\)\s*\{([\s\S]*?)\n\}/)?.[1] ?? '';

    expect(reducedMotion).toContain('animation-duration: 0.01ms');
    expect(reducedMotion).toContain('animation-iteration-count: 1');
    expect(reducedMotion).toContain('transition-duration: 0.01ms');
    expect(reducedMotion).toContain('scroll-behavior: auto');
  });
});
