import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const secretPath = resolve('functions/.secret.local');
const emulatorSecrets = [
  '# Wartości wyłącznie dla lokalnego emulatora. Plik jest ignorowany przez Git.',
  'SES_REGION=eu-central-1',
  'SES_ACCESS_KEY_ID=e2e-emulator-only',
  'SES_SECRET_ACCESS_KEY=e2e-emulator-only',
  'SES_FROM=Strength Save <noreply@example.invalid>',
  'API_KEY_PEPPER=e2e-emulator-pepper',
  '',
].join('\n');

try {
  const existing = readFileSync(secretPath, 'utf8');
  if (existing !== emulatorSecrets) {
    throw new Error(
      `${secretPath} zawiera wartości inne niż bezpieczne fixture E2E. `
      + 'Przenieś prywatny plik przed uruchomieniem suite emulatora.',
    );
  }
} catch (error) {
  if (error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT') {
    writeFileSync(secretPath, emulatorSecrets, { encoding: 'utf8', mode: 0o600, flag: 'wx' });
  } else {
    throw error;
  }
}

console.log('Functions emulator secrets: local E2E fixture ready');
