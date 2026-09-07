import { expect, test } from '@playwright/test';
import { LEGAL_VERSIONS } from '../../src/lib/legal-versions';
import { EMULATOR_APP_CHECK_TOKEN } from './app-check';

const PROJECT_ID = 'fittracker-workouts';
const firestoreUrl = (uid: string) => `http://127.0.0.1:8081/v1/projects/${PROJECT_ID}/databases/(default)/documents/users/${uid}`;

test('consent displayed for A cannot be recorded under B after account switch', async () => {
  const authResponse = await fetch('http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:signUp?key=fake-api-key', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: `consent-owner-${Date.now()}@e2e.test`, password: 'emulator-consent-owner-123', returnSecureToken: true }),
  });
  expect(authResponse.ok).toBe(true);
  const accountB = await authResponse.json() as { localId: string; idToken: string };
  const profileResponse = await fetch(firestoreUrl(accountB.localId), {
    method: 'PATCH', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer owner' },
    body: JSON.stringify({ fields: { uid: { stringValue: accountB.localId }, status: { stringValue: 'active' }, role: { stringValue: 'user' } } }),
  });
  expect(profileResponse.ok).toBe(true);

  const record = (expectedOwnerUid: string) => fetch(`http://127.0.0.1:5001/${PROJECT_ID}/us-central1/recordConsent`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accountB.idToken}`, 'X-Firebase-AppCheck': EMULATOR_APP_CHECK_TOKEN },
    body: JSON.stringify({ data: {
      expectedOwnerUid, channel: 'web', entries: [{ type: 'terms', action: 'granted', docVersion: LEGAL_VERSIONS.terms, lang: 'pl', statementText: 'Akceptuję Regulamin.' }],
    } }),
  });

  const rejected = await record('previous-account-a');
  expect(rejected.status).toBe(403);
  expect(await rejected.json()).toMatchObject({ error: { message: 'CONSENT_OWNER_CHANGED', status: 'PERMISSION_DENIED' } });
  const unchanged = await fetch(firestoreUrl(accountB.localId), { headers: { Authorization: 'Bearer owner' } });
  expect((await unchanged.json() as { fields: Record<string, unknown> }).fields).not.toHaveProperty('consents');

  const accepted = await record(accountB.localId);
  expect(accepted.status).toBe(200);
  expect(await accepted.json()).toMatchObject({ result: { ok: true, recorded: 1, mirror: { termsVersion: LEGAL_VERSIONS.terms } } });
});
