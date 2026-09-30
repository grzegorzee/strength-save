#!/usr/bin/env node
// Odczyt produkcji dla agentów i ludzi: WYŁĄCZNIE przez konto agent-readonly
// (impersonacja, bez kluczy JSON), twardy limit dokumentów na uruchomienie,
// licznik odczytów w podsumowaniu, log zapytań lokalnie. docs/COST-GUARDS.md.
//
// Użycie:
//   node scripts/prod-read.mjs get users/<uid>
//   node scripts/prod-read.mjs query client_errors --where 'createdAt >= 1727000000000' --order-by createdAt:desc --limit 50
//   node scripts/prod-read.mjs list config
//   node scripts/prod-read.mjs count workouts --where 'userId == "<uid>"'
//   node scripts/prod-read.mjs auth-lookup someone@example.com
//   node scripts/prod-read.mjs logs 'resource.type="cloud_run_revision" AND severity>=ERROR' --hours 6 --limit 50
// Opcje wspólne: --max-docs N (domyślnie 5000), --log-file <ścieżka>.
// Konto gcloud do impersonacji: STRENGTH_SAVE_GCLOUD_ACCOUNT (domyślnie aktywne konto gcloud).

import { execFileSync } from 'node:child_process';
import { appendFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  FIRESTORE_BASE,
  PROJECT_ID,
  READONLY_SA,
  ReadLimitReached,
  assertReadOnlyRequest,
  buildStructuredQuery,
  createReadBudget,
  fromFirestoreFields,
  parseArgs,
  parseWhere,
} from './prod-read-helpers.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const DEFAULT_LOG = resolve(ROOT, 'tmp/prod-read/queries.log');

const accessToken = () => {
  const account = process.env.STRENGTH_SAVE_GCLOUD_ACCOUNT;
  return execFileSync('gcloud', [
    'auth', 'print-access-token',
    `--impersonate-service-account=${READONLY_SA}`,
    ...(account ? [`--account=${account}`] : []),
  ], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
};

let token;
const call = async (method, url, body) => {
  assertReadOnlyRequest(method, url);
  token ??= accessToken();
  const response = await fetch(url, {
    method,
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const text = await response.text();
  if (!response.ok) throw new Error(`prod-read: HTTP ${response.status} ${text.slice(0, 500)}`);
  return text ? JSON.parse(text) : {};
};

const printDoc = (document) => {
  const path = document.name.split('/documents/')[1];
  process.stdout.write(`${JSON.stringify({ path, ...fromFirestoreFields(document.fields) })}\n`);
};

const run = async (opts, budget) => {
  const [target] = opts.positional;
  switch (opts.command) {
    case 'get': {
      if (!target) throw new Error('prod-read get <ścieżka/dokumentu>');
      if (budget.allowance(1) < 1) throw new ReadLimitReached(budget.maxDocs);
      const document = await call('GET', `${FIRESTORE_BASE}/${target}`);
      budget.consume(1);
      printDoc(document);
      return;
    }
    case 'list':
    case 'query': {
      if (!target) throw new Error(`prod-read ${opts.command} <ścieżka/kolekcji>`);
      const allowance = budget.allowance(opts.limit);
      if (allowance < 1) throw new ReadLimitReached(budget.maxDocs);
      const { url, body } = buildStructuredQuery({ collectionPath: target, where: opts.where, orderBy: opts.orderBy, limit: allowance });
      const rows = await call('POST', url, body);
      const documents = (Array.isArray(rows) ? rows : []).filter((row) => row.document).map((row) => row.document);
      budget.consume(Math.max(documents.length, 1)); // pusty wynik też kosztuje 1 odczyt
      documents.forEach(printDoc);
      // Doszliśmy do sufitu budżetu, a user chciał więcej (albo bez limitu): wynik może być niepełny.
      if (documents.length === allowance && (opts.limit === undefined || opts.limit > allowance)) {
        throw new ReadLimitReached(budget.maxDocs);
      }
      return;
    }
    case 'count': {
      if (!target) throw new Error('prod-read count <ścieżka/kolekcji>');
      const { url, body } = buildStructuredQuery({ collectionPath: target, where: opts.where });
      const aggregationUrl = url.replace(/:runQuery$/, ':runAggregationQuery');
      const rows = await call('POST', aggregationUrl, {
        structuredAggregationQuery: { structuredQuery: body.structuredQuery, aggregations: [{ alias: 'n', count: {} }] },
      });
      const count = Number(rows?.[0]?.result?.aggregateFields?.n?.integerValue ?? 0);
      // Cennik: 1 odczyt na każde rozpoczęte 1000 wpisów indeksu.
      budget.consume(Math.max(1, Math.ceil(count / 1000)));
      process.stdout.write(`${JSON.stringify({ collection: target, count })}\n`);
      return;
    }
    case 'auth-lookup': {
      if (!target) throw new Error('prod-read auth-lookup <email>');
      const result = await call('POST', `https://identitytoolkit.googleapis.com/v1/projects/${PROJECT_ID}/accounts:lookup`, { email: [target] });
      for (const user of result.users ?? []) {
        process.stdout.write(`${JSON.stringify({
          uid: user.localId,
          email: user.email,
          emailVerified: user.emailVerified ?? false,
          disabled: user.disabled ?? false,
          providers: (user.providerUserInfo ?? []).map((p) => p.providerId),
          createdAt: user.createdAt ? new Date(Number(user.createdAt)).toISOString() : null,
          lastLoginAt: user.lastLoginAt ? new Date(Number(user.lastLoginAt)).toISOString() : null,
        })}\n`);
      }
      if (!result.users?.length) process.stdout.write('{"found":false}\n');
      return;
    }
    case 'logs': {
      if (!target) throw new Error('prod-read logs <filtr Cloud Logging>');
      const hours = Number.isFinite(opts.hours) ? opts.hours : 24;
      const since = new Date(Date.now() - hours * 3600_000).toISOString();
      const result = await call('POST', 'https://logging.googleapis.com/v2/entries:list', {
        resourceNames: [`projects/${PROJECT_ID}`],
        filter: `(${target}) AND timestamp >= "${since}"`,
        orderBy: 'timestamp desc',
        pageSize: Math.min(opts.limit ?? 50, 1000),
      });
      for (const entry of result.entries ?? []) {
        process.stdout.write(`${JSON.stringify({
          at: entry.timestamp,
          severity: entry.severity,
          service: entry.resource?.labels?.service_name ?? entry.resource?.type,
          message: entry.textPayload ?? entry.jsonPayload?.message ?? entry.jsonPayload,
        })}\n`);
      }
      return;
    }
    default:
      throw new Error('prod-read: komenda: get | query | list | count | auth-lookup | logs');
  }
};

// Filtry walidowane na starcie, zanim cokolwiek poleci do produkcji
// (literówka w --where = zero odczytów).
const main = async () => {
  const opts = parseArgs(process.argv.slice(2));
  opts.where.forEach(parseWhere);
  const budget = createReadBudget(opts.maxDocs);
  const logFile = resolve(opts.logFile ?? DEFAULT_LOG);
  const started = new Date().toISOString();
  const loggedArgs = opts.command === 'auth-lookup' ? ['auth-lookup', '<email>'] : process.argv.slice(2);
  let status = 'ok';
  let exitCode = 0;
  try {
    await run(opts, budget);
  } catch (error) {
    status = error instanceof ReadLimitReached ? 'limit-reached' : 'error';
    exitCode = error instanceof ReadLimitReached ? 3 : 1;
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  } finally {
    mkdirSync(dirname(logFile), { recursive: true });
    appendFileSync(logFile, `${JSON.stringify({ at: started, args: loggedArgs, reads: budget.used, maxDocs: budget.maxDocs, status })}\n`);
    process.stderr.write(`[prod-read] odczyty Firestore: ${budget.used} / limit ${budget.maxDocs} (${status}); log: ${logFile}\n`);
  }
  process.exit(exitCode);
};

await main();
