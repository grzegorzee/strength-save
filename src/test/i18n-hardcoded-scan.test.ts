import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

// Z168: globalny guard na polskie stringi wpisane wprost w kod UI/lib. Chroni KAŻDY
// przyszły język: nowy literał PL w komponencie = czerwony test zamiast polskiego
// napisu na ekranie EN/ES. Wyjątki są jawne i uzasadnione (allowlista niżej).

const SKIPPED_DIRS = new Set(['src/i18n', 'src/data', 'src/test']);

// Pliki, w których polskie stringi są POPRAWNE (wartości kanoniczne, klucze lookup,
// fixtury, kod poza LanguageProvider). Każdy wpis z uzasadnieniem.
const ALLOWLIST = new Set([
  'src/lib/plan-cycle-utils.ts',              // kanoniczne dayName zapisywane do Firestore
  'src/lib/plan-i18n.ts',                     // mapy PL → EN (klucze = wartości kanoniczne)
  'src/lib/workout-import/mapper.ts',         // mapowanie hevy/strong na kanoniczne PL
  'src/lib/rza-progression.ts',               // klucze lookup progresji po nazwach PL
  'src/components/strava/RacePredictor.tsx',  // klucze mapy emoji po nazwach dystansów
  'src/lib/race-predictor.ts',                // distanceLabel = klucz lookup ('Półmaraton')
  'src/lib/registration-api.ts',              // fixtury trybu E2E
  'src/lib/purchases.ts',                     // console.warn dev-only
  'src/pages/Profile.tsx',                    // słowo potwierdzenia USUŃ (zależne od lang)
  'src/components/ErrorBoundary.tsx',         // mini-słownik poza LanguageProvider
  'src/lib/exercise-media.ts',                // mapa diakrytyków → slug CDN
  'src/lib/exercise-swap.ts',                 // normalizacja diakrytyków do wyszukiwania
  'src/lib/search-utils.ts',                  // normalizacja diakrytyków do wyszukiwania
]);

const walk = (dir: string): string[] =>
  readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });

// Komentarze (blokowe, całoliniowe i końcowe) nie są tekstem UI. Ostrożnie z '//'
// w literałach URL — pomijamy je, wymagając białego znaku przed komentarzem końcowym.
const stripComments = (src: string) =>
  src
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '')
    .replace(/(^|[^:'"`\\])\/\/[^'"`]*$/gm, '$1');

describe('globalny guard i18n: zero nowych hardcodowanych polskich stringów (Z168)', () => {
  it('src/ (poza i18n, data, test i allowlistą) bez polskich znaków w kodzie', () => {
    const files = walk('src')
      .filter((p) => /\.tsx?$/.test(p))
      .filter((p) => ![...SKIPPED_DIRS].some((dir) => p.startsWith(`${dir}/`)))
      .filter((p) => !ALLOWLIST.has(p));

    const offenders = files.flatMap((p) => {
      const lines = stripComments(readFileSync(p, 'utf8')).split('\n');
      return lines.flatMap((l, i) => (/[ąćęłńóśźż]/i.test(l) ? [`${p}:${i + 1} ${l.trim()}`] : []));
    });

    expect(offenders).toEqual([]);
  });

  it('allowlista nie zawiera martwych wpisów (plik musi istnieć)', () => {
    const existing = new Set(walk('src'));
    const dead = [...ALLOWLIST].filter((p) => !existing.has(p));
    expect(dead).toEqual([]);
  });
});
