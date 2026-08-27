import { initializeTestEnvironment } from '@firebase/rules-unit-testing';
import { doc, setDoc } from 'firebase/firestore';
import { deleteObject, getBytes, ref, uploadBytes } from 'firebase/storage';
import { readFileSync } from 'node:fs';

const env = await initializeTestEnvironment({
  projectId: 'rules-repro',
  firestore: { rules: readFileSync('firestore.rules', 'utf8'), host: '127.0.0.1', port: 8081 },
  storage: { rules: readFileSync('storage.rules', 'utf8'), host: '127.0.0.1', port: 9199 },
});

const UID = 'user123';
const OTHER_UID = 'intruder456';
const REQUEST_ID = '123e4567-e89b-42d3-a456-426614174000';
const REPORT_ID = `${UID}_${REQUEST_ID}`;
const PATH = `bug-reports/${UID}/${REPORT_ID}/screenshot.jpg`;
const jpeg = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 1, 2, 3]);
const ok = (fn) => fn().then(() => true, () => false);

await env.clearFirestore();
await env.withSecurityRulesDisabled(async (ctx) => {
  await setDoc(doc(ctx.firestore(), 'bug_reports', REPORT_ID), {
    userId: UID,
    clientRequestId: REQUEST_ID,
    status: 'awaiting_upload',
    uploadPath: PATH,
  });
});

const ownStorage = env.authenticatedContext(UID).storage();
const otherStorage = env.authenticatedContext(OTHER_UID).storage();
const anonymousStorage = env.unauthenticatedContext().storage();
const cases = [];
const add = (name, expected, pass) => cases.push({ name, expected, pass });

add('owner uploads exact JPEG path for awaiting report', true, await ok(() => uploadBytes(ref(ownStorage, PATH), jpeg, { contentType: 'image/jpeg' })));
add('owner cannot read private screenshot directly', false, await ok(() => getBytes(ref(ownStorage, PATH))));
add('owner cannot overwrite screenshot', false, await ok(() => uploadBytes(ref(ownStorage, PATH), jpeg, { contentType: 'image/jpeg' })));
add('owner cannot delete screenshot', false, await ok(() => deleteObject(ref(ownStorage, PATH))));
add('other user cannot upload into owner path', false, await ok(() => uploadBytes(ref(otherStorage, PATH), jpeg, { contentType: 'image/jpeg' })));
add('anonymous cannot upload', false, await ok(() => uploadBytes(ref(anonymousStorage, PATH), jpeg, { contentType: 'image/jpeg' })));

const missingReportPath = `bug-reports/${UID}/${UID}_123e4567-e89b-42d3-a456-426614174001/screenshot.jpg`;
add('upload without awaiting Firestore report is denied', false, await ok(() => uploadBytes(ref(ownStorage, missingReportPath), jpeg, { contentType: 'image/jpeg' })));
const wrongNamePath = `bug-reports/${UID}/${REPORT_ID}/other.jpg`;
add('upload under non-exact filename is denied', false, await ok(() => uploadBytes(ref(ownStorage, wrongNamePath), jpeg, { contentType: 'image/jpeg' })));

await env.withSecurityRulesDisabled(async (ctx) => {
  await setDoc(doc(ctx.firestore(), 'bug_reports', REPORT_ID), { status: 'new' }, { merge: true });
});
const finalizedPath = `bug-reports/${UID}/${UID}_123e4567-e89b-42d3-a456-426614174002/screenshot.jpg`;
await env.withSecurityRulesDisabled(async (ctx) => {
  await setDoc(doc(ctx.firestore(), 'bug_reports', `${UID}_123e4567-e89b-42d3-a456-426614174002`), {
    userId: UID,
    status: 'new',
    uploadPath: finalizedPath,
  });
});
add('upload for finalized report is denied', false, await ok(() => uploadBytes(ref(ownStorage, finalizedPath), jpeg, { contentType: 'image/jpeg' })));

const pendingLargeId = `${UID}_123e4567-e89b-42d3-a456-426614174003`;
const pendingLargePath = `bug-reports/${UID}/${pendingLargeId}/screenshot.jpg`;
await env.withSecurityRulesDisabled(async (ctx) => {
  await setDoc(doc(ctx.firestore(), 'bug_reports', pendingLargeId), {
    userId: UID,
    status: 'awaiting_upload',
    uploadPath: pendingLargePath,
  });
});
add('non-JPEG MIME is denied', false, await ok(() => uploadBytes(ref(ownStorage, pendingLargePath), jpeg, { contentType: 'image/png' })));
add('payload over 1.5 MiB is denied', false, await ok(() => uploadBytes(ref(ownStorage, pendingLargePath), new Uint8Array(1_572_865), { contentType: 'image/jpeg' })));

let failed = 0;
for (const test of cases) {
  const pass = test.pass === test.expected;
  console.log(`${pass ? 'PASS' : 'FAIL'} ${test.name}`);
  if (!pass) failed += 1;
}

await env.cleanup();
if (failed > 0) process.exitCode = 1;
else console.log(`\n${cases.length}/${cases.length} storage rules tests passed.`);
