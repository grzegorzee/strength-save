# Post-CI Firebase emulator gate — 2026-09-09

**PASS: 18/18 scenarios, 0 failures, 0 skips, 0 retries.** Existing `npm run e2e:emulator`, Chromium, one worker. Playwright took 33.9 seconds; the full command took 53.04 seconds and exited 0. JDK 21 preflight and Functions TypeScript build passed.

Source: `75401daab404edcf71212234ca68f1e7386496db`. The frontend, Functions, emulator fixtures, and relevant configuration hashes did not change during this run. No application/test/dependency/index edits were made. Other agents' existing modifications were preserved.

The suite covered active/pending authentication, cross-account consent rejection, offline cached access and fail-closed access, planned workout creation, onboarding with health accepted/declined, plan completion, a 501-workout merge, plan/workout revision conflicts, cross-device merge, lost-ACK idempotency, post-final edits, provisional promotion, and orphan protection.

## Isolation evidence

- Vite ran freshly on 8090, separately from the other agents' servers. No existing server was stopped.
- Auth/Firestore/Functions listened on `127.0.0.1:9099/8081/5001`. `fittracker-workouts` was only the local namespace required by the existing fixtures.
- Inspection of the served Firebase module confirmed `VITE_USE_EMULATORS=true`, `fake-api-key`, and all three local SDK connections. `VITE_E2E_MODE=false` retained the real product profile/consent flow.
- Tests used newly generated `@e2e.test` accounts and local REST seed/read endpoints. App Check used the existing unsigned emulator fixture only on local Functions. The existing secrets script verified the exact synthetic `.secret.local` contents; no cloud secret values were fetched for these calls.
- No real user-data writes or deployments were performed. This suite does not test store purchases or physical-device behavior.
- The runner ended its emulator processes. Ports 8090, 8081, 9099, 5001, 4400, and 4500 were all free afterward.

Evidence: [sanitized receipt](post-ci-emulator.json), [local runner log](post-ci-emulator.log). This independent local result supplies the integration evidence missing from the skipped CI step; it does not turn that skipped step into a CI pass.
