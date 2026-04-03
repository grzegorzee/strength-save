import { lazy } from "react";

type ModuleImport<T extends React.ComponentType<unknown>> = () => Promise<{ default: T }>;

function shouldReloadForChunkError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return /Failed to fetch dynamically imported module|Importing a module script failed|dynamically imported module/i.test(message);
}

export function lazyWithRetry<T extends React.ComponentType<unknown>>(
  importer: ModuleImport<T>,
  cacheKey: string,
) {
  return lazy(async () => {
    try {
      const mod = await importer();
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
        window.location.reload();
        await new Promise<never>(() => {});
      }

      throw error;
    }
  });
}
