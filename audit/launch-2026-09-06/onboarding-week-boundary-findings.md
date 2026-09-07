# Cross-review: onboarding retry across a week boundary

Date: 2026-09-06. **Fixed and verified: 69 targeted tests PASS.** The original handoff was a confirmed P1 with a RED regression; its reproduction is retained below. Final full frontend and emulator checks also passed after integration (4072 frontend tests and 18 emulator scenarios).

## Reproduction

The new regression in `src/test/plan-cycle-choice-sequence.test.tsx` uses the real PlanWizard, owner-scoped onboarding draft storage, `completeOnboardingPlan`, `useTrainingPlan` and `usePlanCycles`. Firestore is an isolated in-memory fixture, including actual active-cycle query results and transaction snapshot references. No real user account is written.

1. Sunday 2026-09-06: an already-consenting new user chooses that Sunday as the first workout. The wizard computes cycle start 2026-08-31.
2. The active cycle and training plan commit. The plan-save response is deliberately lost, represented as a failed save result after the real save helper completed.
3. `markOnboardingComplete` is not called, so the user's profile remains `onboardingCompleted=false`. One active cycle exists.
4. Unmount the wizard and both data hooks. Move the clock to Monday 2026-09-07, remount the hooks and deliver the existing plan/cycle server snapshots. Restore the wizard from its persisted owner draft.
5. The expired first-workout choice is outside `listFirstWorkoutOptions`, so the wizard chooses 2026-09-07 and computes a different cycle start. The user presses the same start CTA.
6. The second save succeeds and marks onboarding complete, but the assertion expecting one active cycle receives **two**.

Evidence: `onboarding-week-boundary-red.log`: **1 failed / 3 existing scenarios passed**. The failure is the final active-cycle count, after confirming both saves, their different start dates and the profile status transitions.

## Why the current guards do not stop it

- The route uses profile `onboardingCompleted`, which remains false after the lost plan ACK. A committed plan or active cycle does not redirect this new user away from Onboarding.
- Onboarding reads `savePlan` and `createActiveCycle` from the hooks but has no existing-active-cycle recovery gate.
- `createActiveCycle` reads only `cycle-${uid}-${startDate}` inside its transaction. Its pending-onboarding reuse branch handles another choice at that same ID, not another date-derived ID.
- `saveTrainingPlanWithRevision` synchronizes active-cycle snapshots but does not deduplicate them. The regression fixture was strengthened to execute this query/patch path; the duplicate remains.

## Minimal correction proposed for the owning agent

Bind the initial onboarding operation to a durable cycle identity independent of the computed start date, and reconcile a previously created incomplete onboarding cycle when the user resumes with another date. Check the owner and incomplete profile, retain completed/replan history, and cover existing date-derived pending cycles. Simply freezing the displayed date is insufficient if the user deliberately changes it after a partial save.

An alternative is a durable pending-save operation snapshot written before any server mutation, with retries explicitly bound to that operation and a separate recovery action for changing it. That changes more of the wizard flow.

## Implemented correction and verification

The RED handoff above is retained as historical evidence. The fix now passes
the real-flow regression and **69 targeted tests in four files**; evidence is
`onboarding-week-boundary-fix-green.log`. The expanded pre-fix suite produced
8 RED / 3 GREEN (`onboarding-week-boundary-fix-red.log`). Review added 3 RED
assertions for the final date/choice and actionable conflict recovery
(`onboarding-week-boundary-review-red.log`), which also pass after correction.

`usePlanCycles.createActiveCycle` stores `users/{uid}.onboarding.pendingCycleId`
in the same transaction as the first onboarding cycle. The shared profile read
serializes competing first attempts even if their selected dates differ. A
retry reads this pointer independently of today's date. The existing cycle ID
is retained; the identifier scheme for normal replans is unchanged.

For older incomplete onboardings without a pointer, an owner-filtered active
query locates candidates, which are re-read in the transaction. Only a single
active cycle marked `choice.entry=onboarding` can be adopted. The profile must
exist and still be incomplete. Malformed/foreign/closed pointers never cause
the pointed cycle to be modified. Completed profiles, finished history, and
normal replans remain outside pending-onboarding replacement.

The pointer update merges the current onboarding map from the transaction,
preserving unrelated answers. Completion already writes individual dot paths,
so it does not restore an old map over the pointer. A concurrency regression
discards a speculative attempt, commits another first attempt, and verifies
that the retried transaction follows that pointer despite its earlier empty
query result.

For onboarding, the same-plan shortcut now also requires the same start date;
the final regression asserts the sole cycle's new start date and full choice,
not only its count. A changed date therefore updates the pending snapshot.

An unrelated or ambiguous active plan is preserved and rejected before a plan
write. This is reported as a specific recovery condition by
`completeOnboardingPlan`, with PL/EN instructions to contact
`contact@strengthsave.app` or return to the start of setup to switch accounts.
It is not presented as a transient network failure. Such pre-existing data
requires assistance; the patch does not guess which historical cycle to remove.

Production files: `usePlanCycles.ts`, a narrow error mapping in `cycle-actions.ts`,
and one key in each locale. No new collection, rule, or backend endpoint.
The final full frontend checks and post-change emulator onboarding are recorded
separately by the launch coordinator; physical device QA remains NOT RUN.

The parent coordinated implementation ownership before the fix. The source changes and GREEN verification are complete; real-device checks remain part of the launch checklist.

Final frontend checkpoint before the 2026-09-07 warmup follow-up: all **469 test
files passed, 4072 tests passed and 16 were skipped** (132.28 s). Full typecheck
passed; full lint passed with zero errors and 15 existing warnings. Evidence:
`final-vitest.log`, `final-typecheck.log`, `final-lint.log`. These results precede
the subsequent warmup changes and do not claim device workout coverage.
