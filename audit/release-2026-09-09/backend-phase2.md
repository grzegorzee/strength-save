# Backend — phase 2, 2026-09-09

Status: **phase 2 deployed and verified**, 2026-09-09 12:54:48 UTC. Approved scope: **restoreWorkoutBackupV3, then Firestore Rules**. No other function, index, Storage Rules, IAM, secret rotation or user-data mutation is part of this step.

Source commit at preflight: `1e9425b898baa6eb6398ec3f1ba9175f47d40880`. The current restore client, protected transport, workout hook, Rules, server restore, v2 writer, indexes and Functions package exactly match their hashes in the published iOS 143 / Android 49 source manifest. Candidate iOS 144 / Android 50 keeps this protocol.

The user explicitly accepted immediate updates for the two existing users. This removes the previous migration condition; it is not a remaining approval or configuration blocker.

## Four previously deferred findings now closed in production

| Finding | Deployment | Resulting contract |
| --- | --- | --- |
| B10 | Firestore Rules | Direct client create only bootstraps an empty exercises array; exercise changes use v2/restore v3, preserving server health-consent validation. |
| B11 | Firestore Rules | Owner delete/Undo succeeds when the optional health sidecar is absent, and retry after both documents vanished is a no-op. Existing foreign documents remain protected. |
| B12 | restoreWorkoutBackupV3 | Missing or mismatched expectedOwnerUid is rejected before the transaction. The destination account remains separate from the owner embedded in an exported backup. |
| B3, Firestore portion | Firestore Rules | deletionPending blocks client access/writes and profile updates even while an old ID token remains valid. The already-deployed deletion/recovery flow remains unchanged. |

Clients 143/49 and 144/50 use the compatible CSV/JSON v3 transport and backfill v2. Older 142/48 JSON restore without expectedOwnerUid and raw CSV/backfill exercise writes will be rejected; update the client and retry. Existing workouts are not deleted or migrated, and ordinary v2 workout saving stays compatible.

## Fresh checks before deployment

- Functions unit: **549 PASS**; the 15 emulator-only tests were skipped in that unit run and then run separately: **15/15 PASS**.
- Functions typecheck and build: **PASS**.
- Firestore Rules: **326/326 PASS**; Storage Rules compatibility suite: **44/44 PASS**.
- Before deployment: **69/69 Functions ACTIVE**, **14/14 indexes READY**, RC server key version 1 ENABLED and both webhook bindings present. Only metadata was read.
- Before deployment restore timestamp: 2026-09-04T08:57:50.173608534Z. Firestore ruleset: ae49dda7-1e3a-4276-b777-413def64df88, identical to source33df6dbd.

## Exact commands

```sh
firebase deploy --project fittracker-workouts --account g.jasionowicz@gmail.com \
  --only functions:restoreWorkoutBackupV3
firebase deploy --project fittracker-workouts --account g.jasionowicz@gmail.com \
  --only firestore:rules
```

No --force and no broad functions deployment. The Functions predeploy hook repeats typecheck, all unit tests and build.

## Verification

- Both targeted deploy commands exited **0**, in the approved order. Functions predeploy again passed typecheck, **549 unit tests** and build.
- **restoreWorkoutBackupV3 ACTIVE**, update `2026-09-09T12:52:50.745628837Z`, linked Cloud Build **SUCCESS**.
- Downloaded the source artifact referenced by that active function and inspected only `lib/workout-restore-v3.js`, `src/workout-restore-v3.ts`, and `lib/index.js`. All three are **byte-identical** to the tested local candidate. Compiled restore SHA-256: `3f8479926078931b29d3060948a7c603a1aa9d1940c1cb84d0fc44c4da8a7e91`.
- Firestore release now points to `projects/fittracker-workouts/rulesets/4b4fefae-0980-49b0-b037-8dd59d2f31e4`, update `2026-09-09T12:53:41.509426Z`. Retrieved content matches the tested `firestore.rules`, SHA-256 `8d14ec3b7c9004c1ceffe374512da09d7d671d7ca5532fb37376c2b099e01f4a`.
- **69/69 Functions ACTIVE**. Exactly one function timestamp changed: `restoreWorkoutBackupV3`; the other **68 are unchanged**.
- **14/14 indexes READY**, inventory unchanged. RevenueCat webhook state/timestamp, both secret bindings and server key version **1 ENABLED** all unchanged.
- HTTP smoke without any user/auth/App Check token: restore returned **401 UNAUTHENTICATED**, as expected. This checks the deployed unauthenticated boundary; authenticated import/delete behavior is covered by the unit/Rules tests, not by writes on real accounts.
- Emulator ports 8081, 9199, 9099 and 5001 were free after the checks.

[Sanitized receipt](backend-phase2.receipt.json) contains before/after inventory, hashes and source-artifact provenance. Check/deploy logs share the `backend-phase2` prefix. No private user documents or secret values were inspected; no real-account test writes, data migration, purge, email or push were performed.

## Rollback reference

No rollback was needed or executed. Previous Firestore release/ruleset is recorded in the receipt; the prior implementation source is `33df6dbd13883ce2f1abfbf25bfa11213b7bc6f5`. If a confirmed regression requires rollback, use an isolated checkout and target only the affected restore function or Rules; retain all data, phase-1 Functions, indexes and secret configuration. Do not revert the shared workspace or run a broad deployment.
