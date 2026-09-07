# Independent review of W1–W9 integration

Date: 2026-09-06. Reviewer: native/release agent, separately from the workout implementation agent. Scope: final-write validation, hydration, CSV parser/mapper/history, import/Undo actions, and the import wizard. No further general discovery or UI changes were made during this review.

## Confirmed findings

### WR-01 — Undo of an import without a health sidecar was denied (P1)

`deleteImportBatch` deletes the base workout and `workout_health_v2` document in one batch. A base-only CSV import creates no health document. Existing Rules tested `resource.data.userId` even when the sidecar did not exist; the denied no-op delete aborts the whole batch. The same shared deletion contract affects individual workout deletion and retries after a successful delete whose response was lost.

Ownership transferred to the backend agent, who implemented and verified idempotent deletion rules and emulator regressions. No client-side existence-check workaround was added. Final emulator evidence is in the backend audit artifacts; this reviewer did not duplicate those emulator runs.

### WR-02 — Account could change between the import guard and callable dispatch (P1, fixed)

Reproduction: start a base-only CSV restore for account A, hold the actual protected callable at `appCheckReady`, switch auth to B, release the wait. The original client sends A's payload using B's authenticated transport. The server intentionally disregards the exported workout owner during backup migration and therefore could create the workout under B. Checking `auth.currentUser` only before entering the async transport did not prevent the race. The equivalent native boundary is the deferred import of the native transport.

RED: `src/test/workout-import-owner-boundary.review.test.ts` reproduced dispatch with `{ authenticatedUid: 'account-b', workoutOwner: 'account-a' }`. The permanent regression is now `src/test/workout-import-owner-boundary.test.ts`.

Fix:

- CSV, v3 JSON and legacy JSON restore capture the destination `userId` from the import operation and include required `expectedOwnerUid` in every request.
- `callProtectedFunction` checks that destination before and after the App Check/native module wait. The server additionally rejects a mismatching authenticated UID before any restore transaction (backend agent ownership).
- The destination UID is separate from `workout.userId` in an exported backup. Explicitly restoring an older owner's backup to the current account remains supported.
- The existing localized `import.accountChanged` message handles client and server account mismatch errors.

Client validation: RED → GREEN reproduction; explicit cross-owner backup invariant; iOS and Android deferred-transport guard tests; CSV and both JSON caller fixtures. Targeted run: **37 passed, 4 skipped** across 4 files. The skipped tests were the separately owned historical backfill block, subsequently updated by the backend agent. Typecheck, targeted ESLint and `git diff --check` passed. See `workout-owner-boundary-tests.log`. The workout agent runs the final full test suite after the shared source freeze.

Release coordination: `expectedOwnerUid` is a required restore request field. Older clients without it fail closed on the updated server. Client and Functions rollout must be coordinated; no production rollout happened during the audit.

## Reviewed invariants

- Final validation now compares the serialized set fields, including duration, distance, assistance and fractional kilograms, plus exact exercise/set counts. Exercise-note deletion and empty day notes/skips participate in cleanup validation. Skipped exercises are excluded consistently with the write payload.
- Pending health writes retain their draft instead of treating the base workout as proof that the private sidecar was acknowledged.
- CSV identity includes the UID. The same file remains deterministic within an account; separate accounts have disjoint IDs. Legacy same-account imports are checked outside the 120-workout window and preserved.
- CSV → backup v3 → server restore preserves date, import batch, names and notes within the existing server text limits. RPE is split into the private sidecar under the captured health grant. Missing grant rejects the file before writes.
- Existing restore content is protected by transactional digest/content comparison; a conflicting retry does not overwrite a workout.
- Quoted multiline CSV records preserve LF/CRLF. Import history is scoped by UID, ambiguous legacy history is not assigned to another user, and late wizard callbacks are fenced after an account change.
- The required composite index `workouts(userId ASC, importBatchId ASC)` exists in `firestore.indexes.json`. Its deployed production state was not inspected.

## Remaining scope limits

CSV restore is atomic per workout, not per entire file. Its client preflight validates structure and health consent; complete numerical/size constraints remain server-side. A later failed row can leave an already-written prefix. Retry preserves existing data. The initially observed missing Undo entry for a partial import was subsequently fixed as UX-05: any acknowledged written prefix is recorded in the owner's import history, while the error and retry remain visible. Regression coverage includes close → reopen → Undo, retry, zero writes and an account change while awaiting the response. See `workout-import-partial-recovery.test.tsx` and `ux-ui-findings.md`. The import remains explicitly per-workout, not all-or-nothing for an entire file.

This review does not replace real-device background/resume testing or final deployment/index verification.
