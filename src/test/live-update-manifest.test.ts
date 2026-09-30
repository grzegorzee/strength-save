import { beforeAll, describe, expect, it } from 'vitest';
import {
  manifestObjectPath,
  validateManifestPayload,
  verifyManifestEnvelope,
  type ManifestExpectation,
} from '@/lib/live-update-manifest';
import { createTestKeyPair, makePayload, makeTarget, signEnvelope } from './live-update-test-keys';

const expected: ManifestExpectation = {
  channel: 'production',
  platform: 'ios',
  nativeVersion: '1.0.1',
  minSequence: 0,
  allowInsecureLocalhost: false,
};

describe('manifest OTA: podpis i treść', () => {
  let keys: Awaited<ReturnType<typeof createTestKeyPair>>;
  let otherKeys: Awaited<ReturnType<typeof createTestKeyPair>>;
  beforeAll(async () => {
    keys = await createTestKeyPair();
    otherKeys = await createTestKeyPair();
  });

  it('przyjmuje manifest podpisany naszym kluczem', async () => {
    const envelope = await signEnvelope(keys.sign, makePayload());
    const result = await verifyManifestEnvelope(envelope, keys.pem, expected);
    expect(result.status).toBe('ok');
  });

  it('odrzuca podpis innym kluczem i podmienioną treść', async () => {
    const foreign = await signEnvelope(otherKeys.sign, makePayload());
    expect(await verifyManifestEnvelope(foreign, keys.pem, expected)).toEqual({ status: 'invalid', reason: 'signature' });

    const envelope = await signEnvelope(keys.sign, makePayload());
    const tampered = { ...envelope, payload: envelope.payload.replace('"rolloutPercent":100', '"rolloutPercent":99') };
    expect(await verifyManifestEnvelope(tampered, keys.pem, expected)).toEqual({ status: 'invalid', reason: 'signature' });
  });

  it('uszkodzony manifest (nie-JSON, brak pól, zły base64) = invalid, nigdy wyjątek', async () => {
    for (const broken of [null, 'x', 42, {}, { payload: 'x' }, { payload: '{}', signature: '%%%' }, []]) {
      const result = await verifyManifestEnvelope(broken, keys.pem, expected);
      expect(result.status).toBe('invalid');
    }
    const notJson = { payload: '{not json', signature: await keys.sign('{not json') };
    expect(await verifyManifestEnvelope(notJson, keys.pem, expected)).toEqual({ status: 'invalid', reason: 'payload-json' });
  });

  it('odrzuca manifest innego kanału, platformy, wersji natywnej i starszy (replay)', async () => {
    const cases: Array<[Parameters<typeof makePayload>[0], string]> = [
      [{ channel: 'internal' }, 'channel-mismatch'],
      [{ platform: 'android' }, 'platform-mismatch'],
      [{ nativeVersion: '1.0.2', target: makeTarget({ bundleId: '1.0.2-ota.2' }) }, 'native-version-mismatch'],
    ];
    for (const [override, reason] of cases) {
      const envelope = await signEnvelope(keys.sign, makePayload(override));
      expect(await verifyManifestEnvelope(envelope, keys.pem, expected)).toEqual({ status: 'invalid', reason });
    }
    const old = await signEnvelope(keys.sign, makePayload({ sequence: 4 }));
    expect(await verifyManifestEnvelope(old, keys.pem, { ...expected, minSequence: 5 }))
      .toEqual({ status: 'invalid', reason: 'stale-sequence' });
  });

  it('pakiet musi mieć identyfikator <wersja natywna>-ota.<N> zgodny z otaNumber', () => {
    expect(validateManifestPayload(makePayload({ target: makeTarget({ bundleId: '1.0.0-ota.2' }) }), expected))
      .toEqual({ status: 'invalid', reason: 'bundle-id' });
    expect(validateManifestPayload(makePayload({ target: makeTarget({ otaNumber: 3 }) }), expected))
      .toEqual({ status: 'invalid', reason: 'bundle-id' });
    expect(validateManifestPayload(makePayload({ target: makeTarget({ bundleId: 'evil/../x' }) }), expected))
      .toEqual({ status: 'invalid', reason: 'bundle-id' });
  });

  it('tylko HTTPS (http://localhost wyłącznie w buildzie testowym)', () => {
    const local = makePayload({ target: makeTarget({ url: 'http://localhost:8787/b.zip' }) });
    expect(validateManifestPayload(local, expected)).toEqual({ status: 'invalid', reason: 'url' });
    expect(validateManifestPayload(local, { ...expected, allowInsecureLocalhost: true }).status).toBe('ok');
    const remoteHttp = makePayload({ target: makeTarget({ url: 'http://evil.example/b.zip' }) });
    expect(validateManifestPayload(remoteHttp, { ...expected, allowInsecureLocalhost: true }))
      .toEqual({ status: 'invalid', reason: 'url' });
  });

  it('pola kompatybilności i rolloutu są walidowane', () => {
    expect(validateManifestPayload(makePayload({ target: makeTarget({ minNativeBuild: 0 }) }), expected).status).toBe('invalid');
    expect(validateManifestPayload(makePayload({ target: makeTarget({ rolloutPercent: 101 }) }), expected).status).toBe('invalid');
    expect(validateManifestPayload(makePayload({ target: makeTarget({ sha256: 'xyz' }) }), expected).status).toBe('invalid');
    expect(validateManifestPayload(makePayload({ target: null }), expected).status).toBe('ok');
  });

  it('ścieżka manifestu per kanał, platforma i wersja natywna', () => {
    expect(manifestObjectPath('internal', 'android', '1.0.1')).toBe('live-updates/internal/android/1.0.1/manifest.json');
  });
});
