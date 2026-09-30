// Typy dla testów (src/test/live-update-publish.test.ts); implementacja: live-update-helpers.mjs.
/* eslint-disable @typescript-eslint/no-explicit-any */
export const CHANNELS: string[];
export const PLATFORMS: string[];
export const BASELINE_DIR: string;
export function sha256(data: any): string;
export function stableJson(value: unknown): string;
export function collectCapacitorPlugins(root: string): any;
export function localNativeHash(root: string, platform: string): { files: number; sha256: string };
export function nativeInventory(root: string, platform: string): any;
export function inventoryFingerprint(inventory: any): string;
export function diffInventories(bundle: any, baseline: any): string[];
export function parseOtaId(id: unknown): { nativeVersion: string; otaNumber: number } | null;
export function nextOtaNumber(nativeVersion: string, knownIds: string[]): number;
export function selectBaselines(baselines: any[], platform: string, nativeVersion: string): any;
export function checkBundleCompatibility(inventory: any, selected: any): string[];
export function loadBaselines(root: string): any[];
export function signText(privateKeyPem: any, text: any): string;
export function verifyText(publicKeyPem: any, text: any, signature: string): boolean;
export function buildManifestPayload(input: any): any;
export function signManifest(privateKeyPem: any, payload: any): { payload: string; signature: string };
export function manifestPath(channel: string, platform: string, nativeVersion: string): string;
export function bundlePath(bundleId: string): string;
export function firebaseObjectUrl(bucket: string, path: string): string;
