export const withTimeout = <T>(
  operation: Promise<T>,
  timeoutMs: number,
  label: string,
): Promise<T> => new Promise<T>((resolve, reject) => {
  const timeoutId = globalThis.setTimeout(() => {
    reject(new Error(`${label} timed out after ${timeoutMs} ms`));
  }, timeoutMs);

  operation.then(
    (value) => {
      globalThis.clearTimeout(timeoutId);
      resolve(value);
    },
    (error) => {
      globalThis.clearTimeout(timeoutId);
      reject(error);
    },
  );
});
