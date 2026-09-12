import { describe, expect, it } from 'vitest';
import { initializeApp } from 'firebase/app';
import { FirebaseError } from '@firebase/util';
import { initializeFirestore, memoryLocalCache } from 'firebase/firestore';
import { runTransaction } from '@/lib/firestore-transaction';

// Real SDK, no network or user data: the callback fails before its first read.
// Firebase 12.8 poisons AsyncQueue when it classifies an Auth code as an RPC code.
const database = () => initializeFirestore(
  initializeApp({ projectId: 'demo-stability' }, `stability-${crypto.randomUUID()}`),
  { localCache: memoryLocalCache() },
);
const settle = (promise: Promise<unknown>) => Promise.race([
  promise.then(value => ({ value }), error => ({ error })),
  new Promise(resolve => setTimeout(() => resolve('HUNG'), 1000)),
]);

describe('transactions survive offline token refresh', () => {
  it('rejects an Auth network failure promptly and can run the next transaction', async () => {
    const db = database();
    const offline = new FirebaseError('auth/network-request-failed', 'Network unavailable');
    expect(await settle(runTransaction(db, async () => { throw offline; }))).toEqual({ error: offline });
    const stopped = new Error('callback reached after reconnect');
    expect(await settle(runTransaction(db, async () => { throw stopped; }))).toEqual({ error: stopped });
  });

  it('still retries Firestore version conflicts without repeating permanent failures', async () => {
    const db = database();
    let attempts = 0;
    const denied = new FirebaseError('permission-denied', 'Access denied');
    const result = await runTransaction(db, async () => {
      attempts += 1;
      if (attempts < 3) throw new FirebaseError('aborted', 'Concurrent edit');
      throw denied;
    }).catch(error => error);
    expect(result).toBe(denied);
    expect(attempts).toBe(3);
  });
});
