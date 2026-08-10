# X25 monetization status

Date: 2026-08-10

## Canonical products

| Package | Store identifier | Billing | Price PL | Price US | Intro offer |
| --- | --- | --- | ---: | ---: | --- |
| `$rc_monthly` | `strengthsave_pro_monthly` | monthly | 14.99 PLN | 3.99 USD | 7-day free trial |
| `$rc_annual` | `strengthsave_pro_yearly` | yearly | 119.99 PLN | 31.99 USD | 14-day free trial |

The yearly package is the UI default. Store/RevenueCat metadata remains the
runtime source of localized price and eligible introductory offer. One
entitlement `pro` covers web, iOS, Android, Apple Watch and Garmin; only iOS and
Android expose checkout/restore.

## App Store Connect — applied

Read-before on 2026-08-10 showed:

- monthly: POL 14.99, USA 4.99, `TWO_WEEKS` in 175 territories;
- yearly: POL 99.99, USA 29.99, `ONE_MONTH` in 175 territories.

`scripts/asc_subscriptions.py dry-run` reported 307 missing price schedules and
350 wrong introductory offers. `apply` then:

- created 307 price schedules effective 2026-08-12, using explicit POL/USA
  points and Apple equalization for the other storefronts;
- did not remove the current price before the scheduled transition;
- replaced 350 immutable introductory offers one territory at a time;
- updated yearly PL/EN localization so it no longer claims a hard-coded number
  of free months.

Final independent read-back:

- monthly target price changes 0/175, offer changes 0/175,
  `ONE_WEEK` 175/175;
- yearly target price changes 0/175, offer changes 0/175,
  `TWO_WEEKS` 175/175;
- POL/USA schedules are respectively 14.99/3.99 and 119.99/31.99.

The script retries transient 5xx/429 only where safe, is resumable from
read-back, and never automatically retries an ambiguous write after a network
failure.

## RevenueCat — Apple complete, Google blocked externally

`scripts/revenuecat_release.py status` read the production project without
printing secrets:

- project `proj67cb081f`;
- Apple app `app04502c737f`;
- current offering `default` (`ofrngf3279a7f4f`);
- entitlement `pro` (`entlc6a823aab7`);
- Apple monthly `proda62028ebff` is attached to `pro` and `$rc_monthly`;
- Apple yearly `prod02e67d51c4` is attached to `pro` and `$rc_annual`;
- no `google_play` app and no Google products exist;
- `.env` has the Apple public SDK key and the v2 secret, but no
  `VITE_REVENUECAT_GOOGLE_API_KEY`.

The new script is safe to rerun. Once a credentialed Google app exists, `apply`
creates missing RevenueCat products with store identifiers
`strengthsave_pro_monthly:monthly` and `strengthsave_pro_yearly:yearly`, attaches
both stores to the same `pro`, and puts them beside Apple in the same two
packages. It deliberately refuses to invent an uncredentialed Google app.

## KROK USERA — Google Play / RevenueCat

No Google Play Developer API service-account credential or authenticated Play
Console session is available in this workspace, and the app has not completed
its first Internal Testing upload. Complete these exact external steps:

1. In Play Console create/select package
   `com.grzegorzjasionowicz.strengthsave`, upload the signed AAB mapped in
   `release/release-train.json` to Internal Testing, accept Play App Signing and
   publish the internal release.
2. Copy the App signing SHA-1 and SHA-256 into Firebase Android app settings.
   Link Cloud project `fittracker-workouts` in App integrity -> Play Integrity
   API; an upload-key fingerprint is not a substitute for the app-signing key.
3. Create and activate subscription `strengthsave_pro_monthly`, auto-renewing
   base plan `monthly` (`P1M`), with 14.99 PLN and 3.99 USD anchors plus normal
   regional conversion. Add active new-customer acquisition offer `trial-7d`
   with one free `P7D` phase.
4. Create and activate subscription `strengthsave_pro_yearly`, auto-renewing
   base plan `yearly` (`P1Y`), with 119.99 PLN and 31.99 USD anchors plus normal
   regional conversion. Add active new-customer acquisition offer `trial-14d`
   with one free `P14D` phase.
5. Create/link a Play Developer API service account with subscription/order
   read access, upload its JSON credentials to a new RevenueCat Google Play app,
   and enable platform server notifications according to RevenueCat's Google
   Play connection checklist.
6. Add the resulting Android public SDK key as
   `VITE_REVENUECAT_GOOGLE_API_KEY`, then run:
   `set -a; source .env; set +a; python3 scripts/revenuecat_release.py apply`.
   Require final `APPLY + READ_BACK OK` and all four rows
   `inEntitlement=true`, `inPackage=true`.
7. On a Play-installed physical device verify the localized prices, eligible
   7/14-day offers, purchase, restore and ineligible/used-trial behavior before
   public release.

The Z207 checkbox stays open until those Google rows exist and their read-back
is captured. All independent Apple and RevenueCat automation is complete.
