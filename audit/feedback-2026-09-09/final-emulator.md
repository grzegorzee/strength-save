# Final emulator integration — 2026-09-09

**PASS: 18/18 scenarios**, Playwright duration **28.1s**, runner exit **0**.

Command:

```sh
JAVA_HOME=/opt/homebrew/opt/openjdk@21/libexec/openjdk.jdk/Contents/Home npm run e2e:emulator
```

The runner used Chromium, one worker, dev server `8090`, and real local Auth/Firestore/Functions emulators. It started after the requested 60-second wait. Product timeouts, sources and test fixtures were not changed.

Source commit: `a954f169f658facae305bf6fe33afa04e421bb41`. The fingerprint of tracked frontend, Functions, Rules, emulator fixtures and configuration was unchanged across the run: `c4a540d9d175abeebc80d6e9e7beda584c343bfe6cc546db6b06082971b628ba`. Per-file hashes are in [final-emulator.json](final-emulator.json).

The suite covered critical login/onboarding/workout flows, cached profile access while offline, suspended/no-profile access denial, plan conflicts and lifecycle, the 501-workout merge, stale workout revision rejection, merged client edits, lost-ACK idempotency, final-write follow-up, provisional promotion and orphan retry preserving newer content. It ran with the current AutoSync/durable engine and current strict Rules/restore source.

[Full log](final-emulator.log) contains only local synthetic test activity; a credential-pattern scan found no JWT, private-key or server-key values. No real user data or new cloud deployment was used. Ports `8081`, `9099`, `5001` and `8090` were confirmed free afterward.

This integration gate does not simulate physical iOS JavaScript suspension; final screen-off/resume behavior still belongs to the native device check.
