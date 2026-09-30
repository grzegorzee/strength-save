#!/usr/bin/env node
// Publikacja aktualizacji OTA (JS/HTML/CSS) dla natywnej apki. Zasady i procedura:
// docs/LIVE-UPDATES.md. DOMYŚLNIE DRY-RUN: nic nie wysyła, tylko buduje, sprawdza,
// podpisuje i pokazuje plan. Wysyłka wyłącznie z jawnym --publish.
//
//   npm run live-update:publish -- --channel internal                 # dry-run nowego pakietu
//   npm run live-update:publish -- --channel internal --publish       # build + podpis + upload + odczyt
//   npm run live-update:publish -- --channel production --promote 1.0.1-ota.3 --publish
//   npm run live-update:publish -- --channel production --rollback [--to 1.0.1-ota.2|builtin] --publish
// Opcje: --platform ios|android|all (domyślnie all), --rollout 1..100 (domyślnie 100),
//        --local-dir DIR --base-url URL (test lokalny zamiast bucketu), --break-bundle (tylko lokalnie).
// Sekrety: klucz prywatny z ~/FIRMA/_secrets/projekty/strength_save-live-update/private.pem
// albo STRENGTH_SAVE_OTA_PRIVATE_KEY_FILE. Upload przez gcloud (ADC właściciela), odczyt
// kontrolny przez publiczny URL (tak jak aplikacja).
import { execFileSync } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import {
  bundlePath,
  buildManifestPayload,
  checkBundleCompatibility,
  CHANNELS,
  firebaseObjectUrl,
  loadBaselines,
  manifestPath,
  nativeInventory,
  nextOtaNumber,
  parseOtaId,
  PLATFORMS,
  selectBaselines,
  sha256,
  signManifest,
  signText,
  verifyText,
} from './live-update-helpers.mjs';

const ROOT = resolve(import.meta.dirname, '..');
const args = process.argv.slice(2);
const flag = (name) => args.includes(`--${name}`);
const value = (name) => {
  const index = args.indexOf(`--${name}`);
  return index >= 0 ? args[index + 1] : undefined;
};
const fail = (message) => {
  console.error(`ODMOWA: ${message}`);
  process.exit(1);
};
const log = (message) => console.log(message);

const publish = flag('publish');
const channel = value('channel') ?? 'internal';
const platformArg = value('platform') ?? 'all';
const rollout = Number(value('rollout') ?? 100);
const localDir = value('local-dir') ? resolve(value('local-dir')) : null;
const baseUrl = value('base-url');
const promoteId = value('promote');
const isRollback = flag('rollback');
const rollbackTo = value('to');
const breakBundle = flag('break-bundle');

if (!CHANNELS.includes(channel)) fail(`--channel musi być internal|production (jest: ${channel})`);
const platforms = platformArg === 'all' ? PLATFORMS : [platformArg];
if (platforms.some((platform) => !PLATFORMS.includes(platform))) fail(`--platform musi być ios|android|all`);
if (!Number.isInteger(rollout) || rollout < 1 || rollout > 100) fail('--rollout musi być liczbą 1..100');
if (localDir && !baseUrl) fail('--local-dir wymaga --base-url');
if (breakBundle && !localDir) fail('--break-bundle dozwolone wyłącznie z --local-dir (test lokalny)');
if (!localDir && (process.env.VITE_LIVE_UPDATE_BASE_URL || process.env.VITE_LIVE_UPDATE_ALLOW_INSECURE_LOCALHOST)) {
  fail('zmienne testowe VITE_LIVE_UPDATE_* ustawione: pakiet produkcyjny nie może wskazywać lokalnego serwera');
}

const version = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8')).version;
const publicKeyPem = readFileSync(join(ROOT, 'release/live-updates/public-key.pem'), 'utf8');
const baselineRoot = process.env.STRENGTH_SAVE_OTA_BASELINE_ROOT ? resolve(process.env.STRENGTH_SAVE_OTA_BASELINE_ROOT) : ROOT;

const readBucket = () => {
  if (value('bucket')) return value('bucket');
  if (process.env.VITE_FIREBASE_STORAGE_BUCKET) return process.env.VITE_FIREBASE_STORAGE_BUCKET;
  for (const file of ['.env.mobile.local', '.env.mobile', '.env.local', '.env']) {
    const path = join(ROOT, file);
    if (!existsSync(path)) continue;
    const match = readFileSync(path, 'utf8').match(/^VITE_FIREBASE_STORAGE_BUCKET=(.+)$/m);
    if (match) return match[1].trim().replace(/^["']|["']$/g, '');
  }
  return null;
};

// ---- magazyn obiektów: bucket Firebase (gcloud) albo katalog lokalny (test) ----
const bucket = localDir ? null : readBucket();
if (!localDir && !bucket) fail('nie znam bucketu (VITE_FIREBASE_STORAGE_BUCKET)');
const store = localDir
  ? {
    url: (path) => `${baseUrl.replace(/\/$/, '')}/${path}`,
    async read(path) {
      const file = join(localDir, path);
      return existsSync(file) ? readFileSync(file) : null;
    },
    async put(local, path) {
      const file = join(localDir, path);
      mkdirSync(dirname(file), { recursive: true });
      copyFileSync(local, file);
    },
  }
  : {
    url: (path) => firebaseObjectUrl(bucket, path),
    async read(path) {
      const response = await fetch(`${firebaseObjectUrl(bucket, path)}&cb=${Date.now()}`, { cache: 'no-store' });
      if (response.status === 404) return null;
      if (!response.ok) throw new Error(`HTTP ${response.status} przy odczycie ${path} (reguły storage wdrożone?)`);
      return Buffer.from(await response.arrayBuffer());
    },
    async put(local, path, { contentType, cacheControl }) {
      execFileSync('gcloud', [
        'storage', 'cp', `--content-type=${contentType}`, `--cache-control=${cacheControl}`,
        local, `gs://${bucket}/${path}`,
      ], { stdio: 'inherit' });
    },
  };

const ledgerFile = localDir ? join(localDir, 'ledger.json') : join(ROOT, 'release/live-updates/ledger.json');
const ledger = existsSync(ledgerFile) ? JSON.parse(readFileSync(ledgerFile, 'utf8')) : { schema: 1, entries: [] };
const saveLedger = () => writeFileSync(ledgerFile, `${JSON.stringify(ledger, null, 2)}\n`);

const readManifest = async (platform) => {
  const raw = await store.read(manifestPath(channel, platform, version));
  if (!raw) return null;
  const envelope = JSON.parse(raw.toString('utf8'));
  if (!verifyText(publicKeyPem, envelope.payload, envelope.signature)) fail(`manifest ${channel}/${platform} ma niepoprawny podpis`);
  return JSON.parse(envelope.payload);
};

const privateKey = () => {
  const path = process.env.STRENGTH_SAVE_OTA_PRIVATE_KEY_FILE
    ?? join(homedir(), 'FIRMA/_secrets/projekty/strength_save-live-update/private.pem');
  if (!existsSync(path)) fail(`brak klucza prywatnego OTA (${path})`);
  const pem = readFileSync(path, 'utf8');
  if (!verifyText(publicKeyPem, 'probe', signText(pem, 'probe'))) {
    fail('klucz prywatny nie pasuje do release/live-updates/public-key.pem (aplikacja odrzuciłaby pakiet)');
  }
  return pem;
};

const git = (...gitArgs) => execFileSync('git', gitArgs, { cwd: ROOT, encoding: 'utf8' }).trim();

// ---- kontrola zgodności natywnej (przed buildem) ----
const compatibility = () => {
  const baselines = loadBaselines(baselineRoot);
  const result = {};
  for (const platform of platforms) {
    const inventory = nativeInventory(ROOT, platform);
    const selected = selectBaselines(baselines, platform, version);
    const problems = checkBundleCompatibility(inventory, selected);
    if (problems.length) {
      fail(`pakiet wymaga innej warstwy natywnej niż build ${platform} ${version}:\n- ${problems.join('\n- ')}\n`
        + 'To zmiana dla App Review / Google Play (nowy build), nie OTA.');
    }
    const baseCommit = selected.baseline.sourceCommit;
    if (baseCommit) {
      try {
        execFileSync('git', ['merge-base', '--is-ancestor', baseCommit, 'HEAD'], { cwd: ROOT });
      } catch {
        fail(`źródło nie zawiera commita builda natywnego ${platform} ${selected.minNativeBuild} (${baseCommit.slice(0, 8)})`);
      }
    }
    result[platform] = { inventory, selected };
  }
  return result;
};

const readBack = async (plans) => {
  for (const plan of plans) {
    const payload = await readManifest(plan.platform);
    if (!payload || payload.sequence !== plan.payload.sequence
      || (payload.target?.bundleId ?? null) !== (plan.payload.target?.bundleId ?? null)) {
      fail(`odczyt kontrolny manifestu ${channel}/${plan.platform} nie zgadza się z publikacją`);
    }
    if (payload.target) {
      const bytes = await store.read(bundlePath(payload.target.bundleId));
      if (!bytes || sha256(bytes) !== payload.target.sha256) fail(`odczyt kontrolny pakietu ${payload.target.bundleId}: sha256 niezgodne`);
    }
    log(`Odczyt kontrolny OK: ${channel}/${plan.platform}/${version} sequence ${payload.sequence} -> ${payload.target?.bundleId ?? 'wbudowany'}`);
  }
};

const writeManifests = async (plans, key) => {
  const tmpDir = join(ROOT, 'tmp/live-updates');
  mkdirSync(tmpDir, { recursive: true });
  for (const plan of plans) {
    const file = join(tmpDir, `manifest-${channel}-${plan.platform}.json`);
    writeFileSync(file, `${JSON.stringify(signManifest(key, plan.payload))}\n`);
    await store.put(file, manifestPath(channel, plan.platform, version), {
      contentType: 'application/json',
      cacheControl: 'no-cache, max-age=0',
    });
  }
};

const nextSequence = async (platform) => {
  try {
    return ((await readManifest(platform))?.sequence ?? 0) + 1;
  } catch (error) {
    if (publish) throw error;
    log(`UWAGA: sequence ${channel}/${platform} nieznane (${error.message}); w planie 1.`);
    return 1;
  }
};

const printPlan = (title, plans) => {
  log(`\n${title} (${publish ? 'PUBLIKACJA' : 'DRY-RUN, nic nie wysłano'})`);
  for (const plan of plans) {
    log(`- ${store.url(manifestPath(channel, plan.platform, version))}`);
    log(JSON.stringify(plan.payload, null, 2));
  }
};

const main = async () => {
  if (isRollback || promoteId) {
    if (isRollback && promoteId) fail('--rollback i --promote wykluczają się');
    const compat = compatibility();
    const plans = [];
    for (const platform of platforms) {
      const current = await readManifest(platform);
      let target = null;
      let targetId = promoteId ?? rollbackTo;
      if (isRollback && !targetId) {
        const history = ledger.entries
          .flatMap((entry) => entry.published.map((pub) => ({ ...pub, bundleId: entry.bundleId })))
          .filter((pub) => pub.channel === channel && pub.platform === platform && parseOtaId(pub.bundleId)?.nativeVersion === version)
          .sort((a, b) => b.sequence - a.sequence);
        targetId = history.find((pub) => pub.bundleId !== current?.target?.bundleId)?.bundleId ?? 'builtin';
      }
      if (targetId !== 'builtin') {
        const entry = ledger.entries.find((item) => item.bundleId === targetId);
        if (!entry) fail(`nie znam pakietu ${targetId} (brak w rejestrze ${ledgerFile})`);
        if (parseOtaId(targetId)?.nativeVersion !== version) fail(`pakiet ${targetId} jest dla innej wersji natywnej niż ${version}`);
        if (entry.nativeFingerprints?.[platform] && entry.nativeFingerprints[platform] !== compat[platform].selected.baseline.fingerprint) {
          fail(`pakiet ${targetId} zbudowano dla innej warstwy natywnej ${platform}`);
        }
        if (!(await store.read(bundlePath(targetId)))) fail(`pakiet ${targetId} nie istnieje w magazynie`);
        target = {
          bundleId: entry.bundleId,
          otaNumber: entry.otaNumber,
          url: store.url(bundlePath(entry.bundleId)),
          sha256: entry.sha256,
          signature: entry.signature,
          size: entry.size,
          minNativeBuild: compat[platform].selected.minNativeBuild,
          requiredPlugins: compat[platform].inventory.requiredPlugins,
          nativeFingerprint: compat[platform].selected.baseline.fingerprint,
          sourceCommit: entry.sourceCommit,
          rolloutPercent: rollout,
        };
      }
      plans.push({
        platform,
        payload: buildManifestPayload({
          channel, platform, nativeVersion: version, sequence: (current?.sequence ?? 0) + 1,
          publishedAt: new Date().toISOString(), target,
        }),
      });
    }
    printPlan(isRollback ? 'ROLLBACK kanału' : 'PROMOCJA pakietu', plans);
    if (!publish) return;
    await writeManifests(plans, privateKey());
    await readBack(plans);
    for (const plan of plans) {
      const entry = ledger.entries.find((item) => item.bundleId === plan.payload.target?.bundleId);
      entry?.published.push({ channel, platform: plan.platform, sequence: plan.payload.sequence, rolloutPercent: rollout, at: plan.payload.publishedAt, kind: isRollback ? 'rollback' : 'promote' });
    }
    ledger.events = [...(ledger.events ?? []), ...plans.map((plan) => ({ kind: isRollback ? 'rollback' : 'promote', channel, platform: plan.platform, sequence: plan.payload.sequence, target: plan.payload.target?.bundleId ?? 'builtin', at: plan.payload.publishedAt }))];
    saveLedger();
    return;
  }

  // ---- nowy pakiet ----
  if (publish && !localDir) {
    const dirty = git('status', '--porcelain', '--untracked-files=no');
    if (dirty) fail('niezacommitowane zmiany w śledzonych plikach: pakiet musi odpowiadać commitowi (sourceCommit)');
  }
  const compat = compatibility();
  const sourceCommit = git('rev-parse', 'HEAD');
  const known = [...ledger.entries.map((entry) => entry.bundleId)];
  for (const ch of CHANNELS) {
    for (const platform of PLATFORMS) {
      let raw = null;
      try {
        raw = await store.read(manifestPath(ch, platform, version));
      } catch (error) {
        // Dry-run przed wdrożeniem reguł storage: plan liczony z rejestru lokalnego.
        if (publish) throw error;
        log(`UWAGA: nie odczytano ${manifestPath(ch, platform, version)} (${error.message}); numer N z rejestru lokalnego.`);
      }
      if (raw) known.push(JSON.parse(JSON.parse(raw.toString('utf8')).payload).target?.bundleId);
    }
  }
  const otaNumber = nextOtaNumber(version, known.filter(Boolean));
  const bundleId = `${version}-ota.${otaNumber}`;
  if (await store.read(bundlePath(bundleId)).catch((error) => { if (publish) throw error; return null; })) {
    fail(`pakiet ${bundleId} już istnieje (pakiety są niezmienne)`);
  }
  log(`Pakiet: ${bundleId} (źródło ${sourceCommit.slice(0, 12)})`);

  const env = { ...process.env, STRENGTH_SAVE_OTA_ID: bundleId };
  execFileSync('npm', ['run', 'build:mobile'], { cwd: ROOT, stdio: 'inherit', env });
  const dist = join(ROOT, 'dist');
  const assets = readdirSync(join(dist, 'assets')).filter((file) => file.endsWith('.js'));
  if (!assets.some((file) => readFileSync(join(dist, 'assets', file), 'utf8').includes(JSON.stringify(bundleId).slice(1, -1)))) {
    fail(`build nie zawiera identyfikatora ${bundleId} (__OTA_ID__)`);
  }
  if (breakBundle) {
    // Test rollbacku: pakiet bez działającego JS nigdy nie zgłosi gotowości.
    writeFileSync(join(dist, 'index.html'), '<!doctype html><html><body>broken OTA test bundle</body></html>\n');
  } else {
    execFileSync('npm', ['run', 'check:dist-smoke'], { cwd: ROOT, stdio: 'inherit' });
  }

  const outDir = join(ROOT, 'tmp/live-updates');
  mkdirSync(outDir, { recursive: true });
  const zipFile = join(outDir, `${bundleId}.zip`);
  rmSync(zipFile, { force: true });
  execFileSync('zip', ['-r', '-X', '-q', zipFile, '.'], { cwd: dist });
  // dist/ zawiera teraz pakiet z identyfikatorem OTA: przenosimy go, żeby nie
  // trafił jako bundle wbudowany do builda sklepowego (cap sync bez build:mobile).
  const parkedDist = join(outDir, `dist-${bundleId}-${Date.now()}`);
  renameSync(dist, parkedDist);
  log(`dist/ przeniesiony do ${parkedDist} (przed buildem natywnym: npm run build:mobile)`);
  const zipBytes = readFileSync(zipFile);
  const key = privateKey();
  const signature = signText(key, zipBytes);
  if (!verifyText(publicKeyPem, zipBytes, signature)) fail('podpis pakietu nie weryfikuje się kluczem publicznym aplikacji');
  const digest = sha256(zipBytes);
  log(`ZIP ${zipBytes.length} B, sha256 ${digest}`);

  const plans = [];
  for (const platform of platforms) {
    const { inventory, selected } = compat[platform];
    plans.push({
      platform,
      payload: buildManifestPayload({
        channel,
        platform,
        nativeVersion: version,
        sequence: await nextSequence(platform),
        publishedAt: new Date().toISOString(),
        target: {
          bundleId,
          otaNumber,
          url: store.url(bundlePath(bundleId)),
          sha256: digest,
          signature,
          size: zipBytes.length,
          minNativeBuild: selected.minNativeBuild,
          requiredPlugins: inventory.requiredPlugins,
          nativeFingerprint: selected.baseline.fingerprint,
          sourceCommit,
          rolloutPercent: rollout,
        },
      }),
    });
  }
  printPlan('NOWY PAKIET', plans);
  if (!publish) {
    log('\nDry-run zakończony. Wysyłka: dodaj --publish.');
    return;
  }

  await store.put(zipFile, bundlePath(bundleId), {
    contentType: 'application/zip',
    cacheControl: 'public, max-age=31536000, immutable',
  });
  await writeManifests(plans, key);
  await readBack(plans);
  ledger.entries.push({
    bundleId,
    nativeVersion: version,
    otaNumber,
    sha256: digest,
    size: zipBytes.length,
    signature,
    sourceCommit,
    builtAt: new Date().toISOString(),
    nativeFingerprints: Object.fromEntries(platforms.map((platform) => [platform, compat[platform].selected.baseline.fingerprint])),
    published: plans.map((plan) => ({ channel, platform: plan.platform, sequence: plan.payload.sequence, rolloutPercent: rollout, at: plan.payload.publishedAt, kind: 'publish' })),
  });
  saveLedger();
  log(`\nOpublikowano ${bundleId} na kanał ${channel}. Rejestr: ${ledgerFile}`);
  log('Dalej: przegląd client_errors w ciągu 24 h (kody live-update-*, appVersion z identyfikatorem pakietu).');
};

await main();
