# X25 brand, copy and release review

Date: 2026-08-10
Scope: web, iOS, Android, Apple Watch, Garmin, App Store, Google Play and
Connect IQ metadata.

## Canonical contract

- Product name: **Strength Save** (with a space).
- Accent: **#CCFC22** on web, Apple Watch and Garmin primary actions.
- Icon: the same Strength Save artwork on iOS, Apple Watch, Android, PWA and
  the 1024x1024 Garmin Store asset.
- Entitlement: one server-confirmed `pro` for all five clients; checkout and
  restore only in the iOS and Android apps.
- Data language: canonical kg, optional lbs presentation, PL/EN, explicit
  offline/pending/error/retry states and the workout protocol in
  `docs/WORKOUT-PROTOCOL.md`.
- Release identity: `release/release-train.json` is the machine-readable map
  from the web commit to iOS+Watch build, Android versionCode and Garmin
  manifest/export.

## Findings and resolutions

| Severity | Finding | Resolution |
| --- | --- | --- |
| P1 | Web/PWA/Capacitor used `StrengthSave`, while native and Store surfaces used `Strength Save`. | Installable names and document titles now use the canonical spaced name. |
| P1 | Apple Watch and Garmin primary actions used a generic system green. | Watch asset and primary controls plus Garmin `Brand.ACCENT` now use `#CCFC22`; semantic success states remain green. |
| P1 | Android shipped a registered native Health Connect plugin, but `health-bridge.ts` selected the plugin only on iOS. | The shared bridge now selects `HealthSync` on native iOS and Android; web remains no-op. A regression test freezes all three branches. |
| P1 | App copy and Terms described subscription cancellation and trial eligibility as Apple-only. | Shared copy and Terms now refer to the applicable App Store or Google Play account. Trial/intro copy is conditional on store eligibility. |
| P1 | Existing App Store draft said every subscription starts with a free trial and advertised Garmin before Connect IQ submission. | Canonical platform-specific Store drafts make no unconditional trial claim; the App Store draft mentions only shipped Apple surfaces, while Google Play names Health Connect. |
| P2 | Release evidence was spread across plans and generated folders. | Exact artifact versions, sizes, hashes and rollout states are now recorded in `release/release-train.json`. |

## Copy boundaries

- App Store copy may promise iPhone, Apple Watch, Apple Health, offline mode
  and features proven by the Apple build. It does not promise Garmin delivery.
- Google Play copy may promise Android, Health Connect, offline mode and
  features proven by the Android build. It does not present Apple Watch as an
  Android feature.
- Connect IQ copy explains standalone backend pairing, FIT/heart rate,
  offline queue and that the watch has no separate paywall.
- Pricing and trial durations are never baked into Store prose. The product
  UI must use Store/RevenueCat price strings and display an introductory offer
  only after platform-specific eligibility is confirmed.

## Legal and review flags

- The Terms were normalized for purchases made through either store and now
  state that deleting an account or uninstalling the app does not cancel the
  store subscription.
- Apple introductory-offer eligibility is determined per subscription group
  and validated through StoreKit/App Store data:
  https://developer.apple.com/documentation/storekit/implementing-introductory-offers-in-your-app
- Google Play free trials are subscription offers attached to base plans and
  governed by their configured eligibility:
  https://support.google.com/googleplay/android-developer/answer/12154973?hl=en
- The health disclaimer remains visible in Store descriptions. This review is
  a product-copy audit, not legal advice.

## Deliberately deferred to monetization tasks

Z207-Z210 still own the actual store products, 7/14-day offers, RevenueCat
offering, per-product eligibility, dynamic localized prices, annual savings,
restore and purchase error flows. Existing hard-coded promotional/trial strings
must not be treated as release truth until those tasks replace them. The frozen
onboarding files and their layout/copy were not changed in Z230.

## External release gates

- App Store Connect: en-US description, keywords and promotional text were
  updated through the API after a dry-run; PATCH returned 200 and a separate
  read-back matched all three source fields. Version 1.0 remains
  `PREPARE_FOR_SUBMISSION`.
- Apple: App Attest must be enabled in the distribution provisioning profile
  before a normally signed archive containing App, Watch and widgets can pass.
- **KROK USERA Google Play:** no Google Play API credential is available in
  this session. In Play Console -> Store presence -> Main store listing, paste
  `release/google-play/en-US.md` and `release/google-play/pl-PL.md`, set
  `https://strengthsave.app/legal/privacy.html`, save, then read back both
  locales. Upload the exact signed AAB from the release map to Internal Testing
  and verify Play App Signing/Play Integrity plus Health Connect on a physical
  Android device.
- Garmin: physical G1-G9, off-host encrypted key backup, portal validation and
  Connect IQ submission remain required.
