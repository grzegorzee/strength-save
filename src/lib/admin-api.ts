import { httpsCallable } from "firebase/functions";
import { functions } from "@/lib/firebase";

const isE2EMode = import.meta.env.VITE_E2E_MODE === "true"
  && import.meta.env.VITE_USE_EMULATORS !== "true";
const E2E_API_KEYS_STORAGE_KEY = "fittracker_e2e_api_keys";

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

const e2eExportUrl = () => `${window.location.origin}/api/export`;

const readE2EApiKeys = (): ApiKeyRecord[] => {
  try {
    const raw = window.localStorage.getItem(E2E_API_KEYS_STORAGE_KEY);
    return raw ? JSON.parse(raw) as ApiKeyRecord[] : [];
  } catch {
    return [];
  }
};

const writeE2EApiKeys = (keys: ApiKeyRecord[]): void => {
  window.localStorage.setItem(E2E_API_KEYS_STORAGE_KEY, JSON.stringify(keys));
};

const createE2EApiKeyRecord = (name: string, rotatedFrom: string | null = null): ApiKeyRecord => {
  const id = `e2e-key-${Date.now()}`;
  return {
    id,
    userId: "e2e-test-user",
    name,
    prefix: "ss_e2e",
    scopes: ["export:full"],
    status: "active",
    createdAt: new Date().toISOString(),
    lastUsedAt: null,
    revokedAt: null,
    expiresAt: null,
    rotatedFrom,
  };
};

export async function listApiKeys() {
  if (isE2EMode) {
    return { keys: readE2EApiKeys(), exportUrl: e2eExportUrl(), defaultScopes: ["export:full" as const] };
  }
  const fn = httpsCallable<Record<string, never>, ListApiKeysResponse>(functions, "listApiKeys");
  const result = await fn({});
  return result.data;
}

export async function createApiKey(name: string) {
  if (isE2EMode) {
    const key = createE2EApiKeyRecord(name);
    writeE2EApiKeys([...readE2EApiKeys(), key]);
    return { key, rawKey: `${key.prefix}_test`, exportUrl: e2eExportUrl() };
  }
  const fn = httpsCallable<{ name: string }, CreateOrRotateApiKeyResponse>(functions, "createApiKey");
  const result = await fn({ name });
  return result.data;
}

export async function revokeApiKey(keyId: string) {
  if (isE2EMode) {
    const revokedAt = new Date().toISOString();
    writeE2EApiKeys(readE2EApiKeys().map((key) => key.id === keyId
      ? { ...key, status: "revoked", revokedAt }
      : key));
    return { success: true };
  }
  const fn = httpsCallable<{ keyId: string }, { success: boolean }>(functions, "revokeApiKey");
  const result = await fn({ keyId });
  return result.data;
}

export async function rotateApiKey(keyId: string) {
  if (isE2EMode) {
    const keys = readE2EApiKeys();
    const previous = keys.find((key) => key.id === keyId);
    const revokedAt = new Date().toISOString();
    const key = createE2EApiKeyRecord(previous?.name ?? "Rotated key", keyId);
    writeE2EApiKeys([
      ...keys.map((entry) => entry.id === keyId ? { ...entry, status: "revoked" as const, revokedAt } : entry),
      key,
    ]);
    return { key, rawKey: `${key.prefix}_rotated_test`, exportUrl: e2eExportUrl() };
  }
  const fn = httpsCallable<{ keyId: string }, CreateOrRotateApiKeyResponse>(functions, "rotateApiKey");
  const result = await fn({ keyId });
  return result.data;
}
