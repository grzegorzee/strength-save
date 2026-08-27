export const BUG_REPORT_ATTACHMENT_DB_NAME = 'strength-save-bug-report-attachments';

const DB_VERSION = 1;
const PENDING_STORE = 'pending-camera';
const RECOVERY_STORE = 'camera-recoveries';
const PENDING_SLOT = 'active';
const RECOVERY_TTL_MS = 24 * 60 * 60 * 1000;

export interface BugReportCameraBinding {
  uid: string;
  clientRequestId: string;
}

interface PendingRecord extends BugReportCameraBinding {
  slot: typeof PENDING_SLOT;
  expiresAt: number;
}

interface ReadyRecoveryRecord extends BugReportCameraBinding {
  key: string;
  status: 'ready';
  blob: Blob;
  mimeType: string;
  fileName: string;
  createdAt: number;
  expiresAt: number;
}

interface ErrorRecoveryRecord extends BugReportCameraBinding {
  key: string;
  status: 'error';
  code: BugReportCameraRecoveryErrorCode;
  createdAt: number;
  expiresAt: number;
}

type RecoveryRecord = ReadyRecoveryRecord | ErrorRecoveryRecord;

export type BugReportCameraRecoveryErrorCode =
  | 'camera-restore-failed'
  | 'camera-restore-invalid-result'
  | 'camera-restore-read-failed'
  | 'camera-restore-unsupported-image'
  | 'camera-restore-image-too-large';

export type StoredBugReportCameraRecovery =
  | { status: 'none' }
  | { status: 'ready'; file: File }
  | { status: 'error'; code: BugReportCameraRecoveryErrorCode };

const bindingKey = ({ uid, clientRequestId }: BugReportCameraBinding): string => `${uid}:${clientRequestId}`;

const requestResult = <T>(request: IDBRequest<T>): Promise<T> => new Promise((resolve, reject) => {
  request.onsuccess = () => resolve(request.result);
  request.onerror = () => reject(request.error ?? new Error('indexeddb-request-failed'));
});

const transactionDone = (transaction: IDBTransaction): Promise<void> => new Promise((resolve, reject) => {
  transaction.oncomplete = () => resolve();
  transaction.onabort = () => reject(transaction.error ?? new Error('indexeddb-transaction-aborted'));
  transaction.onerror = () => reject(transaction.error ?? new Error('indexeddb-transaction-failed'));
});

const openDatabase = (): Promise<IDBDatabase | null> => {
  if (typeof indexedDB === 'undefined') return Promise.resolve(null);

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(BUG_REPORT_ATTACHMENT_DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(PENDING_STORE)) db.createObjectStore(PENDING_STORE, { keyPath: 'slot' });
      if (!db.objectStoreNames.contains(RECOVERY_STORE)) db.createObjectStore(RECOVERY_STORE, { keyPath: 'key' });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('indexeddb-open-failed'));
  });
};

const purgeExpiredRecoveries = async (db: IDBDatabase): Promise<void> => {
  const transaction = db.transaction(RECOVERY_STORE, 'readwrite');
  const done = transactionDone(transaction);
  const store = transaction.objectStore(RECOVERY_STORE);
  await new Promise<void>((resolve, reject) => {
    const request = store.openCursor();
    request.onerror = () => reject(request.error ?? new Error('indexeddb-cursor-failed'));
    request.onsuccess = () => {
      const cursor = request.result;
      if (!cursor) {
        resolve();
        return;
      }
      const record = cursor.value as RecoveryRecord;
      if (record.expiresAt <= Date.now()) cursor.delete();
      cursor.continue();
    };
  });
  await done;
};

const withDatabase = async <T>(operation: (db: IDBDatabase) => Promise<T>, fallback: T): Promise<T> => {
  let db: IDBDatabase | null = null;
  try {
    db = await openDatabase();
    if (!db) return fallback;
    // Raw obraz może chwilowo zawierać EXIF. Fizycznie usuwamy wygasłe rekordy
    // przy najbliższym użyciu bazy; docelowy upload nadal musi przejść sanitizer.
    try { await purgeExpiredRecoveries(db); } catch { /* cleanup nie może blokować tekstowego zgłoszenia */ }
    return await operation(db);
  } catch {
    return fallback;
  } finally {
    db?.close();
  }
};

export const storePendingBugReportCameraBinding = async (binding: BugReportCameraBinding): Promise<boolean> => (
  withDatabase(async db => {
    const transaction = db.transaction(PENDING_STORE, 'readwrite');
    transaction.objectStore(PENDING_STORE).put({
      ...binding,
      slot: PENDING_SLOT,
      expiresAt: Date.now() + RECOVERY_TTL_MS,
    } satisfies PendingRecord);
    await transactionDone(transaction);
    return true;
  }, false)
);

export const readPendingBugReportCameraBinding = async (): Promise<BugReportCameraBinding | null> => (
  withDatabase(async db => {
    const transaction = db.transaction(PENDING_STORE, 'readwrite');
    const store = transaction.objectStore(PENDING_STORE);
    const pending = await requestResult(store.get(PENDING_SLOT)) as PendingRecord | undefined;
    if (pending && pending.expiresAt <= Date.now()) store.delete(PENDING_SLOT);
    await transactionDone(transaction);
    if (!pending || pending.expiresAt <= Date.now()) return null;
    return { uid: pending.uid, clientRequestId: pending.clientRequestId };
  }, null)
);

export const clearPendingBugReportCameraBinding = async (expected: BugReportCameraBinding): Promise<boolean> => (
  withDatabase(async db => {
    const transaction = db.transaction(PENDING_STORE, 'readwrite');
    const store = transaction.objectStore(PENDING_STORE);
    const pending = await requestResult(store.get(PENDING_SLOT)) as PendingRecord | undefined;
    if (pending?.uid === expected.uid && pending.clientRequestId === expected.clientRequestId) {
      store.delete(PENDING_SLOT);
    }
    await transactionDone(transaction);
    return true;
  }, false)
);

export const finalizeBugReportCameraRecovery = async (
  expected: BugReportCameraBinding,
  recovery: { status: 'ready'; blob: Blob; mimeType: string; fileName: string }
    | { status: 'error'; code: BugReportCameraRecoveryErrorCode },
): Promise<boolean> => withDatabase(async db => {
  const transaction = db.transaction([PENDING_STORE, RECOVERY_STORE], 'readwrite');
  const pendingStore = transaction.objectStore(PENDING_STORE);
  const recoveryStore = transaction.objectStore(RECOVERY_STORE);
  const pending = await requestResult(pendingStore.get(PENDING_SLOT)) as PendingRecord | undefined;

  if (pending?.uid !== expected.uid || pending.clientRequestId !== expected.clientRequestId) {
    transaction.abort();
    try { await transactionDone(transaction); } catch { /* expected abort: binding changed while native UI was open */ }
    return false;
  }

  const common = {
    ...expected,
    key: bindingKey(expected),
    createdAt: Date.now(),
    expiresAt: Date.now() + RECOVERY_TTL_MS,
  };
  const record: RecoveryRecord = recovery.status === 'ready'
    ? { ...common, ...recovery }
    : { ...common, ...recovery };
  recoveryStore.put(record);
  pendingStore.delete(PENDING_SLOT);
  await transactionDone(transaction);
  return true;
}, false);

const recoveryToPublicResult = (recovery: RecoveryRecord): StoredBugReportCameraRecovery => {
  if (recovery.status === 'error') return { status: 'error', code: recovery.code };
  return {
    status: 'ready',
    file: new File([recovery.blob], recovery.fileName, {
      type: recovery.mimeType,
      lastModified: recovery.createdAt,
    }),
  };
};

export const readStoredBugReportCameraRecovery = async (
  binding: BugReportCameraBinding,
): Promise<StoredBugReportCameraRecovery> => withDatabase(async db => {
  const transaction = db.transaction(RECOVERY_STORE, 'readwrite');
  const store = transaction.objectStore(RECOVERY_STORE);
  const recovery = await requestResult(store.get(bindingKey(binding))) as RecoveryRecord | undefined;
  if (recovery && recovery.expiresAt <= Date.now()) store.delete(recovery.key);
  await transactionDone(transaction);
  if (!recovery || recovery.expiresAt <= Date.now()) return { status: 'none' };
  return recoveryToPublicResult(recovery);
}, { status: 'none' });

export const consumeStoredBugReportCameraRecovery = async (
  binding: BugReportCameraBinding,
): Promise<StoredBugReportCameraRecovery> => withDatabase(async db => {
  const transaction = db.transaction(RECOVERY_STORE, 'readwrite');
  const store = transaction.objectStore(RECOVERY_STORE);
  const recovery = await requestResult(store.get(bindingKey(binding))) as RecoveryRecord | undefined;
  if (recovery) store.delete(recovery.key);
  await transactionDone(transaction);
  if (!recovery || recovery.expiresAt <= Date.now()) return { status: 'none' };
  return recoveryToPublicResult(recovery);
}, { status: 'none' });
