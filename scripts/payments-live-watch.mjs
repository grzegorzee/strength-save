#!/usr/bin/env node
// Podgląd płatności na żywo podczas testu sandbox (docs/PAYMENTS-SANDBOX-TEST.md).
// TYLKO ODCZYT: Firestore/Logging przez białą listę prod-read (konto agent-readonly,
// impersonacja, bez kluczy JSON), RevenueCat wyłącznie GET API v2 tego jednego klienta.
// Co ~10 s: users/{uid}.subscription (+ storeSubscription), stan klienta w RC,
// nowe logi revenuecatWebhook dla uid; co 3. obieg nowe client_errors usera.
// Wypisuje wyłącznie ZMIANY z czasem. Twardy limit: 30 min i 5000 odczytów Firestore
// (najgorszy przypadek ~1680 przy 10 s, zasada 21).
//
//   STRENGTH_SAVE_GCLOUD_ACCOUNT=g.jasionowicz@gmail.com node scripts/payments-live-watch.mjs grzegorzee@gmail.com
//   node scripts/payments-live-watch.mjs <uid> --interval 10 --minutes 30
// Klucz RC v2: STRENGTHSAVE_REVENUECAT_SECRET_KEY (zmienna albo .env w katalogu repo).

import { execFileSync } from 'node:child_process';
import { appendFileSync, existsSync, mkdirSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  FIRESTORE_BASE, PROJECT_ID, READONLY_SA, assertReadOnlyRequest, buildStructuredQuery, createReadBudget, fromFirestoreFields,
} from './prod-read-helpers.mjs';
import {
  ERRORS_EVERY_TICKS, ERRORS_LIMIT, MAX_RUNTIME_MS, RC_PROJECT_ID, WATCH_MAX_DOCS, assertRevenueCatRead, diffState,
  formatChange, parseWatchArgs, summarizeRevenueCat, summarizeUser, worstCaseReads,
} from './payments-live-watch-helpers.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const LOG = resolve(ROOT, 'tmp/prod-read/queries.log');
const now = () => new Date().toISOString();
const out = (line) => process.stdout.write(`${line}\n`);

const rcKey = () => {
  if (process.env.STRENGTHSAVE_REVENUECAT_SECRET_KEY) return process.env.STRENGTHSAVE_REVENUECAT_SECRET_KEY;
  const envFile = resolve(ROOT, '.env');
  if (!existsSync(envFile)) return null;
  const line = readFileSync(envFile, 'utf8').split('\n').find((l) => l.startsWith('STRENGTHSAVE_REVENUECAT_SECRET_KEY='));
  return line ? line.split('=').slice(1).join('=').trim().replace(/^["']|["']$/g, '') : null;
};

let googleToken = null;
let googleTokenAt = 0;
const token = () => {
  // Token impersonacji żyje 1 h; odświeżamy co 45 min (limit działania i tak 30 min).
  if (!googleToken || Date.now() - googleTokenAt > 45 * 60_000) {
    const account = process.env.STRENGTH_SAVE_GCLOUD_ACCOUNT;
    googleToken = execFileSync('gcloud', [
      'auth', 'print-access-token', `--impersonate-service-account=${READONLY_SA}`, ...(account ? [`--account=${account}`] : []),
    ], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
    googleTokenAt = Date.now();
  }
  return googleToken;
};

const google = async (method, url, body) => {
  assertReadOnlyRequest(method, url);
  const response = await fetch(url, {
    method,
    headers: { Authorization: `Bearer ${token()}`, 'Content-Type': 'application/json' },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const text = await response.text();
  if (response.status === 404) return null;
  if (!response.ok) throw new Error(`HTTP ${response.status} ${text.slice(0, 200)}`);
  return text ? JSON.parse(text) : {};
};

const rc = async (key, path) => {
  const url = `https://api.revenuecat.com/v2/projects/${RC_PROJECT_ID}${path}`;
  assertRevenueCatRead('GET', url);
  const response = await fetch(url, { headers: { Authorization: `Bearer ${key}` }, signal: AbortSignal.timeout(10_000) });
  if (response.status === 404) return null;
  if (!response.ok) throw new Error(`RC HTTP ${response.status}`);
  return response.json();
};

const resolveUid = async (target) => {
  if (!target.includes('@')) return target;
  const result = await google('POST', `https://identitytoolkit.googleapis.com/v1/projects/${PROJECT_ID}/accounts:lookup`, { email: [target] });
  const uid = result?.users?.[0]?.localId;
  if (!uid) throw new Error(`Brak konta Auth dla ${target}`);
  return uid;
};

const main = async () => {
  const opts = parseWatchArgs(process.argv.slice(2));
  const runtimeMs = Math.min(opts.minutes * 60_000, MAX_RUNTIME_MS);
  const budget = createReadBudget(WATCH_MAX_DOCS);
  const key = rcKey();
  const uid = await resolveUid(opts.target);
  const started = now();
  out(`${started}  start: uid=${uid}, co ${opts.intervalMs / 1000} s, maks. ${runtimeMs / 60_000} min, `
    + `odczyty Firestore maks. ${WATCH_MAX_DOCS} (najgorszy przypadek ~${worstCaseReads(runtimeMs, opts.intervalMs)})`);
  if (!key?.startsWith('sk_')) out(`${now()}  [rc] brak klucza STRENGTHSAVE_REVENUECAT_SECRET_KEY: pomijam RevenueCat`);

  let products = null;
  if (key?.startsWith('sk_')) {
    const list = await rc(key, '/products?limit=100');
    products = Object.fromEntries((list?.items ?? []).map((p) => [p.id, p.store_identifier]));
  }

  let prevUser = null;
  let prevRc = null;
  let logsSince = new Date(Date.now() - 5 * 60_000).toISOString();
  const errorsSince = Date.now() - 5 * 60_000;
  const seenErrors = new Set();
  const seenLogs = new Set();
  let tick = 0;
  let stop = false;
  process.on('SIGINT', () => { stop = true; });
  const deadline = Date.now() + runtimeMs;

  try {
    while (!stop && Date.now() < deadline) {
      const at = now();
      try {
        // 1. users/{uid}: 1 odczyt.
        if (budget.allowance(1) < 1) { out(`${at}  limit odczytów Firestore wyczerpany, koniec`); break; }
        const doc = await google('GET', `${FIRESTORE_BASE}/users/${uid}`);
        budget.consume(1);
        const user = summarizeUser(doc ? fromFirestoreFields(doc.fields) : null);
        if (!doc && prevUser === null) out(`${at}  [firestore] users/${uid} nie istnieje`);
        const userChanges = prevUser === null
          ? [{ path: 'stan początkowy', from: null, to: user }]
          : diffState(prevUser, user);
        userChanges.forEach((c) => out(formatChange(at, 'firestore', c)));
        prevUser = user;

        // 2. RevenueCat (nie liczy się do budżetu Firestore).
        if (key?.startsWith('sk_')) {
          const base = `/customers/${encodeURIComponent(uid)}`;
          const customer = await rc(key, base);
          const entitlements = customer ? (await rc(key, `${base}/active_entitlements?limit=20`))?.items ?? [] : [];
          const subscriptions = [];
          if (customer) {
            for (const environment of ['sandbox', 'production']) {
              const page = await rc(key, `${base}/subscriptions?limit=20&environment=${environment}`);
              subscriptions.push(...(page?.items ?? []).map((s) => ({ ...s, environment })));
            }
          }
          const state = summarizeRevenueCat({ customer, entitlements, subscriptions, products });
          const rcChanges = prevRc === null ? [{ path: 'stan początkowy', from: null, to: state }] : diffState(prevRc, state);
          rcChanges.forEach((c) => out(formatChange(at, 'revenuecat', c)));
          prevRc = state;
        }

        // 3. Logi webhooka dla uid (Cloud Logging, bez kosztu odczytów Firestore).
        const since = logsSince;
        logsSince = at;
        const logs = await google('POST', 'https://logging.googleapis.com/v2/entries:list', {
          resourceNames: [`projects/${PROJECT_ID}`],
          filter: `resource.labels.service_name="revenuecatwebhook" AND textPayload:"${uid}" AND timestamp >= "${since}"`,
          orderBy: 'timestamp asc',
          pageSize: 50,
        });
        for (const entry of logs?.entries ?? []) {
          if (seenLogs.has(entry.insertId)) continue;
          seenLogs.add(entry.insertId);
          out(`${entry.timestamp}  [webhook] ${entry.textPayload ?? JSON.stringify(entry.jsonPayload)}`);
        }

        // 4. client_errors usera co ERRORS_EVERY_TICKS obiegów (maks. ERRORS_LIMIT odczytów).
        if (tick % ERRORS_EVERY_TICKS === 0) {
          const allowance = budget.allowance(ERRORS_LIMIT);
          if (allowance >= 1) {
            const { url, body } = buildStructuredQuery({ collectionPath: 'client_errors', where: [`userId == "${uid}"`], limit: allowance });
            const rows = await google('POST', url, body);
            const docs = (Array.isArray(rows) ? rows : []).filter((r) => r.document).map((r) => r.document);
            budget.consume(Math.max(docs.length, 1));
            for (const d of docs) {
              const data = fromFirestoreFields(d.fields);
              if (seenErrors.has(d.name) || !(Number(data.createdAt) >= errorsSince)) { seenErrors.add(d.name); continue; }
              seenErrors.add(d.name);
              out(`${new Date(Number(data.createdAt)).toISOString()}  [client_errors] ${data.code} ${data.appVersion ?? ''} ${data.platform ?? ''} ${String(data.message ?? '').slice(0, 160)}`);
            }
          }
        }
      } catch (error) {
        out(`${at}  [błąd odczytu] ${error instanceof Error ? error.message : String(error)} (ponowię)`);
      }
      tick += 1;
      await new Promise((r) => setTimeout(r, opts.intervalMs));
    }
  } finally {
    mkdirSync(dirname(LOG), { recursive: true });
    appendFileSync(LOG, `${JSON.stringify({ at: started, args: ['payments-live-watch', '<target>'], reads: budget.used, maxDocs: budget.maxDocs, status: 'ok' })}\n`);
    process.stderr.write(`[payments-live-watch] koniec: ${tick} obiegów, odczyty Firestore ${budget.used} / ${budget.maxDocs}\n`);
  }
};

main().catch((error) => { process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`); process.exit(1); });
