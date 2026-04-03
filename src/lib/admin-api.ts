import { httpsCallable } from "firebase/functions";
import { functions } from "@/lib/firebase";

export type ApiScope =
  | "export:full"
  | "export:profile"
  | "export:workouts"
  | "export:measurements"
  | "export:training-plan"
  | "export:plan-cycles";

export interface ApiKeyRecord {
  id: string;
  userId: string;
  name: string;
  prefix: string;
  scopes: ApiScope[];
  status: "active" | "revoked";
  createdAt: string;
  lastUsedAt: string | null;
  revokedAt: string | null;
  expiresAt: string | null;
  rotatedFrom: string | null;
}

interface ListApiKeysResponse {
  keys: ApiKeyRecord[];
  exportUrl: string;
  defaultScopes: ApiScope[];
}

interface CreateOrRotateApiKeyResponse {
  key: ApiKeyRecord;
  rawKey: string;
  exportUrl: string;
}

export async function listApiKeys() {
  const fn = httpsCallable<Record<string, never>, ListApiKeysResponse>(functions, "listApiKeys");
  const result = await fn({});
  return result.data;
}

export async function createApiKey(name: string) {
  const fn = httpsCallable<{ name: string }, CreateOrRotateApiKeyResponse>(functions, "createApiKey");
  const result = await fn({ name });
  return result.data;
}

export async function revokeApiKey(keyId: string) {
  const fn = httpsCallable<{ keyId: string }, { success: boolean }>(functions, "revokeApiKey");
  const result = await fn({ keyId });
  return result.data;
}

export async function rotateApiKey(keyId: string) {
  const fn = httpsCallable<{ keyId: string }, CreateOrRotateApiKeyResponse>(functions, "rotateApiKey");
  const result = await fn({ keyId });
  return result.data;
}
