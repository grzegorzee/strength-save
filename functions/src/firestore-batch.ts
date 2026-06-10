import { ADMIN_DELETE_BATCH_SIZE } from "./security";

/**
 * Minimal structural interfaces so the batched delete can run against the real
 * Firestore SDK in production and against lightweight mocks in unit tests.
 */
export interface BatchLike<Ref> {
  delete(ref: Ref): void;
  // Real Firestore WriteBatch.commit() resolves to WriteResult[]; we only await it.
  commit(): Promise<unknown>;
}

export interface SnapshotLike<Ref> {
  empty: boolean;
  size: number;
  docs: Array<{ ref: Ref }>;
}

export interface LimitableQuery<Ref> {
  limit(n: number): { get(): Promise<SnapshotLike<Ref>> };
}

/**
 * Delete every document matched by `query` in paginated write batches.
 *
 * Firestore write batches are capped at 500 operations, so deleting a result
 * set in a single batch silently fails once a user accumulates more than ~500
 * documents (e.g. years of Strava activities on reconnect). We page the query
 * with `limit(batchSize)` and commit one batch per page until the query is dry.
 *
 * @returns the total number of documents deleted.
 */
export async function deleteQueryInBatches<Ref>(
  query: LimitableQuery<Ref>,
  makeBatch: () => BatchLike<Ref>,
  batchSize: number = ADMIN_DELETE_BATCH_SIZE,
): Promise<number> {
  let deleted = 0;
  while (true) {
    const snap = await query.limit(batchSize).get();
    if (snap.empty) return deleted;

    const batch = makeBatch();
    snap.docs.forEach((doc) => batch.delete(doc.ref));
    await batch.commit();
    deleted += snap.size;

    if (snap.size < batchSize) return deleted;
  }
}
