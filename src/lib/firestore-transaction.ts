import {
  runTransaction as sdkRunTransaction,
  type Firestore,
  type Transaction,
  type TransactionOptions,
} from 'firebase/firestore';

// SDK 12.8's TransactionRunner sends auth/network-request-failed to its RPC
// classifier, which asserts (3c6b) and leaves the transaction pending forever.
// Keep each SDK attempt atomic, but classify retries outside its AsyncQueue.
// Auth failures then reach our offline draft/queue recovery without a reload.
const retryableCodes = new Set([
  'aborted', 'failed-precondition', 'already-exists', 'cancelled', 'unknown',
  'deadline-exceeded', 'resource-exhausted', 'internal', 'unavailable', 'unauthenticated',
]);

export async function runTransaction<T>(
  db: Firestore,
  update: (transaction: Transaction) => Promise<T>,
  options?: TransactionOptions,
): Promise<T> {
  const maxAttempts = options?.maxAttempts ?? 5;
  if (!Number.isInteger(maxAttempts) || maxAttempts < 1) {
    throw new Error('maxAttempts must be a positive integer');
  }
  for (let attempt = 0; ; attempt += 1) {
    try {
      return await sdkRunTransaction(db, update, { maxAttempts: 1 });
    } catch (error) {
      const code = error && typeof error === 'object' && 'code' in error ? error.code : null;
      if (attempt + 1 >= maxAttempts || typeof code !== 'string' || !retryableCodes.has(code)) throw error;
      // Bounded jitter avoids repeatedly colliding with another device. Suspend
      // merely delays the next attempt; local drafts remain the source of truth.
      await new Promise(resolve => setTimeout(resolve, Math.random() * Math.min(1000, 100 * 2 ** attempt)));
    }
  }
}
