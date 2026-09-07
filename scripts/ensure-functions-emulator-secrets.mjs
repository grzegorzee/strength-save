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
  'REVENUECAT_WEBHOOK_AUTH=e2e-emulator-webhook-only',
  'REVENUECAT_SERVER_API_KEY=sk_e2e_emulator_only',
  '',
].join('\n');

try {
  const existing = readFileSync(secretPath, 'utf8');
  const priorFixture = emulatorSecrets.split('\n').filter(line => !line.startsWith('REVENUECAT_')).join('\n');
  if (existing === priorFixture) {
    writeFileSync(secretPath, emulatorSecrets, { encoding: 'utf8', mode: 0o600 });
  } else if (existing !== emulatorSecrets) {
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
