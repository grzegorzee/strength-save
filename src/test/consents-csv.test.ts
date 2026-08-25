import { describe, expect, it, vi } from 'vitest';
import { buildConsentsCsv, collectAllPages, csvField, type ConsentRow } from '@/lib/consents-csv';

// Eksport CSV logu zgód (wymóg usera 2026-08-11: data+godzina UTC + IP).

const row = (over: Partial<ConsentRow> = {}): ConsentRow => ({
  id: 'c1',
  uid: 'u1',
  type: 'terms',
  action: 'granted',
  docVersion: '2.0',
  lang: 'pl',
  channel: 'ios',
  appVersion: '1.0.0 (87)',
  ip: '203.0.113.7',
  statementText: 'Mam ukończone 16 lat i akceptuję Regulamin.',
  createdAt: new Date('2026-08-11T14:30:00.000Z'),
  ...over,
});

describe('csvField (RFC 4180)', () => {
  it('zwykłe wartości bez zmian, przecinki/cudzysłowy/nowe linie w cudzysłowach', () => {
    expect(csvField('abc')).toBe('abc');
    expect(csvField('a,b')).toBe('"a,b"');
    expect(csvField('a"b')).toBe('"a""b"');
    expect(csvField('a\nb')).toBe('"a\nb"');
  });
});

describe('buildConsentsCsv', () => {
  it('nagłówek + wiersz z UTC ISO, e-mailem z joinu i IP', () => {
    const csv = buildConsentsCsv([row()], { u1: 'grzegorz@example.com' });
    const [header, line] = csv.split('\r\n');
    expect(header).toBe('createdAtUtc,email,uid,type,action,docVersion,lang,channel,appVersion,ip,statementText');
    expect(line).toContain('2026-08-11T14:30:00.000Z');
    expect(line).toContain('grzegorz@example.com');
    expect(line).toContain('203.0.113.7');
    // statementText zawiera przecinek? Nie — ale kropkę i spacje; bez cudzysłowów.
    expect(line.endsWith('Mam ukończone 16 lat i akceptuję Regulamin.')).toBe(true);
  });

  it('brak e-maila i createdAt = puste pola; treść z przecinkiem w cudzysłowach', () => {
    const csv = buildConsentsCsv(
      [row({ createdAt: null, statementText: 'Zgoda, wyraźna, na zdrowie.' })],
      {},
    );
    const line = csv.split('\r\n')[1];
    expect(line.startsWith(',,u1,')).toBe(true);
    expect(line).toContain('"Zgoda, wyraźna, na zdrowie."');
  });
});

// Bug 48 (X30): eksport nie może cicho obcinać się na limicie strony — pełna
// strona oznacza możliwe dalsze wpisy i wymusza kolejne pobranie (startAfter).
describe('collectAllPages (bug 48: eksport bez cichego sufitu)', () => {
  const pagesFetcher = (pages: number[][]) => {
    let call = 0;
    return vi.fn(async (cursor: number | null) => {
      const items = pages[call] ?? [];
      call += 1;
      // Kursor = ostatni element strony (odpowiednik snap.docs[len-1]).
      void cursor;
      return { items, nextCursor: items.length > 0 ? items[items.length - 1] : null };
    });
  };

  it('niepełna pierwsza strona = jedno pobranie', async () => {
    const fetchPage = pagesFetcher([[1, 2]]);
    const all = await collectAllPages(3, fetchPage);
    expect(all).toEqual([1, 2]);
    expect(fetchPage).toHaveBeenCalledTimes(1);
    expect(fetchPage).toHaveBeenCalledWith(null);
  });

  it('pełne strony dociągane aż do niepełnej, kolejność i kursory zachowane', async () => {
    const fetchPage = pagesFetcher([[1, 2, 3], [4, 5, 6], [7]]);
    const all = await collectAllPages(3, fetchPage);
    expect(all).toEqual([1, 2, 3, 4, 5, 6, 7]);
    expect(fetchPage).toHaveBeenCalledTimes(3);
    expect(fetchPage).toHaveBeenNthCalledWith(2, 3);
    expect(fetchPage).toHaveBeenNthCalledWith(3, 6);
  });

  it('liczba wpisów równa wielokrotności strony: ostatnie pobranie puste, bez pętli w nieskończoność', async () => {
    const fetchPage = pagesFetcher([[1, 2, 3], []]);
    const all = await collectAllPages(3, fetchPage);
    expect(all).toEqual([1, 2, 3]);
    expect(fetchPage).toHaveBeenCalledTimes(2);
  });
});
