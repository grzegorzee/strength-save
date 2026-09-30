// Logika publikacji OTA bez side-effectów sieciowych (testowana w
// src/test/live-update-publish.test.ts). Zasady: docs/LIVE-UPDATES.md.
import { createHash, createSign, createVerify } from 'node:crypto';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

export const CHANNELS = ['internal', 'production'];
export const PLATFORMS = ['ios', 'android'];
export const OTA_ID = /^((0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*))-ota\.([1-9]\d*)$/;

export const sha256 = (data) => createHash('sha256').update(data).digest('hex');

export const stableJson = (value) => {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableJson(value[key])}`).join(',')}}`;
  }
  return JSON.stringify(value);
};

const readJson = (path) => JSON.parse(readFileSync(path, 'utf8'));

const JS_NAME = /registerPlugin(?:<[^>]*>)?\(\s*['"]([A-Za-z0-9_]+)['"]/g;

const listFiles = (dir) => {
  if (!existsSync(dir)) return [];
  const out = [];
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) out.push(...listFiles(path));
    else out.push(path);
  }
  return out;
};

/** Natywne pluginy Capacitora z package.json (wersje z node_modules = to, co zbuduje cap sync). */
export const collectCapacitorPlugins = (root) => {
  const pkg = readJson(join(root, 'package.json'));
  const plugins = [];
  for (const name of Object.keys(pkg.dependencies ?? {}).sort()) {
    const manifestPath = join(root, 'node_modules', name, 'package.json');
    if (!existsSync(manifestPath)) continue;
    const manifest = readJson(manifestPath);
    if (!manifest.capacitor) continue;
    const jsNames = new Set();
    for (const file of listFiles(join(root, 'node_modules', name, 'dist', 'esm')).filter((f) => f.endsWith('.js'))) {
      for (const match of readFileSync(file, 'utf8').matchAll(JS_NAME)) jsNames.add(match[1]);
    }
    plugins.push({ name, version: manifest.version, jsNames: [...jsNames].sort() });
  }
  const core = Object.fromEntries(['@capacitor/core', '@capacitor/ios', '@capacitor/android'].map((name) => {
    const path = join(root, 'node_modules', name, 'package.json');
    return [name, existsSync(path) ? readJson(path).version : null];
  }));
  return { plugins, core };
};

// Lokalny kod natywny, od którego zależy warstwa JS (własne pluginy, uprawnienia,
// konfiguracja Capacitora). Bez plików zmieniających się przy bumpie builda.
const LOCAL_NATIVE = {
  ios: {
    dirs: ['ios/App/App'],
    include: /\.(swift|m|h|plist|entitlements|xcprivacy)$/,
    exclude: /^ios\/App\/App\/(public\/|capacitor\.config\.json$|config\.xml$)/,
  },
  android: {
    dirs: ['android/app/src/main/java', 'android/app/src/main/res/xml'],
    files: ['android/app/src/main/AndroidManifest.xml', 'android/variables.gradle'],
    include: /\.(java|kt|xml|gradle)$/,
    exclude: /^$/,
  },
};

export const localNativeHash = (root, platform) => {
  const spec = LOCAL_NATIVE[platform];
  const files = [
    ...spec.dirs.flatMap((dir) => listFiles(join(root, dir))),
    ...(spec.files ?? []).map((file) => join(root, file)).filter((file) => existsSync(file)),
    join(root, 'capacitor.config.ts'),
  ]
    .map((file) => relative(root, file).split('\\').join('/'))
    .filter((file) => file === 'capacitor.config.ts' || (spec.include.test(file) && !spec.exclude.test(file)))
    .sort();
  const entries = files.map((file) => [file, sha256(readFileSync(join(root, file)))]);
  return { files: entries.length, sha256: sha256(stableJson(entries)) };
};

export const nativeInventory = (root, platform) => {
  const { plugins, core } = collectCapacitorPlugins(root);
  return {
    platform,
    core,
    plugins: plugins.map(({ name, version }) => ({ name, version })),
    requiredPlugins: [...new Set(plugins.flatMap((plugin) => plugin.jsNames))].sort(),
    localNative: localNativeHash(root, platform),
  };
};

export const inventoryFingerprint = (inventory) => sha256(stableJson({
  platform: inventory.platform,
  core: inventory.core,
  plugins: inventory.plugins,
  localNative: inventory.localNative.sha256,
}));

/** Różnice między warstwą natywną pakietu a buildem natywnym (pusta lista = zgodne). */
export const diffInventories = (bundle, baseline) => {
  const problems = [];
  for (const key of Object.keys({ ...bundle.core, ...baseline.core })) {
    if (bundle.core[key] !== baseline.core[key]) problems.push(`${key}: build ${baseline.core[key]} != pakiet ${bundle.core[key]}`);
  }
  const base = new Map(baseline.plugins.map((plugin) => [plugin.name, plugin.version]));
  const next = new Map(bundle.plugins.map((plugin) => [plugin.name, plugin.version]));
  for (const [name, version] of next) {
    if (!base.has(name)) problems.push(`nowy plugin natywny ${name}@${version} (wymaga builda sklepowego)`);
    else if (base.get(name) !== version) problems.push(`${name}: build ${base.get(name)} != pakiet ${version}`);
  }
  for (const [name, version] of base) {
    if (!next.has(name)) problems.push(`usunięty plugin natywny ${name}@${version} (wymaga builda sklepowego)`);
  }
  if (bundle.localNative.sha256 !== baseline.localNative.sha256) {
    problems.push('zmieniony lokalny kod/konfiguracja natywna (ios/App/App, android/app/src/main, capacitor.config.ts)');
  }
  return problems;
};

export const parseOtaId = (id) => {
  const match = OTA_ID.exec(String(id ?? ''));
  return match ? { nativeVersion: match[1], otaNumber: Number(match[5]) } : null;
};

/** Kolejny numer N dla wersji natywnej: max ze wszystkich znanych źródeł + 1. */
export const nextOtaNumber = (nativeVersion, knownIds) => {
  const numbers = knownIds
    .map(parseOtaId)
    .filter((parsed) => parsed && parsed.nativeVersion === nativeVersion)
    .map((parsed) => parsed.otaNumber);
  return (numbers.length ? Math.max(...numbers) : 0) + 1;
};

/**
 * Wybór bazowych buildów natywnych dla wersji: wszystkie baseline'y danej
 * platformy i wersji muszą mieć identyczny odcisk (zmiana natywna = nowa wersja).
 */
export const selectBaselines = (baselines, platform, nativeVersion) => {
  const matching = baselines.filter((b) => b.platform === platform && b.nativeVersion === nativeVersion);
  if (!matching.length) return { ok: false, reason: `brak baseline'u natywnego ${platform} ${nativeVersion} (zbuduj i zarejestruj build: npm run live-update:baseline)` };
  const fingerprints = new Set(matching.map((b) => b.fingerprint));
  if (fingerprints.size > 1) return { ok: false, reason: `baseline'y ${platform} ${nativeVersion} mają różne odciski natywne (niedozwolone w jednej wersji)` };
  const minNativeBuild = Math.min(...matching.map((b) => b.nativeBuild));
  return { ok: true, baseline: matching.find((b) => b.nativeBuild === minNativeBuild), minNativeBuild };
};

export const checkBundleCompatibility = (inventory, selected) => {
  if (!selected.ok) return [selected.reason];
  return diffInventories(inventory, selected.baseline.inventory);
};

export const signText = (privateKeyPem, text) => {
  const signer = createSign('RSA-SHA256');
  signer.update(text);
  return signer.sign(privateKeyPem, 'base64');
};

export const verifyText = (publicKeyPem, text, signature) => {
  const verifier = createVerify('RSA-SHA256');
  verifier.update(text);
  return verifier.verify(publicKeyPem, signature, 'base64');
};

export const buildManifestPayload = ({ channel, platform, nativeVersion, sequence, publishedAt, target }) => {
  if (!CHANNELS.includes(channel)) throw new Error(`Nieznany kanał: ${channel}`);
  if (!PLATFORMS.includes(platform)) throw new Error(`Nieznana platforma: ${platform}`);
  if (!Number.isSafeInteger(sequence) || sequence < 1) throw new Error('sequence musi być dodatnią liczbą');
  if (target) {
    const parsed = parseOtaId(target.bundleId);
    if (!parsed || parsed.nativeVersion !== nativeVersion) throw new Error(`Pakiet ${target.bundleId} nie pasuje do wersji ${nativeVersion}`);
    if (!/^https:\/\//.test(target.url) && !/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?\//.test(target.url)) {
      throw new Error('URL pakietu musi być HTTPS');
    }
  }
  return { schema: 1, channel, platform, nativeVersion, sequence, publishedAt, target: target ?? null };
};

export const signManifest = (privateKeyPem, payload) => {
  const text = JSON.stringify(payload);
  return { payload: text, signature: signText(privateKeyPem, text) };
};

export const BASELINE_DIR = 'release/live-updates/native-baselines';

export const loadBaselines = (root) => {
  const dir = join(root, BASELINE_DIR);
  return existsSync(dir)
    ? readdirSync(dir).filter((file) => file.endsWith('.json')).map((file) => readJson(join(dir, file)))
    : [];
};

export const manifestPath = (channel, platform, nativeVersion) => `live-updates/${channel}/${platform}/${nativeVersion}/manifest.json`;
export const bundlePath = (bundleId) => `live-updates/bundles/${bundleId}.zip`;

export const firebaseObjectUrl = (bucket, path) => (
  `https://firebasestorage.googleapis.com/v0/b/${bucket}/o/${encodeURIComponent(path)}?alt=media`
);
