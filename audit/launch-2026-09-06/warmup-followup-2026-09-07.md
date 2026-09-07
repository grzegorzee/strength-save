# Warmup follow-up — 2026-09-07

User report from a real workout: a fresh workout did not offer a warmup, and
warmup exercises repeated. Exact exercise names/platform are not yet confirmed.
This is a bounded follow-up, not a new whole-app audit. Tests use synthetic
fixtures only; no real account or workout is modified.

## WU-01 — repeated movement across warmup phases

Status: **FIXED — 6 RED regressions reproduced**, then **66/66 targeted tests
passed across six files**. Evidence: `warmup-duplicates-red.log` and
`warmup-duplicates-green.log`. Full typecheck and targeted lint passed
(`warmup-duplicates-typecheck.log`, `warmup-duplicates-lint.log`).

`src/lib/prestart-warmup.ts` concatenates pulse and variant-specific body
templates. Both upper-body templates include `warmup.v3.armCircles` immediately
after the pulse item `warmup.v3.heelsArmCircles`. The latter's PL and EN names
and instructions explicitly include arm circles. A chest/back/shoulders/arms
workout therefore prescribes the same movement twice, for both beginner and
standard levels. Keys differ, so the existing unique-key assertion passes.

Reachable path: a planned or quick session with a recognized upper-body first
exercise → automatic offer or manual flame button → pulse butt kicks with arm
circles → mobility arm circles. The pure generator produces the same overlap
offline and after reopening a session. Existing lower/full fallback templates
have no repeated key/name or this cross-phase overlap.

Invariant: each general-warmup movement appears once across its phases;
preserve the pulse → mobility → activation order and supported routine sizes.
Specific exercise warmup sets remain a separate intentional `isWarmup` type.
`ExerciseCard.handleGenerateWarmup` currently adds a blank warmup row, separate
from working sets; the ramp-set generator has no active production callsite
and already collapses identical rounded weights. Neither creates another
general-warmup exercise list.

Minimal plan: RED regression checks expanded movement identities across every
category/level/fallback and the rendered sequence. Remove only the redundant
standalone arm-circle entries from the two upper templates. Retain the pulse
compound movement, persisted identifiers, raw checked data and all working
sets. Upper routines then contain 8 standard / 5 beginner items, within the
existing 6–9 / 5–6 ranges. Existing session progress remains keyed to unchanged
items; an obsolete checked standalone key no longer increases visible progress.

Implemented exactly this two-row removal; no generic deduplication, backend
write, ID migration, locale rewrite or WorkoutDay change was needed for WU-01.
The new regression covers all category/level combinations and the empty quick
session fallback, item IDs and localized labels in PL/EN, and the actual next
movement after pulse completion. Existing dialog tests still cover
check → close → reopen → new session. An additional old-draft test proves the
stored checked keys, draft version and training sets remain unchanged while
the visible routine counts only current items. Source frozen after these checks.
`WarmupRoutineDialog` computes both `done` and the next `active` item from
`plan.items`; obsolete checked keys therefore cannot produce progress above
100% or block completion. Its existing all-current-items-checked regression
retains the explicit Finish button. No persisted data is deleted or migrated.

## WU-02 — missing fresh-session offer

Fixed separately by the native/release agent: phone planned autostart now
respects the offer after a new draft is persisted; Watch and resume keep their
separate behavior. Warmup-only checked drafts are recognized as live sessions,
and an account's disabled preference no longer leaks to another account.
See `warmup-prompt-followup-2026-09-07.md`: 69 targeted unit tests and 12 Chromium
scenarios passed. The integrated full frontend suite is now 4084 PASS across
470 files (16 historical skips); the real backend emulator suite is 18/18 PASS.
The final Chromium/WebKit matrix is recorded in the main audit report.

## Release and device evidence boundary

The reported real workout ran an installed build, not these local unpublished
audit fixes. A green local suite cannot establish which fixes were present in
that installed build or certify screen-off behavior. Record its build number,
platform, first exercise and exact repeated labels when available.

Physical device validation: **NOT RUN**. After installation of the resulting
build, verify planned and quick fresh starts; follow the full warmup once;
check an item, lock the screen, resume/reopen the same session; finish and start
another session. The same session must retain its own progress; a new session
must begin clean. Record OS, build number and video/screenshots for both iOS and
Android. Foreground unit tests are evidence for generation/rendering only.
