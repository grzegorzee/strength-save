import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';
import { formatLocalDateLabel, parseLocalDate, parseLocalDateSafe } from '@/lib/utils';

// WP-G Task G3 (zasada 11 CLAUDE.md): formatowanie etykiet dat nie ma prawa
// polozyc route'a. parseLocalDate (throwing) zostaje dla logiki z walidacja;
// w renderze etykiet obowiazuje wariant safe (degradacja do placeholdera).
// Guard plikowy pilnuje, zeby throwing wariant nie wracal do stron/komponentow
// poza jawna lista wyjatkow "logika, nie etykieta".

describe('parseLocalDateSafe', () => {
  it('poprawna data zwraca Date rowna throwing wariantowi', () => {
    const safe = parseLocalDateSafe('2026-08-21');
    expect(safe).toBeInstanceOf(Date);
    expect(safe!.getTime()).toBe(parseLocalDate('2026-08-21').getTime());
  });

  it('pusty string, undefined, null i zle formaty daja null (bez throw)', () => {
    expect(parseLocalDateSafe('')).toBeNull();
    expect(parseLocalDateSafe(undefined)).toBeNull();
    expect(parseLocalDateSafe(null)).toBeNull();
    expect(parseLocalDateSafe('2026-13-40')).toBeNull();
    expect(parseLocalDateSafe('21.08.2026')).toBeNull();
    expect(parseLocalDateSafe(1755763200000)).toBeNull();
  });
});

describe('formatLocalDateLabel', () => {
  it('poprawna data formatuje przez toLocaleDateString', () => {
    expect(formatLocalDateLabel('2026-08-21', 'pl-PL', { day: 'numeric', month: 'long', year: 'numeric' }))
      .toBe(new Date(2026, 7, 21).toLocaleDateString('pl-PL', { day: 'numeric', month: 'long', year: 'numeric' }));
  });

  it('niepoprawna wartosc degraduje do placeholdera "-"', () => {
    expect(formatLocalDateLabel('', 'pl-PL')).toBe('-');
    expect(formatLocalDateLabel(undefined, 'en-US', { day: 'numeric', month: 'short' })).toBe('-');
  });
});

// GUARD: throwing parseLocalDate( w src/pages i src/components tylko na
// jawnej liscie wyjatkow. Wpis = plik + liczba dozwolonych wystapien
// (wszystkie to LOGIKA: sortowania, porownania dat, silniki kalendarza,
// wejscia gwarantowane przez formatLocalDate). Nowe wystapienie w pliku
// z listy albo w nowym pliku = swiadoma decyzja i update tej mapy.
const ALLOWED_LOGIC_CALLS: Record<string, number> = {
  // logika, nie etykieta: siatka miesiaca kalendarza (monthISO z formatLocalDate)
  'src/components/ui/range-calendar.tsx': 1,
  // logika, nie etykieta: start zakresu kalendarza przelozen (today z formatLocalDate)
  'src/components/RescheduleSheet.tsx': 1,
  // logika, nie etykieta: wyliczanie poniedzialku tygodnia startu planu
  'src/components/PlanWizard.tsx': 1,
  // logika, nie etykieta: granice tygodnia raportu (planStartDate zwalidowane)
  'src/components/WeekReportCard.tsx': 1,
  // logika, nie etykieta: sortowanie zdjec po dacie
  'src/components/BodyPhotoCompare.tsx': 2,
  // logika, nie etykieta: weekday dnia paska tygodnia (daty z formatLocalDate)
  'src/components/HybridWeekStrip.tsx': 1,
  // logika, nie etykieta: numeracja tygodni cyklu od startDate
  'src/components/CycleDetail.tsx': 1,
  // logika, nie etykieta: planowana data konca cyklu (startDate + tygodnie)
  'src/components/CycleCard.tsx': 1,
  // logika, nie etykieta: filtry zakresow, sortowania i progi tygodni wykresow
  'src/components/analytics/AnalyticsChartsTab.tsx': 8,
  // logika, nie etykieta: sortowanie sesji malejaco po dacie
  'src/pages/WorkoutHistory.tsx': 2,
  // logika, nie etykieta: okna aktywnosci, granice planu, prestart, autokoniec
  'src/pages/Dashboard.tsx': 5,
  // logika, nie etykieta: zakresy dat, poprzednia sesja, klucze miesiecy
  'src/pages/Analytics.tsx': 8,
  // logika, nie etykieta: markery kalendarza, start tygodnia, daty treningow
  'src/pages/TrainingPlan.tsx': 6,
};

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

describe('guard: parseLocalDate( poza lista wyjatkow nie wystepuje w UI', () => {
  it('src/pages i src/components uzywaja wariantu safe do etykiet', () => {
    const root = process.cwd();
    const files = [
      ...collectSourceFiles(join(root, 'src', 'pages')),
      ...collectSourceFiles(join(root, 'src', 'components')),
    ];
    const offenders: string[] = [];
    for (const file of files) {
      const rel = relative(root, file);
      const source = readFileSync(file, 'utf8');
      // \b oddziela od parseLocalDateSafe( — sufiks "Safe" nie matchuje "(".
      const count = (source.match(/\bparseLocalDate\(/g) ?? []).length;
      const allowed = ALLOWED_LOGIC_CALLS[rel] ?? 0;
      if (count > allowed) {
        offenders.push(`${rel}: ${count} wystapien parseLocalDate( (dozwolone: ${allowed})`);
      }
    }
    expect(offenders, offenders.join('\n')).toEqual([]);
  });

  it('lista wyjatkow nie zawiera martwych wpisow (plik istnieje i ma dokladnie tyle wystapien)', () => {
    const root = process.cwd();
    for (const [rel, allowed] of Object.entries(ALLOWED_LOGIC_CALLS)) {
      const source = readFileSync(join(root, rel), 'utf8');
      const count = (source.match(/\bparseLocalDate\(/g) ?? []).length;
      expect(count, `${rel}: wpis mowi ${allowed}, w pliku jest ${count}`).toBe(allowed);
    }
  });
});
