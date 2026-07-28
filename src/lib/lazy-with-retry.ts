import { lazy } from "react";
import { requestGuardedReload } from "./pwa-update-guard";

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- mirrors React.lazy's own ComponentType<any> so route components keep their prop types
type ModuleImport<T extends React.ComponentType<any>> = () => Promise<{ default: T }>;

const RETRY_DELAY_MS = 500;

function shouldReloadForChunkError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return /Failed to fetch dynamically imported module|Importing a module script failed|dynamically imported module|chunk-empty/i.test(message);
}

const delay = (ms: number) =>
  ms > 0 ? new Promise<void>((resolve) => setTimeout(resolve, ms)) : Promise.resolve();

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- see ModuleImport above
async function importValidated<T extends React.ComponentType<any>>(
  importer: ModuleImport<T>,
  cacheKey: string,
): Promise<{ default: T }> {
  const mod = await importer();
  if (!mod?.default) {
    throw new Error(`chunk-empty:${cacheKey}`);
  }
  return mod;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- see ModuleImport above
export async function loadChunkWithRetry<T extends React.ComponentType<any>>(
  importer: ModuleImport<T>,
  cacheKey: string,
  options?: { retryDelayMs?: number },
): Promise<{ default: T }> {
  const retryDelayMs = options?.retryDelayMs ?? RETRY_DELAY_MS;
  try {
    let mod: { default: T };
    try {
      mod = await importValidated(importer, cacheKey);
    } catch {
      await delay(retryDelayMs);
      mod = await importValidated(importer, cacheKey);
    }
    if (typeof window !== "undefined") {
      window.sessionStorage.removeItem(cacheKey);
    }
    return mod;
  } catch (error) {
    if (
      typeof window !== "undefined" &&
      shouldReloadForChunkError(error) &&
      !window.sessionStorage.getItem(cacheKey)
    ) {
      window.sessionStorage.setItem(cacheKey, "1");
      if (requestGuardedReload("chunk")) {
        await new Promise<never>(() => {});
      }
    }

    throw error;
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- see ModuleImport above
export function lazyWithRetry<T extends React.ComponentType<any>>(
  importer: ModuleImport<T>,
  cacheKey: string,
) {
  return lazy(() => loadChunkWithRetry(importer, cacheKey));
}
