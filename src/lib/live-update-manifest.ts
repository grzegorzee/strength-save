import { parseOtaBundleId } from '@/lib/live-update-version';

// Manifest kanału OTA: koperta { payload, signature } podpisana kluczem prywatnym
// z ~/FIRMA/_secrets (RSASSA-PKCS1-v1_5 / SHA-256, ten sam klucz co podpis ZIP
// weryfikowany natywnie przez @capawesome/capacitor-live-update). Aplikacja
// odrzuca manifest bez poprawnego podpisu, z innego kanału/platformy/wersji
// natywnej albo starszy niż ostatnio widziany (sequence = ochrona przed replay).

export type LiveUpdateChannel = 'internal' | 'production';
export type LiveUpdatePlatform = 'ios' | 'android';

export const LIVE_UPDATE_MANIFEST_SCHEMA = 1;

export interface LiveUpdateTarget {
  bundleId: string;
  otaNumber: number;
  url: string;
  sha256: string;
  /** Podpis RSA pliku ZIP (base64) — weryfikuje natywny plugin przed rozpakowaniem. */
  signature: string;
  size: number;
  minNativeBuild: number;
  /** Nazwy natywnych pluginów Capacitora wymaganych przez pakiet (Capacitor.isPluginAvailable). */
  requiredPlugins: string[];
  nativeFingerprint: string;
  sourceCommit: string;
  rolloutPercent: number;
}

export interface LiveUpdateManifestPayload {
  schema: typeof LIVE_UPDATE_MANIFEST_SCHEMA;
  channel: LiveUpdateChannel;
  platform: LiveUpdatePlatform;
  nativeVersion: string;
  sequence: number;
  publishedAt: string;
  /** null = wyłącznik: wszyscy wracają do bundla wbudowanego w binarkę. */
  target: LiveUpdateTarget | null;
}

export type ManifestVerification =
  | { status: 'ok'; payload: LiveUpdateManifestPayload }
  | { status: 'invalid'; reason: string };

export interface ManifestExpectation {
  channel: LiveUpdateChannel;
  platform: LiveUpdatePlatform;
  nativeVersion: string;
  minSequence: number;
  allowInsecureLocalhost: boolean;
}

const isRecord = (value: unknown): value is Record<string, unknown> => (
  typeof value === 'object' && value !== null && !Array.isArray(value)
);

const base64ToBytes = (value: string): Uint8Array => {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return bytes;
};

export const pemToSpki = (pem: string): Uint8Array => base64ToBytes(
  pem.replace(/-----(BEGIN|END) PUBLIC KEY-----/g, '').replace(/\s+/g, ''),
);

const isAllowedUrl = (value: unknown, allowInsecureLocalhost: boolean): boolean => {
  if (typeof value !== 'string') return false;
  try {
    const url = new URL(value);
    if (url.protocol === 'https:') return true;
    return allowInsecureLocalhost && url.protocol === 'http:'
      && (url.hostname === 'localhost' || url.hostname === '127.0.0.1');
  } catch {
    return false;
  }
};

const isPositiveInt = (value: unknown): value is number => Number.isSafeInteger(value) && (value as number) > 0;

export const validateManifestPayload = (
  value: unknown,
  expected: ManifestExpectation,
): ManifestVerification => {
  if (!isRecord(value)) return { status: 'invalid', reason: 'payload-not-object' };
  if (value.schema !== LIVE_UPDATE_MANIFEST_SCHEMA) return { status: 'invalid', reason: 'schema' };
  if (value.channel !== expected.channel) return { status: 'invalid', reason: 'channel-mismatch' };
  if (value.platform !== expected.platform) return { status: 'invalid', reason: 'platform-mismatch' };
  if (value.nativeVersion !== expected.nativeVersion) return { status: 'invalid', reason: 'native-version-mismatch' };
  if (!isPositiveInt(value.sequence)) return { status: 'invalid', reason: 'sequence' };
  if (value.sequence < expected.minSequence) return { status: 'invalid', reason: 'stale-sequence' };
  if (typeof value.publishedAt !== 'string') return { status: 'invalid', reason: 'published-at' };
  const target = value.target;
  if (target !== null) {
    if (!isRecord(target)) return { status: 'invalid', reason: 'target' };
    const parsed = parseOtaBundleId(target.bundleId as string);
    if (!parsed || parsed.nativeVersion !== expected.nativeVersion || parsed.otaNumber !== target.otaNumber) {
      return { status: 'invalid', reason: 'bundle-id' };
    }
    if (!isAllowedUrl(target.url, expected.allowInsecureLocalhost)) return { status: 'invalid', reason: 'url' };
    if (typeof target.sha256 !== 'string' || !/^[0-9a-f]{64}$/.test(target.sha256)) {
      return { status: 'invalid', reason: 'sha256' };
    }
    if (typeof target.signature !== 'string' || target.signature.length < 16) {
      return { status: 'invalid', reason: 'bundle-signature' };
    }
    if (!isPositiveInt(target.size)) return { status: 'invalid', reason: 'size' };
    if (!isPositiveInt(target.minNativeBuild)) return { status: 'invalid', reason: 'min-native-build' };
    if (!Array.isArray(target.requiredPlugins) || target.requiredPlugins.some((name) => typeof name !== 'string')) {
      return { status: 'invalid', reason: 'required-plugins' };
    }
    if (typeof target.nativeFingerprint !== 'string' || typeof target.sourceCommit !== 'string') {
      return { status: 'invalid', reason: 'provenance' };
    }
    const rollout = target.rolloutPercent;
    if (!Number.isInteger(rollout) || (rollout as number) < 0 || (rollout as number) > 100) {
      return { status: 'invalid', reason: 'rollout' };
    }
  }
  return { status: 'ok', payload: value as unknown as LiveUpdateManifestPayload };
};

/** Weryfikacja podpisu koperty i treści manifestu. Nigdy nie rzuca. */
export const verifyManifestEnvelope = async (
  envelope: unknown,
  publicKeyPem: string,
  expected: ManifestExpectation,
): Promise<ManifestVerification> => {
  try {
    if (!isRecord(envelope) || typeof envelope.payload !== 'string' || typeof envelope.signature !== 'string') {
      return { status: 'invalid', reason: 'envelope' };
    }
    const subtle = globalThis.crypto?.subtle;
    if (!subtle) return { status: 'invalid', reason: 'no-webcrypto' };
    const algorithm = { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' } as const;
    const key = await subtle.importKey('spki', pemToSpki(publicKeyPem), algorithm, false, ['verify']);
    const verified = await subtle.verify(
      algorithm,
      key,
      base64ToBytes(envelope.signature),
      new TextEncoder().encode(envelope.payload),
    );
    if (!verified) return { status: 'invalid', reason: 'signature' };
    let payload: unknown;
    try {
      payload = JSON.parse(envelope.payload);
    } catch {
      return { status: 'invalid', reason: 'payload-json' };
    }
    return validateManifestPayload(payload, expected);
  } catch {
    return { status: 'invalid', reason: 'signature' };
  }
};

/** Ścieżka obiektu manifestu w buckecie: live-updates/<kanał>/<platforma>/<wersja>/manifest.json */
export const manifestObjectPath = (
  channel: LiveUpdateChannel,
  platform: LiveUpdatePlatform,
  nativeVersion: string,
): string => `live-updates/${channel}/${platform}/${nativeVersion}/manifest.json`;
