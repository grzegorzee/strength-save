import { describe, it, expect } from "vitest";
import { deleteQueryInBatches, type LimitableQuery, type BatchLike } from "./firestore-batch";

type FakeRef = { id: number };

/**
 * Minimal in-memory Firestore double: `limit(n).get()` returns the first n
 * remaining refs, and a committed batch.delete() removes them from the backing
 * store — mirroring how the real query re-pages after each batch commit.
 */
function makeFakeStore(count: number) {
  const remaining: FakeRef[] = Array.from({ length: count }, (_, i) => ({ id: i }));
  const committedBatchSizes: number[] = [];

  const query: LimitableQuery<FakeRef> = {
    limit(n: number) {
      return {
        async get() {
          const page = remaining.slice(0, n);
          return { empty: page.length === 0, size: page.length, docs: page.map((ref) => ({ ref })) };
        },
      };
    },
  };

  const makeBatch = (): BatchLike<FakeRef> => {
    const toDelete: FakeRef[] = [];
    return {
      delete(ref: FakeRef) {
        toDelete.push(ref);
      },
      async commit() {
        committedBatchSizes.push(toDelete.length);
        for (const ref of toDelete) {
          const idx = remaining.findIndex((r) => r.id === ref.id);
          if (idx >= 0) remaining.splice(idx, 1);
        }
      },
    };
  };

  return { query, makeBatch, committedBatchSizes, remaining };
}

describe("deleteQueryInBatches", () => {
  it("deletes more than 500 docs across multiple batches without exceeding batch size", async () => {
    const store = makeFakeStore(1203);

    const deleted = await deleteQueryInBatches(store.query, store.makeBatch, 450);

    expect(deleted).toBe(1203);
    expect(store.remaining).toHaveLength(0);
    // 1203 -> 450 + 450 + 303
    expect(store.committedBatchSizes).toEqual([450, 450, 303]);
    expect(Math.max(...store.committedBatchSizes)).toBeLessThanOrEqual(500);
  });

  it("returns 0 and commits nothing when there is nothing to delete", async () => {
    const store = makeFakeStore(0);

    const deleted = await deleteQueryInBatches(store.query, store.makeBatch, 450);

    expect(deleted).toBe(0);
    expect(store.committedBatchSizes).toEqual([]);
  });

  it("commits a single batch when the result set fits under batchSize", async () => {
    const store = makeFakeStore(12);

    const deleted = await deleteQueryInBatches(store.query, store.makeBatch, 450);

    expect(deleted).toBe(12);
    expect(store.committedBatchSizes).toEqual([12]);
  });

  it("defaults to the admin batch size of 450", async () => {
    const store = makeFakeStore(900);

    await deleteQueryInBatches(store.query, store.makeBatch);

    expect(store.committedBatchSizes).toEqual([450, 450]);
  });
});
