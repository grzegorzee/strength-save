import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const validateGoogleSdkKey = (candidate) => {
  if (typeof candidate !== 'string' || candidate.length === 0) return { ok: false, reason: 'missing' };
  if (candidate.startsWith('sk_')) return { ok: false, reason: 'secret-key' };
  if (candidate.startsWith('test_')) return { ok: false, reason: 'test-store' };
  if (candidate.startsWith('appl_')) return { ok: false, reason: 'wrong-platform' };
  if (!/^goog_[A-Za-z0-9]{12,}$/.test(candidate)) return { ok: false, reason: 'malformed' };
  return { ok: true, reason: 'valid' };
};

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  // Identical precedence/mode to Vite build:mobile; never echo the key itself.
  const { loadEnv } = await import('vite');
  const mobile = loadEnv('mobile', process.cwd(), 'VITE_');
  const candidate = process.env.VITE_REVENUECAT_GOOGLE_API_KEY ?? mobile.VITE_REVENUECAT_GOOGLE_API_KEY;
  const result = validateGoogleSdkKey(candidate);
  if (!result.ok) {
    console.error(`Android release preflight failed: VITE_REVENUECAT_GOOGLE_API_KEY (${result.reason}).`);
    process.exitCode = 1;
  } else if (process.argv.includes('--json')) {
    console.log(JSON.stringify({ ok: true, google_sdk_key_sha256: createHash('sha256').update(candidate).digest('hex') }));
  } else {
    console.log('Android release preflight passed: production Google public SDK key is configured.');
  }
}
