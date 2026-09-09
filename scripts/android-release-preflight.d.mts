export function validateGoogleSdkKey(candidate: unknown): {
  ok: boolean;
  reason: 'missing' | 'secret-key' | 'test-store' | 'wrong-platform' | 'malformed' | 'valid';
};
