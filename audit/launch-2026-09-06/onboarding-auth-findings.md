# Onboarding addendum: authentication, consent and route boundaries

Date: 2026-09-06. This bounded follow-up was explicitly requested after the launch audit. Ownership was coordinated with the workout agent (wizard/draft/plan creation) and backend agent (Functions/emulator verification). Login keyboard handling remains the parent agent's work.

## OB-N1 — Welcome discarded the authoritative consent confirmation (fixed)

`Onboarding.handleLegalConsent` awaited `recordConsents` but discarded its validated server mirror. `ConsentGate` already used that mirror to bridge a delayed Firestore snapshot. The new-user flow therefore lacked the same protection: confirmed decisions could still appear absent when restoring the wizard or evaluating the gate after onboarding.

RED: the actual Onboarding host received the valid response, but never called `mergeConfirmedConsentMirror`; its `legalConsentAlreadyRecorded` prop remained false. The failure is recorded in `onboarding-auth-red.log`.

Fix: pass the successful, validated response to the existing UserContext merge method. Transport failure still propagates to the wizard's existing error/retry UI and does not create a local permission. No legal copy or checkbox requirements changed.

## OB-N2 — A consent choice could cross an account change (fixed for the updated client)

The protected callable waits for App Check on web or a native module import. `recordConsents` did not bind the choice to an account before that wait, nor check identity before returning a late response. An A→B switch could dispatch A's choice with B's token; a response for A could also reach an old callback after B had logged in.

RED: three tests reproduced cross-account dispatch, stale response delivery, and the missing destination UID. They use the actual consent API and protected transport with deferred synthetic network/auth boundaries, without writing real accounts.

Fix:

- Capture the authenticated UID when the user submits, include `expectedOwnerUid`, and use the existing protected transport identity checks.
- Reject a late confirmation if the authenticated UID changed before the response returned.
- The backend agent added an explicit UID mismatch rejection before parsing/writing consent data. Existing error/retry UI handles the rejection.

Compatibility boundary: the server field remains optional for already distributed clients, which have an explicit legacy legal-version compatibility window. The updated client always sends it. Older clients require an update to gain this account-binding protection; they are not claimed to be repaired by the server guard alone. No deployment was performed.

## OB-N4 — Pending confirmation masked a newer health withdrawal (fixed)

UserContext retained a confirmed mirror until an exactly matching snapshot arrived. Sequence: local authoritative health grant at epoch 3 → another device withdraws at epoch 4 → the listener receives epoch 4 without ever receiving epoch 3. The pending epoch-3 grant was overlaid onto every newer profile, so the UI and Health bridge continued to see the older grant.

RED: `user-provider-bootstrap.test.tsx` observed `healthGranted=true` after the explicit epoch-4 withdrawal (`onboarding-consent-newer-red.log`).

Fix: `reconcileConsentConfirmation` removes superseded pending health fields when a higher health epoch is observed, preserving independently unconfirmed terms/privacy fields. The same reconciliation applies to snapshots, profile-sync responses and late confirmation callbacks. An older cache at epoch 2 still cannot undo a newly confirmed epoch 3; a newer epoch 4 supersedes it, including when the older ACK arrives last. Existing Health scope handling remains in place and receives the reconciled profile.

## Coordinated finding and reviewed route behavior

- OB-N3: the workout agent identified a custom-plan draft forcing wizard step 5 despite the host resetting to step 1 for missing legal consent. RED/fix belongs to that agent's wizard/draft patch. The draft must remain available after consent, while restoration must not bypass the legal step.
- `AuthenticatedApp` checks profile loading, email verification and account access before creating protected routes. New users get the Onboarding element for all application paths; existing users missing required legal versions get ConsentGate before the router. Read-only review found no direct route that bypasses these gates.
- Existing account-switch profile isolation, offline profile retry, consent rejection/retry, optional health/marketing behavior and both plan-completion paths remain covered by the focused test runs.

## Verification and scope

- New/auth/consent and UserProvider tests: **41/41 passed** across 5 files (`onboarding-auth-integrated.log`).
- Existing onboarding flows: **32/32 passed** across 6 files (`onboarding-existing-flow-tests.log`), including direct start, preview confirmation, choose-another-plan, save retry, answers, accent and optional marketing.
- Typecheck, targeted ESLint and `git diff --check`: passed.
- Backend optional owner guard: **5/5 passed**, reported by its owning agent.
- Existing mock providers were updated to supply the real `mergeConfirmedConsentMirror` method. Their flow/deadline/payload assertions were not relaxed.

Sources in this ownership area were frozen at 16:25 local time. Final full-suite, emulator and native verification is coordinated by the parent after all onboarding patches are integrated. These unit/component results do not replace device background testing or deployed-state verification.
