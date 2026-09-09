# CI mock E2E bootstrap: 2026-09-09

Status: **confirmed configuration defect, minimal fix verified locally; remote rerun pending**.

Original run: https://github.com/grzegorzee/strength-save/actions/runs/34394114934
Source: `73f435d47c99c8df46bcf29f5d074e9a2bdef8ad`.
Historical jobs/counts remain in `ci-status.json`. Quality exceeded its 45-minute
limit during mock E2E. There was no final Playwright summary and no uploaded
trace/screenshot artifact. Its partial dot output does not prove an individual
cause for every failed test.

## Confirmed cause

Only `.env.example` is tracked. The workflow supplied Firebase configuration to
the production build and emulator steps, but not to mock or WebKit steps. Step
environment values do not carry into the next step. Firebase Auth initializes
at module import, before E2E fake authentication can run; missing configuration
therefore crashes bootstrap with `Firebase: Error (auth/invalid-api-key).`

This was reproduced on a **fresh isolated Vite server at 127.0.0.1:8082**, using
the real repository config, an empty Vite env directory, a separate optimizer
cache, and cleared inherited `VITE_*` variables except `VITE_E2E_MODE=true`.
Repo cwd was retained for PostCSS/Tailwind resolution. A preliminary temp-server
attempt with the wrong cwd failed CSS configuration and was discarded; it is
not evidence for the Firebase cause. The release server on 8080 was untouched.

The valid empty-env run emitted the exact Firebase error, zero headings, zero
body text and an empty `#root`. Existing test
`e2e/accent-color.spec.ts:18` failed at `navigateAndWait` after five seconds.

## Fix and bounded verification

Only `.github/workflows/deploy.yml` changed at runtime configuration level:

- Mock and WebKit receive six synthetic Firebase values with project
  `demo-strength-e2e`, sufficient for SDK initialization. Existing test fixtures
  still use synthetic accounts and block real Firebase requests.
- Both steps use `--reporter=line` so individual test failures survive a job
  interruption before the final summary. Timeouts/retries are unchanged.
- Production build secrets, emulator configuration and other jobs are unchanged,
  verified by parsing YAML and comparing every step to the pre-fix revision.

On a restarted isolated server, with the same empty env directory plus exactly
these six synthetic values:

| Verification | Result |
| --- | --- |
| Same profile/accent test as RED | **1/1 PASS**, 3.4 s total |
| Existing `resume-after-kill.spec.ts`, Chromium | **1/1 PASS**, 8.2 s total |
| Manifest + readiness Vitest contracts | **13/13 PASS**, 2 files |
| Parsed workflow step comparison | **PASS**, only mock/WebKit changed |

The workout case retains its real assertions: entered warmup and working sets,
durable IndexedDB snapshot, renderer freeze/resume, cold reload, restored values
and counts, no repeated warmup prompt, and available finish action. No test
assertions or application source were changed. All account data was synthetic.

Raw local diagnostic output remains in a temporary directory, not committed.
The small machine-readable result is `ci-e2e-bootstrap.json`.

## Limits

This fixes a deterministically reproduced prerequisite failure in the CI setup.
The old run remains cancelled; the two local cases do not certify the entire
356-test mock suite. The next fresh CI run must establish its full result. This
is browser test infrastructure evidence, not physical Android/iOS workout QA.

## Completed remote follow-up

Run `34399987321` on `75401daab404edcf71212234ca68f1e7386496db` reached the full
mock suite: **354 passed, 2 failed, 8.2 minutes**. Bootstrap is working. The two
remaining failures are a stale set-count text selector and a 1px previous-value
geometry assertion on 375px; the latter requires actual text-boundary diagnosis.
WebKit and emulator E2E were skipped after mock failure. Android/iOS jobs passed.
This is still a failed CI run, recorded separately in `ci-status-52.json`.
