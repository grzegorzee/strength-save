// WP-F Task F4 (X27): ZERO długich pauz w tekstach UI (zgłoszenie usera
// 2026-08-21: em-dashe w banerze "cycle ending" i danych ćwiczeń "Rest 2–3
// minutes"). Guard pilnuje TYLKO U+2013 (–), U+2014 (—), U+2015 (―) w:
// 1. wartościach słowników pl.ts / en.ts (import, więc komentarze nie łapią),
// 2. literałach stringów plików src/data/*.ts (fs + skaner literałów — komentarze
//    celowo pominięte, w nich pauzy są dozwolone).
// Separator `·` i zwykły łącznik "-" są legalne (Edge 5/6 planu WP-F).
import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { pl } from '@/i18n/locales/pl';
import { en } from '@/i18n/locales/en';

const LONG_DASH = /[–—―]/;

/** Zawartość literałów stringów ('…', "…", `…`) z pominięciem komentarzy // i /* */
const stringLiterals = (src: string): { line: number; text: string }[] => {
  const found: { line: number; text: string }[] = [];
  let i = 0;
  let line = 1;
  const n = src.length;
  while (i < n) {
    const ch = src[i];
    if (ch === '\n') { line += 1; i += 1; continue; }
    // komentarz liniowy
    if (ch === '/' && src[i + 1] === '/') {
      while (i < n && src[i] !== '\n') i += 1;
      continue;
    }
    // komentarz blokowy
    if (ch === '/' && src[i + 1] === '*') {
      i += 2;
      while (i < n && !(src[i] === '*' && src[i + 1] === '/')) {
        if (src[i] === '\n') line += 1;
        i += 1;
      }
      i += 2;
      continue;
    }
    if (ch === "'" || ch === '"' || ch === '`') {
      const quote = ch;
      const startLine = line;
      let text = '';
      i += 1;
      while (i < n && src[i] !== quote) {
        if (src[i] === '\\') { text += src[i] + (src[i + 1] ?? ''); i += 2; continue; }
        if (src[i] === '\n') line += 1;
        text += src[i];
        i += 1;
      }
      i += 1; // zamykający cudzysłów
      found.push({ line: startLine, text });
      continue;
    }
    i += 1;
  }
  return found;
};

describe('WP-F: zero długich pauz (— – ―) w tekstach UI', () => {
  it('wartości słownika pl.ts bez długich pauz', () => {
    const offenders = Object.entries(pl)
      .filter(([, value]) => LONG_DASH.test(String(value)))
      .map(([key, value]) => `${key}: ${value}`);
    expect(offenders).toEqual([]);
  });

  it('wartości słownika en.ts bez długich pauz', () => {
    const offenders = Object.entries(en)
      .filter(([, value]) => LONG_DASH.test(String(value)))
      .map(([key, value]) => `${key}: ${value}`);
    expect(offenders).toEqual([]);
  });

  it('literały stringów w src/data/*.ts bez długich pauz', () => {
    const dir = 'src/data';
    const offenders = readdirSync(dir)
      .filter((f) => f.endsWith('.ts'))
      .flatMap((f) => {
        const src = readFileSync(join(dir, f), 'utf8');
        return stringLiterals(src)
          .filter(({ text }) => LONG_DASH.test(text))
          .map(({ line, text }) => `${join(dir, f)}:${line} ${text.slice(0, 80)}`);
      });
    expect(offenders).toEqual([]);
  });
});
