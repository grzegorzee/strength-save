import { describe, expect, it } from "vitest";
import * as exported from "./index";

// Zasada 21: nowe funkcje subskrypcji mają limit instancji z global-options
// (import przez index, jak firebase deploy), digest jest pod bezpiecznikiem
// kosztów, webhook RC ma sekrety SES potrzebne do maila właściciela.
describe("kontrakt wdrożenia nowych funkcji (zasada 21)", () => {
  it("nowe funkcje (w tym revenuecatWebhook z sekretami SES) mają limit instancji, digest jest pod bezpiecznikiem kosztów", async () => {
    const mod = exported as unknown as Record<string, unknown>;
    type Deployed = { __endpoint?: { maxInstances?: unknown; scheduleTrigger?: unknown }; run?: { costGuard?: string } };
    for (const name of ["adminSubscriptionMetrics", "subscriptionAlertRecipientStatus", "weeklySubscriptionDigest"] as const) {
      expect({ name, maxInstances: (mod[name] as unknown as Deployed).__endpoint?.maxInstances }).toEqual({ name, maxInstances: 10 });
    }
    const digest = mod.weeklySubscriptionDigest as unknown as Deployed;
    expect(digest.__endpoint?.scheduleTrigger).toBeDefined();
    expect(digest.run?.costGuard).toBe("weeklySubscriptionDigest");
    const webhook = mod.revenuecatWebhook as { __endpoint?: { secretEnvironmentVariables?: Array<{ key: string }> } };
    expect(webhook.__endpoint?.secretEnvironmentVariables?.map((secret) => secret.key)).toEqual(expect.arrayContaining(["SES_FROM", "SES_ACCESS_KEY_ID"]));
  });
});
