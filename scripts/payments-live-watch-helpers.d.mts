export declare const RC_PROJECT_ID: string;
export declare const MAX_RUNTIME_MS: number;
export declare const DEFAULT_INTERVAL_MS: number;
export declare const WATCH_MAX_DOCS: number;
export declare const ERRORS_EVERY_TICKS: number;
export declare const ERRORS_LIMIT: number;

export declare function assertRevenueCatRead(method: string, url: string): void;
export declare function worstCaseReads(runtimeMs?: number, intervalMs?: number): number;
export declare function parseWatchArgs(argv: string[]): { target: string; intervalMs: number; minutes: number };

export interface SubscriptionSummary {
  tier: unknown; status: unknown; expiresAt: unknown; store: unknown; environment: unknown;
  willRenew: unknown; productId: unknown; eventId: unknown;
}
export declare function summarizeUser(doc: Record<string, unknown> | null): {
  subscription: SubscriptionSummary | null;
  storeSubscription: SubscriptionSummary | null;
};
export declare function summarizeRevenueCat(input: {
  customer: Record<string, unknown> | null;
  entitlements?: Array<Record<string, unknown>>;
  subscriptions?: Array<Record<string, unknown>>;
  products?: Record<string, string> | null;
}): Record<string, unknown>;

export interface StateChange { path: string; from: unknown; to: unknown }
export declare function diffState(before: unknown, after: unknown, prefix?: string): StateChange[];
export declare function formatChange(at: string, source: string, change: StateChange): string;
