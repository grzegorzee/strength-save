# Billing grace parity — read-only audit, 2026-09-09

**Result: the planned catalog was corrected to set `autoRenewingBasePlanType.gracePeriodDuration: P0D` in both plans, matching the current Apple setting as closely as Google permits.** This audit changed no application source, catalog, customer data, or credentials.

## Live Apple evidence

At `2026-09-09T19:28:21.263887+00:00`, authenticated `GET /v1/apps/6777446137/subscriptionGracePeriod` returned HTTP 200 with `optIn=false`, `sandboxOptIn=false`, `duration=null`, and `renewalType=null`. Both production and sandbox grace are disabled. The sanitized response is preserved in [ios-grace-reference.json](ios-grace-reference.json). The read used the existing ASC signer in memory and did not print credentials or query customers. The endpoint and fields are documented in [Apple's current ASC API](https://developer.apple.com/documentation/appstoreconnectapi/get-v1-apps-_id_-subscriptiongraceperiod).

Apple's configuration applies across the app's auto-renewable subscriptions. Enabled grace can last 3, 16, or 28 days; with grace disabled, failed renewals interrupt paid service until payment is recovered. This is distinct from the free introductory trial. [Apple configuration documentation](https://developer.apple.com/help/app-store-connect/manage-subscriptions/enable-billing-grace-period-for-auto-renewable-subscriptions).

## Planned Google configuration and closest supported match

At review time, `scripts/google_play_subscriptions.py:79` supplied only `billingPeriodDuration` inside `autoRenewingBasePlanType`. Omitting grace lets Google choose an enabled default, which does not match the verified Apple opt-out.

The recommended base-plan fields are:

```json
{
  "billingPeriodDuration": "P1M",
  "gracePeriodDuration": "P0D"
}
```

Use `P1Y` for the yearly plan. Google accepts grace from `P0D` to the lesser of 30 days and the billing period. Leave `accountHoldDuration` omitted: its documented default is 60 days minus configured grace, so this combination produces a 60-day hold. It satisfies the required 30–60-day combined grace/hold range. [Google catalog API](https://developers.google.com/android-publisher/api-ref/rest/v3/monetization.subscriptions).

Account hold suspends entitlement. It must not be mistaken for another 60 days of PRO access. Google also imposes a minimum 24-hour silent grace even with `P0D`, during which the purchase remains ACTIVE. Therefore exact timing parity is unavailable; the client/backend must continue respecting the store/RevenueCat entitlement snapshot, rather than revoke access using a locally calculated deadline. [Google subscription lifecycle](https://developer.android.com/google/play/billing/lifecycle/subscriptions).

Apple separately retries failed renewals for up to 60 days. Leaving Google's hold default has a similar nominal recovery window, but this is a comparison of documented windows, not a claim that the stores' retry schedules or states are identical. [Apple renewal recovery](https://developer.apple.com/app-store/subscriptions/).

## Follow-up implementation

The script now includes P0D in both plans and refuses unknown/enabled Apple grace until policy is reviewed. Two new tests were RED before the change and GREEN afterward; all 11 catalog tests pass. No Apple/Google catalog mutation was performed. Store activation is still blocked by the developer merchant profile. The runtime application was not changed by this catalog-only follow-up.
