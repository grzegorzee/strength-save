// Czyste helpery scripts/prod-read.mjs (testy: src/test/prod-read.test.ts).
// Produkcję odpytujemy WYŁĄCZNIE do odczytu, kontem agent-readonly
// (docs/COST-GUARDS.md, sekcja 5). Tu żyje twardy limit dokumentów i biała
// lista endpointów; samo konto i tak nie ma uprawnień zapisu (podwójny zamek).

export const PROJECT_ID = 'fittracker-workouts';
export const READONLY_SA = `agent-readonly@${PROJECT_ID}.iam.gserviceaccount.com`;
export const DEFAULT_MAX_DOCS = 5000;
export const FIRESTORE_BASE = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`;

/**
 * Jedyne dozwolone żądania: metoda + wzorzec URL. POST tylko dla metod
 * odczytu Firestore (runQuery, runAggregationQuery), Identity Toolkit
 * accounts:lookup i Logging entries:list (wszystkie są odczytami mimo POST).
 */
const ALLOWED = [
  { method: 'GET', pattern: /^https:\/\/firestore\.googleapis\.com\/v1\/projects\/fittracker-workouts\/databases\/\(default\)\/documents\/[^:?]+(\?.*)?$/ },
  { method: 'POST', pattern: /^https:\/\/firestore\.googleapis\.com\/v1\/projects\/fittracker-workouts\/databases\/\(default\)\/documents(\/[^:?]+)?:(runQuery|runAggregationQuery)$/ },
  { method: 'POST', pattern: /^https:\/\/identitytoolkit\.googleapis\.com\/v1\/projects\/fittracker-workouts\/accounts:lookup$/ },
  { method: 'POST', pattern: /^https:\/\/logging\.googleapis\.com\/v2\/entries:list$/ },
];

export const assertReadOnlyRequest = (method, url) => {
  const ok = ALLOWED.some((rule) => rule.method === method && rule.pattern.test(url));
  if (!ok) throw new Error(`prod-read: żądanie spoza białej listy odczytu: ${method} ${url}`);
};

/** Licznik odczytów z twardym sufitem; nigdy nie pozwala przeczytać ponad limit. */
export const createReadBudget = (maxDocs = DEFAULT_MAX_DOCS) => {
  if (!Number.isInteger(maxDocs) || maxDocs < 1) throw new Error('prod-read: --max-docs musi być dodatnią liczbą całkowitą');
  let used = 0;
  return {
    get used() { return used; },
    get remaining() { return maxDocs - used; },
    maxDocs,
    /** Ile dokumentów wolno jeszcze pobrać w tym żądaniu (0 = limit wyczerpany). */
    allowance(requested) {
      const left = maxDocs - used;
      return requested === undefined ? left : Math.min(requested, left);
    },
    consume(count) {
      used += count;
      if (used > maxDocs) throw new Error(`prod-read: przekroczony limit ${maxDocs} dokumentów`);
    },
  };
};

export class ReadLimitReached extends Error {
  constructor(maxDocs) {
    super(`prod-read: osiągnięty limit ${maxDocs} dokumentów na uruchomienie, przerwano (podnieś --max-docs świadomie albo zawęź zapytanie)`);
    this.name = 'ReadLimitReached';
  }
}

const OPS = {
  '==': 'EQUAL', '!=': 'NOT_EQUAL', '<': 'LESS_THAN', '<=': 'LESS_THAN_OR_EQUAL',
  '>': 'GREATER_THAN', '>=': 'GREATER_THAN_OR_EQUAL', 'array-contains': 'ARRAY_CONTAINS', in: 'IN',
};

/** Wartość JS -> Firestore REST Value. */
export const toFirestoreValue = (value) => {
  if (value === null) return { nullValue: null };
  if (typeof value === 'boolean') return { booleanValue: value };
  if (typeof value === 'number') return Number.isInteger(value) ? { integerValue: String(value) } : { doubleValue: value };
  if (typeof value === 'string') return { stringValue: value };
  if (Array.isArray(value)) return { arrayValue: { values: value.map(toFirestoreValue) } };
  throw new Error(`prod-read: nieobsługiwany typ wartości filtra: ${typeof value}`);
};

/** Firestore REST Value -> zwykły JS (do wydruku). */
export const fromFirestoreValue = (value) => {
  if (!value || typeof value !== 'object') return value;
  if ('nullValue' in value) return null;
  if ('booleanValue' in value) return value.booleanValue;
  if ('integerValue' in value) return Number(value.integerValue);
  if ('doubleValue' in value) return value.doubleValue;
  if ('stringValue' in value) return value.stringValue;
  if ('timestampValue' in value) return value.timestampValue;
  if ('referenceValue' in value) return value.referenceValue;
  if ('bytesValue' in value) return `<bytes ${value.bytesValue.length}>`;
  if ('geoPointValue' in value) return value.geoPointValue;
  if ('arrayValue' in value) return (value.arrayValue.values ?? []).map(fromFirestoreValue);
  if ('mapValue' in value) return fromFirestoreFields(value.mapValue.fields ?? {});
  return value;
};

export const fromFirestoreFields = (fields) => Object.fromEntries(
  Object.entries(fields ?? {}).map(([key, val]) => [key, fromFirestoreValue(val)]),
);

/** "field op jsonValue", np. `status == "active"`, `createdAt >= 1727000000000`. */
export const parseWhere = (expr) => {
  const match = /^\s*([\w.]+)\s+(==|!=|<=|>=|<|>|array-contains|in)\s+(.+)$/.exec(expr);
  if (!match) throw new Error(`prod-read: nieczytelny --where: ${expr}`);
  let value;
  try {
    value = JSON.parse(match[3]);
  } catch {
    value = match[3].trim();
  }
  return { fieldFilter: { field: { fieldPath: match[1] }, op: OPS[match[2]], value: toFirestoreValue(value) } };
};

/** structuredQuery dla kolekcji (ostatni segment ścieżki) z rodzicem. */
export const buildStructuredQuery = ({ collectionPath, where = [], orderBy, limit }) => {
  const segments = collectionPath.split('/').filter(Boolean);
  if (segments.length % 2 !== 1) throw new Error(`prod-read: ${collectionPath} nie jest ścieżką kolekcji`);
  const collectionId = segments[segments.length - 1];
  const parent = segments.slice(0, -1).join('/');
  const filters = where.map(parseWhere);
  const structuredQuery = { from: [{ collectionId }] };
  if (filters.length === 1) structuredQuery.where = filters[0];
  if (filters.length > 1) structuredQuery.where = { compositeFilter: { op: 'AND', filters } };
  if (orderBy) {
    const [field, dir] = orderBy.split(':');
    structuredQuery.orderBy = [{ field: { fieldPath: field }, direction: dir === 'desc' ? 'DESCENDING' : 'ASCENDING' }];
  }
  if (limit !== undefined) structuredQuery.limit = limit;
  const url = `${FIRESTORE_BASE}${parent ? `/${parent}` : ''}:runQuery`;
  return { url, body: { structuredQuery } };
};

export const parseArgs = (argv) => {
  const [command, ...rest] = argv;
  const opts = { command, positional: [], where: [], maxDocs: DEFAULT_MAX_DOCS };
  for (let i = 0; i < rest.length; i += 1) {
    const arg = rest[i];
    const next = () => {
      i += 1;
      if (i >= rest.length) throw new Error(`prod-read: brak wartości dla ${arg}`);
      return rest[i];
    };
    if (arg === '--where') opts.where.push(next());
    else if (arg === '--order-by') opts.orderBy = next();
    else if (arg === '--limit') opts.limit = Number(next());
    else if (arg === '--max-docs') opts.maxDocs = Number(next());
    else if (arg === '--log-file') opts.logFile = next();
    else if (arg === '--hours') opts.hours = Number(next());
    else if (arg.startsWith('--')) throw new Error(`prod-read: nieznana opcja ${arg}`);
    else opts.positional.push(arg);
  }
  if (opts.limit !== undefined && (!Number.isInteger(opts.limit) || opts.limit < 1)) throw new Error('prod-read: --limit musi być dodatnią liczbą całkowitą');
  return opts;
};
