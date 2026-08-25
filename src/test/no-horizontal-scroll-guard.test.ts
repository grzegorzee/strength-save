import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';

// X35a WP-A (docs/PLAN-X35-2026-08-25.md, sekcja A): zasada produktu "zaden element
// sterujacy nie moze byc ukryty za przewijaniem poziomym". Chipy, filtry, kategorie
// i siatki zawijaja sie (flex-wrap / grid) i sa widoczne od razu na 393 px.
// Guard plikowy (wzorzec date-label-guard) pilnuje, zeby wzorzec "rzad w scrollu"
// nie wrocil do src/pages i src/components poza jawna lista wyjatkow.
//
// Wyjatek moze dotyczyc TYLKO prymitywu, ktory nie jest elementem sterujacym
// (np. shadcn ui/table.tsx dla danych 2D). Wpis = plik + liczba dozwolonych
// wystapien; test "martwych wpisow" wymusza usuniecie wpisu, gdy plik przestal
// uzywac wzorca. Dzis lista jest pusta: prymitywy shadcn w repo (ui/table.tsx,
// ui/sidebar.tsx) uzywaja overflow-auto / overflow-hidden, nie overflow-x-*.
const ALLOWED_HORIZONTAL_SCROLL: Record<string, number> = {};

const PATTERN = /overflow-x-auto|overflow-x-scroll|snap-x|overflowX/g;

const collectSourceFiles = (dir: string): string[] => {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      out.push(...collectSourceFiles(full));
    } else if (full.endsWith('.tsx') || full.endsWith('.ts')) {
      out.push(full);
    }
  }
  return out;
};

const countMatches = (source: string) => (source.match(PATTERN) ?? []).length;

describe('guard: brak przewijania poziomego w UI (overflow-x-auto / snap-x / overflowX)', () => {
  it('src/pages i src/components nie uzywaja wzorca poza lista wyjatkow', () => {
    const root = process.cwd();
    const files = [
      ...collectSourceFiles(join(root, 'src', 'pages')),
      ...collectSourceFiles(join(root, 'src', 'components')),
    ];
    const offenders: string[] = [];
    for (const file of files) {
      const rel = relative(root, file);
      const count = countMatches(readFileSync(file, 'utf8'));
      const allowed = ALLOWED_HORIZONTAL_SCROLL[rel] ?? 0;
      if (count > allowed) {
        offenders.push(`${rel}: ${count} wystapien przewijania poziomego (dozwolone: ${allowed}); zamien na flex-wrap / grid`);
      }
    }
    expect(offenders, offenders.join('\n')).toEqual([]);
  });

  it('lista wyjatkow nie zawiera martwych wpisow (plik istnieje i ma dokladnie tyle wystapien)', () => {
    const root = process.cwd();
    for (const [rel, allowed] of Object.entries(ALLOWED_HORIZONTAL_SCROLL)) {
      const count = countMatches(readFileSync(join(root, rel), 'utf8'));
      expect(count, `${rel}: wpis mowi ${allowed}, w pliku jest ${count}`).toBe(allowed);
    }
  });
});
