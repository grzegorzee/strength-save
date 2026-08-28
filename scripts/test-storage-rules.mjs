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

// === Avatars: prywatna granica właściciela ===
const avatarPath = `avatars/${UID}/avatar`;
add('avatar: owner can upload exact image path', true, await ok(() => uploadBytes(ref(ownStorage, avatarPath), jpeg, { contentType: 'image/jpeg' })));
add('avatar: owner can read own photo', true, await ok(() => getBytes(ref(ownStorage, avatarPath))));
add('avatar: intruder cannot read owner photo', false, await ok(() => getBytes(ref(otherStorage, avatarPath))));
add('avatar: intruder cannot overwrite owner photo', false, await ok(() => uploadBytes(ref(otherStorage, avatarPath), jpeg, { contentType: 'image/jpeg' })));
add('avatar: anonymous user cannot read owner photo', false, await ok(() => getBytes(ref(anonymousStorage, avatarPath))));
add('avatar: non-image payload is denied', false, await ok(() => uploadBytes(ref(ownStorage, avatarPath), jpeg, { contentType: 'application/octet-stream' })));
add('avatar: image at 5 MiB limit is denied', false, await ok(() => uploadBytes(ref(ownStorage, avatarPath), new Uint8Array(5 * 1024 * 1024), { contentType: 'image/jpeg' })));
add('avatar: owner cannot write a second arbitrary filename', false, await ok(() => uploadBytes(ref(ownStorage, `avatars/${UID}/legacy.jpg`), jpeg, { contentType: 'image/jpeg' })));
add('avatar: owner can delete own photo', true, await ok(() => deleteObject(ref(ownStorage, avatarPath))));

// === Body photos: granica zgody zdrowotnej ===
const legacyReadPath = `body-photos/${UID}/legacy-read.jpg`;
const legacyDeletePath = `body-photos/${UID}/legacy-delete.jpg`;
const legacyUpdatePath = `body-photos/${UID}/legacy-update.jpg`;
const activeGrantId = 'grant-active';
const activePhotoPath = `body-photos/${UID}/${activeGrantId}/active.jpg`;
const withdrawnPhotoPath = `body-photos/${UID}/${activeGrantId}/withdrawn.jpg`;
const image = new Uint8Array([1, 2, 3]);

await env.withSecurityRulesDisabled(async (ctx) => {
  const storage = ctx.storage();
  await uploadBytes(ref(storage, legacyReadPath), image, { contentType: 'image/jpeg' });
  await uploadBytes(ref(storage, legacyDeletePath), image, { contentType: 'image/jpeg' });
  await uploadBytes(ref(storage, legacyUpdatePath), image, { contentType: 'image/jpeg' });
  await uploadBytes(ref(storage, withdrawnPhotoPath), image, { contentType: 'image/jpeg' });
});

add('body photos legacy: owner can read existing photo', true, await ok(() => getBytes(ref(ownStorage, legacyReadPath))));
add('body photos legacy: intruder cannot read', false, await ok(() => getBytes(ref(otherStorage, legacyReadPath))));
add('body photos legacy: intruder cannot delete', false, await ok(() => deleteObject(ref(otherStorage, legacyDeletePath))));
add('body photos legacy: owner cannot create new photo', false, await ok(() => uploadBytes(ref(ownStorage, `body-photos/${UID}/legacy-new.jpg`), image, { contentType: 'image/jpeg' })));
add('body photos legacy: owner cannot update existing photo', false, await ok(() => uploadBytes(ref(ownStorage, legacyUpdatePath), image, { contentType: 'image/jpeg' })));
add('body photos legacy: owner can delete existing photo', true, await ok(() => deleteObject(ref(ownStorage, legacyDeletePath))));

await env.withSecurityRulesDisabled(async (ctx) => {
  await setDoc(doc(ctx.firestore(), 'users', UID), {
    consents: { healthGranted: true, healthVersion: '1.1', healthGrantId: activeGrantId },
  });
});

add('body photos v2: owner can create image for active health grant', true, await ok(() => uploadBytes(ref(ownStorage, activePhotoPath), image, { contentType: 'image/jpeg' })));
add('body photos v2: owner can update image for active health grant', true, await ok(() => uploadBytes(ref(ownStorage, activePhotoPath), image, { contentType: 'image/png' })));
add('body photos v2: owner cannot create under a different grant path', false, await ok(() => uploadBytes(ref(ownStorage, `body-photos/${UID}/grant-other/wrong-grant.jpg`), image, { contentType: 'image/jpeg' })));
add('body photos v2: intruder cannot create in owner path', false, await ok(() => uploadBytes(ref(otherStorage, `body-photos/${UID}/${activeGrantId}/intruder.jpg`), image, { contentType: 'image/jpeg' })));
add('body photos v2: intruder cannot read', false, await ok(() => getBytes(ref(otherStorage, activePhotoPath))));
add('body photos v2: intruder cannot update', false, await ok(() => uploadBytes(ref(otherStorage, activePhotoPath), image, { contentType: 'image/jpeg' })));
add('body photos v2: intruder cannot delete', false, await ok(() => deleteObject(ref(otherStorage, activePhotoPath))));
add('body photos v2: non-image payload is denied', false, await ok(() => uploadBytes(ref(ownStorage, `body-photos/${UID}/${activeGrantId}/not-image.jpg`), image, { contentType: 'application/octet-stream' })));
add('body photos v2: image at 5 MiB limit is denied', false, await ok(() => uploadBytes(ref(ownStorage, `body-photos/${UID}/${activeGrantId}/too-large.jpg`), new Uint8Array(5 * 1024 * 1024), { contentType: 'image/jpeg' })));

await env.withSecurityRulesDisabled(async (ctx) => {
  await setDoc(doc(ctx.firestore(), 'users', UID), {
    consents: { healthGranted: true, healthVersion: '1.1', healthGrantId: '' },
  });
});
add('body photos v2: empty healthGrantId is denied', false, await ok(() => uploadBytes(ref(ownStorage, `body-photos/${UID}/${activeGrantId}/empty-grant.jpg`), image, { contentType: 'image/jpeg' })));

await env.withSecurityRulesDisabled(async (ctx) => {
  await setDoc(doc(ctx.firestore(), 'users', UID), {
    consents: { healthGranted: true, healthVersion: '1.0', healthGrantId: activeGrantId },
  });
});
add('body photos v2: stale health consent version is denied', false, await ok(() => uploadBytes(ref(ownStorage, `body-photos/${UID}/${activeGrantId}/stale-version.jpg`), image, { contentType: 'image/jpeg' })));

await env.withSecurityRulesDisabled(async (ctx) => {
  await setDoc(doc(ctx.firestore(), 'users', UID), { uid: UID });
});
add('body photos v2: missing health consent is denied', false, await ok(() => uploadBytes(ref(ownStorage, `body-photos/${UID}/${activeGrantId}/missing-consent.jpg`), image, { contentType: 'image/jpeg' })));

await env.withSecurityRulesDisabled(async (ctx) => {
  await setDoc(doc(ctx.firestore(), 'users', UID), {
    consents: { healthGranted: false, healthVersion: '1.1', healthGrantId: null },
  });
});
add('body photos v2: withdraw blocks create', false, await ok(() => uploadBytes(ref(ownStorage, `body-photos/${UID}/${activeGrantId}/after-withdraw.jpg`), image, { contentType: 'image/jpeg' })));
add('body photos v2: withdraw blocks update', false, await ok(() => uploadBytes(ref(ownStorage, withdrawnPhotoPath), image, { contentType: 'image/jpeg' })));
add('body photos v2: owner can read after withdraw', true, await ok(() => getBytes(ref(ownStorage, withdrawnPhotoPath))));
add('body photos v2: owner can delete after withdraw', true, await ok(() => deleteObject(ref(ownStorage, withdrawnPhotoPath))));

let failed = 0;
for (const test of cases) {
  const pass = test.pass === test.expected;
  console.log(`${pass ? 'PASS' : 'FAIL'} ${test.name}`);
  if (!pass) failed += 1;
}

await env.cleanup();
if (failed > 0) process.exitCode = 1;
else console.log(`\n${cases.length}/${cases.length} storage rules tests passed.`);
