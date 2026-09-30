import { spawnSync } from 'node:child_process';
import { generateKeyPairSync } from 'node:crypto';
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  buildManifestPayload,
  diffInventories,
  inventoryFingerprint,
  nativeInventory,
  nextOtaNumber,
  selectBaselines,
  signManifest,
} from '../../scripts/live-update-helpers.mjs';
import { verifyManifestEnvelope } from '@/lib/live-update-manifest';

const inventory = (overrides: Record<string, unknown> = {}) => ({
  platform: 'ios',
  core: { '@capacitor/core': '8.4.0', '@capacitor/ios': '8.4.0', '@capacitor/android': '8.4.0' },
  plugins: [{ name: '@capacitor/app', version: '8.1.0' }, { name: '@capawesome/capacitor-live-update', version: '8.4.4' }],
  requiredPlugins: ['App', 'LiveUpdate'],
  localNative: { files: 3, sha256: 'a'.repeat(64) },
  ...overrides,
});

const target = {
  bundleId: '1.0.1-ota.1',
  otaNumber: 1,
  url: 'https://firebasestorage.googleapis.com/v0/b/b/o/x?alt=media',
  sha256: 'a'.repeat(64),
  signature: 'c2lnbmF0dXJlLW9mLXppcA==',
  size: 10,
  minNativeBuild: 153,
  requiredPlugins: ['App'],
  nativeFingerprint: 'f'.repeat(64),
  sourceCommit: 'b'.repeat(40),
  rolloutPercent: 100,
};

describe('publikacja OTA: kontrola zgodności natywnej', () => {
  it('ta sama warstwa natywna = zgodne', () => {
    expect(diffInventories(inventory(), inventory())).toEqual([]);
  });

  it('nowy plugin, zmiana wersji pluginu, Capacitora albo lokalnego kodu natywnego = odmowa', () => {
    const added = inventory({ plugins: [...inventory().plugins, { name: '@capacitor/geolocation', version: '8.0.0' }] });
    expect(diffInventories(added, inventory()).join()).toMatch(/nowy plugin natywny @capacitor\/geolocation/);
    const bumped = inventory({ plugins: [{ name: '@capacitor/app', version: '8.2.0' }, inventory().plugins[1]] });
    expect(diffInventories(bumped, inventory()).join()).toMatch(/@capacitor\/app: build 8\.1\.0 != pakiet 8\.2\.0/);
    const core = inventory({ core: { ...inventory().core, '@capacitor/ios': '8.5.0' } });
    expect(diffInventories(core, inventory()).join()).toMatch(/@capacitor\/ios/);
    const local = inventory({ localNative: { files: 3, sha256: 'b'.repeat(64) } });
    expect(diffInventories(local, inventory()).join()).toMatch(/lokalny kod/);
    const removed = inventory({ plugins: [inventory().plugins[0]] });
    expect(diffInventories(removed, inventory()).join()).toMatch(/usunięty plugin/);
  });

  it('baseline: brak = odmowa; różne odciski w jednej wersji = odmowa; min build = najniższy', () => {
    expect(selectBaselines([], 'ios', '1.0.1').ok).toBe(false);
    const b = (build: number, fingerprint = 'x') => ({ platform: 'ios', nativeVersion: '1.0.1', nativeBuild: build, fingerprint, inventory: inventory() });
    expect(selectBaselines([b(153), b(154, 'y')], 'ios', '1.0.1').ok).toBe(false);
    const selected = selectBaselines([b(155), b(153), { ...b(150), nativeVersion: '1.0.0' }], 'ios', '1.0.1');
    expect(selected).toMatchObject({ ok: true, minNativeBuild: 153 });
  });

  it('N rośnie monotonicznie per wersja natywna', () => {
    expect(nextOtaNumber('1.0.1', [])).toBe(1);
    expect(nextOtaNumber('1.0.1', ['1.0.1-ota.1', '1.0.1-ota.3', '1.0.0-ota.9', 'x'])).toBe(4);
  });

  it('manifest: identyfikator musi pasować do wersji, URL tylko HTTPS', () => {
    const base = { channel: 'internal', platform: 'ios', nativeVersion: '1.0.1', sequence: 1, publishedAt: 'now' };
    expect(() => buildManifestPayload({ ...base, target: { ...target, bundleId: '1.0.2-ota.1' } })).toThrow();
    expect(() => buildManifestPayload({ ...base, target: { ...target, url: 'http://evil.example/x.zip' } })).toThrow();
    expect(() => buildManifestPayload({ ...base, channel: 'beta', target })).toThrow();
    expect(buildManifestPayload({ ...base, target: null }).target).toBeNull();
  });

  it('podpis Node (skrypt) jest weryfikowany przez WebCrypto (aplikacja)', async () => {
    const { privateKey, publicKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
    const payload = buildManifestPayload({ channel: 'internal', platform: 'ios', nativeVersion: '1.0.1', sequence: 3, publishedAt: '2026-09-30T00:00:00Z', target });
    const envelope = signManifest(privateKey.export({ type: 'pkcs8', format: 'pem' }), payload);
    const result = await verifyManifestEnvelope(envelope, publicKey.export({ type: 'spki', format: 'pem' }) as string, {
      channel: 'internal', platform: 'ios', nativeVersion: '1.0.1', minSequence: 0, allowInsecureLocalhost: false,
    });
    expect(result.status).toBe('ok');
  });

  it('bieżące źródła mają zarejestrowany, zgodny baseline 1.0.1 dla obu platform', () => {
    for (const [platform, build] of [['ios', 153], ['android', 57]] as const) {
      const baseline = JSON.parse(readFileSync(`release/live-updates/native-baselines/${platform}-1.0.1-${build}.json`, 'utf8'));
      expect(baseline.fingerprint).toBe(inventoryFingerprint(nativeInventory(process.cwd(), platform)));
      expect(baseline.inventory.plugins.map((p: { name: string }) => p.name)).toContain('@capawesome/capacitor-live-update');
    }
  });
});

describe('publish-live-update.mjs: odmowy przed buildem', () => {
  const run = (args: string[], env: Record<string, string> = {}) => spawnSync(
    process.execPath,
    ['scripts/publish-live-update.mjs', ...args],
    { encoding: 'utf8', env: { ...process.env, ...env }, timeout: 60_000 },
  );

  const baselineRootWith = (mutate: (baseline: Record<string, unknown>) => void) => {
    const root = mkdtempSync(join(tmpdir(), 'ota-baseline-'));
    const dir = join(root, 'release/live-updates/native-baselines');
    mkdirSync(dir, { recursive: true });
    const baseline = JSON.parse(readFileSync('release/live-updates/native-baselines/ios-1.0.1-153.json', 'utf8'));
    mutate(baseline);
    writeFileSync(join(dir, 'ios-1.0.1-153.json'), JSON.stringify(baseline));
    return root;
  };

  it('odmawia, gdy pakiet ma plugin natywny, którego build nie zawiera', () => {
    const root = baselineRootWith((baseline) => {
      const inv = baseline.inventory as { plugins: Array<{ name: string }> };
      inv.plugins = inv.plugins.filter((plugin) => plugin.name !== '@capacitor/camera');
    });
    const result = run(['--platform', 'ios', '--local-dir', join(root, 'out'), '--base-url', 'http://localhost:1'], { STRENGTH_SAVE_OTA_BASELINE_ROOT: root });
    expect(result.status).toBe(1);
    expect(result.stderr).toMatch(/ODMOWA/);
    expect(result.stderr).toMatch(/nowy plugin natywny @capacitor\/camera/);
    expect(result.stdout).not.toMatch(/build:mobile/);
  });

  it('odmawia bez baseline\'u dla wersji natywnej', () => {
    const root = mkdtempSync(join(tmpdir(), 'ota-empty-'));
    const result = run(['--platform', 'android', '--local-dir', join(root, 'out'), '--base-url', 'http://localhost:1'], { STRENGTH_SAVE_OTA_BASELINE_ROOT: root });
    expect(result.status).toBe(1);
    expect(result.stderr).toMatch(/brak baseline/);
  });

  it('odmawia testowych zmiennych w pakiecie dla bucketu i --break-bundle poza testem lokalnym', () => {
    expect(run(['--channel', 'internal'], { VITE_LIVE_UPDATE_BASE_URL: 'http://localhost:8787' }).stderr).toMatch(/VITE_LIVE_UPDATE/);
    expect(run(['--break-bundle']).stderr).toMatch(/break-bundle/);
    expect(run(['--channel', 'beta']).stderr).toMatch(/--channel/);
  });
});
