# Previous-value visibility: release 53/147 follow-up

Status: **targeted checks PASS, source frozen**. Full release gates and the next
CI run are tracked separately by the release owner.

## Confirmed defect

CI run `34399987321` on source `75401daa` passed 354/356 mock scenarios. One
failure was the old text selector for the now-correct `Serie: {n}` label. The
other reported a 1px overflow for `60×10` at a 375px viewport. Neither test was
skipped or made optional.

The overflow was real. With loaded Inter font, Linux Chromium measures this
text at **40px**, while the old column was **39px**: its Range right edge was
112px against the cell's 111px. The screenshot shows an ellipsis hiding the
end of the value. macOS measured 38.90625px and narrowly fit, explaining why
the former local test did not catch this platform difference.

Ordinary three-digit results also reproduced the defect locally: `100×10`
needs 46.6875px on macOS and rendered as `100…` in the old 39px cell. New real
history scenarios for 100 and 315 kg failed before the source fix.

## Minimal fix and preserved behavior

- The strength previous-value column has a 48px minimum. At container widths
  303–312px, gaps use 6px instead of 8px to retain the existing compact row.
- Longer results may wrap before `×` without changing their text content.
  This is the preferred break; unusually long numbers may also use word wrapping.
- Weight inputs retain at least 56px, other controls at least 44px, and ordinary
  rows remain 60px high. The 303px compact-layout threshold is unchanged.
- The synthetic fractional scenario also checks `27,5×10` geometry and proves
  the visibility check rejects an intentionally clipped value. The production
  formatter still uses a dot in both locales; this does not introduce a new
  number format or change stored weights.
- No session, prescription, persistence, timer, synchronization or account logic
  changed. Existing assertions for notes, target values, warmup, series removal,
  cold resume and interactions remain.

The old count-before-label selector now requires the visible `Serie: {n}` form.
The existing unit fixture for the previous column's minimum was updated from
39 to 48px; its 56px input requirement was preserved.

## Verification

| Check | Result |
| --- | --- |
| Complete density + ExerciseCard v3 specs, Chromium/WebKit | **72/72 PASS** |
| Existing Android 360/375/393 modern + no-container-query cases, both browsers | **12/12 PASS** |
| Linux amd64 Chromium, 375px: 60, 100, 315 and 27.5 kg histories | **4/4 PASS** |
| Scoped unit tests including no-horizontal-scroll guard | **65/65 PASS**, 4 files |
| Typecheck / targeted lint | **PASS / PASS** |

Linux final measurements: `60×10` 40px; `100×10` and `315×10` 48px, all fully
inside the 48px cell. Fractional `27.5×10` wraps inside the same cell. Every
case retains 60px rows, 56px weight inputs and 44px buttons. The strict original
zero-overflow assertion remains, with an additional Range containment assertion.

Linux used official `mcr.microsoft.com/playwright:v1.59.1-noble`, amd64, matching
the test package version. Only copied synthetic fixtures/helpers were mounted
into Docker, and the browser used the isolated clean-env Vite server at 8082.
No secrets, real accounts, or repository root were mounted. The Linux RED probe
replayed the exact pre-fix layout declarations on the first real row; its
diagnostic screenshot is not presented as a screenshot of an entire old build.
The container exited and was automatically removed.

Machine-readable dimensions, source hashes and image provenance are in
`verification.json`. Key before/after screenshots are adjacent PNG files.
Raw temporary logs and copied fixtures are not part of the committed evidence.

## Limits

Browser layout validation does not replace a physical Huawei Android 10 or
iOS workout test. No physical-device workout was performed in this follow-up.
Run `34399987321` remains failed and is preserved in `../ci-status-52.json`;
the new full CI result belongs in `../ci-status-53.json`.
