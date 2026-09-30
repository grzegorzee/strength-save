import { webcrypto } from 'node:crypto';
import type { LiveUpdateManifestPayload, LiveUpdateTarget } from '@/lib/live-update-manifest';

// Testowa para kluczy RSA-2048 generowana w locie (nigdy produkcyjny klucz).
const subtle = webcrypto.subtle;
const ALG = { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' } as const;

const toBase64 = (bytes: ArrayBuffer): string => Buffer.from(new Uint8Array(bytes)).toString('base64');

export const createTestKeyPair = async () => {
  const pair = await subtle.generateKey(
    { ...ALG, modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]) },
    true,
    ['sign', 'verify'],
  ) as CryptoKeyPair;
  const spki = await subtle.exportKey('spki', pair.publicKey);
  const pem = `-----BEGIN PUBLIC KEY-----\n${toBase64(spki).match(/.{1,64}/g)!.join('\n')}\n-----END PUBLIC KEY-----\n`;
  const sign = async (text: string): Promise<string> => toBase64(
    await subtle.sign(ALG, pair.privateKey, new TextEncoder().encode(text)),
  );
  return { pem, sign };
};

export const makeTarget = (overrides: Partial<LiveUpdateTarget> = {}): LiveUpdateTarget => ({
  bundleId: '1.0.1-ota.2',
  otaNumber: 2,
  url: 'https://firebasestorage.googleapis.com/v0/b/x/o/live-updates%2Fbundles%2F1.0.1-ota.2.zip?alt=media',
  sha256: 'a'.repeat(64),
  signature: 'c2lnbmF0dXJlLW9mLXppcA==',
  size: 1234,
  minNativeBuild: 153,
  requiredPlugins: ['App', 'LiveUpdate'],
  nativeFingerprint: 'f'.repeat(64),
  sourceCommit: 'b'.repeat(40),
  rolloutPercent: 100,
  ...overrides,
});

export const makePayload = (overrides: Partial<LiveUpdateManifestPayload> = {}): LiveUpdateManifestPayload => ({
  schema: 1,
  channel: 'production',
  platform: 'ios',
  nativeVersion: '1.0.1',
  sequence: 5,
  publishedAt: '2026-09-30T10:00:00.000Z',
  target: makeTarget(),
  ...overrides,
});

export const signEnvelope = async (
  sign: (text: string) => Promise<string>,
  payload: unknown,
): Promise<{ payload: string; signature: string }> => {
  const text = JSON.stringify(payload);
  return { payload: text, signature: await sign(text) };
};
