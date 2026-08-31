# Strength Save 1.0 — English iPhone screenshots

These are the canonical English portrait screenshots for the iPhone 6.9-inch
display class. Every PNG is 1320 × 2868 px, opaque, and uses the production UI
with a deterministic fictional profile. Firebase is blocked by the capture
harness, so the run cannot read or write a real user's data.

Apple specification:
<https://developer.apple.com/help/app-store-connect/reference/app-information/screenshot-specifications/>

## App Store order

1. `01-today.png` — Your training day at a glance
2. `02-plan.png` — Follow a plan that stays flexible
3. `03-workout.png` — Log every set with less friction
4. `04-history.png` — A complete workout history
5. `05-results.png` — Understand each training week
6. `06-charts.png` — See the trend, not just the number
7. `07-records.png` — Keep every personal record
8. `08-badges.png` — Celebrate consistency
9. `09-exercises.png` — Build from a rich exercise library
10. `10-devices.png` — Train across your devices

The complete captions and machine-readable metadata live in `manifest.json`.

## Recommended website selection

- Hero phone: `01-today.png`
- Workout logging: `03-workout.png`
- Weekly progress: `05-results.png`
- Trends and charts: `06-charts.png`
- Exercise library: `09-exercises.png`
- Device/profile section: `10-devices.png`

The remaining four images are useful for a secondary product gallery.

## Regenerate

From the application repository root:

```sh
node scripts/app-store-screenshots.mjs
```

The script starts its own strict-port Vite server, captures a fresh isolated
browser context per screen, rejects horizontal overflow and runtime errors, and
writes the ten PNGs plus `manifest.json` into this directory.

## App Store Connect upload

The uploader is read-only by default and uses the same `ASC_KEY_ID`,
`ASC_ISSUER_ID`, and `ASC_KEY_PATH` environment as `scripts/asc_api.py`:

```sh
uv run scripts/app-store-screenshots-upload.py
```

After visual approval, `--apply` uploads into Apple's `APP_IPHONE_67` API set,
which is the historical identifier used for the current 6.9-inch slot.
It refuses to append duplicates. Replacing an existing set requires both
`--apply --replace-existing`, so a normal dry-run cannot remove remote assets.
