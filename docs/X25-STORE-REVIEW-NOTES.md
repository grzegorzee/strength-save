# X25 store review notes

## App Store — iOS + Apple Watch

Strength Save is one product across web, iOS, Android, Apple Watch, and Garmin.
Subscription checkout and restore exist only in the iOS and Android apps. The
Apple Watch app has no separate purchase screen and consumes the entitlement
snapshot from its paired iPhone.

### HealthKit purpose

- iPhone reads body mass only after Health permission and asks the user before
  applying the value to their Strength Save measurements.
- iPhone writes completed strength/cardio workouts only when Health sync is
  enabled by the user.
- Apple Watch starts one `HKWorkoutSession` to keep the workout active in the
  background and to collect heart rate. The `hkSession` marker prevents the
  paired iPhone from writing a duplicate workout.
- Discarding a local Watch workout ends it without saving an `HKWorkout`.

### Suggested review path

1. Sign in with the review account supplied in App Review Information.
2. Open today's workout on iPhone and launch Strength Save on Apple Watch.
3. Log a set on Watch, observe the pending/synced state, then finish the workout.
4. Verify one workout in Apple Health and the same session in iPhone history.
5. Purchases can be tested from the iPhone paywall; the Watch reflects PRO and
   never asks for an additional purchase.

Privacy policy: https://strengthsave.app/legal/privacy.html

### Local archive state — 2026-08-10

- App, `StrengthWatch.app`, and `StrengthWatchWidgets.appex` share version
  `1.0.0` and build `84`; an unsigned structural archive contains both Watch
  products and both privacy manifests.
- The regenerated App Store profile keeps HealthKit, Sign in with Apple, and
  production push, but does not contain
  `com.apple.developer.devicecheck.appattest-environment`.
- A signed archive therefore correctly fails before upload. Do not remove the
  App Attest entitlement: enable App Attest for App ID
  `com.grzegorzjasionowicz.strengthsave` in Certificates, Identifiers &
  Profiles, regenerate `Strength Save App Store`, then archive and verify the
  App, Watch, and widget signatures.

## Connect IQ Store — Garmin

Strength Save uses a six-digit pairing code shown by the Garmin app. After
pairing, the watch holds a minimal revocable device token instead of Firebase
credentials. A reviewer can download today's plan, log sets offline, reconnect,
and finish once; the backend acknowledges only after durable, idempotent save.
The completed activity is saved as FIT with heart rate and appears once in the
same Strength Save history.

Permissions are limited to Communications (plan/sync), Fit (activity record),
Sensor (heart rate during the workout), and UserProfile (profile/unit context).
One Strength Save PRO entitlement covers Garmin without an on-watch paywall.

Privacy policy: https://strengthsave.app/legal/privacy.html

### Local Connect IQ artifact — 2026-08-10

- SDK 9.2.0; all 16 manifest devices build, exporting 27 signed target PRGs.
- `garmin/bin/strengthsave.iq`: 643683 bytes, SHA-256
  `1685a092c9e4b981fe3f38ced806998ca1f53876fa2d3b50ac36772b5e59a747`.
- Simulator PASS on unpaired FR255 (round/buttons) and Venu Sq 2
  (rectangle/touch); no workout or private account was touched.
- Portal upload/validation, a populated-plan screenshot on the isolated review
  account, physical-device G1-G9, and Store submission remain open.
