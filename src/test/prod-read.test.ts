import { describe, expect, it } from 'vitest';
import {
  DEFAULT_MAX_DOCS,
  FIRESTORE_BASE,
  assertReadOnlyRequest,
  buildStructuredQuery,
  createReadBudget,
  fromFirestoreFields,
  parseArgs,
  parseWhere,
} from '../../scripts/prod-read-helpers.mjs';

// docs/COST-GUARDS.md, sekcja 5: produkcję agenci czytają wyłącznie przez
// scripts/prod-read.mjs. Bramka musi odrzucać zapis i pilnować sufitu odczytów.

describe('prod-read: biała lista żądań', () => {
  it.each([
    ['GET', `${FIRESTORE_BASE}/users/u1`],
    ['POST', `${FIRESTORE_BASE}:runQuery`],
    ['POST', `${FIRESTORE_BASE}/users/u1:runQuery`],
    ['POST', `${FIRESTORE_BASE}:runAggregationQuery`],
    ['POST', 'https://identitytoolkit.googleapis.com/v1/projects/fittracker-workouts/accounts:lookup'],
    ['POST', 'https://logging.googleapis.com/v2/entries:list'],
  ])('przepuszcza odczyt %s %s', (method, url) => {
    expect(() => assertReadOnlyRequest(method, url)).not.toThrow();
  });

  it.each([
    ['PATCH', `${FIRESTORE_BASE}/users/u1`],
    ['DELETE', `${FIRESTORE_BASE}/users/u1`],
    ['POST', `${FIRESTORE_BASE}:commit`],
    ['POST', `${FIRESTORE_BASE}:batchWrite`],
    ['POST', `${FIRESTORE_BASE}/users`],
    ['POST', 'https://identitytoolkit.googleapis.com/v1/projects/fittracker-workouts/accounts:update'],
    ['GET', 'https://firestore.googleapis.com/v1/projects/inny-projekt/databases/(default)/documents/users/u1'],
  ])('odrzuca zapis / cudzy projekt %s %s', (method, url) => {
    expect(() => assertReadOnlyRequest(method, url)).toThrow(/białej listy/);
  });
});

describe('prod-read: budżet odczytów', () => {
  it('domyślny sufit 5000', () => {
    expect(DEFAULT_MAX_DOCS).toBe(5000);
    expect(createReadBudget().maxDocs).toBe(5000);
  });

  it('allowance nigdy nie przekracza tego, co zostało', () => {
    const budget = createReadBudget(10);
    expect(budget.allowance()).toBe(10);
    expect(budget.allowance(50)).toBe(10);
    budget.consume(7);
    expect(budget.allowance(50)).toBe(3);
    expect(budget.allowance(2)).toBe(2);
    expect(budget.used).toBe(7);
  });

  it('konsumpcja ponad sufit rzuca (twarde przerwanie)', () => {
    const budget = createReadBudget(3);
    budget.consume(3);
    expect(() => budget.consume(1)).toThrow(/przekroczony limit 3/);
  });

  it('odrzuca bezsensowny limit', () => {
    expect(() => createReadBudget(0)).toThrow();
    expect(() => createReadBudget(1.5)).toThrow();
  });
});

describe('prod-read: zapytania', () => {
  it('buduje runQuery z filtrami, sortowaniem i limitem z budżetu', () => {
    const { url, body } = buildStructuredQuery({
      collectionPath: 'client_errors',
      where: ['createdAt >= 1727000000000', 'platform == "ios"'],
      orderBy: 'createdAt:desc',
      limit: 50,
    });
    expect(url).toBe(`${FIRESTORE_BASE}:runQuery`);
    expect(body.structuredQuery).toEqual({
      from: [{ collectionId: 'client_errors' }],
      where: {
        compositeFilter: {
          op: 'AND',
          filters: [
            { fieldFilter: { field: { fieldPath: 'createdAt' }, op: 'GREATER_THAN_OR_EQUAL', value: { integerValue: '1727000000000' } } },
            { fieldFilter: { field: { fieldPath: 'platform' }, op: 'EQUAL', value: { stringValue: 'ios' } } },
          ],
        },
      },
      orderBy: [{ field: { fieldPath: 'createdAt' }, direction: 'DESCENDING' }],
      limit: 50,
    });
  });

  it('podkolekcja: rodzic w URL', () => {
    expect(buildStructuredQuery({ collectionPath: 'users/u1/aggregates' }).url).toBe(`${FIRESTORE_BASE}/users/u1:runQuery`);
  });

  it('ścieżka dokumentu zamiast kolekcji = błąd przed wysłaniem', () => {
    expect(() => buildStructuredQuery({ collectionPath: 'users/u1' })).toThrow(/nie jest ścieżką kolekcji/);
  });

  it('nieczytelny filtr = błąd przed wysłaniem', () => {
    expect(() => parseWhere('status ~ active')).toThrow(/nieczytelny/);
  });

  it('parsuje opcje CLI', () => {
    expect(parseArgs(['query', 'workouts', '--where', 'userId == "u1"', '--limit', '20', '--max-docs', '100'])).toMatchObject({
      command: 'query',
      positional: ['workouts'],
      where: ['userId == "u1"'],
      limit: 20,
      maxDocs: 100,
    });
    expect(() => parseArgs(['query', 'x', '--limit', '0'])).toThrow();
    expect(() => parseArgs(['query', 'x', '--write'])).toThrow(/nieznana opcja/);
  });

  it('dekoduje pola dokumentu', () => {
    expect(fromFirestoreFields({
      a: { stringValue: 'x' },
      b: { integerValue: '5' },
      c: { mapValue: { fields: { d: { booleanValue: true } } } },
      e: { arrayValue: { values: [{ nullValue: null }] } },
    })).toEqual({ a: 'x', b: 5, c: { d: true }, e: [null] });
  });
});
